"""Offline harness for reviewed WM Device revision 0e6a280. No plugin activation.
Pass the checked-out wm_device.py. Only the selected pure/file helpers run.
No host module, printer address, network request or printable output is needed.
"""
import ast
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

source = Path(sys.argv[1]).read_text()
tree = ast.parse(source)
names = {"project_filaments", "clean_map", "map_gcode_line", "map_native_lines",
         "insert_map_line", "apply_tool_map"}
helpers = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
assert len(helpers) == len(names)
env = {"HEADS": 4, "os": os}
exec(compile(ast.Module(helpers, []), "offline-selected-functions", "exec"), env)
rows = env["project_filaments"](["#FF8000", "#1E7FD8"], ["PLA"], [])
assert [row["type"] for row in rows] == ["PLA", "PLA"]
assert env["clean_map"]([1, 0, 2, 3]) == [1, 0, 2, 3]
assert env["clean_map"]([4, 0, 2, 3]) is None
with tempfile.TemporaryDirectory() as d:
    for factory in (False, True):
        p = Path(d) / "mock.txt"
        p.write_text("; offline test\n; no toolpaths\n")
        assert env["apply_tool_map"](p, [1, 0, 2, 3], "offline", factory)
        text = p.read_text()
        assert ("box_modify_t0 VALUE=1" if factory else "MAP=0:1,1:0,2:2,3:3") in text
        assert not env["apply_tool_map"](p, [0, 1, 2, 3], "offline", factory)
        assert text == p.read_text()
# Run the author's actual popup matching code, with synthetic spool inventory.
popup = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign)
             and any(getattr(t,"id",None)=="POPUP" for t in n.targets))
code = popup[popup.index("function hx("):popup.index("function auto()")]
for materials,want in [(["PLA","PLA"],[1,0]),(["PETG","PLA"],[1,0])]:
    data = {"fils":rows,"cur":[-1,-1,-1,-1],"heads":[
        {"i":0,"colour":"#1E7FD8","mat":materials[0],"loaded":True},
        {"i":1,"colour":"#FF8000","mat":materials[1],"loaded":True},
        {"i":2,"colour":"#1E7FD8","mat":"PLA","loaded":False},
        {"i":3,"colour":"#000000","mat":"PLA","loaded":False}]}
    res=subprocess.check_output(["node","-e",f"const D={json.dumps(data)};\n"+code+"\nconsole.log(JSON.stringify(calc()))"],text=True)
    assert json.loads(res)==want
print("PASS: file rows, invalid tool index, reversed two-color match, empty head excluded, material-mismatch fallback, both local map formats and no overwrite")
