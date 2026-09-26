import assert from "node:assert/strict";
import {
  BATTLEFIELD_DYNAMICS_EFFECT_KINDS,
  BATTLEFIELD_DYNAMICS_GENERATION_KINDS,
  BATTLEFIELD_DYNAMICS_TRIGGER_KINDS,
} from "./battlefield-dynamics-contract.mjs";
import {
  BATTLEFIELD_DYNAMICS_RUNTIME_FLAG,
  BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
  BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
  BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE,
  BattlefieldDynamicsRuntimeManager,
  battlefieldDynamicsSceneUpdateIsRelevant,
  createBattlefieldDynamicsRuntimeState,
  designatedActiveGM,
  installBattlefieldDynamicsRuntime,
  isAuthoritativeGM,
  serializeBattlefieldDynamicsRuntimeState,
} from "./battlefield-dynamics-runtime.mjs";
import { BATTLEFIELD_DYNAMICS_PROJECTION_FLAG, BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
  buildBattlefieldDynamicsAreaProjectionPlan } from "./battlefield-dynamics-spatial.mjs";

const MODULE_ID = "orphaned-sun-scenes";

const contract = {
  version: 1,
  ownership: "system-neutral-downstream-execution-handoff",
  automaticExecutionRequires: ["validated-effect-operation", "resolved-support-target", "executable-trigger"],
  unresolvedPolicy: "gm-confirmed-never-inferred",
  supportAuthority: "canonical-source-geometry-references-only",
  dynamicApplicationGeometryPersisted: false,
  preservesApplicationIdentity: true,
  preservesExactSpatialMembership: true,
  preservesIndependentRuleContributions: true,
  ownsMutableRuntimeState: false,
  ownsSitrepSemantics: false,
  ownsFoundryBehaviorAutomation: false,
  mayMoveCanonicalGeometry: false,
};

function generation() {
  return {
    environmentId: "Open Field",
    ruleRegistries: {
      triggerKinds: [...BATTLEFIELD_DYNAMICS_TRIGGER_KINDS],
      generationRuleKinds: [...BATTLEFIELD_DYNAMICS_GENERATION_KINDS],
      effectRuleKinds: [...BATTLEFIELD_DYNAMICS_EFFECT_KINDS],
    },
    applicationComposition: {
      instanceIdentity: ["environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"],
      instances: [
        {
          key: "Open Field/ruins/fragile-cover/application-a",
          environmentId: "Open Field",
          physicalContextId: "ruins",
          dynamicId: "fragile-cover",
          sourceApplicationId: "application-a",
          stateInitialization: { mode: "finite-state", initialState: "intact" },
        },
        {
          key: "Open Field/ruins/fragile-cover/application-b",
          environmentId: "Open Field",
          physicalContextId: "ruins",
          dynamicId: "fragile-cover",
          sourceApplicationId: "application-b",
          stateInitialization: { mode: "finite-state", initialState: "intact" },
        },
        {
          key: "Open Field/road/wind/application-c",
          environmentId: "Open Field",
          physicalContextId: "road",
          dynamicId: "wind",
          sourceApplicationId: "application-c",
          stateInitialization: { mode: "stateless", initialState: null },
        },
      ],
      spatialGroups: [],
    },
    executionHandoff: {
      contract,
      implementationStatus: "automatic-ready",
      automaticInstructionCount: 0,
      gmConfirmedInstructionCount: 0,
      instructions: [],
      environmentIntrinsicInstructions: [],
      mutableRuntimeStateResolved: false,
      sitrepResolved: false,
      foundryBehaviorAutomationResolved: false,
    },
  };
}

function executableScene(id = "scene-1") {
  return {
    id,
    name: "Runtime Test Scene",
    flags: {
      [MODULE_ID]: {
        battlefieldDynamicsGeneration: generation(),
      },
    },
  };
}

function sceneDocument(raw) {
  const data = structuredClone(raw);
  const writes = { set: 0, unset: 0 };
  return {
    id: data.id,
    name: data.name,
    writes,
    toObject() {
      return structuredClone(data);
    },
    getFlag(moduleId, key) {
      return data.flags?.[moduleId]?.[key] ?? null;
    },
    async setFlag(moduleId, key, value) {
      data.flags ??= {};
      data.flags[moduleId] ??= {};
      data.flags[moduleId][key] = structuredClone(value);
      writes.set += 1;
      return this;
    },
    async unsetFlag(moduleId, key) {
      if (data.flags?.[moduleId]) delete data.flags[moduleId][key];
      writes.unset += 1;
      return this;
    },
    replaceGeneration(value) {
      data.flags ??= {};
      data.flags[MODULE_ID] ??= {};
      if (value == null) delete data.flags[MODULE_ID].battlefieldDynamicsGeneration;
      else data.flags[MODULE_ID].battlefieldDynamicsGeneration = structuredClone(value);
    },
    setRawRuntime(value) {
      data.flags ??= {};
      data.flags[MODULE_ID] ??= {};
      data.flags[MODULE_ID][BATTLEFIELD_DYNAMICS_RUNTIME_FLAG] = structuredClone(value);
    },
    snapshot() {
      return structuredClone(data);
    },
  };
}

const scene = executableScene();
const before = structuredClone(scene.flags[MODULE_ID].battlefieldDynamicsGeneration);
const runtime = createBattlefieldDynamicsRuntimeState(scene);
assert.equal(runtime.status, "active");
assert.equal(runtime.ownership, BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP);
assert.equal(runtime.persistence, BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE);
assert.equal(runtime.instances.size, 3);
assert.deepEqual(runtime.rehydration, {
  persistedStatus: "absent",
  restoredApplicationCount: 0,
  initializedApplicationCount: 3,
  staleApplicationCount: 0,
});
assert.equal(runtime.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "intact");
assert.equal(runtime.instances.get("Open Field/road/wind/application-c").currentState, null);
assert.ok(Object.isFrozen(runtime.canonicalGeneration));
assert.ok(Object.isFrozen(runtime.canonicalGeneration.executionHandoff.contract));
assert.ok(Object.isFrozen(runtime.instances.get("Open Field/ruins/fragile-cover/application-a").stateInitialization));
assert.deepEqual(scene.flags[MODULE_ID].battlefieldDynamicsGeneration, before);

runtime.instances.get("Open Field/ruins/fragile-cover/application-a").currentState = "broken";
runtime.instances.get("Open Field/ruins/fragile-cover/application-a").revision = 4;
assert.equal(runtime.instances.get("Open Field/ruins/fragile-cover/application-b").currentState, "intact");
assert.equal(runtime.canonicalGeneration.applicationComposition.instances[0].stateInitialization.initialState, "intact");
assert.deepEqual(scene.flags[MODULE_ID].battlefieldDynamicsGeneration, before);

const serialized = serializeBattlefieldDynamicsRuntimeState(runtime);
assert.equal(serialized.sceneId, "scene-1");
assert.equal(serialized.ownership, BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP);
assert.equal(serialized.persistence, BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE);
assert.equal(serialized.applications["Open Field/ruins/fragile-cover/application-a"].currentState, "broken");
assert.equal(serialized.applications["Open Field/ruins/fragile-cover/application-a"].revision, 4);
assert.equal(serialized.applications["Open Field/road/wind/application-c"].currentState, null);

const reloadScene = structuredClone(scene);
reloadScene.flags[MODULE_ID][BATTLEFIELD_DYNAMICS_RUNTIME_FLAG] = structuredClone(serialized);
const reloaded = createBattlefieldDynamicsRuntimeState(reloadScene);
assert.equal(reloaded.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "broken");
assert.equal(reloaded.instances.get("Open Field/ruins/fragile-cover/application-a").revision, 4);
assert.deepEqual(reloaded.rehydration, {
  persistedStatus: "valid",
  restoredApplicationCount: 3,
  initializedApplicationCount: 0,
  staleApplicationCount: 0,
});

const changedGeneration = generation();
changedGeneration.applicationComposition.instances = [
  changedGeneration.applicationComposition.instances[0],
  changedGeneration.applicationComposition.instances[2],
  {
    key: "Open Field/bridge/shutters/application-d",
    environmentId: "Open Field",
    physicalContextId: "bridge",
    dynamicId: "shutters",
    sourceApplicationId: "application-d",
    stateInitialization: { mode: "finite-state", initialState: "closed" },
  },
];
const changedScene = structuredClone(reloadScene);
changedScene.flags[MODULE_ID].battlefieldDynamicsGeneration = changedGeneration;
const reconciled = createBattlefieldDynamicsRuntimeState(changedScene);
assert.equal(reconciled.instances.size, 3);
assert.equal(reconciled.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "broken");
assert.equal(reconciled.instances.get("Open Field/road/wind/application-c").currentState, null);
assert.equal(reconciled.instances.get("Open Field/bridge/shutters/application-d").currentState, "closed");
assert.deepEqual(reconciled.rehydration, {
  persistedStatus: "valid",
  restoredApplicationCount: 2,
  initializedApplicationCount: 1,
  staleApplicationCount: 1,
});
assert.equal(serializeBattlefieldDynamicsRuntimeState(reconciled).applications["Open Field/ruins/fragile-cover/application-b"], undefined);

const incompatibleScene = structuredClone(reloadScene);
incompatibleScene.flags[MODULE_ID].battlefieldDynamicsGeneration.applicationComposition.instances[0].stateInitialization = {
  mode: "finite-state",
  initialState: "pristine",
};
const incompatible = createBattlefieldDynamicsRuntimeState(incompatibleScene);
assert.equal(incompatible.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "pristine");
assert.equal(incompatible.instances.get("Open Field/ruins/fragile-cover/application-a").revision, 0);
assert.equal(incompatible.rehydration.restoredApplicationCount, 2);
assert.equal(incompatible.rehydration.initializedApplicationCount, 1);

const malformedStoreScene = structuredClone(scene);
malformedStoreScene.flags[MODULE_ID][BATTLEFIELD_DYNAMICS_RUNTIME_FLAG] = {
  version: 999,
  ownership: BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
  persistence: BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
  sceneId: malformedStoreScene.id,
  applications: {},
};
const malformedStoreRuntime = createBattlefieldDynamicsRuntimeState(malformedStoreScene);
assert.equal(malformedStoreRuntime.rehydration.persistedStatus, "invalid");
assert.equal(malformedStoreRuntime.rehydration.initializedApplicationCount, 3);

const copiedStoreScene = structuredClone(reloadScene);
copiedStoreScene.id = "copied-scene";
const copiedStoreRuntime = createBattlefieldDynamicsRuntimeState(copiedStoreScene);
assert.equal(copiedStoreRuntime.rehydration.persistedStatus, "invalid");
assert.equal(copiedStoreRuntime.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "intact");

const absent = createBattlefieldDynamicsRuntimeState({ id: "absent", flags: {} });
assert.deepEqual(absent, { status: "inactive", reason: "absent", sceneId: "absent", receiverStatus: "absent" });
const legacy = createBattlefieldDynamicsRuntimeState({
  id: "legacy",
  flags: { [MODULE_ID]: { battlefieldDynamicsGeneration: { applicationComposition: {} } } },
});
assert.equal(legacy.status, "inactive");
assert.equal(legacy.reason, "legacy-semantic-only");

const malformed = executableScene("bad-state");
malformed.flags[MODULE_ID].battlefieldDynamicsGeneration.applicationComposition.instances[0].stateInitialization = {
  mode: "finite-state",
  initialState: null,
};
assert.throws(() => createBattlefieldDynamicsRuntimeState(malformed), /requires an initial state/);

assert.equal(battlefieldDynamicsSceneUpdateIsRelevant({ name: "No runtime change" }), false);
assert.equal(battlefieldDynamicsSceneUpdateIsRelevant({ flags: { other: { value: true } } }), false);
assert.equal(battlefieldDynamicsSceneUpdateIsRelevant({ flags: { [MODULE_ID]: { battlefieldDynamicsGeneration: {} } } }), true);
assert.equal(battlefieldDynamicsSceneUpdateIsRelevant({ flags: { [MODULE_ID]: { battlefieldDynamicsRuntime: {} } } }), true);
assert.equal(battlefieldDynamicsSceneUpdateIsRelevant({ [`flags.${MODULE_ID}.battlefieldDynamicsRuntime`]: {} }), true);
assert.equal(battlefieldDynamicsSceneUpdateIsRelevant({ [`flags.${MODULE_ID}.-=battlefieldDynamicsGeneration`]: null }), true);

const gm1 = { id: "gm-1", isGM: true, active: true };
const gm2 = { id: "gm-2", isGM: true, active: true };
const player = { id: "player-1", isGM: false, active: true };
const users = {
  activeGM: gm1,
  values: () => [gm1, gm2, player].values(),
};
assert.equal(designatedActiveGM({ users }), gm1);
assert.equal(isAuthoritativeGM({ users, user: gm1 }), true);
assert.equal(isAuthoritativeGM({ users, user: gm2 }), false);
assert.equal(isAuthoritativeGM({ users, user: player }), false);

const triggerScene = { id: "trigger-scene" };
const triggerInstance = { key: "instance-1", environmentId: "Open Field", physicalContextId: "road",
  dynamicId: "wind", sourceApplicationId: "application-1" };
const triggerInstruction = { key: "instruction-1", instanceKey: "instance-1", sourceApplicationId: "application-1",
  source: "effect", kind: "hazard-effect", ruleId: "rule-1", triggerId: "trigger-1", trigger: { kind: "on-enter" },
  resolvedSupport: { kind: "source-application" } };
const triggerGeneration = { executionHandoff: { instructions: [triggerInstruction] },
  applicationComposition: { instances: [triggerInstance], spatialGroups: [
    { instanceKeys: [triggerInstance.key], cells: [{ col: 0, row: 0 }] },
  ] } };
const triggerProjection = buildBattlefieldDynamicsAreaProjectionPlan(triggerGeneration).projections[0];
triggerScene.regions = [{ id: "projection-1", getFlag(scope, key) {
  return scope === MODULE_ID && key === BATTLEFIELD_DYNAMICS_PROJECTION_FLAG ? {
    version: 1, ownership: BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
    sceneId: triggerScene.id, projectionKey: triggerProjection.projectionKey,
    cellSignature: triggerProjection.cellSignature, owners: [{
      instanceKey: triggerInstance.key, sourceApplicationId: triggerInstance.sourceApplicationId,
      physicalContextId: triggerInstance.physicalContextId, dynamicId: triggerInstance.dynamicId,
      instructionKey: triggerInstruction.key, ruleId: triggerInstruction.ruleId,
      source: triggerInstruction.source, kind: triggerInstruction.kind,
    }],
  } : null;
} }];
const triggerToken = { id: "large-unit", parent: triggerScene,
  testInsideRegion(_region, point) { return point.x > 0; },
  segmentizeRegionMovementPath(_region, waypoints) {
    return [{ type: 1, from: waypoints[0], to: waypoints[1] }];
  } };
const triggerMovement = { id: "move-1", origin: { x: 0, y: 0 }, destination: { x: 1, y: 0 },
  passed: { waypoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }] } };
const triggerManager = new BattlefieldDynamicsRuntimeManager({ gameRef: { users, user: gm1 } });
const costIssue = { code: "movement-cost-contract-unavailable", category: "movement-cost",
  severity: "warning", automaticBlocked: true, message: "Movement cost contract missing.",
  provenance: { sceneId: triggerScene.id }, details: {} };
triggerManager.recordMovementCostIssue(costIssue);
triggerManager.recordMovementCostIssue(costIssue);
assert.equal(triggerManager.diagnosticsForScene(triggerScene.id).filter(item => item.code === costIssue.code).length, 1);
triggerManager.scenes.set(triggerScene.id, { status: "active", sceneId: triggerScene.id,
  canonicalGeneration: triggerGeneration });
assert.equal(triggerManager.handleTokenMovement(triggerToken, triggerMovement).events.length, 1);
assert.equal(triggerManager.handleTokenMovement(triggerToken, triggerMovement).events.length, 0);
assert.equal(triggerManager.drainTriggerEvents().length, 1);
assert.deepEqual(triggerManager.drainTriggerEvents(), []);
triggerManager.game.user = gm2;
assert.equal(triggerManager.handleTokenMovement(triggerToken, { ...triggerMovement, id: "move-2" }).reason, "not-authoritative-gm");
triggerManager.game.user = gm1;
triggerManager.disposeScene(triggerScene);
assert.equal(triggerManager.handleTokenMovement(triggerToken, triggerMovement).reason, "runtime-inactive");

let socketNamespace = null;
let socketHandler = null;
const socket = {
  on(namespace, handler) {
    socketNamespace = namespace;
    socketHandler = handler;
  },
};

const managedDocument = sceneDocument(executableScene("managed"));
const plainDocument = sceneDocument({ id: "plain", name: "Plain", flags: {} });
const manager = new BattlefieldDynamicsRuntimeManager({
  gameRef: { users, user: gm1, socket, scenes: [managedDocument, plainDocument] },
});
assert.equal(manager.registerSocket(), true);
assert.equal(manager.registerSocket(), true);
assert.equal(socketNamespace, BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE);
assert.equal(typeof socketHandler, "function");
assert.deepEqual(manager.receiveSocketMessage({ version: 1, type: "runtime-authority-probe" }), { handled: true, reason: "authority-probe" });
assert.equal(manager.receiveSocketMessage({ version: 1, type: "not-yet-supported" }).handled, false);
assert.equal(manager.listDiagnostics().at(-1).code, "socket-message-unsupported");
assert.equal(manager.receiveSocketMessage({ version: 99, type: "runtime-authority-probe", sceneId: "managed" }).handled, false);
assert.equal(manager.listDiagnostics().at(-1).code, "socket-version-unsupported");
assert.equal(manager.diagnosticsForScene("managed").at(-1).code, "socket-version-unsupported");

const bootstrapped = await manager.bootstrapWorldScenes();
assert.equal(bootstrapped.length, 2);
assert.equal(manager.runtimeForScene("managed").status, "active");
assert.equal(manager.runtimeForScene("plain"), null);
assert.equal(manager.listSceneRuntimes().length, 1);
assert.equal(manager.diagnosticsForScene("managed").some(diagnostic => diagnostic.category === "spatial"), false);
assert.equal(managedDocument.writes.set, 1);
assert.equal(plainDocument.writes.unset, 0);
const persistedInitial = managedDocument.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG);
assert.equal(persistedInitial.applications["Open Field/ruins/fragile-cover/application-a"].currentState, "intact");

manager.runtimeForScene("managed").instances.get("Open Field/ruins/fragile-cover/application-a").currentState = "broken";
manager.runtimeForScene("managed").instances.get("Open Field/ruins/fragile-cover/application-a").revision = 2;
assert.deepEqual(await manager.persistSceneRuntime(managedDocument), { persisted: true, reason: "updated" });
assert.deepEqual(await manager.persistSceneRuntime(managedDocument), { persisted: false, reason: "unchanged" });
assert.equal(managedDocument.writes.set, 2);

const reloadManager = new BattlefieldDynamicsRuntimeManager({
  gameRef: { users, user: gm1, socket, scenes: [managedDocument] },
});
const rehydratedManaged = await reloadManager.bootstrapScene(managedDocument);
assert.equal(rehydratedManaged.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "broken");
assert.equal(rehydratedManaged.instances.get("Open Field/ruins/fragile-cover/application-a").revision, 2);
assert.equal(rehydratedManaged.rehydration.restoredApplicationCount, 3);
assert.equal(managedDocument.writes.set, 2);

const stalePersisted = managedDocument.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG);
stalePersisted.applications["stale/application"] = {
  identity: {
    environmentId: "Open Field",
    physicalContextId: "old",
    dynamicId: "old",
    sourceApplicationId: "old",
  },
  stateInitialization: { mode: "finite-state", initialState: "old" },
  currentState: "old",
  revision: 1,
};
managedDocument.setRawRuntime(stalePersisted);
const cleaned = await reloadManager.bootstrapScene(managedDocument);
assert.equal(cleaned.rehydration.staleApplicationCount, 1);
assert.equal(managedDocument.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG).applications["stale/application"], undefined);
assert.equal(reloadManager.diagnosticsForScene("managed").some(diagnostic => diagnostic.code === "runtime-stale-applications-pruned"), true);

const diagnosticStoreDocument = sceneDocument(executableScene("diagnostic-store"));
diagnosticStoreDocument.setRawRuntime({
  version: 999,
  ownership: BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
  persistence: BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
  sceneId: "diagnostic-store",
  applications: {},
});
const diagnosticManager = new BattlefieldDynamicsRuntimeManager({
  gameRef: { users, user: gm1, socket, scenes: [diagnosticStoreDocument] },
});
await diagnosticManager.bootstrapScene(diagnosticStoreDocument);
assert.equal(diagnosticManager.diagnosticsForScene("diagnostic-store").some(diagnostic => diagnostic.code === "runtime-store-reset"), true);

const inactiveWithRuntime = sceneDocument({
  id: "inactive-with-runtime",
  flags: { [MODULE_ID]: { [BATTLEFIELD_DYNAMICS_RUNTIME_FLAG]: serialized } },
});
const inactiveManager = new BattlefieldDynamicsRuntimeManager({
  gameRef: { users, user: gm1, socket, scenes: [inactiveWithRuntime] },
});
const inactiveResult = await inactiveManager.bootstrapScene(inactiveWithRuntime);
assert.equal(inactiveResult.status, "inactive");
assert.equal(inactiveWithRuntime.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG), null);
assert.equal(inactiveWithRuntime.writes.unset, 1);

const playerDocument = sceneDocument(executableScene("player-view"));
const playerManager = new BattlefieldDynamicsRuntimeManager({
  gameRef: { users, user: player, socket, scenes: [playerDocument] },
});
await playerManager.bootstrapScene(playerDocument);
assert.equal(playerDocument.writes.set, 0);
assert.equal(playerManager.runtimeForScene("player-view").status, "active");

assert.equal(manager.disposeScene("managed"), true);
assert.equal(manager.runtimeForScene("managed"), null);
assert.deepEqual(manager.diagnosticsForScene("managed"), []);
manager.bindGame({ users, user: gm2, socket, scenes: [] });
assert.deepEqual(manager.receiveSocketMessage({ version: 1, type: "runtime-authority-probe" }), { handled: false, reason: "not-authoritative-gm" });

const readyHooks = new Map();
const persistentHooks = new Map();
const HooksRef = {
  once(name, fn) { readyHooks.set(name, fn); },
  on(name, fn) { persistentHooks.set(name, fn); },
};
const readyDocument = sceneDocument(executableScene("ready-scene"));
const lifecycleGame = { users, user: gm1, socket, scenes: [readyDocument] };
globalThis.game = lifecycleGame;
const installed = installBattlefieldDynamicsRuntime({ HooksRef, gameRef: lifecycleGame });
assert.equal(typeof readyHooks.get("ready"), "function");
assert.equal(typeof persistentHooks.get("createScene"), "function");
assert.equal(typeof persistentHooks.get("updateScene"), "function");
assert.equal(typeof persistentHooks.get("deleteScene"), "function");
await readyHooks.get("ready")();
assert.equal(installed.runtimeForScene("ready-scene").status, "active");
assert.equal(readyDocument.writes.set, 1);

const createdDocument = sceneDocument(executableScene("created-scene"));
await persistentHooks.get("createScene")(createdDocument);
assert.equal(installed.runtimeForScene("created-scene").status, "active");
assert.equal(createdDocument.writes.set, 1);

const beforeIrrelevant = createdDocument.writes.set;
await persistentHooks.get("updateScene")(createdDocument, { name: "Renamed" });
assert.equal(createdDocument.writes.set, beforeIrrelevant);
createdDocument.replaceGeneration(null);
await persistentHooks.get("updateScene")(createdDocument, { flags: { [MODULE_ID]: { "-=battlefieldDynamicsGeneration": null } } });
assert.equal(installed.runtimeForScene("created-scene"), null);
assert.equal(createdDocument.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG), null);
assert.equal(createdDocument.writes.unset, 1);

const restoreOld = sceneDocument(executableScene("restore-old"));
await installed.bootstrapScene(restoreOld);
installed.runtimeForScene("restore-old").instances.get("Open Field/ruins/fragile-cover/application-a").currentState = "broken";
installed.runtimeForScene("restore-old").instances.get("Open Field/ruins/fragile-cover/application-a").revision = 3;
await installed.persistSceneRuntime(restoreOld);
assert.equal(restoreOld.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_RUNTIME_FLAG).applications["Open Field/ruins/fragile-cover/application-a"].currentState, "broken");
persistentHooks.get("deleteScene")(restoreOld);
assert.equal(installed.runtimeForScene("restore-old"), null);
assert.deepEqual(installed.diagnosticsForScene("restore-old"), []);

const restoreNew = sceneDocument(executableScene("restore-new"));
await persistentHooks.get("createScene")(restoreNew);
assert.equal(installed.runtimeForScene("restore-new").instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "intact");
assert.equal(installed.runtimeForScene("restore-new").instances.get("Open Field/ruins/fragile-cover/application-a").revision, 0);
assert.equal(installed.runtimeForScene("restore-new").rehydration.persistedStatus, "absent");

persistentHooks.get("deleteScene")(readyDocument);
assert.equal(installed.runtimeForScene("ready-scene"), null);
assert.deepEqual(installed.diagnosticsForScene("ready-scene"), []);
delete globalThis.game;

const ledgerScene = sceneDocument(executableScene("ledger-scene"));
const ledgerGame = { user: { id: "gm", isGM: true }, users: { activeGM: { id: "gm", isGM: true } },
  scenes: new Map([[ledgerScene.id, ledgerScene]]) };
const ledgerManager = new BattlefieldDynamicsRuntimeManager({ gameRef: ledgerGame });
await ledgerManager.bootstrapScene(ledgerScene);
const ledgerToken = { id: "token", parent: ledgerScene };
const ledgerMove = { id: "move-1", passed: { cost: 10, waypoints: [{ x: 0, y: 0 }, { x: 60, y: 0 }] } };
await Promise.all([ledgerManager.recordCompletedMovement(ledgerToken, ledgerMove),
  ledgerManager.recordCompletedMovement(ledgerToken, ledgerMove)]);
assert.equal(ledgerManager.movementSpentForToken(ledgerScene, "token"), 10);
await ledgerManager.setMovementSpent(ledgerScene, "token", 4);
assert.equal(ledgerManager.movementSpentForToken(ledgerScene, "token"), 4);
await ledgerManager.recordCompletedMovement(ledgerToken, { ...ledgerMove, id: "move-2" });
assert.equal(ledgerManager.movementSpentForToken(ledgerScene, "token"), 14);
ledgerGame.user = { id: "player", isGM: false };
assert.equal((await ledgerManager.recordCompletedMovement(ledgerToken, { ...ledgerMove, id: "move-3" })).changed, false);
assert.equal(ledgerManager.movementSpentForToken(ledgerScene, "token"), 14);

console.log("battlefield dynamics runtime rehydration, spatial, and diagnostics integration tests passed");
