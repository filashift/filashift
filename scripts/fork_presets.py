#!/usr/bin/env python3
"""Flatten an Orca-family slicer system preset (machine / process / filament) into a
standalone JSON file that the slicer CLI accepts with --load-settings / --load-filaments.

usage: fork_presets.py PROFILES_DIR VENDOR OUT.json "Preset name"

PROFILES_DIR is the slicer's resources/profiles folder (for example the extracted
CrealityPrint, ElegooSlicer or AnycubicSlicerNext AppImage/.deb); VENDOR is the vendor
sub-folder (Creality, Elegoo, Anycubic). Parents are looked up by "name" in that vendor
folder (recursively), so "inherits" chains are resolved the same way the GUI does.
"""
import json, os, sys


def index(root):
    by_name = {}
    for d, _, files in os.walk(root):
        for f in files:
            if not f.endswith(".json"):
                continue
            p = os.path.join(d, f)
            try:
                j = json.load(open(p, encoding="utf-8"))
            except Exception:
                continue
            if isinstance(j, dict) and "name" in j:
                by_name.setdefault(j["name"], j)
    return by_name


def flatten(by_name, name, depth=0):
    if depth > 20 or name not in by_name:
        raise SystemExit(f"preset not found: {name}")
    j = by_name[name]
    base = flatten(by_name, j["inherits"], depth + 1) if j.get("inherits") else {}
    out = dict(base)
    out.update(j)
    return out


def main():
    profiles, vendor, out, name = sys.argv[1:5]
    by = index(os.path.join(profiles, vendor))
    j = flatten(by, name)
    j.pop("inherits", None)
    j["name"] = name
    j["from"] = "system"
    j.setdefault("version", "1.0.0.0")
    json.dump(j, open(out, "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
