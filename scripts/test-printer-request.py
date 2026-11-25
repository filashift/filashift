"""Local test for the report inbox's "Request a printer" kind; never contacts production.

Usage: python3 scripts/test-printer-request.py
Starts deploy/filashift-api.py's handler on a random local port with a temporary report folder and checks
validation, field allow-listing, size limits, the honeypot, rate limits and that problem reports still work.
"""
import http.client
import importlib.util
import json
import os
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

entry = Path(__file__).resolve().parents[1] / "deploy/filashift-api.py"
spec = importlib.util.spec_from_file_location("inbox", entry)
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

with tempfile.TemporaryDirectory() as tmp, ThreadingHTTPServer(("127.0.0.1", 0), api.H) as server:
    api.REPORT_DIR = tmp + "/reports"
    threading.Thread(target=server.serve_forever, daemon=True).start()
    ip = [0]

    def post(obj, raw=None, ctype="application/json", new_ip=True):
        if new_ip:
            ip[0] += 1
        body = raw if raw is not None else json.dumps(obj).encode()
        conn = http.client.HTTPConnection(*server.server_address, timeout=8)
        conn.request("POST", "/api/report", body, {"Content-Type": ctype, "X-Forwarded-For": f"192.0.2.{ip[0]}"})
        res = conn.getresponse()
        out = json.loads(res.read() or b"{}")
        conn.close()
        return res.status, out

    def saved():
        d = api.REPORT_DIR
        return [json.load(open(os.path.join(d, f))) for f in sorted(os.listdir(d)) if f.endswith(".json")] if os.path.isdir(d) else []

    # validation
    assert post({"kind": "printer-request", "brand": "", "model": "X"})[0] == 400
    assert post({"kind": "printer-request", "brand": "Acme", "model": "  "})[0] == 400
    assert post({"kind": "printer-request", "brand": "Acme"})[0] == 400
    assert post({"kind": "something-else", "brand": "Acme", "model": "Z1", "message": "hello there"})[0] == 400
    assert post({"kind": "printer-request", "brand": "Acme", "model": "Z1"}, ctype="text/plain")[0] == 415
    assert post(None, raw=b"x" * (api.MAX_BODY + 1))[0] == 413
    assert saved() == []

    # honeypot: pretends success, stores nothing
    st, out = post({"kind": "printer-request", "brand": "Acme", "model": "Z1", "website": "spam"})
    assert st == 200 and out["id"] == "x" and saved() == []

    # a valid request keeps only the allow-listed fields, trimmed and capped
    st, out = post({
        "kind": "printer-request", "brand": " Acme ", "model": "Z1 Pro" + "!" * 500, "slicer": "OrcaSlicer 2.5",
        "message": "n" * 5000, "page": "/tested", "email": "a@b.example", "link": "https://x.example", "details": "secret",
        "extra": "dropped",
    })
    assert st == 200 and out["ok"], out
    [rec] = saved()
    assert rec["kind"] == "printer-request" and rec["brand"] == "Acme" and rec["slicer"] == "OrcaSlicer 2.5"
    assert len(rec["model"]) == api.REQUEST_LIMITS["model"] and len(rec["message"]) == api.REQUEST_LIMITS["message"]
    assert rec["page"] == "/tested" and rec["status"] == "new" and rec["id"] == out["id"]
    assert not {"email", "link", "details", "extra", "website"} & set(rec), rec
    assert set(rec) == {"kind", "brand", "model", "slicer", "message", "page", "id", "received", "status"}

    # the minimum request (brand + model only)
    st, out = post({"kind": "printer-request", "brand": "Acme", "model": "Z2"})
    assert st == 200
    rec = [r for r in saved() if r["id"] == out["id"]][0]
    assert rec["model"] == "Z2" and "message" not in rec and "slicer" not in rec

    # problem reports are unchanged
    assert post({"message": "hi"})[0] == 400
    assert post({"message": "colours were wrong", "email": "not-an-email"})[0] == 400
    st, out = post({"message": "colours were wrong", "email": "me@example.com", "brand": "ignored"})
    assert st == 200
    rep = [r for r in saved() if r["id"] == out["id"]][0]
    assert "kind" not in rep and "brand" not in rep and rep["email"] == "me@example.com"

    # the per-IP limit applies to printer requests too
    codes = [post({"kind": "printer-request", "brand": "Acme", "model": f"Z{i}"}, new_ip=(i == 0))[0] for i in range(6)]
    assert codes == [200] * 5 + [429], codes
    server.shutdown()
print("PASS: printer requests validated, allow-listed (no email/link/details), capped, honeypot and rate limit apply; problem reports unchanged")
