let state = {
  races: [],
  polls: [],
  candidates: [],
  genericBallotPolls: [],
  settings: {},
  currentRaceId: null
};

const $ = selector =>
  document.querySelector(selector);

const $$ = selector => [
  ...document.querySelectorAll(selector)
];

const DEFAULT_SETTINGS = {
  senate_control_message:
    "Republicans are favored to retain control of the Senate",

  house_control_message:
    "Republicans are favored to retain control of the House",

  congress_control_message:
    "Democrats currently lead the national vote",

  senate_republican_seats:
    "51",

  senate_tossup_seats:
    "0",

  senate_democratic_seats:
    "49",

  house_republican_seats:
    "220",

  house_tossup_seats:
    "0",

  house_democratic_seats:
    "215",

  governor_republican_seats:
    "27",

  governor_tossup_seats:
    "0",

  governor_democratic_seats:
    "23"
};

function msg(
  text,
  type = "success"
) {
  const notice =
    $("#adminMessage");

  if (!notice) {
    console.log(text);
    return;
  }

  notice.className =
    `notice ${type}`;

  notice.textContent =
    text;

  notice.style.display =
    "block";

  setTimeout(() => {
    notice.style.display =
      "none";
  }, 5000);
}

function adminOfficeLabel(office) {
  if (office === "governor") {
    return "Governor";
  }

  if (office === "house") {
    return "U.S. House";
  }

  return "U.S. Senate";
}

async function requireAdmin() {
  if (!configured) {
    location.href =
      "login.html";

    return false;
  }

  const {
    data: { session },
    error: sessionError
  } = await sb.auth.getSession();

  if (
    sessionError ||
    !session
  ) {
    location.href =
      "login.html";

    return false;
  }

  const {
    data,
    error
  } = await sb
    .from("admins")
    .select("user_id")
    .eq(
      "user_id",
      session.user.id
    )
    .maybeSingle();

  if (
    error ||
    !data
  ) {
    await sb.auth.signOut();

    location.href =
      "login.html";

    return false;
  }

  const emailBox =
    $("#adminEmail");

  if (emailBox) {
    emailBox.textContent =
      session.user.email || "";
  }

  return true;
}

async function loadSettings() {
  const {
    data,
    error
  } = await sb
    .from("site_settings")
    .select(
      "setting_key, setting_value"
    );

  if (error) {
    console.warn(
      "Could not load site settings:",
      error.message
    );

    return {
      ...DEFAULT_SETTINGS
    };
  }

  return {
    ...DEFAULT_SETTINGS,

    ...(data || []).reduce(
      (settings, row) => {
        settings[
          row.setting_key
        ] =
          row.setting_value;

        return settings;
      },
      {}
    )
  };
}

async function reloadAll() {
  const [
    raceResult,
    candidateResult,
    pollResult,
    genericBallotResult,
    settingsResult
  ] = await Promise.all([
    sb
      .from("races")
      .select("*")
      .order("state"),

    sb
      .from("candidates")
      .select("*")
      .order("name"),

    sb
      .from("polls")
      .select("*")
      .order(
        "end_date",
        {
          ascending: false
        }
      ),

    sb
      .from(
        "generic_ballot_polls"
      )
      .select("*")
      .order(
        "end_date",
        {
          ascending: false
        }
      ),

    loadSettings()
  ]);

  const firstError =
    raceResult.error ||
    candidateResult.error ||
    pollResult.error ||
    genericBallotResult.error;

  if (firstError) {
    throw firstError;
  }

  state.races =
    raceResult.data || [];

  state.candidates =
    candidateResult.data || [];

  state.polls =
    pollResult.data || [];

  state.genericBallotPolls =
    genericBallotResult.data || [];

  state.settings =
    settingsResult || {
      ...DEFAULT_SETTINGS
    };

  renderDashboard();
  renderWebsiteSettings();
  renderRaces();
  renderCandidates();
  renderPolls();
  renderGenericBallotPolls();
  populateRaceSelects();
}

function renderDashboard() {
  const statRaces =
    $("#statRaces");

  const statPublished =
    $("#statPublished");

  const statCandidates =
    $("#statCandidates");

  const statPolls =
    $("#statPolls");

  if (statRaces) {
    statRaces.textContent =
      String(
        state.races.length
      );
  }

  if (statPublished) {
    statPublished.textContent =
      String(
        state.races.filter(
          race =>
            race.status ===
            "published"
        ).length
      );
  }

  if (statCandidates) {
    statCandidates.textContent =
      String(
        state.candidates.length
      );
  }

  if (statPolls) {
    statPolls.textContent =
      String(
        state.polls.length
      );
  }
}

function setInputValue(
  selector,
  settingKey
) {
  const input =
    $(selector);

  if (!input) {
    return;
  }

  input.value =
    state.settings[
      settingKey
    ] ??
    DEFAULT_SETTINGS[
      settingKey
    ] ??
    "";
}

function renderWebsiteSettings() {
  setInputValue(
    "#homepageSenate",
    "senate_control_message"
  );

  setInputValue(
    "#homepageHouse",
    "house_control_message"
  );

  setInputValue(
    "#homepageCongress",
    "congress_control_message"
  );

  setInputValue(
    "#senateRepublicanSeats",
    "senate_republican_seats"
  );

  setInputValue(
    "#senateTossupSeats",
    "senate_tossup_seats"
  );

  setInputValue(
    "#senateDemocraticSeats",
    "senate_democratic_seats"
  );

  setInputValue(
    "#houseRepublicanSeats",
    "house_republican_seats"
  );

  setInputValue(
    "#houseTossupSeats",
    "house_tossup_seats"
  );

  setInputValue(
    "#houseDemocraticSeats",
    "house_democratic_seats"
  );

  setInputValue(
    "#governorRepublicanSeats",
    "governor_republican_seats"
  );

  setInputValue(
    "#governorTossupSeats",
    "governor_tossup_seats"
  );

  setInputValue(
    "#governorDemocraticSeats",
    "governor_democratic_seats"
  );
}

function readRequiredText(
  selector,
  label
) {
  const input =
    $(selector);

  if (!input) {
    throw new Error(
      `${label} field could not be found.`
    );
  }

  const value =
    input.value.trim();

  if (!value) {
    throw new Error(
      `${label} is required.`
    );
  }

  return value;
}

function readRequiredInteger(
  selector,
  label,
  maximum
) {
  const input =
    $(selector);

  if (!input) {
    throw new Error(
      `${label} field could not be found.`
    );
  }

  const value =
    Number(input.value);

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new Error(
      `${label} must be a whole number between 0 and ${maximum}.`
    );
  }

  return value;
}

async function saveHomepageSettings(
  event
) {
  event.preventDefault();

  try {
    const values = {
      senate_control_message:
        readRequiredText(
          "#homepageSenate",
          "Senate headline"
        ),

      house_control_message:
        readRequiredText(
          "#homepageHouse",
          "House headline"
        ),

      congress_control_message:
        readRequiredText(
          "#homepageCongress",
          "Generic ballot headline"
        ),

      senate_republican_seats:
        readRequiredInteger(
          "#senateRepublicanSeats",
          "Senate Republican seats",
          100
        ),

      senate_tossup_seats:
        readRequiredInteger(
          "#senateTossupSeats",
          "Senate toss-up seats",
          100
        ),

      senate_democratic_seats:
        readRequiredInteger(
          "#senateDemocraticSeats",
          "Senate Democratic seats",
          100
        ),

      house_republican_seats:
        readRequiredInteger(
          "#houseRepublicanSeats",
          "House Republican seats",
          435
        ),

      house_tossup_seats:
        readRequiredInteger(
          "#houseTossupSeats",
          "House toss-up seats",
          435
        ),

      house_democratic_seats:
        readRequiredInteger(
          "#houseDemocraticSeats",
          "House Democratic seats",
          435
        ),

      governor_republican_seats:
        readRequiredInteger(
          "#governorRepublicanSeats",
          "Republican governorships",
          50
        ),

      governor_tossup_seats:
        readRequiredInteger(
          "#governorTossupSeats",
          "Toss-up governorships",
          50
        ),

      governor_democratic_seats:
        readRequiredInteger(
          "#governorDemocraticSeats",
          "Democratic governorships",
          50
        )
    };

    const senateTotal =
      values
        .senate_republican_seats +
      values
        .senate_tossup_seats +
      values
        .senate_democratic_seats;

    const houseTotal =
      values
        .house_republican_seats +
      values
        .house_tossup_seats +
      values
        .house_democratic_seats;

    const governorTotal =
      values
        .governor_republican_seats +
      values
        .governor_tossup_seats +
      values
        .governor_democratic_seats;

    if (senateTotal !== 100) {
      throw new Error(
        "Senate totals must add up to 100."
      );
    }

    if (houseTotal !== 435) {
      throw new Error(
        "House totals must add up to 435."
      );
    }

    if (governorTotal !== 50) {
      throw new Error(
        "Governor totals must add up to 50."
      );
    }

    const updatedAt =
      new Date().toISOString();

    const rows =
      Object.entries(values).map(
        ([
          settingKey,
          settingValue
        ]) => ({
          setting_key:
            settingKey,

          setting_value:
            String(
              settingValue
            ),

          updated_at:
            updatedAt
        })
      );

    const { error } =
      await sb
        .from("site_settings")
        .upsert(
          rows,
          {
            onConflict:
              "setting_key"
          }
        );

    if (error) {
      throw error;
    }

    state.settings = {
      ...state.settings,

      ...Object.fromEntries(
        Object.entries(
          values
        ).map(
          ([
            key,
            value
          ]) => [
            key,
            String(value)
          ]
        )
      )
    };

    msg(
      "Website headlines and forecast totals saved."
    );
  } catch (error) {
    msg(
      error.message ||
        "Unable to save website settings.",
      "error"
    );
  }
}
function renderRaces() {
  const body =
    $("#racesBody");

  if (!body) {
    return;
  }

  body.innerHTML =
    state.races
      .map(race => {
        const margin =
          Number(
            race.projected_margin || 0
          );

        return `
          <tr>
            <td>
              <b>
                ${escapeHtml(
                  race.title || ""
                )}
              </b>

              <br>

              <small>
                ${escapeHtml(
                  race.slug || ""
                )}
              </small>
            </td>

            <td>
              ${escapeHtml(
                adminOfficeLabel(
                  race.office
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                race.rating ||
                  "Toss-up"
              )}
            </td>

            <td>
              ${
                margin >= 0
                  ? "D +"
                  : "R +"
              }

              ${Math.abs(
                margin
              ).toFixed(1)}
            </td>

            <td>
              <span
                class="badge ${
                  race.status ===
                  "published"
                    ? "green"
                    : "gold"
                }"
              >
                ${escapeHtml(
                  race.status ||
                    "draft"
                )}
              </span>
            </td>

            <td>
              <button
                class="btn light"
                type="button"
                onclick="editRace('${race.id}')"
              >
                Edit
              </button>

              <button
                class="btn red"
                type="button"
                onclick="deleteRace('${race.id}')"
              >
                Delete
              </button>
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
          No races yet.
        </td>
      </tr>
    `;
}

function renderCandidates() {
  const body =
    $("#candidatesBody");

  if (!body) {
    return;
  }

  body.innerHTML =
    state.candidates
      .map(candidate => {
        const race =
          state.races.find(
            item =>
              item.id ===
              candidate.race_id
          );

        return `
          <tr>
            <td>
              <b>
                ${escapeHtml(
                  candidate.name || ""
                )}
              </b>
            </td>

            <td>
              ${escapeHtml(
                race?.title || "—"
              )}
            </td>

            <td>
              ${escapeHtml(
                candidate.party || ""
              )}
            </td>

            <td>
              ${Number(
                candidate
                  .win_probability || 0
              ).toFixed(1)}%
            </td>

            <td>
              ${Number(
                candidate
                  .expected_vote_share || 0
              ).toFixed(1)}%
            </td>

            <td>
              <button
                class="btn light"
                type="button"
                onclick="editCandidate('${candidate.id}')"
              >
                Edit
              </button>

              <button
                class="btn red"
                type="button"
                onclick="deleteCandidate('${candidate.id}')"
              >
                Delete
              </button>
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
          No candidates yet.
        </td>
      </tr>
    `;
}

function renderPolls() {
  const body =
    $("#pollsBody");

  if (!body) {
    return;
  }

  body.innerHTML =
    state.polls
      .map(poll => {
        const race =
          state.races.find(
            item =>
              item.id ===
              poll.race_id
          );

        return `
          <tr>
            <td>
              <b>
                ${escapeHtml(
                  poll.pollster || ""
                )}
              </b>
            </td>

            <td>
              ${escapeHtml(
                race?.title || "—"
              )}
            </td>

            <td>
              ${fmtDate(
                poll.end_date
              )}
            </td>

            <td>
              ${
                poll.sample_size ||
                "—"
              }

              ${escapeHtml(
                poll.population || ""
              )}
            </td>

            <td>
              D ${Number(
                poll.dem_pct || 0
              ).toFixed(1)}

              /

              R ${Number(
                poll.rep_pct || 0
              ).toFixed(1)}
            </td>

            <td>
              <span
                class="badge ${
                  poll.status ===
                  "published"
                    ? "green"
                    : "gold"
                }"
              >
                ${escapeHtml(
                  poll.status ||
                    "draft"
                )}
              </span>
            </td>

            <td>
              <button
                class="btn light"
                type="button"
                onclick="editPoll('${poll.id}')"
              >
                Edit
              </button>

              <button
                class="btn red"
                type="button"
                onclick="deletePoll('${poll.id}')"
              >
                Delete
              </button>
            </td>
          </tr>
        `;
      })
      .join("") ||
    `
      <tr>
        <td
          colspan="7"
          class="empty"
        >
          No race polls yet.
        </td>
      </tr>
    `;
}

function genericBallotAverage(
  polls
) {
  const published =
    polls.filter(
      poll =>
        poll.status ===
        "published"
    );

  if (!published.length) {
    return null;
  }

  let demTotal = 0;
  let repTotal = 0;
  let totalWeight = 0;

  published.forEach(poll => {
    const sampleWeight =
      Math.sqrt(
        Math.max(
          1,
          Number(
            poll.sample_size || 1
          )
        )
      );

    const qualityWeight =
      Math.max(
        0.1,
        Number(
          poll.quality_weight || 1
        )
      );

    const weight =
      sampleWeight *
      qualityWeight;

    demTotal +=
      Number(
        poll.dem_pct || 0
      ) * weight;

    repTotal +=
      Number(
        poll.rep_pct || 0
      ) * weight;

    totalWeight +=
      weight;
  });

  if (!totalWeight) {
    return null;
  }

  const dem =
    demTotal / totalWeight;

  const rep =
    repTotal / totalWeight;

  return {
    dem,
    rep,
    margin:
      dem - rep
  };
}

function renderGenericBallotPolls() {
  const body =
    $("#genericBallotBody");

  if (!body) {
    return;
  }

  const average =
    genericBallotAverage(
      state.genericBallotPolls
    );

  const demBox =
    $("#genericAverageDem");

  const repBox =
    $("#genericAverageRep");

  const marginBox =
    $("#genericAverageMargin");

  if (average) {
    if (demBox) {
      demBox.textContent =
        `${average.dem.toFixed(1)}%`;
    }

    if (repBox) {
      repBox.textContent =
        `${average.rep.toFixed(1)}%`;
    }

    if (marginBox) {
      marginBox.textContent =
        `${
          average.margin >= 0
            ? "D +"
            : "R +"
        }${Math.abs(
          average.margin
        ).toFixed(1)} generic ballot average`;
    }
  } else {
    if (demBox) {
      demBox.textContent =
        "—%";
    }

    if (repBox) {
      repBox.textContent =
        "—%";
    }

    if (marginBox) {
      marginBox.textContent =
        "Add published polls to calculate an average.";
    }
  }

  body.innerHTML =
    state.genericBallotPolls
      .map(poll => {
        const margin =
          Number(
            poll.dem_pct || 0
          ) -
          Number(
            poll.rep_pct || 0
          );

        return `
          <tr>
            <td>
              <b>
                ${escapeHtml(
                  poll.pollster || ""
                )}
              </b>
            </td>

            <td>
              ${fmtDate(
                poll.start_date
              )}
              –
              ${fmtDate(
                poll.end_date
              )}
            </td>

            <td>
              ${
                poll.sample_size ||
                "—"
              }

              ${escapeHtml(
                poll.population || ""
              )}
            </td>

            <td>
              ${Number(
                poll.dem_pct || 0
              ).toFixed(1)}
            </td>

            <td>
              ${Number(
                poll.rep_pct || 0
              ).toFixed(1)}
            </td>

            <td>
              <b>
                ${
                  margin >= 0
                    ? "D +"
                    : "R +"
                }

                ${Math.abs(
                  margin
                ).toFixed(1)}
              </b>
            </td>

            <td>
              <span
                class="badge ${
                  poll.status ===
                  "published"
                    ? "green"
                    : "gold"
                }"
              >
                ${escapeHtml(
                  poll.status ||
                    "draft"
                )}
              </span>
            </td>

            <td>
              <button
                class="btn light"
                type="button"
                onclick="editGenericBallotPoll('${poll.id}')"
              >
                Edit
              </button>

              <button
                class="btn red"
                type="button"
                onclick="deleteGenericBallotPoll('${poll.id}')"
              >
                Delete
              </button>
            </td>
          </tr>
        `;
      })
      .join("") ||
    `
      <tr>
        <td
          colspan="8"
          class="empty"
        >
          No generic ballot polls yet.
        </td>
      </tr>
    `;
}

function populateRaceSelects() {
  const options =
    '<option value="">Choose race</option>' +
    state.races
      .map(race => {
        const label =
          adminOfficeLabel(
            race.office
          );

        return `
          <option value="${race.id}">
            ${escapeHtml(
              race.title || ""
            )}
            —
            ${escapeHtml(label)}
          </option>
        `;
      })
      .join("");

  const candidateRace =
    $("#candidateRace");

  const pollRace =
    $("#pollRace");

  if (candidateRace) {
    const selectedValue =
      candidateRace.value;

    candidateRace.innerHTML =
      options;

    if (
      state.races.some(
        race =>
          race.id ===
          selectedValue
      )
    ) {
      candidateRace.value =
        selectedValue;
    }
  }

  if (pollRace) {
    const selectedValue =
      pollRace.value;

    pollRace.innerHTML =
      options;

    if (
      state.races.some(
        race =>
          race.id ===
          selectedValue
      )
    ) {
      pollRace.value =
        selectedValue;
    }
  }
}

function openModal(id) {
  const modal =
    $("#" + id);

  if (modal) {
    modal.classList.add(
      "open"
    );
  }
}

function closeModal(id) {
  const modal =
    $("#" + id);

  if (modal) {
    modal.classList.remove(
      "open"
    );
  }
}
function editRace(id = "") {
  const race =
    state.races.find(
      item =>
        item.id === id
    ) || {};

  $("#raceId").value =
    race.id || "";

  $("#raceOffice").value =
    race.office || "senate";

  $("#raceState").value =
    race.state || "";

  $("#raceTitle").value =
    race.title || "";

  $("#raceSlug").value =
    race.slug || "";

  $("#raceRating").value =
    race.rating || "Toss-up";

  $("#raceMargin").value =
    race.projected_margin ?? 0;

  $("#raceFeatured").checked =
    Boolean(
      race.featured
    );

  $("#raceStatus").value =
    race.status || "draft";

  $("#raceSummary").value =
    race.summary || "";

  openModal(
    "raceModal"
  );
}

async function saveRace(event) {
  event.preventDefault();

  const id =
    $("#raceId").value;

  const office =
    $("#raceOffice").value;

  const row = {
    office,

    state:
      $("#raceState")
        .value
        .trim()
        .toUpperCase(),

    title:
      $("#raceTitle")
        .value
        .trim(),

    slug:
      $("#raceSlug")
        .value
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          "-"
        ),

    rating:
      $("#raceRating").value,

    projected_margin:
      Number(
        $("#raceMargin")
          .value
      ),

    featured:
      $("#raceFeatured")
        .checked,

    status:
      $("#raceStatus")
        .value,

    summary:
      $("#raceSummary")
        .value
        .trim(),

    updated_at:
      new Date()
        .toISOString()
  };

  const query = id
    ? sb
        .from("races")
        .update(row)
        .eq("id", id)
    : sb
        .from("races")
        .insert(row);

  const { error } =
    await query;

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  closeModal(
    "raceModal"
  );

  await reloadAll();

  msg(
    `${adminOfficeLabel(
      office
    )} race saved.`
  );
}

async function deleteRace(id) {
  const confirmed =
    confirm(
      "Delete this race and all attached candidates and polls?"
    );

  if (!confirmed) {
    return;
  }

  const { error } =
    await sb
      .from("races")
      .delete()
      .eq("id", id);

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await reloadAll();

  msg(
    "Race deleted."
  );
}

function editCandidate(
  id = ""
) {
  const candidate =
    state.candidates.find(
      item =>
        item.id === id
    ) || {};

  $("#candidateId").value =
    candidate.id || "";

  $("#candidateRace").value =
    candidate.race_id || "";

  $("#candidateName").value =
    candidate.name || "";

  $("#candidateParty").value =
    candidate.party || "D";

  $("#candidateIncumbent").checked =
    Boolean(
      candidate.incumbent
    );

  $("#candidateProb").value =
    candidate
      .win_probability ?? 50;

  $("#candidateVote").value =
    candidate
      .expected_vote_share ?? 50;

  $("#candidatePhoto").value =
    candidate.photo_url || "";

  openModal(
    "candidateModal"
  );
}

async function saveCandidate(
  event
) {
  event.preventDefault();

  const id =
    $("#candidateId").value;

  const row = {
    race_id:
      $("#candidateRace")
        .value,

    name:
      $("#candidateName")
        .value
        .trim(),

    party:
      $("#candidateParty")
        .value,

    incumbent:
      $("#candidateIncumbent")
        .checked,

    win_probability:
      Number(
        $("#candidateProb")
          .value
      ),

    expected_vote_share:
      Number(
        $("#candidateVote")
          .value
      ),

    photo_url:
      $("#candidatePhoto")
        .value
        .trim() ||
      null
  };

  const query = id
    ? sb
        .from("candidates")
        .update(row)
        .eq("id", id)
    : sb
        .from("candidates")
        .insert(row);

  const { error } =
    await query;

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  closeModal(
    "candidateModal"
  );

  await reloadAll();

  msg(
    "Candidate saved."
  );
}

async function deleteCandidate(
  id
) {
  if (
    !confirm(
      "Delete this candidate?"
    )
  ) {
    return;
  }

  const { error } =
    await sb
      .from("candidates")
      .delete()
      .eq("id", id);

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await reloadAll();

  msg(
    "Candidate deleted."
  );
}
function editPoll(id = "") {
  const poll =
    state.polls.find(
      item =>
        item.id === id
    ) || {};

  $("#pollId").value =
    poll.id || "";

  $("#pollRace").value =
    poll.race_id || "";

  $("#pollster").value =
    poll.pollster || "";

  $("#pollStart").value =
    poll.start_date || "";

  $("#pollEnd").value =
    poll.end_date || "";

  $("#pollSample").value =
    poll.sample_size || 800;

  $("#pollPopulation").value =
    poll.population || "LV";

  $("#pollDem").value =
    poll.dem_pct ?? 48;

  $("#pollRep").value =
    poll.rep_pct ?? 48;

  $("#pollQuality").value =
    poll.quality_weight ?? 1;

  $("#pollStatus").value =
    poll.status || "draft";

  openModal(
    "pollModal"
  );
}

async function savePoll(event) {
  event.preventDefault();

  const id =
    $("#pollId").value;

  const row = {
    race_id:
      $("#pollRace")
        .value,

    pollster:
      $("#pollster")
        .value
        .trim(),

    start_date:
      $("#pollStart")
        .value,

    end_date:
      $("#pollEnd")
        .value,

    sample_size:
      Number(
        $("#pollSample")
          .value
      ),

    population:
      $("#pollPopulation")
        .value,

    dem_pct:
      Number(
        $("#pollDem")
          .value
      ),

    rep_pct:
      Number(
        $("#pollRep")
          .value
      ),

    quality_weight:
      Number(
        $("#pollQuality")
          .value
      ),

    status:
      $("#pollStatus")
        .value
  };

  const query = id
    ? sb
        .from("polls")
        .update(row)
        .eq("id", id)
    : sb
        .from("polls")
        .insert(row);

  const { error } =
    await query;

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  closeModal(
    "pollModal"
  );

  await reloadAll();

  msg(
    "Race poll saved."
  );
}

async function deletePoll(id) {
  if (
    !confirm(
      "Delete this race poll?"
    )
  ) {
    return;
  }

  const { error } =
    await sb
      .from("polls")
      .delete()
      .eq("id", id);

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await reloadAll();

  msg(
    "Race poll deleted."
  );
}

function editGenericBallotPoll(
  id = ""
) {
  const poll =
    state.genericBallotPolls.find(
      item =>
        item.id === id
    ) || {};

  $("#genericBallotId").value =
    poll.id || "";

  $("#genericBallotPollster").value =
    poll.pollster || "";

  $("#genericBallotPopulation").value =
    poll.population || "LV";

  $("#genericBallotStart").value =
    poll.start_date || "";

  $("#genericBallotEnd").value =
    poll.end_date || "";

  $("#genericBallotSample").value =
    poll.sample_size || 800;

  $("#genericBallotQuality").value =
    poll.quality_weight ?? 1;

  $("#genericBallotDem").value =
    poll.dem_pct ?? 48;

  $("#genericBallotRep").value =
    poll.rep_pct ?? 48;

  $("#genericBallotStatus").value =
    poll.status || "draft";

  openModal(
    "genericBallotModal"
  );
}

async function saveGenericBallotPoll(
  event
) {
  event.preventDefault();

  const id =
    $("#genericBallotId").value;

  const row = {
    pollster:
      $("#genericBallotPollster")
        .value
        .trim(),

    population:
      $("#genericBallotPopulation")
        .value,

    start_date:
      $("#genericBallotStart")
        .value,

    end_date:
      $("#genericBallotEnd")
        .value,

    sample_size:
      Number(
        $("#genericBallotSample")
          .value
      ),

    quality_weight:
      Number(
        $("#genericBallotQuality")
          .value
      ),

    dem_pct:
      Number(
        $("#genericBallotDem")
          .value
      ),

    rep_pct:
      Number(
        $("#genericBallotRep")
          .value
      ),

    status:
      $("#genericBallotStatus")
        .value,

    updated_at:
      new Date()
        .toISOString()
  };

  const query = id
    ? sb
        .from(
          "generic_ballot_polls"
        )
        .update(row)
        .eq("id", id)
    : sb
        .from(
          "generic_ballot_polls"
        )
        .insert(row);

  const { error } =
    await query;

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  closeModal(
    "genericBallotModal"
  );

  await reloadAll();

  msg(
    "Generic ballot poll saved."
  );
}

async function deleteGenericBallotPoll(
  id
) {
  if (
    !confirm(
      "Delete this generic ballot poll?"
    )
  ) {
    return;
  }

  const { error } =
    await sb
      .from(
        "generic_ballot_polls"
      )
      .delete()
      .eq("id", id);

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await reloadAll();

  msg(
    "Generic ballot poll deleted."
  );
}
document.addEventListener(
  "DOMContentLoaded",
  async () => {
    if (!$("#adminApp")) {
      return;
    }

    try {
      const allowed =
        await requireAdmin();

      if (!allowed) {
        return;
      }
    } catch (error) {
      console.error(
        "Admin authentication failed:",
        error
      );

      location.href =
        "login.html";

      return;
    }

    $$(
      ".sidebar button[data-panel]"
    ).forEach(button => {
      button.onclick = () => {
        $$(".sidebar button").forEach(
          item => {
            item.classList.remove(
              "active"
            );
          }
        );

        button.classList.add(
          "active"
        );

        $$(".adminPanel").forEach(
          panel => {
            panel.classList.remove(
              "active"
            );
          }
        );

        const targetPanel =
          $("#" + button.dataset.panel);

        if (targetPanel) {
          targetPanel.classList.add(
            "active"
          );
        }
      };
    });

    const logoutButton =
      $("#logout");

    if (logoutButton) {
      logoutButton.onclick =
        async () => {
          await sb.auth.signOut();

          location.href =
            "login.html";
        };
    }

    const raceForm =
      $("#raceForm");

    const candidateForm =
      $("#candidateForm");

    const pollForm =
      $("#pollForm");

    const homepageSettingsForm =
      $("#homepageSettingsForm");

    const genericBallotForm =
      $("#genericBallotForm");

    if (raceForm) {
      raceForm.onsubmit =
        saveRace;
    }

    if (candidateForm) {
      candidateForm.onsubmit =
        saveCandidate;
    }

    if (pollForm) {
      pollForm.onsubmit =
        savePoll;
    }

    if (homepageSettingsForm) {
      homepageSettingsForm.onsubmit =
        saveHomepageSettings;
    }

    if (genericBallotForm) {
      genericBallotForm.onsubmit =
        saveGenericBallotPoll;
    }

    try {
      await reloadAll();
    } catch (error) {
      console.error(
        "Admin data failed to load:",
        error
      );

      msg(
        error.message ||
          "Unable to load admin data.",
        "error"
      );
    }
  }
);

window.editRace =
  editRace;

window.deleteRace =
  deleteRace;

window.editCandidate =
  editCandidate;

window.deleteCandidate =
  deleteCandidate;

window.editPoll =
  editPoll;

window.deletePoll =
  deletePoll;

window.editGenericBallotPoll =
  editGenericBallotPoll;

window.deleteGenericBallotPoll =
  deleteGenericBallotPoll;

window.openModal =
  openModal;

window.closeModal =
  closeModal;
