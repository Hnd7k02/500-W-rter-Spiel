import type { Lang, Mode } from '../game/types';
import { DiceIcon } from './icons';
import { EXTREME_NAME, FireLogo, NORMAL_NAME } from './Logo';

interface HeaderProps {
  mode: Mode;
  lang: Lang;
  /** Nach Sieg oder Niederlage leuchtet der Würfel. */
  diceGlow: boolean;
  /** Im Extreme-Modus gibt es keine Hinweise: «?» fehlt dann ganz. */
  hintVisible: boolean;
  /** Erster Tipp auf «?»: eingedrückt, mit Sprechblase */
  hintArmed: boolean;
  /** Nach Rundenende oder wenn alle Plätze Hinweise sind: aus */
  hintEnabled: boolean;
  /** Tipp auf das kleine Logo: Normal ⇄ «500 Extreme» */
  onToggleMode: () => void;
  onLang: (lang: Lang) => void;
  onHint: () => void;
  onDice: () => void;
}

const LANG_BUTTONS: { lang: Lang; text: string; label: string }[] = [
  { lang: 'de', text: 'DE', label: 'Deutsch' },
  { lang: 'en', text: 'EN', label: 'Englisch' },
];

export function Header({
  mode,
  lang,
  diceGlow,
  hintVisible,
  hintArmed,
  hintEnabled,
  onToggleMode,
  onLang,
  onHint,
  onDice,
}: HeaderProps) {
  const extreme = mode === 'extreme';
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
      {/* Oben gross das Logo des aktiven Modus, darunter klein der Wechsel zum anderen */}
      <div className="brand">
        <h1 className="brand__title">
          {extreme ? (
            <>
              <FireLogo />
              <span className="sr-only">{EXTREME_NAME}</span>
            </>
          ) : (
            NORMAL_NAME
          )}
        </h1>
        <button
          type="button"
          className="brand__switch"
          aria-pressed={extreme}
          aria-label={EXTREME_NAME}
          onClick={onToggleMode}
        >
          {extreme ? NORMAL_NAME : <FireLogo />}
        </button>
      </div>
      <div className="header__actions">
        {hintVisible && (
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
        )}
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
