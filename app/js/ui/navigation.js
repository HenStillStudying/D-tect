// ─────────────────────────────────────────────
//  navigation.js — Start / Next / Back buttons and quiz flow
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
