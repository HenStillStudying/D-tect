# The 107 real participants with the notebook's 20 features (+ Hijab), same
# encoding as experiments.py. Missing values are left as NaN — impute inside
# each training fold, never on the whole dataset.
import pandas as pd
from prep import df, X_raw_nan, y as y_all

_col = lambda prefix: next(c for c in df.columns if c.startswith(prefix))
_real = df.loc[X_raw_nan.index, "Timestamp"].notna()
X = X_raw_nan[_real].copy()
y = y_all[_real].copy()
for c, m in {"Outdoor Sun Duration": {0: 2.5, 1: 10, 2: 22.5, 3: 45, 4: 75},
             "Indoor Sun Freq": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Rec Freq": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Dairy": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6},
             "Seafood": {0: 0, 1: 1, 2: 2.5, 3: 4.5, 4: 6}}.items():
    X[c] = X[c].map(m)
X["Hijab"] = ((df.loc[X.index, _col("8.")].astype(str).str.strip().str.lower() == "ya")
              & (X["Sex_Female"] == 1)).astype(int)

F20 = ["Age", "Sex_Female", "BMI", "SkinType_Fitzpatrick", "Work Environment", "Indoor Sun Freq",
       "Outdoor Sun Duration", "Outdoor Body Part", "Rec Freq", "Shade Use", "Sunscreen", "Clothing",
       "Dairy", "Seafood", "Egg", "Pregnant", "Breastfeeding", "Night Shift", "Supplements", "HasMedicalCondition"]
F21 = F20 + ["Hijab"]
X = X[F21]

BINARY = ["Sex_Female", "Work Environment", "Pregnant", "Breastfeeding", "Night Shift",
          "Supplements", "HasMedicalCondition", "Hijab"]
CONTINUOUS = ["Age", "BMI"]                      # everything else is ordinal (a few allowed values)

# Physiological direction of each feature's effect on vitamin D (+1 raises, -1 lowers, 0 = no
# constraint). Encodings: higher Shade Use = LESS shade, higher Sunscreen = LESS sunscreen,
# higher Clothing = LESS covered, Work Environment 1 = outdoors.
MONOTONE = {"Age": 0, "Sex_Female": 0, "BMI": -1, "SkinType_Fitzpatrick": -1, "Work Environment": 1,
            "Indoor Sun Freq": 1, "Outdoor Sun Duration": 1, "Outdoor Body Part": 1, "Rec Freq": 1,
            "Shade Use": 1, "Sunscreen": 1, "Clothing": 1, "Dairy": 1, "Seafood": 1, "Egg": 1,
            "Pregnant": 0, "Breastfeeding": 0, "Night Shift": -1, "Supplements": 1,
            "HasMedicalCondition": 0, "Hijab": -1}
