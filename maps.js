/*
  ElectionLab Maps
  ----------------
  Clean rebuild:
  - Senate state map
  - Governor state map
  - House district hex cartogram
  - Visible error messages instead of endless loading
*/

const MAP_ASSETS = {
  d3:
    "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js",

  topojson:
    "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js",

  states:
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
};

const STATE_FIPS = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY"
};

const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming"
};

document.addEventListener(
  "DOMContentLoaded",
  startElectionMap
);

async function startElectionMap() {
  const pageType =
    String(
      document.body.dataset.raceType || ""
    )
      .trim()
      .toLowerCase();

  try {
    if (pageType === "house") {
      await initializeHouseMap();
      return;
    }

    if (pageType === "senate") {
      await initializeStateMap(
        "senateMap",
        "senate"
      );
      return;
    }

    if (pageType === "governor") {
      await initializeStateMap(
        "governorMap",
        "governor"
      );
    }
  } catch (error) {
    console.error(
      "ElectionLab map error:",
      error
    );

    showMapError(
      pageType,
      error
    );
  }
}

function withTimeout(
  promise,
  milliseconds,
  message
) {
  return Promise.race([
    promise,

    new Promise(
      (
        resolve,
        reject
      ) => {
        window.setTimeout(
          () => {
            reject(
              new Error(
                message
              )
            );
          },
          milliseconds
        );
      }
    )
  ]);
}

function loadExternalScript(
  src,
  globalName
) {
  if (
    globalName &&
    window[globalName]
  ) {
    return Promise.resolve();
  }

  const existing =
    document.querySelector(
      `script[src="${src}"]`
    );

  if (existing) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        if (
          globalName &&
          window[globalName]
        ) {
          resolve();
          return;
        }

        existing.addEventListener(
          "load",
          resolve,
          {
            once: true
          }
        );

        existing.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                `Could not load ${src}`
              )
            );
          },
          {
            once: true
          }
        );
      }
    );
  }

  return new Promise(
    (
      resolve,
      reject
    ) => {
      const script =
        document.createElement(
          "script"
        );

      script.src = src;
      script.async = true;

      script.addEventListener(
        "load",
        resolve,
        {
          once: true
        }
      );

      script.addEventListener(
        "error",
        () => {
          reject(
            new Error(
              `Could not load ${src}`
            )
          );
        },
        {
          once: true
        }
      );

      document.head.appendChild(
        script
      );
    }
  );
}

async function loadStateMapLibraries() {
  await withTimeout(
    loadExternalScript(
      MAP_ASSETS.d3,
      "d3"
    ),
    10000,
    "D3 took too long to load."
  );

  await withTimeout(
    loadExternalScript(
      MAP_ASSETS.topojson,
      "topojson"
    ),
    10000,
    "TopoJSON took too long to load."
  );
}

async function fetchStateAtlas() {
  const response =
    await withTimeout(
      fetch(
        MAP_ASSETS.states
      ),
      10000,
      "The U.S. map data took too long to load."
    );

  if (!response.ok) {
    throw new Error(
      "The U.S. map data could not be downloaded."
    );
  }

  return response.json();
}

function normalizeOffice(
  office
) {
  const normalized =
    String(
      office || ""
    )
      .trim()
      .toLowerCase();

  return normalized ===
    "governors"
    ? "governor"
    : normalized;
}

async function fetchMapRaces(
  office
) {
  const normalizedOffice =
    normalizeOffice(
      office
    );

  if (
    typeof sb === "undefined" ||
    !sb
  ) {
    throw new Error(
      "Supabase has not been initialized."
    );
  }

  const request =
    sb
      .from("races")
      .select(
        "*,candidates(*)"
      )
      .eq(
        "status",
        "published"
      )
      .eq(
        "office",
        normalizedOffice
      );

  const result =
    await withTimeout(
      request,
      12000,
      `Published ${normalizedOffice} races took too long to load.`
    );

  if (result.error) {
    throw result.error;
  }

  return Array.isArray(
    result.data
  )
    ? result.data
    : [];
}

function escapeMapHtml(
  value
) {
  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function raceMapClass(
  race,
  office
) {
  if (!race) {
    return office === "senate"
      ? "map-not-up"
      : "map-no-race";
  }

  const rating =
    String(
      race.rating || ""
    )
      .trim()
      .toLowerCase();

  if (
    rating.includes("toss") ||
    rating.includes("tied")
  ) {
    return "map-tossup";
  }

  const margin =
    Number(
      race.projected_margin || 0
    );

  const party =
    margin >= 0
      ? "dem"
      : "rep";

  if (rating.includes("safe")) {
    return `map-${party}-safe`;
  }

  if (
    rating.includes("likely") ||
    rating.includes("likley")
  ) {
    return `map-${party}-likely`;
  }

  if (rating.includes("lean")) {
    return `map-${party}-lean`;
  }

  if (rating.includes("tilt")) {
    return `map-${party}-tilt`;
  }

  return "map-tossup";
}
function raceByState(
  races
) {
  return races.reduce(
    (
      lookup,
      race
    ) => {
      const state =
        normalizeStateCode(
          race
        );

      if (state) {
        lookup[state] =
          race;
      }

      return lookup;
    },
    {}
  );
}

function normalizeStateCode(
  race
) {
  const rawState =
    String(
      race?.state || ""
    )
      .trim()
      .toUpperCase();

  if (
    STATE_NAMES[
      rawState
    ]
  ) {
    return rawState;
  }

  const combined =
    [
      race?.state,
      race?.title,
      race?.slug
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();

  const districtMatch =
    combined.match(
      /\b([A-Z]{2})[-_\s](?:AL|\d{1,2})\b/
    );

  if (
    districtMatch &&
    STATE_NAMES[
      districtMatch[1]
    ]
  ) {
    return districtMatch[1];
  }

  const stateNameToCode = {};

  Object.entries(
    STATE_NAMES
  ).forEach(
    (
      [
        code,
        name
      ]
    ) => {
      stateNameToCode[
        name.toUpperCase()
      ] = code;
    }
  );

  for (
    const [
      name,
      code
    ] of Object.entries(
      stateNameToCode
    )
  ) {
    if (
      combined.includes(
        name
      )
    ) {
      return code;
    }
  }

  return "";
}

function featureStateCode(
  feature
) {
  return (
    STATE_FIPS[
      String(
        feature.id
      ).padStart(
        2,
        "0"
      )
    ] || ""
  );
}

async function initializeStateMap(
  containerId,
  office
) {
  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="loading">
      Loading U.S. map...
    </div>
  `;

  await loadStateMapLibraries();

  const [
    atlas,
    races
  ] =
    await Promise.all([
      fetchStateAtlas(),
      fetchMapRaces(
        office
      )
    ]);

  renderStateMap(
    container,
    atlas,
    races,
    office
  );
}

function renderStateMap(
  container,
  atlas,
  races,
  office
) {
  if (
    !window.d3 ||
    !window.topojson
  ) {
    throw new Error(
      "The map libraries did not load correctly."
    );
  }

  if (
    !atlas?.objects?.states
  ) {
    throw new Error(
      "The U.S. state map data is invalid."
    );
  }

  const states =
    topojson.feature(
      atlas,
      atlas.objects.states
    );

  const borders =
    topojson.mesh(
      atlas,
      atlas.objects.states,
      (
        first,
        second
      ) =>
        first !==
        second
    );

  const width = 975;
  const height = 610;

  const projection =
    d3
      .geoAlbersUsa()
      .fitSize(
        [
          width,
          height
        ],
        states
      );

  const path =
    d3.geoPath(
      projection
    );

  const lookup =
    raceByState(
      races
    );

  container.innerHTML =
    "";

  const svg =
    d3
      .select(
        container
      )
      .append(
        "svg"
      )
      .attr(
        "class",
        "usMapSvg"
      )
      .attr(
        "viewBox",
        `0 0 ${width} ${height}`
      )
      .attr(
        "role",
        "img"
      )
      .attr(
        "aria-label",
        `${
          office === "senate"
            ? "Senate"
            : "Governor"
        } forecast map`
      );

  svg
    .append(
      "g"
    )
    .selectAll(
      "path"
    )
    .data(
      states.features
    )
    .join(
      "path"
    )
    .attr(
      "d",
      path
    )
    .attr(
      "class",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        const race =
          lookup[
            code
          ];

        return [
          "usMapState",
          raceMapClass(
            race,
            office
          ),
          race
            ? "hasRace"
            : ""
        ]
          .filter(Boolean)
          .join(" ");
      }
    )
    .attr(
      "tabindex",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        return lookup[
          code
        ]
          ? 0
          : -1;
      }
    )
    .attr(
      "role",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        return lookup[
          code
        ]
          ? "link"
          : "img";
      }
    )
    .attr(
      "aria-label",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        const race =
          lookup[
            code
          ];

        const stateName =
          STATE_NAMES[
            code
          ] || code;

        if (!race) {
          return office ===
            "senate"
            ? `${stateName}: not up in 2026`
            : `${stateName}: no published forecast`;
        }

        return `${stateName}: ${
          race.title ||
          "Published race"
        }, ${
          race.rating ||
          "Toss-up"
        }`;
      }
    )
    .on(
      "mouseenter",
      (
        event,
        feature
      ) => {
        const code =
          featureStateCode(
            feature
          );

        showMapTooltip(
          event,
          lookup[
            code
          ],
          STATE_NAMES[
            code
          ] || code,
          office
        );
      }
    )
    .on(
      "mousemove",
      moveMapTooltip
    )
    .on(
      "mouseleave",
      hideMapTooltip
    )
    .on(
      "click",
      (
        event,
        feature
      ) => {
        event.preventDefault();

        const code =
          featureStateCode(
            feature
          );

        openRacePage(
          lookup[
            code
          ]
        );
      }
    )
    .on(
      "keydown",
      (
        event,
        feature
      ) => {
        if (
          event.key !==
            "Enter" &&
          event.key !==
            " "
        ) {
          return;
        }

        event.preventDefault();

        const code =
          featureStateCode(
            feature
          );

        openRacePage(
          lookup[
            code
          ]
        );
      }
    );

  svg
    .append(
      "path"
    )
    .datum(
      borders
    )
    .attr(
      "d",
      path
    )
    .attr(
      "fill",
      "none"
    )
    .attr(
      "stroke",
      "rgba(255,255,255,.85)"
    )
    .attr(
      "stroke-width",
      0.9
    )
    .attr(
      "vector-effect",
      "non-scaling-stroke"
    )
    .attr(
      "pointer-events",
      "none"
    );

  addStateLabels(
    svg,
    states.features,
    path,
    lookup,
    office
  );

  ensureMapTooltip();
}

function addStateLabels(
  svg,
  features,
  path,
  lookup,
  office
) {
  const offsets = {
    CT: [-8, 6],
    DE: [7, 8],
    FL: [10, 10],
    HI: [12, 6],
    LA: [-2, 8],
    MA: [12, -1],
    MD: [9, 7],
    MI: [9, 9],
    NH: [8, -2],
    NJ: [8, 2],
    RI: [12, 5],
    VT: [-7, -3]
  };

  svg
    .append(
      "g"
    )
    .selectAll(
      "text"
    )
    .data(
      features.filter(
        feature =>
          featureStateCode(
            feature
          ) !== "DC"
      )
    )
    .join(
      "text"
    )
    .attr(
      "class",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        const mapClass =
          raceMapClass(
            lookup[
              code
            ],
            office
          );

        const darkText =
          [
            "map-dem-tilt",
            "map-rep-tilt",
            "map-no-race",
            "map-not-up",
            "map-unrated"
          ].includes(
            mapClass
          );

        return darkText
          ? "usMapStateLabel dark"
          : "usMapStateLabel";
      }
    )
    .attr(
      "x",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        const [
          x
        ] =
          path.centroid(
            feature
          );

        return (
          x +
          (
            offsets[
              code
            ]?.[0] ||
            0
          )
        );
      }
    )
    .attr(
      "y",
      feature => {
        const code =
          featureStateCode(
            feature
          );

        const [
          ,
          y
        ] =
          path.centroid(
            feature
          );

        return (
          y +
          (
            offsets[
              code
            ]?.[1] ||
            0
          )
        );
      }
    )
    .text(
      feature =>
        featureStateCode(
          feature
        )
    );
}

function openRacePage(
  race
) {
  if (
    !race?.slug
  ) {
    return;
  }

  window.location.href =
    "race.html?id=" +
    encodeURIComponent(
      race.slug
    );
}

function ensureMapTooltip() {
  if (
    document.getElementById(
      "mapTooltip"
    )
  ) {
    return;
  }

  const tooltip =
    document.createElement(
      "div"
    );

  tooltip.id =
    "mapTooltip";

  tooltip.className =
    "mapTooltip";

  tooltip.setAttribute(
    "role",
    "tooltip"
  );

  document.body.appendChild(
    tooltip
  );
}

function showMapTooltip(
  event,
  race,
  fallbackTitle,
  office
) {
  const tooltip =
    document.getElementById(
      "mapTooltip"
    );

  if (!tooltip) {
    return;
  }

  const title =
    race?.title ||
    fallbackTitle;

  let status = "";

  if (race) {
    status =
      race.rating ||
      "Toss-up";
  } else {
    status =
      office === "senate"
        ? "Not up in 2026"
        : "No published forecast";
  }

  const candidates =
    [
      ...(
        race?.candidates ||
        []
      )
    ].sort(
      (
        first,
        second
      ) =>
        Number(
          second.win_probability ||
            0
        ) -
        Number(
          first.win_probability ||
            0
        )
    );

  const leader =
    candidates[0];

  tooltip.innerHTML = `
    <strong>
      ${escapeMapHtml(
        title
      )}
    </strong>

    <span>
      ${escapeMapHtml(
        status
      )}
    </span>

    ${
      leader
        ? `
          <span>
            ${escapeMapHtml(
              leader.name ||
              "Leading candidate"
            )}: ${Number(
              leader.win_probability ||
              0
            ).toFixed(0)}%
          </span>
        `
        : ""
    }
  `;

  tooltip.classList.add(
    "visible"
  );

  moveMapTooltip(
    event
  );
}

function moveMapTooltip(
  event
) {
  const tooltip =
    document.getElementById(
      "mapTooltip"
    );

  if (!tooltip) {
    return;
  }

  const gap = 14;

  let left =
    event.clientX +
    gap;

  let top =
    event.clientY +
    gap;

  const width =
    tooltip.offsetWidth ||
    190;

  const height =
    tooltip.offsetHeight ||
    70;

  if (
    left +
      width >
    window.innerWidth -
      12
  ) {
    left =
      event.clientX -
      width -
      gap;
  }

  if (
    top +
      height >
    window.innerHeight -
      12
  ) {
    top =
      event.clientY -
      height -
      gap;
  }

  tooltip.style.left =
    `${Math.max(
      8,
      left
    )}px`;

  tooltip.style.top =
    `${Math.max(
      8,
      top
    )}px`;
}

function hideMapTooltip() {
  const tooltip =
    document.getElementById(
      "mapTooltip"
    );

  tooltip?.classList.remove(
    "visible"
  );
}
/* =========================================================
   HOUSE DISTRICT MAP
   ========================================================= */

const HOUSE_MAP_WIDTH =
  1120;

const HOUSE_MAP_HEIGHT =
  610;

const HOUSE_HEX_WIDTH =
  22;

const HOUSE_HEX_HEIGHT =
  25;

const HOUSE_HEX_X_STEP =
  18;

const HOUSE_HEX_Y_STEP =
  21;

/*
  State cluster positions.

  Each state is placed in its approximate geographic
  location. Districts are arranged compactly inside
  each state cluster.
*/

const HOUSE_LAYOUT = {
  WA: { x: 45, y: 55, cols: 5 },
  OR: { x: 42, y: 120, cols: 3 },
  CA: { x: 38, y: 200, cols: 7 },

  ID: { x: 170, y: 105, cols: 2 },
  NV: { x: 145, y: 220, cols: 2 },
  MT: { x: 245, y: 55, cols: 2 },
  WY: { x: 255, y: 145, cols: 1 },
  UT: { x: 220, y: 225, cols: 2 },
  AZ: { x: 200, y: 320, cols: 3 },

  ND: { x: 350, y: 60, cols: 1 },
  SD: { x: 355, y: 125, cols: 1 },
  NE: { x: 348, y: 195, cols: 2 },
  CO: { x: 300, y: 260, cols: 3 },
  NM: { x: 295, y: 350, cols: 2 },
  KS: { x: 382, y: 260, cols: 2 },
  OK: { x: 382, y: 345, cols: 3 },
  TX: { x: 335, y: 430, cols: 8 },

  MN: { x: 445, y: 65, cols: 3 },
  IA: { x: 445, y: 180, cols: 2 },
  MO: { x: 450, y: 265, cols: 3 },
  AR: { x: 462, y: 350, cols: 2 },
  LA: { x: 466, y: 440, cols: 3 },

  WI: { x: 535, y: 100, cols: 3 },
  IL: { x: 535, y: 210, cols: 4 },
  MS: { x: 545, y: 395, cols: 2 },

  MI: { x: 630, y: 90, cols: 4 },
  IN: { x: 625, y: 230, cols: 3 },
  KY: { x: 625, y: 310, cols: 3 },
  TN: { x: 630, y: 375, cols: 5 },
  AL: { x: 635, y: 450, cols: 3 },

  OH: { x: 720, y: 200, cols: 4 },
  WV: { x: 748, y: 290, cols: 2 },
  GA: { x: 730, y: 435, cols: 4 },
  FL: { x: 735, y: 525, cols: 8 },

  PA: { x: 805, y: 170, cols: 5 },
  VA: { x: 810, y: 300, cols: 5 },
  NC: { x: 815, y: 375, cols: 6 },
  SC: { x: 805, y: 455, cols: 3 },

  NY: { x: 910, y: 85, cols: 6 },
  VT: { x: 1005, y: 45, cols: 1 },
  NH: { x: 1040, y: 48, cols: 1 },
  ME: { x: 1070, y: 40, cols: 2 },

  MA: { x: 1015, y: 115, cols: 4 },
  RI: { x: 1080, y: 160, cols: 1 },
  CT: { x: 1015, y: 178, cols: 3 },

  NJ: { x: 945, y: 225, cols: 3 },
  DE: { x: 955, y: 295, cols: 1 },
  MD: { x: 875, y: 280, cols: 4 },

  AK: { x: 65, y: 520, cols: 1 },
  HI: { x: 155, y: 550, cols: 2 }
};

async function initializeHouseMap() {
  const container =
    document.getElementById(
      "houseHexMap"
    );

  if (!container) {
    return;
  }

  addHouseMapStyles();

  container.innerHTML = `
    <div class="loading">
      Loading House map...
    </div>
  `;

  const races =
    await fetchMapRaces(
      "house"
    );

  renderHouseMap(
    container,
    races
  );
}

function renderHouseMap(
  container,
  races
) {
  if (
    !Array.isArray(races) ||
    !races.length
  ) {
    container.innerHTML = `
      <div class="empty">
        No published House races were found.
      </div>
    `;

    return;
  }

  const grouped =
    groupHouseRaces(
      races
    );

  const statesMarkup =
    Object.entries(
      HOUSE_LAYOUT
    )
      .map(
        (
          [
            state,
            layout
          ]
        ) => {
          const stateRaces =
            [
              ...(
                grouped[state] ||
                []
              )
            ].sort(
              (
                first,
                second
              ) =>
                getDistrictNumber(
                  first
                ) -
                getDistrictNumber(
                  second
                )
            );

          if (
            !stateRaces.length
          ) {
            return "";
          }

          return buildHouseState(
            state,
            layout,
            stateRaces
          );
        }
      )
      .join("");

  if (!statesMarkup) {
    container.innerHTML = `
      <div class="empty">
        House races loaded, but their states could not be recognized.
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="houseMapViewport">
      <div
        class="houseMapCanvas"
        aria-label="United States House forecast map"
      >
        ${statesMarkup}
      </div>
    </div>
  `;

  container
    .querySelectorAll(
      "[data-house-race]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const slug =
              button.dataset
                .houseRace;

            if (!slug) {
              return;
            }

            window.location.href =
              "race.html?id=" +
              encodeURIComponent(
                slug
              );
          }
        );
      }
    );

  fitHouseMap();
}

function groupHouseRaces(
  races
) {
  return races.reduce(
    (
      groups,
      race
    ) => {
      const state =
        normalizeStateCode(
          race
        );

      if (
        !state ||
        !HOUSE_LAYOUT[
          state
        ]
      ) {
        console.warn(
          "House race skipped because its state was not recognized:",
          race
        );

        return groups;
      }

      if (!groups[state]) {
        groups[state] =
          [];
      }

      groups[state].push(
        race
      );

      return groups;
    },
    {}
  );
}

function buildHouseState(
  state,
  layout,
  races
) {
  const districtButtons =
    races
      .map(
        (
          race,
          index
        ) => {
          const position =
            getHouseHexPosition(
              index,
              layout.cols
            );

          const district =
            getDistrictLabel(
              race
            );

          const description =
            getHouseDescription(
              race
            );

          return `
            <button
              class="houseHex ${raceMapClass(
                race,
                "house"
              )}"
              type="button"
              data-house-race="${escapeMapHtml(
                race.slug || ""
              )}"
              style="
                left:${position.left}px;
                top:${position.top}px;
              "
              title="${escapeMapHtml(
                description
              )}"
              aria-label="${escapeMapHtml(
                description
              )}"
            >
              <span>
                ${escapeMapHtml(
                  district
                )}
              </span>
            </button>
          `;
        }
      )
      .join("");

  return `
    <div
      class="houseState"
      style="
        left:${layout.x}px;
        top:${layout.y}px;
      "
    >
      <div class="houseStateName">
        ${escapeMapHtml(
          state
        )}
      </div>

      <div class="houseStateSeats">
        ${districtButtons}
      </div>
    </div>
  `;
}

function getHouseHexPosition(
  index,
  requestedColumns
) {
  const columns =
    Math.max(
      1,
      Number(
        requestedColumns || 1
      )
    );

  const row =
    Math.floor(
      index / columns
    );

  const column =
    index % columns;

  return {
    left:
      column *
        HOUSE_HEX_X_STEP +
      (
        row % 2
          ? HOUSE_HEX_X_STEP /
            2
          : 0
      ),

    top:
      row *
      HOUSE_HEX_Y_STEP
  };
}

function getDistrictLabel(
  race
) {
  const state =
    normalizeStateCode(
      race
    );

  const combined =
    [
      race?.title,
      race?.slug
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();

  const fullMatch =
    combined.match(
      /\b([A-Z]{2})[-_\s](AL|\d{1,2})\b/
    );

  if (fullMatch) {
    return (
      fullMatch[1] +
      "-" +
      fullMatch[2]
    );
  }

  const numberMatch =
    combined.match(
      /\b(?:DISTRICT\s*)?(\d{1,2})(?:ST|ND|RD|TH)?\b/
    );

  if (
    numberMatch &&
    state
  ) {
    return (
      state +
      "-" +
      numberMatch[1]
    );
  }

  return state
    ? `${state}-AL`
    : "HOUSE";
}

function getDistrictNumber(
  race
) {
  const label =
    getDistrictLabel(
      race
    );

  if (
    label.endsWith(
      "-AL"
    )
  ) {
    return 0;
  }

  const match =
    label.match(
      /-(\d+)$/
    );

  return match
    ? Number(
        match[1]
      )
    : 0;
}

function getHouseDescription(
  race
) {
  const candidates =
    [
      ...(
        race?.candidates ||
        []
      )
    ].sort(
      (
        first,
        second
      ) =>
        Number(
          second.win_probability ||
            0
        ) -
        Number(
          first.win_probability ||
            0
        )
    );

  const leader =
    candidates[0];

  const parts = [
    race?.title ||
      getDistrictLabel(
        race
      ),

    race?.rating ||
      "Toss-up"
  ];

  if (leader) {
    parts.push(
      `${
        leader.name ||
        "Leading candidate"
      } ${Number(
        leader.win_probability ||
          0
      ).toFixed(0)}%`
    );
  }

  return parts.join(
    " — "
  );
}
function addHouseMapStyles() {
  if (
    document.getElementById(
      "electionLabHouseMapStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "electionLabHouseMapStyles";

  style.textContent = `
    #houseHexMap {
      width: 100%;
      padding: 12px;
      box-sizing: border-box;
      overflow: hidden;
    }

    .houseMapViewport {
      width: 100%;
      overflow: hidden;
      position: relative;
    }

    .houseMapCanvas {
      position: relative;
      width: ${HOUSE_MAP_WIDTH}px;
      height: ${HOUSE_MAP_HEIGHT}px;
      min-width: ${HOUSE_MAP_WIDTH}px;
      transform-origin: top left;
    }

    .houseState {
      position: absolute;
    }

    .houseStateName {
      position: absolute;
      top: -15px;
      left: 0;
      z-index: 1;
      font-size: 9px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0.4px;
      color: #536273;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    }

    .houseStateSeats {
      position: relative;
    }

    .houseHex {
      position: absolute;
      width: ${HOUSE_HEX_WIDTH}px;
      height: ${HOUSE_HEX_HEIGHT}px;
      margin: 0;
      padding: 0;
      border: 1px solid rgba(
        255,
        255,
        255,
        0.9
      );
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      clip-path: polygon(
        25% 2%,
        75% 2%,
        100% 50%,
        75% 98%,
        25% 98%,
        0 50%
      );
      transition:
        transform 120ms ease,
        filter 120ms ease;
      z-index: 2;
      font-family: inherit;
    }

    .houseHex:hover,
    .houseHex:focus-visible {
      transform: scale(1.35);
      filter: brightness(1.08);
      z-index: 100;
      outline: none;
    }

    .houseHex span {
      font-size: 5.5px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -0.25px;
      color: #ffffff;
      text-shadow:
        0 1px 2px rgba(
          0,
          0,
          0,
          0.65
        );
      white-space: nowrap;
      pointer-events: none;
    }

    .houseHex.map-tossup span,
    .houseHex.map-no-race span,
    .houseHex.map-not-up span,
    .houseHex.map-unrated span,
    .houseHex.map-dem-tilt span,
    .houseHex.map-rep-tilt span {
      color: #172033;
      text-shadow: none;
    }

    @media (
      max-width: 700px
    ) {
      #houseHexMap {
        padding-left: 4px;
        padding-right: 4px;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}

function fitHouseMap() {
  const container =
    document.getElementById(
      "houseHexMap"
    );

  const viewport =
    container?.querySelector(
      ".houseMapViewport"
    );

  const canvas =
    container?.querySelector(
      ".houseMapCanvas"
    );

  if (
    !container ||
    !viewport ||
    !canvas
  ) {
    return;
  }

  const availableWidth =
    Math.max(
      280,
      container.clientWidth -
        24
    );

  const scale =
    Math.min(
      1,
      availableWidth /
        HOUSE_MAP_WIDTH
    );

  canvas.style.transform =
    `scale(${scale})`;

  viewport.style.height =
    `${Math.ceil(
      HOUSE_MAP_HEIGHT *
      scale
    )}px`;
}

window.addEventListener(
  "resize",
  () => {
    window.clearTimeout(
      window
        .electionLabHouseResizeTimer
    );

    window
      .electionLabHouseResizeTimer =
      window.setTimeout(
        fitHouseMap,
        120
      );
  }
);

function showMapError(
  pageType,
  error
) {
  let container =
    null;

  if (
    pageType === "senate"
  ) {
    container =
      document.getElementById(
        "senateMap"
      );
  }

  if (
    pageType === "governor"
  ) {
    container =
      document.getElementById(
        "governorMap"
      );
  }

  if (
    pageType === "house"
  ) {
    container =
      document.getElementById(
        "houseHexMap"
      );
  }

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty">
      ${escapeMapHtml(
        error?.message ||
          "Unable to load the election map."
      )}
    </div>
  `;
}
