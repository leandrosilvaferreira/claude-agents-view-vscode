import { SubAgent } from './types';
import type { LogEntry } from './logParser';

/**
 * Since Claude Code 2.1.218 (observed on 2.1.222), a skill invoked with `context: fork` (e.g.
 * `/code-review`) runs as a backgrounded subagent, but its launch is NOT a `tool_use` block —
 * subagentDetector.ts's detectClaudeCalls/detectClaudeStandaloneCalls never see it. Instead it's
 * a `type: "system"` entry whose TOP-LEVEL `content` string embeds a
 * `<forked-skill-launch>{...}</forked-skill-launch>` JSON payload (real example:
 * `{"agentId":"a2e15c98935a695a32","skillName":"code-review","description":"/code-review"}`).
 * Its sidecar carries no `toolUseId`, so subagentMetadata's enrichment join never finds it —
 * name/task are set directly from the payload here instead.
 *
 * The `type === 'system'` gate is load-bearing, not incidental: agent reports routinely paste
 * this same tag+JSON verbatim into their own text (e.g. echoing a launch back), and reading it
 * via subagentDetector.ts's getEntryText() (which aggregates message.content/attachment.prompt)
 * would fabricate a phantom subagent from quoted text. Reading ONLY the top-level `content`
 * string keeps this detector blind to that quoted form.
 *
 * This `<forked-skill-launch>` entry is how a skill the USER ran as a slash command forks. A fork the
 * MODEL starts through the built-in Skill tool leaves no such entry — see detectForkedSkillResult below.
 *
 * Claude-Code-only: Antigravity has no forked-skill equivalent, and its tool_calls-shaped
 * entries never carry `type: "system"` with this content, so no explicit no-op branch is
 * needed here (contrast detectSendMessageResume's explicit Antigravity note).
 */
export function detectForkedSkillLaunch(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (json.type !== 'system' || typeof json.content !== 'string') {
    return;
  }
  const payload = parseForkedSkillLaunchPayload(json.content);
  if (!payload) {
    return;
  }
  currentSubagents.set(payload.agentId, {
    id: payload.agentId,
    agentId: payload.agentId,
    name: payload.skillName || 'Agent',
    task: payload.description || 'Delegate task',
    status: 'working',
    // A forked skill always runs backgrounded (see this function's own doc comment) — feeds
    // subagentCompletion.ts's detectAgentsKilled, which must leave a still-running SYNCHRONOUS
    // Agent call alone when an `agents_killed` kill signal only ever targets background agents.
    isBackground: true,
  });
}

interface ForkedSkillPayload {
  agentId: string;
  skillName?: string;
  description?: string;
}

/** Parses the <forked-skill-launch> tag's JSON payload. Mirrors subagentMetadata.ts's
 * readSidecarFile: this format is undocumented and unversioned, so parsing never throws —
 * malformed JSON, a non-object payload, or a missing/non-string agentId are silent no-ops. */
function parseForkedSkillLaunchPayload(content: string): ForkedSkillPayload | undefined {
  // Delimiters are fixed strings, so indexOf is linear-time over this untrusted payload — the
  // equivalent regex measured quadratic worst-case time on pathological (many-unclosed-tag) input.
  const OPEN = '<forked-skill-launch>';
  const CLOSE = '</forked-skill-launch>';
  const start = content.indexOf(OPEN);
  if (start === -1) {
    return undefined;
  }
  const end = content.indexOf(CLOSE, start + OPEN.length);
  if (end === -1) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start + OPEN.length, end));
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const fields = parsed as Record<string, unknown>;
  const agentId = typeof fields.agentId === 'string' ? fields.agentId : undefined;
  if (!agentId) {
    return undefined;
  }
  return {
    agentId,
    skillName: typeof fields.skillName === 'string' ? fields.skillName : undefined,
    description: typeof fields.description === 'string' ? fields.description : undefined,
  };
}

/**
 * The MODEL-invoked variant of the forked skill above. Since Claude Code ~2.1.288 (observed on
 * 2.1.288-2.1.289), a `context: fork` skill the model calls through the built-in `Skill` tool also runs as a
 * backgrounded subagent (real `/code-review` runs took about 45 minutes to 3.5 hours), yet nothing at the
 * launch says so: the assistant turn holds a plain `tool_use {name:"Skill", input:{skill, args}}`, identical to an
 * INLINE skill call (the common case: it runs in the main thread and is never a subagent), and no
 * `<forked-skill-launch>` system entry is written. The signal is the tool_result ~150ms later, whose
 * entry carries `toolUseResult: {success, commandName, status:"forked", background:true, agentId,
 * result:"Running in the background as @<skill>"}` — an inline call gets just `{success,
 * commandName}`. That is why this reads the RESULT, not the launch (all 11 forked launches in the
 * local real corpus carry it; the inline results carry no `status`).
 *
 * Keyed by the Skill tool_use's id, NOT by the agentId as detectForkedSkillLaunch does: the eventual
 * <task-notification> always carries `<task-id>` (the agentId) and usually this id as its
 * `<tool-use-id>` too, so subagentCompletion.ts's plain map-key lookup resolves it. A `<task-id>`-only
 * notification (2 of 11 real first completions, e.g. after the fork was messaged mid-run; also a
 * re-woken run's) resolves through markStoppedByTaskId's `.agentId` match instead, so the subagent must
 * carry its agentId. Name/task come from `commandName` here, not from the sidecar
 * (subagentMetadata.ts): `agent-<agentId>.meta.json` carries no `toolUseId`, so its join never
 * matches — the same as on the forked-skill-launch path.
 *
 * `seen` is subagentDetector.ts's re-appended-history guard (`seenToolUseIds`, see its doc comment),
 * inlined as a has/add because importing subagentDetector from here would create an import cycle.
 * Claude Code re-writes earlier lines verbatim on relocate/resume, and replaying this result would
 * `set()` a fresh 'working' entry over a subagent that already finished. The ACK itself is never read
 * as a completion: subagentLaunchAck.ts's isAsyncLaunchAck accepts `status: 'forked'`.
 *
 * Claude-Code-only: Antigravity has no Skill tool and its entries never carry `toolUseResult`, so
 * the `status` gate simply never matches there — no explicit no-op branch is needed.
 */
export function detectForkedSkillResult(
  json: LogEntry,
  currentSubagents: Map<string, SubAgent>,
  seen: Set<string>,
): void {
  const fork = readForkedSkillAck(json);
  if (!fork || !json.message || !Array.isArray(json.message.content)) {
    return;
  }
  // `toolUseResult` is entry-level, so it applies to every tool_result block here (as in recordResultAgentId and
  // markBackground). A real forked ACK entry holds exactly one; 0 of 28,002 multi-block entries carry a toolUseResult.
  for (const block of json.message.content) {
    if (block.type !== 'tool_result' || !block.tool_use_id || seen.has(block.tool_use_id)) {
      continue;
    }
    seen.add(block.tool_use_id);
    currentSubagents.set(block.tool_use_id, {
      ...fork,
      id: block.tool_use_id,
      status: 'working',
      // The ACK says `background: true` — feeds subagentCompletion.ts's detectAgentsKilled, like the
      // launch above.
      isBackground: true,
    });
  }
}

/** What a `status: "forked"` tool_result entry says about the subagent, or undefined for any other
 * entry — in particular an inline Skill call's `{success, commandName}`. Never throws: a missing,
 * non-string or empty agentId is a silent no-op (as in parseForkedSkillLaunchPayload), and a missing
 * or non-string commandName falls back to the generic name/task every other detector uses. agentId is
 * required in the result (it is optional on SubAgent): nested attach, rewake and the `<task-id>`
 * fallback all need it, and the sidecar has no toolUseId to supply it. */
function readForkedSkillAck(json: LogEntry): (Pick<SubAgent, 'name' | 'task'> & { agentId: string }) | undefined {
  const result = json.toolUseResult;
  if (result?.status !== 'forked' || typeof result.agentId !== 'string' || !result.agentId) {
    return undefined;
  }
  const skill = typeof result.commandName === 'string' ? result.commandName : '';
  return { agentId: result.agentId, name: skill || 'Agent', task: skill ? `/${skill}` : 'Delegate task' };
}
