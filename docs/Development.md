# Local development and contributing

[Home](../README.en.md) · [Deployment and maintenance](Deployment.md) · [简体中文](开发指南.md)

## Stack

Python 3.12 / Flask provides the management API, login sessions and subscriptions. SQLite stores configuration and accounts, and Pillow processes logos. The frontend uses plain HTML / CSS / JavaScript with no Node build. Production images use Gunicorn and run as a non-root user.

## Run locally without Docker

Install Python 3.12 and Git. Clone your fork or the project repository and work from its root.

### macOS / Linux

```sh
git clone https://github.com/cachemiao/m3u-studio.git
cd m3u-studio
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
DATA_DIR="$PWD/data-dev" .venv/bin/python -m flask --app app/server.py run --host 127.0.0.1 --port 8324 --debug
```

### Windows PowerShell

```powershell
git clone https://github.com/cachemiao/m3u-studio.git
cd m3u-studio
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:DATA_DIR = "$PWD\data-dev"
.\.venv\Scripts\python.exe -m flask --app app/server.py run --host 127.0.0.1 --port 8324 --debug
```

Visit `http://127.0.0.1:8324` and create your account. Development data stays in `data-dev/`, separate from Docker volumes. Change `--port` if needed; Ctrl+C stops the server, and file changes trigger automatic reloads.

Binding to `127.0.0.1` keeps this development server local. Do not expose Flask's debugger publicly or use it for production. Fresh installations need no `.env` and have no default admin password.

## Validate changes

Install pytest in the virtual environment, then run tests relevant to your changes. The commands below use macOS / Linux paths; on Windows, replace `.venv/bin/python` with `.\.venv\Scripts\python.exe`.

```sh
.venv/bin/python -m pip install pytest
.venv/bin/python -m pytest tests -q
```

Node.js 18+ is used for frontend logic tests, not to build or run the app:

```sh
node --test tests/test_editor_core.cjs tests/test_i18n.cjs tests/test_import.cjs tests/test_logo_upload.cjs tests/test_source_check.cjs
```

For UI changes, check both languages, light/dark modes and mobile widths. Validate deployment changes with `docker compose -f docker-compose.image.yml config --quiet`. See [VALIDATION.md](../VALIDATION.md) for more verification notes.

## Submit a pull request

1. Fork the repository and create a focused branch from current `main`. Replace the clone URL with your fork when developing.
2. Solve one clear problem per PR. Include relevant validation for behavior changes.
3. Describe the problem, resulting behavior and validation. Add screenshots for UI changes and update user-facing documentation as needed.
4. Check `git diff --check` and `git status` before submitting. Do not commit `data/`, `data-dev/`, `.venv/`, `.env`, credentials, private stream URLs or logos you cannot distribute.

[Report an issue](https://github.com/cachemiao/m3u-studio/issues) · [Browse pull requests](https://github.com/cachemiao/m3u-studio/pulls)
