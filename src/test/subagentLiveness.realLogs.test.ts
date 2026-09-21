import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectSubagents } from '../subagentDetector';
import { LogParser, LogEntry } from '../logParser';
import { refreshSessionStatuses } from '../sessionStatusRefresh';
import { IDLE_CEILING } from '../sessionActivity';
import { SubAgent } from '../types';

/**
 * Sanitized capture of a real Claude Code 2.1.278 parent transcript (session a6e83be2…, every
 * free-form text/path/branch replaced with a placeholder, message.usage dropped — see
 * logParser.realLogs.test.ts's header for the same convention). Line order:
 *   0 Agent launch A (backend-specialist)   1 async_launched ACK A (agentId a6bcce…)
 *   2 Agent launch B (test-engineer)        3 async_launched ACK B (agentId a836df…)
 *   4 <task-notification> B #1 (task-id + launch tool-use-id)
 *   5 SendMessage to=<A's agentId> while A is still running
 *   6 its ACK {success:true, message:"Message queued for delivery…", pin} — no resumedAgentId
 *   7 <task-notification> A (task-id + LAUNCH tool-use-id)
 *   8 <task-notification> B #2 (task-id only — B restarted after its own #1 completion)
 *
 * Guards two real bugs found on this capture (both read a still-running subagent as completed):
 *
 * 1. SendMessage to a still-running subagent was read as ITS completion. Claude Code's queued-
 *    delivery ACK (line 6) carries no `resumedAgentId`, unlike a real resume ACK, but
 *    detectSendMessageResume re-keyed the entry to the SendMessage's own tool_use id regardless of
 *    the target's current status, and the generic tool_result completion path then stopped it —
 *    even though A kept running for minutes afterward (line 7 is its real completion, and it
 *    carries the ORIGINAL launch id, not the SendMessage's).
 * 2. A subagent that restarts after its own completion notification (woken again inside its own
 *    transcript) gets no second start signal in the PARENT transcript — only a later
 *    <task-notification> with <task-id> alone (line 8). Only its own agent-<id>.jsonl mtime proves
 *    it is running again.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'sendmessage-to-running-and-rewake.jsonl');
const RAW = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean);
const LINES = RAW.map((l) => JSON.parse(l) as LogEntry & { timestamp: string });
const SID = 'a6e83be2-bbd1-4bb4-a9bd-543edf7536eb';
const A = { launch: 'toolu_01NA2FNeubJ8Lez5uezKP7Gu', agentId: 'a6bcce997121672ee' };
const B = { launch: 'toolu_01VuuepNTfsSu1RXNsFGqhd8', agentId: 'a836df3039647612a' };
const byAgentId = (subagents: Iterable<SubAgent>, agentId: string): SubAgent | undefined =>
  [...subagents].find((s) => s.agentId === agentId);

describe('SendMessage to a still-running subagent (real 2.1.278 capture)', () => {
  it('keeps it working through the mid-run message and its "queued" ACK', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(LINES[0], subagents);
    detectSubagents(LINES[1], subagents);
    // In a live session the sidecar join has already filled agentId, minutes before the
    // SendMessage lands — set directly here since this test isolates detectSubagents from the
    // sidecar-driven enrichment path (covered separately by subagentMetadata.test.ts).
    subagents.get(A.launch)!.agentId = A.agentId;

    detectSubagents(LINES[5], subagents);
    detectSubagents(LINES[6], subagents);

    expect(subagents.get(A.launch)?.status).toBe('working');
  });

  it('completes it on its real notification, which carries the ORIGINAL launch tool-use-id', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(LINES[0], subagents);
    detectSubagents(LINES[1], subagents);
    subagents.get(A.launch)!.agentId = A.agentId;
    for (const i of [5, 6, 7]) detectSubagents(LINES[i], subagents);

    expect(subagents.get(A.launch)?.status).toBe('stopped');
  });
});

describe('SendMessage to an already-stopped subagent (resume attempt outcomes)', () => {
  // Not from the captured fixture (the 9-line capture never fails a send) — a synthetic control
  // mirroring Claude Code's documented failure ACK shape for SendMessage: {success:false, message,
  // display}, no `pin` and no `resumedAgentId`. Guards against the still-running fix above being
  // widened so far it also swallows a genuine failed-resume ACK, which must still resolve the
  // subagent back to 'stopped' instead of leaving it stuck 'working' from the optimistic re-key a
  // resume attempt does on send (mirrors subagentDetector.test.ts's own "SendMessage resume"
  // helpers one directory up).
  function classicCompletionTurn(toolUseId: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId }] },
      toolUseResult: { status: 'completed' },
    };
  }

  function sendMessageTurn(id: string, to: string): LogEntry {
    return {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', id, name: 'SendMessage', input: { to, message: 'resume please' } }] },
    } as unknown as LogEntry;
  }

  function failedSendMessageAckTurn(toolUseId: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId }] },
      toolUseResult: {
        success: false,
        message: 'Agent not found or no longer available.',
        display: 'Failed to deliver message.',
      },
    } as LogEntry;
  }

  it('leaves it stopped when the resume attempt fails', () => {
    const subagents = new Map<string, SubAgent>();
    detectSubagents(LINES[0], subagents);
    detectSubagents(LINES[1], subagents);
    subagents.get(A.launch)!.agentId = A.agentId;
    // A genuinely finishes on its own — no SendMessage involved yet, unlike the block above.
    detectSubagents(classicCompletionTurn(A.launch), subagents);
    expect(subagents.get(A.launch)?.status).toBe('stopped');

    detectSubagents(sendMessageTurn('toolu_resume_fail_1', A.agentId), subagents);
    detectSubagents(failedSendMessageAckTurn('toolu_resume_fail_1'), subagents);

    expect(subagents.get('toolu_resume_fail_1')?.status).toBe('stopped');
  });

  function queuedSendMessageAckTurn(toolUseId: string, agentId: string): LogEntry {
    return {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: toolUseId }] },
      toolUseResult: {
        success: true,
        message: `Message queued for delivery to ${agentId} at its next tool round.`,
        pin: { id: agentId, name: agentId, ref: 'a2b0f5' },
      },
    } as LogEntry;
  }

  it('flips to working when a resume attempt is only ACKed as queued, not confirmed resumed', () => {
    // Guards the `pin` clause in isSendMessageResumeAck: drop it and this ACK (no resumedAgentId)
    // falls through to the generic tool_result completion path, immediately re-stopping the
    // subagent the optimistic re-key in reactivateSubagent had just marked 'working'.
    const subagents = new Map<string, SubAgent>();
    detectSubagents(LINES[0], subagents);
    detectSubagents(LINES[1], subagents);
    subagents.get(A.launch)!.agentId = A.agentId;
    detectSubagents(classicCompletionTurn(A.launch), subagents);
    expect(subagents.get(A.launch)?.status).toBe('stopped');

    detectSubagents(sendMessageTurn('toolu_resume_queued_1', A.agentId), subagents);
    detectSubagents(queuedSendMessageAckTurn('toolu_resume_queued_1', A.agentId), subagents);

    expect(subagents.get('toolu_resume_queued_1')?.status).toBe('working');
  });
});

describe('subagent re-woken after its completion notification (real 2.1.278 capture)', () => {
  let tmp: string;
  let transcriptPath: string;
  let parentPath: string;
  const firstDone = Date.parse(LINES[4].timestamp);
  const touch = (t: number): void => {
    fs.utimesSync(transcriptPath, t / 1000, t / 1000);
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-rewake-'));
    // Encoded project dir Claude Code would derive from the fixture's own cwd
    // (/Users/dev/Projects/acme/acme-app) — see sidecarReader.ts's encodeProjectDir.
    const projectDir = path.join(tmp, '-Users-dev-Projects-acme-acme-app');
    const subagentsDir = path.join(projectDir, SID, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(subagentsDir, `agent-${B.agentId}.meta.json`),
      JSON.stringify({
        agentType: 'test-engineer',
        description: 'Sample',
        toolUseId: B.launch,
        spawnDepth: 1,
        model: 'sonnet',
      }),
    );
    transcriptPath = path.join(subagentsDir, `agent-${B.agentId}.jsonl`);
    fs.writeFileSync(transcriptPath, '{}\n');
    parentPath = path.join(projectDir, `${SID}.jsonl`);
    fs.writeFileSync(parentPath, [RAW[2], RAW[3], RAW[4]].join('\n') + '\n');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // A fresh LogParser by default: each assertion below drives its own cold parse of `tmp`
  // (matching candidateMetadataDirs' `claudeProjectsPath` expectation) plus one refresh tick.
  function parseAndTick(parser = new LogParser(tmp)): SubAgent | undefined {
    const session = parser.parse(parentPath, 'claude-code');
    refreshSessionStatuses([session], new Set());
    return byAgentId(session.subagents, B.agentId);
  }

  it('shows it working while its own transcript keeps being written after the completion', () => {
    touch(firstDone + 60_000);
    vi.setSystemTime(firstDone + 90_000);
    expect(parseAndTick()?.status).toBe('working');
  });

  it('keeps it stopped when its transcript was last written within the slack of the completion', () => {
    touch(firstDone + 1_000);
    vi.setSystemTime(firstDone + 90_000);
    expect(parseAndTick()?.status).toBe('stopped');
  });

  it('falls back to stopped once the re-woken transcript is silent past IDLE_CEILING', () => {
    touch(firstDone + 60_000);
    vi.setSystemTime(firstDone + 60_000 + IDLE_CEILING + 60_000);
    expect(parseAndTick()?.status).toBe('stopped');
  });

  it('is stopped for good by the later <task-id>-only notification, even on a cold parse', () => {
    const secondDone = Date.parse(LINES[8].timestamp);
    fs.appendFileSync(parentPath, RAW[8] + '\n');
    touch(secondDone);
    vi.setSystemTime(secondDone + 30_000);
    // A single fresh parser reads lines 2-4 and 8 in one batch — needs agentId to already be set
    // from the launch ACK within that same pass (not just via the end-of-batch sidecar join) for
    // the <task-id>-only fallback to resolve B and re-affirm its final stop.
    expect(parseAndTick()?.status).toBe('stopped');
  });

  it('flips back to stopped on a later tick past IDLE_CEILING — not just to working once', () => {
    // Kills the `if (rewoken) sub.status = 'working'`-only mutant: the real assignment is an
    // unconditional ternary, so a later tick must be able to flip a rewoken subagent BACK to
    // 'stopped' too. Every other rewake test here uses a fresh cold parse per assertion, which
    // can't tell the ternary apart from the one-directional if — this one reuses a SINGLE parser
    // and session across two ticks.
    const parser = new LogParser(tmp);
    const session = parser.parse(parentPath, 'claude-code');
    touch(firstDone + 60_000);

    vi.setSystemTime(firstDone + 90_000);
    refreshSessionStatuses([session], new Set());
    expect(byAgentId(session.subagents, B.agentId)?.status).toBe('working');

    vi.setSystemTime(firstDone + 60_000 + IDLE_CEILING + 60_000);
    refreshSessionStatuses([session], new Set());
    expect(byAgentId(session.subagents, B.agentId)?.status).toBe('stopped');
  });

  it("flips the session's own status to 'working' too, not just the subagent's", () => {
    // Kills reordering computeSessionStatus BEFORE the rewake check in refreshSessionStatuses:
    // its hasRunningAgents read is session.subagents.some(...), so it must run AFTER
    // refreshRewokenSubagents flips one back to 'working' on this same tick, or it under-reports
    // the whole session as 'stopped' for one more cycle.
    //
    // The shared parent transcript's last line (line 4, the <task-notification>) is a
    // `type:'user'` turn, which computeSessionStatus's own awaitingReply branch
    // (sessionActivity.ts) already reads as 'working' regardless of subagent status — masking
    // the very reorder this test exists to guard against (confirmed: the mutant survives without
    // this). A synthetic completed assistant turn (plain text, not thinking-only) is appended
    // here so the ONLY path left to 'working' is hasRunningAgents, and the parent transcript's
    // mtime is pinned old so the recent-write heuristic can't independently mask this either.
    const finalTurnAt = firstDone + 5_000;
    fs.appendFileSync(
      parentPath,
      JSON.stringify({
        type: 'assistant',
        timestamp: new Date(finalTurnAt).toISOString(),
        sessionId: SID,
        isSidechain: false,
        message: { role: 'assistant', content: [{ type: 'text', text: 'Sample text final' }], stop_reason: 'end_turn' },
      }) + '\n',
    );
    fs.utimesSync(parentPath, finalTurnAt / 1000, finalTurnAt / 1000);

    // Without a rewake, the session must read 'stopped' — proves hasRunningAgents alone controls
    // the outcome below, now that awaitingReply/isThinking/apiError are all neutralized.
    touch(firstDone + 1_000);
    vi.setSystemTime(finalTurnAt + 90_000);
    const before = new LogParser(tmp).parse(parentPath, 'claude-code');
    refreshSessionStatuses([before], new Set());
    expect(byAgentId(before.subagents, B.agentId)?.status).toBe('stopped');
    expect(before.status).toBe('stopped');

    // With the rewake, both the subagent and the session flip to 'working'.
    touch(firstDone + 60_000);
    vi.setSystemTime(finalTurnAt + 90_000);
    const session = new LogParser(tmp).parse(parentPath, 'claude-code');
    refreshSessionStatuses([session], new Set());

    expect(byAgentId(session.subagents, B.agentId)?.status).toBe('working');
    expect(session.status).toBe('working');
  });

  it('does not rewake on ordinary write-latency jitter (mtime +10s — real delays measure 6-9s)', () => {
    // Kills reverting REWAKE_SLACK_MS from 30s back to 5s (item c): a +10s gap is ordinary write
    // latency, not a restart, and must not trigger a rewake.
    touch(firstDone + 10_000);
    vi.setSystemTime(firstDone + 40_000);
    expect(parseAndTick()?.status).toBe('stopped');
  });

  it('skips a rewake check once stoppedAt is older than 24h, even with a fresh write', () => {
    // Kills dropping REWAKE_HORIZON_MS (item d): without it, a fresh write alone reads as a
    // rewake no matter how long ago the subagent actually stopped.
    const freshWrite = firstDone + 25 * 60 * 60 * 1000; // 25h after the original stop
    touch(freshWrite);
    vi.setSystemTime(freshWrite + 30_000);
    expect(parseAndTick()?.status).toBe('stopped');
  });

  it('resolves to stopped when its transcript disappears after a rewake, instead of keeping the last status', () => {
    // Kills reverting the missing-transcript branch (item e) to a bare `continue`: that would
    // just skip the candidate, leaving whatever status the PRIOR tick set — so a subagent rewoken
    // once and then cleaned up would stay stuck 'working' forever. Needs two ticks on the SAME
    // session: the first rewakes it while the transcript still exists, the second observes it
    // after the transcript is deleted (the sidecar .meta.json stays put).
    touch(firstDone + 60_000);
    vi.setSystemTime(firstDone + 90_000);
    const parser = new LogParser(tmp);
    const session = parser.parse(parentPath, 'claude-code');
    refreshSessionStatuses([session], new Set());
    expect(byAgentId(session.subagents, B.agentId)?.status).toBe('working');

    fs.rmSync(transcriptPath);
    vi.setSystemTime(firstDone + 120_000);
    refreshSessionStatuses([session], new Set());

    expect(byAgentId(session.subagents, B.agentId)?.status).toBe('stopped');
  });
});
