import * as fs from 'fs';
import * as path from 'path';
import { walkCorpus } from './corpusWalker';
import { redact } from './redact';

/**
 * Builds the redacted fixture corpus under `src/test/fixtures/schema-corpus/` (see
 * transcript-schema-gen.md, T10): one `.jsonl` file per observed `(type[:subtype])` bucket,
 * holding up to MAX_SAMPLES_PER_BUCKET raw sample lines, each run through redact() before
 * being written to disk.
 *
 * Does its own independent walkCorpus() pass rather than consuming T7's aggregated
 * SchemaObservationModel: that model retains only statistics (field names, type unions,
 * presence counts), never the raw sample lines a fixture file needs to hold. The bucketing
 * rule below is intentionally copied from schemaAggregator.ts's own typeBucketKey, not
 * imported — scripts/schema-gen files stay small and independently testable, mirroring why
 * schemaModel.ts keeps its own local compareVersions instead of reaching elsewhere.
 */

/** Mirrors the plan's own decision (transcript-schema-gen.md, Decisions #3): up to 3 raw
 * sample lines per bucket, fewer if the corpus has fewer. Arbitrary but reasonable. */
const MAX_SAMPLES_PER_BUCKET = 3;

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** `type` alone, or `type:subtype` when `subtype` is also a non-empty string — `undefined`
 * when the line has no usable `type` at all, meaning it is out of scope for a fixture. Must
 * stay identical to schemaAggregator.ts's own typeBucketKey. */
function typeBucketKey(value: Record<string, unknown>): string | undefined {
  const type = nonEmptyString(value.type);
  if (type === undefined) {
    return undefined;
  }
  const subtype = nonEmptyString(value.subtype);
  return subtype === undefined ? type : `${type}:${subtype}`;
}

// ponytail: swaps every ':' for '-', so a pathological `type`/`subtype` value that already
// contains a literal '-' at the exact same position as another bucket's ':' could in theory
// collide on disk. Real Claude Code type/subtype values are short closed-vocabulary
// identifiers (user, assistant, system, hook_summary, ...), so this never happens in
// practice — upgrade to a hash suffix if a real corpus ever proves otherwise.
function bucketFileName(bucketKey: string): string {
  return `${bucketKey.replace(/:/g, '-')}.jsonl`;
}

export interface FixtureBucketResult {
  bucketKey: string;
  filePath: string;
  sampleCount: number;
}

/**
 * Walks `corpusRoot` (see corpusWalker.ts), groups successfully parsed lines by
 * `typeBucketKey`, keeps up to MAX_SAMPLES_PER_BUCKET raw lines per bucket in encounter
 * order, redacts each one (redact.ts), and writes one compact-JSON-per-line `.jsonl` file
 * per bucket into `outputDir`. Lines with no usable `type` are skipped, and so are parse
 * errors from the walk — this generator only cares about lines it can actually turn into a
 * fixture sample.
 */
export async function generateFixtures(corpusRoot: string, outputDir: string): Promise<FixtureBucketResult[]> {
  const samplesByBucket = new Map<string, Record<string, unknown>[]>();

  for await (const result of walkCorpus(corpusRoot)) {
    if (!result.ok) {
      continue;
    }
    const bucketKey = typeBucketKey(result.value);
    if (bucketKey === undefined) {
      continue;
    }
    const samples = samplesByBucket.get(bucketKey) ?? [];
    if (samples.length >= MAX_SAMPLES_PER_BUCKET) {
      continue;
    }
    samples.push(result.value);
    samplesByBucket.set(bucketKey, samples);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const results: FixtureBucketResult[] = [];
  for (const [bucketKey, samples] of samplesByBucket) {
    const filePath = path.join(outputDir, bucketFileName(bucketKey));
    const lines = samples.map((sample) => JSON.stringify(redact(sample)));
    fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
    results.push({ bucketKey, filePath, sampleCount: samples.length });
  }

  return results;
}
