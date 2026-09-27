# Olympiad

Olympiad book questions as a web quiz, published with GitHub Pages.

- **Quiz page** (`index.html`): children pick a chapter and answer; each answer is marked at once.
- **Add chapter page** (`admin.html`): select book photos, the browser reads them with
  Tesseract.js, you correct the questions and choose answers, then save to GitHub.
- **Data** (`data/questions.json`): the only place questions live. Saving from the add
  chapter page commits this file; the site republishes in about a minute.

## One-time setup

1. Make the repository public (Settings → General → Danger Zone → Change visibility).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Merge to `main`. The workflow `.github/workflows/pages.yml` publishes the site to
   `https://aj-72.github.io/Olympiad/`.
4. Make a fine-grained token (GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained): repository access **only AJ-72/Olympiad**, permission **Contents: Read and write**.
   Paste it in "GitHub settings" on the add chapter page. It stays in that browser only.

## Other tools

- `node build.js` checks `data/questions.json` and writes `google-form.gs`
  (Apps Script: one Google Form per chapter; run `createForms()` at https://script.google.com).
- `tools/ocr_questions.py` is the command-line OCR version (Python + Tesseract).

Photo tips: take each page flat, from above, in good light, at full camera resolution.
Crop the answer photo to one chapter. OCR cannot read picture options; type those in.
