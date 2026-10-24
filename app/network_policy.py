"""Policies for administrator-requested outbound HTTP, independent of authentication."""
import ipaddress
import os
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from time import monotonic
from urllib.parse import urlsplit

class AddressBlocked(ValueError):
    pass

resolver = ThreadPoolExecutor(max_workers=4, thread_name_prefix='outbound-dns')
_HARD_DENY = tuple(ipaddress.ip_network(value) for value in (
    '0.0.0.0/8', '169.254.0.0/16', '224.0.0.0/4', '240.0.0.0/4',
    '100.100.100.200/32', '::/128', 'fe80::/10', 'ff00::/8', 'fd00:ec2::254/128'))

def address(value):
    ip = ipaddress.ip_address(value)
    return ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped else ip

class AddressPolicy:
    def __init__(self, networks=(), ports=()):
        self.networks = tuple(ipaddress.ip_network(value, strict=False) for value in networks)
        self.ports = frozenset(int(port) for port in ports)
        if any(not 1 <= port <= 65535 for port in self.ports):
            raise ValueError('Allowed ports must be between 1 and 65535')

    @classmethod
    def from_environment(cls, prefix):
        def values(name):
            return [item.strip() for item in os.environ.get(name, '').split(',') if item.strip()]
        return cls(values(prefix + '_ALLOWED_NETWORKS'), values(prefix + '_ALLOWED_PORTS'))

    def allows(self, value):
        ip = address(value)
        if any(ip.version == net.version and ip in net for net in _HARD_DENY):
            return False
        if isinstance(ip, ipaddress.IPv6Address) and (ip.sixtofour or ip.teredo):
            return False
        matches = [net for net in self.networks if net.version == ip.version and ip in net]
        # Loopback is only permitted by an explicit single-host exception, not a broad CIDR.
        if ip.is_loopback:
            return any(net.prefixlen == ip.max_prefixlen for net in matches)
        return bool(matches) or (ip.is_global and not ip.is_multicast and not ip.is_reserved)

    def check_url(self, url):
        if not isinstance(url,str) or len(url)>8192 or any(ord(c)<32 or ord(c)==127 for c in url):
            raise AddressBlocked('Invalid outbound URL')
        parsed=urlsplit(url)
        if parsed.scheme not in ('http','https') or not parsed.hostname or '%' in parsed.hostname:
            raise AddressBlocked('Only unscoped HTTP/HTTPS targets are supported')
        port=parsed.port or (443 if parsed.scheme=='https' else 80)
        if not 1<=port<=65535 or (self.ports and port not in self.ports):
            raise AddressBlocked('Target port is not permitted')
        return parsed

    def resolve(self, host, port, deadline):
        # Numeric targets are checked before DNS, including IPv4-mapped IPv6.
        try:
            if not self.allows(host):raise AddressBlocked('Target address is not permitted')
        except ValueError as error:
            if isinstance(error,AddressBlocked):raise
        future=resolver.submit(socket.getaddrinfo,host,port,0,socket.SOCK_STREAM)
        try: records=future.result(timeout=max(.001,deadline-monotonic()))
        except FutureTimeout:
            future.cancel();raise TimeoutError() from None
        if not records or any(not self.allows(item[4][0]) for item in records):
            raise AddressBlocked('Resolved target address is not permitted')
        return records

def connect_checked(policy, address_pair, deadline, source_address=None):
    host,port=address_pair
    if policy.ports and port not in policy.ports:raise AddressBlocked('Target port is not permitted')
    records=policy.resolve(host,port,deadline)
    last_error=None
    for family,kind,protocol,_,target in records:
        sock=socket.socket(family,kind,protocol)
        try:
            remaining=deadline-monotonic()
            if remaining<=0:raise TimeoutError()
            sock.settimeout(remaining)
            if source_address:sock.bind(source_address)
            # Connect directly to the validated record; never resolve the hostname a second time.
            sock.connect(target)
            sock.settimeout(max(.001,deadline-monotonic()))
            return sock
        except OSError as error:
            sock.close();last_error=error
            if isinstance(error,TimeoutError):raise
    raise last_error or OSError('No usable target address')
