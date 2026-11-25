#!/usr/bin/env python3
"""FilaShift report inbox: a tiny stdlib HTTP service behind Caddy (/api/*).

POST /api/report  JSON {message, link?, email?, details?, page?, website?}  -> {"ok": true, "id": ...}
POST /api/report  JSON {kind: "printer-request", brand, model, slicer?, message?, page?, website?}
                  (a request to add a printer; no email, link or details are accepted for this kind)
GET  /api/health  -> {"ok": true}

Reports are written one JSON file each to REPORT_DIR. Project files are never accepted:
the body is capped at 16 KB and only the fields above are kept.
"""
import json
import os
import re
import secrets
import sqlite3
import sys
import time
from contextlib import closing
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("FILASHIFT_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("FILASHIFT_API_PORT", "8787"))
REPORT_DIR = os.environ.get("FILASHIFT_REPORT_DIR", "/var/lib/filashift/reports")
VIEW_DB = os.environ.get("FILASHIFT_VIEW_DB", "/var/lib/filashift/pageviews.sqlite3")
MAX_BODY = 16 * 1024
PER_IP = (5, 3600)  # 5 reports per IP per hour
GLOBAL = (200, 86400)  # 200 reports per day in total
LIMITS = {"message": 4000, "link": 500, "email": 200, "details": 6000, "page": 200}
# "Request a printer": only these fields are kept (no email, link or conversion details)
REQUEST_LIMITS = {"brand": 80, "model": 120, "slicer": 80, "message": 1000, "page": 200}
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")

hits = defaultdict(deque)
all_hits = deque()


def allowed(ip):
    now = time.time()
    q = hits[ip]
    while q and q[0] < now - PER_IP[1]:
        q.popleft()
    while all_hits and all_hits[0] < now - GLOBAL[1]:
        all_hits.popleft()
    if len(q) >= PER_IP[0] or len(all_hits) >= GLOBAL[0]:
        return False
    q.append(now)
    all_hits.append(now)
    return True


class H(BaseHTTPRequestHandler):
    server_version = "filashift-api"
    sys_version = ""

    def log_message(self, fmt, *args):  # no request logging (privacy policy: no access logs)
        pass

    def send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/health":
            return self.send(200, {"ok": True})
        self.send(404, {"ok": False})

    def do_POST(self):
        if self.path == "/api/page-view":
            if self.headers.get("Origin") != "https://filashift.com":
                return self.send(403, {"ok": False})
            if self.headers.get("Transfer-Encoding") or self.headers.get("Content-Length", "0") != "0":
                return self.send(400, {"ok": False})
            # No request-derived values enter storage; SQLite computes the UTC day.
            try:
                with closing(sqlite3.connect(VIEW_DB, timeout=3)) as db, db:
                    db.execute("CREATE TABLE IF NOT EXISTS daily_views(day TEXT PRIMARY KEY, views INTEGER NOT NULL) WITHOUT ROWID")
                    db.execute("INSERT INTO daily_views VALUES(date('now'),1) ON CONFLICT(day) DO UPDATE SET views=views+1")
            except sqlite3.Error:
                return self.send(503, {"ok": False})
            self.send_response(204)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        if self.path.split("?")[0] != "/api/report":
            return self.send(404, {"ok": False})
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            return self.send(415, {"ok": False, "error": "JSON only"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if n <= 0 or n > MAX_BODY:
            return self.send(413, {"ok": False, "error": "Report too large"})
        try:
            data = json.loads(self.rfile.read(n))
            assert isinstance(data, dict)
        except Exception:
            return self.send(400, {"ok": False, "error": "Bad request"})
        if data.get("website"):  # honeypot field, hidden from people
            return self.send(200, {"ok": True, "id": "x"})
        kind = data.get("kind", "problem")
        if kind not in ("problem", "printer-request"):
            return self.send(400, {"ok": False, "error": "Bad request"})
        rec = {}
        for k, lim in (REQUEST_LIMITS if kind == "printer-request" else LIMITS).items():
            v = data.get(k)
            if isinstance(v, str) and v.strip():
                rec[k] = v.strip()[:lim]
        if kind == "printer-request":
            if len(rec.get("brand", "")) < 2 or len(rec.get("model", "")) < 1:
                return self.send(400, {"ok": False, "error": "Please enter the printer brand and model"})
            rec = {"kind": kind, **rec}
        elif len(rec.get("message", "")) < 5:
            return self.send(400, {"ok": False, "error": "Please describe the problem"})
        if "email" in rec and not EMAIL_RE.match(rec["email"]):
            return self.send(400, {"ok": False, "error": "That email address does not look right"})
        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        if not allowed(ip):
            return self.send(429, {"ok": False, "error": "Too many reports, please try again later"})
        rid = time.strftime("%Y%m%d-%H%M%S", time.gmtime()) + "-" + secrets.token_hex(3)
        rec.update(id=rid, received=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), status="new")
        os.makedirs(REPORT_DIR, exist_ok=True)
        tmp = os.path.join(REPORT_DIR, f".{rid}.tmp")
        with open(tmp, "w") as f:
            json.dump(rec, f, indent=1)
        os.replace(tmp, os.path.join(REPORT_DIR, f"{rid}.json"))
        self.send(200, {"ok": True, "id": rid})


if __name__ == "__main__":
    if sys.argv[1:] == ["--daily-views"]:
        print("date_utc,page_views")
        if os.path.isfile(VIEW_DB):
            with closing(sqlite3.connect(f"file:{VIEW_DB}?mode=ro", uri=True)) as db:
                for day, n in db.execute("SELECT day, views FROM daily_views ORDER BY day"):
                    print(f"{day},{n}")
        sys.exit(0)
    if len(sys.argv) > 1:
        REPORT_DIR = sys.argv[1]
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
