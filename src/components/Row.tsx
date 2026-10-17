import type { Ref } from 'react';
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

export function Row({ index, guess, input, tilesRef, gone, win, pop, celebrate, onMark }: RowProps) {
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
          if (col < input.length) return <Tile key={col} kind="typed" letter={input[col]} />;
          return <Tile key={col} kind={col === input.length ? 'cursor' : 'rest'} />;
        })}
      </div>
    </div>
  );
}
