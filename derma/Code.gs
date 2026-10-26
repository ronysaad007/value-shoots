// Derma Finder — team requests (move a person / add a person)
// Paste into the Value Shoots sheet: Extensions > Apps Script. Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone.
const TAB = '🩺 Derma requests';
const sheet = () => SpreadsheetApp.getActive().getSheetByName(TAB);
const safe = v => { v = String(v == null ? '' : v).slice(0, 500); return /^[=+\-@]/.test(v) ? "'" + v : v; };

function doPost(e) {
  const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (d.action && String(d.action).indexOf('hub_') === 0) return out(hubAction(d));
  if (d.type === 'status' || d.type === 'account') return out(acctPost(d));
  if (!d.name || !d.type) return out({ ok: false });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    sheet().appendRow([new Date(), d.type === 'add' ? 'Add' : 'Move', 'Pending',
      safe(d.name), safe(d.role), safe(d.level), safe(d.licence), safe(d.city),
      safe(d.from), safe(d.to), d.newClinic ? 'Yes' : '', safe(d.note), safe(d.by), safe(d.key), safe(d.id)]);
  } finally { lock.releaseLock(); }
  return out({ ok: true });
}

function doGet(e) {
  if (e && e.parameter && e.parameter.a === 'assets') return out(assets(e.parameter.fresh === '1'));
  if (e && e.parameter && e.parameter.a === 'catalog') return out(hubCatalog());
  if (e && e.parameter && e.parameter.a === 'file') return out(hubFile(e.parameter.id));
  if (e && e.parameter && e.parameter.a === 'acct') return out(acctGet());
  const rows = sheet().getDataRange().getValues().slice(1)
    .filter(r => String(r[2]).trim().toLowerCase() === 'approved');
  return out(rows.map(r => ({ at: +new Date(r[0]), type: String(r[1]).toLowerCase(), name: r[3], role: r[4], level: r[5],
    licence: r[6], city: r[7], from: r[8], to: r[9], key: r[13], id: r[14] })));
}

const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

// --- Shared assets folder (logos, photos, brochures) for the team page ---
const ASSETS_ROOT = '1FZjAi2TMNp6kib5w_Jk_nWUi_w5GoOqW';
function assets(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const n = +(cache.get('as_n') || 0);
    if (n) {
      const keys = Array.from({ length: n }, (_, i) => 'as_' + i), got = cache.getAll(keys);
      if (keys.every(k => got[k])) return JSON.parse(keys.map(k => got[k]).join(''));
    }
  }
  const by = (a, b) => a.n.localeCompare(b.n, undefined, { numeric: true });
  const walk = folder => {
    const o = { id: folder.getId(), n: folder.getName(), f: [], d: [] };
    const fs = folder.getFiles();
    while (fs.hasNext()) { const x = fs.next(); if (x.isTrashed()) continue;
      o.f.push({ id: x.getId(), n: x.getName(), m: x.getMimeType(), s: x.getSize(), t: +x.getLastUpdated() }); }
    const ds = folder.getFolders();
    while (ds.hasNext()) { const x = ds.next(); if (!x.isTrashed()) o.d.push(walk(x)); }
    o.d.sort(by); o.f.sort(by); return o;
  };
  const tree = walk(DriveApp.getFolderById(ASSETS_ROOT)); tree.at = Date.now();
  const s = JSON.stringify(tree), parts = {}; let n = 0;
  for (let i = 0; i < s.length; i += 90000) parts['as_' + (n++)] = s.slice(i, i + 90000);
  parts.as_n = String(n); try { cache.putAll(parts, 300); } catch (err) {}
  return tree;
}

// --- Product Hub: catalogue editing (Settings on the Product Hub page) ---
// Default password = the Value Shoots settings password. Change it from the Product Hub settings.
const HUB_DEFAULT_PW = '5847d8377b1ae15440a9f0b4b2de1b54e0e3bb8f3d35e51dd1f2c4e46436e188';
const props = () => PropertiesService.getScriptProperties();
const sha = s => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
  .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
function hubCatalogFile() {
  const id = props().getProperty('HUB_CATALOG_ID');
  if (id) { try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (err) {} }
  return null;
}
function hubCatalog() {
  const f = hubCatalogFile(); if (!f) return { none: true };
  const j = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
  return { data: j.data, version: j.version || 0 };
}
function hubUploads() {
  const id = props().getProperty('HUB_UPLOADS_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (err) {} }
  const f = DriveApp.getFolderById(ASSETS_ROOT).createFolder('9 - 🧪 Product Hub uploads');
  props().setProperty('HUB_UPLOADS_ID', f.getId()); return f;
}
function hubFile(id) {
  const f = DriveApp.getFileById(String(id || ''));
  const parents = f.getParents(); let ok = false; const up = hubUploads().getId();
  while (parents.hasNext()) if (parents.next().getId() === up) ok = true;
  if (!ok) return { error: 'Not found' };
  return { type: f.getMimeType(), b64: Utilities.base64Encode(f.getBlob().getBytes()) };
}
function hubAuthed(token) { return !!(token && CacheService.getScriptCache().get('hub_s_' + sha(String(token)))); }
function hubAction(d) {
  const cache = CacheService.getScriptCache();
  try {
    if (d.action === 'hub_login') {
      const fails = +(cache.get('hub_fails') || 0); if (fails > 15) return { error: 'Too many attempts. Try again in 15 minutes.' };
      const want = props().getProperty('HUB_PW') || HUB_DEFAULT_PW;
      if (typeof d.password !== 'string' || sha(d.password) !== want) { cache.put('hub_fails', String(fails + 1), 900); return { error: 'Incorrect password' }; }
      const token = Utilities.getUuid() + Utilities.getUuid(); cache.put('hub_s_' + sha(token), '1', 21600);
      return { admin: true, token };
    }
    if (d.action === 'hub_session') return { admin: hubAuthed(d.token) };
    if (!hubAuthed(d.token)) return { error: 'Please sign in to settings' };
    if (d.action === 'hub_logout') { cache.remove('hub_s_' + sha(String(d.token))); return { ok: true }; }
    if (d.action === 'hub_password') {
      if (typeof d.password !== 'string' || d.password.length < 6 || d.password.length > 200) return { error: 'Use at least 6 characters' };
      props().setProperty('HUB_PW', sha(d.password)); return { ok: true };
    }
    if (d.action === 'hub_save') {
      const lock = LockService.getScriptLock(); lock.waitLock(15000);
      try {
        const cur = hubCatalog(), curV = cur.none ? (d.version || 0) : cur.version;
        if (!cur.none && d.version !== curV) return { error: 'Another editor saved changes. Reload before saving.' };
        if (!d.data || !Array.isArray(d.data.products)) return { error: 'Invalid catalogue' };
        const body = JSON.stringify({ data: d.data, version: curV + 1, savedAt: new Date().toISOString() });
        const f = hubCatalogFile();
        if (f) f.setContent(body); else props().setProperty('HUB_CATALOG_ID', DriveApp.createFile('Product Hub catalogue.json', body, 'application/json').getId());
        return { ok: true, version: curV + 1 };
      } finally { lock.releaseLock(); }
    }
    if (d.action === 'hub_upload') {
      const bytes = Utilities.base64Decode(String(d.b64 || ''));
      if (bytes.length > 25 * 1024 * 1024) return { error: 'Maximum file size is 25 MB' };
      const type = String(d.type || '');
      if (!/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(type)) return { error: 'Use JPG, PNG, WebP or PDF' };
      const f = hubUploads().createFile(Utilities.newBlob(bytes, type, String(d.name || 'file').slice(0, 120)));
      const id = f.getId();
      return { url: type === 'application/pdf' ? 'https://drive.google.com/file/d/' + id + '/view' : 'https://lh3.googleusercontent.com/d/' + id };
    }
    return { error: 'Not found' };
  } catch (err) { return { error: String(err && err.message || err) }; }
}

// --- Value Aesthetic accounts: "is it selling?" checks by reps + new accounts (need Rony's approval) ---
const ACCT_TAB = '🏷 Accounts activity';
const ACCT_HEAD = ['Date', 'Type', 'Approval', 'Clinic', 'City', 'Clinic key', 'Product', 'Value', 'By', 'Note', 'Id'];
function acctSheet() {
  const ss = SpreadsheetApp.getActive(); let sh = ss.getSheetByName(ACCT_TAB);
  if (!sh) { sh = ss.insertSheet(ACCT_TAB); sh.appendRow(ACCT_HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, ACCT_HEAD.length).setFontWeight('bold'); }
  return sh;
}
function acctPost(d) {
  if (!d.by || !d.clinic) return { ok: false };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = acctSheet();
    if (d.type === 'status') {
      if (!/^(selling|not|unknown)$/.test(d.value || '')) return { ok: false };
      sh.appendRow([new Date(), 'Status', 'Auto', safe(d.clinic), safe(d.city), safe(d.key), safe(d.product), d.value, safe(d.by), safe(d.note), safe(d.id)]);
    } else {
      const reps = d.reps && typeof d.reps === 'object' ? d.reps : {};
      Object.keys(reps).slice(0, 8).forEach(prod => {
        sh.appendRow([new Date(), 'New account', 'Pending', safe(d.clinic), safe(d.city), safe(d.key), safe(prod), safe(reps[prod]), safe(d.by), safe(d.note), safe(d.id)]);
      });
    }
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function acctGet() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ACCT_TAB); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1)
    .filter(r => r[1] === 'Status' || String(r[2]).trim().toLowerCase() === 'approved')
    .map(r => ({ at: +new Date(r[0]), type: r[1] === 'Status' ? 'status' : 'account', clinic: r[3], city: r[4], key: r[5], product: r[6], value: r[7], by: r[8] }));
}
