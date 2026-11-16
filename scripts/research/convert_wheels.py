import json, re, unicodedata
RATE=18148; DATE="2026-11-16"
RATE_SRC="https://www.bi.go.id/en/publikasi/lelang/non-operasi-moneter/Pages/Swap-Hedging-of-External-Funding,-November-4th-2026.aspx"
def slug(s):
    s=unicodedata.normalize("NFD",s.lower()); s=re.sub(r"[̀-ͯ]","",s); return re.sub(r"(^-|-$)","",re.sub(r"[^a-z0-9]+","-",s))
d=json.load(open("wheels.json"))
JUNK=re.compile(r"heiwu|complete bikes|outlet build|pre-?order|black friday|gift|sample|test\b|custom build|\bkit\b",re.I)
def norm_title(t):
    t=re.sub(r"\(.*?\)","",t); t=re.sub(r"\|\s*IC\d+","",t)
    t=re.sub(r"[-\s]+\b(US|EU|UK|AU|NZ|CA|JP|ASIA)\b"," ",t); return re.sub(r"\s+"," ",t).strip(" -|")
def label(text, names, lo, hi, unit="mm"):
    for n in names:
        m=re.search(rf"\b{n}\s*[:：]\s*(\d{{2,4}}(?:\.\d)?)\s*{unit}\b",text,re.I)
        if m and lo<=float(m.group(1))<=hi: return float(m.group(1))
    return None
seen=set(); out=[]; dropped=[]
for r in d:
    if JUNK.search(r["title"]) or not r["prices"] or max(r["prices"])<=50: dropped.append(r["title"]); continue
    title=norm_title(r["title"]); tl=title.lower(); t=r["desc"]
    key=(r["brand"],tl)
    if key in seen: dropped.append(r["title"]); continue
    seen.add(key)
    m=re.search(r"\b(\d{2})\s*mm\b",title); depth=float(m.group(1)) if m and "inner" not in tl[m.end():m.end()+8] else None
    if depth is None: depth=label(t,["Rim Depth","Depth","Rim Height"],18,90)
    m=re.search(r"(\d{2})\s*mm\s*inner width",tl); iw=float(m.group(1)) if m else label(t,["Inner Width","Internal Width","Inner Rim Width","Internal Rim Width","Rim Inner Width"],15,40)
    ew=label(t,["Outer Width","External Width","Outer Rim Width","External Rim Width"],18,45)
    m=re.search(r"\((\d{4})\s*g\)",r["title"],re.I); wt=int(m.group(1)) if m else label(t,["Wheelset Weight","Total Weight","Set Weight","Weight \\(pair\\)","Pair Weight"],900,2600,"g")
    wt=int(wt) if wt else None
    brake="disc" if re.search(r"\bdisc\b",tl) else ("rim" if "rim brake" in tl else None)
    size="29" if re.search(r'\b29\b',tl) else "27.5" if re.search(r"27\.5|650b",tl) else "700c" if "700" in tl else None
    disc=["mtb"] if re.search(r"\bmtb\b|enduro|\bxc\b|trail|downhill|\b29\b|27\.5",tl) else ["gravel"] if "gravel" in tl else ["road"] if re.search(r"road|aero|tt\b|timekeeper|climb|hyper|alpha|pie|fl\d|aerodynamicist|limitless|rim brake|disc",tl) else ["universal"]
    lo=min(r["prices"]); tier="entry" if lo<500 else "mid" if lo<1100 else "performance" if lo<2000 else "pro"
    carbon = "carbon" in tl or re.search(r"carbon rim|carbon fibre rim|carbon fiber rim|T700|T800|T1000|Toray",t,re.I)
    alloy = re.search(r"\balloy\b|aluminium|aluminum",tl)
    mat="Carbon" if carbon and not alloy else ("Aluminium" if alloy and not carbon else None)
    cid=slug(f"wheel-{r['brand']}-{title}")
    out.append({"id":cid,"type":"wheelset","manufacturer":r["brand"] if r["brand"]!="Winspace" or not title.startswith("Lún") else "Lún","manufacturerSlug":slug(r["brand"] if r["brand"]!="Winspace" or not title.startswith("Lún") else "Lún"),
      "name":re.sub(r"^(HUNT|ICAN|Lún)\s+","",title,flags=re.I),"discipline":disc,"tier":tier,"series":None,"weightG":wt,"material":mat,
      "price":{"amount":round(lo*RATE,-3),"currency":"IDR","type":"msrp","source":f"{r['brand']} official online store","sourceUrl":r["url"],"date":DATE,
               "note":("Lowest listed configuration. " if len(r["prices"])>1 else "")+f"Manufacturer's direct online price in USD; IDR converted at Bank Indonesia JISDOR Rp {RATE:,}/USD (4 Nov 2026).",
               "original":{"amount":lo,"currency":"USD","rate":RATE}},
      "specs":{"Depth":f"{depth:g} mm" if depth else None,"Internal width":f"{iw:g} mm" if iw else None,"External width":f"{ew:g} mm" if ew else None},
      "compat":{k:v for k,v in {"wheelSize":size,"brakeInterface":brake,"internalRimMm":iw}.items() if v is not None},
      "wheel":{"rimMaterial":mat,"rimDepthMm":depth,"internalWidthMm":iw,"externalWidthMm":ew},
      "productId":r["handle"],"imageUrl":None,"officialUrl":r["url"],"benefits":[],
      "provenance":{"status":"verified-official","sources":[{"label":f"{r['brand']} official product page","url":r["url"],"type":"official-website","retrievedAt":DATE},
                    {"label":"Bank Indonesia JISDOR reference rate (USD→IDR conversion)","url":RATE_SRC,"type":"official-website","retrievedAt":DATE}],
                    "updatedAt":DATE,"confidence":"high","reviewerNotes":"Imported from the manufacturer's own store product data. Depth, widths and weight are filled only where stated in the product title or as an explicit labelled value; other fields are Not Available."}})
json.dump({"records":out,"dropped":dropped},open("wheels_official.json","w"),indent=1,ensure_ascii=False)
from collections import Counter
print(len(out),"wheelsets;",len(dropped),"dropped"); print(Counter(x["manufacturer"] for x in out))
for f in ["Depth","Internal width","External width"]: print(f,sum(1 for x in out if x["specs"][f]))
print("weight",sum(1 for x in out if x["weightG"]),"size",sum(1 for x in out if x["compat"].get("wheelSize")))
for x in out[:4]+out[-4:]: print(x["manufacturer"],x["name"],x["specs"],x["weightG"],x["price"]["original"]["amount"],x["discipline"])
