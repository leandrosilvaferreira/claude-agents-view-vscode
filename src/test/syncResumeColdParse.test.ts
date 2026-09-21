import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogParser } from '../logParser';
import { refreshSessionStatuses } from '../sessionStatusRefresh';

/**
 * Shape of real session 537d9b05 (Claude Code 2.1.257): a foreground (synchronous) Agent launch
 * with no explicit `name`, completing with `toolUseResult: {status:'completed', agentId}` — NOT
 * the backgrounded `async_launched` ACK subagentCompletion.ts's recordLaunchAgentId already reads
 * agentId from today. It is then resumed by SendMessage addressed by that agentId, and the resume
 * itself completes via a later <task-notification>.
 *
 * HIGH-regression mutant this pins: recordLaunchAgentId only runs inside the launch/resume-ACK
 * branch (isLaunchOrResumeAck), so a SYNC completion's own `toolUseResult.agentId` is never read
 * at parse time — only much later, via subagentMetadata's end-of-batch sidecar join. In a single
 * cold parse that processes the completion, the SendMessage, and the resume ACK all in the SAME
 * batch, `sub.agentId` is therefore still unset when the SendMessage is detected —
 * findSubagentEntryByTarget's agentId match misses, the resume is never recognized, `stoppedAt`
 * is never refreshed by the resume's own completion, and it is left pointing at the FIRST
 * (foreground) completion. `refreshRewokenSubagents` then reads the large gap between that stale
 * `stoppedAt` and the resumed subagent's own transcript mtime as a false-positive rewake. Fixed by
 * moving the `toolUseResult.agentId` recording before the ACK check, so it also fires on an
 * ordinary synchronous completion.
 */
const T0 = Date.parse('2026-09-02T03:38:52.000Z');
const iso = (ms: number): string => new Date(ms).toISOString();
const SID = 'sess-sync-resume';
const lines = [
  {
    type: 'assistant',
    timestamp: iso(T0),
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'toolu_S1',
          name: 'Agent',
          input: { description: 'x', subagent_type: 'backend-specialist' },
        },
      ],
    },
  },
  {
    type: 'user',
    timestamp: iso(T0 + 60_000),
    message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_S1' }] },
    toolUseResult: { status: 'completed', agentId: 'aSYNC1', content: [] },
  },
  {
    type: 'assistant',
    timestamp: iso(T0 + 120_000),
    message: {
      content: [{ type: 'tool_use', id: 'toolu_M1', name: 'SendMessage', input: { to: 'aSYNC1', message: 'more' } }],
    },
  },
  {
    type: 'user',
    timestamp: iso(T0 + 120_100),
    message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_M1' }] },
    toolUseResult: {
      success: true,
      message: 'resumed',
      resumedAgentId: 'aSYNC1',
      pin: { id: 'aSYNC1', name: 'aSYNC1', ref: 'x' },
    },
  },
  {
    type: 'user',
    timestamp: iso(T0 + 400_000),
    message: {
      content:
        '<task-notification>\n<task-id>aSYNC1</task-id>\n<tool-use-id>toolu_M1</tool-use-id>\n<status>completed</status>\n</task-notification>',
    },
  },
];

describe('cold parse of a SendMessage-resumed foreground subagent', () => {
  let tmp: string;
  let parentPath: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-resume-'));
    const subagentsDir = path.join(tmp, 'proj', SID, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(subagentsDir, 'agent-aSYNC1.meta.json'),
      JSON.stringify({ agentType: 'backend-specialist', toolUseId: 'toolu_S1', model: 'sonnet' }),
    );
    const transcript = path.join(subagentsDir, 'agent-aSYNC1.jsonl');
    fs.writeFileSync(transcript, '{}\n');
    // Its own transcript's last write coincides with the resume's real completion (line 4) — the
    // whole point of the fix: that write must read as "the resume finished", not "a restart".
    fs.utimesSync(transcript, (T0 + 400_000) / 1000, (T0 + 400_000) / 1000);
    parentPath = path.join(tmp, 'proj', `${SID}.jsonl`);
    fs.writeFileSync(parentPath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('stays stopped after its final completion (no rewake false positive)', () => {
    const session = new LogParser(tmp).parse(parentPath, 'claude-code');
    vi.setSystemTime(T0 + 460_000);
    refreshSessionStatuses([session], new Set());
    expect(session.subagents.find((s) => s.agentId === 'aSYNC1')?.status).toBe('stopped');
  });
});
