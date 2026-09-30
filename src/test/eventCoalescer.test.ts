import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEventCoalescer, EventCoalescer } from '../eventCoalescer';
import { logDebug } from '../logger';

// The debug log is a disk append (an external boundary): mocking it keeps the run off the disk and
// makes "a failing flush is logged, not swallowed" observable.
vi.mock('../logger', () => ({ logDebug: vi.fn() }));

const DELAY_MS = 500;

type Batch = Record<string, number>;
type Flush = (batch: ReadonlyMap<string, number>) => void;

/** A flush that records every batch it receives, as a plain object, in order. */
function createRecorder(): { flush: Flush; batches: Batch[] } {
  const batches: Batch[] = [];
  return {
    flush: (batch) => {
      batches.push(Object.fromEntries(batch));
    },
    batches,
  };
}

/** A flush that throws on its first call and records the batches of every later one. */
function createFlakyFlush(): { flush: Flush; batches: Batch[] } {
  const batches: Batch[] = [];
  let calls = 0;
  return {
    flush: (batch) => {
      calls += 1;
      if (calls === 1) throw new Error('flush exploded');
      batches.push(Object.fromEntries(batch));
    },
    batches,
  };
}

describe('createEventCoalescer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(logDebug).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes a single batch holding every key once the delay has elapsed', () => {
    const { flush, batches } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);
    coalescer.push('b.jsonl', 2);
    coalescer.push('c.jsonl', 3);
    vi.advanceTimersByTime(DELAY_MS - 1);
    expect(batches).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(batches).toEqual([{ 'a.jsonl': 1, 'b.jsonl': 2, 'c.jsonl': 3 }]);
  });

  it('keeps one entry per key, holding the last pushed value', () => {
    const { flush, batches } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);
    coalescer.push('a.jsonl', 2);
    vi.advanceTimersByTime(DELAY_MS);

    expect(batches).toEqual([{ 'a.jsonl': 2 }]);
  });

  it('does not reset the window when later events arrive', () => {
    const { flush, batches } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);
    vi.advanceTimersByTime(400);
    coalescer.push('b.jsonl', 2);
    vi.advanceTimersByTime(99);
    coalescer.push('c.jsonl', 3);
    expect(batches).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(batches).toEqual([{ 'a.jsonl': 1, 'b.jsonl': 2, 'c.jsonl': 3 }]);
  });

  it('keeps flushing once per window under a steady stream of events, so nothing starves', () => {
    const flushedAt: number[] = [];
    const startedAt = Date.now();
    const coalescer = createEventCoalescer<number>(() => {
      flushedAt.push(Date.now() - startedAt);
    }, DELAY_MS);

    for (let elapsed = 0; elapsed <= 1500; elapsed += 100) {
      coalescer.push('transcript.jsonl', elapsed);
      vi.advanceTimersByTime(100);
    }

    expect(flushedAt).toEqual([500, 1000, 1500]);
  });

  it('flushes a lone event once and does not keep flushing on a cadence afterwards', () => {
    const { flush, batches } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);
    vi.advanceTimersByTime(DELAY_MS * 5);

    expect(batches).toEqual([{ 'a.jsonl': 1 }]);
  });

  it('drops the pending events on cancel and leaves no timer behind', () => {
    const { flush, batches } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);
    coalescer.cancel();
    vi.advanceTimersByTime(DELAY_MS * 2);

    expect(batches).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts a clean window on the first push after a cancel', () => {
    const { flush, batches } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('stale.jsonl', 1);
    coalescer.cancel();
    coalescer.push('fresh.jsonl', 2);
    vi.advanceTimersByTime(DELAY_MS);

    expect(batches).toEqual([{ 'fresh.jsonl': 2 }]);
  });

  it('is harmless to cancel while nothing is pending', () => {
    const { flush } = createRecorder();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    expect(() => {
      coalescer.cancel();
    }).not.toThrow();
  });

  it('logs a flush that throws instead of rethrowing it', () => {
    const { flush } = createFlakyFlush();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);

    expect(() => vi.advanceTimersByTime(DELAY_MS)).not.toThrow();
    expect(logDebug).toHaveBeenCalledWith(expect.stringContaining('flush exploded'));
  });

  it('coalesces the next window normally after a flush threw', () => {
    const { flush, batches } = createFlakyFlush();
    const coalescer = createEventCoalescer(flush, DELAY_MS);

    coalescer.push('a.jsonl', 1);
    vi.advanceTimersByTime(DELAY_MS);
    coalescer.push('b.jsonl', 2);
    vi.advanceTimersByTime(DELAY_MS);

    expect(batches).toEqual([{ 'b.jsonl': 2 }]);
  });

  it('puts a push made from inside flush into the next window', () => {
    const batches: Batch[] = [];
    const coalescer: EventCoalescer<number> = createEventCoalescer<number>((batch) => {
      batches.push(Object.fromEntries(batch));
      if (batches.length === 1) coalescer.push('late.jsonl', 9);
    }, DELAY_MS);

    coalescer.push('early.jsonl', 1);
    vi.advanceTimersByTime(DELAY_MS);
    expect(batches).toEqual([{ 'early.jsonl': 1 }]);

    vi.advanceTimersByTime(DELAY_MS);
    expect(batches).toEqual([{ 'early.jsonl': 1 }, { 'late.jsonl': 9 }]);
  });
});
