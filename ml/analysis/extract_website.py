import json, sys
nb = json.load(open(sys.argv[1], encoding="utf-8"))
src = "".join(nb["cells"][0]["source"])
s, e = src.index("def website_predict"), src.index("y_pred_website")
open("website.py", "w").write("import numpy as np\n" + src[s:e])
print("extracted", src[s:e].count("\n"), "lines")
