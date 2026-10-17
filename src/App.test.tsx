import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from './App';
import { loadState, saveState } from './game/storage';
import type { GameState } from './game/types';
import { loadValidWords } from './game/words';
import { playedRound, stateWith } from './test/fixtures';

// Die Wortlisten einmal vorab laden, damit kein Test vom Timing des ersten Imports abhängt.
beforeAll(async () => {
  await Promise.all([loadValidWords('de'), loadValidWords('en')]);
}, 30_000);

function renderWith(state: GameState) {
  saveState(state);
  return render(<App />);
}

const keyboard = () => screen.getByRole('region', { name: 'Tastatur' });
const board = () => screen.getByRole('main', { name: 'Spielfeld' });
const key = (letter: string) => within(keyboard()).getByRole('button', { name: new RegExp(`^${letter}(,|$)`) });
const hideSwitch = () => screen.getByRole('switch', { name: 'Ausblenden' });
const tap = (word: string) => word.split('').forEach((l) => fireEvent.click(key(l)));
const press = (k: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(window, { key: k, ...init });
const rowText = (text: string) => within(board()).getByText(text);

describe('Eingabe und Wertung', () => {
  it('Tippen und Prüfen schreibt die Zeile fest und zeigt die Zahlen', async () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    tap('KOHLE');
    expect(rowText('Versuch 1, Eingabe: K O H L E')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Wort prüfen' }));
    expect(await within(board()).findByText('Versuch 1: 2 richtig, 2 im Wort, 1 falsch')).toBeTruthy();
    expect(loadState()?.rounds.de?.guesses[0].word).toBe('KOHLE');
  });

  it('meldet zu kurze, unbekannte und doppelte Wörter', async () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['KOHLE']) }));
    tap('KOH');
    fireEvent.click(screen.getByRole('button', { name: 'Wort prüfen' }));
    expect(screen.getByRole('status').textContent).toContain('Nicht genug Buchstaben');

    tap('XQ');
    fireEvent.click(screen.getByRole('button', { name: 'Wort prüfen' }));
    expect(await screen.findByText('Nicht in der Wortliste')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Buchstabe löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buchstabe löschen' }));
    tap('LE');
    fireEvent.click(screen.getByRole('button', { name: 'Wort prüfen' }));
    expect(await screen.findByText('Schon versucht')).toBeTruthy();
    expect(loadState()?.rounds.de?.guesses).toHaveLength(1);
  });

  it('die physische Tastatur schreibt, löscht und prüft; Cmd/Ctrl/Alt bleiben frei', async () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    press('k');
    press('o');
    press('x');
    press('Backspace');
    press('h', { metaKey: true });
    press('h', { ctrlKey: true });
    press('h', { altKey: true });
    press('ä');
    expect(rowText('Versuch 1, Eingabe: K O')).toBeTruthy();
    'HLE'.split('').forEach((l) => press(l));
    press('Enter');
    expect(await within(board()).findByText('Versuch 1: 2 richtig, 2 im Wort, 1 falsch')).toBeTruthy();
  });
});

describe('Markieren', () => {
  it('Antippen schaltet die Kachel weiter und färbt die Taste mit', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['STERN']) }));
    const tile = within(board()).getByRole('button', { name: 'S, ohne Markierung' });
    fireEvent.click(tile);
    expect(tile.getAttribute('aria-label')).toBe('S, falsch');
    expect(key('S').getAttribute('aria-label')).toBe('S, falsch');
    fireEvent.click(tile);
    fireEvent.click(tile);
    expect(tile.getAttribute('aria-label')).toBe('S, richtig');
    expect(key('S').getAttribute('data-mark')).toBe('right');
    fireEvent.click(tile);
    expect(tile.getAttribute('aria-label')).toBe('S, ohne Markierung');
    expect(key('S').getAttribute('data-mark')).toBeNull();
    // Die Wertung bleibt
    expect(rowText('Versuch 1: 0 richtig, 1 im Wort, 4 falsch')).toBeTruthy();
  });

  it('die Gewinnzeile ist grün und lässt sich nicht umfärben', () => {
    renderWith(stateWith({ en: playedRound('PLANT', ['HOUSE', 'PLANT']) }, 'en'));
    const winTiles = within(board()).getAllByRole('button', { name: /^P, richtig$/ });
    fireEvent.click(winTiles[0]);
    expect(winTiles[0].getAttribute('aria-label')).toBe('P, richtig');
    for (const l of 'PLANT') expect(key(l).getAttribute('data-mark')).toBe('right');
  });
});

describe('Ausblenden', () => {
  it('Schalter an: Tippen schraffiert statt zu schreiben, nochmals holt zurück', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    fireEvent.click(hideSwitch());
    expect(hideSwitch().getAttribute('aria-checked')).toBe('true');
    expect(keyboard().className).toContain('keyboard--hide');
    expect(screen.getByText('Tippe Buchstaben zum Ausblenden')).toBeTruthy();

    fireEvent.click(key('A'));
    expect(key('A').getAttribute('aria-pressed')).toBe('true');
    expect(key('A').getAttribute('aria-label')).toBe('A, ausgeblendet');
    expect(rowText('Versuch 1, leer')).toBeTruthy();
    press('b'); // physische Taste tut nichts
    expect(rowText('Versuch 1, leer')).toBeTruthy();
    fireEvent.click(key('A'));
    expect(key('A').getAttribute('aria-pressed')).toBe('false');
  });

  it('Schalter aus: Schraffur bleibt, gesperrte Tasten schreiben weder per Tippen noch physisch', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    tap('Q'); // schon getippt
    fireEvent.click(hideSwitch());
    ['Q', 'X', 'A'].forEach((l) => fireEvent.click(key(l)));
    fireEvent.click(hideSwitch());

    expect(hideSwitch().getAttribute('aria-checked')).toBe('false');
    expect(keyboard().className).not.toContain('keyboard--hide');
    expect(screen.getByText('3 Buchstaben ausgeblendet')).toBeTruthy();
    const q = key('Q');
    expect(q.hasAttribute('data-hidden')).toBe(true);
    expect(q.getAttribute('aria-disabled')).toBe('true');
    expect(q.getAttribute('aria-label')).toBe('Q, ausgeblendet');
    expect(q.getAttribute('aria-pressed')).toBeNull();
    // Schon getippte Buchstaben bleiben stehen.
    expect(rowText('Versuch 1, Eingabe: Q')).toBeTruthy();

    fireEvent.click(key('X'));
    press('x');
    press('a');
    expect(rowText('Versuch 1, Eingabe: Q')).toBeTruthy();

    // Alle anderen Tasten sind normal tippbar.
    expect(key('W').getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(key('W'));
    press('e');
    expect(rowText('Versuch 1, Eingabe: Q W E')).toBeTruthy();
  });

  it('zurückholen: Schalter an und nochmals antippen; die Unterzeile zählt mit', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', [], { hidden: ['Q'] }) }));
    expect(screen.getByText('1 Buchstabe ausgeblendet')).toBeTruthy();
    expect(key('Q').getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(hideSwitch());
    expect(key('Q').getAttribute('aria-disabled')).toBeNull();
    expect(key('Q').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(key('Q'));
    fireEvent.click(hideSwitch());

    expect(screen.getByText('Buchstaben grau schraffieren')).toBeTruthy();
    expect(key('Q').hasAttribute('data-hidden')).toBe(false);
    fireEvent.click(key('Q'));
    expect(rowText('Versuch 1, Eingabe: Q')).toBeTruthy();
  });

  it('ein neues Wort leert die Schraffur und schaltet aus', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', [], { hideMode: true, hidden: ['Q', 'X'] }) }));
    expect(key('Q').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Neues Wort würfeln' }));
    expect(hideSwitch().getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Buchstaben grau schraffieren')).toBeTruthy();
    expect(key('Q').hasAttribute('data-hidden')).toBe(false);
    expect(key('Q').getAttribute('aria-disabled')).toBeNull();
    press('q');
    expect(rowText('Versuch 1, Eingabe: Q')).toBeTruthy();
    expect(loadState()?.rounds.de?.hidden).toEqual([]);
  });

  it('nach Sieg leert «Neues Wort» die Schraffur ebenfalls', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['WOLKE'], { hidden: ['Q'] }) }));
    expect(key('Q').hasAttribute('data-hidden')).toBe(true);
    fireEvent.click(within(board()).getByRole('button', { name: 'Neues Wort' }));
    expect(key('Q').hasAttribute('data-hidden')).toBe(false);
    expect(loadState()?.rounds.de?.hidden).toEqual([]);
  });
});

describe('Würfel und Sprache', () => {
  it('fragt bei laufender Runde nach, Abbrechen lässt alles stehen', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['STERN']) }));
    fireEvent.click(screen.getByRole('button', { name: 'Neues Wort würfeln' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Neues Wort?' });
    expect(within(dialog).getByText('Die laufende Runde wird beendet.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(loadState()?.rounds.de?.guesses).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Neues Wort würfeln' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Neues Wort' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(loadState()?.rounds.de?.guesses).toHaveLength(0);
  });

  it('nach Sieg startet die neue Runde ohne Nachfrage, der Würfel leuchtet', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['WOLKE']) }));
    const dice = screen.getByRole('button', { name: 'Neues Wort würfeln' });
    expect(dice.className).toContain('dice--glow');
    fireEvent.click(dice);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(loadState()?.rounds.de?.status).toBe('playing');
    expect(dice.className).not.toContain('dice--glow');
  });

  it('DE und EN behalten ihre eigene Runde', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['STERN']) }));
    tap('KO');
    fireEvent.click(screen.getByRole('button', { name: 'Englisch' }));
    expect(screen.getByRole('button', { name: 'Englisch' }).getAttribute('aria-pressed')).toBe('true');
    expect(rowText('Versuch 1, leer')).toBeTruthy();
    tap('P');
    fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
    expect(rowText('Versuch 1: 0 richtig, 1 im Wort, 4 falsch')).toBeTruthy();
    expect(rowText('Versuch 2, Eingabe: K O')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Englisch' }));
    expect(rowText('Versuch 1, Eingabe: P')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '500 Wörter' })).toBeTruthy();
  });
});

describe('Ergebnis-Karte', () => {
  const words = ['HOUSE', 'CRANE', 'GHOST', 'PLATE', 'PLANE', 'PLAZA', 'SLANT'];

  it('Sieg mit freien Zeilen: im Spielfeld, die Ausblenden-Reihe bleibt', () => {
    renderWith(stateWith({ en: playedRound('PLANT', ['HOUSE', 'CRANE', 'SLANT', 'PLANT']) }, 'en'));
    const card = within(board()).getByTestId('result-card');
    expect(within(card).getByText('Geschafft!')).toBeTruthy();
    expect(within(card).getByText('PLANT in 4 Versuchen')).toBeTruthy();
    expect(within(keyboard()).queryByTestId('result-card')).toBeNull();
    expect(hideSwitch()).toBeTruthy();
  });

  it('Sieg im ersten Versuch', () => {
    renderWith(stateWith({ en: playedRound('PLANT', ['PLANT']) }, 'en'));
    expect(within(board()).getByText('PLANT im ersten Versuch')).toBeTruthy();
  });

  it('Sieg im 8. Versuch: kompakt in der Tastatur-Karte statt der Ausblenden-Reihe', () => {
    renderWith(stateWith({ en: playedRound('PLANT', [...words, 'PLANT']) }, 'en'));
    const card = within(keyboard()).getByTestId('result-card');
    expect(within(card).getByText('PLANT in 8 Versuchen')).toBeTruthy();
    expect(within(board()).queryByTestId('result-card')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(key('Q')).toBeTruthy();
  });

  it('Niederlage: in der Tastatur-Karte mit der Lösung', () => {
    renderWith(stateWith({ en: playedRound('PLANT', [...words, 'HEART']) }, 'en'));
    const card = within(keyboard()).getByTestId('result-card');
    expect(within(card).getByText('Leider nicht')).toBeTruthy();
    expect(within(card).getByText('Das Wort war: PLANT')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('«Neues Wort» in der Karte startet sofort eine neue Runde', () => {
    renderWith(stateWith({ en: playedRound('PLANT', [...words, 'HEART']) }, 'en'));
    fireEvent.click(within(keyboard()).getByRole('button', { name: 'Neues Wort' }));
    expect(screen.queryByTestId('result-card')).toBeNull();
    expect(loadState()?.rounds.en?.status).toBe('playing');
    expect(loadState()?.rounds.en?.solution).not.toBe('PLANT');
  });

  it('nach dem Ende ist keine Eingabe mehr möglich', () => {
    renderWith(stateWith({ en: playedRound('PLANT', ['PLANT']) }, 'en'));
    tap('AB');
    press('c');
    expect(loadState()?.rounds.en?.input).toBe('');
  });
});
