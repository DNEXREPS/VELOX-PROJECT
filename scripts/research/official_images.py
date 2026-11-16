"""
Official product-image adapter. For every officially imported record, open its own manufacturer
product page (or product feed entry), read the image the manufacturer declares for that product
(schema.org Product image / Open Graph image / Shopify product image), download it, validate it
and store a resized local copy. Writes images_official.json for the registry generator.
"""
import sys, re, json, time, hashlib, io, os, urllib.request, html as H
sys.path.insert(0, os.path.dirname(__file__))
from fetch import fetch, allowed
from harvest import ld_blocks
from PIL import Image

UA = "VELOX-catalog-research/1.0"
OUT_DIR = sys.argv[1]            # public/media/products
recs = json.load(open("official.json"))["records"]
sc_feed = {f"https://www.santacruzbicycles.com/products/{p['handle']}": p for p in json.load(open("santacruz_all.json"))}

def og_image(h):
    m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', h) or re.search(r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"', h)
    return H.unescape(m.group(1)) if m else None

def declared_images(url, brand):
    """Returns (candidate image URLs in priority order, how they were found)."""
    if brand == "santa-cruz":
        p = sc_feed.get(url)
        if p and p.get("images"): return [i["src"] for i in p["images"][:4]], "Shopify product feed (product images)"
    s, f, h = fetch(url)
    cands, how = [], []
    for b in ld_blocks(h):
        if b.get("@type") in ("Product", "ProductGroup"):
            im = b.get("image")
            im = [im] if isinstance(im, (str, dict)) else (im or [])
            for x in im:
                u = x.get("url") if isinstance(x, dict) else x
                if u: cands.append(u)
            if cands: how.append("schema.org Product image")
            break
    og = og_image(h)
    if og:
        cands.append(og); how.append("Open Graph image")
    return cands, " + ".join(how)

def normalise(u, brand):
    u = H.unescape(u).replace("\\/", "/")
    if u.startswith("//"): u = "https:" + u
    u = u.replace("http://", "https://")
    if brand == "canyon": u = re.sub(r"/image/upload/[^/]*/(?:f_auto/)?(?:q_auto/)?", "/image/upload/w_1600,c_fit/f_jpg/q_85/", u)
    if brand == "specialized": u = re.sub(r"\?.*$", "", u) + "?q=85&w=1600&fit=max&fm=jpg"
    if brand == "cervelo": u = re.sub(r"width=\d+", "width=1600", u)
    return u

def get_image(u):
    req = urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "image/avif,image/webp,image/jpeg,image/png,*/*"})
    with urllib.request.urlopen(req, timeout=40) as r:
        ct = r.headers.get("Content-Type", ""); data = r.read()
        return r.status, ct, data

seen = {}
out = []
for i, r in enumerate(recs):
    url, brand = r["officialUrl"], r["brandId"]
    entry = {"subjectId": r["id"], "brand": brand, "page": url, "status": "missing", "reason": None}
    try:
        if allowed(url) is False: raise RuntimeError("robots.txt disallows the product page")
        cands, how = declared_images(url, brand)
        if not cands: raise RuntimeError("product page declares no image")
        last_err = None
        for c in cands:
            src = normalise(c, brand)
            try:
                status, ct, data = get_image(src)
                if status != 200: raise RuntimeError(f"HTTP {status}")
                if not ct.startswith("image/"): raise RuntimeError(f"not an image ({ct})")
                im = Image.open(io.BytesIO(data)); im.load()
                w, h = im.size
                if min(w, h) < 300: raise RuntimeError(f"too small {w}x{h}")
                if im.mode in ("RGBA", "LA", "P"):
                    im = im.convert("RGBA"); bg = Image.new("RGB", im.size, (242, 242, 242)); bg.paste(im, mask=im.split()[-1]); im = bg
                else: im = im.convert("RGB")
                im.thumbnail((1200, 1200))
                buf = io.BytesIO(); im.save(buf, "WEBP", quality=78, method=5); b = buf.getvalue()
                sha = hashlib.sha256(b).hexdigest(); src_sha = hashlib.sha256(data).hexdigest()
                if src_sha in seen:
                    raise RuntimeError(f"identical source image already assigned to {seen[src_sha]}")
                seen[src_sha] = r["id"]
                fn = f"{r['id']}.webp"; open(os.path.join(OUT_DIR, fn), "wb").write(b)
                entry.update(status="ok", file=f"/media/products/{fn}", width=im.size[0], height=im.size[1], sha256=sha, sourceSha256=src_sha,
                             originalUrl=src.split("?")[0] if brand not in ("canyon",) else src, how=how, origWidth=w, origHeight=h, contentType=ct)
                break
            except Exception as e:
                last_err = str(e)
        if entry["status"] != "ok": entry["reason"] = last_err
    except Exception as e:
        entry["reason"] = str(e)[:200]
    out.append(entry)
    print(i, r["id"], entry["status"], entry.get("reason") or "", flush=True)
    time.sleep(1.0)
json.dump(out, open("images_official.json", "w"), indent=1)
print("ok", sum(1 for x in out if x["status"] == "ok"), "of", len(out))
