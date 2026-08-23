import { describe, it, expect } from 'vitest';
import { redact } from './redact';

// Mirrors the `Sample text N` placeholder convention already used by src/test/fixtures/real-logs/
// (see the header comment in src/test/logParser.realLogs.test.ts) — redact() must produce the same
// text shape so redacted fixtures read consistently with the ones already committed.
interface RedactableLine {
  type?: string;
  message?: { role?: string; content?: string };
  cwd?: string;
  gitBranch?: string;
  toolUseResult?: { status?: string; output?: string };
  tool_calls?: Array<{ name?: string; arguments?: { Cwd?: string; SearchPath?: string } }>;
}

const PLACEHOLDER = /^Sample text \d+$/;

describe('redact', () => {
  it('replaces a real-looking prompt, an absolute home-dir path, and a branch name', () => {
    const line: RedactableLine = {
      message: { content: 'Please rotate the prod database credentials before Friday.' },
      cwd: '/Users/janedoe/Projects/acme-app',
      gitBranch: 'fix/713-typed-wrapper-context',
    };

    const result = redact(line);

    expect(result.message?.content).toMatch(PLACEHOLDER);
    expect(result.cwd).toMatch(PLACEHOLDER);
    expect(result.gitBranch).toMatch(PLACEHOLDER);
  });

  it('leaves type/role/status-shaped fields unchanged', () => {
    const line: RedactableLine = {
      type: 'assistant',
      message: { role: 'user' },
      toolUseResult: { status: 'async_launched' },
    };

    const result = redact(line);

    expect(result.type).toBe('assistant');
    expect(result.message?.role).toBe('user');
    expect(result.toolUseResult?.status).toBe('async_launched');
  });

  it('produces the same placeholder numbering on repeated calls with the same input', () => {
    const line: RedactableLine = {
      message: { content: 'first prompt text' },
      cwd: '/Users/janedoe/Projects/acme-app',
    };

    expect(redact(line)).toEqual(redact(line));
  });

  it('redacts a string leaf nested inside toolUseResult and tool_calls[].arguments', () => {
    const line: RedactableLine = {
      type: 'tool_result',
      toolUseResult: { status: 'success', output: 'contents of a leaked config file' },
      tool_calls: [{ name: 'Bash', arguments: { Cwd: '/Users/janedoe/project', SearchPath: '/some/real/path' } }],
    };

    const result = redact(line);

    expect(result.toolUseResult?.output).toMatch(PLACEHOLDER);
    expect(result.toolUseResult?.status).toBe('success');
    expect(result.tool_calls?.[0]?.arguments?.Cwd).toMatch(PLACEHOLDER);
    expect(result.tool_calls?.[0]?.arguments?.SearchPath).toMatch(PLACEHOLDER);
  });

  it('redacts a content-derived object key (e.g. AskUserQuestion answers) instead of leaking the question text into the output', () => {
    const question = 'Is this a real question with spaces and a question mark?';
    const line = {
      type: 'tool_result',
      toolUseResult: { status: 'success' as const, answers: { [question]: 'yes' } },
    };

    const result = redact(line);
    const serialized = JSON.stringify(result);

    // The allowlisted, schema-like sibling key is completely unaffected.
    expect(result.type).toBe('tool_result');
    expect(result.toolUseResult.status).toBe('success');
    // Neither the question text nor the answer value survives anywhere in the output.
    expect(serialized).not.toContain(question);
    expect(serialized).not.toContain('"yes"');
    // The unsafe key itself is redacted too, using its own counter.
    expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
  });

  // Finding A: each of these looks like a plain identifier but is really an inherited
  // Object.prototype member. Used directly as an ordinary object key (not inside a known
  // dynamic-key container — that's the separate Finding B case below), redact() must not
  // crash, must not leak the original key or its value, and — the sharpest case, `__proto__`
  // specifically — must not actually repoint the object's real prototype.
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
    'redacts an Object.prototype member name (%j) used as a key instead of crashing or corrupting the object',
    (protoKey) => {
      const line = { type: 'tool_result', toolUseResult: { status: 'success' as const, [protoKey]: 'leaked value' } };

      const result = redact(line);
      const serialized = JSON.stringify(result);

      expect(result.toolUseResult.status).toBe('success');
      expect(Object.getPrototypeOf(result.toolUseResult)).toBe(Object.prototype);
      expect(serialized).not.toContain('leaked value');
      expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
    },
  );

  // Finding B: a bare, punctuation-free real value (a tracked filename, an option label)
  // passes isSchemaLikeKey on shape alone, but every child of a known dynamic-key-map
  // container must be treated as unsafe regardless — this is the real LICENSE/NOTICE case
  // already observed in the committed src/generated/transcriptShapes.ts before this fix.
  it.each(['answers', 'trackedFileBackups', 'artifacts', '_meta'])(
    'redacts a bare, identifier-shaped child key under the known dynamic-key container %j instead of keeping it literally',
    (containerKey) => {
      const line = { type: 'tool_result', [containerKey]: { LICENSE: 'real tracked content' } };

      const result = redact(line);
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('LICENSE');
      expect(serialized).not.toContain('real tracked content');
      expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
    },
  );
});
