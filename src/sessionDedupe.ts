import * as path from 'path';
import { Session, SubAgent } from './types';

/** A session launched via the SDK (entrypoint 'sdk*') is a background agent (e.g. /security-review,
 * a workflow run), not a human IDE session. */
export function isAgentSession(session: Session): boolean {
  return session.entrypoint?.startsWith('sdk') ?? false;
}

// How far apart a background agent and its launcher may be (by last-activity) and still be linked.
// The transcript carries no child→parent id, so proximity + same cwd/branch is the best signal.
const PARENT_WINDOW_MS = 15 * 60 * 1000;

/** Find the human session that most likely launched this background agent: same project + branch,
 * and either still working or last active within PARENT_WINDOW_MS of the agent. Returns null when
 * nothing matches — the caller then keeps the agent as its own top-level row so it's never lost. */
export function findParentSession(agent: Session, humans: Session[]): Session | null {
  const agentCwd = path.normalize(agent.projectPath).toLowerCase();
  let best: Session | null = null;
  for (const h of humans) {
    if (h.type !== agent.type) continue;
    if (h.gitBranch !== agent.gitBranch) continue;
    if (path.normalize(h.projectPath).toLowerCase() !== agentCwd) continue;
    const near = Math.abs(agent.lastInteractionTime - h.lastInteractionTime) <= PARENT_WINDOW_MS;
    if (!near && h.status !== 'working') continue;
    if (!best || isMoreRelevant(h, best)) best = h;
  }
  return best;
}

/** Promote a human session to 'working' when a background agent it launched (matched via
 * findParentSession) is still working. computeSessionStatus only sees same-file subagents
 * (session.subagents); a cross-file nested agent's liveness never reaches it otherwise, so the
 * parent can render 'stopped' while its own "Working Agents" group shows that same agent live.
 *
 * Matches are collected before any status is mutated: findParentSession's fallback keeps a
 * human eligible when it's outside PARENT_WINDOW_MS but already 'working' (the `near` check
 * above), so promoting a parent mid-loop could make it newly eligible for a later, unrelated
 * agent and change the outcome by iteration order. Two passes keep every match decision based
 * on the original statuses, so the result is order-independent. */
export function applyNestedAgentLiveness(sessions: Session[]): void {
  // Subagent transcripts stamp the parent's own entrypoint (not 'sdk*'), so isAgentSession alone
  // doesn't filter them out; exclude isSidechain too or one could impersonate a real parent.
  const humans = sessions.filter((s) => !isAgentSession(s) && !s.isSidechain);
  const parentsToPromote = new Set<Session>();
  for (const agent of sessions) {
    if (!isAgentSession(agent) || agent.status !== 'working') continue;
    const parent = findParentSession(agent, humans);
    if (parent) parentsToPromote.add(parent);
  }
  for (const parent of parentsToPromote) {
    parent.status = 'working';
  }
}

/** Render a background-agent session as a subagent row under its launcher. */
export function sessionAsSubagent(agent: Session): SubAgent {
  return {
    id: agent.id,
    name: agent.sessionTitle || 'Agent',
    task: agent.sessionTitle || agent.id,
    status: agent.status,
    model: agent.model,
  };
}

/** Normalize free text (session title/prompt) into a stable dedupe-key fragment: strips
 * accents, emojis and symbols, and collapses whitespace, so visually-different text never
 * collides on the raw string and near-identical text (just accents/casing) still merges. */
export function normalizeForKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritics
    .replace(/\p{Extended_Pictographic}/gu, '') // emoji
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Dedupe key for a session: type + projectPath + branch + title/id. The title/text component
 * keeps two genuinely concurrent sessions on the same project+branch (e.g. two Claude Code
 * windows open on the same repo) from colliding into a single slot. Sessions without a captured
 * title yet fall back to their own id, so two fresh title-less sessions don't merge either. */
export function getDedupeKey(session: Session): string {
  const projectKey = path.normalize(session.projectPath).toLowerCase();
  const textKey = normalizeForKey(session.sessionTitle || session.id);
  return `${session.type}|${projectKey}|${session.gitBranch}|${textKey}`;
}

/** Deterministic "which session wins the slot" order. Must be stable so it never oscillates. */
export function isMoreRelevant(a: Session, b: Session): boolean {
  if ((a.status === 'working') !== (b.status === 'working')) return a.status === 'working';
  // Prefer the session actually running agents, so it doesn't lose the slot to an idle sibling.
  // Count only *working* subagents: a stale predecessor (e.g. a compacted session) can carry dozens
  // of finished subagents, and total count would let it mask the recent live continuation on the
  // same branch during an idle gap. Ties then fall through to most-recent activity.
  const aWorking = a.subagents.filter((s) => s.status === 'working').length;
  const bWorking = b.subagents.filter((s) => s.status === 'working').length;
  if (aWorking !== bWorking) return aWorking > bWorking;
  if (a.lastInteractionTime !== b.lastInteractionTime) return a.lastInteractionTime > b.lastInteractionTime;
  return a.id > b.id; // final stable tiebreak
}
