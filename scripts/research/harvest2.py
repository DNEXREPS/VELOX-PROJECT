import sys, re, json, time, html as H
sys.path.insert(0,'.')
from fetch import fetch, allowed
from harvest import ld_blocks
def clean(x): return re.sub(r"\s+"," ",H.unescape(re.sub(r"<[^>]+>"," ",x))).strip()
def spz_links():
    cats={"road-bikes":"road","mountain-bikes":"mtb","gravel-bikes":"gravel","active-bikes":"urban","e-bikes":"electric","kids-bikes":"kids","bmx-dirt-jump-bikes":"bmx"}
    res={}
    for slug,c in cats.items():
        u=f"https://www.specialized.com/us/en/shop/bikes/{slug}"
        try: s,f,h=fetch(u)
        except Exception as e: print("ERR",u,e,file=sys.stderr); continue
        for l in re.findall(r'href="(/us/en/[^"?]+/p/\d+)',h): res.setdefault(re.sub(r"/p/\d+$","",l), (l,c))
        print(slug, len(res), file=sys.stderr); time.sleep(1.5)
    return list(res.values())
def spz(url, cat):
    url = "https://www.specialized.com" + url if url.startswith("/") else url
    s,f,h=fetch(url)
    spec={clean(a):clean(b) for a,b in re.findall(r'<p class="[^"]*paragraph450">(.*?)</p><p class="[^"]*paragraph400"[^>]*>(.*?)</p>',h)}
    name=clean((re.search(r"<h1[^>]*>(.*?)</h1>",h,re.S) or [None,""])[1])
    pc=re.search(r'priceContainer">(.*?)</d',h,re.S); prices=[float(x.replace(",","")) for x in re.findall(r"\$([\d,]+\.\d\d)",pc.group(1))] if pc else []
    desc=clean((re.search(r'<meta name="description" content="([^"]*)"',h) or [None,""])[1])
    return {"url":url,"name":name,"cat":cat,"spec":spec,"prices":prices,"desc":desc,"retrievedAt":"2026-11-16"}
def tern(url):
    s,f,h=fetch(url)
    spec={clean(a):clean(b) for a,b in re.findall(r'uppercase text-header md:mb-0">(.*?):</div>\s*<div class="ml-2[^"]*">(.*?)</div>',h,re.S)}
    prod=[b for b in ld_blocks(h) if b.get("@type")=="Product"]
    desc=clean((re.search(r'<meta name="description" content="([^"]*)"',h) or [None,""])[1])
    return {"url":url,"name":prod[0]["name"] if prod else None,"family":(prod[0].get("category") or "").strip("/") if prod else None,"spec":spec,"prices":[],"desc":desc,"retrievedAt":"2026-11-16"}
if __name__=="__main__":
    which=sys.argv[1]; out=[]
    if which=="specialized":
        links=spz_links()
        for l,c in links:
            try: out.append(spz(l,c)); print(len(out), out[-1]["name"], out[-1]["prices"], len(out[-1]["spec"]), file=sys.stderr)
            except Exception as e: print("ERR",l,e,file=sys.stderr)
            time.sleep(1.3)
    else:
        s,f,h=fetch("https://www.ternbicycles.com/en/bikes")
        links=sorted(set("https://www.ternbicycles.com"+l for l in re.findall(r'href="(/en/bikes/\d+/[a-z0-9-]+)"',h)))
        for l in links:
            try: out.append(tern(l)); print(len(out), out[-1]["name"], len(out[-1]["spec"]), file=sys.stderr)
            except Exception as e: print("ERR",l,e,file=sys.stderr)
            time.sleep(1.3)
    json.dump(out,open(which+".json","w"),indent=1)
