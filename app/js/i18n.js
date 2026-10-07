// ─────────────────────────────────────────────
//  i18n.js — Language strings & toggle logic
// ─────────────────────────────────────────────

var currentLanguage = "en";   // "en" | "id"

// ── UI button/label strings ───────────────────
var uiStrings = {
  en: {
    startChapter: "Start Chapter →",
    next:         "Next →",
    startBtn:     "🚀 Start Assessment →",
    learnMore:    "ℹ️ Learn more ▼",
    learnHide:    "ℹ️ Hide ▲",
    retake:       "Retake Assessment",
    nextSteps:    "Suggested Next Steps",
    pleaseSelect: "Please select an option.",
    pleaseEnter:  "Please enter a value.",
    downloadPDF:  "Download Result as PDF",
    viewRecommendations: "View Recommendations →",
    backToResults:       "← Back to Results",
    recommendationsTitle:"RECOMMENDATIONS",
    suggestedDosage:     "Suggested dosage: ",
    additionalAdvice:    "Additional advice: ",
    progressLabel:       "Question {current} of {total} · {percent}%",
    chapterBadge:        "Chapter {n} of {total}",
    chapterCount:        "{count} questions in this chapter",
    viewHistory:         "View History",
    historyTitle:        "History",
    historyClose:        "Close",
    historyLoading:      "Loading history...",
    historyEmpty:        "No saved history yet.",
    historyError:        "Error loading history.",
    historyName:         "Name:",
    historyRiskLevel:    "Risk Level:",
    historyDate:         "Date:",
    historyDownload:     "Download PDF",
  },
  id: {
    startChapter: "Mulai Bab →",
    next:         "Lanjut →",
    startBtn:     "🚀 Mulai Penilaian →",
    learnMore:    "ℹ️ Pelajari lebih ▼",
    learnHide:    "ℹ️ Sembunyikan ▲",
    retake:       "Ulangi Penilaian",
    nextSteps:    "Langkah Selanjutnya yang Disarankan",
    pleaseSelect: "Silakan pilih salah satu opsi.",
    pleaseEnter:  "Silakan isi kolom ini.",
    downloadPDF:  "Unduh Hasil sebagai PDF",
    viewRecommendations: "Lihat Rekomendasi →",
    backToResults:       "← Kembali ke Hasil",
    recommendationsTitle:"REKOMENDASI",
    suggestedDosage:     "Anjuran dosis: ",
    additionalAdvice:    "Anjuran lain: ",
    progressLabel:       "Pertanyaan {current} dari {total} · {percent}%",
    chapterBadge:        "Bab {n} dari {total}",
    chapterCount:        "{count} pertanyaan dalam bab ini",
    viewHistory:         "Lihat Riwayat",
    historyTitle:        "Riwayat",
    historyClose:        "Tutup",
    historyLoading:      "Memuat riwayat...",
    historyEmpty:        "Belum ada riwayat tersimpan.",
    historyError:        "Gagal memuat riwayat.",
    historyName:         "Nama:",
    historyRiskLevel:    "Tingkat Risiko:",
    historyDate:         "Tanggal:",
    historyDownload:     "Unduh PDF",
  }
};

function getUI() {
  return uiStrings[currentLanguage] || uiStrings.en;
}

// ── Dosage / clinical recommendation tiers (used in recommendations screen) ──
var dosageLabels = {
  en: {
    severe: {
      tier:   "Very High Risk — Severely Deficient",
      dosage: "High-dose vitamin D supplement: 5000 IU/day (or as prescribed — some doctors use a weekly 50,000 IU regimen)",
      advice: "Consult a healthcare professional promptly for a 25(OH)D blood test and treatment plan."
    },
    deficient: {
      tier:   "High Risk — Deficient",
      dosage: "Vitamin D supplement: 2000–4000 IU/day",
      advice: "Consult a doctor in the coming weeks, and combine with adequate sun exposure."
    },
    insufficient: {
      tier:   "Moderate Risk — Insufficient",
      dosage: "Vitamin D supplement: 1000–2000 IU/day",
      advice: "Increase sun exposure and vitamin D-rich foods; recheck levels in a few months."
    },
    sufficient: {
      tier:   "Normal Risk — Sufficient",
      dosage: "Maintain current habits — maintenance dose of 1000–2000 IU/day if supplementing",
      advice: "Keep up your current sun exposure and dietary habits."
    }
  },
  id: {
    severe: {
      tier:   "Risiko Sangat Tinggi — Defisiensi Berat",
      dosage: "Suplemen vitamin D dosis tinggi: 5000 IU/hari (atau sesuai resep dokter — beberapa dokter menggunakan dosis mingguan 50.000 IU)",
      advice: "Segera konsultasi ke fasilitas kesehatan terdekat untuk tes darah 25(OH)D dan rencana pengobatan."
    },
    deficient: {
      tier:   "Risiko Tinggi — Defisiensi",
      dosage: "Suplemen vitamin D: 2000–4000 IU/hari",
      advice: "Konsultasi ke dokter dalam beberapa minggu ke depan, kombinasikan dengan paparan sinar matahari yang cukup."
    },
    insufficient: {
      tier:   "Risiko Sedang — Insufisiensi",
      dosage: "Suplemen vitamin D: 1000–2000 IU/hari",
      advice: "Tingkatkan paparan sinar matahari dan konsumsi makanan sumber vitamin D. Periksa ulang kadar dalam beberapa bulan."
    },
    sufficient: {
      tier:   "Risiko Normal — Cukup",
      dosage: "Pertahankan — suplementasi maintenance 1000–2000 IU/hari bila diperlukan",
      advice: "Pertahankan pola paparan sinar matahari dan pola makan yang sudah baik."
    }
  }
};

function getDosageLabels() {
  return dosageLabels[currentLanguage] || dosageLabels.en;
}

// ── Risk factor labels (used in scoring.js) ───
var riskLabels = {
  en: {
    // ── Original ──────────────────────────────
    age56:           "Age 56 or older (reduced skin synthesis)",
    skinDark:        "Darker skin tone (reduced UV absorption)",
    skinVeryDark:    "Very dark skin tone (significantly reduced UV absorption)",
    nightShift:      "Night shift / no daytime sun exposure",
    indoorWork:      "Indoor work environment (limited sunlight)",
    coldClimate:     "Cold / northern climate (weak UV year-round)",
    obesity:         "Obesity — vitamin D sequestered in body fat",
    overweight:      "Overweight — elevated vitamin D requirements",
    lowSun:          "Sun exposure < 10 min/day",
    sunscreenAlways: "Daily high-SPF sunscreen use",
    noVitDFood:      "No vitamin D-rich foods in diet",
    rareVitDFood:    "Rarely eats vitamin D-rich foods",
    vegan:           "Vegan diet (very limited dietary vitamin D)",
    noSupplements:   "No vitamin D supplementation",
    fatigue:         "Frequent fatigue (possible deficiency symptom)",
    bonePain:        "Frequent bone or muscle pain",
    frequentIllness: "Frequent illness (>4×/year)",
    lowMood:         "Persistent low mood / depression",
    muscleWeak:      "Frequent muscle weakness",
    hairSkin:        "Slow wound healing and hair loss",
    // ── New ───────────────────────────────────
    nightShiftFixed:    "Fixed night shift (no daytime sun exposure)",
    noIndoorSun:        "No indoor sun exposure at all",
    veryShortIndoorSun: "Very short indoor sun exposure (<5 min)",
    noBodyExposure:     "No skin exposed to sunlight indoors",
    noOutdoorExposure:  "No skin exposed when working outdoors",
    noRecreation:       "No outdoor recreational activity",
    alwaysShade:        "Always stays in the shade outdoors",
    sunscreenHigh:      "Daily SPF 50+ sunscreen use (blocks ~98% UVB)",
    fullCoverage:       "Full-body clothing coverage (blocks nearly all UVB)",
    noLunchBreak:       "No regular lunch break for outdoor sun exposure",
    indoorLunch:        "Lunch always taken indoors (no midday sun exposure)",
    noDairy:            "No dairy consumption (low dietary vitamin D)",
    noSeafood:          "No seafood consumption (low dietary vitamin D)",
    noFat:              "No dietary fat intake (reduces vitamin D absorption)",
    kidneyLiver:        "Kidney or liver disease (impairs vitamin D activation)",
    diabetes:           "Diabetes mellitus (associated with vitamin D deficiency)",
    pregnant:           "Currently pregnant (increased vitamin D requirements)",
    breastfeeding:      "Currently breastfeeding (increased vitamin D requirements)"
  },
  id: {
    // ── Original ──────────────────────────────
    age56:           "Usia 56 tahun ke atas (sintesis kulit menurun)",
    skinDark:        "Warna kulit lebih gelap (penyerapan UV berkurang)",
    skinVeryDark:    "Warna kulit sangat gelap (penyerapan UV sangat berkurang)",
    nightShift:      "Kerja shift malam / tidak terpapar sinar matahari siang",
    indoorWork:      "Lingkungan kerja dalam ruangan (sinar matahari terbatas)",
    coldClimate:     "Iklim dingin / lintang utara (UV lemah sepanjang tahun)",
    obesity:         "Obesitas — vitamin D tersimpan dalam lemak tubuh",
    overweight:      "Kelebihan berat badan — kebutuhan vitamin D meningkat",
    lowSun:          "Paparan sinar matahari < 10 menit/hari",
    sunscreenAlways: "Penggunaan tabir surya SPF tinggi setiap hari",
    noVitDFood:      "Tidak mengonsumsi makanan kaya vitamin D",
    rareVitDFood:    "Jarang mengonsumsi makanan kaya vitamin D",
    vegan:           "Diet vegan (vitamin D dari makanan sangat terbatas)",
    noSupplements:   "Tidak mengonsumsi suplemen vitamin D",
    fatigue:         "Kelelahan yang sering (kemungkinan gejala defisiensi)",
    bonePain:        "Nyeri tulang atau otot yang sering",
    frequentIllness: "Sering sakit (>4×/tahun)",
    lowMood:         "Suasana hati rendah / depresi yang menetap",
    muscleWeak:      "Kelemahan otot yang sering",
    hairSkin:        "Penyembuhan luka lambat dan rambut rontok",
    // ── New ───────────────────────────────────
    nightShiftFixed:    "Shift malam tetap (tidak ada paparan sinar matahari siang)",
    noIndoorSun:        "Tidak ada paparan sinar matahari di dalam ruangan sama sekali",
    veryShortIndoorSun: "Paparan matahari di dalam ruangan sangat singkat (<5 menit)",
    noBodyExposure:     "Tidak ada kulit yang terpapar sinar matahari di dalam ruangan",
    noOutdoorExposure:  "Tidak ada kulit yang terpapar saat bekerja di luar ruangan",
    noRecreation:       "Tidak ada aktivitas rekreasi di luar ruangan",
    alwaysShade:        "Selalu berada di tempat teduh saat di luar ruangan",
    sunscreenHigh:      "Penggunaan tabir surya SPF 50+ setiap hari (menghalangi ~98% UVB)",
    fullCoverage:       "Pakaian penutup penuh (menghalangi hampir semua UVB)",
    noLunchBreak:       "Tidak ada istirahat makan siang untuk paparan matahari siang",
    indoorLunch:        "Makan siang selalu di dalam ruangan (tidak ada paparan matahari siang)",
    noDairy:            "Tidak mengonsumsi produk susu (vitamin D dari makanan rendah)",
    noSeafood:          "Tidak mengonsumsi makanan laut (vitamin D dari makanan rendah)",
    noFat:              "Tidak mengonsumsi lemak makanan (mengurangi penyerapan vitamin D)",
    kidneyLiver:        "Penyakit ginjal atau hati (mengganggu aktivasi vitamin D)",
    diabetes:           "Diabetes melitus (dikaitkan dengan defisiensi vitamin D)",
    pregnant:           "Sedang hamil (kebutuhan vitamin D meningkat)",
    breastfeeding:      "Sedang menyusui (kebutuhan vitamin D meningkat)"
  }
};

function getRiskLabels() {
  return riskLabels[currentLanguage] || riskLabels.en;
}

// ── Result tip text (used in results.js) ──────
var tipLabels = {
  en: {
    // ── Original ──────────────────────────────
    tipGreen:       "Great news! Your profile suggests healthy vitamin D levels. Keep up your habits with regular sun exposure and a balanced diet.",
    tipYellow:      "You may be at mild risk. Try adding more sun exposure and vitamin D-rich foods, and consider getting your levels tested.",
    tipOrange:      "Your responses suggest your vitamin D levels may be low. Increase safe sun exposure, consider supplements, and speak to your doctor about a blood test.",
    tipRed:         "High risk of vitamin D deficiency detected. Please consult a healthcare professional for a blood test and treatment plan.",
    tipAge:         "At your age, vitamin D synthesis from sunlight decreases — daily supplementation is especially important.",
    tipLocation:    "You mentioned living in {city}. Check your local UV index to know when sun exposure is most effective for vitamin D synthesis.",
    tipSunscreen:   "Try 10–15 min of unprotected morning sun before applying sunscreen to allow some vitamin D synthesis.",
    tipDiet:        "Your dietary restrictions limit natural vitamin D — UV-exposed mushrooms, fortified plant milks, and a D3 supplement can help.",
    tipSupplements: "You're not taking supplements — worth discussing with your doctor, especially given other risk factors.",
    tipFatigue:     "Persistent fatigue is closely linked to low vitamin D. Improving your levels may noticeably increase your energy.",
    tipBonePain:    "Frequent bone or muscle pain is a classic deficiency sign — a blood test is recommended.",
    tipMood:        "Low mood and vitamin D are closely linked. Addressing your levels may support better mental wellbeing.",
    // ── New ───────────────────────────────────
    tipNightShift:    "Your night shift schedule limits daytime sun — supplements and vitamin D-rich foods are your most reliable option.",
    tipShade:         "Try to spend at least some time in direct sunlight rather than always staying in the shade — even 15 minutes helps.",
    tipClothing:      "Your clothing coverage significantly limits UV exposure — supplements are especially important for you.",
    tipLunch:         "Try taking your lunch break outdoors in direct sunlight between 11am–1pm to make the most of peak UV hours.",
    tipSeafood:       "Adding fatty fish (salmon, sardines, mackerel) to your diet 2–3 times a week is one of the best natural ways to boost vitamin D.",
    tipDairy:         "Fortified milk and dairy products are a convenient dietary source of vitamin D — aim for 1–2 servings daily.",
    tipPregnant:      "During pregnancy, vitamin D requirements increase significantly. Discuss supplementation (usually 600–2000 IU/day) with your doctor.",
    tipBreastfeeding: "Breastfeeding mothers should ensure adequate vitamin D both for themselves and their infant. Consult your doctor about appropriate dosing.",
    tipKidneyLiver:   "Kidney or liver disease can impair vitamin D activation. Regular monitoring and medically supervised supplementation are especially important.",
    tipDiabetes:      "Vitamin D deficiency is commonly associated with diabetes. Maintaining healthy levels may support better metabolic health — consult your doctor.",
    tipSunTime:       "Try to get at least 15–30 minutes of direct sunlight on your arms and face between 10am and 2pm most days.",
    tipRecreation:    "Adding outdoor recreational activities 2–3 times a week (walking, sports, cycling) is an effective and enjoyable way to boost your vitamin D."
  },
  id: {
    // ── Original ──────────────────────────────
    tipGreen:       "Kabar baik! Profil Anda menunjukkan kadar vitamin D yang sehat. Pertahankan kebiasaan Anda dengan paparan sinar matahari teratur dan pola makan seimbang.",
    tipYellow:      "Anda mungkin berisiko ringan. Coba tambah paparan sinar matahari dan makanan kaya vitamin D, serta pertimbangkan tes kadar vitamin D.",
    tipOrange:      "Jawaban Anda menunjukkan kadar vitamin D mungkin rendah. Tingkatkan paparan sinar matahari yang aman, pertimbangkan suplemen, dan konsultasikan tes darah dengan dokter.",
    tipRed:         "Risiko tinggi kekurangan vitamin D terdeteksi. Silakan konsultasikan dengan tenaga medis untuk tes darah dan rencana pengobatan.",
    tipAge:         "Pada usia Anda, sintesis vitamin D dari sinar matahari menurun — suplementasi harian sangat penting.",
    tipLocation:    "Anda menyebutkan tinggal di {city}. Periksa indeks UV lokal untuk mengetahui waktu terbaik berjemur demi sintesis vitamin D.",
    tipSunscreen:   "Coba berjemur 10–15 menit tanpa pelindung di pagi hari sebelum memakai tabir surya agar tubuh tetap dapat mensintesis vitamin D.",
    tipDiet:        "Pembatasan diet Anda membatasi vitamin D alami — jamur yang terpapar UV, susu nabati yang difortifikasi, dan suplemen D3 dapat membantu.",
    tipSupplements: "Anda belum mengonsumsi suplemen — sebaiknya didiskusikan dengan dokter, terutama mengingat faktor risiko lainnya.",
    tipFatigue:     "Kelelahan yang terus-menerus erat kaitannya dengan kadar vitamin D rendah. Memperbaiki kadar Anda dapat meningkatkan energi secara nyata.",
    tipBonePain:    "Nyeri tulang atau otot yang sering adalah tanda klasik defisiensi — tes darah disarankan.",
    tipMood:        "Suasana hati rendah dan vitamin D berkaitan erat. Memperbaiki kadar Anda dapat mendukung kesehatan mental yang lebih baik.",
    // ── New ───────────────────────────────────
    tipNightShift:    "Jadwal shift malam Anda membatasi paparan sinar matahari siang — suplemen dan makanan kaya vitamin D adalah pilihan paling andal untuk Anda.",
    tipShade:         "Cobalah menghabiskan setidaknya beberapa waktu di bawah sinar matahari langsung daripada selalu berteduh — bahkan 15 menit sudah membantu.",
    tipClothing:      "Pakaian penutup Anda sangat membatasi paparan UV — suplemen sangat penting bagi Anda.",
    tipLunch:         "Cobalah menghabiskan istirahat makan siang di luar ruangan di bawah sinar matahari langsung antara pukul 11.00–13.00 untuk memaksimalkan jam UV puncak.",
    tipSeafood:       "Menambahkan ikan berlemak (salmon, sarden, makarel) ke dalam menu 2–3 kali seminggu adalah salah satu cara alami terbaik untuk meningkatkan vitamin D.",
    tipDairy:         "Susu dan produk susu yang difortifikasi adalah sumber vitamin D yang praktis — targetkan 1–2 porsi sehari.",
    tipPregnant:      "Selama kehamilan, kebutuhan vitamin D meningkat secara signifikan. Diskusikan suplementasi (biasanya 600–2000 IU/hari) dengan dokter Anda.",
    tipBreastfeeding: "Ibu menyusui harus memastikan vitamin D yang cukup untuk diri sendiri dan bayinya. Konsultasikan dosis yang tepat dengan dokter Anda.",
    tipKidneyLiver:   "Penyakit ginjal atau hati dapat mengganggu aktivasi vitamin D. Pemantauan rutin dan suplementasi di bawah pengawasan medis sangat penting.",
    tipDiabetes:      "Kekurangan vitamin D sering dikaitkan dengan diabetes. Menjaga kadar yang sehat dapat mendukung kesehatan metabolik yang lebih baik — konsultasikan dengan dokter Anda.",
    tipSunTime:       "Cobalah mendapatkan setidaknya 15–30 menit sinar matahari langsung pada lengan dan wajah antara pukul 10.00 dan 14.00 setiap harinya.",
    tipRecreation:    "Menambahkan aktivitas rekreasi di luar ruangan 2–3 kali seminggu (berjalan, olahraga, bersepeda) adalah cara efektif dan menyenangkan untuk meningkatkan vitamin D Anda."
  }
};

function getTipLabels() {
  return tipLabels[currentLanguage] || tipLabels.en;
}

// ── Result screen labels (used in scoring.js / results.js) ───
var resultLabels = {
  en: {
    lowRisk:           "Low Risk",
    mediumRisk:        "Medium Risk",
    highRisk:          "High Risk",
    veryHighRisk:      "Very High Risk",
    msgSafe:           "Safe / Healthy",
    msgMild:           "Mild deficiency risk",
    msgLow:            "Low vitamin D levels",
    msgHigh:           "High risk — seek medical advice",
    serumSufficient:   "✅ Sufficient (≥30 ng/mL / ≥75 nmol/L)",
    serumInsufficient: "⚠️ Insufficient (20–29 ng/mL / 50–74 nmol/L)",
    serumDeficient:    "🔴 Deficiency (<20 ng/mL / <50 nmol/L)",
    serumSevere:       "🔴 Severe Deficiency (<12 ng/mL / <30 nmol/L)",
    riskScoreTitle:    "📊 Deficiency Risk Score",
    scoreSubtext:      "Where you fall on the low-to-high risk spectrum",
    serumTitle:        "🩸 Estimated 25(OH)D Level",
    serumDisclaimer:   "This is a <strong>model-based estimate</strong> derived from your answers, not a blood test. Reference ranges: Sufficient ≥30 · Insufficient 20–29 · Deficient &lt;20 · Severely deficient &lt;12 ng/mL (≥75 · 50–74 · &lt;50 · &lt;30 nmol/L).",
    riskFactorsTitle:  "⚠️ Your Top Risk Factors"
  },
  id: {
    lowRisk:           "Risiko Rendah",
    mediumRisk:        "Risiko Sedang",
    highRisk:          "Risiko Tinggi",
    veryHighRisk:      "Risiko Sangat Tinggi",
    msgSafe:           "Aman / Sehat",
    msgMild:           "Risiko kekurangan ringan",
    msgLow:            "Kadar vitamin D rendah",
    msgHigh:           "Risiko tinggi — segera konsultasikan dengan dokter",
    serumSufficient:   "✅ Cukup (≥30 ng/mL / ≥75 nmol/L)",
    serumInsufficient: "⚠️ Kurang Cukup (20–29 ng/mL / 50–74 nmol/L)",
    serumDeficient:    "🔴 Defisiensi (<20 ng/mL / <50 nmol/L)",
    serumSevere:       "🔴 Defisiensi Berat (<12 ng/mL / <30 nmol/L)",
    riskScoreTitle:    "📊 Skor Risiko Kekurangan",
    scoreSubtext:      "Posisi Anda pada spektrum risiko rendah hingga tinggi",
    serumTitle:        "🩸 Perkiraan Kadar 25(OH)D",
    serumDisclaimer:   "Ini adalah <strong>perkiraan berbasis model</strong> dari jawaban Anda, bukan hasil tes darah. Rentang acuan: Cukup ≥30 · Kurang Cukup 20–29 · Defisiensi &lt;20 · Defisiensi Berat &lt;12 ng/mL (≥75 · 50–74 · &lt;50 · &lt;30 nmol/L).",
    riskFactorsTitle:  "⚠️ Faktor Risiko Utama Anda"
  }
};

function getResultLabels() {
  return resultLabels[currentLanguage] || resultLabels.en;
}

// ── Language toggle button ────────────────────
function injectLanguageToggle() {
  var toggle = document.createElement("div");
  toggle.id = "langToggle";
  // Positioning is handled by CSS (#langToggle lives inside .top-controls,
  // which is what pins it to the top-right corner). No inline position
  // styles here — they'd fight the stylesheet's !important rules.
  toggle.style.cssText = "display:flex;gap:6px;align-items:center;";
  toggle.innerHTML =
    '<button id="btnEN" onclick="switchLanguage(\'en\')" style="padding:6px 12px;border-radius:20px;border:2px solid #ff9800;background:#ff9800;color:#fff;font-weight:bold;cursor:pointer;font-size:0.85em;">EN</button>' +
    '<button id="btnID" onclick="switchLanguage(\'id\')" style="padding:6px 12px;border-radius:20px;border:2px solid #ff9800;background:#fff;color:#ff9800;font-weight:bold;cursor:pointer;font-size:0.85em;">ID</button>';

  var container = document.getElementById("topControls") || document.body;
  container.appendChild(toggle);
}

function updateToggleUI() {
  var btnEN = document.getElementById("btnEN");
  var btnID = document.getElementById("btnID");
  if (!btnEN || !btnID) return;
  if (currentLanguage === "en") {
    btnEN.style.background = "#ff9800"; btnEN.style.color = "#fff";
    btnID.style.background = "#fff";    btnID.style.color = "#ff9800";
  } else {
    btnID.style.background = "#ff9800"; btnID.style.color = "#fff";
    btnEN.style.background = "#fff";    btnEN.style.color = "#ff9800";
  }
}

function switchLanguage(lang) {
  if (lang === currentLanguage) return;
  if (lang !== "en" && lang !== "id") return;

  currentLanguage = lang;
  chapters        = (lang === "id") ? chaptersID : chaptersEN;

  updateToggleUI();
  redrawCurrentScreen();
}

function redrawCurrentScreen() {
  if (!dom.introSection || dom.introSection.style.display !== "none") return;
  if (state.uiState === "chapterIntro") {
    showChapterIntro(state.currentChapter);
  } else if (state.uiState === "result") {
    showResult(true);
  } else if (state.uiState === "recommendations") {
    showRecommendations();
  } else {
    showQuestion();
  }
}
// ── Boot ───────────────────────────────────────
injectLanguageToggle();