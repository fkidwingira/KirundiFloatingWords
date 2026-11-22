const FOLDER = './vocabulary/';

export async function loadVocabulary() {
  const response = await fetch(FOLDER + 'words.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load vocabulary/words.json (' + response.status + ')');
  const input = await response.json();
  if (!Array.isArray(input)) throw new Error('words.json must contain a JSON array.');
  const seen = new Set();
  const words = input.map((entry, index) => {
    if (![entry.emoji, entry.english, entry.kirundi, entry.audio].every(v => typeof v === 'string' && v.trim())) {
      throw new Error('Vocabulary entry ' + (index + 1) + ' needs emoji, english, kirundi, and audio.');
    }
    const key = entry.kirundi.trim().toLocaleLowerCase();
    if (seen.has(key)) throw new Error('Duplicate Kirundi word: ' + entry.kirundi);
    seen.add(key);
    // Relative filenames are resolved inside the package, not against the code folder.
    const audio = new URL(entry.audio, new URL(FOLDER, document.baseURI)).href;
    return { ...entry, kirundi: entry.kirundi.trim(), audio, index };
  });
  if (words.length < 2) throw new Error('Provide at least two different Kirundi words.');
  return words;
}

function distance(a, b) {
  a = a.toLocaleLowerCase(); b = b.toLocaleLowerCase();
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const prior = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i-1] === b[j-1] ? 0 : 1));
      diagonal = prior;
    }
  }
  return row[b.length];
}

function similarity(a, b) {
  let prefix = 0;
  while (prefix < Math.min(a.length, b.length) && a[prefix].toLocaleLowerCase() === b[prefix].toLocaleLowerCase()) prefix++;
  return 1 - distance(a, b) / Math.max(a.length, b.length) + prefix * .06;
}

export function makeQuestion(words, level, recentIndices = []) {
  // Unlock at least six targets when available: otherwise a strict five-word
  // no-repeat rule is impossible even with a large vocabulary file.
  const availableCount = Math.min(words.length, Math.max(6, level.choices, Math.ceil(words.length * level.unlock)));
  const pool = words.slice(0, availableCount);
  const recent = recentIndices.slice(-5);
  let targets = pool.filter(word => !recent.includes(word.index));
  // With fewer than six total words, five unique previous targets cannot
  // all be excluded. Reuse the least recently shown word as a fallback.
  if (!targets.length) {
    const lastSeen = word => recent.lastIndexOf(word.index);
    const oldestPosition = Math.min(...pool.map(lastSeen));
    targets = pool.filter(word => lastSeen(word) === oldestPosition);
  }
  const target = targets[Math.floor(Math.random() * targets.length)];
  const decoys = words.filter(word => word.index !== target.index)
    .map(word => ({ word, similarity: similarity(word.kirundi, target.kirundi), randomness: Math.random() * .25 }));
  // At easier levels prefer distinct-looking words; at harder levels prefer similar words.
  decoys.sort((a, b) => level.similarity < .5
    ? (a.similarity + a.randomness) - (b.similarity + b.randomness)
    : (b.similarity + b.randomness) - (a.similarity + a.randomness));
  const choices = [target, ...decoys.slice(0, Math.min(level.choices - 1, decoys.length)).map(d => d.word)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { target, choices };
}
