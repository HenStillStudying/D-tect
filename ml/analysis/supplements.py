# Do the unused supplement follow-up questions (Q14 dose, Q15 how long, Q16 how regular)
# add anything beyond the yes/no answer (Q13) the model already uses?
# Same 5-fold x 10-repeat splits as Step A; tested on the 107 real participants only.
# Run from ml/analysis after: python xlsx2csv.py "<dataset.xlsx>" real.csv
import warnings; warnings.filterwarnings("ignore")
import numpy as np, pandas as pd
from prep import df, llo
from data107 import X, y, F21, MONOTONE
from sklearn.model_selection import RepeatedKFold
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error as MAE, r2_score

N_REPEATS = 10
col = lambda prefix: next(c for c in df.columns if c.startswith(prefix))
lab = df.loc[X.index]
takes = X["Supplements"] == 1                                     # Q13 "Ya"
dose = llo(lab[col("14. ")])                                      # a 400, b 1000, c 5000, d other, e don't know
dur = llo(lab[col("15. ")])                                       # a <1 mo, b 1-6 mo, c 6-12 mo, d >1 yr
reg = llo(lab[col("16. ")])                                       # a not daily, b daily

# ── 1. Consistency: follow-ups should only be answered by Q13 = "Ya" ──
print(f"N = {len(y)} | Q13 yes = {takes.sum()}")
for name, s in {"Q14 dose": dose, "Q15 how long": dur, "Q16 how regular": reg}.items():
    print(f"  {name}: answered by {s.notna().sum()} people, of whom {(s.notna() & ~takes).sum()} said NO to Q13")
print("  -> follow-ups are used only when Q13 = Ya; answers from Q13 = Tidak are ignored")
dose, dur, reg = dose.where(takes), dur.where(takes), reg.where(takes)

# ── 2. Features built from the follow-ups (users only; non-users = 0) ──
# IU/day: known dose, else the most common dose (1000); "not daily" assumed ~3 days/week (x 3/7).
# Assumptions, not measurements: the questionnaire doesn't say how many days "not daily" means.
iu = dose.map({0: 400, 1: 1000, 2: 5000, 3: 1000, 4: 1000}).fillna(1000)
iu = np.where(takes, iu * np.where(reg == 1, 1, 3 / 7), 0)
S = pd.DataFrame(index=X.index)
S["Supp level"] = np.where(~takes, 0, np.where(reg == 1, 2, 1))   # 0 none, 1 not daily / unknown, 2 daily
S["Supp log IU/day"] = np.log1p(iu)
S["Supp >1 month"] = (takes & (dur >= 1)).astype(int)            # vitamin D takes weeks-months to build up
S["Supp daily & >1 month"] = (takes & (reg == 1) & (dur >= 1)).astype(int)

# ── 3. Descriptive: raw means, and means after removing the sex/hijab group effect ──
g3 = X["Sex_Female"].astype(str) + X["Hijab"].astype(str)
resid = y - y.groupby(g3).transform("mean")                      # vitamin D relative to own sex/hijab group
groups = {
    "No supplement": ~takes,
    "Takes, not daily / unknown": takes & (reg != 1),
    "Takes, daily": takes & (reg == 1),
    "Takes, < 1 month": takes & (dur == 0),
    "Takes, > 1 month": takes & (dur >= 1),
    "Dose 1000 IU": takes & (dose == 1),
    "Dose 5000 IU": takes & (dose == 2),
    "Dose don't know": takes & (dose == 4),
}
print("\nGroup                         n   mean VitD   vs own sex/hijab group")
for k, m in groups.items():
    print(f"  {k:28s}{m.sum():3d}   {y[m].mean():6.1f}      {resid[m].mean():+5.1f}" if m.sum() else f"  {k:28s}  0")

# ── 4. Cross-validated comparison (same splits as Step A) ──
Xs = pd.concat([X, S], axis=1)
mono = lambda cols: [MONOTONE.get(c, 1) for c in cols]           # supplement features constrained to +
RFm = lambda cols: RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42, monotonic_cst=mono(cols))
G3 = ["Sex_Female", "Hijab"]
F21_wo = [c for c in F21 if c != "Supplements"]
MODELS = {
    "3 groups":                         (G3, LinearRegression),
    "3 groups + supp yes/no":           (G3 + ["Supplements"], LinearRegression),
    "3 groups + supp level":            (G3 + ["Supp level"], LinearRegression),
    "3 groups + log IU/day":            (G3 + ["Supp log IU/day"], LinearRegression),
    "3 groups + supp >1 month":         (G3 + ["Supp >1 month"], LinearRegression),
    "3 groups + daily & >1 month":      (G3 + ["Supp daily & >1 month"], LinearRegression),
    "RF monotone (21), yes/no":         (F21, lambda: RFm(F21)),
    "RF monotone, supp level":          (F21_wo + ["Supp level"], lambda: RFm(F21_wo + ["Supp level"])),
    "RF monotone, log IU/day":          (F21_wo + ["Supp log IU/day"], lambda: RFm(F21_wo + ["Supp log IU/day"])),
    "RF monotone, all supp features":   (F21 + list(S), lambda: RFm(F21 + list(S))),
}
splits = list(RepeatedKFold(n_splits=5, n_repeats=N_REPEATS, random_state=0).split(Xs))
res = {n: [] for n in MODELS}
for rep in range(N_REPEATS):
    for name, (cols, make) in MODELS.items():
        pred = np.zeros(len(y))
        for tr, te in splits[rep * 5:(rep + 1) * 5]:
            Xtr, Xte = Xs.iloc[tr][cols], Xs.iloc[te][cols]
            med = Xtr.median()
            pred[te] = make().fit(Xtr.fillna(med), y.iloc[tr]).predict(Xte.fillna(med))
        res[name].append((MAE(y, pred), r2_score(y, pred)))
res = {n: np.array(v) for n, v in res.items()}
base = res["3 groups"][:, 0]
print(f"\nN = {len(y)} | 5-fold x {N_REPEATS} (Step A splits) | 'beats 3 groups' = repeats with lower MAE")
print(f"{'Model':34s} {'MAE':>13s} {'R²':>7s}  beats 3 groups")
for n, v in res.items():
    print(f"{n:34s} {v[:,0].mean():5.2f} ± {v[:,0].std():.2f} {v[:,1].mean():7.3f}  {(v[:,0] < base - 1e-9).sum():2d}/{N_REPEATS}")

# ── 5. Effect sizes on all 107 (linear, adjusted for sex/hijab) ──
print("\nLinear coefficient (ng/mL), fitted on all 107 with sex + hijab:")
for f in ["Supplements"] + list(S):
    m = LinearRegression().fit(Xs[G3 + [f]], y)
    unit = "per log-unit" if "IU" in f else "per step" if f == "Supp level" else "yes vs no"
    print(f"  {f:24s} {m.coef_[-1]:+5.2f}  ({unit})   n with feature > 0: {(Xs[f] > 0).sum()}")

# ── 6. Robustness: is the best result real or luck from trying 5 variants on few people? ──
VARIANTS = ["Supplements"] + list(S)
def cv_mae(feat, Xd, yd, reps=N_REPEATS):
    sp = list(RepeatedKFold(n_splits=5, n_repeats=reps, random_state=0).split(Xd))
    out = []
    for r in range(reps):
        pred = np.zeros(len(yd))
        for tr, te in sp[r * 5:(r + 1) * 5]:
            cols = G3 + ([feat] if feat else [])
            pred[te] = LinearRegression().fit(Xd.iloc[tr][cols], yd.iloc[tr]).predict(Xd.iloc[te][cols])
        out.append(MAE(yd, pred))
    return np.mean(out)

# (a) Nested selection: the supplement variant is chosen by inner 5-fold CV inside each training fold,
#     so picking the best of 5 variants can't leak into the score.
nested, chosen = [], []
for r in range(N_REPEATS):
    pred = np.zeros(len(y))
    for tr, te in splits[r * 5:(r + 1) * 5]:
        Xtr, ytr = Xs.iloc[tr], y.iloc[tr]
        best = min(VARIANTS, key=lambda f: cv_mae(f, Xtr.reset_index(drop=True), ytr.reset_index(drop=True), reps=2))
        chosen.append(best)
        pred[te] = LinearRegression().fit(Xtr[G3 + [best]], ytr).predict(Xs.iloc[te][G3 + [best]])
    nested.append(MAE(y, pred))
nested = np.array(nested)
print(f"\n(a) Nested (variant picked inside each training fold): MAE {nested.mean():.2f} ± {nested.std():.2f}, "
      f"beats 3 groups {(nested < base - 1e-9).sum()}/{N_REPEATS}")
print("    variant chosen:", pd.Series(chosen).value_counts().to_dict())

# (b) Permutation test: shuffle "daily & >1 month" among people of the same sex/hijab group, 200 times.
#     How often does a random label do as well as the real one?
F = "Supp daily & >1 month"
real_gain = res["3 groups"][:, 0].mean() - cv_mae(F, Xs, y)
rng = np.random.default_rng(0)
gains = []
for _ in range(200):
    Xp = Xs.copy()
    for g in g3.unique():
        idx = Xp.index[g3 == g]
        Xp.loc[idx, F] = rng.permutation(Xp.loc[idx, F].values)
    gains.append(res["3 groups"][:, 0].mean() - cv_mae(F, Xp, y, reps=2))
gains = np.array(gains)
print(f"(b) Permutation test for '{F}': real MAE gain {real_gain:.2f}; shuffled gains max {gains.max():.2f}, "
      f"p = {(1 + (gains >= real_gain).sum()) / (1 + len(gains)):.3f}")

# (c) Influence: drop each of the people with the feature one at a time; does the gain survive?
pos = Xs.index[Xs[F] == 1]
drops = []
for i in pos:
    keep = Xs.index != i
    drops.append(cv_mae(None, Xs[keep], y[keep], reps=3) - cv_mae(F, Xs[keep], y[keep], reps=3))
print(f"(c) Leave-one-supplement-user-out: MAE gain ranges {min(drops):.2f} to {max(drops):.2f} (n = {len(pos)})")
print(f"    median vitamin D of the '{F}' group: {y[pos].median():.1f} (whole sample {y.median():.1f})")
