import solutions from '../data/solutions.json';
import type { Lang } from './types';

/** Die 250 Lösungswörter pro Sprache. */
export const SOLUTIONS: Record<Lang, readonly string[]> = solutions;

const loaders: Record<Lang, () => Promise<{ default: string[] }>> = {
  de: () => import('../data/valid-de.json'),
  en: () => import('../data/valid-en.json'),
};

const cache: Partial<Record<Lang, Promise<ReadonlySet<string>>>> = {};

/**
 * Lädt die Liste gültiger Rateversuche einer Sprache per dynamischem Import, damit der erste
 * Screen sofort da ist. Mehrfache Aufrufe teilen sich denselben Ladevorgang.
 * Lösungswörter sind immer gültig.
 */
export function loadValidWords(lang: Lang): Promise<ReadonlySet<string>> {
  let pending = cache[lang];
  if (!pending) {
    pending = loaders[lang]().then((m) => new Set([...m.default, ...SOLUTIONS[lang]]));
    // Schlägt das Laden fehl, beim nächsten Versuch neu laden.
    pending.catch(() => {
      delete cache[lang];
    });
    cache[lang] = pending;
  }
  return pending;
}
