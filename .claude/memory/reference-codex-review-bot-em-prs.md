---
name: reference-codex-review-bot-em-prs
description: O bot `chatgpt-codex-connector[bot]` revisa PR ~4 min após abrir e a cada commit novo (👀→👍 ou threads P1/P2); PRs antigas foram mergeadas antes do review. A Open VSX demora ~2-4 min para listar a versão nova.
metadata:
  type: reference
---

Observações sobre serviços externos que o repo não registra (o resto do fluxo de CI/release está em `docs/DEVELOPMENT.md` e `docs/PUBLISHING.md`):

- **Review do bot Codex**: dispara na abertura da PR e a cada commit novo. Reage 👀 enquanto revisa, abre threads inline (badge P1/P2) se achar algo, ou reage 👍 sem comentários. Leva ~4 min. Nas PRs #6 e #7 o merge saiu antes e os comentários chegaram pós-merge.
- **Ele aplica a regra de memória deste repo a PR de memória**: na PR #9 apontou nota que duplicava comentário de código/`docs/` e instrução de release incondicional. Memória nova só com o que o repo não deriva.
- **Open VSX**: após o workflow de release, a API devolve 404 para a versão nova e `latest` antigo por ~2-4 min (varredura); não é falha de publicação.
**Why:** ninguém descobre o timing do bot nem o atraso da Open VSX lendo código; merge antes do 👍/threads joga o review para depois do merge.
**How to apply:** em PR autônoma, esperar o 👀 virar 👍 (ou as threads aparecerem e serem tratadas) antes do squash-merge; ao verificar publicação, repetir a consulta da Open VSX por alguns minutos antes de declarar falha.
