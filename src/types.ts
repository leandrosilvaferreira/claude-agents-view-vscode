export interface SubAgent {
  id: string;
  name: string;
  task: string;
  status: 'working' | 'stopped';
  model?: string; // LLM the subagent runs on (from the Agent tool's `model` input)
}

export interface Session {
  id: string; // The session UUID or Conversation ID
  projectHash: string; // Raw project-hash directory name or ID
  projectPath: string; // Resolved project absolute path
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
  entrypoint?: string; // How the session started: 'claude-vscode'/'cli' = human, 'sdk-*' = spawned agent
  claudeVersion?: string; // Claude Code version stamped on the transcript (`version` field), for compat checks
}
