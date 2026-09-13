/** Canonical Gauntlet encounter transition semantics. No hooks, chat, or DOM ownership. */

import { readSitrepState, updateSitrepState } from "../state/sitrep-state-service.js";
import { calculateGauntletState } from "./gauntlet-state.js";

function resultIntent(status, reason) {
  return Object.freeze({ kind: "sitrep-result", sitrepType: "gauntlet", status, reason });
}

export function deriveGauntletResolution(combat, sitrep, changes, spatialOperations) {
  if (!combat || !sitrep || sitrep.type !== "gauntlet" || !sitrep.active || sitrep.status !== "active") return null;
  const state = calculateGauntletState(combat, sitrep, spatialOperations);
  if (!state.valid) return null;
  if (state.immediateVictory) return { status: "victory", reason: state.immediateReason, state };
  const roundChanged = Object.prototype.hasOwnProperty.call(changes ?? {}, "round");
  if (!roundChanged) return null;
  const previousRound = Number(combat.previous?.round ?? 0);
  const finalRound = Number(sitrep.finalRound);
  const currentRound = Number(combat.round);
  const advancedPastFinalRound = currentRound > finalRound;
  const fallbackPastFinalRound = previousRound === finalRound && currentRound !== previousRound;
  if (!advancedPastFinalRound && !fallbackPastFinalRound) return null;
  const won = Boolean(sitrep.rules?.finalZoneControl && state.friendlyInZone > state.hostileInZone && state.friendlyInZone > 0);
  const reason = won
    ? `At the end of round ${sitrep.finalRound}, allied units controlled the zone ${state.friendlyInZone} to ${state.hostileInZone}.`
    : `At the end of round ${sitrep.finalRound}, allied units did not control the zone (${state.friendlyInZone} allied, ${state.hostileInZone} hostile).`;
  return { status: won ? "victory" : "defeat", reason, state };
}

export async function resolveGauntletEncounterUpdate(combat, changes = {}, spatialOperations) {
  const sitrep = readSitrepState(combat);
  const resolution = deriveGauntletResolution(combat, sitrep, changes, spatialOperations);
  if (!resolution) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const nextState = await updateSitrepState({ status: resolution.status, resultReason: resolution.reason }, combat);
  return Object.freeze({ changed: true, state: nextState, derivedState: resolution.state, outputIntent: resultIntent(resolution.status, resolution.reason) });
}
