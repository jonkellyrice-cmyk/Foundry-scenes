/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/lifecycle_service/lifecycle-dispatcher.js
 */
/**
 * @file
 * @path main/lifecycle_service/lifecycle-dispatcher.js
 * @module lifecycle-dispatcher
 * @layer lifecycle-service-dispatch
 * @responsibility resolve-due-lifecycle-entries-and-delegate-owned-lifecycle-operations
 * @public-boundary false
 * @side-effects delegated-lifecycle-owned-state-mutation
 *
 * @depends-on
 * - lifecycle-contract
 * - lifecycle-state
 * - action_economy/action-economy
 * - resource_service/resource-service
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes LifecycleContext from lifecycle-hooks.js
 * - consumes lifecycle-managed entries from lifecycle-state.js
 * - delegates action-economy resets/end-state to action_economy/
 * - delegates resource resets/restores to resource_service/
 * - future status/native operation adapters may be injected here
 * - consumed by lifecycle-hooks.js
 * - consumed by lifecycle-service.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - lifecycle_service owns WHEN lifecycle work occurs
 * - resource_service owns resource mutation semantics
 * - action_economy owns action-economy mutation semantics
 * - native_adapter remains native Lancer authority
 * - lifecycle-state stores timing metadata only
 *
 * THIS FILE OWNS:
 * - due-entry resolution
 * - async lifecycle match predicates
 * - lifecycle operation routing
 * - native-authority verify/skip behavior
 * - reset/expiration delegation
 * - lifecycle result aggregation
 * - entry terminal-state updates after successful lifecycle handling
 *
 * THIS FILE DOES NOT OWN:
 * - lifecycle boundary detection
 * - lifecycle persistence adapter
 * - resource implementation details
 * - action-economy implementation details
 * - native status mutation implementation
 * - semantic event dispatch
 * - feature-specific rules
 *
 * EDIT CONTRACT:
 * - never mutate authoritative mechanic state directly
 * - delegate to owning foundational service
 * - native-owned transitions must not be duplicated
 * - mark lifecycle entry complete only after successful handling
 * - preserve partial failure truth
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  LIFECYCLE_AUTHORITY,
  LIFECYCLE_BOUNDARY,
  LIFECYCLE_DISPATCH_STATUS,
  LIFECYCLE_OPERATION,
  LIFECYCLE_RESULT_STATUS,
  LIFECYCLE_SCOPE,
  LIFECYCLE_SUBJECT_KIND,
  createLifecycleOperationRequest,
  lifecycleDispatchCompleted,
  lifecycleDispatchFailed,
  lifecycleDispatchNothing,
  lifecycleDispatchPartial,
  lifecycleOperationFailed,
  lifecycleOperationNoMatch,
  lifecycleOperationSkipped,
  lifecycleOperationSucceeded
} from "./lifecycle-contract.js";
import {
  LIFECYCLE_ENTRY_STATUS,
  getActiveLifecycleEntries,
  isLifecycleEntryDue,
  markLifecycleEntryExpired,
  markLifecycleEntryReset,
  removeLifecycleEntry
} from "./lifecycle-state.js";
import {
  endActionEconomyTurn,
  initializeActionEconomyTurn,
  restoreActionEconomyReaction
} from "../action_economy/action-economy.js";
import {
  RESOURCE_OPERATION,
  commitDeferredResource,
  createResourceDescriptor,
  createResourceIdentity,
  createResourceMutation,
  resolveExecutionResourceSnapshot
} from "../resource_service/resource-service.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const LIFECYCLE_DISPATCHER_MODULE_ID =
  "lancer-frame-conn.lifecycle-dispatcher";
export const LIFECYCLE_DISPATCHER_MODULE_VERSION =
  1;
/* ============================================================
   INJECTED OPERATION ADAPTERS
   ============================================================ */
/**
 * @section injected-operation-adapters
 *
 * Resource/action economy already have public foundational services.
 *
 * Status/condition/effect/NHP lifecycle mutation does not yet have one
 * universal public service, so these are injected.
 */
let lifecycleOperationAdapters =
  Object.freeze({
    status:
      null,
    condition:
      null,
    effect:
      null,
    feature:
      null,
    preparedAction:
      null,
    grantedAction:
      null,
    movement:
      null,
    nhp:
      null,
    nativeVerifier:
      null
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
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function normalizeError(
  error,
  fallbackMessage
) {
  if (error instanceof Error) {
    return error;
  }
  return new Error(
    fallbackMessage ??
    String(error)
  );
}
function getLifecycleActorReference(
  lifecycleContext
) {
  return (
    lifecycleContext?.actor ??
    lifecycleContext?.metadata?.actorReference ??
    null
  );
}
/* ============================================================
   OPERATION ADAPTER CONFIGURATION
   ============================================================ */
export function setLifecycleOperationAdapters(
  adapters = {}
) {
  if (!isObject(adapters)) {
    throw new TypeError(
      "Lifecycle operation adapters must be object."
    );
  }
  lifecycleOperationAdapters =
    Object.freeze({
      ...lifecycleOperationAdapters,
      ...adapters
    });
  return true;
}
export function getLifecycleOperationAdapters() {
  return lifecycleOperationAdapters;
}
/* ============================================================
   MATCH PREDICATE EVALUATION
   ============================================================ */
/**
 * @section match-predicate-evaluation
 *
 * Structural timing match is owned by lifecycle-state.js.
 *
 * Async custom predicate is evaluated here.
 */
async function evaluateLifecyclePredicate(
  entry,
  lifecycleContext
) {
  const predicate =
    entry
      ?.descriptor
      ?.predicate ??
    entry
      ?.descriptor
      ?.match
      ?.predicate ??
    null;
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
  try {
    return Object.freeze({
      matches:
        Boolean(
          await predicate(
            lifecycleContext,
            entry
          )
        ),
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
   DUE ENTRY RESOLUTION
   ============================================================ */
/**
 * @section due-entry-resolution
 */
export async function resolveDueLifecycleEntries(
  actorReference,
  lifecycleContext
) {
  if (!lifecycleContext) {
    throw new TypeError(
      "resolveDueLifecycleEntries requires LifecycleContext."
    );
  }
  const entries =
    await getActiveLifecycleEntries(
      actorReference
    );
  const matched = [];
  for (
    const entry of
      entries
  ) {
    if (
      !isLifecycleEntryDue(
        entry,
        lifecycleContext
      )
    ) {
      continue;
    }
    const predicate =
      await evaluateLifecyclePredicate(
        entry,
        lifecycleContext
      );
    if (predicate.error) {
      matched.push(
        Object.freeze({
          entry,
          predicateError:
            predicate.error
        })
      );
      continue;
    }
    if (!predicate.matches) {
      continue;
    }
    matched.push(
      Object.freeze({
        entry,
        predicateError:
          null
      })
    );
  }
  return Object.freeze(
    matched
  );
}
/* ============================================================
   RESOURCE RESET DESCRIPTOR ADAPTER
   ============================================================ */
/**
 * @section resource-reset-descriptor-adapter
 *
 * Lifecycle subjectId becomes resource identity.
 *
 * Runtime augmentation should preserve enough metadata for actual storage
 * resolution.
 */
function createLifecycleResourceDescriptor(
  entry,
  lifecycleContext
) {
  const descriptor =
    entry.descriptor;
  const resourceIdentity =
    descriptor
      ?.metadata
      ?.resourceIdentity ??
    {
      id:
        descriptor.subjectId,
      kind:
        descriptor
          ?.metadata
          ?.resourceKind ??
        "custom",
      authority:
        descriptor.authority ===
        LIFECYCLE_AUTHORITY.NATIVE
          ? "native"
          : "frame-conn",
      actorUuid:
        descriptor.actorUuid ??
        lifecycleContext
          ?.identity
          ?.actorUuid ??
        null,
      itemUuid:
        descriptor
          ?.metadata
          ?.itemUuid ??
        null,
      itemLid:
        descriptor
          ?.metadata
          ?.itemLid ??
        null,
      key:
        descriptor
          ?.metadata
          ?.resourceKey ??
        null,
      sourceKind:
        descriptor
          ?.metadata
          ?.resourceSourceKind ??
        "supplemental"
    };
  return createResourceDescriptor({
    identity:
      createResourceIdentity(
        resourceIdentity
      ),
    consumption:
      descriptor
        ?.metadata
        ?.resourceConsumption ??
      "deferred",
    resetScope:
      descriptor.scope,
    mutation:
      createResourceMutation({
        operation:
          mapLifecycleOperationToResourceOperation(
            descriptor.operation
          ),
        value:
          descriptor.value,
        amount:
          descriptor
            ?.metadata
            ?.amount ??
          null
      }),
    required:
      false,
    metadata: {
      lifecycleEntryId:
        entry.id,
      lifecycle:
        true,
      ...(
        descriptor.metadata ??
        {}
      )
    }
  });
}
/* ============================================================
   RESOURCE OPERATION MAPPING
   ============================================================ */
function mapLifecycleOperationToResourceOperation(
  operation
) {
  switch (operation) {
    case LIFECYCLE_OPERATION.RESTORE:
      return RESOURCE_OPERATION.RESTORE;
    case LIFECYCLE_OPERATION.RESET:
      return RESOURCE_OPERATION.RESET;
    case LIFECYCLE_OPERATION.ENABLE:
      return RESOURCE_OPERATION.SET;
    case LIFECYCLE_OPERATION.DISABLE:
      return RESOURCE_OPERATION.SET;
    default:
      return RESOURCE_OPERATION.RESET;
  }
}
/* ============================================================
   RESOURCE LIFECYCLE OPERATION
   ============================================================ */
async function executeResourceLifecycleOperation(
  request
) {
  const {
    descriptor,
    context
  } =
    request;
  const actorReference =
    getLifecycleActorReference(
      context
    );
  if (!actorReference) {
    return lifecycleOperationFailed({
      operation:
        request.operation,
      descriptor,
      reason:
        "lifecycle-resource-actor-unavailable"
    });
  }
  const resourceDescriptor =
    createLifecycleResourceDescriptor(
      {
        id:
          descriptor.id,
        descriptor
      },
      context
    );
  try {
    const before =
      await resolveExecutionResourceSnapshot(
        {
          actors: {
            actor:
              actorReference
          },
          metadata: {
            lifecycle:
              true
          }
        },
        resourceDescriptor
      );
    const result =
      await commitDeferredResource(
        {
          actors: {
            actor:
              actorReference
          },
          metadata: {
            lifecycle:
              true
          }
        },
        resourceDescriptor,
        {
          before,
          frameConnWriter:
            context
              ?.metadata
              ?.frameConnResourceWriter ??
            null
        }
      );
    if (
      result?.status ===
      "succeeded"
    ) {
      return lifecycleOperationSucceeded({
        operation:
          request.operation,
        descriptor,
        before,
        after:
          result.after,
        metadata: {
          resourceResult:
            result
        }
      });
    }
    return lifecycleOperationFailed({
      operation:
        request.operation,
      descriptor,
      before,
      after:
        result?.after ??
        null,
      reason:
        result?.reason ??
        "resource-lifecycle-operation-failed",
      error:
        result?.error ??
        null,
      metadata: {
        resourceResult:
          result
      }
    });
  } catch (error) {
    return lifecycleOperationFailed({
      operation:
        request.operation,
      descriptor,
      reason:
        "resource-lifecycle-operation-threw",
      error
    });
  }
}
/* ============================================================
   ACTION ECONOMY LIFECYCLE OPERATION
   ============================================================ */
/**
 * @section action-economy-lifecycle-operation
 */
async function executeActionEconomyLifecycleOperation(
  request
) {
  const actorReference =
    getLifecycleActorReference(
      request.context
    );
  if (!actorReference) {
    return lifecycleOperationFailed({
      operation:
        request.operation,
      descriptor:
        request.descriptor,
      reason:
        "lifecycle-action-economy-actor-unavailable"
    });
  }
  try {
    let result;
    switch (
      request.context.boundary
    ) {
      case LIFECYCLE_BOUNDARY.TURN_STARTED:
        result =
          await initializeActionEconomyTurn(
            actorReference,
            {
              turnId:
                request.context
                  ?.identity
                  ?.turnId ??
                null,
              round:
                request.context
                  ?.identity
                  ?.round ??
                null
            }
          );
        break;
      case LIFECYCLE_BOUNDARY.TURN_ENDED:
        result =
          await endActionEconomyTurn(
            actorReference
          );
        break;
      default:
        if (
          request
            .descriptor
            .subjectKind ===
          LIFECYCLE_SUBJECT_KIND.REACTION
        ) {
          result =
            await restoreActionEconomyReaction(
              actorReference
            );
        } else {
          return lifecycleOperationSkipped({
            operation:
              request.operation,
            descriptor:
              request.descriptor,
            reason:
              "no-action-economy-lifecycle-handler"
          });
        }
        break;
    }
    return lifecycleOperationSucceeded({
      operation:
        request.operation,
      descriptor:
        request.descriptor,
      after:
        result
    });
  } catch (error) {
    return lifecycleOperationFailed({
      operation:
        request.operation,
      descriptor:
        request.descriptor,
      reason:
        "action-economy-lifecycle-operation-failed",
      error
    });
  }
}
/* ============================================================
   INJECTED SUBJECT OPERATION
   ============================================================ */
async function executeInjectedLifecycleOperation(
  adapterName,
  request
) {
  const adapter =
    lifecycleOperationAdapters[
      adapterName
    ];
  if (
    typeof adapter !==
    "function"
  ) {
    return lifecycleOperationSkipped({
      operation:
        request.operation,
      descriptor:
        request.descriptor,
      reason:
        `lifecycle-adapter-unavailable:${adapterName}`
    });
  }
  try {
    const result =
      await adapter(
        request
      );
    return lifecycleOperationSucceeded({
      operation:
        request.operation,
      descriptor:
        request.descriptor,
      after:
        result
    });
  } catch (error) {
    return lifecycleOperationFailed({
      operation:
        request.operation,
      descriptor:
        request.descriptor,
      reason:
        `lifecycle-adapter-failed:${adapterName}`,
      error
    });
  }
}
/* ============================================================
   NATIVE AUTHORITY HANDLING
   ============================================================ */
/**
 * @section native-authority-handling
 *
 * Native-owned lifecycle state is observed/verified only.
 */
async function executeNativeLifecycleVerification(
  request
) {
  const verifier =
    lifecycleOperationAdapters
      .nativeVerifier;
  if (
    typeof verifier !==
    "function"
  ) {
    return lifecycleOperationSkipped({
      operation:
        LIFECYCLE_OPERATION.VERIFY,
      descriptor:
        request.descriptor,
      reason:
        "native-lifecycle-verifier-unavailable"
    });
  }
  try {
    const verified =
      await verifier(
        request
      );
    if (!verified) {
      return lifecycleOperationFailed({
        operation:
          LIFECYCLE_OPERATION.VERIFY,
        descriptor:
          request.descriptor,
        reason:
          "native-lifecycle-transition-not-verified"
      });
    }
    return lifecycleOperationSucceeded({
      operation:
        LIFECYCLE_OPERATION.VERIFY,
      descriptor:
        request.descriptor,
      metadata: {
        nativeVerified:
          true
      }
    });
  } catch (error) {
    return lifecycleOperationFailed({
      operation:
        LIFECYCLE_OPERATION.VERIFY,
      descriptor:
        request.descriptor,
      reason:
        "native-lifecycle-verification-failed",
      error
    });
  }
}
/* ============================================================
   SINGLE ENTRY OPERATION ROUTING
   ============================================================ */
/**
 * @section single-entry-operation-routing
 */
export async function executeLifecycleEntryOperation(
  entry,
  lifecycleContext
) {
  if (!entry) {
    throw new TypeError(
      "executeLifecycleEntryOperation requires lifecycle entry."
    );
  }
  if (!lifecycleContext) {
    throw new TypeError(
      "executeLifecycleEntryOperation requires LifecycleContext."
    );
  }
  const descriptor =
    entry.descriptor;
  const operation =
    descriptor.operation ??
    (
      descriptor.removeOnExpire
        ? LIFECYCLE_OPERATION.EXPIRE
        : LIFECYCLE_OPERATION.RESET
    );
  const request =
    createLifecycleOperationRequest({
      operation,
      descriptor,
      context:
        lifecycleContext,
      metadata: {
        lifecycleEntryId:
          entry.id
      }
    });
  if (
    descriptor.authority ===
    LIFECYCLE_AUTHORITY.NATIVE
  ) {
    return executeNativeLifecycleVerification(
      request
    );
  }
  switch (
    descriptor.subjectKind
  ) {
    case LIFECYCLE_SUBJECT_KIND.RESOURCE:
      return executeResourceLifecycleOperation(
        request
      );
    case LIFECYCLE_SUBJECT_KIND.ACTION_ECONOMY:
    case LIFECYCLE_SUBJECT_KIND.REACTION:
      return executeActionEconomyLifecycleOperation(
        request
      );
    case LIFECYCLE_SUBJECT_KIND.STATUS:
      return executeInjectedLifecycleOperation(
        "status",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.CONDITION:
      return executeInjectedLifecycleOperation(
        "condition",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.EFFECT:
      return executeInjectedLifecycleOperation(
        "effect",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.FEATURE:
      return executeInjectedLifecycleOperation(
        "feature",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.PREPARED_ACTION:
      return executeInjectedLifecycleOperation(
        "preparedAction",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.GRANTED_ACTION:
      return executeInjectedLifecycleOperation(
        "grantedAction",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.MOVEMENT:
      return executeInjectedLifecycleOperation(
        "movement",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.NHP:
      return executeInjectedLifecycleOperation(
        "nhp",
        request
      );
    case LIFECYCLE_SUBJECT_KIND.CUSTOM:
    default:
      return lifecycleOperationSkipped({
        operation,
        descriptor,
        reason:
          "no-lifecycle-operation-handler"
      });
  }
}
/* ============================================================
   ENTRY TERMINAL STATE UPDATE
   ============================================================ */
/**
 * @section entry-terminal-state-update
 */
async function finalizeLifecycleEntry(
  actorReference,
  entry,
  result
) {
  if (
    result.status !==
    LIFECYCLE_RESULT_STATUS.SUCCEEDED
  ) {
    return entry;
  }
  const descriptor =
    entry.descriptor;
  if (
    descriptor.removeOnExpire &&
    descriptor
      ?.metadata
      ?.removeLifecycleEntryAfterSuccess ===
      true
  ) {
    await removeLifecycleEntry(
      actorReference,
      entry.id
    );
    return null;
  }
  if (
    descriptor.removeOnExpire
  ) {
    return markLifecycleEntryExpired(
      actorReference,
      entry.id,
      {
        lifecycleOperation:
          result.operation
      }
    );
  }
  return markLifecycleEntryReset(
    actorReference,
    entry.id,
    {
      lifecycleOperation:
        result.operation
    }
  );
}
/* ============================================================
   PREDICATE ERROR RESULT
   ============================================================ */
function createPredicateFailureResult(
  entry,
  error
) {
  return lifecycleOperationFailed({
    operation:
      entry
        ?.descriptor
        ?.operation ??
      LIFECYCLE_OPERATION.NOTIFY,
    descriptor:
      entry?.descriptor,
    reason:
      "lifecycle-predicate-failed",
    error:
      normalizeError(
        error,
        "Lifecycle predicate failed."
      )
  });
}
/* ============================================================
   PRIMARY LIFECYCLE DISPATCH
   ============================================================ */
/**
 * @section primary-lifecycle-dispatch
 *
 * Order:
 *
 * 1. resolve active due entries
 * 2. execute each through owning service
 * 3. update lifecycle timing state on successful handling
 * 4. aggregate results
 */
export async function dispatchLifecycleContext(
  actorReference,
  lifecycleContext
) {
  if (!lifecycleContext) {
    throw new TypeError(
      "dispatchLifecycleContext requires LifecycleContext."
    );
  }
  let matched;
  try {
    matched =
      await resolveDueLifecycleEntries(
        actorReference,
        lifecycleContext
      );
  } catch (error) {
    return lifecycleDispatchFailed({
      context:
        lifecycleContext,
      reason:
        "lifecycle-entry-resolution-failed",
      error
    });
  }
  if (
    matched.length ===
    0
  ) {
    return lifecycleDispatchNothing({
      context:
        lifecycleContext,
      matched:
        [],
      results:
        []
    });
  }
  const results = [];
  for (
    const match of
      matched
  ) {
    const entry =
      match.entry;
    let result;
    if (
      match.predicateError
    ) {
      result =
        createPredicateFailureResult(
          entry,
          match.predicateError
        );
    } else {
      try {
        result =
          await executeLifecycleEntryOperation(
            entry,
            lifecycleContext
          );
      } catch (error) {
        result =
          lifecycleOperationFailed({
            operation:
              entry
                ?.descriptor
                ?.operation ??
              LIFECYCLE_OPERATION.NOTIFY,
            descriptor:
              entry.descriptor,
            reason:
              "lifecycle-operation-threw",
            error
          });
      }
    }
    results.push(
      result
    );
    if (
      result.status ===
      LIFECYCLE_RESULT_STATUS.SUCCEEDED
    ) {
      try {
        await finalizeLifecycleEntry(
          actorReference,
          entry,
          result
        );
      } catch (error) {
        results.push(
          lifecycleOperationFailed({
            operation:
              result.operation,
            descriptor:
              entry.descriptor,
            reason:
              "lifecycle-entry-finalization-failed",
            error
          })
        );
      }
    }
  }
  const failed =
    results.filter(
      result =>
        result.status ===
        LIFECYCLE_RESULT_STATUS.FAILED
    );
  const succeeded =
    results.filter(
      result =>
        result.status ===
        LIFECYCLE_RESULT_STATUS.SUCCEEDED
    );
  if (
    failed.length ===
    0
  ) {
    return lifecycleDispatchCompleted({
      context:
        lifecycleContext,
      matched:
        matched.map(
          value =>
            value.entry
        ),
      results
    });
  }
  if (
    succeeded.length > 0
  ) {
    return lifecycleDispatchPartial({
      context:
        lifecycleContext,
      matched:
        matched.map(
          value =>
            value.entry
        ),
      results,
      failed,
      reason:
        "lifecycle-dispatch-partial"
    });
  }
  return lifecycleDispatchFailed({
    context:
      lifecycleContext,
    matched:
      matched.map(
        value =>
          value.entry
      ),
    results,
    failed,
    reason:
      "lifecycle-dispatch-failed"
  });
}
/* ============================================================
   TURN START DISPATCH
   ============================================================ */
/**
 * @section turn-start-dispatch
 *
 * Turn action economy is a universal lifecycle operation and may need to
 * run even when no explicit lifecycle entry exists.
 */
export async function dispatchTurnStartedLifecycle(
  actorReference,
  lifecycleContext
) {
  try {
    await initializeActionEconomyTurn(
      actorReference,
      {
        turnId:
          lifecycleContext
            ?.identity
            ?.turnId ??
          null,
        round:
          lifecycleContext
            ?.identity
            ?.round ??
          null
      }
    );
  } catch (error) {
    return lifecycleDispatchFailed({
      context:
        lifecycleContext,
      reason:
        "turn-start-action-economy-initialization-failed",
      error
    });
  }
  return dispatchLifecycleContext(
    actorReference,
    lifecycleContext
  );
}
/* ============================================================
   TURN END DISPATCH
   ============================================================ */
export async function dispatchTurnEndedLifecycle(
  actorReference,
  lifecycleContext
) {
  const descriptorResult =
    await dispatchLifecycleContext(
      actorReference,
      lifecycleContext
    );
  try {
    await endActionEconomyTurn(
      actorReference
    );
  } catch (error) {
    if (
      descriptorResult.status ===
      LIFECYCLE_DISPATCH_STATUS.COMPLETED ||
      descriptorResult.status ===
      LIFECYCLE_DISPATCH_STATUS.NOTHING_TO_PROCESS
    ) {
      return lifecycleDispatchPartial({
        context:
          lifecycleContext,
        matched:
          descriptorResult.matched,
        results:
          descriptorResult.results,
        failed: [
          lifecycleOperationFailed({
            operation:
              LIFECYCLE_OPERATION.DISABLE,
            descriptor:
              null,
            reason:
              "turn-end-action-economy-failed",
            error
          })
        ],
        reason:
          "turn-end-lifecycle-partial"
      });
    }
  }
  return descriptorResult;
}
/* ============================================================
   UNIVERSAL BOUNDARY DISPATCH
   ============================================================ */
/**
 * @section universal-boundary-dispatch
 */
export async function dispatchLifecycleBoundary(
  actorReference,
  lifecycleContext
) {
  switch (
    lifecycleContext.boundary
  ) {
    case LIFECYCLE_BOUNDARY.TURN_STARTED:
      return dispatchTurnStartedLifecycle(
        actorReference,
        lifecycleContext
      );
    case LIFECYCLE_BOUNDARY.TURN_ENDED:
      return dispatchTurnEndedLifecycle(
        actorReference,
        lifecycleContext
      );
    default:
      return dispatchLifecycleContext(
        actorReference,
        lifecycleContext
      );
  }
}
/* ============================================================
   RESOURCE RESET NOTES
   ============================================================ */
/**
 * @section resource-reset-notes
 *
 * lifecycle-dispatcher determines:
 *
 * resource reset is due NOW.
 *
 * It does not own resource arithmetic/storage.
 *
 * Delegation:
 *
 * LifecycleDescriptor
 * → ResourceDescriptor
 * → resource_service
 *
 * Native resource resets should normally use:
 *
 * authority = NATIVE
 *
 * and therefore be verified/skipped rather than duplicated.
 */
/* ============================================================
   ACTION ECONOMY NOTES
   ============================================================ */
/**
 * @section action-economy-notes
 *
 * Universal turn boundaries:
 *
 * TURN_STARTED
 * → initializeActionEconomyTurn()
 *
 * TURN_ENDED
 * → endActionEconomyTurn()
 *
 * Reaction restoration may use explicit lifecycle descriptor:
 *
 * subjectKind = REACTION
 *
 * lifecycle-dispatcher then calls:
 *
 * restoreActionEconomyReaction()
 */
/* ============================================================
   STATUS / CONDITION NOTES
   ============================================================ */
/**
 * @section status-condition-notes
 *
 * Status/condition authority is not implemented directly here.
 *
 * Runtime composition injects:
 *
 * setLifecycleOperationAdapters({
 *   status(request) { ... },
 *   condition(request) { ... }
 * })
 *
 * Those adapters should delegate to the native/status boundary.
 */
/* ============================================================
   NATIVE AUTHORITY NOTES
   ============================================================ */
/**
 * @section native-authority-notes
 *
 * lifecycle descriptor:
 *
 * authority = NATIVE
 *
 * means:
 *
 * Frame Conn does NOT:
 *
 * remove
 * restore
 * reset
 * disable
 *
 * the native state a second time.
 *
 * Instead:
 *
 * nativeVerifier(request)
 *
 * may confirm the native transition.
 *
 * If no verifier exists, operation is SKIPPED rather than guessed.
 */
/* ============================================================
   FULL REPAIR NOTES
   ============================================================ */
/**
 * @section full-repair-notes
 *
 * FULL_REPAIR_COMPLETED may match:
 *
 * Frame Conn frequency resources
 * supplemental trait/talent/core bonus charges
 * other Frame Conn reset descriptors
 *
 * Native Limited/Core Energy resets should remain native-authority unless
 * the native system trace establishes a missing runtime path.
 */
/* ============================================================
   SCENE / ROUND NOTES
   ============================================================ */
/**
 * @section scene-round-notes
 *
 * ROUND_STARTED:
 *
 * reset once-per-round resources
 *
 * SCENE_STARTED / SCENE_ENDED:
 *
 * resolve scene-scoped descriptors according to explicit metadata
 *
 * Do not infer scene reset direction from scope alone once descriptors are
 * constructed.
 *
 * Descriptor.boundary remains authoritative.
 */
/* ============================================================
   ACTOR OWNED FEATURE NOTES
   ============================================================ */
/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry later supplies normalized descriptors such as:
 *
 * Talent:
 * 1/round use
 *
 * Trait:
 * temporary bonus until end of turn
 *
 * Core Bonus:
 * effect until scene end
 *
 * system_bridge may add missing lifecycle metadata.
 *
 * lifecycle-dispatcher executes all of these through generic subject
 * routing rather than per-feature branches.
 */
/* ============================================================
   SEMANTIC EVENT NOTES
   ============================================================ */
/**
 * @section semantic-event-notes
 *
 * lifecycle-hooks.js will translate semantic events into LifecycleContext:
 *
 * turn.started
 * turn.ended
 * round.started
 * round.ended
 * scene.started
 * scene.ended
 * full-repair.completed
 *
 * lifecycle-dispatcher does not subscribe to semantic_event_bus directly.
 *
 * Hooks own transport integration.
 */
/* ============================================================
   PARTIAL FAILURE NOTES
   ============================================================ */
/**
 * @section partial-failure-notes
 *
 * Lifecycle boundaries may affect many independent entries.
 *
 * Example:
 *
 * round starts:
 *
 * reset Talent A succeeds
 * reset Core Bonus B succeeds
 * reset custom Feature C fails
 *
 * Result:
 *
 * PARTIAL
 *
 * Successful lifecycle operations remain true.
 *
 * No global rollback is attempted.
 */
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
export function getLifecycleDispatcherDiagnostics() {
  return Object.freeze({
    id:
      LIFECYCLE_DISPATCHER_MODULE_ID,
    version:
      LIFECYCLE_DISPATCHER_MODULE_VERSION,
    adapters:
      Object.freeze({
        status:
          typeof lifecycleOperationAdapters.status ===
          "function",
        condition:
          typeof lifecycleOperationAdapters.condition ===
          "function",
        effect:
          typeof lifecycleOperationAdapters.effect ===
          "function",
        feature:
          typeof lifecycleOperationAdapters.feature ===
          "function",
        preparedAction:
          typeof lifecycleOperationAdapters.preparedAction ===
          "function",
        grantedAction:
          typeof lifecycleOperationAdapters.grantedAction ===
          "function",
        movement:
          typeof lifecycleOperationAdapters.movement ===
          "function",
        nhp:
          typeof lifecycleOperationAdapters.nhp ===
          "function",
        nativeVerifier:
          typeof lifecycleOperationAdapters.nativeVerifier ===
          "function"
      })
  });
}
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * lifecycle-state.js
 * ------------------
 *
 * Owns timing metadata persistence.
 *
 * Dispatcher reads due entries and marks successful ones expired/reset.
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns actual turn economy mutation.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns actual resource mutation.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Transports lifecycle boundaries.
 *
 * lifecycle-hooks.js performs translation.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Native lifecycle mutation/verification remains below injected
 * status/native adapters.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later supplies lifecycle-managed feature descriptors.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later augments missing lifecycle metadata before registration.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * lifecycle-dispatcher owns timing resolution, not authoritative mechanic
 * state.
 *
 * INVARIANT 2
 * Due entries are resolved from lifecycle-state.
 *
 * INVARIANT 3
 * Resource operations delegate to resource_service.
 *
 * INVARIANT 4
 * Action economy operations delegate to action_economy.
 *
 * INVARIANT 5
 * Status/condition/effect operations delegate through injected adapters.
 *
 * INVARIANT 6
 * Native authority never causes duplicate Frame Conn mutation.
 *
 * INVARIANT 7
 * Successful lifecycle handling marks the lifecycle entry terminal.
 *
 * INVARIANT 8
 * Failed lifecycle handling leaves the entry active for diagnostics/retry
 * unless another owning policy changes it.
 *
 * INVARIANT 9
 * Multiple lifecycle operations may produce PARTIAL result without rollback.
 *
 * INVARIANT 10
 * Custom predicates execute here, after structural due matching.
 *
 * INVARIANT 11
 * lifecycle-dispatcher does not subscribe directly to semantic_event_bus.
 *
 * INVARIANT 12
 * lifecycle-hooks owns event/boundary transport integration.
 *
 * INVARIANT 13
 * actor_owned_feature_registry may supply descriptors but does not alter
 * dispatcher ownership.
 *
 * INVARIANT 14
 * system_bridge may augment lifecycle metadata but does not execute
 * lifecycle operations.
 */