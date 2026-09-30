import { Session } from './types';

/**
 * The DEFAULT activity window: a transcript written to within this long reads as 'working'. The
 * single source of that default — computeSessionStatus and refreshSessionStatuses take the window
 * as a parameter and fall back to this. Also imported by nestedSubagents.ts for its best-effort
 * grandchild status (mtime of a child's sidecar), which keeps this fixed value rather than the
 * configurable window: one definition of "recent" there, exported so it isn't duplicated as a
 * second magic-number literal.
 */
export const RECENT_WRITE = 60 * 1000;
// Also shared with nestedSubagents.ts: a grandchild's status has NO signal besides mtime (no
// awaitingReply/isThinking/hasRunningAgents to fall back on the way computeSessionStatus below
// does), so it needs the same generous ceiling this function uses for a session that's gone
// quiet mid-turn — not the much tighter RECENT_WRITE, which is a "just wrote a moment ago"
// signal for a DIFFERENT purpose. See nestedSubagents.ts's computeChildStatus.
export const IDLE_CEILING = 30 * 60 * 1000;

function computeCodexStatus(session: Session): Session['status'] {
  if (session.codexTurnStatus !== 'working') return session.codexTurnStatus ?? 'stopped';
  return Date.now() - session.lastInteractionTime < IDLE_CEILING ? 'working' : 'stopped';
}

/**
 * Decide whether a session is still running.
 *
 * Detection is file-activity based, with no process inspection: a transcript written to within
 * `activityWindowMs` (its mtime, carried by `session.lastInteractionTime`) reads as working, the
 * same way on every platform. Neither Claude Code nor Antigravity holds the transcript open
 * between appends, so a write is the only direct liveness signal there is. The window defaults to
 * RECENT_WRITE, is the caller's to configure, and is assumed to stay at or below IDLE_CEILING — a
 * longer one would let the recent-write check below outrank the idle ceiling. Relying on a recent
 * write alone would mark a session stopped during any quiet stretch: a backgrounded agent can run
 * for minutes without the parent transcript gaining a single line, which is exactly when the user
 * is watching it work.
 *
 * So: recent write, OR the last entry is a user turn (Claude owes a reply), OR the last turn is a
 * thinking-only block (Claude is mid-reply — its text/tool_use always arrives in a later entry),
 * OR it still has subagents that never reported completion. Those three are capped by
 * IDLE_CEILING so a session abandoned mid-turn, or one whose agent completion notification we
 * missed, eventually goes quiet instead of spinning forever.
 *
 * The "last entry is a user turn" reading has one carve-out: Claude Code writes the user's own
 * Esc-interruption as a `type: 'user'` turn too (see logParser.ts's INTERRUPTION_TEXTS), and
 * Claude owes that turn nothing — the user killed it, not Claude. Without the carve-out, an
 * interrupted session read as 'working' for up to IDLE_CEILING after the user backed out of it.
 * The other two conditions are untouched: a still-thinking or still-running-subagent session
 * stays 'working' regardless of the interruption.
 *
 * A session whose last real signal was an API error (session.lastEntryIsApiError, set by
 * logParser.ts's trackApiErrorSignal) gets a fourth, higher-priority reading: 'error' instead of
 * the default 'stopped', so the sidebar can tell "finished cleanly" apart from "broke". Like the
 * three conditions above, this only applies below IDLE_CEILING — an old, long-abandoned errored
 * session still falls back to plain 'stopped' rather than showing a permanent alarm. It's ranked
 * below hasRunningAgents (a live subagent is real, ongoing work regardless of what the parent's
 * own last turn was — same precedent as the interruption carve-out above) but above
 * awaitingReply/isThinking: those two are only recomputed on a message-bearing turn, and a
 * `system:api_error` entry carries none, so both can still be stale-true from the turn that
 * preceded the very call that then failed — a confirmed failure is a more truthful read than a
 * guess left over from an older turn.
 */
export function computeSessionStatus(
  session: Session,
  activityWindowMs: number = RECENT_WRITE,
): 'working' | 'stopped' | 'error' {
  if (session.type === 'codex') return computeCodexStatus(session);
  // The CLI's shutdown snapshot is the last thing a process writes — so the file is fresh (inside
  // the activity window) precisely when it has just exited, and every heuristic below would read
  // that as alive. Its own latch (Session.shutdownRecorded) outranks them all. An ended session
  // reads plain 'stopped', never 'error': that alarm is for one that may recover.
  if (session.shutdownRecorded === true) {
    return 'stopped';
  }
  const idle = Date.now() - session.lastInteractionTime;
  if (idle < activityWindowMs) {
    return 'working';
  }
  if (idle >= IDLE_CEILING) {
    return 'stopped';
  }
  const hasRunningAgents = session.subagents.some((sub) => sub.status === 'working');
  if (hasRunningAgents) {
    return 'working';
  }
  if (session.lastEntryIsApiError === true) {
    return 'error';
  }
  return isMidTurn(session) ? 'working' : 'stopped';
}

/** Claude still owes this session's own conversation something: a user turn awaiting its reply
 * (unless that turn is the user's own Esc) or a thinking-only last turn. Split out of
 * computeSessionStatus only to keep that function under the repo's cyclomatic-complexity budget. */
function isMidTurn(session: Session): boolean {
  const awaitingReply = session.lastEntryType === 'user' && !session.lastEntryIsInterruption;
  return awaitingReply || session.lastEntryIsThinking === true;
}
