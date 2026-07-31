import { describe, it, expect } from 'vitest';
import { detectSubagents } from '../subagentDetector';
import { SubAgent } from '../types';
import { LogEntry } from '../logParser';

/**
 * Real transcript evidence (a northwind-app session log — see subagentDetector.ts's
 * detectSendMessageResume doc comment): SendMessage({to, message}) can resume a subagent that
 * already reported completion. Fixtures below mirror the real shapes observed for each step.
 * `as LogEntry` is used where a fixture needs a field (`input.to`, `toolUseResult.resumedAgentId`)
 * that is real but not part of LogEntry's necessarily-partial typed shape (per transcriptEntry.ts's
 * own doc comment: "every field is optional because shapes vary by tool, version, and entry type").
 */
describe('detectSubagents — SendMessage resume', () => {
  function launchTurn(id: string, name: string): LogEntry {
    return {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', id, name: 'Agent', input: { name, description: 'Delegate task' } }] },
    };
  }

  // No `input.name` — mirrors a real launch that never set one (confirmed against real sidecars:
  // only 2 of 4 launches in one session passed `name`). SubAgent.name stays the 'Agent'
  // placeholder, so a resume can only match by agentId.
  function launchTurnNoName(id: string): LogEntry {
    return {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', id, name: 'Agent', input: { description: 'Delegate task' } }] },
    };
  }

  function completionTurn(toolUseId: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId }] },
      toolUseResult: { status: 'completed' },
    };
  }

  function sendMessageTurn(id: string, to: string): LogEntry {
    // `input.to`/`input.message` aren't part of LogEntry's typed `input` shape (see the file-level
    // comment) and share no property names with it, so a direct `as LogEntry` is rejected as
    // "insufficient overlap" — route through `unknown` first, same as production code does.
    return {
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id, name: 'SendMessage', input: { to, message: 'resume please' } }],
      },
    } as unknown as LogEntry;
  }

  function sendMessageAckTurn(toolUseId: string, resumedAgentId: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId }] },
      toolUseResult: {
        success: true,
        message: 'Agent had no active task; resumed from transcript in the background',
        resumedAgentId,
        pin: { id: resumedAgentId, name: 'regression-logic', ref: '5c75c6' },
      },
    } as LogEntry;
  }

  function taskNotificationTurn(toolUseId: string): LogEntry {
    return {
      type: 'user',
      message: {
        content: `<task-notification>\n<task-id>ae9f0a218b203f23b</task-id>\n<tool-use-id>${toolUseId}</tool-use-id>\n<status>completed</status>\n</task-notification>`,
      },
    };
  }

  it('marks the subagent working again when SendMessage resumes it after completion', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurn('toolu_launch_1', 'regression-logic'), subagents);
    detectSubagents(completionTurn('toolu_launch_1'), subagents);
    expect(subagents.get('toolu_launch_1')?.status).toBe('stopped');

    detectSubagents(sendMessageTurn('toolu_resume_1', 'regression-logic'), subagents);

    expect(subagents.has('toolu_launch_1')).toBe(false); // re-keyed away from the old launch id
    expect(subagents.size).toBe(1);
    const resumed = subagents.get('toolu_resume_1');
    expect(resumed?.status).toBe('working');
    expect(resumed?.name).toBe('regression-logic');
    expect(resumed?.launchId).toBe('toolu_launch_1'); // preserved so subagentMetadata's sidecar join keeps matching
  });

  it('does not mark the subagent stopped on the immediate SendMessage resume ACK', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurn('toolu_launch_1', 'regression-logic'), subagents);
    detectSubagents(completionTurn('toolu_launch_1'), subagents);
    detectSubagents(sendMessageTurn('toolu_resume_1', 'regression-logic'), subagents);

    detectSubagents(sendMessageAckTurn('toolu_resume_1', 'ae9f0a218b203f23b'), subagents);

    expect(subagents.get('toolu_resume_1')?.status).toBe('working');
  });

  it('marks the subagent stopped when the task-notification carries the SendMessage tool-use id', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurn('toolu_launch_1', 'regression-logic'), subagents);
    detectSubagents(completionTurn('toolu_launch_1'), subagents);
    detectSubagents(sendMessageTurn('toolu_resume_1', 'regression-logic'), subagents);
    detectSubagents(sendMessageAckTurn('toolu_resume_1', 'ae9f0a218b203f23b'), subagents);

    detectSubagents(taskNotificationTurn('toolu_resume_1'), subagents);

    expect(subagents.get('toolu_resume_1')?.status).toBe('stopped');
  });

  it('is a no-op when SendMessage targets an unknown agent', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurn('toolu_launch_1', 'regression-logic'), subagents);

    detectSubagents(sendMessageTurn('toolu_resume_1', 'some-other-agent'), subagents);

    expect(subagents.size).toBe(1);
    expect(subagents.has('toolu_resume_1')).toBe(false);
    expect(subagents.get('toolu_launch_1')?.status).toBe('working');
  });

  it('resumes by agentId when the launch never set a name', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurnNoName('toolu_launch_1'), subagents);
    detectSubagents(completionTurn('toolu_launch_1'), subagents);
    // Simulates enrichSubagentMetadata() (subagentMetadata.ts) having already run and populated
    // agentId from the sidecar filename — that's the real-world source, out of scope here.
    const launched = subagents.get('toolu_launch_1');
    expect(launched).toBeDefined();
    launched!.agentId = 'ad2d7960e4bd708a3a';

    detectSubagents(sendMessageTurn('toolu_resume_1', 'ad2d7960e4bd708a3a'), subagents);

    expect(subagents.has('toolu_launch_1')).toBe(false);
    const resumed = subagents.get('toolu_resume_1');
    expect(resumed?.status).toBe('working');
    expect(resumed?.agentId).toBe('ad2d7960e4bd708a3a');
  });

  it('keeps launchId pointing at the original launch across a second resume', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurn('toolu_launch_1', 'regression-logic'), subagents);
    detectSubagents(completionTurn('toolu_launch_1'), subagents);
    detectSubagents(sendMessageTurn('toolu_resume_1', 'regression-logic'), subagents);
    detectSubagents(sendMessageAckTurn('toolu_resume_1', 'ae9f0a218b203f23b'), subagents);
    detectSubagents(taskNotificationTurn('toolu_resume_1'), subagents);
    expect(subagents.get('toolu_resume_1')?.status).toBe('stopped');

    detectSubagents(sendMessageTurn('toolu_resume_2', 'regression-logic'), subagents);

    expect(subagents.has('toolu_resume_1')).toBe(false);
    const resumedAgain = subagents.get('toolu_resume_2');
    expect(resumedAgain?.status).toBe('working');
    expect(resumedAgain?.launchId).toBe('toolu_launch_1');
  });
});
