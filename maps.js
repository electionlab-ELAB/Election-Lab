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
   ========================================================= */

const HOUSE_STATE_LAYOUT = {
  WA: { x: 2, y: 1, width: 3 },
  OR: { x: 2, y: 3, width: 3 },
  CA: { x: 1, y: 5, width: 4 },
  NV: { x: 5, y: 5, width: 2 },
  ID: { x: 6, y: 2, width: 2 },
  MT: { x: 8, y: 1, width: 2 },
  WY: { x: 8, y: 4, width: 1 },
  UT: { x: 7, y: 6, width: 2 },
  AZ: { x: 6, y: 9, width: 3 },
  NM: { x: 9, y: 9, width: 2 },
  CO: { x: 10, y: 6, width: 3 },
  ND: { x: 13, y: 1, width: 1 },
  SD: { x: 13, y: 3, width: 1 },
  NE: { x: 13, y: 5, width: 2 },
  KS: { x: 13, y: 7, width: 2 },
  OK: { x: 14, y: 9, width: 3 },
  TX: { x: 12, y: 11, width: 5 },
  MN: { x: 16, y: 1, width: 3 },
  IA: { x: 16, y: 5, width: 2 },
  MO: { x: 16, y: 7, width: 3 },
  AR: { x: 17, y: 10, width: 2 },
  LA: { x: 17, y: 13, width: 2 },
  WI: { x: 20, y: 2, width: 3 },
  IL: { x: 20, y: 6, width: 3 },
  MI: { x: 23, y: 2, width: 3 },
  IN: { x: 23, y: 7, width: 2 },
  OH: { x: 26, y: 6, width: 3 },
  KY: { x: 22, y: 10, width: 3 },
  TN: { x: 21, y: 12, width: 4 },
  MS: { x: 20, y: 14, width: 2 },
  AL: { x: 23, y: 14, width: 2 },
  GA: { x: 26, y: 14, width: 3 },
  FL: { x: 27, y: 17, width: 5 },
  WV: { x: 29, y: 9, width: 2 },
  VA: { x: 30, y: 10, width: 4 },
  NC: { x: 30, y: 13, width: 4 },
  SC: { x: 28, y: 15, width: 3 },
  PA: { x: 30, y: 6, width: 4 },
  NY: { x: 34, y: 3, width: 4 },
  VT: { x: 37, y: 1, width: 1 },
  NH: { x: 39, y: 1, width: 1 },
  ME: { x: 41, y: 1, width: 2 },
  MA: { x: 39, y: 4, width: 3 },
  RI: { x: 42, y: 5, width: 1 },
  CT: { x: 39, y: 6, width: 2 },
  NJ: { x: 36, y: 7, width: 2 },
  DE: { x: 37, y: 9, width: 1 },
  MD: { x: 34, y: 9, width: 3 },
  AK: { x: 2, y: 18, width: 2 },
  HI: { x: 7, y: 19, width: 2 }
};

async function initializeHouseMap() {
  const map =
    document.getElementById(
      "houseHexMap"
    );

  if (!map) {
    return;
  }

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

  const racesByState =
    groupHouseRacesByState(
      races
    );

  const positionedRaces = [];

  Object.entries(
    racesByState
  ).forEach(
    ([state, stateRaces]) => {
      const layout =
        HOUSE_STATE_LAYOUT[
          state
        ];

      if (!layout) {
        return;
      }

      const sortedStateRaces =
        [...stateRaces].sort(
          (a, b) =>
            getHouseDistrictNumber(
              a
            ) -
            getHouseDistrictNumber(
              b
            )
        );

      const positions =
        buildStateDistrictPositions(
          sortedStateRaces.length,
          layout
        );

      sortedStateRaces.forEach(
        (race, index) => {
          positionedRaces.push({
            race,
            state,
            position:
              positions[index]
          });
        }
      );
    }
  );

  map.innerHTML = `
    <div class="houseMapCanvas">
      ${positionedRaces
        .map(
          item =>
            createHouseHexMarkup(
              item.race,
              item.position
            )
        )
        .join("")}
    </div>
  `;

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

function buildStateDistrictPositions(
  count,
  layout
) {
  const positions = [];

  const width =
    Math.max(
      1,
      Number(
        layout.width || 1
      )
    );

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const localRow =
      Math.floor(
        index / width
      );

    const localColumn =
      index % width;

    const rowOffset =
      localColumn % 2 === 1
        ? 0.5
        : 0;

    positions.push({
      x:
        layout.x +
        localColumn,

      y:
        layout.y +
        localRow +
        rowOffset
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

  const left =
    position.x * 30;

  const top =
    position.y * 34;

  return `
    <button
      class="houseHex ${mapClass}"
      type="button"
      data-race-slug="${escapeMapHtml(
        race.slug || ""
      )}"
      style="
        left:${left}px;
        top:${top}px;
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

      <span class="houseHexRating">
        ${escapeMapHtml(
          rating
        )}
      </span>
    </button>
  `;
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

function addHouseMapStateLabels(
  map
) {
  Object.entries(
    HOUSE_STATE_LAYOUT
  ).forEach(
    ([state, layout]) => {
      const label =
        document.createElement(
          "div"
        );

      label.className =
        "houseStateLabel";

      label.textContent =
        state;

      label.style.left =
        `${layout.x * 30}px`;

      label.style.top =
        `${
          layout.y * 34 -
          16
        }px`;

      map.appendChild(
        label
      );
    }
  );
}
/* =========================================================
   HOUSE MAP FINAL SETUP
   ========================================================= */

/*
  This replaces the earlier initializeHouseMap function.
  JavaScript uses this final version because it appears later
  in the file.
*/

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

    const canvas =
      map.querySelector(
        ".houseMapCanvas"
      );

    if (canvas) {
      addHouseMapStateLabels(
        canvas
      );
    }
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
      overflow-x: auto;
      overflow-y: hidden;
      padding: 18px 8px 28px;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }

    .houseMapCanvas {
      position: relative;
      width: 1320px;
      height: 740px;
      margin: 0 auto;
      min-width: 1320px;
    }

    .houseHex {
      position: absolute;
      width: 34px;
      height: 38px;
      margin: 0;
      padding: 0;
      border: 1px solid rgba(
        255,
        255,
        255,
        0.78
      );
      border-radius: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
      box-sizing: border-box;
      font-family: inherit;
      transition:
        transform 120ms ease,
        filter 120ms ease,
        z-index 120ms ease;
      clip-path: polygon(
        25% 4%,
        75% 4%,
        100% 50%,
        75% 96%,
        25% 96%,
        0 50%
      );
      z-index: 2;
    }

    .houseHex:hover,
    .houseHex:focus-visible {
      transform: scale(1.38);
      filter: brightness(1.08);
      z-index: 100;
      outline: none;
    }

    .houseHexLabel {
      display: block;
      font-size: 6.5px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.2px;
      color: #ffffff;
      text-shadow:
        0 1px 2px rgba(
          0,
          0,
          0,
          0.7
        );
      pointer-events: none;
      white-space: nowrap;
    }

    .houseHexRating {
      display: none;
    }

    .houseStateLabel {
      position: absolute;
      z-index: 1;
      font-size: 9px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0.7px;
      color: rgba(
        30,
        41,
        59,
        0.7
      );
      pointer-events: none;
      user-select: none;
      transform: translateX(
        2px
      );
    }

    .houseHex.map-tossup .houseHexLabel,
    .houseHex.map-no-race .houseHexLabel,
    .houseHex.map-unrated .houseHexLabel,
    .houseHex.map-dem-tilt .houseHexLabel,
    .houseHex.map-rep-tilt .houseHexLabel {
      color: #172033;
      text-shadow: none;
    }

    .houseHex.map-not-up {
      background: #cbd5e1;
    }

    .houseHex.map-no-race,
    .houseHex.map-unrated {
      background: #d8dee8;
    }

    @media (
      max-width: 900px
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

    @media (
      max-width: 600px
    ) {
      .houseHex {
        width: 33px;
        height: 37px;
      }

      .houseHexLabel {
        font-size: 6px;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}

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
