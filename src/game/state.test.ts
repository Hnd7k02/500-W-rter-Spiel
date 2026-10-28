import { describe, expect, it } from 'vitest';
import { playedRound, stateWith, withMarks } from '../test/fixtures';
import {
  checkGuess,
  commitGuess,
  createInitialState,
  cycleMark,
  deleteLetter,
  isHideActive,
  isLocked,
  isRoundInProgress,
  keyMarks,
  pressPhysicalKey,
  reducer,
  resultPlacement,
  tapKey,
  typeLetter,
} from './state';
import type { GameState, Round } from './types';

const type = (round: Round, word: string) => word.split('').reduce(typeLetter, round);

describe('Eingabe und Prüfen', () => {
  it('füllt höchstens 5 Buchstaben, Löschen entfernt den letzten', () => {
    let r = playedRound('WOLKE', []);
    r = type(r, 'STERNE');
    expect(r.input).toBe('STERN');
    r = deleteLetter(r);
    expect(r.input).toBe('STER');
  });

  it('meldet zu kurz, schon versucht und unbekannt', () => {
    const r = playedRound('WOLKE', ['STERN']);
    const valid = new Set(['STERN', 'LAMPE', 'WOLKE']);
    expect(checkGuess(r, 'LAM', valid)).toBe('short');
    expect(checkGuess(r, 'STERN', valid)).toBe('repeat');
    expect(checkGuess(r, 'QQQQQ', valid)).toBe('unknown');
    expect(checkGuess(r, 'LAMPE', valid)).toBe('ok');
  });

  it('schreibt fest, wertet und leert die Eingabe', () => {
    const r = commitGuess(type(playedRound('WOLKE', []), 'KOHLE'), 'KOHLE');
    expect(r.guesses).toEqual([{ word: 'KOHLE', score: [2, 2, 1], marks: [0, 0, 0, 0, 0], hints: [] }]);
    expect(r.input).toBe('');
    expect(r.status).toBe('playing');
  });

  it('5 · 0 · 0 gewinnt, nach 8 Versuchen ist die Runde verloren', () => {
    expect(playedRound('WOLKE', ['STERN', 'WOLKE']).status).toBe('won');
    const lost = playedRound('WOLKE', ['STERN', 'LAMPE', 'BLUME', 'KOHLE', 'TASSE', 'KASSE', 'ABEND', 'ADLER']);
    expect(lost.status).toBe('lost');
    expect(lost.guesses).toHaveLength(8);
  });

  it('nach dem Ende ist keine Eingabe mehr möglich', () => {
    const won = playedRound('WOLKE', ['WOLKE']);
    expect(type(won, 'AB')).toBe(won);
    expect(tapKey(won, 'A')).toBe(won);
  });
});

describe('Markieren', () => {
  it('Zyklus ohne → Falsch → Im Wort → Richtig → ohne, pro Kachel, Wertung bleibt', () => {
    let r = playedRound('WOLKE', ['STERN']);
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      r = cycleMark(r, 0, 2);
      seen.push(r.guesses[0].marks[2]);
    }
    expect(seen).toEqual([1, 2, 3, 0]);
    r = cycleMark(r, 0, 2);
    expect(r.guesses[0].marks).toEqual([0, 0, 1, 0, 0]);
    expect(r.guesses[0].score).toEqual([0, 1, 4]);
  });

  it('offene Zeilen lassen sich nicht markieren', () => {
    const r = playedRound('WOLKE', ['STERN']);
    expect(cycleMark(r, 1, 0)).toBe(r);
  });

  it('Taste zeigt die stärkste Markierung: Richtig vor Im Wort vor Falsch', () => {
    let r = playedRound('WOLKE', ['STERN', 'LAMPE', 'BLUME']);
    r = withMarks(r, 0, 'xxvxx'); // E im Wort
    r = withMarks(r, 1, 'vxxxr'); // L im Wort, E richtig
    r = withMarks(r, 2, 'xxnxx'); // B falsch, L falsch, U ohne
    const marks = keyMarks(r);
    expect(marks.E).toBe(3);
    expect(marks.L).toBe(2);
    expect(marks.S).toBe(1);
    expect(marks.B).toBe(1);
    expect(marks.U).toBeUndefined();
    expect(marks.Q).toBeUndefined();
  });

  it('die Gewinnzeile zählt als «Richtig» und lässt sich nicht umfärben', () => {
    let r = playedRound('PLANT', ['HOUSE', 'CRANE', 'SLANT', 'PLANT']);
    r = withMarks(r, 1, 'xxxxx'); // A und N in CRANE als falsch markiert
    expect(r.guesses[3].marks).toEqual([3, 3, 3, 3, 3]);
    const marks = keyMarks(r);
    for (const letter of 'PLANT') expect(marks[letter]).toBe(3);
    expect(marks.C).toBe(1);
    expect(cycleMark(r, 3, 0)).toBe(r);
    // Andere Zeilen lassen sich nach dem Ende weiter markieren.
    expect(cycleMark(r, 0, 0).guesses[0].marks[0]).toBe(1);
  });
});

describe('Ausblenden', () => {
  it('Schalter an: Tippen schraffiert statt zu schreiben, nochmals tippen holt zurück', () => {
    let r = { ...type(playedRound('WOLKE', ['STERN']), 'KO'), hideMode: true };
    r = tapKey(r, 'Q');
    r = tapKey(r, 'A');
    expect(r.hidden).toEqual(['A', 'Q']);
    expect(r.input).toBe('KO');
    r = tapKey(r, 'Q');
    expect(r.hidden).toEqual(['A']);
  });

  it('Schalter an: physische Buchstaben tun nichts, Löschen und Prüfen gehen', () => {
    let r = { ...type(playedRound('WOLKE', []), 'KOHLE'), hideMode: true };
    expect(pressPhysicalKey(r, 'A')).toBe(r);
    r = commitGuess(r, 'KOHLE');
    expect(r.guesses).toHaveLength(1);
    r = deleteLetter(type({ ...r, hideMode: false }, 'AB'));
    expect(r.input).toBe('A');
  });

  it('Schalter aus: die Schraffur bleibt, gesperrte Buchstaben schreiben weder per Tippen noch physisch', () => {
    let state: GameState = stateWith({ de: playedRound('WOLKE', []) });
    const de = () => state.rounds.normal.de!;
    state = reducer(state, { type: 'tapKey', letter: 'K' }); // schon getippt
    state = reducer(state, { type: 'toggleHideMode' });
    state = reducer(state, { type: 'tapKey', letter: 'X' });
    state = reducer(state, { type: 'tapKey', letter: 'K' });
    state = reducer(state, { type: 'toggleHideMode' });
    expect(de().hideMode).toBe(false);
    expect(de().hidden).toEqual(['K', 'X']);
    expect(isLocked(de(), 'X')).toBe(true);
    expect(isLocked(de(), 'A')).toBe(false);
    expect(de().input).toBe('K'); // schon getippte Buchstaben bleiben stehen

    state = reducer(state, { type: 'tapKey', letter: 'X' });
    state = reducer(state, { type: 'physicalKey', letter: 'X' });
    state = reducer(state, { type: 'physicalKey', letter: 'K' });
    expect(de().input).toBe('K');

    state = reducer(state, { type: 'tapKey', letter: 'O' });
    state = reducer(state, { type: 'physicalKey', letter: 'H' });
    expect(de().input).toBe('KOH');
  });

  it('zurückholen: Schalter wieder an und die Taste nochmals antippen', () => {
    let state: GameState = stateWith({ de: playedRound('WOLKE', [], { hidden: ['X'] }) });
    expect(isLocked(state.rounds.normal.de!, 'X')).toBe(true);
    state = reducer(state, { type: 'toggleHideMode' });
    expect(isHideActive(state.rounds.normal.de!)).toBe(true);
    expect(isLocked(state.rounds.normal.de!, 'X')).toBe(false);
    state = reducer(state, { type: 'tapKey', letter: 'X' });
    state = reducer(state, { type: 'toggleHideMode' });
    expect(state.rounds.normal.de!.hidden).toEqual([]);
    state = reducer(state, { type: 'tapKey', letter: 'X' });
    expect(state.rounds.normal.de!.input).toBe('X');
  });

  it('ein neues Wort leert die Schraffur und schaltet den Schalter aus', () => {
    let state: GameState = stateWith({ de: playedRound('WOLKE', ['STERN'], { hideMode: true, hidden: ['A', 'Q'] }) });
    state = reducer(state, { type: 'newRound', seed: 3 });
    expect(state.rounds.normal.de!.hidden).toEqual([]);
    expect(state.rounds.normal.de!.hideMode).toBe(false);
    expect(state.rounds.normal.de!.guesses).toEqual([]);
    state = reducer(state, { type: 'physicalKey', letter: 'Q' });
    expect(state.rounds.normal.de!.input).toBe('Q');
  });

  it('auch nach Sieg oder Niederlage leert das neue Wort die Schraffur', () => {
    for (const words of [['WOLKE'], ['STERN', 'LAMPE', 'BLUME', 'KOHLE', 'TASSE', 'KASSE', 'ABEND', 'ADLER']]) {
      let state: GameState = stateWith({ de: playedRound('WOLKE', words, { hidden: ['Q'] }) });
      expect(state.rounds.normal.de!.status).not.toBe('playing');
      state = reducer(state, { type: 'newRound', seed: 4 });
      expect(state.rounds.normal.de!.hidden).toEqual([]);
      expect(state.rounds.normal.de!.hideMode).toBe(false);
    }
  });

  it('jede Sprache behält ihre eigene Schraffur', () => {
    let state = createInitialState(5);
    state = reducer(state, { type: 'toggleHideMode' });
    state = reducer(state, { type: 'tapKey', letter: 'Q' });
    state = reducer(state, { type: 'toggleHideMode' });
    state = reducer(state, { type: 'setLang', lang: 'en', seed: 9 });
    expect(state.rounds.normal.en!.hidden).toEqual([]);
    state = reducer(state, { type: 'physicalKey', letter: 'Q' });
    expect(state.rounds.normal.en!.input).toBe('Q');
    state = reducer(state, { type: 'setLang', lang: 'de', seed: 10 });
    expect(state.rounds.normal.de!.hidden).toEqual(['Q']);
    state = reducer(state, { type: 'physicalKey', letter: 'Q' });
    expect(state.rounds.normal.de!.input).toBe('');
  });
});

describe('Sprache', () => {
  it('beim allerersten Start ist Deutsch aktiv', () => {
    const state = createInitialState(5);
    expect(state.lang).toBe('de');
    expect(state.rounds.normal.de).toBeDefined();
    expect(state.rounds.normal.en).toBeUndefined();
  });

  it('beide Runden bleiben getrennt erhalten', () => {
    let state = createInitialState(5);
    for (const l of 'KOH') state = reducer(state, { type: 'tapKey', letter: l });
    const de = state.rounds.normal.de!;

    state = reducer(state, { type: 'setLang', lang: 'en', seed: 9 });
    expect(state.lang).toBe('en');
    const en = state.rounds.normal.en!;
    expect(en.input).toBe('');
    expect(en.status).toBe('playing');
    for (const l of 'PLA') state = reducer(state, { type: 'tapKey', letter: l });
    state = reducer(state, { type: 'toggleHideMode' });

    state = reducer(state, { type: 'setLang', lang: 'de', seed: 10 });
    expect(state.rounds.normal.de).toBe(de);
    expect(state.rounds.normal.en!.input).toBe('PLA');
    expect(state.rounds.normal.en!.solution).toBe(en.solution);
    expect(state.rounds.normal.en!.hideMode).toBe(true);
    expect(state.rounds.normal.de!.hideMode).toBe(false);

    // Zurück auf Englisch: keine neue Runde, nichts geht verloren.
    state = reducer(state, { type: 'setLang', lang: 'en', seed: 11 });
    expect(state.rounds.normal.en!.solution).toBe(en.solution);
    expect(state.rounds.normal.en!.input).toBe('PLA');
  });

  it('die Wörter kommen aus der Liste der jeweiligen Sprache', () => {
    let state = createInitialState(5);
    state = reducer(state, { type: 'setLang', lang: 'en', seed: 6 });
    expect(state.bags.en).toHaveLength(249);
    expect(state.bags.de).toHaveLength(249);
    expect(state.bags.en).not.toContain(state.rounds.normal.en!.solution);
  });
});

describe('Ergebnis-Karte und laufende Runde', () => {
  const words = ['HOUSE', 'CRANE', 'SLANT', 'GHOST', 'PLATE', 'PLANE', 'PLAZA'];

  it('steht im Spielfeld, solange mindestens zwei Zeilen frei sind', () => {
    expect(resultPlacement(playedRound('PLANT', ['PLANT']))).toBe('board');
    expect(resultPlacement(playedRound('PLANT', [...words.slice(0, 3), 'PLANT']))).toBe('board');
    expect(resultPlacement(playedRound('PLANT', [...words.slice(0, 5), 'PLANT']))).toBe('board');
  });

  it('ersetzt bei Sieg im 7. oder 8. Versuch und bei Niederlage die Ausblenden-Reihe', () => {
    expect(resultPlacement(playedRound('PLANT', [...words.slice(0, 6), 'PLANT']))).toBe('keyboard');
    expect(resultPlacement(playedRound('PLANT', [...words, 'PLANT']))).toBe('keyboard');
    expect(resultPlacement(playedRound('PLANT', [...words, 'HEART']))).toBe('keyboard');
  });

  it('fehlt, solange die Runde läuft', () => {
    expect(resultPlacement(playedRound('PLANT', words))).toBe('none');
  });

  it('Ausblenden wirkt nicht mehr, wenn die Karte den Schalter ersetzt', () => {
    const lost = playedRound('PLANT', [...words, 'HEART'], { hideMode: true, hidden: ['Q'] });
    expect(isHideActive(lost)).toBe(false);
    expect(tapKey(lost, 'A')).toBe(lost);
  });

  it('erkennt eine laufende Runde (Versuch oder angefangene Eingabe)', () => {
    expect(isRoundInProgress(playedRound('PLANT', []))).toBe(false);
    expect(isRoundInProgress(type(playedRound('PLANT', []), 'P'))).toBe(true);
    expect(isRoundInProgress(playedRound('PLANT', ['HOUSE']))).toBe(true);
    expect(isRoundInProgress(playedRound('PLANT', ['PLANT']))).toBe(false);
  });
});
