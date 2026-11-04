/**
 * src/data/weather.js
 * Open-Meteo forecast + geocoding adapter.
 *
 * @typedef {{ name: string, lat: number, lon: number, country: string }} GeoResult
 * @typedef {{ description: string, temp: number, windSpeed: number, weatherCode: number }} CurrentWeather
 * @typedef {{ date: string, maxTemp: number, minTemp: number, weatherCode: number }} DailyForecast
 * @typedef {{ hour: string, temp: number }} HourlyTemp
 *
 * @typedef {{
 *   city: string,
 *   current: CurrentWeather,
 *   hourly: HourlyTemp[],   // next 24 hours
 *   daily: DailyForecast[], // 5 days
 *   stale: boolean,
 *   cacheTs: number|null
 * }} WeatherData
 */

import { fetchWithCache } from './fetcher.js';

const FORECAST_BASE  = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search';

// WMO weather codes → terse teletext descriptions
const WMO_DESCRIPTIONS = {
  0:  'CLEAR SKY',
  1:  'MAINLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
  45: 'FOGGY',        48: 'RIME FOG',
  51: 'LIGHT DRIZZLE', 53: 'DRIZZLE',      55: 'HEAVY DRIZZLE',
  61: 'LIGHT RAIN',    63: 'RAIN',          65: 'HEAVY RAIN',
  71: 'LIGHT SNOW',    73: 'SNOW',          75: 'HEAVY SNOW',
  80: 'LIGHT SHOWERS', 81: 'SHOWERS',       82: 'VIOLENT SHOWERS',
  95: 'THUNDERSTORM',  96: 'HAIL STORM',    99: 'HEAVY HAIL',
};

/**
 * Map a WMO weather code to a teletext-style description.
 * @param {number} code
 */
export function weatherDescription(code) {
  return WMO_DESCRIPTIONS[code] ?? `CODE ${code}`;
}

/**
 * Search for a city by name.
 * @param {string} name
 * @returns {Promise<GeoResult[]>}
 */
export async function searchCity(name) {
  const url = `${GEOCODING_BASE}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  const { data } = await fetchWithCache(url, 86_400_000); // cache for 24 h
  const results = data?.results ?? [];
  return results.map((r) => ({
    name:    String(r.name ?? ''),
    lat:     Number(r.latitude  ?? 0),
    lon:     Number(r.longitude ?? 0),
    country: String(r.country_code ?? ''),
  }));
}

/**
 * Fetch weather for a given lat/lon.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} [cityName='']
 * @returns {Promise<WeatherData>}
 */
export async function getForecast(lat, lon, cityName = '') {
  const params = new URLSearchParams({
    latitude:        String(lat),
    longitude:       String(lon),
    current:         'temperature_2m,wind_speed_10m,weather_code',
    hourly:          'temperature_2m',
    daily:           'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days:   '5',
    timezone:        'auto',
    wind_speed_unit: 'kmh',
  });

  const url = `${FORECAST_BASE}?${params}`;
  const { data, stale } = await fetchWithCache(url);

  let cacheTs = null;
  if (stale) {
    try {
      const raw = localStorage.getItem(`gfx:${url}`);
      if (raw) cacheTs = JSON.parse(raw).ts;
    } catch { /* ignore */ }
  }

  if (!data) {
    return {
      city: cityName, current: null, hourly: [], daily: [],
      stale: true, cacheTs,
    };
  }

  return normaliseForecast(data, cityName, stale, cacheTs);
}

/**
 * Normalise raw Open-Meteo response.
 * @param {object} raw
 * @param {string} cityName
 * @param {boolean} stale
 * @param {number|null} cacheTs
 * @returns {WeatherData}
 */
export function normaliseForecast(raw, cityName = '', stale = false, cacheTs = null) {
  const cur = raw?.current ?? {};
  const current = {
    temp:        Math.round(Number(cur.temperature_2m     ?? 0)),
    windSpeed:   Math.round(Number(cur.wind_speed_10m    ?? 0)),
    weatherCode: Number(cur.weather_code ?? 0),
    description: weatherDescription(Number(cur.weather_code ?? 0)),
  };

  // Hourly — next 24 slots from now index 0.
  const hourlyTimes = raw?.hourly?.time             ?? [];
  const hourlyTemps = raw?.hourly?.temperature_2m   ?? [];
  const hourly = hourlyTimes.slice(0, 24).map((t, i) => ({
    hour: String(t).slice(11, 16), // "HH:MM"
    temp: Math.round(Number(hourlyTemps[i] ?? 0)),
  }));

  // Daily — 5 days.
  const dailyDates   = raw?.daily?.time                    ?? [];
  const dailyMax     = raw?.daily?.temperature_2m_max      ?? [];
  const dailyMin     = raw?.daily?.temperature_2m_min      ?? [];
  const dailyCodes   = raw?.daily?.weather_code            ?? [];
  const daily = dailyDates.slice(0, 5).map((date, i) => ({
    date:        String(date),
    maxTemp:     Math.round(Number(dailyMax[i]   ?? 0)),
    minTemp:     Math.round(Number(dailyMin[i]   ?? 0)),
    weatherCode: Number(dailyCodes[i] ?? 0),
  }));

  return { city: cityName, current, hourly, daily, stale, cacheTs };
}
