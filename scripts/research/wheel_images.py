"""Official wheelset images from the makers' own Shopify feeds (first product image), validated and stored locally."""
import sys, json, io, hashlib, os, time, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from shopify import all_products
from PIL import Image
OUT = sys.argv[1]
recs = json.load(open("wheels_official.json"))["records"]
hosts = {"Hunt": "us.huntbikewheels.com", "ICAN": "icancycling.com", "Lún": "www.winspace.cc", "Winspace": "www.winspace.cc"}
feeds = {}
for h in set(hosts.values()):
    for p in all_products(f"https://{h}"): feeds[(h, p["handle"])] = p
    time.sleep(1)
out, seen = [], {}
for r in recs:
    h = hosts[r["manufacturer"]]; p = feeds.get((h, r["productId"]))
    e = {"subjectId": r["id"], "page": r["officialUrl"], "status": "missing"}
    if not p or not p.get("images"): e["reason"] = "no product image in the official feed"; out.append(e); continue
    src = p["images"][0]["src"].split("?")[0]
    try:
        with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "VELOX-catalog-research/1.0"}), timeout=40) as resp:
            ct = resp.headers.get("Content-Type", ""); data = resp.read(); st = resp.status
        im = Image.open(io.BytesIO(data)); im.load(); w, hh = im.size
        if st != 200 or not ct.startswith("image/") or min(w, hh) < 300: raise RuntimeError(f"rejected {st} {ct} {w}x{hh}")
        ssha = hashlib.sha256(data).hexdigest()
        if ssha in seen: raise RuntimeError(f"identical image already used by {seen[ssha]}")
        seen[ssha] = r["id"]
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA"); bg = Image.new("RGB", im.size, (242, 242, 242)); bg.paste(im, mask=im.split()[-1]); im = bg
        else: im = im.convert("RGB")
        im.thumbnail((1000, 1000)); buf = io.BytesIO(); im.save(buf, "WEBP", quality=78, method=5); b = buf.getvalue()
        fn = f"{r['id']}.webp"; open(os.path.join(OUT, fn), "wb").write(b)
        e.update(status="ok", file=f"/media/products/{fn}", width=im.size[0], height=im.size[1], sha256=hashlib.sha256(b).hexdigest(), originalUrl=src, contentType=ct, origWidth=w, origHeight=hh, maker=r["manufacturer"])
    except Exception as ex: e["reason"] = str(ex)[:150]
    out.append(e); print(r["id"], e["status"], e.get("reason", ""), flush=True); time.sleep(0.6)
json.dump(out, open("wheel_images.json", "w"), indent=1)
print("DONE", sum(1 for x in out if x["status"] == "ok"), "of", len(out))
