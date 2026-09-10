import { Session, SubAgent } from './types';
import { readableCodexText } from './codexTasks';

/** Keep missing parents visible, and reject invalid parent cycles before building the tree. */
function validParent(session: Session, sessions: Map<string, Session>): string | undefined {
  const parent = session.codexParentThreadId;
  if (!parent || !sessions.has(parent)) return undefined;
  const seen = new Set([session.id]);
  let current: string | undefined = parent;
  while (current) {
    if (seen.has(current)) return undefined;
    seen.add(current);
    current = sessions.get(current)?.codexParentThreadId;
  }
  return parent;
}

function launchTaskFor(session: Session, parent?: Session): string | undefined {
  const tasks = parent?.codexSpawnedTasks;
  if (!tasks) return undefined;
  for (const key of [session.codexAgentPath, session.id]) {
    if (key && Object.prototype.hasOwnProperty.call(tasks, key)) {
      const task = readableCodexText(tasks[key]);
      if (task) return task;
    }
  }
  return undefined;
}

function asAgent(session: Session, parent?: Session): SubAgent {
  return {
    id: session.id,
    agentId: session.id,
    name: session.codexAgentName ?? session.sessionTitle ?? session.id,
    task:
      launchTaskFor(session, parent) ??
      readableCodexText(session.codexAgentTask) ??
      readableCodexText(session.sessionTitle) ??
      '',
    model: session.model,
    status: session.status === 'working' ? 'working' : 'stopped',
    logFilePath: session.logFilePath,
    lastInteractionTime: session.lastInteractionTime,
    latestUpdate: readableCodexText(session.codexLatestUpdate),
    children: [],
  };
}

/** Join independently written rollouts by parent_thread_id, never by project or title. */
export function assembleCodexHierarchy(all: Session[]): Session[] {
  const sessions = new Map(all.filter((s) => s.type === 'codex').map((s) => [s.id, s]));
  const agents = new Map(
    Array.from(sessions, ([id, session]) => [id, asAgent(session, sessions.get(session.codexParentThreadId ?? ''))]),
  );
  const parents = new Map<string, string>();
  for (const session of sessions.values()) {
    const parent = validParent(session, sessions);
    if (!parent) continue;
    parents.set(session.id, parent);
    const agent = agents.get(session.id);
    if (agent) agents.get(parent)?.children?.push(agent);
  }
  // Walk upward for every live thread so a quiet launcher remains visible while a child runs.
  for (const session of sessions.values()) {
    if (session.status !== 'working') continue;
    let parent = parents.get(session.id);
    while (parent) {
      const agent = agents.get(parent);
      if (agent) agent.status = 'working';
      parent = parents.get(parent);
    }
  }
  return all
    .filter((s) => s.type !== 'codex' || !parents.has(s.id))
    .map((session) => {
      if (session.type !== 'codex') return session;
      const agent = agents.get(session.id);
      return {
        ...session,
        status: agent?.status === 'working' ? 'working' : session.status,
        subagents: agent?.children ?? [],
      };
    });
}
