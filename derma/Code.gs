// Derma Finder — team requests (move a person / add a person)
// Paste into the Value Shoots sheet: Extensions > Apps Script. Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone.
const TAB = '🩺 Derma requests';
const sheet = () => SpreadsheetApp.getActive().getSheetByName(TAB);
const safe = v => { v = String(v == null ? '' : v).slice(0, 500); return /^[=+\-@]/.test(v) ? "'" + v : v; };

function doPost(e) {
  const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
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
