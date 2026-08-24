import http.server
import socketserver
import os
import sys
import gzip

PORT = 8081

# MIME types that benefit from gzip compression
COMPRESSIBLE_TYPES = {
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    'image/svg+xml',
}


class CompressedHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Static file handler tuned for fast local development:
    - HTTP/1.1 with persistent connections
    - charset=UTF-8 on text responses
    - gzip compression for text assets when accepted
    - No-cache headers to avoid stale UI during development
    - CORS headers for local development
    """
    protocol_version = "HTTP/1.0"

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype in ('text/html', 'text/css', 'text/javascript',
                     'application/javascript', 'application/x-javascript'):
            ctype += '; charset=UTF-8'
        return ctype

    def _should_compress(self, ctype):
        base = ctype.split(';')[0].strip().lower()
        return base in COMPRESSIBLE_TYPES

    def _accepts_gzip(self):
        encodings = self.headers.get('Accept-Encoding', '')
        return 'gzip' in encodings.lower()

    def do_GET(self):
        path = self.translate_path(self.path)

        # Let SimpleHTTPRequestHandler handle directory listings etc.
        if not os.path.isfile(path):
            super().do_GET()
            return

        ctype = self.guess_type(path)

        if not self._should_compress(ctype) or not self._accepts_gzip():
            super().do_GET()
            return

        try:
            with open(path, 'rb') as f:
                data = f.read()
        except OSError:
            self.send_error(404, "File not found")
            return

        compressed = gzip.compress(data, compresslevel=6)

        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(compressed)))
        self.send_header('Last-Modified', self.date_time_string(os.path.getmtime(path)))
        self.end_headers()
        self.wfile.write(compressed)


if len(sys.argv) > 1:
    os.chdir(sys.argv[1])

Handler = CompressedHTTPRequestHandler

# Set allow_reuse_address to avoid "Address already in use" errors if we restart quickly
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT} (HTTP/1.1, gzip, UTF-8, no-cache, CORS)...")
    httpd.serve_forever()
