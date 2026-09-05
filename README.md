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

## Phase Patch Governor

Large multi-phase development work can be run through the repository's **Phase Patch Governor** instead of being hand-applied as one large edit. It has two explicit stages:

1. **Pre-production** — define the complete phase list, then draft exactly one deterministic patch per phase, in order. GitHub Actions validates each planning push and reports the next phase that still needs a patch.
2. **Production** — once the plan is marked `ready`, the governor snapshots the sealed patch chain, starts from a fresh `main`, applies and validates every phase in sequence, runs final checks, archives the executed plan, verifies that `main` has not moved, and then fast-forward merges the validated phase commits only after everything passes.

If a phase fails, the production run stops without merging and reports the failing phase, operation/check, and command. The intended repair is to change only that phase's patch on the planning branch; the governor then replays the corrected chain from a clean baseline.

Planning branches use `governor-plan/<project>`. Production branches are generated automatically as `governor-run/<project>/<run-id>-<attempt>`.

Full schema, lifecycle, repair procedure, and examples are in [`docs/PATCH_GOVERNOR.md`](docs/PATCH_GOVERNOR.md). The governor itself is under `dev/` and is not included in the downloadable Foundry module package.

Run its regression test locally with:

```bash
npm run governor:test
```

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

## Comic Book Scene Maker

The GM Tools window now includes a **Comic Book Scene** tab alongside the Scene Library. It is designed for sequential visual storytelling during a session.

- Drop or choose one or more image files from the GM client. Uploads are stored through Foundry FilePicker so native Foundry and The Forge both return usable asset paths.
- Existing Foundry paths, module asset paths, or image URLs can also be added directly.
- Choose landscape or portrait page format and a simple comic-panel layout.
- Reorder or remove panels while watching the live page preview.
- **Create Comic Book Scene** creates a normal gridless Foundry Scene. The off-white page and black panel frames are locked visible Tiles; each story image is a separate unlocked Tile using cover-cropping.
- Every story-image Tile starts **hidden from players**. Reveal the Tiles one at a time with Foundry's normal Tile visibility control as the story progresses.

The current draft is stored as a world setting, so closing the GM Tools window or reloading Foundry does not discard the panel list. Uploaded files are not deleted when the draft is cleared.

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
