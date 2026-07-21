/*
  ElectionLab Forecast Maps
  -------------------------
  Creates interactive state tile maps for:
  - Senate
  - Governors

  The script reads race information from the cards inside #raceGrid.
*/

document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.dataset.raceType;

  if (pageType === "senate") {
    initializeForecastMap("senateMap", "senate");
  }

  if (pageType === "governor") {
    initializeForecastMap("governorMap", "governor");
  }

  if (pageType === "house") {
    initializeHouseMap();
  }
});


/* =========================================================
   STATE TILE POSITIONS
   ========================================================= */

const STATE_TILES = [
  { abbr: "AK", name: "Alaska", row: 1, col: 1 },
  { abbr: "ME", name: "Maine", row: 1, col: 12 },

  { abbr: "WA", name: "Washington", row: 2, col: 2 },
  { abbr: "ID", name: "Idaho", row: 2, col: 3 },
  { abbr: "MT", name: "Montana", row: 2, col: 4 },
  { abbr: "ND", name: "North Dakota", row: 2, col: 5 },
  { abbr: "MN", name: "Minnesota", row: 2, col: 6 },
  { abbr: "WI", name: "Wisconsin", row: 2, col: 7 },
  { abbr: "MI", name: "Michigan", row: 2, col: 8 },
  { abbr: "NY", name: "New York", row: 2, col: 10 },
  { abbr: "VT", name: "Vermont", row: 2, col: 11 },
  { abbr: "NH", name: "New Hampshire", row: 2, col: 12 },

  { abbr: "OR", name: "Oregon", row: 3, col: 2 },
  { abbr: "NV", name: "Nevada", row: 3, col: 3 },
  { abbr: "WY", name: "Wyoming", row: 3, col: 4 },
  { abbr: "SD", name: "South Dakota", row: 3, col: 5 },
  { abbr: "IA", name: "Iowa", row: 3, col: 6 },
  { abbr: "IL", name: "Illinois", row: 3, col: 7 },
  { abbr: "IN", name: "Indiana", row: 3, col: 8 },
  { abbr: "OH", name: "Ohio", row: 3, col: 9 },
  { abbr: "PA", name: "Pennsylvania", row: 3, col: 10 },
  { abbr: "NJ", name: "New Jersey", row: 3, col: 11 },
  { abbr: "MA", name: "Massachusetts", row: 3, col: 12 },

  { abbr: "CA", name: "California", row: 4, col: 2 },
  { abbr: "UT", name: "Utah", row: 4, col: 3 },
  { abbr: "CO", name: "Colorado", row: 4, col: 4 },
  { abbr: "NE", name: "Nebraska", row: 4, col: 5 },
  { abbr: "MO", name: "Missouri", row: 4, col: 6 },
  { abbr: "KY", name: "Kentucky", row: 4, col: 7 },
  { abbr: "WV", name: "West Virginia", row: 4, col: 8 },
  { abbr: "VA", name: "Virginia", row: 4, col: 9 },
  { abbr: "MD", name: "Maryland", row: 4, col: 10 },
  { abbr: "DE", name: "Delaware", row: 4, col: 11 },
  { abbr: "RI", name: "Rhode Island", row: 4, col: 12 },

  { abbr: "AZ", name: "Arizona", row: 5, col: 3 },
  { abbr: "NM", name: "New Mexico", row: 5, col: 4 },
  { abbr: "KS", name: "Kansas", row: 5, col: 5 },
  { abbr: "AR", name: "Arkansas", row: 5, col: 6 },
  { abbr: "TN", name: "Tennessee", row: 5, col: 7 },
  { abbr: "NC", name: "North Carolina", row: 5, col: 9 },
  { abbr: "SC", name: "South Carolina", row: 5, col: 10 },
  { abbr: "DC", name: "District of Columbia", row: 5, col: 11 },

  { abbr: "OK", name: "Oklahoma", row: 6, col: 5 },
  { abbr: "LA", name: "Louisiana", row: 6, col: 6 },
  { abbr: "MS", name: "Mississippi", row: 6, col: 7 },
  { abbr: "AL", name: "Alabama", row: 6, col: 8 },
  { abbr: "GA", name: "Georgia", row: 6, col: 9 },

  { abbr: "HI", name: "Hawaii", row: 7, col: 2 },
  { abbr: "TX", name: "Texas", row: 7, col: 5 },
  { abbr: "FL", name: "Florida", row: 7, col: 10 }
];


/* =========================================================
   FORECAST COLORS
   ========================================================= */

const RATING_COLORS = {
  "safe democratic": "#173f8f",
  "solid democratic": "#173f8f",
  "safe dem": "#173f8f",
  "solid dem": "#173f8f",

  "likely democratic": "#2f65c7",
  "likely dem": "#2f65c7",

  "lean democratic": "#5b8ee4",
  "lean dem": "#5b8ee4",

  "tilt democratic": "#91b4ef",
  "tilt dem": "#91b4ef",

  "tossup": "#9ca3af",
  "toss-up": "#9ca3af",
  "competitive": "#9ca3af",

  "tilt republican": "#eea6a6",
  "tilt rep": "#eea6a6",

  "lean republican": "#df7171",
  "lean rep": "#df7171",

  "likely republican": "#c94242",
  "likely rep": "#c94242",

  "safe republican": "#8f1f2a",
  "solid republican": "#8f1f2a",
  "safe rep": "#8f1f2a",
  "solid rep": "#8f1f2a",

  "not up": "#283548",
  "no election": "#283548",
  "unrated": "#38475b"
};


/* =========================================================
   CREATE SENATE / GOVERNOR MAP
   ========================================================= */

function initializeForecastMap(containerId, raceType) {
  const mapContainer = document.getElementById(containerId);

  if (!mapContainer) {
    return;
  }

  renderMapShell(mapContainer, raceType);

  const raceGrid = document.getElementById("raceGrid");

  if (!raceGrid) {
    updateMapRatings(mapContainer, raceType);
    return;
  }

  /*
    public.js loads races after the page loads, so this watches
    the race grid and refreshes the map whenever cards appear.
  */
  const observer = new MutationObserver(() => {
    updateMapRatings(mapContainer, raceType);
  });

  observer.observe(raceGrid, {
    childList: true,
    subtree: true,
    characterData: true
  });

  updateMapRatings(mapContainer, raceType);
}


function renderMapShell(container, raceType) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "electionMapWrapper";

  const map = document.createElement("div");
  map.className = "electionTileMap";

  STATE_TILES.forEach((state) => {
    const tile = document.createElement("button");

    tile.type = "button";
    tile.className = "stateTile";
    tile.dataset.state = state.name;
    tile.dataset.abbr = state.abbr;
    tile.dataset.rating = "unrated";

    tile.style.gridRow = state.row;
    tile.style.gridColumn = state.col;

    tile.setAttribute(
      "aria-label",
      `${state.name}: currently unrated`
    );

    tile.innerHTML = `
      <span class="stateAbbr">${state.abbr}</span>
      <span class="stateRatingDot"></span>
    `;

    tile.addEventListener("click", () => {
      handleStateClick(state, raceType);
    });

    tile.addEventListener("mouseenter", (event) => {
      showMapTooltip(event, state, tile.dataset.rating);
    });

    tile.addEventListener("mousemove", moveMapTooltip);
    tile.addEventListener("mouseleave", hideMapTooltip);

    map.appendChild(tile);
  });

  wrapper.appendChild(map);
  container.appendChild(wrapper);

  createMapTooltip();
  injectMapStyles();
}


/* =========================================================
   READ RATINGS FROM RACE CARDS
   ========================================================= */

function updateMapRatings(mapContainer, raceType) {
  const raceData = extractRaceData();

  const stateTiles = mapContainer.querySelectorAll(".stateTile");

  stateTiles.forEach((tile) => {
    const stateName = tile.dataset.state;
    const stateAbbr = tile.dataset.abbr;

    let matchingRace = raceData.find((race) => {
      const searchableText = race.text.toLowerCase();

      return (
        searchableText.includes(stateName.toLowerCase()) ||
        containsStateAbbreviation(searchableText, stateAbbr)
      );
    });

    let rating = "unrated";

    if (matchingRace) {
      rating = detectRating(matchingRace.text);
    } else if (raceType === "senate") {
      rating = "not up";
    }

    setTileRating(tile, rating);
  });
}


function extractRaceData() {
  const raceGrid = document.getElementById("raceGrid");

  if (!raceGrid) {
    return [];
  }

  const cards = Array.from(
    raceGrid.querySelectorAll(
      ".card, .raceCard, .race-card, article, [data-race-id]"
    )
  );

  return cards
    .map((card) => ({
      element: card,
      text: normalizeText(card.innerText || card.textContent || "")
    }))
    .filter((race) => race.text.length > 0);
}


function detectRating(text) {
  const normalized = normalizeText(text).toLowerCase();

  const possibleRatings = Object.keys(RATING_COLORS);

  /*
    Check longer rating phrases first so "likely republican"
    is found before a shorter partial phrase.
  */
  possibleRatings.sort((a, b) => b.length - a.length);

  const match = possibleRatings.find((rating) =>
    normalized.includes(rating)
  );

  return match || "unrated";
}


function setTileRating(tile, rating) {
  const normalizedRating = normalizeRating(rating);
  const color = getRatingColor(normalizedRating);

  tile.dataset.rating = formatRating(normalizedRating);
  tile.style.backgroundColor = color;

  tile.classList.toggle(
    "lightStateTile",
    isLightColorRating(normalizedRating)
  );

  tile.setAttribute(
    "aria-label",
    `${tile.dataset.state}: ${formatRating(normalizedRating)}`
  );
}


/* =========================================================
   CARD NAVIGATION
   ========================================================= */

function handleStateClick(state) {
  const raceGrid = document.getElementById("raceGrid");

  if (!raceGrid) {
    return;
  }

  const cards = Array.from(
    raceGrid.querySelectorAll(
      ".card, .raceCard, .race-card, article, [data-race-id]"
    )
  );

  const matchingCard = cards.find((card) => {
    const text = normalizeText(
      card.innerText || card.textContent || ""
    ).toLowerCase();

    return (
      text.includes(state.name.toLowerCase()) ||
      containsStateAbbreviation(text, state.abbr)
    );
  });

  if (!matchingCard) {
    return;
  }

  matchingCard.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  matchingCard.classList.add("mapSelectedRace");

  window.setTimeout(() => {
    matchingCard.classList.remove("mapSelectedRace");
  }, 1800);
}


/* =========================================================
   HOUSE MAP
   ========================================================= */

function initializeHouseMap() {
  const houseMap = document.getElementById("houseMap");

  if (!houseMap) {
    return;
  }

  /*
    A real House map requires district GeoJSON boundary data.
    This message avoids leaving the page permanently stuck loading.
  */
  houseMap.innerHTML = `
    <div class="houseMapPlaceholder">
      <div class="houseMapIcon">435</div>

      <div>
        <h3>House district map</h3>

        <p>
          The statewide map system is connected. District boundaries
          will appear here once the congressional district map data is added.
        </p>
      </div>
    </div>
  `;

  injectMapStyles();
}


/* =========================================================
   TOOLTIP
   ========================================================= */

function createMapTooltip() {
  if (document.getElementById("electionMapTooltip")) {
    return;
  }

  const tooltip = document.createElement("div");

  tooltip.id = "electionMapTooltip";
  tooltip.className = "electionMapTooltip";
  tooltip.setAttribute("role", "tooltip");

  document.body.appendChild(tooltip);
}


function showMapTooltip(event, state, rating) {
  const tooltip = document.getElementById("electionMapTooltip");

  if (!tooltip) {
    return;
  }

  tooltip.innerHTML = `
    <strong>${state.name}</strong>
    <span>${formatRating(rating)}</span>
  `;

  tooltip.classList.add("visible");
  moveMapTooltip(event);
}


function moveMapTooltip(event) {
  const tooltip = document.getElementById("electionMapTooltip");

  if (!tooltip) {
    return;
  }

  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}


function hideMapTooltip() {
  const tooltip = document.getElementById("electionMapTooltip");

  if (tooltip) {
    tooltip.classList.remove("visible");
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

function normalizeText(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeRating(rating) {
  const value = normalizeText(rating).toLowerCase();

  const ratingAliases = {
    "solid democratic": "safe democratic",
    "solid dem": "safe democratic",
    "safe dem": "safe democratic",

    "likely dem": "likely democratic",
    "lean dem": "lean democratic",
    "tilt dem": "tilt democratic",

    "toss-up": "tossup",
    "competitive": "tossup",

    "tilt rep": "tilt republican",
    "lean rep": "lean republican",
    "likely rep": "likely republican",

    "solid republican": "safe republican",
    "solid rep": "safe republican",
    "safe rep": "safe republican",

    "no election": "not up"
  };

  return ratingAliases[value] || value || "unrated";
}


function getRatingColor(rating) {
  return RATING_COLORS[rating] || RATING_COLORS.unrated;
}


function formatRating(rating) {
  return normalizeText(rating)
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}


function containsStateAbbreviation(text, abbreviation) {
  const escapedAbbreviation = abbreviation.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const pattern = new RegExp(
    `(^|[^a-z])${escapedAbbreviation.toLowerCase()}([^a-z]|$)`
  );

  return pattern.test(text.toLowerCase());
}


function isLightColorRating(rating) {
  return [
    "tilt democratic",
    "tossup",
    "tilt republican"
  ].includes(rating);
}


/* =========================================================
   MAP CSS
   Injected automatically so the map works immediately.
   You may move this CSS into styles.css later.
   ========================================================= */

function injectMapStyles() {
  if (document.getElementById("electionMapStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "electionMapStyles";

  style.textContent = `
    .forecastMap {
      width: 100%;
      min-height: 420px;
    }

    .electionMapWrapper {
      width: 100%;
      padding: 24px;
      overflow-x: auto;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      background:
        radial-gradient(
          circle at top,
          rgba(66, 90, 122, 0.16),
          transparent 48%
        ),
        rgba(13, 22, 34, 0.88);
      box-shadow:
        0 18px 45px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .electionTileMap {
      display: grid;
      grid-template-columns: repeat(12, minmax(48px, 68px));
      grid-template-rows: repeat(7, minmax(48px, 68px));
      gap: 7px;
      width: max-content;
      min-width: 100%;
      justify-content: center;
      align-items: center;
    }

    .stateTile {
      position: relative;
      width: 100%;
      height: 100%;
      min-width: 48px;
      min-height: 48px;
      border: 1px solid rgba(255, 255, 255, 0.17);
      border-radius: 11px;
      color: #ffffff;
      font: inherit;
      cursor: pointer;
      transition:
        transform 150ms ease,
        filter 150ms ease,
        border-color 150ms ease,
        box-shadow 150ms ease;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.12),
        0 5px 12px rgba(0, 0, 0, 0.14);
    }

    .stateTile:hover {
      z-index: 5;
      transform: translateY(-3px) scale(1.06);
      filter: brightness(1.12);
      border-color: rgba(255, 255, 255, 0.55);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.18),
        0 10px 24px rgba(0, 0, 0, 0.28);
    }

    .stateTile:focus-visible {
      z-index: 6;
      outline: 3px solid rgba(255, 255, 255, 0.9);
      outline-offset: 3px;
    }

    .stateAbbr {
      display: block;
      font-size: 0.86rem;
      font-weight: 800;
      letter-spacing: 0.035em;
      line-height: 1;
    }

    .stateRatingDot {
      position: absolute;
      right: 6px;
      bottom: 6px;
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
    }

    .stateTile.lightStateTile {
      color: #111827;
      border-color: rgba(17, 24, 39, 0.18);
    }

    .stateTile.lightStateTile .stateRatingDot {
      background: rgba(17, 24, 39, 0.58);
    }

    .electionMapTooltip {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 145px;
      padding: 10px 12px;
      pointer-events: none;
      opacity: 0;
      transform: translateY(4px);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #f8fafc;
      background: rgba(10, 17, 27, 0.96);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.32);
      transition:
        opacity 120ms ease,
        transform 120ms ease;
    }

    .electionMapTooltip.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .electionMapTooltip strong {
      font-size: 0.88rem;
    }

    .electionMapTooltip span {
      color: #aebdce;
      font-size: 0.78rem;
    }

    .mapSelectedRace {
      animation: electionLabRaceHighlight 1.8s ease;
    }

    @keyframes electionLabRaceHighlight {
      0%,
      100% {
        transform: translateY(0);
        box-shadow: inherit;
      }

      30% {
        transform: translateY(-5px);
        box-shadow:
          0 0 0 3px rgba(80, 145, 255, 0.32),
          0 18px 35px rgba(0, 0, 0, 0.25);
      }
    }

    .houseMapPlaceholder {
      display: flex;
      align-items: center;
      gap: 18px;
      min-height: 260px;
      padding: 30px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      color: #eef4fb;
      background:
        radial-gradient(
          circle at top left,
          rgba(54, 103, 181, 0.2),
          transparent 44%
        ),
        rgba(13, 22, 34, 0.88);
    }

    .houseMapPlaceholder h3 {
      margin: 0 0 7px;
    }

    .houseMapPlaceholder p {
      max-width: 620px;
      margin: 0;
      color: #aebdce;
      line-height: 1.6;
    }

    .houseMapIcon {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      width: 72px;
      height: 72px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 18px;
      color: #ffffff;
      background: linear-gradient(145deg, #264f8f, #17335d);
      font-weight: 850;
      font-size: 1.2rem;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
    }

    @media (max-width: 760px) {
      .forecastMap {
        min-height: 350px;
      }

      .electionMapWrapper {
        padding: 15px;
      }

      .electionTileMap {
        grid-template-columns: repeat(12, 45px);
        grid-template-rows: repeat(7, 45px);
        gap: 5px;
        justify-content: start;
      }

      .stateTile {
        min-width: 45px;
        min-height: 45px;
        border-radius: 9px;
      }

      .stateAbbr {
        font-size: 0.73rem;
      }

      .houseMapPlaceholder {
        align-items: flex-start;
        padding: 22px;
      }

      .houseMapIcon {
        width: 58px;
        height: 58px;
      }
    }
  `;

  document.head.appendChild(style);
}
