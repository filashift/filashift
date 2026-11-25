"""Build the printer-profile database from OrcaSlicer system profiles (AGPL-3.0 data, used as factual preset names/values).
Output: client/public/profiles/index.json + client/public/profiles/<id>.json"""
import json, os, re, glob, sys
ROOT = sys.argv[1]  # OrcaSlicer .../resources/profiles
OUT = sys.argv[2]
BAMBU_ROOT = sys.argv[3] if len(sys.argv) > 3 else None  # Bambu Studio .../resources/profiles (used for Bambu Lab printers)
os.makedirs(OUT, exist_ok=True)

VENDORS = ["BBL", "Snapmaker", "Flashforge", "Creality", "Elegoo", "Anycubic", "Prusa", "Qidi", "Sovol", "Voron", "Anker", "Artillery", "Kingroon", "Ratrig", "UltiMaker"]
VENDORS.append("WonderMaker")
VENDOR_LABEL = {"BBL": "Bambu Lab"}
# curated: simultaneous filament slots in a typical setup (multi-material unit or toolheads), slicer, notes
SLOTS = {
 "WonderMaker ZR": (4, "multi-color"),
 "Bambu Lab A1": (4, "AMS lite"), "Bambu Lab A1 mini": (4, "AMS lite"), "Bambu Lab P1P": (4, "AMS"), "Bambu Lab P1S": (4, "AMS"),
 "Bambu Lab P2S": (4, "AMS"), "Bambu Lab X1": (4, "AMS"), "Bambu Lab X1 Carbon": (4, "AMS"), "Bambu Lab X1E": (4, "AMS"),
 "Bambu Lab H2D": (4, "AMS"), "Bambu Lab H2D Pro": (4, "AMS"), "Bambu Lab H2S": (4, "AMS"), "Bambu Lab H2C": (4, "AMS"), "Bambu Lab X2D": (4, "AMS"), "Bambu Lab A2L": (4, "AMS"), "Bambu Lab H3C": (8, "PrintTools + AMS 3H"), "Bambu Lab P3C": (5, "PrintTools + AMS 3P"),
 "Snapmaker U1": (4, "4 toolheads"), "Snapmaker J1": (2, "IDEX"), "Snapmaker A350 Dual": (2, "dual extruder"), "Snapmaker A250 Dual": (2, "dual extruder"),
 "Flashforge AD5X": (4, "IFS"), "Flashforge Creator 5": (4, "toolchanger"), "Flashforge Creator 5 Pro": (4, "toolchanger"),
 "Creality K1C_CFS-C": (4, "CFS"), "Creality K1_CFS-C": (4, "CFS"), "Creality K1 Max_CFS-C": (4, "CFS"), "Creality K1 SE_CFS-C": (4, "CFS"),
 "Creality K2": (4, "CFS"), "Creality K2 Plus": (4, "CFS"), "Creality K2 Pro": (4, "CFS"), "Creality Hi": (4, "CFS"),
 "Elegoo Centauri Carbon 2": (4, "CANVAS"), "Elegoo Centauri 2": (4, "CANVAS"),
 "Anycubic Kobra 3": (4, "ACE Pro"), "Anycubic Kobra 3 Max": (4, "ACE Pro"), "Anycubic Kobra 3 V2": (4, "ACE Pro"), "Anycubic Kobra S1": (4, "ACE Pro"), "Anycubic Kobra S1 Max": (4, "ACE Pro"), "Anycubic Kobra X": (4, "multi-color"),
 "Prusa MK4 MMU3": (5, "MMU3"), "Prusa MK4 MMU3 HF": (5, "MMU3"), "Prusa CORE One MMU3": (5, "MMU3"), "Prusa XL 5T": (5, "5 toolheads"),
 "Prusa CORE One INDX 4T": (4, "INDX 4 tools"), "Prusa CORE One INDX 8T": (8, "INDX 8 tools"),
 "Qidi Q2": (4, "QIDI Box"), "Qidi X-Plus 4": (4, "QIDI Box"), "Qidi Q2C": (4, "QIDI Box"), "Qidi X-Max 4": (4, "QIDI Box"),
 "Sovol SV06 ACE": (4, "ACE"), "Sovol SV06 Plus ACE": (4, "ACE"),
}
POPULAR = {"Bambu Lab X1 Carbon", "Bambu Lab P1S", "Bambu Lab A1", "Bambu Lab A1 mini", "Bambu Lab H2D", "Bambu Lab P2S", "Bambu Lab P3C", "Snapmaker U1", "Flashforge AD5X", "Flashforge Adventurer 5M", "Flashforge Creator 5",
           "Creality K1C", "Creality K2 Plus", "Creality Ender-3 V3 SE", "Creality Hi", "Elegoo Centauri Carbon", "Elegoo Neptune 4 Pro", "Anycubic Kobra S1", "Anycubic Kobra 3",
           "Prusa MK4S", "Prusa CORE One", "Prusa MINI", "Qidi Q1 Pro", "Qidi X-Plus 4", "Sovol SV08"}
MIN_FIL = {"Snapmaker U1": 4}
POPULAR.add("WonderMaker ZR Ultra")


def frame_to_strips(area):
    """OrcaSlicer's Kobra 3 profile excludes the bed border as one "frame" polygon: the outer
    rectangle followed by the inner one (0x0,255x0,255x255,0x255,0x0,2x2,2x253,253x253,253x2,2x2).
    OrcaSlicer accepts it, but Anycubic Slicer Next fills that polygon, so every object is
    "too close to exclusion area" and the CLI refuses to slice. Rewrite it as the four border
    strips chained into one polygon, the form Anycubic Slicer Next's own Kobra 3 / 3 Max
    profiles and OrcaSlicer's Kobra 3 Max profile use. Other values are returned unchanged."""
    if not isinstance(area, list) or len(area) != 10:
        return area
    try:
        pts = [tuple(float(v) for v in p.split("x")) for p in area]
    except ValueError:
        return area
    outer, inner = pts[:4], pts[5:9]
    if pts[4] != pts[0] or pts[9] != pts[5]:
        return area
    box = lambda q: (min(x for x, _ in q), min(y for _, y in q), max(x for x, _ in q), max(y for _, y in q))
    X0, Y0, X1, Y1 = box(outer)
    a, b, c, d = box(inner)
    # both must be axis-aligned rectangles, the inner one strictly inside the outer one
    if {(x, y) for x, y in outer} != {(X0, Y0), (X1, Y0), (X1, Y1), (X0, Y1)}:
        return area
    if {(x, y) for x, y in inner} != {(a, b), (c, b), (c, d), (a, d)} or not (X0 < a < c < X1 and Y0 < b < d < Y1):
        return area
    f = lambda x, y: f"{x:g}x{y:g}"
    return [f(X0, Y0), f(a, Y0), f(a, Y1), f(X0, Y1),      # left strip
            f(X0, Y1), f(X1, Y1), f(X1, d), f(X0, d),      # top strip
            f(X1, Y1), f(c, Y1), f(c, Y0), f(X1, Y0),      # right strip
            f(X0, Y0), f(X0, b), f(X1, b), f(X1, Y0)]      # bottom strip
FIL_TYPES = ["PLA", "PETG", "ABS", "ASA", "TPU", "PLA-CF", "PETG-CF", "PA", "PA-CF", "PC", "PVA", "HIPS", "PET", "PCTG", "PP", "PPS", "BVOH", "PLA-AERO", "SUPPORT"]
MOTION_RE = re.compile(r"(_speed|_acceleration|_jerk)$")

def load_dir(d):
    out = {}
    for f in glob.glob(os.path.join(d, "**", "*.json"), recursive=True):
        try:
            j = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(j, dict) and "name" in j:
            out.setdefault(j.get("type", "?"), {})[j["name"]] = j
    return out

lib = load_dir(os.path.join(ROOT, "OrcaFilamentLibrary"))

def resolver(*pools):
    def res(name, kind, depth=0):
        for p in pools:
            j = p.get(kind, {}).get(name)
            if j:
                break
        else:
            return None
        base = {}
        if j.get("inherits") and depth < 20:
            b = res(j["inherits"], kind, depth + 1)
            if b: base = dict(b)
        for k, v in j.items():
            if k in ("inherits", "type", "from", "setting_id", "instantiation", "filament_id", "base_id", "name", "description"):
                continue
            base[k] = v
        base["__name"] = name
        base["__filament_id"] = j.get("filament_id") or base.get("__filament_id")
        return base
    return res

def cond_ok(cond, M):
    if not cond: return True
    def val(key, idx=None):
        v = M.get(key, "")
        if isinstance(v, list): v = v[int(idx) if idx is not None else 0] if v else ""
        return v
    expr = cond
    def rx(m):
        neg = m.group(2) == "!~"
        return f"({'not ' if neg else ''}__re.search(r{m.group(3)!r}, str(__val({m.group(1)!r}))))"
    expr = re.sub(r"([a-z_]+)\s*(=~|!~)\s*/(.*?)/(?=\s|\)|$)", rx, expr)
    def cmp(m):
        key, idx, op, rhs = m.group(1), m.group(2), m.group(3), m.group(4)
        lhs = f"__val({key!r},{idx if idx else 'None'})"
        if rhs.startswith('"'):
            return f"(str({lhs}) {op} {rhs})"
        return f"(__num({lhs}) {op} {rhs})"
    expr = re.sub(r"\b([a-z_]+)(?:\[(\d+)\])?\s*(==|!=|<=|>=|<|>)\s*(\"[^\"]*\"|[-0-9.]+)", cmp, expr)
    expr = expr.replace("!(", "not (")
    try:
        return bool(eval(expr, {"__re": re, "__val": val, "__num": lambda x: float(str(x).rstrip('%') or 0)}))
    except Exception as e:
        return False

def compatible(P, pick, M):
    cp = P.get("compatible_printers") or []
    if cp: return pick in cp
    return cond_ok(P.get("compatible_printers_condition", ""), M)

NOZZLES = ("0.2", "0.4", "0.6", "0.8")
index = []
for vendor in VENDORS:
    vroot = BAMBU_ROOT if (vendor == "BBL" and BAMBU_ROOT) else ROOT
    if vendor == "WonderMaker":
        vroot = os.environ.get("WONDER_ROOT", ROOT)
        manifest = os.path.join(vroot, "WonderMaker.json")
        if not os.path.exists(manifest) or json.load(open(manifest)).get("version") != "02.03.02.60":
            sys.exit("Set WONDER_ROOT to the resources/profiles folder from Wonderprint-Orca V2.3.2-Pre (profile 02.03.02.60).")
    vdir = os.path.join(vroot, vendor)
    if not os.path.isdir(vdir): continue
    pool = load_dir(vdir)
    res = resolver(pool, load_dir(os.path.join(vroot, "OrcaFilamentLibrary"))) if vendor == "WonderMaker" else resolver(pool, lib) if vroot == ROOT else resolver(pool)
    vj = json.load(open(os.path.join(vroot, vendor + ".json")))
    models = [m["name"] for m in vj.get("machine_model_list", [])]
    machines = {n: j for n, j in pool.get("machine", {}).items() if str(j.get("instantiation")) == "true"}
    for model in models:
        if vendor == "WonderMaker" and model not in ("WonderMaker ZR", "WonderMaker ZR Ultra", "WonderMaker ZR Ultra S"): continue
        if "COPY MODE" in model or "MIRROR MODE" in model: continue
        cands = [n for n, j in machines.items() if j.get("printer_model") == model or res(n, "machine").get("printer_model") == model]
        def nz(n):
            m = res(n, "machine"); d = m.get("nozzle_diameter", ["0"]); return str(d[0] if isinstance(d, list) else d), m
        picks = {}
        for n in cands:
            d, m = nz(n)
            v = str(m.get("printer_variant", ""))
            if d in NOZZLES and "+" not in v and "+" not in n and d not in picks: picks[d] = n
        if "0.4" not in picks: continue
        built = []
        for nozzle in sorted(picks, key=lambda d: (d != "0.4", float(d))):
          if vendor == "WonderMaker" and nozzle != "0.4": continue
          pick = picks[nozzle]
          M = res(pick, "machine")
          # processes compatible
          procs = []
          for pn, pj in pool.get("process", {}).items():
              if str(pj.get("instantiation")) != "true": continue
              P = res(pn, "process")
              if compatible(P, pick, M):
                  try: lh = float(P.get("layer_height", "0"))
                  except: continue
                  procs.append((pn, lh, P))
          if not procs: continue
          dflt = M.get("default_print_profile", "")
          # filaments compatible
          fils = {}
          for fn, fj in list(pool.get("filament", {}).items()):
              if str(fj.get("instantiation")) != "true": continue
              F = res(fn, "filament")
              if not compatible(F, pick, M) or not (F.get("compatible_printers") or F.get("compatible_printers_condition")): continue
              t = (F.get("filament_type") or ["PLA"]); t = t[0] if isinstance(t, list) else t
              t = t.upper()
              # 2.85 mm filament (H3C/P3C TPU PrintTool) is its own entry, never the 1.75 mm default
              dia = F.get("filament_diameter") or ["1.75"]; dia = dia[0] if isinstance(dia, list) else dia
              if str(dia) == "2.85" and "TPU285" in json.dumps(M.get("extruder_variant_list", "")): t += "-2.85"
              fils.setdefault(t, []).append((fn, F))
          def score(fn):
              s = 0; l = fn.lower()
              if "generic" in l: s -= 3
              if "basic" in l: s -= 2
              for bad in ("silk", "matte", "hf", "high speed", "cf", "gf", "translucent", "marble", "sparkle", "glow", "wood", "galaxy", "metal", "aero", "lite", "tough", "+", "pro", "@0.2", "support for", "rapid", "snapspeed"):
                  if bad in l: s += 1
              return (s, len(fn))
          dff = M.get("default_filament_profile") or []
          dff = dff[0] if isinstance(dff, list) and dff else (dff if isinstance(dff, str) else "")
          fil_out = {}
          for t, lst in fils.items():
              lst.sort(key=lambda x: score(x[0]))
              if dff and any(fn == dff for fn, _ in lst): best = next(x for x in lst if x[0] == dff)
              else: best = lst[0]
              fn, F = best
              fil_out[t] = {"name": fn, "id": F.get("__filament_id") or "", "values": {k: v for k, v in F.items() if not k.startswith("__") and k not in ("compatible_printers", "compatible_printers_condition", "version")}}
          for t in FIL_TYPES:
              if t in fil_out: continue
              gname = f"Generic {t} @System"
              g = res(gname, "filament")
              if g: fil_out[t] = {"name": gname, "id": g.get("__filament_id") or "", "generic": True, "values": {k: v for k, v in g.items() if not k.startswith("__") and k not in ("compatible_printers", "compatible_printers_condition", "version")}}
          procs.sort(key=lambda x: x[1])
          proc_out = []
          for pn, lh, P in procs:
              proc_out.append({"name": pn, "layer_height": lh, "default": pn == dflt,
                               "values": {k: v for k, v in P.items() if not k.startswith("__") and k not in ("compatible_printers", "compatible_printers_condition", "version")}})
          machine_values = {k: v for k, v in M.items() if not k.startswith("__")}
          # older profiles store point/number vectors as one comma string; normalise to lists
          for vk in ("printable_area", "bed_exclude_area", "extruder_offset", "thumbnails", "head_wrap_detect_zone", "wrapping_exclude_area"):
              if isinstance(machine_values.get(vk), str):
                  machine_values[vk] = [x.strip() for x in machine_values[vk].split(",") if x.strip()]
          if vendor == "Anycubic" and "bed_exclude_area" in machine_values:
              machine_values["bed_exclude_area"] = frame_to_strips(machine_values.get("bed_exclude_area"))
          M = dict(M, **{k: machine_values[k] for k in ("printable_area",) if k in machine_values})
          area = M.get("printable_area") or []
          try:
              xs = [float(p.split("x")[0]) for p in area]; ys = [float(p.split("x")[1]) for p in area]
              bed = [round(max(xs) - min(xs), 1), round(max(ys) - min(ys), 1)]
          except Exception:
              bed = [0, 0]
          nzd = M.get("nozzle_diameter", ["0.4"])
          extruders = len(nzd) if isinstance(nzd, list) else 1
          slots, unit = SLOTS.get(model, (extruders if extruders > 1 else 1, f"{extruders} extruders" if extruders > 1 else "single extruder"))
          base = re.sub(r"[^a-z0-9]+", "-", model.lower()).strip("-")
          pid = base if nozzle == "0.4" else f"{base}-n{nozzle.replace('.', '')}"
          label = VENDOR_LABEL.get(vendor, vendor)
          short = model[len(label):].strip() if model.startswith(label) else model
          rec = {"id": pid, "vendor": label, "model": model, "short": short, "machine": pick, "printer_model": M.get("printer_model", model),
                 "printer_variant": M.get("printer_variant", "0.4"), "bed": bed, "height": float(M.get("printable_height", 0) or 0),
                 "extruders": extruders, "slots": slots, "slotUnit": unit, "minFilaments": MIN_FIL.get(model, 0),
                 "flavor": M.get("gcode_flavor", ""), "slicer": "Bambu Studio" if vendor == "BBL" else "OrcaSlicer",
                 "profileVersion": vj.get("version", ""),
                 "popular": model in POPULAR, "defaultProcess": dflt, "nozzle": nozzle, "base": base,
                 "machineValues": machine_values, "processes": proc_out, "filaments": fil_out}
          json.dump(rec, open(os.path.join(OUT, pid + ".json"), "w"), separators=(",", ":"))
          if nozzle == "0.4": main = {k: rec[k] for k in ("id", "vendor", "model", "short", "machine", "bed", "height", "extruders", "slots", "slotUnit", "slicer", "popular")} | {"processes": len(proc_out), "filamentTypes": sorted(fil_out)}
          built.append(nozzle)
        if "0.4" not in built: continue
        if len(built) > 1: main["nozzles"] = sorted(built, key=float)
        index.append(main)
index.sort(key=lambda r: (r["vendor"], r["model"]))
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), indent=0)
print(len(index), "printers")

# PrusaSlicer step: native PrusaSlicer presets (profiles/prusa/), `prusa` flags and the PrusaSlicer-only printers.
# Without it the Prusa printers would silently fall back to OrcaSlicer output, so it is required
# (PRUSA_SRC = folder with PrusaResearch-<ver>.ini + Preset.cpp + PrintConfig.cpp, default ~/slicers;
# needs the prusa-slicer CLI). SKIP_PRUSA=1 skips it on purpose.
if os.environ.get("SKIP_PRUSA") != "1":
    import glob, shutil, subprocess
    psrc = os.path.expanduser(os.environ.get("PRUSA_SRC", "~/slicers"))
    if not glob.glob(os.path.join(psrc, "PrusaResearch-*.ini")) or not shutil.which("prusa-slicer"):
        sys.exit(f"PrusaSlicer step needs {psrc}/PrusaResearch-<ver>.ini (+ Preset.cpp, PrintConfig.cpp) and the prusa-slicer CLI; "
                 "see OPERATIONS.md 'Native PrusaSlicer output', or set SKIP_PRUSA=1")
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_prusa_profiles.py"), psrc, OUT], check=True)
