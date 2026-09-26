export const BATTLEFIELD_DYNAMICS_MOMENTUM_INTENT_VERSION = 1;
const MODES = new Set(["preserve", "stop", "redirect", "bias"]);

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
  const unresolved = ["state-lifetime", "application-timing"];
  if (["preserve", "redirect", "bias"].includes(operation.mode)) unresolved.push("momentum-state-source");
  if (["redirect", "bias"].includes(operation.mode)) unresolved.push("vector-resolution");
  if (operation.mode === "bias") unresolved.push("bias-strength");
  const intent = {
    version: BATTLEFIELD_DYNAMICS_MOMENTUM_INTENT_VERSION,
    sceneId: scene.id, tokenId: token.id, movementId: event.movementId,
    instructionKey: instruction.key, instanceKey: instance.key, triggerKind: event.triggerKind,
    identity: { ...event.identity }, operation: structuredClone(operation),
    adjudication: instruction.adjudication, requiredInputs: [...(instruction.requiredInputs ?? [])],
    unresolved,
  };
  return { intent, issues: [diagnostic("momentum-execution-unresolved",
    `Detected ${operation.mode} momentum for ${instance.dynamicId} (${instance.sourceApplicationId}); GM must resolve ${unresolved.join(", ")} before execution.`,
    scene, event, { mode: operation.mode, unresolved, operation: intent.operation })] };
}
