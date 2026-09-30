---
name: architecture-import-x-restricted-paths-glob-nao-dispara-no-windows
description: `import-x/no-restricted-paths` com `target` glob (`./src/*.ts`) nunca dispara no Windows — o `is-glob` do plugin lê `\*` como escape; escopo vai em `files` + `target` de diretório.
metadata:
  type: architecture
---

No primeiro CI em `windows-latest` (PR #8), 59 de 60 arquivos de teste passaram e `lintRules.test.ts` falhou: `expected [] to include 'import-x/no-restricted-paths'`. O import-x roda `is-glob(path.resolve(base, target))`; no win32 `<base>\src\*.ts` lê o `\*` como escape, então o alvo não é glob, cai em contenção por `path.relative` e nunca casa arquivo nenhum. O minimatch não é o culpado (o plugin já passa `windowsPathsNoEscape: true`).
**Why:** a regra ficava inerte em silêncio para quem desenvolve no Windows (sem erro, só sem a fronteira "código de produção não importa `src/test`"); só o CI Windows, criado nesta data, expôs. A sonda em `lintRules.test.ts` foi o que tornou o furo visível.
**How to apply:** escopo por glob em regra do import-x vai em um bloco `files: ['src/*.ts']` (globs do ESLint são normalizados para `/` em qualquer SO) com `target` de DIRETÓRIO (checado por `path.relative`, que respeita o SO) — ver o bloco em `eslint.config.mjs`. Regra de import nova precisa de sonda em `lintRules.test.ts` que falhe sem a regra; sonda `.not.toContain` passa vazia se a regra for no-op (e `ruleIdsFor` descarta erro fatal de parse).
