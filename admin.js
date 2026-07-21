
let state={races:[],polls:[],candidates:[],currentRaceId:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function msg(text,type="success"){const n=$("#adminMessage");n.className=`notice ${type}`;n.textContent=text;n.style.display="block";setTimeout(()=>n.style.display="none",5000)}
async function requireAdmin(){
 if(!configured){location.href="login.html";return false}
 const {data:{session}}=await sb.auth.getSession();if(!session){location.href="login.html";return false}
 const {data}=await sb.from("admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
 if(!data){await sb.auth.signOut();location.href="login.html";return false}
 $("#adminEmail").textContent=session.user.email;return true
}
async function reloadAll(){
 const [rr,cc,pp]=await Promise.all([
  sb.from("races").select("*").order("state"),
  sb.from("candidates").select("*").order("name"),
  sb.from("polls").select("*").order("end_date",{ascending:false})
 ]);
 if(rr.error||cc.error||pp.error)throw rr.error||cc.error||pp.error;
 state.races=rr.data||[];state.candidates=cc.data||[];state.polls=pp.data||[];
 renderDashboard();renderRaces();renderCandidates();renderPolls();populateRaceSelects();
}
function renderDashboard(){
 $("#statRaces").textContent=state.races.length;$("#statPublished").textContent=state.races.filter(r=>r.status==="published").length;
 $("#statCandidates").textContent=state.candidates.length;$("#statPolls").textContent=state.polls.length;
}
function renderRaces(){
 $("#racesBody").innerHTML=state.races.map(r=>`<tr><td><b>${escapeHtml(r.title)}</b><br><small>${escapeHtml(r.slug)}</small></td><td>${escapeHtml(r.rating)}</td><td>${r.projected_margin>0?"D +":"R +"}${Math.abs(r.projected_margin).toFixed(1)}</td><td><span class="badge ${r.status==="published"?"green":"gold"}">${r.status}</span></td><td><button class="btn light" onclick="editRace('${r.id}')">Edit</button> <button class="btn red" onclick="deleteRace('${r.id}')">Delete</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">No races yet.</td></tr>';
}
function renderCandidates(){
 $("#candidatesBody").innerHTML=state.candidates.map(c=>{const r=state.races.find(x=>x.id===c.race_id);return `<tr><td><b>${escapeHtml(c.name)}</b></td><td>${escapeHtml(r?.title||"—")}</td><td>${c.party}</td><td>${Number(c.win_probability||0).toFixed(1)}%</td><td><button class="btn light" onclick="editCandidate('${c.id}')">Edit</button> <button class="btn red" onclick="deleteCandidate('${c.id}')">Delete</button></td></tr>`}).join("")||'<tr><td colspan="5" class="empty">No candidates yet.</td></tr>';
}
function renderPolls(){
 $("#pollsBody").innerHTML=state.polls.map(p=>{const r=state.races.find(x=>x.id===p.race_id);return `<tr><td><b>${escapeHtml(p.pollster)}</b></td><td>${escapeHtml(r?.title||"—")}</td><td>${fmtDate(p.end_date)}</td><td>${p.sample_size} ${p.population}</td><td>D ${p.dem_pct} / R ${p.rep_pct}</td><td><span class="badge ${p.status==="published"?"green":"gold"}">${p.status}</span></td><td><button class="btn light" onclick="editPoll('${p.id}')">Edit</button> <button class="btn red" onclick="deletePoll('${p.id}')">Delete</button></td></tr>`}).join("")||'<tr><td colspan="7" class="empty">No polls yet.</td></tr>';
}
function populateRaceSelects(){
 const opts='<option value="">Choose race</option>'+state.races.map(r=>`<option value="${r.id}">${escapeHtml(r.title)}</option>`).join("");
 $("#candidateRace").innerHTML=opts;$("#pollRace").innerHTML=opts;
}
function openModal(id){$("#"+id).classList.add("open")}function closeModal(id){$("#"+id).classList.remove("open")}
function editRace(id=""){
 const r=state.races.find(x=>x.id===id)||{};
 $("#raceId").value=r.id||"";$("#raceState").value=r.state||"";$("#raceTitle").value=r.title||"";$("#raceSlug").value=r.slug||"";
 $("#raceRating").value=r.rating||"Toss-up";$("#raceMargin").value=r.projected_margin??0;$("#raceFeatured").checked=!!r.featured;
 $("#raceStatus").value=r.status||"draft";$("#raceSummary").value=r.summary||"";openModal("raceModal")
}
async function saveRace(e){
 e.preventDefault();const id=$("#raceId").value;
 const row={state:$("#raceState").value.trim(),title:$("#raceTitle").value.trim(),slug:$("#raceSlug").value.trim().toLowerCase().replace(/\s+/g,"-"),rating:$("#raceRating").value,projected_margin:Number($("#raceMargin").value),featured:$("#raceFeatured").checked,status:$("#raceStatus").value,summary:$("#raceSummary").value.trim(),updated_at:new Date().toISOString()};
 const q=id?sb.from("races").update(row).eq("id",id):sb.from("races").insert(row);const {error}=await q;if(error)return msg(error.message,"error");closeModal("raceModal");await reloadAll();msg("Race saved.")
}
async function deleteRace(id){if(!confirm("Delete this race and all attached candidates and polls?"))return;const {error}=await sb.from("races").delete().eq("id",id);if(error)return msg(error.message,"error");await reloadAll();msg("Race deleted.")}
function editCandidate(id=""){
 const c=state.candidates.find(x=>x.id===id)||{};$("#candidateId").value=c.id||"";$("#candidateRace").value=c.race_id||"";$("#candidateName").value=c.name||"";$("#candidateParty").value=c.party||"D";$("#candidateIncumbent").checked=!!c.incumbent;$("#candidateProb").value=c.win_probability??50;$("#candidateVote").value=c.expected_vote_share??50;$("#candidatePhoto").value=c.photo_url||"";openModal("candidateModal")
}
async function saveCandidate(e){
 e.preventDefault();const id=$("#candidateId").value,row={race_id:$("#candidateRace").value,name:$("#candidateName").value.trim(),party:$("#candidateParty").value,incumbent:$("#candidateIncumbent").checked,win_probability:Number($("#candidateProb").value),expected_vote_share:Number($("#candidateVote").value),photo_url:$("#candidatePhoto").value.trim()||null};
 const q=id?sb.from("candidates").update(row).eq("id",id):sb.from("candidates").insert(row);const {error}=await q;if(error)return msg(error.message,"error");closeModal("candidateModal");await reloadAll();msg("Candidate saved.")
}
async function deleteCandidate(id){if(!confirm("Delete this candidate?"))return;const {error}=await sb.from("candidates").delete().eq("id",id);if(error)return msg(error.message,"error");await reloadAll();msg("Candidate deleted.")}
function editPoll(id=""){
 const p=state.polls.find(x=>x.id===id)||{};$("#pollId").value=p.id||"";$("#pollRace").value=p.race_id||"";$("#pollster").value=p.pollster||"";$("#pollStart").value=p.start_date||"";$("#pollEnd").value=p.end_date||"";$("#pollSample").value=p.sample_size||800;$("#pollPopulation").value=p.population||"LV";$("#pollDem").value=p.dem_pct??48;$("#pollRep").value=p.rep_pct??48;$("#pollQuality").value=p.quality_weight??1;$("#pollStatus").value=p.status||"draft";openModal("pollModal")
}
async function savePoll(e){
 e.preventDefault();const id=$("#pollId").value,row={race_id:$("#pollRace").value,pollster:$("#pollster").value.trim(),start_date:$("#pollStart").value,end_date:$("#pollEnd").value,sample_size:Number($("#pollSample").value),population:$("#pollPopulation").value,dem_pct:Number($("#pollDem").value),rep_pct:Number($("#pollRep").value),quality_weight:Number($("#pollQuality").value),status:$("#pollStatus").value};
 const q=id?sb.from("polls").update(row).eq("id",id):sb.from("polls").insert(row);const {error}=await q;if(error)return msg(error.message,"error");closeModal("pollModal");await reloadAll();msg("Poll saved. Published polling averages recalculate automatically.")
}
async function deletePoll(id){if(!confirm("Delete this poll?"))return;const {error}=await sb.from("polls").delete().eq("id",id);if(error)return msg(error.message,"error");await reloadAll();msg("Poll deleted.")}
document.addEventListener("DOMContentLoaded",async()=>{
 if(!$("#adminApp"))return;if(!await requireAdmin())return;
 $$(".sidebar button[data-panel]").forEach(b=>b.onclick=()=>{$$(".sidebar button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".adminPanel").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.panel).classList.add("active")});
 $("#logout").onclick=async()=>{await sb.auth.signOut();location.href="login.html"};
 $("#raceForm").onsubmit=saveRace;$("#candidateForm").onsubmit=saveCandidate;$("#pollForm").onsubmit=savePoll;
 try{await reloadAll()}catch(e){msg(e.message,"error")}
});
window.editRace=editRace;window.deleteRace=deleteRace;window.editCandidate=editCandidate;window.deleteCandidate=deleteCandidate;window.editPoll=editPoll;window.deletePoll=deletePoll;window.openModal=openModal;window.closeModal=closeModal;
