import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogParser } from '../logParser';

// Session.lastEntryIsApiError: whether the session's last real signal was an API error. Split out
// of logParser.sessionSignals.test.ts (same tempDir/tempFilePath fixture pattern) purely to stay
// under this repo's max-lines budget — see that file for the sibling thinking/interruption/rename
// signal tests this one was extracted alongside of.
describe('LogParser api-error signal', () => {
  const tempDir = path.join(os.tmpdir(), 'claude-agents-api-error-signal-test');
  const tempFilePath = path.join(tempDir, 'test-session.jsonl');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(tempFilePath, '');
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  it('flags the session when a system:api_error entry lands, even though it carries no message', () => {
    // Claude Code writes this entry with no `message` field at all — trackTurnSignals's own
    // `if (!json.message) return;` gate would skip it like bookkeeping, so this signal must be
    // read unconditionally in parseLogLine instead (see logParser.ts's trackApiErrorSignal).
    const parser = new LogParser();

    const apiError = {
      timestamp: '2026-08-05T22:21:54.460Z',
      type: 'system',
      subtype: 'api_error',
      error: { message: 'Overloaded', formatted: 'API Error: Overloaded' },
      maxRetries: 10,
      retryAttempt: 1,
      retryInMs: 500,
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(apiError) + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsApiError).toBe(true);
  });

  it('flags the session when an assistant turn carries an inline apiError alongside its message', () => {
    // Rarer real shape: an ordinary assistant turn that DOES carry `message` but also marks
    // itself as an api-error response via `apiError`/`isApiErrorMessage`.
    const parser = new LogParser();

    const inlineError = {
      timestamp: '2026-08-05T22:21:54.460Z',
      type: 'assistant',
      apiError: 'upstream 529',
      message: { role: 'assistant', content: [{ type: 'text', text: '' }] },
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(inlineError) + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsApiError).toBe(true);
  });

  it('clears the api-error flag once a normal message-bearing turn follows', () => {
    // The trap mirrors lastEntryIsInterruption: a flag that only ever turns on would keep
    // reporting 'error' long after the session recovered (Claude Code auto-retries some errors).
    const parser = new LogParser();

    const apiError = {
      timestamp: '2026-08-05T22:21:54.460Z',
      type: 'system',
      subtype: 'api_error',
      error: { message: 'Overloaded' },
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(apiError) + '\n');
    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsApiError).toBe(true);

    const recovered = {
      timestamp: '2026-08-05T22:22:10.000Z',
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text: 'Continuing now' }] },
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(recovered) + '\n');

    expect(new LogParser().parse(tempFilePath, 'claude-code').lastEntryIsApiError).toBe(false);
  });

  it('does not let a trailing bookkeeping entry between an api_error and the next turn touch the flag', () => {
    // Mirrors the awaited-reply/interruption bookkeeping tests in logParser.sessionSignals.test.ts:
    // attachment carries no `message` and is not itself an api_error entry, so it must leave the
    // flag exactly as-is.
    const parser = new LogParser();

    const lines = [
      {
        timestamp: '2026-08-05T22:21:54.460Z',
        type: 'system',
        subtype: 'api_error',
        error: { message: 'Overloaded' },
      },
      { type: 'attachment' },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsApiError).toBe(true);
  });

  it('does not let a sidechain api_error entry set the parent session flag', () => {
    // Subagent turns can be interleaved into the parent's own file, flagged isSidechain — a
    // subagent's own API error is not the parent session's.
    const parser = new LogParser();

    const apiError = {
      timestamp: '2026-08-05T22:21:54.460Z',
      type: 'system',
      subtype: 'api_error',
      isSidechain: true,
      error: { message: 'Overloaded' },
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(apiError) + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsApiError).toBeUndefined();
  });
});
