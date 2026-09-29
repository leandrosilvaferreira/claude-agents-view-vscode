import { Session } from './types';
import { LogEntry } from './transcriptEntry';

/**
 * Per-line turn-signal tracking for LogParser: reads one transcript entry and updates the
 * Session-level flags that describe what happened in the session's own conversation (thinking,
 * interruption, api error) — extracted from logParser.ts purely to keep that file under its line
 * budget. Every exported function here is pure: they only read `json` and mutate the `session` passed
 * in, no LogParser instance state, which is what made this extraction possible in the first place.
 */

// Claude Code stamps no structural field for an Esc-interruption — no `stop_reason`, no `isMeta`,
// no `origin`. The only signal is this literal sentinel text, standing alone as the entire user
// turn. Confirmed against the local transcript corpus (`grep -rhoa '\[Request interrupted[^]]*\]'
// ~/.claude/projects --include='*.jsonl' | sort | uniq -c`): exactly two variants occur at
// meaningful volume (hundreds of occurrences each); nothing else was observed, so nothing else is
// matched here. Fragile by nature — text observed as of Claude Code 2.1.222 — a future wording
// change silently stops matching until this list is updated. Antigravity has no equivalent
// marker at all, so its turns simply never match; no separate no-op branch is needed for it.
const INTERRUPTION_TEXTS = new Set<string>([
  '[Request interrupted by user]',
  '[Request interrupted by user for tool use]',
]);

/**
 * Record whether Claude still owes this session a reply.
 *
 * All three signals describe the SESSION's own conversation, so a sidechain entry must never
 * set them: subagent turns can be interleaved into the parent's file, and a subagent thinks and
 * replies exactly like the session does — letting those through would report the parent as
 * working off the subagent's turn.
 *
 * Claude Code streams a reasoning block as its own entry carrying nothing but `thinking`; the
 * turn's text/tool_use always lands in a later entry. So a transcript whose last conversational
 * turn is thinking-only is one Claude is still working on. Only turns carrying `message` update
 * any of the three flags, so a trailing bookkeeping entry doesn't clear or corrupt any signal.
 *
 * lastEntryIsInterruption is recomputed unconditionally on every message-bearing turn, exactly
 * like lastEntryType above — so it self-clears the moment a real turn follows an interruption,
 * instead of latching true forever once set.
 */
export function trackTurnSignals(json: LogEntry, session: Session): void {
  if (json.isSidechain === true) {
    return;
  }
  // Claude Code writes bookkeeping entries between turns — `attachment` (by far the most
  // frequent), `last-prompt`, `ai-title`, `queue-operation`, `file-history-snapshot` — that
  // carry a `type` but no `message`. Without this gate, one of those landing right after a
  // tool_result overwrites lastEntryType away from 'user', hiding that Claude still owes a
  // reply for as long as the gap before its next turn lasts. Antigravity turns never carry
  // `message` either, so this also leaves its lastEntryType/lastEntryIsThinking unset — same
  // net effect as before, since computeSessionStatus only compares lastEntryType against the
  // literal 'user', which no Antigravity `type` value ever equals.
  if (!json.message) {
    return;
  }
  if (typeof json.type === 'string') {
    session.lastEntryType = json.type;
  }
  session.lastEntryIsInterruption = isInterruptionEntry(json);
  const blocks = Array.isArray(json.message.content) ? json.message.content : null;
  if (blocks) {
    // LogEntry types a content block as always-present, but this is untrusted transcript
    // data — a real line can carry a null/undefined element — so the callback param is typed
    // to match that reality rather than the (optimistic) shared LogEntry shape.
    session.lastEntryIsThinking = blocks.some(
      (block: { type: string } | null | undefined) => block?.type === 'thinking',
    );
  }
}

/**
 * True when this turn's entire text is Claude Code's interruption sentinel (INTERRUPTION_TEXTS
 * above) — the user pressed Esc rather than sending a real prompt. Matched by exact text (after
 * trim), never `includes()`: a user can legitimately quote this phrase inside a real prompt, and
 * a substring match would wrongly mark that session as no longer awaiting a reply.
 *
 * A multi-block content array is never treated as an interruption, even when one block matches
 * exactly — the real interruption entry is always a single lone text block, so extra blocks mean
 * this is a genuine, richer user turn that merely happens to contain the phrase.
 */
function isInterruptionEntry(json: LogEntry): boolean {
  if (json.type !== 'user') {
    return false;
  }
  const content = json.message?.content;
  let text: string | undefined;
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content) && content.length === 1 && content[0]?.type === 'text') {
    text = content[0].text;
  }
  return typeof text === 'string' && INTERRUPTION_TEXTS.has(text.trim());
}

/**
 * Track whether this session's last real signal was an API error — a `system:api_error` entry
 * (`type: 'system'`, `subtype: 'api_error'`) or an assistant turn that flags itself via
 * `apiError`/`isApiErrorMessage`. Feeds computeSessionStatus's 'error' status.
 *
 * Deliberately separate from trackTurnSignals above, not folded into it: a `system:api_error`
 * entry carries no `message` field at all (confirmed against the real transcript corpus), so
 * trackTurnSignals's own `if (!json.message) return;` gate — there specifically because
 * bookkeeping entries lack `message` too — would silently skip every api_error entry as if it
 * were bookkeeping. This function runs unconditionally per line instead (see its call site in
 * logParser.ts's parseLogLine, alongside isSidechain/entrypoint/version), so it sees api_error
 * entries that trackTurnSignals never would.
 *
 * Self-clears back to false the moment any OTHER message-bearing turn follows (a normal
 * assistant/user reply) — same latch-that-self-clears shape as lastEntryIsInterruption.
 * Claude Code auto-retries some errors (maxRetries/retryAttempt live on the same entry), so a
 * flag that only ever turns on would keep reporting 'error' long after the session recovered.
 * A bookkeeping entry that is itself neither an api_error nor message-bearing (attachment,
 * last-prompt, ...) leaves the flag exactly as it was — same reasoning trackTurnSignals's own
 * gate documents for lastEntryType. Sidechain entries are ignored outright, same top guard as
 * trackTurnSignals: a subagent's own API error is not this session's.
 */
export function trackApiErrorSignal(json: LogEntry, session: Session): void {
  if (json.isSidechain === true) {
    return;
  }
  if (json.type === 'system' && json.subtype === 'api_error') {
    session.lastEntryIsApiError = true;
    return;
  }
  if (json.type === 'assistant' && (typeof json.apiError === 'string' || json.isApiErrorMessage === true)) {
    session.lastEntryIsApiError = true;
    return;
  }
  if (json.message) {
    session.lastEntryIsApiError = false;
  }
}

/**
 * Track whether this transcript's conversation is over: Claude Code appends one
 * `{"type":"cost-state", …}` snapshot (the cost ledger `--resume` restores) when its process shuts
 * down — and, through the same saver, when it leaves a conversation in-process (`/clear`, a
 * resume/fork switch). It is the last thing that process writes to the file, usually right after a
 * `last-prompt` bookkeeping line, and carries no `message` and no `timestamp`, so, like the
 * api_error entry above, it needs its own unconditional read rather than a slot in
 * trackTurnSignals's message gate. Real corpus (2.1.227-2.1.284, 610 transcripts, 652 markers): 637
 * are followed by nothing but bookkeeping to EOF (606 of them as the literal last line) and 15 by
 * real turns of a fresh process resuming the same session id; every interactive session on
 * 2.1.278+ that ended cleanly carries one.
 *
 * Without this, a session whose process exited mid-run (real: the 2.1.283 -> 2.1.284 auto-update
 * restart, which exited three sessions within the same second) is indistinguishable from a quiet
 * live one: its background subagents never report completion, and the marker write itself
 * refreshes the file's mtime — so computeSessionStatus read the dead session 'working' for up to
 * IDLE_CEILING, and its "Working Agents" group stayed full even after that: a ghost row beside the
 * successor session the user started in the same worktree. A hard kill (SIGKILL, crash, power
 * loss) or a VS Code/SDK session older than 2.1.278 leaves no marker and still falls back on those
 * mtime heuristics.
 *
 * Self-clears the moment any message-bearing turn follows (the same file was resumed — a fresh
 * process appends to it, usually opening with queue-operation/attachment bookkeeping first), same
 * latch-that-self-clears shape as lastEntryIsApiError above; a trailing bookkeeping entry
 * (attachment, ai-title, …) leaves the flag exactly as it was. Sidechain entries are ignored
 * outright, same top guard as the two functions above: a subagent's transcript interleaved into
 * this file is not this session's process exiting.
 */
export function trackShutdownSignal(json: LogEntry, session: Session): void {
  if (json.isSidechain === true) {
    return;
  }
  if (json.type === 'cost-state') {
    session.shutdownRecorded = true;
    return;
  }
  if (json.message) {
    session.shutdownRecorded = false;
  }
}
