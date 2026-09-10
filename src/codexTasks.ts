import { Session } from './types';

export interface CodexTaskState {
  pendingTasks?: Map<string, string>;
}

/** Some Codex builds persist message fields as Fernet tokens, not readable prose. */
export function readableCodexText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || /\bgAAAA[A-Za-z0-9_-]{16,}={0,2}/.test(text)) return undefined;
  if (/^Message Type: (?:NEW_TASK|MESSAGE|FINAL_ANSWER)\b/.test(text)) return undefined;
  return text;
}

function parseObject(value: unknown): Record<string, unknown> {
  try {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function recordLaunch(payload: Record<string, unknown>, callId: string, state: CodexTaskState): void {
  const args = parseObject(payload.arguments);
  const task = readableCodexText(args.message);
  if (task) {
    state.pendingTasks ??= new Map();
    state.pendingTasks.set(callId, task);
  }
}

function completeLaunch(payload: Record<string, unknown>, session: Session, state: CodexTaskState): void {
  const callId = String(payload.call_id);
  const task = state.pendingTasks?.get(callId);
  state.pendingTasks?.delete(callId);
  if (!task) return;
  const output = parseObject(payload.output);
  const key = output.task_name ?? output.agent_id;
  if (typeof key !== 'string' || !key || output.error) return;
  // A null-prototype dictionary avoids special object keys from untrusted logs.
  session.codexSpawnedTasks ??= Object.create(null) as Record<string, string>;
  session.codexSpawnedTasks[key] = task;
}

/** Pair readable spawn arguments with a successful result; either log may encrypt message fields. */
export function trackCodexTask(payload: Record<string, unknown>, session: Session, state: CodexTaskState): void {
  if (typeof payload.call_id !== 'string') return;
  if (payload.type === 'function_call' && payload.name === 'spawn_agent') {
    recordLaunch(payload, payload.call_id, state);
  } else if (payload.type === 'function_call_output') {
    completeLaunch(payload, session, state);
  }
}

/** Strip only the explicit VS Code wrapper, not headings from ordinary user prose. */
export function codexRequestText(message: string): string | undefined {
  const text = readableCodexText(message);
  if (!text) return undefined;
  if (!text.startsWith('# Context from my IDE setup:')) return text || undefined;
  const request = /^## My request(?: for Codex)?:[^\S\n]*$/m.exec(text);
  return request ? readableCodexText(text.slice(request.index + request[0].length)) : undefined;
}

export function codexResponseTitle(payload: Record<string, unknown>): string | undefined {
  if (payload.type !== 'message' || payload.role !== 'user' || !Array.isArray(payload.content)) return undefined;
  for (const value of payload.content) {
    const block = parseObject(value);
    if (
      block.type === 'input_text' &&
      typeof block.text === 'string' &&
      block.text.trim().startsWith('# Context from my IDE setup:')
    ) {
      return codexRequestText(block.text);
    }
  }
  return undefined;
}

function isVisiblePhase(payload: Record<string, unknown>): boolean {
  if (payload.channel === 'analysis' || payload.channel === 'reasoning') return false;
  return (
    payload.phase === undefined ||
    payload.phase === 'commentary' ||
    payload.phase === 'final_answer' ||
    payload.phase === 'final'
  );
}

/** Some rollouts emit visible assistant updates only as response items, without event_msg. */
export function codexResponseUpdate(payload: Record<string, unknown>): string | undefined {
  if (payload.type !== 'message' || payload.role !== 'assistant' || !Array.isArray(payload.content)) return undefined;
  if (!isVisiblePhase(payload)) return undefined;
  const texts: string[] = [];
  for (const value of payload.content) {
    const block = parseObject(value);
    if (block.type !== 'output_text') continue;
    const text = readableCodexText(block.text);
    if (text) texts.push(text);
  }
  return texts.length ? texts.join('\n') : undefined;
}
