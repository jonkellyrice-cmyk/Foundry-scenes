/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_event_bus/semantic-event-hooks.js
 */
/**
 * @file
 * @path main/semantic_event_bus/semantic-event-hooks.js
 * @module semantic-event-hooks
 * @layer semantic-event-bus-transaction-integration
 * @responsibility translate-stable-execution-transaction-boundaries-into-semantic-events
 * @public-boundary false
 * @side-effects semantic-event-dispatch-and-transaction-hook-registration
 *
 * @depends-on
 * - semantic-event-contract
 * - semantic-event-dispatcher
 * - execution_transaction/execution-transaction
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - observes execution_transaction/ stable hook stages
 * - emits normalized execution lifecycle events
 * - preserves ExecutionContext execution lineage
 * - provides event boundaries consumed later by:
 *   - lifecycle_service/
 *   - actor_owned_feature_registry/
 *   - targeting_spatial_service/
 *   - future system_bridge/
 * - does not change transaction mechanical outcomes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - execution_transaction/ remains execution lifecycle authority
 * - semantic-event-dispatcher.js remains event delivery authority
 * - semantic-event-registry.js remains listener registration authority
 * - transaction-generated semantic events are observational
 * - feature-triggered mechanics must still enter normal execution
 *   transactions
 *
 * THIS FILE OWNS:
 * - execution lifecycle event hook registration
 * - transaction-stage → semantic-event mapping
 * - transaction result payload construction
 * - observational dispatch from transaction hooks
 * - transaction/event correlation metadata
 * - hook registration lifecycle
 *
 * THIS FILE DOES NOT OWN:
 * - semantic event contracts
 * - listener registration
 * - listener execution
 * - transaction sequencing
 * - feature-specific event production
 * - lifecycle timing
 * - native execution
 *
 * EDIT CONTRACT:
 * - transaction-generated events remain observational
 * - dispatch failure must not rewrite transaction truth
 * - use stable transaction hook stages only
 * - preserve execution/root/parent lineage
 * - do not dispatch feature-private events from generic transaction hooks
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  SEMANTIC_EVENT_DELIVERY_MODE,
  SEMANTIC_EVENT_KIND,
  createSemanticEventFromExecutionContext
} from "./semantic-event-contract.js";
import {
  dispatchObservationalSemanticEvent
} from "./semantic-event-dispatcher.js";
import {
  EXECUTION_HOOK_PRIORITY,
  EXECUTION_HOOK_SOURCE_KIND,
  continueTransaction,
  registerExecutionTransactionHook,
  onAfterTargeting,
  onAfterFinalValidate,
  onAfterExecute,
  onAfterResolve,
  onAfterCommit,
  onTransactionSuccess,
  onTransactionBlock,
  onTransactionCancel,
  onTransactionFailure,
  onTransactionPartial,
  executionTransaction
} from "../execution_transaction/execution-transaction.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const SEMANTIC_EVENT_HOOKS_MODULE_ID =
  "lancer-frame-conn.semantic-event-hooks";
export const SEMANTIC_EVENT_HOOKS_MODULE_VERSION =
  1;
/* ============================================================
   TRANSACTION STAGE ACCESS
   ============================================================ */
/**
 * @section transaction-stage-access
 *
 * BEFORE_REBUILD / AFTER_REBUILD do not currently have convenience
 * registration helpers on the execution_transaction façade.
 *
 * Use the public contract namespace rather than importing runner internals.
 */
const EXECUTION_TRANSACTION_HOOK_STAGE =
  executionTransaction
    .contract
    .EXECUTION_TRANSACTION_HOOK_STAGE;
/* ============================================================
   HOOK IDS
   ============================================================ */
export const SEMANTIC_EVENT_TRANSACTION_HOOK_ID =
  Object.freeze({
    EXECUTION_STARTED:
      "semantic-event.execution-started",
    EXECUTION_REBUILT:
      "semantic-event.execution-rebuilt",
    EXECUTION_TARGETED:
      "semantic-event.execution-targeted",
    EXECUTION_VALIDATED:
      "semantic-event.execution-validated",
    EXECUTION_EXECUTED:
      "semantic-event.execution-executed",
    EXECUTION_RESOLVED:
      "semantic-event.execution-resolved",
    EXECUTION_COMMITTED:
      "semantic-event.execution-committed",
    EXECUTION_SUCCEEDED:
      "semantic-event.execution-succeeded",
    EXECUTION_BLOCKED:
      "semantic-event.execution-blocked",
    EXECUTION_CANCELLED:
      "semantic-event.execution-cancelled",
    EXECUTION_FAILED:
      "semantic-event.execution-failed",
    EXECUTION_PARTIAL:
      "semantic-event.execution-partial"
  });
/* ============================================================
   HOOK PRIORITY
   ============================================================ */
/**
 * @section hook-priority
 *
 * Transaction semantic events are observers.
 *
 * They should generally run after mechanical cross-cutting services at
 * each stage so event payloads reflect settled stage state.
 */
export const SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY =
  Object.freeze({
    OBSERVER:
      EXECUTION_HOOK_PRIORITY.VERY_LATE,
    TERMINAL:
      EXECUTION_HOOK_PRIORITY.VERY_LATE
  });
/* ============================================================
   PRIVATE DIAGNOSTIC STATE
   ============================================================ */
/**
 * @section private-diagnostic-state
 *
 * Event history itself belongs to observability/event consumers.
 *
 * This state stores only the latest dispatch result per execution for
 * debugging the transaction/event bridge.
 */
const LAST_TRANSACTION_EVENT_DISPATCH =
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
function getExecutionIdFromPayload(
  payload
) {
  return (
    payload
      ?.context
      ?.identity
      ?.executionId ??
    payload
      ?.transaction
      ?.identity
      ?.executionId ??
    null
  );
}
function getTransactionIdFromPayload(
  payload
) {
  return (
    payload
      ?.transaction
      ?.identity
      ?.transactionId ??
    null
  );
}
function storeLatestDispatch(
  payload,
  event,
  dispatchResult
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  if (!requiredString(executionId)) {
    return;
  }
  LAST_TRANSACTION_EVENT_DISPATCH.set(
    executionId,
    Object.freeze({
      event,
      dispatchResult,
      timestamp:
        Date.now()
    })
  );
}
/* ============================================================
   TRANSACTION EVENT PAYLOAD
   ============================================================ */
/**
 * @section transaction-event-payload
 *
 * Event envelope contains routing identity.
 *
 * Payload contains the transaction-stage data.
 */
function createTransactionSemanticEventPayload(
  payload,
  {
    stageResult = null,
    terminal = false
  } = {}
) {
  const transaction =
    payload?.transaction ??
    null;
  return Object.freeze({
    transactionId:
      transaction
        ?.identity
        ?.transactionId ??
      null,
    phase:
      transaction?.phase ??
      null,
    status:
      transaction?.status ??
      null,
    previousResult:
      payload?.previousResult ??
      null,
    stageResult,
    terminal,
    validation:
      transaction?.validation ??
      null,
    targeting:
      transaction?.targeting ??
      null,
    execution:
      transaction?.execution ??
      null,
    resolution:
      transaction?.resolution ??
      null,
    commit:
      transaction?.commit ??
      null,
    reason:
      transaction?.reason ??
      null,
    error:
      transaction?.error ??
      null
  });
}
/* ============================================================
   SEMANTIC EVENT CREATION
   ============================================================ */
/**
 * @section semantic-event-creation
 */
function createTransactionSemanticEvent(
  payload,
  kind,
  {
    stageResult = null,
    terminal = false,
    metadata = {}
  } = {}
) {
  return createSemanticEventFromExecutionContext(
    payload.context,
    {
      kind,
      transactionId:
        getTransactionIdFromPayload(
          payload
        ),
      deliveryMode:
        SEMANTIC_EVENT_DELIVERY_MODE.OBSERVATIONAL,
      payload:
        createTransactionSemanticEventPayload(
          payload,
          {
            stageResult,
            terminal
          }
        ),
      metadata: {
        bridge:
          SEMANTIC_EVENT_HOOKS_MODULE_ID,
        transactionHookStage:
          payload
            ?.transaction
            ?.phase ??
          null,
        ...metadata
      }
    }
  );
}
/* ============================================================
   SAFE OBSERVATIONAL DISPATCH
   ============================================================ */
/**
 * @section safe-observational-dispatch
 *
 * Transaction semantic events are observational.
 *
 * Even an unexpected dispatcher exception must not convert a successful
 * native/semantic action into transaction failure.
 */
async function safelyDispatchTransactionSemanticEvent(
  payload,
  event
) {
  try {
    const dispatchResult =
      await dispatchObservationalSemanticEvent(
        event,
        {
          signal:
            payload?.signal ??
            null,
          metadata: {
            transactionBridge:
              true
          }
        }
      );
    storeLatestDispatch(
      payload,
      event,
      dispatchResult
    );
    return Object.freeze({
      event,
      dispatchResult,
      error:
        null
    });
  } catch (error) {
    const fallback =
      Object.freeze({
        event,
        dispatchResult:
          null,
        error
      });
    storeLatestDispatch(
      payload,
      event,
      fallback
    );
    return fallback;
  }
}
/* ============================================================
   GENERIC TRANSACTION EVENT HOOK
   ============================================================ */
/**
 * @section generic-transaction-event-hook
 */
async function emitTransactionSemanticEvent(
  payload,
  kind,
  options = {}
) {
  const event =
    createTransactionSemanticEvent(
      payload,
      kind,
      options
    );
  const delivery =
    await safelyDispatchTransactionSemanticEvent(
      payload,
      event
    );
  return continueTransaction(
    options.transactionHookStage ??
    payload
      ?.transaction
      ?.phase ??
    "semantic-event-observer",
    {
      context:
        payload.context,
      metadata: {
        semanticEvent:
          event,
        semanticEventDispatch:
          delivery.dispatchResult,
        semanticEventDispatchError:
          delivery.error
      }
    }
  );
}
/* ============================================================
   EXECUTION STARTED
   ============================================================ */
/**
 * @section execution-started
 *
 * BEFORE_REBUILD is the earliest stable transaction hook stage.
 */
export async function runExecutionStartedSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_STARTED,
    {
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_REBUILD
    }
  );
}
/* ============================================================
   EXECUTION REBUILT
   ============================================================ */
export async function runExecutionRebuiltSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_REBUILT,
    {
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_REBUILD
    }
  );
}
/* ============================================================
   EXECUTION TARGETED
   ============================================================ */
export async function runExecutionTargetedSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_TARGETED,
    {
      stageResult:
        payload.previousResult,
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_TARGETING
    }
  );
}
/* ============================================================
   EXECUTION VALIDATED
   ============================================================ */
/**
 * @section execution-validated
 *
 * Emit after FINAL validation rather than preliminary validation.
 *
 * This means target-dependent Range/LOS/etc. validation has completed.
 */
export async function runExecutionValidatedSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_VALIDATED,
    {
      stageResult:
        payload.previousResult,
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_FINAL_VALIDATE
    }
  );
}
/* ============================================================
   EXECUTION EXECUTED
   ============================================================ */
export async function runExecutionExecutedSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_EXECUTED,
    {
      stageResult:
        payload.previousResult,
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_EXECUTE
    }
  );
}
/* ============================================================
   EXECUTION RESOLVED
   ============================================================ */
export async function runExecutionResolvedSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_RESOLVED,
    {
      stageResult:
        payload.previousResult,
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_RESOLVE
    }
  );
}
/* ============================================================
   EXECUTION COMMITTED
   ============================================================ */
export async function runExecutionCommittedSemanticEventHook(
  payload
) {
  return emitTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_COMMITTED,
    {
      stageResult:
        payload.previousResult,
      transactionHookStage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_COMMIT
    }
  );
}
/* ============================================================
   TERMINAL EVENT HELPERS
   ============================================================ */
/**
 * @section terminal-event-helpers
 */
async function emitTerminalTransactionSemanticEvent(
  payload,
  kind,
  transactionHookStage
) {
  return emitTransactionSemanticEvent(
    payload,
    kind,
    {
      terminal:
        true,
      transactionHookStage
    }
  );
}
/* ============================================================
   EXECUTION SUCCEEDED
   ============================================================ */
export async function runExecutionSucceededSemanticEventHook(
  payload
) {
  return emitTerminalTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_SUCCEEDED,
    EXECUTION_TRANSACTION_HOOK_STAGE.ON_SUCCESS
  );
}
/* ============================================================
   EXECUTION BLOCKED
   ============================================================ */
export async function runExecutionBlockedSemanticEventHook(
  payload
) {
  return emitTerminalTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_BLOCKED,
    EXECUTION_TRANSACTION_HOOK_STAGE.ON_BLOCK
  );
}
/* ============================================================
   EXECUTION CANCELLED
   ============================================================ */
export async function runExecutionCancelledSemanticEventHook(
  payload
) {
  return emitTerminalTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_CANCELLED,
    EXECUTION_TRANSACTION_HOOK_STAGE.ON_CANCEL
  );
}
/* ============================================================
   EXECUTION FAILED
   ============================================================ */
export async function runExecutionFailedSemanticEventHook(
  payload
) {
  return emitTerminalTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_FAILED,
    EXECUTION_TRANSACTION_HOOK_STAGE.ON_FAILURE
  );
}
/* ============================================================
   EXECUTION PARTIAL
   ============================================================ */
export async function runExecutionPartialSemanticEventHook(
  payload
) {
  return emitTerminalTransactionSemanticEvent(
    payload,
    SEMANTIC_EVENT_KIND.EXECUTION_PARTIAL,
    EXECUTION_TRANSACTION_HOOK_STAGE.ON_PARTIAL
  );
}
/* ============================================================
   GLOBAL TRANSACTION HOOK REGISTRATION
   ============================================================ */
/**
 * @section global-transaction-hook-registration
 *
 * Register once during semantic_event_bus/runtime composition.
 */
let registeredSemanticEventTransactionHooks =
  null;
export function registerSemanticEventTransactionHooks() {
  if (registeredSemanticEventTransactionHooks) {
    return registeredSemanticEventTransactionHooks;
  }
  const registrations = [
    /* --------------------------------------------------------
       EARLY EXECUTION LIFECYCLE
       -------------------------------------------------------- */
    registerExecutionTransactionHook({
      id:
        SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_STARTED,
      stage:
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_REBUILD,
      handler:
        runExecutionStartedSemanticEventHook,
      priority:
        SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
      sourceKind:
        EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
      sourceId:
        SEMANTIC_EVENT_HOOKS_MODULE_ID
    }),
    registerExecutionTransactionHook({
      id:
        SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_REBUILT,
      stage:
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_REBUILD,
      handler:
        runExecutionRebuiltSemanticEventHook,
      priority:
        SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
      sourceKind:
        EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
      sourceId:
        SEMANTIC_EVENT_HOOKS_MODULE_ID
    }),
    /* --------------------------------------------------------
       TARGET / VALIDATION / EXECUTION
       -------------------------------------------------------- */
    onAfterTargeting(
      runExecutionTargetedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_TARGETED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onAfterFinalValidate(
      runExecutionValidatedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_VALIDATED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onAfterExecute(
      runExecutionExecutedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_EXECUTED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onAfterResolve(
      runExecutionResolvedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_RESOLVED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onAfterCommit(
      runExecutionCommittedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_COMMITTED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.OBSERVER,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    /* --------------------------------------------------------
       TERMINAL OUTCOMES
       -------------------------------------------------------- */
    onTransactionSuccess(
      runExecutionSucceededSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_SUCCEEDED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.TERMINAL,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onTransactionBlock(
      runExecutionBlockedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_BLOCKED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.TERMINAL,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onTransactionCancel(
      runExecutionCancelledSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_CANCELLED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.TERMINAL,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onTransactionFailure(
      runExecutionFailedSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_FAILED,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.TERMINAL,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    ),
    onTransactionPartial(
      runExecutionPartialSemanticEventHook,
      {
        id:
          SEMANTIC_EVENT_TRANSACTION_HOOK_ID.EXECUTION_PARTIAL,
        priority:
          SEMANTIC_EVENT_TRANSACTION_HOOK_PRIORITY.TERMINAL,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.EVENT_BUS,
        sourceId:
          SEMANTIC_EVENT_HOOKS_MODULE_ID
      }
    )
  ];
  registeredSemanticEventTransactionHooks =
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
        registeredSemanticEventTransactionHooks =
          null;
        LAST_TRANSACTION_EVENT_DISPATCH.clear();
        return removed;
      }
    });
  return registeredSemanticEventTransactionHooks;
}
/* ============================================================
   GLOBAL TRANSACTION HOOK UNREGISTRATION
   ============================================================ */
export function unregisterSemanticEventTransactionHooks() {
  if (!registeredSemanticEventTransactionHooks) {
    return 0;
  }
  return registeredSemanticEventTransactionHooks
    .dispose();
}
export function areSemanticEventTransactionHooksRegistered() {
  return Boolean(
    registeredSemanticEventTransactionHooks
  );
}
/* ============================================================
   DOMAIN EVENT EMISSION
   ============================================================ */
/**
 * @section domain-event-emission
 *
 * Other foundational services should use this primitive when they need to
 * emit a semantic event tied to an ExecutionContext.
 *
 * Examples:
 *
 * resource.spent
 * economy.spent
 * movement.completed
 * target.acquired
 * status.applied
 *
 * The owning domain service remains responsible for choosing the correct
 * event kind and payload.
 */
export async function emitExecutionSemanticEvent(
  context,
  {
    kind,
    transactionId = null,
    targets = null,
    payload = null,
    metadata = {},
    signal = null
  } = {}
) {
  const event =
    createSemanticEventFromExecutionContext(
      context,
      {
        kind,
        transactionId,
        targets,
        deliveryMode:
          SEMANTIC_EVENT_DELIVERY_MODE.OBSERVATIONAL,
        payload,
        metadata
      }
    );
  const dispatchResult =
    await dispatchObservationalSemanticEvent(
      event,
      {
        signal
      }
    );
  return Object.freeze({
    event,
    dispatchResult
  });
}
/* ============================================================
   TRANSACTION DISPATCH DIAGNOSTICS
   ============================================================ */
export function getLastTransactionSemanticEventDispatch(
  executionId
) {
  if (!requiredString(executionId)) {
    return null;
  }
  return (
    LAST_TRANSACTION_EVENT_DISPATCH.get(
      executionId
    ) ??
    null
  );
}
export function clearTransactionSemanticEventDispatchDiagnostics(
  executionId
) {
  if (!requiredString(executionId)) {
    return false;
  }
  return LAST_TRANSACTION_EVENT_DISPATCH.delete(
    executionId
  );
}
export function clearAllTransactionSemanticEventDispatchDiagnostics() {
  const count =
    LAST_TRANSACTION_EVENT_DISPATCH.size;
  LAST_TRANSACTION_EVENT_DISPATCH.clear();
  return count;
}
export function getSemanticEventHookDiagnostics() {
  return Object.freeze({
    id:
      SEMANTIC_EVENT_HOOKS_MODULE_ID,
    version:
      SEMANTIC_EVENT_HOOKS_MODULE_VERSION,
    registered:
      areSemanticEventTransactionHooksRegistered(),
    trackedExecutionCount:
      LAST_TRANSACTION_EVENT_DISPATCH.size,
    trackedExecutionIds:
      Object.freeze([
        ...LAST_TRANSACTION_EVENT_DISPATCH.keys()
      ])
  });
}
/* ============================================================
   TRANSACTION EVENT ORDER NOTES
   ============================================================ */
/**
 * @section transaction-event-order-notes
 *
 * Standard emitted sequence:
 *
 * execution.started
 *        ↓
 * execution.rebuilt
 *        ↓
 * execution.targeted
 *        ↓
 * execution.validated
 *        ↓
 * execution.executed
 *        ↓
 * execution.resolved
 *        ↓
 * execution.committed
 *        ↓
 * execution.succeeded
 *
 * Alternate terminal paths:
 *
 * execution.blocked
 * execution.cancelled
 * execution.failed
 * execution.partial
 *
 * Not every transaction necessarily reaches every intermediate event.
 */
/* ============================================================
   VALIDATION EVENT NOTES
   ============================================================ */
/**
 * @section validation-event-notes
 *
 * execution.validated is emitted after FINAL validation.
 *
 * Preliminary pre-validation is intentionally not emitted as the canonical
 * validated event because:
 *
 * targeting may not yet exist
 * Range may not yet be known
 * LOS may not yet be known
 * adjacency may not yet be known
 *
 * If later observability requires:
 *
 * execution.prevalidated
 *
 * add a distinct semantic event kind rather than changing the meaning of
 * execution.validated.
 */
/* ============================================================
   TARGETING EVENT NOTES
   ============================================================ */
/**
 * @section targeting-event-notes
 *
 * execution.targeted is transaction-level:
 *
 * target acquisition phase completed/skipped.
 *
 * It is distinct from domain events such as:
 *
 * target.acquired
 * targeting.template-placed
 * targeting.completed
 *
 * targeting_spatial_service/ owns those domain-specific events.
 */
/* ============================================================
   EXECUTED / RESOLVED NOTES
   ============================================================ */
/**
 * @section executed-resolved-notes
 *
 * execution.executed:
 *
 * primary native/semantic execution step has completed.
 *
 * execution.resolved:
 *
 * post-primary semantic resolution has completed.
 *
 * Example:
 *
 * weapon attack native Flow
 * → execution.executed
 *
 * Annihilator special effect / child resolution
 * → execution.resolved
 *
 * This distinction is useful for actor-owned triggers.
 */
/* ============================================================
   COMMIT NOTES
   ============================================================ */
/**
 * @section commit-notes
 *
 * execution.committed is emitted AFTER_COMMIT.
 *
 * Therefore:
 *
 * action economy should already be committed
 * deferred resources should already be committed
 * native resource verification should already be complete
 *
 * assuming their hooks use earlier priorities.
 *
 * Consumers that require fully settled execution state should prefer:
 *
 * execution.committed
 * or
 * execution.succeeded
 */
/* ============================================================
   TERMINAL EVENT NOTES
   ============================================================ */
/**
 * @section terminal-event-notes
 *
 * Terminal events reflect transaction truth established by the runner.
 *
 * Event listener results CANNOT change:
 *
 * success → failure
 * blocked → success
 * partial → success
 *
 * because terminal event delivery is observational.
 */
/* ============================================================
   RESOURCE SERVICE INTEGRATION NOTES
   ============================================================ */
/**
 * @section resource-service-integration-notes
 *
 * resource_service may later emit:
 *
 * resource.validated
 * resource.spent
 * resource.restored
 * resource.reset
 *
 * It should use:
 *
 * emitExecutionSemanticEvent(...)
 *
 * when an ExecutionContext exists.
 *
 * Resource hooks should not add resource event vocabulary to transaction
 * generic event payloads.
 */
/* ============================================================
   ACTION ECONOMY INTEGRATION NOTES
   ============================================================ */
/**
 * @section action-economy-integration-notes
 *
 * action_economy may emit:
 *
 * economy.validated
 * economy.spent
 * economy.reset
 *
 * The generic transaction event:
 *
 * execution.committed
 *
 * may contain the final commit snapshot but does not replace those more
 * specific semantic boundaries.
 */
/* ============================================================
   LIFECYCLE SERVICE INTEGRATION NOTES
   ============================================================ */
/**
 * @section lifecycle-service-integration-notes
 *
 * lifecycle_service will emit its own domain events:
 *
 * turn.started
 * turn.ended
 * round.started
 * round.ended
 * scene.started
 * scene.ended
 * full-repair.completed
 *
 * Those events do not originate from execution transaction hooks unless a
 * specific execution itself causes the lifecycle boundary.
 */
/* ============================================================
   ACTOR-OWNED FEATURE REGISTRY NOTES
   ============================================================ */
/**
 * @section actor-owned-feature-registry-notes
 *
 * actor_owned_feature_registry may subscribe to:
 *
 * attack.hit
 * attack.missed
 * execution.executed
 * execution.resolved
 * execution.committed
 * movement.completed
 * status.applied
 * resource.spent
 * turn.started
 * etc.
 *
 * Triggered mechanics should then:
 *
 * resolve owned descriptor
 * → system_bridge augmentation later
 * → build child ExecutionContext
 * → execution_transaction
 *
 * Do not perform arbitrary owned-feature mechanics directly in this file.
 */
/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */
/**
 * @section system-bridge-notes
 *
 * system_bridge may eventually supplement feature runtime descriptors with:
 *
 * consumesEvents
 * producesEvents
 * triggerKinds
 *
 * Those descriptors reference semantic-event-contract vocabulary.
 *
 * system_bridge does not modify this transaction hook bridge.
 */
/* ============================================================
   INITIALIZATION NOTES
   ============================================================ */
/**
 * @section initialization-notes
 *
 * Future semantic-event-bus/runtime composition:
 *
 * initialize registry
 * → registerSemanticEventTransactionHooks()
 * → initialize lifecycle listeners
 * → initialize actor-owned feature listeners
 * → initialize observability/UI listeners
 *
 * Register transaction hooks once.
 *
 * Do not register them per action.
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
 * Remains authoritative for:
 *
 * lifecycle stage ordering
 * blocked/cancelled/failed/partial/success truth
 *
 * This file only observes.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies:
 *
 * actor identity
 * source identity
 * target identity
 * execution lineage
 *
 *
 * resource_service/
 * -----------------
 *
 * Settles resource state before later commit observers.
 *
 *
 * action_economy/
 * ---------------
 *
 * Settles action economy before later commit observers.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Does not need to manually emit generic execution lifecycle events once
 * these hooks are registered.
 *
 *
 * future lifecycle_service/
 * -------------------------
 *
 * Consumes/produces semantic lifecycle events independently.
 *
 *
 * future actor_owned_feature_registry/
 * ------------------------------------
 *
 * Can use normalized execution events as trigger boundaries.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * execution_transaction remains authoritative for transaction truth.
 *
 * INVARIANT 2
 * semantic-event-hooks only observe stable transaction stages.
 *
 * INVARIANT 3
 * All generic transaction events are OBSERVATIONAL.
 *
 * INVARIANT 4
 * Semantic event dispatch failure cannot fail an otherwise valid
 * transaction.
 *
 * INVARIANT 5
 * execution.started is emitted at the earliest stable BEFORE_REBUILD hook.
 *
 * INVARIANT 6
 * execution.validated means FINAL target-dependent validation completed.
 *
 * INVARIANT 7
 * execution.executed and execution.resolved remain distinct boundaries.
 *
 * INVARIANT 8
 * execution.committed is emitted after commit-stage mechanics have run.
 *
 * INVARIANT 9
 * Terminal events preserve runner-established status.
 *
 * INVARIANT 10
 * Transaction-level targeting events do not replace
 * targeting_spatial_service domain events.
 *
 * INVARIANT 11
 * Domain services own their own semantic event production.
 *
 * INVARIANT 12
 * Event-triggered mechanics use normal child execution transactions.
 *
 * INVARIANT 13
 * system_bridge may reference event vocabulary but does not own event
 * dispatch.
 *
 * INVARIANT 14
 * Transaction event hooks are registered once during runtime composition.
 */