---
name: reference-open-vsx-demora-listar-versao-nova
description: Após o workflow de release, a API da Open VSX devolve 404 para a versão nova e `latest` antigo por ~2-4 min (varredura); não é falha de publicação.
metadata:
  type: reference
---

O passo "Publish to Open VSX" termina com sucesso, mas `GET /api/<publisher>/<extension>/<versão>` responde 404 e `latest` continua na versão anterior por ~2-4 min, até a varredura da Open VSX liberar (v0.6.0: publicada às 23:18:46Z, visível na 5ª consulta de 30 s).
**Why:** ninguém descobre isso lendo o repo; declarar falha cedo leva a republicar ou investigar em vão.
**How to apply:** ao verificar uma publicação, repetir a consulta por alguns minutos (intervalo de ~30 s) antes de concluir que falhou.
