/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/resource_service/resource-contract.js
 */

/**
 * @file
 * @path main/resource_service/resource-contract.js
 * @module resource-contract
 * @layer resource-service-contract
 * @responsibility define-stable-frame-conn-resource-descriptors-and-resource-results
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - resource-resolver.js
 * - resource-transaction.js
 * - resource-hooks.js
 * - resource-service.js
 * - semantic_execution_context/*
 * - execution_transaction/*
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - native_adapter/native-resources.js remains native Lancer resource-state
 *   authority
 * - semantic_execution_context/ carries resolved resource descriptors
 * - execution_transaction/ owns validation/execute/commit timing
 * - feature-registry remains existing semantic declaration authority
 * - future feature_runtime_bridge/ may supplement registry entries with
 *   resource declarations absent from the current registry format
 * - future lifecycle_service/ owns reset/expiration scheduling
 *
 * THIS FILE OWNS:
 * - normalized resource kinds
 * - resource authority
 * - resource consumption mode
 * - resource reset scope
 * - resource source identity
 * - resource descriptors
 * - resource requirements
 * - resource snapshots
 * - validation results
 * - mutation results
 * - native verification results
 * - aggregate resource transaction results
 *
 * THIS FILE DOES NOT OWN:
 * - resource discovery
 * - native reads/writes
 * - supplemental persistence
 * - reset scheduling
 * - transaction sequencing
 * - action economy
 * - feature-specific rules
 *
 * EDIT CONTRACT:
 * - no Foundry imports
 * - no Lancer imports
 * - no document mutation
 * - never collapse native Limited state and Frame Conn frequency state
 * - preserve native-vs-frame-conn authority explicitly
 * - preserve native-consumed-vs-deferred distinction explicitly
 */

/* ============================================================
   RESOURCE KIND
   ============================================================ */

/**
 * @section resource-kind
 *
 * Semantic meaning of a resource.
 *
 * Storage authority is separate.
 */

export const RESOURCE_KIND = Object.freeze({
  LIMITED:
    "limited",

  LOADED:
    "loaded",

  CORE_ENERGY:
    "core-energy",

  COUNTER:
    "counter",

  CHARGE:
    "charge",

  FREQUENCY:
    "frequency",

  USE:
    "use",

  REACTION:
    "reaction",

  PREPARED_ACTION:
    "prepared-action",

  ACTIVATION:
    "activation",

  CASCADING:
    "cascading",

  MOVEMENT:
    "movement",

  CUSTOM:
    "custom"
});

/* ============================================================
   RESOURCE AUTHORITY
   ============================================================ */

/**
 * @section resource-authority
 *
 * Where authoritative state lives.
 */

export const RESOURCE_AUTHORITY = Object.freeze({
  NATIVE:
    "native",

  FRAME_CONN:
    "frame-conn",

  DERIVED:
    "derived",

  EXTERNAL:
    "external"
});

/* ============================================================
   RESOURCE CONSUMPTION
   ============================================================ */

/**
 * @section resource-consumption
 *
 * NATIVE
 * Native Lancer Flow owns mutation.
 *
 * DEFERRED
 * Frame Conn validates before execution and spends during transaction
 * commit.
 *
 * IMMEDIATE
 * Frame Conn mechanic intentionally mutates before commit.
 *
 * VERIFY_ONLY
 * Native execution is expected to mutate state; Frame Conn verifies it.
 *
 * NONE
 * Informational or derived resource.
 */

export const RESOURCE_CONSUMPTION = Object.freeze({
  NATIVE:
    "native",

  DEFERRED:
    "deferred",

  IMMEDIATE:
    "immediate",

  VERIFY_ONLY:
    "verify-only",

  NONE:
    "none"
});

/* ============================================================
   RESOURCE RESET SCOPE
   ============================================================ */

/**
 * @section resource-reset-scope
 *
 * lifecycle_service/ will eventually enact these boundaries.
 */

export const RESOURCE_RESET_SCOPE = Object.freeze({
  NEVER:
    "never",

  TURN:
    "turn",

  ROUND:
    "round",

  SCENE:
    "scene",

  MISSION:
    "mission",

  SHORT_REST:
    "short-rest",

  FULL_REPAIR:
    "full-repair",

  RELOAD:
    "reload",

  ACTION:
    "action",

  EVENT:
    "event",

  MANUAL:
    "manual",

  NATIVE:
    "native",

  CUSTOM:
    "custom"
});

/* ============================================================
   RESOURCE SOURCE KIND
   ============================================================ */

/**
 * @section resource-source-kind
 *
 * Semantic owner of the resource.
 */

export const RESOURCE_SOURCE_KIND = Object.freeze({
  UNIVERSAL_ACTION:
    "universal-action",

  FRAME_TRAIT:
    "frame-trait",

  CORE_SYSTEM:
    "core-system",

  TALENT:
    "talent",

  CORE_BONUS:
    "core-bonus",

  MECH_SYSTEM:
    "mech-system",

  MECH_WEAPON:
    "mech-weapon",

  PILOT_WEAPON:
    "pilot-weapon",

  WEAPON_MOD:
    "weapon-mod",

  PILOT_ACTION:
    "pilot-action",

  PILOT_GEAR:
    "pilot-gear",

  NHP:
    "nhp",

  STATUS:
    "status",

  MOVEMENT:
    "movement",

  SUPPLEMENTAL:
    "supplemental",

  UNKNOWN:
    "unknown"
});

/* ============================================================
   RESOURCE REQUIREMENT MODE
   ============================================================ */

/**
 * @section resource-requirement-mode
 */

export const RESOURCE_REQUIREMENT_MODE = Object.freeze({
  AT_LEAST:
    "at-least",

  AT_MOST:
    "at-most",

  EXACT:
    "exact",

  AVAILABLE:
    "available",

  UNAVAILABLE:
    "unavailable",

  TRUE:
    "true",

  FALSE:
    "false",

  CUSTOM:
    "custom"
});

/* ============================================================
   RESOURCE OPERATION
   ============================================================ */

export const RESOURCE_OPERATION = Object.freeze({
  READ:
    "read",

  VALIDATE:
    "validate",

  SPEND:
    "spend",

  RESTORE:
    "restore",

  SET:
    "set",

  INCREMENT:
    "increment",

  DECREMENT:
    "decrement",

  RESET:
    "reset",

  VERIFY:
    "verify"
});

/* ============================================================
   RESOURCE RESULT STATUS
   ============================================================ */

export const RESOURCE_RESULT_STATUS = Object.freeze({
  SUCCEEDED:
    "succeeded",

  INSUFFICIENT:
    "insufficient",

  UNAVAILABLE:
    "unavailable",

  INVALID:
    "invalid",

  SKIPPED:
    "skipped",

  FAILED:
    "failed",

  PARTIAL:
    "partial"
});

/* ============================================================
   RESOURCE VALIDATION STATUS
   ============================================================ */

export const RESOURCE_VALIDATION_STATUS = Object.freeze({
  VALID:
    "valid",

  INVALID:
    "invalid",

  SKIPPED:
    "skipped",

  FAILED:
    "failed"
});

/* ============================================================
   RESOURCE COMMIT STATUS
   ============================================================ */

export const RESOURCE_COMMIT_STATUS = Object.freeze({
  COMMITTED:
    "committed",

  VERIFIED:
    "verified",

  NOTHING_TO_COMMIT:
    "nothing-to-commit",

  PARTIAL:
    "partial",

  FAILED:
    "failed",

  SKIPPED:
    "skipped"
});

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function optionalString(value) {
  return (
    value == null ||
    typeof value === "string"
  );
}

function optionalNumber(value) {
  return (
    value == null ||
    Number.isFinite(value)
  );
}

function isEnumValue(
  enumeration,
  value
) {
  return Object
    .values(enumeration)
    .includes(value);
}

function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}

function freezeObject(value) {
  return Object.freeze({
    ...(isObject(value)
      ? value
      : {})
  });
}

/* ============================================================
   RESOURCE IDENTITY
   ============================================================ */

/**
 * @section resource-identity
 *
 * Stable identity independent from current value.
 */

export function createResourceIdentity({
  id,

  kind,

  authority,

  actorUuid = null,
  itemUuid = null,
  itemLid = null,
  actionPath = null,

  sourceKind =
    RESOURCE_SOURCE_KIND.UNKNOWN,

  sourceFeatureId = null,

  key = null,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Resource identity requires id."
    );
  }

  if (
    !isEnumValue(
      RESOURCE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid resource kind: ${String(kind)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid resource authority: ${String(authority)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_SOURCE_KIND,
      sourceKind
    )
  ) {
    throw new TypeError(
      `Invalid resource source kind: ${String(sourceKind)}`
    );
  }

  return Object.freeze({
    id,

    kind,
    authority,

    actorUuid,
    itemUuid,
    itemLid,
    actionPath,

    sourceKind,
    sourceFeatureId,

    key,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE SNAPSHOT
   ============================================================ */

/**
 * @section resource-snapshot
 *
 * Immutable current resource state.
 *
 * Value may be numeric, boolean, string, or null.
 */

export function createResourceSnapshot({
  identity,

  value = null,

  min = null,
  max = null,

  available = null,

  exists = true,

  raw = null,

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Resource snapshot requires identity."
    );
  }

  if (!optionalNumber(min)) {
    throw new TypeError(
      "Resource snapshot min must be numeric or null."
    );
  }

  if (!optionalNumber(max)) {
    throw new TypeError(
      "Resource snapshot max must be numeric or null."
    );
  }

  return Object.freeze({
    identity,

    value,

    min,
    max,

    available:
      available == null
        ? null
        : Boolean(available),

    exists:
      Boolean(exists),

    raw,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE REQUIREMENT
   ============================================================ */

/**
 * @section resource-requirement
 *
 * Defines what must be true before execution.
 */

export function createResourceRequirement({
  mode =
    RESOURCE_REQUIREMENT_MODE.AVAILABLE,

  amount = null,
  expected = null,

  reason = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      RESOURCE_REQUIREMENT_MODE,
      mode
    )
  ) {
    throw new TypeError(
      `Invalid resource requirement mode: ${String(mode)}`
    );
  }

  if (!optionalNumber(amount)) {
    throw new TypeError(
      "Resource requirement amount must be numeric or null."
    );
  }

  return Object.freeze({
    mode,
    amount,
    expected,
    reason,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE MUTATION
   ============================================================ */

/**
 * @section resource-mutation
 *
 * Describes a requested Frame Conn-owned mutation.
 *
 * It does not perform it.
 */

export function createResourceMutation({
  operation,

  amount = null,
  value = null,

  expectedBefore = null,
  expectedAfter = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      RESOURCE_OPERATION,
      operation
    )
  ) {
    throw new TypeError(
      `Invalid resource operation: ${String(operation)}`
    );
  }

  if (!optionalNumber(amount)) {
    throw new TypeError(
      "Resource mutation amount must be numeric or null."
    );
  }

  return Object.freeze({
    operation,

    amount,
    value,

    expectedBefore,
    expectedAfter,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE DESCRIPTOR
   ============================================================ */

/**
 * @section resource-descriptor
 *
 * Canonical resource definition attached to one semantic execution.
 */

export function createResourceDescriptor({
  identity,

  consumption =
    RESOURCE_CONSUMPTION.NONE,

  resetScope =
    RESOURCE_RESET_SCOPE.NEVER,

  requirement = null,

  mutation = null,

  nativeOperation = null,

  required = true,

  optional = false,

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Resource descriptor requires identity."
    );
  }

  if (
    !isEnumValue(
      RESOURCE_CONSUMPTION,
      consumption
    )
  ) {
    throw new TypeError(
      `Invalid resource consumption mode: ${String(consumption)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_RESET_SCOPE,
      resetScope
    )
  ) {
    throw new TypeError(
      `Invalid resource reset scope: ${String(resetScope)}`
    );
  }

  if (
    nativeOperation != null &&
    !isEnumValue(
      RESOURCE_OPERATION,
      nativeOperation
    )
  ) {
    throw new TypeError(
      `Invalid native resource operation: ${String(nativeOperation)}`
    );
  }

  return Object.freeze({
    identity,

    consumption,
    resetScope,

    requirement,
    mutation,

    nativeOperation,

    required:
      Boolean(required),

    optional:
      Boolean(optional),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE DESCRIPTOR HELPERS
   ============================================================ */

export function isNativeResourceDescriptor(
  descriptor
) {
  return Boolean(
    descriptor
      ?.identity
      ?.authority ===
        RESOURCE_AUTHORITY.NATIVE
  );
}

export function isFrameConnResourceDescriptor(
  descriptor
) {
  return Boolean(
    descriptor
      ?.identity
      ?.authority ===
        RESOURCE_AUTHORITY.FRAME_CONN
  );
}

export function isNativeConsumedResource(
  descriptor
) {
  return Boolean(
    descriptor?.consumption ===
      RESOURCE_CONSUMPTION.NATIVE ||
    descriptor?.consumption ===
      RESOURCE_CONSUMPTION.VERIFY_ONLY
  );
}

export function isDeferredResource(
  descriptor
) {
  return Boolean(
    descriptor?.consumption ===
      RESOURCE_CONSUMPTION.DEFERRED
  );
}

export function isImmediateResource(
  descriptor
) {
  return Boolean(
    descriptor?.consumption ===
      RESOURCE_CONSUMPTION.IMMEDIATE
  );
}

/* ============================================================
   RESOURCE VALIDATION ISSUE
   ============================================================ */

export function createResourceValidationIssue({
  resourceId,
  code,
  message = null,

  expected = null,
  actual = null,

  metadata = {}
} = {}) {
  if (!requiredString(resourceId)) {
    throw new TypeError(
      "Resource validation issue requires resourceId."
    );
  }

  if (!requiredString(code)) {
    throw new TypeError(
      "Resource validation issue requires code."
    );
  }

  return Object.freeze({
    resourceId,
    code,

    message:
      message ?? code,

    expected,
    actual,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   SINGLE RESOURCE VALIDATION RESULT
   ============================================================ */

export function createResourceValidationResult({
  descriptor,

  snapshot = null,

  status =
    RESOURCE_VALIDATION_STATUS.VALID,

  issues = [],

  metadata = {}
} = {}) {
  if (!descriptor) {
    throw new TypeError(
      "Resource validation result requires descriptor."
    );
  }

  if (
    !isEnumValue(
      RESOURCE_VALIDATION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid resource validation status: ${String(status)}`
    );
  }

  return Object.freeze({
    descriptor,
    snapshot,

    status,

    valid:
      status ===
      RESOURCE_VALIDATION_STATUS.VALID,

    issues:
      freezeArray(issues),

    metadata:
      freezeObject(metadata)
  });
}

export function resourceValidationSucceeded(
  options
) {
  return createResourceValidationResult({
    ...options,

    status:
      RESOURCE_VALIDATION_STATUS.VALID
  });
}

export function resourceValidationFailed(
  options
) {
  return createResourceValidationResult({
    ...options,

    status:
      RESOURCE_VALIDATION_STATUS.INVALID
  });
}

export function resourceValidationSkipped(
  options
) {
  return createResourceValidationResult({
    ...options,

    status:
      RESOURCE_VALIDATION_STATUS.SKIPPED
  });
}

/* ============================================================
   AGGREGATE RESOURCE VALIDATION
   ============================================================ */

/**
 * @section aggregate-resource-validation
 */

export function createResourceValidationSummary({
  results = [],

  metadata = {}
} = {}) {
  const normalized =
    freezeArray(results);

  const failed =
    normalized.filter(
      result =>
        result?.status ===
          RESOURCE_VALIDATION_STATUS.INVALID ||
        result?.status ===
          RESOURCE_VALIDATION_STATUS.FAILED
    );

  return Object.freeze({
    valid:
      failed.length === 0,

    results:
      normalized,

    failed:
      Object.freeze(failed),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE OPERATION RESULT
   ============================================================ */

/**
 * @section resource-operation-result
 */

export function createResourceOperationResult({
  descriptor,

  operation,

  status =
    RESOURCE_RESULT_STATUS.SUCCEEDED,

  before = null,
  after = null,

  amount = null,

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (!descriptor) {
    throw new TypeError(
      "Resource operation result requires descriptor."
    );
  }

  if (
    !isEnumValue(
      RESOURCE_OPERATION,
      operation
    )
  ) {
    throw new TypeError(
      `Invalid resource operation: ${String(operation)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_RESULT_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid resource result status: ${String(status)}`
    );
  }

  if (!optionalNumber(amount)) {
    throw new TypeError(
      "Resource operation amount must be numeric or null."
    );
  }

  return Object.freeze({
    descriptor,

    operation,
    status,

    before,
    after,

    amount,

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   NATIVE RESOURCE VERIFICATION RESULT
   ============================================================ */

/**
 * @section native-resource-verification-result
 *
 * Used after native Flow execution to confirm expected native mutation.
 */

export function createNativeResourceVerificationResult({
  descriptor,

  before,
  after,

  verified,

  expectedOperation = null,

  reason = null,

  metadata = {}
} = {}) {
  if (!descriptor) {
    throw new TypeError(
      "Native resource verification requires descriptor."
    );
  }

  return Object.freeze({
    descriptor,

    before,
    after,

    verified:
      Boolean(verified),

    expectedOperation,

    reason,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE TRANSACTION SNAPSHOT
   ============================================================ */

/**
 * @section resource-transaction-snapshot
 *
 * Captures all resources attached to one execution transaction.
 */

export function createResourceTransactionSnapshot({
  executionId,

  descriptors = [],

  before = [],

  validations = [],

  nativeVerifications = [],

  mutations = [],

  after = [],

  metadata = {}
} = {}) {
  if (!requiredString(executionId)) {
    throw new TypeError(
      "Resource transaction snapshot requires executionId."
    );
  }

  return Object.freeze({
    executionId,

    descriptors:
      freezeArray(descriptors),

    before:
      freezeArray(before),

    validations:
      freezeArray(validations),

    nativeVerifications:
      freezeArray(
        nativeVerifications
      ),

    mutations:
      freezeArray(mutations),

    after:
      freezeArray(after),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESOURCE COMMIT RESULT
   ============================================================ */

/**
 * @section resource-commit-result
 */

export function createResourceCommitResult({
  status =
    RESOURCE_COMMIT_STATUS.COMMITTED,

  committed = [],

  verifiedNative = [],

  skipped = [],

  failed = [],

  snapshot = null,

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      RESOURCE_COMMIT_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid resource commit status: ${String(status)}`
    );
  }

  return Object.freeze({
    status,

    committed:
      freezeArray(committed),

    verifiedNative:
      freezeArray(
        verifiedNative
      ),

    skipped:
      freezeArray(skipped),

    failed:
      freezeArray(failed),

    snapshot,

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

export function resourceCommitSucceeded(
  options = {}
) {
  return createResourceCommitResult({
    ...options,

    status:
      RESOURCE_COMMIT_STATUS.COMMITTED
  });
}

export function resourceCommitNothing(
  options = {}
) {
  return createResourceCommitResult({
    ...options,

    status:
      RESOURCE_COMMIT_STATUS.NOTHING_TO_COMMIT
  });
}

export function resourceCommitVerified(
  options = {}
) {
  return createResourceCommitResult({
    ...options,

    status:
      RESOURCE_COMMIT_STATUS.VERIFIED
  });
}

export function resourceCommitPartial(
  options = {}
) {
  return createResourceCommitResult({
    ...options,

    status:
      RESOURCE_COMMIT_STATUS.PARTIAL
  });
}

export function resourceCommitFailed(
  options = {}
) {
  return createResourceCommitResult({
    ...options,

    status:
      RESOURCE_COMMIT_STATUS.FAILED
  });
}

/* ============================================================
   RESOURCE DECLARATION
   ============================================================ */

/**
 * @section resource-declaration
 *
 * Lightweight declarative form intended for:
 *
 * - existing registry augmentation
 * - actor-owned feature augmentation
 * - execution strategy metadata
 *
 * resource-resolver.js converts declarations into full descriptors.
 */

export function createResourceDeclaration({
  id,

  kind,

  authority =
    RESOURCE_AUTHORITY.FRAME_CONN,

  consumption =
    RESOURCE_CONSUMPTION.DEFERRED,

  resetScope =
    RESOURCE_RESET_SCOPE.NEVER,

  sourceKind =
    RESOURCE_SOURCE_KIND.UNKNOWN,

  key = null,

  requirement = null,

  mutation = null,

  nativeOperation = null,

  required = true,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Resource declaration requires id."
    );
  }

  if (
    !isEnumValue(
      RESOURCE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid resource declaration kind: ${String(kind)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid resource declaration authority: ${String(authority)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_CONSUMPTION,
      consumption
    )
  ) {
    throw new TypeError(
      `Invalid resource declaration consumption: ${String(consumption)}`
    );
  }

  if (
    !isEnumValue(
      RESOURCE_RESET_SCOPE,
      resetScope
    )
  ) {
    throw new TypeError(
      `Invalid resource declaration reset scope: ${String(resetScope)}`
    );
  }

  return Object.freeze({
    id,

    kind,
    authority,
    consumption,
    resetScope,

    sourceKind,
    key,

    requirement,
    mutation,

    nativeOperation,

    required:
      Boolean(required),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   COMMON DECLARATION HELPERS
   ============================================================ */

/**
 * @section common-declaration-helpers
 */

export function createLimitedResourceDeclaration({
  id = "limited",
  ...options
} = {}) {
  return createResourceDeclaration({
    ...options,

    id,

    kind:
      RESOURCE_KIND.LIMITED,

    authority:
      RESOURCE_AUTHORITY.NATIVE,

    consumption:
      RESOURCE_CONSUMPTION.NATIVE,

    resetScope:
      RESOURCE_RESET_SCOPE.FULL_REPAIR,

    nativeOperation:
      RESOURCE_OPERATION.SPEND
  });
}

export function createLoadedResourceDeclaration({
  id = "loaded",
  ...options
} = {}) {
  return createResourceDeclaration({
    ...options,

    id,

    kind:
      RESOURCE_KIND.LOADED,

    authority:
      RESOURCE_AUTHORITY.NATIVE,

    consumption:
      RESOURCE_CONSUMPTION.NATIVE,

    resetScope:
      RESOURCE_RESET_SCOPE.RELOAD,

    nativeOperation:
      RESOURCE_OPERATION.SET
  });
}

export function createCoreEnergyResourceDeclaration({
  id = "core-energy",
  ...options
} = {}) {
  return createResourceDeclaration({
    ...options,

    id,

    kind:
      RESOURCE_KIND.CORE_ENERGY,

    authority:
      RESOURCE_AUTHORITY.NATIVE,

    consumption:
      RESOURCE_CONSUMPTION.NATIVE,

    resetScope:
      RESOURCE_RESET_SCOPE.FULL_REPAIR,

    nativeOperation:
      RESOURCE_OPERATION.SPEND
  });
}

export function createCounterResourceDeclaration({
  id,
  ...options
} = {}) {
  return createResourceDeclaration({
    ...options,

    id,

    kind:
      RESOURCE_KIND.COUNTER
  });
}

export function createFrequencyResourceDeclaration({
  id,
  resetScope,
  ...options
} = {}) {
  return createResourceDeclaration({
    ...options,

    id,

    kind:
      RESOURCE_KIND.FREQUENCY,

    authority:
      RESOURCE_AUTHORITY.FRAME_CONN,

    consumption:
      RESOURCE_CONSUMPTION.DEFERRED,

    resetScope
  });
}

/* ============================================================
   RESOURCE COLLECTION
   ============================================================ */

/**
 * @section resource-collection
 *
 * Canonical grouped resource set attached to ExecutionContext.
 */

export function createResourceCollection({
  required = [],
  deferred = [],
  nativeConsumed = [],
  immediate = [],
  informational = [],

  metadata = {}
} = {}) {
  return Object.freeze({
    required:
      freezeArray(required),

    deferred:
      freezeArray(deferred),

    nativeConsumed:
      freezeArray(
        nativeConsumed
      ),

    immediate:
      freezeArray(immediate),

    informational:
      freezeArray(
        informational
      ),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   COLLECTION CLASSIFICATION
   ============================================================ */

export function classifyResourceDescriptors(
  descriptors = []
) {
  const required = [];
  const deferred = [];
  const nativeConsumed = [];
  const immediate = [];
  const informational = [];

  for (
    const descriptor of
      descriptors
  ) {
    if (!descriptor) {
      continue;
    }

    if (descriptor.required) {
      required.push(
        descriptor
      );
    }

    switch (
      descriptor.consumption
    ) {
      case RESOURCE_CONSUMPTION.DEFERRED:
        deferred.push(
          descriptor
        );
        break;

      case RESOURCE_CONSUMPTION.NATIVE:
      case RESOURCE_CONSUMPTION.VERIFY_ONLY:
        nativeConsumed.push(
          descriptor
        );
        break;

      case RESOURCE_CONSUMPTION.IMMEDIATE:
        immediate.push(
          descriptor
        );
        break;

      case RESOURCE_CONSUMPTION.NONE:
      default:
        informational.push(
          descriptor
        );
        break;
    }
  }

  return createResourceCollection({
    required,
    deferred,
    nativeConsumed,
    immediate,
    informational
  });
}

/* ============================================================
   RESOURCE LOOKUP HELPERS
   ============================================================ */

export function getResourceDescriptorById(
  descriptors,
  resourceId
) {
  if (!requiredString(resourceId)) {
    return null;
  }

  return (
    descriptors?.find(
      descriptor =>
        descriptor
          ?.identity
          ?.id ===
        resourceId
    ) ??
    null
  );
}

export function getResourceSnapshotById(
  snapshots,
  resourceId
) {
  if (!requiredString(resourceId)) {
    return null;
  }

  return (
    snapshots?.find(
      snapshot =>
        snapshot
          ?.identity
          ?.id ===
        resourceId
    ) ??
    null
  );
}

/* ============================================================
   REQUIREMENT EVALUATION
   ============================================================ */

/**
 * @section requirement-evaluation
 *
 * Generic requirement semantics only.
 *
 * CUSTOM requirements remain resolver/strategy-owned.
 */

export function evaluateResourceRequirement(
  snapshot,
  requirement
) {
  if (!requirement) {
    return true;
  }

  switch (
    requirement.mode
  ) {
    case RESOURCE_REQUIREMENT_MODE.AVAILABLE:
      return (
        snapshot?.available ===
          true ||
        (
          Number.isFinite(
            snapshot?.value
          ) &&
          snapshot.value > 0
        )
      );

    case RESOURCE_REQUIREMENT_MODE.UNAVAILABLE:
      return (
        snapshot?.available ===
          false ||
        snapshot?.value === 0
      );

    case RESOURCE_REQUIREMENT_MODE.TRUE:
      return (
        snapshot?.value === true
      );

    case RESOURCE_REQUIREMENT_MODE.FALSE:
      return (
        snapshot?.value === false
      );

    case RESOURCE_REQUIREMENT_MODE.AT_LEAST:
      return Boolean(
        Number.isFinite(
          snapshot?.value
        ) &&
        Number.isFinite(
          requirement.amount
        ) &&
        snapshot.value >=
          requirement.amount
      );

    case RESOURCE_REQUIREMENT_MODE.AT_MOST:
      return Boolean(
        Number.isFinite(
          snapshot?.value
        ) &&
        Number.isFinite(
          requirement.amount
        ) &&
        snapshot.value <=
          requirement.amount
      );

    case RESOURCE_REQUIREMENT_MODE.EXACT:
      return (
        snapshot?.value ===
        (
          requirement.expected ??
          requirement.amount
        )
      );

    case RESOURCE_REQUIREMENT_MODE.CUSTOM:
      return null;

    default:
      return false;
  }
}

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

export function validateResourceSnapshot(
  descriptor,
  snapshot
) {
  if (!descriptor) {
    throw new TypeError(
      "validateResourceSnapshot requires descriptor."
    );
  }

  if (!snapshot) {
    return resourceValidationFailed({
      descriptor,

      issues: [
        createResourceValidationIssue({
          resourceId:
            descriptor.identity.id,

          code:
            "resource-state-unavailable",

          message:
            "Resource state could not be resolved."
        })
      ]
    });
  }

  if (
    snapshot.exists === false
  ) {
    return resourceValidationFailed({
      descriptor,
      snapshot,

      issues: [
        createResourceValidationIssue({
          resourceId:
            descriptor.identity.id,

          code:
            "resource-does-not-exist",

          message:
            "Required resource does not exist."
        })
      ]
    });
  }

  if (!descriptor.requirement) {
    return resourceValidationSucceeded({
      descriptor,
      snapshot
    });
  }

  const valid =
    evaluateResourceRequirement(
      snapshot,
      descriptor.requirement
    );

  if (valid == null) {
    return resourceValidationSkipped({
      descriptor,
      snapshot,

      metadata: {
        reason:
          "custom-requirement"
      }
    });
  }

  if (valid) {
    return resourceValidationSucceeded({
      descriptor,
      snapshot
    });
  }

  return resourceValidationFailed({
    descriptor,
    snapshot,

    issues: [
      createResourceValidationIssue({
        resourceId:
          descriptor.identity.id,

        code:
          "resource-requirement-not-met",

        message:
          descriptor
            .requirement
            .reason ??
          "Resource requirement not met.",

        expected:
          descriptor.requirement,

        actual:
          snapshot.value
      })
    ]
  });
}

/* ============================================================
   EXECUTION CONTEXT BRIDGE NOTES
   ============================================================ */

/**
 * @section execution-context-bridge-notes
 *
 * semantic_execution_context currently carries:
 *
 * resources.required
 * resources.deferred
 * resources.nativeConsumed
 * resources.supplemental
 *
 * resource-resolver.js should normalize its richer ResourceDescriptor[]
 * into that existing ExecutionContext shape.
 *
 * Recommended mapping:
 *
 * required
 * → descriptors where descriptor.required === true
 *
 * deferred
 * → consumption === DEFERRED
 *
 * nativeConsumed
 * → consumption === NATIVE or VERIFY_ONLY
 *
 * supplemental
 * → FRAME_CONN authority resources not represented natively
 *
 * Do not refactor ExecutionContext merely to mirror this contract.
 */

/* ============================================================
   NATIVE RESOURCE NOTES
   ============================================================ */

/**
 * @section native-resource-notes
 *
 * Native adapter traces established:
 *
 * LIMITED
 * -------
 *
 * Native Lancer Flow:
 * checkItemLimited
 * → updateItemAfterAction
 *
 * Frame Conn:
 * validate before Flow
 * → let native Flow consume
 * → verify afterward
 *
 *
 * LOADED
 * ------
 *
 * WeaponAttackFlow owns:
 * checkWeaponLoaded
 * → updateItemAfterAction
 *
 * Frame Conn must not unload the weapon again.
 *
 *
 * CORE ENERGY
 * -----------
 *
 * CoreActiveFlow owns:
 * checkCorePower
 * → consumeCorePower
 *
 * Frame Conn validates/observes, but does not duplicate consumption.
 *
 *
 * COUNTER DATA
 * ------------
 *
 * Native Lancer stores structured counters on some owned features.
 *
 * Counter semantics may be native-state-backed while actual special-rule
 * consumption remains Frame Conn-owned.
 *
 * Therefore:
 *
 * authority may be NATIVE
 * while consumption may be DEFERRED.
 *
 *
 * FREQUENCY
 * ---------
 *
 * Most:
 *
 * 1/turn
 * 1/round
 * 1/scene
 *
 * feature-rule frequencies are not generically enforced by native Lancer.
 *
 * These are normally:
 *
 * authority = FRAME_CONN
 * consumption = DEFERRED
 */

/* ============================================================
   FEATURE RUNTIME BRIDGE NOTES
   ============================================================ */

/**
 * @section feature-runtime-bridge-notes
 *
 * Future feature_runtime_bridge/ should be able to supplement existing
 * registry definitions with declarations such as:
 *
 * {
 *   resources: [
 *     createFrequencyResourceDeclaration({
 *       id: "everest.initiative.scene-use",
 *       resetScope: RESOURCE_RESET_SCOPE.SCENE,
 *       sourceKind: RESOURCE_SOURCE_KIND.FRAME_TRAIT,
 *       requirement: createResourceRequirement({
 *         mode: RESOURCE_REQUIREMENT_MODE.AVAILABLE
 *       }),
 *       mutation: createResourceMutation({
 *         operation: RESOURCE_OPERATION.SPEND,
 *         amount: 1
 *       })
 *     })
 *   ]
 * }
 *
 * The existing feature registry does not need to be rewritten to contain
 * this richer runtime contract.
 */

/* ============================================================
   EXAMPLES
   ============================================================ */

/**
 * @section examples
 *
 * LIMITED WEAPON
 * --------------
 *
 * kind:
 * LIMITED
 *
 * authority:
 * NATIVE
 *
 * consumption:
 * NATIVE
 *
 * reset:
 * FULL_REPAIR
 *
 *
 * EVEREST INITIATIVE
 * ------------------
 *
 * kind:
 * FREQUENCY
 *
 * authority:
 * FRAME_CONN
 *
 * consumption:
 * DEFERRED
 *
 * reset:
 * SCENE
 *
 *
 * LEADER DIE
 * ----------
 *
 * kind:
 * COUNTER
 *
 * authority:
 * FRAME_CONN or NATIVE depending on persisted backing
 *
 * consumption:
 * DEFERRED
 *
 * reset:
 * FULL_REPAIR
 *
 *
 * LOADING WEAPON
 * --------------
 *
 * kind:
 * LOADED
 *
 * authority:
 * NATIVE
 *
 * consumption:
 * NATIVE
 *
 * reset:
 * RELOAD
 *
 *
 * CORE POWER
 * ----------
 *
 * kind:
 * CORE_ENERGY
 *
 * authority:
 * NATIVE
 *
 * consumption:
 * NATIVE
 *
 * reset:
 * FULL_REPAIR
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Resource kind and resource authority are separate concepts.
 *
 * INVARIANT 2
 * Resource authority and consumption mode are separate concepts.
 *
 * INVARIANT 3
 * A native-backed resource may still be Frame Conn-consumed.
 *
 * INVARIANT 4
 * Native Flow-consumed resources must never be spent twice.
 *
 * INVARIANT 5
 * Native Limited and semantic action frequency remain distinct resources.
 *
 * INVARIANT 6
 * ResourceDescriptor is the canonical execution-level resource contract.
 *
 * INVARIANT 7
 * Resource snapshots are immutable.
 *
 * INVARIANT 8
 * Resource validation is separate from resource mutation.
 *
 * INVARIANT 9
 * Deferred resources should commit only through execution transaction
 * commit timing.
 *
 * INVARIANT 10
 * Native-consumed resources should be verified after native execution.
 *
 * INVARIANT 11
 * lifecycle_service will own reset scheduling; this contract only records
 * reset semantics.
 *
 * INVARIANT 12
 * feature_runtime_bridge may supply missing resource declarations without
 * requiring existing registry definitions to be refactored.
 *
 * INVARIANT 13
 * Custom requirements may be represented here but must be evaluated by
 * resolver/strategy code rather than guessed generically.
 *
 * INVARIANT 14
 * This file must remain free of Foundry/Lancer runtime imports.
 */