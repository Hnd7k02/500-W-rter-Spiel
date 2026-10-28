import type { CSSProperties } from 'react';

export const EXTREME_NAME = '500 Extreme';
export const NORMAL_NAME = '500 Wörter';

/** Wie hoch reicht der Buchstabe? Darauf sitzt seine Flamme. */
function letterTop(ch: string): number {
  if (/[A-Z0-9]/.test(ch)) return 0.73;
  if (ch === 't') return 0.65;
  return 0.54;
}

/**
 * «500 Extreme» im Höllen-Stil: glühende Buchstaben (Gelb über Orange zu Rot), darüber kleine
 * Flammen, die leicht flackern. Nur CSS: Die Flammen sitzen in einer zweiten, unsichtbaren
 * Kopie des Schriftzugs, damit jede genau über ihrem Buchstaben steht.
 */
export function FireLogo() {
  const letters = EXTREME_NAME.split('');
  return (
    <span className="fire" aria-hidden="true">
      <span className="fire__flames">
        {letters.map((ch, i) =>
          ch === ' ' ? (
            ' '
          ) : (
            <span key={i} className="fire__ch" style={{ '--top': letterTop(ch) } as CSSProperties}>
              {ch}
            </span>
          ),
        )}
      </span>
      <span className="fire__text">{EXTREME_NAME}</span>
    </span>
  );
}
