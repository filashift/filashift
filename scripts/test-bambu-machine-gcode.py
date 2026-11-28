#!/usr/bin/env python3
"""Release gate: Bambu Lab profiles carry their own printer's machine G-code.

Bambu Studio 2.9+ keeps per-printer G-code in "template" presets listed under "include".
If build_profiles.py stops merging them, every profile falls back to fdm_bbl_3dp_002_common's
generic G-code (the Nov 24-28 2026 defect). This fails if any bambu-lab-*.json carries that
generic start/end/filament-change G-code, has an empty one, or if one printer model's start
G-code is shared with a different model (Bambu ships one X1/X1 Carbon start, so that pair is allowed).
"""
import glob, hashlib, json, sys
GENERIC = {  # sha256 of fdm_bbl_3dp_002_common G-code as shipped Nov 24-28 2026
    "machine_start_gcode": "ca7c4488fde2dacd32a78937b67a7af5be6cd2ce9ce20a03a67c348fbd5684a3",
    "machine_end_gcode": "7da02dc14a2dccf096fafb587341e4829699e011b71537a6a906fbd82fe007f4",
    "change_filament_gcode": "bd8de5f4e33b9f66281d77cc493c394ec6b9118bc6bce38cdd2ae1b9ae208689",
}
def find(d, k):
    if isinstance(d, dict):
        if k in d: return d[k]
        for v in d.values():
            r = find(v, k)
            if r is not None: return r
    return None
bad, models, n = [], {}, 0
for f in sorted(glob.glob("client/public/profiles/bambu-lab-*.json")):
    p = json.load(open(f)); n += 1
    for k, h in GENERIC.items():
        v = find(p, k) or ""
        if not v.strip(): bad.append(f"{f}: empty {k}")
        elif hashlib.sha256(v.encode()).hexdigest() == h: bad.append(f"{f}: generic common {k}")
    s = hashlib.sha256((find(p, "machine_start_gcode") or "").encode()).hexdigest()
    models.setdefault(s, set()).add(find(p, "printer_model"))
for s, m in models.items():
    if len(m) > 1 and m != {"Bambu Lab X1", "Bambu Lab X1 Carbon"}: bad.append(f"one start G-code shared by {sorted(map(str, m))}")
if n == 0: bad.append("no bambu-lab profiles found")
for b in bad[:20]: print("FAIL", b)
print(f"{'FAIL' if bad else 'PASS'} Bambu machine G-code: {n} profiles, {len(models)} distinct start G-codes")
sys.exit(1 if bad else 0)
