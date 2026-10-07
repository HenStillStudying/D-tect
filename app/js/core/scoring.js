// ─────────────────────────────────────────────
//  scoring.js — Risk score, model features, serum estimate, dosage tier
// ─────────────────────────────────────────────

// Helper: get the leading letter of an answer, e.g. "D. Cold / northern..." -> "D"
function letterOf(str) {
  if (!str) return "";
  var m = str.match(/^([A-F])\./);
  return m ? m[1] : "";
}

// Builds the feature vector for the trained Random Forest model (vitd_model.js),
// in the EXACT order printed by `feature_order` when the model was exported from
// Colab. If you retrain and the column order changes, this array must be updated
// to match — a silent mismatch produces a plausible-looking but wrong prediction.
function letterOfIndexed(str) {  // 'A'->0, 'B'->1, ...
  var l = letterOf(str);
  return l ? l.charCodeAt(0) - 65 : 0;
}

function freqPerWeekFromLetter(str) {
  var map = { A: 0, B: 1, C: 2.5, D: 4.5, E: 6 };
  return map[letterOf(str)] !== undefined ? map[letterOf(str)] : 0;
}

function durationMinutesFromLetter(str) {
  var map = { A: 2.5, B: 10, C: 22.5, D: 45, E: 75 };
  return map[letterOf(str)] !== undefined ? map[letterOf(str)] : 0;
}

function skinTypeAsNumber(str) {
  var l = letterOf(str);
  return l ? (l.charCodeAt(0) - 65 + 1) : 3; // A=1 ... F=6, default to 3 if unanswered
}

// Feature order below is verified against the Colab-printed `feature_order`:
// ['Age', 'Sex_Female', 'BMI', 'SkinType_Fitzpatrick', 'Work Environment',
//  'Indoor Sun Freq', 'Outdoor Sun Duration', 'Outdoor Body Part', 'Rec Freq',
//  'Shade Use', 'Sunscreen', 'Clothing', 'Dairy', 'Seafood', 'Egg', 'Pregnant',
//  'Breastfeeding', 'Night Shift', 'Supplements', 'HasMedicalCondition']
// If you retrain and this list changes, this array must be re-verified against it.
function buildModelFeatures(a) {
  return [
    a.age,                                              // Age
    letterOf(a.sex) === "B" ? 1 : 0,                     // Sex_Female
    a.bmi,                                               // BMI
    skinTypeAsNumber(a.skinTone),                        // SkinType_Fitzpatrick (1–6)
    (letterOf(a.workType) === "C" || letterOf(a.nightShift) === "A" || letterOf(a.nightShift) === "B") ? 0 : 1, // Work Environment: indoors OR any night-shift schedule maps to 'indoor' (0) — this is the only feature channel that night-shift risk reaches the model through, since the model's trees never use the separate Night Shift feature
    freqPerWeekFromLetter(a.indoorSunFreq),              // Indoor Sun Freq
    durationMinutesFromLetter(a.sunTime),                // Outdoor Sun Duration
    letterOfIndexed(a.outdoorSunBodyPart),               // Outdoor Body Part
    letterOfIndexed(a.recFreq),                          // Rec Freq
    letterOfIndexed(a.shadeUse),                         // Shade Use
    letterOfIndexed(a.sunscreen),                        // Sunscreen
    letterOfIndexed(a.clothing),                         // Clothing
    freqPerWeekFromLetter(a.dairyFreq),                  // Dairy
    freqPerWeekFromLetter(a.seafoodFreq),                // Seafood
    letterOfIndexed(a.eggFreq),                          // Egg
    letterOf(a.pregnant) === "A" ? 1 : 0,                // Pregnant
    letterOf(a.breastfeeding) === "A" ? 1 : 0,           // Breastfeeding
    (letterOf(a.nightShift) === "A" || letterOf(a.nightShift) === "B") ? 1 : 0, // Night Shift
    letterOf(a.supplements) === "C" ? 0 : 1,             // Supplements (rough approx — survey was binary yes/no)
    letterOf(a.medicalCondition) === "E" ? 0 : 1         // HasMedicalCondition
  ];
}

// Helper: find a question definition by its key across all chapters
// in the currently active language data.
function findQuestionByKey(key) {
  for (var i = 0; i < chapters.length; i++) {
    var qs = chapters[i].questions;
    for (var j = 0; j < qs.length; j++) {
      if (qs[j].key === key) return qs[j];
    }
  }
  return null;
}

function calculateScore() {
  var a           = state.answers;
  var raw         = 0;
  var riskFactors = [];
  var t           = getRiskLabels();

  // ── Chapter 1: Personal Profile ──────────────

  var age = a.age;
  if (age >= 56)      { raw += 3; riskFactors.push(t.age56); }
  else if (age >= 36)   raw += 1;
  else if (age < 18)     raw += 1;

  var skinL = letterOf(a.skinTone);
  if (skinL === "F")      { raw += 3; riskFactors.push(t.skinVeryDark); }
  else if (skinL === "E") { raw += 2; riskFactors.push(t.skinDark); }
  else if (skinL === "D")   raw += 1;

  var workL = letterOf(a.workType);
  if (workL === "C")      { raw += 2; riskFactors.push(t.indoorWork); }
  else if (workL === "B")   raw += 1;

  var bmi = a.bmi;
  if (bmi >= 30)             { raw += 3; riskFactors.push(t.obesity); }
  else if (bmi >= 25)        { raw += 2; riskFactors.push(t.overweight); }

  // ── Chapter 2: Sun Exposure & Lifestyle ──────

  // Night shift
  var nightShiftL = letterOf(a.nightShift);
  if (nightShiftL === "A")      { raw += 3; riskFactors.push(t.nightShiftFixed); }
  else if (nightShiftL === "B")   raw += 2;

  // Work hours per day
  var worktimeL = letterOf(a.worktime);
  if (worktimeL === "D")        raw += 2;
  else if (worktimeL === "C")   raw += 1;

  // Indoor sun frequency
  var indoorSunFreqL = letterOf(a.indoorSunFreq);
  if (indoorSunFreqL === "A")        { raw += 3; riskFactors.push(t.noIndoorSun); }
  else if (indoorSunFreqL === "B")     raw += 2;
  else if (indoorSunFreqL === "C")     raw += 1;

  // Outdoor sun time per day
  var sunTimeL = letterOf(a.sunTime);
  if (sunTimeL === "A")      { raw += 3; riskFactors.push(t.lowSun); }
  else if (sunTimeL === "B")   raw += 2;
  else if (sunTimeL === "C")   raw += 1;

  // Outdoor work sun time of day
  var outdoorSunTimeL = letterOf(a.outdoorSunTime);
  if (outdoorSunTimeL === "A")       { raw += 2; }  // no exposure / before 7am
  else if (outdoorSunTimeL === "B")    raw += 1;    // 7–9am (low UV)

  // Outdoor body parts exposed
  var outdoorBodyL = letterOf(a.outdoorSunBodyPart);
  if (outdoorBodyL === "A")          { raw += 2; riskFactors.push(t.noOutdoorExposure); }
  else if (outdoorBodyL === "B")       raw += 1;

  // Recreational outdoor frequency
  var recFreqL = letterOf(a.recFreq);
  if (recFreqL === "A")              { raw += 2; riskFactors.push(t.noRecreation); }
  else if (recFreqL === "B")           raw += 1;

  // Shade use outdoors
  var shadeL = letterOf(a.shadeUse);
  if (shadeL === "A")      { raw += 3; riskFactors.push(t.alwaysShade); }
  else if (shadeL === "B")   raw += 2;
  else if (shadeL === "C")   raw += 1;

  // Sunscreen SPF
  var sunscreenL = letterOf(a.sunscreen);
  if (sunscreenL === "A")      { raw += 3; riskFactors.push(t.sunscreenHigh); }
  else if (sunscreenL === "B") { raw += 2; riskFactors.push(t.sunscreenAlways); }
  else if (sunscreenL === "C")   raw += 1;

  // Clothing coverage
  var clothingL = letterOf(a.clothing);
  if (clothingL === "A")      { raw += 3; riskFactors.push(t.fullCoverage); }
  else if (clothingL === "B")   raw += 2;
  else if (clothingL === "C")   raw += 1;

  // Lunch duration
  var lunchDurL = letterOf(a.lunchDuration);
  if (lunchDurL === "D")        { raw += 2; riskFactors.push(t.noLunchBreak); }
  else if (lunchDurL === "A")     raw += 1;

  // Lunch time of day (B = 11am–1pm is best, penalise others)
  var lunchTimeL = letterOf(a.lunchTime);
  if (lunchTimeL === "A")        raw += 1;   // before 11am
  else if (lunchTimeL === "D")   raw += 1;   // no fixed time

  // Lunch location
  var lunchLocL = letterOf(a.lunchLocation);
  if (lunchLocL === "A")      { raw += 2; riskFactors.push(t.indoorLunch); }
  else if (lunchLocL === "B")   raw += 1;

  // Supplements
  var suppL = letterOf(a.supplements);
  if (suppL === "C")      { raw += 2; riskFactors.push(t.noSupplements); }
  else if (suppL === "D")   raw += 1;

  // ── Chapter 3: Diet & Health Signs ───────────

  // Dairy frequency (protective — inverse scoring)
  var dairyL = letterOf(a.dairyFreq);
  if (dairyL === "A")        { raw += 2; riskFactors.push(t.noDairy); }
  else if (dairyL === "B")     raw += 1;

  // Seafood frequency (protective — inverse scoring)
  var seafoodL = letterOf(a.seafoodFreq);
  if (seafoodL === "A")      { raw += 3; riskFactors.push(t.noSeafood); }
  else if (seafoodL === "B")   raw += 2;
  else if (seafoodL === "C")   raw += 1;

  // Egg frequency
  var eggL = letterOf(a.eggFreq);
  if (eggL === "A")          { raw += 1; }
  else if (eggL === "B")       raw += 1;

  // Medical conditions
  var medL = letterOf(a.medicalCondition);
  if (medL === "D")      { raw += 3; riskFactors.push(t.kidneyLiver); }
  else if (medL === "A") { raw += 2; riskFactors.push(t.diabetes); }
  else if (medL === "B")   raw += 1;
  else if (medL === "C")   raw += 1;

  // Pregnancy / breastfeeding — only relevant if the user didn't select Male
  if (letterOf(a.sex) !== "A") {
    var pregL = letterOf(a.pregnant);
    if (pregL === "A")     { raw += 2; riskFactors.push(t.pregnant); }

    // Breastfeeding
    var bfL = letterOf(a.breastfeeding);
    if (bfL === "A")       { raw += 1; riskFactors.push(t.breastfeeding); }
  }

  // ── Normalise to 0–100 ────────────────────────
  // MAX_RAW recalculated after removing: climate, indoorSunDuration,
  // indoorSunTime, indoorSunBodyPart, recSunTime, diet, all 6 symptom
  // questions (fatigue, bonePain, immunity, mood, muscleWeakness,
  // hairSkin), and meatFreq/fatFreq. Was 90, minus 33 points of
  // removed scoring range = 57. Minus 1 more after removing workType's
  // "D. Night shift" option (max dropped from +3 to +2, now that night
  // shift risk is scored solely via the dedicated nightShift question) = 56.
  var MAX_RAW = 56;
  var score   = Math.min(100, Math.max(0, Math.round((raw / MAX_RAW) * 100)));

  var rl = getResultLabels();

  var scoreLabel, level, message;
  if (score <= 25)      { scoreLabel = rl.lowRisk;      level = "Green";  message = rl.msgSafe; }
  else if (score <= 50) { scoreLabel = rl.mediumRisk;   level = "Yellow"; message = rl.msgMild; }
  else if (score <= 74) { scoreLabel = rl.highRisk;     level = "Orange"; message = rl.msgLow;  }
  else                  { scoreLabel = rl.veryHighRisk; level = "Red";    message = rl.msgHigh; }

  // Serum estimate: prefer the trained Random Forest model (vitd_model.js,
  // cross-validated MAE ≈ 5.4 ng/mL) over the old hand-calibrated exponential
  // formula (MAE ≈ 9.1 ng/mL against the same 111-respondent validation set).
  // Falls back to the exponential formula only if the model script didn't load,
  // so a missing/broken vitd_model.js never breaks the results screen outright.
  var estimatedNgMl;
  var usedModel = false;
  if (typeof predictVitaminD === "function") {
    try {
      var features = buildModelFeatures(a);
      var modelResult = predictVitaminD(features);
      if (typeof modelResult === "number" && !isNaN(modelResult)) {
        estimatedNgMl = Math.round(Math.max(0, modelResult));
        usedModel = true;
      }
    } catch (e) {
      console.warn("Model prediction failed, falling back to formula:", e);
    }
  }
  if (!usedModel) {
    // score 0→48, 25→24, 50→12, 75→6 ng/mL (recalibrated against N=31 real labs)
    estimatedNgMl = Math.round(48 * Math.exp(-0.028 * score));
  }

  var serumFlag;
  if (estimatedNgMl >= 30)      serumFlag = rl.serumSufficient;
  else if (estimatedNgMl >= 20) serumFlag = rl.serumInsufficient;
  else if (estimatedNgMl >= 12) serumFlag = rl.serumDeficient;
  else                          serumFlag = rl.serumSevere;

  return {
    level: level, message: message, score: score, scoreLabel: scoreLabel,
    estimatedNgMl: estimatedNgMl, serumFlag: serumFlag,
    riskFactors: riskFactors.slice(0, 5)
  };
}

// Maps estimated 25(OH)D level (ng/mL) to a risk tier + dosage anjuran.
// Thresholds match calculateScore(): >=30 sufficient · 20-29 insufficient
// · 12-19 deficient · <12 severe.
function getDosageRecommendation(ngml) {
  var d = getDosageLabels();
  if (ngml < 12) return d.severe;
  if (ngml < 20) return d.deficient;
  if (ngml < 30) return d.insufficient;
  return d.sufficient;
}
