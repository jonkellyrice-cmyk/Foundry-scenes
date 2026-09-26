import assert from "node:assert/strict";
import { battlefieldDynamicsMomentumIntentCanResolve, normalizeBattlefieldDynamicsMomentum,
  resolveBattlefieldDynamicsMomentumVector } from "./battlefield-dynamics-momentum.mjs";
import { BATTLEFIELD_DYNAMICS_MOMENTUM_EXECUTION } from "./battlefield-dynamics-contract.mjs";

const identity = { environmentId: "Outer Space", physicalContextId: "void", dynamicId: "drift", sourceApplicationId: "app-a" };
const scene = { id: "scene" };
const token = { id: "unit", parent: scene };
const event = { sceneId: scene.id, tokenId: token.id, movementId: "move-a", instructionKey: "momentum-a",
  instanceKey: "instance-a", triggerId: "entry", triggerKind: "on-enter", identity };
const operation = { kind: "momentum-effect", mode: "preserve" };
const instruction = { key: event.instructionKey, kind: "momentum-effect", source: "effect", instanceKey: event.instanceKey,
  sourceApplicationId: identity.sourceApplicationId, triggerId: event.triggerId, trigger: { kind: event.triggerKind },
  adjudication: "automatic", requiredInputs: [], descriptor: { operation } };
const runtime = { status: "active", sceneId: scene.id, canonicalGeneration: { executionHandoff: { instructions: [instruction],
  contract: { momentumExecution: BATTLEFIELD_DYNAMICS_MOMENTUM_EXECUTION } },
  applicationComposition: { instances: [{ key: event.instanceKey, ...identity }] } } };
for (const mode of ["preserve", "stop", "redirect", "bias"]) {
  operation.mode = mode;
  if (mode === "redirect" || mode === "bias") operation.vector = { kind: "movement-vector" };
  const result = normalizeBattlefieldDynamicsMomentum(scene, runtime, token, event);
  assert.equal(result.intent.operation.mode, mode);
  assert.equal(result.intent.identity.sourceApplicationId, "app-a");
  assert.equal(result.issues[0].code, "momentum-execution-unresolved");
  assert.equal(result.issues[0].automaticBlocked, true);
  if (mode === "bias") assert.ok(result.intent.unresolved.includes("biasStrengthHex"));
}
operation.mode = "stop";
operation.execution = { stateSource: "incoming-movement", timing: "on-trigger", lifetime: "single-resolution", resolutionLaw: "hex-vector-addition" };
const typed = normalizeBattlefieldDynamicsMomentum(scene, runtime, token, event);
assert.deepEqual(typed.intent.operation.execution, operation.execution);
assert.deepEqual(typed.intent.unresolved, ["momentum-velocity-state-unavailable"]);
assert.equal(battlefieldDynamicsMomentumIntentCanResolve(typed.intent), true);
assert.equal(battlefieldDynamicsMomentumIntentCanResolve({ ...typed.intent, adjudication: "gm-confirmed" }), false);

const source = { q: 2, r: -2, s: 0 };
const brake = { q: -1, r: 1, s: 0 };
const mockGrid = { offsetToCube: ({ i, j }) => ({ q: j - Math.floor((i + (i & 1)) / 2), r: i,
  s: -j + Math.floor((i + (i & 1)) / 2) - i }) };
assert.deepEqual(resolveBattlefieldDynamicsMomentumVector(mockGrid, { i: 0, j: 0 }, source, brake,
  { mode: "preserve" }), { status: "ready", velocity: { q: 1, r: -1, s: 0 } });
assert.deepEqual(resolveBattlefieldDynamicsMomentumVector(mockGrid, { i: 0, j: 0 }, source, brake,
  { mode: "stop" }), { status: "ready", velocity: brake });
assert.equal(resolveBattlefieldDynamicsMomentumVector(mockGrid, { i: 0, j: 0 }, source, brake,
  { mode: "redirect", vector: { kind: "hex-offset", deltaCol: 1, deltaRow: 0 } }).reason,
"momentum-redirect-length-mismatch");
assert.deepEqual(resolveBattlefieldDynamicsMomentumVector(mockGrid, { i: 1, j: 0 }, source, brake,
  { mode: "bias", vector: { kind: "hex-offset", deltaCol: 0, deltaRow: 1 },
    execution: { biasStrengthHex: 1 } }),
{ status: "ready", velocity: { q: 1, r: 0, s: -1 } });
assert.equal(resolveBattlefieldDynamicsMomentumVector(mockGrid, { i: 1, j: 0 }, source, brake,
  { mode: "bias", vector: { kind: "hex-offset", deltaCol: 0, deltaRow: 1 },
    execution: { biasStrengthHex: 2 } }).reason, "momentum-bias-strength-mismatch");
assert.equal(normalizeBattlefieldDynamicsMomentum(scene, runtime, token,
  { ...event, identity: { ...identity, sourceApplicationId: "app-b" } }).issues[0].code, "momentum-provenance-invalid");
console.log("battlefield dynamics momentum normalization tests passed");
