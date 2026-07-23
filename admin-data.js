/* =========================================================
   ELECTIONLAB MODEL DATA STUDIO
   Fundamentals, candidate scores, fundraising, approval,
   and developments. Database triggers automatically rerun
   the affected forecast after every save/delete.
   ========================================================= */

const dataStudio = {
  races: [],
  candidates: [],
  fundraising: [],
  approval: [],
  developments: [],
  selectedRaceId: null,
  search: ""
};

const data$ = selector =>
  document.querySelector(selector);

function dataNumberOrNull(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function dataMoney(value) {
  const number =
    Number(value) || 0;

  return number.toLocaleString(
    undefined,
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }
  );
}

function dataOpenModal(id) {
  const modal =
    document.getElementById(id);

  if (!modal) return;

  modal.classList.add("open");
  document.body.classList.add("modalOpen");
}

function dataCloseModal(id) {
  document
    .getElementById(id)
    ?.classList.remove("open");

  if (!document.querySelector(".modal.open")) {
    document.body.classList.remove("modalOpen");
  }
}

function dataSelectedRace() {
  return (
    dataStudio.races.find(
      race =>
        race.id ===
        dataStudio.selectedRaceId
    ) ||
    null
  );
}

function dataCandidatesForRace() {
  return dataStudio.candidates.filter(
    candidate =>
      candidate.race_id ===
      dataStudio.selectedRaceId
  );
}

async function dataLoadAll(options = {}) {
  if (
    typeof sb === "undefined" ||
    !sb
  ) {
    return;
  }

  try {
    const [
      raceResult,
      candidateResult,
      fundraisingResult,
      approvalResult,
      developmentResult
    ] = await Promise.all([
      sb
        .from("races")
        .select("*")
        .order("state", { ascending: true })
        .order("title", { ascending: true }),

      sb
        .from("candidates")
        .select("*")
        .order("name", { ascending: true }),

      sb
        .from("fundraising")
        .select("*,candidates(name,party)")
        .order("reporting_date", { ascending: false }),

      sb
        .from("approval_data")
        .select("*,candidates(name,party)")
        .order("end_date", { ascending: false }),

      sb
        .from("race_developments")
        .select("*")
        .order("event_date", { ascending: false })
    ]);

    const error =
      raceResult.error ||
      candidateResult.error ||
      fundraisingResult.error ||
      approvalResult.error ||
      developmentResult.error;

    if (error) throw error;

    dataStudio.races =
      raceResult.data || [];

    dataStudio.candidates =
      candidateResult.data || [];

    dataStudio.fundraising =
      fundraisingResult.data || [];

    dataStudio.approval =
      approvalResult.data || [];

    dataStudio.developments =
      developmentResult.data || [];

    dataRenderRaceOptions();

    if (dataStudio.selectedRaceId) {
      dataRenderSelectedRace();
    }

    if (
      !options.silent &&
      typeof msg === "function"
    ) {
      msg("Model data refreshed.");
    }
  } catch (error) {
    console.error(
      "Model Data Studio failed:",
      error
    );

    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to load model data.",
        "error"
      );
    }
  }
}

function dataFilteredRaces() {
  const query =
    dataStudio.search
      .trim()
      .toLowerCase();

  if (!query) {
    return dataStudio.races;
  }

  return dataStudio.races.filter(
    race =>
      [
        race.state,
        race.title,
        race.slug,
        race.office,
        race.district_code
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
  );
}

function dataRenderRaceOptions() {
  const select =
    data$("#dataStudioRaceSelect");

  if (!select) return;

  const races =
    dataFilteredRaces();

  select.innerHTML = `
    <option value="">
      Choose a race…
    </option>

    ${races
      .map(
        race => `
          <option
            value="${escapeHtml(race.id)}"
            ${
              race.id ===
              dataStudio.selectedRaceId
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              race.state || ""
            )} — ${escapeHtml(
              race.title || ""
            )}
          </option>
        `
      )
      .join("")}
  `;
}

function dataRenderSelectedRace() {
  const race =
    dataSelectedRace();

  const workspace =
    data$("#dataStudioWorkspace");

  if (!race) {
    if (workspace) {
      workspace.hidden = true;
    }

    data$("#dataStudioRaceSummary").textContent =
      "Select a race to edit its model inputs.";

    return;
  }

  if (workspace) {
    workspace.hidden = false;
  }

  data$("#dataStudioRaceSummary").innerHTML = `
    <div>
      <b>${escapeHtml(
        race.title ||
        "Untitled race"
      )}</b>

      <span>
        ${escapeHtml(
          race.state || ""
        )}
        ·
        ${escapeHtml(
          race.office || ""
        )}
        ·
        ${escapeHtml(
          race.forecast_mode ||
          "automatic"
        )}
      </span>
    </div>

    <div>
      <span>Current model</span>
      <b>
        ${escapeHtml(
          typeof formatAdminMargin ===
          "function"
            ? formatAdminMargin(
                race.model_projected_margin
              )
            : String(
                race.model_projected_margin ??
                "—"
              )
        )}
      </b>
    </div>
  `;

  dataFillFundamentals(race);
  dataRenderCandidateScores();
  dataRenderFundraising();
  dataRenderApproval();
  dataRenderDevelopments();
  dataPopulateCandidateSelects();
}

function dataFillFundamentals(race) {
  data$("#dataOffice").value =
    race.office ||
    "senate";

  data$("#dataElectionDate").value =
    race.election_date ||
    "2026-11-03";

  data$("#dataDistrictCode").value =
    race.district_code ||
    "";

  data$("#dataIncumbentParty").value =
    race.incumbent_party ||
    "";

  data$("#dataPartisanLean").value =
    race.partisan_lean ??
    "";

  data$("#dataPreviousResult").value =
    race.previous_result_margin ??
    "";

  data$("#dataStatewideMargin").value =
    race.recent_statewide_margin ??
    "";

  data$("#dataElasticity").value =
    race.elasticity ??
    1;

  data$("#dataFundamentalsNotes").value =
    race.fundamentals_notes ||
    "";
}

async function dataSaveFundamentals(event) {
  event.preventDefault();

  const race =
    dataSelectedRace();

  if (!race) return;

  const button =
    event.submitter;

  if (button) {
    button.disabled = true;
    button.textContent =
      "Saving…";
  }

  try {
    const payload = {
      office:
        data$("#dataOffice").value,

      election_date:
        data$("#dataElectionDate").value,

      district_code:
        data$("#dataDistrictCode")
          .value
          .trim() ||
        null,

      incumbent_party:
        data$("#dataIncumbentParty")
          .value ||
        null,

      partisan_lean:
        dataNumberOrNull(
          data$("#dataPartisanLean")
            .value
        ),

      previous_result_margin:
        dataNumberOrNull(
          data$("#dataPreviousResult")
            .value
        ),

      recent_statewide_margin:
        dataNumberOrNull(
          data$("#dataStatewideMargin")
            .value
        ),

      elasticity:
        dataNumberOrNull(
          data$("#dataElasticity")
            .value
        ) ?? 1,

      fundamentals_notes:
        data$("#dataFundamentalsNotes")
          .value
          .trim() ||
        null,

      latest_input_at:
        new Date().toISOString()
    };

    const {
      error
    } =
      await sb
        .from("races")
        .update(payload)
        .eq(
          "id",
          race.id
        );

    if (error) throw error;

    await dataLoadAll({
      silent: true
    });

    if (
      typeof loadModelV2Data ===
      "function"
    ) {
      await loadModelV2Data({
        silent: true
      });
    }

    if (typeof msg === "function") {
      msg(
        "Fundamentals saved. The race forecast recalculated automatically."
      );
    }
  } catch (error) {
    console.error(error);

    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to save fundamentals.",
        "error"
      );
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Save fundamentals";
    }
  }
}

async function dataMarkReviewed() {
  const race =
    dataSelectedRace();

  if (!race) return;

  try {
    const {
      error
    } =
      await sb
        .from("races")
        .update({
          review_status:
            "reviewed",
          reviewed_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          race.id
        );

    if (error) throw error;

    await dataLoadAll({
      silent: true
    });

    if (typeof msg === "function") {
      msg("Race marked reviewed.");
    }
  } catch (error) {
    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to mark reviewed.",
        "error"
      );
    }
  }
}

function dataCandidateScoreInput(
  candidate,
  field,
  label
) {
  return `
    <div class="field">
      <label>
        ${escapeHtml(label)}
      </label>

      <input
        type="number"
        min="-5"
        max="5"
        step="0.1"
        value="${
          candidate[field] ??
          0
        }"
        data-score-field="${escapeHtml(
          field
        )}"
      >
    </div>
  `;
}

function dataRenderCandidateScores() {
  const box =
    data$("#dataCandidateScoreCards");

  if (!box) return;

  const candidates =
    dataCandidatesForRace();

  if (!candidates.length) {
    box.innerHTML = `
      <div class="empty">
        No candidates are attached to this race.
      </div>
    `;

    return;
  }

  box.innerHTML =
    candidates.map(
      candidate => `
        <article
          class="card candidateScoreCard"
          data-candidate-score-card="${escapeHtml(
            candidate.id
          )}"
        >

          <div class="candidateScoreHead">

            <div>
              <div class="candidateForecastIdentity">
                <i class="partyDot ${partyCssClass(
                  candidate.party
                )}"></i>

                <strong>
                  ${escapeHtml(
                    candidate.name
                  )}
                </strong>
              </div>

              <small>
                ${candidate.incumbent
                  ? "Incumbent"
                  : candidate
                      .is_presumptive_nominee
                  ? "Presumptive nominee"
                  : "Candidate"}
              </small>
            </div>

            <span class="modeBadge automatic">
              ${escapeHtml(
                candidate.party
              )}
            </span>

          </div>

          <div class="formGrid candidateScoreGrid">

            ${dataCandidateScoreInput(
              candidate,
              "quality_score",
              "Overall quality"
            )}

            ${dataCandidateScoreInput(
              candidate,
              "experience_score",
              "Experience"
            )}

            ${dataCandidateScoreInput(
              candidate,
              "favorability_score",
              "Favorability"
            )}

            ${dataCandidateScoreInput(
              candidate,
              "campaign_score",
              "Campaign"
            )}

            ${dataCandidateScoreInput(
              candidate,
              "party_unity_score",
              "Party unity"
            )}

            ${dataCandidateScoreInput(
              candidate,
              "scandal_score",
              "Scandal / liability"
            )}

          </div>

          <div class="candidateScoreActions">

            <label>
              <input
                type="checkbox"
                data-score-active
                ${candidate.active
                  ? "checked"
                  : ""}
              >
              Active
            </label>

            <label>
              <input
                type="checkbox"
                data-score-presumptive
                ${candidate
                    .is_presumptive_nominee
                  ? "checked"
                  : ""}
              >
              Presumptive nominee
            </label>

            <button
              class="btn green"
              type="button"
              data-save-candidate-score="${escapeHtml(
                candidate.id
              )}"
            >
              Save score
            </button>

          </div>

        </article>
      `
    ).join("");
}

async function dataSaveCandidateScore(
  candidateId,
  button
) {
  const card =
    document.querySelector(
      `[data-candidate-score-card="${CSS.escape(
        candidateId
      )}"]`
    );

  if (!card) return;

  const payload = {};

  card
    .querySelectorAll(
      "[data-score-field]"
    )
    .forEach(
      input => {
        payload[
          input.dataset.scoreField
        ] =
          Number(
            input.value ||
            0
          );
      }
    );

  payload.active =
    card.querySelector(
      "[data-score-active]"
    )?.checked ??
    true;

  payload.is_presumptive_nominee =
    card.querySelector(
      "[data-score-presumptive]"
    )?.checked ??
    false;

  payload.candidate_score_updated_at =
    new Date().toISOString();

  const original =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "Saving…";

  try {
    const {
      error
    } =
      await sb
        .from("candidates")
        .update(payload)
        .eq(
          "id",
          candidateId
        );

    if (error) throw error;

    await dataLoadAll({
      silent: true
    });

    if (
      typeof loadModelV2Data ===
      "function"
    ) {
      await loadModelV2Data({
        silent: true
      });
    }

    if (typeof msg === "function") {
      msg(
        "Candidate score saved. The forecast recalculated automatically."
      );
    }
  } catch (error) {
    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to save candidate score.",
        "error"
      );
    }
  } finally {
    button.disabled = false;
    button.textContent =
      original;
  }
}

function dataPopulateCandidateSelects() {
  const candidates =
    dataCandidatesForRace();

  [
    data$("#dataFundraisingCandidate"),
    data$("#dataApprovalCandidate")
  ].forEach(
    select => {
      if (!select) return;

      const firstOption =
        select.id ===
        "dataApprovalCandidate"
          ? `
            <option value="">
              Unlinked officeholder
            </option>
          `
          : "";

      select.innerHTML =
        firstOption +
        candidates.map(
          candidate => `
            <option value="${escapeHtml(
              candidate.id
            )}">
              ${escapeHtml(
                candidate.name
              )}
              (${escapeHtml(
                candidate.party
              )})
            </option>
          `
        ).join("");
    }
  );
}

function dataRenderFundraising() {
  const body =
    data$("#dataFundraisingBody");

  if (!body) return;

  const rows =
    dataStudio.fundraising.filter(
      row =>
        row.race_id ===
        dataStudio.selectedRaceId
    );

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          No fundraising reports added.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    rows.map(
      row => `
        <tr>
          <td>
            <b>${escapeHtml(
              row.candidates?.name ||
              "Unlinked candidate"
            )}</b>
          </td>

          <td>
            ${escapeHtml(
              fmtDate(
                row.reporting_date
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              dataMoney(
                row.total_raised
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              dataMoney(
                row.cash_on_hand
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              dataMoney(
                row.total_spent
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              dataMoney(
                row.outside_spending_for
              )
            )}
          </td>

          <td>
            <div class="tableActions">

              <button
                class="btn light"
                type="button"
                data-edit-fundraising="${escapeHtml(
                  row.id
                )}"
              >
                Edit
              </button>

              <button
                class="btn red"
                type="button"
                data-delete-fundraising="${escapeHtml(
                  row.id
                )}"
              >
                Delete
              </button>

            </div>
          </td>
        </tr>
      `
    ).join("");
}

function dataEditFundraising(id = null) {
  const row =
    dataStudio.fundraising.find(
      item =>
        item.id === id
    ) ||
    null;

  data$("#dataFundraisingId").value =
    row?.id ||
    "";

  dataPopulateCandidateSelects();

  data$("#dataFundraisingCandidate").value =
    row?.candidate_id ||
    dataCandidatesForRace()[0]?.id ||
    "";

  data$("#dataFundraisingDate").value =
    row?.reporting_date ||
    new Date()
      .toISOString()
      .slice(0, 10);

  data$("#dataFundraisingRaised").value =
    row?.total_raised ??
    0;

  data$("#dataFundraisingCash").value =
    row?.cash_on_hand ??
    0;

  data$("#dataFundraisingSpent").value =
    row?.total_spent ??
    0;

  data$("#dataFundraisingSmallDonor").value =
    row?.small_donor_pct ??
    "";

  data$("#dataFundraisingFor").value =
    row?.outside_spending_for ??
    0;

  data$("#dataFundraisingAgainst").value =
    row?.outside_spending_against ??
    0;

  data$("#dataFundraisingSource").value =
    row?.source_url ||
    "";

  data$("#dataFundraisingNotes").value =
    row?.notes ||
    "";

  dataOpenModal(
    "dataFundraisingModal"
  );
}

async function dataSaveFundraising(event) {
  event.preventDefault();

  const id =
    data$("#dataFundraisingId")
      .value;

  const payload = {
    race_id:
      dataStudio.selectedRaceId,

    candidate_id:
      data$("#dataFundraisingCandidate")
        .value,

    reporting_date:
      data$("#dataFundraisingDate")
        .value,

    total_raised:
      Number(
        data$("#dataFundraisingRaised")
          .value ||
        0
      ),

    cash_on_hand:
      Number(
        data$("#dataFundraisingCash")
          .value ||
        0
      ),

    total_spent:
      Number(
        data$("#dataFundraisingSpent")
          .value ||
        0
      ),

    small_donor_pct:
      dataNumberOrNull(
        data$("#dataFundraisingSmallDonor")
          .value
      ),

    outside_spending_for:
      Number(
        data$("#dataFundraisingFor")
          .value ||
        0
      ),

    outside_spending_against:
      Number(
        data$("#dataFundraisingAgainst")
          .value ||
        0
      ),

    source_url:
      data$("#dataFundraisingSource")
        .value
        .trim() ||
      null,

    notes:
      data$("#dataFundraisingNotes")
        .value
        .trim() ||
      null
  };

  const button =
    event.submitter;

  button.disabled = true;
  button.textContent =
    "Saving…";

  try {
    let result;

    if (id) {
      result =
        await sb
          .from("fundraising")
          .update(payload)
          .eq(
            "id",
            id
          );
    } else {
      result =
        await sb
          .from("fundraising")
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    dataCloseModal(
      "dataFundraisingModal"
    );

    await dataLoadAll({
      silent: true
    });

    if (typeof msg === "function") {
      msg(
        "Fundraising saved. The forecast recalculated automatically."
      );
    }
  } catch (error) {
    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to save fundraising.",
        "error"
      );
    }
  } finally {
    button.disabled = false;
    button.textContent =
      "Save fundraising report";
  }
}

async function dataDeleteFundraising(id) {
  if (
    !window.confirm(
      "Delete this fundraising report?"
    )
  ) {
    return;
  }

  const {
    error
  } =
    await sb
      .from("fundraising")
      .delete()
      .eq(
        "id",
        id
      );

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await dataLoadAll({
    silent: true
  });

  msg(
    "Fundraising report deleted. The forecast recalculated automatically."
  );
}

function dataRenderApproval() {
  const body =
    data$("#dataApprovalBody");

  if (!body) return;

  const rows =
    dataStudio.approval.filter(
      row =>
        row.race_id ===
        dataStudio.selectedRaceId
    );

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No race-specific approval data added. That is okay when unavailable.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    rows.map(
      row => {
        const net =
          Number(
            row.approve_pct
          ) -
          Number(
            row.disapprove_pct
          );

        return `
          <tr>
            <td>
              ${escapeHtml(
                row.officeholder_name ||
                row.candidates?.name ||
                "Officeholder"
              )}
            </td>

            <td>
              ${escapeHtml(
                row.pollster
              )}
            </td>

            <td>
              ${escapeHtml(
                fmtDate(
                  row.end_date
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                `${row.sample_size || "—"} ${row.population || ""}`
              )}
            </td>

            <td class="pollCellDem">
              ${Number(
                row.approve_pct
              ).toFixed(1)}%
            </td>

            <td class="pollCellRep">
              ${Number(
                row.disapprove_pct
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
              <div class="tableActions">

                <button
                  class="btn light"
                  type="button"
                  data-edit-approval="${escapeHtml(
                    row.id
                  )}"
                >
                  Edit
                </button>

                <button
                  class="btn red"
                  type="button"
                  data-delete-approval="${escapeHtml(
                    row.id
                  )}"
                >
                  Delete
                </button>

              </div>
            </td>
          </tr>
        `;
      }
    ).join("");
}

function dataEditApproval(id = null) {
  const row =
    dataStudio.approval.find(
      item =>
        item.id === id
    ) ||
    null;

  data$("#dataApprovalId").value =
    row?.id ||
    "";

  dataPopulateCandidateSelects();

  data$("#dataApprovalCandidate").value =
    row?.candidate_id ||
    "";

  data$("#dataApprovalName").value =
    row?.officeholder_name ||
    row?.candidates?.name ||
    "";

  data$("#dataApprovalPollster").value =
    row?.pollster ||
    "";

  data$("#dataApprovalStart").value =
    row?.start_date ||
    "";

  data$("#dataApprovalEnd").value =
    row?.end_date ||
    new Date()
      .toISOString()
      .slice(0, 10);

  data$("#dataApprovalSample").value =
    row?.sample_size ??
    "";

  data$("#dataApprovalPopulation").value =
    row?.population ||
    "LV";

  data$("#dataApprovalApprove").value =
    row?.approve_pct ??
    "";

  data$("#dataApprovalDisapprove").value =
    row?.disapprove_pct ??
    "";

  data$("#dataApprovalWeight").value =
    row?.quality_weight ??
    1;

  data$("#dataApprovalStatus").value =
    row?.status ||
    "published";

  data$("#dataApprovalSource").value =
    row?.source_url ||
    "";

  dataOpenModal(
    "dataApprovalModal"
  );
}

async function dataSaveApproval(event) {
  event.preventDefault();

  const id =
    data$("#dataApprovalId")
      .value;

  const payload = {
    race_id:
      dataStudio.selectedRaceId,

    candidate_id:
      data$("#dataApprovalCandidate")
        .value ||
      null,

    officeholder_name:
      data$("#dataApprovalName")
        .value
        .trim(),

    pollster:
      data$("#dataApprovalPollster")
        .value
        .trim(),

    start_date:
      data$("#dataApprovalStart")
        .value ||
      null,

    end_date:
      data$("#dataApprovalEnd")
        .value,

    sample_size:
      dataNumberOrNull(
        data$("#dataApprovalSample")
          .value
      ),

    population:
      data$("#dataApprovalPopulation")
        .value,

    approve_pct:
      Number(
        data$("#dataApprovalApprove")
          .value
      ),

    disapprove_pct:
      Number(
        data$("#dataApprovalDisapprove")
          .value
      ),

    quality_weight:
      Number(
        data$("#dataApprovalWeight")
          .value ||
        1
      ),

    source_url:
      data$("#dataApprovalSource")
        .value
        .trim() ||
      null,

    status:
      data$("#dataApprovalStatus")
        .value
  };

  const button =
    event.submitter;

  button.disabled = true;
  button.textContent =
    "Saving…";

  try {
    let result;

    if (id) {
      result =
        await sb
          .from("approval_data")
          .update(payload)
          .eq(
            "id",
            id
          );
    } else {
      result =
        await sb
          .from("approval_data")
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    dataCloseModal(
      "dataApprovalModal"
    );

    await dataLoadAll({
      silent: true
    });

    if (typeof msg === "function") {
      msg(
        "Approval data saved. The forecast recalculated automatically."
      );
    }
  } catch (error) {
    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to save approval data.",
        "error"
      );
    }
  } finally {
    button.disabled = false;
    button.textContent =
      "Save approval poll";
  }
}

async function dataDeleteApproval(id) {
  if (
    !window.confirm(
      "Delete this approval poll?"
    )
  ) {
    return;
  }

  const {
    error
  } =
    await sb
      .from("approval_data")
      .delete()
      .eq(
        "id",
        id
      );

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await dataLoadAll({
    silent: true
  });

  msg(
    "Approval poll deleted. The forecast recalculated automatically."
  );
}

function dataRenderDevelopments() {
  const box =
    data$("#dataDevelopmentList");

  if (!box) return;

  const rows =
    dataStudio.developments.filter(
      row =>
        row.race_id ===
        dataStudio.selectedRaceId
    );

  if (!rows.length) {
    box.innerHTML = `
      <div class="empty">
        No developments added.
      </div>
    `;

    return;
  }

  box.innerHTML =
    rows.map(
      row => `
        <article class="developmentAdminItem">

          <div class="developmentAdminDate">
            ${escapeHtml(
              fmtDate(
                row.event_date
              )
            )}
          </div>

          <div>
            <div class="developmentAdminHeadline">

              <strong>
                ${escapeHtml(
                  row.headline
                )}
              </strong>

              <span
                class="modeBadge ${
                  row.status ===
                  "published"
                    ? "automatic"
                    : "manual"
                }"
              >
                ${escapeHtml(
                  row.status
                )}
              </span>

            </div>

            ${
              row.description
                ? `
                  <p>
                    ${escapeHtml(
                      row.description
                    )}
                  </p>
                `
                : ""
            }

            <small>
              ${escapeHtml(
                row.development_type
              )}
              ·
              Model impact:
              ${
                Number(
                  row.model_impact ||
                  0
                ) > 0
                  ? "+"
                  : ""
              }${Number(
                row.model_impact ||
                0
              ).toFixed(1)}
            </small>
          </div>

          <div class="tableActions">

            <button
              class="btn light"
              type="button"
              data-edit-development="${escapeHtml(
                row.id
              )}"
            >
              Edit
            </button>

            <button
              class="btn red"
              type="button"
              data-delete-development="${escapeHtml(
                row.id
              )}"
            >
              Delete
            </button>

          </div>

        </article>
      `
    ).join("");
}

function dataEditDevelopment(id = null) {
  const row =
    dataStudio.developments.find(
      item =>
        item.id === id
    ) ||
    null;

  data$("#dataDevelopmentId").value =
    row?.id ||
    "";

  data$("#dataDevelopmentHeadline").value =
    row?.headline ||
    "";

  data$("#dataDevelopmentDescription").value =
    row?.description ||
    "";

  data$("#dataDevelopmentType").value =
    row?.development_type ||
    "news";

  data$("#dataDevelopmentDate").value =
    row?.event_date ||
    new Date()
      .toISOString()
      .slice(0, 10);

  data$("#dataDevelopmentSource").value =
    row?.source_url ||
    "";

  data$("#dataDevelopmentImpact").value =
    row?.model_impact ??
    0;

  data$("#dataDevelopmentStatus").value =
    row?.status ||
    "draft";

  dataOpenModal(
    "dataDevelopmentModal"
  );
}

async function dataSaveDevelopment(event) {
  event.preventDefault();

  const id =
    data$("#dataDevelopmentId")
      .value;

  const payload = {
    race_id:
      dataStudio.selectedRaceId,

    headline:
      data$("#dataDevelopmentHeadline")
        .value
        .trim(),

    description:
      data$("#dataDevelopmentDescription")
        .value
        .trim() ||
      null,

    development_type:
      data$("#dataDevelopmentType")
        .value,

    event_date:
      data$("#dataDevelopmentDate")
        .value,

    source_url:
      data$("#dataDevelopmentSource")
        .value
        .trim() ||
      null,

    model_impact:
      Number(
        data$("#dataDevelopmentImpact")
          .value ||
        0
      ),

    status:
      data$("#dataDevelopmentStatus")
        .value
  };

  const button =
    event.submitter;

  button.disabled = true;
  button.textContent =
    "Saving…";

  try {
    let result;

    if (id) {
      result =
        await sb
          .from("race_developments")
          .update(payload)
          .eq(
            "id",
            id
          );
    } else {
      result =
        await sb
          .from("race_developments")
          .insert(payload);
    }

    if (result.error) {
      throw result.error;
    }

    dataCloseModal(
      "dataDevelopmentModal"
    );

    await dataLoadAll({
      silent: true
    });

    if (typeof msg === "function") {
      msg(
        "Development saved. The race data refreshed automatically."
      );
    }
  } catch (error) {
    if (typeof msg === "function") {
      msg(
        error.message ||
        "Unable to save development.",
        "error"
      );
    }
  } finally {
    button.disabled = false;
    button.textContent =
      "Save development";
  }
}

async function dataDeleteDevelopment(id) {
  if (
    !window.confirm(
      "Delete this development?"
    )
  ) {
    return;
  }

  const {
    error
  } =
    await sb
      .from("race_developments")
      .delete()
      .eq(
        "id",
        id
      );

  if (error) {
    msg(
      error.message,
      "error"
    );

    return;
  }

  await dataLoadAll({
    silent: true
  });

  msg("Development deleted.");
}

function dataInitializeTabs() {
  document
    .querySelectorAll(
      "[data-data-tab]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            const tab =
              button.dataset
                .dataTab;

            document
              .querySelectorAll(
                "[data-data-tab]"
              )
              .forEach(
                item =>
                  item.classList.toggle(
                    "active",
                    item === button
                  )
              );

            document
              .querySelectorAll(
                "[data-data-panel]"
              )
              .forEach(
                panel =>
                  panel.classList.toggle(
                    "active",
                    panel.dataset
                      .dataPanel ===
                      tab
                  )
              );
          }
        );
      }
    );
}

function dataInitializeEvents() {
  dataInitializeTabs();

  data$("#dataStudioRaceSearch")
    ?.addEventListener(
      "input",
      event => {
        dataStudio.search =
          event.target.value;

        dataRenderRaceOptions();
      }
    );

  data$("#dataStudioRaceSelect")
    ?.addEventListener(
      "change",
      event => {
        dataStudio.selectedRaceId =
          event.target.value ||
          null;

        dataRenderSelectedRace();
      }
    );

  data$("#dataStudioRefresh")
    ?.addEventListener(
      "click",
      () =>
        dataLoadAll()
    );

  data$("#dataStudioFundamentalsForm")
    ?.addEventListener(
      "submit",
      dataSaveFundamentals
    );

  data$("#dataMarkReviewed")
    ?.addEventListener(
      "click",
      dataMarkReviewed
    );

  data$("#dataCandidateScoreCards")
    ?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-save-candidate-score]"
          );

        if (button) {
          dataSaveCandidateScore(
            button.dataset
              .saveCandidateScore,
            button
          );
        }
      }
    );

  data$("#dataAddFundraising")
    ?.addEventListener(
      "click",
      () =>
        dataEditFundraising()
    );

  data$("#dataFundraisingBody")
    ?.addEventListener(
      "click",
      event => {
        const edit =
          event.target.closest(
            "[data-edit-fundraising]"
          );

        if (edit) {
          dataEditFundraising(
            edit.dataset
              .editFundraising
          );

          return;
        }

        const remove =
          event.target.closest(
            "[data-delete-fundraising]"
          );

        if (remove) {
          dataDeleteFundraising(
            remove.dataset
              .deleteFundraising
          );
        }
      }
    );

  data$("#dataFundraisingForm")
    ?.addEventListener(
      "submit",
      dataSaveFundraising
    );

  data$("#dataAddApproval")
    ?.addEventListener(
      "click",
      () =>
        dataEditApproval()
    );

  data$("#dataApprovalBody")
    ?.addEventListener(
      "click",
      event => {
        const edit =
          event.target.closest(
            "[data-edit-approval]"
          );

        if (edit) {
          dataEditApproval(
            edit.dataset
              .editApproval
          );

          return;
        }

        const remove =
          event.target.closest(
            "[data-delete-approval]"
          );

        if (remove) {
          dataDeleteApproval(
            remove.dataset
              .deleteApproval
          );
        }
      }
    );

  data$("#dataApprovalForm")
    ?.addEventListener(
      "submit",
      dataSaveApproval
    );

  data$("#dataAddDevelopment")
    ?.addEventListener(
      "click",
      () =>
        dataEditDevelopment()
    );

  data$("#dataDevelopmentList")
    ?.addEventListener(
      "click",
      event => {
        const edit =
          event.target.closest(
            "[data-edit-development]"
          );

        if (edit) {
          dataEditDevelopment(
            edit.dataset
              .editDevelopment
          );

          return;
        }

        const remove =
          event.target.closest(
            "[data-delete-development]"
          );

        if (remove) {
          dataDeleteDevelopment(
            remove.dataset
              .deleteDevelopment
          );
        }
      }
    );

  data$("#dataDevelopmentForm")
    ?.addEventListener(
      "submit",
      dataSaveDevelopment
    );

  document
    .querySelectorAll(
      "[data-data-close]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () =>
            dataCloseModal(
              button.dataset
                .dataClose
            )
        );
      }
    );
}

function initializeModelDataStudio() {
  dataInitializeEvents();

  window.setTimeout(
    () =>
      dataLoadAll({
        silent: true
      }),
    650
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeModelDataStudio
);
