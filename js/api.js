// VYOMA Atmospheric Intelligence - Open-Meteo Suite API Client
// Provides live geocoding, forecast telemetry, air quality index, and 5-year ERA5 historical archive

const CACHE_PREFIX = "vyoma_v4_cache_";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for live weather & AQI
const CLIMATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for 5-year ERA5 archive

export function getCached(key, ttl = CACHE_TTL_MS) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  } catch (e) {
    console.warn("Storage read error:", e);
  }
  return null;
}

export function setCached(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (e) {
    console.warn("Storage write error:", e);
  }
}

async function fetchWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search locations via Open-Meteo Geocoding API
 */
export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];

  const coordMatch = query.trim().match(/^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [{
        id: `coord_${lat}_${lon}`,
        name: `Coordinates (${lat.toFixed(2)}\u00B0, ${lon.toFixed(2)}\u00B0)`,
        latitude: lat,
        longitude: lon,
        country: "Custom Coordinates",
        country_code: "GEO",
        admin1: "Geographic Point",
        timezone: "auto"
      }];
    }
  }

  const cacheKey = `geo_${query.trim().toLowerCase()}`;
  const cached = getCached(cacheKey, 60 * 60 * 1000);
  if (cached) return cached;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) throw new Error(`Geocoding HTTP error ${res.status}`);
    const data = await res.json();
    const results = (data.results || []).map(item => ({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      elevation: item.elevation,
      timezone: item.timezone || "auto",
      country_code: item.country_code ? item.country_code.toUpperCase() : "",
      country: item.country || "",
      admin1: item.admin1 || ""
    }));

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    console.warn("Search cities failed, checking offline presets:", err);
    return filterPresetCities(query);
  }
}

/**
 * Reverse geocode coordinate point
 */
export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetchWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      6000
    );
    if (res.ok) {
      const data = await res.json();
      return {
        id: `geo_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        name: data.locality || data.city || data.principalSubdivision || `Location (${lat.toFixed(2)}\u00B0, ${lon.toFixed(2)}\u00B0)`,
        country: data.countryName || "Earth Telemetry",
        country_code: data.countryCode || "LOC",
        admin1: data.principalSubdivision || "",
        latitude: lat,
        longitude: lon,
        timezone: "auto"
      };
    }
  } catch (e) {
    console.warn("Reverse geocode fallback to coords:", e);
  }

  return {
    id: `geo_${lat.toFixed(3)}_${lon.toFixed(3)}`,
    name: `Point (${lat.toFixed(2)}\u00B0, ${lon.toFixed(2)}\u00B0)`,
    country: "Custom Coordinates",
    country_code: "LOC",
    admin1: "",
    latitude: lat,
    longitude: lon,
    timezone: "auto"
  };
}

/**
 * Primary Forecast API: Current, Hourly (48h+), 7-Day Daily
 */
export async function getLiveWeather(lat, lon, timezone = "auto", forceRefresh = false) {
  const cacheKey = `weather_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = !forceRefresh ? getCached(cacheKey) : null;
  if (cached) return cached;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,visibility,wind_speed_10m,wind_direction_10m,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=${encodeURIComponent(timezone)}`;

  try {
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) throw new Error(`Weather API HTTP error ${res.status}`);
    const data = await res.json();
    const enriched = { ...data, _source: "Open-Meteo Live", _fetchedAt: Date.now() };
    setCached(cacheKey, enriched);
    return enriched;
  } catch (err) {
    console.warn("Live weather fetch failed; checking cache or fallback:", err);
    const stale = getCached(cacheKey, 24 * 60 * 60 * 1000);
    if (stale) return stale;
    return getSyntheticWeatherData(lat, lon, timezone);
  }
}

/**
 * Air Quality API: US AQI, European AQI, PM2.5, PM10, CO, SO2
 */
export async function getAirQuality(lat, lon, timezone = "auto", forceRefresh = false) {
  const cacheKey = `aqi_${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = !forceRefresh ? getCached(cacheKey) : null;
  if (cached) return cached;

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=${encodeURIComponent(timezone)}`;

  try {
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) throw new Error(`Air Quality API HTTP error ${res.status}`);
    const data = await res.json();
    const enriched = { ...data, _source: "Open-Meteo CAMS", _fetchedAt: Date.now() };
    setCached(cacheKey, enriched);
    return enriched;
  } catch (err) {
    console.warn("Air Quality API failed; checking cache or fallback:", err);
    const stale = getCached(cacheKey, 24 * 60 * 60 * 1000);
    if (stale) return stale;
    return getSyntheticAirQualityData();
  }
}

/**
 * 5-Year Historical Climate Archive (2021 - 2025 ERA5)
 */
export async function getHistoricalClimate(lat, lon, cityName = "this location", forceRefresh = false) {
  const cacheKey = `climate_era5_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = !forceRefresh ? getCached(cacheKey, CLIMATE_CACHE_TTL_MS) : null;
  if (cached) return cached;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2021-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum&timezone=auto`;

  try {
    const res = await fetchWithTimeout(url, 15000);
    if (!res.ok) throw new Error(`Archive API HTTP error ${res.status}`);
    const raw = await res.json();
    const processed = processEra5Dataset(raw, cityName);
    setCached(cacheKey, processed);
    return processed;
  } catch (err) {
    console.warn("Historical Archive API failed; generating calibrated fallback:", err);
    const stale = getCached(cacheKey, 30 * 24 * 60 * 60 * 1000);
    if (stale) return stale;
    return generateCalibratedClimateData(lat, lon, cityName);
  }
}

/**
 * Process raw daily ERA5 dataset into yearly aggregated climate intelligence
 */
function processEra5Dataset(raw, cityName) {
  if (!raw || !raw.daily || !raw.daily.time) {
    throw new Error("Invalid ERA5 payload");
  }

  const times = raw.daily.time;
  const tMean = raw.daily.temperature_2m_mean || [];
  const tMax = raw.daily.temperature_2m_max || [];
  const tMin = raw.daily.temperature_2m_min || [];
  const precip = raw.daily.precipitation_sum || [];

  const yearly = {
    2021: { temps: [], maxTemps: [], minTemps: [], precipTotal: 0, wetDays: 0, validPrecipDays: 0 },
    2022: { temps: [], maxTemps: [], minTemps: [], precipTotal: 0, wetDays: 0, validPrecipDays: 0 },
    2023: { temps: [], maxTemps: [], minTemps: [], precipTotal: 0, wetDays: 0, validPrecipDays: 0 },
    2024: { temps: [], maxTemps: [], minTemps: [], precipTotal: 0, wetDays: 0, validPrecipDays: 0 },
    2025: { temps: [], maxTemps: [], minTemps: [], precipTotal: 0, wetDays: 0, validPrecipDays: 0 }
  };

  for (let i = 0; i < times.length; i++) {
    const year = times[i].substring(0, 4);
    const bucket = yearly[year];
    if (!bucket) continue;

    let meanVal = tMean[i];
    if ((meanVal === null || meanVal === undefined || isNaN(meanVal)) &&
        tMax[i] !== null && tMin[i] !== null && !isNaN(tMax[i]) && !isNaN(tMin[i])) {
      meanVal = (tMax[i] + tMin[i]) / 2;
    }
    if (meanVal !== null && meanVal !== undefined && !isNaN(meanVal)) {
      bucket.temps.push(meanVal);
    }
    if (tMax[i] !== null && tMax[i] !== undefined && !isNaN(tMax[i])) {
      bucket.maxTemps.push(tMax[i]);
    }
    if (tMin[i] !== null && tMin[i] !== undefined && !isNaN(tMin[i])) {
      bucket.minTemps.push(tMin[i]);
    }
    if (precip[i] !== null && precip[i] !== undefined && !isNaN(precip[i])) {
      bucket.precipTotal += precip[i];
      bucket.validPrecipDays++;
      if (precip[i] >= 1.0) bucket.wetDays++;
    }
  }

  const years = [2021, 2022, 2023, 2024, 2025];
  const summaryByYear = years.map(yr => {
    const data = yearly[yr];
    const avgTempExact = data.temps.length > 0
      ? data.temps.reduce((a, b) => a + b, 0) / data.temps.length
      : 20.0;
    const peakTemp = data.maxTemps.length > 0
      ? Math.max(...data.maxTemps)
      : 35.0;
    const lowTemp = data.minTemps.length > 0
      ? Math.min(...data.minTemps)
      : 10.0;
    return {
      year: yr,
      avgTempExact,
      avgTemp: parseFloat(avgTempExact.toFixed(1)),
      peakTemp: parseFloat(peakTemp.toFixed(1)),
      lowTemp: parseFloat(lowTemp.toFixed(1)),
      annualRainfall: Math.round(data.precipTotal),
      wetDays: data.wetDays,
      daysObserved: data.temps.length
    };
  });

  // Compute exact unrounded delta from 2021 baseline to 2025
  const tempShift = parseFloat((summaryByYear[4].avgTempExact - summaryByYear[0].avgTempExact).toFixed(2));
  const tempShiftRounded = parseFloat(tempShift.toFixed(1));

  // Linear regression slope across 2021..2025 (x = 0..4)
  const n = summaryByYear.length;
  const meanX = 2;
  const meanY = summaryByYear.reduce((s, y) => s + y.avgTempExact, 0) / n;
  const num = summaryByYear.reduce((s, y, idx) => s + (idx - meanX) * (y.avgTempExact - meanY), 0);
  const den = summaryByYear.reduce((s, _, idx) => s + (idx - meanX) * (idx - meanX), 0);
  const slopePerYear = den ? num / den : 0;

  const avgAnnualRain = Math.round(
    summaryByYear.reduce((acc, y) => acc + y.annualRainfall, 0) / n
  );
  const avgWetDays = Math.round(
    summaryByYear.reduce((acc, y) => acc + y.wetDays, 0) / n
  );
  const highestRecorded = Math.max(...summaryByYear.map(y => y.peakTemp));
  const wettestYear = summaryByYear.reduce((best, cur) =>
    cur.annualRainfall > best.annualRainfall ? cur : best, summaryByYear[0]);
  const driestYear = summaryByYear.reduce((best, cur) =>
    cur.annualRainfall < best.annualRainfall ? cur : best, summaryByYear[0]);
  const warmestYear = summaryByYear.reduce((best, cur) =>
    cur.avgTempExact > best.avgTempExact ? cur : best, summaryByYear[0]);

  const deltaDisplay = `${tempShiftRounded > 0 ? "+" : ""}${tempShiftRounded.toFixed(1)}\u00B0C`;
  const shiftLabel = tempShiftRounded > 0.1
    ? `a ${deltaDisplay} warming shift`
    : tempShiftRounded < -0.1
      ? `a ${deltaDisplay} cooling shift`
      : `a stable ${deltaDisplay} thermal change`;

  const insightText = `ERA5 reanalysis for ${cityName} shows ${shiftLabel} between 2021 (${summaryByYear[0].avgTemp}\u00B0C) and 2025 (${summaryByYear[4].avgTemp}\u00B0C), with ${warmestYear.year} as the warmest year (${warmestYear.avgTemp}\u00B0C avg, ${highestRecorded}\u00B0C peak). Annual rainfall averaged ${avgAnnualRain} mm across ${avgWetDays} wet days/yr (\u2265 1 mm), ranging from ${driestYear.annualRainfall} mm (${driestYear.year}) to ${wettestYear.annualRainfall} mm (${wettestYear.year}).`;

  return {
    _source: "ERA5 Reanalysis",
    years: summaryByYear,
    kpis: {
      tempShift: tempShiftRounded,
      tempShiftExact: tempShift,
      slopePerYear: parseFloat(slopePerYear.toFixed(2)),
      avgAnnualRain,
      avgWetDays,
      highestRecorded
    },
    insight: insightText
  };
}

/**
 * Calibrated fallback ONLY if ERA5 network request fails
 */
function generateCalibratedClimateData(lat, lon, cityName) {
  const baseTemp = Math.max(12, 30 - Math.abs(lat) * 0.38);
  const baseRain = Math.abs(lat) < 25 ? 960 : 760;

  const years = [2021, 2022, 2023, 2024, 2025];
  const shifts = [-0.2, 0.1, 0.3, 0.5, 0.7];
  const rainVary = [910, 990, 880, 1080, 950];
  const wetDaysVary = [88, 96, 82, 105, 92];

  const summaryByYear = years.map((yr, idx) => ({
    year: yr,
    avgTempExact: baseTemp + shifts[idx],
    avgTemp: parseFloat((baseTemp + shifts[idx]).toFixed(1)),
    peakTemp: parseFloat((baseTemp + 11.5 + shifts[idx] * 0.8).toFixed(1)),
    lowTemp: parseFloat((baseTemp - 8.5).toFixed(1)),
    annualRainfall: Math.round(baseRain * (rainVary[idx] / 1000)),
    wetDays: Math.round(wetDaysVary[idx] * (baseRain / 900)),
    daysObserved: 365
  }));

  const tempShift = parseFloat((summaryByYear[4].avgTempExact - summaryByYear[0].avgTempExact).toFixed(1));
  const avgAnnualRain = Math.round(
    summaryByYear.reduce((acc, y) => acc + y.annualRainfall, 0) / summaryByYear.length
  );
  const avgWetDays = Math.round(
    summaryByYear.reduce((acc, y) => acc + y.wetDays, 0) / summaryByYear.length
  );
  const highestRecorded = Math.max(...summaryByYear.map(y => y.peakTemp));

  return {
    _source: "Offline Estimate",
    years: summaryByYear,
    kpis: {
      tempShift,
      tempShiftExact: tempShift,
      slopePerYear: 0.22,
      avgAnnualRain,
      avgWetDays,
      highestRecorded
    },
    insight: `Offline estimate (ERA5 archive unreachable) for ${cityName}: ~${tempShift > 0 ? "+" : ""}${tempShift}\u00B0C delta, ~${avgAnnualRain} mm/yr rainfall, and ~${avgWetDays} wet days/yr.`
  };
}

/**
 * Preset Cities (Landing & World Radar Quick-Select)
 */
export const PRESET_CITIES = [
  {
    id: "vskp",
    name: "Visakhapatnam",
    country: "India",
    country_code: "IN",
    admin1: "Andhra Pradesh",
    latitude: 17.6868,
    longitude: 83.2185,
    timezone: "Asia/Kolkata"
  },
  {
    id: "mdnp",
    name: "Madanapalle",
    country: "India",
    country_code: "IN",
    admin1: "Andhra Pradesh",
    latitude: 13.5560,
    longitude: 78.5010,
    timezone: "Asia/Kolkata"
  },
  {
    id: "trpt",
    name: "Tirupati",
    country: "India",
    country_code: "IN",
    admin1: "Andhra Pradesh",
    latitude: 13.6288,
    longitude: 79.4192,
    timezone: "Asia/Kolkata"
  }
];

export const GLOBAL_RADAR_HUBS = [
  ...PRESET_CITIES,
  { id: "tokyo", name: "Tokyo", country: "Japan", country_code: "JP", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { id: "sgp", name: "Singapore", country: "Singapore", country_code: "SG", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { id: "dxb", name: "Dubai", country: "UAE", country_code: "AE", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { id: "cairo", name: "Cairo", country: "Egypt", country_code: "EG", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo" },
  { id: "london", name: "London", country: "United Kingdom", country_code: "GB", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { id: "rek", name: "Reykjavik", country: "Iceland", country_code: "IS", latitude: 64.1466, longitude: -21.9426, timezone: "Atlantic/Reykjavik" },
  { id: "nyc", name: "New York", country: "United States", country_code: "US", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { id: "gru", name: "Sao Paulo", country: "Brazil", country_code: "BR", latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo" },
  { id: "syd", name: "Sydney", country: "Australia", country_code: "AU", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" }
];

/**
 * Batched live weather snapshot for global radar hubs in a single Open-Meteo call
 */
export async function fetchGlobalHubSnapshots(hubs = GLOBAL_RADAR_HUBS) {
  const cacheKey = "global_radar_hubs";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const lats = hubs.map((h) => h.latitude.toFixed(4)).join(",");
    const lons = hubs.map((h) => h.longitude.toFixed(4)).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) throw new Error(`Global hubs HTTP ${res.status}`);
    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : [payload];
    const mapped = hubs.map((hub, idx) => ({
      ...hub,
      snapshot: list[idx]?.current || null
    }));
    setCached(cacheKey, mapped);
    return mapped;
  } catch (e) {
    console.warn("Global hubs snapshot fallback:", e);
    return hubs.map((h) => ({ ...h, snapshot: null }));
  }
}

/**
 * RainViewer Global Weather Radar + Infrared Cloud Satellite API (Free, No Key)
 */
export async function fetchGlobalRadarFrames() {
  try {
    const res = await fetchWithTimeout("https://api.rainviewer.com/public/weather-maps.json", 8000);
    if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    const data = await res.json();
    const host = data.host || "https://tilecache.rainviewer.com";
    const past = data.radar?.past || [];
    const nowcast = data.radar?.nowcast || [];
    const frames = [
      ...past.map((f) => ({ ...f, isNowcast: false })),
      ...nowcast.map((f) => ({ ...f, isNowcast: true }))
    ];
    const infrared = data.satellite?.infrared || [];
    const latestCloudPath = infrared.length > 0 ? infrared[infrared.length - 1].path : null;
    return { host, frames, latestCloudPath };
  } catch (e) {
    console.warn("RainViewer frames unavailable:", e);
    return { host: "https://tilecache.rainviewer.com", frames: [], latestCloudPath: null };
  }
}

const EXTRA_FALLBACK_CITIES = [
  ...PRESET_CITIES,
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    country_code: "IT",
    admin1: "Lazio",
    latitude: 41.9028,
    longitude: 12.4964,
    timezone: "Europe/Rome"
  }
];

function filterPresetCities(q) {
  const query = q.toLowerCase();
  return EXTRA_FALLBACK_CITIES.filter(
    c => c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query)
  );
}

/**
 * Offline fallback weather data
 */
export function getSyntheticWeatherData(lat, lon, timezone = "auto") {
  const now = new Date();
  const currentHour = now.getHours();
  const isDay = currentHour >= 6 && currentHour < 18 ? 1 : 0;

  let baseTemp = Math.round(26 - Math.abs(lat - 15) * 0.4);
  if (baseTemp < 10) baseTemp = 18;

  const hourlyTime = [];
  const hourlyTemp = [];
  const hourlyHumid = [];
  const hourlyPrecipProb = [];
  const hourlyWind = [];
  const hourlyUv = [];
  const hourlyCode = [];
  const hourlyIsDay = [];

  for (let i = 0; i < 24; i++) {
    const h = (currentHour + i) % 24;
    const d = new Date(now.getTime() + i * 3600000);
    const pad = (n) => String(n).padStart(2, "0");
    hourlyTime.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`);

    const diurnalCurve = -Math.cos(((h - 5) / 24) * 2 * Math.PI) * 4.5;
    hourlyTemp.push(Math.round((baseTemp + diurnalCurve) * 10) / 10);
    hourlyHumid.push(Math.min(95, Math.max(30, Math.round(65 - diurnalCurve * 3))));
    hourlyPrecipProb.push(Math.max(5, Math.round(Math.sin((h / 24) * Math.PI) * 35)));
    hourlyWind.push(Math.round(10 + Math.sin(h * 0.5) * 6));
    hourlyUv.push(h >= 7 && h <= 17 ? Math.max(0, Math.round(Math.sin(((h - 7) / 10) * Math.PI) * 7)) : 0);
    hourlyCode.push(diurnalCurve > 2 ? 1 : 2);
    hourlyIsDay.push(h >= 6 && h < 18 ? 1 : 0);
  }

  const dailyTime = [];
  const dailyMax = [];
  const dailyMin = [];
  const dailyCode = [];
  const dailyUvMax = [];
  const dailyPrecipSum = [];
  const dailyPrecipProbMax = [];
  const dailyWindMax = [];
  const dailySunrise = [];
  const dailySunset = [];

  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(now.getTime() + d * 86400000);
    const dateIso = dayDate.toISOString().substring(0, 10);
    dailyTime.push(dateIso);
    dailyMax.push(baseTemp + 4 + Math.round(Math.sin(d) * 2));
    dailyMin.push(baseTemp - 4 + Math.round(Math.cos(d) * 2));
    dailyCode.push([2, 80, 0, 95, 2, 1, 0][d % 7]);
    dailyUvMax.push(6);
    dailyPrecipSum.push(d === 1 || d === 3 ? 4.2 : 0);
    dailyPrecipProbMax.push(d === 3 ? 85 : d === 1 ? 45 : 15);
    dailyWindMax.push(18 + d);
    dailySunrise.push(`${dateIso}T06:07`);
    dailySunset.push(`${dateIso}T18:02`);
  }

  return {
    _source: "Offline Estimate",
    _fetchedAt: Date.now(),
    timezone,
    utc_offset_seconds: 0,
    current: {
      time: hourlyTime[0],
      temperature_2m: baseTemp,
      apparent_temperature: baseTemp + 1,
      relative_humidity_2m: 74,
      is_day: isDay,
      precipitation: 0.0,
      weather_code: 2,
      cloud_cover: 45,
      pressure_msl: 1012,
      surface_pressure: 1008,
      wind_speed_10m: 11.5,
      wind_direction_10m: 12,
      wind_gusts_10m: 18.0
    },
    hourly: {
      time: hourlyTime,
      temperature_2m: hourlyTemp,
      relative_humidity_2m: hourlyHumid,
      precipitation_probability: hourlyPrecipProb,
      wind_speed_10m: hourlyWind,
      wind_direction_10m: hourlyWind.map(() => 12),
      weather_code: hourlyCode,
      uv_index: hourlyUv,
      is_day: hourlyIsDay,
      visibility: hourlyTime.map(() => 8000),
      dew_point_2m: hourlyTemp.map(t => Math.round(t - 4)),
      pressure_msl: hourlyTime.map(() => 1012)
    },
    daily: {
      time: dailyTime,
      weather_code: dailyCode,
      temperature_2m_max: dailyMax,
      temperature_2m_min: dailyMin,
      sunrise: dailySunrise,
      sunset: dailySunset,
      uv_index_max: dailyUvMax,
      precipitation_sum: dailyPrecipSum,
      precipitation_probability_max: dailyPrecipProbMax,
      wind_speed_10m_max: dailyWindMax
    }
  };
}

export function getSyntheticAirQualityData() {
  return {
    _source: "Offline Estimate",
    _fetchedAt: Date.now(),
    current: {
      us_aqi: null,
      european_aqi: null,
      pm2_5: null,
      pm10: null,
      carbon_monoxide: null,
      sulphur_dioxide: null
    }
  };
}
