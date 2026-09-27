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
