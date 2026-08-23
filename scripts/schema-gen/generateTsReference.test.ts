import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { generateTsReference } from './generateTsReference';
import { createEmptyModel, FieldObservation, SchemaObservationModel, TypeObservation } from './schemaModel';

// Must match generateTsReference.ts's BANNER constant exactly — this is the plan's required
// verbatim text (transcript-schema-gen.md, T9), not a paraphrase.
const BANNER =
  'AUTO-GENERATED — regenerate via `npm run schema:generate`; observational reference only, ' +
  'not a runtime contract, do not hand-edit, do not import from runtime parsing code.';

function makeField(overrides: Partial<FieldObservation> = {}): FieldObservation {
  return { types: ['string'], presentCount: 1, firstSeenVersion: '1.0.0', lastSeenVersion: '1.0.0', ...overrides };
}

function makeTypeObservation(overrides: Partial<TypeObservation> = {}): TypeObservation {
  return { sampleCount: 1, firstSeenVersion: '1.0.0', lastSeenVersion: '1.0.0', fields: {}, ...overrides };
}

function makeModel(overrides: Partial<SchemaObservationModel> = {}): SchemaObservationModel {
  return { ...createEmptyModel(), ...overrides };
}

describe('generateTsReference', () => {
  it('includes the exact AUTO-GENERATED banner verbatim', () => {
    const output = generateTsReference(makeModel());

    expect(output).toContain(BANNER);
  });

  it('includes every CLI version observed in the model', () => {
    const model = makeModel({ cliVersionsObserved: ['2.1.100', '2.1.218'] });

    const output = generateTsReference(model);

    expect(output).toContain('2.1.100');
    expect(output).toContain('2.1.218');
  });

  it('includes the generation date from model.generatedAt', () => {
    const model = makeModel({ generatedAt: '2026-08-22T12:00:00.000Z' });

    const output = generateTsReference(model);

    expect(output).toContain('2026-08-22T12:00:00.000Z');
  });

  it('renders one PascalCase interface per known type bucket', () => {
    const model = makeModel({
      types: {
        'system:init': makeTypeObservation({ fields: { type: makeField() } }),
        'queue-operation': makeTypeObservation({ fields: { type: makeField() } }),
      },
    });

    const output = generateTsReference(model);

    expect(output).toContain('export interface SystemInit {');
    expect(output).toContain('export interface QueueOperation {');
  });

  it('marks a field optional when presentCount is below sampleCount, required otherwise', () => {
    const model = makeModel({
      types: {
        assistant: makeTypeObservation({
          sampleCount: 4,
          fields: {
            type: makeField({ presentCount: 4 }),
            'message.model': makeField({ presentCount: 1 }),
          },
        }),
      },
    });

    const output = generateTsReference(model);

    expect(output).toContain('"type": string;');
    expect(output).toContain('"message.model"?: string; // present in 1/4 samples');
  });

  it('renders the deduped, sorted union of observed typeof values for a field', () => {
    const model = makeModel({
      types: {
        user: makeTypeObservation({
          sampleCount: 3,
          fields: { 'message.content': makeField({ types: ['string', 'object', 'string'], presentCount: 3 }) },
        }),
      },
    });

    const output = generateTsReference(model);

    expect(output).toContain('"message.content": object | string;');
  });

  it('preserves a nested array field path exactly, including the collapsed [] segment', () => {
    const model = makeModel({
      types: {
        assistant: makeTypeObservation({
          fields: { 'message.content.[].text': makeField() },
        }),
      },
    });

    const output = generateTsReference(model);

    expect(output).toContain('"message.content.[].text": string;');
  });

  it('disambiguates two bucket keys that would collapse to the same interface name', () => {
    const model = makeModel({
      types: {
        'foo-bar': makeTypeObservation(),
        'foo:bar': makeTypeObservation(),
      },
    });

    const output = generateTsReference(model);

    expect(output).toContain('export interface FooBar {');
    expect(output).toContain('export interface FooBar2 {');
  });

  it('falls back to an empty-module export when no known types were observed', () => {
    const output = generateTsReference(makeModel());

    expect(output).toContain('export {};');
    expect(output).toContain('(unknown)');
    expect(output).toContain('(none recorded)');
  });

  it('is deterministic: the same model renders byte-identical output on repeated calls', () => {
    const model = makeModel({
      types: { user: makeTypeObservation({ fields: { type: makeField() } }) },
    });

    expect(generateTsReference(model)).toBe(generateTsReference(model));
  });
});

// Sibling top-level describe (not nested in the one above) so its line count doesn't push
// that describe past this repo's max-lines-per-function limit.
describe('generateTsReference — comment-injection escaping (Finding C)', () => {
  it('escapes a comment-close sequence in a type key and in an observed version so it cannot break out of the generated JSDoc comment', () => {
    const payload = 'evil*/export const HACKED = 1; /*';
    const model = makeModel({
      cliVersionsObserved: [payload],
      types: {
        [payload]: makeTypeObservation({
          firstSeenVersion: payload,
          lastSeenVersion: payload,
          fields: { type: makeField() },
        }),
      },
    });

    const output = generateTsReference(model);

    // The raw payload must never appear verbatim: the comment-close sequence it contains has
    // to be split apart wherever the payload was interpolated (type key, version range, CLI
    // versions observed).
    expect(output).not.toContain(payload);
    // The file must still be one well-formed TS module once corpus text has traveled through
    // the generator — the strongest proof the escape actually holds, not just this test's
    // specific payload. transpileModule's own reported diagnostics (the public API's way of
    // surfacing a syntax error) must be empty.
    const { diagnostics } = ts.transpileModule(output, { reportDiagnostics: true });
    expect(diagnostics ?? []).toEqual([]);
  });
});
