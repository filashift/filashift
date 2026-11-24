#!/bin/bash
# Build real ElegooSlicer / Anycubic Slicer Next project files with each slicer's own CLI and
# system presets (no customer files). Creality Print cannot do this headless (6.3.1's CLI
# segfaults on --export-3mf, 7.3.2's CLI has no --export-3mf), so its fixtures come from
# scripts/make_creality_fixture.py instead.
#
# usage: scripts/make_fork_fixtures.sh FORKDIR OUTDIR
#   FORKDIR holds the extracted official releases and run wrappers (see OPERATIONS.md):
#     run-el  -> ElegooSlicer  (ElegooSlicer_Linux_V1.5.3.5.AppImage --appimage-extract)
#     run-ac  -> AnycubicSlicerNext (official .deb 2.0.0.6 from cdn-universe-slicer.anycubic.com, dpkg-deb -x)
#   Each wrapper runs the binary under xvfb-run with its own --datadir.
#
# Geometry/paint carrier: ~/td/x1c_paint.3mf (4 objects on filaments 1-4, object 1 has painted
# facets) converted by FilaShift to the fork's printer first, because these forks refuse
# Bambu Studio 2.9 files. The fork then loads it with its own machine/process/filament presets
# (flattened by scripts/fork_presets.py, one distinct colour per slot) and writes its own 3MF.
set -euo pipefail
F=${1:?forkdir}; OUT=${2:?outdir}
HERE=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$OUT"; W=$(mktemp -d)
cd "$HERE"
npx tsx scripts/matrix.ts "$W/carrier" "$HOME/td/x1c_paint.3mf:x1c" -- elegoo-centauri-carbon-2 anycubic-kobra-3 >/dev/null
# The forks copy unknown model metadata through, so drop FilaShift's OrcaSlicer stamp from the
# carriers; the fork then writes only its own Application / version tags.
python3 - "$W"/carrier/*.3mf <<'PY'
import re,sys,zipfile
for p in sys.argv[1:]:
    z=zipfile.ZipFile(p); items=[(i,z.read(i.filename)) for i in z.infolist()]; z.close()
    with zipfile.ZipFile(p,"w",zipfile.ZIP_DEFLATED) as o:
        for i,b in items:
            if i.filename=="3D/3dmodel.model": b=re.sub(rb'\s*<metadata name="OrcaSlicer">[^<]*</metadata>',b"",b)
            o.writestr(i.filename,b)
PY
COLS=("#E63A2E" "#1E7FD8" "#F2C230" "#2BAA4A")

# name  runner profiles-dir vendor carrier machine process filament
gen() {
  local tag=$1 run=$2 XARGS=""; [[ $run == run-el ]] && XARGS=--allow-newer-file
  local prof=$3 vendor=$4 carrier=$5 machine=$6 process=$7 fil=$8
  local d=$W/$tag; mkdir -p "$d"
  python3 scripts/fork_presets.py "$prof" "$vendor" "$d/m.json" "$machine"
  python3 scripts/fork_presets.py "$prof" "$vendor" "$d/p.json" "$process"
  local fl=""
  for i in 0 1 2 3; do
    python3 scripts/fork_presets.py "$prof" "$vendor" "$d/f$i.json" "$fil"
    python3 - "$d/f$i.json" "${COLS[$i]}" <<'PY'
import json,sys
p,c=sys.argv[1:]; j=json.load(open(p)); j["filament_colour"]=[c]; json.dump(j,open(p,"w"),indent=1)
PY
    fl="$fl;$d/f$i.json"
  done
  timeout 400 "$F/$run" $XARGS --load-settings "$d/m.json;$d/p.json" --load-filaments "${fl#;}" \
    --export-3mf "$tag.3mf" --outputdir "$d" "$W/carrier/x1c__$carrier.3mf" > "$d/log.txt" 2>&1 || true
  if [[ -f "$d/$tag.3mf" ]]; then cp "$d/$tag.3mf" "$OUT/$tag.3mf"; echo "OK  $tag"; else echo "FAIL $tag"; tail -3 "$d/log.txt"; cat "$d/result.json" 2>/dev/null || true; fi
}
EL=$F/el/squashfs-root/resources/profiles
AC=$F/ac/usr/share/AnycubicSlicerNext/resources/profiles
gen elegooslicer_cc2 run-el "$EL" Elegoo elegoo-centauri-carbon-2 "Elegoo Centauri Carbon 2 0.4 nozzle" "0.20mm Standard @Elegoo CC2 0.4 nozzle" "Elegoo PLA @ECC2"
gen anycubic_kobra3 run-ac "$AC" Anycubic anycubic-kobra-3 "Anycubic Kobra 3 0.4 nozzle" "0.20mm Standard @Anycubic Kobra 3 0.4 nozzle" "Anycubic PLA @Anycubic Kobra 3 0.4 nozzle"
echo "work dir: $W"
