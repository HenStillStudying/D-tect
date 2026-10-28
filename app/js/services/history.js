var USER_ID_STORAGE_KEY = "vitd_anonymous_user_id_v1";
var HISTORY_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Fix: Use localStorage instead of cookies for reliable tracking
function getUserId() {
  try {
    var id = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (id) return id;
    id = generateUUID();
    localStorage.setItem(USER_ID_STORAGE_KEY, id);
    return id;
  } catch (e) {
    console.warn("Unable to read/write user UUID:", e);
    return null;
  }
}

// CSV Generator for individual reports
function generateCsvReport(userName, userScore, riskLevel, estimatedNgMl) {
  var a = state.answers;
  var csvRows = [
    "Metric,Value",
    "Name,\"" + (userName || "Anonymous") + "\"",
    "Age," + (a.age || ""),
    "Sex,\"" + (a.sex || "") + "\"",
    "BMI," + (a.bmi || ""),
    "Risk Score," + userScore,
    "Risk Level,\"" + riskLevel + "\"",
    "Estimated Serum Level (ng/mL)," + estimatedNgMl,
    "Date,\"" + new Date().toISOString() + "\""
  ];
  return "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
}

// Save PDF, CSV, and Raw Answers for research
async function generateAndSaveReport(userName, userScore, riskLevel, estimatedNgMl) {
  try {
    var built = (typeof buildResultPDF === "function") ? buildResultPDF() : null;
    if (!built) return;

    var base64PdfString = built.doc.output("datauristring");
    var csvDataUri = generateCsvReport(userName, userScore, riskLevel, estimatedNgMl);
    var userId = getUserId();
    var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
    if (!database) return;

    var expirationDate = new Date(Date.now() + HISTORY_EXPIRY_MS);

    await database.collection("quiz_history").add({
      userId: userId,
      userName: userName,
      riskLevel: riskLevel,
      score: userScore,
      pdfData: base64PdfString,
      csvData: csvDataUri,
      rawAnswers: state.answers, // Store all answers for the master research CSV
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expirationDate)
    });
  } catch (error) {
    console.error("Error saving report:", error);
  }
}

// Load user's private history
function fetchUserHistory() {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database) return Promise.resolve([]);

  var userId = getUserId();
  if (!userId) return Promise.resolve([]);

  return database.collection("quiz_history")
    .where("userId", "==", userId)
    .get()
    .then(function(querySnapshot) {
      var entries = querySnapshot.docs.map(function(doc) {
        return { id: doc.id, data: doc.data() };
      });
      
      var now = Date.now();
      return entries.filter(function(entry) {
        var savedAt = entry.data.createdAt && entry.data.createdAt.toDate ? entry.data.createdAt.toDate() : null;
        return savedAt && (now - savedAt.getTime()) <= HISTORY_EXPIRY_MS;
      });
    })
    .catch(function(error) {
      console.warn("Could not fetch user history:", error);
      return [];
    });
}

function openHistoryWindow() {
  var overlay = document.getElementById("historyOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "historyOverlay";
    overlay.className = "history-overlay hidden";
    overlay.innerHTML =
      '<div class="history-window">' +
        '<div class="history-header"><h3>History</h3><button id="closeHistoryBtn" class="secondary-btn">Close</button></div>' +
        '<div id="historyContent" class="history-content"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector("#closeHistoryBtn").onclick = function() { overlay.classList.add("hidden"); };
  }

  overlay.classList.remove("hidden");
  var content = overlay.querySelector("#historyContent");
  if (content) content.innerHTML = '<p>Loading history...</p>';

  fetchUserHistory().then(function(entries) {
    if (!content) return;
    if (!entries || entries.length === 0) {
      content.innerHTML = '<p>No saved history yet.</p>';
      return;
    }
    
    window.tempHistoryPdfs = {};
    content.innerHTML = entries.map(function(entry) {
      if (entry.data && entry.data.pdfData) {
        window.tempHistoryPdfs[entry.id] = entry.data.pdfData;
      }
      return formatHistoryItem(entry);
    }).join("");
  });
}

function downloadPdfById(entryId, filename) {
  var base64String = window.tempHistoryPdfs && window.tempHistoryPdfs[entryId];
  if (base64String) {
    var link = document.createElement('a');
    link.href = base64String;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// User UI only shows PDF download
function formatHistoryItem(entry) {
  var data = entry.data || {};
  var entryId = entry.id;
  var savedAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date();
  var nameLabel = data.userName || "Anonymous";
  
  return '<div class="history-entry" style="padding: 15px; border-bottom: 1px solid #ddd; margin-bottom: 10px;">' +
    '<div class="history-entry-meta"><strong>Name:</strong> ' + nameLabel + '</div>' +
    '<div class="history-entry-level"><strong>Risk Level:</strong> ' + (data.riskLevel || "-") + '</div>' +
    '<div class="history-entry-detail"><strong>Date:</strong> ' + savedAt.toLocaleString() + '</div>' +
    (data.pdfData ? '<button class="download-btn" style="margin-top: 10px; padding: 5px 10px;" onclick="downloadPdfById(\'' + entryId + '\', \'VitaminD_Report_' + nameLabel.replace(/\s+/g, '_') + '.pdf\')">📥 Download PDF</button>' : '') +
  '</div>';
}

// Admin: Master CSV Exporter for Research
async function downloadMasterCSV() {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database) { alert("Database not connected."); return; }

  var snapshot = await database.collection("quiz_history").orderBy("createdAt", "desc").get();
  var sep = ";"; 
  var headers = ["No. Registrasi", "Nama", "Risk Level", "Risk Score", "Tanggal Dikirim"];
  
  var allQuestions = [];
  chaptersEN.forEach(function(ch) {
    ch.questions.forEach(function(q) {
      allQuestions.push(q);
      headers.push('"' + q.key.replace(/"/g, '""') + '"');
    });
  });

  var csvRows = [headers.join(sep)];

  snapshot.forEach(function(doc) {
    var d = doc.data();
    var ans = d.rawAnswers || {};
    var dateStr = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : "";
    
    var row = [
      doc.id,
      '"' + (d.userName || "Anonymous") + '"',
      '"' + (d.riskLevel || "") + '"',
      d.score || 0,
      '"' + dateStr + '"'
    ];

    allQuestions.forEach(function(q) {
      var val = ans[q.key];
      row.push(val === undefined || val === null ? '""' : '"' + String(val).replace(/"/g, '""') + '"');
    });

    csvRows.push(row.join(sep));
  });

  var csvString = "\uFEFF" + csvRows.join("\n");
  var link = document.createElement('a');
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
  link.download = "Master_Research_Data.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Secret Admin Shortcut (Ctrl + Shift + E)
document.addEventListener('keydown', function(event) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    var passcode = prompt("Admin Access: Enter export password:");
    if (passcode === "dtect-admin-2026") {
      console.log("Admin authenticated. Generating Master CSV...");
      downloadMasterCSV();
    } else if (passcode !== null) {
      alert("Incorrect password. Access denied.");
    }
  }
});
