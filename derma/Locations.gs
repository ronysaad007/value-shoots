// 📍 Find clinic locations with Google Maps (tab: 📍 Clinic locations)
function onOpen() {
  SpreadsheetApp.getUi().createMenu('📍 Locations')
    .addItem('Find missing locations', 'findClinicLocations').addToUi();
}
function findClinicLocations() {
  const sh = SpreadsheetApp.getActive().getSheetByName('📍 Clinic locations');
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues();
  const geo = Maps.newGeocoder().setRegion('ae');
  let done = 0;
  rows.forEach((r, i) => {
    if (r[2] || !r[0]) return;
    const res = geo.geocode(`${r[0]}, ${r[1]}, United Arab Emirates`);
    const hit = res.status === 'OK' && res.results[0];
    if (!hit) { sh.getRange(i + 2, 5).setValue('not found'); return; }
    const exact = hit.types.some(t => /establishment|point_of_interest|health|doctor|hospital/.test(t));
    const loc = hit.geometry.location;
    sh.getRange(i + 2, 3).setValue(`${loc.lat}, ${loc.lng}`);
    sh.getRange(i + 2, 5).setValue((exact ? '✓ ' : '≈ area only: ') + hit.formatted_address);
    done++; Utilities.sleep(150);
  });
  SpreadsheetApp.getActive().toast(`Found ${done} locations`, '📍 Locations');
}
