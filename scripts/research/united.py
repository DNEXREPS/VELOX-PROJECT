"""United Bike (unitedbike.com, OpenCart) adapter: product JSON-LD + category + description + geometry + official image."""
import sys, re, json, time, io, hashlib, os, html as H, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from fetch import fetch
from harvest import ld_blocks
from PIL import Image
OUT_DIR = sys.argv[1]
urls = [u for u in json.load(open("united_urls.json")) if "/id/" in u]
def text(h): return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " | ", re.sub(r"<script.*?</script>|<style.*?</style>", " ", h, flags=re.S))))
def get_img(u):
    u = urllib.parse.quote(u, safe=":/%?=&")
    with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "VELOX-catalog-research/1.0"}), timeout=40) as r:
        return r.status, r.headers.get("Content-Type", ""), r.read(), u
out, seen = [], {}
for i, u in enumerate(urls):
    try: s, f, h = fetch(u)
    except Exception as e: print(i, u, "ERR", e, flush=True); time.sleep(1); continue
    prod = next((b for b in ld_blocks(h) if b.get("@type") == "Product"), None)
    if not prod: time.sleep(0.8); continue
    cat = re.search(r'category-info">([^<]*)<', h); cat = H.unescape(cat.group(1)).strip() if cat else None
    t = text(h)
    m = re.search(r"\| (?:Product Overview|Geometry) \|.*?\| %s \|(.*?)\| Geometry \|" % re.escape(prod["name"]), t)
    desc = re.sub(r"[| ]+", " ", m.group(1)).strip() if m else None
    geo = {}
    g = re.search(r"\| Size \|(.*?)\| Reach \|(.*?)\| Stack \|(.*?)\|", t)
    if g:
        sizes = [x.strip() for x in g.group(1).split("|") if x.strip()]; reach = [x.strip() for x in g.group(2).split("|") if x.strip()]; stack = [x.strip() for x in g.group(3).split("|") if x.strip()]
        if sizes and reach and stack: geo = {"size": sizes[0], "reach": reach[0], "stack": stack[0], "sizes": sizes}
    wheels = re.search(r"\| Wheels \|(.*?)\| Size \|", t)
    rec = {"url": u, "name": prod["name"].strip(), "category": cat, "price": (prod.get("offers") or {}).get("price"), "currency": (prod.get("offers") or {}).get("priceCurrency"),
           "description": desc, "geometry": geo, "wheelsInGeometry": [x.strip() for x in wheels.group(1).split("|") if x.strip()] if wheels else [], "image": None, "retrievedAt": "2026-11-16"}
    og = re.search(r'property="og:image" content="([^"]+)"', h)
    im_url = og.group(1) if og else prod.get("image")  # the site's own 700 px cached rendition of the product image
    if im_url:
        try:
            st, ct, data, qu = get_img(im_url)
            img = Image.open(io.BytesIO(data)); img.load(); w, hh = img.size
            if st == 200 and ct.startswith("image/") and min(w, hh) >= 300:
                src_sha = hashlib.sha256(data).hexdigest()
                if src_sha in seen: rec["imageIssue"] = f"identical image already used by {seen[src_sha]}"
                else:
                    seen[src_sha] = u
                    if img.mode in ("RGBA", "LA", "P"):
                        img = img.convert("RGBA"); bg = Image.new("RGB", img.size, (242, 242, 242)); bg.paste(img, mask=img.split()[-1]); img = bg
                    else: img = img.convert("RGB")
                    img.thumbnail((1200, 1200)); buf = io.BytesIO(); img.save(buf, "WEBP", quality=78, method=5); b = buf.getvalue()
                    slug = "united-bike-" + re.sub(r"[^a-z0-9]+", "-", u.rsplit("/", 1)[-1].lower()).strip("-")
                    open(os.path.join(OUT_DIR, slug + ".webp"), "wb").write(b)
                    rec["image"] = {"file": f"/media/products/{slug}.webp", "original": qu, "contentType": ct, "w": w, "h": hh, "width": img.size[0], "height": img.size[1], "sha256": hashlib.sha256(b).hexdigest(), "how": "Open Graph image (site's cached rendition of the schema.org product image)" if og else "schema.org Product image"}
            else: rec["imageIssue"] = f"rejected: HTTP {st} {ct} {w}x{hh}"
        except Exception as e: rec["imageIssue"] = f"download failed: {str(e)[:120]}"
    out.append(rec); print(i, rec["name"], "|", cat, "|", rec["price"], "| img" if rec["image"] else "| " + str(rec.get("imageIssue")), flush=True)
    time.sleep(1.0)
json.dump(out, open("united.json", "w"), indent=1, ensure_ascii=False)
print("DONE", len(out))
