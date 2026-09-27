// Class 3 Olympiad Quiz - vanilla JS, no build step.

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
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

  const questions = chapterData.questions;
  const total = questions.length;
  const userAnswers = new Array(total).fill(null);
  let current = 0;

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

    let html = `<div class="score-banner">
      <div class="score-big">${score} / ${total}</div>
      <p>You got ${score} out of ${total} questions correct.</p>
      <a class="btn secondary" href="index.html">Back to chapters</a>
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
