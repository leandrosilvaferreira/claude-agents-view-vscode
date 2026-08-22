import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateSchema } from './generate';

function writeLines(filePath: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

describe('generateSchema (T11 CLI orchestrator)', () => {
  // A scratch dir under the OS temp dir — never the developer's real ~/.claude/projects
  // corpus, and never the repo's committed schema-observations.json/transcriptShapes.ts/
  // fixtures (transcript-schema-gen.md, T11 VERIFY item 1). logEntrySourcePath is left at
  // its default (the real src/transcriptEntry.ts) since that's read-only reference data,
  // not corpus-scoped output.
  let scratchRoot: string;
  let corpusRoot: string;
  let observationsPath: string;
  let tsReferencePath: string;
  let fixturesDir: string;

  beforeEach(() => {
    scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-generate-test-'));
    corpusRoot = path.join(scratchRoot, 'corpus');
    observationsPath = path.join(scratchRoot, 'schema-observations.json');
    tsReferencePath = path.join(scratchRoot, 'generated', 'transcriptShapes.ts');
    fixturesDir = path.join(scratchRoot, 'fixtures', 'schema-corpus');
  });

  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('runs the full pipeline against a scratch corpus without throwing, and writes every artifact', async () => {
    writeLines(path.join(corpusRoot, 'session.jsonl'), [
      '{"type":"user","version":"2.1.210","message":{"role":"user","content":"hello there"},"zzTestOnlyUnknownField":"a"}',
      '{"type":"user","version":"2.1.210","message":{"role":"user","content":"another one"},"zzTestOnlyUnknownField":"b"}',
      '{"type":"assistant","version":"2.1.210","message":{"role":"assistant","content":"hi"}}',
    ]);

    const result = await generateSchema({ corpusRoot, observationsPath, tsReferencePath, fixturesDir });
    // A throw inside the pipeline would reject this call and fail the test right here —
    // reaching the assertions below is itself proof the run never threw.

    expect(result.parseErrorCount).toBe(0);

    // schema-observations.json-shaped object, both as returned and as written to disk.
    expect(result.model.generatedAt.length).toBeGreaterThan(0);
    expect(result.model.types.user.sampleCount).toBe(2);
    expect(result.model.types.assistant.sampleCount).toBe(1);
    const onDisk: unknown = JSON.parse(fs.readFileSync(observationsPath, 'utf8'));
    expect(onDisk).toEqual(result.model);

    // Non-empty TS reference string, also written to disk.
    expect(result.tsReference).toContain('AUTO-GENERATED');
    expect(result.tsReference.length).toBeGreaterThan(0);
    expect(fs.readFileSync(tsReferencePath, 'utf8')).toBe(result.tsReference);

    // Fixture files, actually written to disk.
    expect(result.fixtures.length).toBeGreaterThan(0);
    for (const fixture of result.fixtures) {
      expect(fs.existsSync(fixture.filePath)).toBe(true);
    }

    // T17's gap report found the deliberately-unknown synthetic field (sample count 2 meets
    // its own MIN_SAMPLE_COUNT threshold), proving the diff step is wired end-to-end.
    expect(result.undocumentedFields).toContain('zzTestOnlyUnknownField');
  });

  it('loads the existing schema-observations.json and merges a second run on top, additively', async () => {
    writeLines(path.join(corpusRoot, 'session.jsonl'), ['{"type":"user","version":"2.1.210","message":"first run"}']);
    await generateSchema({ corpusRoot, observationsPath, tsReferencePath, fixturesDir });

    const secondCorpusRoot = path.join(scratchRoot, 'corpus-2');
    writeLines(path.join(secondCorpusRoot, 'session.jsonl'), [
      '{"type":"summary","version":"2.1.218","summary":"second run"}',
    ]);
    const second = await generateSchema({
      corpusRoot: secondCorpusRoot,
      observationsPath,
      tsReferencePath,
      fixturesDir,
    });

    // Both runs' buckets survive in the merged, committed model — nothing the first run
    // recorded was lost by the second (transcript-schema-gen.md, Success Criterion 3).
    expect(second.model.types.user.sampleCount).toBe(1);
    expect(second.model.types.summary.sampleCount).toBe(1);
    expect(second.model.cliVersionsObserved).toEqual(['2.1.210', '2.1.218']);
  });
});
