import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
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
      /** Langes Drücken: Farbe entfernen */
      onClear: () => void;
    };

/** So lange drücken, bis die Farbe weggeht */
const LONG_PRESS_MS = 450;
/** Mehr Bewegung bricht das lange Drücken ab. */
const MOVE_PX = 10;

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

  return <GuessTile {...props} />;
}

function GuessTile({ letter, mark, col, locked, hint, celebrate, onMark, onClear }: Extract<TileProps, { kind: 'guess' }>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  /** Nach langem Drücken den folgenden click ignorieren. */
  const skipClick = useRef(false);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  const onPointerDown = (e: PointerEvent) => {
    skipClick.current = false;
    cancel();
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      timer.current = null;
      skipClick.current = true;
      onClearRef.current();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (timer.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_PX) cancel();
  };

  const onClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    onMark();
  };

  const press = locked
    ? {}
    : {
        onPointerDown,
        onPointerMove,
        onPointerUp: cancel,
        onPointerCancel: cancel,
        onPointerLeave: cancel,
        onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
        onClick,
      };

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
      {...press}
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
