import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type MouseEvent } from 'react';
import { Board } from './components/Board';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { Toast, type ToastMessage } from './components/Toast';
import { newSeed } from './game/bag';
import { score } from './game/score';
import {
  activeRound,
  checkGuess,
  createInitialState,
  ensureActiveRound,
  isRoundInProgress,
  reducer,
} from './game/state';
import { loadState, saveState } from './game/storage';
import { MAX_GUESSES, type GameState, type Lang } from './game/types';
import { loadValidWords } from './game/words';

function initState(): GameState {
  return ensureActiveRound(loadState() ?? createInitialState(newSeed()), newSeed());
}

const ERRORS = {
  short: 'Nicht genug Buchstaben',
  unknown: 'Nicht in der Wortliste',
  repeat: 'Schon versucht',
} as const;

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const round = activeRound(state);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** Die eben gewertete Zeile, nur für Animationen in dieser Sitzung */
  const [fresh, setFresh] = useState<{ lang: Lang; row: number } | null>(null);
  /** Unsichtbarer Text für Screenreader nach jedem Versuch */
  const [announcement, setAnnouncement] = useState('');

  // Handler lesen immer den neuesten Stand, auch nach dem Warten auf die Wortliste.
  const stateRef = useRef(state);
  const confirmOpenRef = useRef(confirmOpen);
  const submitting = useRef(false);
  useLayoutEffect(() => {
    stateRef.current = state;
    confirmOpenRef.current = confirmOpen;
  });

  // Speichern: Nach einem Neustart geht es genau dort weiter.
  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Wortliste der aktiven Sprache im Hintergrund laden, sobald der erste Screen steht.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadValidWords(state.lang).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state.lang]);

  const fail = useCallback((text: string) => {
    setToast({ id: Date.now() + Math.random(), text });
    setShakeSignal((n) => n + 1);
  }, []);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    const { lang } = stateRef.current;
    const before = stateRef.current.rounds[lang];
    if (!before || before.status !== 'playing') return;
    const word = before.input;
    const precheck = checkGuess(before, word);
    if (precheck !== 'ok') {
      fail(ERRORS[precheck]);
      return;
    }

    submitting.current = true;
    let valid: ReadonlySet<string>;
    try {
      // Ist die Liste noch nicht geladen, wartet Prüfen darauf.
      valid = await loadValidWords(lang);
    } catch {
      fail('Wortliste nicht verfügbar');
      return;
    } finally {
      submitting.current = false;
    }

    const now = stateRef.current;
    const current = now.rounds[lang];
    if (now.lang !== lang || !current || current.status !== 'playing' || current.input !== word) return;
    const check = checkGuess(current, word, valid);
    if (check !== 'ok') {
      fail(ERRORS[check]);
      return;
    }

    const row = current.guesses.length;
    const [right, inWord, wrong] = score(word, current.solution);
    let spoken = `${word}: ${right} richtig, ${inWord} im Wort, ${wrong} falsch.`;
    if (right === 5) spoken = `Geschafft! ${word} ${row === 0 ? 'im ersten Versuch' : `in ${row + 1} Versuchen`}.`;
    else if (row + 1 === MAX_GUESSES) spoken += ` Leider nicht. Das Wort war: ${current.solution}.`;
    setAnnouncement(spoken);
    setFresh({ lang, row });
    dispatch({ type: 'commit', lang, word });
  }, [fail]);

  const startNewWord = useCallback(() => {
    setConfirmOpen(false);
    setFresh(null);
    dispatch({ type: 'newRound', seed: newSeed() });
  }, []);

  const onDice = () => {
    if (isRoundInProgress(round)) setConfirmOpen(true);
    else startNewWord();
  };

  const onLang = (lang: Lang) => {
    if (lang === state.lang) return;
    setFresh(null);
    dispatch({ type: 'setLang', lang, seed: newSeed() });
  };

  // Physische Tastatur: A–Z, Enter, Backspace. Kombinationen mit Cmd, Ctrl oder Alt bleiben frei.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || confirmOpenRef.current) return;
      if (e.key === 'Enter') {
        // Ein per Tab fokussierter Button löst wie gewohnt selbst aus.
        if (e.target instanceof Element && e.target.closest('button')) return;
        e.preventDefault();
        void submit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'backspace' });
      } else if (/^[a-z]$/i.test(e.key)) {
        e.preventDefault();
        dispatch({ type: 'physicalKey', letter: e.key.toUpperCase() });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [submit]);

  // Klicks mit der Maus geben Buttons keinen Fokus. So löst Enter danach «Prüfen» aus und nicht den letzten Button.
  const keepFocus = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('button')) e.preventDefault();
  };

  const popRow = fresh && fresh.lang === state.lang ? fresh.row : null;
  const celebrate = popRow !== null && round.status === 'won' && popRow === round.guesses.length - 1;

  return (
    <>
      <div className="app" inert={confirmOpen} onMouseDown={keepFocus}>
        <Header lang={state.lang} diceGlow={round.status !== 'playing'} onLang={onLang} onDice={onDice} />
        <Board
          round={round}
          popRow={popRow}
          celebrate={celebrate}
          shakeSignal={shakeSignal}
          onMark={(row, col) => dispatch({ type: 'mark', row, col })}
          onNewWord={startNewWord}
        />
        <Keyboard
          round={round}
          resultDelayed={celebrate}
          onLetter={(letter) => dispatch({ type: 'tapKey', letter })}
          onEnter={() => void submit()}
          onDelete={() => dispatch({ type: 'backspace' })}
          onToggleHide={() => dispatch({ type: 'toggleHideMode' })}
          onNewWord={startNewWord}
        />
        <Toast message={toast} />
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </div>
      <ConfirmDialog open={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={startNewWord} />
    </>
  );
}
