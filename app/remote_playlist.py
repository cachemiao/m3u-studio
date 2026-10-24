"""Bounded, direct playlist download; redirects re-enter the address policy."""
import http.client
from time import monotonic
from urllib.request import Request, build_opener, ProxyHandler, HTTPHandler, HTTPSHandler, HTTPRedirectHandler
from network_policy import connect_checked, AddressBlocked

class PolicyRedirect(HTTPRedirectHandler):
    max_redirections=3
    def __init__(self,policy):self.policy=policy
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        self.policy.check_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def download_playlist(url,policy,limit,timeout=10):
    policy.check_url(url)
    deadline=monotonic()+timeout
    def factory(kind):
        def create(host,**kwargs):
            connection=kind(host,**kwargs)
            connection._create_connection=lambda pair,timeout=None,source_address=None:connect_checked(policy,pair,deadline,source_address)
            return connection
        return create
    class HTTP(HTTPHandler):
        def http_open(self,req):
            policy.check_url(req.full_url)
            return self.do_open(factory(http.client.HTTPConnection),req)
    class HTTPS(HTTPSHandler):
        def https_open(self,req):
            policy.check_url(req.full_url)
            return self.do_open(factory(http.client.HTTPSConnection),req,context=self._context)
    # An environment proxy could resolve/connect elsewhere. These user-supplied targets
    # deliberately use direct, checked connections; release checks retain their own transport.
    opener=build_opener(ProxyHandler({}),PolicyRedirect(policy),HTTP(),HTTPS())
    request=Request(url,headers={'User-Agent':'M3U-Studio-Import','Accept-Encoding':'identity'})
    with opener.open(request,timeout=max(.001,deadline-monotonic())) as response:
        chunks=[];size=0
        while size<=limit:
            remaining=deadline-monotonic()
            if remaining<=0:raise TimeoutError()
            sock=getattr(getattr(getattr(response,'fp',None),'raw',None),'_sock',None)
            if sock:sock.settimeout(remaining)
            chunk=response.read1(min(65536,limit+1-size))
            if not chunk:break
            chunks.append(chunk);size+=len(chunk)
        return b''.join(chunks)
