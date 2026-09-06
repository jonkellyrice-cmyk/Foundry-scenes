import assert from "node:assert/strict";
import {
  normalizeLiveSceneRegistry,
  liveScenePackageUrl,
  assertLiveScenePackage,
  decodeGitHubContentsJson,
  fetchLiveSceneRegistry,
  LIVE_SCENE_FEED_ROOT,
  LIVE_SCENE_REGISTRY_API_URL
} from "./live-scene-feed.mjs";

const digest = "a".repeat(64);
const registryPayload = {
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
};
const registry = normalizeLiveSceneRegistry(registryPayload);
assert.equal(registry.scenes.length, 1);
assert.equal(registry.scenes[0].key, "map-1");
assert.equal(liveScenePackageUrl(registry.scenes[0]), `${LIVE_SCENE_FEED_ROOT}assets/generated-scenes/map-1.scene-package.json`);
assert.match(LIVE_SCENE_REGISTRY_API_URL, /^https:\/\/api\.github\.com\/repos\/jonkellyrice-cmyk\/Foundry-scenes\/contents\/assets\/generated-scenes\/registry\.json\?ref=main$/);

const githubContentsPayload = {
  type: "file",
  encoding: "base64",
  content: Buffer.from(JSON.stringify(registryPayload), "utf8").toString("base64")
};
assert.deepEqual(decodeGitHubContentsJson(githubContentsPayload), registryPayload);
assert.throws(() => decodeGitHubContentsJson({ type: "file", encoding: "none", content: "{}" }), /base64 file payload/);

let requestedRegistryUrl = "";
const fetchedRegistry = await fetchLiveSceneRegistry({
  fetchImpl: async (url, options) => {
    requestedRegistryUrl = String(url);
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit");
    return { ok: true, status: 200, json: async () => githubContentsPayload };
  }
});
assert.equal(fetchedRegistry.scenes.length, 1);
assert.equal(fetchedRegistry.scenes[0].revision, 2);
const requested = new URL(requestedRegistryUrl);
assert.equal(`${requested.origin}${requested.pathname}`, "https://api.github.com/repos/jonkellyrice-cmyk/Foundry-scenes/contents/assets/generated-scenes/registry.json");
assert.equal(requested.searchParams.get("ref"), "main");
assert.ok(requested.searchParams.get("_osSceneFeed"));

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
