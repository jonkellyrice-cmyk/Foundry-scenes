# Orphaned Sun — Foundry Scenes

Foundry VTT v13 GM tools for **Orphaned Sun**. The module provides a runtime Scene Library for battle maps published by the Lancer GM Kit and a Comic Book Scene Maker for sequential storytelling.

## Install on Foundry / The Forge

Paste this manifest URL into the module installer:

`https://raw.githubusercontent.com/jonkellyrice-cmyk/Foundry-scenes/main/module.json`

The manifest points to the latest GitHub Release asset. Enable **Orphaned Sun — Foundry Scenes** in the Lancer world.

## Runtime battle-map feed

Battle maps are **not bundled into module releases**. The installed module is a stable client for a live scene feed stored under `assets/generated-scenes/` on the repository's `main` branch.

The Scene Library fetches:

`https://raw.githubusercontent.com/jonkellyrice-cmyk/Foundry-scenes/main/assets/generated-scenes/registry.json`

When a scene is published, the registry points to a scene-package JSON file containing canonical Foundry Scene data and the verified background artwork. The Foundry module downloads the package only when the GM imports or restores that scene.

This separation is deliberate:

- **module versions change only when module code changes;**
- **publishing a new battle map does not require a module update or release;**
- opening the Scene Library or pressing **Refresh live feed** discovers newly published maps;
- **Import To World** downloads the package, verifies the embedded background SHA-256, uploads that artwork into the current Foundry world's data storage, and creates a normal editable Foundry Scene;
- a later published revision can be pulled with **Update to Published Revision**;
- the module never silently overwrites a world scene.

The live feed currently targets Foundry generation 13 and scene-package schema version 1.

## Scene Library UI

For GMs, the module adds an **Orphaned Sun GM Tools** icon to Foundry's Scene Controls. The Scene Library shows every scene currently present in the live feed and whether it is already present in the current world.

From the library you can refresh the live feed, import a published scene, open it, jump to Walls or Lighting, configure it normally, create an independent Working Copy, restore/update the managed copy from the published revision, or remove the managed copy from the world.

Once imported, the scene is an ordinary Foundry Scene. Edit its walls, lights, doors, tokens, sounds, tiles, regions, and scene settings normally.

There is no preloaded Signatory Ghost Ship scene and no first-scene auto-create behavior. The original hardcoded Ghost Ship was an early prototype and has been removed in favor of the live publishing pipeline.

## Comic Book Scene Maker

The GM Tools window also includes a **Comic Book Scene** tab for sequential visual storytelling. Drop or choose image files, arrange them into a page layout, and create a normal gridless Foundry Scene whose story-image Tiles start hidden from players.

The current draft is stored as a world setting, so closing the GM Tools window or reloading Foundry does not discard the panel list. Uploaded files are not deleted when the draft is cleared.

## Releases

Publishing module code is automated. Changing the versioned `module.json` on `main` runs the release workflow, validates the runtime scripts and scene-feed contract, builds `orphaned-sun-scenes.zip`, and creates or refreshes the matching GitHub Release.

The release ZIP intentionally includes only module runtime assets. `assets/generated-scenes/` remains a live repository feed and is not copied into the module ZIP.

Stable download target:

`https://github.com/jonkellyrice-cmyk/Foundry-scenes/releases/latest/download/orphaned-sun-scenes.zip`

## Phase Patch Governor

Large multi-phase development work can be run through the repository's **Phase Patch Governor**. Full schema, lifecycle, repair procedure, and examples are in [`docs/PATCH_GOVERNOR.md`](docs/PATCH_GOVERNOR.md).

Run its regression test locally with:

```bash
npm run governor:test
```

Run the live scene-feed contract tests with:

```bash
npm run test:scene-feed
```

## GM console helper

Open the GM Tools window from the console:

```js
await game.modules.get("orphaned-sun-scenes").api.openSceneLibrary();
```
