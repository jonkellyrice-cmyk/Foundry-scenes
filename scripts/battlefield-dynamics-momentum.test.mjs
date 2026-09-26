import assert from "node:assert/strict";
import { normalizeBattlefieldDynamicsMomentum } from "./battlefield-dynamics-momentum.mjs";

const identity = { environmentId: "Outer Space", physicalContextId: "void", dynamicId: "drift", sourceApplicationId: "app-a" };
const scene = { id: "scene" };
const token = { id: "unit", parent: scene };
const event = { sceneId: scene.id, tokenId: token.id, movementId: "move-a", instructionKey: "momentum-a",
  instanceKey: "instance-a", triggerId: "entry", triggerKind: "on-enter", identity };
const operation = { kind: "momentum-effect", mode: "preserve" };
const instruction = { key: event.instructionKey, kind: "momentum-effect", source: "effect", instanceKey: event.instanceKey,
  sourceApplicationId: identity.sourceApplicationId, triggerId: event.triggerId, trigger: { kind: event.triggerKind },
  adjudication: "automatic", requiredInputs: [], descriptor: { operation } };
const runtime = { status: "active", sceneId: scene.id, canonicalGeneration: { executionHandoff: { instructions: [instruction] },
  applicationComposition: { instances: [{ key: event.instanceKey, ...identity }] } } };
for (const mode of ["preserve", "stop", "redirect", "bias"]) {
  operation.mode = mode;
  if (mode === "redirect" || mode === "bias") operation.vector = { kind: "movement-vector" };
  const result = normalizeBattlefieldDynamicsMomentum(scene, runtime, token, event);
  assert.equal(result.intent.operation.mode, mode);
  assert.equal(result.intent.identity.sourceApplicationId, "app-a");
  assert.equal(result.issues[0].code, "momentum-execution-unresolved");
  assert.equal(result.issues[0].automaticBlocked, true);
  if (mode === "bias") assert.ok(result.intent.unresolved.includes("bias-strength"));
}
assert.equal(normalizeBattlefieldDynamicsMomentum(scene, runtime, token,
  { ...event, identity: { ...identity, sourceApplicationId: "app-b" } }).issues[0].code, "momentum-provenance-invalid");
console.log("battlefield dynamics momentum normalization tests passed");
