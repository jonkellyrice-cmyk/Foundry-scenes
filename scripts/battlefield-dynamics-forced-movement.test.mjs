import assert from "node:assert/strict";
import { BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY } from "./battlefield-dynamics-contract.mjs";
import { planBattlefieldDynamicsForcedMovement, executeBattlefieldDynamicsForcedMovement } from "./battlefield-dynamics-forced-movement.mjs";

const identity = { environmentId: "Open Field", physicalContextId: "road", dynamicId: "wind", sourceApplicationId: "app-1" };
const event = { sceneId: "scene", tokenId: "token", movementId: "movement", instructionKey: "force", instanceKey: "instance",
  triggerId: "entry", triggerKind: "on-enter", identity };
const operation = { kind: "forced-movement", distanceHex: 2, vector: { kind: "hex-offset", deltaCol: 2, deltaRow: 0 } };
const instruction = { key: "force", instanceKey: "instance", sourceApplicationId: "app-1", source: "effect",
  kind: "forced-movement", triggerId: "entry", trigger: { kind: "on-enter" }, adjudication: "automatic",
  requiredInputs: [], descriptor: { operation } };
const scene = { id: "scene", grid: { type: 2 } };
const runtime = { status: "active", sceneId: scene.id, canonicalGeneration: {
  executionHandoff: { contract: { forcedMovementGeometry: BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY }, instructions: [instruction] },
  applicationComposition: { instances: [{ key: "instance", ...identity }] },
} };
const calls = [];
const token = { id: "token", parent: scene, x: 30, y: 40, async move(target, options) { calls.push({ target, options }); return true; } };
const grid = { getOffset() { return { i: 0, j: 0 }; },
  getDirectPath([from, to]) { return [from, { i: 0, j: 1 }, to]; },
  getTopLeftPoint() { return { x: 150, y: 40 }; } };
const ready = planBattlefieldDynamicsForcedMovement(scene, runtime, token, event, { grid });
assert.equal(ready.status, "ready");
assert.deepEqual(ready.target, { x: 150, y: 40 });
assert.deepEqual(await executeBattlefieldDynamicsForcedMovement(ready), { moved: true, reason: "moved" });
assert.deepEqual(calls, [{ target: ready.target, options: { method: "api" } }]);
assert.equal(planBattlefieldDynamicsForcedMovement(scene, runtime, token, event, { grid: {
  ...grid, getDirectPath: ([from, to]) => [from, to],
} }).issue.code, "forced-movement-distance-mismatch");
operation.vector = { kind: "toward-support" };
assert.equal(planBattlefieldDynamicsForcedMovement(scene, runtime, token, event, { grid }).issue.code, "forced-movement-vector-unresolved");
operation.vector = { kind: "hex-offset", deltaCol: 2, deltaRow: 0 };
instruction.adjudication = "gm-confirmed";
assert.equal(planBattlefieldDynamicsForcedMovement(scene, runtime, token, event, { grid }).issue.code, "forced-movement-gm-confirmation");
instruction.adjudication = "automatic";
assert.equal(planBattlefieldDynamicsForcedMovement(scene, runtime, token, { ...event, identity: { ...identity, sourceApplicationId: "other" } }, { grid }).issue.code,
  "forced-movement-provenance-invalid");
console.log("battlefield dynamics forced movement tests passed");
