# D-tect — Vitamin D Deficiency Early Detection Check

A web app that estimates a person's **risk of vitamin D deficiency** from a short questionnaire about their lifestyle, sun exposure, diet, and health.

> ⚠️ For information only — **not a medical diagnosis**. Only a blood test (25(OH)D) can confirm vitamin D levels.

## What it does

1. The user answers about 28 questions in 3 chapters: personal profile, sun & lifestyle, diet & health.
2. The app shows:
   - a **risk score** (0–100) and risk level (Green / Yellow / Orange / Red)
   - an **estimated blood vitamin D level** (ng/mL or nmol/L) from a machine-learning model
   - the user's main **risk factors** and **personalised tips**
3. The user can download the result as a **PDF** and view past results in **History**.

It works in **English and Indonesian**, and has a day/night theme.

## How to run

No install or build step. Open `app/index.html` in a browser.

## Folders

| Folder | What's in it |
|---|---|
| `app/` | **The website.** The only folder that gets deployed. |
| `app/css/` | Styling and the animated background. |
| `app/js/core/` | The logic: quiz state, risk scoring, and the model input. |
| `app/js/ui/` | What's on screen: questions, results, buttons. |
| `app/js/services/` | Outside connections: Firebase, saved history, PDF export, saved progress. |
| `app/js/data/` | The questions, in English and Indonesian. |
| `app/js/model/` | The trained vitamin D prediction model. |
| `app/js/dev/` | Test buttons (Random / Best / Worst case). |
| `ml/` | **Model training and research.** Not deployed. |
| `ml/analysis/` | Scripts that check how well the model performs. |
| `ml/MODEL_INVESTIGATION.md` | Findings about the model's accuracy and limits. |
| `archive/` | Old files kept for reference. Not used by the app. |

**Not in this repo (on purpose):** the participant dataset (`ml/dataset/`) and the training notebook. They contain private health data. See `.gitignore`.

## Built with

Plain HTML, CSS and JavaScript · Firebase Firestore (history) · jsPDF (PDF export) · scikit-learn Random Forest, exported to JavaScript
