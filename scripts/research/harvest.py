import sys, re, json, time
sys.path.insert(0,'.')
from fetch import fetch, allowed
def ld_blocks(h):
    out=[]
    for b in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', h, re.S):
        try: j=json.loads(b)
        except Exception: continue
        out += j.get("@graph",[j]) if isinstance(j,dict) else j
    return out
def props(lst):
    d={}
    for p in lst or []:
        if isinstance(p,dict) and "name" in p:
            v=p.get("value"); u=p.get("unitText")
            d[p["name"].strip()] = (f"{v} {u}" if u and not isinstance(v,list) else v)
    return d
def harvest(urls, out):
    res=[]
    for i,u in enumerate(urls):
        if allowed(u) is False: print("robots-disallowed",u); continue
        try: s,f,h=fetch(u)
        except Exception as e: print("ERR",u,e,flush=True); time.sleep(2); continue
        pg=[b for b in ld_blocks(h) if b.get("@type") in ("ProductGroup","Product")]
        if not pg: print("nojsonld",u); continue
        g=pg[0]; vs=g.get("hasVariant") or [g]
        prices=sorted({(float(v["offers"]["price"]), v["offers"]["priceCurrency"]) for v in vs if isinstance(v.get("offers"),dict) and v["offers"].get("price")})
        sizes=[]; [sizes.append(v.get("size")) for v in vs if v.get("size") and v.get("size") not in sizes]
        colors=[]; [colors.append(v.get("color")) for v in vs if v.get("color") and v.get("color") not in colors]
        geo={}
        mid=vs[len(vs)//2] if vs else {}
        gp=props(mid.get("additionalProperty"))
        for k in ["Stack","Reach","Head Tube Angle","Seat Tube Angle"]:
            if k in gp: geo[k]=gp[k]
        rec={"url":u.split("?")[0],"name":g.get("name"),"brand":(g.get("brand") or {}).get("name") if isinstance(g.get("brand"),dict) else g.get("brand"),
             "description":re.sub(r"\s+"," ",(g.get("description") or "")).strip()[:600],"props":props(g.get("additionalProperty")),
             "prices":prices,"sizes":sizes,"colors":colors,"geoMidSize":{"size":mid.get("size"),**geo},"sku":g.get("productGroupID") or g.get("sku"),"retrievedAt":"2026-11-16"}
        res.append(rec); print(i, rec["name"], prices[:1], rec["props"].get("Year"), flush=True)
        time.sleep(1.2)
    json.dump(res,open(out,"w"),indent=1)
if __name__=="__main__":
    urls=json.load(open(sys.argv[1])); harvest(urls, sys.argv[2])
