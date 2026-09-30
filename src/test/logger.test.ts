import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createDebugLogger, MAX_LOG_BYTES } from '../logger';

// Everything hits the real file system, except that three calls are wrapped so a test can watch or break them:
//  - `renameSync`: renaming over an existing file only fails on Windows, so this is the one way to exercise
//    the fallback on the other platforms.
//  - `openSync`: a FIFO planted at the log path cannot be reproduced here (`mkfifo` needs `child_process`,
//    which the lint config bans under src/), so the flags that make one fail fast are checked at the call.
//  - `fstatSync`: for the same reason, what a FIFO looks like to fstat (ours, one link, not a regular file)
//    is faked to reach the refusal of anything that is not a regular file.
//  - `closeSync`: a leaked descriptor would eventually starve the extension host.
// Each still does the real thing unless a test says otherwise. `default` gets the same wrappers, so an
// `import fs from 'fs'` cannot bypass them.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  const wrapped = {
    ...actual,
    openSync: vi.fn(actual.openSync),
    fstatSync: vi.fn(actual.fstatSync),
    closeSync: vi.fn(actual.closeSync),
    renameSync: vi.fn(actual.renameSync),
  };
  return { ...wrapped, default: wrapped };
});

// Every entry is "[<24-character ISO timestamp>] <message>\n", so entries with equally long messages are
// equally many bytes. That lets a test size the cap in whole entries instead of guessing byte counts.
function entryBytes(message: string): number {
  return Buffer.byteLength(`[${new Date(0).toISOString()}] ${message}\n`);
}

/** `line-0`, `line-1`, ... — all the same length, so `entryBytes('line-0')` is the size of every entry. */
function numbered(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `line-${index}`);
}

const ENTRY_PATTERN = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] (.*)$/;

/** The messages of a log file in order, with each "[timestamp] " prefix checked and stripped. */
function messages(target: string): string[] {
  return fs
    .readFileSync(target, 'utf8')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const match = ENTRY_PATTERN.exec(line);
      expect(match, `not a log entry: ${line}`).not.toBeNull();
      return match?.[1] ?? '';
    });
}

const itPosix = it.skipIf(process.platform === 'win32');

function modeOf(target: string): number {
  return fs.statSync(target).mode & 0o777;
}

describe('createDebugLogger', () => {
  let dir: string;
  let file: string;
  let backup: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-logger-test-'));
    file = path.join(dir, 'debug.log');
    backup = `${file}.1`;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Back to the real functions, with their call history cleared (and any failure a test left queued dropped).
    vi.mocked(fs.openSync).mockReset();
    vi.mocked(fs.fstatSync).mockReset();
    vi.mocked(fs.closeSync).mockReset();
    vi.mocked(fs.renameSync).mockReset();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Someone else's world-readable file, which a planted link would point at. */
  function makeVictim(): string {
    const victim = path.join(dir, 'victim.txt');
    fs.writeFileSync(victim, 'precious\n');
    fs.chmodSync(victim, 0o644);
    return victim;
  }

  function expectUntouched(victim: string): void {
    expect(fs.readFileSync(victim, 'utf8')).toBe('precious\n'); // nothing was written through the link
    expect(modeOf(victim)).toBe(0o644); // and its mode was not touched
  }

  describe('appending', () => {
    it('writes one "[ISO timestamp] message" line per call, in call order', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const logDebug = createDebugLogger({ file, maxBytes: MAX_LOG_BYTES });

      vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
      logDebug('first');
      vi.setSystemTime(new Date('2026-09-30T12:00:01.500Z'));
      logDebug('second');

      expect(fs.readFileSync(file, 'utf8')).toBe(
        '[2026-09-30T12:00:00.000Z] first\n[2026-09-30T12:00:01.500Z] second\n',
      );
    });

    it('keeps the contents of an existing file under the cap and appends after them', () => {
      fs.writeFileSync(file, 'earlier run\n');

      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('this run');

      expect(fs.readFileSync(file, 'utf8')).toMatch(/^earlier run\n\[.+\] this run\n$/);
    });
  });

  describe('rotation', () => {
    const maxBytes = 3 * entryBytes('line-0'); // the cap holds exactly three of the entries below

    it('moves a full log to <file>.1 and continues in a fresh file', () => {
      const logDebug = createDebugLogger({ file, maxBytes });

      for (const message of numbered(4)) logDebug(message);

      expect(messages(backup)).toEqual(['line-0', 'line-1', 'line-2']);
      expect(messages(file)).toEqual(['line-3']);
    });

    it('keeps a single backup: each rotation replaces the previous <file>.1', () => {
      const logDebug = createDebugLogger({ file, maxBytes });

      for (const message of numbered(10)) {
        logDebug(message);
        // The cap is checked before a write, so the log overshoots it by at most one entry.
        expect(fs.statSync(file).size).toBeLessThanOrEqual(maxBytes + entryBytes(message));
      }

      expect(messages(backup)).toEqual(['line-6', 'line-7', 'line-8']);
      expect(messages(file)).toEqual(['line-9']);
      expect(fs.readdirSync(dir).sort()).toEqual(['debug.log', 'debug.log.1']);
    });

    it('rotates as soon as another writer has filled the log', () => {
      const cap = 10_000;
      const logDebug = createDebugLogger({ file, maxBytes: cap });
      logDebug('first');

      // Another VS Code window appends to the same file: past the cap, but under twice the cap.
      fs.appendFileSync(file, 'y'.repeat(cap + 50));
      logDebug('second');

      expect(fs.statSync(backup).size).toBeGreaterThanOrEqual(cap);
      expect(messages(file)).toEqual(['second']);
    });

    it('deletes the old backup and renames again when the first rename over it fails (as it can on Windows)', () => {
      const logDebug = createDebugLogger({ file, maxBytes });
      for (const message of numbered(3)) logDebug(message);
      fs.writeFileSync(backup, 'an older backup\n');
      vi.mocked(fs.renameSync).mockImplementationOnce(() => {
        throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' });
      });

      logDebug('line-3');

      expect(fs.renameSync).toHaveBeenCalledTimes(2); // the injected failure did happen, and was retried
      expect(messages(backup)).toEqual(['line-0', 'line-1', 'line-2']);
      expect(messages(file)).toEqual(['line-3']);
    });
  });

  describe('a file that is already too big on first use', () => {
    const maxBytes = 100;

    it('rotates a file between the cap and twice the cap into <file>.1', () => {
      fs.writeFileSync(file, 'x'.repeat(2 * maxBytes - 1));

      createDebugLogger({ file, maxBytes })('after');

      expect(fs.readFileSync(backup, 'utf8')).toBe('x'.repeat(2 * maxBytes - 1));
      expect(messages(file)).toEqual(['after']);
    });

    it.each([2, 3])('deletes a file %i times the cap instead of keeping it as <file>.1', (factor) => {
      fs.writeFileSync(file, 'x'.repeat(factor * maxBytes));

      createDebugLogger({ file, maxBytes })('after');

      expect(fs.existsSync(backup)).toBe(false);
      expect(messages(file)).toEqual(['after']);
    });
  });

  describe('never throws', () => {
    it('when the directory does not exist', () => {
      const logDebug = createDebugLogger({ file: path.join(dir, 'missing', 'debug.log'), maxBytes: 100 });

      expect(() => {
        logDebug('x');
      }).not.toThrow();
      expect(fs.existsSync(path.join(dir, 'missing'))).toBe(false);
    });

    it('when the "directory" is a regular file', () => {
      const notADirectory = path.join(dir, 'plain-file');
      fs.writeFileSync(notADirectory, 'content');
      const logDebug = createDebugLogger({ file: path.join(notADirectory, 'debug.log'), maxBytes: 100 });

      expect(() => {
        logDebug('x');
      }).not.toThrow();
      expect(fs.readFileSync(notADirectory, 'utf8')).toBe('content');
    });

    it('when the log path itself is a directory', () => {
      fs.mkdirSync(file);
      const logDebug = createDebugLogger({ file, maxBytes: 100 });

      expect(() => {
        logDebug('x');
        logDebug('y');
      }).not.toThrow();
      expect(fs.statSync(file).isDirectory()).toBe(true);
    });

    it('when the backup cannot be replaced, and then drops entries instead of growing past the cap', () => {
      const maxBytes = 100;
      fs.writeFileSync(file, 'x'.repeat(maxBytes));
      fs.mkdirSync(backup);
      fs.writeFileSync(path.join(backup, 'inside'), 'a directory that is not empty cannot be replaced by a file');
      const logDebug = createDebugLogger({ file, maxBytes });

      expect(() => {
        logDebug('x');
      }).not.toThrow();
      expect(fs.readFileSync(file, 'utf8')).toBe('x'.repeat(maxBytes));
    });
  });

  describe('privacy, and objects planted at the log path', () => {
    itPosix('creates the log readable by its owner only (0600)', () => {
      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');

      expect(modeOf(file)).toBe(0o600);
    });

    itPosix('tightens a pre-existing world-readable log to 0600 and keeps its contents', () => {
      fs.writeFileSync(file, 'from an older version\n');
      fs.chmodSync(file, 0o644); // how older versions of this extension created it

      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');

      expect(modeOf(file)).toBe(0o600);
      expect(fs.readFileSync(file, 'utf8')).toMatch(/^from an older version\n\[.+\] hello\n$/);
    });

    itPosix('does not leave a world-readable <file>.1 behind when rotating an older version’s log', () => {
      const maxBytes = 100;
      fs.writeFileSync(file, 'x'.repeat(maxBytes + 1));
      fs.chmodSync(file, 0o644);

      createDebugLogger({ file, maxBytes })('hello');

      expect(modeOf(backup)).toBe(0o600);
      expect(modeOf(file)).toBe(0o600);
    });

    itPosix('never follows a symlink planted at the log path', () => {
      const victim = makeVictim();
      fs.symlinkSync(victim, file);
      // A cap far below the sizes in play, so that code which measured the link or its target would
      // rotate or delete it.
      const logDebug = createDebugLogger({ file, maxBytes: 4 });

      expect(() => {
        logDebug('hello');
        logDebug('again');
      }).not.toThrow();

      expectUntouched(victim);
      expect(fs.lstatSync(file).isSymbolicLink()).toBe(true); // and the link was not replaced or moved
      expect(fs.existsSync(backup)).toBe(false);
    });

    itPosix('does not create the target of a dangling symlink planted at the log path', () => {
      const target = path.join(dir, 'not-created.txt');
      fs.symlinkSync(target, file);

      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');

      expect(fs.existsSync(target)).toBe(false);
    });

    itPosix('never writes to, or changes the mode of, a hard link planted at the log path', () => {
      const victim = makeVictim();
      fs.linkSync(victim, file);

      expect(() => {
        createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');
      }).not.toThrow();

      expectUntouched(victim);
    });

    itPosix('checks the file on every append, not only the first one', () => {
      const victim = makeVictim();
      const logDebug = createDebugLogger({ file, maxBytes: MAX_LOG_BYTES });
      logDebug('first'); // creates the log: ours, one link, nothing wrong with it
      fs.rmSync(file); // then the name is swapped for a hard link to someone else's file
      fs.linkSync(victim, file);

      logDebug('second');

      expectUntouched(victim);
    });

    itPosix('refuses, and leaves untouched, a file that belongs to another user', () => {
      fs.writeFileSync(file, 'theirs\n');
      fs.chmodSync(file, 0o644);
      vi.spyOn(process, 'getuid').mockReturnValue(fs.statSync(file).uid + 1);

      expect(() => {
        createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');
      }).not.toThrow();

      expect(fs.readFileSync(file, 'utf8')).toBe('theirs\n');
      expect(modeOf(file)).toBe(0o644);
    });

    it('refuses an object that is not a regular file, such as a FIFO or a device', () => {
      fs.writeFileSync(file, 'keep\n');
      // A real FIFO cannot be planted here, so fstat is told what one looks like: ours, a single link, but
      // not a regular file. Only the regular-file check can turn this one away.
      const notARegularFile = Object.assign(fs.statSync(file), { isFile: () => false });
      vi.mocked(fs.fstatSync).mockImplementationOnce(() => notARegularFile);

      expect(() => {
        createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');
      }).not.toThrow();

      expect(fs.readFileSync(file, 'utf8')).toBe('keep\n');
    });

    itPosix('opens without following a symlink and without blocking on a FIFO', () => {
      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('hello');

      const [, flags] = vi.mocked(fs.openSync).mock.calls.at(0) ?? [];
      if (typeof flags !== 'number') throw new Error('openSync was not called with numeric flags');
      expect(flags & fs.constants.O_NOFOLLOW).not.toBe(0);
      expect(flags & fs.constants.O_NONBLOCK).not.toBe(0);
    });

    itPosix('closes every descriptor it opens: after a refusal, a write and a rotation', () => {
      const victim = makeVictim();
      fs.linkSync(victim, file);
      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('refused'); // opened, found to have a second link
      fs.rmSync(file);
      createDebugLogger({ file, maxBytes: MAX_LOG_BYTES })('written');
      // A full log: one descriptor to look at it, and a second one on the fresh file after the rotation.
      createDebugLogger({ file, maxBytes: entryBytes('written') })('rotated');

      const opened = vi.mocked(fs.openSync).mock.results.filter((result) => result.type === 'return').length;
      expect(opened).toBe(4);
      expect(fs.closeSync).toHaveBeenCalledTimes(opened);
      expect(fs.existsSync(backup)).toBe(true); // it really was the rotation path
    });
  });
});
