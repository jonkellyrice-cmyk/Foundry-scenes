import assert from "node:assert/strict";
import {
  BATTLEFIELD_DYNAMICS_EFFECT_KINDS,
  BATTLEFIELD_DYNAMICS_GENERATION_KINDS,
  BATTLEFIELD_DYNAMICS_TRIGGER_KINDS,
} from "./battlefield-dynamics-contract.mjs";
import {
  BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP,
  BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE,
  BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE,
  BattlefieldDynamicsRuntimeManager,
  createBattlefieldDynamicsRuntimeState,
  designatedActiveGM,
  installBattlefieldDynamicsRuntime,
  isAuthoritativeGM,
} from "./battlefield-dynamics-runtime.mjs";

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
      "orphaned-sun-scenes": {
        battlefieldDynamicsGeneration: generation(),
      },
    },
  };
}

const scene = executableScene();
const before = structuredClone(scene.flags["orphaned-sun-scenes"].battlefieldDynamicsGeneration);
const runtime = createBattlefieldDynamicsRuntimeState(scene);
assert.equal(runtime.status, "active");
assert.equal(runtime.ownership, BATTLEFIELD_DYNAMICS_RUNTIME_OWNERSHIP);
assert.equal(runtime.persistence, BATTLEFIELD_DYNAMICS_RUNTIME_PERSISTENCE);
assert.equal(runtime.instances.size, 3);
assert.equal(runtime.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "intact");
assert.equal(runtime.instances.get("Open Field/road/wind/application-c").currentState, null);
assert.ok(Object.isFrozen(runtime.canonicalGeneration));
assert.ok(Object.isFrozen(runtime.canonicalGeneration.executionHandoff.contract));
assert.deepEqual(scene.flags["orphaned-sun-scenes"].battlefieldDynamicsGeneration, before);

runtime.instances.get("Open Field/ruins/fragile-cover/application-a").currentState = "broken";
assert.equal(runtime.instances.get("Open Field/ruins/fragile-cover/application-a").currentState, "broken");
assert.equal(runtime.instances.get("Open Field/ruins/fragile-cover/application-b").currentState, "intact");
assert.equal(runtime.canonicalGeneration.applicationComposition.instances[0].stateInitialization.initialState, "intact");
assert.deepEqual(scene.flags["orphaned-sun-scenes"].battlefieldDynamicsGeneration, before);

const absent = createBattlefieldDynamicsRuntimeState({ id: "absent", flags: {} });
assert.deepEqual(absent, { status: "inactive", reason: "absent", sceneId: "absent", receiverStatus: "absent" });
const legacy = createBattlefieldDynamicsRuntimeState({
  id: "legacy",
  flags: { "orphaned-sun-scenes": { battlefieldDynamicsGeneration: { applicationComposition: {} } } },
});
assert.equal(legacy.status, "inactive");
assert.equal(legacy.reason, "legacy-semantic-only");

const malformed = executableScene("bad-state");
malformed.flags["orphaned-sun-scenes"].battlefieldDynamicsGeneration.applicationComposition.instances[0].stateInitialization = {
  mode: "finite-state",
  initialState: null,
};
assert.throws(() => createBattlefieldDynamicsRuntimeState(malformed), /requires an initial state/);

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

let socketNamespace = null;
let socketHandler = null;
const socket = {
  on(namespace, handler) {
    socketNamespace = namespace;
    socketHandler = handler;
  },
};
const manager = new BattlefieldDynamicsRuntimeManager({ gameRef: { users, user: gm1, socket, scenes: [executableScene("managed"), { id: "plain", flags: {} }] } });
assert.equal(manager.registerSocket(), true);
assert.equal(manager.registerSocket(), true);
assert.equal(socketNamespace, BATTLEFIELD_DYNAMICS_SOCKET_NAMESPACE);
assert.equal(typeof socketHandler, "function");
assert.deepEqual(manager.receiveSocketMessage({ version: 1, type: "runtime-authority-probe" }), { handled: true, reason: "authority-probe" });
assert.equal(manager.receiveSocketMessage({ version: 1, type: "not-yet-supported" }).handled, false);
const bootstrapped = manager.bootstrapWorldScenes();
assert.equal(bootstrapped.length, 2);
assert.equal(manager.runtimeForScene("managed").status, "active");
assert.equal(manager.runtimeForScene("plain"), null);
assert.equal(manager.listSceneRuntimes().length, 1);
assert.equal(manager.disposeScene("managed"), true);
assert.equal(manager.runtimeForScene("managed"), null);

manager.bindGame({ users, user: gm2, socket, scenes: [] });
assert.deepEqual(manager.receiveSocketMessage({ version: 1, type: "runtime-authority-probe" }), { handled: false, reason: "not-authoritative-gm" });

const readyHooks = new Map();
const persistentHooks = new Map();
const HooksRef = {
  once(name, fn) { readyHooks.set(name, fn); },
  on(name, fn) { persistentHooks.set(name, fn); },
};
const lifecycleGame = { users, user: gm1, socket, scenes: [executableScene("ready-scene")] };
globalThis.game = lifecycleGame;
const installed = installBattlefieldDynamicsRuntime({ HooksRef, gameRef: lifecycleGame });
assert.equal(typeof readyHooks.get("ready"), "function");
assert.equal(typeof persistentHooks.get("createScene"), "function");
readyHooks.get("ready")();
assert.equal(installed.runtimeForScene("ready-scene").status, "active");
persistentHooks.get("createScene")(executableScene("created-scene"));
assert.equal(installed.runtimeForScene("created-scene").status, "active");
delete globalThis.game;

console.log("battlefield dynamics runtime bootstrap tests passed");
