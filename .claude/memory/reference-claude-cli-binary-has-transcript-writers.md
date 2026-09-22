---
name: reference-claude-cli-binary-has-transcript-writers
description: The installed Claude Code CLI binary contains the code that writes transcript entries — grep it to learn what an undocumented new entry type/subtype means.
metadata:
  type: reference
---

Each installed Claude Code version lives at `~/.local/share/claude/versions/<version>` (a ~200 MB single binary). Its embedded JS includes the transcript writers, so the meaning of a new, undocumented entry shape can be read there instead of guessed from samples — e.g. `system` subtype `agents_killed` ("background agents are terminated (e.g. on interrupt)", no per-agent `<task-notification>` follows) was confirmed this way on 2.1.278.
**Why:** the transcript format has no public schema ([[architecture-no-public-transcript-schema]]); a subtype with one real sample can't be understood from the sample alone.
**How to apply:** when `npm run schema:generate` reports a new bucket or field, `strings`/grep the binary of the version that wrote it for the subtype or field name before deciding how the parser should treat it.
