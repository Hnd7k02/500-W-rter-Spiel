import type { Lang } from '../game/types';
import { DiceIcon } from './icons';

interface HeaderProps {
  lang: Lang;
  /** Nach Sieg oder Niederlage leuchtet der Würfel. */
  diceGlow: boolean;
  onLang: (lang: Lang) => void;
  onDice: () => void;
}

const LANG_BUTTONS: { lang: Lang; text: string; label: string }[] = [
  { lang: 'de', text: 'DE', label: 'Deutsch' },
  { lang: 'en', text: 'EN', label: 'Englisch' },
];

export function Header({ lang, diceGlow, onLang, onDice }: HeaderProps) {
  return (
    <header className="header">
      <div className="segment" role="group" aria-label="Sprache der Wörter">
        {LANG_BUTTONS.map((b) => (
          <button
            key={b.lang}
            type="button"
            className="segment__btn"
            aria-pressed={lang === b.lang}
            aria-label={b.label}
            onClick={() => onLang(b.lang)}
          >
            {b.text}
          </button>
        ))}
      </div>
      <h1 className="title">500 Wörter</h1>
      <button
        type="button"
        className={diceGlow ? 'dice dice--glow' : 'dice'}
        aria-label="Neues Wort würfeln"
        onClick={onDice}
      >
        <DiceIcon />
      </button>
    </header>
  );
}
