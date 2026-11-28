#!/usr/bin/env python3
"""Self-test for scripts/check-gcode.py using small synthetic G-code files (no slicer needed).
usage: python3 scripts/test-check-gcode.py"""
import importlib.util, os, sys, tempfile, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("cg", os.path.join(HERE, "check-gcode.py"))
cg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cg)

HEAD = """; printable_area = 0x0,200x0,200x200,0x200
; printable_height = 100
; nozzle_diameter = {noz}
; nozzle_temperature_range_high = 240
; machine_pause_gcode = {pause}
"""
PROFILE = {"bed": [200, 200], "height": 100, "extruders": 1, "slots": 1}


def gcode(body, noz="0.4", pause="M600"):
    f = tempfile.NamedTemporaryFile("w", suffix=".gcode", delete=False)
    f.write(HEAD.format(noz=noz, pause=pause) + body)
    f.close()
    return f.name


def project(pauses):
    f = tempfile.NamedTemporaryFile(suffix=".3mf", delete=False)
    f.close()
    layers = "".join(f'<layer top_z="{2 + i}" type="1" gcode="M600"/>' for i in range(pauses))
    with zipfile.ZipFile(f.name, "w") as z:
        z.writestr("Metadata/custom_gcode_per_layer.xml",
                   f'<custom_gcodes_per_layer><plate><plate_info id="1"/>{layers}</plate></custom_gcodes_per_layer>')
    return f.name


GOOD = """M104 S210
G28
G1 X-5 Y-3 E5 ; purge before the first layer
;LAYER_CHANGE
;TYPE:Outer wall
G1 Z0.2
G1 X10 Y10 E1
G1 X190 Y10 E2
;LAYER_CHANGE
G1 Z5
M600
;TYPE:Outer wall
G1 X190 Y190 E3
"""
cases = [
    ("clean single-extruder file with purge outside the bed", gcode(GOOD), PROFILE, project(1), True, None),
    ("model extrusion off the bed", gcode(GOOD + "G1 X230 Y100 E4\n"), PROFILE, None, False, "outside the printable area"),
    ("model above build height", gcode(GOOD + "G1 Z120\nG1 X20 Y20 E5\n"), PROFILE, None, False, "above printable height"),
    ("tool the printer doesn't have", gcode(GOOD.replace("M600", "T1")), PROFILE, None, False, "calls tool(s) T1"),
    ("cold extrusion", gcode(GOOD.replace("M104 S210", "M104 S0")), PROFILE, None, False, "below 170"),
    ("too hot for the filament", gcode(GOOD.replace(";TYPE:Outer wall\nG1 Z0.2", ";TYPE:Outer wall\nM104 S300\nG1 Z0.2")), PROFILE, None, False, "above filament range"),
    ("vendor high-temperature flush in start G-code", gcode(GOOD.replace("M104 S210", "M104 S300\nM104 S210")), PROFILE, None, True, None),
    ("planned pause missing from G-code", gcode(GOOD.replace("M600\n", "")), PROFILE, project(1), False, "G-code has 0"),
    ("printer with no pause command", gcode(GOOD.replace("M600\n", ""), pause=""), PROFILE, project(1), False, "no pause G-code"),
    ("second toolhead never heated", gcode(GOOD.replace("M600", "T1"), noz="0.4,0.4"),
     dict(PROFILE, extruders=2, slots=2), None, False, "T1, target 0"),
    ("temperature set by a firmware start macro", gcode(GOOD.replace("M104 S210", "PRINT_START EXTRUDER_TEMP=215")),
     PROFILE, None, True, None),
    ("relative extrusion and positioning", gcode("M83\nM104 S210\n;LAYER_CHANGE\n;TYPE:Inner wall\nG1 X100 Y100 E1\nG91\nG1 X50 E1\nG90\n"),
     PROFILE, None, True, None),
]
bad = 0
for name, g, prof, proj, want, needle in cases:
    r = cg.check(g, prof, proj, 1)
    ok = r["pass"] == want and (needle is None or any(needle in f for f in r["fail"]))
    print(("ok  " if ok else "FAIL"), name, "" if ok else r)
    bad += not ok
    os.unlink(g)
    if proj:
        os.unlink(proj)
print(f"{len(cases) - bad}/{len(cases)} passed")
sys.exit(1 if bad else 0)
