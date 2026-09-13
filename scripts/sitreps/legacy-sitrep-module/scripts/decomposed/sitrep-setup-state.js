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
  DEFAULTS
} from "./sitrep-configuration.js";

export async function saveSetup(
  html,
  combat
) {
  const form =
    html.querySelector("form");

  const formData =
    new FormData(form);

  const sitrepType = String(
    formData.get("sitrepType") || DEFAULTS.type
  );

  const regionId = String(
    formData.get("regionId") ?? ""
  );

  const controlRegionIds = formData
    .getAll("controlRegionIds")
    .map(String);

  const escortObjectiveCombatantId = String(
    formData.get("escortObjectiveCombatantId") ?? ""
  );

  const escortExtractionRegionId = String(
    formData.get("escortExtractionRegionId") ?? ""
  );

  const extractionObjectiveCombatantId = String(
    formData.get("extractionObjectiveCombatantId") ?? ""
  );

  const extractionZoneRegionId = String(
    formData.get("extractionZoneRegionId") ?? ""
  );

  const reconRegionIds = formData
    .getAll("reconRegionIds")
    .map(String);

  const reconTrueRegionId = String(
    formData.get("reconTrueRegionId") ?? ""
  );

  if (sitrepType === "control") {
    if (controlRegionIds.length !== 4) {
      ui.notifications.error(
        "Control requires exactly four selected Scene Regions."
      );

      return false;
    }
  } else if (sitrepType === "recon") {
    if (reconRegionIds.length !== 4) {
      ui.notifications.error(
        "Recon requires exactly four selected Control Zone Regions."
      );

      return false;
    }

    if (!reconTrueRegionId) {
      ui.notifications.error(
        "Recon requires one secretly designated True Control Zone."
      );

      return false;
    }

    if (!reconRegionIds.includes(reconTrueRegionId)) {
      ui.notifications.error(
        "The True Control Zone must be one of the four selected Recon Regions."
      );

      return false;
    }
  } else if (sitrepType === "extraction") {
    if (!extractionObjectiveCombatantId) {
      ui.notifications.error(
        "Extraction requires an Objective combatant."
      );

      return false;
    }

    if (!extractionZoneRegionId) {
      ui.notifications.error(
        "Extraction requires an Extraction Zone Region."
      );

      return false;
    }
  } else if (sitrepType === "escort") {
    if (!escortObjectiveCombatantId) {
      ui.notifications.error(
        "Escort requires an Objective combatant."
      );

      return false;
    }

    if (!escortExtractionRegionId) {
      ui.notifications.error(
        "Escort requires an Extraction Zone Region."
      );

      return false;
    }
  } else if (!regionId) {
    ui.notifications.error(
      "Select a control Region."
    );

    return false;
  }

  const roundLimit = Math.max(
    Number(
      formData.get("roundLimit") ??
      (
        sitrepType === "control" ||
        sitrepType === "holdout"
          ? 6
          : sitrepType === "extraction"
            ? 10
            : 8
      )
    ),
    1
  );

  const startRound = Math.max(
    Number(combat.round ?? 1),
    1
  );

  const data = {
    ...DEFAULTS,

    type: sitrepType,

    controlRegionIds:
      sitrepType === "control"
        ? controlRegionIds
        : [],

    scores: {
      friendly: 0,
      hostile: 0
    },

    scoredRounds: [],

    escortObjectiveCombatantId:
      sitrepType === "escort"
        ? escortObjectiveCombatantId
        : "",

    escortExtractionRegionId:
      sitrepType === "escort"
        ? escortExtractionRegionId
        : "",

    escortStatus: "active",

    extractionObjectiveCombatantId:
      sitrepType === "extraction"
        ? extractionObjectiveCombatantId
        : "",

    extractionZoneRegionId:
      sitrepType === "extraction"
        ? extractionZoneRegionId
        : "",

    extractionStatus: "active",

    holdoutBaseScore:
      sitrepType === "holdout"
        ? 4
        : Number(DEFAULTS.holdoutBaseScore ?? 4),

    reconRegionIds:
      sitrepType === "recon"
        ? reconRegionIds
        : [],

    reconTrueRegionId:
      sitrepType === "recon"
        ? reconTrueRegionId
        : "",

    reconScannedRegionIds: [],

    title: String(
      formData.get("title") ||
      "GAUNTLET"
    ),

    objective: String(
      formData.get("objective") ||
      DEFAULTS.objective
    ),

    regionId,
    startRound,
    roundLimit,

    finalRound:
      startRound +
      roundLimit -
      1,

    rules: {
      finalZoneControl:
        formData.has(
          "finalZoneControl"
        ),

      enemyElimination:
        formData.has(
          "enemyElimination"
        ),

      unassailableControl:
        formData.has(
          "unassailableControl"
        )
    },

    active: true,
    status: "active",
    resultReason: ""
  };

  await combat.setFlag(
    MODULE_ID,
    FLAG_KEY,
    data
  );

  ui.notifications.info(
    `${data.title} started. Final round: ${data.finalRound}.`
  );

  return true;
}
