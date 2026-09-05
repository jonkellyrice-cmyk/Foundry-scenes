import {
  ensureGhostShipScene,
  rebuildGhostShipScene,
  getGhostShipSceneData
} from "./orphaned-sun-scenes.mjs";

const MODULE_ID = "orphaned-sun-scenes";
const APP_ID = `${MODULE_ID}-scene-library`;
const TOOLBAR_CONTROL = `${MODULE_ID}-control`;
const GHOST_SHIP_KEY = "signatory-ghost-ship";

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
  static DEFAULT_OPTIONS = {
    id: APP_ID,
    classes: ["orphaned-sun-scene-library"],
    position: { width: 720, height: 640 },
    window: {
      title: "Orphaned Sun Scene Library",
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
      refresh: OrphanedSunSceneLibrary.refresh
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
    return {
      ...context,
      moduleVersion: moduleVersion(),
      autoCreate: game.settings.get(MODULE_ID, "autoCreateGhostShip"),
      sceneCount: scenes.length,
      installedCount: scenes.filter(scene => scene.installed).length,
      scenes
    };
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
    title: "Orphaned Sun Scenes",
    icon: "fa-solid fa-map-location-dot",
    order: maxOrder + 10,
    visible: true,
    activeTool: "library",
    tools: {
      library: {
        name: "library",
        title: "Open Orphaned Sun Scene Library",
        icon: "fa-solid fa-folder-open",
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
    OrphanedSunSceneLibrary,
    sceneLibrary: SCENE_LIBRARY
  });
});
