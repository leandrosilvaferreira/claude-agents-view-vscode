import { describe, it, expect } from 'vitest';
import { ParseError, ParsedLine, WalkResult } from './corpusWalker';
import { aggregateSchema } from './schemaAggregator';
import { SchemaObservationModel } from './schemaModel';

/**
 * Pins `aggregateSchema`'s output on a deterministic, diverse synthetic corpus so the
 * linear-time rewrite of its internal accumulator (mutable per-bucket Map instead of a full
 * immutable re-merge on every line — see schemaAggregator.ts's own doc comment) can never
 * silently change what gets recorded. `EXPECTED_MODEL` below was captured by running the
 * pre-rewrite aggregator (the same per-line `mergeSchemaObservations` approach schemaModel.ts
 * still uses for the CLI's own committed-file merge) against `CORPUS`; this test must keep
 * passing after the rewrite, proving the two accumulation strategies produce an identical
 * model. `CORPUS` exercises: nesting past the depth cap, an array with mixed element shapes,
 * a content-derived key (`toolUseResult.answers`), the three dynamic-key containers this same
 * fix adds (`wireToolInputs`, `wireIngestContext`, `structuredContent`), an Object.prototype
 * member name (`__proto__`) used as an ordinary key, a `type:subtype` bucket, an untyped line
 * (routed to `unknownTypes`), a `ParseError`, and multiple CLI versions observed out of order
 * (to exercise firstSeenVersion/lastSeenVersion widening and presentCount summation).
 */

function parsedLine(
  value: Record<string, unknown>,
  overrides: Partial<Omit<ParsedLine, 'ok' | 'value'>> = {},
): ParsedLine {
  return { ok: true, filePath: '/scratch/fixture.jsonl', lineNumber: 1, value, ...overrides };
}

function parseError(overrides: Partial<Omit<ParseError, 'ok'>> = {}): ParseError {
  return {
    ok: false,
    filePath: '/scratch/fixture.jsonl',
    lineNumber: 1,
    rawLine: 'not json',
    message: 'bad token',
    ...overrides,
  };
}

async function* toResults(items: WalkResult[]): AsyncGenerator<WalkResult> {
  for (const item of items) {
    await Promise.resolve(); // genuinely async, matching what a real WalkResult stream is
    yield item;
  }
}

const PROTO_KEY = '__proto__';
const FREE_TEXT_QUESTION = 'Pick a deploy target?';
const TOOLU_ID_A = 'toolu_01AbCdEfGhIjKlMnOpQrStUv';
const TOOLU_ID_B = 'toolu_02ZzYyXxWwVvUuTtSsRrQqPp';

const CORPUS: WalkResult[] = [
  parsedLine({ type: 'user', version: '2.1.9', message: { role: 'user', content: 'hello there' } }, { lineNumber: 1 }),
  parsedLine(
    {
      type: 'user',
      version: '2.1.10',
      message: { role: 'user', content: ['hi', { text: 'again' }] },
      toolUseResult: { answers: { [FREE_TEXT_QUESTION]: 'staging' } },
    },
    { lineNumber: 2 },
  ),
  parsedLine(
    { type: 'user', version: '2.1.8', message: { role: 'user', content: 'oldest version seen' } },
    { lineNumber: 3 },
  ),
  parsedLine(
    {
      type: 'assistant',
      version: '2.1.11',
      wireToolInputs: { [TOOLU_ID_A]: { command: 'ls', description: 'list files' } },
    },
    { lineNumber: 4 },
  ),
  parsedLine(
    { type: 'assistant', version: '2.1.12', wireIngestContext: { [TOOLU_ID_B]: { status: 'ok' } } },
    { lineNumber: 5 },
  ),
  parsedLine(
    { type: 'assistant', version: '2.1.11', nested: { a: { b: { c: { d: { e: 'too-deep' } } } } } },
    { lineNumber: 6 },
  ),
  parsedLine(
    { type: 'assistant', version: '2.1.11', toolUseResult: { status: 'success', [PROTO_KEY]: 'leaked' } },
    { lineNumber: 7 },
  ),
  parsedLine({ type: 'system', subtype: 'init', version: '2.1.11' }, { lineNumber: 8 }),
  parsedLine({ version: '2.1.11', someField: 'no type at all' }, { lineNumber: 9 }),
  parsedLine(
    { type: 'user', version: '2.1.10', mcpMeta: { structuredContent: { customerRef: 'acme-42' } } },
    { lineNumber: 10 },
  ),
  parseError({ lineNumber: 11, message: 'Unexpected token' }),
];

// Captured from the pre-rewrite aggregator — see the module doc comment above. Do not hand-edit;
// regenerate by running the old implementation against CORPUS if CORPUS itself ever changes.
const EXPECTED_MODEL: SchemaObservationModel = {
  generatedAt: '',
  cliVersionsObserved: ['2.1.8', '2.1.9', '2.1.10', '2.1.11', '2.1.12'],
  types: {
    user: {
      sampleCount: 4,
      firstSeenVersion: '2.1.8',
      lastSeenVersion: '2.1.10',
      fields: {
        type: { types: ['string'], presentCount: 4, firstSeenVersion: '2.1.8', lastSeenVersion: '2.1.10' },
        version: { types: ['string'], presentCount: 4, firstSeenVersion: '2.1.8', lastSeenVersion: '2.1.10' },
        message: { types: ['object'], presentCount: 3, firstSeenVersion: '2.1.8', lastSeenVersion: '2.1.10' },
        'message.role': { types: ['string'], presentCount: 3, firstSeenVersion: '2.1.8', lastSeenVersion: '2.1.10' },
        'message.content': {
          types: ['object', 'string'],
          presentCount: 3,
          firstSeenVersion: '2.1.8',
          lastSeenVersion: '2.1.10',
        },
        'message.content.[]': {
          types: ['object', 'string'],
          presentCount: 1,
          firstSeenVersion: '2.1.10',
          lastSeenVersion: '2.1.10',
        },
        'message.content.[].text': {
          types: ['string'],
          presentCount: 1,
          firstSeenVersion: '2.1.10',
          lastSeenVersion: '2.1.10',
        },
        toolUseResult: { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.10', lastSeenVersion: '2.1.10' },
        'toolUseResult.answers': {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.10',
          lastSeenVersion: '2.1.10',
        },
        'toolUseResult.answers.[dynamic-key]': {
          types: ['string'],
          presentCount: 1,
          firstSeenVersion: '2.1.10',
          lastSeenVersion: '2.1.10',
        },
        mcpMeta: { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.10', lastSeenVersion: '2.1.10' },
        'mcpMeta.structuredContent': {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.10',
          lastSeenVersion: '2.1.10',
        },
        'mcpMeta.structuredContent.[dynamic-key]': {
          types: ['string'],
          presentCount: 1,
          firstSeenVersion: '2.1.10',
          lastSeenVersion: '2.1.10',
        },
      },
    },
    assistant: {
      sampleCount: 4,
      firstSeenVersion: '2.1.11',
      lastSeenVersion: '2.1.12',
      fields: {
        type: { types: ['string'], presentCount: 4, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.12' },
        version: { types: ['string'], presentCount: 4, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.12' },
        wireToolInputs: {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.11',
          lastSeenVersion: '2.1.11',
        },
        'wireToolInputs.[dynamic-key]': {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.11',
          lastSeenVersion: '2.1.11',
        },
        wireIngestContext: {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.12',
          lastSeenVersion: '2.1.12',
        },
        'wireIngestContext.[dynamic-key]': {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.12',
          lastSeenVersion: '2.1.12',
        },
        nested: { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        'nested.a': { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        'nested.a.b': { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        'nested.a.b.c': { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        'nested.a.b.c.d': {
          types: ['object'],
          presentCount: 1,
          firstSeenVersion: '2.1.11',
          lastSeenVersion: '2.1.11',
        },
        toolUseResult: { types: ['object'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        'toolUseResult.status': {
          types: ['string'],
          presentCount: 1,
          firstSeenVersion: '2.1.11',
          lastSeenVersion: '2.1.11',
        },
        'toolUseResult.[dynamic-key]': {
          types: ['string'],
          presentCount: 1,
          firstSeenVersion: '2.1.11',
          lastSeenVersion: '2.1.11',
        },
      },
    },
    'system:init': {
      sampleCount: 1,
      firstSeenVersion: '2.1.11',
      lastSeenVersion: '2.1.11',
      fields: {
        type: { types: ['string'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        subtype: { types: ['string'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        version: { types: ['string'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
      },
    },
  },
  unknownTypes: {
    '(no type)': {
      sampleCount: 1,
      firstSeenVersion: '2.1.11',
      lastSeenVersion: '2.1.11',
      fields: {
        version: { types: ['string'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
        someField: { types: ['string'], presentCount: 1, firstSeenVersion: '2.1.11', lastSeenVersion: '2.1.11' },
      },
    },
  },
};

describe('aggregateSchema — equivalence with the pre-rewrite accumulator', () => {
  it('produces the exact model (value-equal AND key-order-identical) the old per-line mergeSchemaObservations approach produced', async () => {
    const { model, parseErrors } = await aggregateSchema(toResults(CORPUS));

    expect(model).toEqual(EXPECTED_MODEL);
    // Byte-for-byte, not just deep-equal: the old and new accumulators must build up field
    // paths in the exact same order too (a same-line regression the old code also preserved).
    expect(JSON.stringify(model)).toBe(JSON.stringify(EXPECTED_MODEL));
    expect(parseErrors).toHaveLength(1);
  });
});
