import { ParseError, WalkResult } from './corpusWalker';
import { isKnownDynamicKeyContainer, isMcpToolUseInputKey, isSchemaLikeKey } from './keySafety';
import {
  compareVersions,
  mergeFieldObservation,
  mergeTypeHeader,
  FieldObservation,
  SchemaObservationModel,
  TypeObservation,
} from './schemaModel';

/**
 * Consumes the corpus walker's per-line stream (see corpusWalker.ts, T6) and groups it into
 * a `SchemaObservationModel` (see schemaModel.ts, T5) for a single run (see
 * transcript-schema-gen.md, T7). The CLI orchestrator (T11) is the one that loads the prior
 * committed `schema-observations.json` and merges this run's result on top via
 * `mergeSchemaObservations` — this module builds its own run's result independently (see
 * `aggregateSchema`'s own doc comment for how) and is never handed a prior model to start from.
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
 * of a known dynamic-key-map or opaque container field (keySafety.ts's
 * `KNOWN_DYNAMIC_KEY_CONTAINERS`/`OPAQUE_KEY_CONTAINERS`, both fed through the same
 * `isKnownDynamicKeyContainer` check — `answers`, `trackedFileBackups`, `artifacts`, `_meta`,
 * `wireToolInputs`, `wireIngestContext`, `structuredContent`, `properties`) collapses the same
 * way regardless of its own shape, since a short, punctuation-free real value (a tracked
 * filename, a bare-word answer, a third-party tool's own parameter name) would otherwise pass
 * the identifier check and leak through anyway. A fifth, context-dependent safeguard
 * (`isMcpToolUseInputKey`) covers a `message.content[]` tool_use block's `input` field
 * specifically when `name` was minted by an MCP server — that can't be judged from the key
 * alone (a built-in tool's `input` must keep recording its own parameter names normally), only
 * from the sibling `type`/`name` fields on the same object.
 */

/** Top-level fields are depth 1; nesting stops recording once a path reaches this depth. */
const MAX_FIELD_DEPTH = 5;
/** Exported so a baseline re-sanitize pass (generate.ts's committed-observations merge) can
 * collapse a stale literal path onto the exact same placeholders this file emits, instead of
 * re-spelling its own copy that could drift out of sync. */
export const ARRAY_PATH_SEGMENT = '[]';
/** Placeholder for an object key that fails isSchemaLikeKey — mirrors the ARRAY_PATH_SEGMENT
 * convention above, but for a content-derived key instead of an array index. */
export const DYNAMIC_KEY_SEGMENT = '[dynamic-key]';
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

// Map, not a plain-object accumulator, throughout this file: a field path or type-bucket key
// is built from a transcript's own key/type text (see walkValue/collectFields/foldBucket
// below), so it must never be trusted to avoid colliding with an inherited Object.prototype
// member name (`toString`, `constructor`, ...) — a plain `{}` accumulator would misread
// `path in base` as true via the prototype chain even when `path` was never actually
// recorded, and merge the *inherited built-in* as if it were a real FieldObservation. A `Map`
// has no prototype chain, so this class of bug can't happen here regardless of whether
// keySafety.ts's own guard is correct (defense in depth — two independent reviewers flagged
// this exact accumulator and asked that it not rely on the upstream regex gate alone). Mirrors
// diffLogEntry.ts's sumPresentCountsByTopLevelField / generateFixtures.ts's samplesByBucket,
// the same pattern already used elsewhere in this tree. Object.fromEntries (wherever a Map is
// materialized back to a plain object below) uses CreateDataPropertyOrThrow, not `[[Set]]` — a
// `__proto__` entry always lands as a genuine own property instead of repointing the result's
// prototype (verified), so that materialization step is itself safe regardless of the key.

/** Adds one field observation to a single line's own running Map, combining with whatever's
 * already there via `combineSameLineFieldObservations` (presentCount stays 1 — this is
 * intra-line combination, e.g. two elements of the same collapsed `[]` array path; cross-line
 * combination is `foldBucket`'s job, below, via schemaModel.ts's `mergeFieldObservation`).
 * Mutates `fields` in place — see `aggregateSchema`'s doc comment for why this file mutates a
 * local accumulator instead of following this repo's usual copy-on-write convention. */
function addField(fields: Map<string, FieldObservation>, path: string, observation: FieldObservation): void {
  const existing = fields.get(path);
  fields.set(path, existing === undefined ? observation : combineSameLineFieldObservations(existing, observation));
}

interface WalkContext {
  path: string;
  depth: number;
  version: string;
  /** Set when this value is itself the value of a known dynamic-key-map container field
   * (KNOWN_DYNAMIC_KEY_CONTAINERS, keySafety.ts) — or an array found anywhere inside one: the
   * array branch below forwards its own ctx.forceDynamicKey unchanged onto every element's ctx,
   * so a container's value being an array of maps (`answers: [{ LICENSE: 'x' }]`) doesn't reset
   * this back to unset at the array boundary. When true and the value being walked is a plain
   * object, every one of that object's own keys collapses onto DYNAMIC_KEY_SEGMENT
   * unconditionally, without ever consulting isSchemaLikeKey — a short, punctuation-free real
   * value (a tracked filename, a bare-word answer) would otherwise pass the identifier-shape
   * regex and leak through even though the field itself is known to be keyed by arbitrary
   * content, not a fixed schema (Finding B). Never needs to propagate INTO a collapsed key's own
   * nested value, though: a key that collapses is never recursed into in the first place, exactly
   * like the ordinary `!isSchemaLikeKey(key)` case below already doesn't recurse. */
  forceDynamicKey?: boolean;
}

/** One value at `ctx.path`, plus (below MAX_FIELD_DEPTH) everything nested inside it — adds
 * directly into `fields` (mutated in place) instead of returning a fresh Record merged by the
 * caller at every recursive step, so a wide/deep single line no longer re-copies its own
 * already-collected fields on every child (see `aggregateSchema`'s doc comment). Traversal
 * order (parent path added before its children, in `Object.entries` order) is unchanged from
 * before — schemaAggregator.equivalence.test.ts pins the resulting path order. */
function walkValue(value: unknown, ctx: WalkContext, fields: Map<string, FieldObservation>): void {
  addField(fields, ctx.path, newFieldObservation(value, ctx.version));
  if (ctx.depth >= MAX_FIELD_DEPTH) {
    return;
  }
  if (Array.isArray(value)) {
    const childPath = `${ctx.path}.${ARRAY_PATH_SEGMENT}`;
    for (const element of value) {
      // Forward forceDynamicKey unchanged — a known dynamic-key container's value can itself be
      // an array of maps (`answers: [{ LICENSE: 'x' }]`); without this, the array boundary reset
      // it to unset and the map's own keys leaked through this branch (see WalkContext's own
      // doc comment above).
      walkValue(
        element,
        { path: childPath, depth: ctx.depth + 1, version: ctx.version, forceDynamicKey: ctx.forceDynamicKey },
        fields,
      );
    }
    return;
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
        addField(fields, `${ctx.path}.${DYNAMIC_KEY_SEGMENT}`, newFieldObservation(nested, ctx.version));
        continue;
      }
      walkValue(
        nested,
        {
          path: `${ctx.path}.${key}`,
          depth: ctx.depth + 1,
          version: ctx.version,
          // `value` here is the CURRENT object being iterated — the container itself for the
          // static name check, and the tool_use block for the MCP sibling-context check (see
          // isMcpToolUseInputKey's own doc comment for why that one needs the container).
          forceDynamicKey: isKnownDynamicKeyContainer(key) || isMcpToolUseInputKey(value, key),
        },
        fields,
      );
    }
  }
}

function collectFields(value: Record<string, unknown>, version: string): Record<string, FieldObservation> {
  const fields = new Map<string, FieldObservation>();
  for (const [key, fieldValue] of Object.entries(value)) {
    if (!isSchemaLikeKey(key)) {
      addField(fields, DYNAMIC_KEY_SEGMENT, newFieldObservation(fieldValue, version));
      continue;
    }
    walkValue(fieldValue, { path: key, depth: 1, version, forceDynamicKey: isKnownDynamicKeyContainer(key) }, fields);
  }
  return Object.fromEntries(fields);
}

/** Builds the single-line `SchemaObservationModel` for one parsed line — exactly one type (or
 * unknownTypes) bucket, `sampleCount: 1`, folded into the running aggregate by `aggregateSchema`
 * below (see its own doc comment for how). `generatedAt` is left `''`: stamping the real run
 * timestamp is the CLI orchestrator's job (T11), not this per-line observation step. */
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

/** The mutable, per-run counterpart of `TypeObservation` — same fields, except `fields` stays
 * a `Map` kept alive for the whole `aggregateSchema` call instead of a `Record` rebuilt from
 * scratch on every line (see `foldBucket`/`aggregateSchema` below for why). */
interface MutableTypeObservation {
  sampleCount: number;
  firstSeenVersion: string;
  lastSeenVersion: string;
  fields: Map<string, FieldObservation>;
}

function newMutableTypeObservation(observation: TypeObservation): MutableTypeObservation {
  return { ...observation, fields: new Map(Object.entries(observation.fields)) };
}

/** Folds one line's single-bucket observation into a `types`/`unknownTypes` section's running
 * Map. A bucket seen for the first time is adopted as-is (mirrors the old code's
 * `existing === undefined` branch in `mergeTypeBuckets`); otherwise its header merges via the
 * shared `mergeTypeHeader` (schemaModel.ts — also used by `mergeTypeObservation`) and its fields
 * combine via the same `mergeFieldObservation` schemaModel.ts's own field merge uses — just
 * without rebuilding the whole accumulated bucket from scratch on every line. That per-line
 * `new Map(Object.entries(base))` full copy (the old approach, still used for the CLI's
 * committed-file merge) redoes O(bucket size) work on every one of that bucket's future lines,
 * so a bucket that keeps growing (e.g. every `assistant` line) makes the whole run O(lines²)
 * instead of O(lines) — see `aggregateSchema`'s own doc comment below for the full comparison. */
function foldBucket(section: Map<string, MutableTypeObservation>, key: string, observation: TypeObservation): void {
  const bucket = section.get(key);
  if (bucket === undefined) {
    section.set(key, newMutableTypeObservation(observation));
    return;
  }
  Object.assign(bucket, mergeTypeHeader(bucket, observation));
  for (const [fieldPath, field] of Object.entries(observation.fields)) {
    const existing = bucket.fields.get(fieldPath);
    bucket.fields.set(fieldPath, existing === undefined ? field : mergeFieldObservation(existing, field));
  }
}

function materializeTypeBuckets(section: Map<string, MutableTypeObservation>): Record<string, TypeObservation> {
  const materialized = new Map<string, TypeObservation>();
  for (const [key, bucket] of section) {
    materialized.set(key, { ...bucket, fields: Object.fromEntries(bucket.fields) });
  }
  return Object.fromEntries(materialized);
}

/**
 * Aggregates one full pass over `results` (typically `walkCorpus()`'s output) into a single
 * `SchemaObservationModel` — value-for-value additive, the same as folding every line through
 * `mergeSchemaObservations` one at a time, just without that approach's cost: `mergeFields`
 * rebuilds a bucket's *entire* field map (`new Map(Object.entries(base))` then
 * `Object.fromEntries`) on every single line that touches it, so a bucket that keeps growing
 * (e.g. every `assistant` line) makes the whole run O(lines²) instead of O(lines). Here, each
 * `types`/`unknownTypes` bucket is instead a `Map` kept alive for the whole run and mutated in
 * place by `foldBucket` — this is the one place in scripts/schema-gen that deliberately mutates
 * a local accumulator instead of following this repo's usual copy-on-write convention, and it's
 * safe to: the `Map`s never escape this function (nothing outside `aggregateSchema` ever holds
 * a reference to them), and the `SchemaObservationModel` actually returned is freshly
 * materialized into plain, immutable `Record`s only once, at the very end, via
 * `materializeTypeBuckets`. Equivalence with the old per-line-merge approach — same resulting
 * model, key order included — is pinned by schemaAggregator.equivalence.test.ts.
 */
export async function aggregateSchema(results: AsyncIterable<WalkResult>): Promise<AggregationResult> {
  const parseErrors: ParseError[] = [];
  const types = new Map<string, MutableTypeObservation>();
  const unknownTypes = new Map<string, MutableTypeObservation>();
  const cliVersionsObserved = new Set<string>();

  for await (const result of results) {
    if (!result.ok) {
      parseErrors.push(result);
      continue;
    }
    const line = observeLine(result.value);
    for (const version of line.cliVersionsObserved) {
      cliVersionsObserved.add(version);
    }
    for (const [key, observation] of Object.entries(line.types)) {
      foldBucket(types, key, observation);
    }
    for (const [key, observation] of Object.entries(line.unknownTypes)) {
      foldBucket(unknownTypes, key, observation);
    }
  }

  const model: SchemaObservationModel = {
    generatedAt: '',
    cliVersionsObserved: Array.from(cliVersionsObserved).sort(compareVersions),
    types: materializeTypeBuckets(types),
    unknownTypes: materializeTypeBuckets(unknownTypes),
  };
  return { model, parseErrors };
}
