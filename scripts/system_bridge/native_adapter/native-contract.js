/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-contract.js
 */

/**
 * @file
 * @path main/native_adapter/native-contract.js
 * @module native-contract
 * @layer native-adapter-contract
 * @responsibility define-stable-frame-conn-facing-contracts-for-native-lancer-integration
 * @public-boundary true
 * @side-effects none
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by native_adapter/*
 * - consumed by execution_transaction/*
 * - consumed by semantic_execution_context/*
 * - consumed by resource_service/*
 * - consumed by actor_owned_feature_registry/*
 * - consumed indirectly by runtime-orchestrator.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature-contract.js remains the higher-level Frame Conn feature/action contract
 * - feature-registry.js and feature-registry-core.js remain feature-definition registries
 * - runtime-orchestrator.js remains the high-level runtime coordinator
 * - foundry-integration-feature.js remains existing integration code until migrated/delegated
 *
 * THIS FILE DOES NOT OWN:
 * - native Lancer API calls
 * - Foundry document mutation
 * - action economy
 * - resource consumption policy
 * - targeting legality
 * - movement legality
 * - lifecycle expiration
 * - semantic event dispatch
 * - feature-specific execution strategies
 *
 * EDIT CONTRACT:
 * - keep contracts independent of current Lancer implementation internals
 * - preserve stable Frame Conn-facing shapes
 * - do not import Foundry or Lancer runtime modules
 * - do not perform document resolution or mutation
 */

/* ============================================================
   CONTRACT CONSTANTS
   ============================================================ */

/**
 * @section contract-constants
 * @purpose define-normalized-values-shared-across-native-adapter-boundary
 */

export const NATIVE_EXECUTION_STATUS = Object.freeze({
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
  BLOCKED: "blocked",
  PARTIAL: "partial"
});

export const NATIVE_EXECUTION_KIND = Object.freeze({
  WEAPON_ATTACK: "weapon-attack",
  TECH_ATTACK: "tech-attack",
  BASIC_ATTACK: "basic-attack",
  ACTIVATION: "activation",
  SYSTEM_USE: "system-use",
  CORE_POWER: "core-power",
  STAT_ROLL: "stat-roll",
  TRIGGER_ROLL: "trigger-roll",
  SAVE: "save",
  DAMAGE: "damage",
  STATUS_MUTATION: "status-mutation",
  RESOURCE_MUTATION: "resource-mutation",
  DOCUMENT_MUTATION: "document-mutation"
});

export const NATIVE_ACTOR_KIND = Object.freeze({
  PILOT: "pilot",
  MECH: "mech",
  NPC: "npc",
  DEPLOYABLE: "deployable",
  OTHER: "other"
});

export const NATIVE_ITEM_KIND = Object.freeze({
  MECH_WEAPON: "mech-weapon",
  PILOT_WEAPON: "pilot-weapon",
  MECH_SYSTEM: "mech-system",
  WEAPON_MOD: "weapon-mod",
  FRAME: "frame",
  TALENT: "talent",
  CORE_BONUS: "core-bonus",
  PILOT_TRIGGER: "pilot-trigger",
  DEPLOYABLE: "deployable",
  OTHER: "other"
});

export const NATIVE_ROLL_KIND = Object.freeze({
  ATTACK: "attack",
  TECH_ATTACK: "tech-attack",
  CHECK: "check",
  SAVE: "save",
  DAMAGE: "damage",
  D20: "d20"
});

export const NATIVE_ROLL_OUTCOME = Object.freeze({
  HIT: "hit",
  MISS: "miss",
  CRIT: "crit",
  SUCCESS: "success",
  FAILURE: "failure",
  NONE: "none"
});

export const NATIVE_RESOURCE_KIND = Object.freeze({
  LIMITED: "limited",
  COUNTER: "counter",
  CORE_ENERGY: "core-energy",
  LOADED: "loaded",
  CASCADING: "cascading",
  OTHER: "other"
});

/* ============================================================
   SHARED VALIDATION HELPERS
   ============================================================ */

/**
 * @section shared-validation-helpers
 * @purpose validate-contract-values-without-native-runtime-dependencies
 */

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function optionalString(value) {
  return value == null || typeof value === "string";
}

function requiredString(value) {
  return typeof value === "string" && value.length > 0;
}

function optionalNumber(value) {
  return value == null || Number.isFinite(value);
}

function optionalBoolean(value) {
  return value == null || typeof value === "boolean";
}

function isEnumValue(enumObject, value) {
  return Object.values(enumObject).includes(value);
}

/* ============================================================
   DOCUMENT REFERENCES
   ============================================================ */

/**
 * @section document-references
 * @purpose provide-stable-identities-without-leaking-native-document-shapes
 */

/**
 * Create a normalized actor reference.
 *
 * Native adapter implementations may attach the resolved Foundry
 * document to `native`, but higher layers should prefer UUID/kind.
 */
export function createNativeActorReference({
  uuid,
  id = null,
  name = null,
  kind = NATIVE_ACTOR_KIND.OTHER,
  native = null
} = {}) {
  if (!requiredString(uuid)) {
    throw new TypeError(
      "createNativeActorReference requires a non-empty uuid."
    );
  }

  if (!isEnumValue(NATIVE_ACTOR_KIND, kind)) {
    throw new TypeError(
      `Invalid native actor kind: ${String(kind)}`
    );
  }

  return Object.freeze({
    uuid,
    id,
    name,
    kind,
    native
  });
}

/**
 * Create a normalized item reference.
 */
export function createNativeItemReference({
  uuid,
  id = null,
  actorUuid = null,
  name = null,
  kind = NATIVE_ITEM_KIND.OTHER,
  lid = null,
  native = null
} = {}) {
  if (!requiredString(uuid)) {
    throw new TypeError(
      "createNativeItemReference requires a non-empty uuid."
    );
  }

  if (!isEnumValue(NATIVE_ITEM_KIND, kind)) {
    throw new TypeError(
      `Invalid native item kind: ${String(kind)}`
    );
  }

  return Object.freeze({
    uuid,
    id,
    actorUuid,
    name,
    kind,
    lid,
    native
  });
}

/* ============================================================
   ACTOR CONTEXT
   ============================================================ */

/**
 * @section actor-context
 * @purpose preserve-pilot-mech-source-relationships-across-execution
 */

/**
 * Normalized actor context.
 *
 * `actor`:
 *   immediate mechanical actor executing the operation.
 *
 * `pilot`:
 *   associated Pilot actor when relevant.
 *
 * `mech`:
 *   associated Mech actor when relevant.
 *
 * This context intentionally does not determine controller mode.
 * NHP controller state belongs to higher Frame Conn runtime.
 */
export function createNativeActorContext({
  actor,
  pilot = null,
  mech = null
} = {}) {
  if (!actor) {
    throw new TypeError(
      "createNativeActorContext requires actor."
    );
  }

  return Object.freeze({
    actor,
    pilot,
    mech
  });
}

/* ============================================================
   ACTION REFERENCES
   ============================================================ */

/**
 * @section action-references
 * @purpose identify-structured-native-actions-without-copying-actiondata
 */

export function createNativeActionReference({
  sourceItemUuid,
  path,
  name = null,
  activation = null,
  frequency = null,
  native = null
} = {}) {
  if (!requiredString(sourceItemUuid)) {
    throw new TypeError(
      "createNativeActionReference requires sourceItemUuid."
    );
  }

  if (!requiredString(path)) {
    throw new TypeError(
      "createNativeActionReference requires path."
    );
  }

  return Object.freeze({
    sourceItemUuid,
    path,
    name,
    activation,
    frequency,
    native
  });
}

/* ============================================================
   TARGET REFERENCES
   ============================================================ */

/**
 * @section target-references
 * @purpose normalize-character-target-identities-and-selection-context
 */

export function createNativeTargetReference({
  actorUuid,
  tokenUuid = null,
  sceneId = null,
  name = null,
  nativeActor = null,
  nativeToken = null
} = {}) {
  if (!requiredString(actorUuid)) {
    throw new TypeError(
      "createNativeTargetReference requires actorUuid."
    );
  }

  return Object.freeze({
    actorUuid,
    tokenUuid,
    sceneId,
    name,
    nativeActor,
    nativeToken
  });
}

/* ============================================================
   MOUNT / SLOT REFERENCES
   ============================================================ */

/**
 * @section mount-references
 * @purpose preserve-native-loadout-context-even-though-native-mounts-have-no-uuid
 */

/**
 * Native mounts are nested mech loadout data and do not have stable UUIDs.
 *
 * A Frame Conn mount reference therefore preserves:
 * - owning mech UUID;
 * - current mount index;
 * - type/bracing snapshot;
 * - installed weapon UUID signature.
 *
 * Persistent configuration services must revalidate this reference after
 * loadout changes. This contract does not perform that reconciliation.
 */
export function createNativeMountReference({
  mechUuid,
  mountIndex,
  mountType = null,
  bracing = false,
  weaponUuids = [],
  fittingSizes = []
} = {}) {
  if (!requiredString(mechUuid)) {
    throw new TypeError(
      "createNativeMountReference requires mechUuid."
    );
  }

  if (!Number.isInteger(mountIndex) || mountIndex < 0) {
    throw new TypeError(
      "createNativeMountReference requires non-negative integer mountIndex."
    );
  }

  if (!Array.isArray(weaponUuids)) {
    throw new TypeError(
      "weaponUuids must be an array."
    );
  }

  if (!Array.isArray(fittingSizes)) {
    throw new TypeError(
      "fittingSizes must be an array."
    );
  }

  return Object.freeze({
    mechUuid,
    mountIndex,
    mountType,
    bracing: Boolean(bracing),
    weaponUuids: Object.freeze([...weaponUuids]),
    fittingSizes: Object.freeze([...fittingSizes])
  });
}

export function createNativeMountSlotReference({
  mount,
  slotIndex,
  weaponUuid = null,
  modUuid = null,
  fittingSize = null
} = {}) {
  if (!mount) {
    throw new TypeError(
      "createNativeMountSlotReference requires mount."
    );
  }

  if (!Number.isInteger(slotIndex) || slotIndex < 0) {
    throw new TypeError(
      "createNativeMountSlotReference requires non-negative integer slotIndex."
    );
  }

  return Object.freeze({
    mount,
    slotIndex,
    weaponUuid,
    modUuid,
    fittingSize
  });
}

/* ============================================================
   WEAPON EXECUTION CONTEXT
   ============================================================ */

/**
 * @section weapon-execution-context
 * @purpose preserve-mount-profile-mod-and-parent-action-context-around-native-weapon-flow
 */

export function createNativeWeaponExecutionContext({
  actorContext,
  weapon,
  profileIndex = null,
  profileName = null,
  mount = null,
  slot = null,
  parentAction = null,
  targets = [],
  executionFlags = {}
} = {}) {
  if (!actorContext) {
    throw new TypeError(
      "createNativeWeaponExecutionContext requires actorContext."
    );
  }

  if (!weapon) {
    throw new TypeError(
      "createNativeWeaponExecutionContext requires weapon."
    );
  }

  if (!Array.isArray(targets)) {
    throw new TypeError(
      "targets must be an array."
    );
  }

  if (!isPlainObject(executionFlags)) {
    throw new TypeError(
      "executionFlags must be an object."
    );
  }

  return Object.freeze({
    actorContext,
    weapon,
    profileIndex,
    profileName,
    mount,
    slot,
    parentAction,
    targets: Object.freeze([...targets]),
    executionFlags: Object.freeze({
      ...executionFlags
    })
  });
}

/* ============================================================
   ROLL RESULTS
   ============================================================ */

/**
 * @section roll-results
 * @purpose normalize-native-roll-results-for-semantic-events-and-parent-orchestration
 */

export function createNativeRollResult({
  kind,
  total = null,
  natural = null,
  outcome = NATIVE_ROLL_OUTCOME.NONE,
  critical = false,
  targetUuid = null,
  sourceActorUuid = null,
  sourceItemUuid = null,
  raw = null
} = {}) {
  if (!isEnumValue(NATIVE_ROLL_KIND, kind)) {
    throw new TypeError(
      `Invalid native roll kind: ${String(kind)}`
    );
  }

  if (!isEnumValue(NATIVE_ROLL_OUTCOME, outcome)) {
    throw new TypeError(
      `Invalid native roll outcome: ${String(outcome)}`
    );
  }

  if (!optionalNumber(total)) {
    throw new TypeError(
      "Native roll total must be numeric or null."
    );
  }

  if (!optionalNumber(natural)) {
    throw new TypeError(
      "Native roll natural value must be numeric or null."
    );
  }

  return Object.freeze({
    kind,
    total,
    natural,
    outcome,
    critical: Boolean(critical),
    targetUuid,
    sourceActorUuid,
    sourceItemUuid,
    raw
  });
}

/* ============================================================
   ATTACK RESULTS
   ============================================================ */

/**
 * @section attack-results
 * @purpose expose-per-target-attack-results-without-leaking-flow-state
 */

export function createNativeAttackTargetResult({
  target,
  roll,
  hit = false,
  crit = false,
  raw = null
} = {}) {
  if (!target) {
    throw new TypeError(
      "createNativeAttackTargetResult requires target."
    );
  }

  return Object.freeze({
    target,
    roll,
    hit: Boolean(hit),
    crit: Boolean(crit),
    raw
  });
}

export function createNativeAttackResult({
  attackType = null,
  sourceActorUuid,
  sourceItemUuid = null,
  targets = [],
  raw = null
} = {}) {
  if (!requiredString(sourceActorUuid)) {
    throw new TypeError(
      "createNativeAttackResult requires sourceActorUuid."
    );
  }

  if (!Array.isArray(targets)) {
    throw new TypeError(
      "createNativeAttackResult targets must be an array."
    );
  }

  return Object.freeze({
    attackType,
    sourceActorUuid,
    sourceItemUuid,
    targets: Object.freeze([...targets]),
    raw
  });
}

/* ============================================================
   SAVE / CHECK RESULTS
   ============================================================ */

/**
 * @section save-check-results
 * @purpose support-jockey-system-effects-and-triggered-features
 */

export function createNativeCheckResult({
  actorUuid,
  stat = null,
  triggerItemUuid = null,
  roll,
  succeeded = null,
  raw = null
} = {}) {
  if (!requiredString(actorUuid)) {
    throw new TypeError(
      "createNativeCheckResult requires actorUuid."
    );
  }

  return Object.freeze({
    actorUuid,
    stat,
    triggerItemUuid,
    roll,
    succeeded,
    raw
  });
}

export function createNativeSaveResult({
  actorUuid,
  saveType,
  saveTarget = null,
  roll,
  succeeded,
  sourceActorUuid = null,
  sourceItemUuid = null,
  raw = null
} = {}) {
  if (!requiredString(actorUuid)) {
    throw new TypeError(
      "createNativeSaveResult requires actorUuid."
    );
  }

  if (!requiredString(saveType)) {
    throw new TypeError(
      "createNativeSaveResult requires saveType."
    );
  }

  return Object.freeze({
    actorUuid,
    saveType,
    saveTarget,
    roll,
    succeeded: Boolean(succeeded),
    sourceActorUuid,
    sourceItemUuid,
    raw
  });
}

/* ============================================================
   RESOURCE REFERENCES
   ============================================================ */

/**
 * @section resource-references
 * @purpose expose-native-resource-location-to-resource-service-without-owning-spend-policy
 */

export function createNativeResourceReference({
  kind,
  actorUuid,
  itemUuid = null,
  path = null,
  resourceKey = null,
  current = null,
  max = null,
  nativeConsumption = false,
  native = null
} = {}) {
  if (!isEnumValue(NATIVE_RESOURCE_KIND, kind)) {
    throw new TypeError(
      `Invalid native resource kind: ${String(kind)}`
    );
  }

  if (!requiredString(actorUuid)) {
    throw new TypeError(
      "createNativeResourceReference requires actorUuid."
    );
  }

  if (!optionalNumber(current)) {
    throw new TypeError(
      "Resource current must be numeric or null."
    );
  }

  if (!optionalNumber(max)) {
    throw new TypeError(
      "Resource max must be numeric or null."
    );
  }

  return Object.freeze({
    kind,
    actorUuid,
    itemUuid,
    path,
    resourceKey,
    current,
    max,
    nativeConsumption: Boolean(nativeConsumption),
    native
  });
}

/* ============================================================
   DOCUMENT MUTATION RESULT
   ============================================================ */

/**
 * @section mutation-results
 * @purpose normalize-native-document-write-results-for-transactions
 */

export function createNativeMutationResult({
  succeeded,
  documentUuid = null,
  changedPaths = [],
  previous = null,
  current = null,
  raw = null
} = {}) {
  if (!Array.isArray(changedPaths)) {
    throw new TypeError(
      "changedPaths must be an array."
    );
  }

  return Object.freeze({
    succeeded: Boolean(succeeded),
    documentUuid,
    changedPaths: Object.freeze([...changedPaths]),
    previous,
    current,
    raw
  });
}

/* ============================================================
   EXECUTION RESULT
   ============================================================ */

/**
 * @section execution-result
 * @purpose define-the-main-return-contract-for-native-adapter-execution
 */

/**
 * All native execution wrappers should resolve to this shape.
 *
 * `nativeFlow` is descriptive metadata only.
 * Higher layers must not use it as a runtime API.
 *
 * `result` may contain:
 * - NativeAttackResult
 * - NativeRollResult
 * - NativeCheckResult
 * - NativeSaveResult
 * - NativeMutationResult
 * - another normalized native-contract payload
 */
export function createNativeExecutionResult({
  status,
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  nativeFlow = null,
  result = null,
  chatMessageUuid = null,
  error = null,
  raw = null
} = {}) {
  if (!isEnumValue(NATIVE_EXECUTION_STATUS, status)) {
    throw new TypeError(
      `Invalid native execution status: ${String(status)}`
    );
  }

  if (!isEnumValue(NATIVE_EXECUTION_KIND, kind)) {
    throw new TypeError(
      `Invalid native execution kind: ${String(kind)}`
    );
  }

  return Object.freeze({
    status,
    kind,
    actorUuid,
    itemUuid,
    actionPath,
    nativeFlow,
    result,
    chatMessageUuid,
    error,
    raw
  });
}

/* ============================================================
   EXECUTION RESULT HELPERS
   ============================================================ */

/**
 * @section execution-result-helpers
 * @purpose standardize-common-result-construction
 */

export function nativeExecutionSucceeded({
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  nativeFlow = null,
  result = null,
  chatMessageUuid = null,
  raw = null
} = {}) {
  return createNativeExecutionResult({
    status: NATIVE_EXECUTION_STATUS.SUCCEEDED,
    kind,
    actorUuid,
    itemUuid,
    actionPath,
    nativeFlow,
    result,
    chatMessageUuid,
    raw
  });
}

export function nativeExecutionBlocked({
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  nativeFlow = null,
  error = null,
  raw = null
} = {}) {
  return createNativeExecutionResult({
    status: NATIVE_EXECUTION_STATUS.BLOCKED,
    kind,
    actorUuid,
    itemUuid,
    actionPath,
    nativeFlow,
    error,
    raw
  });
}

export function nativeExecutionCancelled({
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  nativeFlow = null,
  result = null,
  raw = null
} = {}) {
  return createNativeExecutionResult({
    status: NATIVE_EXECUTION_STATUS.CANCELLED,
    kind,
    actorUuid,
    itemUuid,
    actionPath,
    nativeFlow,
    result,
    raw
  });
}

export function nativeExecutionFailed({
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  nativeFlow = null,
  error,
  raw = null
} = {}) {
  return createNativeExecutionResult({
    status: NATIVE_EXECUTION_STATUS.FAILED,
    kind,
    actorUuid,
    itemUuid,
    actionPath,
    nativeFlow,
    error,
    raw
  });
}

/* ============================================================
   EXECUTION STATUS PREDICATES
   ============================================================ */

/**
 * @section execution-status-predicates
 * @purpose keep-transaction-code-from-comparing-status-strings-directly
 */

export function didNativeExecutionSucceed(result) {
  return (
    result?.status ===
    NATIVE_EXECUTION_STATUS.SUCCEEDED
  );
}

export function wasNativeExecutionBlocked(result) {
  return (
    result?.status ===
    NATIVE_EXECUTION_STATUS.BLOCKED
  );
}

export function wasNativeExecutionCancelled(result) {
  return (
    result?.status ===
    NATIVE_EXECUTION_STATUS.CANCELLED
  );
}

export function didNativeExecutionFail(result) {
  return (
    result?.status ===
    NATIVE_EXECUTION_STATUS.FAILED
  );
}

/* ============================================================
   CONTRACT ASSERTIONS
   ============================================================ */

/**
 * @section contract-assertions
 * @purpose provide-lightweight-boundary-validation-for-adapter-development
 */

export function assertNativeExecutionResult(value) {
  if (!isPlainObject(value)) {
    throw new TypeError(
      "Expected NativeExecutionResult object."
    );
  }

  if (
    !isEnumValue(
      NATIVE_EXECUTION_STATUS,
      value.status
    )
  ) {
    throw new TypeError(
      "NativeExecutionResult has invalid status."
    );
  }

  if (
    !isEnumValue(
      NATIVE_EXECUTION_KIND,
      value.kind
    )
  ) {
    throw new TypeError(
      "NativeExecutionResult has invalid kind."
    );
  }

  return value;
}

export function assertNativeActorReference(value) {
  if (!isPlainObject(value) || !requiredString(value.uuid)) {
    throw new TypeError(
      "Expected NativeActorReference."
    );
  }

  return value;
}

export function assertNativeItemReference(value) {
  if (!isPlainObject(value) || !requiredString(value.uuid)) {
    throw new TypeError(
      "Expected NativeItemReference."
    );
  }

  return value;
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature-contract.js
 * -------------------
 * Higher-level semantic feature/action definitions remain there.
 *
 * native-contract.js does not replace feature-contract.js.
 *
 * Expected relationship:
 *
 * feature-contract action
 * → semantic execution context
 * → execution transaction
 * → native adapter
 * → native-contract execution result
 *
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 * Continue to define/register Frame Conn-visible features.
 *
 * Native references created here may be attached to runtime-discovered
 * registry entries, but this file does not perform registry discovery.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Remains high-level runtime composition/orchestration.
 *
 * It should eventually depend on execution_transaction rather than
 * reaching into native Lancer APIs directly.
 *
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing native/Foundry integration code should be migrated behind
 * native_adapter incrementally.
 *
 * Do not break current behavior merely to centralize it.
 *
 *
 * feature_actions/
 * ----------------
 * Existing action definitions remain semantic feature code.
 *
 * They should consume normalized native-adapter execution capabilities
 * rather than import native Lancer Flow internals directly.
 *
 *
 * feature_turn/
 * -------------
 * Existing turn functionality remains above:
 *
 * - action_economy/
 * - resource_service/
 * - lifecycle_service/
 *
 * This contract provides only native references/results needed by those
 * services.
 *
 *
 * feature_movement/
 * -----------------
 * Existing movement tracking remains authoritative for actual movement
 * expenditure.
 *
 * Native actor/token references from this contract may be consumed by
 * later movement/spatial/pathfinding services.
 *
 *
 * UI
 * --
 * UI code should not depend on native Flow state.
 *
 * UI should receive:
 *
 * semantic feature state
 * +
 * normalized execution/resource results
 *
 * rather than arbitrary Foundry/Lancer objects.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Native runtime objects may enter the adapter through `native`/`raw`,
 * but higher Frame Conn layers should prefer normalized fields.
 *
 * INVARIANT 2
 * This file contains no Foundry or Lancer imports.
 *
 * INVARIANT 3
 * This file performs no document mutation.
 *
 * INVARIANT 4
 * This file defines no tabletop action legality.
 *
 * INVARIANT 5
 * Native mount references are explicitly revalidation-sensitive because
 * native mounts have no stable UUID.
 *
 * INVARIANT 6
 * Native item/actor UUIDs remain preferred persistent identities.
 *
 * INVARIANT 7
 * NativeExecutionResult is the common result boundary for all native
 * execution adapters.
 *
 * INVARIANT 8
 * Cancellation, blocking, failure, and success remain distinct so
 * execution_transaction/resource_service can commit correctly.
 *
 * INVARIANT 9
 * Raw native state is escape-hatch/debug data, not the primary public API.
 *
 * INVARIANT 10
 * Missing Lancer mechanics belong above this contract in Frame Conn
 * runtime/orchestration services, not inside native-contract.js.
 */