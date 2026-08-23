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
 * Two known gaps in judging a key by shape alone, both closed by what's below:
 *  - A key can look like a plain identifier (pass `SCHEMA_LIKE_KEY`) yet still be an inherited
 *    `Object.prototype` member name (`constructor`, `toString`, `__proto__`, ...) — dangerous
 *    downstream via `key in obj`/`obj[key]` reads and writes. `isSchemaLikeKey` itself rejects
 *    these; see `isObjectPrototypeMember`.
 *  - A key can look like a plain identifier yet still be real, untrusted *content* — e.g. a
 *    tracked filename (`LICENSE`) or a bare-word answer label — when it comes from a field
 *    that's known to be a dynamic-key map rather than a fixed schema. `isSchemaLikeKey` can't
 *    detect this by shape at all; callers must additionally check the key's *container* via
 *    `isKnownDynamicKeyContainer` before trusting any of its children. See
 *    `KNOWN_DYNAMIC_KEY_CONTAINERS`.
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

export function isSchemaLikeKey(key: string): boolean {
  return SCHEMA_LIKE_KEY.test(key) && !isObjectPrototypeMember(key);
}

/**
 * Field names whose *value* is known to be a map keyed by arbitrary content — not a fixed
 * set of schema field names — even though an individual key inside it can still look like a
 * plain identifier and pass `isSchemaLikeKey` above (a short, punctuation-free real value:
 * a tracked filename like `LICENSE`, a bare-word answer label, ...). `isSchemaLikeKey` only
 * judges a key's *shape*; it has no way to know a key came from one of these containers, so
 * the walker/redactor must check this list themselves before trusting any child key of one
 * of these fields. Deliberately a small, explicit, easy-to-extend list, not a claim of
 * completeness — grow it as new dynamic-key-map fields are found in the real corpus.
 */
export const KNOWN_DYNAMIC_KEY_CONTAINERS: ReadonlySet<string> = new Set([
  'answers', // toolUseResult.answers — AskUserQuestion's answer map, keyed by question text
  'trackedFileBackups', // snapshot.trackedFileBackups — keyed by the real tracked filename
  'artifacts', // keyed by an artifact id/name
  '_meta', // mcpMeta._meta — MCP metadata map, keyed by arbitrary MCP-defined keys
]);

export function isKnownDynamicKeyContainer(key: string): boolean {
  return KNOWN_DYNAMIC_KEY_CONTAINERS.has(key);
}
