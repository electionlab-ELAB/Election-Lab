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
      String(feature.id)
        .padStart(2, "0")
    ] || ""
  );
}

function normalizeOffice(value) {
  const office =
    String(value || "")
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
    normalizeOffice(office);

  if (
    typeof getPublishedRaces ===
    "function"
  ) {
    return (
      await getPublishedRaces(
        normalizedOffice
      )
    ) || [];
  }

  const { data, error } =
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
    (lookup, race) => {
      const state =
        String(
          race.state || ""
        )
          .trim()
          .toUpperCase();

      if (
        /^[A-Z]{2}$/.test(state)
      ) {
        lookup[state] = race;
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

  const margin =
    Number(
      race.projected_margin || 0
    );

  const party =
    margin >= 0
      ? "dem"
      : "rep";

  if (
    rating.includes("toss") ||
    rating.includes("tied")
  ) {
    return "map-tossup";
  }

  if (
    rating.includes("safe")
  ) {
    return `map-${party}-safe`;
  }

  if (
    rating.includes("likely") ||
    rating.includes("likley")
  ) {
    return `map-${party}-likely`;
  }

  if (
    rating.includes("lean")
  ) {
    return `map-${party}-lean`;
  }

  if (
    rating.includes("tilt")
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
    return office === "senate"
      ? "Not up in 2026"
      : "No published forecast";
  }

  return (
    race.rating ||
    "Toss-up"
  );
}

function removeMapClasses(
  element
) {
  element.classList.remove(
    ...MAP_RATING_CLASSES
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
  ] = await Promise.all([
    getStateAtlas(),
    getMapRaces(office)
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
      (a, b) => a !== b
    );

  const width = 975;
  const height = 610;

  const projection =
    d3.geoAlbersUsa()
      .fitSize(
        [width, height],
        states
      );

  const path =
    d3.geoPath(
      projection
    );

  const raceLookup =
    raceByState(races);

  container.innerHTML = "";

  const svg =
    d3
      .select(container)
      .append("svg")
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

  const stateGroup =
    svg.append("g");

  stateGroup
    .selectAll("path")
    .data(states.features)
    .join("path")
    .attr(
      "class",
      feature => {
        const code =
          stateCodeFromFeature(
            feature
          );

        const race =
          raceLookup[code];

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
          .filter(Boolean)
          .join(" ");
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

        return raceLookup[code]
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

        return raceLookup[code]
          ? "link"
          : "img";
      }
    )
    .attr(
      "aria-label",
      feature => {
        const code =
          stateCodeFromFeature(
            feature
          );

        const race =
          raceLookup[code];

        const stateName =
          STATE_NAMES[code] ||
          code;

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
      function (
        event,
        feature
      ) {
        const code =
          stateCodeFromFeature(
            feature
          );

        showStateTooltip(
          event,
          code,
          raceLookup[code],
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
      function (
        event,
        feature
      ) {
        event.preventDefault();
        event.stopPropagation();

        const code =
          stateCodeFromFeature(
            feature
          );

        openRaceFromMap(
          raceLookup[code]
        );
      }
    )
    .on(
      "keydown",
      function (
        event,
        feature
      ) {
        if (
          event.key !== "Enter" &&
          event.key !== " "
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
          raceLookup[code]
        );
      }
    );

  svg
    .append("path")
    .datum(borders)
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
    .append("g")
    .selectAll("text")
    .data(
      features.filter(
        feature =>
          stateCodeFromFeature(
            feature
          ) !== "DC"
      )
    )
    .join("text")
    .attr(
      "class",
      feature => {
        const code =
          stateCodeFromFeature(
            feature
          );

        const ratingClass =
          mapClassForRace(
            raceLookup[code],
            office
          );

        const lightClass =
          [
            "map-dem-tilt",
            "map-rep-tilt",
            "map-no-race",
            "map-unrated"
          ].includes(
            ratingClass
          )
            ? " dark"
            : "";

        return (
          "usMapStateLabel" +
          lightClass
        );
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
    STATE_NAMES[stateCode] ||
    stateCode;

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
      (a, b) =>
        Number(
          b.win_probability ||
            0
        ) -
        Number(
          a.win_probability ||
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
   Compact U.S.-style district cartogram
   ========================================================= */

const HOUSE_HEX_SIZE = 22;
const HOUSE_HEX_X_SPACING = 18;
const HOUSE_HEX_Y_SPACING = 21;

/*
  x and y are pixel anchors for each state cluster.

  columns controls the internal width of each state.
  The districts remain grouped by state while the overall
  arrangement resembles the United States.
*/

const HOUSE_STATE_LAYOUT = {
  WA: { x: 68, y: 52, columns: 5 },
  OR: { x: 58, y: 128, columns: 3 },
  CA: { x: 48, y: 212, columns: 5 },

  ID: { x: 174, y: 102, columns: 2 },
  NV: { x: 153, y: 220, columns: 2 },
  MT: { x: 242, y: 56, columns: 2 },
  WY: { x: 256, y: 146, columns: 1 },
  UT: { x: 226, y: 224, columns: 2 },
  AZ: { x: 205, y: 324, columns: 3 },

  ND: { x: 355, y: 62, columns: 1 },
  SD: { x: 360, y: 130, columns: 1 },
  NE: { x: 354, y: 201, columns: 2 },
  CO: { x: 303, y: 261, columns: 3 },
  NM: { x: 300, y: 355, columns: 2 },
  KS: { x: 384, y: 271, columns: 2 },
  OK: { x: 388, y: 354, columns: 3 },
  TX: { x: 337, y: 438, columns: 8 },

  MN: { x: 454, y: 66, columns: 3 },
  IA: { x: 455, y: 187, columns: 2 },
  MO: { x: 461, y: 274, columns: 3 },
  AR: { x: 475, y: 368, columns: 2 },
  LA: { x: 478, y: 462, columns: 3 },

  WI: { x: 546, y: 102, columns: 3 },
  IL: { x: 548, y: 212, columns: 4 },
  MS: { x: 555, y: 401, columns: 2 },

  MI: { x: 647, y: 92, columns: 4 },
  IN: { x: 638, y: 236, columns: 3 },
  KY: { x: 637, y: 320, columns: 3 },
  TN: { x: 647, y: 389, columns: 5 },
  AL: { x: 652, y: 468, columns: 3 },

  OH: { x: 739, y: 207, columns: 4 },
  WV: { x: 767, y: 302, columns: 2 },
  GA: { x: 746, y: 454, columns: 4 },
  FL: { x: 755, y: 553, columns: 8 },

  PA: { x: 833, y: 177, columns: 5 },
  VA: { x: 842, y: 315, columns: 5 },
  NC: { x: 851, y: 389, columns: 6 },
  SC: { x: 827, y: 477, columns: 3 },

  NY: { x: 942, y: 88, columns: 6 },
  VT: { x: 1031, y: 46, columns: 1 },
  NH: { x: 1070, y: 50, columns: 1 },
  ME: { x: 1112, y: 40, columns: 2 },

  MA: { x: 1049, y: 119, columns: 4 },
  RI: { x: 1123, y: 168, columns: 1 },
  CT: { x: 1052, y: 184, columns: 3 },

  NJ: { x: 974, y: 235, columns: 3 },
  DE: { x: 986, y: 310, columns: 1 },
  MD: { x: 910, y: 291, columns: 4 },

  AK: { x: 72, y: 548, columns: 1 },
  HI: { x: 178, y: 578, columns: 2 }
};

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

  try {
    const races =
      await getMapRaces(
        "house"
      );

    renderHouseHexMap(
      map,
      races
    );
  } catch (error) {
    console.error(
      "House map failed:",
      error
    );

    map.innerHTML = `
      <div class="empty">
        ${escapeMapHtml(
          error?.message ||
          "Unable to load the House map."
        )}
      </div>
    `;
  }
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
    groupHouseRacesByState(
      races
    );

  const stateMarkup =
    Object.entries(
      HOUSE_STATE_LAYOUT
    )
      .map(
        ([state, layout]) => {
          const stateRaces =
            [
              ...(
                groupedRaces[
                  state
                ] || []
              )
            ].sort(
              (a, b) =>
                getHouseDistrictNumber(
                  a
                ) -
                getHouseDistrictNumber(
                  b
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

  map.innerHTML = `
    <div
      class="houseMapViewport"
      aria-label="United States House forecast map"
    >
      <div class="houseMapCanvas">
        ${stateMarkup}
      </div>
    </div>
  `;

  bindHouseMapButtons(
    map
  );
}

function groupHouseRacesByState(
  races
) {
  return races.reduce(
    (groups, race) => {
      const state =
        String(
          race.state || ""
        )
          .trim()
          .toUpperCase();

      if (
        !HOUSE_STATE_LAYOUT[
          state
        ]
      ) {
        return groups;
      }

      if (!groups[state]) {
        groups[state] = [];
      }

      groups[state].push(
        race
      );

      return groups;
    },
    {}
  );
}

function createHouseStateMarkup(
  state,
  layout,
  races
) {
  const seats =
    races.length;

  const positions =
    buildCompactStatePositions(
      seats,
      layout.columns
    );

  const hexMarkup =
    races
      .map(
        (race, index) =>
          createHouseHexMarkup(
            race,
            positions[index]
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
        STATE_NAMES[state] ||
        state
      )}"
    >
      <div class="houseStateHeading">
        ${escapeMapHtml(
          state
        )}
        <span>
          (${seats})
        </span>
      </div>

      <div class="houseStateDistricts">
        ${hexMarkup}
      </div>
    </section>
  `;
}

function buildCompactStatePositions(
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

    const horizontalOffset =
      row % 2 === 1
        ? HOUSE_HEX_X_SPACING / 2
        : 0;

    positions.push({
      left:
        column *
          HOUSE_HEX_X_SPACING +
        horizontalOffset,

      top:
        row *
        HOUSE_HEX_Y_SPACING
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

  const rating =
    race.rating ||
    "Toss-up";

  const mapClass =
    mapClassForRace(
      race,
      "house"
    );

  const description =
    buildHouseRaceDescription(
      race
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
    .forEach(button => {
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
    });
}

function houseDistrictLabel(
  race
) {
  const title =
    String(
      race.title || ""
    ).trim();

  const state =
    String(
      race.state || ""
    )
      .trim()
      .toUpperCase();

  const slug =
    String(
      race.slug || ""
    )
      .trim()
      .toUpperCase();

  const titleMatch =
    title.match(
      /\b([A-Z]{2})[-\s](\d{1,2}|AL)\b/i
    );

  if (titleMatch) {
    return (
      titleMatch[1]
        .toUpperCase() +
      "-" +
      titleMatch[2]
        .toUpperCase()
    );
  }

  const slugMatch =
    slug.match(
      /\b([A-Z]{2})[-_](\d{1,2}|AL)\b/i
    );

  if (slugMatch) {
    return (
      slugMatch[1]
        .toUpperCase() +
      "-" +
      slugMatch[2]
        .toUpperCase()
    );
  }

  const districtMatch =
    title.match(
      /\b(?:district\s*)?(\d{1,2})(?:st|nd|rd|th)?\b/i
    );

  if (
    districtMatch &&
    state
  ) {
    return (
      state +
      "-" +
      districtMatch[1]
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

  const districtMatch =
    label.match(
      /-(\d+)$/
    );

  return districtMatch
    ? Number(
        districtMatch[1]
      )
    : 0;
}

function buildHouseRaceDescription(
  race
) {
  const candidates =
    [
      ...(
        race.candidates ||
        []
      )
    ].sort(
      (a, b) =>
        Number(
          b.win_probability ||
            0
        ) -
        Number(
          a.win_probability ||
            0
        )
    );

  const leader =
    candidates[0];

  const parts = [
    race.title ||
      houseDistrictLabel(
        race
      ),

    race.rating ||
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
      overflow: hidden;
      box-sizing: border-box;
      padding: 14px;
    }

    .houseMapViewport {
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 8px;
    }

    .houseMapCanvas {
      position: relative;
      width: 1200px;
      height: 680px;
      min-width: 1200px;
      margin: 0 auto;
    }

    .houseStateCluster {
      position: absolute;
    }

    .houseStateHeading {
      position: absolute;
      left: 0;
      top: -17px;
      font-size: 10px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: #526173;
      white-space: nowrap;
      pointer-events: none;
    }

    .houseStateHeading span {
      font-weight: 700;
      opacity: 0.75;
    }

    .houseStateDistricts {
      position: relative;
    }

    .houseHex {
      position: absolute;
      width: ${HOUSE_HEX_SIZE}px;
      height: ${HOUSE_HEX_SIZE + 4}px;
      margin: 0;
      padding: 0;
      border: 1px solid rgba(
        255,
        255,
        255,
        0.88
      );
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      clip-path: polygon(
        25% 3%,
        75% 3%,
        100% 50%,
        75% 97%,
        25% 97%,
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
      z-index: 50;
      outline: none;
    }

    .houseHexLabel {
      font-size: 5.5px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.25px;
      color: #ffffff;
      text-shadow:
        0 1px 2px rgba(
          0,
          0,
          0,
          0.62
        );
      pointer-events: none;
      white-space: nowrap;
    }

    .houseHex.map-tossup .houseHexLabel,
    .houseHex.map-no-race .houseHexLabel,
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

      .houseMapCanvas {
        margin-left: 0;
        margin-right: 0;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}
/* =========================================================
   HOUSE MAP RESPONSIVE FIT
   ========================================================= */

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

  const naturalWidth = 1200;
  const naturalHeight = 680;

  const availableWidth =
    Math.max(
      300,
      map.clientWidth - 28
    );

  const scale =
    Math.min(
      1,
      availableWidth /
        naturalWidth
    );

  canvas.style.transformOrigin =
    "top left";

  canvas.style.transform =
    `scale(${scale})`;

  canvas.style.margin =
    "0 auto";

  viewport.style.height =
    `${Math.ceil(
      naturalHeight *
      scale
    )}px`;

  viewport.style.overflowX =
    scale < 1
      ? "hidden"
      : "auto";
}

function watchHouseMapRendering() {
  const map =
    document.getElementById(
      "houseHexMap"
    );

  if (!map) {
    return;
  }

  const observer =
    new MutationObserver(
      () => {
        const canvas =
          map.querySelector(
            ".houseMapCanvas"
          );

        if (!canvas) {
          return;
        }

        fitHouseMapToContainer();

        observer.disconnect();
      }
    );

  observer.observe(
    map,
    {
      childList: true,
      subtree: true
    }
  );

  if (
    map.querySelector(
      ".houseMapCanvas"
    )
  ) {
    fitHouseMapToContainer();
    observer.disconnect();
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    watchHouseMapRendering();
  }
);

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
  let container = null;

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
