/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/action_economy/action-economy-hooks.js
 */
/**
 * @file
 * @path main/action_economy/action-economy-hooks.js
 * @module action-economy-hooks
 * @layer action-economy-transaction-integration
 * @responsibility attach-action-economy-validation-and-commit-to-execution-transactions
 * @public-boundary false
 * @side-effects action-economy-validation-action-economy-commit-and-hook-registration
 *
 * @depends-on
 * - action-economy-contract
 * - action-economy-transaction
 * - execution_transaction/execution-transaction
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - registers action economy behavior into execution_transaction/
 * - validates economy before targeting/execution
 * - preserves pre-execution ActionEconomySnapshot by executionId
 * - commits economy only after successful execution/resolution
 * - consumes existing feature_turn/ state indirectly through
 *   action-economy-transaction.js
 * - future feature_runtime_bridge/ may supply missing economy metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature_turn/ remains authoritative turn-state backing
 * - action-economy-transaction.js owns validation/commit semantics
 * - execution_transaction/ owns transaction sequencing
 * - semantic_execution_context/ remains economy request carrier
 * - resource_service/ remains separate
 *
 * THIS FILE OWNS:
 * - action economy transaction hook registration
 * - per-execution economy snapshot retention
 * - economy pre-validation hook
 * - economy commit hook
 * - economy hook cleanup
 * - optional runtime augmentation resolver
 *
 * THIS FILE DOES NOT OWN:
 * - action economy contracts
 * - turn-state persistence
 * - Quick/Full/Protocol rules
 * - transaction sequencing
 * - resource rules
 * - feature-specific action effects
 *
 * EDIT CONTRACT:
 * - validate before execution
 * - retain exact pre-execution state until commit
 * - commit only at transaction commit boundary
 * - clean local state on every terminal outcome
 * - do not mutate existing feature_turn state directly
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  ACTION_ECONOMY_COMMIT_STATUS,
  createActionEconomyRequest
} from "./action-economy-contract.js";
import {
  buildActionEconomyRequest,
  commitExecutionActionEconomy,
  prepareActionEconomyTransaction,
  validateExecutionActionEconomy
} from "./action-economy-transaction.js";
import {
  EXECUTION_HOOK_PRIORITY,
  EXECUTION_HOOK_SOURCE_KIND,
  blockTransaction,
  continueTransaction,
  failTransaction,
  onAfterCommit,
  onBeforeCommit,
  onBeforePreValidate,
  onTransactionBlock,
  onTransactionCancel,
  onTransactionFailure,
  onTransactionPartial,
  onTransactionSuccess
} from "../execution_transaction/execution-transaction.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const ACTION_ECONOMY_HOOKS_MODULE_ID =
  "lancer-frame-conn.action-economy-hooks";
export const ACTION_ECONOMY_HOOKS_MODULE_VERSION =
  1;
/* ============================================================
   HOOK IDS
   ============================================================ */
export const ACTION_ECONOMY_HOOK_ID =
  Object.freeze({
    PRE_VALIDATE:
      "action-economy.pre-validate",
    BEFORE_COMMIT:
      "action-economy.before-commit",
    AFTER_COMMIT:
      "action-economy.after-commit",
    SUCCESS_CLEANUP:
      "action-economy.success-cleanup",
    BLOCK_CLEANUP:
      "action-economy.block-cleanup",
    CANCEL_CLEANUP:
      "action-economy.cancel-cleanup",
    FAILURE_CLEANUP:
      "action-economy.failure-cleanup",
    PARTIAL_CLEANUP:
      "action-economy.partial-cleanup"
  });
/* ============================================================
   HOOK PRIORITY
   ============================================================ */
/**
 * @section hook-priority
 *
 * Action economy should validate before generic resources.
 *
 * This avoids resource reads/target UI when the actor cannot legally pay
 * the action cost at all.
 */
export const ACTION_ECONOMY_HOOK_PRIORITY =
  Object.freeze({
    PRE_VALIDATE:
      EXECUTION_HOOK_PRIORITY.EARLY,
    BEFORE_COMMIT:
      EXECUTION_HOOK_PRIORITY.EARLY,
    AFTER_COMMIT:
      EXECUTION_HOOK_PRIORITY.EARLY,
    CLEANUP:
      EXECUTION_HOOK_PRIORITY.LATEST
  });
/* ============================================================
   PRIVATE RUNTIME STATE
   ============================================================ */
/**
 * @section private-runtime-state
 *
 * executionId →
 *
 * {
 *   request,
 *   snapshot,
 *   validation,
 *   commit,
 *   augmentation
 * }
 */
const ACTION_ECONOMY_TRANSACTION_STATE =
  new Map();
/* ============================================================
   RUNTIME AUGMENTATION RESOLVER
   ============================================================ */
/**
 * @section runtime-augmentation-resolver
 *
 * Optional future feature_runtime_bridge integration:
 *
 * async ({ context, transaction }) => {
 *   activationType?,
 *   cost?
 * }
 *
 * Existing ExecutionContext economy metadata remains primary.
 */
let actionEconomyAugmentationResolver =
  null;
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
function getStoredActionEconomyState(
  executionId
) {
  if (!requiredString(executionId)) {
    return null;
  }
  return (
    ACTION_ECONOMY_TRANSACTION_STATE.get(
      executionId
    ) ??
    null
  );
}
function storeActionEconomyState(
  executionId,
  state
) {
  if (!requiredString(executionId)) {
    throw new TypeError(
      "Action economy hook state requires executionId."
    );
  }
  ACTION_ECONOMY_TRANSACTION_STATE.set(
    executionId,
    Object.freeze({
      ...state
    })
  );
  return getStoredActionEconomyState(
    executionId
  );
}
function patchActionEconomyState(
  executionId,
  patch
) {
  const existing =
    getStoredActionEconomyState(
      executionId
    ) ??
    {};
  return storeActionEconomyState(
    executionId,
    {
      ...existing,
      ...patch
    }
  );
}
function clearActionEconomyState(
  executionId
) {
  if (!requiredString(executionId)) {
    return false;
  }
  return ACTION_ECONOMY_TRANSACTION_STATE.delete(
    executionId
  );
}
/* ============================================================
   AUGMENTATION RESOLVER CONFIGURATION
   ============================================================ */
export function setActionEconomyAugmentationResolver(
  resolver
) {
  if (
    resolver != null &&
    typeof resolver !== "function"
  ) {
    throw new TypeError(
      "Action economy augmentation resolver must be function or null."
    );
  }
  actionEconomyAugmentationResolver =
    resolver;
  return true;
}
export function getActionEconomyAugmentationResolver() {
  return actionEconomyAugmentationResolver;
}
/* ============================================================
   AUGMENTATION RESOLUTION
   ============================================================ */
async function resolveActionEconomyAugmentation(
  payload
) {
  if (
    typeof actionEconomyAugmentationResolver !==
    "function"
  ) {
    return null;
  }
  return actionEconomyAugmentationResolver({
    context:
      payload.context,
    transaction:
      payload.transaction
  });
}
/**
 * Return true only when the prepared authoritative Turn snapshot already
 * contains this exact semantic action as an unexecuted committed entry.
 */
function preparedActionEconomyMatchesUnexecutedCommittedTurnAction(
  prepared
) {
  const actionId =
    prepared
      ?.request
      ?.actionId ??
    null;

  const usedActions =
    prepared
      ?.snapshot
      ?.metadata
      ?.rawState
      ?.usedActions;

  if (
    !actionId ||
    !Array.isArray(
      usedActions
    )
  ) {
    return false;
  }

  return usedActions.some(
    entry =>
      entry?.actionId === actionId &&
      entry?.executed !== true
  );
}


/* ============================================================
   PRE-VALIDATION HOOK
   ============================================================ */
/**
 * @section pre-validation-hook
 *
 * BEFORE_PRE_VALIDATE:
 *
 * - resolve optional economy augmentation
 * - build normalized ActionEconomyRequest
 * - read existing feature_turn state
 * - validate requested economy
 * - retain exact before-state for commit
 */
export async function runActionEconomyPreValidationHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  if (!requiredString(executionId)) {
    return failTransaction(
      "before-pre-validate",
      new Error(
        "Action economy validation requires executionId."
      ),
      {
        reason:
          "action-economy-execution-id-missing",
        context:
          payload.context
      }
    );
  }
  let augmentation =
    null;
  try {
    augmentation =
      await resolveActionEconomyAugmentation(
        payload
      );
  } catch (error) {
    return failTransaction(
      "before-pre-validate",
      error,
      {
        reason:
          "action-economy-augmentation-resolution-failed",
        context:
          payload.context
      }
    );
  }
  let prepared;
  try {
    if (augmentation) {
      const request =
        buildActionEconomyRequest(
          payload.context,
          {
            activationType:
              augmentation.activationType ??
              null,
            cost:
              augmentation.cost ??
              null
          }
        );
      prepared =
        await prepareActionEconomyTransaction(
          Object.freeze({
            ...payload.context,
            /*
             * Preserve original context.
             *
             * Request override is passed separately below rather than
             * mutating semantic execution data.
             */
            metadata: {
              ...(
                payload.context.metadata ??
                {}
              ),
              actionEconomyAugmentation:
                augmentation
            }
          })
        );
      /*
       * prepareActionEconomyTransaction currently builds from context.
       * Replace only the request when augmentation supplied explicit
       * request semantics.
       */
      prepared =
        Object.freeze({
          ...prepared,
          request
        });
      const validation =
        await import(
          "./action-economy-transaction.js"
        )
          .then(
            module =>
              module
                .validateExecutionActionEconomy(
                  payload.context,
                  {
                    request,
                    snapshot:
                      prepared.snapshot
                  }
                )
          );
      prepared =
        Object.freeze({
          ...prepared,
          validation
        });
    } else {
      prepared =
        await prepareActionEconomyTransaction(
          payload.context
        );
    }

    if (
      preparedActionEconomyMatchesUnexecutedCommittedTurnAction(
        prepared
      )
    ) {
      const request =
        createActionEconomyRequest({
          ...prepared.request,
          ignoreActionCost:
            true,
          metadata: {
            ...(
              prepared.request
                ?.metadata ??
              {}
            ),
            precommittedTurnAction:
              true
          }
        });

      const validation =
        await validateExecutionActionEconomy(
          payload.context,
          {
            request,
            snapshot:
              prepared.snapshot
          }
        );

      prepared =
        Object.freeze({
          ...prepared,
          request,
          validation
        });
    }
  } catch (error) {
    return failTransaction(
      "before-pre-validate",
      error,
      {
        reason:
          "action-economy-preparation-failed",
        context:
          payload.context
      }
    );
  }
  storeActionEconomyState(
    executionId,
    {
      request:
        prepared.request,
      snapshot:
        prepared.snapshot,
      validation:
        prepared.validation,
      commit:
        null,
      augmentation
    }
  );
  if (
    !prepared
      .validation
      .valid
  ) {
    const firstIssue =
      prepared
        .validation
        .issues
        ?.[0] ??
      null;
    return blockTransaction(
      "before-pre-validate",
      firstIssue?.message ??
      "Requested action economy is unavailable.",
      {
        context:
          payload.context,
        metadata: {
          actionEconomyValidation:
            prepared.validation,
          actionEconomySnapshot:
            prepared.snapshot
        }
      }
    );
  }
  return continueTransaction(
    "before-pre-validate",
    {
      context:
        payload.context,
      metadata: {
        actionEconomyValidation:
          prepared.validation,
        actionEconomySnapshot:
          prepared.snapshot
      }
    }
  );
}
/* ============================================================
   BEFORE COMMIT HOOK
   ============================================================ */
/**
 * @section before-commit-hook
 *
 * Executes only after primary execution/resolution is commit-eligible.
 *
 * Revalidation is performed inside commitExecutionActionEconomy().
 */
export async function runActionEconomyBeforeCommitHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  if (!requiredString(executionId)) {
    return failTransaction(
      "before-commit",
      new Error(
        "Action economy commit requires executionId."
      ),
      {
        reason:
          "action-economy-execution-id-missing",
        context:
          payload.context
      }
    );
  }
  const state =
    getStoredActionEconomyState(
      executionId
    );
  if (!state) {
    return continueTransaction(
      "before-commit",
      {
        context:
          payload.context,
        metadata: {
          actionEconomyCommit:
            "no-economy-snapshot"
        }
      }
    );
  }
  let commit;
  try {
    commit =
      await commitExecutionActionEconomy(
        payload.context,
        {
          request:
            state.request,
          before:
            state.snapshot
        }
      );
  } catch (error) {
    patchActionEconomyState(
      executionId,
      {
        commit:
          Object.freeze({
            status:
              ACTION_ECONOMY_COMMIT_STATUS.FAILED,
            error
          })
      }
    );
    return failTransaction(
      "before-commit",
      error,
      {
        reason:
          "action-economy-commit-threw",
        context:
          payload.context
      }
    );
  }
  patchActionEconomyState(
    executionId,
    {
      commit
    }
  );
  switch (
    commit.status
  ) {
    case ACTION_ECONOMY_COMMIT_STATUS.COMMITTED:
    case ACTION_ECONOMY_COMMIT_STATUS.NOTHING_TO_COMMIT:
    case ACTION_ECONOMY_COMMIT_STATUS.SKIPPED:
      return continueTransaction(
        "before-commit",
        {
          context:
            payload.context,
          metadata: {
            actionEconomyCommit:
              commit
          }
        }
      );
    case ACTION_ECONOMY_COMMIT_STATUS.PARTIAL:
      return failTransaction(
        "before-commit",
        commit.error ??
        new Error(
          commit.reason ??
          "Action economy commit partially failed."
        ),
        {
          reason:
            commit.reason ??
            "action-economy-commit-partial",
          context:
            payload.context,
          metadata: {
            actionEconomyCommit:
              commit,
            partial:
              true
          }
        }
      );
    case ACTION_ECONOMY_COMMIT_STATUS.FAILED:
    default:
      return failTransaction(
        "before-commit",
        commit.error ??
        new Error(
          commit.reason ??
          "Action economy commit failed."
        ),
        {
          reason:
            commit.reason ??
            "action-economy-commit-failed",
          context:
            payload.context,
          metadata: {
            actionEconomyCommit:
              commit
          }
        }
      );
  }
}
/* ============================================================
   AFTER COMMIT HOOK
   ============================================================ */
/**
 * @section after-commit-hook
 *
 * Observational.
 *
 * Keeps state available until terminal hooks so later event hooks may
 * inspect the final economy result.
 */
export async function runActionEconomyAfterCommitHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  const state =
    getStoredActionEconomyState(
      executionId
    );
  return continueTransaction(
    "after-commit",
    {
      context:
        payload.context,
      metadata: {
        actionEconomyCommit:
          state?.commit ??
          null,
        actionEconomyBefore:
          state?.snapshot ??
          null
      }
    }
  );
}
/* ============================================================
   TERMINAL CLEANUP
   ============================================================ */
export async function runActionEconomyTerminalCleanupHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  clearActionEconomyState(
    executionId
  );
  return continueTransaction(
    payload
      ?.transaction
      ?.phase ??
    "on-success",
    {
      context:
        payload.context
    }
  );
}
/* ============================================================
   GLOBAL HOOK REGISTRATION
   ============================================================ */
/**
 * @section global-hook-registration
 *
 * Register once during runtime composition.
 */
let registeredActionEconomyHooks =
  null;
export function registerActionEconomyTransactionHooks() {
  if (registeredActionEconomyHooks) {
    return registeredActionEconomyHooks;
  }
  const registrations = [
    onBeforePreValidate(
      runActionEconomyPreValidationHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.PRE_VALIDATE,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.PRE_VALIDATE,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onBeforeCommit(
      runActionEconomyBeforeCommitHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.BEFORE_COMMIT,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.BEFORE_COMMIT,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onAfterCommit(
      runActionEconomyAfterCommitHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.AFTER_COMMIT,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.AFTER_COMMIT,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onTransactionSuccess(
      runActionEconomyTerminalCleanupHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.SUCCESS_CLEANUP,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onTransactionBlock(
      runActionEconomyTerminalCleanupHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.BLOCK_CLEANUP,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onTransactionCancel(
      runActionEconomyTerminalCleanupHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.CANCEL_CLEANUP,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onTransactionFailure(
      runActionEconomyTerminalCleanupHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.FAILURE_CLEANUP,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    ),
    onTransactionPartial(
      runActionEconomyTerminalCleanupHook,
      {
        id:
          ACTION_ECONOMY_HOOK_ID.PARTIAL_CLEANUP,
        priority:
          ACTION_ECONOMY_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.ACTION_ECONOMY,
        sourceId:
          ACTION_ECONOMY_HOOKS_MODULE_ID
      }
    )
  ];
  registeredActionEconomyHooks =
    Object.freeze({
      registrations:
        Object.freeze(
          registrations
        ),
      dispose() {
        let disposed =
          0;
        for (
          const registration of
            registrations
        ) {
          if (
            registration?.dispose?.()
          ) {
            disposed += 1;
          }
        }
        registeredActionEconomyHooks =
          null;
        ACTION_ECONOMY_TRANSACTION_STATE.clear();
        return disposed;
      }
    });
  return registeredActionEconomyHooks;
}
/* ============================================================
   GLOBAL HOOK UNREGISTRATION
   ============================================================ */
export function unregisterActionEconomyTransactionHooks() {
  if (!registeredActionEconomyHooks) {
    return 0;
  }
  return registeredActionEconomyHooks
    .dispose();
}
export function areActionEconomyTransactionHooksRegistered() {
  return Boolean(
    registeredActionEconomyHooks
  );
}
/* ============================================================
   HOOK STATE ACCESS
   ============================================================ */
export function getExecutionActionEconomyHookState(
  executionId
) {
  return getStoredActionEconomyState(
    executionId
  );
}
export function getExecutionActionEconomyRequest(
  executionId
) {
  return (
    getStoredActionEconomyState(
      executionId
    )
      ?.request ??
    null
  );
}
export function getExecutionActionEconomySnapshot(
  executionId
) {
  return (
    getStoredActionEconomyState(
      executionId
    )
      ?.snapshot ??
    null
  );
}
export function getExecutionActionEconomyValidation(
  executionId
) {
  return (
    getStoredActionEconomyState(
      executionId
    )
      ?.validation ??
    null
  );
}
export function getExecutionActionEconomyCommit(
  executionId
) {
  return (
    getStoredActionEconomyState(
      executionId
    )
      ?.commit ??
    null
  );
}
/* ============================================================
   MANUAL CLEANUP
   ============================================================ */
export function clearExecutionActionEconomyHookState(
  executionId
) {
  return clearActionEconomyState(
    executionId
  );
}
export function clearAllExecutionActionEconomyHookState() {
  const count =
    ACTION_ECONOMY_TRANSACTION_STATE.size;
  ACTION_ECONOMY_TRANSACTION_STATE.clear();
  return count;
}
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
export function getActionEconomyHookDiagnostics() {
  return Object.freeze({
    id:
      ACTION_ECONOMY_HOOKS_MODULE_ID,
    version:
      ACTION_ECONOMY_HOOKS_MODULE_VERSION,
    registered:
      areActionEconomyTransactionHooksRegistered(),
    augmentationResolverConfigured:
      typeof actionEconomyAugmentationResolver ===
      "function",
    activeExecutionCount:
      ACTION_ECONOMY_TRANSACTION_STATE.size,
    activeExecutionIds:
      Object.freeze([
        ...ACTION_ECONOMY_TRANSACTION_STATE.keys()
      ])
  });
}
/* ============================================================
   HOOK ORDERING NOTES
   ============================================================ */
/**
 * @section hook-ordering-notes
 *
 * Recommended BEFORE_PRE_VALIDATE order:
 *
 * controller/core guards
 * → action economy
 * → resources
 * → feature-specific preconditions
 *
 * Why:
 *
 * if no Quick/Full/Protocol/Reaction economy is available, do not continue
 * into resource resolution or target UI.
 *
 *
 * Recommended BEFORE_COMMIT:
 *
 * action economy
 * → resources
 * → later observers
 *
 * Both are already after successful mechanical execution because the
 * execution transaction runner owns commit timing.
 */
/* ============================================================
   PROTOCOL NOTES
   ============================================================ */
/**
 * @section protocol-notes
 *
 * Protocol is handled automatically because the request retained during
 * prevalidation includes:
 *
 * activationType = PROTOCOL
 *
 * Prevalidation checks:
 *
 * turnPhase = START
 * protocolUsed = false
 * anyActionTaken = false
 *
 * Commit then records:
 *
 * protocolUsed = true
 * turnPhase = ACTIVE
 * anyActionTaken = true
 *
 * No separate Protocol hook is needed.
 */
/* ============================================================
   FEATURE RUNTIME BRIDGE INTEGRATION NOTES
   ============================================================ */
/**
 * @section feature-runtime-bridge-integration-notes
 *
 * Future:
 *
 * feature registry entry
 *        +
 * runtime augmentation
 *        ↓
 * feature_runtime_bridge
 *        ↓
 * setActionEconomyAugmentationResolver(...)
 *
 * Example augmentation:
 *
 * {
 *   activationType: "quick",
 *   cost: {
 *     quick: 1
 *   }
 * }
 *
 * Existing registry entries do not need direct refactoring.
 */
/* ============================================================
   EXECUTION TRANSACTION INTEGRATION NOTES
   ============================================================ */
/**
 * @section execution-transaction-integration-notes
 *
 * SUCCESS:
 *
 * BEFORE_PRE_VALIDATE
 * → snapshot + validate economy
 *
 * execute/resolve
 *
 * BEFORE_COMMIT
 * → revalidate + mutate turn state
 *
 * AFTER_COMMIT
 * → expose result
 *
 * ON_SUCCESS
 * → cleanup
 *
 *
 * BLOCK BEFORE EXECUTION:
 *
 * no economy mutation
 * → cleanup
 *
 *
 * CANCEL:
 *
 * no economy mutation
 * → cleanup
 *
 *
 * FAILURE BEFORE COMMIT:
 *
 * no economy mutation
 * → cleanup
 *
 *
 * COMMIT FAILURE:
 *
 * execution already happened
 * → transaction runner preserves PARTIAL
 * → cleanup
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature_turn/
 * -------------
 *
 * Remains authoritative.
 *
 * Hooks never mutate it directly.
 *
 * action-economy-transaction/state perform all access through the adapter.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Should stop manually consuming Quick/Full action state once these hooks
 * are active.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Carries:
 *
 * activation type
 * requested cost
 * granted/free overrides
 * reaction context
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns timing.
 *
 * Hooks attach action economy to its stable lifecycle.
 *
 *
 * resource_service/
 * -----------------
 *
 * Remains separate.
 *
 * Action economy hooks should generally run before resource hooks.
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * Supplies missing activation/cost semantics through augmentation resolver.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Future lifecycle integration resets:
 *
 * turn-start economy
 * reaction availability
 *
 * Hooks do not perform those resets.
 */
/* ============================================================
   INITIALIZATION NOTES
   ============================================================ */
/**
 * @section initialization-notes
 *
 * Future top-level runtime composition:
 *
 * configure action-economy turn-state adapter
 *
 * configure feature_runtime_bridge
 *
 * setActionEconomyAugmentationResolver(...)
 *
 * registerActionEconomyTransactionHooks()
 *
 * Do not register these hooks per action.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Action economy hooks attach action_economy to execution_transaction
 * without changing runner sequencing.
 *
 * INVARIANT 2
 * Economy is validated before targeting/execution.
 *
 * INVARIANT 3
 * Exact pre-execution economy state is retained until commit.
 *
 * INVARIANT 4
 * Economy is not mutated on block/cancel/failure before execution.
 *
 * INVARIANT 5
 * Commit revalidates economy before mutation.
 *
 * INVARIANT 6
 * Commit failure after mechanical execution preserves PARTIAL truth.
 *
 * INVARIANT 7
 * Protocol requires no special hook path; standard economy semantics handle
 * its timing and once-per-turn rule.
 *
 * INVARIANT 8
 * Per-execution hook state is cleaned on every terminal outcome.
 *
 * INVARIANT 9
 * feature_turn remains authoritative turn-state backing.
 *
 * INVARIANT 10
 * resource_service remains separate.
 *
 * INVARIANT 11
 * Feature runtime augmentation supplies only missing economy metadata.
 *
 * INVARIANT 12
 * Global hooks are registered once during runtime composition.
 */