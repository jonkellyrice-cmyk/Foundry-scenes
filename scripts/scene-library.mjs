import {
  fetchLiveSceneRegistry,
  findImportedLiveScene,
  importLiveScene,
  liveSceneDescriptor,
  restoreLiveScene,
  MODULE_ID
} from "./live-scene-feed.mjs";
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

const APP_ID = `${MODULE_ID}-scene-library`;
const TOOLBAR_CONTROL = `${MODULE_ID}-control`;
const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

function moduleVersion() {
  return game.modules.get(MODULE_ID)?.version ?? "unknown";
}

function keyForTarget(target) {
  return target.closest("[data-scene-key]")?.dataset.sceneKey ?? "";
}

function entryForTarget(app, target) {
  const key = keyForTarget(target);
  return key ? app.liveEntries.get(key) ?? null : null;
}

function sceneForTarget(target) {
  const key = keyForTarget(target);
  return key ? findImportedLiveScene(key) : null;
}

function uniqueSceneName(baseName) {
  const names = new Set(game.scenes.map(scene => scene.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

async function confirmAction(title, content) {
  return DialogV2.confirm({ window: { title }, content, rejectClose: false, modal: true });
}

async function activateSceneLayer(scene, control) {
  await scene.view();
  await ui.controls.activate({ control });
}

function formatFeedTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export class OrphanedSunSceneLibrary extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.activeTab = "scenes";
    this.comicDraft = loadComicDraft();
    this.liveEntries = new Map();
    this.feedLoaded = false;
    this.feedError = "";
    this.feedUpdatedAt = "";
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
      refresh: OrphanedSunSceneLibrary.refresh,
      showScenes: OrphanedSunSceneLibrary.showScenes,
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
    body: { template: `modules/${MODULE_ID}/templates/scene-library.hbs` }
  };

  async _reloadLiveEntries({ notify = false } = {}) {
    try {
      const registry = await fetchLiveSceneRegistry();
      this.liveEntries = new Map(registry.scenes.map(entry => [entry.key, entry]));
      this.feedLoaded = true;
      this.feedError = "";
      this.feedUpdatedAt = registry.scenes.map(entry => entry.updatedAt).filter(Boolean).sort().at(-1) ?? "";
      if (notify) ui.notifications?.info(`Scene feed refreshed: ${registry.scenes.length} published scene${registry.scenes.length === 1 ? "" : "s"}.`);
      return registry;
    } catch (error) {
      this.feedLoaded = true;
      this.feedError = error?.message ?? String(error);
      console.error(`${MODULE_ID} | Live scene feed refresh failed`, error);
      if (notify) ui.notifications?.warn(`Could not refresh the live scene feed: ${this.feedError}`);
      return { schemaVersion: 1, scenes: Array.from(this.liveEntries.values()) };
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (this.activeTab === "scenes" && !this.feedLoaded) await this._reloadLiveEntries();
    const scenes = Array.from(this.liveEntries.values())
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map(liveSceneDescriptor);
    return {
      ...context,
      moduleVersion: moduleVersion(),
      sceneCount: scenes.length,
      installedCount: scenes.filter(scene => scene.installed).length,
      scenes,
      feedLoaded: this.feedLoaded,
      feedError: this.feedError,
      feedHealthy: this.feedLoaded && !this.feedError,
      feedUpdatedAt: formatFeedTimestamp(this.feedUpdatedAt),
      tabScenes: this.activeTab === "scenes",
      tabComic: this.activeTab === "comic",
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
    if (!this.feedLoaded) await this._reloadLiveEntries();
    await this.render({ force: true });
  }

  static async showComic() {
    this.activeTab = "comic";
    this.comicDraft = loadComicDraft();
    await this.render({ force: true });
  }

  static async refresh() {
    await this._reloadLiveEntries({ notify: true });
    await this.render({ force: true });
  }

  static async importScene(_event, target) {
    const entry = entryForTarget(this, target);
    if (!entry) return;
    const existing = findImportedLiveScene(entry.key);
    if (existing) {
      ui.notifications?.info(`${entry.name} is already in this world.`);
      await this.render({ force: true });
      return;
    }
    try {
      ui.notifications?.info(`Importing ${entry.name} from the live scene feed…`);
      const scene = await importLiveScene(entry);
      await scene.view();
      ui.notifications?.info(`${entry.name} imported into this world.`);
      await this.render({ force: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Live scene import failed`, error);
      ui.notifications?.error(`Could not import ${entry.name}: ${error?.message ?? error}`);
    }
  }

  static async openScene(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) return ui.notifications?.warn("Import this scene before opening it.");
    await scene.view();
  }

  static async configureScene(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) return ui.notifications?.warn("Import this scene before configuring it.");
    await scene.sheet.render({ force: true });
  }

  static async editWalls(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) return ui.notifications?.warn("Import this scene before editing its walls.");
    await activateSceneLayer(scene, "walls");
  }

  static async editLighting(_event, target) {
    const scene = sceneForTarget(target);
    if (!scene) return ui.notifications?.warn("Import this scene before editing its lighting.");
    await activateSceneLayer(scene, "lighting");
  }

  static async duplicateScene(_event, target) {
    const entry = entryForTarget(this, target);
    const scene = sceneForTarget(target);
    if (!entry || !scene) return ui.notifications?.warn("Import this scene before creating a working copy.");
    const data = scene.toObject();
    delete data._id;
    data.name = uniqueSceneName(`${scene.name} — Working Copy`);
    data.active = false;
    data.navigation = true;
    data.flags ??= {};
    data.flags[MODULE_ID] = {
      ...(data.flags[MODULE_ID] ?? {}),
      liveScene: false,
      templateKey: entry.key,
      workingCopy: true
    };
    const copy = await Scene.create(data);
    ui.notifications?.info(`Created editable working copy: ${copy.name}`);
    await copy.view();
    await this.render({ force: true });
  }

  static async restoreScene(_event, target) {
    const entry = entryForTarget(this, target);
    const scene = sceneForTarget(target);
    if (!entry || !scene) return;
    const currentRevision = Number(scene.getFlag(MODULE_ID, "sourceRevision") ?? 0);
    const proceed = await confirmAction(
      `${currentRevision < entry.revision ? "Update" : "Restore"} ${entry.name}?`,
      `<p>This deletes the managed world copy and re-imports revision ${entry.revision} from the live scene feed.</p><p><strong>Edits made directly to the managed scene will be lost.</strong> Create a Working Copy first if you want to preserve them.</p>`
    );
    if (!proceed) return;
    try {
      const restored = await restoreLiveScene(entry);
      await restored.view();
      ui.notifications?.info(`${entry.name} restored from published revision ${entry.revision}.`);
      await this.render({ force: true });
    } catch (error) {
      console.error(`${MODULE_ID} | Live scene restore failed`, error);
      ui.notifications?.error(`Could not restore ${entry.name}: ${error?.message ?? error}`);
    }
  }

  static async removeScene(_event, target) {
    const entry = entryForTarget(this, target);
    const scene = sceneForTarget(target);
    if (!entry || !scene) return;
    const proceed = await confirmAction(
      `Remove ${entry.name} from this world?`,
      "<p>This removes only the managed world copy. The published scene remains in the live Scene Library and can be imported again later.</p><p>Independent Working Copies are not removed.</p>"
    );
    if (!proceed) return;
    await scene.delete();
    ui.notifications?.info(`${entry.name} removed from this world.`);
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
    const proceed = await confirmAction("Clear comic draft?", "<p>This clears the current panel list and layout choices. Uploaded image files remain in Foundry storage.</p>");
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
    await existing._reloadLiveEntries();
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
    onChange: (_event, active) => { if (active) openSceneLibrary(); }
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
    fetchLiveSceneRegistry,
    importLiveScene,
    createComicBookScene
  });
});
