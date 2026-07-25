const PUBLIC_DEFAULT_SETTINGS = {
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
    "23",

  homepage_featured_title:
    "America's Closest Races",

  homepage_featured_subtitle:
    "The elections most likely to shape control of Congress and the governorships."
};

let racePollingChart = null;

let activeRacePolls = [];

let activeRaceCandidates = [];

let activeChartRange = "90";

let approvalPollingChart = null;

let activeApprovalRange = "90";

/* =========================================================
   ELECTIONLAB MODEL 2.1 — PUBLIC DATA LAYER

   Public pages always receive the EFFECTIVE forecast:
   • automatic races use the latest model result
   • manually overridden races use the private override output

   Override mode, reasons, and model-vs-editor comparisons are
   never exposed by this file.
   ========================================================= */

let publicControlForecasts = [];
let activeRaceForecastHistory = [];
let activeRaceForecastResult = null;
let activeRaceDevelopments = [];
let activeRaceFundraising = [];

function publicNumber(
  value,
  fallback = null
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function effectiveRaceTimestamp(
  race = {}
) {
  return (
    race.effective_updated_at ||
    race.published_updated_at ||
    race.model_updated_at ||
    race.updated_at ||
    race.created_at ||
    null
  );
}

function applyEffectiveForecast(
  race = {}
) {
  const margin =
    publicNumber(
      race.effective_projected_margin,
      publicNumber(
        race.model_projected_margin,
        publicNumber(
          race.projected_margin,
          0
        )
      )
    );

  const rating =
    race.rating ||
    race.effective_rating ||
    race.model_rating ||
    "Toss-up";

  const demProbability =
    publicNumber(
      race.effective_dem_probability,
      publicNumber(
        race.model_dem_probability,
        null
      )
    );

  const repProbability =
    publicNumber(
      race.effective_rep_probability,
      publicNumber(
        race.model_rep_probability,
        demProbability === null
          ? null
          : 100 - demProbability
      )
    );

  const candidates =
    (race.candidates || []).map(
      candidate => {
        const party =
          normalizeParty(
            candidate.party
          );

        const next = {
          ...candidate
        };

        if (
          party === "D" &&
          demProbability !== null
        ) {
          next.win_probability =
            demProbability;

          next.expected_vote_share =
            roundTo(
              clamp(
                50 + margin / 2,
                0,
                100
              ),
              1
            );
        }

        if (
          party === "R" &&
          repProbability !== null
        ) {
          next.win_probability =
            repProbability;

          next.expected_vote_share =
            roundTo(
              clamp(
                50 - margin / 2,
                0,
                100
              ),
              1
            );
        }

        return next;
      }
    );

  return {
    ...race,
    projected_margin:
      margin,
    rating,
    dem_win_probability:
      demProbability,
    rep_win_probability:
      repProbability,
    public_updated_at:
      effectiveRaceTimestamp(
        race
      ),
    candidates
  };
}

async function hydrateEffectiveRaces(
  races = []
) {
  if (
    !sb ||
    !races.length
  ) {
    return races.map(
      applyEffectiveForecast
    );
  }

  const raceIds =
    races
      .map(race => race.id)
      .filter(Boolean);

  const {
    data: candidates,
    error
  } =
    await sb
      .from("candidates")
      .select("*")
      .in(
        "race_id",
        raceIds
      )
      .eq(
        "active",
        true
      );

  if (
    error &&
    !String(
      error.message ||
      ""
    ).toLowerCase()
      .includes("active")
  ) {
    throw error;
  }

  let candidateRows =
    candidates || [];

  if (
    error &&
    String(
      error.message ||
      ""
    ).toLowerCase()
      .includes("active")
  ) {
    const fallback =
      await sb
        .from("candidates")
        .select("*")
        .in(
          "race_id",
          raceIds
        );

    if (fallback.error) {
      throw fallback.error;
    }

    candidateRows =
      fallback.data || [];
  }

  const candidatesByRace =
    candidateRows.reduce(
      (
        lookup,
        candidate
      ) => {
        if (
          !lookup[
            candidate.race_id
          ]
        ) {
          lookup[
            candidate.race_id
          ] = [];
        }

        lookup[
          candidate.race_id
        ].push(
          candidate
        );

        return lookup;
      },
      {}
    );

  return races.map(
    race =>
      applyEffectiveForecast({
        ...race,
        candidates:
          candidatesByRace[
            race.id
          ] ||
          []
      })
  );
}

/*
  These functions intentionally replace the matching helpers from
  common.js. Maps, listing pages, homepage cards, and race pages all
  receive the same effective public forecast.
*/

async function getPublishedRaces(
  office = null
) {
  if (!sb) {
    return [];
  }

  let query =
    sb
      .from(
        "race_effective_forecasts"
      )
      .select("*")
      .eq(
        "status",
        "published"
      )
      .eq(
        "archived",
        false
      )
      .order(
        "state",
        {
          ascending:
            true
        }
      );

  const result =
    await query;

  if (result.error) {
    /*
      Fallback keeps the website online if the view has not reached
      the PostgREST schema cache yet.
    */
    let fallbackQuery =
      sb
        .from("races")
        .select("*")
        .eq(
          "status",
          "published"
        )
        .order(
          "state",
          {
            ascending:
              true
          }
        );

    const fallback =
      await fallbackQuery;

    if (fallback.error) {
      throw fallback.error;
    }

    const hydratedFallback =
      await hydrateEffectiveRaces(
        fallback.data || []
      );

    return office
      ? hydratedFallback.filter(
          race =>
            raceOffice(
              race
            ) ===
            office
        )
      : hydratedFallback;
  }

  const hydrated =
    await hydrateEffectiveRaces(
      result.data || []
    );

  return office
    ? hydrated.filter(
        race =>
          raceOffice(
            race
          ) ===
          office
      )
    : hydrated;
}

async function getPublishedRaceBySlug(
  slug
) {
  if (
    !sb ||
    !slug
  ) {
    return null;
  }

  const {
    data,
    error
  } =
    await sb
      .from(
        "race_effective_forecasts"
      )
      .select("*")
      .eq(
        "slug",
        slug
      )
      .eq(
        "status",
        "published"
      )
      .maybeSingle();

  if (error) {
    const fallback =
      await sb
        .from("races")
        .select("*")
        .eq(
          "slug",
          slug
        )
        .eq(
          "status",
          "published"
        )
        .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    if (!fallback.data) {
      return null;
    }

    const hydratedFallback =
      await hydrateEffectiveRaces([
        fallback.data
      ]);

    return (
      hydratedFallback[0] ||
      null
    );
  }

  if (!data) {
    return null;
  }

  const hydrated =
    await hydrateEffectiveRaces([
      data
    ]);

  return hydrated[0] || null;
}

async function getLatestControlForecasts() {
  if (!sb) {
    return [];
  }

  const {
    data,
    error
  } =
    await sb
      .from(
        "control_forecasts"
      )
      .select("*")
      .order(
        "calculated_at",
        {
          ascending:
            false
        }
      )
      .limit(30);

  if (error) {
    console.warn(
      "Control forecasts are unavailable:",
      error.message
    );

    return [];
  }

  const latest = {};

  (data || []).forEach(
    forecast => {
      if (
        !latest[
          forecast.chamber
        ]
      ) {
        latest[
          forecast.chamber
        ] =
          forecast;
      }
    }
  );

  publicControlForecasts =
    Object.values(
      latest
    );

  return publicControlForecasts;
}

function controlForecastFor(
  office
) {
  return (
    publicControlForecasts.find(
      forecast =>
        forecast.chamber ===
        office
    ) ||
    null
  );
}

function controlMessage(
  forecast,
  office
) {
  if (!forecast) {
    return null;
  }

  const rep =
    publicNumber(
      forecast
        .republican_control_probability,
      null
    );

  const dem =
    publicNumber(
      forecast
        .democratic_control_probability,
      null
    );

  const officeName =
    office === "house"
      ? "House"
      : office === "senate"
      ? "Senate"
      : "governorships";

  if (
    rep === null ||
    dem === null
  ) {
    return null;
  }

  const leader =
    rep >= dem
      ? "Republicans"
      : "Democrats";

  const probability =
    Math.max(
      rep,
      dem
    );

  if (
    office === "governor"
  ) {
    return `${leader} are projected to hold more governorships (${probability.toFixed(
      0
    )}% model probability)`;
  }

  return `${leader} are favored to control the ${officeName} (${probability.toFixed(
    0
  )}% chance)`;
}

function renderAutomaticControlForecasts() {
  document
    .querySelectorAll(
      "[data-counter-office]"
    )
    .forEach(
      counter => {
        const office =
          counter.dataset
            .counterOffice;

        const forecast =
          controlForecastFor(
            office
          );

        if (!forecast) {
          return;
        }

        const republican =
          safeSeatTotal(
            forecast
              .projected_republican_seats
          );

        const democratic =
          safeSeatTotal(
            forecast
              .projected_democratic_seats
          );

        const tossup =
          safeSeatTotal(
            forecast
              .projected_tossup_seats
          );

        const republicanBox =
          counter.querySelector(
            "[data-counter-value='republican']"
          );

        const democraticBox =
          counter.querySelector(
            "[data-counter-value='democratic']"
          );

        const tossupBox =
          counter.querySelector(
            "[data-counter-value='tossup']"
          );

        if (republicanBox) {
          republicanBox.textContent =
            String(
              republican
            );
        }

        if (democraticBox) {
          democraticBox.textContent =
            String(
              democratic
            );
        }

        if (tossupBox) {
          tossupBox.textContent =
            String(
              tossup
            );
        }

        const updated =
          counter.querySelector(
            ".forecastCounterUpdated"
          ) ||
          document.createElement(
            "div"
          );

        updated.className =
          "forecastCounterUpdated";

        updated.textContent =
          `Updated ${formatTimestamp(
            forecast.calculated_at
          )}`;

        if (
          !updated.parentElement
        ) {
          counter.appendChild(
            updated
          );
        }
      }
    );

  const senate =
    controlForecastFor(
      "senate"
    );

  const house =
    controlForecastFor(
      "house"
    );

  const senateText =
    controlMessage(
      senate,
      "senate"
    );

  const houseText =
    controlMessage(
      house,
      "house"
    );

  if (senateText) {
    setTextForSelectors(
      [
        "#senateControlMessage",
        "#senateForecastText"
      ],
      senateText
    );
  }

  if (houseText) {
    setTextForSelectors(
      [
        "#houseControlMessage",
        "#houseForecastText"
      ],
      houseText
    );
  }
}

async function loadAutomaticControlForecasts() {
  await getLatestControlForecasts();

  renderAutomaticControlForecasts();
}

function relativeUpdateText(
  value
) {
  if (!value) {
    return "Update time unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Update time unavailable";
  }

  const difference =
    Date.now() -
    date.getTime();

  const minutes =
    Math.max(
      0,
      Math.round(
        difference /
        60000
      )
    );

  if (minutes < 1) {
    return "Updated just now";
  }

  if (minutes < 60) {
    return `Updated ${minutes} ${
      minutes === 1
        ? "minute"
        : "minutes"
    } ago`;
  }

  const hours =
    Math.round(
      minutes / 60
    );

  if (hours < 24) {
    return `Updated ${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    } ago`;
  }

  return `Updated ${fmtDate(
    value
  )}`;
}

function momentumMarkup(
  race
) {
  const movement =
    publicNumber(
      race.momentum_7d,
      null
    );

  if (
    movement === null ||
    Math.abs(
      movement
    ) < 0.05
  ) {
    return `
      <span class="raceMomentum neutral">
        Stable
      </span>
    `;
  }

  const party =
    movement > 0
      ? "D"
      : "R";

  return `
    <span class="raceMomentum ${
      party === "D"
        ? "democratic"
        : "republican"
    }">
      ${party} +${Math.abs(
        movement
      ).toFixed(1)}
      this week
    </span>
  `;
}

async function getRaceForecastHistory(
  raceId
) {
  if (
    !sb ||
    !raceId
  ) {
    return [];
  }

  const {
    data,
    error
  } =
    await sb
      .from(
        "forecast_history"
      )
      .select(
        "published_margin,dem_probability,rep_probability,rating,created_at"
      )
      .eq(
        "race_id",
        raceId
      )
      .order(
        "created_at",
        {
          ascending:
            true
        }
      )
      .limit(500);

  if (error) {
    console.warn(
      "Forecast history unavailable:",
      error.message
    );

    return [];
  }

  return data || [];
}

async function getRaceForecastResult(
  raceId
) {
  if (
    !sb ||
    !raceId
  ) {
    return null;
  }

  const {
    data,
    error
  } =
    await sb
      .from(
        "forecast_results"
      )
      .select("*")
      .eq(
        "race_id",
        raceId
      )
      .maybeSingle();

  if (error) {
    console.warn(
      "Forecast result unavailable:",
      error.message
    );

    return null;
  }

  return data || null;
}

async function getRaceDevelopments(
  raceId
) {
  if (
    !sb ||
    !raceId
  ) {
    return [];
  }

  const {
    data,
    error
  } =
    await sb
      .from(
        "race_developments"
      )
      .select("*")
      .eq(
        "race_id",
        raceId
      )
      .eq(
        "status",
        "published"
      )
      .order(
        "event_date",
        {
          ascending:
            false
        }
      )
      .limit(8);

  if (error) {
    return [];
  }

  return data || [];
}

async function getRaceFundraising(
  raceId
) {
  if (
    !sb ||
    !raceId
  ) {
    return [];
  }

  const {
    data,
    error
  } =
    await sb
      .from(
        "fundraising"
      )
      .select(
        "*,candidates(name,party)"
      )
      .eq(
        "race_id",
        raceId
      )
      .order(
        "reporting_date",
        {
          ascending:
            false
        }
      );

  if (error) {
    return [];
  }

  const latest = {};

  (data || []).forEach(
    row => {
      if (
        !latest[
          row.candidate_id
        ]
      ) {
        latest[
          row.candidate_id
        ] =
          row;
      }
    }
  );

  return Object.values(
    latest
  );
}

function formatMoney(
  value
) {
  const number =
    publicNumber(
      value,
      0
    );

  if (
    Math.abs(number) >=
    1000000
  ) {
    return `$${(
      number /
      1000000
    ).toFixed(1)}M`;
  }

  if (
    Math.abs(number) >=
    1000
  ) {
    return `$${(
      number /
      1000
    ).toFixed(0)}K`;
  }

  return `$${number.toFixed(
    0
  )}`;
}

function modelBreakdownLabel(
  value
) {
  const number =
    publicNumber(
      value,
      0
    );

  if (
    Math.abs(number) <
    0.05
  ) {
    return "Even";
  }

  return formatMargin(
    number
  );
}

function insertRaceModelSections(
  race
) {
  const root =
    document.querySelector(
      "#raceRoot"
    );

  if (!root) {
    return;
  }

  const result =
    activeRaceForecastResult;

  const history =
    activeRaceForecastHistory;

  const developments =
    activeRaceDevelopments;

  const fundraising =
    activeRaceFundraising;

  const firstSection =
    root.querySelector(
      ".section"
    );

  if (
    result &&
    firstSection
  ) {
    const section =
      document.createElement(
        "section"
      );

    section.className =
      "section publicModelSection";

    section.innerHTML = `
      <div class="sectionHead">
        <div>
          <div class="kicker">
            Forecast Breakdown
          </div>

          <h2>
            What is shaping this race
          </h2>

          <p>
            Each factor shows which party currently benefits and by how much.
          </p>
        </div>

        <div class="publicForecastUpdated">
          ${escapeHtml(
            relativeUpdateText(
              race.public_updated_at
            )
          )}
          <br>
          <small>
            Model ${escapeHtml(
              result.model_version ||
              race.model_version ||
              "2.1"
            )}
          </small>
        </div>
      </div>

      <div class="forecastBreakdownCard">

        <div class="forecastBreakdownHeader">
          <div>
            <span class="forecastBreakdownEyebrow">
              Current model projection
            </span>

            <strong class="forecastBreakdownMargin">
              ${escapeHtml(
                formatMargin(
                  result.final_model_margin
                )
              )}
            </strong>
          </div>

          <div class="forecastBreakdownRating">
            ${escapeHtml(
              race.rating ||
              result.rating ||
              "Toss-up"
            )}
          </div>
        </div>

        <div class="forecastFactorList">

          ${[
            {
              label: "Fundamentals",
              value: result.fundamentals_margin,
              detail: "Partisan lean, prior results, and national environment"
            },
            {
              label: "Polling",
              value: result.polling_margin,
              detail: `${(
                publicNumber(
                  result.polling_weight,
                  0
                ) * 100
              ).toFixed(0)}% of the forecast`
            },
            {
              label: "Candidate strength",
              value: result.candidate_margin,
              detail: "Experience, favorability, campaign, and liabilities"
            },
            {
              label: "Fundraising",
              value: result.fundraising_margin,
              detail: "Cash, spending, and financial strength"
            },
            {
              label: "Incumbency",
              value: result.incumbency_margin,
              detail: "Officeholder advantage"
            },
            {
              label: "Approval",
              value: result.approval_margin,
              detail: "Race-specific approval evidence"
            }
          ].map(
            factor => {
              const value =
                publicNumber(
                  factor.value,
                  0
                );

              const direction =
                Math.abs(value) < 0.05
                  ? "even"
                  : value > 0
                  ? "dem"
                  : "rep";

              const strength =
                Math.min(
                  100,
                  Math.max(
                    4,
                    Math.abs(value) / 6 * 100
                  )
                );

              return `
                <article class="forecastFactorRow">

                  <div class="forecastFactorCopy">

                    <div class="forecastFactorTitle">
                      ${escapeHtml(
                        factor.label
                      )}
                    </div>

                    <div class="forecastFactorDetail">
                      ${escapeHtml(
                        factor.detail
                      )}
                    </div>

                  </div>

                  <div class="forecastFactorVisual">

                    <div class="forecastFactorScale">

                      <span class="forecastFactorCenter"></span>

                      ${
                        direction === "dem"
                          ? `
                            <span
                              class="forecastFactorFill dem"
                              style="width:${strength / 2}%"
                            ></span>
                          `
                          : direction === "rep"
                          ? `
                            <span
                              class="forecastFactorFill rep"
                              style="width:${strength / 2}%"
                            ></span>
                          `
                          : `
                            <span class="forecastFactorEvenMark"></span>
                          `
                      }

                    </div>

                    <div class="forecastFactorValue ${direction}">
                      ${
                        direction === "even"
                          ? "Even"
                          : escapeHtml(
                              formatMargin(
                                value
                              )
                            )
                      }
                    </div>

                  </div>

                </article>
              `;
            }
          ).join("")}

        </div>

      </div>
    `;

    firstSection.insertAdjacentElement(
      "afterend",
      section
    );
  }

  if (
    history.length >= 2
  ) {
    const section =
      document.createElement(
        "section"
      );

    section.className =
      "section forecastHistoryPublic";

    section.innerHTML = `
      <div class="sectionHead">
        <div>
          <div class="kicker">
            Forecast History
          </div>

          <h2>
            How the forecast has moved
          </h2>

          <p>
            Published ElectionLab margin over time.
          </p>
        </div>
      </div>

      <article class="card publicHistoryCard">
        <div class="publicHistoryChartWrap">
          <canvas
            id="publicForecastHistoryChart"
            aria-label="Forecast history chart"
            role="img"
          ></canvas>
        </div>
      </article>
    `;

    root.appendChild(
      section
    );

    renderPublicForecastHistoryChart(
      history
    );
  }

  if (
    fundraising.length
  ) {
    const section =
      document.createElement(
        "section"
      );

    section.className =
      "section";

    section.innerHTML = `
      <div class="sectionHead">
        <div>
          <div class="kicker">
            Campaign Finance
          </div>

          <h2>
            Fundraising snapshot
          </h2>
        </div>
      </div>

      <div class="grid2">
        ${fundraising
          .slice(0, 4)
          .map(
            row => `
              <article class="card fundraisingPublicCard">
                <div class="candidateForecastIdentity">
                  <i class="partyDot ${partyCssClass(
                    row.candidates?.party ||
                    "I"
                  )}"></i>

                  <strong>
                    ${escapeHtml(
                      row.candidates?.name ||
                      "Candidate"
                    )}
                  </strong>
                </div>

                <div class="fundraisingPublicNumbers">
                  <div>
                    <span>Raised</span>
                    <strong>
                      ${formatMoney(
                        row.total_raised
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Cash on hand</span>
                    <strong>
                      ${formatMoney(
                        row.cash_on_hand
                      )}
                    </strong>
                  </div>
                </div>

                <small class="subtle">
                  Report through ${escapeHtml(
                    fmtDate(
                      row.reporting_date
                    )
                  )}
                </small>
              </article>
            `
          )
          .join("")}
      </div>
    `;

    root.appendChild(
      section
    );
  }

  if (
    developments.length
  ) {
    const section =
      document.createElement(
        "section"
      );

    section.className =
      "section";

    section.innerHTML = `
      <div class="sectionHead">
        <div>
          <div class="kicker">
            Latest Developments
          </div>

          <h2>
            Race updates
          </h2>
        </div>
      </div>

      <div class="card developmentList">
        ${developments
          .map(
            development => `
              <article class="developmentItem">
                <time>
                  ${escapeHtml(
                    fmtDate(
                      development.event_date
                    )
                  )}
                </time>

                <div>
                  <strong>
                    ${escapeHtml(
                      development.headline ||
                      development.title ||
                      "Race update"
                    )}
                  </strong>

                  ${
                    development.summary ||
                    development.description
                      ? `
                        <p>
                          ${escapeHtml(
                            development.summary ||
                            development.description
                          )}
                        </p>
                      `
                      : ""
                  }
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;

    root.appendChild(
      section
    );
  }
}

function renderPublicForecastHistoryChart(
  history
) {
  const canvas =
    document.querySelector(
      "#publicForecastHistoryChart"
    );

  if (
    !canvas ||
    typeof Chart ===
      "undefined"
  ) {
    return;
  }

  new Chart(
    canvas,
    {
      type:
        "line",

      data: {
        labels:
          history.map(
            point =>
              fmtDate(
                point.created_at
              )
          ),

        datasets: [
          {
            label:
              "Published margin",

            data:
              history.map(
                point =>
                  publicNumber(
                    point.published_margin,
                    0
                  )
              ),

            borderWidth:
              3,

            pointRadius:
              history.length > 25
                ? 0
                : 3,

            pointHoverRadius:
              5,

            tension:
              0.28,

            fill:
              false
          }
        ]
      },

      options: {
        responsive:
          true,

        maintainAspectRatio:
          false,

        interaction: {
          mode:
            "index",

          intersect:
            false
        },

        plugins: {
          legend: {
            display:
              false
          },

          tooltip: {
            callbacks: {
              label(
                context
              ) {
                return formatMargin(
                  context.parsed.y
                );
              }
            }
          }
        },

        scales: {
          x: {
            grid: {
              display:
                false
            }
          },

          y: {
            grid: {
              color:
                "rgba(130,149,178,.16)"
            },

            ticks: {
              callback(
                value
              ) {
                return formatMargin(
                  value
                );
              }
            }
          }
        }
      }
    }
  );
}



/* =========================================================
   WEBSITE SETTINGS
   ========================================================= */

async function getPublicSettings() {
  return getSiteSettings(
    PUBLIC_DEFAULT_SETTINGS
  );
}

function setTextForSelectors(
  selectors,
  text
) {
  selectors.forEach(
    selector => {
      const elements =
        document.querySelectorAll(
          selector
        );

      elements.forEach(
        element => {
          element.textContent =
            text;
        }
      );
    }
  );
}

function safeSeatTotal(
  value,
  fallback = 0
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return fallback;
  }

  return Math.round(number);
}

function renderForecastCounter(
  settings
) {
  const counters =
    document.querySelectorAll(
      "[data-counter-office]"
    );

  counters.forEach(
    counter => {
      const office =
        counter.dataset
          .counterOffice;

      if (
        ![
          "senate",
          "house",
          "governor"
        ].includes(office)
      ) {
        return;
      }

      const republican =
        safeSeatTotal(
          settings[
            `${office}_republican_seats`
          ]
        );

      const tossup =
        safeSeatTotal(
          settings[
            `${office}_tossup_seats`
          ]
        );

      const democratic =
        safeSeatTotal(
          settings[
            `${office}_democratic_seats`
          ]
        );

      const republicanBox =
        counter.querySelector(
          "[data-counter-value='republican']"
        );

      const tossupBox =
        counter.querySelector(
          "[data-counter-value='tossup']"
        );

      const democraticBox =
        counter.querySelector(
          "[data-counter-value='democratic']"
        );

      if (republicanBox) {
        republicanBox.textContent =
          String(republican);
      }

      if (tossupBox) {
        tossupBox.textContent =
          String(tossup);
      }

      if (democraticBox) {
        democraticBox.textContent =
          String(democratic);
      }
    }
  );
}

async function loadWebsiteSettings() {
  const needsSettings =
    document.querySelector(
      "#senateControlMessage"
    ) ||
    document.querySelector(
      "#houseControlMessage"
    ) ||
    document.querySelector(
      "#congressControlMessage"
    ) ||
    document.querySelector(
      "#featuredRacesTitle"
    ) ||
    document.querySelector(
      "#featuredRacesSubtitle"
    ) ||
    document.querySelector(
      "[data-setting]"
    ) ||
    document.querySelector(
      "[data-counter-office]"
    );

  if (!needsSettings) {
    return;
  }

  try {
    const settings =
      await getPublicSettings();

    setTextForSelectors(
      [
        "#senateControlMessage",
        "#senateForecastText",
        "[data-setting='senate_control_message']"
      ],
      settings
        .senate_control_message
    );

    setTextForSelectors(
      [
        "#houseControlMessage",
        "#houseForecastText",
        "[data-setting='house_control_message']"
      ],
      settings
        .house_control_message
    );

    setTextForSelectors(
      [
        "#congressControlMessage",
        "[data-setting='congress_control_message']"
      ],
      settings
        .congress_control_message
    );

    setTextForSelectors(
      [
        "#featuredRacesTitle",
        "[data-setting='homepage_featured_title']"
      ],
      settings
        .homepage_featured_title
    );

    setTextForSelectors(
      [
        "#featuredRacesSubtitle",
        "[data-setting='homepage_featured_subtitle']"
      ],
      settings
        .homepage_featured_subtitle
    );

    renderForecastCounter(
      settings
    );
  } catch (error) {
    console.error(
      "Website settings failed:",
      error
    );
  }
}


/* =========================================================
   RACE CARDS
   ========================================================= */

function raceCard(
  race
) {
  const candidates =
    sortCandidates(
      race.candidates || []
    );

  const office =
    raceOffice(race);

  const label =
    officeLabel(office);

  const margin =
    publicNumber(
      race.projected_margin,
      0
    );

  const candidateMarkup =
    candidates.length
      ? candidates
          .slice(0, 3)
          .map(
            candidate => `
              <div class="candidateLine">

                <span>

                  <i
                    class="partyDot ${partyCssClass(
                      candidate.party
                    )}"
                  ></i>

                  ${escapeHtml(
                    candidate.name ||
                    "Unnamed candidate"
                  )}

                </span>

                <strong>
                  ${Number(
                    candidate
                      .win_probability ||
                    0
                  ).toFixed(0)}%
                </strong>

              </div>
            `
          )
          .join("")
      : `
        <p class="subtle">
          No candidates added yet.
        </p>
      `;

  return `
    <a
      class="card raceCard"
      href="race.html?id=${encodeURIComponent(
        race.slug || ""
      )}"
    >

      <div class="raceMeta">

        <span>
          ${escapeHtml(
            race.state || ""
          )}
          ·
          ${escapeHtml(label)}
        </span>

        <span
          class="badge ${ratingClass(
            race.rating
          )}"
        >
          ${escapeHtml(
            race.rating ||
            "Toss-up"
          )}
        </span>

      </div>

      <h3>
        ${escapeHtml(
          race.title ||
          "Untitled race"
        )}
      </h3>

      <div class="candidates">
        ${candidateMarkup}
      </div>

      <div class="raceMeta">

        <span>
          Projected margin
        </span>

        <strong>
          ${formatMargin(
            margin
          )}
        </strong>

      </div>

      <div class="raceCardUpdateRow">
        ${momentumMarkup(
          race
        )}

        <span>
          ${escapeHtml(
            relativeUpdateText(
              race.public_updated_at
            )
          )}
        </span>
      </div>

    </a>
  `;
}


/* =========================================================
   HOMEPAGE
   ========================================================= */

function raceImportanceScore(
  race
) {
  const rating =
    normalizeText(
      race.rating
    );

  const margin =
    Math.abs(
      Number(
        race.projected_margin ||
        0
      )
    );

  let score =
    publicNumber(
      race.auto_feature_score,
      100 -
      Math.min(
        100,
        margin * 7
      )
    );

  if (
    rating.includes("toss")
  ) {
    score += 50;
  } else if (
    rating.includes("tilt")
  ) {
    score += 40;
  } else if (
    rating.includes("lean")
  ) {
    score += 25;
  } else if (
    rating.includes("likely")
  ) {
    score += 10;
  }

  if (race.featured) {
    score += 100;
  }

  if (
    race.race_of_the_day
  ) {
    score += 200;
  }

  return score;
}

function selectFeaturedRaces(
  races
) {
  return [...races]
    .sort(
      (
        first,
        second
      ) =>
        raceImportanceScore(
          second
        ) -
        raceImportanceScore(
          first
        )
    )
    .slice(0, 6);
}

async function loadHome() {
  const box =
    document.querySelector(
      "#featuredRaces"
    );

  if (!box) {
    return;
  }

  if (!configured) {
    box.innerHTML = `
      <div class="empty">
        Connect Supabase to load published races.
      </div>
    `;

    return;
  }

  try {
    const races =
      await getPublishedRaces();

    const count =
      document.querySelector(
        "#raceCount"
      );

    if (count) {
      count.textContent =
        String(
          races.length
        );
    }

    const featured =
      selectFeaturedRaces(
        races
      );

    box.innerHTML =
      featured.length
        ? featured
            .map(raceCard)
            .join("")
        : `
          <div class="empty">
            No published races yet.
          </div>
        `;

    renderRaceOfTheDay(
      races
    );
  } catch (error) {
    console.error(
      "Homepage failed:",
      error
    );

    renderLoadError(
      box,
      error,
      "Unable to load published races."
    );
  }
}
function renderRaceOfTheDay(
  races
) {
  const container =
    document.querySelector(
      "#raceOfTheDay"
    );

  if (!container) {
    return;
  }

  const selected =
    races.find(
      race =>
        race.race_of_the_day
    ) ||
    races.find(
      race =>
        race.featured
    ) ||
    [...races].sort(
      (
        first,
        second
      ) =>
        raceImportanceScore(
          second
        ) -
        raceImportanceScore(
          first
        )
    )[0];

  if (!selected) {
    container.style.display =
      "none";

    return;
  }

  const candidates =
    sortCandidates(
      selected.candidates ||
      []
    );

  const margin =
    Number(
      selected.projected_margin ||
      0
    );

  container.style.display =
    "";

  container.innerHTML = `
    <a
      class="raceOfDayCard"
      href="race.html?id=${encodeURIComponent(
        selected.slug ||
        ""
      )}"
    >

      <div class="raceOfDayTopline">

        <span class="raceOfDayBadge">
          ★ Race of the Day
        </span>

        <span
          class="badge ${ratingClass(
            selected.rating
          )}"
        >
          ${escapeHtml(
            selected.rating ||
            "Toss-up"
          )}
        </span>

      </div>

      <div class="raceOfDayGrid">

        <div>

          <div class="kicker">
            ${escapeHtml(
              selected.state ||
              ""
            )}
            ·
            ${escapeHtml(
              officeLabel(
                raceOffice(
                  selected
                )
              )
            )}
          </div>

          <h2>
            ${escapeHtml(
              selected.title ||
              "Featured race"
            )}
          </h2>

          <p>
            ${escapeHtml(
              selected.summary ||
              "One of the most closely watched elections in the country."
            )}
          </p>

        </div>

        <div class="raceOfDayNumbers">

          <strong>
            ${formatMargin(
              margin
            )}
          </strong>

          <span>
            ElectionLab model margin
          </span>

        </div>

      </div>

      <div class="raceOfDayCandidates">

        ${
          candidates.length
            ? candidates
                .slice(0, 3)
                .map(
                  candidate => `
                    <span>

                      <i
                        class="partyDot ${partyCssClass(
                          candidate.party
                        )}"
                      ></i>

                      ${escapeHtml(
                        candidate.name ||
                        ""
                      )}

                      <b>
                        ${Number(
                          candidate
                            .win_probability ||
                          0
                        ).toFixed(0)}%
                      </b>

                    </span>
                  `
                )
                .join("")
            : `
              <span>
                Candidate information coming soon.
              </span>
            `
        }

      </div>

      <div class="raceOfDayLink">
        View full forecast →
      </div>

    </a>
  `;
}


/* =========================================================
   RACE LISTING PAGES
   ========================================================= */

async function loadRaceGrid() {
  const box =
    document.querySelector(
      "#raceGrid"
    );

  if (!box) {
    return;
  }

  const office =
    currentPageOffice();

  const label =
    officeLabel(
      office
    );

  if (!configured) {
    box.innerHTML = `
      <div class="empty">
        Connect Supabase to display published
        ${escapeHtml(label)} races.
      </div>
    `;

    return;
  }

  try {
    const races =
      await getPublishedRaces(
        office
      );

    function displayRaces(
      list
    ) {
      box.innerHTML =
        list.length
          ? list
              .map(raceCard)
              .join("")
          : `
            <div class="empty">
              No published
              ${escapeHtml(label)}
              races found.
            </div>
          `;
    }

    displayRaces(
      races
    );

    const input =
      document.querySelector(
        "#raceSearch"
      );

    if (input) {
      input.addEventListener(
        "input",
        () => {
          const query =
            normalizeText(
              input.value
            );

          if (!query) {
            displayRaces(
              races
            );

            return;
          }

          const filtered =
            races.filter(
              race => {
                const searchable =
                  [
                    race.title,
                    race.state,
                    race.slug,
                    race.rating,
                    ...(
                      race.candidates ||
                      []
                    ).map(
                      candidate =>
                        candidate.name
                    )
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(
                  query
                );
              }
            );

          displayRaces(
            filtered
          );
        }
      );
    }
  } catch (error) {
    console.error(
      "Race grid failed:",
      error
    );

    renderLoadError(
      box,
      error,
      "Unable to load races."
    );
  }
}


/* =========================================================
   RACE PAGE
   ========================================================= */

async function loadRace() {
  const root =
    document.querySelector(
      "#raceRoot"
    );

  if (!root) {
    return;
  }

  if (!configured) {
    root.innerHTML = `
      <div class="empty">
        Connect Supabase to load this race.
      </div>
    `;

    return;
  }

  try {
    const slug =
      new URLSearchParams(
        location.search
      ).get("id");

    if (!slug) {
      root.innerHTML = `
        <div class="empty">
          No race was selected.
        </div>
      `;

      return;
    }

    const race =
      await getPublishedRaceBySlug(
        slug
      );

    if (!race) {
      root.innerHTML = `
        <div class="empty">
          Published race not found.
        </div>
      `;

      return;
    }

    const [
      polls,
      forecastHistory,
      forecastResult,
      developments,
      fundraising
    ] =
      await Promise.all([
        getPublishedPolls(
          race.id
        ),
        getRaceForecastHistory(
          race.id
        ),
        getRaceForecastResult(
          race.id
        ),
        getRaceDevelopments(
          race.id
        ),
        getRaceFundraising(
          race.id
        )
      ]);

    activeRacePolls =
      polls;

    activeRaceForecastHistory =
      forecastHistory;

    activeRaceForecastResult =
      forecastResult;

    activeRaceDevelopments =
      developments;

    activeRaceFundraising =
      fundraising;

    activeRaceCandidates =
      sortCandidates(
        race.candidates ||
        []
      );

    const template =
      document.querySelector(
        "#racePageTemplate"
      );

    if (!template) {
      throw new Error(
        "The race page template could not be found."
      );
    }

    root.innerHTML =
      template.innerHTML;

    document.title =
      `${race.title || "Election Forecast"} | ElectionLab`;

    renderRaceHeader(
      race
    );

    renderRaceForecast(
      race,
      activeRaceCandidates,
      polls
    );

    renderRacePollingAverage(
      race,
      activeRaceCandidates,
      polls
    );

    renderRacePollingMetadata(
      race,
      polls
    );

    renderRacePollTable(
      race,
      polls
    );

    initializeRaceChartControls(
      polls,
      activeRaceCandidates
    );

    renderRacePollingChart(
      polls,
      activeRaceCandidates,
      activeChartRange
    );

    insertRaceModelSections(
      race
    );
  } catch (error) {
    console.error(
      "Race page failed:",
      error
    );

    renderLoadError(
      root,
      error,
      "Unable to load this race."
    );
  }
}

function renderRaceHeader(
  race
) {
  const office =
    raceOffice(
      race
    );

  const label =
    officeLabel(
      office
    );

  const candidates =
    sortCandidates(
      race.candidates ||
      []
    );

  const leader =
    candidates[0];

  setElementText(
    "#raceKicker",
    `2026 ${label} Forecast`
  );

  setElementText(
    "#raceTitle",
    race.title ||
    "Election Forecast"
  );

  setElementText(
    "#raceSummary",
    race.summary ||
    "ElectionLab's published forecast and polling average."
  );

  const ratingBadge =
    document.querySelector(
      "#raceRatingBadge"
    );

  if (ratingBadge) {
    ratingBadge.textContent =
      race.rating ||
      "Toss-up";

    ratingBadge.className =
      `badge ${ratingClass(
        race.rating
      )}`;
  }

  setElementText(
    "#raceOfficeBadge",
    label
  );

  setElementText(
    "#raceStateBadge",
    race.state ||
    "National"
  );

  if (leader) {
    setElementText(
      "#raceLeaderProbability",
      `${Number(
        leader.win_probability ||
        0
      ).toFixed(0)}%`
    );

    setElementText(
      "#raceLeaderName",
      leader.name ||
      "Leading candidate"
    );

    setElementText(
      "#raceLeaderVote",
      `${Number(
        leader.expected_vote_share ||
        0
      ).toFixed(1)}% projected vote`
    );

    const leaderCard =
      document.querySelector(
        ".raceLeaderCard"
      );

    if (leaderCard) {
      leaderCard.dataset.party =
        normalizeParty(
          leader.party
        );
    }
  } else {
    setElementText(
      "#raceLeaderProbability",
      "—"
    );

    setElementText(
      "#raceLeaderName",
      "No candidate data"
    );

    setElementText(
      "#raceLeaderVote",
      "Add candidates in the admin portal"
    );
  }
}
function renderRaceForecast(
  race,
  candidates,
  polls
) {
  const list =
    document.querySelector(
      "#candidateForecastList"
    );

  const margin =
    Number(
      race.projected_margin ||
      0
    );

  setElementText(
    "#raceProjectedMargin",
    formatMargin(
      margin
    )
  );

  const confidence =
    forecastConfidence(
      polls
    );

  setElementText(
    "#forecastConfidenceText",
    `${confidence.level} · ${confidence.score}/100`
  );

  const badge =
    document.querySelector(
      "#forecastConfidenceBadge"
    );

  if (badge) {
    badge.textContent =
      `${confidence.level} confidence`;

    badge.className =
      `confidenceBadge confidence-${normalizeText(
        confidence.level
      )}`;
  }

  if (!list) {
    return;
  }

  if (!candidates.length) {
    list.innerHTML = `
      <p class="subtle">
        No candidates have been added yet.
      </p>
    `;

    return;
  }

  list.innerHTML =
    candidates
      .map(
        candidate => {
          const party =
            normalizeParty(
              candidate.party
            );

          const winProbability =
            clamp(
              candidate.win_probability,
              0,
              100
            );

          const expectedVote =
            Number(
              candidate.expected_vote_share ||
              0
            );

          return `
            <div class="candidateForecastRow">

              <div class="candidateForecastIdentity">

                <i
                  class="partyDot ${partyCssClass(
                    party
                  )}"
                ></i>

                <div>

                  <strong>
                    ${escapeHtml(
                      candidate.name ||
                      "Unnamed candidate"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      partyName(
                        party
                      )
                    )}
                  </span>

                </div>

              </div>

              <div class="candidateForecastNumbers">

                <div>

                  <span>
                    Win chance
                  </span>

                  <strong>
                    ${winProbability.toFixed(
                      0
                    )}%
                  </strong>

                </div>

                <div>

                  <span>
                    Projected vote
                  </span>

                  <strong>
                    ${expectedVote.toFixed(
                      1
                    )}%
                  </strong>

                </div>

              </div>

              <div class="candidateForecastMeter">

                <span
                  style="
                    width:${winProbability}%;
                    background:${partyColor(
                      party
                    )};
                  "
                ></span>

              </div>

            </div>
          `;
        }
      )
      .join("");
}

function renderRacePollingAverage(
  race,
  candidates,
  polls
) {
  const average =
    weightedAverage(
      polls
    );

  const marginBox =
    document.querySelector(
      "#pollingAverageMargin"
    );

  const rows =
    document.querySelector(
      "#pollingCandidateRows"
    );

  const bar =
    document.querySelector(
      "#pollingShareBar"
    );

  const legend =
    document.querySelector(
      "#pollingBarLegend"
    );

  const meta =
    document.querySelector(
      "#pollingAverageMeta"
    );

  if (!average) {
    if (marginBox) {
      marginBox.textContent =
        "—";
    }

    if (rows) {
      rows.innerHTML = `
        <p class="subtle">
          No published polls yet.
        </p>
      `;
    }

    if (bar) {
      bar.innerHTML =
        "";
    }

    if (legend) {
      legend.innerHTML =
        "";
    }

    if (meta) {
      meta.textContent =
        "Add published polls to calculate an average.";
    }

    return;
  }

  const segments =
    pollingBarSegments(
      average,
      candidates
    );

  const majorSegments =
    segments.filter(
      segment =>
        segment.party !==
        "OTHER"
    );

  if (marginBox) {
    marginBox.textContent =
      formatMargin(
        average.margin
      );

    marginBox.className =
      `pollingAverageMargin ${
        average.margin >= 0
          ? "democratic"
          : "republican"
      }`;
  }

  if (rows) {
    rows.innerHTML =
      majorSegments
        .map(
          segment => `
            <div class="pollingCandidateRow">

              <div class="pollingCandidateName">

                <i
                  class="partyDot ${partyCssClass(
                    segment.party
                  )}"
                ></i>

                <span>
                  ${escapeHtml(
                    segment.label
                  )}
                </span>

              </div>

              <strong
                style="
                  color:${segment.color};
                "
              >
                ${Number(
                  segment.value
                ).toFixed(1)}%
              </strong>

            </div>
          `
        )
        .join("");
  }

  if (bar) {
    bar.innerHTML =
      segments
        .map(
          segment => `
            <span
              class="pollingShareSegment"
              title="${escapeHtml(
                segment.label
              )}: ${Number(
                segment.value
              ).toFixed(1)}%"
              style="
                width:${Math.max(
                  0,
                  Number(
                    segment.value
                  )
                )}%;
                background:${segment.color};
              "
            ></span>
          `
        )
        .join("");
  }

  if (legend) {
    legend.innerHTML =
      segments
        .map(
          segment => `
            <span>

              <i
                style="
                  background:${segment.color};
                "
              ></i>

              ${escapeHtml(
                segment.label
              )}

              <b>
                ${Number(
                  segment.value
                ).toFixed(1)}%
              </b>

            </span>
          `
        )
        .join("");
  }

  if (meta) {
    const metadata =
      pollingMetadata(
        polls
      );

    const parts = [
      `${metadata.pollCount} ${
        metadata.pollCount === 1
          ? "poll"
          : "polls"
      }`
    ];

    if (
      metadata.startDate &&
      metadata.endDate
    ) {
      parts.push(
        `${fmtDate(
          metadata.startDate
        )} – ${fmtDate(
          metadata.endDate
        )}`
      );
    }

    if (
      metadata.latestPollster
    ) {
      parts.push(
        `Latest: ${metadata.latestPollster}`
      );
    }

    meta.textContent =
      parts.join(" · ");
  }
}

function renderRacePollingMetadata(
  race,
  polls
) {
  const metadata =
    pollingMetadata(
      polls
    );

  setElementText(
    "#racePollCount",
    String(
      metadata.pollCount
    )
  );

  setElementText(
    "#racePollFieldDates",
    metadata.startDate &&
    metadata.endDate
      ? `${fmtDate(
          metadata.startDate
        )} – ${fmtDate(
          metadata.endDate
        )}`
      : "—"
  );

  setElementText(
    "#raceLatestPollster",
    metadata.latestPollster ||
    "—"
  );

  setElementText(
    "#raceLatestPollDate",
    metadata.latestPoll
      ? fmtDateRange(
          metadata.latestPoll
            .start_date,
          metadata.latestPoll
            .end_date
        )
      : "—"
  );

  const updatedAt =
    race.public_updated_at ||
    effectiveRaceTimestamp(
      race
    ) ||
    metadata.latestPoll
      ?.updated_at ||
    metadata.latestPoll
      ?.created_at ||
    metadata.endDate;

  setElementText(
    "#pollingChartUpdated",
    `Forecast updated: ${formatTimestamp(
      updatedAt
    )}`
  );
}

function renderRacePollTable(
  race,
  polls
) {
  const body =
    document.querySelector(
      "#racePollTable"
    );

  if (!body) {
    return;
  }

  if (!polls.length) {
    body.innerHTML = `
      <tr>

        <td
          colspan="7"
          class="empty"
        >
          No published polls yet.
        </td>

      </tr>
    `;

    return;
  }

  body.innerHTML =
    polls
      .map(
        poll => {
          const dem =
            Number(
              poll.dem_pct
            );

          const rep =
            Number(
              poll.rep_pct
            );

          const ind =
            pollPartyValue(
              poll,
              "I"
            );

          const margin =
            dem - rep;

          return `
            <tr>

              <td>

                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    "Unknown pollster"
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
                ${
                  Number.isFinite(
                    dem
                  )
                    ? `${dem.toFixed(
                        1
                      )}%`
                    : "—"
                }
              </td>

              <td class="pollCellRep">
                ${
                  Number.isFinite(
                    rep
                  )
                    ? `${rep.toFixed(
                        1
                      )}%`
                    : "—"
                }
              </td>

              <td class="pollCellInd">
                ${
                  Number.isFinite(
                    ind
                  )
                    ? `${ind.toFixed(
                        1
                      )}%`
                    : "—"
                }
              </td>

              <td>

                <b
                  class="${
                    margin >= 0
                      ? "marginDem"
                      : "marginRep"
                  }"
                >
                  ${formatMargin(
                    margin
                  )}
                </b>

              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   RACE CHART CONTROLS
   ========================================================= */

function initializeRaceChartControls(
  polls,
  candidates
) {
  const controls =
    document.querySelector(
      "#pollingRangeControls"
    );

  if (!controls) {
    return;
  }

  controls
    .querySelectorAll(
      "button[data-range]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          controls
            .querySelectorAll(
              "button[data-range]"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );

          activeChartRange =
            button.dataset.range ||
            "90";

          renderRacePollingChart(
            polls,
            candidates,
            activeChartRange
          );
        }
      );
    });
}

function filterRunningAverageByRange(
  points,
  range
) {
  if (
    range === "all" ||
    !points.length
  ) {
    return points;
  }

  const days =
    Number(range);

  if (
    !Number.isFinite(days)
  ) {
    return points;
  }

  const finalDate =
    new Date(
      `${points[
        points.length - 1
      ].date}T12:00:00`
    );

  const cutoff =
    new Date(finalDate);

  cutoff.setDate(
    cutoff.getDate() -
    days
  );

  return points.filter(
    point =>
      new Date(
        `${point.date}T12:00:00`
      ) >= cutoff
  );
}

function chartCandidateLabel(
  candidates,
  party
) {
  const candidate =
    candidateForParty(
      candidates,
      party
    );

  if (
    candidate?.name
  ) {
    return candidate.name;
  }

  return partyName(
    party
  );
}
function buildRaceChartDatasets(
  points,
  candidates
) {
  const datasets = [
    {
      label:
        chartCandidateLabel(
          candidates,
          "D"
        ),

      party:
        "D",

      data:
        points.map(
          point => ({
            x:
              point.date,

            y:
              point.dem
          })
        ),

      borderColor:
        partyColor("D"),

      backgroundColor:
        partyColor("D"),

      borderWidth:
        3,

      pointRadius:
        0,

      pointHoverRadius:
        5,

      tension:
        0.32,

      cubicInterpolationMode:
        "monotone",

      spanGaps:
        true
    },

    {
      label:
        chartCandidateLabel(
          candidates,
          "R"
        ),

      party:
        "R",

      data:
        points.map(
          point => ({
            x:
              point.date,

            y:
              point.rep
          })
        ),

      borderColor:
        partyColor("R"),

      backgroundColor:
        partyColor("R"),

      borderWidth:
        3,

      pointRadius:
        0,

      pointHoverRadius:
        5,

      tension:
        0.32,

      cubicInterpolationMode:
        "monotone",

      spanGaps:
        true
    }
  ];

  const hasIndependent =
    points.some(
      point =>
        Number.isFinite(
          Number(
            point.ind
          )
        )
    );

  if (hasIndependent) {
    datasets.push({
      label:
        chartCandidateLabel(
          candidates,
          "I"
        ),

      party:
        "I",

      data:
        points.map(
          point => ({
            x:
              point.date,

            y:
              Number.isFinite(
                Number(
                  point.ind
                )
              )
                ? point.ind
                : null
          })
        ),

      borderColor:
        partyColor("I"),

      backgroundColor:
        partyColor("I"),

      borderWidth:
        3,

      pointRadius:
        0,

      pointHoverRadius:
        5,

      tension:
        0.32,

      cubicInterpolationMode:
        "monotone",

      spanGaps:
        true
    });
  }

  const hasLibertarian =
    points.some(
      point =>
        Number.isFinite(
          Number(
            point.lib
          )
        )
    );

  if (hasLibertarian) {
    datasets.push({
      label:
        chartCandidateLabel(
          candidates,
          "L"
        ),

      party:
        "L",

      data:
        points.map(
          point => ({
            x:
              point.date,

            y:
              Number.isFinite(
                Number(
                  point.lib
                )
              )
                ? point.lib
                : null
          })
        ),

      borderColor:
        partyColor("L"),

      backgroundColor:
        partyColor("L"),

      borderWidth:
        2.5,

      pointRadius:
        0,

      pointHoverRadius:
        5,

      tension:
        0.32,

      cubicInterpolationMode:
        "monotone",

      spanGaps:
        true
    });
  }

  const hasGreen =
    points.some(
      point =>
        Number.isFinite(
          Number(
            point.green
          )
        )
    );

  if (hasGreen) {
    datasets.push({
      label:
        chartCandidateLabel(
          candidates,
          "G"
        ),

      party:
        "G",

      data:
        points.map(
          point => ({
            x:
              point.date,

            y:
              Number.isFinite(
                Number(
                  point.green
                )
              )
                ? point.green
                : null
          })
        ),

      borderColor:
        partyColor("G"),

      backgroundColor:
        partyColor("G"),

      borderWidth:
        2.5,

      pointRadius:
        0,

      pointHoverRadius:
        5,

      tension:
        0.32,

      cubicInterpolationMode:
        "monotone",

      spanGaps:
        true
    });
  }

  return datasets;
}

function calculateChartBounds(
  points
) {
  const values =
    points
      .flatMap(
        point => [
          point.dem,
          point.rep,
          point.ind,
          point.lib,
          point.green
        ]
      )
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (!values.length) {
    return {
      minimum: 0,
      maximum: 60
    };
  }

  const minimumValue =
    Math.min(
      ...values
    );

  const maximumValue =
    Math.max(
      ...values
    );

  const spread =
    Math.max(
      4,
      maximumValue -
      minimumValue
    );

  const padding =
    Math.max(
      2,
      spread * 0.18
    );

  return {
    minimum:
      Math.max(
        0,
        Math.floor(
          minimumValue -
          padding
        )
      ),

    maximum:
      Math.min(
        100,
        Math.ceil(
          maximumValue +
          padding
        )
      )
  };
}

function renderRacePollingChart(
  polls,
  candidates,
  range = "90"
) {
  const canvas =
    document.querySelector(
      "#racePollingChart"
    );

  const chartWrap =
    document.querySelector(
      "#pollingChartWrap"
    );

  const empty =
    document.querySelector(
      "#pollingChartEmpty"
    );

  const latestBox =
    document.querySelector(
      "#pollingChartLatest"
    );

  if (
    !canvas ||
    typeof Chart ===
      "undefined"
  ) {
    return;
  }

  const points =
    runningAverage(
      polls,
      {
        halfLifeDays: 28,
        maxPollAgeDays: 90,
        minimumPolls: 1,
        smoothingDays: 3
      }
    );

  const filteredPoints =
    filterRunningAverageByRange(
      points,
      range
    );

  if (!filteredPoints.length) {
    if (racePollingChart) {
      racePollingChart.destroy();

      racePollingChart =
        null;
    }

    if (chartWrap) {
      chartWrap.style.display =
        "none";
    }

    if (empty) {
      empty.style.display =
        "";
    }

    if (latestBox) {
      latestBox.textContent =
        "Latest average: —";
    }

    return;
  }

  if (chartWrap) {
    chartWrap.style.display =
      "";
  }

  if (empty) {
    empty.style.display =
      "none";
  }

  const latest =
    filteredPoints[
      filteredPoints.length - 1
    ];

  if (latestBox) {
    latestBox.textContent =
      `Latest average: ${formatMargin(
        latest.margin
      )} · ${fmtDate(
        latest.date
      )}`;
  }

  const labels =
    filteredPoints.map(
      point =>
        point.date
    );

  const rawDatasets =
    buildRaceChartDatasets(
      filteredPoints,
      candidates
    );

  const datasets =
    rawDatasets.map(
      dataset => ({
        ...dataset,

        data:
          dataset.data.map(
            item =>
              item.y
          )
      })
    );

  const bounds =
    calculateChartBounds(
      filteredPoints
    );

  if (racePollingChart) {
    racePollingChart.destroy();
  }

  racePollingChart =
    new Chart(
      canvas,
      {
        type: "line",

        data: {
          labels,
          datasets
        },

        options: {
          responsive: true,

          maintainAspectRatio:
            false,

          interaction: {
            mode:
              "index",

            intersect:
              false
          },

          animation: {
            duration:
              450
          },

          plugins: {
            legend: {
              display:
                true,

              position:
                "top",

              align:
                "start",

              labels: {
                usePointStyle:
                  true,

                pointStyle:
                  "circle",

                boxWidth:
                  8,

                boxHeight:
                  8,

                padding:
                  18,

                color:
                  "#34435a",

                font: {
                  size:
                    12,

                  weight:
                    "700"
                }
              }
            },

            tooltip: {
              backgroundColor:
                "rgba(7, 26, 54, 0.96)",

              titleColor:
                "#ffffff",

              bodyColor:
                "#ffffff",

              borderColor:
                "rgba(255,255,255,.14)",

              borderWidth:
                1,

              padding:
                12,

              callbacks: {
                title(
                  items
                ) {
                  if (
                    !items.length
                  ) {
                    return "";
                  }

                  return fmtDate(
                    labels[
                      items[0]
                        .dataIndex
                    ]
                  );
                },

                label(
                  context
                ) {
                  const value =
                    Number(
                      context.raw
                    );

                  return `${context.dataset.label}: ${
                    Number.isFinite(
                      value
                    )
                      ? value.toFixed(
                          1
                        )
                      : "—"
                  }%`;
                }
              }
            }
          },

          scales: {
            x: {
              type:
                "category",

              grid: {
                display:
                  false
              },

              ticks: {
                color:
                  "#718096",

                maxRotation:
                  0,

                autoSkip:
                  true,

                maxTicksLimit:
                  range === "30"
                    ? 6
                    : 8,

                callback(
                  value,
                  index
                ) {
                  return fmtDate(
                    labels[index],
                    {
                      includeYear:
                        range ===
                        "all"
                    }
                  );
                }
              },

              border: {
                color:
                  "#dce5f2"
              }
            },

            y: {
              min:
                bounds.minimum,

              max:
                bounds.maximum,

              ticks: {
                color:
                  "#718096",

                callback(
                  value
                ) {
                  return `${value}%`;
                }
              },

              grid: {
                color:
                  "rgba(130, 149, 178, 0.16)"
              },

              border: {
                display:
                  false
              }
            }
          }
        }
      }
    );
}


/* =========================================================
   GENERIC BALLOT
   ========================================================= */

function genericBallotAverage(
  polls
) {
  if (
    !Array.isArray(polls) ||
    !polls.length
  ) {
    return null;
  }

  return weightedAverage(
    polls
  );
}

async function loadGenericBallotPage() {
  const table =
    document.querySelector(
      "#genericBallotTable"
    );

  if (!table) {
    return;
  }

  if (!configured) {
    table.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="empty"
        >
          Connect Supabase to load generic ballot polls.
        </td>

      </tr>
    `;

    return;
  }

  try {
    const polls =
      await getPublishedGenericBallotPolls();

    const average =
      genericBallotAverage(
        polls
      );

    renderGenericBallotSummary(
      average,
      polls
    );

    renderGenericBallotTable(
      table,
      polls
    );
  } catch (error) {
    console.error(
      "Generic ballot failed:",
      error
    );

    table.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="empty"
        >
          ${escapeHtml(
            friendlyErrorMessage(
              error,
              "Unable to load generic ballot polls."
            )
          )}
        </td>

      </tr>
    `;
  }
}

function renderGenericBallotSummary(
  average,
  polls
) {
  const margin =
    document.querySelector(
      "#genericMargin"
    );

  const leader =
    document.querySelector(
      "#genericLeader"
    );

  const count =
    document.querySelector(
      "#genericPollCount"
    );

  const dem =
    document.querySelector(
      "#genericDemAverage"
    );

  const rep =
    document.querySelector(
      "#genericRepAverage"
    );

  const demStatus =
    document.querySelector(
      "#genericDemStatus"
    );

  const repStatus =
    document.querySelector(
      "#genericRepStatus"
    );

  if (!average) {
    if (margin) {
      margin.textContent =
        "—";
    }

    if (leader) {
      leader.textContent =
        "No average yet";
    }

    if (count) {
      count.textContent =
        "No published polls";
    }

    if (dem) {
      dem.textContent =
        "—%";
    }

    if (rep) {
      rep.textContent =
        "—%";
    }

    if (demStatus) {
      demStatus.textContent =
        "Add published polls.";
    }

    if (repStatus) {
      repStatus.textContent =
        "Add published polls.";
    }

    return;
  }

  if (margin) {
    margin.textContent =
      formatMargin(
        average.margin
      );
  }

  if (leader) {
    leader.textContent =
      average.margin >= 0
        ? "Democrats lead"
        : "Republicans lead";
  }

  if (count) {
    count.textContent =
      `${polls.length} published ${
        polls.length === 1
          ? "poll"
          : "polls"
      }`;
  }

  if (dem) {
    dem.textContent =
      formatPercent(
        average.dem
      );
  }

  if (rep) {
    rep.textContent =
      formatPercent(
        average.rep
      );
  }

  if (demStatus) {
    demStatus.textContent =
      "Weighted national average";
  }

  if (repStatus) {
    repStatus.textContent =
      "Weighted national average";
  }
}
function renderGenericBallotTable(
  table,
  polls
) {
  if (!polls.length) {
    table.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="empty"
        >
          No published generic ballot polls yet.
        </td>

      </tr>
    `;

    return;
  }

  table.innerHTML =
    polls
      .map(
        poll => {
          const dem =
            Number(
              poll.dem_pct
            );

          const rep =
            Number(
              poll.rep_pct
            );

          const margin =
            dem - rep;

          return `
            <tr>

              <td>

                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    "Unknown pollster"
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

                ${
                  Number.isFinite(
                    dem
                  )
                    ? `${dem.toFixed(
                        1
                      )}%`
                    : "—"
                }

              </td>

              <td class="pollCellRep">

                ${
                  Number.isFinite(
                    rep
                  )
                    ? `${rep.toFixed(
                        1
                      )}%`
                    : "—"
                }

              </td>

              <td>

                <b
                  class="${
                    margin >= 0
                      ? "marginDem"
                      : "marginRep"
                  }"
                >
                  ${formatMargin(
                    margin
                  )}
                </b>

              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   TRUMP APPROVAL TRACKER
   ========================================================= */

function approvalAverage(
  polls
) {
  if (
    !Array.isArray(polls) ||
    !polls.length
  ) {
    return null;
  }

  const normalizedPolls =
    polls
      .map(
        poll => ({
          ...poll,

          dem_pct:
            Number(
              poll.approve_pct
            ),

          rep_pct:
            Number(
              poll.disapprove_pct
            )
        })
      )
      .filter(
        poll =>
          Number.isFinite(
            poll.dem_pct
          ) &&
          Number.isFinite(
            poll.rep_pct
          )
      );

  if (!normalizedPolls.length) {
    return null;
  }

  const average =
    weightedAverage(
      normalizedPolls
    );

  if (!average) {
    return null;
  }

  return {
    approve:
      Number(
        average.dem
      ),

    disapprove:
      Number(
        average.rep
      ),

    net:
      Number(
        average.dem
      ) -
      Number(
        average.rep
      )
  };
}

function approvalNetLabel(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }

  if (
    Math.abs(number) <
    0.05
  ) {
    return "Even";
  }

  return `${
    number > 0
      ? "+"
      : "−"
  }${Math.abs(
    number
  ).toFixed(1)}`;
}

function approvalPollMetadata(
  polls
) {
  const validPolls =
    Array.isArray(polls)
      ? polls
      : [];

  const dates =
    validPolls
      .flatMap(
        poll => [
          poll.start_date,
          poll.end_date
        ]
      )
      .filter(Boolean)
      .sort();

  const latest =
    [...validPolls].sort(
      (
        first,
        second
      ) =>
        new Date(
          `${
            second.end_date ||
            second.start_date ||
            "1900-01-01"
          }T12:00:00`
        ) -
        new Date(
          `${
            first.end_date ||
            first.start_date ||
            "1900-01-01"
          }T12:00:00`
        )
    )[0] || null;

  return {
    pollCount:
      validPolls.length,

    startDate:
      dates[0] ||
      null,

    endDate:
      dates[
        dates.length - 1
      ] ||
      null,

    latestPoll:
      latest,

    latestPollster:
      latest?.pollster ||
      null
  };
}

function renderApprovalSummary(
  average,
  polls
) {
  const net =
    document.querySelector(
      "#approvalNet"
    );

  const pollCount =
    document.querySelector(
      "#approvalPollCount"
    );

  const approveAverage =
    document.querySelector(
      "#approvalApproveAverage"
    );

  const disapproveAverage =
    document.querySelector(
      "#approvalDisapproveAverage"
    );

  const approveStatus =
    document.querySelector(
      "#approvalApproveStatus"
    );

  const disapproveStatus =
    document.querySelector(
      "#approvalDisapproveStatus"
    );

  const marginLabel =
    document.querySelector(
      "#approvalMarginLabel"
    );

  const approveBar =
    document.querySelector(
      "#approvalBarApprove"
    );

  const disapproveBar =
    document.querySelector(
      "#approvalBarDisapprove"
    );

  const otherBar =
    document.querySelector(
      "#approvalBarOther"
    );

  const approveBarLabel =
    document.querySelector(
      "#approvalBarApproveLabel"
    );

  const disapproveBarLabel =
    document.querySelector(
      "#approvalBarDisapproveLabel"
    );

  const otherBarLabel =
    document.querySelector(
      "#approvalBarOtherLabel"
    );

  const meta =
    document.querySelector(
      "#approvalAverageMeta"
    );

  if (!average) {
    if (net) {
      net.textContent =
        "—";
    }

    if (pollCount) {
      pollCount.textContent =
        "No published polls";
    }

    if (approveAverage) {
      approveAverage.textContent =
        "—%";
    }

    if (disapproveAverage) {
      disapproveAverage.textContent =
        "—%";
    }

    if (approveStatus) {
      approveStatus.textContent =
        "Add published approval polls.";
    }

    if (disapproveStatus) {
      disapproveStatus.textContent =
        "Add published approval polls.";
    }

    if (marginLabel) {
      marginLabel.textContent =
        "—";
    }

    if (approveBar) {
      approveBar.style.width =
        "0%";
    }

    if (disapproveBar) {
      disapproveBar.style.width =
        "0%";
    }

    if (otherBar) {
      otherBar.style.width =
        "100%";
    }

    if (approveBarLabel) {
      approveBarLabel.textContent =
        "—%";
    }

    if (disapproveBarLabel) {
      disapproveBarLabel.textContent =
        "—%";
    }

    if (otherBarLabel) {
      otherBarLabel.textContent =
        "—%";
    }

    if (meta) {
      meta.textContent =
        "Add published national approval polls to calculate an average.";
    }

    return;
  }

  const approve =
    clamp(
      average.approve,
      0,
      100
    );

  const disapprove =
    clamp(
      average.disapprove,
      0,
      100
    );

  const other =
    Math.max(
      0,
      100 -
      approve -
      disapprove
    );

  const metadata =
    approvalPollMetadata(
      polls
    );

  if (net) {
    net.textContent =
      approvalNetLabel(
        average.net
      );

    net.style.color =
      average.net >= 0
        ? "#169b62"
        : "#d64045";
  }

  if (pollCount) {
    pollCount.textContent =
      `${metadata.pollCount} published ${
        metadata.pollCount === 1
          ? "poll"
          : "polls"
      }`;
  }

  if (approveAverage) {
    approveAverage.textContent =
      `${approve.toFixed(
        1
      )}%`;

    approveAverage.style.color =
      "#169b62";
  }

  if (disapproveAverage) {
    disapproveAverage.textContent =
      `${disapprove.toFixed(
        1
      )}%`;

    disapproveAverage.style.color =
      "#d64045";
  }

  if (approveStatus) {
    approveStatus.textContent =
      "Weighted national average";
  }

  if (disapproveStatus) {
    disapproveStatus.textContent =
      "Weighted national average";
  }

  if (marginLabel) {
    marginLabel.textContent =
      approvalNetLabel(
        average.net
      );

    marginLabel.style.color =
      average.net >= 0
        ? "#169b62"
        : "#d64045";
  }

  if (approveBar) {
    approveBar.style.width =
      `${approve}%`;

    approveBar.style.background =
      "#169b62";
  }

  if (disapproveBar) {
    disapproveBar.style.width =
      `${disapprove}%`;

    disapproveBar.style.background =
      "#d64045";
  }

  if (otherBar) {
    otherBar.style.width =
      `${other}%`;
  }

  if (approveBarLabel) {
    approveBarLabel.textContent =
      `${approve.toFixed(
        1
      )}%`;

    approveBarLabel.style.color =
      "#169b62";
  }

  if (disapproveBarLabel) {
    disapproveBarLabel.textContent =
      `${disapprove.toFixed(
        1
      )}%`;

    disapproveBarLabel.style.color =
      "#d64045";
  }

  if (otherBarLabel) {
    otherBarLabel.textContent =
      `${other.toFixed(
        1
      )}%`;
  }

  if (meta) {
    const parts = [
      `${metadata.pollCount} ${
        metadata.pollCount === 1
          ? "poll"
          : "polls"
      }`
    ];

    if (
      metadata.startDate &&
      metadata.endDate
    ) {
      parts.push(
        `${fmtDate(
          metadata.startDate
        )} – ${fmtDate(
          metadata.endDate
        )}`
      );
    }

    if (
      metadata.latestPollster
    ) {
      parts.push(
        `Latest: ${metadata.latestPollster}`
      );
    }

    meta.textContent =
      parts.join(" · ");
  }
}

function renderApprovalPollTable(
  polls
) {
  const table =
    document.querySelector(
      "#approvalPollTable"
    );

  if (!table) {
    return;
  }

  if (
    !Array.isArray(polls) ||
    !polls.length
  ) {
    table.innerHTML = `
      <tr>

        <td
          colspan="7"
          class="empty"
        >
          No published approval polls yet.
        </td>

      </tr>
    `;

    return;
  }

  table.innerHTML =
    polls
      .map(
        poll => {
          const approve =
            Number(
              poll.approve_pct
            );

          const disapprove =
            Number(
              poll.disapprove_pct
            );

          const net =
            approve -
            disapprove;

          return `
            <tr>

              <td>

                <b>
                  ${escapeHtml(
                    poll.pollster ||
                    "Unknown pollster"
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
                  "—"
                )}
              </td>

              <td
                style="
                  color:#169b62;
                  font-weight:800;
                "
              >
                ${
                  Number.isFinite(
                    approve
                  )
                    ? `${approve.toFixed(
                        1
                      )}%`
                    : "—"
                }
              </td>

              <td
                style="
                  color:#d64045;
                  font-weight:800;
                "
              >
                ${
                  Number.isFinite(
                    disapprove
                  )
                    ? `${disapprove.toFixed(
                        1
                      )}%`
                    : "—"
                }
              </td>

              <td>

                <b
                  style="
                    color:${
                      net >= 0
                        ? "#169b62"
                        : "#d64045"
                    };
                  "
                >
                  ${
                    Number.isFinite(
                      net
                    )
                      ? approvalNetLabel(
                          net
                        )
                      : "—"
                  }
                </b>

              </td>

            </tr>
          `;
        }
      )
      .join("");
}

function buildApprovalRunningAverage(
  polls
) {
  if (
    !Array.isArray(polls) ||
    !polls.length
  ) {
    return [];
  }

  const normalizedPolls =
    polls
      .map(
        poll => ({
          ...poll,

          dem_pct:
            Number(
              poll.approve_pct
            ),

          rep_pct:
            Number(
              poll.disapprove_pct
            )
        })
      )
      .filter(
        poll =>
          Number.isFinite(
            poll.dem_pct
          ) &&
          Number.isFinite(
            poll.rep_pct
          )
      );

  if (!normalizedPolls.length) {
    return [];
  }

  return runningAverage(
    normalizedPolls,
    {
      halfLifeDays:
        28,

      maxPollAgeDays:
        180,

      minimumPolls:
        1,

      smoothingDays:
        3
    }
  );
}
function initializeApprovalChartControls(
  polls
) {
  const controls =
    document.querySelector(
      "#approvalRangeControls"
    );

  if (!controls) {
    return;
  }

  controls
    .querySelectorAll(
      "button[data-range]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            controls
              .querySelectorAll(
                "button[data-range]"
              )
              .forEach(
                item => {
                  item.classList.remove(
                    "active"
                  );
                }
              );

            button.classList.add(
              "active"
            );

            activeApprovalRange =
              button.dataset.range ||
              "90";

            renderApprovalChart(
              polls,
              activeApprovalRange
            );
          }
        );
      }
    );
}

function renderApprovalChart(
  polls,
  range = "90"
) {
  const canvas =
    document.querySelector(
      "#approvalChart"
    );

  const chartWrap =
    document.querySelector(
      "#approvalChartWrap"
    );

  const empty =
    document.querySelector(
      "#approvalChartEmpty"
    );

  const latestBox =
    document.querySelector(
      "#approvalChartLatest"
    );

  const updatedBox =
    document.querySelector(
      "#approvalChartUpdated"
    );

  if (
    !canvas ||
    typeof Chart ===
      "undefined"
  ) {
    return;
  }

  const points =
    buildApprovalRunningAverage(
      polls
    );

  const filteredPoints =
    filterRunningAverageByRange(
      points,
      range
    );

  if (!filteredPoints.length) {
    if (approvalPollingChart) {
      approvalPollingChart.destroy();

      approvalPollingChart =
        null;
    }

    if (chartWrap) {
      chartWrap.style.display =
        "none";
    }

    if (empty) {
      empty.style.display =
        "";
    }

    if (latestBox) {
      latestBox.textContent =
        "Latest average: —";
    }

    if (updatedBox) {
      updatedBox.textContent =
        "Last updated: —";
    }

    return;
  }

  if (chartWrap) {
    chartWrap.style.display =
      "";
  }

  if (empty) {
    empty.style.display =
      "none";
  }

  const labels =
    filteredPoints.map(
      point =>
        point.date
    );

  const approveData =
    filteredPoints.map(
      point =>
        Number(
          point.dem
        )
    );

  const disapproveData =
    filteredPoints.map(
      point =>
        Number(
          point.rep
        )
    );

  const latest =
    filteredPoints[
      filteredPoints.length - 1
    ];

  if (latestBox) {
    latestBox.textContent =
      `Latest average: ${Number(
        latest.dem
      ).toFixed(1)}% approve · ${Number(
        latest.rep
      ).toFixed(1)}% disapprove`;
  }

  const metadata =
    approvalPollMetadata(
      polls
    );

  if (updatedBox) {
    updatedBox.textContent =
      metadata.endDate
        ? `Last updated: ${fmtDate(
            metadata.endDate
          )}`
        : "Last updated: —";
  }

  const values = [
    ...approveData,
    ...disapproveData
  ].filter(
    Number.isFinite
  );

  const minimum =
    values.length
      ? Math.max(
          0,
          Math.floor(
            Math.min(
              ...values
            ) - 3
          )
        )
      : 30;

  const maximum =
    values.length
      ? Math.min(
          100,
          Math.ceil(
            Math.max(
              ...values
            ) + 3
          )
        )
      : 70;

  if (approvalPollingChart) {
    approvalPollingChart.destroy();
  }

  approvalPollingChart =
    new Chart(
      canvas,
      {
        type:
          "line",

        data: {
          labels,

          datasets: [
            {
              label:
                "Approve",

              data:
                approveData,

              borderColor:
                "#169b62",

              backgroundColor:
                "#169b62",

              borderWidth:
                3,

              pointRadius:
                0,

              pointHoverRadius:
                5,

              tension:
                0.32,

              cubicInterpolationMode:
                "monotone",

              spanGaps:
                true
            },

            {
              label:
                "Disapprove",

              data:
                disapproveData,

              borderColor:
                "#d64045",

              backgroundColor:
                "#d64045",

              borderWidth:
                3,

              pointRadius:
                0,

              pointHoverRadius:
                5,

              tension:
                0.32,

              cubicInterpolationMode:
                "monotone",

              spanGaps:
                true
            }
          ]
        },

        options: {
          responsive:
            true,

          maintainAspectRatio:
            false,

          interaction: {
            mode:
              "index",

            intersect:
              false
          },

          animation: {
            duration:
              450
          },

          plugins: {
            legend: {
              display:
                true,

              position:
                "top",

              align:
                "start",

              labels: {
                usePointStyle:
                  true,

                pointStyle:
                  "circle",

                boxWidth:
                  8,

                boxHeight:
                  8,

                padding:
                  18,

                color:
                  "#34435a",

                font: {
                  size:
                    12,

                  weight:
                    "700"
                }
              }
            },

            tooltip: {
              backgroundColor:
                "rgba(7, 26, 54, 0.96)",

              titleColor:
                "#ffffff",

              bodyColor:
                "#ffffff",

              borderColor:
                "rgba(255,255,255,.14)",

              borderWidth:
                1,

              padding:
                12,

              callbacks: {
                title(
                  items
                ) {
                  if (
                    !items.length
                  ) {
                    return "";
                  }

                  return fmtDate(
                    labels[
                      items[0]
                        .dataIndex
                    ]
                  );
                },

                label(
                  context
                ) {
                  const value =
                    Number(
                      context.raw
                    );

                  return `${context.dataset.label}: ${
                    Number.isFinite(
                      value
                    )
                      ? value.toFixed(
                          1
                        )
                      : "—"
                  }%`;
                }
              }
            }
          },

          scales: {
            x: {
              type:
                "category",

              grid: {
                display:
                  false
              },

              ticks: {
                color:
                  "#718096",

                maxRotation:
                  0,

                autoSkip:
                  true,

                maxTicksLimit:
                  range === "30"
                    ? 6
                    : 8,

                callback(
                  value,
                  index
                ) {
                  return fmtDate(
                    labels[index],
                    {
                      includeYear:
                        range ===
                        "all"
                    }
                  );
                }
              },

              border: {
                color:
                  "#dce5f2"
              }
            },

            y: {
              min:
                minimum,

              max:
                maximum,

              ticks: {
                color:
                  "#718096",

                callback(
                  value
                ) {
                  return `${value}%`;
                }
              },

              grid: {
                color:
                  "rgba(130, 149, 178, 0.16)"
              },

              border: {
                display:
                  false
              }
            }
          }
        }
      }
    );
}

async function loadApprovalPage() {
  const table =
    document.querySelector(
      "#approvalPollTable"
    );

  if (!table) {
    return;
  }

  if (!configured) {
    table.innerHTML = `
      <tr>

        <td
          colspan="7"
          class="empty"
        >
          Connect Supabase to load approval polls.
        </td>

      </tr>
    `;

    return;
  }

  try {
    const polls =
      await getPublishedApprovalPolls();

    const average =
      approvalAverage(
        polls
      );

    renderApprovalSummary(
      average,
      polls
    );

    renderApprovalPollTable(
      polls
    );

    initializeApprovalChartControls(
      polls
    );

    renderApprovalChart(
      polls,
      activeApprovalRange
    );
  } catch (error) {
    console.error(
      "Approval tracker failed:",
      error
    );

    table.innerHTML = `
      <tr>

        <td
          colspan="7"
          class="empty"
        >
          ${escapeHtml(
            friendlyErrorMessage(
              error,
              "Unable to load approval polls."
            )
          )}
        </td>

      </tr>
    `;
  }
}


/* =========================================================
   ACTIVE NAVIGATION LINK
   ========================================================= */

function markActiveNavigation() {
  const currentFile =
    (
      location.pathname
        .split("/")
        .pop() ||
      "index.html"
    )
      .split("?")[0]
      .toLowerCase();

  document
    .querySelectorAll(
      ".navlinks a"
    )
    .forEach(
      link => {
        const linkFile =
          (
            link.getAttribute(
              "href"
            ) ||
            ""
          )
            .split("?")[0]
            .toLowerCase();

        if (
          linkFile ===
          currentFile
        ) {
          link.classList.add(
            "active"
          );
        }
      }
    );
}


/* =========================================================
   EXTERNAL-LINK SAFETY
   ========================================================= */

function protectExternalLinks() {
  document
    .querySelectorAll(
      "a[target='_blank']"
    )
    .forEach(
      link => {
        const existing =
          link.getAttribute(
            "rel"
          ) || "";

        const values =
          new Set(
            existing
              .split(/\s+/)
              .filter(Boolean)
          );

        values.add(
          "noopener"
        );

        values.add(
          "noreferrer"
        );

        link.setAttribute(
          "rel",
          [
            ...values
          ].join(" ")
        );
      }
    );
}


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

async function initializePublicWebsite() {
  markActiveNavigation();

  protectExternalLinks();

  const tasks = [
    loadWebsiteSettings(),
    loadAutomaticControlForecasts(),
    loadHome(),
    loadRaceGrid(),
    loadRace(),
    loadGenericBallotPage(),
    loadApprovalPage()
  ];

  const results =
    await Promise.allSettled(
      tasks
    );

  results.forEach(
    result => {
      if (
        result.status ===
        "rejected"
      ) {
        console.error(
          "ElectionLab page initialization error:",
          result.reason
        );
      }
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializePublicWebsite
);
