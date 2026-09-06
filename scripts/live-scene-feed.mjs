export const MODULE_ID = "orphaned-sun-scenes";
export const LIVE_SCENE_REPOSITORY = "jonkellyrice-cmyk/Foundry-scenes";
export const LIVE_SCENE_BRANCH = "main";
export const LIVE_SCENE_FEED_ROOT = `https://raw.githubusercontent.com/${LIVE_SCENE_REPOSITORY}/${LIVE_SCENE_BRANCH}/`;
export const LIVE_SCENE_REGISTRY_PATH = "assets/generated-scenes/registry.json";
export const LIVE_SCENE_REGISTRY_API_URL = `https://api.github.com/repos/${LIVE_SCENE_REPOSITORY}/contents/${LIVE_SCENE_REGISTRY_PATH}?ref=${encodeURIComponent(LIVE_SCENE_BRANCH)}`;
export const LIVE_SCENE_REGISTRY_URL = LIVE_SCENE_REGISTRY_API_URL;
const BACKGROUND_SENTINEL = "__BATTLE_MAP_BACKGROUND_ASSET__";

const asString = (value, fallback = "") => typeof value === "string" ? value : fallback;
const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function assertSafePackagePath(path) {
  const value = asString(path).trim();
  if (!value.startsWith("assets/generated-scenes/") || !value.endsWith(".scene-package.json") || value.includes("..") || value.includes("\\")) {
    throw new Error(`Unsafe generated scene package path: ${value || "<empty>"}.`);
  }
  return value;
}

export function normalizeLiveSceneRegistry(value) {
  if (!value || typeof value !== "object" || value.schemaVersion !== 1 || !Array.isArray(value.scenes)) {
    throw new Error("Live scene registry has an unsupported schema.");
  }
  const seen = new Set();
  return {
    schemaVersion: 1,
    scenes: value.scenes.map((raw, index) => {
      if (!raw || typeof raw !== "object") throw new Error(`Live scene registry entry ${index + 1} is invalid.`);
      const key = asString(raw.key).trim();
      if (!key || seen.has(key)) throw new Error(`Live scene registry contains an invalid or duplicate key at entry ${index + 1}.`);
      seen.add(key);
      const packagePath = assertSafePackagePath(raw.packagePath);
      const revision = finiteNumber(raw.revision, NaN);
      if (!Number.isInteger(revision) || revision < 1) throw new Error(`Live scene registry entry ${key} has an invalid revision.`);
      const packageSchemaVersion = finiteNumber(raw.packageSchemaVersion, NaN);
      const foundryGeneration = finiteNumber(raw.foundryGeneration, NaN);
      if (packageSchemaVersion !== 1 || foundryGeneration !== 13) throw new Error(`Live scene registry entry ${key} targets an unsupported package or Foundry generation.`);
      const backgroundSha256 = asString(raw.backgroundSha256).toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(backgroundSha256)) throw new Error(`Live scene registry entry ${key} has an invalid background digest.`);
      return {
        key,
        name: asString(raw.name, key).trim() || key,
        campaignId: asString(raw.campaignId).trim(),
        revision,
        packagePath,
        packageSchemaVersion,
        foundryGeneration,
        backgroundSha256,
        updatedAt: asString(raw.updatedAt).trim(),
        subtitle: asString(raw.subtitle).trim(),
        description: asString(raw.description).trim(),
        tags: Array.isArray(raw.tags) ? raw.tags.map(tag => asString(tag).trim()).filter(Boolean).slice(0, 12) : [],
        wallCount: Number.isInteger(Number(raw.wallCount)) ? Number(raw.wallCount) : null,
        doorCount: Number.isInteger(Number(raw.doorCount)) ? Number(raw.doorCount) : null,
        lightCount: Number.isInteger(Number(raw.lightCount)) ? Number(raw.lightCount) : null,
        previewUrl: asString(raw.previewUrl).trim()
      };
    })
  };
}

export function liveScenePackageUrl(entry, feedRoot = LIVE_SCENE_FEED_ROOT) {
  const root = String(feedRoot || "").endsWith("/") ? String(feedRoot) : `${feedRoot}/`;
  return new URL(assertSafePackagePath(entry?.packagePath), root).toString();
}

export function assertLiveScenePackage(value, entry = null) {
  if (!value || typeof value !== "object" || value.schemaVersion !== 1 || value.foundryGeneration !== 13) {
    throw new Error("Generated scene package has an unsupported schema.");
  }
  if (!value.source || typeof value.source !== "object" || !asString(value.source.battleMapId).trim()) {
    throw new Error("Generated scene package source metadata is incomplete.");
  }
  if (!value.sceneData || typeof value.sceneData !== "object") throw new Error("Generated scene package is missing sceneData.");
  const asset = value.backgroundAsset;
  if (!asset || typeof asset !== "object" || !asString(asset.base64).trim()) throw new Error("Generated scene package is missing its embedded background asset.");
  if (!/^[a-f0-9]{64}$/i.test(asString(asset.sha256))) throw new Error("Generated scene package background digest is invalid.");
  const width = finiteNumber(asset.widthPx, NaN), height = finiteNumber(asset.heightPx, NaN);
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) throw new Error("Generated scene package background dimensions are invalid.");
  if (entry) {
    if (value.source.battleMapId !== entry.key) throw new Error(`Generated scene package key ${value.source.battleMapId} does not match registry key ${entry.key}.`);
    if (Number(value.source.revision) !== entry.revision) throw new Error(`Generated scene package revision does not match registry revision ${entry.revision}.`);
    if (asString(asset.sha256).toLowerCase() !== entry.backgroundSha256) throw new Error("Generated scene package background digest does not match the live registry.");
  }
  const sceneWidth = finiteNumber(value.sceneData.width, NaN), sceneHeight = finiteNumber(value.sceneData.height, NaN);
  if (sceneWidth !== width || sceneHeight !== height) throw new Error("Generated scene package background dimensions do not match canonical Scene dimensions.");
  const background = value.sceneData.background;
  if (!background || typeof background !== "object") throw new Error("Generated scene package background registration is missing.");
  if (finiteNumber(background.scaleX, 1) !== 1 || finiteNumber(background.scaleY, 1) !== 1 || finiteNumber(background.offsetX, 0) !== 0 || finiteNumber(background.offsetY, 0) !== 0 || finiteNumber(background.rotation, 0) !== 0) {
    throw new Error("Generated scene package background registration is not identity-aligned.");
  }
  return value;
}

function noStoreUrl(url) {
  const out = new URL(url);
  out.searchParams.set("_osSceneFeed", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return out.toString();
}

async function fetchJson(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this Foundry client.");
  const response = await fetchImpl(noStoreUrl(url), { cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error(`Live scene feed request failed (${response.status}).`);
  return response.json();
}

function decodeBase64Utf8(base64) {
  const normalized = asString(base64).replace(/\s/g, "");
  if (!normalized) throw new Error("GitHub live-scene registry response contained no file content.");
  if (typeof globalThis.atob !== "function") throw new Error("Base64 decoding is unavailable in this Foundry client.");
  const binary = globalThis.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function decodeGitHubContentsJson(value) {
  if (!value || typeof value !== "object" || value.type !== "file" || value.encoding !== "base64" || typeof value.content !== "string") {
    throw new Error("GitHub live-scene registry response is not a base64 file payload.");
  }
  try {
    return JSON.parse(decodeBase64Utf8(value.content));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("GitHub live-scene registry file is not valid JSON.");
    throw error;
  }
}

export async function fetchLiveSceneRegistry({ fetchImpl = globalThis.fetch, registryUrl = LIVE_SCENE_REGISTRY_API_URL } = {}) {
  const currentFile = await fetchJson(registryUrl, fetchImpl);
  return normalizeLiveSceneRegistry(decodeGitHubContentsJson(currentFile));
}

export async function fetchLiveScenePackage(entry, { fetchImpl = globalThis.fetch, feedRoot = LIVE_SCENE_FEED_ROOT } = {}) {
  const packageData = await fetchJson(liveScenePackageUrl(entry, feedRoot), fetchImpl);
  return assertLiveScenePackage(packageData, entry);
}

function base64Bytes(base64) {
  const binary = globalThis.atob(base64);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable; cannot verify generated scene artwork.");
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, value => value.toString(16).padStart(2, "0")).join("");
}

function sanitizeStem(value) {
  return String(value || "scene").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "scene";
}

function extensionForAsset(asset) {
  const fileName = asString(asset.fileName);
  const match = /\.[a-z0-9]{2,6}$/i.exec(fileName);
  if (match) return match[0].toLowerCase();
  const mime = asString(asset.mimeType).toLowerCase();
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return ".png";
}

async function ensureSceneUploadDirectory() {
  const FilePicker = globalThis.foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
  const worldId = globalThis.game?.world?.id;
  if (!FilePicker || !worldId) throw new Error("Foundry FilePicker or world ID is unavailable.");
  const paths = [`worlds/${worldId}/orphaned-sun-scenes`, `worlds/${worldId}/orphaned-sun-scenes/scenes`];
  for (const path of paths) {
    try {
      await FilePicker.createDirectory("data", path, {});
    } catch (error) {
      if (!/exists/i.test(String(error?.message ?? error))) console.warn(`${MODULE_ID} | Could not create ${path}`, error);
    }
  }
  return { FilePicker, dir: paths.at(-1) };
}

async function uploadEmbeddedBackground(entry, scenePackage) {
  const asset = scenePackage.backgroundAsset;
  const bytes = base64Bytes(asset.base64);
  const actualSha = await sha256Hex(bytes);
  const expectedSha = asString(asset.sha256).toLowerCase();
  if (actualSha !== expectedSha) throw new Error("Generated scene background failed SHA-256 verification.");
  const { FilePicker, dir } = await ensureSceneUploadDirectory();
  const extension = extensionForAsset(asset);
  const fileName = `${sanitizeStem(entry.key)}-r${entry.revision}-${expectedSha.slice(0, 12)}${extension}`;
  const file = new File([bytes], fileName, { type: asString(asset.mimeType, "application/octet-stream") });
  const uploaded = await FilePicker.upload("data", dir, file, {}, { notify: false });
  return typeof uploaded?.path === "string" && uploaded.path ? uploaded.path : `${dir}/${fileName}`;
}

export function findImportedLiveScene(key) {
  const scenes = globalThis.game?.scenes;
  if (!scenes) return null;
  return scenes.find(scene => scene.getFlag?.(MODULE_ID, "sceneKey") === key && scene.getFlag?.(MODULE_ID, "liveScene") === true) ?? null;
}

export function liveSceneDescriptor(entry) {
  const scene = findImportedLiveScene(entry.key);
  const walls = scene ? Array.from(scene.walls ?? []) : [];
  const lights = scene ? Array.from(scene.lights ?? []) : [];
  const installedDoorCount = scene ? walls.filter(wall => Number(wall.door ?? wall?.toObject?.().door ?? 0) > 0).length : null;
  return {
    ...entry,
    title: entry.name,
    subtitle: entry.subtitle || `Revision ${entry.revision}${entry.campaignId ? ` · ${entry.campaignId}` : ""}`,
    description: entry.description || "Published from the Lancer GM Kit live battle-map feed.",
    tags: entry.tags.length ? entry.tags : ["Live", "Battle Map"],
    installed: Boolean(scene),
    worldId: scene?.id ?? null,
    worldName: scene?.name ?? null,
    wallCount: scene ? walls.length : entry.wallCount,
    doorCount: scene ? installedDoorCount : entry.doorCount,
    lightCount: scene ? lights.length : entry.lightCount,
    sourceVersion: scene?.getFlag?.(MODULE_ID, "sourceVersion") ?? `r${entry.revision}`,
    sourceRevision: scene ? Number(scene.getFlag?.(MODULE_ID, "sourceRevision") ?? 0) : null,
    updateAvailable: Boolean(scene && Number(scene.getFlag?.(MODULE_ID, "sourceRevision") ?? 0) < entry.revision),
    preview: entry.previewUrl || ""
  };
}

function deepClone(value) {
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

export async function importLiveScene(entry, options = {}) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can import live scenes.");
  const existing = findImportedLiveScene(entry.key);
  if (existing) return existing;
  const scenePackage = await fetchLiveScenePackage(entry, options);
  const backgroundPath = await uploadEmbeddedBackground(entry, scenePackage);
  const data = deepClone(scenePackage.sceneData);
  data.background ??= {};
  if (data.background.src !== BACKGROUND_SENTINEL && data.background.src) {
    console.warn(`${MODULE_ID} | Generated scene package did not use the expected background sentinel; replacing it with the verified imported asset.`);
  }
  data.background.src = backgroundPath;
  data.active = false;
  data.navigation = true;
  data.flags ??= {};
  data.flags[MODULE_ID] = {
    ...(data.flags[MODULE_ID] ?? {}),
    liveScene: true,
    sceneKey: entry.key,
    sourceVersion: `battle-map-r${entry.revision}`,
    sourceRevision: entry.revision,
    packagePath: entry.packagePath,
    backgroundSha256: entry.backgroundSha256,
    feedUpdatedAt: entry.updatedAt || null
  };
  const scene = await globalThis.Scene.create(data);
  if (!scene) throw new Error("Foundry did not return the imported Scene document.");
  return scene;
}

export async function restoreLiveScene(entry, options = {}) {
  const existing = findImportedLiveScene(entry.key);
  if (existing) await existing.delete();
  return importLiveScene(entry, options);
}
