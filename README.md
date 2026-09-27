# Olympiad

A quiz portal for the Class 3 Olympiad workbook, published with GitHub Pages.

- **Home page** (`index.html`): lists the 5 chapters.
- **Quiz page** (`quiz.html?chapter=N`): shows one question at a time. Each answer
  is checked right away, and a full review with the correct answers is shown at
  the end.
- **Data** (`data/ch1.json` &hellip; `data/ch5.json`): the 25 questions per chapter,
  taken from the book and its answer key. `data/chapters.json` lists the chapters.
- **Images** (`images/`): pictures used by questions that show a photo or a
  diagram (birds, organs, flags, app logos, etc.), cropped from the workbook.

## One-time setup

1. Make the repository public (Settings → General → Danger Zone → Change visibility).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Merge to `main`. The workflow `.github/workflows/pages.yml` publishes the site to
   `https://aj-72.github.io/Olympiad/`.

## Changing a question

Edit the matching `data/chN.json` file and open a pull request. Each question has
a `text`, an `options` array (each option has either `text` or an `image` path),
and an `answer` index (0 = A, 1 = B, 2 = C, 3 = D).
