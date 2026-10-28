import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App, THEME_COLORS } from './App';
import { LEGACY_STORAGE_KEY, loadState, saveState, STORAGE_KEY } from './game/storage';
import type { GameState } from './game/types';
import { loadValidWords } from './game/words';
import { playedRound, stateWith } from './test/fixtures';

beforeAll(async () => {
  await Promise.all([loadValidWords('de'), loadValidWords('en')]);
}, 30_000);

afterEach(() => {
  document.head.querySelectorAll('meta[data-test]').forEach((m) => m.remove());
});

function renderWith(state: GameState) {
  saveState(state);
  return render(<App />);
}

const keyboard = () => screen.getByRole('region', { name: 'Tastatur' });
const board = () => screen.getByRole('main', { name: 'Spielfeld' });
const key = (letter: string) => within(keyboard()).getByRole('button', { name: new RegExp(`^${letter}(,|$)`) });
const tap = (word: string) => word.split('').forEach((l) => fireEvent.click(key(l)));
const modeSwitch = () => screen.getByRole('button', { name: '500 Extreme' });
const rowCount = () => board().querySelectorAll('.board > .row').length;
const WRONG = ['HOUSE', 'CRANE', 'GHOST', 'PLATE', 'HEART'];

describe('Umschalten Normal ⇄ «500 Extreme»', () => {
  it('in beide Richtungen: Logos tauschen, 6 statt 8 Zeilen, Look auf <html>', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    expect(screen.getByRole('heading', { level: 1, name: '500 Wörter' })).toBeTruthy();
    expect(modeSwitch().getAttribute('aria-pressed')).toBe('false');
    expect(rowCount()).toBe(8);
    expect(document.documentElement.dataset.mode).toBe('normal');

    fireEvent.click(modeSwitch());
    expect(screen.getByRole('heading', { level: 1, name: '500 Extreme' })).toBeTruthy();
    expect(modeSwitch().getAttribute('aria-pressed')).toBe('true');
    expect(modeSwitch().textContent).toBe('500 Wörter');
    expect(rowCount()).toBe(6);
    expect(document.documentElement.dataset.mode).toBe('extreme');
    expect(loadState()?.mode).toBe('extreme');

    fireEvent.click(modeSwitch());
    expect(screen.getByRole('heading', { level: 1, name: '500 Wörter' })).toBeTruthy();
    expect(modeSwitch().getAttribute('aria-pressed')).toBe('false');
    expect(rowCount()).toBe(8);
    expect(document.documentElement.dataset.mode).toBe('normal');
    expect(loadState()?.mode).toBe('normal');
  });

  it('theme-color und color-scheme folgen dem Modus', () => {
    for (const [name, content] of [['theme-color', THEME_COLORS.normal], ['color-scheme', 'light']]) {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      meta.dataset.test = '';
      document.head.append(meta);
    }
    const meta = (name: string) => document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)!.content;
    renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    fireEvent.click(modeSwitch());
    expect(meta('theme-color')).toBe('#050507');
    expect(meta('color-scheme')).toBe('dark');
    fireEvent.click(modeSwitch());
    expect(meta('theme-color')).toBe('#F1F2F6');
    expect(meta('color-scheme')).toBe('light');
  });

  it('jeder Modus behält seine eigene Runde, beim Umschalten geht nichts verloren', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', ['STERN']) }));
    tap('KO');
    fireEvent.click(modeSwitch());
    // Extreme startet eine eigene, leere Runde
    expect(within(board()).getByText('Versuch 1, leer')).toBeTruthy();
    tap('W');
    expect(within(board()).getByText('Versuch 1, Eingabe: W')).toBeTruthy();

    fireEvent.click(modeSwitch());
    expect(within(board()).getByText('Versuch 2, Eingabe: K O')).toBeTruthy();
    expect(within(board()).getByText('Versuch 1: 0 richtig, 1 im Wort, 4 falsch')).toBeTruthy();

    const saved = loadState()!;
    expect(saved.rounds.normal.de).toMatchObject({ solution: 'WOLKE', input: 'KO' });
    expect(saved.rounds.extreme.de).toMatchObject({ mode: 'extreme', input: 'W' });
    expect(saved.rounds.extreme.de!.solution).not.toBe('WOLKE');
  });
});

describe('Regeln im Extreme-Modus', () => {
  it('Niederlage nach 6 Versuchen: «Verbrannt» mit der Lösung', async () => {
    renderWith(stateWith({}, 'en', { mode: 'extreme', extreme: { en: playedRound('PLANT', WRONG, { mode: 'extreme' }) } }));
    expect(rowCount()).toBe(6);
    tap('SLANT');
    fireEvent.click(screen.getByRole('button', { name: 'Wort prüfen' }));
    const card = await within(keyboard()).findByTestId('result-card');
    expect(within(card).getByText('Verbrannt')).toBeTruthy();
    expect(within(card).getByText('Das Wort war: PLANT')).toBeTruthy();
    expect(loadState()?.rounds.extreme.en?.status).toBe('lost');
    expect(loadState()?.rounds.extreme.en?.guesses).toHaveLength(6);
  });

  it('Sieg: «Höllisch gut!»', () => {
    renderWith(stateWith({}, 'en', { mode: 'extreme', extreme: { en: playedRound('PLANT', ['HOUSE', 'PLANT'], { mode: 'extreme' }) } }));
    const card = within(board()).getByTestId('result-card');
    expect(within(card).getByText('Höllisch gut!')).toBeTruthy();
    expect(within(card).getByText('PLANT in 2 Versuchen')).toBeTruthy();
  });

  it('kein «?» und keine Hinweis-Buchstaben, im Normal-Modus ist «?» wieder da', () => {
    renderWith(stateWith({ de: playedRound('WOLKE', []) }, 'de', { mode: 'extreme' }));
    expect(screen.queryByRole('button', { name: 'Hinweis' })).toBeNull();
    expect(screen.queryByText('Nochmals tippen für einen grünen Buchstaben')).toBeNull();
    tap('WOL');
    expect(within(board()).getByText('Versuch 1, Eingabe: W O L')).toBeTruthy();
    expect(loadState()?.rounds.extreme.de?.hints).toEqual([]);

    fireEvent.click(modeSwitch());
    expect(screen.getByRole('button', { name: 'Hinweis' })).toBeTruthy();
  });

  it('Markieren, Farben löschen und Ausblenden funktionieren wie gewohnt', () => {
    renderWith(stateWith({}, 'en', { mode: 'extreme', extreme: { en: playedRound('PLANT', ['HOUSE'], { mode: 'extreme' }) } }));
    fireEvent.click(within(board()).getByRole('button', { name: 'H, ohne Markierung' }));
    expect(key('H').getAttribute('data-mark')).toBe('wrong');
    fireEvent.click(screen.getByRole('button', { name: 'Farben löschen' }));
    expect(key('H').getAttribute('data-mark')).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Ausblenden' }));
    fireEvent.click(key('Q'));
    expect(loadState()?.rounds.extreme.en?.hidden).toEqual(['Q']);
  });
});

describe('Speichern und Laden', () => {
  it('der zuletzt gewählte Modus kommt nach dem Neuladen wieder', () => {
    const { unmount } = renderWith(stateWith({ de: playedRound('WOLKE', []) }));
    fireEvent.click(modeSwitch());
    tap('ST');
    unmount();
    render(<App />);
    expect(modeSwitch().getAttribute('aria-pressed')).toBe('true');
    expect(within(board()).getByText('Versuch 1, Eingabe: S T')).toBeTruthy();
    expect(document.documentElement.dataset.mode).toBe('extreme');
  });

  it('ein Spielstand aus 500w:v1 läuft im Normal-Modus weiter und wird ins neue Format übernommen', () => {
    const legacy = { lang: 'de', rounds: { de: { ...playedRound('WOLKE', ['STERN']), mode: undefined, input: 'KO' } }, bags: { de: [], en: [] } };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
    render(<App />);
    expect(modeSwitch().getAttribute('aria-pressed')).toBe('false');
    expect(within(board()).getByText('Versuch 2, Eingabe: K O')).toBeTruthy();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.mode).toBe('normal');
    expect(saved.rounds.normal.de.solution).toBe('WOLKE');
    expect(saved.rounds.extreme).toEqual({});
  });
});
