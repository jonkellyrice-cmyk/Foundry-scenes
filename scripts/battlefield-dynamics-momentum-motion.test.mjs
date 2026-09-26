import assert from "node:assert/strict";
import { executeBattlefieldDynamicsMomentumMotion, planBattlefieldDynamicsMomentumMotion }
  from "./battlefield-dynamics-momentum-motion.mjs";

const grid = { getOffset: ({ x, y }) => ({ i: y, j: x }),
  offsetToCube: ({ i, j }) => ({ q: j - Math.floor((i + (i & 1)) / 2), r: i,
    s: -j + Math.floor((i + (i & 1)) / 2) - i }),
  cubeToOffset: ({ q, r }) => ({ i: r, j: q + Math.floor((r + (r & 1)) / 2) }),
  getTopLeftPoint: ({ i, j }) => ({ x: j, y: i }),
  getDirectPath: ([a, b]) => [a, b] };
const scene = { id: "scene", grid: { type: 2 } };
const calls = [];
const token = { id: "token", parent: scene, x: 1, y: 0,
  async move(target) { calls.push(target); return true; } };
const movement = { id: "movement", passed: { waypoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }] } };
const instance = { key: "instance", environmentId: "space", physicalContextId: "void",
  dynamicId: "drift", sourceApplicationId: "application" };
const instruction = { key: "instruction", instanceKey: instance.key, kind: "momentum-effect",
  sourceApplicationId: instance.sourceApplicationId, adjudication: "automatic", requiredInputs: [] };
const runtime = { status: "active", sceneId: scene.id,
  canonicalGeneration: { applicationComposition: { instances: [instance] },
    executionHandoff: { instructions: [instruction] } } };
const record = velocity => ({ changed: true, issues: [], state: { sceneId: scene.id,
  tokens: { token: { applications: { instance: { contributions: {
    instruction: { lastResolved: { movementId: movement.id, velocity } },
  } } } } } } });
const plan = planBattlefieldDynamicsMomentumMotion(scene, runtime, token, movement,
  record({ q: 2, r: 0, s: -2 }), { grid });
assert.equal(plan.status, "ready");
assert.deepEqual(plan.target, { x: 2, y: 0 });
assert.deepEqual(await executeBattlefieldDynamicsMomentumMotion(plan), { moved: true, reason: "moved" });
assert.deepEqual(calls, [{ x: 2, y: 0 }]);
assert.equal(planBattlefieldDynamicsMomentumMotion(scene, runtime, token, movement,
  record({ q: 1, r: 0, s: -1 }), { grid }).status, "none");
const braking = { id: movement.id, passed: { waypoints: [{ x: 2, y: 0 }, { x: 1, y: 0 }] } };
const brakingPlan = planBattlefieldDynamicsMomentumMotion(scene, runtime, token, braking,
  record({ q: 1, r: 0, s: -1 }), { grid });
assert.equal(brakingPlan.status, "ready");
assert.deepEqual(brakingPlan.target, { x: 3, y: 0 }); // Prior +2, attempted -1 yields +1 from origin.
const overlap = record({ q: 2, r: 0, s: -2 });
overlap.state.tokens.token.applications.instance.contributions.other = { lastResolved: {
  movementId: movement.id, velocity: { q: 0, r: 0, s: 0 } } };
assert.equal(planBattlefieldDynamicsMomentumMotion(scene, runtime, token, movement,
  overlap, { grid }).issue.code, "momentum-motion-overlap-ambiguous");
assert.equal(planBattlefieldDynamicsMomentumMotion(scene, runtime, { ...token, x: 3 }, movement,
  record({ q: 2, r: 0, s: -2 }), { grid }).issue.code, "momentum-motion-geometry-invalid");
assert.equal(planBattlefieldDynamicsMomentumMotion(scene, runtime, token, movement,
  { ...record({ q: 2, r: 0, s: -2 }), changed: false }, { grid }).issue.code, "momentum-motion-stale");
console.log("battlefield dynamics momentum motion tests passed");
