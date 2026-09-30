import { afterAll, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ESLint } from 'eslint';

// The architectural lint rules all share one failure mode: when their module resolution
// is misconfigured they report nothing at all, which is indistinguishable from a clean
// codebase. `import-x/no-cycle` sat in this config for releases doing exactly that —
// import-x cannot parse `.ts` without `import-x/extensions` + `import-x/parsers`, so its
// import graph was empty and every cycle passed. These probes feed each rule a
// deliberate violation and assert it still fires.

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO_ROOT, 'src');

const eslint = new ESLint({ cwd: REPO_ROOT });

/** Rule ids reported for `code` linted as if it were the file at `filePath`. */
async function ruleIdsFor(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath, warnIgnored: false });
  return result.messages.map((message) => message.ruleId).filter((id): id is string => id !== null);
}

describe('architectural lint rules', () => {
  it('stops the parsing core from importing the vscode package', async () => {
    const ruleIds = await ruleIdsFor(
      `import * as vscode from 'vscode';\nexport const probe: unknown = vscode;\n`,
      path.join(SRC, 'logger.ts'),
    );

    expect(ruleIds).toContain('boundaries/dependencies');
  }, 30000);

  it('stops the parsing core from importing the VS Code layer', async () => {
    const ruleIds = await ruleIdsFor(
      `import { SessionTreeItem } from './treeItems';\nexport const probe: unknown = SessionTreeItem;\n`,
      path.join(SRC, 'logger.ts'),
    );

    expect(ruleIds).toContain('boundaries/dependencies');
  });

  it('lets the VS Code layer import the parsing core', async () => {
    const ruleIds = await ruleIdsFor(
      `import { logDebug } from './logger';\nexport const probe: unknown = logDebug;\n`,
      path.join(SRC, 'treeItems.ts'),
    );

    expect(ruleIds).not.toContain('boundaries/dependencies');
  });

  it('stops production code from importing test code', async () => {
    const ruleIds = await ruleIdsFor(`import './test/sessionScanner.test';\n`, path.join(SRC, 'logger.ts'));

    expect(ruleIds).toContain('import-x/no-restricted-paths');
  });

  it('rejects absolute import paths, which resolve only on one machine', async () => {
    const ruleIds = await ruleIdsFor(`import '/abs/checkout/src/logger';\n`, path.join(SRC, 'treeItems.ts'));

    expect(ruleIds).toContain('import-x/no-absolute-path');
  });

  // The two spellings are separate module specifiers, so each needs its own probe: banning only
  // `child_process` would leave `node:child_process` wide open.
  it('bans spawning external processes through child_process', async () => {
    const ruleIds = await ruleIdsFor(
      `import { execFile } from 'child_process';\nexport const probe: unknown = execFile;\n`,
      path.join(SRC, 'logger.ts'),
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('bans spawning external processes through node:child_process', async () => {
    const ruleIds = await ruleIdsFor(
      `import { execFile } from 'node:child_process';\nexport const probe: unknown = execFile;\n`,
      path.join(SRC, 'logger.ts'),
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  // no-restricted-imports sees static imports only. A dynamic import() is caught by a syntax selector
  // instead, and every one is refused: `import(name)` has no specifier to match against.
  it.each([
    ['a literal child_process', `import('child_process')`],
    ['a literal node:child_process', `import('node:child_process')`],
    ['a computed specifier', `import(name)`],
  ])('bans a dynamic import() of %s', async (_label, expression) => {
    const ruleIds = await ruleIdsFor(
      `export const probe = async (name: string): Promise<unknown> => ${expression};\n`,
      path.join(SRC, 'logger.ts'),
    );

    expect(ruleIds).toContain('no-restricted-syntax');
  });

  // The other two routes around the child_process ban: createRequire (from `module`) can load it
  // without an import statement, and `cluster` forks processes of its own. Each spelling is its own
  // module specifier, like child_process above.
  it.each(['module', 'node:module', 'cluster', 'node:cluster'])(
    'bans importing %s, a route around the child_process ban',
    async (specifier) => {
      const ruleIds = await ruleIdsFor(
        `import * as probe from '${specifier}';\nexport const reexported: unknown = probe;\n`,
        path.join(SRC, 'logger.ts'),
      );

      expect(ruleIds).toContain('no-restricted-syntax');
    },
  );

  // `import('./x').Type` names a type and loads nothing at runtime, so it is a different AST node than
  // the dynamic import() expression and must keep passing (src/extension.ts uses it).
  it('still allows a type-position import("./x") reference', async () => {
    const ruleIds = await ruleIdsFor(`export type Probe = import('./types').Session;\n`, path.join(SRC, 'logger.ts'));

    expect(ruleIds).not.toContain('no-restricted-syntax');
  });
}, 30000);

describe('import cycle detection', () => {
  // A cycle only exists between files that are really on disk — the resolver reads the
  // second half of the pair from the filesystem, so this pair can't be virtual.
  const cycleFiles = [path.join(SRC, 'zzLintProbeA.ts'), path.join(SRC, 'zzLintProbeB.ts')];

  afterAll(() => {
    for (const file of cycleFiles) {
      fs.rmSync(file, { force: true });
    }
  });

  it('detects a dependency cycle', async () => {
    fs.writeFileSync(cycleFiles[0], `import { b } from './zzLintProbeB';\nexport const a: unknown = b;\n`);
    fs.writeFileSync(cycleFiles[1], `import { a } from './zzLintProbeA';\nexport const b: unknown = a;\n`);

    const [result] = await eslint.lintFiles([cycleFiles[0]]);
    const ruleIds = result.messages.map((message) => message.ruleId);

    expect(ruleIds).toContain('import-x/no-cycle');
  });
}, 30000);
