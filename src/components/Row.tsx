import { useEffect, useRef, type Ref } from 'react';
import { WORD_LENGTH, type Guess } from '../game/types';
import { CountChips } from './CountChips';
import { Tile } from './Tile';

interface RowProps {
  index: number;
  /** Gewertete Zeile */
  guess?: Guess;
  /** Nur für die aktive Eingabezeile gesetzt */
  input?: string;
  tilesRef?: Ref<HTMLDivElement>;
  /** Unsichtbar, Platz bleibt (Ergebnis-Karte im Spielfeld) */
  gone: boolean;
  win: boolean;
  pop: boolean;
  celebrate: boolean;
  onMark: (col: number) => void;
}

const COLS = Array.from({ length: WORD_LENGTH }, (_, i) => i);

function rowLabel(index: number, guess?: Guess, input?: string): string {
  const n = index + 1;
  if (guess) {
    const [right, inWord, wrong] = guess.score;
    return `Versuch ${n}: ${right} richtig, ${inWord} im Wort, ${wrong} falsch`;
  }
  if (input !== undefined) return input ? `Versuch ${n}, Eingabe: ${input.split('').join(' ')}` : `Versuch ${n}, leer`;
  return '';
}

/** Stelle des eben getippten Buchstabens, sonst -1. So federt nur die neue Kachel, nicht jede beim Laden. */
function useNewLetter(input?: string): number {
  const previous = useRef(input);
  useEffect(() => {
    previous.current = input;
  });
  const before = previous.current;
  if (input === undefined || before === undefined) return -1;
  return input.length === before.length + 1 && input.startsWith(before) ? input.length - 1 : -1;
}

export function Row({ index, guess, input, tilesRef, gone, win, pop, celebrate, onMark }: RowProps) {
  const newLetter = useNewLetter(input);
  return (
    <div className={gone ? 'row row--gone' : 'row'} aria-hidden={gone || undefined}>
      <CountChips score={guess?.score} label={rowLabel(index, guess, input)} pop={pop} />
      <div className="tiles" ref={tilesRef}>
        {COLS.map((col) => {
          if (guess) {
            return (
              <Tile
                key={col}
                kind="guess"
                letter={guess.word[col]}
                mark={win ? 3 : guess.marks[col]}
                col={col}
                locked={win}
                celebrate={celebrate}
                onMark={() => onMark(col)}
              />
            );
          }
          if (input === undefined) return <Tile key={col} kind="empty" />;
          if (col < input.length) return <Tile key={col} kind="typed" letter={input[col]} pop={col === newLetter} />;
          return <Tile key={col} kind={col === input.length ? 'cursor' : 'rest'} />;
        })}
      </div>
    </div>
  );
}
