/**
 * Wraps an async task so two runs never overlap. A call while nothing is running starts the task.
 * Calls that arrive during a run do NOT start another: they share ONE follow-up run that starts
 * the moment the current one settles, and all receive its promise. A call during the follow-up
 * queues the next follow-up, so a burst of N triggers costs at most two runs, never N.
 *
 * A rejected run rejects only the callers holding its promise and never wedges the lock: the
 * queued follow-up still runs. Callers MUST attach a rejection handler: the run a caller launches
 * is pre-handled internally, so dropping its promise swallows the rejection silently, while a
 * dropped queued follow-up promise surfaces as an `unhandledRejection`. Used by the provider so
 * the tick, a manual refresh and a scan kicked off at activation cannot pile up on each other.
 */
export function singleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | undefined;
  let followUp: Promise<T> | undefined;

  const launch = (): Promise<T> => {
    // `async` turns a synchronous throw from `task` into a rejection, so a misbehaving task can
    // neither escape the wrapper nor leave the lock held.
    const run = (async (): Promise<T> => task())();
    inFlight = run;
    // Skipped while a follow-up is pending: the lock then passes straight to it. Releasing here
    // anyway would open a gap in which a caller re-invoking from its own completion handler
    // starts a run that overlaps the follow-up.
    const release = (): void => {
      if (followUp === undefined) inFlight = undefined;
    };
    run.then(release, release);
    return run;
  };

  const launchFollowUp = (): Promise<T> => {
    followUp = undefined;
    return launch();
  };

  return (): Promise<T> => {
    if (inFlight === undefined) return launch();
    followUp ??= inFlight.then(launchFollowUp, launchFollowUp);
    return followUp;
  };
}
