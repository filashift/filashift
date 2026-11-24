#!/usr/bin/env python3
"""Generate a synthetic Creality Print 6.3 project 3MF (no third-party content).

Creality Print's own CLI cannot produce one headless: the 6.3.1 Linux build segfaults in
--export-3mf/--slice ("Unable to create exclude triangles"), and 7.3.2's --cli has no
--export-3mf. So this writes the container the way CrealityPrint v6.3.1
src/libslic3r/Format/bbs_3mf.cpp does (Application "Creality_Print V<ver> Release",
X-CX-Client-* slice_info header, Metadata/creality.config, production-extension object
files), with the settings taken from Creality Print's own system presets (flattened, so
every Creality-only key such as epoxy_resin_plate_temp / multicolor_method is present).

Four boxes on filaments 1-4 (red, blue, yellow, green); object 1 (filament 1) has its top
painted with filament 2 and one side with filament 3. Deterministic output.

usage: make_creality_fixture.py PROFILES_DIR OUT.3mf MACHINE PROCESS FILAMENT [BED_TYPE] [--mixed]
  PROFILES_DIR: extracted CrealityPrint 6.3.1 AppImage squashfs-root/resources/profiles
  --mixed: stamp it as Creality Print 7.3.2 and also write a Creality Print 7 style mixed_filament_definitions entry and put
           box 4 on that virtual filament 5
"""
import json, os, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
sys.path.insert(0, HERE)
from fork_presets import index, flatten  # noqa: E402

VER = "6.3.1.3548"
COLS = ["#E63A2E", "#1E7FD8", "#F2C230", "#2BAA4A"]
DATE = (2026, 11, 24, 0, 0, 0)


def box(sx, sy, sz):
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    v = [(x, y, z) for z in (-hz, hz) for y in (-hy, hy) for x in (-hx, hx)]
    f = [(0, 2, 1), (1, 2, 3), (4, 5, 6), (5, 7, 6), (0, 1, 4), (1, 5, 4),
         (2, 6, 3), (3, 6, 7), (0, 4, 2), (2, 4, 6), (1, 3, 5), (3, 7, 5)]
    return v, f


# Object 1 top face (triangles 2,3) painted with filament 2; one side (4,5) with filament 3.
# Orca/BBS paint_color: "4" = state 1 (filament 1), "8" = 2, "0C" = 3, "1C" = 4 ...
PAINT = {2: "8", 3: "8", 4: "0C", 5: "0C"}


def obj_model(oid, uuid, v, f, paint):
    vs = "".join(f'     <vertex x="{x:g}" y="{y:g}" z="{z:g}"/>\n' for x, y, z in v)
    ts = "".join(f'     <triangle v1="{a}" v2="{b}" v3="{c}"'
                 + (f' paint_color="{paint[i]}"' if i in paint else "") + "/>\n"
                 for i, (a, b, c) in enumerate(f))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" '
            'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
            'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
            'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n'
            ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n'
            f'  <object id="{oid}" p:UUID="{uuid}" type="model">\n   <mesh>\n    <vertices>\n{vs}    </vertices>\n'
            f'    <triangles>\n{ts}    </triangles>\n   </mesh>\n  </object>\n </resources>\n <build/>\n</model>\n')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    mixed = "--mixed" in sys.argv
    prof, out, machine, process, filament = args[:5]
    bed = args[5] if len(args) > 5 else ""
    ver = "7.3.2.6412" if mixed else VER
    by = index(os.path.join(prof, "Creality"))
    m, p, fl = (flatten(by, n) for n in (machine, process, filament))
    meta = {"name", "inherits", "from", "type", "setting_id", "instantiation", "filament_id",
            "version", "description", "renamed_from", "is_custom_defined"}
    S = {}
    for src in (m, p):
        S.update({k: v for k, v in src.items() if k not in meta})
    # point lists are vectors in a saved project even when the vendor preset writes "0x0,350x0,..."
    for k in ("printable_area", "bed_exclude_area", "thumbnails", "wrapping_exclude_area"):
        if isinstance(S.get(k), str) and S[k]:
            S[k] = S[k].split(",")
    for k, v in fl.items():
        if k in meta or k in ("compatible_printers", "compatible_prints", "compatible_printers_condition",
                              "compatible_prints_condition"):
            continue
        S[k] = (v * 4 if len(v) == 1 else v) if isinstance(v, list) else v
    S["filament_colour"] = list(COLS)
    S["extruder_colour"] = list(COLS)
    S["filament_settings_id"] = [filament] * 4
    S["filament_ids"] = [fl.get("filament_id", "")] * 4
    S["print_settings_id"] = process
    S["printer_settings_id"] = machine
    S["print_compatible_printers"] = [machine]
    S["filament_self_index"] = ["1", "2", "3", "4"]
    S["flush_volumes_matrix"] = [("0" if i == j else "280") for i in range(4) for j in range(4)]
    S["flush_volumes_vector"] = ["140"] * 8
    S["inherits_group"] = [process] + [filament] * 4 + [machine]
    S["different_settings_to_system"] = [""] * 6
    S["curr_bed_type"] = bed or S.get("default_bed_type") or "Textured PEI Plate"
    S["enable_prime_tower"] = "1"
    S["wipe_tower_x"] = ["180"]
    S["wipe_tower_y"] = ["200"]
    S["from"] = "project"
    S["name"] = "project_settings"
    S["version"] = ver
    if mixed:
        # Creality Print 7: virtual filament 5 = 50/50 blend of filaments 1 and 2.
        S["mixed_filament_definitions"] = "5:1,2:50,50"
    settings = json.dumps(dict(sorted(S.items())), indent=4, ensure_ascii=False) + "\n"

    objs = []  # (object id, component id, name, extruder, size, position)
    for n in range(4):
        sz = 10 + 4 * n
        ext = 5 if mixed and n == 3 else n + 1  # --mixed: last box prints with the blend
        objs.append((2 * n + 2, 2 * n + 1, f"Box{n + 1}", ext, (20, 20, sz),
                     (110 + 30 * (n % 2), 110 + 30 * (n // 2), sz / 2)))
    files = []
    comps, items, rels, ms_objs, ms_inst = "", "", "", "", ""
    for n, (oid, cid, name, ext, size, pos) in enumerate(objs):
        path = f"3D/Objects/{name}_{cid}.model"
        v, f = box(*size)
        files.append((path, obj_model(cid, f"{cid:08x}-81cb-4c03-9d28-80fed5dfa1dc", v, f, PAINT if n == 0 else {})))
        comps += (f'  <object id="{oid}" p:UUID="{n + 1:08x}-61cb-4c03-9d28-80fed5dfa1dc" type="model">\n'
                  f'   <components>\n    <component p:path="/{path}" objectid="{cid}" '
                  f'p:UUID="{n + 1:04x}0000-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n'
                  '   </components>\n  </object>\n')
        items += (f'  <item objectid="{oid}" p:UUID="{oid:08x}-b1ec-4553-aec9-835e5b724bb4" '
                  f'transform="1 0 0 0 1 0 0 0 1 {pos[0]:g} {pos[1]:g} {pos[2]:g}" printable="1"/>\n')
        rels += (f' <Relationship Target="/{path}" Id="rel-{n + 1}" '
                 'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n')
        ms_objs += (f'  <object id="{oid}">\n    <metadata key="name" value="{name}"/>\n'
                    f'    <metadata key="extruder" value="{ext}"/>\n'
                    f'    <part id="{cid}" subtype="normal_part">\n      <metadata key="name" value="{name}"/>\n'
                    '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n'
                    '      <mesh_stat edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n'
                    '    </part>\n  </object>\n')
        ms_inst += (f'    <model_instance>\n      <metadata key="object_id" value="{oid}"/>\n'
                    f'      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="{100 + n}"/>\n'
                    '    </model_instance>\n')
    md = "".join(f' <metadata name="{k}">{v}</metadata>\n' for k, v in [
        ("Application", f"Creality_Print V{ver} Release"), ("BambuStudio:3mfVersion", "1"),
        ("CreationDate", "2026-11-24"), ("Designer", ""), ("ModificationDate", "2026-11-24"),
        ("Title", "FilaShift synthetic Creality Print fixture")])
    model = ('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
             'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
             'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">\n'
             + md + ' <resources>\n' + comps + ' </resources>\n'
             ' <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">\n' + items + ' </build>\n</model>\n')
    model_settings = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' + ms_objs +
                      '  <plate>\n    <metadata key="plater_id" value="1"/>\n    <metadata key="plater_name" value=""/>\n'
                      '    <metadata key="locked" value="false"/>\n    <metadata key="gcode_file" value=""/>\n'
                      + ms_inst + '  </plate>\n  <assemble>\n  </assemble>\n</config>\n')
    v4 = ".".join(f"{int(x):02d}" for x in ver.split(".")[:3]) + "." + ver.split(".")[3]
    slice_info = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n'
                  '    <header_item key="X-CX-Client-Type" value="creality_print"/>\n'
                  f'    <header_item key="X-CX-Client-Version" value="{v4}"/>\n  </header>\n</config>\n')
    creality = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n'
                + "".join(f'  <metadata key="{k}" value="{v}"/>\n' for k, v in [
                    ("Company", "Creality"), ("Application", "Creality_Print"), ("AppVersion", ver),
                    ("AppStage", "Release"), ("FileVersion", "1.0"), ("FileType", "Undefined"),
                    ("CreationDate", "2026-11-24")]) + '</config>\n')
    ct = ('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
          ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
          ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n'
          ' <Default Extension="png" ContentType="image/png"/>\n <Default Extension="gcode" ContentType="text/x.gcode"/>\n</Types>\n')
    root_rels = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
                 ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n')
    model_rels = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
                  + rels + '</Relationships>\n')
    entries = [("[Content_Types].xml", ct), ("_rels/.rels", root_rels), ("3D/3dmodel.model", model),
               ("3D/_rels/3dmodel.model.rels", model_rels)] + files + [
        ("Metadata/model_settings.config", model_settings), ("Metadata/project_settings.config", settings),
        ("Metadata/slice_info.config", slice_info), ("Metadata/creality.config", creality)]
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for n, d in entries:
            zi = zipfile.ZipInfo(n, date_time=DATE)
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, d)


if __name__ == "__main__":
    main()
