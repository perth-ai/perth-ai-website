// Quokka Run's statement pool (game/questions.json).
// Each statement has a `level` (1 easy, 2 medium, 3 hard).

let pool = null;

export async function loadQuestions() {
  pool ??= await fetch('game/questions.json').then((r) => r.json());
  return pool;
}

export const LEVEL_NAMES = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

// One statement per topic (paired fact/fake statements would give each other
// away), shuffled, easiest first.
export function pickQuestions(questions) {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const seen = new Set();
  const picked = shuffled.filter((q) => !seen.has(q.topic) && seen.add(q.topic));
  return picked.sort((a, b) => a.level - b.level);
}

// For Quokka Run, where a good run only reaches a handful of gates: a short
// warm-up (easy, easy, medium, medium, hard), then easy → medium → hard on
// repeat, so a hard statement is always followed by an easier one. If a level
// runs out of unused topics, the next gate takes whatever's left.
const WARM_UP = [1, 1, 2, 2, 3];
const CYCLE = [1, 2, 3];

export function pickRamp(questions) {
  const remaining = pickQuestions(questions);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  const picked = [];
  for (let slot = 0; remaining.length; slot++) {
    const level = slot < WARM_UP.length ? WARM_UP[slot] : CYCLE[(slot - WARM_UP.length) % CYCLE.length];
    const at = remaining.findIndex((q) => q.level === level);
    picked.push(...remaining.splice(at === -1 ? 0 : at, 1));
  }
  return picked;
}
