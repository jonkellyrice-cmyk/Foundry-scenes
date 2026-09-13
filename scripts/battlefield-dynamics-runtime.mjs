import { battlefieldDynamicsReceiverState } from "./battlefield-dynamics-contract.mjs";
import { MODULE_ID } from "./live-scene-feed.mjs";

export const BATTLEFIELD_DYNAMICS_RUNTIME_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE = `module.${MODULE_ID}`;
export const BATTLEFIELD_DYNAMICS_SOCKET_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP = "foundry-runtime-ephemeral";
export const BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE = "none-phase-1b";

const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = value => typeof value === "string" && Boolean(value.trim());

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) freeze(item);
  return value;
}

export function frozenClone(value) {
  const copy = clone(value);
  if (globalThis.foundry?.utils?.deepFreeze) return globalThis.foundry.utils.deepFreeze(copy);
  return freeze(copy);
}

function sceneData(scene) {
  if (!scene) return null;
  if (typeof scene.toObject === "function") return scene.toObject();
  return scene;
}

function sceneId(scene) {
  return scene?.id ?? scene?._id ?? null;
}

function assertRuntimeInstance(instance, index) {
  if (!isRecord(instance)) throw new Error(`Battlefield Dynamics runtime instance ${index + 1} is invalid.`);
  for (const field of ["key", "environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"]) {
    if (!nonEmpty(instance[field])) throw new Error(`Battlefield Dynamics runtime instance ${index + 1} is missing ${field}.`);
  }
  const stateInitialization = instance.stateInitialization;
  if (!isRecord(stateInitialization)) throw new Error(`Battlefield Dynamics runtime instance ${instance.key} is missing stateInitialization.`);
  if (stateInitialization.mode !== "stateless" && stateInitialization.mode !== "finite-state") {
    throw new Error(`Battlefield Dynamics runtime instance ${instance.key} has unsupported state mode.`);
  }
  if (stateInitialization.mode === "stateless" && stateInitialization.initialState !== null) {
    throw new Error(`Battlefield Dynamics stateless runtime instance ${instance.key} must initialize with null state.`);
  }
  if (stateInitialization.mode === "finite-state" && !nonEmpty(stateInitialization.initialState)) {
    throw new Error(`Battlefield Dynamics finite-state runtime instance ${instance.key} requires an initial state.`);
  }
  return instance;
}

function runtimeInstance(instance) {
  return {
    key: instance.key,
    identity: Object.freeze({
      environmentId: instance.environmentId,
      physicalContextId: instance.physicalContextId,
      dynamicId: instance.dynamicId,
      sourceApplicationId: instance.sourceApplicationId,
    }),
    mode: instance.stateInitialization.mode,
    initialState: instance.stateInitialization.initialState,
    currentState: instance.stateInitialization.initialState,
    revision: 0,
  };
}

export function createBattlefieldDynamicsRuntimeState(scene, { moduleId = MODULE_ID } = {}) {
  const id = sceneId(scene);
  if (!nonEmpty(id)) throw new Error("Battlefield Dynamics runtime requires a Scene id.");
  const data = sceneData(scene);
  const receiver = battlefieldDynamicsReceiverState(data, moduleId);
  if (receiver.status !== "executable-v1") {
    return {
      status: "inactive",
      reason: receiver.status,
      sceneId: id,
      receiverStatus: receiver.status,
    };
  }

  const instances = receiver.generation?.applicationComposition?.instances;
  if (!Array.isArray(instances)) throw new Error("Battlefield Dynamics runtime requires applicationComposition.instances.");
  const runtimeInstances = new Map();
  for (const [index, raw] of instances.entries()) {
    const instance = assertRuntimeInstance(raw, index);
    if (runtimeInstances.has(instance.key)) throw new Error(`Battlefield Dynamics runtime contains duplicate instance key ${instance.key}.`);
    runtimeInstances.set(instance.key, runtimeInstance(instance));
  }

  return {
    status: "active",
    sceneId: id,
    receiverStatus: receiver.status,
    runtimeVersion: BATTLEFIELD_DYNAMICS_RUNTIME_VERSION,
    ownership: BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
    persistence: BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
    canonicalGeneration: frozenClone(receiver.generation),
    instances: runtimeInstances,
  };
}

function usersArray(users) {
  if (!users) return [];
  if (Array.isArray(users)) return users;
  if (typeof users.values === "function") return Array.from(users.values());
  if (Symbol.iterator in Object(users)) return Array.from(users);
  return [];
}

export function designatedActiveGM(gameRef = globalThis.game) {
  const users = gameRef?.users;
  if (users?.activeGM) return users.activeGM;
  const candidates = usersArray(users)
    .filter(user => user?.active && user?.isGM)
    .sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")));
  return candidates[0] ?? null;
}

export function isAuthoritativeGM(gameRef = globalThis.game) {
  const current = gameRef?.user;
  const designated = designatedActiveGM(gameRef);
  if (!current?.isGM || !designated?.id) return false;
  return current.id === designated.id;
}

export function assertBattlefieldDynamicsSocketMessage(value) {
  if (!isRecord(value)) throw new Error("Battlefield Dynamics socket message must be an object.");
  if (value.version !== BATTLEFIELD_DYNAMICS_SOCKET_VERSION) throw new Error("Battlefield Dynamics socket message has an unsupported version.");
  if (value.type !== "runtime-authority-probe") throw new Error(`Battlefield Dynamics socket message type ${String(value.type)} is unsupported in Phase 1B.`);
  return value;
}

export class BattlefieldDynamicsRuntimeManager {
  constructor({ gameRef = null, logger = globalThis.console } = {}) {
    this.game = gameRef;
    this.logger = logger;
    this.scenes = new Map();
    this.socketRegistered = false;
    this._socketHandler = message => this.receiveSocketMessage(message);
  }

  bindGame(gameRef = globalThis.game) {
    this.game = gameRef;
    return this;
  }

  bootstrapScene(scene) {
    const id = sceneId(scene);
    if (!nonEmpty(id)) throw new Error("Battlefield Dynamics runtime cannot bootstrap a Scene without an id.");
    const runtime = createBattlefieldDynamicsRuntimeState(scene);
    if (runtime.status !== "active") {
      this.scenes.delete(id);
      return runtime;
    }
    this.scenes.set(id, runtime);
    return runtime;
  }

  bootstrapWorldScenes() {
    const scenes = this.game?.scenes;
    if (!scenes) return [];
    const values = Array.isArray(scenes)
      ? scenes
      : typeof scenes.values === "function"
        ? Array.from(scenes.values())
        : Array.from(scenes);
    return values.map(scene => this.bootstrapScene(scene));
  }

  disposeScene(sceneOrId) {
    const id = typeof sceneOrId === "string" ? sceneOrId : sceneId(sceneOrId);
    return nonEmpty(id) ? this.scenes.delete(id) : false;
  }

  runtimeForScene(sceneOrId) {
    const id = typeof sceneOrId === "string" ? sceneOrId : sceneId(sceneOrId);
    return nonEmpty(id) ? this.scenes.get(id) ?? null : null;
  }

  listSceneRuntimes() {
    return Array.from(this.scenes.values());
  }

  isAuthoritativeGM() {
    return isAuthoritativeGM(this.game);
  }

  registerSocket() {
    if (this.socketRegistered) return true;
    const socket = this.game?.socket;
    if (!socket?.on) return false;
    socket.on(BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE, this._socketHandler);
    this.socketRegistered = true;
    return true;
  }

  receiveSocketMessage(message) {
    if (!this.isAuthoritativeGM()) return { handled: false, reason: "not-authoritative-gm" };
    let parsed;
    try {
      parsed = assertBattlefieldDynamicsSocketMessage(message);
    } catch (error) {
      this.logger?.warn?.(`${MODULE_ID} | Ignored invalid Battlefield Dynamics socket message`, error);
      return { handled: false, reason: "invalid-message" };
    }
    if (parsed.type === "runtime-authority-probe") {
      return { handled: true, reason: "authority-probe" };
    }
    return { handled: false, reason: "unsupported-message" };
  }
}

export const battlefieldDynamicsRuntimeManager = new BattlefieldDynamicsRuntimeManager();
let installed = false;

export function installBattlefieldDynamicsRuntime({ HooksRef = globalThis.Hooks, gameRef = null } = {}) {
  if (installed) return battlefieldDynamicsRuntimeManager;
  installed = true;
  if (gameRef) battlefieldDynamicsRuntimeManager.bindGame(gameRef);
  if (!HooksRef?.once || !HooksRef?.on) return battlefieldDynamicsRuntimeManager;

  HooksRef.once("ready", () => {
    battlefieldDynamicsRuntimeManager.bindGame(globalThis.game ?? gameRef);
    battlefieldDynamicsRuntimeManager.registerSocket();
    battlefieldDynamicsRuntimeManager.bootstrapWorldScenes();
  });

  HooksRef.on("createScene", scene => {
    battlefieldDynamicsRuntimeManager.bootstrapScene(scene);
  });

  return battlefieldDynamicsRuntimeManager;
}
