import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { walkCorpus, WalkResult, ParseError, WalkProgress } from './corpusWalker';

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

  it('reports the file total up front, then running counts per line and per completed file', async () => {
    writeLines(path.join(scratchRoot, 'a.jsonl'), ['{"type":"user"}', '{"type":"assistant"}']);
    writeLines(path.join(scratchRoot, 'b.jsonl'), ['not json']);

    const snapshots: WalkProgress[] = [];
    let resultCount = 0;
    for await (const _result of walkCorpus(scratchRoot, (progress) => snapshots.push(progress))) {
      resultCount += 1; // draining the generator is what drives onProgress
    }
    expect(resultCount).toBe(3);

    // Fired before any file is opened: the total is already known from the directory listing.
    expect(snapshots[0]).toEqual({ filesTotal: 2, filesProcessed: 0, entriesProcessed: 0, parseErrorCount: 0 });

    const last = snapshots[snapshots.length - 1];
    expect(last).toEqual({ filesTotal: 2, filesProcessed: 2, entriesProcessed: 3, parseErrorCount: 1 });
  });
});

// Sibling top-level describe (not nested above) so its line count doesn't push that describe past
// this repo's max-lines-per-function limit — the walk's line splitting and journal skipping.
describe('walkCorpus — line splitting and Workflow journals', () => {
  let scratchRoot: string;

  beforeEach(() => {
    scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-walker-split-test-'));
  });

  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('does not split a record on a raw U+2028/U+2029 inside a JSON string — valid JSON, but readline treats them as line breaks', async () => {
    // JSON.stringify leaves U+2028/U+2029 unescaped (valid since ES2019) and Claude Code writes
    // them raw inside tool output: real corpus, 125 records over 15 files that a readline-based
    // walk cut in two, reporting both halves as parse errors.
    const record = JSON.stringify({ type: 'user', message: { content: 'before\u2028middle\u2029after' } });
    writeLines(path.join(scratchRoot, 'separators.jsonl'), [record, '{"type":"assistant"}']);

    const results = await collectResults(scratchRoot);

    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(results.map((result) => result.lineNumber)).toEqual([1, 2]);
  });

  it('reassembles records that straddle the stream chunk boundary, multibyte characters included', async () => {
    // createReadStream hands over 64 KiB chunks. Record b is ~200 KB of 4-byte emoji — longer than
    // a whole chunk, so one chunk holds no newline at all — and a and c put chunk boundaries at
    // arbitrary byte offsets, some of them inside a character.
    const text = (count: number): string => '😀'.repeat(count);
    const records = [
      { type: 'user', id: 'a', text: text(10_000) },
      { type: 'user', id: 'b', text: text(50_000) },
      { type: 'user', id: 'c', text: text(10_000) },
    ].map((record) => JSON.stringify(record));
    fs.writeFileSync(path.join(scratchRoot, 'straddle.jsonl'), `${records.join('\n')}\n`, 'utf8');

    const results = await collectResults(scratchRoot);

    expect(results.map((result) => result.ok)).toEqual([true, true, true]);
    const ids = results.map((result) => (result.ok ? result.value.id : undefined));
    expect(ids).toEqual(['a', 'b', 'c']);
    const longest = results[1].ok ? String(results[1].value.text) : '';
    expect(longest).toHaveLength(100_000); // 50,000 emoji = 2 UTF-16 units each: none split or lost at a boundary
  });

  it('observes a final record that has no trailing newline, numbered after the last terminated line', async () => {
    fs.writeFileSync(path.join(scratchRoot, 'unterminated.jsonl'), '{"type":"user"}\n{"type":"assistant"}', 'utf8');

    const results = await collectResults(scratchRoot);

    expect(results.map((result) => result.ok)).toEqual([true, true]);
    expect(results.map((result) => result.lineNumber)).toEqual([1, 2]);
  });

  it("skips a Workflow run journal — free-form agent output, not a transcript — but still walks that run's agent transcripts", async () => {
    // A journal's `result` is an arbitrary JSON object the workflow's own agents produced, so its
    // field names are project vocabulary that must never reach a committed artifact.
    const workflowDir = path.join(scratchRoot, 'project-a', 'session-1', 'subagents', 'workflows', 'wf_1');
    writeLines(path.join(workflowDir, 'journal.jsonl'), [
      '{"type":"result","key":"k","agentId":"a","result":{"someProjectSpecificField":true}}',
    ]);
    writeLines(path.join(workflowDir, 'agent-x.jsonl'), ['{"type":"user","isSidechain":true}']);
    writeLines(path.join(scratchRoot, 'project-a', 'journal.jsonl'), ['{"type":"user"}']); // outside a workflows/ run: kept

    const results = await collectResults(scratchRoot);

    expect(results.map((result) => path.relative(scratchRoot, result.filePath)).sort()).toEqual([
      path.join('project-a', 'journal.jsonl'),
      path.join('project-a', 'session-1', 'subagents', 'workflows', 'wf_1', 'agent-x.jsonl'),
    ]);
  });
});
