import sys, re, gzip, json, time, urllib.request
UA="VELOX-catalog-research/1.0"
def get(u):
    r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=40).read()
    if u.endswith(".gz") or r[:2]==b"\x1f\x8b": r=gzip.decompress(r)
    return r.decode("utf-8","ignore")
def walk(u, keep, depth=0, out=None):
    out = out if out is not None else []
    try: x=get(u)
    except Exception as e: print("ERR",u,e,file=sys.stderr); return out
    locs=re.findall(r"<loc>\s*(.*?)\s*</loc>",x)
    if "<sitemapindex" in x:
        for l in locs:
            if keep(l, True): walk(l, keep, depth+1, out); time.sleep(0.5)
    else: out += [l for l in locs if keep(l, False)]
    return out
