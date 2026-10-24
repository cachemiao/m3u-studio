"""Read-only local static preview. No Flask, database or dependency installation."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent / 'site'
if not (ROOT / 'index.html').is_file():
    raise SystemExit('The site folder is missing. Extract the entire preview ZIP first.')

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; connect-src 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'")
        super().end_headers()
    def do_POST(self):
        self.send_error(405, 'Static demo: writes are not supported')
    do_PUT = do_POST
    do_DELETE = do_POST

server = None
for port in range(8340, 8360):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(ROOT)))
        break
    except OSError:
        pass
if server is None:
    raise SystemExit('No free preview port in 8340-8359.')
url = 'http://127.0.0.1:' + str(server.server_port)
print('M3U Studio static demo: ' + url, flush=True)
print('Fictional samples only. Refresh resets all channel edits. Ctrl+C stops this preview.', flush=True)
threading.Timer(1, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
