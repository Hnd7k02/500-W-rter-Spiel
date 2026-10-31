import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { fitsWord, resolveKey, type KeyRect } from "../game/keyHit";
import {
  currentSlots,
  isHideActive,
  isLocked,
  keyMarks,
  resultPlacement,
} from "../game/state";
import type { Lang, Round } from "../game/types";
import { loadValidWords } from "../game/words";
import { HideSwitch } from "./HideSwitch";
import { BackspaceIcon, EnterIcon } from "./icons";
import { MARK_LABELS, markName } from "./marks";
import { ResultCard } from "./ResultCard";

/** QWERTZ ohne Umlaute */
const ROWS = ["QWERTZUIOP", "ASDFGHJKL", "YXCVBNM"].map((row) => row.split(""));

/** Loslassen weiter als das ausserhalb der Tasten schreibt nichts. */
const CANCEL_PX = 24;
/** Ein click so kurz nach einem per Pointer ausgelösten Druck ist derselbe Druck. */
const CLICK_GUARD_MS = 500;

interface MeasuredKey extends KeyRect {
  el: HTMLElement;
}

interface Touch {
  pointerId: number;
  pointerType: string;
  keys: MeasuredKey[];
  key: MeasuredKey | null;
}

interface Bubble {
  letter: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

function bubbleFor(key: MeasuredKey): Bubble {
  const width = (key.right - key.left) * 1.5;
  const height = (key.bottom - key.top) * 1.25;
  const vw = window.innerWidth;
  const left = Math.min(
    Math.max((key.left + key.right - width) / 2, 4),
    vw - width - 4,
  );
  const top = Math.max(key.top - height - 8, 4);
  return { letter: key.id, left, top, width, height };
}

interface KeyboardProps {
  round: Round;
  lang: Lang;
  resultDelayed: boolean;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  onToggleHide: () => void;
  onNewWord: () => void;
}

export function Keyboard({
  round,
  lang,
  resultDelayed,
  onLetter,
  onEnter,
  onDelete,
  onToggleHide,
  onNewWord,
}: KeyboardProps) {
  const placement = resultPlacement(round);
  const hideActive = isHideActive(round);
  const marks = keyMarks(round);
  const hidden = new Set(round.hidden);
  const playing = round.status === "playing";

  const [words, setWords] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    let live = true;
    setWords(null);
    loadValidWords(lang).then(
      (set) => live && setWords(set),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [lang]);

  // Smart Clicks: Am Tastenrand gewinnt ein Buchstabe, der noch zu einem Wort passt.
  const canType = useMemo(() => {
    const cache = new Map<string, boolean>();
    const slots = currentSlots(round);
    return (letter: string) => {
      if (hideActive) return true;
      let ok = cache.get(letter);
      if (ok === undefined) {
        ok =
          !isLocked(round, letter) &&
          (!words || fitsWord(slots, letter, words));
        cache.set(letter, ok);
      }
      return ok;
    };
  }, [round, words, hideActive]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const touch = useRef<Touch | null>(null);
  const lastFire = useRef(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  const fire = (id: string) => {
    if (id === "DEL") onDelete();
    else if (id === "ENTER") onEnter();
    else onLetter(id);
  };

  const firePointer = (id: string) => {
    lastFire.current = Date.now();
    fire(id);
  };

  const show = (t: Touch) => {
    const key = t.key;
    setPressed(key?.id ?? null);
    const preview =
      key &&
      t.pointerType !== "mouse" &&
      key.id.length === 1 &&
      key.el.getAttribute("aria-disabled") !== "true" &&
      key.right > key.left;
    setBubble(preview ? bubbleFor(key) : null);
  };

  const end = () => {
    touch.current = null;
    setPressed(null);
    setBubble(null);
  };

  const locate = (t: Touch, e: ReactPointerEvent) => {
    const measured = t.keys.some((k) => k.right > k.left);
    if (measured) {
      const id = resolveKey(e.clientX, e.clientY, t.keys, canType);
      t.key = t.keys.find((k) => k.id === id) ?? null;
    } else {
      // jsdom: keine Masse, also die Taste unter dem Ereignis nehmen.
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
      if (el) t.key = t.keys.find((k) => k.el === el) ?? null;
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Zweiter Finger: den ersten sofort auslösen, sein Loslassen zählt nicht mehr.
    const prev = touch.current;
    if (prev?.key) firePointer(prev.key.id);
    const keys = Array.from(
      wrap.querySelectorAll<HTMLElement>("[data-key]"),
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.dataset.key!,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          el,
        };
      },
    );
    const t: Touch = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      keys,
      key: null,
    };
    locate(t, e);
    touch.current = t;
    wrap.setPointerCapture?.(e.pointerId);
    show(t);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = touch.current;
    if (!t || t.pointerId !== e.pointerId) return;
    const before = t.key;
    locate(t, e);
    if (t.key !== before) show(t);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = touch.current;
    if (!t || t.pointerId !== e.pointerId) return;
    end();
    const r = wrapRef.current?.getBoundingClientRect();
    const outside =
      r &&
      r.right > r.left &&
      (e.clientX < r.left - CANCEL_PX ||
        e.clientX > r.right + CANCEL_PX ||
        e.clientY < r.top - CANCEL_PX ||
        e.clientY > r.bottom + CANCEL_PX);
    if (t.key && !outside) firePointer(t.key.id);
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (touch.current?.pointerId === e.pointerId) end();
  };

  /** onClick bleibt für VoiceOver und Tests; nach einem Pointer-Druck ist der click schon erledigt. */
  const click = (id: string) => () => {
    if (Date.now() - lastFire.current < CLICK_GUARD_MS) return;
    fire(id);
  };

  const renderKey = (letter: string) => {
    // Die Schraffur bleibt auch bei ausgeschaltetem Schalter sichtbar; die Taste ist dann gesperrt.
    const isHidden = hidden.has(letter);
    const locked = isHidden && !hideActive;
    const mark = marks[letter] ?? 0;
    const label = isHidden
      ? `${letter}, ausgeblendet`
      : mark
        ? `${letter}, ${MARK_LABELS[mark]}`
        : letter;
    return (
      <button
        key={letter}
        type="button"
        className="key"
        data-key={letter}
        data-pressed={pressed === letter ? "" : undefined}
        data-mark={markName(mark)}
        data-hidden={isHidden ? "" : undefined}
        aria-pressed={hideActive ? isHidden : undefined}
        aria-label={label}
        aria-disabled={locked || (!playing && !hideActive) ? true : undefined}
        onClick={click(letter)}
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
    <section
      className={hideActive ? "keyboard keyboard--hide" : "keyboard"}
      aria-label="Tastatur"
    >
      {placement === "keyboard" ? (
        <ResultCard
          round={round}
          variant="keyboard"
          delayed={resultDelayed}
          onNewWord={onNewWord}
        />
      ) : (
        <HideSwitch
          on={round.hideMode}
          hiddenCount={round.hidden.length}
          onToggle={onToggleHide}
        />
      )}
      <div
        ref={wrapRef}
        className="kb-keys"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="kb-row">{ROWS[0].map(renderKey)}</div>
        <div className="kb-row kb-row--mid">{ROWS[1].map(renderKey)}</div>
        {/* Unterste Reihe: [Löschen] Y X C V B N M [Prüfen] */}
        <div className="kb-row">
          <button
            type="button"
            className="key key--wide key--delete"
            data-key="DEL"
            data-pressed={pressed === "DEL" ? "" : undefined}
            aria-label="Buchstabe löschen"
            aria-disabled={!playing || undefined}
            onClick={click("DEL")}
          >
            <BackspaceIcon />
          </button>
          {ROWS[2].map(renderKey)}
          <button
            type="button"
            className="key key--wide key--action"
            data-key="ENTER"
            data-pressed={pressed === "ENTER" ? "" : undefined}
            aria-label="Wort prüfen"
            aria-disabled={!playing || undefined}
            onClick={click("ENTER")}
          >
            <EnterIcon />
          </button>
        </div>
      </div>
      {bubble &&
        createPortal(
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: bubble.left,
              top: bubble.top,
              width: bubble.width,
              height: bubble.height,
              display: "grid",
              placeItems: "center",
              borderRadius: "var(--r-key)",
              background: "var(--card)",
              boxShadow: "var(--card-shadow), var(--key-shadow)",
              color: "var(--ink)",
              textShadow: "var(--plain-glow)",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1,
              pointerEvents: "none",
              zIndex: 1000,
            }}
          >
            {bubble.letter}
          </div>,
          document.body,
        )}
    </section>
  );
}
