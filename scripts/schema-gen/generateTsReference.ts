import { FieldObservation, SchemaObservationModel, TypeObservation } from './schemaModel';

/**
 * Renders `src/generated/transcriptShapes.ts` (T9, see transcript-schema-gen.md) from an
 * aggregated `SchemaObservationModel` (schemaModel.ts, T5 / schemaAggregator.ts, T7). Pure:
 * returns the file's contents as a string. Writing it to disk is the CLI orchestrator's job
 * (T11) — same split schemaModel.ts already uses between its pure merge and its I/O-doing
 * load/save.
 *
 * Deliberately flat, not a reconstructed nested interface: a real field path (e.g.
 * `message.content`) can itself be observed as more than one JS shape across samples (a
 * known Claude Code transcript quirk — `content` is sometimes a string, sometimes an array of
 * blocks), so a "clean" nested tree would either lose that fact or invent structure the data
 * doesn't cleanly support. One property per exact observed dotted path stays faithful and
 * simple — this is a documentation/reference artifact, not a schema anything validates
 * against (favor readability over cleverness, per the plan).
 */

/** Exact banner text required by the plan — verbatim, do not reword. */
const BANNER =
  'AUTO-GENERATED — regenerate via `npm run schema:generate`; observational reference only, ' +
  'not a runtime contract, do not hand-edit, do not import from runtime parsing code.';

/** Maps a JS `typeof` result to the TS type used to represent it. Exhaustive over all 8
 * possible `typeof` results; a JSON.parse'd transcript line realistically only ever produces
 * "string" | "number" | "boolean" | "object" — the rest are defensive, not expected in
 * practice. */
const TYPEOF_TO_TS: Readonly<Record<string, string>> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  object: 'object',
  undefined: 'undefined',
  bigint: 'bigint',
  function: '(...args: unknown[]) => unknown',
  symbol: 'symbol',
};

function tsUnion(types: readonly string[]): string {
  if (types.length === 0) {
    return 'unknown';
  }
  const mapped = types.map((observedType) => TYPEOF_TO_TS[observedType] ?? 'unknown');
  return Array.from(new Set(mapped)).sort().join(' | ');
}

/** Turns a bucket key (e.g. `system:init`, `queue-operation`) into a PascalCase TS identifier. */
function pascalCase(key: string): string {
  const parts = key.split(/[^a-zA-Z0-9]+/).filter((part) => part.length > 0);
  const joined = parts.map((part) => part[0].toUpperCase() + part.slice(1)).join('');
  return joined.length === 0 || /^[0-9]/.test(joined) ? `Type${joined}` : joined;
}

/** Disambiguates two bucket keys that would otherwise render the same interface name (e.g. two
 * different separator characters collapsing to the same PascalCase form). */
function uniqueInterfaceName(key: string, used: Set<string>): string {
  const base = pascalCase(key);
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

function renderField(path: string, field: FieldObservation, sampleCount: number): string {
  const optional = field.presentCount < sampleCount;
  const propertyName = JSON.stringify(path); // quoted: paths contain dots and `[]` segments
  const presence = optional ? ` // present in ${field.presentCount}/${sampleCount} samples` : '';
  return `  ${propertyName}${optional ? '?' : ''}: ${tsUnion(field.types)};${presence}`;
}

function renderVersionRange(bucket: TypeObservation): string {
  const first = bucket.firstSeenVersion || '(unknown)';
  const last = bucket.lastSeenVersion || '(unknown)';
  return bucket.firstSeenVersion === bucket.lastSeenVersion ? first : `${first}–${last}`;
}

function renderInterface(key: string, bucket: TypeObservation, used: Set<string>): string {
  const name = uniqueInterfaceName(key, used);
  const fieldLines = Object.keys(bucket.fields)
    .sort()
    .map((path) => renderField(path, bucket.fields[path], bucket.sampleCount));
  const doc = `/**\n * Transcript type \`${key}\`. Observed ${bucket.sampleCount} time(s), CLI ${renderVersionRange(bucket)}.\n */`;
  const body = fieldLines.length > 0 ? fieldLines.join('\n') : '  // no fields observed';
  return `${doc}\nexport interface ${name} {\n${body}\n}`;
}

function renderHeader(model: SchemaObservationModel): string {
  const generatedAt = model.generatedAt.length > 0 ? model.generatedAt : '(unknown)';
  const versions = model.cliVersionsObserved.length > 0 ? model.cliVersionsObserved.join(', ') : '(none recorded)';
  return [
    '/**',
    ` * ${BANNER}`,
    ' *',
    ` * Generated: ${generatedAt}`,
    ` * CLI versions observed: ${versions}`,
    ' *',
    ' * Rendered from scripts/schema-gen/schema-observations.json by generateTsReference.ts (T9,',
    ' * see transcript-schema-gen.md). Each interface below is one observed transcript `type` (or',
    ' * `type:subtype`) bucket; each property is the exact dotted field path recorded by',
    ' * schemaAggregator.ts (`[]` marks a collapsed array segment), typed as the union of JS',
    ' * `typeof` values actually observed. A trailing `?` plus a presence-count comment means the',
    ' * field was not present on every sampled line of that bucket.',
    ' */',
  ].join('\n');
}

/** Renders the full `src/generated/transcriptShapes.ts` file contents from `model`. Pure and
 * deterministic: bucket and field ordering are both alphabetical, so re-running the generator
 * against an unchanged model produces byte-identical output — a diff on the committed file
 * should mean a real observation changed, not that the generator merely ran again. */
export function generateTsReference(model: SchemaObservationModel): string {
  const used = new Set<string>();
  const interfaces = Object.keys(model.types)
    .sort()
    .map((key) => renderInterface(key, model.types[key], used));
  const body = interfaces.length > 0 ? interfaces.join('\n\n') : 'export {};';
  return `${renderHeader(model)}\n\n${body}\n`;
}
