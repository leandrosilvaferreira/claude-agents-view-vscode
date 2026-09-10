import * as vscode from 'vscode';
import * as path from 'path';
import { Session, SubAgent } from './types';
import { readableCodexText } from './codexTasks';

/** Shorten model ids for display: "claude-sonnet-5" → "sonnet-5"; "sonnet" stays "sonnet". */
function formatModel(model?: string): string {
  return model ? model.replace(/^claude-/, '') : '';
}

const BRAND_LABELS: Record<Session['type'], string> = {
  'claude-code': 'Claude Code',
  antigravity: 'Google Antigravity',
  codex: 'Codex',
};

function codexTaskPreview(task?: string, latestUpdate?: string): string {
  const compact = (task ?? latestUpdate ?? '').replace(/\s+/g, ' ').trim();
  const preview = compact.length > 120 ? compact.slice(0, 117).trimEnd() + '...' : compact;
  return !task && latestUpdate ? `Update: ${preview}` : preview;
}

/** Non-selectable placeholder row for loading / empty states. */
export class MessageTreeItem extends vscode.TreeItem {
  constructor(label: string, iconId: string, description?: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'message';
    this.iconPath = new vscode.ThemeIcon(iconId);
    if (description) {
      this.description = description;
    }
  }
}

export class BrandTreeItem extends vscode.TreeItem {
  constructor(
    public readonly brand: Session['type'],
    public readonly sessions: Session[],
  ) {
    super(BRAND_LABELS[brand], vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'brand';
    this.id = brand;

    const iconName = brand === 'claude-code' ? 'claude' : brand;
    this.iconPath = {
      light: vscode.Uri.file(path.join(__dirname, '..', 'resources', `${iconName}-light.svg`)),
      dark: vscode.Uri.file(path.join(__dirname, '..', 'resources', `${iconName}-dark.svg`)),
    };
  }
}

export class SessionTreeItem extends vscode.TreeItem {
  constructor(public readonly session: Session) {
    super(session.projectName, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = 'session';
    this.id = session.id;

    // A session launched via the SDK (entrypoint 'sdk*') is a background agent (e.g. /security-review,
    // a workflow run), not a human IDE session. Mark it so it isn't mistaken for a duplicate session —
    // it legitimately runs its own model, often different from the launcher's.
    const isAgentSession = session.entrypoint?.startsWith('sdk') ?? false;

    // A subagent writes to its own file, so the parent transcript's clock freezes while it
    // works — a stale "Xm ago" next to a live spinner misreads as stalled, so show "working" instead.
    const relativeTime =
      session.status === 'working' ? 'working' : this.formatRelativeTime(session.lastInteractionTime);
    const model = formatModel(session.model);
    const agentTag = isAgentSession ? 'agent · ' : '';
    const meta = model
      ? `${agentTag}${model} · [${session.gitBranch}] · ${relativeTime}`
      : `${agentTag}[${session.gitBranch}] · ${relativeTime}`;
    this.description = session.sessionTitle ? `${meta}  —  ${session.sessionTitle}` : meta;

    this.tooltip = new vscode.MarkdownString(
      `**Project:** ${session.projectName}\n\n` +
        (session.sessionTitle ? `**Session:** ${session.sessionTitle}\n\n` : '') +
        `**Type:** ${BRAND_LABELS[session.type]}\n\n` +
        (model ? `**Model:** \`${model}\`\n\n` : '') +
        `**Branch:** \`${session.gitBranch}\`\n\n` +
        `**Last Active:** ${new Date(session.lastInteractionTime).toLocaleString()}\n\n` +
        `**Log Path:** \`${session.logFilePath}\``,
    );

    this.iconPath = this.statusIcon(session.status, isAgentSession);
  }

  private statusIcon(status: Session['status'], isAgentSession: boolean): vscode.ThemeIcon {
    if (status === 'working') {
      return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconPassed'));
    }
    if (status === 'error') {
      // Same testing.icon* family already used for 'working' above (pass/fail semantics fit an
      // API-error read directly), so the two stay visually paired while still reading as opposite.
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
    }
    const idle = new vscode.ThemeColor('descriptionForeground');
    return new vscode.ThemeIcon(isAgentSession ? 'hubot' : 'circle-filled', idle);
  }

  private formatRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    if (diff < 5000) {
      return 'just now';
    }
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) {
      return `${seconds}s ago`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

export class SubAgentGroupTreeItem extends vscode.TreeItem {
  constructor(
    public readonly groupType: 'working' | 'completed',
    public readonly subagents: SubAgent[],
    public readonly parentSession: Session,
  ) {
    super(
      groupType === 'working' ? 'Working Agents' : 'Completed Agents',
      groupType === 'working' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
    );
    this.contextValue = 'subagent-group';
    this.id = `${parentSession.id}-${groupType}`;

    if (groupType === 'working') {
      this.iconPath = new vscode.ThemeIcon('play', new vscode.ThemeColor('testing.iconPassed'));
    } else {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('descriptionForeground'));
    }
  }
}

export class SubAgentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly subagent: SubAgent,
    public readonly parentSession: Session,
  ) {
    // Collapsible only when this subagent has its own nested subagents ("grandchildren" —
    // subagentMetadata.ts's attachNestedSubagents). A grandchild SubAgent never has `.children`
    // itself (nesting is truncated to one level), so this naturally renders as a leaf again for it.
    const hasChildren = (subagent.children?.length ?? 0) > 0;
    super(
      `🤖 ${subagent.name}`,
      hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    );

    this.contextValue = 'subagent';
    // Subagent's own model, falling back to the session model when it inherits it.
    const model = formatModel(subagent.model || parentSession.model);
    this.description = model ? `${model} · ${subagent.task}` : subagent.task;
    this.tooltip = `Subagent ${subagent.name}\nTask: ${subagent.task}${model ? `\nModel: ${model}` : ''}`;
    if (parentSession.type === 'codex') this.setCodexDetails(model);

    if (subagent.status === 'working' && parentSession.status === 'working') {
      this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconPassed'));
    } else {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('descriptionForeground'));
    }
  }

  private setCodexDetails(model: string): void {
    const sub = this.subagent;
    const task = readableCodexText(sub.task);
    const latestUpdate = readableCodexText(sub.latestUpdate);
    const detail = codexTaskPreview(task, latestUpdate);
    this.description = [model, detail].filter(Boolean).join(' · ');
    this.tooltip = [
      `Subagent ${sub.name}`,
      task ? `Task: ${task}` : 'Task unavailable in local log',
      latestUpdate ? `Latest update: ${latestUpdate}` : '',
      `Status: ${sub.status}`,
      model ? `Model: ${model}` : '',
      `Thread: ${sub.id}`,
      sub.lastInteractionTime ? `Last Active: ${new Date(sub.lastInteractionTime).toLocaleString()}` : '',
      sub.logFilePath ? `Log Path: ${sub.logFilePath}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
