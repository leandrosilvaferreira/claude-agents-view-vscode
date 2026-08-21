#!/usr/bin/env node
/**
 * UserPromptSubmit hook that injects a standing "orchestration mode"
 * directive on every prompt: run the session as orchestrator, delegate
 * exploration/implementation to subagents, set `model` explicitly per
 * dispatch, and parallelize independent work. Delivered as a hook rather
 * than CLAUDE.md content because CLAUDE.md loses attention over a long
 * session — re-injecting it on every turn keeps the directive live
 * regardless of session length or context compaction.
 *
 * Injection is unconditional: no filesystem check, no project-type gating,
 * no caching, no session flag. Pure context injection (additionalContext
 * only, never a permission decision), so it never blocks a session.
 *
 * Cross-platform: plain Node (no shell), wired exec-form (`node <path>`) in
 * .claude/settings.json under UserPromptSubmit, no matcher (fires on every
 * prompt).
 *
 * Fails open on any I/O or parse error, including literal `null` on stdin
 * (exit 0, no output) — this hook must never block a session.
 */
import fs from "node:fs";

// Anti-recursion guard — sub-session pollution prevention. Runners that spawn
// Agent SDK sub-sessions set CLAUDE_INVOKED_BY on the child process env;
// without this guard every sub-session prompt would also receive the
// orchestration directive, prompting it to delegate further and risking a
// recursive delegation storm.
if (process.env.CLAUDE_INVOKED_BY) process.exit(0);

/** @returns {string} */
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const ORCHESTRATION_CONTEXT = `ORCHESTRATION MODE — MANDATORY

Modo padrão OBRIGATÓRIO: a sessão principal PLANEJA, DELEGA e INTEGRA;
os subagentes IMPLEMENTAM.

- Antes de editar, quebre a tarefa em frentes independentes (arquivos ou camadas
  que não se sobrepõem) e dispare um subagente por frente. Todas as chamadas do
  Agent tool na MESMA mensagem, para rodarem em paralelo.
- Frentes que tocam o mesmo arquivo não vão em paralelo: serialize, ou faça você.
- Cada subagente recebe: objetivo, arquivos que pode tocar, invariantes do
  CLAUDE.md que valem ali e o critério de pronto (qual teste em 'tests/',
  'pnpm test', 'pnpm dev:infra' ou 'pnpm typecheck' prova a mudança).
- Use 'model: "sonnet"' nas chamadas do Agent tool. Só suba de modelo quando a
  frente exigir decisão arquitetural, não implementação.
- Escolha o subagente pela 'description' do frontmatter dele, não por memória:
  '.claude/agents/' tem vinte agentes e a lista chega inteira à sessão. Os três
  que resolvem a maior parte das frentes deste repo: 'guard-reviewer' (isolamento
  entre organizações, prompt injection, vazamento de credencial — o único que
  conhece as invariantes daqui), 'Explore' para localizar código e
  'general-purpose' para implementar.
- A sessão principal não implementa em paralelo com os subagentes: ela revisa o
  que voltou, integra, roda typecheck/testes e responde.
- Tarefa trivial (um arquivo, edição óbvia, pergunta direta): faça você mesmo,
  delegar custaria mais que fazer.`;

/** @type {any} */
let event;
try {
  event = JSON.parse(readStdin() || "{}");
} catch {
  process.exit(0);
}

// Literal `null` is valid JSON and parses without throwing — the repo-wide
// `JSON.parse(x || "{}")` idiom alone does not catch it. Guard explicitly
// (see .claude/memory/hook-stdin-null-crash.md).
if (typeof event !== "object" || event === null) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: ORCHESTRATION_CONTEXT,
    },
  }),
);

process.exit(0);
