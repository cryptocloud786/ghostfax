/**
 * tests/weather.test.js
 * Unit tests for src/data/weather.js normalisers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normaliseForecast, weatherDescription, pickHourlySlice } from '../src/data/weather.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture   = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures/openmeteo-forecast.json'), 'utf8')
);

describe('weatherDescription', () => {
  it('returns a string for known codes', () => {
    assert.equal(weatherDescription(0),  'CLEAR SKY');
    assert.equal(weatherDescription(61), 'LIGHT RAIN');
    assert.equal(weatherDescription(95), 'THUNDERSTORM');
  });

  it('returns a fallback for unknown codes', () => {
    const desc = weatherDescription(999);
    assert.ok(typeof desc === 'string');
    assert.ok(desc.length > 0);
  });
});

describe('normaliseForecast', () => {
  it('returns an object with required keys', () => {
    const result = normaliseForecast(fixture, 'London');
    assert.ok('city'    in result);
    assert.ok('current' in result);
    assert.ok('hourly'  in result);
    assert.ok('daily'   in result);
    assert.ok('stale'   in result);
    assert.ok('cacheTs' in result);
  });

  it('city is preserved', () => {
    const result = normaliseForecast(fixture, 'London');
    assert.equal(result.city, 'London');
  });

  it('current has temp, windSpeed, description, weatherCode', () => {
    const { current } = normaliseForecast(fixture, 'London');
    assert.equal(typeof current.temp,        'number');
    assert.equal(typeof current.windSpeed,   'number');
    assert.equal(typeof current.description, 'string');
    assert.equal(typeof current.weatherCode, 'number');
  });

  it('current temp is rounded integer', () => {
    const { current } = normaliseForecast(fixture, 'London');
    assert.equal(current.temp, Math.round(fixture.current.temperature_2m));
  });

  it('current description matches weatherCode', () => {
    const { current } = normaliseForecast(fixture, 'London');
    assert.equal(current.description, weatherDescription(fixture.current.weather_code));
  });

  it('hourly has up to 24 entries', () => {
    const { hourly } = normaliseForecast(fixture, 'London');
    assert.ok(hourly.length <= 24);
    assert.ok(hourly.length > 0);
  });

  it('each hourly entry has hour (HH:MM) and temp (number)', () => {
    const { hourly } = normaliseForecast(fixture, 'London');
    for (const h of hourly) {
      assert.equal(typeof h.hour, 'string');
      assert.ok(/^\d{2}:\d{2}$/.test(h.hour), `bad hour format: "${h.hour}"`);
      assert.equal(typeof h.temp, 'number');
    }
  });

  it('daily has up to 5 entries', () => {
    const { daily } = normaliseForecast(fixture, 'London');
    assert.ok(daily.length <= 5);
    assert.ok(daily.length > 0);
  });

  it('each daily entry has date, maxTemp, minTemp, weatherCode', () => {
    const { daily } = normaliseForecast(fixture, 'London');
    for (const d of daily) {
      assert.equal(typeof d.date,        'string');
      assert.equal(typeof d.maxTemp,     'number');
      assert.equal(typeof d.minTemp,     'number');
      assert.equal(typeof d.weatherCode, 'number');
    }
  });

  it('daily maxTemp >= daily minTemp', () => {
    const { daily } = normaliseForecast(fixture, 'London');
    for (const d of daily) {
      assert.ok(d.maxTemp >= d.minTemp,
        `maxTemp ${d.maxTemp} < minTemp ${d.minTemp} on ${d.date}`);
    }
  });

  it('handles empty/missing data gracefully', () => {
    const result = normaliseForecast({}, 'Unknown');
    assert.equal(result.hourly.length, 0);
    assert.equal(result.daily.length,  0);
  });

  it('current has time string', () => {
    const result = normaliseForecast(fixture, 'London');
    assert.equal(typeof result.current.time, 'string');
    assert.equal(result.current.time, fixture.current.time);
  });
});

// ── pickHourlySlice ────────────────────────────────────────────────────────

describe('pickHourlySlice', () => {
  it('starts at the matching current hour', () => {
    const slice = pickHourlySlice(fixture);
    // fixture current.time = "2025-10-31T09:00", so index 9 in the hourly array
    assert.equal(slice.length, 24);
    assert.equal(slice[0].hour, '09:00');
  });

  it('returns up to 24 entries', () => {
    const slice = pickHourlySlice(fixture);
    assert.ok(slice.length <= 24);
  });

  it('each entry has hour (HH:MM) and temp (number)', () => {
    const slice = pickHourlySlice(fixture);
    for (const h of slice) {
      assert.ok(/^\d{2}:\d{2}$/.test(h.hour), `bad hour: "${h.hour}"`);
      assert.equal(typeof h.temp, 'number');
    }
  });

  it('falls back to index 0 when current.time is absent', () => {
    const raw = { ...fixture, current: { temperature_2m: 10, wind_speed_10m: 5, weather_code: 0 } };
    const slice = pickHourlySlice(raw);
    assert.equal(slice[0].hour, '00:00');
  });

  it('falls back to index 0 when current.time has no matching slot', () => {
    const raw = { ...fixture, current: { ...fixture.current, time: '2099-01-01T00:00' } };
    const slice = pickHourlySlice(raw);
    assert.equal(slice[0].hour, '00:00');
  });

  it('handles empty hourly data', () => {
    const slice = pickHourlySlice({});
    assert.equal(slice.length, 0);
  });
});
