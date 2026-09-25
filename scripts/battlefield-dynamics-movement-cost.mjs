import { MODULE_ID } from "./live-scene-feed.mjs";
import {
  BATTLEFIELD_DYNAMICS_PROJECTION_FLAG,
  BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
  BATTLEFIELD_DYNAMICS_SPATIAL_VERSION,
  buildBattlefieldDynamicsAreaProjectionPlan,
} from "./battlefield-dynamics-spatial.mjs";

export const BATTLEFIELD_DYNAMICS_MOVEMENT_COST_VERSION = 1;
const COMPOSITION = Object.freeze({
  baseCost: "native-movement-cost-in-hex-equivalents",
  additiveUnit: "hex-equivalents-per-traversal",
  multiplierUnit: "dimensionless",
  calculation: "(baseCost + sum(additiveValues)) * product(multiplierValues)",
  overlap: "all-exact-applicable-contributions",
  orderingIsSemantic: false,
  appliesTo: "each-measured-grid-space-traversal",
});
const values = collection => Array.isArray(collection) ? collection : Array.from(collection?.values?.() ?? []);
const gridCache = new WeakMap();

function sceneGrid(scene) {
  if (typeof scene?.grid?.getCenterPoint === "function") return scene.grid;
  if (globalThis.canvas?.scene?.id === scene?.id && typeof globalThis.canvas.grid?.getCenterPoint === "function") {
    return globalThis.canvas.grid;
  }
  const HexagonalGrid = globalThis.foundry?.grid?.HexagonalGrid;
  if (Number(scene?.grid?.type) !== 2 || typeof HexagonalGrid !== "function") return null;
  const signature = JSON.stringify([scene.grid.type, scene.grid.size, scene.grid.distance, scene.grid.units]);
  const cached = gridCache.get(scene);
  if (cached?.signature === signature) return cached.grid;
  const grid = new HexagonalGrid({ size: scene.grid.size, distance: scene.grid.distance,
    units: scene.grid.units ?? "", columns: false, even: false });
  gridCache.set(scene, { signature, grid });
  return grid;
}

function diagnostic(code, message, sceneId, details = {}) {
  return { code, category: "movement-cost", severity: "warning", automaticBlocked: true,
    message, provenance: { sceneId }, details };
}

/** Exact canonical arithmetic. All individual contributions remain in the result. */
export function composeBattlefieldDynamicsMovementCost(baseHex, contributions) {
  if (!Number.isFinite(baseHex) || baseHex < 0) throw new Error("Native movement cost must be non-negative and finite.");
  let additive = 0;
  let multiplier = 1;
  for (const contribution of contributions) {
    if (!Number.isFinite(contribution.value) || contribution.value < 0) throw new Error("Movement cost contribution is invalid.");
    if (contribution.mode === "additive") additive += contribution.value;
    else if (contribution.mode === "multiplier") multiplier *= contribution.value;
    else throw new Error("Movement cost contribution has an unknown mode.");
  }
  const costHex = (baseHex + additive) * multiplier;
  if (!Number.isFinite(costHex)) throw new Error("Movement cost composition overflowed.");
  return { costHex, baseHex, additive, multiplier, contributions: contributions.map(item => ({ ...item })) };
}

function regionFlag(region) {
  return region?.getFlag?.(MODULE_ID, BATTLEFIELD_DYNAMICS_PROJECTION_FLAG)
    ?? region?.flags?.[MODULE_ID]?.[BATTLEFIELD_DYNAMICS_PROJECTION_FLAG] ?? null;
}

/** Resolve only current, module-owned projections and typed continuous operations. */
export function battlefieldDynamicsMovementCostCatalog(scene, runtime) {
  const entries = [];
  const issues = [];
  if (runtime?.status !== "active" || runtime.sceneId !== scene?.id) return { entries, issues };
  const generation = runtime.canonicalGeneration;
  const instructions = generation.executionHandoff?.instructions ?? [];
  const automatic = instructions.filter(item => item.source === "effect" && item.kind === "movement-cost"
    && item.adjudication === "automatic");
  const relevant = automatic.filter(item => item.trigger?.kind === "continuous");
  for (const instruction of automatic.filter(item => item.trigger?.kind !== "continuous")) {
    issues.push(diagnostic("movement-cost-trigger-unsupported",
      "Automatic movement cost instruction requires a movement timing contract other than continuous.", scene.id,
      { instructionKey: instruction.key, triggerKind: instruction.trigger?.kind ?? null }));
  }
  if (!relevant.length) return { entries, issues };
  if (JSON.stringify(generation.executionHandoff?.contract?.movementCostComposition) !== JSON.stringify(COMPOSITION)) {
    issues.push(diagnostic("movement-cost-contract-unavailable", "The canonical movement cost composition contract is missing or unsupported.", scene.id));
    return { entries, issues };
  }
  if (!Number.isFinite(scene.grid?.distance) || scene.grid.distance <= 0 || !sceneGrid(scene)) {
    issues.push(diagnostic("movement-cost-grid-unavailable", "Foundry grid cannot resolve hex-equivalent movement costs.", scene.id));
    return { entries, issues };
  }
  let plan;
  try { plan = buildBattlefieldDynamicsAreaProjectionPlan(generation); }
  catch (error) {
    issues.push(diagnostic("movement-cost-support-invalid", "Canonical area support could not be indexed.", scene.id, { error: String(error) }));
    return { entries, issues };
  }
  const byKey = new Map(plan.projections.map(projection => [projection.projectionKey, projection]));
  const byInstruction = new Map(relevant.map(item => [item.key, item]));
  const instances = new Map(generation.applicationComposition.instances.map(item => [item.key, item]));
  for (const region of values(scene.regions)) {
    const flag = regionFlag(region);
    if (!flag || flag.ownership !== BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP
      || flag.version !== BATTLEFIELD_DYNAMICS_SPATIAL_VERSION || flag.sceneId !== scene.id) continue;
    const projection = byKey.get(flag.projectionKey);
    if (!projection || flag.cellSignature !== projection.cellSignature || !Array.isArray(flag.owners)
      || flag.owners.length !== projection.owners.length || projection.owners.some(owner =>
        !flag.owners.some(candidate => candidate.instructionKey === owner.instructionKey && candidate.instanceKey === owner.instanceKey))) {
      issues.push(diagnostic("movement-cost-projection-stale", "Disposable Region does not match canonical application support.", scene.id, { regionId: region.id }));
      continue;
    }
    for (const owner of flag.owners) {
      const instruction = byInstruction.get(owner.instructionKey);
      if (!instruction) continue;
      const instance = instances.get(owner.instanceKey);
      const operation = instruction.descriptor?.operation;
      if (!instance || instruction.instanceKey !== owner.instanceKey || instruction.sourceApplicationId !== owner.sourceApplicationId
        || instance.sourceApplicationId !== owner.sourceApplicationId || instance.dynamicId !== owner.dynamicId
        || instance.physicalContextId !== owner.physicalContextId || operation?.kind !== "movement-cost"
        || !["additive", "multiplier"].includes(operation.mode) || !Number.isFinite(operation.value)
        || operation.value < 0 || instruction.requiredInputs?.length) {
        issues.push(diagnostic("movement-cost-instruction-invalid", "Projected movement cost instruction cannot execute safely.", scene.id,
          { instructionKey: owner.instructionKey, regionId: region.id }));
        continue;
      }
      entries.push({ region, instructionKey: instruction.key, instanceKey: instance.key,
        identity: { environmentId: instance.environmentId, physicalContextId: instance.physicalContextId,
          dynamicId: instance.dynamicId, sourceApplicationId: instance.sourceApplicationId },
        mode: operation.mode, value: operation.value });
    }
  }
  const resolved = new Set(entries.map(entry => entry.instructionKey));
  for (const instruction of relevant) {
    if (!resolved.has(instruction.key)) issues.push(diagnostic("movement-cost-support-unavailable",
      "Automatic movement cost instruction lacks a valid disposable support Region.", scene.id,
      { instructionKey: instruction.key }));
  }
  if (issues.length) entries.length = 0;
  return { entries, issues };
}

export function measureBattlefieldDynamicsGridStep({ scene, catalog, from, to, distance, segment, nativeCost, elevation = 0 }) {
  if (!catalog.entries.length) return { cost: nativeCost, contributions: [] };
  if (!Number.isInteger(to?.i) || !Number.isInteger(to?.j) || !Number.isFinite(nativeCost) || nativeCost < 0) {
    throw new Error("Foundry movement step lacks valid offset or native cost.");
  }
  const center = sceneGrid(scene)?.getCenterPoint(to);
  if (!Number.isFinite(center?.x) || !Number.isFinite(center?.y)) throw new Error("Foundry grid returned an invalid step center.");
  const point = { x: center.x, y: center.y, elevation: segment?.to?.elevation ?? elevation };
  const contributions = catalog.entries.filter(entry => entry.region.testPoint(point)).map(({ region, ...entry }) => ({
    ...entry, regionId: region.id,
  }));
  if (!contributions.length) return { cost: nativeCost, contributions };
  const composed = composeBattlefieldDynamicsMovementCost(nativeCost / scene.grid.distance, contributions);
  return { cost: composed.costHex * scene.grid.distance, contributions };
}

/** Wrap the configured Foundry Token class once; preserve its native cost function. */
export function installBattlefieldDynamicsMovementCostAdapter(TokenClass, manager) {
  const prototype = TokenClass?.prototype;
  if (!prototype || typeof prototype._getMovementCostFunction !== "function") return false;
  if (prototype._getMovementCostFunction._battlefieldDynamicsMovementCost) return true;
  const original = prototype._getMovementCostFunction;
  const wrapped = function(options) {
    const native = original.call(this, options);
    const scene = this.document?.parent;
    const runtime = manager.runtimeForScene(scene);
    if (!runtime) return native;
    const catalog = battlefieldDynamicsMovementCostCatalog(scene, runtime);
    for (const issue of catalog.issues) manager.recordMovementCostIssue(issue);
    if (!catalog.entries.length) return native;
    return (from, to, distance, segment) => {
      const nativeCost = typeof native === "function" ? native.call(this, from, to, distance, segment) : distance;
      if (nativeCost === Infinity) return Infinity;
      try {
        return measureBattlefieldDynamicsGridStep({ scene, catalog, from, to, distance, segment,
          nativeCost, elevation: this.document.elevation }).cost;
      } catch (error) {
        manager.recordMovementCostIssue(diagnostic("movement-cost-measurement-failed",
          "Movement cost adapter could not classify the Foundry grid step.", scene.id, { error: String(error) }));
        return nativeCost;
      }
    };
  };
  wrapped._battlefieldDynamicsMovementCost = true;
  prototype._getMovementCostFunction = wrapped;
  return true;
}
