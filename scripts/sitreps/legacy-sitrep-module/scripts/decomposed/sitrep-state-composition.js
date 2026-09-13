/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/lancer-sitrep-tracker.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  MODULE_ID,
  FLAG_KEY,
  activeCombat,
  getSitrep,
  isPrimaryGM,
  factionOf,
  combatantIsDefeated,
  regionFor,
  controlRegionsFor,
  controllerFromCounts,
  combatantById,
  tokensAreAdjacent,
  tokenInsideRegion
} from "../sitrep-kernel.js";
import {
  gauntletControlWeight
} from "./gauntlet-control-weight.js";

export function calculateState(
  combat = activeCombat(),
  sitrep = getSitrep(combat)
) {
  const empty = {
    valid: false,
    currentRound: Number(combat?.round ?? 0),
    roundsRemaining: 0,
    friendlyStanding: 0,
    hostileStanding: 0,
    friendlyInZone: 0,
    hostileInZone: 0,
    controller: "none",
    regionName: "Missing Region",
    immediateVictory: false,
    immediateReason: "",
    controlZones: [],
    friendlyZones: 0,
    hostileZones: 0,
    friendlyScore: Number(sitrep?.scores?.friendly ?? 0),
    hostileScore: Number(sitrep?.scores?.hostile ?? 0),
    objectiveName: "Missing Objective",
    objectiveDestroyed: false,
    objectiveExtracted:
      sitrep?.escortStatus === "extracted" ||
      sitrep?.extractionStatus === "extracted",
    objectiveInExtraction: false,
    friendlyAdjacent: 0,
    hostileAdjacent: 0,
    friendlyInExtractionZone: 0,
    canExtractObjective: false,
    holdoutBaseScore: Number(sitrep?.holdoutBaseScore ?? 4),
    holdoutScore: Number(sitrep?.holdoutBaseScore ?? 4),
    reconZones: [],
    reconTrueRegionId: sitrep?.reconTrueRegionId ?? "",
    reconTrueZoneController: "none",
    reconTrueZoneScanned: false
  };

  if (!combat || !sitrep) return empty;

  const currentRound = Math.max(
    Number(combat.round ?? sitrep.startRound ?? 1),
    1
  );

  const state = {
    ...empty,
    currentRound,
    roundsRemaining: Math.max(
      Number(sitrep.finalRound) - currentRound + 1,
      0
    )
  };

  const standingCombatants = [];

  for (const combatant of combat.combatants ?? []) {
    if (combatantIsDefeated(combatant)) continue;

    const token = combatant.token;
    if (!token) continue;

    const faction = factionOf(token);
    if (faction === "neutral") continue;

    const controlWeight =
      sitrep.type === "gauntlet"
        ? gauntletControlWeight(
            token.actor ?? combatant.actor
          )
        : 1;

    standingCombatants.push({
      token,
      faction,
      controlWeight
    });

    if (faction === "friendly") {
      state.friendlyStanding += controlWeight;
    } else {
      state.hostileStanding += controlWeight;
    }
  }

  if (sitrep.type === "control") {
    const regions = controlRegionsFor(combat, sitrep);
    state.valid = regions.length === 4;

    state.controlZones = regions.map((region, index) => {
      let friendly = 0;
      let hostile = 0;

      for (const entry of standingCombatants) {
        if (!tokenInsideRegion(entry.token, region)) continue;

        if (entry.faction === "friendly") friendly += 1;
        if (entry.faction === "hostile") hostile += 1;
      }

      const controller = controllerFromCounts(friendly, hostile);

      if (controller === "friendly") state.friendlyZones += 1;
      if (controller === "hostile") state.hostileZones += 1;

      return {
        id: region.id,
        name: region.name || `Objective ${String.fromCharCode(65 + index)}`,
        friendly,
        hostile,
        controller
      };
    });

    state.controller = controllerFromCounts(
      state.friendlyZones,
      state.hostileZones
    );

    return state;
  }

  if (sitrep.type === "recon") {
    const scene = combat?.scene ?? canvas.scene;

    const regionIds = Array.isArray(sitrep.reconRegionIds)
      ? sitrep.reconRegionIds
      : [];

    const regions = regionIds
      .map(regionId => scene?.regions?.get(regionId) ?? null)
      .filter(Boolean);

    const trueRegionId = String(
      sitrep.reconTrueRegionId ?? ""
    );

    const scannedRegionIds = Array.isArray(
      sitrep.reconScannedRegionIds
    )
      ? sitrep.reconScannedRegionIds
      : [];

    state.valid =
      regions.length === 4 &&
      regions.some(region => region.id === trueRegionId);

    if (!state.valid) return state;

    state.reconZones = regions.map((region, index) => {
      let friendly = 0;
      let hostile = 0;

      for (const entry of standingCombatants) {
        if (!tokenInsideRegion(entry.token, region)) continue;

        if (entry.faction === "friendly") {
          friendly += 1;
        } else if (entry.faction === "hostile") {
          hostile += 1;
        }
      }

      const controller = controllerFromCounts(
        friendly,
        hostile
      );

      const isTrueZone = region.id === trueRegionId;
      const scanned = scannedRegionIds.includes(region.id);

      if (isTrueZone) {
        state.reconTrueZoneController = controller;
        state.reconTrueZoneScanned = scanned;
      }

      return {
        id: region.id,
        name:
          region.name ||
          `Objective ${String.fromCharCode(65 + index)}`,
        friendly,
        hostile,
        controller,
        scanned,
        isTrueZone
      };
    });

    return state;
  }

  if (sitrep.type === "holdout") {
    const region = regionFor(combat, sitrep);

    state.valid = Boolean(region);

    if (!region) return state;

    state.regionName = region.name || "Control Zone";

    for (const entry of standingCombatants) {
      if (!tokenInsideRegion(entry.token, region)) continue;

      if (entry.faction === "friendly") {
        state.friendlyInZone += 1;
      } else if (entry.faction === "hostile") {
        state.hostileInZone += 1;
      }
    }

    state.controller = controllerFromCounts(
      state.friendlyInZone,
      state.hostileInZone
    );

    state.holdoutBaseScore = Number(
      sitrep.holdoutBaseScore ?? 4
    );

    state.holdoutScore =
      state.holdoutBaseScore -
      state.hostileInZone;

    return state;
  }

  if (sitrep.type === "extraction") {
    const scene = combat?.scene ?? canvas.scene;

    const extractionRegion = scene?.regions?.get(
      sitrep.extractionZoneRegionId
    ) ?? null;

    const objectiveCombatant = combatantById(
      combat,
      sitrep.extractionObjectiveCombatantId
    );

    const objectiveToken = objectiveCombatant?.token ?? null;

    state.valid = Boolean(
      extractionRegion &&
      objectiveCombatant &&
      objectiveToken
    );

    if (!state.valid) return state;

    state.objectiveName =
      objectiveCombatant.name ||
      objectiveToken.name ||
      "Objective";

    state.objectiveDestroyed =
      sitrep.extractionStatus === "destroyed" ||
      combatantIsDefeated(objectiveCombatant);

    state.objectiveExtracted =
      sitrep.extractionStatus === "extracted";

    state.objectiveInExtraction =
      !state.objectiveDestroyed &&
      !state.objectiveExtracted &&
      tokenInsideRegion(
        objectiveToken,
        extractionRegion
      );

    for (const entry of standingCombatants) {
      if (entry.token.id === objectiveToken.id) continue;

      if (
        entry.faction === "friendly" &&
        tokenInsideRegion(entry.token, extractionRegion)
      ) {
        state.friendlyInExtractionZone += 1;
      }

      if (!tokensAreAdjacent(entry.token, objectiveToken)) {
        continue;
      }

      if (entry.faction === "friendly") {
        state.friendlyAdjacent += 1;
      } else if (entry.faction === "hostile") {
        state.hostileAdjacent += 1;
      }
    }

    state.canExtractObjective =
      state.objectiveInExtraction &&
      state.friendlyAdjacent > 0 &&
      state.hostileAdjacent === 0 &&
      !state.objectiveDestroyed &&
      !state.objectiveExtracted;

    return state;
  }

  if (sitrep.type === "escort") {
    const scene = combat?.scene ?? canvas.scene;
    const extractionRegion = scene?.regions?.get(
      sitrep.escortExtractionRegionId
    ) ?? null;

    const objectiveCombatant = combatantById(
      combat,
      sitrep.escortObjectiveCombatantId
    );

    const objectiveToken = objectiveCombatant?.token ?? null;

    state.valid = Boolean(extractionRegion && objectiveCombatant && objectiveToken);

    if (!state.valid) return state;

    state.objectiveName =
      objectiveCombatant.name ||
      objectiveToken.name ||
      "Objective";

    state.objectiveDestroyed =
      sitrep.escortStatus === "destroyed" ||
      combatantIsDefeated(objectiveCombatant);

    state.objectiveExtracted =
      sitrep.escortStatus === "extracted";

    state.objectiveInExtraction =
      !state.objectiveDestroyed &&
      !state.objectiveExtracted &&
      tokenInsideRegion(objectiveToken, extractionRegion);

    for (const entry of standingCombatants) {
      if (entry.token.id === objectiveToken.id) continue;
      if (!tokensAreAdjacent(entry.token, objectiveToken)) continue;

      if (entry.faction === "friendly") {
        state.friendlyAdjacent += 1;
      } else if (entry.faction === "hostile") {
        state.hostileAdjacent += 1;
      }
    }

    state.canExtractObjective =
      state.objectiveInExtraction &&
      state.friendlyAdjacent > 0 &&
      state.hostileAdjacent === 0 &&
      !state.objectiveDestroyed &&
      !state.objectiveExtracted;

    return state;
  }

  const region = regionFor(combat, sitrep);
  if (!region) return state;

  state.valid = true;
  state.regionName = region.name || "Control Zone";

  for (const entry of standingCombatants) {
    if (!tokenInsideRegion(entry.token, region)) continue;

    if (entry.faction === "friendly") {
      state.friendlyInZone += entry.controlWeight;
    } else {
      state.hostileInZone += entry.controlWeight;
    }
  }

  state.controller = controllerFromCounts(
    state.friendlyInZone,
    state.hostileInZone
  );

  if (
    sitrep.rules?.enemyElimination &&
    state.hostileStanding === 0 &&
    state.friendlyStanding > 0
  ) {
    state.immediateVictory = true;
    state.immediateReason =
      "All hostile units have been defeated.";
  } else if (
    sitrep.rules?.unassailableControl &&
    state.friendlyInZone > 0 &&
    state.friendlyInZone > state.hostileStanding
  ) {
    state.immediateVictory = true;
    state.immediateReason =
      "The allies already in the zone outnumber every surviving hostile unit.";
  }

  return state;
}
