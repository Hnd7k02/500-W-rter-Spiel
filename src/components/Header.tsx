import type { Lang } from '../game/types';
import { DiceIcon } from './icons';

interface HeaderProps {
  lang: Lang;
  /** Nach Sieg oder Niederlage leuchtet der Würfel. */
  diceGlow: boolean;
  /** Erster Tipp auf «?»: eingedrückt, mit Sprechblase */
  hintArmed: boolean;
  /** Nach Rundenende oder wenn alle Plätze Hinweise sind: aus */
  hintEnabled: boolean;
  onLang: (lang: Lang) => void;
  onHint: () => void;
  onDice: () => void;
}

const LANG_BUTTONS: { lang: Lang; text: string; label: string }[] = [
  { lang: 'de', text: 'DE', label: 'Deutsch' },
  { lang: 'en', text: 'EN', label: 'Englisch' },
];

export function Header({ lang, diceGlow, hintArmed, hintEnabled, onLang, onHint, onDice }: HeaderProps) {
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
      <div className="header__actions">
        <div className="hint">
          <button
            type="button"
            className="round-btn hint__btn"
            data-hint-button=""
            aria-label="Hinweis"
            aria-pressed={hintArmed}
            aria-disabled={!hintEnabled || undefined}
            aria-describedby={hintArmed ? 'hint-bubble' : undefined}
            onClick={onHint}
          >
            <span aria-hidden="true">?</span>
          </button>
          {hintArmed && (
            <div className="hint__bubble" id="hint-bubble" role="tooltip">
              Nochmals tippen für einen grünen Buchstaben
            </div>
          )}
        </div>
        <button
          type="button"
          className={diceGlow ? 'round-btn dice dice--glow' : 'round-btn dice'}
          aria-label="Neues Wort würfeln"
          onClick={onDice}
        >
          <DiceIcon />
        </button>
      </div>
    </header>
  );
}
