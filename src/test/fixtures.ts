import { commitGuess, createRound } from '../game/state';
import type { GameState, Lang, Mark, Round } from '../game/types';

/** Runde mit bereits gewerteten Versuchen (ohne Wortlisten-Prüfung). */
export function playedRound(solution: string, words: string[], extra: Partial<Round> = {}): Round {
  let round = createRound(solution);
  for (const word of words) round = commitGuess({ ...round, input: word }, word);
  return { ...round, ...extra };
}

/** Setzt die Markierungen einer Zeile, z. B. 'xxvxr' (x falsch, v im Wort, r richtig, n ohne). */
export function withMarks(round: Round, row: number, pattern: string): Round {
  const code: Record<string, Mark> = { n: 0, x: 1, v: 2, r: 3 };
  const marks = pattern.split('').map((c) => code[c]);
  return { ...round, guesses: round.guesses.map((g, i) => (i === row ? { ...g, marks } : g)) };
}

export function stateWith(rounds: Partial<Record<Lang, Round>>, lang: Lang = 'de'): GameState {
  return { lang, rounds, bags: { de: [], en: [] } };
}
