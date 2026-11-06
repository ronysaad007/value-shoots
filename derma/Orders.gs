/* Customer product orders (public order form).
   The form posts {type:'order', ...}. Prices and totals are recomputed here from ORDER_PRICES,
   so a tampered page cannot change what an order costs. Each order gets the next number VO-0001, VO-0002 … */
const ORDER_TAB = '🛒 Orders';
const ORDER_HEAD = ['Order no', 'Received', 'Status', 'Clinic', 'Contact', 'Phone', 'Email', 'Emirate', 'Address',
  'Items', 'Units', 'Subtotal (AED)', 'VAT (AED)', 'Total (AED)', 'Notes', 'Order date'];
const ORDER_NOTIFY = 'rony@value-aesthetic.com';
const ORDER_PRICES = {
  c532: ['CYTOCARE 532 MD', '10 vials × 5 mL', 1688.2], cs: ['CYTOCARE S LINE MD', '1 syringe × 3 mL', 759.69],
  c715: ['CYTOCARE 715', '5 vials × 5 mL', 2000], c640: ['CYTOCARE 640', '5 vials × 4 mL', 2000],
  hair: ['HAIRCARE', '10 vials × 5 mL', 1519.38], fnd: ['BIOREPEEL FND', '5 vials × 6 mL', 2250],
  body: ['BIOREPEEL BODY', '3 vials × 12 mL', 2520], lcream: ['LUMINESCENS HOME CREAM', '30 mL', 500],
  lkit: ['LUMINESCENS HOME KIT', '2 vials × 4 mL', 2500], aa: ['ARES AA', '4 vials × 4 mL', 2000],
  ao: ['ARES AO', '4 vials × 4 mL', 2000], ak: ['ARES AK', '4 vials × 4 mL', 2000], hb: ['ARES HB', '4 vials × 4 mL', 2000],
  lift: ['BIORELIFT CREAM', '30 mL', 350], hydra: ['BIOREHYDRA SERUM', '30 mL', 350],
  ret: ['RETINOL SERUM', '10 vials × 10 mL', 2500]
};

function orderPost(d) {
  if (d.hp) return { ok: true, no: 'VO-0000' };                       // bot honeypot
  const c = d.c || {}, s = v => safe(String(v == null ? '' : v).trim().slice(0, 300));
  if (!s(c.clinic) || !s(c.person) || !/\d{6,}/.test(String(c.phone || '').replace(/\D/g, ''))) return { ok: false, error: 'details' };
  const lines = [];
  Object.keys(d.q || {}).forEach(id => {
    const p = ORDER_PRICES[id], n = Math.floor(+d.q[id]);
    if (p && n > 0 && n <= 999) lines.push({ n: p[0], p: p[1], u: p[2], q: n, t: Math.round(n * p[2] * 100) / 100 });
  });
  if (!lines.length) return { ok: false, error: 'items' };
  const sub = Math.round(lines.reduce((a, l) => a + l.t, 0) * 100) / 100, vat = d.vat ? Math.round(sub * 5) / 100 : 0, tot = Math.round((sub + vat) * 100) / 100;
  const cache = CacheService.getScriptCache(), hits = +(cache.get('ord-rate') || 0);
  if (hits > 40) return { ok: false, error: 'busy' };                 // max ~40 orders / 10 min
  cache.put('ord-rate', String(hits + 1), 600);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  let no;
  try {
    const pr = props(), seq = +(pr.getProperty('ORDER_SEQ') || 0) + 1; pr.setProperty('ORDER_SEQ', String(seq));
    no = 'VO-' + String(seq).padStart(4, '0');
    const ss = SpreadsheetApp.getActive(); let sh = ss.getSheetByName(ORDER_TAB);
    if (!sh) { sh = ss.insertSheet(ORDER_TAB); sh.appendRow(ORDER_HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, ORDER_HEAD.length).setFontWeight('bold'); }
    sh.appendRow([no, new Date(), 'New', s(c.clinic), s(c.person), s(c.phone), s(c.email), s(c.emirate), s(c.addr),
      lines.map(l => l.q + ' × ' + l.n).join('\n'), lines.reduce((a, l) => a + l.q, 0), sub, vat, tot,
      safe(String(c.notes || '').slice(0, 1000)), s(c.date)]);
  } finally { lock.releaseLock(); }
  try {
    const f = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    MailApp.sendEmail(ORDER_NOTIFY, '🛒 New order ' + no + ' — ' + s(c.clinic) + ' — AED ' + f(tot),
      [no + ' · ' + s(c.clinic), 'Contact: ' + s(c.person) + ' · ' + s(c.phone) + (c.email ? ' · ' + s(c.email) : ''),
       'Address: ' + [s(c.addr), s(c.emirate)].filter(String).join(', '), '',
       lines.map(l => '• ' + l.q + ' × ' + l.n + ' (' + l.p + ') = AED ' + f(l.t)).join('\n'), '',
       'Subtotal AED ' + f(sub) + (vat ? ' · VAT AED ' + f(vat) : '') + ' · TOTAL AED ' + f(tot),
       c.notes ? '\nNotes: ' + String(c.notes).slice(0, 1000) : ''].join('\n'));
  } catch (e) {}
  return { ok: true, no: no, sub: sub, vat: vat, tot: tot };
}
