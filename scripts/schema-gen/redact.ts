/**
 * Redacts free-text, path, and numeric-telemetry values from a parsed transcript line before it
 * is ever written to a committed fixture file (see scripts/schema-gen/generateFixtures.ts).
 * Default-deny, per this repo's own .claude/rules/06-security.md ("use allowlists where
 * possible") — applied independently to strings and numbers:
 *  - Every string leaf, at any depth — including inside arbitrary echoed tool output such as
 *    `toolUseResult` and `tool_calls[].arguments` — is replaced with a `Sample text N`
 *    placeholder, the same convention already used by src/test/fixtures/real-logs/ (see the
 *    header comment in src/test/logParser.realLogs.test.ts), UNLESS its key is one of a short
 *    allowlist of closed-vocabulary enum fields (`type`/`role`/`status`/`subtype`,
 *    ALLOWLISTED_KEYS below) AND the value itself actually matches a closed-vocabulary shape
 *    (CLOSED_VOCABULARY_VALUE below) — a `status` holding arbitrary free text is redacted like
 *    any other string even though its KEY is allowlisted; the allowlist covers the field's known
 *    enum, not a loophole for whatever a caller happens to put under one of these four common
 *    names.
 *  - Every numeric leaf, at any depth, is replaced with `0` UNLESS its key is one the
 *    extension's own parser actually reads off a transcript entry (NUMERIC_ALLOWLISTED_KEYS
 *    below, confirmed by grepping every top-level src/*.ts file for a read of a numeric
 *    `LogEntry` field) AND that leaf is a direct child of the line's own root object — the
 *    parser only ever reads `created` there (src/logParser.ts, `typeof json.created ===
 *    'number'`), never a same-named field nested inside echoed third-party tool output (e.g. a
 *    Stripe/DB record's own `created` timestamp), so a nested `created` default-denies like any
 *    other numeric leaf. Telemetry like `totalCostUSD`, `startTime`, `totalDuration`,
 *    `totalAPIDuration`/`totalAPIDurationWithoutRetries`, `totalToolDuration`, or a `prNumber`
 *    is real, sensitive data with no reason to survive into a PUBLIC committed fixture — the
 *    schema aggregator (schemaAggregator.ts) only ever records a field's `typeof`, never its
 *    value, so zeroing it costs nothing there.
 *  - Booleans and `null` are left as-is — neither carries free text or a sensitive magnitude.
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
 * `isSchemaLikeKey` only judges a key by its own shape, though, which a short, punctuation-free
 * real value (a tracked filename, a bare-word answer label) can pass without actually being a
 * safe field name — so for the known dynamic-key-map/opaque container fields
 * (`KNOWN_DYNAMIC_KEY_CONTAINERS`/`OPAQUE_KEY_CONTAINERS`, keySafety.ts) and for an MCP tool_use
 * block's `input` field (`isMcpToolUseInputKey`), every child key is forced unsafe regardless of
 * shape (the `forceDynamicKey` parameter below), not just the ones that fail the regex. The MCP
 * case is context-dependent (it needs the sibling `type`/`name` fields, not just the key), so
 * `redactObject`'s loop computes it per-key from the object it's currently iterating (`obj`)
 * before recursing, rather than `redactValue` re-deriving it from `key` alone.
 */

import { isKnownDynamicKeyContainer, isMcpToolUseInputKey, isSchemaLikeKey } from './keySafety';

/** Key names whose string value is a known closed set (not free text) — see
 * CLOSED_VOCABULARY_VALUE below: the key alone isn't enough, the value must also look like an
 * enum member before it survives unchanged. `subtype` (e.g. `system:agents_killed`,
 * `system:api_error`) is exactly as closed-vocabulary as `type` — it's the other half of the
 * same `type:subtype` bucket key (schemaAggregator.ts's `typeBucketKey`) — and keeping it
 * literal lets a committed `system:*` fixture actually reach the parser's subtype-specific
 * branches (detectAgentsKilled, trackApiErrorSignal) instead of a redacted placeholder. */
const ALLOWLISTED_KEYS: ReadonlySet<string> = new Set(['type', 'role', 'status', 'subtype']);

/** A real `type`/`role`/`status`/`subtype` value observed in this CLI is always a short,
 * closed-vocabulary token — usually lowercase (`assistant`, `tool_result`, `async_launched`,
 * `api_error`, `queue-operation`, ...), but not always: memory-file types are PascalCase
 * (`Project`, `User`, `AutoMem`) and an attachment's MIME type looks like `image/png`. Allows
 * letters/digits/`_`/`:`/`.`/`/`/`+`/`-`, starting with a letter, up to 41 chars, no whitespace —
 * wide enough for these real shapes while still rejecting arbitrary prose, which always has a
 * space long before the length cap. A value under an allowlisted key that doesn't match this
 * shape is redacted like any other string. */
const CLOSED_VOCABULARY_VALUE = /^[A-Za-z][A-Za-z0-9_:./+-]{0,40}$/;

/** Key names whose NUMERIC value the extension's own parser actually reads off a transcript
 * entry. Confirmed by grepping every top-level src/*.ts file (excluding src/test and
 * src/generated) for a read of a numeric `LogEntry` field: only `created` qualifies
 * (src/logParser.ts, `typeof json.created === 'number'` — an epoch-ms fallback timestamp read
 * directly off the parsed line, never off a nested object). Every other numeric leaf is
 * default-deny, same reasoning as ALLOWLISTED_KEYS above, for numbers instead of strings — and
 * even a `created` key only qualifies at depth 1 (see `redactScalar`'s `ctx.depth` check below):
 * the same key name nested inside echoed third-party tool output (a Stripe/DB record's own
 * `created` field) is real, unrelated data with no reason to survive redaction. */
const NUMERIC_ALLOWLISTED_KEYS: ReadonlySet<string> = new Set(['created']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The two placeholder counters threaded through one redact() call — grouped into one object
 * so redactValue/redactObject stay under this repo's max-params lint limit. */
interface RedactionCounters {
  nextId: () => number;
  nextKeyId: () => number;
}

/**
 * `key` and `parent` travel together through recursion: whether a value's own children must be
 * forced unsafe can depend on a SIBLING field's value (an MCP tool_use block's `input` —
 * isMcpToolUseInputKey in keySafety.ts), not just on `key`'s own name. `parent` is the object
 * `key` was read from — `undefined` for the top-level call and for array elements (an array has
 * no sibling keys to consult). `depth` counts how many object levels below the line's own root
 * this value sits — 0 for the root call, 1 for the root's own direct children, 2+ for anything
 * nested further — so `redactScalar` can tell a top-level `created` (the only one the extension's
 * parser ever reads) apart from the same key name echoed inside nested third-party tool output
 * (see NUMERIC_ALLOWLISTED_KEYS above). Grouped into one object for the same max-params reason as
 * RedactionCounters.
 */
interface KeyContext {
  key: string | undefined;
  parent: Record<string, unknown> | undefined;
  depth: number;
}

/** True when the value at `ctx.key` must have ALL of its own children forced unsafe once
 * recursed into — a known dynamic-key/opaque container by name, or an MCP tool_use block's
 * `input` by sibling context. */
function isOpaqueChildKey(ctx: KeyContext): boolean {
  if (ctx.key === undefined) {
    return false;
  }
  return isKnownDynamicKeyContainer(ctx.key) || (ctx.parent !== undefined && isMcpToolUseInputKey(ctx.parent, ctx.key));
}

/** Redacts a non-array, non-object leaf: numbers and strings default-deny (see the module
 * comment above), booleans and null pass through unchanged. Split out of `redactValue` purely
 * to keep each function's cyclomatic complexity under this repo's lint limit. */
function redactScalar(value: unknown, ctx: KeyContext, counters: RedactionCounters): unknown {
  if (typeof value === 'number') {
    return ctx.depth === 1 && ctx.key !== undefined && NUMERIC_ALLOWLISTED_KEYS.has(ctx.key) ? value : 0;
  }
  if (typeof value !== 'string' || value === '') {
    return value; // booleans, null, and empty strings carry nothing to redact
  }
  if (ctx.key !== undefined && ALLOWLISTED_KEYS.has(ctx.key) && CLOSED_VOCABULARY_VALUE.test(value)) {
    return value;
  }
  return `Sample text ${counters.nextId()}`;
}

function redactValue(value: unknown, ctx: KeyContext, counters: RedactionCounters): unknown {
  if (Array.isArray(value)) {
    // Forward ctx unchanged (depth included) — a known dynamic-key container's value can itself
    // be an array of maps (`answers: [{ LICENSE: 'x' }]`); losing `key`/`parent` here would drop
    // the container context at the array boundary and leak the elements' real keys. Depth isn't
    // bumped either: an array is a structural wrapper, not a nesting level of its own — an
    // element is exactly as "direct" as the array field itself.
    return value.map((item) => redactValue(item, ctx, counters));
  }
  if (isPlainObject(value)) {
    // Known dynamic-key/opaque container, or an MCP tool_use block's `input` — every key inside
    // `value` is unconditionally unsafe content, regardless of what an individual key looks like
    // (Finding B: a short, punctuation-free real value like a tracked filename would otherwise
    // pass isSchemaLikeKey and leak through).
    return redactObject(value, counters, ctx);
  }
  return redactScalar(value, ctx, counters);
}

function redactObject(
  obj: Record<string, unknown>,
  counters: RedactionCounters,
  ctx: KeyContext,
): Record<string, unknown> {
  const forceDynamicKey = isOpaqueChildKey(ctx);
  const childDepth = ctx.depth + 1;
  // Map, not a plain-object accumulator: `key` below is corpus-derived text, and
  // `result[key] = ...` on a plain `{}` is unsafe for `key === '__proto__'` specifically —
  // Object.prototype's inherited `__proto__` *setter* fires on that assignment and repoints
  // `result`'s own prototype instead of creating an own property. keySafety.ts's own guard
  // already rejects that key today, but this accumulator doesn't rely on that alone (defense
  // in depth, per review) — a Map has no such setter to trigger no matter what `key` is, and
  // Object.fromEntries at the end uses CreateDataPropertyOrThrow (not [[Set]]), so a
  // `__proto__` entry always lands as a genuine own property (verified).
  const result = new Map<string, unknown>();
  for (const [key, value] of Object.entries(obj)) {
    if (forceDynamicKey || !isSchemaLikeKey(key)) {
      result.set(`Sample key ${counters.nextKeyId()}`, `Sample text ${counters.nextId()}`);
      continue;
    }
    result.set(key, redactValue(value, { key, parent: obj, depth: childDepth }, counters));
  }
  return Object.fromEntries(result);
}

/**
 * Returns a deep copy of `line` with every non-allowlisted string leaf replaced by a stable
 * `Sample text N` placeholder, every non-allowlisted numeric leaf replaced by `0`, and every
 * content-derived object key replaced by a stable `Sample key N` placeholder (see the module
 * comment above). Structure (key count, array order/length) is preserved; only unsafe values and
 * unsafe keys change. Both counters restart on every call, so the same input always produces the
 * same output — neither is threaded across separate calls.
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
  return redactValue(line, { key: undefined, parent: undefined, depth: 0 }, counters) as T;
}
