/* Derma Finder — Value Aesthetic accounts layer.
   accounts.json = the sales team's open-account list (which clinic is our client, and which rep covers each product).
   Clinics from the list that the register doesn't have are added as client-only cards. */
(function(){
if(typeof C==='undefined'||typeof clinicCard!=='function') return;
const PROD=['BioRePeel','ARES','Revitacare','Retinol'];
const AX={en:{client:'Client',clients:'Value clients',panel:'Value Aesthetic account',old:'Previously',noTeam:'Our client · team not in the register yet',
            ask:p=>`${p} — is it selling here?`,st:{selling:'Selling',not:'Not selling',unknown:'Not sure'},check:'Tap a product to update',by:'Your name',byPh:'So we know who checked',needBy:'Write your name first.',saved:'Saved ✓',err:'Not sent — will retry when online.',last:(b,d)=>`by ${b} · ${d}`,newAcc:'+ New account',newT:'New Value account',which:'Which products, and which rep?',none:'—',note:'Note (optional)',send:'Send to Rony',cancel:'Cancel',needP:'Pick at least one product and its rep.',sentA:'Sent ✓ It shows for everyone once Rony approves it.'},
          ar:{client:'عميل',clients:'عملاء Value',panel:'حساب Value Aesthetic',old:'سابقاً',noTeam:'عميل عنا · الفريق مش موجود بالسجل لسا',
            ask:p=>`${p} — عم ينباع هون؟`,st:{selling:'عم ينباع',not:'مش عم ينباع',unknown:'ما بعرف'},check:'اكبس على المنتج لتحدّث حالتو',by:'اسمك',byPh:'لنعرف مين عمل التشييك',needBy:'اكتب اسمك أول.',saved:'انحفظ ✓',err:'ما انبعت، رح ينبعت لما يرجع النت.',last:(b,d)=>`${b} · ${d}`,newAcc:'+ أكاونت جديد',newT:'أكاونت Value جديد',which:'أي منتجات، ومين الريب؟',none:'—',note:'ملاحظة (اختياري)',send:'ابعت لروني',cancel:'إلغاء',needP:'اختار منتج واحد عالأقل ومين الريب تبعو.',sentA:'انبعت ✓ بيطلع للكل بعد ما يوافق روني.'}};
const REPS=['Hala','Leen','Mohamad','Moayad','Maram','Zeina'];
const REPC={Hala:'#C2410C',Leen:'#7C3AED',Mohamad:'#0F766E',Moayad:'#1D4ED8',Maram:'#BE185D',Zeina:'#A16207'};
const repColor=n=>REPC[n]||'#475569';
const ICON={selling:'✅',not:'⏸️',unknown:'❓'};
const API=window.DERMA_API||'';
const SK='acct-status';let ST={};try{ST=JSON.parse(localStorage.getItem(SK)||'{}')||{}}catch(e){}
const saveST=()=>{try{localStorage.setItem(SK,JSON.stringify(ST))}catch(e){}};
let OPEN=null; // {ci,prod}
const ckey=c=>c.ct+'|'+c.n;
const ax=()=>AX[L]||AX.en;
const css=document.createElement('style');
css.textContent=`.acb{display:inline-flex;align-items:center;gap:4px;font:600 11px/1 var(--f-body);color:#fff;background:var(--ok);border-radius:999px;padding:4px 8px;margin-inline-end:8px;vertical-align:3px;letter-spacing:.2px}
.acp{margin:4px 0 12px;border:1px solid #cfe2d7;background:#f1f8f4;border-radius:12px;padding:10px 12px}
.acp h4{margin:0 0 8px;font:600 12px/1.2 var(--f-body);color:var(--ok);text-transform:uppercase;letter-spacing:.6px}
.acp .pr{display:flex;flex-wrap:wrap;gap:6px}
.acp .pi{display:inline-flex;gap:6px;align-items:center;background:#fff;border:1px solid #d9e8df;border-radius:8px;padding:5px 9px;font-size:13px}
.acp .pi{cursor:pointer;font:inherit;color:var(--ink)}.acp .pi:hover{border-color:#9cc5ad}.acp .pi.on{outline:2px solid var(--ok);outline-offset:1px}
.acp .pi b{font-weight:600}.acp .rp{display:inline-flex;align-items:center;gap:5px;font-weight:600;border-radius:999px;padding:2px 8px 2px 6px;font-size:12px}
.acp .rp i{width:8px;height:8px;border-radius:50%;display:inline-block}.acp .si{font-size:13px;line-height:1}.acp .si.none{color:#9aa3ad;font-size:11px}
.acp .hint{font-size:11.5px;color:var(--muted);margin-top:6px}
.acp .ask{margin-top:10px;background:#fff;border:1px solid #d9e8df;border-radius:10px;padding:10px}
.acp .ask p{margin:0 0 8px;font-weight:600;font-size:13px}.acp .ask .ch{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.acp .ask .ch button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}
.acp .ask .ch button.on{background:var(--ok);border-color:var(--ok);color:#fff}
.acp .ask input{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:8px;padding:7px 9px;font:inherit;font-size:13px}
.acp .ask .m{font-size:12px;margin-top:6px}.acp .ask .m.ok{color:var(--ok)}.acp .ask .m.bad{color:var(--rose-ink)}
.acp .ask .lst{font-size:11.5px;color:var(--muted);margin-top:6px}
.acp .old{margin-top:6px;font-size:12px;color:var(--muted)}
.acp .nt{margin-top:6px;font-size:12px;color:var(--rose-ink)}
.nab{margin:4px 0 10px}.naf .nag{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px}
.naf label{display:flex;flex-direction:column;gap:4px;font-size:12px}.naf select,.naf input{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:8px;padding:7px 9px;font:inherit;font-size:13px;background:#fff;margin-top:6px}
.naf label select{margin-top:0}
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
  let h=_card(c,q,open);
  if(!c.acct){ const at=h.indexOf('<div><button class="btn" type="button" data-xadd'); const b=naBtn(c); return at>=0?h.slice(0,at)+b+h.slice(at):h.replace('<div class="tbl">',b+'<div class="tbl">'); }
  const x=ax();
  h=h.replace('<div class="cname">',`<div class="cname"><span class="acb">✓ ${x.client}</span>`);
  const panel=panelHtml(c)+naBtn(c);
  const at=h.indexOf('<div><button class="btn" type="button" data-xadd');
  if(at>=0) return h.slice(0,at)+panel+h.slice(at);
  return h.replace('<div class="tbl">',panel+'<div class="tbl">');
};

const fmtD=t=>{try{return new Date(t).toLocaleDateString(L==='ar'?'ar-AE':'en-GB',{day:'numeric',month:'short'})}catch(e){return ''}};
const repChip=n=>`<span class="rp" style="background:${repColor(n)}1a;color:${repColor(n)}"><i style="background:${repColor(n)}"></i>${esc(n)}</span>`;
function panelHtml(c,msg,kind){
  const x=ax(),p=c.acct.p,k=ckey(c),open=OPEN&&OPEN.ci===c.i?OPEN.prod:null;
  const pills=PROD.filter(pr=>p[pr]).map(pr=>{const s=ST[k+'|'+pr];
    return `<button type="button" class="pi${open===pr?' on':''}" data-acst="${c.i}|${pr}"><b>${pr}</b>${repChip(p[pr])}${s?`<span class="si" title="${esc(x.st[s.v]||'')}">${ICON[s.v]||''}</span>`:'<span class="si none">●</span>'}</button>`}).join('');
  let ask='';
  if(open){const s=ST[k+'|'+open];let by='';try{by=localStorage.getItem('dby')||''}catch(e){}
    ask=`<div class="ask"><p>${esc(x.ask(open))}</p><div class="ch">${['selling','not','unknown'].map(v=>`<button type="button" data-acv="${v}"${s&&s.v===v?' class="on"':''}>${ICON[v]} ${x.st[v]}</button>`).join('')}</div>
      <input id="acBy" autocomplete="name" placeholder="${esc(x.by)} — ${esc(x.byPh)}" value="${esc(by)}">
      ${msg?`<div class="m ${kind||''}">${esc(msg)}</div>`:''}${s?`<div class="lst">${ICON[s.v]} ${esc(x.st[s.v])} · ${esc(x.last(s.b||'',fmtD(s.t)))}</div>`:''}</div>`}
  return `<div class="acp" data-acp="${c.i}"><h4>${x.panel}</h4><div class="pr">${pills}</div>${open?ask:`<div class="hint">${x.check}</div>`}`
    +(c.acct.o?`<div class="old">${x.old}: ${esc(c.acct.o)}</div>`:'')+(c.acOnly?`<div class="nt">${x.noTeam}</div>`:'')+`</div>`;
}
function redraw(ci,msg,kind){const el=document.querySelector(`[data-acp="${ci}"]`);if(el)el.outerHTML=panelHtml(C[ci],msg,kind)}
const QK='derma-queue',qAdd=d=>{try{const a=JSON.parse(localStorage.getItem(QK)||'[]');a.push(d);localStorage.setItem(QK,JSON.stringify(a))}catch(e){}};
async function send(d){if(navigator.onLine===false){qAdd(d);return}try{await fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(window.VSK?VSK.post(d):d)})}catch(e){qAdd(d)}}
document.addEventListener('click',e=>{
  const pb=e.target.closest('[data-acst]');
  if(pb){e.preventDefault();const [ci,pr]=pb.dataset.acst.split('|');OPEN=(OPEN&&OPEN.ci===+ci&&OPEN.prod===pr)?null:{ci:+ci,prod:pr};redraw(+ci);return}
  const vb=e.target.closest('[data-acv]');
  if(vb&&OPEN){e.preventDefault();const c=C[OPEN.ci],x=ax(),by=(document.getElementById('acBy')||{}).value||'';
    if(!by.trim()){redraw(c.i,x.needBy,'bad');setTimeout(()=>{const i=document.getElementById('acBy');i&&i.focus()},20);return}
    try{localStorage.setItem('dby',by.trim())}catch(err){}
    const k=ckey(c),v=vb.dataset.acv,pr=OPEN.prod;ST[k+'|'+pr]={v,b:by.trim(),t:Date.now()};saveST();
    send({type:'status',key:k,clinic:c.n,city:(T.en.city[c.ct]||c.ct),product:pr,value:v,by:by.trim(),id:'s'+Date.now().toString(36)});
    redraw(c.i,x.saved,'ok');setTimeout(()=>{if(OPEN&&OPEN.ci===c.i&&OPEN.prod===pr){OPEN=null;redraw(c.i)}},1400);}
},true);
async function loadStatus(){if(!API)return;try{const list=window.VSK?await VSK.json('a=acct'):await (await fetch(API+'?a=acct',{cache:'no-store'})).json();if(!Array.isArray(list))return;
  list.filter(i=>i.type==='status').sort((a,b)=>a.at-b.at).forEach(i=>{const kk=i.key+'|'+i.product,cur=ST[kk];if(!cur||cur.t<=i.at)ST[kk]={v:i.value,b:i.by,t:i.at}});
  saveST();
  let changed=false;const byK=new Map(C.map(c=>[ckey(c),c]));
  list.filter(i=>i.type==='account').forEach(i=>{const c=byK.get(i.key);if(!c||!i.product)return;
    if(!c.acct){c.acct={name:c.n,p:{},o:''};changed=true}
    if(c.acct.p[i.product]!==i.value){c.acct.p[i.product]=i.value;changed=true}});
  if(changed)render();else document.querySelectorAll('[data-acp]').forEach(el=>redraw(+el.dataset.acp));}catch(e){}}

// ---- new account (needs Rony's approval) ----
function naBtn(c){return `<div class="nab" data-nab="${c.i}"><button class="btn" type="button" data-naopen="${c.i}">${ax().newAcc}</button></div>`}
let NA=null;
function naForm(msg,kind){const c=C[NA.ci],x=ax();let by='';try{by=localStorage.getItem('dby')||''}catch(e){}
  return `<div class="acp naf" data-nab="${c.i}"><h4>${x.newT}</h4><p style="margin:0 0 8px;font-size:13px;color:var(--muted)">${x.which}</p>
   <div class="nag">${PROD.map(p=>`<label><b>${p}</b><select data-nap="${p}"><option value="">${x.none}</option>${REPS.map(r=>`<option${NA.r[p]===r?' selected':''}>${r}</option>`).join('')}</select></label>`).join('')}</div>
   <input id="naNote" placeholder="${esc(x.note)}" value="${esc(NA.note||'')}"><input id="naBy" autocomplete="name" placeholder="${esc(x.by)} — ${esc(x.byPh)}" value="${esc(by)}">
   ${msg?`<div class="m ${kind||''}" style="font-size:12px;margin-top:6px;color:${kind==='ok'?'var(--ok)':'var(--rose-ink)'}">${esc(msg)}</div>`:''}
   <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" type="button" data-naclose>${x.cancel}</button><button class="btn solid" type="button" data-nasend>${x.send}</button></div></div>`}
function naDraw(msg,kind){const el=document.querySelector(`[data-nab="${NA.ci}"]`);if(el)el.outerHTML=naForm(msg,kind)}
function naBack(ci){const el=document.querySelector(`[data-nab="${ci}"]`);if(el)el.outerHTML=naBtn(C[ci])}
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-naopen]');if(o){e.preventDefault();if(NA)naBack(NA.ci);NA={ci:+o.dataset.naopen,r:{},note:''};naDraw();return}
  if(!NA)return;
  if(e.target.closest('[data-naclose]')){e.preventDefault();const ci=NA.ci;NA=null;naBack(ci);return}
  if(e.target.closest('[data-nasend]')){e.preventDefault();const c=C[NA.ci],x=ax();
    document.querySelectorAll('[data-nap]').forEach(sl=>{if(sl.value)NA.r[sl.dataset.nap]=sl.value;else delete NA.r[sl.dataset.nap]});
    NA.note=(document.getElementById('naNote')||{}).value||'';const by=((document.getElementById('naBy')||{}).value||'').trim();
    if(!Object.keys(NA.r).length){naDraw(x.needP,'bad');return}
    if(!by){naDraw(x.needBy,'bad');return}
    try{localStorage.setItem('dby',by)}catch(err){}
    send({type:'account',key:ckey(c),clinic:c.n,city:(T.en.city[c.ct]||c.ct),reps:NA.r,note:NA.note,by,id:'a'+Date.now().toString(36)});
    naDraw(x.sentA,'ok');const ci=NA.ci;setTimeout(()=>{if(NA&&NA.ci===ci){NA=null;naBack(ci)}},2200)}
},true);
document.addEventListener('change',e=>{const sl=e.target.closest('[data-nap]');if(sl&&NA){if(sl.value)NA.r[sl.dataset.nap]=sl.value;else delete NA.r[sl.dataset.nap]}});

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

Promise.all([window.VSK?VSK.json('a=pf&f=accounts'):fetch('accounts.json',{cache:'no-cache'}).then(r=>r.json()),(window.VSK?VSK.json('a=pf&f=geo'):fetch('geo.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{})).catch(()=>({}))])
  .then(([d,g])=>{load(d);C.forEach(c=>{const p=c.acOnly&&g[ckey(c)];if(p&&Array.isArray(p)&&!p[3]){c.lo=p[0];c.la=p[1]}});render();loadStatus();}).catch(()=>{});
})();
