/** Canonical Escort objective/result transitions. No chat, DOM, or hook ownership. */

import { readSitrepState, updateSitrepState } from "../state/sitrep-state-service.js";
import { calculateEscortState } from "./escort-state.js";

function outcomeIntent(status, reason, event) {
  return Object.freeze({ kind: "sitrep-objective-result", sitrepType: "escort", event, status, reason });
}

export async function resolveEscortObjective(combat, outcome, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "escort") {
    return Object.freeze({ changed: false, state: sitrep, outputIntent: null, rejection: "not-escort" });
  }

  const state = await calculateEscortState(combat, sitrep, spatialOperations);
  if (!state.valid) {
    return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null, rejection: "invalid-objective-configuration" });
  }

  if (outcome === "extracted") {
    const reason = "The Objective was safely extracted.";
    const nextState = await updateSitrepState({ escortStatus: "extracted", status: "victory", resultReason: reason }, combat);
    return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: outcomeIntent("victory", reason, "extracted"), rejection: null });
  }

  if (outcome === "destroyed") {
    const reason = "The Objective was destroyed. Neither side achieved victory.";
    const nextState = await updateSitrepState({ escortStatus: "destroyed", status: "draw", resultReason: reason }, combat);
    return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: outcomeIntent("draw", reason, "destroyed"), rejection: null });
  }

  return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null, rejection: "unknown-outcome" });
}

export async function resolveEscortEncounterUpdate(combat, changes = {}, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "escort" || !sitrep.active || sitrep.status !== "active") return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const state = await calculateEscortState(combat, sitrep, spatialOperations);
  if (!state.valid) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });

  let patch = null;
  let outputIntent = null;
  if (state.objectiveDestroyed && sitrep.escortStatus !== "destroyed") {
    const reason = "The Objective was destroyed. Neither side achieved victory.";
    patch = { escortStatus: "destroyed", status: "draw", resultReason: reason };
    outputIntent = outcomeIntent("draw", reason, "destroyed");
  } else if (state.canExtractObjective) {
    const reason = "The Objective was safely extracted.";
    patch = { escortStatus: "extracted", status: "victory", resultReason: reason };
    outputIntent = outcomeIntent("victory", reason, "extracted");
  } else if (Object.prototype.hasOwnProperty.call(changes ?? {}, "round") && Number(changes.round) > Number(sitrep.finalRound)) {
    const reason = `The Objective was not extracted by the end of round ${sitrep.finalRound}.`;
    patch = { status: "defeat", resultReason: reason };
    outputIntent = outcomeIntent("defeat", reason, "round-limit");
  }

  if (!patch) return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntent: null });
  const nextState = await updateSitrepState(patch, combat);
  return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent });
}
