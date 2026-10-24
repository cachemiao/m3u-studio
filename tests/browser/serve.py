from pathlib import Path
import os, sys, tempfile, signal

root = Path(__file__).resolve().parents[2]
folder = tempfile.TemporaryDirectory(prefix="m3u-browser-")
os.environ.update(
    DATA_DIR=folder.name,
    ADMIN_PASSWORD="browser-test-password-only",
    ADMIN_USER="test-admin",
)
sys.path.insert(0, str(root / "app"))
from server import app
from flask import send_from_directory


@app.route("/demo/")
@app.route("/demo/<path:name>")
def demo(name="index.html"):
    return send_from_directory(root / "docs/demo", name)


def stop(*_):
    folder.cleanup()
    raise SystemExit(0)


signal.signal(signal.SIGTERM, stop)
app.run(host="127.0.0.1", port=8357, threaded=True, use_reloader=False)
