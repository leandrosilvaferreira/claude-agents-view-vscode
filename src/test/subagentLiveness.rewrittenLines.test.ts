import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogParser } from '../logParser';

/**
 * Sanitized minimal reproduction of the re-written-transcript-lines shape (a real 2.1.2xx session,
 * CLI 2.1.239-2.1.276 — see subagentDetector.ts's detectSubagents doc comment). After a session is
 * relocated/resumed, Claude Code re-appends earlier history lines verbatim: same tool_use ids, same
 * timestamps. Line order here:
 *   0 launch (Agent tool_use, id L, name "sample-worker")
 *   1 SendMessage to "sample-worker" while it is still running (mid-run message, not a resume)
 *   2 its "queued for delivery" ACK (no resumedAgentId — still alive, not a completion)
 *   3 the launch's real completion (nested tool_result for id L) — the subagent is now 'stopped'
 *   4 REPLAY of line 1 (same SendMessage id)   5 REPLAY of line 0 (same launch id)
 *
 * The two replays are ordered SendMessage-then-launch (not the original launch-then-SendMessage
 * order) so each of the two `markSeen()` call sites (detectClaudeCalls, detectSendMessageResume)
 * is independently load-bearing for this test: replayed in the original order, the launch replay's
 * bug alone would resurrect the subagent to 'working' before the SendMessage replay even runs,
 * masking whether the SendMessage-replay guard did anything. Reordered, WITHOUT the fix the
 * SendMessage replay first "resumes" the already-stopped subagent under a new key (re-appended
 * SendMessage targeting a target that now reads stopped), and the launch replay then ALSO recreates
 * a second, independent 'working' entry under the original id — two separate wrongly-'working'
 * entries from two separate bugs, both fixed by the same seenToolUseIds guard.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'rewritten-launch-and-sendmessage-lines.jsonl');
const RAW = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean);
const LAUNCH_ID = 'toolu_launch_1';

describe('re-appended transcript lines (a real 2.1.2xx session shape)', () => {
  it('ends stopped on a single cold parse of the whole file', () => {
    const session = new LogParser().parse(FIXTURE, 'claude-code');

    expect(session.subagents.find((s) => s.id === LAUNCH_ID)?.status).toBe('stopped');
    expect(session.subagents.some((s) => s.status === 'working')).toBe(false);
  });

  it('stays stopped when the replay lines only arrive in a LATER incremental parse', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rewritten-lines-'));
    const filePath = path.join(tmp, 'session.jsonl');
    try {
      // First chunk: launch through the real completion (lines 0-3) — parsed once, so
      // seenToolUseIds already holds both the launch and SendMessage ids before the replay lands.
      fs.writeFileSync(filePath, RAW.slice(0, 4).join('\n') + '\n');
      const parser = new LogParser();
      let session = parser.parse(filePath, 'claude-code');
      expect(session.subagents.find((s) => s.id === LAUNCH_ID)?.status).toBe('stopped');

      // Second chunk, appended later: the two re-written lines (SendMessage replay, launch
      // replay). Reusing the SAME parser instance is the point — LogParser's per-file cache is
      // what carries seenToolUseIds across this incremental read.
      fs.appendFileSync(filePath, RAW.slice(4).join('\n') + '\n');
      session = parser.parse(filePath, 'claude-code');

      expect(session.subagents.find((s) => s.id === LAUNCH_ID)?.status).toBe('stopped');
      expect(session.subagents.some((s) => s.status === 'working')).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
