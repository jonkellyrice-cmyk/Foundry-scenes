# Orphaned Sun — Foundry Scenes

Foundry VTT v13 content module for prebuilt **Orphaned Sun** scenes with bundled artwork, walls, doors, fog-of-war vision, and dynamic lighting.

## Install on Foundry / The Forge

Paste this manifest URL into the module installer:

`https://raw.githubusercontent.com/jonkellyrice-cmyk/Foundry-scenes/main/module.json`

Then enable **Orphaned Sun — Foundry Scenes** in the Lancer world. The active GM automatically receives the bundled Signatory Ghost Ship scene the first time the module is enabled.

## Signatory Ghost Ship

The initial scene includes:

- the 1672×941 derelict ship battle map;
- an exterior pressure-hull wall boundary;
- internal bulkheads and door walls;
- several locked/blocked routes to preserve the maze structure;
- token vision and fog exploration;
- sparse blue/amber operational lights;
- intermittent red emergency lights;
- deliberately dark corridors for horror exploration.

The module never overwrites an existing seeded scene automatically.

### GM console helpers

If you intentionally want to delete and recreate the bundled scene from the module definition:

```js
await game.modules.get("orphaned-sun-scenes").api.rebuildGhostShipScene();
```

To create it if it is missing:

```js
await game.modules.get("orphaned-sun-scenes").api.ensureGhostShipScene();
```
