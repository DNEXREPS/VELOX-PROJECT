import sys, json, re, time, html as H
sys.path.insert(0,'.')
from fetch import fetch
from shopify import all_products
SHOPS={"ICAN":"icancycling.com","Hunt":"us.huntbikewheels.com","Yoeleo":"www.yoeleo.com","Winspace":"www.winspace.cc","ENVE":"www.enve.com","Reserve":"www.reservewheels.com","Industry Nine":"industrynine.com","Farsports":"farsports.com","Superteam":"www.superteamwheels.com"}
def text(h): return re.sub(r"\s+"," ",H.unescape(re.sub(r"<[^>]+>"," ",h or ""))).strip()
def grab(t, pats):
    for p in pats:
        m=re.search(p,t,re.I)
        if m: return m.group(1)
    return None
out=[]
for brand,host in SHOPS.items():
    try:
        s,f,home=fetch(f"https://{host}/")
        cur=(re.search(r'Shopify\.currency\s*=\s*\{"active":"([A-Z]{3})"',home) or re.search(r'"currency(?:Code)?":"([A-Z]{3})"',home))
        cur=cur.group(1) if cur else None
        ps=all_products(f"https://{host}")
    except Exception as e: print(brand,"ERR",e,file=sys.stderr); continue
    n=0
    for p in ps:
        title=p["title"]; ty=(p.get("product_type") or "").lower(); tl=title.lower()
        if not (("wheelset" in tl or "wheelset" in ty or ("wheels" in tl and "disc" in tl)) ): continue
        if any(x in tl for x in ["rim |","rims","single","front wheel","rear wheel","bundle","offer","friday","seconds","re:new","previous model","tape","spoke kit","bag"]): continue
        t=text(p.get("body_html"))
        rec={"brand":brand,"title":title,"handle":p["handle"],"url":f"https://{host}/products/{p['handle']}","currency":cur,
             "prices":sorted({float(v["price"]) for v in p["variants"] if v.get("price")}),
             "depth":grab(t,[r"rim depth[^0-9]{0,15}(\d{2}(?:\s*/\s*\d{2})?)\s*mm",r"depth[:\s]+(\d{2}(?:\s*/\s*\d{2})?)\s*mm"]),
             "iw":grab(t,[r"(?:internal|inner)\s*(?:rim\s*)?width[^0-9]{0,12}(\d{2}(?:\.\d)?)\s*mm"]),
             "ew":grab(t,[r"(?:external|outer)\s*(?:rim\s*)?width[^0-9]{0,12}(\d{2}(?:\.\d)?)\s*mm"]),
             "weight":grab(t,[r"(?:wheelset|set|total|pair)\s*weight[^0-9]{0,15}(\d{3,4})\s*(?:±\s*\d+\s*)?g",r"weight[^0-9]{0,12}(\d{3,4})\s*(?:±\s*\d+\s*)?g\b"]),
             "hub":grab(t,[r"hubs?[:\s]+([A-Z][A-Za-z0-9 \-\.]{2,40}?)(?:\s{2}|,|;|\.| Spokes| Rim| Weight)"]),
             "spokes":grab(t,[r"spokes?[:\s]+([A-Z][A-Za-z0-9 \-\.]{2,40}?)(?:\s{2}|,|;|\.| Hub| Rim| Weight| Nipple)"]),
             "brake":("disc" if re.search(r"\bdisc\b",tl+" "+t[:400],re.I) else ("rim" if re.search(r"rim brake",tl+" "+t,re.I) else None)),
             "tags":p.get("tags",[]),"desc":t[:1500],"retrievedAt":"2026-11-16"}
        out.append(rec); n+=1
    print(brand,cur,len(ps),"products,",n,"wheelsets",file=sys.stderr)
    time.sleep(1)
json.dump(out,open("wheels.json","w"),indent=1)
