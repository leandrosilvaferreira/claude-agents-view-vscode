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

// Sibling top-level describe (not nested above) so its line count doesn't push that describe
// past this repo's max-lines-per-function limit — item 2: `properties` now shares the same
// opaque-container set as `structuredContent` (keySafety.ts's OPAQUE_KEY_CONTAINERS), so a
// legacy JSON-Schema properties path collapses the same way. The MCP tool_use `input` rule still
// can't be re-applied from the path alone (a flattened path has no sibling `name` left to
// consult) — but `sanitizeBaseline` now also takes the fresh run's own model and reconciles
// against it (reconcileToolUseInputPath in sanitizeBaseline.ts) instead of leaving every such
// path exactly as committed forever.
describe('sanitizeBaseline — OPAQUE_KEY_CONTAINERS (item 2)', () => {
  it('collapses a legacy JSON-Schema properties child the same way as a dynamic-key container', () => {
    const baseline = makeModel({
      types: {
        user: makeTypeObservation({
          fields: { 'attachment.tools.[].schema.input_schema.properties.repo_owner': makeField() },
        }),
      },
    });

    const sanitized = sanitizeBaseline(baseline);

    const fields = sanitized.types.user.fields;
    expect(fields['attachment.tools.[].schema.input_schema.properties.[dynamic-key]']).toBeDefined();
    expect(fields['attachment.tools.[].schema.input_schema.properties.repo_owner']).toBeUndefined();
  });
});

// Sibling top-level describe (not nested above) — item 2 continued: reconciling a legacy
// `message.content.[].input.*` path against the fresh run's own model (see
// reconcileToolUseInputPath in sanitizeBaseline.ts). Replaces the old "leaves it exactly as
// committed" test, which locked in the gap this fix closes.
describe('sanitizeBaseline — reconciles message.content.[].input.* against the fresh run (item 2)', () => {
  it('collapses a legacy input path the fresh run did not re-observe (a leaked MCP parameter, now collapsed at observation time)', () => {
    const path = 'message.content.[].input.repo_owner';
    const baseline = makeModel({
      types: { assistant: makeTypeObservation({ fields: { [path]: makeField({ presentCount: 3 }) } }) },
    });

    const sanitized = sanitizeBaseline(baseline, createEmptyModel());

    const fields = sanitized.types.assistant.fields;
    expect(fields['message.content.[].input.[dynamic-key]']).toEqual(makeField({ presentCount: 3 }));
    expect(fields[path]).toBeUndefined();
  });

  it('keeps a legacy input path literal when the fresh run re-observed that exact built-in-tool path (e.g. Bash `command`)', () => {
    const path = 'message.content.[].input.command';
    const baseline = makeModel({
      types: { assistant: makeTypeObservation({ fields: { [path]: makeField({ presentCount: 9 }) } }) },
    });
    const freshRun = makeModel({
      types: { assistant: makeTypeObservation({ fields: { [path]: makeField({ presentCount: 1 }) } }) },
    });

    const sanitized = sanitizeBaseline(baseline, freshRun);

    expect(sanitized.types.assistant.fields[path]).toEqual(makeField({ presentCount: 9 }));
  });

  it('merges two legacy input paths that both collapse onto [dynamic-key] instead of overwriting one with the other', () => {
    const baseline = makeModel({
      types: {
        assistant: makeTypeObservation({
          fields: {
            'message.content.[].input.repo_owner': makeField({ presentCount: 2 }),
            'message.content.[].input.libraryName': makeField({ presentCount: 3 }),
          },
        }),
      },
    });

    const sanitized = sanitizeBaseline(baseline, createEmptyModel());

    const fields = sanitized.types.assistant.fields;
    expect(Object.keys(fields)).toEqual(['message.content.[].input.[dynamic-key]']);
    expect(fields['message.content.[].input.[dynamic-key]'].presentCount).toBe(5);
  });

  it('defaults to an empty fresh run when none is passed, collapsing a legacy input path conservatively', () => {
    const path = 'message.content.[].input.section_identifier';
    const baseline = makeModel({
      types: { assistant: makeTypeObservation({ fields: { [path]: makeField() } }) },
    });

    const sanitized = sanitizeBaseline(baseline);

    expect(sanitized.types.assistant.fields['message.content.[].input.[dynamic-key]']).toBeDefined();
    expect(sanitized.types.assistant.fields[path]).toBeUndefined();
  });
});
