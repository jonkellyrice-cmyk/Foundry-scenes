import { MODULE_ID } from "./live-scene-feed.mjs";
import { completedBattlefieldDynamicsMovementCost } from "./battlefield-dynamics-movement-cost.mjs";

export const BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_FLAG = "battlefieldDynamicsMovementLedger";
export const BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_VERSION = 1;
const MAX_RECENT_MOVEMENTS = 256;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = value => Number.isFinite(value) && value >= 0;

export function readBattlefieldDynamicsMovementLedger(scene) {
  const value = scene?.getFlag?.(MODULE_ID, BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_FLAG)
    ?? scene?.flags?.[MODULE_ID]?.[BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_FLAG];
  if (value == null) return { version: BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_VERSION, sceneId: scene.id, tokens: {} };
  if (value.version !== BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_VERSION || value.sceneId !== scene?.id || !record(value.tokens)) {
    throw new Error("Movement ledger has an unsupported or invalid Scene envelope.");
  }
  for (const entry of Object.values(value.tokens)) {
    if (!record(entry) || !finite(entry.spent) || !Array.isArray(entry.recentMovementIds)
      || entry.recentMovementIds.length > MAX_RECENT_MOVEMENTS
      || entry.recentMovementIds.some(id => typeof id !== "string" || !id)) {
      throw new Error("Movement ledger contains an invalid token record.");
    }
  }
  return structuredClone(value);
}

export function applyBattlefieldDynamicsMovement(ledger, tokenId, movement) {
  const cost = completedBattlefieldDynamicsMovementCost(movement);
  if (typeof tokenId !== "string" || !tokenId || cost === null) return { changed: false, reason: "unmeasured-movement", ledger };
  const current = ledger.tokens[tokenId] ?? { spent: 0, recentMovementIds: [] };
  if (current.recentMovementIds.includes(movement.id)) return { changed: false, reason: "duplicate", ledger };
  const spent = current.spent + cost;
  if (!finite(spent)) throw new Error("Movement spent total overflowed.");
  const next = structuredClone(ledger);
  next.tokens[tokenId] = { spent, recentMovementIds: [...current.recentMovementIds, movement.id].slice(-MAX_RECENT_MOVEMENTS) };
  return { changed: true, reason: "recorded", ledger: next, cost };
}

export function adjustBattlefieldDynamicsMovement(ledger, tokenId, spent) {
  if (typeof tokenId !== "string" || !tokenId || !finite(spent)) throw new Error("GM adjustment requires a token ID and finite nonnegative spent cost.");
  const next = structuredClone(ledger);
  const current = next.tokens[tokenId] ?? { spent: 0, recentMovementIds: [] };
  next.tokens[tokenId] = { ...current, spent };
  return next;
}
