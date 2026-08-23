import { describe, it, expect } from 'vitest';
import { ParseError, ParsedLine, WalkResult } from './corpusWalker';
import { aggregateSchema } from './schemaAggregator';

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

describe('aggregateSchema', () => {
  it('reflects presence count and type-union across two lines sharing a type', async () => {
    const lineA = parsedLine(
      { type: 'user', version: '2.1.9', message: { role: 'user', content: 'hello' } },
      { lineNumber: 1 },
    );
    const lineB = parsedLine(
      { type: 'user', version: '2.1.10', message: { role: 'user', content: ['block1', 'block2'] }, isSidechain: true },
      { lineNumber: 2 },
    );

    const { model } = await aggregateSchema(toResults([lineA, lineB]));

    const userType = model.types.user;
    expect(userType.sampleCount).toBe(2);
    expect(userType.firstSeenVersion).toBe('2.1.9');
    expect(userType.lastSeenVersion).toBe('2.1.10');
    // Present on only one of the two lines.
    expect(userType.fields.isSidechain).toEqual({
      types: ['boolean'],
      presentCount: 1,
      firstSeenVersion: '2.1.10',
      lastSeenVersion: '2.1.10',
    });
    // Present on both lines, but with a different JS typeof each time (string vs array).
    expect(userType.fields['message.content'].presentCount).toBe(2);
    expect(userType.fields['message.content'].types).toEqual(['object', 'string']);
  });

  it('routes a line with no `type` at all into unknownTypes instead of dropping it', async () => {
    const untyped = parsedLine({ version: '2.1.9', someField: 'x' });

    const { model } = await aggregateSchema(toResults([untyped]));

    expect(model.types).toEqual({});
    const bucket = model.unknownTypes['(no type)'];
    expect(bucket.sampleCount).toBe(1);
    expect(bucket.fields.someField.presentCount).toBe(1);
  });

  it('buckets by type:subtype rather than by type alone when subtype is present', async () => {
    const line = parsedLine({ type: 'system', subtype: 'init', version: '2.1.9' });

    const { model } = await aggregateSchema(toResults([line]));

    expect(model.types['system:init'].sampleCount).toBe(1);
    expect(model.types.system).toBeUndefined();
  });

  it('collapses array contents onto a single [] path segment instead of per-index paths', async () => {
    const line = parsedLine({
      type: 'array-test',
      items: [{ name: 'first' }, { name: 'second', extra: true }],
    });

    const { model } = await aggregateSchema(toResults([line]));

    const fields = model.types['array-test'].fields;
    expect(fields['items.[].name']).toBeDefined();
    expect(fields['items.[].extra']).toBeDefined();
    expect(fields['items.0.name']).toBeUndefined();
    expect(fields['items.1.name']).toBeUndefined();
    // Two array elements within one line still count as one line, not two.
    expect(fields['items.[].name'].presentCount).toBe(1);
  });

  it('stops recording field paths past the depth cap', async () => {
    const line = parsedLine({
      type: 'deep-test',
      a: { b: { c: { d: { e: { f: 'too-deep' } } } } },
    });

    const { model } = await aggregateSchema(toResults([line]));

    const fields = model.types['deep-test'].fields;
    expect(fields['a.b.c.d.e']).toBeDefined();
    expect(fields['a.b.c.d.e.f']).toBeUndefined();
  });

  it('counts ParseError results separately without letting them contribute fields', async () => {
    const badLine = parseError({ lineNumber: 7, message: 'Unexpected token' });
    const goodLine = parsedLine({ type: 'user', version: '2.1.9' }, { lineNumber: 8 });

    const { model, parseErrors } = await aggregateSchema(toResults([badLine, goodLine]));

    expect(parseErrors).toEqual([badLine]);
    expect(model.types.user.sampleCount).toBe(1);
  });

  it('collapses a content-derived object key (e.g. AskUserQuestion answers) onto [dynamic-key] instead of leaking it into the path', async () => {
    const question = 'Is this a real question with spaces and a question mark?';
    const line = parsedLine({
      type: 'user',
      toolUseResult: { answers: { [question]: 'yes' } },
    });

    const { model } = await aggregateSchema(toResults([line]));

    const paths = Object.keys(model.types.user.fields);
    expect(paths).toContain('toolUseResult.answers.[dynamic-key]');
    expect(paths.some((path) => path.includes(question))).toBe(false);
    expect(paths.some((path) => path.includes('?'))).toBe(false);
    expect(paths.some((path) => path.includes(' '))).toBe(false);
  });

  it('leaves ordinary schema-like field paths exactly as before this fix', async () => {
    const line = parsedLine({
      type: 'user',
      message: { role: 'user', content: { text: 'hello there' } },
    });

    const { model } = await aggregateSchema(toResults([line]));

    const fields = model.types.user.fields;
    expect(Object.keys(fields).sort()).toEqual(
      ['type', 'message', 'message.role', 'message.content', 'message.content.text'].sort(),
    );
    expect(fields['message.content.text']).toEqual({
      types: ['string'],
      presentCount: 1,
      firstSeenVersion: '',
      lastSeenVersion: '',
    });
  });
});

// Sibling top-level describes (not nested in the one above) so their line count doesn't push
// that describe past this repo's max-lines-per-function limit.
describe('aggregateSchema — Object.prototype member names as keys (Finding A)', () => {
  // Each of these looks like a plain identifier but is really an inherited Object.prototype
  // member — used as an ordinary object key in an aggregated line, it must collapse onto
  // [dynamic-key] like any other unsafe key, not crash the merge (`path in base` resolving
  // to the inherited built-in) and not get recorded as a literal field path.
  it.each([
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty',
    'valueOf',
    'isPrototypeOf',
    'toLocaleString',
    'propertyIsEnumerable',
  ])(
    'collapses an Object.prototype member name (%j) used as a key instead of crashing the aggregator',
    async (protoKey) => {
      const line = parsedLine({ type: 'user', toolUseResult: { status: 'success', [protoKey]: 'x' } });

      const { model } = await aggregateSchema(toResults([line, line]));

      const paths = Object.keys(model.types.user.fields);
      expect(paths).toContain('toolUseResult.[dynamic-key]');
      expect(paths).not.toContain(`toolUseResult.${protoKey}`);
      expect(model.types.user.sampleCount).toBe(2);
    },
  );
});

describe('aggregateSchema — known dynamic-key containers (Finding B)', () => {
  // A bare, punctuation-free real value (e.g. the tracked filename `LICENSE`, observed for
  // real in the committed src/generated/transcriptShapes.ts before this fix) passes
  // isSchemaLikeKey on shape alone, but every child of a known dynamic-key-map container
  // must collapse onto [dynamic-key] regardless of its own shape.
  it.each(['answers', 'trackedFileBackups', 'artifacts', '_meta'])(
    'collapses a bare, identifier-shaped child key under the known dynamic-key container %j onto [dynamic-key]',
    async (containerKey) => {
      const line = parsedLine({ type: 'user', [containerKey]: { LICENSE: 'real tracked content' } });

      const { model } = await aggregateSchema(toResults([line]));

      const paths = Object.keys(model.types.user.fields);
      expect(paths).toContain(`${containerKey}.[dynamic-key]`);
      expect(paths).not.toContain(`${containerKey}.LICENSE`);
    },
  );
});
