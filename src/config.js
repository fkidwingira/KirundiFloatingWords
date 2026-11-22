// Adjust these numbers after testing with children; no vocabulary changes belong here.
export const QUESTIONS_PER_SESSION = 100;
export const RECENT_TARGET_COUNT = 5;
export const LEVELS = [
  { minScore: 0,  label: 'LEVEL 1 · WARM UP', choices: 2, speed: 46, startY: .96, unlock: .45, similarity: 0 },
  { minScore: 5,  label: 'LEVEL 2 · GETTING GOING', choices: 3, speed: 46, startY: .82, unlock: .65, similarity: .3 },
  { minScore: 10, label: 'LEVEL 3 · NICE WORK', choices: 4, speed: 46, startY: .69, unlock: .85, similarity: .65 },
  { minScore: 15, label: 'LEVEL 4 · CHALLENGE', choices: 5, speed: 46, startY: .56, unlock: 1, similarity: 1 }
];
