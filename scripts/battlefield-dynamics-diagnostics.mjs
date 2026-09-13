import { battlefieldDynamicsReceiverState } from "./battlefield-dynamics-contract.mjs";

export const BATTLEFIELD_DYNAMICS_DIAGNOSTICS_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_DIAGNOSTIC_SEVERITIES = Object.freeze(["info", "warning", "error"]);

const DEFAULT_MODULE_ID = "orphaned-sun-scenes";
const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = value => typeof value === "string" && Boolean(value.trim());

function sceneData(scene) {
  if (!scene) return null;
  if (typeof scene.toObject === "function") return scene.toObject();
  return scene;
}

function sceneId(scene) {
  return scene?.id ?? scene?._id ?? null;
}

function sceneName(scene) {
  return typeof scene?.name === "string" ? scene.name : null;
}

function frozen(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) frozen(item);
  return value;
}

export function createBattlefieldDynamicsDiagnostic({
  code,
  severity = "warning",
  category = "runtime",
  message,
  automaticBlocked = false,
  provenance = {},
  details = {},
} = {}) {
  if (!nonEmpty(code)) throw new Error("Battlefield Dynamics diagnostic code is required.");
  if (!BATTLEFIELD_DYNAMICS_DIAGNOSTIC_SEVERITIES.includes(severity)) {
    throw new Error(`Battlefield Dynamics diagnostic severity ${String(severity)} is unsupported.`);
  }
  if (!nonEmpty(category)) throw new Error("Battlefield Dynamics diagnostic category is required.");
  if (!nonEmpty(message)) throw new Error("Battlefield Dynamics diagnostic message is required.");
  return frozen({
    version: BATTLEFIELD_DYNAMICS_DIAGNOSTICS_VERSION,
    code,
    severity,
    category,
    message,
    automaticBlocked: Boolean(automaticBlocked),
    provenance: isRecord(provenance) ? { ...provenance } : {},
    details: isRecord(details) ? { ...details } : {},
  });
}

function baseProvenance(scene, generation = null) {
  return {
    sceneId: sceneId(scene),
    sceneName: sceneName(scene),
    environmentId: generation?.environmentId ?? null,
  };
}

function instanceProvenance(scene, generation, instance, instruction = null) {
  return {
    ...baseProvenance(scene, generation),
    instanceKey: instance?.key ?? instruction?.instanceKey ?? null,
    physicalContextId: instance?.physicalContextId ?? null,
    dynamicId: instance?.dynamicId ?? null,
    sourceApplicationId: instance?.sourceApplicationId ?? instruction?.sourceApplicationId ?? null,
    instructionKey: instruction?.key ?? null,
    ruleId: instruction?.ruleId ?? null,
    triggerId: instruction?.triggerId ?? null,
    source: instruction?.source ?? null,
    kind: instruction?.kind ?? null,
  };
}

function diagnosticForReceiverFailure(scene, error) {
  return createBattlefieldDynamicsDiagnostic({
    code: "execution-handoff-invalid",
    severity: "error",
    category: "contract",
    message: "Battlefield Dynamics executable metadata is malformed and cannot be interpreted safely.",
    automaticBlocked: true,
    provenance: baseProvenance(scene),
    details: { error: String(error?.message ?? error) },
  });
}

function diagnosticsForInstruction(scene, generation, instance, instruction, { automaticExecutorAvailable }) {
  const diagnostics = [];
  const provenance = instanceProvenance(scene, generation, instance, instruction);
  if (instruction.adjudication === "gm-confirmed") {
    diagnostics.push(createBattlefieldDynamicsDiagnostic({
      code: "instruction-gm-confirmed",
      severity: "warning",
      category: "adjudication",
      message: `Instruction ${instruction.key} requires GM confirmation before execution.`,
      automaticBlocked: true,
      provenance,
      details: { requiredInputs: [...instruction.requiredInputs] },
    }));
  }
  for (const requiredInput of instruction.requiredInputs ?? []) {
    diagnostics.push(createBattlefieldDynamicsDiagnostic({
      code: "required-input-unresolved",
      severity: "warning",
      category: "required-input",
      message: `Instruction ${instruction.key} is missing required runtime input ${requiredInput}.`,
      automaticBlocked: true,
      provenance,
      details: { requiredInput },
    }));
  }
  if (instruction.adjudication === "automatic" && !automaticExecutorAvailable) {
    diagnostics.push(createBattlefieldDynamicsDiagnostic({
      code: "automatic-instruction-executor-pending",
      severity: "info",
      category: "executor",
      message: `Instruction ${instruction.key} is contract-ready for automatic execution, but the Foundry gameplay executor is not implemented yet.`,
      automaticBlocked: true,
      provenance,
      details: { adjudication: instruction.adjudication },
    }));
  }
  return diagnostics;
}

function diagnosticsForIntrinsic(scene, generation, instruction) {
  const intrinsicId = instruction?.semanticDefinition?.id ?? instruction?.key ?? null;
  const provenance = {
    ...baseProvenance(scene, generation),
    instructionKey: instruction?.key ?? null,
    source: "environment-intrinsic",
    intrinsicId,
  };
  return [createBattlefieldDynamicsDiagnostic({
    code: "environment-intrinsic-unresolved",
    severity: "warning",
    category: "environment-intrinsic",
    message: `Environment intrinsic ${String(intrinsicId)} does not yet have executable Foundry runtime semantics.`,
    automaticBlocked: true,
    provenance,
    details: {
      requiredInputs: [...(instruction?.requiredInputs ?? [])],
      semanticDefinition: instruction?.semanticDefinition ?? null,
    },
  })];
}

function diagnosticsForRuntimeRehydration(scene, generation, runtime) {
  const diagnostics = [];
  const rehydration = runtime?.rehydration;
  if (!isRecord(rehydration)) return diagnostics;
  if (rehydration.persistedStatus === "invalid") {
    diagnostics.push(createBattlefieldDynamicsDiagnostic({
      code: "runtime-store-reset",
      severity: "warning",
      category: "persistence",
      message: "Persisted Battlefield Dynamics runtime state was invalid or belonged to another Scene and was reset from canonical initialization.",
      provenance: baseProvenance(scene, generation),
      details: {
        initializedApplicationCount: rehydration.initializedApplicationCount ?? 0,
      },
    }));
  }
  if ((rehydration.staleApplicationCount ?? 0) > 0) {
    diagnostics.push(createBattlefieldDynamicsDiagnostic({
      code: "runtime-stale-applications-pruned",
      severity: "warning",
      category: "persistence",
      message: `${rehydration.staleApplicationCount} stale Battlefield Dynamics runtime application entr${rehydration.staleApplicationCount === 1 ? "y was" : "ies were"} pruned during rehydration.`,
      provenance: baseProvenance(scene, generation),
      details: { staleApplicationCount: rehydration.staleApplicationCount },
    }));
  }
  if (rehydration.persistedStatus === "valid" && (rehydration.initializedApplicationCount ?? 0) > 0) {
    diagnostics.push(createBattlefieldDynamicsDiagnostic({
      code: "runtime-applications-reinitialized",
      severity: "info",
      category: "persistence",
      message: `${rehydration.initializedApplicationCount} Battlefield Dynamics application entr${rehydration.initializedApplicationCount === 1 ? "y was" : "ies were"} initialized from current canonical state because no compatible persisted state existed.`,
      provenance: baseProvenance(scene, generation),
      details: { initializedApplicationCount: rehydration.initializedApplicationCount },
    }));
  }
  return diagnostics;
}

export function collectBattlefieldDynamicsSceneDiagnostics(scene, runtime = null, {
  moduleId = DEFAULT_MODULE_ID,
  automaticExecutorAvailable = false,
} = {}) {
  let receiver;
  try {
    receiver = battlefieldDynamicsReceiverState(sceneData(scene), moduleId);
  } catch (error) {
    return [diagnosticForReceiverFailure(scene, error)];
  }

  if (receiver.status === "absent") return [];
  if (receiver.status === "legacy-semantic-only") {
    return [createBattlefieldDynamicsDiagnostic({
      code: "legacy-semantic-only",
      severity: "warning",
      category: "contract",
      message: "This Scene contains legacy semantic-only Battlefield Dynamics metadata and cannot participate in executable runtime automation.",
      automaticBlocked: true,
      provenance: baseProvenance(scene, receiver.generation),
    })];
  }

  const generation = receiver.generation;
  const handoff = receiver.handoff;
  const instances = new Map((generation?.applicationComposition?.instances ?? []).map(instance => [instance.key, instance]));
  const diagnostics = [];

  for (const instruction of handoff?.instructions ?? []) {
    diagnostics.push(...diagnosticsForInstruction(scene, generation, instances.get(instruction.instanceKey), instruction, { automaticExecutorAvailable }));
  }
  for (const instruction of handoff?.environmentIntrinsicInstructions ?? []) {
    diagnostics.push(...diagnosticsForIntrinsic(scene, generation, instruction));
  }
  diagnostics.push(...diagnosticsForRuntimeRehydration(scene, generation, runtime));
  return diagnostics;
}

export function diagnoseBattlefieldDynamicsSocketFailure(message, error) {
  const provenance = {
    sceneId: isRecord(message) && nonEmpty(message.sceneId) ? message.sceneId : null,
    messageType: isRecord(message) ? message.type ?? null : null,
  };
  if (!isRecord(message)) {
    return createBattlefieldDynamicsDiagnostic({
      code: "socket-message-invalid",
      severity: "warning",
      category: "socket",
      message: "A Battlefield Dynamics socket message was rejected because it was not an object.",
      automaticBlocked: true,
      provenance,
      details: { error: String(error?.message ?? error) },
    });
  }
  if (message.version !== 1) {
    return createBattlefieldDynamicsDiagnostic({
      code: "socket-version-unsupported",
      severity: "warning",
      category: "socket",
      message: `Battlefield Dynamics socket version ${String(message.version)} is unsupported by this runtime.`,
      automaticBlocked: true,
      provenance,
      details: { receivedVersion: message.version, supportedVersion: 1 },
    });
  }
  return createBattlefieldDynamicsDiagnostic({
    code: "socket-message-unsupported",
    severity: "warning",
    category: "socket",
    message: `Battlefield Dynamics socket message type ${String(message.type)} is unsupported by the current runtime phase.`,
    automaticBlocked: true,
    provenance,
    details: { error: String(error?.message ?? error) },
  });
}

export function summarizeBattlefieldDynamicsDiagnostics(diagnostics) {
  const list = Array.isArray(diagnostics) ? diagnostics : [];
  const severityCounts = { info: 0, warning: 0, error: 0 };
  let automaticBlockedCount = 0;
  for (const diagnostic of list) {
    if (diagnostic?.severity in severityCounts) severityCounts[diagnostic.severity] += 1;
    if (diagnostic?.automaticBlocked) automaticBlockedCount += 1;
  }
  return Object.freeze({
    total: list.length,
    severityCounts: Object.freeze(severityCounts),
    automaticBlockedCount,
  });
}

export class BattlefieldDynamicsDiagnosticsRegistry {
  constructor({ maxEvents = 100 } = {}) {
    this.maxEvents = Number.isInteger(maxEvents) && maxEvents > 0 ? maxEvents : 100;
    this.sceneDiagnostics = new Map();
    this.events = [];
  }

  replaceScene(sceneIdValue, diagnostics) {
    if (!nonEmpty(sceneIdValue)) return [];
    const list = Array.isArray(diagnostics) ? [...diagnostics] : [];
    this.sceneDiagnostics.set(sceneIdValue, list);
    return list;
  }

  clearScene(sceneIdValue) {
    if (!nonEmpty(sceneIdValue)) return false;
    const removedDerived = this.sceneDiagnostics.delete(sceneIdValue);
    const beforeEvents = this.events.length;
    this.events = this.events.filter(diagnostic => diagnostic?.provenance?.sceneId !== sceneIdValue);
    return removedDerived || this.events.length !== beforeEvents;
  }

  recordEvent(diagnostic) {
    if (!isRecord(diagnostic) || !nonEmpty(diagnostic.code)) throw new Error("Battlefield Dynamics event diagnostic is invalid.");
    this.events.push(diagnostic);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    return diagnostic;
  }

  forScene(sceneIdValue) {
    const derived = nonEmpty(sceneIdValue) ? this.sceneDiagnostics.get(sceneIdValue) ?? [] : [];
    const events = this.events.filter(diagnostic => diagnostic?.provenance?.sceneId === sceneIdValue);
    return [...derived, ...events];
  }

  list() {
    return [
      ...Array.from(this.sceneDiagnostics.values()).flat(),
      ...this.events,
    ];
  }

  summary() {
    return summarizeBattlefieldDynamicsDiagnostics(this.list());
  }
}
