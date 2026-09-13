/** Canonical shared SITREP round/final-round calculations. */

export function currentSitrepRound(combat, sitrep) {
  return Math.max(Number(combat?.round ?? sitrep?.startRound ?? 1), 1);
}

export function sitrepRoundsRemaining(combat, sitrep) {
  const currentRound = currentSitrepRound(combat, sitrep);
  const finalRound = Math.max(Number(sitrep?.finalRound ?? currentRound), currentRound);
  return Math.max(finalRound - currentRound + 1, 0);
}

export function isSitrepFinalRound(combat, sitrep) {
  return currentSitrepRound(combat, sitrep) >= Number(sitrep?.finalRound ?? Infinity);
}

export function isSitrepRoundPastLimit(combat, sitrep) {
  return currentSitrepRound(combat, sitrep) > Number(sitrep?.finalRound ?? Infinity);
}
