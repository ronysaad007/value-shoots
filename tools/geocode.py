"""Find map locations (OpenStreetMap / Nominatim) for client clinics that are not in the Derma Finder register.
Writes derma/geo.json  {"<ct>|<name>": [lon, lat, "osm display name"]}.  Run from GitHub Actions (geocode.yml)."""
import json, os, re, time, urllib.parse, urllib.request
from difflib import SequenceMatcher
R = os.path.join(os.path.dirname(__file__), '..')
acc = json.load(open(os.path.join(R, 'derma', 'accounts.json'), encoding='utf8'))['a']
out_p = os.path.join(R, 'derma', 'geo.json')
try: GEO = json.load(open(out_p, encoding='utf8'))
except Exception: GEO = {}
EMI = {'d': 'Dubai', 'a': 'Abu Dhabi', 'n': 'Al Ain', 's': 'Sharjah', 'j': 'Ajman', 'r': 'Ras Al Khaimah', 'f': 'Fujairah', 'q': 'Umm Al Quwain'}
BOX = {'d': (54.85, 24.6, 55.65, 25.36), 'a': (51.5, 22.6, 55.2, 24.9), 'n': (55.4, 23.8, 56.1, 24.45), 's': (55.3, 24.9, 56.4, 25.5),
       'j': (55.4, 25.3, 55.65, 25.48), 'r': (55.7, 25.4, 56.2, 26.1), 'f': (56.1, 24.9, 56.4, 25.7), 'q': (55.5, 25.4, 55.9, 25.65)}
LEGAL = r'\b(l\.?l\.?c\.?|llc|fze|fz|fzc|dmcc|ltd|limited|spc|opc|s\.?p\.?c|sole proprietorship|one person company|co\.?|company|br(anch)?( \d+)?|branch of .*|l\.?l\.?c\.?sp)\b'
def clean(n):
    n = re.sub(r'\(.*?\)', ' ', n); n = re.sub(LEGAL, ' ', n, flags=re.I); n = re.sub(r'[-,.]+', ' ', n)
    return ' '.join(n.split())
def sim(a, b):
    a, b = clean(a).lower(), clean(b).lower()
    return SequenceMatcher(None, a, b).ratio()
def ask(q):
    u = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'jsonv2', 'countrycodes': 'ae', 'limit': 5, 'addressdetails': 0})
    req = urllib.request.Request(u, headers={'User-Agent': 'value-shoots-coverage/1.0 (ronysaad007@gmail.com)', 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)
found = tried = 0
for a in acc:
    if a.get('k'): continue
    key = a['ct'] + '|' + a['dn']
    if key in GEO: continue
    tried += 1; best = None
    for q in (clean(a['dn']) + ', ' + EMI[a['ct']], clean(a['dn'])):
        try: res = ask(q)
        except Exception as e: print('err', e); res = []
        time.sleep(1.1)
        for r in res:
            lon, lat = float(r['lon']), float(r['lat']); x0, y0, x1, y1 = BOX[a['ct']]
            if not (x0 <= lon <= x1 and y0 <= lat <= y1): continue
            nm = r.get('name') or r.get('display_name', '').split(',')[0]
            s = sim(a['dn'], nm)
            if s >= 0.72 and (not best or s > best[0]): best = (s, lon, lat, r.get('display_name', '')[:140])
        if best: break
    if best:
        GEO[key] = [round(best[1], 5), round(best[2], 5), best[3]]; found += 1
        print('OK ', a['dn'], '->', best[3][:80], round(best[0], 2))
json.dump(GEO, open(out_p, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(f'::notice::geocoded {found} of {tried} new; total {len(GEO)}')
