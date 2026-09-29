import { SubAgent } from './types';
import type { LogEntry } from './transcriptEntry';

/**
 * Launch/resume ACK side of subagent tracking, split out of subagentCompletion.ts (the only
 * caller) to keep that file inside this repo's 350-line budget. A launch's tool_result comes back
 * almost at once and is NOT the agent finishing: an async-launch ACK (`async_launched`), an
 * in-process teammate's spawn ACK (`teammate_spawned`) and SendMessage's own acks must never be
 * read as completions. This file collects those ACK predicates plus what a launch's tool_result
 * records about the subagent (the agentId Claude Code assigned, whether it runs backgrounded).
 * Nothing here stops a subagent.
 */

/** A tool_result's `toolUseResult.agentId` names the agentId Claude Code assigned — not only on
 * the async-launch ACK ({status:'async_launched', agentId, ...}, 2995/2995 real ACKs) but on a
 * SYNCHRONOUS subagent's own completion tool_result too ({status:'completed', agentId, ...},
 * 1,730/1,730 real sync completions). Called unconditionally for every entry (see
 * detectCompletions), instead of waiting for subagentMetadata's sidecar join (which only runs
 * after the whole parsed chunk), so a later same-chunk SendMessage{to:<agentId>} resume or
 * <task-id>-only notification (a subagent re-woken after its first completion) can still resolve
 * on a cold parse — e.g. at extension start. Only ever fills an UNSET `agentId`, so calling it
 * unconditionally never overwrites one the sidecar join already set. A no-op for a
 * `teammate_spawned` ACK: Claude Code names that teammate's id in snake_case `agent_id`, which
 * this camelCase `agentId` read never matches — a teammate still only gets `agentId` from the
 * sidecar join, same as before this function existed. */
export function recordResultAgentId(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  const agentId = json.toolUseResult?.agentId;
  if (typeof agentId !== 'string' || !json.message || !Array.isArray(json.message.content)) {
    return;
  }
  for (const block of json.message.content) {
    const sub = block.type === 'tool_result' && block.tool_use_id ? currentSubagents.get(block.tool_use_id) : undefined;
    if (sub && !sub.agentId) {
      sub.agentId = agentId;
    }
  }
}

/** True for either ACK shape that must NOT be read as a completion: an async-launch/teammate ACK
 * or a SendMessage-ack (which ACKs a MESSAGE, not a launch — see isSendMessageAck's own doc
 * comment). Pure predicate — background-ness is recorded separately by markBackground, called
 * unconditionally from detectCompletions (subagentCompletion.ts), not as a side effect of this
 * check. */
export function isLaunchOrSendMessageAck(json: LogEntry): boolean {
  return isAsyncLaunchAck(json) || isSendMessageAck(json);
}

/** Flags the subagent this async-launch/teammate ACK targets as backgrounded — same
 * message.content walk as recordResultAgentId above, keyed by the ACK's own tool_use_id. Checks
 * isAsyncLaunchAck itself (rather than relying on the caller to gate it) so detectCompletions can
 * call it unconditionally without gaining a branch; in particular this is NOT true for a
 * SendMessage-ack, which acks a MESSAGE, not a launch. detectAgentsKilled (subagentCompletion.ts)
 * relies on this flag to tell a backgrounded agent apart from a synchronous Agent call, which
 * gets no ACK of either shape until it completes — a synchronous call later RESUMED via
 * SendMessage becomes background too, but through reactivateSubagent in subagentDetector.ts, not
 * here. */
export function markBackground(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (!isAsyncLaunchAck(json) || !json.message || !Array.isArray(json.message.content)) {
    return;
  }
  for (const block of json.message.content) {
    if (block.type === 'tool_result' && block.tool_use_id) {
      const sub = currentSubagents.get(block.tool_use_id);
      if (sub) {
        sub.isBackground = true;
      }
    }
  }
}

function isAsyncLaunchAck(json: LogEntry): boolean {
  // Match the launch status exactly: a finished async agent may still carry isAsync on its entry.
  // 'teammate_spawned' is the same ACK for an in-process teammate (Claude Code 2.1.258, observed on
  // a Fable 5.1 CLI session): the Agent tool_use spawns a named teammate and gets back
  // {status:'teammate_spawned', prompt, ...} ~200ms later. Without it here, every teammate was
  // marked stopped at launch, so a session running three of them rendered with zero Working Agents
  // — and, since nothing was working, the parent session itself read 'stopped' too.
  // Their real completion is the teammate idle_notification (subagentCompletion.ts's
  // detectTeammateIdleCompletion), NOT a <task-notification>.
  const status = json.toolUseResult?.status;
  return status === 'async_launched' || status === 'teammate_spawned';
}

function isSendMessageAck(json: LogEntry): boolean {
  // `resumedAgentId`/`pin`/`routing` aren't part of LogEntry's typed `toolUseResult` shape — this
  // fix stays scoped to subagentDetector.ts, so the value is widened to unknown and narrowed
  // locally here instead of touching the shared parser type (mirrors subagentMetadata.ts's
  // sidecar field reads).
  // Three successful shapes, none a completion — all mean the target is still alive:
  //   - a resume of a finished Agent-tool subagent: {success, message, resumedAgentId, pin}
  //   - a message queued for a still-running Agent-tool subagent: {success, message, pin}
  //     ("Message queued for delivery to <id> at its next tool round.")
  //   - a message sent to a still-running in-process TEAMMATE's inbox: {success, message, msg_id,
  //     routing:{content, sender, summary, target, targetColor}} ("Message sent to <name>'s
  //     inbox") — no `pin` at all (real corpus, session f03a74fb).
  // A failed send is {success: false, message, display} — no pin/routing — and a cross-session
  // send has its own shape too; both lack pin AND routing, so both still fall through to
  // markStopped, which is a no-op (or, for a real reactivation, undoes one that never happened).
  const result: unknown = json.toolUseResult;
  if (typeof result !== 'object' || result === null) {
    return false;
  }
  const fields = result as Record<string, unknown>;
  if (typeof fields.resumedAgentId === 'string') {
    return true;
  }
  return fields.success === true && (isAliveMarker(fields.pin) || isAliveMarker(fields.routing));
}

/** A non-null object value — `pin` (Agent-tool subagent) or `routing` (in-process teammate) are
 * both only ever present, as objects, on a successful send to a still-alive target. */
function isAliveMarker(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}
