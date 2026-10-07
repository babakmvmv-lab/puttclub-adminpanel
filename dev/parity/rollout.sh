#!/bin/bash
# usage: rollout.sh <slug> <id> [<id> ...]   — one commit per item in golf-academy-panel
set -e
cd /tmp/gap
slug=$1; shift
python3 - "$@" <<'PY'
import json, sys
p = 'members-only/moved.json'
m = json.load(open(p))
for i in sys.argv[1:]:
    if i not in m: m.append(i)
json.dump(m, open(p, 'w'), ensure_ascii=False)
open(p, 'a').write('\n')
PY
python3 members-only/inject.py index.html >/dev/null
git add members-only/moved.json index.html
git -c user.name=babakmvmv-lab -c user.email=babakmvmv-lab@users.noreply.github.com commit -qm "members-only: move «$slug» to adminpanel.puttclub.ir (verified identical there; ids: $*)"
git log --oneline -1
