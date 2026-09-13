/** Canonical Extraction battlefield-state derivation. */

import { combatantById, combatantIsDefeated, collectStandingSitrepCombatants, SITREP_FACTIONS } from "../shared/sitrep-combatant-primitives.js";
import { currentSitrepRound, sitrepRoundsRemaining } from "../shared/sitrep-round-primitives.js";
import { resolveConfiguredSitrepRegion, sitrepTokensAreAdjacent, tokenInsideConfiguredSitrepRegion } from "../shared/sitrep-spatial-delegation.js";

export async function calculateExtractionState(combat, sitrep, spatialOperations) {
  const state = { valid: false, currentRound: currentSitrepRound(combat, sitrep), roundsRemaining: sitrepRoundsRemaining(combat, sitrep), objectiveName: "Missing Objective", objectiveDestroyed: false, objectiveExtracted: sitrep?.extractionStatus === "extracted", objectiveInExtraction: false, friendlyAdjacent: 0, hostileAdjacent: 0, friendlyInExtractionZone: 0, canExtractObjective: false };
  if (!combat || !sitrep || sitrep.type !== "extraction") return state;
  const extractionRegion = resolveConfiguredSitrepRegion(spatialOperations, combat, sitrep.extractionZoneRegionId);
  const objectiveCombatant = combatantById(combat, sitrep.extractionObjectiveCombatantId);
  const objectiveToken = objectiveCombatant?.token ?? null;
  state.valid = Boolean(extractionRegion && objectiveCombatant && objectiveToken);
  if (!state.valid) return state;
  state.objectiveName = objectiveCombatant.name || objectiveToken.name || "Objective";
  state.objectiveDestroyed = sitrep.extractionStatus === "destroyed" || combatantIsDefeated(objectiveCombatant);
  state.objectiveExtracted = sitrep.extractionStatus === "extracted";
  state.objectiveInExtraction = !state.objectiveDestroyed && !state.objectiveExtracted && tokenInsideConfiguredSitrepRegion(spatialOperations, objectiveToken, extractionRegion);
  for (const entry of collectStandingSitrepCombatants(combat)) {
    if (entry.token.id === objectiveToken.id) continue;
    if (entry.faction === SITREP_FACTIONS.FRIENDLY && tokenInsideConfiguredSitrepRegion(spatialOperations, entry.token, extractionRegion)) state.friendlyInExtractionZone += 1;
    if (!await sitrepTokensAreAdjacent(spatialOperations, entry.token, objectiveToken)) continue;
    if (entry.faction === SITREP_FACTIONS.FRIENDLY) state.friendlyAdjacent += 1;
    if (entry.faction === SITREP_FACTIONS.HOSTILE) state.hostileAdjacent += 1;
  }
  state.canExtractObjective = state.objectiveInExtraction && state.friendlyAdjacent > 0 && state.hostileAdjacent === 0 && !state.objectiveDestroyed && !state.objectiveExtracted;
  return state;
}
