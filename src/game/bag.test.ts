import { describe, expect, it } from 'vitest';
import { drawWord, seededRandom, shuffle } from './bag';
import { createInitialState, reducer } from './state';
import { SOLUTIONS } from './words';

describe('Shuffle-Bag', () => {
  it('zieht 250 Wörter ohne Wiederholung', () => {
    const all = SOLUTIONS.de;
    const random = seededRandom(42);
    let bag: string[] = [];
    let last: string | null = null;
    const seen: string[] = [];
    for (let i = 0; i < 250; i++) {
      const next = drawWord(bag, all, last ? [last] : [], random);
      bag = next.bag;
      last = next.word;
      seen.push(next.word);
    }
    expect(new Set(seen).size).toBe(250);
    expect(new Set(seen)).toEqual(new Set(all));
    expect(bag).toEqual([]);
  });

  it('nach dem Neumischen kommt das letzte Wort nicht sofort wieder', () => {
    const all = SOLUTIONS.en;
    for (let seed = 1; seed <= 300; seed++) {
      const random = seededRandom(seed);
      // Wort, das beim Neumischen zuerst käme, als «zuletzt gespielt» erzwingen
      const first = shuffle(all, seededRandom(seed))[0];
      const next = drawWord([], all, [first], random);
      expect(next.word).not.toBe(first);
      expect(next.bag).toHaveLength(249);
      expect(new Set([next.word, ...next.bag]).size).toBe(250);
    }
  });

  it('speichert die Wörter selbst, keine Indizes', () => {
    const { bag } = drawWord([], SOLUTIONS.de, [], seededRandom(7));
    for (const w of bag) expect(SOLUTIONS.de).toContain(w);
  });

  it('über den Würfel: 250 Runden ohne Wiederholung, danach nicht dasselbe Wort', () => {
    let state = createInitialState(1);
    const words = [state.rounds.normal.de!.solution];
    for (let i = 0; i < 249; i++) {
      state = reducer(state, { type: 'newRound', seed: 1000 + i });
      words.push(state.rounds.normal.de!.solution);
    }
    expect(new Set(words).size).toBe(250);
    expect(state.bags.de).toEqual([]);
    for (let seed = 0; seed < 50; seed++) {
      const after = reducer(state, { type: 'newRound', seed });
      expect(after.rounds.normal.de!.solution).not.toBe(words[249]);
    }
  });
});
