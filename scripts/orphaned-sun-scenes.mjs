const MODULE_ID = "orphaned-sun-scenes";
const MODULE_VERSION = "0.2.1";
const GHOST_SHIP_KEY = "signatory-ghost-ship";
const GHOST_SHIP_NAME = "Signatory Ghost Ship — Derelict Accord Vessel";
const MAP_PATH = `modules/${MODULE_ID}/assets/maps/signatory-ghost-ship.webp`;

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoCreateGhostShip", {
    name: "Create bundled Ghost Ship scene automatically",
    hint: "When enabled, the active GM creates the pre-walled Signatory Ghost Ship scene if it is missing from the world.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "ghostShipSeedVersion", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.once("ready", async () => {
  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      ensureGhostShipScene,
      rebuildGhostShipScene,
      getGhostShipSceneData
    };
  }

  if (!game.user?.isGM) return;
  const activeGM = game.users?.activeGM;
  if (activeGM && activeGM.id !== game.user.id) return;
  if (!game.settings.get(MODULE_ID, "autoCreateGhostShip")) return;

  try {
    await ensureGhostShipScene();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to create bundled scene`, error);
    ui.notifications?.error("Orphaned Sun Scenes: could not create the Signatory Ghost Ship scene. See console for details.");
  }
});

function wallData(c, { door = 0, state = 0 } = {}) {
  return {
    c,
    move: 20,
    light: 20,
    sight: 20,
    sound: 20,
    dir: 0,
    door,
    ds: state,
    threshold: { light: null, sight: null, sound: null, attenuation: false },
    flags: {}
  };
}

function addSegment(out, a, b, options = {}) {
  if ((a[0] === b[0]) && (a[1] === b[1])) return;
  out.push(wallData([a[0], a[1], b[0], b[1]], options));
}

function addPolyline(out, points, { close = false, ...options } = {}) {
  for (let i = 0; i < points.length - 1; i++) addSegment(out, points[i], points[i + 1], options);
  if (close && points.length > 2) addSegment(out, points.at(-1), points[0], options);
}

function addSideWithDoors(out, side, start, end, fixed, doors = []) {
  const vertical = (side === "left") || (side === "right");
  const axisStart = vertical ? start[1] : start[0];
  const axisEnd = vertical ? end[1] : end[0];
  const sorted = doors
    .map(d => ({ ...d, width: d.width ?? 28 }))
    .sort((a, b) => a.at - b.at);

  let cursor = axisStart;
  for (const door of sorted) {
    const half = door.width / 2;
    const d0 = Math.max(axisStart, door.at - half);
    const d1 = Math.min(axisEnd, door.at + half);
    if (d0 > cursor) {
      const a = vertical ? [fixed, cursor] : [cursor, fixed];
      const b = vertical ? [fixed, d0] : [d0, fixed];
      addSegment(out, a, b);
    }
    const da = vertical ? [fixed, d0] : [d0, fixed];
    const db = vertical ? [fixed, d1] : [d1, fixed];
    addSegment(out, da, db, { door: 1, state: door.locked ? 2 : 0 });
    cursor = d1;
  }
  if (cursor < axisEnd) {
    const a = vertical ? [fixed, cursor] : [cursor, fixed];
    const b = vertical ? [fixed, axisEnd] : [axisEnd, fixed];
    addSegment(out, a, b);
  }
}

function addRoom(out, { x1, y1, x2, y2, doors = [] }) {
  const top = doors.filter(d => d.side === "top");
  const right = doors.filter(d => d.side === "right");
  const bottom = doors.filter(d => d.side === "bottom");
  const left = doors.filter(d => d.side === "left");
  addSideWithDoors(out, "top", [x1, y1], [x2, y1], y1, top);
  addSideWithDoors(out, "right", [x2, y1], [x2, y2], x2, right);
  addSideWithDoors(out, "bottom", [x1, y2], [x2, y2], y2, bottom);
  addSideWithDoors(out, "left", [x1, y1], [x1, y2], x1, left);
}

function buildGhostShipWalls() {
  const walls = [];

  addPolyline(walls, [
    [165, 150], [285, 105], [650, 105], [690, 125], [960, 125], [1000, 145],
    [1120, 105], [1455, 105], [1560, 135], [1610, 205], [1610, 760], [1510, 795],
    [1190, 800], [1110, 785], [980, 785], [940, 775], [720, 780], [685, 765],
    [640, 790], [215, 790], [165, 760], [105, 705], [30, 610], [10, 345], [95, 255]
  ], { close: true });

  addRoom(walls, { x1: 190, y1: 150, x2: 390, y2: 340, doors: [
    { side: "right", at: 315, width: 30 },
    { side: "bottom", at: 320, width: 28, locked: true }
  ]});
  addRoom(walls, { x1: 180, y1: 560, x2: 400, y2: 755, doors: [
    { side: "right", at: 615, width: 30 },
    { side: "top", at: 350, width: 28 }
  ]});
  addRoom(walls, { x1: 1150, y1: 125, x2: 1500, y2: 390, doors: [
    { side: "left", at: 335, width: 32 },
    { side: "bottom", at: 1275, width: 30, locked: true }
  ]});
  addRoom(walls, { x1: 1150, y1: 555, x2: 1500, y2: 765, doors: [
    { side: "left", at: 625, width: 32 },
    { side: "top", at: 1275, width: 30 }
  ]});

  addRoom(walls, { x1: 405, y1: 130, x2: 525, y2: 350, doors: [
    { side: "left", at: 275, width: 26 }, { side: "bottom", at: 470, width: 28 }
  ]});
  addRoom(walls, { x1: 545, y1: 110, x2: 680, y2: 355, doors: [
    { side: "left", at: 260, width: 26, locked: true }, { side: "bottom", at: 615, width: 28 }
  ]});
  addRoom(walls, { x1: 700, y1: 120, x2: 885, y2: 365, doors: [
    { side: "left", at: 315, width: 26 }, { side: "bottom", at: 780, width: 28 }, { side: "right", at: 315, width: 26 }
  ]});
  addRoom(walls, { x1: 900, y1: 130, x2: 1080, y2: 365, doors: [
    { side: "left", at: 315, width: 26 }, { side: "bottom", at: 965, width: 28, locked: true }, { side: "right", at: 315, width: 26 }
  ]});
  addRoom(walls, { x1: 1090, y1: 145, x2: 1165, y2: 365, doors: [
    { side: "left", at: 265, width: 24 }, { side: "bottom", at: 1125, width: 26 }
  ]});

  addRoom(walls, { x1: 400, y1: 410, x2: 530, y2: 500, doors: [
    { side: "top", at: 465, width: 26 }, { side: "right", at: 455, width: 24 }
  ]});
  addRoom(walls, { x1: 545, y1: 405, x2: 690, y2: 500, doors: [
    { side: "left", at: 455, width: 24 }, { side: "top", at: 620, width: 26, locked: true }, { side: "right", at: 455, width: 24 }
  ]});
  addRoom(walls, { x1: 720, y1: 410, x2: 890, y2: 505, doors: [
    { side: "left", at: 455, width: 24 }, { side: "right", at: 455, width: 24 }
  ]});
  addRoom(walls, { x1: 910, y1: 405, x2: 1060, y2: 510, doors: [
    { side: "left", at: 455, width: 24 }, { side: "right", at: 455, width: 24 }, { side: "bottom", at: 985, width: 26 }
  ]});
  addRoom(walls, { x1: 1090, y1: 405, x2: 1270, y2: 505, doors: [
    { side: "left", at: 455, width: 24 }, { side: "right", at: 455, width: 24 }
  ]});

  addRoom(walls, { x1: 400, y1: 560, x2: 540, y2: 755, doors: [
    { side: "top", at: 470, width: 26 }, { side: "right", at: 630, width: 24 }
  ]});
  addRoom(walls, { x1: 560, y1: 540, x2: 690, y2: 770, doors: [
    { side: "top", at: 620, width: 26 }, { side: "left", at: 610, width: 24, locked: true }, { side: "right", at: 610, width: 24 }
  ]});
  addRoom(walls, { x1: 730, y1: 535, x2: 910, y2: 700, doors: [
    { side: "left", at: 610, width: 24 }, { side: "right", at: 610, width: 24 }, { side: "bottom", at: 820, width: 26 }
  ]});
  addRoom(walls, { x1: 920, y1: 525, x2: 1060, y2: 765, doors: [
    { side: "left", at: 610, width: 24 }, { side: "right", at: 610, width: 24 }, { side: "top", at: 980, width: 26, locked: true }
  ]});
  addRoom(walls, { x1: 1080, y1: 550, x2: 1165, y2: 755, doors: [
    { side: "left", at: 625, width: 24 }, { side: "right", at: 625, width: 24 }
  ]});

  addSegment(walls, [470, 365], [515, 405]);
  addSegment(walls, [1005, 365], [1045, 402]);
  addSegment(walls, [890, 500], [935, 535]);
  addSegment(walls, [1055, 605], [1100, 655]);
  addSegment(walls, [470, 505], [520, 550]);

  return walls;
}

function makeLight(x, y, { dim, bright = 0, color, alpha = 0.35, animation = null, name }) {
  const config = {
    dim,
    bright,
    angle: 360,
    color,
    alpha,
    attenuation: 0.55,
    luminosity: 0.15,
    saturation: 0,
    contrast: 0,
    shadows: 0.75
  };
  if (animation) config.animation = animation;
  return { x, y, walls: true, vision: false, hidden: false, name, config, flags: {} };
}

function buildGhostShipLights() {
  const emergency = { type: "torch", speed: 2, intensity: 2, reverse: false };
  return [
    makeLight(270, 240, { dim: 2.0, bright: 0.35, color: "#6f9fc9", alpha: 0.32, name: "Navigation emergency power" }),
    makeLight(275, 655, { dim: 1.8, bright: 0.25, color: "#6b91ad", alpha: 0.30, name: "Communications console glow" }),
    makeLight(1325, 255, { dim: 2.1, bright: 0.25, color: "#d49a57", alpha: 0.30, name: "Weapons bay work light" }),
    makeLight(1350, 665, { dim: 2.2, bright: 0.35, color: "#d68d44", alpha: 0.34, name: "Engineering reactor bleed" }),

    makeLight(410, 365, { dim: 0.95, color: "#c89b62", alpha: 0.25, name: "Corridor light A" }),
    makeLight(710, 365, { dim: 0.85, color: "#c89b62", alpha: 0.23, name: "Corridor light B" }),
    makeLight(935, 385, { dim: 0.8, color: "#c89b62", alpha: 0.22, name: "Corridor light C" }),
    makeLight(1110, 370, { dim: 0.8, color: "#c89b62", alpha: 0.22, name: "Corridor light D" }),
    makeLight(415, 550, { dim: 0.8, color: "#b98f5c", alpha: 0.22, name: "Lower corridor light A" }),
    makeLight(705, 595, { dim: 0.85, color: "#b98f5c", alpha: 0.22, name: "Lower corridor light B" }),
    makeLight(820, 500, { dim: 0.75, color: "#c19760", alpha: 0.22, name: "Midship junction light" }),

    makeLight(500, 175, { dim: 0.75, color: "#b92d27", alpha: 0.34, animation: emergency, name: "Emergency beacon 01" }),
    makeLight(600, 235, { dim: 0.7, color: "#b92d27", alpha: 0.32, animation: emergency, name: "Emergency beacon 02" }),
    makeLight(705, 190, { dim: 0.75, color: "#b92d27", alpha: 0.32, animation: emergency, name: "Emergency beacon 03" }),
    makeLight(1015, 205, { dim: 0.7, color: "#b92d27", alpha: 0.30, animation: emergency, name: "Emergency beacon 04" }),
    makeLight(1010, 315, { dim: 0.8, color: "#b92d27", alpha: 0.32, animation: emergency, name: "Emergency beacon 05" }),
    makeLight(980, 575, { dim: 0.85, color: "#b92d27", alpha: 0.34, animation: emergency, name: "Emergency beacon 06" }),
    makeLight(1120, 610, { dim: 0.7, color: "#b92d27", alpha: 0.30, animation: emergency, name: "Emergency beacon 07" }),
    makeLight(1380, 430, { dim: 0.75, color: "#b92d27", alpha: 0.32, animation: emergency, name: "Emergency beacon 08" }),
    makeLight(1515, 455, { dim: 0.7, color: "#b92d27", alpha: 0.30, animation: emergency, name: "Emergency beacon 09" }),
    makeLight(710, 725, { dim: 0.75, color: "#b92d27", alpha: 0.32, animation: emergency, name: "Emergency beacon 10" }),
    makeLight(490, 710, { dim: 0.7, color: "#b92d27", alpha: 0.30, animation: emergency, name: "Emergency beacon 11" })
  ];
}

export function getGhostShipSceneData() {
  return {
    name: GHOST_SHIP_NAME,
    active: false,
    navigation: true,
    navName: "Ghost Ship",
    width: 1672,
    height: 941,
    padding: 0.04,
    backgroundColor: "#05070b",
    background: { src: MAP_PATH },
    grid: {
      type: 1,
      size: 50,
      distance: 1,
      units: "m",
      color: "#7f91a6",
      alpha: 0.07,
      style: "solidLines",
      thickness: 1
    },
    tokenVision: true,
    environment: {
      darknessLevel: 0.88,
      darknessLevelLock: true,
      cycle: false,
      globalLight: { enabled: false }
    },
    fog: {
      exploration: true,
      colors: { explored: "#0b0f15", unexplored: "#000000" },
      overlay: null,
      reset: null
    },
    initial: { x: 836, y: 470, scale: 0.72 },
    walls: buildGhostShipWalls(),
    lights: buildGhostShipLights(),
    flags: {
      [MODULE_ID]: {
        sceneKey: GHOST_SHIP_KEY,
        sourceVersion: MODULE_VERSION
      }
    }
  };
}

export async function ensureGhostShipScene() {
  const existing = game.scenes.find(scene => scene.getFlag(MODULE_ID, "sceneKey") === GHOST_SHIP_KEY);
  if (existing) {
    const sourceVersion = existing.getFlag(MODULE_ID, "sourceVersion");
    const hasNoWalls = (existing.walls?.size ?? 0) === 0;
    if (sourceVersion !== "0.1.0" || !hasNoWalls) return existing;

    await existing.delete();
    ui.notifications?.warn("Orphaned Sun Scenes: repairing the legacy Ghost Ship scene created without valid walls.");
  }

  const scene = await Scene.create(getGhostShipSceneData());
  await game.settings.set(MODULE_ID, "ghostShipSeedVersion", MODULE_VERSION);
  ui.notifications?.info("Orphaned Sun Scenes: Signatory Ghost Ship created with walls and dynamic lighting.");
  return scene;
}

export async function rebuildGhostShipScene() {
  if (!game.user?.isGM) throw new Error("Only a GM can rebuild bundled scenes.");
  const existing = game.scenes.find(scene => scene.getFlag(MODULE_ID, "sceneKey") === GHOST_SHIP_KEY);
  if (existing) await existing.delete();
  return ensureGhostShipScene();
}
