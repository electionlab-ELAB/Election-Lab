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
    "23"
};

let racePollingChart = null;

async function getPublicSettings() {
  if (!configured) {
    return {
      ...PUBLIC_DEFAULT_SETTINGS
    };
  }

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
      "Could not load website settings:",
      error.message
    );

    return {
      ...PUBLIC_DEFAULT_SETTINGS
    };
  }

  return {
    ...PUBLIC_DEFAULT_SETTINGS,

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

function setTextForSelectors(
  selectors,
  text
) {
  selectors.forEach(selector => {
    const element =
      document.querySelector(
        selector
      );

    if (element) {
      element.textContent =
        text;
    }
  });
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
  const counter =
    document.querySelector(
      "[data-counter-office]"
    );

  if (!counter) {
    return;
  }

  const office =
    counter.dataset.counterOffice;

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
      "#senateForecastText"
    ) ||
    document.querySelector(
      "#houseForecastText"
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

async function loadHome() {
  const box =
    document.querySelector(
      "#featuredRaces"
    );

  if (!box) {
    return;
  }

  if (!configured) {
    box.innerHTML =
      '<div class="empty">Connect Supabase to load published races.</div>';

    return;
  }

  try {
    const races =
      await getPublishedRaces();

    const featured =
      races
        .filter(
          race =>
            race.featured
        )
        .slice(0, 6);

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

    const racesToShow =
      featured.length
        ? featured
        : races.slice(0, 6);

    box.innerHTML =
      racesToShow
        .map(
          race =>
            raceCard(race)
        )
        .join("") ||
      '<div class="empty">No published races yet.</div>';
  } catch (error) {
    console.error(
      "Homepage failed:",
      error
    );

    box.innerHTML =
      '<div class="empty">' +
      escapeHtml(
        error.message ||
          "Unable to load published races."
      ) +
      "</div>";
  }
}

function raceCard(race) {
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

  const office =
    raceOffice(race);

  const label =
    officeLabel(office);

  const margin =
    Number(
      race.projected_margin ||
        0
    );

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
          ${escapeHtml(
            label
          )}
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
        ${
          candidates.length
            ? candidates
                .slice(0, 3)
                .map(
                  candidate => `
                    <div class="candidateLine">
                      <span>
                        <i
                          class="partyDot party-${escapeHtml(
                            candidate.party ||
                              ""
                          )}"
                        ></i>

                        ${escapeHtml(
                          candidate.name ||
                            ""
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
            `
        }
      </div>

      <div class="raceMeta">
        <span>
          Model margin
        </span>

        <strong>
          ${
            margin >= 0
              ? "D +"
              : "R +"
          }

          ${Math.abs(
            margin
          ).toFixed(1)}
        </strong>
      </div>
    </a>
  `;
}

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
      await getPublishedRaces(
        office
      );

    function displayRaces(list) {
      box.innerHTML =
        list
          .map(
            race =>
              raceCard(race)
          )
          .join("") ||
        `<div class="empty">No published ${escapeHtml(
          label
        )} races yet.</div>`;
    }

    displayRaces(races);

    const input =
      document.querySelector(
        "#raceSearch"
      );

    if (input) {
      input.oninput = () => {
        const query =
          input.value
            .toLowerCase()
            .trim();

        const filtered =
          races.filter(race => {
            const searchable = [
              race.title || "",
              race.state || "",
              ...(
                race.candidates ||
                []
              ).map(
                candidate =>
                  candidate.name ||
                  ""
              )
            ]
              .join(" ")
              .toLowerCase();

            return searchable.includes(
              query
            );
          });

        displayRaces(filtered);
      };
    }
  } catch (error) {
    console.error(
      "Race grid failed:",
      error
    );

    box.innerHTML =
      '<div class="empty">' +
      escapeHtml(
        error.message ||
          "Unable to load races."
      ) +
      "</div>";
  }
}
function recentPollsMarkup(polls) {
  return `
    <section class="section">

      <div class="sectionHead">
        <div>
          <h2>
            Recent polls
          </h2>

          <p>
            Published polling used in the race average
            and trend graph.
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
              polls.length
                ? polls
                    .map(poll => {
                      const pollMargin =
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
                                poll.pollster ||
                                  "Unknown pollster"
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
                              poll.population ||
                                ""
                            )}
                          </td>

                          <td>
                            ${Number(
                              poll.dem_pct || 0
                            ).toFixed(1)}%
                          </td>

                          <td>
                            ${Number(
                              poll.rep_pct || 0
                            ).toFixed(1)}%
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
                    .join("")
                : `
                  <tr>
                    <td
                      colspan="6"
                      class="empty"
                    >
                      No published polls yet.
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

async function loadRace() {
  const root =
    document.querySelector(
      "#raceRoot"
    );

  if (!root) {
    return;
  }

  if (!configured) {
    root.innerHTML =
      '<div class="empty">Connect Supabase to load this race.</div>';

    return;
  }

  try {
    const slug =
      new URLSearchParams(
        location.search
      ).get("id");

    if (!slug) {
      root.innerHTML =
        '<div class="empty">No race was selected.</div>';

      return;
    }

    const {
      data: race,
      error
    } = await sb
      .from("races")
      .select(
        "*,candidates(*)"
      )
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
      throw error;
    }

    if (!race) {
      root.innerHTML =
        '<div class="empty">Published race not found.</div>';

      return;
    }

    const polls =
      await getPublishedPolls(
        race.id
      );

    const average =
      weightedAverage(
        polls
      );

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

    const office =
      raceOffice(race);

    const label =
      officeLabel(office);

    const margin =
      Number(
        race.projected_margin ||
          0
      );

    const leader =
      candidates[0];

    document.title =
      `${race.title} | ElectionLab`;

    root.innerHTML = `
      <section class="hero">

        <div class="heroGrid">

          <div>

            <div class="kicker">
              2026
              ${escapeHtml(label)}
              Forecast
            </div>

            <h1>
              ${escapeHtml(
                race.title ||
                  "Election Forecast"
              )}
            </h1>

            <p>
              ${escapeHtml(
                race.summary ||
                  "ElectionLab's published forecast and polling average."
              )}
            </p>

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

          <div class="probCard">

            ${
              leader
                ? `
                  <div class="bigProb">
                    ${Number(
                      leader
                        .win_probability ||
                        0
                    ).toFixed(0)}%
                  </div>

                  <b>
                    ${escapeHtml(
                      leader.name ||
                        "Leading candidate"
                    )}
                  </b>

                  <div>
                    chance to win
                  </div>

                  <div
                    style="
                      margin-top:8px;
                      color:#dceaff;
                    "
                  >
                    ${Number(
                      leader
                        .expected_vote_share ||
                        0
                    ).toFixed(1)}%
                    projected vote
                  </div>
                `
                : `
                  <div class="bigProb">
                    —
                  </div>

                  <b>
                    No candidates added
                  </b>
                `
            }

          </div>

        </div>

      </section>

      <section class="section">

        <div class="grid2">

          <div class="card">

            <h2>
              Forecast
            </h2>

            ${
              candidates.length
                ? candidates
                    .map(
                      candidate => `
                        <div class="candidateLine">

                          <span>

                            <i
                              class="partyDot party-${escapeHtml(
                                candidate.party ||
                                  ""
                              )}"
                            ></i>

                            <b>
                              ${escapeHtml(
                                candidate.name ||
                                  ""
                              )}
                            </b>

                            <small class="subtle">
                              ${escapeHtml(
                                partyName(
                                  candidate.party
                                )
                              )}
                            </small>

                          </span>

                          <strong>
                            ${Number(
                              candidate
                                .win_probability ||
                                0
                            ).toFixed(0)}%
                            win
                            ·
                            ${Number(
                              candidate
                                .expected_vote_share ||
                                0
                            ).toFixed(1)}%
                            vote
                          </strong>

                        </div>
                      `
                    )
                    .join("")
                : `
                  <p class="subtle">
                    No candidates have been added yet.
                  </p>
                `
            }

            <p class="subtle">
              Projected margin:

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
            </p>

          </div>

          <div class="card">

            <h2>
              Polling average
            </h2>

            ${
              average
                ? `
                  <div
                    class="bigProb"
                    style="
                      font-size:48px;
                      color:var(--ink);
                    "
                  >
                    ${
                      average.margin >= 0
                        ? "D +"
                        : "R +"
                    }

                    ${Math.abs(
                      average.margin
                    ).toFixed(1)}
                  </div>

                  <div class="raceMeta">
                    <b>
                      D
                      ${average.dem.toFixed(
                        1
                      )}%
                    </b>

                    <b>
                      R
                      ${average.rep.toFixed(
                        1
                      )}%
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
            <div class="kicker">
              Polling Trend
            </div>

            <h2>
              Polling over time
            </h2>

            <p>
              Each point represents a published poll,
              ordered by its ending date.
            </p>
          </div>

        </div>

        <div class="card">

          ${
            polls.length
              ? `
                <div
                  style="
                    position:relative;
                    width:100%;
                    height:360px;
                  "
                >
                  <canvas
                    id="racePollingChart"
                    aria-label="Polling trend chart"
                    role="img"
                  ></canvas>
                </div>
              `
              : `
                <div class="empty">
                  Add published polls to create a trend graph.
                </div>
              `
          }

        </div>

      </section>

      ${recentPollsMarkup(polls)}
    `;

    if (polls.length) {
      renderRacePollingChart(
        polls
      );
    }
  } catch (error) {
    console.error(
      "Race page failed:",
      error
    );

    root.innerHTML =
      '<div class="empty">' +
      escapeHtml(
        error.message ||
          "Unable to load this race."
      ) +
      "</div>";
  }
}
function renderRacePollingChart(polls) {
  const canvas =
    document.querySelector(
      "#racePollingChart"
    );

  if (
    !canvas ||
    typeof Chart ===
      "undefined"
  ) {
    return;
  }

  const sortedPolls =
    [...polls].sort(
      (a, b) =>
        new Date(
          a.end_date || 0
        ) -
        new Date(
          b.end_date || 0
        )
    );

  const labels =
    sortedPolls.map(
      poll =>
        fmtDate(
          poll.end_date
        )
    );

  const democraticData =
    sortedPolls.map(
      poll =>
        Number(
          poll.dem_pct || 0
        )
    );

  const republicanData =
    sortedPolls.map(
      poll =>
        Number(
          poll.rep_pct || 0
        )
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

          datasets: [
            {
              label: "Democratic",

              data:
                democraticData,

              borderColor:
                "#1677ff",

              backgroundColor:
                "rgba(22,119,255,.12)",

              pointBackgroundColor:
                "#1677ff",

              pointBorderColor:
                "#ffffff",

              pointBorderWidth:
                2,

              pointRadius:
                4,

              pointHoverRadius:
                6,

              borderWidth:
                3,

              tension:
                0.28,

              fill:
                false
            },

            {
              label: "Republican",

              data:
                republicanData,

              borderColor:
                "#ef4444",

              backgroundColor:
                "rgba(239,68,68,.12)",

              pointBackgroundColor:
                "#ef4444",

              pointBorderColor:
                "#ffffff",

              pointBorderWidth:
                2,

              pointRadius:
                4,

              pointHoverRadius:
                6,

              borderWidth:
                3,

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
              position:
                "top",

              labels: {
                usePointStyle:
                  true,

                boxWidth:
                  10,

                padding:
                  18,

                font: {
                  weight:
                    "700"
                }
              }
            },

            tooltip: {
              callbacks: {
                title(
                  tooltipItems
                ) {
                  const index =
                    tooltipItems[0]
                      ?.dataIndex;

                  const poll =
                    sortedPolls[
                      index
                    ];

                  if (!poll) {
                    return "";
                  }

                  return (
                    poll.pollster ||
                    "Published poll"
                  );
                },

                afterTitle(
                  tooltipItems
                ) {
                  const index =
                    tooltipItems[0]
                      ?.dataIndex;

                  const poll =
                    sortedPolls[
                      index
                    ];

                  if (!poll) {
                    return "";
                  }

                  return [
                    `${fmtDate(
                      poll.start_date
                    )} – ${fmtDate(
                      poll.end_date
                    )}`,

                    `${
                      poll.sample_size ||
                      "—"
                    } ${poll.population ||
                      ""}`
                  ];
                },

                label(context) {
                  return (
                    `${context.dataset.label}: ` +
                    `${Number(
                      context.raw || 0
                    ).toFixed(1)}%`
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
              },

              ticks: {
                maxRotation:
                  0,

                autoSkip:
                  true,

                maxTicksLimit:
                  8
              }
            },

            y: {
              suggestedMin:
                Math.max(
                  0,
                  Math.floor(
                    Math.min(
                      ...democraticData,
                      ...republicanData
                    ) - 5
                  )
                ),

              suggestedMax:
                Math.min(
                  100,
                  Math.ceil(
                    Math.max(
                      ...democraticData,
                      ...republicanData
                    ) + 5
                  )
                ),

              ticks: {
                callback(value) {
                  return `${value}%`;
                }
              },

              grid: {
                color:
                  "rgba(104,117,141,.15)"
              }
            }
          }
        }
      }
    );
}
async function loadGenericBallot() {
  const homepageBox =
    document.querySelector(
      "#genericBallotPolls"
    );

  const table =
    document.querySelector(
      "#genericBallotTable"
    );

  const hasGenericBallotSection =
    homepageBox ||
    table ||
    document.querySelector(
      "#genericMargin"
    );

  if (!hasGenericBallotSection) {
    return;
  }

  if (!configured) {
    if (homepageBox) {
      homepageBox.innerHTML =
        '<div class="empty">Connect Supabase to load generic ballot polls.</div>';
    }

    if (table) {
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
    }

    return;
  }

  try {
    const {
      data,
      error
    } = await sb
      .from(
        "generic_ballot_polls"
      )
      .select("*")
      .eq(
        "status",
        "published"
      )
      .order(
        "end_date",
        {
          ascending: false
        }
      );

    if (error) {
      throw error;
    }

    const polls =
      data || [];

    const average =
      weightedAverage(
        polls
      );

    const marginBox =
      document.querySelector(
        "#genericMargin"
      );

    const leaderBox =
      document.querySelector(
        "#genericLeader"
      );

    const countBox =
      document.querySelector(
        "#genericPollCount"
      );

    const demBox =
      document.querySelector(
        "#genericDemAverage"
      );

    const repBox =
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

    if (average) {
      const democraticLead =
        average.margin >= 0;

      const marginText =
        `${
          democraticLead
            ? "D +"
            : "R +"
        }${Math.abs(
          average.margin
        ).toFixed(1)}`;

      const pollCountText =
        `${polls.length} published poll${
          polls.length === 1
            ? ""
            : "s"
        }`;

      if (marginBox) {
        marginBox.textContent =
          marginText;
      }

      if (leaderBox) {
        leaderBox.textContent =
          democraticLead
            ? "Democrats lead"
            : "Republicans lead";
      }

      if (countBox) {
        countBox.textContent =
          pollCountText;
      }

      if (demBox) {
        demBox.textContent =
          `${average.dem.toFixed(
            1
          )}%`;
      }

      if (repBox) {
        repBox.textContent =
          `${average.rep.toFixed(
            1
          )}%`;
      }

      if (demStatus) {
        demStatus.textContent =
          `Average of ${pollCountText}.`;
      }

      if (repStatus) {
        repStatus.textContent =
          `Average of ${pollCountText}.`;
      }

      if (homepageBox) {
        homepageBox.innerHTML = `
          <div
            class="bigProb"
            style="
              font-size:48px;
              color:var(--ink);
            "
          >
            ${marginText}
          </div>

          <div class="controlBar">

            <span
              class="dem"
              style="width:${Math.max(
                0,
                Math.min(
                  100,
                  average.dem
                )
              )}%"
            ></span>

            <span
              class="rep"
              style="width:${Math.max(
                0,
                Math.min(
                  100,
                  average.rep
                )
              )}%"
            ></span>

          </div>

          <div class="raceMeta">

            <b>
              D ${average.dem.toFixed(
                1
              )}%
            </b>

            <b>
              R ${average.rep.toFixed(
                1
              )}%
            </b>

          </div>

          <p class="subtle">
            Based on ${pollCountText}.
          </p>
        `;
      }
    } else {
      if (marginBox) {
        marginBox.textContent =
          "—";
      }

      if (leaderBox) {
        leaderBox.textContent =
          "No average yet";
      }

      if (countBox) {
        countBox.textContent =
          "Add published polls to begin";
      }

      if (demBox) {
        demBox.textContent =
          "—%";
      }

      if (repBox) {
        repBox.textContent =
          "—%";
      }

      if (demStatus) {
        demStatus.textContent =
          "No published polls yet.";
      }

      if (repStatus) {
        repStatus.textContent =
          "No published polls yet.";
      }

      if (homepageBox) {
        homepageBox.innerHTML =
          '<div class="empty">No published generic ballot polls yet.</div>';
      }
    }

    if (table) {
      table.innerHTML =
        polls.length
          ? polls
              .map(poll => {
                const pollMargin =
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
                          poll.pollster ||
                            "Unknown pollster"
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
                        poll.population ||
                          ""
                      )}
                    </td>

                    <td>
                      ${Number(
                        poll.dem_pct || 0
                      ).toFixed(1)}%
                    </td>

                    <td>
                      ${Number(
                        poll.rep_pct || 0
                      ).toFixed(1)}%
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
              .join("")
          : `
            <tr>
              <td
                colspan="6"
                class="empty"
              >
                No generic ballot polls have been published.
              </td>
            </tr>
          `;
    }
  } catch (error) {
    console.error(
      "Generic ballot failed:",
      error
    );

    const message =
      escapeHtml(
        error.message ||
          "Unable to load generic ballot polls."
      );

    if (homepageBox) {
      homepageBox.innerHTML =
        `<div class="empty">${message}</div>`;
    }

    if (table) {
      table.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="empty"
          >
            ${message}
          </td>
        </tr>
      `;
    }
  }
}
document.addEventListener(
  "DOMContentLoaded",
  () => {
    const tasks = [
      loadWebsiteSettings,
      loadHome,
      loadGenericBallot,
      loadRaceGrid,
      loadRace
    ];

    tasks.forEach(task => {
      try {
        const result =
          task();

        if (
          result &&
          typeof result.catch ===
            "function"
        ) {
          result.catch(error => {
            console.error(
              `${task.name} failed:`,
              error
            );
          });
        }
      } catch (error) {
        console.error(
          `${task.name} failed:`,
          error
        );
      }
    });
  }
);
