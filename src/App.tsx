import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type MouseEvent } from 'react';
import { Board } from './components/Board';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { Toast, type ToastMessage } from './components/Toast';
import { newSeed, seededRandom } from './game/bag';
import { score } from './game/score';
import {
  activeRound,
  canHint,
  checkGuess,
  createInitialState,
  currentWord,
  ensureActiveRound,
  giveHint,
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

/** So lange bleibt «?» nach dem ersten Tipp eingedrückt. */
export const HINT_ARMED_MS = 3000;
/** So lange lässt sich «Farben löschen» rückgängig machen. */
export const UNDO_MS = 5000;
const ERROR_MS = 1600;

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
  /** «?» nach dem ersten Tipp: eingedrückt, der zweite Tipp gibt den Hinweis */
  const [hintArmed, setHintArmed] = useState(false);

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
    const timer = window.setTimeout(() => setToast(null), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // «?» springt nach 3 s oder bei einem Tipp woanders zurück. Der Tipp selbst wirkt normal weiter.
  // Erst beim Klick zurückspringen, nicht schon beim Berühren: Sonst taucht der Radierer unter der
  // Sprechblase noch während desselben Tipps wieder auf und bekäme den Klick ab.
  useEffect(() => {
    if (!hintArmed) return;
    const timer = window.setTimeout(() => setHintArmed(false), HINT_ARMED_MS);
    const onClick = (e: Event) => {
      if (!(e.target instanceof Element && e.target.closest('[data-hint-button]'))) setHintArmed(false);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', onClick, true);
    };
  }, [hintArmed]);

  // Nach Rundenende, Sprachwechsel oder neuem Wort ist «?» nicht mehr eingedrückt.
  const hintEnabled = canHint(round);
  useEffect(() => {
    setHintArmed(false);
  }, [state.lang, round.solution, hintEnabled]);

  // Wortliste der aktiven Sprache im Hintergrund laden, sobald der erste Screen steht.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadValidWords(state.lang).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state.lang]);

  const fail = useCallback((text: string) => {
    setToast({ id: Date.now() + Math.random(), text, tone: 'error', duration: ERROR_MS });
    setShakeSignal((n) => n + 1);
  }, []);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    const { lang } = stateRef.current;
    const before = stateRef.current.rounds[lang];
    if (!before || before.status !== 'playing') return;
    // Hinweis-Buchstaben zählen normal mit.
    const word = currentWord(before);
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
    if (now.lang !== lang || !current || current.status !== 'playing' || currentWord(current) !== word) return;
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

  // «?»: Der erste Tipp drückt den Button ein, erst der zweite gibt einen grünen Buchstaben.
  const onHint = () => {
    if (!canHint(round)) return;
    if (!hintArmed) {
      setHintArmed(true);
      setAnnouncement('Nochmals tippen für einen grünen Buchstaben.');
      return;
    }
    const seed = newSeed();
    const next = giveHint(round, seededRandom(seed));
    const col = next.hints.find((c) => !round.hints.includes(c));
    if (col !== undefined) setAnnouncement(`Hinweis an Stelle ${col + 1}: ${round.solution[col]}.`);
    setHintArmed(false);
    dispatch({ type: 'hint', seed });
  };

  // Radierer: alle eigenen Markierungen weg, 5 s lang rückgängig zu machen.
  const onClearMarks = () => {
    const { lang } = state;
    const { solution } = round;
    const marks = round.guesses.map((g) => [...g.marks]);
    dispatch({ type: 'clearMarks' });
    const id = Date.now() + Math.random();
    setToast({
      id,
      text: 'Farben gelöscht',
      tone: 'info',
      duration: UNDO_MS,
      action: {
        label: 'Rückgängig',
        onAction: () => {
          dispatch({ type: 'restoreMarks', lang, solution, marks });
          setToast((t) => (t?.id === id ? null : t));
        },
      },
    });
  };

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
        if (!e.repeat) void submit();
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
        <Header
          lang={state.lang}
          diceGlow={round.status !== 'playing'}
          hintArmed={hintArmed}
          hintEnabled={hintEnabled}
          onLang={onLang}
          onHint={onHint}
          onDice={onDice}
        />
        <Board
          round={round}
          popRow={popRow}
          celebrate={celebrate}
          shakeSignal={shakeSignal}
          onMark={(row, col) => dispatch({ type: 'mark', row, col })}
          onClearMarks={onClearMarks}
          toolsCovered={hintArmed}
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
