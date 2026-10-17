// Erzeugt die Listen gültiger Rateversuche (5 Buchstaben, A–Z) aus freien Wörterbüchern.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { decodeTrie } from 'cspell-trie-lib';

const require = createRequire(import.meta.url);
const solutions = JSON.parse(readFileSync('src/data/solutions.json', 'utf8'));
const FIVE = /^[A-Z]{5}$/;

// Deutsch: Schweizer Wörterbuch aus @cspell/dict-de-ch; toUpperCase() macht aus ß automatisch SS
const deDir = dirname(require.resolve('@cspell/dict-de-ch/cspell-ext.json'));
const trie = decodeTrie(gunzipSync(readFileSync(join(deDir, 'de_CH.trie.gz'))));
const de = new Set(solutions.de);
for (const w of trie.words()) {
  if (w === w.toUpperCase()) continue; // Abkürzungen wie ASCII oder NSDAP überspringen
  const up = w.toUpperCase();
  if (FIVE.test(up)) de.add(up);
}

// Englisch: an-array-of-english-words
const en = new Set(solutions.en);
for (const w of require('an-array-of-english-words')) {
  const up = w.toUpperCase();
  if (FIVE.test(up)) en.add(up);
}

writeFileSync('src/data/valid-de.json', JSON.stringify([...de].sort()));
writeFileSync('src/data/valid-en.json', JSON.stringify([...en].sort()));
console.log(`valid-de: ${de.size} Wörter · valid-en: ${en.size} Wörter`);
