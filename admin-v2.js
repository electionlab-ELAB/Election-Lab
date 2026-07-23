/* =========================================================
   ELECTIONLAB NEWSROOM — MODEL 2.0 CONTROL LAYER
   This file extends the existing admin.js without removing
   spreadsheet imports, legacy editors, or existing CMS tools.
   ========================================================= */

const v2State = {
  readiness: [],
  readinessSummary: null,
  forecastResults: [],
  effectiveForecasts: [],
  modelRuns: [],
  controlForecasts: [],
  loading: false,
  filters: {
    query: "",
    office: "",
    status: "",
    mode: ""
  }
};

function v2Escape(value = "") {
  if (typeof escapeHtml === "function") {
    return escapeHtml(value);
  }

  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

function v2Number(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function v2FormatMargin(value) {
  if (typeof formatAdminMargin === "function") {
    return formatAdminMargin(value);
  }

  const number = v2Number(value);

  if (number === null) return "—";
  if (Math.abs(number) < 0.05) return "Tied";

  return `${number > 0 ? "D" : "R"} +${Math.abs(number).toFixed(1)}`;
}

function v2FormatTimestamp(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function v2StatusLabel(status) {
  const labels = {
    ready: "Ready",
    needs_review: "Needs review",
    needs_attention: "Needs attention",
    missing_data: "Missing data",
    draft: "Draft",
    model_ready: "Model ready"
  };

  return labels[status] || status || "Unknown";
}

function v2StatusClass(status) {
  if (status === "ready") return "v2-ready";
  if (status === "needs_review") return "v2-review";
  if (status === "needs_attention") return "v2-attention";
  if (status === "model_ready") return "v2-model-ready";
  return "v2-missing";
}

function v2FindEffective(raceId) {
  return (
    v2State.effectiveForecasts.find(
      race => race.id === raceId
    ) || null
  );
}

function v2FindResult(raceId) {
  return (
    v2State.forecastResults.find(
      result => result.race_id === raceId
    ) || null
  );
}

function v2SetText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = String(value ?? "—");
  }
}

function v2SetBusy(button, busy, busyText = "Working…") {
  if (!button) return;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function v2OptionalQuery(query, name) {
  try {
    const result = await query;

    if (result.error) {
      throw result.error;
    }

    return result.data || [];
  } catch (error) {
    console.warn(`Model 2.0 query failed for ${name}:`, error);
    return [];
  }
}

async function loadModelV2Data(options = {}) {
  if (!window.sb && typeof sb === "undefined") {
    return;
  }

  if (v2State.loading) {
    return;
  }

  v2State.loading = true;

  try {
    const client =
      typeof sb !== "undefined"
        ? sb
        : window.sb;

    const [
      readiness,
      readinessSummaryRows,
      forecastResults,
      effectiveForecasts,
      modelRuns,
      controlForecasts
    ] = await Promise.all([
      v2OptionalQuery(
        client
          .from("race_readiness")
          .select("*")
          .order("state", { ascending: true })
          .order("title", { ascending: true }),
        "race_readiness"
      ),

      v2OptionalQuery(
        client
          .from("site_readiness_summary")
          .select("*")
          .limit(1),
        "site_readiness_summary"
      ),

      v2OptionalQuery(
        client
          .from("forecast_results")
          .select("*")
          .order("calculated_at", { ascending: false }),
        "forecast_results"
      ),

      v2OptionalQuery(
        client
          .from("race_effective_forecasts")
          .select("*")
          .order("state", { ascending: true })
          .order("title", { ascending: true }),
        "race_effective_forecasts"
      ),

      v2OptionalQuery(
        client
          .from("model_runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(20),
        "model_runs"
      ),

      v2OptionalQuery(
        client
          .from("control_forecasts")
          .select("*")
          .order("calculated_at", { ascending: false })
          .limit(20),
        "control_forecasts"
      )
    ]);

    v2State.readiness = readiness;
    v2State.readinessSummary =
      readinessSummaryRows[0] || null;
    v2State.forecastResults = forecastResults;
    v2State.effectiveForecasts = effectiveForecasts;
    v2State.modelRuns = modelRuns;
    v2State.controlForecasts = controlForecasts;

    renderV2Dashboard();
    renderV2Engine();

    if (!options.silent && typeof msg === "function") {
      msg("Forecast engine refreshed.");
    }
  } finally {
    v2State.loading = false;
  }
}

function renderV2Dashboard() {
  const summary = v2State.readinessSummary || {};
  const total = v2Number(summary.total_active_races, 0);
  const ready = v2Number(summary.ready_races, 0);
  const percent = v2Number(summary.races_ready_percent, 0);

  v2SetText("#v2ReadinessPercent", `${percent.toFixed(1)}%`);
  v2SetText(
    "#v2ReadinessCount",
    `${ready} of ${total} active races ready`
  );
  v2SetText("#v2ReadyCount", ready);
  v2SetText(
    "#v2ReviewCount",
    v2Number(summary.needs_review_races, 0)
  );
  v2SetText(
    "#v2AttentionCount",
    v2Number(summary.needs_attention_races, 0)
  );
  v2SetText(
    "#v2MissingCount",
    v2Number(summary.missing_data_races, 0) +
      v2Number(summary.draft_races, 0)
  );

  const bar = document.querySelector("#v2ReadinessBar");

  if (bar) {
    bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  const latestRun = v2State.modelRuns[0] || null;
  const healthy =
    latestRun &&
    latestRun.status === "completed";

  v2SetText(
    "#v2EngineStatus",
    latestRun
      ? healthy
        ? "Healthy — automation active"
        : `Latest run: ${latestRun.status}`
      : "No model run found"
  );

  v2SetText(
    "#v2LastRun",
    latestRun
      ? v2FormatTimestamp(
          latestRun.completed_at || latestRun.started_at
        )
      : "—"
  );

  v2SetText(
    "#v2LastProcessed",
    latestRun?.races_processed ?? "—"
  );

  v2SetText(
    "#v2LastChanged",
    latestRun?.races_changed ?? "—"
  );

  v2SetText(
    "#v2ModelVersion",
    latestRun?.model_version || "2.0"
  );

  const dot = document.querySelector("#v2EngineStatusDot");

  if (dot) {
    dot.className =
      "statusDot " +
      (healthy ? "healthy" : "warning");
  }
}

function renderV2Engine() {
  const readiness = v2State.readiness;

  const automatic = readiness.filter(
    race => race.forecast_mode !== "manual"
  ).length;

  const manual = readiness.filter(
    race => race.forecast_mode === "manual"
  ).length;

  const ready = readiness.filter(
    race => race.automatic_status === "ready"
  ).length;

  const review = readiness.filter(
    race => race.automatic_status === "needs_review"
  ).length;

  const stale = readiness.filter(
    race =>
      race.automatic_status === "needs_attention" ||
      Boolean(race.missing_requirements?.stale_model)
  ).length;

  const noOutput = readiness.filter(
    race => !race.model_projected_margin
      && race.model_projected_margin !== 0
  ).length;

  v2SetText("#v2AutomaticCount", automatic);
  v2SetText("#v2ManualCount", manual);
  v2SetText("#v2EngineReadyCount", ready);
  v2SetText("#v2EngineReviewCount", review);
  v2SetText("#v2EngineStaleCount", stale);
  v2SetText("#v2NoOutputCount", noOutput);

  renderV2RaceTable();
}

function v2FilteredRaces() {
  const query = v2State.filters.query.toLowerCase();

  return v2State.readiness.filter(race => {
    if (
      v2State.filters.office &&
      race.office !== v2State.filters.office
    ) {
      return false;
    }

    if (
      v2State.filters.status &&
      race.automatic_status !== v2State.filters.status
    ) {
      return false;
    }

    if (
      v2State.filters.mode &&
      race.forecast_mode !== v2State.filters.mode
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const effective = v2FindEffective(race.race_id);

    const haystack = [
      race.state,
      race.title,
      race.slug,
      race.office,
      race.model_rating,
      effective?.effective_rating,
      race.automatic_status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function v2MissingText(missingRequirements) {
  if (
    !missingRequirements ||
    typeof missingRequirements !== "object"
  ) {
    return "None";
  }

  const values = Object.values(missingRequirements)
    .filter(Boolean);

  if (!values.length) {
    return "None";
  }

  return values
    .slice(0, 3)
    .map(value => v2Escape(value))
    .join("<br>");
}

function renderV2RaceTable() {
  const body = document.querySelector("#v2ForecastEngineBody");

  if (!body) return;

  const races = v2FilteredRaces();

  if (!races.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No races match these filters.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = races.map(race => {
    const effective = v2FindEffective(race.race_id) || {};
    const result = v2FindResult(race.race_id) || {};

    const modelMargin =
      race.model_projected_margin ??
      result.final_model_margin;

    const modelRating =
      race.model_rating ??
      result.rating ??
      "No output";

    const effectiveMargin =
      effective.effective_projected_margin ??
      modelMargin;

    const effectiveRating =
      effective.effective_rating ??
      modelRating;

    const updatedAt =
      effective.effective_updated_at ??
      race.model_updated_at;

    const readinessPercent =
      v2Number(race.readiness_percent, 0);

    return `
      <tr>

        <td>
          <b>${v2Escape(race.title || "Untitled race")}</b>
          <br>
          <small>
            ${v2Escape(race.state || "")}
            ·
            ${v2Escape(race.office || "")}
            ·
            ${v2Escape(race.slug || "")}
          </small>
        </td>

        <td>
          <span class="modeBadge ${
            race.forecast_mode === "manual"
              ? "manual"
              : "automatic"
          }">
            ${
              race.forecast_mode === "manual"
                ? "Manual"
                : "Automatic"
            }
          </span>
        </td>

        <td>
          <b>${v2Escape(modelRating)}</b>
          <br>
          <small>${v2Escape(v2FormatMargin(modelMargin))}</small>
        </td>

        <td>
          <b>${v2Escape(effectiveRating)}</b>
          <br>
          <small>${v2Escape(v2FormatMargin(effectiveMargin))}</small>
        </td>

        <td>
          <span class="readinessBadge ${v2StatusClass(
            race.automatic_status
          )}">
            ${v2Escape(v2StatusLabel(race.automatic_status))}
          </span>

          <div class="miniProgress">
            <span style="width:${Math.max(
              0,
              Math.min(100, readinessPercent)
            )}%"></span>
          </div>

          <small>${readinessPercent.toFixed(1)}%</small>
        </td>

        <td class="v2WarningsCell">
          ${v2MissingText(race.missing_requirements)}
        </td>

        <td>
          ${v2Escape(v2FormatTimestamp(updatedAt))}
        </td>

        <td>
          <div class="tableActions">
            <button
              class="btn light"
              type="button"
              data-v2-recalculate="${v2Escape(race.race_id)}"
            >
              Recalculate
            </button>

            <button
              class="btn blue"
              type="button"
              data-v2-override="${v2Escape(race.race_id)}"
            >
              ${
                race.forecast_mode === "manual"
                  ? "Edit override"
                  : "Override"
              }
            </button>
          </div>
        </td>

      </tr>
    `;
  }).join("");
}

async function recalculateAllV2(button = null) {
  const client =
    typeof sb !== "undefined"
      ? sb
      : window.sb;

  if (!client) return;

  const confirmed = window.confirm(
    "Recalculate every active ElectionLab race now?"
  );

  if (!confirmed) return;

  v2SetBusy(button, true, "Recalculating…");

  try {
    const { data, error } = await client.rpc(
      "recalculate_all_forecasts",
      {
        run_type_value: "manual_admin"
      }
    );

    if (error) throw error;

    await loadModelV2Data({ silent: true });

    if (typeof reloadAll === "function") {
      await reloadAll();
    }

    if (typeof msg === "function") {
      msg(
        `Model run complete: ${
          data?.races_processed ?? 0
        } races processed, ${
          data?.races_changed ?? 0
        } visible changes.`
      );
    }
  } catch (error) {
    console.error(error);

    if (typeof msg === "function") {
      msg(
        error.message || "Unable to recalculate forecasts.",
        "error"
      );
    }
  } finally {
    v2SetBusy(button, false);
  }
}

async function recalculateRaceV2(raceId, button = null) {
  const client =
    typeof sb !== "undefined"
      ? sb
      : window.sb;

  if (!client || !raceId) return;

  v2SetBusy(button, true, "Working…");

  try {
    const { data, error } = await client.rpc(
      "recalculate_race_forecast",
      {
        target_race_id: raceId,
        run_id: null,
        reason_text: "Manual admin recalculation"
      }
    );

    if (error) throw error;

    await loadModelV2Data({ silent: true });

    if (typeof reloadAll === "function") {
      await reloadAll();
    }

    if (typeof msg === "function") {
      msg(
        data?.visible_changed
          ? "Race recalculated and the published forecast changed."
          : "Race recalculated. No visible forecast change."
      );
    }
  } catch (error) {
    console.error(error);

    if (typeof msg === "function") {
      msg(
        error.message || "Unable to recalculate this race.",
        "error"
      );
    }
  } finally {
    v2SetBusy(button, false);
  }
}

function openV2Override(raceId) {
  const race =
    v2State.effectiveForecasts.find(
      item => item.id === raceId
    );

  if (!race) {
    if (typeof msg === "function") {
      msg("Race could not be found.", "error");
    }
    return;
  }

  document.querySelector("#v2OverrideRaceId").value =
    race.id;

  document.querySelector("#v2OverrideTitle").textContent =
    race.title || "Forecast override";

  const modelMargin =
    v2Number(race.model_projected_margin, 0);

  const modelDem =
    v2Number(race.model_dem_probability, 50);

  const modelRep =
    v2Number(race.model_rep_probability, 50);

  const modelRating =
    race.model_rating || "Toss-up";

  const publishedMargin =
    v2Number(
      race.effective_projected_margin,
      modelMargin
    );

  const publishedDem =
    v2Number(
      race.effective_dem_probability,
      modelDem
    );

  const publishedRep =
    v2Number(
      race.effective_rep_probability,
      modelRep
    );

  const publishedRating =
    race.effective_rating || modelRating;

  document.querySelector("#v2OverrideModelForecast").textContent =
    `${modelRating} · ${v2FormatMargin(modelMargin)} · D ${modelDem.toFixed(1)}%`;

  document.querySelector("#v2OverridePublishedForecast").textContent =
    `${publishedRating} · ${v2FormatMargin(publishedMargin)} · D ${publishedDem.toFixed(1)}%`;

  document.querySelector("#v2OverrideMargin").value =
    publishedMargin;

  document.querySelector("#v2OverrideDemProbability").value =
    publishedDem;

  document.querySelector("#v2OverrideRepProbability").value =
    publishedRep;

  document.querySelector("#v2OverrideRating").value =
    publishedRating;

  document.querySelector("#v2OverrideReason").value =
    race.override_reason || "";

  const modal = document.querySelector("#v2OverrideModal");
  modal?.classList.add("open");
  document.body.classList.add("modalOpen");
}

function closeV2Override() {
  document
    .querySelector("#v2OverrideModal")
    ?.classList.remove("open");

  if (!document.querySelector(".modal.open")) {
    document.body.classList.remove("modalOpen");
  }
}

function copyV2ModelValues() {
  const raceId =
    document.querySelector("#v2OverrideRaceId")?.value;

  const race =
    v2State.effectiveForecasts.find(
      item => item.id === raceId
    );

  if (!race) return;

  document.querySelector("#v2OverrideMargin").value =
    v2Number(race.model_projected_margin, 0);

  document.querySelector("#v2OverrideDemProbability").value =
    v2Number(race.model_dem_probability, 50);

  document.querySelector("#v2OverrideRepProbability").value =
    v2Number(race.model_rep_probability, 50);

  document.querySelector("#v2OverrideRating").value =
    race.model_rating || "Toss-up";
}

async function saveV2Override(event) {
  event.preventDefault();

  const client =
    typeof sb !== "undefined"
      ? sb
      : window.sb;

  const raceId =
    document.querySelector("#v2OverrideRaceId").value;

  const margin =
    Number(document.querySelector("#v2OverrideMargin").value);

  const demProbability =
    Number(
      document.querySelector("#v2OverrideDemProbability").value
    );

  const repProbability =
    Number(
      document.querySelector("#v2OverrideRepProbability").value
    );

  const rating =
    document.querySelector("#v2OverrideRating").value;

  const reason =
    document.querySelector("#v2OverrideReason").value.trim();

  if (!Number.isFinite(margin)) {
    if (typeof msg === "function") {
      msg("Override margin must be a valid number.", "error");
    }
    return;
  }

  if (
    !Number.isFinite(demProbability) ||
    !Number.isFinite(repProbability) ||
    demProbability < 0 ||
    demProbability > 100 ||
    repProbability < 0 ||
    repProbability > 100
  ) {
    if (typeof msg === "function") {
      msg("Override probabilities must be between 0 and 100.", "error");
    }
    return;
  }

  if (Math.abs(demProbability + repProbability - 100) > 0.2) {
    if (typeof msg === "function") {
      msg(
        "Democratic and Republican probabilities must total 100%.",
        "error"
      );
    }
    return;
  }

  if (!reason) {
    if (typeof msg === "function") {
      msg("An internal override reason is required.", "error");
    }
    return;
  }

  const submitButton =
    event.submitter ||
    event.currentTarget.querySelector("button[type='submit']");

  v2SetBusy(submitButton, true, "Saving…");

  try {
    const { error } = await client
      .from("races")
      .update({
        forecast_mode: "manual",
        override_projected_margin: margin,
        override_dem_probability: demProbability,
        override_rep_probability: repProbability,
        override_rating: rating,
        override_reason: reason,
        override_updated_at: new Date().toISOString(),
        published_updated_at: new Date().toISOString()
      })
      .eq("id", raceId);

    if (error) throw error;

    closeV2Override();

    await loadModelV2Data({ silent: true });

    if (typeof reloadAll === "function") {
      await reloadAll();
    }

    if (typeof msg === "function") {
      msg("Private manual override saved.");
    }
  } catch (error) {
    console.error(error);

    if (typeof msg === "function") {
      msg(
        error.message || "Unable to save the override.",
        "error"
      );
    }
  } finally {
    v2SetBusy(submitButton, false);
  }
}

async function returnV2Automatic() {
  const client =
    typeof sb !== "undefined"
      ? sb
      : window.sb;

  const raceId =
    document.querySelector("#v2OverrideRaceId")?.value;

  if (!client || !raceId) return;

  const confirmed = window.confirm(
    "Return this race to the automatic model forecast?"
  );

  if (!confirmed) return;

  const button = document.querySelector("#v2ReturnAutomatic");
  v2SetBusy(button, true, "Switching…");

  try {
    const { error } = await client
      .from("races")
      .update({
        forecast_mode: "automatic",
        override_reason: null,
        published_updated_at: new Date().toISOString()
      })
      .eq("id", raceId);

    if (error) throw error;

    closeV2Override();

    await loadModelV2Data({ silent: true });

    if (typeof reloadAll === "function") {
      await reloadAll();
    }

    if (typeof msg === "function") {
      msg("Race returned to automatic forecasting.");
    }
  } catch (error) {
    console.error(error);

    if (typeof msg === "function") {
      msg(
        error.message || "Unable to return to automatic mode.",
        "error"
      );
    }
  } finally {
    v2SetBusy(button, false);
  }
}

function initializeV2Filters() {
  document
    .querySelector("#v2RaceSearch")
    ?.addEventListener("input", event => {
      v2State.filters.query = event.target.value.trim();
      renderV2RaceTable();
    });

  document
    .querySelector("#v2OfficeFilter")
    ?.addEventListener("change", event => {
      v2State.filters.office = event.target.value;
      renderV2RaceTable();
    });

  document
    .querySelector("#v2StatusFilter")
    ?.addEventListener("change", event => {
      v2State.filters.status = event.target.value;
      renderV2RaceTable();
    });

  document
    .querySelector("#v2ModeFilter")
    ?.addEventListener("change", event => {
      v2State.filters.mode = event.target.value;
      renderV2RaceTable();
    });
}

function initializeV2Events() {
  initializeV2Filters();

  document
    .querySelector("#v2RefreshEngine")
    ?.addEventListener("click", () => {
      loadModelV2Data();
    });

  [
    "#v2RecalculateAll",
    "#v2RecalculateAllDashboard"
  ].forEach(selector => {
    const button = document.querySelector(selector);

    button?.addEventListener("click", () => {
      recalculateAllV2(button);
    });
  });

  document
    .querySelector("#v2OpenEngine")
    ?.addEventListener("click", () => {
      if (typeof showAdminPanel === "function") {
        showAdminPanel("forecastEnginePanel");
      }
    });

  document
    .querySelector("#v2ForecastEngineBody")
    ?.addEventListener("click", event => {
      const recalculateButton =
        event.target.closest("[data-v2-recalculate]");

      if (recalculateButton) {
        recalculateRaceV2(
          recalculateButton.dataset.v2Recalculate,
          recalculateButton
        );
        return;
      }

      const overrideButton =
        event.target.closest("[data-v2-override]");

      if (overrideButton) {
        openV2Override(
          overrideButton.dataset.v2Override
        );
      }
    });

  document
    .querySelector("#v2OverrideForm")
    ?.addEventListener("submit", saveV2Override);

  document
    .querySelector("#v2CopyModelValues")
    ?.addEventListener("click", copyV2ModelValues);

  document
    .querySelector("#v2ReturnAutomatic")
    ?.addEventListener("click", returnV2Automatic);

  document
    .querySelectorAll("[data-v2-close-override]")
    .forEach(button => {
      button.addEventListener("click", closeV2Override);
    });

  document
    .querySelector("#v2OverrideModal")
    ?.addEventListener("click", event => {
      if (event.target.id === "v2OverrideModal") {
        closeV2Override();
      }
    });

  document
    .querySelectorAll("[data-readiness-filter]")
    .forEach(button => {
      button.addEventListener("click", () => {
        v2State.filters.status =
          button.dataset.readinessFilter;

        const filter =
          document.querySelector("#v2StatusFilter");

        if (filter) {
          filter.value = v2State.filters.status;
        }

        if (typeof showAdminPanel === "function") {
          showAdminPanel("forecastEnginePanel");
        }

        renderV2RaceTable();
      });
    });
}

async function initializeModelV2Admin() {
  initializeV2Events();

  // The original admin.js verifies authentication and loads first.
  // A short wait prevents duplicate redirects and lets the shared
  // Supabase client/session finish initializing.
  window.setTimeout(
    () => loadModelV2Data({ silent: true }),
    450
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeModelV2Admin
);
