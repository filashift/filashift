#!/bin/bash
# slice every converted file in $1 with its destination slicer; print a table
# usage: slice-matrix.sh file.3mf  (one file; run many with xargs -P)
# json "slicer" == "PrusaSlicer" uses /tmp/slicers/prusa (text G-code); its line also reports the tool changes
# (T0..Tn), colour changes (M600) and whether the project carries painted triangles (mmu_segmentation).
# CHECK_GCODE=1 also runs scripts/check-gcode.py (virtual printer checks) on every plate's G-code;
# CLEAN_GCODE=1 deletes the G-code afterwards to save disk.
for f in "$@"; do
  D=$(dirname "$f"); b=$(basename "$f" .3mf); j=$D/$b.json; o=$D/out_$b; rm -rf -- "$o"; mkdir -p "$o"
  sl=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["slicer"])' "$j") || exit 1
  if [[ $sl == "Bambu Studio" ]]; then cli=/tmp/slicers/bambu; elif [[ $sl == "PrusaSlicer" ]]; then cli=${PRUSA_ADAPTER:-/tmp/slicers/prusa}; else cli=/tmp/slicers/orca; fi
  # Bambu Studio 2.9.2 two-nozzle slicing (H2D family, X2D) is not deterministic and can abort
  # (rc 134, sprintf overflow in its filament-total header); retry those up to 3 times and log it.
  tries=0
  while :; do
    timeout 400 "$cli" $EXTRA --slice 0 --outputdir "$o" "$f" > "$o/log.txt" 2>&1; rc=$?
    [[ $rc == 134 && $sl == "Bambu Studio" && $b =~ __bambu-lab-(h2d|x2d) && $tries -lt 3 ]] || break
    tries=$((tries+1)); echo "RETRY $b rc=134 attempt $tries" >&2
    find "$o" -mindepth 1 -delete
  done
  python3 - "$o" "$b" "$sl" "$f" "$rc" <<'PY'
import json,sys,glob,re,zipfile,os
o,b,sl,f,process_rc=sys.argv[1:]
try: r=json.load(open(o+'/result.json'))
except Exception: r={'return_code':int(process_rc) or 1,'error_string':'no result.json'}
g=sorted(glob.glob(o+'/*.gcode'))
def has_toolpath(p):
  if os.path.getsize(p)<=1000: return False
  with open(p,'rb') as stream:
    return any(re.match(rb'^G[123]\s',line) and re.search(rb'\s[XY]-?[\d.]',line) and re.search(rb'\sE-?[\d.]',line) for line in stream)
if r.get('return_code')==0 and (int(process_rc) or not g or not all(has_toolpath(p) for p in g)):
  r={'return_code':int(process_rc) or 1,'error_string':'process failed or no complete G-code output'}
info=''
if g and r.get('return_code')==0:
  t=open(g[0],errors='ignore').read()
  def h(k):
    m=re.search(r'^; '+k+r' = (.*)$',t,re.M); return m.group(1)[:40] if m else '?'
  if sl=='PrusaSlicer':
    tools=sorted({int(x) for x in re.findall(r'^T(\d+)\b',t[t.find(';LAYER_CHANGE'):],re.M)})
    z=zipfile.ZipFile(f); mm=sum(z.read(n).count(b'slic3rpe:mmu_segmentation="') for n in z.namelist() if n.endswith('.model'))
    info=f"perims={h('perimeters')} infill={h('fill_density')} printer={h('printer_model')} T={','.join(map(str,tools)) or '-'} M600={len(re.findall(r'^M600',t,re.M))} M601={len(re.findall(r'^M601',t,re.M))} mmu_seg={mm} cols={h('filament_colour')}"
  else:
    info=f"wall={h('wall_loops')} infill={h('sparse_infill_density')} printer={h('printer_model')} bed={h('curr_bed_type')} cols={h('filament_colour')}"
print(f"{b:55s} {sl[:5]} rc={r.get('return_code')} {'' if r.get('return_code')==0 else r.get('error_string','')[:90]} {info}")
PY
  if [[ $CHECK_GCODE == 1 ]]; then
    id=${b##*__}; pf="$(dirname "$0")/../client/public/profiles/$id.json"; [[ -f $pf ]] || pf=
    for g in "$o"/plate_*.gcode; do
      [[ -f $g ]] || continue; pl=$(basename "$g" .gcode); pl=${pl#plate_}
      echo "  check $b plate $pl: $(python3 "$(dirname "$0")/check-gcode.py" "$g" ${pf:+--profile "$pf"} --project "$f" --plate "$pl" | tr '\n' '|')"
    done
  fi
  if [[ $CLEAN_GCODE == 1 ]]; then rm -f "$o"/*.gcode; fi
done
