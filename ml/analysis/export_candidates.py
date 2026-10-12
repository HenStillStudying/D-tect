# Prints the constants used by app/model-lab.html for the candidate models,
# fitted on the 107 real participants. Only group means/counts are exported
# (smallest group: 19 people), never individual rows.
# Run from ml/analysis after: python xlsx2csv.py "<dataset.xlsx>" real.csv
import json
from prep import df, X_raw_nan, y

real = df.loc[X_raw_nan.index, "Timestamp"].notna()
X, y = X_raw_nan[real], y[real]
hijab_col = next(c for c in df.columns if c.startswith("8."))
fem = X["Sex_Female"] == 1
hij = (df.loc[X.index, hijab_col].astype(str).str.strip().str.lower() == "ya") & fem

group = lambda mask: {"n": int(mask.sum()), "mean": round(float(y[mask].mean()), 2)}
out = {
    "n": int(len(y)),
    "overallMean": round(float(y.mean()), 2),
    "sexOnly": {"men": group(~fem), "women": group(fem)},
    "threeGroup": {"men": group(~fem), "womenNoHijab": group(fem & ~hij), "womenHijab": group(hij)},
    "trainingRange": {"age": [float(X.Age.min()), float(X.Age.max())],
                      "bmi": [round(float(X.BMI.min()), 1), round(float(X.BMI.max()), 1)]},
}
print(json.dumps(out, indent=2))
