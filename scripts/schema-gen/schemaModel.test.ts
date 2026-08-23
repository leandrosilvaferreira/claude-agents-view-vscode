import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createEmptyModel,
  loadSchemaObservations,
  saveSchemaObservations,
  mergeSchemaObservations,
  FieldObservation,
  TypeObservation,
  SchemaObservationModel,
} from './schemaModel';

function makeField(overrides: Partial<FieldObservation> = {}): FieldObservation {
  return {
    types: ['string'],
    presentCount: 1,
    firstSeenVersion: '1.0.0',
    lastSeenVersion: '1.0.0',
    ...overrides,
  };
}

function makeTypeObservation(overrides: Partial<TypeObservation> = {}): TypeObservation {
  return {
    sampleCount: 1,
    firstSeenVersion: '1.0.0',
    lastSeenVersion: '1.0.0',
    fields: {},
    ...overrides,
  };
}

function makeModel(overrides: Partial<SchemaObservationModel> = {}): SchemaObservationModel {
  return {
    ...createEmptyModel(),
    ...overrides,
  };
}

describe('mergeSchemaObservations', () => {
  it('keeps an existing type fully untouched when the incoming batch only adds a fresh type', () => {
    const typeAFields = { x: makeField({ types: ['string'], presentCount: 3 }) };
    const base = makeModel({ types: { typeA: makeTypeObservation({ fields: typeAFields }) } });
    const typeBFields = { y: makeField({ types: ['number'], presentCount: 5 }) };
    const incoming = makeModel({ types: { typeB: makeTypeObservation({ fields: typeBFields }) } });

    const merged = mergeSchemaObservations(base, incoming);

    expect(Object.keys(merged.types).sort()).toEqual(['typeA', 'typeB']);
    expect(merged.types.typeA).toEqual(base.types.typeA);
    expect(merged.types.typeB).toEqual(incoming.types.typeB);
    // Inputs themselves must stay untouched (pure merge, no shared-reference mutation).
    expect(Object.keys(base.types)).toEqual(['typeA']);
    expect(Object.keys(incoming.types)).toEqual(['typeB']);
  });

  it('unions field types and sums presentCount when the same field is observed in both batches', () => {
    const base = makeModel({
      types: {
        typeA: makeTypeObservation({
          fields: { x: makeField({ types: ['string'], presentCount: 3 }) },
        }),
      },
    });
    const incoming = makeModel({
      types: {
        typeA: makeTypeObservation({
          fields: {
            x: makeField({ types: ['undefined'], presentCount: 2 }),
            z: makeField({ types: ['boolean'], presentCount: 1 }),
          },
        }),
      },
    });

    const merged = mergeSchemaObservations(base, incoming);

    expect(merged.types.typeA.fields.x).toEqual({
      types: ['string', 'undefined'],
      presentCount: 5,
      firstSeenVersion: '1.0.0',
      lastSeenVersion: '1.0.0',
    });
    expect(merged.types.typeA.fields.z).toEqual(incoming.types.typeA.fields.z);
    expect(merged.types.typeA.sampleCount).toBe(2);
  });

  it('routes unrecognized-type observations through unknownTypes without dropping either side', () => {
    const base = makeModel({ unknownTypes: { weird: makeTypeObservation() } });
    const incoming = makeModel({ unknownTypes: { alsoWeird: makeTypeObservation() } });

    const merged = mergeSchemaObservations(base, incoming);

    expect(Object.keys(merged.unknownTypes).sort()).toEqual(['alsoWeird', 'weird']);
  });

  it('widens firstSeenVersion/lastSeenVersion across two merges without ever regressing', () => {
    // "2.1.10" sorts before "2.1.9" as a plain string, so this also exercises the
    // numeric (not lexicographic) version compare.
    const base = makeModel({
      types: { typeA: makeTypeObservation({ firstSeenVersion: '2.1.9', lastSeenVersion: '2.1.9' }) },
    });
    const batch2 = makeModel({
      types: { typeA: makeTypeObservation({ firstSeenVersion: '2.1.10', lastSeenVersion: '2.1.10' }) },
    });

    const merged1 = mergeSchemaObservations(base, batch2);
    expect(merged1.types.typeA.firstSeenVersion).toBe('2.1.9');
    expect(merged1.types.typeA.lastSeenVersion).toBe('2.1.10');

    const batch3 = makeModel({
      types: { typeA: makeTypeObservation({ firstSeenVersion: '2.1.2', lastSeenVersion: '2.1.2' }) },
    });
    const merged2 = mergeSchemaObservations(merged1, batch3);
    // An even earlier sighting pulls firstSeenVersion further back...
    expect(merged2.types.typeA.firstSeenVersion).toBe('2.1.2');
    // ...but lastSeenVersion must not regress backward to it.
    expect(merged2.types.typeA.lastSeenVersion).toBe('2.1.10');
  });

  it('unions cliVersionsObserved and keeps the later generatedAt', () => {
    const base = makeModel({ generatedAt: '2026-08-01T00:00:00.000Z', cliVersionsObserved: ['2.1.9'] });
    const incoming = makeModel({ generatedAt: '2026-08-22T00:00:00.000Z', cliVersionsObserved: ['2.1.10', '2.1.9'] });

    const merged = mergeSchemaObservations(base, incoming);

    expect(merged.generatedAt).toBe('2026-08-22T00:00:00.000Z');
    expect(merged.cliVersionsObserved).toEqual(['2.1.9', '2.1.10']);
  });
});

// Finding A structural defense-in-depth, for mergeFields/mergeTypeBuckets specifically. A
// sibling top-level describe (not nested in the one above) so its line count doesn't push
// that describe past this repo's max-lines-per-function limit. Reproduces the exact crash
// two reviewers found: a plain-object accumulator's `key in base` resolves true through the
// prototype chain even when `key` was never actually recorded, so the merge reads the
// *inherited built-in* (e.g. the Object constructor function) as if it were a real
// TypeObservation/FieldObservation, and eventually throws inside compareVersions reading
// `.split` off a non-existent firstSeenVersion — reproduced with a bare
// `{"type":"__proto__"}` transcript line, no nesting required.
describe('mergeSchemaObservations — Object.prototype member names as type-bucket/field keys', () => {
  const PROTO_MEMBER_NAMES = [
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty',
    'valueOf',
    'isPrototypeOf',
    'toLocaleString',
    'propertyIsEnumerable',
  ];

  it.each(PROTO_MEMBER_NAMES)(
    'merges a type bucket (and nested field) keyed %j against an empty baseline without crashing',
    (protoKey) => {
      const incoming = makeModel({
        types: { [protoKey]: makeTypeObservation({ fields: { [protoKey]: makeField() } }) },
      });

      const merged = mergeSchemaObservations(createEmptyModel(), incoming);

      expect(merged.types[protoKey]).toEqual(incoming.types[protoKey]);
      expect(merged.types[protoKey].fields[protoKey]).toEqual(makeField());
    },
  );

  it.each(PROTO_MEMBER_NAMES)(
    'sums sampleCount across two batches sharing a type bucket keyed %j, instead of reading the inherited built-in',
    (protoKey) => {
      const base = makeModel({ types: { [protoKey]: makeTypeObservation({ sampleCount: 3 }) } });
      const incoming = makeModel({ types: { [protoKey]: makeTypeObservation({ sampleCount: 2 }) } });

      const merged = mergeSchemaObservations(base, incoming);

      expect(merged.types[protoKey].sampleCount).toBe(5);
    },
  );
});

describe('loadSchemaObservations / saveSchemaObservations', () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-model-test-'));
  });

  afterEach(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  it('returns an empty baseline when the file does not exist yet (first run)', () => {
    const filePath = path.join(testRoot, 'schema-observations.json');

    expect(loadSchemaObservations(filePath)).toEqual(createEmptyModel());
  });

  it('round-trips whatever saveSchemaObservations wrote', () => {
    const filePath = path.join(testRoot, 'schema-observations.json');
    const model = makeModel({
      generatedAt: '2026-08-22T00:00:00.000Z',
      cliVersionsObserved: ['2.1.9'],
      types: { typeA: makeTypeObservation({ fields: { x: makeField() } }) },
    });

    saveSchemaObservations(filePath, model);

    expect(loadSchemaObservations(filePath)).toEqual(model);
  });

  it('throws on a present-but-malformed file instead of silently returning a baseline', () => {
    const filePath = path.join(testRoot, 'schema-observations.json');
    fs.writeFileSync(filePath, JSON.stringify({ not: 'the right shape' }));

    expect(() => loadSchemaObservations(filePath)).toThrow();
  });
});
