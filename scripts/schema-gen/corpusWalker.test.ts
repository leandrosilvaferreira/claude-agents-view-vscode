import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { walkCorpus, WalkResult, ParseError } from './corpusWalker';

function writeLines(filePath: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function collectResults(rootDir: string): Promise<WalkResult[]> {
  const results: WalkResult[] = [];
  for await (const result of walkCorpus(rootDir)) {
    results.push(result);
  }
  return results;
}

describe('walkCorpus', () => {
  // A scratch dir under the OS temp dir — never the developer's real ~/.claude/projects
  // corpus (transcript-schema-gen.md, T6 VERIFY).
  let scratchRoot: string;

  beforeEach(() => {
    scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-walker-test-'));
  });

  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('yields a result for every valid line on both sides of a corrupt line, plus exactly one error record, without throwing', async () => {
    writeLines(path.join(scratchRoot, 'flat-file.jsonl'), [
      '{"type":"user","message":{"role":"user","content":"hello"}}',
      '{"type":"assistant","message":{"role":"assistant","content":"hi there"}}',
      '{"type":"summary","summary":"a short summary line"}',
      '', // a blank line carries nothing to observe and must not surface as a ParseError
    ]);
    // Nested under project/session/subagents to also exercise the recursive sweep that
    // picks up sidechain transcripts (transcript-schema-gen.md, T6).
    const sidechainPath = path.join(scratchRoot, 'project-a', 'session-1', 'subagents', 'agent-x.jsonl');
    writeLines(sidechainPath, [
      '{"type":"user","isSidechain":true,"message":{"role":"user","content":"do the thing"}}',
      '{"type":"assistant","message":{"role":"assistant","content":"working on it"', // deliberately truncated JSON
      '{"type":"assistant","message":{"role":"assistant","content":"done"}}',
    ]);

    const results = await collectResults(scratchRoot);
    // A throw inside the walk would reject collectResults and fail this test right here —
    // reaching the assertions below is itself proof the walk never threw.

    expect(results).toHaveLength(6);

    const errors = results.filter((result): result is ParseError => !result.ok);
    expect(errors).toHaveLength(1);
    expect(errors[0].filePath).toBe(sidechainPath);
    expect(errors[0].lineNumber).toBe(2);
    expect(errors[0].message.length).toBeGreaterThan(0);

    const sidechainResults = results.filter((result) => result.filePath === sidechainPath);
    expect(sidechainResults.map((result) => result.lineNumber)).toEqual([1, 2, 3]);
    expect(sidechainResults[0].ok).toBe(true);
    expect(sidechainResults[2].ok).toBe(true);
  });

  it('captures a valid-JSON-but-non-object line (e.g. a bare array) as an error record', async () => {
    writeLines(path.join(scratchRoot, 'non-object.jsonl'), ['[1,2,3]']);

    const results = await collectResults(scratchRoot);

    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.lineNumber).toBe(1);
      expect(first.message.length).toBeGreaterThan(0);
    }
  });

  it('yields nothing and does not throw when rootDir does not exist', async () => {
    const missingRoot = path.join(scratchRoot, 'does-not-exist');

    const results = await collectResults(missingRoot);

    expect(results).toEqual([]);
  });
});
