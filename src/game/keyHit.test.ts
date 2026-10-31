import { describe, expect, it } from 'vitest';
import { fitsWord, resolveKey, type KeyRect } from './keyHit';

// Eine Reihe: A [0–40], S [46–86], D [92–132], darunter DEL [0–40] und ENTER [46–86], y 50–90.
const keys: KeyRect[] = [
  { id: 'A', left: 0, top: 0, right: 40, bottom: 40 },
  { id: 'S', left: 46, top: 0, right: 86, bottom: 40 },
  { id: 'D', left: 92, top: 0, right: 132, bottom: 40 },
  { id: 'DEL', left: 0, top: 50, right: 40, bottom: 90 },
  { id: 'ENTER', left: 46, top: 50, right: 86, bottom: 90 },
];
const all = () => true;

describe('resolveKey', () => {
  it('Mitte → getroffene Taste', () => {
    expect(resolveKey(66, 20, keys, all)).toBe('S');
    expect(resolveKey(66, 20, keys, (l) => l === 'A')).toBe('S');
  });

  it('Lücke → nächste Taste', () => {
    expect(resolveKey(44, 20, keys, all)).toBe('S');
    expect(resolveKey(42, 20, keys, all)).toBe('A');
  });

  it('Rand mit unmöglichem Buchstaben → möglicher Nachbar', () => {
    expect(resolveKey(48, 20, keys, (l) => l !== 'S')).toBe('A');
  });

  it('beide unmöglich → getroffene Taste', () => {
    expect(resolveKey(48, 20, keys, (l) => l === 'D')).toBe('S');
  });

  it('canType immer true → nie umleiten', () => {
    for (let x = 0; x <= 132; x += 2) {
      const hit = keys.filter((k) => k.top === 0).find((k) => x >= k.left && x <= k.right);
      if (hit) expect(resolveKey(x, 20, keys, all)).toBe(hit.id);
    }
  });

  it('DEL und ENTER nie Ziel einer Umleitung', () => {
    expect(resolveKey(20, 42, keys, () => false)).toBe('A');
    expect(resolveKey(66, 42, keys, () => false)).toBe('S');
    expect(resolveKey(20, 52, keys, () => false)).toBe('DEL');
  });
});

describe('fitsWord', () => {
  const words = ['HAUSE', 'HALLO', 'MAUSE'];
  it('mit Hinweis-Platz', () => {
    // Hinweis A an Stelle 2, erste leere Stelle ist 1.
    const slots = [{ letter: '' }, { letter: 'A' }, { letter: '' }, { letter: '' }, { letter: '' }];
    expect(fitsWord(slots, 'H', words)).toBe(true);
    expect(fitsWord(slots, 'X', words)).toBe(false);
    const next = [{ letter: 'H' }, { letter: 'A' }, { letter: '' }, { letter: '' }, { letter: '' }];
    expect(fitsWord(next, 'L', words)).toBe(true);
    expect(fitsWord(next, 'M', words)).toBe(false);
  });

  it('ohne leere Stelle: true', () => {
    expect(fitsWord('HALLO'.split('').map((letter) => ({ letter })), 'Z', words)).toBe(true);
  });
});
