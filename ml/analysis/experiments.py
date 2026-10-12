# Step A — candidate model comparison on the 107 real participants.
# Every model sees the same 5-fold x 10-repeat outer splits. Imputation and
# hyperparameter tuning happen inside each training fold (no leakage).
# Run from ml/analysis after: python xlsx2csv.py "<dataset.xlsx>" real.csv
import warnings; warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from prep import df, X_raw_nan, y, llo
from sklearn.base import clone
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, FunctionTransformer
from sklearn.model_selection import KFold, RepeatedKFold, GridSearchCV, cross_val_predict
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error as MAE, r2_score, roc_auc_score

N_REPEATS = 10

# ── Data: real responses only (rows with a Timestamp) ─────────────
col = lambda prefix: next(c for c in df.columns if c.startswith(prefix))
real = df.loc[X_raw_nan.index, "Timestamp"].notna()
X = X_raw_nan[real].copy()
y = y[real].copy()
for c, m in {"Outdoor Sun Duration": {0: 2.5, 1: 10, 2: 22.5, 3: 45, 4: 75},
             "Indoor Sun Freq": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Rec Freq": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Dairy": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Seafood": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6}}.items():
    X[c] = X[c].map(m)                                   # NaN stays NaN -> imputed inside folds
lab = df.loc[X.index]
X["Hijab"] = ((lab[col("8.")].astype(str).str.strip().str.lower() == "ya") & (X["Sex_Female"] == 1)).astype(int)

# Extra survey columns the app does NOT ask today (to test if more questions would help)
num = lambda s: pd.to_numeric(s.astype(str).str.replace(",", "."), errors="coerce")
extra = {
    "Education": llo(lab[col("9. ")]), "Indoor Sun Duration": llo(lab[col("22. ")]),
    "Indoor Sun Time": llo(lab[col("23. ")]), "Indoor Body Part": llo(lab[col("21. ")]),
    "Outdoor Work Freq": llo(lab[col("24. ")]), "Outdoor Sun Time": llo(lab[col("25. ")]),
    "Rec Duration": llo(lab[col("29. ")]), "Rec Time": llo(lab[col("30. ")]), "Rec Body Part": llo(lab[col("31. ")]),
    "Lunch Length": llo(lab[col("36. ")]), "Lunch Time": llo(lab[col("37. ")]), "Lunch Location": llo(lab[col("38. ")]),
    "Meat": llo(lab[col("48. ")]), "Fats": llo(lab[col("49. ")]),
    "Waist": num(lab["LP (LINGKAR PINGGANG)"]), "Upper Arm": num(lab["LlA (LINGKAR LENGAN ATAS"]),
}
job = llo(lab[col("10. ")])
for k in range(5): extra[f"Job_{'abcde'[k]}"] = (job == k).astype(int)
for k, v in extra.items(): X[k] = v

F20 = ["Age", "Sex_Female", "BMI", "SkinType_Fitzpatrick", "Work Environment", "Indoor Sun Freq",
       "Outdoor Sun Duration", "Outdoor Body Part", "Rec Freq", "Shade Use", "Sunscreen", "Clothing",
       "Dairy", "Seafood", "Egg", "Pregnant", "Breastfeeding", "Night Shift", "Supplements", "HasMedicalCondition"]
F21 = F20 + ["Hijab"]
FSMALL = ["Sex_Female", "Hijab", "Supplements", "Clothing", "Outdoor Body Part",
          "Outdoor Sun Duration", "SkinType_Fitzpatrick", "BMI", "Age"]
FALL = F21 + list(extra)

# ── Candidate models ──────────────────────────────────────────────
pick = lambda cols: FunctionTransformer(lambda d: d[cols], validate=False)
def lin(cols, model):  return Pipeline([("pick", pick(cols)), ("imp", SimpleImputer(strategy="median")),
                                        ("sc", StandardScaler()), ("m", model)])
def tree(cols, model): return Pipeline([("pick", pick(cols)), ("imp", SimpleImputer(strategy="median")), ("m", model)])
RF_GRID = {"m__max_depth": [3, None], "m__min_samples_leaf": [4, 8, 15]}
RIDGE_GRID = {"m__alpha": [0.3, 1, 3, 10, 30, 100, 300]}
GB_GRID = {"m__n_estimators": [50, 150], "m__max_depth": [1, 2], "m__min_samples_leaf": [5, 10]}
rf = lambda: RandomForestRegressor(n_estimators=100, random_state=42)

MODELS = {   # name: (pipeline, grid or None, needs app change?)
    "Predict the mean":            (lin(["Age"], DummyRegressor()), None, ""),
    "Sex only":                    (lin(["Sex_Female"], LinearRegression()), None, ""),
    "Sex + hijab (3 groups)":      (lin(["Sex_Female", "Hijab"], LinearRegression()), None, "hijab Q"),
    "RF shipped settings (20)":    (tree(F20, RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42)), None, ""),
    "RF tuned (20)":               (tree(F20, rf()), RF_GRID, ""),
    "RF tuned (20 + hijab)":       (tree(F21, rf()), RF_GRID, "hijab Q"),
    "Ridge tuned (20 + hijab)":    (lin(F21, Ridge()), RIDGE_GRID, "hijab Q"),
    "Ridge tuned (small set)":     (lin(FSMALL, Ridge()), RIDGE_GRID, "hijab Q"),
    "GBoost tuned (20 + hijab)":   (tree(F21, GradientBoostingRegressor(learning_rate=0.05, random_state=42)), GB_GRID, "hijab Q"),
    "RF tuned (all survey cols)":  (tree(FALL, rf()), RF_GRID, "many new Qs"),
    "Ridge tuned (all survey cols)": (lin(FALL, Ridge()), RIDGE_GRID, "many new Qs"),
}

# ── Evaluation ────────────────────────────────────────────────────
tier = lambda v: np.digitize(v, [12, 20, 30])          # 0:<12 1:12-19 2:20-29 3:>=30
fem = (X["Sex_Female"] == 1).values
rows = {name: [] for name in MODELS}
outer = RepeatedKFold(n_splits=5, n_repeats=N_REPEATS, random_state=0)
splits = list(outer.split(X))
for rep in range(N_REPEATS):
    for name, (pipe, grid, _) in MODELS.items():
        pred = np.zeros(len(y)); lo = np.zeros(len(y)); hi = np.zeros(len(y))
        for k, (tr, te) in enumerate(splits[rep * 5:(rep + 1) * 5]):
            inner = KFold(5, shuffle=True, random_state=1000 * rep + k)
            Xtr, ytr = X.iloc[tr], y.iloc[tr]
            est = GridSearchCV(clone(pipe), grid, cv=inner, scoring="neg_mean_absolute_error", n_jobs=-1).fit(Xtr, ytr).best_estimator_ \
                  if grid else clone(pipe).fit(Xtr, ytr)
            # 80% interval: half-width = 80th percentile of inner-CV absolute errors of the chosen model
            q = np.quantile(np.abs(ytr - cross_val_predict(clone(est), Xtr, ytr, cv=inner)), 0.8)
            p = est.predict(X.iloc[te]); pred[te] = p; lo[te] = p - q; hi[te] = p + q
        yt = y.values; defic = yt < 20
        rows[name].append({
            "MAE": MAE(yt, pred), "R2": r2_score(yt, pred),
            "MAE_women": MAE(yt[fem], pred[fem]), "MAE_men": MAE(yt[~fem], pred[~fem]),
            "AUC<20": roc_auc_score(defic, -pred) if np.ptp(pred) > 1e-9 else 0.5,
            "sens<20": (pred[defic] < 20).mean(), "spec<20": (pred[~defic] >= 20).mean(),
            "tier_acc": (tier(pred) == tier(yt)).mean(),
            "pred_min": pred.min(), "pred_max": pred.max(),
            "n_pred_severe": (pred < 12).sum(), "n_pred_sufficient": (pred >= 30).sum(),
            "cover80": ((yt >= lo) & (yt <= hi)).mean(), "width80": (hi - lo).mean(),
        })
    print(f"repeat {rep + 1}/{N_REPEATS} done", flush=True)

res = {n: pd.DataFrame(r) for n, r in rows.items()}
sex = res["Sex only"]["MAE"].values
summary = pd.DataFrame({
    n: {"MAE": f"{d.MAE.mean():.2f} ± {d.MAE.std():.2f}", "R²": f"{d.R2.mean():.3f}",
        "beats sex-only": f"{(d.MAE.values < sex - 1e-9).sum()}/{N_REPEATS}",
        "ΔMAE vs sex": f"{(d.MAE.values - sex).mean():+.2f}",
        "MAE women/men": f"{d.MAE_women.mean():.2f} / {d.MAE_men.mean():.2f}",
        "AUC <20": f"{d['AUC<20'].mean():.2f}", "sens/spec <20": f"{d['sens<20'].mean():.0%} / {d['spec<20'].mean():.0%}",
        "tier acc": f"{d.tier_acc.mean():.0%}", "pred range": f"{d.pred_min.mean():.1f}–{d.pred_max.mean():.1f}",
        "#pred <12 / ≥30": f"{d.n_pred_severe.mean():.1f} / {d.n_pred_sufficient.mean():.1f}",
        "80% range: hit / width": f"{d.cover80.mean():.0%} / ±{d.width80.mean() / 2:.1f}",
        "app change": MODELS[n][2] or "-"}
    for n, d in res.items()}).T
summary["_mae"] = [res[n].MAE.mean() for n in summary.index]
summary = summary.sort_values("_mae").drop(columns="_mae")
pd.set_option("display.width", 250); pd.set_option("display.max_columns", 20)
print(f"\nN = {len(y)} real participants | 5-fold x {N_REPEATS} repeats | actual tiers <12/12-19/20-29/>=30:",
      np.bincount(tier(y.values), minlength=4).tolist())
print(summary.to_string())
