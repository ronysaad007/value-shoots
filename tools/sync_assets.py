"""Mirror the Drive "Assets" folder (images + PDFs) onto GitHub Pages so the team page loads instantly.
Runs hourly from .github/workflows/assets.yml. Drive stays the source of truth."""
import json, os, re, shutil, subprocess, sys, tempfile, urllib.request
from io import BytesIO
from PIL import Image, ImageOps

API = os.environ.get('ASSETS_API') or open(os.path.join(os.path.dirname(__file__), '..', 'derma', 'api.txt')).read().strip()
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
MAX = 40 * 1024 * 1024          # bigger files stay on Drive only
BUDGET = 900 * 1024 * 1024      # keep the repo well under GitHub's 1 GB guidance
SKIP_FOLDER = re.compile(r'product hub uploads', re.I)
Image.MAX_IMAGE_PIXELS = 200_000_000

def get(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'value-shoots-sync'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')

def safe(name):
    name = re.sub(r'[\\/:*?"<>|#%\x00-\x1f]+', '-', name).strip(' .') or 'file'
    return name[:120]

def main():
    raw, _ = get(API + '?a=assets&fresh=1', 300)
    tree = json.loads(raw)
    if not isinstance(tree, dict) or not tree.get('id'):
        sys.exit('No tree from Apps Script: ' + raw[:200].decode('utf8', 'replace'))
    old = {}
    try:
        def collect(d):
            for f in d.get('f', []): old[f['id']] = f
            for x in d.get('d', []): collect(x)
        collect(json.load(open(os.path.join(OUT, 'index.json'))))
    except Exception:
        pass
    keep, used, stats = set(), 0, {'new': 0, 'kept': 0, 'skipped': 0, 'failed': 0}

    def handle(f):
        nonlocal used
        m = f.get('m', '')
        if not (m.startswith('image/') or m == 'application/pdf'):
            return
        if f.get('s', 0) > MAX or used + f.get('s', 0) > BUDGET:
            stats['skipped'] += 1; return
        fid = f['id']; name = safe(f['n'])
        prev = old.get(fid)
        rel = f'f/{fid}/{name}'
        if prev and prev.get('t') == f.get('t') and prev.get('g') == rel and os.path.exists(os.path.join(OUT, rel)):
            for k in ('g', 'th', 'pv', 'w', 'h'):
                if k in prev: f[k] = prev[k]
            used += f.get('s', 0); keep.add(fid); stats['kept'] += 1; return
        try:
            data, ct = get(f'https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t')
            if 'text/html' in ct:
                raise RuntimeError('got an HTML page instead of the file')
            shutil.rmtree(os.path.join(OUT, 'f', fid), ignore_errors=True)
            os.makedirs(os.path.join(OUT, 'f', fid), exist_ok=True)
            open(os.path.join(OUT, rel), 'wb').write(data)
            f['g'] = rel
            os.makedirs(os.path.join(OUT, 't'), exist_ok=True)
            if m == 'application/pdf':
                with tempfile.TemporaryDirectory() as td:
                    pdf = os.path.join(td, 'a.pdf'); open(pdf, 'wb').write(data)
                    subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', '60', '-png', pdf, os.path.join(td, 'p')], check=True, timeout=120)
                    png = next(os.path.join(td, x) for x in os.listdir(td) if x.endswith('.png'))
                    im = Image.open(png)
            else:
                im = ImageOps.exif_transpose(Image.open(BytesIO(data)))
            f['w'], f['h'] = im.size
            if im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGBA')
            th = im.copy(); th.thumbnail((440, 440))
            th.save(os.path.join(OUT, 't', fid + '.webp'), 'WEBP', quality=78)
            f['th'] = f't/{fid}.webp'
            if m.startswith('image/') and (len(data) > 700_000 or m not in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')):
                os.makedirs(os.path.join(OUT, 'p'), exist_ok=True)
                pv = im.copy(); pv.thumbnail((1800, 1800))
                pv.save(os.path.join(OUT, 'p', fid + '.webp'), 'WEBP', quality=84)
                f['pv'] = f'p/{fid}.webp'
            used += f.get('s', 0); keep.add(fid); stats['new'] += 1
        except Exception as e:
            print('::warning::FAILED ' + f.get('m','') + ' ' + f['n'] + ': ' + str(e)[:200]); stats['failed'] += 1
            for k in ('g', 'th', 'pv'): f.pop(k, None)

    def walk(d):
        d['d'] = [x for x in d.get('d', []) if not SKIP_FOLDER.search(x.get('n', ''))]
        d['f'] = [f for f in d.get('f', []) if not f.get('n', '').startswith('.')]
        for f in d['f']: handle(f)
        for x in d['d']: walk(x)
    walk(tree)

    for sub in ('f', 't', 'p'):
        p = os.path.join(OUT, sub)
        if not os.path.isdir(p): continue
        for x in os.listdir(p):
            if x.split('.')[0] not in keep:
                q = os.path.join(p, x)
                shutil.rmtree(q) if os.path.isdir(q) else os.remove(q)
    tree.pop('at', None)
    json.dump(tree, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('::notice::' + str(stats) + ' mirrored MB: ' + str(round(used / 1048576, 1)))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    try:
        main()
    except BaseException as e:
        import traceback
        print('::error::' + ' | '.join(traceback.format_exc().strip().splitlines()[-4:]).replace('\n', ' '))
        raise
