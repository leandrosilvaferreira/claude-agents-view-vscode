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
});
