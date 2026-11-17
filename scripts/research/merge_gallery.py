"""Merge reviewed official gallery images into the registry. Specialized pages show related products,
so a Specialized gallery image is kept only when its file carries the product's own article code."""
import json, re, shutil, sys, os, hashlib
SRC = sys.argv[1]
prim = {e["subjectId"]: e for e in json.load(open("images_official.json")) if e["status"] == "ok"}
code = lambda u: (re.search(r"/(\d{5,6}-\d{2,4})_", u or "") or [None, None])[1]
path = "../../src/data/product-images.official.ts"
s = open(path).read().rstrip().rstrip(";"); head, body = s[: s.index("= ") + 2], s[s.index("= ") + 2:]
recs = json.loads(body); by = {r["subjectId"]: r for r in recs if r["subjectKind"] == "bike"}
kept = rejected = 0; seen = {r["sha256"] for r in recs}
for e in json.load(open("images_gallery.json")):
    r = by.get(e["subjectId"])
    if not r: continue
    gal = []
    for g in e["gallery"]:
        if e["subjectId"].startswith("specialized-"):
            pc = code(prim[e["subjectId"]]["originalUrl"])
            if not pc or code(g["originalUrl"]) != pc: rejected += 1; continue
        if g["sha256"] in seen: rejected += 1; continue
        seen.add(g["sha256"])
        fn = os.path.basename(g["file"]); shutil.copyfile(os.path.join(SRC, fn), f"../../public/media/products/{fn}")
        gal.append({"src": g["file"], "width": g["width"], "height": g["height"], "sha256": g["sha256"], "original_file_url": g["originalUrl"]})
        kept += 1
    if gal: r["gallery"] = gal
    elif "gallery" in r: del r["gallery"]
open(path, "w").write(head + json.dumps(recs, indent=1, ensure_ascii=False) + ";\n")
print("gallery images kept", kept, "rejected", rejected)
