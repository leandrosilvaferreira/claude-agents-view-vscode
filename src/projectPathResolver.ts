import * as fs from 'fs';
import * as path from 'path';
import { LogEntry } from './transcriptEntry';
import { Session } from './types';
import { encodeProjectDir } from './sidecarReader';

/**
 * Works out the repo context a transcript belongs to: which project, which git branch, and
 * (Claude Code only) which git worktree.
 *
 * Neither brand states the project outright. Claude Code encodes the project directory into the
 * folder name and stamps the real `cwd` on every entry; Antigravity states it only inside prose
 * fields ("Active Document: …") or a tool call's `Cwd`. Both cases fall back to walking up the
 * file system for a project marker. Branch and worktree name are simpler — Claude Code stamps
 * `gitBranch` directly, and a `worktree-state` entry's `worktreeSession.worktreeName` needs no
 * decoding. All three are kept out of LogParser because none of it depends on the incremental-read
 * machinery — it only ever looks at one entry, or one path, at a time.
 */
export class ProjectPathResolver {
  private decodedPathCache = new Map<string, string>();

  /** Fill in `session.projectPath` from whatever this entry reveals. Silent when it reveals nothing. */
  public detectProjectPath(json: LogEntry, session: Session): void {
    if (session.type === 'claude-code') {
      this.detectClaudeCodeProjectPath(json, session);
      return;
    }

    // 1. Extract from Active Document metadata in USER_INPUT
    if (json.type === 'USER_INPUT' && typeof json.content === 'string') {
      const activeDocMatch = json.content.match(/Active Document:\s*([^\n]+)/);
      if (activeDocMatch) {
        this.setProjectPath(session, this.findProjectRoot(activeDocMatch[1].trim()));
        return;
      }
      const otherDocMatch = json.content.match(/Other open documents:\s*-\s*([^\n]+)/);
      if (otherDocMatch) {
        this.setProjectPath(session, this.findProjectRoot(otherDocMatch[1].trim()));
        return;
      }
    }

    // 2. Extract from Cwd
    const cwd = this.extractCwd(json);
    if (cwd) {
      this.setProjectPath(session, cwd);
      return;
    }

    // 3. Extract from TargetFile
    if (json.TargetFile) {
      this.setProjectPath(session, this.findProjectRoot(json.TargetFile));
    }
  }

  public detectGitBranch(json: LogEntry, session: Session): void {
    if (json.gitBranch) {
      session.gitBranch = json.gitBranch;
    } else if (json.git && typeof json.git.branch === 'string') {
      session.gitBranch = json.git.branch;
    }
  }

  /** Tracks the git-worktree name Claude Code will later echo into an auto-stamped
   * `custom-title`, so logParser.ts's detectSessionTitle can recognize that echo (via
   * nameExtractor.ts's extractRenamedTitle) instead of trusting it as a real user rename.
   *
   * Prefers a PATH-derived name (this method's own deriveWorktreeNameFromCwd, applied to
   * `worktreeSession.worktreePath` when an explicit `type:"worktree-state"` entry is present,
   * else to the current line's own `cwd`) over the entry's bare `worktreeSession.worktreeName`
   * field. Real capture (session `9a282de8-...`, worktree `.../swapo-app/.claude/worktrees/
   * feat/787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t`) shows why: for this NESTED
   * `<type>/<slug>` layout, `worktreeName` held only the bare leaf slug
   * ("787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t", no "feat/" prefix), while Claude Code's own
   * `custom-title` auto-stamp on the SAME transcript was `"feat"` — drawn from the worktree's own
   * PATH, not from that field, so a comparison against the bare `worktreeName` alone could never
   * recognize it (see nameExtractor.ts's extractRenamedTitle for the first-segment-tolerant
   * comparison this feeds). `worktreePath` carries the full nested shape the auto-stamp is
   * actually drawn from, so it's preferred; the bare `worktreeName` field is kept only as a
   * fallback for a `worktree-state` entry that carries no `worktreePath` at all.
   *
   * The path-derived branch runs unconditionally whenever `worktreeSession` is present (even
   * `worktreeSession: null`, which the `typeof pathSource === 'string'` / `typeof
   * json.worktreeSession?.worktreeName === 'string'` checks both silently no-op on) — it may
   * overwrite an earlier guess, matching the existing "latches to the LAST worktree entered"
   * semantic. The FALLBACK branch below (no `worktreeSession` on this line at all — the common
   * case for a session that starts with `cwd` already inside a worktree, since Claude Code then
   * never writes a `worktree-state` entry at all) is guarded on `session.worktreeName ===
   * undefined` so it only ever sets a first guess, never re-derives on every subsequent line.
   *
   * KNOWN LIMITATION, deliberately not "fixed": once set (either branch), this never clears, so
   * session.worktreeName latches to the LAST worktree entered for the rest of the session's life
   * — a later GENUINE user rename that happens to coincide with a past worktree's name would be
   * wrongly rejected as an auto-stamp echo. A clearing rule keyed on "relocated back to a bare,
   * non-worktree cwd" was tried and reverted: real evidence (session
   * `7ac34ece-fdce-41ad-9898-886d832035ec`) shows Claude Code can relocate a session OUT of a
   * worktree to a bare cwd and then back — a worktree-state entry with `worktreeSession: null` in
   * between — while STILL re-stamping the identical customTitle auto-echo afterward. Clearing on
   * that "exit" signal made the SECOND, still-bogus auto-stamp get wrongly ACCEPTED as a real
   * rename instead — reopening a worse form of the very bug this function exists to prevent. No
   * reliable "permanently left this worktree" signal was found in the real corpus, so per this
   * project's own architecture-no-public-transcript-schema lesson (don't speculatively engineer
   * for a case real data doesn't confirm), the one-way latch stays as the deliberately-narrower,
   * safer default. ponytail: deriveWorktreeNameFromCwd only matches a `.../worktrees/<name>/...`
   * layout (this project's and Claude Code's own convention) — a layout with no `worktrees`
   * segment falls back to the bare `worktreeName` field (explicit entry) or stays undefined
   * (fallback branch). */
  public detectWorktreeName(json: LogEntry, session: Session): void {
    if (json.worktreeSession) {
      const pathSource = json.worktreeSession.worktreePath;
      const derived = typeof pathSource === 'string' ? this.deriveWorktreeNameFromCwd(pathSource) : undefined;
      const name = derived ?? json.worktreeSession.worktreeName;
      if (typeof name === 'string') {
        session.worktreeName = name;
      }
      return;
    }
    if (session.worktreeName === undefined && typeof json.cwd === 'string') {
      const fallback = this.deriveWorktreeNameFromCwd(json.cwd);
      if (fallback) {
        session.worktreeName = fallback;
      }
    }
  }

  /** Full path remaining after a `worktrees` directory in `cwd` — POSIX split is correct even
   * cross-platform here, since Claude Code's `cwd` is always POSIX-shaped (see this class's own
   * header comment). `.../swapo-app/.claude/worktrees/feat/787-saque-...` ->
   * `"feat/787-saque-..."`, matching the shape a real `worktree-state` entry's own
   * `worktreeSession.worktreeName` carries. Undefined when `cwd` has no `worktrees` segment, or
   * `worktrees` is its last segment (nothing follows it to name the worktree). */
  private deriveWorktreeNameFromCwd(cwd: string): string | undefined {
    const segments = cwd.split('/');
    const idx = segments.lastIndexOf('worktrees');
    if (idx === -1 || idx + 1 >= segments.length) return undefined;
    const rest = segments.slice(idx + 1).join('/');
    return rest || undefined;
  }

  /**
   * Best-effort reconstruction of a real path from Claude Code's encoded project-directory name.
   * Only a fallback: `detectProjectPath` prefers the transcript's own `cwd`, because the encoding
   * collapses every non-alphanumeric character — including `_` and `.` — onto the same `-` as the
   * path separator, making it ambiguous to decode. Walks the file system to disambiguate.
   */
  public decodeClaudeProjectPath(projectDir: string): string {
    // On Windows the encoded name won't start with '-' (a POSIX cwd always does, since it
    // starts with '/'), so this guard falls through unchanged. Harmless: `detectClaudeCodeProjectPath`
    // always prefers the real `cwd` field, which self-corrects this on the first parsed line.
    if (!projectDir.startsWith('-')) return projectDir;
    const cached = this.decodedPathCache.get(projectDir);
    if (cached !== undefined) return cached;

    const parts = projectDir.substring(1).split('-');
    let currentPath = '/';
    let i = 0;
    while (i < parts.length) {
      let foundNext = false;
      for (let len = parts.length - i; len > 0; len--) {
        const candidate = path.join(currentPath, parts.slice(i, i + len).join('-'));
        if (fs.existsSync(candidate)) {
          currentPath = candidate;
          i += len;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
        currentPath = path.join(currentPath, parts[i]);
        i++;
      }
    }
    this.decodedPathCache.set(projectDir, currentPath);
    return currentPath;
  }

  /**
   * The single place `projectPath` is ever assigned, across all five call sites in this class
   * (Claude Code's own `cwd` field, and the four Antigravity fallbacks in `detectProjectPath`).
   * Also maintains `session.knownProjectDirs` as a most-recently-used list of every encoded
   * sidecar directory `projectPath` has ever resolved to — a revisited dir moves to the end
   * instead of staying at its first-seen position — see that field's own doc comment in types.ts
   * for why: `projectPath` alone only ever reflects the LATEST cwd seen on this transcript, so a
   * session that enters a git worktree, dispatches subagents there (their sidecars land ONLY
   * under the worktree's own encoded directory — see sidecarReader.ts's candidateMetadataDirs),
   * then leaves the worktree again would otherwise silently and permanently drop that directory
   * from every future sidecar lookup the moment `projectPath` reverts to the base cwd. Real
   * corpus (14-day audit, 2026-08-21): 27 of 34 worktree-split sessions ended exactly this way.
   * The MRU ordering matters too, not just membership: `candidateMetadataDirs` relies on the
   * MOST RECENT dir being LAST here so `readAllSidecars`' "later dir wins" dedup resolves to the
   * most-recently-active directory on a collision — a base(A)→worktree(B)→base(A) session must
   * end up `[B, A]` (A last, since it's current), not `[A, B]` (code-review finding, 2026-08-21: a
   * plain push-if-new list left A in its original first-seen position on the revisit, so it never
   * moved to the winning slot). That alone isn't sufficient, though: `candidateMetadataDirs` still
   * has to avoid unconditionally forcing the base directory's path to the front regardless of this
   * ordering — see that function's own doc comment for the companion half of this fix. A raw
   * `session.projectPath = x` assignment at any call site would reopen the original drop bug for
   * it, and a plain push-if-new would reopen this narrower ordering one.
   */
  private setProjectPath(session: Session, projectPath: string): void {
    session.projectPath = projectPath;
    const encodedDir = encodeProjectDir(projectPath);
    const knownDirs = session.knownProjectDirs ?? [];
    session.knownProjectDirs = [...knownDirs.filter((dir) => dir !== encodedDir), encodedDir];
  }

  private detectClaudeCodeProjectPath(json: LogEntry, session: Session): void {
    // The project-directory name Claude Code encodes to (e.g. `-Users-me-aia_harness` for
    // `/Users/me/aia_harness`) is ambiguous to decode: every non-alphanumeric character,
    // including `_` and `.`, collapses to the same `-` as the path separator. The transcript's
    // own `cwd` field carries the real, unambiguous path — always prefer it over the guess.
    if (typeof json.cwd === 'string' && json.cwd.trim()) {
      this.setProjectPath(session, json.cwd.trim());
      session.projectName = path.basename(session.projectPath) || session.projectName;
    }
  }

  private extractCwd(json: LogEntry): string | null {
    if (json.Cwd) {
      return json.Cwd;
    }

    if (json.tool_calls && Array.isArray(json.tool_calls)) {
      for (const tc of json.tool_calls) {
        const cwd = tc.Cwd || tc.arguments?.Cwd || tc.Arguments?.Cwd;
        if (cwd) {
          return cwd;
        }
      }
    }

    return null;
  }

  private findProjectRoot(filePath: string): string {
    try {
      let current = path.dirname(filePath);
      // `path.dirname` returns the root unchanged once it reaches it ('/' on POSIX, 'C:\' on
      // Windows), so the loop must stop at the parsed root or it spins forever — and this runs
      // synchronously on the extension host thread.
      // `current.length > 1` is NOT redundant next to that check: a relative path parses to a
      // root of '' and bottoms out at '.', which the root comparison alone never catches.
      while (current && current.length > 1 && current !== path.parse(current).root) {
        if (
          fs.existsSync(path.join(current, '.git')) ||
          fs.existsSync(path.join(current, '.claude')) ||
          fs.existsSync(path.join(current, '.agents')) ||
          fs.existsSync(path.join(current, 'package.json'))
        ) {
          return current;
        }
        current = path.dirname(current);
      }
    } catch {
      // Ignore filesystem check errors
    }
    return path.dirname(filePath);
  }
}
