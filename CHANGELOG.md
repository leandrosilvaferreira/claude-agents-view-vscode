# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-09-30

### Changed

- Session activity is now detected from file-system events and each transcript's modification time, with no external process, the same way on every platform. A session counts as working while its transcript was written to within the activity window (60 seconds by default, as before).
- Watcher events are coalesced: a 500 ms window opens at the first event and is not extended by later ones, then one flush parses each changed file once, refreshes the statuses once and updates the tree once. A change can appear up to half a second later than before, but a transcript that is appended to continuously no longer triggers work on every write.
- Full scans (the periodic tick, **Refresh** and the first load) are single-flight: two scans never overlap, and requests that arrive during a scan collapse into one follow-up scan.
- The polling safety net is now configurable (every 15 seconds by default).
- The verbose debug log no longer gets a line for every watcher event.

### Removed

- Every `lsof` invocation. `lsof` ran 251,510 times in two days of extension logs and never returned a file: it listed the transcript directory instead of the files inside it, and Claude Code and Antigravity open, append to and close a transcript rather than holding it open. It ran on every watcher event as well as on every tick, and only ever on macOS and Linux.

### Added

- `claudeAgentsMonitor.activityWindowSeconds` setting (default 60, range 10–1800): how long after its last write a Claude Code or Antigravity session still counts as working.
- `claudeAgentsMonitor.pollIntervalSeconds` setting (default 15, range 10–30): how often the safety-net rescan runs.
- An **Agent Monitor** output channel that reports the detection strategy in use, the folders registered for watching at startup and the active settings, and says when polling is the only detection path. A watcher the operating system stops later is not reported — the periodic rescan still covers it.
- Lint rules that ban, under `src/`, importing `child_process` (and `node:child_process`), every dynamic `import()`, `require()`, and any import of `module` (for `createRequire`) or `cluster`, as a guard against spawning external processes again. It is a fence, not a sandbox: VS Code's own terminal and task APIs, re-exports and `process.getBuiltinModule` are not covered.

Earlier versions: see [GitHub Releases](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/releases).
