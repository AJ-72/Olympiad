// Turns OCR text into questions and answers. Same rules as tools/ocr_questions.py.
// Works in the browser (window.OlyParse) and in Node (require) for tests.
(function (root) {
  // "(A)" and usual OCR mistakes for it: {A), [A], (0) for (D), (8) for (B).
  const OPTION_MARK = /[({[]\s*([A-Da-d0O8])\s*[)}\]]/g;
  // "5. Which ..." or "5 Which ..." (OCR often drops the full stop).
  const QUESTION_START = /^\s*(\d{1,3})\s*[.,)]?\s+(?=[A-Z])(.*)/;
  // Answer key entries: "1. (d)", "1-d", "1) D", "1 (D)", "1.d"
  const ANSWER_ENTRY = /\b(\d{1,3})\s*[.\-):]?\s*[({[]?\s*([A-Da-d])\s*[)}\]]?(?![A-Za-z])/g;
  const FIX = { 0: "D", O: "D", o: "D", 8: "B" };

  const letter = m => FIX[m] || m.toUpperCase();

  function parseQuestions(text) {
    const blocks = [];
    let current = null;
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(QUESTION_START);
      if (m) {
        current = { num: +m[1], text: m[2] };
        blocks.push(current);
      } else if (current && line.trim()) {
        current.text += " " + line.trim();
      }
    }
    const questions = [];
    for (const b of blocks) {
      const marks = [...b.text.matchAll(OPTION_MARK)];
      if (!marks.length) continue; // a heading that starts with a number
      const options = {};
      marks.forEach((m, i) => {
        const end = i + 1 < marks.length ? marks[i + 1].index : b.text.length;
        options[letter(m[1])] = b.text.slice(m.index + m[0].length, end).replace(/^[\s.;|]+|[\s.;|]+$/g, "");
      });
      questions.push({
        num: b.num,
        q: b.text.slice(0, marks[0].index).replace(/\s+/g, " ").trim(),
        options: [..."ABCD"].map(k => options[k] || ""),
      });
    }
    return questions;
  }

  function parseAnswers(text) {
    const out = {};
    for (const m of text.matchAll(ANSWER_ENTRY)) out[+m[1]] = m[2].toUpperCase();
    return out;
  }

  // Joins questions and answers and lists the problems a person must check.
  function combine(questions, answers) {
    const warnings = [];
    let expected = 1;
    const result = questions.map(q => {
      if (q.num !== expected) warnings.push(`Q${q.num}: expected question ${expected}; a question may be missing`);
      expected = q.num + 1;
      const missing = [..."ABCD"].filter((k, i) => !q.options[i]);
      if (missing.length) warnings.push(`Q${q.num}: option(s) ${missing.join(", ")} not found (picture options?)`);
      const answer = answers[q.num] || "";
      if (!answer) warnings.push(`Q${q.num}: no answer found`);
      return { q: q.q, options: q.options, answer };
    });
    return { questions: result, warnings };
  }

  // Same checks as build.js, so bad data is never saved.
  function validate(chapter) {
    const errors = [];
    if (!chapter.class || !chapter.chapter || !chapter.title) errors.push("Class, chapter number and title are required");
    chapter.questions.forEach((q, i) => {
      const where = `Q${i + 1}`;
      if (!q.q) errors.push(`${where}: missing question text`);
      if (q.options.filter(Boolean).length < 2) errors.push(`${where}: needs 2+ options`);
      if (!"ABCD".slice(0, q.options.length).includes(q.answer) || !q.answer || !q.options["ABCD".indexOf(q.answer)])
        errors.push(`${where}: choose a correct answer`);
    });
    if (!chapter.questions.length) errors.push("The chapter has no questions");
    return errors;
  }

  const api = { parseQuestions, parseAnswers, combine, validate };
  if (typeof module !== "undefined") module.exports = api;
  else root.OlyParse = api;
})(this);
