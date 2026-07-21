const STATE_CODES = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY"
};

const ALL_STATE_CODES = Object.values(STATE_CODES);

const RATING_VALUES = {
  "Safe Republican": -4,
  "Likely Republican": -3,
  "Lean Republican": -2,
  "Tilt Republican": -1,

  "Toss-up": 0,

  "Tilt Democratic": 1,
  "Lean Democratic": 2,
  "Likely Democratic": 3,
  "Safe Democratic": 4
};

const RATING_COLORS = [
  [0.00, "#8b1e2d"],
  [0.12, "#c94752"],
  [0.25, "#e78087"],
  [0.37, "#f0b3b7"],

  [0.49, "#e7c76a"],
  [0.51, "#e7c76a"],

  [0.63, "#a9c4f5"],
  [0.75, "#6f9ce8"],
  [0.88, "#356dcc"],
  [1.00, "#163f91"]
];

function mapOfficeFromPage() {
  const path = location.pathname.toLowerCase();

  if (path.includes("governors")) return "governor";
  if (path.includes("senate")) return "senate";
  if (path.includes("house")) return "house";

  return null;
}

function mapOfficeLabel(office) {
  if (office === "governor") return "Governor";
  if (office === "house") return "U.S. House";
  return "U.S. Senate";
}

function mapRatingValue(rating) {
  return RATING_VALUES[rating] ?? 0;
}

function candidateSummary(race) {
  const candidates = [...(race.candidates || [])].sort(
    (a, b) =>
      Number(b.win_probability || 0) -
      Number(a.win_probability || 0)
  );

  if (!candidates.length) {
    return "No candidates added";
  }

  return candidates
    .slice(0, 3)
    .map(candidate => {
      return `${candidate.name}: ${Number(
        candidate.win_probability || 0
      ).toFixed(0)}%`;
    })
    .join("<br>");
}

async function loadForecastMap() {
  const mapBox = document.querySelector("#forecastMap");

  if (!mapBox) return;

  if (!configured) {
    mapBox.innerHTML = `
      <div class="empty">
        Connect Supabase to display the forecast map.
      </div>
    `;
    return;
  }

  const office = mapOfficeFromPage();

  if (!office) return;

  try {
    const races = await getPublishedRaces(office);

    const racesByCode = {};

    for (const race of races) {
      const code = STATE_CODES[race.state];

      if (code) {
        racesByCode[code] = race;
      }
    }

    const values = ALL_STATE_CODES.map(code => {
      const race = racesByCode[code];

      if (!race) return null;

      return mapRatingValue(race.rating);
    });

    const hoverText = ALL_STATE_CODES.map(code => {
      const race = racesByCode[code];

      if (!race) {
        return `${code}<br>No published race`;
      }

      const margin = Number(race.projected_margin || 0);

      return `
        <b>${escapeHtml(race.title)}</b><br>
        ${escapeHtml(race.rating)}<br>
        Model margin:
        ${margin >= 0 ? "D +" : "R +"}
        ${Math.abs(margin).toFixed(1)}
        <br><br>
        ${candidateSummary(race)}
      `;
    });

    const data = [
      {
        type: "choropleth",
        locationmode: "USA-states",
        locations: ALL_STATE_CODES,
        z: values,
        zmin: -4,
        zmax: 4,
        text: hoverText,
        hovertemplate: "%{text}<extra></extra>",
        colorscale: RATING_COLORS,
        showscale: false,
        marker: {
          line: {
            color: "#ffffff",
            width: 1.5
          }
        }
      }
    ];

    const layout = {
      geo: {
        scope: "usa",
        bgcolor: "rgba(0,0,0,0)",
        lakecolor: "rgba(0,0,0,0)",
        showlakes: false
      },

      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",

      margin: {
        l: 0,
        r: 0,
        t: 0,
        b: 0
      },

      dragmode: false
    };

    const options = {
      responsive: true,
      displayModeBar: false,
      scrollZoom: false
    };

    await Plotly.newPlot(
      mapBox,
      data,
      layout,
      options
    );

    mapBox.on("plotly_click", event => {
      const stateCode =
        event?.points?.[0]?.location;

      const race = racesByCode[stateCode];

      if (!race) return;

      location.href =
        `race.html?id=${encodeURIComponent(race.slug)}`;
    });

    const mapTitle =
      document.querySelector("#mapTitle");

    if (mapTitle) {
      mapTitle.textContent =
        `2026 ${mapOfficeLabel(office)} Forecast Map`;
    }
  } catch (error) {
    mapBox.innerHTML = `
      <div class="empty">
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

document.addEventListener(
  "DOMContentLoaded",
  loadForecastMap
);
