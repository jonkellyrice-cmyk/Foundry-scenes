import {
  ensureGhostShipScene,
  rebuildGhostShipScene,
  getGhostShipSceneData
} from "./orphaned-sun-scenes.mjs";
import {
  loadComicDraft,
  saveComicDraft,
  comicContext,
  addFilesToComicDraft,
  addPathToComicDraft,
  removeComicPanel,
  moveComicPanel,
  clearComicDraft,
  createComicBookScene
} from "./comic-book-maker.mjs";
import { collectSceneDiagnostics, collectArtifactPointProbe, diagnosticsClipboardText } from "./scene-diagnostics.mjs";

const MODULE_ID = "orphaned-sun-scenes";
const APP_ID = `${MODULE_ID}-scene-library`;
const TOOLBAR_CONTROL = `${MODULE_ID}-control`;
const GHOST_SHIP_KEY = "signatory-ghost-ship";

function diagnosticProbeStorageKey() {
  const worldId = game.world?.id ?? "world";
  const userId = game.user?.id ?? "user";
  return `${MODULE_ID}:diagnostic-artifact-probe:${worldId}:${userId}`;
}

function loadDiagnosticPointProbe() {
  try {
    const raw = globalThis.sessionStorage?.getItem(diagnosticProbeStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveDiagnosticPointProbe(probe) {
  try {
    if (!probe) {
      globalThis.sessionStorage?.removeItem(diagnosticProbeStorageKey());
      return;
    }
    globalThis.sessionStorage?.setItem(diagnosticProbeStorageKey(), JSON.stringify(probe));
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not persist diagnostic artifact probe`, error);
  }
}

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const SCENE_LIBRARY = new Map([
  [GHOST_SHIP_KEY, {
    key: GHOST_SHIP_KEY,
    title: "Signatory Ghost Ship",
    subtitle: "Derelict Accord Vessel",
    description: "A pre-walled horror exploration scene with doors, fog-of-war, and sparse wall-constrained dynamic lighting.",
    build: getGhostShipSceneData,
    ensure: ensureGhostShipScene,
    rebuild: rebuildGhostShipScene,
    tags: ["Ghost Ship", "Exploration", "Horror"]
  }]
]);

function moduleVersion() {
  return game.modules.get(MODULE_ID)?.version ?? "unknown";
}

function findManagedScene(key) {
  return game.scenes.find(scene => scene.getFlag(MODULE_ID, "sceneKey") === key) ?? null;
}

function sceneDescriptor(entry) {
  const template = entry.build();
  const scene = findManagedScene(entry.key);
  const sourceWalls = scene ? Array.from(scene.walls ?? []) : (template.walls ?? []);
  const sourceLights = scene ? Array.from(scene.lights ?? []) : (template.lights ?? []);
  const doors = sourceWalls.filter(wall => Number(wall.door ?? wall?.toObject?.().door ?? 0) > 0).length;

  return {
    key: entry.key,
    title: entry.title,
    subtitle: entry.subtitle,
    description: entry.description,
    preview: template.background?.src ?? "",
    tags: entry.tags,
    installed: Boolean(scene),
    worldId: scene?.id ?? null,
    worldName: scene?.name ?? null,
    sourceVersion: scene?.getFlag(MODULE_ID, "sourceVersion") ?? template.flags?.[MODULE_ID]?.sourceVersion ?? moduleVersion(),
    wallCount: sourceWalls.length,
    lightCount: sourceLights.length,
    doorCount: doors
  };
}

function entryForTarget(target) {
  const key = target.closest("[data-scene-key]")?.dataset.sceneKey;
  return key ? SCENE_LIBRARY.get(key) ?? null : null;
}

function sceneForTarget(target) {
  const entry = entryForTarget(target);
  return entry ? findManagedScene(entry.key) : null;
}

function uniqueSceneName(baseName) {
  const names = new Set(game.scenes.map(scene => scene.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

async function confirmAction(title, content) {
  return DialogV2.confirm({
    window: { title },
    content,
    rejectClose: false,
    modal: true
  });
}

async function activateSceneLayer(scene, control) {
  await scene.view();
  await ui.controls.activate({ control });
}

export class OrphanedSunSceneLibrary extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.activeTab = "scenes";
    this.comicDraft = loadComicDraft();
    this.diagnosticPointProbe = loadDiagnosticPointProbe();
    this._diagnosticPickCleanup = null;
  }

  static DEFAULT_OPTIONS = {
    id: APP_ID,
    classes: ["orphaned-sun-scene-library"],
    position: { width: 720, height: 640 },
    window: {
      title: "Orphaned Sun GM Tools",
      icon: "fa-solid fa-map-location-dot",
      frame: true,
      positioned: true,
      minimizable: true,
      resizable: true,
      contentClasses: ["orphaned-sun-scene-library-content"]
    },
    actions: {
      importScene: OrphanedSunSceneLibrary.importScene,
      openScene: OrphanedSunSceneLibrary.openScene,
      configureScene: OrphanedSunSceneLibrary.configureScene,
      editWalls: OrphanedSunSceneLibrary.editWalls,
      editLighting: OrphanedSunSceneLibrary.editLighting,
      duplicateScene: OrphanedSunSceneLibrary.duplicateScene,
      restoreScene: OrphanedSunSceneLibrary.restoreScene,
      removeScene: OrphanedSunSceneLibrary.removeScene,
      toggleAutoCreate: OrphanedSunSceneLibrary.toggleAutoCreate,
      refresh: OrphanedSunSceneLibrary.refresh,
      showScenes: OrphanedSunSceneLibrary.showScenes,
      showDiagnostics: OrphanedSunSceneLibrary.showDiagnostics,
      diagnosticsRefresh: OrphanedSunSceneLibrary.diagnosticsRefresh,
      diagnosticsPickPoint: OrphanedSunSceneLibrary.diagnosticsPickPoint,
      diagnosticsCopy: OrphanedSunSceneLibrary.diagnosticsCopy,
      showComic: OrphanedSunSceneLibrary.showComic,
      comicChooseFiles: OrphanedSunSceneLibrary.comicChooseFiles,
      comicAddPath: OrphanedSunSceneLibrary.comicAddPath,
      comicRemovePanel: OrphanedSunSceneLibrary.comicRemovePanel,
      comicMoveUp: OrphanedSunSceneLibrary.comicMoveUp,
      comicMoveDown: OrphanedSunSceneLibrary.comicMoveDown,
      comicClear: OrphanedSunSceneLibrary.comicClear,
      comicExport: OrphanedSunSceneLibrary.comicExport
    }
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/scene-library.hbs`
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const scenes = Array.from(SCENE_LIBRARY.values()).map(sceneDescriptor);
    const diagnostics = this.activeTab === "diagnostics"
      ? await collectSceneDiagnostics(findManagedScene(GHOST_SHIP_KEY), {
          pointProbe: this.diagnosticPointProbe?.dom ?? null,
          canvasPointProbe: this.diagnosticPointProbe?.canvas ?? null
        })
      : null;
    return {
      ...context,
      moduleVersion: moduleVersion(),
      autoCreate: game.settings.get(MODULE_ID, "autoCreateGhostShip"),
      sceneCount: scenes.length,
      installedCount: scenes.filter(scene => scene.installed).length,
      scenes,
      tabScenes: this.activeTab === "scenes",
      tabDiagnostics: this.activeTab === "diagnostics",
      tabComic: this.activeTab === "comic",
      diagnostics,
      comic: comicContext(this.comicDraft)
    };
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    if (this.activeTab !== "comic") return;

    const title = this.element.querySelector('[name="comicTitle"]');
    const layout = this.element.querySelector('[name="comicLayout"]');
    const orientation = this.element.querySelector('[name="comicOrientation"]');
    const fileInput = this.element.querySelector('[data-comic-files]');
    const dropzone = this.element.querySelector('[data-comic-dropzone]');

    title?.addEventListener("change", async event => {
      this.comicDraft.title = event.currentTarget.value;
      this.comicDraft = await saveComicDraft(this.comicDraft);
      await this.render({ force: true });
    });
    layout?.addEventListener("change", async event => {
      this.comicDraft.layout = event.currentTarget.value;
      this.comicDraft = await saveComicDraft(this.comicDraft);
      await this.render({ force: true });
    });
    orientation?.addEventListener("change", async event => {
      this.comicDraft.orientation = event.currentTarget.value;
      this.comicDraft = await saveComicDraft(this.comicDraft);
      await this.render({ force: true });
    });
    fileInput?.addEventListener("change", async event => {
      await this._handleComicFiles(event.currentTarget.files);
      event.currentTarget.value = "";
    });
    dropzone?.addEventListener("dragover", event => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone?.addEventListener("drop", async event => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      await this._handleComicFiles(event.dataTransfer?.files);
    });
  }

  async _handleComicFiles(files) {
    try {
      this.comicDraft = await addFilesToComicDraft(this.comicDraft, files);
      await this.render({ force: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Comic image upload failed`, error);
      ui.notifications?.error(`Comic image upload failed: ${error.message}`);
    }
  }

  static async showScenes() {
    this.activeTab = "scenes";
    await this.render({ force: true });
  }

  static async showDiagnostics() {
    this.activeTab = "diagnostics";
    await this.render({ force: true });
  }

  static async diagnosticsRefresh() {
    this.activeTab = "diagnostics";
    await this.render({ force: true });
  }

  static async diagnosticsPickPoint() {
    this.activeTab = "diagnostics";
    this._diagnosticPickCleanup?.();

    const body = document.body;
    body?.classList.add("os-diagnostic-pick-mode");
    ui.notifications?.info("Artifact picker armed. Click directly on the green strip; press Escape to cancel.");

    let active = true;
    const cleanup = () => {
      if (!active) return;
      active = false;
      body?.classList.remove("os-diagnostic-pick-mode");
      document.removeEventListener("pointerdown", handlePoint, true);
      document.removeEventListener("keydown", handleKey, true);
      this._diagnosticPickCleanup = null;
    };

    const handlePoint = async event => {
      if (this.element?.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cleanup();
      this.diagnosticPointProbe = collectArtifactPointProbe(event.clientX, event.clientY);
      saveDiagnosticPointProbe(this.diagnosticPointProbe);
      const domPoint = this.diagnosticPointProbe.dom;
      const canvasHits = this.diagnosticPointProbe.canvas?.hitCount ?? 0;
      ui.notifications?.info(`Captured artifact point at x${domPoint.x}, y${domPoint.y} with ${canvasHits} canvas/PIXI render hit(s).`);
      await this.render({ force: true });
    };

    const handleKey = event => {
      if (event.key !== "Escape") return;
      cleanup();
      ui.notifications?.info("Artifact picker cancelled.");
    };

    this._diagnosticPickCleanup = cleanup;
    setTimeout(() => {
      if (!active) return;
      document.addEventListener("pointerdown", handlePoint, true);
      document.addEventListener("keydown", handleKey, true);
    }, 0);
  }

  static async diagnosticsCopy() {
    try {
      const probe = this.diagnosticPointProbe ?? loadDiagnosticPointProbe();
      const diagnostics = await collectSceneDiagnostics(findManagedScene(GHOST_SHIP_KEY), {
        pointProbe: probe?.dom ?? null,
        canvasPointProbe: probe?.canvas ?? null
      });
      await navigator.clipboard.writeText(diagnosticsClipboardText(diagnostics));
      ui.notifications?.info("Scene diagnostics copied to clipboard.");
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to copy diagnostics`, error);
      ui.notifications?.warn(`Could not copy diagnostics: ${error?.message ?? error}`);
    }
  }

  static async showComic() {
    this.activeTab = "comic";
    this.comicDraft = loadComicDraft();
    await this.render({ force: true });
  }

  static async comicChooseFiles() {
    this.element.querySelector('[data-comic-files]')?.click();
  }

  static async comicAddPath() {
    const input = this.element.querySelector('[name="comicImagePath"]');
    try {
      this.comicDraft = await addPathToComicDraft(this.comicDraft, input?.value ?? "");
      if (input) input.value = "";
      await this.render({ force: true });
    } catch (error) {
      ui.notifications?.warn(error.message);
    }
  }

  static async comicRemovePanel(_event, target) {
    const panelId = target.closest("[data-panel-id]")?.dataset.panelId;
    if (!panelId) return;
    this.comicDraft = await removeComicPanel(this.comicDraft, panelId);
    await this.render({ force: true });
  }

  static async comicMoveUp(_event, target) {
    const panelId = target.closest("[data-panel-id]")?.dataset.panelId;
    if (!panelId) return;
    this.comicDraft = await moveComicPanel(this.comicDraft, panelId, -1);
    await this.render({ force: true });
  }

  static async comicMoveDown(_event, target) {
    const panelId = target.closest("[data-panel-id]")?.dataset.panelId;
    if (!panelId) return;
    this.comicDraft = await moveComicPanel(this.comicDraft, panelId, 1);
    await this.render({ force: true });
  }

  static async comicClear() {
    const proceed = await confirmAction(
      "Clear comic draft?",
      "<p>This clears the current panel list and layout choices. Uploaded image files remain in Foundry storage.</p>"
    );
    if (!proceed) return;
    this.comicDraft = await clearComicDraft();
    await this.render({ force: true });
  }

  static async comicExport() {
    try {
      this.comicDraft = await saveComicDraft(this.comicDraft);
      const scene = await createComicBookScene(this.comicDraft);
      await scene.view();
    } catch (error) {
      console.error(`${MODULE_ID} | Comic scene export failed`, error);
      ui.notifications?.error(`Comic scene export failed: ${error.message}`);
    }
  }

  static async importScene(_event, target) {
    const entry = entryForTarget(target);
    if (!entry) return;
    const existing = findManagedScene(entry.key);
    if (existing) {
      ui.notifications?.info(`${entry.title} is already in this world.`);
      await this.render({ force: true });
      return;
    }
    const scene = await entry.ensure();
    await scene.view();
    await this.render({ force: true });
  }

  static async openScene(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) {
      ui.notifications?.warn("Import this scene before opening it.");
      return;
    }
    await scene.view();
  }

  static async configureScene(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) {
      ui.notifications?.warn("Import this scene before configuring it.");
      return;
    }
    await scene.sheet.render({ force: true });
  }

  static async editWalls(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) {
      ui.notifications?.warn("Import this scene before editing its walls.");
      return;
    }
    await activateSceneLayer(scene, "walls");
  }

  static async editLighting(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) {
      ui.notifications?.warn("Import this scene before editing its lighting.");
      return;
    }
    await activateSceneLayer(scene, "lighting");
  }

  static async duplicateScene(_event, target) {
    const entry = entryForTarget(target);
    const scene = sceneForTarget(target);
    if (!entry || !scene) {
      ui.notifications?.warn("Import this scene before creating a working copy.");
      return;
    }

    const data = scene.toObject();
    delete data._id;
    data.name = uniqueSceneName(`${scene.name} — Working Copy`);
    data.active = false;
    data.navigation = true;
    data.flags ??= {};
    data.flags[MODULE_ID] = {
      templateKey: entry.key,
      sourceVersion: scene.getFlag(MODULE_ID, "sourceVersion") ?? moduleVersion(),
      workingCopy: true
    };

    const copy = await Scene.create(data);
    ui.notifications?.info(`Created editable working copy: ${copy.name}`);
    await copy.view();
    await this.render({ force: true });
  }

  static async restoreScene(_event, target) {
    const entry = entryForTarget(target);
    const scene = sceneForTarget(target);
    if (!entry || !scene) return;

    const proceed = await confirmAction(
      `Restore ${entry.title}?`,
      `<p>This will delete the module-managed world copy and recreate it from the bundled template.</p><p><strong>Any edits made directly to that managed scene will be lost.</strong> Create a Working Copy first if you want to preserve them.</p>`
    );
    if (!proceed) return;

    const restored = await entry.rebuild();
    await restored.view();
    await this.render({ force: true });
  }

  static async removeScene(_event, target) {
    const entry = entryForTarget(target);
    const scene = sceneForTarget(target);
    if (!entry || !scene) return;

    const proceed = await confirmAction(
      `Remove ${entry.title} from this world?`,
      `<p>This removes only the module-managed scene from this world. The bundled template remains available in the Scene Library and can be imported again later.</p><p>Independent Working Copies are not removed.</p>`
    );
    if (!proceed) return;

    await scene.delete();
    ui.notifications?.info(`${entry.title} removed from this world.`);
    await this.render({ force: true });
  }

  static async toggleAutoCreate() {
    const current = game.settings.get(MODULE_ID, "autoCreateGhostShip");
    await game.settings.set(MODULE_ID, "autoCreateGhostShip", !current);
    ui.notifications?.info(`Automatic first-scene creation ${current ? "disabled" : "enabled"}.`);
    await this.render({ force: true });
  }

  static async refresh() {
    await this.render({ force: true });
  }
}

export async function openSceneLibrary() {
  if (!game.user?.isGM) {
    ui.notifications?.warn("Only a GM can manage Orphaned Sun scenes.");
    return null;
  }

  const existing = foundry.applications.instances.get(APP_ID);
  if (existing) {
    if (existing.minimized) await existing.maximize();
    existing.bringToFront();
    await existing.render({ force: true });
    return existing;
  }

  const app = new OrphanedSunSceneLibrary();
  await app.render({ force: true });
  return app;
}

Hooks.on("getSceneControlButtons", controls => {
  if (!game.user?.isGM) return;

  const maxOrder = Math.max(0, ...Object.values(controls).map(control => Number(control.order ?? 0)));
  controls[TOOLBAR_CONTROL] = {
    name: TOOLBAR_CONTROL,
    title: "Orphaned Sun GM Tools",
    icon: "fa-solid fa-book-open",
    order: maxOrder + 10,
    visible: true,
    activeTool: "library",
    tools: {
      library: {
        name: "library",
        title: "Open Orphaned Sun GM Tools",
        icon: "fa-solid fa-book-open",
        order: 0,
        button: true,
        visible: true,
        onChange: () => openSceneLibrary()
      }
    },
    onChange: (_event, active) => {
      if (active) openSceneLibrary();
    }
  };
});

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;
  module.api ??= {};
  Object.assign(module.api, {
    openSceneLibrary,
    openGMTools: openSceneLibrary,
    OrphanedSunSceneLibrary,
    sceneLibrary: SCENE_LIBRARY,
    createComicBookScene
  });
});
