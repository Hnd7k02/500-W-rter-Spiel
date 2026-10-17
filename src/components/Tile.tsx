import type { CSSProperties } from 'react';
import type { Mark } from '../game/types';
import { MARK_LABELS, markName } from './marks';

type TileProps =
  /** Leere Zeile, Rest der Eingabezeile, nächste Stelle (blauer Glow) */
  | { kind: 'empty' | 'rest' | 'cursor' }
  | { kind: 'typed'; letter: string }
  | {
      kind: 'guess';
      letter: string;
      mark: Mark;
      col: number;
      /** Gewinnzeile: gilt als «Richtig» und lässt sich nicht umfärben. */
      locked: boolean;
      celebrate: boolean;
      onMark: () => void;
    };

export function Tile(props: TileProps) {
  if (props.kind !== 'guess') {
    return (
      <div className={`tile tile--${props.kind}`} aria-hidden="true">
        {props.kind === 'typed' && <span className="tile__ch">{props.letter}</span>}
      </div>
    );
  }

  const { letter, mark, col, locked, celebrate, onMark } = props;
  const className = ['tile', locked && 'tile--win', celebrate && 'tile--celebrate'].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={className}
      data-mark={markName(mark)}
      style={{ '--i': col } as CSSProperties}
      aria-label={`${letter}, ${MARK_LABELS[mark]}`}
      aria-disabled={locked || undefined}
      onClick={locked ? undefined : onMark}
    >
      <span className="fill fill--wrong" />
      <span className="fill fill--maybe" />
      <span className="fill fill--right" />
      <span className="tile__ch" aria-hidden="true">
        {letter}
      </span>
    </button>
  );
}
