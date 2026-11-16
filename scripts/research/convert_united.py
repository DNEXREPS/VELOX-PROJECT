"""united.json → United Bike records (official IDR price, category, description, geometry, official image)."""
import json, re, unicodedata
DATE = "2026-11-16"
def slug(s):
    s = unicodedata.normalize("NFD", s.lower()); s = re.sub(r"[̀-ͯ]", "", s)
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s))
CAT = [  # (category text contains, VELOX category, subcategory)
    ("Mountain - XC", "mtb", "cross-country"), ("Mountain - Trail", "mtb", "trail"), ("Mountain - All Mountain", "mtb", "all-mountain"), ("Mountain - Enduro", "mtb", "enduro"),
    ("Mountain - Downhill", "mtb", "downhill"), ("Mountain - Full", "mtb", "full-suspension"), ("Mountain", "mtb", "hardtail"),
    ("Road - Gravel", "gravel", "adventure-gravel"), ("Gravel", "gravel", "adventure-gravel"), ("Road", "road", "endurance"),
    ("Urban - Folding", "folding", "urban-folding"), ("Folding", "folding", "urban-folding"), ("Urban - City", "urban", "city"), ("Urban - Hybrid", "urban", "hybrid"),
    ("Urban - Fixie", "other", "fixed-gear"), ("Urban", "urban", "city"), ("BMX", "bmx", "freestyle"), ("Kids", "other", "kids"),
    ("Electric", "electric", "e-urban"), ("E-Bike", "electric", "e-urban"), ("Listrik", "electric", "e-urban"),
]
USAGE = {"mtb": (["trail"], ["beginner", "intermediate"]), "road": (["fitness"], ["beginner", "intermediate"]), "gravel": (["bikepacking"], ["intermediate"]),
         "folding": (["commuting"], ["beginner"]), "urban": (["commuting", "leisure"], ["beginner"]), "bmx": (["tricks"], ["beginner"]),
         "other": (["leisure"], ["beginner"]), "electric": (["commuting"], ["beginner"])}
bikes, parts, skipped, seen = [], [], [], set()
for r in json.load(open("united.json")):
    cat = r.get("category") or ""
    name = re.sub(r"\s+", " ", r["name"].replace("&quot;", '"').replace("™", "")).strip()
    if not cat.startswith("Sepeda") or "Moped" in cat or "Motor" in cat:
        skipped.append((name, cat)); continue
    m = next((x for x in CAT if x[0] in cat), None)
    if not m: skipped.append((name, cat)); continue
    _, c, sub = m
    rid = slug(f"united-bike-{name}")
    if rid in seen: continue
    seen.add(rid)
    price = int(float(r["price"])) if r.get("price") and r.get("currency") == "IDR" and float(r["price"]) > 0 else None
    wheel = None
    ws = re.search(r'(\d{2}(?:[.,]5)?)\s*(?:"|”|inch|″)', name)
    if ws: wheel = {"29": "29", "27.5": "27.5", "27,5": "27.5", "26": "26", "24": "24", "20": "20", "16": "16", "12": "12"}.get(ws.group(1))
    geo = r.get("geometry") or {}
    def num(v):
        try: return float(str(v).replace(",", "."))
        except Exception: return None
    u, e = USAGE[c]
    rec = {"id": rid, "slug": rid, "brandId": "united-bike", "family": name.split(" ")[0].title(), "name": name.title() if name.isupper() else name, "variant": None,
           "year": 2026, "yearBasis": "undated", "generation": None, "category": c, "subcategory": sub,
           "frameMaterial": None, "groupset": None, "drivetrain": None, "brakes": None, "brakeType": None, "wheelset": None, "tires": None, "wheelSize": wheel,
           "tireClearanceMm": None, "suspension": "rigid", "travel": None, "weightKg": None,
           "price": {"amount": price, "currency": "IDR", "type": "msrp", "source": "United Bike official online store", "sourceUrl": r["url"], "date": DATE,
                     "note": "Official price published in IDR on unitedbike.com (schema.org Offer)."} if price else None,
           "priceHistory": [], "sizes": geo.get("sizes", []), "ridingStyle": (r.get("description") or cat.replace("Sepeda - ", "")).split(".")[0][:160],
           "usage": u, "experience": e, "electric": {"motor": None, "batteryWh": None} if c == "electric" else None, "highlights": [], "drawbacks": [],
           "geometry": {"stackMm": num(geo.get("stack")), "reachMm": num(geo.get("reach")), "note": f"Size {geo.get('size')}, from United's published geometry table"} if geo.get("stack") else None,
           "componentSpec": None, "compat": {}, "officialUrl": r["url"], "imageUrl": None,
           "provenance": {"status": "verified-official", "updatedAt": DATE, "confidence": "high",
                          "sources": [{"label": "United Bike official product page", "url": r["url"], "type": "official-website", "retrievedAt": DATE}],
                          "reviewerNotes": f"Imported from unitedbike.com (schema.org Product, category '{cat}', description and geometry). United's pages publish no component list or model year, so those fields are Not Available."}}
    bikes.append((rec, r.get("image")))
json.dump({"bikes": [b for b, _ in bikes], "images": {b["id"]: im for b, im in bikes if im}, "skipped": skipped}, open("united_official.json", "w"), indent=1, ensure_ascii=False)
from collections import Counter
print(len(bikes), "bikes;", sum(1 for _, im in bikes if im), "with images; skipped", len(skipped)); print(Counter(b["category"] for b, _ in bikes)); print(Counter(c for _, c in skipped).most_common(10))
