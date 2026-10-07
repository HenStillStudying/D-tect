// ─────────────────────────────────────────────
//  state.js — Quiz state, active language data, conditional questions
// ─────────────────────────────────────────────

var chapters = chaptersEN;

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
