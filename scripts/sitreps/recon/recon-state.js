/** Canonical Recon battlefield-state derivation. GM-secret truth remains domain state until presentation filtering. */

import { collectStandingSitrepCombatants, SITREP_FACTIONS } from "../shared/sitrep-combatant-primitives.js";
import { controllerFromCounts } from "../shared/sitrep-control-primitives.js";
import { currentSitrepRound, sitrepRoundsRemaining } from "../shared/sitrep-round-primitives.js";
import { resolveConfiguredSitrepRegions, tokenInsideConfiguredSitrepRegion } from "../shared/sitrep-spatial-delegation.js";

export function calculateReconState(combat, sitrep, spatialOperations) {
  const state = { valid: false, currentRound: currentSitrepRound(combat, sitrep), roundsRemaining: sitrepRoundsRemaining(combat, sitrep), reconZones: [], reconTrueRegionId: sitrep?.reconTrueRegionId ?? "", reconTrueZoneController: "none", reconTrueZoneScanned: false };
  if (!combat || !sitrep || sitrep.type !== "recon") return state;
  const regionIds = Array.isArray(sitrep.reconRegionIds) ? sitrep.reconRegionIds : [];
  const regions = resolveConfiguredSitrepRegions(spatialOperations, combat, regionIds);
  const trueRegionId = String(sitrep.reconTrueRegionId ?? "");
  const scannedRegionIds = Array.isArray(sitrep.reconScannedRegionIds) ? sitrep.reconScannedRegionIds : [];
  state.valid = regions.length === 4 && regions.some(region => region.id === trueRegionId);
  if (!state.valid) return state;
  const standing = collectStandingSitrepCombatants(combat);
  state.reconZones = regions.map((region, index) => {
    let friendly = 0;
    let hostile = 0;
    for (const entry of standing) {
      if (!tokenInsideConfiguredSitrepRegion(spatialOperations, entry.token, region)) continue;
      if (entry.faction === SITREP_FACTIONS.FRIENDLY) friendly += 1;
      if (entry.faction === SITREP_FACTIONS.HOSTILE) hostile += 1;
    }
    const controller = controllerFromCounts(friendly, hostile);
    const isTrueZone = region.id === trueRegionId;
    const scanned = scannedRegionIds.includes(region.id);
    if (isTrueZone) { state.reconTrueZoneController = controller; state.reconTrueZoneScanned = scanned; }
    return { id: region.id, name: region.name || `Objective ${String.fromCharCode(65 + index)}`, friendly, hostile, controller, scanned, isTrueZone };
  });
  return state;
}
