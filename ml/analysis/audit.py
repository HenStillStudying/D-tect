import warnings; warnings.filterwarnings("ignore")
import pandas as pd
from prep import df, sub, resolved, X_raw_nan, y

print("== A. Rows where every feature is missing (median-imputed 'people') ==")
allmiss = X_raw_nan.drop(columns=["Sex_Female", "Pregnant", "Breastfeeding", "HasMedicalCondition"]).isna().all(axis=1)
print(int(allmiss.sum()), "rows; their VITAMIN D:", y[allmiss].tolist())

print("\n== B. Duplicate Q26 columns (labelled rows) ==")
cols = [c for c in df.columns if c.startswith("26.")]
lab = df.loc[y.index]
for c in cols: print(repr(c[-6:]), lab[c].astype(str).str[:28].value_counts().head(6).to_dict())
print("identical values:", (lab[cols[0]].astype(str) == lab[cols[1]].astype(str)).mean().round(2))
for c in ["OUT_DUR", "OUT_tub"]:
    print(c, lab[c].astype(str).str[:28].value_counts().head(6).to_dict())

print("\n== C. Survey answer options per model feature (all rows) ==")
for f in ["Work Environment", "Indoor Sun Freq", "Outdoor Sun Duration", "Outdoor Body Part", "Rec Freq",
          "Shade Use", "Sunscreen", "Clothing", "Dairy", "Seafood", "Egg", "Medical Condition", "Supplements", "Night Shift"]:
    vc = sub[resolved[f]].dropna().astype(str).str.strip().str[:70].value_counts()
    print(f"-- {f}")
    for v in sorted(vc.index): print(f"     {vc[v]:4d}  {v}")
