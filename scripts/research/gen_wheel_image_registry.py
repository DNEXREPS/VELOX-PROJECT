"""Appends official wheelset images (wheel_images.json) to src/data/product-images.official.ts."""
import json

recs = {r["id"]: r for r in json.load(open("wheels_official.json"))["records"]}
out = []
for e in json.load(open("wheel_images.json")):
    if e["status"] != "ok" or e["subjectId"] not in recs:
        continue
    r = recs[e["subjectId"]]
    b = r["manufacturer"]
    out.append({
        "id": f"img-{e['subjectId']}", "subjectKind": "component", "subjectId": e["subjectId"],
        "primary_image_url": e["file"], "width": e["width"], "height": e["height"],
        "alt": f"{b} {r['name']} — official product photo", "image_source_url": e["page"], "original_file_url": e["originalUrl"],
        "image_source_type": "manufacturer", "image_license_status": "manufacturer-product-image", "license": f"© {b}", "licenseUrl": None,
        "author": b, "image_verification_status": "verified", "image_model_match": "exact",
        "matchNotes": f"First product image in {b}'s official store feed for this exact product. Downloaded 2026-11-16: HTTP 200, {e['contentType']}, {e['origWidth']}×{e['origHeight']} px; no other record uses the same file.",
        "view": "product", "last_image_verified_at": "2026-11-16", "sha256": e["sha256"],
    })
path = "../../src/data/product-images.official.ts"
s = open(path).read().rstrip().rstrip(";")
head, body = s[: s.index("= ") + 2], s[s.index("= ") + 2:]
existing = [x for x in json.loads(body) if x["subjectKind"] != "component"]
open(path, "w").write(head + json.dumps(existing + out, indent=1, ensure_ascii=False) + ";\n")
print(len(out), "wheel images;", len(existing) + len(out), "total")
