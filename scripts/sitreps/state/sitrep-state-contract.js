/**
 * scripts/dm_features/sitreps/state/sitrep-state-contract.js
 *
 * Canonical persisted-state contract for Frame Conn SITREPs.
 * This module owns identifiers and shape defaults only; it performs no Foundry I/O.
 */

export const FRAME_CONN_SITREP_FLAG_NAMESPACE = "lancer-frame-conn";
export const FRAME_CONN_SITREP_FLAG_KEY = "sitrep";

export const LEGACY_SITREP_FLAG_NAMESPACE = "lancer-sitrep-tracker";
export const LEGACY_SITREP_FLAG_KEY = "sitrep";

export const FRAME_CONN_SITREP_SCHEMA_VERSION = 1;

export const FRAME_CONN_SITREP_TYPES = Object.freeze([
  "control",
  "escort",
  "extraction",
  "gauntlet",
  "holdout",
  "recon"
]);

export const FRAME_CONN_SITREP_DEFAULT_STATE = Object.freeze({
  type: "gauntlet",
  title: "OPERATION: GRAYSPACE",
  objective: "Have more allied units than hostile units in the control zone at the end of the final round.",
  regionId: "",
  controlRegionIds: Object.freeze([]),
  escortObjectiveCombatantId: "",
  escortExtractionRegionId: "",
  escortStatus: "active",
  extractionObjectiveCombatantId: "",
  extractionZoneRegionId: "",
  extractionStatus: "active",
  holdoutBaseScore: 4,
  reconRegionIds: Object.freeze([]),
  reconTrueRegionId: "",
  reconScannedRegionIds: Object.freeze([]),
  scores: Object.freeze({ friendly: 0, hostile: 0 }),
  scoredRounds: Object.freeze([]),
  startRound: 1,
  roundLimit: 8,
  finalRound: 8,
  active: true,
  status: "active",
  resultReason: "",
  rules: Object.freeze({
    finalZoneControl: true,
    enemyElimination: true,
    unassailableControl: true
  })
});
