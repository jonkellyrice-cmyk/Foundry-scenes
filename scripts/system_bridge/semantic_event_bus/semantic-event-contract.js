/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_event_bus/semantic-event-contract.js
 */
/**
 * @file
 * @path main/semantic_event_bus/semantic-event-contract.js
 * @module semantic-event-contract
 * @layer semantic-event-bus-contract
 * @responsibility define-stable-frame-conn-semantic-event-shapes-and-event-vocabulary
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - semantic-event-registry.js
 * - semantic-event-dispatcher.js
 * - semantic-event-hooks.js
 * - semantic-event-bus.js
 * - lifecycle_service/*
 * - targeting_spatial_service/*
 * - actor_owned_feature_registry/*
 * - future system_bridge/*
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - execution_transaction/ supplies execution lifecycle boundaries
 * - semantic_execution_context/ supplies execution/source/actor lineage
 * - resource_service/ may emit resource semantic events
 * - action_economy/ may emit economy semantic events
 * - future lifecycle_service/ emits turn/round/scene/rest boundaries
 * - future targeting_spatial_service/ emits targeting/spatial events
 * - future actor_owned_feature_registry/ consumes feature-trigger events
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - semantic_event_bus is communication infrastructure only
 * - execution_transaction/ remains execution lifecycle authority
 * - lifecycle_service/ remains lifecycle timing authority
 * - native_adapter/ remains native Lancer authority
 * - feature-specific mechanics remain outside this contract
 *
 * THIS FILE OWNS:
 * - semantic event kinds
 * - semantic event categories
 * - event envelope shape
 * - event identity
 * - execution lineage carried by events
 * - source/actor/target references carried by events
 * - listener result shape
 * - dispatch result shape
 * - propagation/veto semantics
 * - common event constructors
 *
 * THIS FILE DOES NOT OWN:
 * - listener registration
 * - listener execution
 * - event dispatch ordering
 * - lifecycle state
 * - transaction sequencing
 * - feature-specific reactions
 * - native document mutation
 *
 * EDIT CONTRACT:
 * - no Foundry imports
 * - no Lancer imports
 * - no listener execution
 * - events are immutable snapshots
 * - event kind names remain stable once consumed
 * - do not embed tabletop feature logic here
 */
/* ============================================================
   EVENT CATEGORY
   ============================================================ */
/**
 * @section event-category
 */
export const SEMANTIC_EVENT_CATEGORY = Object.freeze({
  EXECUTION:
    "execution",
  ACTION:
    "action",
  ATTACK:
    "attack",
  TECH:
    "tech",
  DAMAGE:
    "damage",
  STATUS:
    "status",
  MOVEMENT:
    "movement",
  TARGETING:
    "targeting",
  RESOURCE:
    "resource",
  ECONOMY:
    "economy",
  LIFECYCLE:
    "lifecycle",
  ACTOR:
    "actor",
  FEATURE:
    "feature",
  NHP:
    "nhp",
  SYSTEM:
    "system",
  CUSTOM:
    "custom"
});
/* ============================================================
   EVENT KIND
   ============================================================ */
/**
 * @section event-kind
 *
 * Stable normalized event vocabulary.
 *
 * Add new kinds here only when the event represents a reusable semantic
 * boundary rather than one feature's private implementation detail.
 */
export const SEMANTIC_EVENT_KIND = Object.freeze({
  /* ----------------------------------------------------------
     EXECUTION
     ---------------------------------------------------------- */
  EXECUTION_STARTED:
    "execution.started",
  EXECUTION_REBUILT:
    "execution.rebuilt",
  EXECUTION_VALIDATED:
    "execution.validated",
  EXECUTION_TARGETED:
    "execution.targeted",
  EXECUTION_EXECUTED:
    "execution.executed",
  EXECUTION_RESOLVED:
    "execution.resolved",
  EXECUTION_COMMITTED:
    "execution.committed",
  EXECUTION_SUCCEEDED:
    "execution.succeeded",
  EXECUTION_BLOCKED:
    "execution.blocked",
  EXECUTION_CANCELLED:
    "execution.cancelled",
  EXECUTION_FAILED:
    "execution.failed",
  EXECUTION_PARTIAL:
    "execution.partial",
  /* ----------------------------------------------------------
     ACTION
     ---------------------------------------------------------- */
  ACTION_STARTED:
    "action.started",
  ACTION_COMPLETED:
    "action.completed",
  ACTION_GRANTED:
    "action.granted",
  ACTION_PREPARED:
    "action.prepared",
  ACTION_TRIGGERED:
    "action.triggered",
  ACTION_CANCELLED:
    "action.cancelled",
  /* ----------------------------------------------------------
     ATTACK
     ---------------------------------------------------------- */
  ATTACK_STARTED:
    "attack.started",
  ATTACK_ROLLED:
    "attack.rolled",
  ATTACK_HIT:
    "attack.hit",
  ATTACK_MISSED:
    "attack.missed",
  ATTACK_CRIT:
    "attack.crit",
  ATTACK_COMPLETED:
    "attack.completed",
  /* ----------------------------------------------------------
     TECH
     ---------------------------------------------------------- */
  TECH_STARTED:
    "tech.started",
  TECH_HIT:
    "tech.hit",
  TECH_MISSED:
    "tech.missed",
  TECH_COMPLETED:
    "tech.completed",
  /* ----------------------------------------------------------
     DAMAGE / HEAT
     ---------------------------------------------------------- */
  DAMAGE_APPLIED:
    "damage.applied",
  DAMAGE_PREVENTED:
    "damage.prevented",
  HEAT_GAINED:
    "heat.gained",
  HEAT_REMOVED:
    "heat.removed",
  /* ----------------------------------------------------------
     STATUS / CONDITION
     ---------------------------------------------------------- */
  STATUS_APPLIED:
    "status.applied",
  STATUS_REMOVED:
    "status.removed",
  STATUS_CHANGED:
    "status.changed",
  CONDITION_APPLIED:
    "condition.applied",
  CONDITION_REMOVED:
    "condition.removed",
  /* ----------------------------------------------------------
     MOVEMENT
     ---------------------------------------------------------- */
  MOVEMENT_STARTED:
    "movement.started",
  MOVEMENT_SEGMENT_COMPLETED:
    "movement.segment-completed",
  MOVEMENT_COMPLETED:
    "movement.completed",
  MOVEMENT_CANCELLED:
    "movement.cancelled",
  ELEVATION_CHANGED:
    "movement.elevation-changed",
  /* ----------------------------------------------------------
     TARGETING
     ---------------------------------------------------------- */
  TARGET_ACQUIRED:
    "target.acquired",
  TARGET_REMOVED:
    "target.removed",
  TARGETING_COMPLETED:
    "targeting.completed",
  TEMPLATE_PLACED:
    "targeting.template-placed",
  /* ----------------------------------------------------------
     RESOURCE
     ---------------------------------------------------------- */
  RESOURCE_VALIDATED:
    "resource.validated",
  RESOURCE_SPENT:
    "resource.spent",
  RESOURCE_RESTORED:
    "resource.restored",
  RESOURCE_RESET:
    "resource.reset",
  RESOURCE_CHANGED:
    "resource.changed",
  /* ----------------------------------------------------------
     ACTION ECONOMY
     ---------------------------------------------------------- */
  ECONOMY_VALIDATED:
    "economy.validated",
  ECONOMY_SPENT:
    "economy.spent",
  ECONOMY_RESET:
    "economy.reset",
  /* ----------------------------------------------------------
     LIFECYCLE
     ---------------------------------------------------------- */
  TURN_STARTED:
    "turn.started",
  TURN_ENDED:
    "turn.ended",
  ROUND_STARTED:
    "round.started",
  ROUND_ENDED:
    "round.ended",
  SCENE_STARTED:
    "scene.started",
  SCENE_ENDED:
    "scene.ended",
  MISSION_STARTED:
    "mission.started",
  MISSION_ENDED:
    "mission.ended",
  SHORT_REST_COMPLETED:
    "short-rest.completed",
  FULL_REPAIR_COMPLETED:
    "full-repair.completed",
  /* ----------------------------------------------------------
     ACTOR
     ---------------------------------------------------------- */
  ACTOR_ACTIVATED:
    "actor.activated",
  ACTOR_DEACTIVATED:
    "actor.deactivated",
  ACTOR_STATE_CHANGED:
    "actor.state-changed",
  /* ----------------------------------------------------------
     FEATURE
     ---------------------------------------------------------- */
  FEATURE_TRIGGERED:
    "feature.triggered",
  FEATURE_USED:
    "feature.used",
  FEATURE_ENABLED:
    "feature.enabled",
  FEATURE_DISABLED:
    "feature.disabled",
  /* ----------------------------------------------------------
     NHP
     ---------------------------------------------------------- */
  NHP_CONTROL_CHANGED:
    "nhp.control-changed",
  NHP_CASCADE_STARTED:
    "nhp.cascade-started",
  NHP_CASCADE_ENDED:
    "nhp.cascade-ended",
  /* ----------------------------------------------------------
     SYSTEM
     ---------------------------------------------------------- */
  SYSTEM_RUNTIME_READY:
    "system.runtime-ready",
  SYSTEM_RUNTIME_STOPPED:
    "system.runtime-stopped",
  CUSTOM:
    "custom"
});
/* ============================================================
   EVENT DELIVERY MODE
   ============================================================ */
/**
 * @section event-delivery-mode
 *
 * OBSERVATIONAL
 * -------------
 * Listener failure must not alter originating mechanic.
 *
 * Most semantic events should use this.
 *
 *
 * COORDINATED
 * -----------
 * Listener results may be collected for later rule resolution, but do not
 * directly stop dispatch.
 *
 *
 * VETOABLE
 * --------
 * Explicitly allows listener result to prevent/cancel a semantic operation.
 *
 * Use sparingly.
 */
export const SEMANTIC_EVENT_DELIVERY_MODE = Object.freeze({
  OBSERVATIONAL:
    "observational",
  COORDINATED:
    "coordinated",
  VETOABLE:
    "vetoable"
});
/* ============================================================
   EVENT PROPAGATION
   ============================================================ */
export const SEMANTIC_EVENT_PROPAGATION = Object.freeze({
  CONTINUE:
    "continue",
  STOP:
    "stop",
  VETO:
    "veto"
});
/* ============================================================
   LISTENER STATUS
   ============================================================ */
export const SEMANTIC_EVENT_LISTENER_STATUS = Object.freeze({
  HANDLED:
    "handled",
  IGNORED:
    "ignored",
  VETOED:
    "vetoed",
  FAILED:
    "failed"
});
/* ============================================================
   DISPATCH STATUS
   ============================================================ */
export const SEMANTIC_EVENT_DISPATCH_STATUS = Object.freeze({
  DISPATCHED:
    "dispatched",
  PARTIAL:
    "partial",
  VETOED:
    "vetoed",
  FAILED:
    "failed",
  NO_LISTENERS:
    "no-listeners"
});
/* ============================================================
   EVENT SOURCE KIND
   ============================================================ */
export const SEMANTIC_EVENT_SOURCE_KIND = Object.freeze({
  EXECUTION:
    "execution",
  ACTOR:
    "actor",
  PILOT:
    "pilot",
  MECH:
    "mech",
  ITEM:
    "item",
  FRAME_TRAIT:
    "frame-trait",
  TALENT:
    "talent",
  CORE_BONUS:
    "core-bonus",
  CORE_SYSTEM:
    "core-system",
  MECH_SYSTEM:
    "mech-system",
  MECH_WEAPON:
    "mech-weapon",
  PILOT_WEAPON:
    "pilot-weapon",
  WEAPON_MOD:
    "weapon-mod",
  STATUS:
    "status",
  LIFECYCLE:
    "lifecycle",
  RESOURCE:
    "resource",
  ACTION_ECONOMY:
    "action-economy",
  SYSTEM:
    "system",
  CUSTOM:
    "custom",
  UNKNOWN:
    "unknown"
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
function createEventId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID ===
    "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }
  return (
    `fc-event-${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}
/* ============================================================
   EVENT IDENTITY
   ============================================================ */
/**
 * @section event-identity
 */
export function createSemanticEventIdentity({
  eventId =
    createEventId(),
  correlationId = null,
  causationEventId = null,
  sequence = null
} = {}) {
  if (!requiredString(eventId)) {
    throw new TypeError(
      "Semantic event identity requires eventId."
    );
  }
  return Object.freeze({
    eventId,
    correlationId,
    causationEventId,
    sequence
  });
}
/* ============================================================
   EXECUTION LINEAGE
   ============================================================ */
/**
 * @section execution-lineage
 */
export function createSemanticEventExecutionLineage({
  transactionId = null,
  executionId = null,
  rootExecutionId = null,
  parentExecutionId = null,
  depth = 0
} = {}) {
  return Object.freeze({
    transactionId,
    executionId,
    rootExecutionId:
      rootExecutionId ??
      executionId ??
      null,
    parentExecutionId,
    depth:
      Number.isFinite(depth)
        ? depth
        : 0
  });
}
/* ============================================================
   ACTOR REFERENCE
   ============================================================ */
export function createSemanticEventActorReference({
  actorUuid = null,
  pilotUuid = null,
  mechUuid = null,
  tokenUuid = null,
  sceneId = null,
  name = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    actorUuid,
    pilotUuid,
    mechUuid,
    tokenUuid,
    sceneId,
    name,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   SOURCE REFERENCE
   ============================================================ */
export function createSemanticEventSource({
  kind =
    SEMANTIC_EVENT_SOURCE_KIND.UNKNOWN,
  id = null,
  featureId = null,
  actorUuid = null,
  itemUuid = null,
  itemLid = null,
  actionPath = null,
  profileIndex = null,
  profileName = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SEMANTIC_EVENT_SOURCE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid semantic event source kind: ${String(kind)}`
    );
  }
  return Object.freeze({
    kind,
    id,
    featureId,
    actorUuid,
    itemUuid,
    itemLid,
    actionPath,
    profileIndex,
    profileName,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGET REFERENCE
   ============================================================ */
/**
 * @section target-reference
 *
 * Semantic event targets deliberately use a compact normalized shape.
 *
 * targeting_spatial_service/ owns deeper geometry.
 */
export function createSemanticEventTarget({
  actorUuid = null,
  tokenUuid = null,
  sceneId = null,
  x = null,
  y = null,
  elevation = null,
  name = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    actorUuid,
    tokenUuid,
    sceneId,
    x,
    y,
    elevation,
    name,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   EVENT ENVELOPE
   ============================================================ */
/**
 * @section event-envelope
 *
 * Canonical semantic event.
 */
export function createSemanticEvent({
  kind,
  category,
  identity = null,
  lineage = null,
  actor = null,
  source = null,
  targets = [],
  deliveryMode =
    SEMANTIC_EVENT_DELIVERY_MODE.OBSERVATIONAL,
  payload = null,
  timestamp =
    Date.now(),
  metadata = {}
} = {}) {
  if (!requiredString(kind)) {
    throw new TypeError(
      "Semantic event requires kind."
    );
  }
  if (
    category != null &&
    !isEnumValue(
      SEMANTIC_EVENT_CATEGORY,
      category
    )
  ) {
    throw new TypeError(
      `Invalid semantic event category: ${String(category)}`
    );
  }
  if (
    !isEnumValue(
      SEMANTIC_EVENT_DELIVERY_MODE,
      deliveryMode
    )
  ) {
    throw new TypeError(
      `Invalid semantic event delivery mode: ${String(deliveryMode)}`
    );
  }
  return Object.freeze({
    identity:
      identity ??
      createSemanticEventIdentity(),
    kind,
    category:
      category ??
      inferSemanticEventCategory(
        kind
      ),
    lineage:
      lineage ??
      createSemanticEventExecutionLineage(),
    actor,
    source,
    targets:
      freezeArray(
        targets
      ),
    deliveryMode,
    payload,
    timestamp,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   EVENT CATEGORY INFERENCE
   ============================================================ */
/**
 * @section event-category-inference
 */
export function inferSemanticEventCategory(
  kind
) {
  if (
    typeof kind !==
    "string"
  ) {
    return SEMANTIC_EVENT_CATEGORY.CUSTOM;
  }
  const prefix =
    kind.split(".")[0];
  switch (prefix) {
    case "execution":
      return SEMANTIC_EVENT_CATEGORY.EXECUTION;
    case "action":
      return SEMANTIC_EVENT_CATEGORY.ACTION;
    case "attack":
      return SEMANTIC_EVENT_CATEGORY.ATTACK;
    case "tech":
      return SEMANTIC_EVENT_CATEGORY.TECH;
    case "damage":
    case "heat":
      return SEMANTIC_EVENT_CATEGORY.DAMAGE;
    case "status":
    case "condition":
      return SEMANTIC_EVENT_CATEGORY.STATUS;
    case "movement":
      return SEMANTIC_EVENT_CATEGORY.MOVEMENT;
    case "target":
    case "targeting":
      return SEMANTIC_EVENT_CATEGORY.TARGETING;
    case "resource":
      return SEMANTIC_EVENT_CATEGORY.RESOURCE;
    case "economy":
      return SEMANTIC_EVENT_CATEGORY.ECONOMY;
    case "turn":
    case "round":
    case "scene":
    case "mission":
    case "short-rest":
    case "full-repair":
      return SEMANTIC_EVENT_CATEGORY.LIFECYCLE;
    case "actor":
      return SEMANTIC_EVENT_CATEGORY.ACTOR;
    case "feature":
      return SEMANTIC_EVENT_CATEGORY.FEATURE;
    case "nhp":
      return SEMANTIC_EVENT_CATEGORY.NHP;
    case "system":
      return SEMANTIC_EVENT_CATEGORY.SYSTEM;
    default:
      return SEMANTIC_EVENT_CATEGORY.CUSTOM;
  }
}
/* ============================================================
   EVENT FROM EXECUTION CONTEXT
   ============================================================ */
/**
 * @section event-from-execution-context
 *
 * Avoids forcing every transaction hook to manually rebuild lineage/source
 * identity.
 */
export function createSemanticEventFromExecutionContext(
  context,
  {
    kind,
    category = null,
    transactionId = null,
    targets = null,
    deliveryMode =
      SEMANTIC_EVENT_DELIVERY_MODE.OBSERVATIONAL,
    payload = null,
    metadata = {}
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "createSemanticEventFromExecutionContext requires ExecutionContext."
    );
  }
  const actor =
    createSemanticEventActorReference({
      actorUuid:
        context
          ?.actors
          ?.actor
          ?.uuid ??
        null,
      pilotUuid:
        context
          ?.actors
          ?.pilot
          ?.uuid ??
        null,
      mechUuid:
        context
          ?.actors
          ?.mech
          ?.uuid ??
        null,
      metadata: {
        controllerMode:
          context
            ?.actors
            ?.controllerMode ??
          null
      }
    });
  const source =
    createSemanticEventSource({
      kind:
        normalizeExecutionSourceKind(
          context
            ?.source
            ?.kind
        ),
      id:
        context
          ?.semanticAction
          ?.id ??
        null,
      featureId:
        context
          ?.source
          ?.sourceFeatureId ??
        null,
      actorUuid:
        context
          ?.source
          ?.nativeActorUuid ??
        null,
      itemUuid:
        context
          ?.source
          ?.nativeItemUuid ??
        null,
      itemLid:
        context
          ?.source
          ?.nativeItemLid ??
        null,
      actionPath:
        context
          ?.source
          ?.nativeActionPath ??
        null,
      profileIndex:
        context
          ?.source
          ?.nativeProfileIndex ??
        context
          ?.weapon
          ?.profileIndex ??
        null,
      profileName:
        context
          ?.source
          ?.nativeProfileName ??
        context
          ?.weapon
          ?.profileName ??
        null
    });
  const normalizedTargets =
    targets ??
    (
      context
        ?.targets ??
      []
    ).map(
      target =>
        createSemanticEventTarget({
          actorUuid:
            target?.actorUuid ??
            null,
          tokenUuid:
            target?.tokenUuid ??
            null,
          sceneId:
            target?.sceneId ??
            null,
          x:
            target?.x ??
            null,
          y:
            target?.y ??
            null,
          elevation:
            target?.elevation ??
            null,
          name:
            target?.name ??
            null,
          metadata:
            target?.metadata ??
            {}
        })
    );
  return createSemanticEvent({
    kind,
    category,
    lineage:
      createSemanticEventExecutionLineage({
        transactionId,
        executionId:
          context
            ?.identity
            ?.executionId ??
          null,
        rootExecutionId:
          context
            ?.identity
            ?.rootExecutionId ??
          null,
        parentExecutionId:
          context
            ?.identity
            ?.parentExecutionId ??
          null,
        depth:
          context
            ?.lineage
            ?.depth ??
          0
      }),
    actor,
    source,
    targets:
      normalizedTargets,
    deliveryMode,
    payload,
    metadata
  });
}
/* ============================================================
   EXECUTION SOURCE KIND NORMALIZATION
   ============================================================ */
function normalizeExecutionSourceKind(
  kind
) {
  switch (kind) {
    case "frame-trait":
      return SEMANTIC_EVENT_SOURCE_KIND.FRAME_TRAIT;
    case "frame-core-system":
      return SEMANTIC_EVENT_SOURCE_KIND.CORE_SYSTEM;
    case "talent":
      return SEMANTIC_EVENT_SOURCE_KIND.TALENT;
    case "core-bonus":
      return SEMANTIC_EVENT_SOURCE_KIND.CORE_BONUS;
    case "mech-system":
      return SEMANTIC_EVENT_SOURCE_KIND.MECH_SYSTEM;
    case "mech-weapon":
      return SEMANTIC_EVENT_SOURCE_KIND.MECH_WEAPON;
    case "pilot-weapon":
      return SEMANTIC_EVENT_SOURCE_KIND.PILOT_WEAPON;
    case "weapon-mod":
      return SEMANTIC_EVENT_SOURCE_KIND.WEAPON_MOD;
    case "status":
      return SEMANTIC_EVENT_SOURCE_KIND.STATUS;
    default:
      return SEMANTIC_EVENT_SOURCE_KIND.EXECUTION;
  }
}
/* ============================================================
   LISTENER RESULT
   ============================================================ */
/**
 * @section listener-result
 */
export function createSemanticEventListenerResult({
  listenerId = null,
  status =
    SEMANTIC_EVENT_LISTENER_STATUS.HANDLED,
  propagation =
    SEMANTIC_EVENT_PROPAGATION.CONTINUE,
  result = null,
  reason = null,
  error = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SEMANTIC_EVENT_LISTENER_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid semantic event listener status: ${String(status)}`
    );
  }
  if (
    !isEnumValue(
      SEMANTIC_EVENT_PROPAGATION,
      propagation
    )
  ) {
    throw new TypeError(
      `Invalid semantic event propagation: ${String(propagation)}`
    );
  }
  return Object.freeze({
    listenerId,
    status,
    propagation,
    result,
    reason,
    error,
    metadata:
      freezeObject(metadata)
  });
}
export function semanticEventHandled(
  options = {}
) {
  return createSemanticEventListenerResult({
    ...options,
    status:
      SEMANTIC_EVENT_LISTENER_STATUS.HANDLED,
    propagation:
      SEMANTIC_EVENT_PROPAGATION.CONTINUE
  });
}
export function semanticEventIgnored(
  options = {}
) {
  return createSemanticEventListenerResult({
    ...options,
    status:
      SEMANTIC_EVENT_LISTENER_STATUS.IGNORED,
    propagation:
      SEMANTIC_EVENT_PROPAGATION.CONTINUE
  });
}
export function semanticEventStopPropagation(
  options = {}
) {
  return createSemanticEventListenerResult({
    ...options,
    status:
      SEMANTIC_EVENT_LISTENER_STATUS.HANDLED,
    propagation:
      SEMANTIC_EVENT_PROPAGATION.STOP
  });
}
export function semanticEventVetoed(
  options = {}
) {
  return createSemanticEventListenerResult({
    ...options,
    status:
      SEMANTIC_EVENT_LISTENER_STATUS.VETOED,
    propagation:
      SEMANTIC_EVENT_PROPAGATION.VETO
  });
}
export function semanticEventListenerFailed(
  options = {}
) {
  return createSemanticEventListenerResult({
    ...options,
    status:
      SEMANTIC_EVENT_LISTENER_STATUS.FAILED,
    propagation:
      SEMANTIC_EVENT_PROPAGATION.CONTINUE
  });
}
/* ============================================================
   DISPATCH RESULT
   ============================================================ */
/**
 * @section dispatch-result
 */
export function createSemanticEventDispatchResult({
  event,
  status =
    SEMANTIC_EVENT_DISPATCH_STATUS.DISPATCHED,
  listenerResults = [],
  startedAt = null,
  finishedAt = null,
  reason = null,
  error = null,
  metadata = {}
} = {}) {
  if (!event) {
    throw new TypeError(
      "Semantic event dispatch result requires event."
    );
  }
  if (
    !isEnumValue(
      SEMANTIC_EVENT_DISPATCH_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid semantic event dispatch status: ${String(status)}`
    );
  }
  return Object.freeze({
    event,
    status,
    listenerResults:
      freezeArray(
        listenerResults
      ),
    startedAt,
    finishedAt,
    reason,
    error,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   DISPATCH RESULT HELPERS
   ============================================================ */
export function semanticEventDispatchSucceeded(
  options
) {
  return createSemanticEventDispatchResult({
    ...options,
    status:
      SEMANTIC_EVENT_DISPATCH_STATUS.DISPATCHED
  });
}
export function semanticEventDispatchNoListeners(
  options
) {
  return createSemanticEventDispatchResult({
    ...options,
    status:
      SEMANTIC_EVENT_DISPATCH_STATUS.NO_LISTENERS
  });
}
export function semanticEventDispatchPartial(
  options
) {
  return createSemanticEventDispatchResult({
    ...options,
    status:
      SEMANTIC_EVENT_DISPATCH_STATUS.PARTIAL
  });
}
export function semanticEventDispatchVetoed(
  options
) {
  return createSemanticEventDispatchResult({
    ...options,
    status:
      SEMANTIC_EVENT_DISPATCH_STATUS.VETOED
  });
}
export function semanticEventDispatchFailed(
  options
) {
  return createSemanticEventDispatchResult({
    ...options,
    status:
      SEMANTIC_EVENT_DISPATCH_STATUS.FAILED
  });
}
/* ============================================================
   EVENT MATCH
   ============================================================ */
/**
 * @section event-match
 *
 * Used by semantic-event-registry.js.
 *
 * null fields mean wildcard.
 */
export function createSemanticEventMatch({
  kinds = null,
  categories = null,
  sourceKinds = null,
  actorUuid = null,
  sourceItemUuid = null,
  sourceItemLid = null,
  sourceFeatureId = null,
  executionId = null,
  rootExecutionId = null,
  predicate = null,
  metadata = {}
} = {}) {
  if (
    predicate != null &&
    typeof predicate !==
      "function"
  ) {
    throw new TypeError(
      "Semantic event match predicate must be function or null."
    );
  }
  return Object.freeze({
    kinds:
      kinds == null
        ? null
        : freezeArray(
            Array.isArray(kinds)
              ? kinds
              : [kinds]
          ),
    categories:
      categories == null
        ? null
        : freezeArray(
            Array.isArray(categories)
              ? categories
              : [categories]
          ),
    sourceKinds:
      sourceKinds == null
        ? null
        : freezeArray(
            Array.isArray(sourceKinds)
              ? sourceKinds
              : [sourceKinds]
          ),
    actorUuid,
    sourceItemUuid,
    sourceItemLid,
    sourceFeatureId,
    executionId,
    rootExecutionId,
    predicate,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   EVENT MATCH EVALUATION
   ============================================================ */
/**
 * @section event-match-evaluation
 *
 * Structural matching only.
 *
 * Async predicate execution belongs to registry/dispatcher.
 */
export function doesSemanticEventMatch(
  event,
  match
) {
  if (!match) {
    return true;
  }
  if (
    match.kinds &&
    !match.kinds.includes(
      event.kind
    )
  ) {
    return false;
  }
  if (
    match.categories &&
    !match.categories.includes(
      event.category
    )
  ) {
    return false;
  }
  if (
    match.sourceKinds &&
    !match.sourceKinds.includes(
      event
        ?.source
        ?.kind
    )
  ) {
    return false;
  }
  if (
    match.actorUuid &&
    match.actorUuid !==
      event
        ?.actor
        ?.actorUuid
  ) {
    return false;
  }
  if (
    match.sourceItemUuid &&
    match.sourceItemUuid !==
      event
        ?.source
        ?.itemUuid
  ) {
    return false;
  }
  if (
    match.sourceItemLid &&
    match.sourceItemLid !==
      event
        ?.source
        ?.itemLid
  ) {
    return false;
  }
  if (
    match.sourceFeatureId &&
    match.sourceFeatureId !==
      event
        ?.source
        ?.featureId
  ) {
    return false;
  }
  if (
    match.executionId &&
    match.executionId !==
      event
        ?.lineage
        ?.executionId
  ) {
    return false;
  }
  if (
    match.rootExecutionId &&
    match.rootExecutionId !==
      event
        ?.lineage
        ?.rootExecutionId
  ) {
    return false;
  }
  return true;
}
/* ============================================================
   COMMON EXECUTION EVENT CONSTRUCTORS
   ============================================================ */
/**
 * @section common-execution-event-constructors
 */
export function createExecutionStartedEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_STARTED
    }
  );
}
export function createExecutionExecutedEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_EXECUTED
    }
  );
}
export function createExecutionResolvedEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_RESOLVED
    }
  );
}
export function createExecutionCommittedEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_COMMITTED
    }
  );
}
export function createExecutionSucceededEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_SUCCEEDED
    }
  );
}
export function createExecutionBlockedEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_BLOCKED
    }
  );
}
export function createExecutionCancelledEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_CANCELLED
    }
  );
}
export function createExecutionFailedEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_FAILED
    }
  );
}
export function createExecutionPartialEvent(
  context,
  options = {}
) {
  return createSemanticEventFromExecutionContext(
    context,
    {
      ...options,
      kind:
        SEMANTIC_EVENT_KIND.EXECUTION_PARTIAL
    }
  );
}
/* ============================================================
   OBSERVATIONAL EVENT RULE
   ============================================================ */
/**
 * @section observational-event-rule
 *
 * Most events should be observational.
 *
 * Listener failure:
 *
 * - is reported in dispatch result
 * - does not rewrite already-established mechanical truth
 *
 * This is especially important for:
 *
 * execution.succeeded
 * execution.committed
 * resource.spent
 * movement.completed
 * status.applied
 *
 * Use VETOABLE only for a true pre-resolution rule boundary.
 */
/* ============================================================
   EVENT / TRANSACTION RELATIONSHIP
   ============================================================ */
/**
 * @section event-transaction-relationship
 *
 * Transaction hooks produce semantic events.
 *
 * Event listeners do not become a second transaction engine.
 *
 * Example:
 *
 * execution_transaction
 * → AFTER_EXECUTE
 * → emit execution.executed
 *
 * semantic listener:
 * → observe
 * → schedule lifecycle work
 * → identify triggered actor-owned feature
 *
 * If that triggered feature executes another action:
 *
 * listener/feature runtime
 * → build child ExecutionContext
 * → start child execution_transaction
 *
 * Do not directly mutate arbitrary combat state inside the event contract.
 */
/* ============================================================
   EVENT / LIFECYCLE RELATIONSHIP
   ============================================================ */
/**
 * @section event-lifecycle-relationship
 *
 * lifecycle_service may:
 *
 * PRODUCE:
 *
 * turn.started
 * turn.ended
 * round.started
 * round.ended
 * scene.started
 * scene.ended
 * full-repair.completed
 *
 * CONSUME:
 *
 * execution.completed
 * status.applied
 * resource.spent
 * feature.triggered
 *
 * Lifecycle timing remains lifecycle_service-owned.
 */
/* ============================================================
   EVENT / ACTOR-OWNED FEATURE RELATIONSHIP
   ============================================================ */
/**
 * @section event-actor-owned-feature-relationship
 *
 * actor_owned_feature_registry may query normalized owned feature
 * descriptors by semantic trigger event.
 *
 * Example:
 *
 * attack.hit
 *        ↓
 * semantic_event_bus
 *        ↓
 * actor_owned_feature_registry
 *        ↓
 * features with trigger = attack.hit
 *
 * The event bus does not interpret Talent/Trait/Core Bonus prose.
 */
/* ============================================================
   EVENT / SYSTEM BRIDGE RELATIONSHIP
   ============================================================ */
/**
 * @section event-system-bridge-relationship
 *
 * future system_bridge may augment a registry/actor-owned feature with:
 *
 * triggerKinds
 * producedEvents
 * event predicates
 *
 * It should reference SEMANTIC_EVENT_KIND values rather than creating
 * incompatible private event strings where a stable semantic boundary
 * already exists.
 */
/* ============================================================
   EVENT PAYLOAD RULES
   ============================================================ */
/**
 * @section event-payload-rules
 *
 * Event envelope fields hold common routing identity:
 *
 * kind
 * category
 * lineage
 * actor
 * source
 * targets
 *
 * payload holds domain-specific result data.
 *
 * Examples:
 *
 * attack.hit payload:
 *
 * {
 *   roll,
 *   total,
 *   defense,
 *   weapon,
 *   damage
 * }
 *
 * status.applied payload:
 *
 * {
 *   statusId,
 *   duration,
 *   source
 * }
 *
 * turn.started payload:
 *
 * {
 *   combatId,
 *   round,
 *   turn
 * }
 *
 * Do not inflate the base event envelope with every possible domain field.
 */
/* ============================================================
   CORRELATION NOTES
   ============================================================ */
/**
 * @section correlation-notes
 *
 * eventId:
 * unique event identity
 *
 * causationEventId:
 * event that directly caused this event
 *
 * correlationId:
 * broader semantic chain
 *
 * execution lineage remains separate:
 *
 * transactionId
 * executionId
 * rootExecutionId
 * parentExecutionId
 *
 * A child transaction can therefore correlate back to an initiating event
 * without collapsing event and execution identities.
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * execution_transaction/
 * ----------------------
 *
 * semantic-event-hooks.js should observe stable transaction stages and emit
 * events defined here.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies:
 *
 * execution lineage
 * actor identity
 * source identity
 * targets
 *
 * createSemanticEventFromExecutionContext() normalizes those fields.
 *
 *
 * resource_service/
 * -----------------
 *
 * May later emit:
 *
 * resource.validated
 * resource.spent
 * resource.restored
 * resource.reset
 *
 *
 * action_economy/
 * ----------------
 *
 * May later emit:
 *
 * economy.validated
 * economy.spent
 * economy.reset
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Will use this vocabulary for lifecycle boundaries.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * May emit:
 *
 * target.acquired
 * targeting.completed
 * targeting.template-placed
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Can match owned feature triggers against semantic event kinds.
 *
 *
 * system_bridge/
 * --------------
 *
 * Can supplement old registry/native feature data with event trigger/
 * producer metadata using this stable vocabulary.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Semantic events are immutable snapshots.
 *
 * INVARIANT 2
 * Event identity and execution identity remain separate.
 *
 * INVARIANT 3
 * Event bus is communication infrastructure, not a rules engine.
 *
 * INVARIANT 4
 * Stable common event kinds live in this contract.
 *
 * INVARIANT 5
 * Feature-private implementation details should not become global event
 * kinds unless they represent reusable semantic boundaries.
 *
 * INVARIANT 6
 * Most post-resolution events are observational.
 *
 * INVARIANT 7
 * Vetoable events must be explicitly marked VETOABLE.
 *
 * INVARIANT 8
 * Listener failures do not automatically rewrite already-established
 * mechanical truth.
 *
 * INVARIANT 9
 * Event targets carry identity/position only; targeting_spatial_service
 * owns deeper geometry.
 *
 * INVARIANT 10
 * Event payload carries domain-specific data rather than expanding the base
 * envelope indefinitely.
 *
 * INVARIANT 11
 * actor_owned_feature_registry may consume event kinds as trigger keys.
 *
 * INVARIANT 12
 * lifecycle_service owns lifecycle timing even when lifecycle boundaries
 * are represented as semantic events.
 *
 * INVARIANT 13
 * Child mechanics triggered by events should execute through normal child
 * ExecutionContext + execution_transaction pathways.
 *
 * INVARIANT 14
 * system_bridge may reference/augment event semantics but does not replace
 * this contract.
 *
 * INVARIANT 15
 * This file remains free of Foundry/Lancer runtime imports.
 */