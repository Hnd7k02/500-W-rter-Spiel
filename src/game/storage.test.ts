import { describe, expect, it } from 'vitest';
import { playedRound, withMarks } from '../test/fixtures';
import { commitGuess, createInitialState, ensureActiveRound, reducer } from './state';
import { loadState, parseState, saveState, STORAGE_KEY } from './storage';
import type { GameState } from './types';

function richState(): GameState {
  let state = createInitialState(21);
  state = reducer(state, { type: 'setLang', lang: 'en', seed: 22 });
  let en = playedRound('PLANT', ['HOUSE', 'CRANE'], { input: 'SLA', hideMode: true, hidden: ['Q', 'X', 'Z'] });
  en = withMarks(en, 0, 'xnvrx');
  const de = withMarks(playedRound('WOLKE', ['STERN', 'KOHLE']), 1, 'vrxvr');
  return { ...state, rounds: { de, en } };
}

describe('Speichern und Laden', () => {
  it('stellt den Zustand exakt wieder her', () => {
    const state = richState();
    saveState(state);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(loadState()).toEqual(state);
  });

  it('auch eine gewonnene und eine verlorene Runde samt Stapeln', () => {
    const state: GameState = {
      lang: 'de',
      rounds: {
        de: playedRound('WOLKE', ['STERN', 'WOLKE']),
        en: playedRound('PLANT', ['HOUSE', 'CRANE', 'SLANT', 'GHOST', 'PLATE', 'PLANE', 'PLAZA', 'HEART']),
      },
      bags: { de: ['ABEND', 'ADLER'], en: ['APPLE'] },
    };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it('speichert Hinweise der aktuellen Zeile und der gewerteten Zeilen', () => {
    let de = commitGuess({ ...playedRound('WOLKE', []), hints: [1], input: 'KHLE' }, 'KOHLE');
    de = { ...de, hints: [0, 4], input: 'AB' };
    const state: GameState = { lang: 'de', rounds: { de }, bags: { de: [], en: [] } };
    saveState(state);
    const loaded = loadState()!;
    expect(loaded).toEqual(state);
    expect(loaded.rounds.de!.hints).toEqual([0, 4]);
    expect(loaded.rounds.de!.guesses[0].hints).toEqual([1]);
  });

  it('ältere Spielstände ohne Hinweise laden weiter', () => {
    const old = {
      lang: 'de',
      rounds: {
        de: {
          solution: 'WOLKE',
          guesses: [{ word: 'STERN', score: [0, 1, 4], marks: [1, 0, 2, 0, 0] }],
          input: 'KO',
          hidden: [],
          hideMode: false,
          status: 'playing',
        },
      },
      bags: { de: [], en: [] },
    };
    const parsed = parseState(old)!;
    expect(parsed.rounds.de!.hints).toEqual([]);
    expect(parsed.rounds.de!.guesses[0].hints).toEqual([]);
    expect(parsed.rounds.de!.input).toBe('KO');
  });

  it('verwirft eine Eingabe, die mit den Hinweisen nicht zusammenpasst', () => {
    const bad = { lang: 'de', rounds: { de: { ...playedRound('WOLKE', []), hints: [0, 1], input: 'ABCD' } }, bags: {} };
    expect(parseState(bad)!.rounds.de).toBeUndefined();
  });

  it('liegt unter dem versionierten Schlüssel 500w:v1', () => {
    expect(STORAGE_KEY).toBe('500w:v1');
  });

  it('ohne gespeicherten Stand gibt es nichts zu laden', () => {
    expect(loadState()).toBeNull();
  });

  it('kaputte Daten führen nicht zum Absturz', () => {
    localStorage.setItem(STORAGE_KEY, '{kaputt');
    expect(loadState()).toBeNull();
    expect(parseState(42)).toBeNull();
  });

  it('eine unbrauchbare Runde fällt weg und startet neu, der Rest bleibt', () => {
    const state = richState();
    const raw = JSON.parse(JSON.stringify(state));
    raw.rounds.de.guesses[0].score = [9, 9, 9];
    raw.bags.en.push('NICHT', 'APPLE', 'APPLE');
    const parsed = parseState(raw)!;
    expect(parsed.rounds.de).toBeUndefined();
    expect(parsed.rounds.en).toEqual(state.rounds.en);
    expect(new Set(parsed.bags.en).size).toBe(parsed.bags.en.length);
    expect(parsed.bags.en).not.toContain('NICHT');
    const repaired = ensureActiveRound({ ...parsed, lang: 'de' }, 3);
    expect(repaired.rounds.de?.status).toBe('playing');
  });
});
