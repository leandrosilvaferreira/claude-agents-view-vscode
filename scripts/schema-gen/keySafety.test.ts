import { describe, it, expect } from 'vitest';
import { isKnownDynamicKeyContainer, isSchemaLikeKey } from './keySafety';

describe('isSchemaLikeKey', () => {
  it.each([
    'type',
    'message',
    'toolUseResult',
    'answers',
    '_private',
    '$special',
    'a',
    'A1',
    'firstSeenVersion',
    'a'.repeat(64), // exactly at the length bound
  ])('accepts plain identifier %j', (key) => {
    expect(isSchemaLikeKey(key)).toBe(true);
  });

  it.each([
    'Is this a real question with spaces and a question mark?',
    'a b',
    'a.b',
    'a,b',
    'a?',
    '',
    '1abc', // must not start with a digit
    'a'.repeat(65), // one past the length bound
    'emoji 🔥',
  ])('rejects content-derived key %j', (key) => {
    expect(isSchemaLikeKey(key)).toBe(false);
  });

  // Finding A: every one of these is syntactically a plain identifier (would pass
  // SCHEMA_LIKE_KEY on shape alone), but each is also an inherited Object.prototype member —
  // a downstream `key in obj`/`obj[key]` read or write must never treat one as a real,
  // literal field name. See .claude's transcript-schema-gen review for the exact crash/
  // corruption each of these causes if it slips through.
  it.each([
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty',
    'valueOf',
    'isPrototypeOf',
    'toLocaleString',
    'propertyIsEnumerable',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
  ])('rejects Object.prototype member name %j even though it is a plain identifier', (key) => {
    expect(isSchemaLikeKey(key)).toBe(false);
  });
});

// Finding C: an opaque id minted fresh per tool call (Claude Code 2.1.270+'s `wireToolInputs` /
// 2.1.272+'s `wireIngestContext`, both maps keyed by tool_use id) is syntactically a plain
// identifier and not an Object.prototype member, yet must still be rejected — otherwise every
// tool call mints ~3 new schema field paths (quadratic schema:generate). A real field name never
// matches: snake_case has several `_`, and a short tail (e.g. `input_tokens`) both falls below
// the 16-char body floor AND has no digit for the lookahead to find — either guard alone would
// already reject it.
describe('isSchemaLikeKey — opaque per-call ids (Finding C)', () => {
  it.each([
    'toolu_01AbCdEfGhIjKlMnOpQrStUv',
    'srvtoolu_01AbCdEfGhIjKlMnOpQrStUv',
    'msg_01AbCdEfGhIjKlMnOpQrStUv',
    // Bedrock/Vertex-routed variants: same id family, with a lowercase infix before the
    // final `_` + body.
    'toolu_bdrk_01AbCdEfGhIjKlMnOpQrStUv',
    'toolu_vrtx_01AbCdEfGhIjKlMnOpQrStUv',
    'msg_bdrk_01AbCdEfGhIjKlMnOpQrStUv',
  ])('rejects the opaque id %j', (key) => {
    expect(isSchemaLikeKey(key)).toBe(false);
  });

  it.each(['input_tokens', 'cache_read_input_tokens', 'server_tool_use'])(
    'still accepts the real field name %j',
    (key) => {
      expect(isSchemaLikeKey(key)).toBe(true);
    },
  );

  // Guard pins for OPAQUE_ID_KEY's two independent floors — each row trips only one of them,
  // so a future edit that loosens either floor alone gets caught here.
  it('accepts a long, digit-free tail — the digit lookahead alone rejects the id shape', () => {
    expect(isSchemaLikeKey('tool_resultsummarytext')).toBe(true);
  });

  it('accepts a 15-char body one short of the 16-char floor, even though it has a digit', () => {
    expect(isSchemaLikeKey('toolu_01AbCdEfGhIjKlM')).toBe(true);
  });
});

describe('isKnownDynamicKeyContainer', () => {
  it.each([
    'answers',
    'trackedFileBackups',
    'artifacts',
    '_meta',
    'wireToolInputs',
    'wireIngestContext',
    'structuredContent',
  ])('flags the known dynamic-key-map field %j', (key) => {
    expect(isKnownDynamicKeyContainer(key)).toBe(true);
  });

  it.each(['type', 'message', 'toolUseResult', 'snapshot'])('does not flag an ordinary schema field %j', (key) => {
    expect(isKnownDynamicKeyContainer(key)).toBe(false);
  });
});
