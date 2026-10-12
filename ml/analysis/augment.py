# Does dataset augmentation help? Synthetic rows are generated ONLY from each
# training fold and every model is tested ONLY on real people. Same 5-fold x 10
# repeat splits as experiments.py (Step A). Also: monotonic constraints, and a
# deliberately LEAKY version to show how augmentation fakes accuracy.
# Run from ml/analysis after: python xlsx2csv.py "<dataset.xlsx>" real.csv
import warnings; warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from scipy.stats import norm
from data107 import X, y, F20, F21, BINARY, CONTINUOUS, MONOTONE
from sklearn.model_selection import KFold, RepeatedKFold
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error as MAE, r2_score, roc_auc_score

N_REPEATS = 10
AUG_FACTOR = 2                                   # synthetic rows = 2 x training rows

# ── Generators (fit on the training fold only) ─────────────────────
def snap(X_new, X_ref):
    """Round ordinal/binary columns to values that exist in the reference data; keep female-only
    features consistent with sex."""
    X_new = X_new.copy()
    for c in X_new.columns:
        if c in CONTINUOUS: continue
        allowed = np.sort(X_ref[c].unique())
        idx = np.abs(X_new[c].values[:, None] - allowed[None, :]).argmin(1)
        X_new[c] = allowed[idx]
    male = X_new["Sex_Female"] == 0
    X_new.loc[male, ["Hijab", "Pregnant", "Breastfeeding"]] = 0
    X_new["Age"] = X_new["Age"].round()
    return X_new

def aug_noise(Xtr, ytr, rng):
    """Jittered copies: age ±2y, BMI ±1, ordinal answers shift one step with p=0.15, y ±1."""
    reps = []
    for _ in range(AUG_FACTOR):
        Z = Xtr.copy()
        Z["Age"] += rng.normal(0, 2, len(Z)); Z["BMI"] += rng.normal(0, 1, len(Z))
        for c in Xtr.columns:
            if c in CONTINUOUS or c in BINARY: continue
            allowed = np.sort(Xtr[c].unique())
            pos = np.searchsorted(allowed, Z[c].values)
            move = rng.random(len(Z)) < 0.15
            pos = np.clip(pos + move * rng.choice([-1, 1], len(Z)), 0, len(allowed) - 1)
            Z[c] = allowed[pos]
        reps.append((snap(Z, Xtr), ytr + rng.normal(0, 1, len(ytr))))
    return pd.concat([r[0] for r in reps]), pd.concat([r[1] for r in reps])

def aug_smoter(Xtr, ytr, rng, n_new=None, k=5):
    """SMOTE for regression: blend a person with one of their 5 nearest neighbours (features and y)."""
    n_new = n_new or AUG_FACTOR * len(Xtr)
    Z = ((Xtr - Xtr.mean()) / (Xtr.std() + 1e-9)).values
    D = ((Z[:, None, :] - Z[None, :, :]) ** 2).sum(-1)
    nn = np.argsort(D, 1)[:, 1:k + 1]
    i = rng.integers(0, len(Xtr), n_new); j = nn[i, rng.integers(0, k, n_new)]
    lam = rng.random(n_new)[:, None]
    A, B = Xtr.values[i], Xtr.values[j]
    new = A + lam * (B - A)
    bin_idx = [Xtr.columns.get_loc(c) for c in BINARY]
    new[:, bin_idx] = np.where(lam < 0.5, A, B)[:, bin_idx]
    y_new = ytr.values[i] + lam[:, 0] * (ytr.values[j] - ytr.values[i])
    return snap(pd.DataFrame(new, columns=Xtr.columns), Xtr), pd.Series(y_new)

def aug_copula(Xtr, ytr, rng):
    """Gaussian copula: keep each column's distribution and the rank correlations between columns."""
    n_new = AUG_FACTOR * len(Xtr)
    Dd = Xtr.assign(_y=ytr.values)
    U = Dd.rank(method="average") / (len(Dd) + 1)
    C = np.corrcoef(norm.ppf(U).T)
    w, V = np.linalg.eigh(np.nan_to_num(C)); C = (V * np.clip(w, 1e-6, None)) @ V.T   # nearest valid
    S = norm.cdf(rng.multivariate_normal(np.zeros(len(C)), C, n_new))
    out = {}
    for k, c in enumerate(Dd.columns):
        method = "linear" if c in CONTINUOUS + ["_y"] else "inverted_cdf"
        out[c] = np.quantile(Dd[c].values, S[:, k], method=method)
    out = pd.DataFrame(out)
    return snap(out.drop(columns="_y"), Xtr), out["_y"]

AUG = {"noise": aug_noise, "smoter": aug_smoter, "copula": aug_copula}

# ── Models ──────────────────────────────────────────────────────────
mono = lambda cols: [MONOTONE[c] for c in cols]
RF  = lambda cols, m=False: RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42,
                                                  monotonic_cst=mono(cols) if m else None)
HGB = lambda cols, m=False: HistGradientBoostingRegressor(max_iter=200, learning_rate=0.03, max_depth=3,
                                                          min_samples_leaf=8, l2_regularization=1.0, random_state=42,
                                                          monotonic_cst=mono(cols) if m else None)
MODELS = {  # name: (feature columns, model factory, augmentation or None)
    "Sex only":                     (["Sex_Female"], LinearRegression, None),
    "Sex + hijab (3 groups)":       (["Sex_Female", "Hijab"], LinearRegression, None),
    "RF (20) — shipped settings":   (F20, lambda: RF(F20), None),
    "RF (21)":                      (F21, lambda: RF(F21), None),
    "RF (21) + noise copies":       (F21, lambda: RF(F21), "noise"),
    "RF (21) + SMOTER":             (F21, lambda: RF(F21), "smoter"),
    "RF (21) + copula":             (F21, lambda: RF(F21), "copula"),
    "RF (21) monotone":             (F21, lambda: RF(F21, True), None),
    "RF (21) monotone + SMOTER":    (F21, lambda: RF(F21, True), "smoter"),
    "GBoost (21)":                  (F21, lambda: HGB(F21), None),
    "GBoost (21) + SMOTER":         (F21, lambda: HGB(F21), "smoter"),
    "GBoost (21) monotone":         (F21, lambda: HGB(F21, True), None),
}

def fit_predict(name, Xtr, ytr, Xte, rng):
    cols, make, aug = MODELS[name]
    med = Xtr.median()
    Xtr, Xte = Xtr.fillna(med), Xte.fillna(med)       # imputation fitted on the training fold only
    if aug:
        Xs, ys = AUG[aug](Xtr, ytr, rng)
        Xtr = pd.concat([Xtr, Xs], ignore_index=True); ytr = pd.concat([ytr.reset_index(drop=True), ys.reset_index(drop=True)], ignore_index=True)
    return make().fit(Xtr[cols], ytr).predict(Xte[cols])

# ── Honest evaluation: same splits as Step A, test on real people only ──
splits = list(RepeatedKFold(n_splits=5, n_repeats=N_REPEATS, random_state=0).split(X))
rows = {n: [] for n in MODELS}
for rep in range(N_REPEATS):
    for name in MODELS:
        rng = np.random.default_rng(1000 + rep)
        pred = np.zeros(len(y))
        for tr, te in splits[rep * 5:(rep + 1) * 5]:
            pred[te] = fit_predict(name, X.iloc[tr], y.iloc[tr], X.iloc[te], rng)
        yt = y.values
        rows[name].append({"MAE": MAE(yt, pred), "R2": r2_score(yt, pred),
                           "AUC": roc_auc_score(yt < 20, -pred) if np.ptp(pred) > 1e-9 else 0.5,
                           "lo": pred.min(), "hi": pred.max()})
    print(f"repeat {rep + 1}/{N_REPEATS} done", flush=True)

# ── Sanity: does each model move in the physiological direction? ──
# Fit on all 107 (+ augmentation from all 107), then for every real person set the feature to its
# lowest vs highest value and average the change in prediction. Expected sign in brackets.
CHECK = {"Clothing": "+", "Sunscreen": "+", "Outdoor Sun Duration": "+", "Supplements": "+",
         "SkinType_Fitzpatrick": "-", "Hijab": "-"}
direction = {}
Xf = X.fillna(X.median())
for name, (cols, make, aug) in MODELS.items():
    rng = np.random.default_rng(7)
    Xa, ya = Xf, y.reset_index(drop=True)
    if aug:
        Xs, ys = AUG[aug](Xf, y, rng)
        Xa = pd.concat([Xf, Xs], ignore_index=True); ya = pd.concat([ya, ys.reset_index(drop=True)], ignore_index=True)
    m = make().fit(Xa[cols], ya)
    d = {}
    for f in CHECK:
        if f not in cols: d[f] = "—"; continue
        lo, hi = Xf.copy(), Xf.copy(); lo[f] = Xf[f].min(); hi[f] = Xf[f].max()
        if f == "Hijab": lo = lo[Xf.Sex_Female == 1]; hi = hi[Xf.Sex_Female == 1]
        delta = (m.predict(hi[cols]) - m.predict(lo[cols])).mean()
        ok = (delta > 0.05 and CHECK[f] == "+") or (delta < -0.05 and CHECK[f] == "-")
        d[f] = f"{delta:+.1f}{'' if ok else ' ✗'}"
    direction[name] = d

# ── The trap: augment the WHOLE dataset first, then cross-validate ──
leak = []
for rep in range(N_REPEATS):
    rng = np.random.default_rng(2000 + rep)
    Xs, ys = aug_smoter(Xf, y, rng)                   # synthetic rows made from ALL 107 people
    Xa = pd.concat([Xf, Xs], ignore_index=True); ya = pd.concat([y.reset_index(drop=True), ys], ignore_index=True)
    pred = np.zeros(len(ya))
    for tr, te in KFold(5, shuffle=True, random_state=rep).split(Xa):
        pred[te] = RF(F21).fit(Xa.iloc[tr][F21], ya.iloc[tr]).predict(Xa.iloc[te][F21])
    leak.append((MAE(ya, pred), r2_score(ya, pred)))
leak = np.array(leak)

# ── Report ──────────────────────────────────────────────────────────
res = {n: pd.DataFrame(r) for n, r in rows.items()}
sex = res["Sex only"].MAE.values
out = pd.DataFrame({n: {
    "MAE": f"{d.MAE.mean():.2f} ± {d.MAE.std():.2f}", "R²": f"{d.R2.mean():.3f}",
    "vs sex-only": f"{(d.MAE.values < sex - 1e-9).sum()}/{N_REPEATS}",
    "AUC<20": f"{d.AUC.mean():.2f}", "pred range": f"{d.lo.mean():.1f}–{d.hi.mean():.1f}",
    **{f"Δ {k} ({v})": direction[n][k] for k, v in CHECK.items()}} for n, d in res.items()}).T
pd.set_option("display.width", 260); pd.set_option("display.max_columns", 20)
print(f"\nN = {len(y)} real people | 5-fold x {N_REPEATS} | synthetic rows = {AUG_FACTOR}x training fold, test on real only")
print(out.to_string())
print("\nΔ columns: average change in prediction (ng/mL) when the feature goes from its lowest to highest value;"
      " expected sign in brackets; ✗ = wrong direction or no effect")
print(f"\nLEAKY (SMOTER on all data, then CV): MAE {leak[:,0].mean():.2f}  R² {leak[:,1].mean():.3f}"
      f"   <- compare with honest 'RF (21) + SMOTER' above")
