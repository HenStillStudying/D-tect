# Vitamin D Model Investigation

**Date:** 2026-10-07 · **Updated:** 2026-10-12
**Status:** In progress. This records the findings so far, before any changes to the model.
**Scope:** The Random Forest in `app/js/model/vitd_model.js`, the notebook that trained it (`ml/vitd_model_training.ipynb`), its dataset (`ml/dataset/VITAMIN D DATA FOR FCS - RISIKO.xlsx`), and how the app feeds answers into it.

---

## The core problem (summary, 2026-10-09)

> **The model is overconfident. It's a weak signal dressed up as a precise measurement.**

It takes 107 people whose questionnaire answers barely predict their vitamin D. From them it learns mostly "are you a man or a woman" plus noise, and then it turns that into a single exact number that the app uses to choose a dosage.

Every major finding below follows from that:

| Symptom | Underneath |
|---|---|
| Loses to "sex only" in 9 of 10 repeats (Step A) | Beyond sex there's almost no signal, so the trees fit noise |
| Can't say "Sufficient" (max 27.9), barely "Severe" (min 12.5) | Averaging small groups squashes everyone toward the middle |
| Its own "best case" includes fully covered dark clothing and SPF 50+ | It learned coincidences in tiny subgroups, not biology |
| Skin type has almost no effect | Only 3 people with skin type V–VI, so it can't learn it |
| Shows e.g. "18 ng/mL" | The honest answer is "roughly 10–26" (80% range): severe to insufficient |

**The algorithm isn't the problem.** Linear models, boosting, forests and simple group averages all score within about 0.3 ng/mL MAE of each other (Step A). Swapping algorithms won't fix it. The limit is the **data**: few people, mostly similar office workers, few at the extremes, and questions that don't capture what drives an individual's vitamin D. Raw row count isn't the main issue (the learning curve is flat). The issues are a lack of variety and weak questions; see "Is it just 'not enough samples'?" (2026-10-12).

**What it can honestly do:** act as a screening nudge, e.g. *"Based on your sex and lifestyle, you're probably below 20 ng/mL. Consider a blood test."* (AUC about 0.73 for "below 20"). A precise number with a dosage attached overstates what it knows.

---

## Update — 2026-10-09: dataset corrections

Building a readable copy of the dataset turned up three things. They **correct** parts of the 2026-10-07 findings below.

1. **The dataset has 107 participants, not 1,002.** Original sheet rows 2–108 are the real survey responses, and **every one of them has a vitamin D lab value**. Rows 118–1003 are empty except for leftover formulas (`TB (m) = 0`, `TB2 = 0`, `BMI`).
2. **The model was trained on 4 fake participants.** Original rows 109–112 contain only a vitamin D value: 18.60, 9, 22.95, 13.95. These are **exactly the median, IQR, Q3 and Q1** of the 107 real values (median 18.60, Q1 13.95, Q3 22.95, IQR 9.00, checked with two quartile methods). Someone typed summary statistics under the data. The notebook read them as people with blank answers, imputed median answers for them, and trained on them. The "4 rows with no answers" in §2 are these rows.
3. **Rows 113–117 are the lab's reference ranges, not data:** Deficiency < 20 · Insufficiency 20–<30 · Sufficiency 30–<100 · Potential toxicity ≥ 100 ng/mL. The notebook dropped them only because they aren't numeric.

### Effect on the headline numbers (same folds, `KFold(5, shuffle=True, random_state=42)`)
| | As trained (111 rows, incl. 4 fake) | Real people only (107) |
|---|---|---|
| Random Forest (shipped settings) | MAE 5.39 · R² 0.159 | MAE **5.72** · R² **0.122** |
| RF, mean over 10 shuffle seeds | 5.55 (5.24–5.72) | 5.56 (5.39–5.78) |
| Predict the mean for everyone | MAE 6.28 | MAE 6.39 |
| **Sex-only (men / women means)** | MAE 5.52 · R² 0.162 | MAE **5.58** · R² **0.177** |
| RF prediction range | 13.3–27.3 | 13.4–27.5 |

**On the real data, the sex-only guess beats the Random Forest.** The fake rows sat close to the middle of the distribution, which made the forest's seed-42 score look better than it is.

### Why the original file looked unreadable
Each survey row is stored as **one comma-separated text cell in column A**. This is consistent with a CSV being opened in Excel with Indonesian regional settings, where the list separator is `;`, then saved as `.xlsx`. A readable copy is at `ml/dataset/VitD_dataset_readable.xlsx` (gitignored). Its sheets are a read-me, a column guide with English names and model usage, and the 107 responses. Build it with `ml/analysis/make_readable.py`.

## Update — 2026-10-09: Step A, candidate model comparison (107 real people)

**Protocol:** 107 real participants. 5-fold CV × 10 repeats (50 outer splits), with the same splits for every model. Median imputation and hyperparameter tuning (5-fold grid search) run **inside** each training fold. The 80% range half-width is the 80th percentile of the chosen model's inner-CV absolute errors. "Beats sex-only" counts the repeats where the model's MAE is lower. Script: `ml/analysis/experiments.py`. Raw output: `ml/analysis/step_a_output.txt`.

Actual tiers: <12: 17 · 12–19: 45 · 20–29: 31 · ≥30: 14.

| Model | MAE | R² | Beats sex-only | MAE women / men | AUC <20 | Sens / spec <20 | Tier acc | Pred range | 80% range: hit / width | App change |
|---|---|---|---|---|---|---|---|---|---|---|
| Ridge, all survey columns | **5.30** ± 0.14 | 0.217 | 9/10 | 4.54 / 6.09 | 0.75 | 67% / 74% | 46% | 10.9–28.5 | 80% / ±8.0 | many new questions |
| **Sex + hijab (3 group means)** | 5.34 ± 0.10 | **0.224** | **10/10** | **4.35** / 6.35 | 0.73 | 58% / 82% | 42% | 13.4–24.9 | 79% / ±7.9 | hijab question |
| Ridge, small set (9 features) * | 5.46 ± 0.13 | 0.223 | 4/10 | 4.69 / 6.24 | 0.75 | 62% / 81% | 42% | 11.5–31.1 | 78% / ±7.8 | hijab question |
| **Sex only** | 5.48 ± 0.08 | 0.187 | — | 4.62 / 6.35 | 0.69 | 71% / 78% | 47% | 15.3–24.9 | 79% / ±7.6 | — |
| RF tuned, all survey columns | 5.50 ± 0.11 | 0.162 | 4/10 | 4.63 / 6.38 | 0.73 | 60% / 80% | 42% | 12.7–27.3 | 78% / ±7.6 | many new questions |
| RF tuned, 20 + hijab | 5.51 ± 0.17 | 0.156 | 4/10 | 4.65 / 6.39 | 0.73 | 60% / 79% | 42% | 12.8–26.8 | 78% / ±7.4 | hijab question |
| RF tuned, 20 | 5.54 ± 0.06 | 0.144 | 3/10 | 4.67 / 6.42 | 0.74 | 70% / 76% | 46% | 13.5–27.7 | 79% / ±7.3 | — |
| **RF, shipped settings (current app)** | 5.55 ± 0.07 | 0.142 | **1/10** | 4.63 / 6.49 | 0.75 | 67% / 78% | 46% | 13.1–27.3 | 80% / ±7.5 | — |
| Gradient boosting, 20 + hijab | 5.62 ± 0.18 | 0.146 | 3/10 | 4.93 / 6.32 | 0.72 | 59% / 79% | 41% | 12.5–30.1 | 78% / ±8.0 | hijab question |
| Ridge, 20 + hijab | 5.63 ± 0.17 | 0.154 | 1/10 | 4.86 / 6.41 | 0.72 | 61% / 77% | 41% | 11.8–31.1 | 80% / ±8.0 | hijab question |
| Predict the mean | 6.40 ± 0.06 | −0.029 | 0/10 | 6.51 / 6.29 | 0.40 | 48% / 37% | 33% | 19.4–20.6 | 81% / ±9.2 | — |

\* The small set (sex, hijab, supplements, clothing, outdoor body part, outdoor sun duration, skin type, BMI, age) was chosen using physiology **plus earlier looks at this same data**, so its score may be slightly optimistic.

### Findings
1. **The shipped Random Forest loses to "sex only" in 9 of 10 repeats.** Its complexity buys nothing on this data.
2. **Sex + hijab (3 group means) is the best practical model.** It beats sex-only in **10/10** repeats, has the best R² (0.224), is the most accurate for women (MAE 4.35), and is just 3 numbers anyone can explain. Caveat: hijab was discovered by exploring this same dataset, so its advantage may be slightly optimistic.
3. **Asking many more questions barely helps.** Ridge on every survey column, including waist and arm measurements the app can't collect, is best by MAE, but only 0.04 better than the 3-group model. That's well within the noise (± 0.10–0.14).
4. **The honest uncertainty is about ±8 ng/mL for every model** (80% ranges, correctly calibrated at 78–81% hit rate). Knowing nothing gives ±9.2. For example, a prediction of 16 really means "roughly 8–24": anywhere from severe to insufficient.
5. **No model can place people in the severe (<12) or sufficient (≥30) tiers** in any meaningful way. Across 107 people, models predict at most about 2 below 12 and about 1 at or above 30 (17 and 14 actually are). Tier accuracy is 41–47% for all of them.
6. **As a screening tool for "below 20 ng/mL", models are moderate** (AUC 0.73–0.75, vs 0.69 for sex only). Sensitivity and specificity are around 60–70% and 75–80%.
7. **Errors are larger for men** (MAE about 6.3 vs about 4.4 for women) because men's values are more spread out (more of them are high).

### Implications (decisions for the project owner)
- If the app keeps a model, **the 3-group model beats the current one** while being far simpler. It needs a hijab / head-covering question in the app.
- **A single ng/mL number overstates precision.** Showing a range (±8) or a screening result ("likely below 20") matches what the data supports.
- **The dosage tier should not be driven by the model estimate** (§5 and findings 4–5).
- **Better data is the lever, not better algorithms.** Every model, from linear to boosting, sits between 5.30 and 5.63.

---

## Update — 2026-10-09: Model Lab findings

**The Model Lab** (`lab/model-lab.html`, developer-only and gitignored, outside `app/` so Firebase Hosting never deploys it) is a sandbox page. You answer the quiz once and see four results side by side, each with its tier and 80% range bar:
1. what the app shows today (the app's own `calculateScore()`),
2. the same Random Forest, unrounded,
3. sex only,
4. sex + hijab (3 groups).

It reuses the app's own question data, `buildModelFeatures`, conditional-question logic and test fills without modifying them. The "current app" number was verified to match the real app's pipeline. Candidate constants come from `ml/analysis/export_candidates.py` (107 real participants; group means only, smallest group 19). Ranges come from Step A.

| Group (107 real) | n | Mean VitD (ng/mL) |
|---|---|---|
| Men | 53 | 24.09 |
| Women | 54 | 15.97 |
| Women, no hijab | 19 | 19.82 |
| Women, hijab | 35 | 13.88 |

### Findings
1. **The 4 summary-statistic rows were all counted as men.** Their sex field was blank, and the notebook encodes "not *wanita*" as male. So the men's average was understated (23.5 with the fake rows vs **24.09** without), and the "57 men" in §6 is really **53**.
2. **The app's ☠️ Worst-case test button is unrealistic.** `worstCaseFill()` answers every question, including ones a real user would never see given their other answers (e.g. outdoor-work questions for a night-shift indoor worker). The app's button scores it **100**. A real person giving the same visible answers would score **82**. The dev buttons overstate the extremes.
3. **"Worst case" isn't the lowest estimate.** For the worst-case answers, the current RF says **17.9 ng/mL**, sex-only 16.0 and the 3-group model **13.9**. The RF's most extreme inputs (age 120, BMI 1200 from height 50 cm / weight 300 kg) are far outside its training data (age 22–58, BMI 16.3–40), so it falls back toward the middle.
4. **For the best case, the gap between the risk score and the estimate is visible directly:** risk score 0 ("Green / Safe") alongside an RF estimate of 22.4 ng/mL ("Insufficient"), with an 80% range of 14.9–29.9 that never reaches "Sufficient".

### Why "best case" can never be "Sufficient" (checked 2026-10-09)
- **The shipped RF cannot output ≥ 30.** Taking the highest leaf of every tree at once gives a ceiling of **29.8 ng/mL** (floor 12.2). A search over real app answers within the training range finds a maximum of **27.9** and a minimum of **12.5**. The "Sufficient" tier is unreachable, and "Severe" almost is.
- **The model's own best case contradicts physiology.** The answers that maximise it include *fully covered dark clothing* and *SPF 50+ always* (male, age 40, BMI 26, skin type V, supplements via multivitamin, mixed work). Its splits on those features come from small groups and confounds, not from real effects.
- **Sufficient is rare in this population:** only 14 of 107 people (13%), mean 20.0, median 18.6. Even men average 24.09. A model that predicts group averages can only say "Sufficient" for a group whose average is ≥ 30, and no such group is large enough in this data.
- **Who the 14 people at ≥ 30 are** (compared with everyone else): 86% men (vs 44%), 43% take vitamin D supplements (vs 17%), 29% work mostly outdoors (vs 9%), 50% labourers (vs 22%), mean age 43 (vs 36). Even the most "best-case-like" group, men with no sunscreen and light clothing (n = 22), averages only 24.5, and just 6 of them are ≥ 30. Men taking supplements (n = 8) average 29.4.
- **So "best case → Insufficient" reflects both the population and the model.** Sufficiency is uncommon here, and the RF's averaging can't reach the extremes. A model that could say "Sufficient" would need more people at high levels (outdoor workers, supplement users) and would still be uncertain by about ±8 ng/mL.

---

## Update — 2026-10-09: Does dataset augmentation help?

**Protocol:** the same 107 people and the same 5-fold × 10-repeat splits as Step A. Synthetic rows (2× the training fold) are generated **only from each training fold**, and every model is **tested only on real people**. Imputation is also done inside each fold. Hyperparameters are fixed, not tuned. Script: `ml/analysis/augment.py`. Raw output: `ml/analysis/augment_output.txt`.

Augmentation methods:
- **Noise copies:** jittered duplicates (age ±2 years, BMI ±1, ordinal answers shift one step with p = 0.15, y ±1).
- **SMOTER:** SMOTE for regression; blends a person with one of their 5 nearest neighbours (features and y).
- **Gaussian copula:** keeps each column's distribution and the rank correlations between columns.

**Monotone** = the model is constrained so that sun exposure, less clothing, less sunscreen, less shade, supplements and diet can only *raise* the prediction, while BMI, skin type, night shift and hijab can only *lower* it.

| Model | MAE | R² | Beats sex-only | AUC <20 | Pred range | Clothing (+) | Sunscreen (+) | Sun duration (+) | Supplements (+) | Skin type (−) | Hijab (−) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sex only | 5.48 ± 0.08 | 0.187 | — | 0.69 | 15.3–24.9 | | | | | | |
| **Sex + hijab (3 groups)** | **5.34** ± 0.10 | **0.224** | **10/10** | 0.73 | 13.4–24.9 | | | | | | −5.9 |
| RF (20), shipped settings | 5.55 ± 0.07 | 0.142 | 1/10 | 0.75 | 13.1–27.3 | +0.4 | −0.7 ✗ | +0.2 | +0.8 | −0.0 ✗ | |
| RF (21) | 5.53 ± 0.12 | 0.150 | 3/10 | 0.73 | 12.8–27.1 | −0.5 ✗ | −0.4 ✗ | +0.2 | +1.9 | −0.1 | −5.6 |
| RF (21) + noise copies | 5.96 ± 0.27 | 0.069 | 0/10 | 0.69 | 10.9–32.8 | −0.1 ✗ | **−3.8 ✗** | +0.8 | +1.8 | +0.2 ✗ | −6.5 |
| RF (21) + SMOTER | 5.70 ± 0.24 | 0.120 | 1/10 | 0.71 | 11.4–31.5 | +0.4 | −0.4 ✗ | +3.1 | +1.1 | +0.5 ✗ | −4.3 |
| RF (21) + copula | 5.61 ± 0.17 | 0.128 | 3/10 | 0.72 | 12.2–30.2 | +0.1 | −0.7 ✗ | +0.8 | +2.8 | −0.2 | −4.8 |
| **RF (21) monotone** | **5.40** ± 0.10 | 0.182 | **8/10** | 0.74 | 12.7–27.0 | +0.2 | +0.0 | +0.3 | +2.0 | −0.1 | −5.8 |
| RF (21) monotone + SMOTER | 5.46 ± 0.22 | 0.175 | 6/10 | 0.74 | 11.6–31.8 | +0.5 | +0.3 | +3.2 | +0.7 | −0.0 | −4.2 |
| GBoost (21) | 6.34 ± 0.25 | −0.047 | 0/10 | 0.68 | 9.9–34.2 | −0.1 ✗ | −2.8 ✗ | +2.2 | +3.2 | −0.0 | −4.1 |
| GBoost (21) + SMOTER | 6.09 ± 0.37 | −0.016 | 0/10 | 0.69 | 11.1–37.0 | +0.3 | −1.4 ✗ | +3.2 | +2.0 | +0.7 ✗ | −3.0 |
| GBoost (21) monotone | 5.96 ± 0.18 | 0.051 | 0/10 | 0.70 | 9.6–35.2 | +0.7 | +0.2 | +2.5 | +4.4 | −0.1 | −3.5 |

The direction columns show the average change in prediction (ng/mL) when that feature goes from its lowest to its highest value, with every other answer kept as each real person gave it. The expected sign is in brackets. ✗ = wrong direction. Values within ±0.05 count as "no effect".

**The trap, measured.** Running SMOTER on **all 107 people first** and then cross-validating gives **MAE 3.68 and R² 0.452**. The honest version of the same method gives MAE 5.70 and R² 0.120. The leaky setup makes augmentation look like it **triples R²**, when it actually makes the model worse. The cause is that synthetic near-copies of each test person sit in the training set.

### Findings
1. **Every synthetic augmentation made the Random Forest worse** (MAE 5.53 → 5.61–5.96, R² 0.150 → 0.069–0.128). None beats the 3-group model, and most lose to sex-only.
2. **Augmentation widens the prediction range** (up to about 31–33, so it can now say "Sufficient"), but its errors went *up*. The wider range is the model fitting the generated rows more closely, not getting more accurate.
3. **Augmentation can amplify nonsense.** With noise copies, "more sunscreen lowers vitamin D" becomes the *opposite* in a big way (−3.8 ng/mL, i.e. SPF 50+ looks protective), and SMOTER flips skin type to the wrong direction. The generators copied the dataset's coincidences and the model trusted them more.
4. **Monotonic constraints are the one thing that helped.** "RF monotone" improves on the plain RF (5.53 → 5.40), beats sex-only in 8/10 repeats, and has **no wrong-direction effects**. Sunscreen and skin type show about zero effect, which is the honest answer given this data. It still doesn't beat the 3-group model (5.34, 10/10), but it's the best *full-questionnaire* model so far and the most defensible.
5. **Gradient boosting with these fixed settings overfits badly** (R² below 0). Monotone constraints improve it but don't rescue it. It wasn't tuned here, so treat these rows as indicative only.

### Conclusion
Synthetic augmentation **doesn't add information**. With 107 people and weak signal it hurts, and done the common (leaky) way it produces impressive-looking but fake results. **Adding knowledge (monotonic constraints) helps where adding fake rows doesn't.** The real fix is still more real participants, targeted at the gaps.

**Caveats:** hyperparameters are fixed, not tuned. Augmentation settings (2×, k = 5, noise levels) are fixed. Deep generators (CTGAN, VAEs) weren't tried; they typically need far more than 107 rows to learn anything beyond what the copula already captures.

### Still to do
- §3–§6 below were measured on the 111 rows. **They need re-running on the 107 real people.** The conclusions (weak signal, sex/hijab dominance, compressed predictions) are not expected to change, but the exact numbers will.
- `ml/analysis/prep.py` replicates the notebook as it was, including the fake rows. Future experiments should keep only rows that have a `Timestamp`.

---

## Update — 2026-10-12: Is it just "not enough samples"?

**Short answer: only partly.** The problem is low variance in the features plus weak signal, not the raw row count. Collecting more participants like the current ones would barely help.

### Why the row count isn't the bottleneck
- **The learning curve is flat (§4):** CV MAE is 5.78 at 26 rows, 5.43 at 44, 5.57 at 61 and 5.47 at 88. Doubling the data from 44 to 88 rows changed nothing. If the model were data-starved, the error would keep falling.
- **The model isn't overfit (§4):** train MAE is 4.65 vs CV MAE 5.40. It has already extracted almost everything these questions contain. The answers explain only about 16% of the variance in vitamin D.
- **Fake rows made it worse:** synthetic augmentation increased the error for every method tried (see the augmentation update above).
- *Caveat:* the learning curve was measured on the 111 rows (including the 4 summary-statistic rows). It should be re-run on the 107 real people. A flat curve isn't expected to change.

### Where sample variance *is* the problem
Some features barely vary, so their effect can't be learned at any model complexity (§2):

| Feature | Distribution (107 people) |
|---|---|
| Skin type | III = 79, V–VI = only 3 |
| Pregnant / breastfeeding | 1 / 2 |
| Work environment | 95 indoor vs 12 outdoor |
| Supplements | 22 users |
| Vitamin D ≥ 30 (Sufficient) | only 14 |

Data would help here, but only **targeted** data: darker skin types, outdoor workers, supplement users and people with sufficient levels. More indoor office workers with skin type III add almost nothing.

### Causes that more rows of this survey can't fix
- **A noisy target:** one blood test reflects the season, recent sun exposure and lab variation. A questionnaire sees none of this.
- **Coarse self-reports:** e.g. "outdoors 15–30 min" covers a wide range of real exposure, and people misremember.
- **Missing drivers:** genetics, absorption, the supplement dose in IU, the month the blood was drawn, and actual time in the sun.
- **Entangled answers:** sex, hijab and clothing overlap almost completely (§6), so the model can't separate their effects. "Sex" absorbs the credit.

### Implications
1. **Collecting more of the same is low value.** It won't lift the ~16% ceiling.
2. **New data should be targeted and ask better questions:**
   - fill in the under-represented groups
   - add the supplement dose (IU/day), the blood-test date or month, and sun time in minutes rather than bands
   - this needs ethics approval for new participants
3. **The fix available today is presentation, not data:**
   - ship a simple, physiologically sensible model (3-group means or the monotone RF)
   - show a range or a screening result ("likely below 20 ng/mL — consider a blood test") instead of a single number
   - don't base per-person dosage on the estimate
4. **Expectations:** even with good data, questionnaire-based vitamin D prediction has a low ceiling. Published models of this kind are commonly cited at roughly R² 0.2–0.4. *This figure is from general knowledge and wasn't checked against sources in this investigation.* The app should present itself as a risk screener, not a measurement.

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
| Survey rows | ~~1,002~~ **107 real responses** (see 2026-10-09 update) |
| Rows with a lab vitamin D value (used for training) | **111** = 107 real + 4 summary-statistic rows |
| Features | 20 |
| Target mean / median / SD | 19.85 / 18.6 / 8.52 ng/mL |
| Target range | 8.1 – 55.1 ng/mL |
| Tiers: <12 / 12–19 / 20–29 / ≥30 | 18 / 47 / 32 / 14 |
| Training age range | 22 – 58 (the app accepts 1–120) |
| Training BMI range | 16.3 – 40.0 |

### Data quality issues
- **4 rows have no answers at all, only a vitamin D value** (18.6, 9.0, 22.95, 13.95). They were median-imputed and trained on as if they were average people. **Update 2026-10-09:** these are the median, IQR, Q3 and Q1 of the real data, not people.
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
| N5 | *(2026-10-09)* No filter for real responses. The 4 summary-statistic rows under the data (median, IQR, Q3, Q1) were trained on as participants. | RF CV R² 0.159 → **0.122** once removed. Sex-only (0.177) beats it. |

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
6. **Notebook clean-up:** fix N1 and N5, export the model that was actually chosen, and add a baseline (`DummyRegressor`) to every comparison table.
7. *(2026-10-09)* **Re-run §3–§6 on the 107 real people**, and use only those rows for all future experiments.

---

## Reproducing

The scripts are in `ml/analysis/`. Run them from that folder:

```bash
python xlsx2csv.py "../dataset/VITAMIN D DATA FOR FCS - RISIKO.xlsx" real.csv
python extract_website.py ../vitd_model_training.ipynb   # pulls website_predict out of the notebook
python analyze.py   # §2–5: replication, baselines, fit, nested CV, learning curve, tiers
python audit.py     # §2, §8: missing rows, duplicate Q26, survey answer options
python sex.py       # §6: sex / hijab analysis
python make_readable.py real.csv "../dataset/VitD_dataset_readable.xlsx"   # readable Excel copy (gitignored)
python experiments.py        # Step A model comparison (~10+ min; output in step_a_output.txt)
python export_candidates.py  # group means used by lab/model-lab.html
python augment.py            # augmentation + monotonic-constraint experiment (~3 min; output in augment_output.txt)
```

Requirements: pandas, numpy, scikit-learn, scipy. No `openpyxl` is needed.

`real.csv` is a full copy of participant health data. **Delete it after use and never commit or deploy it.**
