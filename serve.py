"""Local server: extensionless English URLs, and redirects from the old Dutch ones."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import json
import os
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765

with open(os.path.join(ROOT, "redirects.json"), encoding="utf-8") as handle:
    REDIRECTS = json.load(handle)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        split = urlsplit(self.path)
        original = unquote(split.path)
        if original != "/" and original.endswith("/"):
            original = original[:-1]
        query = ("?" + split.query) if split.query else ""

        canonical = original
        if canonical == "/index.html":
            canonical = "/"
        elif canonical.endswith(".html"):
            canonical = canonical[:-5] or "/"

        if canonical in REDIRECTS["pages"]:
            canonical = REDIRECTS["pages"][canonical]

        drop_query = False
        if canonical == "/artikel":
            entry_id = parse_qs(split.query).get("id", [""])[0]
            canonical = REDIRECTS["entries"].get(entry_id) or "/archive"
            drop_query = True

        if canonical != original:
            self._redirect(canonical + ("" if drop_query else query))
            return

        if canonical == "/":
            self.path = "/index.html" + query
            return super().do_GET()

        rel = canonical.lstrip("/")
        if not rel or ".." in rel.split("/"):
            self._missing()
            return

        html = os.path.normpath(os.path.join(ROOT, rel + ".html"))
        direct = os.path.normpath(os.path.join(ROOT, rel))
        root = os.path.normpath(ROOT)
        if os.path.commonpath([root, html]) != root or os.path.commonpath([root, direct]) != root:
            self._missing()
            return

        if os.path.isfile(html):
            self.path = "/" + rel.replace("\\", "/") + ".html" + query
            return super().do_GET()

        if os.path.isfile(direct):
            self.path = "/" + rel.replace("\\", "/") + query
            return super().do_GET()

        self._missing()

    def _redirect(self, location):
        self.send_response(301)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _missing(self):
        body = open(os.path.join(ROOT, "404.html"), "rb").read()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
