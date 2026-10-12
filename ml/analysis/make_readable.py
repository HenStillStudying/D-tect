# Builds a human-readable Excel copy of the dataset: real columns, English
# headers, a column guide, and only the 107 real survey responses.
# Standard library only (writes the .xlsx XML directly — no openpyxl needed).
# Usage: python make_readable.py real.csv "../dataset/VitD_dataset_readable.xlsx"
import sys, csv, re, zipfile
from collections import Counter

src, out = sys.argv[1], sys.argv[2]
rows = list(csv.reader(open(src, encoding="utf-8")))
header, body = rows[0], rows[1:]
people = [r for r in body if r[0].strip()]          # rows with a timestamp = real responses

# (English name, used by the model?) for each of the 53 original columns
COLS = [
    ("Timestamp", ""), ("Participant no.", ""), ("Age", "yes"), ("Sex (Pria=M, Wanita=F)", "yes"),
    ("Pregnant (if female)", "yes"), ("Breastfeeding (if female)", "yes"), ("Wears hijab (if female)", "NO - strong signal"),
    ("Education", ""), ("Job type", ""), ("Job title", ""), ("Medical condition", "yes (any vs none)"),
    ("Takes vitamin D supplement", "yes"), ("Supplement dose", ""), ("Supplement - how long", ""),
    ("Supplement - how regular", ""), ("Night shift", "yes"), ("Work mostly indoors/outdoors", "yes"),
    ("Indoor work: sun how often", "yes"), ("Indoor work: sun how long", ""), ("Indoor work: sun what time", ""),
    ("Indoor work: body part exposed", ""), ("Outdoor work: how often outside", ""),
    ("Outdoor work: sun how long (copy 1)", ""), ("Outdoor work: sun what time", ""),
    ("Outdoor work: sun how long (copy 2)", "yes"), ("OUT_DUR (coded 0-4)", ""), ("OUT_tub (coded)", ""),
    ("Outdoor work: body part exposed", "yes"), ("Recreation: how often", "yes"), ("Recreation: how long", ""),
    ("Recreation: what time", ""), ("Recreation: body part exposed", ""), ("Shade use outdoors", "yes"),
    ("Sunscreen type", "yes"), ("Clothing outdoors", "yes"), ("Skin colour (self-described)", ""),
    ("Fitzpatrick skin type (1-6)", "yes"), ("Lunch break length", ""), ("Lunch start time", ""),
    ("Lunch location", ""), ("Dairy per week", "yes"), ("Seafood per week", "yes"), ("Eggs per week", "yes"),
    ("Meat per week", ""), ("Fats & oils per week", ""), ("Weight (kg)", ""), ("Height (cm)", ""),
    ("Height (m)", ""), ("Height squared", ""), ("BMI", "yes"), ("Waist circumference (cm)", ""),
    ("Upper-arm circumference (cm)", ""), ("VITAMIN D - lab 25(OH)D, ng/mL", "TARGET"),
]
assert len(COLS) == len(header) == 53

NUM = re.compile(r"^-?\d+(?:[.,]\d+)?$")
BAD = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
esc = lambda s: BAD.sub("", s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def colname(i):
    s = ""
    i += 1
    while i: i, r = divmod(i - 1, 26); s = chr(65 + r) + s
    return s

def cell(ref, v, style=0, force_text=False):
    v = "" if v is None else str(v).strip()
    if v == "": return ""
    st = f' s="{style}"' if style else ""
    if not force_text and NUM.match(v):
        return f'<c r="{ref}"{st}><v>{v.replace(",", ".")}</v></c>'
    return f'<c r="{ref}"{st} t="inlineStr"><is><t xml:space="preserve">{esc(v)}</t></is></c>'

def sheet(table, widths, freeze=True, autofilter=True, text_cols=()):
    xml = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">']
    if freeze:
        xml.append('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" '
                   'activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>')
    xml.append("<cols>" + "".join(f'<col min="{i+1}" max="{i+1}" width="{w}" customWidth="1"/>'
                                  for i, w in enumerate(widths)) + "</cols><sheetData>")
    for r, row in enumerate(table, 1):
        style = 1 if r == 1 else 2
        xml.append(f'<row r="{r}">' + "".join(cell(f"{colname(c)}{r}", v, style, c in text_cols)
                                              for c, v in enumerate(row)) + "</row>")
    xml.append("</sheetData>")
    if autofilter:
        xml.append(f'<autoFilter ref="A1:{colname(len(table[0]) - 1)}{len(table)}"/>')
    xml.append("</worksheet>")
    return "".join(xml)

# Sheet 1: read me
readme = [["About this file"],
          ["A readable copy of 'VITAMIN D DATA FOR FCS - RISIKO.xlsx'. In the original, each survey row was stored as one long comma-separated text cell in column A."],
          [f"Real survey responses: {len(people)} people (original sheet rows 2-{len(people) + 1}). Every one of them has a vitamin D lab value."],
          ["Original rows 109-112 are NOT people: 18.60 / 9 / 22.95 / 13.95 = the median, IQR, Q3 and Q1 of the 107 vitamin D values. The training notebook mistakenly used them as 4 extra participants."],
          ["Original rows 113-117: the lab's reference ranges - Deficiency < 20 · Insufficiency 20 - <30 · Sufficiency 30 - <100 · Potential toxicity >= 100 ng/mL."],
          ["Original rows 118-1003: empty, except leftover formulas (Height (m) = 0, BMI)."],
          ["Sheets: 'Column guide' explains every column; 'Responses (107)' has the data with English headers (filter arrows on the header row)."],
          ["PRIVATE: contains participants' health data. Do not share, upload or commit this file."]]
readme_xml = sheet(readme, [160], freeze=False, autofilter=False)

# Sheet 2: column guide
guide = [["Column", "English name", "Used by model?", "Answered (of 107)", "Most common answers", "Original question (Indonesian)"]]
for i, (name, used) in enumerate(COLS):
    vals = Counter(r[i].strip() for r in people if r[i].strip())
    common = "(numbers / free text)" if len(vals) > 15 else "  |  ".join(f"{k} ({n})" for k, n in vals.most_common(6))
    guide.append([colname(i), name, used, str(sum(vals.values())), common, re.sub(r"\s+", " ", header[i]).strip()])
guide_xml = sheet(guide, [8, 36, 18, 16, 110, 90], text_cols={3})

# Sheet 3: the 107 responses
data = [[name for name, _ in COLS]] + [r[:53] for r in people]
data_xml = sheet(data, [17, 8] + [22] * 51, text_cols={0})

STYLES = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
          '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
          '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
          '<fill><patternFill patternType="solid"><fgColor rgb="FFFFE0B2"/><bgColor indexed="64"/></patternFill></fill></fills>'
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
          '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
          '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>'
          '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs>'
          '</styleSheet>')
sheets = [("Read me", readme_xml), ("Column guide", guide_xml), ("Responses (107)", data_xml)]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + "".join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                  for i in range(1, len(sheets) + 1)) + "</Types>")
    z.writestr("_rels/.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        "</Relationships>")
    z.writestr("xl/workbook.xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
        + "".join(f'<sheet name="{esc(n)}" sheetId="{i}" r:id="rId{i}"/>' for i, (n, _) in enumerate(sheets, 1))
        + "</sheets></workbook>")
    z.writestr("xl/_rels/workbook.xml.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'
                  for i in range(1, len(sheets) + 1))
        + f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        "</Relationships>")
    z.writestr("xl/styles.xml", STYLES)
    for i, (_, x) in enumerate(sheets, 1):
        z.writestr(f"xl/worksheets/sheet{i}.xml", x)
print(f"wrote {out}: {len(people)} responses x {len(COLS)} columns, 3 sheets")
