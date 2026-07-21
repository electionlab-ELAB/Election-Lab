
async function loadHome(){
 const box=document.querySelector("#featuredRaces"); if(!box)return;
 if(!configured){box.innerHTML='<div class="empty">The public design is ready. Connect Supabase to load your published races.</div>';return}
 try{
  const races=await getPublishedRaces();
  const featured=races.filter(r=>r.featured).slice(0,6);
  document.querySelector("#raceCount").textContent=races.length;
  box.innerHTML=(featured.length?featured:races.slice(0,6)).map(r=>raceCard(r)).join("")||'<div class="empty">No published races yet.</div>';
 }catch(e){box.innerHTML='<div class="empty">'+escapeHtml(e.message)+'</div>'}
}
function raceCard(r){
 const c=[...(r.candidates||[])].sort((a,b)=>(b.win_probability||0)-(a.win_probability||0));
 return `<a class="card raceCard" href="race.html?id=${encodeURIComponent(r.slug)}">
 <div class="raceMeta"><span>${escapeHtml(r.state)} · U.S. Senate</span><span class="badge ${ratingClass(r.rating)}">${escapeHtml(r.rating)}</span></div>
 <h3>${escapeHtml(r.title)}</h3>
 <div class="candidates">${c.slice(0,3).map(x=>`<div class="candidateLine"><span><i class="partyDot party-${x.party}"></i>${escapeHtml(x.name)}</span><strong>${Number(x.win_probability||0).toFixed(0)}%</strong></div>`).join("")}</div>
 <div class="raceMeta"><span>Model margin</span><strong>${r.projected_margin>0?"D +":"R +"}${Math.abs(Number(r.projected_margin||0)).toFixed(1)}</strong></div></a>`
}
async function loadSenate(){
 const box=document.querySelector("#raceGrid");if(!box)return;
 if(!configured){box.innerHTML='<div class="empty">Connect Supabase to display published Senate races.</div>';return}
 try{
  const races=await getPublishedRaces();
  box.innerHTML=races.map(r=>raceCard(r)).join("")||'<div class="empty">No published races yet.</div>';
  const input=document.querySelector("#raceSearch");
  input.oninput=()=>{const q=input.value.toLowerCase();box.innerHTML=races.filter(r=>(r.title+" "+r.state+" "+(r.candidates||[]).map(c=>c.name).join(" ")).toLowerCase().includes(q)).map(r=>raceCard(r)).join("")||'<div class="empty">No matches.</div>'}
 }catch(e){box.innerHTML='<div class="empty">'+escapeHtml(e.message)+'</div>'}
}
async function loadRace(){
 const root=document.querySelector("#raceRoot");if(!root)return;
 if(!configured){root.innerHTML='<div class="empty">Connect Supabase to load this race.</div>';return}
 const slug=new URLSearchParams(location.search).get("id");
 const {data:r,error}=await sb.from("races").select("*,candidates(*)").eq("slug",slug).eq("status","published").maybeSingle();
 if(error||!r){root.innerHTML='<div class="empty">Published race not found.</div>';return}
 const polls=await getPublishedPolls(r.id),avg=weightedAverage(polls);
 document.title=`${r.title} | ElectionLab`;
 const candidates=[...(r.candidates||[])].sort((a,b)=>(b.win_probability||0)-(a.win_probability||0));
 root.innerHTML=`<div class="hero"><div class="heroGrid"><div><div class="kicker">2026 Senate Forecast</div><h1>${escapeHtml(r.title)}</h1><p>${escapeHtml(r.summary||"ElectionLab's published forecast and polling average.")}</p><span class="badge ${ratingClass(r.rating)}">${escapeHtml(r.rating)}</span></div><div class="probCard"><div class="bigProb">${Number(candidates[0]?.win_probability||0).toFixed(0)}%</div><b>${escapeHtml(candidates[0]?.name||"Leading candidate")}</b><div>chance to win</div></div></div></div>
 <section class="section"><div class="grid2"><div class="card"><h2>Forecast</h2>${candidates.map(c=>`<div class="candidateLine"><span><i class="partyDot party-${c.party}"></i><b>${escapeHtml(c.name)}</b><small class="subtle"> ${escapeHtml(partyName(c.party))}</small></span><strong>${Number(c.win_probability||0).toFixed(0)}%</strong></div>`).join("")}<p class="subtle">Projected margin: <b>${r.projected_margin>0?"D +":"R +"}${Math.abs(Number(r.projected_margin||0)).toFixed(1)}</b></p></div>
 <div class="card"><h2>Polling average</h2>${avg?`<div class="bigProb" style="font-size:48px;color:var(--ink)">${avg.margin>=0?"D +":"R +"}${Math.abs(avg.margin).toFixed(1)}</div><div class="controlBar"><span class="dem" style="width:${avg.dem}%"></span><span class="rep" style="width:${avg.rep}%"></span></div><div class="raceMeta"><b>D ${avg.dem.toFixed(1)}%</b><b>R ${avg.rep.toFixed(1)}%</b></div>`:'<p class="subtle">No published polls yet.</p>'}</div></div></section>
 <section class="section"><div class="sectionHead"><div><h2>Recent polls</h2><p>Weighted by recency, sample size, voter population, and quality.</p></div></div><div class="tableWrap"><table><thead><tr><th>Pollster</th><th>Dates</th><th>Sample</th><th>Dem</th><th>Rep</th><th>Margin</th></tr></thead><tbody>${polls.map(p=>`<tr><td><b>${escapeHtml(p.pollster)}</b></td><td>${fmtDate(p.start_date)}–${fmtDate(p.end_date)}</td><td>${p.sample_size||"—"} ${escapeHtml(p.population||"")}</td><td>${Number(p.dem_pct).toFixed(1)}</td><td>${Number(p.rep_pct).toFixed(1)}</td><td><b>${p.dem_pct-p.rep_pct>=0?"D +":"R +"}${Math.abs(p.dem_pct-p.rep_pct).toFixed(1)}</b></td></tr>`).join("")||'<tr><td colspan="6" class="empty">No polls published.</td></tr>'}</tbody></table></div></section>`;
}
document.addEventListener("DOMContentLoaded",()=>{loadHome();loadSenate();loadRace()});
