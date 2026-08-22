import * as fs from 'fs';

/**
 * TS types + pure read/merge/write functions for `schema-observations.json` — the
 * cumulative, committed record of every transcript shape this tool has ever observed,
 * across every run it has ever made (see transcript-schema-gen.md, "Data Shapes").
 * Additive only: a later run must never lose a field/type/version fact an earlier run
 * already recorded (transcript-schema-gen.md, Success Criterion 3).
 */

/** One field's observations inside a type bucket. `types` is the union of every JS
 * `typeof` value seen for this field across every sample and every run (e.g.
 * `["string", "undefined"]` for an optionally-present string field). */
export interface FieldObservation {
  types: string[];
  presentCount: number;
  firstSeenVersion: string;
  lastSeenVersion: string;
}

/** Observations for one `type` (or `type:subtype`) bucket, keyed by dotted field path
 * (e.g. `message.content.text`). The walk that produces these paths caps recursion depth
 * at 4-5 levels and collapses array contents to a single trailing `[]` segment instead of
 * per-index — enforced by whichever code builds these paths (the aggregator), not by this
 * type itself. */
export interface TypeObservation {
  sampleCount: number;
  firstSeenVersion: string;
  lastSeenVersion: string;
  fields: Record<string, FieldObservation>;
}

/** The full cumulative artifact persisted to `schema-observations.json`. `unknownTypes`
 * has the same per-bucket shape as `types` — it's where lines whose `type` matched
 * nothing recognized land, instead of being silently dropped. */
export interface SchemaObservationModel {
  generatedAt: string;
  cliVersionsObserved: string[];
  types: Record<string, TypeObservation>;
  unknownTypes: Record<string, TypeObservation>;
}

/** The starting point for the very first run: nothing observed yet. */
export function createEmptyModel(): SchemaObservationModel {
  return {
    generatedAt: '',
    cliVersionsObserved: [],
    types: {},
    unknownTypes: {},
  };
}

/** Naive dotted-numeric version compare (e.g. "2.1.9" < "2.1.10" — a plain string compare
 * would get this backwards). Falls back to a per-component string compare when a
 * component isn't numeric. Local to this file on purpose: scripts/ deliberately stays
 * outside the root TS project (transcript-schema-gen.md, T8/T17's reasoning), so this
 * can't import src/claudeCompat.ts's own compareVersions.
 * ponytail: no semver pre-release/build-metadata handling — upgrade if CLI versions ever
 * grow a `-beta.1`-style suffix. */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.');
  const partsB = b.split('.');
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const rawA = partsA[i] ?? '0';
    const rawB = partsB[i] ?? '0';
    const numA = Number(rawA);
    const numB = Number(rawB);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      const compared = rawA.localeCompare(rawB);
      if (compared !== 0) return compared;
      continue;
    }
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

function earliestVersion(a: string, b: string): string {
  return compareVersions(a, b) <= 0 ? a : b;
}

function latestVersion(a: string, b: string): string {
  return compareVersions(a, b) >= 0 ? a : b;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Shallow structural check on the top-level shape. This file is written only by
 * `saveSchemaObservations` below and lives in this repo's own git history — not an
 * attacker-controlled boundary the way a raw transcript line is (that's the corpus
 * walker's job) — so this only guards against a truncated write or a stray hand-edit, not
 * full recursive validation of every nested field. */
function isSchemaObservationModel(value: unknown): value is SchemaObservationModel {
  return (
    isPlainObject(value) &&
    typeof value.generatedAt === 'string' &&
    isStringArray(value.cliVersionsObserved) &&
    isPlainObject(value.types) &&
    isPlainObject(value.unknownTypes)
  );
}

/** Loads the committed `schema-observations.json` from `filePath`. Returns an empty
 * baseline when the file doesn't exist yet (the very first run) — every other read,
 * parse, or shape failure is thrown rather than swallowed: this file is this tool's own
 * single cumulative source of truth, so silently falling back to an empty baseline on a
 * corrupt-but-present file would quietly lose real recorded history instead of surfacing
 * the problem. */
export function loadSchemaObservations(filePath: string): SchemaObservationModel {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return createEmptyModel();
    }
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!isSchemaObservationModel(parsed)) {
    throw new Error(`schemaModel: ${filePath} does not match the expected schema-observations.json shape`);
  }
  return parsed;
}

/** Serializes `model` to disk at `filePath` as pretty-printed JSON (stable 2-space
 * indent, trailing newline) so the committed diff stays small and human-reviewable. */
export function saveSchemaObservations(filePath: string, model: SchemaObservationModel): void {
  fs.writeFileSync(filePath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
}

function mergeTypeUnion(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b])).sort();
}

function mergeFieldObservation(a: FieldObservation, b: FieldObservation): FieldObservation {
  return {
    types: mergeTypeUnion(a.types, b.types),
    presentCount: a.presentCount + b.presentCount,
    firstSeenVersion: earliestVersion(a.firstSeenVersion, b.firstSeenVersion),
    lastSeenVersion: latestVersion(a.lastSeenVersion, b.lastSeenVersion),
  };
}

function mergeFields(
  base: Record<string, FieldObservation>,
  incoming: Record<string, FieldObservation>,
): Record<string, FieldObservation> {
  const merged: Record<string, FieldObservation> = { ...base };
  for (const [fieldPath, field] of Object.entries(incoming)) {
    // `fieldPath in base` (a real boolean), not a truthy-check on `base[fieldPath]`: a
    // plain Record index type is always `FieldObservation` here (never `| undefined`),
    // so TS/eslint would flag an `existing ? … : …` truthy-check on the indexed value
    // itself as unnecessary even though the key genuinely may be absent at runtime.
    merged[fieldPath] = fieldPath in base ? mergeFieldObservation(base[fieldPath], field) : field;
  }
  return merged;
}

function mergeTypeObservation(a: TypeObservation, b: TypeObservation): TypeObservation {
  return {
    sampleCount: a.sampleCount + b.sampleCount,
    firstSeenVersion: earliestVersion(a.firstSeenVersion, b.firstSeenVersion),
    lastSeenVersion: latestVersion(a.lastSeenVersion, b.lastSeenVersion),
    fields: mergeFields(a.fields, b.fields),
  };
}

function mergeTypeBuckets(
  base: Record<string, TypeObservation>,
  incoming: Record<string, TypeObservation>,
): Record<string, TypeObservation> {
  const merged: Record<string, TypeObservation> = { ...base };
  for (const [key, bucket] of Object.entries(incoming)) {
    // Same reasoning as mergeFields above: check key presence via `in`, not a
    // truthy-check on the indexed value.
    merged[key] = key in base ? mergeTypeObservation(base[key], bucket) : bucket;
  }
  return merged;
}

/** Merges `incoming` into `base`, additive-only: every field/type/version fact already in
 * `base` survives untouched unless `incoming` reports new information about that exact
 * same field or type — nothing already recorded is ever deleted, and
 * `firstSeenVersion`/`lastSeenVersion` only ever widen the observed range, never narrow
 * it (transcript-schema-gen.md, Success Criterion 3). Pure: neither `base` nor `incoming`
 * is mutated. */
export function mergeSchemaObservations(
  base: SchemaObservationModel,
  incoming: SchemaObservationModel,
): SchemaObservationModel {
  return {
    generatedAt: base.generatedAt > incoming.generatedAt ? base.generatedAt : incoming.generatedAt,
    cliVersionsObserved: Array.from(new Set([...base.cliVersionsObserved, ...incoming.cliVersionsObserved])).sort(
      compareVersions,
    ),
    types: mergeTypeBuckets(base.types, incoming.types),
    unknownTypes: mergeTypeBuckets(base.unknownTypes, incoming.unknownTypes),
  };
}
