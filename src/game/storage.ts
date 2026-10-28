import { SOLUTIONS } from './words';
import {
  LANGS,
  RULES,
  WORD_LENGTH,
  type GameState,
  type Guess,
  type Lang,
  type Mark,
  type Mode,
  type Round,
  type Status,
} from './types';

/** Versionierter Schlüssel: Ändert sich das Format, gibt es einen neuen Schlüssel. */
export const STORAGE_KEY = '500w:v2';

/**
 * Format vor dem Extreme-Modus (eine Runde pro Sprache). Beim Laden laufen diese Runden im
 * Normal-Modus weiter; nach dem ersten Speichern im neuen Format wird der alte Schlüssel entfernt.
 */
export const LEGACY_STORAGE_KEY = '500w:v1';

const WORD = /^[A-Z]{5}$/;
const LETTER = /^[A-Z]$/;
const STATUSES: readonly Status[] = ['playing', 'won', 'lost'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMark = (v: unknown): v is Mark => v === 0 || v === 1 || v === 2 || v === 3;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= WORD_LENGTH;

/** Hinweis-Plätze: fehlen sie (ältere Spielstände), gibt es keine. */
function parseHints(v: unknown): number[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v)) return null;
  if (!v.every((col) => Number.isInteger(col) && col >= 0 && col < WORD_LENGTH)) return null;
  const hints = [...new Set(v as number[])].sort((a, b) => a - b);
  return hints.length === v.length ? hints : null;
}

function parseGuess(v: unknown): Guess | null {
  if (!isObj(v)) return null;
  const { word, score, marks } = v;
  if (typeof word !== 'string' || !WORD.test(word)) return null;
  if (!Array.isArray(score) || score.length !== 3 || !score.every(isCount)) return null;
  if (score[0] + score[1] + score[2] !== WORD_LENGTH) return null;
  if (!Array.isArray(marks) || marks.length !== WORD_LENGTH || !marks.every(isMark)) return null;
  const hints = parseHints(v.hints);
  if (!hints) return null;
  // Hinweis-Plätze sind immer grün.
  return { word, score: [score[0], score[1], score[2]], marks: marks.map((m, col) => (hints.includes(col) ? 3 : m)), hints };
}

/** Passt der Status zu den Versuchen? Sonst bliebe die Runde hängen (z. B. «läuft» ohne freie Zeile). */
function statusFits(guesses: Guess[], status: Status, max: number): boolean {
  const won = guesses.findIndex((g) => g.score[0] === WORD_LENGTH);
  if (status === 'won') return won === guesses.length - 1 && won >= 0;
  if (won !== -1) return false;
  return status === 'lost' ? guesses.length === max : guesses.length < max;
}

/** Liest eine Runde. Anzahl Versuche und Hinweise richten sich nach dem Modus, in dem sie gespeichert ist. */
function parseRound(v: unknown, mode: Mode): Round | null {
  if (!isObj(v)) return null;
  const rules = RULES[mode];
  const { solution, guesses, input, hidden, hideMode, status } = v;
  if (typeof solution !== 'string' || !WORD.test(solution)) return null;
  if (!Array.isArray(guesses) || guesses.length > rules.maxGuesses) return null;
  const parsed = guesses.map(parseGuess);
  if (parsed.some((g) => g === null)) return null;
  const hints = parseHints(v.hints);
  if (!hints) return null;
  // Im Extreme-Modus gibt es keine Hinweise.
  if (!rules.hints && (hints.length > 0 || parsed.some((g) => g!.hints.length > 0))) return null;
  if (typeof input !== 'string' || !/^[A-Z]*$/.test(input) || input.length > WORD_LENGTH - hints.length) return null;
  if (!Array.isArray(hidden) || !hidden.every((l) => typeof l === 'string' && LETTER.test(l))) return null;
  if (typeof hideMode !== 'boolean') return null;
  if (typeof status !== 'string' || !STATUSES.includes(status as Status)) return null;
  if (!statusFits(parsed as Guess[], status as Status, rules.maxGuesses)) return null;
  return {
    mode,
    solution,
    guesses: parsed as Guess[],
    input,
    hints,
    hidden: [...new Set(hidden as string[])].sort(),
    hideMode,
    status: status as Status,
  };
}

/** Runden eines Modus, eine pro Sprache. Unbrauchbare fallen weg und starten später neu. */
function parseRounds(v: unknown, mode: Mode): Partial<Record<Lang, Round>> {
  const stored = isObj(v) ? v : {};
  const rounds: Partial<Record<Lang, Round>> = {};
  for (const lang of LANGS) {
    const round = parseRound(stored[lang], mode);
    if (round) rounds[lang] = round;
  }
  return rounds;
}

function parseBags(v: unknown): GameState['bags'] {
  const stored = isObj(v) ? v : {};
  const bags: GameState['bags'] = { de: [], en: [] };
  for (const lang of LANGS) {
    const bag = stored[lang];
    if (!Array.isArray(bag)) continue;
    const known = new Set(SOLUTIONS[lang]);
    bags[lang] = [...new Set(bag.filter((w): w is string => typeof w === 'string' && known.has(w)))];
  }
  return bags;
}

const parseLang = (v: unknown): Lang => (v === 'en' ? 'en' : 'de');

/** Liest einen gespeicherten Zustand (Format v2). */
export function parseState(data: unknown): GameState | null {
  if (!isObj(data)) return null;
  const stored = isObj(data.rounds) ? data.rounds : {};
  return {
    mode: data.mode === 'extreme' ? 'extreme' : 'normal',
    lang: parseLang(data.lang),
    rounds: { normal: parseRounds(stored.normal, 'normal'), extreme: parseRounds(stored.extreme, 'extreme') },
    bags: parseBags(data.bags),
  };
}

/** Übernimmt einen Spielstand aus v1: Seine Runden laufen im Normal-Modus weiter, Stapel bleiben. */
export function migrateLegacyState(data: unknown): GameState | null {
  if (!isObj(data)) return null;
  return {
    mode: 'normal',
    lang: parseLang(data.lang),
    rounds: { normal: parseRounds(data.rounds, 'normal'), extreme: {} },
    bags: parseBags(data.bags),
  };
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  return raw === null ? undefined : JSON.parse(raw);
}

export function loadState(storage: Storage | null = defaultStorage()): GameState | null {
  if (!storage) return null;
  try {
    const current = readJson(storage, STORAGE_KEY);
    if (current !== undefined) return parseState(current);
    const legacy = readJson(storage, LEGACY_STORAGE_KEY);
    return legacy === undefined ? null : migrateLegacyState(legacy);
  } catch {
    return null;
  }
}

export function saveState(state: GameState, storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Erst wenn der neue Stand sicher liegt, verschwindet der alte.
    storage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Speicher voll oder gesperrt (privates Surfen): Spiel läuft trotzdem weiter.
  }
}
