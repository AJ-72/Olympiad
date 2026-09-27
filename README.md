# Olympiad

Olympiad book questions as a quiz page and as Google Forms (one form per chapter).

## How it works

- `data/questions.json` — the only place questions live. One entry per chapter.
- `node build.js` — checks the data, then writes `index.html` (quiz page) and `google-form.gs`.
- `google-form.gs` — paste into https://script.google.com and run `createForms()`.
  Only new chapters get a form; links collect in the "Olympiad forms" Google Sheet.
  To redo a corrected chapter: `resetChapter("Class 3", 1)`, then `createForms()`.

## Adding chapters

Send photos of the book pages. Each photo's questions go into `data/questions.json`,
then run `node build.js`. Do not edit `google-form.gs` or the data in `index.html` by hand.

## Reading photos with Tesseract (Windows)

One-time setup:
1. Install Python 3 from https://www.python.org (tick "Add python.exe to PATH").
2. Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki (default folder).
3. Install Node.js from https://nodejs.org (needed for `node build.js`).
4. In the project folder: `pip install -r tools\requirements.txt`

For each chapter:
```
python tools\ocr_questions.py --class "Class 3" --chapter 2 --title "Chapter title" ^
    --pages photos\ch2_p1.jpg photos\ch2_p2.jpg --answers photos\answers.jpg
```
Add `--dry-run` to see the result without saving. Read the WARNING lines, fix those
questions in `data/questions.json` (picture options, OCR spelling errors, missing answers),
then run `node build.js`. Raw OCR text for each photo is in `ocr_output\`.

Photo tips: take each page flat, straight from above, in good light, at full camera
resolution. Small or angled photos give poor results.
