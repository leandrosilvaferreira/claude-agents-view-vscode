import * as path from 'path';
import { Session, SubAgent } from './types';
import { findParentSession, getDedupeKey, isAgentSession, isMoreRelevant, sessionAsSubagent } from './sessionDedupe';

export interface AssembledSessions {
  /** Sessions to render at the top level (all humans + orphan background agents). */
  topLevel: Session[];
  /** Background-agent sessions folded under their launcher, keyed by the human session id. */
  nestedAgents: Map<string, SubAgent[]>;
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
    if (session.status !== 'working' && session.lastInteractionTime < cutoff) return false;
    if (session.type === 'antigravity') return true;
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
    const key = getDedupeKey(session);
    const cur = dedupeMap.get(key);
    if (!cur || isMoreRelevant(session, cur)) {
      dedupeMap.set(key, session);
    }
  }
  return { topLevel: Array.from(dedupeMap.values()), nestedAgents };
}
