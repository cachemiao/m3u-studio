from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from unittest.mock import Mock
import pytest
from test_app import server, auth, client

M3U = '\ufeff#EXTM3U\n#EXTINF:-1 tvg-id="remote.one" group-title="综合",远程频道\nhttps://example.test/live.m3u8\n'.encode()

@pytest.fixture
def remote(monkeypatch, server):
    from network_policy import AddressPolicy
    server.import_policy = AddressPolicy(['127.0.0.1/32'])
    monkeypatch.setenv('no_proxy', '127.0.0.1,localhost')
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith('/redirect'):
                self.send_response(302)
                self.send_header('Location', {'/redirect-file':'file:///not-a-playlist','/redirect-ftp':'ftp://example.test/list'}.get(self.path, '/list.m3u'))
                self.end_headers()
                return
            kind, body, code = 'text/plain', M3U, 200
            if self.path == '/html-m3u': kind = 'text/html'
            elif self.path == '/list.txt': body = '综合,#genre#\n远程TXT,https://example.test/txt\n'.encode()
            elif self.path == '/large': body = b'#' * (8 * 1024 * 1024 + 1)
            elif self.path == '/html': kind, body = 'text/html', b'<html>Login required</html>'
            elif self.path == '/encoding': body = b'\xff\xfe'
            elif self.path == '/empty': body = b'#EXTM3U\n'
            elif self.path == '/missing': code = 404
            self.send_response(code)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def log_message(self, *_): pass
    http = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = Thread(target=http.serve_forever, daemon=True)
    thread.start()
    yield f'http://127.0.0.1:{http.server_port}'
    http.shutdown()
    http.server_close()
    thread.join()

@pytest.mark.parametrize('path,name', [('/list.m3u','远程频道'),('/html-m3u','远程频道'),('/list.txt','远程TXT'),('/redirect','远程频道'),('/中文节目.m3u?token=a%2Bb','远程频道')])
def test_fetch_parse_without_publishing(server, auth, remote, path, name):
    c = client(server, auth)
    before = c.get('/api/state').json
    response = c.post('/api/import/url', json={'url':remote+path}, headers=auth)
    assert response.status_code == 200
    assert response.json['channels'][0]['name'] == name
    assert response.json['report']['imported'] == 1
    assert c.get('/api/state').json == before

@pytest.mark.parametrize('data', [{}, {'url':None}, {'url':1}, {'url':''}, {'url':'file:///etc/passwd'}, {'url':'ftp://example.test/a'}, {'url':'https://'}, {'url':'https://example.test/invalid\nheader'}, {'url':'https://example.test/'+('a'*8192)}, []])
def test_invalid_url(server, auth, data):
    response = client(server, auth).post('/api/import/url', json=data, headers=auth)
    assert response.status_code == 400

@pytest.mark.parametrize('path,status', [('/html',400),('/encoding',400),('/large',413),('/missing',502),('/redirect-file',502),('/redirect-ftp',403)])
def test_remote_errors(server, auth, remote, path, status):
    c = client(server, auth)
    response = c.post('/api/import/url', json={'url':remote+path}, headers=auth)
    assert response.status_code == status
    assert 'error' in response.json
    assert c.get('/api/state').json['revision'] == 0

def test_empty_playlist(server, auth, remote):
    c = client(server, auth)
    response = c.post('/api/import/url', json={'url':remote+'/empty'}, headers=auth)
    assert response.status_code == 400
    assert response.json['error'] == '未找到频道'
    assert c.get('/api/state').json['lists'] == []

def test_auth_and_csrf(server, auth):
    c = server.app.test_client()
    assert c.post('/api/import/url', json={'url':'https://example.test'}).status_code == 403
    assert c.post('/api/import/url', json={'url':'https://example.test'}, headers=auth).status_code == 401
    c = client(server, auth)
    assert c.post('/api/import/url', json={'url':'https://example.test'}).status_code == 403

def test_timeout(server, auth, monkeypatch):
    opener = Mock()
    opener.open.side_effect = TimeoutError()
    monkeypatch.setattr(server, 'download_playlist', lambda *_: opener.open(timeout=10).read())
    response = client(server, auth).post('/api/import/url', json={'url':'https://example.test'}, headers=auth)
    assert response.status_code == 502
    assert opener.open.call_args.kwargs['timeout'] == 10
