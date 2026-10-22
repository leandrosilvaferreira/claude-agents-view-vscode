import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogParser, LogEntry } from '../logParser';
import { Session, SubAgent } from '../types';

/**
 * Sanitized capture of real Claude Code 2.1.289 transcript lines (every free-form text, arg, path and
 * branch replaced with a placeholder, message.usage dropped — see logParser.realLogs.test.ts's header for
 * the same convention). Since ~2.1.288, when the MODEL invokes the built-in `Skill` tool on a skill with
 * `context: fork` (e.g. code-review), the skill runs as a BACKGROUND subagent. Its launch is an ordinary
 * `Skill` tool_use — most Skill calls are inline, so that line alone proves nothing — and only the
 * tool_result that comes back ~150 ms later says it was forked: `toolUseResult.status === 'forked'`
 * plus the agentId. Line order, 0-based (lines 0-1 are from a different real session than 2-5):
 *   0 inline Skill tool_use (toolu_013o…)     1 its tool_result: toolUseResult {success, commandName} only
 *   2 forked Skill tool_use (toolu_01Uh…)     3 its tool_result: toolUseResult {status:'forked', agentId aa3ce8…}
 *   4 queue-operation <task-notification>     5 user-turn copy of the same notification, 19 ms later
 *     (the review ran ~69 minutes between 3 and 4)
 *
 * Guards three real failures: the forked tool_result read as the subagent's COMPLETION (stopped on the
 * spot, so a review running about 45 minutes to 3.5 hours showed nothing under "Working Agents"), an inline Skill call
 * turned into a phantom subagent, and a re-appended history line (Claude Code rewrites earlier lines
 * verbatim on relocate/resume) resurrecting a finished subagent.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'skill-forked-launch.jsonl');
const RAW = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean);
const INLINE_RESULT = 1;
const FORKED_RESULT = 3;
const QUEUE_NOTIFICATION = 4;
const USER_NOTIFICATION = 5;
const FORKED = 'toolu_01Uh6qNGFTEwh8acdhVGob51'; // the forked Skill call; both notifications complete THIS id
const AGENT_ID = 'aa3ce86a3a462c7d2';
const RESUME = 'toolu_01SampleResumeSendMessage'; // synthetic SendMessage tool_use id, see the resume test

const timestampOf = (index: number): number =>
  Date.parse((JSON.parse(RAW[index]) as LogEntry & { timestamp: string }).timestamp);

const subagent = (session: Session, id: string): SubAgent | undefined => session.subagents.find((s) => s.id === id);

describe('model-invoked forked Skill (real 2.1.289 capture)', () => {
  let tmp: string;
  let transcriptPath: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forked-skill-'));
    transcriptPath = path.join(tmp, 'session.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const parseLines = (lines: string[]): Session => {
    fs.writeFileSync(transcriptPath, lines.join('\n') + '\n');
    return new LogParser(tmp).parse(transcriptPath, 'claude-code');
  };

  it('shows a forked Skill result as a working background subagent keyed by the Skill tool_use id', () => {
    const session = parseLines(RAW.slice(0, FORKED_RESULT + 1));

    expect(session.subagents).toHaveLength(1);
    expect(subagent(session, FORKED)).toMatchObject({
      id: FORKED,
      agentId: AGENT_ID,
      name: 'code-review',
      task: '/code-review',
      status: 'working',
      isBackground: true,
    });
  });

  it('stops the subagent on its <task-notification>', () => {
    const sub = subagent(parseLines(RAW), FORKED);

    expect(sub?.status).toBe('stopped');
  });

  it.each([
    ['queue-operation', QUEUE_NOTIFICATION],
    ['user-turn', USER_NOTIFICATION],
  ])('stops the subagent when only the %s copy of the notification exists', (_shape, index) => {
    const sub = subagent(parseLines([...RAW.slice(0, FORKED_RESULT + 1), RAW[index]]), FORKED);

    expect(sub?.status).toBe('stopped');
    expect(sub?.stoppedAt).toBe(timestampOf(index));
  });

  it('stops the subagent on a <task-id>-only notification, resolved through its agentId', () => {
    // 2 of 11 real first completions carry no <tool-use-id> (e.g. after the fork was messaged mid-run).
    const entry = JSON.parse(RAW[QUEUE_NOTIFICATION]) as { content: string };
    const content = entry.content.replace(`<tool-use-id>${FORKED}</tool-use-id>\n`, '');
    expect(content).not.toContain('<tool-use-id>');

    const sub = subagent(
      parseLines([...RAW.slice(0, FORKED_RESULT + 1), JSON.stringify({ ...entry, content })]),
      FORKED,
    );

    expect(sub?.status).toBe('stopped');
    expect(sub?.stoppedAt).toBe(timestampOf(QUEUE_NOTIFICATION));
  });

  it('creates no subagent for an inline Skill result', () => {
    const session = parseLines(RAW.slice(0, INLINE_RESULT + 1));

    expect(session.subagents).toEqual([]);
  });

  it('ignores a forked result that carries no agentId', () => {
    const entry = JSON.parse(RAW[FORKED_RESULT]) as LogEntry & { toolUseResult: Record<string, unknown> };
    const { agentId: _agentId, ...withoutAgentId } = entry.toolUseResult;

    const session = parseLines([
      ...RAW.slice(0, FORKED_RESULT),
      JSON.stringify({ ...entry, toolUseResult: withoutAgentId }),
    ]);

    expect(session.subagents).toEqual([]);
  });

  it('ignores a forked result whose agentId is empty', () => {
    const entry = JSON.parse(RAW[FORKED_RESULT]) as LogEntry & { toolUseResult: Record<string, unknown> };

    const session = parseLines([
      ...RAW.slice(0, FORKED_RESULT),
      JSON.stringify({ ...entry, toolUseResult: { ...entry.toolUseResult, agentId: '' } }),
    ]);

    expect(session.subagents).toEqual([]);
  });

  it('falls back to the generic name and task when the forked result carries no commandName', () => {
    const entry = JSON.parse(RAW[FORKED_RESULT]) as LogEntry & { toolUseResult: Record<string, unknown> };
    const { commandName: _commandName, ...withoutCommandName } = entry.toolUseResult;

    const session = parseLines([
      ...RAW.slice(0, FORKED_RESULT),
      JSON.stringify({ ...entry, toolUseResult: withoutCommandName }),
    ]);

    expect(subagent(session, FORKED)).toMatchObject({ name: 'Agent', task: 'Delegate task', status: 'working' });
  });

  it('keeps a stopped subagent stopped when its forked result is re-appended verbatim', () => {
    const parser = new LogParser(tmp);
    fs.writeFileSync(transcriptPath, RAW.join('\n') + '\n');
    const before = subagent(parser.parse(transcriptPath, 'claude-code'), FORKED);
    expect(before?.status).toBe('stopped');
    const stoppedAtBefore = before?.stoppedAt;

    fs.appendFileSync(transcriptPath, RAW[FORKED_RESULT] + '\n');
    const sub = subagent(parser.parse(transcriptPath, 'claude-code'), FORKED);

    expect(sub?.status).toBe('stopped');
    expect(sub?.stoppedAt).toBe(stoppedAtBefore);
  });

  it('does not duplicate a SendMessage-resumed subagent when its forked result is re-appended', () => {
    // The shared `seen` set blocks the replay, not a `currentSubagents.has(<Skill tool_use id>)` check: the resume
    // re-keyed the entry to the SendMessage's tool_use id, so that lookup would miss and add a second 'working'
    // copy. The fixture has no SendMessage, so these two lines are synthetic, shaped like the real resume ACK.
    const resumeCall = JSON.stringify({
      type: 'assistant',
      isSidechain: false,
      timestamp: '2026-10-04T06:10:00.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: RESUME, name: 'SendMessage', input: { to: 'code-review', message: 'Sample text' } },
        ],
      },
    });
    const resumeAck = JSON.stringify({
      type: 'user',
      isSidechain: false,
      timestamp: '2026-10-04T06:10:00.080Z',
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: RESUME, content: 'Sample text' }] },
      toolUseResult: {
        success: true,
        message: 'Agent had no active task; resumed from transcript in the background',
        resumedAgentId: AGENT_ID,
        pin: { id: AGENT_ID, name: 'code-review', ref: 'sample' },
      },
    });

    const session = parseLines([...RAW, resumeCall, resumeAck, RAW[FORKED_RESULT]]);

    expect(session.subagents).toHaveLength(1);
    expect(session.subagents[0]).toMatchObject({ id: RESUME, launchId: FORKED, status: 'working' });
  });

  it('agrees with a cold parse when the fixture is replayed one line at a time', () => {
    const cold = parseLines(RAW).subagents;
    const parser = new LogParser(tmp);
    fs.writeFileSync(transcriptPath, '');
    // Absent until the forked result lands, then working until the first notification stops it.
    const expectedStatus = [undefined, undefined, undefined, 'working', 'stopped', 'stopped'];

    let session: Session | undefined;
    RAW.forEach((line, i) => {
      fs.appendFileSync(transcriptPath, line + '\n');
      session = parser.parse(transcriptPath, 'claude-code');
      expect(subagent(session, FORKED)?.status, `after fixture line ${i}`).toBe(expectedStatus[i]);
    });

    expect(session?.subagents).toEqual(cold);
  });
});
