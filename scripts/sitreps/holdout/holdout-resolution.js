/** Canonical Holdout final resolution. No chat, DOM, or hook ownership. */

import { readSitrepState, updateSitrepState } from "../state/sitrep-state-service.js";
import { calculateHoldoutState } from "./holdout-state.js";

export async function resolveHoldoutEncounterUpdate(combat, changes = {}, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "holdout" || !sitrep.active || sitrep.status !== "active") return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  if (!Object.prototype.hasOwnProperty.call(changes ?? {}, "round") || Number(changes.round) <= Number(sitrep.finalRound)) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const state = calculateHoldoutState(combat, sitrep, spatialOperations);
  if (!state.valid) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const finalScore = Number(state.holdoutScore);
  const won = finalScore >= 1;
  const captureWarning = !won && state.friendlyStanding > 0 ? " Any allied units still on the battlefield are captured or overrun." : "";
  const status = won ? "victory" : "defeat";
  const reason = won
    ? `The allies held the zone through round ${sitrep.finalRound} with a final score of ${finalScore}.`
    : `The position was overrun at the end of round ${sitrep.finalRound}. Final score: ${finalScore}.${captureWarning}`;
  const nextState = await updateSitrepState({ status, resultReason: reason }, combat);
  return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: Object.freeze({ kind: "sitrep-result", sitrepType: "holdout", status, reason, finalScore }) });
}
