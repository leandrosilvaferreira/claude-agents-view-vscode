import * as fs from 'fs';
import * as path from 'path';
import { Session, SubAgent } from './types';
import { logDebug } from './logger';

interface SidecarMetadata {
  agentType?: string;
  model?: string;
  toolUseId?: string;
  agentId?: string;
}

/**
 * Enrich subagents that still show the 'Agent' placeholder name or have no model, using the
 * `agent-<id>.meta.json` sidecar Claude Code writes next to each subagent transcript. The
 * sidecar's `toolUseId` is the id of the launching `tool_use` block, fixed forever at launch
 * time — so the join key is `sub.launchId ?? sub.id`, not just `sub.id`: a SendMessage resume
 * (subagentDetector.ts's detectSendMessageResume) re-keys `sub.id` to its OWN tool_use id and
 * stashes the original launch id in `sub.launchId` precisely so this join keeps working after a
 * resume — without it, a resumed subagent would silently stop being enrichable.
 *
 * The sidecar filename's `<id>` is also read now (into `SidecarMetadata.agentId`) — an earlier
 * version of this comment called it "an unrelated internal agent id"; that was wrong. It is the
 * raw agentId Claude Code assigns the subagent, and the other form SendMessage's `to` can carry
 * when the launch never set an explicit `name` (see subagentDetector.ts's findSubagentEntryByTarget).
 *
 * A session that entered a git worktree keeps its MAIN transcript in the base project's
 * ~/.claude/projects/<encoded-base> directory, while its subagent sidecars land under the
 * WORKTREE's own encoded directory (subagents run with the worktree as their real cwd, unlike
 * the parent transcript's fixed location). So sidecars must be looked up in BOTH: the directory
 * the main transcript itself lives in (from session.logFilePath), and the directory
 * session.projectPath currently encodes to (the last cwd seen on this transcript, which may be
 * the worktree, or may be the base — it can flip over a session's lifetime). Never assume either
 * alone is enough; on a rare id collision between the two, the projectPath-derived (usually more
 * current) directory wins deterministically.
 */
export function enrichSubagentMetadata(session: Session): void {
  const candidates = session.subagents.filter(needsEnrichment);
  if (candidates.length === 0) {
    return;
  }

  const metadataById = readSidecarsById(candidateMetadataDirs(session), session.id);
  if (metadataById.size === 0) {
    return;
  }

  for (const sub of candidates) {
    applyMetadata(sub, metadataById.get(sub.launchId ?? sub.id));
  }
}

function needsEnrichment(sub: SubAgent): boolean {
  return sub.name === 'Agent' || !sub.model;
}

function applyMetadata(sub: SubAgent, meta: SidecarMetadata | undefined): void {
  if (!meta) {
    return;
  }
  if (meta.agentType && sub.name === 'Agent') {
    sub.name = meta.agentType;
  }
  if (meta.model && !sub.model) {
    sub.model = meta.model;
  }
  if (meta.agentId) {
    sub.agentId = meta.agentId;
  }
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
 * filesystem-probing disambiguation, which solves the opposite, ambiguous direction.
 */
function encodeProjectDir(projectPath: string): string {
  return projectPath.replace(/[^A-Za-z0-9]/g, '-');
}

/** The directory containing the main transcript, plus (when different) the directory
 * session.projectPath currently encodes to. Order matters for readSidecarsById's dedup. */
function candidateMetadataDirs(session: Session): string[] {
  const baseDir = path.dirname(session.logFilePath);
  if (!session.projectPath) {
    return [baseDir];
  }
  const claudeProjectsPath = path.dirname(baseDir);
  const projectPathDir = path.join(claudeProjectsPath, encodeProjectDir(session.projectPath));
  return projectPathDir === baseDir ? [baseDir] : [baseDir, projectPathDir];
}

/** Reads every sidecar under `<dir>/<sessionId>/subagents/` for each candidate dir, keyed by
 * toolUseId. Later directories in `dirs` win on a duplicate id, so the result never depends on
 * filesystem read order — deterministic even if the very same call left a sidecar in both places. */
function readSidecarsById(dirs: string[], sessionId: string): Map<string, SidecarMetadata> {
  const result = new Map<string, SidecarMetadata>();
  for (const dir of dirs) {
    const subagentsDir = path.join(dir, sessionId, 'subagents');
    for (const meta of readSidecarsInDir(subagentsDir)) {
      if (meta.toolUseId) {
        result.set(meta.toolUseId, meta);
      }
    }
  }
  return result;
}

function readSidecarsInDir(subagentsDir: string): SidecarMetadata[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(subagentsDir);
  } catch {
    // Missing directory (no worktree, or no subagents yet) is the common case, not an error.
    return [];
  }

  const metas: SidecarMetadata[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.meta.json')) {
      continue;
    }
    const meta = readSidecarFile(path.join(subagentsDir, entry));
    if (meta) {
      metas.push(meta);
    }
  }
  return metas;
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
      model: typeof fields.model === 'string' ? fields.model : undefined,
      toolUseId: typeof fields.toolUseId === 'string' ? fields.toolUseId : undefined,
      agentId: extractAgentIdFromFilename(path.basename(filePath)),
    };
  } catch (err) {
    logDebug(`subagentMetadata: failed to read sidecar ${filePath}: ${String(err)}`);
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
