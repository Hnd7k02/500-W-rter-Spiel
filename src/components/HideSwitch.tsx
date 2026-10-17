interface HideSwitchProps {
  on: boolean;
  /** Anzahl schraffierter Buchstaben in dieser Runde */
  hiddenCount: number;
  onToggle: () => void;
}

export function hideHint(on: boolean, hiddenCount: number): string {
  if (on) return 'Tippe Buchstaben zum Ausblenden';
  if (hiddenCount === 0) return 'Buchstaben grau schraffieren';
  return `${hiddenCount} ${hiddenCount === 1 ? 'Buchstabe' : 'Buchstaben'} ausgeblendet`;
}

/** Oberste Reihe der Tastatur-Karte: Schraffur-Icon, «Ausblenden», iOS-Schalter. */
export function HideSwitch({ on, hiddenCount, onToggle }: HideSwitchProps) {
  return (
    <div className={on ? 'hide-row hide-row--on' : 'hide-row'}>
      <div className="hide-row__label">
        <span className="hide-row__icon" aria-hidden="true" />
        <span className="hide-row__text">
          <span className="hide-row__title">Ausblenden</span>
          <span className="hide-row__hint" id="hide-hint">
            {hideHint(on, hiddenCount)}
          </span>
        </span>
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        aria-label="Ausblenden"
        aria-describedby="hide-hint"
        onClick={onToggle}
      >
        <span className="switch__knob" aria-hidden="true" />
      </button>
    </div>
  );
}
