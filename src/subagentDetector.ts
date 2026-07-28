import { SubAgent } from './types';
import { LogEntry } from './logParser';

/** Detect subagent starts/completions from one log entry and mutate the running map. */
export function detectSubagents(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  detectAntigravityCalls(json, currentSubagents);
  detectClaudeCalls(json, currentSubagents);
  detectClaudeStandaloneCalls(json, currentSubagents);
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

function detectCompletions(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  // A backgrounded Agent gets its tool_result ~100ms after launch, carrying
  // toolUseResult.status === 'async_launched'. That ACKs the launch — it does NOT mean the agent
  // finished (observed: an agent ACKed at 17:58:09 only really finished at 18:07:06). Counting it
  // as a completion marked every async subagent "stopped" on the spot, so long-running agents
  // never appeared under "Working Agents". Their real completion is the <task-notification> below.
  if (isAsyncLaunchAck(json)) {
    return;
  }

  // Antigravity completions carry tool_call_id; standalone Claude tool_result carries tool_use_id.
  if (json.type === 'TOOL_OUTPUT' && json.tool_call_id) {
    markStopped(currentSubagents, json.tool_call_id);
  }
  if (json.tool_use_id) {
    markStopped(currentSubagents, json.tool_use_id);
  }
  // Real Claude Code transcripts nest tool_result blocks inside message.content[] instead of
  // carrying tool_use_id at the top level — without this, subagents started via the nested
  // Agent tool_use path (detectClaudeCalls) never get marked stopped. Synchronous agents finish
  // here; async ones were already skipped above.
  if (json.message && Array.isArray(json.message.content)) {
    for (const block of json.message.content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        markStopped(currentSubagents, block.tool_use_id);
      }
    }
  }

  detectTaskNotificationCompletion(json, currentSubagents);
}

function isAsyncLaunchAck(json: LogEntry): boolean {
  // Match the launch status exactly: a finished async agent may still carry isAsync on its entry.
  return json.toolUseResult?.status === 'async_launched';
}

/** A backgrounded agent reports completion as a <task-notification> turn in the PARENT transcript,
 * carrying the <tool-use-id> of the Agent call that spawned it — the key subagents are stored under. */
function detectTaskNotificationCompletion(json: LogEntry, currentSubagents: Map<string, SubAgent>): void {
  const text = getEntryText(json);
  if (!text.includes('<task-notification>')) {
    return;
  }
  const match = text.match(/<tool-use-id>([^<]+)<\/tool-use-id>/);
  if (match) {
    markStopped(currentSubagents, match[1].trim());
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

function markStopped(currentSubagents: Map<string, SubAgent>, id: string): void {
  const sub = currentSubagents.get(id);
  if (sub) {
    sub.status = 'stopped';
  }
}
