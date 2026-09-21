import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectSubagents } from '../subagentDetector';
import { LogParser, LogEntry } from '../logParser';
import { refreshSessionStatuses } from '../sessionStatusRefresh';
import { SubAgent } from '../types';

/**
 * Synthetic scenarios (not derived from the captured fixture subagentLiveness.realLogs.test.ts
 * uses) added after code review found mutants that survived the liveness suite — each test below
 * exercises a mechanism that IS already correct today but had no test able to tell it apart from
 * a plausible regression. See each `it`'s comment for the specific mutant it kills.
 */
describe('in-process teammate SendMessage ACK shapes', () => {
  // Mirrors subagentDetector.test.ts's "in-process teammates" launch/idle helpers one directory up.
  function teammateLaunch(id: string, name: string): LogEntry {
    return {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id, name: 'Agent', input: { name, description: 'Delegate task', model: 'sonnet' } },
        ],
      },
    };
  }

  function teammateSpawnAck(id: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: id }] },
      toolUseResult: { status: 'teammate_spawned' },
    };
  }

  function teammateIdleMessage(name: string): LogEntry {
    return {
      type: 'user',
      message: {
        content:
          `Another Claude session sent a message:\n<teammate-message teammate_id="${name}" color="blue">\n` +
          `{"type":"idle_notification","from":"${name}","timestamp":"2026-09-02T03:50:22.101Z","idleReason":"available","result":"done"}\n</teammate-message>`,
      },
    };
  }

  function sendMessageTurn(id: string, to: string): LogEntry {
    return {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', id, name: 'SendMessage', input: { to, message: 'one more thing' } }] },
    } as unknown as LogEntry;
  }

  // Real shape (session f03a74fb, per subagentCompletion.ts's isSendMessageAck doc comment):
  // {success:true, message:"Message sent to <name>'s inbox", msg_id, routing:{content, sender,
  // summary, target, targetColor}} — no `pin` at all, unlike an Agent-tool subagent's ACK.
  function inboxSendMessageAckTurn(toolUseId: string, name: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId }] },
      toolUseResult: {
        success: true,
        message: `Message sent to ${name}'s inbox`,
        msg_id: 'msg_01abc',
        routing: { content: 'one more thing', sender: 'main', summary: 'follow-up', target: name, targetColor: 'blue' },
      },
    } as LogEntry;
  }

  it('stays working when a resumed teammate is ACKed with the inbox-delivery shape', () => {
    // Guards item (b) / isSendMessageAck's `routing` clause: drop it and this inbox shape (no
    // `pin`) falls through to the generic tool_result completion path and immediately re-stops
    // the teammate the optimistic re-key had just resumed.
    const subagents = new Map<string, SubAgent>();
    detectSubagents(teammateLaunch('toolu_tm_inbox_1', 'fb-inbox'), subagents);
    detectSubagents(teammateSpawnAck('toolu_tm_inbox_1'), subagents);
    detectSubagents(teammateIdleMessage('fb-inbox'), subagents);
    expect(subagents.get('toolu_tm_inbox_1')?.status).toBe('stopped');

    detectSubagents(sendMessageTurn('toolu_tm_resume_1', 'fb-inbox'), subagents);
    detectSubagents(inboxSendMessageAckTurn('toolu_tm_resume_1', 'fb-inbox'), subagents);

    expect(subagents.get('toolu_tm_resume_1')?.status).toBe('working');
  });
});

describe('a true resume long after a stop clears stoppedAt', () => {
  // Synthetic timestamps, driven through an ASYNC launch so agentId is filled by the
  // already-working async-ACK path (recordLaunchAgentId) rather than depending on item (a)'s
  // not-yet-landed sync-completion fix — this isolates reactivateSubagent's stoppedAt clear from
  // that unrelated, still-pending gap (see syncResumeColdParse.test.ts for that one).
  let tmp: string;
  let parentPath: string;
  const AGENT = 'aRESUME1';
  const LAUNCH = 'toolu_trueresume_launch';
  const SEND = 'toolu_trueresume_send';
  const SID = 'sess-true-resume';
  const T1 = Date.parse('2026-09-10T10:00:00.000Z');
  const iso = (ms: number): string => new Date(ms).toISOString();
  const parentLines = [
    {
      type: 'assistant',
      timestamp: iso(T1 - 120_000),
      message: { content: [{ type: 'tool_use', id: LAUNCH, name: 'Agent', input: { description: 'x' } }] },
    },
    {
      type: 'user',
      timestamp: iso(T1 - 60_000),
      message: { content: [{ type: 'tool_result', tool_use_id: LAUNCH }] },
      toolUseResult: { status: 'async_launched', agentId: AGENT },
    },
    {
      type: 'user',
      timestamp: iso(T1),
      message: {
        content: `<task-notification>\n<task-id>${AGENT}</task-id>\n<tool-use-id>${LAUNCH}</tool-use-id>\n<status>completed</status>\n</task-notification>`,
      },
    },
    {
      type: 'assistant',
      timestamp: iso(T1 + 60_000),
      message: { content: [{ type: 'tool_use', id: SEND, name: 'SendMessage', input: { to: AGENT, message: 'go' } }] },
    },
    {
      type: 'user',
      timestamp: iso(T1 + 60_100),
      message: { content: [{ type: 'tool_result', tool_use_id: SEND }] },
      toolUseResult: {
        success: true,
        message: 'resumed',
        resumedAgentId: AGENT,
        pin: { id: AGENT, name: AGENT, ref: 'x' },
      },
    },
  ];

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'true-resume-'));
    const subagentsDir = path.join(tmp, 'proj', SID, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(subagentsDir, `agent-${AGENT}.meta.json`),
      JSON.stringify({ agentType: 'backend-specialist', toolUseId: LAUNCH, model: 'sonnet' }),
    );
    const transcript = path.join(subagentsDir, `agent-${AGENT}.jsonl`);
    fs.writeFileSync(transcript, '{}\n');
    fs.utimesSync(transcript, T1 / 1000, T1 / 1000); // never written again after the original stop
    parentPath = path.join(tmp, 'proj', `${SID}.jsonl`);
    fs.writeFileSync(parentPath, parentLines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('does not flip a genuinely resumed subagent back to stopped an hour later', () => {
    // Kills dropping `sub.stoppedAt = undefined` from reactivateSubagent: collectRewakeCandidates
    // only requires agentId + a defined stoppedAt (it does not check status), so a resumed
    // subagent whose stoppedAt is never cleared is STILL a rewake candidate on the next tick —
    // and since its own transcript was never touched again after the original stop, that tick
    // reads it as stale and overwrites the correct 'working' with 'stopped'. Passes today.
    const session = new LogParser(tmp).parse(parentPath, 'claude-code');
    expect(session.subagents.find((s) => s.agentId === AGENT)?.status).toBe('working');

    vi.setSystemTime(T1 + 60 * 60 * 1000); // 1h after the original stop
    refreshSessionStatuses([session], new Set());

    expect(session.subagents.find((s) => s.agentId === AGENT)?.status).toBe('working');
  });
});
