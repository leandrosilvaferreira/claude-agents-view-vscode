import * as fs from 'fs';
import { Session, SubAgent } from './types';
import { candidateMetadataDirs, readAllSidecars } from './sidecarReader';
import { IDLE_CEILING } from './sessionActivity';

// Real corpus: a finished subagent's own transcript can land up to 6-9s after its completion
// notification's own timestamp (3/3,907 candidates; e.g. notification 10:50:24.4Z, file mtime
// 10:50:30.6Z) — an earlier version of this comment claimed "never more than 2s", which was
// wrong and let a real re-wake go undetected for up to IDLE_CEILING. 30s leaves comfortable
// margin over that write latency without meaningfully delaying detection: the smallest genuine
// re-wake gap observed is 50s, well clear of it.
const REWAKE_SLACK_MS = 30 * 1000;

// A subagent stays a rewake CANDIDATE only within this horizon of its own `stoppedAt` — past it,
// stat()-ing its transcript on every refresh tick forever is pure waste for a session nobody will
// reopen (real corpus: 3,907 candidates with no horizon at all, ~24ms/refresh, and refreshes fire
// on every *.jsonl watcher event with no debounce). Every real re-wake observed happens within
// minutes (50s-23min), so 24h is generous margin, not a tight fit — but a subagent that genuinely
// re-wakes MORE than 24h after its last completion would be missed by this ceiling.
const REWAKE_HORIZON_MS = 24 * 60 * 60 * 1000;

/** A subagent eligible for a rewake check: stopped recently enough (REWAKE_HORIZON_MS) to still
 * be worth a stat() this tick, with both the agentId its own transcript is keyed under and the
 * timestamp it was stopped at. Collected via a type-guarded loop (rather than `.filter()` plus a
 * later `as string`/`as number` cast) so `agentId`/`stoppedAt` stay real, narrowed `string`/
 * `number` types below. */
interface RewakeCandidate {
  sub: SubAgent;
  agentId: string;
  stoppedAt: number;
}

function collectRewakeCandidates(subagents: SubAgent[], now: number): RewakeCandidate[] {
  const candidates: RewakeCandidate[] = [];
  for (const sub of subagents) {
    if (sub.agentId && sub.stoppedAt !== undefined && now - sub.stoppedAt <= REWAKE_HORIZON_MS) {
      candidates.push({ sub, agentId: sub.agentId, stoppedAt: sub.stoppedAt });
    }
  }
  return candidates;
}

/**
 * A backgrounded subagent can start running again AFTER its completion <task-notification>, with
 * nothing in the parent transcript saying so: it ends its turn while one of its own background
 * tasks (e.g. a run_in_background Bash) is still pending, that task's notification is then
 * delivered to the SUBAGENT (its transcript gets a user turn with origin.kind "task-notification"),
 * and it resumes work — a peer message from another subagent (origin.kind "peer") does the same.
 * The parent only learns about it from a second <task-notification> carrying <task-id> alone,
 * minutes later (real: 5 min and 12 min in session a6e83be2, 2.1.278; 52 such re-notifications in
 * the corpus since 2.1.239). Until then the subagent rendered under "Completed Agents".
 *
 * So, on every tick: a subagent the parser marked stopped at `stoppedAt` (within
 * REWAKE_HORIZON_MS — an older one is skipped before touching disk at all) whose own
 * agent-<agentId>.jsonl was written after that (plus REWAKE_SLACK_MS) and recently (IDLE_CEILING,
 * same best-effort mtime ceiling nestedSubagents.ts uses for grandchildren) is working again. It
 * falls back to 'stopped' once its transcript goes quiet past the ceiling, and also when there is
 * no transcript to check at all (no sidecar mapped to its agentId, or the file can't be stat()'d)
 * — an earlier tick may have flipped it to 'working', and nothing here may leave that stale once
 * the evidence for it is gone. The next completion notification resets `stoppedAt`
 * (subagentCompletion.ts), so a re-woken agent that finishes is stopped again by the parser
 * itself. Antigravity has no sidecars/agentId, so this no-ops for it.
 */
export function refreshRewokenSubagents(session: Session): void {
  const now = Date.now();
  const candidates = collectRewakeCandidates(session.subagents, now);
  if (candidates.length === 0) {
    return;
  }
  const transcriptByAgentId = new Map<string, string>();
  for (const meta of readAllSidecars(candidateMetadataDirs(session), session.id)) {
    if (meta.agentId) {
      transcriptByAgentId.set(meta.agentId, meta.sidecarPath.replace(/\.meta\.json$/, '.jsonl'));
    }
  }
  for (const { sub, agentId, stoppedAt } of candidates) {
    const transcript = transcriptByAgentId.get(agentId);
    if (!transcript) {
      sub.status = 'stopped'; // No sidecar mapped to this agentId (any more): nothing says it's still running.
      continue;
    }
    let mtime: number;
    try {
      mtime = fs.statSync(transcript).mtimeMs;
    } catch {
      sub.status = 'stopped'; // No transcript on disk: nothing says it ever ran again.
      continue;
    }
    const rewoken = mtime - stoppedAt > REWAKE_SLACK_MS && now - mtime < IDLE_CEILING;
    sub.status = rewoken ? 'working' : 'stopped';
  }
}
