// Class 3 Olympiad Quiz - vanilla JS, no build step.

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------- Shuffle helpers ---------- */

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleQuestions(questions) {
  return shuffleArray(questions).map(q => {
    const order = shuffleArray(q.options.map((_, i) => i));
    return {
      ...q,
      options: order.map(i => q.options[i]),
      answer: order.indexOf(q.answer)
    };
  });
}

/* ---------- Sound effects (Web Audio, no files needed) ---------- */

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, startTime, duration, type = 'sine', gainPeak = 0.2) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playCorrectSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => playTone(f, now + i * 0.09, 0.18));
  } catch (err) { /* audio not available */ }
}

function playWrongSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    playTone(220, now, 0.25, 'sawtooth', 0.12);
    playTone(160, now + 0.12, 0.25, 'sawtooth', 0.12);
  } catch (err) { /* audio not available */ }
}

function playStreakSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, now + i * 0.08, 0.2, 'triangle', 0.18));
  } catch (err) { /* audio not available */ }
}

function playFinishSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, now + i * 0.12, 0.3, 'triangle', 0.2));
  } catch (err) { /* audio not available */ }
}

/* ---------- Character rewards ---------- */

const STREAK_CHARACTERS = ['🦁', '🐸', '🐵', '🦉', '🐢', '🐬', '🦋', '🐧', '🐨', '🦄', '🐯', '🐰', '🦊', '🐼', '🐝'];
const FINISH_CHARACTERS = ['🏆', '🥇', '🌟', '👑', '💎', '🚀', '🎖️', '🌈'];
const CHARACTERS_KEY = 'olympiad_characters';

function loadCollection() {
  try {
    return JSON.parse(localStorage.getItem(CHARACTERS_KEY)) || [];
  } catch (err) {
    return [];
  }
}

function saveCollection(collection) {
  try {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(collection));
  } catch (err) { /* storage not available */ }
}

function awardCharacter(emoji, reason) {
  const collection = loadCollection();
  collection.push({ emoji, reason, date: new Date().toISOString() });
  saveCollection(collection);
  return collection;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function showCharacterPopup(emoji, message) {
  const popup = document.createElement('div');
  popup.className = 'character-popup';
  popup.innerHTML = `
    <div class="character-popup-emoji">${emoji}</div>
    <div class="character-popup-text">${escapeHtml(message)}</div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('character-popup-hide'), 1800);
  setTimeout(() => popup.remove(), 2400);
}

async function loadCharacterAlbum(rootId) {
  const root = document.getElementById(rootId);
  const collection = loadCollection();
  if (collection.length === 0) {
    root.innerHTML = '<p class="loading">No characters yet. Play a quiz and answer 3 in a row correctly to win one!</p>';
    return;
  }
  let html = `<p class="album-count">You have collected ${collection.length} character${collection.length === 1 ? '' : 's'}!</p>`;
  html += '<div class="character-grid">';
  collection.slice().reverse().forEach(item => {
    html += `<div class="character-tile">
      <div class="character-tile-emoji">${item.emoji}</div>
      <div class="character-tile-reason">${escapeHtml(item.reason)}</div>
    </div>`;
  });
  html += '</div>';
  root.innerHTML = html;
}

async function loadChapterList(rootId) {
  const root = document.getElementById(rootId);
  try {
    const res = await fetch('data/chapters.json');
    const data = await res.json();
    root.innerHTML = '';
    data.chapters.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'chapter-card';
      card.innerHTML = `
        <div class="chapter-info">
          <h2>Chapter ${ch.id}: ${escapeHtml(ch.title)}</h2>
          <p>25 questions</p>
        </div>
        <a class="btn" href="quiz.html?chapter=${ch.id}">Start Quiz</a>
      `;
      root.appendChild(card);
    });
  } catch (err) {
    root.innerHTML = '<p class="loading">Could not load chapters. Please refresh the page.</p>';
    console.error(err);
  }
}

async function runQuiz(rootId) {
  const root = document.getElementById(rootId);
  const chapterId = qs('chapter');
  const titleEl = document.getElementById('chapterTitle');

  if (!chapterId) {
    root.innerHTML = '<p class="loading">No chapter selected. <a href="index.html">Go back</a>.</p>';
    return;
  }

  let chaptersMeta, chapterData;
  try {
    const [metaRes, dataRes] = await Promise.all([
      fetch('data/chapters.json'),
      fetch(`data/ch${chapterId}.json`)
    ]);
    chaptersMeta = await metaRes.json();
    chapterData = await dataRes.json();
  } catch (err) {
    root.innerHTML = '<p class="loading">Could not load this chapter. Please refresh the page.</p>';
    console.error(err);
    return;
  }

  titleEl.textContent = `Chapter ${chapterId}: ${chapterData.title}`;
  document.title = `${chapterData.title} – Class 3 Olympiad Quiz`;

  const questions = shuffleQuestions(chapterData.questions);
  const total = questions.length;
  const userAnswers = new Array(total).fill(null);
  let current = 0;
  let streak = 0;

  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  function updateProgress(indexForDisplay) {
    const pct = Math.round((indexForDisplay / total) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = `Question ${Math.min(indexForDisplay + 1, total)} of ${total}`;
  }

  function letterFor(i) { return String.fromCharCode(65 + i); }

  function renderQuestion(index) {
    updateProgress(index);
    const q = questions[index];
    const card = document.createElement('div');
    card.className = 'question-card';

    let html = `<div class="question-number">Question ${index + 1} of ${total}</div>`;
    html += `<p class="question-text">${escapeHtml(q.text)}</p>`;
    if (q.image) {
      html += `<img class="question-image" src="${q.image}" alt="Question image">`;
    }
    if (q.extraImages) {
      html += '<div class="extra-images">';
      q.extraImages.forEach((src, i) => {
        const label = (q.extraLabels && q.extraLabels[i]) || '';
        html += `<figure><img src="${src}" alt="${escapeHtml(label)}"><figcaption>${escapeHtml(label)}</figcaption></figure>`;
      });
      html += '</div>';
    }
    html += '<div class="options">';
    q.options.forEach((opt, i) => {
      html += `<button class="option-btn" data-index="${i}">
        <span class="option-letter">${letterFor(i)}</span>`;
      if (opt.image) {
        html += `<img src="${opt.image}" alt="${escapeHtml(opt.label || 'Option ' + letterFor(i))}">`;
        if (opt.label) html += `<span class="option-label">${escapeHtml(opt.label)}</span>`;
      } else {
        html += `<span class="option-label">${escapeHtml(opt.text || '')}</span>`;
      }
      html += '</button>';
    });
    html += '</div>';
    html += '<div class="feedback-slot"></div>';
    html += '<div class="actions"></div>';

    card.innerHTML = html;
    root.innerHTML = '';
    root.appendChild(card);

    const buttons = Array.from(card.querySelectorAll('.option-btn'));
    buttons.forEach(btn => {
      btn.addEventListener('click', () => selectAnswer(index, parseInt(btn.dataset.index, 10), card, buttons));
    });
  }

  function selectAnswer(qIndex, chosenIndex, card, buttons) {
    if (userAnswers[qIndex] !== null) return; // already answered
    const q = questions[qIndex];
    userAnswers[qIndex] = chosenIndex;
    const isCorrect = chosenIndex === q.answer;

    buttons.forEach(b => { b.disabled = true; });
    buttons[q.answer].classList.add('correct');
    if (!isCorrect) buttons[chosenIndex].classList.add('wrong');

    const feedbackSlot = card.querySelector('.feedback-slot');
    feedbackSlot.innerHTML = `<div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
      ${isCorrect ? '✓ Correct!' : '✗ Not quite. The correct answer is ' + letterFor(q.answer) + '.'}
    </div>`;

    if (isCorrect) {
      streak++;
      playCorrectSound();
      if (streak > 0 && streak % 3 === 0) {
        const emoji = randomFrom(STREAK_CHARACTERS);
        awardCharacter(emoji, `${streak} in a row in Chapter ${chapterId}`);
        setTimeout(() => {
          playStreakSound();
          showCharacterPopup(emoji, `${streak} in a row! You won a new character!`);
        }, 300);
      }
    } else {
      streak = 0;
      playWrongSound();
    }

    const actions = card.querySelector('.actions');
    const isLast = qIndex === total - 1;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn';
    nextBtn.textContent = isLast ? 'See results' : 'Next question';
    nextBtn.addEventListener('click', () => {
      if (isLast) {
        showResults();
      } else {
        current = qIndex + 1;
        renderQuestion(current);
      }
    });
    actions.appendChild(nextBtn);
  }

  function showResults() {
    updateProgress(total);
    let score = 0;
    questions.forEach((q, i) => { if (userAnswers[i] === q.answer) score++; });

    playFinishSound();
    const finishEmoji = randomFrom(FINISH_CHARACTERS);
    awardCharacter(finishEmoji, `Finished Chapter ${chapterId} with ${score}/${total}`);

    let html = `<div class="score-banner">
      <div class="score-big">${score} / ${total}</div>
      <p>You got ${score} out of ${total} questions correct.</p>
      <div class="finish-character">
        <div class="finish-character-emoji">${finishEmoji}</div>
        <p>You won a bonus character for finishing this chapter!</p>
      </div>
      <a class="btn secondary" href="index.html">Back to chapters</a>
      <a class="btn secondary" href="characters.html" style="margin-left:0.5rem;">My characters</a>
      <button class="btn" id="retryBtn" style="margin-left:0.5rem;">Retry this chapter</button>
    </div>`;

    questions.forEach((q, i) => {
      const userIdx = userAnswers[i];
      const correctIdx = q.answer;
      const gotIt = userIdx === correctIdx;
      html += `<div class="review-item">
        <div class="review-q">${i + 1}. ${escapeHtml(q.text)}</div>`;
      if (q.image) html += `<img class="question-image" style="max-height:160px;" src="${q.image}" alt="">`;
      html += optionLine(q, userIdx, 'your', gotIt);
      if (!gotIt) html += optionLine(q, correctIdx, 'correct', true);
      html += '</div>';
    });

    root.innerHTML = html;
    document.getElementById('retryBtn').addEventListener('click', () => {
      window.location.reload();
    });
    window.scrollTo(0, 0);
  }

  function optionLine(q, idx, kind, isRight) {
    const opt = q.options[idx];
    const letter = letterFor(idx);
    const cls = kind === 'your' ? (isRight ? 'your-correct' : 'your-wrong') : 'correct-answer';
    const prefix = kind === 'your' ? 'Your answer' : 'Correct answer';
    let content = '';
    if (opt.image) {
      content = `<img class="review-thumb" src="${opt.image}" alt="">${opt.label ? escapeHtml(opt.label) : 'Option ' + letter}`;
    } else {
      content = escapeHtml(opt.text || '');
    }
    return `<p class="review-line ${cls}">${prefix} (${letter}): ${content}</p>`;
  }

  renderQuestion(current);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
