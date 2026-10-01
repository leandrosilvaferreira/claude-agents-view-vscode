# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2026-10-01

### Changed

- Validated against Claude Code 2.1.286 (the previous pin was 2.1.284), so the "unvalidated Claude Code version" warning no longer appears for 2.1.285 and 2.1.286. The transcript schema changed only additively and nothing the parser reads moved; see the [validation notes](docs/claude-code-2.1.286-validation.md).

## [0.6.0] - 2026-09-30

### Changed

- Session activity is now detected from file-system events and each transcript's modification time, with no external process, the same way on every platform. A session counts as working while its transcript was written to within the activity window (60 seconds by default, as before).
- Watcher events are coalesced: a 500 ms window opens at the first event and is not extended by later ones, then one flush parses each changed file once, refreshes the statuses once and updates the tree once. A change can appear up to half a second later than before, but a transcript that is appended to continuously no longer triggers work on every write.
- Full scans (the periodic tick, **Refresh** and the first load) are single-flight: two scans never overlap, and requests that arrive during a scan collapse into one follow-up scan.
- The polling safety net is now configurable (every 15 seconds by default).
- The verbose debug log no longer gets a line for every watcher event.
- The debug log in the OS temporary folder (`claude-agents-monitor-debug.log`) is now capped at 2 MB: when it fills up it is moved to `claude-agents-monitor-debug.log.1`, replacing the previous copy. A log left by an earlier version that is already 4 MB or more (one reached 235 MB) is deleted the first time the extension writes to it instead of being kept.

### Removed

- Every `lsof` invocation. `lsof` ran 251,510 times in two days of extension logs and never returned a file: it listed the transcript directory instead of the files inside it, and Claude Code and Antigravity open, append to and close a transcript rather than holding it open. It ran on every watcher event as well as on every tick, and only ever on macOS and Linux.

### Added

- `claudeAgentsMonitor.activityWindowSeconds` setting (default 60, range 10–1800): how long after its last write a Claude Code or Antigravity session still counts as working.
- `claudeAgentsMonitor.pollIntervalSeconds` setting (default 15, range 10–30): how often the safety-net rescan runs.
- An **Agent Monitor** output channel that reports the detection strategy in use, the folders registered for watching at startup and the active settings, and says when polling is the only detection path. A watcher the operating system stops later is not reported — the periodic rescan still covers it.
- Lint rules that ban, under `src/`, importing `child_process` (and `node:child_process`), every dynamic `import()`, `require()`, and any import of `module` (for `createRequire`) or `cluster`, as a guard against spawning external processes again. It is a fence, not a sandbox: VS Code's own terminal and task APIs, re-exports and `process.getBuiltinModule` are not covered.
- Pull-request CI (`.github/workflows/ci.yml`, also run on every push to `main`): lint and typecheck on Ubuntu, and the tests plus the esbuild build on Ubuntu, Windows and macOS. A repository-level `.gitattributes` pins LF line endings, so a Windows checkout has the same bytes as Linux and macOS.

### Fixed

- Transcripts of several hundred MB no longer break parsing. The parser read everything appended since its last pass into one buffer and decoded it into one string, which fails past V8's ~512 MiB string limit; the error was swallowed into an empty session that was retried on every scan. It now reads in 8 MiB chunks and decodes one line at a time, so memory stays bounded by the chunk size plus a few times the longest accepted line (at most 64 MiB). A line over 64 MiB, or one that cannot be decoded, is skipped and noted in the debug log; the lines around it still parse.
- A transcript that was still being written could become unreadable for good. When its first line stopped inside a multi-byte character (accented text, emoji), the resume position went negative, every later read failed, and the session stayed empty even after the line was completed. The resume position is now counted in exact bytes.
- On Windows, a transcript is no longer tracked under two spellings of its path. VS Code reports a watched file with a lower-case drive letter (`c:\Users\…`) while the scan builds the same path from the home directory or `CODEX_HOME` (`C:\Users\…`, or however `CODEX_HOME` is spelled), so one file got two byte cursors and two parse states, and a deleted Codex rollout never matched its session. Every scanned and watched path now spells the drive letter in upper case; POSIX paths are never rewritten.

### Security

- The debug log, which can contain local file paths and session IDs, is now created readable by its owner only (mode 0600 on macOS and Linux), and a log left by an earlier version is tightened to 0600 the first time it is used. On macOS and Linux the extension also refuses to write to anything found at the log's path that is a symbolic link, a hard link, a named pipe or other special file, or a file owned by another user.

Earlier versions: see [GitHub Releases](https://github.com/leandrosilvaferreira/claude-agents-view-vscode/releases).
