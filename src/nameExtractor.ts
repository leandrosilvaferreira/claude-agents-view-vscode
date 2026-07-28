export interface LogEntryForName {
  role?: string;
  type?: string;
  // Claude Code marks internal/scaffolding user turns (the slash-command caveat, command
  // expansions) with isMeta:true — these are not the user's prompt.
  isMeta?: boolean;
  message?: {
    role?: string;
    content?:
      | Array<{
          type: string;
          text?: string;
        }>
      | string;
  };
  content?: Array<{ type: string; text?: string }> | string;
  prompt?: string;
}

// Slash-command scaffolding (and background-agent notifications) that a recent Claude Code
// update records as the first `type:"user"` turns. Used as a title, they made every session
// opened with a slash command share one identical title, collapsing distinct concurrent
// sessions into a single dedupe slot. Skip any turn whose text is purely one of these blocks.
const SCAFFOLD_PREFIXES = [
  '<local-command-',
  '<command-name>',
  '<command-message>',
  '<command-args>',
  '<task-notification>',
];

function isScaffold(text: string): boolean {
  const t = text.trimStart();
  return SCAFFOLD_PREFIXES.some((p) => t.startsWith(p));
}

/**
 * The title the user typed to rename the session, when this entry is a rename. Claude Code writes
 * one `type:"custom-title"` entry per rename, so the last one in the transcript is the name it
 * shows — and being an explicit human choice, it outranks anything derived or generated.
 */
export function extractRenamedTitle(json: { type?: string; customTitle?: string }): string | null {
  if (json.type !== 'custom-title' || typeof json.customTitle !== 'string') return null;
  return json.customTitle.trim() || null;
}

export function extractSessionName(json: LogEntryForName): string | null {
  if (json.isMeta === true) return null;
  const name = extractAntigravityName(json) || extractClaudeName(json) || extractGenericName(json);
  if (name === null) return null;
  return isScaffold(name) ? null : name;
}

function extractAntigravityName(json: LogEntryForName): string | null {
  if (json.type !== 'USER_INPUT' || typeof json.content !== 'string') return null;
  const match = json.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (!match) return null;
  // Strip any nested XML/markup tags and collapse whitespace
  return (
    match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null
  );
}

function extractClaudeName(json: LogEntryForName): string | null {
  // Claude Code format: top-level type === 'user', role nested in message.
  // Legacy / alternate format: top-level role === 'user'.
  const isUserTurn = json.type === 'user' || json.role === 'user' || json.message?.role === 'user';
  if (!isUserTurn) return null;
  return extractClaudeMessageContentName(json) || extractClaudeContentArrayName(json);
}

function extractClaudeMessageContentName(json: LogEntryForName): string | null {
  const content = json.message?.content;
  // Simple text-only turns carry content as a plain string instead of a content-block array
  // (seen on forked/automated turns, e.g. a hook-spawned review prompt) — extract it directly.
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        return block.text;
      }
    }
  }
  return null;
}

function extractClaudeContentArrayName(json: LogEntryForName): string | null {
  if (Array.isArray(json.content)) {
    for (const block of json.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        return block.text;
      }
    }
  }
  return null;
}

function extractGenericName(json: LogEntryForName): string | null {
  if (json.prompt && typeof json.prompt === 'string') {
    return json.prompt;
  }
  return null;
}
