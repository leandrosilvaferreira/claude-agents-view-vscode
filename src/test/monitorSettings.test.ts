import { describe, it, expect } from 'vitest';
import { DEFAULT_MONITOR_SETTINGS, normalizeMonitorSettings } from '../monitorSettings';
import { IDLE_CEILING, RECENT_WRITE } from '../sessionActivity';

describe('DEFAULT_MONITOR_SETTINGS', () => {
  it('uses the shared RECENT_WRITE as the activity window, so the default has one definition', () => {
    expect(DEFAULT_MONITOR_SETTINGS.activityWindowMs).toBe(RECENT_WRITE);
  });

  it('polls every 15 seconds', () => {
    expect(DEFAULT_MONITOR_SETTINGS.pollIntervalMs).toBe(15_000);
  });
});

describe('normalizeMonitorSettings', () => {
  it('returns the defaults when nothing is configured', () => {
    expect(normalizeMonitorSettings({})).toEqual(DEFAULT_MONITOR_SETTINGS);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a numeric string', '60'],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['a boolean', true],
    ['an object', {}],
  ])('falls back to the defaults for %s', (_label, value) => {
    expect(normalizeMonitorSettings({ activityWindowSeconds: value, pollIntervalSeconds: value })).toEqual(
      DEFAULT_MONITOR_SETTINGS,
    );
  });

  it('converts in-range seconds to milliseconds', () => {
    expect(normalizeMonitorSettings({ activityWindowSeconds: 120, pollIntervalSeconds: 30 })).toEqual({
      activityWindowMs: 120_000,
      pollIntervalMs: 30_000,
    });
  });

  it('accepts the minimum and the maximum of each field as they are', () => {
    expect(normalizeMonitorSettings({ activityWindowSeconds: 10, pollIntervalSeconds: 10 })).toEqual({
      activityWindowMs: 10_000,
      pollIntervalMs: 10_000,
    });
    expect(normalizeMonitorSettings({ activityWindowSeconds: 1800, pollIntervalSeconds: 30 })).toEqual({
      activityWindowMs: 1_800_000,
      pollIntervalMs: 30_000,
    });
  });

  // 0 and negatives are real numbers, not "unset": they must clamp to the minimum rather than fall
  // back to the default, and never reach a timer (a 0 ms interval would spin hot).
  it.each([[5], [0], [-30]])('raises %s seconds to the 10 second minimum on both fields', (seconds) => {
    expect(normalizeMonitorSettings({ activityWindowSeconds: seconds, pollIntervalSeconds: seconds })).toEqual({
      activityWindowMs: 10_000,
      pollIntervalMs: 10_000,
    });
  });

  it('caps the activity window at 1800 seconds, the idle ceiling that keeps computeSessionStatus ordered', () => {
    const { activityWindowMs } = normalizeMonitorSettings({ activityWindowSeconds: 86_400 });

    expect(activityWindowMs).toBe(1_800_000);
    expect(activityWindowMs).toBe(IDLE_CEILING);
  });

  // 60 was the maximum before the ceiling came down to 30: a value that used to be valid must now clamp.
  it.each([[31], [60], [3600]])('caps the poll interval at 30 seconds (%s s)', (seconds) => {
    expect(normalizeMonitorSettings({ pollIntervalSeconds: seconds }).pollIntervalMs).toBe(30_000);
  });

  it.each([
    ['rounds down', 59.4, 59_000],
    ['rounds half up', 59.5, 60_000],
    ['rounds up', 59.6, 60_000],
    ['clamps a fraction below the minimum', 9.4, 10_000],
    ['clamps a fraction above the maximum', 1800.6, 1_800_000],
  ])('activity window %s (%s s)', (_label, seconds, expectedMs) => {
    expect(normalizeMonitorSettings({ activityWindowSeconds: seconds }).activityWindowMs).toBe(expectedMs);
  });

  it('rounds the poll interval to whole seconds too', () => {
    expect(normalizeMonitorSettings({ pollIntervalSeconds: 14.6 }).pollIntervalMs).toBe(15_000);
  });

  it.each([
    {
      label: 'a missing poll interval',
      raw: { activityWindowSeconds: 120 },
      expectedWindowMs: 120_000,
      expectedPollMs: 15_000,
    },
    { label: 'a missing window', raw: { pollIntervalSeconds: 30 }, expectedWindowMs: 60_000, expectedPollMs: 30_000 },
    {
      label: 'an unusable window',
      raw: { activityWindowSeconds: 'soon', pollIntervalSeconds: 30 },
      expectedWindowMs: 60_000,
      expectedPollMs: 30_000,
    },
    {
      label: 'an unusable poll interval',
      raw: { activityWindowSeconds: 120, pollIntervalSeconds: NaN },
      expectedWindowMs: 120_000,
      expectedPollMs: 15_000,
    },
  ])('normalizes each field on its own with $label', ({ raw, expectedWindowMs, expectedPollMs }) => {
    expect(normalizeMonitorSettings(raw)).toEqual({
      activityWindowMs: expectedWindowMs,
      pollIntervalMs: expectedPollMs,
    });
  });
});
