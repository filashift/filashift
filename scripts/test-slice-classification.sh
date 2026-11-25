#!/usr/bin/env bash
# Focused harness tests. Synthetic adapter results are NOT printer evidence.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
export PRUSA_ADAPTER="$tmp/adapter"
cat >"$PRUSA_ADAPTER" <<'ADAPTER'
#!/usr/bin/env bash
while [[ $1 != --outputdir ]]; do shift; done
out=$2
printf '{"return_code":%d,"error_string":"fixture"}' "$NATIVE_RC" >"$out/result.json"
head -c "$BYTES" /dev/zero >"$out/plate_1.gcode"
if [[ ${PATH_MOVE:-yes} == yes ]]; then printf '\nG1 X1 Y1 E0.2\n' >>"$out/plate_1.gcode"; fi
exit "$ADAPTER_RC"
ADAPTER
chmod +x "$PRUSA_ADAPTER"
f="$tmp/case__model.3mf"
python3 -m zipfile -c "$f" "$PRUSA_ADAPTER"
printf '%s' '{"slicer":"PrusaSlicer","lines":[{"level":"warn","text":"model larger than the bed"}]}' >"${f%.3mf}.json"
check() {
  local row
  row=$(NATIVE_RC="$1" BYTES="$2" ADAPTER_RC="$3" bash "$root/scripts/slice-matrix.sh" "$f")
  [[ "$row" == *"Prusa rc=$4 "* ]] || { echo "Unexpected classification: $row" >&2; exit 1; }
}
check 139 2000 0 139
check 0 0 0 1
check 0 50 0 1
check 0 2000 7 7
check 0 2000 0 0
PATH_MOVE=no check 0 2000 0 1
echo "Six classification checks passed."
