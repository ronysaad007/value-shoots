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

function doGet() {
  const rows = sheet().getDataRange().getValues().slice(1)
    .filter(r => String(r[2]).trim().toLowerCase() === 'approved');
  return out(rows.map(r => ({ at: +new Date(r[0]), type: String(r[1]).toLowerCase(), name: r[3], role: r[4], level: r[5],
    licence: r[6], city: r[7], from: r[8], to: r[9], key: r[13], id: r[14] })));
}

const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
