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


let racePollingChart =
  null;


let activeRacePolls =
  [];


let activeRaceCandidates =
  [];


let activeChartRange =
  "90";



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



    setTextForSelectors(
      [
        "#congressControlMessage",
        "[data-setting='congress_control_message']"
      ],

      settings.congress_control_message
    );



    setTextForSelectors(
      [
        "#featuredRacesTitle",
        "[data-setting='homepage_featured_title']"
      ],

      settings.homepage_featured_title
    );



    setTextForSelectors(
      [
        "#featuredRacesSubtitle",
        "[data-setting='homepage_featured_subtitle']"
      ],

      settings.homepage_featured_subtitle
    );



    renderForecastCounter(
      settings
    );


  } catch(error) {

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
    raceOffice(
      race
    );


  const label =
    officeLabel(
      office
    );


  const margin =
    Number(
      race.projected_margin ||
      0
    );



  const candidateMarkup =
    candidates.length

      ?

        candidates
          .slice(0,3)
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
                    candidate.win_probability ||
                    0
                  ).toFixed(0)}%

                </strong>

              </div>

            `
          )
          .join("")

      :

        `
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

        ${candidateMarkup}

      </div>



      <div class="raceMeta">


        <span>
          Model margin
        </span>



        <strong>

          ${formatMargin(
            margin
          )}

        </strong>


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
    100 -
    Math.min(
      100,
      margin * 7
    );



  if (
    rating.includes("toss")
  ) {

    score += 50;

  }

  else if (
    rating.includes("tilt")
  ) {

    score += 40;

  }

  else if (
    rating.includes("lean")
  ) {

    score += 25;

  }

  else if (
    rating.includes("likely")
  ) {

    score += 10;

  }



  if (
    race.featured
  ) {

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

  const explicitlyFeatured =
    races.filter(
      race =>
        race.featured
    );



  if (
    explicitlyFeatured.length
  ) {

    return explicitlyFeatured
      .sort(
        (
          first,
          second
        ) =>

          raceImportanceScore(
            second
          )

          -

          raceImportanceScore(
            first
          )

      )
      .slice(
        0,
        6
      );

  }



  return [...races]
    .sort(
      (
        first,
        second
      ) =>

        raceImportanceScore(
          second
        )

        -

        raceImportanceScore(
          first
        )

    )
    .slice(
      0,
      6
    );

}







/* =========================================================
   HOMEPAGE LOADING
   ========================================================= */


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

        ?

          featured
            .map(
              raceCard
            )
            .join("")

        :

          `

            <div class="empty">

              No published races yet.

            </div>

          `;



    renderRaceOfTheDay(
      races
    );



  }

  catch(error) {


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
    )

    ||

    races.find(
      race =>
        race.featured
    )

    ||

    [...races]
      .sort(
        (
          first,
          second
        ) =>

          raceImportanceScore(
            second
          )

          -

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

            ?

              candidates
                .slice(0,3)
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
                          candidate.win_probability ||
                          0
                        ).toFixed(0)}%

                      </b>



                    </span>


                  `
                )
                .join("")

            :

              `

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
        ${escapeHtml(label)}
        races.

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

          ?

            list
              .map(
                raceCard
              )
              .join("")

          :

            `

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

                    ...(race.candidates || [])
                      .map(
                        candidate =>
                          candidate.name
                      )
                  ]

                    .filter(
                      Boolean
                    )

                    .join(
                      " "
                    )

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

  }

  catch(error) {

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
      )
      .get(
        "id"
      );


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


    const polls =
      await getPublishedPolls(
        race.id
      );


    activeRacePolls =
      polls;


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

  }

  catch(error) {

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



/* =========================================================
   RACE HEADER + FORECAST
   ========================================================= */


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

  }

  else {

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
/* =========================================================
   POLLING AVERAGE
   ========================================================= */


function pollCandidateValue(
  poll,
  candidate,
  index
) {

  const party =
    normalizeParty(
      candidate?.party
    );


  if (
    party === "D"
  ) {

    return Number(
      poll.dem_pct ??
      poll.democratic_pct ??
      poll.d_pct ??
      0
    );

  }


  if (
    party === "R"
  ) {

    return Number(
      poll.rep_pct ??
      poll.republican_pct ??
      poll.r_pct ??
      0
    );

  }


  const possibleFields = [

    `candidate_${index + 1}_pct`,

    `candidate${index + 1}_pct`,

    `candidate_${candidate?.id}_pct`,

    `candidate_${normalizeText(
      candidate?.name
    )
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )}_pct`

  ];


  for (
    const field of possibleFields
  ) {

    const value =
      Number(
        poll[field]
      );


    if (
      Number.isFinite(
        value
      ) &&
      value > 0
    ) {

      return value;

    }

  }


  return 0;

}



function calculateCandidatePollingAverage(
  polls,
  candidate,
  index
) {

  const usablePolls =
    polls.filter(
      poll => {

        const value =
          pollCandidateValue(
            poll,
            candidate,
            index
          );


        return (
          Number.isFinite(
            value
          ) &&
          value > 0
        );

      }
    );


  if (
    !usablePolls.length
  ) {

    return null;

  }


  let weightedTotal =
    0;


  let totalWeight =
    0;


  usablePolls.forEach(
    poll => {

      const value =
        pollCandidateValue(
          poll,
          candidate,
          index
        );


      const sampleSize =
        Number(
          poll.sample_size ||
          0
        );


      const weight =
        sampleSize > 0

          ?

            Math.sqrt(
              sampleSize
            )

          :

            1;


      weightedTotal +=
        value * weight;


      totalWeight +=
        weight;

    }
  );


  if (
    totalWeight <= 0
  ) {

    return null;

  }


  return (
    weightedTotal /
    totalWeight
  );

}



function renderRacePollingAverage(
  race,
  candidates,
  polls
) {

  const container =
    document.querySelector(
      "#racePollingAverage"
    );


  if (!container) {

    return;

  }


  if (
    !Array.isArray(
      polls
    ) ||
    !polls.length
  ) {

    container.innerHTML = `

      <div class="empty">

        No published polling is available for this race.

      </div>

    `;

    return;

  }


  const averages =
    candidates

      .map(
        (
          candidate,
          index
        ) => ({

          candidate,

          average:
            calculateCandidatePollingAverage(
              polls,
              candidate,
              index
            )

        })
      )

      .filter(
        item =>
          item.average !== null
      )

      .sort(
        (
          first,
          second
        ) =>

          second.average -
          first.average

      );


  if (
    !averages.length
  ) {

    container.innerHTML = `

      <div class="empty">

        Polling data exists, but no candidate percentages could be calculated.

      </div>

    `;

    return;

  }


  const leader =
    averages[0];


  const runnerUp =
    averages[1];


  const pollingMargin =
    runnerUp

      ?

        leader.average -
        runnerUp.average

      :

        0;


  container.innerHTML = `

    <div class="pollingAverageHeader">

      <div>

        <span class="kicker">

          ElectionLab polling average

        </span>

        <h3>

          ${escapeHtml(
            leader.candidate.name ||
            "Leader"
          )}

          leads

          ${pollingMargin.toFixed(
            1
          )}

          points

        </h3>

      </div>

      <strong>

        ${averages.length}

        candidate${averages.length === 1 ? "" : "s"}

      </strong>

    </div>


    <div class="pollingAverageList">

      ${averages
        .map(
          item => {

            const party =
              normalizeParty(
                item.candidate.party
              );


            return `

              <div class="pollingAverageRow">

                <div class="pollingAverageCandidate">

                  <i
                    class="partyDot ${partyCssClass(
                      party
                    )}"
                  ></i>

                  <span>

                    ${escapeHtml(
                      item.candidate.name ||
                      "Unnamed candidate"
                    )}

                  </span>

                </div>


                <div class="pollingAverageBar">

                  <span
                    style="
                      width:${clamp(
                        item.average,
                        0,
                        100
                      )}%;

                      background:${partyColor(
                        party
                      )};
                    "
                  ></span>

                </div>


                <strong>

                  ${item.average.toFixed(
                    1
                  )}%

                </strong>

              </div>

            `;

          }
        )
        .join("")}

    </div>

  `;

}



/* =========================================================
   POLLING METADATA
   ========================================================= */


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

      ?

        `${fmtDate(
          metadata.startDate
        )} – ${fmtDate(
          metadata.endDate
        )}`

      :

        "—"

  );


  setElementText(
    "#raceLatestPollster",
    metadata.latestPollster ||
    "—"
  );


  setElementText(
    "#raceLatestPollDate",

    metadata.latestPoll

      ?

        fmtDateRange(
          metadata.latestPoll.start_date,
          metadata.latestPoll.end_date
        )

      :

        "—"

  );


  const updatedAt =
    race.updated_at ||
    metadata.latestPoll?.updated_at ||
    metadata.latestPoll?.created_at ||
    metadata.endDate;


  setElementText(
    "#pollingChartUpdated",
    `Forecast updated: ${formatTimestamp(
      updatedAt
    )}`
  );

}



/* =========================================================
   POLL TABLE
   ========================================================= */


function renderRacePollTable(
  race,
  polls
) {

  const table =
    document.querySelector(
      "#racePollTable"
    );


  if (!table) {

    return;

  }


  if (
    !Array.isArray(
      polls
    ) ||
    !polls.length
  ) {

    table.innerHTML = `

      <tr>

        <td
          colspan="8"
          class="empty"
        >

          No published polls are available.

        </td>

      </tr>

    `;

    return;

  }


  const candidates =
    activeRaceCandidates;


  const sortedPolls =
    [...polls]
      .sort(
        (
          first,
          second
        ) => {

          const firstDate =
            new Date(
              first.end_date ||
              first.start_date ||
              0
            );


          const secondDate =
            new Date(
              second.end_date ||
              second.start_date ||
              0
            );


          return (
            secondDate -
            firstDate
          );

        }
      );


  table.innerHTML =
    sortedPolls

      .map(
        poll => {

          const candidateValues =
            candidates
              .slice(
                0,
                3
              )
              .map(
                (
                  candidate,
                  index
                ) => {

                  const value =
                    pollCandidateValue(
                      poll,
                      candidate,
                      index
                    );


                  return `

                    <td>

                      ${value > 0
                        ? `${value.toFixed(1)}%`
                        : "—"}

                    </td>

                  `;

                }
              )
              .join("");


          return `

            <tr>

              <td>

                <strong>

                  ${escapeHtml(
                    poll.pollster ||
                    "Unknown pollster"
                  )}

                </strong>

              </td>


              <td>

                ${escapeHtml(
                  fmtDateRange(
                    poll.start_date,
                    poll.end_date
                  )
                )}

              </td>


              <td>

                ${escapeHtml(
                  poll.population ||
                  poll.sample_type ||
                  "—"
                )}

              </td>


              <td>

                ${Number(
                  poll.sample_size ||
                  0
                ) > 0

                  ?

                    Number(
                      poll.sample_size
                    ).toLocaleString()

                  :

                    "—"}

              </td>


              ${candidateValues}

            </tr>

          `;

        }
      )

      .join("");

}



/* =========================================================
   POLLING CHART
   ========================================================= */


function pollDateValue(
  poll
) {

  return (
    poll.end_date ||
    poll.start_date ||
    poll.created_at ||
    null
  );

}



function filterPollsByRange(
  polls,
  range
) {

  if (
    range === "all"
  ) {

    return [...polls];

  }


  const numberOfDays =
    Number(
      range
    );


  if (
    !Number.isFinite(
      numberOfDays
    ) ||
    numberOfDays <= 0
  ) {

    return [...polls];

  }


  const cutoff =
    new Date();


  cutoff.setDate(
    cutoff.getDate() -
    numberOfDays
  );


  return polls.filter(
    poll => {

      const date =
        new Date(
          pollDateValue(
            poll
          ) ||
          0
        );


      return (
        !Number.isNaN(
          date.getTime()
        ) &&
        date >= cutoff
      );

    }
  );

}



function initializeRaceChartControls(
  polls,
  candidates
) {

  const controls =
    document.querySelectorAll(
      "[data-chart-range]"
    );


  controls.forEach(
    control => {

      control.addEventListener(
        "click",
        () => {

          activeChartRange =
            control.dataset.chartRange ||
            "90";


          controls.forEach(
            item =>
              item.classList.remove(
                "active"
              )
          );


          control.classList.add(
            "active"
          );


          renderRacePollingChart(
            polls,
            candidates,
            activeChartRange
          );

        }
      );

    }
  );


  const selectedControl =
    document.querySelector(
      `[data-chart-range="${activeChartRange}"]`
    );


  if (
    selectedControl
  ) {

    selectedControl.classList.add(
      "active"
    );

  }

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


  if (!canvas) {

    return;

  }


  if (
    typeof Chart ===
    "undefined"
  ) {

    console.warn(
      "Chart.js is not loaded."
    );

    return;

  }


  const filteredPolls =
    filterPollsByRange(
      polls,
      range
    )
      .sort(
        (
          first,
          second
        ) => {

          return (

            new Date(
              pollDateValue(
                first
              ) ||
              0
            )

            -

            new Date(
              pollDateValue(
                second
              ) ||
              0
            )

          );

        }
      );


  if (
    racePollingChart
  ) {

    racePollingChart.destroy();

    racePollingChart =
      null;

  }


  if (
    !filteredPolls.length
  ) {

    return;

  }


  const labels =
    filteredPolls.map(
      poll =>
        fmtDate(
          pollDateValue(
            poll
          )
        )
    );


  const datasets =
    candidates
      .slice(
        0,
        3
      )
      .map(
        (
          candidate,
          index
        ) => {

          const party =
            normalizeParty(
              candidate.party
            );


          const color =
            partyColor(
              party
            );


          return {

            label:
              candidate.name ||
              `Candidate ${index + 1}`,

            data:
              filteredPolls.map(
                poll => {

                  const value =
                    pollCandidateValue(
                      poll,
                      candidate,
                      index
                    );


                  return (
                    value > 0
                      ? value
                      : null
                  );

                }
              ),

            borderColor:
              color,

            backgroundColor:
              color,

            tension:
              0.25,

            spanGaps:
              true,

            pointRadius:
              3,

            pointHoverRadius:
              5,

            borderWidth:
              3,

            fill:
              false

          };

        }
      );


  racePollingChart =
    new Chart(
      canvas,
      {

        type:
          "line",

        data: {

          labels,

          datasets

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
                true,

              position:
                "bottom"

            },

            tooltip: {

              callbacks: {

                label(
                  context
                ) {

                  const value =
                    Number(
                      context.raw
                    );


                  return `${context.dataset.label}: ${value.toFixed(
                    1
                  )}%`;

                }

              }

            }

          },

          scales: {

            y: {

              suggestedMin:
                30,

              suggestedMax:
                60,

              ticks: {

                callback(
                  value
                ) {

                  return `${value}%`;

                }

              }

            },

            x: {

              ticks: {

                maxRotation:
                  0,

                autoSkip:
                  true,

                maxTicksLimit:
                  8

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
    !Array.isArray(
      polls
    ) ||
    !polls.length
  ) {

    return null;

  }


  return weightedAverage(
    polls
  );

}



function renderGenericBallotSummary(
  average,
  polls
) {

  const democratic =
    Number(
      average?.dem_pct ??
      average?.democratic ??
      average?.dem ??
      0
    );


  const republican =
    Number(
      average?.rep_pct ??
      average?.republican ??
      average?.rep ??
      0
    );


  const margin =
    democratic -
    republican;


  setElementText(
    "#genericDemAverage",
    average
      ? `${democratic.toFixed(1)}%`
      : "—"
  );


  setElementText(
    "#genericRepAverage",
    average
      ? `${republican.toFixed(1)}%`
      : "—"
  );


  setElementText(
    "#genericBallotMargin",
    average
      ? formatMargin(
          margin
        )
      : "—"
  );


  setElementText(
    "#genericPollCount",
    String(
      polls.length
    )
  );


  const leaderText =
    margin > 0

      ?

        `Democrats lead by ${Math.abs(
          margin
        ).toFixed(1)} points`

      :

        margin < 0

          ?

            `Republicans lead by ${Math.abs(
              margin
            ).toFixed(1)} points`

          :

            "The generic ballot is tied";


  setElementText(
    "#genericBallotLeader",
    average
      ? leaderText
      : "No polling average available"
  );

}



function renderGenericBallotTable(
  table,
  polls
) {

  if (
    !polls.length
  ) {

    table.innerHTML = `

      <tr>

        <td
          colspan="6"
          class="empty"
        >

          No published generic ballot polls.

        </td>

      </tr>

    `;

    return;

  }


  table.innerHTML =
    [...polls]

      .sort(
        (
          first,
          second
        ) =>

          new Date(
            second.end_date ||
            second.start_date ||
            0
          )

          -

          new Date(
            first.end_date ||
            first.start_date ||
            0
          )

      )

      .map(
        poll => {

          const democratic =
            Number(
              poll.dem_pct ||
              0
            );


          const republican =
            Number(
              poll.rep_pct ||
              0
            );


          const margin =
            democratic -
            republican;


          return `

            <tr>

              <td>

                <strong>

                  ${escapeHtml(
                    poll.pollster ||
                    "Unknown pollster"
                  )}

                </strong>

              </td>


              <td>

                ${escapeHtml(
                  fmtDateRange(
                    poll.start_date,
                    poll.end_date
                  )
                )}

              </td>


              <td>

                ${escapeHtml(
                  poll.population ||
                  "—"
                )}

              </td>


              <td>

                ${Number(
                  poll.sample_size ||
                  0
                ) > 0

                  ?

                    Number(
                      poll.sample_size
                    ).toLocaleString()

                  :

                    "—"}

              </td>


              <td>

                ${democratic.toFixed(
                  1
                )}%

              </td>


              <td>

                ${republican.toFixed(
                  1
                )}%

              </td>


              <td>

                ${formatMargin(
                  margin
                )}

              </td>

            </tr>

          `;

        }
      )

      .join("");

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
          colspan="7"
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

  }

  catch(error) {

    console.error(
      "Generic ballot failed:",
      error
    );


    table.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="empty"
        >

          ${escapeHtml(
            error.message ||
            "Unable to load generic ballot polling."
          )}

        </td>

      </tr>

    `;

  }

}



/* =========================================================
   NAVIGATION
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
   EXTERNAL LINKS
   ========================================================= */


function protectExternalLinks() {

  document
    .querySelectorAll(
      "a[target='_blank']"
    )
    .forEach(
      link => {

        link.setAttribute(
          "rel",
          "noopener noreferrer"
        );

      }
    );

}



/* =========================================================
   START WEBSITE
   ========================================================= */


async function initializePublicWebsite() {

  markActiveNavigation();


  protectExternalLinks();


  const tasks = [

    loadWebsiteSettings(),

    loadHome(),

    loadRaceGrid(),

    loadRace(),

    loadGenericBallotPage()

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
          "ElectionLab initialization error:",
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
