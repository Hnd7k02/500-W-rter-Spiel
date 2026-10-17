import { SOLUTIONS } from './words';
import {
  LANGS,
  MAX_GUESSES,
  WORD_LENGTH,
  type GameState,
  type Guess,
  type Lang,
  type Mark,
  type Round,
  type Status,
} from './types';

/** Versionierter Schlüssel: Ändert sich das Format, gibt es einen neuen Schlüssel. */
export const STORAGE_KEY = '500w:v1';

const WORD = /^[A-Z]{5}$/;
const LETTER = /^[A-Z]$/;
const STATUSES: readonly Status[] = ['playing', 'won', 'lost'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMark = (v: unknown): v is Mark => v === 0 || v === 1 || v === 2 || v === 3;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= WORD_LENGTH;

function parseGuess(v: unknown): Guess | null {
  if (!isObj(v)) return null;
  const { word, score, marks } = v;
  if (typeof word !== 'string' || !WORD.test(word)) return null;
  if (!Array.isArray(score) || score.length !== 3 || !score.every(isCount)) return null;
  if (score[0] + score[1] + score[2] !== WORD_LENGTH) return null;
  if (!Array.isArray(marks) || marks.length !== WORD_LENGTH || !marks.every(isMark)) return null;
  return { word, score: [score[0], score[1], score[2]], marks: [...marks] };
}

function parseRound(v: unknown): Round | null {
  if (!isObj(v)) return null;
  const { solution, guesses, input, hidden, hideMode, status } = v;
  if (typeof solution !== 'string' || !WORD.test(solution)) return null;
  if (!Array.isArray(guesses) || guesses.length > MAX_GUESSES) return null;
  const parsed = guesses.map(parseGuess);
  if (parsed.some((g) => g === null)) return null;
  if (typeof input !== 'string' || !/^[A-Z]{0,5}$/.test(input)) return null;
  if (!Array.isArray(hidden) || !hidden.every((l) => typeof l === 'string' && LETTER.test(l))) return null;
  if (typeof hideMode !== 'boolean') return null;
  if (typeof status !== 'string' || !STATUSES.includes(status as Status)) return null;
  return {
    solution,
    guesses: parsed as Guess[],
    input,
    hidden: [...new Set(hidden as string[])].sort(),
    hideMode,
    status: status as Status,
  };
}

function parseBag(v: unknown, lang: Lang): string[] {
  if (!Array.isArray(v)) return [];
  const known = new Set(SOLUTIONS[lang]);
  return [...new Set(v.filter((w): w is string => typeof w === 'string' && known.has(w)))];
}

/** Liest einen gespeicherten Zustand. Unbrauchbare Runden fallen weg und starten später neu. */
export function parseState(data: unknown): GameState | null {
  if (!isObj(data)) return null;
  const lang: Lang = data.lang === 'en' ? 'en' : 'de';
  const rounds: GameState['rounds'] = {};
  const bags: GameState['bags'] = { de: [], en: [] };
  const storedRounds = isObj(data.rounds) ? data.rounds : {};
  const storedBags = isObj(data.bags) ? data.bags : {};
  for (const l of LANGS) {
    const round = parseRound(storedRounds[l]);
    if (round) rounds[l] = round;
    bags[l] = parseBag(storedBags[l], l);
  }
  return { lang, rounds, bags };
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadState(storage: Storage | null = defaultStorage()): GameState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? parseState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveState(state: GameState, storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Speicher voll oder gesperrt (privates Surfen): Spiel läuft trotzdem weiter.
  }
}
