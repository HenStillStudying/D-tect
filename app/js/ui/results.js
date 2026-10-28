// ─────────────────────────────────────────────
//  results.js — Result screen, recommendations, tips, serum unit toggle
// ─────────────────────────────────────────────

var lastResult = null;

var currentSerumUnit = "ngml"; // "ngml" | "nmol" — which unit the serum estimate is displayed in

function setSerumUnit(unit) {
  if (unit !== "ngml" && unit !== "nmol") return;
  if (unit === currentSerumUnit) return;
  currentSerumUnit = unit;
  if (typeof saveSerumUnitPref === "function") saveSerumUnitPref(unit);
  if (state.uiState === "result") showResult(true);
}

// Inside app/js/ui/results.js
function showResult(skipSave) {
  var result = calculateScore();
  var rl     = getResultLabels();
  lastResult = result;

  state.uiState = "result";
  if (!skipSave) {
    saveProgress();

    var userName = state.answers["Name"] || "Anonymous User";
    
    // UPDATE THIS LINE: Pass result.estimatedNgMl as the 4th argument
    generateAndSaveReport(userName, result.score, result.level, result.estimatedNgMl);
  }

  // ... (rest of your showResult code stays exactly the same)

  dom.quiz.classList.add("hidden");
  dom.quiz.innerHTML          = "";
  dom.navButtons.style.display = "none";
  dom.progressBar.style.width = "100%";
  if (dom.progressText) {
    dom.progressText.textContent = getUI().progressLabel
      .replace("{current}", state.totalQuestions)
      .replace("{total}", state.totalQuestions)
      .replace("{percent}", 100);
  }
  dom.result.classList.remove("show");

  var scoreColor =
    result.score <= 25 ? "#4caf50" :
    result.score <= 50 ? "#fbc02d" :
    result.score <= 74 ? "#fb8c00" : "#f44336";

  var riskHTML = "";
  if (result.riskFactors.length > 0) {
    riskHTML = '<div class="result-card risk-card" style="border-left-color:' + scoreColor + '">' +
      '<div class="result-card-title">' + rl.riskFactorsTitle + '</div>' +
      '<ol class="risk-list">' +
      result.riskFactors.map(function(f) { return '<li>' + f + '</li>'; }).join("") +
      '</ol></div>';
  }

  dom.result.innerHTML =
    '<span class="' + result.level.toLowerCase() + '">' + result.level + ': ' + result.message + '</span>' +

    '<div class="result-card score-card" style="border-left-color:' + scoreColor + '">' +
      '<div class="result-card-title">' + rl.riskScoreTitle + '</div>' +
      '<div class="score-bar-track"><div class="score-bar-fill" style="left:' + result.score + '%;border-color:' + scoreColor + '"></div></div>' +
      '<div class="score-label" style="color:' + scoreColor + '">' + result.scoreLabel + '</div>' +
      '<div class="score-subtext">' + rl.scoreSubtext + '</div>' +
    '</div>' +

    '<div class="result-card serum-card">' +
      '<div class="result-card-title">' + rl.serumTitle + '</div>' +
      '<div class="serum-unit-toggle">' +
        '<button class="' + (currentSerumUnit === "ngml" ? "active" : "") + '" onclick="setSerumUnit(\'ngml\')">ng/mL</button>' +
        '<button class="' + (currentSerumUnit === "nmol" ? "active" : "") + '" onclick="setSerumUnit(\'nmol\')">nmol/L</button>' +
      '</div>' +
      '<div class="serum-value">' + convertSerum(result.estimatedNgMl, currentSerumUnit) + ' <span class="serum-unit">' + serumUnitLabel(currentSerumUnit) + '</span></div>' +
      '<div class="serum-flag">' + result.serumFlag + '</div>' +
      '<div class="serum-disclaimer">' + rl.serumDisclaimer + '</div>' +
    '</div>' +

    riskHTML +

    '<div class="result-actions">' +
      '<button class="secondary-btn" onclick="openHistoryWindow()">📜 ' + getUI().viewHistory + '</button>' +
      '<button class="retry-btn" onclick="showRecommendations()">' + getUI().viewRecommendations + '</button>' +
    '</div>';

  setTimeout(function() { dom.result.classList.add("show"); }, 50);
}

function showRecommendations() {
  if (!lastResult) return;
  var result = lastResult;
  var dose   = getDosageRecommendation(result.estimatedNgMl);
  var ui     = getUI();

  state.uiState = "recommendations";

  // Escaped because tipLocation embeds the user's free-text city.
  var tipsHTML = buildTips(result).map(function(t) { return '<p>• ' + escapeHtml(t) + '</p>'; }).join("");

  dom.result.classList.remove("show");

  dom.result.innerHTML =
    '<div class="result-card recommendation-card">' +
      '<div class="result-card-title">' + ui.recommendationsTitle + '</div>' +
      '<div class="recommendation-tier">' + dose.tier + '</div>' +
      '<p><strong>' + ui.suggestedDosage + '</strong>' + dose.dosage + '</p>' +
      '<p><strong>' + ui.additionalAdvice + '</strong>' + dose.advice + '</p>' +
    '</div>' +

    '<div class="suggestion-box"><h4>' + ui.nextSteps + '</h4>' + tipsHTML + '</div>' +

    '<div class="result-actions">' +
      '<button class="secondary-btn" onclick="showResult(true)">' + ui.backToResults + '</button>' +
      '<button class="retry-btn" onclick="retryQuiz()">' + ui.retake + '</button>' +
      '<button class="download-btn" onclick="downloadResultPDF()">⬇️ ' + ui.downloadPDF + '</button>' +
    '</div>';

  setTimeout(function() { dom.result.classList.add("show"); }, 50);
}

function buildTips(result) {
  var a    = state.answers;
  var t    = getTipLabels();
  var tips = [];

  // ── Base tip by risk level ─────────────────
  if (result.level === "Green")       tips.push(t.tipGreen);
  else if (result.level === "Yellow") tips.push(t.tipYellow);
  else if (result.level === "Orange") tips.push(t.tipOrange);
  else                                tips.push(t.tipRed);

  // ── Sun exposure tips ──────────────────────
  var sunTimeL = letterOf(a.sunTime);
  if (sunTimeL === "A" || sunTimeL === "B")
    tips.push(t.tipSunTime);

  var nightShiftL = letterOf(a.nightShift);
  if (nightShiftL === "A" || nightShiftL === "B")
    tips.push(t.tipNightShift);

  var shadeL = letterOf(a.shadeUse);
  if (shadeL === "A" || shadeL === "B")
    tips.push(t.tipShade);

  var clothingL = letterOf(a.clothing);
  if (clothingL === "A" || clothingL === "B")
    tips.push(t.tipClothing);

  var sunscreenL = letterOf(a.sunscreen);
  if (sunscreenL === "A" || sunscreenL === "B")
    tips.push(t.tipSunscreen);

  // Lunch break opportunity
  var lunchLocL = letterOf(a.lunchLocation);
  if (lunchLocL === "A" || lunchLocL === "B")
    tips.push(t.tipLunch);

  // Recreation
  var recFreqL = letterOf(a.recFreq);
  if (recFreqL === "A" || recFreqL === "B")
    tips.push(t.tipRecreation);

  // ── Diet tips ─────────────────────────────
  var seafoodL = letterOf(a.seafoodFreq);
  if (seafoodL === "A" || seafoodL === "B")
    tips.push(t.tipSeafood);

  var dairyL = letterOf(a.dairyFreq);
  if (dairyL === "A" || dairyL === "B")
    tips.push(t.tipDairy);

  // ── Supplement tip ─────────────────────────
  var suppL = letterOf(a.supplements);
  if (suppL === "C" || suppL === "D")
    tips.push(t.tipSupplements);

  // ── Medical condition tips ─────────────────
  var medL = letterOf(a.medicalCondition);
  if (medL === "D") tips.push(t.tipKidneyLiver);
  if (medL === "A") tips.push(t.tipDiabetes);

  if (letterOf(a.sex) !== "A") {
    var pregL = letterOf(a.pregnant);
    if (pregL === "A") tips.push(t.tipPregnant);

    var bfL = letterOf(a.breastfeeding);
    if (bfL === "A") tips.push(t.tipBreastfeeding);
  }

  // ── Age tip ────────────────────────────────
  if (a.age >= 56) tips.push(t.tipAge);

  // ── Location tip ───────────────────────────
  var city = a.location || "";
  if (city && t.tipLocation)
    tips.push(t.tipLocation.replace("{city}", city));

  return tips;
}
