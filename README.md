# Claude & Antigravity Agent Monitor

Lightweight VS Code / Antigravity sidebar that monitors your active **Claude Code** and
**Google Antigravity** sessions and their subagents in real time.

![Agent Monitor sidebar showing Claude Code sessions with their working and completed subagents](resources/screenshot.png)

## Features

- **Sessions grouped by tool** — Claude Code and Google Antigravity under separate brand nodes.
- **Per session**: project, git branch, last-active time, session title (first user prompt), and the **LLM model** in use.
- **Working sessions surface first** — sessions still working sort to the top of the list, ahead of idle ones, and show `working` in place of a relative timestamp (a subagent writes to its own log file, so its parent session's last-write clock can go quiet while the subagent is still live).
- **Subagents** — split into _Working_ and _Completed_, each row showing its real name and model (e.g. `explorer-agent · haiku`), read from the metadata Claude Code writes alongside each subagent's transcript, plus its task.
- **Model badges** (Claude Code): session model from the assistant stream (e.g. `sonnet-5`), and each subagent's own model, falling back to the session model when inherited. _(Antigravity logs carry no model info, so no badge there.)_
- **Real-time updates** via file watchers, plus a 15s safety refresh.
- **Active detection** — a session is marked active on a recent write, a reply it still owes, a long _thinking_ turn, or while any of its subagents — including a background agent it launched that runs in its own log file — are still working. `lsof` is also checked on macOS/Linux as a secondary signal (it rarely finds anything, since the log file's descriptor isn't held open between appends), and is skipped entirely on Windows.
- **Startup delay** — waits ~10s on activation, showing a progress bar and loading state, so it doesn't compete with Claude Code for the log files while it boots.
- **Global on/off toggle** — an eye icon in the view title. Persisted as an application-scoped setting, so disabling it stops monitoring across **every** window/instance.

## Requirements

- VS Code or Antigravity **≥ 1.90** (Antigravity 1.107.0 base is compatible).
- macOS, Linux, or Windows.
- Reads `~/.claude/projects/**/*.jsonl` and `~/.gemini/antigravity-ide/brain/**/transcript.jsonl` (`%USERPROFILE%` in place of `~` on Windows).

## Claude Code compatibility

The parser depends on the Claude Code transcript format, which can change between releases.
Last validated against **Claude Code 2.1.222**. Claude Code stamps a `version` field on every
transcript line; when a newer one shows up in your logs, the extension shows a one-time
warning so you know the parser hasn't been re-checked against it yet. See
[docs/DEVELOPMENT.md](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/blob/main/docs/DEVELOPMENT.md#claude-code-compatibility)
for how this is tracked.

## Install

### From the extension store (recommended)

Antigravity (and VSCodium, Gitpod, Cursor, Windsurf) ships the
[Open VSX Registry](https://open-vsx.org): open the **Extensions** view, search for
`Agent Monitor`, and install.

### From a downloaded `.vsix`

Grab the `.vsix` from the
[latest release](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/releases/latest),
then install it:

```bash
# Antigravity
antigravity-ide --install-extension claude-agents-monitor-*.vsix --force

# VS Code
code --install-extension claude-agents-monitor-*.vsix --force
```

…or via the screen: **Extensions** view → `…` (top-right menu) → **Install from VSIX…** →
pick the file you downloaded.

Then reload the window (Command Palette → _Developer: Reload Window_). The 🤖 **Agent Monitor**
icon appears in the activity bar.

To uninstall: `antigravity-ide --uninstall-extension leandrosilvaferreira.claude-agents-monitor`.

## Configuration

| Setting                       | Default | Scope       | Description                                                                                                               |
| ----------------------------- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `claudeAgentsMonitor.enabled` | `true`  | application | Monitor sessions. Disabling stops all log reading in every window; re-enable via the eye icon or by editing this setting. |

## Usage

- Open the **Agent Monitor** view from the activity bar.
- Expand a brand → a session → _Working_ / _Completed_ to see subagents.
- **Open Log File** / **Open Project Folder** are available on each session row (inline icons).
- Toggle monitoring on/off with the eye icon in the view title.

Want to build or modify the extension instead? See
[docs/DEVELOPMENT.md](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/blob/main/docs/DEVELOPMENT.md).

## License

[Apache License 2.0](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/blob/main/LICENSE) — Copyright 2026 Leandro Silva Ferreira.

Free to use, modify, extend and redistribute, including commercially — **provided you keep
the attribution**. Section 4 of the License requires every copy or derivative work to retain
the [NOTICE](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/blob/main/NOTICE) file, which credits the original author and links back to this
repository, to preserve the existing copyright notices, and to state which files were
changed. Stripping that attribution is a licence violation.
