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

# 3 groups + "takes vitamin D daily for > 1 month" (supplements.py): linear model on all 107.
# Follow-ups Q15/Q16 count only when Q13 = Ya. 80% half-width = 80th percentile of the
# cross-validated absolute errors on the Step A splits (5-fold x 10 repeats).
import numpy as np, pandas as pd
from prep import llo
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import RepeatedKFold
col = lambda prefix: next(c for c in df.columns if c.startswith(prefix))
takes = X["Supplements"] == 1
daily_long = takes & (llo(df.loc[X.index, col("16. ")]) == 1) & (llo(df.loc[X.index, col("15. ")]) >= 1)
D = pd.DataFrame({"female": fem.astype(int), "hijab": hij.astype(int), "dailyLong": daily_long.astype(int)})
m = LinearRegression().fit(D, y)
errs = []
for tr, te in RepeatedKFold(n_splits=5, n_repeats=10, random_state=0).split(D):
    errs += list(np.abs(LinearRegression().fit(D.iloc[tr], y.iloc[tr]).predict(D.iloc[te]) - y.iloc[te]))
out["supplementModel"] = {
    "intercept": round(float(m.intercept_), 2),
    **{k: round(float(c), 2) for k, c in zip(D.columns, m.coef_)},
    "range80": round(float(np.percentile(errs, 80)), 1),
    "nDailyLong": int(daily_long.sum()), "nTakes": int(takes.sum()),
}
print(json.dumps(out, indent=2))
