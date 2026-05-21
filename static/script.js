/* ── HELPERS ── */
const $ = id => document.getElementById(id);

function showLoading(msg = "Thinking…") {
  $('loader-text').textContent = msg;
  $('loading-overlay').classList.add('show');
}
function hideLoading() { $('loading-overlay').classList.remove('show'); }

function showToast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function showSection(id) {
  const el = $(id);
  if (el) { el.style.display = 'block'; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
function hideSection(id) { const el = $(id); if (el) el.style.display = 'none'; }

function getLevel() {
  const active = document.querySelector('.level-pill.active');
  return active ? active.dataset.level : 'Beginner';
}

function getTopic() {
  const t = $('topic-input').value.trim();
  if (!t) { showToast('⚠️ Please enter a topic first.'); return null; }
  return t;
}

/* ── LEVEL PILLS ── */
document.querySelectorAll('.level-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.level-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
  });
});

/* ── HAMBURGER ── */
$('hamburger').addEventListener('click', () => {
  $('mobile-menu').classList.toggle('open');
});
document.querySelectorAll('.mobile-menu .nav-link').forEach(link => {
  link.addEventListener('click', () => $('mobile-menu').classList.remove('open'));
});

/* ── NAVBAR SCROLL ── */
window.addEventListener('scroll', () => {
  $('navbar').style.boxShadow = window.scrollY > 10 ? '0 1px 40px rgba(0,0,0,0.5)' : '';
});

/* ────────────────────────────────────────────
   MARKDOWN → HTML (minimal, no lib needed)
────────────────────────────────────────────── */
function renderMarkdown(text) {
  let h = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${h}</p>`;
}

/* ────────────────────────────────────────────
   NOTES
────────────────────────────────────────────── */
async function generateNotes() {
  const topic = getTopic(); if (!topic) return;
  showLoading('Generating notes…');
  trackTopic(topic);
  try {
    const res = await fetch('/generate-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level: getLevel() })
    });
    const data = await res.json();
    if (data.error) { showToast('❌ ' + data.error); return; }
    const out = $('notes-output');
    out.innerHTML = renderMarkdown(data.notes);
    showSection('notes-section');
  } catch (e) { showToast('❌ Network error. Is Flask running?'); }
  finally { hideLoading(); }
}

/* ────────────────────────────────────────────
   FLASHCARDS
────────────────────────────────────────────── */
let flashcards = [], fcIndex = 0;

async function generateFlashcards() {
  const topic = getTopic(); if (!topic) return;
  showLoading('Generating flashcards…');
  trackTopic(topic);
  try {
    const res = await fetch('/generate-flashcards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level: getLevel() })
    });
    const data = await res.json();
    if (data.error) { showToast('❌ ' + data.error); return; }
    flashcards = data.flashcards;
    fcIndex = 0;
    renderFlashcard();
    showSection('flashcards-section');
  } catch (e) { showToast('❌ Network error. Is Flask running?'); }
  finally { hideLoading(); }
}

function renderFlashcard() {
  if (!flashcards.length) return;
  const card = flashcards[fcIndex];
  $('fc-front').textContent = card.question;
  $('fc-back').textContent = card.answer;
  $('fc-counter').textContent = `${fcIndex + 1} / ${flashcards.length}`;
  $('flashcard-inner').classList.remove('flipped');
}

function flipCard() {
  $('flashcard-inner').classList.toggle('flipped');
  if ($('flashcard-inner').classList.contains('flipped')) {
    trackFlashcard();
  }
}

function nextCard() {
  if (!flashcards.length) return;
  fcIndex = (fcIndex + 1) % flashcards.length;
  renderFlashcard();
}

function prevCard() {
  if (!flashcards.length) return;
  fcIndex = (fcIndex - 1 + flashcards.length) % flashcards.length;
  renderFlashcard();
}

/* ────────────────────────────────────────────
   QUIZ
────────────────────────────────────────────── */
let quizQuestions = [], quizScore = 0, quizAnswered = 0;

async function generateQuiz() {
  const topic = getTopic(); if (!topic) return;
  showLoading('Generating quiz…');
  trackTopic(topic);
  try {
    const res = await fetch('/generate-quiz', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level: getLevel() })
    });
    const data = await res.json();
    if (data.error) { showToast('❌ ' + data.error); return; }
    quizQuestions = data.quiz;
    quizScore = 0; quizAnswered = 0;
    renderQuiz();
    $('quiz-result').style.display = 'none';
    showSection('quiz-section');
  } catch (e) { showToast('❌ Network error. Is Flask running?'); }
  finally { hideLoading(); }
}

function renderQuiz() {
  const out = $('quiz-output');
  out.innerHTML = '';
  quizQuestions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'quiz-question glass-card';
    div.id = `q-${i}`;
    div.innerHTML = `
      <div class="quiz-q-num">Question ${i + 1} of ${quizQuestions.length}</div>
      <div class="quiz-q-text">${escapeHtml(q.question)}</div>
      <div class="quiz-options">
        ${q.options.map(opt => `
          <button class="quiz-option" onclick="checkAnswer(${i}, this, '${escapeAttr(opt)}', '${escapeAttr(q.correctAnswer)}')">
            ${escapeHtml(opt)}
          </button>`).join('')}
      </div>`;
    out.appendChild(div);
  });
}

function checkAnswer(qIndex, btn, selected, correct) {
  const qDiv = $(`q-${qIndex}`);
  const buttons = qDiv.querySelectorAll('.quiz-option');
  buttons.forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correct.trim()) b.classList.add('correct');
  });
  if (selected.trim() === correct.trim()) {
    btn.classList.add('correct');
    quizScore++;
  } else {
    btn.classList.add('wrong');
  }
  quizAnswered++;
  if (quizAnswered === quizQuestions.length) {
    setTimeout(showQuizResult, 600);
  }
}

function showQuizResult() {
  const total = quizQuestions.length;
  const pct = Math.round((quizScore / total) * 100);
  $('result-emoji').textContent = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚';
  $('result-score').textContent = `Score: ${quizScore} / ${total}`;
  $('result-msg').textContent = pct >= 80 ? 'Excellent work! You have a strong grasp of this topic.'
    : pct >= 50 ? 'Good effort! Review the questions you missed and try again.'
    : 'Keep studying — you\'ll get there! Review the material and try once more.';
  $('quiz-result').style.display = 'block';
  $('quiz-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
  trackQuizScore(quizScore, total);
}

/* ────────────────────────────────────────────
   ACTIVE RECALL
────────────────────────────────────────────── */
let recallQuestions = [], recallTopic = '';

async function generateRecall() {
  const topic = getTopic(); if (!topic) return;
  showLoading('Generating recall questions…');
  recallTopic = topic;
  trackTopic(topic);
  try {
    const res = await fetch('/generate-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: `Generate 5 open-ended active recall questions for: ${topic}. Level: ${getLevel()}. Return only the questions as a numbered list.`, level: getLevel() })
    });
    const data = await res.json();
    if (data.error) { showToast('❌ ' + data.error); return; }
    // Parse numbered questions from notes output
    const lines = data.notes.split('\n').filter(l => /^\d+[\.\)]/.test(l.trim()));
    recallQuestions = lines.length ? lines.map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()) : [data.notes];
    renderRecall();
    showSection('recall-section');
  } catch (e) { showToast('❌ Network error. Is Flask running?'); }
  finally { hideLoading(); }
}

function renderRecall() {
  const out = $('recall-output');
  out.innerHTML = '';
  recallQuestions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'glass-card recall-card';
    div.innerHTML = `
      <div class="quiz-q-num">Question ${i + 1}</div>
      <div class="recall-question">${escapeHtml(q)}</div>
      <textarea class="recall-textarea" id="recall-ans-${i}" placeholder="Type your answer here…"></textarea>
      <button class="btn btn-ghost btn-sm" onclick="submitRecall(${i}, '${escapeAttr(q)}')">Submit Answer</button>
      <div class="recall-feedback" id="recall-fb-${i}"></div>`;
    out.appendChild(div);
  });
}

async function submitRecall(i, question) {
  const ans = $(`recall-ans-${i}`).value.trim();
  if (!ans) { showToast('Please write an answer first.'); return; }
  const fbEl = $(`recall-fb-${i}`);
  fbEl.textContent = 'Evaluating…'; fbEl.className = 'recall-feedback show';
  trackRecall();
  try {
    const res = await fetch('/active-recall', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: recallTopic, question, answer: ans })
    });
    const data = await res.json();
    if (data.error) { fbEl.textContent = '❌ ' + data.error; return; }
    const cls = data.verdict === 'Correct' ? 'correct' : data.verdict === 'Partially Correct' ? 'partial' : 'incorrect';
    const icon = data.verdict === 'Correct' ? '✅' : data.verdict === 'Partially Correct' ? '🟡' : '❌';
    fbEl.className = `recall-feedback show ${cls}`;
    fbEl.innerHTML = `<span class="verdict-badge">${icon} ${data.verdict}</span>${escapeHtml(data.feedback)}`;
  } catch (e) { fbEl.textContent = '❌ Network error. Is Flask running?'; }
}

/* ────────────────────────────────────────────
   PROGRESS TRACKING
────────────────────────────────────────────── */
function getProgress() {
  return JSON.parse(localStorage.getItem('sb_progress') || '{"topics":[],"flashcards":0,"quiz":null,"recalls":0}');
}
function saveProgress(p) { localStorage.setItem('sb_progress', JSON.stringify(p)); }

function trackTopic(topic) {
  const p = getProgress();
  if (!p.topics.includes(topic)) { p.topics.push(topic); saveProgress(p); }
  updateProgressUI();
}
function trackFlashcard() {
  const p = getProgress(); p.flashcards++; saveProgress(p); updateProgressUI();
}
function trackQuizScore(score, total) {
  const p = getProgress(); p.quiz = `${score}/${total}`; saveProgress(p); updateProgressUI();
}
function trackRecall() {
  const p = getProgress(); p.recalls++; saveProgress(p); updateProgressUI();
}
function clearProgress() {
  localStorage.removeItem('sb_progress'); updateProgressUI(); showToast('Progress reset.');
}
function updateProgressUI() {
  const p = getProgress();
  $('stat-topics').textContent = p.topics.length;
  $('stat-flashcards').textContent = p.flashcards;
  $('stat-quizscore').textContent = p.quiz || '—';
  $('stat-recalls').textContent = p.recalls;
  const chips = $('topics-chips');
  chips.innerHTML = p.topics.length
    ? p.topics.map(t => `<span class="topic-chip-item">${escapeHtml(t)}</span>`).join('')
    : '<span style="color:var(--text-dim);font-size:0.9rem">No topics yet. Start learning!</span>';
}

/* ── SANITIZE HELPERS ── */
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeAttr(s) {
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}

/* ── INIT ── */
updateProgressUI();
