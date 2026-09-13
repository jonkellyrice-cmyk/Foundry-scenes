/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/lifecycle_service/lifecycle-contract.js
 */

/**
 * @file
 * @path main/lifecycle_service/lifecycle-contract.js
 * @module lifecycle-contract
 * @layer lifecycle-service-contract
 * @responsibility define-stable-frame-conn-lifecycle-boundaries-expirations-resets-and-results
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - lifecycle-state.js
 * - lifecycle-dispatcher.js
 * - lifecycle-hooks.js
 * - lifecycle-service.js
 * - resource_service/*
 * - action_economy/*
 * - semantic_event_bus/*
 * - future actor_owned_feature_registry/*
 * - future system_bridge/*
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - semantic_event_bus/ supplies/receives lifecycle semantic events
 * - action_economy/ exposes turn-start/turn-end/reaction reset primitives
 * - resource_service/ exposes resettable resource descriptors
 * - execution_transaction/ supplies execution completion boundaries
 * - feature_turn/ remains authoritative turn-state backing
 * - future actor_owned_feature_registry/ may declare lifecycle-bound effects
 * - future system_bridge/ may supplement missing lifecycle metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - lifecycle_service owns WHEN temporary state expires/resets
 * - resource_service owns resource mutation semantics
 * - action_economy owns action-economy mutation semantics
 * - semantic_event_bus transports lifecycle boundaries
 * - native_adapter remains native Lancer state authority
 *
 * THIS FILE OWNS:
 * - lifecycle scope vocabulary
 * - lifecycle boundary vocabulary
 * - lifecycle phase vocabulary
 * - lifecycle identity
 * - lifecycle context
 * - expiration descriptors
 * - reset descriptors
 * - temporary effect descriptors
 * - lifecycle operation/result shapes
 * - lifecycle dispatch result shapes
 *
 * THIS FILE DOES NOT OWN:
 * - lifecycle state persistence
 * - lifecycle event detection
 * - resource reset mutation
 * - action-economy mutation
 * - status mutation
 * - semantic event dispatch
 * - Foundry combat hooks
 * - feature-specific rules
 *
 * EDIT CONTRACT:
 * - no Foundry imports
 * - no Lancer imports
 * - no state mutation
 * - lifecycle descriptors describe timing, not mechanic implementation
 * - preserve native-owned vs Frame Conn-owned expiration explicitly
 */

/* ============================================================
   LIFECYCLE SCOPE
   ============================================================ */

/**
 * @section lifecycle-scope
 *
 * Semantic duration/reset domain.
 */

export const LIFECYCLE_SCOPE = Object.freeze({
  EXECUTION:
    "execution",

  ACTION:
    "action",

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

  COMBAT:
    "combat",

  EVENT:
    "event",

  MANUAL:
    "manual",

  NATIVE:
    "native",

  PERMANENT:
    "permanent",

  CUSTOM:
    "custom"
});

/* ============================================================
   LIFECYCLE BOUNDARY
   ============================================================ */

/**
 * @section lifecycle-boundary
 *
 * Stable boundary names consumed by lifecycle dispatcher/hooks.
 */

export const LIFECYCLE_BOUNDARY = Object.freeze({
  EXECUTION_STARTED:
    "execution-started",

  EXECUTION_COMPLETED:
    "execution-completed",

  ACTION_STARTED:
    "action-started",

  ACTION_COMPLETED:
    "action-completed",

  TURN_STARTED:
    "turn-started",

  TURN_ENDED:
    "turn-ended",

  ROUND_STARTED:
    "round-started",

  ROUND_ENDED:
    "round-ended",

  SCENE_STARTED:
    "scene-started",

  SCENE_ENDED:
    "scene-ended",

  COMBAT_STARTED:
    "combat-started",

  COMBAT_ENDED:
    "combat-ended",

  MISSION_STARTED:
    "mission-started",

  MISSION_ENDED:
    "mission-ended",

  SHORT_REST_COMPLETED:
    "short-rest-completed",

  FULL_REPAIR_COMPLETED:
    "full-repair-completed",

  EVENT_OCCURRED:
    "event-occurred",

  MANUAL:
    "manual"
});

/* ============================================================
   LIFECYCLE PHASE
   ============================================================ */

export const LIFECYCLE_PHASE = Object.freeze({
  BEFORE:
    "before",

  START:
    "start",

  ACTIVE:
    "active",

  END:
    "end",

  AFTER:
    "after",

  COMPLETE:
    "complete"
});

/* ============================================================
   LIFECYCLE AUTHORITY
   ============================================================ */

/**
 * @section lifecycle-authority
 *
 * Answers:
 *
 * "Who owns the actual state transition?"
 */

export const LIFECYCLE_AUTHORITY = Object.freeze({
  FRAME_CONN:
    "frame-conn",

  NATIVE:
    "native",

  EXTERNAL:
    "external",

  DERIVED:
    "derived"
});

/* ============================================================
   LIFECYCLE OPERATION
   ============================================================ */

export const LIFECYCLE_OPERATION = Object.freeze({
  REGISTER:
    "register",

  EXPIRE:
    "expire",

  RESET:
    "reset",

  RESTORE:
    "restore",

  REMOVE:
    "remove",

  ENABLE:
    "enable",

  DISABLE:
    "disable",

  ADVANCE:
    "advance",

  VERIFY:
    "verify",

  NOTIFY:
    "notify"
});

/* ============================================================
   LIFECYCLE SUBJECT KIND
   ============================================================ */

/**
 * @section lifecycle-subject-kind
 *
 * What is being managed by lifecycle timing.
 */

export const LIFECYCLE_SUBJECT_KIND = Object.freeze({
  RESOURCE:
    "resource",

  ACTION_ECONOMY:
    "action-economy",

  STATUS:
    "status",

  CONDITION:
    "condition",

  EFFECT:
    "effect",

  FEATURE:
    "feature",

  REACTION:
    "reaction",

  PREPARED_ACTION:
    "prepared-action",

  GRANTED_ACTION:
    "granted-action",

  MOVEMENT:
    "movement",

  NHP:
    "nhp",

  CUSTOM:
    "custom"
});

/* ============================================================
   LIFECYCLE RESULT STATUS
   ============================================================ */

export const LIFECYCLE_RESULT_STATUS = Object.freeze({
  SUCCEEDED:
    "succeeded",

  SKIPPED:
    "skipped",

  NO_MATCH:
    "no-match",

  PARTIAL:
    "partial",

  FAILED:
    "failed"
});

/* ============================================================
   LIFECYCLE DISPATCH STATUS
   ============================================================ */

export const LIFECYCLE_DISPATCH_STATUS = Object.freeze({
  COMPLETED:
    "completed",

  NOTHING_TO_PROCESS:
    "nothing-to-process",

  PARTIAL:
    "partial",

  FAILED:
    "failed"
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

function finiteNumber(value) {
  return Number.isFinite(value);
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
   LIFECYCLE IDENTITY
   ============================================================ */

/**
 * @section lifecycle-identity
 */

export function createLifecycleIdentity({
  lifecycleId,

  actorUuid = null,

  tokenUuid = null,

  sceneId = null,

  combatId = null,

  turnId = null,

  round = null,

  executionId = null,

  rootExecutionId = null,

  parentExecutionId = null,

  metadata = {}
} = {}) {
  if (!requiredString(lifecycleId)) {
    throw new TypeError(
      "Lifecycle identity requires lifecycleId."
    );
  }

  return Object.freeze({
    lifecycleId,

    actorUuid,
    tokenUuid,

    sceneId,
    combatId,

    turnId,
    round,

    executionId,
    rootExecutionId,
    parentExecutionId,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   LIFECYCLE CONTEXT
   ============================================================ */

/**
 * @section lifecycle-context
 *
 * One observed lifecycle boundary.
 */

export function createLifecycleContext({
  boundary,

  scope,

  phase = null,

  identity = null,

  actor = null,

  sourceEvent = null,

  timestamp =
    Date.now(),

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      LIFECYCLE_BOUNDARY,
      boundary
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle boundary: ${String(boundary)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_SCOPE,
      scope
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle scope: ${String(scope)}`
    );
  }

  if (
    phase != null &&
    !isEnumValue(
      LIFECYCLE_PHASE,
      phase
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle phase: ${String(phase)}`
    );
  }

  return Object.freeze({
    boundary,
    scope,
    phase,

    identity,
    actor,

    sourceEvent,

    timestamp,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   LIFECYCLE MATCH
   ============================================================ */

/**
 * @section lifecycle-match
 *
 * Describes which lifecycle boundary affects one descriptor.
 */

export function createLifecycleMatch({
  scopes = null,

  boundaries = null,

  phases = null,

  actorUuid = null,

  sourceId = null,

  eventKind = null,

  predicate = null,

  metadata = {}
} = {}) {
  if (
    predicate != null &&
    typeof predicate !==
      "function"
  ) {
    throw new TypeError(
      "Lifecycle match predicate must be function or null."
    );
  }

  return Object.freeze({
    scopes:
      scopes == null
        ? null
        : freezeArray(
            Array.isArray(scopes)
              ? scopes
              : [scopes]
          ),

    boundaries:
      boundaries == null
        ? null
        : freezeArray(
            Array.isArray(boundaries)
              ? boundaries
              : [boundaries]
          ),

    phases:
      phases == null
        ? null
        : freezeArray(
            Array.isArray(phases)
              ? phases
              : [phases]
          ),

    actorUuid,
    sourceId,
    eventKind,

    predicate,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   STRUCTURAL LIFECYCLE MATCH
   ============================================================ */

export function doesLifecycleContextMatch(
  context,
  match
) {
  if (!match) {
    return true;
  }

  if (
    match.scopes &&
    !match.scopes.includes(
      context.scope
    )
  ) {
    return false;
  }

  if (
    match.boundaries &&
    !match.boundaries.includes(
      context.boundary
    )
  ) {
    return false;
  }

  if (
    match.phases &&
    !match.phases.includes(
      context.phase
    )
  ) {
    return false;
  }

  if (
    match.actorUuid &&
    match.actorUuid !==
      context
        ?.identity
        ?.actorUuid
  ) {
    return false;
  }

  if (
    match.eventKind &&
    match.eventKind !==
      context
        ?.sourceEvent
        ?.kind
  ) {
    return false;
  }

  return true;
}

/* ============================================================
   EXPIRATION DESCRIPTOR
   ============================================================ */

/**
 * @section expiration-descriptor
 *
 * Describes temporary state that should cease at a lifecycle boundary.
 *
 * Example:
 *
 * Shredded until end of target's next turn.
 */

export function createLifecycleExpirationDescriptor({
  id,

  subjectKind,

  subjectId,

  authority =
    LIFECYCLE_AUTHORITY.FRAME_CONN,

  scope,

  boundary,

  phase = null,

  actorUuid = null,

  sourceActorUuid = null,
  targetActorUuid = null,

  turnOffset = 0,
  roundOffset = 0,

  eventKind = null,

  nativeReference = null,

  removeOnExpire = true,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Lifecycle expiration descriptor requires id."
    );
  }

  if (!requiredString(subjectId)) {
    throw new TypeError(
      "Lifecycle expiration descriptor requires subjectId."
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_SUBJECT_KIND,
      subjectKind
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle subject kind: ${String(subjectKind)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle authority: ${String(authority)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_SCOPE,
      scope
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle scope: ${String(scope)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_BOUNDARY,
      boundary
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle expiration boundary: ${String(boundary)}`
    );
  }

  if (
    !finiteNumber(turnOffset) ||
    turnOffset < 0
  ) {
    throw new TypeError(
      "Lifecycle expiration turnOffset must be non-negative."
    );
  }

  if (
    !finiteNumber(roundOffset) ||
    roundOffset < 0
  ) {
    throw new TypeError(
      "Lifecycle expiration roundOffset must be non-negative."
    );
  }

  return Object.freeze({
    id,

    subjectKind,
    subjectId,

    authority,

    scope,
    boundary,
    phase,

    actorUuid,

    sourceActorUuid,
    targetActorUuid,

    turnOffset,
    roundOffset,

    eventKind,

    nativeReference,

    removeOnExpire:
      Boolean(removeOnExpire),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RESET DESCRIPTOR
   ============================================================ */

/**
 * @section reset-descriptor
 *
 * Describes state restored at a lifecycle boundary.
 *
 * Example:
 *
 * 1/scene Everest Initiative.
 */

export function createLifecycleResetDescriptor({
  id,

  subjectKind,

  subjectId,

  authority =
    LIFECYCLE_AUTHORITY.FRAME_CONN,

  scope,

  boundary,

  actorUuid = null,

  operation =
    LIFECYCLE_OPERATION.RESET,

  value = null,

  nativeReference = null,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Lifecycle reset descriptor requires id."
    );
  }

  if (!requiredString(subjectId)) {
    throw new TypeError(
      "Lifecycle reset descriptor requires subjectId."
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_SUBJECT_KIND,
      subjectKind
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle subject kind: ${String(subjectKind)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle authority: ${String(authority)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_SCOPE,
      scope
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle reset scope: ${String(scope)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_BOUNDARY,
      boundary
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle reset boundary: ${String(boundary)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_OPERATION,
      operation
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle reset operation: ${String(operation)}`
    );
  }

  return Object.freeze({
    id,

    subjectKind,
    subjectId,

    authority,

    scope,
    boundary,

    actorUuid,

    operation,
    value,

    nativeReference,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   TEMPORARY EFFECT DESCRIPTOR
   ============================================================ */

/**
 * @section temporary-effect-descriptor
 *
 * Generic lifetime contract for temporary effects.
 *
 * The effect implementation itself belongs to the owning service.
 */

export function createLifecycleEffectDescriptor({
  id,

  subjectKind =
    LIFECYCLE_SUBJECT_KIND.EFFECT,

  subjectId,

  authority =
    LIFECYCLE_AUTHORITY.FRAME_CONN,

  sourceActorUuid = null,
  targetActorUuid = null,

  createdByExecutionId = null,

  expiration = null,

  resets = [],

  enabled = true,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Lifecycle effect descriptor requires id."
    );
  }

  if (!requiredString(subjectId)) {
    throw new TypeError(
      "Lifecycle effect descriptor requires subjectId."
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_SUBJECT_KIND,
      subjectKind
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle effect subject kind: ${String(subjectKind)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle effect authority: ${String(authority)}`
    );
  }

  return Object.freeze({
    id,

    subjectKind,
    subjectId,

    authority,

    sourceActorUuid,
    targetActorUuid,

    createdByExecutionId,

    expiration,

    resets:
      freezeArray(resets),

    enabled:
      Boolean(enabled),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   LIFECYCLE OPERATION REQUEST
   ============================================================ */

export function createLifecycleOperationRequest({
  operation,

  descriptor,

  context,

  reason = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      LIFECYCLE_OPERATION,
      operation
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle operation: ${String(operation)}`
    );
  }

  if (!descriptor) {
    throw new TypeError(
      "Lifecycle operation request requires descriptor."
    );
  }

  if (!context) {
    throw new TypeError(
      "Lifecycle operation request requires context."
    );
  }

  return Object.freeze({
    operation,
    descriptor,
    context,

    reason,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   LIFECYCLE OPERATION RESULT
   ============================================================ */

export function createLifecycleOperationResult({
  operation,

  descriptor,

  status =
    LIFECYCLE_RESULT_STATUS.SUCCEEDED,

  before = null,
  after = null,

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      LIFECYCLE_OPERATION,
      operation
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle result operation: ${String(operation)}`
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_RESULT_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle result status: ${String(status)}`
    );
  }

  return Object.freeze({
    operation,

    descriptor,

    status,

    before,
    after,

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

export function lifecycleOperationSucceeded(
  options
) {
  return createLifecycleOperationResult({
    ...options,

    status:
      LIFECYCLE_RESULT_STATUS.SUCCEEDED
  });
}

export function lifecycleOperationSkipped(
  options
) {
  return createLifecycleOperationResult({
    ...options,

    status:
      LIFECYCLE_RESULT_STATUS.SKIPPED
  });
}

export function lifecycleOperationNoMatch(
  options
) {
  return createLifecycleOperationResult({
    ...options,

    status:
      LIFECYCLE_RESULT_STATUS.NO_MATCH
  });
}

export function lifecycleOperationFailed(
  options
) {
  return createLifecycleOperationResult({
    ...options,

    status:
      LIFECYCLE_RESULT_STATUS.FAILED
  });
}

/* ============================================================
   LIFECYCLE DISPATCH RESULT
   ============================================================ */

/**
 * @section lifecycle-dispatch-result
 */

export function createLifecycleDispatchResult({
  context,

  status =
    LIFECYCLE_DISPATCH_STATUS.COMPLETED,

  matched = [],

  results = [],

  failed = [],

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (!context) {
    throw new TypeError(
      "Lifecycle dispatch result requires context."
    );
  }

  if (
    !isEnumValue(
      LIFECYCLE_DISPATCH_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid lifecycle dispatch status: ${String(status)}`
    );
  }

  return Object.freeze({
    context,

    status,

    matched:
      freezeArray(matched),

    results:
      freezeArray(results),

    failed:
      freezeArray(failed),

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

export function lifecycleDispatchCompleted(
  options
) {
  return createLifecycleDispatchResult({
    ...options,

    status:
      LIFECYCLE_DISPATCH_STATUS.COMPLETED
  });
}

export function lifecycleDispatchNothing(
  options
) {
  return createLifecycleDispatchResult({
    ...options,

    status:
      LIFECYCLE_DISPATCH_STATUS.NOTHING_TO_PROCESS
  });
}

export function lifecycleDispatchPartial(
  options
) {
  return createLifecycleDispatchResult({
    ...options,

    status:
      LIFECYCLE_DISPATCH_STATUS.PARTIAL
  });
}

export function lifecycleDispatchFailed(
  options
) {
  return createLifecycleDispatchResult({
    ...options,

    status:
      LIFECYCLE_DISPATCH_STATUS.FAILED
  });
}

/* ============================================================
   COMMON EXPIRATION HELPERS
   ============================================================ */

/**
 * @section common-expiration-helpers
 */

export function createEndOfTurnExpiration({
  id,
  subjectKind,
  subjectId,
  actorUuid = null,
  targetActorUuid = null,
  ...options
} = {}) {
  return createLifecycleExpirationDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,

    actorUuid,
    targetActorUuid,

    scope:
      LIFECYCLE_SCOPE.TURN,

    boundary:
      LIFECYCLE_BOUNDARY.TURN_ENDED
  });
}

export function createStartOfTurnExpiration({
  id,
  subjectKind,
  subjectId,
  actorUuid = null,
  targetActorUuid = null,
  ...options
} = {}) {
  return createLifecycleExpirationDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,

    actorUuid,
    targetActorUuid,

    scope:
      LIFECYCLE_SCOPE.TURN,

    boundary:
      LIFECYCLE_BOUNDARY.TURN_STARTED
  });
}

export function createEndOfRoundExpiration({
  id,
  subjectKind,
  subjectId,
  ...options
} = {}) {
  return createLifecycleExpirationDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,

    scope:
      LIFECYCLE_SCOPE.ROUND,

    boundary:
      LIFECYCLE_BOUNDARY.ROUND_ENDED
  });
}

export function createEndOfSceneExpiration({
  id,
  subjectKind,
  subjectId,
  ...options
} = {}) {
  return createLifecycleExpirationDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,

    scope:
      LIFECYCLE_SCOPE.SCENE,

    boundary:
      LIFECYCLE_BOUNDARY.SCENE_ENDED
  });
}

/* ============================================================
   COMMON RESET HELPERS
   ============================================================ */

export function createTurnResetDescriptor({
  id,
  subjectKind,
  subjectId,
  actorUuid = null,
  ...options
} = {}) {
  return createLifecycleResetDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,
    actorUuid,

    scope:
      LIFECYCLE_SCOPE.TURN,

    boundary:
      LIFECYCLE_BOUNDARY.TURN_STARTED
  });
}

export function createRoundResetDescriptor({
  id,
  subjectKind,
  subjectId,
  actorUuid = null,
  ...options
} = {}) {
  return createLifecycleResetDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,
    actorUuid,

    scope:
      LIFECYCLE_SCOPE.ROUND,

    boundary:
      LIFECYCLE_BOUNDARY.ROUND_STARTED
  });
}

export function createSceneResetDescriptor({
  id,
  subjectKind,
  subjectId,
  actorUuid = null,
  ...options
} = {}) {
  return createLifecycleResetDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,
    actorUuid,

    scope:
      LIFECYCLE_SCOPE.SCENE,

    boundary:
      LIFECYCLE_BOUNDARY.SCENE_STARTED
  });
}

export function createFullRepairResetDescriptor({
  id,
  subjectKind,
  subjectId,
  actorUuid = null,
  ...options
} = {}) {
  return createLifecycleResetDescriptor({
    ...options,

    id,
    subjectKind,
    subjectId,
    actorUuid,

    scope:
      LIFECYCLE_SCOPE.FULL_REPAIR,

    boundary:
      LIFECYCLE_BOUNDARY.FULL_REPAIR_COMPLETED
  });
}

/* ============================================================
   OFFSET SEMANTICS
   ============================================================ */

/**
 * @section offset-semantics
 *
 * turnOffset / roundOffset are relative lifecycle counts.
 *
 * Examples:
 *
 * "until end of this turn"
 *
 * turnOffset = 0
 * boundary = TURN_ENDED
 *
 *
 * "until end of target's next turn"
 *
 * turnOffset = 1
 * boundary = TURN_ENDED
 * targetActorUuid = target
 *
 *
 * "until end of next round"
 *
 * roundOffset = 1
 * boundary = ROUND_ENDED
 *
 * lifecycle-state.js records origin turn/round identity required to resolve
 * these offsets.
 */

/* ============================================================
   RESOURCE RESET MAPPING
   ============================================================ */

/**
 * @section resource-reset-mapping
 *
 * resource_service ResourceDescriptor.resetScope maps broadly to:
 *
 * TURN
 * → TURN_STARTED
 *
 * ROUND
 * → ROUND_STARTED
 *
 * SCENE
 * → SCENE_STARTED or scene lifecycle reset policy
 *
 * FULL_REPAIR
 * → FULL_REPAIR_COMPLETED
 *
 * RELOAD
 * → not a generic lifecycle reset unless reload is emitted as a semantic
 *   lifecycle/event boundary
 *
 * NATIVE
 * → lifecycle_service does not duplicate native reset
 *
 * Actual mapping belongs in lifecycle-dispatcher.js.
 */

/* ============================================================
   ACTION ECONOMY MAPPING
   ============================================================ */

/**
 * @section action-economy-mapping
 *
 * TURN_STARTED:
 *
 * action_economy.initializeActionEconomyTurn(...)
 *
 *
 * TURN_ENDED:
 *
 * action_economy.endActionEconomyTurn(...)
 *
 *
 * reaction restore:
 *
 * lifecycle timing determines when
 * action_economy.restoreActionEconomyReaction(...)
 * is invoked.
 *
 * lifecycle_service owns timing.
 * action_economy owns state mutation.
 */

/* ============================================================
   STATUS / CONDITION EXPIRATION
   ============================================================ */

/**
 * @section status-condition-expiration
 *
 * Native/Frame Conn status application is separate from duration.
 *
 * Example:
 *
 * source attack applies SHREDDED
 *        +
 * expiration descriptor:
 * target's next TURN_ENDED
 *
 * lifecycle_service later resolves expiration and delegates actual status
 * removal to the appropriate status/native service.
 *
 * This prevents every weapon/talent/trait from implementing its own timer.
 */

/* ============================================================
   PREPARED / GRANTED ACTION LIFETIME
   ============================================================ */

/**
 * @section prepared-granted-action-lifetime
 *
 * Prepared actions and granted actions may also use lifecycle descriptors.
 *
 * Example:
 *
 * prepared reaction expires:
 * → TURN_STARTED / TURN_ENDED / ROUND boundary depending on rule
 *
 * The execution mechanic owns creation/use.
 * lifecycle_service owns expiration timing.
 */

/* ============================================================
   NATIVE AUTHORITY RULE
   ============================================================ */

/**
 * @section native-authority-rule
 *
 * authority = NATIVE
 *
 * means:
 *
 * lifecycle_service may observe/verify the lifecycle boundary
 *
 * but must not duplicate a native reset/removal that the Lancer system
 * already performs.
 *
 * This mirrors the resource_service native-consumption safety rule.
 */

/* ============================================================
   SEMANTIC EVENT RELATIONSHIP
   ============================================================ */

/**
 * @section semantic-event-relationship
 *
 * semantic_event_bus provides lifecycle transport.
 *
 * lifecycle-hooks.js will translate:
 *
 * turn.started
 * turn.ended
 * round.started
 * round.ended
 * scene.started
 * scene.ended
 * short-rest.completed
 * full-repair.completed
 *
 * into LifecycleContext.
 *
 * lifecycle-dispatcher.js then finds matching descriptors and delegates
 * operations.
 */

/* ============================================================
   ACTOR-OWNED FEATURE RELATIONSHIP
   ============================================================ */

/**
 * @section actor-owned-feature-relationship
 *
 * future actor_owned_feature_registry may normalize feature mechanics with:
 *
 * expiration
 * reset
 * duration
 *
 * metadata referencing these lifecycle contracts.
 *
 * Example:
 *
 * Talent rank:
 *
 * {
 *   resource: once-per-round,
 *   reset: ROUND_STARTED
 * }
 *
 * The registry does not execute reset timing itself.
 */

/* ============================================================
   SYSTEM BRIDGE RELATIONSHIP
   ============================================================ */

/**
 * @section system-bridge-relationship
 *
 * future system_bridge may supplement missing lifecycle semantics:
 *
 * {
 *   lifecycle: {
 *     expiration: ...,
 *     resets: [...]
 *   }
 * }
 *
 * Bridge may construct these descriptors from curated augmentation data.
 *
 * It should not perform lifecycle operations itself.
 */

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * semantic_event_bus/
 * -------------------
 *
 * Provides normalized lifecycle event boundaries.
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns turn economy state transitions.
 *
 * lifecycle_service calls its public reset/end primitives.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns resource semantics/mutation.
 *
 * lifecycle_service decides when reset operations are due.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Supplies execution boundaries for temporary execution/action effects.
 *
 *
 * feature_turn/
 * -------------
 *
 * Remains authoritative turn-state backing beneath action_economy.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Remains native mutation authority for native statuses/resources/effects.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Will normalize owned feature lifecycle declarations.
 *
 *
 * system_bridge/
 * --------------
 *
 * May inject missing lifecycle declarations without rewriting existing
 * registry/native feature data.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * lifecycle-contract.js contains no state mutation.
 *
 * INVARIANT 2
 * Lifecycle scope describes duration domain; boundary describes exact
 * transition.
 *
 * INVARIANT 3
 * Lifecycle timing and mechanic mutation remain separate concerns.
 *
 * INVARIANT 4
 * resource_service owns resource mutation semantics.
 *
 * INVARIANT 5
 * action_economy owns economy mutation semantics.
 *
 * INVARIANT 6
 * lifecycle_service owns when those operations occur.
 *
 * INVARIANT 7
 * Temporary status/effect duration is represented explicitly rather than
 * implemented independently inside each feature.
 *
 * INVARIANT 8
 * Native-owned lifecycle transitions must not be duplicated by Frame Conn.
 *
 * INVARIANT 9
 * turnOffset and roundOffset are relative to stored origin lifecycle state.
 *
 * INVARIANT 10
 * semantic_event_bus transports lifecycle boundaries but does not own
 * lifecycle state.
 *
 * INVARIANT 11
 * actor_owned_feature_registry may reference lifecycle descriptors but does
 * not execute lifecycle timing.
 *
 * INVARIANT 12
 * system_bridge may supplement lifecycle metadata but does not become a
 * lifecycle engine.
 *
 * INVARIANT 13
 * Lifecycle descriptors are immutable.
 *
 * INVARIANT 14
 * This file remains free of Foundry/Lancer runtime imports.
 */