import { describe, expect, it } from 'vitest';
import solutions from './solutions.json';
import validDe from './valid-de.json';
import validEn from './valid-en.json';

const FIVE = /^[A-Z]{5}$/;

describe('Lösungswörter', () => {
  it.each([
    ['de', solutions.de],
    ['en', solutions.en],
  ] as const)('%s: genau 250 Wörter mit 5 Buchstaben A–Z, ohne Duplikate', (_lang, words) => {
    expect(words).toHaveLength(250);
    for (const w of words) expect(w).toMatch(FIVE);
    expect(new Set(words).size).toBe(250);
  });

  it('kein Wort in beiden Sprachen: 500 verschiedene Wörter', () => {
    expect(new Set([...solutions.de, ...solutions.en]).size).toBe(500);
  });

  it('Schweizer Schreibweise: kein ß, keine Umlaute', () => {
    for (const w of [...solutions.de, ...solutions.en]) expect(w).not.toMatch(/[ßÄÖÜäöü]/);
  });
});

describe('gültige Rateversuche', () => {
  it.each([
    ['de', validDe, solutions.de],
    ['en', validEn, solutions.en],
  ] as const)('%s: nur 5 Buchstaben A–Z, ohne Duplikate, alle Lösungen enthalten', (_lang, valid, own) => {
    for (const w of valid) expect(w).toMatch(FIVE);
    const set = new Set(valid);
    expect(set.size).toBe(valid.length);
    for (const w of own) expect(set.has(w), w).toBe(true);
  });

  it('haben ungefähr die erwartete Grösse', () => {
    expect(validDe.length).toBeGreaterThan(3500);
    expect(validEn.length).toBeGreaterThan(12000);
  });
});
