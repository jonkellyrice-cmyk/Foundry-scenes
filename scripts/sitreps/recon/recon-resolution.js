/** Canonical Recon scan and final-result transitions. No direct UI/chat ownership. */

import { readSitrepState, updateSitrepState } from "../state/sitrep-state-service.js";
import { resolveConfiguredSitrepRegion } from "../shared/sitrep-spatial-delegation.js";
import { calculateReconState } from "./recon-state.js";

export async function recordReconScan(combat, regionId, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "recon" || !regionId) return Object.freeze({ changed: false, state: sitrep, outputIntent: null, rejection: "invalid-request" });
  const validRegionIds = Array.isArray(sitrep.reconRegionIds) ? sitrep.reconRegionIds : [];
  if (!validRegionIds.includes(regionId)) return Object.freeze({ changed: false, state: sitrep, outputIntent: null, rejection: "region-not-configured" });
  const scannedRegionIds = Array.isArray(sitrep.reconScannedRegionIds) ? [...sitrep.reconScannedRegionIds] : [];
  if (scannedRegionIds.includes(regionId)) return Object.freeze({ changed: false, state: sitrep, outputIntent: null, rejection: "already-scanned" });
  scannedRegionIds.push(regionId);
  const nextState = await updateSitrepState({ reconScannedRegionIds: scannedRegionIds }, combat);
  const region = resolveConfiguredSitrepRegion(spatialOperations, combat, regionId);
  const isTrueZone = regionId === sitrep.reconTrueRegionId;
  return Object.freeze({ changed: true, state: nextState, outputIntent: Object.freeze({ kind: "sitrep-recon-scan", sitrepType: "recon", regionId, regionName: region?.name || "Control Zone", isTrueZone, scanResult: isTrueZone ? "true-control-zone" : "false-control-zone" }), rejection: null });
}

export async function resolveReconEncounterUpdate(combat, changes = {}, spatialOperations) {
  const sitrep = readSitrepState(combat);
  if (!combat || !sitrep || sitrep.type !== "recon" || !sitrep.active || sitrep.status !== "active") return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  if (!Object.prototype.hasOwnProperty.call(changes ?? {}, "round") || Number(changes.round) <= Number(sitrep.finalRound)) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const state = calculateReconState(combat, sitrep, spatialOperations);
  if (!state.valid) return Object.freeze({ changed: false, state: sitrep, outputIntent: null });
  const trueZone = state.reconZones.find(zone => zone.isTrueZone);
  const alliesControlTrueZone = trueZone?.controller === "friendly" && Number(trueZone?.friendly ?? 0) > 0 && Number(trueZone?.hostile ?? 0) === 0;
  const status = alliesControlTrueZone ? "victory" : "defeat";
  const trueZoneStatus = trueZone?.controller ?? "unresolved";
  const reason = alliesControlTrueZone
    ? `The allies controlled the True Control Zone at the end of round ${sitrep.finalRound}.`
    : `The allies did not control the True Control Zone at the end of round ${sitrep.finalRound}. Its final status was ${trueZoneStatus}.`;
  const nextState = await updateSitrepState({ status, resultReason: reason }, combat);
  return Object.freeze({ changed: true, state: nextState, derivedState: state, outputIntent: Object.freeze({ kind: "sitrep-result", sitrepType: "recon", status, reason }) });
}
