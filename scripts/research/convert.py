import json, re, unicodedata, sys
RATE = 18148  # Bank Indonesia JISDOR, 4 Nov 2026 (cited in records)
RATE_SRC = "https://www.bi.go.id/en/publikasi/lelang/non-operasi-moneter/Pages/Swap-Hedging-of-External-Funding,-November-4th-2026.aspx"
DATE = "2026-11-16"
def slug(s):
    s = unicodedata.normalize("NFD", s.lower()); s = re.sub(r"[̀-ͯ]", "", s)
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s))
def kg_from(text):
    if not text: return None
    t = str(text)
    m = re.search(r"([\d.]+)\s*kgs?\b", t)
    if m: return round(float(m.group(1)), 2)
    m = re.search(r"([\d.]+)\s*lbs?", t)
    if m: return round(float(m.group(1)) * 0.45359237, 2)
    return None
def speeds_from(*texts):
    for t in texts:
        if not t: continue
        m = re.search(r"\b(\d{1,2})\s*(?:s|spd|-speed|speed)\b", str(t), re.I)
        if m and 5 <= int(m.group(1)) <= 13: return int(m.group(1))
    return None
def wheel_from(t):
    if not t: return None
    t = str(t)
    if re.search(r"\b700\s*[xc]|\b700c\b|\b622\b", t, re.I): return "700c"
    if re.search(r'29\s*("|in|er|”|\b)', t): return "29"
    if re.search(r'27\.5|650b', t, re.I): return "27.5"
    return None
USAGE = {"race":(["racing","fitness"],["intermediate","advanced"]),"aero":(["racing"],["advanced"]),"climbing":(["racing","fitness"],["intermediate","advanced"]),
 "endurance":(["fitness","touring"],["beginner","intermediate"]),"all-rounder":(["fitness","racing"],["intermediate","advanced"]),"time-trial":(["racing"],["advanced"]),
 "triathlon":(["racing"],["intermediate","advanced"]),"track":(["racing"],["advanced"]),"gravel-racing":(["racing","bikepacking"],["intermediate","advanced"]),
 "performance-gravel":(["fitness","bikepacking"],["intermediate","advanced"]),"adventure-gravel":(["bikepacking","touring"],["beginner","intermediate"]),
 "cross-country":(["racing","trail"],["intermediate","advanced"]),"trail":(["trail"],["intermediate","advanced"]),"all-mountain":(["trail"],["intermediate","advanced"]),
 "enduro":(["trail","downhill"],["advanced"]),"downhill":(["downhill"],["advanced"]),"hardtail":(["trail","fitness"],["beginner","intermediate"]),
 "e-mtb":(["trail"],["intermediate","advanced"]),"e-road":(["fitness","touring"],["intermediate"]),"e-gravel":(["bikepacking","fitness"],["intermediate"]),
 "e-urban":(["commuting"],["beginner","intermediate"]),"electric-hybrid":(["commuting","touring"],["beginner","intermediate"]),"cyclocross":(["racing"],["intermediate","advanced"]),
 "touring":(["touring"],["beginner","intermediate"]),"hybrid":(["commuting","fitness"],["beginner"])}
def sentences(desc, n=3):
    s = [x.strip() for x in re.split(r"(?<=[.!?])\s+", desc or "") if 12 < len(x.strip()) < 180 and "buildkit" not in x.lower() and not x.strip().endswith("?")]
    return s[:n]
def price_entry(usd, url, label, multi):
    return {"amount": round(usd * RATE, -3), "currency": "IDR", "type": "msrp", "source": label, "sourceUrl": url, "date": DATE,
            "note": ("Lowest listed configuration price. " if multi else "") + f"Published in USD on the manufacturer's US site; IDR converted at Bank Indonesia JISDOR Rp {RATE:,}/USD (4 Nov 2026).",
            "original": {"amount": usd, "currency": "USD", "rate": RATE}}
def base(brand, family, name, year, cat, sub, url, src_label, notes):
    u, e = USAGE.get(sub, (["fitness"], ["intermediate"]))
    return {"id": slug(f"{brand}-{name}-{year}"), "slug": slug(f"{brand}-{name}-{year}"), "brandId": slug(brand), "family": family, "name": name, "variant": None, "year": year,
            "generation": None, "category": cat, "subcategory": sub, "usage": u, "experience": e, "officialUrl": url, "drawbacks": [], "priceHistory": [],
            "provenance": {"status": "verified-official", "sources": [{"label": src_label, "url": url, "type": "official-website", "retrievedAt": DATE},
                           {"label": "Bank Indonesia JISDOR reference rate (USD→IDR conversion)", "url": RATE_SRC, "type": "official-website", "retrievedAt": DATE}],
                           "updatedAt": DATE, "confidence": "high", "reviewerNotes": notes}}
out, dups = [], []
seen = set()
def add(r):
    if r["id"] in seen: dups.append(r["id"]); return
    seen.add(r["id"]); out.append(r)

# ---------------- Canyon ----------------
def canyon_cat(r):
    w = r["props"].get("World") or []; st = r["props"].get("Style") or []; u = r["url"]
    ebike = "E-Bike" in w
    if ebike:
        if "Mountain" in w or any(s in st for s in ["Trail","Enduro","E-Mountain","Downhill"]): return "electric", "e-mtb"
        if "E-Road" in st or "Endurance" in st: return "electric", "e-road"
        if "Touring" in st: return "electric", "electric-hybrid"
        return "electric", "e-urban"
    if "Triathlon" in w or "Triathlon" in st: return "road", "triathlon"
    if "road-track" in u: return "road", "track"
    if "Gravel" in w:
        return ("gravel", "gravel-racing") if "/gravel-bikes/race/" in u or "grail" in u.lower() else ("gravel", "adventure-gravel")
    if "Mountain" in w:
        if "Downhill" in st: return "mtb", "downhill"
        if "Cross-country" in st: return "mtb", "cross-country"
        return "mtb", "trail"
    if "Aero" in st: return "road", "aero"
    if "Endurance" in st: return "road", "endurance"
    if "Race" in st: return "road", "race"
    return None, None
for r in json.load(open("canyon.json")):
    p = r["props"]; year = p.get("Year")
    if not year or not r["prices"]: continue
    cat, sub = canyon_cat(r)
    if not cat: continue
    name = r["name"].strip(); family = name.split(" ")[0]
    rec = base("Canyon", family, name, int(year), cat, sub, r["url"], "Canyon official product page (US)",
               "Imported from the schema.org product data on Canyon's official US product page. Fields Canyon does not publish there are shown as Not Available. Weight as stated by Canyon (frame size not specified).")
    speeds = speeds_from(p.get("Rear Derailleur"), p.get("Cassette"), p.get("Chain"))
    rings = p.get("Number of Chainrings")
    has_shock = bool(p.get("Rear Shock")); has_fork = bool(p.get("Suspension Fork") or p.get("Suspension Fork Model"))
    disc = (p.get("Brake Type") or "").lower().startswith("disc")
    motor = " ".join(x for x in [p.get("Motor Brand"), p.get("Motor Model") or p.get("Motor")] if x) or None
    wh = re.search(r"(\d{3})\s*Wh", str(p.get("Battery") or ""))
    geo = r.get("geoMidSize") or {}
    clr_c = p.get("Frame tyre clearance") if isinstance(p.get("Frame tyre clearance"), (int, float)) else None
    def num(v):
        m = re.match(r"([\d.]+)", str(v or "")); return float(m.group(1)) if m else None
    rec.update({
        "frameMaterial": p.get("Material"), "groupset": p.get("Rear Derailleur Model"),
        "drivetrain": f"{rings}x{speeds}" if rings and speeds else None,
        "brakes": (f"{p.get('Brake Brand') or ''} disc brakes".strip() if disc else (p.get("Brake Brand") or None)),
        "brakeType": None, "wheelset": p.get("Front Wheel") or p.get("Wheel") or p.get("Wheel Brand"), "tires": p.get("Tyre"),
        "wheelSize": wheel_from(p.get("Tyre")) or wheel_from(p.get("Front Wheel")),
        "tireClearanceMm": p.get("Frame tyre clearance") if isinstance(p.get("Frame tyre clearance"), (int, float)) else None,
        "suspension": "full" if has_shock else "front" if has_fork else "rigid",
        "travel": None, "weightKg": kg_from(p.get("Weight")),
        "price": price_entry(r["prices"][0][0], r["url"], "Canyon official US price", len(r["prices"]) > 1),
        "sizes": r["sizes"], "geometry": ({"stackMm": num(geo.get("Stack")), "reachMm": num(geo.get("Reach")), "headAngle": num(geo.get("Head Tube Angle")), "seatAngle": num(geo.get("Seat Tube Angle")), "note": f"Size {geo.get('size')}, from Canyon's published geometry"} if geo.get("Stack") else None),
        "ridingStyle": (sentences(r["description"], 1) or [f"{name}"])[0].rstrip("."),
        "highlights": sentences(r["description"], 3)[1:] or sentences(r["description"], 3),
        "electric": {"motor": motor, "batteryWh": int(wh.group(1)) if wh else None} if cat == "electric" else None,
        "compat": {k: v for k, v in {"brakeInterface": "disc" if disc else None, "speeds": speeds, "chainrings": rings if isinstance(rings, int) else None,
                   "electronic": True if (p.get("Rear Derailleur Type") or "").lower() in ("electronic", "wireless") else (False if p.get("Rear Derailleur Type") else None),
                   "maxTireMm": clr_c,
                   "wheelSize": wheel_from(p.get("Tyre")), "wheelSizes": [wheel_from(p.get("Tyre"))] if wheel_from(p.get("Tyre")) else None}.items() if v is not None},
    })
    add(rec)

# ---------------- Cervélo ----------------
CERV = {"aspero-5": ("Áspero-5", "gravel", "gravel-racing"), "aspero": ("Áspero", "gravel", "performance-gravel"), "caledonia-5": ("Caledonia-5", "road", "endurance"),
        "caledonia": ("Caledonia", "road", "endurance"), "p-series": ("P-Series", "road", "triathlon"), "p5": ("P5", "road", "time-trial"), "r5-cx": ("R5-CX", "other", "cyclocross"),
        "r5": ("R5", "road", "climbing"), "rouvida": ("Rouvida", "electric", "e-gravel"), "s5": ("S5", "road", "aero"), "soloist": ("Soloist", "road", "all-rounder")}
for r in json.load(open("cervelo.json")):
    h = r["url"].rsplit("/", 1)[-1]; y = int(h[-4:])
    key = next(k for k in sorted(CERV, key=len, reverse=True) if h.startswith(k + "-"))
    family, cat, sub = CERV[key]
    p = r["props"]; name = re.sub(r"\s+20\d\d$", "", r["name"].strip())
    name = re.sub(r"^Aspero", "Áspero", name)
    if not r["prices"]: continue
    rec = base("Cervélo", family, name, y, cat, sub, r["url"], "Cervélo official product page (US)",
               "Imported from the schema.org product data on Cervélo's official US product page; model year from the official product URL. Fields not published there are Not Available.")
    speeds = speeds_from(p.get("Cassette"), p.get("Rear Derailleur"), p.get("Chain"))
    rings = 2 if p.get("Front Derailleur") else (1 if p.get("Rear Derailleur") and "1" in name.split()[-1:] else None)
    rd = p.get("Rear Derailleur"); grp = rd.split(",")[0].strip() if rd else None
    clr = re.search(r"(\d{2})\s*mm", str(p.get("Max Tire Clearance") or ""))
    disc = "flat mount" in str(p.get("Front Brake Mount") or "").lower() or "disc" in str(p.get("Front Brake Mount") or "").lower()
    frame_mat = "Carbon" if re.search(r"carbon frame|all-carbon frame|carbon fiber frame", r["description"], re.I) else None
    rec.update({
        "frameMaterial": frame_mat, "groupset": grp, "drivetrain": f"{rings}x{speeds}" if rings and speeds else None,
        "brakes": ("Disc brakes, " + p["Front Brake Mount"]) if disc else (p.get("Front Brake Mount") or None), "brakeType": None,
        "wheelset": p.get("Front Wheel"), "tires": p.get("Tires"), "wheelSize": wheel_from(p.get("Tires")),
        "tireClearanceMm": int(clr.group(1)) if clr else None, "suspension": "rigid", "travel": None, "weightKg": kg_from(p.get("Weight")),
        "price": price_entry(r["prices"][0][0], r["url"], "Cervélo official US price", len(r["prices"]) > 1),
        "sizes": r["sizes"], "geometry": None,
        "ridingStyle": (sentences(r["description"], 1) or [name])[0].rstrip("."), "highlights": sentences(r["description"], 3)[1:],
        "electric": ({"motor": "Fazua Ride 60", "batteryWh": 430} if key == "rouvida" else None),
        "compat": {k: v for k, v in {"brakeInterface": "disc" if disc else None, "speeds": speeds, "chainrings": rings, "maxTireMm": int(clr.group(1)) if clr else None,
                   "wheelSize": wheel_from(p.get("Tires")), "wheelSizes": [wheel_from(p.get("Tires"))] if wheel_from(p.get("Tires")) else None}.items() if v is not None},
    })
    if key == "rouvida": rec["highlights"] = [s for s in rec["highlights"]] 
    add(rec)

# ---------------- Santa Cruz ----------------
SC = [("Heckler SL", "electric", "e-mtb"), ("Heckler", "electric", "e-mtb"), ("Bullit", "electric", "e-mtb"), ("Vala", "electric", "e-mtb"), ("Skitch", "electric", "e-gravel"),
      ("5010", "mtb", "trail"), ("Tallboy", "mtb", "trail"), ("Blur", "mtb", "cross-country"), ("Bronson", "mtb", "all-mountain"), ("Hightower", "mtb", "all-mountain"),
      ("Megatower", "mtb", "enduro"), ("Nomad", "mtb", "enduro"), ("V10", "mtb", "downhill"), ("Chameleon", "mtb", "hardtail"), ("Highball", "mtb", "hardtail"), ("Stigmata", "gravel", "performance-gravel")]
for r in json.load(open("santacruz.json")):
    s = r["spec"]; name = r["name"].strip()
    fam = next((f for f in SC if name.startswith(f[0])), None)
    if not fam or not r["prices"] or not r["year"]: continue
    family, cat, sub = fam
    rec = base("Santa Cruz", family, name, r["year"], cat, sub, r["url"], "Santa Cruz Bicycles official product page (US)",
               "Imported from the specification data embedded in Santa Cruz's official US product page and the store's product feed (model year from the product handle). Fields not published there are Not Available.")
    ws = s.get("wheel_size") or ""
    wheel = "29" if '29' in ws else ("27.5" if "27.5" in ws else None)  # "MX" (mixed 29/27.5) is left unset
    speeds = speeds_from(s.get("rear_derailleur"), s.get("chain"), s.get("cassette"))
    mat = {"AL": "Aluminium", "C": "Carbon C", "CC": "Carbon CC"}.get((s.get("material") or "").replace("Carbon ", ""), s.get("material"))
    full = bool(s.get("rear_shock"))
    trav = s.get("travel"); travel = (trav if str(trav).endswith("mm") else f"{trav} mm") if trav else None
    wh = re.search(r"(\d{3})\s*Wh", str(s.get("battery") or ""), re.I)
    rims = s.get("front_rim"); hubs = s.get("front_hub")
    clr = re.search(r'([\d.]+)\s*(mm|")', str(s.get("max_tire_size") or ""))
    rec.update({
        "frameMaterial": mat, "groupset": (s.get("rear_derailleur") or "").split(",")[0] or None,
        "drivetrain": f"1x{speeds}" if speeds and (s.get("front_derailleur_mount") or "").startswith("No") else None,
        "brakes": s.get("brakes"), "brakeType": None,
        "wheelset": ", ".join(x.split(",")[0] for x in [rims, hubs] if x) or None,
        "tires": s.get("front_tire"), "wheelSize": wheel, "tireClearanceMm": int(float(clr.group(1))) if clr and clr.group(2) == "mm" else None,
        "suspension": "full" if full else ("front" if s.get("fork") and re.search(r"\d+\s*mm", s.get("fork") or "") else "rigid"), "travel": travel,
        "weightKg": kg_from(s.get("weight")),
        "price": price_entry(r["prices"][0][0], r["url"], "Santa Cruz official US price", len(r["prices"]) > 1),
        "sizes": r["sizes"], "geometry": None,
        "ridingStyle": (sentences(r["desc"], 1) or [name])[0].rstrip("."), "highlights": sentences(r["desc"], 3)[1:],
        "electric": {"motor": s.get("drive_unit"), "batteryWh": int(wh.group(1)) if wh else None} if cat == "electric" else None,
        "compat": {k: v for k, v in {"speeds": speeds, "brakeInterface": "disc" if s.get("front_rotor") else None, "wheelSize": wheel, "wheelSizes": [wheel] if wheel else None,
                   "travelMm": int(re.match(r"\d+", str(trav)).group(0)) if trav and re.match(r"\d+", str(trav)) else None, "udh": True if s.get("udh_compatible") == "Yes" else None}.items() if v is not None},
    })
    add(rec)
SUBNAME = {"all-mountain": "All-mountain trail riding", "e-mtb": "Electric mountain biking", "enduro": "Enduro and gravity riding", "trail": "Trail riding", "cross-country": "Cross-country riding", "downhill": "Downhill and bike-park riding", "hardtail": "Hardtail trail and cross-country riding", "performance-gravel": "Performance gravel riding", "e-gravel": "Assisted gravel riding"}
for r in out:
    if r["ridingStyle"].strip() == r["name"].strip() or len(r["ridingStyle"]) < 12:
        r["ridingStyle"] = SUBNAME.get(r["subcategory"], r["subcategory"].replace("-", " ").capitalize())
json.dump({"records": out, "duplicates": dups}, open("official.json", "w"), indent=1, ensure_ascii=False)
from collections import Counter
print(len(out), "records;", len(dups), "duplicate listings dropped")
print(Counter(r["brandId"] for r in out)); print(Counter((r["category"]) for r in out))
print(Counter(r["year"] for r in out))

# ---------------- Specialized (no model year published → listed-in-range) ----------------
def fix_keys(spec):
    o={}
    for k,v in spec.items():
        if len(k)>40:
            if k.endswith("Frameset Frame"): o["Frame"]=v
            elif k.endswith("E-Bike Motor"): o["Motor"]=v
            continue
        o[k]=v
    return o
SPZ=[("S-Works Turbo Creo","electric","e-gravel"),("S-Works Demo","mtb","downhill"),("S-Works Turbo Kenevo","electric","e-mtb"),("S-Works Tarmac","road","race"),("Tarmac","road","race"),("S-Works Aethos","road","climbing"),("Aethos","road","climbing"),("S-Works Roubaix","road","endurance"),("Roubaix","road","endurance"),
     ("Allez Sprint","road","race"),("Allez","road","endurance"),("S-Works Shiv","road","triathlon"),("Shiv","road","triathlon"),("S-Works Crux","gravel","gravel-racing"),("Crux","gravel","gravel-racing"),
     ("S-Works Diverge","gravel","performance-gravel"),("Diverge STR","gravel","performance-gravel"),("Diverge","gravel","adventure-gravel"),("Turbo Creo","electric","e-gravel"),
     ("S-Works Epic","mtb","cross-country"),("Epic","mtb","cross-country"),("Chisel","mtb","cross-country"),("Rockhopper","mtb","hardtail"),("Fuse","mtb","hardtail"),
     ("S-Works Stumpjumper","mtb","trail"),("Stumpjumper","mtb","trail"),("S-Works Enduro","mtb","enduro"),("Enduro","mtb","enduro"),("Demo","mtb","downhill"),("Status","mtb","trail"),
     ("S-Works Turbo Levo","electric","e-mtb"),("Turbo Levo","electric","e-mtb"),("Turbo Kenevo","electric","e-mtb"),("Kenevo","electric","e-mtb"),("P.3","mtb","dirt-jump"),("P.","mtb","dirt-jump"),
     ("Hotwalk","other","balance-bikes"),("Riprock","other","kids"),("Jett","other","kids"),("Hotrock","other","kids")]
def variant_from(rd):
    if not rd: return None
    v=rd.split(",")[0].strip().replace("Shimnao","Shimano")
    v=" ".join(t for t in v.split() if not re.search(r"\d{3}",t) and t not in ("NEW","New") and not re.match(r"\d+-speed",t))
    return v or None
for r in json.load(open("specialized.json")):
    if not r["name"] or not r["spec"]: continue
    s=fix_keys(r["spec"]); h1=r["name"].strip()
    fam=next((f for f in SPZ if h1.startswith(f[0])),None)
    if not fam: print("unmapped specialized:",h1); continue
    cat,sub=fam[1],fam[2]
    if s.get("Motor") and cat!="electric": cat,sub="electric",("e-mtb" if cat=="mtb" else "e-road")
    var=variant_from(s.get("Rear Derailleur"))
    urlslug=r["url"].split("/")[-3] if "/p/" in r["url"] else ""
    name=f"{h1} · {var}" if var and slug(var) not in slug(h1) and slug(h1)!=urlslug else h1
    if "frameset" in urlslug and "frameset" not in h1.lower(): name=f"{h1} Frameset"
    family=re.sub(r"^S-Works\s+","",h1).split(" ")[0]
    rec=base("Specialized",family,name,2026,cat,sub,r["url"].split("?")[0],"Specialized official product page (US)",
             "Imported from the specification table on Specialized's official US product page. Specialized does not publish a model year there: 2026 is the year VELOX confirmed this model in the official range. Weight as stated by Specialized for the size shown.")
    rec["yearBasis"]="listed-in-range"; rec["id"]=rec["slug"]=slug(f"specialized-{name}-listed-2026")
    speeds=speeds_from(s.get("Rear Derailleur"),s.get("Cassette"),s.get("Chain"))
    rings=2 if s.get("Front Derailleur") else (1 if speeds and "1x" in (s.get("Shift Levers","")+s.get("Rear Derailleur","")).lower() else None)
    fb=s.get("Front Brake") or ""
    wh=re.search(r"(\d{3})\s*Wh",s.get("Battery") or "")
    prices=r["prices"]; lp=max(prices) if prices else None
    pe=price_entry(lp,r["url"].split("?")[0],"Specialized official US price",False) if lp else None
    if pe and len(set(prices))>1: pe["note"]=f"List price; a lower price of US${min(prices):,.2f} was also shown on {DATE}. "+pe["note"]
    rec.update({"frameMaterial":(re.search(r"(FACT \d+r carbon|carbon|aluminum|aluminium|steel|M\d+ aluminum)",s.get("Frame",""),re.I) or [None])[0] if s.get("Frame") else None,
        "groupset":variant_from(s.get("Rear Derailleur")),"drivetrain":f"{rings}x{speeds}" if rings and speeds else None,
        "brakes":fb.split(",")[0] if fb else None,"brakeType":"hydraulic-disc" if re.search(r"hydraulic",fb,re.I) else None,
        "wheelset":(s.get("Front Wheel") or s.get("Rims") or None),"tires":s.get("Front Tire"),"wheelSize":wheel_from(s.get("Front Tire")) or wheel_from(s.get("Front Wheel")),
        "tireClearanceMm":None,"suspension":"full" if s.get("Rear Shock") else ("front" if re.search(r"\d+\s*mm|travel",s.get("Fork",""),re.I) and cat in("mtb","electric") and sub!="e-gravel" else "rigid"),
        "travel":(re.search(r"(\d{2,3})\s*mm\s*(?:of\s*)?travel",s.get("Fork",""),re.I) or [None,None])[1] and f"{re.search(r'(\d{2,3})\s*mm\s*(?:of\s*)?travel',s.get('Fork',''),re.I)[1]} mm (fork)",
        "weightKg":kg_from(s.get("Weight")),"price":pe,"sizes":[],"geometry":None,
        "ridingStyle":(sentences(r["desc"],1) or [SUBNAME.get(sub,sub)])[0].rstrip(".") if 'SUBNAME' in globals() else sub,
        "highlights":sentences(r["desc"],3)[1:],"electric":{"motor":s.get("Motor"),"batteryWh":int(wh.group(1)) if wh else None} if cat=="electric" else None,
        "compat":{k:v for k,v in {"speeds":speeds,"chainrings":rings,"brakeInterface":"disc" if "disc" in fb.lower() else None,"brakeType":"hydraulic-disc" if re.search(r"hydraulic",fb,re.I) else None,
                  "wheelSize":wheel_from(s.get("Front Tire")),"wheelSizes":[wheel_from(s.get("Front Tire"))] if wheel_from(s.get("Front Tire")) else None}.items() if v is not None}})
    add(rec)

# ---------------- Tern (no model year / price published) ----------------
TERN={"BYB":("folding","compact-folding"),"Verge":("folding","performance-folding"),"Eclipse":("folding","performance-folding"),"Link":("folding","urban-folding"),"Node":("folding","urban-folding"),
      "GSD":("electric","e-cargo"),"HSD":("electric","e-cargo"),"Orox":("electric","e-cargo"),"Quick Haul":("electric","e-cargo"),"Short Haul":("other","cargo"),"NBD":("electric","e-urban"),"Vektron":("electric","e-folding")}
for r in json.load(open("tern.json")):
    if not r["name"] or not r["spec"]: continue
    s=r["spec"]; name=r["name"].strip()
    fam=next((k for k in sorted(TERN,key=len,reverse=True) if name.startswith(k)),None)
    if not fam: print("unmapped tern:",name); continue
    cat,sub=TERN[fam]
    if s.get("Motor") and cat!="electric": cat,sub=("electric","e-folding") if cat=="folding" else ("electric","e-cargo")
    rec=base("Tern",fam,name,2026,cat,sub,r["url"],"Tern official product page",
             "Imported from the specification list on Tern's official product page. Tern publishes neither a model year nor a price there: 2026 is the year VELOX confirmed the model in the official range, and price is Not Available.")
    rec["yearBasis"]="listed-in-range"; rec["generation"]=s.get("Generation") or None; rec["id"]=rec["slug"]=slug(f"tern-{name}-listed-2026")
    rec["provenance"]["sources"]=rec["provenance"]["sources"][:1]
    sp=re.search(r"(\d)\s*x\s*(\d{1,2})",s.get("Speeds","")); fb=s.get("Front Brake","")
    wh=re.search(r"(\d{3})\s*Wh",s.get("Battery","")) 
    tire=s.get("Tires",""); etrto=re.search(r"\b(\d{2})-(\d{3})\b",tire); ws={"406":"20","349":"16","622":"700c","584":"27.5","622":"700c","559":"26","507":"24","305":"16"}.get(etrto.group(2)) if etrto else None
    if ws not in ("20","16","700c","27.5","26","24"): ws=None
    rec.update({"frameMaterial":(re.search(r"aluminum|aluminium|steel|chromoly|carbon",s.get("Frame",""),re.I) or [None])[0],"groupset":s.get("Rear Derailleur") if s.get("Rear Derailleur") not in (None,"n/a") else (s.get("Rear Hub") if "speed" in s.get("Rear Hub","").lower() or "nexus" in s.get("Rear Hub","").lower() else None),
        "drivetrain":f"{sp.group(1)}x{sp.group(2)}" if sp else (s.get("Speeds") or None),"brakes":fb.split(",")[0] if fb else None,"brakeType":"hydraulic-disc" if re.search(r"hydraulic",fb,re.I) else ("v-brake" if fb.startswith("V") else None),
        "wheelset":s.get("Rims"),"tires":tire or None,"wheelSize":ws,"tireClearanceMm":None,"suspension":"front" if re.search(r"suspension",s.get("Fork",""),re.I) else "rigid","travel":None,
        "weightKg":kg_from(s.get("Weight")),"price":None,"sizes":[x.strip() for x in s.get("Frame Sizes","").split(",") if x.strip()],"geometry":None,
        "ridingStyle":(sentences(r["desc"],1) or [sub])[0].rstrip("."),"highlights":[f"Folded size {s['Folding Size']}" ] if s.get("Folding Size") else [],
        "electric":{"motor":s.get("Motor"),"batteryWh":int(wh.group(1)) if wh else None} if cat=="electric" else None,
        "compat":{k:v for k,v in {"speeds":int(sp.group(2)) if sp else None,"chainrings":int(sp.group(1)) if sp else None,"wheelSize":ws,"wheelSizes":[ws] if ws else None,"brakeType":"hydraulic-disc" if re.search(r"hydraulic",fb,re.I) else ("v-brake" if fb.startswith("V") else None)}.items() if v is not None}})
    if s.get("Max Rider Weight"): rec["highlights"].append(f"Max rider weight {s['Max Rider Weight']}")
    add(rec)
json.dump({"records": out, "duplicates": dups}, open("official.json", "w"), indent=1, ensure_ascii=False)
print("TOTAL", len(out), "dups", len(dups)); print(Counter(r["brandId"] for r in out))
