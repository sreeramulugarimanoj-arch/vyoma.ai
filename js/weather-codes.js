// VYOMA Atmospheric Intelligence - WMO Weather Codes & Human Comfort Mapping
// Translates meteorological telemetry into human-first sensory comfort insights

export const WMO_CODES = {
  0: {
    description: "Clear",
    category: "clear",
    icon: "sun",
    comfort: "Crisp, bright skies with full solar luminosity.",
    clothing: "Sunglasses and breathable clothing recommended.",
    ambientTheme: "clear-day"
  },
  1: {
    description: "Mainly Clear",
    category: "clear",
    icon: "sun",
    comfort: "Mild ambient sunlight with faint decorative clouds.",
    clothing: "Comfortable casual wear.",
    ambientTheme: "clear-day"
  },
  2: {
    description: "Partly Cloudy",
    category: "cloudy",
    icon: "cloud-sun",
    comfort: "Soft scattered cloud cover diffusing direct glare.",
    clothing: "Ideal outdoor walking weather; light layers.",
    ambientTheme: "partly-cloudy"
  },
  3: {
    description: "Mostly Cloudy",
    category: "cloudy",
    icon: "cloud",
    comfort: "Uniform cloud ceiling with soft diffuse lighting.",
    clothing: "Light sweater or jacket suited for cool shade.",
    ambientTheme: "overcast"
  },
  45: {
    description: "Foggy Mist",
    category: "fog",
    icon: "cloud-fog",
    comfort: "Cool atmospheric fog; damp air with lowered horizon clarity.",
    clothing: "Warm moisture-resistant outerwear.",
    ambientTheme: "mist"
  },
  48: {
    description: "Depositing Rime Fog",
    category: "fog",
    icon: "cloud-fog",
    comfort: "Sub-zero freezing vapor creating delicate rime crystals.",
    clothing: "Heavy insulated coat and thermal protection.",
    ambientTheme: "mist"
  },
  51: {
    description: "Light Drizzle",
    category: "drizzle",
    icon: "cloud-drizzle",
    comfort: "Gentle mist-like drizzle; soft soothing ambient sounds.",
    clothing: "Water-resistant windbreaker; small umbrella handy.",
    ambientTheme: "rain"
  },
  53: {
    description: "Moderate Drizzle",
    category: "drizzle",
    icon: "cloud-drizzle",
    comfort: "Persistent refreshing drizzle moistening pavements.",
    clothing: "Waterproof shell and dry footwear.",
    ambientTheme: "rain"
  },
  55: {
    description: "Dense Drizzle",
    category: "drizzle",
    icon: "cloud-drizzle",
    comfort: "Thick soaking drizzle with high ambient humidity.",
    clothing: "Sturdy umbrella and water-repellent jacket.",
    ambientTheme: "rain"
  },
  56: {
    description: "Freezing Drizzle",
    category: "snow",
    icon: "cloud-snow",
    comfort: "Supercooled drizzle glazing surface paths with ice.",
    clothing: "Crampons or non-slip insulated boots required.",
    ambientTheme: "snow"
  },
  57: {
    description: "Dense Freezing Drizzle",
    category: "snow",
    icon: "cloud-snow",
    comfort: "Icy drizzle forming hazardous glazed conditions.",
    clothing: "Heavy thermal parka and slip-resistant footwear.",
    ambientTheme: "snow"
  },
  61: {
    description: "Slight Rain",
    category: "rain",
    icon: "cloud-rain",
    comfort: "Intermittent light rain showers washing the air clean.",
    clothing: "Light waterproof jacket and an umbrella.",
    ambientTheme: "rain"
  },
  63: {
    description: "Moderate Rain",
    category: "rain",
    icon: "cloud-rain",
    comfort: "Steady rhythmic rainfall; cooler breeze and humid atmosphere.",
    clothing: "Waterproof hooded jacket and umbrella essential.",
    ambientTheme: "rain"
  },
  65: {
    description: "Heavy Rain",
    category: "rain",
    icon: "cloud-rain-wind",
    comfort: "Intense downpours with pooling water and dramatic skies.",
    clothing: "Full rain gear; prioritize indoor activities if possible.",
    ambientTheme: "storm"
  },
  66: {
    description: "Freezing Rain",
    category: "snow",
    icon: "cloud-snow",
    comfort: "Sub-zero raindrops freezing instantaneously on contact.",
    clothing: "Heavy thermal insulation; beware of slippery walkways.",
    ambientTheme: "snow"
  },
  67: {
    description: "Heavy Freezing Rain",
    category: "snow",
    icon: "cloud-snow",
    comfort: "Severe ice storm conditions creating heavy glaze.",
    clothing: "Remain sheltered in warm interiors if possible.",
    ambientTheme: "snow"
  },
  71: {
    description: "Slight Snow Fall",
    category: "snow",
    icon: "snowflake",
    comfort: "Gentle fluttering snowflakes dancing down softly.",
    clothing: "Warm down jacket, gloves, and cozy knit scarf.",
    ambientTheme: "snow"
  },
  73: {
    description: "Moderate Snow Fall",
    category: "snow",
    icon: "snowflake",
    comfort: "Steady snowfall creating an ethereal blanket across the ground.",
    clothing: "Insulated winter jacket, beanie, and snow boots.",
    ambientTheme: "snow"
  },
  75: {
    description: "Heavy Snow Fall",
    category: "snow",
    icon: "snowflake",
    comfort: "Dense blizzard-like snowfall muting sound across the city.",
    clothing: "Full multi-layer polar outerwear.",
    ambientTheme: "snow"
  },
  77: {
    description: "Snow Grains",
    category: "snow",
    icon: "snowflake",
    comfort: "Small crisp icy grains tapping against windows.",
    clothing: "Warm windproof jacket and insulated headwear.",
    ambientTheme: "snow"
  },
  80: {
    description: "Rain Showers",
    category: "rain",
    icon: "cloud-drizzle",
    comfort: "Brief passing showers; clean post-rain air.",
    clothing: "Packable rain jacket ready for quick bursts.",
    ambientTheme: "rain"
  },
  81: {
    description: "Rain Showers",
    category: "rain",
    icon: "cloud-rain",
    comfort: "Lively showers with brisk refreshing wind gusts.",
    clothing: "Raincoat and sturdy wind-tolerant umbrella.",
    ambientTheme: "rain"
  },
  82: {
    description: "Violent Rain Showers",
    category: "rain",
    icon: "cloud-rain-wind",
    comfort: "Torrential downpours accompanied by rapid temperature drops.",
    clothing: "Stay under solid awning or indoor lounge until passed.",
    ambientTheme: "storm"
  },
  85: {
    description: "Light Snow Showers",
    category: "snow",
    icon: "snowflake",
    comfort: "Passing flurries under a pearlescent wintry sky.",
    clothing: "Warm wool coat and insulated gloves.",
    ambientTheme: "snow"
  },
  86: {
    description: "Heavy Snow Showers",
    category: "snow",
    icon: "snowflake",
    comfort: "Rapidly accumulating snow squalls with chilly gusts.",
    clothing: "Thermal layers and waterproof snow boots.",
    ambientTheme: "snow"
  },
  95: {
    description: "Thunderstorm",
    category: "storm",
    icon: "cloud-lightning",
    comfort: "Dynamic atmospheric charge, thunder rumbles, and flashes.",
    clothing: "Best enjoyed from cozy interior space with warm tea.",
    ambientTheme: "storm"
  },
  96: {
    description: "Thunderstorm with Slight Hail",
    category: "storm",
    icon: "cloud-lightning",
    comfort: "Electric squalls with occasional ice pellets clattering down.",
    clothing: "Seek indoor shelter; avoid open elevated terrain.",
    ambientTheme: "storm"
  },
  99: {
    description: "Severe Hail Thunderstorm",
    category: "storm",
    icon: "cloud-lightning",
    comfort: "High-energy electrical storm with heavy hail projectiles.",
    clothing: "Safe indoor shelter strictly advised.",
    ambientTheme: "storm"
  }
};

export function getWeatherMeta(code, isDay = 1) {
  const meta = WMO_CODES[code] || WMO_CODES[0];
  let iconName = meta.icon;
  if (!isDay) {
    if (iconName === "sun") iconName = "moon";
    if (iconName === "cloud-sun") iconName = "cloud-moon";
  }
  return {
    ...meta,
    icon: iconName,
    isDay: Boolean(isDay)
  };
}

/**
 * Computes plain-language human comfort banner
 */
export function generateComfortSummary({ temp, feelsLike, humidity, uvIndex, rainChance, windSpeed, weatherCode, isDay }) {
  const meta = getWeatherMeta(weatherCode, isDay);
  const tempDiff = feelsLike - temp;

  let thermalPart = "";
  if (temp > 35) {
    thermalPart = "Extreme heat warning \u2014 stay hydrated in air-conditioned spaces";
  } else if (temp > 30) {
    thermalPart = humidity > 70 
      ? "Warm & humid \u2014 feels muggy, light breathable clothing recommended"
      : "Sun-drenched & warm \u2014 airy summer attire recommended";
  } else if (temp > 24) {
    thermalPart = humidity > 75
      ? "Balmy tropical air \u2014 humid breeze, feels slightly warm"
      : "Pleasantly warm & comfortable \u2014 ideal outdoor conditions";
  } else if (temp > 18) {
    thermalPart = "Mild, soothing room-like comfort \u2014 perfect for a relaxed stroll";
  } else if (temp > 12) {
    thermalPart = "Crisp refreshing air \u2014 a comfortable light jacket is ideal";
  } else if (temp > 5) {
    thermalPart = "Brisk cool weather \u2014 bundle up with a cozy sweater or coat";
  } else if (temp > 0) {
    thermalPart = "Chilly near-freezing chill \u2014 warm down jacket and gloves recommended";
  } else {
    thermalPart = "Sub-zero frostbite conditions \u2014 multi-layer thermal protection advised";
  }

  // Micro advice additions
  const adviceFlags = [];
  if (rainChance >= 60) {
    adviceFlags.push("Carry an umbrella");
  } else if (rainChance >= 30) {
    adviceFlags.push("Passing shower possible");
  }

  if (windSpeed > 32) {
    adviceFlags.push("Strong winds \u2014 secure loose items");
  } else if (windSpeed > 18) {
    adviceFlags.push("Lively pleasant breeze");
  }

  if (uvIndex >= 8 && isDay) {
    adviceFlags.push("Intense UV \u2014 apply SPF 50+");
  } else if (uvIndex >= 6 && isDay) {
    adviceFlags.push("Moderate UV \u2014 sunglasses recommended");
  }

  if (adviceFlags.length > 0) {
    return `${thermalPart} \u2022 ${adviceFlags.join(" \u2022 ")}`;
  }
  return thermalPart;
}
