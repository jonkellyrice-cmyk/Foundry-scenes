# Orphaned Sun — Foundry Scenes

Foundry VTT v13 content module for prebuilt **Orphaned Sun** scenes with bundled artwork, walls, doors, fog-of-war vision, dynamic lighting, and a GM-facing Scene Library UI.

## Install on Foundry / The Forge

Paste this manifest URL into the module installer:

`https://raw.githubusercontent.com/jonkellyrice-cmyk/Foundry-scenes/main/module.json`

The manifest points to a proper GitHub Release asset whose ZIP has `module.json` at the archive root, so Foundry and The Forge can install it directly.

Then enable **Orphaned Sun — Foundry Scenes** in the Lancer world.

## Releases

Publishing is automated. Changing the versioned `module.json` on `main` runs the release workflow, validates the module package, builds `orphaned-sun-scenes.zip`, and creates or refreshes the matching GitHub Release. The stable download target used by the manifest is:

`https://github.com/jonkellyrice-cmyk/Foundry-scenes/releases/latest/download/orphaned-sun-scenes.zip`

## Scene Library UI

For GMs, the module adds an **Orphaned Sun Scenes** icon at the bottom of Foundry's left-hand Scene Controls toolbar. Clicking it opens a normal movable Foundry window which can be resized, minimized, restored, and closed.

The Scene Library shows every scene bundled with the module and whether that scene is already present in the current world. From the library you can:

- import a bundled scene into the world;
- open the world scene;
- jump directly to the Walls layer;
- jump directly to the Lighting layer;
- open normal Foundry Scene Configuration;
- create an independent Working Copy of the current scene;
- restore the module-managed scene to the bundled version;
- remove the module-managed scene from the world without removing Working Copies;
- enable or disable automatic creation of the initial bundled scene.

Once imported, the scene is an ordinary Foundry Scene. You can freely edit its walls, lights, doors, tokens, sounds, tiles, regions, and scene settings. The module does not silently overwrite those edits.

## Signatory Ghost Ship

The initial bundled scene includes:

- the 1672×941 derelict ship battle map;
- an exterior pressure-hull wall boundary;
- internal bulkheads and door walls;
- several locked/blocked routes to preserve the maze structure;
- token vision and fog exploration;
- sparse blue/amber operational lights;
- intermittent red emergency lights;
- deliberately dark corridors for horror exploration.

The active GM still receives the Signatory Ghost Ship automatically the first time the module is enabled unless that setting is disabled. This preserves the first-release behavior while future scenes are imported intentionally through the Scene Library.

### GM console helpers

Open the Scene Library from the console:

```js
await game.modules.get("orphaned-sun-scenes").api.openSceneLibrary();
```

If you intentionally want to delete and recreate the bundled Ghost Ship from the module definition:

```js
await game.modules.get("orphaned-sun-scenes").api.rebuildGhostShipScene();
```

To create it if it is missing:

```js
await game.modules.get("orphaned-sun-scenes").api.ensureGhostShipScene();
```
