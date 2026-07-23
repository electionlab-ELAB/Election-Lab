/* =========================================================
   ELECTIONLAB NEWSROOM
   ADMIN.JS — PART 1 OF 6
   ========================================================= */

const state = {
  races: [],
  polls: [],
  candidates: [],
  genericBallotPolls: [],
  forecastChanges: [],
  approvalPolls: [],
  primaryPolls: [],
  settings: {},
  session: null
};

let electionWorkbookPreviewRows = [];

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

  homepage_featured_title:
    "America's Closest Races",

  homepage_featured_subtitle:
    "The elections most likely to shape control of Congress and the governorships.",

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


/* =========================================================
   MESSAGES AND BASIC HELPERS
   ========================================================= */

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

  window.clearTimeout(
    notice._hideTimer
  );

  notice._hideTimer =
    window.setTimeout(
      () => {
        notice.style.display =
          "none";
      },
      5000
    );
}

function adminOfficeLabel(
  office
) {
  if (office === "governor") {
    return "Governor";
  }

  if (office === "house") {
    return "U.S. House";
  }

  return "U.S. Senate";
}

function numberOrNull(
  value
) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function integerOrNull(
  value
) {
  const number =
    numberOrNull(value);

  if (number === null) {
    return null;
  }

  return Math.round(number);
}

function cleanText(
  value
) {
  return String(
    value ?? ""
  ).trim();
}

function slugify(
  value
) {
  return cleanText(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function normalizeStatus(
  value
) {
  return cleanText(value)
    .toLowerCase() ===
    "published"
      ? "published"
      : "draft";
}

function normalizePopulation(
  value
) {
  const population =
    cleanText(value)
      .toUpperCase();

  if (
    [
      "LV",
      "RV",
      "V",
      "A"
    ].includes(population)
  ) {
    return population;
  }

  return "A";
}

function normalizePartyCode(
  value
) {
  const party =
    cleanText(value)
      .toUpperCase();

  if (
    [
      "D",
      "R",
      "I",
      "L",
      "G"
    ].includes(party)
  ) {
    return party;
  }

  if (
    party === "DEM" ||
    party === "DEMOCRATIC"
  ) {
    return "D";
  }

  if (
    party === "REP" ||
    party === "REPUBLICAN"
  ) {
    return "R";
  }

  if (
    party === "IND" ||
    party === "INDEPENDENT"
  ) {
    return "I";
  }

  if (
    party === "LIB" ||
    party === "LIBERTARIAN"
  ) {
    return "L";
  }

  if (
    party === "GREEN"
  ) {
    return "G";
  }

  return "I";
}

function formatAdminMargin(
  value
) {
  const margin =
    Number(value);

  if (
    !Number.isFinite(margin)
  ) {
    return "—";
  }

  if (
    Math.abs(margin) <
    0.05
  ) {
    return "Tied";
  }

  return `${
    margin > 0
      ? "D"
      : "R"
  } +${Math.abs(
    margin
  ).toFixed(1)}`;
}

function formatNetApproval(
  approve,
  disapprove
) {
  const net =
    Number(approve) -
    Number(disapprove);

  if (
    !Number.isFinite(net)
  ) {
    return "—";
  }

  if (
    Math.abs(net) <
    0.05
  ) {
    return "Even";
  }

  return `${
    net > 0
      ? "+"
      : ""
  }${net.toFixed(1)}`;
}

function raceById(
  raceId
) {
  return (
    state.races.find(
      race =>
        race.id ===
        raceId
    ) ||
    null
  );
}

function raceBySlug(
  slug
) {
  const normalizedSlug =
    slugify(slug);

  return (
    state.races.find(
      race =>
        slugify(
          race.slug
        ) ===
        normalizedSlug
    ) ||
    null
  );
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(
  modalId
) {
  const modal =
    document.getElementById(
      modalId
    );

  if (!modal) {
    return;
  }

  modal.classList.add(
    "open"
  );

  document.body.classList.add(
    "modalOpen"
  );

  const firstInput =
    modal.querySelector(
      "input:not([type='hidden']), select, textarea"
    );

  window.setTimeout(
    () => {
      firstInput?.focus();
    },
    20
  );
}

function closeModal(
  modalId
) {
  const modal =
    document.getElementById(
      modalId
    );

  if (modal) {
    modal.classList.remove(
      "open"
    );
  }

  if (
    !document.querySelector(
      ".modal.open"
    )
  ) {
    document.body.classList.remove(
      "modalOpen"
    );
  }
}

function initializeModalClosing() {
  $$(".modal").forEach(
    modal => {
      modal.addEventListener(
        "click",
        event => {
          if (
            event.target ===
            modal
          ) {
            closeModal(
              modal.id
            );
          }
        }
      );
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      const openModalElement =
        document.querySelector(
          ".modal.open"
        );

      if (openModalElement) {
        closeModal(
          openModalElement.id
        );
      }
    }
  );
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function requireAdmin() {
  if (
    !configured ||
    !sb
  ) {
    location.href =
      "login.html";

    return false;
  }

  const {
    data: {
      session
    },
    error: sessionError
  } =
    await sb.auth
      .getSession();

  if (
    sessionError ||
    !session
  ) {
    location.href =
      "login.html";

    return false;
  }

  const {
    data: adminRecord,
    error: adminError
  } =
    await sb
      .from("admins")
      .select("user_id")
      .eq(
        "user_id",
        session.user.id
      )
      .maybeSingle();

  if (
    adminError ||
    !adminRecord
  ) {
    await sb.auth
      .signOut();

    location.href =
      "login.html";

    return false;
  }

  state.session =
    session;

  const emailBox =
    $("#adminEmail");

  if (emailBox) {
    emailBox.textContent =
      session.user.email ||
      "";
  }

  return true;
}


/* =========================================================
   OPTIONAL TABLE HANDLING

   These helpers keep the admin from completely crashing if a
   newly added table has not yet been created in Supabase.
   ========================================================= */

function isMissingTableError(
  error
) {
  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  const code =
    String(
      error?.code ||
      ""
    );

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes(
      "does not exist"
    ) ||
    message.includes(
      "could not find the table"
    ) ||
    message.includes(
      "schema cache"
    )
  );
}

async function optionalTableQuery(
  queryPromise,
  tableName
) {
  try {
    const result =
      await queryPromise;

    if (result.error) {
      if (
        isMissingTableError(
          result.error
        )
      ) {
        console.warn(
          `${tableName} is not available yet.`,
          result.error.message
        );

        return {
          data: [],
          error: null,
          unavailable: true
        };
      }

      throw result.error;
    }

    return {
      data:
        result.data ||
        [],
      error: null,
      unavailable: false
    };

  } catch (error) {

    if (
      isMissingTableError(
        error
      )
    ) {
      console.warn(
        `${tableName} is not available yet.`,
        error.message
      );

      return {
        data: [],
        error: null,
        unavailable: true
      };
    }

    throw error;
  }
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettings() {
  const {
    data,
    error
  } =
    await sb
      .from(
        "site_settings"
      )
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

  const loadedSettings =
    (data || []).reduce(
      (
        settings,
        row
      ) => {
        settings[
          row.setting_key
        ] =
          row.setting_value;

        return settings;
      },
      {}
    );

  return {
    ...DEFAULT_SETTINGS,
    ...loadedSettings
  };
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
    "#homepageFeaturedTitle",
    "homepage_featured_title"
  );

  setInputValue(
    "#homepageFeaturedSubtitle",
    "homepage_featured_subtitle"
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


/* =========================================================
   LOAD ALL ADMIN DATA
   ========================================================= */

async function reloadAll() {
  const [
    raceResult,
    candidateResult,
    pollResult,
    genericBallotResult,
    forecastChangeResult,
    approvalResult,
    primaryResult,
    settingsResult
  ] =
    await Promise.all([
      sb
        .from("races")
        .select("*")
        .order(
          "state",
          {
            ascending: true
          }
        ),

      sb
        .from("candidates")
        .select("*")
        .order(
          "name",
          {
            ascending: true
          }
        ),

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

      optionalTableQuery(
        sb
          .from(
            "forecast_changes"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false
            }
          ),
        "forecast_changes"
      ),

      optionalTableQuery(
        sb
          .from(
            "approval_polls"
          )
          .select("*")
          .order(
            "end_date",
            {
              ascending: false
            }
          ),
        "approval_polls"
      ),

      optionalTableQuery(
        sb
          .from(
            "primary_polls"
          )
          .select("*")
          .order(
            "end_date",
            {
              ascending: false
            }
          ),
        "primary_polls"
      ),

      loadSettings()
    ]);

  const requiredError =
    raceResult.error ||
    candidateResult.error ||
    pollResult.error ||
    genericBallotResult.error;

  if (requiredError) {
    throw requiredError;
  }

  state.races =
    raceResult.data ||
    [];

  state.candidates =
    candidateResult.data ||
    [];

  state.polls =
    pollResult.data ||
    [];

  state.genericBallotPolls =
    genericBallotResult.data ||
    [];

  state.forecastChanges =
    forecastChangeResult.data ||
    [];

  state.approvalPolls =
    approvalResult.data ||
    [];

  state.primaryPolls =
    primaryResult.data ||
    [];

  state.settings =
    settingsResult ||
    {
      ...DEFAULT_SETTINGS
    };

  renderDashboard();

  renderWebsiteSettings();

  renderRaces();

  renderForecastHistory();

  renderCandidates();

  renderPolls();

  renderGenericBallotPolls();

  renderApprovalPolls();

  renderPrimaryPolls();

  populateRaceSelects();
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function setStat(
  selector,
  value
) {
  const element =
    $(selector);

  if (element) {
    element.textContent =
      String(value);
  }
}

function renderDashboard() {
  setStat(
    "#statRaces",
    state.races.length
  );

  setStat(
    "#statPublished",
    state.races.filter(
      race =>
        race.status ===
        "published"
    ).length
  );

  setStat(
    "#statCandidates",
    state.candidates.length
  );

  setStat(
    "#statPolls",
    state.polls.length
  );

  setStat(
    "#statForecastChanges",
    state.forecastChanges
      .length
  );

  setStat(
    "#statApprovalPolls",
    state.approvalPolls
      .length
  );

  setStat(
    "#statPrimaryPolls",
    state.primaryPolls
      .length
  );

  const raceOfDay =
    state.races.find(
      race =>
        Boolean(
          race.race_of_the_day
        )
    );

  setStat(
    "#statRaceOfDay",
    raceOfDay
      ? raceOfDay.state ||
        raceOfDay.title
      : "None"
  );
}
/* =========================================================
   WEBSITE SETTINGS SAVE
   ========================================================= */

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
    cleanText(
      input.value
    );

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
    Number(
      input.value
    );

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
          "National environment headline"
        ),

      homepage_featured_title:
        readRequiredText(
          "#homepageFeaturedTitle",
          "Featured-races title"
        ),

      homepage_featured_subtitle:
        readRequiredText(
          "#homepageFeaturedSubtitle",
          "Featured-races subtitle"
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

    if (
      values.senate_republican_seats +
      values.senate_tossup_seats +
      values.senate_democratic_seats !==
      100
    ) {
      throw new Error(
        "Senate totals must equal 100."
      );
    }

    if (
      values.house_republican_seats +
      values.house_tossup_seats +
      values.house_democratic_seats !==
      435
    ) {
      throw new Error(
        "House totals must equal 435."
      );
    }

    if (
      values.governor_republican_seats +
      values.governor_tossup_seats +
      values.governor_democratic_seats !==
      50
    ) {
      throw new Error(
        "Governor totals must equal 50."
      );
    }

    const rows =
      Object.entries(
        values
      ).map(
        (
          [
            settingKey,
            settingValue
          ]
        ) => ({
          setting_key:
            settingKey,

          setting_value:
            String(
              settingValue
            ),

          updated_at:
            new Date()
              .toISOString()
        })
      );

    const {
      error
    } =
      await sb
        .from(
          "site_settings"
        )
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
          (
            [
              key,
              value
            ]
          ) => [
            key,
            String(value)
          ]
        )
      )
    };

    msg(
      "Website settings saved."
    );

  } catch (error) {

    msg(
      error.message ||
      "Unable to save website settings.",
      "error"
    );
  }
}


/* =========================================================
   RACE RENDERING
   ========================================================= */

function renderRaces() {
  const body =
    $("#racesBody");

  if (!body) {
    return;
  }

  body.innerHTML =
    state.races
      .map(
        race => {
          const margin =
            Number(
              race.projected_margin ||
              0
            );

          return `
            <tr>

              <td>

                <b>
                  ${escapeHtml(
                    race.title ||
                    ""
                  )}
                </b>

                <br>

                <small>
                  ${escapeHtml(
                    race.slug ||
                    ""
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
                ${formatAdminMargin(
                  margin
                )}
              </td>

              <td>
                ${
                  race.featured
                    ? `
                      <span class="badge blue">
                        Yes
                      </span>
                    `
                    : "—"
                }
              </td>

              <td>
                ${
                  race.race_of_the_day
                    ? `
                      <span class="badge gold">
                        Selected
                      </span>
                    `
                    : "—"
                }
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
        }
      )
      .join("") ||
    `
      <tr>

        <td
          colspan="8"
          class="empty"
        >
          No races yet.
        </td>

      </tr>
    `;
}


/* =========================================================
   RACE SELECTS
   ========================================================= */

function populateRaceSelect(
  selector,
  selectedValue = ""
) {
  const select =
    $(selector);

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Select race
    </option>

    ${
      state.races
        .map(
          race => `
            <option
              value="${escapeHtml(
                race.id
              )}"
              ${
                race.id ===
                selectedValue
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(
                race.title ||
                race.slug ||
                "Untitled race"
              )}
            </option>
          `
        )
        .join("")
    }
  `;
}

function populateRaceSelects() {
  populateRaceSelect(
    "#candidateRace"
  );

  populateRaceSelect(
    "#pollRace"
  );

  populateRaceSelect(
    "#forecastChangeRace"
  );
}


/* =========================================================
   RACE MODAL
   ========================================================= */

function resetRaceForm() {
  const form =
    $("#raceForm");

  if (form) {
    form.reset();
  }

  $("#raceId").value =
    "";

  $("#raceOriginalRating").value =
    "";

  $("#raceOriginalMargin").value =
    "";

  $("#raceOffice").value =
    "senate";

  $("#raceRating").value =
    "Toss-up";

  $("#raceMargin").value =
    "0";

  $("#raceStatus").value =
    "draft";

  $("#raceFeatured").checked =
    false;

  $("#raceOfTheDay").checked =
    false;

  $("#raceChangeReason").value =
    "";

  $("#raceChangeNotes").value =
    "";

  $("#raceChangeStatus").value =
    "published";

  $("#raceCreateHistory").checked =
    true;
}

function editRace(
  raceId = null
) {
  resetRaceForm();

  const race =
    raceId
      ? state.races.find(
          item =>
            item.id ===
            raceId
        )
      : null;

  if (race) {
    $("#raceId").value =
      race.id ||
      "";

    $("#raceOriginalRating").value =
      race.rating ||
      "Toss-up";

    $("#raceOriginalMargin").value =
      Number(
        race.projected_margin ||
        0
      );

    $("#raceOffice").value =
      race.office ||
      "senate";

    $("#raceState").value =
      race.state ||
      "";

    $("#raceSlug").value =
      race.slug ||
      "";

    $("#raceRating").value =
      race.rating ||
      "Toss-up";

    $("#raceTitle").value =
      race.title ||
      "";

    $("#raceMargin").value =
      Number(
        race.projected_margin ||
        0
      );

    $("#raceStatus").value =
      race.status ||
      "draft";

    $("#raceFeatured").checked =
      Boolean(
        race.featured
      );

    $("#raceOfTheDay").checked =
      Boolean(
        race.race_of_the_day
      );

    $("#raceSummary").value =
      race.summary ||
      "";
  }

  openModal(
    "raceModal"
  );
}


/* =========================================================
   RACE VALIDATION
   ========================================================= */

function readRacePayload() {
  const office =
    readRequiredText(
      "#raceOffice",
      "Office"
    );

  const stateCode =
    readRequiredText(
      "#raceState",
      "State"
    )
      .toUpperCase()
      .slice(0, 2);

  const title =
    readRequiredText(
      "#raceTitle",
      "Race title"
    );

  const slug =
    slugify(
      readRequiredText(
        "#raceSlug",
        "Race slug"
      )
    );

  const rating =
    readRequiredText(
      "#raceRating",
      "Forecast rating"
    );

  const margin =
    Number(
      $("#raceMargin")
        .value
    );

  if (
    !Number.isFinite(
      margin
    )
  ) {
    throw new Error(
      "Projected margin must be a valid number."
    );
  }

  return {
    office,
    state:
      stateCode,

    title,
    slug,
    rating,

    projected_margin:
      margin,

    featured:
      Boolean(
        $("#raceFeatured")
          .checked
      ),

    race_of_the_day:
      Boolean(
        $("#raceOfTheDay")
          .checked
      ),

    status:
      normalizeStatus(
        $("#raceStatus")
          .value
      ),

    summary:
      cleanText(
        $("#raceSummary")
          .value
      ),

    updated_at:
      new Date()
        .toISOString()
  };
}


/* =========================================================
   RACE OF THE DAY UNIQUENESS
   ========================================================= */

async function clearOtherRaceOfDay(
  keepRaceId = null
) {
  const selectedRaces =
    state.races.filter(
      race =>
        race.race_of_the_day &&
        race.id !==
        keepRaceId
    );

  if (
    !selectedRaces.length
  ) {
    return;
  }

  const ids =
    selectedRaces.map(
      race =>
        race.id
    );

  const {
    error
  } =
    await sb
      .from("races")
      .update({
        race_of_the_day:
          false,

        updated_at:
          new Date()
            .toISOString()
      })
      .in(
        "id",
        ids
      );

  if (error) {
    throw error;
  }
}


/* =========================================================
   FORECAST CHANGE CREATION
   ========================================================= */

function raceForecastChanged(
  oldRating,
  newRating,
  oldMargin,
  newMargin
) {
  const ratingChanged =
    cleanText(
      oldRating
    ) !==
    cleanText(
      newRating
    );

  const marginChanged =
    Math.abs(
      Number(
        oldMargin ||
        0
      ) -
      Number(
        newMargin ||
        0
      )
    ) >=
    0.05;

  return (
    ratingChanged ||
    marginChanged
  );
}

async function createForecastHistoryEntry({
  raceId,
  oldRating,
  newRating,
  oldMargin,
  newMargin,
  reason,
  notes,
  status
}) {
  if (!raceId) {
    return;
  }

  const payload = {
    race_id:
      raceId,

    old_rating:
      cleanText(
        oldRating
      ) ||
      null,

    new_rating:
      cleanText(
        newRating
      ) ||
      "Toss-up",

    old_projected_margin:
      numberOrNull(
        oldMargin
      ),

    new_projected_margin:
      numberOrNull(
        newMargin
      ),

    reason:
      cleanText(
        reason
      ) ||
      null,

    notes:
      cleanText(
        notes
      ) ||
      null,

    status:
      normalizeStatus(
        status
      ),

    created_by:
      state.session
        ?.user
        ?.id ||
      null
  };

  const {
    error
  } =
    await sb
      .from(
        "forecast_changes"
      )
      .insert(
        payload
      );

  if (error) {
    throw error;
  }
}


/* =========================================================
   SAVE RACE
   ========================================================= */

async function saveRace(
  event
) {
  event.preventDefault();

  try {
    const raceId =
      cleanText(
        $("#raceId")
          .value
      );

    const payload =
      readRacePayload();

    const existingRace =
      raceId
        ? state.races.find(
            race =>
              race.id ===
              raceId
          )
        : null;

    const originalRating =
      existingRace
        ?.rating ??
      $("#raceOriginalRating")
        .value ??
      "";

    const originalMargin =
      existingRace
        ?.projected_margin ??
      $("#raceOriginalMargin")
        .value ??
      0;

    const duplicateSlug =
      state.races.find(
        race =>
          race.slug ===
            payload.slug &&
          race.id !==
            raceId
      );

    if (duplicateSlug) {
      throw new Error(
        `Another race already uses the slug "${payload.slug}".`
      );
    }

    if (
      payload.race_of_the_day
    ) {
      await clearOtherRaceOfDay(
        raceId ||
        null
      );
    }

    let savedRace;

    if (raceId) {
      const {
        data,
        error
      } =
        await sb
          .from("races")
          .update(
            payload
          )
          .eq(
            "id",
            raceId
          )
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      savedRace =
        data;

    } else {

      const {
        data,
        error
      } =
        await sb
          .from("races")
          .insert(
            payload
          )
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      savedRace =
        data;
    }

    const changed =
      existingRace &&
      raceForecastChanged(
        originalRating,
        payload.rating,
        originalMargin,
        payload.projected_margin
      );

    const shouldCreateHistory =
      Boolean(
        $("#raceCreateHistory")
          .checked
      );

    if (
      changed &&
      shouldCreateHistory
    ) {
      await createForecastHistoryEntry({
        raceId:
          savedRace.id,

        oldRating:
          originalRating,

        newRating:
          payload.rating,

        oldMargin:
          originalMargin,

        newMargin:
          payload.projected_margin,

        reason:
          $("#raceChangeReason")
            .value,

        notes:
          $("#raceChangeNotes")
            .value,

        status:
          $("#raceChangeStatus")
            .value
      });
    }

    closeModal(
      "raceModal"
    );

    await reloadAll();

    msg(
      changed &&
      shouldCreateHistory
        ? "Race saved and forecast history recorded."
        : "Race saved."
    );

  } catch (error) {

    console.error(
      "Race save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save race.",
      "error"
    );
  }
}


/* =========================================================
   DELETE RACE
   ========================================================= */

async function deleteRace(
  raceId
) {
  const race =
    state.races.find(
      item =>
        item.id ===
        raceId
    );

  if (!race) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${race.title}"?\n\nThis also deletes linked candidates, polls, and forecast history.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from("races")
        .delete()
        .eq(
          "id",
          raceId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Race deleted."
    );

  } catch (error) {

    console.error(
      "Race deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete race.",
      "error"
    );
  }
}


/* =========================================================
   FORECAST HISTORY RENDERING
   ========================================================= */

function renderForecastHistory() {
  const body =
    $("#forecastHistoryBody");

  const latest =
    state.forecastChanges[0] ||
    null;

  setElementText(
    "#forecastHistoryLatestRace",
    latest
      ? raceById(
          latest.race_id
        )?.title ||
        "Unknown race"
      : "—"
  );

  setElementText(
    "#forecastHistoryLatestRating",
    latest
      ?.new_rating ||
    "—"
  );

  setElementText(
    "#forecastHistoryLatestDate",
    latest
      ? fmtDate(
          latest.created_at
        )
      : "—"
  );

  if (!body) {
    return;
  }

  body.innerHTML =
    state.forecastChanges
      .map(
        change => {
          const race =
            raceById(
              change.race_id
            );

          return `
            <tr>

              <td>
                <b>
                  ${escapeHtml(
                    race?.title ||
                    "Unknown race"
                  )}
                </b>
              </td>

              <td>
                ${escapeHtml(
                  change.old_rating ||
                  "—"
                )}
              </td>

              <td>
                ${escapeHtml(
                  change.new_rating ||
                  "—"
                )}
              </td>

              <td>
                ${formatAdminMargin(
                  change.old_projected_margin
                )}
              </td>

              <td>
                ${formatAdminMargin(
                  change.new_projected_margin
                )}
              </td>

              <td>
                ${escapeHtml(
                  change.reason ||
                  "—"
                )}
              </td>

              <td>
                ${fmtDate(
                  change.created_at
                )}
              </td>

              <td>

                <span
                  class="badge ${
                    change.status ===
                    "published"
                      ? "green"
                      : "gold"
                  }"
                >
                  ${escapeHtml(
                    change.status ||
                    "draft"
                  )}
                </span>

              </td>

              <td>

                <button
                  class="btn light"
                  type="button"
                  onclick="editForecastChange('${change.id}')"
                >
                  Edit
                </button>

                <button
                  class="btn red"
                  type="button"
                  onclick="deleteForecastChange('${change.id}')"
                >
                  Delete
                </button>

              </td>

            </tr>
          `;
        }
      )
      .join("") ||
    `
      <tr>

        <td
          colspan="9"
          class="empty"
        >
          No forecast changes recorded yet.
        </td>

      </tr>
    `;
}
/* =========================================================
   FORECAST HISTORY EDITOR
   ========================================================= */

function resetForecastChangeForm() {
  const form =
    $("#forecastChangeForm");

  if (form) {
    form.reset();
  }

  $("#forecastChangeId").value =
    "";

  populateRaceSelect(
    "#forecastChangeRace"
  );

  $("#forecastChangeOldRating").value =
    "";

  $("#forecastChangeNewRating").value =
    "";

  $("#forecastChangeOldMargin").value =
    "";

  $("#forecastChangeNewMargin").value =
    "";

  $("#forecastChangeReason").value =
    "";

  $("#forecastChangeNotes").value =
    "";

  $("#forecastChangeStatus").value =
    "published";
}

function editForecastChange(
  changeId = null
) {
  resetForecastChangeForm();

  const change =
    changeId
      ? state.forecastChanges.find(
          item =>
            item.id ===
            changeId
        )
      : null;

  if (change) {
    $("#forecastChangeId").value =
      change.id ||
      "";

    populateRaceSelect(
      "#forecastChangeRace",
      change.race_id ||
      ""
    );

    $("#forecastChangeOldRating").value =
      change.old_rating ||
      "";

    $("#forecastChangeNewRating").value =
      change.new_rating ||
      "";

    $("#forecastChangeOldMargin").value =
      change.old_projected_margin ??
      "";

    $("#forecastChangeNewMargin").value =
      change.new_projected_margin ??
      "";

    $("#forecastChangeReason").value =
      change.reason ||
      "";

    $("#forecastChangeNotes").value =
      change.notes ||
      "";

    $("#forecastChangeStatus").value =
      change.status ||
      "published";
  }

  openModal(
    "forecastChangeModal"
  );
}

async function saveForecastChange(
  event
) {
  event.preventDefault();

  try {
    const changeId =
      cleanText(
        $("#forecastChangeId")
          .value
      );

    const raceId =
      readRequiredText(
        "#forecastChangeRace",
        "Race"
      );

    const newRating =
      readRequiredText(
        "#forecastChangeNewRating",
        "New rating"
      );

    const payload = {
      race_id:
        raceId,

      old_rating:
        cleanText(
          $("#forecastChangeOldRating")
            .value
        ) ||
        null,

      new_rating:
        newRating,

      old_projected_margin:
        numberOrNull(
          $("#forecastChangeOldMargin")
            .value
        ),

      new_projected_margin:
        numberOrNull(
          $("#forecastChangeNewMargin")
            .value
        ),

      reason:
        cleanText(
          $("#forecastChangeReason")
            .value
        ) ||
        null,

      notes:
        cleanText(
          $("#forecastChangeNotes")
            .value
        ) ||
        null,

      status:
        normalizeStatus(
          $("#forecastChangeStatus")
            .value
        ),

      updated_at:
        new Date()
          .toISOString()
    };

    if (changeId) {
      const {
        error
      } =
        await sb
          .from(
            "forecast_changes"
          )
          .update(
            payload
          )
          .eq(
            "id",
            changeId
          );

      if (error) {
        throw error;
      }
    } else {
      payload.created_by =
        state.session
          ?.user
          ?.id ||
        null;

      const {
        error
      } =
        await sb
          .from(
            "forecast_changes"
          )
          .insert(
            payload
          );

      if (error) {
        throw error;
      }
    }

    closeModal(
      "forecastChangeModal"
    );

    await reloadAll();

    msg(
      "Forecast change saved."
    );

  } catch (error) {

    console.error(
      "Forecast-change save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save forecast change.",
      "error"
    );
  }
}

async function deleteForecastChange(
  changeId
) {
  const change =
    state.forecastChanges.find(
      item =>
        item.id ===
        changeId
    );

  if (!change) {
    return;
  }

  const race =
    raceById(
      change.race_id
    );

  const confirmed =
    window.confirm(
      `Delete this forecast-history entry for "${race?.title || "this race"}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from(
          "forecast_changes"
        )
        .delete()
        .eq(
          "id",
          changeId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Forecast change deleted."
    );

  } catch (error) {

    console.error(
      "Forecast-change deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete forecast change.",
      "error"
    );
  }
}


/* =========================================================
   CANDIDATES
   ========================================================= */

function renderCandidates() {
  const body =
    $("#candidatesBody");

  if (!body) {
    return;
  }

  body.innerHTML =
    state.candidates
      .map(
        candidate => {
          const race =
            raceById(
              candidate.race_id
            );

          return `
            <tr>

              <td>

                <b>
                  ${escapeHtml(
                    candidate.name ||
                    ""
                  )}
                </b>

              </td>

              <td>
                ${escapeHtml(
                  race?.title ||
                  "—"
                )}
              </td>

              <td>

                <span
                  class="badge ${
                    candidate.party ===
                    "R"
                      ? "red"
                      : candidate.party ===
                        "D"
                      ? "blue"
                      : candidate.party ===
                        "I"
                      ? "green"
                      : "gold"
                  }"
                >
                  ${escapeHtml(
                    candidate.party ||
                    "I"
                  )}
                </span>

              </td>

              <td>
                ${
                  candidate.incumbent
                    ? "Yes"
                    : "No"
                }
              </td>

              <td>
                ${Number(
                  candidate.win_probability ||
                  0
                ).toFixed(1)}%
              </td>

              <td>
                ${Number(
                  candidate.expected_vote_share ||
                  0
                ).toFixed(1)}%
              </td>

              <td>
                ${
                  candidate.candidate_to_watch
                    ? `
                      <span class="badge gold">
                        Selected
                      </span>
                    `
                    : "—"
                }
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
        }
      )
      .join("") ||
    `
      <tr>

        <td
          colspan="8"
          class="empty"
        >
          No candidates yet.
        </td>

      </tr>
    `;
}

function resetCandidateForm() {
  const form =
    $("#candidateForm");

  if (form) {
    form.reset();
  }

  $("#candidateId").value =
    "";

  populateRaceSelect(
    "#candidateRace"
  );

  $("#candidateParty").value =
    "D";

  $("#candidateIncumbent").checked =
    false;

  $("#candidateWinProbability").value =
    "50";

  $("#candidateVoteShare").value =
    "50";

  $("#candidateToWatch").checked =
    false;

  $("#candidatePhotoUrl").value =
    "";
}

function editCandidate(
  candidateId = null
) {
  resetCandidateForm();

  const candidate =
    candidateId
      ? state.candidates.find(
          item =>
            item.id ===
            candidateId
        )
      : null;

  if (candidate) {
    $("#candidateId").value =
      candidate.id ||
      "";

    populateRaceSelect(
      "#candidateRace",
      candidate.race_id ||
      ""
    );

    $("#candidateName").value =
      candidate.name ||
      "";

    $("#candidateParty").value =
      normalizePartyCode(
        candidate.party
      );

    $("#candidateIncumbent").checked =
      Boolean(
        candidate.incumbent
      );

    $("#candidateWinProbability").value =
      Number(
        candidate.win_probability ||
        0
      );

    $("#candidateVoteShare").value =
      Number(
        candidate.expected_vote_share ||
        0
      );

    $("#candidateToWatch").checked =
      Boolean(
        candidate.candidate_to_watch
      );

    $("#candidatePhotoUrl").value =
      candidate.photo_url ||
      "";
  }

  openModal(
    "candidateModal"
  );
}

function readCandidatePayload() {
  const winProbability =
    Number(
      $("#candidateWinProbability")
        .value
    );

  const voteShare =
    Number(
      $("#candidateVoteShare")
        .value
    );

  if (
    !Number.isFinite(
      winProbability
    ) ||
    winProbability < 0 ||
    winProbability > 100
  ) {
    throw new Error(
      "Win probability must be between 0 and 100."
    );
  }

  if (
    !Number.isFinite(
      voteShare
    ) ||
    voteShare < 0 ||
    voteShare > 100
  ) {
    throw new Error(
      "Expected vote share must be between 0 and 100."
    );
  }

  return {
    race_id:
      readRequiredText(
        "#candidateRace",
        "Race"
      ),

    name:
      readRequiredText(
        "#candidateName",
        "Candidate name"
      ),

    party:
      normalizePartyCode(
        $("#candidateParty")
          .value
      ),

    incumbent:
      Boolean(
        $("#candidateIncumbent")
          .checked
      ),

    win_probability:
      winProbability,

    expected_vote_share:
      voteShare,

    candidate_to_watch:
      Boolean(
        $("#candidateToWatch")
          .checked
      ),

    photo_url:
      cleanText(
        $("#candidatePhotoUrl")
          .value
      ) ||
      null
  };
}

async function saveCandidate(
  event
) {
  event.preventDefault();

  try {
    const candidateId =
      cleanText(
        $("#candidateId")
          .value
      );

    const payload =
      readCandidatePayload();

    if (
      payload.candidate_to_watch
    ) {
      const otherCandidateIds =
        state.candidates
          .filter(
            candidate =>
              candidate.candidate_to_watch &&
              candidate.id !==
              candidateId
          )
          .map(
            candidate =>
              candidate.id
          );

      if (
        otherCandidateIds.length
      ) {
        const {
          error:
            clearError
        } =
          await sb
            .from(
              "candidates"
            )
            .update({
              candidate_to_watch:
                false
            })
            .in(
              "id",
              otherCandidateIds
            );

        if (
          clearError &&
          !isMissingColumnError(
            clearError
          )
        ) {
          throw clearError;
        }
      }
    }

    let result;

    if (candidateId) {
      result =
        await sb
          .from(
            "candidates"
          )
          .update(
            payload
          )
          .eq(
            "id",
            candidateId
          );
    } else {
      result =
        await sb
          .from(
            "candidates"
          )
          .insert(
            payload
          );
    }

    if (
      result.error &&
      isMissingColumnError(
        result.error
      )
    ) {
      const fallbackPayload = {
        ...payload
      };

      delete fallbackPayload
        .candidate_to_watch;

      if (candidateId) {
        result =
          await sb
            .from(
              "candidates"
            )
            .update(
              fallbackPayload
            )
            .eq(
              "id",
              candidateId
            );
      } else {
        result =
          await sb
            .from(
              "candidates"
            )
            .insert(
              fallbackPayload
            );
      }
    }

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "candidateModal"
    );

    await reloadAll();

    msg(
      "Candidate saved."
    );

  } catch (error) {

    console.error(
      "Candidate save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save candidate.",
      "error"
    );
  }
}

async function deleteCandidate(
  candidateId
) {
  const candidate =
    state.candidates.find(
      item =>
        item.id ===
        candidateId
    );

  if (!candidate) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete candidate "${candidate.name}"?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from(
          "candidates"
        )
        .delete()
        .eq(
          "id",
          candidateId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Candidate deleted."
    );

  } catch (error) {

    console.error(
      "Candidate deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete candidate.",
      "error"
    );
  }
}


/* =========================================================
   MISSING COLUMN DETECTION
   ========================================================= */

function isMissingColumnError(
  error
) {
  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  const code =
    String(
      error?.code ||
      ""
    );

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes(
      "column"
    ) &&
    (
      message.includes(
        "does not exist"
      ) ||
      message.includes(
        "could not find"
      )
    )
  );
}


/* =========================================================
   RACE POLLS
   ========================================================= */

function renderPolls() {
  const body =
    $("#pollsBody");

  if (!body) {
    return;
  }

  body.innerHTML =
    state.polls
      .map(
        poll => {
          const race =
            raceById(
              poll.race_id
            );

          const independent =
            numberOrNull(
              poll.ind_pct ??
              poll.independent_pct ??
              poll.other_pct
            );

          return `
            <tr>

              <td>

                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    ""
                  )}
                </b>

              </td>

              <td>
                ${escapeHtml(
                  race?.title ||
                  "—"
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
                  poll.population ||
                  ""
                )}
              </td>

              <td class="pollCellDem">
                ${Number(
                  poll.dem_pct ||
                  0
                ).toFixed(1)}%
              </td>

              <td class="pollCellRep">
                ${Number(
                  poll.rep_pct ||
                  0
                ).toFixed(1)}%
              </td>

              <td class="pollCellInd">
                ${
                  independent ===
                  null
                    ? "—"
                    : `${independent.toFixed(
                        1
                      )}%`
                }
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
        }
      )
      .join("") ||
    `
      <tr>

        <td
          colspan="9"
          class="empty"
        >
          No race polls yet.
        </td>

      </tr>
    `;
}

function resetPollForm() {
  const form =
    $("#pollForm");

  if (form) {
    form.reset();
  }

  $("#pollId").value =
    "";

  populateRaceSelect(
    "#pollRace"
  );

  $("#pollPopulation").value =
    "LV";

  $("#pollIndPct").value =
    "";

  $("#pollLibPct").value =
    "";

  $("#pollGreenPct").value =
    "";

  $("#pollQualityWeight").value =
    "1";

  $("#pollStatus").value =
    "draft";
}

function editPoll(
  pollId = null
) {
  resetPollForm();

  const poll =
    pollId
      ? state.polls.find(
          item =>
            item.id ===
            pollId
        )
      : null;

  if (poll) {
    $("#pollId").value =
      poll.id ||
      "";

    populateRaceSelect(
      "#pollRace",
      poll.race_id ||
      ""
    );

    $("#pollPollster").value =
      poll.pollster ||
      "";

    $("#pollStartDate").value =
      poll.start_date ||
      "";

    $("#pollEndDate").value =
      poll.end_date ||
      "";

    $("#pollSampleSize").value =
      poll.sample_size ??
      "";

    $("#pollPopulation").value =
      normalizePopulation(
        poll.population
      );

    $("#pollDemPct").value =
      poll.dem_pct ??
      "";

    $("#pollRepPct").value =
      poll.rep_pct ??
      "";

    $("#pollIndPct").value =
      poll.ind_pct ??
      poll.independent_pct ??
      poll.other_pct ??
      "";

    $("#pollLibPct").value =
      poll.lib_pct ??
      poll.libertarian_pct ??
      "";

    $("#pollGreenPct").value =
      poll.green_pct ??
      "";

    $("#pollQualityWeight").value =
      poll.quality_weight ??
      1;

    $("#pollStatus").value =
      poll.status ||
      "draft";
  }

  openModal(
    "pollModal"
  );
}

function readPollPayload() {
  const startDate =
    readRequiredText(
      "#pollStartDate",
      "Start date"
    );

  const endDate =
    readRequiredText(
      "#pollEndDate",
      "End date"
    );

  if (
    endDate <
    startDate
  ) {
    throw new Error(
      "The poll end date cannot be before the start date."
    );
  }

  const demPct =
    Number(
      $("#pollDemPct")
        .value
    );

  const repPct =
    Number(
      $("#pollRepPct")
        .value
    );

  if (
    !Number.isFinite(
      demPct
    ) ||
    !Number.isFinite(
      repPct
    ) ||
    demPct < 0 ||
    repPct < 0 ||
    demPct > 100 ||
    repPct > 100
  ) {
    throw new Error(
      "Democratic and Republican percentages must be between 0 and 100."
    );
  }

  const indPct =
    numberOrNull(
      $("#pollIndPct")
        .value
    );

  const libPct =
    numberOrNull(
      $("#pollLibPct")
        .value
    );

  const greenPct =
    numberOrNull(
      $("#pollGreenPct")
        .value
    );

  const knownTotal =
    demPct +
    repPct +
    (
      indPct || 0
    ) +
    (
      libPct || 0
    ) +
    (
      greenPct || 0
    );

  if (
    knownTotal >
    100.5
  ) {
    throw new Error(
      `The listed candidate percentages total ${knownTotal.toFixed(1)}%, which is above 100%.`
    );
  }

  return {
    race_id:
      readRequiredText(
        "#pollRace",
        "Race"
      ),

    pollster:
      readRequiredText(
        "#pollPollster",
        "Pollster"
      ),

    start_date:
      startDate,

    end_date:
      endDate,

    sample_size:
      integerOrNull(
        $("#pollSampleSize")
          .value
      ),

    population:
      normalizePopulation(
        $("#pollPopulation")
          .value
      ),

    dem_pct:
      demPct,

    rep_pct:
      repPct,

    ind_pct:
      indPct,

    lib_pct:
      libPct,

    green_pct:
      greenPct,

    quality_weight:
      numberOrNull(
        $("#pollQualityWeight")
          .value
      ) ||
      1,

    status:
      normalizeStatus(
        $("#pollStatus")
          .value
      ),

    updated_at:
      new Date()
        .toISOString()
  };
}

async function savePoll(
  event
) {
  event.preventDefault();

  try {
    const pollId =
      cleanText(
        $("#pollId")
          .value
      );

    const payload =
      readPollPayload();

    let result;

    if (pollId) {
      result =
        await sb
          .from(
            "polls"
          )
          .update(
            payload
          )
          .eq(
            "id",
            pollId
          );
    } else {
      result =
        await sb
          .from(
            "polls"
          )
          .insert(
            payload
          );
    }

    if (
      result.error &&
      isMissingColumnError(
        result.error
      )
    ) {
      const fallbackPayload = {
        ...payload
      };

      delete fallbackPayload
        .ind_pct;

      delete fallbackPayload
        .lib_pct;

      delete fallbackPayload
        .green_pct;

      if (pollId) {
        result =
          await sb
            .from(
              "polls"
            )
            .update(
              fallbackPayload
            )
            .eq(
              "id",
              pollId
            );
      } else {
        result =
          await sb
            .from(
              "polls"
            )
            .insert(
              fallbackPayload
            );
      }
    }

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "pollModal"
    );

    await reloadAll();

    msg(
      "Race poll saved."
    );

  } catch (error) {

    console.error(
      "Race-poll save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save race poll.",
      "error"
    );
  }
}

async function deletePoll(
  pollId
) {
  const poll =
    state.polls.find(
      item =>
        item.id ===
        pollId
    );

  if (!poll) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete the ${poll.pollster || "selected"} poll?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from(
          "polls"
        )
        .delete()
        .eq(
          "id",
          pollId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Race poll deleted."
    );

  } catch (error) {

    console.error(
      "Race-poll deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete race poll.",
      "error"
    );
  }
}
/* =========================================================
   GENERIC BALLOT
   ========================================================= */

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

  published.forEach(
    poll => {
      const weight =
        Math.sqrt(
          Math.max(
            100,
            Number(
              poll.sample_size ||
              500
            )
          ) / 500
        ) *
        Math.max(
          0.25,
          Number(
            poll.quality_weight ||
            1
          )
        ) *
        (
          poll.population ===
          "LV"
            ? 1.12
            : poll.population ===
              "RV"
            ? 1
            : poll.population ===
              "V"
            ? 0.94
            : 0.86
        );

      demTotal +=
        Number(
          poll.dem_pct ||
          0
        ) * weight;

      repTotal +=
        Number(
          poll.rep_pct ||
          0
        ) * weight;

      totalWeight +=
        weight;
    }
  );

  if (!totalWeight) {
    return null;
  }

  const dem =
    demTotal /
    totalWeight;

  const rep =
    repTotal /
    totalWeight;

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

  const average =
    genericBallotAverage(
      state.genericBallotPolls
    );

  setElementText(
    "#genericAverageDem",
    average
      ? `${average.dem.toFixed(
          1
        )}%`
      : "—%"
  );

  setElementText(
    "#genericAverageRep",
    average
      ? `${average.rep.toFixed(
          1
        )}%`
      : "—%"
  );

  setElementText(
    "#genericAverageMargin",
    average
      ? `${formatAdminMargin(
          average.margin
        )} generic-ballot average`
      : "Add published polls to calculate an average."
  );

  if (!body) {
    return;
  }

  body.innerHTML =
    state.genericBallotPolls
      .map(
        poll => {
          const margin =
            Number(
              poll.dem_pct ||
              0
            ) -
            Number(
              poll.rep_pct ||
              0
            );

          return `
            <tr>

              <td>
                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    ""
                  )}
                </b>
              </td>

              <td>
                ${fmtDateRange(
                  poll.start_date,
                  poll.end_date
                )}
              </td>

              <td>
                ${
                  poll.sample_size ||
                  "—"
                }

                ${escapeHtml(
                  poll.population ||
                  ""
                )}
              </td>

              <td class="pollCellDem">
                ${Number(
                  poll.dem_pct ||
                  0
                ).toFixed(1)}%
              </td>

              <td class="pollCellRep">
                ${Number(
                  poll.rep_pct ||
                  0
                ).toFixed(1)}%
              </td>

              <td>
                ${formatAdminMargin(
                  margin
                )}
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
        }
      )
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

function resetGenericBallotForm() {
  const form =
    $("#genericBallotForm");

  if (form) {
    form.reset();
  }

  $("#genericBallotId").value =
    "";

  $("#genericBallotPopulation").value =
    "LV";

  $("#genericBallotQualityWeight").value =
    "1";

  $("#genericBallotStatus").value =
    "draft";
}

function editGenericBallotPoll(
  pollId = null
) {
  resetGenericBallotForm();

  const poll =
    pollId
      ? state.genericBallotPolls.find(
          item =>
            item.id ===
            pollId
        )
      : null;

  if (poll) {
    $("#genericBallotId").value =
      poll.id ||
      "";

    $("#genericBallotPollster").value =
      poll.pollster ||
      "";

    $("#genericBallotStartDate").value =
      poll.start_date ||
      "";

    $("#genericBallotEndDate").value =
      poll.end_date ||
      "";

    $("#genericBallotSampleSize").value =
      poll.sample_size ??
      "";

    $("#genericBallotPopulation").value =
      normalizePopulation(
        poll.population
      );

    $("#genericBallotDemPct").value =
      poll.dem_pct ??
      "";

    $("#genericBallotRepPct").value =
      poll.rep_pct ??
      "";

    $("#genericBallotQualityWeight").value =
      poll.quality_weight ??
      1;

    $("#genericBallotStatus").value =
      poll.status ||
      "draft";
  }

  openModal(
    "genericBallotModal"
  );
}

function readGenericBallotPayload() {
  const startDate =
    readRequiredText(
      "#genericBallotStartDate",
      "Start date"
    );

  const endDate =
    readRequiredText(
      "#genericBallotEndDate",
      "End date"
    );

  if (
    endDate <
    startDate
  ) {
    throw new Error(
      "The poll end date cannot be before the start date."
    );
  }

  const demPct =
    Number(
      $("#genericBallotDemPct")
        .value
    );

  const repPct =
    Number(
      $("#genericBallotRepPct")
        .value
    );

  if (
    !Number.isFinite(
      demPct
    ) ||
    !Number.isFinite(
      repPct
    ) ||
    demPct < 0 ||
    demPct > 100 ||
    repPct < 0 ||
    repPct > 100
  ) {
    throw new Error(
      "Democratic and Republican percentages must be between 0 and 100."
    );
  }

  return {
    pollster:
      readRequiredText(
        "#genericBallotPollster",
        "Pollster"
      ),

    start_date:
      startDate,

    end_date:
      endDate,

    sample_size:
      integerOrNull(
        $("#genericBallotSampleSize")
          .value
      ),

    population:
      normalizePopulation(
        $("#genericBallotPopulation")
          .value
      ),

    dem_pct:
      demPct,

    rep_pct:
      repPct,

    quality_weight:
      numberOrNull(
        $("#genericBallotQualityWeight")
          .value
      ) ||
      1,

    status:
      normalizeStatus(
        $("#genericBallotStatus")
          .value
      ),

    updated_at:
      new Date()
        .toISOString()
  };
}

async function saveGenericBallotPoll(
  event
) {
  event.preventDefault();

  try {
    const pollId =
      cleanText(
        $("#genericBallotId")
          .value
      );

    const payload =
      readGenericBallotPayload();

    const result =
      pollId
        ? await sb
            .from(
              "generic_ballot_polls"
            )
            .update(
              payload
            )
            .eq(
              "id",
              pollId
            )
        : await sb
            .from(
              "generic_ballot_polls"
            )
            .insert(
              payload
            );

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "genericBallotModal"
    );

    await reloadAll();

    msg(
      "Generic ballot poll saved."
    );

  } catch (error) {

    console.error(
      "Generic ballot save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save generic ballot poll.",
      "error"
    );
  }
}

async function deleteGenericBallotPoll(
  pollId
) {
  const poll =
    state.genericBallotPolls.find(
      item =>
        item.id ===
        pollId
    );

  if (!poll) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete the ${poll.pollster || "selected"} generic-ballot poll?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from(
          "generic_ballot_polls"
        )
        .delete()
        .eq(
          "id",
          pollId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Generic ballot poll deleted."
    );

  } catch (error) {

    console.error(
      "Generic-ballot deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete generic ballot poll.",
      "error"
    );
  }
}


/* =========================================================
   TRUMP APPROVAL
   ========================================================= */

function approvalAverage(
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

  let approveTotal = 0;
  let disapproveTotal = 0;
  let totalWeight = 0;

  published.forEach(
    poll => {
      const weight =
        Math.sqrt(
          Math.max(
            100,
            Number(
              poll.sample_size ||
              500
            )
          ) / 500
        ) *
        Math.max(
          0.25,
          Number(
            poll.quality_weight ||
            1
          )
        ) *
        (
          poll.population ===
          "LV"
            ? 1.12
            : poll.population ===
              "RV"
            ? 1
            : poll.population ===
              "V"
            ? 0.94
            : 0.86
        );

      approveTotal +=
        Number(
          poll.approve_pct ||
          0
        ) * weight;

      disapproveTotal +=
        Number(
          poll.disapprove_pct ||
          0
        ) * weight;

      totalWeight +=
        weight;
    }
  );

  if (!totalWeight) {
    return null;
  }

  const approve =
    approveTotal /
    totalWeight;

  const disapprove =
    disapproveTotal /
    totalWeight;

  return {
    approve,
    disapprove,
    net:
      approve -
      disapprove
  };
}

function renderApprovalPolls() {
  const body =
    $("#approvalPollsBody");

  const average =
    approvalAverage(
      state.approvalPolls
    );

  setElementText(
    "#approvalAverageApprove",
    average
      ? `${average.approve.toFixed(
          1
        )}%`
      : "—%"
  );

  setElementText(
    "#approvalAverageDisapprove",
    average
      ? `${average.disapprove.toFixed(
          1
        )}%`
      : "—%"
  );

  setElementText(
    "#approvalAverageNet",
    average
      ? formatNetApproval(
          average.approve,
          average.disapprove
        )
      : "—"
  );

  if (!body) {
    return;
  }

  body.innerHTML =
    state.approvalPolls
      .map(
        poll => {
          const net =
            Number(
              poll.approve_pct ||
              0
            ) -
            Number(
              poll.disapprove_pct ||
              0
            );

          return `
            <tr>

              <td>
                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    ""
                  )}
                </b>
              </td>

              <td>
                ${fmtDateRange(
                  poll.start_date,
                  poll.end_date
                )}
              </td>

              <td>
                ${
                  poll.sample_size ||
                  "—"
                }
              </td>

              <td>
                ${escapeHtml(
                  poll.population ||
                  ""
                )}
              </td>

              <td class="pollCellDem">
                ${Number(
                  poll.approve_pct ||
                  0
                ).toFixed(1)}%
              </td>

              <td class="pollCellRep">
                ${Number(
                  poll.disapprove_pct ||
                  0
                ).toFixed(1)}%
              </td>

              <td>
                ${
                  net > 0
                    ? "+"
                    : ""
                }${net.toFixed(1)}
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
                  onclick="editApprovalPoll('${poll.id}')"
                >
                  Edit
                </button>

                <button
                  class="btn red"
                  type="button"
                  onclick="deleteApprovalPoll('${poll.id}')"
                >
                  Delete
                </button>

              </td>

            </tr>
          `;
        }
      )
      .join("") ||
    `
      <tr>
        <td
          colspan="9"
          class="empty"
        >
          No approval polls yet.
        </td>
      </tr>
    `;
}

function resetApprovalPollForm() {
  const form =
    $("#approvalPollForm");

  if (form) {
    form.reset();
  }

  $("#approvalPollId").value =
    "";

  $("#approvalPollPopulation").value =
    "A";

  $("#approvalPollQualityWeight").value =
    "1";

  $("#approvalPollStatus").value =
    "draft";
}

function editApprovalPoll(
  pollId = null
) {
  resetApprovalPollForm();

  const poll =
    pollId
      ? state.approvalPolls.find(
          item =>
            item.id ===
            pollId
        )
      : null;

  if (poll) {
    $("#approvalPollId").value =
      poll.id ||
      "";

    $("#approvalPollPollster").value =
      poll.pollster ||
      "";

    $("#approvalPollStartDate").value =
      poll.start_date ||
      "";

    $("#approvalPollEndDate").value =
      poll.end_date ||
      "";

    $("#approvalPollSampleSize").value =
      poll.sample_size ??
      "";

    $("#approvalPollPopulation").value =
      normalizePopulation(
        poll.population
      );

    $("#approvalPollApprovePct").value =
      poll.approve_pct ??
      "";

    $("#approvalPollDisapprovePct").value =
      poll.disapprove_pct ??
      "";

    $("#approvalPollQualityWeight").value =
      poll.quality_weight ??
      1;

    $("#approvalPollStatus").value =
      poll.status ||
      "draft";
  }

  openModal(
    "approvalPollModal"
  );
}

function readApprovalPollPayload() {
  const startDate =
    readRequiredText(
      "#approvalPollStartDate",
      "Start date"
    );

  const endDate =
    readRequiredText(
      "#approvalPollEndDate",
      "End date"
    );

  if (
    endDate <
    startDate
  ) {
    throw new Error(
      "The poll end date cannot be before the start date."
    );
  }

  const approvePct =
    Number(
      $("#approvalPollApprovePct")
        .value
    );

  const disapprovePct =
    Number(
      $("#approvalPollDisapprovePct")
        .value
    );

  if (
    !Number.isFinite(
      approvePct
    ) ||
    !Number.isFinite(
      disapprovePct
    ) ||
    approvePct < 0 ||
    approvePct > 100 ||
    disapprovePct < 0 ||
    disapprovePct > 100
  ) {
    throw new Error(
      "Approval and disapproval percentages must be between 0 and 100."
    );
  }

  return {
    pollster:
      readRequiredText(
        "#approvalPollPollster",
        "Pollster"
      ),

    start_date:
      startDate,

    end_date:
      endDate,

    sample_size:
      integerOrNull(
        $("#approvalPollSampleSize")
          .value
      ),

    population:
      normalizePopulation(
        $("#approvalPollPopulation")
          .value
      ),

    approve_pct:
      approvePct,

    disapprove_pct:
      disapprovePct,

    quality_weight:
      numberOrNull(
        $("#approvalPollQualityWeight")
          .value
      ) ||
      1,

    status:
      normalizeStatus(
        $("#approvalPollStatus")
          .value
      ),

    updated_at:
      new Date()
        .toISOString()
  };
}

async function saveApprovalPoll(
  event
) {
  event.preventDefault();

  try {
    const pollId =
      cleanText(
        $("#approvalPollId")
          .value
      );

    const payload =
      readApprovalPollPayload();

    const result =
      pollId
        ? await sb
            .from(
              "approval_polls"
            )
            .update(
              payload
            )
            .eq(
              "id",
              pollId
            )
        : await sb
            .from(
              "approval_polls"
            )
            .insert(
              payload
            );

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "approvalPollModal"
    );

    await reloadAll();

    msg(
      "Approval poll saved."
    );

  } catch (error) {

    console.error(
      "Approval-poll save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save approval poll.",
      "error"
    );
  }
}

async function deleteApprovalPoll(
  pollId
) {
  const poll =
    state.approvalPolls.find(
      item =>
        item.id ===
        pollId
    );

  if (!poll) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete the ${poll.pollster || "selected"} approval poll?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from(
          "approval_polls"
        )
        .delete()
        .eq(
          "id",
          pollId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Approval poll deleted."
    );

  } catch (error) {

    console.error(
      "Approval-poll deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete approval poll.",
      "error"
    );
  }
}
/* =========================================================
   2028 PRIMARY POLLS
   ========================================================= */

function normalizePrimaryParty(
  value
) {
  const party =
    cleanText(
      value
    ).toUpperCase();

  return party === "R"
    ? "R"
    : "D";
}

function parsePrimaryCandidateLines(
  value
) {
  const lines =
    cleanText(
      value
    )
      .split(/\r?\n/)
      .map(line =>
        line.trim()
      )
      .filter(Boolean);

  if (!lines.length) {
    throw new Error(
      "Add at least one candidate result."
    );
  }

  const results = [];

  for (
    const line of lines
  ) {
    const separatorIndex =
      line.lastIndexOf("|");

    if (
      separatorIndex === -1
    ) {
      throw new Error(
        `Primary result "${line}" must use Candidate name|percentage.`
      );
    }

    const candidateName =
      cleanText(
        line.slice(
          0,
          separatorIndex
        )
      );

    const percentageText =
      cleanText(
        line.slice(
          separatorIndex + 1
        )
      )
        .replace(
          "%",
          ""
        );

    const percentage =
      Number(
        percentageText
      );

    if (!candidateName) {
      throw new Error(
        "Every primary result must include a candidate name."
      );
    }

    if (
      !Number.isFinite(
        percentage
      ) ||
      percentage < 0 ||
      percentage > 100
    ) {
      throw new Error(
        `${candidateName}'s percentage must be between 0 and 100.`
      );
    }

    const duplicate =
      results.find(
        result =>
          result.candidate_name
            .toLowerCase() ===
          candidateName
            .toLowerCase()
      );

    if (duplicate) {
      throw new Error(
        `${candidateName} appears more than once in this poll.`
      );
    }

    results.push({
      candidate_name:
        candidateName,

      percentage
    });
  }

  const total =
    results.reduce(
      (
        sum,
        result
      ) =>
        sum +
        Number(
          result.percentage ||
          0
        ),
      0
    );

  if (total > 100.5) {
    throw new Error(
      `Primary candidate percentages total ${total.toFixed(
        1
      )}%, which is above 100%.`
    );
  }

  return results;
}

function normalizePrimaryResults(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        result => ({
          candidate_name:
            cleanText(
              result.candidate_name ??
              result.name ??
              result.candidate
            ),

          percentage:
            Number(
              result.percentage ??
              result.pct ??
              result.value
            )
        })
      )
      .filter(
        result =>
          result.candidate_name &&
          Number.isFinite(
            result.percentage
          )
      );
  }

  if (
    value &&
    typeof value ===
    "object"
  ) {
    return Object.entries(
      value
    )
      .map(
        (
          [
            candidateName,
            percentage
          ]
        ) => ({
          candidate_name:
            cleanText(
              candidateName
            ),

          percentage:
            Number(
              percentage
            )
        })
      )
      .filter(
        result =>
          result.candidate_name &&
          Number.isFinite(
            result.percentage
          )
      );
  }

  if (
    typeof value ===
    "string" &&
    value.trim()
  ) {
    try {
      const parsed =
        JSON.parse(value);

      return normalizePrimaryResults(
        parsed
      );
    } catch {
      try {
        return parsePrimaryCandidateLines(
          value
        );
      } catch {
        return [];
      }
    }
  }

  return [];
}

function primaryResultsToTextarea(
  results
) {
  return normalizePrimaryResults(
    results
  )
    .map(
      result =>
        `${result.candidate_name}|${Number(
          result.percentage
        ).toFixed(1)}`
    )
    .join("\n");
}

function primaryResultsSummary(
  results,
  maximum = 4
) {
  const normalized =
    normalizePrimaryResults(
      results
    )
      .sort(
        (
          first,
          second
        ) =>
          Number(
            second.percentage
          ) -
          Number(
            first.percentage
          )
      );

  if (!normalized.length) {
    return "—";
  }

  const shown =
    normalized
      .slice(
        0,
        maximum
      )
      .map(
        result =>
          `${result.candidate_name} ${Number(
            result.percentage
          ).toFixed(1)}%`
      );

  if (
    normalized.length >
    maximum
  ) {
    shown.push(
      `+${normalized.length - maximum} more`
    );
  }

  return shown.join(
    " · "
  );
}

function renderPrimaryPolls() {
  const body =
    $("#primaryPollsBody");

  const democraticCount =
    state.primaryPolls.filter(
      poll =>
        normalizePrimaryParty(
          poll.primary_party ??
          poll.party
        ) === "D"
    ).length;

  const republicanCount =
    state.primaryPolls.filter(
      poll =>
        normalizePrimaryParty(
          poll.primary_party ??
          poll.party
        ) === "R"
    ).length;

  setElementText(
    "#primaryDemocraticPollCount",
    String(
      democraticCount
    )
  );

  setElementText(
    "#primaryRepublicanPollCount",
    String(
      republicanCount
    )
  );

  if (!body) {
    return;
  }

  body.innerHTML =
    state.primaryPolls
      .map(
        poll => {
          const party =
            normalizePrimaryParty(
              poll.primary_party ??
              poll.party
            );

          const results =
            poll.candidate_results ??
            poll.results ??
            poll.candidates ??
            [];

          return `
            <tr>

              <td>
                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    ""
                  )}
                </b>
              </td>

              <td>
                <span
                  class="badge ${
                    party === "R"
                      ? "red"
                      : "blue"
                  }"
                >
                  ${
                    party === "R"
                      ? "Republican"
                      : "Democratic"
                  }
                </span>
              </td>

              <td>
                ${fmtDateRange(
                  poll.start_date,
                  poll.end_date
                )}
              </td>

              <td>
                ${
                  poll.sample_size ||
                  "—"
                }
              </td>

              <td>
                ${escapeHtml(
                  poll.population ||
                  ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  primaryResultsSummary(
                    results
                  )
                )}
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
                  onclick="editPrimaryPoll('${poll.id}')"
                >
                  Edit
                </button>

                <button
                  class="btn red"
                  type="button"
                  onclick="deletePrimaryPoll('${poll.id}')"
                >
                  Delete
                </button>

              </td>

            </tr>
          `;
        }
      )
      .join("") ||
    `
      <tr>

        <td
          colspan="8"
          class="empty"
        >
          No primary polls yet.
        </td>

      </tr>
    `;
}

function resetPrimaryPollForm() {
  const form =
    $("#primaryPollForm");

  if (form) {
    form.reset();
  }

  $("#primaryPollId").value =
    "";

  $("#primaryPollParty").value =
    "D";

  $("#primaryPollPopulation").value =
    "LV";

  $("#primaryPollSampleSize").value =
    "";

  $("#primaryPollQualityWeight").value =
    "1";

  $("#primaryPollCandidates").value =
    "";

  $("#primaryPollStatus").value =
    "draft";
}

function editPrimaryPoll(
  pollId = null
) {
  resetPrimaryPollForm();

  const poll =
    pollId
      ? state.primaryPolls.find(
          item =>
            item.id ===
            pollId
        )
      : null;

  if (poll) {
    $("#primaryPollId").value =
      poll.id ||
      "";

    $("#primaryPollPollster").value =
      poll.pollster ||
      "";

    $("#primaryPollParty").value =
      normalizePrimaryParty(
        poll.primary_party ??
        poll.party
      );

    $("#primaryPollPopulation").value =
      normalizePopulation(
        poll.population
      );

    $("#primaryPollStartDate").value =
      poll.start_date ||
      "";

    $("#primaryPollEndDate").value =
      poll.end_date ||
      "";

    $("#primaryPollSampleSize").value =
      poll.sample_size ??
      "";

    $("#primaryPollQualityWeight").value =
      poll.quality_weight ??
      1;

    $("#primaryPollCandidates").value =
      primaryResultsToTextarea(
        poll.candidate_results ??
        poll.results ??
        poll.candidates ??
        []
      );

    $("#primaryPollStatus").value =
      poll.status ||
      "draft";
  }

  openModal(
    "primaryPollModal"
  );
}

function readPrimaryPollPayload() {
  const startDate =
    readRequiredText(
      "#primaryPollStartDate",
      "Start date"
    );

  const endDate =
    readRequiredText(
      "#primaryPollEndDate",
      "End date"
    );

  if (
    endDate <
    startDate
  ) {
    throw new Error(
      "The poll end date cannot be before the start date."
    );
  }

  const results =
    parsePrimaryCandidateLines(
      $("#primaryPollCandidates")
        .value
    );

  return {
    pollster:
      readRequiredText(
        "#primaryPollPollster",
        "Pollster"
      ),

    primary_party:
      normalizePrimaryParty(
        $("#primaryPollParty")
          .value
      ),

    start_date:
      startDate,

    end_date:
      endDate,

    sample_size:
      integerOrNull(
        $("#primaryPollSampleSize")
          .value
      ),

    population:
      normalizePopulation(
        $("#primaryPollPopulation")
          .value
      ),

    candidate_results:
      results,

    quality_weight:
      numberOrNull(
        $("#primaryPollQualityWeight")
          .value
      ) ||
      1,

    status:
      normalizeStatus(
        $("#primaryPollStatus")
          .value
      ),

    updated_at:
      new Date()
        .toISOString()
  };
}

async function savePrimaryPoll(
  event
) {
  event.preventDefault();

  try {
    const pollId =
      cleanText(
        $("#primaryPollId")
          .value
      );

    const payload =
      readPrimaryPollPayload();

    let result;

    if (pollId) {
      result =
        await sb
          .from(
            "primary_polls"
          )
          .update(
            payload
          )
          .eq(
            "id",
            pollId
          );
    } else {
      result =
        await sb
          .from(
            "primary_polls"
          )
          .insert(
            payload
          );
    }

    /*
      Some older schemas may call these fields "party" and
      "results". If Supabase reports missing columns, retry
      using those fallback names.
    */

    if (
      result.error &&
      isMissingColumnError(
        result.error
      )
    ) {
      const fallbackPayload = {
        pollster:
          payload.pollster,

        party:
          payload.primary_party,

        start_date:
          payload.start_date,

        end_date:
          payload.end_date,

        sample_size:
          payload.sample_size,

        population:
          payload.population,

        results:
          payload.candidate_results,

        quality_weight:
          payload.quality_weight,

        status:
          payload.status,

        updated_at:
          payload.updated_at
      };

      if (pollId) {
        result =
          await sb
            .from(
              "primary_polls"
            )
            .update(
              fallbackPayload
            )
            .eq(
              "id",
              pollId
            );
      } else {
        result =
          await sb
            .from(
              "primary_polls"
            )
            .insert(
              fallbackPayload
            );
      }
    }

    if (result.error) {
      throw result.error;
    }

    closeModal(
      "primaryPollModal"
    );

    await reloadAll();

    msg(
      "Primary poll saved."
    );

  } catch (error) {

    console.error(
      "Primary-poll save failed:",
      error
    );

    msg(
      error.message ||
      "Unable to save primary poll.",
      "error"
    );
  }
}

async function deletePrimaryPoll(
  pollId
) {
  const poll =
    state.primaryPolls.find(
      item =>
        item.id ===
        pollId
    );

  if (!poll) {
    return;
  }

  const party =
    normalizePrimaryParty(
      poll.primary_party ??
      poll.party
    );

  const confirmed =
    window.confirm(
      `Delete the ${poll.pollster || "selected"} ${
        party === "R"
          ? "Republican"
          : "Democratic"
      } primary poll?`
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await sb
        .from(
          "primary_polls"
        )
        .delete()
        .eq(
          "id",
          pollId
        );

    if (error) {
      throw error;
    }

    await reloadAll();

    msg(
      "Primary poll deleted."
    );

  } catch (error) {

    console.error(
      "Primary-poll deletion failed:",
      error
    );

    msg(
      error.message ||
      "Unable to delete primary poll.",
      "error"
    );
  }
}
/* =========================================================
   SPREADSHEET IMPORT — FILE READING
   ========================================================= */

function spreadsheetCellText(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim();
}

function spreadsheetNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const cleaned =
    String(value)
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim();

  if (!cleaned) {
    return null;
  }

  const number =
    Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

function spreadsheetBoolean(
  value,
  fallback = false
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  const normalized =
    cleanText(value)
      .toLowerCase();

  if (
    [
      "true",
      "yes",
      "y",
      "1",
      "checked",
      "published"
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "n",
      "0",
      "unchecked",
      "draft"
    ].includes(normalized)
  ) {
    return false;
  }

  return fallback;
}

function spreadsheetDate(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return [
      value.getFullYear(),
      String(
        value.getMonth() + 1
      ).padStart(2, "0"),
      String(
        value.getDate()
      ).padStart(2, "0")
    ].join("-");
  }

  if (
    typeof value ===
      "number" &&
    window.XLSX?.SSF
  ) {
    const parsed =
      XLSX.SSF.parse_date_code(
        value
      );

    if (parsed) {
      return [
        parsed.y,
        String(
          parsed.m
        ).padStart(2, "0"),
        String(
          parsed.d
        ).padStart(2, "0")
      ].join("-");
    }
  }

  const text =
    spreadsheetCellText(
      value
    );

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return text;
  }

  const parsedDate =
    new Date(text);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "";
  }

  return [
    parsedDate.getFullYear(),
    String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0"),
    String(
      parsedDate.getDate()
    ).padStart(2, "0")
  ].join("-");
}

function normalizeSpreadsheetHeader(
  value
) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[%]/g, " pct ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(
      /^_+|_+$/g,
      ""
    );
}

function normalizeSpreadsheetRecord(
  rawRow
) {
  return Object.entries(
    rawRow || {}
  ).reduce(
    (
      normalized,
      [
        key,
        value
      ]
    ) => {
      const normalizedKey =
        normalizeSpreadsheetHeader(
          key
        );

      if (normalizedKey) {
        normalized[
          normalizedKey
        ] =
          value;
      }

      return normalized;
    },
    {}
  );
}

function firstSpreadsheetValue(
  row,
  aliases
) {
  for (
    const alias of aliases
  ) {
    const normalizedAlias =
      normalizeSpreadsheetHeader(
        alias
      );

    const value =
      row[
        normalizedAlias
      ];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return "";
}

function normalizeRecordType(
  value
) {
  const normalized =
    cleanText(value)
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  const aliases = {
    races:
      "race",

    election:
      "race",

    elections:
      "race",

    candidates:
      "candidate",

    race_poll:
      "poll",

    race_polls:
      "poll",

    polls:
      "poll",

    generic:
      "generic_ballot",

    generic_poll:
      "generic_ballot",

    generic_ballot_poll:
      "generic_ballot",

    generic_ballot_polls:
      "generic_ballot",

    approval:
      "approval_poll",

    approval_polls:
      "approval_poll",

    trump_approval:
      "approval_poll",

    trump_approval_poll:
      "approval_poll",

    primary:
      "primary_poll",

    primaries:
      "primary_poll",

    primary_polls:
      "primary_poll"
  };

  return (
    aliases[
      normalized
    ] ||
    normalized
  );
}

function supportedRecordType(
  recordType
) {
  return [
    "race",
    "candidate",
    "poll",
    "generic_ballot",
    "approval_poll",
    "primary_poll"
  ].includes(
    recordType
  );
}

async function readElectionWorkbook(
  file
) {
  if (!file) {
    throw new Error(
      "Choose a spreadsheet first."
    );
  }

  if (
    typeof XLSX ===
    "undefined"
  ) {
    throw new Error(
      "The spreadsheet library did not load."
    );
  }

  const buffer =
    await file.arrayBuffer();

  const workbook =
    XLSX.read(
      buffer,
      {
        type:
          "array",

        cellDates:
          true
      }
    );

  if (
    !workbook.SheetNames
      .length
  ) {
    throw new Error(
      "The spreadsheet does not contain any worksheets."
    );
  }

  const rows = [];

  workbook.SheetNames
    .forEach(
      sheetName => {
        const worksheet =
          workbook.Sheets[
            sheetName
          ];

        const sheetRows =
          XLSX.utils
            .sheet_to_json(
              worksheet,
              {
                defval: "",
                raw: true
              }
            );

        sheetRows.forEach(
          (
            rawRow,
            index
          ) => {
            const normalizedRow =
              normalizeSpreadsheetRecord(
                rawRow
              );

            const hasContent =
              Object.values(
                normalizedRow
              ).some(
                value =>
                  cleanText(
                    value
                  )
              );

            if (!hasContent) {
              return;
            }

            rows.push({
              ...normalizedRow,

              __sheet:
                sheetName,

              __row_number:
                index + 2
            });
          }
        );
      }
    );

  if (!rows.length) {
    throw new Error(
      "No spreadsheet records were found."
    );
  }

  return rows;
}


/* =========================================================
   SPREADSHEET RECORD NORMALIZATION
   ========================================================= */

function spreadsheetRaceSlug(
  row
) {
  return slugify(
    firstSpreadsheetValue(
      row,
      [
        "race_slug",
        "race slug",
        "slug",
        "race",
        "race_id"
      ]
    )
  );
}

function spreadsheetStatus(
  row
) {
  const explicitStatus =
    firstSpreadsheetValue(
      row,
      [
        "status",
        "publication_status"
      ]
    );

  if (explicitStatus) {
    return normalizeStatus(
      explicitStatus
    );
  }

  const published =
    firstSpreadsheetValue(
      row,
      [
        "published",
        "is_published"
      ]
    );

  return spreadsheetBoolean(
    published,
    false
  )
    ? "published"
    : "draft";
}

function normalizeOfficeValue(
  value
) {
  const normalized =
    cleanText(value)
      .toLowerCase();

  if (
    normalized.includes(
      "governor"
    ) ||
    normalized === "gov"
  ) {
    return "governor";
  }

  if (
    normalized.includes(
      "house"
    ) ||
    normalized.includes(
      "district"
    ) ||
    normalized === "us house"
  ) {
    return "house";
  }

  if (
    normalized.includes(
      "senate"
    ) ||
    normalized === "sen"
  ) {
    return "senate";
  }

  return normalized;
}

function normalizeImportedRace(
  row
) {
  const title =
    spreadsheetCellText(
      firstSpreadsheetValue(
        row,
        [
          "title",
          "race_title",
          "race name",
          "race_name"
        ]
      )
    );

  let slug =
    spreadsheetRaceSlug(
      row
    );

  if (
    !slug &&
    title
  ) {
    slug =
      slugify(title);
  }

  return {
    record_type:
      "race",

    office:
      normalizeOfficeValue(
        firstSpreadsheetValue(
          row,
          [
            "office",
            "office_type",
            "race_type",
            "chamber"
          ]
        )
      ),

    state:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "state",
            "state_code",
            "state abbreviation"
          ]
        )
      )
        .toUpperCase()
        .slice(0, 2),

    title,

    slug,

    rating:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "rating",
            "forecast_rating"
          ]
        )
      ) ||
      "Toss-up",

    projected_margin:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "projected_margin",
            "margin",
            "model_margin"
          ]
        )
      ),

    featured:
      spreadsheetBoolean(
        firstSpreadsheetValue(
          row,
          [
            "featured",
            "is_featured"
          ]
        )
      ),

    race_of_the_day:
      spreadsheetBoolean(
        firstSpreadsheetValue(
          row,
          [
            "race_of_the_day",
            "race of the day"
          ]
        )
      ),

    summary:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "summary",
            "race_summary",
            "analysis"
          ]
        )
      ),

    status:
      spreadsheetStatus(
        row
      )
  };
}

function normalizeImportedCandidate(
  row
) {
  return {
    record_type:
      "candidate",

    race_slug:
      spreadsheetRaceSlug(
        row
      ),

    name:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "candidate_name",
            "candidate",
            "name"
          ]
        )
      ),

    party:
      normalizePartyCode(
        firstSpreadsheetValue(
          row,
          [
            "party",
            "candidate_party"
          ]
        )
      ),

    incumbent:
      spreadsheetBoolean(
        firstSpreadsheetValue(
          row,
          [
            "incumbent",
            "is_incumbent"
          ]
        )
      ),

    win_probability:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "win_probability",
            "win probability",
            "win_pct",
            "win_percent",
            "odds"
          ]
        )
      ),

    expected_vote_share:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "expected_vote_share",
            "projected_vote_share",
            "vote_share",
            "expected vote"
          ]
        )
      ),

    candidate_to_watch:
      spreadsheetBoolean(
        firstSpreadsheetValue(
          row,
          [
            "candidate_to_watch",
            "candidate to watch"
          ]
        )
      ),

    photo_url:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "photo_url",
            "image_url"
          ]
        )
      )
  };
}

function normalizeImportedPoll(
  row
) {
  return {
    record_type:
      "poll",

    race_slug:
      spreadsheetRaceSlug(
        row
      ),

    pollster:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "pollster",
            "polling_firm",
            "firm"
          ]
        )
      ),

    start_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "start_date",
            "start date",
            "field_start"
          ]
        )
      ),

    end_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "end_date",
            "end date",
            "field_end",
            "date"
          ]
        )
      ),

    sample_size:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "sample_size",
            "sample",
            "n"
          ]
        )
      ),

    population:
      normalizePopulation(
        firstSpreadsheetValue(
          row,
          [
            "population",
            "sample_type",
            "pop"
          ]
        )
      ),

    dem_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "dem_pct",
            "dem",
            "democratic",
            "democrat"
          ]
        )
      ),

    rep_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "rep_pct",
            "rep",
            "republican"
          ]
        )
      ),

    ind_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "ind_pct",
            "ind",
            "independent",
            "independent_pct"
          ]
        )
      ),

    lib_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "lib_pct",
            "lib",
            "libertarian",
            "libertarian_pct"
          ]
        )
      ),

    green_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "green_pct",
            "green"
          ]
        )
      ),

    quality_weight:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "quality_weight",
            "weight",
            "pollster_weight"
          ]
        )
      ) ||
      1,

    status:
      spreadsheetStatus(
        row
      )
  };
}

function normalizeImportedGenericBallot(
  row
) {
  return {
    record_type:
      "generic_ballot",

    pollster:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "pollster",
            "polling_firm",
            "firm"
          ]
        )
      ),

    start_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "start_date",
            "field_start"
          ]
        )
      ),

    end_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "end_date",
            "field_end",
            "date"
          ]
        )
      ),

    sample_size:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "sample_size",
            "sample",
            "n"
          ]
        )
      ),

    population:
      normalizePopulation(
        firstSpreadsheetValue(
          row,
          [
            "population",
            "sample_type",
            "pop"
          ]
        )
      ),

    dem_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "dem_pct",
            "dem",
            "democratic"
          ]
        )
      ),

    rep_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "rep_pct",
            "rep",
            "republican"
          ]
        )
      ),

    quality_weight:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "quality_weight",
            "weight"
          ]
        )
      ) ||
      1,

    status:
      spreadsheetStatus(
        row
      )
  };
}

function normalizeImportedApprovalPoll(
  row
) {
  return {
    record_type:
      "approval_poll",

    pollster:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "pollster",
            "polling_firm",
            "firm"
          ]
        )
      ),

    start_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "start_date",
            "field_start"
          ]
        )
      ),

    end_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "end_date",
            "field_end",
            "date"
          ]
        )
      ),

    sample_size:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "sample_size",
            "sample",
            "n"
          ]
        )
      ),

    population:
      normalizePopulation(
        firstSpreadsheetValue(
          row,
          [
            "population",
            "sample_type",
            "pop"
          ]
        )
      ),

    approve_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "approve_pct",
            "approve",
            "approval"
          ]
        )
      ),

    disapprove_pct:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "disapprove_pct",
            "disapprove",
            "disapproval"
          ]
        )
      ),

    quality_weight:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "quality_weight",
            "weight"
          ]
        )
      ) ||
      1,

    status:
      spreadsheetStatus(
        row
      )
  };
}

function parsePrimaryResultsFromRow(
  row
) {
  const directResults =
    firstSpreadsheetValue(
      row,
      [
        "candidate_results",
        "results",
        "candidates"
      ]
    );

  if (directResults) {
    return normalizePrimaryResults(
      directResults
    );
  }

  const candidateName =
    spreadsheetCellText(
      firstSpreadsheetValue(
        row,
        [
          "candidate_name",
          "candidate"
        ]
      )
    );

  const percentage =
    spreadsheetNumber(
      firstSpreadsheetValue(
        row,
        [
          "candidate_pct",
          "candidate_percent",
          "percentage",
          "pct",
          "support"
        ]
      )
    );

  if (
    candidateName &&
    percentage !== null
  ) {
    return [
      {
        candidate_name:
          candidateName,

        percentage
      }
    ];
  }

  return [];
}

function normalizeImportedPrimaryPoll(
  row
) {
  return {
    record_type:
      "primary_poll",

    pollster:
      spreadsheetCellText(
        firstSpreadsheetValue(
          row,
          [
            "pollster",
            "polling_firm",
            "firm"
          ]
        )
      ),

    primary_party:
      normalizePrimaryParty(
        firstSpreadsheetValue(
          row,
          [
            "primary_party",
            "party"
          ]
        )
      ),

    start_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "start_date",
            "field_start"
          ]
        )
      ),

    end_date:
      spreadsheetDate(
        firstSpreadsheetValue(
          row,
          [
            "end_date",
            "field_end",
            "date"
          ]
        )
      ),

    sample_size:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "sample_size",
            "sample",
            "n"
          ]
        )
      ),

    population:
      normalizePopulation(
        firstSpreadsheetValue(
          row,
          [
            "population",
            "sample_type",
            "pop"
          ]
        )
      ),

    candidate_results:
      parsePrimaryResultsFromRow(
        row
      ),

    quality_weight:
      spreadsheetNumber(
        firstSpreadsheetValue(
          row,
          [
            "quality_weight",
            "weight"
          ]
        )
      ) ||
      1,

    status:
      spreadsheetStatus(
        row
      )
  };
}

function normalizeImportedRecord(
  row
) {
  const recordType =
    normalizeRecordType(
      firstSpreadsheetValue(
        row,
        [
          "record_type",
          "record type",
          "type"
        ]
      )
    );

  let normalized;

  if (
    recordType ===
    "race"
  ) {
    normalized =
      normalizeImportedRace(
        row
      );
  } else if (
    recordType ===
    "candidate"
  ) {
    normalized =
      normalizeImportedCandidate(
        row
      );
  } else if (
    recordType ===
    "poll"
  ) {
    normalized =
      normalizeImportedPoll(
        row
      );
  } else if (
    recordType ===
    "generic_ballot"
  ) {
    normalized =
      normalizeImportedGenericBallot(
        row
      );
  } else if (
    recordType ===
    "approval_poll"
  ) {
    normalized =
      normalizeImportedApprovalPoll(
        row
      );
  } else if (
    recordType ===
    "primary_poll"
  ) {
    normalized =
      normalizeImportedPrimaryPoll(
        row
      );
  } else {
    normalized = {
      record_type:
        recordType
    };
  }

  return {
    ...normalized,

    __sheet:
      row.__sheet,

    __row_number:
      row.__row_number,

    __errors: [],

    __warnings: []
  };
}


/* =========================================================
   PRIMARY-POLL ROW GROUPING
   ========================================================= */

function primaryPollGroupingKey(
  row
) {
  return [
    cleanText(
      row.pollster
    ).toLowerCase(),

    row.primary_party,

    row.start_date,

    row.end_date,

    row.sample_size ?? "",

    row.population
  ].join("|");
}

function mergeImportedPrimaryRows(
  rows
) {
  const grouped =
    new Map();

  const nonPrimaryRows =
    [];

  rows.forEach(
    row => {
      if (
        row.record_type !==
        "primary_poll"
      ) {
        nonPrimaryRows.push(
          row
        );

        return;
      }

      const key =
        primaryPollGroupingKey(
          row
        );

      if (
        !grouped.has(key)
      ) {
        grouped.set(
          key,
          {
            ...row,

            candidate_results:
              []
          }
        );
      }

      const target =
        grouped.get(key);

      target.candidate_results.push(
        ...normalizePrimaryResults(
          row.candidate_results
        )
      );

      target.__row_number =
        Math.min(
          target.__row_number,
          row.__row_number
        );
    }
  );

  const mergedPrimaryRows =
    [
      ...grouped.values()
    ].map(
      row => {
        const candidateMap =
          new Map();

        row.candidate_results
          .forEach(
            result => {
              const key =
                result.candidate_name
                  .toLowerCase();

              candidateMap.set(
                key,
                result
              );
            }
          );

        return {
          ...row,

          candidate_results:
            [
              ...candidateMap
                .values()
            ]
        };
      }
    );

  return [
    ...nonPrimaryRows,
    ...mergedPrimaryRows
  ];
}


/* =========================================================
   SPREADSHEET VALIDATION
   ========================================================= */

function addRowError(
  row,
  message
) {
  row.__errors.push(
    message
  );
}

function addRowWarning(
  row,
  message
) {
  row.__warnings.push(
    message
  );
}

function validatePercentage(
  row,
  value,
  label,
  required = false
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    if (required) {
      addRowError(
        row,
        `${label} is required.`
      );
    }

    return;
  }

  if (
    !Number.isFinite(
      Number(value)
    ) ||
    Number(value) < 0 ||
    Number(value) > 100
  ) {
    addRowError(
      row,
      `${label} must be between 0 and 100.`
    );
  }
}

function validateImportedRace(
  row
) {
  if (!row.office) {
    addRowError(
      row,
      "Office is required."
    );
  }

  if (
    ![
      "senate",
      "house",
      "governor"
    ].includes(
      row.office
    )
  ) {
    addRowError(
      row,
      "Office must be senate, house, or governor."
    );
  }

  if (!row.state) {
    addRowError(
      row,
      "State is required."
    );
  }

  if (!row.title) {
    addRowError(
      row,
      "Race title is required."
    );
  }

  if (!row.slug) {
    addRowError(
      row,
      "Race slug is required."
    );
  }

  if (
    row.projected_margin ===
    null
  ) {
    addRowError(
      row,
      "Projected margin is required."
    );
  }
}

function validateImportedCandidate(
  row,
  knownRaceSlugs
) {
  if (!row.race_slug) {
    addRowError(
      row,
      "race_slug is required."
    );
  } else if (
    !knownRaceSlugs.has(
      row.race_slug
    )
  ) {
    addRowError(
      row,
      `No matching race was found for "${row.race_slug}".`
    );
  }

  if (!row.name) {
    addRowError(
      row,
      "Candidate name is required."
    );
  }

  validatePercentage(
    row,
    row.win_probability,
    "Win probability",
    true
  );

  validatePercentage(
    row,
    row.expected_vote_share,
    "Expected vote share",
    true
  );
}

function validateImportedPoll(
  row,
  knownRaceSlugs
) {
  if (!row.race_slug) {
    addRowError(
      row,
      "race_slug is required."
    );
  } else if (
    !knownRaceSlugs.has(
      row.race_slug
    )
  ) {
    addRowError(
      row,
      `No matching race was found for "${row.race_slug}".`
    );
  }

  if (!row.pollster) {
    addRowError(
      row,
      "Pollster is required."
    );
  }

  if (
    !row.start_date ||
    !row.end_date
  ) {
    addRowError(
      row,
      "Valid start_date and end_date values are required."
    );
  }

  if (
    row.start_date &&
    row.end_date &&
    row.end_date <
    row.start_date
  ) {
    addRowError(
      row,
      "End date cannot be before start date."
    );
  }

  validatePercentage(
    row,
    row.dem_pct,
    "Democratic percentage",
    true
  );

  validatePercentage(
    row,
    row.rep_pct,
    "Republican percentage",
    true
  );

  validatePercentage(
    row,
    row.ind_pct,
    "Independent percentage"
  );

  validatePercentage(
    row,
    row.lib_pct,
    "Libertarian percentage"
  );

  validatePercentage(
    row,
    row.green_pct,
    "Green percentage"
  );

  const total =
    [
      row.dem_pct,
      row.rep_pct,
      row.ind_pct,
      row.lib_pct,
      row.green_pct
    ]
      .filter(
        value =>
          value !== null &&
          value !== undefined
      )
      .reduce(
        (
          sum,
          value
        ) =>
          sum +
          Number(value),
        0
      );

  if (
    total >
    100.5
  ) {
    addRowError(
      row,
      `Candidate percentages total ${total.toFixed(
        1
      )}%.`
    );
  }
}

function validateImportedTwoWayPoll(
  row,
  firstField,
  secondField,
  firstLabel,
  secondLabel
) {
  if (!row.pollster) {
    addRowError(
      row,
      "Pollster is required."
    );
  }

  if (
    !row.start_date ||
    !row.end_date
  ) {
    addRowError(
      row,
      "Valid start_date and end_date values are required."
    );
  }

  if (
    row.start_date &&
    row.end_date &&
    row.end_date <
    row.start_date
  ) {
    addRowError(
      row,
      "End date cannot be before start date."
    );
  }

  validatePercentage(
    row,
    row[firstField],
    firstLabel,
    true
  );

  validatePercentage(
    row,
    row[secondField],
    secondLabel,
    true
  );
}

function validateImportedPrimaryPoll(
  row
) {
  if (!row.pollster) {
    addRowError(
      row,
      "Pollster is required."
    );
  }

  if (
    !row.start_date ||
    !row.end_date
  ) {
    addRowError(
      row,
      "Valid start_date and end_date values are required."
    );
  }

  if (
    ![
      "D",
      "R"
    ].includes(
      row.primary_party
    )
  ) {
    addRowError(
      row,
      "Primary party must be D or R."
    );
  }

  const results =
    normalizePrimaryResults(
      row.candidate_results
    );

  if (!results.length) {
    addRowError(
      row,
      "At least one candidate result is required."
    );

    return;
  }

  const total =
    results.reduce(
      (
        sum,
        result
      ) =>
        sum +
        Number(
          result.percentage ||
          0
        ),
      0
    );

  if (
    total >
    100.5
  ) {
    addRowError(
      row,
      `Primary percentages total ${total.toFixed(
        1
      )}%.`
    );
  }

  results.forEach(
    result => {
      validatePercentage(
        row,
        result.percentage,
        `${result.candidate_name} percentage`,
        true
      );
    }
  );
}

function validateElectionWorkbookRows(
  normalizedRows
) {
  const importedRaceSlugs =
    normalizedRows
      .filter(
        row =>
          row.record_type ===
          "race" &&
          row.slug
      )
      .map(
        row =>
          row.slug
      );

  const existingRaceSlugs =
    state.races
      .map(
        race =>
          slugify(
            race.slug
          )
      )
      .filter(Boolean);

  const knownRaceSlugs =
    new Set([
      ...existingRaceSlugs,
      ...importedRaceSlugs
    ]);

  normalizedRows.forEach(
    row => {
      row.__errors = [];
      row.__warnings = [];

      if (
        !supportedRecordType(
          row.record_type
        )
      ) {
        addRowError(
          row,
          `Unsupported record_type "${row.record_type || "blank"}".`
        );

        return;
      }

      if (
        row.record_type ===
        "race"
      ) {
        validateImportedRace(
          row
        );
      }

      if (
        row.record_type ===
        "candidate"
      ) {
        validateImportedCandidate(
          row,
          knownRaceSlugs
        );
      }

      if (
        row.record_type ===
        "poll"
      ) {
        validateImportedPoll(
          row,
          knownRaceSlugs
        );
      }

      if (
        row.record_type ===
        "generic_ballot"
      ) {
        validateImportedTwoWayPoll(
          row,
          "dem_pct",
          "rep_pct",
          "Democratic percentage",
          "Republican percentage"
        );
      }

      if (
        row.record_type ===
        "approval_poll"
      ) {
        validateImportedTwoWayPoll(
          row,
          "approve_pct",
          "disapprove_pct",
          "Approval percentage",
          "Disapproval percentage"
        );
      }

      if (
        row.record_type ===
        "primary_poll"
      ) {
        validateImportedPrimaryPoll(
          row
        );
      }

      if (
        !row.sample_size &&
        [
          "poll",
          "generic_ballot",
          "approval_poll",
          "primary_poll"
        ].includes(
          row.record_type
        )
      ) {
        addRowWarning(
          row,
          "Sample size is blank."
        );
      }
    }
  );

  return normalizedRows;
}


/* =========================================================
   SPREADSHEET PREVIEW
   ========================================================= */

function spreadsheetRecordLabel(
  recordType
) {
  const labels = {
    race:
      "Race",

    candidate:
      "Candidate",

    poll:
      "Race poll",

    generic_ballot:
      "Generic ballot",

    approval_poll:
      "Approval poll",

    primary_poll:
      "Primary poll"
  };

  return (
    labels[
      recordType
    ] ||
    recordType ||
    "Unknown"
  );
}

function spreadsheetRecordDescription(
  row
) {
  if (
    row.record_type ===
    "race"
  ) {
    return (
      row.title ||
      row.slug ||
      "Untitled race"
    );
  }

  if (
    row.record_type ===
    "candidate"
  ) {
    return `${row.name || "Unnamed candidate"} · ${row.race_slug || "No race"}`;
  }

  if (
    row.record_type ===
    "poll"
  ) {
    return `${row.pollster || "Unknown pollster"} · ${row.race_slug || "No race"}`;
  }

  if (
    row.record_type ===
    "generic_ballot"
  ) {
    return `${row.pollster || "Unknown pollster"} · Generic ballot`;
  }

  if (
    row.record_type ===
    "approval_poll"
  ) {
    return `${row.pollster || "Unknown pollster"} · Trump approval`;
  }

  if (
    row.record_type ===
    "primary_poll"
  ) {
    return `${row.pollster || "Unknown pollster"} · ${
      row.primary_party ===
      "R"
        ? "Republican"
        : "Democratic"
    } primary`;
  }

  return "Unknown record";
}

function renderSpreadsheetPreview(
  rows
) {
  const card =
    $("#spreadsheetPreviewCard");

  const summary =
    $("#spreadsheetPreviewSummary");

  const messages =
    $("#spreadsheetValidationMessages");

  const head =
    $("#spreadsheetPreviewHead");

  const body =
    $("#spreadsheetPreviewBody");

  const importButton =
    $("#importElectionWorkbook");

  if (
    !card ||
    !summary ||
    !messages ||
    !head ||
    !body ||
    !importButton
  ) {
    return;
  }

  card.style.display =
    "";

  const errorRows =
    rows.filter(
      row =>
        row.__errors.length
    );

  const warningRows =
    rows.filter(
      row =>
        row.__warnings.length
    );

  const validRows =
    rows.filter(
      row =>
        !row.__errors.length
    );

  summary.textContent =
    `${rows.length} records found · ${validRows.length} ready · ${errorRows.length} with errors · ${warningRows.length} with warnings`;

  const typeCounts =
    rows.reduce(
      (
        counts,
        row
      ) => {
        counts[
          row.record_type ||
          "unknown"
        ] =
          (
            counts[
              row.record_type ||
              "unknown"
            ] ||
            0
          ) +
          1;

        return counts;
      },
      {}
    );

  messages.innerHTML = `
    <div class="notice ${
      errorRows.length
        ? "error"
        : "success"
    }">

      ${
        errorRows.length
          ? `${errorRows.length} record(s) must be corrected before importing.`
          : "Spreadsheet validation passed."
      }

    </div>

    <p class="subtle">
      ${
        Object.entries(
          typeCounts
        )
          .map(
            (
              [
                type,
                count
              ]
            ) =>
              `${spreadsheetRecordLabel(
                type
              )}: ${count}`
          )
          .join(" · ")
      }
    </p>
  `;

  head.innerHTML = `
    <tr>
      <th>Row</th>
      <th>Type</th>
      <th>Record</th>
      <th>Status</th>
      <th>Messages</th>
    </tr>
  `;

  body.innerHTML =
    rows
      .slice(
        0,
        250
      )
      .map(
        row => {
          const hasErrors =
            row.__errors.length >
            0;

          const hasWarnings =
            row.__warnings.length >
            0;

          const messagesText =
            [
              ...row.__errors,
              ...row.__warnings
            ].join(" ");

          return `
            <tr>

              <td>
                ${escapeHtml(
                  row.__sheet ||
                  ""
                )}
                ·
                ${row.__row_number}
              </td>

              <td>
                ${escapeHtml(
                  spreadsheetRecordLabel(
                    row.record_type
                  )
                )}
              </td>

              <td>
                ${escapeHtml(
                  spreadsheetRecordDescription(
                    row
                  )
                )}
              </td>

              <td>
                <span
                  class="badge ${
                    hasErrors
                      ? "red"
                      : hasWarnings
                      ? "gold"
                      : "green"
                  }"
                >
                  ${
                    hasErrors
                      ? "Error"
                      : hasWarnings
                      ? "Warning"
                      : "Ready"
                  }
                </span>
              </td>

              <td>
                ${escapeHtml(
                  messagesText ||
                  "Ready to import."
                )}
              </td>

            </tr>
          `;
        }
      )
      .join("");

  if (
    rows.length >
    250
  ) {
    body.insertAdjacentHTML(
      "beforeend",
      `
        <tr>
          <td
            colspan="5"
            class="empty"
          >
            Preview limited to the first 250 records.
          </td>
        </tr>
      `
    );
  }

  importButton.disabled =
    Boolean(
      errorRows.length
    );
}

async function previewElectionWorkbook() {
  try {
    const input =
      $("#electionWorkbookFile");

    const file =
      input?.files?.[0];

    const rawRows =
      await readElectionWorkbook(
        file
      );

    const normalizedRows =
      rawRows.map(
        normalizeImportedRecord
      );

    const mergedRows =
      mergeImportedPrimaryRows(
        normalizedRows
      );

    electionWorkbookPreviewRows =
      validateElectionWorkbookRows(
        mergedRows
      );

    renderSpreadsheetPreview(
      electionWorkbookPreviewRows
    );

    msg(
      "Spreadsheet preview created."
    );

  } catch (error) {

    electionWorkbookPreviewRows =
      [];

    const importButton =
      $("#importElectionWorkbook");

    if (importButton) {
      importButton.disabled =
        true;
    }

    console.error(
      "Spreadsheet preview failed:",
      error
    );

    msg(
      error.message ||
      "Unable to preview spreadsheet.",
      "error"
    );
  }
}
/* =========================================================
   SPREADSHEET IMPORT — DUPLICATE MATCHING
   ========================================================= */

function sameText(
  first,
  second
) {
  return (
    cleanText(first)
      .toLowerCase() ===
    cleanText(second)
      .toLowerCase()
  );
}

function sameDate(
  first,
  second
) {
  return (
    cleanText(first) ===
    cleanText(second)
  );
}

function findExistingCandidate(
  raceId,
  candidateName,
  party
) {
  return (
    state.candidates.find(
      candidate =>
        candidate.race_id ===
          raceId &&
        sameText(
          candidate.name,
          candidateName
        ) &&
        normalizePartyCode(
          candidate.party
        ) ===
          normalizePartyCode(
            party
          )
    ) ||
    null
  );
}

function findExistingRacePoll(
  raceId,
  row
) {
  return (
    state.polls.find(
      poll =>
        poll.race_id ===
          raceId &&
        sameText(
          poll.pollster,
          row.pollster
        ) &&
        sameDate(
          poll.start_date,
          row.start_date
        ) &&
        sameDate(
          poll.end_date,
          row.end_date
        )
    ) ||
    null
  );
}

function findExistingGenericBallotPoll(
  row
) {
  return (
    state.genericBallotPolls.find(
      poll =>
        sameText(
          poll.pollster,
          row.pollster
        ) &&
        sameDate(
          poll.start_date,
          row.start_date
        ) &&
        sameDate(
          poll.end_date,
          row.end_date
        )
    ) ||
    null
  );
}

function findExistingApprovalPoll(
  row
) {
  return (
    state.approvalPolls.find(
      poll =>
        sameText(
          poll.pollster,
          row.pollster
        ) &&
        sameDate(
          poll.start_date,
          row.start_date
        ) &&
        sameDate(
          poll.end_date,
          row.end_date
        )
    ) ||
    null
  );
}

function findExistingPrimaryPoll(
  row
) {
  return (
    state.primaryPolls.find(
      poll =>
        sameText(
          poll.pollster,
          row.pollster
        ) &&
        normalizePrimaryParty(
          poll.primary_party ??
          poll.party
        ) ===
          normalizePrimaryParty(
            row.primary_party
          ) &&
        sameDate(
          poll.start_date,
          row.start_date
        ) &&
        sameDate(
          poll.end_date,
          row.end_date
        )
    ) ||
    null
  );
}


/* =========================================================
   SPREADSHEET IMPORT — DATABASE HELPERS
   ========================================================= */

async function upsertImportedRace(
  row
) {
  const existing =
    raceBySlug(
      row.slug
    );

  const payload = {
    office:
      row.office,

    state:
      row.state,

    title:
      row.title,

    slug:
      row.slug,

    rating:
      row.rating ||
      "Toss-up",

    projected_margin:
      Number(
        row.projected_margin ||
        0
      ),

    featured:
      Boolean(
        row.featured
      ),

    race_of_the_day:
      Boolean(
        row.race_of_the_day
      ),

    summary:
      row.summary ||
      "",

    status:
      normalizeStatus(
        row.status
      ),

    updated_at:
      new Date()
        .toISOString()
  };

  if (
    payload.race_of_the_day
  ) {
    await clearOtherRaceOfDay(
      existing?.id ||
      null
    );
  }

  if (existing) {
    const {
      data,
      error
    } =
      await sb
        .from("races")
        .update(
          payload
        )
        .eq(
          "id",
          existing.id
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    const index =
      state.races.findIndex(
        race =>
          race.id ===
          existing.id
      );

    if (index !== -1) {
      state.races[index] =
        data;
    }

    return {
      action:
        "updated",

      record:
        data
    };
  }

  const {
    data,
    error
  } =
    await sb
      .from("races")
      .insert(
        payload
      )
      .select("*")
      .single();

  if (error) {
    throw error;
  }

  state.races.push(
    data
  );

  return {
    action:
      "created",

    record:
      data
  };
}

async function upsertImportedCandidate(
  row
) {
  const race =
    raceBySlug(
      row.race_slug
    );

  if (!race) {
    throw new Error(
      `No matching race for ${row.race_slug}.`
    );
  }

  const existing =
    findExistingCandidate(
      race.id,
      row.name,
      row.party
    );

  const payload = {
    race_id:
      race.id,

    name:
      row.name,

    party:
      normalizePartyCode(
        row.party
      ),

    incumbent:
      Boolean(
        row.incumbent
      ),

    win_probability:
      Number(
        row.win_probability
      ),

    expected_vote_share:
      Number(
        row.expected_vote_share
      ),

    candidate_to_watch:
      Boolean(
        row.candidate_to_watch
      ),

    photo_url:
      row.photo_url ||
      null
  };

  let result;

  if (existing) {
    result =
      await sb
        .from(
          "candidates"
        )
        .update(
          payload
        )
        .eq(
          "id",
          existing.id
        );
  } else {
    result =
      await sb
        .from(
          "candidates"
        )
        .insert(
          payload
        );
  }

  if (
    result.error &&
    isMissingColumnError(
      result.error
    )
  ) {
    const fallback = {
      ...payload
    };

    delete fallback
      .candidate_to_watch;

    result =
      existing
        ? await sb
            .from(
              "candidates"
            )
            .update(
              fallback
            )
            .eq(
              "id",
              existing.id
            )
        : await sb
            .from(
              "candidates"
            )
            .insert(
              fallback
            );
  }

  if (result.error) {
    throw result.error;
  }

  return {
    action:
      existing
        ? "updated"
        : "created"
  };
}

async function upsertImportedRacePoll(
  row
) {
  const race =
    raceBySlug(
      row.race_slug
    );

  if (!race) {
    throw new Error(
      `No matching race for ${row.race_slug}.`
    );
  }

  const existing =
    findExistingRacePoll(
      race.id,
      row
    );

  const payload = {
    race_id:
      race.id,

    pollster:
      row.pollster,

    start_date:
      row.start_date,

    end_date:
      row.end_date,

    sample_size:
      integerOrNull(
        row.sample_size
      ),

    population:
      normalizePopulation(
        row.population
      ),

    dem_pct:
      Number(
        row.dem_pct
      ),

    rep_pct:
      Number(
        row.rep_pct
      ),

    ind_pct:
      numberOrNull(
        row.ind_pct
      ),

    lib_pct:
      numberOrNull(
        row.lib_pct
      ),

    green_pct:
      numberOrNull(
        row.green_pct
      ),

    quality_weight:
      Number(
        row.quality_weight ||
        1
      ),

    status:
      normalizeStatus(
        row.status
      ),

    updated_at:
      new Date()
        .toISOString()
  };

  let result;

  result =
    existing
      ? await sb
          .from("polls")
          .update(
            payload
          )
          .eq(
            "id",
            existing.id
          )
      : await sb
          .from("polls")
          .insert(
            payload
          );

  if (
    result.error &&
    isMissingColumnError(
      result.error
    )
  ) {
    const fallback = {
      ...payload
    };

    delete fallback.ind_pct;
    delete fallback.lib_pct;
    delete fallback.green_pct;

    result =
      existing
        ? await sb
            .from("polls")
            .update(
              fallback
            )
            .eq(
              "id",
              existing.id
            )
        : await sb
            .from("polls")
            .insert(
              fallback
            );
  }

  if (result.error) {
    throw result.error;
  }

  return {
    action:
      existing
        ? "updated"
        : "created"
  };
}

async function upsertImportedGenericBallot(
  row
) {
  const existing =
    findExistingGenericBallotPoll(
      row
    );

  const payload = {
    pollster:
      row.pollster,

    start_date:
      row.start_date,

    end_date:
      row.end_date,

    sample_size:
      integerOrNull(
        row.sample_size
      ),

    population:
      normalizePopulation(
        row.population
      ),

    dem_pct:
      Number(
        row.dem_pct
      ),

    rep_pct:
      Number(
        row.rep_pct
      ),

    quality_weight:
      Number(
        row.quality_weight ||
        1
      ),

    status:
      normalizeStatus(
        row.status
      ),

    updated_at:
      new Date()
        .toISOString()
  };

  const result =
    existing
      ? await sb
          .from(
            "generic_ballot_polls"
          )
          .update(
            payload
          )
          .eq(
            "id",
            existing.id
          )
      : await sb
          .from(
            "generic_ballot_polls"
          )
          .insert(
            payload
          );

  if (result.error) {
    throw result.error;
  }

  return {
    action:
      existing
        ? "updated"
        : "created"
  };
}

async function upsertImportedApprovalPoll(
  row
) {
  const existing =
    findExistingApprovalPoll(
      row
    );

  const payload = {
    pollster:
      row.pollster,

    start_date:
      row.start_date,

    end_date:
      row.end_date,

    sample_size:
      integerOrNull(
        row.sample_size
      ),

    population:
      normalizePopulation(
        row.population
      ),

    approve_pct:
      Number(
        row.approve_pct
      ),

    disapprove_pct:
      Number(
        row.disapprove_pct
      ),

    quality_weight:
      Number(
        row.quality_weight ||
        1
      ),

    status:
      normalizeStatus(
        row.status
      ),

    updated_at:
      new Date()
        .toISOString()
  };

  const result =
    existing
      ? await sb
          .from(
            "approval_polls"
          )
          .update(
            payload
          )
          .eq(
            "id",
            existing.id
          )
      : await sb
          .from(
            "approval_polls"
          )
          .insert(
            payload
          );

  if (result.error) {
    throw result.error;
  }

  return {
    action:
      existing
        ? "updated"
        : "created"
  };
}

async function upsertImportedPrimaryPoll(
  row
) {
  const existing =
    findExistingPrimaryPoll(
      row
    );

  const payload = {
    pollster:
      row.pollster,

    primary_party:
      normalizePrimaryParty(
        row.primary_party
      ),

    start_date:
      row.start_date,

    end_date:
      row.end_date,

    sample_size:
      integerOrNull(
        row.sample_size
      ),

    population:
      normalizePopulation(
        row.population
      ),

    candidate_results:
      normalizePrimaryResults(
        row.candidate_results
      ),

    quality_weight:
      Number(
        row.quality_weight ||
        1
      ),

    status:
      normalizeStatus(
        row.status
      ),

    updated_at:
      new Date()
        .toISOString()
  };

  let result =
    existing
      ? await sb
          .from(
            "primary_polls"
          )
          .update(
            payload
          )
          .eq(
            "id",
            existing.id
          )
      : await sb
          .from(
            "primary_polls"
          )
          .insert(
            payload
          );

  if (
    result.error &&
    isMissingColumnError(
      result.error
    )
  ) {
    const fallback = {
      pollster:
        payload.pollster,

      party:
        payload.primary_party,

      start_date:
        payload.start_date,

      end_date:
        payload.end_date,

      sample_size:
        payload.sample_size,

      population:
        payload.population,

      results:
        payload.candidate_results,

      quality_weight:
        payload.quality_weight,

      status:
        payload.status,

      updated_at:
        payload.updated_at
    };

    result =
      existing
        ? await sb
            .from(
              "primary_polls"
            )
            .update(
              fallback
            )
            .eq(
              "id",
              existing.id
            )
        : await sb
            .from(
              "primary_polls"
            )
            .insert(
              fallback
            );
  }

  if (result.error) {
    throw result.error;
  }

  return {
    action:
      existing
        ? "updated"
        : "created"
  };
}


/* =========================================================
   SPREADSHEET IMPORT — EXECUTION
   ========================================================= */

function createImportSummary() {
  return {
    created: {
      race: 0,
      candidate: 0,
      poll: 0,
      generic_ballot: 0,
      approval_poll: 0,
      primary_poll: 0
    },

    updated: {
      race: 0,
      candidate: 0,
      poll: 0,
      generic_ballot: 0,
      approval_poll: 0,
      primary_poll: 0
    },

    failed: []
  };
}

function addImportResult(
  summary,
  recordType,
  action
) {
  if (
    summary[action] &&
    Object.prototype
      .hasOwnProperty.call(
        summary[action],
        recordType
      )
  ) {
    summary[action][
      recordType
    ] += 1;
  }
}

async function importSingleSpreadsheetRow(
  row
) {
  if (
    row.record_type ===
    "race"
  ) {
    return upsertImportedRace(
      row
    );
  }

  if (
    row.record_type ===
    "candidate"
  ) {
    return upsertImportedCandidate(
      row
    );
  }

  if (
    row.record_type ===
    "poll"
  ) {
    return upsertImportedRacePoll(
      row
    );
  }

  if (
    row.record_type ===
    "generic_ballot"
  ) {
    return upsertImportedGenericBallot(
      row
    );
  }

  if (
    row.record_type ===
    "approval_poll"
  ) {
    return upsertImportedApprovalPoll(
      row
    );
  }

  if (
    row.record_type ===
    "primary_poll"
  ) {
    return upsertImportedPrimaryPoll(
      row
    );
  }

  throw new Error(
    `Unsupported record type: ${row.record_type}`
  );
}

async function importRowsByType(
  rows,
  recordType,
  summary
) {
  const matchingRows =
    rows.filter(
      row =>
        row.record_type ===
        recordType
    );

  for (
    const row of
    matchingRows
  ) {
    try {
      const result =
        await importSingleSpreadsheetRow(
          row
        );

      addImportResult(
        summary,
        recordType,
        result.action
      );
    } catch (error) {
      summary.failed.push({
        sheet:
          row.__sheet,

        row:
          row.__row_number,

        record_type:
          row.record_type,

        description:
          spreadsheetRecordDescription(
            row
          ),

        message:
          error.message ||
          "Unknown import error."
      });
    }
  }
}

function totalImportCount(
  group
) {
  return Object.values(
    group
  ).reduce(
    (
      total,
      count
    ) =>
      total +
      Number(count || 0),
    0
  );
}

function importSummaryText(
  summary
) {
  const created =
    totalImportCount(
      summary.created
    );

  const updated =
    totalImportCount(
      summary.updated
    );

  const failed =
    summary.failed.length;

  return (
    `${created} created · ` +
    `${updated} updated · ` +
    `${failed} failed`
  );
}

function renderImportResults(
  summary
) {
  const messages =
    $("#spreadsheetValidationMessages");

  if (!messages) {
    return;
  }

  const created =
    totalImportCount(
      summary.created
    );

  const updated =
    totalImportCount(
      summary.updated
    );

  const failed =
    summary.failed.length;

  const breakdown = [
    [
      "Races",
      summary.created.race,
      summary.updated.race
    ],
    [
      "Candidates",
      summary.created.candidate,
      summary.updated.candidate
    ],
    [
      "Race polls",
      summary.created.poll,
      summary.updated.poll
    ],
    [
      "Generic ballot",
      summary.created
        .generic_ballot,
      summary.updated
        .generic_ballot
    ],
    [
      "Approval polls",
      summary.created
        .approval_poll,
      summary.updated
        .approval_poll
    ],
    [
      "Primary polls",
      summary.created
        .primary_poll,
      summary.updated
        .primary_poll
    ]
  ];

  messages.innerHTML = `
    <div class="notice ${
      failed
        ? "error"
        : "success"
    }">
      Import complete:
      ${created} created,
      ${updated} updated,
      ${failed} failed.
    </div>

    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Record type</th>
            <th>Created</th>
            <th>Updated</th>
          </tr>
        </thead>

        <tbody>
          ${
            breakdown
              .map(
                item => `
                  <tr>
                    <td>
                      ${escapeHtml(
                        item[0]
                      )}
                    </td>

                    <td>
                      ${item[1]}
                    </td>

                    <td>
                      ${item[2]}
                    </td>
                  </tr>
                `
              )
              .join("")
          }
        </tbody>
      </table>
    </div>

    ${
      failed
        ? `
          <div class="section">

            <h3>
              Failed records
            </h3>

            <div class="tableWrap">

              <table>

                <thead>

                  <tr>
                    <th>Sheet</th>
                    <th>Row</th>
                    <th>Type</th>
                    <th>Record</th>
                    <th>Error</th>
                  </tr>

                </thead>

                <tbody>

                  ${
                    summary.failed
                      .map(
                        failure => `
                          <tr>

                            <td>
                              ${escapeHtml(
                                failure.sheet ||
                                ""
                              )}
                            </td>

                            <td>
                              ${failure.row ||
                              "—"}
                            </td>

                            <td>
                              ${escapeHtml(
                                spreadsheetRecordLabel(
                                  failure.record_type
                                )
                              )}
                            </td>

                            <td>
                              ${escapeHtml(
                                failure.description ||
                                ""
                              )}
                            </td>

                            <td>
                              ${escapeHtml(
                                failure.message ||
                                ""
                              )}
                            </td>

                          </tr>
                        `
                      )
                      .join("")
                  }

                </tbody>

              </table>

            </div>

          </div>
        `
        : ""
    }
  `;
}

async function importElectionWorkbook() {
  if (
    !electionWorkbookPreviewRows
      .length
  ) {
    msg(
      "Preview a spreadsheet before importing.",
      "error"
    );

    return;
  }

  const invalidRows =
    electionWorkbookPreviewRows
      .filter(
        row =>
          row.__errors.length
      );

  if (
    invalidRows.length
  ) {
    msg(
      "Correct the spreadsheet errors before importing.",
      "error"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `Import ${electionWorkbookPreviewRows.length} validated records into ElectionLab?`
    );

  if (!confirmed) {
    return;
  }

  const importButton =
    $("#importElectionWorkbook");

  if (importButton) {
    importButton.disabled =
      true;

    importButton.textContent =
      "Importing…";
  }

  const summary =
    createImportSummary();

  try {
    /*
      Races must be imported first because candidates and
      polls depend on race IDs.
    */

    await importRowsByType(
      electionWorkbookPreviewRows,
      "race",
      summary
    );

    await reloadAll();

    await importRowsByType(
      electionWorkbookPreviewRows,
      "candidate",
      summary
    );

    await importRowsByType(
      electionWorkbookPreviewRows,
      "poll",
      summary
    );

    await importRowsByType(
      electionWorkbookPreviewRows,
      "generic_ballot",
      summary
    );

    await importRowsByType(
      electionWorkbookPreviewRows,
      "approval_poll",
      summary
    );

    await importRowsByType(
      electionWorkbookPreviewRows,
      "primary_poll",
      summary
    );

    await reloadAll();

    renderImportResults(
      summary
    );

    msg(
      `Import complete: ${importSummaryText(
        summary
      )}.`,
      summary.failed.length
        ? "error"
        : "success"
    );

  } catch (error) {

    console.error(
      "Spreadsheet import failed:",
      error
    );

    msg(
      error.message ||
      "Unable to import spreadsheet.",
      "error"
    );

  } finally {

    if (importButton) {
      importButton.textContent =
        "Import spreadsheet";

      importButton.disabled =
        false;
    }
  }
}


/* =========================================================
   SPREADSHEET TEMPLATE
   ========================================================= */

function electionWorkbookTemplateRows() {
  return [
    {
      record_type:
        "race",

      office:
        "senate",

      state:
        "MI",

      title:
        "Michigan Senate",

      race_slug:
        "mi-senate",

      rating:
        "Toss-up",

      projected_margin:
        0,

      featured:
        true,

      race_of_the_day:
        false,

      summary:
        "A closely watched open-seat Senate race.",

      status:
        "published"
    },

    {
      record_type:
        "candidate",

      race_slug:
        "mi-senate",

      candidate_name:
        "Democratic Candidate",

      party:
        "D",

      incumbent:
        false,

      win_probability:
        50,

      expected_vote_share:
        48,

      candidate_to_watch:
        false
    },

    {
      record_type:
        "poll",

      race_slug:
        "mi-senate",

      pollster:
        "Example Pollster",

      start_date:
        "2026-07-01",

      end_date:
        "2026-07-03",

      sample_size:
        800,

      population:
        "LV",

      dem_pct:
        48,

      rep_pct:
        47,

      ind_pct:
        "",

      lib_pct:
        "",

      green_pct:
        "",

      quality_weight:
        1,

      status:
        "published"
    },

    {
      record_type:
        "generic_ballot",

      pollster:
        "Example Pollster",

      start_date:
        "2026-07-01",

      end_date:
        "2026-07-03",

      sample_size:
        1000,

      population:
        "RV",

      dem_pct:
        47,

      rep_pct:
        45,

      quality_weight:
        1,

      status:
        "published"
    },

    {
      record_type:
        "approval_poll",

      pollster:
        "Example Pollster",

      start_date:
        "2026-07-01",

      end_date:
        "2026-07-03",

      sample_size:
        1000,

      population:
        "A",

      approve_pct:
        45,

      disapprove_pct:
        52,

      quality_weight:
        1,

      status:
        "published"
    },

    {
      record_type:
        "primary_poll",

      pollster:
        "Example Pollster",

      primary_party:
        "D",

      start_date:
        "2026-07-01",

      end_date:
        "2026-07-03",

      sample_size:
        700,

      population:
        "LV",

      candidate_name:
        "Candidate One",

      candidate_pct:
        25,

      quality_weight:
        1,

      status:
        "published"
    }
  ];
}

function downloadElectionWorkbookTemplate() {
  if (
    typeof XLSX ===
    "undefined"
  ) {
    msg(
      "The spreadsheet library did not load.",
      "error"
    );

    return;
  }

  const rows =
    electionWorkbookTemplateRows();

  const worksheet =
    XLSX.utils
      .json_to_sheet(
        rows
      );

  const workbook =
    XLSX.utils
      .book_new();

  XLSX.utils
    .book_append_sheet(
      workbook,
      worksheet,
      "Website Import"
    );

  XLSX.writeFile(
    workbook,
    "electionlab_import_template.xlsx"
  );
}


/* =========================================================
   SPREADSHEET CONTROL SETUP
   ========================================================= */

function resetSpreadsheetPreview() {
  electionWorkbookPreviewRows =
    [];

  const previewCard =
    $("#spreadsheetPreviewCard");

  const importButton =
    $("#importElectionWorkbook");

  if (previewCard) {
    previewCard.style.display =
      "none";
  }

  if (importButton) {
    importButton.disabled =
      true;
  }
}

function initializeSpreadsheetControls() {
  const fileInput =
    $("#electionWorkbookFile");

  const previewButton =
    $("#previewElectionWorkbook");

  const importButton =
    $("#importElectionWorkbook");

  const templateButton =
    $("#downloadElectionWorkbookTemplate");

  fileInput?.addEventListener(
    "change",
    resetSpreadsheetPreview
  );

  previewButton?.addEventListener(
    "click",
    previewElectionWorkbook
  );

  importButton?.addEventListener(
    "click",
    importElectionWorkbook
  );

  templateButton?.addEventListener(
    "click",
    downloadElectionWorkbookTemplate
  );
}
/* =========================================================
   SIDEBAR PANELS
   ========================================================= */

function showAdminPanel(
  panelId
) {
  $$(".adminPanel")
    .forEach(
      panel => {
        panel.classList.toggle(
          "active",
          panel.id ===
          panelId
        );
      }
    );

  $$(".sidebar button[data-panel]")
    .forEach(
      button => {
        button.classList.toggle(
          "active",
          button.dataset.panel ===
          panelId
        );
      }
    );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function initializeAdminPanels() {
  $$(".sidebar button[data-panel]")
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            showAdminPanel(
              button.dataset.panel
            );
          }
        );
      }
    );
}


/* =========================================================
   FORM EVENT LISTENERS
   ========================================================= */

function initializeAdminForms() {
  $("#homepageSettingsForm")
    ?.addEventListener(
      "submit",
      saveHomepageSettings
    );

  $("#raceForm")
    ?.addEventListener(
      "submit",
      saveRace
    );

  $("#forecastChangeForm")
    ?.addEventListener(
      "submit",
      saveForecastChange
    );

  $("#candidateForm")
    ?.addEventListener(
      "submit",
      saveCandidate
    );

  $("#pollForm")
    ?.addEventListener(
      "submit",
      savePoll
    );

  $("#genericBallotForm")
    ?.addEventListener(
      "submit",
      saveGenericBallotPoll
    );

  $("#approvalPollForm")
    ?.addEventListener(
      "submit",
      saveApprovalPoll
    );

  $("#primaryPollForm")
    ?.addEventListener(
      "submit",
      savePrimaryPoll
    );
}


/* =========================================================
   AUTOMATIC SLUG CREATION
   ========================================================= */

function initializeRaceSlugHelper() {
  const titleInput =
    $("#raceTitle");

  const slugInput =
    $("#raceSlug");

  if (
    !titleInput ||
    !slugInput
  ) {
    return;
  }

  titleInput.addEventListener(
    "input",
    () => {
      const raceId =
        cleanText(
          $("#raceId")
            ?.value
        );

      if (
        raceId ||
        cleanText(
          slugInput.value
        )
      ) {
        return;
      }

      slugInput.value =
        slugify(
          titleInput.value
        );
    }
  );
}


/* =========================================================
   RACE-OF-THE-DAY CHECKBOX NOTICE
   ========================================================= */

function initializeRaceOfDayNotice() {
  const checkbox =
    $("#raceOfTheDay");

  if (!checkbox) {
    return;
  }

  checkbox.addEventListener(
    "change",
    () => {
      if (!checkbox.checked) {
        return;
      }

      const selected =
        state.races.find(
          race =>
            race.race_of_the_day &&
            race.id !==
              cleanText(
                $("#raceId")
                  ?.value
              )
        );

      if (selected) {
        msg(
          `"${selected.title}" is currently Race of the Day. Saving this race will replace it.`,
          "success"
        );
      }
    }
  );
}


/* =========================================================
   FORECAST-HISTORY FORM ASSIST
   ========================================================= */

function initializeForecastHistoryAssist() {
  const raceSelect =
    $("#forecastChangeRace");

  if (!raceSelect) {
    return;
  }

  raceSelect.addEventListener(
    "change",
    () => {
      const race =
        raceById(
          raceSelect.value
        );

      if (!race) {
        return;
      }

      if (
        !cleanText(
          $("#forecastChangeNewRating")
            ?.value
        )
      ) {
        $("#forecastChangeNewRating").value =
          race.rating ||
          "Toss-up";
      }

      if (
        cleanText(
          $("#forecastChangeNewMargin")
            ?.value
        ) ===
        ""
      ) {
        $("#forecastChangeNewMargin").value =
          Number(
            race.projected_margin ||
            0
          );
      }
    }
  );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutAdmin() {
  const button =
    $("#logout");

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "Logging out…";
  }

  try {
    const {
      error
    } =
      await sb.auth
        .signOut();

    if (error) {
      throw error;
    }

    location.href =
      "login.html";

  } catch (error) {

    console.error(
      "Logout failed:",
      error
    );

    msg(
      error.message ||
      "Unable to log out.",
      "error"
    );

    if (button) {
      button.disabled =
        false;

      button.textContent =
        "Log out";
    }
  }
}

function initializeLogout() {
  $("#logout")
    ?.addEventListener(
      "click",
      logoutAdmin
    );
}


/* =========================================================
   BUTTON LOADING HELPER
   ========================================================= */

function setButtonLoading(
  button,
  loading,
  loadingText =
    "Saving…"
) {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.originalText =
      button.textContent;

    button.disabled =
      true;

    button.textContent =
      loadingText;

    return;
  }

  button.disabled =
    false;

  button.textContent =
    button.dataset.originalText ||
    button.textContent;

  delete button.dataset
    .originalText;
}


/* =========================================================
   ADMIN ERROR DISPLAY
   ========================================================= */

function renderAdminFatalError(
  error
) {
  const main =
    $(".adminMain");

  if (!main) {
    return;
  }

  main.innerHTML = `
    <div class="card">

      <div class="kicker">
        ElectionLab Newsroom
      </div>

      <h1>
        Unable to load the admin portal
      </h1>

      <p class="subtle">
        ${escapeHtml(
          error?.message ||
          "An unknown error occurred."
        )}
      </p>

      <div class="toolbar">

        <button
          class="btn blue"
          type="button"
          onclick="location.reload()"
        >
          Try again
        </button>

        <a
          class="btn light"
          href="index.html"
        >
          Return to website
        </a>

      </div>

    </div>
  `;
}


/* =========================================================
   GLOBAL BUTTON FUNCTIONS

   The HTML uses inline onclick attributes, so these functions
   must be attached to window.
   ========================================================= */

Object.assign(
  window,
  {
    openModal,
    closeModal,

    editRace,
    deleteRace,

    editForecastChange,
    deleteForecastChange,

    editCandidate,
    deleteCandidate,

    editPoll,
    deletePoll,

    editGenericBallotPoll,
    deleteGenericBallotPoll,

    editApprovalPoll,
    deleteApprovalPoll,

    editPrimaryPoll,
    deletePrimaryPoll
  }
);


/* =========================================================
   ADMIN INITIALIZATION
   ========================================================= */

async function initializeAdmin() {
  try {
    initializeAdminPanels();

    initializeModalClosing();

    initializeAdminForms();

    initializeSpreadsheetControls();

    initializeRaceSlugHelper();

    initializeRaceOfDayNotice();

    initializeForecastHistoryAssist();

    initializeLogout();

    const authorized =
      await requireAdmin();

    if (!authorized) {
      return;
    }

    await reloadAll();

    showAdminPanel(
      "dashboardPanel"
    );

    msg(
      "ElectionLab Newsroom loaded."
    );

  } catch (error) {

    console.error(
      "Admin initialization failed:",
      error
    );

    renderAdminFatalError(
      error
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initializeAdmin
);
