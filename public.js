const PUBLIC_DEFAULT_SETTINGS = {
  senate_control_message:
    "Republicans are favored to retain control of the Senate",

  house_control_message:
    "Republicans are favored to retain control of the House"
};

async function getPublicSettings() {
  if (!configured) {
    return { ...PUBLIC_DEFAULT_SETTINGS };
  }

  const { data, error } = await sb
    .from("site_settings")
    .select("setting_key, setting_value");

  if (error) {
    console.warn(
      "Could not load homepage settings:",
      error.message
    );

    return { ...PUBLIC_DEFAULT_SETTINGS };
  }

  return {
    ...PUBLIC_DEFAULT_SETTINGS,

    ...(data || []).reduce((settings, row) => {
      settings[row.setting_key] =
        row.setting_value;

      return settings;
    }, {})
  };
}

function setTextForSelectors(selectors, text) {
  selectors.forEach(selector => {
    const element =
      document.querySelector(selector);

    if (element) {
      element.textContent = text;
    }
  });
}

async function loadHomepageSettings() {
  const hasHomepageSettings =
    document.querySelector("#senateControlMessage") ||
    document.querySelector("#houseControlMessage") ||
    document.querySelector("#senateForecastText") ||
    document.querySelector("#houseForecastText") ||
    document.querySelector("[data-setting='senate_control_message']") ||
    document.querySelector("[data-setting='house_control_message']");

  if (!hasHomepageSettings) return;

  const settings =
    await getPublicSettings();

  setTextForSelectors(
    [
      "#senateControlMessage",
      "#senateForecastText",
      "[data-setting='senate_control_message']"
    ],
    settings.senate_control_message
  );

  setTextForSelectors(
    [
      "#houseControlMessage",
      "#houseForecastText",
      "[data-setting='house_control_message']"
    ],
    settings.house_control_message
  );
}

async function loadHome() {
  const box =
    document.querySelector("#featuredRaces");

  if (!box) return;

  if (!configured) {
    box.innerHTML =
      '<div class="empty">The public design is ready. Connect Supabase to load your published races.</div>';

    return;
  }

  try {
    const races =
      await getPublishedRaces();

    const featured =
      races
        .filter(race => race.featured)
        .slice(0, 6);

    const count =
      document.querySelector("#raceCount");

    if (count) {
      count.textContent = races.length;
    }

    box.innerHTML =
      (
        featured.length
          ? featured
          : races.slice(0, 6)
      )
        .map(race => raceCard(race))
        .join("") ||
      '<div class="empty">No published races yet.</div>';

    renderElectionMap(races);
  } catch (error) {
    box.innerHTML =
      '<div class="empty">' +
      escapeHtml(error.message) +
      "</div>";
  }
}

function raceCard(race) {
  const candidates =
    [...(race.candidates || [])].sort(
      (a, b) =>
        Number(b.win_probability || 0) -
        Number(a.win_probability || 0)
    );

  const office =
    raceOffice(race);

  const label =
    officeLabel(office);

  const margin =
    Number(race.projected_margin || 0);

  return `
    <a
      class="card raceCard"
      href="race.html?id=${encodeURIComponent(
        race.slug
      )}"
    >
      <div class="raceMeta">
        <span>
          ${escapeHtml(race.state)}
          ·
          ${escapeHtml(label)}
        </span>

        <span
          class="badge ${ratingClass(race.rating)}"
        >
          ${escapeHtml(race.rating)}
        </span>
      </div>

      <h3>
        ${escapeHtml(race.title)}
      </h3>

      <div class="candidates">
        ${candidates
          .slice(0, 3)
          .map(
            candidate => `
              <div class="candidateLine">
                <span>
                  <i
                    class="partyDot party-${escapeHtml(
                      candidate.party
                    )}"
                  ></i>

                  ${escapeHtml(candidate.name)}
                </span>

                <strong>
                  ${Number(
                    candidate.win_probability || 0
                  ).toFixed(0)}%
                </strong>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="raceMeta">
        <span>Model margin</span>

        <strong>
          ${margin >= 0 ? "D +" : "R +"}
          ${Math.abs(margin).toFixed(1)}
        </strong>
      </div>
    </a>
  `;
}

function normalizeStateCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function mapRatingClass(race) {
  const rating =
    String(race?.rating || "")
      .toLowerCase()
      .trim();

  const margin =
    Number(race?.projected_margin || 0);

  const party =
    margin >= 0 ? "dem" : "rep";

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

function chooseStateRace(races) {
  const priority = {
    senate: 3,
    governor: 2,
    house: 1
  };

  return [...races].sort((a, b) => {
    const featuredDifference =
      Number(Boolean(b.featured)) -
      Number(Boolean(a.featured));

    if (featuredDifference !== 0) {
      return featuredDifference;
    }

    return (
      (priority[raceOffice(b)] || 0) -
      (priority[raceOffice(a)] || 0)
    );
  })[0];
}

function renderElectionMap(races) {
  const map =
    document.querySelector("#electionMap") ||
    document.querySelector("#usMap") ||
    document.querySelector(".electionMap");

  if (!map) return;

  const stateGroups =
    races.reduce((groups, race) => {
      const state =
        normalizeStateCode(race.state);

      if (!state) return groups;

      if (!groups[state]) {
        groups[state] = [];
      }

      groups[state].push(race);

      return groups;
    }, {});

  const stateElements =
    map.querySelectorAll(
      "[data-state], [data-state-code], path[id], g[id]"
    );

  stateElements.forEach(element => {
    const rawState =
      element.dataset.state ||
      element.dataset.stateCode ||
      element.id;

    const state =
      normalizeStateCode(rawState)
        .replace(/^US[-_]/, "")
        .replace(/^STATE[-_]/, "");

    if (state.length !== 2) return;

    element.classList.remove(
      "map-dem-safe",
      "map-dem-likely",
      "map-dem-lean",
      "map-dem-tilt",
      "map-rep-safe",
      "map-rep-likely",
      "map-rep-lean",
      "map-rep-tilt",
      "map-tossup",
      "map-no-race"
    );

    const stateRaces =
      stateGroups[state] || [];

    if (!stateRaces.length) {
      element.classList.add("map-no-race");
      return;
    }

    const selectedRace =
      chooseStateRace(stateRaces);

    element.classList.add(
      mapRatingClass(selectedRace)
    );

    element.style.cursor = "pointer";

    element.setAttribute(
      "aria-label",
      `${selectedRace.title}: ${selectedRace.rating}`
    );

    element.onclick = () => {
      location.href =
        "race.html?id=" +
        encodeURIComponent(selectedRace.slug);
    };
  });
}

async function loadRaceGrid() {
  const box =
    document.querySelector("#raceGrid");

  if (!box) return;

  const office =
    currentPageOffice();

  const label =
    officeLabel(office);

  if (!configured) {
    box.innerHTML =
      `<div class="empty">Connect Supabase to display published ${escapeHtml(
        label
      )} races.</div>`;

    return;
  }

  try {
    const races =
      await getPublishedRaces(office);

    function displayRaces(list) {
      box.innerHTML =
        list
          .map(race => raceCard(race))
          .join("") ||
        `<div class="empty">No published ${escapeHtml(
          label
        )} races yet.</div>`;
    }

    displayRaces(races);

    const input =
      document.querySelector("#raceSearch");

    if (input) {
      input.oninput = () => {
        const query =
          input.value
            .toLowerCase()
            .trim();

        const filtered =
          races.filter(race => {
            const searchable = [
              race.title,
              race.state,

              ...(race.candidates || []).map(
                candidate => candidate.name
              )
            ]
              .join(" ")
              .toLowerCase();

            return searchable.includes(query);
          });

        box.innerHTML =
          filtered
            .map(race => raceCard(race))
            .join("") ||
          '<div class="empty">No matches.</div>';
      };
    }
  } catch (error) {
    box.innerHTML =
      '<div class="empty">' +
      escapeHtml(error.message) +
      "</div>";
  }
}
async function loadRace() {
  const root =
    document.querySelector("#raceRoot");

  if (!root) return;

  if (!configured) {
    root.innerHTML =
      '<div class="empty">Connect Supabase to load this race.</div>';

    return;
  }

  const slug =
    new URLSearchParams(location.search).get("id");

  const { data: race, error } = await sb
    .from("races")
    .select("*,candidates(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !race) {
    root.innerHTML =
      '<div class="empty">Published race not found.</div>';

    return;
  }

  const polls =
    await getPublishedPolls(race.id);

  const average =
    weightedAverage(polls);

  const candidates =
    [...(race.candidates || [])].sort(
      (a, b) =>
        Number(b.win_probability || 0) -
        Number(a.win_probability || 0)
    );

  const office =
    raceOffice(race);

  const label =
    officeLabel(office);

  const margin =
    Number(race.projected_margin || 0);

  document.title =
    `${race.title} | ElectionLab`;

  root.innerHTML = `
    <div class="hero">
      <div class="heroGrid">

        <div>
          <div class="kicker">
            2026 ${escapeHtml(label)} Forecast
          </div>

          <h1>
            ${escapeHtml(race.title)}
          </h1>

          <p>
            ${escapeHtml(
              race.summary ||
                "ElectionLab's published forecast and polling average."
            )}
          </p>

          <span
            class="badge ${ratingClass(race.rating)}"
          >
            ${escapeHtml(race.rating)}
          </span>
        </div>

        <div class="probCard">
          <div class="bigProb">
            ${Number(
              candidates[0]?.win_probability || 0
            ).toFixed(0)}%
          </div>

          <b>
            ${escapeHtml(
              candidates[0]?.name ||
                "Leading candidate"
            )}
          </b>

          <div>chance to win</div>
        </div>

      </div>
    </div>

    <section class="section">
      <div class="grid2">

        <div class="card">
          <h2>Forecast</h2>

          ${
            candidates
              .map(
                candidate => `
                  <div class="candidateLine">
                    <span>
                      <i
                        class="partyDot party-${escapeHtml(
                          candidate.party
                        )}"
                      ></i>

                      <b>
                        ${escapeHtml(candidate.name)}
                      </b>

                      <small class="subtle">
                        ${escapeHtml(
                          partyName(candidate.party)
                        )}
                      </small>
                    </span>

                    <strong>
                      ${Number(
                        candidate.win_probability || 0
                      ).toFixed(0)}%
                    </strong>
                  </div>
                `
              )
              .join("") ||
            '<p class="subtle">No candidates have been added yet.</p>'
          }

          <p class="subtle">
            Projected margin:

            <b>
              ${margin >= 0 ? "D +" : "R +"}
              ${Math.abs(margin).toFixed(1)}
            </b>
          </p>
        </div>

        <div class="card">
          <h2>Polling average</h2>

          ${
            average
              ? `
                <div
                  class="bigProb"
                  style="font-size:48px;color:var(--ink)"
                >
                  ${average.margin >= 0 ? "D +" : "R +"}
                  ${Math.abs(
                    average.margin
                  ).toFixed(1)}
                </div>

                <div class="controlBar">
                  <span
                    class="dem"
                    style="width:${Math.max(
                      0,
                      Math.min(100, average.dem)
                    )}%"
                  ></span>

                  <span
                    class="rep"
                    style="width:${Math.max(
                      0,
                      Math.min(100, average.rep)
                    )}%"
                  ></span>
                </div>

                <div class="raceMeta">
                  <b>
                    D ${average.dem.toFixed(1)}%
                  </b>

                  <b>
                    R ${average.rep.toFixed(1)}%
                  </b>
                </div>
              `
              : `
                <p class="subtle">
                  No published polls yet.
                </p>
              `
          }
        </div>

      </div>
    </section>

    <section class="section">
      <div class="sectionHead">
        <div>
          <h2>Recent polls</h2>

          <p>
            Weighted by recency, sample size,
            voter population, and quality.
          </p>
        </div>
      </div>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Pollster</th>
              <th>Dates</th>
              <th>Sample</th>
              <th>Dem</th>
              <th>Rep</th>
              <th>Margin</th>
            </tr>
          </thead>

          <tbody>
            ${
              polls
                .map(poll => {
                  const pollMargin =
                    Number(poll.dem_pct) -
                    Number(poll.rep_pct);

                  return `
                    <tr>
                      <td>
                        <b>
                          ${escapeHtml(
                            poll.pollster
                          )}
                        </b>
                      </td>

                      <td>
                        ${fmtDate(
                          poll.start_date
                        )}–${fmtDate(
                          poll.end_date
                        )}
                      </td>

                      <td>
                        ${poll.sample_size || "—"}
                        ${escapeHtml(
                          poll.population || ""
                        )}
                      </td>

                      <td>
                        ${Number(
                          poll.dem_pct
                        ).toFixed(1)}
                      </td>

                      <td>
                        ${Number(
                          poll.rep_pct
                        ).toFixed(1)}
                      </td>

                      <td>
                        <b>
                          ${
                            pollMargin >= 0
                              ? "D +"
                              : "R +"
                          }

                          ${Math.abs(
                            pollMargin
                          ).toFixed(1)}
                        </b>
                      </td>
                    </tr>
                  `;
                })
                .join("") ||
              `
                <tr>
                  <td
                    colspan="6"
                    class="empty"
                  >
                    No polls published.
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}
document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadHomepageSettings();
    loadHome();
    loadRaceGrid();
    loadHouseHexMap();
    loadRace();
  }
);
