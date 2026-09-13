/** Canonical Extraction objective/result transitions. No direct UI or chat ownership. */

import { readSitrepState, updateSitrepState } from "../state/sitrep-state-service.js";
import { calculateExtractionState } from "./extraction-state.js";

function objectiveIntent(event, status, reason) { return Object.freeze({ kind: "sitrep-objective-result", sitrepType: "extraction", event, status, reason }); }

export async function resolveExtractionObjective(combat, outcome, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "extraction") return Object.freeze({ changed: false, state: sitrep, outputIntent: null, rejection: "not-extraction" });
  const state = await calculateExtractionState(combat, sitrep, spatialOperations);
  if (!state.valid) return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null, rejection: "invalid-objective-configuration" });
  if (outcome === "extracted") {
    if (!state.canExtractObjective) return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null, rejection: "objective-not-extractable" });
    const reason = "The Objective was safely recovered and extracted.";
    const nextState = await updateSitrepState({ extractionStatus: "extracted", status: "victory", resultReason: reason }, combat);
    return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: objectiveIntent("extracted", "victory", reason), rejection: null });
  }
  if (outcome === "destroyed") {
    const reason = "The Objective was destroyed. Neither side achieved victory.";
    const nextState = await updateSitrepState({ extractionStatus: "destroyed", status: "draw", resultReason: reason }, combat);
    return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: objectiveIntent("destroyed", "draw", reason), rejection: null });
  }
  return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null, rejection: "unknown-outcome" });
}

export async function resolveExtractionEncounterUpdate(combat, changes = {}, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "extraction" || !sitrep.active || sitrep.status !== "active") return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const state = await calculateExtractionState(combat, sitrep, spatialOperations);
  if (!state.valid) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  if (state.objectiveDestroyed && sitrep.extractionStatus !== "destroyed") return resolveExtractionObjective(combat, "destroyed", spatialOperations);
  if (Object.prototype.hasOwnProperty.call(changes ?? {}, "round") && Number(changes.round) > Number(sitrep.finalRound)) {
    const reason = `The Objective was not extracted by the end of round ${sitrep.finalRound}. Any allied units remaining on the battlefield are captured or overrun.`;
    const nextState = await updateSitrepState({ status: "defeat", resultReason: reason }, combat);
    return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: objectiveIntent("round-limit", "defeat", reason) });
  }
  return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null });
}
