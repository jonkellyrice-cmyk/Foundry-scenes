import { resolvedBattlefieldDynamicsMomentumContributions } from "./battlefield-dynamics-momentum-state.mjs";

export const BATTLEFIELD_DYNAMICS_MOMENTUM_MOTION_VERSION = 1;
const cube = value => value && [value.q, value.r, value.s].every(Number.isInteger)
  && value.q + value.r + value.s === 0;
const offset = value => Number.isInteger(value?.i) && Number.isInteger(value?.j);
const same = (a, b) => a?.i === b?.i && a?.j === b?.j;

function issue(code, message, scene, token, movement, contributions = []) {
  return { code, category: "momentum", severity: "warning", automaticBlocked: true, message,
    provenance: { sceneId: scene?.id, tokenId: token?.id },
    details: { movementId: movement?.id, tokenId: token?.id,
      contributions: contributions.map(({ instanceKey, instructionKey }) => ({ instanceKey, instructionKey })) } };
}

/** Plan a post-movement correction using Foundry's native odd-row/cube geometry. */
export function planBattlefieldDynamicsMomentumMotion(scene, runtime, token, movement, recorded, { grid = null } = {}) {
  const blocked = (code, message, contributions) => ({ status: "blocked",
    issue: issue(code, message, scene, token, movement, contributions) });
  if (runtime?.status !== "active" || runtime.sceneId !== scene?.id || token?.parent !== scene
    || !movement?.id || !recorded?.changed || recorded.state?.sceneId !== scene?.id) {
    return blocked("momentum-motion-stale", "Momentum movement and persisted runtime state no longer match.");
  }
  if (recorded.issues?.length) return blocked("momentum-motion-unresolved",
    "One or more momentum contributions require GM resolution.", recorded.issues);
  const contributions = resolvedBattlefieldDynamicsMomentumContributions(recorded.state, token.id, movement.id);
  if (!contributions.length) return { status: "none" };
  if (contributions.length !== 1) return blocked("momentum-motion-overlap-ambiguous",
    "Multiple momentum contributions resolve on this movement; GM must choose their combined outcome.", contributions);
  const [contribution] = contributions;
  const instruction = runtime.canonicalGeneration?.executionHandoff?.instructions?.find(item => item.key === contribution.instructionKey);
  const instance = runtime.canonicalGeneration?.applicationComposition?.instances?.find(item => item.key === contribution.instanceKey);
  if (!instruction || !instance || instruction.instanceKey !== instance.key || instruction.kind !== "momentum-effect"
    || instruction.adjudication !== "automatic" || instruction.requiredInputs?.length
    || instruction.sourceApplicationId !== instance.sourceApplicationId
    || !cube(contribution.velocity)) return blocked("momentum-motion-provenance-invalid",
    "Resolved momentum does not match one automatic canonical instruction.", contributions);
  const native = grid ?? (globalThis.canvas?.scene?.id === scene.id ? globalThis.canvas.grid : null);
  if (Number(scene.grid?.type) !== 2 || typeof native?.getOffset !== "function"
    || typeof native.offsetToCube !== "function" || typeof native.cubeToOffset !== "function"
    || typeof native.getTopLeftPoint !== "function" || typeof native.getDirectPath !== "function") {
    return blocked("momentum-motion-grid-unavailable", "Native odd-row hex geometry is unavailable.", contributions);
  }
  const waypoints = movement.passed?.waypoints;
  if (!Array.isArray(waypoints) || waypoints.length < 2 || !waypoints.every(point =>
    Number.isFinite(point.x) && Number.isFinite(point.y)) || !Number.isFinite(token.x)
    || !Number.isFinite(token.y)) return blocked("momentum-motion-path-unavailable",
    "The complete movement path or current Token anchor is unavailable.", contributions);
  let origin, destination, actual, originCube, finalCube, target, path, point;
  try {
    origin = native.getOffset(waypoints[0]);
    destination = native.getOffset(waypoints.at(-1));
    actual = native.getOffset({ x: token.x, y: token.y });
    originCube = native.offsetToCube(origin);
    finalCube = { q: originCube.q + contribution.velocity.q, r: originCube.r + contribution.velocity.r,
      s: originCube.s + contribution.velocity.s };
    target = native.cubeToOffset(finalCube);
    path = native.getDirectPath([destination, target]);
    point = native.getTopLeftPoint(target);
  } catch { return blocked("momentum-motion-grid-failed", "Foundry could not calculate the momentum destination.", contributions); }
  const distance = Math.max(Math.abs(contribution.velocity.q), Math.abs(contribution.velocity.r),
    Math.abs(contribution.velocity.s));
  if (!offset(origin) || !offset(destination) || !same(destination, actual) || !cube(originCube)
    || !cube(finalCube) || !offset(target) || !Array.isArray(path)
    || !same(path[0], destination) || !same(path.at(-1), target)
    || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)
    || !Number.isInteger(distance)) return blocked("momentum-motion-geometry-invalid",
    "The measured path and momentum destination disagree.", contributions);
  if (same(destination, target)) return { status: "none", reason: "already-at-resultant", contribution };
  if (typeof token.move !== "function") return blocked("momentum-motion-token-api-unavailable",
    "Foundry's Token movement API is unavailable.", contributions);
  return { status: "ready", scene, token, movementId: movement.id, contribution,
    target: { x: point.x, y: point.y }, path };
}

export async function executeBattlefieldDynamicsMomentumMotion(plan) {
  if (plan?.status !== "ready") return { moved: false, reason: "not-ready" };
  const moved = await plan.token.move(plan.target, { method: "api" });
  return { moved: moved === true, reason: moved === true ? "moved" : "foundry-rejected" };
}
