// VYOMA Atmospheric Intelligence - Lucide UI Icons & Dual-Tone Glowing Weather SVGs
const getReact = () => {
  if (typeof window !== "undefined" && window.React) return window.React;
  return null;
};

export function Icon({ name, size = 20, className = "", strokeWidth = 2, ...props }) {
  const React = getReact();
  if (!React) return null;
  const h = React.createElement;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: `inline-block shrink-0 ${className}`,
    ...props
  };

  switch (name) {
    case "arrow-left":
      return h("svg", common,
        h("path", { d: "m12 19-7-7 7-7" }),
        h("path", { d: "M19 12H5" })
      );

    case "arrow-right":
      return h("svg", common,
        h("path", { d: "M5 12h14" }),
        h("path", { d: "m12 5 7 7-7 7" })
      );

    case "map":
      return h("svg", common,
        h("path", { d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" }),
        h("path", { d: "M15 5.764v15" }),
        h("path", { d: "M9 3.236v15" })
      );

    case "bookmark":
      return h("svg", common,
        h("path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" })
      );

    case "heart":
      return h("svg", common,
        h("path", { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" })
      );

    case "info":
      return h("svg", common,
        h("circle", { cx: "12", cy: "12", r: "10" }),
        h("path", { d: "M12 16v-4" }),
        h("path", { d: "M12 8h.01" })
      );

    case "lightbulb":
      return h("svg", common,
        h("path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }),
        h("path", { d: "M9 18h6" }),
        h("path", { d: "M10 22h4" })
      );

    case "sun":
      return h("svg", common,
        h("circle", { cx: "12", cy: "12", r: "4" }),
        h("path", { d: "M12 2v2" }),
        h("path", { d: "M12 20v2" }),
        h("path", { d: "m4.93 4.93 1.41 1.41" }),
        h("path", { d: "m17.66 17.66 1.41 1.41" }),
        h("path", { d: "M2 12h2" }),
        h("path", { d: "M20 12h2" }),
        h("path", { d: "m6.34 17.66-1.41 1.41" }),
        h("path", { d: "m19.07 4.93-1.41 1.41" })
      );

    case "moon":
      return h("svg", common,
        h("path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" })
      );

    case "cloud":
      return h("svg", common,
        h("path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" })
      );

    case "wind":
      return h("svg", common,
        h("path", { d: "M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" }),
        h("path", { d: "M9.6 4.6A2 2 0 1 1 11 8H2" }),
        h("path", { d: "M12.6 19.4A2 2 0 1 0 14 16H2" })
      );

    case "droplets":
      return h("svg", common,
        h("path", { d: "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" }),
        h("path", { d: "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" })
      );

    case "droplet":
      return h("svg", common,
        h("path", { d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" })
      );

    case "thermometer":
      return h("svg", common,
        h("path", { d: "M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" })
      );

    case "eye":
      return h("svg", common,
        h("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }),
        h("circle", { cx: "12", cy: "12", r: "3" })
      );

    case "gauge":
      return h("svg", common,
        h("path", { d: "m12 14 4-4" }),
        h("path", { d: "M3.34 19a10 10 0 1 1 17.32 0" })
      );

    case "map-pin":
      return h("svg", common,
        h("path", { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" }),
        h("circle", { cx: "12", cy: "10", r: "3" })
      );

    case "search":
      return h("svg", common,
        h("circle", { cx: "11", cy: "11", r: "8" }),
        h("path", { d: "m21 21-4.3-4.3" })
      );

    case "radar":
      return h("svg", common,
        h("path", { d: "M19.07 4.93A10 10 0 0 0 6.99 3.34" }),
        h("path", { d: "M4 6h.01" }),
        h("path", { d: "M2.29 9.62A10 10 0 1 0 21.31 8.35" }),
        h("path", { d: "M16.24 7.76A6 6 0 1 0 8.23 16.67" }),
        h("path", { d: "M12 18h.01" }),
        h("path", { d: "m12 12 4-4" }),
        h("circle", { cx: "12", cy: "12", r: "2" })
      );

    case "x":
      return h("svg", common,
        h("path", { d: "M18 6 6 18" }),
        h("path", { d: "m6 6 12 12" })
      );

    case "sunrise":
      return h("svg", common,
        h("path", { d: "M12 2v6" }),
        h("path", { d: "m4.93 10.93 1.41 1.41" }),
        h("path", { d: "M20 18h2" }),
        h("path", { d: "m19.07 10.93-1.41 1.41" }),
        h("path", { d: "M22 22H2" }),
        h("path", { d: "m8 6 4-4 4 4" }),
        h("path", { d: "M16 18a4 4 0 0 0-8 0" })
      );

    case "sunset":
      return h("svg", common,
        h("path", { d: "M12 10v6" }),
        h("path", { d: "m4.93 10.93 1.41 1.41" }),
        h("path", { d: "M20 18h2" }),
        h("path", { d: "m19.07 10.93-1.41 1.41" }),
        h("path", { d: "M22 22H2" }),
        h("path", { d: "m16 16-4 4-4-4" }),
        h("path", { d: "M16 18a4 4 0 0 0-8 0" })
      );

    case "chevron-down":
      return h("svg", common,
        h("path", { d: "m6 9 6 6 6-6" })
      );

    case "chevron-up":
      return h("svg", common,
        h("path", { d: "m18 15-6-6-6 6" })
      );

    case "crosshair":
      return h("svg", common,
        h("circle", { cx: "12", cy: "12", r: "10" }),
        h("line", { x1: "22", x2: "18", y1: "12", y2: "12" }),
        h("line", { x1: "6", x2: "2", y1: "12", y2: "12" }),
        h("line", { x1: "12", x2: "12", y1: "6", y2: "2" }),
        h("line", { x1: "12", x2: "12", y1: "22", y2: "18" })
      );

    case "refresh-cw":
      return h("svg", common,
        h("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
        h("path", { d: "M21 3v5h-5" }),
        h("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
        h("path", { d: "M8 16H3v5" })
      );

    case "globe":
      return h("svg", common,
        h("circle", { cx: "12", cy: "12", r: "10" }),
        h("path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }),
        h("path", { d: "M2 12h20" })
      );

    case "satellite":
      return h("svg", common,
        h("path", { d: "M13 7 9 3 5 7l4 4" }),
        h("path", { d: "m17 11 4 4-4 4-4-4" }),
        h("path", { d: "m8 12 4 4 6-6-4-4Z" }),
        h("path", { d: "m16 8 3-3" }),
        h("path", { d: "M9 21a6 6 0 0 0-6-6" })
      );

    case "cloud-rain":
      return h("svg", common,
        h("path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }),
        h("path", { d: "M16 14v6" }),
        h("path", { d: "M8 14v6" }),
        h("path", { d: "M12 16v6" })
      );

    case "layers":
      return h("svg", common,
        h("path", { d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" }),
        h("path", { d: "m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5" }),
        h("path", { d: "m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5" })
      );

    case "play":
      return h("svg", common,
        h("polygon", { points: "6 3 20 12 6 21 6 3", fill: "currentColor" })
      );

    case "pause":
      return h("svg", common,
        h("rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", fill: "currentColor" }),
        h("rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", fill: "currentColor" })
      );

    default:
      return h("svg", common,
        h("circle", { cx: "12", cy: "12", r: "10" }),
        h("line", { x1: "12", x2: "12", y1: "8", y2: "12" }),
        h("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })
      );
  }
}

/**
 * Custom Dual-Tone Glowing Weather SVG Icons
 */
export function WeatherGlyph({ type = "cloud-moon", size = 32, className = "" }) {
  const React = getReact();
  if (!React) return null;
  const h = React.createElement;
  const uid = React.useId ? React.useId().replace(/:/g, "") : Math.random().toString(36).slice(2, 7);

  const cloudPath = "M22.5 23H9.5a5.5 5.5 0 0 1-.4-10.98A7 7 0 0 1 22.4 13.5 4.75 4.75 0 0 1 22.5 23Z";

  const defs = h("defs", null,
    h("linearGradient", { id: `cloudGrad-${uid}`, x1: "0", y1: "0", x2: "0", y2: "1" },
      h("stop", { offset: "0%", stopColor: "#E2E8F0" }),
      h("stop", { offset: "100%", stopColor: "#64748B" })
    ),
    h("linearGradient", { id: `sunGrad-${uid}`, x1: "0", y1: "0", x2: "1", y2: "1" },
      h("stop", { offset: "0%", stopColor: "#FDE047" }),
      h("stop", { offset: "100%", stopColor: "#F59E0B" })
    ),
    h("linearGradient", { id: `moonGrad-${uid}`, x1: "0", y1: "0", x2: "1", y2: "1" },
      h("stop", { offset: "0%", stopColor: "#BAE6FD" }),
      h("stop", { offset: "100%", stopColor: "#38BDF8" })
    )
  );

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    className: `inline-block shrink-0 ${className}`
  };

  if (type === "sun") {
    return h("svg", svgProps, defs,
      h("circle", { cx: "16", cy: "16", r: "6.5", fill: `url(#sunGrad-${uid})`, style: { filter: "drop-shadow(0 0 6px rgba(251,191,36,0.55))" } }),
      h("g", { stroke: "#FCD34D", strokeWidth: "2", strokeLinecap: "round" },
        h("line", { x1: "16", y1: "3.5", x2: "16", y2: "6" }),
        h("line", { x1: "16", y1: "26", x2: "16", y2: "28.5" }),
        h("line", { x1: "3.5", y1: "16", x2: "6", y2: "16" }),
        h("line", { x1: "26", y1: "16", x2: "28.5", y2: "16" }),
        h("line", { x1: "7.2", y1: "7.2", x2: "9", y2: "9" }),
        h("line", { x1: "23", y1: "23", x2: "24.8", y2: "24.8" }),
        h("line", { x1: "24.8", y1: "7.2", x2: "23", y2: "9" }),
        h("line", { x1: "9", y1: "23", x2: "7.2", y2: "24.8" })
      )
    );
  }

  if (type === "moon") {
    return h("svg", svgProps, defs,
      h("path", {
        d: "M19.5 6.5A8.5 8.5 0 1 0 25.5 19.8 7 7 0 0 1 19.5 6.5Z",
        fill: `url(#moonGrad-${uid})`,
        style: { filter: "drop-shadow(0 0 6px rgba(56,189,248,0.5))" }
      }),
      h("circle", { cx: "24", cy: "9", r: "1.1", fill: "#E0F2FE", opacity: "0.85" }),
      h("circle", { cx: "10", cy: "8", r: "0.8", fill: "#7DD3FC", opacity: "0.7" })
    );
  }

  if (type === "cloud-sun") {
    return h("svg", svgProps, defs,
      h("circle", { cx: "21", cy: "11", r: "5", fill: `url(#sunGrad-${uid})`, style: { filter: "drop-shadow(0 0 5px rgba(251,191,36,0.5))" } }),
      h("path", { d: cloudPath, fill: `url(#cloudGrad-${uid})`, opacity: "0.95" })
    );
  }

  if (type === "cloud-moon") {
    return h("svg", svgProps, defs,
      h("path", {
        d: "M22.5 5.2A5.5 5.5 0 1 0 26.8 14a4.5 4.5 0 0 1-4.3-8.8Z",
        fill: `url(#moonGrad-${uid})`,
        style: { filter: "drop-shadow(0 0 5px rgba(56,189,248,0.5))" }
      }),
      h("path", { d: cloudPath, fill: `url(#cloudGrad-${uid})`, opacity: "0.95" })
    );
  }

  if (type === "cloud-rain" || type === "cloud-rain-wind" || type === "cloud-drizzle") {
    return h("svg", svgProps, defs,
      h("path", { d: "M22.5 20H9.5a5 5 0 0 1-.4-9.98A6.5 6.5 0 0 1 21.8 11.2 4.4 4.4 0 0 1 22.5 20Z", fill: `url(#cloudGrad-${uid})` }),
      h("g", { stroke: "#38BDF8", strokeWidth: "2", strokeLinecap: "round" },
        h("line", { x1: "11", y1: "23", x2: "9.8", y2: "26.5" }),
        h("line", { x1: "16", y1: "23", x2: "14.8", y2: "27.5" }),
        h("line", { x1: "21", y1: "23", x2: "19.8", y2: "26.5" })
      )
    );
  }

  if (type === "cloud-lightning") {
    return h("svg", svgProps, defs,
      h("path", { d: "M22.5 19.5H9.5a5 5 0 0 1-.4-9.98A6.5 6.5 0 0 1 21.8 10.7 4.4 4.4 0 0 1 22.5 19.5Z", fill: `url(#cloudGrad-${uid})` }),
      h("polygon", {
        points: "16.5,18 12.5,24 16,24 14.5,29 20,22.2 16.5,22.2",
        fill: "#FACC15",
        style: { filter: "drop-shadow(0 0 5px rgba(250,204,21,0.75))" }
      })
    );
  }

  if (type === "cloud-snow" || type === "snowflake") {
    return h("svg", svgProps, defs,
      h("path", { d: "M22.5 20H9.5a5 5 0 0 1-.4-9.98A6.5 6.5 0 0 1 21.8 11.2 4.4 4.4 0 0 1 22.5 20Z", fill: `url(#cloudGrad-${uid})` }),
      h("circle", { cx: "11", cy: "24.5", r: "1.4", fill: "#BAE6FD" }),
      h("circle", { cx: "16", cy: "26", r: "1.4", fill: "#E0F2FE" }),
      h("circle", { cx: "21", cy: "24.5", r: "1.4", fill: "#BAE6FD" })
    );
  }

  if (type === "cloud-fog") {
    return h("svg", svgProps, defs,
      h("path", { d: "M22 18H10a4.5 4.5 0 0 1-.3-8.98A6 6 0 0 1 21.4 10.2 4 4 0 0 1 22 18Z", fill: `url(#cloudGrad-${uid})`, opacity: "0.85" }),
      h("line", { x1: "7", y1: "22", x2: "25", y2: "22", stroke: "#7DD3FC", strokeWidth: "2", strokeLinecap: "round", opacity: "0.7" }),
      h("line", { x1: "9.5", y1: "25.5", x2: "22.5", y2: "25.5", stroke: "#38BDF8", strokeWidth: "2", strokeLinecap: "round", opacity: "0.5" })
    );
  }

  // Default cloud
  return h("svg", svgProps, defs,
    h("path", { d: cloudPath, fill: `url(#cloudGrad-${uid})` })
  );
}

/**
 * Animated Glowing Celestial Emblem (Welcome & Landing Portal)
 */
export function CelestialIllustration({ variant = "portal" }) {
  const React = getReact();
  if (!React) return null;
  const h = React.createElement;

  return h("div", { className: "relative w-36 h-28 mx-auto flex items-center justify-center animate-float-slow select-none" },
    h("div", {
      className: "absolute inset-0 rounded-full blur-2xl opacity-55 pointer-events-none",
      style: {
        background: variant === "welcome"
          ? "radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(14,165,233,0.12) 60%, transparent 75%)"
          : "radial-gradient(circle, rgba(56,189,248,0.38) 0%, rgba(2,132,199,0.12) 60%, transparent 75%)"
      }
    }),
    h("svg", { viewBox: "0 0 160 120", className: "w-full h-full overflow-visible relative z-10" },
      h("defs", null,
        h("radialGradient", { id: `orbGlow-${variant}`, cx: "35%", cy: "35%", r: "65%" },
          h("stop", { offset: "0%", stopColor: "#E0F2FE" }),
          h("stop", { offset: "50%", stopColor: "#38BDF8" }),
          h("stop", { offset: "100%", stopColor: "#0284C7" })
        ),
        h("linearGradient", { id: `glassCloud-${variant}`, x1: "0", y1: "0", x2: "0", y2: "1" },
          h("stop", { offset: "0%", stopColor: "rgba(241,245,249,0.95)" }),
          h("stop", { offset: "100%", stopColor: "rgba(148,163,184,0.55)" })
        )
      ),
      // Subtle outer orbit arc
      h("circle", {
        cx: "80", cy: "60", r: "48",
        fill: "none", stroke: "rgba(56,189,248,0.22)", strokeWidth: "1", strokeDasharray: "4 4"
      }),
      // Glowing Crescent Moon
      variant === "welcome"
        ? h("path", {
            d: "M103 24A24 24 0 1 0 121 63 19 19 0 0 1 103 24Z",
            fill: `url(#orbGlow-${variant})`,
            style: { filter: "drop-shadow(0 0 14px rgba(56,189,248,0.65))" }
          })
        : h("circle", {
            cx: "102", cy: "40", r: "22",
            fill: `url(#orbGlow-${variant})`,
            style: { filter: "drop-shadow(0 0 16px rgba(56,189,248,0.7))" }
          }),
      // Translucent Foreground Cloud
      h("path", {
        d: "M112 90H48a17 17 0 0 1-1.3-33.95A22 22 0 0 1 89.2 51a15 15 0 0 1 22.8 39Z",
        fill: `url(#glassCloud-${variant})`,
        stroke: "rgba(255,255,255,0.45)",
        strokeWidth: "1.2",
        style: { filter: "drop-shadow(0 12px 18px rgba(4,8,18,0.65))" }
      }),
      // Accent telemetry nodes
      h("circle", { cx: "34", cy: "40", r: "2", fill: "#38BDF8", opacity: "0.85" }),
      h("circle", { cx: "130", cy: "76", r: "1.8", fill: "#7DD3FC", opacity: "0.75" })
    )
  );
}
