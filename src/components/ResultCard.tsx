import type { CSSProperties } from 'react';
import type { Round } from '../game/types';
import { CheckIcon, DiceSmallIcon, EyeIcon } from './icons';

interface ResultCardProps {
  round: Round;
  /** Im Spielfeld schwebend oder als kompakte Zeile in der Tastatur-Karte */
  variant: 'board' | 'keyboard';
  /** Nach einem frischen Sieg erst erscheinen, wenn die Gewinnzeile grün ist. */
  delayed: boolean;
  onNewWord: () => void;
}

export function resultTexts(round: Round): { title: string; sub: string } {
  if (round.status === 'won') {
    const n = round.guesses.length;
    return { title: 'Geschafft!', sub: `${round.solution} ${n === 1 ? 'im ersten Versuch' : `in ${n} Versuchen`}` };
  }
  return { title: 'Leider nicht', sub: `Das Wort war: ${round.solution}` };
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
        {won ? <CheckIcon size={19} /> : <EyeIcon size={19} />}
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
