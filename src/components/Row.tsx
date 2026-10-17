import { useEffect, useRef, type Ref } from 'react';
import type { Slot } from '../game/state';
import { WORD_LENGTH, type Guess } from '../game/types';
import { CountChips } from './CountChips';
import { Tile } from './Tile';

/** Die aktive Eingabezeile */
export interface CurrentRow {
  slots: Slot[];
  /** Getippte Buchstaben in Reihenfolge */
  input: string;
  /** Erkennt einen Runden- oder Sprachwechsel */
  solution: string;
}

interface RowProps {
  index: number;
  /** Gewertete Zeile */
  guess?: Guess;
  /** Nur für die aktive Eingabezeile gesetzt */
  current?: CurrentRow;
  tilesRef?: Ref<HTMLDivElement>;
  /** Unsichtbar, Platz bleibt (Ergebnis-Karte im Spielfeld) */
  gone: boolean;
  win: boolean;
  pop: boolean;
  celebrate: boolean;
  onMark: (col: number) => void;
}

const COLS = Array.from({ length: WORD_LENGTH }, (_, i) => i);

function rowLabel(index: number, guess?: Guess, current?: CurrentRow): string {
  const n = index + 1;
  if (guess) {
    const [right, inWord, wrong] = guess.score;
    return `Versuch ${n}: ${right} richtig, ${inWord} im Wort, ${wrong} falsch`;
  }
  if (!current) return '';
  const parts = current.input ? [`Eingabe: ${current.input.split('').join(' ')}`] : [];
  current.slots.forEach((slot, col) => {
    if (slot.hint) parts.push(`Hinweis an Stelle ${col + 1}: ${slot.letter}`);
  });
  return parts.length ? `Versuch ${n}, ${parts.join(', ')}` : `Versuch ${n}, leer`;
}

/** Stelle des eben getippten Buchstabens (in Tipp-Reihenfolge), sonst -1. So federt nur die neue Kachel. */
function useNewLetter(input?: string): number {
  const previous = useRef(input);
  useEffect(() => {
    previous.current = input;
  });
  const before = previous.current;
  if (input === undefined || before === undefined) return -1;
  return input.length === before.length + 1 && input.startsWith(before) ? input.length - 1 : -1;
}

/**
 * Hinweis-Plätze, die mit dem letzten Hinweis dazugekommen sind. Sie behalten ihren Glow-Zustand,
 * bis wieder ein Hinweis kommt. Beim Laden, nach dem Festschreiben und beim Sprachwechsel leuchtet nichts.
 */
function useFreshHints(current?: CurrentRow): number[] {
  const hints = current ? current.slots.flatMap((slot, col) => (slot.hint ? [col] : [])) : [];
  const key = hints.join(',');
  const solution = current?.solution;
  const memory = useRef({ solution, key, before: key });
  useEffect(() => {
    const m = memory.current;
    if (m.solution !== solution) memory.current = { solution, key, before: key };
    else if (m.key !== key) memory.current = { solution, key, before: m.key };
  });
  const m = memory.current;
  if (!current || m.solution !== solution) return [];
  const before = new Set((m.key !== key ? m.key : m.before).split(',').filter(Boolean).map(Number));
  return hints.filter((col) => !before.has(col));
}

export function Row({ index, guess, current, tilesRef, gone, win, pop, celebrate, onMark }: RowProps) {
  const newLetter = useNewLetter(current?.input);
  const freshHints = useFreshHints(current);

  const tiles = () => {
    if (guess) {
      return COLS.map((col) => {
        const hint = guess.hints.includes(col);
        return (
          <Tile
            key={col}
            kind="guess"
            letter={guess.word[col]}
            mark={win || hint ? 3 : guess.marks[col]}
            col={col}
            locked={win || hint}
            hint={hint}
            celebrate={celebrate}
            onMark={() => onMark(col)}
          />
        );
      });
    }
    if (!current) return COLS.map((col) => <Tile key={col} kind="empty" />);
    // Getippte Buchstaben füllen die Plätze ohne Hinweis von links; der erste freie trägt den Fokus-Glow.
    let typed = 0;
    let cursorShown = false;
    return current.slots.map((slot, col) => {
      if (slot.hint) return <Tile key={col} kind="hint" letter={slot.letter} glow={freshHints.includes(col)} />;
      if (slot.letter) {
        const pop = typed === newLetter;
        typed++;
        return <Tile key={col} kind="typed" letter={slot.letter} pop={pop} />;
      }
      const cursor = !cursorShown;
      cursorShown = true;
      return <Tile key={col} kind={cursor ? 'cursor' : 'rest'} />;
    });
  };

  return (
    <div className={gone ? 'row row--gone' : 'row'} aria-hidden={gone || undefined}>
      <CountChips score={guess?.score} label={rowLabel(index, guess, current)} pop={pop} />
      <div className="tiles" ref={tilesRef}>
        {tiles()}
      </div>
    </div>
  );
}
