"""Build coverage/data.json: every clinic/hospital in Derma Finder + whether it is a Value Aesthetic account.
Run after updating derma/index.html or derma/accounts.json:  python3 tools/build_coverage.py"""
import json, os, collections
R = os.path.join(os.path.dirname(__file__), '..')
s = open(os.path.join(R, 'derma', 'index.html'), encoding='utf8').read()
j = s.find('const DATA=') + 11
DATA, _ = json.JSONDecoder().raw_decode(s[j:])
C, D = DATA['c'], DATA['d']
team = collections.Counter(d['c'] for d in D)
acc = json.load(open(os.path.join(R, 'derma', 'accounts.json'), encoding='utf8'))['a']
by = {}
for a in acc:
    for k in a.get('k', []): by[k] = a
out, extra = [], collections.Counter()
for i, c in enumerate(C):
    a = by.get(c['ct'] + '|' + c['n'])
    row = {'n': c['n'], 'ct': c['ct'], 'h': 1 if c.get('t') == 'h' else 0, 'm': team[i], 'c': 1 if a else 0}
    if c.get('ar'): row['ar'] = c['ar']
    if a: row['p'] = a.get('p', {})
    if c.get('la') and c.get('lo'): row['x'] = [round(c['lo'], 5), round(c['la'], 5)]
    out.append(row)
try: GEO = json.load(open(os.path.join(R, 'derma', 'geo.json'), encoding='utf8'))
except Exception: GEO = {}
for a in acc:
    if not a.get('k'):
        row = {'n': a['dn'], 'ct': a['ct'], 'h': 1 if 'HOSPITAL' in a['n'].upper() else 0, 'm': 0, 'c': 1, 'p': a.get('p', {}), 'new': 1}
        g = GEO.get(a['ct'] + '|' + a['dn'])
        if g and isinstance(g, list):
            row['x'] = [g[0], g[1]]
            if len(g) > 3 and g[3]: row['ap'] = 1
        out.append(row)
json.dump({'v': acc and 1, 'clinics': out}, open(os.path.join(R, 'coverage', 'data.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
st = collections.defaultdict(lambda: [0, 0, 0, 0])
for r in out:
    s_ = st[r['ct']]; s_[0 + 2 * r['h']] += 1; s_[1 + 2 * r['h']] += r['c']
print({k: v for k, v in st.items()}, 'on map', sum(1 for r in out if 'x' in r))
