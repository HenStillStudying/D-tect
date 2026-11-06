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
4. On the result screen, the user can choose to **share their answers for research**, without their name. Nothing is shared unless they tick the consent box and press Share.

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
| `app/admin.html`, `app/js/admin/` | **Admin page** for downloading the research responses as a CSV. |
| `ml/` | **Model training and research.** Not deployed. |
| `ml/analysis/` | Scripts that check how well the model performs. |
| `ml/MODEL_INVESTIGATION.md` | Findings about the model's accuracy and limits. |
| `archive/` | Old files kept for reference. Not used by the app. |

**Not in this repo (on purpose):** the participant dataset (`ml/dataset/`) and the training notebook. They contain private health data. See `.gitignore`.

## Admin page (research data)

Admins open `https://vitamindeficiency-ae82f.web.app/admin.html`, sign in with Google, and press **Download CSV** (English or Indonesian). The CSV has one row per shared response and one column per question, and opens directly in Excel.

**Who can see the data** is decided by `firestore.rules`, not by the page:
- Participants can only *add* a response (with consent). They can't read, edit or delete any.
- Only Google accounts listed in the `admins` collection can read responses.
- Nobody can edit or delete responses from the app. Use the Firebase console if a participant asks for their data to be removed.

**Adding an admin** (Firebase console, about a minute):
1. One-time setup: in **Authentication → Sign-in method**, enable **Google**.
2. The new admin opens `admin.html` and signs in. The page says "not an admin" and shows their ID.
3. In **Firestore → Data**, create a collection `admins` (first time only) and add a document whose **ID is that user ID**. It can contain any field, such as `name: "Supervisor"`.
4. The admin presses Sign out, then signs in again.

To remove an admin, delete their document from `admins`.

Changes to the questions must also be reflected in the `research_responses` rule's list of answer keys, or new answers will be rejected.

## Built with

Plain HTML, CSS and JavaScript · Firebase Firestore (history) · jsPDF (PDF export) · scikit-learn Random Forest, exported to JavaScript
