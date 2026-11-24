#!/usr/bin/env python3
"""Collect filament prices from brand stores' public Shopify product feeds.

Writes a compact JSON file used by https://filashift.com/filament.
Usage: collect_filament.py OUT.json [--cache DIR]   (--cache reuses DIR/<store>.json for offline runs)
Only the Python standard library is used so it runs on a bare Ubuntu server.
"""
import json, re, sys, time, os, urllib.request, datetime

STORES = [
    # host, display brand (None = use product vendor), retailer name, allow grams fallback
    ("us.polymaker.com", "Polymaker", "Polymaker", False),
    ("us.elegoo.com", "Elegoo", "Elegoo", False),
    ("eryone3d.com", "Eryone", "Eryone", False),
    ("www.overture3d.com", "Overture", "Overture", True),
    ("atomicfilament.com", "Atomic Filament", "Atomic Filament", False),
    ("www.inslogic3d.com", "Inslogic", "Inslogic", False),
    ("www.jayo3d.com", "Jayo", "Jayo", False),
    ("www.amolen.com", "Amolen", "Amolen", False),
    ("www.protopasta.com", "Proto-pasta", "Proto-pasta", False),
    ("kingroon.com", "Kingroon", "Kingroon", False),
    ("www.printedsolid.com", None, "Printed Solid", False),
    ("store.sunlu.com", "Sunlu", "Sunlu", False),
    ("siraya.tech", "Siraya Tech", "Siraya Tech", False),
    ("www.sovol3d.com", "Sovol", "Sovol", False),
    ("qidi3d.com", "Qidi", "Qidi", False),
    ("us.anycubic3d.com", "Anycubic", "Anycubic", False),
    ("www.flashforge.com", "Flashforge", "Flashforge", False),
    ("us.snapmaker.com", "Snapmaker", "Snapmaker", False),
    ("www.3dfuel.com", "3D-Fuel", "3D-Fuel", False),
]
UA = "Mozilla/5.0 (compatible; FilaShiftPriceBot/1.0; +https://filashift.com/filament)"

# Order matters: first match wins. Each entry: (regex, family, label)
MATERIALS = [
    (r"\bpla[\s-]*\+|\bpla\s*plus|\bpla\s*pro\b|\bpla[\s-]*pro\b|tough\s*pla|pla\s*\+", "PLA", "PLA+"),
    (r"\bpla\b.*\b(cf|carbon\s*fib)", "PLA", "PLA-CF"),
    (r"\bsilk\b.*\bpla\b|\bpla\b.*\bsilk\b", "PLA", "PLA Silk"),
    (r"\bmatte\b.*\bpla\b|\bpla\b.*\bmatte\b", "PLA", "PLA Matte"),
    (r"\bhigh[\s-]*speed\b.*\bpla\b|\bpla\b.*\b(hs|hf|high[\s-]*(speed|flow)|hyper)\b|\bhyper\s*pla\b", "PLA", "PLA High Speed"),
    (r"\bhtpla\b|\bpla\b|\bpolylite\s*pla|\bpolyterra\b", "PLA", "PLA"),
    (r"\bpetg\b.*\b(cf|carbon\s*fib)", "PETG", "PETG-CF"),
    (r"\bpetg\b.*\b(hs|hf|high[\s-]*(speed|flow)|rapid)\b|\bhyper\s*petg\b", "PETG", "PETG High Speed"),
    (r"\bmatte\b.*\bpetg\b|\bpetg\b.*\bmatte\b", "PETG", "PETG Matte"),
    (r"\bpctg\b", "PETG", "PCTG"),
    (r"\bpetg\b|\bpet[\s-]g\b", "PETG", "PETG"),
    (r"\babs\b.*\b(cf|carbon\s*fib)", "ABS", "ABS-CF"),
    (r"\babs\b", "ABS", "ABS"),
    (r"\basa\b.*\b(cf|carbon\s*fib)", "ASA", "ASA-CF"),
    (r"\basa\b", "ASA", "ASA"),
    (r"\btpu\b|\btpe\b|\bflex(ible)?\b|\bpolyflex\b", "TPU", "TPU"),
    (r"\b(pa|nylon|paht|pa6|pa12|ppa)\b.*\b(cf|gf|carbon|glass)|\b(pa|ppa|paht)[\s-]*(cf|gf)", "Nylon", "Nylon-CF/GF"),
    (r"\bnylon\b|\bpa6\b|\bpa12\b|\bpolymide\b|\bpaht\b|\bppa\b", "Nylon", "Nylon"),
    (r"\bpc\b.*\b(abs)\b|\bpc[\s/-]*abs\b", "PC", "PC-ABS"),
    (r"\bpolycarbonate\b|\bpc\b|\bpolymax\s*pc\b", "PC", "PC"),
    (r"\bhips\b", "Other", "HIPS"),
    (r"\bpva\b|\bbvoh\b|\bpolydissolve\b", "Other", "PVA / soluble"),
    (r"\bpps\b|\bpeek\b|\bpei\b|\bpekk\b", "Other", "High-temp"),
    (r"\bpp\b|\bpolypropylene\b", "Other", "PP"),
]
EXCLUDE = re.compile(
    r"resin|printer\b|\bcombo\b|nozzle|hot\s*end|hotend|extruder|build\s*plate|\bbed\b|dryer|dry\s*box|drybox|"
    r"sample|swatch|gift\s*card|sticker|t-shirt|hoodie|\bmug\b|keychain|\bkit\b(?!.*filament)|spare|replacement|"
    r"\bpen\b|enclosure|insurance|shipping|warranty|subscription|empty\s*spool|spool\s*holder|\bams\b\s*(lite|hub)|"
    r"\blaser\b|\bcnc\b|\bmotor\b|\bbelt\b|\bfan\b|\bboard\b|\bscreen\b|\bwipe|\bglue\b|\btool\b|\bpellet",
    re.I)
EXCLUDE_TITLE_PREFIX = re.compile(r"^\s*\(bundle\s*sale\)", re.I)
NON_US = re.compile(r"\b(eu|uk|de|ca|au|jp|mx|mexico|europe|germany|canada|australia)\b(?!.*\bus\b)|to\s+eu\s+only", re.I)

def fetch_store(host, cache=None):
    if cache and os.path.exists(os.path.join(cache, host + ".json")):
        return json.load(open(os.path.join(cache, host + ".json")))
    out = []
    for page in range(1, 40):
        req = urllib.request.Request(f"https://{host}/products.json?limit=250&page={page}", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            items = json.load(r).get("products", [])
        if not items:
            break
        out += items
        time.sleep(1.0)
    return out

def material(text):
    t = text.lower().replace("™", "").replace("®", "")
    for rx, fam, label in MATERIALS:
        if re.search(rx, t):
            return fam, label
    return None, None

NUM = r"(\d+(?:\.\d+)?)"
def weight_kg(texts, grams=0, allow_grams=False):
    """Return (total_kg, spools) from variant/product text."""
    variant_text, product_text = texts
    both = f"{variant_text} || {product_text}".lower().replace(",", ".")
    # N x M kg  or M kg x N
    for rx, order in ((NUM + r"\s*(?:x|×|\*|rolls?\s*of|spools?\s*of)\s*" + NUM + r"\s*(kg|g)\b", "nm"),
                      (NUM + r"\s*(kg|g)\s*(?:x|×|\*)\s*" + NUM + r"(?!\s*(?:mm|kg|g))", "mn")):
        m = re.search(rx, both)
        if m:
            if order == "nm":
                n, w, u = float(m.group(1)), float(m.group(2)), m.group(3)
            else:
                w, u, n = float(m.group(1)), m.group(2), float(m.group(3))
            w = w / 1000 if u == "g" else w
            if 1 <= n <= 50 and 0.1 <= w <= 10:
                return round(n * w, 3), int(n)
    def first_w(s):
        m = re.search(NUM + r"\s*(kg|g)\b(?!\s*(?:/|per)\s*(?:cm|m))", s)
        if not m:
            return None
        w = float(m.group(1)); w = w / 1000 if m.group(2) == "g" else w
        return w if 0.1 <= w <= 60 else None
    w = first_w(variant_text.lower().replace(",", "."))
    src = "v"
    if w is None:
        w = first_w(product_text.lower().replace(",", ".")); src = "p"
    packm = re.search(r"(\d+)\s*[-\s]?(?:pack|pk|rolls?|spools?|pcs|colors?\s*pack)\b", both) or re.search(r"\bpack\s*of\s*(\d+)", both)
    n = int(packm.group(1)) if packm else 1
    if not (1 <= n <= 50):
        n = 1
    if w is None:
        if allow_grams and grams and grams % 250 == 0 and 250 <= grams <= 20000:
            return grams / 1000, n
        return None, None
    if w <= 1.25 and n > 1:
        return round(w * n, 3), n
    return w, n

def diameter(text):
    t = text.lower()
    if re.search(r"2\.85|\b3\.0?\s*mm\b|\b3mm\b", t) and not re.search(r"1\.75", t):
        return 2.85
    return 1.75

def color_of(product, variant):
    opts = [o["name"].lower() for o in product.get("options", [])]
    for i, name in enumerate(opts):
        if "color" in name or "colour" in name:
            val = variant.get(f"option{i+1}")
            if val:
                return val
    if variant.get("title") and variant["title"] != "Default Title":
        parts = [p.strip() for p in variant["title"].split("/")]
        cand = [p for p in parts if not re.search(r"\d\s*(kg|g|mm)\b|^us\b|ship|delivery|u\.s\.", p, re.I)]
        if cand:
            return cand[-1]
    return ""

def clean_colour(name):
    """Split a store colour label into (display name, '#rrggbb' or '')."""
    if not name:
        return "", ""
    hx = ""
    m = re.search(r"(?:hex\s*code\s*)?#([0-9a-f]{6})\b", name, re.I) or re.search(r"\(\s*#?([0-9a-f]{6})\s*\)", name, re.I)
    if m:
        hx = "#" + m.group(1).lower()
        name = name[:m.start()] + name[m.end():]
    name = re.sub(r"hex\s*code", "", name, flags=re.I)
    name = re.sub(r"\b\d+(?:\.\d+)?\s*kg\b\)?|\(\s*\)|\bkg\)", "", name, flags=re.I)
    name = re.sub(r"\s{2,}", " ", name).strip(" -/,()")
    if name.count("(") > name.count(")"):
        name += ")"
    name = re.sub(r"(\S)\(", r"\1 (", name)
    return name, hx

def collect(cache=None):
    rows, stats = [], {}
    for host, brand, retailer, allow_grams in STORES:
        try:
            products = fetch_store(host, cache)
        except Exception as e:
            stats[host] = f"error: {e}"
            continue
        kept = 0
        for p in products:
            title = p.get("title", "")
            ptype = p.get("product_type", "") or ""
            tags = " ".join(p.get("tags", [])) if isinstance(p.get("tags"), list) else str(p.get("tags", ""))
            if EXCLUDE_TITLE_PREFIX.search(title):
                continue
            head = f"{title} {ptype}"
            if EXCLUDE.search(head) and "filament" not in title.lower():
                continue
            if re.search(r"resin|printer\b|\bcombo\b|sample|mystery|lucky\s*bag|blind\s*box|pellet|regrind|heater|connector|splicer|welder|dryer|dry\s*box", title, re.I):
                continue
            is_fil = re.search(r"filament|spool|refill", f"{title} {ptype} {tags}", re.I)
            if not is_fil:
                continue
            for v in p.get("variants", []):
                vt = v.get("title", "") or ""
                if NON_US.search(vt) and not re.search(r"\bus\b|u\.s\.", vt, re.I):
                    continue
                if re.search(r"sample|empty|spool\s*only", vt, re.I):
                    continue
                try:
                    price = float(v.get("price") or 0)
                except ValueError:
                    continue
                if price <= 0:
                    continue
                # the variant names the material first on multi-material listings (e.g. "Refill 1KG, PLA, PETG")
                fam, label = material(vt)
                if not fam:
                    fam, label = material(f"{title} {vt}")
                if not fam:
                    fam, label = material(f"{ptype} {tags}")
                if not fam:
                    continue
                kg, spools = weight_kg((vt, title), v.get("grams") or 0, allow_grams)
                if not kg or kg < 0.25:
                    continue
                ppk = price / kg
                if not (4 <= ppk <= 400):
                    continue
                compare = v.get("compare_at_price")
                try:
                    compare = float(compare) if compare else None
                except ValueError:
                    compare = None
                rows.append({
                    "b": brand or (p.get("vendor") or retailer).strip(),
                    "r": retailer,
                    "t": title.strip(),
                    "v": vt if vt != "Default Title" else "",
                    "c": clean_colour(color_of(p, v))[0],
                    "x": clean_colour(color_of(p, v))[1],
                    "f": fam, "m": label,
                    "d": diameter(f"{title} {vt}"),
                    "kg": kg, "n": spools or 1,
                    "p": round(price, 2),
                    "ppk": round(ppk, 2),
                    "was": round(compare, 2) if compare and compare > price else None,
                    "ok": bool(v.get("available", True)),
                    "u": f"https://{host}/products/{p.get('handle')}?variant={v.get('id')}",
                })
                kept += 1
        stats[host] = kept
    # one row per product offer (same store, title, size, price); colours become a list
    groups = {}
    for r in rows:
        key = (r["r"], r["t"], r["m"], r["d"], r["kg"], r["n"], r["p"])
        g = groups.get(key)
        if not g:
            g = dict(r); g["c"] = []; g["x"] = []; g["ok"] = False; g["v"] = r["v"]
            groups[key] = g
        if r["c"] and r["c"] not in g["c"]:
            g["c"].append(r["c"]); g["x"].append(r["x"])
        if r["ok"] and not g["ok"]:
            g["ok"] = True; g["u"] = r["u"]
        if r["was"] and (not g["was"] or r["was"] > g["was"]):
            g["was"] = r["was"]
    out = list(groups.values())
    for g in out:
        if not any(g["x"]):
            del g["x"]
    out.sort(key=lambda r: (not r["ok"], r["ppk"]))
    return out, stats

def main():
    out = sys.argv[1]
    cache = sys.argv[sys.argv.index("--cache") + 1] if "--cache" in sys.argv else None
    rows, stats = collect(cache)
    data = {"updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "stores": stats, "count": len(rows), "items": rows}
    if len(rows) < 50:
        print("too few rows, keeping previous file", stats, file=sys.stderr)
        sys.exit(1)
    tmp = out + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    os.replace(tmp, out)
    print(json.dumps(stats), len(rows))

if __name__ == "__main__":
    main()
