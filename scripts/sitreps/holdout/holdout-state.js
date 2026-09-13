/** Canonical Holdout battlefield-state derivation. */

import { collectStandingSitrepCombatants, SITREP_FACTIONS } from "../shared/sitrep-combatant-primitives.js";
import { controllerFromCounts } from "../shared/sitrep-control-primitives.js";
import { currentSitrepRound, sitrepRoundsRemaining } from "../shared/sitrep-round-primitives.js";
import { resolveConfiguredSitrepRegion, tokenInsideConfiguredSitrepRegion } from "../shared/sitrep-spatial-delegation.js";

export function calculateHoldoutState(combat, sitrep, spatialOperations) {
  const state = { valid: false, currentRound: currentSitrepRound(combat, sitrep), roundsRemaining: sitrepRoundsRemaining(combat, sitrep), friendlyStanding: 0, hostileStanding: 0, friendlyInZone: 0, hostileInZone: 0, controller: "none", regionName: "Missing Region", holdoutBaseScore: Number(sitrep?.holdoutBaseScore ?? 4), holdoutScore: Number(sitrep?.holdoutBaseScore ?? 4) };
  if (!combat || !sitrep || sitrep.type !== "holdout") return state;
  const standing = collectStandingSitrepCombatants(combat);
  for (const entry of standing) {
    if (entry.faction === SITREP_FACTIONS.FRIENDLY) state.friendlyStanding += 1;
    if (entry.faction === SITREP_FACTIONS.HOSTILE) state.hostileStanding += 1;
  }
  const region = resolveConfiguredSitrepRegion(spatialOperations, combat, sitrep.regionId);
  if (!region) return state;
  state.valid = true;
  state.regionName = region.name || "Control Zone";
  for (const entry of standing) {
    if (!tokenInsideConfiguredSitrepRegion(spatialOperations, entry.token, region)) continue;
    if (entry.faction === SITREP_FACTIONS.FRIENDLY) state.friendlyInZone += 1;
    if (entry.faction === SITREP_FACTIONS.HOSTILE) state.hostileInZone += 1;
  }
  state.controller = controllerFromCounts(state.friendlyInZone, state.hostileInZone);
  state.holdoutScore = state.holdoutBaseScore - state.hostileInZone;
  return state;
}
