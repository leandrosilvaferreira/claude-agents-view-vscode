---
name: feedback-nao-esperar-codex-indefinidamente
description: O review do bot Codex reinicia a cada push e em PR de memória gera nit novo a cada rodada; o usuário mandou fechar a PR #9 sem esperar mais — tratar as threads uma vez e mergear com CI verde.
metadata:
  type: feedback
---

Na PR #9 (notas de memória) o Codex abriu thread nova a cada push (4 rodadas) e o usuário mandou marcar auto-merge e desconsiderá-lo: "senão nunca vamos terminar".
**Why:** cada push reinicia o review (~4 min) e o bot sempre acha um nit novo em nota de memória; esperar o 👍 vira laço sem fim.
**How to apply:** tratar as threads abertas UMA vez (corrigir, responder, resolver); com os 4 checks do CI verdes, marcar auto-merge (ou mergear) sem esperar a rodada de review do push seguinte. Ver [[reference-codex-review-bot-em-prs]].
