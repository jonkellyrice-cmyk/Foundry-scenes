/** Canonical shared SITREP control-count semantics. */

export const SITREP_CONTROLLERS = Object.freeze({
  FRIENDLY: "friendly",
  HOSTILE: "hostile",
  CONTESTED: "contested",
  NONE: "none"
});

export function controllerFromCounts(friendly, hostile) {
  const friendlyCount = Number(friendly ?? 0);
  const hostileCount = Number(hostile ?? 0);
  if (friendlyCount > hostileCount) return SITREP_CONTROLLERS.FRIENDLY;
  if (hostileCount > friendlyCount) return SITREP_CONTROLLERS.HOSTILE;
  return SITREP_CONTROLLERS.CONTESTED;
}
