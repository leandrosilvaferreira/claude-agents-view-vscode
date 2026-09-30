---
name: architecture-rtk-rewrites-npm-lint-skips-jscpd
description: O hook RTK reescreve `npm run lint` para `rtk lint`, que roda só o ESLint e NÃO o jscpd — falso verde; rode `rtk proxy npm run lint`.
metadata:
  type: architecture
---

`rtk rewrite "npm run lint"` devolve `rtk lint`, que imprime "ESLint: No issues found" e nunca chama o jscpd; o script real do `package.json` é `eslint . && jscpd` (jscpd com `threshold: 0` falha em qualquer clone de 8+ linhas). Verificado em 2026-09-30.
**Why:** sessão ou subagente reporta "lint limpo" enquanto duplicação só apareceria no CI/release; o achado veio de notar a saída sem o quadro do jscpd.
**How to apply:** rodar o gate como `rtk proxy npm run lint` (a saída termina em "Found 0 clones") ou `npx eslint . && npx jscpd`. Dizer isso em todo prompt de subagente que roda lint.
