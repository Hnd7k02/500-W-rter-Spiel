import type { CSSProperties } from 'react';
import type { Mode, Round } from '../game/types';
import { CheckIcon, DiceSmallIcon, EyeIcon, FlameIcon } from './icons';

interface ResultCardProps {
  round: Round;
  /** Im Spielfeld schwebend oder als kompakte Zeile in der Tastatur-Karte */
  variant: 'board' | 'keyboard';
  /** Nach einem frischen Sieg erst erscheinen, wenn die Gewinnzeile grün ist. */
  delayed: boolean;
  onNewWord: () => void;
}

/** Titel der Ergebnis-Karte pro Modus */
export const RESULT_TITLES: Record<Mode, { won: string; lost: string }> = {
  normal: { won: 'Geschafft!', lost: 'Leider nicht' },
  extreme: { won: 'Höllisch gut!', lost: 'Verbrannt' },
};

export function resultTexts(round: Round): { title: string; sub: string } {
  const titles = RESULT_TITLES[round.mode];
  if (round.status === 'won') {
    const n = round.guesses.length;
    return { title: titles.won, sub: `${round.solution} ${n === 1 ? 'im ersten Versuch' : `in ${n} Versuchen`}` };
  }
  return { title: titles.lost, sub: `Das Wort war: ${round.solution}` };
}

export function ResultCard({ round, variant, delayed, onNewWord }: ResultCardProps) {
  const won = round.status === 'won';
  const { title, sub } = resultTexts(round);
  return (
    <div
      className={`result result--${variant} ${won ? 'result--won' : 'result--lost'}${sub.length > 20 ? ' result--tight' : ''}`}
      data-testid="result-card"
      style={delayed ? ({ '--result-delay': '420ms' } as CSSProperties) : undefined}
    >
      <span className="result__icon" aria-hidden="true">
        {won ? <CheckIcon size={19} /> : round.mode === 'extreme' ? <FlameIcon size={19} /> : <EyeIcon size={19} />}
      </span>
      <span className="result__text">
        <span className="result__title">{title}</span>
        <span className="result__sub">{sub}</span>
      </span>
      <button type="button" className="result__btn" onClick={onNewWord}>
        <DiceSmallIcon />
        Neues Wort
      </button>
    </div>
  );
}
