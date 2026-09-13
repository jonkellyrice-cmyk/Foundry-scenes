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

export async function recordReconScan(regionId) {
  const combat = activeCombat();
  const sitrep = getSitrep(combat);

  if (
    !game.user.isGM ||
    !combat ||
    !sitrep ||
    sitrep.type !== "recon" ||
    !regionId
  ) {
    return;
  }

  const validRegionIds = Array.isArray(sitrep.reconRegionIds)
    ? sitrep.reconRegionIds
    : [];

  if (!validRegionIds.includes(regionId)) {
    ui.notifications.error(
      "That Region is not one of this Recon sitrep's Control Zones."
    );

    return;
  }

  const scannedRegionIds = Array.isArray(
    sitrep.reconScannedRegionIds
  )
    ? [...sitrep.reconScannedRegionIds]
    : [];

  if (scannedRegionIds.includes(regionId)) {
    return;
  }

  scannedRegionIds.push(regionId);

  await combat.setFlag(MODULE_ID, FLAG_KEY, {
    ...sitrep,
    reconScannedRegionIds: scannedRegionIds
  });

  const scene = combat.scene ?? canvas.scene;
  const region = scene?.regions?.get(regionId);
  const isTrueZone = regionId === sitrep.reconTrueRegionId;

  if (isPrimaryGM()) {
    await ChatMessage.create({
      speaker: {
        alias: "MISSION CONTROL"
      },
      content: `
        <div class="lst-chat-result ${
          isTrueZone ? "victory" : ""
        }">
          <strong>
            ${esc(region?.name || "Control Zone")} SCANNED
          </strong>
          <br>
          ${isTrueZone ? "TRUE CONTROL ZONE" : "FALSE CONTROL ZONE"}
        </div>
      `
    });
  }
}
