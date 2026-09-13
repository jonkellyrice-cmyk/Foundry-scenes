import assert from "node:assert/strict";
import {
  BATTLEFIELD_DYNAMICS_EFFECT_KINDS,
  BATTLEFIELD_DYNAMICS_GENERATION_KINDS,
  BATTLEFIELD_DYNAMICS_TRIGGER_KINDS,
  assertBattlefieldDynamicsExecutionHandoff,
  assertBattlefieldDynamicsOperation,
  assertBattlefieldDynamicsSceneData,
  assertBattlefieldDynamicsSupportTarget,
  battlefieldDynamicsReceiverState,
} from "./battlefield-dynamics-contract.mjs";

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

function validGeneration() {
  return {
    environmentId: "exotic",
    applicationComposition: {
      instanceIdentity: ["environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"],
      instances: [{
        key: "exotic/crystalline-terrain/shard-growth/ctx-crystal-01",
        environmentId: "exotic",
        physicalContextId: "crystalline-terrain",
        dynamicId: "shard-growth",
        sourceApplicationId: "ctx-crystal-01",
      }],
    },
    ruleRegistries: {
      triggerKinds: [...BATTLEFIELD_DYNAMICS_TRIGGER_KINDS],
      generationRuleKinds: [...BATTLEFIELD_DYNAMICS_GENERATION_KINDS],
      effectRuleKinds: [...BATTLEFIELD_DYNAMICS_EFFECT_KINDS],
    },
    executionHandoff: {
      contract: structuredClone(contract),
      implementationStatus: "gm-confirmation-required",
      automaticInstructionCount: 1,
      gmConfirmedInstructionCount: 1,
      instructions: [{
        key: "exotic/crystalline-terrain/shard-growth/ctx-crystal-01/effect/shard-growth-effect-1/execution",
        instanceKey: "exotic/crystalline-terrain/shard-growth/ctx-crystal-01",
        sourceApplicationId: "ctx-crystal-01",
        source: "effect",
        ruleId: "shard-growth-effect-1",
        kind: "terrain-state-change",
        triggerId: "shard-growth-trigger",
        semanticParameters: { stableToGrown: true },
        sourceScopeCeiling: { kind: "whole-map" },
        descriptor: {
          adjudication: "automatic",
          target: { kind: "source-application" },
          operation: { kind: "terrain-state-change", from: "stable", to: "grown" },
        },
        resolvedSupport: { kind: "source-application" },
        trigger: {
          id: "shard-growth-trigger",
          kind: "on-enter",
          resolution: "deterministic",
          parameters: {},
          execution: null,
        },
        requiredInputs: [],
        adjudication: "automatic",
      }],
      environmentIntrinsicInstructions: [{
        key: "environment-intrinsic:zero-g-inertia",
        source: "environment-intrinsic",
        semanticDefinition: { id: "zero-g-inertia", domain: "movement" },
        requiredInputs: ["environment-intrinsic-execution"],
        adjudication: "gm-confirmed",
      }],
      mutableRuntimeStateResolved: false,
      sitrepResolved: false,
      foundryBehaviorAutomationResolved: false,
    },
  };
}

function sceneWith(generation) {
  return { flags: { "orphaned-sun-scenes": { battlefieldDynamicsGeneration: generation } } };
}

assert.deepEqual(battlefieldDynamicsReceiverState({}), { status: "absent", generation: null, handoff: null });
const legacy = { implementationStatus: "effect-framework-active", applicationComposition: { instances: [] } };
assert.equal(battlefieldDynamicsReceiverState(sceneWith(legacy)).status, "legacy-semantic-only");
const valid = validGeneration();
assert.equal(assertBattlefieldDynamicsSceneData(sceneWith(valid)).status, "executable-v1");
assert.equal(assertBattlefieldDynamicsExecutionHandoff(valid), valid.executionHandoff);

for (const target of [
  { kind: "source-application" },
  { kind: "cell-references", cells: [{ col: 2, row: 3 }] },
  { kind: "transition-references", transitionIds: ["door-a"] },
  { kind: "element-references", elementIds: ["wall-a"] },
  { kind: "endpoint-links", links: [{ from: { kind: "cell", cell: { col: 0, row: 0 } }, to: { kind: "element", elementId: "portal-b" }, bidirectional: true }] },
]) assert.equal(assertBattlefieldDynamicsSupportTarget(target), target);

const operations = [
  { kind: "movement-cost", mode: "additive", value: 1 },
  { kind: "forced-movement", distanceHex: 1, vector: { kind: "hex-offset", deltaCol: 1, deltaRow: 0 } },
  { kind: "positioning-modifier", value: -1, label: "exposed" },
  { kind: "route-access", access: "closed", traversalCostHex: 0 },
  { kind: "adjacency-override", operation: "add", bidirectional: true, traversalCostHex: 1 },
  { kind: "line-of-sight-modifier", mode: "penalty", value: -1 },
  { kind: "cover-modifier", level: "hard", value: 1 },
  { kind: "visibility-modifier", mode: "concealed" },
  { kind: "elevation-modifier", mode: "delta", value: 1 },
  { kind: "gravity-effect", mode: "vector", vector: { kind: "away-from-support" }, strength: 1 },
  { kind: "pressure-effect", stateId: "depressurized" },
  { kind: "momentum-effect", mode: "redirect", vector: { kind: "movement-vector" }, distanceHex: 1 },
  { kind: "collision-effect", response: "damage", damage: { formula: "1d6", damageType: "kinetic" } },
  { kind: "hazard-effect", response: "condition", conditionId: "impaired" },
  { kind: "damage-effect", damage: { formula: "2" } },
  { kind: "terrain-state-change", from: "stable", to: "failed" },
  { kind: "object-state-change", from: "armed", to: "spent" },
  { kind: "timing-window", cadence: { unit: "round", interval: 1, phase: "start" }, activeStateId: "active" },
];
assert.deepEqual(operations.map(operation => operation.kind), [...BATTLEFIELD_DYNAMICS_EFFECT_KINDS]);
for (const operation of operations) assert.equal(assertBattlefieldDynamicsOperation(operation, operation.kind), operation);

const unknownRequirement = validGeneration();
unknownRequirement.executionHandoff.instructions[0].requiredInputs = ["invented-input"];
unknownRequirement.executionHandoff.instructions[0].adjudication = "gm-confirmed";
unknownRequirement.executionHandoff.automaticInstructionCount = 0;
unknownRequirement.executionHandoff.gmConfirmedInstructionCount = 2;
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(unknownRequirement), /unknown requirement invented-input/);

const brokenIdentity = validGeneration();
brokenIdentity.executionHandoff.instructions[0].sourceApplicationId = "ctx-other";
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(brokenIdentity), /sourceApplicationId does not match/);

const badOperation = validGeneration();
badOperation.executionHandoff.instructions[0].descriptor.operation = { kind: "terrain-state-change", from: "stable", to: "stable" };
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(badOperation), /from and .to must differ/);

const badContract = validGeneration();
badContract.executionHandoff.contract.ownsMutableRuntimeState = true;
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(badContract), /ownsMutableRuntimeState must be false/);

const badIntrinsic = validGeneration();
badIntrinsic.executionHandoff.environmentIntrinsicInstructions[0].adjudication = "automatic";
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(badIntrinsic), /must be gm-confirmed/);

const badRegistry = validGeneration();
badRegistry.ruleRegistries.effectRuleKinds = ["movement-cost"];
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(badRegistry), /effectRuleKinds does not match/);

const scheduled = validGeneration();
scheduled.executionHandoff.instructions[0].triggerId = "cycle";
scheduled.executionHandoff.instructions[0].trigger = {
  id: "cycle",
  kind: "scheduled-cycle",
  resolution: "deterministic",
  parameters: {},
  execution: { adjudication: "automatic", kind: "scheduled-cycle", cadence: { unit: "round", interval: 2, phase: "end" } },
};
assert.equal(assertBattlefieldDynamicsExecutionHandoff(scheduled), scheduled.executionHandoff);

const explicitRandom = validGeneration();
explicitRandom.executionHandoff.instructions[0].triggerId = "random-cycle";
explicitRandom.executionHandoff.instructions[0].trigger = {
  id: "random-cycle",
  kind: "scheduled-cycle",
  resolution: "explicit-random",
  parameters: {},
  execution: { adjudication: "automatic", kind: "scheduled-cycle", cadence: { unit: "round", interval: 1, phase: "start" } },
};
assert.throws(() => assertBattlefieldDynamicsExecutionHandoff(explicitRandom), /randomSourceId is required/);

console.log("battlefield dynamics contract tests passed");
