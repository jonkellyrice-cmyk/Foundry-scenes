/** Canonical Gauntlet battlefield-state derivation. Presentation-free and hook-free. */

import { collectStandingSitrepCombatants, SITREP_FACTIONS } from "../shared/sitrep-combatant-primitives.js";
import { controllerFromCounts } from "../shared/sitrep-control-primitives.js";
import { currentSitrepRound, sitrepRoundsRemaining } from "../shared/sitrep-round-primitives.js";
import { resolveConfiguredSitrepRegion, tokenInsideConfiguredSitrepRegion } from "../shared/sitrep-spatial-delegation.js";
import { gauntletControlWeight } from "./gauntlet-control-weight.js";

export function createEmptyGauntletState(combat, sitrep) {
  return { valid: false, currentRound: currentSitrepRound(combat, sitrep), roundsRemaining: sitrepRoundsRemaining(combat, sitrep), friendlyStanding: 0, hostileStanding: 0, friendlyInZone: 0, hostileInZone: 0, controller: "none", regionName: "Missing Region", immediateVictory: false, immediateReason: "" };
}

export function calculateGauntletState(combat, sitrep, spatialOperations) {
  const state = createEmptyGauntletState(combat, sitrep);
  if (!combat || !sitrep || sitrep.type !== "gauntlet") return state;
  const standingCombatants = collectStandingSitrepCombatants(combat, { controlWeightForActor: gauntletControlWeight });
  for (const entry of standingCombatants) {
    if (entry.faction === SITREP_FACTIONS.FRIENDLY) state.friendlyStanding += entry.controlWeight;
    if (entry.faction === SITREP_FACTIONS.HOSTILE) state.hostileStanding += entry.controlWeight;
  }
  const region = resolveConfiguredSitrepRegion(spatialOperations, combat, sitrep.regionId);
  if (!region) return state;
  state.valid = true;
  state.regionName = region.name || "Control Zone";
  for (const entry of standingCombatants) {
    if (!tokenInsideConfiguredSitrepRegion(spatialOperations, entry.token, region)) continue;
    if (entry.faction === SITREP_FACTIONS.FRIENDLY) state.friendlyInZone += entry.controlWeight;
    if (entry.faction === SITREP_FACTIONS.HOSTILE) state.hostileInZone += entry.controlWeight;
  }
  state.controller = controllerFromCounts(state.friendlyInZone, state.hostileInZone);
  if (sitrep.rules?.enemyElimination && state.hostileStanding === 0 && state.friendlyStanding > 0) {
    state.immediateVictory = true;
    state.immediateReason = "All hostile units have been defeated.";
  } else if (sitrep.rules?.unassailableControl && state.friendlyInZone > 0 && state.friendlyInZone > state.hostileStanding) {
    state.immediateVictory = true;
    state.immediateReason = "The allies already in the zone outnumber every surviving hostile unit.";
  }
  return state;
}
