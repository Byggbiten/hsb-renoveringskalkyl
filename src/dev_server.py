"""Liten dev-server som serverar filer från denna mapp med no-cache headers.
Löser problemet att preview-iframen cachar data.js/app.js aggressivt under utveckling.
ThreadingHTTPServer så parallella requests inte blockerar varandra.
Användning: python dev_server.py [port]
"""
import http.server
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5520

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))
http.server.ThreadingHTTPServer.allow_reuse_address = True

with http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Dev-server (no-cache, threaded) på http://localhost:{PORT}', flush=True)
    httpd.serve_forever()
