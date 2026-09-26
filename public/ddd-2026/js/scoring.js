// Rules for saving a Quokka Run score. The API (src/pages/ddd-2026/api/scores.ts)
// imports this file, so the rules live in one place.

import { isEmail } from './forms.js';

// Deliberately short (Scunthorpe problem — "Cockburn" is a Perth suburb). Admin can hide anything else.
const BLOCKED_WORDS = /fuck|shit|cunt|nigg|bitch|pussy|wank|twat|slut|whore|nazi|hitler/i;

// Each game checks its own score is plausible. For Quokka Run, `rounds` is
// gates reached and `correct` is how many were answered right.
export const GAMES = {
  runner: {
    check: (score, correct, rounds) => score <= 200000 && rounds <= 500 && correct <= rounds,
    rounds: (b) => Math.round(Number(b.rounds)),
  },
};

export const gameOrDefault = (game) => (Object.hasOwn(GAMES, game) ? game : 'runner');

// Returns { ok, errors, clean }. clean is ready to insert, with email null when blank.
// `consent` means "in the prize draw": leaving an email enters it (the email is
// only used to contact the winner). `updates` is the separate, optional opt-in
// to event emails. Both are 0/1. (The column keeps its old name so existing
// databases and CSVs don't change shape.)
export function validateScore(body) {
  const b = body || {};
  const game = gameOrDefault(b.game);
  const rounds = GAMES[game].rounds(b);
  const name = String(b.name || '').trim().slice(0, 16);
  const email = String(b.email || '').trim().slice(0, 120);
  const score = Math.round(Number(b.score));
  const correct = Math.round(Number(b.correct));
  const errors = {};
  if (!name) errors.name = 'Pick a name for the leaderboard';
  else if (BLOCKED_WORDS.test(name.replace(/[^a-z]/gi, ''))) errors.name = 'Let’s keep it family friendly';
  if (email && !isEmail(email)) errors.email = 'That email doesn’t look right';
  if (!email && b.updates === true) errors.email = 'Add your email to get event updates';
  const numbers = [score, correct, rounds];
  if (!numbers.every((n) => Number.isFinite(n) && n >= 0) || !GAMES[game].check(score, correct, rounds)) {
    errors._form = 'Invalid score';
  }
  const consent = email ? 1 : 0;
  const updates = email && b.updates === true ? 1 : 0;
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    clean: { game, name, email: email || null, consent, updates, score, correct, rounds },
  };
}
