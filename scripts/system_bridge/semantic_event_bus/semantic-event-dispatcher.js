/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_event_bus/semantic-event-dispatcher.js
 */
/**
 * @file
 * @path main/semantic_event_bus/semantic-event-dispatcher.js
 * @module semantic-event-dispatcher
 * @layer semantic-event-bus-dispatch
 * @responsibility resolve-invoke-and-normalize-semantic-event-listener-delivery
 * @public-boundary false
 * @side-effects semantic-listener-callback-execution
 *
 * @depends-on
 * - semantic-event-contract
 * - semantic-event-registry
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by semantic-event-hooks.js
 * - consumed by semantic-event-bus.js
 * - dispatches events emitted from execution_transaction/
 * - future lifecycle_service/ emits/consumes events through this dispatcher
 * - future actor_owned_feature_registry/ registers feature-trigger listeners
 * - future system_bridge/ may supply declarative event trigger metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - semantic-event-contract.js owns event/result shapes
 * - semantic-event-registry.js owns listener storage/matching
 * - execution_transaction/ remains execution sequencing authority
 * - lifecycle_service/ remains lifecycle authority
 * - event listeners do not become a second execution engine
 *
 * THIS FILE OWNS:
 * - matching listener retrieval
 * - async predicate evaluation
 * - listener invocation
 * - listener result normalization
 * - propagation handling
 * - veto handling
 * - observational/coordinated/vetoable delivery semantics
 * - listener error normalization
 * - once-only listener consumption
 * - aggregate dispatch result construction
 *
 * THIS FILE DOES NOT OWN:
 * - listener registration
 * - event construction
 * - transaction sequencing
 * - feature-specific rules
 * - lifecycle timing
 * - native state mutation
 *
 * EDIT CONTRACT:
 * - one failed observational listener must not corrupt event truth
 * - STOP and VETO remain distinct
 * - VETO only has mechanical meaning for VETOABLE events
 * - once-only listeners are consumed after execution
 * - preserve deterministic registry order
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  SEMANTIC_EVENT_DELIVERY_MODE,
  SEMANTIC_EVENT_DISPATCH_STATUS,
  SEMANTIC_EVENT_LISTENER_STATUS,
  SEMANTIC_EVENT_PROPAGATION,
  createSemanticEventDispatchResult,
  createSemanticEventListenerResult,
  semanticEventDispatchFailed,
  semanticEventDispatchNoListeners,
  semanticEventDispatchPartial,
  semanticEventDispatchSucceeded,
  semanticEventDispatchVetoed,
  semanticEventHandled,
  semanticEventIgnored,
  semanticEventListenerFailed,
  semanticEventStopPropagation,
  semanticEventVetoed
} from "./semantic-event-contract.js";
import {
  consumeSemanticEventListener,
  getMatchingSemanticEventListeners
} from "./semantic-event-registry.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const SEMANTIC_EVENT_DISPATCHER_MODULE_ID =
  "lancer-frame-conn.semantic-event-dispatcher";
export const SEMANTIC_EVENT_DISPATCHER_MODULE_VERSION =
  1;
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
function nowTimestamp() {
  return Date.now();
}
function normalizeArray(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value)
    ? value
    : [value];
}
/* ============================================================
   LISTENER PAYLOAD
   ============================================================ */
/**
 * @section listener-payload
 */
function createSemanticEventListenerPayload(
  event,
  {
    listener,
    previousResults = [],
    signal = null,
    metadata = {}
  } = {}
) {
  return Object.freeze({
    event,
    listener,
    previousResults:
      Object.freeze([
        ...previousResults
      ]),
    signal,
    metadata:
      Object.freeze({
        ...metadata
      })
  });
}
/* ============================================================
   ABORT SUPPORT
   ============================================================ */
function isAbortRequested(
  signal
) {
  return Boolean(
    signal?.aborted
  );
}
function getAbortReason(
  signal
) {
  return (
    signal?.reason ??
    new Error(
      "Semantic event dispatch aborted."
    )
  );
}
/* ============================================================
   PREDICATE EVALUATION
   ============================================================ */
/**
 * @section predicate-evaluation
 *
 * Registry performs structural match first.
 *
 * Dispatcher performs async predicate evaluation.
 */
async function evaluateListenerPredicate(
  listener,
  event,
  {
    signal = null
  } = {}
) {
  const predicate =
    listener
      ?.match
      ?.predicate;
  if (
    typeof predicate !==
    "function"
  ) {
    return Object.freeze({
      matches:
        true,
      error:
        null
    });
  }
  if (isAbortRequested(signal)) {
    return Object.freeze({
      matches:
        false,
      error:
        getAbortReason(
          signal
        )
    });
  }
  try {
    const matches =
      await predicate(
        event
      );
    return Object.freeze({
      matches:
        Boolean(matches),
      error:
        null
    });
  } catch (error) {
    return Object.freeze({
      matches:
        false,
      error
    });
  }
}
/* ============================================================
   LISTENER RESULT NORMALIZATION
   ============================================================ */
/**
 * @section listener-result-normalization
 *
 * Supported listener returns:
 *
 * undefined/null
 * true
 * false
 * "continue"
 * "stop"
 * "veto"
 * SemanticEventListenerResult
 * arbitrary semantic result payload
 */
function normalizeListenerResult(
  rawResult,
  listener,
  event
) {
  if (rawResult == null) {
    return semanticEventHandled({
      listenerId:
        listener.id
    });
  }
  if (
    rawResult?.status &&
    rawResult?.propagation
  ) {
    return createSemanticEventListenerResult({
      listenerId:
        rawResult.listenerId ??
        listener.id,
      status:
        rawResult.status,
      propagation:
        rawResult.propagation,
      result:
        rawResult.result ??
        null,
      reason:
        rawResult.reason ??
        null,
      error:
        rawResult.error ??
        null,
      metadata:
        rawResult.metadata ??
        {}
    });
  }
  if (rawResult === true) {
    return semanticEventHandled({
      listenerId:
        listener.id
    });
  }
  if (rawResult === false) {
    /*
     * False is an ignore result, not an implicit veto.
     */
    return semanticEventIgnored({
      listenerId:
        listener.id,
      reason:
        "listener-returned-false"
    });
  }
  if (
    typeof rawResult ===
    "string"
  ) {
    switch (
      rawResult
        .trim()
        .toLowerCase()
    ) {
      case "continue":
      case "handled":
        return semanticEventHandled({
          listenerId:
            listener.id
        });
      case "ignore":
      case "ignored":
        return semanticEventIgnored({
          listenerId:
            listener.id
        });
      case "stop":
        return semanticEventStopPropagation({
          listenerId:
            listener.id
        });
      case "veto":
        return semanticEventVetoed({
          listenerId:
            listener.id
        });
      default:
        break;
    }
  }
  /*
   * Arbitrary object/value becomes a handled semantic result payload.
   */
  return semanticEventHandled({
    listenerId:
      listener.id,
    result:
      rawResult
  });
}
/* ============================================================
   OBSERVATIONAL FAILURE NORMALIZATION
   ============================================================ */
/**
 * @section observational-failure-normalization
 *
 * Observational listeners may fail without halting dispatch.
 */
function createListenerFailureResult(
  listener,
  error,
  {
    reason =
      "semantic-listener-threw"
  } = {}
) {
  return semanticEventListenerFailed({
    listenerId:
      listener.id,
    error,
    reason,
    metadata: {
      listenerName:
        listener.name,
      sourceKind:
        listener.sourceKind,
      sourceId:
        listener.sourceId
    }
  });
}
/* ============================================================
   SINGLE LISTENER INVOCATION
   ============================================================ */
/**
 * @section single-listener-invocation
 */
async function invokeSemanticEventListener(
  listener,
  event,
  {
    previousResults = [],
    signal = null,
    metadata = {}
  } = {}
) {
  if (!listener.enabled) {
    return semanticEventIgnored({
      listenerId:
        listener.id,
      reason:
        "listener-disabled"
    });
  }
  if (isAbortRequested(signal)) {
    return createListenerFailureResult(
      listener,
      getAbortReason(
        signal
      ),
      {
        reason:
          "dispatch-aborted"
      }
    );
  }
  const predicate =
    await evaluateListenerPredicate(
      listener,
      event,
      {
        signal
      }
    );
  if (predicate.error) {
    return createListenerFailureResult(
      listener,
      predicate.error,
      {
        reason:
          "semantic-listener-predicate-threw"
      }
    );
  }
  if (!predicate.matches) {
    return semanticEventIgnored({
      listenerId:
        listener.id,
      reason:
        "listener-predicate-did-not-match"
    });
  }
  try {
    const rawResult =
      await listener.handler(
        createSemanticEventListenerPayload(
          event,
          {
            listener,
            previousResults,
            signal,
            metadata
          }
        )
      );
    return normalizeListenerResult(
      rawResult,
      listener,
      event
    );
  } catch (error) {
    return createListenerFailureResult(
      listener,
      error
    );
  }
}
/* ============================================================
   ONCE-ONLY CONSUMPTION
   ============================================================ */
/**
 * @section once-only-consumption
 *
 * Once-only listener is consumed after actual handler execution.
 *
 * Predicate miss does not consume it.
 */
function shouldConsumeOnceListener(
  listener,
  result
) {
  if (!listener.once) {
    return false;
  }
  return (
    result.status !==
      SEMANTIC_EVENT_LISTENER_STATUS.IGNORED ||
    result.reason !==
      "listener-predicate-did-not-match"
  );
}
/* ============================================================
   PROPAGATION INTERPRETATION
   ============================================================ */
/**
 * @section propagation-interpretation
 */
function interpretPropagation(
  event,
  result
) {
  switch (
    result.propagation
  ) {
    case SEMANTIC_EVENT_PROPAGATION.STOP:
      return Object.freeze({
        stop:
          true,
        veto:
          false
      });
    case SEMANTIC_EVENT_PROPAGATION.VETO:
      return Object.freeze({
        stop:
          true,
        veto:
          event.deliveryMode ===
          SEMANTIC_EVENT_DELIVERY_MODE.VETOABLE
      });
    case SEMANTIC_EVENT_PROPAGATION.CONTINUE:
    default:
      return Object.freeze({
        stop:
          false,
        veto:
          false
      });
  }
}
/* ============================================================
   DISPATCH STATUS DERIVATION
   ============================================================ */
/**
 * @section dispatch-status-derivation
 */
function deriveDispatchStatus(
  event,
  results,
  {
    vetoed = false,
    aborted = false
  } = {}
) {
  if (vetoed) {
    return SEMANTIC_EVENT_DISPATCH_STATUS.VETOED;
  }
  if (aborted) {
    return SEMANTIC_EVENT_DISPATCH_STATUS.FAILED;
  }
  const failed =
    results.filter(
      result =>
        result.status ===
        SEMANTIC_EVENT_LISTENER_STATUS.FAILED
    );
  if (
    failed.length === 0
  ) {
    return SEMANTIC_EVENT_DISPATCH_STATUS.DISPATCHED;
  }
  if (
    event.deliveryMode ===
      SEMANTIC_EVENT_DELIVERY_MODE.OBSERVATIONAL
  ) {
    return SEMANTIC_EVENT_DISPATCH_STATUS.PARTIAL;
  }
  if (
    failed.length <
    results.length
  ) {
    return SEMANTIC_EVENT_DISPATCH_STATUS.PARTIAL;
  }
  return SEMANTIC_EVENT_DISPATCH_STATUS.FAILED;
}
/* ============================================================
   PRIMARY EVENT DISPATCH
   ============================================================ */
/**
 * @section primary-event-dispatch
 *
 * Canonical delivery sequence:
 *
 * structural registry match
 * → async predicate
 * → ordered listener invocation
 * → normalize result
 * → consume once listener
 * → interpret propagation
 * → aggregate dispatch result
 */
export async function dispatchSemanticEvent(
  event,
  {
    signal = null,
    metadata = {}
  } = {}
) {
  if (!event) {
    throw new TypeError(
      "dispatchSemanticEvent requires SemanticEvent."
    );
  }
  const startedAt =
    nowTimestamp();
  if (isAbortRequested(signal)) {
    return semanticEventDispatchFailed({
      event,
      listenerResults:
        [],
      startedAt,
      finishedAt:
        nowTimestamp(),
      reason:
        "semantic-event-dispatch-aborted",
      error:
        getAbortReason(
          signal
        )
    });
  }
  const listeners =
    getMatchingSemanticEventListeners(
      event
    );
  if (
    listeners.length === 0
  ) {
    return semanticEventDispatchNoListeners({
      event,
      listenerResults:
        [],
      startedAt,
      finishedAt:
        nowTimestamp(),
      metadata
    });
  }
  const results = [];
  let vetoed =
    false;
  let stopped =
    false;
  let aborted =
    false;
  for (
    const listener of
      listeners
  ) {
    if (isAbortRequested(signal)) {
      aborted =
        true;
      break;
    }
    const result =
      await invokeSemanticEventListener(
        listener,
        event,
        {
          previousResults:
            results,
          signal,
          metadata
        }
      );
    results.push(
      result
    );
    if (
      shouldConsumeOnceListener(
        listener,
        result
      )
    ) {
      consumeSemanticEventListener(
        listener.id
      );
    }
    const propagation =
      interpretPropagation(
        event,
        result
      );
    if (propagation.veto) {
      vetoed =
        true;
      stopped =
        true;
      break;
    }
    if (propagation.stop) {
      stopped =
        true;
      break;
    }
  }
  const finishedAt =
    nowTimestamp();
  if (aborted) {
    return semanticEventDispatchFailed({
      event,
      listenerResults:
        results,
      startedAt,
      finishedAt,
      reason:
        "semantic-event-dispatch-aborted",
      error:
        getAbortReason(
          signal
        ),
      metadata: {
        ...metadata,
        stopped
      }
    });
  }
  if (vetoed) {
    return semanticEventDispatchVetoed({
      event,
      listenerResults:
        results,
      startedAt,
      finishedAt,
      reason:
        "semantic-event-vetoed",
      metadata: {
        ...metadata,
        stopped:
          true
      }
    });
  }
  const status =
    deriveDispatchStatus(
      event,
      results,
      {
        vetoed,
        aborted
      }
    );
  switch (status) {
    case SEMANTIC_EVENT_DISPATCH_STATUS.PARTIAL:
      return semanticEventDispatchPartial({
        event,
        listenerResults:
          results,
        startedAt,
        finishedAt,
        metadata: {
          ...metadata,
          stopped
        }
      });
    case SEMANTIC_EVENT_DISPATCH_STATUS.FAILED:
      return semanticEventDispatchFailed({
        event,
        listenerResults:
          results,
        startedAt,
        finishedAt,
        reason:
          "semantic-event-dispatch-failed",
        metadata: {
          ...metadata,
          stopped
        }
      });
    case SEMANTIC_EVENT_DISPATCH_STATUS.DISPATCHED:
    default:
      return semanticEventDispatchSucceeded({
        event,
        listenerResults:
          results,
        startedAt,
        finishedAt,
        metadata: {
          ...metadata,
          stopped
        }
      });
  }
}
/* ============================================================
   MULTI-EVENT DISPATCH
   ============================================================ */
/**
 * @section multi-event-dispatch
 *
 * Sequential by default to preserve semantic ordering.
 */
export async function dispatchSemanticEvents(
  events,
  {
    signal = null,
    stopOnFailure = false,
    stopOnVeto = true,
    metadata = {}
  } = {}
) {
  const normalizedEvents =
    normalizeArray(
      events
    );
  const results = [];
  for (
    const event of
      normalizedEvents
  ) {
    const result =
      await dispatchSemanticEvent(
        event,
        {
          signal,
          metadata
        }
      );
    results.push(
      result
    );
    if (
      stopOnVeto &&
      result.status ===
        SEMANTIC_EVENT_DISPATCH_STATUS.VETOED
    ) {
      break;
    }
    if (
      stopOnFailure &&
      result.status ===
        SEMANTIC_EVENT_DISPATCH_STATUS.FAILED
    ) {
      break;
    }
    if (isAbortRequested(signal)) {
      break;
    }
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   OBSERVATIONAL DISPATCH
   ============================================================ */
/**
 * @section observational-dispatch
 *
 * Convenience assertion for post-resolution semantic events.
 */
export async function dispatchObservationalSemanticEvent(
  event,
  options = {}
) {
  if (
    event.deliveryMode !==
    SEMANTIC_EVENT_DELIVERY_MODE.OBSERVATIONAL
  ) {
    throw new TypeError(
      "dispatchObservationalSemanticEvent requires OBSERVATIONAL event."
    );
  }
  return dispatchSemanticEvent(
    event,
    options
  );
}
/* ============================================================
   VETOABLE DISPATCH
   ============================================================ */
/**
 * @section vetoable-dispatch
 *
 * Convenience boundary for true pre-resolution veto checks.
 */
export async function dispatchVetoableSemanticEvent(
  event,
  options = {}
) {
  if (
    event.deliveryMode !==
    SEMANTIC_EVENT_DELIVERY_MODE.VETOABLE
  ) {
    throw new TypeError(
      "dispatchVetoableSemanticEvent requires VETOABLE event."
    );
  }
  return dispatchSemanticEvent(
    event,
    options
  );
}
/* ============================================================
   COORDINATED DISPATCH
   ============================================================ */
/**
 * @section coordinated-dispatch
 */
export async function dispatchCoordinatedSemanticEvent(
  event,
  options = {}
) {
  if (
    event.deliveryMode !==
    SEMANTIC_EVENT_DELIVERY_MODE.COORDINATED
  ) {
    throw new TypeError(
      "dispatchCoordinatedSemanticEvent requires COORDINATED event."
    );
  }
  return dispatchSemanticEvent(
    event,
    options
  );
}
/* ============================================================
   HANDLED RESULT ACCESS
   ============================================================ */
/**
 * @section handled-result-access
 */
export function getHandledSemanticEventResults(
  dispatchResult
) {
  return Object.freeze(
    (
      dispatchResult
        ?.listenerResults ??
      []
    )
      .filter(
        result =>
          result.status ===
          SEMANTIC_EVENT_LISTENER_STATUS.HANDLED
      )
  );
}
export function getFailedSemanticEventResults(
  dispatchResult
) {
  return Object.freeze(
    (
      dispatchResult
        ?.listenerResults ??
      []
    )
      .filter(
        result =>
          result.status ===
          SEMANTIC_EVENT_LISTENER_STATUS.FAILED
      )
  );
}
export function getVetoingSemanticEventResult(
  dispatchResult
) {
  return (
    (
      dispatchResult
        ?.listenerResults ??
      []
    )
      .find(
        result =>
          result.status ===
            SEMANTIC_EVENT_LISTENER_STATUS.VETOED ||
          result.propagation ===
            SEMANTIC_EVENT_PROPAGATION.VETO
      ) ??
    null
  );
}
/* ============================================================
   DISPATCH PREDICATES
   ============================================================ */
/**
 * @section dispatch-predicates
 */
export function didSemanticEventDispatchSucceed(
  result
) {
  return Boolean(
    result &&
    (
      result.status ===
        SEMANTIC_EVENT_DISPATCH_STATUS.DISPATCHED ||
      result.status ===
        SEMANTIC_EVENT_DISPATCH_STATUS.NO_LISTENERS
    )
  );
}
export function wasSemanticEventDispatchPartial(
  result
) {
  return (
    result?.status ===
    SEMANTIC_EVENT_DISPATCH_STATUS.PARTIAL
  );
}
export function wasSemanticEventVetoed(
  result
) {
  return (
    result?.status ===
    SEMANTIC_EVENT_DISPATCH_STATUS.VETOED
  );
}
export function didSemanticEventDispatchFail(
  result
) {
  return (
    result?.status ===
    SEMANTIC_EVENT_DISPATCH_STATUS.FAILED
  );
}
/* ============================================================
   OBSERVATIONAL DELIVERY NOTES
   ============================================================ */
/**
 * @section observational-delivery-notes
 *
 * OBSERVATIONAL is the default.
 *
 * Example:
 *
 * native attack already hit
 * → attack.hit emitted
 * → one Talent listener throws
 *
 * The attack did not retroactively miss.
 *
 * Dispatch result:
 *
 * PARTIAL
 *
 * Original transaction truth remains unchanged.
 *
 * A listener may start a child execution transaction if its mechanic
 * requires further resolution.
 */
/* ============================================================
   COORDINATED DELIVERY NOTES
   ============================================================ */
/**
 * @section coordinated-delivery-notes
 *
 * COORDINATED events collect listener responses for an owning resolver.
 *
 * Example future use:
 *
 * damage modifiers
 * targeting modifiers
 * competing feature contributions
 *
 * Dispatcher collects results.
 *
 * Owning service determines how contributions combine.
 *
 * Dispatcher itself does not apply tabletop combination rules.
 */
/* ============================================================
   VETOABLE DELIVERY NOTES
   ============================================================ */
/**
 * @section vetoable-delivery-notes
 *
 * Only VETOABLE events treat:
 *
 * propagation = VETO
 *
 * as a semantic veto.
 *
 * For OBSERVATIONAL/COORDINATED events:
 *
 * VETO behaves only as stop-propagation and cannot undo established
 * mechanics.
 *
 * Use VETOABLE only before irreversible execution.
 */
/* ============================================================
   STOP PROPAGATION NOTES
   ============================================================ */
/**
 * @section stop-propagation-notes
 *
 * STOP:
 *
 * stop invoking later listeners
 *
 * does NOT mean:
 *
 * action blocked
 * action failed
 * event vetoed
 *
 * Dispatch may still be successful.
 */
/* ============================================================
   PREDICATE FAILURE NOTES
   ============================================================ */
/**
 * @section predicate-failure-notes
 *
 * Predicate exception:
 *
 * → normalized listener FAILED result
 *
 * OBSERVATIONAL:
 * dispatch continues
 *
 * COORDINATED:
 * dispatch continues unless some later explicit rule decides otherwise
 *
 * VETOABLE:
 * predicate failure is NOT automatically a veto
 *
 * This avoids treating bugs as tabletop rules.
 */
/* ============================================================
   LISTENER FAILURE NOTES
   ============================================================ */
/**
 * @section listener-failure-notes
 *
 * Listener exception:
 *
 * → SemanticEventListenerResult {
 *      status: FAILED
 *    }
 *
 * Dispatcher does not throw by default.
 *
 * This preserves observability and permits other listeners to execute.
 *
 * Callers inspect final dispatch result.
 */
/* ============================================================
   ONCE LISTENER NOTES
   ============================================================ */
/**
 * @section once-listener-notes
 *
 * once-only listener:
 *
 * predicate false
 * → remains registered
 *
 * handler invoked
 * → consumed after invocation
 *
 * handler throws
 * → still consumed
 *
 * because it did execute.
 */
/* ============================================================
   EVENT-TRIGGERED FEATURE NOTES
   ============================================================ */
/**
 * @section event-triggered-feature-notes
 *
 * actor_owned_feature_registry may register a listener:
 *
 * attack.hit
 * → matching owned feature
 *
 * Handler should not directly bypass execution infrastructure.
 *
 * If feature produces another action/effect:
 *
 * build child ExecutionContext
 * → execution_transaction
 *
 * This preserves:
 *
 * resource validation
 * action economy
 * lifecycle
 * lineage
 * diagnostics
 */
/* ============================================================
   LIFECYCLE SERVICE NOTES
   ============================================================ */
/**
 * @section lifecycle-service-notes
 *
 * lifecycle_service can consume events through normal listener delivery.
 *
 * Example:
 *
 * full-repair.completed
 * → reset relevant Frame Conn resources
 *
 * turn.started
 * → initialize action economy
 *
 * Semantic event dispatcher does not decide what resets.
 */
/* ============================================================
   EXECUTION TRANSACTION NOTES
   ============================================================ */
/**
 * @section execution-transaction-notes
 *
 * semantic-event-hooks.js will convert stable transaction hook boundaries
 * into events and dispatch through this file.
 *
 * Most execution lifecycle events are OBSERVATIONAL.
 *
 * Therefore event listener failures cannot rewrite transaction outcome.
 */
/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */
/**
 * @section system-bridge-notes
 *
 * system_bridge may supply:
 *
 * trigger kind
 * listener priority
 * event predicate metadata
 *
 * Owning modules convert those descriptors into registered listeners.
 *
 * Dispatcher remains unaware of registry augmentation provenance.
 */
/* ============================================================
   DISPATCH DIAGNOSTICS
   ============================================================ */
/**
 * @section dispatch-diagnostics
 */
export function getSemanticEventDispatchDiagnostics(
  result
) {
  if (!result) {
    return null;
  }
  return Object.freeze({
    eventId:
      result
        ?.event
        ?.identity
        ?.eventId ??
      null,
    kind:
      result
        ?.event
        ?.kind ??
      null,
    deliveryMode:
      result
        ?.event
        ?.deliveryMode ??
      null,
    status:
      result.status,
    listenerCount:
      result
        ?.listenerResults
        ?.length ??
      0,
    handledCount:
      (
        result.listenerResults ??
        []
      )
        .filter(
          entry =>
            entry.status ===
            SEMANTIC_EVENT_LISTENER_STATUS.HANDLED
        )
        .length,
    failedCount:
      (
        result.listenerResults ??
        []
      )
        .filter(
          entry =>
            entry.status ===
            SEMANTIC_EVENT_LISTENER_STATUS.FAILED
        )
        .length,
    vetoed:
      result.status ===
      SEMANTIC_EVENT_DISPATCH_STATUS.VETOED,
    startedAt:
      result.startedAt,
    finishedAt:
      result.finishedAt
  });
}
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Registry owns listener selection; dispatcher owns listener execution.
 *
 * INVARIANT 2
 * Structural match occurs before async predicate evaluation.
 *
 * INVARIANT 3
 * Listener execution preserves deterministic registry ordering.
 *
 * INVARIANT 4
 * Listener exceptions normalize to FAILED listener results.
 *
 * INVARIANT 5
 * Predicate exceptions normalize to FAILED listener results.
 *
 * INVARIANT 6
 * Observational listener failure does not rewrite originating mechanical
 * truth.
 *
 * INVARIANT 7
 * VETO only has mechanical meaning for VETOABLE events.
 *
 * INVARIANT 8
 * STOP ends listener propagation without implying failure or veto.
 *
 * INVARIANT 9
 * Once-only listeners are consumed after handler execution.
 *
 * INVARIANT 10
 * Predicate misses do not consume once-only listeners.
 *
 * INVARIANT 11
 * Event-triggered mechanics should enter normal child execution
 * transactions rather than bypassing execution infrastructure.
 *
 * INVARIANT 12
 * Dispatcher does not implement feature combination rules.
 *
 * INVARIANT 13
 * Dispatcher does not own lifecycle timing.
 *
 * INVARIANT 14
 * Dispatcher does not mutate SemanticEvent.
 *
 * INVARIANT 15
 * system_bridge may describe event behavior but dispatcher remains generic.
 */