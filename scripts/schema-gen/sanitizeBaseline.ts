import { ARRAY_PATH_SEGMENT, DYNAMIC_KEY_SEGMENT } from './schemaAggregator';
import { isKnownDynamicKeyContainer, isSchemaLikeKey } from './keySafety';
import { FieldObservation, TypeObservation, SchemaObservationModel, mergeFieldObservation } from './schemaModel';

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
 * text — see schemaAggregator.ts's own note on why.
 */
function sanitizeFields(fields: Record<string, FieldObservation>): Record<string, FieldObservation> {
  const sanitized = new Map<string, FieldObservation>();
  for (const [path, observation] of Object.entries(fields)) {
    const newPath = sanitizePath(path);
    const existing = sanitized.get(newPath);
    sanitized.set(newPath, existing === undefined ? observation : mergeFieldObservation(existing, observation));
  }
  return Object.fromEntries(sanitized);
}

function sanitizeTypeBuckets(buckets: Record<string, TypeObservation>): Record<string, TypeObservation> {
  const sanitized = new Map<string, TypeObservation>();
  for (const [key, bucket] of Object.entries(buckets)) {
    sanitized.set(key, { ...bucket, fields: sanitizeFields(bucket.fields) });
  }
  return Object.fromEntries(sanitized);
}

/**
 * Returns a copy of `model` with every field path in `types`/`unknownTypes` re-sanitized against
 * the current key-safety rules — see the module doc comment above for why this must run on the
 * loaded baseline, not just on each new run's own (already-safe) output. Pure: `model` itself is
 * never mutated.
 */
export function sanitizeBaseline(model: SchemaObservationModel): SchemaObservationModel {
  return {
    ...model,
    types: sanitizeTypeBuckets(model.types),
    unknownTypes: sanitizeTypeBuckets(model.unknownTypes),
  };
}
