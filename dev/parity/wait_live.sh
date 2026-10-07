#!/bin/bash
# wait until live panel serves the expected moved list
want=$(python3 -c "import json;print(json.dumps(json.load(open('/tmp/gap/members-only/moved.json'))))")
for i in $(seq 1 60); do
  got=$(curl -s "https://panel.puttclub.ir/?nocache=$RANDOM$RANDOM" | grep -o 'var MOVED = [^;]*' | head -1 | sed 's/var MOVED = //')
  if [ "$got" = "$want" ]; then echo "live after ${i}x5s: $got"; exit 0; fi
  sleep 5
done
echo "TIMEOUT live=$got"; exit 1
