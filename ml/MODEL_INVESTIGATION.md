# Vitamin D Model Investigation

**Date:** 2026-10-07
**Status:** In progress. This records the findings so far, before any changes to the model.
**Scope:** The Random Forest in `app/js/model/vitd_model.js`, the notebook that trained it (`ml/vitd_model_training.ipynb`), its dataset (`ml/dataset/VITAMIN D DATA FOR FCS - RISIKO.xlsx`), and how the app feeds answers into it.

---

## TL;DR

1. **The model is not overfit. It is limited by weak signal.** Train MAE 4.65 vs CV MAE 5.40. Adding more rows of the same data barely helps (the learning curve is flat).
2. **It is mostly a sex classifier.** Predicting "men = 23.5, women = 16.0" scores MAE 5.52 / R² 0.162. The full forest scores MAE 5.39 / R² 0.159. Remove sex and the model is worse than predicting the average for everyone.
3. **Sex mostly stands in for behaviour, especially hijab.** Men average 23.5 ng/mL, women without hijab 19.8, women with hijab 13.9. The hijab question exists in the survey, but the model never used it.
4. **Predictions are compressed toward the middle.** Actual values range from 8.1 to 55.1, but predictions only from 13.3 to 27.3. The model **never** predicts the "severe" (<12) or "sufficient" (≥30) tier. It gets the right tier 42% of the time.
5. **This affects users directly.** The app chooses the dosage recommendation from the model estimate. The "severe" advice can never appear, and everyone is told they are insufficient or deficient.
6. The notebook's website-formula comparison has a bug (reported 9.11, actually 7.73). The app also encodes 4 inputs differently than the training data.

---

## 1. Method

- Rebuilt the notebook's preprocessing (cells 0–1) locally. See `ml/analysis/prep.py`.
- **The replication is exact:** RF(100 trees, depth 5, leaf 8) gives CV MAE **5.39**, R² **0.159**. Both match the notebook.
- **The shipped model matches the notebook:** `vitd_model.js` gives the same predictions as the cell-4 model to within 3.6×10⁻¹⁵. That's the 100-tree model, **not** the cell-6 "finer grid" model (150 trees, depth 4, leaf 12). The two differ by 5.39 vs 5.33 MAE, which is within seed noise.
- Unless stated otherwise, every metric uses the notebook's own folds: `KFold(5, shuffle=True, random_state=42)`.

---

## 2. Dataset

| Item | Value |
|---|---|
| Survey rows | 1,002 |
| Rows with a lab vitamin D value (used for training) | **111** |
| Features | 20 |
| Target mean / median / SD | 19.85 / 18.6 / 8.52 ng/mL |
| Target range | 8.1 – 55.1 ng/mL |
| Tiers: <12 / 12–19 / 20–29 / ≥30 | 18 / 47 / 32 / 14 |
| Training age range | 22 – 58 (the app accepts 1–120) |
| Training BMI range | 16.3 – 40.0 |

### Data quality issues
- **4 rows have no answers at all, only a vitamin D value** (18.6, 9.0, 22.95, 13.95). They were median-imputed and trained on as if they were average people.
- **Imbalanced groups make some features impossible to learn:**
  - Skin type: I=2, II=20, **III=79**, IV=7, V=2, VI=1. With only 3 people of type V–VI, the model can't learn the effect of dark skin (importance ≈ 0.0006).
  - Pregnant: **1** person. Breastfeeding: 2. Night shift: 17. Supplements: 22.
  - Work environment: 95 indoor vs 12 outdoor.
- **Answers in the wrong columns:**
  - One body-part answer ("c) Wajah, tangan") sits in the outdoor-sun-duration column.
  - One duration answer sits in the recreation-frequency column.
  - "Shade use" has two different "a)" labels.
- Medical conditions include free text (allergy, GERD, gout, vertigo, …). All of it is coded as `HasMedicalCondition = 1`.
- **Question 26 appears twice** in the sheet. The notebook used the second copy (`?.1`). The copies are 99% identical, so this is harmless.
- **Mild leakage:** median imputation happened before the CV split, and hyperparameters were tuned on the same folds used for reporting. Nested CV (§3) shows the effect is small.

---

## 3. Measured performance

### Against baselines (same folds)
| Approach | CV MAE (ng/mL) | R² |
|---|---|---|
| Predict everyone = mean | 6.28 | −0.024 |
| Predict everyone = median | 6.13 | −0.032 |
| **Sex-group mean only** | **5.52** | **0.162** |
| Men / women-no-hijab / women-hijab means | 5.46 | **0.186** |
| Random Forest (notebook, shipped) | 5.39 | 0.159 |
| Random Forest without the sex feature | 6.14 | −0.026 |
| Random Forest + hijab feature | 5.50 | 0.143 |
| Website formula (correctly computed) | 7.73 | — |

### Honest estimate (nested CV, 5×5 repeated, tuning inside each outer fold)
- RF MAE **5.35 ± 1.18** vs mean-baseline **6.27 ± 1.05**.
- The RF beats the baseline in **24 of 25** folds. It's a weak model, but a real one.

### Sensitivity to the random split
The notebook's 5.39 comes from seed 42. Ten other shuffle seeds give:
`5.51 5.53 5.68 5.59 5.24 5.71 5.36 5.62 5.55 5.72` → **range 5.24–5.72**. Seed 42 is on the lucky side.

---

## 4. Over- or underfitting?

### Train vs CV error (100 trees, min_samples_leaf = 8)
| max_depth | Train MAE | CV MAE |
|---|---|---|
| 1 | 5.19 | 5.55 |
| 2 | 4.81 | 5.48 |
| 3 | 4.66 | 5.40 |
| 5 (shipped) | 4.65 | 5.40 |
| 8 | 4.65 | 5.40 |
| None | 4.65 | 5.40 |
| *Unconstrained (leaf = 1)* | *2.19* | *5.89* |

### Learning curve
| Training rows | Train MAE | CV MAE |
|---|---|---|
| 26 | 5.36 | 5.78 |
| 44 | 4.24 | 5.43 |
| 61 | 4.53 | 5.57 |
| 88 | 4.62 | 5.47 |

### Verdict
- **Not overfit.** The train/CV gap is small, and `min_samples_leaf = 8` is what controls complexity. Depth has no effect past 3. Without that limit the forest *would* overfit (2.19 vs 5.89).
- **Limited by signal rather than by data volume.** The CV error is flat as rows are added. The features explain only about 16% of the variance.

---

## 5. Prediction compression (why the app's best and worst cases are close)

| | Min | Max | SD |
|---|---|---|---|
| Actual | 8.1 | 55.1 | 8.5 |
| CV predictions | 13.3 | 27.3 | 4.0 |
| In-sample predictions | 12.5 | 26.4 | — |

### Predicted vs actual tier (CV predictions)
| Actual \ Predicted | <12 | 12–19 | 20–29 | ≥30 |
|---|---|---|---|---|
| <12 | **0** | 16 | 2 | **0** |
| 12–19 | 0 | 25 | 22 | 0 |
| 20–29 | 0 | 10 | 22 | 0 |
| ≥30 | **0** | 3 | 11 | **0** |

The exact-tier match rate is **42%**.

### Effect in the app
- The app's 🌟 best-case and ☠️ worst-case fills give **22 and 18 ng/mL**. The risk score for the same fills is 0 and 100.
- The best case shows "Safe / Healthy" and "Insufficient" on the same screen.
- The worst case uses age 120 and an extreme BMI, both far outside the training range.
- **Dosage recommendations come from this estimate** (`getDosageRecommendation`), so:
  - the "severe" tier (5000 IU/day) can never be shown;
  - all 14 people who were actually ≥30 would be told to supplement.

---

## 6. Why sex dominates

### 6.1 The raw gap
| | n | Mean | Median | <12 | <20 | ≥30 |
|---|---|---|---|---|---|---|
| Men | 57 | 23.5 | 21.7 | 2% | 37% | 21% |
| Women | 54 | 16.0 | 14.4 | 31% | 81% | 4% |

Mann-Whitney p = 5.5×10⁻⁹.

### 6.2 Importance, measured two ways
- **Impurity (the notebook's chart):** sex 0.41, age 0.23, BMI 0.10, clothing 0.08, then everything else under 0.04.
- **Permutation on held-out folds (MAE increase when the feature is shuffled):** sex **+1.32**, age +0.24, BMI +0.12, body part +0.04, clothing +0.03. Everything else is ≈ 0.

### 6.3 Hijab explains most of the gap
Survey question 8 ("if female, do you wear a hijab?") was **not used by the model**.

| Group | n | Mean VitD | Median |
|---|---|---|---|
| Men | 57 | 23.5 | 21.7 |
| Women, no hijab | 19 | 19.8 | 17.7 |
| Women, hijab | 35 | 13.9 | 13.1 |

- **Sex + hijab only (linear):** female −3.71, hijab −5.94.
- **All 20 features + hijab (linear):** female −5.93, hijab −4.01.
- **Caveat:** only 19 women don't wear a hijab, so these effect sizes are rough.

### 6.4 Sex is entangled with other behaviours
| | Women | Men |
|---|---|---|
| Use SPF 30+ sunscreen | 43 / 54 | 10 / 53 |
| Use no sunscreen | 5 | 40 |
| Mostly outdoor work | 1 | 11 |
| Office worker / labourer | 36 / 5 | 18 / 22 |
| Self-reported "white" skin (Q35) | 18 | 2 |
| Mean age | 34.4 | 38.5 |

- **Sunscreen and sex are almost the same variable** in this sample. A tree can't separate them and splits on sex.
- **Occupation tracks sex too:** office workers average 17.7, labourers 23.8.
- **Height correlates +0.36 with vitamin D overall,** but only +0.11 within men and −0.09 within women. Height is a pure proxy for sex.
- Waist circumference (+0.34) and weight (+0.24) correlate as well, probably for the same reason.

### 6.5 The exposure questions don't explain the gap
- With all 19 other features in a linear model, the female coefficient is **−8.35 ng/mL** (bootstrap 95% CI −13.3 to −2.3). The raw gap is −7.56, so controlling for the other features doesn't shrink it.
- **Within-sex signal is weak.** Spearman correlations with |ρ| ≥ 0.2:
  - **Women:** clothing +0.30, egg +0.27, outdoor body part +0.23, supplements +0.23, pregnant +0.22 (n = 1).
  - **Men:** BMI +0.22, skin type +0.21 (the opposite of the biology, probably because darker-skinned men are the outdoor labourers), outdoor body part +0.21.
- Among women, SPF 30+ users average 15.3 and low/no-sunscreen users 18.7.

### 6.6 "Older people have more vitamin D" is a confound
- The first split of tree 0 sends age > 51.5 to 30.2 ng/mL. The age-band means in the data are 17.8 / 17.5 / 21.6 / 20.4 / 27.0.
- Only **11** people are over 51.5, and 73% of them are men (vs 49% overall). Their supplement use (18%) is the same as everyone else's (20%).
- So the age effect is mostly sex again, in a very small group.

### 6.7 Interpretation (not proven)
The gap looks **mostly behavioural or cultural** (hijab, sunscreen, indoor office work), not biological. That fits what is generally known about sun exposure and vitamin D. This data is observational and these behaviours overlap, so the dataset **cannot prove which one causes the gap**.

---

## 7. Bugs found in the notebook

| # | Issue | Effect |
|---|---|---|
| N1 | `website_predict` was re-run (cells 1 and 5) on features **after** they were remapped to real units (e.g. minutes 2.5/10/22.5…). Its checks such as `osd == 0` and `isf == 2` stop matching. | The reported website MAE of **9.11** should be **7.73**. Even corrected, the formula is worse than predicting the mean (6.28). |
| N2 | The shipped `vitd_model.js` is the cell-4 model. Cell 6 exported the "best" 150-tree model, but that file isn't what the app uses. | Negligible (5.39 vs 5.33). Worth tidying up so the notebook matches what ships. |
| N3 | Only the cell-0 single-split (28 rows) website MAE (6.60) was computed correctly. | The notebook's comparison overstates the model's advantage. |
| N4 | Imputation and tuning are not inside the CV loop. | Small optimism, confirmed small by nested CV. |

---

## 8. Mismatches between the app's inputs and the training data

These are in `app/js/core/scoring.js → buildModelFeatures()`.

| Feature | Training encoding | App sends | Problem |
|---|---|---|---|
| Rec Freq | times/week: 0, 1, 2.5, 4.5, 6 | letter index 0–4 | Wrong scale (`letterOfIndexed` instead of `freqPerWeekFromLetter`) |
| Supplements | survey yes/no | "D. I used to, but stopped" → **1** | A former user is counted as a current user |
| Outdoor Body Part | indoor workers answered it (mostly "face + hands" = 2) | indoor workers never see the question → **0** ("not exposed") | Input distribution shift for the majority of users |
| Shade Use | 4 options (0–3), with no "never in shade" | "E. Never in shade" → 4 | Outside the training range (trees treat it like 3) |
| Work Environment | indoor (0) / outdoor (1) only | "B. Mix" → 1 | The survey had no "mixed" option |
| Sunscreen | d) = "other cream / unknown SPF" | D = "Rarely" | Same position, different meaning |
| Age / BMI | 22–58 / 16–40 | 1–120 / any | Extrapolation |
| Hijab | in the survey, not used | not asked | The strongest available signal is missing |

These features have low importance, so they shift predictions only a little, but they are real mismatches.

---

## 9. Related app fixes already made (2026-10-07)

- `vitd_model (1).js` → `vitd_model.js`. Before this, the app **never loaded the model** and silently used the fallback formula `48·e^(−0.028·score)`.
- Since the model now loads, users see the compressed estimates described in §5.

---

## 10. Open questions / next steps

1. **Decide what drives the dosage advice.** Options: the risk score, the model estimate shown as a range, or a combination. An R² of 0.16 doesn't support per-person dosage tiers.
2. **Retrain with a hijab / head-covering feature,** and compare against the 3-group baseline (R² 0.186). Use nested CV and multiple seeds.
3. **Fix the app↔training encoding mismatches in §8.**
4. **Evaluate men and women separately.** The pooled metrics hide the fact that the within-sex signal is weak.
5. **Data collection:** more labelled people with darker skin, older women, pregnant and breastfeeding women, outdoor workers, and women without hijab. Also add a hijab question to the app.
6. **Notebook clean-up:** fix N1, export the model that was actually chosen, and add a baseline (`DummyRegressor`) to every comparison table.

---

## Reproducing

The scripts are in `ml/analysis/`. Run them from that folder:

```bash
python xlsx2csv.py "../dataset/VITAMIN D DATA FOR FCS - RISIKO.xlsx" real.csv
python extract_website.py ../vitd_model_training.ipynb   # pulls website_predict out of the notebook
python analyze.py   # §2–5: replication, baselines, fit, nested CV, learning curve, tiers
python audit.py     # §2, §8: missing rows, duplicate Q26, survey answer options
python sex.py       # §6: sex / hijab analysis
```

Requirements: pandas, numpy, scikit-learn, scipy. No `openpyxl` is needed.

`real.csv` is a full copy of participant health data. **Delete it after use and never commit or deploy it.**
