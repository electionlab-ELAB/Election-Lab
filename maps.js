/*

  ElectionLab Maps

  ----------------

  - Senate state map

  - Governor state map

  - Responsive SVG House district cartogram

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

  initializeElectionMap

);

 

async function initializeElectionMap() {

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

 

async function loadStateLibraries() {

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

 

  return normalized === "governors"

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

    typeof getPublishedRaces ===

    "function"

  ) {

    const races =

      await withTimeout(

        getPublishedRaces(

          normalizedOffice

        ),

        12000,

        `Published ${normalizedOffice} races took too long to load.`

      );

 

    return Array.isArray(races)

      ? races

      : [];

  }

 

  if (

    typeof sb === "undefined" ||

    !sb

  ) {

    throw new Error(

      "Supabase has not been initialized."

    );

  }

 

  const result =

    await withTimeout(

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

        ),

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

 

  const codeMatch =

    combined.match(

      /\b([A-Z]{2})[-_\s](?:AL|\d{1,2})\b/

    );

 

  if (

    codeMatch &&

    STATE_NAMES[

      codeMatch[1]

    ]

  ) {

    return codeMatch[1];

  }

 

  for (

    const [

      code,

      name

    ] of Object.entries(

      STATE_NAMES

    )

  ) {

    if (

      combined.includes(

        name.toUpperCase()

      )

    ) {

      return code;

    }

  }

 

  return "";

}

 

/* =========================================================

   MODEL 2.1 EFFECTIVE MAP FORECAST HELPERS

 

   The public map must never infer a real forecast from the old

   default 50/50 candidate values. It uses, in order:

 

   1. effective public forecast fields

   2. latest model fields

   3. published projected margin/rating fallback

 

   Manual-override metadata remains private.

   ========================================================= */

 

function mapFiniteNumber(

  value,

  fallback = null

) {

  const number =

    Number(value);

 

  return Number.isFinite(number)

    ? number

    : fallback;

}

 

function effectiveMapMargin(

  race

) {

  if (!race) {

    return null;

  }

 

  return mapFiniteNumber(

    race.effective_projected_margin,

    mapFiniteNumber(

      race.model_projected_margin,

      mapFiniteNumber(

        race.projected_margin,

        null

      )

    )

  );

}

 

function effectiveMapRating(

  race

) {

  if (!race) {

    return null;

  }

 

  return (

    race.effective_rating ||

    race.model_rating ||

    race.rating ||

    null

  );

}

 

function effectiveMapProbabilities(

  race

) {

  if (!race) {

    return {

      dem: null,

      rep: null

    };

  }

 

  let dem =

    mapFiniteNumber(

      race.effective_dem_probability,

      mapFiniteNumber(

        race.model_dem_probability,

        mapFiniteNumber(

          race.dem_win_probability,

          null

        )

      )

    );

 

  let rep =

    mapFiniteNumber(

      race.effective_rep_probability,

      mapFiniteNumber(

        race.model_rep_probability,

        mapFiniteNumber(

          race.rep_win_probability,

          null

        )

      )

    );

 

  if (

    dem !== null &&

    rep === null

  ) {

    rep = 100 - dem;

  }

 

  if (

    rep !== null &&

    dem === null

  ) {

    dem = 100 - rep;

  }

 

  return {

    dem,

    rep

  };

}

 

function mapHasModelForecast(

  race

) {

  if (!race) {

    return false;

  }

 

  const probabilities =

    effectiveMapProbabilities(

      race

    );

 

  const margin =

    effectiveMapMargin(

      race

    );

 

  /*

    A genuine model forecast has an explicit model/effective field,

    model timestamp/version, or non-default output. This prevents an

    inherited candidate default of 50% from coloring a state.

  */

  const explicitModelSignal =

    race.effective_projected_margin !== undefined ||

    race.model_projected_margin !== undefined ||

    race.effective_dem_probability !== undefined ||

    race.model_dem_probability !== undefined ||

    Boolean(

      race.model_updated_at ||

      race.model_version ||

      race.public_updated_at

    );

 

  if (explicitModelSignal) {

    return (

      margin !== null ||

      probabilities.dem !== null ||

      probabilities.rep !== null

    );

  }

 

  const rating =

    String(

      effectiveMapRating(

        race

      ) ||

      ""

    )

      .trim()

      .toLowerCase();

 

  if (

    rating &&

    !rating.includes("unrated")

  ) {

    return true;

  }

 

  return (

    margin !== null &&

    Math.abs(margin) > 0.05

  );

}

 

function probabilityMapClass(

  demProbability

) {

  const dem =

    mapFiniteNumber(

      demProbability,

      50

    );

 

  const leader =

    dem >= 50

      ? "dem"

      : "rep";

 

  const winningProbability =

    Math.max(

      dem,

      100 - dem

    );

 

  if (

    winningProbability < 60

  ) {

    return "map-tossup";

  }

 

  if (

    winningProbability < 80

  ) {

    return `map-${leader}-lean`;

  }

 

  if (

    winningProbability < 95

  ) {

    return `map-${leader}-likely`;

  }

 

  return `map-${leader}-safe`;

}

 

function effectiveMapLeader(

  race

) {

  const probabilities =

    effectiveMapProbabilities(

      race

    );

 

  const candidates =

    [

      ...(

        race?.candidates ||

        []

      )

    ];

 

  const demCandidate =

    candidates.find(

      candidate =>

        String(

          candidate.party ||

          ""

        )

          .trim()

          .toUpperCase() ===

        "D"

    );

 

  const repCandidate =

    candidates.find(

      candidate =>

        String(

          candidate.party ||

          ""

        )

          .trim()

          .toUpperCase() ===

        "R"

    );

 

  if (

    probabilities.dem !== null &&

    probabilities.rep !== null

  ) {

    if (

      probabilities.dem >=

      probabilities.rep

    ) {

      return {

        candidate:

          demCandidate ||

          null,

        party: "D",

        probability:

          probabilities.dem

      };

    }

 

    return {

      candidate:

        repCandidate ||

        null,

      party: "R",

      probability:

        probabilities.rep

    };

  }

 

  /*

    Candidate odds are only a fallback when they are not the generic

    untouched 50/50 defaults.

  */

  const sorted =

    candidates

      .map(

        candidate => ({

          candidate,

          probability:

            mapFiniteNumber(

              candidate.win_probability,

              null

            )

        })

      )

      .filter(

        item =>

          item.probability !==

          null

      )

      .sort(

        (

          first,

          second

        ) =>

          second.probability -

          first.probability

      );

 

  if (

    sorted.length &&

    (

      sorted.length === 1 ||

      Math.abs(

        sorted[0].probability -

        sorted[1].probability

      ) > 0.05

    )

  ) {

    return {

      candidate:

        sorted[0].candidate,

      party:

        String(

          sorted[0].candidate

            .party ||

          "I"

        )

          .trim()

          .toUpperCase(),

      probability:

        sorted[0].probability

    };

  }

 

  return null;

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

 

  if (

    !mapHasModelForecast(

      race

    )

  ) {

    return "map-unrated";

  }

 

  const probabilities =

    effectiveMapProbabilities(

      race

    );

 

  if (

    probabilities.dem !== null

  ) {

    return probabilityMapClass(

      probabilities.dem

    );

  }

 

  const rating =

    String(

      effectiveMapRating(

        race

      ) ||

      ""

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

    effectiveMapMargin(

      race

    );

 

  if (margin === null) {

    return "map-unrated";

  }

 

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

 

  /*

    Model 2.1 uses no public Tilt category. Older Tilt records are

    treated as toss-ups until recalculated into the current scale.

  */

  if (rating.includes("tilt")) {

    return "map-tossup";

  }

 

  const absoluteMargin =

    Math.abs(

      margin

    );

 

  if (absoluteMargin < 2) {

    return "map-tossup";

  }

 

  if (absoluteMargin < 6) {

    return `map-${party}-lean`;

  }

 

  if (absoluteMargin < 12) {

    return `map-${party}-likely`;

  }

 

  return `map-${party}-safe`;

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

 

function racesByState(

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

 

  await loadStateLibraries();

 

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

      "The state-map libraries did not load."

    );

  }

 

  if (

    !atlas?.objects?.states

  ) {

    throw new Error(

      "The U.S. map data is invalid."

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

 

  const lookup =

    racesByState(

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

        "preserveAspectRatio",

        "xMidYMid meet"

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

        const state =

          featureStateCode(

            feature

          );

 

        const race =

          lookup[state];

 

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

      "tabindex",

      feature => {

        const state =

          featureStateCode(

            feature

          );

 

        return lookup[state]

          ? 0

          : -1;

      }

    )

    .attr(

      "role",

      feature => {

        const state =

          featureStateCode(

            feature

          );

 

        return lookup[state]

          ? "link"

          : "img";

      }

    )

    .attr(

      "aria-label",

      feature => {

        const state =

          featureStateCode(

            feature

          );

 

        const race =

          lookup[state];

 

        const stateName =

          STATE_NAMES[state] ||

          state;

 

        if (!race) {

          return office ===

            "senate"

            ? `${stateName}: not up in 2026`

            : `${stateName}: no published forecast`;

        }

 

        const rating =

          mapHasModelForecast(

            race

          )

            ? (

                effectiveMapRating(

                  race

                ) ||

                "Toss-up"

              )

            : "Awaiting model forecast";

 

        return `${stateName}: ${

          race.title ||

          "Published race"

        }, ${rating}`;

      }

    )

    .on(

      "mouseenter",

      (

        event,

        feature

      ) => {

        const state =

          featureStateCode(

            feature

          );

 

        showMapTooltip(

          event,

          lookup[state],

          STATE_NAMES[state] ||

            state,

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

 

        const state =

          featureStateCode(

            feature

          );

 

        openRacePage(

          lookup[state]

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

          event.key !== "Enter" &&

          event.key !== " "

        ) {

          return;

        }

 

        event.preventDefault();

 

        const state =

          featureStateCode(

            feature

          );

 

        openRacePage(

          lookup[state]

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

      "rgba(255,255,255,.88)"

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

        const state =

          featureStateCode(

            feature

          );

 

        const mapClass =

          mapClassForRace(

            lookup[state],

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

        const state =

          featureStateCode(

            feature

          );

 

        const centroid =

          path.centroid(

            feature

          );

 

        return (

          centroid[0] +

          (

            offsets[state]?.[0] ||

            0

          )

        );

      }

    )

    .attr(

      "y",

      feature => {

        const state =

          featureStateCode(

            feature

          );

 

        const centroid =

          path.centroid(

            feature

          );

 

        return (

          centroid[1] +

          (

            offsets[state]?.[1] ||

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

 

  const hasForecast =

    mapHasModelForecast(

      race

    );

 

  const status =

    race

      ? (

          hasForecast

            ? (

                effectiveMapRating(

                  race

                ) ||

                "Toss-up"

              )

            : "Awaiting model forecast"

        )

      : (

          office === "senate"

            ? "Not up in 2026"

            : "No published forecast"

        );

 

  const leader =

    hasForecast

      ? effectiveMapLeader(

          race

        )

      : null;

 

  const margin =

    hasForecast

      ? effectiveMapMargin(

          race

        )

      : null;

 

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

              leader.candidate

                ?.name ||

              (

                leader.party === "D"

                  ? "Democratic candidate"

                  : leader.party === "R"

                  ? "Republican candidate"

                  : "Leading candidate"

              )

            )}: ${Number(

              leader.probability

            ).toFixed(0)}%

          </span>

        `

        : ""

    }

 

    ${

      margin !== null

        ? `

          <span>

            Projected margin:

            ${escapeMapHtml(

              typeof formatMargin ===

              "function"

                ? formatMargin(

                    margin

                  )

                : (

                    Math.abs(

                      margin

                    ) < 0.05

                      ? "Tied"

                      : `${

                          margin > 0

                            ? "D"

                            : "R"

                        } +${Math.abs(

                          margin

                        ).toFixed(1)}`

                  )

            )}

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

 

  const gap =

    14;

 

  const tooltipWidth =

    tooltip.offsetWidth ||

    190;

 

  const tooltipHeight =

    tooltip.offsetHeight ||

    70;

 

  let left =

    event.clientX +

    gap;

 

  let top =

    event.clientY +

    gap;

 

  if (

    left +

      tooltipWidth >

    window.innerWidth -

      12

  ) {

    left =

      event.clientX -

      tooltipWidth -

      gap;

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

 

  if (tooltip) {

    tooltip.classList.remove(

      "visible"

    );

  }

}

/* =========================================================

   HOUSE SVG CARTOGRAM

   ========================================================= */

 

const HOUSE_SVG_WIDTH =

  1180;

 

const HOUSE_SVG_HEIGHT =

  650;

 

const HOUSE_HEX_RADIUS =

  10;

 

const HOUSE_HEX_HORIZONTAL =

  18;

 

const HOUSE_HEX_VERTICAL =

  17;

 

/*

  Approximate state anchors across the country.

 

  Each state's districts are drawn as a compact SVG cluster,

  so the map stays responsive and inside the card.

*/

 

const HOUSE_STATE_LAYOUT = {

  WA: { x: 58, y: 62, columns: 5 },

  OR: { x: 52, y: 128, columns: 3 },

  CA: { x: 44, y: 215, columns: 7 },

 

  ID: { x: 178, y: 108, columns: 2 },

  NV: { x: 150, y: 230, columns: 2 },

  MT: { x: 255, y: 60, columns: 2 },

  WY: { x: 262, y: 150, columns: 1 },

  UT: { x: 228, y: 235, columns: 2 },

  AZ: { x: 208, y: 330, columns: 3 },

 

  ND: { x: 360, y: 65, columns: 1 },

  SD: { x: 365, y: 130, columns: 1 },

  NE: { x: 360, y: 205, columns: 2 },

  CO: { x: 310, y: 270, columns: 3 },

  NM: { x: 305, y: 360, columns: 2 },

  KS: { x: 395, y: 275, columns: 2 },

  OK: { x: 395, y: 360, columns: 3 },

  TX: { x: 350, y: 455, columns: 8 },

 

  MN: { x: 470, y: 70, columns: 3 },

  IA: { x: 470, y: 185, columns: 2 },

  MO: { x: 475, y: 275, columns: 3 },

  AR: { x: 490, y: 365, columns: 2 },

  LA: { x: 495, y: 460, columns: 3 },

 

  WI: { x: 565, y: 105, columns: 3 },

  IL: { x: 565, y: 220, columns: 4 },

  MS: { x: 575, y: 410, columns: 2 },

 

  MI: { x: 665, y: 95, columns: 4 },

  IN: { x: 660, y: 240, columns: 3 },

  KY: { x: 655, y: 325, columns: 3 },

  TN: { x: 665, y: 395, columns: 5 },

  AL: { x: 670, y: 470, columns: 3 },

 

  OH: { x: 760, y: 210, columns: 4 },

  WV: { x: 790, y: 300, columns: 2 },

  GA: { x: 770, y: 455, columns: 4 },

  FL: { x: 780, y: 555, columns: 8 },

 

  PA: { x: 855, y: 180, columns: 5 },

  VA: { x: 865, y: 315, columns: 5 },

  NC: { x: 875, y: 390, columns: 6 },

  SC: { x: 850, y: 475, columns: 3 },

 

  NY: { x: 965, y: 90, columns: 6 },

  VT: { x: 1050, y: 48, columns: 1 },

  NH: { x: 1085, y: 50, columns: 1 },

  ME: { x: 1120, y: 42, columns: 2 },

 

  MA: { x: 1065, y: 120, columns: 4 },

  RI: { x: 1135, y: 168, columns: 1 },

  CT: { x: 1060, y: 185, columns: 3 },

 

  NJ: { x: 995, y: 235, columns: 3 },

  DE: { x: 1005, y: 305, columns: 1 },

  MD: { x: 930, y: 295, columns: 4 },

 

  AK: { x: 75, y: 555, columns: 1 },

  HI: { x: 170, y: 585, columns: 2 }

};

 

async function initializeHouseMap() {

  const container =

    document.getElementById(

      "houseHexMap"

    );

 

  if (!container) {

    return;

  }

 

  ensureHouseSvgStyles();

 

  container.innerHTML = `

    <div class="loading">

      Loading House map...

    </div>

  `;

 

  const races =

    await fetchMapRaces(

      "house"

    );

 

  renderHouseSvgMap(

    container,

    races

  );

}

 

function renderHouseSvgMap(

  container,

  races

) {

  if (

    !Array.isArray(races) ||

    !races.length

  ) {

    container.innerHTML = `

      <div class="houseMapMessage">

        No published House races were found.

      </div>

    `;

 

    return;

  }

 

  const grouped =

    groupHouseRacesByState(

      races

    );

 

  const svgParts = [];

 

  Object.entries(

    HOUSE_STATE_LAYOUT

  ).forEach(

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

        return;

      }

 

      svgParts.push(

        buildHouseStateSvg(

          state,

          layout,

          stateRaces

        )

      );

    }

  );

 

  if (

    !svgParts.length

  ) {

    container.innerHTML = `

      <div class="houseMapMessage">

        House races loaded, but their states could not be recognized.

      </div>

    `;

 

    return;

  }

 

  container.innerHTML = `

    <svg

      class="houseSvgMap"

      viewBox="0 0 ${HOUSE_SVG_WIDTH} ${HOUSE_SVG_HEIGHT}"

      preserveAspectRatio="xMidYMid meet"

      role="img"

      aria-label="United States House forecast map"

    >

      ${svgParts.join("")}

    </svg>

  `;

 

  container

    .querySelectorAll(

      "[data-house-slug]"

    )

    .forEach(

      element => {

        element.addEventListener(

          "click",

          () => {

            const slug =

              element.dataset

                .houseSlug;

 

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

 

        element.addEventListener(

          "keydown",

          event => {

            if (

              event.key !== "Enter" &&

              event.key !== " "

            ) {

              return;

            }

 

            event.preventDefault();

 

            const slug =

              element.dataset

                .houseSlug;

 

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

}

 

function groupHouseRacesByState(

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

        !HOUSE_STATE_LAYOUT[

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

 

function buildHouseStateSvg(

  state,

  layout,

  races

) {

  const elements = [];

 

  elements.push(`

    <text

      class="houseSvgStateLabel"

      x="${layout.x}"

      y="${layout.y - 14}"

    >

      ${escapeMapHtml(

        state

      )}

    </text>

  `);

 

  races.forEach(

    (

      race,

      index

    ) => {

      const position =

        getHouseSvgPosition(

          index,

          layout.columns

        );

 

      const centerX =

        layout.x +

        position.x;

 

      const centerY =

        layout.y +

        position.y;

 

      const district =

        getHouseDistrictLabel(

          race

        );

 

      const description =

        getHouseRaceDescription(

          race

        );

 

      const hexPoints =

        getHexPoints(

          centerX,

          centerY,

          HOUSE_HEX_RADIUS

        );

 

      elements.push(`

        <g

          class="houseSvgDistrict ${mapClassForRace(

            race,

            "house"

          )}"

          tabindex="0"

          role="link"

          data-house-slug="${escapeMapHtml(

            race.slug || ""

          )}"

          aria-label="${escapeMapHtml(

            description

          )}"

        >

          <polygon

            points="${hexPoints}"

          ></polygon>

 

          <text

            x="${centerX}"

            y="${centerY + 2}"

          >

            ${escapeMapHtml(

              district

            )}

          </text>

 

          <title>

            ${escapeMapHtml(

              description

            )}

          </title>

        </g>

      `);

    }

  );

 

  return elements.join("");

}

 

function getHouseSvgPosition(

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

      index /

      columns

    );

 

  const column =

    index %

    columns;

 

  const stagger =

    row % 2 === 1

      ? HOUSE_HEX_HORIZONTAL / 2

      : 0;

 

  return {

    x:

      column *

        HOUSE_HEX_HORIZONTAL +

      stagger,

 

    y:

      row *

      HOUSE_HEX_VERTICAL

  };

}

 

function getHexPoints(

  centerX,

  centerY,

  radius

) {

  const points = [];

 

  for (

    let index = 0;

    index < 6;

    index += 1

  ) {

    const angle =

      Math.PI /

        180 *

      (

        60 *

          index -

        30

      );

 

    const x =

      centerX +

      radius *

        Math.cos(

          angle

        );

 

    const y =

      centerY +

      radius *

        Math.sin(

          angle

        );

 

    points.push(

      `${x.toFixed(2)},${y.toFixed(2)}`

    );

  }

 

  return points.join(

    " "

  );

}

 

function getHouseDistrictLabel(

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

 

function getHouseDistrictNumber(

  race

) {

  const label =

    getHouseDistrictLabel(

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

 

function getHouseRaceDescription(

  race

) {

  const leaderData =

    mapHasModelForecast(

      race

    )

      ? effectiveMapLeader(

          race

        )

      : null;

 

  const leader =

    leaderData?.candidate ||

    null;

 

  const parts = [

    race?.title ||

      getHouseDistrictLabel(

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

function ensureHouseSvgStyles() {

  if (

    document.getElementById(

      "electionLabHouseSvgStyles"

    )

  ) {

    return;

  }

 

  const style =

    document.createElement(

      "style"

    );

 

  style.id =

    "electionLabHouseSvgStyles";

 

  style.textContent = `

    #houseHexMap {

      display: block;

      width: 100%;

      min-height: 220px;

      padding: 12px 0;

      box-sizing: border-box;

      overflow: hidden;

    }

 

    .houseSvgMap {

      display: block;

      width: 100%;

      height: auto;

      max-width: 1180px;

      margin: 0 auto;

      overflow: visible;

    }

 

    .houseSvgStateLabel {

      font-size: 10px;

      font-weight: 900;

      letter-spacing: 0.4px;

      fill: #536273;

      pointer-events: none;

      user-select: none;

    }

 

    .houseSvgDistrict {

      cursor: pointer;

      outline: none;

    }

 

    .houseSvgDistrict polygon {

      stroke: rgba(

        255,

        255,

        255,

        0.92

      );

      stroke-width: 1;

      vector-effect: non-scaling-stroke;

      transition:

        filter 120ms ease,

        transform 120ms ease;

      transform-box: fill-box;

      transform-origin: center;

    }

 

    .houseSvgDistrict text {

      font-size: 5.5px;

      font-weight: 900;

      text-anchor: middle;

      dominant-baseline: middle;

      fill: #ffffff;

      pointer-events: none;

      user-select: none;

    }

 

    .houseSvgDistrict:hover polygon,

    .houseSvgDistrict:focus polygon {

      filter: brightness(1.08);

      transform: scale(1.18);

    }

 

    .houseSvgDistrict.map-tossup text,

    .houseSvgDistrict.map-no-race text,

    .houseSvgDistrict.map-not-up text,

    .houseSvgDistrict.map-unrated text,

    .houseSvgDistrict.map-dem-tilt text,

    .houseSvgDistrict.map-rep-tilt text {

      fill: #172033;

    }

 

    .houseSvgDistrict.map-dem-safe polygon {

      fill: #1f5fbf;

    }

 

    .houseSvgDistrict.map-dem-likely polygon {

      fill: #4f83d1;

    }

 

    .houseSvgDistrict.map-dem-lean polygon {

      fill: #86a9df;

    }

 

    .houseSvgDistrict.map-dem-tilt polygon {

      fill: #c8d8f0;

    }

 

    .houseSvgDistrict.map-tossup polygon {

      fill: #d9dde5;

    }

 

    .houseSvgDistrict.map-rep-tilt polygon {

      fill: #f3c9c9;

    }

 

    .houseSvgDistrict.map-rep-lean polygon {

      fill: #e79a9a;

    }

 

    .houseSvgDistrict.map-rep-likely polygon {

      fill: #d95f5f;

    }

 

    .houseSvgDistrict.map-rep-safe polygon {

      fill: #b62222;

    }

 

    .houseSvgDistrict.map-no-race polygon,

    .houseSvgDistrict.map-not-up polygon,

    .houseSvgDistrict.map-unrated polygon {

      fill: #d8dee8;

    }

 

    .houseMapMessage {

      display: flex;

      align-items: center;

      justify-content: center;

      width: 100%;

      min-height: 220px;

      padding: 24px;

      box-sizing: border-box;

      text-align: center;

      white-space: normal;

      word-break: normal;

      color: #607086;

    }

 

    @media (

      max-width: 700px

    ) {

      #houseHexMap {

        padding-left: 0;

        padding-right: 0;

      }

 

      .houseSvgStateLabel {

        font-size: 11px;

      }

 

      .houseSvgDistrict text {

        font-size: 6px;

      }

    }

  `;

 

  document.head.appendChild(

    style

  );

}

 

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

    <div class="houseMapMessage">

      ${escapeMapHtml(

        error?.message ||

          "Unable to load the election map."

      )}

    </div>

  `;

}
