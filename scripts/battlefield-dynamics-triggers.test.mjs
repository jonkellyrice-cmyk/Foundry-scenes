import assert from "node:assert/strict";
import { BattlefieldDynamicsTriggerLedger, normalizeBattlefieldDynamicsMovement } from "./battlefield-dynamics-triggers.mjs";
import { BATTLEFIELD_DYNAMICS_PROJECTION_FLAG, BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
  buildBattlefieldDynamicsAreaProjectionPlan } from "./battlefield-dynamics-spatial.mjs";

const moduleId = "orphaned-sun-scenes";
const instance = { key: "instance-a", environmentId: "Open Field", physicalContextId: "ruins",
  dynamicId: "fog", sourceApplicationId: "application-a" };
const second = { ...instance, key: "instance-b", sourceApplicationId: "application-b" };
const instructions = ["on-enter", "on-exit", "on-move-through"].flatMap(kind => [instance, second].map(owner => ({
  key: `${owner.key}-${kind}`, instanceKey: owner.key, sourceApplicationId: owner.sourceApplicationId,
  source: "effect", kind: "hazard-effect", ruleId: `${kind}-rule`, triggerId: `${kind}-trigger`, trigger: { kind },
  resolvedSupport: { kind: "source-application" },
})));
const owners = instructions.map(instruction => {
  const owner = instruction.instanceKey === instance.key ? instance : second;
  return { instanceKey: owner.key, sourceApplicationId: owner.sourceApplicationId,
    physicalContextId: owner.physicalContextId, dynamicId: owner.dynamicId,
    instructionKey: instruction.key, ruleId: instruction.ruleId,
    source: instruction.source, kind: instruction.kind };
});
const generation = { executionHandoff: { instructions }, applicationComposition: {
  instances: [instance, second], spatialGroups: [{ instanceKeys: [instance.key, second.key], cells: [{ col: 0, row: 0 }] }],
} };
const projection = buildBattlefieldDynamicsAreaProjectionPlan(generation).projections[0];
const flag = { ownership: BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP, version: 1,
  sceneId: "scene-a", projectionKey: projection.projectionKey, cellSignature: projection.cellSignature, owners };
const region = { id: "region-1", getFlag(scope, key) {
  return scope === moduleId && key === BATTLEFIELD_DYNAMICS_PROJECTION_FLAG ? flag : null;
} };
const scene = { id: "scene-a", regions: [region] };
const runtime = { status: "active", sceneId: scene.id, canonicalGeneration: generation };
const p = x => ({ x, y: 0 });
const movement = { id: "move-1", origin: p(0), destination: p(4),
  passed: { waypoints: [p(0), p(2), p(4)] } };
const token = { id: "large-token", parent: scene,
  testInsideRegion(_region, point) { return point.x === 2; },
  segmentizeRegionMovementPath(_region, waypoints) {
    return waypoints.length === 3
      ? [{ type: 1, from: p(0), to: p(2) }, { type: -1, from: p(2), to: p(4) }]
      : [{ type: 1, from: p(0), to: p(2) }];
  },
};

const result = normalizeBattlefieldDynamicsMovement(scene, runtime, token, movement);
assert.deepEqual(result.issues, []);
assert.equal(result.events.length, 6, "each overlapping application retains all three trigger contributions");
assert.deepEqual(new Set(result.events.map(event => event.triggerKind)), new Set(["on-enter", "on-exit", "on-move-through"]));
assert.deepEqual(new Set(result.events.map(event => event.identity.sourceApplicationId)), new Set(["application-a", "application-b"]));
assert.ok(result.events.every(event => event.tokenId === token.id && event.movementId === movement.id && event.instructionKey));
const ledger = new BattlefieldDynamicsTriggerLedger();
assert.equal(result.events.filter(event => ledger.accept(event)).length, 6);
assert.equal(result.events.filter(event => ledger.accept(event)).length, 0, "repeated callbacks are idempotent");
ledger.clearScene(scene.id);
assert.equal(result.events.filter(event => ledger.accept(event)).length, 6);

const enterOnly = normalizeBattlefieldDynamicsMovement(scene, runtime, token, { ...movement, destination: p(2),
  passed: { waypoints: [p(0), p(2)] } });
assert.deepEqual(new Set(enterOnly.events.map(event => event.triggerKind)), new Set(["on-enter"]));

const badPath = normalizeBattlefieldDynamicsMovement(scene, runtime, token, { ...movement, passed: {} });
assert.equal(badPath.events.length, 0);
assert.equal(badPath.issues[0].code, "spatial-movement-path-unavailable");

const staleRegion = { ...region, getFlag: () => ({ ...flag, owners: [{ ...owners[0], dynamicId: "wrong" }] }) };
const staleScene = { ...scene, regions: [staleRegion] };
const stale = normalizeBattlefieldDynamicsMovement(staleScene, runtime,
  { ...token, parent: staleScene }, movement);
assert.equal(stale.events.length, 0);
assert.equal(stale.issues[0].code, "spatial-projection-stale");

const cleanScene = { ...scene, regions: [{ id: "canonical", getFlag: () => null }] };
assert.deepEqual(normalizeBattlefieldDynamicsMovement(cleanScene, runtime,
  { ...token, parent: cleanScene }, movement).events, []);

console.log("battlefield dynamics trigger tests passed");
