import sys, re, json, time, urllib.parse
sys.path.insert(0,'.')
from fetch import fetch
d=json.load(open('santacruz_all.json'))
bikes=[p for p in d if 'bike' in [t.lower() for t in p['tags']]]
def year(p):
    m=re.search(r'-(20\d\d)$',p['handle'])
    if m: return int(m.group(1))
    m=re.search(r'\b(20\d\d)\)',p['variants'][0]['title'])
    return int(m.group(1)) if m else (2027 if 'my27' in p['tags'] else None)
sel=[p for p in bikes if (year(p) or 0)>=2026]
print(len(sel), file=sys.stderr)
out=[]
for p in sel:
    u=f"https://www.santacruzbicycles.com/products/{p['handle']}"
    try: s,f,h=fetch(u)
    except Exception as e: print("ERR",u,e,file=sys.stderr); continue
    m=re.search(r"decodeURIComponent\('(.*?)'\)\)\]", urllib.parse.unquote(next((a for a in re.findall(r'="([^"]*%22rear_derailleur%22[^"]*)"',h)), "")), re.S)
    spec={}
    if m:
        try: spec={k:v.get("value") for k,v in json.loads(m.group(1)).items() if isinstance(v,dict) and v.get("value")}
        except Exception as e: print("parse",u,e,file=sys.stderr)
    prices=sorted({float(v['price']) for v in p['variants']})
    sizes=[]; [sizes.append(v['title'].split(' / ')[-1]) for v in p['variants'] if v['title'].split(' / ')[-1] not in sizes]
    out.append({"url":u,"name":re.sub(r'\s+20\d\d$','',p['title']),"year":year(p),"prices":[[x,"USD"] for x in prices],"sizes":sizes,"spec":spec,"desc":re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",p['body_html'] or "")).strip()[:500],"factorySale":'display_factory_sale' in p['tags'],"retrievedAt":"2026-11-16"})
    print(len(out), out[-1]['name'], out[-1]['year'], len(spec), file=sys.stderr)
    time.sleep(1.2)
json.dump(out,open('santacruz.json','w'),indent=1)
