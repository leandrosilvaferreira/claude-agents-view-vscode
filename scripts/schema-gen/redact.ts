/**
 * Redacts free-text and path values from a parsed transcript line before it is ever written to a
 * committed fixture file (see the planned scripts/schema-gen/generateFixtures.ts). Allowlist-first,
 * per this repo's own .claude/rules/06-security.md ("use allowlists where possible"): only a short
 * list of known enum-like keys (type/role/status) keep their string value. Every other string leaf,
 * at any depth — including inside arbitrary echoed tool output such as `toolUseResult` and
 * `tool_calls[].arguments` — is replaced with a `Sample text N` placeholder, the same convention
 * already used by src/test/fixtures/real-logs/ (see the header comment in
 * src/test/logParser.realLogs.test.ts).
 *
 * `LogEntry` (src/transcriptEntry.ts) documents every currently-known free-text/path field
 * (message.content[].text, prompt, attachment.prompt, tool_calls[].arguments.*, Cwd/cwd,
 * gitBranch/git.branch, customTitle, aiTitle, worktreeSession.worktreeName, TargetFile). That list
 * is background only, not a type import: scripts/ deliberately sits outside the root TS project,
 * and a denylist keyed on those specific paths would miss free text nested anywhere else in echoed
 * tool output — which is exactly why this walks the whole structure instead of specific paths.
 *
 * The same "walk everything" reasoning has a blind spot from the other direction: an object *key*
 * can itself be free text (e.g. `toolUseResult.answers`, the `AskUserQuestion` tool's answer map,
 * keyed by the literal question). `redactObject` below checks every key with `isSchemaLikeKey`
 * (keySafety.ts) before keeping it literally; a content-derived key is replaced with its own
 * `Sample key N` placeholder (a counter kept separate from the value counter's `Sample text N`,
 * so neither numbering leaks anything about the other), and its whole value is replaced wholesale
 * rather than walked — nothing under an unsafe key can be assumed to be normal structure.
 */

import { isSchemaLikeKey } from './keySafety';

/** Key names whose string value is a known closed set (not free text) and survives unchanged. */
const ALLOWLISTED_KEYS: ReadonlySet<string> = new Set(['type', 'role', 'status']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The two placeholder counters threaded through one redact() call — grouped into one object
 * so redactValue/redactObject stay under this repo's max-params lint limit. */
interface RedactionCounters {
  nextId: () => number;
  nextKeyId: () => number;
}

function redactValue(value: unknown, key: string | undefined, counters: RedactionCounters): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, undefined, counters));
  }
  if (isPlainObject(value)) {
    return redactObject(value, counters);
  }
  if (typeof value !== 'string' || value === '') {
    return value; // non-strings and empty strings carry nothing to redact
  }
  if (key !== undefined && ALLOWLISTED_KEYS.has(key)) {
    return value;
  }
  return `Sample text ${counters.nextId()}`;
}

function redactObject(obj: Record<string, unknown>, counters: RedactionCounters): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!isSchemaLikeKey(key)) {
      result[`Sample key ${counters.nextKeyId()}`] = `Sample text ${counters.nextId()}`;
      continue;
    }
    result[key] = redactValue(value, key, counters);
  }
  return result;
}

/**
 * Returns a deep copy of `line` with every non-allowlisted string leaf replaced by a stable
 * `Sample text N` placeholder, and every content-derived object key replaced by a stable
 * `Sample key N` placeholder (see the module comment above). Structure (key count, array
 * order/length) is preserved; only unsafe string values and unsafe keys change. Both counters
 * restart on every call, so the same input always produces the same output — neither is threaded
 * across separate calls.
 */
export function redact<T>(line: T): T {
  let id = 0;
  let keyId = 0;
  const counters: RedactionCounters = {
    nextId: () => {
      id += 1;
      return id;
    },
    nextKeyId: () => {
      keyId += 1;
      return keyId;
    },
  };
  return redactValue(line, undefined, counters) as T;
}
