import type { CSSProperties } from 'react';
import type { Score } from '../game/types';

const KINDS = ['right', 'maybe', 'wrong'] as const;

interface CountChipsProps {
  /** Fehlt bei offenen Zeilen: dann leere Chips ohne Zahl. */
  score?: Score;
  /** Text für Screenreader, z. B. «Versuch 2: 1 richtig, 1 im Wort, 3 falsch». */
  label: string;
  /** Frisch gewertet: Chips erscheinen nacheinander mit kleinem Pop. */
  pop: boolean;
}

/** Drei runde Zahlen-Chips: richtig, im Wort, falsch. */
export function CountChips({ score, label, pop }: CountChipsProps) {
  return (
    <div className="chips">
      {label && <span className="sr-only">{label}</span>}
      {KINDS.map((kind, i) => {
        const n = score?.[i];
        let className = 'chip';
        if (n !== undefined) className += n === 0 ? ' chip--zero' : ` chip--${kind}`;
        if (n !== undefined && pop) className += ' chip--pop';
        return (
          <span key={kind} className={className} style={{ '--i': i } as CSSProperties} aria-hidden="true">
            {n}
          </span>
        );
      })}
    </div>
  );
}
