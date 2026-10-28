import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Board } from './components/Board';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { RESULT_TITLES } from './components/ResultCard';
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
  maxGuesses,
  reducer,
} from './game/state';
import { loadState, saveState } from './game/storage';
import { RULES, type GameState, type Lang, type Mode } from './game/types';
import { loadValidWords } from './game/words';

function initState(): GameState {
  return ensureActiveRound(loadState() ?? createInitialState(newSeed()), newSeed());
}

const ERRORS = {
  short: 'Nicht genug Buchstaben',
  unknown: 'Nicht in der Wortliste',
  repeat: 'Schon versucht',
} as const;

/** Farbe der Browser- und Statusleiste pro Modus, passend zum Seitenhintergrund */
export const THEME_COLORS: Record<Mode, string> = { normal: '#F1F2F6', extreme: '#050507' };

/** Dauer der Überblendung beim Wechsel zwischen Normal und «500 Extreme» */
export const MODE_FADE_MS = 250;

/**
 * Tokens hängen an <html data-mode>. Dazu passen theme-color (ältere iOS-Versionen färben damit die
 * Leisten) und color-scheme. Safari ab iOS 26 nimmt die Farbe der Leisten direkt vom Seitenhintergrund.
 */
function applyModeToDocument(mode: Mode) {
  document.documentElement.dataset.mode = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[mode]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', mode === 'extreme' ? 'dark' : 'light');
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready?: Promise<unknown> } | undefined;
};

/** Wechselt den Look mit kurzer Überblendung: per View Transition, sonst blendet die App kurz ein. */
function crossfade(update: () => void) {
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition === 'function') {
    const transition = doc.startViewTransition(() => flushSync(update));
    // Schnell zweimal getippt: Die erste Überblendung fällt weg, das ist kein Fehler.
    transition?.ready?.catch(() => undefined);
    return;
  }
  update();
  const app = document.querySelector('.app');
  if (app && typeof app.animate === 'function') {
    app.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: MODE_FADE_MS, easing: 'ease-out' });
  }
}

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
  const [fresh, setFresh] = useState<{ mode: Mode; lang: Lang; row: number } | null>(null);
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

  // Look des Modus: vor dem Zeichnen, damit auch die Überblendung schon die neuen Farben zeigt.
  useLayoutEffect(() => applyModeToDocument(state.mode), [state.mode]);

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

  // Nach Rundenende, Sprach- oder Moduswechsel oder neuem Wort ist «?» nicht mehr eingedrückt.
  const hintEnabled = canHint(round);
  useEffect(() => {
    setHintArmed(false);
  }, [state.mode, state.lang, round.solution, hintEnabled]);

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
    const { mode, lang } = stateRef.current;
    const before = stateRef.current.rounds[mode][lang];
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

    // Inzwischen Sprache oder Modus gewechselt? Dann bleibt die Eingabe einfach stehen.
    const now = stateRef.current;
    const current = now.rounds[mode][lang];
    if (now.mode !== mode || now.lang !== lang || !current || current.status !== 'playing' || currentWord(current) !== word) {
      return;
    }
    const check = checkGuess(current, word, valid);
    if (check !== 'ok') {
      fail(ERRORS[check]);
      return;
    }

    const row = current.guesses.length;
    const [right, inWord, wrong] = score(word, current.solution);
    const titles = RESULT_TITLES[mode];
    let spoken = `${word}: ${right} richtig, ${inWord} im Wort, ${wrong} falsch.`;
    if (right === 5) spoken = `${titles.won} ${word} ${row === 0 ? 'im ersten Versuch' : `in ${row + 1} Versuchen`}.`;
    else if (row + 1 === maxGuesses(current)) spoken += ` ${titles.lost}. Das Wort war: ${current.solution}.`;
    setAnnouncement(spoken);
    setFresh({ mode, lang, row });
    dispatch({ type: 'commit', mode, lang, word });
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
    const { mode, lang } = state;
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
          dispatch({ type: 'restoreMarks', mode, lang, solution, marks });
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

  // Logo-Tipp: Normal ⇄ «500 Extreme». Jede Runde bleibt, wie sie ist.
  const onToggleMode = () => {
    const mode: Mode = state.mode === 'extreme' ? 'normal' : 'extreme';
    crossfade(() => {
      setFresh(null);
      setHintArmed(false);
      setAnnouncement(mode === 'extreme' ? '500 Extreme: 6 Versuche, keine Hinweise.' : '500 Wörter: 8 Versuche.');
      dispatch({ type: 'setMode', mode, seed: newSeed() });
    });
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

  const popRow = fresh && fresh.mode === state.mode && fresh.lang === state.lang ? fresh.row : null;
  const celebrate = popRow !== null && round.status === 'won' && popRow === round.guesses.length - 1;

  return (
    <>
      <div className="app" inert={confirmOpen} onMouseDown={keepFocus}>
        <Header
          mode={state.mode}
          lang={state.lang}
          diceGlow={round.status !== 'playing'}
          hintVisible={RULES[state.mode].hints}
          hintArmed={hintArmed}
          hintEnabled={hintEnabled}
          onToggleMode={onToggleMode}
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
