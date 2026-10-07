#!/usr/bin/env python3
"""Local-only UI preview server. It serves public/ and one non-published shell preview route."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PREVIEW = ROOT / "dev" / "dashboard-preview.html"

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path == "/__preview":
            try:
                body = PREVIEW.read_bytes()
            except OSError:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print("[adminpanel-preview] " + fmt % args)

if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 4173), Handler)
    print("Adminpanel preview listening on 0.0.0.0:4173 (no Supabase requests; blank config)")
    server.serve_forever()
