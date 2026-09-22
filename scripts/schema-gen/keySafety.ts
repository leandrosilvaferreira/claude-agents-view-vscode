/**
 * Decides whether an object key is safe to keep literally — as a schema field-path segment
 * (schemaAggregator.ts) or as a fixture's JSON key (redact.ts) — versus one that must be treated
 * as untrusted, content-derived text.
 *
 * Every currently-known real transcript key is a short, plain JS identifier (`type`, `message`,
 * `toolUseResult`, `cwd`, ...). The one confirmed counterexample is `toolUseResult.answers`
 * (the `AskUserQuestion` tool's answer map), whose keys are the literal question text — real,
 * often sensitive, free-form prose, not a fixed field name. `isSchemaLikeKey` exists to catch
 * that shape (and any future field with the same problem) before a key's own text — not just
 * its value — ends up in a generated artifact.
 *
 * Four known gaps in judging a key by shape alone, all closed by what's below:
 *  - A key can look like a plain identifier (pass `SCHEMA_LIKE_KEY`) yet still be an inherited
 *    `Object.prototype` member name (`constructor`, `toString`, `__proto__`, ...) — dangerous
 *    downstream via `key in obj`/`obj[key]` reads and writes. `isSchemaLikeKey` itself rejects
 *    these; see `isObjectPrototypeMember`.
 *  - A key can look like a plain identifier, and not be an `Object.prototype` member, yet still
 *    be an opaque id minted fresh on every tool call (`toolu_…`, `srvtoolu_…`, `msg_…`) rather
 *    than a fixed field name — e.g. Claude Code 2.1.270+'s `wireToolInputs` and 2.1.272+'s
 *    `wireIngestContext`, both maps keyed by tool_use id, mint ~3 new field paths *per tool
 *    call* (94,004 paths observed on a full corpus pull before this fix — quadratic
 *    schema:generate, since each new path also grows every future merge). `isSchemaLikeKey`
 *    itself rejects these too; see `OPAQUE_ID_KEY`.
 *  - A key can look like a plain identifier yet still be real, untrusted *content* — e.g. a
 *    tracked filename (`LICENSE`) or a bare-word answer label — when it comes from a field
 *    that's known to be a dynamic-key map rather than a fixed schema. `isSchemaLikeKey` can't
 *    detect this by shape at all; callers must additionally check the key's *container* via
 *    `isKnownDynamicKeyContainer` before trusting any of its children. See
 *    `KNOWN_DYNAMIC_KEY_CONTAINERS` and `OPAQUE_KEY_CONTAINERS`.
 *  - A key can be a normal, safe, widely-shared field name (`input`) whose value is only
 *    untrusted third-party content *sometimes* — depending on a SIBLING field's value, not on
 *    the key or its container at all. A `message.content[]` block's `input` holds a built-in
 *    tool's own well-known parameters (Bash's `command`, Read's `file_path`) when `name` is a
 *    built-in tool, but an MCP server's own arbitrary parameter names when `name` was minted by
 *    that server (`mcp__<server>__<tool>`). Neither `isSchemaLikeKey` nor
 *    `isKnownDynamicKeyContainer` can see a sibling field, so this needs its own check; see
 *    `isMcpToolUseInputKey`.
 */

/**
 * Matches a plain JS identifier: starts with a letter, `_`, or `$`, followed by up to 63 more
 * word characters (64 total — comfortably above every real field name in this codebase, e.g.
 * `firstSeenVersion`, while still bounding the pathological case of an arbitrarily long string
 * being used as a key). A space, `?`, `.`, `,`, or any punctuation beyond `_`/`$` fails
 * immediately — exactly the shape of a free-text question used as a key.
 */
const SCHEMA_LIKE_KEY = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

/**
 * `Object.prototype`'s own member names (`constructor`, `toString`, `__proto__`,
 * `hasOwnProperty`, ...) are themselves plain JS identifiers, so `SCHEMA_LIKE_KEY` alone
 * accepts them — but every plain `{}` inherits them, so a downstream `key in obj` /
 * `obj[key]` read (schemaModel.ts, schemaAggregator.ts) silently resolves to the *inherited*
 * built-in instead of "not present", and `obj[key] = ...` for `key === '__proto__'`
 * specifically repoints the object's own prototype instead of creating a property (redact.ts).
 * Checked dynamically against the real `Object.prototype` (not a hardcoded name list) so it
 * automatically covers every current member — verified: `constructor`, `__defineGetter__`,
 * `__defineSetter__`, `hasOwnProperty`, `__lookupGetter__`, `__lookupSetter__`,
 * `isPrototypeOf`, `propertyIsEnumerable`, `toString`, `valueOf`, `__proto__`,
 * `toLocaleString` — and any the engine adds later.
 */
function isObjectPrototypeMember(key: string): boolean {
  return Object.hasOwn(Object.prototype, key);
}

/**
 * Opaque per-call ids used as map keys — the Anthropic API id family (`toolu_01…`, `srvtoolu_01…`,
 * `msg_01…`, `req_01…`) and its Bedrock/Vertex-routed variants (`toolu_bdrk_01…`, `toolu_vrtx_01…`,
 * `msg_bdrk_01…`): lowercase prefix, an optional lowercase infix (`bdrk`/`vrtx`), one final `_`,
 * ≥16-char base62 body with a digit. Passes SCHEMA_LIKE_KEY yet is minted per tool call: Claude
 * Code 2.1.270+ `wireToolInputs` / 2.1.272+ `wireIngestContext` are maps keyed by tool_use id
 * (~3 new paths per call → quadratic schema:generate). Judged by shape, so the next map keyed by
 * this id family — Bedrock/Vertex included — is caught without first being listed. Validated
 * against 20,460 real committed keys: still matches only wireToolInputs/wireIngestContext
 * children. Real field names never match: snake_case has several `_` or a short tail.
 */
const OPAQUE_ID_KEY = /^[a-z]{2,16}(?:_[a-z]{2,8})?_(?=[A-Za-z0-9]*[0-9])[A-Za-z0-9]{16,}$/;

export function isSchemaLikeKey(key: string): boolean {
  return SCHEMA_LIKE_KEY.test(key) && !isObjectPrototypeMember(key) && !OPAQUE_ID_KEY.test(key);
}

/**
 * Field names whose *value* is known to be a map keyed by arbitrary CONTENT — a literal
 * question, a tracked filename, an artifact id/name — not a fixed set of schema field names,
 * even though an individual key inside it can still look like a plain identifier and pass
 * `isSchemaLikeKey` above (a short, punctuation-free real value: a tracked filename like
 * `LICENSE`, a bare-word answer label, ...). `isSchemaLikeKey` only judges a key's *shape*; it
 * has no way to know a key came from one of these containers, so the walker/redactor must check
 * this (via `isKnownDynamicKeyContainer`, which also covers `OPAQUE_KEY_CONTAINERS` below)
 * themselves before trusting any child key of one of these fields. Deliberately a small,
 * explicit, easy-to-extend list, not a claim of completeness — grow it as new dynamic-key-map
 * fields are found in the real corpus.
 */
export const KNOWN_DYNAMIC_KEY_CONTAINERS: ReadonlySet<string> = new Set([
  'answers', // toolUseResult.answers — AskUserQuestion's answer map, keyed by question text
  'trackedFileBackups', // snapshot.trackedFileBackups — keyed by the real tracked filename
  'artifacts', // keyed by an artifact id/name
  '_meta', // mcpMeta._meta — MCP metadata map, keyed by arbitrary MCP-defined keys
]);

/**
 * Field names whose value is OPAQUE at every depth, not just its own direct children — an
 * id-keyed or third-party-schema-keyed subtree where everything nested inside is untrusted,
 * arbitrarily deep content the caller must never assume any structure for:
 *  - `wireToolInputs` / `wireIngestContext` — maps keyed by tool_use id, whose value is that
 *    tool's own, arbitrarily shaped input object (Claude Code 2.1.270+/2.1.272+).
 *  - `structuredContent` — an MCP server's own result shape (`user.mcpMeta.structuredContent`).
 *  - `properties` — a JSON-Schema properties map (`attachment.tools[].schema.input_schema.
 *    properties`, `attachment.entries[].input_schema.properties`): keyed by a tool's own
 *    parameter names, which can nest ANOTHER `properties` map for an object-typed parameter.
 *    Verified against the real corpus (5,874 files / ~1.67M lines, 2026-09-21): every
 *    `properties` object found lives at one of those two paths and is either empty or matches a
 *    JSON-Schema property-definition shape (`type`/`description`/`enum`/`items`/`anyOf`/
 *    `oneOf`) — no other use of a `properties` key exists in the scanned corpus.
 *
 * Mechanically this feeds the exact same `isKnownDynamicKeyContainer` check as
 * `KNOWN_DYNAMIC_KEY_CONTAINERS` above (the walker never recurses past a collapsed key either
 * way, so both already fully collapse in practice) — kept as its own, explicitly-named set so
 * the "opaque at every depth" guarantee for third-party-schema fields is documented and
 * reviewable on its own, not an incidental side effect of the walker's non-recursion.
 */
export const OPAQUE_KEY_CONTAINERS: ReadonlySet<string> = new Set([
  'wireToolInputs',
  'wireIngestContext',
  'structuredContent',
  'properties',
]);

export function isKnownDynamicKeyContainer(key: string): boolean {
  return KNOWN_DYNAMIC_KEY_CONTAINERS.has(key) || OPAQUE_KEY_CONTAINERS.has(key);
}

const MCP_TOOL_NAME_PREFIX = 'mcp__';

/**
 * True when `container` is a `message.content[]` tool_use block whose `name` was minted by an
 * MCP server, and `key` is that block's `input` field. An MCP server defines its own tool
 * parameter names — exactly as untrusted/third-party as `structuredContent`'s fields — but
 * `input` is an ordinary field name every tool_use block has, including a BUILT-IN tool's
 * (Bash's `command`, Read's `file_path`), whose own parameter names must keep recording
 * normally. That makes this judgeable only from a SIBLING field's value (`type`/`name`), never
 * from `key`'s own name or shape the way `isKnownDynamicKeyContainer`/`isSchemaLikeKey` above
 * can — so callers pass the object `key` was read from as `container` alongside `key` itself.
 */
export function isMcpToolUseInputKey(container: Record<string, unknown>, key: string): boolean {
  return (
    key === 'input' &&
    container.type === 'tool_use' &&
    typeof container.name === 'string' &&
    container.name.startsWith(MCP_TOOL_NAME_PREFIX)
  );
}
