import type { CSSProperties } from 'react';
import type { Mark } from '../game/types';
import { MARK_LABELS, markName } from './marks';

type TileProps =
  /** Leere Zeile, Rest der Eingabezeile, nächste Stelle (blauer Glow) */
  | { kind: 'empty' | 'rest' | 'cursor' }
  /** pop: eben getippt, die Kachel federt kurz */
  | { kind: 'typed'; letter: string; pop: boolean }
  /** Hinweis in der aktuellen Zeile: grün und gesperrt, glow beim Erscheinen */
  | { kind: 'hint'; letter: string; glow: boolean }
  | {
      kind: 'guess';
      letter: string;
      mark: Mark;
      col: number;
      /** Gewinnzeile oder Hinweis: gilt als «Richtig» und lässt sich nicht umfärben. */
      locked: boolean;
      hint: boolean;
      celebrate: boolean;
      onMark: () => void;
    };

export function Tile(props: TileProps) {
  if (props.kind === 'hint') {
    return (
      <div className={props.glow ? 'tile tile--hint tile--hint-new' : 'tile tile--hint'} data-mark="right" aria-hidden="true">
        <span className="fill fill--right" />
        <span className="tile__ch">{props.letter}</span>
      </div>
    );
  }

  if (props.kind !== 'guess') {
    const pop = props.kind === 'typed' && props.pop ? ' tile--pop' : '';
    return (
      <div className={`tile tile--${props.kind}${pop}`} aria-hidden="true">
        {props.kind === 'typed' && <span className="tile__ch">{props.letter}</span>}
      </div>
    );
  }

  const { letter, mark, col, locked, hint, celebrate, onMark } = props;
  const className = ['tile', locked && 'tile--win', hint && 'tile--hint', celebrate && 'tile--celebrate']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={className}
      data-mark={markName(mark)}
      style={{ '--i': col } as CSSProperties}
      aria-label={hint ? `${letter}, Hinweis` : `${letter}, ${MARK_LABELS[mark]}`}
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
