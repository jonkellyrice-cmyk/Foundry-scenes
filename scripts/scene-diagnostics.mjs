const MODULE_ID = "orphaned-sun-scenes";

function list(collection) {
  return Array.from(collection ?? []);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 2) {
  const power = 10 ** digits;
  return Math.round(finite(value) * power) / power;
}

function parseCssColor(value) {
  if (!value || value === "transparent") return null;
  const text = String(value).trim();
  const rgb = text.match(/^rgba?\((\d+(?:\.\d+)?)[, ]+\s*(\d+(?:\.\d+)?)[, ]+\s*(\d+(?:\.\d+)?)(?:[, /]+\s*(\d+(?:\.\d+)?))?\)$/i);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] == null ? 1 : Number(rgb[4]) };
  const hex = text.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!hex) return null;
  const body = hex[1];
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
    a: body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1
  };
}

function isStrongGreen(value) {
  const color = parseCssColor(value);
  if (!color || color.a < 0.12) return false;
  return color.g >= 115 && color.g >= color.r * 1.35 && color.g >= color.b * 1.25;
}

function documentName(doc) {
  return doc?.name ?? doc?.label ?? doc?.id ?? "unnamed";
}

function tileTelemetry(tile, sceneArea) {
  const width = finite(tile.width);
  const height = finite(tile.height);
  const src = String(tile.texture?.src ?? "");
  const tint = tile.texture?.tint ?? tile.tint ?? null;
  const area = width * height;
  const large = sceneArea > 0 && area >= sceneArea * 0.2;
  const legacyMap = Boolean(tile.getFlag?.(MODULE_ID, "ghostShipMapFloor"))
    || src.includes("signatory-ghost-ship")
    || (finite(tile.elevation) <= -900 && finite(tile.sort) <= -900);
  return {
    id: tile.id,
    name: documentName(tile),
    src,
    x: round(tile.x),
    y: round(tile.y),
    width: round(width),
    height: round(height),
    elevation: round(tile.elevation),
    sort: round(tile.sort),
    alpha: round(tile.alpha, 3),
    hidden: Boolean(tile.hidden),
    locked: Boolean(tile.locked),
    tint: tint == null ? "none" : String(tint),
    large,
    legacyMap,
    green: isStrongGreen(String(tint ?? ""))
  };
}

function drawingTelemetry(drawing) {
  const fill = drawing.shape?.fillColor ?? drawing.fillColor ?? null;
  const stroke = drawing.shape?.strokeColor ?? drawing.strokeColor ?? null;
  return {
    id: drawing.id,
    name: documentName(drawing),
    x: round(drawing.x),
    y: round(drawing.y),
    width: round(drawing.shape?.width ?? drawing.width),
    height: round(drawing.shape?.height ?? drawing.height),
    fill: fill == null ? "none" : String(fill),
    stroke: stroke == null ? "none" : String(stroke),
    hidden: Boolean(drawing.hidden),
    green: isStrongGreen(String(fill ?? "")) || isStrongGreen(String(stroke ?? ""))
  };
}

function collectGreenDomCandidates() {
  if (!globalThis.document?.body || !globalThis.getComputedStyle) return [];
  const candidates = [];
  const elements = Array.from(document.body.querySelectorAll("*")).slice(0, 5000);
  for (const element of elements) {
    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width < 20 || rect.height < 20 || rect.width * rect.height < 5000) continue;
    const style = getComputedStyle(element);
    if (!isStrongGreen(style.backgroundColor)) continue;
    candidates.push({
      tag: element.tagName?.toLowerCase?.() ?? "?",
      id: element.id || "",
      classes: Array.from(element.classList ?? []).slice(0, 6).join("."),
      background: style.backgroundColor,
      position: style.position,
      zIndex: style.zIndex,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      area: Math.round(rect.width * rect.height)
    });
  }
  candidates.sort((a, b) => b.area - a.area);
  return candidates.slice(0, 20);
}

async function probeImage(src) {
  if (!src) return { ok: false, status: "No background source", src: "", width: null, height: null, bytes: 0, type: "" };
  try {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    let width = null;
    let height = null;
    if (globalThis.createImageBitmap) {
      const bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close?.();
    }
    return { ok: true, status: "Decoded", src, width, height, bytes: blob.size, type: blob.type || "unknown" };
  } catch (error) {
    return { ok: false, status: error?.message ?? String(error), src, width: null, height: null, bytes: 0, type: "" };
  }
}

function geometryTelemetry(scene) {
  const dimensions = scene?.dimensions ?? {};
  const background = scene?.background ?? {};
  return {
    width: finite(scene?.width),
    height: finite(scene?.height),
    padding: finite(scene?.padding),
    sceneX: finite(dimensions.sceneX),
    sceneY: finite(dimensions.sceneY),
    sceneWidth: finite(dimensions.sceneWidth ?? scene?.width),
    sceneHeight: finite(dimensions.sceneHeight ?? scene?.height),
    canvasWidth: finite(dimensions.width),
    canvasHeight: finite(dimensions.height),
    backgroundScaleX: finite(background.scaleX, 1),
    backgroundScaleY: finite(background.scaleY, 1),
    backgroundOffsetX: finite(background.offsetX),
    backgroundOffsetY: finite(background.offsetY),
    backgroundRotation: finite(background.rotation),
    canonical: finite(scene?.padding) === 0
      && finite(dimensions.sceneX) === 0
      && finite(dimensions.sceneY) === 0
      && finite(background.scaleX, 1) === 1
      && finite(background.scaleY, 1) === 1
      && finite(background.offsetX) === 0
      && finite(background.offsetY) === 0
      && finite(background.rotation) === 0
  };
}

function canvasTelemetry(scene) {
  const stage = globalThis.canvas?.stage;
  return {
    ready: Boolean(globalThis.canvas?.ready),
    viewedScene: globalThis.canvas?.scene?.id === scene?.id,
    sceneId: globalThis.canvas?.scene?.id ?? "none",
    activeLayer: globalThis.canvas?.activeLayer?.options?.name ?? globalThis.canvas?.activeLayer?.constructor?.name ?? "unknown",
    stageScaleX: round(stage?.scale?.x ?? 1, 3),
    stageScaleY: round(stage?.scale?.y ?? 1, 3),
    stagePivotX: round(stage?.pivot?.x ?? 0),
    stagePivotY: round(stage?.pivot?.y ?? 0),
    screenWidth: globalThis.innerWidth ?? null,
    screenHeight: globalThis.innerHeight ?? null
  };
}

export async function collectSceneDiagnostics(scene) {
  if (!scene) {
    const domGreen = collectGreenDomCandidates();
    return {
      available: false,
      message: "The managed Ghost Ship scene is not currently installed in this world.",
      greenDomCandidates: domGreen,
      greenArtifactCandidates: domGreen.length,
      raw: { available: false, greenDomCandidates: domGreen }
    };
  }

  const geometry = geometryTelemetry(scene);
  const sceneArea = finite(scene.width) * finite(scene.height);
  const tiles = list(scene.tiles).map(tile => tileTelemetry(tile, sceneArea));
  const drawings = list(scene.drawings).map(drawingTelemetry);
  const walls = list(scene.walls);
  const lights = list(scene.lights);
  const tokens = list(scene.tokens);
  const greenSceneCandidates = [
    ...tiles.filter(item => item.green || item.legacyMap || item.large).map(item => ({ type: "Tile", id: item.id, reason: item.green ? "green tint" : item.legacyMap ? "legacy map underlay signature" : "large-area tile", detail: item.src || item.name })),
    ...drawings.filter(item => item.green).map(item => ({ type: "Drawing", id: item.id, reason: "green fill/stroke", detail: `${item.fill} / ${item.stroke}` }))
  ];
  const greenDomCandidates = collectGreenDomCandidates();
  const background = await probeImage(String(scene.background?.src ?? ""));
  const canvas = canvasTelemetry(scene);
  const counts = {
    walls: walls.length,
    doors: walls.filter(wall => finite(wall.door) > 0).length,
    lights: lights.length,
    tiles: tiles.length,
    tokens: tokens.length,
    drawings: drawings.length,
    regions: list(scene.regions).length,
    templates: list(scene.templates).length,
    sounds: list(scene.sounds).length,
    notes: list(scene.notes).length
  };
  const warnings = [];
  if (!geometry.canonical) warnings.push("Scene geometry is not on the canonical zero-padding, identity-transform map rectangle.");
  if (!background.ok) warnings.push(`Background image probe failed: ${background.status}`);
  if (background.ok && background.width != null && (background.width !== scene.width || background.height !== scene.height)) warnings.push(`Decoded map is ${background.width}×${background.height}, but Scene is ${scene.width}×${scene.height}.`);
  if (tiles.length) warnings.push(`${tiles.length} Tile document(s) exist in this battle-map Scene; inspect them below for obsolete underlays or overlays.`);
  if (greenSceneCandidates.length) warnings.push(`${greenSceneCandidates.length} scene document(s) could plausibly create a large visual overlay.`);
  if (greenDomCandidates.length) warnings.push(`${greenDomCandidates.length} visible DOM element(s) have a strong green background; the green artifact may be UI/CSS rather than Scene content.`);
  if (!greenSceneCandidates.length && greenDomCandidates.length) warnings.push("No green Scene documents were found while green UI surfaces were detected. This strongly points away from the map/wall/light data.");

  const raw = {
    generatedAt: new Date().toISOString(),
    moduleVersion: game.modules.get(MODULE_ID)?.version ?? "unknown",
    foundryVersion: game.version ?? "unknown",
    system: { id: game.system?.id ?? "unknown", version: game.system?.version ?? "unknown" },
    scene: { id: scene.id, name: scene.name, sourceVersion: scene.getFlag(MODULE_ID, "sourceVersion") ?? "unknown", active: Boolean(scene.active), navigation: Boolean(scene.navigation) },
    geometry,
    background,
    canvas,
    counts,
    tiles,
    drawings,
    greenSceneCandidates,
    greenDomCandidates,
    warnings
  };

  return {
    available: true,
    sceneName: scene.name,
    sceneId: scene.id,
    sourceVersion: raw.scene.sourceVersion,
    moduleVersion: raw.moduleVersion,
    foundryVersion: raw.foundryVersion,
    systemLabel: `${raw.system.id} ${raw.system.version}`,
    geometry,
    background,
    canvas,
    counts,
    tiles,
    drawings,
    warnings,
    hasWarnings: warnings.length > 0,
    greenSceneCandidates,
    greenDomCandidates,
    greenArtifactCandidates: greenSceneCandidates.length + greenDomCandidates.length,
    artifactAssessment: greenSceneCandidates.length
      ? "Scene-level visual suspects were found. Inspect their IDs and properties below."
      : greenDomCandidates.length
        ? "No green Scene documents were found, but strong-green browser UI surfaces were detected. The artifact is likely being painted by UI/CSS or another module/system layer."
        : "No explicit green Scene documents or strong-green DOM surfaces were detected. The next suspect would be a canvas/WebGL render layer rather than stored Scene data.",
    raw
  };
}

export function diagnosticsClipboardText(diagnostics) {
  return JSON.stringify(diagnostics?.raw ?? diagnostics ?? {}, null, 2);
}
