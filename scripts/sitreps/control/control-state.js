/** Canonical Control battlefield-state derivation. */

import { collectStandingSitrepCombatants, SITREP_FACTIONS } from "../shared/sitrep-combatant-primitives.js";
import { controllerFromCounts } from "../shared/sitrep-control-primitives.js";
import { currentSitrepRound, sitrepRoundsRemaining } from "../shared/sitrep-round-primitives.js";
import { resolveConfiguredSitrepRegions, tokenInsideConfiguredSitrepRegion } from "../shared/sitrep-spatial-delegation.js";

export function calculateControlState(combat, sitrep, spatialOperations) {
  const state = { valid: false, currentRound: currentSitrepRound(combat, sitrep), roundsRemaining: sitrepRoundsRemaining(combat, sitrep), controlZones: [], friendlyZones: 0, hostileZones: 0, controller: "none", friendlyScore: Number(sitrep?.scores?.friendly ?? 0), hostileScore: Number(sitrep?.scores?.hostile ?? 0) };
  if (!combat || !sitrep || sitrep.type !== "control") return state;
  const regions = resolveConfiguredSitrepRegions(spatialOperations, combat, sitrep.controlRegionIds);
  state.valid = regions.length === 4;
  if (!state.valid) return state;
  const standing = collectStandingSitrepCombatants(combat);
  state.controlZones = regions.map((region, index) => {
    let friendly = 0;
    let hostile = 0;
    for (const entry of standing) {
      if (!tokenInsideConfiguredSitrepRegion(spatialOperations, entry.token, region)) continue;
      if (entry.faction === SITREP_FACTIONS.FRIENDLY) friendly += 1;
      if (entry.faction === SITREP_FACTIONS.HOSTILE) hostile += 1;
    }
    const controller = controllerFromCounts(friendly, hostile);
    if (controller === "friendly") state.friendlyZones += 1;
    if (controller === "hostile") state.hostileZones += 1;
    return { id: region.id, name: region.name || `Objective ${String.fromCharCode(65 + index)}`, friendly, hostile, controller };
  });
  state.controller = controllerFromCounts(state.friendlyZones, state.hostileZones);
  return state;
}
