export interface SubAgent {
  id: string;
  name: string;
  task: string;
  status: 'working' | 'stopped';
  model?: string; // LLM the subagent runs on (from the Agent tool's `model` input)
  launchId?: string; // Original launch tool_use id, preserved when a SendMessage resume re-keys `id` (subagentDetector.ts) so subagentMetadata's sidecar join keeps matching
  agentId?: string; // Raw agentId from the sidecar filename (agent-<id>.meta.json) — the other form SendMessage's `to` may target when launch set no `name` (subagentMetadata.ts)
  // "Grandchildren": subagents THIS subagent launched itself (joined on the sidecar's
  // parentAgentId — see subagentMetadata.ts's attachNestedSubagents). Deliberately one level
  // only — a depth-3 chain (a grandchild's own children) is truncated, not represented here.
  children?: SubAgent[];
}

export interface Session {
  id: string; // The session UUID or Conversation ID
  projectHash: string; // Raw project-hash directory name or ID
  projectPath: string; // Resolved project absolute path
  // Every ~/.claude/projects encoded directory name (sidecarReader.ts's encodeProjectDir)
  // `projectPath` has ever resolved to over this session's life, most-recently-used order (a
  // revisited dir moves to the end, so the CURRENT dir is always last), deduped.
  // `projectPath` alone only reflects the LATEST cwd seen — a session that enters a git
  // worktree, dispatches subagents there (their sidecars land ONLY under the worktree's own
  // encoded directory), then leaves the worktree has `projectPath` revert to the base cwd,
  // which would otherwise silently and permanently drop the worktree directory from
  // sidecarReader.ts's candidateMetadataDirs search (real corpus, 14-day audit 2026-08-21: 27
  // of 34 worktree-split sessions ended exactly this way). Maintained in projectPathResolver.ts's
  // setProjectPath, the only place `projectPath` is ever set — never assign `projectPath`
  // directly from a new call site without also going through that same helper, or both the
  // membership and the MRU ordering guarantees silently break for it.
  knownProjectDirs?: string[];
  projectName: string; // Human-readable project folder name or user prompt
  gitBranch: string;
  status: 'working' | 'stopped';
  lastInteractionTime: number; // Unix timestamp in ms
  subagents: SubAgent[];
  logFilePath: string;
  type: 'claude-code' | 'antigravity';
  nameFromPrompt?: boolean; // Flag indicating if sessionTitle was captured
  sessionTitle?: string; // First user prompt (session name as shown in Claude/AG tab)
  titleIsCustom?: boolean; // sessionTitle came from a user rename — nothing generated may override it
  model?: string; // LLM the session runs on (from assistant `message.model`)
  isSidechain?: boolean; // True if this transcript is a subagent sidechain, not a standalone session
  lastEntryType?: string; // `type` of the last transcript entry — 'user' means Claude still owes a reply
  lastEntryIsThinking?: boolean; // Last conversational turn was a thinking-only block — mid-turn, still working
  lastEntryIsInterruption?: boolean; // Last user turn was Claude Code's own interruption sentinel (Esc), not a real prompt — overrides the 'user' reading of lastEntryType above. Recomputed on every message-bearing turn like lastEntryType, so it self-clears the moment a genuine next turn lands.
  entrypoint?: string; // How the session started: 'claude-vscode'/'cli' = human, 'sdk-*' = spawned agent
  claudeVersion?: string; // Claude Code version stamped on the transcript (`version` field), for compat checks
  worktreeName?: string; // Bare git-worktree name from the last `type:"worktree-state"` entry seen — lets
  // nameExtractor.extractRenamedTitle recognize Claude Code's own auto-stamped `custom-title` (set to this
  // same name on worktree entry) instead of trusting it as a real user rename.
}
