import re, sys, json, os, time, urllib.request, subprocess, hashlib
sys.path.insert(0,'.')
from commons import info, UA
from thumburl import thumb
titles=json.load(open(sys.argv[1])); out=sys.argv[2]
meta=[]
for i in range(0,len(titles),20): meta+=info(titles[i:i+20]); time.sleep(1)
os.makedirs("thumbs",exist_ok=True); files=[]
for n,m in enumerate(meta):
    if not m.get("thumb"): continue
    fn=f"thumbs/{hashlib.md5(m['title'].encode()).hexdigest()}.jpg"
    if not os.path.exists(fn) or os.path.getsize(fn)==0:
        for t in range(4):
            try:
                u=thumb(m['url'],500)
                open(fn,"wb").write(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=40).read()); break
            except Exception as e: print("dl-err",e,file=sys.stderr); time.sleep(10)
    m["local"]=fn; m["n"]=len(files); files.append(fn)
    print(m["n"], m["title"][5:90], "|", m["license"], "|", (m["date"] or "")[:10], "|", m["w"], "x", m["h"])
    time.sleep(2.5)
json.dump(meta,open(out+".json","w"),indent=1)
subprocess.run(["montage",*[f"{f}[0]" for f in files],"-label","%p","-geometry","360x270+4+4","-tile","4x","-background","#222","-fill","white",out+".jpg"])
