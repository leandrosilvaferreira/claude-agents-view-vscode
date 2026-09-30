import * as path from 'path';

// Pure — imports no `vscode`. Applied where a path enters the extension: to every `uri.fsPath` at the
// watcher boundary (sessionFileWatchers.ts) and to the transcript roots (sessionTreeDataProvider.ts).
const LOWER_CASE_DRIVE_LETTER = /^[a-z]:/;

/**
 * One spelling per file, so a path can be used as a cache key or compared with `===`.
 *
 * On Windows `vscode.Uri.fsPath` always lower-cases the drive letter (`c:\Users\...`), while a path the
 * extension builds itself — from `os.homedir()` or `CODEX_HOME` and the directory scan — keeps the
 * spelling of its source: normally `C:\Users\...`, but a hand-set `CODEX_HOME` can say `d:\codex`. A
 * watcher event would then reach the path-keyed state (LogParser's byte cursor and parse cache, the Codex
 * delete comparison) under a different key than the scan used for the very same transcript: two cursors,
 * two parse states, and a delete that never matches. So both ends go through here — every `uri.fsPath`
 * the watchers hand out, and the roots every scanned path is built from — and only the drive letter is
 * normalized, to upper case; everything else (UNC, relative and empty strings) is left alone. No other
 * platform has drive letters — a POSIX path is never rewritten. Pure: it never throws.
 */
export function canonicalFsPath(filePath: string, platform: NodeJS.Platform = process.platform): string {
  if (platform !== 'win32') return filePath;
  return filePath.replace(LOWER_CASE_DRIVE_LETTER, (drive) => drive.toUpperCase());
}

/** `path.join` for a path the extension builds itself (a transcript root): the result is canonical. */
export function canonicalJoin(...parts: string[]): string {
  return canonicalFsPath(path.join(...parts));
}
