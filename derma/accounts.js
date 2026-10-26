/* Derma Finder — Value Aesthetic accounts layer.
   accounts.json = the sales team's open-account list (which clinic is our client, and which rep covers each product).
   Clinics from the list that the register doesn't have are added as client-only cards. */
(function(){
if(typeof C==='undefined'||typeof clinicCard!=='function') return;
const PROD=['BioRePeel','ARES','Revitacare','Retinol'];
const AX={en:{client:'Client',clients:'Value clients',panel:'Value Aesthetic account',rep:'Rep',old:'Previously',noTeam:'Our client · team not in the register yet',count:n=>`${n} clients`},
          ar:{client:'عميل',clients:'عملاء Value',panel:'حساب Value Aesthetic',rep:'المندوب',old:'سابقاً',noTeam:'عميل عنا · الفريق مش موجود بالسجل لسا',count:n=>`${n} عميل`}};
const ax=()=>AX[L]||AX.en;
const css=document.createElement('style');
css.textContent=`.acb{display:inline-flex;align-items:center;gap:4px;font:600 11px/1 var(--f-body);color:#fff;background:var(--ok);border-radius:999px;padding:4px 8px;margin-inline-end:8px;vertical-align:3px;letter-spacing:.2px}
.acp{margin:4px 0 12px;border:1px solid #cfe2d7;background:#f1f8f4;border-radius:12px;padding:10px 12px}
.acp h4{margin:0 0 8px;font:600 12px/1.2 var(--f-body);color:var(--ok);text-transform:uppercase;letter-spacing:.6px}
.acp .pr{display:flex;flex-wrap:wrap;gap:6px}
.acp .pi{display:inline-flex;gap:6px;align-items:center;background:#fff;border:1px solid #d9e8df;border-radius:8px;padding:5px 9px;font-size:13px}
.acp .pi b{font-weight:600}.acp .pi span{color:var(--muted)}
.acp .old{margin-top:6px;font-size:12px;color:var(--muted)}
.acp .nt{margin-top:6px;font-size:12px;color:var(--rose-ink)}
#f-acct[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#fff}`;
document.head.appendChild(css);

const mk=c=>{c.k=norm(c.n);c.aw=c.aw||[];c.rw=c.rw||[];c.sw=skWords(c.n,c.rw);c.sj=joinsOf(c.sw);c.lw=norm(c.n).split(' ');return c};
function load(data){
  const byKey=new Map(C.map(c=>[c.ct+'|'+c.n,c]));
  for(const a of data.a){
    const acc={name:a.n,p:a.p||{},o:a.o||''};
    if(a.k&&a.k.length){ a.k.forEach(k=>{const c=byKey.get(k); if(c) c.acct=acc;}); continue; }
    let c=byKey.get(a.ct+'|'+a.dn);
    if(!c){ c=mk({n:a.dn,t:'c',ct:a.ct,docs:[],i:C.length,acOnly:1}); C.push(c); byKey.set(a.ct+'|'+c.n,c); }
    c.acct=acc;
  }
  rebuildTeams();
}

// card: badge + account panel
const _card=clinicCard;
clinicCard=function(c,q,open){
  let h=_card(c,q,open); if(!c.acct) return h;
  const x=ax(), p=c.acct.p;
  h=h.replace('<div class="cname">',`<div class="cname"><span class="acb">✓ ${x.client}</span>`);
  const panel=`<div class="acp"><h4>${x.panel}</h4><div class="pr">${PROD.filter(k=>p[k]).map(k=>`<span class="pi"><b>${k}</b><span>${esc(p[k])}</span></span>`).join('')}</div>`
    +(c.acct.o?`<div class="old">${x.old}: ${esc(c.acct.o)}</div>`:'')+(c.acOnly?`<div class="nt">${x.noTeam}</div>`:'')+`</div>`;
  const at=h.indexOf('<div><button class="btn" type="button" data-xadd');
  if(at>=0) return h.slice(0,at)+panel+h.slice(at);
  return h.replace('<div class="tbl">',panel+'<div class="tbl">');
};

// filters: "Value clients" chip; client-only cards (no team yet) still show
const _place=placeOk;
placeOk=function(c){ return _place(c)&&(!st.acct||!!c.acct); };
const _ok=clinicOk;
clinicOk=function(c,q){
  if(_ok(c,q)) return true;
  if(!c.acct||!c.acOnly||!placeOk(c)||st.spec!=='a') return false;
  if(q){ const ws=q.split(' '); if(!ws.every(w=>wordHit(c,w))) return false; c.rank=qScore(c,ws)*2; }
  return true;
};
const fav=document.getElementById('f-fav');
if(fav&&!document.getElementById('f-acct')){
  fav.insertAdjacentHTML('beforebegin','<button class="chip" id="f-acct" aria-pressed="false"></button>');
  const b=document.getElementById('f-acct');
  b.addEventListener('click',()=>{st.acct=!st.acct;b.setAttribute('aria-pressed',String(!!st.acct));st.limit=60;render();});
}
const _render=render;
render=function(){ const b=document.getElementById('f-acct'); if(b) b.textContent='✓ '+ax().clients; return _render.apply(this,arguments); };

fetch('accounts.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{load(d);render();}).catch(()=>{});
})();
