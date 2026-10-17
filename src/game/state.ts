import { drawWord, seededRandom } from './bag';
import { score } from './score';
import { SOLUTIONS } from './words';
import {
  MAX_GUESSES,
  WORD_LENGTH,
  type GameState,
  type Guess,
  type Lang,
  type Mark,
  type ResultPlacement,
  type Round,
} from './types';

export type Action =
  /** Buchstabe auf der Bildschirm-Tastatur: schreibt oder blendet aus (Schalter an). */
  | { type: 'tapKey'; letter: string }
  /** Buchstabe auf der physischen Tastatur: schreibt nur, wenn der Schalter aus ist. */
  | { type: 'physicalKey'; letter: string }
  | { type: 'backspace' }
  /** Schreibt eine bereits geprüfte Eingabe fest. */
  | { type: 'commit'; lang: Lang; word: string }
  | { type: 'mark'; row: number; col: number }
  | { type: 'toggleHideMode' }
  | { type: 'newRound'; seed: number }
  | { type: 'setLang'; lang: Lang; seed: number };

const LETTER = /^[A-Z]$/;

export function createRound(solution: string): Round {
  return { solution, guesses: [], input: '', hidden: [], hideMode: false, status: 'playing' };
}

/** Zieht ein neues Lösungswort aus dem Stapel der Sprache und startet damit eine frische Runde. */
export function startRound(state: GameState, lang: Lang, seed: number): GameState {
  const last = state.rounds[lang]?.solution ?? null;
  const { word, bag } = drawWord(state.bags[lang], SOLUTIONS[lang], last, seededRandom(seed));
  return {
    ...state,
    rounds: { ...state.rounds, [lang]: createRound(word) },
    bags: { ...state.bags, [lang]: bag },
  };
}

/** Allererster Start: Deutsch ist aktiv. */
export function createInitialState(seed: number): GameState {
  return startRound({ lang: 'de', rounds: {}, bags: { de: [], en: [] } }, 'de', seed);
}

/** Sorgt dafür, dass die aktive Sprache eine Runde hat. */
export function ensureActiveRound(state: GameState, seed: number): GameState {
  return state.rounds[state.lang] ? state : startRound(state, state.lang, seed);
}

export function activeRound(state: GameState): Round {
  const round = state.rounds[state.lang];
  if (!round) throw new Error('Keine Runde für die aktive Sprache');
  return round;
}

/** Läuft die Runde? (mindestens ein Versuch oder eine angefangene Eingabe) */
export function isRoundInProgress(round: Round): boolean {
  return round.status === 'playing' && (round.guesses.length > 0 || round.input.length > 0);
}

export function isWinningRow(round: Round, row: number): boolean {
  return round.status === 'won' && row === round.guesses.length - 1;
}

/**
 * Platz der Ergebnis-Karte: Sind mindestens zwei Zeilen leer, steht sie im Spielfeld.
 * Sonst (Sieg im 7. oder 8. Versuch, Niederlage) ersetzt sie die Ausblenden-Reihe der Tastatur.
 */
export function resultPlacement(round: Round): ResultPlacement {
  if (round.status === 'playing') return 'none';
  return MAX_GUESSES - round.guesses.length >= 2 ? 'board' : 'keyboard';
}

/** Ausblenden ist wirksam, solange der Schalter an und sichtbar ist. */
export function isHideActive(round: Round): boolean {
  return round.hideMode && resultPlacement(round) !== 'keyboard';
}

/** Stärkste Markierung pro Buchstabe über alle Zeilen: Richtig vor Im Wort vor Falsch. */
export function keyMarks(round: Round): Record<string, Mark> {
  const best: Record<string, Mark> = {};
  round.guesses.forEach((guess, row) => {
    const win = isWinningRow(round, row);
    for (let i = 0; i < WORD_LENGTH; i++) {
      const mark: Mark = win ? 3 : guess.marks[i];
      const letter = guess.word[i];
      if (mark > (best[letter] ?? 0)) best[letter] = mark;
    }
  });
  return best;
}

export type GuessCheck = 'ok' | 'short' | 'repeat' | 'unknown';

/**
 * Prüft eine Eingabe vor dem Festschreiben. Ohne Wortliste werden nur Länge und
 * Wiederholung geprüft – so gibt es diese Meldungen sofort, auch wenn die Liste noch lädt.
 */
export function checkGuess(round: Round, word: string, valid?: ReadonlySet<string>): GuessCheck {
  if (word.length < WORD_LENGTH) return 'short';
  if (round.guesses.some((g) => g.word === word)) return 'repeat';
  if (valid && !valid.has(word)) return 'unknown';
  return 'ok';
}

export function typeLetter(round: Round, letter: string): Round {
  if (round.status !== 'playing' || round.input.length >= WORD_LENGTH || !LETTER.test(letter)) return round;
  return { ...round, input: round.input + letter };
}

export function deleteLetter(round: Round): Round {
  if (round.status !== 'playing' || round.input.length === 0) return round;
  return { ...round, input: round.input.slice(0, -1) };
}

export function toggleHidden(round: Round, letter: string): Round {
  if (!LETTER.test(letter)) return round;
  const hidden = round.hidden.includes(letter)
    ? round.hidden.filter((l) => l !== letter)
    : [...round.hidden, letter].sort();
  return { ...round, hidden };
}

export function toggleHideMode(round: Round): Round {
  if (resultPlacement(round) === 'keyboard') return round; // Schalter ist dann durch die Ergebnis-Karte ersetzt
  return { ...round, hideMode: !round.hideMode };
}

/** Bildschirm-Taste: bei Schalter an schraffieren statt schreiben. */
export function tapKey(round: Round, letter: string): Round {
  return isHideActive(round) ? toggleHidden(round, letter) : typeLetter(round, letter);
}

/** Physische Taste: im Ausblende-Modus passiert nichts. */
export function pressPhysicalKey(round: Round, letter: string): Round {
  return round.hideMode ? round : typeLetter(round, letter);
}

/** Schreibt die Eingabe fest, wenn sie noch dieselbe ist und noch nicht geraten wurde. */
export function commitGuess(round: Round, word: string): Round {
  if (
    round.status !== 'playing' ||
    round.input !== word ||
    checkGuess(round, word) !== 'ok' ||
    round.guesses.length >= MAX_GUESSES
  ) {
    return round;
  }
  const result = score(word, round.solution);
  const won = result[0] === WORD_LENGTH;
  const guess: Guess = { word, score: result, marks: won ? [3, 3, 3, 3, 3] : [0, 0, 0, 0, 0] };
  const guesses = [...round.guesses, guess];
  const status = won ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return { ...round, guesses, input: '', status };
}

/** Markier-Zyklus einer Kachel: ohne → Falsch → Im Wort → Richtig → ohne. Die Gewinnzeile bleibt grün. */
export function cycleMark(round: Round, row: number, col: number): Round {
  const guess = round.guesses[row];
  if (!guess || col < 0 || col >= WORD_LENGTH || isWinningRow(round, row)) return round;
  const marks = [...guess.marks];
  marks[col] = ((marks[col] + 1) % 4) as Mark;
  const guesses = round.guesses.map((g, i) => (i === row ? { ...g, marks } : g));
  return { ...round, guesses };
}

function updateRound(state: GameState, lang: Lang, update: (round: Round) => Round): GameState {
  const round = state.rounds[lang];
  if (!round) return state;
  const next = update(round);
  return next === round ? state : { ...state, rounds: { ...state.rounds, [lang]: next } };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'setLang': {
      if (action.lang === state.lang && state.rounds[action.lang]) return state;
      return ensureActiveRound({ ...state, lang: action.lang }, action.seed);
    }
    case 'newRound':
      return startRound(state, state.lang, action.seed);
    case 'commit':
      return updateRound(state, action.lang, (r) => commitGuess(r, action.word));
    case 'tapKey':
      return updateRound(state, state.lang, (r) => tapKey(r, action.letter));
    case 'physicalKey':
      return updateRound(state, state.lang, (r) => pressPhysicalKey(r, action.letter));
    case 'backspace':
      return updateRound(state, state.lang, deleteLetter);
    case 'mark':
      return updateRound(state, state.lang, (r) => cycleMark(r, action.row, action.col));
    case 'toggleHideMode':
      return updateRound(state, state.lang, toggleHideMode);
  }
}
