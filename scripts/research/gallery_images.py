"""
Official gallery images: up to 2 additional images that the manufacturer declares for the SAME product
(schema.org image arrays / colourway variants / store feed images). Validated, de-duplicated against
every primary and gallery file by SHA-256, stored locally. Writes images_gallery.json.
"""
import sys, re, json, time, io, hashlib, os, urllib.request, html as H
sys.path.insert(0, os.path.dirname(__file__))
from fetch import fetch
from harvest import ld_blocks
def normalise(u, brand):
    u = H.unescape(u).replace("\\/", "/")
    if u.startswith("//"): u = "https:" + u
    u = u.replace("http://", "https://")
    if brand == "canyon": u = re.sub(r"/image/upload/[^/]*/(?:f_auto/)?(?:q_auto/)?", "/image/upload/w_1600,c_fit/f_jpg/q_85/", u)
    if brand == "specialized": u = re.sub(r"\?.*$", "", u) + "?q=85&w=1600&fit=max&fm=jpg"
    if brand == "cervelo": u = re.sub(r"width=\d+", "width=1600", u)
    return u

from PIL import Image
OUT = sys.argv[1]
recs = [r for r in json.load(open("official.json"))["records"]]
prim = {e["subjectId"]: e for e in json.load(open("images_official.json")) if e["status"] == "ok"}
seen = {e["sourceSha256"] for e in prim.values() if e.get("sourceSha256")}
sc_feed = {f"https://www.santacruzbicycles.com/products/{p['handle']}": p for p in json.load(open("santacruz_all.json"))}
def cands(r):
    url, b = r["officialUrl"], r["brandId"]
    if b == "santa-cruz":
        p = sc_feed.get(url); return [i["src"] for i in (p or {}).get("images", [])[1:6]]
    s, f, h = fetch(url); out = []
    for blk in ld_blocks(h):
        if blk.get("@type") in ("Product", "ProductGroup"):
            im = blk.get("image"); im = [im] if isinstance(im, (str, dict)) else (im or [])
            out += [x.get("url") if isinstance(x, dict) else x for x in im][1:]
            for v in blk.get("hasVariant") or []:
                vi = v.get("image"); out += [vi] if isinstance(vi, str) else []
    if b == "specialized":
        out += sorted(set(m.split("?")[0] for m in re.findall(r'https://resources\.specialized\.com/media-libraries/[^"\s]+?_(?:FDSQ|RDSQ|FDTQ|RDTQ|DET\d?)[^"\s]*?\.(?:webp|jpg|png)', h)))
    return [x for x in out if x]
import os.path
out = json.load(open("images_gallery.json")) if os.path.exists("images_gallery.json") else []
done = {x["subjectId"] for x in out}
for x in out:
    for g in x["gallery"]: seen.add(g.get("sourceSha256", ""))
for i, r in enumerate(recs):
    if r["id"] not in prim or r["id"] in done: continue
    got = []
    try:
        for c in cands(r):
            if len(got) >= 2: break
            src = normalise(c, r["brandId"])
            if src.split("?")[0] == prim[r["id"]]["originalUrl"].split("?")[0]: continue
            try:
                with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "VELOX-catalog-research/1.0"}), timeout=40) as resp:
                    ct = resp.headers.get("Content-Type", ""); data = resp.read(); st = resp.status
                ssha = hashlib.sha256(data).hexdigest()
                if st != 200 or not ct.startswith("image/") or ssha in seen: continue
                im = Image.open(io.BytesIO(data)); im.load(); w, h = im.size
                if min(w, h) < 300: continue
                seen.add(ssha)
                if im.mode in ("RGBA", "LA", "P"):
                    im = im.convert("RGBA"); bg = Image.new("RGB", im.size, (242, 242, 242)); bg.paste(im, mask=im.split()[-1]); im = bg
                else: im = im.convert("RGB")
                im.thumbnail((900, 900)); buf = io.BytesIO(); im.save(buf, "WEBP", quality=75, method=5); b = buf.getvalue()
                fn = f"{r['id']}--g{len(got) + 1}.webp"; open(os.path.join(OUT, fn), "wb").write(b)
                got.append({"file": f"/media/products/{fn}", "originalUrl": src, "width": im.size[0], "height": im.size[1], "sha256": hashlib.sha256(b).hexdigest(), "contentType": ct})
            except Exception: pass
            time.sleep(0.4)
    except Exception as e: print(i, r["id"], "ERR", str(e)[:100], flush=True)
    out.append({"subjectId": r["id"], "gallery": got}); print(i, r["id"], len(got), flush=True)
    with open("images_gallery.json", "w") as f: json.dump(out, f, indent=1)
    time.sleep(1.0)
print("DONE", sum(len(x["gallery"]) for x in out))
