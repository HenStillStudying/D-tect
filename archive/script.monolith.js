// ─────────────────────────────────────────────
//  active language data pointer
//  (chaptersEN / chaptersID come from data.en.js / data.id.js)
// ─────────────────────────────────────────────
var lastResult = null;
var chapters = chaptersEN;
var USER_ID_STORAGE_KEY = "vitd_anonymous_user_id_v1";
var currentSerumUnit = "ngml"; // "ngml" | "nmol" — which unit the serum estimate is displayed in

// How long a saved history entry stays visible/kept before it's treated
// as expired and cleaned up. 30 days.
var HISTORY_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// 1 ng/mL of 25(OH)D = 2.496 nmol/L (standard clinical conversion factor)
var NGML_TO_NMOL = 2.496;

function convertSerum(ngml, unit) {
  return unit === "nmol" ? Math.round(ngml * NGML_TO_NMOL) : ngml;
}

function serumUnitLabel(unit) {
  return unit === "nmol" ? "nmol/L" : "ng/mL";
}

function setSerumUnit(unit) {
  if (unit !== "ngml" && unit !== "nmol") return;
  if (unit === currentSerumUnit) return;
  currentSerumUnit = unit;
  if (typeof saveSerumUnitPref === "function") saveSerumUnitPref(unit);
  if (state.uiState === "result") showResult(true);
}

// Escapes user-supplied text (name, city, Firestore fields) before it goes
// into innerHTML, so input like "<img onerror=...>" renders as plain text.
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getUserId() {
  try {
    var id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (id) return id;
    id = generateUUID();
    localStorage.setItem(USER_ID_STORAGE_KEY, id);
    return id;
  } catch (e) {
    console.warn("Unable to read/write user UUID:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
//  Conditional questions
//  Some questions only make sense given an earlier answer. Returning
//  false hides the question entirely — skipped in both directions
//  (Next / Back) and excluded from the progress bar / total count.
// ─────────────────────────────────────────────

var CONDITIONAL_QUESTIONS = {
  pregnant:           function(a) { return letterOf(a.sex) !== "A"; }, // hidden if sex = Male

  breastfeeding:      function(a) { return letterOf(a.sex) !== "A"; }, // hidden if sex = Male

  // "When working outdoors..." questions don't apply to fixed night-shift
  // workers, people who don't work at all, or people who work mostly indoors.
  sunTime:            function(a) { return letterOf(a.nightShift) !== "A"; },
  outdoorSunTime:     function(a) {
    return letterOf(a.nightShift) !== "A" && letterOf(a.nightShift) !== "D" && letterOf(a.workType) !== "C";
  },
  outdoorSunBodyPart: function(a) {
    return letterOf(a.nightShift) !== "A" && letterOf(a.nightShift) !== "D" && letterOf(a.workType) !== "C";
  },

  // "How long do you work per day?" doesn't apply to people who don't work.
  worktime:           function(a) { return letterOf(a.nightShift) !== "D"; },

  // Can't meaningfully ask when/where a lunch break happens if there isn't one.
  lunchTime:          function(a) { return letterOf(a.lunchDuration) !== "D"; },
  lunchLocation:      function(a) { return letterOf(a.lunchDuration) !== "D"; }
};

function shouldShowQuestion(q, answers) {
  var check = CONDITIONAL_QUESTIONS[q.key];
  return check ? check(answers) : true;
}

// The list of questions actually shown for a given chapter, given the
// user's current answers. Everywhere the quiz used to index/count
// ch.questions directly, it now goes through this instead, so hidden
// questions never appear and never affect indices, counts, or progress.
function getVisibleQuestions(chapterIndex) {
  var ch = chapters[chapterIndex];
  if (!ch) return [];
  return ch.questions.filter(function(q) { return shouldShowQuestion(q, state.answers); });
}

// ─────────────────────────────────────────────
//  state.js
// ─────────────────────────────────────────────

var state = {
  currentChapter:       0,
  currentQuestionIndex: 0,
  answers:              {},
  uiState:              "chapterIntro",

  get allQuestions() {
    var all = [];
    for (var i = 0; i < chapters.length; i++) all = all.concat(getVisibleQuestions(i));
    return all;
  },
  get totalQuestions() { return this.allQuestions.length; },

  reset: function() {
    this.currentChapter       = 0;
    this.currentQuestionIndex = 0;
    this.answers              = {};
    this.uiState              = "chapterIntro";
  }
};

// ─────────────────────────────────────────────
//  ui.js
// ─────────────────────────────────────────────

var dom = {
  quiz:              document.getElementById("quiz"),
  startBtn:          document.getElementById("startBtn"),
  historyBtn:        document.getElementById("historyBtn"),
  nextBtn:           document.getElementById("nextBtn"),
  backBtn:           document.getElementById("backBtn"),
  navButtons:        document.getElementById("navButtons"),
  result:            document.getElementById("result"),
  progressBar:       document.getElementById("progressBar"),
  progressText:      document.getElementById("progressText"),
  progressContainer: document.getElementById("progressContainer"),
  introSection:      document.getElementById("introSection"),
  popup:             document.getElementById("quizPopup"),
  popupMessage:      document.getElementById("popupMessage"),
  popupClose:        document.getElementById("popupClose"),
};

function showPopup(message) {
  var existing = document.getElementById("validationMsg");
  if (existing) existing.remove();

  var msg = document.createElement("p");
  msg.id = "validationMsg";
  msg.textContent = "⚠️ " + message;
  msg.style.cssText = "color:#e65100;background:#fff3e0;border:1px solid #ff9800;border-radius:6px;padding:10px;margin:10px 0;font-size:0.9em;text-align:center;";

  dom.navButtons.insertAdjacentElement("afterend", msg);
  setTimeout(function() { if (msg.parentNode) msg.remove(); }, 3000);
}

document.getElementById("popupClose").onclick = function() {
  document.getElementById("quizPopup").classList.add("hidden");
};

function openHistoryWindow() {
  var overlay = document.getElementById("historyOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "historyOverlay";
    overlay.className = "history-overlay hidden";
    overlay.innerHTML =
      '<div class="history-window">' +
        '<div class="history-header">' +
          '<h3 id="historyTitle"></h3>' +
          '<button id="closeHistoryBtn" class="secondary-btn"></button>' +
        '</div>' +
        '<div id="historyContent" class="history-content"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector("#closeHistoryBtn").onclick = closeHistoryWindow;
    overlay.onclick = function(event) {
      if (event.target === overlay) closeHistoryWindow();
    };
  }

  // Set every open, since the language may have changed since it was built
  var ui = getUI();
  overlay.querySelector("#historyTitle").textContent    = ui.historyTitle;
  overlay.querySelector("#closeHistoryBtn").textContent = ui.historyClose;

  overlay.classList.remove("hidden");
  var content = overlay.querySelector("#historyContent");
  if (content) {
    content.innerHTML = '<p>' + ui.historyLoading + '</p>';
  }

  fetchUserHistory().then(function(entries) {
    if (!content) return;
    if (!entries || entries.length === 0) {
      content.innerHTML = '<p>' + getUI().historyEmpty + '</p>';
      return;
    }
    content.innerHTML = entries.map(formatHistoryItem).join("");
    content.onclick = function(event) {
      var btn = event.target.closest("[data-history-index]");
      if (!btn) return;
      var data = entries[parseInt(btn.getAttribute("data-history-index"), 10)].data || {};
      if (!isPdfDataUri(data.pdfData)) return;
      var safeName = String(data.userName || "Anonymous").replace(/[^\w\-]+/g, "_");
      downloadPdfFromBase64(data.pdfData, "VitaminD_Report_" + safeName + ".pdf");
    };
  }).catch(function(err) {
    console.error("Failed to load history entries:", err);
    if (content) content.innerHTML = '<p>' + getUI().historyError + '</p>';
  });
}

// Reads from the "quiz_history" collection — the same collection
// generateAndSaveReport() writes to, keyed by the cookie-based user ID
// from getOrCreateUserCookie(). (window.firestoreDb is used if your
// firebase.js sets it; otherwise falls back to the plain `db` global.)
// ─────────────────────────────────────────────
//  Replace your existing fetchUserHistory()
//  in script.js with this version.
// ─────────────────────────────────────────────

function fetchUserHistory() {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database) return Promise.resolve([]);

  var userId = getOrCreateUserCookie();
  if (!userId) return Promise.resolve([]);

  return database.collection("quiz_history")
    .where("userId", "==", userId)
    .get()
    .then(function(querySnapshot) {
      var entries = querySnapshot.docs.map(function(doc) {
        return { id: doc.id, data: doc.data() };
      });

      // Auto-delete expired entries from Firestore in the background
      deleteExpiredEntries(entries);

      // Filter out expired entries for display
      var now = Date.now();
      return entries.filter(function(entry) {
        var data    = entry.data || {};
        var savedAt = data.createdAt && data.createdAt.toDate
          ? data.createdAt.toDate()
          : null;
        if (!savedAt) return false; // no timestamp = hide it
        return (now - savedAt.getTime()) <= HISTORY_EXPIRY_MS;
      });
    })
    .catch(function(error) {
      console.warn("Could not fetch user history:", error);
      return [];
    });
}

function closeHistoryWindow() {
  var overlay = document.getElementById("historyOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

// Removes expired history entries from Firestore in the background.
// Fire-and-forget: failures are logged but don't block the History view.
function deleteExpiredEntries(entries) {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database || !entries || entries.length === 0) return;

  var now = Date.now();
  entries.forEach(function(entry) {
    var data    = entry.data || {};
    var savedAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;
    if (!savedAt) return;
    if ((now - savedAt.getTime()) > HISTORY_EXPIRY_MS) {
      database.collection("quiz_history").doc(entry.id).delete().catch(function(err) {
        console.warn("Failed to delete expired history entry:", entry.id, err);
      });
    }
  });
}

function updateProgress() {
  var completed = 0;
  for (var i = 0; i < state.currentChapter; i++) {
    completed += getVisibleQuestions(i).length;
  }
  var answered = completed + state.currentQuestionIndex;
  var percent  = (answered / state.totalQuestions) * 100;
  dom.progressBar.style.width = percent + "%";

  if (dom.progressText) {
    var current = Math.min(answered + 1, state.totalQuestions);
    var ui = getUI();
    dom.progressText.textContent = ui.progressLabel
      .replace("{current}", current)
      .replace("{total}", state.totalQuestions)
      .replace("{percent}", Math.round(percent));
  }
}

// ─────────────────────────────────────────────
//  render.js
// ─────────────────────────────────────────────

function showChapterIntro(chapterIndex) {
  var ch      = chapters[chapterIndex];
  var visible = getVisibleQuestions(chapterIndex);
  dom.quiz.classList.remove("show");

  setTimeout(function() {
    dom.quiz.innerHTML =
      '<div class="chapter-intro">' +
        '<div class="chapter-badge">' + getUI().chapterBadge.replace("{n}", chapterIndex + 1).replace("{total}", chapters.length) + '</div>' +
        '<h2 class="chapter-title">' + ch.title + '</h2>' +
        '<p class="chapter-subtitle">' + ch.subtitle + '</p>' +
        '<p class="chapter-count">' + getUI().chapterCount.replace("{count}", visible.length) + '</p>' +
      '</div>';
    dom.quiz.classList.add("show");
    dom.nextBtn.textContent = getUI().startChapter;
    dom.backBtn.classList.add("hidden");
  }, 200);

  updateProgress();
}

function showQuestion() {
  var ch      = chapters[state.currentChapter];
  var visible = getVisibleQuestions(state.currentChapter);
  var q       = visible[state.currentQuestionIndex];

  dom.quiz.classList.remove("show");

  setTimeout(function() {
    dom.quiz.innerHTML =
      '<div class="chapter-label">' + ch.title + ' · Q' + (state.currentQuestionIndex + 1) + ' of ' + visible.length + '</div>' +
      '<h3>' + q.text + '</h3>' +
      buildInputHTML(q) +
      '<div class="info-box">' +
        '<div class="info-header">' + getUI().learnMore + '</div>' +
        '<div class="info-content">' + q.info + '</div>' +
      '</div>';

    dom.quiz.classList.add("show");
    dom.nextBtn.textContent = getUI().next;

    attachInputListeners(q);
    attachInfoBoxListener();
    prefillSavedAnswer(q);

    // Back button: hidden only on the very first question of the very first chapter
    var isVeryFirstQuestion = (state.currentChapter === 0 && state.currentQuestionIndex === 0);
    dom.backBtn.classList.toggle("hidden", isVeryFirstQuestion);
  }, 200);

  updateProgress();
}

// ── Prefill a question's input with a previously saved answer ──
function prefillSavedAnswer(q) {
  var saved = state.answers[q.key];
  if (saved === undefined) return;

  if (q.type === "choice" || q.type === "skintone") {
    var selector = q.type === "skintone" ? ".skintone-card" : ".option-column";
    document.querySelectorAll(selector).forEach(function(card) {
      var input = card.querySelector("input");
      if (input.value === saved) {
        input.checked = true;
        card.classList.add("selected");
      }
    });
  } else if (q.type === "slider") {
    var idx = state.answers[q.key + "_idx"];
    if (idx !== undefined) {
      var slider = document.getElementById("slider");
      var sliderValue = document.getElementById("sliderValue");
      slider.value = idx;
      sliderValue.textContent = q.options[idx];
    }
  } else if (q.type === "number") {
    var numEl = document.getElementById("numberInput");
    if (numEl) numEl.value = saved;
  } else if (q.type === "text") {
    var textEl = document.getElementById("textInput");
    if (textEl) textEl.value = saved;
  }
}

function buildInputHTML(q) {
  switch (q.type) {
    case "choice":   return buildChoiceHTML(q);
    case "skintone": return buildSkinToneHTML(q);
    case "slider":   return buildSliderHTML(q);
    case "number":   return buildNumberHTML(q);
    case "text":     return buildTextHTML(q);
    default:         return "";
  }
}

function buildChoiceHTML(q) {
  return q.options.map(function(opt) {
    return '<label class="option-column">' +
      '<input type="radio" name="answer" value="' + opt + '" style="display:none;">' +
      opt +
      '</label>';
  }).join("");
}

function buildSkinToneHTML(q) {
  var cards = q.options.map(function(opt) {
    return '<label class="skintone-card">' +
      '<input type="radio" name="answer" value="' + opt.value + '" style="display:none;">' +
      '<div class="skintone-swatch" style="background:' + opt.color + ';"></div>' +
      '<div class="skintone-label">' + opt.label + '</div>' +
      '<div class="skintone-desc">' + opt.desc + '</div>' +
      '</label>';
  }).join("");
  return '<div class="skintone-grid">' + cards + '</div>';
}

function buildSliderHTML(q) {
  var defaultIndex = 1;
  var labels = q.options.map(function(opt) { return '<span>' + opt + '</span>'; }).join('');
  return '<div class="slider-container">' +
    '<input type="range" id="slider" min="0" max="' + (q.options.length - 1) + '" value="' + defaultIndex + '" step="1">' +
    '<div class="slider-labels">' + labels + '</div>' +
    '<div id="sliderValue" class="slider-value-box">' + q.options[defaultIndex] + '</div>' +
    '</div>';
}

function buildNumberHTML(q) {
  return '<div class="text-input-wrapper">' +
    '<input type="number" id="numberInput" class="text-input" placeholder="' + q.placeholder + '" min="' + (q.min || 0) + '" max="' + (q.max || 9999) + '">' +
    '<span class="input-unit">' + (q.unit || "") + '</span>' +
    '</div>';
}

function buildTextHTML(q) {
  return '<div class="text-input-wrapper">' +
    '<input type="text" id="textInput" class="text-input" placeholder="' + q.placeholder + '" autocomplete="off">' +
    '</div>';
}

function attachInputListeners(q) {
  if (q.type === "choice") {
    document.querySelectorAll(".option-column").forEach(function(card) {
      card.onclick = function() {
        document.querySelectorAll(".option-column").forEach(function(c) { c.classList.remove("selected"); });
        card.classList.add("selected");
        card.querySelector("input").checked = true;
      };
    });
  }

  if (q.type === "skintone") {
    document.querySelectorAll(".skintone-card").forEach(function(card) {
      card.onclick = function() {
        document.querySelectorAll(".skintone-card").forEach(function(c) { c.classList.remove("selected"); });
        card.classList.add("selected");
        card.querySelector("input").checked = true;
      };
    });
  }

  if (q.type === "slider") {
    var slider      = document.getElementById("slider");
    var sliderValue = document.getElementById("sliderValue");

    function updateSliderText() {
      sliderValue.textContent = q.options[parseInt(slider.value)];
      sliderValue.style.background = "#ffcc80";
      setTimeout(function() { sliderValue.style.background = "#ffe0b2"; }, 300);
    }
    updateSliderText();
    slider.addEventListener("input", updateSliderText);
  }
}

function attachInfoBoxListener() {
  var infoBox    = document.querySelector(".info-box");
  var infoHeader = infoBox.querySelector(".info-header");
  infoBox.onclick = function() {
    infoBox.classList.toggle("open");
    infoHeader.textContent = infoBox.classList.contains("open") ? getUI().learnHide : getUI().learnMore;
  };
}

// ─────────────────────────────────────────────
//  scoring.js
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

// ─────────────────────────────────────────────
//  REPLACEMENT calculateScore() function
//  Paste this over your existing calculateScore()
//  in script.js. MAX_RAW is set at the bottom of this function.
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
//  results.js
// ─────────────────────────────────────────────

function showResult(skipSave) {
  var result = calculateScore();
  var rl     = getResultLabels();
  lastResult = result;

  state.uiState = "result";
  if (!skipSave) {
    saveProgress();

    var userName = state.answers["Name"] || "Anonymous User";
    generateAndSaveReport(userName, result.score, result.level);
  }

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

// ─────────────────────────────────────────────
//  REPLACEMENT buildTips() function
//  Paste this over your existing buildTips()
//  in script.js.
// ─────────────────────────────────────────────

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
// wherever the quiz finishes

// call it like:


// ─────────────────────────────────────────────
//  navigation.js
// ─────────────────────────────────────────────

dom.startBtn.onclick = function() {
  dom.introSection.style.display = "none";
  dom.quiz.classList.remove("hidden");
  dom.quiz.style.display = "block";
  dom.nextBtn.classList.remove("hidden");
  dom.navButtons.classList.remove("hidden");
  dom.progressContainer.classList.remove("hidden");
  state.reset();
  clearProgress();
  showChapterIntro(0);
};

dom.nextBtn.onclick = function() {
  if (state.uiState === "chapterIntro") {
    state.uiState = "question";
    showQuestion();
    return;
  }

  var answer = collectAnswer();
  if (answer === null) return;

  var visible = getVisibleQuestions(state.currentChapter);
  var q       = visible[state.currentQuestionIndex];
  state.answers[q.key] = answer;

  // Auto-compute BMI the moment both height and weight are known, so it's
  // available for scoring/reporting/model input without asking the user
  // to do the math themselves (and matches how BMI was computed in the
  // training data this app's model was calibrated against).
  if (q.key === "heightCm" || q.key === "weightKg") {
    computeBmiIfPossible();
  }

  saveProgress();
  advanceQuiz();
};

function computeBmiIfPossible() {
  var h = state.answers.heightCm, w = state.answers.weightKg;
  if (h && w) {
    var heightM = h / 100;
    state.answers.bmi = Math.round((w / (heightM * heightM)) * 10) / 10;
  }
}

dom.historyBtn && (dom.historyBtn.onclick = openHistoryWindow);

function collectAnswer() {
  var visible = getVisibleQuestions(state.currentChapter);
  var q       = visible[state.currentQuestionIndex];

  if (q.type === "choice" || q.type === "skintone") {
    var selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) { showPopup(getUI().pleaseSelect); return null; }
    return selected.value;
  }
  if (q.type === "slider") {
    var slider = document.getElementById("slider");
    var idx    = parseInt(slider.value);
    state.answers[q.key + "_idx"] = idx;   // language-independent index for scoring
    return q.options[idx];
  }
  if (q.type === "number") {
    var el = document.getElementById("numberInput");
    if (!el || el.value.trim() === "") { showPopup(getUI().pleaseEnter); return null; }
    var num = parseFloat(el.value);
    if (isNaN(num)) { showPopup(getUI().pleaseEnter); return null; }
    var min = (q.min !== undefined) ? q.min : 0;
    var max = (q.max !== undefined) ? q.max : 9999;
    if (num < min || num > max) { showPopup(getUI().pleaseEnter); return null; }
    return num;
  }
  if (q.type === "text") {
    var el2 = document.getElementById("textInput");
    if (!el2 || el2.value.trim() === "") { showPopup(getUI().pleaseEnter); return null; }
    return el2.value.trim();
  }
  return null;
}

function advanceQuiz() {
  var visible = getVisibleQuestions(state.currentChapter);
  state.currentQuestionIndex++;

  if (state.currentQuestionIndex < visible.length) {
    showQuestion();
    return;
  }

  state.currentChapter++;
  state.currentQuestionIndex = 0;

  if (state.currentChapter >= chapters.length) {
    showResult();
    return;
  }

  state.uiState = "chapterIntro";
  showChapterIntro(state.currentChapter);
  saveProgress();
}

// ── Go back to the previous question ──────────
function goBack() {
  if (state.currentChapter === 0 && state.currentQuestionIndex === 0) return;

  if (state.currentQuestionIndex > 0) {
    state.currentQuestionIndex--;
  } else {
    state.currentChapter--;
    state.currentQuestionIndex = getVisibleQuestions(state.currentChapter).length - 1;
  }

  state.uiState = "question";
  showQuestion();
  saveProgress();
}

dom.backBtn.onclick = goBack;

function retryQuiz() {
  state.reset();
  clearProgress();
  dom.quiz.classList.remove("hidden");
  dom.result.innerHTML        = "";
  dom.navButtons.style.display = "flex";
  dom.nextBtn.style.display   = "inline-block";
  dom.nextBtn.textContent     = getUI().startChapter;
  dom.backBtn.classList.add("hidden");
  dom.progressBar.style.width = "0%";
  showChapterIntro(0);
}

// ─────────────────────────────────────────────
//  RANDOM FILL — paste into script.js
//  Adds a "🎲 Random Fill" button to the start
//  screen that fills all answers randomly and
//  jumps straight to the result screen.
// ─────────────────────────────────────────────

// ── Random answer generator ───────────────────

function randomFillAnswers() {
  var filled = {};

  // Iterate all chapters and questions
  var allChapters = (currentLanguage === "id") ? chaptersID : chaptersEN;

  allChapters.forEach(function(ch) {
    ch.questions.forEach(function(q) {

      if (q.type === "choice") {
        // Pick a random option
        var pick = q.options[Math.floor(Math.random() * q.options.length)];
        filled[q.key] = pick;

      } else if (q.type === "skintone") {
        // Pick a random skintone option (options are objects with .value)
        var pick = q.options[Math.floor(Math.random() * q.options.length)];
        filled[q.key] = pick.value;

      } else if (q.type === "slider") {
        // Pick a random slider label
        var pick = q.options[Math.floor(Math.random() * q.options.length)];
        filled[q.key] = pick;

      } else if (q.type === "number") {
        // Random number between min and max
        var min = q.min !== undefined ? q.min : 0;
        var max = q.max !== undefined ? q.max : 100;
        filled[q.key] = Math.floor(Math.random() * (max - min + 1)) + min;

      } else if (q.type === "text") {
        // Use placeholder or a generic value
        filled[q.key] = q.placeholder ? q.placeholder.replace("e.g. ", "") : "Test";
      }
    });
  });

  return filled;
}

function randomFill() {
  state.answers = randomFillAnswers();
  computeBmiIfPossible();

  dom.introSection.style.display = "none";
  dom.quiz.classList.remove("hidden");
  dom.quiz.style.display = "block";
  dom.navButtons.classList.remove("hidden");
  dom.progressContainer.classList.remove("hidden");

  var allChapters = (currentLanguage === "id") ? chaptersID : chaptersEN;
  state.currentChapter       = allChapters.length;
  state.currentQuestionIndex = 0;
  state.uiState              = "result";

  showResult(true); // true = skipSave so it doesn't write test data to Firebase
}

function worstCaseFill() {
  var filled = {};

  // Maps each question key to the index of its WORST answer for vitamin D
  var worstIndex = {
    // Chapter 1
    sex:                 1,  // B. Female (higher risk)
    skinTone:            5,  // F. Type VI
    workType:            2,  // C. Mostly indoors
    location:            0,  // text — doesn't matter
    Name:                0,  // text — doesn't matter

    // Chapter 2
    nightShift:          0,  // A. Fixed night shift
    worktime:            3,  // D. 11 hours or more
    indoorSunFreq:       0,  // A. Never
    sunTime:             0,  // A. Never / less than 5 min
    outdoorSunTime:      0,  // A. Never / before 7am
    outdoorSunBodyPart:  0,  // A. None
    recFreq:             0,  // A. Never
    shadeUse:            0,  // A. Always in the shade
    sunscreen:           0,  // A. Always SPF 50+
    clothing:            0,  // A. Fully covered dark
    lunchDuration:       3,  // D. No regular lunch break
    lunchTime:           3,  // D. No fixed time
    lunchLocation:       0,  // A. Fully indoors
    supplements:         2,  // C. No

    // Chapter 3
    dairyFreq:           0,  // A. Never
    seafoodFreq:         0,  // A. Never
    eggFreq:             0,  // A. Never
    medicalCondition:    3,  // D. Kidney or liver disease
    pregnant:            0,  // A. Yes
    breastfeeding:       0,  // A. Yes
  };

  var allChapters = (currentLanguage === "id") ? chaptersID : chaptersEN;

  allChapters.forEach(function(ch) {
    ch.questions.forEach(function(q) {
      var idx = worstIndex[q.key];

      if (q.key === "age") {
        filled[q.key] = q.max;               // oldest = highest risk, not q.min

      } else if (q.key === "heightCm") {
        filled[q.key] = q.min;                // shortest + heaviest = worst BMI

      } else if (q.key === "weightKg") {
        filled[q.key] = q.max;

      } else if (q.type === "choice") {
        filled[q.key] = q.options[idx !== undefined ? idx : 0];

      } else if (q.type === "skintone") {
        filled[q.key] = q.options[idx !== undefined ? idx : q.options.length - 1].value;

      } else if (q.type === "slider") {
        filled[q.key] = q.options[0]; // "Never" is always worst for sliders

      } else if (q.type === "number") {
        filled[q.key] = q.min !== undefined ? q.min : 0;

      } else if (q.type === "text") {
        filled[q.key] = q.placeholder ? q.placeholder.replace("e.g. ", "") : "Test";
      }
    });
  });

  return filled;
}
function worstCaseRun() {
  state.answers = worstCaseFill();
  computeBmiIfPossible();

  dom.introSection.style.display = "none";
  dom.quiz.classList.remove("hidden");
  dom.quiz.style.display = "block";
  dom.navButtons.classList.remove("hidden");
  dom.progressContainer.classList.remove("hidden");

  var allChapters = (currentLanguage === "id") ? chaptersID : chaptersEN;
  state.currentChapter       = allChapters.length;
  state.currentQuestionIndex = 0;
  state.uiState              = "result";

  showResult(true);
}

function bestCaseFill() {
  var filled = {};

  // Maps each question key to the index of its BEST answer for vitamin D
  // (mirror of worstIndex above — lowest-risk option per question).
  var bestIndex = {
    // Chapter 1
    sex:                 0,  // A. Male
    skinTone:            0,  // A. Type I
    workType:            0,  // A. Mostly outdoors
    location:            0,  // text — doesn't matter
    Name:                0,  // text — doesn't matter

    // Chapter 2
    nightShift:          2,  // C. No, standard daytime hours
    worktime:            0,  // A. Less than 3 hours
    indoorSunFreq:       4,  // E. More than 5 times a week
    sunTime:             4,  // E. More than 1 hour
    outdoorSunTime:      3,  // D. 11am – 1pm (peak UV window)
    outdoorSunBodyPart:  4,  // E. Face, arms, and legs
    recFreq:             4,  // E. More than 5 times a week
    shadeUse:            4,  // E. Never — stays in direct sunlight
    sunscreen:           4,  // E. Never
    clothing:            4,  // E. Short sleeves / shorts
    lunchDuration:       2,  // C. More than 60 minutes
    lunchTime:           1,  // B. 11am – 1pm
    lunchLocation:       3,  // D. Outdoors in direct sunlight
    supplements:         0,  // A. Yes — vitamin D supplement specifically

    // Chapter 3
    dairyFreq:           4,  // E. More than 5 times a week
    seafoodFreq:         4,  // E. More than 5 times a week
    eggFreq:             4,  // E. More than 5 times a week
    medicalCondition:    4,  // E. None of the above
    pregnant:            1,  // B. No
    breastfeeding:       1,  // B. No
  };

  var allChapters = (currentLanguage === "id") ? chaptersID : chaptersEN;

  allChapters.forEach(function(ch) {
    ch.questions.forEach(function(q) {
      var idx = bestIndex[q.key];

      if (q.key === "age") {
        filled[q.key] = 25;                   // squarely in the 18–35 lowest-risk band

      } else if (q.key === "heightCm") {
        filled[q.key] = 170;                   // paired with weightKg below for BMI ≈ 21.6 (normal)

      } else if (q.key === "weightKg") {
        filled[q.key] = 62;

      } else if (q.type === "choice") {
        filled[q.key] = q.options[idx !== undefined ? idx : q.options.length - 1];

      } else if (q.type === "skintone") {
        filled[q.key] = q.options[idx !== undefined ? idx : 0].value;

      } else if (q.type === "slider") {
        filled[q.key] = q.options[q.options.length - 1]; // most-frequent option is always best for sliders

      } else if (q.type === "number") {
        filled[q.key] = q.max !== undefined ? q.max : 100;

      } else if (q.type === "text") {
        filled[q.key] = q.placeholder ? q.placeholder.replace("e.g. ", "") : "Test";
      }
    });
  });

  return filled;
}

function bestCaseRun() {
  state.answers = bestCaseFill();
  computeBmiIfPossible();

  dom.introSection.style.display = "none";
  dom.quiz.classList.remove("hidden");
  dom.quiz.style.display = "block";
  dom.navButtons.classList.remove("hidden");
  dom.progressContainer.classList.remove("hidden");

  var allChapters = (currentLanguage === "id") ? chaptersID : chaptersEN;
  state.currentChapter       = allChapters.length;
  state.currentQuestionIndex = 0;
  state.uiState              = "result";

  showResult(true);
}

function getOrCreateUserCookie() {
  let cookieName = "vitamin_user_id=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  
  // Check if cookie already exists
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cookieName) == 0) {
      return c.substring(cookieName.length, c.length);
    }
  }
  
  // If not, generate a random unique ID
  let newUserId = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Save it for 1 year
  let d = new Date();
  d.setTime(d.getTime() + (365*24*60*60*1000));
  document.cookie = cookieName + newUserId + ";" + "expires=" + d.toUTCString() + ";path=/";
  
  return newUserId;
}

async function saveUserReportToFirestore(userName, base64PdfString) {
  try {
    // 1. Get the random cookie ID
    const userId = getOrCreateUserCookie();

    // 2. Save it to Firestore using the cookie ID as the document ID
    await db.collection("quiz_history").doc(userId).set({
      userName: userName,       // Column 2: Name from the data
      pdfData: base64PdfString, // Column 3: The Base64 string
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("History saved successfully for ID:", userId);
  } catch (error) {
    console.error("Error saving history:", error);
  }
}
async function generateAndSaveReport(userName, userScore, riskLevel) {
  try {
    // Uses the SAME PDF builder as the "Download Result as PDF" button
    // on the result screen (defined in pdf-export.js), so the copy
    // saved to history is identical to what the user can download
    // directly — same header, sections, colors, and content.
    var built = (typeof buildResultPDF === "function") ? buildResultPDF() : null;
    if (!built) {
      console.warn("PDF library not ready yet — skipping history save for this attempt.");
      return;
    }

    var base64PdfString = built.doc.output("datauristring");
    var userId = getOrCreateUserCookie();

    // Use .add() instead of .doc(userId).set() so every completed
    // attempt creates a new history entry rather than overwriting.
    var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
    if (!database) {
      console.warn("Firestore not available — skipping history save.");
      return;
    }

    await database.collection("quiz_history").add({
      userId: userId,           // cookie ID, used to filter "my" history
      userName: userName,
      riskLevel: riskLevel,
      score: userScore,
      pdfData: base64PdfString,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("New quiz attempt added to history successfully!");
  } catch (error) {
    console.error("Error saving report:", error);
  }
}

function downloadPdfFromBase64(base64String, filename = "Vitamin_D_Report.pdf") {
  // 1. Create a temporary hidden anchor tag in the document
  var link = document.createElement('a');
  link.href = base64String;
  link.download = filename;
  
  // 2. Append it to the body, click it programmatically, then remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Only data URIs that are actually PDFs are offered for download — the
// field comes from Firestore, so it isn't trusted to be what we wrote.
function isPdfDataUri(str) {
  return typeof str === "string" && str.indexOf("data:application/pdf") === 0;
}

function formatHistoryItem(entry, index) {
  var data = entry.data || {};
  var ui   = getUI();

  var savedAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date();
  var dateLabel = savedAt.toLocaleString();
  var nameLabel = data.userName || "Anonymous";
  var levelLabel = data.riskLevel || "-";

  // The PDF itself is NOT embedded in the markup; the button carries only
  // the entry index and the click handler in openHistoryWindow() looks it up.
  return '<div class="history-entry" style="padding: 15px; border-bottom: 1px solid #ddd; margin-bottom: 10px;">' +
    '<div class="history-entry-meta"><strong>' + ui.historyName + '</strong> ' + escapeHtml(nameLabel) + '</div>' +
    '<div class="history-entry-level"><strong>' + ui.historyRiskLevel + '</strong> ' + escapeHtml(levelLabel) + '</div>' +
    '<div class="history-entry-detail"><strong>' + ui.historyDate + '</strong> ' + escapeHtml(dateLabel) + '</div>' +
    (isPdfDataUri(data.pdfData) ? '<button class="download-btn" data-history-index="' + index + '" style="margin-top: 10px; padding: 5px 10px;">📥 ' + ui.historyDownload + '</button>' : '') +
  '</div>';
}