/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/lancer-sitrep-tracker.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */



export const DEFAULTS = {
  type: "gauntlet",
  title: "OPERATION: GRAYSPACE",
  objective:
    "Have more allied units than hostile units in the control zone at the end of the final round.",
  regionId: "",
  controlRegionIds: [],
  escortObjectiveCombatantId: "",
  escortExtractionRegionId: "",
  escortStatus: "active",
  extractionObjectiveCombatantId: "",
  extractionZoneRegionId: "",
  extractionStatus: "active",
  holdoutBaseScore: 4,
  reconRegionIds: [],
  reconTrueRegionId: "",
  reconScannedRegionIds: [],
  scores: {
    friendly: 0,
    hostile: 0
  },
  scoredRounds: [],
  startRound: 1,
  roundLimit: 8,
  finalRound: 8,
  active: true,
  status: "active",
  resultReason: "",
  rules: {
    finalZoneControl: true,
    enemyElimination: true,
    unassailableControl: true
  }
};

export const SITREP_TYPES = [
  { value: "control", label: "Control" },
  { value: "escort", label: "Escort" },
  { value: "extraction", label: "Extraction" },
  { value: "gauntlet", label: "Gauntlet" },
  { value: "holdout", label: "Holdout" },
  { value: "recon", label: "Recon" }
];
