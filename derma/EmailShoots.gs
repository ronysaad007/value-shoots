// 📨 Shoot requests by email → sheet + calendar, waiting for Dr Alaa / Dr Yasir's approval.
// The work inbox (rony@value-aesthetic.com) forwards the team's shoot requests and the managers' replies to this Gmail.
// Every 5 minutes: a new request is added as "Awaiting approval" (grey ⏳ event in the calendar);
// a clear yes from a manager in the same email thread turns it into "Scheduled"; a clear no cancels it;
// anything unclear stays waiting and is flagged in the "📨 Email requests" tab for Rony.
// Forwarded Value mail never stays in the personal inbox: it is marked read, archived under the label "Value requests"
// and moved to the trash after 30 days.
// Run setupEmailShoots() once from the editor to start it.
const ES_TAB = '📨 Email requests';
const ES_HEAD = ['Received', 'From', 'Subject', 'Shoot ID', 'Clinic', 'Shoot date', 'State', 'Approved by', 'Calendar event', 'Thread', 'Note'];
const ES_MANAGERS = ['alaa@value-aesthetic.com', 'yasir@value-aesthetic.com'];
const ES_DOMAIN = 'value-aesthetic.com';
const ES_WAIT = 'Awaiting approval';
const ES_MINUTES = 120;
const ES_LABEL = 'Value requests';
let today = new Date();

function setupEmailShoots() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'checkShootEmails').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkShootEmails').timeBased().everyMinutes(5).create();
  esSheet(); checkShootEmails();
}
function esSheet() {
  const ss = SpreadsheetApp.getActive(); let sh = ss.getSheetByName(ES_TAB);
  if (!sh) { sh = ss.insertSheet(ES_TAB); sh.appendRow(ES_HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, ES_HEAD.length).setFontWeight('bold'); }
  return sh;
}
const esAddr = s => { const m = /<([^>]+)>/.exec(s || ''); return String(m ? m[1] : s || '').trim().toLowerCase(); };
const esName = s => String(s || '').replace(/<[^>]*>/, '').replace(/"/g, '').trim();
// the reply itself, without the quoted earlier messages
function esReplyText(msg) {
  let t = msg.getPlainBody() || '';
  const cut = t.search(/\n\s*(On .{5,200}wrote:|في .{5,200}كتب:|-{2,}\s*Original Message|From:\s|________________)/i);
  if (cut > 0) t = t.slice(0, cut);
  return t.split('\n').filter(l => !/^\s*>/.test(l)).join('\n').trim();
}
// clear yes / clear no / unclear (Arabic words have no \b, so they are matched between spaces)
const esAr = w => '(^|[\\s.,!،؟?])(' + w + ')(?=$|[\\s.,!،؟?])';
const ES_YES_PHRASE = new RegExp('no problem|no issue|no worries|ما في مشكلة|مافي مشكلة|ما في مانع|مافي مانع|لا مانع|ما عندي مانع', 'g');
const ES_YES = new RegExp('\\b(approved?|ok(ay)?|go ahead|confirm(ed)?|yes|sure|fine|agreed?|proceed|go for it|alright|perfect)\\b|' + esAr('موافق|موافقة|موافقين|تمام|ماشي|اوك|أوك|اوكي|أوكي|نعم|اكيد|أكيد|اي|إي|ايه|إيه|ايوه|أيوه|يلا|توكل|توكلوا|ممتاز|منيح|خلص|معتمد|اعتماد') + '|' + ES_YES_PHRASE.source, 'i');
const ES_NO = new RegExp("not approved|\\breject|\\bdeclin|\\bcancel|\\bpostpone|\\breschedul|\\bnot (now|possible|ok)|\\bdon'?t\\b|\\bdo not\\b|\\bno\\b|" + esAr('لا|لاء|مش موافق|غير موافق|مو موافق|ما بوافق|ما في|مافي|بلاش|ألغي|الغي|ألغوا|الغوا|أجّل|أجل|اجل|أجلوا|اجلوا|مرفوض'), 'i');
// "yes, but…" (another time, another day) is left for Rony to read
const ES_COND = new RegExp('\\b(but|change|another (day|time|date)|other (day|time|date)|instead|move it|if )\\b|' + esAr('بس|لكن|غيّر|غير الوقت|غيروا|بدّل|بدل|يوم تاني|وقت تاني|بشرط|اذا|إذا'), 'i');
function esDecision(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
  const yes = ES_YES.test(t), no = ES_NO.test(t.replace(ES_YES_PHRASE, ' '));
  if (yes && ES_COND.test(t)) return 'unclear';
  return yes && !no ? 'yes' : no && !yes ? 'no' : 'unclear';
}

function checkShootEmails() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return;
  try {
    today = new Date();
    const log = esSheet(), props = PropertiesService.getScriptProperties();
    const seen = JSON.parse(props.getProperty('ES_SEEN') || '{}');
    const label = GmailApp.getUserLabelByName(ES_LABEL) || GmailApp.createLabel(ES_LABEL);
    const threads = GmailApp.search('from:' + ES_DOMAIN + ' newer_than:21d', 0, 60);
    threads.forEach(th => {
      const tid = th.getId();
      // keep the personal inbox clean: forwarded Value mail goes straight to its own label, read and archived
      if (th.isInInbox() || th.isUnread()) { th.addLabel(label); th.markRead(); th.moveToArchive(); }
      th.getMessages().forEach(msg => {
        const mid = msg.getId(); if (seen[mid]) return; seen[mid] = Date.now();
        const from = esAddr(msg.getFrom());
        if (!from.endsWith('@' + ES_DOMAIN)) return;
        const row = esFindThread(log, tid);
        if (ES_MANAGERS.indexOf(from) >= 0 && row) { esReply(log, row, msg, from); return; }
        if (!row) esRequest(log, msg, tid);
      });
    });
    GmailApp.search('label:' + ES_LABEL.replace(/\s+/g, '-') + ' older_than:30d', 0, 50).forEach(th => th.moveToTrash()); // auto-clean after a month
    const cutoff = Date.now() - 30 * 864e5; Object.keys(seen).forEach(k => { if (seen[k] < cutoff) delete seen[k]; });
    props.setProperty('ES_SEEN', JSON.stringify(seen));
  } finally { lock.releaseLock(); }
}
function esFindThread(log, tid) {
  const v = log.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][9]) === tid) return i + 1;
  return 0;
}

// a new request: read it like the WhatsApp message on the admin page
function esRequest(log, msg, tid) {
  let body = (msg.getPlainBody() || '').slice(0, 6000);
  const sig = body.search(/\n\s*(thanks|thank you|regards|best regards|kind regards|warm regards|شكرا|شكراً|مع التحية|تحياتي)\b/i); if (sig > 0) body = body.slice(0, sig);
  const f = waFields(body);
  if (!f.clinic && !f.date) return; // not a shoot request
  const D = f.date ? waDate(f.date) : null;
  const base = [msg.getDate(), esName(msg.getFrom()), msg.getSubject(), '', f.clinic || '', D && D.date ? D.date : '', '', '', '', tid, ''];
  if (!f.clinic || !D || !D.date) { base[6] = '⚠ Check by hand'; base[10] = 'Could not read the clinic or the date'; log.appendRow(base); return; }
  const ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName('📋 Value Shoots');
  const vals = sh.getRange(1, 1, sh.getLastRow(), 14).getValues();
  const clinics = vals.slice(1).map(r => String(r[7] || '').trim()).filter(Boolean);
  const nm = s => String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');
  const clinic = clinics.find(c => nm(c) === nm(f.clinic)) || f.clinic.trim();
  const day = Utilities.formatDate(D.date, 'Asia/Dubai', 'yyyy-MM-dd');
  const dup = vals.slice(1).find(r => r[1] instanceof Date && Utilities.formatDate(r[1], 'Asia/Dubai', 'yyyy-MM-dd') === day && nm(r[7]) === nm(clinic));
  if (dup) { base[3] = dup[0]; base[4] = clinic; base[6] = 'Already in the sheet'; log.appendRow(base); return; }
  // rep = the sender, matched to the names already used in the sheet
  const reps = [...new Set(vals.slice(1).map(r => String(r[6] || '').trim()).filter(Boolean))];
  const first = nm(esName(msg.getFrom()).split(/\s+/)[0]);
  const rep = (f.rep && (reps.find(r => nm(r) === nm(f.rep)) || f.rep)) || reps.find(r => nm(r.split(/\s+/)[0]) === first) || esName(msg.getFrom());
  const em = esEm(f.em), prod = esProd(f.prod), time = f.time ? waTime(f.time) : '';
  // next VA id
  const nums = vals.slice(-15).map(r => { const m = /^VA\.?(\d+)$/i.exec(String(r[0]).trim()); return m ? +m[1] : 0; });
  const id = 'VA' + String(Math.max(0, ...nums) + 1).padStart(3, '0');
  let last = vals.length; while (last > 1 && !vals[last - 1].some(x => String(x).trim())) last--;
  const r = last + 1, txt = x => { x = String(x || ''); return /^[=+\-@]/.test(x) ? "'" + x : x; };
  sh.getRange(r, 1, 1, 2).setValues([[id, D.date]]);
  if (time) { const [h, mi] = time.split(':').map(Number); sh.getRange(r, 5).setFormula('=TIME(' + h + ',' + mi + ',0)'); }
  sh.getRange(r, 6, 1, 6).setValues([[ES_WAIT, txt(rep), txt(clinic), txt(prod), txt(f.doc), txt(em)]]);
  // Day, Duration, Maps link and CODE: same formulas as the row above
  [3, 4, 12, 13].forEach(c => sh.getRange(r - 1, c).copyTo(sh.getRange(r, c), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false));
  esAllowStatus(sh, r);
  // calendar: grey, ⏳ in the title
  let evId = '';
  try {
    const cal = CalendarApp.getDefaultCalendar(), title = '⏳ ' + [clinic, rep, em].filter(Boolean).join(' - ');
    const desc = ['Awaiting approval (Dr Alaa / Dr Yasir)', prod && 'Product: ' + prod, f.doc && 'Doctor/Therapist: ' + f.doc, f.model && 'Model: ' + f.model, 'ID: ' + id].filter(Boolean).join('\n');
    const loc = (clinic + ' ' + em + ' Clinic').replace(/\s+/g, ' ').trim();
    let ev;
    if (time) { const [h, mi] = time.split(':').map(Number); const st = new Date(D.date); st.setHours(h, mi, 0, 0); ev = cal.createEvent(title, st, new Date(st.getTime() + ES_MINUTES * 6e4), { description: desc, location: loc }); }
    else ev = cal.createAllDayEvent(title, D.date, { description: desc, location: loc });
    ev.setColor(CalendarApp.EventColor.GRAY); evId = ev.getId();
  } catch (err) { base[10] = 'Calendar: ' + err; }
  base[3] = id; base[4] = clinic; base[6] = '⏳ Awaiting approval'; base[8] = evId;
  log.appendRow(base);
}
function esReply(log, row, msg, from) {
  const cur = log.getRange(row, 1, 1, ES_HEAD.length).getValues()[0];
  if (!/Awaiting|Check reply/.test(String(cur[6]))) return;
  const d = esDecision(esReplyText(msg)), who = from.indexOf('alaa') === 0 ? 'Dr Alaa' : 'Dr Yasir';
  if (d === 'unclear') { log.getRange(row, 7).setValue('❓ Check reply'); log.getRange(row, 11).setValue('Reply from ' + who + ' is not a clear yes or no'); return; }
  const status = d === 'yes' ? 'Scheduled' : 'Canceled';
  const sh = SpreadsheetApp.getActive().getSheetByName('📋 Value Shoots'), ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  const i = ids.findIndex(x => String(x[0]).trim() === String(cur[3]).trim());
  if (i > 0) sh.getRange(i + 1, 6).setValue(status);
  try {
    const ev = cur[8] && CalendarApp.getDefaultCalendar().getEventById(cur[8]);
    if (ev) {
      if (d === 'yes') { ev.setTitle(String(ev.getTitle()).replace(/^⏳\s*/, '')); ev.setDescription(String(ev.getDescription()).replace(/^Awaiting approval.*\n?/, 'Approved by ' + who + '\n')); ev.setColor(CalendarApp.EventColor.PALE_BLUE); }
      else { ev.setTitle('✕ ' + String(ev.getTitle()).replace(/^⏳\s*/, '')); ev.setColor(CalendarApp.EventColor.RED); }
    }
  } catch (err) {}
  log.getRange(row, 7, 1, 2).setValues([[d === 'yes' ? '✓ Approved' : '✕ Declined', who]]);
  log.getRange(row, 11).setValue('');
}
// the Status column's dropdown: make sure "Awaiting approval" is one of its options
function esAllowStatus(sh, r) {
  try {
    const rule = sh.getRange(r, 6).getDataValidation() || sh.getRange(r - 1, 6).getDataValidation(); if (!rule) return;
    if (rule.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return;
    const list = rule.getCriteriaValues()[0]; if (list.indexOf(ES_WAIT) >= 0) { sh.getRange(r, 6).setDataValidation(rule); return; }
    const nr = rule.copy().requireValueInList(list.concat([ES_WAIT]), rule.getCriteriaValues()[1]).build();
    sh.getRange(2, 6, sh.getMaxRows() - 1, 1).setDataValidation(nr);
  } catch (err) {}
}
function esEm(x) { if (!x) return ''; const e = EM_KEYS.find(([, r]) => r.test(x)); return e ? e[0] : x; }
function esProd(x) {
  if (!x) return '';
  return x.split(/\s*(?:\+|\/|&|،|,|\band\b|\bو\b)\s*/i).map(p => p.trim()).filter(Boolean).map(p => {
    const c = PROD_CANON.find(([r]) => r.test(p)); if (!c) return p; const extra = p.replace(c[0], '').replace(/\s+/g, ' ').trim();
    return extra && !/^(and|\d+)$/i.test(extra) ? c[1] + ' ' + extra : c[1];
  }).join(' + ');
}

// --- the WhatsApp-message reader from the admin page (same rules) ---
const WA_KEYS=[
  ["clinic",["clinic name","clinic","العيادة","اسم العيادة","عيادة","المركز"]],
  ["doc",["doctor name","doctor","dr name","dr","dr.","doc","therapist","injector","الدكتور","الدكتورة","الطبيب","الطبيبة","دكتور","دكتورة"]],
  ["rep",["medical representative","medical rep","representative","rep","المندوب","المندوبة","مندوب","مندوبة"]],
  ["em",["location","emirate","emirates","city","area","الموقع","المكان","الامارة","الإمارة","المنطقة","المدينة"]],
  ["prod",["products","product","treatment","treatments","المنتجات","المنتج","العلاج"]],
  ["date",["date","day","التاريخ","اليوم"]],
  ["time",["time","الوقت","الساعة","الساعه"]],
  ["model",["model","models","المودل","الموديل","المودل/ز"]]];
function waFields(txt){
  txt=String(txt).replace(/[*_~]/g,"").replace(/[‎‏‪-‮]/g,"").replace(/\r/g,"");
  const alts=[]; WA_KEYS.forEach(([k,ls])=>ls.forEach(l=>alts.push([k,l])));
  alts.sort((a,b)=>b[1].length-a[1].length);
  const re=new RegExp("(^|[\\s\\n•\\-–|،,])("+alts.map(a=>a[1].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")\\s*[:：\\-–=]\\s*","gi");
  const hits=[]; let m; while((m=re.exec(txt))){ const lab=m[2].toLowerCase(); const k=(alts.find(a=>a[1].toLowerCase()===lab)||[])[0]; hits.push({k,start:m.index+m[1].length,vs:re.lastIndex}); }
  const out={};
  hits.forEach((h,i)=>{ const end=i+1<hits.length?hits[i+1].start:txt.length; const v=txt.slice(h.vs,end).replace(/\s+/g," ").replace(/^[\s,،.\-–]+|[\s,،.\-–]+$/g,"").replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu,"").trim(); if(v&&!out[h.k]) out[h.k]=v; });
  return out;
}
const WD={sunday:0,sun:0,monday:1,mon:1,tuesday:2,tue:2,tues:2,wednesday:3,wed:3,thursday:4,thu:4,thurs:4,friday:5,fri:5,saturday:6,sat:6,"الأحد":0,"الاحد":0,"الإثنين":1,"الاثنين":1,"الثلاثاء":2,"الأربعاء":3,"الاربعاء":3,"الخميس":4,"الجمعة":5,"الجمعه":5,"السبت":6};
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12,"يناير":1,"كانون الثاني":1,"فبراير":2,"شباط":2,"مارس":3,"آذار":3,"أبريل":4,"ابريل":4,"نيسان":4,"مايو":5,"أيار":5,"ايار":5,"يونيو":6,"حزيران":6,"يوليو":7,"تموز":7,"أغسطس":8,"اغسطس":8,"آب":8,"اب":8,"سبتمبر":9,"أيلول":9,"ايلول":9,"أكتوبر":10,"اكتوبر":10,"تشرين الأول":10,"تشرين الاول":10,"نوفمبر":11,"تشرين الثاني":11,"ديسمبر":12,"كانون الأول":12,"كانون الاول":12};
const arNum=s=>String(s||"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d));
function waDate(s){
  s=arNum(s).toLowerCase(); let d,mo,y,wd=null;
  for(const k of Object.keys(WD).sort((a,b)=>b.length-a.length)){ if(new RegExp("(^|[^a-z؀-ۿ])"+k+"($|[^a-z؀-ۿ])").test(s)){ wd=WD[k]; break; } }
  let m=/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/.exec(s);
  if(m){ d=+m[1]; mo=+m[2]; y=m[3]?+m[3]:null; if(mo>12&&d<=12){ const x=d; d=mo; mo=x; } }
  else { for(const k of Object.keys(MON).sort((a,b)=>b.length-a.length)){ const i=s.indexOf(k); if(i<0) continue; mo=MON[k]; const n=/(\d{1,2})(?:st|nd|rd|th)?/.exec(s.slice(Math.max(0,i-6),i))||/(\d{1,2})(?:st|nd|rd|th)?/.exec(s.slice(i)); if(n) d=+n[1]; const yy=/(20\d{2})/.exec(s); if(yy) y=+yy[1]; break; } }
  if(!d||!mo) return wd!=null?{wd}:null;
  if(y&&y<100) y+=2000;
  if(!y){ y=today.getFullYear(); if(new Date(y,mo-1,d)<new Date(today.getFullYear(),today.getMonth(),today.getDate()-14)) y++; }
  const dt=new Date(y,mo-1,d); if(dt.getMonth()!==mo-1) return null;
  return {date:dt,wd};
}
function waTime(s){
  s=arNum(s).toLowerCase().replace(/\s+/g," ");
  const m=/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?|ص|م|صباحا|صباحاً|مساء|مساءً|الظهر|ظهرا|ظهراً|بعد الظهر|العصر|عصرا)?/.exec(s); if(!m) return "";
  let h=+m[1], mi=m[2]?+m[2]:0; const ap=m[3]||"";
  if(h>23||mi>59) return "";
  if(/p|م|مساء|عصر|ظهر/.test(ap)&&h<12) h+=12; if(/^(am|a\.m)|ص/.test(ap)&&h===12) h=0;
  if(!ap&&h>=1&&h<=7) h+=12; // shoots don't run 1–7 am
  return String(h).padStart(2,"0")+":"+String(mi).padStart(2,"0");
}
const EM_KEYS=[["Abu Dhabi",/abu\s*dhabi|abudhabi|أبو ?ظبي|ابو ?ظبي/i],["Al Ain",/al\s*ain|alain|العين/i],["Sharjah",/sharjah|الشارقة|الشارقه/i],["Ajman",/ajman|عجمان/i],["Ras Al Khaimah",/ras\s*al\s*khaimah|\brak\b|رأس الخيمة|راس الخيمة|راس الخيمه/i],["Fujairah",/fujair|الفجيرة|الفجيره/i],["Umm Al Quwain",/umm\s*al\s*q|\buaq\b|أم القيوين|ام القيوين/i],["Dubai",/dubai|دبي/i]];
const PROD_CANON=[[/bio\s*-?\s*re\s*-?\s*peel/i,"BioRePeel"],[/cyto\s*care\s*532|cytocare\s*-?\s*532|\b532\b/i,"Cytocare 532"],[/s\s*-?\s*line/i,"Cytocare S Line"],[/retinol/i,"Retinol"],[/\bares\b/i,"ARES"],[/revital/i,"Revital"],[/white\s*code|\bwc\b/i,"White Code"],[/hair\s*care/i,"Hair Care"],[/luminescence/i,"Luminescence"],[/workshop/i,"Workshop"]];
