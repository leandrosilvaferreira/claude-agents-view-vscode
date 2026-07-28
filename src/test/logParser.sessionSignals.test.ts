import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogParser } from '../logParser';

// Signals that tell the sidebar what a session is *doing* and what to call it: the user's own
// rename (`type:"custom-title"`), and whether Claude is mid-turn (a thinking-only last turn).
describe('LogParser session signals', () => {
  const tempDir = path.join(os.tmpdir(), 'claude-agents-signals-test');
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

  it('flags a transcript whose last turn is a thinking block, and clears it once the answer lands', () => {
    // Claude Code writes a reasoning block as an entry containing nothing but `thinking`; the
    // turn's text/tool_use always arrives later. So thinking-last means the reply is still coming.
    const parser = new LogParser();

    const thinking = {
      timestamp: '2026-07-17T19:00:00.000Z',
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'weighing options' }] },
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(thinking) + '\n');
    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsThinking).toBe(true);

    const answer = {
      timestamp: '2026-07-17T19:00:05.000Z',
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text: 'Here is the plan' }] },
    };
    fs.appendFileSync(tempFilePath, JSON.stringify(answer) + '\n');
    expect(new LogParser().parse(tempFilePath, 'claude-code').lastEntryIsThinking).toBe(false);
  });

  it('does not let an interleaved subagent turn set the parent session as thinking', () => {
    // Subagent turns can be written into the parent's own file, flagged isSidechain. A subagent
    // thinks exactly like the session does, so counting its turns would report the parent as
    // working off someone else's reasoning.
    const parser = new LogParser();

    const lines = [
      {
        timestamp: '2026-07-17T19:00:00.000Z',
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'text', text: 'Here is the plan' }] },
      },
      {
        timestamp: '2026-07-17T19:00:05.000Z',
        type: 'assistant',
        isSidechain: true,
        message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'subagent reasoning' }] },
      },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsThinking).toBe(false);
  });

  it('keeps a rename in place when a later empty rename arrives', () => {
    // Claude Code has never been observed emitting a "clear the rename" entry, and the format
    // gives no way to tell one apart from an unrelated line. Locking the current behaviour in:
    // a rename, once made, stands. Revisit if a real clear-title entry ever shows up.
    const parser = new LogParser();

    const lines = [
      { type: 'custom-title', customTitle: 'Auth spike' },
      { type: 'custom-title', customTitle: '' },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').sessionTitle).toBe('Auth spike');
  });

  it('keeps the thinking flag when a non-conversational entry trails it', () => {
    // A `custom-title` or snapshot entry can land after the thinking block; it says nothing about
    // whether the turn finished, so it must not clear the signal.
    const parser = new LogParser();

    const lines = [
      {
        timestamp: '2026-07-17T19:00:00.000Z',
        type: 'assistant',
        message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'weighing options' }] },
      },
      { type: 'custom-title', customTitle: 'Auth spike' },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').lastEntryIsThinking).toBe(true);
  });

  it('lets a user rename win over the first prompt and over a later generated title', () => {
    // Claude Code records a rename as its own `type: 'custom-title'` entry and keeps showing that
    // name for the session. Since a generated `ai-title` can land afterwards, plain assignment
    // order would silently undo the rename — the parser latches it instead.
    const parser = new LogParser();

    const lines = [
      {
        timestamp: '2026-07-17T19:00:00.000Z',
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: 'Implement Google OAuth' }] },
      },
      { type: 'custom-title', customTitle: 'Auth spike' },
      { type: 'ai-title', aiTitle: 'Implementing OAuth login flow' },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    const session = parser.parse(tempFilePath, 'claude-code');

    expect(session.sessionTitle).toBe('Auth spike');
    expect(session.titleIsCustom).toBe(true);
  });

  it('applies the latest rename when the session was renamed more than once', () => {
    const parser = new LogParser();

    const lines = [
      { type: 'custom-title', customTitle: 'First name' },
      { type: 'custom-title', customTitle: 'Second name' },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    expect(parser.parse(tempFilePath, 'claude-code').sessionTitle).toBe('Second name');
  });

  it('ignores a blank rename so the session keeps its derived title', () => {
    const parser = new LogParser();

    const lines = [
      {
        timestamp: '2026-07-17T19:00:00.000Z',
        type: 'user',
        message: { role: 'user', content: [{ type: 'text', text: 'Implement Google OAuth' }] },
      },
      { type: 'custom-title', customTitle: '   ' },
    ];
    fs.appendFileSync(tempFilePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');

    const session = parser.parse(tempFilePath, 'claude-code');

    expect(session.sessionTitle).toContain('Implement Google OAuth');
    expect(session.titleIsCustom).toBeFalsy();
  });
});
