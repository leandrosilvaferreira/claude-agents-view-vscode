import { describe, it, expect } from 'vitest';
import { singleFlight } from '../singleFlight';

interface Gate {
  resolve: () => void;
  reject: (reason: Error) => void;
}

interface GatedTask {
  task: () => Promise<number>;
  /** `gates[n]` settles the (n + 1)-th run, which resolves to its own 1-based run number. */
  gates: Gate[];
  stats: { executions: number; maxConcurrent: number };
}

/**
 * A task whose every run stays pending until the test settles it, so overlap between runs is
 * observable: `maxConcurrent` counts how many runs were pending at the same instant.
 */
function createGatedTask(): GatedTask {
  const gates: Gate[] = [];
  const stats = { executions: 0, maxConcurrent: 0 };
  let running = 0;
  const task = (): Promise<number> => {
    stats.executions += 1;
    const runNumber = stats.executions;
    running += 1;
    stats.maxConcurrent = Math.max(stats.maxConcurrent, running);
    return new Promise<number>((resolve, reject) => {
      gates.push({
        resolve: () => {
          running -= 1;
          resolve(runNumber);
        },
        reject: (reason) => {
          running -= 1;
          reject(reason);
        },
      });
    });
  };
  return { task, gates, stats };
}

/** Lets every pending promise reaction run: a macrotask boundary, so no timer is involved. */
function settlePromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('singleFlight', () => {
  it('runs the task on every call when calls never overlap', async () => {
    const { task, gates, stats } = createGatedTask();
    const flight = singleFlight(task);

    const first = flight();
    gates[0].resolve();
    const firstValue = await first;
    const second = flight();
    gates[1].resolve();
    const secondValue = await second;

    expect([firstValue, secondValue]).toEqual([1, 2]);
    expect(stats.executions).toBe(2);
  });

  it('collapses five concurrent calls into exactly two runs that never overlap', async () => {
    const { task, gates, stats } = createGatedTask();
    const flight = singleFlight(task);

    const calls = [flight(), flight(), flight(), flight(), flight()];
    expect(stats.executions).toBe(1);

    gates[0].resolve();
    await settlePromises();
    expect(stats.executions).toBe(2);

    gates[1].resolve();
    await Promise.all(calls);
    expect(stats.executions).toBe(2);
    expect(stats.maxConcurrent).toBe(1);
  });

  it('hands every caller that arrived during a run the follow-up run result', async () => {
    const { task, gates } = createGatedTask();
    const flight = singleFlight(task);

    const calls = [flight(), flight(), flight(), flight(), flight()];
    gates[0].resolve();
    await settlePromises();
    gates[1].resolve();

    expect(await Promise.all(calls)).toEqual([1, 2, 2, 2, 2]);
  });

  it('queues the next follow-up when a call arrives during the follow-up run', async () => {
    const { task, gates, stats } = createGatedTask();
    const flight = singleFlight(task);

    const first = flight();
    const second = flight();
    gates[0].resolve();
    await settlePromises();
    const third = flight();
    expect(stats.executions).toBe(2);

    gates[1].resolve();
    await settlePromises();
    expect(stats.executions).toBe(3);

    gates[2].resolve();
    expect(await Promise.all([first, second, third])).toEqual([1, 2, 3]);
    expect(stats.maxConcurrent).toBe(1);
  });

  it('never overlaps runs when a caller re-invokes from its own completion handler', async () => {
    const { task, gates, stats } = createGatedTask();
    const flight = singleFlight(task);

    // The re-invocation is registered BEFORE the follow-up is queued, so it fires between the
    // run settling and the follow-up starting — the window where a second run could slip in.
    const first = flight();
    const reinvoked = first.then(() => flight());
    const queued = flight();
    gates[0].resolve();
    await settlePromises();
    gates[1].resolve();

    expect(await Promise.all([reinvoked, queued])).toEqual([2, 2]);
    expect(stats.executions).toBe(2);
    expect(stats.maxConcurrent).toBe(1);
  });

  it('rejects the caller of a failing run and releases the lock', async () => {
    const { task, gates, stats } = createGatedTask();
    const flight = singleFlight(task);

    const failing = flight();
    const failure = expect(failing).rejects.toThrow('boom');
    gates[0].reject(new Error('boom'));
    await failure;

    const next = flight();
    expect(stats.executions).toBe(2);
    gates[1].resolve();
    expect(await next).toBe(2);
  });

  it('still starts the queued follow-up after the running one fails', async () => {
    const { task, gates } = createGatedTask();
    const flight = singleFlight(task);

    const first = flight();
    const queued = flight();
    const failure = expect(first).rejects.toThrow('boom');
    gates[0].reject(new Error('boom'));
    await settlePromises();
    gates[1].resolve();

    await failure;
    expect(await queued).toBe(2);
  });

  it('rejects every caller queued on a failing follow-up and releases the lock', async () => {
    const { task, gates, stats } = createGatedTask();
    const flight = singleFlight(task);

    const first = flight();
    const queuedA = flight();
    const queuedB = flight();
    gates[0].resolve();
    await first;
    await settlePromises();
    const failures = [
      expect(queuedA).rejects.toThrow('follow-up failed'),
      expect(queuedB).rejects.toThrow('follow-up failed'),
    ];
    gates[1].reject(new Error('follow-up failed'));
    await Promise.all(failures);

    const next = flight();
    expect(stats.executions).toBe(3);
    gates[2].resolve();
    expect(await next).toBe(3);
  });

  it('turns a synchronous throw from the task into a rejection and releases the lock', async () => {
    let attempts = 0;
    const flight = singleFlight((): Promise<number> => {
      attempts += 1;
      throw new Error('sync boom');
    });

    await expect(flight()).rejects.toThrow('sync boom');
    await expect(flight()).rejects.toThrow('sync boom');

    expect(attempts).toBe(2);
  });
});
