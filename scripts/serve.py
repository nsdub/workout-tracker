#!/usr/bin/env python3
"""Dev server with no-store headers so module edits are never HTTP-cached."""
import http.server
import os
import sys

os.chdir(os.path.join(os.path.dirname(__file__), '..'))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8408
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
