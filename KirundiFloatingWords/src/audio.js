// All pronunciation playback uses the AudioContext unlocked by the Start button.
// This allows a missed word to be spoken without requiring another tap (notably in Safari).
let context;
let activeSource = null;
let activeResolve = null;
let playbackToken = 0;

function getContext() {
  context ??= new (window.AudioContext || window.webkitAudioContext)();
  return context;
}

export function unlockAudio() {
  try {
    const ctx = getContext();
    if (ctx.state !== 'running') ctx.resume().catch(err => console.warn('Audio unlock failed', err));
  } catch (err) { console.warn('Audio unavailable', err); }
}

function tone(freq, when, duration, type = 'sine', volume = .13) {
  const ctx = getContext();
  const oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(.001, when + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(when); oscillator.stop(when + duration);
}
export function gameSound(isCorrect) {
  try {
    unlockAudio();
    const now = getContext().currentTime;
    if (isCorrect) { tone(660, now, .12); tone(880, now + .11, .2); }
    else { tone(240, now, .17, 'triangle', .09); tone(190, now + .1, .15, 'triangle', .08); }
  } catch (err) { console.warn('Game sound unavailable', err); }
}

export function stopPronunciation() {
  playbackToken++;
  if (activeSource) {
    try { activeSource.onended = null; activeSource.stop(); } catch (_) {}
    try { activeSource.disconnect(); } catch (_) {}
    activeSource = null;
  }
  const resolve = activeResolve;
  activeResolve = null;
  if (resolve) resolve();
}
export function pausePronunciation() {
  if (context?.state === 'running') context.suspend().catch(console.warn);
}
export function resumePronunciation() { unlockAudio(); }

export async function playPronunciation(url) {
  stopPronunciation();
  const token = playbackToken;
  try {
    const ctx = getContext();
    // no-store prevents the browser from replaying an old recording after files are replaced.
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    if (token !== playbackToken) return;
    return await new Promise(resolve => {
      if (token !== playbackToken) return resolve();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      activeSource = source;
      activeResolve = resolve;
      source.onended = () => {
        if (activeSource === source) {
          activeSource = null;
          activeResolve = null;
        }
        resolve();
      };
      source.start();
    });
  } catch (err) {
    console.warn('Pronunciation unavailable:', url, err);
  }
}
