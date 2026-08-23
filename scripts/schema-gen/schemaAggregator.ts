import { ParseError, WalkResult } from './corpusWalker';
import { isKnownDynamicKeyContainer, isSchemaLikeKey } from './keySafety';
import {
  createEmptyModel,
  mergeSchemaObservations,
  FieldObservation,
  SchemaObservationModel,
  TypeObservation,
} from './schemaModel';

/**
 * Consumes the corpus walker's per-line stream (see corpusWalker.ts, T6) and groups it into
 * a `SchemaObservationModel` (see schemaModel.ts, T5) for a single run (see
 * transcript-schema-gen.md, T7). The CLI orchestrator (T11) is the one that loads the prior
 * committed `schema-observations.json` and merges this run's result on top via
 * `mergeSchemaObservations` — this module only ever starts from `createEmptyModel()`.
 *
 * Bucketing: a line lands under `types["<type>"]` or `types["<type>:<subtype>"]` when its
 * `type` field is a non-empty string; a line with no usable `type` (missing, non-string, or
 * empty) lands under `unknownTypes[UNKNOWN_TYPE_KEY]` instead of being dropped.
 *
 * Field types are recorded as the literal JS `typeof` result (per the plan's "each field's
 * observed JS-typeof union") — `null` and arrays both report as `"object"`, same as `typeof`
 * itself; `Array.isArray`/`isPlainObject` below only decide *recursion* strategy, never what
 * string gets recorded.
 *
 * Structural safeguards keep one pathological line (e.g. a huge `tool_use` payload) from
 * blowing up the field-path space (transcript-schema-gen.md, "Data Shapes"): recursion stops
 * at MAX_FIELD_DEPTH, every array's contents collapse onto one trailing `[]` path segment
 * instead of exploding into per-index paths, and an object key that isn't a plain identifier
 * (see keySafety.ts — e.g. `toolUseResult.answers`, keyed by literal AskUserQuestion question
 * text) collapses onto one trailing `[dynamic-key]` segment instead of leaking its literal text
 * into the path; recursion also stops there, since nothing under an unsafe key can be assumed to
 * be normal structure. A fourth safeguard covers a key that *looks* safe but isn't: every child
 * of a known dynamic-key-map container field (keySafety.ts's `KNOWN_DYNAMIC_KEY_CONTAINERS` —
 * `answers`, `trackedFileBackups`, `artifacts`, `_meta`) collapses the same way regardless of
 * its own shape, since a short, punctuation-free real value (a tracked filename, a bare-word
 * answer) would otherwise pass the identifier check and leak through anyway.
 */

/** Top-level fields are depth 1; nesting stops recording once a path reaches this depth. */
const MAX_FIELD_DEPTH = 5;
const ARRAY_PATH_SEGMENT = '[]';
/** Placeholder for an object key that fails isSchemaLikeKey — mirrors the ARRAY_PATH_SEGMENT
 * convention above, but for a content-derived key instead of an array index. */
const DYNAMIC_KEY_SEGMENT = '[dynamic-key]';
/** Bucket key for a line whose `type` isn't a usable non-empty string — parenthesized so it
 * can never collide with a real `type` value (those look like plain identifiers). */
const UNKNOWN_TYPE_KEY = '(no type)';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractVersion(value: Record<string, unknown>): string {
  return nonEmptyString(value.version) ?? '';
}

/** `type` alone, or `type:subtype` when `subtype` is also a non-empty string (e.g. system
 * messages) — `undefined` when the line has no usable `type` at all. */
function typeBucketKey(value: Record<string, unknown>): string | undefined {
  const type = nonEmptyString(value.type);
  if (type === undefined) {
    return undefined;
  }
  const subtype = nonEmptyString(value.subtype);
  return subtype === undefined ? type : `${type}:${subtype}`;
}

function newFieldObservation(value: unknown, version: string): FieldObservation {
  return { types: [typeof value], presentCount: 1, firstSeenVersion: version, lastSeenVersion: version };
}

/** Combines two sightings of the *same field path within the same line* — e.g. two elements
 * of the same collapsed `[]` array path. `presentCount` stays 1: it counts lines where the
 * field appeared, not raw occurrences, so a 3-element array must not inflate it to 3. Distinct
 * from schemaModel.ts's `mergeFieldObservation`, which sums `presentCount` across lines. */
function combineSameLineFieldObservations(a: FieldObservation, b: FieldObservation): FieldObservation {
  return {
    types: Array.from(new Set([...a.types, ...b.types])).sort(),
    presentCount: 1,
    firstSeenVersion: a.firstSeenVersion,
    lastSeenVersion: a.lastSeenVersion,
  };
}

function mergeFieldMaps(
  base: Record<string, FieldObservation>,
  incoming: Record<string, FieldObservation>,
): Record<string, FieldObservation> {
  // Map, not a plain-object accumulator: a field path is built from a transcript's own key
  // text (see walkValue/collectFields below), so it must never be trusted to avoid colliding
  // with an inherited Object.prototype member name (`toString`, `constructor`, ...) — a plain
  // `{}` accumulator would misread `path in base` as true via the prototype chain even when
  // `path` was never actually recorded, and merge the *inherited built-in* as if it were a
  // real FieldObservation. A `Map` has no prototype chain, so this class of bug can't happen
  // here regardless of whether keySafety.ts's own guard is correct (defense in depth — two
  // independent reviewers flagged this exact accumulator and asked that it not rely on the
  // upstream regex gate alone). Mirrors diffLogEntry.ts's sumPresentCountsByTopLevelField /
  // generateFixtures.ts's samplesByBucket, the same pattern already used elsewhere in this tree.
  const merged = new Map(Object.entries(base));
  for (const [path, observation] of Object.entries(incoming)) {
    const existing = merged.get(path);
    merged.set(path, existing === undefined ? observation : combineSameLineFieldObservations(existing, observation));
  }
  // Object.fromEntries uses CreateDataPropertyOrThrow, not [[Set]] — a `__proto__` entry
  // always lands as a genuine own property instead of repointing the result's prototype
  // (verified), so this materialization step is itself safe regardless of what `path` is.
  return Object.fromEntries(merged);
}

interface WalkContext {
  path: string;
  depth: number;
  version: string;
  /** Set only when this value is itself the value of a known dynamic-key-map container field
   * (KNOWN_DYNAMIC_KEY_CONTAINERS, keySafety.ts). When true, every one of this object's own
   * keys collapses onto DYNAMIC_KEY_SEGMENT unconditionally, without ever consulting
   * isSchemaLikeKey — a short, punctuation-free real value (a tracked filename, a bare-word
   * answer) would otherwise pass the identifier-shape regex and leak through even though the
   * field itself is known to be keyed by arbitrary content, not a fixed schema (Finding B).
   * Never needs to propagate past one level: a key that collapses here is never recursed into,
   * exactly like the ordinary `!isSchemaLikeKey(key)` case below already doesn't recurse. */
  forceDynamicKey?: boolean;
}

/** One value at `ctx.path`, plus (below MAX_FIELD_DEPTH) everything nested inside it. */
function walkValue(value: unknown, ctx: WalkContext): Record<string, FieldObservation> {
  let fields: Record<string, FieldObservation> = { [ctx.path]: newFieldObservation(value, ctx.version) };
  if (ctx.depth >= MAX_FIELD_DEPTH) {
    return fields;
  }
  if (Array.isArray(value)) {
    const childPath = `${ctx.path}.${ARRAY_PATH_SEGMENT}`;
    for (const element of value) {
      fields = mergeFieldMaps(
        fields,
        walkValue(element, { path: childPath, depth: ctx.depth + 1, version: ctx.version }),
      );
    }
    return fields;
  }
  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (ctx.forceDynamicKey || !isSchemaLikeKey(key)) {
        // Key is content-derived — either it fails the identifier-shape check outright (e.g.
        // AskUserQuestion's `answers`, keyed by the literal question text), or this whole
        // object is a known dynamic-key container (ctx.forceDynamicKey) whose keys are never
        // trustworthy no matter their shape (Finding B). Either way: collapse it onto a fixed
        // placeholder and record only that a field was present, without recursing into
        // whatever's underneath it.
        fields = mergeFieldMaps(fields, {
          [`${ctx.path}.${DYNAMIC_KEY_SEGMENT}`]: newFieldObservation(nested, ctx.version),
        });
        continue;
      }
      fields = mergeFieldMaps(
        fields,
        walkValue(nested, {
          path: `${ctx.path}.${key}`,
          depth: ctx.depth + 1,
          version: ctx.version,
          forceDynamicKey: isKnownDynamicKeyContainer(key),
        }),
      );
    }
    return fields;
  }
  return fields;
}

function collectFields(value: Record<string, unknown>, version: string): Record<string, FieldObservation> {
  let fields: Record<string, FieldObservation> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (!isSchemaLikeKey(key)) {
      fields = mergeFieldMaps(fields, { [DYNAMIC_KEY_SEGMENT]: newFieldObservation(fieldValue, version) });
      continue;
    }
    fields = mergeFieldMaps(
      fields,
      walkValue(fieldValue, { path: key, depth: 1, version, forceDynamicKey: isKnownDynamicKeyContainer(key) }),
    );
  }
  return fields;
}

/** Builds the single-line `SchemaObservationModel` for one parsed line — exactly one type (or
 * unknownTypes) bucket, `sampleCount: 1`, folded into the running aggregate by the caller via
 * `mergeSchemaObservations`. `generatedAt` is left `''`: stamping the real run timestamp is
 * the CLI orchestrator's job (T11), not this per-line observation step. */
function observeLine(value: Record<string, unknown>): SchemaObservationModel {
  const version = extractVersion(value);
  const typeObservation: TypeObservation = {
    sampleCount: 1,
    firstSeenVersion: version,
    lastSeenVersion: version,
    fields: collectFields(value, version),
  };
  const bucketKey = typeBucketKey(value);

  return {
    generatedAt: '',
    cliVersionsObserved: version === '' ? [] : [version],
    types: bucketKey === undefined ? {} : { [bucketKey]: typeObservation },
    unknownTypes: bucketKey === undefined ? { [UNKNOWN_TYPE_KEY]: typeObservation } : {},
  };
}

export interface AggregationResult {
  model: SchemaObservationModel;
  /** Malformed lines the walker couldn't parse — counted here so the caller can report them;
   * they contribute no fields to `model`. */
  parseErrors: ParseError[];
}

/** Aggregates one full pass over `results` (typically `walkCorpus()`'s output) into a single
 * `SchemaObservationModel`, additive line by line via `mergeSchemaObservations`. */
export async function aggregateSchema(results: AsyncIterable<WalkResult>): Promise<AggregationResult> {
  let model = createEmptyModel();
  const parseErrors: ParseError[] = [];

  for await (const result of results) {
    if (!result.ok) {
      parseErrors.push(result);
      continue;
    }
    model = mergeSchemaObservations(model, observeLine(result.value));
  }

  return { model, parseErrors };
}
