/** Canonical SITREP setup validation and state construction. No UI or Foundry effects. */

import { FRAME_CONN_SITREP_DEFAULT_STATE, FRAME_CONN_SITREP_TYPES } from "../state/sitrep-state-contract.js";
import { normalizeSitrepState } from "../state/sitrep-state-normalization.js";

const DEFAULT_ROUND_LIMIT_BY_TYPE = Object.freeze({ control: 6, holdout: 6, extraction: 10, escort: 8, gauntlet: 8, recon: 8 });

export const DEFAULT_SITREP_OBJECTIVE_BY_TYPE = Object.freeze({
  gauntlet: "Secure the control zone by the end of the final round.",
  control: "Control more objective zones than the enemy and finish with the higher score.",
  holdout: "Defend the objective zone and finish the final round with at least 1 point remaining.",
  escort: "Bring the objective safely to the extraction zone before the final round ends.",
  extraction: "Retrieve the objective and safely extract it before the final round ends.",
  recon: "Identify the true control zone and control it at the end of the final round."
});

export function getDefaultSitrepObjective(type) {
  const normalizedType = stringValue(type, FRAME_CONN_SITREP_DEFAULT_STATE.type).toLowerCase();
  return DEFAULT_SITREP_OBJECTIVE_BY_TYPE[normalizedType] ?? "";
}

function stringValue(value, fallback = "") { const normalized = String(value ?? "").trim(); return normalized || fallback; }
function stringList(value) { if (!Array.isArray(value)) return []; return [...new Set(value.map(candidate => String(candidate ?? "").trim()).filter(Boolean))]; }

export class SitrepSetupValidationError extends Error {
  constructor(errors) { super(`Invalid SITREP setup: ${errors.join("; ")}`); this.name = "SitrepSetupValidationError"; this.errors = Object.freeze([...errors]); }
}

export function validateSitrepSetup(request = {}) {
  const type = stringValue(request.type, FRAME_CONN_SITREP_DEFAULT_STATE.type).toLowerCase();
  const errors = [];
  if (!FRAME_CONN_SITREP_TYPES.includes(type)) errors.push(`Unknown SITREP type: ${type}.`);
  const regionId = stringValue(request.regionId);
  const controlRegionIds = stringList(request.controlRegionIds);
  const reconRegionIds = stringList(request.reconRegionIds);
  const reconTrueRegionId = stringValue(request.reconTrueRegionId);
  const escortObjectiveCombatantId = stringValue(request.escortObjectiveCombatantId);
  const escortExtractionRegionId = stringValue(request.escortExtractionRegionId);
  const extractionObjectiveCombatantId = stringValue(request.extractionObjectiveCombatantId);
  const extractionZoneRegionId = stringValue(request.extractionZoneRegionId);
  if (type === "control" && controlRegionIds.length !== 4) errors.push("Control requires exactly four Scene Regions.");
  if (type === "recon") {
    if (reconRegionIds.length !== 4) errors.push("Recon requires exactly four Control Zone Regions.");
    if (!reconTrueRegionId) errors.push("Recon requires one True Control Zone.");
    else if (!reconRegionIds.includes(reconTrueRegionId)) errors.push("The Recon True Control Zone must be one of the four configured Recon Regions.");
  }
  if (type === "escort") { if (!escortObjectiveCombatantId) errors.push("Escort requires an Objective combatant."); if (!escortExtractionRegionId) errors.push("Escort requires an Extraction Zone Region."); }
  if (type === "extraction") { if (!extractionObjectiveCombatantId) errors.push("Extraction requires an Objective combatant."); if (!extractionZoneRegionId) errors.push("Extraction requires an Extraction Zone Region."); }
  if ((type === "gauntlet" || type === "holdout") && !regionId) errors.push(`${type} requires a control Region.`);
  const roundLimit = Number(request.roundLimit ?? DEFAULT_ROUND_LIMIT_BY_TYPE[type] ?? 8);
  if (!Number.isFinite(roundLimit) || roundLimit < 1) errors.push("Round limit must be at least 1.");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), type });
}

export function buildConfiguredSitrepState(request = {}, combat = null, existingState = null, { resetProgress = false } = {}) {
  const validation = validateSitrepSetup(request);
  if (!validation.valid) throw new SitrepSetupValidationError(validation.errors);
  const type = validation.type;
  const currentRound = Math.max(Number(combat?.round ?? existingState?.startRound ?? 1), 1);
  const roundLimit = Math.max(Number(request.roundLimit ?? existingState?.roundLimit ?? DEFAULT_ROUND_LIMIT_BY_TYPE[type] ?? 8), 1);
  const startRound = resetProgress ? currentRound : Math.max(Number(request.startRound ?? existingState?.startRound ?? currentRound), 1);
  const base = normalizeSitrepState(existingState ?? FRAME_CONN_SITREP_DEFAULT_STATE) ?? { ...FRAME_CONN_SITREP_DEFAULT_STATE };
  const configured = {
    ...base, type,
    title: stringValue(request.title, base.title), objective: stringValue(request.objective, getDefaultSitrepObjective(type)),
    regionId: stringValue(request.regionId, type === "gauntlet" || type === "holdout" ? base.regionId : ""),
    controlRegionIds: type === "control" ? stringList(request.controlRegionIds) : [],
    escortObjectiveCombatantId: type === "escort" ? stringValue(request.escortObjectiveCombatantId) : "",
    escortExtractionRegionId: type === "escort" ? stringValue(request.escortExtractionRegionId) : "",
    extractionObjectiveCombatantId: type === "extraction" ? stringValue(request.extractionObjectiveCombatantId) : "",
    extractionZoneRegionId: type === "extraction" ? stringValue(request.extractionZoneRegionId) : "",
    holdoutBaseScore: type === "holdout" ? Math.max(Number(request.holdoutBaseScore ?? base.holdoutBaseScore ?? 4), 0) : Number(base.holdoutBaseScore ?? 4),
    reconRegionIds: type === "recon" ? stringList(request.reconRegionIds) : [],
    reconTrueRegionId: type === "recon" ? stringValue(request.reconTrueRegionId) : "",
    startRound, roundLimit, finalRound: startRound + roundLimit - 1,
    rules: { finalZoneControl: request.rules?.finalZoneControl ?? base.rules?.finalZoneControl ?? true, enemyElimination: request.rules?.enemyElimination ?? base.rules?.enemyElimination ?? true, unassailableControl: request.rules?.unassailableControl ?? base.rules?.unassailableControl ?? true }
  };
  if (resetProgress) Object.assign(configured, { scores: { friendly: 0, hostile: 0 }, scoredRounds: [], escortStatus: "active", extractionStatus: "active", reconScannedRegionIds: [], active: true, status: "active", resultReason: "" });
  return normalizeSitrepState(configured);
}
