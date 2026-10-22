/**
 * Raw shape of a single Claude Code / Antigravity transcript line (one JSON object per `.jsonl`
 * row). This is the untrusted on-disk format the parser reads — every field is optional because
 * shapes vary by tool, version, and entry type. Kept separate from the domain `Session` model.
 */
export interface LogEntry {
  timestamp?: string;
  time?: string;
  created?: number;
  gitBranch?: string;
  git?: { branch?: string };
  role?: string;
  message?: {
    model?: string;
    content?:
      | Array<{
          type: string;
          text?: string;
          id?: string;
          name?: string;
          input?: { task?: string; Task?: string; name?: string; model?: string; description?: string };
          tool_use_id?: string;
        }>
      | string;
  };
  // On an `assistant` turn that DID produce a `message`, these two mark the turn itself as an
  // API-error response rather than a normal reply (rare in the observed corpus: ~2/661747 and
  // ~141/661747 samples respectively) — distinct from the dedicated `system:api_error` entry
  // (see `subtype` below), which never carries `message` at all.
  apiError?: string;
  isApiErrorMessage?: boolean;
  // Present on a tool_result entry. For a backgrounded Agent it carries status 'async_launched'; for a
  // model-invoked Skill that forked into a background subagent, status 'forked' + agentId (an inline
  // Skill call carries `commandName` alone, no status). `commandName` is the skill's name.
  toolUseResult?: {
    status?: string;
    isAsync?: boolean;
    agentId?: string;
    resolvedModel?: string;
    commandName?: string;
  };
  // `queued_command` attachments carry a backgrounded agent's completion notification in `prompt`.
  attachment?: { prompt?: string };
  content?: Array<{ type: string; text?: string }> | string;
  prompt?: string;
  tool_calls?: Array<{
    id?: string;
    TaskId?: string;
    name?: string;
    ToolName?: string;
    Cwd?: string;
    arguments?: { Task?: string; TaskName?: string; Cwd?: string; SearchPath?: string; DirectoryPath?: string };
    Arguments?: { Task?: string; TaskName?: string; Cwd?: string };
  }>;
  type?: string;
  // Distinguishes a `type:"system"` entry's specific kind — e.g. `subtype: "api_error"` marks a
  // failed API call, `"compact_boundary"` a context-compaction marker. Only meaningful alongside
  // `type: "system"`; read unconditionally in parseLogLine rather than trackTurnSignals, since
  // these entries carry no `message` of their own.
  subtype?: string;
  name?: string;
  id?: string;
  isSidechain?: boolean;
  // Claude Code marks internal/scaffolding user turns (the slash-command caveat, command
  // expansions) with isMeta:true. Read today via nameExtractor.ts's own narrower LogEntryForName
  // view of this same field (extractSessionName skips these turns as titles); declared here too
  // so LogEntry, the canonical parsed shape, doesn't silently omit a field the pipeline depends on.
  isMeta?: boolean;
  // Claude Code stamps how the session was launched. Interactive: 'claude-vscode', 'cli'.
  // A background/workflow agent spawned via the SDK carries an 'sdk*' entrypoint.
  entrypoint?: string;
  input?: { task?: string; Task?: string; name?: string; model?: string; description?: string };
  tool_call_id?: string;
  tool_use_id?: string;
  Cwd?: string;
  // Claude Code stamps the real working directory on every transcript line (lowercase `cwd`,
  // distinct from Antigravity's `Cwd`/tool_calls variants below).
  cwd?: string;
  // Claude Code stamps its own release on every transcript line (e.g. "2.1.218"). Used to detect
  // when a newer Claude Code than the extension was validated against starts writing logs.
  version?: string;
  TargetFile?: string;
  aiTitle?: string;
  // Title the user typed to rename the session, on a `type: 'custom-title'` entry. Rewritten
  // on every rename, so the last one in the transcript is the one in effect. Claude Code also
  // auto-stamps this same entry type to the session's own worktree name on worktree entry — see
  // nameExtractor.ts's extractRenamedTitle for why that must not be trusted as a real rename.
  customTitle?: string;
  // Present on a `type: 'worktree-state'` entry, written when a session enters a git worktree.
  // `worktreeName` is documented (and was, in an earlier real capture) as the name Claude Code
  // later re-uses verbatim as an auto-stamped `customTitle` (see above) — but for a NESTED
  // `<type>/<slug>` worktree layout (this project's own `.claude/worktrees/feat/787-saque-...`
  // convention), real capture shows `worktreeName` holding only the bare leaf slug
  // ("787-saque-de-brl-via-pix-mvp-fluxo-3-fases-t", no "feat/" prefix) while the auto-stamp is
  // actually drawn from the worktree's own PATH instead ("feat", the first segment after
  // `worktrees/`) — `worktreeName` alone never matches it in that shape. `worktreePath` (the full
  // absolute path Claude Code entered) is present alongside it in the same real capture and does
  // carry that full nested shape, so projectPathResolver.ts's detectWorktreeName prefers deriving
  // from it (same derivation as its cwd fallback) over trusting the bare `worktreeName` field.
  // `null` is a real observed value too — Claude Code sends it on a `worktree-state` entry when
  // a session relocates OUT of a worktree back to a bare cwd (see detectWorktreeName's KNOWN
  // LIMITATION comment on why that signal is deliberately NOT used to clear session.worktreeName).
  worktreeSession?: { worktreeName?: string; worktreePath?: string } | null;
}

/**
 * True for a `type: "api-request-blob"` line. From Claude Code 2.1.301 on, every API request is
 * logged into the session transcript: an `api-request` line (no `message`, harmless) preceded by one
 * content-addressed `{ type, sessionId, hash, message: { role, content } }` blob per message not
 * logged before, written just before the `api-request` line of the NEXT request. A `user` or
 * `assistant` blob is a COPY of a turn that already has its own entry, minus every other field of
 * that entry: no `timestamp`, `uuid`, `isSidechain` or `toolUseResult` (a subagent transcript's blobs
 * add only `agentId`). A `system` blob (the most common kind, usually the last before its
 * `api-request`) carries the request's system prompt and tool list and copies no turn at all.
 *
 * Because a blob has a `message`, every reader gated on `message` takes it for a real turn:
 * - subagentCompletion.ts: the copy of an async-launch ACK lacks `toolUseResult.status`, so it reads
 *   as a completion and stops a background subagent that is still running; the copy of a
 *   `<task-notification>` re-stops a finished one with no timestamp, overwriting its real `stoppedAt`
 *   with undefined, which silently disables subagentRewake.ts.
 * - turnSignals.ts: a blob that is the last message-bearing line replaces `lastEntryType` (hiding a
 *   user turn still awaiting its reply while the model generates), rewrites `lastEntryIsThinking`
 *   and `lastEntryIsInterruption`, and clears `lastEntryIsApiError` and `shutdownRecorded`.
 * - nameExtractor.ts: its `message.role === 'user'` test makes a blob a candidate session title.
 *
 * LogParser.parseLogLine therefore drops the line before any reader sees it. Nothing is lost: in
 * every real transcript with blobs (1,429), each tool_use, tool_result and notification id a blob
 * carries also has its own entry, and parsing the file without its blob lines yields the same
 * Session. Claude-only: Antigravity never writes this type, so the gate is a no-op for that brand.
 */
export function isApiRequestBlob(json: LogEntry): boolean {
  return json.type === 'api-request-blob';
}
