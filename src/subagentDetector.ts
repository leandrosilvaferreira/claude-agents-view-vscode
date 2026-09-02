import { SubAgent } from './types';
import type { LogEntry } from './logParser';
import { detectForkedSkillLaunch } from './forkedSkillDetector';
import { detectCompletions, findSubagentEntryByTarget } from './subagentCompletion';

/** Detect subagent starts/completions from one log entry and mutate the running map. */
export function detectSubagents(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  detectAntigravityCalls(json, currentSubagents);
  detectClaudeCalls(json, currentSubagents);
  detectSendMessageResume(json, currentSubagents);
  detectClaudeStandaloneCalls(json, currentSubagents);
  detectForkedSkillLaunch(json, currentSubagents);
  detectCompletions(json, currentSubagents);
}

function detectAntigravityCalls(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (json.tool_calls && Array.isArray(json.tool_calls)) {
    for (const tc of json.tool_calls) {
      if (isAntigravitySubagent(tc)) {
        const id = getAntigravityId(tc);
        const task = getAntigravityTask(tc);
        const name = getAntigravityName(tc);
        currentSubagents.set(id, { id, name, task, status: 'working' });
      }
    }
  }
}

function isAntigravitySubagent(tc: { name?: string; ToolName?: string }): boolean {
  const name = tc.name || tc.ToolName;
  return name === 'invoke_subagent' || name === 'browser_subagent';
}

function getAntigravityId(tc: { id?: string; TaskId?: string }): string {
  return tc.id || tc.TaskId || Math.random().toString();
}

function getAntigravityTask(tc: {
  arguments?: { Task?: string; TaskName?: string; Cwd?: string; SearchPath?: string; DirectoryPath?: string };
  Arguments?: { Task?: string; TaskName?: string; Cwd?: string };
}): string {
  const args = tc.arguments || tc.Arguments;
  return args?.Task || args?.TaskName || 'Subagent task';
}

function getAntigravityName(tc: { name?: string; ToolName?: string }): string {
  return tc.name || tc.ToolName || 'subagent';
}

function detectClaudeCalls(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (json.message && Array.isArray(json.message.content)) {
    for (const block of json.message.content) {
      if (isClaudeAgentTool(block)) {
        const id = block.id || Math.random().toString();
        currentSubagents.set(id, {
          id,
          name: getClaudeName(block),
          task: getClaudeTask(block),
          status: 'working',
          model: getClaudeModel(block),
        });
      }
    }
  }
}

function isClaudeAgentTool(block: { type: string; name?: string }): boolean {
  return block.type === 'tool_use' && (block.name === 'Agent' || block.name === 'agent');
}

function getClaudeTask(block: { input?: { task?: string; Task?: string; description?: string } }): string {
  // The Agent tool uses `description` (there is no `task` field); keep task/Task for other formats.
  return block.input?.task || block.input?.Task || block.input?.description || 'Delegate task';
}

function getClaudeName(block: { input?: { name?: string } }): string {
  return block.input?.name || 'Agent';
}

function getClaudeModel(block: { input?: { model?: string } }): string | undefined {
  return block.input?.model;
}

/**
 * `SendMessage({to, message})` can resume a subagent that already reported completion — Claude
 * Code re-invokes it from its saved transcript in the background instead of erroring. Real
 * transcript evidence (a northwind-app session log): an agent finished at 20:51:44Z; 13m15s later a
 * SendMessage addressed to its name silently restarted it, and the subagent stayed 'stopped' in
 * the map that whole time because nothing recognized the resume — sessionActivity's
 * hasRunningAgents saw no working subagent and the whole session read as idle.
 *
 * `to` can be the subagent's NAME (`to: "regression-logic"`) or, when the launch never set a
 * `name`, its raw agentId (`to: "ad2d7960e4bd708a3a"`, format `a<hex>`) — confirmed against real
 * sidecars from the same session: only 2 of 4 launches passed `name`, so the other 2 are only
 * addressable by agentId. findSubagentEntryByTarget matches either, since neither is the id this
 * map is keyed under.
 *
 * Once matched, the map entry is RE-KEYED to the SendMessage tool_use's own id — Claude Code's
 * eventual <task-notification> for this resume carries THAT id, not the original launch's, so
 * markStopped() needs no change to find it later (see detectTaskNotificationCompletion). The
 * ORIGINAL launch id is stashed in `sub.launchId` before the rekey (set once — a later resume
 * never overwrites it), because the sidecar `enrichSubagentMetadata` reads is written at launch
 * time and keeps THAT id as its `toolUseId` forever; without `launchId`, re-keying `sub.id` would
 * silently break that join and the resumed subagent would never get its real name/model (see
 * subagentMetadata.ts).
 *
 * An unmatched `to` (name or agentId form) is a silent no-op: never fabricate a subagent from a
 * SendMessage alone.
 *
 * Antigravity has no SendMessage equivalent, so nothing is done for it here — its own
 * re-invocation of an existing tool call already flips the matching id back to 'working' via
 * detectAntigravityCalls's unconditional `set()`.
 */
function detectSendMessageResume(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (json.message && Array.isArray(json.message.content)) {
    for (const block of json.message.content) {
      if (!isSendMessageCall(block) || !block.id) {
        continue;
      }
      const to = getSendMessageTarget(block);
      if (!to) {
        continue;
      }
      const entry = findSubagentEntryByTarget(currentSubagents, to);
      if (!entry) {
        continue;
      }
      reactivateSubagent(currentSubagents, entry, block.id);
    }
  }
}

/** Re-keys the map entry to the SendMessage's own tool_use id and flips it back to 'working'.
 * `launchId` is set once — on the FIRST resume only, when it's still unset — so a later resume
 * never overwrites the original launch id it needs to keep pointing at (see
 * detectSendMessageResume's doc comment on why that id must survive the rekey). */
function reactivateSubagent(currentSubagents: Map<string, SubAgent>, entry: [string, SubAgent], newId: string): void {
  const [oldId, sub] = entry;
  currentSubagents.delete(oldId);
  if (sub.launchId === undefined) {
    sub.launchId = oldId;
  }
  sub.status = 'working';
  sub.id = newId;
  currentSubagents.set(newId, sub);
}

function isSendMessageCall(block: { type: string; name?: string }): boolean {
  return block.type === 'tool_use' && block.name === 'SendMessage';
}

function getSendMessageTarget(block: { input?: unknown }): string | undefined {
  // `to` isn't part of LogEntry's typed `input` shape — this fix stays scoped to
  // subagentDetector.ts, so `input` is read as unknown and narrowed locally here instead of
  // widening the shared parser type (mirrors subagentMetadata.ts's sidecar field reads).
  const input = block.input as Record<string, unknown> | undefined;
  return typeof input?.to === 'string' ? input.to : undefined;
}

function detectClaudeStandaloneCalls(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  if (isClaudeStandaloneCall(json)) {
    const id = json.id || Math.random().toString();
    currentSubagents.set(id, {
      id,
      name: getClaudeName(json),
      task: getClaudeTask(json),
      status: 'working',
      model: getClaudeModel(json),
    });
  }
}

function isClaudeStandaloneCall(json: LogEntry): boolean {
  return json.type === 'tool_use' && (json.name === 'Agent' || json.name === 'agent');
}
