---
name: architecture-activity-detection-no-external-process
description: lsof nunca achou arquivo (251.510 execuções, 0 acertos) e saiu na 0.6.0 — atividade = watcher do VS Code + mtime + tick; por que não fs.watch recursivo nem PID.
metadata:
  type: architecture
---

A extensão não executa processo externo (`child_process` é banido por lint em `src/`). Atividade = evento do `vscode.workspace.createFileSystemWatcher` coalescido em 500 ms (janela fixa, não trailing) + janela de mtime (`activityWindowSeconds`, padrão 60 s) + varredura periódica (`pollIntervalSeconds`, padrão 15 s) como rede de segurança e fallback, sempre via `singleFlight`.
**Why:** o `lsof -Fn <dir>` antigo não tinha `+D` (só lista o diretório, nunca os `.jsonl` dentro) e as CLIs abrem-anexam-fecham o transcript: 251.510 execuções em 2 dias de log, 0 retornaram arquivo — e rodava 1 por evento do watcher (2 a 6 simultâneas, sem lock, sem debounce). `fs.watch({recursive})` foi descartado: no Linux é um fallback em JS do Node (≤20.11, que é o host do VS Code 1.90 = Node 20.9.0: stat-polling por entrada; ≥20.12: um `fs.watch` por arquivo e diretório, ~15,8 mil watches em `~/.claude/projects`), e erro de setup como ENOSPC é ignorado em silêncio (nodejs/node#65635). O watcher do VS Code (parcel: FSEvents / inotify só de diretórios / ReadDirectoryChangesW, processo separado, agregação de 75 ms) não expõe canal de erro à extensão: watcher morto por ENOSPC só aparece como atraso de até `pollIntervalSeconds`, por isso o tick é o fallback.
**How to apply:** não reintroduzir `lsof`/PID sem consumidor real — nada usa PID, a detecção foi dispensada por decisão, não esquecida. Mexeu em watcher, tick ou janela: manter janela de coalescência fixa (debounce trailing starva sob escrita contínua) e scans em single-flight. Ver [[architecture-cli-shutdown-marker-cost-state]].
