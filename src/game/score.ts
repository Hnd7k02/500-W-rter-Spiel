/**
 * Wertet einen Versuch: [richtig, im Wort, falsch].
 * Doppelte Buchstaben zählen wie bei Wordle: jeder Buchstabe der Lösung wird höchstens einmal angerechnet.
 */
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
