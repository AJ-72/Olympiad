// Reads data/questions.json, checks it, and writes google-form.gs
// (Apps Script that makes one Google Form per chapter). The web pages read the JSON directly.
// Run: node build.js
const fs = require("fs");

const data = JSON.parse(fs.readFileSync("data/questions.json", "utf8"));
const LETTERS = "ABCD";

// Check the data so mistakes show here, not in the form.
const errors = [];
const seen = new Set();
data.chapters.forEach(c => {
  const key = `${c.class} / ${c.chapter}`;
  if (seen.has(key)) errors.push(`Duplicate chapter: ${key}`);
  seen.add(key);
  c.questions.forEach((q, i) => {
    const where = `${key}, Q${i + 1}`;
    if (!q.q) errors.push(`${where}: missing question text`);
    if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`${where}: needs 2+ options`);
    if (!LETTERS.slice(0, q.options.length).includes(q.answer)) errors.push(`${where}: bad answer "${q.answer}"`);
  });
});
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const json = JSON.stringify(data, null, 2);

const gs = fs.readFileSync("google-form.template.gs", "utf8").replace("/*DATA*/", json);
fs.writeFileSync("google-form.gs", gs);

const total = data.chapters.reduce((n, c) => n + c.questions.length, 0);
console.log(`OK: ${data.chapters.length} chapters, ${total} questions.`);
