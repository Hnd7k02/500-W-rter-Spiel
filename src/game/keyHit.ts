/** Trefferlogik der Tastatur («Smart Clicks»): reine Funktionen ohne React. */

export interface KeyRect {
  /** 'A'–'Z', 'DEL' oder 'ENTER' */
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Höchstabstand in px, bis zu dem ein unmöglicher Buchstabe auf einen möglichen Nachbarn umgeleitet wird. */
const REDIRECT_PX = 12;

const isLetter = (id: string) => id.length === 1;

function distance(x: number, y: number, r: KeyRect): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

function centerDistance(x: number, y: number, r: KeyRect): number {
  return Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
}

function nearest(x: number, y: number, keys: readonly KeyRect[]): KeyRect | null {
  let best: KeyRect | null = null;
  let bestD = Infinity;
  let bestC = Infinity;
  for (const k of keys) {
    const d = distance(x, y, k);
    const c = centerDistance(x, y, k);
    if (d < bestD || (d === bestD && c < bestC)) {
      best = k;
      bestD = d;
      bestC = c;
    }
  }
  return best;
}

/**
 * Die Taste unter dem Finger: die nächste Taste gewinnt. Ist sie ein Buchstabe, der gerade nicht
 * passt, gewinnt eine nahe (≤ 12 px) Buchstabentaste, die passt. Die Tastenmitte ist so nie betroffen.
 */
export function resolveKey(
  x: number,
  y: number,
  keys: readonly KeyRect[],
  canType: (letter: string) => boolean,
): string | null {
  const hit = nearest(x, y, keys);
  if (!hit) return null;
  if (!isLetter(hit.id) || canType(hit.id)) return hit.id;
  const alt = nearest(
    x,
    y,
    keys.filter((k) => k !== hit && isLetter(k.id) && distance(x, y, k) <= REDIRECT_PX && canType(k.id)),
  );
  return alt ? alt.id : hit.id;
}

/**
 * Passt mindestens ein Wort, wenn letter an der ersten leeren Stelle steht? Die übrigen leeren
 * Stellen sind offen. Ohne leere Stelle: true.
 */
export function fitsWord(
  slots: readonly { letter: string }[],
  letter: string,
  words: Iterable<string>,
): boolean {
  const first = slots.findIndex((s) => !s.letter);
  if (first < 0) return true;
  const pattern = slots.map((s, i) => (i === first ? letter : s.letter).toUpperCase());
  for (const word of words) {
    if (word.length !== pattern.length) continue;
    const w = word.toUpperCase();
    if (pattern.every((p, i) => !p || w[i] === p)) return true;
  }
  return false;
}
