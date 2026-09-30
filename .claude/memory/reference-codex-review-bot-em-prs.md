---
name: reference-codex-review-bot-em-prs
description: O bot `chatgpt-codex-connector[bot]` revisa PR ~4 min após abrir e a cada commit novo (👀→👍 ou threads P1/P2); as PRs #6 e #7 foram mergeadas antes do review chegar.
metadata:
  type: reference
---

O bot dispara na abertura da PR e a cada commit novo. Reage 👀 enquanto revisa, abre threads inline (badge P1/P2) se achar algo, ou reage 👍 sem comentários. Leva ~4 min. Nas PRs #6 e #7 o merge saiu antes e os comentários chegaram pós-merge.
**Why:** o timing do bot não está em código nem em docs do repo; merge antes do 👍 ou das threads joga o review para depois do merge.
**How to apply:** em PR autônoma, esperar a primeira rodada do bot e tratar as threads que ele abrir; cada push novo reinicia o review, então não aguardar as rodadas seguintes (ver [[feedback-nao-esperar-codex-indefinidamente]]).
