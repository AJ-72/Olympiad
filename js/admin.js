const $ = id => document.getElementById(id);
const LETTERS = "ABCD";
const DATA_PATH = "data/questions.json";
let questions = []; // [{ q, options: [4], answer }]

// ---------- Settings (kept in this browser only) ----------
const SETTINGS = ["owner", "repo", "branch", "token"];
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("olySettings") || "{}");
    SETTINGS.forEach(k => { if (s[k]) $(k).value = s[k]; });
  } catch {}
  showSettingsState();
}
function showSettingsState() {
  $("settingsState").textContent = $("token").value ? "· token saved" : "· no token yet";
  if (!$("token").value) $("settingsBox").open = true;
}
$("saveSettings").onclick = () => {
  const s = Object.fromEntries(SETTINGS.map(k => [k, $(k).value.trim()]));
  try { localStorage.setItem("olySettings", JSON.stringify(s)); } catch {}
  showSettingsState();
  loadExisting();
};

// ---------- GitHub API ----------
const cfg = () => Object.fromEntries(SETTINGS.map(k => [k, $(k).value.trim()]));
function b64decode(s) { return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), c => c.charCodeAt(0))); }
function b64encode(s) { return btoa(Array.from(new TextEncoder().encode(s), b => String.fromCharCode(b)).join("")); }

async function readData() {
  const c = cfg();
  if (!c.token) { // no token: read the published copy
    const r = await fetch(DATA_PATH, { cache: "no-store" });
    return { data: await r.json(), sha: null };
  }
  const r = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${DATA_PATH}?ref=${encodeURIComponent(c.branch)}`,
    { headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`GitHub read failed (${r.status}). Check the settings and the token.`);
  const j = await r.json();
  return { data: JSON.parse(b64decode(j.content)), sha: j.sha };
}

async function writeData(data, sha, message) {
  const c = cfg();
  const r = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${DATA_PATH}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({ message, content: b64encode(JSON.stringify(data, null, 2) + "\n"), sha, branch: c.branch }),
  });
  if (!r.ok) throw new Error(`GitHub save failed (${r.status}): ${(await r.json()).message || ""}`);
}

// ---------- Existing chapters ----------
let saved = [];
async function loadExisting() {
  try {
    saved = (await readData()).data.chapters;
  } catch (e) { saved = []; }
  const sel = $("existing");
  sel.length = 1;
  saved.forEach((c, i) => sel.add(new Option(`${c.class} · Chapter ${c.chapter}: ${c.title}`, i)));
}
$("existing").onchange = e => {
  if (e.target.value === "") return;
  const c = saved[+e.target.value];
  $("cls").value = c.class; $("chapter").value = c.chapter; $("title").value = c.title;
  questions = structuredClone(c.questions);
  $("warnings").innerHTML = "";
  render();
};

// ---------- OCR ----------
async function toCanvas(file) {
  const img = await createImageBitmap(file, { imageOrientation: "from-image" });
  // Tesseract works best when text is about 30 px high; enlarge small photos.
  const scale = img.width < 2000 ? 2000 / img.width : 1;
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
  const ctx = cv.getContext("2d");
  ctx.filter = "grayscale(1) contrast(1.4)";
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

$("readBtn").onclick = async () => {
  const pages = [...$("pages").files], answerPages = [...$("answers").files];
  if (!pages.length) { $("progress").textContent = "Select the question photos first."; return; }
  $("readBtn").disabled = true;
  const raw = [];
  try {
    const worker = await Tesseract.createWorker("eng");
    // psm 6 reads the page row by row, so options in columns stay on one line.
    await worker.setParameters({ tessedit_pageseg_mode: "6" });
    const read = async (file, label) => {
      $("progress").textContent = `Reading ${label}…`;
      const { data } = await worker.recognize(await toCanvas(file));
      raw.push(`===== ${label}: ${file.name} =====\n${data.text}`);
      return data.text;
    };
    let found = [];
    for (const [i, f] of pages.entries()) found = found.concat(OlyParse.parseQuestions(await read(f, `page ${i + 1}`)));
    let answers = {};
    for (const [i, f] of answerPages.entries()) Object.assign(answers, OlyParse.parseAnswers(await read(f, `answer page ${i + 1}`)));
    await worker.terminate();

    const res = OlyParse.combine(found, answers);
    questions = res.questions;
    $("warnings").innerHTML = res.warnings.map(w => `<li>${esc(w)}</li>`).join("");
    $("progress").textContent = `Found ${questions.length} questions, ${questions.filter(q => q.answer).length} answers.`;
    $("raw").textContent = raw.join("\n\n");
    $("rawBox").hidden = false;
    render();
  } catch (e) {
    $("progress").textContent = "OCR failed: " + e.message;
  } finally {
    $("readBtn").disabled = false;
  }
};

// ---------- Editor ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function render() {
  $("editor").innerHTML = questions.map((q, i) => `
    <div class="q" data-i="${i}">
      <div class="qhead"><strong>Q${i + 1}</strong><button type="button" class="link" data-del="${i}">Delete</button></div>
      <textarea data-f="q" rows="3">${esc(q.q)}</textarea>
      <div class="opts">
        ${[0, 1, 2, 3].map(j => `
          <label class="opt-edit">
            <input type="radio" name="ans${i}" value="${LETTERS[j]}" ${q.answer === LETTERS[j] ? "checked" : ""} title="Correct answer">
            (${LETTERS[j]}) <input data-f="o${j}" value="${esc(q.options[j] || "")}">
          </label>`).join("")}
      </div>
    </div>`).join("") || `<p class="muted">No questions yet. Read photos or add a question.</p>`;
}

$("editor").addEventListener("input", e => {
  const box = e.target.closest(".q"); if (!box) return;
  const q = questions[+box.dataset.i], f = e.target.dataset.f;
  if (f === "q") q.q = e.target.value;
  else if (f) q.options[+f.slice(1)] = e.target.value;
  else if (e.target.type === "radio") q.answer = e.target.value;
});
$("editor").addEventListener("click", e => {
  if (e.target.dataset.del === undefined) return;
  questions.splice(+e.target.dataset.del, 1);
  render();
});
$("addQ").onclick = () => { questions.push({ q: "", options: ["", "", "", ""], answer: "" }); render(); };

// ---------- Save ----------
$("saveBtn").onclick = async () => {
  const chapter = {
    class: $("cls").value.trim(),
    chapter: +$("chapter").value,
    title: $("title").value.trim(),
    questions: questions.map(q => ({ q: q.q.trim(), options: q.options.map(o => o.trim()), answer: q.answer })),
  };
  const errors = OlyParse.validate(chapter);
  if (!cfg().token) errors.push("Add your GitHub token in GitHub settings");
  $("errors").innerHTML = errors.map(e => `<li>${esc(e)}</li>`).join("");
  if (errors.length) return;

  $("saveBtn").disabled = true;
  $("saveState").textContent = "Saving…";
  try {
    const { data, sha } = await readData();
    const exists = data.chapters.some(c => c.class === chapter.class && c.chapter === chapter.chapter);
    if (exists && !confirm(`${chapter.class} Chapter ${chapter.chapter} is already saved. Replace it?`)) {
      $("saveState").textContent = "Not saved.";
      return;
    }
    data.chapters = data.chapters.filter(c => !(c.class === chapter.class && c.chapter === chapter.chapter));
    data.chapters.push(chapter);
    data.chapters.sort((a, b) => a.class.localeCompare(b.class) || a.chapter - b.chapter);
    await writeData(data, sha, `${exists ? "Update" : "Add"} ${chapter.class} Chapter ${chapter.chapter}: ${chapter.title}`);
    $("saveState").textContent = "Saved. The quiz site updates in about 1 minute.";
    loadExisting();
  } catch (e) {
    $("saveState").textContent = e.message;
  } finally {
    $("saveBtn").disabled = false;
  }
};

loadSettings();
loadExisting();
render();
