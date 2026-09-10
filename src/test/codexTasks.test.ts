import { describe, expect, it } from 'vitest';
import { applyCodexEntry, CodexEntryState } from '../codexEntries';
import { assembleCodexHierarchy } from '../codexHierarchy';
import { Session } from '../types';
import { readableCodexText } from '../codexTasks';

function session(id: string): Session {
  return {
    id,
    type: 'codex',
    projectPath: '/demo',
    projectHash: '',
    projectName: 'demo',
    gitBranch: 'main',
    status: 'working',
    lastInteractionTime: 123,
    subagents: [],
    logFilePath: id + '.jsonl',
  };
}

describe('Codex task descriptions', () => {
  const encrypted = 'gAAAAAB' + 'x'.repeat(120) + '==';

  it('rejects encrypted spawn messages instead of treating nonempty ciphertext as a task', () => {
    const parent = session('parent');
    const state: CodexEntryState = { hasMetadata: true, inherited: false };
    applyCodexEntry(
      {
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'spawn_agent',
          call_id: 'encrypted',
          arguments: JSON.stringify({ message: encrypted, task_name: 'review' }),
        },
      },
      parent,
      state,
    );
    applyCodexEntry(
      {
        type: 'response_item',
        payload: {
          type: 'function_call_output',
          call_id: 'encrypted',
          output: JSON.stringify({ task_name: '/root/review' }),
        },
      },
      parent,
      state,
    );
    const child = { ...session('child'), codexParentThreadId: 'parent', codexAgentPath: '/root/review' };
    expect(assembleCodexHierarchy([parent, child])[0].subagents[0].task).toBe('');
    expect(parent.codexSpawnedTasks).toBeUndefined();
  });

  it('filters cached ciphertext and transport envelopes while preserving ordinary long text', () => {
    expect(readableCodexText(encrypted)).toBeUndefined();
    expect(readableCodexText('Task: ' + encrypted)).toBeUndefined();
    expect(
      readableCodexText('Message Type: NEW_TASK\nTask name: /root/test\nSender: /root\nPayload:\n'),
    ).toBeUndefined();
    const human = 'Review the parser. '.repeat(100);
    expect(readableCodexText(human)).toBe(human.trim());
    expect(readableCodexText('A'.repeat(200))).toBe('A'.repeat(200));
    const parent = { ...session('parent'), codexSpawnedTasks: { '/root/review': encrypted } };
    const child = {
      ...session('child'),
      codexParentThreadId: 'parent',
      codexAgentPath: '/root/review',
      codexAgentTask: encrypted,
      sessionTitle: encrypted,
    };
    expect(assembleCodexHierarchy([parent, child])[0].subagents[0].task).toBe('');
  });

  it('does not turn encrypted user input into a root title', () => {
    const root = session('root');
    applyCodexEntry({ type: 'event_msg', payload: { type: 'user_message', message: encrypted } }, root, {
      hasMetadata: true,
      inherited: false,
    });
    expect(root.sessionTitle).toBeUndefined();
  });

  it('keeps a readable own update distinct from unavailable tasks and copied ancestry', () => {
    const parent = session('parent');
    const child = { ...session('child'), codexParentThreadId: 'parent' };
    const state: CodexEntryState = { hasMetadata: true, inherited: true };
    const update = (message: string) => {
      applyCodexEntry({ type: 'event_msg', payload: { type: 'agent_message', message } }, child, state);
    };
    update('Ancestor progress must stay hidden');
    expect(child.codexLatestUpdate).toBeUndefined();
    state.inherited = false;
    update('Parser checks passed; validating edge cases.');
    update(encrypted);
    const agent = assembleCodexHierarchy([parent, child])[0].subagents[0];
    expect(agent.task).toBe('');
    expect(agent.latestUpdate).toBe('Parser checks passed; validating edge cases.');
  });

  it('reads own assistant output text when no agent_message event exists', () => {
    const child = { ...session('child'), codexParentThreadId: 'parent' };
    const state: CodexEntryState = { hasMetadata: true, inherited: true };
    const output = (role: string, text: string) => {
      applyCodexEntry(
        {
          type: 'response_item',
          payload: { type: 'message', role, phase: 'commentary', content: [{ type: 'output_text', text }] },
        },
        child,
        state,
      );
    };
    output('assistant', 'Copied ancestor update');
    expect(child.codexLatestUpdate).toBeUndefined();
    state.inherited = false;
    output('assistant', 'Validated the manifest successfully.');
    output('assistant', encrypted);
    output('user', 'Do not display user text as progress');
    for (const hidden of [{ phase: 'analysis' }, { channel: 'analysis' }, { phase: 'reasoning' }]) {
      applyCodexEntry(
        {
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'assistant',
            ...hidden,
            content: [{ type: 'output_text', text: 'Do not display internal analysis' }],
          },
        },
        child,
        state,
      );
    }
    applyCodexEntry(
      {
        type: 'response_item',
        payload: { type: 'reasoning', content: [{ type: 'output_text', text: 'Do not display reasoning' }] },
      },
      child,
      state,
    );
    expect(child.codexLatestUpdate).toBe('Validated the manifest successfully.');
  });
  it('joins successful parent spawn calls to the exact child path', () => {
    const parent = session('parent');
    const state: CodexEntryState = { hasMetadata: false, inherited: false };
    const entry = (type: string, payload: unknown) => {
      applyCodexEntry({ type, payload }, parent, state);
    };
    entry('session_meta', { id: 'parent' });
    entry('response_item', {
      type: 'function_call',
      name: 'spawn_agent',
      namespace: 'collaboration',
      call_id: 'launch',
      arguments: JSON.stringify({ task_name: 'review', message: 'Review the parser and report edge cases.' }),
    });
    expect(parent.codexSpawnedTasks).toBeUndefined();
    entry('response_item', {
      type: 'function_call_output',
      call_id: 'launch',
      output: JSON.stringify({ task_name: '/root/review' }),
    });
    const child = {
      ...session('child'),
      codexParentThreadId: 'parent',
      codexAgentPath: '/root/review',
      codexAgentName: 'review',
    };
    const roots = assembleCodexHierarchy([parent, child]);
    expect(roots[0].subagents[0]).toMatchObject({
      task: 'Review the parser and report edge cases.',
      lastInteractionTime: 123,
    });
  });

  it('does not borrow tasks from another parent with the same canonical path', () => {
    const parent = { ...session('parent'), codexSpawnedTasks: { '/root/review': 'Own task' } };
    const other = { ...session('other'), codexSpawnedTasks: { '/root/review': 'Wrong task' } };
    const child = { ...session('child'), codexParentThreadId: 'parent', codexAgentPath: '/root/review' };
    expect(assembleCodexHierarchy([other, parent, child])[1].subagents[0].task).toBe('Own task');
  });

  it('supports a UUID launch result even when the child also records an agent path', () => {
    const parent = { ...session('parent'), codexSpawnedTasks: { child: 'UUID task' } };
    const child = { ...session('child'), codexParentThreadId: 'parent', codexAgentPath: '/root/review' };
    expect(assembleCodexHierarchy([parent, child])[0].subagents[0].task).toBe('UUID task');
  });

  it('ignores failed launches, non-spawn messages and inherited calls', () => {
    const parent = session('parent');
    const state: CodexEntryState = { hasMetadata: true, inherited: false };
    const response = (payload: unknown) => {
      applyCodexEntry({ type: 'response_item', payload }, parent, state);
    };
    response({
      type: 'function_call',
      name: 'spawn_agent',
      call_id: 'failed',
      arguments: JSON.stringify({ message: 'Failed task' }),
    });
    response({ type: 'function_call_output', call_id: 'failed', output: JSON.stringify({ error: 'failed' }) });
    response({
      type: 'function_call',
      name: 'followup_task',
      call_id: 'followup',
      arguments: JSON.stringify({ message: 'A followup' }),
    });
    response({
      type: 'function_call_output',
      call_id: 'followup',
      output: JSON.stringify({ task_name: '/root/review' }),
    });
    state.inherited = true;
    response({
      type: 'function_call',
      name: 'spawn_agent',
      call_id: 'inherited',
      arguments: JSON.stringify({ message: 'Ancestor task' }),
    });
    response({
      type: 'function_call_output',
      call_id: 'inherited',
      output: JSON.stringify({ task_name: '/root/review' }),
    });
    expect(parent.codexSpawnedTasks).toBeUndefined();
  });

  it('extracts the real IDE request and leaves ordinary headings alone', () => {
    const state: CodexEntryState = { hasMetadata: true, inherited: false };
    const root = session('root');
    applyCodexEntry(
      {
        type: 'event_msg',
        payload: {
          type: 'user_message',
          message: '# Context from my IDE setup:\n## Open tabs:\n- private.ts\n## My request:\nInvestigate the parser',
        },
      },
      root,
      state,
    );
    expect(root.sessionTitle).toBe('Investigate the parser');
    const plain = session('plain');
    applyCodexEntry(
      { type: 'event_msg', payload: { type: 'user_message', message: '# My plan\nBuild a monitor' } },
      plain,
      state,
    );
    expect(plain.sessionTitle).toBe('# My plan Build a monitor');
  });
});
