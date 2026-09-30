import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type UriCallback = (uri: { fsPath: string }) => void;

// Callbacks the fake VS Code watchers captured, in registration order. Changes and creations:
// Claude (0), Antigravity (1), Codex (2). Deletions: only the Codex watcher listens for them (index 0).
const captured = vi.hoisted(() => ({
  changes: [] as UriCallback[],
  creations: [] as UriCallback[],
  deletions: [] as UriCallback[],
}));

vi.mock('vscode', () => ({
  RelativePattern: class {
    readonly testMock = true;
  },
  workspace: {
    createFileSystemWatcher: () => ({
      onDidChange: (callback: UriCallback) => captured.changes.push(callback),
      onDidCreate: (callback: UriCallback) => captured.creations.push(callback),
      onDidDelete: (callback: UriCallback) => captured.deletions.push(callback),
      dispose: vi.fn(),
    }),
  },
}));

import { createSessionFileWatchers } from '../sessionFileWatchers';

// `vscode.Uri.fsPath` spells a Windows drive letter in lower case; the scan (built from
// `os.homedir()`) keeps the OS spelling. The boundary must hand the rest of the extension the scan's
// spelling, or one transcript gets two path-keyed parse states and a Codex delete never matches.
// Placeholder paths: nothing here has to exist on disk, so the suite reads the same on every OS.
const VSCODE_SPELLING = 'c:\\Users\\x\\sessions\\s.jsonl';
const SCAN_SPELLING = 'C:\\Users\\x\\sessions\\s.jsonl';

/**
 * Has VS Code report `VSCODE_SPELLING` to a captured watcher callback while `process.platform` reads
 * `platform` (canonicalFsPath looks it up when the event fires, so the stub has to be in place then).
 * The real value is put back even if the callback throws, so no other test ever sees the fake one.
 */
function reportAs(platform: NodeJS.Platform, callback: UriCallback): void {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { ...original, value: platform });
  try {
    callback({ fsPath: VSCODE_SPELLING });
  } finally {
    if (original) Object.defineProperty(process, 'platform', original);
  }
}

describe('createSessionFileWatchers: path spelling at the VS Code boundary', () => {
  const onChange = vi.fn();
  const onCodexDelete = vi.fn();
  let home: string;

  beforeEach(() => {
    captured.changes = [];
    captured.creations = [];
    captured.deletions = [];
    onChange.mockClear();
    onCodexDelete.mockClear();
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-boundary-'));
    // The Claude and Antigravity watchers register only once their root exists; the Codex one always does.
    const claudeProjectsPath = path.join(home, '.claude', 'projects');
    const geminiBrainPath = path.join(home, '.gemini', 'antigravity-ide', 'brain');
    fs.mkdirSync(claudeProjectsPath, { recursive: true });
    fs.mkdirSync(geminiBrainPath, { recursive: true });
    // Registered before any test stubs the platform: the stub is only installed around a fired event.
    createSessionFileWatchers(
      { claudeProjectsPath, geminiBrainPath, codexSessionsPath: path.join(home, '.codex', 'sessions') },
      { onChange, onCodexDelete },
    );
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  describe('on Windows', () => {
    it('hands a changed transcript to onChange with the spelling the scan uses', () => {
      reportAs('win32', captured.changes[0]);

      expect(onChange).toHaveBeenCalledExactlyOnceWith(SCAN_SPELLING, 'claude-code');
    });

    it('does the same for a created transcript — a new session starts with a create event', () => {
      reportAs('win32', captured.creations[0]);

      expect(onChange).toHaveBeenCalledExactlyOnceWith(SCAN_SPELLING, 'claude-code');
    });

    it.each([
      ['antigravity', 1],
      ['codex', 2],
    ])('does the same for the %s watcher', (brand, index) => {
      reportAs('win32', captured.changes[index]);

      expect(onChange).toHaveBeenCalledExactlyOnceWith(SCAN_SPELLING, brand);
    });

    it('hands a deleted Codex rollout to onCodexDelete with the spelling the scan uses, so its === match finds the session', () => {
      reportAs('win32', captured.deletions[0]);

      expect(onCodexDelete).toHaveBeenCalledExactlyOnceWith(SCAN_SPELLING);
    });
  });

  describe.each<NodeJS.Platform>(['linux', 'darwin'])('on %s', (platform) => {
    it('passes a changed path through untouched — a POSIX path is never rewritten', () => {
      reportAs(platform, captured.changes[0]);

      expect(onChange).toHaveBeenCalledExactlyOnceWith(VSCODE_SPELLING, 'claude-code');
    });

    it('passes a deleted Codex path through untouched', () => {
      reportAs(platform, captured.deletions[0]);

      expect(onCodexDelete).toHaveBeenCalledExactlyOnceWith(VSCODE_SPELLING);
    });
  });
});
