export type Random = () => number;

/** Kleiner Zufallsgenerator mit Startwert (mulberry32). Gleicher Startwert, gleiche Folge. */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Neuer zufälliger Startwert für den Reducer, damit dieser selbst rein bleibt. */
export function newSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32);
}

/** Fisher-Yates: gibt eine gemischte Kopie zurück. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Zieht das nächste Wort aus dem gemischten Stapel (Shuffle-Bag). Ist der Stapel leer, wird neu gemischt.
 * Wörter aus `avoid` (das zuletzt gespielte und das laufende Wort des anderen Modus) kommen nicht
 * sofort dran: Sie bleiben im Stapel und folgen später.
 */
export function drawWord(
  bag: readonly string[],
  all: readonly string[],
  avoid: readonly string[],
  random: Random,
): { word: string; bag: string[] } {
  const rest = bag.length > 0 ? [...bag] : shuffle(all, random);
  const index = rest.findIndex((w) => !avoid.includes(w));
  // Bleiben nur gemiedene Wörter übrig, wird trotzdem gezogen.
  const [word] = rest.splice(Math.max(index, 0), 1);
  return { word, bag: rest };
}
