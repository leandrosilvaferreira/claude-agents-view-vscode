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
  // Present on a tool_result entry. For a backgrounded Agent it carries status 'async_launched'.
  toolUseResult?: { status?: string; isAsync?: boolean; agentId?: string; resolvedModel?: string };
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
  // `worktreeName` is the bare worktree name Claude Code later re-uses verbatim as an
  // auto-stamped `customTitle` (see above) — tracked on `session.worktreeName` so that stamp can
  // be recognized and ignored.
  worktreeSession?: { worktreeName?: string };
}
