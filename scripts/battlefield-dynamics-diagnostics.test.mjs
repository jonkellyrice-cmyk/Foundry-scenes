import assert from "node:assert/strict";
import {
  BATTLEFIELD_DYNAMICS_EFFECT_KINDS,
  BATTLEFIELD_DYNAMICS_GENERATION_KINDS,
  BATTLEFIELD_DYNAMICS_TRIGGER_KINDS,
} from "./battlefield-dynamics-contract.mjs";
import {
  BattlefieldDynamicsDiagnosticsRegistry,
  collectBattlefieldDynamicsSceneDiagnostics,
  createBattlefieldDynamicsDiagnostic,
  diagnoseBattlefieldDynamicsSocketFailure,
  summarizeBattlefieldDynamicsDiagnostics,
} from "./battlefield-dynamics-diagnostics.mjs";

const MODULE_ID = "orphaned-sun-scenes";
const INSTANCE_KEY = "exotic/crystalline-terrain/shard-growth/application-a";

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
    environmentId: "exotic",
    applicationComposition: {
      instanceIdentity: ["environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"],
      instances: [{
        key: INSTANCE_KEY,
        environmentId: "exotic",
        physicalContextId: "crystalline-terrain",
        dynamicId: "shard-growth",
        sourceApplicationId: "application-a",
        stateInitialization: { mode: "finite-state", initialState: "stable" },
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
      gmConfirmedInstructionCount: 2,
      instructions: [
        {
          key: `${INSTANCE_KEY}/effect/shard-growth-effect/execution`,
          instanceKey: INSTANCE_KEY,
          sourceApplicationId: "application-a",
          source: "effect",
          ruleId: "shard-growth-effect",
          kind: "terrain-state-change",
          triggerId: "shard-growth-trigger",
          semanticParameters: {},
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
        },
        {
          key: `${INSTANCE_KEY}/generation/support-zone/execution`,
          instanceKey: INSTANCE_KEY,
          sourceApplicationId: "application-a",
          source: "generation",
          ruleId: "support-zone",
          kind: "support-zone",
          triggerId: null,
          semanticParameters: {},
          sourceScopeCeiling: { kind: "whole-map" },
          descriptor: null,
          resolvedSupport: null,
          trigger: null,
          requiredInputs: ["support-target"],
          adjudication: "gm-confirmed",
        },
      ],
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

function sceneWith(value = generation()) {
  return {
    id: "scene-diagnostics",
    name: "Diagnostics Scene",
    flags: { [MODULE_ID]: { battlefieldDynamicsGeneration: value } },
  };
}

const diagnostics = collectBattlefieldDynamicsSceneDiagnostics(sceneWith());
const codes = diagnostics.map(diagnostic => diagnostic.code);
assert.deepEqual(codes, [
  "automatic-instruction-executor-pending",
  "instruction-gm-confirmed",
  "required-input-unresolved",
  "environment-intrinsic-unresolved",
]);
const required = diagnostics.find(diagnostic => diagnostic.code === "required-input-unresolved");
assert.equal(required.details.requiredInput, "support-target");
assert.equal(required.provenance.sceneId, "scene-diagnostics");
assert.equal(required.provenance.instanceKey, INSTANCE_KEY);
assert.equal(required.provenance.sourceApplicationId, "application-a");
assert.equal(required.provenance.ruleId, "support-zone");
const automatic = diagnostics.find(diagnostic => diagnostic.code === "automatic-instruction-executor-pending");
assert.equal(automatic.automaticBlocked, true);
assert.equal(automatic.provenance.kind, "terrain-state-change");

const withExecutor = collectBattlefieldDynamicsSceneDiagnostics(sceneWith(), null, { automaticExecutorAvailable: true });
assert.equal(withExecutor.some(diagnostic => diagnostic.code === "automatic-instruction-executor-pending"), false);

const runtimeReset = {
  rehydration: {
    persistedStatus: "invalid",
    restoredApplicationCount: 0,
    initializedApplicationCount: 1,
    staleApplicationCount: 2,
  },
};
const resetDiagnostics = collectBattlefieldDynamicsSceneDiagnostics(sceneWith(), runtimeReset);
assert.equal(resetDiagnostics.some(diagnostic => diagnostic.code === "runtime-store-reset"), true);
assert.equal(resetDiagnostics.some(diagnostic => diagnostic.code === "runtime-stale-applications-pruned"), true);

const runtimePartial = {
  rehydration: {
    persistedStatus: "valid",
    restoredApplicationCount: 0,
    initializedApplicationCount: 1,
    staleApplicationCount: 0,
  },
};
const partialDiagnostics = collectBattlefieldDynamicsSceneDiagnostics(sceneWith(), runtimePartial);
assert.equal(partialDiagnostics.some(diagnostic => diagnostic.code === "runtime-applications-reinitialized"), true);

assert.deepEqual(collectBattlefieldDynamicsSceneDiagnostics({ id: "plain", flags: {} }), []);
const legacy = collectBattlefieldDynamicsSceneDiagnostics({
  id: "legacy",
  name: "Legacy",
  flags: { [MODULE_ID]: { battlefieldDynamicsGeneration: { applicationComposition: {} } } },
});
assert.equal(legacy.length, 1);
assert.equal(legacy[0].code, "legacy-semantic-only");
assert.equal(legacy[0].automaticBlocked, true);

const malformedGeneration = generation();
malformedGeneration.executionHandoff.instructions[1].requiredInputs = ["invented-input"];
const malformed = collectBattlefieldDynamicsSceneDiagnostics(sceneWith(malformedGeneration));
assert.equal(malformed.length, 1);
assert.equal(malformed[0].code, "execution-handoff-invalid");
assert.equal(malformed[0].severity, "error");
assert.match(malformed[0].details.error, /invented-input/);

const invalidMessage = diagnoseBattlefieldDynamicsSocketFailure(null, new Error("not object"));
assert.equal(invalidMessage.code, "socket-message-invalid");
const badVersion = diagnoseBattlefieldDynamicsSocketFailure({ version: 99, type: "runtime-authority-probe", sceneId: "scene-diagnostics" }, new Error("unsupported"));
assert.equal(badVersion.code, "socket-version-unsupported");
assert.equal(badVersion.provenance.sceneId, "scene-diagnostics");
const badType = diagnoseBattlefieldDynamicsSocketFailure({ version: 1, type: "future-command" }, new Error("unsupported"));
assert.equal(badType.code, "socket-message-unsupported");

const summary = summarizeBattlefieldDynamicsDiagnostics(diagnostics);
assert.deepEqual(summary.severityCounts, { info: 1, warning: 3, error: 0 });
assert.equal(summary.total, 4);
assert.equal(summary.automaticBlockedCount, 4);

const registry = new BattlefieldDynamicsDiagnosticsRegistry({ maxEvents: 2 });
registry.replaceScene("scene-diagnostics", diagnostics);
registry.recordEvent(createBattlefieldDynamicsDiagnostic({
  code: "event-one",
  severity: "info",
  category: "test",
  message: "event one",
  provenance: { sceneId: "scene-diagnostics" },
}));
registry.recordEvent(createBattlefieldDynamicsDiagnostic({
  code: "event-two",
  severity: "warning",
  category: "test",
  message: "event two",
}));
registry.recordEvent(createBattlefieldDynamicsDiagnostic({
  code: "event-three",
  severity: "error",
  category: "test",
  message: "event three",
}));
assert.deepEqual(registry.events.map(event => event.code), ["event-two", "event-three"]);
assert.equal(registry.forScene("scene-diagnostics").length, diagnostics.length);
assert.equal(registry.summary().total, diagnostics.length + 2);
assert.equal(registry.clearScene("scene-diagnostics"), true);
assert.equal(registry.forScene("scene-diagnostics").length, 0);

console.log("battlefield dynamics diagnostics tests passed");
