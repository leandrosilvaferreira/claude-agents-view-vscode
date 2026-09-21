import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateSchema } from './generate';

function writeLines(filePath: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

const SESSION_FILE = 'session.jsonl';

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
    writeLines(path.join(corpusRoot, SESSION_FILE), [
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
    writeLines(path.join(corpusRoot, SESSION_FILE), ['{"type":"user","version":"2.1.210","message":"first run"}']);
    await generateSchema({ corpusRoot, observationsPath, tsReferencePath, fixturesDir });

    const secondCorpusRoot = path.join(scratchRoot, 'corpus-2');
    writeLines(path.join(secondCorpusRoot, SESSION_FILE), [
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

  it('reports a start line, phase lines per artifact, and a final line through the progress sink', async () => {
    writeLines(path.join(corpusRoot, 'progress-session.jsonl'), ['{"type":"user","version":"2.1.210","message":"hi"}']);

    const lines: string[] = [];
    await generateSchema({
      corpusRoot,
      observationsPath,
      tsReferencePath,
      fixturesDir,
      progress: { onLine: (line) => lines.push(line) },
    });

    // Start line: announced once, before any file is read, naming the corpus root.
    expect(lines[0]).toContain('scanning corpus');
    expect(lines[0]).toContain(corpusRoot);
    // The walk's forced final line, and a phase line per artifact this run writes — present
    // regardless of throttling timing, since none of these go through the throttle window.
    expect(lines.some((line) => line.includes('done:'))).toBe(true);
    expect(lines.some((line) => line.includes('writing observations'))).toBe(true);
    expect(lines.some((line) => line.includes('writing TS reference'))).toBe(true);
    expect(lines.some((line) => line.includes('writing fixtures'))).toBe(true);
  });
});

// Sibling top-level describe (not nested in the one above) so its line count doesn't push that
// describe past this repo's max-lines-per-function limit — same reasoning as the sibling
// describes in schemaAggregator.test.ts/keySafety.test.ts/redact.test.ts. Its own scratch-dir
// setup mirrors the main describe's above.
describe('generateSchema — re-sanitizes a leaked baseline before merging (sanitizeBaseline.ts)', () => {
  let scratchRoot: string;
  let corpusRoot: string;
  let observationsPath: string;
  let tsReferencePath: string;
  let fixturesDir: string;

  beforeEach(() => {
    scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-generate-sanitize-test-'));
    corpusRoot = path.join(scratchRoot, 'corpus');
    observationsPath = path.join(scratchRoot, 'schema-observations.json');
    tsReferencePath = path.join(scratchRoot, 'generated', 'transcriptShapes.ts');
    fixturesDir = path.join(scratchRoot, 'fixtures', 'schema-corpus');
  });

  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it('re-sanitizes a leaked literal path already committed in schema-observations.json instead of carrying it forward forever', async () => {
    // Simulates a baseline committed before `structuredContent` was added to
    // KNOWN_DYNAMIC_KEY_CONTAINERS: a literal third-party MCP field name sitting right in the
    // committed file. mergeSchemaObservations alone would just add a new run's facts on top of
    // this forever — sanitizeBaseline must clean it up before that merge happens.
    const leakedBaseline = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      cliVersionsObserved: ['2.1.200'],
      types: {
        user: {
          sampleCount: 1,
          firstSeenVersion: '2.1.200',
          lastSeenVersion: '2.1.200',
          fields: {
            'mcpMeta.structuredContent.issueTitle': {
              types: ['string'],
              presentCount: 1,
              firstSeenVersion: '2.1.200',
              lastSeenVersion: '2.1.200',
            },
          },
        },
      },
      unknownTypes: {},
    };
    fs.mkdirSync(path.dirname(observationsPath), { recursive: true });
    fs.writeFileSync(observationsPath, JSON.stringify(leakedBaseline), 'utf8');
    writeLines(path.join(corpusRoot, SESSION_FILE), ['{"type":"user","version":"2.1.220","message":"hi"}']);

    const result = await generateSchema({ corpusRoot, observationsPath, tsReferencePath, fixturesDir });

    const fields = result.model.types.user.fields;
    expect(fields['mcpMeta.structuredContent.[dynamic-key]']).toBeDefined();
    expect(fields['mcpMeta.structuredContent.issueTitle']).toBeUndefined();
    const onDisk: unknown = JSON.parse(fs.readFileSync(observationsPath, 'utf8'));
    expect(JSON.stringify(onDisk)).not.toContain('issueTitle');
  });
});
