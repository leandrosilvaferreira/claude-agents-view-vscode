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
 */

/** Key names whose string value is a known closed set (not free text) and survives unchanged. */
const ALLOWLISTED_KEYS: ReadonlySet<string> = new Set(['type', 'role', 'status']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactValue(value: unknown, key: string | undefined, nextId: () => number): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, undefined, nextId));
  }
  if (isPlainObject(value)) {
    return redactObject(value, nextId);
  }
  if (typeof value !== 'string' || value === '') {
    return value; // non-strings and empty strings carry nothing to redact
  }
  if (key !== undefined && ALLOWLISTED_KEYS.has(key)) {
    return value;
  }
  return `Sample text ${nextId()}`;
}

function redactObject(obj: Record<string, unknown>, nextId: () => number): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = redactValue(value, key, nextId);
  }
  return result;
}

/**
 * Returns a deep copy of `line` with every non-allowlisted string leaf replaced by a stable
 * `Sample text N` placeholder. Structure (keys, array order/length) is preserved; only unsafe
 * string values change. The counter restarts at 1 on every call, so the same input always produces
 * the same output — it is not threaded across separate calls.
 */
export function redact<T>(line: T): T {
  let id = 0;
  const nextId = (): number => {
    id += 1;
    return id;
  };
  return redactValue(line, undefined, nextId) as T;
}
