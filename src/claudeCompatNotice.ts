import { Session } from './types';
import { KNOWN_COMPATIBLE_CLAUDE_VERSION, compareVersions, isNewerThanCompatible } from './claudeCompat';
import { logDebug } from './logger';

/**
 * The "unvalidated Claude Code version" notice (extracted from sessionTreeDataProvider.ts's
 * checkClaudeVersionCompat purely to keep that file under its line budget). Warn once when a Claude
 * Code newer than the validated version (claudeCompat.ts) writes logs, so a format change can be
 * re-checked instead of silently mis-parsing (renamed field → sessions vanish/mis-group).
 *
 * The returned function is meant to run after every load: it looks for the newest `claudeVersion`
 * above the validated one among the sessions it is handed (sessions without one — LogParser stamps
 * it from the transcript's `version` field — are ignored) and, the first time it finds one, logs and
 * calls `notify`. Every later call is a no-op, even for a still-newer version, so the warning
 * appears at most once per notifier (one per provider, i.e. once per window). `notify` is injected
 * (the provider passes vscode.window.showWarningMessage) so this module stays vscode-free and
 * unit-testable.
 */
export function createClaudeCompatNotifier(notify: (message: string) => void): (sessions: Iterable<Session>) => void {
  let warned = false;
  return (sessions) => {
    if (warned) return;
    let newest = '';
    for (const session of sessions) {
      const v = session.claudeVersion;
      if (v && isNewerThanCompatible(v) && (newest === '' || compareVersions(v, newest) > 0)) {
        newest = v;
      }
    }
    if (!newest) return;
    warned = true;
    const msg =
      `Claude Code ${newest} detected; Agent Monitor was validated against ${KNOWN_COMPATIBLE_CLAUDE_VERSION}. ` +
      `If sessions look wrong, the log format may have changed.`;
    logDebug(`SessionTreeDataProvider: ${msg}`);
    notify(msg);
  };
}
