import { defineFrameConnFeature } from "../../feature-contract.js";
import { FEATURE_KEY, LEGACY_MODULE_ID, MODULE_ID } from "./elevation-los-contract.js";
import { wallElevationRange } from "./wall-elevation-state.js";
import { installVisionPolygonWrapper, refreshElevationVision } from "./elevation-vision-service.js";
import { horizontalRadiusAtGround, installAmbientLightRadiusWrapper } from "./elevated-light-service.js";
import { setAmbientLightElevation, setSelectedLightElevation, setSelectedWallRange, setWallRange } from "./elevation-document-commands.js";
import { injectAmbientLightElevationField, injectWallElevationFields, installStyles } from "./elevation-config-presentation.js";

function initializeElevationLosFeature() {
  installStyles();
  installVisionPolygonWrapper();
  installAmbientLightRadiusWrapper();
}

function readyElevationLosFeature() {
  refreshElevationVision();
}

function handleUpdateToken(tokenDocument, changes) {
  if (Object.prototype.hasOwnProperty.call(changes ?? {}, "elevation")) refreshElevationVision();
}

function handleUpdateWall(wallDocument, changes) {
  const hasProperty = globalThis.foundry?.utils?.hasProperty;
  const changedElevationData = Boolean(
    hasProperty?.(changes, `flags.${MODULE_ID}.${FEATURE_KEY}`) ||
    hasProperty?.(changes, `flags.${LEGACY_MODULE_ID}.${FEATURE_KEY}`)
  );
  if (changedElevationData || ["c", "sight", "door", "ds"].some(key => Object.prototype.hasOwnProperty.call(changes ?? {}, key))) refreshElevationVision();
}

function handleUpdateAmbientLight(lightDocument, changes) {
  const relevant = ["elevation", "x", "y", "walls", "config"].some(key => Object.prototype.hasOwnProperty.call(changes ?? {}, key));
  if (!relevant) return;
  try { lightDocument.object?.initializeLightSource?.(); }
  catch (error) { console.warn(`${MODULE_ID} | Could not directly reinitialize the light source.`, error); }
  refreshElevationVision();
}

function handleCreateAmbientLight(lightDocument) {
  try { lightDocument.object?.initializeLightSource?.(); } catch {}
  refreshElevationVision();
}

export const frameConnElevationLosFeature = defineFrameConnFeature({
  id: "elevation-los",
  domain: "foundry-elevation-los",
  provides: ["foundry.elevation-los"],
  hooks: {
    renderWallConfig: injectWallElevationFields,
    renderAmbientLightConfig: injectAmbientLightElevationField,
    updateToken: handleUpdateToken,
    updateWall: handleUpdateWall,
    updateAmbientLight: handleUpdateAmbientLight,
    createAmbientLight: handleCreateAmbientLight,
    deleteAmbientLight: refreshElevationVision,
    createWall: refreshElevationVision,
    deleteWall: refreshElevationVision,
    canvasReady: refreshElevationVision
  },
  api: {
    initialize: initializeElevationLosFeature,
    ready: readyElevationLosFeature,
    refresh: refreshElevationVision,
    getWallRange: wallElevationRange,
    setWallRange,
    setSelectedWallRange,
    setAmbientLightElevation,
    setSelectedLightElevation,
    horizontalRadiusAtGround
  },
  metadata: { ownership: "foundry-wide", canonicalFlagNamespace: MODULE_ID, legacyReadNamespace: LEGACY_MODULE_ID }
});
