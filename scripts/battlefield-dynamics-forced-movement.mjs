import { BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY } from "./battlefield-dynamics-contract.mjs";

export const BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_VERSION = 1;
const same = (a, b) => a?.i === b?.i && a?.j === b?.j;
const valid = offset => Number.isInteger(offset?.i) && Number.isInteger(offset?.j);

function issue(code, message, scene, event, details = {}) {
  return { code, category: "forced-movement", severity: "warning", automaticBlocked: true, message,
    provenance: { sceneId: scene?.id, tokenId: event?.tokenId, instructionKey: event?.instructionKey,
      instanceKey: event?.instanceKey, ...event?.identity }, details };
}

/** Resolve only deterministic, spatially triggered exact offsets. No Token mutation here. */
export function planBattlefieldDynamicsForcedMovement(scene, runtime, token, event, { grid = null } = {}) {
  const blocked = (code, message, details) => ({ status: "blocked", issue: issue(code, message, scene, event, details) });
  if (runtime?.status !== "active" || runtime.sceneId !== scene?.id || event?.sceneId !== scene?.id
    || typeof event?.movementId !== "string" || !event.movementId
    || token?.parent !== scene || token?.id !== event?.tokenId) {
    return blocked("forced-movement-runtime-stale", "Scene, runtime, or token no longer matches the trigger.");
  }
  const generation = runtime.canonicalGeneration;
  if (JSON.stringify(generation.executionHandoff?.contract?.forcedMovementGeometry)
    !== JSON.stringify(BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY)) {
    return blocked("forced-movement-geometry-unsupported", "Canonical forced movement geometry contract is missing or unsupported.");
  }
  const instruction = generation.executionHandoff.instructions.find(item => item.key === event.instructionKey);
  const instance = generation.applicationComposition.instances.find(item => item.key === event.instanceKey);
  if (!instruction || !instance || instruction.instanceKey !== instance.key || instruction.sourceApplicationId !== instance.sourceApplicationId
    || !["on-enter", "on-exit", "on-move-through"].includes(event.triggerKind)
    || instruction.trigger?.kind !== event.triggerKind || instruction.triggerId !== event.triggerId
    || instruction.kind !== "forced-movement" || instruction.source !== "effect"
    || instance.environmentId !== event.identity?.environmentId || instance.physicalContextId !== event.identity?.physicalContextId
    || instance.dynamicId !== event.identity?.dynamicId || instance.sourceApplicationId !== event.identity?.sourceApplicationId) {
    return blocked("forced-movement-provenance-invalid", "Forced movement trigger does not match its canonical instruction and application.");
  }
  const operation = instruction.descriptor?.operation;
  if (instruction.adjudication !== "automatic" || instruction.requiredInputs?.length || operation?.kind !== "forced-movement") {
    return blocked("forced-movement-gm-confirmation", "Forced movement requires GM resolution before execution.");
  }
  if (!Number.isInteger(operation.distanceHex) || operation.distanceHex < 1) {
    return blocked("forced-movement-distance-unsupported", "Automatic forced movement requires a whole positive hex distance.");
  }
  if (operation.vector?.kind !== "hex-offset") {
    return blocked("forced-movement-vector-unresolved", "The vector does not identify one exact destination; GM resolution is required.",
      { vectorKind: operation.vector?.kind ?? null });
  }
  const { deltaCol, deltaRow } = operation.vector;
  if (!Number.isInteger(deltaCol) || !Number.isInteger(deltaRow) || (!deltaCol && !deltaRow)) {
    return blocked("forced-movement-vector-invalid", "Canonical hex offset is invalid.");
  }
  const nativeGrid = grid ?? (globalThis.canvas?.scene?.id === scene.id ? globalThis.canvas.grid : null);
  if (!nativeGrid || typeof nativeGrid.getOffset !== "function" || typeof nativeGrid.getDirectPath !== "function"
    || typeof nativeGrid.getTopLeftPoint !== "function" || Number(scene.grid?.type) !== 2) {
    return blocked("forced-movement-grid-unavailable", "Foundry's native odd-row hex grid is unavailable for this Scene.");
  }
  if (!Number.isFinite(token.x) || !Number.isFinite(token.y)) return blocked("forced-movement-token-position-invalid", "Token grid anchor is unavailable.");
  let source, destination, path, point;
  try {
    source = nativeGrid.getOffset({ x: token.x, y: token.y });
    destination = { i: source.i + deltaRow, j: source.j + deltaCol };
    path = nativeGrid.getDirectPath([source, destination]);
    point = nativeGrid.getTopLeftPoint(destination);
  } catch (error) {
    return blocked("forced-movement-grid-resolution-failed", "Foundry could not resolve the forced movement path.", { error: String(error) });
  }
  if (!valid(source) || !valid(destination) || !Array.isArray(path) || !same(path[0], source)
    || !same(path.at(-1), destination) || path.length - 1 !== operation.distanceHex
    || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    return blocked("forced-movement-distance-mismatch", "Canonical distance and exact hex offset do not resolve to the same Foundry grid path.",
      { distanceHex: operation.distanceHex, measuredHex: Array.isArray(path) ? path.length - 1 : null });
  }
  if (typeof token.move !== "function") return blocked("forced-movement-token-api-unavailable", "Foundry Token movement API is unavailable.");
  return { status: "ready", event, token, target: { x: point.x, y: point.y }, path };
}

export async function executeBattlefieldDynamicsForcedMovement(plan) {
  if (plan?.status !== "ready") return { moved: false, reason: "not-ready" };
  const moved = await plan.token.move(plan.target, { method: "api" });
  return { moved: moved === true, reason: moved === true ? "moved" : "foundry-rejected" };
}
