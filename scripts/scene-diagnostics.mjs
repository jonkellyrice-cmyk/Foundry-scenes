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

function rectIntersectsViewport(rect) {
  const width = globalThis.innerWidth ?? document.documentElement?.clientWidth ?? 0;
  const height = globalThis.innerHeight ?? document.documentElement?.clientHeight ?? 0;
  return rect.right > 0 && rect.bottom > 0 && rect.left < width && rect.top < height;
}

function domIdentity(element) {
  return {
    tag: element?.tagName?.toLowerCase?.() ?? "?",
    id: element?.id || "",
    classes: Array.from(element?.classList ?? []).slice(0, 8).join(".")
  };
}

function pseudoTelemetry(element, pseudo) {
  try {
    const style = getComputedStyle(element, pseudo);
    return {
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      content: style.content,
      display: style.display,
      opacity: style.opacity,
      green: isStrongGreen(style.backgroundColor)
    };
  } catch {
    return null;
  }
}

function matchingVisualRules(element) {
  if (!globalThis.document?.styleSheets || !element?.matches) return [];
  const matches = [];
  const interesting = /(background(?:-color|-image)?|box-shadow|filter|opacity|mix-blend-mode|clip-path)\s*:/i;

  function visitRules(rules, source, depth = 0) {
    if (!rules || depth > 4 || matches.length >= 30) return;
    for (const rule of Array.from(rules)) {
      if (matches.length >= 30) break;
      if (rule.selectorText && rule.style) {
        let matched = false;
        try {
          matched = element.matches(rule.selectorText);
        } catch {
          matched = false;
        }
        const cssText = rule.style.cssText ?? "";
        if (matched && interesting.test(cssText)) {
          matches.push({
            source,
            selector: rule.selectorText,
            css: cssText
          });
        }
      }
      if (rule.cssRules) {
        try {
          visitRules(rule.cssRules, source, depth + 1);
        } catch {
          // Cross-origin or unsupported nested stylesheet rule.
        }
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    visitRules(rules, sheet.href || "inline stylesheet");
  }
  return matches;
}

function elementPointTelemetry(element, rank) {
  const rect = element.getBoundingClientRect?.();
  const style = getComputedStyle(element);
  const before = pseudoTelemetry(element, "::before");
  const after = pseudoTelemetry(element, "::after");
  return {
    rank,
    ...domIdentity(element),
    x: Math.round(rect?.x ?? 0),
    y: Math.round(rect?.y ?? 0),
    width: Math.round(rect?.width ?? 0),
    height: Math.round(rect?.height ?? 0),
    background: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    boxShadow: style.boxShadow,
    color: style.color,
    display: style.display,
    visibility: style.visibility,
    position: style.position,
    zIndex: style.zIndex,
    opacity: style.opacity,
    filter: style.filter,
    mixBlendMode: style.mixBlendMode,
    isolation: style.isolation,
    clipPath: style.clipPath,
    systemColor: style.getPropertyValue("--system-color")?.trim?.() || "",
    green: isStrongGreen(style.backgroundColor) || Boolean(before?.green) || Boolean(after?.green),
    before,
    after,
    visualRules: matchingVisualRules(element)
  };
}

export function collectDomPointProbe(x, y) {
  if (!globalThis.document?.elementsFromPoint || !globalThis.getComputedStyle) {
    return { x: Math.round(finite(x)), y: Math.round(finite(y)), stack: [], status: "elementsFromPoint unavailable" };
  }
  const px = Math.max(0, Math.min((globalThis.innerWidth ?? 1) - 1, finite(x)));
  const py = Math.max(0, Math.min((globalThis.innerHeight ?? 1) - 1, finite(y)));
  const stack = document.elementsFromPoint(px, py)
    .slice(0, 12)
    .map((element, index) => elementPointTelemetry(element, index + 1));
  return {
    x: Math.round(px),
    y: Math.round(py),
    status: stack.length ? "Captured" : "No DOM elements at point",
    stack,
    greenStackEntries: stack.filter(item => item.green).length
  };
}

function colorValueTelemetry(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rgb = Math.max(0, Math.min(0xffffff, Math.trunc(value)));
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    return {
      value,
      hex: `#${rgb.toString(16).padStart(6, "0")}`,
      green: g >= 115 && g >= r * 1.35 && g >= b * 1.25
    };
  }
  if (typeof value === "string") {
    return { value, hex: value, green: isStrongGreen(value) };
  }
  return null;
}

function safeDisplayBounds(displayObject) {
  try {
    const bounds = displayObject?.getBounds?.();
    if (!bounds) return null;
    const x = finite(bounds.x ?? bounds.minX, NaN);
    const y = finite(bounds.y ?? bounds.minY, NaN);
    const width = finite(bounds.width ?? ((bounds.maxX ?? NaN) - (bounds.minX ?? NaN)), NaN);
    const height = finite(bounds.height ?? ((bounds.maxY ?? NaN) - (bounds.minY ?? NaN)), NaN);
    if (![x, y, width, height].every(Number.isFinite)) return null;
    return { x: round(x), y: round(y), width: round(width), height: round(height) };
  } catch {
    return null;
  }
}

function boundsContainPoint(bounds, point) {
  if (!bounds || !point) return false;
  return point.x >= bounds.x
    && point.y >= bounds.y
    && point.x <= bounds.x + bounds.width
    && point.y <= bounds.y + bounds.height;
}

function displayIdentity(displayObject) {
  const doc = displayObject?.document;
  return {
    className: displayObject?.constructor?.name ?? "Unknown",
    name: String(displayObject?.name ?? displayObject?.label ?? ""),
    document: doc ? {
      documentName: doc.documentName ?? doc.constructor?.name ?? "",
      id: doc.id ?? "",
      name: doc.name ?? ""
    } : null
  };
}

function displayParentChain(displayObject) {
  const chain = [];
  let cursor = displayObject?.parent ?? null;
  for (let depth = 0; cursor && depth < 10; depth += 1) {
    chain.push({
      className: cursor.constructor?.name ?? "Unknown",
      name: String(cursor.name ?? cursor.label ?? "")
    });
    cursor = cursor.parent ?? null;
  }
  return chain;
}

function displayVisualProperties(displayObject) {
  const interesting = new Set([
    "tint", "color", "fillColor", "backgroundColor", "_tintRGB",
    "alpha", "worldAlpha", "blendMode", "zIndex", "sort", "elevation", "eventMode"
  ]);
  const discovered = Object.keys(displayObject ?? {})
    .filter(key => /(tint|color|fill|alpha|blend|zindex|sort|elevation)/i.test(key))
    .slice(0, 24);
  const properties = {};
  const greenSignals = [];

  for (const key of [...interesting, ...discovered]) {
    if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
    let value;
    try {
      value = displayObject?.[key];
    } catch {
      continue;
    }
    if (["string", "number", "boolean"].includes(typeof value) || value == null) {
      properties[key] = value;
      if (/(tint|color|fill)/i.test(key)) {
        const color = colorValueTelemetry(value);
        if (color?.green) greenSignals.push({ path: key, ...color });
      }
      continue;
    }
    if (typeof value !== "object") continue;
    const nested = {};
    for (const nestedKey of Object.keys(value).filter(item => /(tint|color|fill|alpha)/i.test(item)).slice(0, 8)) {
      let nestedValue;
      try {
        nestedValue = value[nestedKey];
      } catch {
        continue;
      }
      if (!["string", "number", "boolean"].includes(typeof nestedValue) && nestedValue != null) continue;
      nested[nestedKey] = nestedValue;
      if (/(tint|color|fill)/i.test(nestedKey)) {
        const color = colorValueTelemetry(nestedValue);
        if (color?.green) greenSignals.push({ path: `${key}.${nestedKey}`, ...color });
      }
    }
    if (Object.keys(nested).length) properties[key] = nested;
  }

  return { properties, greenSignals };
}

function displayObjectTelemetry(displayObject, depth, rendererPoint, scenePoint) {
  const bounds = safeDisplayBounds(displayObject);
  const visual = displayVisualProperties(displayObject);
  let containsPoint = false;
  if (typeof displayObject?.containsPoint === "function") {
    try {
      containsPoint = Boolean(displayObject.containsPoint(rendererPoint));
    } catch {
      containsPoint = false;
    }
  }
  return {
    ...displayIdentity(displayObject),
    depth,
    visible: displayObject?.visible !== false,
    renderable: displayObject?.renderable !== false,
    alpha: round(displayObject?.alpha ?? 1, 3),
    worldAlpha: round(displayObject?.worldAlpha ?? displayObject?.alpha ?? 1, 3),
    zIndex: finite(displayObject?.zIndex),
    sort: finite(displayObject?.sort ?? displayObject?.sortOrder),
    childCount: Array.isArray(displayObject?.children) ? displayObject.children.length : 0,
    bounds,
    hitRendererBounds: boundsContainPoint(bounds, rendererPoint),
    hitSceneBounds: boundsContainPoint(bounds, scenePoint),
    containsPoint,
    mask: displayObject?.mask ? displayIdentity(displayObject.mask) : null,
    filters: list(displayObject?.filters).map(filter => filter?.constructor?.name ?? "Unknown"),
    parentChain: displayParentChain(displayObject),
    visualProperties: visual.properties,
    greenSignals: visual.greenSignals
  };
}

function canvasCoordinateTelemetry(x, y) {
  const board = document.getElementById("board");
  const rect = board?.getBoundingClientRect?.();
  const renderer = globalThis.canvas?.app?.renderer;
  const stage = globalThis.canvas?.stage;
  const client = { x: finite(x), y: finite(y) };
  const rendererWidth = finite(renderer?.screen?.width ?? rect?.width, rect?.width ?? 0);
  const rendererHeight = finite(renderer?.screen?.height ?? rect?.height, rect?.height ?? 0);
  const rendererPoint = rect && rect.width > 0 && rect.height > 0
    ? {
        x: (client.x - rect.left) * (rendererWidth / rect.width),
        y: (client.y - rect.top) * (rendererHeight / rect.height)
      }
    : { ...client };

  let scenePoint = null;
  try {
    const inverse = stage?.worldTransform?.applyInverse?.(rendererPoint);
    if (Number.isFinite(inverse?.x) && Number.isFinite(inverse?.y)) {
      scenePoint = { x: inverse.x, y: inverse.y };
    }
  } catch {
    scenePoint = null;
  }
  if (!scenePoint) {
    const scaleX = finite(stage?.scale?.x, 1) || 1;
    const scaleY = finite(stage?.scale?.y, 1) || 1;
    const positionX = finite(stage?.position?.x);
    const positionY = finite(stage?.position?.y);
    const pivotX = finite(stage?.pivot?.x);
    const pivotY = finite(stage?.pivot?.y);
    scenePoint = {
      x: ((rendererPoint.x - positionX) / scaleX) + pivotX,
      y: ((rendererPoint.y - positionY) / scaleY) + pivotY
    };
  }

  return {
    client: { x: round(client.x), y: round(client.y) },
    renderer: { x: round(rendererPoint.x), y: round(rendererPoint.y) },
    scene: { x: round(scenePoint.x), y: round(scenePoint.y) },
    board: rect ? {
      x: round(rect.x),
      y: round(rect.y),
      width: round(rect.width),
      height: round(rect.height)
    } : null,
    rendererScreen: { width: round(rendererWidth), height: round(rendererHeight) }
  };
}

function topLevelCanvasGroups(stage, rendererPoint, scenePoint) {
  return list(stage?.children).map((child, index) => {
    const item = displayObjectTelemetry(child, 1, rendererPoint, scenePoint);
    return {
      order: index,
      className: item.className,
      name: item.name,
      visible: item.visible,
      renderable: item.renderable,
      alpha: item.alpha,
      worldAlpha: item.worldAlpha,
      zIndex: item.zIndex,
      childCount: item.childCount,
      bounds: item.bounds,
      hitRendererBounds: item.hitRendererBounds,
      hitSceneBounds: item.hitSceneBounds,
      greenSignals: item.greenSignals
    };
  });
}

export function collectCanvasPointProbe(x, y) {
  const stage = globalThis.canvas?.stage;
  if (!stage) {
    return {
      status: "Canvas stage unavailable",
      coordinates: canvasCoordinateTelemetry(x, y),
      hits: [],
      topLevelGroups: [],
      traversed: 0
    };
  }

  const coordinates = canvasCoordinateTelemetry(x, y);
  const rendererPoint = coordinates.renderer;
  const scenePoint = coordinates.scene;
  const hits = [];
  const stack = [{ node: stage, depth: 0 }];
  let traversed = 0;
  const maxObjects = 5000;

  while (stack.length && traversed < maxObjects) {
    const { node, depth } = stack.pop();
    traversed += 1;
    const telemetry = displayObjectTelemetry(node, depth, rendererPoint, scenePoint);
    if (telemetry.visible && telemetry.renderable
      && (telemetry.hitRendererBounds || telemetry.hitSceneBounds || telemetry.containsPoint || telemetry.greenSignals.length)) {
      hits.push(telemetry);
    }
    const children = list(node?.children);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], depth: depth + 1 });
    }
  }

  hits.sort((a, b) => {
    const aPoint = Number(a.containsPoint) + Number(a.hitRendererBounds) + Number(a.hitSceneBounds);
    const bPoint = Number(b.containsPoint) + Number(b.hitRendererBounds) + Number(b.hitSceneBounds);
    if (aPoint !== bPoint) return bPoint - aPoint;
    if (a.greenSignals.length !== b.greenSignals.length) return b.greenSignals.length - a.greenSignals.length;
    if (a.depth !== b.depth) return b.depth - a.depth;
    const aArea = (a.bounds?.width ?? Infinity) * (a.bounds?.height ?? Infinity);
    const bArea = (b.bounds?.width ?? Infinity) * (b.bounds?.height ?? Infinity);
    return aArea - bArea;
  });

  return {
    status: hits.length ? "Captured" : "No PIXI display objects matched the point",
    coordinates,
    traversed,
    truncated: traversed >= maxObjects,
    hitCount: hits.length,
    greenSignalCount: hits.reduce((sum, item) => sum + item.greenSignals.length, 0),
    hits: hits.slice(0, 80),
    topLevelGroups: topLevelCanvasGroups(stage, rendererPoint, scenePoint)
  };
}

export function collectArtifactPointProbe(x, y) {
  return {
    capturedAt: new Date().toISOString(),
    dom: collectDomPointProbe(x, y),
    canvas: collectCanvasPointProbe(x, y)
  };
}

function collectGreenDomCandidates() {
  if (!globalThis.document?.body || !globalThis.getComputedStyle) return [];
  const candidates = [];
  const elements = Array.from(document.body.querySelectorAll("*")).slice(0, 7000);
  for (const element of elements) {
    const rect = element.getBoundingClientRect?.();
    if (!rect || !rectIntersectsViewport(rect)) continue;
    if (rect.width < 20 || rect.height < 20 || rect.width * rect.height < 5000) continue;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0) continue;
    const before = pseudoTelemetry(element, "::before");
    const after = pseudoTelemetry(element, "::after");
    if (!isStrongGreen(style.backgroundColor) && !before?.green && !after?.green) continue;
    candidates.push({
      ...domIdentity(element),
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      pseudoBefore: before?.background ?? "",
      pseudoAfter: after?.background ?? "",
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

export async function collectSceneDiagnostics(scene, { pointProbe = null, canvasPointProbe = null } = {}) {
  if (!scene) {
    const domGreen = collectGreenDomCandidates();
    return {
      available: false,
      message: "The managed Ghost Ship scene is not currently installed in this world.",
      greenDomCandidates: domGreen,
      greenArtifactCandidates: domGreen.length,
      pointProbe,
      canvasPointProbe,
      raw: { available: false, greenDomCandidates: domGreen, pointProbe, canvasPointProbe }
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
  const pickedPoint = pointProbe ?? null;
  const pickedCanvasPoint = canvasPointProbe ?? null;
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
  if (pickedPoint?.stack?.length) warnings.push(`Direct artifact-point probe captured ${pickedPoint.stack.length} DOM layer(s) at x${pickedPoint.x}, y${pickedPoint.y}; inspect the point stack and matching CSS rules.`);
  if (pickedCanvasPoint?.hitCount) warnings.push(`Canvas/PIXI point probe matched ${pickedCanvasPoint.hitCount} display object(s); inspect render-tree hits, parent chains, bounds, and green color signals.`);

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
    pointProbe: pickedPoint,
    canvasPointProbe: pickedCanvasPoint,
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
    pointProbe: pickedPoint,
    canvasPointProbe: pickedCanvasPoint,
    greenArtifactCandidates: greenSceneCandidates.length + greenDomCandidates.length,
    artifactAssessment: pickedCanvasPoint?.hitCount
      ? `A canvas/PIXI render-tree probe matched ${pickedCanvasPoint.hitCount} display object(s) at the picked point. Use those render-tree hits as the primary artifact evidence.`
      : pickedPoint?.stack?.length
      ? `A direct DOM stack was captured at x${pickedPoint.x}, y${pickedPoint.y}. Use that stack and its matching CSS rules as the primary artifact evidence.`
      : greenSceneCandidates.length
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
