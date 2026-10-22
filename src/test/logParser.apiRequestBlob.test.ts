import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogParser, LogEntry } from '../logParser';
import { Session, SubAgent } from '../types';

/**
 * Sanitized capture of a real Claude Code 2.1.306 parent transcript (session 458e5d3f…, every
 * free-form text/path/branch replaced with a placeholder, message.usage dropped — see
 * logParser.realLogs.test.ts's header for the same convention). From 2.1.301 on, Claude Code logs
 * every API request into the transcript: `api-request` lines (no `message`, harmless) plus
 * content-addressed `api-request-blob` lines, each a COPY of a turn already written as its own
 * `user`/`assistant` entry but stripped of `timestamp`, `uuid`, `isSidechain` and `toolUseResult`
 * (see isApiRequestBlob in transcriptEntry.ts). Line order, blank lines filtered:
 *   0 Agent launch FINISHED (toolu_011q…)      1 its async_launched ACK (agentId ad34e4…)
 *   2 Agent launch RUNNING  (toolu_01Mw…)      3 its async_launched ACK (agentId aed87d…)
 *   4 blob: assistant copy of lines 0 + 2      5 blob: user copy of lines 1 + 3, with NO
 *                                                toolUseResult.status on the copy
 *   6 blob: role "system" (lifted from the session's first request and trimmed; Claude Code writes
 *     it between the user blob and the api-request, so it is the last message-bearing line there)
 *   7 api-request
 *   8 real <task-notification> for FINISHED    9 blob: user-role copy of line 8 (a STRING that
 *                                                starts with <system-reminder>, no timestamp)
 *
 * Guards three real failures from reading a blob as a turn: the copy of an async-launch ACK (5)
 * stopped a background subagent that was still running; the copy of a notification (9) re-stopped
 * a finished one with no timestamp, wiping the real `stoppedAt` that subagentRewake.ts needs; and a
 * trailing blob replaced `lastEntryType`, hiding a user turn that was still awaiting its reply.
 */
const FIXTURE = path.join(__dirname, 'fixtures', 'real-logs', 'api-request-blob-async-launch.jsonl');
const RAW = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean);
const NOTIFICATION_AT = Date.parse((JSON.parse(RAW[8]) as LogEntry & { timestamp: string }).timestamp);
const FINISHED = 'toolu_011qxwx4UsYbreCkhZsMtnKM'; // line 8's <task-notification> completes this launch
const RUNNING = 'toolu_01MwKJFLHj3k3N4g2x8xHWAz'; // never reports completion anywhere in the capture

const subagent = (session: Session, launchId: string): SubAgent | undefined =>
  session.subagents.find((s) => s.id === launchId);

describe('api-request-blob lines (real 2.1.306 capture)', () => {
  let tmp: string;
  let transcriptPath: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-request-blob-'));
    transcriptPath = path.join(tmp, 'session.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('keeps a background subagent working when a blob copies its async-launch ACK', () => {
    fs.writeFileSync(transcriptPath, RAW.join('\n') + '\n');

    const session = new LogParser(tmp).parse(transcriptPath, 'claude-code');

    expect(subagent(session, RUNNING)?.status).toBe('working');
  });

  it('keeps the real stoppedAt of a finished subagent when a blob copies its notification', () => {
    fs.writeFileSync(transcriptPath, RAW.join('\n') + '\n');

    const session = new LogParser(tmp).parse(transcriptPath, 'claude-code');

    expect(subagent(session, FINISHED)?.status).toBe('stopped');
    expect(subagent(session, FINISHED)?.stoppedAt).toBe(NOTIFICATION_AT);
  });

  it('keeps a background subagent working through every line appended after its launch', () => {
    const parser = new LogParser(tmp);
    fs.writeFileSync(transcriptPath, RAW.slice(0, 3).join('\n') + '\n');
    expect(subagent(parser.parse(transcriptPath, 'claude-code'), RUNNING)?.status).toBe('working');

    RAW.slice(3).forEach((line, i) => {
      fs.appendFileSync(transcriptPath, line + '\n');
      const session = parser.parse(transcriptPath, 'claude-code');
      expect(subagent(session, RUNNING)?.status, `after fixture line ${i + 3}`).toBe('working');
    });
  });

  it('keeps a user tool_result turn awaiting its reply when only blob and api-request lines follow', () => {
    // The model is generating: line 3 (the ACK) is the last real turn; lines 4-7 are the request
    // that carries it, and the role "system" blob is the last message-bearing line among them.
    fs.writeFileSync(transcriptPath, RAW.slice(0, 8).join('\n') + '\n');

    const session = new LogParser(tmp).parse(transcriptPath, 'claude-code');

    expect(session.lastEntryType).toBe('user');
  });
});
