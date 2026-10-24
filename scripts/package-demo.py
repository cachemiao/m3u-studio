"""Package only the generated static site and dependency-free Windows launchers."""
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'docs/demo'
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist/m3u-studio-web-demo-win.zip'
assert (SITE/'index.html').is_file(), 'Run scripts/build-demo.py first'
OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(SITE.rglob('*')):
        if path.is_file():
            archive.write(path, 'm3u-studio-web-demo/site/' + path.relative_to(SITE).as_posix())
    for name in ['Start-Demo.cmd', 'demo-server.py', 'README.md']:
        content=(ROOT/'demo'/name).read_bytes()
        if name.endswith('.cmd'):
            content=content.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
        archive.writestr('m3u-studio-web-demo/'+name, content)
with zipfile.ZipFile(OUT) as archive:
    assert not any(any(part in name for part in ['/preview-data/', '/database/', '/.venv/', '/__pycache__/']) for name in archive.namelist())
    assert not any(name.endswith(('server.py', '.db', '.sqlite', '.env')) for name in archive.namelist() if not name.endswith('/demo-server.py'))
print(f'Windows static demo: {OUT} ({OUT.stat().st_size} bytes)')
