// 📨 Value Shoots mail bridge — runs inside rony@value-aesthetic.com (script.google.com, signed in with the work account).
// Every 5 minutes it reads the team's shoot-request emails and Dr Alaa / Dr Yasir's replies in the same threads,
// and posts them to the Value Shoots web app, which adds them to the sheet + calendar (see EmailShoots.gs).
// Nothing is forwarded or changed in the work inbox. Run setupBridge() once.
const BRIDGE_API = 'https://script.google.com/macros/s/AKfycbwy-zE5NVwkQb6n-6n5tAdkG99kVNuYTt1Dr9wIrbyMgscuOGI1N9rEr9Dw_7xmU3yd/exec';
const BRIDGE_KEY = 'PASTE_MAIL_KEY'; // the MAIL_KEY printed by setupEmailShoots() in the Value Shoots script
const BRIDGE_QUERY = 'newer_than:21d from:value-aesthetic.com {"clinic name" "اسم العيادة" "clinic:"}';

function setupBridge() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'bridgeMail').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('bridgeMail').timeBased().everyMinutes(5).create();
  bridgeMail();
}
function bridgeMail() {
  const p = PropertiesService.getScriptProperties(), seen = JSON.parse(p.getProperty('SEEN') || '{}'), msgs = [];
  GmailApp.search(BRIDGE_QUERY, 0, 40).forEach(th => th.getMessages().forEach(m => {
    if (seen[m.getId()] || msgs.length >= 60) return;
    msgs.push({ id: m.getId(), thread: th.getId(), from: m.getFrom(), date: m.getDate().toISOString(), subject: m.getSubject(), body: (m.getPlainBody() || '').slice(0, 8000) });
  }));
  if (!msgs.length) return;
  msgs.sort((a, b) => a.date < b.date ? -1 : 1);
  const r = UrlFetchApp.fetch(BRIDGE_API, { method: 'post', contentType: 'text/plain', payload: JSON.stringify({ type: 'mail', key: BRIDGE_KEY, msgs: msgs }), muteHttpExceptions: true });
  let j = {}; try { j = JSON.parse(r.getContentText()); } catch (err) {}
  if (!j.ok) { Logger.log('Value Shoots did not accept the mail: ' + r.getContentText().slice(0, 300)); return; }
  (j.done || []).forEach(id => seen[id] = Date.now());
  const cutoff = Date.now() - 30 * 864e5; Object.keys(seen).forEach(k => { if (seen[k] < cutoff) delete seen[k]; });
  p.setProperty('SEEN', JSON.stringify(seen));
}
