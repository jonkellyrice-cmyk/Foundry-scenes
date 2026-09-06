import assert from "node:assert/strict";
import {
  normalizeLiveSceneRegistry,
  liveScenePackageUrl,
  assertLiveScenePackage,
  LIVE_SCENE_FEED_ROOT
} from "./live-scene-feed.mjs";

const digest = "a".repeat(64);
const registry = normalizeLiveSceneRegistry({
  schemaVersion: 1,
  scenes: [{
    key: "map-1",
    name: "Map One",
    campaignId: "campaign-1",
    revision: 2,
    packagePath: "assets/generated-scenes/map-1.scene-package.json",
    packageSchemaVersion: 1,
    foundryGeneration: 13,
    backgroundSha256: digest,
    updatedAt: "2026-09-06T00:00:00.000Z"
  }]
});
assert.equal(registry.scenes.length, 1);
assert.equal(registry.scenes[0].key, "map-1");
assert.equal(liveScenePackageUrl(registry.scenes[0]), `${LIVE_SCENE_FEED_ROOT}assets/generated-scenes/map-1.scene-package.json`);

const scenePackage = {
  schemaVersion: 1,
  foundryGeneration: 13,
  source: { battleMapId: "map-1", battleMapSchemaVersion: 1, revision: 2, campaignId: "campaign-1" },
  sceneData: {
    name: "Map One",
    width: 1230,
    height: 589,
    background: { src: "__BATTLE_MAP_BACKGROUND_ASSET__", scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
    walls: [],
    lights: []
  },
  backgroundAsset: { fileName: "map.png", mimeType: "image/png", base64: "AA==", sha256: digest, widthPx: 1230, heightPx: 589 },
  deterministicReferenceSvg: "<svg/>",
  diagnosticReferenceSvg: "<svg/>",
  informationPacket: "packet",
  generatedAt: "2026-09-06T00:00:00.000Z"
};
assert.equal(assertLiveScenePackage(scenePackage, registry.scenes[0]), scenePackage);
assert.throws(() => normalizeLiveSceneRegistry({ schemaVersion: 1, scenes: [{ ...registry.scenes[0], packagePath: "../escape.scene-package.json" }] }), /Unsafe generated scene package path/);
assert.throws(() => assertLiveScenePackage({ ...scenePackage, sceneData: { ...scenePackage.sceneData, width: 1200 } }, registry.scenes[0]), /dimensions do not match/);
assert.throws(() => assertLiveScenePackage({ ...scenePackage, sceneData: { ...scenePackage.sceneData, background: { ...scenePackage.sceneData.background, offsetX: 1 } } }, registry.scenes[0]), /identity-aligned/);
console.log("live scene feed tests passed");
