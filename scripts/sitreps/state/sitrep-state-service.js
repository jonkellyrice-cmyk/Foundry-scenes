/**
 * scripts/dm_features/sitreps/state/sitrep-state-service.js
 *
 * Single canonical Foundry persistence boundary for SITREP state.
 *
 * Read precedence:
 *   1. canonical Frame Conn flag when present;
 *   2. legacy lancer-sitrep-tracker.sitrep only when no canonical flag exists.
 *
 * Canonical clear writes an envelope with state:null. This intentionally suppresses
 * legacy fallback so stale legacy data cannot resurrect after a SITREP is ended.
 */

import {
  FRAME_CONN_SITREP_FLAG_KEY,
  FRAME_CONN_SITREP_FLAG_NAMESPACE,
  LEGACY_SITREP_FLAG_KEY,
  LEGACY_SITREP_FLAG_NAMESPACE
} from "./sitrep-state-contract.js";
import {
  createCanonicalSitrepEnvelope,
  mergeSitrepState,
  normalizeCanonicalSitrepEnvelope,
  normalizeSitrepState
} from "./sitrep-state-normalization.js";

export function resolveSitrepCombat(combat = null) {
  if (combat) return combat;
  return globalThis.game?.combat ?? globalThis.game?.combats?.active ?? null;
}

function readFlag(combat, namespace, key, { optional = false } = {}) {
  if (!combat?.getFlag) return undefined;

  try {
    return combat.getFlag(namespace, key);
  } catch (error) {
    if (optional) {
      return undefined;
    }

    throw error;
  }
}

export function readSitrepStateRecord(combat = null) {
  const resolvedCombat = resolveSitrepCombat(combat);
  if (!resolvedCombat) {
    return { combat: null, source: "none", state: null, canonicalPresent: false };
  }

  const canonicalRaw = readFlag(
    resolvedCombat,
    FRAME_CONN_SITREP_FLAG_NAMESPACE,
    FRAME_CONN_SITREP_FLAG_KEY
  );

  if (canonicalRaw !== undefined && canonicalRaw !== null) {
    const envelope = normalizeCanonicalSitrepEnvelope(canonicalRaw);
    return {
      combat: resolvedCombat,
      source: "canonical",
      state: envelope?.state ?? null,
      canonicalPresent: true
    };
  }

  const legacyRaw = readFlag(
    resolvedCombat,
    LEGACY_SITREP_FLAG_NAMESPACE,
    LEGACY_SITREP_FLAG_KEY,
    { optional: true }
  );

  if (legacyRaw !== undefined && legacyRaw !== null) {
    return {
      combat: resolvedCombat,
      source: "legacy",
      state: normalizeSitrepState(legacyRaw),
      canonicalPresent: false
    };
  }

  return {
    combat: resolvedCombat,
    source: "none",
    state: null,
    canonicalPresent: false
  };
}

export function readSitrepState(combat = null) {
  return readSitrepStateRecord(combat).state;
}

export async function writeSitrepState(state, combat = null) {
  const resolvedCombat = resolveSitrepCombat(combat);
  if (!resolvedCombat?.setFlag) {
    throw new Error("Cannot write SITREP state without an active Combat document.");
  }

  const envelope = createCanonicalSitrepEnvelope(state);
  await resolvedCombat.setFlag(
    FRAME_CONN_SITREP_FLAG_NAMESPACE,
    FRAME_CONN_SITREP_FLAG_KEY,
    envelope
  );
  return envelope.state;
}

export async function updateSitrepState(update, combat = null) {
  const record = readSitrepStateRecord(combat);
  if (!record.combat) {
    throw new Error("Cannot update SITREP state without an active Combat document.");
  }
  if (!record.state) {
    throw new Error("Cannot update SITREP state because no active SITREP state exists.");
  }

  const nextState = typeof update === "function"
    ? normalizeSitrepState(await update(record.state))
    : mergeSitrepState(record.state, update);

  if (!nextState) {
    throw new Error("SITREP state update did not produce a valid state object.");
  }

  return writeSitrepState(nextState, record.combat);
}

export async function clearSitrepState(combat = null) {
  const resolvedCombat = resolveSitrepCombat(combat);
  if (!resolvedCombat?.setFlag) {
    throw new Error("Cannot clear SITREP state without an active Combat document.");
  }

  await resolvedCombat.setFlag(
    FRAME_CONN_SITREP_FLAG_NAMESPACE,
    FRAME_CONN_SITREP_FLAG_KEY,
    createCanonicalSitrepEnvelope(null)
  );
  return null;
}

export async function migrateLegacySitrepState(combat = null) {
  const record = readSitrepStateRecord(combat);
  if (!record.combat || record.source !== "legacy" || !record.state) {
    return record;
  }

  const state = await writeSitrepState(record.state, record.combat);
  return {
    combat: record.combat,
    source: "canonical",
    state,
    canonicalPresent: true,
    migratedFromLegacy: true
  };
}
