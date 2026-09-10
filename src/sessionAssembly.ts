import * as path from 'path';
import { Session, SubAgent } from './types';
import {
  findParentSession,
  getDedupeKey,
  isAgentSession,
  sessionAsSubagent,
  upsertIfMoreRelevant,
} from './sessionDedupe';

export interface AssembledSessions {
  /** Sessions to render at the top level (all humans + orphan background agents). */
  topLevel: Session[];
  /** Background-agent sessions folded under their launcher, keyed by the human session id. */
  nestedAgents: Map<string, SubAgent[]>;
}

function hasRecentDescendant(agents: SubAgent[], cutoff: number): boolean {
  return agents.some(
    (agent) =>
      (agent.lastInteractionTime !== undefined && agent.lastInteractionTime >= cutoff) ||
      hasRecentDescendant(agent.children ?? [], cutoff),
  );
}

/**
 * Turn the raw parsed sessions into the set shown in the tree:
 *  1. drop subagent sidechains and sessions that aged out (concluded > 1h ago; running ones always stay),
 *     and scope Claude Code sessions to the active workspace folders (Antigravity is cross-project);
 *  2. fold each SDK-spawned background agent under the human session that launched it (same project +
 *     branch, close in time); an agent with no match stays top-level so it is never hidden;
 *  3. collapse to one session per (type + projectPath + branch + title) via a stable, activity-aware
 *     ranking, so two concurrent sessions on the same repo don't flicker over one slot.
 *
 * Pure: `activePaths` (normalized, lowercased) and `now` are injected so this is unit-testable.
 */
export function assembleVisibleSessions(all: Session[], activePaths: string[], now: number): AssembledSessions {
  const cutoff = now - 60 * 60 * 1000;
  const candidates = all.filter((session) => {
    if (session.isSidechain) return false;
    if (session.status !== 'working' && session.lastInteractionTime < cutoff) {
      // Codex children are already nested; keep recent completions reachable without
      // replacing the root's own activity timestamp with a descendant's timestamp.
      if (session.type !== 'codex' || !hasRecentDescendant(session.subagents, cutoff)) return false;
    }
    if (session.type === 'antigravity' || session.type === 'codex') return true;
    if (activePaths.length === 0) return true;
    const proj = path.normalize(session.projectPath).toLowerCase();
    return activePaths.some((ap) => proj === ap || proj.startsWith(ap + path.sep));
  });

  const nestedAgents = new Map<string, SubAgent[]>();
  const humans = candidates.filter((s) => !isAgentSession(s));
  const topLevelSessions: Session[] = [...humans];
  for (const agent of candidates) {
    if (!isAgentSession(agent)) continue;
    const parent = findParentSession(agent, humans);
    if (!parent) {
      topLevelSessions.push(agent); // orphan — keep it visible on its own
      continue;
    }
    const list = nestedAgents.get(parent.id) ?? [];
    list.push(sessionAsSubagent(agent));
    nestedAgents.set(parent.id, list);
  }

  const dedupeMap = new Map<string, Session>();
  for (const session of topLevelSessions) {
    upsertIfMoreRelevant(dedupeMap, getDedupeKey(session), session);
  }

  // Working sessions render before inactive ones — a live subagent can outlast its parent's
  // last write, so recency alone would bury an actively-working session under an idle one.
  // Full total order (id as final tiebreak) so the result never depends on sort stability.
  const topLevel = Array.from(dedupeMap.values()).sort((a, b) => {
    if ((a.status === 'working') !== (b.status === 'working')) return a.status === 'working' ? -1 : 1;
    if (a.lastInteractionTime !== b.lastInteractionTime) return b.lastInteractionTime - a.lastInteractionTime;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return { topLevel, nestedAgents };
}
