import json
import sys
from pathlib import Path
from unittest.mock import Mock

import pytest

sys.path.insert(0, str(Path(__file__).parents[1] / 'app'))
from release_updates import DAY, PROJECT_URL, ReleaseChecker, fetch_latest, version_tuple
from test_app import server, auth, client


@pytest.mark.parametrize('value', ['v0.6.1-beta', '', None, '0.6', '0.6.1/evil', 'x1.2.3'])
def test_reject_non_stable_versions(value):
    with pytest.raises(ValueError):
        version_tuple(value)


def test_numeric_versions_daily_cache_and_restart(tmp_path):
    now = [1000000]
    fetch = Mock(return_value='0.10.0')
    path = tmp_path / 'updates.json'
    checker = ReleaseChecker('0.9.0', path, fetch, lambda: now[0])
    result = checker.check()
    assert result['update_available']
    assert result['release_url'] == PROJECT_URL + '/releases/tag/v0.10.0'
    now[0] += DAY - 1
    assert checker.check() == result
    assert fetch.call_count == 1
    # Restart does not cause another outbound request within the daily interval.
    restarted = ReleaseChecker('0.10.0', path, fetch, lambda: now[0])
    assert not restarted.check()['update_available']
    assert fetch.call_count == 1
    now[0] += 1
    restarted.check()
    assert fetch.call_count == 2


def test_daily_failure_cache_retains_release_and_survives_restart(tmp_path):
    now = [1000000]
    fetch = Mock(side_effect=['0.6.1', OSError('offline'), '0.6.2'])
    path = tmp_path/'updates.json'
    checker = ReleaseChecker('0.6.0', path, fetch, lambda: now[0])
    checker.check()
    now[0] += DAY - 1
    checker.check()
    assert fetch.call_count == 1
    now[0] += 1
    failed = checker.check()
    assert failed['check_failed'] and failed['update_available']
    assert failed['latest_version'] == '0.6.1'
    assert failed['checked_at'] == 1000000
    restarted = ReleaseChecker('0.6.0', path, fetch, lambda: now[0])
    now[0] += DAY - 1
    restarted.check()
    assert fetch.call_count == 2
    now[0] += 1
    recovered = restarted.check()
    assert recovered['latest_version'] == '0.6.2' and not recovered['check_failed']


def test_failure_without_prior_result_is_not_up_to_date(tmp_path):
    checker = ReleaseChecker('0.6.0', tmp_path/'updates.json', Mock(side_effect=TimeoutError))
    result = checker.check()
    assert result['check_failed'] and result['checked_at'] is None
    assert result['latest_version'] is None and not result['update_available']


@pytest.mark.parametrize('payload', [b'not json', b'[]', json.dumps({'latest_version':'invalid'}).encode()])
def test_corrupt_cache_can_recover(tmp_path, payload):
    path = tmp_path/'updates.json'
    path.write_bytes(payload)
    checker = ReleaseChecker('0.6.0', path, Mock(return_value='0.6.0'))
    assert not checker.check()['check_failed']


@pytest.mark.parametrize('release', [
    {'tag_name':'v0.6.1-beta','prerelease':True},
    {'tag_name':'v0.6.1','draft':True},
    {'tag_name':'https://evil.test'},
    [],
])
def test_untrusted_release_rejected(monkeypatch, release):
    import release_updates
    response = Mock()
    response.__enter__ = Mock(return_value=response)
    response.__exit__ = Mock(return_value=False)
    response.read.return_value = json.dumps(release).encode()
    monkeypatch.setattr(release_updates, 'build_opener', Mock(return_value=Mock(open=Mock(return_value=response))))
    with pytest.raises(ValueError):
        fetch_latest()


def test_route_requires_login_and_does_not_change_playlists(server, auth, tmp_path):
    server.release_checker = ReleaseChecker('0.6.0', tmp_path/'updates.json', Mock(return_value='0.6.1'))
    anonymous = server.app.test_client()
    assert anonymous.get('/api/version').status_code == 401
    c = client(server, auth)
    before = c.get('/api/state').json
    assert c.get('/api/auth/status').json['version'] == server.APP_VERSION
    result = c.get('/api/version').json
    assert result['update_available'] and result['latest_version'] == '0.6.1'
    assert c.post('/api/version', headers=auth).status_code == 405
    assert c.get('/api/state').json == before
