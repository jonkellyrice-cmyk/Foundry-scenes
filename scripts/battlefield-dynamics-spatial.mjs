import { MODULE_ID } from "./live-scene-feed.mjs";

export const BATTLEFIELD_DYNAMICS_SPATIAL_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_PROJECTION_FLAG = "battlefieldDynamicsProjection";
export const BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP = "battlefield-dynamics-disposable-region";
export const BATTLEFIELD_DYNAMICS_PROJECTION_KIND = "canonical-area-support";

const FOUNDRY_V13_HEX_ROWS_ODD = 2;
const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = value => typeof value === "string" && Boolean(value.trim());
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function sceneData(scene) {
  if (!scene) return null;
  if (typeof scene.toObject === "function") return scene.toObject();
  return scene;
}

function sceneId(scene) {
  return scene?.id ?? scene?._id ?? null;
}

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === "function") return Array.from(collection.values());
  if (Symbol.iterator in Object(collection)) return Array.from(collection);
  return [];
}

function normalizeCell(value, label = "cell") {
  if (!isRecord(value) || !Number.isInteger(value.col) || !Number.isInteger(value.row)) {
    throw new Error(`Battlefield Dynamics spatial ${label} requires integer col and row.`);
  }
  return { col: value.col, row: value.row };
}

function cellKey(cell) {
  return `${cell.col},${cell.row}`;
}

function compareCell(left, right) {
  return left.row - right.row || left.col - right.col;
}

function sortedUniqueCells(cells) {
  const byKey = new Map();
  for (const raw of cells ?? []) {
    const cell = normalizeCell(raw);
    byKey.set(cellKey(cell), cell);
  }
  return Array.from(byKey.values()).sort(compareCell);
}

function supportSignature(cells) {
  return cells.map(cellKey).join(";");
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

function projectionKeyForSignature(signature, cellCount) {
  return `area-v1:${cellCount}:${fnv1a64(signature)}`;
}

function spatialIssue({ code, message, provenance = {}, details = {}, severity = "warning" }) {
  return {
    code,
    severity,
    category: "spatial",
    message,
    automaticBlocked: true,
    provenance,
    details,
  };
}

function instructionProvenance(generation, instruction) {
  const instance = generation?.applicationComposition?.instances?.find(candidate => candidate?.key === instruction?.instanceKey) ?? null;
  return {
    environmentId: generation?.environmentId ?? null,
    instanceKey: instruction?.instanceKey ?? null,
    physicalContextId: instance?.physicalContextId ?? null,
    dynamicId: instance?.dynamicId ?? null,
    sourceApplicationId: instruction?.sourceApplicationId ?? instance?.sourceApplicationId ?? null,
    instructionKey: instruction?.key ?? null,
    ruleId: instruction?.ruleId ?? null,
    triggerId: instruction?.triggerId ?? null,
    source: instruction?.source ?? null,
    kind: instruction?.kind ?? null,
  };
}

export function buildBattlefieldDynamicsSpatialIndex(generation) {
  if (!isRecord(generation)) throw new Error("Battlefield Dynamics spatial index requires canonical generation metadata.");
  const composition = generation.applicationComposition;
  if (!isRecord(composition) || !Array.isArray(composition.instances) || !Array.isArray(composition.spatialGroups)) {
    throw new Error("Battlefield Dynamics spatial index requires application instances and spatialGroups.");
  }

  const instanceByKey = new Map();
  const cellsByInstance = new Map();
  for (const [index, instance] of composition.instances.entries()) {
    if (!isRecord(instance) || !nonEmpty(instance.key)) throw new Error(`Battlefield Dynamics spatial instance ${index + 1} is invalid.`);
    if (instanceByKey.has(instance.key)) throw new Error(`Battlefield Dynamics spatial index contains duplicate instance ${instance.key}.`);
    instanceByKey.set(instance.key, instance);
    cellsByInstance.set(instance.key, new Map());
  }

  for (const [groupIndex, group] of composition.spatialGroups.entries()) {
    if (!isRecord(group) || !Array.isArray(group.instanceKeys) || !Array.isArray(group.cells)) {
      throw new Error(`Battlefield Dynamics spatial group ${groupIndex + 1} is invalid.`);
    }
    const cells = sortedUniqueCells(group.cells);
    for (const instanceKey of group.instanceKeys) {
      if (!nonEmpty(instanceKey) || !instanceByKey.has(instanceKey)) {
        throw new Error(`Battlefield Dynamics spatial group ${groupIndex + 1} references unknown instance ${String(instanceKey)}.`);
      }
      const target = cellsByInstance.get(instanceKey);
      for (const cell of cells) target.set(cellKey(cell), cell);
    }
  }

  const exactCellsByInstance = new Map();
  for (const [instanceKey, cells] of cellsByInstance.entries()) {
    exactCellsByInstance.set(instanceKey, Array.from(cells.values()).sort(compareCell));
  }
  return { instanceByKey, exactCellsByInstance };
}

export function resolveBattlefieldDynamicsAreaSupport(generation, instruction, spatialIndex = null) {
  const provenance = instructionProvenance(generation, instruction);
  const support = instruction?.resolvedSupport;
  if (!isRecord(support)) return { status: "unresolved", reason: "support-unresolved", provenance };
  const index = spatialIndex ?? buildBattlefieldDynamicsSpatialIndex(generation);
  const sourceCells = index.exactCellsByInstance.get(instruction?.instanceKey) ?? [];
  const sourceKeys = new Set(sourceCells.map(cellKey));

  if (support.kind === "source-application") {
    if (!sourceCells.length) {
      return {
        status: "invalid",
        reason: "source-application-empty",
        provenance,
        issue: spatialIssue({
          code: "spatial-source-application-empty",
          message: `Battlefield Dynamics instruction ${String(instruction?.key)} resolves to a source application with no canonical support cells.`,
          provenance,
        }),
      };
    }
    return { status: "resolved", supportKind: support.kind, cells: sourceCells, provenance };
  }

  if (support.kind === "cell-references") {
    let cells;
    try {
      cells = sortedUniqueCells(support.cells);
    } catch (error) {
      return {
        status: "invalid",
        reason: "cell-reference-invalid",
        provenance,
        issue: spatialIssue({
          code: "spatial-cell-reference-invalid",
          message: `Battlefield Dynamics instruction ${String(instruction?.key)} contains invalid canonical cell references.`,
          provenance,
          details: { error: String(error?.message ?? error) },
        }),
      };
    }
    const outside = cells.filter(cell => !sourceKeys.has(cellKey(cell)));
    if (outside.length) {
      return {
        status: "invalid",
        reason: "cell-reference-outside-source-application",
        provenance,
        issue: spatialIssue({
          code: "spatial-support-exceeds-source-application",
          message: `Battlefield Dynamics instruction ${String(instruction?.key)} references cells outside its canonical source application.`,
          provenance,
          details: { outsideCells: outside },
        }),
      };
    }
    if (!cells.length) {
      return {
        status: "invalid",
        reason: "cell-reference-empty",
        provenance,
        issue: spatialIssue({
          code: "spatial-cell-reference-empty",
          message: `Battlefield Dynamics instruction ${String(instruction?.key)} resolved to no canonical cells.`,
          provenance,
        }),
      };
    }
    return { status: "resolved", supportKind: support.kind, cells, provenance };
  }

  return {
    status: "unsupported",
    reason: "support-kind-not-area-projectable",
    supportKind: support.kind ?? null,
    provenance,
    issue: spatialIssue({
      code: "spatial-support-not-area-projectable",
      message: `Battlefield Dynamics support kind ${String(support.kind)} cannot be projected as an area Region without additional canonical geometry.`,
      provenance,
      details: { supportKind: support.kind ?? null },
    }),
  };
}

export function buildBattlefieldDynamicsAreaProjectionPlan(generation) {
  const index = buildBattlefieldDynamicsSpatialIndex(generation);
  const instructions = generation?.executionHandoff?.instructions;
  if (!Array.isArray(instructions)) throw new Error("Battlefield Dynamics area projection requires executionHandoff.instructions.");
  const groups = new Map();
  const issues = [];

  for (const instruction of instructions) {
    if (!isRecord(instruction) || instruction.resolvedSupport == null) continue;
    const resolution = resolveBattlefieldDynamicsAreaSupport(generation, instruction, index);
    if (resolution.status !== "resolved") {
      if (resolution.issue) issues.push(resolution.issue);
      continue;
    }
    const cells = sortedUniqueCells(resolution.cells);
    const signature = supportSignature(cells);
    let projection = groups.get(signature);
    if (!projection) {
      projection = {
        projectionKey: projectionKeyForSignature(signature, cells.length),
        cellSignature: signature,
        cells,
        owners: [],
      };
      groups.set(signature, projection);
    }
    const instance = index.instanceByKey.get(instruction.instanceKey);
    projection.owners.push({
      instanceKey: instruction.instanceKey,
      sourceApplicationId: instruction.sourceApplicationId,
      physicalContextId: instance?.physicalContextId ?? null,
      dynamicId: instance?.dynamicId ?? null,
      instructionKey: instruction.key,
      ruleId: instruction.ruleId,
      source: instruction.source,
      kind: instruction.kind,
      supportKind: resolution.supportKind,
    });
  }

  const projections = Array.from(groups.values())
    .map(projection => ({
      ...projection,
      owners: projection.owners.sort((a, b) => String(a.instructionKey).localeCompare(String(b.instructionKey))),
    }))
    .sort((a, b) => a.projectionKey.localeCompare(b.projectionKey));
  return { version: BATTLEFIELD_DYNAMICS_SPATIAL_VERSION, projections, issues };
}

function gridData(scene) {
  const data = sceneData(scene);
  return data?.grid ?? scene?.grid ?? null;
}

export function battlefieldDynamicsCellPolygon(scene, cell, { foundryRef = globalThis.foundry } = {}) {
  const canonical = normalizeCell(cell);
  const config = gridData(scene);
  if (!isRecord(config) || Number(config.type) !== FOUNDRY_V13_HEX_ROWS_ODD) {
    throw new Error("Battlefield Dynamics area projection requires Foundry v13 Hexagonal Rows Odd grid type 2.");
  }
  const size = Number(config.size);
  if (!Number.isFinite(size) || size <= 0) throw new Error("Battlefield Dynamics area projection requires a positive Scene grid size.");
  const HexagonalGrid = foundryRef?.grid?.HexagonalGrid;
  if (typeof HexagonalGrid !== "function") throw new Error("Foundry HexagonalGrid is unavailable for Battlefield Dynamics area projection.");
  const grid = new HexagonalGrid({
    size,
    distance: Number.isFinite(Number(config.distance)) && Number(config.distance) > 0 ? Number(config.distance) : 1,
    units: typeof config.units === "string" ? config.units : "",
    columns: false,
    even: false,
    style: typeof config.style === "string" ? config.style : undefined,
    thickness: Number.isFinite(Number(config.thickness)) ? Number(config.thickness) : undefined,
    alpha: Number.isFinite(Number(config.alpha)) ? Number(config.alpha) : undefined,
    color: config.color,
  });
  const vertices = grid.getVertices({ i: canonical.row, j: canonical.col });
  if (!Array.isArray(vertices) || vertices.length < 3) throw new Error(`Foundry grid returned invalid vertices for canonical cell ${cellKey(canonical)}.`);
  return vertices.map(point => {
    if (!isRecord(point) || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
      throw new Error(`Foundry grid returned an invalid vertex for canonical cell ${cellKey(canonical)}.`);
    }
    return { x: Number(point.x), y: Number(point.y) };
  });
}

function projectionFlags(scene, projection, moduleId) {
  return {
    [moduleId]: {
      [BATTLEFIELD_DYNAMICS_PROJECTION_FLAG]: {
        version: BATTLEFIELD_DYNAMICS_SPATIAL_VERSION,
        ownership: BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
        projectionKind: BATTLEFIELD_DYNAMICS_PROJECTION_KIND,
        sceneId: sceneId(scene),
        projectionKey: projection.projectionKey,
        cellSignature: projection.cellSignature,
        cellCount: projection.cells.length,
        owners: projection.owners.map(owner => ({ ...owner })),
      },
    },
  };
}

export function battlefieldDynamicsProjectionRegionData(scene, projection, { foundryRef = globalThis.foundry, moduleId = MODULE_ID } = {}) {
  const ownerNames = [...new Set(projection.owners.map(owner => owner.dynamicId).filter(nonEmpty))];
  const label = ownerNames.length ? ownerNames.slice(0, 2).join(" + ") : projection.projectionKey;
  return {
    name: `Battlefield Dynamics · ${label}`,
    color: "#7f8cff",
    shapes: projection.cells.map(cell => ({
      type: "polygon",
      hole: false,
      points: battlefieldDynamicsCellPolygon(scene, cell, { foundryRef }).flatMap(point => [point.x, point.y]),
    })),
    behaviors: [],
    flags: projectionFlags(scene, projection, moduleId),
  };
}

function projectionFlag(region, moduleId = MODULE_ID) {
  if (typeof region?.getFlag === "function") return region.getFlag(moduleId, BATTLEFIELD_DYNAMICS_PROJECTION_FLAG);
  return region?.flags?.[moduleId]?.[BATTLEFIELD_DYNAMICS_PROJECTION_FLAG]
    ?? region?.toObject?.()?.flags?.[moduleId]?.[BATTLEFIELD_DYNAMICS_PROJECTION_FLAG]
    ?? null;
}

function regionId(region) {
  return region?.id ?? region?._id ?? region?.toObject?.()?._id ?? null;
}

function ownedProjectionRegions(scene, moduleId = MODULE_ID) {
  return collectionValues(scene?.regions).filter(region => {
    const flag = projectionFlag(region, moduleId);
    return isRecord(flag)
      && flag.version === BATTLEFIELD_DYNAMICS_SPATIAL_VERSION
      && flag.ownership === BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP
      && flag.projectionKind === BATTLEFIELD_DYNAMICS_PROJECTION_KIND;
  });
}

function comparableRegionData(region) {
  const data = typeof region?.toObject === "function" ? region.toObject() : region;
  return {
    name: data?.name ?? null,
    color: data?.color ?? null,
    shapes: data?.shapes ?? [],
    behaviors: data?.behaviors ?? [],
    flags: data?.flags ?? {},
  };
}

export async function reconcileBattlefieldDynamicsAreaRegions(scene, runtime, {
  authoritative = false,
  foundryRef = globalThis.foundry,
  moduleId = MODULE_ID,
} = {}) {
  const generation = runtime?.status === "active" ? runtime.canonicalGeneration : null;
  let plan = { version: BATTLEFIELD_DYNAMICS_SPATIAL_VERSION, projections: [], issues: [] };
  if (generation) {
    try {
      plan = buildBattlefieldDynamicsAreaProjectionPlan(generation);
    } catch (error) {
      plan = {
        version: BATTLEFIELD_DYNAMICS_SPATIAL_VERSION,
        projections: [],
        issues: [spatialIssue({
          code: "spatial-index-invalid",
          message: "Battlefield Dynamics canonical spatial metadata could not be indexed safely.",
          provenance: { environmentId: generation?.environmentId ?? null },
          details: { error: String(error?.message ?? error) },
          severity: "error",
        })],
      };
    }
  }

  const result = {
    plan,
    authoritative: Boolean(authoritative),
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    issues: [...plan.issues],
  };
  if (!authoritative) return result;

  const existing = ownedProjectionRegions(scene, moduleId);
  const existingByKey = new Map();
  const deleteIds = [];
  for (const region of existing) {
    const flag = projectionFlag(region, moduleId);
    const id = regionId(region);
    const key = flag?.projectionKey;
    if (!nonEmpty(id) || !nonEmpty(key) || existingByKey.has(key)) {
      if (nonEmpty(id)) deleteIds.push(id);
      continue;
    }
    existingByKey.set(key, region);
  }

  const desiredKeys = new Set(plan.projections.map(projection => projection.projectionKey));
  for (const [key, region] of existingByKey.entries()) {
    if (!desiredKeys.has(key)) {
      const id = regionId(region);
      if (nonEmpty(id)) deleteIds.push(id);
      existingByKey.delete(key);
    }
  }

  const creates = [];
  const updates = [];
  for (const projection of plan.projections) {
    let desired;
    try {
      desired = battlefieldDynamicsProjectionRegionData(scene, projection, { foundryRef, moduleId });
    } catch (error) {
      result.issues.push(spatialIssue({
        code: "spatial-region-shape-unavailable",
        message: `Battlefield Dynamics projection ${projection.projectionKey} could not be converted to Foundry Region geometry.`,
        provenance: { sceneId: sceneId(scene) },
        details: { projectionKey: projection.projectionKey, error: String(error?.message ?? error) },
        severity: "error",
      }));
      continue;
    }
    const current = existingByKey.get(projection.projectionKey);
    if (!current) {
      creates.push(desired);
      continue;
    }
    if (sameJson(comparableRegionData(current), desired)) {
      result.unchanged += 1;
      continue;
    }
    const id = regionId(current);
    if (nonEmpty(id)) updates.push({ _id: id, ...desired });
  }

  if (deleteIds.length) {
    if (typeof scene?.deleteEmbeddedDocuments !== "function") {
      result.issues.push(spatialIssue({
        code: "spatial-region-delete-unavailable",
        message: "Foundry Scene cannot delete stale Battlefield Dynamics projection Regions.",
        provenance: { sceneId: sceneId(scene) },
        details: { count: deleteIds.length },
        severity: "error",
      }));
    } else {
      await scene.deleteEmbeddedDocuments("Region", [...new Set(deleteIds)]);
      result.deleted = new Set(deleteIds).size;
    }
  }
  if (updates.length) {
    if (typeof scene?.updateEmbeddedDocuments !== "function") {
      result.issues.push(spatialIssue({
        code: "spatial-region-update-unavailable",
        message: "Foundry Scene cannot update Battlefield Dynamics projection Regions.",
        provenance: { sceneId: sceneId(scene) },
        details: { count: updates.length },
        severity: "error",
      }));
    } else {
      await scene.updateEmbeddedDocuments("Region", updates);
      result.updated = updates.length;
    }
  }
  if (creates.length) {
    if (typeof scene?.createEmbeddedDocuments !== "function") {
      result.issues.push(spatialIssue({
        code: "spatial-region-create-unavailable",
        message: "Foundry Scene cannot create Battlefield Dynamics projection Regions.",
        provenance: { sceneId: sceneId(scene) },
        details: { count: creates.length },
        severity: "error",
      }));
    } else {
      await scene.createEmbeddedDocuments("Region", creates);
      result.created = creates.length;
    }
  }
  return result;
}
