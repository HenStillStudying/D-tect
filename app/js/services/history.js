// ─────────────────────────────────────────────
//  history.js — Firestore history: save reports, list, download, expire
// ─────────────────────────────────────────────

// How long a saved history entry stays visible/kept before it's treated
// as expired and cleaned up. 30 days.
var HISTORY_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function openHistoryWindow() {
  var overlay = document.getElementById("historyOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "historyOverlay";
    overlay.className = "history-overlay hidden";
    overlay.innerHTML =
      '<div class="history-window">' +
        '<div class="history-header">' +
          '<h3 id="historyTitle"></h3>' +
          '<button id="closeHistoryBtn" class="secondary-btn"></button>' +
        '</div>' +
        '<div id="historyContent" class="history-content"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector("#closeHistoryBtn").onclick = closeHistoryWindow;
    overlay.onclick = function(event) {
      if (event.target === overlay) closeHistoryWindow();
    };
  }

  // Set every open, since the language may have changed since it was built
  var ui = getUI();
  overlay.querySelector("#historyTitle").textContent    = ui.historyTitle;
  overlay.querySelector("#closeHistoryBtn").textContent = ui.historyClose;

  overlay.classList.remove("hidden");
  var content = overlay.querySelector("#historyContent");
  if (content) {
    content.innerHTML = '<p>' + ui.historyLoading + '</p>';
  }

  fetchUserHistory().then(function(entries) {
    if (!content) return;
    if (!entries || entries.length === 0) {
      content.innerHTML = '<p>' + getUI().historyEmpty + '</p>';
      return;
    }
    content.innerHTML = entries.map(formatHistoryItem).join("");
    content.onclick = function(event) {
      var btn = event.target.closest("[data-history-index]");
      if (!btn) return;
      var data = entries[parseInt(btn.getAttribute("data-history-index"), 10)].data || {};
      if (!isPdfDataUri(data.pdfData)) return;
      var safeName = String(data.userName || "Anonymous").replace(/[^\w\-]+/g, "_");
      downloadPdfFromBase64(data.pdfData, "VitaminD_Report_" + safeName + ".pdf");
    };
  }).catch(function(err) {
    console.error("Failed to load history entries:", err);
    if (content) content.innerHTML = '<p>' + getUI().historyError + '</p>';
  });
}

// Reads from the "quiz_history" collection — the same collection
// generateAndSaveReport() writes to, keyed by the cookie-based user ID
// from getOrCreateUserCookie(). (window.firestoreDb is used if your
// firebase.js sets it; otherwise falls back to the plain `db` global.)

function fetchUserHistory() {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database) return Promise.resolve([]);

  var userId = getOrCreateUserCookie();
  if (!userId) return Promise.resolve([]);

  return database.collection("quiz_history")
    .where("userId", "==", userId)
    .get()
    .then(function(querySnapshot) {
      var entries = querySnapshot.docs.map(function(doc) {
        return { id: doc.id, data: doc.data() };
      });

      // Auto-delete expired entries from Firestore in the background
      deleteExpiredEntries(entries);

      // Filter out expired entries for display
      var now = Date.now();
      return entries.filter(function(entry) {
        var data    = entry.data || {};
        var savedAt = data.createdAt && data.createdAt.toDate
          ? data.createdAt.toDate()
          : null;
        if (!savedAt) return false; // no timestamp = hide it
        return (now - savedAt.getTime()) <= HISTORY_EXPIRY_MS;
      });
    })
    .catch(function(error) {
      console.warn("Could not fetch user history:", error);
      return [];
    });
}

function closeHistoryWindow() {
  var overlay = document.getElementById("historyOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

// Removes expired history entries from Firestore in the background.
// Fire-and-forget: failures are logged but don't block the History view.
function deleteExpiredEntries(entries) {
  var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
  if (!database || !entries || entries.length === 0) return;

  var now = Date.now();
  entries.forEach(function(entry) {
    var data    = entry.data || {};
    var savedAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;
    if (!savedAt) return;
    if ((now - savedAt.getTime()) > HISTORY_EXPIRY_MS) {
      database.collection("quiz_history").doc(entry.id).delete().catch(function(err) {
        console.warn("Failed to delete expired history entry:", entry.id, err);
      });
    }
  });
}

function getOrCreateUserCookie() {
  let cookieName = "vitamin_user_id=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  
  // Check if cookie already exists
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cookieName) == 0) {
      return c.substring(cookieName.length, c.length);
    }
  }
  
  // If not, generate a random unique ID
  let newUserId = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Save it for 1 year
  let d = new Date();
  d.setTime(d.getTime() + (365*24*60*60*1000));
  document.cookie = cookieName + newUserId + ";" + "expires=" + d.toUTCString() + ";path=/";
  
  return newUserId;
}

async function saveUserReportToFirestore(userName, base64PdfString) {
  try {
    // 1. Get the random cookie ID
    const userId = getOrCreateUserCookie();

    // 2. Save it to Firestore using the cookie ID as the document ID
    await db.collection("quiz_history").doc(userId).set({
      userName: userName,       // Column 2: Name from the data
      pdfData: base64PdfString, // Column 3: The Base64 string
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("History saved successfully for ID:", userId);
  } catch (error) {
    console.error("Error saving history:", error);
  }
}
async function generateAndSaveReport(userName, userScore, riskLevel) {
  try {
    // Uses the SAME PDF builder as the "Download Result as PDF" button
    // on the result screen (defined in pdf-export.js), so the copy
    // saved to history is identical to what the user can download
    // directly — same header, sections, colors, and content.
    var built = (typeof buildResultPDF === "function") ? buildResultPDF() : null;
    if (!built) {
      console.warn("PDF library not ready yet — skipping history save for this attempt.");
      return;
    }

    var base64PdfString = built.doc.output("datauristring");
    var userId = getOrCreateUserCookie();

    // Use .add() instead of .doc(userId).set() so every completed
    // attempt creates a new history entry rather than overwriting.
    var database = window.firestoreDb || (typeof db !== "undefined" ? db : null);
    if (!database) {
      console.warn("Firestore not available — skipping history save.");
      return;
    }

    await database.collection("quiz_history").add({
      userId: userId,           // cookie ID, used to filter "my" history
      userName: userName,
      riskLevel: riskLevel,
      score: userScore,
      pdfData: base64PdfString,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log("New quiz attempt added to history successfully!");
  } catch (error) {
    console.error("Error saving report:", error);
  }
}

function downloadPdfFromBase64(base64String, filename = "Vitamin_D_Report.pdf") {
  // 1. Create a temporary hidden anchor tag in the document
  var link = document.createElement('a');
  link.href = base64String;
  link.download = filename;
  
  // 2. Append it to the body, click it programmatically, then remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Only data URIs that are actually PDFs are offered for download — the
// field comes from Firestore, so it isn't trusted to be what we wrote.
function isPdfDataUri(str) {
  return typeof str === "string" && str.indexOf("data:application/pdf") === 0;
}

function formatHistoryItem(entry, index) {
  var data = entry.data || {};
  var ui   = getUI();

  var savedAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date();
  var dateLabel = savedAt.toLocaleString();
  var nameLabel = data.userName || "Anonymous";
  var levelLabel = data.riskLevel || "-";

  // The PDF itself is NOT embedded in the markup; the button carries only
  // the entry index and the click handler in openHistoryWindow() looks it up.
  return '<div class="history-entry" style="padding: 15px; border-bottom: 1px solid #ddd; margin-bottom: 10px;">' +
    '<div class="history-entry-meta"><strong>' + ui.historyName + '</strong> ' + escapeHtml(nameLabel) + '</div>' +
    '<div class="history-entry-level"><strong>' + ui.historyRiskLevel + '</strong> ' + escapeHtml(levelLabel) + '</div>' +
    '<div class="history-entry-detail"><strong>' + ui.historyDate + '</strong> ' + escapeHtml(dateLabel) + '</div>' +
    (isPdfDataUri(data.pdfData) ? '<button class="download-btn" data-history-index="' + index + '" style="margin-top: 10px; padding: 5px 10px;">📥 ' + ui.historyDownload + '</button>' : '') +
  '</div>';
}
