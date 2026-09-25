import { MODULE_ID } from "./live-scene-feed.mjs";
import {
  BATTLEFIELD_DYNAMICS_PROJECTION_FLAG,
  BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP,
  BATTLEFIELD_DYNAMICS_SPATIAL_VERSION,
  buildBattlefieldDynamicsAreaProjectionPlan,
} from "./battlefield-dynamics-spatial.mjs";

export const BATTLEFIELD_DYNAMICS_TRIGGER_EVENT_VERSION = 1;
const SPATIAL_TRIGGERS = new Set(["on-enter", "on-exit", "on-move-through"]);
const SEGMENT_TYPES = { 1: "enter", [-1]: "exit", 0: "move" };
const values = collection => Array.isArray(collection) ? collection : Array.from(collection?.values?.() ?? []);
const validPosition = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);

function issue(code, message, sceneId, tokenId, details = {}) {
  return {
    code, category: "spatial-trigger", severity: "warning", automaticBlocked: true,
    message, provenance: { sceneId, tokenId }, details,
  };
}

function projectionFlag(region) {
  return region?.getFlag?.(MODULE_ID, BATTLEFIELD_DYNAMICS_PROJECTION_FLAG)
    ?? region?.flags?.[MODULE_ID]?.[BATTLEFIELD_DYNAMICS_PROJECTION_FLAG] ?? null;
}

function matchesInstruction(owner, instruction, instance) {
  return instruction?.source === "effect" && instruction.key === owner.instructionKey
    && instruction.instanceKey === owner.instanceKey && instruction.sourceApplicationId === owner.sourceApplicationId
    && instruction.ruleId === owner.ruleId && instruction.kind === owner.kind
    && instance?.sourceApplicationId === owner.sourceApplicationId
    && instance?.physicalContextId === owner.physicalContextId && instance?.dynamicId === owner.dynamicId;
}

/** Pure normalization boundary: no instruction is executed by this function. */
export function normalizeBattlefieldDynamicsMovement(scene, runtime, token, movement) {
  const sceneId = scene?.id;
  const tokenId = token?.id;
  const issues = [];
  const events = [];
  if (runtime?.status !== "active" || runtime.sceneId !== sceneId || token?.parent !== scene) return { events, issues };
  if (typeof token.testInsideRegion !== "function" || typeof token.segmentizeRegionMovementPath !== "function") {
    issues.push(issue("spatial-token-region-api-unavailable", "Token lacks native Region footprint and path methods.", sceneId, tokenId));
    return { events, issues };
  }
  const waypoints = movement?.passed?.waypoints;
  if (typeof movement?.id !== "string" || !movement.id || !Array.isArray(waypoints) || waypoints.length < 2
    || !waypoints.every(validPosition) || !validPosition(movement.origin) || !validPosition(movement.destination)) {
    issues.push(issue("spatial-movement-path-unavailable", "Moved token has no complete, identifiable passed movement path.", sceneId, tokenId));
    return { events, issues };
  }
  const instructions = new Map((runtime.canonicalGeneration.executionHandoff?.instructions ?? []).map(item => [item.key, item]));
  const instances = new Map((runtime.canonicalGeneration.applicationComposition?.instances ?? []).map(item => [item.key, item]));
  const projections = new Map(buildBattlefieldDynamicsAreaProjectionPlan(runtime.canonicalGeneration)
    .projections.map(projection => [projection.projectionKey, projection]));
  for (const region of values(scene.regions)) {
    const flag = projectionFlag(region);
    if (!flag || flag.ownership !== BATTLEFIELD_DYNAMICS_PROJECTION_OWNERSHIP
      || flag.version !== BATTLEFIELD_DYNAMICS_SPATIAL_VERSION || flag.sceneId !== sceneId) continue;
    if (!Array.isArray(flag.owners) || !flag.projectionKey) {
      issues.push(issue("spatial-projection-provenance-invalid", "Owned projection has invalid provenance.", sceneId, tokenId, { regionId: region.id }));
      continue;
    }
    const expected = projections.get(flag.projectionKey);
    if (!expected || expected.cellSignature !== flag.cellSignature || expected.owners.length !== flag.owners.length
      || expected.owners.some(owner => !flag.owners.some(candidate => candidate.instructionKey === owner.instructionKey
        && candidate.instanceKey === owner.instanceKey))) {
      issues.push(issue("spatial-projection-stale", "Owned Region differs from current canonical support projection.", sceneId, tokenId, { regionId: region.id }));
      continue;
    }
    const owners = [];
    for (const owner of flag.owners) {
      const instruction = instructions.get(owner.instructionKey);
      const instance = instances.get(owner.instanceKey);
      if (!matchesInstruction(owner, instruction, instance)) {
        issues.push(issue("spatial-projection-owner-stale", "Projection owner does not match the current canonical instruction.", sceneId, tokenId, { regionId: region.id, instructionKey: owner.instructionKey }));
        continue;
      }
      if (SPATIAL_TRIGGERS.has(instruction.trigger?.kind)) owners.push({ owner, instruction, instance });
    }
    if (!owners.length) continue;
    let segments;
    let originInside;
    let destinationInside;
    try {
      originInside = token.testInsideRegion(region, movement.origin);
      destinationInside = token.testInsideRegion(region, movement.destination);
      segments = token.segmentizeRegionMovementPath(region, waypoints);
    } catch (error) {
      issues.push(issue("spatial-region-path-failed", "Native token Region path classification failed.", sceneId, tokenId, { regionId: region.id, error: String(error) }));
      continue;
    }
    if (typeof originInside !== "boolean" || typeof destinationInside !== "boolean" || !Array.isArray(segments)
      || segments.some(segment => !(segment.type in SEGMENT_TYPES) || !validPosition(segment.from) || !validPosition(segment.to))) {
      issues.push(issue("spatial-region-path-invalid", "Native token Region path returned incomplete segment data.", sceneId, tokenId, { regionId: region.id }));
      continue;
    }
    const enters = segments.filter(segment => segment.type === 1);
    const exits = segments.filter(segment => segment.type === -1);
    if (originInside !== destinationInside && (!enters.length && !exits.length)) {
      issues.push(issue("spatial-region-path-inconsistent", "Region occupancy changed without a classified boundary crossing.", sceneId, tokenId, { regionId: region.id }));
      continue;
    }
    const crossing = enters.length && exits.length;
    for (const { owner, instruction, instance } of owners) {
      const kind = instruction.trigger.kind;
      const matches = kind === "on-enter" ? enters : kind === "on-exit" ? exits : crossing ? [enters[0]] : [];
      for (const [index, segment] of matches.entries()) {
        events.push({
          version: BATTLEFIELD_DYNAMICS_TRIGGER_EVENT_VERSION,
          sceneId, tokenId, movementId: movement.id, regionId: region.id, projectionKey: flag.projectionKey,
          triggerKind: kind, triggerId: instruction.triggerId, instructionKey: instruction.key,
          ruleId: instruction.ruleId, instanceKey: instance.key,
          identity: { environmentId: instance.environmentId, physicalContextId: instance.physicalContextId,
            dynamicId: instance.dynamicId, sourceApplicationId: instance.sourceApplicationId },
          crossingIndex: index, from: { ...segment.from }, to: { ...segment.to },
          originInside, destinationInside,
        });
      }
    }
  }
  return { events, issues };
}

export class BattlefieldDynamicsTriggerLedger {
  constructor() { this.seen = new Map(); }

  accept(event) {
    const transaction = `${event.sceneId}:${event.tokenId}:${event.movementId}`;
    const signature = JSON.stringify([event.projectionKey, event.instructionKey, event.triggerKind,
      event.crossingIndex, event.from, event.to]);
    if (!this.seen.has(transaction)) {
      this.seen.set(transaction, new Set());
      if (this.seen.size > 256) this.seen.delete(this.seen.keys().next().value);
    }
    const signatures = this.seen.get(transaction);
    if (signatures.has(signature)) return false;
    signatures.add(signature);
    return true;
  }

  clearScene(sceneId) {
    for (const key of this.seen.keys()) if (key.startsWith(`${sceneId}:`)) this.seen.delete(key);
  }
}
