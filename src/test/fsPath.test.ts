import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { canonicalFsPath, canonicalJoin } from '../fsPath';

/** Runs `action` with `process.platform` reporting `platform`, then puts the real value back. */
function withPlatform<T>(platform: NodeJS.Platform, action: () => T): T {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { ...original, value: platform });
  try {
    return action();
  } finally {
    if (original) Object.defineProperty(process, 'platform', original);
  }
}

// The same file as VS Code spells it (`Uri.fsPath`) and as the scan spells it (`os.homedir()`).
const VSCODE_SPELLING = 'c:\\Users\\x\\.claude\\projects\\p\\s.jsonl';
const SCAN_SPELLING = 'C:\\Users\\x\\.claude\\projects\\p\\s.jsonl';

describe('canonicalFsPath', () => {
  describe('on win32', () => {
    it.each([
      ['a lower-case drive letter', VSCODE_SPELLING, SCAN_SPELLING],
      ['a drive other than C', 'd:\\logs\\a.jsonl', 'D:\\logs\\a.jsonl'],
      ['a forward-slash spelling', 'c:/Users/x/a.jsonl', 'C:/Users/x/a.jsonl'],
    ])('upper-cases %s', (_case, input, expected) => {
      expect(canonicalFsPath(input, 'win32')).toBe(expected);
    });

    it('rewrites only the leading drive letter, not a later "x:" inside the path', () => {
      expect(canonicalFsPath('c:\\dir\\d:\\a.jsonl', 'win32')).toBe('C:\\dir\\d:\\a.jsonl');
    });

    it.each([
      ['an already upper-case drive letter', SCAN_SPELLING],
      ['a UNC path', '\\\\server\\share\\a.jsonl'],
      ['a relative path whose first segment is a single letter', 'c\\x\\a.jsonl'],
      ['an empty string', ''],
    ])('leaves %s unchanged', (_case, input) => {
      expect(canonicalFsPath(input, 'win32')).toBe(input);
    });
  });

  describe.each<NodeJS.Platform>(['linux', 'darwin'])('on %s', (platform) => {
    it('returns a POSIX path unchanged', () => {
      expect(canonicalFsPath('/home/x/.claude/projects/p/s.jsonl', platform)).toBe(
        '/home/x/.claude/projects/p/s.jsonl',
      );
    });

    it('never rewrites a path, even one that starts like a lower-case drive letter', () => {
      expect(canonicalFsPath(VSCODE_SPELLING, platform)).toBe(VSCODE_SPELLING);
    });
  });

  // The watcher boundary calls it with one argument, so the platform must be read when it runs, not
  // captured when the module loads.
  describe('default platform', () => {
    it('follows process.platform at call time: win32 upper-cases', () => {
      expect(withPlatform('win32', () => canonicalFsPath(VSCODE_SPELLING))).toBe(SCAN_SPELLING);
    });

    it('follows process.platform at call time: any other platform leaves the path alone', () => {
      expect(withPlatform('linux', () => canonicalFsPath(VSCODE_SPELLING))).toBe(VSCODE_SPELLING);
    });
  });
});

// The transcript roots are built with it, so a root a user spelled with a lower-case drive letter
// (a hand-set CODEX_HOME, say) reaches the scan in the spelling VS Code's `uri.fsPath` will use.
describe('canonicalJoin', () => {
  it('joins like path.join and upper-cases the drive letter of the result on win32', () => {
    const joined = withPlatform('win32', () => canonicalJoin('c:\\Users\\x', '.claude', 'projects'));

    expect(joined).toBe(path.join('C:\\Users\\x', '.claude', 'projects'));
  });

  it('is exactly path.join on any other platform', () => {
    const joined = withPlatform('linux', () => canonicalJoin('c:\\Users\\x', '.claude', 'projects'));

    expect(joined).toBe(path.join('c:\\Users\\x', '.claude', 'projects'));
  });
});
