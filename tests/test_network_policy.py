import sys, socket
from pathlib import Path
from time import monotonic
from unittest.mock import Mock
import pytest

sys.path.insert(0, str(Path(__file__).parents[1] / "app"))
from network_policy import AddressPolicy, AddressBlocked, connect_checked
from remote_playlist import PolicyRedirect
from test_app import server, auth, client


@pytest.mark.parametrize(
    "value",
    [
        "127.0.0.1",
        "::1",
        "0.0.0.0",
        "169.254.169.254",
        "169.254.170.2",
        "100.100.100.200",
        "fd00:ec2::254",
        "::ffff:127.0.0.1",
        "::ffff:169.254.169.254",
        "192.168.1.1",
        "10.0.0.1",
        "172.16.0.1",
        "fc00::1",
        "224.0.0.1",
        "fe80::1",
    ],
)
def test_default_blocks_nonpublic_targets(value):
    assert not AddressPolicy().allows(value)


def test_separate_allowlists_preserve_explicit_private_iptv():
    source = AddressPolicy(["192.168.1.20/32", "fc00:1234::/64"], [80, 3224])
    assert source.allows("192.168.1.20") and not source.allows("192.168.1.21")
    assert source.allows("fc00:1234::1") and not source.allows("fc00:5678::1")
    assert not AddressPolicy().allows("192.168.1.20")
    with pytest.raises(AddressBlocked):
        source.check_url("http://192.168.1.20:22")
    assert AddressPolicy().allows("8.8.8.8")


def test_sensitive_endpoints_cannot_be_enabled_with_broad_allowlist():
    policy = AddressPolicy(["0.0.0.0/0", "::/0"])
    for value in [
        "169.254.169.254",
        "100.100.100.200",
        "fd00:ec2::254",
        "::ffff:169.254.169.254",
    ]:
        assert not policy.allows(value)
    assert not policy.allows("127.0.0.1")
    assert AddressPolicy(["127.0.0.1/32"]).allows("127.0.0.1")


def test_mixed_dns_answers_fail_closed_and_do_not_connect(monkeypatch):
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *_: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 80)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80)),
        ],
    )
    sock = Mock()
    monkeypatch.setattr(socket, "socket", sock)
    with pytest.raises(AddressBlocked):
        connect_checked(AddressPolicy(), ("example.test", 80), monotonic() + 1)
    sock.assert_not_called()


def test_dns_is_resolved_once_and_validated_address_is_pinned(monkeypatch):
    dns = Mock(
        return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 80))]
    )
    monkeypatch.setattr(socket, "getaddrinfo", dns)
    sock = Mock()
    monkeypatch.setattr(socket, "socket", Mock(return_value=sock))
    assert (
        connect_checked(AddressPolicy(), ("example.test", 80), monotonic() + 1) is sock
    )
    dns.assert_called_once()
    sock.connect.assert_called_once_with(("8.8.8.8", 80))


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.test/a",
        "http://[fe80::1%25eth0]/",
        "http://example.test/\nfoo",
    ],
)
def test_unsafe_urls_rejected(url):
    with pytest.raises(AddressBlocked):
        AddressPolicy().check_url(url)


def test_authenticated_routes_reject_sensitive_targets_without_network(
    server, auth, monkeypatch
):
    conn = Mock()
    monkeypatch.setattr(socket, "socket", conn)
    c = client(server, auth)
    assert (
        c.post(
            "/api/import/url",
            json={"url": "http://169.254.169.254/latest/meta-data/"},
            headers=auth,
        ).status_code
        == 403
    )
    result = c.post(
        "/api/source-check", json={"url": "http://169.254.169.254/"}, headers=auth
    )
    assert result.json == {"status": "unavailable", "blocked": True}
    conn.assert_not_called()


def test_redirect_is_checked_before_connecting_to_metadata(server, auth, monkeypatch):
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    from threading import Thread

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(302)
            self.send_header("Location", "http://169.254.169.254/latest/meta-data/")
            self.end_headers()

        def log_message(self, *_):
            pass

    http = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=http.serve_forever, daemon=True)
    thread.start()
    lookup = socket.getaddrinfo
    hosts = []

    def checked_lookup(host, *args):
        hosts.append(host)
        return lookup(host, *args)

    monkeypatch.setattr(socket, "getaddrinfo", checked_lookup)
    server.import_policy = server.source_policy = AddressPolicy(["127.0.0.1/32"])
    try:
        c = client(server, auth)
        url = f"http://127.0.0.1:{http.server_port}/start"
        assert (
            c.post("/api/import/url", json={"url": url}, headers=auth).status_code
            == 403
        )
        assert c.post("/api/source-check", json={"url": url}, headers=auth).json[
            "blocked"
        ]
        assert hosts and all(host == "127.0.0.1" for host in hosts)
    finally:
        http.shutdown()
        http.server_close()
        thread.join()
