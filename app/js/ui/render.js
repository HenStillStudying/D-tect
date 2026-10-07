// ─────────────────────────────────────────────
//  render.js — Chapter intros, questions, and input widgets
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
