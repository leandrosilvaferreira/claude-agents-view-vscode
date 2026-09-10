import * as path from 'path';
import { Session } from './types';
import {
  codexRequestText,
  codexResponseTitle,
  codexResponseUpdate,
  CodexTaskState,
  readableCodexText,
  trackCodexTask,
} from './codexTasks';

export interface CodexEntryState extends CodexTaskState {
  hasMetadata: boolean;
  inherited: boolean;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function applyMetadata(payload: Record<string, unknown>, session: Session): void {
  session.id = string(payload.id) ?? string(payload.session_id) ?? session.id;
  const source = object(payload.source);
  const spawn = object(object(source.subagent).thread_spawn);
  session.codexParentThreadId = string(payload.parent_thread_id) ?? string(spawn.parent_thread_id);
  const agentPath = string(payload.agent_path) ?? string(spawn.agent_path);
  session.codexAgentPath = agentPath;
  session.codexAgentName =
    agentPath?.split('/').filter(Boolean).pop() ?? string(payload.agent_nickname) ?? string(spawn.agent_nickname);
  session.entrypoint = string(payload.originator) ?? string(payload.source);
  session.gitBranch = string(object(payload.git).branch) ?? session.gitBranch;
  applyContext(payload, session);
}

function applyContext(payload: Record<string, unknown>, session: Session): void {
  const cwd = string(payload.cwd);
  if (cwd) {
    session.projectPath = cwd;
    session.projectHash = cwd;
    session.projectName = path.basename(cwd) || cwd;
  }
  session.model = string(payload.model) ?? session.model;
}

function applyLifecycle(payload: Record<string, unknown>, session: Session): void {
  switch (payload.type) {
    case 'task_started':
    case 'turn_started':
    case 'user_message':
      session.codexTurnStatus = 'working';
      break;
    case 'task_complete':
    case 'turn_completed':
      session.codexTurnStatus = payload.error ? 'error' : 'stopped';
      break;
    case 'turn_aborted':
    case 'task_aborted':
      session.codexTurnStatus = 'stopped';
      break;
    case 'error':
      session.codexTurnStatus = 'error';
      break;
  }
}

function trackLatestUpdate(payload: Record<string, unknown>, session: Session): void {
  if (payload.type === 'agent_message') {
    session.codexLatestUpdate = readableCodexText(payload.message) ?? session.codexLatestUpdate;
  }
}

function applyEvent(payload: Record<string, unknown>, session: Session): void {
  applyLifecycle(payload, session);
  trackLatestUpdate(payload, session);
  // event_msg.user_message is the actual user input. response_item user messages also
  // contain injected AGENTS.md/environment instructions and inherited fork scaffolding.
  if (payload.type === 'user_message' && !session.sessionTitle && !session.codexParentThreadId) {
    const title = codexRequestText(string(payload.message) ?? '')
      ?.replace(/\s+/g, ' ')
      .trim();
    if (title) {
      session.sessionTitle = title.length > 80 ? title.substring(0, 80).trimEnd() + '...' : title;
      session.nameFromPrompt = true;
    }
  }
  if (session.codexTurnStatus) session.status = session.codexTurnStatus;
}

function applyResponse(payload: Record<string, unknown>, session: Session, state: CodexEntryState): void {
  trackCodexTask(payload, session, state);
  session.codexLatestUpdate = codexResponseUpdate(payload) ?? session.codexLatestUpdate;
  if (session.sessionTitle || session.codexParentThreadId) return;
  const title = codexResponseTitle(payload);
  if (title) applyEvent({ type: 'user_message', message: title }, session);
}

function trackMetadata(payload: Record<string, unknown>, session: Session, state: CodexEntryState): void {
  const id = string(payload.id) ?? string(payload.session_id);
  if (id && (!state.hasMetadata || id === session.id)) {
    applyMetadata(payload, session);
    state.hasMetadata = true;
    state.inherited = false;
  } else if (id) {
    state.inherited = true;
    state.pendingTasks?.clear();
  }
}

/** The first metadata record belongs to the file; fork history can embed parent metadata. */
export function applyCodexEntry(value: unknown, session: Session, state: CodexEntryState): void {
  const entry = object(value);
  const payload = object(entry.payload);
  if (entry.type === 'session_meta') {
    trackMetadata(payload, session, state);
    return;
  }
  // Forked rollouts prepend their own metadata before copied parent history. The
  // copied records may be re-timestamped, so only an explicit own-thread switch
  // ends that history; envelope timestamps cannot safely identify the boundary.
  if (entry.type === 'event_msg' && payload.type === 'thread_settings_applied' && payload.thread_id === session.id) {
    state.inherited = false;
  }
  if (state.inherited) return;
  if (entry.type === 'turn_context') {
    applyContext(payload, session);
  } else if (entry.type === 'event_msg') {
    applyEvent(payload, session);
  } else if (entry.type === 'response_item') {
    applyResponse(payload, session, state);
  }
}
