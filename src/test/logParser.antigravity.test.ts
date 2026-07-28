import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LogParser } from '../logParser';

describe('LogParser — Antigravity transcripts', () => {
  const brainDir = path.join(os.tmpdir(), 'claude-agents-test-brain');

  function writeTranscript(conversationId: string): string {
    const filePath = path.join(brainDir, conversationId, '.system_generated', 'logs', 'transcript.jsonl');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '');
    return filePath;
  }

  beforeEach(() => {
    fs.mkdirSync(brainDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(brainDir, { recursive: true, force: true });
  });

  // Every Antigravity transcript is named `transcript.jsonl`; using the basename as the session id
  // collapsed all conversations onto one slot in the sessions Map, so only one ever showed up.
  it('gives each conversation a distinct session id', () => {
    const parser = new LogParser();
    const a = parser.parse(writeTranscript('aaaaaaaa-1111-2222-3333-444444444444'), 'antigravity');
    const b = parser.parse(writeTranscript('bbbbbbbb-5555-6666-7777-888888888888'), 'antigravity');

    expect(a.id).toBe('aaaaaaaa-1111-2222-3333-444444444444');
    expect(b.id).toBe('bbbbbbbb-5555-6666-7777-888888888888');
    expect(a.id).not.toBe(b.id);
    expect(a.projectName).not.toBe(b.projectName);
  });
});
