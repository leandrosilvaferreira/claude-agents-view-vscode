---
name: reference-fluxo-pr-ci-codex-release
description: Fluxo de PR/merge/release deste repo: CI `ci.yml` (static + test em 3 SOs), bot Codex revisa ~4 min após abrir e a cada commit novo (👀→👍), merge squash, release via workflow_dispatch que faz o bump.
metadata:
  type: reference
---

- **CI** (`.github/workflows/ci.yml`, PR + push em `main`): checks `static` (ubuntu: `npm run lint` + tsc) e `test (ubuntu-latest|windows-latest|macos-latest)` (testes + build). Rodou em ~2 min na PR #8.
- **Code review**: o bot `chatgpt-codex-connector[bot]` dispara na abertura da PR e a cada commit novo: reage 👀 enquanto revisa, comenta threads inline (badge P1/P2) se achar algo, ou reage 👍 sem comentários (~4 min). Nas PRs #6/#7 o merge saiu antes e os comentários chegaram pós-merge — esperar o 👀 virar 👍 (ou as threads aparecerem) antes do merge.
- **Merge**: squash com título `tipo: descrição (#N)` (histórico do repo), `--delete-branch`, depois `git pull`.
- **Release**: `gh workflow run release.yml -f bump=patch|minor|major` (verify → `npm version` → package → Open VSX → push do commit+tag → GitHub Release). O workflow FAZ o bump: a PR não altera `version` no `package.json`; o CHANGELOG já leva o número da release. A Open VSX leva ~2-4 min para listar a versão nova (a API devolve 404 para ela e `latest` antigo nesse intervalo).
  **Why:** nada disso está no repo além do YAML; o timing do bot e a lacuna "merge antes do review" só se descobre olhando PRs antigas.
  **How to apply:** PR autônoma = abrir, esperar os 4 checks, esperar o bot, tratar threads (corrigir, responder na PR, push, repetir), só então squash-merge e release.
