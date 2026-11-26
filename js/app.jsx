// VYOMA — Atmospheric Intelligence & Telemetry Application
const React = window.React;
const { useState, useEffect, useMemo, useRef, useCallback } = React;
import { Icon, WeatherGlyph, CelestialIllustration } from "./icons.js";
import { getWeatherMeta } from "./weather-codes.js";
import {
  PRESET_CITIES,
  GLOBAL_RADAR_HUBS,
  searchCities,
  getLiveWeather,
  getAirQuality,
  getHistoricalClimate,
  reverseGeocode,
  fetchGlobalHubSnapshots,
  fetchGlobalRadarFrames,
  getCached
} from "./api.js";

function useDragScroll() {
  const ref = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const onMouseDown = (e) => {
    const el = ref.current;
    if (!el) return;
    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false
    };
  };

  const onMouseLeave = () => {
    dragState.current.isDown = false;
  };

  const onMouseUp = () => {
    dragState.current.isDown = false;
  };

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!dragState.current.isDown || !el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.2;
    if (Math.abs(walk) > 4) dragState.current.moved = true;
    el.scrollLeft = dragState.current.scrollLeft - walk;
  };

  return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
}

function getWindCardinal(deg = 0) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getBeaufortForce(kmh = 0) {
  const thresholds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  for (let i = 0; i < thresholds.length; i++) {
    if (kmh <= thresholds[i]) return i;
  }
  return 12;
}

function getUvLabel(uv = 0) {
  if (uv <= 2) return "Weaker";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

function findCurrentHourIndex(hourlyTimes = [], currentTimeStr = "", timezone = "auto") {
  if (!hourlyTimes.length) return 0;
  if (currentTimeStr) {
    const hourPrefix = currentTimeStr.slice(0, 13);
    const exactIdx = hourlyTimes.findIndex((t) => t.startsWith(hourPrefix));
    if (exactIdx !== -1) return exactIdx;
  }
  try {
    const tz = timezone && timezone !== "auto" ? timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const prefix = `${map.year}-${map.month}-${map.day}T${map.hour}`;
    const idx = hourlyTimes.findIndex((t) => t.startsWith(prefix));
    if (idx !== -1) return idx;
  } catch (e) {}
  return 0;
}

function parseClockMinutes(isoLocalStr) {
  if (!isoLocalStr || !isoLocalStr.includes("T")) return null;
  const timePart = isoLocalStr.split("T")[1];
  const [hh, mm] = timePart.split(":").map((n) => parseInt(n, 10));
  if (isNaN(hh) || isNaN(mm)) return null;
  return { hh, mm, total: hh * 60 + mm, label: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` };
}

function getCityLocalMinutes(timezone, utcOffsetSeconds) {
  try {
    if (timezone && timezone !== "auto") {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(new Date());
      const hh = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10) % 24;
      const mm = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      return hh * 60 + mm;
    }
  } catch (e) {}
  if (typeof utcOffsetSeconds === "number") {
    const nowUtc = new Date(Date.now() + utcOffsetSeconds * 1000);
    return nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes();
  }
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function VyomaApp() {
  const [screen, setScreen] = useState("landing");
  const [radarReturnScreen, setRadarReturnScreen] = useState("landing");

  const [savedCities, setSavedCities] = useState(() => {
    try {
      const raw = localStorage.getItem("vyoma_saved_cities");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });

  const [activeCity, setActiveCity] = useState(null);

  // Dashboard telemetry state
  const [weatherData, setWeatherData] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  const [climateData, setClimateData] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [loadingClimate, setLoadingClimate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [telemetryExpanded, setTelemetryExpanded] = useState(true);
  const [climateMode, setClimateMode] = useState("temp");
  const [selectedYear, setSelectedYear] = useState(2025);

  useEffect(() => {
    try {
      localStorage.setItem("vyoma_saved_cities", JSON.stringify(savedCities));
    } catch (e) {}
  }, [savedCities]);

  // Fetch telemetry whenever entering dashboard for an activeCity
  const loadCityTelemetry = useCallback(async (cityObj, force = false) => {
    if (!cityObj) return;
    const lat = cityObj.latitude;
    const lon = cityObj.longitude;
    const tz = cityObj.timezone || "auto";

    const wKey = `weather_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const aKey = `aqi_${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cKey = `climate_era5_${lat.toFixed(2)}_${lon.toFixed(2)}`;

    if (force) {
      setRefreshing(true);
    } else {
      const cachedW = getCached(wKey);
      const cachedA = getCached(aKey);
      const cachedC = getCached(cKey, 24 * 60 * 60 * 1000);

      if (cachedW && cachedA) {
        setWeatherData(cachedW);
        setAqiData(cachedA);
        setLoadingTelemetry(false);
      } else {
        setWeatherData(cachedW || null);
        setAqiData(cachedA || null);
        setLoadingTelemetry(true);
      }

      if (cachedC) {
        setClimateData(cachedC);
        setLoadingClimate(false);
      } else {
        setClimateData(null);
        setLoadingClimate(true);
      }
    }

    try {
      const [liveW, liveA] = await Promise.all([
        getLiveWeather(lat, lon, tz, force),
        getAirQuality(lat, lon, tz, force)
      ]);
      setWeatherData(liveW);
      setAqiData(liveA);
    } finally {
      setLoadingTelemetry(false);
      setRefreshing(false);
    }

    try {
      const liveC = await getHistoricalClimate(lat, lon, cityObj.name, force);
      setClimateData(liveC);
    } finally {
      setLoadingClimate(false);
    }
  }, []);

  useEffect(() => {
    if (screen !== "dashboard" || !activeCity) return;
    loadCityTelemetry(activeCity, false);
  }, [screen, activeCity, loadCityTelemetry]);

  const handleSelectCity = (city) => {
    setActiveCity(city);
    setSelectedYear(2025);
    setScreen("dashboard");
  };

  const handleOpenRadar = (fromScreen) => {
    setRadarReturnScreen(fromScreen);
    setScreen("radar");
  };

  const isCitySaved = useMemo(() => {
    if (!activeCity) return false;
    return savedCities.some(
      (c) => c.name.toLowerCase() === activeCity.name.toLowerCase() &&
        Math.abs(c.latitude - activeCity.latitude) < 0.05
    );
  }, [savedCities, activeCity]);

  const toggleSaveCity = () => {
    if (!activeCity) return;
    if (isCitySaved) {
      setSavedCities((prev) =>
        prev.filter((c) => !(c.name.toLowerCase() === activeCity.name.toLowerCase() && Math.abs(c.latitude - activeCity.latitude) < 0.05))
      );
    } else {
      setSavedCities((prev) => [activeCity, ...prev].slice(0, 6));
    }
  };

  return (
    <div className="vyoma-viewport">
      <div className="vyoma-shell">
        {screen === "landing" && (
          <LandingPortalScreen
            onLaunchRadar={() => handleOpenRadar("landing")}
            onSelectCity={handleSelectCity}
            savedCities={savedCities}
          />
        )}

        {screen === "radar" && (
          <WorldRadarScreen
            initialCity={activeCity || PRESET_CITIES[0]}
            onClose={() => setScreen(radarReturnScreen)}
            onScanCity={handleSelectCity}
          />
        )}

        {screen === "dashboard" && activeCity && (
          <TelemetryDashboardScreen
            city={activeCity}
            weatherData={weatherData}
            aqiData={aqiData}
            climateData={climateData}
            loadingTelemetry={loadingTelemetry}
            loadingClimate={loadingClimate}
            telemetryExpanded={telemetryExpanded}
            setTelemetryExpanded={setTelemetryExpanded}
            climateMode={climateMode}
            setClimateMode={setClimateMode}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            isSaved={isCitySaved}
            onToggleSave={toggleSaveCity}
            onBack={() => setScreen("landing")}
            onOpenRadar={() => handleOpenRadar("dashboard")}
            onRefresh={() => loadCityTelemetry(activeCity, true)}
            refreshing={refreshing}
          />
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   SCREEN 1: LANDING / SPLASH PORTAL
   ========================================================================== */
function LandingPortalScreen({ onLaunchRadar, onSelectCity, savedCities }) {
  const quickCities = useMemo(() => {
    const combined = [...PRESET_CITIES];
    savedCities.forEach((sc) => {
      if (!combined.some((c) => c.name.toLowerCase() === sc.name.toLowerCase())) {
        combined.push(sc);
      }
    });
    return combined.slice(0, 6);
  }, [savedCities]);

  return (
    <div className="min-h-full vyoma-portal-bg relative flex flex-col justify-between px-5 pt-6 pb-8 overflow-hidden vyoma-enter">
      {/* Upper Right Glowing Celestial Moon Orb */}
      <div className="absolute -top-12 -right-12 w-56 h-56 pointer-events-none">
        <div
          className="w-full h-full rounded-full opacity-55 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(14,165,233,0.08) 65%, transparent 80%)" }}
        />
        <div
          className="absolute top-16 right-16 w-20 h-20 rounded-full opacity-85"
          style={{
            background: "radial-gradient(circle at 35% 35%, #F8FAFC 0%, #BAE6FD 45%, #0284C7 100%)",
            boxShadow: "0 0 40px rgba(56, 189, 248, 0.45)"
          }}
        />
      </div>

      {/* Centered Glassmorphic Hero Card */}
      <div className="relative z-10 my-auto py-6 w-full max-w-xl mx-auto">
        <div className="vyoma-card rounded-3xl p-6 sm:p-8 md:p-10 text-center relative overflow-hidden">
          <div className="mb-4">
            <CelestialIllustration variant="portal" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-[10px] font-semibold tracking-[0.2em] text-sky-300 uppercase">
            <span>{"\u2022"} 2030 PRECISION TELEMETRY</span>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-[0.42em] text-white pl-[0.42em]">
            VYOMA
          </h1>

          <div className="mt-1.5 text-[11px] font-semibold tracking-[0.28em] text-[#38BDF8] uppercase">
            ATMOSPHERIC INTELLIGENCE
          </div>

          <p className="mt-3.5 text-xs sm:text-sm text-slate-300/80 leading-relaxed max-w-md mx-auto">
            Instantaneous atmospheric telemetry &amp; radar intelligence.
          </p>

          <button
            onClick={onLaunchRadar}
            className="mt-6 w-full max-w-sm mx-auto py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:brightness-110 active:scale-[0.98] text-white font-semibold text-sm tracking-wide shadow-[0_8px_28px_rgba(14,165,233,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>Launch World Radar</span>
            <span>{"\u2192"}</span>
          </button>

          {/* Quick-Access City Chips */}
          <div className="mt-5 pt-4 border-t border-sky-400/10">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-2.5">
              Quick-Access Stations
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {quickCities.map((city) => (
                <button
                  key={city.id || city.name}
                  onClick={() => onSelectCity(city)}
                  className="px-3 py-1.5 rounded-full vyoma-card-inner hover:border-sky-400/45 hover:bg-sky-500/15 active:scale-95 text-[11px] font-medium text-slate-200 transition-all duration-300 flex items-center gap-1.5"
                >
                  <span className="text-[#38BDF8]">{"\u2022"}</span>
                  <span>{city.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 text-center text-[10px] tracking-[0.16em] text-slate-500 uppercase">
        Open-Meteo Live &amp; ERA5 Telemetry
      </footer>
    </div>
  );
}

/* ==========================================================================
   SCREEN 2: WORLD RADAR COMMAND (WEATHER MAP & SATELLITE)
   ========================================================================== */
function WorldRadarScreen({ initialCity, onClose, onScanCity }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const baseLayerRef = useRef(null);
  const labelsLayerRef = useRef(null);
  const cloudLayerRef = useRef(null);
  const radarLayerRef = useRef(null);
  const hubMarkersRef = useRef([]);

  const [mapMode, setMapMode] = useState("weather"); // "weather" | "satellite"
  const [radarActive, setRadarActive] = useState(true);
  const [cloudActive, setCloudActive] = useState(true);
  const [radarHost, setRadarHost] = useState("https://tilecache.rainviewer.com");
  const [radarFrames, setRadarFrames] = useState([]);
  const [radarFrameIdx, setRadarFrameIdx] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(true);
  const [latestCloudPath, setLatestCloudPath] = useState(null);

  const [hubSnapshots, setHubSnapshots] = useState(GLOBAL_RADAR_HUBS);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [scanningCityName, setScanningCityName] = useState("");
  const [useOsmFallback, setUseOsmFallback] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [loadingTargetPreview, setLoadingTargetPreview] = useState(false);

  const inspectCoordinates = useCallback(async (lat, lon, knownCity = null) => {
    setLoadingTargetPreview(true);
    const provisional = knownCity || {
      id: `pt_${lat.toFixed(3)}_${lon.toFixed(3)}`,
      name: `Coordinates (${lat.toFixed(2)}\u00B0, ${lon.toFixed(2)}\u00B0)`,
      country: "Scanning Atmosphere...",
      latitude: lat,
      longitude: lon,
      timezone: "auto"
    };
    setSelectedTarget({ city: provisional, weather: null });

    try {
      const [geo, liveW] = await Promise.all([
        knownCity ? Promise.resolve(knownCity) : reverseGeocode(lat, lon),
        getLiveWeather(lat, lon, knownCity?.timezone || "auto")
      ]);
      setSelectedTarget({ city: geo, weather: liveW });
    } catch (e) {
      setSelectedTarget({ city: provisional, weather: null });
    } finally {
      setLoadingTargetPreview(false);
    }
  }, []);

  // Load RainViewer radar + IR satellite cloud frames & batched global hub temperatures
  useEffect(() => {
    let mounted = true;
    fetchGlobalRadarFrames().then((res) => {
      if (!mounted) return;
      setRadarHost(res.host);
      setRadarFrames(res.frames);
      if (res.frames.length > 0) setRadarFrameIdx(res.frames.length - 1);
      setLatestCloudPath(res.latestCloudPath);
    });

    fetchGlobalHubSnapshots(GLOBAL_RADAR_HUBS).then((hubs) => {
      if (mounted) setHubSnapshots(hubs);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Leaflet global map with silky-smooth physics
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const startLat = initialCity?.latitude ?? 20.0;
    const startLon = initialCity?.longitude ?? 78.0;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLon],
      zoom: 3.5,
      minZoom: 2,
      maxZoom: 18,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 85,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      inertia: true,
      inertiaDeceleration: 2400,
      inertiaMaxSpeed: 3200,
      fadeAnimation: true,
      zoomAnimation: true,
      maxBounds: [[-85, -540], [85, 540]],
      maxBoundsViscosity: 0.4
    });

    const radarIcon = L.divIcon({
      className: "vyoma-radar-marker",
      html: `
        <div style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;">
          <div class="radar-ping-ring" style="position:absolute;inset:6px;border-radius:9999px;border:1.5px solid #38BDF8;background:rgba(56,189,248,0.12);"></div>
          <svg class="radar-sweep-cone" viewBox="0 0 54 54" style="position:absolute;inset:0;width:54px;height:54px;pointer-events:none;">
            <defs>
              <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.55" />
                <stop offset="100%" stop-color="#0EA5E9" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <circle cx="27" cy="27" r="24" fill="none" stroke="rgba(56,189,248,0.28)" stroke-width="1" stroke-dasharray="3 3" />
            <path d="M 27 27 L 27 3 A 24 24 0 0 1 51 27 Z" fill="url(#sweepGrad)" />
          </svg>
          <div style="position:relative;z-index:2;width:12px;height:12px;border-radius:9999px;background:#0EA5E9;border:2.5px solid #FFFFFF;box-shadow:0 0 18px #38BDF8;"></div>
        </div>
      `,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });

    const marker = L.marker([startLat, startLon], { icon: radarIcon, zIndexOffset: 900 }).addTo(map);
    markerRef.current = marker;

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const wrappedLon = ((lng + 180) % 360 + 360) % 360 - 180;
      marker.setLatLng([lat, wrappedLon]);
      map.panTo([lat, wrappedLon], { animate: true, duration: 0.45 });
      inspectCoordinates(lat, wrappedLon);
    });

    mapInstanceRef.current = map;

    // Ensure Leaflet always renders tiles across the full container after CSS/animation layout
    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 360);
    let ro = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      ro = new ResizeObserver(() => {
        map.invalidateSize({ animate: false });
      });
      ro.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [inspectCoordinates]);

  // Switch Base Map Layers (Weather Map / Photorealistic Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }
    setUseOsmFallback(false);

    if (mapMode === "satellite") {
      const satBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, maxNativeZoom: 18 }
      );
      const satLabels = L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, maxNativeZoom: 16, opacity: 0.88 }
      );
      satBase.addTo(map);
      satLabels.addTo(map);
      baseLayerRef.current = satBase;
      labelsLayerRef.current = satLabels;
    } else {
      // Free, zero-watermark Esri World Dark Gray Canvas + midnight navy atmospheric tint
      const darkBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, maxNativeZoom: 16, className: "vyoma-dark-base-tile" }
      );
      const darkLabels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, maxNativeZoom: 16, opacity: 0.82, className: "vyoma-dark-base-tile" }
      );
      let errCount = 0;
      darkBase.on("tileerror", () => {
        errCount += 1;
        if (errCount >= 3 && baseLayerRef.current === darkBase) {
          map.removeLayer(darkBase);
          if (labelsLayerRef.current) {
            map.removeLayer(labelsLayerRef.current);
            labelsLayerRef.current = null;
          }
          setUseOsmFallback(true);
          const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 });
          osm.addTo(map);
          baseLayerRef.current = osm;
        }
      });
      darkBase.addTo(map);
      darkLabels.addTo(map);
      baseLayerRef.current = darkBase;
      labelsLayerRef.current = darkLabels;
    }
  }, [mapMode]);

  // Global Satellite Infrared Cloud Layer (active on Weather Map or when cloudActive)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (cloudLayerRef.current) {
      map.removeLayer(cloudLayerRef.current);
      cloudLayerRef.current = null;
    }

    if (mapMode === "weather" && cloudActive && latestCloudPath) {
      const irUrl = `${radarHost}${latestCloudPath}/256/{z}/{x}/{y}/0/0_0.png`;
      const irLayer = L.tileLayer(irUrl, {
        opacity: 0.42,
        maxZoom: 18,
        maxNativeZoom: 7,
        zIndex: 250
      });
      irLayer.addTo(map);
      cloudLayerRef.current = irLayer;
    }
  }, [mapMode, cloudActive, latestCloudPath, radarHost]);

  // Live Animated Precipitation Radar Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    const showRadar = mapMode === "weather" || radarActive;
    if (showRadar && radarFrames.length > 0) {
      const frame = radarFrames[radarFrameIdx] || radarFrames[radarFrames.length - 1];
      if (frame?.path) {
        const radarUrl = `${radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
        const rLayer = L.tileLayer(radarUrl, {
          opacity: mapMode === "satellite" ? 0.65 : 0.78,
          maxZoom: 18,
          maxNativeZoom: 7,
          zIndex: 350
        });
        rLayer.addTo(map);
        radarLayerRef.current = rLayer;
      }
    }
  }, [mapMode, radarActive, radarFrames, radarFrameIdx, radarHost]);

  // Animate Radar Playback Frames
  useEffect(() => {
    const showRadar = mapMode === "weather" || radarActive;
    if (!radarPlaying || !showRadar || radarFrames.length < 2) return;
    const timer = setInterval(() => {
      setRadarFrameIdx((prev) => (prev + 1) % radarFrames.length);
    }, 1100);
    return () => clearInterval(timer);
  }, [radarPlaying, mapMode, radarActive, radarFrames]);

  // Render Live Global Weather Hub Beacons across Every Continent
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L) return;

    hubMarkersRef.current.forEach((m) => map.removeLayer(m));
    hubMarkersRef.current = [];

    hubSnapshots.forEach((hub) => {
      const tempTxt = hub.snapshot?.temperature_2m !== undefined
        ? `${Math.round(hub.snapshot.temperature_2m)}\u00B0`
        : "";
      const icon = L.divIcon({
        className: "vyoma-station-marker",
        html: `<div class="vyoma-station-pill"><span style="width:6px;height:6px;border-radius:9999px;background:#38BDF8;display:inline-block;"></span><span>${hub.name}</span>${tempTxt ? `<span style="color:#38BDF8;font-weight:700;">${tempTxt}</span>` : ""}</div>`,
        iconSize: [0, 0],
        iconAnchor: [40, 12]
      });
      const m = L.marker([hub.latitude, hub.longitude], { icon, zIndexOffset: 400 }).addTo(map);
      m.on("click", () => {
        if (markerRef.current) markerRef.current.setLatLng([hub.latitude, hub.longitude]);
        map.flyTo([hub.latitude, hub.longitude], 6.5, { duration: 0.8, easeLinearity: 0.25 });
        inspectCoordinates(hub.latitude, hub.longitude, hub);
      });
      hubMarkersRef.current.push(m);
    });
  }, [hubSnapshots, inspectCoordinates]);

  // Debounced city autocomplete
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const matches = await searchCities(query);
      setResults(matches);
      setSearching(false);
    }, 160);
    return () => clearTimeout(timer);
  }, [query]);

  const flyToRegion = (cityObj, zoomLevel = 6.5) => {
    if (!cityObj) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([cityObj.latitude, cityObj.longitude], zoomLevel, {
        duration: 0.85,
        easeLinearity: 0.25
      });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([cityObj.latitude, cityObj.longitude]);
    }
    inspectCoordinates(cityObj.latitude, cityObj.longitude, cityObj);
  };

  const triggerScanAndLoad = (cityObj) => {
    if (!cityObj || scanningCityName) return;
    setScanningCityName(cityObj.name);
    setResults([]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([cityObj.latitude, cityObj.longitude], 8, {
        duration: 0.65,
        easeLinearity: 0.25
      });
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([cityObj.latitude, cityObj.longitude]);
    }
    setTimeout(() => {
      onScanCity(cityObj);
    }, 600);
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (results.length > 0) {
      triggerScanAndLoad(results[0]);
      return;
    }
    if (query.trim().length >= 2) {
      setScanningCityName(query.trim());
      const matches = await searchCities(query);
      if (matches.length > 0) {
        triggerScanAndLoad(matches[0]);
      } else {
        setScanningCityName("");
      }
    }
  };

  const handleGlobalReset = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([20, 15], 2.25, { duration: 0.9, easeLinearity: 0.25 });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 8, { duration: 0.85, easeLinearity: 0.25 });
        }
        if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
        inspectCoordinates(lat, lon);
      },
      () => {},
      { timeout: 8000 }
    );
  };

  const activeFrame = radarFrames[radarFrameIdx];
  const frameTimeStr = activeFrame
    ? new Date(activeFrame.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const showRadarControls = (mapMode === "weather" || radarActive) && radarFrames.length > 0;

  return (
    <div className={`vyoma-radar-container bg-[#070D19] overflow-hidden vyoma-enter ${useOsmFallback ? "osm-dark-fallback" : ""}`}>
      {/* Full-Screen Global Map Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Subtle Atmospheric Edge Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(circle at 50% 55%, transparent 52%, rgba(7,13,25,0.48) 100%)" }}
      />

      {/* Floating Top Command Card */}
      <div className="relative z-20 p-3 md:p-4 pointer-events-none">
        <div className="vyoma-card rounded-3xl p-3.5 shadow-2xl space-y-2.5 w-full md:max-w-[430px] pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse shadow-[0_0_8px_#38BDF8]" />
              <span className="text-[11px] font-bold tracking-[0.14em] text-slate-200 uppercase">
                WORLD RADAR COMMAND - VYOMA
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-full vyoma-card-inner text-[11px] font-semibold text-slate-300 hover:text-white hover:border-sky-400/40 active:scale-95 transition-all flex items-center gap-1"
            >
              <span>{"\u2715"}</span>
              <span>Close</span>
            </button>
          </div>

          {/* Search Bar + SCAN Button */}
          <form onSubmit={handleScanSubmit} className="relative">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#070D19]/90 border border-sky-400/20 focus-within:border-sky-400/60 transition-all">
                <Icon name="search" size={14} className="text-sky-400/80" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any city or lat, lon..."
                  className="w-full bg-transparent outline-none text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={Boolean(scanningCityName)}
                className={`px-3.5 py-2 rounded-2xl font-bold text-xs tracking-wider transition-all duration-300 shrink-0 ${
                  scanningCityName
                    ? "bg-[#38BDF8] text-[#070D19] animate-pulse shadow-[0_0_20px_rgba(56,189,248,0.65)]"
                    : "bg-[#0EA5E9] hover:bg-[#38BDF8] text-[#070D19] shadow-[0_4px_18px_rgba(14,165,233,0.4)] active:scale-95"
                }`}
              >
                {scanningCityName ? "SCANNING..." : "SCAN"}
              </button>
            </div>

            {/* Autocomplete Results Dropdown */}
            {(results.length > 0 || searching) && (
              <div className="mt-2 rounded-2xl bg-[#091326]/95 border border-sky-400/25 shadow-2xl overflow-hidden max-h-52 overflow-y-auto no-scrollbar">
                {searching && results.length === 0 && (
                  <div className="px-4 py-3 text-xs text-sky-300/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>Querying global coordinates...</span>
                  </div>
                )}
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => triggerScanAndLoad(item)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-sky-500/15 border-b border-sky-400/10 last:border-0 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.admin1 ? `${item.admin1}, ` : ""}{item.country}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-400/20">
                      {item.country_code || "GEO"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Map Layer Mode Switcher: Weather Map | Satellite */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl vyoma-card-inner">
            <button
              type="button"
              onClick={() => setMapMode("weather")}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
                mapMode === "weather"
                  ? "bg-[#0EA5E9] text-[#070D19] shadow-[0_0_14px_rgba(14,165,233,0.45)]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Icon name="cloud-rain" size={13} />
              <span>Weather Map</span>
            </button>

            <button
              type="button"
              onClick={() => setMapMode("satellite")}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
                mapMode === "satellite"
                  ? "bg-[#0EA5E9] text-[#070D19] shadow-[0_0_14px_rgba(14,165,233,0.45)]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Icon name="satellite" size={13} />
              <span>Satellite</span>
            </button>
          </div>

          {/* Global Regional Quick-Select Chips (Smooth Fly-To across every continent) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {hubSnapshots.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => flyToRegion(c)}
                className="px-2.5 py-1 rounded-full vyoma-card-inner hover:border-sky-400/45 hover:bg-sky-500/15 active:scale-95 text-[11px] font-medium text-slate-200 shrink-0 transition-all flex items-center gap-1.5"
              >
                <span>{c.name}</span>
                {c.snapshot?.temperature_2m !== undefined && (
                  <span className="text-[10px] text-[#38BDF8] font-semibold tabular-nums">
                    {Math.round(c.snapshot.temperature_2m)}{"\u00B0"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right-Side Floating Smooth Navigation Controls */}
      <div className={`absolute right-3 z-20 flex flex-col gap-2 transition-all duration-300 ${selectedTarget ? "bottom-32" : "bottom-16"}`}>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          title="Zoom In"
          aria-label="Zoom In"
          className="w-9 h-9 rounded-2xl vyoma-card flex items-center justify-center text-white font-bold text-base hover:border-sky-400/50 active:scale-90 transition-all"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="w-9 h-9 rounded-2xl vyoma-card flex items-center justify-center text-white font-bold text-base hover:border-sky-400/50 active:scale-90 transition-all"
        >
          {"\u2212"}
        </button>
        <button
          type="button"
          onClick={handleGlobalReset}
          title="Global World View"
          aria-label="Global World View"
          className="w-9 h-9 rounded-2xl vyoma-card flex items-center justify-center text-sky-300 hover:text-white hover:border-sky-400/50 active:scale-90 transition-all"
        >
          <Icon name="globe" size={16} />
        </button>
        <button
          type="button"
          onClick={handleLocateMe}
          title="Center on My Location"
          aria-label="Center on My Location"
          className="w-9 h-9 rounded-2xl vyoma-card flex items-center justify-center text-emerald-300 hover:text-white hover:border-emerald-400/50 active:scale-90 transition-all"
        >
          <Icon name="crosshair" size={16} />
        </button>
      </div>

      {/* Bottom Floating Radar Playback + Overlay Controls */}
      <div className={`absolute left-3 z-20 flex flex-wrap items-center gap-2 transition-all duration-300 ${selectedTarget ? "bottom-32" : "bottom-4"}`}>
        {mapMode !== "weather" && (
          <button
            type="button"
            onClick={() => setRadarActive(!radarActive)}
            className={`px-3 py-1.5 rounded-full vyoma-card text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              radarActive ? "border-sky-400/50 text-sky-300 bg-sky-500/15" : "text-slate-400"
            }`}
          >
            <Icon name="cloud-rain" size={13} />
            <span>Rain Radar {radarActive ? "ON" : "OFF"}</span>
          </button>
        )}

        {mapMode === "weather" && latestCloudPath && (
          <button
            type="button"
            onClick={() => setCloudActive(!cloudActive)}
            className={`px-2.5 py-1.5 rounded-full vyoma-card text-[10px] font-semibold transition-all ${
              cloudActive ? "border-sky-400/45 text-sky-200 bg-sky-500/15" : "text-slate-400"
            }`}
          >
            IR Clouds {cloudActive ? "ON" : "OFF"}
          </button>
        )}

        {showRadarControls && (
          <div className="vyoma-card rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setRadarPlaying(!radarPlaying)}
              aria-label={radarPlaying ? "Pause Radar" : "Play Radar"}
              className="text-sky-300 hover:text-white transition-colors"
            >
              <Icon name={radarPlaying ? "pause" : "play"} size={12} />
            </button>
            <span className="font-mono text-[10px] text-slate-200 tabular-nums">
              {frameTimeStr} {activeFrame?.isNowcast ? "Nowcast" : "Live"}
            </span>
            <div className="flex items-center gap-1 pl-1 border-l border-sky-400/20">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" title="Light Rain" />
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" title="Moderate" />
              <span className="w-2 h-2 rounded-full bg-[#FACC15]" title="Heavy" />
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" title="Storm" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Target Telemetry Preview Card (Tap any region or map point) */}
      {selectedTarget && (
        <div className="absolute bottom-3 inset-x-3 md:inset-x-auto md:left-3 md:w-[430px] z-20 vyoma-enter">
          <div className="vyoma-card rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl vyoma-card-inner flex items-center justify-center shrink-0">
                <WeatherGlyph
                  type={getWeatherMeta(
                    selectedTarget.weather?.current?.weather_code ?? 2,
                    selectedTarget.weather?.current?.is_day ?? 1
                  ).icon}
                  size={28}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{selectedTarget.city.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {selectedTarget.city.country ? `\u2022 ${selectedTarget.city.country}` : ""}
                  </span>
                </div>
                {loadingTargetPreview && !selectedTarget.weather ? (
                  <div className="text-[11px] text-sky-300 animate-pulse mt-0.5">
                    Acquiring live telemetry...
                  </div>
                ) : selectedTarget.weather?.current ? (
                  <div className="text-[11px] text-slate-300 tabular-nums mt-0.5 truncate">
                    <span className="font-bold text-white">
                      {selectedTarget.weather.current.temperature_2m.toFixed(1)}{"\u00B0"}C
                    </span>{" "}
                    {"\u2022"} {getWeatherMeta(selectedTarget.weather.current.weather_code, selectedTarget.weather.current.is_day).description}{" "}
                    {"\u2022"} {Math.round(selectedTarget.weather.current.wind_speed_10m)} km/h
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {selectedTarget.city.latitude.toFixed(2)}{"\u00B0"}, {selectedTarget.city.longitude.toFixed(2)}{"\u00B0"}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => triggerScanAndLoad(selectedTarget.city)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:brightness-110 text-white font-bold text-[11px] tracking-wide shrink-0 transition-all active:scale-95 shadow-[0_4px_16px_rgba(14,165,233,0.35)]"
            >
              TELEMETRY {"\u2192"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SCREEN 3: CITY ATMOSPHERIC TELEMETRY DASHBOARD
   ========================================================================== */
function TelemetryDashboardScreen({
  city,
  weatherData,
  aqiData,
  climateData,
  loadingTelemetry,
  loadingClimate,
  telemetryExpanded,
  setTelemetryExpanded,
  climateMode,
  setClimateMode,
  selectedYear,
  setSelectedYear,
  isSaved,
  onToggleSave,
  onBack,
  onOpenRadar,
  onRefresh,
  refreshing
}) {
  const current = weatherData?.current;
  const hourly = weatherData?.hourly;
  const daily = weatherData?.daily;

  const currentHourIdx = useMemo(() => {
    return findCurrentHourIndex(hourly?.time, current?.time, weatherData?.timezone || city.timezone);
  }, [hourly?.time, current?.time, weatherData?.timezone, city.timezone]);

  const weatherCode = current?.weather_code ?? 2;
  const isDay = current?.is_day ?? 1;
  const currentMeta = getWeatherMeta(weatherCode, isDay);

  const currentTemp = current?.temperature_2m !== undefined ? current.temperature_2m.toFixed(1) : "--";
  const hiTemp = daily?.temperature_2m_max?.[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : "--";
  const loTemp = daily?.temperature_2m_min?.[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : "--";

  const feelsLike = current?.apparent_temperature !== undefined ? current.apparent_temperature.toFixed(1) : "--";
  const windSpeed = current?.wind_speed_10m ?? 0;
  const windGusts = current?.wind_gusts_10m ?? windSpeed;
  const windDir = getWindCardinal(current?.wind_direction_10m ?? 0);
  const windForce = getBeaufortForce(windSpeed);
  const humidity = current?.relative_humidity_2m !== undefined ? Math.round(current.relative_humidity_2m) : "--";
  const dewPoint = hourly?.dew_point_2m?.[currentHourIdx] !== undefined ? Math.round(hourly.dew_point_2m[currentHourIdx]) : null;
  const uvVal = hourly?.uv_index?.[currentHourIdx] !== undefined ? hourly.uv_index[currentHourIdx] : 0;
  const visibilityKmRaw = hourly?.visibility?.[currentHourIdx] !== undefined
    ? hourly.visibility[currentHourIdx] / 1000
    : 10;
  const visibilityDisplay = visibilityKmRaw < 10 ? visibilityKmRaw.toFixed(1) : Math.round(visibilityKmRaw);
  const pressureHpa = current?.pressure_msl !== undefined
    ? current.pressure_msl.toFixed(1)
    : (current?.surface_pressure !== undefined ? current.surface_pressure.toFixed(1) : "1012.0");

  const localNowMin = getCityLocalMinutes(weatherData?.timezone || city.timezone, weatherData?.utc_offset_seconds);
  const localClockStr = `${String(Math.floor(localNowMin / 60)).padStart(2, "0")}:${String(localNowMin % 60).padStart(2, "0")}`;
  const isLiveSource = weatherData?._source === "Open-Meteo Live";

  return (
    <div className="min-h-full vyoma-portal-bg px-4 sm:px-6 lg:px-8 pt-5 pb-8 vyoma-enter">
      <div className="max-w-6xl mx-auto space-y-4 lg:space-y-5">
        {/* 1. Top Navigation Bar */}
        <header className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            aria-label="Return to Landing Portal"
            className="w-10 h-10 rounded-full vyoma-card flex items-center justify-center text-slate-200 hover:text-white hover:border-sky-400/45 active:scale-95 transition-all"
          >
            <Icon name="arrow-left" size={18} />
          </button>

          <div className="text-center min-w-0 px-2">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{city.name}</h1>
            <div className="text-[11px] sm:text-xs text-slate-400 truncate flex items-center justify-center gap-1.5">
              <span>{city.country || "Global Telemetry"}</span>
              {weatherData && (
                <>
                  <span className="text-slate-600">{"\u2022"}</span>
                  <span className={isLiveSource ? "text-emerald-400" : "text-amber-300"}>
                    {isLiveSource ? `Live ${localClockStr}` : "Offline"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh Live Telemetry"
              aria-label="Refresh Live Telemetry"
              className="w-9 h-9 rounded-full vyoma-card flex items-center justify-center text-slate-300 hover:text-sky-300 hover:border-sky-400/45 active:scale-95 transition-all disabled:opacity-60"
            >
              <Icon name="refresh-cw" size={15} className={refreshing ? "animate-spin text-sky-400" : ""} />
            </button>

            <button
              onClick={onOpenRadar}
              title="Open World Radar"
              aria-label="Open World Radar"
              className="w-9 h-9 rounded-full vyoma-card flex items-center justify-center text-sky-300 hover:text-white hover:border-sky-400/45 active:scale-95 transition-all"
            >
              <Icon name="map" size={16} />
            </button>

            <button
              onClick={onToggleSave}
              title={isSaved ? "Saved City" : "Save City"}
              aria-label="Toggle Favorite City"
              className={`w-9 h-9 rounded-full vyoma-card flex items-center justify-center active:scale-95 transition-all ${
                isSaved ? "text-[#38BDF8] border-sky-400/50 bg-sky-500/15" : "text-slate-300 hover:text-white"
              }`}
            >
              <Icon
                name="bookmark"
                size={16}
                fill={isSaved ? "currentColor" : "none"}
              />
            </button>
          </div>
        </header>

        {/* Cyan Shimmer Skeletons while resolving Open-Meteo */}
        {loadingTelemetry && !weatherData ? (
          <div className="space-y-4">
            <div className="h-32 rounded-3xl vyoma-skeleton" />
            <div className="h-52 rounded-3xl vyoma-skeleton" />
            <div className="h-44 rounded-3xl vyoma-skeleton" />
            <div className="h-36 rounded-3xl vyoma-skeleton" />
          </div>
        ) : (
          <>
            {/* 2 & 3. Hero Current Weather + Hourly Atmosphere (Stacked on Mobile/Tablet, 2-Column on PC) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
              <section className="lg:col-span-4 lg:vyoma-card lg:rounded-3xl lg:p-6 pt-2 pb-1 px-1 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-start leading-none">
                    <span className="text-[60px] lg:text-[64px] font-light tracking-tighter text-white tabular-nums">
                      {currentTemp}
                    </span>
                    <span className="text-2xl font-normal text-sky-300 mt-2 ml-1">{"\u00B0"}C</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5 text-sm">
                    <span className="text-slate-100 font-medium">{currentMeta.description}</span>
                    <span className="text-slate-400 tabular-nums">
                      {loTemp}{"\u00B0"} ~ {hiTemp}{"\u00B0"}C
                    </span>
                  </div>
                </div>

                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl vyoma-card flex items-center justify-center relative shrink-0">
                  <div className="absolute inset-2 rounded-full bg-sky-400/15 blur-xl pointer-events-none" />
                  <WeatherGlyph type={currentMeta.icon} size={52} />
                </div>
              </section>

              <div className="lg:col-span-8 min-w-0">
                <HourlyAtmosphereCard hourly={hourly} current={current} startIdx={currentHourIdx} />
              </div>
            </div>

            {/* 4. Next 7 Days Forecast Module */}
            <SevenDayForecastCard daily={daily} />

            {/* 5. Expandable / Collapsible Telemetry Section */}
            <div className="flex justify-center pt-1">
              <button
                onClick={() => setTelemetryExpanded(!telemetryExpanded)}
                className="px-4 py-1.5 rounded-full vyoma-card hover:border-sky-400/45 text-[11px] font-semibold text-sky-300 flex items-center gap-1.5 active:scale-95 transition-all duration-300"
              >
                <span>{telemetryExpanded ? "Collapse Telemetry" : "Expand Telemetry"}</span>
                <Icon name={telemetryExpanded ? "chevron-up" : "chevron-down"} size={14} />
              </button>
            </div>

            <div className="telemetry-collapse-grid" data-open={telemetryExpanded ? "true" : "false"}>
              <div className="telemetry-collapse-inner space-y-4">
                {/* 6-Metric Telemetry Grid (3x2 on mobile/tablet, 6-in-1 row on PC) */}
                <section className="vyoma-card rounded-3xl p-4">
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    <TelemetryMetricCell
                      icon="thermometer"
                      label="Feels like"
                      value={`${feelsLike}\u00B0C`}
                      sub={current?.cloud_cover !== undefined ? `Cloud ${Math.round(current.cloud_cover)}%` : null}
                    />
                    <TelemetryMetricCell
                      icon="wind"
                      label="Wind"
                      value={`${windSpeed.toFixed(1)} km/h`}
                      sub={`Force ${windForce} \u2022 ${windDir}${windGusts > windSpeed + 5 ? ` (G ${Math.round(windGusts)})` : ""}`}
                    />
                    <TelemetryMetricCell
                      icon="droplet"
                      label="Humidity"
                      value={`${humidity}%`}
                      sub={dewPoint !== null ? `Dew pt ${dewPoint}\u00B0C` : null}
                    />
                    <TelemetryMetricCell
                      icon="sun"
                      label="UV"
                      value={getUvLabel(uvVal)}
                      sub={`Index ${uvVal.toFixed(1)}`}
                    />
                    <TelemetryMetricCell
                      icon="eye"
                      label="Visibility"
                      value={`${visibilityDisplay} km`}
                    />
                    <TelemetryMetricCell
                      icon="gauge"
                      label="Air pressure"
                      value={`${pressureHpa} hPa`}
                      sub="Sea level (MSL)"
                    />
                  </div>
                </section>

                {/* Air Quality Index (AQI) + Solar Arc (Side-by-side on Tablet & PC) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AqiTelemetryCard aqiData={aqiData} />

                  <SolarArcCard
                    sunriseStr={daily?.sunrise?.[0]}
                    sunsetStr={daily?.sunset?.[0]}
                    timezone={weatherData?.timezone || city.timezone}
                    utcOffsetSeconds={weatherData?.utc_offset_seconds}
                  />
                </div>
              </div>
            </div>

            {/* 6. 5-Year Climate Trend Module (ERA5 Historical Archive) */}
            <ClimateTrendCard
              city={city}
              climateData={climateData}
              loadingClimate={loadingClimate}
              climateMode={climateMode}
              setClimateMode={setClimateMode}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />

            {/* 7. Footer */}
            <footer className="pt-3 pb-2 text-center text-[11px] text-slate-500 tracking-wide">
              VYOMA 2030 {"\u2022"} Atmospheric Telemetry &amp; Climate
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function TelemetryMetricCell({ icon, label, value, sub }) {
  return (
    <div className="vyoma-card-inner rounded-2xl p-3 flex flex-col justify-between min-h-[78px]">
      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
        <Icon name={icon} size={13} className="text-[#38BDF8]" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5">
        <div className="text-sm font-semibold text-white tabular-nums leading-tight">{value}</div>
        {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ==========================================================================
   HOURLY ATMOSPHERE MODULE (24H CURVE + SCROLLABLE TIMELINE)
   ========================================================================== */
function HourlyAtmosphereCard({ hourly, current, startIdx = 0 }) {
  const dragScroll = useDragScroll();
  const [activeSlot, setActiveSlot] = useState(0);

  const slots = useMemo(() => {
    if (!hourly?.time?.length) return [];
    const list = [];
    // All 24 consecutive hours starting from Now
    for (let step = 0; step < 24; step++) {
      const idx = Math.min(hourly.time.length - 1, startIdx + step);
      const timeStr = hourly.time[idx] || "";
      const hhmm = timeStr.includes("T") ? timeStr.split("T")[1].slice(0, 5) : "--:--";
      const rawTemp = step === 0 && current?.temperature_2m !== undefined
        ? current.temperature_2m
        : (hourly.temperature_2m?.[idx] ?? 22);
      const code = step === 0 && current?.weather_code !== undefined
        ? current.weather_code
        : (hourly.weather_code?.[idx] ?? 2);
      const isDay = step === 0 && current?.is_day !== undefined
        ? current.is_day
        : (hourly.is_day?.[idx] ?? 1);
      list.push({
        step,
        label: step === 0 ? "Now" : hhmm,
        tempExact: parseFloat(rawTemp.toFixed(1)),
        temp: Math.round(rawTemp),
        precipProb: Math.round(hourly.precipitation_probability?.[idx] ?? 0),
        wind: Math.round(hourly.wind_speed_10m?.[idx] ?? 0),
        code,
        isDay
      });
    }
    return list;
  }, [hourly, current, startIdx]);

  if (!slots.length) return null;

  const colWidth = 56;
  const svgWidth = slots.length * colWidth;
  const temps = slots.map((s) => s.tempExact);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const span = maxT - minT || 1;

  const points = slots.map((s, i) => {
    const x = i * colWidth + colWidth / 2;
    const y = 66 - ((s.tempExact - minT) / span) * 34;
    return { x, y, ...s };
  });

  // Smooth cubic Bezier path
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  const areaPath = `${linePath} L ${points[points.length - 1].x} 88 L ${points[0].x} 88 Z`;
  const activeData = points[activeSlot] || points[0];

  return (
    <section className="vyoma-card rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          HOURLY ATMOSPHERE
        </span>
        {activeData && (
          <span className="text-[10px] font-medium text-sky-300 tabular-nums">
            {activeData.label} {"\u2022"} {activeData.tempExact}{"\u00B0"}C {"\u2022"} {`\uD83D\uDCA7 ${activeData.precipProb}%`} {"\u2022"} {activeData.wind} km/h
          </span>
        )}
      </div>

      <div
        ref={dragScroll.ref}
        onMouseDown={dragScroll.onMouseDown}
        onMouseLeave={dragScroll.onMouseLeave}
        onMouseUp={dragScroll.onMouseUp}
        onMouseMove={dragScroll.onMouseMove}
        className="overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
      >
        <div style={{ width: `${svgWidth}px` }}>
          {/* Interactive SVG Temperature Curve */}
          <svg width={svgWidth} height="92" className="overflow-visible">
            <defs>
              <linearGradient id="hourlyCurveStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="50%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#7DD3FC" />
              </linearGradient>
              <linearGradient id="hourlyCurveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#hourlyCurveFill)" />
            <path d={linePath} fill="none" stroke="url(#hourlyCurveStroke)" strokeWidth="2.4" strokeLinecap="round" />

            {points.map((pt, idx) => {
              const isSelected = activeSlot === idx;
              return (
                <g key={idx} onClick={() => setActiveSlot(idx)} className="cursor-pointer">
                  {pt.precipProb >= 30 && (
                    <text
                      x={pt.x}
                      y={pt.y - 21}
                      textAnchor="middle"
                      fill="#38BDF8"
                      fontSize="9.5"
                      fontWeight="600"
                    >
                      {`\uD83D\uDCA7 ${pt.precipProb}%`}
                    </text>
                  )}
                  <text
                    x={pt.x}
                    y={pt.y - 9}
                    textAnchor="middle"
                    fill={isSelected ? "#FFFFFF" : "#CBD5E1"}
                    fontSize="11"
                    fontWeight={isSelected ? "700" : "600"}
                  >
                    {pt.temp}{"\u00B0"}
                  </text>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 4.5 : 3}
                    fill={isSelected ? "#38BDF8" : "#0E1A2F"}
                    stroke="#38BDF8"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>

          {/* Timeline Row */}
          <div className="flex items-center mt-1">
            {points.map((pt, idx) => {
              const meta = getWeatherMeta(pt.code, pt.isDay);
              const isSelected = activeSlot === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlot(idx)}
                  style={{ width: `${colWidth}px` }}
                  className={`flex flex-col items-center gap-1.5 py-1.5 rounded-2xl transition-all ${
                    isSelected ? "bg-sky-500/15 border border-sky-400/25" : "border border-transparent"
                  }`}
                >
                  <WeatherGlyph type={meta.icon} size={24} />
                  <span className={`text-[11px] tabular-nums ${isSelected ? "text-sky-300 font-semibold" : "text-slate-400"}`}>
                    {pt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   NEXT 7 DAYS FORECAST MODULE
   ========================================================================== */
function SevenDayForecastCard({ daily }) {
  const dragScroll = useDragScroll();
  if (!daily?.time?.length) return null;

  return (
    <section className="vyoma-card rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          NEXT 7 DAYS FORECAST
        </span>
        <span className="text-[10px] text-sky-400/80 font-medium lg:hidden">
          Swipe horizontal {"\u2192"}
        </span>
      </div>

      <div
        ref={dragScroll.ref}
        onMouseDown={dragScroll.onMouseDown}
        onMouseLeave={dragScroll.onMouseLeave}
        onMouseUp={dragScroll.onMouseUp}
        onMouseMove={dragScroll.onMouseMove}
        className="flex lg:grid lg:grid-cols-7 items-stretch gap-2.5 overflow-x-auto lg:overflow-visible no-scrollbar cursor-grab lg:cursor-default active:cursor-grabbing select-none pb-0.5"
      >
        {daily.time.slice(0, 7).map((dateStr, idx) => {
          const dateObj = new Date(`${dateStr}T12:00:00`);
          const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
          const dayLabel = idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : `Day ${idx + 1}`;
          const code = daily.weather_code?.[idx] ?? 0;
          const meta = getWeatherMeta(code, 1);
          const precipProb = Math.round(daily.precipitation_probability_max?.[idx] ?? 0);
          const minT = Math.round(daily.temperature_2m_min?.[idx] ?? 18);
          const maxT = Math.round(daily.temperature_2m_max?.[idx] ?? 26);

          return (
            <div
              key={dateStr}
              className={`min-w-[102px] lg:min-w-0 shrink-0 rounded-2xl p-3 flex flex-col items-center text-center justify-between gap-2 transition-all ${
                idx === 0
                  ? "bg-sky-500/12 border border-sky-400/30"
                  : "vyoma-card-inner hover:border-sky-400/30"
              }`}
            >
              <div>
                <div className="text-xs font-semibold text-white">{dayLabel}</div>
                <div className="text-[10px] text-slate-400">{weekday}</div>
              </div>

              <WeatherGlyph type={meta.icon} size={30} />

              <div className="text-[11px] text-slate-200 font-medium leading-tight line-clamp-2 min-h-[28px] flex items-center">
                {meta.description}
              </div>

              <div className="text-[10px] text-sky-300 font-medium">
                {`\uD83D\uDCA7 ${precipProb}%`}
              </div>

              <div className="text-xs font-semibold tabular-nums">
                <span className="text-slate-400">{minT}{"\u00B0"}</span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-white">{maxT}{"\u00B0"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ==========================================================================
   AIR QUALITY INDEX (AQI) CARD
   ========================================================================== */
function AqiTelemetryCard({ aqiData }) {
  const c = aqiData?.current || {};
  const hasScore = c.us_aqi !== null && c.us_aqi !== undefined;
  const rawScore = hasScore ? c.us_aqi : c.european_aqi;
  const score = rawScore !== null && rawScore !== undefined ? Math.round(rawScore) : null;

  const pm25 = c.pm2_5 !== null && c.pm2_5 !== undefined ? c.pm2_5.toFixed(1) : "--";
  const pm10 = c.pm10 !== null && c.pm10 !== undefined ? c.pm10.toFixed(1) : "--";
  const co = c.carbon_monoxide !== null && c.carbon_monoxide !== undefined ? Math.round(c.carbon_monoxide) : "--";
  const so2 = c.sulphur_dioxide !== null && c.sulphur_dioxide !== undefined ? c.sulphur_dioxide.toFixed(1) : "--";

  let status = "Pending";
  let color = "#38BDF8";
  if (score !== null) {
    if (score > 200) { status = "Very Unhealthy"; color = "#A855F7"; }
    else if (score > 150) { status = "Unhealthy"; color = "#EF4444"; }
    else if (score > 100) { status = "Sensitive"; color = "#F97316"; }
    else if (score > 50) { status = "Moderate"; color = "#FBBF24"; }
    else if (score > 25) { status = "Good"; color = "#22C55E"; }
    else { status = "Excellent"; color = "#22C55E"; }
  }

  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const arcSpan = circ * 0.78;
  const fillRatio = score !== null ? Math.min(1, Math.max(0.06, score / 250)) : 0.06;
  const dashOffset = arcSpan * (1 - fillRatio);

  const pollutants = [
    { label: "PM2.5", val: pm25, unit: "\u00B5g/m\u00B3", barColor: "#22C55E" },
    { label: "PM10", val: pm10, unit: "\u00B5g/m\u00B3", barColor: "#38BDF8" },
    { label: "CO", val: co, unit: "\u00B5g/m\u00B3", barColor: "#FBBF24" },
    { label: "SO\u2082", val: so2, unit: "\u00B5g/m\u00B3", barColor: "#A855F7" }
  ];

  return (
    <section className="vyoma-card rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          AIR QUALITY INDEX
        </span>
        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
          {aqiData?._source === "Open-Meteo CAMS" ? "CAMS Live" : "Sensor"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Left Circular Progress Arc */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 90 90" className="w-full h-full" style={{ transform: "rotate(130deg)" }}>
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="none"
              stroke="rgba(148, 163, 184, 0.16)"
              strokeWidth="7"
              strokeDasharray={`${arcSpan} ${circ}`}
              strokeLinecap="round"
            />
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeDasharray={`${arcSpan} ${circ}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: "stroke-dashoffset 400ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-1">
            <div className="text-xl font-bold text-white tabular-nums leading-none">{score ?? "--"}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">US AQI</div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color }}>{status}</div>
          </div>
        </div>

        {/* Right 2x2 Pollutant Breakdown */}
        <div className="flex-1 grid grid-cols-2 gap-2.5">
          {pollutants.map((p) => (
            <div key={p.label} className="vyoma-card-inner rounded-2xl px-3 py-2 flex items-center gap-2.5">
              <span
                className="w-1 h-7 rounded-full shrink-0"
                style={{ backgroundColor: p.barColor, boxShadow: `0 0 8px ${p.barColor}66` }}
              />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-medium">{p.label}</div>
                <div className="text-sm font-semibold text-white tabular-nums leading-tight">{p.val}</div>
                <div className="text-[9px] text-slate-500">{p.unit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   SOLAR ARC (SUNRISE & SUNSET) CARD
   ========================================================================== */
function SolarArcCard({ sunriseStr, sunsetStr, timezone, utcOffsetSeconds }) {
  const rise = parseClockMinutes(sunriseStr) || { total: 367, label: "06:07" };
  const set = parseClockMinutes(sunsetStr) || { total: 1082, label: "18:02" };
  const nowMin = getCityLocalMinutes(timezone, utcOffsetSeconds);

  const isDaylight = nowMin >= rise.total && nowMin <= set.total;
  let t = 0.5;
  if (nowMin <= rise.total) t = 0;
  else if (nowMin >= set.total) t = 1;
  else t = (nowMin - rise.total) / Math.max(1, set.total - rise.total);

  let statusText = "";
  if (isDaylight) {
    const rem = set.total - nowMin;
    statusText = `Daylight \u2022 ${Math.floor(rem / 60)}h ${rem % 60}m left`;
  } else {
    const untilRise = nowMin < rise.total ? rise.total - nowMin : (1440 - nowMin) + rise.total;
    statusText = `Night \u2022 Sunrise in ${Math.floor(untilRise / 60)}h ${untilRise % 60}m`;
  }

  // Quadratic Bezier P0=(16,66), P1=(140,-6), P2=(264,66)
  const p0 = { x: 16, y: 66 };
  const p1 = { x: 140, y: -6 };
  const p2 = { x: 264, y: 66 };
  const sunX = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const sunY = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

  return (
    <section className="vyoma-card rounded-3xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          SOLAR ARC
        </span>
        <span className="text-[10px] font-medium text-amber-300/90 tabular-nums">
          {statusText}
        </span>
      </div>

      <div className="relative w-full">
        <svg viewBox="0 0 280 76" className="w-full h-24 overflow-visible">
          <defs>
            <radialGradient id="sunOrbGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDaylight ? "#FEF08A" : "#BAE6FD"} />
              <stop offset="60%" stopColor={isDaylight ? "#FACC15" : "#38BDF8"} />
              <stop offset="100%" stopColor={isDaylight ? "#F59E0B" : "#0284C7"} />
            </radialGradient>
          </defs>
          <line x1="12" y1="66" x2="268" y2="66" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
          <path
            d={`M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`}
            fill="none"
            stroke="rgba(250, 204, 21, 0.35)"
            strokeWidth="1.8"
            strokeDasharray="4 4"
          />
          <circle cx={sunX} cy={sunY} r="12" fill={isDaylight ? "rgba(250, 204, 21, 0.2)" : "rgba(56, 189, 248, 0.16)"} />
          <circle
            cx={sunX}
            cy={sunY}
            r="6"
            fill="url(#sunOrbGrad)"
            style={{ filter: isDaylight ? "drop-shadow(0 0 10px rgba(250, 204, 21, 0.9))" : "drop-shadow(0 0 8px rgba(56, 189, 248, 0.7))" }}
          />
        </svg>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-300">
              <Icon name="sunrise" size={14} />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Sunrise</div>
              <div className="text-xs font-semibold text-white tabular-nums">{rise.label}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Sunset</div>
              <div className="text-xs font-semibold text-white tabular-nums">{set.label}</div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-orange-500/15 border border-orange-400/25 flex items-center justify-center text-orange-300">
              <Icon name="sunset" size={14} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   5-YEAR CLIMATE TREND MODULE (ERA5 HISTORICAL ARCHIVE)
   ========================================================================== */
function ClimateTrendCard({
  city,
  climateData,
  loadingClimate,
  climateMode,
  setClimateMode,
  selectedYear,
  setSelectedYear
}) {
  const years = climateData?.years || [];
  const kpis = climateData?.kpis;
  const activeYearData = years.find((y) => y.year === selectedYear) || years[years.length - 1];

  const shiftVal = kpis?.tempShift ?? 0;
  const shiftStr = `${shiftVal > 0 ? "+" : ""}${Number(shiftVal).toFixed(1)}\u00B0C`;
  const isEra5 = climateData?._source === "ERA5 Reanalysis";

  return (
    <section className="vyoma-card rounded-3xl p-4 space-y-4">
      {/* Header + Segmented Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              5-YEAR CLIMATE TREND
            </h2>
            {climateData && (
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                isEra5
                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/25"
                  : "text-amber-300 bg-amber-500/10 border-amber-400/25"
              }`}>
                {isEra5 ? "ERA5" : "Est."}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real ERA5 Atmospheric Historical Archive (2021{"\u2013"}2025)
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl vyoma-card-inner shrink-0">
          <button
            type="button"
            onClick={() => setClimateMode("temp")}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
              climateMode === "temp"
                ? "bg-[#0EA5E9] text-[#070D19] shadow-[0_0_12px_rgba(14,165,233,0.45)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Temp
          </button>
          <button
            type="button"
            onClick={() => setClimateMode("rain")}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
              climateMode === "rain"
                ? "bg-[#0EA5E9] text-[#070D19] shadow-[0_0_12px_rgba(14,165,233,0.45)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Rain
          </button>
        </div>
      </div>

      {loadingClimate && !climateData ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="h-20 rounded-2xl vyoma-skeleton" />
            <div className="h-20 rounded-2xl vyoma-skeleton" />
            <div className="h-20 rounded-2xl vyoma-skeleton" />
          </div>
          <div className="h-44 rounded-2xl vyoma-skeleton" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            {/* 3 Summary KPI Boxes */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="vyoma-card-inner rounded-2xl p-3">
                <div className="text-[10px] text-slate-400">5-Yr Temp Shift</div>
                <div className={`text-base font-bold tabular-nums mt-1 ${shiftVal >= 0 ? "text-rose-400" : "text-sky-400"}`}>
                  {shiftStr}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">vs 2021 base</div>
              </div>

              <div className="vyoma-card-inner rounded-2xl p-3">
                <div className="text-[10px] text-slate-400">Avg Annual Rain</div>
                <div className="text-base font-bold tabular-nums text-[#38BDF8] mt-1">
                  {kpis?.avgAnnualRain ?? "--"} mm
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">5-year normal</div>
              </div>

              <div className="vyoma-card-inner rounded-2xl p-3">
                <div className="text-[10px] text-slate-400">Wet Days / Yr</div>
                <div className="text-base font-bold tabular-nums text-white mt-1">
                  {kpis?.avgWetDays ?? "--"} days
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Precip {"\u2265"} 1mm</div>
              </div>
            </div>

            {/* Factual Climate Intelligence Callout Box */}
            <div className="rounded-2xl p-3.5 bg-sky-500/10 border border-sky-400/20 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-[#38BDF8] mb-1.5">
                <span>{"\uD83D\uDCA1"}</span>
                <span>FACTUAL CLIMATE INTELLIGENCE</span>
              </div>
              <p className="text-xs text-slate-200/90 leading-relaxed">
                {climateData?.insight ||
                  `Historical ERA5 archive data for ${city.name} indicates consistent seasonal patterns across 2021\u20132025.`}
              </p>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="lg:col-span-7 vyoma-card-inner rounded-2xl p-3.5 transition-all duration-300 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-medium text-slate-300">
                {climateMode === "temp" ? "Mean Annual Temperature" : "Annual Total Rainfall"}
              </span>
              {activeYearData && (
                <span className="text-[11px] font-bold text-[#38BDF8] tabular-nums text-right">
                  {activeYearData.year}:{" "}
                  {climateMode === "temp"
                    ? `${activeYearData.avgTemp}\u00B0C (Peak ${activeYearData.peakTemp}\u00B0)`
                    : `${activeYearData.annualRainfall} mm (${activeYearData.wetDays} wet d)`}
                </span>
              )}
            </div>

            {climateMode === "temp" ? (
              <ClimateTempLineChart
                years={years}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
              />
            ) : (
              <ClimateRainBarChart
                years={years}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
              />
            )}

            {/* Year Selector Tabs (2021 - 2025) */}
            <div className="grid grid-cols-5 gap-1.5 mt-3 pt-2.5 border-t border-sky-400/10">
              {years.map((y) => {
                const isActive = y.year === selectedYear;
                return (
                  <button
                    key={y.year}
                    type="button"
                    onClick={() => setSelectedYear(y.year)}
                    className={`py-1.5 rounded-xl text-[11px] font-semibold tabular-nums transition-all duration-150 ${
                      isActive
                        ? "bg-[#0EA5E9] text-[#070D19] shadow-[0_0_12px_rgba(14,165,233,0.45)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {y.year}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ClimateTempLineChart({ years, selectedYear, onSelectYear }) {
  if (!years.length) return null;
  const temps = years.map((y) => y.avgTemp);
  const minT = Math.min(...temps) - 0.8;
  const maxT = Math.max(...temps) + 0.8;
  const span = maxT - minT || 1;

  const w = 320;
  const h = 112;
  const padX = 28;
  const stepX = (w - padX * 2) / Math.max(1, years.length - 1);

  const pts = years.map((y, i) => ({
    ...y,
    x: padX + i * stepX,
    y: 84 - ((y.avgTemp - minT) / span) * 52
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  const area = `${d} L ${pts[pts.length - 1].x} 96 L ${pts[0].x} 96 Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32 overflow-visible">
      <defs>
        <linearGradient id="climateTempArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#climateTempArea)" />
      <path d={d} fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />

      {pts.map((pt) => {
        const isSel = pt.year === selectedYear;
        return (
          <g key={pt.year} onClick={() => onSelectYear(pt.year)} className="cursor-pointer">
            <text
              x={pt.x}
              y={pt.y - 11}
              textAnchor="middle"
              fill={isSel ? "#FFFFFF" : "#94A3B8"}
              fontSize="10.5"
              fontWeight={isSel ? "700" : "500"}
            >
              {pt.avgTemp}{"\u00B0"}
            </text>
            {isSel && (
              <circle cx={pt.x} cy={pt.y} r="8" fill="#38BDF8" opacity="0.25" />
            )}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isSel ? 5 : 3.5}
              fill={isSel ? "#38BDF8" : "#0E1A2F"}
              stroke="#38BDF8"
              strokeWidth="2"
            />
          </g>
        );
      })}
    </svg>
  );
}

function ClimateRainBarChart({ years, selectedYear, onSelectYear }) {
  if (!years.length) return null;
  const maxRain = Math.max(...years.map((y) => y.annualRainfall), 100);

  return (
    <div className="h-32 grid grid-cols-5 gap-3 items-end pt-4 px-1">
      {years.map((y) => {
        const isSel = y.year === selectedYear;
        const pct = Math.max(18, Math.round((y.annualRainfall / maxRain) * 100));
        return (
          <button
            key={y.year}
            type="button"
            onClick={() => onSelectYear(y.year)}
            className="h-full flex flex-col items-center justify-end gap-1.5 group"
          >
            <span className={`text-[10px] tabular-nums font-semibold ${isSel ? "text-white" : "text-slate-400"}`}>
              {y.annualRainfall}
            </span>
            <div className="w-full h-20 flex items-end justify-center">
              <div
                className={`w-full max-w-[34px] rounded-t-xl transition-all duration-300 ${
                  isSel
                    ? "bg-gradient-to-t from-[#0284C7] to-[#38BDF8] shadow-[0_0_16px_rgba(56,189,248,0.45)]"
                    : "bg-sky-500/25 group-hover:bg-sky-400/40"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
