/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/elevation-los.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  FEATURE_KEY,
  MODULE_ID,
  finiteNumberOr
} from "./elevation-los-contract.js";
import {
  refreshElevationVision
} from "./elevation-vision-service.js";

export async function setWallRange(
  wallDocument,
  bottom,
  top
) {
  if (!game.user?.isGM || !wallDocument) return;

  await wallDocument.setFlag(
    MODULE_ID,
    FEATURE_KEY,
    {
      bottom:
        bottom === "" || bottom === null
          ? ""
          : Number(bottom),

      top:
        top === "" || top === null
          ? ""
          : Number(top)
    }
  );

  refreshElevationVision();
}

export async function setAmbientLightElevation(
  lightDocument,
  elevation
) {
  if (!game.user?.isGM || !lightDocument) return;

  await lightDocument.update({
    elevation: finiteNumberOr(elevation, 0)
  });

  refreshElevationVision();
}

export async function setSelectedLightElevation(elevation) {
  if (!game.user?.isGM) {
    return ui.notifications.warn(
      "Only a GM can configure light elevations."
    );
  }

  const controlledLights =
    canvas?.lighting?.controlled ?? [];

  if (!controlledLights.length) {
    return ui.notifications.warn(
      "Select one or more ambient lights first."
    );
  }

  const numericElevation =
    finiteNumberOr(elevation, 0);

  const updates = controlledLights.map(light => ({
    _id: light.document.id,
    elevation: numericElevation
  }));

  await canvas.scene.updateEmbeddedDocuments(
    "AmbientLight",
    updates
  );

  for (const light of controlledLights) {
    try {
      light.initializeLightSource?.();
    } catch (error) {
      console.warn(
        `${MODULE_ID} | Could not directly reinitialize a selected light.`,
        error
      );
    }
  }

  refreshElevationVision();

  ui.notifications.info(
    `Updated elevation for ${updates.length} light source(s).`
  );
}

export async function setSelectedWallRange(bottom, top) {
  if (!game.user?.isGM) {
    return ui.notifications.warn(
      "Only a GM can configure wall elevations."
    );
  }

  const controlledWalls =
    canvas?.walls?.controlled ?? [];

  if (!controlledWalls.length) {
    return ui.notifications.warn(
      "Select one or more walls first."
    );
  }

  const updates = controlledWalls.map(wall => ({
    _id: wall.document.id,
    [`flags.${MODULE_ID}.${FEATURE_KEY}`]: {
      bottom:
        bottom === "" || bottom === null
          ? ""
          : Number(bottom),

      top:
        top === "" || top === null
          ? ""
          : Number(top)
    }
  }));

  await canvas.scene.updateEmbeddedDocuments(
    "Wall",
    updates
  );

  refreshElevationVision();

  ui.notifications.info(
    `Updated elevation range for ${updates.length} wall(s).`
  );
}
