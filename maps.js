/*
  ElectionLab Maps
  ----------------
  - Real U.S. state maps for Senate and Governors
  - U.S.-shaped 435-seat hex map for the House
  - Correct state-to-race navigation
*/

const MAP_DEPENDENCIES = {
  d3:
    "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js",

  topojson:
    "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js",

  atlas:
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
};

const STATE_FIPS_TO_CODE = {
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

const MAP_RATING_CLASSES = [
  "map-dem-safe",
  "map-dem-likely",
  "map-dem-lean",
  "map-dem-tilt",
  "map-tossup",
  "map-rep-tilt",
  "map-rep-lean",
  "map-rep-likely",
  "map-rep-safe",
  "map-no-race",
  "map-not-up",
  "map-unrated"
];

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    const pageType =
      document.body.dataset.raceType;

    try {
      if (
        pageType === "senate"
      ) {
        await initializeStateMap(
          "senateMap",
          "senate"
        );
      }

      if (
        pageType === "governor"
      ) {
        await initializeStateMap(
          "governorMap",
          "governor"
        );
      }

      if (
        pageType === "house"
      ) {
        await initializeHouseMap();
      }
    } catch (error) {
      console.error(
        "Election map failed:",
        error
      );

      showMapError(
        pageType,
        error
      );
    }
  }
);

function loadScriptOnce(
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
      (resolve, reject) => {
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
          { once: true }
        );

        existing.addEventListener(
          "error",
          reject,
          { once: true }
        );
      }
    );
  }

  return new Promise(
    (resolve, reject) => {
      const script =
        document.createElement(
          "script"
        );

      script.src = src;
      script.async = true;

      script.onload = resolve;

      script.onerror = () => {
        reject(
          new Error(
            `Unable to load ${src}`
          )
        );
      };

      document.head.appendChild(
        script
      );
    }
  );
}

async function loadMapDependencies() {
  await loadScriptOnce(
    MAP_DEPENDENCIES.d3,
    "d3"
  );

  await loadScriptOnce(
    MAP_DEPENDENCIES.topojson,
    "topojson"
  );
}
async function getStateAtlas() {
  const response =
    await fetch(
      MAP_DEPENDENCIES.atlas
    );

  if (!response.ok) {
    throw new Error(
      "Unable to download the U.S. map data."
    );
  }

  return response.json();
}

function stateCodeFromFeature(
  feature
) {
  return (
    STATE_FIPS_TO_CODE[
      String(
        feature.id
      ).padStart(
        2,
        "0"
      )
    ] || ""
  );
}

function normalizeOffice(
  value
) {
  const office =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (
    office === "governors"
  ) {
    return "governor";
  }

  return office;
}

async function getMapRaces(
  office
) {
  const normalizedOffice =
    normalizeOffice(
      office
    );

  if (
    typeof getPublishedRaces ===
    "function"
  ) {
    const races =
      await getPublishedRaces(
        normalizedOffice
      );

    return races || [];
  }

  if (
    typeof sb === "undefined"
  ) {
    throw new Error(
      "Supabase is not available."
    );
  }

  const {
    data,
    error
  } =
    await sb
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

  if (error) {
    throw error;
  }

  return data || [];
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
        String(
          race.state || ""
        )
          .trim()
          .toUpperCase();

      if (
        /^[A-Z]{2}$/.test(
          state
        )
      ) {
        lookup[
          state
        ] = race;
      }

      return lookup;
    },
    {}
  );
}

function mapClassForRace(
  race,
  office
) {
  if (!race) {
    return office ===
      "senate"
      ? "map-not-up"
      : "map-no-race";
  }

  const rating =
    String(
      race.rating || ""
    )
      .trim()
      .toLowerCase();

  const margin =
    Number(
      race.projected_margin ||
        0
    );

  const party =
    margin >= 0
      ? "dem"
      : "rep";

  if (
    rating.includes(
      "toss"
    ) ||
    rating.includes(
      "tied"
    )
  ) {
    return "map-tossup";
  }

  if (
    rating.includes(
      "safe"
    )
  ) {
    return `map-${party}-safe`;
  }

  if (
    rating.includes(
      "likely"
    ) ||
    rating.includes(
      "likley"
    )
  ) {
    return `map-${party}-likely`;
  }

  if (
    rating.includes(
      "lean"
    )
  ) {
    return `map-${party}-lean`;
  }

  if (
    rating.includes(
      "tilt"
    )
  ) {
    return `map-${party}-tilt`;
  }

  return "map-tossup";
}

function readableRating(
  race,
  office
) {
  if (!race) {
    return office ===
      "senate"
      ? "Not up in 2026"
      : "No published forecast";
  }

  return (
    race.rating ||
    "Toss-up"
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
      Loading U.S. map…
    </div>
  `;

  await loadMapDependencies();

  const [
    atlas,
    races
  ] =
    await Promise.all([
      getStateAtlas(),
      getMapRaces(
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

  const width =
    975;

  const height =
    610;

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

  const raceLookup =
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
          office ===
          "senate"
            ? "Senate"
            : "Governor"
        } forecast map`
      );

  const stateGroup =
    svg.append(
      "g"
    );

  stateGroup
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
      "class",
      feature => {
        const code =
          stateCodeFromFeature(
            feature
          );

        const race =
          raceLookup[
            code
          ];

        return [
          "usMapState",
          mapClassForRace(
            race,
            office
          ),
          race
            ? "hasRace"
            : ""
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          );
      }
    )
    .attr(
      "d",
      path
    )
    .attr(
      "tabindex",
      feature => {
        const code =
          stateCodeFromFeature(
            feature
          );

        return raceLookup[
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
          stateCodeFromFeature(
            feature
          );

        return raceLookup[
          code
        ]
          ? "link"
          : "img";
      }
    );
    stateGroup
    .selectAll(
      "path"
    )
    .attr(
      "aria-label",
      feature => {
        const code =
          stateCodeFromFeature(
            feature
          );

        const race =
          raceLookup[
            code
          ];

        const stateName =
          STATE_NAMES[
            code
          ] || code;

        if (!race) {
          return `${stateName}: ${readableRating(
            null,
            office
          )}`;
        }

        return `${stateName}: ${
          race.title ||
          "Published race"
        }, ${readableRating(
          race,
          office
        )}`;
      }
    )
    .on(
      "mouseenter",
      (
        event,
        feature
      ) => {
        const code =
          stateCodeFromFeature(
            feature
          );

        showStateTooltip(
          event,
          code,
          raceLookup[
            code
          ],
          office
        );
      }
    )
    .on(
      "mousemove",
      moveStateTooltip
    )
    .on(
      "mouseleave",
      hideStateTooltip
    )
    .on(
      "click",
      (
        event,
        feature
      ) => {
        event.preventDefault();
        event.stopPropagation();

        const code =
          stateCodeFromFeature(
            feature
          );

        openRaceFromMap(
          raceLookup[
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
        event.stopPropagation();

        const code =
          stateCodeFromFeature(
            feature
          );

        openRaceFromMap(
          raceLookup[
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
    raceLookup,
    office
  );

  ensureMapTooltip();
}

function addStateLabels(
  svg,
  features,
  path,
  raceLookup,
  office
) {
  const labelOffsets = {
    CT: [-8, 6],
    DE: [7, 8],
    DC: [12, 10],
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
          stateCodeFromFeature(
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
          stateCodeFromFeature(
            feature
          );

        const ratingClass =
          mapClassForRace(
            raceLookup[
              code
            ],
            office
          );

        const darkText =
          [
            "map-dem-tilt",
            "map-rep-tilt",
            "map-no-race",
            "map-unrated"
          ].includes(
            ratingClass
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
          stateCodeFromFeature(
            feature
          );

        const centroid =
          path.centroid(
            feature
          );

        return (
          centroid[0] +
          (
            labelOffsets[
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
          stateCodeFromFeature(
            feature
          );

        const centroid =
          path.centroid(
            feature
          );

        return (
          centroid[1] +
          (
            labelOffsets[
              code
            ]?.[1] ||
            0
          )
        );
      }
    )
    .text(
      feature =>
        stateCodeFromFeature(
          feature
        )
    );
}

function openRaceFromMap(
  race
) {
  if (
    !race ||
    !race.slug
  ) {
    return;
  }

  location.href =
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
function showStateTooltip(
  event,
  stateCode,
  race,
  office
) {
  const tooltip =
    document.getElementById(
      "mapTooltip"
    );

  if (!tooltip) {
    return;
  }

  const stateName =
    STATE_NAMES[
      stateCode
    ] || stateCode;

  const title =
    race?.title ||
    stateName;

  const rating =
    readableRating(
      race,
      office
    );

  const leader =
    race
      ? leadingCandidateText(
          race
        )
      : "";

  tooltip.innerHTML = `
    <strong>
      ${escapeMapHtml(
        title
      )}
    </strong>

    <span>
      ${escapeMapHtml(
        rating
      )}
    </span>

    ${
      leader
        ? `
          <span>
            ${escapeMapHtml(
              leader
            )}
          </span>
        `
        : ""
    }
  `;

  tooltip.classList.add(
    "visible"
  );

  moveStateTooltip(
    event
  );
}

function moveStateTooltip(
  event
) {
  const tooltip =
    document.getElementById(
      "mapTooltip"
    );

  if (!tooltip) {
    return;
  }

  const padding = 14;

  const tooltipWidth =
    tooltip.offsetWidth ||
    190;

  const tooltipHeight =
    tooltip.offsetHeight ||
    70;

  let left =
    event.clientX +
    padding;

  let top =
    event.clientY +
    padding;

  if (
    left +
      tooltipWidth >
    window.innerWidth -
      12
  ) {
    left =
      event.clientX -
      tooltipWidth -
      padding;
  }

  if (
    top +
      tooltipHeight >
    window.innerHeight -
      12
  ) {
    top =
      event.clientY -
      tooltipHeight -
      padding;
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

function hideStateTooltip() {
  const tooltip =
    document.getElementById(
      "mapTooltip"
    );

  if (tooltip) {
    tooltip.classList.remove(
      "visible"
    );
  }
}

function leadingCandidateText(
  race
) {
  const candidates =
    [
      ...(
        race.candidates ||
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

  if (!leader) {
    return "";
  }

  return `${
    leader.name ||
    "Leading candidate"
  }: ${Number(
    leader.win_probability ||
      0
  ).toFixed(0)}% chance`;
}

function escapeMapHtml(
  value
) {
  return String(
    value || ""
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

/* =========================================================
   HOUSE HEX MAP
   ========================================================= */

const HOUSE_HEX_WIDTH =
  24;

const HOUSE_HEX_HEIGHT =
  28;

const HOUSE_HEX_X_GAP =
  20;

const HOUSE_HEX_Y_GAP =
  24;

const HOUSE_MAP_WIDTH =
  1180;

const HOUSE_MAP_HEIGHT =
  660;

/*
  Each state has one fixed anchor point and a preferred
  number of district columns.

  Districts are kept together by state, while the overall
  arrangement follows the shape of the United States.
*/

const HOUSE_STATE_LAYOUT = {
  WA: {
    x: 65,
    y: 55,
    columns: 5
  },

  OR: {
    x: 58,
    y: 132,
    columns: 3
  },

  CA: {
    x: 45,
    y: 215,
    columns: 6
  },

  ID: {
    x: 177,
    y: 108,
    columns: 2
  },

  NV: {
    x: 152,
    y: 224,
    columns: 2
  },

  MT: {
    x: 250,
    y: 58,
    columns: 2
  },

  WY: {
    x: 260,
    y: 150,
    columns: 1
  },

  UT: {
    x: 225,
    y: 235,
    columns: 2
  },

  AZ: {
    x: 205,
    y: 335,
    columns: 3
  },

  ND: {
    x: 360,
    y: 63,
    columns: 1
  },

  SD: {
    x: 363,
    y: 132,
    columns: 1
  },

  NE: {
    x: 355,
    y: 205,
    columns: 2
  },

  CO: {
    x: 305,
    y: 270,
    columns: 3
  },

  NM: {
    x: 302,
    y: 365,
    columns: 2
  },

  KS: {
    x: 390,
    y: 275,
    columns: 2
  },

  OK: {
    x: 395,
    y: 360,
    columns: 3
  },

  TX: {
    x: 345,
    y: 445,
    columns: 8
  },

  MN: {
    x: 460,
    y: 65,
    columns: 3
  },

  IA: {
    x: 462,
    y: 185,
    columns: 2
  },

  MO: {
    x: 468,
    y: 275,
    columns: 3
  },

  AR: {
    x: 480,
    y: 370,
    columns: 2
  },

  LA: {
    x: 482,
    y: 468,
    columns: 3
  },

  WI: {
    x: 552,
    y: 102,
    columns: 3
  },

  IL: {
    x: 555,
    y: 215,
    columns: 4
  },

  MS: {
    x: 560,
    y: 408,
    columns: 2
  },

  MI: {
    x: 650,
    y: 95,
    columns: 4
  },

  IN: {
    x: 642,
    y: 242,
    columns: 3
  },

  KY: {
    x: 640,
    y: 325,
    columns: 3
  },

  TN: {
    x: 652,
    y: 395,
    columns: 5
  },

  AL: {
    x: 657,
    y: 472,
    columns: 3
  },

  OH: {
    x: 742,
    y: 212,
    columns: 4
  },

  WV: {
    x: 770,
    y: 305,
    columns: 2
  },

  GA: {
    x: 752,
    y: 455,
    columns: 4
  },

  FL: {
    x: 760,
    y: 552,
    columns: 8
  },

  PA: {
    x: 835,
    y: 180,
    columns: 5
  },

  VA: {
    x: 845,
    y: 318,
    columns: 5
  },

  NC: {
    x: 850,
    y: 390,
    columns: 6
  },

  SC: {
    x: 830,
    y: 475,
    columns: 3
  },

  NY: {
    x: 945,
    y: 90,
    columns: 6
  },

  VT: {
    x: 1034,
    y: 47,
    columns: 1
  },

  NH: {
    x: 1070,
    y: 50,
    columns: 1
  },

  ME: {
    x: 1110,
    y: 40,
    columns: 2
  },

  MA: {
    x: 1048,
    y: 120,
    columns: 4
  },

  RI: {
    x: 1120,
    y: 168,
    columns: 1
  },

  CT: {
    x: 1050,
    y: 184,
    columns: 3
  },

  NJ: {
    x: 975,
    y: 238,
    columns: 3
  },

  DE: {
    x: 988,
    y: 308,
    columns: 1
  },

  MD: {
    x: 910,
    y: 290,
    columns: 4
  },

  AK: {
    x: 70,
    y: 550,
    columns: 1
  },

  HI: {
    x: 170,
    y: 580,
    columns: 2
  }
};
function normalizeHouseStateCode(
  race
) {
  const rawState =
    String(
      race?.state || ""
    )
      .trim()
      .toUpperCase();

  if (
    HOUSE_STATE_LAYOUT[
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

  const directMatch =
    combined.match(
      /\b([A-Z]{2})[-_\s](?:\d{1,2}|AL)\b/
    );

  if (
    directMatch &&
    HOUSE_STATE_LAYOUT[
      directMatch[1]
    ]
  ) {
    return directMatch[1];
  }

  const stateNameToCode = {
    ALABAMA: "AL",
    ALASKA: "AK",
    ARIZONA: "AZ",
    ARKANSAS: "AR",
    CALIFORNIA: "CA",
    COLORADO: "CO",
    CONNECTICUT: "CT",
    DELAWARE: "DE",
    FLORIDA: "FL",
    GEORGIA: "GA",
    HAWAII: "HI",
    IDAHO: "ID",
    ILLINOIS: "IL",
    INDIANA: "IN",
    IOWA: "IA",
    KANSAS: "KS",
    KENTUCKY: "KY",
    LOUISIANA: "LA",
    MAINE: "ME",
    MARYLAND: "MD",
    MASSACHUSETTS: "MA",
    MICHIGAN: "MI",
    MINNESOTA: "MN",
    MISSISSIPPI: "MS",
    MISSOURI: "MO",
    MONTANA: "MT",
    NEBRASKA: "NE",
    NEVADA: "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    OHIO: "OH",
    OKLAHOMA: "OK",
    OREGON: "OR",
    PENNSYLVANIA: "PA",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    TENNESSEE: "TN",
    TEXAS: "TX",
    UTAH: "UT",
    VERMONT: "VT",
    VIRGINIA: "VA",
    WASHINGTON: "WA",
    "WEST VIRGINIA": "WV",
    WISCONSIN: "WI",
    WYOMING: "WY"
  };

  for (
    const [
      stateName,
      stateCode
    ] of Object.entries(
      stateNameToCode
    )
  ) {
    if (
      combined.includes(
        stateName
      )
    ) {
      return stateCode;
    }
  }

  return "";
}

async function initializeHouseMap() {
  const map =
    document.getElementById(
      "houseHexMap"
    );

  if (!map) {
    return;
  }

  ensureHouseMapStyles();

  map.innerHTML = `
    <div class="loading">
      Loading House map…
    </div>
  `;

  const races =
    await getMapRaces(
      "house"
    );

  renderHouseHexMap(
    map,
    races
  );
}

function renderHouseHexMap(
  map,
  races
) {
  if (!races.length) {
    map.innerHTML = `
      <div class="empty">
        No published House races yet.
      </div>
    `;

    return;
  }

  const groupedRaces =
    races.reduce(
      (
        groups,
        race
      ) => {
        const state =
          normalizeHouseStateCode(
            race
          );

        if (
          !state ||
          !HOUSE_STATE_LAYOUT[
            state
          ]
        ) {
          console.warn(
            "Skipped House race with unrecognized state:",
            race
          );

          return groups;
        }

        if (
          !groups[state]
        ) {
          groups[state] = [];
        }

        groups[state].push(
          race
        );

        return groups;
      },
      {}
    );

  const stateMarkup =
    Object.entries(
      HOUSE_STATE_LAYOUT
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
                groupedRaces[
                  state
                ] || []
              )
            ].sort(
              (
                first,
                second
              ) =>
                getHouseDistrictNumber(
                  first
                ) -
                getHouseDistrictNumber(
                  second
                )
            );

          if (
            !stateRaces.length
          ) {
            return "";
          }

          return createHouseStateMarkup(
            state,
            layout,
            stateRaces
          );
        }
      )
      .join("");

  if (
    !stateMarkup.trim()
  ) {
    map.innerHTML = `
      <div class="empty">
        House races loaded, but none could be placed on the map.
      </div>
    `;

    return;
  }

  map.innerHTML = `
    <div class="houseMapViewport">
      <div
        class="houseMapCanvas"
        role="img"
        aria-label="United States House forecast map"
      >
        ${stateMarkup}
      </div>
    </div>
  `;

  bindHouseMapButtons(
    map
  );

  fitHouseMapToContainer();
}

function createHouseStateMarkup(
  state,
  layout,
  races
) {
  const positions =
    buildHouseStatePositions(
      races.length,
      layout.columns
    );

  const districts =
    races
      .map(
        (
          race,
          index
        ) =>
          createHouseHexMarkup(
            race,
            positions[
              index
            ]
          )
      )
      .join("");

  return `
    <section
      class="houseStateCluster"
      style="
        left:${layout.x}px;
        top:${layout.y}px;
      "
      aria-label="${escapeMapHtml(
        STATE_NAMES[
          state
        ] || state
      )}"
    >
      <div class="houseStateHeading">
        ${escapeMapHtml(
          state
        )}
      </div>

      <div class="houseStateDistricts">
        ${districts}
      </div>
    </section>
  `;
}

function buildHouseStatePositions(
  count,
  requestedColumns
) {
  const positions = [];

  const columns =
    Math.max(
      1,
      Math.min(
        Number(
          requestedColumns || 1
        ),
        count
      )
    );

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const row =
      Math.floor(
        index / columns
      );

    const column =
      index % columns;

    const stagger =
      row % 2 === 1
        ? HOUSE_HEX_X_GAP / 2
        : 0;

    positions.push({
      left:
        column *
          HOUSE_HEX_X_GAP +
        stagger,

      top:
        row *
        HOUSE_HEX_Y_GAP
    });
  }

  return positions;
}

function createHouseHexMarkup(
  race,
  position
) {
  const district =
    houseDistrictLabel(
      race
    );

  const description =
    buildHouseRaceDescription(
      race
    );

  const mapClass =
    mapClassForRace(
      race,
      "house"
    );

  return `
    <button
      class="houseHex ${mapClass}"
      type="button"
      data-race-slug="${escapeMapHtml(
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
      <span class="houseHexLabel">
        ${escapeMapHtml(
          district
        )}
      </span>
    </button>
  `;
}
function bindHouseMapButtons(
  map
) {
  map
    .querySelectorAll(
      "[data-race-slug]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          event => {
            event.preventDefault();
            event.stopPropagation();

            const slug =
              button.dataset
                .raceSlug;

            if (!slug) {
              return;
            }

            location.href =
              "race.html?id=" +
              encodeURIComponent(
                slug
              );
          }
        );
      }
    );
}

function houseDistrictLabel(
  race
) {
  const title =
    String(
      race?.title || ""
    )
      .trim()
      .toUpperCase();

  const slug =
    String(
      race?.slug || ""
    )
      .trim()
      .toUpperCase();

  const state =
    normalizeHouseStateCode(
      race
    );

  const combined =
    `${title} ${slug}`;

  const districtMatch =
    combined.match(
      /\b([A-Z]{2})[-_\s](AL|\d{1,2})\b/
    );

  if (
    districtMatch
  ) {
    return (
      districtMatch[1] +
      "-" +
      districtMatch[2]
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

function getHouseDistrictNumber(
  race
) {
  const label =
    houseDistrictLabel(
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

function buildHouseRaceDescription(
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
      houseDistrictLabel(
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

function ensureHouseMapStyles() {
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
      box-sizing: border-box;
      padding: 12px;
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

    .houseStateCluster {
      position: absolute;
    }

    .houseStateHeading {
      position: absolute;
      top: -15px;
      left: 0;
      z-index: 1;
      font-size: 9px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0.4px;
      color: #536273;
      pointer-events: none;
      user-select: none;
      white-space: nowrap;
    }

    .houseStateDistricts {
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
    }

    .houseHex:hover,
    .houseHex:focus-visible {
      transform: scale(1.35);
      filter: brightness(1.08);
      z-index: 100;
      outline: none;
    }

    .houseHexLabel {
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

    .houseHex.map-tossup .houseHexLabel,
    .houseHex.map-no-race .houseHexLabel,
    .houseHex.map-not-up .houseHexLabel,
    .houseHex.map-unrated .houseHexLabel,
    .houseHex.map-dem-tilt .houseHexLabel,
    .houseHex.map-rep-tilt .houseHexLabel {
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

function fitHouseMapToContainer() {
  const map =
    document.getElementById(
      "houseHexMap"
    );

  const viewport =
    map?.querySelector(
      ".houseMapViewport"
    );

  const canvas =
    map?.querySelector(
      ".houseMapCanvas"
    );

  if (
    !map ||
    !viewport ||
    !canvas
  ) {
    return;
  }

  const availableWidth =
    Math.max(
      280,
      map.clientWidth -
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
        fitHouseMapToContainer,
        120
      );
  }
);

/* =========================================================
   GENERAL MAP ERROR HANDLING
   ========================================================= */

function showMapError(
  pageType,
  error
) {
  let container =
    null;

  if (
    pageType ===
    "senate"
  ) {
    container =
      document.getElementById(
        "senateMap"
      );
  }

  if (
    pageType ===
    "governor"
  ) {
    container =
      document.getElementById(
        "governorMap"
      );
  }

  if (
    pageType ===
    "house"
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
