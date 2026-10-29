/* Embedded inside Value Shoots: hide the back link (the Value Shoots bar is already on top). */
(function(){ if(window.top===window.self) return; var st=document.createElement('style'); st.textContent='a[href="../"]{display:none!important}'; document.head.appendChild(st); })();
/* Derma Finder — team overlay for the GitHub copy.
   Reports (move a person / add a person) go to the Value Shoots Google Sheet; approved ones are applied for everyone.
   Self-contained: only relies on the page's data (C, D) and helpers (t, T, L, esc, norm, $, render, rebuildTeams, skWords, joinsOf, wordHit, qScore, isDoc, CITIES). */
(function(){
const API=window.DERMA_API||'';
if(!API) return;
const CITY_LIST=(typeof CITIES!=='undefined'?CITIES:Object.keys(T.en.city));
const ROLE_CODE=r=>{const m=/\(([A-Z]{1,2})\)\s*$/.exec(r||'');return m?m[1]:''};
const CITY_CODE=v=>{const m=/\(([a-z])\)\s*$/.exec(v||'');return m&&CITY_LIST.includes(m[1])?m[1]:''};
const TX={en:{add:'+ Add a person',addT:'Add a person to this clinic',name:'Full name',role:'Role',level:'Level',none:'—',lic:'Licence number (optional)',by:'Your name',byPh:'So we know who sent it',needName:'Write the full name.',needBy:'Write your name.',sent:'Sent ✓ It shows for everyone once Rony approves it.',err:'Could not send. Check the connection and try again.'},
 ar:{add:'+ إضافة شخص',addT:'إضافة شخص لهالعيادة',name:'الاسم الكامل',role:'الوظيفة',level:'الدرجة',none:'—',lic:'رقم الترخيص (اختياري)',by:'اسمك',byPh:'لنعرف مين بعت الطلب',needName:'اكتب الاسم الكامل.',needBy:'اكتب اسمك.',sent:'انبعت ✓ بيطلع للكل بعد ما يوافق روني.',err:'ما انبعت. تأكد من النت وجرّب مرة تانية.'}};
const tx=()=>TX[L]||TX.en, mx=()=>(t().mv||T.en.mv);
let BY='';try{BY=localStorage.getItem('dby')||''}catch(e){}
const saveBy=v=>{BY=v;try{localStorage.setItem('dby',v)}catch(e){}};
const QK='derma-queue',qGet=()=>{try{return JSON.parse(localStorage.getItem(QK)||'[]')}catch(e){return[]}},qSet=a=>{try{localStorage.setItem(QK,JSON.stringify(a))}catch(e){}};
async function send(d){await fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(window.VSK?VSK.post(d):d)})}
async function post(d){if(navigator.onLine===false){qSet(qGet().concat([d]));return}try{await send(d)}catch(e){qSet(qGet().concat([d]))}}
async function flushQ(){const a=qGet();if(!a.length||navigator.onLine===false)return;const left=[];for(const d of a){try{await send(d)}catch(e){left.push(d)}}qSet(left)}
window.addEventListener('online',flushQ);setTimeout(flushQ,3000);
const pKey=d=>{const c=C[d.c0];return [c.ct,d.s,d.l||String(d.n).toLowerCase(),c.n].join('|')};
function hashId(s){let h1=0x811c9dc5,h2=0;for(let i=0;i<s.length;i++){h1^=s.charCodeAt(i);h1=Math.imul(h1,16777619)>>>0;h2=(h2*31+s.charCodeAt(i))>>>0}return 'm'+h1.toString(36)+h2.toString(36)}
const roleLabel=s=>`${T.en.sp[s]} (${s})`, cityLabel=c=>`${T.en.city[c]} (${c})`;
const byField=()=>`<label class="fl" for="xBy">${tx().by}</label><input id="xBy" autocomplete="name" placeholder="${esc(tx().byPh)}" value="${esc(BY)}">`;
D.forEach((d,i)=>{if(d.i==null)d.i=i;if(d.c0==null)d.c0=d.c});

// overlay (dialog) shared by "move" and "add"
document.body.insertAdjacentHTML('beforeend','<div class="ov" id="xOv" hidden><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="xTitle"><div id="xBody"></div></div></div>');
const ov=$('xOv'), body=$('xBody');
let MV=null, AP=null;
const close=()=>{ov.hidden=true;MV=null;AP=null};
const msgBox=(m,k)=>m?`<div class="msg ${k||''}">${esc(m)}</div>`:'';

// ---- move ----
var mvSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>';
try{ moveBtn=function(d){return `<button class="web mvb" type="button" data-xmove="${d.i}" title="${esc(t().moveT||'Report a move')}" aria-label="${esc(t().moveT||'Report a move')}: ${esc(d.n)}">${mvSvg}</button>`} }catch(e){}
function matches(q){q=norm(q);if(!q)return[];const ws=q.split(' ');
  return C.filter(c=>c.n&&ws.every(w=>wordHit(c,w))).map(c=>[c,qScore(c,ws)]).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0])}
function drawMove(m,k){const x=mx(),d=MV.d,c=C[d.c],list=matches(MV.typed),cn=T[L].city;
  body.innerHTML=`<h2 id="xTitle">${x.title}</h2>
   <div class="who"><b>${isDoc(d)?'Dr. ':''}${esc(d.n)}</b> · ${esc(t().sp[d.s])}<br><span>${x.now}: ${esc(c.n)} (${esc(cn[c.ct])})</span></div>
   <label class="fl" for="xQ">${x.to}</label><input id="xQ" type="search" autocomplete="off" placeholder="${esc(x.search)}" value="${esc(MV.typed)}">
   <div class="picks">${list.map(k=>`<button type="button" class="pk${MV.pick===k.i?' on':''}" data-xpk="${k.i}"><b>${esc(k.n)}</b><span>${esc(cn[k.ct])}${k.ar?' · '+esc(k.ar):''}</span></button>`).join('')}
     ${MV.typed.trim().length>2?`<button type="button" class="pk new${MV.pick==='new'?' on':''}" data-xpk="new">${x.notIn} “${esc(MV.typed.trim())}”</button>`:''}</div>
   ${MV.pick==='new'?`<label class="fl" for="xCity">${x.city}</label><select id="xCity">${CITY_LIST.map(k=>`<option value="${k}"${MV.city===k?' selected':''}>${cn[k]}</option>`).join('')}</select>`:''}
   <label class="fl" for="xNote">${x.note}</label><textarea id="xNote" rows="2">${esc(MV.note||'')}</textarea>
   ${byField()}${msgBox(m,k)}
   <div class="acts"><button type="button" class="btn" data-xclose>${x.cancel}</button><button type="button" class="btn solid" id="xSendMove">${x.send}</button></div>`}
const keepMv=()=>{MV.note=($('xNote')||{}).value||'';const b=$('xBy');if(b)BY=b.value};
async function sendMove(){const x=mx();keepMv();const by=BY.trim();
  if(MV.pick===null){drawMove(x.pick,'bad');return}
  const d=MV.d,cur=C[d.c];let toName,toCity,isNew=false;
  if(MV.pick==='new'){toName=MV.typed.trim();toCity=($('xCity')||{}).value||MV.city;isNew=true}else{const k=C[MV.pick];toName=k.n;toCity=k.ct}
  if(toName===cur.n&&toCity===cur.ct){drawMove(x.same,'bad');return}
  if(!by){drawMove(tx().needBy,'bad');return}saveBy(by);
  $('xSendMove').disabled=true;
  try{await post({type:'move',id:hashId(pKey(d)+'>'+toName+'@'+Date.now()),key:pKey(d),name:d.n,role:roleLabel(d.s),level:d.lv?(T.en.lv[d.lv]||d.lv):'',licence:d.l||'',city:cityLabel(toCity),from:cur.n,to:toName,newClinic:isNew,note:MV.note,by});
    drawMove(tx().sent,'ok');setTimeout(()=>{if(MV)close()},1800)}catch(e){drawMove(tx().err,'bad')}}

// ---- add ----
const _card=clinicCard;
clinicCard=function(c,q,open){return _card(c,q,open).replace('<div class="tbl">',`<div><button class="btn" type="button" data-xadd="${c.i}">${tx().add}</button></div><div class="tbl">`)};
function drawAdd(m,k){const c=C[AP.c],x=tx(),sp=t().sp,lv=t().lv;
  body.innerHTML=`<h2 id="xTitle">${x.addT}</h2><div class="who"><b>${esc(c.n)}</b><br><span>${esc(T[L].city[c.ct])}${c.ar?' · '+esc(c.ar):''}</span></div>
   <label class="fl" for="apN">${x.name}</label><input id="apN" autocomplete="off" dir="ltr" value="${esc(AP.n)}">
   <label class="fl" for="apS">${x.role}</label><select id="apS">${['D','P','G','T','L','N'].map(k=>`<option value="${k}"${AP.s===k?' selected':''}>${esc(sp[k])}</option>`).join('')}</select>
   <label class="fl" for="apV">${x.level}</label><select id="apV"><option value="">${x.none}</option>${['S','C'].map(k=>`<option value="${k}"${AP.lv===k?' selected':''}>${esc(lv[k])}</option>`).join('')}</select>
   <label class="fl" for="apL">${x.lic}</label><input id="apL" autocomplete="off" dir="ltr" value="${esc(AP.l)}">
   <label class="fl" for="apNote">${mx().note}</label><textarea id="apNote" rows="2">${esc(AP.note)}</textarea>
   ${byField()}${msgBox(m,k)}
   <div class="acts"><button type="button" class="btn" data-xclose>${mx().cancel}</button><button type="button" class="btn solid" id="xSendAdd">${mx().send}</button></div>`}
async function sendAdd(){AP.n=$('apN').value.trim();AP.s=$('apS').value;AP.lv=$('apV').value;AP.l=$('apL').value.trim();AP.note=$('apNote').value;const by=$('xBy').value.trim();
  const x=tx(),c=C[AP.c];if(AP.n.length<3){drawAdd(x.needName,'bad');return}if(!by){drawAdd(x.needBy,'bad');return}saveBy(by);
  $('xSendAdd').disabled=true;
  try{await post({type:'add',id:hashId('add>'+AP.n+'@'+c.n+'@'+Date.now()),name:AP.n,role:roleLabel(AP.s),level:AP.lv?T.en.lv[AP.lv]:'',licence:AP.l,city:cityLabel(c.ct),from:'',to:c.n,note:AP.note,by});
    drawAdd(x.sent,'ok');setTimeout(()=>{if(AP)close()},1800)}catch(e){drawAdd(x.err,'bad')}}

// ---- events ----
document.addEventListener('click',e=>{
  const mb=e.target.closest('[data-xmove]');if(mb){e.preventDefault();e.stopPropagation();const d=D[+mb.dataset.xmove];AP=null;MV={d,pick:null,typed:'',city:C[d.c].ct,note:''};drawMove();ov.hidden=false;setTimeout(()=>{const i=$('xQ');i&&i.focus()},30);return}
  const ab=e.target.closest('[data-xadd]');if(ab){e.preventDefault();MV=null;AP={c:+ab.dataset.xadd,n:'',s:'D',lv:'',l:'',note:''};drawAdd();ov.hidden=false;setTimeout(()=>{const i=$('apN');i&&i.focus()},30);return}
},true);
ov.addEventListener('click',e=>{
  if(e.target===ov||e.target.closest('[data-xclose]')){close();return}
  const p=e.target.closest('[data-xpk]');if(p&&MV){keepMv();MV.pick=p.dataset.xpk==='new'?'new':+p.dataset.xpk;drawMove();return}
  if(e.target.closest('#xSendMove'))sendMove();
  if(e.target.closest('#xSendAdd'))sendAdd()});
ov.addEventListener('input',e=>{if(e.target.id==='xQ'&&MV){keepMv();MV.typed=e.target.value;if(MV.pick==='new')MV.pick=null;const pos=e.target.selectionStart;drawMove();const i=$('xQ');i.focus();i.setSelectionRange(pos,pos)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)close()});

// ---- apply what Rony approved ----
function applyMoves(list){
  D.forEach(d=>{d.c=d.c0;delete d.mv});
  for(const m of list){const d=D.find(x=>pKey(x)===m.key);if(!d)continue;
    let c=C.find(k=>k.ct===m.toCity&&k.n===m.toName);
    if(!c){c={n:m.toName,t:'c',ct:m.toCity,docs:[],nw:1,i:C.length};C.push(c);c.k=norm(c.n);c.aw=[];c.rw=[];c.sw=skWords(c.n,c.rw);c.sj=joinsOf(c.sw);c.lw=norm(c.n).split(' ')}
    d.c=c.i;d.mv=m.at||1}
}
render();
(async()=>{try{
  const list=window.VSK?await VSK.json('a=dreq'):await (await fetch(API,{cache:'no-store'})).json();if(!Array.isArray(list)||!list.length)return;
  const seen=new Set(D.map(d=>(d.n+'|'+C[d.c0].n).toLowerCase()));
  list.filter(i=>i.type==='add').forEach(i=>{const ct=CITY_CODE(i.city)||'d',s=ROLE_CODE(i.role)||'D';
    const c=C.find(k=>k.ct===ct&&k.n===i.to);if(!c||!i.name)return;
    const key=(String(i.name)+'|'+c.n).toLowerCase();if(seen.has(key))return;seen.add(key);
    const lv=i.level==='Consultant'?'C':i.level==='Specialist'?'S':'';
    const d={n:String(i.name).replace(/^dr\.?\s+/i,''),s,lv,l:String(i.licence||''),c:c.i,c0:c.i,i:D.length,added:1};
    d.k=norm(d.n+' '+d.l);d.aw=[];d.rw=[];d.sw=skWords(d.n,d.rw);d.sj=joinsOf(d.sw);d.lw=norm(d.n).split(' ');D.push(d)});
  applyMoves(list.filter(i=>i.type==='move'&&i.key).map(i=>({key:i.key,toName:i.to,toCity:CITY_CODE(i.city)||'d',at:i.at})));
  rebuildTeams();render();
}catch(e){}})();
})();
