import * as fs from 'fs';
import * as path from 'path';
import { Session } from './types';
import { logDebug } from './logger';

/**
 * Raw content of one `agent-<id>.meta.json` sidecar, plus its own path. Shared by
 * subagentMetadata.ts (name/model enrichment, keyed by toolUseId) and nestedSubagents.ts
 * (grandchild attachment, keyed by parentAgentId) — this module only reads and caches sidecars
 * off disk; it has no opinion on what either caller does with them.
 */
export interface SidecarMetadata {
  agentType?: string;
  name?: string; // A subagent's CUSTOM display name, set at launch (e.g. Agent tool input
  // `name: "F3-vitest"`, or a forked-skill teammate's own `name`). A level-1 subagent already
  // gets this correctly from its launching tool_use block (subagentDetector.ts) and never needs
  // this field. It exists here purely for nestedSubagents.ts's grandchildren, which have NO
  // tool_use block at all — without it, a named parallel fan-out of grandchildren all render
  // under the same generic `agentType` label, indistinguishable from each other (real corpus:
  // 34/34 sampled grandchildren with `name` set had `name !== agentType`, e.g.
  // `angle-a-linebyline` vs. the real specialist `code-reviewer`).
  model?: string;
  toolUseId?: string;
  agentId?: string;
  parentAgentId?: string; // Set when this subagent was launched BY another subagent, not by the
  // session itself — the join key nestedSubagents.ts groups grandchildren by.
  description?: string; // A grandchild's task text (nestedSubagents.ts) — level-1 subagents get
  // `task` from the launching tool_use block instead (subagentDetector.ts); a grandchild has no
  // such block, so this sidecar field is its ONLY source of task text.
  sidecarPath: string; // Absolute path to this agent-<id>.meta.json itself. Kept (not just the
  // parsed content) so nestedSubagents.ts's computeChildStatus can derive a grandchild's status
  // FRESH at build time via a live stat() on every call — status must never be baked into the
  // cached parse result below, or it would go stale between cache refreshes.
}

/**
 * Claude Code encodes a project cwd into a projects-dir name by replacing every character that
 * isn't [A-Za-z0-9] with '-' (see projectPathResolver.ts's decode comment, and the identical
 * regex logParser.projectPath.test.ts uses to build its fixtures). Verified against real
 * ~/.claude/projects directory names, including ones with dots, underscores and mixed case:
 * uppercase letters pass through unchanged, and '.', '_', '/' all collapse to '-' individually
 * (no run-length collapsing — "/.claude/" produces "--claude-", a real double-dash on disk).
 * Encoding is unambiguous (unlike decoding, which is a best-effort guess), so a plain regex
 * replace is all that's needed here — nothing to reuse from decodeClaudeProjectPath's
 * filesystem-probing disambiguation, which solves the opposite, ambiguous direction. Exported so
 * projectPathResolver.ts can compute the same encoded form to append onto Session.knownProjectDirs
 * as it goes — this module and that one otherwise share no dependency in either direction.
 */
export function encodeProjectDir(projectPath: string): string {
  return projectPath.replace(/[^A-Za-z0-9]/g, '-');
}

/**
 * A session that entered a git worktree keeps its MAIN transcript in the base project's
 * ~/.claude/projects/<encoded-base> directory, while its subagent sidecars land under the
 * WORKTREE's own encoded directory (subagents run with the worktree as their real cwd, unlike
 * the parent transcript's fixed location). So sidecars must be looked up in BOTH: the directory
 * the main transcript itself lives in (from session.logFilePath), and EVERY directory
 * session.projectPath has ever encoded to over the session's life (session.knownProjectDirs) —
 * not just the current one. `projectPath` alone only ever reflects the LATEST cwd seen, and a
 * session that enters a worktree, dispatches subagents there, then leaves it again has
 * `projectPath` revert to the base cwd — silently and permanently losing the worktree directory
 * from this search the moment that happens, even though the sidecars are still sitting right
 * there on disk (real corpus, 14-day audit 2026-08-21: 27 of 34 worktree-split sessions ended
 * exactly this way). `knownProjectDirs` is maintained as a most-recently-used list (oldest first,
 * current dir always last) in projectPathResolver.ts wherever `projectPath` is set. Falls back to
 * encoding `projectPath` directly when `knownProjectDirs` is empty/unset (e.g. a Session built
 * directly in a test without going through ProjectPathResolver), preserving the old single-dir
 * behavior for that case.
 *
 * Order matters: `readAllSidecars`' "later dir wins" dedup should prefer the most-recently-active
 * directory on an identity collision — including when that directory is the BASE one, e.g. a
 * session that went base(A) → worktree(B) → base(A) and is currently back at A. `baseDir` is only
 * prepended when it ISN'T already one of the MRU-ordered paths below, instead of unconditionally
 * first — an earlier version of this function always put `baseDir` first regardless, which pinned
 * it to the losing (non-most-recent) position on exactly that revisit-the-base case, even though
 * `knownProjectDirs` itself had already correctly tracked A as the most recent entry (code-review
 * finding, 2026-08-21). When `baseDir` genuinely is the fallback (no MRU history at all, or the
 * session never left it), it's the only entry and this distinction is moot.
 */
export function candidateMetadataDirs(session: Session): string[] {
  const baseDir = path.dirname(session.logFilePath);
  if (!session.projectPath) {
    return [baseDir];
  }
  const claudeProjectsPath = path.dirname(baseDir);
  const encodedDirs = session.knownProjectDirs?.length
    ? session.knownProjectDirs
    : [encodeProjectDir(session.projectPath)];
  const mruPaths = [...new Set(encodedDirs.map((dir) => path.join(claudeProjectsPath, dir)))];
  return mruPaths.includes(baseDir) ? mruPaths : [baseDir, ...mruPaths];
}

/** Reads every sidecar under `<dir>/<sessionId>/subagents/` across all candidate dirs, in dir
 * order, then deduplicates (see dedupeSidecars). Nothing is discarded by toolUseId presence: a
 * forked-skill teammate sidecar (detectForkedSkillLaunch) carries no toolUseId at all, but DOES
 * carry parentAgentId when it's a grandchild — dropping it would make grandchildren unrecoverable. */
export function readAllSidecars(dirs: string[], sessionId: string): SidecarMetadata[] {
  const metas: SidecarMetadata[] = [];
  for (const dir of dirs) {
    const subagentsDir = path.join(dir, sessionId, 'subagents');
    metas.push(...readSidecarsInDirCached(subagentsDir));
  }
  return dedupeSidecars(metas);
}

/** Deduplicates sidecars that represent the SAME underlying subagent, read from two candidate
 * directories (a worktree session splits sidecars across the base and worktree dirs, and a rare
 * id collision between them is real, not hypothetical — candidateMetadataDirs' doc comment
 * already calls it out). Later directory wins, matching that same determinism guarantee; without
 * this, a sidecar present in both dirs rendered twice downstream (e.g. as a duplicate
 * grandchild). Keyed by toolUseId when present, else by the filename-derived agentId — the only
 * identity a toolUseId-less forked-skill teammate has. */
function dedupeSidecars(sidecars: SidecarMetadata[]): SidecarMetadata[] {
  const byIdentity = new Map<string, SidecarMetadata>();
  for (const meta of sidecars) {
    const identity = meta.toolUseId ?? meta.agentId;
    if (identity) {
      byIdentity.set(identity, meta);
    }
  }
  return [...byIdentity.values()];
}

// Cache of parsed sidecar CONTENT (never a derived status — see nestedSubagents.ts's
// computeChildStatus) per subagents/ directory, keyed by its absolute path. Invalidated by
// comparing the current *.meta.json filename listing against the one last seen — sidecars are
// written once at launch and never rewritten afterward (no evidence anywhere in this codebase of
// Claude Code touching one again post-creation), so "same filenames as last time" is a safe,
// cheap proxy for "same content as last time", and avoids a directory-mtime comparison whose
// resolution on some filesystems can be too coarse to reliably detect two changes landing in the
// same tick. Needed because nestedSubagents.ts's refreshNestedSubagents now runs on every 15s
// tick (and every file-change refresh) for every session with subagents, not just when a
// transcript happens to grow — without this, that re-reads and re-JSON.parses every sidecar every
// time, even for sessions where nothing changed. Module-level and never evicted: the number of
// distinct subagents/ directories across a user's open sessions is small and bounded, and each
// entry holds only a handful of tiny (~350B) parsed objects — the same read-avoidance goal
// LogParser's per-file byte-offset cache serves for transcripts, just keyed by directory instead.
const sidecarDirCache = new Map<string, { fileNames: string[]; metas: SidecarMetadata[] }>();

function readSidecarsInDirCached(subagentsDir: string): SidecarMetadata[] {
  let fileNames: string[];
  try {
    fileNames = fs.readdirSync(subagentsDir).filter((entry) => entry.endsWith('.meta.json'));
  } catch {
    // Missing directory (no worktree, or no subagents yet) is the common case, not an error.
    // Drop any stale entry so a later real directory at this path is never compared against it.
    sidecarDirCache.delete(subagentsDir);
    return [];
  }

  const cached = sidecarDirCache.get(subagentsDir);
  if (cached && sameFileNames(cached.fileNames, fileNames)) {
    return cached.metas;
  }

  const metas: SidecarMetadata[] = [];
  for (const fileName of fileNames) {
    const meta = readSidecarFile(path.join(subagentsDir, fileName));
    if (meta) {
      metas.push(meta);
    }
  }
  sidecarDirCache.set(subagentsDir, { fileNames, metas });
  return metas;
}

/** Order-independent (readdirSync order isn't guaranteed stable) equality check on two filename
 * lists. */
function sameFileNames(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setA = new Set(a);
  return b.every((name) => setA.has(name));
}

function readSidecarFile(filePath: string): SidecarMetadata | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    // The sidecar format is undocumented and unversioned, so field TYPES can't be assumed either:
    // a non-string agentType would flow straight into a TreeItem label and render as
    // "[object Object]". Keep only string values and drop anything else.
    const fields = parsed as Record<string, unknown>;
    return {
      agentType: typeof fields.agentType === 'string' ? fields.agentType : undefined,
      name: typeof fields.name === 'string' ? fields.name : undefined,
      model: typeof fields.model === 'string' ? fields.model : undefined,
      toolUseId: typeof fields.toolUseId === 'string' ? fields.toolUseId : undefined,
      agentId: extractAgentIdFromFilename(path.basename(filePath)),
      parentAgentId: typeof fields.parentAgentId === 'string' ? fields.parentAgentId : undefined,
      description: typeof fields.description === 'string' ? fields.description : undefined,
      sidecarPath: filePath,
    };
  } catch (err) {
    logDebug(`sidecarReader: failed to read sidecar ${filePath}: ${String(err)}`);
    return null;
  }
}

/**
 * The sidecar filename is `agent-<id>.meta.json`; `<id>` is the raw agentId Claude Code assigns
 * the subagent internally. Confirmed against real sidecars from one session: only 2 of 4 launches
 * passed `name` in the Agent tool's input — the other 2 are only addressable by this id, which is
 * exactly the form SendMessage's `to` carries for them (see subagentDetector.ts's
 * findSubagentEntryByTarget).
 */
function extractAgentIdFromFilename(fileName: string): string | undefined {
  return fileName.match(/^agent-(.+)\.meta\.json$/)?.[1];
}
