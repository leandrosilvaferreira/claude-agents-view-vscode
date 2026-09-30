import { logDebug } from './logger';

/** Buffers keyed events and hands them over as one batch per fixed window. */
export interface EventCoalescer<T> {
  /** Records `value` under `key`; a key pushed again within the window keeps only its last value. */
  push(key: string, value: T): void;
  /** Drops every pending event and the running window. The instance stays usable afterwards. */
  cancel(): void;
}

/**
 * Turns a burst of file-watcher events into one `flush` call, so a file appended to many times a
 * second is parsed and rendered once per window instead of once per event. The window opens at
 * the FIRST event and is deliberately not re-armed by later ones: a trailing-edge debounce would
 * starve the flush for as long as events keep arriving, and a transcript is appended to
 * continuously while an agent works. Latency is therefore bounded by `delayMs`.
 *
 * `flush` runs inside a try/catch that logs and never rethrows: it is invoked from a timer, where
 * a throw would be an uncaught exception in the extension host. It is typed `void` on purpose —
 * a promise-returning `flush` has to handle its own rejections.
 */
export function createEventCoalescer<T>(
  flush: (batch: ReadonlyMap<string, T>) => void,
  delayMs: number,
): EventCoalescer<T> {
  let pending = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flushWindow = (): void => {
    timer = undefined;
    // Swap before calling out: a push made from inside `flush` then starts the next window
    // instead of being added to — or wiped from — the batch being handed over.
    const batch = pending;
    pending = new Map();
    try {
      flush(batch);
    } catch (err) {
      logDebug(`eventCoalescer: flush failed: ${String(err)}`);
    }
  };

  return {
    push(key, value) {
      pending.set(key, value);
      timer ??= setTimeout(flushWindow, delayMs);
    },
    cancel() {
      clearTimeout(timer);
      timer = undefined;
      pending = new Map();
    },
  };
}
