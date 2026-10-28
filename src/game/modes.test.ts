import { describe, expect, it } from 'vitest';
import { playedRound, stateWith } from '../test/fixtures';
import { shuffle, seededRandom } from './bag';
import {
  activeRound,
  canHint,
  commitGuess,
  createInitialState,
  giveHint,
  maxGuesses,
  reducer,
  resultPlacement,
  startRound,
} from './state';
import { RULES, type GameState } from './types';
import { SOLUTIONS } from './words';

const WRONG = ['HOUSE', 'CRANE', 'GHOST', 'PLATE', 'HEART', 'PLANE', 'PLAZA'];

describe('Regeln pro Modus', () => {
  it('Normal: 8 Versuche mit Hinweisen, Extreme: 6 Versuche ohne', () => {
    expect(RULES.normal).toEqual({ maxGuesses: 8, hints: true });
    expect(RULES.extreme).toEqual({ maxGuesses: 6, hints: false });
    expect(maxGuesses(playedRound('PLANT', []))).toBe(8);
    expect(maxGuesses(playedRound('PLANT', [], { mode: 'extreme' }))).toBe(6);
  });

  it('Extreme: verloren nach dem 6. Versuch, ein 7. wird nicht mehr angenommen', () => {
    let round = playedRound('PLANT', WRONG.slice(0, 5), { mode: 'extreme' });
    expect(round.status).toBe('playing');
    round = commitGuess({ ...round, input: 'SLANT' }, 'SLANT');
    expect(round.guesses).toHaveLength(6);
    expect(round.status).toBe('lost');
    expect(commitGuess({ ...round, status: 'playing', input: 'PLANT' }, 'PLANT').guesses).toHaveLength(6);
    // Im Normal-Modus läuft dieselbe Runde nach 6 Versuchen weiter.
    expect(playedRound('PLANT', [...WRONG.slice(0, 5), 'SLANT']).status).toBe('playing');
  });

  it('Extreme: Ergebnis-Karte im Spielfeld nur mit mindestens zwei freien Zeilen', () => {
    const won = (n: number) => playedRound('PLANT', [...WRONG.slice(0, n - 1), 'PLANT'], { mode: 'extreme' });
    expect(resultPlacement(won(4))).toBe('board');
    expect(resultPlacement(won(5))).toBe('keyboard');
    expect(resultPlacement(won(6))).toBe('keyboard');
    expect(resultPlacement(playedRound('PLANT', WRONG.slice(0, 6), { mode: 'extreme' }))).toBe('keyboard');
  });

  it('Extreme: kein Hinweis, auch nicht über den Reducer', () => {
    const round = playedRound('PLANT', ['HOUSE'], { mode: 'extreme', input: 'PL' });
    expect(canHint(round)).toBe(false);
    expect(giveHint(round, seededRandom(1))).toBe(round);
    const state = stateWith({}, 'en', { mode: 'extreme', extreme: { en: round } });
    expect(reducer(state, { type: 'hint', seed: 5 })).toBe(state);
    expect(canHint(playedRound('PLANT', ['HOUSE']))).toBe(true);
  });
});

describe('Vier Runden: Modus × Sprache', () => {
  it('Umschalten startet im neuen Modus eine eigene Runde, die andere bleibt unverändert', () => {
    let state = createInitialState(1);
    state = reducer(state, { type: 'tapKey', letter: 'K' });
    const normalDe = state.rounds.normal.de!;
    expect(normalDe.input).toBe('K');

    state = reducer(state, { type: 'setMode', mode: 'extreme', seed: 2 });
    expect(state.mode).toBe('extreme');
    const extremeDe = activeRound(state);
    expect(extremeDe.mode).toBe('extreme');
    expect(extremeDe.input).toBe('');
    expect(state.rounds.normal.de).toBe(normalDe);

    state = reducer(state, { type: 'tapKey', letter: 'W' });
    state = reducer(state, { type: 'setMode', mode: 'normal', seed: 3 });
    expect(activeRound(state)).toBe(normalDe);
    expect(state.rounds.extreme.de!.input).toBe('W');
    // Zurück in Extreme: dieselbe Runde, kein neues Wort
    expect(activeRound(reducer(state, { type: 'setMode', mode: 'extreme', seed: 4 })).solution).toBe(extremeDe.solution);
  });

  it('jede Kombination hat ihre Runde, Würfel und Sprache wirken nur auf die sichtbare', () => {
    let state = createInitialState(10);
    state = reducer(state, { type: 'setLang', lang: 'en', seed: 11 });
    state = reducer(state, { type: 'setMode', mode: 'extreme', seed: 12 });
    state = reducer(state, { type: 'setLang', lang: 'de', seed: 13 });
    const before = state;
    expect(Object.keys(state.rounds.normal).sort()).toEqual(['de', 'en']);
    expect(Object.keys(state.rounds.extreme).sort()).toEqual(['de', 'en']);
    expect(state.rounds.extreme.de!.mode).toBe('extreme');
    expect(state.rounds.normal.en!.mode).toBe('normal');

    state = reducer(state, { type: 'newRound', seed: 14 });
    expect(state.rounds.extreme.de!.solution).not.toBe(before.rounds.extreme.de!.solution);
    expect(state.rounds.extreme.en).toBe(before.rounds.extreme.en);
    expect(state.rounds.normal.de).toBe(before.rounds.normal.de);
    expect(state.rounds.normal.en).toBe(before.rounds.normal.en);
  });

  it('eine verspätete Wertung landet in der Runde, in der getippt wurde', () => {
    const normal = playedRound('WOLKE', [], { input: 'KOHLE' });
    const extreme = playedRound('TISCH', [], { mode: 'extreme', input: 'KOHLE' });
    let state = stateWith({ de: normal }, 'de', { mode: 'extreme', extreme: { de: extreme } });
    state = reducer(state, { type: 'commit', mode: 'normal', lang: 'de', word: 'KOHLE' });
    expect(state.rounds.normal.de!.guesses).toHaveLength(1);
    expect(state.rounds.extreme.de).toBe(extreme);
  });
});

describe('Gemeinsamer Wortstapel pro Sprache', () => {
  it('über beide Modi 250 Wörter ohne Wiederholung', () => {
    let state: GameState = createInitialState(7);
    state = reducer(state, { type: 'setMode', mode: 'extreme', seed: 8 });
    const words = [state.rounds.normal.de!.solution, state.rounds.extreme.de!.solution];
    for (let i = 0; i < 248; i++) {
      const mode = i % 2 === 0 ? 'normal' : 'extreme';
      state = reducer(state, { type: 'setMode', mode, seed: 100 + i });
      state = reducer(state, { type: 'newRound', seed: 500 + i });
      words.push(state.rounds[mode].de!.solution);
    }
    expect(new Set(words).size).toBe(250);
    expect(state.bags.de).toEqual([]);
  });

  it('nach dem Neumischen kommt das laufende Wort des anderen Modus nicht doppelt', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const first = shuffle(SOLUTIONS.de, seededRandom(seed))[0];
      const state = stateWith({ de: playedRound(first, []) }, 'de', { mode: 'extreme' });
      const next = startRound(state, 'extreme', 'de', seed);
      expect(next.rounds.extreme.de!.solution).not.toBe(first);
      expect(next.rounds.normal.de!.solution).toBe(first);
      // Das gemiedene Wort bleibt im Stapel und kommt später dran.
      expect(next.bags.de).toContain(first);
      expect(next.bags.de).toHaveLength(249);
    }
  });
});
