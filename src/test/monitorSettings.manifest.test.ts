import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ACTIVITY_WINDOW_SECONDS, POLL_INTERVAL_SECONDS } from '../monitorSettings';

interface SettingSchema {
  type?: unknown;
  default?: unknown;
  minimum?: unknown;
  maximum?: unknown;
  scope?: unknown;
}

function readSettingSchemas(): Record<string, SettingSchema | undefined> {
  const manifestPath = path.join(__dirname, '..', '..', 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    contributes: { configuration: { properties: Record<string, SettingSchema> } };
  };
  return manifest.contributes.configuration.properties;
}

// The manifest restates the numbers monitorSettings.ts clamps to, as the settings' schema, and
// nothing else ties the two together: edit one and the settings UI would advertise a range the
// code silently overrides (or the other way round).
describe('package.json setting schemas', () => {
  it.each([
    ['claudeAgentsMonitor.activityWindowSeconds', ACTIVITY_WINDOW_SECONDS],
    ['claudeAgentsMonitor.pollIntervalSeconds', POLL_INTERVAL_SECONDS],
  ])('%s declares the default and bounds the code clamps to', (key, bounds) => {
    const schema = readSettingSchemas()[key];

    expect(schema, `${key} is missing from contributes.configuration.properties`).toBeDefined();
    expect(schema).toMatchObject({
      type: 'integer',
      scope: 'application',
      default: bounds.default,
      minimum: bounds.min,
      maximum: bounds.max,
    });
  });
});
