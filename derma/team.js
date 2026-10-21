/* Derma Finder — team overlay for the GitHub copy: reports go to the Value Shoots Google Sheet */
(function(){
const API=window.DERMA_API||'';
if(!API) return;
const ROLE_CODE=r=>{const m=/\(([A-Z]{1,2})\)\s*$/.exec(r||'');return m?m[1]:''};
const CITY_CODE=v=>{const m=/\(([dan])\)\s*$/.exec(v||'');return m?m[1]:''};
const TX={en:{add:'+ Add a person',addT:'Add a person to this clinic',name:'Full name',role:'Role',level:'Level',none:'—',lic:'Licence number (optional)',by:'Your name',byPh:'So we know who sent it',needName:'Write the full name.',needBy:'Write your name.',sent:'Sent ✓ It shows for everyone once Rony approves it.',err:'Could not send. Check the connection and try again.',added:'Added'},
 ar:{add:'+ إضافة شخص',addT:'إضافة شخص لهالعيادة',name:'الاسم الكامل',role:'الوظيفة',level:'الدرجة',none:'—',lic:'رقم الترخيص (اختياري)',by:'اسمك',byPh:'لنعرف مين بعت الطلب',needName:'اكتب الاسم الكامل.',needBy:'اكتب اسمك.',sent:'انبعت ✓ بيطلع للكل بعد ما يوافق روني.',err:'ما انبعت. تأكد من النت وجرّب مرة تانية.',added:'مضاف'}};
const tx=()=>TX[L]||TX.en;
let BY='';try{BY=localStorage.getItem('dby')||''}catch(e){}
const saveBy=v=>{BY=v;try{localStorage.setItem('dby',v)}catch(e){}};
async function post(d){await fetch(API,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(d)})}
const byField=()=>`<label class="fl" for="xBy">${tx().by}</label><input id="xBy" autocomplete="name" placeholder="${esc(tx().byPh)}" value="${esc(BY)}">`;
const roleLabel=s=>`${T.en.sp[s]} (${s})`, cityLabel=c=>`${T.en.city[c]} (${c})`;

// 1) "Report a move" works for everyone and goes to the sheet
moveBtn=function(d){return `<button class="web mvb" type="button" data-move="${d.i}" title="${esc(t().moveT)}" aria-label="${esc(t().moveT)}: ${esc(d.n)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg></button>`};
const _drawMove=drawMove;
drawMove=function(msg,kind){const keep=$('xBy')?$('xBy').value:BY;_drawMove(msg,kind);const n=$('mvNote');if(n&&!$('xBy')){n.insertAdjacentHTML('afterend',byField());$('xBy').value=keep}};
sendMove=async function(){const x=t().mv;MV.note=($('mvNote')||{}).value||'';const by=(($('xBy')||{}).value||'').trim();
  if(MV.pick===null){drawMove(x.pick,'bad');return}
  const d=MV.d,cur=C[d.c];let toName,toCity,isNew=false;
  if(MV.pick==='new'){toName=MV.typed.trim();toCity=($('mvCity')||{}).value||MV.city;isNew=true}else{const k=C[MV.pick];toName=k.n;toCity=k.ct}
  if(toName===cur.n&&toCity===cur.ct){drawMove(x.same,'bad');return}
  if(!by){drawMove(tx().needBy,'bad');return}saveBy(by);
  const b=$('mvSend');if(b)b.disabled=true;
  try{await post({type:'move',id:hashId(pKey(d)+'>'+toName+'@'+Date.now()),key:pKey(d),name:d.n,role:roleLabel(d.s),level:d.lv?T.en.lv[d.lv]||d.lv:'',licence:d.l||'',city:cityLabel(toCity),from:cur.n,to:toName,newClinic:isNew,note:MV.note,by});
    drawMove(tx().sent,'ok');setTimeout(()=>{if(MV)closeMove()},1800)}
  catch(e){drawMove(tx().err,'bad')}};

// 2) "Add a person" on every clinic
const _card=clinicCard;
clinicCard=function(c,q,open){return _card(c,q,open).replace('<div class="tbl">',`<div><button class="btn" type="button" data-addp="${c.i}">${tx().add}</button></div><div class="tbl">`)};
let AP=null;
function drawAdd(msg,kind){const c=C[AP.c],x=tx(),sp=t().sp,lv=t().lv;
  $('mvBody').innerHTML=`<h2 id="mvTitle">${x.addT}</h2><div class="who"><b>${esc(c.n)}</b><br><span>${esc(T[L].city[c.ct])}${c.ar?' · '+esc(c.ar):''}</span></div>
   <label class="fl" for="apN">${x.name}</label><input id="apN" autocomplete="off" dir="ltr" value="${esc(AP.n)}">
   <label class="fl" for="apS">${x.role}</label><select id="apS">${['D','P','G','T','L','N'].map(k=>`<option value="${k}"${AP.s===k?' selected':''}>${esc(sp[k])}</option>`).join('')}</select>
   <label class="fl" for="apV">${x.level}</label><select id="apV"><option value="">${x.none}</option>${['S','C'].map(k=>`<option value="${k}"${AP.lv===k?' selected':''}>${esc(lv[k])}</option>`).join('')}</select>
   <label class="fl" for="apL">${x.lic}</label><input id="apL" autocomplete="off" dir="ltr" value="${esc(AP.l)}">
   <label class="fl" for="apNote">${t().mv.note}</label><textarea id="apNote" rows="2">${esc(AP.note)}</textarea>
   ${byField()}
   ${msg?`<div class="msg ${kind||''}">${esc(msg)}</div>`:''}
   <div class="acts"><button type="button" class="btn" id="apCancel">${t().mv.cancel}</button><button type="button" class="btn solid" id="apSend">${t().mv.send}</button></div>`}
function readAdd(){AP.n=$('apN').value.trim();AP.s=$('apS').value;AP.lv=$('apV').value;AP.l=$('apL').value.trim();AP.note=$('apNote').value;AP.by=$('xBy').value.trim()}
async function sendAdd(){readAdd();const x=tx(),c=C[AP.c];
  if(AP.n.length<3){drawAdd(x.needName,'bad');return}if(!AP.by){drawAdd(x.needBy,'bad');return}saveBy(AP.by);
  $('apSend').disabled=true;
  try{await post({type:'add',id:hashId('add>'+AP.n+'@'+c.n+'@'+Date.now()),name:AP.n,role:roleLabel(AP.s),level:AP.lv?T.en.lv[AP.lv]:'',licence:AP.l,city:cityLabel(c.ct),from:'',to:c.n,note:AP.note,by:AP.by});
    drawAdd(x.sent,'ok');setTimeout(()=>{if(AP){$('mvOv').hidden=true;AP=null}},1800)}catch(e){drawAdd(x.err,'bad')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-addp]');if(b){e.preventDefault();AP={c:+b.dataset.addp,n:'',s:'D',lv:'',l:'',note:''};MV=null;drawAdd();$('mvOv').hidden=false;setTimeout(()=>{const i=$('apN');i&&i.focus()},30);return}
  if(!AP)return;
  if(e.target.closest('#apCancel')||e.target===$('mvOv')){$('mvOv').hidden=true;AP=null;return}
  if(e.target.closest('#apSend'))sendAdd()},true);

// 3) Load what Rony approved and apply it for everyone
(async()=>{try{
  const r=await fetch(API,{cache:'no-store'});const list=await r.json();if(!Array.isArray(list)||!list.length)return;
  const seen=new Set(D.map(d=>(d.n+'|'+C[d.c0].n).toLowerCase()));
  list.filter(i=>i.type==='add').forEach(i=>{const ct=CITY_CODE(i.city)||'d',s=ROLE_CODE(i.role)||'D';
    const c=C.find(k=>k.ct===ct&&k.n===i.to);if(!c||!i.name)return;
    if(seen.has((i.name+'|'+c.n).toLowerCase()))return;seen.add((i.name+'|'+c.n).toLowerCase());
    const lv=i.level==='Consultant'?'C':i.level==='Specialist'?'S':'';
    const d={n:String(i.name).replace(/^dr\.?\s+/i,''),s,lv,l:String(i.licence||''),c:c.i,c0:c.i,i:D.length,added:1};
    d.k=norm(d.n+' '+d.l);d.aw=[];d.rw=[];d.sw=skWords(d.n,d.rw);d.sj=joinsOf(d.sw);d.lw=norm(d.n).split(' ');D.push(d)});
  const moves=list.filter(i=>i.type==='move'&&i.key).map(i=>({key:i.key,name:i.name,toName:i.to,toCity:CITY_CODE(i.city)||'d',at:i.at}));
  if(moves.length)applyMoves(moves);else{rebuildTeams();render()}
}catch(e){}})();
})();
