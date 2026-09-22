import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectSubagents } from '../subagentDetector';
import { LogParser, LogEntry } from '../logParser';
import { refreshSessionStatuses } from '../sessionStatusRefresh';
import { SubAgent } from '../types';

/**
 * Sanitized minimal reproduction of the `system:agents_killed` shape (Claude Code 2.1.258+,
 * observed on session f03a74fb — see subagentCompletion.ts's detectAgentsKilled doc comment: a
 * background teammate launched around L464 never got its own completion; the kill line lands
 * around L1644). Line order:
 *   0 background teammate launch (Agent tool_use)         1 its teammate_spawned ACK
 *   2 foreground/synchronous Agent launch — no ACK of its own yet
 *   3 classic backgrounded Agent launch (Agent tool_use)   4 its async_launched ACK (not a teammate)
 *   5 a <forked-skill-launch> entry — background from launch, no ACK of its own
 *   6 `system:agents_killed` — carries only type/subtype/timestamp, ends every BACKGROUND agent
 *     still 'working' at once                              7 trailing assistant turn (realistic close)
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'agents-killed-background-and-foreground.jsonl');
const RAW = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean);
const LINES = RAW.map((l) => JSON.parse(l) as LogEntry);
const BACKGROUND = 'toolu_bg_1';
const FOREGROUND = 'toolu_fg_1';
const ASYNC_LAUNCHED = 'toolu_async_1';
const FORKED_SKILL = 'askill_1';
const KILLED_AT = Date.parse(LINES[6].timestamp!);

describe('detectAgentsKilled (system:agents_killed, real f03a74fb shape)', () => {
  it('stops a still-working BACKGROUND subagent, stamping stoppedAt to the kill timestamp', () => {
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES) detectSubagents(line, subagents);

    const bg = subagents.get(BACKGROUND);
    expect(bg?.status).toBe('stopped');
    expect(bg?.stoppedAt).toBe(KILLED_AT);
  });

  it('leaves a still-working FOREGROUND (synchronous) subagent alone — it never got a launch ACK', () => {
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES) detectSubagents(line, subagents);

    const fg = subagents.get(FOREGROUND);
    expect(fg?.status).toBe('working');
    expect(fg?.stoppedAt).toBeUndefined();
  });

  it('stops a still-working classic async_launched subagent (not a teammate)', () => {
    // Guards markBackground's async_launched branch specifically: a fixture with only the
    // teammate_spawned ACK (above) would stay green even if markBackground were narrowed to
    // 'teammate_spawned' only, since detectAgentsKilled's own condition never distinguishes why
    // isBackground is true.
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES) detectSubagents(line, subagents);

    const asyncAgent = subagents.get(ASYNC_LAUNCHED);
    expect(asyncAgent?.status).toBe('stopped');
    expect(asyncAgent?.stoppedAt).toBe(KILLED_AT);
  });

  it('stops a still-working <forked-skill-launch> subagent', () => {
    // Guards forkedSkillDetector.ts's `isBackground: true` at launch — dropping it would leave
    // this subagent's isBackground undefined, and detectAgentsKilled would skip it.
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES) detectSubagents(line, subagents);

    const forkedSkill = subagents.get(FORKED_SKILL);
    expect(forkedSkill?.status).toBe('stopped');
    expect(forkedSkill?.stoppedAt).toBe(KILLED_AT);
  });
});

describe('agents_killed and the whole session status', () => {
  // Isolates hasRunningAgents as the only variable: the foreground control (fixture line 2) is
  // deliberately left out of this file, or its still-'working' status would keep the session
  // 'working' regardless of whether the fix stops the background one — a different assertion than
  // "not held working by [the background agent]". Line 7 (a real, non-thinking assistant turn)
  // keeps lastEntryType off 'user' — the `agents_killed` line itself carries no `message` at all,
  // so trackTurnSignals leaves lastEntryType exactly as the teammate's ACK (line 1) turn set it
  // ('user') without this, which would independently force computeSessionStatus's awaitingReply
  // branch to 'working' and mask the very thing this test checks (same masking
  // subagentLiveness.realLogs.test.ts's own rewake suite warns about for its own last case).
  it('lets the session go stopped once its only working agent was a background one that got killed', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-killed-'));
    const filePath = path.join(tmp, 'session.jsonl');
    try {
      const content = [RAW[0], RAW[1], RAW[6], RAW[7]].join('\n') + '\n';
      fs.writeFileSync(filePath, content);
      fs.utimesSync(filePath, KILLED_AT / 1000, KILLED_AT / 1000);

      vi.useFakeTimers();
      // Past RECENT_WRITE (60s, sessionActivity.ts) so the "just wrote" heuristic doesn't mask the
      // result, well under IDLE_CEILING (30min) so the idle-timeout branch doesn't either.
      vi.setSystemTime(KILLED_AT + 5 * 60 * 1000);
      const session = new LogParser().parse(filePath, 'claude-code');
      refreshSessionStatuses([session], new Set());

      expect(session.subagents.find((s) => s.id === BACKGROUND)?.status).toBe('stopped');
      expect(session.status).not.toBe('working');
    } finally {
      vi.useRealTimers();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('agents_killed reaches a synchronous agent that was later resumed via SendMessage', () => {
  // A synchronously-launched Agent gets no ACK of its own until it completes, so it is never
  // marked `isBackground` at launch. Once it finishes and is later RESUMED via SendMessage, Claude
  // Code always re-runs it in the background (real ratio: 133 of 347 real resumes target a
  // sync-launched agent, all completing via <task-notification>, i.e. in the background) —
  // reactivateSubagent (subagentDetector.ts) must flag that itself, or a subsequent `agents_killed`
  // can never reach it (rewake can't recover it either, since stoppedAt is cleared on resume).
  function launchTurn(id: string): LogEntry {
    return {
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id, name: 'Agent', input: { name: 'sample-worker', description: 'Sample text' } },
        ],
      },
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
    // `input.to`/`input.message` aren't part of LogEntry's typed `input` shape and share no
    // property names with it, so a direct `as LogEntry` is rejected as "insufficient overlap" —
    // route through `unknown` first, same as production code does (mirrors subagentDetector.test.ts).
    return {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', id, name: 'SendMessage', input: { to, message: 'resume please' } }] },
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
        pin: { id: resumedAgentId, name: 'sample-worker', ref: '000000' },
      },
    } as LogEntry;
  }

  function agentsKilledTurn(timestamp: string): LogEntry {
    return { type: 'system', subtype: 'agents_killed', timestamp };
  }

  it('stops a synchronously-launched agent resumed via SendMessage when agents_killed fires', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(launchTurn('toolu_sync_1'), subagents);
    detectSubagents(completionTurn('toolu_sync_1'), subagents);
    detectSubagents(sendMessageTurn('toolu_resume_1', 'sample-worker'), subagents);
    detectSubagents(sendMessageAckTurn('toolu_resume_1', 'a_resumed_1'), subagents);
    expect(subagents.get('toolu_resume_1')?.status).toBe('working');

    detectSubagents(agentsKilledTurn('2026-08-01T10:05:00.000Z'), subagents);

    expect(subagents.get('toolu_resume_1')?.status).toBe('stopped');
  });
});
