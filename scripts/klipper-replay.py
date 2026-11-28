#!/usr/bin/env python3
"""Klipper batch-mode replay spike (virtual bench, not hardware evidence).

Feeds slicer G-code through the real Klipper host code (klippy.py in batch mode) using the
motion limits and macro names from a vendor's published printer.cfg. Klipper then rejects
what the firmware would reject: moves outside position_min/position_max, extrusions over
max_extrude_cross_section / max_extrude_only_distance, and commands the firmware doesn't know.

Batch mode gets no replies from a microcontroller, so homing, probing and temperature waits
can't run. The replay therefore sets the kinematic position directly, turns M109/M190 into
non-waiting M104/M140, and replaces vendor macros with no-op stubs of the same name (an
unknown command still fails). Heater checks stay in scripts/check-gcode.py.

usage: klipper-replay.py file.gcode vendor-printer.cfg [vendor-macros.cfg ...]
       env KLIPPER=/tmp/klipper (checkout with out/klipper.dict built for CONFIG_MACH_LINUX)
exit 0 = Klipper accepted every command, 1 = Klipper reported an error, 2 = setup error
"""
import os, re, subprocess, sys, tempfile

KLIPPER = os.environ.get("KLIPPER", "/tmp/klipper")
STD = {  # commands mainline Klipper implements natively (or via the sections written below)
    "G0", "G1", "G2", "G3", "G4", "G10", "G11", "G17", "G20", "G21", "G28", "G90", "G91", "G92",
    "M17", "M18", "M73", "M82", "M83", "M84", "M104", "M105", "M106", "M107", "M109", "M112",
    "M114", "M115", "M117", "M118", "M140", "M190", "M204", "M220", "M221", "M400", "M141",
    "SET_VELOCITY_LIMIT", "SET_PRESSURE_ADVANCE", "SET_PRINT_STATS_INFO", "EXCLUDE_OBJECT_DEFINE",
    "EXCLUDE_OBJECT_START", "EXCLUDE_OBJECT_END", "EXCLUDE_OBJECT", "SET_FAN_SPEED", "RESPOND",
    "SET_GCODE_OFFSET", "SAVE_GCODE_STATE", "RESTORE_GCODE_STATE", "SET_KINEMATIC_POSITION",
    "PAUSE", "RESUME", "CLEAR_PAUSE", "CANCEL_PRINT", "TURN_OFF_HEATERS", "SET_HEATER_TEMPERATURE",
    "TEMPERATURE_WAIT", "SET_IDLE_TIMEOUT", "STATUS", "HELP", "M486",
}


def sections(text):
    cur, out = None, {}
    for raw in text.splitlines():
        line = raw.split("#")[0].rstrip()
        m = re.match(r"^\[([^\]]+)\]", line)
        if m:
            cur = m.group(1).strip()
            out.setdefault(cur, {})
            continue
        m = re.match(r"^([A-Za-z_0-9]+)\s*[:=]\s*(.*)$", line)
        if cur and m and not raw.startswith((" ", "\t")):
            out[cur][m.group(1).lower()] = m.group(2).strip()
    return out


def build_cfg(cfgs, used):
    S = {}
    macros = set()
    for c in cfgs:
        t = open(c, encoding="utf8", errors="ignore").read()
        for k, v in sections(t).items():
            S.setdefault(k, {}).update(v)
        macros |= {m.upper() for m in re.findall(r"^\[gcode_macro\s+([^\]\s]+)\s*\]", t, re.M)}
        if re.search(r"^\[include\s+timelapse\.cfg\]", t, re.M):
            # moonraker-timelapse ships this file on the printer; it isn't in vendor repos
            macros |= {"TIMELAPSE_TAKE_FRAME", "TIMELAPSE_RENDER", "_SET_TIMELAPSE_SETUP"}
    p = S.get("printer", {})
    kin = p.get("kinematics", "cartesian")
    if kin not in ("cartesian", "corexy", "corexz"):
        raise SystemExit(f"kinematics {kin} not supported by the spike")
    out = ["[mcu]", "serial: /dev/null", "",
           "[printer]", f"kinematics: {kin}"]
    for k in ("max_velocity", "max_accel", "max_z_velocity", "max_z_accel", "square_corner_velocity"):
        if k in p:
            out.append(f"{k}: {p[k]}")
    pin = iter(range(0, 400))
    def gp():
        return f"gpiochip0/gpio{next(pin)}"
    for ax in ("x", "y", "z"):
        s = S.get(f"stepper_{ax}", {})
        lo, hi = s.get("position_min", "0"), s.get("position_max")
        if hi is None:
            raise SystemExit(f"stepper_{ax} has no position_max")
        out += ["", f"[stepper_{ax}]", f"step_pin: {gp()}", f"dir_pin: {gp()}", f"enable_pin: {gp()}",
                f"microsteps: {s.get('microsteps', '16')}", f"rotation_distance: {s.get('rotation_distance', '40')}",
                f"endstop_pin: {gp()}", f"position_endstop: {s.get('position_endstop', lo)}",
                f"position_min: {lo}", f"position_max: {hi}"]
    e = S.get("extruder", {})
    out += ["", "[extruder]", f"step_pin: {gp()}", f"dir_pin: {gp()}", f"enable_pin: {gp()}",
            "microsteps: 16", f"rotation_distance: {e.get('rotation_distance', '8')}",
            f"nozzle_diameter: {e.get('nozzle_diameter', '0.4')}", f"filament_diameter: {e.get('filament_diameter', '1.75')}",
            f"heater_pin: {gp()}", "sensor_type: EPCOS 100K B57560G104F", "sensor_pin: analog0",
            "control: watermark", "min_temp: -273", f"max_temp: {e.get('max_temp', '300')}",
            "min_extrude_temp: -273"]  # no temperature readings in batch mode; check-gcode.py covers heat
    for k in ("max_extrude_only_distance", "max_extrude_cross_section", "max_extrude_only_velocity",
              "max_extrude_only_accel", "pressure_advance"):
        if k in e:
            out.append(f"{k}: {e[k]}")
    out += ["", "[heater_bed]", f"heater_pin: {gp()}", "sensor_type: EPCOS 100K B57560G104F", "sensor_pin: analog1",
            "control: watermark", "min_temp: -273", f"max_temp: {S.get('heater_bed', {}).get('max_temp', '130')}",
            "", "[fan]", f"pin: {gp()}", "", "[pause_resume]", "", "[exclude_object]", "",
            "[force_move]", "enable_force_move: True", "", "[display_status]", "", "[respond]", "",
            "[gcode_macro CANCEL_PRINT]", "rename_existing: BASE_CANCEL_PRINT", "gcode:", "  BASE_CANCEL_PRINT"]
    stubs = sorted(macros - STD)
    for m in stubs:
        if m in ("PAUSE", "RESUME", "CANCEL_PRINT"):
            continue
        out += ["", f"[gcode_macro {m}]", "gcode:", "  M118 stub " + m]
    return "\n".join(out) + "\n", macros


def prep(gcode):
    lines, used = [], set()
    lines.append("SET_KINEMATIC_POSITION X=0 Y=0 Z=0")
    for raw in open(gcode, encoding="utf8", errors="ignore"):
        code = raw.split(";")[0].strip()
        if not code:
            continue
        cmd = code.split()[0].upper()
        used.add(cmd)
        if cmd == "G28":
            lines.append("SET_KINEMATIC_POSITION X=0 Y=0 Z=0"); continue
        if cmd in ("M109", "M190"):
            code = ("M104" if cmd == "M109" else "M140") + code[4:]
        if cmd.startswith("TEMPERATURE_WAIT"):
            continue
        lines.append(code)
    return "\n".join(lines) + "\n", used


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    gcode, cfgs = sys.argv[1], sys.argv[2:]
    dic = os.path.join(KLIPPER, "out", "klipper.dict")
    if not os.path.exists(dic):
        print(f"klipper-replay: build {dic} first (CONFIG_MACH_LINUX=y; make)", file=sys.stderr); sys.exit(2)
    body, used = prep(gcode)
    cfg, macros = build_cfg(cfgs, used)
    unknown = sorted(c for c in used - STD - macros if not re.fullmatch(r"[GMT]\d+", c) or c in ("M600", "M601"))
    with tempfile.TemporaryDirectory() as d:
        open(f"{d}/printer.cfg", "w").write(cfg)
        open(f"{d}/in.gcode", "w").write(body)
        r = subprocess.run([sys.executable, os.path.join(KLIPPER, "klippy", "klippy.py"), f"{d}/printer.cfg",
                            "-i", f"{d}/in.gcode", "-o", f"{d}/out.serial", "-d", dic, "-l", f"{d}/klippy.log"],
                           capture_output=True, text=True, timeout=1800)
        log = open(f"{d}/klippy.log", errors="ignore").read() if os.path.exists(f"{d}/klippy.log") else r.stderr
    errs = [l for l in log.splitlines() if re.search(r"^!!|Move out of range|Move exceeds maximum extrusion|Extrude (?:only move too long|below)|Unknown command|Error|Traceback", l)]
    errs = [l for l in errs if "Unknown command" in l or "stub" not in l]
    for c in unknown:
        if not any(c in l for l in errs):
            errs.append(f"Unknown command:\"{c}\" (not native Klipper and not a macro in the vendor config)")
    print(("PASS" if not errs else "FAIL") + f" klipper replay {os.path.basename(gcode)}: {len(body.splitlines())} commands,"
          f" {len(macros)} vendor macros stubbed")
    seen = {}
    for l in errs:
        k = re.sub(r"\d+\.\d+", "#", l.strip())[:160]
        seen[k] = seen.get(k, 0) + 1
    for k, n in list(seen.items())[:10]:
        print("  ", k, f"(x{n})" if n > 1 else "")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
