"""Bounded HTTP first-byte probes; never consume a live stream or media segments."""
import base64
import http.client
import socket
from time import monotonic
from urllib.parse import urlsplit, urljoin, unquote
from network_policy import AddressPolicy, AddressBlocked, connect_checked

TIMEOUT = 5
MAX_REDIRECTS = 3

def probe_http(url, policy=None):
    policy = policy or AddressPolicy.from_environment("SOURCE")
    started = monotonic()
    deadline = started + TIMEOUT
    for redirect in range(MAX_REDIRECTS + 1):
        connection = None
        try:
            parsed = urlsplit(url)
            if parsed.scheme not in ('http', 'https'):
                return {'status': 'unsupported'}
            policy.check_url(url)
            if not parsed.hostname or len(url) > 8192:
                return {'status': 'unavailable'}
            remaining = deadline - monotonic()
            if remaining <= 0:
                return {'status': 'timeout'}
            factory = http.client.HTTPSConnection if parsed.scheme == 'https' else http.client.HTTPConnection
            connection = factory(parsed.hostname, parsed.port, timeout=remaining)
            connection._create_connection = lambda address, timeout=None, source_address=None: connect_checked(policy, address, deadline, source_address)
            headers = {'User-Agent': 'M3U-Studio-Source-Check', 'Accept': '*/*',
                       'Accept-Encoding': 'identity', 'Connection': 'close'}
            if parsed.username is not None:
                credentials = unquote(parsed.username) + ':' + unquote(parsed.password or '')
                headers['Authorization'] = 'Basic ' + base64.b64encode(credentials.encode()).decode()
            path = parsed.path or '/'
            if parsed.query:
                path += '?' + parsed.query
            connection.request('GET', path, headers=headers)
            if connection.sock:
                connection.sock.settimeout(max(0.001, deadline - monotonic()))
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader('Location')
                if not location or redirect == MAX_REDIRECTS:
                    return {'status': 'unavailable'}
                url = urljoin(url, location)
                continue
            if not 200 <= response.status < 300:
                return {'status': 'unavailable', 'http_status': response.status}
            remaining = deadline - monotonic()
            if remaining <= 0:
                return {'status': 'timeout'}
            # Connection: close may detach the socket from HTTPConnection.
            response_socket = connection.sock or getattr(getattr(getattr(response, 'fp', None), 'raw', None), '_sock', None)
            if response_socket:
                response_socket.settimeout(remaining)
            # read1 does not wait to fill a large buffer. Close immediately; do not require Range support from live servers.
            response.read1(1)
            elapsed = monotonic() - started
            if elapsed >= TIMEOUT:
                return {'status': 'timeout'}
            return {'status': 'ok', 'ms': max(0, round(elapsed * 1000))}
        except AddressBlocked:
            return {'status': 'unavailable', 'blocked': True}
        except (TimeoutError, socket.timeout):
            return {'status': 'timeout'}
        except (OSError, ValueError, http.client.HTTPException, UnicodeError):
            return {'status': 'unavailable'}
        finally:
            if connection:
                connection.close()
    return {'status': 'unavailable'}
