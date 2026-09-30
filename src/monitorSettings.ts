import { IDLE_CEILING, RECENT_WRITE } from './sessionActivity';

/**
 * The user-facing knobs, already converted to the milliseconds the detection code consumes.
 * Read-only because DEFAULT_MONITOR_SETTINGS is one shared object that every provider without
 * explicit settings holds by reference: a write through one would retune them all.
 */
export interface MonitorSettings {
  readonly activityWindowMs: number;
  readonly pollIntervalMs: number;
}

interface SecondsBounds {
  readonly min: number;
  readonly max: number;
  readonly default: number;
}

/**
 * Bounds of `claudeAgentsMonitor.activityWindowSeconds`. The default is RECENT_WRITE so the
 * default has a single definition; the ceiling is IDLE_CEILING because a longer window would let
 * computeSessionStatus's recent-write check outrank its idle ceiling. The manifest's `package.json`
 * restates these numbers as the setting's schema — keep the two in step.
 */
export const ACTIVITY_WINDOW_SECONDS: SecondsBounds = {
  min: 10,
  max: IDLE_CEILING / 1000,
  default: RECENT_WRITE / 1000,
};

/** Bounds of `claudeAgentsMonitor.pollIntervalSeconds`, the period of the safety-net scan. */
export const POLL_INTERVAL_SECONDS: SecondsBounds = { min: 10, max: 30, default: 15 };

/**
 * Clamps at read time instead of trusting the manifest's min/max: a user can hand-edit
 * settings.json past the schema, and a 0 or negative interval would spin the timer hot. A value
 * that is not a finite number counts as unset and takes the default; a finite one is rounded to
 * whole seconds first, then clamped.
 */
function toClampedMilliseconds(raw: unknown, bounds: SecondsBounds): number {
  const seconds = typeof raw === 'number' && Number.isFinite(raw) ? raw : bounds.default;
  return Math.min(Math.max(Math.round(seconds), bounds.min), bounds.max) * 1000;
}

export function normalizeMonitorSettings(raw: {
  activityWindowSeconds?: unknown;
  pollIntervalSeconds?: unknown;
}): MonitorSettings {
  return {
    activityWindowMs: toClampedMilliseconds(raw.activityWindowSeconds, ACTIVITY_WINDOW_SECONDS),
    pollIntervalMs: toClampedMilliseconds(raw.pollIntervalSeconds, POLL_INTERVAL_SECONDS),
  };
}

export const DEFAULT_MONITOR_SETTINGS: MonitorSettings = normalizeMonitorSettings({});
