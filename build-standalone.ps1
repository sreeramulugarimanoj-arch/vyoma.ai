$root = $PSScriptRoot
$css = Get-Content "$root\css\vyoma.css" -Raw -Encoding UTF8
$icons = (Get-Content "$root\js\icons.js" -Raw -Encoding UTF8) -replace '(?m)^export\s+', ''
$wcodes = (Get-Content "$root\js\weather-codes.js" -Raw -Encoding UTF8) -replace '(?m)^export\s+', ''
$api = (Get-Content "$root\js\api.js" -Raw -Encoding UTF8) -replace '(?m)^export\s+', ''
$app = (Get-Content "$root\js\app.jsx" -Raw -Encoding UTF8) -replace '(?ms)^import\s+\{[^}]+\}\s+from\s+"\.\/[^"]+";\r?\n?', '' -replace '(?m)^export\s+', ''

$bundleJsx = @"
$icons

$wcodes

$api

$app

const container = document.getElementById("root");
const root = window.ReactDOM.createRoot(container);
root.render(<VyomaApp />);
"@

$bundleJsx = $bundleJsx -replace '</script>', '<\/script>'

$html = @"
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>VYOMA — Atmospheric Intelligence &amp; Telemetry</title>
  <meta name="description" content="Instantaneous atmospheric telemetry, real-time air quality, world radar command, and 5-year ERA5 climate intelligence." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2242%22 fill=%22%23070D19%22 stroke=%22%2338BDF8%22 stroke-width=%226%22/><circle cx=%2250%22 cy=%2250%22 r=%2216%22 fill=%22%230EA5E9%22/></svg>" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace']
          }
        }
      }
    };
  </script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.24.7/babel.min.js"></script>

  <style>
$css
  </style>
</head>
<body class="bg-[#040812] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
  <div id="root">
    <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#070D19] to-[#0E1A2F]">
      <div class="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.25)] animate-pulse mb-4">
        <div class="w-6 h-6 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>
      </div>
      <div class="text-lg font-light tracking-[0.45em] text-white pl-[0.45em]">VYOMA</div>
      <div class="text-[11px] uppercase tracking-[0.25em] text-sky-400/80 mt-2">Initializing Telemetry</div>
    </div>
  </div>

  <script type="text/plain" id="vyoma-jsx-source">
$bundleJsx
  </script>

  <script>
    (function () {
      try {
        if (!window.React || !window.ReactDOM || !window.Babel) {
          throw new Error("React or Babel failed to load.");
        }
        var src = document.getElementById("vyoma-jsx-source").textContent;
        var compiled = window.Babel.transform(src, {
          presets: [["react", { runtime: "classic" }]]
        }).code;
        (0, eval)(compiled);
      } catch (err) {
        console.error("VYOMA standalone boot error:", err);
        var root = document.getElementById("root");
        if (root) {
          root.innerHTML = '<div class="min-h-screen flex items-center justify-center p-6 text-center bg-[#070D19] text-slate-200"><div class="max-w-sm p-6 rounded-3xl bg-[#101C30]/80 border border-sky-400/20"><h3 class="text-base font-semibold mb-2">Startup Error</h3><p class="text-xs text-slate-400">' + (err && err.message ? err.message : "Failed to initialize") + '</p></div></div>';
        }
      }
    })();
  </script>
</body>
</html>
"@

[System.IO.File]::WriteAllText("$root\standalone.html", $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "Generated standalone.html ($((Get-Item "$root\standalone.html").Length) bytes)"
