# Parity tests: panel.puttclub.ir ⇄ adminpanel.puttclub.ir

Used on 2026-10-07 to move every management item from the members panel to the console, one by one.
Safety: every non-GET request is captured and never reaches a server (`ga-sync` gets a local success ack,
everything else — EmailJS, `ga-mail` — is aborted). Reads come from the live database. The console sign-in is
simulated (fake session + mocked `adminpanel_access` row); no password is used.

| script | checks |
|---|---|
| `t1_boot.py` | both apps load the same `ga_*` data from the cloud; device bridge links; identical boot writes |
| `t2_read.py` | each of the 21 items renders identical text/structure in both |
| `t4_write.py [slug…]` | a real workflow per item in both → identical changed keys, cloud payloads and device-local data (time/random ids normalised) |
| `t5_guard.py <golf-academy-panel checkout>` | each removal step: moved items unreachable (menu, tabs, shortcuts, `APP.go`, direct hash, Back); every remaining item and all 11 dashboard pages unchanged |
| `t5_neg.py` | proves `t5_guard` detects failures |
| `t6_live.py` / `t7_final.py` | same checks against the live sites; member view unchanged; console user lands in the panel's device storage |

`pip install playwright && python3 -m playwright install chromium`, then run from this folder (outputs in `out/`, gitignored).
