import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { z } from 'zod';

/**
 * Tolerant, per-line walk of the developer's local transcript corpus
 * (`~/.claude/projects/**\/*.jsonl` by default, recursive). Feeds the schema aggregator
 * (see transcript-schema-gen.md, T7) — dev-time-only tooling input, never imported by the
 * shipped extension.
 *
 * The recursive sweep naturally also picks up each session's
 * `<sessionId>/subagents/agent-*.jsonl` sidechain transcripts (desirable — they carry
 * `isSidechain: true` and are worth observing too) and naturally excludes Antigravity logs,
 * which live under a completely different root (`~/.gemini/...`) — no brand-filtering code
 * needed.
 *
 * A malformed line never aborts the walk: a `JSON.parse` failure and a value that parses
 * fine but isn't a plain object (array/string/number/null) are both captured as a
 * `ParseError` result instead of thrown, mirroring the `Event | ParseError` per-line
 * isolation pattern this project's prior-art research flagged in coo-labs/tjsonl.
 */

/** Boundary check only: "is this a plain object", nothing deeper — there is no schema to
 * validate structure against, that's the whole point of this tool. */
const jsonObjectSchema = z.looseObject({});

/** One successfully parsed line: valid JSON, and a plain object at the top level. */
export interface ParsedLine {
  ok: true;
  filePath: string;
  lineNumber: number;
  value: Record<string, unknown>;
}

/** One line that couldn't be observed: either invalid JSON, or JSON that parsed to
 * something other than a plain object. `rawLine` is a truncated snippet for diagnostics,
 * not the full offending payload. */
export interface ParseError {
  ok: false;
  filePath: string;
  lineNumber: number;
  rawLine: string;
  message: string;
}

export type WalkResult = ParsedLine | ParseError;

const DEFAULT_CORPUS_ROOT = path.join(os.homedir(), '.claude', 'projects');
const RAW_LINE_SNIPPET_LENGTH = 200;

function snippet(line: string): string {
  return line.length > RAW_LINE_SNIPPET_LENGTH ? `${line.slice(0, RAW_LINE_SNIPPET_LENGTH)}…` : line;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Every `.jsonl` file under `rootDir`, recursive, sorted for a deterministic walk order.
 * Returns an empty list rather than throwing when `rootDir` doesn't exist or isn't
 * readable — an absent corpus (e.g. a machine that has never run Claude Code) is not an
 * error for a tool that only ever observes what's actually there. */
function findJsonlFiles(rootDir: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(rootDir, { recursive: true, encoding: 'utf8' });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.endsWith('.jsonl'))
    .map((entry) => path.join(rootDir, entry))
    .sort();
}

async function* walkFile(filePath: string): AsyncGenerator<WalkResult> {
  const input = fs.createReadStream(filePath, { encoding: 'utf8' });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (line.trim() === '') {
      continue; // blank lines carry nothing to observe
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch (error) {
      yield { ok: false, filePath, lineNumber, rawLine: snippet(line), message: describeError(error) };
      continue;
    }

    const result = jsonObjectSchema.safeParse(parsed);
    if (!result.success) {
      yield { ok: false, filePath, lineNumber, rawLine: snippet(line), message: result.error.issues[0].message };
      continue;
    }

    yield { ok: true, filePath, lineNumber, value: result.data };
  }
}

/**
 * Yields one `WalkResult` per non-blank line across every `.jsonl` file found (recursively)
 * under `rootDir`, defaulting to the developer's real `~/.claude/projects`. Tests pass a
 * scratch directory instead, to avoid touching the real corpus.
 *
 * Never throws: a file that fails to open, or a read stream that errors partway through, is
 * captured as one `ParseError` for that file and the walk moves on to the next one — the
 * same tolerance a single malformed line already gets inside `walkFile`.
 */
export async function* walkCorpus(rootDir: string = DEFAULT_CORPUS_ROOT): AsyncGenerator<WalkResult> {
  for (const filePath of findJsonlFiles(rootDir)) {
    try {
      yield* walkFile(filePath);
    } catch (error) {
      yield { ok: false, filePath, lineNumber: 0, rawLine: '', message: describeError(error) };
    }
  }
}
