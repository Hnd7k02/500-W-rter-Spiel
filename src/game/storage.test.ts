import { describe, expect, it } from 'vitest';
import { playedRound, withMarks } from '../test/fixtures';
import { commitGuess, createInitialState, ensureActiveRound, reducer } from './state';
import { LEGACY_STORAGE_KEY, loadState, migrateLegacyState, parseState, saveState, STORAGE_KEY } from './storage';
import type { GameState } from './types';

/** Alle vier Runden belegt, Extreme aktiv */
function richState(): GameState {
  let state = createInitialState(21);
  state = reducer(state, { type: 'setLang', lang: 'en', seed: 22 });
  let en = playedRound('PLANT', ['HOUSE', 'CRANE'], { input: 'SLA', hideMode: true, hidden: ['Q', 'X', 'Z'] });
  en = withMarks(en, 0, 'xnvrx');
  const de = withMarks(playedRound('WOLKE', ['STERN', 'KOHLE']), 1, 'vrxvr');
  const xde = withMarks(playedRound('TISCH', ['STERN'], { mode: 'extreme', input: 'TI', hidden: ['Q'] }), 0, 'vxxxv');
  const xen = playedRound('HOUSE', ['CRANE', 'HOUSE'], { mode: 'extreme' });
  return { ...state, mode: 'extreme', rounds: { normal: { de, en }, extreme: { de: xde, en: xen } } };
}

/** Spielstand im alten Format 500w:v1: eine Runde pro Sprache, ohne Modus */
const legacy = {
  lang: 'en',
  rounds: {
    de: {
      solution: 'WOLKE',
      guesses: [{ word: 'STERN', score: [0, 1, 4], marks: [1, 0, 2, 0, 0], hints: [] }],
      input: 'KO',
      hints: [3],
      hidden: ['Q'],
      hideMode: false,
      status: 'playing',
    },
    en: {
      solution: 'PLANT',
      guesses: [{ word: 'PLANT', score: [5, 0, 0], marks: [3, 3, 3, 3, 3], hints: [] }],
      input: '',
      hints: [],
      hidden: [],
      hideMode: false,
      status: 'won',
    },
  },
  bags: { de: ['ABEND', 'ADLER'], en: ['APPLE'] },
};

describe('Speichern und Laden', () => {
  it('stellt den Zustand exakt wieder her, mit Modus und allen vier Runden', () => {
    const state = richState();
    saveState(state);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    const loaded = loadState()!;
    expect(loaded).toEqual(state);
    expect(loaded.mode).toBe('extreme');
    expect(loaded.rounds.extreme.de!.mode).toBe('extreme');
    expect(loaded.rounds.normal.de!.mode).toBe('normal');
  });

  it('auch gewonnene und verlorene Runden samt Stapeln, Extreme verloren nach 6 Versuchen', () => {
    const six = ['HOUSE', 'CRANE', 'SLANT', 'GHOST', 'PLATE', 'HEART'];
    const state: GameState = {
      mode: 'normal',
      lang: 'de',
      rounds: {
        normal: {
          de: playedRound('WOLKE', ['STERN', 'WOLKE']),
          en: playedRound('PLANT', [...six, 'PLANE', 'PLAZA']),
        },
        extreme: { en: playedRound('PLANT', six, { mode: 'extreme' }) },
      },
      bags: { de: ['ABEND', 'ADLER'], en: ['APPLE'] },
    };
    expect(state.rounds.extreme.en!.status).toBe('lost');
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it('speichert Hinweise der aktuellen Zeile und der gewerteten Zeilen', () => {
    let de = commitGuess({ ...playedRound('WOLKE', []), hints: [1], input: 'KHLE' }, 'KOHLE');
    de = { ...de, hints: [0, 4], input: 'AB' };
    const state: GameState = { mode: 'normal', lang: 'de', rounds: { normal: { de }, extreme: {} }, bags: { de: [], en: [] } };
    saveState(state);
    const loaded = loadState()!;
    expect(loaded).toEqual(state);
    expect(loaded.rounds.normal.de!.hints).toEqual([0, 4]);
    expect(loaded.rounds.normal.de!.guesses[0].hints).toEqual([1]);
  });

  it('liegt unter dem versionierten Schlüssel 500w:v2, der Vorgänger war 500w:v1', () => {
    expect(STORAGE_KEY).toBe('500w:v2');
    expect(LEGACY_STORAGE_KEY).toBe('500w:v1');
  });

  it('ohne gespeicherten Stand gibt es nichts zu laden', () => {
    expect(loadState()).toBeNull();
  });

  it('kaputte Daten führen nicht zum Absturz', () => {
    localStorage.setItem(STORAGE_KEY, '{kaputt');
    expect(loadState()).toBeNull();
    expect(parseState(42)).toBeNull();
    expect(migrateLegacyState('nein')).toBeNull();
  });

  it('ein unbekannter Modus gilt als Normal', () => {
    const parsed = parseState({ mode: 'hölle', lang: 'en', rounds: {}, bags: {} })!;
    expect(parsed.mode).toBe('normal');
    expect(parsed.lang).toBe('en');
    expect(parsed.rounds).toEqual({ normal: {}, extreme: {} });
  });

  it('eine unbrauchbare Runde fällt weg und startet neu, der Rest bleibt', () => {
    const state = richState();
    const raw = JSON.parse(JSON.stringify(state));
    raw.rounds.normal.de.guesses[0].score = [9, 9, 9];
    raw.bags.en.push('NICHT', 'APPLE', 'APPLE');
    const parsed = parseState(raw)!;
    expect(parsed.rounds.normal.de).toBeUndefined();
    expect(parsed.rounds.normal.en).toEqual(state.rounds.normal.en);
    expect(parsed.rounds.extreme).toEqual(state.rounds.extreme);
    expect(new Set(parsed.bags.en).size).toBe(parsed.bags.en.length);
    expect(parsed.bags.en).not.toContain('NICHT');
    const repaired = ensureActiveRound({ ...parsed, mode: 'normal', lang: 'de' }, 3);
    expect(repaired.rounds.normal.de?.status).toBe('playing');
  });

  it('verwirft eine Eingabe, die mit den Hinweisen nicht zusammenpasst', () => {
    const de = { ...playedRound('WOLKE', []), hints: [0, 1], input: 'ABCD' };
    expect(parseState({ lang: 'de', rounds: { normal: { de } }, bags: {} })!.rounds.normal.de).toBeUndefined();
  });

  it('Extreme-Runden: höchstens 6 Versuche und keine Hinweise', () => {
    const seven = playedRound('PLANT', ['HOUSE', 'CRANE', 'SLANT', 'GHOST', 'PLATE', 'HEART', 'PLANE']);
    const withHint = { ...playedRound('PLANT', [], { mode: 'extreme' }), hints: [2] };
    const parsed = parseState({ rounds: { extreme: { de: seven, en: withHint } } })!;
    expect(parsed.rounds.extreme).toEqual({});
    // Dieselbe Runde mit 7 Versuchen ist im Normal-Modus in Ordnung.
    expect(parseState({ rounds: { normal: { de: seven } } })!.rounds.normal.de).toEqual(seven);
  });

  it('der Status muss zu den Versuchen passen', () => {
    const six = playedRound('PLANT', ['HOUSE', 'CRANE', 'SLANT', 'GHOST', 'PLATE', 'HEART'], { mode: 'extreme' });
    const stuck = { ...six, status: 'playing' };
    const early = { ...playedRound('PLANT', ['HOUSE'], { mode: 'extreme' }), status: 'lost' };
    expect(parseState({ rounds: { extreme: { de: stuck, en: early } } })!.rounds.extreme).toEqual({});
    expect(parseState({ rounds: { extreme: { de: six } } })!.rounds.extreme.de!.status).toBe('lost');
  });
});

describe('Migration von 500w:v1', () => {
  it('bestehende Runden laufen im Normal-Modus weiter, Sprache und Stapel bleiben', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    const state = loadState()!;
    expect(state.mode).toBe('normal');
    expect(state.lang).toBe('en');
    expect(state.rounds.extreme).toEqual({});
    expect(state.rounds.normal.de).toMatchObject({ mode: 'normal', solution: 'WOLKE', input: 'KO', hints: [3], hidden: ['Q'] });
    expect(state.rounds.normal.de!.guesses[0].marks).toEqual([1, 0, 2, 0, 0]);
    expect(state.rounds.normal.en).toMatchObject({ mode: 'normal', solution: 'PLANT', status: 'won' });
    expect(state.bags).toEqual(legacy.bags);
  });

  it('auch ganz alte Stände ohne Hinweise', () => {
    const old = JSON.parse(JSON.stringify(legacy));
    delete old.rounds.de.hints;
    delete old.rounds.de.guesses[0].hints;
    const state = migrateLegacyState(old)!;
    expect(state.rounds.normal.de!.hints).toEqual([]);
    expect(state.rounds.normal.de!.guesses[0].hints).toEqual([]);
  });

  it('nach dem ersten Speichern liegt alles unter v2 und der alte Schlüssel ist weg', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    const migrated = loadState()!;
    saveState(migrated);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).mode).toBe('normal');
    expect(loadState()).toEqual(migrated);
  });

  it('gibt es schon einen Stand unter v2, zählt nur dieser', () => {
    const state = richState();
    saveState(state);
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    expect(loadState()).toEqual(state);
  });
});
