import { describe, it, expect } from 'vitest';
import { isSchemaLikeKey } from './keySafety';

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
});
