import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App, HINT_ARMED_MS, UNDO_MS } from './App';
import { commitGuess } from './game/state';
import { loadState, saveState } from './game/storage';
import type { GameState } from './game/types';
import { loadValidWords } from './game/words';
import { playedRound, stateWith, withMarks } from './test/fixtures';

beforeAll(async () => {
  await Promise.all([loadValidWords('de'), loadValidWords('en')]);
}, 30_000);

afterEach(() => {
  vi.useRealTimers();
});

function renderWith(state: GameState) {
  saveState(state);
  return render(<App />);
}

const keyboard = () => screen.getByRole('region', { name: 'Tastatur' });
const board = () => screen.getByRole('main', { name: 'Spielfeld' });
const key = (letter: string) => within(keyboard()).getByRole('button', { name: new RegExp(`^${letter}(,|$)`) });
const tap = (word: string) => word.split('').forEach((l) => fireEvent.click(key(l)));
const rowText = (text: string) => within(board()).getByText(text);
const eraser = () => screen.queryByRole('button', { name: 'Farben löschen' });
const hintBtn = () => screen.getByRole('button', { name: 'Hinweis' });
const BUBBLE = 'Nochmals tippen für einen grünen Buchstaben';

describe('Tastatur', () => {
  it('unterste Reihe: Löschen links, Y bis M, Prüfen rechts', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    const rows = keyboard().querySelectorAll<HTMLElement>('.kb-row');
    const last = rows[rows.length - 1];
    const labels = within(last).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Buchstabe löschen', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'Wort prüfen']);
    expect(within(last).getByRole('button', { name: 'Wort prüfen' }).className).toContain('key--action');
  });
});

describe('Farben löschen', () => {
  const marked = () =>
    stateWith({ de: withMarks(withMarks(playedRound('WOLKE', ['STERN', 'LAMPE']), 0, 'xxvxx'), 1, 'vxxxr') });

  it('erscheint erst, wenn es eine eigene Markierung gibt', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['STERN']) }));
    expect(eraser()).toBeNull();
    fireEvent.click(within(board()).getByRole('button', { name: 'S, ohne Markierung' }));
    expect(eraser()).not.toBeNull();
  });

  it('löscht alle eigenen Farben, «Rückgängig» holt sie zurück', () => {
    renderWith(marked());
    expect(key('E').getAttribute('data-mark')).toBe('right');
    fireEvent.click(eraser()!);

    expect(within(board()).queryAllByRole('button', { name: /, (falsch|im Wort|richtig)$/ })).toHaveLength(0);
    expect(key('E').getAttribute('data-mark')).toBeNull();
    expect(eraser()).toBeNull();
    expect(screen.getByText('Farben gelöscht')).toBeTruthy();
    expect(loadState()?.rounds.normal.de?.guesses.every((g) => g.marks.every((m) => m === 0))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(within(board()).getAllByRole('button', { name: 'E, richtig' })).toHaveLength(1);
    expect(key('E').getAttribute('data-mark')).toBe('right');
    expect(screen.queryByText('Farben gelöscht')).toBeNull();
    expect(eraser()).not.toBeNull();
  });

  it('die Meldung verschwindet nach 5 s', () => {
    vi.useFakeTimers();
    renderWith(marked());
    fireEvent.click(eraser()!);
    act(() => {
      vi.advanceTimersByTime(UNDO_MS - 100);
    });
    expect(screen.queryByText('Farben gelöscht')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText('Farben gelöscht')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rückgängig' })).toBeNull();
  });

  it('die grüne Gewinnzeile, Hinweis-Buchstaben und die Schraffur bleiben', () => {
    let de = commitGuess({ ...playedRound('WOLKE', []), hints: [1], input: 'KHLE', hidden: ['Q'] }, 'KOHLE');
    de = withMarks(de, 0, 'xrxvv');
    de = commitGuess({ ...de, input: 'WOLKE' }, 'WOLKE');
    renderWith(stateWith({ de }));
    fireEvent.click(eraser()!);
    expect(within(board()).getByRole('button', { name: 'O, Hinweis' })).toBeTruthy();
    expect(within(board()).getAllByRole('button', { name: /, richtig$/ })).toHaveLength(5);
    expect(within(board()).getByRole('button', { name: 'K, ohne Markierung' })).toBeTruthy();
    expect(key('Q').hasAttribute('data-hidden')).toBe(true);
  });
});

describe('Hinweis', () => {
  it('braucht zwei Tipps: Der erste drückt den Button ein und zeigt die Sprechblase', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    expect(hintBtn().getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(hintBtn());
    expect(hintBtn().getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(BUBBLE)).toBeTruthy();
    expect(loadState()?.rounds.normal.de?.hints).toEqual([]);

    fireEvent.click(hintBtn());
    expect(hintBtn().getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText(BUBBLE)).toBeNull();
    const [col] = loadState()!.rounds.normal.de!.hints;
    expect(col).toBeGreaterThanOrEqual(0);
    expect(rowText(`Versuch 1, Hinweis an Stelle ${col + 1}: ${'WOLKE'[col]}`)).toBeTruthy();
    expect(key('WOLKE'[col]).getAttribute('data-mark')).toBe('right');
  });

  it('springt nach 3 s zurück, ohne einen Hinweis zu geben', () => {
    vi.useFakeTimers();
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    fireEvent.click(hintBtn());
    act(() => {
      vi.advanceTimersByTime(HINT_ARMED_MS - 50);
    });
    expect(hintBtn().getAttribute('aria-pressed')).toBe('true');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(hintBtn().getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText(BUBBLE)).toBeNull();
    // Ein einzelner Tipp danach drückt nur wieder ein.
    fireEvent.click(hintBtn());
    expect(loadState()?.rounds.normal.de?.hints).toEqual([]);
  });

  it('springt bei einem Tipp woanders zurück, dieser Tipp wirkt normal', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    fireEvent.click(hintBtn());
    fireEvent.click(key('K'));
    expect(hintBtn().getAttribute('aria-pressed')).toBe('false');
    expect(rowText('Versuch 1, Eingabe: K')).toBeTruthy();
    expect(loadState()?.rounds.normal.de?.hints).toEqual([]);
  });

  it('blendet «Farben löschen» unter der Sprechblase aus, ein Tipp auf die Blase schliesst sie nur', () => {
    renderWith(stateWith({ de: withMarks(playedRound('WOLKE', ['STERN']), 0, 'xxvxx') }));
    expect(eraser()).not.toBeNull();
    fireEvent.click(hintBtn());
    expect(eraser()).toBeNull();

    fireEvent.click(screen.getByText(BUBBLE));
    expect(hintBtn().getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText(BUBBLE)).toBeNull();
    expect(eraser()).not.toBeNull();
    expect(loadState()?.rounds.normal.de?.hints).toEqual([]);
    expect(loadState()?.rounds.normal.de?.guesses[0].marks).toEqual([1, 1, 2, 1, 1]);
  });

  it('Tippen und Löschen überspringen den Hinweis, beim Prüfen zählt er mit und bleibt grün', async () => {
    renderWith(stateWith({ de: { ...playedRound('WOLKE', []), hints: [1] } }));
    tap('KHLEA');
    expect(rowText('Versuch 1, Eingabe: K H L E, Hinweis an Stelle 2: O')).toBeTruthy();
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Buchstabe löschen' }));
    expect(rowText('Versuch 1, Hinweis an Stelle 2: O')).toBeTruthy();

    tap('KHLE');
    fireEvent.click(screen.getByRole('button', { name: 'Wort prüfen' }));
    expect(await within(board()).findByText('Versuch 1: 2 richtig, 2 im Wort, 1 falsch')).toBeTruthy();
    const hintTile = within(board()).getByRole('button', { name: 'O, Hinweis' });
    expect(hintTile.getAttribute('aria-disabled')).toBe('true');
    expect(hintTile.getAttribute('data-mark')).toBe('right');
    fireEvent.click(hintTile);
    expect(within(board()).getByRole('button', { name: 'O, Hinweis' })).toBeTruthy();
    expect(key('O').getAttribute('data-mark')).toBe('right');
    expect(loadState()?.rounds.normal.de?.guesses[0].hints).toEqual([1]);
  });

  it('hebt die Schraffur des Hinweis-Buchstabens auf', () => {
    // Frei ist nur Platz 3, dort gehört ein L hin.
    renderWith(stateWith({ de: { ...playedRound('WOLKE', []), input: 'WO', hints: [3, 4], hidden: ['L', 'Q'] } }));
    expect(key('L').hasAttribute('data-hidden')).toBe(true);
    fireEvent.click(hintBtn());
    fireEvent.click(hintBtn());
    expect(key('L').hasAttribute('data-hidden')).toBe(false);
    expect(key('L').getAttribute('data-mark')).toBe('right');
    expect(key('Q').hasAttribute('data-hidden')).toBe(true);
    expect(loadState()?.rounds.normal.de?.hidden).toEqual(['Q']);
  });

  it('ist nach Rundenende und bei fünf Hinweisen gesperrt', () => {
    const { unmount } = renderWith(stateWith({ de: playedRound('WOLKE', ['WOLKE']) }));
    expect(hintBtn().getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(hintBtn());
    expect(hintBtn().getAttribute('aria-pressed')).toBe('false');
    unmount();

    renderWith(stateWith({ de: { ...playedRound('WOLKE', []), hints: [0, 1, 2, 3, 4] } }));
    expect(hintBtn().getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(hintBtn());
    expect(screen.queryByText(BUBBLE)).toBeNull();
  });

  it('Hinweise werden gespeichert und nach dem Neuladen wieder gezeigt', () => {
    const { unmount } = renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    fireEvent.click(hintBtn());
    fireEvent.click(hintBtn());
    const saved = loadState()!.rounds.normal.de!.hints;
    expect(saved).toHaveLength(1);
    unmount();
    render(<App />);
    expect(rowText(`Versuch 1, Hinweis an Stelle ${saved[0] + 1}: ${'WOLKE'[saved[0]]}`)).toBeTruthy();
  });
});
