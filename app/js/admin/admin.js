// ─────────────────────────────────────────────
//  admin.js — Admin page: Google sign-in, research CSV export
// ─────────────────────────────────────────────
//
// Security lives in firestore.rules: research_responses can only be read
// by a Google-signed-in user whose uid has a document in /admins. This page
// only decides what to show; it can't grant access to anything.

// A separate named app, so signing in here never replaces the anonymous
// session the quiz uses in the same browser (which would hide history).
var adminApp  = firebase.initializeApp(firebaseConfig, "admin");
var adminAuth = adminApp.auth();
var adminDb   = adminApp.firestore();

var responses = [];   // [{ id, data }] from the last load

function $(id) { return document.getElementById(id); }

function showView(name) {
  ["viewSignedOut", "viewDenied", "viewAdmin"].forEach(function(v) {
    $(v).classList.toggle("hidden", v !== name);
  });
}

function setMsg(text, kind) {
  $("msg").textContent = text || "";
  $("msg").className = "msg" + (kind ? " " + kind : "");
}

// ── Sign-in ───────────────────────────────────
$("signInBtn").onclick = function() {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  setMsg("");
  adminAuth.signInWithPopup(provider).catch(function(err) {
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
    console.error(err);
    setMsg("Sign-in failed: " + (err.message || err.code), "err");
  });
};

Array.prototype.forEach.call(document.querySelectorAll(".sign-out"), function(btn) {
  btn.onclick = function() { adminAuth.signOut(); };
});

adminAuth.onAuthStateChanged(function(user) {
  responses = [];
  $("downloadBtn").disabled = true;
  if (!user || user.isAnonymous) {
    showView("viewSignedOut");
    return;
  }
  setMsg("Checking access...");
  adminDb.collection("admins").doc(user.uid).get().then(function(doc) {
    if (!doc.exists) {
      $("deniedEmail").textContent = user.email || "(no email)";
      $("deniedUid").textContent   = user.uid;
      showView("viewDenied");
      setMsg("");
      return;
    }
    $("adminEmail").textContent = user.email || user.uid;
    showView("viewAdmin");
    loadResponses();
  }).catch(function(err) {
    console.error(err);
    showView("viewDenied");
    $("deniedEmail").textContent = user.email || "(no email)";
    $("deniedUid").textContent   = user.uid;
    setMsg("Could not check access: " + (err.message || err.code), "err");
  });
});

// ── Load ──────────────────────────────────────
function loadResponses() {
  setMsg("Loading responses...");
  $("downloadBtn").disabled = true;
  adminDb.collection("research_responses").orderBy("createdAt", "asc").get().then(function(snap) {
    responses = snap.docs.map(function(d) { return { id: d.id, data: d.data() }; });
    var dates = responses.map(function(r) { return toDate(r.data.createdAt); }).filter(Boolean);
    $("statCount").textContent = responses.length;
    $("statFirst").textContent = dates.length ? formatDate(dates[0], false) : "–";
    $("statLast").textContent  = dates.length ? formatDate(dates[dates.length - 1], false) : "–";
    $("downloadBtn").disabled = responses.length === 0;
    setMsg(responses.length ? "" : "No responses yet.");
  }).catch(function(err) {
    console.error(err);
    setMsg("Could not load responses: " + (err.message || err.code), "err");
  });
}

$("refreshBtn").onclick = loadResponses;

// ── CSV ───────────────────────────────────────
function toDate(ts) {
  return ts && ts.toDate ? ts.toDate() : null;
}

function pad(n) { return (n < 10 ? "0" : "") + n; }

function formatDate(d, withTime) {
  var s = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  return withTime ? s + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) : s;
}

// Every cell is quoted. Text starting with = + - @ (or tab/CR) is prefixed
// with ' so Excel shows it as text instead of running it as a formula.
function csvCell(value) {
  var s = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

// Indonesian Excel expects a decimal comma.
function formatNumber(n, lang) {
  if (typeof n !== "number" || !isFinite(n)) return "";
  var s = String(Math.round(n * 100) / 100);
  return lang === "id" ? s.replace(".", ",") : s;
}

// Answers are stored as option letters; turn them back into the option
// text of the chosen language (e.g. "B" → "B. Female").
function optionText(q, letter) {
  var opts = q.options || [];
  for (var i = 0; i < opts.length; i++) {
    var v = typeof opts[i] === "string" ? opts[i] : opts[i].value;
    if (v && v.indexOf(letter + ".") === 0) return v;
  }
  return letter;
}

var CSV_LABELS = {
  en: ["No.", "Response ID", "Submitted", "Quiz language", "App version",
       "Risk score (0-100)", "Risk level", "Estimated 25(OH)D (ng/mL)", "BMI"],
  id: ["No.", "ID Respons", "Tanggal Dikirim", "Bahasa Kuis", "Versi Aplikasi",
       "Skor Risiko (0-100)", "Tingkat Risiko", "Perkiraan 25(OH)D (ng/mL)", "IMT"]
};

function buildCsv(lang) {
  var chapters  = lang === "id" ? chaptersID : chaptersEN;
  var questions = [];
  chapters.forEach(function(ch) {
    ch.questions.forEach(function(q) { if (q.key !== "Name") questions.push(q); });
  });

  var header = CSV_LABELS[lang].concat(questions.map(function(q) { return q.key + " — " + q.text; }));
  var rows = [header.map(csvCell).join(";")];

  responses.forEach(function(r, i) {
    var d = r.data, a = d.answers || {};
    var created = toDate(d.createdAt);
    var row = [
      i + 1, r.id, created ? formatDate(created, true) : "", d.lang, d.appVersion,
      formatNumber(d.score, lang), d.riskLevel, formatNumber(d.estimatedNgMl, lang), formatNumber(a.bmi, lang)
    ];
    questions.forEach(function(q) {
      var v = a[q.key];
      if (v === undefined || v === null) row.push("");
      else if (typeof v === "number") row.push(formatNumber(v, lang));
      else if (q.type === "text") row.push(v);
      else row.push(optionText(q, v));
    });
    rows.push(row.map(csvCell).join(";"));
  });

  // BOM so Excel opens it as UTF-8
  return "﻿" + rows.join("\r\n");
}

$("downloadBtn").onclick = function() {
  if (!responses.length) return;
  var lang = $("csvLang").value === "id" ? "id" : "en";
  var blob = new Blob([buildCsv(lang)], { type: "text/csv;charset=utf-8" });
  var url  = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "D-tect_research_" + formatDate(new Date(), false) + ".csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  setMsg("Downloaded " + responses.length + " responses.", "ok");
};
