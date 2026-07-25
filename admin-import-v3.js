/* =========================================================

   ELECTIONLAB IMPORT CENTER V3

 

   Workbook sheets:

   Races, Candidates, Model Factors, Race Polls,

   Generic Ballot, Trump Approval, Primary Polls

   ========================================================= */

 

const importV3 = {

  parsed: null,

  warnings: [],

  preview: [],

  races: [],

  candidates: [],

  raceBySlug: new Map(),

  candidateByKey: new Map()

};

 

const iv3$ = selector => document.querySelector(selector);

 

function iv3Clean(value) {

  return String(value ?? "").trim();

}

 

function iv3Lower(value) {

  return iv3Clean(value).toLowerCase();

}

 

function iv3Number(value, fallback = null) {

  if (value === "" || value === null || value === undefined) return fallback;

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;

}

 

function iv3Boolean(value) {

  return ["true", "yes", "y", "1", "x"].includes(iv3Lower(value));

}

 

function iv3Date(value) {

  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {

    return value.toISOString().slice(0, 10);

  }

  const text = iv3Clean(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);

}

 

function iv3Escape(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}

 

function iv3NormalizeRow(row) {

  const result = {};

  Object.entries(row || {}).forEach(([key, value]) => {

    const normalized = String(key)

      .trim()

      .toLowerCase()

      .replace(/[^a-z0-9]+/g, "_")

      .replace(/^_+|_+$/g, "");

    result[normalized] = value;

  });

  return result;

}

 

function iv3Sheet(workbook, name) {

  const actual = workbook.SheetNames.find(

    sheetName => iv3Lower(sheetName) === iv3Lower(name)

  );

  if (!actual) return [];

  return XLSX.utils.sheet_to_json(workbook.Sheets[actual], {

    defval: "",

    raw: false

  }).map(iv3NormalizeRow);

}

 

function iv3Notice(text, type = "success") {

  const box = iv3$("#modelImportMessage");

  if (!box) return;

  box.textContent = text;

  box.className = `notice ${type}`;

  box.style.display = "block";

}

 

function iv3AddPreview(sheet, row, key, action, status = "Ready") {

  importV3.preview.push({ sheet, row, key, action, status });

}

 

function iv3Warn(message) {

  importV3.warnings.push(message);

}

 

function iv3CandidateNameKey(name) {

  return iv3Clean(name)

    .normalize("NFKD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .replace(/[’‘`]/g, "'")

    .replace(/[^a-z0-9]+/g, " ")

    .trim()

    .replace(/\s+/g, " ");

}

 

function iv3CandidateKey(raceId, name) {

  return `${raceId}::${iv3CandidateNameKey(name)}`;

}

 

async function iv3FetchAllRows(table, selectColumns = "*", orderColumn = "id") {

  const pageSize = 1000;

  const rows = [];

 

  for (let start = 0; ; start += pageSize) {

    const result = await sb

      .from(table)

      .select(selectColumns)

      .order(orderColumn, { ascending: true })

      .range(start, start + pageSize - 1);

 

    if (result.error) {

      throw result.error;

    }

 

    const page = result.data || [];

    rows.push(...page);

 

    if (page.length < pageSize) {

      break;

    }

  }

 

  return rows;

}

 

async function iv3LoadLookups() {

  const [races, candidates] = await Promise.all([

    iv3FetchAllRows("races", "*", "state"),

    iv3FetchAllRows("candidates", "*", "name")

  ]);

 

  importV3.races = races;

  importV3.candidates = candidates;

 

  importV3.raceBySlug = new Map(

    importV3.races.map(race => [iv3Lower(race.slug), race])

  );

 

  importV3.candidateByKey = new Map(

    importV3.candidates.map(candidate => [

      iv3CandidateKey(candidate.race_id, candidate.name),

      candidate

    ])

  );

}

 

function iv3ValidateWorkbook(workbook) {

  importV3.warnings = [];

  importV3.preview = [];

 

  const parsed = {

    races: iv3Sheet(workbook, "Races"),

    candidates: iv3Sheet(workbook, "Candidates"),

    factors: iv3Sheet(workbook, "Model Factors"),

    racePolls: iv3Sheet(workbook, "Race Polls"),

    genericBallot: iv3Sheet(workbook, "Generic Ballot"),

    trumpApproval: iv3Sheet(workbook, "Trump Approval"),

    primaryPolls: iv3Sheet(workbook, "Primary Polls")

  };

 

  parsed.races = parsed.races.map((row, index) => {

    const line = index + 2;

    const slug = iv3Lower(row.race_slug);

    if (!slug || !row.office || !row.state || !row.title) {

      iv3Warn(`Races row ${line}: race_slug, office, state, and title are required.`);

      iv3AddPreview("Races", line, slug || "—", "Skip", "Missing required fields");

      return null;

    }

    const existing = importV3.raceBySlug.get(slug);

    iv3AddPreview("Races", line, slug, existing ? "Update" : "Insert");

    return {

      line,

      slug,

      existing,

      payload: {

        slug,

        office: iv3Lower(row.office),

        state: iv3Clean(row.state).toUpperCase(),

        district_code: iv3Clean(row.district) || null,

        title: iv3Clean(row.title),

        election_date: iv3Date(row.election_date) || "2026-11-03",

        incumbent_party: iv3Clean(row.incumbent_party) || null,

        partisan_lean: iv3Number(row.partisan_lean, 0),

        state_partisan_lean: iv3Number(

          row.state_partisan_lean,

          iv3Number(row.partisan_lean, 0)

        ),

        rating: iv3Clean(row.rating) || "Toss-up",

        projected_margin: iv3Number(row.projected_margin, 0),

        featured: iv3Boolean(row.featured),

        status: iv3Lower(row.status) === "draft" ? "draft" : "published",

        summary: iv3Clean(row.summary) || null,

        updated_at: new Date().toISOString()

      }

    };

  }).filter(Boolean);

 

  parsed.candidates = parsed.candidates.map((row, index) => {

    const line = index + 2;

    const slug = iv3Lower(row.race_slug);

    const name = iv3Clean(row.candidate_name);

    if (!slug || !name || !row.party) {

      iv3Warn(`Candidates row ${line}: race_slug, candidate_name, and party are required.`);

      iv3AddPreview("Candidates", line, `${slug} / ${name}`, "Skip", "Missing required fields");

      return null;

    }

    iv3AddPreview("Candidates", line, `${slug} / ${name}`, "Insert or update");

    return { line, slug, name, row };

  }).filter(Boolean);

 

  parsed.factors = parsed.factors.map((row, index) => {

    const line = index + 2;

    const slug = iv3Lower(row.race_slug);

    const name = iv3Clean(row.candidate_name);

    if (!slug || !name) {

      iv3Warn(`Model Factors row ${line}: race_slug and candidate_name are required.`);

      iv3AddPreview("Model Factors", line, `${slug} / ${name}`, "Skip", "Missing key");

      return null;

    }

    const fields = [

      ["fundraising_factor", -5, 5],

      ["approval_factor", -5, 5],

      ["candidate_quality_factor", -5, 5],

      ["incumbency_factor", -3, 3],

      ["party_unity_factor", -5, 5],

      ["campaign_strength_factor", -5, 5],

      ["scandal_factor", -5, 5],

      ["manual_factor_override", -5, 5]

    ];

    const payload = {};

    fields.forEach(([field, min, max]) => {

      const value = iv3Number(row[field], 0);

      payload[field] = Math.max(min, Math.min(max, value));

    });

    payload.factor_source = iv3Clean(row.factor_source) || "unknown";

    payload.factor_notes = iv3Clean(row.notes) || null;

    payload.factors_updated_at = new Date().toISOString();

    iv3AddPreview("Model Factors", line, `${slug} / ${name}`, "Update factors");

    return { line, slug, name, payload };

  }).filter(Boolean);

 

  const validatePoll = (row, index, sheetName, type) => {

    const line = index + 2;

    const key = type === "race" ? iv3Lower(row.race_slug) : iv3Clean(row.pollster);

    if ((type === "race" && !row.race_slug) || !row.pollster || !row.end_date) {

      iv3Warn(`${sheetName} row ${line}: required fields are missing.`);

      iv3AddPreview(sheetName, line, key || "—", "Skip", "Missing required fields");

      return null;

    }

    iv3AddPreview(sheetName, line, key, "Insert or skip duplicate");

    return { line, row };

  };

 

  parsed.racePolls = parsed.racePolls.map((r, i) => validatePoll(r, i, "Race Polls", "race")).filter(Boolean);

  parsed.genericBallot = parsed.genericBallot.map((r, i) => validatePoll(r, i, "Generic Ballot", "national")).filter(Boolean);

  parsed.trumpApproval = parsed.trumpApproval.map((r, i) => validatePoll(r, i, "Trump Approval", "national")).filter(Boolean);

  parsed.primaryPolls = parsed.primaryPolls.map((r, i) => validatePoll(r, i, "Primary Polls", "national")).filter(Boolean);

 

  importV3.parsed = parsed;

  iv3RenderPreview();

}

 

function iv3RenderPreview() {

  const data = importV3.parsed;

  if (!data) return;

 

  iv3$("#modelImportPreview").hidden = false;

  iv3$("#modelImportRacesCount").textContent = data.races.length;

  iv3$("#modelImportCandidatesCount").textContent = data.candidates.length;

  iv3$("#modelImportFactorsCount").textContent = data.factors.length;

  iv3$("#modelImportRacePollsCount").textContent = data.racePolls.length;

  iv3$("#modelImportNationalPollsCount").textContent =

    data.genericBallot.length + data.trumpApproval.length + data.primaryPolls.length;

  iv3$("#modelImportWarningCount").textContent = importV3.warnings.length;

 

  const warningBox = iv3$("#modelImportWarnings");

  warningBox.innerHTML = importV3.warnings.length

    ? `<div class="notice error"><b>${importV3.warnings.length} warning(s)</b><ul>${importV3.warnings.slice(0, 50).map(w => `<li>${iv3Escape(w)}</li>`).join("")}</ul></div>`

    : `<div class="notice success">Workbook validation passed.</div>`;

 

  const body = iv3$("#modelImportPreviewBody");

  body.innerHTML = importV3.preview.length

    ? importV3.preview.slice(0, 800).map(item => `

        <tr>

          <td>${iv3Escape(item.sheet)}</td>

          <td>${item.row}</td>

          <td>${iv3Escape(item.key)}</td>

          <td>${iv3Escape(item.action)}</td>

          <td><span class="readinessBadge ${item.status === "Ready" ? "v2-ready" : "v2-missing"}">${iv3Escape(item.status)}</span></td>

        </tr>

      `).join("")

    : `<tr><td colspan="5" class="empty">No importable rows found.</td></tr>`;

}

 

function iv3MissingColumn(error) {

  const message = iv3Lower(error?.message);

  return message.includes("column") && (message.includes("does not exist") || message.includes("schema cache"));

}

 

async function iv3InsertWithFallback(table, payload, fallbackPayload = null) {

  let result = await sb.from(table).insert(payload);

  if (result.error && fallbackPayload && iv3MissingColumn(result.error)) {

    result = await sb.from(table).insert(fallbackPayload);

  }

  if (result.error) throw result.error;

}

 

async function iv3RefreshLookups() {

  await iv3LoadLookups();

}

 

async function iv3ImportRaces(rows, affected) {

  for (const item of rows) {

    const current = importV3.raceBySlug.get(item.slug);

    let result;

    if (current) {

      result = await sb.from("races").update(item.payload).eq("id", current.id);

    } else {

      result = await sb.from("races").insert(item.payload);

    }

    if (result.error) throw new Error(`Races row ${item.line}: ${result.error.message}`);

  }

  await iv3RefreshLookups();

  rows.forEach(item => {

    const race = importV3.raceBySlug.get(item.slug);

    if (race) affected.add(race.id);

  });

}

 

async function iv3ImportCandidates(rows, affected) {

  for (const item of rows) {

    const race = importV3.raceBySlug.get(item.slug);

    if (!race) throw new Error(`Candidates row ${item.line}: race ${item.slug} was not found.`);

 

    const existing = importV3.candidateByKey.get(iv3CandidateKey(race.id, item.name));

    const row = item.row;

    const nomineeStatus = iv3Lower(row.nominee_status);

    const payload = {

      race_id: race.id,

      name: item.name,

      party: iv3Clean(row.party).toUpperCase(),

      incumbent: iv3Boolean(row.incumbent),

      active: row.active === "" ? true : iv3Boolean(row.active),

      is_presumptive_nominee: ["confirmed", "presumptive"].includes(nomineeStatus),

      win_probability: iv3Number(row.win_probability, 50),

      expected_vote_share: iv3Number(row.expected_vote_share, 50),

      photo_url: iv3Clean(row.photo_url) || null

    };

 

    let result;

    if (existing) result = await sb.from("candidates").update(payload).eq("id", existing.id);

    else result = await sb.from("candidates").insert(payload);

    if (result.error) throw new Error(`Candidates row ${item.line}: ${result.error.message}`);

    affected.add(race.id);

  }

  await iv3RefreshLookups();

}

 

async function iv3ImportFactors(rows, affected) {

  for (const item of rows) {

    const race = importV3.raceBySlug.get(item.slug);

    if (!race) throw new Error(`Model Factors row ${item.line}: race ${item.slug} was not found.`);

    let candidate = importV3.candidateByKey.get(

      iv3CandidateKey(race.id, item.name)

    );

 

    if (!candidate) {

      const lookup = await sb

        .from("candidates")

        .select("*")

        .eq("race_id", race.id)

        .ilike("name", item.name)

        .limit(1);

 

      if (lookup.error) {

        throw new Error(

          `Model Factors row ${item.line}: ${lookup.error.message}`

        );

      }

 

      candidate = lookup.data?.[0] || null;

 

      if (candidate) {

        importV3.candidateByKey.set(

          iv3CandidateKey(candidate.race_id, candidate.name),

          candidate

        );

      }

    }

 

    if (!candidate) {

      const raceCandidates = importV3.candidates.filter(

        existing => existing.race_id === race.id

      );

 

      const normalizedWanted = iv3CandidateNameKey(item.name);

 

      candidate = raceCandidates.find(

        existing =>

          iv3CandidateNameKey(existing.name) === normalizedWanted

      ) || null;

    }

 

    if (!candidate) {

      throw new Error(

        `Model Factors row ${item.line}: candidate ${item.name} was not found in ${item.slug}.`

      );

    }

 

    const result = await sb

      .from("candidates")

      .update(item.payload)

      .eq("id", candidate.id);

    if (result.error) throw new Error(`Model Factors row ${item.line}: ${result.error.message}`);

    affected.add(race.id);

  }

}

 

async function iv3Duplicate(table, filters) {

  let query = sb.from(table).select("id").limit(1);

  Object.entries(filters).forEach(([key, value]) => {

    query = query.eq(key, value);

  });

  const result = await query;

  if (result.error) throw result.error;

  return Boolean(result.data?.length);

}

 

async function iv3ImportRacePolls(rows, affected) {

  for (const item of rows) {

    const row = item.row;

    const slug = iv3Lower(row.race_slug);

    const race = importV3.raceBySlug.get(slug);

    if (!race) throw new Error(`Race Polls row ${item.line}: race ${slug} was not found.`);

    const endDate = iv3Date(row.end_date);

    const duplicate = await iv3Duplicate("polls", {

      race_id: race.id,

      pollster: iv3Clean(row.pollster),

      end_date: endDate

    });

    if (duplicate) continue;

    const payload = {

      race_id: race.id,

      pollster: iv3Clean(row.pollster),

      start_date: iv3Date(row.start_date) || endDate,

      end_date: endDate,

      sample_size: Math.round(iv3Number(row.sample_size, 800)),

      population: iv3Clean(row.population) || "LV",

      dem_pct: iv3Number(row.dem_pct),

      rep_pct: iv3Number(row.rep_pct),

      ind_pct: iv3Number(row.ind_pct),

      quality_weight: iv3Number(row.quality_weight, 1),

      status: iv3Lower(row.status) === "draft" ? "draft" : "published",

      source_url: iv3Clean(row.source_url) || null,

      updated_at: new Date().toISOString()

    };

    const fallback = { ...payload };

    delete fallback.ind_pct;

    delete fallback.source_url;

    await iv3InsertWithFallback("polls", payload, fallback);

    affected.add(race.id);

  }

}

 

async function iv3ImportNational(rows, table, kind) {

  for (const item of rows) {

    const row = item.row;

    const endDate = iv3Date(row.end_date);

    const duplicate = await iv3Duplicate(table, {

      pollster: iv3Clean(row.pollster),

      end_date: endDate

    });

    if (duplicate) continue;

 

    const common = {

      pollster: iv3Clean(row.pollster),

      start_date: iv3Date(row.start_date) || endDate,

      end_date: endDate,

      sample_size: Math.round(iv3Number(row.sample_size, 800)),

      population: iv3Clean(row.population) || "A",

      quality_weight: iv3Number(row.quality_weight, 1),

      status: iv3Lower(row.status) === "draft" ? "draft" : "published",

      source_url: iv3Clean(row.source_url) || null,

      updated_at: new Date().toISOString()

    };

 

    let payload;

    let fallback;

    if (kind === "generic") {

      payload = { ...common, dem_pct: iv3Number(row.dem_pct), rep_pct: iv3Number(row.rep_pct) };

      fallback = { ...payload }; delete fallback.source_url;

    } else if (kind === "approval") {

      payload = { ...common, approve_pct: iv3Number(row.approve_pct), disapprove_pct: iv3Number(row.disapprove_pct) };

      fallback = { ...payload }; delete fallback.source_url;

    } else {

      payload = {

        ...common,

        primary_party: iv3Clean(row.primary_party).toUpperCase(),

        candidate_results: iv3Clean(row.candidate_results)

      };

      fallback = {

        pollster: common.pollster,

        start_date: common.start_date,

        end_date: common.end_date,

        sample_size: common.sample_size,

        population: common.population,

        quality_weight: common.quality_weight,

        status: common.status,

        updated_at: common.updated_at,

        party: payload.primary_party,

        results: payload.candidate_results

      };

    }

    await iv3InsertWithFallback(table, payload, fallback);

  }

}

 

async function iv3RunImport() {

  if (!importV3.parsed) return;

  const total = Object.values(importV3.parsed).reduce((sum, rows) => sum + rows.length, 0);

  if (!total) return iv3Notice("No valid rows were found.", "error");

  if (!window.confirm(`Import ${total} validated rows?`)) return;

 

  const button = iv3$("#modelImportRun");

  button.disabled = true;

  button.textContent = "Importing…";

  const affected = new Set();

 

  try {

    await iv3ImportRaces(importV3.parsed.races, affected);

    await iv3ImportCandidates(importV3.parsed.candidates, affected);

    await iv3ImportFactors(importV3.parsed.factors, affected);

    await iv3ImportRacePolls(importV3.parsed.racePolls, affected);

    await iv3ImportNational(importV3.parsed.genericBallot, "generic_ballot_polls", "generic");

    await iv3ImportNational(importV3.parsed.trumpApproval, "approval_polls", "approval");

    await iv3ImportNational(importV3.parsed.primaryPolls, "primary_polls", "primary");

 

    for (const raceId of affected) {

      const result = await sb.rpc("recalculate_race_forecast", {

        target_race_id: raceId,

        run_id: null,

        reason_text: "Import Center v3"

      });

      if (result.error) throw result.error;

    }

 

    iv3Notice(`Import complete: ${total} rows processed and ${affected.size} races recalculated.`);

    if (typeof loadAll === "function") await loadAll();

    if (typeof loadModelV2Data === "function") await loadModelV2Data({ silent: true });

  } catch (error) {

    console.error(error);

    iv3Notice(error.message || "Import failed.", "error");

  } finally {

    button.disabled = false;

    button.textContent = "Import all sheets";

  }

}

 

function iv3Clear() {

  importV3.parsed = null;

  importV3.preview = [];

  importV3.warnings = [];

  const input = iv3$("#modelImportFile");

  if (input) input.value = "";

  const preview = iv3$("#modelImportPreview");

  if (preview) preview.hidden = true;

  const message = iv3$("#modelImportMessage");

  if (message) message.style.display = "none";

}

 

async function iv3HandleFile(file) {

  iv3Notice("Reading workbook…");

  await iv3LoadLookups();

  const bytes = await file.arrayBuffer();

  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });

  iv3ValidateWorkbook(workbook);

  iv3Notice("Workbook loaded. Review the preview, then import.");

}

 

function initializeImportV3() {

  iv3$("#modelImportFile")?.addEventListener("change", async event => {

    const file = event.target.files?.[0];

    if (!file) return;

    try {

      await iv3HandleFile(file);

    } catch (error) {

      console.error(error);

      iv3Notice(error.message || "Could not read workbook.", "error");

    }

  });

  iv3$("#modelImportRun")?.addEventListener("click", iv3RunImport);

  iv3$("#modelImportClear")?.addEventListener("click", iv3Clear);

}

 

document.addEventListener("DOMContentLoaded", initializeImportV3);
