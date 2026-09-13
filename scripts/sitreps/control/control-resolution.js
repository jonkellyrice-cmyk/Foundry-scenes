/** Canonical Control scoring/result transition. No chat, DOM, or hook ownership. */

import { readSitrepState, updateSitrepState } from "../state/sitrep-state-service.js";
import { calculateControlState } from "./control-state.js";

export async function resolveControlEncounterUpdate(combat, changes = {}, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "control" || !sitrep.active || sitrep.status !== "active") return Object.freeze({ changed: false, state: sitrep, outputIntents: [] });
  if (!Object.prototype.hasOwnProperty.call(changes ?? {}, "round")) return Object.freeze({ changed: false, state: sitrep, outputIntents: [] });

  const state = calculateControlState(combat, sitrep, spatialOperations);
  if (!state.valid) return Object.freeze({ changed: false, state: sitrep, outputIntents: [] });

  const completedRound = Number(changes.round) - 1;
  const scoredRounds = Array.isArray(sitrep.scoredRounds) ? [...sitrep.scoredRounds] : [];
  let friendlyScore = Number(sitrep.scores?.friendly ?? 0);
  let hostileScore = Number(sitrep.scores?.hostile ?? 0);
  const outputIntents = [];
  let changed = false;

  if (completedRound >= Number(sitrep.startRound) && completedRound <= Number(sitrep.finalRound) && !scoredRounds.includes(completedRound)) {
    let friendlyRoundPoints = state.friendlyZones;
    let hostileRoundPoints = state.hostileZones;
    if (state.friendlyZones === 4) friendlyRoundPoints += 1;
    if (state.hostileZones === 4) hostileRoundPoints += 1;
    scoredRounds.push(completedRound);
    friendlyScore += friendlyRoundPoints;
    hostileScore += hostileRoundPoints;
    changed = true;
    outputIntents.push(Object.freeze({ kind: "sitrep-round-scored", sitrepType: "control", round: completedRound, friendlyPoints: friendlyRoundPoints, hostilePoints: hostileRoundPoints, scores: Object.freeze({ friendly: friendlyScore, hostile: hostileScore }) }));
  }

  let status = sitrep.status;
  let resultReason = sitrep.resultReason ?? "";
  if (Number(changes.round) > Number(sitrep.finalRound)) {
    if (friendlyScore > hostileScore) { status = "victory"; resultReason = `The allies won Control ${friendlyScore} to ${hostileScore}.`; }
    else if (hostileScore > friendlyScore) { status = "defeat"; resultReason = `The hostiles won Control ${hostileScore} to ${friendlyScore}.`; }
    else { status = "draw"; resultReason = `Control ended in a ${friendlyScore} to ${hostileScore} draw. Neither side achieved victory.`; }
    changed = true;
    outputIntents.push(Object.freeze({ kind: "sitrep-result", sitrepType: "control", status, reason: resultReason }));
  }

  if (!changed) return Object.freeze({ changed: false, state: sitrep, derivedState: state, outputIntents: [] });
  const nextState = await updateSitrepState({ scores: { friendly: friendlyScore, hostile: hostileScore }, scoredRounds, status, resultReason }, combat);
  return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntents: Object.freeze(outputIntents) });
}
