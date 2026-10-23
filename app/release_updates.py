"""Daily, bounded checks of the project's public stable GitHub release."""
import json
import re
import time
from pathlib import Path
from threading import Lock
from urllib.request import Request, build_opener, HTTPRedirectHandler

PROJECT_URL = 'https://github.com/cachemiao/m3u-studio'
RELEASE_API = 'https://api.github.com/repos/cachemiao/m3u-studio/releases/latest'
DAY = 24 * 60 * 60


def version_tuple(value):
    if not isinstance(value, str) or not re.fullmatch(r'v?\d{1,6}\.\d{1,6}\.\d{1,6}', value):
        raise ValueError('Invalid stable release version')
    return tuple(int(part) for part in value.lstrip('v').split('.'))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_latest():
    request = Request(RELEASE_API, headers={
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'M3U-Studio-update-check',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    with build_opener(NoRedirect()).open(request, timeout=6) as response:
        body = response.read(256 * 1024 + 1)
    if len(body) > 256 * 1024:
        raise ValueError('Release response too large')
    release = json.loads(body)
    if not isinstance(release, dict) or release.get('draft') or release.get('prerelease'):
        raise ValueError('Not a public stable release')
    version_tuple(release.get('tag_name'))
    return release['tag_name'].lstrip('v')


class ReleaseChecker:
    def __init__(self, current, cache_path, fetch=fetch_latest, clock=time.time):
        version_tuple(current)
        self.current, self.path = current, Path(cache_path)
        self.fetch, self.clock, self.lock = fetch, clock, Lock()
        self.cache = {}
        try:
            cache = json.loads(self.path.read_text(encoding='utf-8'))
            if not isinstance(cache, dict):
                raise ValueError('Invalid cache')
            if cache.get('latest_version') is not None:
                version_tuple(cache['latest_version'])
            if not isinstance(cache['attempted_at'], (int, float)):
                raise ValueError('Invalid cache time')
            if cache.get('checked_at') is not None and not isinstance(cache['checked_at'], (int, float)):
                raise ValueError('Invalid cache time')
            if cache.get('latest_version') and not cache.get('checked_at'):
                raise ValueError('Missing check time')
            self.cache = cache
        except (OSError, ValueError, KeyError, TypeError):
            pass

    def check(self):
        with self.lock:
            now = self.clock()
            attempted = self.cache.get('attempted_at', 0)
            # Cache failures too, so offline deployments still check only daily.
            due = not attempted or now - attempted >= DAY or now < attempted
            if due:
                self.cache['attempted_at'] = now
                try:
                    latest = self.fetch()
                    version_tuple(latest)
                    self.cache.update(latest_version=latest, checked_at=now, error=False)
                except Exception:
                    # Keep the last successful result; network errors never mean "up to date".
                    self.cache['error'] = True
                try:
                    temporary = self.path.with_suffix('.tmp')
                    temporary.write_text(json.dumps(self.cache), encoding='utf-8')
                    temporary.replace(self.path)
                except OSError:
                    pass  # Read-only data storage must not stop the editor.
            latest = self.cache.get('latest_version')
            available = bool(latest and version_tuple(latest) > version_tuple(self.current))
            return {
                'current_version': self.current,
                'latest_version': latest,
                'update_available': available,
                'checked_at': self.cache.get('checked_at'),
                'check_failed': bool(self.cache.get('error')),
                'release_url': f'{PROJECT_URL}/releases/tag/v{latest}' if latest else f'{PROJECT_URL}/releases',
            }
