# Exact replica of notebook cells 0 + 1 preprocessing (Colab path swapped for local CSV)
import re, numpy as np, pandas as pd

df = pd.read_csv("real.csv")
def normalize(s): return re.sub(r"\s+", " ", str(s)).strip()
df.columns = [normalize(c) for c in df.columns]
norm_lookup = {normalize(c): c for c in df.columns}

exact_cols = {
    "Age": "4. Usia", "Sex": "5. Jenis Kelamin",
    "Pregnant": "6. Jika wanita, apakah Anda sedang hamil?",
    "Breastfeeding": "7. Jika wanita, apakah Anda sedang menyusui?",
    "Medical Condition": "12. Apakah Anda menderita penyakit:",
    "Supplements": "13. Dalam 1 bulan terakhir, apakah Anda rutin minum vitamin yang mengandung vitamin D?",
    "Night Shift": "18. Apakah pekerjaan Anda ada jadwal kerja malam ?",
    "Work Environment": "19. Apakah pekerjaan lebih banyak berada di luar atau di dalam ruangan ?",
    "Indoor Sun Freq": "20. Saat bekerja di dalam ruangan, seberapa sering Anda terpapar sinar matahari (misalnya di teras, balkon, atau halaman)?",
    "Outdoor Sun Duration": "26. Jika Anda bekerja di luar ruangan, berapa lama Anda terpapar sinar matahari ?.1",
    "Outdoor Body Part": "27. Saat bekerja di luar ruangan, bagian tubuh mana yang terpapar sinar matahari?",
    "Rec Freq": "28. Seberapa sering Anda melakukan aktivitas rekreasi di luar ruangan (misalnya olahraga, mendaki, berjalan kaki, berkemah, berenang)?",
    "Shade Use": "32. Saat berada di luar ruangan, apakah Anda biasanya berada di tempat teduh (misalnya di bawah pohon, bangunan, payung)?",
    "Sunscreen": "33. Jenis tabir surya apa yang Anda gunakan?",
    "Clothing": "34. Jenis pakaian apa yang biasanya Anda gunakan saat berada di luar ruangan?",
    "Skin Type": "FITZPATRICK SCALE",
    "Dairy": "45. Dalam 1 minggu terakhir, seberapa sering Anda mengkonsumsi produk susu (Susu/ yoghurt / keju):",
    "Seafood": "46. Dalam 1 minggu terakhir , Seberapa sering Anda mengkonsumsi makanan laut: (Ikan segar dan ikan kaleng, kerang, udang, kepiting, dll)",
    "Egg": "47. Dalam 1 minggu terakhir Seberapa sering Anda mengkonsumsi telur",
    "BMI": "BMI (BODY MASS INDEX)",
}

def resolve(e):
    n = normalize(e)
    if n in norm_lookup: return norm_lookup[n]
    m = re.match(r"^(\d+)\.", n)
    cands = [c for c in df.columns if normalize(c).startswith(m.group(1) + ".")] if m else []
    return cands[0] if len(cands) == 1 else None

resolved = {f: resolve(e) for f, e in exact_cols.items()}
assert all(resolved.values()), resolved
sub = df[list(resolved.values()) + ["VITAMIN D"]].copy()

def llo(s):
    def ex(v):
        if pd.isna(v): return np.nan
        t = str(v).strip().lower()
        return ord(t[0]) - 97 if t and t[0] in "abcdefg" and (len(t) == 1 or t[1] in ").:") else np.nan
    return s.map(ex)

def yn(s):
    def ex(v):
        if pd.isna(v): return np.nan
        t = str(v).strip().lower()
        return 1 if t == "ya" else 0 if t in ("tidak", "no", "n") else np.nan
    return s.map(ex)

ordinal = ["Work Environment", "Indoor Sun Freq", "Outdoor Sun Duration", "Outdoor Body Part", "Rec Freq",
           "Shade Use", "Sunscreen", "Clothing", "Dairy", "Seafood", "Egg"]
binary = ["Pregnant", "Breastfeeding", "Night Shift", "Supplements"]

X = pd.DataFrame(index=sub.index)
X["Age"] = pd.to_numeric(sub[resolved["Age"]], errors="coerce")
X["Sex_Female"] = (sub[resolved["Sex"]].astype(str).str.strip().str.lower() == "wanita").astype(int)
X["BMI"] = pd.to_numeric(sub[resolved["BMI"]].astype(str).str.replace(",", ".", regex=False)
                         .str.extract(r"([\d.]+)")[0], errors="coerce")
X["SkinType_Fitzpatrick"] = pd.to_numeric(sub[resolved["Skin Type"]], errors="coerce")
for f in ordinal: X[f] = llo(sub[resolved[f]])
for f in binary:  X[f] = yn(sub[resolved[f]])
X.loc[X["Sex_Female"] == 0, ["Pregnant", "Breastfeeding"]] = 0
med = sub[resolved["Medical Condition"]].astype(str).str.strip().str.lower()
X["HasMedicalCondition"] = (~med.isin(["d) tidak ada", "tidak ada", "nan", ""])).astype(int)

y = pd.to_numeric(sub["VITAMIN D"].astype(str).str.replace(",", ".", regex=False), errors="coerce")
valid = y.notna()
X, y = X.loc[valid], y.loc[valid]
X_raw_nan = X.copy()
X = X.fillna(X.median(numeric_only=True))
X_ordinal = X.copy()
for c, m in {"Outdoor Sun Duration": {0: 2.5, 1: 10, 2: 22.5, 3: 45, 4: 75},
             "Indoor Sun Freq": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Rec Freq": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Dairy": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Seafood": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6}}.items():
    X[c] = X[c].map(m)
X = X.fillna(X.median(numeric_only=True))
