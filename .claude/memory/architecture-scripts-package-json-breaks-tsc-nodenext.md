---
name: architecture-scripts-package-json-breaks-tsc-nodenext
description: Adding scripts/package.json with type:module (to silence node's MODULE_TYPELESS_PACKAGE_JSON) breaks tsc under NodeNext once tsx is the runner — don't add it.
metadata:
  type: architecture
---

`scripts/tsconfig.json` uses `moduleResolution: NodeNext`, which adapts to the nearest
`package.json`'s `"type"` field. With no local `scripts/package.json`, the whole `scripts/`
tree types as CommonJS-ambient, so `tsc -p scripts/tsconfig.json --noEmit` accepts the
extensionless relative imports (`from './schemaModel'`) every file under
`scripts/schema-gen/` uses. Adding `scripts/package.json` with `{"type":"module"}` flips
that to ESM-ambient, which then makes `tsc` demand explicit `.js` extensions on every one of
those imports (TS2835) — a ~20-error regression across the whole tree, invisible until you
actually run `tsc` with the file present (verified empirically: clean baseline without it,
broken with it).

**Why:** the fix was proposed to silence Node's `MODULE_TYPELESS_PACKAGE_JSON` warning under
plain `node`, but the runner is `tsx` (`npm run schema:generate`), not plain `node` — `tsx`
resolves extensionless imports fine and never hits that warning in the first place (verified:
clean run with no local package.json at all), so the fix has no benefit left and only costs.

**How to apply:** do not add `scripts/package.json`. For path resolution inside
`scripts/schema-gen/*.ts`, use `__dirname`/`__filename` (which `tsx` polyfills), not
`import.meta.url` (TS1470 under this file's CJS-ambient classification).
