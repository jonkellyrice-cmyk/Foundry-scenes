import { battlefieldDynamicsReceiverState } from "./battlefield-dynamics-contract.mjs";
import {
  BattlefieldDynamicsDiagnosticsRegistry,
  collectBattlefieldDynamicsSceneDiagnostics,
  createBattlefieldDynamicsDiagnostic,
  diagnoseBattlefieldDynamicsSocketFailure,
} from "./battlefield-dynamics-diagnostics.mjs";
import { reconcileBattlefieldDynamicsAreaRegions } from "./battlefield-dynamics-spatial.mjs";
import { BattlefieldDynamicsTriggerLedger, normalizeBattlefieldDynamicsMovement } from "./battlefield-dynamics-triggers.mjs";
import { battlefieldDynamicsMovementCostCatalog, installBattlefieldDynamicsMovementCostAdapter } from "./battlefield-dynamics-movement-cost.mjs";
import { executeBattlefieldDynamicsForcedMovement, planBattlefieldDynamicsForcedMovement } from "./battlefield-dynamics-forced-movement.mjs";
import { applyBattlefieldDynamicsMovement, adjustBattlefieldDynamicsMovement,
  readBattlefieldDynamicsMovementLedger, BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_FLAG } from "./battlefield-dynamics-movement-ledger.mjs";
import { MODULE_ID } from "./live-scene-feed.mjs";

export const BATTLEFIELD_DYNAMICS_RUNTIME_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE = `module.${MODULE_ID}`;
export const BATTLEFIELD_DYNAMICS_SOCKET_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_RUNTIME_FLAG = "battlefieldDynamicsRuntime";
export const BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP = "foundry-runtime-mutable";
export const BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE = "scene-flag-v1";

const CANONICAL_GENERATION_FLAG = "battlefieldDynamicsGeneration";
const IDENTITY_FIELDS = Object.freeze([
  "environmentId",
  "physicalContextId",
  "dynamicId",
  "sourceApplicationId",
]);

const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = value => typeof value === "string" && Boolean(value.trim());
const nonNegativeInteger = value => Number.isInteger(value) && value >= 0;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

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

function flagFromScene(scene, key, moduleId = MODULE_ID) {
  if (typeof scene?.getFlag === "function") return scene.getFlag(moduleId, key);
  return sceneData(scene)?.flags?.[moduleId]?.[key] ?? null;
}

function identityFromInstance(instance) {
  return Object.freeze(Object.fromEntries(IDENTITY_FIELDS.map(field => [field, instance[field]])));
}

function assertRuntimeInstance(instance, index) {
  if (!isRecord(instance)) throw new Error(`Battlefield Dynamics runtime instance ${index + 1} is invalid.`);
  for (const field of ["key", ...IDENTITY_FIELDS]) {
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

function validCurrentState(value, stateInitialization) {
  if (stateInitialization.mode === "stateless") return value === null;
  if (!nonEmpty(value)) return false;
  if (Array.isArray(stateInitialization.states) && stateInitialization.states.length) {
    return stateInitialization.states.includes(value);
  }
  return true;
}

function persistedApplicationCompatible(persisted, instance) {
  if (!isRecord(persisted) || !isRecord(persisted.identity) || !isRecord(persisted.stateInitialization)) return false;
  if (!IDENTITY_FIELDS.every(field => persisted.identity[field] === instance[field])) return false;
  if (!sameJson(persisted.stateInitialization, instance.stateInitialization)) return false;
  if (!validCurrentState(persisted.currentState, instance.stateInitialization)) return false;
  if (!nonNegativeInteger(persisted.revision)) return false;
  return true;
}

function normalizePersistedStore(value, id) {
  if (value == null) return { status: "absent", applications: {} };
  if (!isRecord(value)
    || value.version !== BATTLEFIELD_DYNAMICS_RUNTIME_VERSION
    || value.ownership !== BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP
    || value.persistence !== BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE
    || value.sceneId !== id
    || !isRecord(value.applications)) {
    return { status: "invalid", applications: {} };
  }
  return { status: "valid", applications: value.applications };
}

function runtimeInstance(instance, persisted = null) {
  const compatible = persistedApplicationCompatible(persisted, instance);
  return {
    key: instance.key,
    identity: identityFromInstance(instance),
    stateInitialization: frozenClone(instance.stateInitialization),
    mode: instance.stateInitialization.mode,
    initialState: instance.stateInitialization.initialState,
    currentState: compatible ? clone(persisted.currentState) : clone(instance.stateInitialization.initialState),
    revision: compatible ? persisted.revision : 0,
    rehydrated: compatible,
  };
}

export function serializeBattlefieldDynamicsRuntimeState(runtime) {
  if (!isRecord(runtime) || runtime.status !== "active" || !nonEmpty(runtime.sceneId) || !(runtime.instances instanceof Map)) {
    throw new Error("Battlefield Dynamics runtime serialization requires an active runtime state.");
  }
  const applications = {};
  for (const [key, instance] of runtime.instances.entries()) {
    if (!nonEmpty(key) || !isRecord(instance) || !isRecord(instance.identity) || !isRecord(instance.stateInitialization)) {
      throw new Error(`Battlefield Dynamics runtime cannot serialize malformed application ${String(key)}.`);
    }
    if (!validCurrentState(instance.currentState, instance.stateInitialization)) {
      throw new Error(`Battlefield Dynamics runtime application ${key} has an invalid current state.`);
    }
    if (!nonNegativeInteger(instance.revision)) {
      throw new Error(`Battlefield Dynamics runtime application ${key} has an invalid revision.`);
    }
    applications[key] = {
      identity: clone(instance.identity),
      stateInitialization: clone(instance.stateInitialization),
      currentState: clone(instance.currentState),
      revision: instance.revision,
    };
  }
  return {
    version: BATTLEFIELD_DYNAMICS_RUNTIME_VERSION,
    ownership: BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
    persistence: BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
    sceneId: runtime.sceneId,
    applications,
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

  const persisted = normalizePersistedStore(flagFromScene(scene, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG, moduleId), id);
  const runtimeInstances = new Map();
  let restoredApplicationCount = 0;
  let initializedApplicationCount = 0;

  for (const [index, raw] of instances.entries()) {
    const instance = assertRuntimeInstance(raw, index);
    if (runtimeInstances.has(instance.key)) throw new Error(`Battlefield Dynamics runtime contains duplicate instance key ${instance.key}.`);
    const runtime = runtimeInstance(instance, persisted.applications[instance.key]);
    runtimeInstances.set(instance.key, runtime);
    if (runtime.rehydrated) restoredApplicationCount += 1;
    else initializedApplicationCount += 1;
  }

  const canonicalKeys = new Set(runtimeInstances.keys());
  const staleApplicationCount = persisted.status === "valid"
    ? Object.keys(persisted.applications).filter(key => !canonicalKeys.has(key)).length
    : 0;

  return {
    status: "active",
    sceneId: id,
    receiverStatus: receiver.status,
    runtimeVersion: BATTLEFIELD_DYNAMICS_RUNTIME_VERSION,
    ownership: BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
    persistence: BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
    canonicalGeneration: frozenClone(receiver.generation),
    instances: runtimeInstances,
    rehydration: Object.freeze({
      persistedStatus: persisted.status,
      restoredApplicationCount,
      initializedApplicationCount,
      staleApplicationCount,
    }),
  };
}

function usersArray(users) {
  if (!users) return [];
  if (Array.isArray(users)) return users;
  if (typeof users.values === "function") return Array.from(users.values());
  if (Symbol.iterator in Object(users)) return Array.from(users);
  return [];
}

function scenesArray(scenes) {
  if (!scenes) return [];
  if (Array.isArray(scenes)) return scenes;
  if (typeof scenes.values === "function") return Array.from(scenes.values());
  if (Symbol.iterator in Object(scenes)) return Array.from(scenes);
  return [];
}

function sceneFromCollection(scenes, id) {
  if (!scenes || !nonEmpty(id)) return null;
  if (typeof scenes.get === "function") return scenes.get(id) ?? null;
  return scenesArray(scenes).find(scene => sceneId(scene) === id) ?? null;
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

export function battlefieldDynamicsSceneUpdateIsRelevant(changes, moduleId = MODULE_ID) {
  if (!isRecord(changes)) return false;
  const generationPaths = [
    `flags.${moduleId}.${CANONICAL_GENERATION_FLAG}`,
    `flags.${moduleId}.-=${CANONICAL_GENERATION_FLAG}`,
    `flags.${moduleId}.${BATTLEFIELD_DYNAMICS_RUNTIME_FLAG}`,
    `flags.${moduleId}.-=${BATTLEFIELD_DYNAMICS_RUNTIME_FLAG}`,
  ];
  if (Object.keys(changes).some(key => generationPaths.some(prefix => key === prefix || key.startsWith(`${prefix}.`)))) return true;
  if (hasOwn(changes, `flags.${moduleId}`)) return true;
  if (!hasOwn(changes, "flags")) return false;
  if (changes.flags === null) return true;
  const moduleChanges = changes.flags?.[moduleId];
  if (moduleChanges === null) return true;
  if (!isRecord(moduleChanges)) return false;
  return [
    CANONICAL_GENERATION_FLAG,
    `-=${CANONICAL_GENERATION_FLAG}`,
    BATTLEFIELD_DYNAMICS_RUNTIME_FLAG,
    `-=${BATTLEFIELD_DYNAMICS_RUNTIME_FLAG}`,
  ].some(key => hasOwn(moduleChanges, key));
}

export function assertBattlefieldDynamicsSocketMessage(value) {
  if (!isRecord(value)) throw new Error("Battlefield Dynamics socket message must be an object.");
  if (value.version !== BATTLEFIELD_DYNAMICS_SOCKET_VERSION) throw new Error("Battlefield Dynamics socket message has an unsupported version.");
  if (value.type !== "runtime-authority-probe") throw new Error(`Battlefield Dynamics socket message type ${String(value.type)} is unsupported before gameplay execution phases.`);
  return value;
}

export class BattlefieldDynamicsRuntimeManager {
  constructor({ gameRef = null, logger = globalThis.console } = {}) {
    this.game = gameRef;
    this.logger = logger;
    this.scenes = new Map();
    this.diagnostics = new BattlefieldDynamicsDiagnosticsRegistry();
    this.socketRegistered = false;
    this.triggerLedger = new BattlefieldDynamicsTriggerLedger();
    this.triggerEvents = [];
    this.movementCostIssueKeys = new Set();
    this.movementLedgerWrites = new Map();
    this.forcedMovementInFlight = new Set();
    this.forcedMovementProcessed = new Set();
    this._socketHandler = message => this.receiveSocketMessage(message);
  }

  bindGame(gameRef = globalThis.game) {
    this.game = gameRef;
    return this;
  }

  sceneDocument(sceneOrId) {
    if (sceneOrId && typeof sceneOrId !== "string") return sceneOrId;
    return sceneFromCollection(this.game?.scenes, sceneOrId);
  }

  refreshSceneDiagnostics(scene, runtime = null, extraDiagnostics = []) {
    const id = sceneId(scene);
    if (!nonEmpty(id)) return [];
    const derived = collectBattlefieldDynamicsSceneDiagnostics(scene, runtime);
    const extras = (Array.isArray(extraDiagnostics) ? extraDiagnostics : [])
      .map(diagnostic => createBattlefieldDynamicsDiagnostic(diagnostic));
    return this.diagnostics.replaceScene(id, [...derived, ...extras]);
  }

  diagnosticsForScene(sceneOrId) {
    const id = typeof sceneOrId === "string" ? sceneOrId : sceneId(sceneOrId);
    return nonEmpty(id) ? this.diagnostics.forScene(id) : [];
  }

  listDiagnostics() {
    return this.diagnostics.list();
  }

  recordMovementCostIssue(issue) {
    const key = JSON.stringify([issue.provenance?.sceneId, issue.code, issue.details]);
    if (this.movementCostIssueKeys.has(key)) return;
    this.movementCostIssueKeys.add(key);
    this.diagnostics.recordEvent(createBattlefieldDynamicsDiagnostic(issue));
  }

  diagnosticsSummary() {
    return this.diagnostics.summary();
  }

  async persistSceneRuntime(sceneOrId, runtime = null) {
    if (!this.isAuthoritativeGM()) return { persisted: false, reason: "not-authoritative-gm" };
    const scene = this.sceneDocument(sceneOrId);
    if (!scene) return { persisted: false, reason: "scene-unavailable" };
    const state = runtime ?? this.runtimeForScene(scene);
    if (!state || state.status !== "active") return { persisted: false, reason: "runtime-inactive" };
    const payload = serializeBattlefieldDynamicsRuntimeState(state);
    const current = flagFromScene(scene, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG);
    if (sameJson(current, payload)) return { persisted: false, reason: "unchanged" };
    if (typeof scene.setFlag !== "function") return { persisted: false, reason: "set-flag-unavailable" };
    await scene.setFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG, payload);
    return { persisted: true, reason: "updated" };
  }

  async clearPersistedSceneRuntime(sceneOrId) {
    if (!this.isAuthoritativeGM()) return { cleared: false, reason: "not-authoritative-gm" };
    const scene = this.sceneDocument(sceneOrId);
    if (!scene) return { cleared: false, reason: "scene-unavailable" };
    const current = flagFromScene(scene, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG);
    if (current == null) return { cleared: false, reason: "absent" };
    if (typeof scene.unsetFlag !== "function") return { cleared: false, reason: "unset-flag-unavailable" };
    await scene.unsetFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG);
    return { cleared: true, reason: "removed" };
  }

  async reconcileSceneSpatialProjections(scene, runtime = null) {
    return reconcileBattlefieldDynamicsAreaRegions(scene, runtime, { authoritative: this.isAuthoritativeGM() });
  }

  async bootstrapScene(scene, { persist = true } = {}) {
    const id = sceneId(scene);
    if (!nonEmpty(id)) throw new Error("Battlefield Dynamics runtime cannot bootstrap a Scene without an id.");
    let runtime;
    try {
      runtime = createBattlefieldDynamicsRuntimeState(scene);
    } catch (error) {
      this.scenes.delete(id);
      this.refreshSceneDiagnostics(scene, null);
      throw error;
    }

    if (runtime.status !== "active") {
      this.scenes.delete(id);
      const spatial = await this.reconcileSceneSpatialProjections(scene, runtime);
      this.refreshSceneDiagnostics(scene, runtime, spatial.issues);
      if (persist) await this.clearPersistedSceneRuntime(scene);
      return runtime;
    }

    this.scenes.set(id, runtime);
    if (persist) await this.persistSceneRuntime(scene, runtime);
    const spatial = await this.reconcileSceneSpatialProjections(scene, runtime);
    const cost = battlefieldDynamicsMovementCostCatalog(scene, runtime);
    this.refreshSceneDiagnostics(scene, runtime, [...spatial.issues, ...cost.issues]);
    return runtime;
  }

  async bootstrapWorldScenes() {
    const scenes = scenesArray(this.game?.scenes);
    const results = [];
    for (const scene of scenes) results.push(await this.bootstrapScene(scene));
    return results;
  }

  disposeScene(sceneOrId) {
    const id = typeof sceneOrId === "string" ? sceneOrId : sceneId(sceneOrId);
    if (!nonEmpty(id)) return false;
    const disposed = this.scenes.delete(id);
    this.triggerLedger.clearScene(id);
    for (const key of this.forcedMovementProcessed) if (key.startsWith(`${id}:`)) this.forcedMovementProcessed.delete(key);
    this.triggerEvents = this.triggerEvents.filter(event => event.sceneId !== id);
    for (const key of this.movementCostIssueKeys) if (key.includes(`"${id}"`)) this.movementCostIssueKeys.delete(key);
    this.diagnostics.clearScene(id);
    return disposed;
  }

  runtimeForScene(sceneOrId) {
    const id = typeof sceneOrId === "string" ? sceneOrId : sceneId(sceneOrId);
    return nonEmpty(id) ? this.scenes.get(id) ?? null : null;
  }

  listSceneRuntimes() {
    return Array.from(this.scenes.values());
  }

  movementSpentForToken(sceneOrId, tokenId) {
    const scene = this.sceneDocument(sceneOrId);
    return readBattlefieldDynamicsMovementLedger(scene).tokens[tokenId]?.spent ?? 0;
  }

  queueMovementLedgerWrite(scene, update) {
    const id = sceneId(scene);
    const previous = this.movementLedgerWrites.get(id) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      if (!this.isAuthoritativeGM() || !this.runtimeForScene(scene)) return { changed: false, reason: "not-authoritative-or-inactive" };
      const current = readBattlefieldDynamicsMovementLedger(scene);
      const result = update(current);
      if (result.reason === "ambiguous-checkpoint") {
        this.recordMovementCostIssue({ code: "movement-ledger-checkpoint-ambiguous", category: "movement-ledger",
          severity: "warning", automaticBlocked: true,
          message: "The movement path changed under the same movement ID without a verifiable continuation; movement spent was not changed.",
          provenance: { sceneId: id }, details: { movementId: result.movementId ?? null, tokenId: result.tokenId ?? null } });
      }
      if (result.changed) {
        if (typeof scene.setFlag !== "function") throw new Error("Scene cannot persist movement spent.");
        await scene.setFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_MOVEMENT_LEDGER_FLAG, result.ledger);
      }
      return result;
    });
    this.movementLedgerWrites.set(id, task);
    void task.finally(() => { if (this.movementLedgerWrites.get(id) === task) this.movementLedgerWrites.delete(id); }).catch(() => {});
    return task;
  }

  recordCompletedMovement(token, movement) {
    const scene = token?.parent;
    if (!scene || !this.isAuthoritativeGM() || !this.runtimeForScene(scene)) return Promise.resolve({ changed: false, reason: "not-authoritative-or-inactive" });
    return this.queueMovementLedgerWrite(scene, ledger => ({
      ...applyBattlefieldDynamicsMovement(ledger, token.id, movement), movementId: movement?.id, tokenId: token.id,
    }));
  }

  setMovementSpent(sceneOrId, tokenId, spent) {
    const scene = this.sceneDocument(sceneOrId);
    if (!scene || !this.isAuthoritativeGM()) return Promise.resolve({ changed: false, reason: "not-authoritative-or-unavailable" });
    return this.queueMovementLedgerWrite(scene, ledger => ({ changed: true,
      ledger: adjustBattlefieldDynamicsMovement(ledger, tokenId, spent), reason: "gm-adjustment" }));
  }

  handleTokenMovement(token, movement) {
    if (!this.isAuthoritativeGM()) return { events: [], issues: [], reason: "not-authoritative-gm" };
    const scene = token?.parent;
    const runtime = this.runtimeForScene(scene);
    if (!runtime) return { events: [], issues: [], reason: "runtime-inactive" };
    const normalized = normalizeBattlefieldDynamicsMovement(scene, runtime, token, movement);
    for (const diagnostic of normalized.issues) this.diagnostics.recordEvent(createBattlefieldDynamicsDiagnostic(diagnostic));
    const events = normalized.events.filter(event => this.triggerLedger.accept(event));
    this.triggerEvents.push(...events);
    if (this.triggerEvents.length > 1000) this.triggerEvents.splice(0, this.triggerEvents.length - 1000);
    return { events, issues: normalized.issues, reason: "normalized" };
  }

  async executeForcedMovementEvents(token, events) {
    if (!this.isAuthoritativeGM() || !Array.isArray(events) || !events.length) return [];
    const scene = token?.parent;
    const runtime = this.runtimeForScene(scene);
    if (!runtime) return [];
    const forced = events.filter(event => runtime.canonicalGeneration.executionHandoff?.instructions
      ?.some(instruction => instruction.key === event.instructionKey && instruction.kind === "forced-movement"));
    if (!forced.length) return [];
    const key = `${scene.id}:${token.id}`;
    if (this.forcedMovementInFlight.has(key)) return [];
    if (forced.length > 1) {
      this.recordMovementCostIssue({ code: "forced-movement-overlap-ambiguous", category: "forced-movement",
        severity: "warning", automaticBlocked: true,
        message: "Multiple forced movement instructions apply to this movement; GM must resolve their combined destination.",
        provenance: { sceneId: scene.id, tokenId: token.id },
        details: { instructionKeys: forced.map(event => event.instructionKey) } });
      return [];
    }
    const plan = planBattlefieldDynamicsForcedMovement(scene, runtime, token, forced[0]);
    if (plan.status !== "ready") {
      this.recordMovementCostIssue(plan.issue);
      return [{ moved: false, reason: plan.issue.code }];
    }
    const eventKey = `${key}:${forced[0].movementId}:${forced[0].instructionKey}:${forced[0].crossingIndex ?? 0}`;
    if (this.forcedMovementProcessed.has(eventKey)) return [];
    this.forcedMovementProcessed.add(eventKey);
    if (this.forcedMovementProcessed.size > 1024) this.forcedMovementProcessed.delete(this.forcedMovementProcessed.values().next().value);
    this.forcedMovementInFlight.add(key);
    try {
      const result = await executeBattlefieldDynamicsForcedMovement(plan);
      if (!result.moved) this.forcedMovementProcessed.delete(eventKey);
      if (!result.moved) this.recordMovementCostIssue({ code: "forced-movement-native-rejected",
        category: "forced-movement", severity: "warning", automaticBlocked: true,
        message: "Foundry did not complete the requested forced movement; GM resolution is required.",
        provenance: { sceneId: scene.id, tokenId: token.id, instructionKey: forced[0].instructionKey }, details: {} });
      return [result];
    } catch (error) {
      this.forcedMovementProcessed.delete(eventKey);
      throw error;
    } finally {
      this.forcedMovementInFlight.delete(key);
    }
  }

  drainTriggerEvents() {
    return this.triggerEvents.splice(0);
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
      this.diagnostics.recordEvent(diagnoseBattlefieldDynamicsSocketFailure(message, error));
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

function logLifecycleError(label, error) {
  globalThis.console?.error?.(`${MODULE_ID} | Battlefield Dynamics ${label} failed`, error);
}

export function installBattlefieldDynamicsRuntime({ HooksRef = globalThis.Hooks, gameRef = null } = {}) {
  if (installed) return battlefieldDynamicsRuntimeManager;
  installed = true;
  if (gameRef) battlefieldDynamicsRuntimeManager.bindGame(gameRef);
  if (!HooksRef?.once || !HooksRef?.on) return battlefieldDynamicsRuntimeManager;

  HooksRef.once("ready", async () => {
    battlefieldDynamicsRuntimeManager.bindGame(globalThis.game ?? gameRef);
    battlefieldDynamicsRuntimeManager.registerSocket();
    if (!installBattlefieldDynamicsMovementCostAdapter(globalThis.CONFIG?.Token?.objectClass, battlefieldDynamicsRuntimeManager)) {
      globalThis.console?.warn?.(`${MODULE_ID} | Battlefield Dynamics movement cost adapter unavailable for configured Token class`);
      for (const scene of scenesArray(battlefieldDynamicsRuntimeManager.game?.scenes)) {
        battlefieldDynamicsRuntimeManager.recordMovementCostIssue({
          code: "movement-cost-adapter-unavailable", category: "movement-cost", severity: "warning",
          automaticBlocked: true, message: "Configured Foundry Token class lacks the movement cost integration method.",
          provenance: { sceneId: sceneId(scene) }, details: {},
        });
      }
    }
    try {
      await battlefieldDynamicsRuntimeManager.bootstrapWorldScenes();
    } catch (error) {
      logLifecycleError("world bootstrap", error);
    }
  });

  HooksRef.on("createScene", async scene => {
    try {
      await battlefieldDynamicsRuntimeManager.bootstrapScene(scene);
    } catch (error) {
      logLifecycleError("Scene creation bootstrap", error);
    }
  });

  HooksRef.on("updateScene", async (scene, changes) => {
    if (!battlefieldDynamicsSceneUpdateIsRelevant(changes)) return;
    try {
      await battlefieldDynamicsRuntimeManager.bootstrapScene(scene);
    } catch (error) {
      logLifecycleError("Scene update rehydration", error);
    }
  });

  HooksRef.on("deleteScene", scene => {
    battlefieldDynamicsRuntimeManager.disposeScene(scene);
  });

  HooksRef.on("moveToken", (token, movement) => {
    try {
      const { events } = battlefieldDynamicsRuntimeManager.handleTokenMovement(token, movement);
      void battlefieldDynamicsRuntimeManager.executeForcedMovementEvents(token, events)
        .catch(error => logLifecycleError("forced movement", error));
      void battlefieldDynamicsRuntimeManager.recordCompletedMovement(token, movement)
        .catch(error => logLifecycleError("movement ledger persistence", error));
    } catch (error) {
      logLifecycleError("token movement normalization", error);
    }
  });

  return battlefieldDynamicsRuntimeManager;
}
