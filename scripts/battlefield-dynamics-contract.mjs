export const BATTLEFIELD_DYNAMICS_HANDOFF_VERSION = 1;
export const BATTLEFIELD_DYNAMICS_MOMENTUM_EXECUTION = Object.freeze({
  requiredFields: ["stateSource", "timing", "lifetime", "resolutionLaw"],
  coordinateFrame: "native-hex-cube-displacement",
  authoredVector: "odd-row-offset-from-token-anchor-converted-to-cube",
  velocityState: "token-scoped-signed-cube-displacement-per-movement",
  incomingMovement: "prior-completed-movement-segment-cube-displacement",
  thrust: "attempted-movement-cube-displacement",
  composition: "resultant-velocity=mode-velocity+attempted-movement-cube-displacement",
  oppositeThrust: "signed-vector-addition-reduces-opposing-component",
  preserve: "mode-velocity=source-velocity",
  stop: "mode-velocity=zero-offset",
  redirect: "mode-velocity=authored-exact-cube-displacement-of-equal-native-hex-length",
  bias: "mode-velocity=source-velocity+authored-exact-cube-displacement",
  biasRequiresStrengthHex: true,
  unsupported: "gm-confirmed-never-inferred",
  incomplete: "gm-confirmed-never-inferred",
});
export const BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY = Object.freeze({
  coordinateFrame: "odd-row-offset-hex",
  tokenAnchor: "top-left-occupied-grid-space",
  hexOffset: "exact-target-offset-from-token-anchor",
  distanceHex: "native-grid-hex-distance-between-anchor-and-target",
  mismatch: "gm-confirmed-never-inferred",
  unresolvedVector: "gm-confirmed-never-inferred",
  fractionalDistance: "gm-confirmed-never-inferred",
});

export const BATTLEFIELD_DYNAMICS_REQUIRED_INPUTS = Object.freeze([
  "support-target",
  "effect-operation",
  "scheduled-cadence",
  "interaction-definition",
  "state-transition-condition",
  "explicit-random-resolution",
  "environment-intrinsic-execution",
]);

export const BATTLEFIELD_DYNAMICS_TRIGGER_KINDS = Object.freeze([
  "continuous",
  "on-enter",
  "on-exit",
  "on-move-through",
  "turn-start",
  "turn-end",
  "round-start",
  "round-end",
  "interaction",
  "scheduled-cycle",
  "state-transition",
]);

export const BATTLEFIELD_DYNAMICS_GENERATION_KINDS = Object.freeze([
  "support-geometry",
  "support-zone",
  "support-route",
  "support-transition",
  "support-anchor",
  "support-state-marker",
]);

export const BATTLEFIELD_DYNAMICS_EFFECT_KINDS = Object.freeze([
  "movement-cost",
  "forced-movement",
  "positioning-modifier",
  "route-access",
  "adjacency-override",
  "line-of-sight-modifier",
  "cover-modifier",
  "visibility-modifier",
  "elevation-modifier",
  "gravity-effect",
  "pressure-effect",
  "momentum-effect",
  "collision-effect",
  "hazard-effect",
  "damage-effect",
  "terrain-state-change",
  "object-state-change",
  "timing-window",
]);

const REQUIRED_INPUT_SET = new Set(BATTLEFIELD_DYNAMICS_REQUIRED_INPUTS);
const TRIGGER_KIND_SET = new Set(BATTLEFIELD_DYNAMICS_TRIGGER_KINDS);
const GENERATION_KIND_SET = new Set(BATTLEFIELD_DYNAMICS_GENERATION_KINDS);
const EFFECT_KIND_SET = new Set(BATTLEFIELD_DYNAMICS_EFFECT_KINDS);
const ADJUDICATIONS = new Set(["automatic", "gm-confirmed"]);

const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonEmpty = value => typeof value === "string" && Boolean(value.trim());
const finite = value => typeof value === "number" && Number.isFinite(value);
const nonNegative = value => finite(value) && value >= 0;
const positive = value => finite(value) && value > 0;

function fail(message) {
  throw new Error(`Battlefield Dynamics execution handoff invalid: ${message}`);
}

function assertRecord(value, label) {
  if (!isRecord(value)) fail(`${label} must be an object.`);
  return value;
}

function assertNonEmpty(value, label) {
  if (!nonEmpty(value)) fail(`${label} must be a non-empty string.`);
}

function assertBoolean(value, expected, label) {
  if (value !== expected) fail(`${label} must be ${expected}.`);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function assertCadence(value, label) {
  const cadence = assertRecord(value, label);
  if (cadence.unit !== "turn" && cadence.unit !== "round") fail(`${label}.unit must be turn or round.`);
  if (!Number.isInteger(cadence.interval) || cadence.interval < 1) fail(`${label}.interval must be a positive integer.`);
  if (cadence.phase !== "start" && cadence.phase !== "end") fail(`${label}.phase must be start or end.`);
}

function assertVector(value, label) {
  const vector = assertRecord(value, label);
  if (vector.kind === "hex-offset") {
    if (!Number.isInteger(vector.deltaCol) || !Number.isInteger(vector.deltaRow) || (vector.deltaCol === 0 && vector.deltaRow === 0)) {
      fail(`${label} hex-offset requires non-zero integer deltas.`);
    }
    return;
  }
  if (["movement-vector", "toward-support", "away-from-support"].includes(vector.kind)) return;
  if (vector.kind === "reference" && nonEmpty(vector.referenceId)) return;
  fail(`${label} has an unsupported vector kind.`);
}

function assertDamage(value, label) {
  const damage = assertRecord(value, label);
  assertNonEmpty(damage.formula, `${label}.formula`);
  if (damage.damageType !== undefined) assertNonEmpty(damage.damageType, `${label}.damageType`);
}

function assertCell(value, label) {
  const cell = assertRecord(value, label);
  if (!Number.isInteger(cell.col) || !Number.isInteger(cell.row)) fail(`${label} requires integer col and row.`);
}

export function assertBattlefieldDynamicsSupportTarget(value, label = "support target") {
  const target = assertRecord(value, label);
  if (target.kind === "source-application") return target;
  if (target.kind === "cell-references") {
    if (!Array.isArray(target.cells) || !target.cells.length) fail(`${label}.cells must be non-empty.`);
    target.cells.forEach((cell, index) => assertCell(cell, `${label}.cells[${index}]`));
    return target;
  }
  if (target.kind === "transition-references") {
    if (!Array.isArray(target.transitionIds) || !target.transitionIds.length || target.transitionIds.some(id => !nonEmpty(id))) fail(`${label}.transitionIds must be non-empty strings.`);
    return target;
  }
  if (target.kind === "element-references") {
    if (!Array.isArray(target.elementIds) || !target.elementIds.length || target.elementIds.some(id => !nonEmpty(id))) fail(`${label}.elementIds must be non-empty strings.`);
    return target;
  }
  if (target.kind === "endpoint-links") {
    if (!Array.isArray(target.links) || !target.links.length) fail(`${label}.links must be non-empty.`);
    target.links.forEach((raw, index) => {
      const link = assertRecord(raw, `${label}.links[${index}]`);
      if (typeof link.bidirectional !== "boolean") fail(`${label}.links[${index}].bidirectional must be boolean.`);
      for (const [side, endpoint] of [["from", link.from], ["to", link.to]]) {
        const item = assertRecord(endpoint, `${label}.links[${index}].${side}`);
        if (item.kind === "cell") assertCell(item.cell, `${label}.links[${index}].${side}.cell`);
        else if (item.kind === "element") assertNonEmpty(item.elementId, `${label}.links[${index}].${side}.elementId`);
        else fail(`${label}.links[${index}].${side} has an unsupported endpoint kind.`);
      }
    });
    return target;
  }
  fail(`${label} has an unsupported kind.`);
}

function assertEffectTarget(value, label) {
  const target = assertRecord(value, label);
  if (target.kind === "source-application") return;
  if (target.kind === "support-reference") {
    assertNonEmpty(target.supportId, `${label}.supportId`);
    return;
  }
  fail(`${label} must be source-application or support-reference.`);
}

export function assertBattlefieldDynamicsOperation(value, expectedKind = null, label = "operation") {
  const operation = assertRecord(value, label);
  if (!EFFECT_KIND_SET.has(operation.kind)) fail(`${label}.kind ${String(operation.kind)} is not registered.`);
  if (expectedKind && operation.kind !== expectedKind) fail(`${label}.kind must match instruction kind ${expectedKind}.`);
  switch (operation.kind) {
    case "movement-cost":
      if (!["additive", "multiplier"].includes(operation.mode) || !nonNegative(operation.value)) fail(`${label} requires additive/multiplier and a non-negative value.`);
      break;
    case "forced-movement":
      if (!positive(operation.distanceHex)) fail(`${label}.distanceHex must be positive.`);
      assertVector(operation.vector, `${label}.vector`);
      break;
    case "positioning-modifier":
      if (!finite(operation.value)) fail(`${label}.value must be numeric.`);
      if (operation.label !== undefined) assertNonEmpty(operation.label, `${label}.label`);
      break;
    case "route-access":
      if (!["open", "closed"].includes(operation.access)) fail(`${label}.access must be open or closed.`);
      if (operation.traversalCostHex !== undefined && !nonNegative(operation.traversalCostHex)) fail(`${label}.traversalCostHex must be non-negative.`);
      break;
    case "adjacency-override":
      if (!["add", "remove"].includes(operation.operation) || typeof operation.bidirectional !== "boolean") fail(`${label} requires add/remove and explicit bidirectionality.`);
      if (operation.traversalCostHex !== undefined && !nonNegative(operation.traversalCostHex)) fail(`${label}.traversalCostHex must be non-negative.`);
      break;
    case "line-of-sight-modifier":
      if (!["allow", "block", "penalty"].includes(operation.mode)) fail(`${label}.mode is invalid.`);
      if (operation.mode === "penalty" && !finite(operation.value)) fail(`${label}.value must be numeric for penalty mode.`);
      break;
    case "cover-modifier":
      if (!["none", "soft", "hard"].includes(operation.level)) fail(`${label}.level is invalid.`);
      if (operation.value !== undefined && !finite(operation.value)) fail(`${label}.value must be numeric when supplied.`);
      break;
    case "visibility-modifier":
      if (!["clear", "concealed", "hidden", "penalty"].includes(operation.mode)) fail(`${label}.mode is invalid.`);
      if (operation.mode === "penalty" && !finite(operation.value)) fail(`${label}.value must be numeric for penalty mode.`);
      break;
    case "elevation-modifier":
      if (!["set", "delta", "suppress-advantage"].includes(operation.mode)) fail(`${label}.mode is invalid.`);
      if (operation.mode !== "suppress-advantage" && !finite(operation.value)) fail(`${label}.value must be numeric for set/delta.`);
      break;
    case "gravity-effect":
      if (!["zero-g", "vector"].includes(operation.mode)) fail(`${label}.mode is invalid.`);
      if (operation.mode === "vector") {
        assertVector(operation.vector, `${label}.vector`);
        if (!positive(operation.strength)) fail(`${label}.strength must be positive for vector gravity.`);
      }
      break;
    case "pressure-effect":
      assertNonEmpty(operation.stateId, `${label}.stateId`);
      break;
    case "momentum-effect":
      if (!["preserve", "stop", "redirect", "bias"].includes(operation.mode)) fail(`${label}.mode is invalid.`);
      if (["redirect", "bias"].includes(operation.mode) && !operation.vector) fail(`${label}.vector is required for ${operation.mode}.`);
      if (operation.vector) assertVector(operation.vector, `${label}.vector`);
      if (operation.distanceHex !== undefined && !nonNegative(operation.distanceHex)) fail(`${label}.distanceHex must be non-negative.`);
      if (operation.execution !== undefined) {
        const execution = assertRecord(operation.execution, `${label}.execution`);
        if (!["incoming-movement", "current-runtime-state"].includes(execution.stateSource)) fail(`${label}.execution.stateSource is invalid.`);
        if (!["on-trigger", "next-movement"].includes(execution.timing)) fail(`${label}.execution.timing is invalid.`);
        if (!["single-resolution", "until-next-movement"].includes(execution.lifetime)) fail(`${label}.execution.lifetime is invalid.`);
        if (execution.resolutionLaw !== "hex-vector-addition") fail(`${label}.execution.resolutionLaw is invalid.`);
        if (["redirect", "bias"].includes(operation.mode) && operation.vector?.kind !== "hex-offset") fail(`${label}.vector requires an exact hex offset for automatic momentum.`);
        if (operation.mode === "bias" && !positive(execution.biasStrengthHex)) fail(`${label}.execution.biasStrengthHex must be positive.`);
        if (execution.biasStrengthHex !== undefined && !positive(execution.biasStrengthHex)) fail(`${label}.execution.biasStrengthHex must be positive.`);
      }
      break;
    case "collision-effect":
      if (!["stop", "damage", "displace"].includes(operation.response)) fail(`${label}.response is invalid.`);
      if (operation.response === "damage") assertDamage(operation.damage, `${label}.damage`);
      if (operation.response === "displace") {
        if (!positive(operation.distanceHex)) fail(`${label}.distanceHex must be positive for displacement.`);
        assertVector(operation.vector, `${label}.vector`);
      }
      break;
    case "hazard-effect":
      if (!["notify", "condition", "damage"].includes(operation.response)) fail(`${label}.response is invalid.`);
      if (operation.response === "condition") assertNonEmpty(operation.conditionId, `${label}.conditionId`);
      if (operation.response === "damage") assertDamage(operation.damage, `${label}.damage`);
      break;
    case "damage-effect":
      assertDamage(operation.damage, `${label}.damage`);
      break;
    case "terrain-state-change":
    case "object-state-change":
      assertNonEmpty(operation.from, `${label}.from`);
      assertNonEmpty(operation.to, `${label}.to`);
      if (operation.from === operation.to) fail(`${label}.from and .to must differ.`);
      break;
    case "timing-window":
      assertCadence(operation.cadence, `${label}.cadence`);
      if (operation.activeStateId !== undefined) assertNonEmpty(operation.activeStateId, `${label}.activeStateId`);
      break;
  }
  return operation;
}

function assertTrigger(value, label) {
  if (value === null) return;
  const trigger = assertRecord(value, label);
  assertNonEmpty(trigger.id, `${label}.id`);
  if (!TRIGGER_KIND_SET.has(trigger.kind)) fail(`${label}.kind ${String(trigger.kind)} is not registered.`);
  if (!["deterministic", "explicit-random"].includes(trigger.resolution)) fail(`${label}.resolution is invalid.`);
  assertRecord(trigger.parameters, `${label}.parameters`);
  if (trigger.execution === null) return;
  const execution = assertRecord(trigger.execution, `${label}.execution`);
  if (!ADJUDICATIONS.has(execution.adjudication)) fail(`${label}.execution.adjudication is invalid.`);
  if (execution.kind !== trigger.kind || !["interaction", "scheduled-cycle", "state-transition"].includes(execution.kind)) fail(`${label}.execution kind does not match an executable trigger kind.`);
  if (execution.kind === "interaction") assertNonEmpty(execution.interactionId, `${label}.execution.interactionId`);
  if (execution.kind === "scheduled-cycle") assertCadence(execution.cadence, `${label}.execution.cadence`);
  if (execution.kind === "state-transition") {
    assertNonEmpty(execution.transitionId, `${label}.execution.transitionId`);
    assertNonEmpty(execution.conditionId, `${label}.execution.conditionId`);
  }
  if (execution.randomSourceId !== undefined) assertNonEmpty(execution.randomSourceId, `${label}.execution.randomSourceId`);
  if (trigger.resolution === "explicit-random" && !nonEmpty(execution.randomSourceId)) fail(`${label}.execution.randomSourceId is required for explicit-random resolution.`);
}

function assertRequiredInputs(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array.`);
  const seen = new Set();
  for (const input of value) {
    if (!REQUIRED_INPUT_SET.has(input)) fail(`${label} contains unknown requirement ${String(input)}.`);
    if (seen.has(input)) fail(`${label} contains duplicate requirement ${input}.`);
    seen.add(input);
  }
}

function assertContract(value) {
  const contract = assertRecord(value, "contract");
  if (contract.version !== BATTLEFIELD_DYNAMICS_HANDOFF_VERSION) fail(`contract.version must be ${BATTLEFIELD_DYNAMICS_HANDOFF_VERSION}.`);
  if (contract.ownership !== "system-neutral-downstream-execution-handoff") fail("contract.ownership is unsupported.");
  if (contract.unresolvedPolicy !== "gm-confirmed-never-inferred") fail("contract.unresolvedPolicy is unsupported.");
  if (contract.supportAuthority !== "canonical-source-geometry-references-only") fail("contract.supportAuthority is unsupported.");
  if (!Array.isArray(contract.automaticExecutionRequires) || !sameJson(contract.automaticExecutionRequires, ["validated-effect-operation", "resolved-support-target", "executable-trigger"])) fail("contract.automaticExecutionRequires does not match v1.");
  assertBoolean(contract.dynamicApplicationGeometryPersisted, false, "contract.dynamicApplicationGeometryPersisted");
  assertBoolean(contract.preservesApplicationIdentity, true, "contract.preservesApplicationIdentity");
  assertBoolean(contract.preservesExactSpatialMembership, true, "contract.preservesExactSpatialMembership");
  assertBoolean(contract.preservesIndependentRuleContributions, true, "contract.preservesIndependentRuleContributions");
  if (contract.forcedMovementGeometry !== undefined && !sameJson(contract.forcedMovementGeometry, BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY)) fail("contract.forcedMovementGeometry is unsupported.");
  if (contract.momentumExecution !== undefined && !sameJson(contract.momentumExecution, BATTLEFIELD_DYNAMICS_MOMENTUM_EXECUTION)) fail("contract.momentumExecution is unsupported.");
  assertBoolean(contract.ownsMutableRuntimeState, false, "contract.ownsMutableRuntimeState");
  assertBoolean(contract.ownsSitrepSemantics, false, "contract.ownsSitrepSemantics");
  assertBoolean(contract.ownsFoundryBehaviorAutomation, false, "contract.ownsFoundryBehaviorAutomation");
  assertBoolean(contract.mayMoveCanonicalGeometry, false, "contract.mayMoveCanonicalGeometry");
}

function assertRuleRegistries(generation) {
  const registries = assertRecord(generation.ruleRegistries, "ruleRegistries");
  if (!sameJson(registries.triggerKinds, BATTLEFIELD_DYNAMICS_TRIGGER_KINDS)) fail("ruleRegistries.triggerKinds does not match the v1 trigger vocabulary.");
  if (!sameJson(registries.generationRuleKinds, BATTLEFIELD_DYNAMICS_GENERATION_KINDS)) fail("ruleRegistries.generationRuleKinds does not match the v1 generation vocabulary.");
  if (!sameJson(registries.effectRuleKinds, BATTLEFIELD_DYNAMICS_EFFECT_KINDS)) fail("ruleRegistries.effectRuleKinds does not match the v1 effect vocabulary.");
}

function instanceIndex(generation) {
  const composition = assertRecord(generation.applicationComposition, "applicationComposition");
  if (!sameJson(composition.instanceIdentity, ["environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"])) fail("applicationComposition.instanceIdentity is unsupported.");
  if (!Array.isArray(composition.instances)) fail("applicationComposition.instances must be an array.");
  const byKey = new Map();
  for (const [index, raw] of composition.instances.entries()) {
    const instance = assertRecord(raw, `applicationComposition.instances[${index}]`);
    for (const field of ["key", "environmentId", "physicalContextId", "dynamicId", "sourceApplicationId"]) assertNonEmpty(instance[field], `applicationComposition.instances[${index}].${field}`);
    if (byKey.has(instance.key)) fail(`applicationComposition.instances contains duplicate key ${instance.key}.`);
    byKey.set(instance.key, instance);
  }
  return byKey;
}

function assertInstruction(raw, index, byInstance) {
  const instruction = assertRecord(raw, `instructions[${index}]`);
  assertNonEmpty(instruction.key, `instructions[${index}].key`);
  assertNonEmpty(instruction.instanceKey, `instructions[${index}].instanceKey`);
  assertNonEmpty(instruction.sourceApplicationId, `instructions[${index}].sourceApplicationId`);
  assertNonEmpty(instruction.ruleId, `instructions[${index}].ruleId`);
  if (!ADJUDICATIONS.has(instruction.adjudication)) fail(`instructions[${index}].adjudication is invalid.`);
  if (instruction.source !== "generation" && instruction.source !== "effect") fail(`instructions[${index}].source must be generation or effect.`);
  const instance = byInstance.get(instruction.instanceKey);
  if (!instance) fail(`instructions[${index}] references unknown instanceKey ${instruction.instanceKey}.`);
  if (instance.sourceApplicationId !== instruction.sourceApplicationId) fail(`instructions[${index}] sourceApplicationId does not match its application instance.`);
  assertRecord(instruction.semanticParameters, `instructions[${index}].semanticParameters`);
  assertRecord(instruction.sourceScopeCeiling, `instructions[${index}].sourceScopeCeiling`);
  assertRequiredInputs(instruction.requiredInputs, `instructions[${index}].requiredInputs`);
  if (instruction.adjudication === "automatic" && instruction.requiredInputs.length) fail(`instructions[${index}] cannot be automatic with unresolved requiredInputs.`);

  if (instruction.source === "generation") {
    if (!GENERATION_KIND_SET.has(instruction.kind)) fail(`instructions[${index}].kind ${String(instruction.kind)} is not a registered generation kind.`);
    if (instruction.triggerId !== null || instruction.trigger !== null) fail(`instructions[${index}] generation instruction may not carry a trigger.`);
    if (instruction.descriptor === null) {
      if (instruction.resolvedSupport !== null) fail(`instructions[${index}] cannot resolve support without a descriptor.`);
    } else {
      const descriptor = assertRecord(instruction.descriptor, `instructions[${index}].descriptor`);
      if (!ADJUDICATIONS.has(descriptor.adjudication)) fail(`instructions[${index}].descriptor.adjudication is invalid.`);
      assertNonEmpty(descriptor.supportId, `instructions[${index}].descriptor.supportId`);
      assertBattlefieldDynamicsSupportTarget(descriptor.target, `instructions[${index}].descriptor.target`);
      assertBattlefieldDynamicsSupportTarget(instruction.resolvedSupport, `instructions[${index}].resolvedSupport`);
      if (!sameJson(descriptor.target, instruction.resolvedSupport)) fail(`instructions[${index}].resolvedSupport must equal descriptor.target.`);
    }
    return instruction;
  }

  if (!EFFECT_KIND_SET.has(instruction.kind)) fail(`instructions[${index}].kind ${String(instruction.kind)} is not a registered effect kind.`);
  if (instruction.descriptor === null) {
    if (instruction.resolvedSupport !== null) fail(`instructions[${index}] cannot resolve support without an effect descriptor.`);
  } else {
    const descriptor = assertRecord(instruction.descriptor, `instructions[${index}].descriptor`);
    if (!ADJUDICATIONS.has(descriptor.adjudication)) fail(`instructions[${index}].descriptor.adjudication is invalid.`);
    assertEffectTarget(descriptor.target, `instructions[${index}].descriptor.target`);
    assertBattlefieldDynamicsOperation(descriptor.operation, instruction.kind, `instructions[${index}].descriptor.operation`);
    if (instruction.resolvedSupport !== null) assertBattlefieldDynamicsSupportTarget(instruction.resolvedSupport, `instructions[${index}].resolvedSupport`);
    if (descriptor.target.kind === "source-application" && !sameJson(instruction.resolvedSupport, { kind: "source-application" })) fail(`instructions[${index}] source-application target must resolve to source-application support.`);
  }
  assertTrigger(instruction.trigger, `instructions[${index}].trigger`);
  if (instruction.triggerId === null && instruction.trigger !== null) fail(`instructions[${index}] has trigger data without triggerId.`);
  if (instruction.triggerId !== null) {
    assertNonEmpty(instruction.triggerId, `instructions[${index}].triggerId`);
    if (!instruction.trigger || instruction.trigger.id !== instruction.triggerId) fail(`instructions[${index}] triggerId does not match trigger.id.`);
  }
  return instruction;
}

function assertEnvironmentIntrinsicInstruction(raw, index) {
  const instruction = assertRecord(raw, `environmentIntrinsicInstructions[${index}]`);
  assertNonEmpty(instruction.key, `environmentIntrinsicInstructions[${index}].key`);
  if (instruction.source !== "environment-intrinsic") fail(`environmentIntrinsicInstructions[${index}].source must be environment-intrinsic.`);
  if (!isRecord(instruction.semanticDefinition)) fail(`environmentIntrinsicInstructions[${index}].semanticDefinition must be an object.`);
  if (!sameJson(instruction.requiredInputs, ["environment-intrinsic-execution"])) fail(`environmentIntrinsicInstructions[${index}].requiredInputs must contain only environment-intrinsic-execution.`);
  if (instruction.adjudication !== "gm-confirmed") fail(`environmentIntrinsicInstructions[${index}] must be gm-confirmed.`);
}

export function assertBattlefieldDynamicsExecutionHandoff(generation) {
  const snapshot = assertRecord(generation, "battlefieldDynamicsGeneration");
  const handoff = assertRecord(snapshot.executionHandoff, "executionHandoff");
  assertContract(handoff.contract);
  assertRuleRegistries(snapshot);
  const byInstance = instanceIndex(snapshot);
  if (!Array.isArray(handoff.instructions)) fail("executionHandoff.instructions must be an array.");
  if (!Array.isArray(handoff.environmentIntrinsicInstructions)) fail("executionHandoff.environmentIntrinsicInstructions must be an array.");
  const keys = new Set();
  const instructions = handoff.instructions.map((raw, index) => {
    const instruction = assertInstruction(raw, index, byInstance);
    if (keys.has(instruction.key)) fail(`executionHandoff.instructions contains duplicate key ${instruction.key}.`);
    keys.add(instruction.key);
    return instruction;
  });
  if (instructions.some(instruction => instruction.kind === "forced-movement" && instruction.adjudication === "automatic")
    && !sameJson(handoff.contract.forcedMovementGeometry, BATTLEFIELD_DYNAMICS_FORCED_MOVEMENT_GEOMETRY)) {
    fail("contract.forcedMovementGeometry is missing or unsupported for automatic forced movement.");
  }
  handoff.environmentIntrinsicInstructions.forEach(assertEnvironmentIntrinsicInstruction);
  const automatic = instructions.filter(instruction => instruction.adjudication === "automatic").length;
  const gmConfirmed = instructions.length - automatic + handoff.environmentIntrinsicInstructions.length;
  if (handoff.automaticInstructionCount !== automatic) fail("executionHandoff.automaticInstructionCount is inconsistent.");
  if (handoff.gmConfirmedInstructionCount !== gmConfirmed) fail("executionHandoff.gmConfirmedInstructionCount is inconsistent.");
  const expectedStatus = gmConfirmed ? "gm-confirmation-required" : "automatic-ready";
  if (handoff.implementationStatus !== expectedStatus) fail(`executionHandoff.implementationStatus must be ${expectedStatus}.`);
  assertBoolean(handoff.mutableRuntimeStateResolved, false, "executionHandoff.mutableRuntimeStateResolved");
  assertBoolean(handoff.sitrepResolved, false, "executionHandoff.sitrepResolved");
  assertBoolean(handoff.foundryBehaviorAutomationResolved, false, "executionHandoff.foundryBehaviorAutomationResolved");
  return handoff;
}

export function battlefieldDynamicsReceiverState(sceneData, moduleId = "orphaned-sun-scenes") {
  if (!isRecord(sceneData)) return { status: "absent", generation: null, handoff: null };
  const flags = isRecord(sceneData.flags) ? sceneData.flags : null;
  const moduleFlags = flags && isRecord(flags[moduleId]) ? flags[moduleId] : null;
  const generation = moduleFlags && isRecord(moduleFlags.battlefieldDynamicsGeneration) ? moduleFlags.battlefieldDynamicsGeneration : null;
  if (!generation) return { status: "absent", generation: null, handoff: null };
  if (generation.executionHandoff === undefined || generation.executionHandoff === null) {
    return { status: "legacy-semantic-only", generation, handoff: null };
  }
  const handoff = assertBattlefieldDynamicsExecutionHandoff(generation);
  return { status: "executable-v1", generation, handoff };
}

export function assertBattlefieldDynamicsSceneData(sceneData, moduleId = "orphaned-sun-scenes") {
  return battlefieldDynamicsReceiverState(sceneData, moduleId);
}
