import { ARRAY_PATH_SEGMENT, DYNAMIC_KEY_SEGMENT } from './schemaAggregator';
import { isKnownDynamicKeyContainer, isSchemaLikeKey } from './keySafety';
import {
  createEmptyModel,
  FieldObservation,
  TypeObservation,
  SchemaObservationModel,
  mergeFieldObservation,
} from './schemaModel';

/**
 * Re-applies the CURRENT key-safety rules (keySafety.ts) to every field path already committed
 * in a loaded schema-observations.json baseline, before generate.ts merges a new run on top.
 *
 * mergeSchemaObservations is additive-only by design (transcript-schema-gen.md, Success
 * Criterion 3) — it adds new field/type facts, but it never re-checks what's already committed.
 * That's fine for ordinary schema growth, but it also means a field-path segment that passed an
 * OLDER, narrower rule stays literal forever: e.g. the 291 literal
 * `mcpMeta.structuredContent.<field>` paths (third-party MCP field names) already committed
 * before `structuredContent` was added to KNOWN_DYNAMIC_KEY_CONTAINERS, or a
 * `wireToolInputs.<toolu id>.command` path recorded before OPAQUE_ID_KEY existed — and the same
 * gap would reopen for any container listed in the future. Run once, right after
 * loadSchemaObservations and before mergeSchemaObservations, `sanitizeBaseline` walks every
 * already-committed field path segment-by-segment and collapses anything the current rules would
 * reject, so the baseline itself is cleaned up going forward instead of accumulating leaks it can
 * never shed.
 *
 * A committed path is a bare dotted string with no access to the original transcript value, so
 * most of this can only re-apply rules judgeable from the path alone: `isSchemaLikeKey` per
 * segment, and `isKnownDynamicKeyContainer` (keySafety.ts — covers both
 * KNOWN_DYNAMIC_KEY_CONTAINERS and the newer OPAQUE_KEY_CONTAINERS, e.g. a legacy
 * `attachment.tools.[].schema.input_schema.properties.<param>` path collapses the same way a
 * fresh run would). `isMcpToolUseInputKey` is the one exception: it needs the SIBLING `name`
 * value on the same original object, which a flattened path like `message.content.[].input.
 * <field>` no longer carries, so a legacy path already committed under a built-in tool's `input`
 * and one committed under an MCP tool's `input` are indistinguishable from the path alone.
 *
 * Rather than leaving every such path exactly as committed forever, `sanitizeBaseline` also takes
 * the FRESH run's own model (`generate.ts` already has it before this call, from the same
 * `aggregateSchema` pass that produces the run merged in right after) and cross-checks against
 * it: a fresh pass applies the real `isMcpToolUseInputKey` check at observation time, off the
 * real sibling `name` field, so a built-in tool's own parameter (e.g. Bash's `command`) is
 * re-recorded literally, at that exact path, on every run that exercises it — while an MCP tool's
 * own parameter is not (it collapses onto `message.content.[].input.[dynamic-key]` instead). A
 * legacy `message.content.[].input.<leaf>` path this run's fresh model re-observed literally is
 * therefore still a real, currently-recording built-in-tool field and stays; one it did NOT
 * re-observe collapses the same way (see `reconcileToolUseInputPath` below), merged via
 * `mergeFieldObservation` into whatever the collapsed path already accumulated. The one remaining
 * gap: a built-in tool's parameter this particular run's corpus simply didn't happen to exercise
 * collapses too, indistinguishable from a genuine legacy MCP leak until some future run
 * re-observes it — an acceptable trade against carrying every MCP leak forward forever.
 */

/**
 * Re-checks one dotted field path segment by segment against the current rules, mirroring
 * schemaAggregator.ts's `walkValue` traversal exactly so a sanitized legacy path can never
 * diverge from what a fresh run would produce for the same underlying data:
 *  - A segment that's already one of the aggregator's own safe placeholders (ARRAY_PATH_SEGMENT/
 *    DYNAMIC_KEY_SEGMENT) is kept as-is.
 *  - A segment that fails `isSchemaLikeKey` on its own merits (e.g. an opaque id, or an
 *    Object.prototype member name) collapses onto DYNAMIC_KEY_SEGMENT, and nothing further is
 *    kept — `walkValue` never recurses past an unsafe key either.
 *  - Once a KNOWN_DYNAMIC_KEY_CONTAINERS segment is seen, every following segment is unsafe by
 *    construction; an immediately-following ARRAY_PATH_SEGMENT survives first (the container's
 *    own value being an array — `walkValue`'s array branch produces the exact same shape), then
 *    whatever comes next collapses onto one trailing DYNAMIC_KEY_SEGMENT.
 */
function sanitizePath(path: string): string {
  const segments = path.split('.');
  const sanitized: string[] = [];
  let underContainer = false;

  for (const segment of segments) {
    if (underContainer) {
      if (segment === ARRAY_PATH_SEGMENT) {
        sanitized.push(segment); // the container's own value is an array — structural, not content
        continue;
      }
      sanitized.push(DYNAMIC_KEY_SEGMENT);
      break; // nothing is ever recorded past this point, matching walkValue's non-recursion
    }
    if (segment === ARRAY_PATH_SEGMENT || segment === DYNAMIC_KEY_SEGMENT) {
      sanitized.push(segment); // already one of the aggregator's own safe placeholders
      continue;
    }
    if (!isSchemaLikeKey(segment)) {
      sanitized.push(DYNAMIC_KEY_SEGMENT);
      break;
    }
    sanitized.push(segment);
    underContainer = isKnownDynamicKeyContainer(segment);
  }
  return sanitized.join('.');
}

/** The exact flattened-path shape `isMcpToolUseInputKey` (keySafety.ts) would judge from a
 * `message.content[]` tool_use block's sibling `name` field — the one shape `sanitizePath` above
 * can't re-derive from a bare dotted path alone (see the module doc comment). */
const TOOL_USE_INPUT_PATH_PREFIX = `message.content.${ARRAY_PATH_SEGMENT}.input.`;

/** True when `path` is exactly one segment below a `message.content[].input` tool_use block —
 * where a built-in tool's own parameter name and a legacy MCP server's own parameter name are
 * indistinguishable from the path alone. Excludes a path `sanitizePath` already collapsed onto
 * DYNAMIC_KEY_SEGMENT for an unrelated reason (an opaque id, an Object.prototype member, ...) —
 * nothing further to reconcile there. */
function isLegacyToolUseInputLeaf(path: string): boolean {
  if (!path.startsWith(TOOL_USE_INPUT_PATH_PREFIX)) {
    return false;
  }
  const leaf = path.slice(TOOL_USE_INPUT_PATH_PREFIX.length);
  return leaf.length > 0 && leaf !== DYNAMIC_KEY_SEGMENT && !leaf.includes('.');
}

/**
 * Re-attributes a `message.content.[].input.<leaf>` path using the FRESH run's own field paths
 * for the same type bucket (`freshPaths`) — see the module doc comment for why this is the one
 * case `sanitizePath` alone can't decide. `freshPaths` re-observing this exact path literally
 * means a fresh `aggregateSchema` pass judged it a built-in tool's own parameter (off the real
 * sibling `name` field) and it should stay; not finding it means either a legacy MCP leak (now
 * collapsed at observation time going forward) or a built-in tool this run's corpus didn't happen
 * to exercise — either way, collapse it the same way a fresh MCP observation would.
 */
function reconcileToolUseInputPath(path: string, freshPaths: ReadonlySet<string>): string {
  if (!isLegacyToolUseInputLeaf(path) || freshPaths.has(path)) {
    return path;
  }
  return `${TOOL_USE_INPUT_PATH_PREFIX}${DYNAMIC_KEY_SEGMENT}`;
}

/**
 * Re-keys one type bucket's `fields` map onto the sanitized paths. Two (or more) original paths
 * that collapse onto the same sanitized path combine via the existing cross-line
 * `mergeFieldObservation` rule — the same rule schemaModel.ts's own `mergeFields` uses for two
 * different lines observing the same path. `presentCount` is therefore an upper bound rather
 * than an exact re-derivation when it merges what were, in one already-recorded line, several
 * distinct sibling literal fields (e.g. both `issueTitle` and `priority` on the same line) —
 * unavoidable once the per-field detail has already been collapsed into aggregate counts; still
 * strictly safer than leaving the literal paths committed forever. Map-based (not a plain-object
 * accumulator), matching this repo's convention wherever a key is built from a transcript's own
 * text — see schemaAggregator.ts's own note on why. `freshPaths` is this same bucket's field-path
 * set from the fresh run (see `reconcileToolUseInputPath` above) — empty when the fresh run has
 * no bucket by this name at all.
 */
function sanitizeFields(
  fields: Record<string, FieldObservation>,
  freshPaths: ReadonlySet<string>,
): Record<string, FieldObservation> {
  const sanitized = new Map<string, FieldObservation>();
  for (const [path, observation] of Object.entries(fields)) {
    const newPath = reconcileToolUseInputPath(sanitizePath(path), freshPaths);
    const existing = sanitized.get(newPath);
    sanitized.set(newPath, existing === undefined ? observation : mergeFieldObservation(existing, observation));
  }
  return Object.fromEntries(sanitized);
}

function sanitizeTypeBuckets(
  buckets: Record<string, TypeObservation>,
  freshBuckets: Record<string, TypeObservation>,
): Record<string, TypeObservation> {
  // Map, not a plain-object index: `key` below is a corpus-derived type-bucket name (e.g. a
  // transcript's own `type` value), same reasoning as every other corpus-derived-key lookup in
  // this tree — a plain `freshBuckets[key]` risks resolving to an inherited Object.prototype
  // member instead of `undefined` for a key like `constructor`.
  const freshByKey = new Map(Object.entries(freshBuckets));
  const sanitized = new Map<string, TypeObservation>();
  for (const [key, bucket] of Object.entries(buckets)) {
    const freshPaths = new Set(Object.keys(freshByKey.get(key)?.fields ?? {}));
    sanitized.set(key, { ...bucket, fields: sanitizeFields(bucket.fields, freshPaths) });
  }
  return Object.fromEntries(sanitized);
}

/**
 * Returns a copy of `model` with every field path in `types`/`unknownTypes` re-sanitized against
 * the current key-safety rules — see the module doc comment above for why this must run on the
 * loaded baseline, not just on each new run's own (already-safe) output. `freshRun` is this same
 * generate.ts invocation's own freshly-aggregated model, used only to reconcile a legacy
 * `message.content.[].input.*` path (see `reconcileToolUseInputPath` above); it defaults to an
 * empty model — the conservative choice, since not knowing what a fresh run observed collapses
 * every such legacy path rather than keeping any of them. Pure: neither argument is mutated.
 */
export function sanitizeBaseline(
  model: SchemaObservationModel,
  freshRun: SchemaObservationModel = createEmptyModel(),
): SchemaObservationModel {
  return {
    ...model,
    types: sanitizeTypeBuckets(model.types, freshRun.types),
    unknownTypes: sanitizeTypeBuckets(model.unknownTypes, freshRun.unknownTypes),
  };
}
