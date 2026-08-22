import * as fs from 'fs';
import * as ts from 'typescript';
import { SchemaObservationModel } from './schemaModel';

/**
 * Flags transcript fields the schema generator has actually observed on disk that
 * `LogEntry` (src/transcriptEntry.ts) doesn't yet declare — a documentation-gap report a
 * human folds into `LogEntry` by hand (see transcript-schema-gen.md, T17). Read-only: this
 * module never writes to `transcriptEntry.ts`. It reads that file as text/AST via the
 * TypeScript Compiler API (`extractInterfacePropertyNames` below) instead of importing
 * `LogEntry` as a type — `scripts/` deliberately sits outside the root `tsconfig.json`'s
 * `include` (`src/**\/*` only), so a cross-project type import isn't an option; AST parsing
 * of one file is (same reasoning T8 already applies to this same source file).
 */

/**
 * A field must be observed in at least this many samples — summed across every bucket it
 * appears in — before it's worth a human's attention. Filters one-off noise: a single
 * malformed or highly unusual line shouldn't put a field on the report. 2 is the smallest
 * value that filters anything at all; raise it if a real corpus run still turns up too much
 * noise.
 */
export const MIN_SAMPLE_COUNT = 2;

/**
 * Returns every top-level field name the model observed — summed across every `types` and
 * `unknownTypes` bucket, at `MIN_SAMPLE_COUNT` samples or more — that isn't in
 * `knownPropertyNames`. Sorted for deterministic output.
 *
 * Compares by each field path's *top-level* segment only (`"message"`, never
 * `"message.content.text"`): `knownPropertyNames` comes from a TS interface's own declared
 * properties, which are inherently top-level, so diffing full dotted paths against that list
 * would flag every nested field of an already-documented object (e.g. `message.role`) as
 * "missing" even though `message` itself is declared on `LogEntry`.
 */
export function diffLogEntry(model: SchemaObservationModel, knownPropertyNames: string[]): string[] {
  const known = new Set(knownPropertyNames);
  const sampleCounts = sumPresentCountsByTopLevelField(model);

  const undocumented: string[] = [];
  for (const [fieldName, sampleCount] of sampleCounts) {
    if (sampleCount >= MIN_SAMPLE_COUNT && !known.has(fieldName)) {
      undocumented.push(fieldName);
    }
  }
  return undocumented.sort();
}

/** Sums `presentCount` per top-level field-path segment, across every bucket in both
 * `model.types` and `model.unknownTypes` — e.g. `type`, present in nearly every bucket,
 * accumulates its samples from all of them rather than resetting per bucket. */
function sumPresentCountsByTopLevelField(model: SchemaObservationModel): Map<string, number> {
  const counts = new Map<string, number>();
  const buckets = [...Object.values(model.types), ...Object.values(model.unknownTypes)];
  for (const bucket of buckets) {
    for (const [fieldPath, observation] of Object.entries(bucket.fields)) {
      const topLevelName = fieldPath.split('.')[0];
      counts.set(topLevelName, (counts.get(topLevelName) ?? 0) + observation.presentCount);
    }
  }
  return counts;
}

/**
 * Reads `sourceFilePath` and returns the property names declared directly on the interface
 * named `interfaceName`, via `ts.createSourceFile` + AST traversal (TypeScript Compiler
 * API) rather than a type import — see the module header above for why. Top-level property
 * signatures only (`foo`/`bar` in `interface X { foo: string; bar?: number }`) — doesn't
 * recurse into nested object-literal types, matching `diffLogEntry`'s own top-level-only
 * comparison. Throws if `interfaceName` isn't declared in the file: a wrong name should fail
 * loudly, not silently report zero properties.
 */
export function extractInterfacePropertyNames(sourceFilePath: string, interfaceName: string): string[] {
  const sourceText = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true);

  const declaration = findInterfaceDeclaration(sourceFile, interfaceName);
  if (declaration === undefined) {
    throw new Error(`extractInterfacePropertyNames: interface '${interfaceName}' not found in ${sourceFilePath}`);
  }

  const names: string[] = [];
  for (const member of declaration.members) {
    if (!ts.isPropertySignature(member)) {
      continue;
    }
    const name = member.name;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      names.push(name.text);
    }
  }
  return names;
}

/** Depth-first search for an `interface <interfaceName> { ... }` declaration anywhere in
 * `node`'s subtree. `ts.forEachChild` stops descending as soon as the callback returns a
 * defined value, so this returns as soon as a match is found. */
function findInterfaceDeclaration(node: ts.Node, interfaceName: string): ts.InterfaceDeclaration | undefined {
  if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
    return node;
  }
  return ts.forEachChild(node, (child) => findInterfaceDeclaration(child, interfaceName));
}
