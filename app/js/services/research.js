// ─────────────────────────────────────────────
//  research.js — Opt-in, anonymous research responses
// ─────────────────────────────────────────────
//
// Saved only when the user ticks the consent box on the result screen and
// presses "Share". Separate from history: no name, no PDF, and no user ID,
// so a response can't be linked back to anyone's history. Only admins can
// read the collection (see firestore.rules and admin.html).

// Bump when questions or scoring change, so responses from different
// versions of the quiz can be told apart in the export.
var RESEARCH_APP_VERSION = "2026-11";

// Answers are stored language-independently: the option letter for
// choice questions, numbers for number questions, and trimmed text for
// the city. Questions hidden by CONDITIONAL_QUESTIONS are left out.
function buildResearchAnswers() {
  var out = {};
  state.allQuestions.forEach(function(q) {
    if (q.key === "Name") return;
    var val = state.answers[q.key];
    if (val === undefined || val === null || val === "") return;

    if (q.type === "number") {
      var n = Number(val);
      if (isFinite(n)) out[q.key] = n;
    } else if (q.type === "text") {
      out[q.key] = String(val).trim().slice(0, 100);
    } else {
      var letter = letterOf(String(val));
      if (letter) out[q.key] = letter;
    }
  });
  var bmi = Number(state.answers.bmi);
  if (isFinite(bmi) && bmi > 0) out.bmi = bmi;
  return out;
}

// Field shapes must match the research_responses create rule in
// firestore.rules, or the write is rejected.
function saveResearchResponse(result) {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database || !window.authReady) return Promise.reject(new Error("Firebase not available"));

  // Signed in (anonymously) only because the rules require it; the uid
  // is deliberately not stored.
  return window.authReady.then(function() {
    return database.collection("research_responses").add({
      consent:       true,
      answers:       buildResearchAnswers(),
      score:         result.score,
      riskLevel:     result.level,
      estimatedNgMl: result.estimatedNgMl,
      lang:          currentLanguage,
      appVersion:    RESEARCH_APP_VERSION,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp()
    });
  });
}
