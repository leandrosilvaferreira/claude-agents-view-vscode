import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateFixtures } from './generateFixtures';

const CORPUS_FILE = 'session.jsonl';

function writeLines(filePath: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function readFixtureLines(filePath: string): string[] {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '');
}

describe('generateFixtures', () => {
  // Real files on disk, via walkCorpus's own file-reading (never mocked) — transcript-schema-gen.md,
  // T10 VERIFY.
  let scratchRoot: string;
  let corpusRoot: string;
  let outputDir: string;

  beforeEach(() => {
    scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'generate-fixtures-test-'));
    corpusRoot = path.join(scratchRoot, 'corpus');
    outputDir = path.join(scratchRoot, 'out');
  });

  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('writes exactly 3 sample lines, in encounter order, when the corpus has 5 lines of the same type', async () => {
    writeLines(path.join(corpusRoot, CORPUS_FILE), [
      '{"type":"user","seq":1}',
      '{"type":"user","seq":2}',
      '{"type":"user","seq":3}',
      '{"type":"user","seq":4}',
      '{"type":"user","seq":5}',
    ]);

    const results = await generateFixtures(corpusRoot, outputDir);

    expect(results).toHaveLength(1);
    expect(results[0].bucketKey).toBe('user');
    expect(results[0].sampleCount).toBe(3);

    const lines = readFixtureLines(results[0].filePath);
    expect(lines).toHaveLength(3);
    // Numbers are never redacted (redact.ts only replaces string leaves), so `seq` is a
    // trustworthy witness that the first 3 lines were kept, not an arbitrary 3.
    expect(lines[0]).toContain('"seq":1');
    expect(lines[1]).toContain('"seq":2');
    expect(lines[2]).toContain('"seq":3');
  });

  it('redacts every written line — a fake absolute path and prompt text never appear raw in the output', async () => {
    writeLines(path.join(corpusRoot, CORPUS_FILE), [
      '{"type":"user","cwd":"/Users/janedoe/Projects/acme-app","message":{"content":"rotate the prod database credentials"}}',
    ]);

    await generateFixtures(corpusRoot, outputDir);

    const raw = fs.readFileSync(path.join(outputDir, 'user.jsonl'), 'utf8');

    expect(raw).not.toContain('/Users/janedoe');
    expect(raw).not.toContain('rotate the prod database credentials');
    expect(raw).toMatch(/Sample text \d+/);
  });

  it('writes fewer than 3 lines when the bucket has fewer', async () => {
    writeLines(path.join(corpusRoot, CORPUS_FILE), ['{"type":"summary","summary":"only one line here"}']);

    const results = await generateFixtures(corpusRoot, outputDir);

    expect(results).toHaveLength(1);
    expect(results[0].sampleCount).toBe(1);
    expect(readFixtureLines(results[0].filePath)).toHaveLength(1);
  });

  it('separates type-only and type:subtype lines into different bucket files', async () => {
    writeLines(path.join(corpusRoot, CORPUS_FILE), [
      '{"type":"system","message":"plain system line"}',
      '{"type":"system","subtype":"hook_summary","message":"hook hook_summary line"}',
    ]);

    const results = await generateFixtures(corpusRoot, outputDir);

    const bucketKeys = results.map((entry) => entry.bucketKey).sort();
    expect(bucketKeys).toEqual(['system', 'system:hook_summary']);

    // ':' is not a safe filename character on every filesystem, so the on-disk name swaps it.
    const subtypeEntry = results.find((entry) => entry.bucketKey === 'system:hook_summary');
    expect(subtypeEntry?.filePath).toBe(path.join(outputDir, 'system-hook_summary.jsonl'));
  });

  it('skips lines with no usable type', async () => {
    writeLines(path.join(corpusRoot, CORPUS_FILE), ['{"noType":true}', '{"type":"","message":"empty type string"}']);

    const results = await generateFixtures(corpusRoot, outputDir);

    expect(results).toEqual([]);
  });
});
