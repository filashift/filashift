#!/usr/bin/env python3
"""Virtual-printer G-code checker (virtual bench, not hardware evidence).

Reads G-code written by the destination slicer and checks it against the printer FilaShift
converted for:
  bounds   extruding moves stay inside the slicer's printable_area (plus a small margin) and
           under printable_height; start/end/tool-change machine G-code is reported, not failed
  tools    every T<n> the file calls exists on the printer (profile "slots")
  heat     each nozzle that extrudes was given a working temperature first (M104/M109, or a
           temperature passed to a firmware start macro), and no target is above the
           filament's top range
  pauses   every planned pause/color change in the converted 3MF reaches the G-code, and the
           printer has a non-empty pause command

usage: check-gcode.py file.gcode [--profile client/public/profiles/<id>.json]
                      [--project converted.3mf --plate N] [--json]
exit 0 = pass (warnings allowed), 1 = at least one failure, 2 = usage/input error
It does not simulate adhesion, flow, clogs or toolhead collisions.
"""
import argparse, json, re, sys, zipfile

MARGIN = 2.0          # mm outside printable_area still accepted for model extrusion
COLD = 170.0          # extruding below this target is a cold extrusion
HOT_SLACK = 10.0      # allowed above the highest nozzle_temperature_range_high
FEATURE = re.compile(r"^;\s*(?:TYPE:|FEATURE:)\s*(.+)$")
MACHINE_BLOCKS = (  # comment markers that wrap machine (not model) G-code
    (re.compile(r"^;\s*(?:CP TOOLCHANGE START|MACHINE_START_GCODE_START|filament start gcode|TOOLCHANGE START)", re.I), True),
    (re.compile(r"^;\s*(?:CP TOOLCHANGE END|MACHINE_START_GCODE_END|filament end gcode|TOOLCHANGE END)", re.I), False),
)
WORD = re.compile(r"([A-Z])(-?\d*\.?\d+)")


def header(text):
    h = {}
    for m in re.finditer(r"^; ([a-z0-9_]+) = (.*)$", text, re.M):
        h.setdefault(m.group(1), m.group(2).strip())
    return h


def nums(v):
    out = []
    for p in re.split(r"[,;]", v or ""):
        try:
            out.append(float(p))
        except ValueError:
            pass
    return out


def area(v):
    pts = []
    for p in (v or "").split(","):
        if "x" in p:
            x, y = p.split("x")[:2]
            pts.append((float(x), float(y)))
    return pts


def inside(pt, poly):
    x, y = pt
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def near(pt, poly, margin):
    if inside(pt, poly):
        return True
    x, y = pt
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[i - 1]
        dx, dy = x2 - x1, y2 - y1
        L = dx * dx + dy * dy
        t = 0 if L == 0 else max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / L))
        if ((x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2) ** 0.5 <= margin:
            return True
    return False


def first_cmd(v):
    for ln in (v or "").replace("\\n", "\n").splitlines():
        ln = ln.split(";")[0].strip()
        if ln:
            return ln.split()[0].upper()
    return ""


def expected_pauses(project, plate):
    try:
        z = zipfile.ZipFile(project)
        names = [n for n in z.namelist() if n.lower().endswith("custom_gcode_per_layer.xml")]
        if not names:
            return 0
        xml = z.read(names[0]).decode("utf8", "ignore")
    except Exception:
        return None
    count = 0
    for blk in re.findall(r"<plate>(.*?)</plate>", xml, re.S):
        m = re.search(r'<plate_info id="(\d+)"', blk)
        if m and int(m.group(1)) != plate:
            continue
        # Orca/Bambu CustomGCode::Type: 0 ColorChange, 1 PausePrint, 2 ToolChange, 3 Template, 4 Custom
        count += len(re.findall(r'<layer [^>]*type="[01]"', blk))
    return count


def check(path, profile=None, project=None, plate=1):
    text = open(path, encoding="utf8", errors="ignore").read()
    h = header(text)
    fails, warns, notes = [], [], []
    poly = area(h.get("printable_area") or h.get("bed_shape"))
    if not poly and profile:
        bx, by = profile["bed"]
        poly = [(0, 0), (bx, 0), (bx, by), (0, by)]
    height = (nums(h.get("printable_height") or h.get("max_print_height")) or [profile["height"] if profile else 0])[0]
    if profile:
        bx, by = profile["bed"]
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        if poly and (abs((max(xs) - min(xs)) - bx) > 1 or abs((max(ys) - min(ys)) - by) > 1):
            warns.append(f"printable_area {max(xs)-min(xs):.0f}x{max(ys)-min(ys):.0f} differs from profile bed {bx:.0f}x{by:.0f}")
        if height and abs(height - profile["height"]) > 1:
            warns.append(f"printable_height {height} differs from profile height {profile['height']}")
    slots = profile.get("slots") if profile else None
    nozzles = max(1, len(nums(h.get("nozzle_diameter"))))
    if h.get("single_extruder_multi_material") == "1" or (profile and profile.get("extruders") == 1 and nozzles > 1 and profile.get("slots", 1) > 1):
        nozzles = 1  # MMU/AMS style: many filament slots feed one hot end
    hi = max(nums(h.get("nozzle_temperature_range_high")) or [0])
    pause_cmd = first_cmd(h.get("machine_pause_gcode", ""))

    # the slicer writes machine_pause_gcode for planned pauses and color_change_gcode for color
    # changes; without either, fall back to the common pause commands
    pause_cmds = {c for c in (pause_cmd, first_cmd(h.get("color_change_gcode", ""))) if c} or {"M600", "M601", "PAUSE"}
    absxyz, abse = True, True
    pos = {"X": 0.0, "Y": 0.0, "Z": 0.0, "E": 0.0}
    tool = 0
    target = {}            # nozzle index -> last target temperature
    macro_temp = None
    feature, machine = None, True   # everything before the first layer is machine G-code
    tools_called, extruded_tools = set(), set()
    out_model, out_machine, out_tower, cold, cold_machine, hot_machine = [], [], [], [], [], []
    ever_hot = 0.0
    bambu_tc = re.search(r"^M620 S\d", text, re.M) is not None
    maxz_model = 0.0
    pauses = 0
    layer_seen = False

    def noz(t):
        return t if nozzles > 1 else 0

    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        if line.startswith(";"):
            m = FEATURE.match(line)
            if m:
                feature = m.group(1).strip()
                if re.match(r"(?i)custom$", feature):
                    machine = True       # slicer marks start/end/tool-change G-code as Custom
                elif layer_seen:
                    machine = False
            if re.match(r"^;\s*(?:LAYER_CHANGE|CHANGE_LAYER)\b", line):
                layer_seen, feature = True, None  # layer-change G-code stays machine until a feature label
            for rx, state in MACHINE_BLOCKS:
                if rx.match(line):
                    machine = state
            if re.match(r"^;\s*(?:EXECUTABLE_BLOCK_END|MACHINE_END_GCODE_START|filament end gcode)", line, re.I) and layer_seen and "end" in line.lower() and "machine" in line.lower():
                machine = True
            continue
        code = line.split(";")[0].strip()
        if not code:
            continue
        up = code.upper()
        cmd = up.split()[0]
        if re.fullmatch(r"T\d+", cmd):
            t = int(cmd[1:])
            if t < 255:  # Bambu uses T255/T1000 as unload/park pseudo-tools
                tool = t
                tools_called.add(t)
            continue
        if cmd == "G90":
            absxyz = True
        elif cmd == "G91":
            absxyz = False
        elif cmd == "M82":
            abse = True
        elif cmd == "M83":
            abse = False
        elif cmd == "G92":
            for k, v in WORD.findall(up[3:]):
                if k in pos:
                    pos[k] = float(v)
        elif cmd == "G28":
            pos.update({"X": 0.0, "Y": 0.0, "Z": 0.0})
        elif cmd in ("M104", "M109"):
            w = dict(WORD.findall(up[4:]))
            if "S" in w:
                t = int(float(w["T"])) if "T" in w else tool
                if nozzles == 1 and not bambu_tc and "T" in w and t != tool:
                    continue  # one hot end: a T<n> other than the active tool is a heater it doesn't use
                if bambu_tc:  # Bambu tool changers address heads as M104 I<n>, nozzles as T<n>
                    key = ("I", int(float(w["I"]))) if "I" in w else ("T", t)
                    target[key] = float(w["S"])
                    ever_hot = max(ever_hot, float(w["S"]) if float(w["S"]) <= (hi or 999) + HOT_SLACK else 0)
                else:
                    target[noz(t)] = float(w["S"])
                if hi and float(w["S"]) > hi + HOT_SLACK:
                    msg = f"line {n}: nozzle target {w['S']} above filament range {hi:.0f}"
                    if machine or not feature:
                        hot_machine.append(msg)   # e.g. vendor nozzle-cleaning flush in start G-code
                    else:
                        fails.append(msg)
        elif (cmd in pause_cmds and cmd != "M400") or (pause_cmd == "M400" and re.match(r"^M400\s+U1\b", up)):
            if layer_seen:
                pauses += 1
        if cmd not in ("M104", "M109"):
            # vendor start macros/commands that take the nozzle temperature as a parameter,
            # e.g. START_PRINT EXTRUDER_TEMP=220, PRINT_START HOTEND=215, G9111 extruderTemp=220
            m = re.search(r"\b(?:EXTRUDER_?TEMP|EXTRUDER|HOTEND_?TEMP|HOTEND|NOZZLE_?TEMP|NOZZLE)=(\d+)", up)
            if m:
                macro_temp = float(m.group(1))
                for i in range(max(nozzles, 1)):
                    if target.get(i, 0) < COLD:
                        target[i] = macro_temp
        if cmd in ("G0", "G1", "G2", "G3"):
            w = dict(WORD.findall(up[len(cmd):]))
            new = dict(pos)
            for k in ("X", "Y", "Z"):
                if k in w:
                    new[k] = float(w[k]) if absxyz else pos[k] + float(w[k])
            de = 0.0
            if "E" in w:
                e = float(w["E"])
                de = e - pos["E"] if abse else e
                new["E"] = e if abse else pos["E"] + e
            extruding = de > 1e-5 and ("X" in w or "Y" in w)
            if extruding:
                extruded_tools.add(tool)
                if not machine and feature:
                    maxz_model = max(maxz_model, new["Z"])
                p = (new["X"], new["Y"])
                if poly and not near(p, poly, MARGIN):
                    if machine or not feature:
                        out_machine.append((n, p))
                    elif re.search(r"prime tower|wipe tower", feature, re.I):
                        out_tower.append((n, p))
                    else:
                        out_model.append((n, p))
                # Bambu M620/M621 tool changes reheat nozzles in firmware (M104 T there is a
                # physical-nozzle index, not the filament), so only require some nozzle to be hot
                # (H2C/H3C/P3C hot ends are swapped and reheated by the firmware on T<n>), so for
                # Bambu files only require that a print temperature was set at some point
                cur = max(ever_hot, max(target.values() or [0])) if bambu_tc else target.get(noz(tool), 0)
                if cur < COLD:
                    (cold_machine if machine or not feature else cold).append((n, tool, cur))
            pos = new

    # bounds
    if out_model:
        n, p = out_model[0]
        fails.append(f"{len(out_model)} model extrusion(s) outside the printable area, first at line {n} X{p[0]:.1f} Y{p[1]:.1f}")
    if out_machine:
        n, p = out_machine[0]
        warns.append(f"{len(out_machine)} machine G-code extrusion(s) outside printable area (purge/wipe), first at line {n} X{p[0]:.1f} Y{p[1]:.1f}")
    if out_tower:
        n, p = out_tower[0]
        warns.append(f"{len(out_tower)} prime/wipe tower extrusion(s) beyond the printable area, first at line {n} X{p[0]:.1f} Y{p[1]:.1f}")
    if height and maxz_model > height + 0.1:
        fails.append(f"model reaches Z{maxz_model:.2f}, above printable height {height}")
    # tools
    if slots is not None:
        bad = sorted(t for t in tools_called | extruded_tools if t >= max(slots, 1))
        if bad:
            fails.append(f"G-code calls tool(s) {', '.join('T%d' % t for t in bad)} but the printer has {slots} slot(s)")
    # heat
    if cold:
        n, t, s = cold[0]
        msg = f"{len(cold)} extrusion(s) with nozzle target below {COLD:.0f} C, first at line {n} (T{t}, target {s})"
        if macro_temp is None and not target:
            warns.append(msg + "; heating may live in a firmware macro the bench can't see")
        else:
            fails.append(msg)
    if hot_machine:
        warns.append(f"{len(hot_machine)} machine G-code nozzle target(s) above the filament range, first {hot_machine[0]}")
    if cold_machine:
        n, t, s = cold_machine[0]
        warns.append(f"{len(cold_machine)} machine G-code extrusion(s) below {COLD:.0f} C target (vendor purge/wipe), first at line {n} (T{t}, target {s})")
    # pauses
    exp = expected_pauses(project, plate) if project else None
    if exp:
        if not pause_cmd and pauses == 0:
            fails.append(f"project plans {exp} pause(s) but the printer profile has no pause G-code")
        elif pauses < exp:
            fails.append(f"project plans {exp} pause(s); G-code has {pauses}")
    notes.append(f"tools={sorted(tools_called) or [0]} extruded={sorted(extruded_tools)} pauses={pauses}"
                 + (f"/{exp}" if exp is not None else "") + f" maxZ={maxz_model:.2f}/{height}")
    return {"file": path, "printer": h.get("printer_model", "?"), "pass": not fails,
            "fail": fails, "warn": warns, "info": notes}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("gcode")
    ap.add_argument("--profile")
    ap.add_argument("--project")
    ap.add_argument("--plate", type=int, default=1)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    try:
        prof = json.load(open(a.profile)) if a.profile else None
        r = check(a.gcode, prof, a.project, a.plate)
    except (OSError, ValueError) as e:
        print(f"check-gcode: {e}", file=sys.stderr)
        sys.exit(2)
    if a.json:
        print(json.dumps(r))
    else:
        print(f"{'PASS' if r['pass'] else 'FAIL'} {r['printer']} {' '.join(r['info'])}")
        for f in r["fail"]:
            print("  fail:", f)
        for w in r["warn"]:
            print("  warn:", w)
    sys.exit(0 if r["pass"] else 1)


if __name__ == "__main__":
    main()
