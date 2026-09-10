import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodexLogParser } from '../codexLogParser';
import { computeSessionStatus } from '../sessionActivity';

describe('CodexLogParser', () => {
  let directory: string;
  let file: string;
  const line = (type: string, payload: unknown) => JSON.stringify({ type, payload }) + '\n';
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-parser-'));
    file = path.join(directory, 'rollout.jsonl');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('extracts metadata, real prompt and model from VS Code rollouts', () => {
    fs.writeFileSync(
      file,
      line('session_meta', { id: 'root', cwd: '/projects/demo', source: 'vscode', git: { branch: 'main' } }) +
        line('response_item', {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: '# AGENTS.md instructions' }],
        }) +
        line('event_msg', { type: 'user_message', message: 'Build a monitor' }) +
        line('turn_context', { model: 'gpt-6' }) +
        line('event_msg', { type: 'task_started' }),
    );
    expect(new CodexLogParser().parse(file)).toMatchObject({
      id: 'root',
      type: 'codex',
      projectPath: '/projects/demo',
      projectName: 'demo',
      gitBranch: 'main',
      sessionTitle: 'Build a monitor',
      model: 'gpt-6',
      codexTurnStatus: 'working',
    });
  });

  it('pins child identity when forked history contains parent metadata', () => {
    fs.writeFileSync(
      file,
      line('session_meta', {
        id: 'child',
        parent_thread_id: 'root',
        source: { subagent: { thread_spawn: { parent_thread_id: 'root', agent_path: '/root/reviewer' } } },
      }) +
        line('session_meta', { id: 'root', cwd: '/wrong' }) +
        line('event_msg', { type: 'task_complete' }) +
        line('event_msg', { type: 'thread_settings_applied', thread_id: 'child' }) +
        line('event_msg', { type: 'task_started' }),
    );
    expect(new CodexLogParser().parse(file)).toMatchObject({
      id: 'child',
      codexParentThreadId: 'root',
      codexAgentName: 'reviewer',
      codexTurnStatus: 'working',
    });
  });

  it('holds an incomplete multibyte tail and reads only appended bytes', () => {
    fs.writeFileSync(file, line('session_meta', { id: 'root' }) + line('event_msg', { type: 'task_started' }));
    const parser = new CodexLogParser();
    parser.parse(file);
    const read = vi.spyOn(fs, 'readSync');
    expect(parser.parse(file).id).toBe('root');
    expect(read).not.toHaveBeenCalled();
    const next = Buffer.from(line('event_msg', { type: 'user_message', message: 'ação 🚀' }));
    fs.appendFileSync(file, next.subarray(0, next.length - 3));
    expect(parser.parse(file).sessionTitle).toBeUndefined();
    fs.appendFileSync(file, next.subarray(next.length - 3));
    expect(parser.parse(file).sessionTitle).toBe('ação 🚀');
  });

  it('ignores inherited context and lifecycle until the fork switches to its own thread', () => {
    fs.writeFileSync(
      file,
      line('session_meta', { id: 'child', cwd: '/own', model: 'own-model', parent_thread_id: 'parent' }) +
        line('session_meta', { id: 'parent' }) +
        line('turn_context', { cwd: '/parent', model: 'parent-model' }) +
        line('event_msg', { type: 'task_complete' }),
    );
    const parser = new CodexLogParser();
    expect(parser.parse(file)).toMatchObject({ projectPath: '/own', model: 'own-model' });
    expect(parser.parse(file).codexTurnStatus).toBeUndefined();
    const openFiles = new Set([file]);
    expect(computeSessionStatus(parser.parse(file), openFiles)).toBe('stopped');
    fs.appendFileSync(
      file,
      line('event_msg', { type: 'thread_settings_applied', thread_id: 'child' }) +
        line('event_msg', { type: 'task_started' }),
    );
    expect(parser.parse(file).codexTurnStatus).toBe('working');
    expect(computeSessionStatus(parser.parse(file), openFiles)).toBe('working');
  });

  it('keeps terminal signals through token events, and resumes on a new task', () => {
    fs.writeFileSync(file, line('session_meta', { id: 'root' }));
    const parser = new CodexLogParser();
    for (const type of ['task_started', 'task_complete', 'turn_aborted', 'task_started']) {
      fs.appendFileSync(file, line('event_msg', { type }) + line('event_msg', { type: 'token_count' }));
      expect(parser.parse(file).codexTurnStatus).toBe(type === 'task_started' ? 'working' : 'stopped');
    }
    fs.appendFileSync(file, line('event_msg', { type: 'task_complete', error: 'failed' }));
    expect(parser.parse(file).codexTurnStatus).toBe('error');
  });

  it('recovers from malformed lines, truncation and disappearance', () => {
    fs.writeFileSync(file, 'null\n{bad}\n' + line('session_meta', { id: 'first' }));
    const parser = new CodexLogParser();
    expect(parser.parse(file).id).toBe('first');
    fs.writeFileSync(file, line('session_meta', { id: 'next' }));
    expect(parser.parse(file).id).toBe('next');
    fs.unlinkSync(file);
    expect(() => parser.parse(file)).not.toThrow();
  });
});
