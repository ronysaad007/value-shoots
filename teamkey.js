/* Value Shoots — team sign-in.
   The team data (bookings, accounts, requests) lives in Rony's private Google Sheet. The Apps Script below only
   answers requests that carry the team password; each device asks for it once and keeps it. */
(function(){
const API='https://script.google.com/macros/s/AKfycbwy-zE5NVwkQb6n-6n5tAdkG99kVNuYTt1Dr9wIrbyMgscuOGI1N9rEr9Dw_7xmU3yd/exec', K='vs-team-k';
const get=k=>{try{return localStorage.getItem(k)||''}catch(e){return''}}, set=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}, del=k=>{try{localStorage.removeItem(k)}catch(e){}};
let embedded=false; try{embedded=window.top!==window}catch(e){embedded=true}
const waiters=[]; let refused=false; const flush=()=>{while(waiters.length)waiters.shift()()};
window.addEventListener('storage',e=>{if(e.key===K&&e.newValue)flush()});
const ar=()=>(get('vs-lang')||document.documentElement.lang||'ar').slice(0,2)==='ar';
let shown=false;
function gate(){
  if(shown||!document.body){ if(!document.body) document.addEventListener('DOMContentLoaded',gate,{once:true}); return; } shown=true;
  const A=ar(), d=document.createElement('div'); d.id='vskGate'; d.dir=A?'rtl':'ltr';
  d.innerHTML='<style>#vskGate{position:fixed;inset:0;z-index:2147483000;background:#121725;display:grid;place-items:center;padding:16px;font-family:"IBM Plex Sans Arabic","Readex Pro",system-ui,sans-serif}#vskGate form{width:min(380px,100%);background:#1A2133;border:1px solid #2A3348;border-radius:18px;padding:26px;display:flex;flex-direction:column;gap:12px;text-align:center;color:#E9ECF3}#vskGate h2{margin:0;font-size:22px}#vskGate p{margin:0;color:#A6AEC2;font-size:14px;line-height:1.6}#vskGate input{background:#151B2A;border:1px solid #3B4560;border-radius:10px;padding:12px;font-size:17px;text-align:center;color:#E9ECF3}#vskGate button{background:#E8B4A8;color:#1E2538;border:0;border-radius:10px;padding:11px;font-weight:700;font-size:15px;cursor:pointer}#vskGate button:disabled{opacity:.6}#vskGate .m{min-height:18px;font-size:13px;color:#E0605A}</style>'
   +'<form novalidate><div style="font-size:34px">🔒</div><h2>Value Shoots</h2><p>'+(A?'أهلا 👋 اكتب كلمة سر الفريق. بتنطلب مرة وحدة بس على هالجهاز.':'Welcome 👋 Enter the team password. It is asked only once on this device.')+'</p>'
   +'<input type="password" autocomplete="current-password" dir="ltr" placeholder="'+(A?'كلمة السر':'Password')+'"><button type="submit">'+(A?'ادخل':'Enter')+'</button><span class="m" role="status"></span></form>';
  document.body.appendChild(d); document.documentElement.style.overflow='hidden';
  const f=d.querySelector('form'), i=d.querySelector('input'), b=d.querySelector('button'), m=d.querySelector('.m'); setTimeout(()=>i.focus(),80);
  f.addEventListener('submit',async e=>{ e.preventDefault(); const pw=i.value.trim(); if(!pw) return; b.disabled=true; m.textContent='';
    const r=await VSK.check(pw); b.disabled=false;
    if(r==='ok'){ set(K,pw); if(refused){ location.reload(); return; } d.remove(); document.documentElement.style.overflow=''; shown=false; flush(); }
    else { m.textContent=r==='locked'?(A?'محاولات كتير غلط. جرّب بعد ربع ساعة.':'Too many wrong tries. Try again in 15 minutes.'):r==='net'?(A?'لازم إنترنت لأول مرة.':'You need internet the first time.'):(A?'كلمة السر غلط':'Wrong password'); i.select(); } });
}
const VSK=window.VSK={
  api:API, key:()=>get(K),
  url:q=>API+'?'+q+'&k='+encodeURIComponent(get(K)),
  post:d=>Object.assign({},d,{k:get(K)}),
  async check(pw){ try{ const r=await fetch(API+'?a=auth&k='+encodeURIComponent(pw)+'&t='+Date.now(),{cache:'no-store'}); const j=await r.json(); return j&&j.ok?'ok':(j&&j.locked?'locked':'bad'); }catch(e){ return 'net'; } },
  ready(){ if(get(K)) return Promise.resolve(); return new Promise(res=>{ waiters.push(res); if(!embedded) gate(); }); },
  // call with a parsed API reply; returns false (and asks for the password again) when it was refused
  ok(j){ if(j&&j.auth===false){ del(K); refused=true; if(embedded){ try{ window.top.location.reload(); }catch(e){} } else gate(); return false; } return true; },
  async json(q){ await VSK.ready(); const r=await fetch(VSK.url(q),{cache:'no-store'}); const j=await r.json(); if(!VSK.ok(j)) throw new Error('auth'); return j; }
};
})();
