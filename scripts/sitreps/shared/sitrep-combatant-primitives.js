/**
 * Canonical shared SITREP combatant semantics.
 * Presentation-free and hook-free. Generic Foundry spatial behavior does not belong here.
 */

export const SITREP_FACTIONS = Object.freeze({
  FRIENDLY: "friendly",
  HOSTILE: "hostile",
  NEUTRAL: "neutral"
});

export function tokenDisposition(tokenDocument) {
  return Number(tokenDocument?.disposition ?? 0);
}

export function factionOf(tokenDocument, dispositionConstants = globalThis.CONST?.TOKEN_DISPOSITIONS) {
  const disposition = tokenDisposition(tokenDocument);
  const friendly = Number(dispositionConstants?.FRIENDLY ?? 1);
  const hostile = Number(dispositionConstants?.HOSTILE ?? -1);
  if (disposition === friendly) return SITREP_FACTIONS.FRIENDLY;
  if (disposition === hostile) return SITREP_FACTIONS.HOSTILE;
  return SITREP_FACTIONS.NEUTRAL;
}

export function combatantIsDefeated(combatant, defeatedStatusId = globalThis.CONFIG?.specialStatusEffects?.DEFEATED) {
  if (typeof combatant?.isDefeated === "boolean") return combatant.isDefeated;
  if (combatant?.defeated === true) return true;
  return Boolean(defeatedStatusId && combatant?.actor?.statuses?.has?.(defeatedStatusId));
}

export function combatantById(combat, combatantId) {
  return combat?.combatants?.get?.(combatantId) ?? null;
}

export function collectStandingSitrepCombatants(combat, { controlWeightForActor = () => 1 } = {}) {
  const standing = [];
  for (const combatant of combat?.combatants ?? []) {
    if (combatantIsDefeated(combatant)) continue;
    const token = combatant?.token ?? null;
    if (!token) continue;
    const faction = factionOf(token);
    if (faction === SITREP_FACTIONS.NEUTRAL) continue;
    const actor = token.actor ?? combatant.actor ?? null;
    const controlWeight = Number(controlWeightForActor(actor));
    standing.push(Object.freeze({ combatant, token, actor, faction, controlWeight: Number.isFinite(controlWeight) ? controlWeight : 1 }));
  }
  return standing;
}
