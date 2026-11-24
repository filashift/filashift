#!/bin/bash
# PrusaSlicer CLI wrapper with the same interface as /tmp/slicers/{bambu,orca}:
#   prusa [--allow-mix-temp] [--slice N] --outputdir DIR file.3mf
# Slices the project as saved (no re-arrange) into DIR/plate_1.gcode and writes DIR/result.json.
# PrusaSlicer's CLI exits 0 even when validation fails, so a missing G-code counts as a failure.
out=.; f=
while [[ $# -gt 0 ]]; do
  case "$1" in
    --outputdir) out=$2; shift 2;;
    --slice) shift 2;;
    --allow-mix-temp) shift;;
    *) f=$1; shift;;
  esac
done
mkdir -p "$out"; rm -f "$out/plate_1.gcode"
PS=${PRUSA_SLICER:-prusa-slicer}
timeout 380 $PS --datadir /tmp/slicers/prusa-empty --loglevel 2 --export-gcode --binary-gcode=0 --dont-arrange "$f" --output "$out/plate_1.gcode" > "$out/prusa.log" 2>&1
rc=$?
python3 - "$out" "$rc" <<'PY'
import json, os, re, sys
out, rc = sys.argv[1], int(sys.argv[2])
log = open(os.path.join(out, "prusa.log"), errors="ignore").read()
g = os.path.join(out, "plate_1.gcode")
ok = os.path.exists(g) and os.path.getsize(g) > 1000
err = ""
if not ok:
    lines = [l.strip() for l in log.splitlines() if l.strip() and not l.startswith("Slicing") and "Exporting" not in l]
    err = " | ".join(lines[-3:]) or "no G-code written"
json.dump({"return_code": 0 if ok and rc == 0 else (rc or 1), "error_string": err, "slicer": "PrusaSlicer"}, open(os.path.join(out, "result.json"), "w"))
PY
