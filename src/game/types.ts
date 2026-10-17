export type Lang = 'de' | 'en';

export const LANGS: readonly Lang[] = ['de', 'en'];

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 8;

/** Eigene Markierung einer Kachel: 0 ohne, 1 Falsch, 2 Im Wort, 3 Richtig. */
export type Mark = 0 | 1 | 2 | 3;

/** Wertung eines Versuchs: richtig · im Wort · falsch (Summe immer 5). */
export type Score = [number, number, number];

export type Status = 'playing' | 'won' | 'lost';

export interface Guess {
  word: string;
  score: Score;
  /** Eine Markierung pro Kachel, nur Notiz – ändert die Wertung nie. */
  marks: Mark[];
  /** Plätze, die per Hinweis gefüllt wurden: bleiben grün und gesperrt. */
  hints: number[];
}

export interface Round {
  solution: string;
  guesses: Guess[];
  /**
   * Getippte Buchstaben der aktuellen Zeile in Reihenfolge. Sie belegen die Plätze ohne Hinweis
   * von links, darum höchstens 5 minus Anzahl Hinweise.
   */
  input: string;
  /** Hinweis-Plätze (0–4) der aktuellen Zeile, sortiert. Dort steht der richtige Buchstabe der Lösung. */
  hints: number[];
  /** Ausgeblendete (grau schraffierte) Buchstaben, sortiert. */
  hidden: string[];
  /** Schalter «Ausblenden». */
  hideMode: boolean;
  status: Status;
}

export interface GameState {
  lang: Lang;
  /** Jede Sprache hat ihre eigene Runde. Fehlt eine, startet sie beim ersten Umschalten. */
  rounds: Partial<Record<Lang, Round>>;
  /** Shuffle-Bags: die noch nicht gezogenen Lösungswörter pro Sprache. */
  bags: Record<Lang, string[]>;
}

/** Wo die Ergebnis-Karte steht: nirgends (Runde läuft), im Spielfeld oder in der Tastatur-Karte. */
export type ResultPlacement = 'none' | 'board' | 'keyboard';
