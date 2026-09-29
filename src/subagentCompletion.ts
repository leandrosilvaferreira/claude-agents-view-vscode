import { SubAgent } from './types';
import type { LogEntry } from './transcriptEntry';
import { isLaunchOrSendMessageAck, markBackground, recordResultAgentId } from './subagentLaunchAck';

/**
 * Completion side of subagent tracking (the start side stays in subagentDetector.ts, which is the
 * only caller). Split out purely to keep both files inside this repo's 350-line budget: every
 * launch mechanism has its own completion shape — synchronous tool_result, <task-notification>
 * for a backgrounded agent or forked skill, <teammate-message> idle_notification for an
 * in-process teammate — and those shapes are what this file collects. The ACKs that must NOT be
 * read as completions live in subagentLaunchAck.ts.
 */

/** Last (most recently launched) match wins on a reused name/agentId — Map iteration is insertion
 * order, and a relaunch always gets a fresh key, so "last" means "newest". Matches by name (the
 * common case, when the launch passed one) or by the sidecar-derived agentId (subagentMetadata.ts)
 * for a launch that didn't — SendMessage's `to` can address either form. */
export function findSubagentEntryByTarget(
  currentSubagents: Map<string, SubAgent>,
  target: string,
): [string, SubAgent] | undefined {
  let found: [string, SubAgent] | undefined;
  for (const entry of currentSubagents) {
    if (entry[1].name === target || entry[1].agentId === target) {
      found = entry;
    }
  }
  return found;
}

export function detectCompletions(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  // A launch ACK AND a synchronous subagent's own completion tool_result both carry
  // toolUseResult.agentId (real corpus: 1,730/1,730 sync completions carry {status:'completed',
  // agentId,...}, the same field the async ACK carries) — recorded unconditionally, before
  // anything below can return early, so a same-chunk SendMessage{to:<agentId>} resume or
  // <task-id>-only notification can still match it on a cold parse (see recordResultAgentId's own
  // doc comment for why this can't wait for the sidecar join instead).
  recordResultAgentId(json, currentSubagents);

  // Same shape as recordResultAgentId above: called unconditionally, before anything below can
  // return early. markBackground no-ops on anything that isn't actually an async-launch/teammate
  // ACK (see its own doc comment), so this adds no branch here.
  markBackground(json, currentSubagents);

  // A backgrounded Agent gets its tool_result ~100ms after launch, carrying
  // toolUseResult.status === 'async_launched'. That ACKs the launch — it does NOT mean the agent
  // finished (observed: an agent ACKed at 17:58:09 only really finished at 18:07:06). Counting it
  // as a completion marked every async subagent "stopped" on the spot, so long-running agents
  // never appeared under "Working Agents". Their real completion is the <task-notification> below.
  // A SendMessage that resumes an already-completed subagent (detectSendMessageResume) gets its
  // own ACK ~200ms later, carrying the SAME tool_use_id the subagent was just re-keyed under.
  // Unlike the Agent tool's tool_result, this ACK has no `status` field at all — its real shape
  // (confirmed against the same transcript evidence cited on detectSendMessageResume) is
  // {success, message, resumedAgentId, pin}. Counting either ACK as a completion would flip the
  // subagent back to 'stopped' immediately, undoing the launch/resume it just ACKed. Both real
  // completions arrive later as the <task-notification> below, carrying the same id either way.
  if (isLaunchOrSendMessageAck(json)) {
    return;
  }

  // Antigravity completions carry tool_call_id; standalone Claude tool_result carries tool_use_id.
  const at = entryTime(json);
  if (json.type === 'TOOL_OUTPUT' && json.tool_call_id) {
    markStopped(currentSubagents, json.tool_call_id, at);
  }
  if (json.tool_use_id) {
    markStopped(currentSubagents, json.tool_use_id, at);
  }
  // Real Claude Code transcripts nest tool_result blocks inside message.content[] instead of
  // carrying tool_use_id at the top level — without this, subagents started via the nested
  // Agent tool_use path (detectClaudeCalls) never get marked stopped. Synchronous agents finish
  // here; async ones were already skipped above.
  if (json.message && Array.isArray(json.message.content)) {
    for (const block of json.message.content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        markStopped(currentSubagents, block.tool_use_id, at);
      }
    }
  }

  detectTaskNotificationCompletion(json, currentSubagents);
  detectTeammateIdleCompletion(json, currentSubagents);
}

/**
 * `system:agents_killed` (Claude Code 2.1.258+, observed carrying only type/subtype/timestamp —
 * no per-agent ids at all): written once when the user stops every BACKGROUND agent at once (e.g.
 * ctrl+x ctrl+k twice, "All background agents stopped"). No per-agent <task-notification> follows
 * for any of them, so a background subagent/teammate with no completion of its own would otherwise
 * stay 'working' forever and keep the whole session reading 'working' too (real: session
 * f03a74fb, 2.1.258 — a teammate launched around L464 never got its own completion; the kill line
 * lands around L1644).
 *
 * Scoped to `sub.isBackground` (set by markBackground in subagentLaunchAck.ts, at launch for a
 * `<forked-skill-launch>` — see forkedSkillDetector.ts — or by reactivateSubagent on a
 * SendMessage resume, in subagentDetector.ts): a synchronous/foreground Agent call blocks the
 * whole turn until its own tool_result, so it can't itself be background, and must stay 'working'
 * — the user's kill command only ever targets backgrounded agents in the first place. `SubAgent`
 * has no other way to tell the two apart today, hence the flag.
 *
 * Claude-only: this entry type has no Antigravity equivalent, so the `type`/`subtype` gate below
 * simply never matches an Antigravity transcript — no separate no-op branch is needed.
 */
export function detectAgentsKilled(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (json.type !== 'system' || json.subtype !== 'agents_killed') {
    return;
  }
  const at = entryTime(json);
  for (const sub of currentSubagents.values()) {
    if (sub.status === 'working' && sub.isBackground) {
      stop(sub, at);
    }
  }
}

/**
 * The CLI's shutdown snapshot (`type:"cost-state"`, the last line a process writes when it exits
 * or leaves the conversation — see turnSignals.ts's trackShutdownSignal) ends every subagent still
 * 'working', the synchronous ones too: they all run inside the process that just left, so none can
 * ever report back. Real corpus: a dead process's subagent transcripts never grew more than 3.3s
 * past the marker. Unlike `agents_killed` above there is no isBackground gate, because nothing
 * survives the process itself. No `stoppedAt` is stamped (the snapshot carries no timestamp) and
 * the one an already-finished subagent carries is cleared too, which keeps subagentRewake.ts from
 * treating any of them as a re-wake candidate — a dead process wakes nothing, yet a finished
 * agent's own transcript, last written seconds before the exit, still passes the re-wake check for
 * IDLE_CEILING. A subagent the same file later resumes (SendMessage once the session itself has
 * resumed) is re-activated by reactivateSubagent, which resets every flag set here.
 *
 * KNOWN LIMIT: a fork that KEEPS its parent alive also snapshots (`/background` — in the CLI
 * binary, never seen in the local corpus, where all 15 markers followed by real turns were fresh
 * processes resuming the same session id). There the parent's live subagents would be stopped
 * early and stay stopped.
 *
 * Claude-only by construction: no Antigravity transcript carries this entry type.
 */
export function detectSessionShutdown(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (json.type !== 'cost-state' || json.isSidechain === true) {
    return;
  }
  for (const sub of currentSubagents.values()) {
    stop(sub, undefined);
    sub.endedWithSession = true;
  }
}

/**
 * An in-process teammate (launch ACK `status:'teammate_spawned'`) never produces a
 * <task-notification>. It reports back as a plain user turn in the parent transcript:
 *
 *   Another Claude session sent a message:
 *   <teammate-message teammate_id="fb-inventory" color="blue">
 *   {"type":"idle_notification","from":"fb-inventory","idleReason":"available","result":"…"}
 *
 * Only `idle_notification` means "done for now" — other teammate-message types are mid-run chatter
 * and must not stop it. `teammate_id` is the launch's `name`, not the tool_use id the map is keyed
 * under, so the lookup goes through findSubagentEntryByTarget (same matcher SendMessage resume
 * uses). Bookkeeping `last-prompt` entries echo the same text under `lastPrompt`, which
 * getEntryText deliberately does not read — otherwise a stale echo would re-stop a teammate that a
 * SendMessage had just resumed.
 */
function detectTeammateIdleCompletion(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  const text = getEntryText(json);
  if (!text.includes('<teammate-message') || !text.includes('"type":"idle_notification"')) {
    return;
  }
  const match = text.match(/<teammate-message\s+teammate_id="([^"]+)"/);
  if (!match) {
    return;
  }
  const entry = findSubagentEntryByTarget(currentSubagents, match[1]);
  if (entry) {
    stop(entry[1], entryTime(json));
  }
}

/** A backgrounded agent reports completion as a <task-notification> turn in the PARENT transcript.
 * A classic Agent-tool dispatch carries the <tool-use-id> of the tool_use that spawned it — the
 * key subagents are stored under. A forked-skill launch (forkedSkillDetector.ts) never had a
 * tool_use, so its notification carries only <task-id>, which IS the agentId it was keyed under.
 * Both are tried independently. The <tool-use-id> path is a plain map-key lookup that no-ops on a
 * miss. The <task-id> path goes through markStoppedByTaskId, which ALSO matches on `.agentId` —
 * so a classic subagent's own <task-id> can resolve too, since subagentMetadata fills `.agentId`
 * from the sidecar filename. That is correct, not a collision: it's the same agent addressed by
 * its other id. Verified against real corpus (~3GB, 317 projects): 248 files carry <task-id>, 262
 * carry <tool-use-id>, 247 carry both — <task-id> alone is exactly the forked-skill case. */
function detectTaskNotificationCompletion(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  const text = getEntryText(json);
  if (!text.includes('<task-notification>')) {
    return;
  }
  const at = entryTime(json);
  const toolUseIdMatch = text.match(/<tool-use-id>([^<]+)<\/tool-use-id>/);
  if (toolUseIdMatch) {
    markStopped(currentSubagents, toolUseIdMatch[1].trim(), at);
  }
  const taskIdMatch = text.match(/<task-id>([^<]+)<\/task-id>/);
  if (taskIdMatch) {
    markStoppedByTaskId(currentSubagents, taskIdMatch[1].trim(), at);
  }
}

/** The notification reaches the parent transcript in three shapes, and a given agent may only ever
 * get one of them: a plain user turn (message.content), a `queue-operation` entry (top-level
 * content), or a `queued_command` attachment (attachment.prompt). Read all three. */
function getEntryText(json: LogEntry): string {
  const parts: string[] = [];
  const content = json.message?.content;
  if (typeof content === 'string') {
    parts.push(content);
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        parts.push(block.text);
      }
    }
  }
  if (typeof json.content === 'string') {
    parts.push(json.content);
  }
  if (typeof json.attachment?.prompt === 'string') {
    parts.push(json.attachment.prompt);
  }
  return parts.join('\n');
}

function markStopped(currentSubagents: Map<string, SubAgent>, id: string, at: number | undefined): void {
  const sub = currentSubagents.get(id);
  if (sub) {
    stop(sub, at);
  }
}

/** `stoppedAt` feeds subagentRewake.ts: a subagent can start running again after its completion
 * notification without the parent transcript saying so (see that file). */
function stop(sub: SubAgent, at: number | undefined): void {
  sub.status = 'stopped';
  sub.stoppedAt = at;
}

function entryTime(json: LogEntry): number | undefined {
  const t = json.timestamp ? Date.parse(json.timestamp) : NaN;
  return Number.isNaN(t) ? undefined : t;
}

/**
 * <task-id> is the agentId. For a subagent whose map key still equals its agentId, this is
 * exactly markStopped(). It only diverges after a SendMessage resume (reactivateSubagent)
 * re-keys the entry to the resume's own tool_use id while leaving `.agentId` untouched — a
 * plain map.get(id) would then miss, leaving the subagent stuck 'working' forever, which (via
 * sessionDedupe.applyNestedAgentLiveness) pins the whole parent session 'working' too.
 *
 * DEFENSIVE, not a fix for a reproduced failure: no transcript observed so far has actually hit
 * this path — the one real post-resume notification seen carried BOTH tags, and <tool-use-id>
 * alone already resolved it. This guards a plausible shape that just hasn't shown up yet.
 */
function markStoppedByTaskId(currentSubagents: Map<string, SubAgent>, taskId: string, at: number | undefined): void {
  if (currentSubagents.has(taskId)) {
    markStopped(currentSubagents, taskId, at);
    return;
  }
  const fallback = findSubagentByAgentId(currentSubagents, taskId);
  if (fallback) {
    stop(fallback, at);
  }
}

/** Last (most recently launched) match wins on a reused agentId, mirroring
 * findSubagentEntryByTarget's iteration-order tie-break. */
function findSubagentByAgentId(currentSubagents: Map<string, SubAgent>, agentId: string): SubAgent | undefined {
  let found: SubAgent | undefined;
  for (const sub of currentSubagents.values()) {
    if (sub.agentId === agentId) {
      found = sub;
    }
  }
  return found;
}
