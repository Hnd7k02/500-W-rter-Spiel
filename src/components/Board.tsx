import { useEffect, useRef, type CSSProperties } from 'react';
import { currentSlots, hasOwnMarks, isWinningRow, maxGuesses, resultPlacement } from '../game/state';
import type { Round } from '../game/types';
import { CheckIcon, CrossIcon, EraserIcon, SwapIcon } from './icons';
import { ResultCard } from './ResultCard';
import { Row } from './Row';

interface BoardProps {
  round: Round;
  /** Zeile, die gerade gewertet wurde (Chips erscheinen nacheinander) */
  popRow: number | null;
  /** Frischer Sieg: Gewinnzeile färbt sich nacheinander grün */
  celebrate: boolean;
  /** Zählt bei jedem Fehler hoch: Die Eingabezeile wackelt. */
  shakeSignal: number;
  onMark: (row: number, col: number) => void;
  /** Radierer: alle eigenen Markierungen entfernen */
  onClearMarks: () => void;
  /** Die Sprechblase des Hinweises liegt über der Symbolzeile: Radierer so lange ausblenden */
  toolsCovered: boolean;
  onNewWord: () => void;
}

function shake(el: HTMLElement | null) {
  if (!el || typeof el.animate !== 'function') return;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frames = reduce
    ? [{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }]
    : [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ];
  el.animate(frames, { duration: 300, easing: 'ease-out' });
}

export function Board({
  round,
  popRow,
  celebrate,
  shakeSignal,
  onMark,
  onClearMarks,
  toolsCovered,
  onNewWord,
}: BoardProps) {
  const activeTiles = useRef<HTMLDivElement>(null);
  const lastShake = useRef(shakeSignal);

  useEffect(() => {
    if (shakeSignal === lastShake.current) return;
    lastShake.current = shakeSignal;
    shake(activeTiles.current);
  }, [shakeSignal]);

  const placement = resultPlacement(round);
  // 8 Zeilen im Normal-Modus, 6 im Extreme-Modus
  const rows = Array.from({ length: maxGuesses(round) }, (_, i) => i);
  const free = rows.length - round.guesses.length;
  const activeRow = round.status === 'playing' ? round.guesses.length : -1;
  const current = { slots: currentSlots(round), input: round.input, solution: round.solution };

  // Reicht der Platz nicht (Querformat), scrollt das Spielfeld: die aktive Zeile bleibt sichtbar.
  useEffect(() => {
    const el = activeTiles.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [activeRow]);

  return (
    <main className="field" aria-label="Spielfeld">
      <div
        className="board"
        data-placement={placement}
        data-rows={rows.length}
        style={{ '--rows': rows.length, ...(placement === 'board' && { '--free': free }) } as CSSProperties}
      >
        <div className="board__icons">
          <div className="board__legend" aria-hidden="true">
            <span className="board__icon board__icon--right">
              <CheckIcon />
            </span>
            <span className="board__icon board__icon--maybe">
              <SwapIcon />
            </span>
            <span className="board__icon board__icon--wrong">
              <CrossIcon />
            </span>
          </div>
          <div className="board__tools">
            {hasOwnMarks(round) && !toolsCovered && (
              <button type="button" className="eraser" onClick={onClearMarks}>
                <EraserIcon />
                Farben löschen
              </button>
            )}
          </div>
        </div>
        {rows.map((i) => {
          const win = isWinningRow(round, i);
          return (
            <Row
              key={i}
              index={i}
              guess={round.guesses[i]}
              current={i === activeRow ? current : undefined}
              tilesRef={i === activeRow ? activeTiles : undefined}
              gone={placement === 'board' && i >= round.guesses.length}
              win={win}
              pop={popRow === i}
              celebrate={celebrate && win}
              onMark={(col) => onMark(i, col)}
            />
          );
        })}
        {placement === 'board' && (
          <ResultCard round={round} variant="board" delayed={celebrate} onNewWord={onNewWord} />
        )}
      </div>
    </main>
  );
}
