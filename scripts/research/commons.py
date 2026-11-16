import json, sys, time, urllib.parse, urllib.request
UA = "VELOX-catalog-research/1.0 (bicycle catalogue image licensing check)"
API = "https://commons.wikimedia.org/w/api.php?"
def get(params, tries=6):
    url = API + urllib.parse.urlencode({**params, "format": "json"})
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            time.sleep(2 + i * 3)
    raise SystemExit(f"failed {url}")
def search(q, n=12):
    d = get({"action": "query", "list": "search", "srnamespace": 6, "srlimit": n, "srsearch": q})
    return [x["title"] for x in d["query"]["search"]]
def info(titles):
    d = get({"action": "query", "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1600, "titles": "|".join(titles)})
    out = []
    for p in d["query"]["pages"].values():
        ii = p.get("imageinfo", [{}])[0]; m = ii.get("extmetadata", {})
        g = lambda k: (m.get(k, {}) or {}).get("value")
        out.append({"title": p["title"], "url": ii.get("url"), "thumb": ii.get("thumburl"), "w": ii.get("width"), "h": ii.get("height"), "mime": ii.get("mime"),
                    "page": ii.get("descriptionurl"), "license": g("LicenseShortName"), "licenseUrl": g("LicenseUrl"), "artist": g("Artist"), "desc": (g("ImageDescription") or "")[:200], "date": g("DateTimeOriginal")})
    return out
if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "search":
        for q in sys.argv[2:]:
            print("==", q); [print("  ", t) for t in search(q)]; time.sleep(1.2)
    else:
        print(json.dumps(info(sys.argv[2:]), indent=1))
