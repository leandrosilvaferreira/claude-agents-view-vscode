import { Session } from './types';
import { computeSessionStatus } from './sessionActivity';
import { applyNestedAgentLiveness } from './sessionDedupe';
import { refreshNestedSubagents } from './nestedSubagents';
import { enrichSubagentMetadata } from './subagentMetadata';

/**
 * Per-tick refresh of every known session's status and subagent metadata. Called from
 * sessionTreeDataProvider.ts's updateActiveStatuses() on every 15s auto-refresh tick
 * (startAutoRefresh) and every file-change-triggered refresh (handleFileChange, loadSessions).
 * `openFiles` is injected (the caller resolves it via sessionActivity.ts's getOpenLogFiles, an
 * `lsof`-backed async lookup) so this function itself stays synchronous and vscode-free — the
 * same "inject what needs real I/O, keep the orchestration pure and testable" split
 * sessionAssembly.ts's assembleVisibleSessions uses for its own activePaths/now parameters.
 *
 * Two things happen per session, in an order that matters:
 *
 * 1. enrichSubagentMetadata(session) fills a freshly-launched subagent's `agentId` from its
 *    sidecar. It normally runs from LogParser.parseNewLines — i.e. only when the session's OWN
 *    transcript grows. But refreshNestedSubagents (next) attaches a "grandchild" (a subagent
 *    launched BY a subagent) to its launcher via `sub.agentId ?? sub.id`, a join that only works
 *    once `sub.agentId` is filled. A subagent's parent transcript commonly does NOT grow again
 *    until the subagent itself finishes — a foreground/synchronous dispatch blocks the parent
 *    turn until the tool_result returns, and a backgrounded one writes only a launch ACK and,
 *    much later, its own completion notification (subagentDetector.ts) — so relying on parse
 *    alone left `agentId` unfilled, and therefore every grandchild unattached, for the
 *    subagent's entire live run: they only appeared once it had already finished and the parent
 *    transcript grew again. Real sidecars are written ~61-92ms after their launching tool_use
 *    line (measured, always before this tick runs), so calling enrichSubagentMetadata here lets
 *    a freshly-available agentId be picked up on the SAME tick refreshNestedSubagents runs, not
 *    just on the next parse. Safe to call every tick: it early-exits in ~0.042ms/call once a
 *    subagent has nothing left to enrich (cache hit — see its own doc comment), so no extra
 *    debouncing is needed on top of that.
 * 2. refreshNestedSubagents(session) attaches the grandchildren using the agentId just filled.
 *    See that function's own doc comment for why grandchild attachment runs on this cadence
 *    instead of on transcript parse to begin with.
 *
 * applyNestedAgentLiveness runs once after the loop, across all sessions: computeSessionStatus
 * only sees same-file subagents, so this folds in cross-file nested agents (background agents in
 * their own transcript, matched by project+branch) so a launcher doesn't render 'stopped' while
 * its own "Working Agents" group shows a live child.
 */
export function refreshSessionStatuses(sessions: Session[], openFiles: Set<string>): void {
  for (const session of sessions) {
    session.status = computeSessionStatus(session, openFiles);
    enrichSubagentMetadata(session);
    refreshNestedSubagents(session);
  }
  applyNestedAgentLiveness(sessions);
}
