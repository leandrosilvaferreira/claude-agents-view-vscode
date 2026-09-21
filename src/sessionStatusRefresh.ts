import { Session } from './types';
import { computeSessionStatus } from './sessionActivity';
import { applyNestedAgentLiveness } from './sessionDedupe';
import { refreshNestedSubagents } from './nestedSubagents';
import { enrichSubagentMetadata } from './subagentMetadata';
import { refreshRewokenSubagents } from './subagentRewake';

/**
 * Per-tick refresh of every known session's status and subagent metadata. Called from
 * sessionTreeDataProvider.ts's updateActiveStatuses() on every 15s auto-refresh tick
 * (startAutoRefresh) and every file-change-triggered refresh (handleFileChange, loadSessions).
 * `openFiles` is injected (the caller resolves it via sessionActivity.ts's getOpenLogFiles, an
 * `lsof`-backed async lookup) so this function itself stays synchronous and vscode-free — the
 * same "inject what needs real I/O, keep the orchestration pure and testable" split
 * sessionAssembly.ts's assembleVisibleSessions uses for its own activePaths/now parameters.
 *
 * Three things happen per non-Codex session, in an order that matters, and all three run BEFORE
 * `session.status` is computed:
 *
 * 1. enrichSubagentMetadata(session) fills a freshly-launched subagent's `agentId` from its
 *    sidecar. It normally runs from LogParser.parseNewLines — i.e. only when the session's OWN
 *    transcript grows. But steps 2 and 3 below both need `sub.agentId` already filled —
 *    refreshRewokenSubagents to find a subagent's own transcript by it, refreshNestedSubagents to
 *    join its grandchildren via `sub.agentId ?? sub.id`. A subagent's parent transcript commonly
 *    does NOT grow again until the subagent itself finishes — a foreground/synchronous dispatch
 *    blocks the parent turn until the tool_result returns, and a backgrounded one writes only a
 *    launch ACK and, much later, its own completion notification (subagentDetector.ts) — so
 *    relying on parse alone left `agentId` unfilled, and therefore both steps below stale, for
 *    the subagent's entire live run. Real sidecars are written ~61-92ms after their launching
 *    tool_use line (measured, always before this tick runs), so calling enrichSubagentMetadata
 *    here lets a freshly-available agentId be picked up on the SAME tick the other two run, not
 *    just on the next parse. Safe to call every tick: it early-exits in ~0.042ms/call once a
 *    subagent has nothing left to enrich (cache hit — see its own doc comment), so no extra
 *    debouncing is needed on top of that.
 * 2. refreshRewokenSubagents(session) flips a subagent the parser marked 'stopped' back to
 *    'working' when its own agent-<agentId>.jsonl shows it quietly resumed after its completion
 *    <task-notification> (see that file's own doc comment). Depends on step 1's `agentId`.
 * 3. refreshNestedSubagents(session) attaches the grandchildren using the same `agentId`.
 *    See that function's own doc comment for why grandchild attachment runs on this cadence
 *    instead of on transcript parse to begin with.
 *
 * `session.status = computeSessionStatus(...)` runs LAST, after all three: its hasRunningAgents
 * check reads `sub.status` straight off `session.subagents`, so computing it any earlier would
 * miss a subagent step 2 just flipped back to 'working' on this very tick, under-reporting the
 * session itself as 'stopped' for one more 15s cycle.
 *
 * applyNestedAgentLiveness runs once after the loop, across all sessions: computeSessionStatus
 * only sees same-file subagents, so this folds in cross-file nested agents (background agents in
 * their own transcript, matched by project+branch) so a launcher doesn't render 'stopped' while
 * its own "Working Agents" group shows a live child.
 */
export function refreshSessionStatuses(sessions: Session[], openFiles: Set<string>): void {
  for (const session of sessions) {
    if (session.type !== 'codex') {
      enrichSubagentMetadata(session);
      refreshRewokenSubagents(session);
      refreshNestedSubagents(session);
    }
    session.status = computeSessionStatus(session, openFiles);
  }
  applyNestedAgentLiveness(sessions);
}
