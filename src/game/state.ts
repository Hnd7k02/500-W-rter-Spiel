import { drawWord, seededRandom, type Random } from './bag';
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
  | { type: 'setLang'; lang: Lang; seed: number }
  /** Zweiter Tipp auf «?»: ein grüner Buchstabe für die aktuelle Zeile */
  | { type: 'hint'; seed: number }
  /** Radierer: alle eigenen Markierungen entfernen */
  | { type: 'clearMarks' }
  /** «Rückgängig» nach dem Radierer, nur für dieselbe Runde */
  | { type: 'restoreMarks'; lang: Lang; solution: string; marks: Mark[][] };

const LETTER = /^[A-Z]$/;
const COLS = Array.from({ length: WORD_LENGTH }, (_, i) => i);

export function createRound(solution: string): Round {
  return { solution, guesses: [], input: '', hints: [], hidden: [], hideMode: false, status: 'playing' };
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

/** Läuft die Runde? (mindestens ein Versuch oder eine angefangene Eingabe, auch ein Hinweis) */
export function isRoundInProgress(round: Round): boolean {
  return (
    round.status === 'playing' && (round.guesses.length > 0 || round.input.length > 0 || round.hints.length > 0)
  );
}

export interface Slot {
  /** Buchstabe oder '' für einen leeren Platz */
  letter: string;
  hint: boolean;
}

/** Die fünf Plätze der aktuellen Zeile: Hinweise an ihrem Platz, getippte Buchstaben füllen die übrigen von links. */
export function currentSlots(round: Round): Slot[] {
  let typed = 0;
  return COLS.map((col) =>
    round.hints.includes(col)
      ? { letter: round.solution[col], hint: true }
      : { letter: round.input[typed++] ?? '', hint: false },
  );
}

/** Wort der aktuellen Zeile. Leere Plätze fehlen, das Wort ist dann kürzer als 5. */
export function currentWord(round: Round): string {
  return currentSlots(round)
    .map((slot) => slot.letter)
    .join('');
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

/** Schraffieren per Antippen geht, solange der Schalter an und sichtbar ist. */
export function isHideActive(round: Round): boolean {
  return round.hideMode && resultPlacement(round) !== 'keyboard';
}

/** Schraffierte Buchstaben bleiben bei ausgeschaltetem Schalter sichtbar und sind gesperrt. */
export function isLocked(round: Round, letter: string): boolean {
  return !isHideActive(round) && round.hidden.includes(letter);
}

/** Stärkste Markierung pro Buchstabe über alle Zeilen: Richtig vor Im Wort vor Falsch. */
export function keyMarks(round: Round): Record<string, Mark> {
  const best: Record<string, Mark> = {};
  round.guesses.forEach((guess, row) => {
    const win = isWinningRow(round, row);
    for (let i = 0; i < WORD_LENGTH; i++) {
      const mark: Mark = win || guess.hints.includes(i) ? 3 : guess.marks[i];
      const letter = guess.word[i];
      if (mark > (best[letter] ?? 0)) best[letter] = mark;
    }
  });
  // Hinweis-Buchstaben der aktuellen Zeile sind sicher richtig.
  for (const col of round.hints) best[round.solution[col]] = 3;
  return best;
}

/** Gibt es eigene Markierungen? Gewinnzeile und Hinweise zählen nicht. */
export function hasOwnMarks(round: Round): boolean {
  return round.guesses.some(
    (guess, row) => !isWinningRow(round, row) && guess.marks.some((mark, col) => mark !== 0 && !guess.hints.includes(col)),
  );
}

/** Radierer: entfernt alle eigenen Markierungen. Gewinnzeile, Hinweise und Schraffur bleiben. */
export function clearMarks(round: Round): Round {
  if (!hasOwnMarks(round)) return round;
  const guesses = round.guesses.map((guess, row) =>
    isWinningRow(round, row) ? guess : { ...guess, marks: COLS.map((col): Mark => (guess.hints.includes(col) ? 3 : 0)) },
  );
  return { ...round, guesses };
}

/** Stellt Markierungen aus einer Momentaufnahme wieder her («Rückgängig»). */
export function restoreMarks(round: Round, snapshot: Mark[][]): Round {
  const guesses = round.guesses.map((guess, row) => {
    const saved = snapshot[row];
    if (!saved || isWinningRow(round, row)) return guess;
    return { ...guess, marks: COLS.map((col): Mark => (guess.hints.includes(col) ? 3 : (saved[col] ?? guess.marks[col]))) };
  });
  return { ...round, guesses };
}

/** Kann «?» noch helfen? Nicht nach Rundenende und nicht, wenn alle Plätze schon Hinweise sind. */
export function canHint(round: Round): boolean {
  return round.status === 'playing' && round.hints.length < WORD_LENGTH;
}

/**
 * Hinweis: Ein zufälliger Platz ohne Hinweis bekommt den richtigen Buchstaben, bevorzugt ein leerer.
 * Sind alle belegt, ersetzt der Hinweis einen getippten Buchstaben. Ist der Buchstabe schraffiert,
 * wird die Schraffur dafür aufgehoben.
 */
export function giveHint(round: Round, random: Random): Round {
  if (!canHint(round)) return round;
  const open = COLS.filter((col) => !round.hints.includes(col));
  // Getippte Buchstaben belegen die offenen Plätze von links, der Rest ist leer.
  const empty = open.slice(round.input.length);
  let input = round.input;
  let col: number;
  if (empty.length > 0) {
    col = empty[Math.floor(random() * empty.length)];
  } else {
    const index = Math.floor(random() * open.length);
    col = open[index];
    input = input.slice(0, index) + input.slice(index + 1);
  }
  const letter = round.solution[col];
  return {
    ...round,
    input,
    hints: [...round.hints, col].sort((a, b) => a - b),
    hidden: round.hidden.filter((l) => l !== letter),
  };
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

/** Tippen füllt den ersten freien Platz von links und überspringt Hinweis-Plätze. */
export function typeLetter(round: Round, letter: string): Round {
  if (round.status !== 'playing' || !LETTER.test(letter)) return round;
  if (round.input.length >= WORD_LENGTH - round.hints.length) return round;
  return { ...round, input: round.input + letter };
}

/** Löschen entfernt den rechtesten getippten Buchstaben, nie einen Hinweis. */
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

/** Bildschirm-Taste: bei Schalter an Schraffur ein/aus, sonst schreiben – ausser der Buchstabe ist gesperrt. */
export function tapKey(round: Round, letter: string): Round {
  if (isHideActive(round)) return toggleHidden(round, letter);
  return isLocked(round, letter) ? round : typeLetter(round, letter);
}

/** Physische Taste: Im Ausblende-Modus passiert nichts, gesperrte Buchstaben werden ignoriert. */
export function pressPhysicalKey(round: Round, letter: string): Round {
  return round.hideMode || round.hidden.includes(letter) ? round : typeLetter(round, letter);
}

/** Schreibt die Zeile fest, wenn sie noch dieselbe ist und noch nicht geraten wurde. Hinweise zählen normal mit. */
export function commitGuess(round: Round, word: string): Round {
  if (
    round.status !== 'playing' ||
    currentWord(round) !== word ||
    checkGuess(round, word) !== 'ok' ||
    round.guesses.length >= MAX_GUESSES
  ) {
    return round;
  }
  const result = score(word, round.solution);
  const won = result[0] === WORD_LENGTH;
  const hints = [...round.hints];
  const marks = COLS.map((col): Mark => (won || hints.includes(col) ? 3 : 0));
  const guess: Guess = { word, score: result, marks, hints };
  const guesses = [...round.guesses, guess];
  const status = won ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return { ...round, guesses, input: '', hints: [], status };
}

/** Markier-Zyklus einer Kachel: ohne → Falsch → Im Wort → Richtig → ohne. Gewinnzeile und Hinweise bleiben grün. */
export function cycleMark(round: Round, row: number, col: number): Round {
  const guess = round.guesses[row];
  if (!guess || col < 0 || col >= WORD_LENGTH || isWinningRow(round, row) || guess.hints.includes(col)) return round;
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
    case 'hint':
      return updateRound(state, state.lang, (r) => giveHint(r, seededRandom(action.seed)));
    case 'clearMarks':
      return updateRound(state, state.lang, clearMarks);
    case 'restoreMarks':
      return updateRound(state, action.lang, (r) => (r.solution === action.solution ? restoreMarks(r, action.marks) : r));
  }
}
