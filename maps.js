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

  const sortedRaces =
    [...races].sort(
      (a, b) => {
        const first =
          houseRaceSortValue(
            a
          );

        const second =
          houseRaceSortValue(
            b
          );

        const stateComparison =
          first.state.localeCompare(
            second.state
          );

        if (
          stateComparison !== 0
        ) {
          return stateComparison;
        }

        return (
          first.district -
          second.district
        );
      }
    );

  const positions =
    buildHouseHexPositions(
      sortedRaces.length
    );

  map.innerHTML =
    sortedRaces
      .map(
        (race, index) => {
          const position =
            positions[index];

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
                grid-column:${position.column};
                grid-row:${position.row};
              "
              title="${escapeMapHtml(
                description
              )}"
              aria-label="${escapeMapHtml(
                description
              )}"
            >
              <span
                class="houseHexLabel"
              >
                ${escapeMapHtml(
                  district
                )}
              </span>

              <span
                class="houseHexRating"
              >
                ${escapeMapHtml(
                  rating
                )}
              </span>
            </button>
          `;
        }
      )
      .join("");

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

function buildHouseHexPositions(
  count
) {
  const outlineRows = [
    {
      row: 2,
      start: 8,
      length: 12
    },

    {
      row: 3,
      start: 6,
      length: 18
    },

    {
      row: 4,
      start: 5,
      length: 21
    },

    {
      row: 5,
      start: 4,
      length: 23
    },

    {
      row: 6,
      start: 4,
      length: 24
    },

    {
      row: 7,
      start: 3,
      length: 25
    },

    {
      row: 8,
      start: 3,
      length: 25
    },

    {
      row: 9,
      start: 4,
      length: 24
    },

    {
      row: 10,
      start: 5,
      length: 22
    },

    {
      row: 11,
      start: 7,
      length: 18
    },

    {
      row: 12,
      start: 10,
      length: 13
    },

    {
      row: 13,
      start: 14,
      length: 8
    }
  ];

  const positions = [];

  outlineRows.forEach(
    rowInfo => {
      for (
        let index = 0;
        index < rowInfo.length;
        index += 1
      ) {
        positions.push({
          row:
            rowInfo.row,

          column:
            rowInfo.start +
            index
        });
      }
    }
  );

  let nextRow = 14;
  let nextColumn = 8;

  while (
    positions.length < count
  ) {
    positions.push({
      row:
        nextRow,

      column:
        nextColumn
    });

    nextColumn += 1;

    if (
      nextColumn > 24
    ) {
      nextColumn = 8;
      nextRow += 1;
    }
  }

  return positions.slice(
    0,
    count
  );
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

  const stateDistrictMatch =
    title.match(
      /\b([A-Z]{2})[-\s](\d{1,2}|AL)\b/i
    );

  if (
    stateDistrictMatch
  ) {
    return (
      stateDistrictMatch[1]
        .toUpperCase() +
      "-" +
      stateDistrictMatch[2]
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

  return state || "House";
}

function houseRaceSortValue(
  race
) {
  const label =
    houseDistrictLabel(
      race
    );

  const state =
    String(
      race.state || ""
    )
      .trim()
      .toUpperCase();

  const districtMatch =
    label.match(
      /-(\d+)$/
    );

  return {
    state,

    district:
      districtMatch
        ? Number(
            districtMatch[1]
          )
        : 0
  };
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

/* =========================================================
   ERROR HANDLING
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
