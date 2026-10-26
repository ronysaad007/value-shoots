"""Find map locations for client clinics that are not in the Derma Finder register.
1) Look the clinic up in the public zavis.ai UAE clinic directory (address text).
2) Turn that address (or the name) into coordinates with OpenStreetMap Nominatim.
Writes derma/geo.json {"<ct>|<name>": [lon, lat, "where it came from"]}.  Runs from GitHub Actions (geocode.yml)."""
import json, os, re, time, html, urllib.parse, urllib.request
from difflib import SequenceMatcher
R = os.path.join(os.path.dirname(__file__), '..')
acc = json.load(open(os.path.join(R, 'derma', 'accounts.json'), encoding='utf8'))['a']
out_p = os.path.join(R, 'derma', 'geo.json')
try: GEO = json.load(open(out_p, encoding='utf8'))
except Exception: GEO = {}
EMI = {'d': 'Dubai', 'a': 'Abu Dhabi', 'n': 'Al Ain', 's': 'Sharjah', 'j': 'Ajman', 'r': 'Ras Al Khaimah', 'f': 'Fujairah', 'q': 'Umm Al Quwain'}
ZSLUG = {'d': ['dubai'], 'a': ['abu-dhabi'], 'n': ['al-ain', 'abu-dhabi'], 's': ['sharjah'], 'j': ['ajman'], 'r': ['ras-al-khaimah'], 'f': ['fujairah'], 'q': ['umm-al-quwain']}
BOX = {'d': (54.85, 24.6, 55.65, 25.36), 'a': (51.5, 22.6, 55.2, 24.9), 'n': (55.4, 23.8, 56.1, 24.45), 's': (55.3, 24.9, 56.4, 25.5),
       'j': (55.4, 25.3, 55.65, 25.48), 'r': (55.7, 25.4, 56.2, 26.1), 'f': (56.1, 24.9, 56.4, 25.7), 'q': (55.5, 25.4, 55.9, 25.65)}
UA = {'User-Agent': 'value-shoots-coverage/1.1 (ronysaad007@gmail.com)', 'Accept-Language': 'en'}
LEGAL = r'\b(l\.?l\.?c\.?|llc|fze|fz|fzc|dmcc|ltd|limited|spc|opc|s\.?p\.?c|sole proprietorship|one person company|co\.?|company|br(anch)?( \d+)?|branch of .*|l\.?l\.?c\.?sp|sp)\b'
def clean(n):
    n = re.sub(r'\(.*?\)', ' ', n); n = re.sub(LEGAL, ' ', n, flags=re.I); n = re.sub(r'[-,.&/]+', ' ', n)
    return ' '.join(n.split())
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def get(u, t=12):
    req = urllib.request.Request(u, headers=UA)
    with urllib.request.urlopen(req, timeout=t) as r: return r.read().decode('utf8', 'replace')
def inbox(ct, lon, lat):
    x0, y0, x1, y1 = BOX[ct]; return x0 <= lon <= x1 and y0 <= lat <= y1
def nomi(q, ct):
    u = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'jsonv2', 'countrycodes': 'ae', 'limit': 5})
    try: res = json.loads(get(u))
    except Exception: res = []
    time.sleep(1.1)
    for r in res:
        lon, lat = float(r['lon']), float(r['lat'])
        if inbox(ct, lon, lat): return lon, lat, r.get('display_name', '')
    return None
def zavis(a):
    raw = a['n']; base = [raw, clean(raw), raw + '1']
    for b in dict.fromkeys(base):
        for em in ZSLUG[a['ct']]:
            for cat in (('hospitals',) if 'hospital' in raw.lower() else ('dental', 'clinics') if 'dental' in raw.lower() else ('clinics',)):
                u = f'https://www.zavis.ai/directory/{em}/{cat}/{slug(b)}-{em}'
                try: page = get(u)
                except Exception: continue
                finally: time.sleep(0.4)
                m = re.search(r'maps/search/\?api=1(?:&amp;|&)query=([^"\'<> ]+)', page)
                if m:
                    q = urllib.parse.unquote(html.unescape(m.group(1))).replace('+', ' ')
                    return q, u
                m = re.search(r'"streetAddress"\s*:\s*"([^"]+)"', page)
                if m: return m.group(1), u
    return None
found = tried = 0
for a in acc:
    if a.get('k'): continue
    key = a['ct'] + '|' + a['dn']
    if key in GEO or key in GEO.get('_miss', {}): continue
    tried += 1; hit = None
    if tried % 5 == 0: json.dump(GEO, open(out_p, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    z = zavis(a)
    if z:
        addr = z[0]; parts = [p.strip() for p in addr.split(' - ') if p.strip()]
        # try the full address, then drop the most specific parts one by one (street -> area -> city)
        for i in range(len(parts)):
            q = ', '.join(parts[i:]) if i else ', '.join(parts)
            if not q or q.lower() in ('united arab emirates',): break
            h = nomi(q, a['ct'])
            if h: hit = (h[0], h[1], 'zavis: ' + addr[:120] + ' | osm: ' + h[2][:80]); break
    if not hit:
        h = nomi(clean(a['dn']) + ', ' + EMI[a['ct']], a['ct'])
        if h and SequenceMatcher(None, clean(a['dn']).lower(), h[2].split(',')[0].lower()).ratio() >= 0.72:
            hit = (h[0], h[1], 'osm: ' + h[2][:120])
    if hit:
        GEO[key] = [round(hit[0], 5), round(hit[1], 5), hit[2]]; found += 1
        print('OK ', a['dn'], '->', hit[2][:110])
    else:
        print('-- ', a['dn'], '(zavis' + (' address but no map match' if z else ' not found') + ')')
        GEO.setdefault('_miss', {})[key] = 1 if z else 0
json.dump(GEO, open(out_p, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(f'::notice::located {found} of {tried}; total {len(GEO)}')
