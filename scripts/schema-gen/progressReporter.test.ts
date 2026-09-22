import { describe, it, expect } from 'vitest';
import { nextProgressLine, createProgressReporter, ProgressCounts, ProgressClock } from './progressReporter';

const baseCounts: ProgressCounts = { filesProcessed: 10, filesTotal: 100, entriesProcessed: 500, parseErrorCount: 1 };

function clock(overrides: Partial<ProgressClock>): ProgressClock {
  return { nowMs: 0, startMs: 0, lastReportMs: undefined, throttleMs: 2000, ...overrides };
}

function progressCounts(overrides: Partial<ProgressCounts>): ProgressCounts {
  return { filesProcessed: 0, filesTotal: 10, entriesProcessed: 0, parseErrorCount: 0, ...overrides };
}

// The one focused test suite for this module's pure logic: the throttle decision and the ETA
// math. Most of the rest of progressReporter.ts is stateful wiring covered end-to-end by
// generate.test.ts instead (see that file's "reports progress" case) — the
// createProgressReporter tests below cover the two behaviours an end-to-end run can't pin
// deterministically: a throwing sink, and the throttle window itself.
describe('nextProgressLine', () => {
  it('prints on the first call, since there is no prior report to throttle against', () => {
    const line = nextProgressLine(baseCounts, clock({ nowMs: 1000, lastReportMs: undefined }), { isFinal: false });
    expect(line).not.toBeNull();
  });

  it('stays silent for a call inside the throttle window', () => {
    const line = nextProgressLine(baseCounts, clock({ nowMs: 1500, lastReportMs: 1000, throttleMs: 2000 }), {
      isFinal: false,
    });
    expect(line).toBeNull();
  });

  it('prints again once the throttle window has fully elapsed', () => {
    const line = nextProgressLine(baseCounts, clock({ nowMs: 3200, lastReportMs: 1000, throttleMs: 2000 }), {
      isFinal: false,
    });
    expect(line).not.toBeNull();
  });

  it('always prints the final report, even inside the throttle window', () => {
    const line = nextProgressLine(baseCounts, clock({ nowMs: 1500, lastReportMs: 1000, throttleMs: 2000 }), {
      isFinal: true,
    });
    expect(line).toContain('done:');
  });

  it('estimates an ETA from elapsed time and remaining files when the total is known', () => {
    const counts: ProgressCounts = { filesProcessed: 10, filesTotal: 100, entriesProcessed: 500, parseErrorCount: 0 };
    // 10s elapsed / 10 files done = 1s/file average * 90 files remaining = 90s ETA.
    const line = nextProgressLine(counts, clock({ nowMs: 10000, startMs: 0 }), { isFinal: false });
    expect(line).toContain('ETA ~90s');
  });

  it('omits the ETA before any file has finished, to avoid a divide-by-zero guess', () => {
    const counts: ProgressCounts = { filesProcessed: 0, filesTotal: 100, entriesProcessed: 0, parseErrorCount: 0 };
    const line = nextProgressLine(counts, clock({ nowMs: 5000, startMs: 0 }), { isFinal: false });
    expect(line).not.toContain('ETA');
  });

  // A second pass over the same corpus (generate.ts's fixtures walk) needs to read as
  // visibly distinct from the first — see nextProgressLine's own doc comment.
  it('uses the given label in place of "progress", to mark a mid-run line as a different pass', () => {
    const line = nextProgressLine(baseCounts, clock({ nowMs: 1000 }), { isFinal: false, label: 'fixtures pass' });
    expect(line).toContain('[schema:generate] fixtures pass:');
  });

  it('uses the given label in place of "done" too, so the final line still reads as that pass', () => {
    const line = nextProgressLine(baseCounts, clock({ nowMs: 1000 }), { isFinal: true, label: 'fixtures pass' });
    expect(line).toContain('[schema:generate] fixtures pass:');
  });
});

describe('createProgressReporter', () => {
  it('keeps working and never throws when the sink onLine throws', () => {
    const throwingSink = {
      onLine: () => {
        throw new Error('boom');
      },
    };
    const reporter = createProgressReporter(throwingSink, 'corpus-root');

    expect(() => {
      reporter.onWalkProgress(progressCounts({ filesProcessed: 1 }));
    }).not.toThrow();
    expect(() => {
      reporter.onWalkProgress(progressCounts({ filesProcessed: 2 }));
    }).not.toThrow();
    expect(() => {
      reporter.phase('writing observations');
    }).not.toThrow();
    expect(() => {
      reporter.finishWalk();
    }).not.toThrow();
  });

  it('throttles progress lines to one per window, and always flushes on finishWalk', () => {
    let nowMs = 0;
    const lines: string[] = [];
    const reporter = createProgressReporter(
      { onLine: (line) => lines.push(line), now: () => nowMs, throttleMs: 1000 },
      'corpus-root',
    );

    reporter.onWalkProgress(progressCounts({ filesProcessed: 0 })); // start announcement always prints
    nowMs = 300;
    reporter.onWalkProgress(progressCounts({ filesProcessed: 1 })); // inside the window: swallowed
    nowMs = 900;
    reporter.onWalkProgress(progressCounts({ filesProcessed: 1 })); // still inside the window: swallowed
    expect(lines).toHaveLength(1);

    nowMs = 1100;
    reporter.onWalkProgress(progressCounts({ filesProcessed: 2 })); // window elapsed: prints
    nowMs = 1400;
    reporter.onWalkProgress(progressCounts({ filesProcessed: 3 })); // new window just started: swallowed
    expect(lines).toHaveLength(2);

    nowMs = 2200;
    reporter.onWalkProgress(progressCounts({ filesProcessed: 4 })); // second window elapsed: prints
    nowMs = 2250;
    reporter.finishWalk(); // always flushes, even mid-window
    expect(lines).toHaveLength(4);
  });
});
