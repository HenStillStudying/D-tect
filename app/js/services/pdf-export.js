// ─────────────────────────────────────────────
//  pdf-export.js — Generate and download result PDF
//  Uses jsPDF (loaded via CDN in index.html)
// ─────────────────────────────────────────────

// jsPDF's built-in fonts only support a Latin-1 style character set —
// emoji AND math symbols like ≥ / ≤ / × render as broken/missing glyphs.
// Strip emoji and swap unsupported symbols for plain ASCII equivalents.
function stripEmoji(str) {
  if (!str) return "";
  return str
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|\uFE0F/gu, "")
    .trim();
}

function sanitizeText(str) {
  if (!str) return "";
  return stripEmoji(str)
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

// Some i18n labels (e.g. the serum disclaimer) contain inline HTML like
// <strong> for the web UI. Strip tags and decode the entities used, so
// the PDF gets clean plain text instead of literal markup.
function stripHtmlForPdf(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Builds the full result PDF and returns { doc, filename } WITHOUT
// triggering a download or save — shared by downloadResultPDF() (the
// button on the result screen) and generateAndSaveReport() (used when
// saving a copy into Firestore for the History feature), so both
// produce byte-for-byte the same report.
function buildResultPDF() {
  if (typeof window.jspdf === "undefined") return null;

  var jsPDF   = window.jspdf.jsPDF;
  var doc     = new jsPDF({ unit: "mm", format: "a4" });
  var result  = calculateScore();
  var rl      = getResultLabels();
  var ui      = getUI();
  var dose    = getDosageRecommendation(result.estimatedNgMl);
  var tips    = buildTips(result);
  var a       = state.answers;

  var pageW  = doc.internal.pageSize.getWidth();
  var pageH  = doc.internal.pageSize.getHeight();
  var margin = 18;
  var col    = pageW - margin * 2;
  var y      = margin;

  // ── Layout helpers ────────────────────────
  function addPage() {
    doc.addPage();
    y = margin;
  }

  function checkPageBreak(needed) {
    if (y + needed > pageH - margin) addPage();
  }

  function text(str, x, textY, opts) {
    doc.text(str, x, textY, opts || {});
  }

  // Section header: colored small-caps label + a thin underline below it
  // (no enclosing box — content length can vary freely without overlap).
  function sectionHeader(label, color) {
    checkPageBreak(14);
    doc.setTextColor.apply(doc, color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setCharSpace(0.3);
    text(sanitizeText(label).toUpperCase(), margin, y);
    doc.setCharSpace(0);
    y += 2;
    doc.setDrawColor.apply(doc, color);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + col, y);
    y += 7;
  }

  // A single bulleted line, auto-wrapping and paginating as needed.
  function bulletLine(str, fontSize, color, bold) {
    fontSize = fontSize || 9;
    color    = color || [60, 60, 60];
    doc.setTextColor.apply(doc, color);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    var lines = doc.splitTextToSize("•  " + sanitizeText(str), col - 4);
    checkPageBreak(lines.length * 5.2 + 2);
    doc.text(lines, margin + 2, y);
    y += lines.length * 5.2 + 2;
  }

  // A plain (non-bulleted) paragraph line, auto-wrapping.
  function paragraph(str, fontSize, color, bold) {
    fontSize = fontSize || 9;
    color    = color || [60, 60, 60];
    doc.setTextColor.apply(doc, color);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    var lines = doc.splitTextToSize(sanitizeText(str), col);
    checkPageBreak(lines.length * 5.6 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 5.6 + 2;
  }

  function drawSunIcon(cx, cy, r) {
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, r, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    for (var i = 0; i < 8; i++) {
      var angle = (i * Math.PI) / 4;
      var x1 = cx + Math.cos(angle) * (r + 1.2);
      var y1 = cy + Math.sin(angle) * (r + 1.2);
      var x2 = cx + Math.cos(angle) * (r + 4);
      var y2 = cy + Math.sin(angle) * (r + 4);
      doc.line(x1, y1, x2, y2);
    }
  }

  var scoreRGB =
    result.score <= 25 ? [76, 175, 80]  :
    result.score <= 50 ? [251, 192, 45] :
    result.score <= 74 ? [251, 140, 0]  : [244, 67, 54];

  var serumAccent = [21, 101, 192];
  var recAccent   = [123, 31, 162];
  var riskAccent  = [230, 126, 0];
  var tipsAccent  = [33, 150, 243];

  // ── Header bar ────────────────────────────
  doc.setFillColor(245, 166, 35);
  doc.rect(0, 0, pageW, 28, "F");
  drawSunIcon(margin + 5, 13, 3.2);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  text("Vitamin D Deficiency Risk Assessment", margin + 14, 12);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  var dateStr = new Date().toLocaleDateString(currentLanguage === "id" ? "id-ID" : undefined, { year: "numeric", month: "long", day: "numeric" });
  text((currentLanguage === "id" ? "Dibuat: " : "Generated: ") + dateStr, margin + 14, 20);
  if (a.Name) text((currentLanguage === "id" ? "Nama: " : "Name: ") + a.Name, pageW - margin, 20, { align: "right" });

  y = 38;

  // ── Risk level (plain colored line, no box) ──
  paragraph(result.level.toUpperCase() + ": " + result.message, 13, scoreRGB, true);
  y += 3;

  // ── Score ──────────────────────────────────
  sectionHeader(rl.riskScoreTitle, scoreRGB);
  doc.setTextColor.apply(doc, scoreRGB);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  text(sanitizeText(result.scoreLabel), margin, y);
  y += 8;
  paragraph(rl.scoreSubtext, 8, [130, 130, 130]);
  y += 4;

  // ── Serum estimate ─────────────────────────
  sectionHeader(rl.serumTitle, serumAccent);
  doc.setTextColor.apply(doc, serumAccent);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  text(result.estimatedNgMl + " ng/mL", margin, y);
  y += 7;
  paragraph(result.serumFlag, 9.5, [60, 60, 60], true);
  paragraph(stripHtmlForPdf(rl.serumDisclaimer), 7.5, [150, 150, 150]);
  y += 4;

  // ── Recommendations ────────────────────────
  sectionHeader(ui.recommendationsTitle, recAccent);
  paragraph(dose.tier, 11.5, recAccent, true);
  y += 1;
  bulletLine(ui.suggestedDosage + dose.dosage, 9);
  bulletLine(ui.additionalAdvice + dose.advice, 9);
  y += 4;

  // ── Risk factors ────────────────────────────
  if (result.riskFactors && result.riskFactors.length > 0) {
    sectionHeader(rl.riskFactorsTitle, riskAccent);
    result.riskFactors.forEach(function(factor) {
      bulletLine(factor, 9);
    });
    y += 4;
  }

  // ── Suggested next steps ────────────────────
  sectionHeader(ui.nextSteps, tipsAccent);
  tips.forEach(function(tip) {
    bulletLine(tip, 8.5);
  });
  y += 4;

  // ── Footer ──────────────────────────────────
  checkPageBreak(16);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  var footerNote = currentLanguage === "id"
    ? "Laporan ini hanya untuk tujuan informasi dan bukan diagnosis medis. Konsultasikan dengan tenaga medis profesional."
    : "This report is for informational purposes only and is not a medical diagnosis. Consult a healthcare professional for advice.";
  paragraph(footerNote, 7, [180, 180, 180]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  text("Vitamin D Deficiency Early Detection Check · " + dateStr, margin, y);

  var name    = (a.Name || "User").replace(/\s+/g, "_");
  var dateTag = new Date().toISOString().slice(0, 10);

  return { doc: doc, filename: "VitD_Result_" + name + "_" + dateTag + ".pdf" };
}

function downloadResultPDF() {
  var built = buildResultPDF();
  if (!built) {
    alert("PDF library not loaded yet. Please try again in a moment.");
    return;
  }
  built.doc.save(built.filename);
}