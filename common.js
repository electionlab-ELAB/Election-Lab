
const CFG = window.ELECTIONLAB_CONFIG || {};
const configured = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes("PASTE_") && CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes("PASTE_");
const sb = configured ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function partyName(p){return p==="D"?"Democratic":p==="R"?"Republican":"Independent"}
function ratingClass(r=""){return /Republican/i.test(r)?"red":/Toss/i.test(r)?"gold":/Democratic/i.test(r)?"":"green"}
function fmtDate(d){if(!d)return"—";return new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function nav(){
  const btn=document.querySelector(".menuBtn"),links=document.querySelector(".navlinks");
  if(btn&&links)btn.onclick=()=>links.classList.toggle("open");
}
document.addEventListener("DOMContentLoaded",nav);

async function getPublishedRaces(){
  if(!sb)return [];
  const {data,error}=await sb.from("races").select("*,candidates(*)").eq("status","published").order("state");
  if(error)throw error; return data||[];
}
async function getPublishedPolls(raceId){
  if(!sb)return [];
  const {data,error}=await sb.from("polls").select("*").eq("race_id",raceId).eq("status","published").order("end_date",{ascending:false});
  if(error)throw error;return data||[];
}
function weightedAverage(polls){
  if(!polls.length)return null;
  let dw=0,rw=0,total=0;
  const today=Date.now();
  for(const p of polls){
    const days=Math.max(0,(today-new Date(p.end_date+"T12:00:00"))/86400000);
    const recency=Math.exp(-days/28);
    const sample=Math.sqrt(Math.max(100,p.sample_size||500)/500);
    const quality=Math.max(.25,p.quality_weight||1);
    const population=p.population==="LV"?1.1:p.population==="RV"?1:.86;
    const w=recency*sample*quality*population;
    dw+=(Number(p.dem_pct)||0)*w;rw+=(Number(p.rep_pct)||0)*w;total+=w;
  }
  return total?{dem:dw/total,rep:rw/total,margin:(dw-rw)/total}:null;
}
