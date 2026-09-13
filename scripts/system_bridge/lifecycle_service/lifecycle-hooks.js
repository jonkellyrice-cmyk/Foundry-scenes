/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/lifecycle_service/lifecycle-hooks.js
 */

/**
 * @file
 * @path main/lifecycle_service/lifecycle-hooks.js
 * @module lifecycle-hooks
 * @layer lifecycle-service-event-integration
 * @responsibility translate-semantic-lifecycle-events-into-lifecycle-context-and-dispatch
 * @public-boundary false
 * @side-effects semantic-event-listener-registration-and-lifecycle-dispatch
 *
 * @depends-on
 * - lifecycle-contract
 * - lifecycle-dispatcher
 * - semantic_event_bus/semantic-event-bus
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - subscribes to semantic_event_bus lifecycle events
 * - translates semantic events into LifecycleContext
 * - delegates lifecycle work to lifecycle-dispatcher.js
 * - supplies actor reference to lifecycle dispatcher/state adapters
 * - maintains monotonic turn index for relative "next turn" timing
 * - consumed by lifecycle-service.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - semantic_event_bus owns event transport
 * - lifecycle-dispatcher owns due-entry resolution and operation routing
 * - lifecycle-state owns lifecycle timing metadata persistence
 * - action_economy owns economy mutation
 * - resource_service owns resource mutation
 *
 * THIS FILE OWNS:
 * - semantic lifecycle listener registration
 * - SemanticEvent → LifecycleContext translation
 * - actor reference resolution for lifecycle dispatch
 * - monotonic turn index tracking
 * - lifecycle event dispatch diagnostics
 * - lifecycle hook registration lifecycle
 *
 * THIS FILE DOES NOT OWN:
 * - lifecycle descriptor persistence
 * - lifecycle operation routing
 * - resource/economy/status mutation
 * - semantic event dispatch implementation
 * - feature-specific lifecycle rules
 *
 * EDIT CONTRACT:
 * - subscribe only to stable semantic lifecycle events
 * - do not duplicate lifecycle mechanic logic here
 * - preserve source SemanticEvent on LifecycleContext
 * - maintain monotonic turn index independently from rotating combat.turn
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  LIFECYCLE_BOUNDARY,
  LIFECYCLE_PHASE,
  LIFECYCLE_SCOPE,
  createLifecycleContext,
  createLifecycleIdentity
} from "./lifecycle-contract.js";

import {
  dispatchLifecycleBoundary
} from "./lifecycle-dispatcher.js";

import {
  SEMANTIC_EVENT_KIND,
  SEMANTIC_EVENT_LISTENER_PRIORITY,
  SEMANTIC_EVENT_LISTENER_SOURCE_KIND,
  onSemanticEvent
} from "../semantic_event_bus/semantic-event-bus.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const LIFECYCLE_HOOKS_MODULE_ID =
  "lancer-frame-conn.lifecycle-hooks";

export const LIFECYCLE_HOOKS_MODULE_VERSION =
  1;

/* ============================================================
   LISTENER IDS
   ============================================================ */

export const LIFECYCLE_SEMANTIC_LISTENER_ID =
  Object.freeze({
    TURN_STARTED:
      "lifecycle.turn-started",

    TURN_ENDED:
      "lifecycle.turn-ended",

    ROUND_STARTED:
      "lifecycle.round-started",

    ROUND_ENDED:
      "lifecycle.round-ended",

    SCENE_STARTED:
      "lifecycle.scene-started",

    SCENE_ENDED:
      "lifecycle.scene-ended",

    MISSION_STARTED:
      "lifecycle.mission-started",

    MISSION_ENDED:
      "lifecycle.mission-ended",

    SHORT_REST_COMPLETED:
      "lifecycle.short-rest-completed",

    FULL_REPAIR_COMPLETED:
      "lifecycle.full-repair-completed",

    EXECUTION_STARTED:
      "lifecycle.execution-started",

    EXECUTION_COMPLETED:
      "lifecycle.execution-completed",

    ACTION_STARTED:
      "lifecycle.action-started",

    ACTION_COMPLETED:
      "lifecycle.action-completed"
  });

/* ============================================================
   LISTENER PRIORITY
   ============================================================ */

/**
 * @section listener-priority
 *
 * Lifecycle should generally react after the semantic boundary has been
 * established but before very-late UI/observability listeners.
 */

export const LIFECYCLE_SEMANTIC_LISTENER_PRIORITY =
  SEMANTIC_EVENT_LISTENER_PRIORITY.LATE;

/* ============================================================
   PRIVATE RUNTIME STATE
   ============================================================ */

/**
 * @section private-runtime-state
 *
 * Monotonic turn counters are needed for:
 *
 * "until end of target's next turn"
 *
 * Key:
 * combatId || sceneId || "global"
 *
 * Value:
 * monotonically increasing integer
 */

const TURN_INDEX_BY_SCOPE =
  new Map();

const LAST_LIFECYCLE_DISPATCH_BY_EVENT =
  new Map();

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function getEventId(
  event
) {
  return (
    event
      ?.identity
      ?.eventId ??
    null
  );
}

function getLifecycleScopeKey(
  event
) {
  return (
    event
      ?.payload
      ?.combatId ??
    event
      ?.actor
      ?.sceneId ??
    event
      ?.payload
      ?.sceneId ??
    "global"
  );
}

function getCurrentTurnIndex(
  event
) {
  const key =
    getLifecycleScopeKey(
      event
    );

  return (
    TURN_INDEX_BY_SCOPE.get(
      key
    ) ??
    0
  );
}

function incrementTurnIndex(
  event
) {
  const key =
    getLifecycleScopeKey(
      event
    );

  const next =
    (
      TURN_INDEX_BY_SCOPE.get(
        key
      ) ??
      -1
    ) + 1;

  TURN_INDEX_BY_SCOPE.set(
    key,
    next
  );

  return next;
}

/* ============================================================
   ACTOR REFERENCE RESOLUTION
   ============================================================ */

/**
 * @section actor-reference-resolution
 *
 * SemanticEventActorReference may carry only UUID identity.
 *
 * Actual actor document/reference may optionally be passed through event
 * metadata/payload by the emitter.
 *
 * Lifecycle dispatcher/state adapter can operate on that actor reference.
 *
 * If no object exists, UUID-only fallback remains available for adapters
 * that resolve internally.
 */

function resolveLifecycleActorReference(
  event
) {
  return (
    event
      ?.metadata
      ?.actorReference ??
    event
      ?.payload
      ?.actorReference ??
    (
      event
        ?.actor
        ?.actorUuid
        ? Object.freeze({
            uuid:
              event.actor.actorUuid
          })
        : null
    )
  );
}

/* ============================================================
   LIFECYCLE IDENTITY FROM EVENT
   ============================================================ */

function createLifecycleIdentityFromSemanticEvent(
  event,
  {
    turnIndex = null
  } = {}
) {
  return createLifecycleIdentity({
    lifecycleId:
      getEventId(event) ??
      `lifecycle-${Date.now()}`,

    actorUuid:
      event
        ?.actor
        ?.actorUuid ??
      null,

    tokenUuid:
      event
        ?.actor
        ?.tokenUuid ??
      null,

    sceneId:
      event
        ?.actor
        ?.sceneId ??
      event
        ?.payload
        ?.sceneId ??
      null,

    combatId:
      event
        ?.payload
        ?.combatId ??
      null,

    turnId:
      event
        ?.payload
        ?.turnId ??
      null,

    round:
      event
        ?.payload
        ?.round ??
      null,

    executionId:
      event
        ?.lineage
        ?.executionId ??
      null,

    rootExecutionId:
      event
        ?.lineage
        ?.rootExecutionId ??
      null,

    parentExecutionId:
      event
        ?.lineage
        ?.parentExecutionId ??
      null,

    metadata: {
      turnIndex
    }
  });
}

/* ============================================================
   SEMANTIC EVENT → LIFECYCLE MAPPING
   ============================================================ */

/**
 * @section semantic-event-lifecycle-mapping
 */

function mapSemanticEventToLifecycleBoundary(
  eventKind
) {
  switch (eventKind) {
    case SEMANTIC_EVENT_KIND.TURN_STARTED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.TURN,

        boundary:
          LIFECYCLE_BOUNDARY.TURN_STARTED,

        phase:
          LIFECYCLE_PHASE.START
      });

    case SEMANTIC_EVENT_KIND.TURN_ENDED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.TURN,

        boundary:
          LIFECYCLE_BOUNDARY.TURN_ENDED,

        phase:
          LIFECYCLE_PHASE.END
      });

    case SEMANTIC_EVENT_KIND.ROUND_STARTED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.ROUND,

        boundary:
          LIFECYCLE_BOUNDARY.ROUND_STARTED,

        phase:
          LIFECYCLE_PHASE.START
      });

    case SEMANTIC_EVENT_KIND.ROUND_ENDED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.ROUND,

        boundary:
          LIFECYCLE_BOUNDARY.ROUND_ENDED,

        phase:
          LIFECYCLE_PHASE.END
      });

    case SEMANTIC_EVENT_KIND.SCENE_STARTED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.SCENE,

        boundary:
          LIFECYCLE_BOUNDARY.SCENE_STARTED,

        phase:
          LIFECYCLE_PHASE.START
      });

    case SEMANTIC_EVENT_KIND.SCENE_ENDED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.SCENE,

        boundary:
          LIFECYCLE_BOUNDARY.SCENE_ENDED,

        phase:
          LIFECYCLE_PHASE.END
      });

    case SEMANTIC_EVENT_KIND.MISSION_STARTED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.MISSION,

        boundary:
          LIFECYCLE_BOUNDARY.MISSION_STARTED,

        phase:
          LIFECYCLE_PHASE.START
      });

    case SEMANTIC_EVENT_KIND.MISSION_ENDED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.MISSION,

        boundary:
          LIFECYCLE_BOUNDARY.MISSION_ENDED,

        phase:
          LIFECYCLE_PHASE.END
      });

    case SEMANTIC_EVENT_KIND.SHORT_REST_COMPLETED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.SHORT_REST,

        boundary:
          LIFECYCLE_BOUNDARY.SHORT_REST_COMPLETED,

        phase:
          LIFECYCLE_PHASE.COMPLETE
      });

    case SEMANTIC_EVENT_KIND.FULL_REPAIR_COMPLETED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.FULL_REPAIR,

        boundary:
          LIFECYCLE_BOUNDARY.FULL_REPAIR_COMPLETED,

        phase:
          LIFECYCLE_PHASE.COMPLETE
      });

    case SEMANTIC_EVENT_KIND.EXECUTION_STARTED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.EXECUTION,

        boundary:
          LIFECYCLE_BOUNDARY.EXECUTION_STARTED,

        phase:
          LIFECYCLE_PHASE.START
      });

    case SEMANTIC_EVENT_KIND.EXECUTION_SUCCEEDED:
    case SEMANTIC_EVENT_KIND.EXECUTION_BLOCKED:
    case SEMANTIC_EVENT_KIND.EXECUTION_CANCELLED:
    case SEMANTIC_EVENT_KIND.EXECUTION_FAILED:
    case SEMANTIC_EVENT_KIND.EXECUTION_PARTIAL:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.EXECUTION,

        boundary:
          LIFECYCLE_BOUNDARY.EXECUTION_COMPLETED,

        phase:
          LIFECYCLE_PHASE.COMPLETE
      });

    case SEMANTIC_EVENT_KIND.ACTION_STARTED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.ACTION,

        boundary:
          LIFECYCLE_BOUNDARY.ACTION_STARTED,

        phase:
          LIFECYCLE_PHASE.START
      });

    case SEMANTIC_EVENT_KIND.ACTION_COMPLETED:
      return Object.freeze({
        scope:
          LIFECYCLE_SCOPE.ACTION,

        boundary:
          LIFECYCLE_BOUNDARY.ACTION_COMPLETED,

        phase:
          LIFECYCLE_PHASE.COMPLETE
      });

    default:
      return null;
  }
}

/* ============================================================
   LIFECYCLE CONTEXT FROM EVENT
   ============================================================ */

export function createLifecycleContextFromSemanticEvent(
  event
) {
  if (!event) {
    throw new TypeError(
      "createLifecycleContextFromSemanticEvent requires SemanticEvent."
    );
  }

  const mapped =
    mapSemanticEventToLifecycleBoundary(
      event.kind
    );

  if (!mapped) {
    return null;
  }

  let turnIndex =
    getCurrentTurnIndex(
      event
    );

  if (
    event.kind ===
    SEMANTIC_EVENT_KIND.TURN_STARTED
  ) {
    turnIndex =
      incrementTurnIndex(
        event
      );
  }

  const actorReference =
    resolveLifecycleActorReference(
      event
    );

  return createLifecycleContext({
    boundary:
      mapped.boundary,

    scope:
      mapped.scope,

    phase:
      mapped.phase,

    identity:
      createLifecycleIdentityFromSemanticEvent(
        event,
        {
          turnIndex
        }
      ),

    actor:
      actorReference,

    sourceEvent:
      event,

    metadata: {
      turnIndex,

      actorReference,

      semanticEventId:
        getEventId(event),

      semanticEventKind:
        event.kind
    }
  });
}

/* ============================================================
   PRIMARY SEMANTIC LIFECYCLE HANDLER
   ============================================================ */

/**
 * @section primary-semantic-lifecycle-handler
 */

export async function handleSemanticLifecycleEvent(
  listenerPayload
) {
  const event =
    listenerPayload
      ?.event;

  if (!event) {
    return "ignored";
  }

  const lifecycleContext =
    createLifecycleContextFromSemanticEvent(
      event
    );

  if (!lifecycleContext) {
    return "ignored";
  }

  const actorReference =
    lifecycleContext.actor;

  if (!actorReference) {
    return Object.freeze({
      status:
        "failed",

      propagation:
        "continue",

      reason:
        "lifecycle-actor-reference-unavailable",

      result:
        null
    });
  }

  let dispatchResult;

  try {
    dispatchResult =
      await dispatchLifecycleBoundary(
        actorReference,
        lifecycleContext
      );
  } catch (error) {
    dispatchResult =
      Object.freeze({
        status:
          "failed",

        error,

        context:
          lifecycleContext
      });
  }

  const eventId =
    getEventId(
      event
    );

  if (requiredString(eventId)) {
    LAST_LIFECYCLE_DISPATCH_BY_EVENT.set(
      eventId,
      Object.freeze({
        lifecycleContext,
        dispatchResult,
        timestamp:
          Date.now()
      })
    );
  }

  /*
   * Lifecycle listeners are observational relative to the originating
   * semantic event.
   *
   * Lifecycle failures are returned as handled data, not event veto.
   */
  return Object.freeze({
    status:
      "handled",

    propagation:
      "continue",

    result:
      dispatchResult,

    metadata:
      Object.freeze({
        lifecycleContext
      })
  });
}

/* ============================================================
   LISTENER REGISTRATION HELPERS
   ============================================================ */

function registerLifecycleSemanticListener(
  kind,
  id
) {
  return onSemanticEvent(
    kind,
    handleSemanticLifecycleEvent,
    {
      id,

      priority:
        LIFECYCLE_SEMANTIC_LISTENER_PRIORITY,

      sourceKind:
        SEMANTIC_EVENT_LISTENER_SOURCE_KIND.LIFECYCLE,

      sourceId:
        LIFECYCLE_HOOKS_MODULE_ID
    }
  );
}

/* ============================================================
   GLOBAL SEMANTIC LISTENER REGISTRATION
   ============================================================ */

/**
 * @section global-semantic-listener-registration
 */

let registeredLifecycleSemanticHooks =
  null;

export function registerLifecycleSemanticHooks() {
  if (registeredLifecycleSemanticHooks) {
    return registeredLifecycleSemanticHooks;
  }

  const registrations = [
    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.TURN_STARTED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.TURN_STARTED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.TURN_ENDED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.TURN_ENDED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.ROUND_STARTED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.ROUND_STARTED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.ROUND_ENDED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.ROUND_ENDED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.SCENE_STARTED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.SCENE_STARTED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.SCENE_ENDED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.SCENE_ENDED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.MISSION_STARTED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.MISSION_STARTED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.MISSION_ENDED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.MISSION_ENDED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.SHORT_REST_COMPLETED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.SHORT_REST_COMPLETED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.FULL_REPAIR_COMPLETED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.FULL_REPAIR_COMPLETED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.EXECUTION_STARTED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.EXECUTION_STARTED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.EXECUTION_SUCCEEDED,
      `${LIFECYCLE_SEMANTIC_LISTENER_ID.EXECUTION_COMPLETED}.success`
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.EXECUTION_BLOCKED,
      `${LIFECYCLE_SEMANTIC_LISTENER_ID.EXECUTION_COMPLETED}.blocked`
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.EXECUTION_CANCELLED,
      `${LIFECYCLE_SEMANTIC_LISTENER_ID.EXECUTION_COMPLETED}.cancelled`
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.EXECUTION_FAILED,
      `${LIFECYCLE_SEMANTIC_LISTENER_ID.EXECUTION_COMPLETED}.failed`
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.EXECUTION_PARTIAL,
      `${LIFECYCLE_SEMANTIC_LISTENER_ID.EXECUTION_COMPLETED}.partial`
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.ACTION_STARTED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.ACTION_STARTED
    ),

    registerLifecycleSemanticListener(
      SEMANTIC_EVENT_KIND.ACTION_COMPLETED,
      LIFECYCLE_SEMANTIC_LISTENER_ID.ACTION_COMPLETED
    )
  ];

  registeredLifecycleSemanticHooks =
    Object.freeze({
      registrations:
        Object.freeze(
          registrations
        ),

      dispose() {
        let removed =
          0;

        for (
          const registration of
            registrations
        ) {
          if (
            registration
              ?.dispose
              ?.()
          ) {
            removed +=
              1;
          }
        }

        registeredLifecycleSemanticHooks =
          null;

        TURN_INDEX_BY_SCOPE.clear();
        LAST_LIFECYCLE_DISPATCH_BY_EVENT.clear();

        return removed;
      }
    });

  return registeredLifecycleSemanticHooks;
}

/* ============================================================
   GLOBAL SEMANTIC LISTENER UNREGISTRATION
   ============================================================ */

export function unregisterLifecycleSemanticHooks() {
  if (!registeredLifecycleSemanticHooks) {
    return 0;
  }

  return registeredLifecycleSemanticHooks
    .dispose();
}

export function areLifecycleSemanticHooksRegistered() {
  return Boolean(
    registeredLifecycleSemanticHooks
  );
}

/* ============================================================
   MANUAL LIFECYCLE EVENT PROCESSING
   ============================================================ */

/**
 * @section manual-lifecycle-event-processing
 *
 * Useful when a caller already has a SemanticEvent and wants lifecycle
 * processing without relying on listener registration.
 */

export async function dispatchSemanticEventAsLifecycle(
  event
) {
  const lifecycleContext =
    createLifecycleContextFromSemanticEvent(
      event
    );

  if (!lifecycleContext) {
    return null;
  }

  const actorReference =
    lifecycleContext.actor;

  if (!actorReference) {
    throw new Error(
      "Lifecycle semantic event has no actor reference."
    );
  }

  return dispatchLifecycleBoundary(
    actorReference,
    lifecycleContext
  );
}

/* ============================================================
   TURN INDEX ACCESS
   ============================================================ */

/**
 * @section turn-index-access
 */

export function getLifecycleTurnIndex(
  {
    combatId = null,
    sceneId = null
  } = {}
) {
  const key =
    combatId ??
    sceneId ??
    "global";

  return (
    TURN_INDEX_BY_SCOPE.get(
      key
    ) ??
    0
  );
}

export function setLifecycleTurnIndex(
  value,
  {
    combatId = null,
    sceneId = null
  } = {}
) {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      "Lifecycle turn index must be finite."
    );
  }

  const key =
    combatId ??
    sceneId ??
    "global";

  TURN_INDEX_BY_SCOPE.set(
    key,
    Math.max(
      0,
      value
    )
  );

  return (
    TURN_INDEX_BY_SCOPE.get(
      key
    )
  );
}

export function clearLifecycleTurnIndex(
  {
    combatId = null,
    sceneId = null
  } = {}
) {
  const key =
    combatId ??
    sceneId ??
    "global";

  return TURN_INDEX_BY_SCOPE.delete(
    key
  );
}

/* ============================================================
   DISPATCH DIAGNOSTICS
   ============================================================ */

export function getLifecycleDispatchForSemanticEvent(
  eventId
) {
  if (!requiredString(eventId)) {
    return null;
  }

  return (
    LAST_LIFECYCLE_DISPATCH_BY_EVENT.get(
      eventId
    ) ??
    null
  );
}

export function clearLifecycleDispatchForSemanticEvent(
  eventId
) {
  if (!requiredString(eventId)) {
    return false;
  }

  return LAST_LIFECYCLE_DISPATCH_BY_EVENT.delete(
    eventId
  );
}

export function clearAllLifecycleDispatchDiagnostics() {
  const count =
    LAST_LIFECYCLE_DISPATCH_BY_EVENT.size;

  LAST_LIFECYCLE_DISPATCH_BY_EVENT.clear();

  return count;
}

/* ============================================================
   HOOK DIAGNOSTICS
   ============================================================ */

export function getLifecycleHookDiagnostics() {
  return Object.freeze({
    id:
      LIFECYCLE_HOOKS_MODULE_ID,

    version:
      LIFECYCLE_HOOKS_MODULE_VERSION,

    registered:
      areLifecycleSemanticHooksRegistered(),

    turnIndexScopeCount:
      TURN_INDEX_BY_SCOPE.size,

    trackedDispatchCount:
      LAST_LIFECYCLE_DISPATCH_BY_EVENT.size
  });
}

/* ============================================================
   TURN START NOTES
   ============================================================ */

/**
 * @section turn-start-notes
 *
 * turn.started:
 *
 * 1. increment monotonic turn index
 * 2. create LifecycleContext
 * 3. lifecycle-dispatcher initializes action economy
 * 4. process due TURN_STARTED descriptors
 *
 * The monotonic counter is NOT Foundry combat.turn.
 */

/* ============================================================
   TURN END NOTES
   ============================================================ */

/**
 * @section turn-end-notes
 *
 * turn.ended:
 *
 * 1. use current monotonic turn index
 * 2. process due TURN_ENDED descriptors
 * 3. lifecycle-dispatcher ends action economy
 *
 * This supports:
 *
 * "until end of this turn"
 * "until end of target's next turn"
 */

/* ============================================================
   ROUND NOTES
   ============================================================ */

/**
 * @section round-notes
 *
 * round.started / round.ended use event payload round identity.
 *
 * No separate round counter is created here because round is already
 * monotonic in normal combat progression.
 *
 * If future non-combat lifecycle requires synthetic rounds, emitter should
 * supply explicit round identity.
 */

/* ============================================================
   SCENE NOTES
   ============================================================ */

/**
 * @section scene-notes
 *
 * Scene lifecycle must be explicitly emitted by an owning scene/combat
 * integration layer.
 *
 * This file does not infer:
 *
 * scene start from canvas load
 * scene end from scene switch
 *
 * without a stable semantic event.
 */

/* ============================================================
   FULL REPAIR / SHORT REST NOTES
   ============================================================ */

/**
 * @section repair-rest-notes
 *
 * short-rest.completed and full-repair.completed should be emitted only
 * after the underlying rest/repair mechanic has successfully completed.
 *
 * lifecycle_service then handles Frame Conn-owned resets/expirations.
 *
 * Native-owned resets remain native-authority and are not duplicated.
 */

/* ============================================================
   EXECUTION LIFECYCLE NOTES
   ============================================================ */

/**
 * @section execution-lifecycle-notes
 *
 * execution.started
 * → EXECUTION_STARTED
 *
 * any terminal execution semantic event:
 *
 * execution.succeeded
 * execution.blocked
 * execution.cancelled
 * execution.failed
 * execution.partial
 *
 * → EXECUTION_COMPLETED
 *
 * This supports temporary state scoped to one execution without coupling
 * lifecycle_service directly to execution_transaction.
 */

/* ============================================================
   ACTION LIFECYCLE NOTES
   ============================================================ */

/**
 * @section action-lifecycle-notes
 *
 * action.started / action.completed are semantic domain boundaries.
 *
 * These are distinct from execution started/completed because one execution
 * may eventually contain nested or granted action semantics.
 */

/* ============================================================
   ACTOR OWNED FEATURE NOTES
   ============================================================ */

/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry may later register lifecycle descriptors
 * associated with:
 *
 * traits
 * talents
 * core bonuses
 * mounted systems
 * weapon effects
 *
 * Lifecycle hooks remain generic.
 *
 * They do not know which feature created the descriptor.
 */

/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */

/**
 * @section system-bridge-notes
 *
 * system_bridge may later supply:
 *
 * expiration
 * reset
 * duration
 *
 * metadata for actor-owned or registry features.
 *
 * Once registered in lifecycle-state, these hooks process them through the
 * same semantic lifecycle boundaries.
 */

/* ============================================================
   INITIALIZATION NOTES
   ============================================================ */

/**
 * @section initialization-notes
 *
 * Future runtime composition:
 *
 * configure semantic_event_bus
 * configure lifecycle-state adapter
 * configure lifecycle operation adapters
 * registerLifecycleSemanticHooks()
 *
 * Then lifecycle events flow:
 *
 * semantic event
 * → lifecycle-hooks
 * → LifecycleContext
 * → lifecycle-dispatcher
 * → owning service
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
 * Owns event transport and listener registration.
 *
 * lifecycle-hooks subscribes through public bus boundary.
 *
 *
 * lifecycle-state.js
 * ------------------
 *
 * Stores descriptor timing/origin state.
 *
 *
 * lifecycle-dispatcher.js
 * -----------------------
 *
 * Owns due-entry processing and operation delegation.
 *
 *
 * action_economy/
 * ---------------
 *
 * Turn start/end mutation occurs through dispatcher.
 *
 *
 * resource_service/
 * -----------------
 *
 * Resource reset mutation occurs through dispatcher.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later contributes lifecycle descriptors.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplies missing lifecycle semantics.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * lifecycle-hooks translates semantic events; it does not own lifecycle
 * mechanic logic.
 *
 * INVARIANT 2
 * semantic_event_bus remains event transport authority.
 *
 * INVARIANT 3
 * lifecycle-dispatcher remains lifecycle operation authority.
 *
 * INVARIANT 4
 * Source SemanticEvent is preserved on LifecycleContext.
 *
 * INVARIANT 5
 * Turn index is monotonic and independent of rotating combat.turn.
 *
 * INVARIANT 6
 * TURN_STARTED increments the monotonic turn index before dispatch.
 *
 * INVARIANT 7
 * TURN_ENDED uses the current monotonic turn index.
 *
 * INVARIANT 8
 * Lifecycle failures do not veto the originating observational semantic
 * event.
 *
 * INVARIANT 9
 * Native lifecycle mutations remain delegated/verified elsewhere.
 *
 * INVARIANT 10
 * Lifecycle semantic listeners are registered once during runtime
 * composition.
 *
 * INVARIANT 11
 * actor_owned_feature_registry may supply descriptors but does not change
 * lifecycle hook behavior.
 *
 * INVARIANT 12
 * system_bridge may augment lifecycle metadata but does not own lifecycle
 * event transport.
 */