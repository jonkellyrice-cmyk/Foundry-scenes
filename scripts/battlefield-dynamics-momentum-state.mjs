import { battlefieldDynamicsMomentumIntentCanResolve,
  resolveBattlefieldDynamicsMomentumVector } from "./battlefield-dynamics-momentum.mjs";

export const BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_FLAG = "battlefieldDynamicsMomentumState";
export const BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_VERSION = 1;
const MAX_RECENT = 32;
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const cube = value => isRecord(value) && [value.q, value.r, value.s].every(Number.isInteger)
  && value.q + value.r + value.s === 0;
const blank = sceneId => ({ version: BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_VERSION,
  ownership: "foundry-runtime-mutable", sceneId, tokens: {} });
const validPosition = value => Number.isFinite(value?.x) && Number.isFinite(value?.y);
const identityFields = ["environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"];
const identityOf = instance => Object.fromEntries(identityFields.map(key => [key, instance[key]]));
const sameIdentity = (left, right) => isRecord(left) && isRecord(right)
  && identityFields.every(key => left[key] === right[key]);

/** Read mutable momentum without accepting stale application identity as authority. */
export function readBattlefieldDynamicsMomentumState(scene, runtime, moduleId) {
  const state = scene?.getFlag?.(moduleId, BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_FLAG)
    ?? scene?.flags?.[moduleId]?.[BATTLEFIELD_DYNAMICS_MOMENTUM_STATE_FLAG];
  const result = blank(scene?.id);
  if (!isRecord(state) || state.version !== result.version || state.ownership !== result.ownership
    || state.sceneId !== result.sceneId || !isRecord(state.tokens)) return result;
  const identities = new Map(runtime?.canonicalGeneration?.applicationComposition?.instances
    ?.map(instance => [instance.key, identityOf(instance)]) ?? []);
  const instructions = new Map(runtime?.canonicalGeneration?.executionHandoff?.instructions
    ?.filter(item => item.kind === "momentum-effect").map(item => [item.key, item]) ?? []);
  for (const [tokenId, token] of Object.entries(state.tokens)) {
    if (!tokenId || !isRecord(token) || !Array.isArray(token.recentMovementIds)) continue;
    if (scene?.tokens && typeof scene.tokens.get === "function" && !scene.tokens.get(tokenId)) continue;
    const applications = {};
    for (const [instanceKey, entry] of Object.entries(isRecord(token.applications) ? token.applications : {})) {
      if (!isRecord(entry) || !sameIdentity(identities.get(instanceKey), entry.identity)) continue;
      const contributions = {};
      for (const [instructionKey, contribution] of Object.entries(isRecord(entry.contributions) ? entry.contributions : {})) {
        if (!isRecord(contribution) || (contribution.velocity !== null && !cube(contribution.velocity))) continue;
        const instruction = instructions.get(instructionKey);
        if (!instruction || instruction.instanceKey !== instanceKey) continue;
        if (contribution.pending && (instruction.adjudication !== "automatic"
          || !Array.isArray(instruction.requiredInputs) || instruction.requiredInputs.length
          || JSON.stringify(contribution.pending.operation) !== JSON.stringify(instruction.descriptor?.operation))) continue;
        contributions[instructionKey] = structuredClone(contribution);
      }
      applications[instanceKey] = { identity: structuredClone(entry.identity), contributions };
    }
    result.tokens[tokenId] = { recentMovementIds: token.recentMovementIds.filter(id => typeof id === "string" && id).slice(-MAX_RECENT),
      recentMovements: Array.isArray(token.recentMovements) ? token.recentMovements.filter(item =>
        typeof item?.id === "string" && Array.isArray(item.path) && item.path.length >= 2
        && item.path.every(validPosition)).slice(-MAX_RECENT) : [],
      lastSegment: cube(token.lastSegment) ? structuredClone(token.lastSegment) : null, applications };
  }
  return result;
}

/** Record a completed native movement once; keep each application contribution independent. */
export function applyBattlefieldDynamicsMomentumMovement(state, runtime, token, movement, intents, grid) {
  const unchanged = reason => ({ changed: false, reason, state });
  if (!isRecord(state) || state.sceneId !== token?.parent?.id || typeof token?.id !== "string"
    || typeof movement?.id !== "string" || !movement.id) return unchanged("movement-unavailable");
  const waypoints = movement.passed?.waypoints;
  if (!Array.isArray(waypoints) || waypoints.length < 2 || !waypoints.every(validPosition)
    || typeof grid?.getOffset !== "function" || typeof grid?.offsetToCube !== "function") return unchanged("native-path-unavailable");
  const prior = state.tokens[token.id] ?? { recentMovementIds: [], recentMovements: [], lastSegment: null, applications: {} };
  const previousMovement = prior.recentMovements?.find(item => item.id === movement.id);
  if (previousMovement) {
    const path = waypoints.map(({ x, y }) => ({ x, y }));
    return unchanged(JSON.stringify(previousMovement.path) === JSON.stringify(path) ? "duplicate-movement" : "ambiguous-checkpoint");
  }
  if (prior.recentMovementIds.includes(movement.id)) return unchanged("legacy-duplicate");
  let start, end, previous, last;
  try {
    start = grid.offsetToCube(grid.getOffset(waypoints[0]));
    end = grid.offsetToCube(grid.getOffset(waypoints.at(-1)));
    previous = grid.offsetToCube(grid.getOffset(waypoints.at(-2)));
    last = grid.offsetToCube(grid.getOffset(waypoints.at(-1)));
  } catch { return unchanged("native-path-failed"); }
  if (![start, end, previous, last].every(cube)) return unchanged("native-path-invalid");
  const attempted = { q: end.q - start.q, r: end.r - start.r, s: end.s - start.s };
  const segment = { q: last.q - previous.q, r: last.r - previous.r, s: last.s - previous.s };
  const next = structuredClone(state);
  const record = { recentMovementIds: [...prior.recentMovementIds, movement.id].slice(-MAX_RECENT),
    recentMovements: [...(prior.recentMovements ?? []), { id: movement.id,
      path: waypoints.map(({ x, y }) => ({ x, y })) }].slice(-MAX_RECENT),
    lastSegment: segment, applications: structuredClone(prior.applications) };
  const instances = new Map(runtime?.canonicalGeneration?.applicationComposition?.instances
    ?.map(instance => [instance.key, instance]) ?? []);
  const instructions = new Map(runtime?.canonicalGeneration?.executionHandoff?.instructions
    ?.filter(item => item.kind === "momentum-effect").map(item => [item.key, item]) ?? []);
  const issues = [];
  const resolve = (intent, source) => {
    const operation = intent.operation;
    if (!battlefieldDynamicsMomentumIntentCanResolve(intent)) {
      return { status: "blocked", reason: "momentum-canonical-input-unresolved" };
    }
    if (!cube(source) && operation.mode !== "stop") return { status: "blocked", reason: "momentum-source-unavailable" };
    let anchor;
    try { anchor = grid.getOffset(waypoints.at(-1)); }
    catch { return { status: "blocked", reason: "momentum-grid-anchor-unavailable" }; }
    return resolveBattlefieldDynamicsMomentumVector(grid, anchor,
      cube(source) ? source : { q: 0, r: 0, s: 0 }, attempted, operation);
  };
  // Pending instructions belong to the next completed movement, and are consumed once.
  for (const [instanceKey, entry] of Object.entries(record.applications)) {
    for (const [instructionKey, contribution] of Object.entries(entry.contributions)) {
      const sourceVelocity = contribution.velocity;
      if (contribution.pending) {
        const pending = contribution.pending;
        delete contribution.pending;
        const source = pending.operation.execution?.stateSource === "current-runtime-state" ? sourceVelocity : prior.lastSegment;
        const resolved = resolve(pending, source);
        if (resolved.status === "ready") {
          contribution.lastResolved = { movementId: movement.id, velocity: resolved.velocity };
          contribution.velocity = pending.operation.execution.lifetime === "until-next-movement" ? resolved.velocity : null;
        } else issues.push({ code: resolved.reason, tokenId: token.id, instanceKey, instructionKey });
      } else contribution.velocity = null; // The previous movement's active velocity has expired.
    }
  }
  for (const intent of Array.isArray(intents) ? intents : []) {
    const instance = instances.get(intent.instanceKey);
    const instruction = instructions.get(intent.instructionKey);
    if (!instance || intent.tokenId !== token.id || intent.sceneId !== state.sceneId
      || intent.movementId !== movement.id || instance.sourceApplicationId !== intent.identity?.sourceApplicationId
      || instance.dynamicId !== intent.identity?.dynamicId || instance.environmentId !== intent.identity?.environmentId
      || instance.physicalContextId !== intent.identity?.physicalContextId
      || instruction?.instanceKey !== intent.instanceKey
      || instruction.adjudication !== intent.adjudication
      || JSON.stringify(instruction.requiredInputs) !== JSON.stringify(intent.requiredInputs)
      || JSON.stringify(instruction?.descriptor?.operation) !== JSON.stringify(intent.operation)) {
      issues.push({ code: "momentum-intent-provenance-invalid", tokenId: token.id, instanceKey: intent.instanceKey });
      continue;
    }
    const identity = identityOf(instance);
    const entry = record.applications[intent.instanceKey] ?? { identity, contributions: {} };
    if (!sameIdentity(entry.identity, identity)) continue;
    const contribution = entry.contributions[intent.instructionKey] ?? { velocity: null };
    if (intent.operation.execution?.timing === "next-movement" && battlefieldDynamicsMomentumIntentCanResolve(intent)) {
      contribution.pending = structuredClone(intent);
    } else if (intent.operation.execution?.timing === "next-movement") {
      issues.push({ code: "momentum-canonical-input-unresolved", tokenId: token.id,
        instanceKey: intent.instanceKey, instructionKey: intent.instructionKey });
    }
    else {
      const previous = prior.applications[intent.instanceKey]?.contributions?.[intent.instructionKey];
      const source = intent.operation.execution?.stateSource === "current-runtime-state" ? previous?.velocity : prior.lastSegment;
      const resolved = resolve(intent, source);
      if (resolved.status === "ready") {
        contribution.lastResolved = { movementId: movement.id, velocity: resolved.velocity };
        contribution.velocity = intent.operation.execution.lifetime === "until-next-movement" ? resolved.velocity : null;
      }
      else issues.push({ code: resolved.reason, tokenId: token.id, instanceKey: intent.instanceKey,
        instructionKey: intent.instructionKey });
    }
    entry.contributions[intent.instructionKey] = contribution;
    record.applications[intent.instanceKey] = entry;
  }
  next.tokens[token.id] = record;
  return { changed: true, reason: "completed-movement", state: next, issues };
}
