/**
 * Decides whether an object key is safe to keep literally — as a schema field-path segment
 * (schemaAggregator.ts) or as a fixture's JSON key (redact.ts) — versus one that must be treated
 * as untrusted, content-derived text.
 *
 * Every currently-known real transcript key is a short, plain JS identifier (`type`, `message`,
 * `toolUseResult`, `cwd`, ...). The one confirmed counterexample is `toolUseResult.answers`
 * (the `AskUserQuestion` tool's answer map), whose keys are the literal question text — real,
 * often sensitive, free-form prose, not a fixed field name. This predicate exists to catch that
 * shape (and any future field with the same problem) before a key's own text — not just its
 * value — ends up in a generated artifact.
 */

/**
 * Matches a plain JS identifier: starts with a letter, `_`, or `$`, followed by up to 63 more
 * word characters (64 total — comfortably above every real field name in this codebase, e.g.
 * `firstSeenVersion`, while still bounding the pathological case of an arbitrarily long string
 * being used as a key). A space, `?`, `.`, `,`, or any punctuation beyond `_`/`$` fails
 * immediately — exactly the shape of a free-text question used as a key.
 */
const SCHEMA_LIKE_KEY = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

export function isSchemaLikeKey(key: string): boolean {
  return SCHEMA_LIKE_KEY.test(key);
}
