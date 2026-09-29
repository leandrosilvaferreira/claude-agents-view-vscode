import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectSubagents } from '../subagentDetector';
import { LogParser, LogEntry } from '../logParser';
import { computeSessionStatus } from '../sessionActivity';
import { refreshNestedSubagents } from '../nestedSubagents';
import { refreshSessionStatuses } from '../sessionStatusRefresh';
import { splitSubagentsByStatus } from '../subagentGrouping';
import { Session, SubAgent } from '../types';

/**
 * Sanitized minimal reproduction of a session whose Claude Code process exited while background
 * work was still running — the shape behind the "ghost duplicate" rows seen after the 2.1.283 ->
 * 2.1.284 auto-update restart (2026-09-28): the old session's file was never written again, but its
 * launches had no completion, so the tree kept it 'working' next to its own successor. Real
 * transcripts end with the CLI's shutdown snapshot — a `last-prompt` bookkeeping line and then
 * `{"type":"cost-state",…}` (no `timestamp`, no `message`). Line order:
 *   0 background Agent launch    1 its async_launched ACK    2 synchronous Agent launch (no ACK)
 *   3 system:stop_hook_summary   4 last-prompt               5 cost-state — the shutdown marker
 *   6 a later assistant turn — only used by the "session resumed" cases
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'session-shutdown-marker.jsonl');
const RAW = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean);
const LINES = RAW.map((l) => JSON.parse(l) as LogEntry);
const BACKGROUND = 'toolu_sd_bg';
const FOREGROUND = 'toolu_sd_fg';
const SHUTDOWN_AT = Date.parse(LINES[3].timestamp!);

/** Parses `lines` from a real temp file whose mtime is pinned to `mtimeMs`, at the fake `nowMs`. */
function parseAt(lines: string[], mtimeMs: number, nowMs: number): Session {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'session-shutdown-'));
  const filePath = path.join(tmp, 'session.jsonl');
  try {
    fs.writeFileSync(filePath, lines.join('\n') + '\n');
    fs.utimesSync(filePath, mtimeMs / 1000, mtimeMs / 1000);
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);
    return new LogParser().parse(filePath, 'claude-code');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('shutdown marker (`cost-state`) on the subagents', () => {
  it('stops every still-working subagent — the synchronous one too, nothing survives its host process', () => {
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES.slice(0, 6)) detectSubagents(line, subagents);

    expect(subagents.get(BACKGROUND)?.status).toBe('stopped');
    expect(subagents.get(FOREGROUND)?.status).toBe('stopped');
  });

  it('leaves stoppedAt unset so subagentRewake never re-wakes a subagent whose process is gone', () => {
    // The `cost-state` line carries no timestamp, and a re-wake needs a `stoppedAt` to compare its
    // own transcript against — no stamp, no candidate.
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES.slice(0, 6)) detectSubagents(line, subagents);

    expect(subagents.get(BACKGROUND)?.stoppedAt).toBeUndefined();
    expect(subagents.get(FOREGROUND)?.stoppedAt).toBeUndefined();
  });

  it('does not touch the subagents before the marker lands', () => {
    const subagents = new Map<string, SubAgent>();
    for (const line of LINES.slice(0, 5)) detectSubagents(line, subagents);

    expect(subagents.get(BACKGROUND)?.status).toBe('working');
    expect(subagents.get(FOREGROUND)?.status).toBe('working');
  });
});

describe('shutdown marker (`cost-state`) on the session', () => {
  it('flags the session once the marker is the last thing the CLI wrote', () => {
    try {
      const session = parseAt(RAW.slice(0, 6), SHUTDOWN_AT, SHUTDOWN_AT + 5 * 60 * 1000);
      expect(session.shutdownRecorded).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the flag through trailing bookkeeping — attachments carry no message', () => {
    try {
      const trailing = JSON.stringify({ type: 'attachment', timestamp: '2026-09-28T23:12:53.000Z' });
      const session = parseAt([...RAW.slice(0, 6), trailing], SHUTDOWN_AT, SHUTDOWN_AT + 5 * 60 * 1000);
      expect(session.shutdownRecorded).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the flag when a real turn follows — the session was resumed', () => {
    // Same latch-that-self-clears shape as lastEntryIsApiError / lastEntryIsInterruption
    // (turnSignals.ts): a flag that only ever turned on would pin a resumed session to 'stopped'.
    try {
      const session = parseAt(RAW, SHUTDOWN_AT + 8 * 60 * 1000, SHUTDOWN_AT + 9 * 60 * 1000);
      expect(session.shutdownRecorded).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps subagents that died with the old process stopped after the session resumes', () => {
    try {
      const session = parseAt(RAW, SHUTDOWN_AT + 8 * 60 * 1000, SHUTDOWN_AT + 9 * 60 * 1000);
      expect(session.subagents.map((s) => s.status)).toEqual(['stopped', 'stopped']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a sidechain marker — a subagent transcript interleaved into the parent is not the parent exiting', () => {
    try {
      const sidechain = JSON.stringify({ ...LINES[5], isSidechain: true });
      const session = parseAt([...RAW.slice(0, 5), sidechain], SHUTDOWN_AT, SHUTDOWN_AT + 5 * 60 * 1000);
      expect(session.shutdownRecorded).toBe(false);
      expect(session.subagents.map((s) => s.status)).toEqual(['working', 'working']);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('a shut-down session never reads as working', () => {
  it('is stopped right after the marker, inside the "just wrote" window (RECENT_WRITE)', () => {
    // The marker is itself a fresh write, so without the flag the "modified in the last 60s"
    // heuristic reads the just-exited session as 'working' for a minute. The control (no marker,
    // same mtime, same clock) pins that the flag — not the timing — is what flips the result.
    try {
      const now = SHUTDOWN_AT + 10 * 1000;
      const shutDown = parseAt(RAW.slice(0, 6), SHUTDOWN_AT, now);
      const control = parseAt(RAW.slice(0, 4), SHUTDOWN_AT, now);
      expect(computeSessionStatus(control, new Set())).toBe('working');
      expect(computeSessionStatus(shutDown, new Set())).toBe('stopped');
    } finally {
      vi.useRealTimers();
    }
  });

  it('is stopped even when the last real turn was a user prompt Claude still owed a reply to', () => {
    // Killed mid-turn: awaitingReply would hold the session 'working' for up to IDLE_CEILING.
    try {
      const prompt = JSON.stringify({
        type: 'user',
        message: { role: 'user', content: 'Sample text 5' },
        timestamp: '2026-09-28T23:12:50.000Z',
      });
      const now = SHUTDOWN_AT + 5 * 60 * 1000;
      const shutDown = parseAt([prompt, RAW[4], RAW[5]], SHUTDOWN_AT, now);
      const control = parseAt([prompt], SHUTDOWN_AT, now);
      expect(computeSessionStatus(control, new Set())).toBe('working');
      expect(computeSessionStatus(shutDown, new Set())).toBe('stopped');
    } finally {
      vi.useRealTimers();
    }
  });

  it('still trusts lsof: a transcript held open is alive regardless of the marker', () => {
    try {
      const session = parseAt(RAW.slice(0, 6), SHUTDOWN_AT, SHUTDOWN_AT + 5 * 60 * 1000);
      expect(computeSessionStatus(session, new Set([path.normalize(session.logFilePath)]))).toBe('working');
    } finally {
      vi.useRealTimers();
    }
  });

  it('empties the Working Agents group end to end: no ghost session, no ghost agents', () => {
    // The screenshot's exact symptom, replayed through the per-tick refresh the tree uses.
    try {
      const session = parseAt(RAW.slice(0, 6), SHUTDOWN_AT, SHUTDOWN_AT + 25 * 60 * 1000);
      refreshSessionStatuses([session], new Set());

      const { working, completed } = splitSubagentsByStatus(session, []);
      expect(session.status).toBe('stopped');
      expect(working).toHaveLength(0);
      expect(completed).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('a shut-down session and its grandchildren', () => {
  // Grandchildren only exist as a per-tick sidecar join with an mtime-based status (nestedSubagents.ts's
  // computeChildStatus): a child whose transcript was written a moment before the exit reads 'working'
  // for up to IDLE_CEILING — a ghost no parse-time stop can reach, since the parent transcript never
  // mentions it.
  function sessionWithFreshGrandchild(endedWithSession: boolean): { session: Session; cleanup: () => void } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-shutdown-nested-'));
    const sessionId = 'shutdown-session-id';
    const subagentsDir = path.join(root, '-Users-dev-Projetos-demo', sessionId, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(subagentsDir, 'agent-child-1.meta.json'),
      JSON.stringify({ agentType: 'Explore', description: 'Sample text', parentAgentId: 'parent-agent-1' }),
    );
    fs.writeFileSync(path.join(subagentsDir, 'agent-child-1.jsonl'), '{}\n'); // written just now
    const parent: SubAgent = {
      id: 'toolu_parent1',
      agentId: 'parent-agent-1',
      name: 'Agent',
      task: 'Sample text',
      status: 'stopped',
      endedWithSession,
    };
    const session: Session = {
      id: sessionId,
      projectHash: 'hash',
      projectPath: '/Users/dev/Projetos/demo',
      projectName: 'demo',
      gitBranch: 'main',
      status: 'stopped',
      lastInteractionTime: Date.now(),
      subagents: [parent],
      logFilePath: path.join(root, '-Users-dev-Projetos-demo', `${sessionId}.jsonl`),
      type: 'claude-code',
    };
    return {
      session,
      cleanup: () => {
        fs.rmSync(root, { recursive: true, force: true });
      },
    };
  }

  it('reads a freshly written grandchild as working while the session is alive (control)', () => {
    const { session, cleanup } = sessionWithFreshGrandchild(false);
    try {
      refreshNestedSubagents(session);
      expect(session.subagents[0].children?.[0].status).toBe('working');
    } finally {
      cleanup();
    }
  });

  it('stops that same grandchild once the session has shut down', () => {
    const { session, cleanup } = sessionWithFreshGrandchild(true);
    try {
      refreshNestedSubagents(session);
      expect(session.subagents[0].children?.[0].status).toBe('stopped');
    } finally {
      cleanup();
    }
  });
});

describe('a shut-down session and a subagent that had already reported completion', () => {
  // A finished subagent stays a re-wake candidate for 24h (subagentRewake.ts): its own transcript
  // written after the completion notification proves it "quietly resumed". Once the process is
  // gone that evidence is a fossil — its last write is at most seconds before the exit — but a
  // write within IDLE_CEILING of now still passes the check, so without clearing `stoppedAt` the
  // finished agent would flip back to 'working' inside a dead session.
  const SID = '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50';
  const DONE_AT = Date.parse('2026-09-28T23:10:30.000Z');
  const completion = JSON.stringify({
    type: 'user',
    message: {
      role: 'user',
      content: `<task-notification>\n<tool-use-id>${BACKGROUND}</tool-use-id>\n<status>completed</status>\n</task-notification>`,
    },
    timestamp: '2026-09-28T23:10:30.000Z',
  });

  function tickAfterCompletion(parentLines: string[]): SubAgent | undefined {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'session-shutdown-rewake-'));
    try {
      const projectDir = path.join(tmp, '-Users-dev-Projects-acme-acme-app');
      const subagentsDir = path.join(projectDir, SID, 'subagents');
      fs.mkdirSync(subagentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(subagentsDir, 'agent-asample01.meta.json'),
        JSON.stringify({ agentType: 'Explore', description: 'Sample text', toolUseId: BACKGROUND }),
      );
      const transcript = path.join(subagentsDir, 'agent-asample01.jsonl');
      fs.writeFileSync(transcript, '{}\n');
      fs.utimesSync(transcript, (DONE_AT + 60_000) / 1000, (DONE_AT + 60_000) / 1000); // written after completion
      const parent = path.join(projectDir, `${SID}.jsonl`);
      fs.writeFileSync(parent, parentLines.join('\n') + '\n');
      fs.utimesSync(parent, (DONE_AT + 10_000) / 1000, (DONE_AT + 10_000) / 1000);

      vi.useFakeTimers();
      vi.setSystemTime(DONE_AT + 90_000);
      const session = new LogParser(tmp).parse(parent, 'claude-code');
      refreshSessionStatuses([session], new Set());
      return session.subagents.find((s) => s.id === BACKGROUND);
    } finally {
      vi.useRealTimers();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  it('re-wakes it while the process is alive (control: the setup does trigger a re-wake)', () => {
    expect(tickAfterCompletion([RAW[0], RAW[1], completion])?.status).toBe('working');
  });

  it('keeps it stopped once the shutdown marker landed', () => {
    expect(tickAfterCompletion([RAW[0], RAW[1], completion, RAW[4], RAW[5]])?.status).toBe('stopped');
  });
});

describe('a shut-down session that is later resumed in place', () => {
  // The latch clears on the resumed process's first real turn, but the grandchildren of the agents
  // that died at the exit still only exist as a per-tick sidecar join with an mtime status — one
  // written a moment before the exit reads 'working' for up to IDLE_CEILING unless the level-1
  // agent itself remembers it ended with its process (SubAgent.endedWithSession).
  it('keeps the grandchildren of a subagent that died with the old process stopped after the resume', () => {
    const SID = '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50';
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'session-shutdown-resume-'));
    try {
      const projectDir = path.join(tmp, '-Users-dev-Projects-acme-acme-app');
      const subagentsDir = path.join(projectDir, SID, 'subagents');
      fs.mkdirSync(subagentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(subagentsDir, 'agent-asample01.meta.json'),
        JSON.stringify({ agentType: 'Explore', description: 'Sample text', toolUseId: BACKGROUND }),
      );
      fs.writeFileSync(
        path.join(subagentsDir, 'agent-child01.meta.json'),
        JSON.stringify({ agentType: 'Explore', description: 'Sample text', parentAgentId: 'asample01' }),
      );
      fs.writeFileSync(path.join(subagentsDir, 'agent-child01.jsonl'), '{}\n'); // written just now
      const parent = path.join(projectDir, `${SID}.jsonl`);
      // launch + ACK, the shutdown marker, then the resumed process's first real turn
      fs.writeFileSync(parent, [RAW[0], RAW[1], RAW[4], RAW[5], RAW[6]].join('\n') + '\n');

      const session = new LogParser(tmp).parse(parent, 'claude-code');
      refreshSessionStatuses([session], new Set());

      expect(session.shutdownRecorded).toBe(false); // resumed: the latch cleared
      const [parentAgent] = session.subagents;
      expect(parentAgent.status).toBe('stopped');
      expect(parentAgent.children?.map((c) => c.status)).toEqual(['stopped']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('a subagent of a shut-down session that is resumed by SendMessage after the session resumed', () => {
  // Its host process is the NEW one now: what it spawns from here on is alive, so the flag that keeps
  // the old process's grandchildren stopped must not outlive the resume (reactivateSubagent).
  it('is working again and its new grandchild is not forced stopped', () => {
    const SID = '5d1e8a20-6b3a-4c7b-9a3e-2f6b1c8d4e50';
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'session-shutdown-sendmessage-'));
    try {
      const projectDir = path.join(tmp, '-Users-dev-Projects-acme-acme-app');
      const subagentsDir = path.join(projectDir, SID, 'subagents');
      fs.mkdirSync(subagentsDir, { recursive: true });
      fs.writeFileSync(
        path.join(subagentsDir, 'agent-asample01.meta.json'),
        JSON.stringify({ agentType: 'Explore', description: 'Sample text', toolUseId: BACKGROUND }),
      );
      fs.writeFileSync(
        path.join(subagentsDir, 'agent-child01.meta.json'),
        JSON.stringify({ agentType: 'Explore', description: 'Sample text', parentAgentId: 'asample01' }),
      );
      fs.writeFileSync(path.join(subagentsDir, 'agent-child01.jsonl'), '{}\n'); // written just now
      const parent = path.join(projectDir, `${SID}.jsonl`);
      fs.writeFileSync(parent, [RAW[0], RAW[1], RAW[4], RAW[5], RAW[6]].join('\n') + '\n');
      const parser = new LogParser(tmp);
      parser.parse(parent, 'claude-code'); // first pass: the sidecar join fills agentId

      const sendMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_sd_sm',
              name: 'SendMessage',
              input: { to: 'asample01', message: 'Sample text' },
            },
          ],
        },
      };
      const resumeAck = {
        type: 'user',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_sd_sm' }] },
        toolUseResult: { success: true, message: 'Sample text', resumedAgentId: 'asample01' },
      };
      fs.appendFileSync(parent, [sendMessage, resumeAck].map((l) => JSON.stringify(l)).join('\n') + '\n');
      const session = parser.parse(parent, 'claude-code');
      refreshSessionStatuses([session], new Set());

      const [parentAgent] = session.subagents;
      expect(parentAgent.status).toBe('working');
      expect(parentAgent.children?.map((c) => c.status)).toEqual(['working']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('an ended session never reads as error', () => {
  // 'error' is an alarm for a session that may still recover; the exit write also refreshes the
  // mtime, so an errored-then-exited session would otherwise look freshly broken for IDLE_CEILING.
  const apiError = JSON.stringify({
    type: 'system',
    subtype: 'api_error',
    timestamp: '2026-09-28T23:12:50.000Z',
    error: { message: 'Overloaded' },
  });

  it('reads error while the process lives and stopped once it has exited (control + change)', () => {
    try {
      const now = SHUTDOWN_AT + 5 * 60 * 1000;
      const alive = parseAt([apiError], SHUTDOWN_AT, now);
      const ended = parseAt([apiError, RAW[4], RAW[5]], SHUTDOWN_AT, now);
      expect(computeSessionStatus(alive, new Set())).toBe('error');
      expect(ended.lastEntryIsApiError).toBe(true);
      expect(computeSessionStatus(ended, new Set())).toBe('stopped');
    } finally {
      vi.useRealTimers();
    }
  });
});
