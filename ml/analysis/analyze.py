import warnings; warnings.filterwarnings("ignore")
import json, numpy as np, pandas as pd
from prep import X, X_ordinal, X_raw_nan, y, df
from sklearn.model_selection import KFold, RepeatedKFold, GridSearchCV, cross_val_predict, cross_validate, learning_curve
from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error as MAE, r2_score

kf = KFold(5, shuffle=True, random_state=42)
RF = lambda **k: RandomForestRegressor(**{"n_estimators": 100, "max_depth": 5, "min_samples_leaf": 8, "random_state": 42, **k})

print("== 0. Replication ==")
print("N labelled:", len(y), "of", len(df), "rows | features:", X.shape[1])
p = cross_val_predict(RF(), X, y, cv=kf)
print(f"RF(100,d5,leaf8) CV MAE {MAE(y,p):.2f} R2 {r2_score(y,p):.3f}   (notebook: 5.39 / 0.159)")

print("\n== 1. Target ==")
print(y.describe().round(2).to_string())
print("tiers: <12:", (y < 12).sum(), " 12-19:", ((y >= 12) & (y < 20)).sum(),
      " 20-29:", ((y >= 20) & (y < 30)).sum(), " >=30:", (y >= 30).sum())

print("\n== 2. Baselines (same folds) ==")
for name, m in [("predict mean", DummyRegressor()), ("predict median", DummyRegressor(strategy="median"))]:
    q = cross_val_predict(m, X, y, cv=kf)
    print(f"{name:<16} CV MAE {MAE(y,q):.2f} R2 {r2_score(y,q):.3f}")
q = np.zeros(len(y))
for tr, te in kf.split(X):
    means = y.iloc[tr].groupby(X["Sex_Female"].iloc[tr]).mean()
    q[te] = X["Sex_Female"].iloc[te].map(means).values
print(f"{'sex-group mean':<16} CV MAE {MAE(y,q):.2f} R2 {r2_score(y,q):.3f}")

print("\n== 3. Train vs CV by depth (leaf=8) ==")
for d in [1, 2, 3, 5, 8, None]:
    cv = cross_validate(RF(max_depth=d), X, y, cv=kf, scoring="neg_mean_absolute_error", return_train_score=True)
    print(f"depth {str(d):<5} train MAE {-cv['train_score'].mean():.2f}   CV MAE {-cv['test_score'].mean():.2f}")
cv = cross_validate(RandomForestRegressor(100, random_state=42), X, y, cv=kf,
                    scoring="neg_mean_absolute_error", return_train_score=True)
print(f"unconstrained   train MAE {-cv['train_score'].mean():.2f}   CV MAE {-cv['test_score'].mean():.2f}")

print("\n== 4. Nested CV (tuning inside each outer fold), 5x5 ==")
grid = {"n_estimators": [100], "max_depth": [3, 5, 8, None], "min_samples_leaf": [2, 4, 8, 12]}
res = []
for tr, te in RepeatedKFold(n_splits=5, n_repeats=5, random_state=0).split(X):
    g = GridSearchCV(RandomForestRegressor(random_state=42), grid, cv=KFold(5, shuffle=True, random_state=1),
                     scoring="neg_mean_absolute_error", n_jobs=-1).fit(X.iloc[tr], y.iloc[tr])
    res.append((MAE(y.iloc[te], g.predict(X.iloc[te])), MAE(y.iloc[te], np.full(len(te), y.iloc[tr].mean()))))
res = np.array(res)
print(f"nested RF MAE {res[:,0].mean():.2f} ± {res[:,0].std():.2f} | mean-baseline {res[:,1].mean():.2f} ± {res[:,1].std():.2f}"
      f" | RF better in {(res[:,0] < res[:,1]).sum()}/{len(res)} folds")

print("\n== 5. Seed sensitivity ==")
s = [MAE(y, cross_val_predict(RF(), X, y, cv=KFold(5, shuffle=True, random_state=k))) for k in range(10)]
print("RF CV MAE over 10 shuffles:", " ".join(f"{v:.2f}" for v in s))

print("\n== 6. Learning curve ==")
sizes, tr_s, te_s = learning_curve(RF(), X, y, cv=RepeatedKFold(n_splits=5, n_repeats=3, random_state=0),
                                   train_sizes=[0.3, 0.5, 0.7, 1.0], scoring="neg_mean_absolute_error", n_jobs=-1)
for n, a, b in zip(sizes, -tr_s.mean(1), -te_s.mean(1)):
    print(f"n_train {n:3d}  train MAE {a:.2f}  CV MAE {b:.2f}")

print("\n== 7. Prediction spread & tiers ==")
final = RF().fit(X, y); pin = final.predict(X)
print(f"actual {y.min():.1f}-{y.max():.1f} (sd {y.std():.1f}) | CV preds {p.min():.1f}-{p.max():.1f} (sd {p.std():.1f})"
      f" | in-sample {pin.min():.1f}-{pin.max():.1f} | in-sample MAE {MAE(y,pin):.2f} (nb 4.61)")
tier = lambda v: pd.cut(v, [-1, 12, 20, 30, 999], right=False, labels=["<12", "12-19", "20-29", ">=30"])
print(pd.crosstab(tier(y.values), tier(p), rownames=["actual"], colnames=["CV pred"]).to_string())
print(f"tier exact-match rate: {(tier(y.values) == tier(p)).mean():.0%}")

print("\n== 8. Patterns in the data ==")
d = X_ordinal.assign(VitD=y.values)
print("by sex (0=male):", d.groupby("Sex_Female")["VitD"].agg(["count", "mean"]).round(1).to_dict("index"))
d["AgeBand"] = pd.cut(d.Age, [0, 25, 35, 45, 51.5, 120])
print(d.groupby("AgeBand", observed=True)["VitD"].agg(["count", "mean"]).round(1).to_string())
old = d.Age > 51.5
print("age>51.5:", int(old.sum()), "rows | supplements", round(d.loc[old, "Supplements"].mean(), 2),
      "vs overall", round(d.Supplements.mean(), 2), "| female share", round(d.loc[old, "Sex_Female"].mean(), 2),
      "vs", round(d.Sex_Female.mean(), 2))
print("pregnant:", int(d.Pregnant.sum()), "breastfeeding:", int(d.Breastfeeding.sum()),
      "night shift:", int(d["Night Shift"].sum()), "medical:", int(d.HasMedicalCondition.sum()),
      "supplements:", int(d.Supplements.sum()))
print("skin type counts:", d.SkinType_Fitzpatrick.value_counts().sort_index().to_dict())
print("age", d.Age.min(), "-", d.Age.max(), "| BMI", round(d.BMI.min(), 1), "-", round(d.BMI.max(), 1))
for c in ["Work Environment", "Outdoor Sun Duration", "Rec Freq", "Shade Use", "Clothing", "Egg", "Outdoor Body Part", "Sunscreen"]:
    print(f"  {c:<22}", X_ordinal[c].value_counts().sort_index().to_dict())

print("\n== 9. Missing values imputed (labelled rows) ==")
mis = X_raw_nan.isna().sum(); print(mis[mis > 0].to_string() if (mis > 0).any() else "none")

print("\n== 10. Website replica: ordinal vs remapped encoding ==")
ns = {}; exec(open("website.py").read(), ns)
w_ord = X_ordinal.apply(ns["website_predict"], axis=1); w_map = X.apply(ns["website_predict"], axis=1)
print(f"correct (ordinal) encoding MAE {MAE(y,w_ord):.2f} | as run in notebook (remapped) MAE {MAE(y,w_map):.2f}")

json.dump({"X": X.values.tolist(), "py100": final.predict(X).tolist(),
           "py150": RandomForestRegressor(150, max_depth=4, min_samples_leaf=12, random_state=42).fit(X, y).predict(X).tolist()},
          open("xpred.json", "w"))
