"""Adds the manufacturer's full component list (componentSpec) and colours to official records."""
import json
recs = json.load(open("official.json"))
by_url = {}
for f in ["canyon.json", "cervelo.json"]:
    for r in json.load(open(f)): by_url.setdefault(r["url"].split("?")[0], ("props", r))
for r in json.load(open("santacruz.json")): by_url[r["url"]] = ("sc", r)
for r in json.load(open("specialized.json")): by_url[r["url"].split("?")[0]] = ("spz", r)
for r in json.load(open("tern.json")): by_url[r["url"]] = ("tern", r)

ORDER = ["Frame", "Fork", "Suspension Fork", "Rear Shock", "Shock", "Motor", "Drive unit", "Battery", "Shifters", "Shift Levers", "Shift-/ Brake Lever", "Shift Lever", "Shifter",
         "Front Derailleur", "Rear Derailleur", "Crankset", "Crank", "Chainrings", "Bottom Bracket", "Cassette", "Cassette/Freewheel", "Chain", "Brakes", "Front Brake", "Rear Brake", "Disc Brake",
         "Brake Rotor", "Rotors", "Wheelset", "Front Wheel", "Rear Wheel", "Rims", "Front Hub", "Rear Hub", "Spokes", "Tires", "Tyre", "Front Tire", "Rear Tire", "Cockpit", "Handlebar", "Handlebars",
         "Stem", "Seatpost", "SeatPost", "Dropper Post", "Saddle", "Pedals", "Headset", "Weight"]
SC = {"frame": "Frame", "fork": "Fork", "rear_shock": "Shock", "drive_unit": "Motor", "battery": "Battery", "right_shifter": "Shifter", "rear_derailleur": "Rear Derailleur",
      "crankset": "Crankset", "bb": "Bottom Bracket", "cassette": "Cassette", "chain": "Chain", "brakes": "Brakes", "front_rotor": "Front Rotor", "rear_rotor": "Rear Rotor",
      "front_rim": "Front Rim", "rear_rim": "Rear Rim", "front_hub": "Front Hub", "rear_hub": "Rear Hub", "front_tire": "Front Tire", "rear_tire": "Rear Tire",
      "handlebars": "Handlebar", "stem": "Stem", "seatpost": "Seatpost", "saddle": "Saddle", "headset": "Headset", "weight": "Weight"}
def clean(v):
    if isinstance(v, list): v = ", ".join(map(str, v))
    v = " ".join(str(v).split())
    return v if v and v.lower() not in ("n/a", "none", "-") else None
n = 0
for rec in recs["records"]:
    kind, raw = by_url.get(rec["officialUrl"], (None, None))
    if not raw: continue
    rows = []
    if kind in ("props", "spz", "tern"):
        props = raw["props"] if kind == "props" else raw["spec"]
        for k in ORDER:
            v = clean(props.get(k)) if k in props else None
            if v and len(v) < 220: rows.append({"label": k.replace("Shift-/ Brake Lever", "Shift / brake levers").replace("SeatPost", "Seatpost"), "value": v, "componentId": None})
        if kind == "props" and raw.get("colors"): rec["colors"] = raw["colors"][:8]
        if kind == "tern" and clean(raw["spec"].get("Color(s)")): rec["colors"] = [c.strip() for c in raw["spec"]["Color(s)"].split(",") if c.strip()][:8]
    else:
        for k, label in SC.items():
            v = clean(raw["spec"].get(k))
            if v and len(v) < 220: rows.append({"label": label, "value": v, "componentId": None})
    if rows: rec["componentSpec"] = rows; n += 1
json.dump(recs, open("official.json", "w"), indent=1, ensure_ascii=False)
print("componentSpec added to", n, "of", len(recs["records"]))
