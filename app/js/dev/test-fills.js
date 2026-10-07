// ─────────────────────────────────────────────
//  test-fills.js — Random / Best / Worst case fills for testing (skip saving)
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
