// ─────────────────────────────────────────────
//  ui.js — DOM references, validation popup, progress bar
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
