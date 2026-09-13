import assert from "node:assert/strict";
import {
  BATTLEFIELD_DYNAMICS_PROJECTION_FLAG,
  BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
  BATTLEFIELD_DYNAMICS_SPATIAL_VERSION,
  battlefieldDynamicsCellPolygon,
  buildBattlefieldDynamicsAreaProjectionPlan,
  buildBattlefieldDynamicsSpatialIndex,
  reconcileBattlefieldDynamicsAreaRegions,
  resolveBattlefieldDynamicsAreaSupport,
} from "./battlefield-dynamics-spatial.mjs";

const MODULE_ID = "orphaned-sun-scenes";

function generation() {
  return {
    environmentId: "urban-warfare",
    applicationComposition: {
      instances: [
        { key: "instance-a", physicalContextId: "ruins", dynamicId: "fragile-cover", sourceApplicationId: "application-a" },
        { key: "instance-b", physicalContextId: "ruins", dynamicId: "collapse", sourceApplicationId: "application-b" },
        { key: "instance-c", physicalContextId: "road", dynamicId: "hazard", sourceApplicationId: "application-c" },
      ],
      spatialGroups: [
        { instanceKeys: ["instance-a", "instance-b"], cells: [{ col: 0, row: 0 }, { col: 1, row: 0 }] },
        { instanceKeys: ["instance-c"], cells: [{ col: 2, row: 0 }, { col: 3, row: 0 }] },
      ],
    },
    executionHandoff: {
      instructions: [
        {
          key: "instruction-a",
          instanceKey: "instance-a",
          sourceApplicationId: "application-a",
          source: "effect",
          ruleId: "rule-a",
          kind: "object-state-change",
          triggerId: "trigger-a",
          resolvedSupport: { kind: "source-application" },
        },
        {
          key: "instruction-b",
          instanceKey: "instance-b",
          sourceApplicationId: "application-b",
          source: "effect",
          ruleId: "rule-b",
          kind: "terrain-state-change",
          triggerId: "trigger-b",
          resolvedSupport: { kind: "source-application" },
        },
        {
          key: "instruction-c",
          instanceKey: "instance-c",
          sourceApplicationId: "application-c",
          source: "effect",
          ruleId: "rule-c",
          kind: "hazard-effect",
          triggerId: "trigger-c",
          resolvedSupport: { kind: "cell-references", cells: [{ col: 2, row: 0 }] },
        },
        {
          key: "instruction-transition",
          instanceKey: "instance-c",
          sourceApplicationId: "application-c",
          source: "generation",
          ruleId: "rule-transition",
          kind: "support-transition",
          triggerId: null,
          resolvedSupport: { kind: "transition-references", transitionIds: ["transition-1"] },
        },
        {
          key: "instruction-outside",
          instanceKey: "instance-c",
          sourceApplicationId: "application-c",
          source: "generation",
          ruleId: "rule-outside",
          kind: "support-zone",
          triggerId: null,
          resolvedSupport: { kind: "cell-references", cells: [{ col: 9, row: 9 }] },
        },
        {
          key: "instruction-unresolved",
          instanceKey: "instance-c",
          sourceApplicationId: "application-c",
          source: "effect",
          ruleId: "rule-unresolved",
          kind: "movement-cost",
          triggerId: null,
          resolvedSupport: null,
        },
      ],
    },
  };
}

const canonical = generation();
const index = buildBattlefieldDynamicsSpatialIndex(canonical);
assert.deepEqual(index.exactCellsByInstance.get("instance-a"), [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
assert.deepEqual(index.exactCellsByInstance.get("instance-b"), [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
assert.deepEqual(index.exactCellsByInstance.get("instance-c"), [{ col: 2, row: 0 }, { col: 3, row: 0 }]);

const sourceResolution = resolveBattlefieldDynamicsAreaSupport(canonical, canonical.executionHandoff.instructions[0], index);
assert.equal(sourceResolution.status, "resolved");
assert.equal(sourceResolution.supportKind, "source-application");
assert.deepEqual(sourceResolution.cells, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);

const explicitResolution = resolveBattlefieldDynamicsAreaSupport(canonical, canonical.executionHandoff.instructions[2], index);
assert.equal(explicitResolution.status, "resolved");
assert.equal(explicitResolution.supportKind, "cell-references");
assert.deepEqual(explicitResolution.cells, [{ col: 2, row: 0 }]);

const transitionResolution = resolveBattlefieldDynamicsAreaSupport(canonical, canonical.executionHandoff.instructions[3], index);
assert.equal(transitionResolution.status, "unsupported");
assert.equal(transitionResolution.issue.code, "spatial-support-not-area-projectable");

const outsideResolution = resolveBattlefieldDynamicsAreaSupport(canonical, canonical.executionHandoff.instructions[4], index);
assert.equal(outsideResolution.status, "invalid");
assert.equal(outsideResolution.issue.code, "spatial-support-exceeds-source-application");

const plan = buildBattlefieldDynamicsAreaProjectionPlan(canonical);
assert.equal(plan.version, BATTLEFIELD_DYNAMICS_SPATIAL_VERSION);
assert.equal(plan.projections.length, 2, "identical source-application areas should share one projection");
const shared = plan.projections.find(candidate => candidate.cells.length === 2);
assert.ok(shared);
assert.deepEqual(shared.cells, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
assert.deepEqual(shared.owners.map(owner => owner.instructionKey), ["instruction-a", "instruction-b"]);
assert.equal(new Set(plan.projections.map(candidate => candidate.projectionKey)).size, plan.projections.length);
assert.deepEqual(plan.issues.map(issue => issue.code).sort(), [
  "spatial-support-exceeds-source-application",
  "spatial-support-not-area-projectable",
]);
assert.equal(plan.issues.some(issue => issue.provenance.instructionKey === "instruction-unresolved"), false, "unresolved upstream support already has required-input diagnostics and should not fabricate a spatial issue");

let constructorConfig = null;
let requestedOffset = null;
class FakeHexagonalGrid {
  constructor(config) {
    constructorConfig = config;
  }
  getVertices(offset) {
    requestedOffset = offset;
    return [
      { x: 10, y: 20 },
      { x: 20, y: 10 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
      { x: 20, y: 40 },
      { x: 10, y: 30 },
    ];
  }
}
const rawSceneForPolygon = { id: "scene-grid", grid: { type: 2, size: 60, distance: 1, units: "hex" } };
const polygon = battlefieldDynamicsCellPolygon(rawSceneForPolygon, { col: 4, row: 3 }, { foundryRef: { grid: { HexagonalGrid: FakeHexagonalGrid } } });
assert.equal(constructorConfig.size, 60);
assert.equal(constructorConfig.columns, false);
assert.equal(constructorConfig.even, false);
assert.deepEqual(requestedOffset, { i: 3, j: 4 });
assert.equal(polygon.length, 6);

function projectionRegion(id, projectionKey = "stale") {
  const data = {
    _id: id,
    name: `Projection ${id}`,
    color: "#7f8cff",
    shapes: [],
    behaviors: [],
    flags: {
      [MODULE_ID]: {
        [BATTLEFIELD_DYNAMICS_PROJECTION_FLAG]: {
          version: BATTLEFIELD_DYNAMICS_SPATIAL_VERSION,
          ownership: BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
          projectionKind: "canonical-area-support",
          sceneId: "scene-runtime",
          projectionKey,
          cellSignature: "old",
          cellCount: 1,
          owners: [],
        },
      },
    },
  };
  return {
    id,
    getFlag(moduleId, key) { return data.flags?.[moduleId]?.[key] ?? null; },
    toObject() { return structuredClone(data); },
    replace(next) { Object.assign(data, structuredClone(next)); },
  };
}

function canonicalRegion(id) {
  const data = {
    _id: id,
    name: "Canonical Objective",
    color: "#ffffff",
    shapes: [],
    behaviors: [],
    flags: { [MODULE_ID]: { battleMapElementId: "objective-alpha" } },
  };
  return {
    id,
    getFlag(moduleId, key) { return data.flags?.[moduleId]?.[key] ?? null; },
    toObject() { return structuredClone(data); },
  };
}

function fakeScene() {
  const regions = [canonicalRegion("canonical-region"), projectionRegion("stale-region")];
  const writes = { create: 0, update: 0, delete: 0 };
  let sequence = 1;
  const scene = {
    id: "scene-runtime",
    name: "Spatial Runtime",
    grid: { type: 2, size: 60, distance: 1, units: "hex" },
    regions,
    writes,
    toObject() {
      return { id: this.id, name: this.name, grid: structuredClone(this.grid) };
    },
    async createEmbeddedDocuments(type, docs) {
      assert.equal(type, "Region");
      writes.create += docs.length;
      const created = docs.map(doc => {
        const region = projectionRegion(`created-${sequence++}`, doc.flags[MODULE_ID][BATTLEFIELD_DYNAMICS_PROJECTION_FLAG].projectionKey);
        region.replace({ _id: region.id, ...doc });
        regions.push(region);
        return region;
      });
      return created;
    },
    async updateEmbeddedDocuments(type, docs) {
      assert.equal(type, "Region");
      writes.update += docs.length;
      for (const update of docs) {
        const region = regions.find(candidate => candidate.id === update._id);
        assert.ok(region);
        region.replace(update);
      }
      return docs;
    },
    async deleteEmbeddedDocuments(type, ids) {
      assert.equal(type, "Region");
      writes.delete += ids.length;
      for (const id of ids) {
        const index = regions.findIndex(candidate => candidate.id === id);
        if (index >= 0) regions.splice(index, 1);
      }
      return ids;
    },
  };
  return scene;
}

const foundryRef = { grid: { HexagonalGrid: FakeHexagonalGrid } };
const runtime = { status: "active", canonicalGeneration: canonical };
const scene = fakeScene();
const first = await reconcileBattlefieldDynamicsAreaRegions(scene, runtime, { authoritative: true, foundryRef });
assert.equal(first.created, 2);
assert.equal(first.deleted, 1);
assert.equal(first.updated, 0);
assert.equal(scene.regions.some(region => region.id === "canonical-region"), true, "canonical Regions must never be deleted");
assert.equal(scene.regions.length, 3);
assert.equal(scene.regions.filter(region => region.getFlag(MODULE_ID, BATTLEFIELD_DYNAMICS_PROJECTION_FLAG)).length, 2);
assert.deepEqual(first.issues.map(issue => issue.code).sort(), [
  "spatial-support-exceeds-source-application",
  "spatial-support-not-area-projectable",
]);

const second = await reconcileBattlefieldDynamicsAreaRegions(scene, runtime, { authoritative: true, foundryRef });
assert.equal(second.created, 0);
assert.equal(second.deleted, 0);
assert.equal(second.updated, 0);
assert.equal(second.unchanged, 2);

const readOnlyScene = fakeScene();
const readOnly = await reconcileBattlefieldDynamicsAreaRegions(readOnlyScene, runtime, { authoritative: false, foundryRef });
assert.equal(readOnly.plan.projections.length, 2);
assert.deepEqual(readOnlyScene.writes, { create: 0, update: 0, delete: 0 });

const cleared = await reconcileBattlefieldDynamicsAreaRegions(scene, { status: "inactive" }, { authoritative: true, foundryRef });
assert.equal(cleared.deleted, 2);
assert.equal(scene.regions.length, 1);
assert.equal(scene.regions[0].id, "canonical-region");

assert.throws(
  () => battlefieldDynamicsCellPolygon({ id: "bad-grid", grid: { type: 1, size: 60 } }, { col: 0, row: 0 }, { foundryRef }),
  /Hexagonal Rows Odd grid type 2/,
);

console.log("battlefield dynamics spatial tests passed");
