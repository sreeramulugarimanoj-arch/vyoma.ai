# VYOMA — Atmospheric Intelligence & Telemetry

**VYOMA** is a dark-mode-first, mobile-first (`480px` centered frame) atmospheric telemetry, world radar, air quality, and 5-year ERA5 climate intelligence web application.

## Screens & User Flow

1. **Screen 1 — Landing / Splash Portal:** Glassmorphic hero portal with celestial moon/cloud illustration, `Launch World Radar →` CTA, and quick-access preset city chips (`Visakhapatnam`, `Madanapalle`, `Tirupati`) plus saved favorites.
2. **Screen 2 — World Radar Command:** Interactive Leaflet global map supporting **Weather Map** (ArcGIS `World_Dark_Gray` with midnight-navy atmospheric tint + RainViewer IR Clouds + animated precipitation radar), **Satellite** (ArcGIS `World_Imagery` + boundaries/places), and **Dark Radar**, plus 12 live global hub beacons, city/coordinate autocomplete + `SCAN` transition, and tap-to-inspect preview cards.
3. **Screen 3 — City Atmospheric Telemetry Dashboard:**
   - Hero current weather readout and Hi/Lo range
   - **Hourly Atmosphere:** 24h smooth SVG temperature curve with precipitation badges and scrollable dual-tone icon timeline
   - **Next 7 Days Forecast:** Horizontal swipeable forecast cards
   - **Collapsible Telemetry:** 6-metric grid (`Feels like`, `Wind`, `Humidity`, `UV`, `Visibility`, `Air pressure`), AQI circular gauge + `PM2.5` / `PM10` / `CO` / `SO₂` breakdown (`µg/m³`), and Solar Arc (`Sunrise` / `Sunset`)
   - **5-Year Climate Trend (ERA5 2021–2025):** Interactive `Temp` line chart & `Rain` bar chart, `2021–2025` year selector tabs, KPIs, and natural-language climate intelligence summary

## Quick Launch

- **Direct Launch:** Double-click `standalone.html` in any modern browser.
- **Local HTTP Server (Windows):** Double-click `start-server.bat` or run:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\start-server.ps1
  ```

## Project Structure

```text
project26/
├── index.html          # Modular entry point (<meta charset="UTF-8" /> first in <head>)
├── standalone.html     # Self-contained zero-dependency bundle
├── start-server.bat    # Windows batch launcher
├── start-server.ps1    # PowerShell static HTTP server (port 3000)
├── css/
│   └── vyoma.css       # Midnight navy glassmorphism, 480px shell, animations
└── js/
    ├── api.js          # Open-Meteo Geocoding, Forecast, AQI, ERA5 & RainViewer client
    ├── icons.js        # Lucide UI icons, dual-tone weather SVGs & celestial art
    ├── weather-codes.js# WMO weather metadata mapping
    └── app.jsx         # Screens 1–3 React application
```
