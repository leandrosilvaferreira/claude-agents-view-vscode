import { describe, it, expect } from 'vitest';
import { sanitizeBaseline } from './sanitizeBaseline';
import { createEmptyModel, FieldObservation, TypeObservation, SchemaObservationModel } from './schemaModel';

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
  return { ...createEmptyModel(), ...overrides };
}

describe('sanitizeBaseline', () => {
  it('collapses a legacy literal child of a newly-listed container onto the container’s dynamic-key path', () => {
    const baseline = makeModel({
      types: {
        user: makeTypeObservation({
          fields: { 'mcpMeta.structuredContent.issueTitle': makeField({ presentCount: 3 }) },
        }),
      },
    });

    const sanitized = sanitizeBaseline(baseline);

    const fields = sanitized.types.user.fields;
    expect(fields['mcpMeta.structuredContent.[dynamic-key]']).toEqual(makeField({ presentCount: 3 }));
    expect(fields['mcpMeta.structuredContent.issueTitle']).toBeUndefined();
  });

  it('collapses a legacy opaque-id child recorded under wireToolInputs before OPAQUE_ID_KEY existed', () => {
    const baseline = makeModel({
      types: {
        assistant: makeTypeObservation({
          fields: { 'wireToolInputs.toolu_01AbCdEfGhIjKlMnOpQrStUv.command': makeField() },
        }),
      },
    });

    const sanitized = sanitizeBaseline(baseline);

    const fields = sanitized.types.assistant.fields;
    expect(fields['wireToolInputs.[dynamic-key]']).toBeDefined();
    expect(Object.keys(fields).some((path) => path.includes('toolu_'))).toBe(false);
  });

  it('merges two sibling literal children of the same container into one collapsed path, summing counts and widening versions', () => {
    const baseline = makeModel({
      types: {
        user: makeTypeObservation({
          fields: {
            'mcpMeta.structuredContent.issueTitle': makeField({
              types: ['string'],
              presentCount: 3,
              firstSeenVersion: '2.1.9',
              lastSeenVersion: '2.1.10',
            }),
            'mcpMeta.structuredContent.priority': makeField({
              types: ['number'],
              presentCount: 2,
              firstSeenVersion: '2.1.8',
              lastSeenVersion: '2.1.9',
            }),
          },
        }),
      },
    });

    const sanitized = sanitizeBaseline(baseline);

    const fields = sanitized.types.user.fields;
    expect(Object.keys(fields)).toEqual(['mcpMeta.structuredContent.[dynamic-key]']);
    expect(fields['mcpMeta.structuredContent.[dynamic-key]']).toEqual({
      types: ['number', 'string'],
      presentCount: 5,
      firstSeenVersion: '2.1.8',
      lastSeenVersion: '2.1.10',
    });
  });

  it('leaves already-safe field paths exactly as they are', () => {
    const original = makeField({ presentCount: 7 });
    const baseline = makeModel({
      types: { user: makeTypeObservation({ fields: { 'message.content.text': original } }) },
    });

    const sanitized = sanitizeBaseline(baseline);

    expect(sanitized.types.user.fields['message.content.text']).toEqual(original);
    expect(Object.keys(sanitized.types.user.fields)).toEqual(['message.content.text']);
  });

  it('applies the same sanitization to unknownTypes, not just types', () => {
    const baseline = makeModel({
      unknownTypes: {
        '(no type)': makeTypeObservation({
          fields: { 'mcpMeta.structuredContent.customerRef': makeField() },
        }),
      },
    });

    const sanitized = sanitizeBaseline(baseline);

    expect(sanitized.unknownTypes['(no type)'].fields['mcpMeta.structuredContent.[dynamic-key]']).toBeDefined();
  });
});

// Sibling top-level describe (not nested in the one above) so its line count doesn't push that
// describe past this repo's max-lines-per-function limit — same reasoning as the sibling
// describes in schemaAggregator.test.ts/keySafety.test.ts/redact.test.ts. __proto__/constructor
// stay safe at both levels this module touches: a full path segment, and a type-bucket key —
// mirrors schemaModel.test.ts's "Object.prototype member names as type-bucket/field keys"
// describe, for this module's own Map-based rebuild.
describe('sanitizeBaseline — Object.prototype member names stay safe', () => {
  it.each(['__proto__', 'constructor', 'toString'])(
    'collapses a full path segment equal to the Object.prototype member name %j instead of crashing',
    (protoSegment) => {
      const baseline = makeModel({
        types: {
          user: makeTypeObservation({ fields: { [`toolUseResult.${protoSegment}`]: makeField() } }),
        },
      });

      const sanitized = sanitizeBaseline(baseline);

      const fields = sanitized.types.user.fields;
      expect(fields['toolUseResult.[dynamic-key]']).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(fields, `toolUseResult.${protoSegment}`)).toBe(false);
    },
  );

  it.each(['__proto__', 'constructor', 'toString'])(
    'keeps a type bucket keyed by the Object.prototype member name %j intact without corrupting the result',
    (protoKey) => {
      const baseline = makeModel({
        types: { [protoKey]: makeTypeObservation({ fields: { safeField: makeField() } }) },
      });

      const sanitized = sanitizeBaseline(baseline);

      expect(sanitized.types[protoKey]).toEqual(baseline.types[protoKey]);
      expect(Object.getPrototypeOf(sanitized.types)).toBe(Object.prototype);
    },
  );
});
