/* =========================================================
   ELECTIONLAB 2028 PRIMARY TRACKER
   ========================================================= */

let primaryTrackerPolls = [];
let primaryTrackerParty = "D";
let primaryTrackerRange = "90";
let primaryTrackerChart = null;


/* =========================================================
   DATA
   ========================================================= */

async function getPublishedPrimaryPolls() {
  if (!sb) {
    return [];
  }

  const {
    data,
    error
  } = await sb
    .from("primary_polls")
    .select("*")
    .eq("status", "published")
    .order("end_date", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return data || [];
}

function primaryPollParty(poll) {
  return String(
    poll.primary_party ??
    poll.party ??
    "D"
  )
    .trim()
    .toUpperCase() === "R"
      ? "R"
      : "D";
}

function primaryPollResults(poll) {
  const raw =
    poll.candidate_results ??
    poll.results ??
    poll.candidates ??
    [];

  if (Array.isArray(raw)) {
    return raw
      .map(result => ({
        name: String(
          result.candidate_name ??
          result.name ??
          result.candidate ??
          ""
        ).trim(),

        percentage: Number(
          result.percentage ??
          result.pct ??
          result.value
        )
      }))
      .filter(result =>
        result.name &&
        Number.isFinite(result.percentage)
      );
  }

  if (
    raw &&
    typeof raw === "object"
  ) {
    return Object.entries(raw)
      .map(([name, percentage]) => ({
        name: String(name).trim(),
        percentage: Number(percentage)
      }))
      .filter(result =>
        result.name &&
        Number.isFinite(result.percentage)
      );
  }

  if (
    typeof raw === "string" &&
    raw.trim()
  ) {
    try {
      return primaryPollResults({
        candidate_results:
          JSON.parse(raw)
      });
    } catch {
      return [];
    }
  }

  return [];
}


/* =========================================================
   WEIGHTING
   ========================================================= */

function primaryPollWeight(
  poll,
  referenceDate
) {
  const pollDate =
    poll.end_date ||
    poll.start_date;

  const daysOld =
    daysBetween(
      pollDate,
      referenceDate
    );

  const recency =
    Math.exp(
      -Math.log(2) *
      daysOld /
      28
    );

  const sample =
    Math.sqrt(
      Math.max(
        100,
        Number(
          poll.sample_size ||
          500
        )
      ) / 500
    );

  const quality =
    Math.max(
      0.25,
      Number(
        poll.quality_weight ||
        1
      )
    );

  const population =
    pollPopulationWeight(
      poll.population
    );

  return (
    recency *
    sample *
    quality *
    population
  );
}

function calculatePrimaryAverage(
  polls,
  referenceDate = null
) {
  if (!polls.length) {
    return [];
  }

  const latestDate =
    referenceDate ||
    polls
      .map(poll =>
        poll.end_date ||
        poll.start_date
      )
      .filter(Boolean)
      .sort()
      .at(-1);

  const totals =
    new Map();

  const weights =
    new Map();

  polls.forEach(poll => {
    const weight =
      primaryPollWeight(
        poll,
        latestDate
      );

    primaryPollResults(poll)
      .forEach(result => {
        const key =
          result.name
            .toLowerCase();

        totals.set(
          key,
          (
            totals.get(key) ||
            0
          ) +
          result.percentage *
          weight
        );

        weights.set(
          key,
          (
            weights.get(key) ||
            0
          ) +
          weight
        );
      });
  });

  return [
    ...totals.keys()
  ]
    .map(key => {
      const displayName =
        polls
          .flatMap(primaryPollResults)
          .find(result =>
            result.name
              .toLowerCase() === key
          )
          ?.name ||
        key;

      return {
        name: displayName,

        average:
          totals.get(key) /
          weights.get(key)
      };
    })
    .filter(result =>
      Number.isFinite(
        result.average
      )
    )
    .sort(
      (first, second) =>
        second.average -
        first.average
    );
}


/* =========================================================
   COLORS
   ========================================================= */

function primaryCandidateColor(
  index,
  party
) {
  const democraticColors = [
    "#1677ff",
    "#45a3ff",
    "#174ea6",
    "#6da4df",
    "#8b5cf6",
    "#16a36a",
    "#f5b942",
    "#64748b"
  ];

  const republicanColors = [
    "#ef4444",
    "#c54545",
    "#991f1f",
    "#fb7185",
    "#f97316",
    "#8b5cf6",
    "#64748b",
    "#f5b942"
  ];

  const colors =
    party === "R"
      ? republicanColors
      : democraticColors;

  return colors[
    index %
    colors.length
  ];
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderPrimarySummary() {
  const partyPolls =
    primaryTrackerPolls.filter(
      poll =>
        primaryPollParty(poll) ===
        primaryTrackerParty
    );

  const average =
    calculatePrimaryAverage(
      partyPolls
    );

  const leader =
    average[0];

  const partyName =
    primaryTrackerParty === "R"
      ? "Republican"
      : "Democratic";

  const partyColor =
    primaryTrackerParty === "R"
      ? "var(--red)"
      : "var(--blue)";

  setElementText(
    "#primaryAverageTitle",
    `${partyName} primary`
  );

  setElementText(
    "#primaryLeaderAverage",
    leader
      ? `${leader.average.toFixed(1)}%`
      : "—"
  );

  setElementText(
    "#primaryLeaderName",
    leader?.name ||
    "No average yet"
  );

  setElementText(
    "#primaryLeaderParty",
    `${partyName} primary`
  );

  setElementText(
    "#primaryTopCandidateAverage",
    leader
      ? `${leader.average.toFixed(1)}%`
      : "—%"
  );

  setElementText(
    "#primaryTopCandidateName",
    leader?.name ||
    "No leader yet"
  );

  setElementText(
    "#primaryTopCandidateMeta",
    leader
      ? `Leads ElectionLab's average of ${partyPolls.length} published ${
          partyPolls.length === 1
            ? "poll"
            : "polls"
        }.`
      : "Waiting for published polls."
  );

  const leaderAverage =
    document.querySelector(
      "#primaryLeaderAverage"
    );

  const topAverage =
    document.querySelector(
      "#primaryTopCandidateAverage"
    );

  if (leaderAverage) {
    leaderAverage.style.color =
      partyColor;
  }

  if (topAverage) {
    topAverage.style.color =
      partyColor;
  }

  const badge =
    document.querySelector(
      "#primaryPollCountBadge"
    );

  if (badge) {
    badge.textContent =
      `${partyPolls.length} ${
        partyPolls.length === 1
          ? "poll"
          : "polls"
      }`;

    badge.className =
      `badge ${
        primaryTrackerParty === "R"
          ? "red"
          : "blue"
      }`;
  }

  renderPrimaryCandidateList(
    average
  );

  renderPrimaryAverageBar(
    average
  );
}

function renderPrimaryCandidateList(
  average
) {
  const box =
    document.querySelector(
      "#primaryCandidateAverageList"
    );

  if (!box) {
    return;
  }

  if (!average.length) {
    box.innerHTML = `
      <p class="subtle">
        Add published primary polls to calculate an average.
      </p>
    `;

    return;
  }

  box.innerHTML =
    average
      .slice(0, 12)
      .map(
        (candidate, index) => `
          <div class="trackerCandidateRow">

            <div>

              <i
                class="partyDot"
                style="background:${primaryCandidateColor(
                  index,
                  primaryTrackerParty
                )}"
              ></i>

              <b>
                ${escapeHtml(
                  candidate.name
                )}
              </b>

            </div>

            <strong>
              ${candidate.average.toFixed(1)}%
            </strong>

          </div>
        `
      )
      .join("");
}

function renderPrimaryAverageBar(
  average
) {
  const bar =
    document.querySelector(
      "#primaryAverageBar"
    );

  const legend =
    document.querySelector(
      "#primaryAverageLegend"
    );

  if (!bar || !legend) {
    return;
  }

  if (!average.length) {
    bar.innerHTML = "";
    legend.innerHTML = "";
    return;
  }

  const displayed =
    average.slice(0, 6);

  const displayedTotal =
    displayed.reduce(
      (total, candidate) =>
        total +
        candidate.average,
      0
    );

  const other =
    Math.max(
      0,
      100 -
      displayedTotal
    );

  const segments = [
    ...displayed.map(
      (candidate, index) => ({
        name:
          candidate.name,

        value:
          candidate.average,

        color:
          primaryCandidateColor(
            index,
            primaryTrackerParty
          )
      })
    ),

    ...(other > 0.05
      ? [{
          name:
            "Other / Undecided",

          value:
            other,

          color:
            "#dce5f2"
        }]
      : [])
  ];

  bar.innerHTML =
    segments
      .map(segment => `
        <span
          title="${escapeHtml(
            segment.name
          )}: ${segment.value.toFixed(1)}%"
          style="
            width:${segment.value}%;
            background:${segment.color};
          "
        ></span>
      `)
      .join("");

  legend.innerHTML =
    segments
      .map(segment => `
        <span>

          <i
            style="background:${segment.color}"
          ></i>

          ${escapeHtml(
            segment.name
          )}

          <b>
            ${segment.value.toFixed(1)}%
          </b>

        </span>
      `)
      .join("");
}


/* =========================================================
   POLL TABLE
   ========================================================= */

function renderPrimaryPollTable() {
  const body =
    document.querySelector(
      "#primaryPollTable"
    );

  if (!body) {
    return;
  }

  const polls =
    primaryTrackerPolls.filter(
      poll =>
        primaryPollParty(poll) ===
        primaryTrackerParty
    );

  if (!polls.length) {
    body.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="empty"
        >
          No published polls for this primary yet.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    polls
      .map(poll => {
        const results =
          primaryPollResults(poll)
            .sort(
              (first, second) =>
                second.percentage -
                first.percentage
            );

        const leader =
          results[0];

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

            <td>
              <span
                class="badge ${
                  primaryTrackerParty === "R"
                    ? "red"
                    : "blue"
                }"
              >
                ${
                  primaryTrackerParty === "R"
                    ? "Republican"
                    : "Democratic"
                }
              </span>
            </td>

            <td>
              ${escapeHtml(
                leader?.name ||
                "—"
              )}
            </td>

            <td>
              ${
                leader
                  ? `${leader.percentage.toFixed(1)}%`
                  : "—"
              }
            </td>

          </tr>
        `;
      })
      .join("");
}


/* =========================================================
   RUNNING AVERAGE
   ========================================================= */

function buildPrimaryRunningAverage(
  polls
) {
  if (!polls.length) {
    return [];
  }

  const sorted =
    [...polls].sort(
      (first, second) =>
        new Date(
          `${
            first.end_date ||
            first.start_date
          }T12:00:00`
        ) -
        new Date(
          `${
            second.end_date ||
            second.start_date
          }T12:00:00`
        )
    );

  const firstDate =
    sorted[0].end_date ||
    sorted[0].start_date;

  const lastPoll =
    sorted[
      sorted.length - 1
    ];

  const lastDate =
    lastPoll.end_date ||
    lastPoll.start_date;

  return buildDateSequence(
    firstDate,
    lastDate
  )
    .map(date => {
      const eligible =
        sorted.filter(poll => {
          const pollDate =
            poll.end_date ||
            poll.start_date;

          return (
            pollDate <= date &&
            daysBetween(
              pollDate,
              date
            ) <= 90
          );
        });

      if (!eligible.length) {
        return null;
      }

      return {
        date,
        averages:
          calculatePrimaryAverage(
            eligible,
            date
          )
      };
    })
    .filter(point =>
      point &&
      point.averages.length
    );
}

function filterPrimaryPoints(
  points
) {
  if (
    primaryTrackerRange ===
    "all"
  ) {
    return points;
  }

  const days =
    Number(
      primaryTrackerRange
    );

  const latestDate =
    new Date(
      `${points.at(-1).date}T12:00:00`
    );

  const cutoff =
    new Date(
      latestDate
    );

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

function renderPrimaryChart() {
  const canvas =
    document.querySelector(
      "#primaryChart"
    );

  const wrap =
    document.querySelector(
      "#primaryChartWrap"
    );

  const empty =
    document.querySelector(
      "#primaryChartEmpty"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  const polls =
    primaryTrackerPolls.filter(
      poll =>
        primaryPollParty(poll) ===
        primaryTrackerParty
    );

  const rawPoints =
    buildPrimaryRunningAverage(
      polls
    );

  const points =
    rawPoints.length
      ? filterPrimaryPoints(
          rawPoints
        )
      : [];

  if (!points.length) {
    primaryTrackerChart?.destroy();
    primaryTrackerChart = null;

    if (wrap) {
      wrap.style.display =
        "none";
    }

    if (empty) {
      empty.style.display =
        "";
    }

    return;
  }

  if (wrap) {
    wrap.style.display =
      "";
  }

  if (empty) {
    empty.style.display =
      "none";
  }

  const currentAverage =
    points.at(-1).averages;

  const candidates =
    currentAverage
      .slice(0, 6)
      .map(candidate =>
        candidate.name
      );

  const labels =
    points.map(point =>
      point.date
    );

  const datasets =
    candidates.map(
      (candidateName, index) => ({
        label:
          candidateName,

        data:
          points.map(point => {
            const candidate =
              point.averages.find(
                result =>
                  result.name
                    .toLowerCase() ===
                  candidateName
                    .toLowerCase()
              );

            return candidate
              ? candidate.average
              : null;
          }),

        borderColor:
          primaryCandidateColor(
            index,
            primaryTrackerParty
          ),

        backgroundColor:
          primaryCandidateColor(
            index,
            primaryTrackerParty
          ),

        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.32,
        spanGaps: true
      })
    );

  primaryTrackerChart?.destroy();

  primaryTrackerChart =
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
          maintainAspectRatio: false,

          interaction: {
            mode: "index",
            intersect: false
          },

          plugins: {
            legend: {
              position: "top",
              align: "start",

              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                padding: 16
              }
            },

            tooltip: {
              callbacks: {
                title(items) {
                  return items.length
                    ? fmtDate(
                        labels[
                          items[0]
                            .dataIndex
                        ]
                      )
                    : "";
                },

                label(context) {
                  const value =
                    Number(
                      context.raw
                    );

                  return `${context.dataset.label}: ${
                    Number.isFinite(value)
                      ? value.toFixed(1)
                      : "—"
                  }%`;
                }
              }
            }
          },

          scales: {
            x: {
              grid: {
                display: false
              },

              ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                maxRotation: 0,

                callback(
                  value,
                  index
                ) {
                  return fmtDate(
                    labels[index],
                    {
                      includeYear:
                        primaryTrackerRange ===
                        "all"
                    }
                  );
                }
              }
            },

            y: {
              beginAtZero: true,

              ticks: {
                callback(value) {
                  return `${value}%`;
                }
              },

              grid: {
                color:
                  "rgba(130,149,178,.16)"
              }
            }
          }
        }
      }
    );

  const leader =
    currentAverage[0];

  setElementText(
    "#primaryChartLatest",
    leader
      ? `Latest average: ${leader.name} ${leader.average.toFixed(1)}%`
      : "Latest average: —"
  );

  const latestPoll =
    polls[0];

  setElementText(
    "#primaryChartUpdated",
    `Last updated: ${
      latestPoll
        ? fmtDate(
            latestPoll.end_date
          )
        : "—"
    }`
  );
}


/* =========================================================
   CONTROLS
   ========================================================= */

function renderPrimaryTracker() {
  document
    .querySelectorAll(
      "#primaryPartyTabs button[data-party]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.party ===
        primaryTrackerParty
      );
    });

  renderPrimarySummary();
  renderPrimaryPollTable();
  renderPrimaryChart();
}

function initializePrimaryControls() {
  document
    .querySelectorAll(
      "#primaryPartyTabs button[data-party]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          primaryTrackerParty =
            button.dataset.party ===
            "R"
              ? "R"
              : "D";

          renderPrimaryTracker();
        }
      );
    });

  document
    .querySelectorAll(
      "#primaryRangeControls button[data-range]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          primaryTrackerRange =
            button.dataset.range ||
            "90";

          document
            .querySelectorAll(
              "#primaryRangeControls button[data-range]"
            )
            .forEach(item => {
              item.classList.toggle(
                "active",
                item === button
              );
            });

          renderPrimaryChart();
        }
      );
    });
}


/* =========================================================
   STARTUP
   ========================================================= */

async function initializePrimaryTracker() {
  if (
    !document.querySelector(
      "#primaryPartyTabs"
    )
  ) {
    return;
  }

  try {
    primaryTrackerPolls =
      await getPublishedPrimaryPolls();

    initializePrimaryControls();

    renderPrimaryTracker();

  } catch (error) {
    console.error(
      "Primary tracker failed:",
      error
    );

    const table =
      document.querySelector(
        "#primaryPollTable"
      );

    if (table) {
      table.innerHTML = `
        <tr>
          <td
            colspan="6"
            class="empty"
          >
            ${escapeHtml(
              error.message ||
              "Unable to load primary polling."
            )}
          </td>
        </tr>
      `;
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initializePrimaryTracker
);
