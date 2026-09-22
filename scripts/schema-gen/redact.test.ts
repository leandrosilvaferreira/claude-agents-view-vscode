import { describe, it, expect } from 'vitest';
import { redact } from './redact';

// Mirrors the `Sample text N` placeholder convention already used by src/test/fixtures/real-logs/
// (see the header comment in src/test/logParser.realLogs.test.ts) — redact() must produce the same
// text shape so redacted fixtures read consistently with the ones already committed.
interface RedactableLine {
  type?: string;
  message?: { role?: string; content?: string };
  cwd?: string;
  gitBranch?: string;
  toolUseResult?: { status?: string; output?: string };
  tool_calls?: Array<{ name?: string; arguments?: { Cwd?: string; SearchPath?: string } }>;
}

const PLACEHOLDER = /^Sample text \d+$/;
const TRACKED_FILE_CONTENT = 'real tracked content';

describe('redact', () => {
  it('replaces a real-looking prompt, an absolute home-dir path, and a branch name', () => {
    const line: RedactableLine = {
      message: { content: 'Please rotate the prod database credentials before Friday.' },
      cwd: '/Users/janedoe/Projects/acme-app',
      gitBranch: 'fix/713-typed-wrapper-context',
    };

    const result = redact(line);

    expect(result.message?.content).toMatch(PLACEHOLDER);
    expect(result.cwd).toMatch(PLACEHOLDER);
    expect(result.gitBranch).toMatch(PLACEHOLDER);
  });

  it('leaves type/role/status-shaped fields unchanged', () => {
    const line: RedactableLine = {
      type: 'assistant',
      message: { role: 'user' },
      toolUseResult: { status: 'async_launched' },
    };

    const result = redact(line);

    expect(result.type).toBe('assistant');
    expect(result.message?.role).toBe('user');
    expect(result.toolUseResult?.status).toBe('async_launched');
  });

  it('produces the same placeholder numbering on repeated calls with the same input', () => {
    const line: RedactableLine = {
      message: { content: 'first prompt text' },
      cwd: '/Users/janedoe/Projects/acme-app',
    };

    expect(redact(line)).toEqual(redact(line));
  });

  it('redacts a string leaf nested inside toolUseResult and tool_calls[].arguments', () => {
    const line: RedactableLine = {
      type: 'tool_result',
      toolUseResult: { status: 'success', output: 'contents of a leaked config file' },
      tool_calls: [{ name: 'Bash', arguments: { Cwd: '/Users/janedoe/project', SearchPath: '/some/real/path' } }],
    };

    const result = redact(line);

    expect(result.toolUseResult?.output).toMatch(PLACEHOLDER);
    expect(result.toolUseResult?.status).toBe('success');
    expect(result.tool_calls?.[0]?.arguments?.Cwd).toMatch(PLACEHOLDER);
    expect(result.tool_calls?.[0]?.arguments?.SearchPath).toMatch(PLACEHOLDER);
  });

  it('redacts a content-derived object key (e.g. AskUserQuestion answers) instead of leaking the question text into the output', () => {
    const question = 'Is this a real question with spaces and a question mark?';
    const line = {
      type: 'tool_result',
      toolUseResult: { status: 'success' as const, answers: { [question]: 'yes' } },
    };

    const result = redact(line);
    const serialized = JSON.stringify(result);

    // The allowlisted, schema-like sibling key is completely unaffected.
    expect(result.type).toBe('tool_result');
    expect(result.toolUseResult.status).toBe('success');
    // Neither the question text nor the answer value survives anywhere in the output.
    expect(serialized).not.toContain(question);
    expect(serialized).not.toContain('"yes"');
    // The unsafe key itself is redacted too, using its own counter.
    expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
  });

  // Finding A: each of these looks like a plain identifier but is really an inherited
  // Object.prototype member. Used directly as an ordinary object key (not inside a known
  // dynamic-key container — that's the separate Finding B case below), redact() must not
  // crash, must not leak the original key or its value, and — the sharpest case, `__proto__`
  // specifically — must not actually repoint the object's real prototype.
  it.each([
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty',
    'valueOf',
    'isPrototypeOf',
    'toLocaleString',
    'propertyIsEnumerable',
  ])(
    'redacts an Object.prototype member name (%j) used as a key instead of crashing or corrupting the object',
    (protoKey) => {
      const line = { type: 'tool_result', toolUseResult: { status: 'success' as const, [protoKey]: 'leaked value' } };

      const result = redact(line);
      const serialized = JSON.stringify(result);

      expect(result.toolUseResult.status).toBe('success');
      expect(Object.getPrototypeOf(result.toolUseResult)).toBe(Object.prototype);
      expect(serialized).not.toContain('leaked value');
      expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
    },
  );

  // Finding B: a bare, punctuation-free real value (a tracked filename, an option label)
  // passes isSchemaLikeKey on shape alone, but every child of a known dynamic-key-map
  // container must be treated as unsafe regardless — this is the real LICENSE/NOTICE case
  // already observed in the committed src/generated/transcriptShapes.ts before this fix.
  it.each([
    'answers',
    'trackedFileBackups',
    'artifacts',
    '_meta',
    'wireToolInputs',
    'wireIngestContext',
    'structuredContent',
    'properties',
  ])(
    'redacts a bare, identifier-shaped child key under the known dynamic-key container %j instead of keeping it literally',
    (containerKey) => {
      const line = { type: 'tool_result', [containerKey]: { LICENSE: TRACKED_FILE_CONTENT } };

      const result = redact(line);
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('LICENSE');
      expect(serialized).not.toContain(TRACKED_FILE_CONTENT);
      expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
    },
  );
});

// Sibling top-level describe (not nested in the one above) so its line count doesn't push
// that describe past this repo's max-lines-per-function limit — same reasoning as the
// Finding A/B blocks in schemaAggregator.test.ts and keySafety.test.ts.
describe('redact — dynamic-key container value wrapped in an array', () => {
  // The array branch used to drop the container `key` when recursing into elements
  // (`redactValue(item, undefined, counters)`), so a container whose value is an array of maps
  // leaked its real keys straight through redactObject's forceDynamicKey check.
  it('redacts a bare, identifier-shaped child key under a known dynamic-key container even when the container value is an array of maps', () => {
    const line = { type: 'tool_result', answers: [{ LICENSE: TRACKED_FILE_CONTENT }] };

    const result = redact(line);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('LICENSE');
    expect(serialized).not.toContain(TRACKED_FILE_CONTENT);
    expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
  });
});

// Sibling top-level describe (not nested in the one above) so its line count doesn't push
// that describe past this repo's max-lines-per-function limit — same reasoning as the
// Finding A/B blocks in schemaAggregator.test.ts and keySafety.test.ts.
describe('redact — opaque per-call ids (Finding C)', () => {
  // An opaque per-call id (e.g. Claude Code 2.1.270+'s wireToolInputs, keyed by tool_use id)
  // is syntactically a plain identifier, so this must go through isSchemaLikeKey's
  // OPAQUE_ID_KEY check alone — the parent key here (`toolCallIndex`) is deliberately NOT a
  // known dynamic-key container, so the container-list defense-in-depth can't be doing the work.
  it('redacts an opaque per-call id key (e.g. toolu_…) via isSchemaLikeKey alone, even outside a known dynamic-key container', () => {
    const line = { type: 'assistant', toolCallIndex: { toolu_01AbCdEfGhIjKlMnOpQrStUv: 'value' } };

    const result = redact(line);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('toolu_01AbCdEfGhIjKlMnOpQrStUv');
    expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
  });
});

// Sibling top-level describe (not nested above) so its line count doesn't push that describe
// past this repo's max-lines-per-function limit — same reasoning as the other sibling describes
// in this file. Item 1 (BLOCKING): numeric leaves must default-deny exactly like string leaves.
describe('redact — numeric leaves default-deny like strings (item 1)', () => {
  it('replaces every numeric leaf in a cost-state-like entry with 0', () => {
    const line = {
      type: 'system',
      subtype: 'cost-state',
      totalCostUSD: 12.34,
      startTime: 1732000000000,
      totalDuration: 4567,
      totalAPIDuration: 1234,
      totalAPIDurationWithoutRetries: 1000,
      totalToolDuration: 200,
    };

    const result = redact(line);

    expect(result.totalCostUSD).toBe(0);
    expect(result.startTime).toBe(0);
    expect(result.totalDuration).toBe(0);
    expect(result.totalAPIDuration).toBe(0);
    expect(result.totalAPIDurationWithoutRetries).toBe(0);
    expect(result.totalToolDuration).toBe(0);
  });

  it('replaces a real PR number in a pr-link-like entry with 0', () => {
    const line = { type: 'pr-link', prNumber: 4821 };

    const result = redact(line);

    expect(result.prNumber).toBe(0);
  });

  it('keeps `created` literal — the one numeric field the extension parser actually reads', () => {
    const line = { type: 'user', created: 1732000000000 };

    expect(redact(line).created).toBe(1732000000000);
  });

  it('zeroes a `created` field nested inside echoed third-party tool output instead of keeping it like the top-level one', () => {
    const line = { type: 'tool_result', toolUseResult: { status: 'success', record: { created: 1700000000 } } };

    expect(redact(line).toolUseResult.record.created).toBe(0);
  });

  it('leaves booleans and null unchanged', () => {
    const line = { type: 'user', isSidechain: true, isAsync: false, resolvedModel: null };

    const result = redact(line);

    expect(result.isSidechain).toBe(true);
    expect(result.isAsync).toBe(false);
    expect(result.resolvedModel).toBeNull();
  });
});

// Sibling top-level describe (not nested above) — item 3: a kept type/role/status value must
// also match a closed-vocabulary shape, not just have an allowlisted key.
describe('redact — closed-vocabulary guard for allowlisted keys (item 3)', () => {
  it('redacts a long free-text value found under an allowlisted key like `status`', () => {
    const line = {
      type: 'system',
      toolUseResult: { status: 'This deployment requires manual approval before it can proceed today' },
    };

    const result = redact(line);

    expect(result.toolUseResult.status).toMatch(PLACEHOLDER);
  });

  it('still keeps a short, real closed-vocabulary status value literal', () => {
    const line = { type: 'system', toolUseResult: { status: 'async_launched' } };

    expect(redact(line).toolUseResult.status).toBe('async_launched');
  });

  // Widened regex: memory-file types are PascalCase, a MIME type has a `/` (see CLOSED_VOCABULARY_VALUE).
  it.each(['AutoMem', 'image/png'])(
    'keeps the real closed-vocabulary value %j literal under an allowlisted key',
    (value) => {
      const line = { type: value };

      expect(redact(line).type).toBe(value);
    },
  );

  // Item 4: `subtype` wasn't allowlisted, so every `system:*` fixture lost its real subtype.
  it('keeps a real subtype value literal instead of redacting it to a placeholder (item 4)', () => {
    const line = { type: 'system', subtype: 'agents_killed' };

    expect(redact(line).subtype).toBe('agents_killed');
  });
});

// Sibling top-level describe (not nested above) — item 2: an opaque container's subtree must
// collapse at EVERY depth, not just its direct children.
describe('redact — opaque containers collapse at every depth (item 2)', () => {
  it('collapses a multi-level-nested value under an opaque container instead of leaking any inner key', () => {
    const line = {
      type: 'assistant',
      wireToolInputs: {
        toolu_01AbCdEfGhIjKlMnOpQrStUv: { command: 'ls', nested: { secretParam: 'value', deeper: { x: 1 } } },
      },
    };

    const result = redact(line);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('secretParam');
    expect(serialized).not.toContain('"command"');
    expect(serialized).not.toContain('deeper');
  });

  it('collapses a JSON-Schema properties map instead of leaking third-party parameter names', () => {
    const line = {
      type: 'user',
      attachment: {
        tools: [{ schema: { input_schema: { properties: { repo_owner: { type: 'string' }, repo_name: {} } } } }],
      },
    };

    const result = redact(line);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('repo_owner');
    expect(serialized).not.toContain('repo_name');
    expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
  });
});

// Sibling top-level describe (not nested above) — item 2: an MCP server's own tool_use `input`
// is opaque, but a built-in tool's `input` (Bash, Read, ...) must keep its parameter names.
describe('redact — MCP tool_use input is opaque, built-in tool input is not (item 2)', () => {
  function toolUseLine(name: string, input: Record<string, unknown>) {
    return {
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_1', name, input }] },
    };
  }

  it("redacts an MCP-minted tool_use block's own input parameter names", () => {
    const line = toolUseLine('mcp__github__create_issue', { repo_owner: 'acme', issue_body: 'secret plan' });

    const result = redact(line);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('repo_owner');
    expect(serialized).not.toContain('secret plan');
    expect(serialized).toMatch(/"Sample key \d+":"Sample text \d+"/);
  });

  it("keeps a built-in tool_use block's own input parameter names literal", () => {
    const line = toolUseLine('Bash', { command: 'ls', description: 'list files' });

    const result = redact(line);
    const input = result.message.content[0].input;

    expect(Object.keys(input).sort()).toEqual(['command', 'description']);
    expect(input.command).toMatch(PLACEHOLDER);
    expect(input.description).toMatch(PLACEHOLDER);
  });
});
