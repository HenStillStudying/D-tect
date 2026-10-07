// ─────────────────────────────────────────────
//  persistence.js — Save/restore quiz progress via localStorage
// ─────────────────────────────────────────────

var STORAGE_KEY = "vitd_quiz_progress_v1";

// ── Save current progress ─────────────────────
function saveProgress() {
  try {
    var snapshot = {
      currentChapter:       state.currentChapter,
      currentQuestionIndex: state.currentQuestionIndex,
      answers:              state.answers,
      uiState:              state.uiState,
      language:             currentLanguage,
      savedAt:              Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    // localStorage may be unavailable (private browsing, quota, etc.) — fail silently
    console.warn("Could not save progress:", e);
  }
}

// ── Load saved progress, if any ───────────────
function loadProgress() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (e) {
    return null;
  }
}

// ── Clear saved progress ──────────────────────
function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}

// ── Restore a saved snapshot into live state ──
function restoreProgress(data) {
  state.currentChapter       = data.currentChapter || 0;
  state.currentQuestionIndex = data.currentQuestionIndex || 0;
  state.answers              = data.answers || {};
  state.uiState              = data.uiState || "chapterIntro";

  if (data.language && data.language !== currentLanguage) {
    currentLanguage = data.language;
    chapters = (currentLanguage === "id") ? chaptersID : chaptersEN;
    updateToggleUI();
  }

  // If the saved snapshot points to a question that already has an answer,
  // advance forward to the next unanswered question so "Resume" doesn't
  // land the user back on a question they already completed.
  function isAnswered(chIdx, qIdx) {
    var visible = (typeof getVisibleQuestions === "function") ? getVisibleQuestions(chIdx) : (chapters[chIdx] ? chapters[chIdx].questions : []);
    if (!visible[qIdx]) return false;
    var key = visible[qIdx].key;
    return state.answers && Object.prototype.hasOwnProperty.call(state.answers, key);
  }

  while (state.currentChapter < chapters.length) {
    var ch = chapters[state.currentChapter];
    if (!ch) break;
    var visibleCount = (typeof getVisibleQuestions === "function") ? getVisibleQuestions(state.currentChapter).length : ch.questions.length;
    // If index is past current chapter, move to next chapter
    if (state.currentQuestionIndex >= visibleCount) {
      state.currentChapter++;
      state.currentQuestionIndex = 0;
      continue;
    }
    // If this question is unanswered, stop here
    if (!isAnswered(state.currentChapter, state.currentQuestionIndex)) break;

    // Otherwise advance to next question (or chapter)
    state.currentQuestionIndex++;
    if (state.currentQuestionIndex >= visibleCount) {
      state.currentChapter++;
      state.currentQuestionIndex = 0;
    }
  }

  dom.introSection.style.display = "none";
  dom.quiz.classList.remove("hidden");
  dom.quiz.style.display = "block";
  dom.progressContainer.classList.remove("hidden");
  // Remove any 'hidden' classes (which use !important) so buttons become visible
  dom.progressContainer.classList.remove("hidden");
  dom.navButtons.classList.remove("hidden");
  dom.navButtons.style.display = "flex";
  dom.nextBtn.classList.remove("hidden");
  dom.nextBtn.style.display = "inline-block";
  dom.backBtn.classList.remove("hidden");

  // If we've advanced past all chapters, show result (skip re-saving)
  if (state.currentChapter >= chapters.length) {
    state.uiState = "result";
    showResult(true);
    return;
  }

  if (state.uiState === "result") {
    showResult(true);
  } else if (state.uiState === "chapterIntro") {
    showChapterIntro(state.currentChapter);
  } else {
    // Ensure we are in question mode and render the next unanswered question
    state.uiState = "question";
    showQuestion();
  }
}

// ── "Resume?" prompt shown on page load ───────
function offerResume() {
  var saved = loadProgress();
  if (!saved) return;

  // Don't offer to resume a completed/empty session
  var hasAnswers = saved.answers && Object.keys(saved.answers).length > 0;
  if (!hasAnswers) return;
  if (saved.uiState === "result") return;

  var lang = (saved.language === "id") ? "id" : "en";
  var msg = lang === "id"
    ? "Anda memiliki penilaian yang belum selesai. Lanjutkan dari sebelumnya?"
    : "You have an unfinished assessment. Continue where you left off?";
  var btnResume = lang === "id" ? "Lanjutkan" : "Resume";
  var btnRestart = lang === "id" ? "Mulai Baru" : "Start Over";

  var overlay = document.createElement("div");
  overlay.id = "resumeOverlay";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;" +
    "display:flex;align-items:center;justify-content:center;padding:20px;";

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:14px;padding:26px;max-width:360px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);">' +
      '<p style="margin:0 0 18px;font-size:1.05em;color:#333;">' + msg + '</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
        '<button id="resumeYes" style="padding:10px 18px;background:#ff9800;border:none;border-radius:8px;color:#fff;font-weight:bold;cursor:pointer;">' + btnResume + '</button>' +
        '<button id="resumeNo" style="padding:10px 18px;background:#eee;border:none;border-radius:8px;color:#333;font-weight:bold;cursor:pointer;">' + btnRestart + '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  document.getElementById("resumeYes").onclick = function() {
    overlay.remove();
    restoreProgress(saved);
  };
  document.getElementById("resumeNo").onclick = function() {
    overlay.remove();
    clearProgress();
  };
}

// ── Boot: check for saved progress shortly after page load ──
window.addEventListener("DOMContentLoaded", function() {
  setTimeout(offerResume, 300);
});

// ─────────────────────────────────────────────
//  Day / night theme toggle
// ─────────────────────────────────────────────

var THEME_STORAGE_KEY = "vitd_theme_pref_v1";

function applyTheme(isDark) {
  document.body.classList.toggle("dark-mode", isDark);
  var toggle = document.getElementById("themeToggle");
  if (toggle) toggle.checked = isDark;
}

function saveThemePref(isDark) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch (e) {
    // ignore
  }
}

function loadThemePref() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

window.addEventListener("DOMContentLoaded", function() {
  var saved = loadThemePref();
  var isDark = saved
    ? saved === "dark"
    : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

  applyTheme(isDark);

  var toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("change", function() {
      applyTheme(toggle.checked);
      saveThemePref(toggle.checked);
    });
  }
});

// ─────────────────────────────────────────────
//  Serum estimate unit preference (ng/mL vs nmol/L)
// ─────────────────────────────────────────────

var SERUM_UNIT_STORAGE_KEY = "vitd_serum_unit_pref_v1";

function saveSerumUnitPref(unit) {
  try {
    localStorage.setItem(SERUM_UNIT_STORAGE_KEY, unit);
  } catch (e) {
    // ignore
  }
}

function loadSerumUnitPref() {
  try {
    var saved = localStorage.getItem(SERUM_UNIT_STORAGE_KEY);
    return (saved === "nmol") ? "nmol" : "ngml";
  } catch (e) {
    return "ngml";
  }
}

window.addEventListener("DOMContentLoaded", function() {
  currentSerumUnit = loadSerumUnitPref();
});