#!/bin/bash
# slice every converted file in $1 with its destination slicer; print a table
# usage: slice-matrix.sh file.3mf  (one file; run many with xargs -P)
# json "slicer" == "PrusaSlicer" uses /tmp/slicers/prusa (text G-code); its line also reports the tool changes
# (T0..Tn), colour changes (M600) and whether the project carries painted triangles (mmu_segmentation).
for f in "$@"; do
  D=$(dirname $f); b=$(basename $f .3mf); j=$D/$b.json; o=$D/out_$b; rm -rf $o; mkdir -p $o
  sl=$(python3 -c "import json;print(json.load(open('$j'))['slicer'])")
  if [[ $sl == "Bambu Studio" ]]; then cli=/tmp/slicers/bambu; elif [[ $sl == "PrusaSlicer" ]]; then cli=/tmp/slicers/prusa; else cli=/tmp/slicers/orca; fi
  timeout 400 $cli $EXTRA --slice 0 --outputdir $o $f > $o/log.txt 2>&1
  python3 - "$o" "$b" "$sl" "$f" <<'PY'
import json,sys,glob,re,zipfile
o,b,sl,f=sys.argv[1:]
try: r=json.load(open(o+'/result.json'))
except Exception: r={'return_code':'none','error_string':'no result.json'}
g=sorted(glob.glob(o+'/*.gcode'))
info=''
if g:
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
done
