"""Local integration test for the anonymous counter; never contacts production."""
import concurrent.futures
import http.client
import importlib.util
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer

entry = Path(__file__).resolve().parents[1] / "deploy/filashift-api.py"
spec = importlib.util.spec_from_file_location("inbox", entry)
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

with tempfile.TemporaryDirectory() as tmp, ThreadingHTTPServer(("127.0.0.1", 0), api.H) as server:
    api.VIEW_DB = tmp + "/counts.db"
    threading.Thread(target=server.serve_forever, daemon=True).start()

    def send(path="/api/page-view", data=b"", origin="https://filashift.com"):
        conn = http.client.HTTPConnection(*server.server_address, timeout=8)
        conn.request("POST", path, data, {"Origin": origin, "Cookie": "example=private", "X-Forwarded-For": "192.0.2.4"})
        res = conn.getresponse()
        assert not res.getheader("Set-Cookie")
        conn.close()
        return res.status

    assert send(origin="https://example.org") == 403
    assert send(data=b"not accepted") == 400
    assert send(path="/api/page-view?extra=1") == 404
    assert not os.path.exists(api.VIEW_DB)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        assert list(pool.map(lambda _: send(), range(16))) == [204] * 16
    with sqlite3.connect(api.VIEW_DB) as db:
        assert [col[1] for col in db.execute("PRAGMA table_info(daily_views)")] == ["day", "views"]
        assert db.execute("SELECT day=date('now'), views FROM daily_views").fetchall() == [(1, 16)]
    assert not api.hits
    csv = subprocess.check_output([sys.executable, str(entry), "--daily-views"], env={**os.environ, "FILASHIFT_VIEW_DB": api.VIEW_DB}, text=True)
    assert csv.startswith("date_utc,page_views\n") and csv.endswith(",16\n")
    server.shutdown()
print("PASS: atomic daily increments, no identifying columns/cookies, rejected extra data and cross-origin requests, private CSV report")
