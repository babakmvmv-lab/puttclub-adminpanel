#!/usr/bin/env python3
"""Build the embedded academy app for adminpanel.puttclub.ir.

Uses the *same* academy source as panel.puttclub.ir (golf-academy-pro), so every
management item behaves exactly like the panel and writes to the same cloud store
(ga_store via ga-sync). The output is wrapped with the adminpanel bridge:

  public/academy/index.html   academy app + bridge (pre/post scripts, theme)
  public/academy/...          relative assets the app loads at runtime
  public/images/...           root-absolute map icons used by the app
  public/favicon.webp

Usage:
  python3 tools/build_academy.py --src /path/to/golf-academy-pro [--assets /path/with/media]
"""
import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
BRIDGE = os.path.join(ROOT, 'academy-bridge')


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def copy(src, dst):
    if not os.path.exists(src):
        print('  ! missing', os.path.relpath(src))
        return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='golf-academy-pro checkout')
    ap.add_argument('--assets', help='folder holding mis_*.webp, images/, favicon.webp (defaults to --src)')
    ap.add_argument('--skip-build', action='store_true', help='reuse an existing source/GolfAcademy_PRO.html')
    args = ap.parse_args()
    src = os.path.abspath(args.src)
    assets = os.path.abspath(args.assets or args.src)

    built = os.path.join(src, 'source', 'GolfAcademy_PRO.html')
    if not args.skip_build:
        subprocess.check_call([sys.executable, os.path.join(src, 'source', 'build_standalone.py')])
    html = read(built)

    pre = read(os.path.join(BRIDGE, 'pre.js'))
    post = read(os.path.join(BRIDGE, 'post.js'))
    theme = read(os.path.join(BRIDGE, 'theme.css'))

    marker = '<meta charset="UTF-8">'
    if marker not in html:
        sys.exit('academy build: <meta charset="UTF-8"> not found — bridge cannot be injected safely')
    head_inject = (marker + '\n<meta name="robots" content="noindex,nofollow">'
                   '\n<script>' + pre + '</script>')
    html = html.replace(marker, head_inject, 1)

    tail_inject = '<style id="adminpanel-theme">' + theme + '</style>\n<script>' + post + '</script>\n</body>'
    idx = html.rfind('</body>')
    if idx < 0:
        sys.exit('academy build: </body> not found')
    html = html[:idx] + tail_inject + html[idx + len('</body>'):]

    out_dir = os.path.join(PUBLIC, 'academy')
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    # Runtime assets — same set the panel sync workflow publishes.
    for name in ('mis_sat.webp', 'mis_topo.webp'):
        copy(os.path.join(assets, name), os.path.join(out_dir, name))
    for name in ('puttclub_logo.webp', 'puttclub_favicon.webp'):
        copy(os.path.join(src, 'source', 'assets', name), os.path.join(out_dir, 'source', 'assets', name))
    img_root = os.path.join(assets, 'images')
    n = 0
    for dirpath, _, files in os.walk(img_root):
        for fn in files:
            if fn.endswith('.webp'):
                rel = os.path.relpath(os.path.join(dirpath, fn), img_root)
                n += copy(os.path.join(dirpath, fn), os.path.join(out_dir, 'images', rel))
    # Root-absolute references inside the app (/favicon.webp, /images/<leaflet icons>).
    copy(os.path.join(assets, 'favicon.webp'), os.path.join(PUBLIC, 'favicon.webp'))
    for fn in ('marker-icon.webp', 'marker-icon-2x.webp', 'marker-shadow.webp', 'layers.webp', 'layers-2x.webp'):
        copy(os.path.join(img_root, fn), os.path.join(PUBLIC, 'images', fn))

    size = os.path.getsize(os.path.join(out_dir, 'index.html')) // 1024
    print(f'academy: public/academy/index.html {size} KB, {n} images')


if __name__ == '__main__':
    main()
