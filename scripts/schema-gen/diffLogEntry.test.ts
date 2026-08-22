import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { diffLogEntry, extractInterfacePropertyNames, MIN_SAMPLE_COUNT } from './diffLogEntry';
import { createEmptyModel, FieldObservation, SchemaObservationModel, TypeObservation } from './schemaModel';

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

describe('diffLogEntry', () => {
  it('reports a field at or above the sample threshold that is absent from the known list, and never reports a known field', () => {
    const model = makeModel({
      types: {
        user: makeTypeObservation({
          fields: {
            type: makeField({ presentCount: 5 }),
            newField: makeField({ presentCount: MIN_SAMPLE_COUNT }),
          },
        }),
      },
    });

    const result = diffLogEntry(model, ['type']);

    expect(result).toEqual(['newField']);
  });

  it('excludes a field seen only once, below MIN_SAMPLE_COUNT', () => {
    const model = makeModel({
      types: {
        user: makeTypeObservation({ fields: { rareField: makeField({ presentCount: 1 }) } }),
      },
    });

    const result = diffLogEntry(model, []);

    expect(result).toEqual([]);
  });

  it('sums presentCount for one top-level field across different buckets and different nested paths under it', () => {
    // Neither `message.role` (in `types.user`) nor `message.content` (in `unknownTypes`)
    // reaches MIN_SAMPLE_COUNT on its own — only their combined top-level count does. This
    // pins down both design choices at once: cross-bucket accumulation and collapsing a
    // dotted path onto its top-level segment before comparing against the known list.
    const model = makeModel({
      types: {
        user: makeTypeObservation({ fields: { 'message.role': makeField({ presentCount: 1 }) } }),
      },
      unknownTypes: {
        '(no type)': makeTypeObservation({ fields: { 'message.content': makeField({ presentCount: 1 }) } }),
      },
    });

    const result = diffLogEntry(model, []);

    expect(result).toEqual(['message']);
  });
});

describe('extractInterfacePropertyNames', () => {
  let scratchRoot: string;

  beforeEach(() => {
    scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'diff-log-entry-test-'));
  });

  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('extracts declared property names from a fixture interface', () => {
    const fixturePath = path.join(scratchRoot, 'fixture.ts');
    fs.writeFileSync(fixturePath, 'interface TestShape { foo: string; bar?: number }\n', 'utf8');

    const names = extractInterfacePropertyNames(fixturePath, 'TestShape');

    expect(names).toEqual(['foo', 'bar']);
  });

  it('throws when the named interface is not declared in the file', () => {
    const fixturePath = path.join(scratchRoot, 'fixture.ts');
    fs.writeFileSync(fixturePath, 'interface Other { baz: string }\n', 'utf8');

    expect(() => extractInterfacePropertyNames(fixturePath, 'TestShape')).toThrow();
  });
});
