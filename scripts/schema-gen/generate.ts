import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { walkCorpus } from './corpusWalker';
import { aggregateSchema } from './schemaAggregator';
import {
  loadSchemaObservations,
  mergeSchemaObservations,
  saveSchemaObservations,
  SchemaObservationModel,
} from './schemaModel';
import { generateTsReference } from './generateTsReference';
import { generateFixtures, FixtureBucketResult } from './generateFixtures';
import { diffLogEntry, extractInterfacePropertyNames } from './diffLogEntry';

/**
 * CLI orchestrator (T11, see transcript-schema-gen.md): walk the local transcript corpus
 * (T6) → aggregate this run (T7) → load the committed schema-observations.json and merge
 * this run's result on top, additive (T5) → stamp `generatedAt` (the one place that
 * happens — schemaAggregator's observeLine deliberately leaves it '') → save → render
 * src/generated/transcriptShapes.ts (T9) → regenerate the redacted fixture corpus (T10) →
 * print T17's LogEntry documentation-gap report. Wired to `npm run schema:generate`.
 *
 * Runner: T2 originally tried plain `node`. That hit two problems on this pipeline's real,
 * multi-file shape — neither visible from a trivial single-file check: a
 * MODULE_TYPELESS_PACKAGE_JSON warning on any file using import/export syntax with no
 * package.json "type" field, and (fatal) ERR_MODULE_NOT_FOUND on every extensionless
 * relative import (`from './schemaModel'`, matching this repo's src/ convention) — Node's
 * native loader demands explicit extensions on relative ESM specifiers. Switched to `tsx`,
 * which resolves extensionless specifiers like a normal bundler and hits neither problem
 * (verified: `tsx` runs this pipeline cleanly with no local package.json at all). See
 * package.json's "schema:generate" script.
 *
 * A companion fix proposed alongside the runner change — adding scripts/package.json with
 * `{"type": "module"}`, to silence the warning above at its root — was evaluated and NOT
 * applied. Once the runner is `tsx` (not plain `node`), that warning no longer fires, so the
 * fix has no runtime benefit left; worse, adding it flips `scripts/tsconfig.json`'s
 * `moduleResolution: NodeNext` from CJS-ambient to ESM-ambient for typechecking, which then
 * hard-requires explicit `.js` extensions on every relative import (TS2835) — breaking
 * `tsc -p scripts/tsconfig.json --noEmit` across all of T5-T10/T17's already-tested files
 * (verified: clean baseline without it, ~20 TS2835 + cascade errors with it). No
 * scripts/package.json exists on disk; don't re-add one without re-checking both of these
 * together.
 */

// `__dirname`, not `import.meta.url`: with no scripts/package.json, this file typechecks as
// CommonJS output (see the header comment above), and `import.meta` is a TS1470 error under
// that classification. `tsx` polyfills `__dirname`/`__filename` at runtime regardless
// (verified), so this works under both the typechecker's and the runtime's view of the file.
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const LOG_ENTRY_INTERFACE_NAME = 'LogEntry';

const DEFAULT_CORPUS_ROOT = path.join(os.homedir(), '.claude', 'projects');
const DEFAULT_OBSERVATIONS_PATH = path.join(SCRIPT_DIR, 'schema-observations.json');
const DEFAULT_TS_REFERENCE_PATH = path.join(REPO_ROOT, 'src', 'generated', 'transcriptShapes.ts');
const DEFAULT_FIXTURES_DIR = path.join(REPO_ROOT, 'src', 'test', 'fixtures', 'schema-corpus');
const DEFAULT_LOG_ENTRY_SOURCE_PATH = path.join(REPO_ROOT, 'src', 'transcriptEntry.ts');

/** Every path this run touches, each independently overridable — tests point every one of
 * these at a scratch directory so they never read/write the developer's real corpus or the
 * repo's committed artifacts (see generate.test.ts). */
export interface GenerateOptions {
  corpusRoot?: string;
  observationsPath?: string;
  tsReferencePath?: string;
  fixturesDir?: string;
  logEntrySourcePath?: string;
}

export interface GenerateSummary {
  model: SchemaObservationModel;
  parseErrorCount: number;
  tsReference: string;
  fixtures: FixtureBucketResult[];
  undocumentedFields: string[];
}

interface ResolvedOptions {
  corpusRoot: string;
  observationsPath: string;
  tsReferencePath: string;
  fixturesDir: string;
  logEntrySourcePath: string;
}

function resolveOptions(options: GenerateOptions): ResolvedOptions {
  return {
    corpusRoot: options.corpusRoot ?? DEFAULT_CORPUS_ROOT,
    observationsPath: options.observationsPath ?? DEFAULT_OBSERVATIONS_PATH,
    tsReferencePath: options.tsReferencePath ?? DEFAULT_TS_REFERENCE_PATH,
    fixturesDir: options.fixturesDir ?? DEFAULT_FIXTURES_DIR,
    logEntrySourcePath: options.logEntrySourcePath ?? DEFAULT_LOG_ENTRY_SOURCE_PATH,
  };
}

/** Formats `rawContents` with this repo's own .prettierrc (resolved relative to `filePath`,
 * same as `npm run format`/the `prettier/prettier` lint rule would) and writes the result to
 * disk. T9's generateTsReference() renders a raw string only — this is the one place the
 * pipeline actually touches disk for it, so formatting belongs here rather than inside a
 * generator the plan explicitly keeps pure. Dynamic `import('prettier')`: this file
 * typechecks as CommonJS output (see the header comment above), and prettier v3 ships
 * ESM-only with no CJS entry point — a static import would fail to resolve under that
 * classification, but a dynamic import is valid regardless of module format. Returns the
 * formatted content so the caller can report exactly what landed on disk. */
async function writeTsReference(filePath: string, rawContents: string): Promise<string> {
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(filePath)) ?? {};
  const formatted = await prettier.format(rawContents, { ...options, filepath: filePath });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, formatted, 'utf8');
  return formatted;
}

/** Prints the run's final report section: the parse-error summary, then T17's LogEntry
 * documentation-gap report — always, even when there is nothing to report (per the plan's
 * own T11 spec). */
function printReport(parseErrorCount: number, undocumentedFields: string[]): void {
  console.log(`\nParsed corpus with ${parseErrorCount} parse error(s).`);
  console.log('\n=== LogEntry documentation-gap report (T17) ===');
  if (undocumentedFields.length === 0) {
    console.log('No undocumented top-level fields observed — LogEntry already covers everything seen.');
    return;
  }
  for (const field of undocumentedFields) {
    console.log(`  - ${field}`);
  }
}

/**
 * Runs the full pipeline once and returns its result. The CLI entry point below calls this
 * with every default; generate.test.ts calls it with every path pointed at a scratch
 * directory instead, so the two never interfere with each other or with the real corpus.
 */
export async function generateSchema(options: GenerateOptions = {}): Promise<GenerateSummary> {
  const resolved = resolveOptions(options);

  const { model: runModel, parseErrors } = await aggregateSchema(walkCorpus(resolved.corpusRoot));
  const existing = loadSchemaObservations(resolved.observationsPath);
  const merged = mergeSchemaObservations(existing, runModel);
  const stamped: SchemaObservationModel = { ...merged, generatedAt: new Date().toISOString() };
  saveSchemaObservations(resolved.observationsPath, stamped);

  const tsReference = await writeTsReference(resolved.tsReferencePath, generateTsReference(stamped));

  const fixtures = await generateFixtures(resolved.corpusRoot, resolved.fixturesDir);

  const knownPropertyNames = extractInterfacePropertyNames(resolved.logEntrySourcePath, LOG_ENTRY_INTERFACE_NAME);
  const undocumentedFields = diffLogEntry(stamped, knownPropertyNames);

  console.log(`Scanned corpus: ${resolved.corpusRoot}`);
  console.log(`Wrote observations: ${resolved.observationsPath}`);
  console.log(`Wrote TS reference: ${resolved.tsReferencePath} (${tsReference.length} bytes)`);
  console.log(`Wrote ${fixtures.length} fixture file(s) to ${resolved.fixturesDir}`);
  printReport(parseErrors.length, undocumentedFields);

  return { model: stamped, parseErrorCount: parseErrors.length, tsReference, fixtures, undocumentedFields };
}

/** True only when this module was executed directly (`tsx scripts/schema-gen/generate.ts`),
 * never when it's merely imported — e.g. by generate.test.ts for `generateSchema` above. */
function isMainModule(): boolean {
  return path.resolve(process.argv[1]) === __filename;
}

if (isMainModule()) {
  generateSchema().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
