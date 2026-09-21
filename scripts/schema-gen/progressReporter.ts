import { WalkProgress } from './corpusWalker';

/**
 * Progress reporting for T11's CLI orchestrator (generate.ts) — added because a corpus scan
 * over a large transcript history used to print nothing until the very end, giving no way to
 * tell a slow run apart from a hung one. Split out of generate.ts so the pure throttle/
 * formatting logic (the only part worth a dedicated test) stays isolated from the stateful
 * wiring around it.
 *
 * `nextProgressLine` is the one pure function: given a snapshot of counts and a clock, it
 * decides whether a line is due and formats it. `createProgressReporter` is the stateful
 * glue generate.ts uses — it remembers when it last printed, announces the corpus scan once
 * up front, and stays completely silent when no sink is supplied (the default for tests and
 * any other library caller).
 */

/** Snapshot of scan progress at one point in time — the same shape corpusWalker's own
 * WalkProgress reports, reused directly since every real producer always knows the file
 * total up front (see corpusWalker.ts's findJsonlFiles). */
export type ProgressCounts = WalkProgress;

/** Everything nextProgressLine needs to know about time, grouped into one object to stay
 * under this repo's max-params lint rule. `lastReportMs` is `undefined` before the first
 * report. All three ms fields are caller-supplied rather than read from Date.now() inside,
 * so the function is pure and deterministic under test. */
export interface ProgressClock {
  nowMs: number;
  startMs: number;
  lastReportMs: number | undefined;
  throttleMs: number;
}

function formatEta(counts: ProgressCounts, clock: ProgressClock): string {
  if (counts.filesProcessed <= 0) {
    return '';
  }
  const msPerFile = (clock.nowMs - clock.startMs) / counts.filesProcessed;
  const remainingFiles = Math.max(counts.filesTotal - counts.filesProcessed, 0);
  const etaSec = Math.max(0, Math.round((msPerFile * remainingFiles) / 1000));
  return `, ETA ~${etaSec}s`;
}

/** The non-time inputs `nextProgressLine` needs, grouped into one object for the same
 * reason `ProgressClock` is: this repo's max-params lint rule (3). `label` replaces the
 * `progress`/`done` word outright when given — the one thing that lets two walks over the
 * same corpus (generate.ts's first pass and its later, independent fixtures pass) read as
 * visibly distinct lines on stderr instead of an interleaved, ambiguous stream. */
export interface ProgressLineStatus {
  isFinal: boolean;
  label?: string;
}

/**
 * Decides whether a throttled progress line is due right now and formats it if so. Returns
 * `null` when the caller should stay silent — still inside the throttle window and not the
 * final report. `status.isFinal` always forces a line, even inside the window, so the run's
 * last state is never lost to throttling. Omitting `status.label` is byte-identical to the
 * original single-pass line.
 */
export function nextProgressLine(
  counts: ProgressCounts,
  clock: ProgressClock,
  status: ProgressLineStatus,
): string | null {
  const { isFinal, label } = status;
  const due = isFinal || clock.lastReportMs === undefined || clock.nowMs - clock.lastReportMs >= clock.throttleMs;
  if (!due) {
    return null;
  }

  const elapsedSec = Math.max(0, Math.round((clock.nowMs - clock.startMs) / 1000));
  const filesLabel = `${counts.filesProcessed}/${counts.filesTotal} files`;
  const prefix = label ?? (isFinal ? 'done' : 'progress');
  return `[schema:generate] ${prefix}: ${filesLabel}, ${counts.entriesProcessed} entries, ${counts.parseErrorCount} parse error(s), ${elapsedSec}s elapsed${formatEta(counts, clock)}`;
}

/** Where progress lines go, and what drives their clock. Everything is optional and defaults
 * to "do nothing"/`Date.now`, so a caller that doesn't care (every existing test, any future
 * library use of generateSchema) gets silent, real-time-independent behavior for free. */
export interface ProgressSink {
  onLine?: (line: string) => void;
  now?: () => number;
  throttleMs?: number;
}

export interface ProgressReporter {
  onWalkProgress: (counts: ProgressCounts) => void;
  finishWalk: () => void;
  phase: (message: string) => void;
}

const DEFAULT_THROTTLE_MS = 2000;

/** Calls `sink.onLine`, swallowing whatever it throws (e.g. an EPIPE from
 * `process.stderr.write` when the CLI's stderr is piped into something like `head`).
 * Progress reporting must stay best-effort: a broken sink must never corrupt
 * parseErrorCount or abort the run it's merely reporting on. */
function safeEmit(sink: ProgressSink, line: string): void {
  try {
    sink.onLine?.(line);
  } catch {
    // best-effort reporting only; a broken sink must never affect the run
  }
}

/** Wires a corpus walk's raw WalkProgress counts into throttled, formatted lines, plus
 * one-off phase announcements, for generate.ts's pipeline. Kept stateful and un-tested by
 * design (it's glue around the pure function above) — generate.test.ts's end-to-end run
 * covers the wiring instead of a dedicated unit test.
 *
 * `label`, when given, is threaded into the start announcement and every nextProgressLine
 * call this reporter makes, so a second, independent walk over the same corpus (generate.ts's
 * fixtures pass) prints as an obviously separate stream rather than reusing the unlabelled
 * "progress:"/"done:" wording pass one already owns. */
export function createProgressReporter(sink: ProgressSink, corpusRoot: string, label?: string): ProgressReporter {
  const now = sink.now ?? Date.now;
  const throttleMs = sink.throttleMs ?? DEFAULT_THROTTLE_MS;
  const startMs = now();
  let lastReportMs: number | undefined;
  let lastCounts: ProgressCounts = { filesTotal: 0, filesProcessed: 0, entriesProcessed: 0, parseErrorCount: 0 };
  let announcedStart = false;

  function onWalkProgress(counts: ProgressCounts): void {
    lastCounts = counts;
    const nowMs = now();
    if (!announcedStart) {
      announcedStart = true;
      lastReportMs = nowMs;
      const scanLabel = label ? `${label}: scanning corpus` : 'scanning corpus';
      safeEmit(sink, `[schema:generate] ${scanLabel}: ${corpusRoot} (${counts.filesTotal} .jsonl file(s) found)`);
      return;
    }
    const line = nextProgressLine(counts, { nowMs, startMs, lastReportMs, throttleMs }, { isFinal: false, label });
    if (line !== null) {
      lastReportMs = nowMs;
      safeEmit(sink, line);
    }
  }

  function finishWalk(): void {
    const line = nextProgressLine(
      lastCounts,
      { nowMs: now(), startMs, lastReportMs, throttleMs },
      { isFinal: true, label },
    );
    if (line !== null) {
      safeEmit(sink, line);
    }
  }

  function phase(message: string): void {
    safeEmit(sink, `[schema:generate] ${message}`);
  }

  return { onWalkProgress, finishWalk, phase };
}
