# Codex local session monitoring

## Implementation plan

1. Inspect local rollout metadata and lifecycle events without copying private conversations into fixtures.
2. Add a Codex parser and explicit parent-thread hierarchy alongside the existing providers.
3. Connect discovery, refresh and tree presentation; preserve distinct concurrent sessions.
4. Validate with synthetic integration tests and a read-only check against active local rollouts.

## Sources and observed format

Codex stores local state under `CODEX_HOME`, which defaults to `~/.codex` ([official configuration documentation](https://developers.openai.com/codex/config-advanced)). The extension reads rollout JSONL files under `sessions/YYYY/MM/DD/`; it does not need authentication files, application SQLite databases or network access.

Local inspection on 2026-09-09 confirmed both CLI and VS Code sessions in that directory. Each line is an envelope containing `timestamp`, `type`, and `payload`. `session_meta` identifies the thread, working directory and launcher. VS Code uses `source: "vscode"` and `originator: "codex_vscode"`; CLI uses `source: "cli"`.

Subagents have their own rollout files. Their metadata identifies the parent through `parent_thread_id` or `source.subagent.thread_spawn.parent_thread_id`. Agent paths and nicknames are metadata; hierarchy must use thread IDs, not names, titles, matching directories or timing guesses.

Forked rollouts can contain copied ancestor history, including additional ancestor `session_meta` records. The first header owns the file identity. Later ancestor headers must not overwrite it. Some versions also write `subagent_history_start_ordinal`; it is not present in every local fork. Ordinary resumed roots can repeat their own metadata.

Copied ancestor records can have rewritten envelope timestamps, so timestamps alone cannot identify where inherited history ends. Once a foreign thread header appears, the parser ignores inherited events until an explicit own-thread `thread_settings_applied` event or own-thread metadata header appears. All six inspected local rollouts containing ancestor headers had that explicit boundary. Without one, the parser conservatively leaves inherited activity unused.

`turn_context` carries the model and working directory. `event_msg` includes turn lifecycle events such as `task_started` and `task_complete`. Tool calls can appear as both `function_call` and `custom_tool_call` response items. Their presence does not imply a new agent; each child must be linked using its own metadata.

Child task deliveries may contain only a plaintext message envelope while their actual content is encrypted. The parent's `spawn_agent` argument can also be an encrypted token, despite being represented as a JSON string. A task is used only when it is readable text and a successful output with the same `call_id` confirms the child path or thread ID. The hierarchy joins it only to that parent's matching child. It does not treat encrypted strings, delivery envelopes, inherited history or failed launches as task descriptions.

When the task is encrypted, the tooltip explicitly reports it as unavailable in the local log. A readable child `event_msg.agent_message` or assistant `response_item.message` with `output_text` can instead appear as a separate **Latest update**, including in the row preview. This is an agent progress message, not a recovered or inferred task. Inherited ancestor updates are ignored until the own-thread boundary. No decryption or invented summary is attempted.

VS Code can wrap a user request in `# Context from my IDE setup:` and an explicit request section. Session titles use the request section, excluding open-tab context. Agent descriptions show a compact task preview; tooltips retain the full task and include status, model, thread, last activity and transcript path when available. Last activity is the child rollout's own modification time, not an inferred agent start time. Codex, Claude Code and Antigravity use bundled original brand icons for light and dark themes; asset provenance is recorded in `NOTICE`.

## Scope and limitations

This is a read-only view of local persisted activity, not a direct connection to a running Codex process. Events can be buffered, and an unfinished turn becomes inactive after the monitor's idle ceiling. Explicit completion and interruption stop the turn even when the file remains open. Archived sessions and remote-only sessions are outside the live rollout directory.

Codex sessions are visible across projects, matching Antigravity. Claude Code retains its existing workspace scope. Separate Codex thread IDs remain separate roots even when their titles and project directories match.

The detailed rollout schema above was observed locally, rather than promised as a stable public API. Unknown records and incomplete final lines must be tolerated. Tests use synthetic data; no actual prompts, tool outputs, credentials or private repository contents are committed.

## Validation progress

- Local CLI and VS Code rollout sources and child metadata inspected.
- Synthetic end-to-end tests added for distinct roots, nested descendants, orphan children and appended lifecycle events.
- A read-only check of the real scanner, shared parser, status refresh, hierarchy and visible-session assembly found 63 rollouts, 31 roots, 2 visible working roots and 28 visible descendants. The two agents shown in the supplied screenshot were found; one had completed since the screenshot and the other was still working. This is a changing local snapshot, not a benchmark.
- Repeat the aggregate-only check below after installing development dependencies. It honors `CODEX_HOME` and prints counts without printing session titles, paths or conversation contents.
- Provider tests cover the Codex brand, watcher deletion, full-refresh deletion and completion of a partial metadata header.
- Initial provider validation passed: 429 tests across 35 files, ESLint and duplication checks, TypeScript checking, build and formatting checks. Review found and resolved missed-deletion cleanup and inherited-history status issues.
- UI behavior was exercised with a mocked VS Code API and real temporary rollout files. No manual Extension Development Host or installed-extension visual check was performed.
- An earlier live check found 29 nonempty task strings and verified that they reached descriptions/tooltips. That validation was insufficient: it checked presence and scaffolding, but not whether those strings were readable plaintext. A subsequent user screenshot exposed encrypted tokens being shown as tasks. The checks were replaced with explicit encrypted-token rejection and readable-task versus unavailable-task classification; the earlier count must not be interpreted as 29 recovered task descriptions.
- Independent inspection of the two agents highlighted in the screenshot confirmed encrypted parent spawn messages and encrypted child content, with no plaintext spawn description. Their tasks cannot be recovered from those records. Regression tests now require zero encrypted text in titles, descriptions and tooltips, and keep a readable own-thread latest update separate from an unavailable task.
- The corrected live check found 29 unavailable tasks and 29 readable latest updates across 29 visible descendants, with zero encrypted tokens exposed in descriptions, tooltips or root titles. All 29 updates matched their exact own-thread source text; all rendered previews matched the normalized source prefix. Both highlighted screenshot agents passed these checks and displayed an explicit `Update:` prefix and activity timestamp. These numbers are a changing snapshot, not a guarantee that every future local rollout contains readable updates.
- All three brand icons were visually inspected in a 16-pixel sidebar preview on light and dark backgrounds. Their six SVG assets resolve locally and contain no scripts, external references or embedded HTML.
- During follow-up validation, the unchanged architectural lint test exceeded its default 5-second timeout while lazily initializing ESLint's TypeScript project service. This recurred in an isolated run amid substantial external CPU contention. No repository timeout was changed; final verification uses the same assertions serially with a temporary CLI timeout override. This distinguishes functional verification from a claim that the default timing gate passed under that load.
- Final validation after the encrypted-text correction passed: `npm run lint`, `npx tsc --noEmit`, `npm run test -- --maxWorkers=1 --testTimeout=30000` (454 tests across 37 files), `npm run build`, and `npm run format:check`. All commands exited successfully. The test timeout override is temporary for verification under concurrent host load; the repository's default timeout remains unchanged.

## Reproduce the local aggregate check

Run from the repository root. Compilation writes the normal local `out/` build; inspection only reads Codex rollouts.

```sh
npm run compile
node <<'NODE'
const os = require('os');
const path = require('path');
const { scanSessionFiles } = require('./out/sessionScanner');
const { LogParser } = require('./out/logParser');
const { assembleCodexHierarchy } = require('./out/codexHierarchy');
const { assembleVisibleSessions } = require('./out/sessionAssembly');
const { computeSessionStatus } = require('./out/sessionActivity');
const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const files = scanSessionFiles('', '', path.join(home, 'sessions'));
const parser = new LogParser();
const parsed = files.map(file => parser.parse(file.path, file.type));
for (const session of parsed) session.status = computeSessionStatus(session, new Set());
const roots = assembleCodexHierarchy(parsed);
const visible = assembleVisibleSessions(roots, [], Date.now()).topLevel;
const count = agents => agents.reduce((n, agent) => n + 1 + count(agent.children || []), 0);
console.log({
  rollouts: files.length,
  roots: roots.length,
  visibleRoots: visible.length,
  workingRoots: visible.filter(session => session.status === 'working').length,
  descendants: visible.reduce((n, session) => n + count(session.subagents), 0),
});
NODE
```
