import { describe, expect, it } from 'vitest';
import { playedRound, stateWith, withMarks } from '../test/fixtures';
import { seededRandom } from './bag';
import {
  canHint,
  clearMarks,
  commitGuess,
  currentSlots,
  currentWord,
  cycleMark,
  deleteLetter,
  giveHint,
  hasOwnMarks,
  isRoundInProgress,
  keyMarks,
  reducer,
  restoreMarks,
  typeLetter,
} from './state';
import type { Round } from './types';

const type = (round: Round, word: string) => word.split('').reduce(typeLetter, round);
const hintWith = (round: Round, seed: number) => giveHint(round, seededRandom(seed));

describe('Farben löschen', () => {
  const marked = () => {
    let r = playedRound('WOLKE', ['STERN', 'LAMPE']);
    r = withMarks(r, 0, 'xxvxx');
    r = withMarks(r, 1, 'vnxxr');
    return r;
  };

  it('entfernt alle eigenen Markierungen, die Tastaturfarben passen sich an', () => {
    const r = marked();
    expect(hasOwnMarks(r)).toBe(true);
    expect(keyMarks(r).E).toBe(3);
    const cleared = clearMarks(r);
    expect(cleared.guesses.map((g) => g.marks)).toEqual([
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(keyMarks(cleared)).toEqual({});
    expect(hasOwnMarks(cleared)).toBe(false);
    expect(clearMarks(cleared)).toBe(cleared);
  });

  it('lässt die Gewinnzeile, Hinweis-Buchstaben und die Schraffur stehen', () => {
    // KOHLE mit Hinweis auf Platz 2 (O), danach gewonnen mit WOLKE
    let r = { ...playedRound('WOLKE', []), hints: [1], input: 'KHLE', hidden: ['Q', 'X'] };
    r = commitGuess(r, 'KOHLE');
    r = withMarks(r, 0, 'xrxvv');
    r = commitGuess({ ...r, input: 'WOLKE' }, 'WOLKE');
    expect(r.status).toBe('won');
    const cleared = clearMarks(r);
    expect(cleared.guesses[0].marks).toEqual([0, 3, 0, 0, 0]);
    expect(cleared.guesses[1].marks).toEqual([3, 3, 3, 3, 3]);
    expect(cleared.hidden).toEqual(['Q', 'X']);
  });

  it('Rückgängig stellt die Markierungen wieder her, aber nur in derselben Runde', () => {
    const r = marked();
    const snapshot = r.guesses.map((g) => [...g.marks]);
    expect(restoreMarks(clearMarks(r), snapshot).guesses).toEqual(r.guesses);

    let state = stateWith({ de: r });
    state = reducer(state, { type: 'clearMarks' });
    state = reducer(state, { type: 'restoreMarks', lang: 'de', solution: 'ANDER', marks: snapshot });
    expect(hasOwnMarks(state.rounds.de!)).toBe(false);
    state = reducer(state, { type: 'restoreMarks', lang: 'de', solution: 'WOLKE', marks: snapshot });
    expect(state.rounds.de!.guesses).toEqual(r.guesses);
  });

  it('zählt nur eigene Markierungen: Gewinnzeile und Hinweise nicht', () => {
    const won = playedRound('WOLKE', ['WOLKE']);
    expect(hasOwnMarks(won)).toBe(false);
    const withHint = commitGuess({ ...playedRound('WOLKE', []), hints: [0], input: 'OHLE' }, 'WOHLE');
    expect(withHint.guesses[0].marks).toEqual([3, 0, 0, 0, 0]);
    expect(hasOwnMarks(withHint)).toBe(false);
  });
});

describe('Hinweis', () => {
  it('füllt einen zufälligen leeren Platz mit dem richtigen Buchstaben', () => {
    const r = type(playedRound('WOLKE', []), 'KO');
    const chosen = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const next = hintWith(r, seed);
      expect(next.hints).toHaveLength(1);
      const col = next.hints[0];
      expect([2, 3, 4]).toContain(col); // leere Plätze bevorzugt, getippte bleiben
      expect(next.input).toBe('KO');
      expect(currentSlots(next)[col]).toEqual({ letter: 'WOLKE'[col], hint: true });
      chosen.add(col);
    }
    expect(chosen).toEqual(new Set([2, 3, 4]));
  });

  it('sind alle Plätze belegt, ersetzt der Hinweis einen getippten Buchstaben', () => {
    const r = type(playedRound('WOLKE', []), 'KOHLE');
    const chosen = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const next = hintWith(r, seed);
      const col = next.hints[0];
      chosen.add(col);
      expect(next.input).toBe('KOHLE'.slice(0, col) + 'KOHLE'.slice(col + 1));
      expect(currentWord(next)).toBe('KOHLE'.slice(0, col) + 'WOLKE'[col] + 'KOHLE'.slice(col + 1));
    }
    expect(chosen.size).toBe(5);
  });

  it('nimmt nie einen Hinweis-Platz und ist nach fünf Hinweisen gesperrt', () => {
    let r = playedRound('WOLKE', []);
    for (let i = 0; i < 5; i++) {
      expect(canHint(r)).toBe(true);
      r = hintWith(r, 100 + i);
      expect(new Set(r.hints).size).toBe(i + 1);
    }
    expect(r.hints).toEqual([0, 1, 2, 3, 4]);
    expect(currentWord(r)).toBe('WOLKE');
    expect(canHint(r)).toBe(false);
    expect(hintWith(r, 7)).toBe(r);
  });

  it('Tippen überspringt Hinweis-Plätze, Löschen entfernt nie einen Hinweis', () => {
    let r = { ...playedRound('WOLKE', []), hints: [0, 2] };
    r = type(r, 'ABCD'); // nur drei Plätze sind frei
    expect(r.input).toBe('ABC');
    expect(currentSlots(r).map((s) => s.letter).join('')).toBe('WALBC');
    expect(currentSlots(r).map((s) => s.hint)).toEqual([true, false, true, false, false]);
    r = deleteLetter(deleteLetter(deleteLetter(r)));
    expect(r.input).toBe('');
    expect(deleteLetter(r)).toBe(r);
    expect(r.hints).toEqual([0, 2]);
    r = type(r, 'X');
    expect(currentSlots(r)[1]).toEqual({ letter: 'X', hint: false });
  });

  it('zählt beim Prüfen normal mit und bleibt in der Zeile grün und gesperrt', () => {
    let r = { ...playedRound('WOLKE', []), hints: [1] };
    r = type(r, 'KHLE');
    expect(currentWord(r)).toBe('KOHLE');
    r = commitGuess(r, 'KOHLE');
    expect(r.guesses[0]).toEqual({ word: 'KOHLE', score: [2, 2, 1], marks: [0, 3, 0, 0, 0], hints: [1] });
    expect(r.hints).toEqual([]);
    expect(r.input).toBe('');
    expect(cycleMark(r, 0, 1)).toBe(r);
    expect(cycleMark(r, 0, 0).guesses[0].marks).toEqual([1, 3, 0, 0, 0]);
  });

  it('die Tastatur zeigt den Hinweis-Buchstaben grün, schon vor dem Prüfen', () => {
    const r = { ...playedRound('WOLKE', []), hints: [4] };
    expect(keyMarks(r).E).toBe(3);
  });

  it('hebt die Schraffur des Hinweis-Buchstabens auf', () => {
    // Plätze 3 und 4 sind Hinweise, W und O getippt: frei ist nur Platz 2, dort gehört ein L hin.
    const r = { ...playedRound('WOLKE', []), hidden: ['L', 'Q'], hints: [3, 4], input: 'WO' };
    const next = hintWith(r, 3);
    expect(next.hints).toEqual([2, 3, 4]);
    expect(next.hidden).toEqual(['Q']);
  });

  it('nach Rundenende gibt es keinen Hinweis', () => {
    const won = playedRound('WOLKE', ['WOLKE']);
    expect(canHint(won)).toBe(false);
    expect(hintWith(won, 1)).toBe(won);
  });

  it('ein Hinweis zählt als laufende Runde, ein neues Wort leert ihn', () => {
    let state = stateWith({ de: { ...playedRound('WOLKE', []), hints: [2] } });
    expect(isRoundInProgress(state.rounds.de!)).toBe(true);
    state = reducer(state, { type: 'newRound', seed: 5 });
    expect(state.rounds.de!.hints).toEqual([]);
  });

  it('der Reducer gibt den Hinweis mit Startwert reproduzierbar', () => {
    const state = stateWith({ de: playedRound('WOLKE', []) });
    const a = reducer(state, { type: 'hint', seed: 42 });
    const b = reducer(state, { type: 'hint', seed: 42 });
    expect(a.rounds.de!.hints).toEqual(b.rounds.de!.hints);
    expect(a.rounds.de!.hints).toHaveLength(1);
  });
});
