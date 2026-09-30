import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Write the debug log to the OS temp dir, not a hardcoded absolute path — the extension
// ships in the bundle and must not assume any particular machine or checkout location.
const LOG_FILE_PATH = path.join(os.tmpdir(), 'claude-agents-monitor-debug.log');

// At this size the log is rotated to `<file>.1`, so the log and its one backup together stay near
// twice the cap. It used to grow without limit (235 MB on one machine).
export const MAX_LOG_BYTES = 2 * 1024 * 1024;

// A file this many times over the cap is a leftover from before the cap existed, or from a runaway
// writer: keeping it as `.1` would keep all of its disk space in use, so it is deleted instead.
const RUNAWAY_FACTOR = 2;

// The log holds local paths and session ids: only its owner may read it.
const OWNER_ONLY = 0o600;

export type DebugLogger = (message: string) => void;

// Open flags that exist only on POSIX read as 0 elsewhere.
function optionalFlag(name: 'O_NOFOLLOW' | 'O_NONBLOCK'): number {
  return name in fs.constants ? fs.constants[name] : 0;
}

// Read at call time, not at import: `sidecarReader` pulls this module into tests that replace `fs`
// wholesale, and a module-level `fs.constants` read would make that import throw.
//  - O_NOFOLLOW: a symlink planted at the predictable path fails open() with ELOOP instead of being
//    written through.
//  - O_NONBLOCK: a FIFO planted there fails with ENXIO instead of blocking the extension host for
//    good. It changes nothing for a regular file.
function appendFlags(): number {
  const { O_WRONLY, O_APPEND, O_CREAT } = fs.constants;
  return O_WRONLY | O_APPEND | O_CREAT | optionalFlag('O_NOFOLLOW') | optionalFlag('O_NONBLOCK');
}

// In a shared temp dir the predictable path can be made to name anything, so the check is on the object
// the descriptor really refers to: a regular file with no other hard link (one planted to somebody
// else's file would otherwise be chmod-ed and appended to) that belongs to us, wherever the OS has uids.
function isOurRegularFile(stats: fs.Stats): boolean {
  const uid = process.getuid?.();
  return stats.isFile() && stats.nlink === 1 && (uid === undefined || stats.uid === uid);
}

// Opens the log, vets what the descriptor refers to, and runs `use` on it; the descriptor is always
// closed afterwards. `use` is never called, and the result is undefined, for an object that is not ours.
function withLog<T>(file: string, use: (fd: number, size: number) => T): T | undefined {
  const fd = fs.openSync(file, appendFlags(), OWNER_ONLY);
  try {
    const stats = fs.fstatSync(fd);
    return isOurRegularFile(stats) ? use(fd, stats.size) : undefined;
  } finally {
    fs.closeSync(fd);
  }
}

// Best-effort `chmod 600` through the descriptor, not the path (which could be swapped for a link):
// older versions created the log world-readable (0644). Does nothing on Windows, where chmod only
// toggles the read-only flag.
function restrictToOwner(fd: number): void {
  if (process.platform === 'win32') return;
  try {
    fs.fchmodSync(fd, OWNER_ONLY);
  } catch {
    // Nothing more to do: the entry is still appended.
  }
}

// Moves the full log to `<file>.1`, replacing any earlier backup. By path on purpose: rename and unlink
// act on the name and never follow a link, and nothing here truncates.
// ponytail: no cross-window lock, so two windows rotating in the same instant can lose one backup
// generation — fine for a debug log; a lock file is the upgrade if that ever matters.
function moveToBackup(file: string): void {
  const backup = `${file}.1`;
  try {
    fs.renameSync(file, backup);
  } catch {
    // Renaming over an existing file can fail on Windows (EPERM) while something holds it open:
    // delete the old backup and retry once.
    fs.rmSync(backup, { force: true });
    fs.renameSync(file, backup);
  }
}

/**
 * Builds a debug logger that appends `[ISO timestamp] message` lines to `file`, bounded to about
 * `maxBytes` (plus one backup) and readable by the owner only. It never throws and never logs about
 * itself — a logger that reported its own failure through itself would recurse. A rotation that
 * fails drops the entry: the log stays within its cap rather than grow past it.
 */
export function createDebugLogger({ file, maxBytes }: { file: string; maxBytes: number }): DebugLogger {
  let isFirstUse = true;

  // Appends the entry unless the log is already full; then nothing is written and the log's size comes
  // back, for the caller to rotate. Also undefined when the file was refused.
  const appendUnlessFull = (entry: string): number | undefined =>
    withLog(file, (fd, size) => {
      if (isFirstUse) {
        isFirstUse = false;
        restrictToOwner(fd); // before a rotation can turn a legacy file into a world-readable `.1`
      }
      if (size >= maxBytes) return size;
      fs.writeFileSync(fd, entry); // unlike a single writeSync it loops, so a short write cannot tear the line
      return undefined;
    });

  return (message) => {
    try {
      const entry = `[${new Date().toISOString()}] ${message}\n`;
      const fullSize = appendUnlessFull(entry);
      if (fullSize === undefined) return;
      if (fullSize >= RUNAWAY_FACTOR * maxBytes) fs.rmSync(file, { force: true });
      else moveToBackup(file);
      appendUnlessFull(entry); // a fresh descriptor on the fresh file, vetted again
    } catch {
      // Ignore logging errors to prevent secondary failures
    }
  };
}

export const logDebug: DebugLogger = createDebugLogger({ file: LOG_FILE_PATH, maxBytes: MAX_LOG_BYTES });
