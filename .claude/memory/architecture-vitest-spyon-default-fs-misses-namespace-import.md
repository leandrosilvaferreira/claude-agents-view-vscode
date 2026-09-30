---
name: architecture-vitest-spyon-default-fs-misses-namespace-import
description: vi.spyOn(fs,'readSync') com `import fs` no teste não vê o `import * as fs` do src (0 chamadas, sem erro) — not.toHaveBeenCalled passa vazio; use vi.mock('fs', importOriginal).
metadata:
  type: architecture
---

`vi.spyOn(fs, 'x')` com `fs` importado por default no teste NÃO intercepta um módulo do `src/` que faz `import * as fs from 'fs'`: o spy é instalado, grava 0 chamadas e nenhum erro aparece; com `import * as fs` no teste o `spyOn` lança `Cannot spy on export "readSync". Module namespace is not configurable in ESM`. Verificado em 2026-09-30 (vitest 4.1.10, Node 24) num probe isolado.
**Why:** o `expect(read).not.toHaveBeenCalled()` de `codexLogParser.test.ts` (leitura incremental do Codex) nunca pode falhar e segue no repo; `projectPathResolver.test.ts` só documenta a variante namespace; o primeiro RED de `logParser.chunkedRead.test.ts` gravou 0 leituras.
**How to apply:** copie o probe de `logParser.chunkedRead.test.ts` — `vi.mock('fs', async (importOriginal) => …)` devolvendo o named export E o `default`, estado em `vi.hoisted` — e afirme `calls.length > 0` ANTES de qualquer limite ou "não chamou": um spy cego faz a asserção negativa passar sem provar nada.
