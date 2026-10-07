import warnings; warnings.filterwarnings("ignore")
import re, numpy as np, pandas as pd
from prep import df, X, X_ordinal, y
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.metrics import mean_absolute_error as MAE, r2_score

pd.set_option("display.width", 200)
lab = df.loc[y.index].copy()
fem = X["Sex_Female"] == 1
col = lambda prefix: next(c for c in df.columns if c.startswith(prefix))

print("== 1. Raw gap ==")
for s, g in [("male", ~fem), ("female", fem)]:
    v = y[g]; print(f"{s:<7} n={len(v):3d} mean {v.mean():5.1f} median {v.median():5.1f} sd {v.std():4.1f} "
                    f"<12: {(v<12).mean():.0%} <20: {(v<20).mean():.0%} >=30: {(v>=30).mean():.0%}")
from scipy import stats
print("Mann-Whitney p =", f"{stats.mannwhitneyu(y[fem], y[~fem]).pvalue:.1e}")

print("\n== 2. How men and women differ on the MODEL's features (means) ==")
cmp = X_ordinal.groupby(fem.map({True: "female", False: "male"})).mean().T.round(2)
cmp["diff"] = (cmp["female"] - cmp["male"]).round(2)
print(cmp.to_string())

print("\n== 3. Columns NOT used by the model, by sex ==")
for prefix in ["8.", "9.", "10.", "11.", "35.", "36.", "38."]:
    c = col(prefix); print(f"-- {c[:80]}")
    t = pd.crosstab(lab[c].astype(str).str.strip().str[:45], fem.map({True: "F", False: "M"}))
    t["VitD_mean"] = y.groupby(lab[c].astype(str).str.strip().str[:45]).mean().round(1)
    print(t.to_string())
for c in ["LP (LINGKAR PINGGANG)", "LlA (LINGKAR LENGAN ATAS", "BB", "TB (cm)"]:
    v = pd.to_numeric(lab[c].astype(str).str.replace(",", "."), errors="coerce")
    print(f"{c:<26} male {v[~fem].mean():6.1f}  female {v[fem].mean():6.1f}  corr w/ VitD {v.corr(y):+.2f}")

print("\n== 4. Hijab among women ==")
h = lab[col("8.")].astype(str).str.strip()
w = pd.DataFrame({"hijab": h[fem], "VitD": y[fem]})
print(w.groupby("hijab")["VitD"].agg(["count", "mean", "median"]).round(1).to_string())

print("\n== 5. Does sex still matter after controlling for exposure? (linear, all rows) ==")
others = [c for c in X.columns if c != "Sex_Female"]
lr = LinearRegression().fit(X, y); print(f"Sex_Female coef with all 19 other features: {lr.coef_[list(X.columns).index('Sex_Female')]:+.2f} ng/mL (raw gap {y[fem].mean()-y[~fem].mean():+.2f})")
rng = np.random.default_rng(0); bs = []
for _ in range(2000):
    i = rng.integers(0, len(y), len(y))
    bs.append(LinearRegression().fit(X.iloc[i], y.iloc[i]).coef_[list(X.columns).index("Sex_Female")])
print(f"  bootstrap 95% CI: {np.percentile(bs, [2.5, 97.5]).round(1).tolist()}")

hij = (lab[col("8.")].astype(str).str.strip().str.lower() == "ya") & fem
Xh = X.assign(Hijab=hij.astype(int))
c = LinearRegression().fit(Xh, y).coef_
print(f"+ Hijab feature -> Sex_Female coef {c[list(Xh.columns).index('Sex_Female')]:+.2f}, Hijab coef {c[-1]:+.2f}")
Xs = X[["Sex_Female"]].assign(Hijab=hij.astype(int))
c = LinearRegression().fit(Xs, y).coef_
print(f"sex + hijab only -> Sex_Female {c[0]:+.2f}, Hijab {c[1]:+.2f}  (i.e. men 23.5 / no-hijab women / hijab women)")
tb = pd.to_numeric(lab["TB (cm)"].astype(str).str.replace(",", "."), errors="coerce")
print(f"height corr with VitD: all {tb.corr(y):+.2f} | men only {tb[~fem].corr(y[~fem]):+.2f} | women only {tb[fem].corr(y[fem]):+.2f}")

print("\n== 6. Within each sex: does anything predict VitD? (Spearman, |rho|>=0.2) ==")
for s, g in [("male", ~fem), ("female", fem)]:
    r = X_ordinal[g].drop(columns=["Sex_Female"]).apply(lambda c: stats.spearmanr(c, y[g]).correlation).dropna()
    r = r[r.abs() >= 0.2].sort_values(key=abs, ascending=False)
    print(f"{s}: " + (", ".join(f"{k} {v:+.2f}" for k, v in r.items()) or "nothing"))

print("\n== 7. Importance: impurity (what notebook showed) vs permutation on held-out folds ==")
kf = KFold(5, shuffle=True, random_state=42); pi = []
for tr, te in kf.split(X):
    rf = RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42).fit(X.iloc[tr], y.iloc[tr])
    pi.append(permutation_importance(rf, X.iloc[te], y.iloc[te], n_repeats=30, random_state=0,
                                     scoring="neg_mean_absolute_error").importances_mean)
pi = pd.Series(np.mean(pi, 0), index=X.columns).sort_values(ascending=False)
print("MAE increase when shuffled (ng/mL):", ", ".join(f"{k} {v:+.2f}" for k, v in pi.head(8).items()))

print("\n== 8. Model without sex, and separate models per sex ==")
p_all = cross_val_predict(RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42), X, y, cv=kf)
p_ns = cross_val_predict(RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42), X.drop(columns="Sex_Female"), y, cv=kf)
p_h = cross_val_predict(RandomForestRegressor(100, max_depth=5, min_samples_leaf=8, random_state=42), Xh, y, cv=kf)
print(f"with sex MAE {MAE(y,p_all):.2f} R2 {r2_score(y,p_all):.3f} | without sex MAE {MAE(y,p_ns):.2f} R2 {r2_score(y,p_ns):.3f}"
      f" | with sex + hijab MAE {MAE(y,p_h):.2f} R2 {r2_score(y,p_h):.3f}")
q = np.zeros(len(y)); grp = np.where(~fem, "M", np.where(hij, "FH", "F"))
for tr, te in kf.split(X):
    m = pd.Series(y.values[tr]).groupby(grp[tr]).mean(); q[te] = pd.Series(grp[te]).map(m).values
print(f"3-group mean (men / women no hijab / women hijab): MAE {MAE(y,q):.2f} R2 {r2_score(y,q):.3f}")
print("\n== 9. Sunscreen & reported skin colour by sex ==")
sc = lab[col("33.")].astype(str).str.strip().str[:30]
print(pd.crosstab(sc, fem.map({True: "F", False: "M"})).to_string())
print("women: VitD by sunscreen use", y[fem].groupby(X_ordinal.loc[fem, "Sunscreen"] <= 1).mean().round(1).rename({True: "SPF30+", False: "low/none"}).to_dict())
