const MODULE_ID = "orphaned-sun-scenes";
const DRAFT_SETTING = "comicBookDraft";
const PAPER_TEXTURE = `modules/${MODULE_ID}/assets/comic/paper.svg`;
const FRAME_TEXTURE = `modules/${MODULE_ID}/assets/comic/frame.svg`;
const PAGE_MARGIN = 54;
const PANEL_GUTTER = 20;
const FRAME_INSET = 9;

const PAGE_FORMATS = Object.freeze({
  landscape: { id: "landscape", label: "Landscape 16:9", width: 1920, height: 1080 },
  portrait: { id: "portrait", label: "Portrait comic page", width: 1400, height: 1960 }
});

const LAYOUTS = Object.freeze({
  single: {
    id: "single",
    label: "1 — Full page",
    capacity: 1,
    slots: [[0, 0, 1, 1]]
  },
  "two-columns": {
    id: "two-columns",
    label: "2 — Side by side",
    capacity: 2,
    slots: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]]
  },
  "two-rows": {
    id: "two-rows",
    label: "2 — Stacked",
    capacity: 2,
    slots: [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]]
  },
  "three-feature": {
    id: "three-feature",
    label: "3 — Wide lead + two",
    capacity: 3,
    slots: [[0, 0, 1, 0.52], [0, 0.52, 0.5, 0.48], [0.5, 0.52, 0.5, 0.48]]
  },
  "four-grid": {
    id: "four-grid",
    label: "4 — 2 × 2",
    capacity: 4,
    slots: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]
  },
  "five-feature": {
    id: "five-feature",
    label: "5 — Wide lead + four",
    capacity: 5,
    slots: [
      [0, 0, 1, 0.40],
      [0, 0.40, 0.5, 0.30], [0.5, 0.40, 0.5, 0.30],
      [0, 0.70, 0.5, 0.30], [0.5, 0.70, 0.5, 0.30]
    ]
  },
  "six-grid": {
    id: "six-grid",
    label: "6 — 2 × 3",
    capacity: 6,
    slots: [
      [0, 0, 0.5, 1 / 3], [0.5, 0, 0.5, 1 / 3],
      [0, 1 / 3, 0.5, 1 / 3], [0.5, 1 / 3, 0.5, 1 / 3],
      [0, 2 / 3, 0.5, 1 / 3], [0.5, 2 / 3, 0.5, 1 / 3]
    ]
  },
  "six-cinematic": {
    id: "six-cinematic",
    label: "6 — Cinematic lead",
    capacity: 6,
    slots: [
      [0, 0, 1, 0.38],
      [0, 0.38, 0.5, 0.31], [0.5, 0.38, 0.5, 0.31],
      [0, 0.69, 1 / 3, 0.31], [1 / 3, 0.69, 1 / 3, 0.31], [2 / 3, 0.69, 1 / 3, 0.31]
    ]
  }
});

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, DRAFT_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: makeDefaultComicDraft()
  });
});

export function makeDefaultComicDraft() {
  return {
    title: "Comic Book Scene",
    orientation: "landscape",
    layout: "six-grid",
    panels: []
  };
}

function clone(value) {
  return foundry.utils.deepClone(value);
}

function normalizePanel(panel, index) {
  return {
    id: String(panel?.id ?? foundry.utils.randomID()),
    src: String(panel?.src ?? ""),
    label: String(panel?.label ?? `Panel ${index + 1}`)
  };
}

export function loadComicDraft() {
  const stored = clone(game.settings.get(MODULE_ID, DRAFT_SETTING) ?? makeDefaultComicDraft());
  const orientation = PAGE_FORMATS[stored.orientation] ? stored.orientation : "landscape";
  const layout = LAYOUTS[stored.layout] ? stored.layout : "six-grid";
  return {
    title: String(stored.title || "Comic Book Scene"),
    orientation,
    layout,
    panels: Array.isArray(stored.panels) ? stored.panels.map(normalizePanel) : []
  };
}

export async function saveComicDraft(draft) {
  const normalized = {
    title: String(draft?.title || "Comic Book Scene"),
    orientation: PAGE_FORMATS[draft?.orientation] ? draft.orientation : "landscape",
    layout: LAYOUTS[draft?.layout] ? draft.layout : "six-grid",
    panels: Array.isArray(draft?.panels) ? draft.panels.map(normalizePanel) : []
  };
  await game.settings.set(MODULE_ID, DRAFT_SETTING, normalized);
  return normalized;
}

export function getComicLayouts() {
  return Object.values(LAYOUTS).map(layout => ({ ...layout }));
}

export function getComicPageFormats() {
  return Object.values(PAGE_FORMATS).map(format => ({ ...format }));
}

function chooseLayoutForCount(count, currentId) {
  const current = LAYOUTS[currentId];
  if (current && count <= current.capacity) return currentId;
  const firstFit = Object.values(LAYOUTS).find(layout => layout.capacity >= count);
  return firstFit?.id ?? currentId;
}

export function getLayoutGeometry(draft) {
  const page = PAGE_FORMATS[draft.orientation] ?? PAGE_FORMATS.landscape;
  const layout = LAYOUTS[draft.layout] ?? LAYOUTS["six-grid"];
  const contentWidth = page.width - (PAGE_MARGIN * 2) + PANEL_GUTTER;
  const contentHeight = page.height - (PAGE_MARGIN * 2) + PANEL_GUTTER;

  const slots = layout.slots.map(([nx, ny, nw, nh], index) => {
    const x = Math.round(PAGE_MARGIN + (nx * contentWidth));
    const y = Math.round(PAGE_MARGIN + (ny * contentHeight));
    const width = Math.max(50, Math.round((nw * contentWidth) - PANEL_GUTTER));
    const height = Math.max(50, Math.round((nh * contentHeight) - PANEL_GUTTER));
    return { index, x, y, width, height };
  });

  return { page, layout, slots };
}

export function comicContext(draft) {
  const geometry = getLayoutGeometry(draft);
  const panels = draft.panels.map((panel, index) => {
    const slot = geometry.slots[index] ?? null;
    return {
      ...panel,
      number: index + 1,
      hasSlot: Boolean(slot),
      previewStyle: slot
        ? `left:${((slot.x / geometry.page.width) * 100).toFixed(3)}%;top:${((slot.y / geometry.page.height) * 100).toFixed(3)}%;width:${((slot.width / geometry.page.width) * 100).toFixed(3)}%;height:${((slot.height / geometry.page.height) * 100).toFixed(3)}%;`
        : ""
    };
  });

  return {
    draft,
    panels,
    panelCount: panels.length,
    capacity: geometry.layout.capacity,
    overCapacity: panels.length > geometry.layout.capacity,
    pageAspect: `${geometry.page.width} / ${geometry.page.height}`,
    layouts: getComicLayouts().map(layout => ({ ...layout, selected: layout.id === draft.layout })),
    orientations: getComicPageFormats().map(format => ({ ...format, selected: format.id === draft.orientation }))
  };
}

function sanitizeFilename(name) {
  const raw = String(name || "panel-image").trim();
  const dot = raw.lastIndexOf(".");
  const extension = dot > 0 ? raw.slice(dot).replace(/[^.a-zA-Z0-9]/g, "") : "";
  const stem = (dot > 0 ? raw.slice(0, dot) : raw)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "panel-image";
  return { stem, extension };
}

async function ensureUploadDirectory() {
  const FilePicker = foundry.applications.apps.FilePicker?.implementation ?? globalThis.FilePicker;
  const worldId = game.world?.id;
  if (!FilePicker || !worldId) throw new Error("Foundry FilePicker or world ID is unavailable.");

  const paths = [
    `worlds/${worldId}/orphaned-sun-scenes`,
    `worlds/${worldId}/orphaned-sun-scenes/comics`
  ];
  for (const path of paths) {
    try {
      await FilePicker.createDirectory("data", path, {});
    } catch (error) {
      if (!/exists/i.test(String(error?.message ?? error))) {
        console.warn(`${MODULE_ID} | Could not create ${path}`, error);
      }
    }
  }
  return { FilePicker, dir: paths.at(-1) };
}

export async function uploadComicFiles(files) {
  if (!game.user?.isGM) throw new Error("Only a GM can upload comic panel art.");
  const accepted = Array.from(files ?? []).filter(file => file?.type?.startsWith?.("image/"));
  if (!accepted.length) return [];
  const { FilePicker, dir } = await ensureUploadDirectory();
  const uploaded = [];

  for (let index = 0; index < accepted.length; index += 1) {
    const source = accepted[index];
    const { stem, extension } = sanitizeFilename(source.name);
    const filename = `${Date.now()}-${index + 1}-${stem}${extension}`;
    const renamed = new File([source], filename, { type: source.type || "application/octet-stream" });
    const response = await FilePicker.upload("data", dir, renamed, {}, { notify: false });
    const src = typeof response?.path === "string" ? response.path : `${dir}/${filename}`;
    uploaded.push({ id: foundry.utils.randomID(), src, label: source.name || `Panel ${index + 1}` });
  }

  return uploaded;
}

export async function addFilesToComicDraft(draft, files) {
  const additions = await uploadComicFiles(files);
  if (!additions.length) return draft;
  draft.panels.push(...additions);
  draft.layout = chooseLayoutForCount(draft.panels.length, draft.layout);
  return saveComicDraft(draft);
}

export async function addPathToComicDraft(draft, src, label = "") {
  const path = String(src ?? "").trim();
  if (!path) throw new Error("Enter an image path or URL first.");
  draft.panels.push({ id: foundry.utils.randomID(), src: path, label: String(label || path.split("/").at(-1) || "Panel") });
  draft.layout = chooseLayoutForCount(draft.panels.length, draft.layout);
  return saveComicDraft(draft);
}

export async function removeComicPanel(draft, panelId) {
  draft.panels = draft.panels.filter(panel => panel.id !== panelId);
  return saveComicDraft(draft);
}

export async function moveComicPanel(draft, panelId, delta) {
  const index = draft.panels.findIndex(panel => panel.id === panelId);
  if (index < 0) return draft;
  const next = Math.max(0, Math.min(draft.panels.length - 1, index + delta));
  if (next === index) return draft;
  const [panel] = draft.panels.splice(index, 1);
  draft.panels.splice(next, 0, panel);
  return saveComicDraft(draft);
}

export async function clearComicDraft() {
  const draft = makeDefaultComicDraft();
  await saveComicDraft(draft);
  return draft;
}

function uniqueSceneName(baseName) {
  const names = new Set(game.scenes.map(scene => scene.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function makeTile({ src, x, y, width, height, hidden, locked, sort, fit = "fill", flags = {} }) {
  return {
    texture: { src, fit },
    x,
    y,
    width,
    height,
    elevation: 0,
    sort,
    rotation: 0,
    alpha: 1,
    hidden,
    locked,
    restrictions: { light: false, weather: false },
    flags
  };
}

export async function createComicBookScene(draft) {
  if (!game.user?.isGM) throw new Error("Only a GM can create comic book scenes.");
  if (!draft.panels.length) throw new Error("Add at least one panel image before exporting.");

  const geometry = getLayoutGeometry(draft);
  if (draft.panels.length > geometry.layout.capacity) {
    throw new Error(`The selected layout holds ${geometry.layout.capacity} panels, but the draft has ${draft.panels.length}.`);
  }

  const name = uniqueSceneName(String(draft.title || "Comic Book Scene"));
  const scene = await Scene.create({
    name,
    active: false,
    navigation: true,
    navName: name,
    width: geometry.page.width,
    height: geometry.page.height,
    padding: 0.04,
    backgroundColor: "#111111",
    grid: { type: 0, size: 100, distance: 1, units: "m", color: "#000000", alpha: 0 },
    tokenVision: false,
    fog: { exploration: false },
    initial: { x: Math.round(geometry.page.width / 2), y: Math.round(geometry.page.height / 2), scale: 0.64 },
    flags: {
      [MODULE_ID]: {
        comicBookScene: true,
        comicLayout: draft.layout,
        comicOrientation: draft.orientation,
        panelCount: draft.panels.length
      }
    }
  });

  const tiles = [
    makeTile({
      src: PAPER_TEXTURE,
      x: 0,
      y: 0,
      width: geometry.page.width,
      height: geometry.page.height,
      hidden: false,
      locked: true,
      sort: -1000,
      flags: { [MODULE_ID]: { comicPageBackground: true } }
    })
  ];

  draft.panels.forEach((panel, index) => {
    const slot = geometry.slots[index];
    tiles.push(makeTile({
      src: FRAME_TEXTURE,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      hidden: false,
      locked: true,
      sort: index * 10,
      flags: { [MODULE_ID]: { comicPanelFrame: true, panelOrder: index + 1 } }
    }));
    tiles.push(makeTile({
      src: panel.src,
      x: slot.x + FRAME_INSET,
      y: slot.y + FRAME_INSET,
      width: Math.max(20, slot.width - (FRAME_INSET * 2)),
      height: Math.max(20, slot.height - (FRAME_INSET * 2)),
      hidden: true,
      locked: false,
      sort: (index * 10) + 1,
      fit: "cover",
      flags: {
        [MODULE_ID]: {
          comicPanel: true,
          panelOrder: index + 1,
          panelLabel: panel.label,
          sourcePath: panel.src
        }
      }
    }));
  });

  await scene.createEmbeddedDocuments("Tile", tiles);
  ui.notifications?.info(`Created comic book scene “${scene.name}” with ${draft.panels.length} hidden story panels.`);
  return scene;
}
