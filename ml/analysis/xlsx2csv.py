# Converts the dataset xlsx to real.csv using only the standard library.
# The sheet stores each survey row as one CSV line inside a single cell,
# so the cells are read first, then re-parsed as CSV.
# Usage: python xlsx2csv.py "../dataset/VITAMIN D DATA FOR FCS - RISIKO.xlsx" real.csv
import sys, io, re, csv, zipfile, xml.etree.ElementTree as ET

src, out = sys.argv[1], sys.argv[2]
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
z = zipfile.ZipFile(src)

shared = []
if "xl/sharedStrings.xml" in z.namelist():
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns):
        shared.append("".join(t.text or "" for t in si.iter("{%s}t" % ns["m"])))

def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(): n = n * 26 + ord(ch) - 64
    return n - 1

cells = []
for r in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).iter("{%s}row" % ns["m"]):
    row = {}
    for c in r.findall("m:c", ns):
        v, t = c.find("m:v", ns), c.get("t")
        if t == "inlineStr": row[col_index(c.get("r"))] = "".join(x.text or "" for x in c.iter("{%s}t" % ns["m"]))
        elif v is not None:  row[col_index(c.get("r"))] = shared[int(v.text)] if t == "s" else v.text
    cells.append(row.get(0, ""))

rows = list(csv.reader(io.StringIO("\n".join(cells))))
with open(out, "w", newline="", encoding="utf-8") as f:
    csv.writer(f).writerows(rows)
print("rows", len(rows), "cols", sorted(set(len(r) for r in rows)))
