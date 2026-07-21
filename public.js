async function loadHome() {
  const box = document.querySelector("#featuredRaces");

  if (!box) return;

  if (!configured) {
    box.innerHTML =
      '<div class="empty">The public design is ready. Connect Supabase to load your published races.</div>';
    return;
  }

  try {
    const races = await getPublishedRaces();
    const featured = races.filter(r => r.featured).slice(0, 6);

    const count = document.querySelector("#raceCount");

    if (count) {
      count.textContent = races.length;
    }

    box.innerHTML =
      (featured.length ? featured : races.slice(0, 6))
        .map(r => raceCard(r))
        .join("") ||
      '<div class="empty">No published races yet.</div>';
  } catch (e) {
    box.innerHTML =
      '<div class="empty">' +
      escapeHtml(e.message) +
      "</div>";
  }
}

function raceCard(r) {
  const candidates = [...(r.candidates || [])].sort(
    (a, b) =>
      (b.win_probability || 0) -
      (a.win_probability || 0)
  );

  const office = raceOffice(r);
  const label = officeLabel(office);

  const margin = Number(r.projected_margin || 0);

  return `
    <a class="card raceCard"
       href="race.html?id=${encodeURIComponent(r.slug)}">

      <div class="raceMeta">
        <span>${escapeHtml(r.state)} · ${escapeHtml(label)}</span>

        <span class="badge ${ratingClass(r.rating)}">
          ${escapeHtml(r.rating)}
        </span>
      </div>

      <h3>${escapeHtml(r.title)}</h3>

      <div class="candidates">
        ${candidates
          .slice(0, 3)
          .map(
            candidate => `
              <div class="candidateLine">
                <span>
                  <i class="partyDot party-${candidate.party}"></i>
                  ${escapeHtml(candidate.name)}
                </span>

                <strong>
                  ${Number(
                    candidate.win_probability || 0
                  ).toFixed(0)}%
                </strong>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="raceMeta">
        <span>Model margin</span>

        <strong>
          ${margin >= 0 ? "D +" : "R +"}
          ${Math.abs(margin).toFixed(1)}
        </strong>
      </div>
    </a>
  `;
}

async function loadRaceGrid() {
  const box = document.querySelector("#raceGrid");

  if (!box) return;

  const office = currentPageOffice();
  const label = officeLabel(office);

  if (!configured) {
    box.innerHTML =
      `<div class="empty">Connect Supabase to display published ${escapeHtml(
        label
      )} races.</div>`;
    return;
  }

  try {
    const races = await getPublishedRaces(office);

    function displayRaces(list) {
      box.innerHTML =
        list.map(r => raceCard(r)).join("") ||
        `<div class="empty">No published ${escapeHtml(
          label
        )} races yet.</div>`;
    }

    displayRaces(races);

    const input = document.querySelector("#raceSearch");

    if (input) {
      input.oninput = () => {
        const query = input.value.toLowerCase().trim();

        const filtered = races.filter(race => {
          const searchable = [
            race.title,
            race.state,
            ...(race.candidates || []).map(c => c.name)
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(query);
        });

        box.innerHTML =
          filtered.map(r => raceCard(r)).join("") ||
          '<div class="empty">No matches.</div>';
      };
    }
  } catch (e) {
    box.innerHTML =
      '<div class="empty">' +
      escapeHtml(e.message) +
      "</div>";
  }
}

async function loadRace() {
  const root = document.querySelector("#raceRoot");

  if (!root) return;

  if (!configured) {
    root.innerHTML =
      '<div class="empty">Connect Supabase to load this race.</div>';
    return;
  }

  const slug = new URLSearchParams(location.search).get("id");

  const { data: race, error } = await sb
    .from("races")
    .select("*,candidates(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !race) {
    root.innerHTML =
      '<div class="empty">Published race not found.</div>';
    return;
  }

  const polls = await getPublishedPolls(race.id);
  const average = weightedAverage(polls);

  const candidates = [...(race.candidates || [])].sort(
    (a, b) =>
      (b.win_probability || 0) -
      (a.win_probability || 0)
  );

  const office = raceOffice(race);
  const label = officeLabel(office);
  const margin = Number(race.projected_margin || 0);

  document.title = `${race.title} | ElectionLab`;

  root.innerHTML = `
    <div class="hero">
      <div class="heroGrid">

        <div>
          <div class="kicker">
            2026 ${escapeHtml(label)} Forecast
          </div>

          <h1>${escapeHtml(race.title)}</h1>

          <p>
            ${escapeHtml(
              race.summary ||
                "ElectionLab's published forecast and polling average."
            )}
          </p>

          <span class="badge ${ratingClass(race.rating)}">
            ${escapeHtml(race.rating)}
          </span>
        </div>

        <div class="probCard">
          <div class="bigProb">
            ${Number(
              candidates[0]?.win_probability || 0
            ).toFixed(0)}%
          </div>

          <b>
            ${escapeHtml(
              candidates[0]?.name || "Leading candidate"
            )}
          </b>

          <div>chance to win</div>
        </div>

      </div>
    </div>

    <section class="section">
      <div class="grid2">

        <div class="card">
          <h2>Forecast</h2>

          ${candidates
            .map(
              candidate => `
                <div class="candidateLine">
                  <span>
                    <i class="partyDot party-${candidate.party}"></i>

                    <b>${escapeHtml(candidate.name)}</b>

                    <small class="subtle">
                      ${escapeHtml(
                        partyName(candidate.party)
                      )}
                    </small>
                  </span>

                  <strong>
                    ${Number(
                      candidate.win_probability || 0
                    ).toFixed(0)}%
                  </strong>
                </div>
              `
            )
            .join("")}

          <p class="subtle">
            Projected margin:
            <b>
              ${margin >= 0 ? "D +" : "R +"}
              ${Math.abs(margin).toFixed(1)}
            </b>
          </p>
        </div>

        <div class="card">
          <h2>Polling average</h2>

          ${
            average
              ? `
                <div
                  class="bigProb"
                  style="font-size:48px;color:var(--ink)"
                >
                  ${average.margin >= 0 ? "D +" : "R +"}
                  ${Math.abs(average.margin).toFixed(1)}
                </div>

                <div class="controlBar">
                  <span
                    class="dem"
                    style="width:${average.dem}%"
                  ></span>

                  <span
                    class="rep"
                    style="width:${average.rep}%"
                  ></span>
                </div>

                <div class="raceMeta">
                  <b>D ${average.dem.toFixed(1)}%</b>
                  <b>R ${average.rep.toFixed(1)}%</b>
                </div>
              `
              : '<p class="subtle">No published polls yet.</p>'
          }
        </div>

      </div>
    </section>

    <section class="section">
      <div class="sectionHead">
        <div>
          <h2>Recent polls</h2>

          <p>
            Weighted by recency, sample size, voter population,
            and quality.
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
              polls
                .map(poll => {
                  const pollMargin =
                    Number(poll.dem_pct) -
                    Number(poll.rep_pct);

                  return `
                    <tr>
                      <td>
                        <b>${escapeHtml(poll.pollster)}</b>
                      </td>

                      <td>
                        ${fmtDate(poll.start_date)}–${fmtDate(
                    poll.end_date
                  )}
                      </td>

                      <td>
                        ${poll.sample_size || "—"}
                        ${escapeHtml(poll.population || "")}
                      </td>

                      <td>
                        ${Number(poll.dem_pct).toFixed(1)}
                      </td>

                      <td>
                        ${Number(poll.rep_pct).toFixed(1)}
                      </td>

                      <td>
                        <b>
                          ${pollMargin >= 0 ? "D +" : "R +"}
                          ${Math.abs(pollMargin).toFixed(1)}
                        </b>
                      </td>
                    </tr>
                  `;
                })
                .join("") ||
              '<tr><td colspan="6" class="empty">No polls published.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  loadHome();
  loadRaceGrid();
  loadRace();
});
