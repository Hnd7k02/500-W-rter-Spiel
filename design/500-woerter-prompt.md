# Auftrag: Web-App «500 Wörter»

Baue «500 Wörter»: ein Wort-Ratespiel fürs iPhone nach dem Prinzip von word500.com, als installierbare Web-App (PWA) im Look von iOS-Widgets. Das Repo ist leer bis auf den Ordner `design/` mit zwei Referenzbildern.

Arbeite selbständig. Wenn dir etwas Wesentliches unklar ist, stell deine Fragen gesammelt ganz am Anfang und zieh danach durch.

## Referenzbilder

- `design/500-woerter-screens.png`: drei Screens (Spiel Deutsch, Ausblenden aktiv, Englisch gewonnen)
- `design/500-woerter-bausteine.png`: alle Bausteine und Zustände mit Farbwerten

Die Bilder geben Look und Aufbau vor. Wo Text und Bild sich widersprechen, gilt dieser Text. Fehlen die Bilder, halte dich nur an diesen Text.

## Umfang

Ein einziger Spiel-Screen mit wenigen Bedienelementen und zwei Modi: Normal und «500 Extreme» (6 Versuche, keine Hinweise, eigener dunkler Look, siehe «Modus 500 Extreme»). Bewusst **nicht** enthalten: Tageswort, Datum, Statistik, Teilen, Hilfe- oder Einstellungsseite, ein Dark Mode nach Systemeinstellung.

## Tech-Stack

- **Basis:**
  - Node.js 24 LTS (mindestens 22.18), lokal und im Workflow
  - Vite + React + TypeScript (strict)
  - Kein UI-Framework, kein Tailwind: normales CSS mit Custom Properties (Tokens unten)
- **Schrift:** `@fontsource-variable/plus-jakarta-sans`, selbst gehostet.
- **PWA:** `vite-plugin-pwa` mit
  - `registerType: 'autoUpdate'`. Eine Update-Meldung ist unnötig, weil der Spielstand in `localStorage` liegt.
  - `workbox.globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}']`, damit auch Schrift und Icons offline da sind.
- **Tests:** Vitest. `npm test` führt `vitest run` aus. Für Interaktionen `@testing-library/react`.
- **Speicher:** `localStorage`. Kein Backend, kein Login, kein Tracking.
- **Deployment:** GitHub Pages über GitHub Actions (`actions/setup-node` mit `node-version: 24`). Den `base`-Pfad (`/<repo-name>/`) per Umgebungsvariable im Workflow setzen.

## Spielregeln

1. Gesucht ist ein zufälliges Wort mit 5 Buchstaben in der gewählten Sprache (Deutsch oder Englisch). Es gibt 8 Versuche, im Modus «500 Extreme» 6.
2. Nach jedem Versuch zeigt das Spiel links neben der Zeile nur drei Zahlen:
   - **richtig**: richtiger Buchstabe an der richtigen Stelle
   - **im Wort**: kommt vor, steht aber an einer anderen Stelle
   - **falsch**: kommt nicht vor

   Die Summe ist immer 5.
3. Das Spiel verrät nie von selbst, welche Buchstaben gemeint sind, und färbt keine Buchstaben automatisch ein. Ausnahmen sind die Gewinnzeile und Hinweise, die man selbst anfordert (siehe «Hinweis»).
4. Bei 5 · 0 · 0 ist die Runde gewonnen. Ist das Wort nach dem letzten Versuch nicht gefunden, ist die Runde verloren, und die Lösung wird angezeigt.

### Wertung (doppelte Buchstaben wie bei Wordle)

```ts
export function score(guess: string, solution: string): [number, number, number] {
  let right = 0;
  const restGuess: Record<string, number> = {};
  const restSolution: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === solution[i]) right++;
    else {
      restGuess[guess[i]] = (restGuess[guess[i]] ?? 0) + 1;
      restSolution[solution[i]] = (restSolution[solution[i]] ?? 0) + 1;
    }
  }
  let inWord = 0;
  for (const c in restGuess) inWord += Math.min(restGuess[c], restSolution[c] ?? 0);
  return [right, inWord, 5 - right - inWord];
}
```

Diese Fälle müssen als Tests grün sein:

| Versuch | Lösung | richtig · im Wort · falsch |
|---|---|---|
| STERN | WOLKE | 0 · 1 · 4 |
| LAMPE | WOLKE | 1 · 1 · 3 |
| BLUME | WOLKE | 1 · 1 · 3 |
| KOHLE | WOLKE | 2 · 2 · 1 |
| WOLKE | WOLKE | 5 · 0 · 0 |
| HOUSE | PLANT | 0 · 0 · 5 |
| CRANE | PLANT | 2 · 0 · 3 |
| SLANT | PLANT | 4 · 0 · 1 |
| PLANT | PLANT | 5 · 0 · 0 |
| SPEED | ABIDE | 0 · 2 · 3 |
| EERIE | THREE | 2 · 1 · 2 |
| KASSE | TASSE | 4 · 0 · 1 |
| ALLEE | LEBEN | 1 · 2 · 2 |
| TASSE | STAAT | 0 · 3 · 2 |

## Wörter

### Lösungswörter

Lege `src/data/solutions.json` exakt mit diesen 500 verschiedenen Wörtern an:

- 250 Deutsch und 250 Englisch, kein Wort in beiden Listen
- in Grossbuchstaben A–Z, ohne Umlaute
- in Schweizer Schreibweise (ss statt ß)

```json
{
  "de": [
    "ABEND", "ADLER", "AMPEL", "ANGEL", "ANKER", "APFEL", "ARENA", "ATLAS", "BAUCH", "BAUER",
    "BEERE", "BESEN", "BIENE", "BIRKE", "BIRNE", "BLATT", "BLITZ", "BLOCK", "BLUME", "BLUSE",
    "BODEN", "BOHNE", "BRAUT", "BRIEF", "BUCHT", "CREME", "DACHS", "DAMPF", "DECKE", "EICHE",
    "EIMER", "ENGEL", "ENKEL", "ERBSE", "ERNTE", "ESSIG", "FADEN", "FAHNE", "FALKE", "FALTE",
    "FARBE", "FEDER", "FEIER", "FEUER", "FISCH", "FLUSS", "FRAGE", "FUCHS", "GABEL", "GEIGE",
    "GEIST", "GLANZ", "GURKE", "HAFEN", "HAGEL", "HALLE", "HECKE", "HERDE", "HONIG", "MARKT",
    "HUMOR", "INSEL", "JACKE", "JUBEL", "KABEL", "KAKAO", "KAMEL", "KAMIN", "KANAL", "KANNE",
    "KARTE", "KASSE", "KATZE", "KERZE", "KETTE", "KISTE", "KLANG", "KLEID", "KLIMA", "KNOPF",
    "KOHLE", "KOMET", "KRAFT", "KRAKE", "KRANZ", "KREIS", "KREUZ", "KRONE", "KUGEL", "KUNST",
    "KURVE", "LACHS", "LAGER", "LAMPE", "BRETT", "LAUNE", "LICHT", "LIEBE", "LINSE", "LIPPE",
    "LISTE", "LUCHS", "MAGEN", "MAGIE", "MARKE", "MASKE", "MAUER", "METER", "MILCH", "MINZE",
    "ZANGE", "MOTTE", "MUSIK", "NACHT", "NADEL", "NEBEL", "NELKE", "NUDEL", "FEIGE", "ONKEL",
    "ORGEL", "PALME", "SPATZ", "HARFE", "SALAT", "PAUSE", "PERLE", "PFERD", "PFOTE", "RIESE",
    "PIRAT", "PISTE", "SPECK", "PLATZ", "POKAL", "PRINZ", "PUDEL", "PUPPE", "QUARK", "RASEN",
    "RAUPE", "REGAL", "REGEN", "REISE", "RINDE", "ROBBE", "ROMAN", "RUDER", "RUINE", "SAUNA",
    "SCHAF", "SCHAL", "SCHUH", "SEIFE", "SEITE", "SIRUP", "SOCKE", "SONNE", "SPASS", "SPIEL",
    "STADT", "STAHL", "STALL", "STAUB", "STEIN", "STERN", "STIRN", "STOFF", "STUFE", "STUHL",
    "STURM", "SUPPE", "TAFEL", "TANTE", "TASSE", "TASTE", "TEICH", "TEMPO", "STIER", "TINTE",
    "TISCH", "HAFER", "TORTE", "TRAUM", "TRICK", "TULPE", "VILLA", "VOGEL", "WAGEN", "WANNE",
    "WEIDE", "WELLE", "WESPE", "WIESE", "WOCHE", "WOLKE", "WOLLE", "WURST", "ZIEGE", "ZWERG",
    "BLANK", "BRAUN", "BREIT", "DICHT", "FLACH", "FRECH", "GLATT", "GRELL", "GROSS", "HEISS",
    "KLEIN", "KNAPP", "KRUMM", "LEISE", "SANFT", "NOBEL", "OFFEN", "RASCH", "REICH", "SAUER",
    "SPITZ", "STARK", "STEIL", "STILL", "STOLZ", "STUMM", "WEICH", "WEISS", "EIGEN", "ERNST",
    "BADEN", "BAUEN", "ESSEN", "GEBEN", "GEHEN", "HOLEN", "LADEN", "LEBEN", "LESEN", "MALEN",
    "RATEN", "REDEN", "RUFEN", "SAGEN", "SEHEN", "HALLO", "DANKE", "HEUTE", "IMMER", "WARUM"
  ],
  "en": [
    "APPLE", "BEACH", "BREAD", "BRICK", "BRUSH", "CANDY", "CHAIR", "CHALK", "CHESS", "CLOCK",
    "CLOUD", "COAST", "CRANE", "CROWN", "DANCE", "DREAM", "DRESS", "EAGLE", "EARTH", "FIELD",
    "FLAME", "FLOOR", "FRUIT", "GHOST", "GLASS", "GLOBE", "GRAPE", "GRASS", "HEART", "HONEY",
    "HORSE", "HOTEL", "HOUSE", "JUICE", "LEMON", "LIGHT", "LUNCH", "MAGIC", "MANGO", "MAPLE",
    "MONEY", "MOUSE", "MUSIC", "NIGHT", "NOVEL", "OCEAN", "OLIVE", "ONION", "PAINT", "PAPER",
    "PARTY", "PEACH", "PEARL", "PHONE", "PIANO", "PILOT", "PIZZA", "PLANE", "PLANT", "PLATE",
    "QUEEN", "RADIO", "RIVER", "ROBOT", "SALAD", "SAUCE", "SCARF", "SHEEP", "SHELF", "SHELL",
    "SHIRT", "SHORE", "SKIRT", "SMILE", "SNAKE", "SPOON", "STAGE", "STAIR", "STEAM", "STONE",
    "STORM", "STORY", "SUGAR", "TABLE", "TIGER", "TOAST", "TOWEL", "TOWER", "TRAIN", "TRUCK",
    "UNCLE", "VOICE", "WATCH", "WATER", "WHALE", "WHEAT", "WHEEL", "WORLD", "ZEBRA", "BADGE",
    "BAGEL", "BENCH", "BERRY", "BLADE", "BLOOM", "BOARD", "BRAIN", "BRIDE", "BROOM", "CABIN",
    "CAMEL", "CARGO", "CHAIN", "CIDER", "CLIFF", "COCOA", "CORAL", "COUCH", "CREEK", "CRUMB",
    "CURVE", "DAISY", "DRAIN", "DRILL", "DRINK", "DWARF", "FAIRY", "FENCE", "FERRY", "FLOCK",
    "FLOUR", "FLUTE", "FROST", "GLOVE", "GRAIN", "GUEST", "GUIDE", "HABIT", "SNAIL", "HOBBY",
    "JELLY", "JEWEL", "KAYAK", "KOALA", "KNIFE", "LATTE", "LEDGE", "LLAMA", "LODGE", "MEDAL",
    "MELON", "MOTOR", "MOUTH", "OTTER", "PANDA", "PASTA", "PATIO", "PEDAL", "PIXEL", "PLAZA",
    "PRIZE", "PUPPY", "QUILT", "RAVEN", "RIDGE", "SCALE", "SCOUT", "SHADE", "SHARK", "SKATE",
    "SLOPE", "SNACK", "SPICE", "SQUID", "STAMP", "STICK", "STOVE", "STRAW", "SWING", "SYRUP",
    "THUMB", "TORCH", "TRAIL", "TULIP", "VIDEO", "WAGON", "WALTZ", "YACHT", "BRAVE", "CHEAP",
    "CLEAN", "CLEAR", "CRISP", "EAGER", "EARLY", "EMPTY", "FANCY", "FRESH", "FUNNY", "GIANT",
    "GRAND", "GREAT", "GREEN", "HAPPY", "HEAVY", "JOLLY", "LUCKY", "MERRY", "NOBLE", "PROUD",
    "QUICK", "QUIET", "READY", "ROYAL", "SHARP", "SHINY", "SMART", "SOLID", "SUNNY", "SWEET",
    "SWIFT", "YOUNG", "JUICY", "LOYAL", "PLAIN", "POLAR", "RAPID", "SOLAR", "VIVID", "SILLY",
    "BLEND", "BLINK", "BUILD", "CATCH", "CHASE", "CLIMB", "COUNT", "DRIFT", "FLOAT", "GLIDE",
    "GUESS", "LAUGH", "LEARN", "REACH", "SHARE", "SHINE", "SLEEP", "SPEAK", "THINK", "WRITE"
  ]
}
```

### Gültige Rateversuche

- Akzeptiert wird jedes Wort aus `src/data/valid-de.json` bzw. `src/data/valid-en.json`. Lösungswörter sind immer gültig.
- Erzeuge beide Listen mit diesem Script und lege es als `scripts/build-wordlists.mjs` ab.
  - devDependencies: `cspell-trie-lib`, `@cspell/dict-de-ch`, `an-array-of-english-words`
  - npm-Script `"words": "node scripts/build-wordlists.mjs"`
  - Die erzeugten JSON-Dateien kommen ins Repo.

```js
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
```

- Erwartet sind rund 3850 deutsche und 12650 englische Wörter. Wörter mit Ä, Ö oder Ü fallen automatisch weg.
- Lade die Listen per dynamischem Import, damit der erste Screen sofort da ist. Ist eine Liste beim Prüfen noch nicht geladen, wartet Prüfen darauf.

### Zufall

- Der Würfel zieht ein zufälliges Lösungswort der aktiven Sprache.
- Pro Sprache gibt es einen gemischten Stapel (Shuffle-Bag) in `localStorage`, gemeinsam für beide Modi. Gespeichert werden die Wörter selbst, keine Indizes.
- Kein Wort kommt doppelt, bis alle 250 dran waren, auch nicht über beide Modi hinweg. Danach wird neu gemischt. Das zuletzt gespielte Wort und das laufende Wort des anderen Modus kommen dann nicht sofort wieder, sie bleiben im Stapel und folgen später.

## Aufbau des Screens

Von oben nach unten wie in `design/500-woerter-screens.png`. Die App ist eine Flex-Spalte mit `height: 100dvh`:

1. **Kopfzeile** (52 px hoch, drei Spalten):
   - links: Segment-Schalter `DE | EN`
   - Mitte, immer genau mittig: oben gross das Logo des aktiven Modus, darunter klein der Wechsel zum anderen Modus. Im Normal-Modus also «500 Wörter» (20 px) und darunter «500 Extreme» im Höllen-Stil (14 px), im Extreme-Modus umgekehrt (siehe «Modus 500 Extreme»).
   - rechts: runder Hinweis-Button «?» direkt links neben dem runden Würfel-Button (beide 44 px, gleicher Stil, Abstand 8 px). Im Extreme-Modus fehlt «?».
2. **Spielfeld** (`flex: 1; min-height: 0`), Inhalt vertikal zentriert:
   - Icon-Reihe: Über den drei Zahlen-Spalten steht je ein kleines Icon: Haken (grün), Doppelpfeil ⇄ (amber), Kreuz (rot). In derselben Reihe rechts, bündig mit den Kacheln, die Pille «Farben löschen» mit Radierer-Icon (siehe «Farben löschen»).
   - 8 Zeilen, im Extreme-Modus 6. Pro Zeile links drei runde Zahlen-Chips (richtig, im Wort, falsch), rechts 5 Buchstaben-Kacheln.
3. **Tastatur-Karte**: weisse Karte als letztes Element der Spalte (kein `position: fixed`), unten Abstand `env(safe-area-inset-bottom)`.
   - Oberste Reihe: Schraffur-Icon, «Ausblenden» mit Unterzeile «Buchstaben grau schraffieren», rechts ein iOS-Schalter.
   - QWERTZ ohne Umlaute: `QWERTZUIOP`, `ASDFGHJKL`, dann [Löschen] `YXCVBNM` [Prüfen].
   - Löschen sitzt links unten mit dem Symbol ⌫. Prüfen ist der blaue Verlaufs-Button rechts unten mit dem Symbol ↵. Beide bekommen ein `aria-label`.

**Wenn der Platz knapp wird:**

1. Zuerst schrumpfen die Kacheln, bis 29 px.
2. Reicht das nicht, sinken die Tasten auf 40 px.
3. Reicht es immer noch nicht (Safari mit Symbolleisten, Querformat), darf nur das Spielfeld scrollen.

Die Tastatur bleibt immer ganz sichtbar.

## Bedienung

### Eingabe

- Buchstaben-Tasten füllen die erste freie Stelle der aktiven Zeile von links und überspringen dabei Hinweis-Stellen. Zusammen mit den Hinweisen sind es höchstens 5 Buchstaben.
- Löschen entfernt den hintersten getippten Buchstaben, nie einen Hinweis.
- Die physische Tastatur funktioniert auch (A–Z, Enter, Backspace). Tasten mit Cmd, Ctrl oder Alt werden ignoriert.
- Die nächste freie Kachel trägt den blauen Fokus-Glow (im Extreme-Modus Feuer-Orange).
- Beim Prüfen:
  - weniger als 5 Buchstaben: Zeile wackelt, Meldung «Nicht genug Buchstaben»
  - Wort nicht in der Liste: Zeile wackelt, Meldung «Nicht in der Wortliste»
  - Wort schon geraten: Zeile wackelt, Meldung «Schon versucht»
  - sonst: Die Zeile wird festgeschrieben, die Zahlen-Chips erscheinen nacheinander.
- **Meldungen** erscheinen oben in voller Breite und decken die Kopfzeile kurz ab. Die verdeckten Buttons reagieren in dieser Zeit nicht.

### Markieren (eigene Notizen)

- Antippen einer Kachel in einer bereits gewerteten Zeile schaltet weiter: ohne → Falsch → Im Wort → Richtig → ohne.
- Markierungen sind nur Notizen und ändern die Wertung nie. Sie gelten pro Kachel.
- Hinweis-Kacheln und die Gewinnzeile sind immer «Richtig» und lassen sich nicht umfärben.
- Jede Tastatur-Taste zeigt die stärkste Markierung ihres Buchstabens über alle Zeilen: Richtig vor Im Wort vor Falsch. Hinweis-Buchstaben zählen als Richtig, auch schon in der Eingabezeile. Ohne Markierung sieht die Taste normal aus.

### Farben löschen (Radierer)

- Die Pille «Farben löschen» (Radierer-Icon und Text) steht rechts in der Icon-Reihe, bündig mit den Kacheln. Tippfläche mindestens 44 px hoch.
- Sie ist nur sichtbar, wenn es mindestens eine eigene Markierung gibt. Solange die Sprechblase des Hinweises darüber liegt, ist sie ausgeblendet.
- Antippen entfernt alle eigenen Markierungen in den gewerteten Zeilen. Die Tastaturfarben passen sich an.
- Nicht betroffen: die grüne Gewinnzeile, Hinweis-Buchstaben und die Schraffur der Tastatur.
- Danach erscheint 5 s lang die Meldung «Farben gelöscht» mit dem Button «Rückgängig». Er holt alle gelöschten Markierungen zurück.

### Ausblenden (Schraffier-Schalter)

- **Schalter an:**
  - Antippen einer Buchstaben-Taste schaltet ihre Schraffur ein oder aus.
  - Die Schraffur überdeckt eine Markierungsfarbe. Die übrigen Tasten behalten ihre Farbe.
  - In diesem Modus wird nicht geschrieben. Physische Buchstaben-Tasten tun dann nichts. Prüfen und Löschen funktionieren normal.
  - Die Tastatur-Karte bekommt einen blauen Glow-Rand, und die Unterzeile wird blau: «Tippe Buchstaben zum Ausblenden».
- **Schalter aus:**
  - Schraffierte Tasten bleiben sichtbar schraffiert und sind gesperrt. Antippen tut nichts, die physische Tastatur ignoriert diese Buchstaben ebenfalls.
  - Alle anderen Tasten sind normal tippbar. Schon getippte Buchstaben in der Eingabezeile bleiben stehen.
  - Unterzeile: ohne Schraffur «Buchstaben grau schraffieren», mit Schraffur z. B. «3 Buchstaben ausgeblendet».
- **Zurückholen:** Schalter wieder an und die Taste nochmals antippen.
- **Neues Wort** (Würfel oder nach Sieg/Niederlage): Schraffur leeren und Schalter ausschalten. Jede Sprache behält ihre eigene Schraffur pro Runde.
- **Barrierefreiheit:** Gesperrte Tasten haben `aria-disabled="true"` und das Label «A, ausgeblendet».

### Hinweis «?»

- **Erster Tipp:** Der Button wirkt eingedrückt: etwas kleiner, hellblauer Grund, blaues «?», blauer Glow. Darunter erscheint die Sprechblase «Nochmals tippen für einen grünen Buchstaben».
  - Nach 3 s oder bei einem Tipp woanders springt er zurück, ohne Hinweis. Dieser andere Tipp wirkt normal, eine Taste schreibt also ihren Buchstaben.
  - Ein Tipp auf die Sprechblase schliesst sie nur.
- **Zweiter Tipp:** Ein zufälliger Platz der aktuellen Zeile bekommt den richtigen Buchstaben der Lösung als grüne, gesperrte Kachel mit kurzem Glow. Der Button springt zurück.
- **Platzwahl:** zufällig unter den Plätzen ohne Hinweis, leere Plätze zuerst. Sind alle gefüllt, ersetzt der Hinweis einen getippten Buchstaben.
- **Tippen und Löschen** überspringen Hinweis-Plätze (siehe «Eingabe»).
- **Schraffur:** Ist der Buchstabe ausgeblendet, wird die Schraffur aufgehoben.
- **Wertung:** Hinweise zählen beim Prüfen normal mit. In der gewerteten Zeile bleiben sie grün und lassen sich nicht umfärben. Die Tastatur zeigt sie grün.
- **Gesperrt** nach Rundenende und wenn alle 5 Plätze Hinweise sind.
- Ein Hinweis zählt als angefangene Runde: Der Würfel fragt dann vorher nach.

### Modus «500 Extreme»

- **Logo und Umschalten:**
  - Unter dem grossen Titel steht klein (14 px) das Logo «500 Extreme» im Höllen-Stil: gleiche Schrift (Plus Jakarta Sans 800), Buchstaben glühend von Gelb über Orange zu Rot, darüber kleine züngelnde Flammen, orangefarbener Glow. Die Flammen flackern leicht; bei `prefers-reduced-motion` stehen sie still. Nur CSS, keine Bilder oder Videos: Die Flammen sitzen in einer unsichtbaren Kopie des Schriftzugs, je zwei Zungen über jedem Buchstaben.
  - Tippen auf das kleine Logo schaltet in den Extreme-Modus. Dann tauschen die Logos: Oben steht gross (20 px) das brennende «500 Extreme», darunter klein das normale «500 Wörter». Tippen darauf schaltet zurück.
  - Das kleine Logo ist ein Button mit `aria-pressed` (gedrückt = Extreme) und mindestens 44 px hoher Tippfläche. Sie reicht nach oben über den grossen Titel und nach unten in den Abstand zum Spielfeld, nie über andere Buttons.
  - Der Wechsel wird 250 ms überblendet (View Transition; ohne sie blendet die App kurz ein).
- **Regeln:** 6 Versuche statt 8, also 6 Zeilen im Spielfeld. Kein Hinweis: «?» ist ausgeblendet, es gibt keine Hinweis-Buchstaben. Alles andere bleibt gleich: Wertung, Markieren, Farben löschen, Ausblenden, Würfel, DE/EN.
- **Runden:** Jeder Modus hat pro Sprache seine eigene laufende Runde, also 4 Runden. Beim Umschalten geht nichts verloren. Fehlt im Modus eine Runde, startet sie automatisch.
- **Wortstapel:** gemeinsam pro Sprache (siehe «Zufall»).
- **Look («Black Mode»):**
  - Hintergrund fast schwarz (#050507) mit schwachem rotem Glühen oben.
  - Keine gefüllten Flächen: Kacheln, Zahlen-Chips und Tasten sind dunkel und haben nur Neon-Umrandungen (2 px). Buchstaben und Zahlen leuchten in derselben Farbe (Glow per `text-shadow`): Richtig #39FF88, Im Wort #FFD23C, Falsch #FF3D5A.
  - Ohne Markierung und getippt: Umrandung rgba(255, 255, 255, 0.35), weisse Buchstaben. Leere Plätze: Umrandung rgba(255, 255, 255, 0.08). Nächste Stelle: Feuer-Orange #FF6A1A mit Glow statt Blau.
  - Aktionen (Prüfen, Schalter an, «Neues Wort»), der Würfel nach Rundenende und der Ausblende-Modus: Neon-Umrandung in Feuer-Orange mit Glow.
  - Schraffierte Tasten: dunkle Taste mit schwachen hellen Streifen, Buchstabe gedimmt.
  - Tastatur-Karte, Kopfzeilen-Buttons, Meldungen, Ergebnis-Karte, Radierer und Dialog: fast schwarz (#0E0E12) mit feiner heller Umrandung statt weiss.
- **Ergebnis-Karte:** bei Sieg «Höllisch gut!», bei Niederlage «Verbrannt» mit Flammen-Icon und «Das Wort war: XXXXX».

### Würfel (neues Wort)

- Ein Tippen auf den Würfel zieht ein neues Zufallswort in der aktiven Sprache.
- Läuft die Runde (mindestens ein Versuch, eine angefangene Eingabe oder ein Hinweis), kommt vorher ein Dialog im iOS-Stil:
  - Titel «Neues Wort?», Text «Die laufende Runde wird beendet.»
  - Buttons [Abbrechen] und [Neues Wort]
- Nach Sieg oder Niederlage startet die neue Runde ohne Nachfrage.

### Sprache DE/EN

- Jede Sprache hat ihre eigene laufende Runde. Umschalten wechselt zwischen den beiden Runden, ohne Nachfrage und ohne dass etwas verloren geht.
- Gibt es in einer Sprache noch keine Runde, startet automatisch eine.
- Beim allerersten Start ist Deutsch aktiv.
- Der Titel bleibt «500 Wörter», die Oberfläche bleibt auf Deutsch.

### Gewonnen und verloren

- **Gewonnen:**
  - Die Gewinnzeile färbt sich automatisch grün, eine Kachel nach der anderen.
  - Ihre Kacheln gelten als «Richtig» markiert, auch für die Tastaturfarben, und lassen sich nicht umfärben.
  - Die Ergebnis-Karte zeigt: grüner Haken, «Geschafft!» (im Extreme-Modus «Höllisch gut!»), darunter Wort und Anzahl, z. B. «PLANT in 4 Versuchen» (bei einem Versuch «PLANT im ersten Versuch»), und ein blauer Button «Neues Wort».
- **Verloren:** Die Ergebnis-Karte zeigt ein neutrales Icon, «Leider nicht», «Das Wort war: XXXXX» und den Button «Neues Wort». Im Extreme-Modus: Flammen-Icon und «Verbrannt».
- **Platz der Ergebnis-Karte:**
  - Sind mindestens zwei Zeilen leer, werden sie unsichtbar. Ihr Platz bleibt, nichts verschiebt sich, und die Karte erscheint dort.
  - Sonst (Sieg im 7. oder 8. Versuch, Niederlage) ersetzt die Karte als kompakte Zeile in gleicher Höhe die Ausblenden-Reihe der Tastatur-Karte. Die Tastatur bleibt sichtbar.
- **In beiden Fällen:**
  - Der Würfel bekommt einen blauen Glow.
  - Es ist keine Eingabe mehr möglich, und «?» ist gesperrt. Markieren und «Farben löschen» gehen weiterhin, ausser in der Gewinnzeile.

### Speichern

Alles liegt in `localStorage` unter dem versionierten Schlüssel `500w:v2`:

- zuletzt gewählter Modus und aktive Sprache
- alle vier Runden (Modus × Sprache): Lösung, Versuche mit Wertung, Markierungen und Hinweis-Plätzen, aktuelle Eingabe mit ihren Hinweisen, ausgeblendete Buchstaben, Schalterzustand, Status
- die Shuffle-Bags

Nach einem Neustart macht die App genau dort weiter, auch im zuletzt gewählten Modus. Beim Laden wird geprüft, ob eine Runde zu ihrem Modus passt (höchstens 6 Versuche und keine Hinweise im Extreme-Modus, Status passend zu den Versuchen); sonst startet sie neu.

**Migration:** Gibt es noch keinen Stand unter `500w:v2`, übernimmt die App einen alten aus `500w:v1`: Dessen Runden laufen im Normal-Modus weiter, Sprache und Stapel bleiben. Nach dem ersten Speichern im neuen Format wird `500w:v1` entfernt. Auch ältere Stände ohne Hinweise laden weiter.

## Design-Tokens

Lege `src/styles/tokens.css` so an und verwende diese Werte. Fehlt ein Wert (Dialog, Verloren-Icon), ergänze ihn als neues Token in derselben Datei.

```css
:root {
  /* Schrift */
  --font: 'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif;

  /* Flächen und Text */
  --bg: #F1F2F6;
  --bg-glow: radial-gradient(140% 60% at 50% -12%, #FFFFFF 0%, rgba(255, 255, 255, 0) 62%);
  --card: #FFFFFF;
  --card-shadow: 0 18px 40px -14px rgba(16, 24, 40, 0.20), 0 2px 6px rgba(16, 24, 40, 0.05);
  --toast-shadow: 0 24px 48px -16px rgba(16, 24, 40, 0.28), 0 2px 8px rgba(16, 24, 40, 0.06);
  --ink: #1D1D1F;
  --ink-soft: #6E6E73;
  --ink-mute: #767B86;

  /* Farbstufen: Richtig (laut, glänzend) > Im Wort (glänzend) > Falsch (leise, getönt) */
  --right-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.30), rgba(255, 255, 255, 0) 52%), linear-gradient(180deg, #36C670, #128A47);
  --right-ink: #FFFFFF;
  --right-text-shadow: 0 1px 1px rgba(0, 60, 25, 0.3);
  --right-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 8px 18px -6px rgba(18, 138, 71, 0.6);
  --right-shadow-key: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 5px 12px -5px rgba(18, 138, 71, 0.65);
  --right-shadow-chip: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 4px 10px -3px rgba(18, 138, 71, 0.55);
  --maybe-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.40), rgba(255, 255, 255, 0) 52%), linear-gradient(180deg, #FFD45E, #FFAD1F);
  --maybe-ink: #5A3B00;
  --maybe-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 8px 18px -6px rgba(255, 165, 20, 0.6);
  --maybe-shadow-key: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 5px 12px -5px rgba(255, 165, 20, 0.65);
  --maybe-shadow-chip: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 4px 10px -3px rgba(255, 165, 20, 0.55);
  --wrong-bg: linear-gradient(180deg, #FFF4F3, #FFE6E4);
  --wrong-ink: #CC3540;
  --wrong-shadow: inset 0 0 0 1px rgba(204, 53, 64, 0.10), 0 1px 2px rgba(16, 24, 40, 0.04);
  --wrong-shadow-key: inset 0 0 0 1px rgba(204, 53, 64, 0.10);
  --wrong-shadow-chip: inset 0 0 0 1px rgba(204, 53, 64, 0.16);

  /* Kacheln und Eingabezeile */
  --tile-bg: linear-gradient(180deg, #FFFFFF, #FAFBFC);
  --tile-shadow: 0 1px 2px rgba(16, 24, 40, 0.06), 0 6px 14px -4px rgba(16, 24, 40, 0.10);
  --slot-bg: rgba(120, 128, 150, 0.08);
  --slot-shadow: inset 0 1px 2px rgba(16, 24, 40, 0.04);
  --input-rest-bg: rgba(255, 255, 255, 0.7);
  --input-rest-shadow: inset 0 0 0 1px rgba(16, 24, 40, 0.06);
  --focus-ring: 0 0 0 2px #0A84FF, 0 0 0 6px rgba(10, 132, 255, 0.12), 0 8px 20px -6px rgba(10, 132, 255, 0.5);

  /* Zahlen-Chips */
  --chip-zero-bg: rgba(120, 128, 150, 0.10);
  --chip-zero-ink: #767B86;
  --chip-empty-bg: rgba(120, 128, 150, 0.05);

  /* Tastatur */
  --key-bg: #F0F1F5;
  --key-shadow: inset 0 -1px 0 rgba(16, 24, 40, 0.07);
  --key-special-bg: #E3E5EB;
  --key-hidden-bg: repeating-linear-gradient(135deg, #D3D7DF 0 2px, #F0F1F5 2px 6px);
  --key-hidden-ink: rgba(60, 60, 67, 0.3);
  --action-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 52%), linear-gradient(180deg, #2A86F5, #0059D6);
  --action-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 6px 14px -5px rgba(0, 89, 214, 0.6);
  --hide-glow: 0 0 0 2px rgba(10, 132, 255, 0.55), 0 0 28px 2px rgba(10, 132, 255, 0.26);
  --hide-hint-ink: #0A6FE0;
  --switch-off: #E9E9EB;
  --switch-on-glow: 0 0 0 4px rgba(10, 132, 255, 0.14), 0 4px 14px rgba(10, 132, 255, 0.45);
  --segment-track: rgba(118, 118, 128, 0.12);
  --segment-off-ink: #636366;
  --dice-glow: 0 0 0 4px rgba(10, 132, 255, 0.14), 0 0 24px rgba(10, 132, 255, 0.45);

  /* Icons über den Zahlen-Spalten */
  --icon-right: #18994F;
  --icon-maybe: #E39A00;
  --icon-wrong: #CC3540;

  /* Radien */
  --r-tile: 14px;
  --r-key: 10px;
  --r-card: 28px;
}
```

So werden die Tokens eingesetzt:

| Element | Hintergrund | Schatten / Text |
|---|---|---|
| Kachel ohne Markierung, getippte Kachel | `--tile-bg` | `--tile-shadow` |
| Kachel Falsch / Im Wort / Richtig | `--wrong-bg` / `--maybe-bg` / `--right-bg` | `--wrong-shadow` / `--maybe-shadow` / `--right-shadow`, Text `--*-ink`, Richtig zusätzlich `--right-text-shadow` |
| leere Kachel | `--slot-bg` | `--slot-shadow` |
| nächste Stelle in der Eingabezeile | `#FFFFFF` | `--focus-ring` |
| restliche Stellen der Eingabezeile | `--input-rest-bg` | `--input-rest-shadow` |
| Zahlen-Chip mit Zahl > 0 | `--right-bg` / `--maybe-bg` / `--wrong-bg` | `--*-shadow-chip` |
| Zahlen-Chip mit 0 | `--chip-zero-bg` | Text `--chip-zero-ink` |
| Zahlen-Chip, Zeile noch offen | `--chip-empty-bg` | keine Zahl |
| Taste normal | `--key-bg` | `--key-shadow` |
| Taste markiert | wie die Kachel | `--*-shadow-key` |
| Taste ausgeblendet | `--key-hidden-bg` | Text `--key-hidden-ink` |
| Prüfen, Schalter an, «Neues Wort» | `--action-bg` | `--action-shadow` bzw. `--switch-on-glow` |
| Tastatur-Karte im Ausblende-Modus | `--card` | `--hide-glow`, dann `--card-shadow` |
| Ergebnis-Karte, Meldungen | `--card` | `--toast-shadow` |
| Pille «Farben löschen» | `--eraser-bg` | `--eraser-shadow`, Text `--eraser-ink`, Radius `--r-pill` |
| «?» eingedrückt | `--hint-armed-bg` | Glow `--dice-glow`, Text `--hint-armed-ink`, Grösse `--hint-armed-scale` |
| «?» gesperrt | wie der Würfel | Deckkraft `--disabled-opacity` |
| Sprechblase | `--bubble-bg` | `--bubble-shadow`, Text `--bubble-ink`, Radius `--r-bubble`, höchstens `--bubble-max-width` breit |
| Hinweis-Kachel | `--right-bg` | `--right-shadow`, frisch gesetzt zusätzlich `--hint-tile-glow` |
| Meldung «Farben gelöscht» | `--card` | `--toast-shadow`, Icon `--toast-info-bg` / `--toast-info-ink`, Button `--toast-action-bg` / `--toast-action-ink` |

Für Radierer, Hinweis und die Meldung mit «Rückgängig» kommen diese Tokens dazu, ebenfalls in `tokens.css`:

```css
:root {
  /* Radierer «Farben löschen» */
  --eraser-bg: #FFFFFF;
  --eraser-ink: #5E626C;
  --eraser-shadow: 0 1px 2px rgba(16, 24, 40, 0.06), 0 4px 12px -4px rgba(16, 24, 40, 0.16);
  --r-pill: 14px;

  /* Hinweis «?» */
  --hint-armed-bg: #E8F2FF;
  --hint-armed-ink: #0A6FE0;
  --hint-armed-scale: 0.92;
  --hint-tile-glow: 0 0 0 4px rgba(54, 198, 112, 0.24), 0 0 26px 4px rgba(54, 198, 112, 0.55);
  --bubble-bg: #FFFFFF;
  --bubble-ink: #1D1D1F;
  --bubble-shadow: 0 16px 36px -12px rgba(16, 24, 40, 0.30), 0 2px 8px rgba(16, 24, 40, 0.08);
  --bubble-max-width: 230px;
  --r-bubble: 14px;
  --disabled-opacity: 0.4;

  /* Meldung mit Aktion («Rückgängig») */
  --toast-info-bg: rgba(120, 128, 150, 0.10);
  --toast-info-ink: #5E626C;
  --toast-action-bg: rgba(10, 132, 255, 0.10);
  --toast-action-ink: #0A6FE0;
}
```

**Extreme-Modus («Black Mode»):** Die App setzt `data-mode="normal"` bzw. `data-mode="extreme"` auf `<html>`. Der dunkle Look überschreibt unter `:root[data-mode='extreme']` nur Tokens, die Regeln in `app.css` bleiben für beide Looks dieselben. Token, die nur der Extreme-Modus braucht (Glow auf Buchstaben und Zahlen, Ringe um leere Chips, Farbe und Glow der Aktionen), haben im Normal-Modus neutrale Werte (`none` bzw. Weiss), damit sich dort nichts ändert. Die Neon-Werte:

```css
:root[data-mode='extreme'] {
  color-scheme: dark;
  --neon-right: #39FF88;   /* Richtig */
  --neon-maybe: #FFD23C;   /* Im Wort */
  --neon-wrong: #FF3D5A;   /* Falsch */
  --neon-fire: #FF6A1A;    /* nächste Stelle, Aktionen, Ausblende-Modus */
  --neon-line: rgba(255, 255, 255, 0.35);        /* ohne Markierung und getippt */
  --neon-line-empty: rgba(255, 255, 255, 0.08);  /* leere Plätze */
  --neon-width: 2px;
  --black: #050507;        /* Seite */
  --black-card: #0E0E12;   /* Karten, Kacheln, Tasten, Buttons */
  --black-edge: rgba(255, 255, 255, 0.1);        /* feine helle Umrandung */
  /* … daraus z. B.: */
  --right-bg: var(--black-card);
  --right-ink: var(--neon-right);
  --right-shadow: inset 0 0 0 var(--neon-width) var(--neon-right), /* Glow innen und aussen */ …;
  --right-glow: 0 0 6px rgba(57, 255, 136, 0.8), 0 0 14px rgba(57, 255, 136, 0.35);
  --focus-ring: inset 0 0 0 var(--neon-width) var(--neon-fire), …;
  --action-bg: var(--black-card);
  --action-ink: var(--neon-fire);
}
```

Das Logo «500 Extreme» hat eigene Tokens (`--fire-text`, `--fire-flame`, `--fire-flame-core`, `--fire-glow`, `--fire-haze`). Auf hellem Grund ist der Verlauf etwas satter und der Glow schwächer, damit der kleine Schriftzug lesbar bleibt; auf Schwarz leuchtet er heller, mit Hitze-Schimmer dahinter.

### Masse (Referenz iPhone 390 × 844)

- **Allgemein:** Seitenrand 14 px. Abstand Kopfzeile → Spielfeld → Tastatur je 16 px. Das Spielfeld hat oben zusätzlich 9 px Innenabstand, damit die Tippfläche des Radierers auch bei knappem Platz ganz hineinpasst.
- **Kopfzeile:** 52 px hoch (8 px mehr als ohne zweites Logo). Hinweis und Würfel je 44 px rund, Abstand 8 px.
- **Logos:** gross 20 px (Zeilenhöhe 22 px), klein 14 px, Abstand 4 px, Gewicht 800. Unter 360 px Breite 16 und 12.5 px, unter 340 px 15 und 12 px. Die Flammen sind bis 0.72em hoch, beim grossen Logo auf 78 % verkleinert, damit sie oben nicht anstossen.
- **Kacheln:** Richtwert 46 px (Radius 14), Abstand 6 px, Zeilenabstand 7 px. Buchstaben halb so gross wie die Kachel, Gewicht 800.
- **Zahlen-Chips:** 26 px rund, Abstand 4 px. Zahl 13 px, Gewicht 800. Abstand Chips → Kacheln 14 px.
- **Icon-Reihe über den Chips:** 28 px hoch, Icons 15 px.
- **Pille «Farben löschen»:** 28 px hoch, Radius 14, Icon 15 px, Text 12 px mit Gewicht 700. Die Tippfläche reicht 9 px nach oben und 7 px nach unten (44 px), aber nie über die Kacheln.
- **Sprechblase:** höchstens 230 px breit, Radius 14, Text 13 px mit Gewicht 700, zweizeilig zentriert. Sie sitzt 8 px unter dem «?», ihre Spitze zeigt auf den Button.
- **Meldungen:** volle Breite über der Kopfzeile und so hoch wie sie (52 px), damit sie sie ganz abdecken. «Rückgängig» ist 30 px hoch mit 44 px Tippfläche.
- **Tastatur-Karte:**
  - Radius 28, Innenabstand 8 px (unten 10 px)
  - Ausblenden-Reihe 44 px hoch
  - Tasten 46 px hoch, Radius 10, Abstand 6 px, Buchstaben 18 px mit Gewicht 700
  - Prüfen und Löschen je 1.55-fache Breite
  - zweite Reihe beidseitig um eine halbe Tastenbreite eingerückt (≈ 17 px)
- **Schalter:** 51 × 31 px (iOS), Knopf 27 px.
- **Segment-Schalter:** Spur mit 2 px Innenabstand, Segmente 46 × 34 px, Radius 12 bzw. 10.
- **Titel:** siehe «Logos», Laufweite −0.02em (unter 340 px −0.03em).
- **Ergebnis-Karte bei 320 px:** Der Untertitel bricht um; die Karte wird dafür niedriger (Innenabstand oben und unten 7 px, Untertitel 12 px), damit sie in zwei freie Zeilen passt.

### Responsiv

- Das Spielfeld bekommt `container-type: size`. Die Kachelgrösse ergibt sich aus seinem Platz und der Zahl der Zeilen (`--rows`: 8 bzw. 6): `--tile: clamp(29px, min((100cqw - 124px) / 5, (100cqh - 29px - var(--rows) * 7px) / var(--rows)), 50px)`. Die Chips bleiben 26 px.
- Die Tasten-Formel bleibt trotz höherer Kopfzeile gleich (Konstante 504 px): Die 8 px trägt das Spielfeld, die Kacheln werden dort, wo der Platz knapp ist, 1 px kleiner. Die Tastatur bleibt unverändert.
- Kontrolliere während der Arbeit mit Playwright-Screenshots in beiden Modi bei 320 × 568, 375 × 667, 390 × 844 und 430 × 932: Tastatur ganz sichtbar, Kacheln mindestens 29 px, nichts kollidiert (Kopfzeile, Logos und ihre Tippfläche, Radierer, Sprechblase, Meldungen, Ergebnis-Karte). Kein Scrollen ausser im Normal-Modus bei 568 px Höhe, wo das Spielfeld wie bisher scrollt. Playwright gehört nicht zu `npm test`.
- Desktop: App mittig mit höchstens 430 px Breite.
- Technik:
  - `env(safe-area-inset-*)` mit `viewport-fit=cover`
  - `touch-action: manipulation`, damit Doppeltippen nicht zoomt
  - `overscroll-behavior: none` auf `html` und `body`, gegen das Federn
  - keine Textauswahl auf Tasten und Kacheln

## Bewegung

Kurz und weich. Bei `prefers-reduced-motion` nur Überblendungen.

- **Buchstabe tippen:** Die Kachel federt von 0.92 auf 1 (120 ms).
- **Wertung:** Die Chips erscheinen nacheinander (je 60 ms) mit kleinem Pop.
- **Fehler:** Die Zeile wackelt 300 ms, die Meldung erscheint oben für 1.6 s.
- **Markieren:** Farbwechsel in 140 ms.
- **Farben löschen:** Die Farben blenden in 140 ms aus, die Meldung «Farben gelöscht» bleibt 5 s. Die Pille blendet in 160 ms ein.
- **Hinweis:** «?» schrumpft beim ersten Tipp auf 0.92, die Sprechblase blendet in 180 ms ein. Die neue Hinweis-Kachel federt auf und leuchtet 1.1 s grün nach.
- **Schalter:** Der Knopf gleitet in 200 ms, der Glow blendet ein.
- **Sieg:** Die Gewinnzeile färbt sich nacheinander grün (70 ms Abstand), die Ergebnis-Karte gleitet hoch.
- **Moduswechsel:** Die ganze Seite wird in 250 ms überblendet (View Transition; ohne sie blendet die App von 40 % auf 100 % ein).
- **Flammen:** Jede Zunge flackert leicht (Höhe, Breite, Neigung, Deckkraft), in unterschiedlichen Takten zwischen 0.9 und 1.45 s. Bei `prefers-reduced-motion` stehen sie still.

## Barrierefreiheit

- Überall echte `<button>`-Elemente.
- Kacheln mit `aria-label`, z. B. «S, falsch».
- Jede Zeile mit Text für Screenreader, z. B. «Versuch 2: 1 richtig, 1 im Wort, 3 falsch».
- Schalter mit `role="switch"`, Segment-Schalter und ausgeblendete Tasten (bei Schalter an) mit `aria-pressed`. Gesperrte Tasten (schraffiert bei Schalter aus) mit `aria-disabled="true"`.
- Hinweis-Button mit `aria-label="Hinweis"` und `aria-pressed` (`"true"`, solange er eingedrückt ist), gesperrt mit `aria-disabled="true"`. Die Sprechblase hängt über `aria-describedby` am Button. Ein gesetzter Hinweis wird vorgelesen, z. B. «Hinweis an Stelle 3: L.».
- Hinweis-Kacheln heissen z. B. «O, Hinweis». Die Eingabezeile nennt ihre Hinweise, z. B. «Versuch 5, Eingabe: W O L, Hinweis an Stelle 4: K».
- Modus-Wechsel: Button mit `aria-label="500 Extreme"` und `aria-pressed` (`"true"` im Extreme-Modus). Die Überschrift `<h1>` heisst je nach Modus «500 Wörter» oder «500 Extreme»; das Flammen-Logo selbst ist `aria-hidden`. Beim Umschalten wird vorgelesen, was gilt, z. B. «500 Extreme: 6 Versuche, keine Hinweise.».
- Farbe trägt nie allein die Bedeutung: Dafür stehen die Icons über den Zahlen-Spalten.

## PWA und iOS

- **Manifest:**
  - Name und Kurzname «500 Wörter»
  - `display: standalone`
  - `theme_color` und `background_color` #F1F2F6
  - `lang: de`
- **HTML:**
  - `<html lang="de" data-mode="normal">` und `<title>500 Wörter</title>`
  - `<meta name="theme-color" content="#F1F2F6">` (setzt das Plugin nicht selbst), im Extreme-Modus #050507
  - `color-scheme: light`, im Extreme-Modus `dark`
  - Ein kleines Skript im `<head>` setzt den zuletzt gewählten Modus schon vor dem ersten Bild, damit es im Extreme-Modus beim Start nicht hell aufblitzt.
- **iOS:** `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: default` und ein `apple-touch-icon` mit 180 px.
- **Statusleiste:** Der Stil bleibt `default`, `theme-color` und der Seitenhintergrund wechseln mit dem Modus. Begründung:
  - Safari ab iOS 26 ignoriert `theme-color` und färbt Status- und Adressleiste nach dem Seitenhintergrund (`html`/`body`); der ist im Extreme-Modus schwarz. Ältere Versionen nehmen `theme-color`, das die App mitwechselt.
  - Als Web-App vom Home-Bildschirm liest iOS den Statusleisten-Stil nur einmal beim Start, er kann also nicht mit dem Modus wechseln. `black-translucent` hätte im Extreme-Modus perfekt gewirkt, zeigt die Uhr aber immer weiss, im hellen Normal-Modus wäre sie unlesbar. `black` gäbe dem Normal-Modus einen schwarzen Balken. `default` ist in beiden Modi lesbar; je nach iOS-Version kann die Leiste im Extreme-Modus aber in der Systemfarbe statt schwarz erscheinen. Auf einem echten iPhone prüfen.
- **App-Icon:**
  - Vorlagen in `design/`: `app-icon.png` und `app-icon-maskable.png`, je 1024 × 1024 px ohne Transparenz
  - `npm run icons` (`scripts/build-icons.mjs`) erzeugt daraus in `public/` das iOS-Icon (180 px), die PWA-Icons (192 und 512 px), das maskierbare Icon (512 px, aus der maskierbaren Vorlage) und das Favicon (16, 32 und 48 px). Die erzeugten Dateien werden committet.
  - das 180-px-Icon ohne Transparenz und ohne eigene Rundung
- Das Spiel ist offline voll spielbar.

## Projektstruktur (Vorschlag)

```
src/
  game/score.ts  game/state.ts (Reducer)  game/storage.ts  game/bag.ts
  data/solutions.json  data/valid-de.json  data/valid-en.json
  components/ Header  Logo  Board  Row  Tile  CountChips  Keyboard  HideSwitch  ResultCard  Toast  ConfirmDialog
  styles/tokens.css  styles/app.css
public/ (erzeugte Icons)
scripts/build-wordlists.mjs  scripts/build-icons.mjs
design/*.png
```

## Tests (müssen grün sein)

- `score()` mit allen Fällen aus der Tabelle oben.
- Wortlisten:
  - je 250 Wörter, je 5 Buchstaben A–Z
  - keine Duplikate, auch nicht zwischen DE und EN (500 verschiedene Wörter)
  - alle Lösungen in der gültigen Liste
- Markier-Zyklus und Tastenfarbe: Die stärkste Markierung gewinnt. Die Gewinnzeile zählt als «Richtig».
- Ausblenden:
  - Schalter an: Tippen schraffiert statt zu schreiben.
  - Schalter aus: Die Schraffur bleibt, gesperrte Tasten schreiben weder per Tippen noch per physischer Tastatur.
  - Ein neues Wort leert die Schraffur.
- Farben löschen:
  - Die Pille erscheint erst mit einer eigenen Markierung.
  - Antippen löscht alle eigenen Farben, die Tastatur passt sich an. Gewinnzeile, Hinweise und Schraffur bleiben.
  - «Rückgängig» holt die Farben zurück. Nach 5 s ist die Meldung weg.
- Tastatur: Die unterste Reihe lautet [Löschen] `YXCVBNM` [Prüfen].
- Hinweis:
  - Erst der zweite Tipp gibt einen Hinweis. Nach 3 s oder bei einem Tipp woanders springt «?» zurück.
  - Platzwahl: leere Plätze zuerst, sonst wird ein getippter Buchstabe ersetzt, nie zweimal derselbe Platz.
  - Tippen und Löschen überspringen Hinweise. Beim Prüfen zählen sie mit und bleiben grün und gesperrt.
  - Die Schraffur des Hinweis-Buchstabens wird aufgehoben.
  - Gesperrt nach Rundenende und bei 5 Hinweisen.
  - Hinweise werden gespeichert und wieder geladen.
- Extreme-Modus:
  - Umschalten in beide Richtungen: Logos tauschen, `aria-pressed`, 6 bzw. 8 Zeilen, `data-mode`, `theme-color` und `color-scheme`.
  - Getrennte Runden: Jeder Modus behält pro Sprache seine Runde, beim Umschalten geht nichts verloren; Würfel und Sprache wirken nur auf die sichtbare Runde; eine verspätete Wertung landet in der richtigen Runde.
  - Niederlage nach 6 Versuchen («Verbrannt»), ein 7. Versuch wird nicht angenommen; Sieg «Höllisch gut!»; Platz der Ergebnis-Karte bei 6 Zeilen.
  - Kein «?» und keine Hinweise, auch nicht über den Reducer.
  - Gemeinsamer Wortstapel: 250 Wörter ohne Wiederholung über beide Modi; das laufende Wort des anderen Modus kommt nach dem Neumischen nicht doppelt.
  - Speichern und Laden: Modus und alle vier Runden exakt; unpassende Runden (zu viele Versuche, Hinweise, falscher Status) fallen weg; Migration aus `500w:v1` in den Normal-Modus, danach ist der alte Schlüssel weg.
- Sprache: Die beiden Runden bleiben getrennt erhalten.
- Shuffle-Bag: 250 Ziehungen ohne Wiederholung. Nach dem Neumischen kommt das letzte Wort nicht sofort wieder.
- Ergebnis-Karte: richtiger Platz bei Sieg mit freien Zeilen, bei Sieg im 8. Versuch und bei Niederlage.
- Speichern und Laden stellt den Zustand exakt wieder her.

## Abschluss

1. `npm run build` und `npm test` laufen fehlerfrei.
2. Der GitHub-Actions-Workflow für Pages ist eingerichtet. Committe in sinnvollen Schritten.
3. Ein README auf Deutsch erklärt:
   - lokal starten
   - Wortlisten neu erzeugen
   - deployen: Mit einem Gratis-Konto funktioniert GitHub Pages nur bei öffentlichen Repos. Einmalig unter Settings → Pages → Source «GitHub Actions» wählen.
   - auf dem iPhone in Safari «Zum Home-Bildschirm» hinzufügen
   - Lizenz-Hinweis: Die deutsche Liste stammt aus einem GPL-lizenzierten Wörterbuch (`@cspell/dict-de-ch`).
4. Fasse am Ende kurz zusammen, was gebaut wurde und wo du von dieser Spezifikation abgewichen bist.
