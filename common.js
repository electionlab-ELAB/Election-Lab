const CFG =

  window.ELECTIONLAB_CONFIG || {};

 

const configured =

  Boolean(

    CFG.SUPABASE_URL &&

    !CFG.SUPABASE_URL.includes("PASTE_") &&

    CFG.SUPABASE_ANON_KEY &&

    !CFG.SUPABASE_ANON_KEY.includes("PASTE_")

  );

 

window.sb =

  configured

    ? window.supabase.createClient(

        CFG.SUPABASE_URL,

        CFG.SUPABASE_ANON_KEY

      )

    : null;

const sb = window.sb;

 

 

/* =========================================================

   BASIC UTILITIES

   ========================================================= */

 

function escapeHtml(value = "") {

  return String(value).replace(

    /[&<>"']/g,

    character =>

      ({

        "&": "&amp;",

        "<": "&lt;",

        ">": "&gt;",

        '"': "&quot;",

        "'": "&#39;"

      })[character]

  );

}

 

function clamp(

  value,

  minimum,

  maximum

) {

  return Math.min(

    maximum,

    Math.max(

      minimum,

      Number(value) || 0

    )

  );

}

 

function roundTo(

  value,

  decimals = 1

) {

  const factor =

    10 ** decimals;

 

  return (

    Math.round(

      (Number(value) || 0) *

      factor

    ) / factor

  );

}

 

function normalizeText(

  value

) {

  return String(

    value ?? ""

  )

    .trim()

    .toLowerCase();

}

 

function normalizeParty(

  party

) {

  const normalized =

    normalizeText(party);

 

  if (

    normalized === "d" ||

    normalized === "dem" ||

    normalized === "democrat" ||

    normalized === "democratic"

  ) {

    return "D";

  }

 

  if (

    normalized === "r" ||

    normalized === "rep" ||

    normalized === "republican"

  ) {

    return "R";

  }

 

  if (

    normalized === "i" ||

    normalized === "ind" ||

    normalized === "independent"

  ) {

    return "I";

  }

 

  if (

    normalized === "l" ||

    normalized === "libertarian"

  ) {

    return "L";

  }

 

  if (

    normalized === "g" ||

    normalized === "green"

  ) {

    return "G";

  }

 

  return String(

    party || "I"

  )

    .trim()

    .toUpperCase()

    .slice(0, 3);

}

 

function partyName(

  party

) {

  const normalized =

    normalizeParty(party);

 

  if (normalized === "D") {

    return "Democratic";

  }

 

  if (normalized === "R") {

    return "Republican";

  }

 

  if (normalized === "L") {

    return "Libertarian";

  }

 

  if (normalized === "G") {

    return "Green";

  }

 

  return "Independent";

}

 

function partyShortName(

  party

) {

  const normalized =

    normalizeParty(party);

 

  if (normalized === "D") {

    return "Dem";

  }

 

  if (normalized === "R") {

    return "Rep";

  }

 

  if (normalized === "L") {

    return "Lib";

  }

 

  if (normalized === "G") {

    return "Green";

  }

 

  return "Ind";

}

 

function partyColor(

  party

) {

  const normalized =

    normalizeParty(party);

 

  if (normalized === "D") {

    return "#1677ff";

  }

 

  if (normalized === "R") {

    return "#ef4444";

  }

 

  if (normalized === "L") {

    return "#f5b942";

  }

 

  if (normalized === "G") {

    return "#16a36a";

  }

 

  return "#8b5cf6";

}

 

function partyCssClass(

  party

) {

  const normalized =

    normalizeParty(party);

 

  return `party-${escapeHtml(

    normalized

  )}`;

}

 

function ratingClass(

  rating = ""

) {

  const normalized =

    normalizeText(rating);

 

  if (

    normalized.includes(

      "toss"

    )

  ) {

    return "gold";

  }

 

  if (

    normalized.includes(

      "democratic"

    ) ||

    normalized.includes(

      "dem"

    ) ||

    normalized.endsWith(

      " d"

    )

  ) {

    return "blue";

  }

 

  if (

    normalized.includes(

      "republican"

    ) ||

    normalized.includes(

      "rep"

    ) ||

    normalized.endsWith(

      " r"

    )

  ) {

    return "red";

  }

 

  return "green";

}

 

function formatPercent(

  value,

  decimals = 1

) {

  const number =

    Number(value);

 

  if (

    !Number.isFinite(number)

  ) {

    return "—";

  }

 

  return `${number.toFixed(

    decimals

  )}%`;

}

 

function formatMargin(

  value,

  options = {}

) {

  const number =

    Number(value);

 

  const {

    democraticLabel = "D",

    republicanLabel = "R",

    tiedLabel = "Tied",

    decimals = 1

  } = options;

 

  if (

    !Number.isFinite(number)

  ) {

    return "—";

  }

 

  if (

    Math.abs(number) < 0.05

  ) {

    return tiedLabel;

  }

 

  return `${

    number > 0

      ? democraticLabel

      : republicanLabel

  } +${Math.abs(number).toFixed(

    decimals

  )}`;

}

 

function fmtDate(

  dateValue,

  options = {}

) {

  if (!dateValue) {

    return "—";

  }

 

  const {

    includeYear = true

  } = options;

 

  const date =

    new Date(

      String(dateValue).includes("T")

        ? dateValue

        : `${dateValue}T12:00:00`

    );

 

  if (

    Number.isNaN(

      date.getTime()

    )

  ) {

    return "—";

  }

 

  return date.toLocaleDateString(

    undefined,

    {

      month: "short",

      day: "numeric",

      ...(includeYear

        ? { year: "numeric" }

        : {})

    }

  );

}

 

function fmtDateRange(

  startDate,

  endDate

) {

  if (

    !startDate &&

    !endDate

  ) {

    return "—";

  }

 

  if (

    startDate === endDate ||

    !startDate

  ) {

    return fmtDate(

      endDate || startDate

    );

  }

 

  return `${fmtDate(

    startDate,

    {

      includeYear: false

    }

  )} – ${fmtDate(

    endDate

  )}`;

}

 

function formatTimestamp(

  value

) {

  if (!value) {

    return "—";

  }

 

  const date =

    new Date(value);

 

  if (

    Number.isNaN(

      date.getTime()

    )

  ) {

    return "—";

  }

 

  return date.toLocaleString(

    undefined,

    {

      month: "short",

      day: "numeric",

      year: "numeric",

      hour: "numeric",

      minute: "2-digit",

      timeZoneName: "short"

    }

  );

}

 

function dateToDayKey(

  value

) {

  if (!value) {

    return "";

  }

 

  const date =

    new Date(

      String(value).includes("T")

        ? value

        : `${value}T12:00:00`

    );

 

  if (

    Number.isNaN(

      date.getTime()

    )

  ) {

    return "";

  }

 

  return [

    date.getFullYear(),

    String(

      date.getMonth() + 1

    ).padStart(2, "0"),

    String(

      date.getDate()

    ).padStart(2, "0")

  ].join("-");

}

 

function daysBetween(

  olderDate,

  newerDate

) {

  const older =

    new Date(

      `${dateToDayKey(

        olderDate

      )}T12:00:00`

    );

 

  const newer =

    new Date(

      `${dateToDayKey(

        newerDate

      )}T12:00:00`

    );

 

  if (

    Number.isNaN(

      older.getTime()

    ) ||

    Number.isNaN(

      newer.getTime()

    )

  ) {

    return 0;

  }

 

  return Math.max(

    0,

    (

      newer.getTime() -

      older.getTime()

    ) / 86400000

  );

}

 

 

/* =========================================================

   NAVIGATION

   ========================================================= */

 

function initializeNavigation() {

  const button =

    document.querySelector(

      ".menuBtn"

    );

 

  const links =

    document.querySelector(

      ".navlinks"

    );

 

  if (

    !button ||

    !links

  ) {

    return;

  }

 

  function closeMenu() {

    links.classList.remove(

      "open"

    );

 

    button.setAttribute(

      "aria-expanded",

      "false"

    );

  }

 

  button.addEventListener(

    "click",

    () => {

      const isOpen =

        links.classList.toggle(

          "open"

        );

 

      button.setAttribute(

        "aria-expanded",

        String(isOpen)

      );

    }

  );

 

  links

    .querySelectorAll("a")

    .forEach(link => {

      link.addEventListener(

        "click",

        closeMenu

      );

    });

 

  document.addEventListener(

    "click",

    event => {

      if (

        !links.classList.contains(

          "open"

        )

      ) {

        return;

      }

 

      if (

        links.contains(

          event.target

        ) ||

        button.contains(

          event.target

        )

      ) {

        return;

      }

 

      closeMenu();

    }

  );

 

  window.addEventListener(

    "resize",

    () => {

      if (

        window.innerWidth >

        850

      ) {

        closeMenu();

      }

    }

  );

}

 

document.addEventListener(

  "DOMContentLoaded",

  initializeNavigation

);

 

 

/* =========================================================

   RACE AND OFFICE HELPERS

   ========================================================= */

 

function currentPageOffice() {

  const bodyOffice =

    normalizeText(

      document.body?.dataset

        ?.raceType

    );

 

  if (

    [

      "senate",

      "house",

      "governor"

    ].includes(bodyOffice)

  ) {

    return bodyOffice;

  }

 

  const path =

    location.pathname

      .toLowerCase();

 

  if (

    path.includes(

      "governors"

    )

  ) {

    return "governor";

  }

 

  if (

    path.includes(

      "house"

    )

  ) {

    return "house";

  }

 

  if (

    path.includes(

      "senate"

    )

  ) {

    return "senate";

  }

 

  return null;

}

 

function raceOffice(

  race = {}

) {

  const text =

    [

      race.office,

      race.office_type,

      race.race_type,

      race.chamber,

      race.title,

      race.slug

    ]

      .filter(Boolean)

      .join(" ")

      .toLowerCase();

 

  if (

    text.includes(

      "governor"

    )

  ) {

    return "governor";

  }

 

  if (

    text.includes(

      "house"

    )

  ) {

    return "house";

  }

 

  if (

    text.includes(

      "senate"

    )

  ) {

    return "senate";

  }

 

  return "senate";

}

 

function officeLabel(

  office

) {

  if (

    office === "governor"

  ) {

    return "Governor";

  }

 

  if (

    office === "house"

  ) {

    return "U.S. House";

  }

 

  return "U.S. Senate";

}

 

function sortCandidates(

  candidates = []

) {

  return [

    ...candidates

  ].sort(

    (first, second) => {

      const firstOdds =

        Number(

          first.win_probability ||

          0

        );

 

      const secondOdds =

        Number(

          second.win_probability ||

          0

        );

 

      if (

        secondOdds !== firstOdds

      ) {

        return (

          secondOdds -

          firstOdds

        );

      }

 

      const firstVote =

        Number(

          first.expected_vote_share ||

          0

        );

 

      const secondVote =

        Number(

          second.expected_vote_share ||

          0

        );

 

      return (

        secondVote -

        firstVote

      );

    }

  );

}

 

function candidateForParty(

  candidates,

  party

) {

  const normalizedParty =

    normalizeParty(party);

 

  return (

    candidates.find(

      candidate =>

        normalizeParty(

          candidate.party

        ) ===

        normalizedParty

    ) || null

  );

}

 

function independentCandidates(

  candidates = []

) {

  return candidates.filter(

    candidate =>

      ![

        "D",

        "R"

      ].includes(

        normalizeParty(

          candidate.party

        )

      )

  );

}

 

 

/* =========================================================

   SUPABASE READ HELPERS

   ========================================================= */

 

async function getPublishedRaces(

  office = null

) {

  if (!sb) {

    return [];

  }

 

  let query =

    sb

      .from("races")

      .select(

        "*,candidates(*)"

      )

      .eq(

        "status",

        "published"

      )

      .order(

        "state",

        {

          ascending: true

        }

      );

 

  const {

    data,

    error

  } = await query;

 

  if (error) {

    throw error;

  }

 

  const races =

    data || [];

 

  if (!office) {

    return races;

  }

 

  return races.filter(

    race =>

      raceOffice(race) ===

      office

  );

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

 

  return data || null;

}

 

async function getPublishedPolls(

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

  } = await sb

    .from("polls")

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

      "end_date",

      {

        ascending: false

      }

    );

 

  if (error) {

    throw error;

  }

 

  return data || [];

}

 

async function getPublishedGenericBallotPolls() {

  if (!sb) {

    return [];

  }

 

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

 

  return data || [];

}

 

async function getPublishedApprovalPolls() {

  if (!sb) {

    return [];

  }

 

  const {

    data,

    error

  } = await sb

    .from(

      "approval_polls"

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

 

  return data || [];

}

/* =========================================================

   POLL VALUE HELPERS

   ========================================================= */

 

function pollPartyValue(

  poll,

  party

) {

  const normalized =

    normalizeParty(party);

 

  if (normalized === "D") {

    return Number(

      poll.dem_pct

    );

  }

 

  if (normalized === "R") {

    return Number(

      poll.rep_pct

    );

  }

 

  if (

    normalized === "I"

  ) {

    return Number(

      poll.ind_pct ??

      poll.independent_pct ??

      poll.other_pct

    );

  }

 

  if (

    normalized === "L"

  ) {

    return Number(

      poll.lib_pct ??

      poll.libertarian_pct

    );

  }

 

  if (

    normalized === "G"

  ) {

    return Number(

      poll.green_pct

    );

  }

 

  return Number.NaN;

}

 

function hasValidPollValue(

  poll,

  party

) {

  return Number.isFinite(

    pollPartyValue(

      poll,

      party

    )

  );

}

 

function getPollParties(

  polls = []

) {

  const parties =

    new Set([

      "D",

      "R"

    ]);

 

  polls.forEach(poll => {

    if (

      hasValidPollValue(

        poll,

        "I"

      )

    ) {

      parties.add("I");

    }

 

    if (

      hasValidPollValue(

        poll,

        "L"

      )

    ) {

      parties.add("L");

    }

 

    if (

      hasValidPollValue(

        poll,

        "G"

      )

    ) {

      parties.add("G");

    }

  });

 

  return [

    ...parties

  ];

}

 

function pollPopulationWeight(

  population

) {

  const normalized =

    normalizeText(

      population

    ).toUpperCase();

 

  if (

    normalized === "LV"

  ) {

    return 1.12;

  }

 

  if (

    normalized === "RV"

  ) {

    return 1;

  }

 

  if (

    normalized === "V"

  ) {

    return 0.94;

  }

 

  if (

    normalized === "A"

  ) {

    return 0.86;

  }

 

  return 0.9;

}

 

function pollSampleWeight(

  sampleSize

) {

  const sample =

    Math.max(

      100,

      Number(

        sampleSize || 500

      )

    );

 

  return Math.sqrt(

    sample / 500

  );

}

 

function pollQualityWeight(

  poll

) {

  return Math.max(

    0.25,

    Number(

      poll.quality_weight ||

      1

    )

  );

}

 

function pollRecencyWeight(

  pollDate,

  referenceDate,

  halfLifeDays = 28

) {

  const days =

    daysBetween(

      pollDate,

      referenceDate

    );

 

  return Math.exp(

    -Math.log(2) *

    days /

    Math.max(

      1,

      halfLifeDays

    )

  );

}

 

function calculatePollWeight(

  poll,

  options = {}

) {

  const {

    referenceDate =

      new Date(),

    halfLifeDays = 28

  } = options;

 

  const endDate =

    poll.end_date ||

    poll.start_date;

 

  return (

    pollRecencyWeight(

      endDate,

      referenceDate,

      halfLifeDays

    ) *

    pollSampleWeight(

      poll.sample_size

    ) *

    pollQualityWeight(

      poll

    ) *

    pollPopulationWeight(

      poll.population

    )

  );

}

/* =========================================================

   CURRENT WEIGHTED AVERAGE

   ========================================================= */

 

function weightedAverage(

  polls = [],

  options = {}

) {

  if (

    !Array.isArray(polls) ||

    !polls.length

  ) {

    return null;

  }

 

  const validPolls =

    polls.filter(poll => {

      return (

        hasValidPollValue(

          poll,

          "D"

        ) &&

        hasValidPollValue(

          poll,

          "R"

        )

      );

    });

 

  if (!validPolls.length) {

    return null;

  }

 

  const latestDate =

    validPolls

      .map(

        poll =>

          poll.end_date ||

          poll.start_date

      )

      .filter(Boolean)

      .sort()

      .at(-1);

 

  const referenceDate =

    options.referenceDate ||

    latestDate ||

    new Date();

 

  const parties =

    getPollParties(

      validPolls

    );

 

  const totals = {};

  const weights = {};

 

  parties.forEach(party => {

    totals[party] = 0;

    weights[party] = 0;

  });

 

  validPolls.forEach(poll => {

    const weight =

      calculatePollWeight(

        poll,

        {

          referenceDate,

          halfLifeDays:

            options.halfLifeDays ||

            28

        }

      );

 

    parties.forEach(party => {

      const value =

        pollPartyValue(

          poll,

          party

        );

 

      if (

        !Number.isFinite(value)

      ) {

        return;

      }

 

      totals[party] +=

        value * weight;

 

      weights[party] +=

        weight;

    });

  });

 

  const averages = {};

 

  parties.forEach(party => {

    averages[party] =

      weights[party] > 0

        ? totals[party] /

          weights[party]

        : null;

  });

 

  if (

    !Number.isFinite(

      averages.D

    ) ||

    !Number.isFinite(

      averages.R

    )

  ) {

    return null;

  }

 

  const result = {

    dem:

      averages.D,

 

    rep:

      averages.R,

 

    margin:

      averages.D -

      averages.R,

 

    pollCount:

      validPolls.length,

 

    latestDate,

 

    parties:

      averages

  };

 

  if (

    Number.isFinite(

      averages.I

    )

  ) {

    result.ind =

      averages.I;

  }

 

  if (

    Number.isFinite(

      averages.L

    )

  ) {

    result.lib =

      averages.L;

  }

 

  if (

    Number.isFinite(

      averages.G

    )

  ) {

    result.green =

      averages.G;

  }

 

  return result;

}

 

 

/* =========================================================

   RUNNING POLLING AVERAGE

   ========================================================= */

 

function buildDateSequence(

  startDate,

  endDate

) {

  const start =

    new Date(

      `${dateToDayKey(

        startDate

      )}T12:00:00`

    );

 

  const end =

    new Date(

      `${dateToDayKey(

        endDate

      )}T12:00:00`

    );

 

  if (

    Number.isNaN(

      start.getTime()

    ) ||

    Number.isNaN(

      end.getTime()

    )

  ) {

    return [];

  }

 

  const dates = [];

 

  const cursor =

    new Date(start);

 

  while (

    cursor <= end

  ) {

    dates.push(

      dateToDayKey(

        cursor

      )

    );

 

    cursor.setDate(

      cursor.getDate() + 1

    );

  }

 

  return dates;

}

 

function runningAverage(

  polls = [],

  options = {}

) {

  const validPolls =

    polls.filter(poll => {

      return (

        hasValidPollValue(

          poll,

          "D"

        ) &&

        hasValidPollValue(

          poll,

          "R"

        ) &&

        (

          poll.end_date ||

          poll.start_date

        )

      );

    });

 

  if (!validPolls.length) {

    return [];

  }

 

  const sortedPolls =

    [...validPolls].sort(

      (first, second) => {

        return (

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

      }

    );

 

  const firstDate =

    options.startDate ||

    sortedPolls[0]

      .end_date ||

    sortedPolls[0]

      .start_date;

 

  const finalPoll =

    sortedPolls[

      sortedPolls.length - 1

    ];

 

  const lastDate =

    options.endDate ||

    finalPoll.end_date ||

    finalPoll.start_date;

 

  const dates =

    buildDateSequence(

      firstDate,

      lastDate

    );

 

  const parties =

    getPollParties(

      sortedPolls

    );

 

  const minimumPolls =

    Math.max(

      1,

      Number(

        options.minimumPolls ||

        1

      )

    );

 

  const maxPollAgeDays =

    Math.max(

      7,

      Number(

        options.maxPollAgeDays ||

        90

      )

    );

 

  const halfLifeDays =

    Math.max(

      1,

      Number(

        options.halfLifeDays ||

        28

      )

    );

 

  const points = [];

 

  dates.forEach(date => {

    const eligiblePolls =

      sortedPolls.filter(poll => {

        const pollDate =

          poll.end_date ||

          poll.start_date;

 

        if (

          pollDate > date

        ) {

          return false;

        }

 

        const age =

          daysBetween(

            pollDate,

            date

          );

 

        return (

          age <=

          maxPollAgeDays

        );

      });

 

    if (

      eligiblePolls.length <

      minimumPolls

    ) {

      return;

    }

 

    const totals = {};

    const weights = {};

 

    parties.forEach(party => {

      totals[party] = 0;

      weights[party] = 0;

    });

 

    eligiblePolls.forEach(poll => {

      const weight =

        calculatePollWeight(

          poll,

          {

            referenceDate:

              date,

 

            halfLifeDays

          }

        );

 

      parties.forEach(party => {

        const value =

          pollPartyValue(

            poll,

            party

          );

 

        if (

          !Number.isFinite(value)

        ) {

          return;

        }

 

        totals[party] +=

          value * weight;

 

        weights[party] +=

          weight;

      });

    });

 

    const values = {};

 

    parties.forEach(party => {

      values[party] =

        weights[party] > 0

          ? totals[party] /

            weights[party]

          : null;

    });

 

    if (

      !Number.isFinite(

        values.D

      ) ||

      !Number.isFinite(

        values.R

      )

    ) {

      return;

    }

 

    points.push({

      date,

 

      dem:

        values.D,

 

      rep:

        values.R,

 

      ind:

        Number.isFinite(

          values.I

        )

          ? values.I

          : null,

 

      lib:

        Number.isFinite(

          values.L

        )

          ? values.L

          : null,

 

      green:

        Number.isFinite(

          values.G

        )

          ? values.G

          : null,

 

      margin:

        values.D -

        values.R,

 

      pollCount:

        eligiblePolls.length,

 

      parties:

        values

    });

  });

 

  return smoothRunningAverage(

    points,

    options.smoothingDays ||

    3

  );

}

 

function smoothRunningAverage(

  points = [],

  smoothingDays = 3

) {

  const windowSize =

    Math.max(

      1,

      Number(

        smoothingDays

      )

    );

 

  if (

    windowSize <= 1 ||

    points.length <= 2

  ) {

    return points;

  }

 

  const partyKeys = [

    "dem",

    "rep",

    "ind",

    "lib",

    "green"

  ];

 

  return points.map(

    (point, index) => {

      const start =

        Math.max(

          0,

          index -

          windowSize +

          1

        );

 

      const sample =

        points.slice(

          start,

          index + 1

        );

 

      const smoothed = {

        ...point

      };

 

      partyKeys.forEach(key => {

        const values =

          sample

            .map(item =>

              Number(

                item[key]

              )

            )

            .filter(

              Number.isFinite

            );

 

        smoothed[key] =

          values.length

            ? values.reduce(

                (

                  sum,

                  value

                ) =>

                  sum + value,

                0

              ) /

              values.length

            : null;

      });

 

      smoothed.margin =

        Number.isFinite(

          smoothed.dem

        ) &&

        Number.isFinite(

          smoothed.rep

        )

          ? smoothed.dem -

            smoothed.rep

          : null;

 

      return smoothed;

    }

  );

}

 

 

/* =========================================================

   POLLING METADATA

   ========================================================= */

 

function pollDateBounds(

  polls = []

) {

  const dates =

    polls

      .flatMap(poll => [

        poll.start_date,

        poll.end_date

      ])

      .filter(Boolean)

      .sort();

 

  if (!dates.length) {

    return {

      start: null,

      end: null

    };

  }

 

  return {

    start:

      dates[0],

 

    end:

      dates[

        dates.length - 1

      ]

  };

}

 

function totalPollSample(

  polls = []

) {

  return polls.reduce(

    (

      total,

      poll

    ) => {

      const sample =

        Number(

          poll.sample_size

        );

 

      return (

        total +

        (

          Number.isFinite(

            sample

          )

            ? sample

            : 0

        )

      );

    },

    0

  );

}

 

function newestPoll(

  polls = []

) {

  return [...polls].sort(

    (first, second) => {

      const firstDate =

        new Date(

          `${

            first.end_date ||

            first.start_date ||

            "1900-01-01"

          }T12:00:00`

        );

 

      const secondDate =

        new Date(

          `${

            second.end_date ||

            second.start_date ||

            "1900-01-01"

          }T12:00:00`

        );

 

      return (

        secondDate -

        firstDate

      );

    }

  )[0] || null;

}

 

function pollingMetadata(

  polls = []

) {

  const published =

    polls.filter(

      poll =>

        !poll.status ||

        poll.status ===

        "published"

    );

 

  const bounds =

    pollDateBounds(

      published

    );

 

  const latest =

    newestPoll(

      published

    );

 

  return {

    pollCount:

      published.length,

 

    startDate:

      bounds.start,

 

    endDate:

      bounds.end,

 

    sampleTotal:

      totalPollSample(

        published

      ),

 

    latestPollster:

      latest?.pollster ||

      null,

 

    latestPoll:

      latest

  };

}

 

 

/* =========================================================

   CANDIDATE AND POLL DISPLAY HELPERS

   ========================================================= */

 

function candidatePollingLabel(

  candidate,

  fallbackParty

) {

  if (

    candidate?.name

  ) {

    return candidate.name;

  }

 

  return partyName(

    fallbackParty

  );

}

 

function pollingBarSegments(

  average,

  candidates = []

) {

  if (!average) {

    return [];

  }

 

  const sorted =

    sortCandidates(

      candidates

    );

 

  const demCandidate =

    candidateForParty(

      sorted,

      "D"

    );

 

  const repCandidate =

    candidateForParty(

      sorted,

      "R"

    );

 

  const segments = [

    {

      party: "D",

      label:

        candidatePollingLabel(

          demCandidate,

          "D"

        ),

      value:

        Number(

          average.dem

        ),

      color:

        partyColor("D")

    },

 

    {

      party: "R",

      label:

        candidatePollingLabel(

          repCandidate,

          "R"

        ),

      value:

        Number(

          average.rep

        ),

      color:

        partyColor("R")

    }

  ];

 

  const independents =

    independentCandidates(

      sorted

    );

 

  if (

    Number.isFinite(

      Number(

        average.ind

      )

    )

  ) {

    segments.push({

      party: "I",

 

      label:

        candidatePollingLabel(

          independents[0],

          "I"

        ),

 

      value:

        Number(

          average.ind

        ),

 

      color:

        partyColor("I")

    });

  }

 

  if (

    Number.isFinite(

      Number(

        average.lib

      )

    )

  ) {

    const libertarian =

      candidateForParty(

        sorted,

        "L"

      );

 

    segments.push({

      party: "L",

 

      label:

        candidatePollingLabel(

          libertarian,

          "L"

        ),

 

      value:

        Number(

          average.lib

        ),

 

      color:

        partyColor("L")

    });

  }

 

  if (

    Number.isFinite(

      Number(

        average.green

      )

    )

  ) {

    const green =

      candidateForParty(

        sorted,

        "G"

      );

 

    segments.push({

      party: "G",

 

      label:

        candidatePollingLabel(

          green,

          "G"

        ),

 

      value:

        Number(

          average.green

        ),

 

      color:

        partyColor("G")

    });

  }

 

  const knownTotal =

    segments.reduce(

      (

        total,

        segment

      ) =>

        total +

        (

          Number.isFinite(

            segment.value

          )

            ? segment.value

            : 0

        ),

      0

    );

 

  if (

    knownTotal < 99.95

  ) {

    segments.push({

      party: "OTHER",

 

      label:

        "Undecided / Other",

 

      value:

        Math.max(

          0,

          100 -

          knownTotal

        ),

 

      color:

        "#cbd5e1"

    });

  }

 

  return segments.filter(

    segment =>

      Number.isFinite(

        segment.value

      ) &&

      segment.value > 0

  );

}

 

 

/* =========================================================

   FORECAST CONFIDENCE

   ========================================================= */

 

function forecastConfidence(

  polls = []

) {

  const published =

    polls.filter(

      poll =>

        !poll.status ||

        poll.status ===

        "published"

    );

 

  if (!published.length) {

    return {

      level: "Low",

      score: 10,

      reason:

        "No published polling."

    };

  }

 

  const metadata =

    pollingMetadata(

      published

    );

 

  const bounds =

    pollDateBounds(

      published

    );

 

  const spanDays =

    bounds.start &&

    bounds.end

      ? daysBetween(

          bounds.start,

          bounds.end

        )

      : 0;

 

  const pollScore =

    Math.min(

      50,

      published.length * 5

    );

 

  const sampleScore =

    Math.min(

      25,

      metadata.sampleTotal /

      500

    );

 

  const spanScore =

    Math.min(

      15,

      spanDays / 4

    );

 

  const latestAge =

    bounds.end

      ? daysBetween(

          bounds.end,

          new Date()

        )

      : 120;

 

  const freshnessScore =

    latestAge <= 7

      ? 10

      : latestAge <= 21

      ? 7

      : latestAge <= 45

      ? 4

      : 1;

 

  const score =

    clamp(

      pollScore +

      sampleScore +

      spanScore +

      freshnessScore,

      0,

      100

    );

 

  let level =

    "Low";

 

  if (score >= 75) {

    level =

      "High";

  } else if (

    score >= 45

  ) {

    level =

      "Medium";

  }

 

  return {

    level,

 

    score:

      Math.round(score),

 

    reason:

      `${published.length} published ${

        published.length === 1

          ? "poll"

          : "polls"

      }`

  };

}

 

 

/* =========================================================

   PUBLIC SETTINGS

   ========================================================= */

 

async function getSiteSettings(

  defaults = {}

) {

  if (!sb) {

    return {

      ...defaults

    };

  }

 

  const {

    data,

    error

  } = await sb

    .from(

      "site_settings"

    )

    .select(

      "setting_key, setting_value, updated_at"

    );

 

  if (error) {

    console.warn(

      "Could not load site settings:",

      error.message

    );

 

    return {

      ...defaults

    };

  }

 

  return {

    ...defaults,

 

    ...(data || []).reduce(

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

    )

  };

}

 

 

/* =========================================================

   SAFE DOM HELPERS

   ========================================================= */

 

function setElementText(

  selector,

  value

) {

  const element =

    document.querySelector(

      selector

    );

 

  if (element) {

    element.textContent =

      value;

  }

 

  return element;

}

 

function setElementHtml(

  selector,

  value

) {

  const element =

    document.querySelector(

      selector

    );

 

  if (element) {

    element.innerHTML =

      value;

  }

 

  return element;

}

 

function showElement(

  selector,

  displayValue = ""

) {

  const element =

    document.querySelector(

      selector

    );

 

  if (element) {

    element.style.display =

      displayValue;

  }

 

  return element;

}

 

function hideElement(

  selector

) {

  const element =

    document.querySelector(

      selector

    );

 

  if (element) {

    element.style.display =

      "none";

  }

 

  return element;

}

 

 

/* =========================================================

   ERROR HANDLING

   ========================================================= */

 

function friendlyErrorMessage(

  error,

  fallback =

    "Something went wrong."

) {

  if (

    typeof error === "string"

  ) {

    return error;

  }

 

  if (

    error?.message

  ) {

    return error.message;

  }

 

  return fallback;

}

 

function renderLoadError(

  element,

  error,

  fallback =

    "Unable to load this content."

) {

  if (!element) {

    return;

  }

 

  element.innerHTML = `

    <div class="empty">

      ${escapeHtml(

        friendlyErrorMessage(

          error,

          fallback

        )

      )}

    </div>

  `;

}
