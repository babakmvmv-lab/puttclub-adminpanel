#!/usr/bin/env python3
"""Local-only UI preview server with an intentionally blank Supabase config."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PREVIEW_FLAG = b'<script>window.ADMINPANEL_PREVIEW = true;</script>\n  <script src="./config.js"></script>'
PREVIEW_CONFIG = b"""/* Local preview only: deliberately no Supabase credentials. */
window.ADMINPANEL_CONFIG = Object.freeze({
  supabaseUrl: "",
  publicKey: "",
  accessTable: "adminpanel_access"
});
"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def send_bytes(self, body, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path == "/config.js":
            return self.send_bytes(PREVIEW_CONFIG, "application/javascript; charset=utf-8")
        if path == "/__preview":
            # Same index.html as production, plus a local-only flag that opens the
            # dashboard shell with demo numbers (the blank config keeps Auth off).
            body = (PUBLIC / "index.html").read_bytes()
            body = body.replace(b'<script src="./config.js"></script>', PREVIEW_FLAG, 1)
            return self.send_bytes(body, "text/html; charset=utf-8")
        return super().do_GET()

    def log_message(self, fmt, *args):
        print("[adminpanel-preview] " + fmt % args)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 4173), Handler)
    print("Adminpanel preview listening on 0.0.0.0:4173 (blank Supabase config; no Auth calls)")
    server.serve_forever()
