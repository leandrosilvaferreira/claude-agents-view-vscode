import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { constants } from 'buffer';
import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MAX_LINE_BYTES, READ_CHUNK_BYTES } from '../chunkedLineReader';
import { logDebug } from '../logger';
import { LogParser } from '../logParser';
import { Session } from '../types';

// The chunk size (logParser.chunkedRead.test.ts) bounds what ONE read returns, not what a line may grow
// into: a runaway line (or an unterminated tail) used to be copied into memory whole, decoded into one
// string that throws past V8's ~512 MiB limit, and — with the cursor stuck behind it — redone on every
// tick while the lines before it were fed to the cached session again. A line over `maxLineBytes` is now
// dropped whole and the cursor moves past it. These tests inject a tiny limit; the default is checked
// against the chunk size and V8's string limit instead of being exercised with hundreds of MB.

interface ReadCall {
  length: number;
  position: number;
}

// Every `fs.readSync` issued while a test runs, plus an optional injected failure on the Nth read. A
// module mock rather than vi.spyOn, for the reason given in logParser.chunkedRead.test.ts.
const probe = vi.hoisted(() => ({ reads: [] as ReadCall[], failOnRead: 0 }));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const readSync = (
    fd: number,
    buffer: Buffer,
    ...range: [offset: number, length: number, position: number]
  ): number => {
    probe.reads.push({ length: range[1], position: range[2] });
    if (probe.reads.length === probe.failOnRead) throw new Error('EIO: simulated disk error');
    return actual.readSync(fd, buffer, ...range);
  };
  return { ...actual, readSync, default: { ...actual, readSync } };
});

// Only logDebug is replaced, so the tests can read what was logged (and nothing reaches the real debug log).
vi.mock('../logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../logger')>()),
  logDebug: vi.fn(),
}));

// A tiny injected limit: the ordinary lines below are ~250 bytes, the oversize one ~1,250.
const LINE_CAP = 400;
// Smaller than the limit (an oversize line spans chunks) and bigger than the whole file AND the limit
// (an oversize line sits inside a single chunk).
const CHUNK_SIZES = [1, 7, 64, 100_000];

function launchLine(id: string, description: string): string {
  return JSON.stringify({
    type: 'assistant',
    timestamp: '2026-09-30T10:00:00.000Z',
    message: {
      role: 'assistant',
      model: 'claude-opus-4-7',
      content: [{ type: 'tool_use', name: 'Agent', id, input: { name: id, description } }],
    },
  });
}

// No newline at the end of any of these: each test decides how they are joined.
const BEFORE = launchLine('toolu_before', 'A good line before the big one');
const OVERSIZE = launchLine('toolu_oversize', 'x'.repeat(1000));
const AFTER = launchLine('toolu_after', 'A good line after the big one');
const LATER = launchLine('toolu_later', 'Arrives on the next tick');

const ids = (session: Session): string[] => session.subagents.map((subagent) => subagent.id);

describe('LogParser line limit', () => {
  let tmp: string;

  beforeEach(() => {
    probe.reads.length = 0;
    probe.failOnRead = 0;
    vi.mocked(logDebug).mockClear();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'line-limit-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const write = (name: string, content: string): string => {
    const filePath = path.join(tmp, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  };
  const limitedParser = (chunkBytes: number): LogParser =>
    new LogParser(tmp, { readChunkBytes: chunkBytes, maxLineBytes: LINE_CAP });
  const logged = (fragment: string): string[] =>
    vi
      .mocked(logDebug)
      .mock.calls.map(([message]) => message)
      .filter((message) => message.includes(fragment));

  it('uses fixtures that straddle the limit, and a default limit between the chunk size and the V8 string limit', () => {
    expect(Buffer.byteLength(BEFORE)).toBeLessThan(LINE_CAP);
    expect(Buffer.byteLength(OVERSIZE)).toBeGreaterThan(LINE_CAP);
    expect(MAX_LINE_BYTES).toBeGreaterThanOrEqual(READ_CHUNK_BYTES);
    expect(MAX_LINE_BYTES).toBeLessThan(constants.MAX_STRING_LENGTH);
  });

  describe('a line over the limit in the middle of the file', () => {
    it.each(CHUNK_SIZES)(
      'is dropped whole, the lines around it parse once and the cursor moves past it (%i-byte chunks)',
      (chunkBytes) => {
        const filePath = write('middle.jsonl', `${BEFORE}\n${OVERSIZE}\n${AFTER}\n`);
        const fileBytes = fs.statSync(filePath).size;
        const parser = limitedParser(chunkBytes);

        expect(ids(parser.parse(filePath, 'claude-code'))).toEqual(['toolu_before', 'toolu_after']);

        // Next tick, one more good line. The cursor sits past everything that was dropped, so nothing
        // is read again — the lines before the big one are not fed to the cached session a second time.
        probe.reads.length = 0;
        fs.appendFileSync(filePath, `${LATER}\n`);
        const next = parser.parse(filePath, 'claude-code');

        expect(probe.reads[0]?.position).toBe(fileBytes);
        expect(ids(next)).toEqual(['toolu_before', 'toolu_after', 'toolu_later']);
        expect(next).toEqual(new LogParser(tmp, { maxLineBytes: LINE_CAP }).parse(filePath, 'claude-code'));
      },
    );

    it.each([1, 64, 100_000])(
      'still holds a torn line that follows it back from its own first byte (%i-byte chunks)',
      (chunkBytes) => {
        const filePath = write('oversize-then-torn.jsonl', `${BEFORE}\n${OVERSIZE}\n${AFTER.slice(0, 50)}`);
        const tornStart = Buffer.byteLength(`${BEFORE}\n${OVERSIZE}\n`);
        const parser = limitedParser(chunkBytes);
        parser.parse(filePath, 'claude-code');

        probe.reads.length = 0;
        fs.appendFileSync(filePath, `${AFTER.slice(50)}\n`);
        const session = parser.parse(filePath, 'claude-code');

        expect(probe.reads[0]?.position).toBe(tornStart);
        expect(ids(session)).toEqual(['toolu_before', 'toolu_after']);
      },
    );

    it.each([1, 64, 100_000])(
      'keeps a line of exactly the limit and drops one of a byte more (%i-byte chunks)',
      (chunkBytes) => {
        const sized = (id: string, bytes: number): string =>
          launchLine(id, 'x'.repeat(bytes - launchLine(id, '').length));
        const exact = sized('toolu_exact', LINE_CAP);
        const tooLong = sized('toolu_too_long', LINE_CAP + 1);
        expect([Buffer.byteLength(exact), Buffer.byteLength(tooLong)]).toEqual([LINE_CAP, LINE_CAP + 1]);

        const session = limitedParser(chunkBytes).parse(write('exact.jsonl', `${exact}\n${tooLong}\n`), 'claude-code');

        expect(ids(session)).toEqual(['toolu_exact']);
      },
    );
  });

  describe('an unterminated tail over the limit', () => {
    it.each([
      [1, 100],
      [64, 100],
      [100_000, 100],
      [64, 600],
      [100_000, 600],
    ])(
      'does not break the session, moves the cursor to EOF and registers only the good line (%i-byte chunks, %i bytes written later)',
      (chunkBytes, laterBytes) => {
        const split = OVERSIZE.length - laterBytes;
        const filePath = write('oversize-tail.jsonl', `${BEFORE}\n${OVERSIZE.slice(0, split)}`);
        const fileBytes = fs.statSync(filePath).size;
        const parser = limitedParser(chunkBytes);

        // Not swallowed into an empty session: the line before the runaway tail is still there.
        expect(ids(parser.parse(filePath, 'claude-code'))).toEqual(['toolu_before']);

        // The writer finishes the giant line and adds a good one. What is left of the giant line is a
        // junk line that fails JSON.parse silently; it must not register, and the good line must.
        probe.reads.length = 0;
        fs.appendFileSync(filePath, `${OVERSIZE.slice(split)}\n${AFTER}\n`);
        const next = parser.parse(filePath, 'claude-code');

        expect(probe.reads[0]?.position).toBe(fileBytes);
        expect(ids(next)).toEqual(['toolu_before', 'toolu_after']);
      },
    );
  });

  describe('the maxLineBytes option', () => {
    it.each([0, -5, 1.5])('ignores the invalid value %s instead of using it as a cap', (invalid) => {
      const filePath = write('option.jsonl', `${OVERSIZE}\n`);

      const session = new LogParser(tmp, { maxLineBytes: invalid }).parse(filePath, 'claude-code');

      // ~1,250 bytes is nowhere near the default limit, so the line is kept.
      expect(ids(session)).toEqual(['toolu_oversize']);
    });
  });

  describe('a line that cannot be decoded', () => {
    it('is skipped instead of throwing, and the lines after it still parse', () => {
      const marker = 'UNDECODABLE-MARKER';
      const lines = [
        launchLine('toolu_ok_1', 'first'),
        launchLine('toolu_undecodable', marker),
        launchLine('toolu_ok_2', 'last'),
      ];
      const filePath = write('undecodable.jsonl', `${lines.join('\n')}\n`);
      type ToString = (encoding?: BufferEncoding, start?: number, end?: number) => string;
      const realToString: ToString = Buffer.prototype.toString;
      // What V8 does for a string too long (or an allocation that fails): throw from toString. Patched by
      // hand rather than with vi.spyOn, whose typing for this inherited method can't take the real args.
      Buffer.prototype.toString = function (encoding?: BufferEncoding, start?: number, end?: number) {
        if (this.includes(marker)) throw new RangeError('Cannot create a string longer than 0x1fffffe8 characters');
        return realToString.call(this, encoding, start, end);
      };
      try {
        expect(ids(limitedParser(64).parse(filePath, 'claude-code'))).toEqual(['toolu_ok_1', 'toolu_ok_2']);
      } finally {
        Buffer.prototype.toString = realToString;
      }
    });
  });

  describe('what gets logged', () => {
    it('logs one line per call for everything it dropped, with byte counts and no path', () => {
      const filePath = write('log-once.jsonl', `${BEFORE}\n${OVERSIZE}\n${OVERSIZE}\n${AFTER}\n`);

      limitedParser(64).parse(filePath, 'claude-code');

      const messages = logged('line limit');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('2 line(s)');
      expect(messages[0]).toContain(`${2 * (Buffer.byteLength(OVERSIZE) + 1)} bytes`);
      expect(messages[0]).not.toContain(tmp);
    });

    it('logs nothing when nothing was dropped', () => {
      limitedParser(64).parse(write('quiet.jsonl', `${BEFORE}\n${AFTER}\n`), 'claude-code');

      expect(logged('line limit')).toEqual([]);
    });

    it('logs a failed read with its byte position and the cause, never the path', () => {
      const filePath = write('log-read-failure.jsonl', `${BEFORE}\n${AFTER}\n`);
      probe.failOnRead = 2;

      limitedParser(100).parse(filePath, 'claude-code');

      const messages = logged('read failed');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('byte 100');
      expect(messages[0]).toContain('EIO: simulated disk error');
      expect(messages[0]).not.toContain(tmp);
    });
  });
});
