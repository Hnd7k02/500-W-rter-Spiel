import { isHideActive, keyMarks, resultPlacement } from '../game/state';
import type { Round } from '../game/types';
import { HideSwitch } from './HideSwitch';
import { BackspaceIcon, EnterIcon } from './icons';
import { MARK_LABELS, markName } from './marks';
import { ResultCard } from './ResultCard';

/** QWERTZ ohne Umlaute */
const ROWS = ['QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'].map((row) => row.split(''));

interface KeyboardProps {
  round: Round;
  resultDelayed: boolean;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  onToggleHide: () => void;
  onNewWord: () => void;
}

export function Keyboard({ round, resultDelayed, onLetter, onEnter, onDelete, onToggleHide, onNewWord }: KeyboardProps) {
  const placement = resultPlacement(round);
  const hideActive = isHideActive(round);
  const marks = keyMarks(round);
  const hidden = new Set(round.hidden);
  const playing = round.status === 'playing';

  const renderKey = (letter: string) => {
    const isHidden = hideActive && hidden.has(letter);
    const mark = marks[letter] ?? 0;
    const label = isHidden ? `${letter}, ausgeblendet` : mark ? `${letter}, ${MARK_LABELS[mark]}` : letter;
    return (
      <button
        key={letter}
        type="button"
        className="key"
        data-mark={markName(mark)}
        data-hidden={isHidden ? '' : undefined}
        aria-pressed={hideActive ? isHidden : undefined}
        aria-label={label}
        aria-disabled={!playing && !hideActive ? true : undefined}
        onClick={() => onLetter(letter)}
      >
        <span className="fill fill--wrong" />
        <span className="fill fill--maybe" />
        <span className="fill fill--right" />
        <span className="fill fill--hidden" />
        <span className="key__ch" aria-hidden="true">
          {letter}
        </span>
      </button>
    );
  };

  return (
    <section className={hideActive ? 'keyboard keyboard--hide' : 'keyboard'} aria-label="Tastatur">
      {placement === 'keyboard' ? (
        <ResultCard round={round} variant="keyboard" delayed={resultDelayed} onNewWord={onNewWord} />
      ) : (
        <HideSwitch on={round.hideMode} onToggle={onToggleHide} />
      )}
      <div className="kb-row">{ROWS[0].map(renderKey)}</div>
      <div className="kb-row kb-row--mid">{ROWS[1].map(renderKey)}</div>
      <div className="kb-row">
        <button
          type="button"
          className="key key--wide key--action"
          aria-label="Wort prüfen"
          aria-disabled={!playing || undefined}
          onClick={onEnter}
        >
          <EnterIcon />
        </button>
        {ROWS[2].map(renderKey)}
        <button
          type="button"
          className="key key--wide key--delete"
          aria-label="Buchstabe löschen"
          aria-disabled={!playing || undefined}
          onClick={onDelete}
        >
          <BackspaceIcon />
        </button>
      </div>
    </section>
  );
}
