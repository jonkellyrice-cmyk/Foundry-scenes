/** Canonical Gauntlet control-weight semantics. */

export const GAUNTLET_NPC_TEMPLATE_WEIGHTS = Object.freeze({ npct_grunt: 0.25, npct_elite: 2, npct_ultra: 4 });

export function gauntletControlWeight(actor) {
  if (!actor || actor.type !== "npc") return 1;
  const templates = [...(actor.items ?? [])].filter(item => item?.type === "npc_template");
  const templateLids = new Set(templates.map(item => String(item?.system?.lid ?? "").trim().toLowerCase()));
  if (templateLids.has("npct_ultra")) return GAUNTLET_NPC_TEMPLATE_WEIGHTS.npct_ultra;
  if (templateLids.has("npct_elite")) return GAUNTLET_NPC_TEMPLATE_WEIGHTS.npct_elite;
  if (templateLids.has("npct_grunt")) return GAUNTLET_NPC_TEMPLATE_WEIGHTS.npct_grunt;
  const templateNames = new Set(templates.map(item => String(item?.name ?? "").trim().toLowerCase()));
  if (templateNames.has("ultra")) return GAUNTLET_NPC_TEMPLATE_WEIGHTS.npct_ultra;
  if (templateNames.has("elite")) return GAUNTLET_NPC_TEMPLATE_WEIGHTS.npct_elite;
  if (templateNames.has("grunt")) return GAUNTLET_NPC_TEMPLATE_WEIGHTS.npct_grunt;
  return 1;
}
