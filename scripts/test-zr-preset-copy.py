"""Create a local *test copy* equivalent to applying row 1's PLA preset to row 3.
Usage: python3 scripts/test-zr-preset-copy.py converted.3mf new-test-copy.3mf
Not converter behavior. Only meaningful when the design and physical spool are PLA.
"""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

src, out = map(Path, sys.argv[1:])
assert src.resolve() != out.resolve()
profile = json.loads((Path(__file__).resolve().parents[1] / 'client/public/profiles/wondermaker-zr.json').read_text())
with ZipFile(src) as original, ZipFile(out, 'x', ZIP_DEFLATED) as copy:
    for name in original.namelist():
        data = original.read(name)
        if name == 'Metadata/project_settings.config':
            s = json.loads(data)
            assert s['filament_type'] == ['PLA', 'PLA', 'PETG', 'PLA']
            assert s['filament_settings_id'][0] == profile['filaments']['PLA']['name']
            keys = set(profile['filaments']['PLA']['values']) | set(profile['filaments']['PETG']['values'])
            for k in (keys | {'filament_settings_id', 'filament_ids', 'filament_type'}) - {'filament_colour','filament_self_index'}:
                if isinstance(s.get(k), list) and len(s[k]) == 4:
                    s[k][2] = s[k][0]
            assert s['filament_type'] == ['PLA'] * 4
            data = json.dumps(s).encode()
        copy.writestr(name, data)
