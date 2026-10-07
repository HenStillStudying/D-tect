// ─────────────────────────────────────────────
//  utils.js — Shared helpers: unit conversion, HTML escaping, IDs
// ─────────────────────────────────────────────

var USER_ID_STORAGE_KEY = "vitd_anonymous_user_id_v1";

// 1 ng/mL of 25(OH)D = 2.496 nmol/L (standard clinical conversion factor)
var NGML_TO_NMOL = 2.496;

function convertSerum(ngml, unit) {
  return unit === "nmol" ? Math.round(ngml * NGML_TO_NMOL) : ngml;
}

function serumUnitLabel(unit) {
  return unit === "nmol" ? "nmol/L" : "ng/mL";
}

// Escapes user-supplied text (name, city, Firestore fields) before it goes
// into innerHTML, so input like "<img onerror=...>" renders as plain text.
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
