#!/usr/bin/env python3
"""Build client/public/profiles/tested.json from a slice-matrix log.
usage: scripts/tested.py /tmp/tm2_slice.log ORCA_VER BAMBU_VER DATE
A printer is "slicer-tested" when every sample converted for it sliced (rc=0) in its destination slicer;
rc=-52 (model larger than the bed) is accepted because the converter already warns and suggests a scale."""
import json, re, sys
log, orca, bambu, date = sys.argv[1:5]
res = {}
for line in open(log):
    m = re.match(r'(\w+)__(\S+)\s+(\w+)\s+rc=(-?\d+)', line)
    if m:
        t, pid, _, rc = m.groups()
        res.setdefault(pid, {})[t] = int(rc)
idx = json.load(open('client/public/profiles/index.json'))
out = {}
for p in idx:
    r = res.get(p['id'], {})
    ok = any(v == 0 for v in r.values()) and all(v in (0, -52) for v in r.values())
    out[p['id']] = {'ok': ok, 'passed': sum(v == 0 for v in r.values()), 'tests': len(r), **({'note': 'large models must be scaled to fit this bed'} if -52 in r.values() else {})}
json.dump({'date': date, 'slicers': {'OrcaSlicer': orca, 'Bambu Studio': bambu},
           'samples': ['4-colour painted Bambu Studio project (X1 Carbon, PLA)', '2-object PrusaSlicer project with a colour change (MK4S MMU3, PLA)'],
           'printers': out}, open('client/public/profiles/tested.json', 'w'), indent=0)
print(sum(v['ok'] for v in out.values()), 'of', len(out), 'printers tested OK')
