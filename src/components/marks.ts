import type { Mark } from '../game/types';

/** Wert für data-mark (CSS) je Markierung. */
export const MARK_NAMES = ['none', 'wrong', 'maybe', 'right'] as const;

/** Wörter für Screenreader je Markierung. */
export const MARK_LABELS = ['ohne Markierung', 'falsch', 'im Wort', 'richtig'] as const;

export const markName = (mark: Mark) => (mark === 0 ? undefined : MARK_NAMES[mark]);
