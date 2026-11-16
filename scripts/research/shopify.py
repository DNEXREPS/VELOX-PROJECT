import sys, json, time, re, html as H
sys.path.insert(0,'.')
from fetch import fetch, allowed
def all_products(base):
    out=[]; page=1
    while True:
        u=f"{base}/products.json?limit=250&page={page}"
        if allowed(u) is False: print("robots-disallowed"); break
        s,f,h=fetch(u); ps=json.loads(h)["products"]
        if not ps: break
        out+=ps; page+=1; time.sleep(1.5)
        if page>20: break
    return out
def text(h): return re.sub(r"\s+"," ",H.unescape(re.sub(r"<[^>]+>"," ",h or ""))).strip()
if __name__=="__main__":
    base, out = sys.argv[1], sys.argv[2]
    ps=all_products(base); json.dump(ps,open(out,"w")); print(base, len(ps))
