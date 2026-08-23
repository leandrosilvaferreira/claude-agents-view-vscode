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

describe('isKnownDynamicKeyContainer', () => {
  it.each(['answers', 'trackedFileBackups', 'artifacts', '_meta'])(
    'flags the known dynamic-key-map field %j',
    (key) => {
      expect(isKnownDynamicKeyContainer(key)).toBe(true);
    },
  );

  it.each(['type', 'message', 'toolUseResult', 'snapshot'])('does not flag an ordinary schema field %j', (key) => {
    expect(isKnownDynamicKeyContainer(key)).toBe(false);
  });
});
