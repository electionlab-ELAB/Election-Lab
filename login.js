
document.addEventListener("DOMContentLoaded",()=>{
 const form=document.querySelector("#loginForm"); if(!form)return;
 const msg=document.querySelector("#message");
 if(!configured){msg.className="notice error";msg.textContent="Supabase is not connected yet. Complete config.js after creating your project.";return}
 sb.auth.getSession().then(({data})=>{if(data.session)location.href="admin.html"});
 form.onsubmit=async e=>{
  e.preventDefault();msg.className="notice";msg.textContent="Signing in…";
  const email=form.email.value.trim(),password=form.password.value;
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){msg.className="notice error";msg.textContent=error.message;return}
  const {data:admin}=await sb.from("admins").select("user_id").eq("user_id",data.user.id).maybeSingle();
  if(!admin){await sb.auth.signOut();msg.className="notice error";msg.textContent="This account is not authorized as an ElectionLab administrator.";return}
  location.href="admin.html";
 };
});
