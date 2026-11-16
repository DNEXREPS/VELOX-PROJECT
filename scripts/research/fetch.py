import sys, urllib.request, urllib.robotparser, urllib.parse, time, re, json
UA = "VELOX-catalog-research/1.0"
def allowed(url):
    p = urllib.parse.urlparse(url); rp = urllib.robotparser.RobotFileParser()
    try:
        req = urllib.request.Request(f"{p.scheme}://{p.netloc}/robots.txt", headers={"User-Agent": UA})
        rp.parse(urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore").splitlines())
    except Exception as e:
        return None
    return rp.can_fetch(UA, url)
def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.geturl(), r.read().decode("utf-8", "ignore")
if __name__ == "__main__":
    for u in sys.argv[1:]:
        a = allowed(u)
        if a is False: print(u, "ROBOTS-DISALLOWED"); continue
        try:
            s, final, html = fetch(u)
            ld = re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S)
            print(u, "robots:", a, "status:", s, "->", final, "len", len(html), "jsonld", len(ld))
        except Exception as e:
            print(u, "robots:", a, "ERR", e)
        time.sleep(1)
