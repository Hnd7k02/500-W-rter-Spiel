import { describe, expect, it } from 'vitest';
import { score } from './score';

describe('score', () => {
  it.each([
    ['STERN', 'WOLKE', [0, 1, 4]],
    ['LAMPE', 'WOLKE', [1, 1, 3]],
    ['BLUME', 'WOLKE', [1, 1, 3]],
    ['KOHLE', 'WOLKE', [2, 2, 1]],
    ['WOLKE', 'WOLKE', [5, 0, 0]],
    ['HOUSE', 'PLANT', [0, 0, 5]],
    ['CRANE', 'PLANT', [2, 0, 3]],
    ['SLANT', 'PLANT', [4, 0, 1]],
    ['PLANT', 'PLANT', [5, 0, 0]],
    ['SPEED', 'ABIDE', [0, 2, 3]],
    ['EERIE', 'THREE', [2, 1, 2]],
    ['KASSE', 'TASSE', [4, 0, 1]],
    ['ALLEE', 'LEBEN', [1, 2, 2]],
    ['TASSE', 'STAAT', [0, 3, 2]],
  ])('%s gegen %s ergibt %j', (guess, solution, expected) => {
    expect(score(guess, solution)).toEqual(expected);
  });

  it('ergibt immer die Summe 5', () => {
    for (const [g, s] of [
      ['AAAAA', 'BBBBB'],
      ['ABCDE', 'EDCBA'],
      ['EEEEE', 'THREE'],
    ]) {
      const [a, b, c] = score(g, s);
      expect(a + b + c).toBe(5);
    }
  });
});
