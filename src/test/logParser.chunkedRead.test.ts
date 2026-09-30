import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { READ_CHUNK_BYTES } from '../chunkedLineReader';
import { LogParser } from '../logParser';
import { Session } from '../types';

// LogParser reads a transcript in bounded chunks (chunkedLineReader.ts) and decodes it line by line.
// Regression: it used to allocate `fileSize - offset` bytes and decode them into ONE string, which
// overflows V8's string limit (~512 MiB) on a huge transcript; the error was swallowed into an empty
// session and retried on every tick. These tests prove the chunking is invisible — whatever the chunk
// size, the parsed Session is the one a single whole-file read gives — while no read is ever bigger
// than a chunk. The committed golden master (schemaGoldenMaster.test.ts) and the real-log tests pin
// WHAT is parsed; this file pins HOW the bytes are read.

interface ReadCall {
  length: number;
  position: number;
  bufferBytes: number;
}

// Every `fs.readSync` issued while a test runs, recorded at the module boundary, plus an optional
// injected failure on the Nth read. A module mock rather than vi.spyOn on purpose: Node's fs ESM
// namespace exports aren't configurable here, so a spy on the test's own `fs` is never seen by the
// parser's `import * as fs` and would record nothing (see projectPathResolver.test.ts). Everything
// else in fs passes straight through to the real module.
const probe = vi.hoisted(() => ({ reads: [] as ReadCall[], failOnRead: 0 }));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  // The parser only ever calls the 5-argument form: readSync(fd, buffer, offset, length, position).
  const readSync = (
    fd: number,
    buffer: Buffer,
    ...range: [offset: number, length: number, position: number]
  ): number => {
    probe.reads.push({ length: range[1], position: range[2], bufferBytes: buffer.length });
    if (probe.reads.length === probe.failOnRead) throw new Error('EIO: simulated disk error');
    return actual.readSync(fd, buffer, ...range);
  };
  return { ...actual, readSync, default: { ...actual, readSync } };
});

const REAL_LOGS_DIR = path.join(__dirname, 'fixtures', 'real-logs');
const SCHEMA_CORPUS_DIR = path.join(__dirname, 'fixtures', 'schema-corpus');

// 1 puts a chunk boundary inside every multi-byte character; 7 and 64 give other alignments; 4096 is
// a realistic small page; the default reads any fixture in one go.
const CHUNK_SIZES = [1, 7, 64, 4096, READ_CHUNK_BYTES];
// 1-byte chunks on the 1.1 MB fixture would cost a million syscalls; the boundary alignments are
// already covered by the small fixtures and the synthetic transcript below.
const TINY_CHUNK_FILE_LIMIT = 64 * 1024;
const T0 = '2026-09-30T10:00:00.000Z';
// What a UTF-8 decoder substitutes for a byte sequence it cannot decode — built, not typed, so no
// editor or tool can normalise it away in the source.
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);

function parseWith(projectsDir: string, filePath: string, readChunkBytes?: number): Session {
  return new LogParser(projectsDir, { readChunkBytes }).parse(filePath, 'claude-code');
}

function chunkSizesFor(filePath: string): number[] {
  return fs.statSync(filePath).size > TINY_CHUNK_FILE_LIMIT ? CHUNK_SIZES.filter((size) => size >= 64) : CHUNK_SIZES;
}

function jsonLines(entries: object[]): string {
  return entries.map((entry) => JSON.stringify(entry) + '\n').join('');
}

function clearReads(): void {
  probe.reads.length = 0;
}

function launchEntry(id: string, name: string, description: string): object {
  return {
    type: 'assistant',
    timestamp: T0,
    message: {
      role: 'assistant',
      model: 'claude-opus-4-7',
      content: [{ type: 'tool_use', name: 'Agent', id, input: { name, description } }],
    },
  };
}

function completionEntry(id: string): object {
  return {
    type: 'user',
    timestamp: T0,
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'done' }] },
  };
}

describe('LogParser chunked reads', () => {
  let tmp: string;

  beforeEach(() => {
    clearReads();
    probe.failOnRead = 0;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chunked-read-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function writeTranscript(name: string, content: string | Buffer): string {
    const filePath = path.join(tmp, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  describe('the chunk size never changes what is parsed', () => {
    const realLogs = fs
      .readdirSync(REAL_LOGS_DIR)
      .filter((file) => file.endsWith('.jsonl'))
      .sort();

    it('discovered the real-log fixtures', () => {
      // Without this the it.each below registers nothing and "all green" would prove nothing.
      expect(realLogs.length).toBeGreaterThan(0);
    });

    it.each(realLogs)('real log %s parses identically for every chunk size', (file) => {
      const filePath = path.join(REAL_LOGS_DIR, file);
      const baseline = parseWith(REAL_LOGS_DIR, filePath);
      // A parse that failed returns an empty session (gitBranch 'unknown') and would make every
      // comparison below vacuously equal; every real-log fixture carries a real branch.
      expect(baseline.gitBranch).not.toBe('unknown');

      for (const size of chunkSizesFor(filePath)) {
        expect(parseWith(REAL_LOGS_DIR, filePath, size), `chunk of ${size} bytes`).toEqual(baseline);
      }
    });

    it('parses every schema-corpus sample identically for every chunk size', () => {
      const samples = fs.readdirSync(SCHEMA_CORPUS_DIR).filter((file) => file.endsWith('.jsonl'));
      expect(samples.length).toBeGreaterThan(0);

      for (const file of samples) {
        const filePath = path.join(SCHEMA_CORPUS_DIR, file);
        const baseline = parseWith(SCHEMA_CORPUS_DIR, filePath);
        for (const size of CHUNK_SIZES) {
          expect(parseWith(SCHEMA_CORPUS_DIR, filePath, size), `${file} with ${size}-byte chunks`).toEqual(baseline);
        }
      }
    });

    it('keeps accents, emoji and CJK intact when a chunk boundary falls inside a character', () => {
      const title = 'Título ação 日本語 🚀';
      const filePath = writeTranscript(
        'unicode.jsonl',
        jsonLines([
          {
            type: 'user',
            timestamp: T0,
            gitBranch: 'feat/café-ação',
            cwd: '/Users/dev/projetos/日本語',
            message: { role: 'user', content: [{ type: 'text', text: 'Revisar a configuração do Café ☕ 日本語' }] },
          },
          launchEntry('toolu_unicode_1', 'Agente Ñandú ☕', 'Verificar 日本語 e emoji 🚀 👩‍💻'),
          completionEntry('toolu_unicode_1'),
          launchEntry('toolu_unicode_2', '数据分析师', 'Análise 🚀'),
          { type: 'ai-title', aiTitle: title },
        ]),
      );
      const baseline = parseWith(tmp, filePath);

      // The baseline is one whole-file chunk, so these prove the decode itself is right...
      expect(baseline.sessionTitle).toBe(title);
      expect(baseline.gitBranch).toBe('feat/café-ação');
      expect(baseline.subagents.map(({ name, task, status }) => ({ name, task, status }))).toEqual([
        { name: 'Agente Ñandú ☕', task: 'Verificar 日本語 e emoji 🚀 👩‍💻', status: 'stopped' },
        { name: '数据分析师', task: 'Análise 🚀', status: 'working' },
      ]);

      // ...and these that no boundary alignment (every size 1..16 cuts a 2-, 3- and 4-byte
      // character at every possible offset) changes it.
      const alignments = Array.from({ length: 16 }, (_, index) => index + 1);
      for (const size of [...alignments, 64, 4096, READ_CHUNK_BYTES]) {
        const session = parseWith(tmp, filePath, size);
        expect(session, `chunk of ${size} bytes`).toEqual(baseline);
        expect(JSON.stringify(session)).not.toContain(REPLACEMENT_CHARACTER);
      }
    });

    it('parses a line far longer than a chunk as one whole line', () => {
      const prompt = 'A long prompt that opens the transcript and stays plain ASCII for the title. ';
      const filePath = writeTranscript(
        'long-line.jsonl',
        jsonLines([
          {
            type: 'user',
            timestamp: T0,
            message: { role: 'user', content: [{ type: 'text', text: prompt + 'ação 日本語 🚀 '.repeat(4000) }] },
            // After the long text on purpose: a line cut at a chunk boundary would lose it.
            gitBranch: 'feat/long-line',
          },
          launchEntry('toolu_after_long_line', 'Agent after the long line', 'Runs after it'),
        ]),
      );
      const baseline = parseWith(tmp, filePath);
      expect(baseline.gitBranch).toBe('feat/long-line');
      expect(baseline.subagents.map((subagent) => subagent.id)).toEqual(['toolu_after_long_line']);

      for (const size of [1, 7, 64, 4096]) {
        expect(parseWith(tmp, filePath, size), `chunk of ${size} bytes`).toEqual(baseline);
      }
    });
  });

  describe('no read is ever bigger than a chunk', () => {
    function expectContiguousBoundedReads(chunkBytes: number, fileBytes: number): void {
      expect(probe.reads.length, 'readSync was never called, so the probe proves nothing').toBeGreaterThan(0);
      let expectedPosition = 0;
      for (const read of probe.reads) {
        expect(read.length).toBeLessThanOrEqual(chunkBytes);
        expect(read.bufferBytes).toBeLessThanOrEqual(chunkBytes);
        expect(read.position).toBe(expectedPosition);
        expectedPosition += read.length;
      }
      expect(expectedPosition).toBe(fileBytes);
    }

    it('covers the whole file with reads of at most the injected chunk size', () => {
      const filePath = writeTranscript(
        'bounded.jsonl',
        jsonLines([launchEntry('toolu_bounded_1', 'Bounded', 'Read in pieces'), completionEntry('toolu_bounded_1')]),
      );
      const fileBytes = fs.statSync(filePath).size;

      parseWith(tmp, filePath, 64);

      expectContiguousBoundedReads(64, fileBytes);
      expect(probe.reads).toHaveLength(Math.ceil(fileBytes / 64));
    });

    it('never allocates or requests more than a chunk for a line longer than the chunk', () => {
      const filePath = writeTranscript(
        'bounded-long-line.jsonl',
        jsonLines([
          {
            type: 'user',
            timestamp: T0,
            message: { role: 'user', content: [{ type: 'text', text: 'x'.repeat(20_000) }] },
            gitBranch: 'feat/bounded',
          },
        ]),
      );

      const session = parseWith(tmp, filePath, 7);

      expectContiguousBoundedReads(7, fs.statSync(filePath).size);
      expect(session.gitBranch).toBe('feat/bounded');
    });

    it('reads a transcript larger than the default chunk in several bounded reads', () => {
      // Three lines of ~0.4 chunks each: the file is ~1.2 chunks, and the third line straddles the
      // boundary between the first and the second read.
      const padding = 'x'.repeat(Math.ceil(READ_CHUNK_BYTES / 2.5));
      const line = (extra: object): object => ({
        type: 'user',
        timestamp: T0,
        message: { role: 'user', content: [{ type: 'text', text: `Start ${padding}` }] },
        ...extra,
      });
      const filePath = writeTranscript(
        'bigger-than-a-chunk.jsonl',
        jsonLines([line({}), line({}), line({ gitBranch: 'feat/after-the-first-chunk' })]),
      );
      const fileBytes = fs.statSync(filePath).size;
      expect(fileBytes).toBeGreaterThan(READ_CHUNK_BYTES);

      const session = new LogParser(tmp).parse(filePath, 'claude-code');

      expectContiguousBoundedReads(READ_CHUNK_BYTES, fileBytes);
      expect(probe.reads.length).toBeGreaterThan(1);
      expect(session.gitBranch).toBe('feat/after-the-first-chunk');
    });
  });

  describe('a line still being written', () => {
    const tornEntry = launchEntry('toolu_torn_1', 'Café Agent ☕', 'handle 🚀 emoji across a torn read');
    const firstLines = jsonLines([
      { type: 'user', timestamp: T0, gitBranch: 'feat/torn', message: { role: 'user', content: 'first prompt' } },
      launchEntry('toolu_complete_1', 'Already complete', 'Finished before the torn line'),
    ]);

    it.each([1, 3, 7, 64])(
      'is held back and re-read whole, from its byte offset, with %i-byte chunks',
      (chunkBytes) => {
        const tornBytes = Buffer.from(JSON.stringify(tornEntry) + '\n', 'utf8');
        const tornText = tornBytes.toString('utf8');
        // Cut 2 bytes into the 4-byte emoji: the file then ends inside a character, which only a
        // byte-exact cursor survives (a UTF-16 length would land the next read mid-character).
        const cut = Buffer.byteLength(tornText.slice(0, tornText.indexOf('🚀')), 'utf8') + 2;
        const filePath = writeTranscript(
          'torn.jsonl',
          Buffer.concat([Buffer.from(firstLines), tornBytes.subarray(0, cut)]),
        );
        const parser = new LogParser(tmp, { readChunkBytes: chunkBytes });

        const torn = parser.parse(filePath, 'claude-code');
        expect(torn.subagents.map((subagent) => subagent.id)).toEqual(['toolu_complete_1']);

        // The writer finishes the torn line and adds another complete one.
        clearReads();
        fs.appendFileSync(
          filePath,
          Buffer.concat([tornBytes.subarray(cut), Buffer.from(jsonLines([completionEntry('toolu_torn_1')]))]),
        );
        const resumed = parser.parse(filePath, 'claude-code');

        // Resumes at the torn line's first BYTE — neither before it nor inside it.
        expect(probe.reads[0]?.position).toBe(Buffer.byteLength(firstLines, 'utf8'));
        expect(resumed.subagents.map(({ id, name, status }) => ({ id, name, status }))).toEqual([
          { id: 'toolu_complete_1', name: 'Already complete', status: 'working' },
          { id: 'toolu_torn_1', name: 'Café Agent ☕', status: 'stopped' },
        ]);
        expect(resumed).toEqual(new LogParser(tmp).parse(filePath, 'claude-code'));
      },
    );

    it('keeps the progress made so far when a later chunk cannot be read, without feeding lines twice', () => {
      const filePath = writeTranscript(
        'read-failure.jsonl',
        firstLines + jsonLines([completionEntry('toolu_complete_1')]),
      );
      const firstLineBytes = Buffer.byteLength(firstLines.slice(0, firstLines.indexOf('\n') + 1), 'utf8');
      // The first chunk holds line 1 and the start of line 2; the second read hits a disk error.
      const parser = new LogParser(tmp, { readChunkBytes: firstLineBytes + 10 });
      probe.failOnRead = 2;

      const partial = parser.parse(filePath, 'claude-code');
      expect(partial.gitBranch).toBe('feat/torn');
      expect(partial.subagents).toEqual([]);

      // Next tick: the disk recovered. The cursor sits right after line 1, so nothing is read twice.
      probe.failOnRead = 0;
      clearReads();
      const recovered = parser.parse(filePath, 'claude-code');
      expect(probe.reads[0]?.position).toBe(firstLineBytes);
      expect(recovered).toEqual(new LogParser(tmp).parse(filePath, 'claude-code'));
      expect(recovered.subagents.map((subagent) => subagent.status)).toEqual(['stopped']);
    });

    it.each([1, 7, undefined])(
      'is not wedged by a FIRST line torn inside a multi-byte character (chunk %s)',
      (chunkBytes) => {
        // Regression: the old cursor arithmetic re-counted the decoder's U+FFFD (3 bytes) for the
        // torn character (1-2 bytes). With the torn line as the only content so far that put the
        // cursor at -2: every later readSync threw ERR_OUT_OF_RANGE, parse() swallowed it into an
        // empty session, and the session never recovered even after the line was completed.
        const lineBytes = Buffer.from(
          jsonLines([
            {
              type: 'user',
              timestamp: T0,
              gitBranch: 'feat/first-line-torn',
              message: { role: 'user', content: 'ação' },
            },
          ]),
          'utf8',
        );
        const cut = lineBytes.indexOf(Buffer.from('ç', 'utf8')) + 1; // inside the 2-byte 'ç'
        const filePath = writeTranscript('first-line-torn.jsonl', lineBytes.subarray(0, cut));
        const parser = new LogParser(tmp, { readChunkBytes: chunkBytes });
        parser.parse(filePath, 'claude-code');

        clearReads();
        fs.appendFileSync(filePath, lineBytes.subarray(cut));
        const session = parser.parse(filePath, 'claude-code');

        expect(probe.reads[0]?.position).toBe(0);
        expect(session.gitBranch).toBe('feat/first-line-torn');
      },
    );
  });

  describe('files with no real lines, and other line endings', () => {
    it.each([
      ['an empty file', ''],
      ['a file of only a newline', '\n'],
      ['a file of only blank lines', '\n\r\n \n\n'],
    ])('parses %s into an empty session', (_label, content) => {
      const filePath = writeTranscript('blank.jsonl', content);
      const fileBytes = Buffer.byteLength(content, 'utf8');

      for (const size of [1, 64, undefined]) {
        clearReads();
        const session = parseWith(tmp, filePath, size);

        expect(session.subagents).toEqual([]);
        expect(session.sessionTitle).toBeUndefined();
        expect(session.gitBranch).toBe('unknown');
        // An empty file has nothing to read; any other is read in ceil(bytes / chunk) bounded reads.
        expect(probe.reads).toHaveLength(Math.ceil(fileBytes / (size ?? READ_CHUNK_BYTES)));
      }
    });

    it('picks up a line appended after a newline-only file', () => {
      const filePath = writeTranscript('newline-then-line.jsonl', '\n');
      const parser = new LogParser(tmp, { readChunkBytes: 1 });
      parser.parse(filePath, 'claude-code');

      fs.appendFileSync(filePath, jsonLines([launchEntry('toolu_late_1', 'Late', 'Arrived after a blank file')]));

      expect(parser.parse(filePath, 'claude-code').subagents.map((subagent) => subagent.id)).toEqual(['toolu_late_1']);
    });

    it('parses CRLF line endings like LF, even when a chunk splits the CR from the LF', () => {
      const entries = [
        { type: 'user', timestamp: T0, gitBranch: 'feat/crlf', message: { role: 'user', content: 'crlf prompt' } },
        launchEntry('toolu_crlf_1', 'CRLF agent', 'Line ends with a carriage return'),
      ];
      const lf = writeTranscript('lf.jsonl', jsonLines(entries));
      const crlf = writeTranscript('crlf.jsonl', entries.map((entry) => JSON.stringify(entry) + '\r\n').join(''));
      const summarize = (session: Session): object => ({
        title: session.sessionTitle,
        branch: session.gitBranch,
        subagents: session.subagents,
      });

      for (const size of [1, 2, 64, undefined]) {
        expect(summarize(parseWith(tmp, crlf, size)), `chunk of ${String(size)} bytes`).toEqual(
          summarize(parseWith(tmp, lf)),
        );
      }
    });
  });

  describe('the readChunkBytes option', () => {
    it.each([0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'falls back to the default chunk for the invalid value %s',
      (invalid) => {
        const filePath = writeTranscript('option.jsonl', jsonLines([launchEntry('toolu_option_1', 'Option', 'Task')]));
        const fileBytes = fs.statSync(filePath).size;

        const session = parseWith(tmp, filePath, invalid);

        // One read covering the whole (small) file is what the default chunk does.
        expect(probe.reads.map((read) => read.length)).toEqual([fileBytes]);
        expect(session.subagents.map((subagent) => subagent.id)).toEqual(['toolu_option_1']);
      },
    );
  });
});
