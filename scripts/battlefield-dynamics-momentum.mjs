import { BATTLEFIELD_DYNAMICS_MOMENTUM_EXECUTION } from "./battlefield-dynamics-contract.mjs";

export const BATTLEFIELD_DYNAMICS_MOMENTUM_INTENT_VERSION = 1;
const MODES = new Set(["preserve", "stop", "redirect", "bias"]);
const cube = value => value && [value.q, value.r, value.s].every(Number.isInteger)
  && value.q + value.r + value.s === 0;
const add = (a, b) => ({ q: a.q + b.q, r: a.r + b.r, s: a.s + b.s });
const subtract = (a, b) => ({ q: a.q - b.q, r: a.r - b.r, s: a.s - b.s });
const length = value => Math.max(Math.abs(value.q), Math.abs(value.r), Math.abs(value.s));

/** Native grid conversion keeps signed vector composition valid across odd-row parity. */
export function resolveBattlefieldDynamicsMomentumVector(grid, anchor, source, attempted, operation) {
  if (!cube(source) || !cube(attempted) || !["preserve", "stop", "redirect", "bias"].includes(operation?.mode)) {
    return { status: "blocked", reason: "momentum-vector-unavailable" };
  }
  let modeVelocity = source;
  if (operation.mode === "stop") modeVelocity = { q: 0, r: 0, s: 0 };
  if (["redirect", "bias"].includes(operation.mode)) {
    if (!grid || typeof grid.offsetToCube !== "function" || !Number.isInteger(anchor?.i) || !Number.isInteger(anchor?.j)
      || operation.vector?.kind !== "hex-offset" || !Number.isInteger(operation.vector.deltaCol)
      || !Number.isInteger(operation.vector.deltaRow)) return { status: "blocked", reason: "momentum-authored-vector-unavailable" };
    let from, to;
    try {
      from = grid.offsetToCube(anchor);
      to = grid.offsetToCube({ i: anchor.i + operation.vector.deltaRow, j: anchor.j + operation.vector.deltaCol });
    } catch { return { status: "blocked", reason: "momentum-grid-conversion-failed" }; }
    if (!cube(from) || !cube(to)) return { status: "blocked", reason: "momentum-grid-conversion-invalid" };
    const authored = subtract(to, from);
    if (operation.mode === "redirect") {
      if (length(authored) !== length(source)) return { status: "blocked", reason: "momentum-redirect-length-mismatch" };
      modeVelocity = authored;
    } else {
      if (length(authored) !== operation.execution?.biasStrengthHex) return { status: "blocked", reason: "momentum-bias-strength-mismatch" };
      modeVelocity = add(source, authored);
    }
  }
  return { status: "ready", velocity: add(modeVelocity, attempted) };
}

function diagnostic(code, message, scene, event, details = {}) {
  return { code, category: "momentum", severity: "warning", automaticBlocked: true, message,
    provenance: { sceneId: scene?.id, tokenId: event?.tokenId, instructionKey: event?.instructionKey,
      instanceKey: event?.instanceKey, ...event?.identity }, details };
}

/** Preserve the authored operation and exact application identity; do not infer motion. */
export function normalizeBattlefieldDynamicsMomentum(scene, runtime, token, event) {
  const blocked = (code, message) => ({ intent: null, issues: [diagnostic(code, message, scene, event)] });
  if (runtime?.status !== "active" || runtime.sceneId !== scene?.id || event?.sceneId !== scene?.id
    || token?.parent !== scene || token.id !== event?.tokenId || !event?.movementId) {
    return blocked("momentum-runtime-stale", "Momentum event no longer matches its Scene and token.");
  }
  const generation = runtime.canonicalGeneration;
  const instruction = generation.executionHandoff?.instructions?.find(item => item.key === event.instructionKey);
  const instance = generation.applicationComposition?.instances?.find(item => item.key === event.instanceKey);
  if (!instruction || !instance || instruction.kind !== "momentum-effect" || instruction.source !== "effect"
    || instruction.instanceKey !== instance.key || instruction.sourceApplicationId !== instance.sourceApplicationId
    || instruction.trigger?.kind !== event.triggerKind || instruction.triggerId !== event.triggerId
    || instance.environmentId !== event.identity?.environmentId || instance.physicalContextId !== event.identity?.physicalContextId
    || instance.dynamicId !== event.identity?.dynamicId || instance.sourceApplicationId !== event.identity?.sourceApplicationId) {
    return blocked("momentum-provenance-invalid", "Momentum event does not match its canonical instruction and source application.");
  }
  const operation = instruction.descriptor?.operation;
  if (operation?.kind !== "momentum-effect" || !MODES.has(operation.mode)) {
    return blocked("momentum-operation-unavailable", "Momentum operation is missing or invalid.");
  }
  const execution = operation.execution;
  const unresolved = [];
  if (JSON.stringify(generation.executionHandoff?.contract?.momentumExecution)
    !== JSON.stringify(BATTLEFIELD_DYNAMICS_MOMENTUM_EXECUTION)) unresolved.push("momentum-execution-contract");
  if (!["incoming-movement", "current-runtime-state"].includes(execution?.stateSource)) unresolved.push("stateSource");
  if (!["on-trigger", "next-movement"].includes(execution?.timing)) unresolved.push("timing");
  if (!["single-resolution", "until-next-movement"].includes(execution?.lifetime)) unresolved.push("lifetime");
  if (execution?.resolutionLaw !== "hex-vector-addition") unresolved.push("resolutionLaw");
  if (operation.mode === "bias" && !(Number.isFinite(execution?.biasStrengthHex) && execution.biasStrengthHex > 0)) unresolved.push("biasStrengthHex");
  if (["redirect", "bias"].includes(operation.mode) && operation.vector?.kind !== "hex-offset") unresolved.push("vector-resolution");
  if (instruction.adjudication !== "automatic" || instruction.requiredInputs?.length) unresolved.push("gm-confirmation");
  // Source velocity and attempted movement are resolved by the movement state coordinator.
  // A typed law alone is never permission to displace a Token from a Region callback.
  unresolved.push("momentum-velocity-state-unavailable");
  const intent = {
    version: BATTLEFIELD_DYNAMICS_MOMENTUM_INTENT_VERSION,
    sceneId: scene.id, tokenId: token.id, movementId: event.movementId,
    instructionKey: instruction.key, instanceKey: instance.key, triggerKind: event.triggerKind,
    identity: { ...event.identity }, operation: structuredClone(operation),
    adjudication: instruction.adjudication, requiredInputs: [...(instruction.requiredInputs ?? [])],
    unresolved: [...new Set(unresolved)],
  };
  return { intent, issues: [diagnostic("momentum-execution-unresolved",
    `Detected ${operation.mode} momentum for ${instance.dynamicId} (${instance.sourceApplicationId}); GM must resolve ${intent.unresolved.join(", ")} before execution.`,
    scene, event, { mode: operation.mode, unresolved: intent.unresolved, operation: intent.operation })] };
}
