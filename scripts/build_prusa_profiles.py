#!/usr/bin/env python3
"""Build PrusaSlicer system-preset data for the "Output for: PrusaSlicer" option.

Reads the official PrusaSlicer profile bundle (resources/profiles/PrusaResearch.ini, AGPL-3.0 data used as
factual preset names/values) plus the option tables from the PrusaSlicer sources (Preset.cpp, PrintConfig.cpp),
flattens every preset exactly like PresetBundle::flatten_configbundle_hierarchy (child wins, last parent wins),
asks the PrusaSlicer CLI which print/filament presets are compatible with each printer, and writes

  client/public/profiles/prusa/_common.json   option defaults + option kinds (vector / string vector, filament / extruder keys)
  client/public/profiles/prusa/<id>.json      per FilaShift printer variant: printer preset, print presets, filament per type

It also marks Prusa entries in index.json with "prusa": true and adds PrusaSlicer-only printers (MK4S MMU3, MK3.9, ...)
that OrcaSlicer has no profile for (cloned from the nearest Orca profile, "slicer": "PrusaSlicer", "prusaOnly": true).
Run it AFTER scripts/build_profiles.py (that script rewrites index.json).

usage: scripts/build_prusa_profiles.py PRUSA_SRC_DIR [client/public/profiles]
  PRUSA_SRC_DIR holds PrusaResearch.ini, Preset.cpp and PrintConfig.cpp from the same PrusaSlicer tag, e.g.
  https://raw.githubusercontent.com/prusa3d/PrusaSlicer/version_2.9.7/resources/profiles/PrusaResearch.ini
  https://raw.githubusercontent.com/prusa3d/PrusaSlicer/version_2.9.7/src/libslic3r/Preset.cpp
  https://raw.githubusercontent.com/prusa3d/PrusaSlicer/version_2.9.7/src/libslic3r/PrintConfig.cpp
  The prusa-slicer CLI (2.9.x) must be on PATH (used for defaults and compatibility queries).
"""
import json, os, re, subprocess, sys, tempfile, copy

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "client/public/profiles"
INI = os.path.join(SRC, "PrusaResearch.ini") if os.path.exists(os.path.join(SRC, "PrusaResearch.ini")) else os.path.join(SRC, "PrusaResearch-2.9.7.ini")
CLI = os.environ.get("PRUSA_SLICER", "prusa-slicer")
PRUSA_VERSION = os.environ.get("PRUSA_VERSION", "2.9.7")
os.makedirs(os.path.join(OUT, "prusa"), exist_ok=True)

# ---------- option tables from the sources ----------
pre = open(os.path.join(SRC, "Preset.cpp"), encoding="utf-8").read()
def arr(name):
    m = re.search(r"static std::vector<std::string> " + name + r" \{(.*?)\};", pre, re.S)
    body = re.sub(r"//[^\n]*|/\*.*?\*/", "", m.group(1), flags=re.S)
    return re.findall(r'"([^"]+)"', body)
PRINT_KEYS = arr("s_Preset_print_options")
FIL_KEYS = arr("s_Preset_filament_options")
MACHINE_KEYS = arr("s_Preset_machine_limits_options")
PRINTER_KEYS = arr("s_Preset_printer_options")
pc = open(os.path.join(SRC, "PrintConfig.cpp"), encoding="utf-8").read()
TYPES = {k: t for k, t in re.findall(r'this->add(?:_nullable)?\("(\w+)",\s*co(\w+)\)', pc)}
m = re.search(r"const std::vector<std::string>& Preset::nozzle_options\(\)\s*\{\s*return print_config_def\.extruder_option_keys\(\);", pre)
# extruder option keys (PrintConfigDef::init_extruder_option_keys)
m = re.search(r"void PrintConfigDef::init_extruder_option_keys\(\)\s*\{(.*?)\n\}", pc, re.S)
EXT_KEYS = re.findall(r'"(\w+)"', m.group(1).split("m_extruder_retract_keys")[0])
VECTOR_TYPES = {"Floats", "Ints", "Bools", "Percents", "FloatsOrPercents", "Strings", "Points", "Enums"}
def kind(k):
    t = TYPES.get(k, "")
    if t == "Strings": return 2
    if t in VECTOR_TYPES: return 1
    return 0
SKIP = {"compatible_printers", "compatible_printers_condition", "compatible_prints", "compatible_prints_condition", "inherits", "renamed_from"}

# ---------- PrusaSlicer string escaping (escape_strings_cstyle / unescape_strings_cstyle) ----------
def unescape_strings(s):
    out, i, n = [], 0, len(s)
    if s == "": return [""]
    while True:
        while i < n and s[i] in " \t": i += 1
        cur = ""
        if i < n and s[i] == '"':
            i += 1
            while i < n and s[i] != '"':
                if s[i] == "\\" and i + 1 < n:
                    i += 1; cur += {"n": "\n", "r": "\r", "t": "\t"}.get(s[i], s[i])
                else: cur += s[i]
                i += 1
            i += 1
            while i < n and s[i] != ";": i += 1
        else:
            j = s.find(";", i); j = n if j < 0 else j
            cur = s[i:j].strip(); i = j
        out.append(cur)
        if i >= n: break
        i += 1  # skip ;
        if i >= n: out.append(""); break
    return out
def escape_strings(v):
    def q(x, single):
        if (single and x == "") or any(c in x for c in ' ;\t\\"\r\n'):
            return '"' + x.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "\\r") + '"'
        return x
    return ";".join(q(x, len(v) == 1) for x in v)
def split_vec(k, s):
    return unescape_strings(s) if kind(k) == 2 else [x for x in s.split(",")] if s != "" else []
def join_vec(k, v):
    return escape_strings(v) if kind(k) == 2 else ",".join(v)

# ---------- ini bundle ----------
sections = {}
cur = None
for line in open(INI, encoding="utf-8"):
    line = line.rstrip("\n")
    if line.startswith("[") and line.endswith("]"):
        t, _, name = line[1:-1].partition(":")
        cur = sections.setdefault((t, name), {}); continue
    if cur is None or not line.strip() or line.lstrip().startswith("#"): continue
    k, eq, v = line.partition("=")
    if eq: cur[k.strip()] = v.strip()
vendor = sections[("vendor", "")]
CONFIG_VERSION = vendor.get("config_version", "")
_flat = {}
def flat(t, name, depth=0):
    if (t, name) in _flat: return _flat[(t, name)]
    s = sections.get((t, name))
    if s is None: raise KeyError(f"{t}:{name}")
    res = {}
    for p in [x.strip() for x in s.get("inherits", "").split(";") if x.strip()]:
        res.update({k: v for k, v in flat(t, p, depth + 1).items() if k != "renamed_from"})
    res.update({k: v for k, v in s.items() if k != "inherits"})
    _flat[(t, name)] = res
    return res

# ---------- defaults: a defaults-only CLI slice writes every option into the G-code ----------
tmp = tempfile.mkdtemp(prefix="prusa-build-")
def cube_stl(path):
    v = [(x * 20, y * 20, z * 20) for z in (0, 1) for y in (0, 1) for x in (0, 1)]
    f = [(0, 2, 1), (1, 2, 3), (4, 5, 6), (5, 7, 6), (0, 1, 4), (1, 5, 4), (2, 6, 3), (3, 6, 7), (0, 4, 2), (2, 4, 6), (1, 3, 5), (3, 7, 5)]
    with open(path, "w") as o:
        o.write("solid c\n")
        for a, b, c in f:
            o.write(" facet normal 0 0 0\n  outer loop\n" + "".join(f"   vertex {v[i][0]} {v[i][1]} {v[i][2]}\n" for i in (a, b, c)) + "  endloop\n endfacet\n")
        o.write("endsolid c\n")
cube_stl(os.path.join(tmp, "c.stl"))
os.makedirs(os.path.join(tmp, "empty"), exist_ok=True)
subprocess.run([CLI, "--datadir", os.path.join(tmp, "empty"), "--export-gcode", "--center", "100,100", os.path.join(tmp, "c.stl"), "--output", os.path.join(tmp, "d.gcode")], capture_output=True)
DEFAULTS = {}
for line in open(os.path.join(tmp, "d.gcode"), errors="ignore"):
    m = re.match(r"^; (\w+) = (.*)$", line.rstrip("\n"))
    if m: DEFAULTS[m.group(1)] = m.group(2)
for k in ("print_settings_id", "filament_settings_id", "printer_settings_id", "physical_printer_settings_id", "objects_info", "prusaslicer_config", "colorprint_heights"):
    DEFAULTS.pop(k, None)
# options newer than the CLI build used for the defaults (values from PrintConfig.cpp of PRUSA_VERSION)
EXTRA_DEFAULTS = {"filament_flush_volume": "0", "filament_flush_speed": "0", "toolchange_ordering": "optimized", "used_filament_compensation": "1",
                  "host_type": "prusalink", "printer_vendor": "", "printer_variant": "", "filament_vendor": "(Unknown)", "bed_custom_model": "", "bed_custom_texture": "",
                  "print_host": "", "printhost_apikey": "", "printhost_cafile": "", "default_print_profile": ""}
for k in FIL_KEYS:
    if k.startswith("filament_") and k[9:] in EXT_KEYS and k not in DEFAULTS: DEFAULTS[k] = "nil"
for k, v in EXTRA_DEFAULTS.items(): DEFAULTS.setdefault(k, v)
m = re.search(r"enum class ToolChangeOrderingType.*?\{(.*?)\}", open(os.path.join(SRC, "PrintConfig.cpp")).read(), re.S)

# ---------- compatibility through the CLI ----------
dd = os.path.join(tmp, "data"); os.makedirs(os.path.join(dd, "vendor"), exist_ok=True)
open(os.path.join(dd, "vendor", "PrusaResearch.ini"), "w", encoding="utf-8").write(open(INI, encoding="utf-8").read())
models = {name: s for (t, name), s in sections.items() if t == "printer_model"}
fil_names = [name for (t, name) in sections if t == "filament" and not name.startswith("*")]
with open(os.path.join(dd, "PrusaSlicer.ini"), "w", encoding="utf-8") as o:
    o.write("[vendor:PrusaResearch]\n" + "".join(f"{mid} = {s.get('variants', '')}\n" for mid, s in models.items()) + "\n[filaments]\n" + "".join(f"{n} = 1\n" for n in fil_names))
def query(printer):
    out = os.path.join(tmp, "q.json")
    if os.path.exists(out): os.remove(out)
    subprocess.run([CLI, "--datadir", dd, "--query-print-filament-profiles", "--printer-profile", printer, "--output", out], capture_output=True)
    return json.load(open(out))["print_profiles"]

# ---------- FilaShift printer -> PrusaSlicer printer preset ----------
def nz(fmt):
    return lambda n: fmt.format(n=n)
MAP = {
    "prusa-core-one": "Prusa CORE One {n} nozzle", "prusa-core-one-hf": "Prusa CORE One HF{n} nozzle",
    "prusa-core-one-l": "Prusa CORE One L {n} nozzle", "prusa-core-one-l-hf": "Prusa CORE One L HF{n} nozzle",
    "prusa-core-one-mmu3": "Prusa CORE One MMU3 {n} nozzle", "prusa-core-one-l-mmu3": "Prusa CORE One L MMU3 {n} nozzle",
    "prusa-mini": "Original Prusa MINI & MINI+{s}", "prusa-mini-is": "Original Prusa MINI & MINI+ Input Shaper{s}",
    "prusa-mk3s": "Original Prusa i3 MK3S & MK3S+{s}", "prusa-mk3s-mmu3": "Original Prusa i3 MK3S & MK3S+ MMU3{s}",
    "prusa-mk3-5": "Original Prusa MK3.5 & MK3.5S {n} nozzle", "prusa-mk3-5-mmu3": "Original Prusa MK3.5 & MK3.5S MMU3 {n} nozzle",
    "prusa-mk3-9": "Original Prusa MK3.9 {n} nozzle", "prusa-mk3-9s": "Original Prusa MK3.9S {n} nozzle",
    "prusa-mk3-9s-mmu3": "Original Prusa MK3.9S MMU3 {n} nozzle",
    "prusa-mk4": "Original Prusa MK4 Input Shaper {n} nozzle", "prusa-mk4-mmu3": "Original Prusa MK4 MMU3 {n} nozzle",
    "prusa-mk4-mmu3-hf": "Original Prusa MK4 MMU3 HF{n} nozzle",
    "prusa-mk4s": "Original Prusa MK4S {n} nozzle", "prusa-mk4s-hf": "Original Prusa MK4S HF{n} nozzle",
    "prusa-mk4s-mmu3": "Original Prusa MK4S MMU3 {n} nozzle",
    "prusa-xl": "Original Prusa XL Input Shaper {n} nozzle", "prusa-xl-2t": "Original Prusa XL - 2T Input Shaper {n} nozzle",
    "prusa-xl-5t": "Original Prusa XL - 5T Input Shaper {n} nozzle",
}
def preset_name(pid, nozzle):
    f = MAP[pid]
    return f.format(n=nozzle, s="" if nozzle == "0.4" else f" {nozzle} nozzle")
# PrusaSlicer-only printers: id -> (model label, short, Orca profile to clone for the intermediate conversion, nozzles, slots, unit)
EXTRA = {
    "prusa-mk4s-mmu3": ("Prusa MK4S MMU3", "MK4S MMU3", "prusa-mk4-mmu3", ["0.4", "0.6"], 5, "MMU3"),
    "prusa-mk3-9": ("Prusa MK3.9", "MK3.9", "prusa-mk4", ["0.4", "0.6", "0.8"], 1, "single extruder"),
    "prusa-mk3-9s": ("Prusa MK3.9S", "MK3.9S", "prusa-mk4s", ["0.4", "0.6", "0.8"], 1, "single extruder"),
    "prusa-mk3-9s-mmu3": ("Prusa MK3.9S MMU3", "MK3.9S MMU3", "prusa-mk4-mmu3", ["0.4", "0.6"], 5, "MMU3"),
    "prusa-mk3-5-mmu3": ("Prusa MK3.5 MMU3", "MK3.5 MMU3", "prusa-mk4-mmu3", ["0.4", "0.6"], 5, "MMU3"),
    "prusa-mk3s-mmu3": ("Prusa MK3S MMU3", "MK3S MMU3", "prusa-mk4-mmu3", ["0.4", "0.6"], 5, "MMU3"),
    "prusa-xl-2t": ("Prusa XL 2T", "XL 2T", "prusa-xl-5t", ["0.4", "0.6", "0.8"], 2, "2 toolheads"),
    "prusa-core-one-l-mmu3": ("Prusa CORE One L MMU3", "CORE One L MMU3", "prusa-core-one-mmu3", ["0.4", "0.6"], 5, "MMU3"),
}
TYPE_FALLBACK = {"TPU": ["FLEX"], "PLA-CF": ["PLA"], "PETG-CF": ["PETG", "PET"], "PA": ["PA", "NYLON", "PA11"], "PA-CF": ["PA", "NYLON", "PA11"], "PET": ["PET", "PETG"],
                 "PVA": ["PVA"], "SUPPORT": ["PVA", "BVOH"], "BVOH": ["BVOH", "PVA"], "PLA-AERO": ["PLA"], "PCTG": ["PCTG", "PETG"], "PPS": ["PPS"], "HIPS": ["HIPS"]}
FIL_TYPES = ["PLA", "PETG", "ABS", "ASA", "TPU", "PLA-CF", "PETG-CF", "PA", "PA-CF", "PC", "PVA", "HIPS", "PET", "PCTG", "PP", "PPS", "BVOH", "PLA-AERO", "SUPPORT"]
NAME_HINT = {"PLA-CF": "PLA.*(CF|Carbon)", "PETG-CF": "PETG.*(CF|Carbon)", "PA-CF": "(PA|Nylon).*(CF|Carbon)", "PLA-AERO": "PLA.*(Aero|LW)", "TPU": "(TPU|Flex)"}

def normalize(t, cfg, n_ext=None):
    """Preset::normalize: printer extruder vectors follow nozzle_diameter; filament vectors hold one value."""
    out = {}
    for k, v in cfg.items():
        if k in SKIP: continue
        out[k] = v
    if t == "printer":
        n = n_ext or len(split_vec("nozzle_diameter", out.get("nozzle_diameter", DEFAULTS.get("nozzle_diameter", "0.4"))))
        for k in EXT_KEYS:
            v = out.get(k, DEFAULTS.get(k))
            if v is None or kind(k) == 0: continue
            vec = split_vec(k, v) or [""]
            vec = (vec + [vec[-1]] * n)[:n]
            out[k] = join_vec(k, vec)
    if t == "filament":
        for k in list(out):
            if kind(k):
                vec = split_vec(k, out[k])
                out[k] = join_vec(k, vec[:1] if vec else [""])
    return out

def diff(cfg):
    return {k: v for k, v in cfg.items() if DEFAULTS.get(k) != v}

def build(pid, nozzle, file_id):
    pname = preset_name(pid, nozzle)
    if ("printer", pname) not in sections:
        print("  missing printer preset", pname); return None
    P = normalize("printer", flat("printer", pname))
    q = query(pname)
    if not q:
        print("  no compatible prints for", pname); return None
    dflt = P.get("default_print_profile", "")
    def lh(name): return float(flat("print", name).get("layer_height", DEFAULTS["layer_height"]))
    prints = sorted(q, key=lambda x: (lh(x["name"]), x["name"]))
    base = next((x for x in prints if x["name"] == dflt), None) or min(prints, key=lambda x: abs(lh(x["name"]) - 0.2))
    compat = base["filament_profiles"]
    ftype = {n: flat("filament", n).get("filament_type", "PLA") for n in compat}
    dff = split_vec("default_filament_profile", P.get("default_filament_profile", "")) or [""]
    def pick(T):
        cands = []
        types = [T] + TYPE_FALLBACK.get(T, [])
        hint = NAME_HINT.get(T)
        for rank, tt in enumerate(types):
            for n in compat:
                if ftype[n].upper() != tt: continue
                s = rank * 100
                l = n.lower()
                if hint and not re.search(hint, n, re.I): s += 50
                if not hint and re.search(r"cf|carbon|gf|glass", l): s += 40
                if n in dff: s -= 30
                if l.startswith("prusament " + tt.lower() + " @") or l.startswith("prusament " + tt.lower() + " "): s -= 20
                elif l.startswith("generic " + tt.lower() + " @") or l.startswith("generic " + tt.lower() + " "): s -= 15
                elif l.startswith("prusament"): s -= 8
                elif l.startswith("generic"): s -= 6
                for bad in ("silk", "matte", "blend", "tough", "esd", "glow", "wood", "marble", "galaxy", "translucent", "high speed", "hf", "@0.", "+", "rapid", "pro", "fusion"):
                    if bad in l: s += 3
                if re.search(r"\bv0\b|certified|tungsten|recycled", l): s += 25
                cands.append((s, len(n), n))
        return min(cands)[2] if cands else None
    fils = {}
    for T in FIL_TYPES:
        n = pick(T)
        if n: fils[T] = {"name": n, "config": diff(normalize("filament", flat("filament", n)))}
    if "PLA" not in fils:
        print("  no PLA for", pname); return None
    chosen = {f["name"] for f in fils.values()}
    out_prints = []
    for x in prints:
        ok = len(chosen & set(x["filament_profiles"])) >= min(len(chosen), 1)
        cfg = flat("print", x["name"])
        out_prints.append({"name": x["name"], "layer_height": lh(x["name"]), "default": x["name"] == dflt,
                           "filaments": sorted(chosen & set(x["filament_profiles"])),
                           "condition": cfg.get("compatible_printers_condition", ""), "config": diff(normalize("print", cfg))})
    pcfg = diff(P)
    # conditions are needed for the *_cummulative keys PrusaSlicer writes into projects
    for f in fils.values():
        f["condition"] = flat("filament", f["name"]).get("compatible_printers_condition", "")
        f["prints_condition"] = flat("filament", f["name"]).get("compatible_prints_condition", "")
    bed = [list(map(float, p.split("x"))) for p in P.get("bed_shape", DEFAULTS["bed_shape"]).split(",")]
    rec = {"id": file_id, "printer": {"name": pname, "config": pcfg}, "prints": out_prints, "filaments": fils,
           "extruders": len(split_vec("nozzle_diameter", P["nozzle_diameter"])),
           "bed": [min(p[0] for p in bed), min(p[1] for p in bed), max(p[0] for p in bed) - min(p[0] for p in bed), max(p[1] for p in bed) - min(p[1] for p in bed)],
           "height": float(P.get("max_print_height", DEFAULTS.get("max_print_height", "200"))),
           "single_extruder_multi_material": P.get("single_extruder_multi_material", "0") == "1"}
    json.dump(rec, open(os.path.join(OUT, "prusa", file_id + ".json"), "w"), separators=(",", ":"))
    return rec

common = {"slicer": f"PrusaSlicer {PRUSA_VERSION}", "bundle": CONFIG_VERSION, "defaults": DEFAULTS,
          "vector": {k: kind(k) for k in set(DEFAULTS) | set(PRINT_KEYS) | set(FIL_KEYS) | set(PRINTER_KEYS) | set(EXT_KEYS) if kind(k)},
          "filamentKeys": [k for k in FIL_KEYS if k not in SKIP], "extruderKeys": EXT_KEYS, "printKeys": PRINT_KEYS,
          "printerKeys": PRINTER_KEYS + MACHINE_KEYS + EXT_KEYS}
json.dump(common, open(os.path.join(OUT, "prusa", "_common.json"), "w"), separators=(",", ":"))

index = json.load(open(os.path.join(OUT, "index.json")))
index = [e for e in index if not e.get("prusaOnly")]
byid = {e["id"]: e for e in index}
count = 0
for pid in MAP:
    extra = EXTRA.get(pid)
    if pid in byid and extra is None:
        e = byid[pid]
        nozzles = e.get("nozzles") or ["0.4"]
    elif extra and pid not in byid:
        nozzles = extra[3]
    else:
        continue
    print(pid)
    built = []
    for n in nozzles:
        fid = pid if n == "0.4" else f"{pid}-n{n.replace('.', '')}"
        # MMU3 HF profiles exist only for 0.4
        name = preset_name(pid, n)
        if ("printer", name) not in sections: continue
        rec = build(pid, n, fid)
        if not rec: continue
        built.append(n)
        count += 1
        if extra:
            model, short, basepid, _, slots, unit = extra
            bfid = basepid if n == "0.4" else f"{basepid}-n{n.replace('.', '')}"
            bpath = os.path.join(OUT, bfid + ".json")
            if not os.path.exists(bpath): bpath = os.path.join(OUT, basepid + ".json")
            B = json.load(open(bpath))
            B.update({"id": fid, "model": model, "short": short, "machine": rec["printer"]["name"], "slicer": "PrusaSlicer", "prusaOnly": True, "prusa": True,
                      "bed": [rec["bed"][2], rec["bed"][3]], "height": rec["height"], "slots": slots, "slotUnit": unit,
                      "extruders": rec["extruders"] if not rec["single_extruder_multi_material"] else 1, "popular": False, "nozzle": n, "base": pid})
            json.dump(B, open(os.path.join(OUT, fid + ".json"), "w"), separators=(",", ":"))
        else:
            path = os.path.join(OUT, fid + ".json")
            B = json.load(open(path)); B["prusa"] = True
            json.dump(B, open(path, "w"), separators=(",", ":"))
    if not built: continue
    if extra:
        B = json.load(open(os.path.join(OUT, pid + ".json")))
        e = {k: B[k] for k in ("id", "vendor", "model", "short", "machine", "bed", "height", "extruders", "slots", "slotUnit", "slicer", "popular")}
        e |= {"processes": len(B["processes"]), "filamentTypes": sorted(B["filaments"]), "prusa": True, "prusaOnly": True}
        if len(built) > 1: e["nozzles"] = built
        index.append(e)
    else:
        byid[pid]["prusa"] = True
index.sort(key=lambda r: (r["vendor"], r["model"]))
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), indent=0)
print(count, "PrusaSlicer printer variants; bundle", CONFIG_VERSION)
