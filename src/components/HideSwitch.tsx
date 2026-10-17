interface HideSwitchProps {
  on: boolean;
  onToggle: () => void;
}

/** Oberste Reihe der Tastatur-Karte: Schraffur-Icon, «Ausblenden», iOS-Schalter. */
export function HideSwitch({ on, onToggle }: HideSwitchProps) {
  return (
    <div className={on ? 'hide-row hide-row--on' : 'hide-row'}>
      <div className="hide-row__label">
        <span className="hide-row__icon" aria-hidden="true" />
        <span className="hide-row__text">
          <span className="hide-row__title">Ausblenden</span>
          <span className="hide-row__hint" id="hide-hint">
            {on ? 'Tippe Buchstaben zum Ausblenden' : 'Buchstaben grau schraffieren'}
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
