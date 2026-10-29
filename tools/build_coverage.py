"""Build coverage/data.json: every clinic/hospital in Derma Finder (public part only).
Which ones are Value Aesthetic accounts is private: the coverage page gets it from the team API (password).
Run after updating derma/index.html:  python3 tools/build_coverage.py"""
import json, os, collections
R = os.path.join(os.path.dirname(__file__), '..')
s = open(os.path.join(R, 'derma', 'index.html'), encoding='utf8').read()
j = s.find('const DATA=') + 11
DATA, _ = json.JSONDecoder().raw_decode(s[j:])
C, D = DATA['c'], DATA['d']
team = collections.Counter(d['c'] for d in D)
out = []
for i, c in enumerate(C):
    row = {'n': c['n'], 'ct': c['ct'], 'h': 1 if c.get('t') == 'h' else 0, 'm': team[i], 'c': 0}
    if c.get('ar'): row['ar'] = c['ar']
    if c.get('la') and c.get('lo'): row['x'] = [round(c['lo'], 5), round(c['la'], 5)]
    out.append(row)
json.dump({'v': 2, 'clinics': out}, open(os.path.join(R, 'coverage', 'data.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
st = collections.defaultdict(lambda: [0, 0, 0, 0])
for r in out:
    s_ = st[r['ct']]; s_[0 + 2 * r['h']] += 1; s_[1 + 2 * r['h']] += r['c']
print({k: v for k, v in st.items()}, 'on map', sum(1 for r in out if 'x' in r))
