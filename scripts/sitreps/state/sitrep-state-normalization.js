/**
 * scripts/dm_features/sitreps/state/sitrep-state-normalization.js
 *
 * Pure normalization helpers for canonical and legacy SITREP persisted state.
 * No Foundry globals, hooks, documents, or presentation behavior belong here.
 */

import {
  FRAME_CONN_SITREP_DEFAULT_STATE,
  FRAME_CONN_SITREP_SCHEMA_VERSION,
  FRAME_CONN_SITREP_TYPES
} from "./sitrep-state-contract.js";

function cloneArray(value) {
  return Array.isArray(value) ? value.map(entry => entry) : [];
}

function finiteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function positiveInteger(value, fallback) {
  return Math.max(Math.trunc(finiteNumber(value, fallback)), 1);
}

function stringValue(value, fallback = "") {
  return value == null ? fallback : String(value);
}

export function normalizeSitrepState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const defaults = FRAME_CONN_SITREP_DEFAULT_STATE;
  const requestedType = stringValue(value.type, defaults.type);
  const type = FRAME_CONN_SITREP_TYPES.includes(requestedType)
    ? requestedType
    : defaults.type;

  const startRound = positiveInteger(value.startRound, defaults.startRound);
  const roundLimit = positiveInteger(value.roundLimit, defaults.roundLimit);
  const finalRound = Math.max(
    positiveInteger(value.finalRound, startRound + roundLimit - 1),
    startRound
  );

  return {
    ...value,
    type,
    title: stringValue(value.title, defaults.title),
    objective: stringValue(value.objective, defaults.objective),
    regionId: stringValue(value.regionId),
    controlRegionIds: cloneArray(value.controlRegionIds).map(String),
    escortObjectiveCombatantId: stringValue(value.escortObjectiveCombatantId),
    escortExtractionRegionId: stringValue(value.escortExtractionRegionId),
    escortStatus: stringValue(value.escortStatus, defaults.escortStatus),
    extractionObjectiveCombatantId: stringValue(value.extractionObjectiveCombatantId),
    extractionZoneRegionId: stringValue(value.extractionZoneRegionId),
    extractionStatus: stringValue(value.extractionStatus, defaults.extractionStatus),
    holdoutBaseScore: finiteNumber(value.holdoutBaseScore, defaults.holdoutBaseScore),
    reconRegionIds: cloneArray(value.reconRegionIds).map(String),
    reconTrueRegionId: stringValue(value.reconTrueRegionId),
    reconScannedRegionIds: cloneArray(value.reconScannedRegionIds).map(String),
    scores: {
      friendly: finiteNumber(value.scores?.friendly, defaults.scores.friendly),
      hostile: finiteNumber(value.scores?.hostile, defaults.scores.hostile)
    },
    scoredRounds: cloneArray(value.scoredRounds)
      .map(entry => Number(entry))
      .filter(Number.isFinite),
    startRound,
    roundLimit,
    finalRound,
    active: value.active !== false,
    status: stringValue(value.status, defaults.status),
    resultReason: stringValue(value.resultReason),
    rules: {
      finalZoneControl: value.rules?.finalZoneControl ?? defaults.rules.finalZoneControl,
      enemyElimination: value.rules?.enemyElimination ?? defaults.rules.enemyElimination,
      unassailableControl: value.rules?.unassailableControl ?? defaults.rules.unassailableControl
    }
  };
}

export function mergeSitrepState(currentState, patch) {
  const current = normalizeSitrepState(currentState) ?? normalizeSitrepState({});
  const nextPatch = patch && typeof patch === "object" && !Array.isArray(patch)
    ? patch
    : {};

  return normalizeSitrepState({
    ...current,
    ...nextPatch,
    scores: {
      ...current.scores,
      ...(nextPatch.scores ?? {})
    },
    rules: {
      ...current.rules,
      ...(nextPatch.rules ?? {})
    }
  });
}

export function createCanonicalSitrepEnvelope(state) {
  return {
    schemaVersion: FRAME_CONN_SITREP_SCHEMA_VERSION,
    state: state == null ? null : normalizeSitrepState(state)
  };
}

export function normalizeCanonicalSitrepEnvelope(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  if (Object.prototype.hasOwnProperty.call(value, "state")) {
    return {
      schemaVersion: finiteNumber(value.schemaVersion, FRAME_CONN_SITREP_SCHEMA_VERSION),
      state: value.state == null ? null : normalizeSitrepState(value.state)
    };
  }

  // Compatibility with any early canonical flat object written before the envelope contract.
  return createCanonicalSitrepEnvelope(value);
}
