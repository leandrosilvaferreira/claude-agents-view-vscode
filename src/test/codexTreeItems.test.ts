import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import { Session, SubAgent } from '../types';

vi.mock('vscode', () => ({
  TreeItem: class {
    constructor(public label: string) {}
  },
  ThemeIcon: class {
    constructor(public id: string) {}
  },
  ThemeColor: class {
    constructor(public id: string) {}
  },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
}));

import { BrandTreeItem, SubAgentTreeItem } from '../treeItems';

const parent: Session = {
  id: 'parent',
  projectHash: 'project',
  projectPath: '/project',
  projectName: 'project',
  gitBranch: 'main',
  status: 'working',
  lastInteractionTime: 0,
  subagents: [],
  logFilePath: '/parent.jsonl',
  type: 'codex',
  model: 'gpt-6',
};

function agent(overrides: Partial<SubAgent> = {}): SubAgent {
  return { id: 'child', name: 'reviewer', task: '', status: 'working', ...overrides };
}

describe('Codex tree presentation', () => {
  it.each([
    ['claude-code', 'claude'],
    ['antigravity', 'antigravity'],
  ] as const)('uses recognizable packaged icons for %s in both themes', (brand, asset) => {
    const item = new BrandTreeItem(brand, []);
    const icons = item.iconPath as { light?: { fsPath: string }; dark?: { fsPath: string } };
    expect(icons.light?.fsPath).toMatch(new RegExp(`${asset}-light\\.svg$`));
    expect(icons.dark?.fsPath).toMatch(new RegExp(`${asset}-dark\\.svg$`));
    expect(fs.readFileSync(icons.light!.fsPath, 'utf8')).toContain('viewBox=');
    expect(fs.readFileSync(icons.dark!.fsPath, 'utf8')).toContain('viewBox=');
  });

  it('uses packaged OpenAI blossom icons for light and dark themes', () => {
    const item = new BrandTreeItem('codex', []);
    const icons = item.iconPath as { light: { fsPath: string }; dark: { fsPath: string } };
    expect(icons.light.fsPath).toMatch(/codex-light\.svg$/);
    expect(icons.dark.fsPath).toMatch(/codex-dark\.svg$/);
    expect(fs.readFileSync(icons.light.fsPath, 'utf8')).toContain('<svg');
    expect(fs.readFileSync(icons.dark.fsPath, 'utf8')).toContain('<svg');
  });

  it('shows an explicit fallback when no task was recorded, without a dangling separator', () => {
    const item = new SubAgentTreeItem(agent(), parent);
    expect(item.description).toBe('gpt-6');
    expect(item.tooltip).toContain('Task unavailable in local log');
  });

  it('does not expose encrypted tasks from cached or legacy agent metadata', () => {
    const task = 'gAAAAAB' + 'Az09_-'.repeat(40);
    const item = new SubAgentTreeItem(agent({ task, logFilePath: '/child.jsonl', lastInteractionTime: 1000 }), parent);
    expect(item.description).toBe('gpt-6');
    expect(item.tooltip).not.toContain(task);
    expect(item.tooltip).toContain('Task unavailable in local log');
    expect(item.tooltip).toContain('Status: working');
    expect(item.tooltip).toContain('Last Active:');
  });

  it('uses a readable update when the task is unavailable and labels it separately', () => {
    const latestUpdate = 'Verified metadata parsing; two edge cases remain.';
    const item = new SubAgentTreeItem(agent({ task: 'gAAAAAB' + 'Az09_-'.repeat(40), latestUpdate }), parent);
    expect(item.description).toBe(`gpt-6 · Update: ${latestUpdate}`);
    expect(item.tooltip).toContain('Task unavailable in local log');
    expect(item.tooltip).toContain(`Latest update: ${latestUpdate}`);
    expect(item.tooltip).not.toContain('gAAAAAB');
  });

  it('rejects encoded updates independently while preserving the readable task', () => {
    const item = new SubAgentTreeItem(
      agent({ task: 'Review parser', latestUpdate: 'gAAAAAB' + 'Az09_-'.repeat(40) }),
      parent,
    );
    expect(item.description).toBe('gpt-6 · Review parser');
    expect(item.tooltip).toContain('Task: Review parser');
    expect(item.tooltip).not.toContain('gAAAAAB');
    expect(item.tooltip).not.toContain('Latest update:');
  });

  it('shows a compact task preview and preserves full details in the tooltip', () => {
    const task = 'Review the parser\nand verify the malformed metadata cases. '.repeat(5);
    const item = new SubAgentTreeItem(agent({ task, logFilePath: '/child.jsonl', lastInteractionTime: 1000 }), parent);
    expect(String(item.description)).not.toContain('\n');
    expect(String(item.description).length).toBeLessThan(140);
    expect(item.tooltip).toContain(task.trim());
    expect(item.tooltip).toContain('Status: working');
    expect(item.tooltip).toContain('Thread: child');
    expect(item.tooltip).toContain('Log Path: /child.jsonl');
    expect(item.tooltip).toContain('Last Active:');
    expect(item.iconPath).toMatchObject({ id: 'sync~spin' });
  });
});
