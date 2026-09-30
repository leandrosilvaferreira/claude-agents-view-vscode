import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const state = vi.hoisted(() => ({
  home: '',
  // The base directory of every RelativePattern the watchers were built with: what VS Code is told to watch.
  watchedBases: [] as string[],
}));

vi.mock('os', async (importOriginal) => ({
  ...(await importOriginal<typeof os>()),
  homedir: () => state.home,
}));

// The debug log is a disk append (an external boundary): mocking it keeps the run off the disk.
vi.mock('../logger', () => ({ logDebug: vi.fn() }));

vi.mock('vscode', () => ({
  EventEmitter: class {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  },
  TreeItem: class {
    constructor(public label: string) {}
  },
  ThemeIcon: class {
    readonly testMock = true;
  },
  ThemeColor: class {
    readonly testMock = true;
  },
  RelativePattern: class {
    readonly testMock = true;
    constructor(base: string) {
      state.watchedBases.push(base);
    }
  },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  TreeItemCollapsibleState: { None: 0, Expanded: 2 },
  workspace: {
    workspaceFolders: [],
    createFileSystemWatcher: () => ({
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    }),
  },
}));

import { SessionTreeDataProvider } from '../sessionTreeDataProvider';

// Placeholder spellings: nothing here has to exist on disk, so the suite reads the same on every OS.
const LOWER_CASE_HOME = 'c:\\Users\\roots-fixture-user';
const UPPER_CASE_HOME = 'C:\\Users\\roots-fixture-user';
const LOWER_CASE_CODEX_HOME = 'd:\\roots-fixture\\codex-home';
const UPPER_CASE_CODEX_HOME = 'D:\\roots-fixture\\codex-home';

// The provider resolves its three transcript roots once, when it is constructed. The scan builds every
// path it returns from them, while the watchers report VS Code's `uri.fsPath` (always a lower-case
// drive letter on Windows, see fsPath.ts). The roots therefore have to spell the drive one way whatever
// the user's home directory or CODEX_HOME says, or one transcript ends up tracked under two keys.
describe('SessionTreeDataProvider transcript roots', () => {
  let tmp: string;
  let provider: SessionTreeDataProvider | undefined;
  let lines: string[];

  beforeEach(() => {
    // Fake timers first: activation arms the poll tick.
    vi.useFakeTimers();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'roots-provider-'));
    // Only `tmp` is ever deleted: a test may point the home directory at a placeholder drive path.
    state.home = tmp;
    state.watchedBases = [];
    lines = [];
    // The provider resolves CODEX_HOME when it is constructed: pin it, so one exported in the
    // developer's shell never makes the provider scan their real rollouts.
    vi.stubEnv('CODEX_HOME', path.join(tmp, '.codex'));
  });

  afterEach(() => {
    provider?.dispose();
    provider = undefined;
    vi.useRealTimers();
    vi.unstubAllEnvs();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  /**
   * Builds and activates the provider while `process.platform` reads `platform`, then puts the real
   * value back — before any assertion or cleanup, so nothing else ever runs against the fake one. The
   * drive letter is only rewritten on win32, and where the provider does that (construction or
   * activation) is its own business: both happen inside this window.
   */
  async function activateAs(platform: NodeJS.Platform): Promise<void> {
    const original = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { ...original, value: platform });
    try {
      provider = new SessionTreeDataProvider({
        diagnostics: (line) => {
          lines.push(line);
        },
      });
      await provider.activateMonitoring();
    } finally {
      if (original) Object.defineProperty(process, 'platform', original);
    }
  }

  it('registers the Codex watcher under an upper-case drive letter when CODEX_HOME spells it in lower case', async () => {
    vi.stubEnv('CODEX_HOME', LOWER_CASE_CODEX_HOME);

    await activateAs('win32');

    // The Claude and Antigravity roots do not exist under the fake home, so only the Codex watcher (the
    // one registered whether or not its root exists) was asked for.
    expect(state.watchedBases).toEqual([path.join(UPPER_CASE_CODEX_HOME, 'sessions')]);
  });

  it('names the Claude and Antigravity roots with an upper-case drive letter when the home directory spells it in lower case', async () => {
    state.home = LOWER_CASE_HOME;

    await activateAs('win32');

    // The activation report names every root, watched or not: the only way to see the two home-derived
    // ones, since a watcher is registered for them only once the directory exists.
    expect(lines).toContainEqual(expect.stringContaining(path.join(UPPER_CASE_HOME, '.claude', 'projects')));
    expect(lines).toContainEqual(
      expect.stringContaining(path.join(UPPER_CASE_HOME, '.gemini', 'antigravity-ide', 'brain')),
    );
  });

  it.each<NodeJS.Platform>(['linux', 'darwin'])('leaves the roots as configured on %s', async (platform) => {
    vi.stubEnv('CODEX_HOME', LOWER_CASE_CODEX_HOME);

    await activateAs(platform);

    expect(state.watchedBases).toEqual([path.join(LOWER_CASE_CODEX_HOME, 'sessions')]);
  });
});
