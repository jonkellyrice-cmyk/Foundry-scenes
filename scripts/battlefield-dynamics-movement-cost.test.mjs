import assert from "node:assert/strict";
import {
  battlefieldDynamicsMovementCostCatalog,
  composeBattlefieldDynamicsMovementCost,
  installBattlefieldDynamicsMovementCostAdapter,
  measureBattlefieldDynamicsGridStep,
} from "./battlefield-dynamics-movement-cost.mjs";
import { buildBattlefieldDynamicsAreaProjectionPlan,
  BATTLEFIELD_DYNAMICS_PROJECTION_FLAG, BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP } from "./battlefield-dynamics-spatial.mjs";

const contribution = (mode, value, id) => ({ mode, value, instructionKey: id });
const contributions = [contribution("additive", 1, "a"), contribution("multiplier", 2, "b"),
  contribution("additive", 0.5, "c"), contribution("multiplier", 1.5, "d")];
const composed = composeBattlefieldDynamicsMovementCost(1, contributions);
assert.equal(composed.costHex, 7.5);
assert.equal(composed.contributions.length, 4);
assert.equal(composeBattlefieldDynamicsMovementCost(1, [...contributions].reverse()).costHex, 7.5);
assert.throws(() => composeBattlefieldDynamicsMovementCost(1, [contribution("additive", -1, "bad")]));

const instances = ["a", "b"].map(suffix => ({ key: `instance-${suffix}`, environmentId: "Open Field",
  physicalContextId: "ruins", dynamicId: "fog", sourceApplicationId: `application-${suffix}` }));
const instructions = instances.map((instance, index) => ({ key: `cost-${index}`, instanceKey: instance.key,
  sourceApplicationId: instance.sourceApplicationId, source: "effect", kind: "movement-cost",
  ruleId: `rule-${index}`, adjudication: "automatic", requiredInputs: [],
  trigger: { kind: "continuous" }, resolvedSupport: { kind: "source-application" },
  descriptor: { operation: { kind: "movement-cost", mode: index ? "multiplier" : "additive", value: index ? 2 : 1 } },
}));
const contract = { movementCostComposition: {
  baseCost: "native-movement-cost-in-hex-equivalents", additiveUnit: "hex-equivalents-per-traversal",
  multiplierUnit: "dimensionless", calculation: "(baseCost + sum(additiveValues)) * product(multiplierValues)",
  overlap: "all-exact-applicable-contributions", orderingIsSemantic: false,
  appliesTo: "each-measured-grid-space-traversal",
} };
const generation = { applicationComposition: { instances, spatialGroups: [
  { instanceKeys: instances.map(instance => instance.key), cells: [{ col: 1, row: 0 }] },
] }, executionHandoff: { contract, instructions } };
const projection = buildBattlefieldDynamicsAreaProjectionPlan(generation).projections[0];
const region = { id: "region-1", getFlag(scope, key) {
  return scope === "orphaned-sun-scenes" && key === BATTLEFIELD_DYNAMICS_PROJECTION_FLAG ? {
    version: 1, ownership: BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP, sceneId: "scene-1",
    projectionKey: projection.projectionKey, cellSignature: projection.cellSignature, owners: projection.owners,
  } : null;
}, testPoint(point) { return point.x === 1; } };
const scene = { id: "scene-1", regions: [region], grid: { distance: 5, getCenterPoint: offset => ({ x: offset.j, y: offset.i }) } };
const runtime = { status: "active", sceneId: scene.id, canonicalGeneration: generation };
const catalog = battlefieldDynamicsMovementCostCatalog(scene, runtime);
assert.deepEqual(catalog.issues, []);
assert.equal(catalog.entries.length, 2);
const result = measureBattlefieldDynamicsGridStep({ scene, catalog, from: { i: 0, j: 0 }, to: { i: 0, j: 1 },
  distance: 5, nativeCost: 10, segment: { to: { elevation: 0 } } });
assert.equal(result.cost, 30, "native cost 2 hex plus additive 1 hex, doubled");
assert.deepEqual(new Set(result.contributions.map(item => item.identity.sourceApplicationId)),
  new Set(["application-a", "application-b"]));
assert.equal(measureBattlefieldDynamicsGridStep({ scene, catalog, from: { i: 0, j: 1 }, to: { i: 0, j: 2 },
  distance: 5, nativeCost: 10 }).cost, 10);
const oldScene = { ...scene, regions: [{ ...region, getFlag: () => null }] };
assert.equal(battlefieldDynamicsMovementCostCatalog(oldScene, runtime).entries.length, 0);
const previousFoundry = globalThis.foundry;
globalThis.foundry = { grid: { HexagonalGrid: class {
  constructor(config) { assert.equal(config.columns, false); assert.equal(config.even, false); }
  getCenterPoint(offset) { return { x: offset.j, y: offset.i }; }
} } };
const foundryScene = { ...scene, grid: { type: 2, size: 60, distance: 5, units: "hex" } };
const foundryCatalog = battlefieldDynamicsMovementCostCatalog(foundryScene, runtime);
assert.equal(foundryCatalog.entries.length, 2);
assert.equal(measureBattlefieldDynamicsGridStep({ scene: foundryScene, catalog: foundryCatalog,
  to: { i: 0, j: 1 }, nativeCost: 10 }).cost, 30);
globalThis.foundry = previousFoundry;
const stale = battlefieldDynamicsMovementCostCatalog(scene, { ...runtime, canonicalGeneration: {
  ...generation, executionHandoff: { ...generation.executionHandoff, contract: {} },
} });
assert.equal(stale.issues[0].code, "movement-cost-contract-unavailable");

const issues = [];
const manager = { runtimeForScene: () => runtime, recordMovementCostIssue: issue => issues.push(issue) };
class NativeToken {
  constructor(document) { this.document = document; }
  _getMovementCostFunction() { return (_from, _to, distance) => distance * 2; }
}
assert.equal(installBattlefieldDynamicsMovementCostAdapter(NativeToken, manager), true);
assert.equal(installBattlefieldDynamicsMovementCostAdapter(NativeToken, manager), true);
const token = new NativeToken({ parent: scene });
const cost = token._getMovementCostFunction();
assert.equal(cost({ i: 0, j: 0 }, { i: 0, j: 1 }, 5, {}), 30);
assert.equal(cost({ i: 0, j: 0 }, { i: 0, j: 2 }, 5, {}), 10);
assert.deepEqual(issues, []);
console.log("battlefield dynamics movement cost tests passed");
