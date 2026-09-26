import assert from "node:assert/strict";
import { applyBattlefieldDynamicsMomentumMovement, readBattlefieldDynamicsMomentumState,
  BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_FLAG } from "./battlefield-dynamics-momentum-state.mjs";

const moduleId = "orphaned-sun-scenes";
const identity = { environmentId: "outer-space", physicalContextId: "void", dynamicId: "drift",
  sourceApplicationId: "app-a" };
const scene = { id: "momentum-scene", flags: { [moduleId]: {} }, tokens: new Map([["unit", true]]),
  getFlag(scope, key) { return this.flags[scope]?.[key]; } };
const token = { id: "unit", parent: scene };
const operations = ["rule-a", "rule-b", "rule-c"].map(() => ({ kind: "momentum-effect", mode: "preserve",
  execution: { stateSource: "incoming-movement", timing: "on-trigger", lifetime: "until-next-movement",
    resolutionLaw: "hex-vector-addition" } }));
operations[2] = { ...operations[2], mode: "stop", execution: { ...operations[2].execution,
  timing: "next-movement", lifetime: "single-resolution" } };
const runtime = { canonicalGeneration: { applicationComposition: { instances: [{ key: "instance-a", ...identity }] },
  executionHandoff: { instructions: operations.map((operation, index) => ({ key: `rule-${index}`,
    kind: "momentum-effect", instanceKey: "instance-a", adjudication: "automatic", requiredInputs: [],
    descriptor: { operation } })) } } };
const grid = { getOffset: point => ({ i: 0, j: point.x }), offsetToCube: ({ i, j }) => ({ q: j, r: i, s: -i - j }) };
const movement = (id, from, to) => ({ id, passed: { waypoints: [{ x: from, y: 0 }, { x: to, y: 0 }] } });
const intent = (index, movementId) => ({ sceneId: scene.id, tokenId: token.id, movementId,
  instructionKey: `rule-${index}`, instanceKey: "instance-a", identity, operation: operations[index],
  adjudication: "automatic", requiredInputs: [],
  unresolved: ["momentum-velocity-state-unavailable"] });

let state = readBattlefieldDynamicsMomentumState(scene, runtime, moduleId);
let result = applyBattlefieldDynamicsMomentumMovement(state, runtime, token, movement("prior", 0, 2), [], grid);
assert.equal(result.changed, true);
state = result.state;
result = applyBattlefieldDynamicsMomentumMovement(state, runtime, token, movement("brake", 2, 1),
  [intent(0, "brake"), intent(1, "brake"), intent(2, "brake")], grid);
assert.equal(result.changed, true);
assert.deepEqual(result.issues, []);
assert.deepEqual(Object.keys(result.state.tokens.unit.applications["instance-a"].contributions), ["rule-0", "rule-1", "rule-2"]);
assert.deepEqual(result.state.tokens.unit.applications["instance-a"].contributions["rule-0"].velocity,
  { q: 1, r: 0, s: -1 });
assert.equal(applyBattlefieldDynamicsMomentumMovement(result.state, runtime, token,
  movement("brake", 2, 1), [intent(0, "brake")], grid).reason, "duplicate-movement");
assert.equal(applyBattlefieldDynamicsMomentumMovement(result.state, runtime, token,
  movement("brake", 2, 0), [], grid).reason, "ambiguous-checkpoint");
scene.flags[moduleId][BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_FLAG] = result.state;
assert.deepEqual(readBattlefieldDynamicsMomentumState(scene, runtime, moduleId), result.state);
const expired = applyBattlefieldDynamicsMomentumMovement(result.state, runtime, token, movement("next", 1, 0), [], grid);
assert.equal(expired.state.tokens.unit.applications["instance-a"].contributions["rule-0"].velocity, null);
assert.deepEqual(expired.state.tokens.unit.applications["instance-a"].contributions["rule-2"].lastResolved,
  { movementId: "next", velocity: { q: -1, r: 0, s: 1 } });
assert.equal(expired.state.tokens.unit.applications["instance-a"].contributions["rule-2"].velocity, null);

const untrusted = structuredClone(result.state);
untrusted.tokens.unit.applications["instance-a"].identity.sourceApplicationId = "wrong";
scene.flags[moduleId][BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_FLAG] = untrusted;
assert.deepEqual(readBattlefieldDynamicsMomentumState(scene, runtime, moduleId).tokens.unit.applications, {});
console.log("battlefield dynamics momentum state persistence tests passed");
