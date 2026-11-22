import { QUESTIONS_PER_SESSION, LEVELS, RECENT_TARGET_COUNT } from './config.js';
import { loadVocabulary, makeQuestion } from './vocabulary.js';
import { gameSound, unlockAudio, playPronunciation, pausePronunciation, resumePronunciation, stopPronunciation } from './audio.js';

const el = id => document.getElementById(id);
const ui = { field: el('field'), score: el('score'), round: el('round'), progress: el('progress-fill'),
  level: el('level'), target: el('target'), overlay: el('overlay'), card: el('overlay-card'),
  start: el('start'), status: el('load-status'), feedback: el('feedback'),
  pause: el('pause-button'), stop: el('stop-button'), restart: el('restart-button') };
let vocabulary = [];
let state = { active: false, paused: false, score: 0, answered: 0, recentTargets: [], question: null, locked: false,
  items: [], frame: null, lastTime: null, feedbackTimer: null, generation: 0, pronunciationTimer: null, pronunciationPending: null, revealingMiss: false, revealElapsed: 0, revealAudioDone: false, revealingCorrect: false, correctAudioDone: false, questionSerial: 0 };

function levelForScore(score) { return [...LEVELS].reverse().find(level => score >= level.minScore) || LEVELS[0]; }
function showFeedback(message, success = false) {
  clearTimeout(state.feedbackTimer);
  ui.feedback.textContent = message;
  ui.feedback.className = 'feedback show ' + (success ? 'success' : 'error');
  state.feedbackTimer = setTimeout(() => ui.feedback.classList.remove('show'), 800);
}
function updateControls() {
  ui.pause.disabled = !state.active || state.paused;
  ui.stop.disabled = !state.active;
  ui.restart.disabled = !state.active;
}
function clearSessionEffects() {
  cancelAnimationFrame(state.frame);
  clearTimeout(state.feedbackTimer);
  clearTimeout(state.pronunciationTimer);
  stopPronunciation();
  ui.feedback.classList.remove('show');
}
function showEndScreen(heading, detail) {
  ui.card.innerHTML = `<div class="intro-art">🏆 🎉 ⭐</div><h1>${heading}</h1><p>${detail}</p><button class="primary" id="play-again">▶ Play again</button>`;
  el('play-again').addEventListener('click', begin);
  ui.overlay.classList.remove('hidden');
}
function endSession() {
  clearSessionEffects();
  state.active = false;
  state.paused = false;
  state.generation++;
  updateControls();
  showEndScreen('Great job!', `You matched <strong>${state.score} of ${QUESTIONS_PER_SESSION}</strong> words!`);
}
function stopSession() {
  if (!state.active) return;
  clearSessionEffects();
  state.active = false;
  state.paused = false;
  state.generation++;
  updateControls();
  showEndScreen('Game stopped', `You earned <strong>${state.score} points</strong> in ${state.answered} completed questions.`);
}
function pauseSession() {
  if (!state.active || state.paused) return;
  state.paused = true;
  cancelAnimationFrame(state.frame);
  clearTimeout(state.feedbackTimer);
  ui.feedback.classList.remove('show');
  // Preserve a pending pronunciation instead of allowing it to start during a pause.
  if (state.pronunciationPending) {
    clearTimeout(state.pronunciationTimer);
    state.pronunciationPending.remaining = Math.max(0, state.pronunciationPending.due - performance.now());
  }
  pausePronunciation();
  updateControls();
  ui.card.innerHTML = `<div class="intro-art">⏸️</div><h1>Paused</h1><p>Your words and score are right where you left them.</p><div class="overlay-actions"><button class="primary" id="resume-button">▶ Resume</button><button class="secondary" id="paused-restart">↻ Restart</button><button class="secondary" id="paused-stop">⏹ Stop</button></div>`;
  el('resume-button').addEventListener('click', resumeSession);
  el('paused-restart').addEventListener('click', begin);
  el('paused-stop').addEventListener('click', stopSession);
  ui.overlay.classList.remove('hidden');
}
function schedulePronunciation(pending) {
  clearTimeout(state.pronunciationTimer);
  pending.due = performance.now() + pending.remaining;
  state.pronunciationTimer = setTimeout(() => {
    state.pronunciationTimer = null;
    if (!state.active || state.paused || state.generation !== pending.generation) return;
    state.pronunciationPending = null;
    playPronunciation(pending.audio).then(() => {
      if (state.active && state.generation === pending.generation &&
          state.questionSerial === pending.questionSerial && state.revealingCorrect) {
        state.correctAudioDone = true;
      }
    });
  }, pending.remaining);
}
function resumeSession() {
  if (!state.active || !state.paused) return;
  state.paused = false;
  ui.overlay.classList.add('hidden');
  state.lastTime = null;
  if (state.pronunciationPending) schedulePronunciation(state.pronunciationPending);
  resumePronunciation();
  updateControls();
  state.frame = requestAnimationFrame(tick);
}
function begin() {
  unlockAudio(); // User click grants ongoing playback, including when words are missed.
  clearSessionEffects();
  state = { active: true, paused: false, score: 0, answered: 0, recentTargets: [], question: null, locked: false,
    items: [], frame: null, lastTime: null, feedbackTimer: null, generation: state.generation + 1,
    pronunciationTimer: null, pronunciationPending: null, revealingMiss: false, revealElapsed: 0, revealAudioDone: false, revealingCorrect: false, correctAudioDone: false, questionSerial: 0 };
  ui.score.textContent = '0';
  ui.overlay.classList.add('hidden');
  updateControls();
  nextQuestion();
}
function nextQuestion() {
  if (!state.active || state.paused) return;
  if (state.answered >= QUESTIONS_PER_SESSION) { endSession(); return; }
  state.locked = false;
  state.revealingMiss = false;
  state.revealingCorrect = false;
  state.correctAudioDone = false;
  state.questionSerial++;
  state.revealElapsed = 0;
  state.revealAudioDone = false;
  state.lastTime = null;
  const level = levelForScore(state.score);
  const question = makeQuestion(vocabulary, level, state.recentTargets);
  state.question = question;
  state.recentTargets.push(question.target.index);
  if (state.recentTargets.length > RECENT_TARGET_COUNT) state.recentTargets.shift();
  ui.target.textContent = question.target.emoji;
  ui.target.setAttribute('aria-label', 'Find the word for ' + question.target.english);
  ui.round.textContent = `Question ${state.answered + 1} of ${QUESTIONS_PER_SESSION}`;
  ui.progress.style.width = `${100 * state.answered / QUESTIONS_PER_SESSION}%`;
  ui.level.textContent = level.label;
  ui.field.querySelectorAll('.choice').forEach(e => e.remove());
  ui.feedback.classList.remove('show');

  const width = ui.field.clientWidth;
  const height = ui.field.clientHeight;
  const n = question.choices.length;
  // Horizontal lanes prevent words from overlapping. One word occupies each lane.
  const lanes = Array.from({length:n},(_,i)=>i).sort(()=>Math.random()-.5);
  state.items = question.choices.map((word,i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'choice'; button.textContent = word.kirundi;
    button.addEventListener('click', () => choose(word, button));
    ui.field.appendChild(button);
    const w = button.offsetWidth, h = button.offsetHeight;
    const laneWidth = width / n;
    let x = lanes[i] * laneWidth + (laneWidth - w) / 2;
    x = Math.max(4, Math.min(width - w - 4, x));
    // All levels use the same gentle speed. Advanced levels shorten the
    // journey by starting the words higher up rather than making them faster.
    const y = height * level.startY + i * Math.min(10, height * .02);
    button.style.left = `${x}px`;
    button.style.transform = `translateY(${y}px)`;
    return { word, button, y, height:h, speed:level.speed * (0.98 + Math.random() * .04) };
  });
  cancelAnimationFrame(state.frame);
  state.frame = requestAnimationFrame(tick);
}
function choose(word, button) {
  if (!state.active || state.paused || state.locked || button.classList.contains('wrong')) return;
  if (word.index !== state.question.target.index) {
    gameSound(false);
    button.classList.add('wrong');
    showFeedback('Try again!');
    setTimeout(() => button.classList.remove('wrong'), 400);
    return;
  }
  state.locked = true;
  state.score++;
  ui.score.textContent = state.score;
  button.classList.add('correct');
  state.items.forEach(item => { if (item.button !== button) item.button.classList.add('faded'); });
  gameSound(true);
  showFeedback('⭐ +1 Great job!', true);
  // Keep this emoji and the selected word visible until its pronunciation finishes.
  // Pause the word animation during the success feedback and pronunciation.
  state.revealingCorrect = true;
  state.correctAudioDone = false;
  state.revealElapsed = 0;
  const pending = {
    audio: word.audio, generation: state.generation,
    questionSerial: state.questionSerial, remaining: 330, due: 0
  };
  state.pronunciationPending = pending;
  schedulePronunciation(pending);
  // The tick loop handles the transition after the entire recording finishes.

}
function finishQuestion() {
  state.answered++;
  if (state.answered >= QUESTIONS_PER_SESSION) endSession();
  else nextQuestion();
}
function tick(time) {
  if (!state.active || state.paused) return;
  const delta = state.lastTime == null ? 0 : Math.min((time - state.lastTime)/1000, .06);
  state.lastTime = time;
  if (state.revealingMiss || state.revealingCorrect) {
    // Keep the answer visible while the entire pronunciation is played.
    // The elapsed reveal time and audio both pause with the game.
    state.revealElapsed += delta;
    if ((state.revealingMiss && state.revealAudioDone && state.revealElapsed >= 1.1) ||
        (state.revealingCorrect && state.correctAudioDone && state.revealElapsed >= .55)) {
      finishQuestion();
      return;
    }
    state.frame = requestAnimationFrame(tick);
    return;
  }
  const topBoundary = -10;
  for (const item of state.items) {
    item.y -= delta * item.speed;
    item.button.style.transform = `translateY(${item.y}px)`;
  }
  const targetItem = state.items.find(item => item.word.index === state.question.target.index);
  if (targetItem.y + targetItem.height <= topBoundary) {
    // Reveal the missed word at a readable position and play its audio
    // before changing the emoji. No score is awarded.
    state.locked = true;
    state.revealingMiss = true;
    state.revealElapsed = 0;
    state.revealAudioDone = false;
    state.items.forEach(item => {
      if (item !== targetItem) item.button.classList.add('faded');
    });
    targetItem.y = Math.max(24, (ui.field.clientHeight - targetItem.height) / 2);
    targetItem.button.style.transform = `translateY(${targetItem.y}px)`;
    targetItem.button.classList.add('missed-answer');
    showFeedback('The word is ' + state.question.target.kirundi);
    const generation = state.generation;
    playPronunciation(state.question.target.audio).then(() => {
      if (state.generation === generation && state.revealingMiss) state.revealAudioDone = true;
    });
  }
  state.frame = requestAnimationFrame(tick);
}

ui.pause.addEventListener('click', pauseSession);
ui.stop.addEventListener('click', stopSession);
ui.restart.addEventListener('click', begin);
ui.start.disabled = true;
loadVocabulary().then(words => {
  vocabulary = words;
  ui.start.disabled = false;
  ui.status.textContent = `${words.length} vocabulary words loaded · ${QUESTIONS_PER_SESSION} questions per game`;
  ui.start.addEventListener('click', begin);
}).catch(error => {
  ui.status.textContent = 'Could not load words: ' + error.message + ' · Open using a local web server (see README).';
  console.error(error);
});
