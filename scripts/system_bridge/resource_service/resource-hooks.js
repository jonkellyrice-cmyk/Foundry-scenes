/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/resource_service/resource-hooks.js
 */
/**
 * @file
 * @path main/resource_service/resource-hooks.js
 * @module resource-hooks
 * @layer resource-service-transaction-integration
 * @responsibility attach-resource-validation-and-commit-to-execution-transactions
 * @public-boundary false
 * @side-effects resource-validation-resource-commit-and-hook-registration
 *
 * @depends-on
 * - resource-contract
 * - resource-transaction
 * - execution_transaction/execution-transaction
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - registers resource behavior into execution_transaction/
 * - validates execution resources before targeting/execution
 * - preserves pre-execution ResourceTransactionSnapshot by executionId
 * - verifies native-consumed resources after execution
 * - commits deferred Frame Conn resources during transaction commit
 * - accepts supplemental declarations from future feature_runtime_bridge/
 * - accepts Frame Conn persistence writer from future supplemental-state
 *   storage
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - execution_transaction/ owns transaction sequencing
 * - resource-transaction.js owns resource validation/mutation semantics
 * - resource-resolver.js owns discovery/state reads
 * - native_adapter/ owns native Lancer state access
 * - lifecycle_service/ will own reset timing
 * - feature registry remains existing semantic declaration authority
 *
 * THIS FILE OWNS:
 * - resource transaction hook registration
 * - per-execution resource snapshot retention
 * - resource pre-validation hook
 * - resource commit hook
 * - resource hook cleanup
 * - runtime injection of augmentation declarations/writer
 *
 * THIS FILE DOES NOT OWN:
 * - resource contracts
 * - resource discovery implementation
 * - resource mutation implementation
 * - transaction sequencing
 * - native Flow execution
 * - lifecycle resets
 * - action economy
 * - feature-specific mechanics
 *
 * EDIT CONTRACT:
 * - do not duplicate native resource consumption
 * - prepare resource state before execution
 * - retain exact before-state until commit
 * - commit only at transaction commit boundary
 * - clean transaction-local state on every terminal outcome
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  RESOURCE_COMMIT_STATUS
} from "./resource-contract.js";
import {
  beginResourceTransaction,
  commitExecutionResources
} from "./resource-transaction.js";
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
export const RESOURCE_HOOKS_MODULE_ID =
  "lancer-frame-conn.resource-hooks";
export const RESOURCE_HOOKS_MODULE_VERSION =
  1;
/* ============================================================
   HOOK IDS
   ============================================================ */
/**
 * @section hook-ids
 */
export const RESOURCE_HOOK_ID =
  Object.freeze({
    PRE_VALIDATE:
      "resource-service.pre-validate",
    BEFORE_COMMIT:
      "resource-service.before-commit",
    AFTER_COMMIT:
      "resource-service.after-commit",
    SUCCESS_CLEANUP:
      "resource-service.success-cleanup",
    BLOCK_CLEANUP:
      "resource-service.block-cleanup",
    CANCEL_CLEANUP:
      "resource-service.cancel-cleanup",
    FAILURE_CLEANUP:
      "resource-service.failure-cleanup",
    PARTIAL_CLEANUP:
      "resource-service.partial-cleanup"
  });
/* ============================================================
   RESOURCE HOOK PRIORITY
   ============================================================ */
/**
 * @section resource-hook-priority
 *
 * Resource validation should occur after core/controller guards and
 * action-economy validation, but before feature-specific execution.
 *
 * Resource commit occurs early within commit handling so later observers
 * see committed resource state.
 */
export const RESOURCE_HOOK_PRIORITY =
  Object.freeze({
    PRE_VALIDATE:
      EXECUTION_HOOK_PRIORITY.NORMAL,
    BEFORE_COMMIT:
      EXECUTION_HOOK_PRIORITY.NORMAL,
    AFTER_COMMIT:
      EXECUTION_HOOK_PRIORITY.NORMAL,
    CLEANUP:
      EXECUTION_HOOK_PRIORITY.LATEST
  });
/* ============================================================
   PRIVATE RUNTIME STATE
   ============================================================ */
/**
 * @section private-runtime-state
 *
 * Key:
 * executionId
 *
 * Value:
 * {
 *   resourceSnapshot,
 *   validation,
 *   commit,
 *   declarations
 * }
 *
 * Resource state is transaction-local.
 */
const RESOURCE_TRANSACTION_STATE =
  new Map();
/* ============================================================
   RUNTIME CONFIGURATION
   ============================================================ */
/**
 * @section runtime-configuration
 *
 * declarationResolver:
 *
 * async ({ context, transaction }) => ResourceDeclaration[]
 *
 * Used by future feature_runtime_bridge/ to provide augmentation resources
 * without rewriting the existing registry.
 *
 *
 * frameConnWriter:
 *
 * async ({
 *   context,
 *   descriptor,
 *   before,
 *   value,
 *   operation
 * }) => any
 *
 * Used by future supplemental persistence boundary.
 */
let resourceDeclarationResolver =
  null;
let frameConnResourceWriter =
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
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
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
function getStoredResourceState(
  executionId
) {
  if (!requiredString(executionId)) {
    return null;
  }
  return (
    RESOURCE_TRANSACTION_STATE.get(
      executionId
    ) ??
    null
  );
}
function storeResourceState(
  executionId,
  state
) {
  if (!requiredString(executionId)) {
    throw new TypeError(
      "Resource hook state requires executionId."
    );
  }
  RESOURCE_TRANSACTION_STATE.set(
    executionId,
    Object.freeze({
      ...state
    })
  );
  return (
    RESOURCE_TRANSACTION_STATE.get(
      executionId
    )
  );
}
function patchResourceState(
  executionId,
  patch
) {
  const existing =
    getStoredResourceState(
      executionId
    ) ??
    {};
  return storeResourceState(
    executionId,
    {
      ...existing,
      ...patch
    }
  );
}
function clearResourceState(
  executionId
) {
  if (!requiredString(executionId)) {
    return false;
  }
  return RESOURCE_TRANSACTION_STATE.delete(
    executionId
  );
}
/* ============================================================
   RESOURCE DECLARATION RESOLVER
   ============================================================ */
/**
 * @section resource-declaration-resolver
 */
export function setResourceDeclarationResolver(
  resolver
) {
  if (
    resolver != null &&
    typeof resolver !== "function"
  ) {
    throw new TypeError(
      "Resource declaration resolver must be function or null."
    );
  }
  resourceDeclarationResolver =
    resolver;
  return true;
}
export function getResourceDeclarationResolver() {
  return resourceDeclarationResolver;
}
/* ============================================================
   FRAME CONN RESOURCE WRITER
   ============================================================ */
/**
 * @section frame-conn-resource-writer
 */
export function setFrameConnResourceWriter(
  writer
) {
  if (
    writer != null &&
    typeof writer !== "function"
  ) {
    throw new TypeError(
      "Frame Conn resource writer must be function or null."
    );
  }
  frameConnResourceWriter =
    writer;
  return true;
}
export function getFrameConnResourceWriter() {
  return frameConnResourceWriter;
}
/* ============================================================
   SUPPLEMENTAL DECLARATION RESOLUTION
   ============================================================ */
/**
 * @section supplemental-declaration-resolution
 *
 * Existing declarations embedded in the semantic definition are resolved
 * by resource-resolver.js directly.
 *
 * This resolver is specifically an extension point for runtime
 * augmentation.
 */
async function resolveSupplementalDeclarations(
  payload
) {
  if (
    typeof resourceDeclarationResolver !==
    "function"
  ) {
    return Object.freeze([]);
  }
  const result =
    await resourceDeclarationResolver({
      context:
        payload.context,
      transaction:
        payload.transaction
    });
  if (result == null) {
    return Object.freeze([]);
  }
  return freezeArray(
    Array.isArray(result)
      ? result
      : [result]
  );
}
/* ============================================================
   PRE-VALIDATION HOOK
   ============================================================ */
/**
 * @section pre-validation-hook
 *
 * Transaction position:
 *
 * BEFORE_PRE_VALIDATE
 *
 * Responsibilities:
 *
 * 1. resolve supplemental resource declarations
 * 2. discover all native/supplemental resources
 * 3. snapshot resource state
 * 4. validate required resources
 * 5. retain snapshot until commit
 *
 * Invalid resource state blocks execution before target selection.
 */
export async function runResourcePreValidationHook(
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
        "Resource validation requires executionId."
      ),
      {
        reason:
          "resource-execution-id-missing"
      }
    );
  }
  let declarations;
  try {
    declarations =
      await resolveSupplementalDeclarations(
        payload
      );
  } catch (error) {
    return failTransaction(
      "before-pre-validate",
      error,
      {
        reason:
          "resource-declaration-resolution-failed",
        context:
          payload.context
      }
    );
  }
  let prepared;
  try {
    prepared =
      await beginResourceTransaction(
        payload.context,
        {
          declarations
        }
      );
  } catch (error) {
    return failTransaction(
      "before-pre-validate",
      error,
      {
        reason:
          "resource-transaction-preparation-failed",
        context:
          payload.context
      }
    );
  }
  storeResourceState(
    executionId,
    {
      resourceSnapshot:
        prepared.snapshot,
      validation:
        prepared.validation,
      commit:
        null,
      declarations
    }
  );
  if (
    !prepared
      .validation
      .valid
  ) {
    const failedResources =
      prepared
        .validation
        .failed ??
      [];
    const firstIssue =
      failedResources
        ?.[0]
        ?.issues
        ?.[0] ??
      null;
    return blockTransaction(
      "before-pre-validate",
      firstIssue?.message ??
      "Required execution resource is unavailable.",
      {
        context:
          payload.context,
        metadata: {
          resourceValidation:
            prepared.validation,
          resourceSnapshot:
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
        resourceValidation:
          prepared.validation,
        resourceCount:
          prepared
            .snapshot
            .descriptors
            .length
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
 * Transaction position:
 *
 * BEFORE_COMMIT
 *
 * At this point:
 *
 * - native execution has completed
 * - semantic resolution has completed
 * - transaction runner has established commit eligibility
 *
 * Therefore this is the safe point to:
 *
 * - verify native-consumed resources
 * - consume deferred Frame Conn resources
 */
export async function runResourceBeforeCommitHook(
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
        "Resource commit requires executionId."
      ),
      {
        reason:
          "resource-execution-id-missing",
        context:
          payload.context
      }
    );
  }
  const state =
    getStoredResourceState(
      executionId
    );
  /*
   * No prevalidation state means either:
   *
   * - no resource hook ran
   * - execution intentionally bypassed resource preparation
   *
   * Do not invent resources during commit.
   */
  if (!state?.resourceSnapshot) {
    return continueTransaction(
      "before-commit",
      {
        context:
          payload.context,
        metadata: {
          resourceCommit:
            "no-resource-snapshot"
        }
      }
    );
  }
  let commitResult;
  try {
    commitResult =
      await commitExecutionResources(
        payload.context,
        state.resourceSnapshot,
        {
          frameConnWriter:
            frameConnResourceWriter
        }
      );
  } catch (error) {
    patchResourceState(
      executionId,
      {
        commit:
          Object.freeze({
            status:
              RESOURCE_COMMIT_STATUS.FAILED,
            error
          })
      }
    );
    return failTransaction(
      "before-commit",
      error,
      {
        reason:
          "resource-commit-threw",
        context:
          payload.context,
        metadata: {
          resourceSnapshot:
            state.resourceSnapshot
        }
      }
    );
  }
  patchResourceState(
    executionId,
    {
      commit:
        commitResult
    }
  );
  switch (
    commitResult.status
  ) {
    case RESOURCE_COMMIT_STATUS.COMMITTED:
    case RESOURCE_COMMIT_STATUS.VERIFIED:
    case RESOURCE_COMMIT_STATUS.NOTHING_TO_COMMIT:
    case RESOURCE_COMMIT_STATUS.SKIPPED:
      return continueTransaction(
        "before-commit",
        {
          context:
            payload.context,
          metadata: {
            resourceCommit:
              commitResult
          }
        }
      );
    case RESOURCE_COMMIT_STATUS.PARTIAL:
      /*
       * Returning FAIL here is intentional.
       *
       * execution-transaction-runner knows native/semantic execution has
       * already occurred and therefore converts this terminal condition to
       * PARTIAL rather than pretending execution never happened.
       */
      return failTransaction(
        "before-commit",
        new Error(
          commitResult.reason ??
          "Resource commit partially failed."
        ),
        {
          reason:
            commitResult.reason ??
            "resource-commit-partial",
          context:
            payload.context,
          metadata: {
            resourceCommit:
              commitResult,
            partial:
              true
          }
        }
      );
    case RESOURCE_COMMIT_STATUS.FAILED:
    default:
      return failTransaction(
        "before-commit",
        commitResult.error ??
        new Error(
          commitResult.reason ??
          "Resource commit failed."
        ),
        {
          reason:
            commitResult.reason ??
            "resource-commit-failed",
          context:
            payload.context,
          metadata: {
            resourceCommit:
              commitResult
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
 * Observational only.
 *
 * Resource state is retained until terminal cleanup so semantic event
 * hooks running later in the same stage can still inspect it if needed.
 */
export async function runResourceAfterCommitHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  const state =
    getStoredResourceState(
      executionId
    );
  return continueTransaction(
    "after-commit",
    {
      context:
        payload.context,
      metadata: {
        resourceCommit:
          state?.commit ??
          null,
        resourceSnapshot:
          state?.resourceSnapshot ??
          null
      }
    }
  );
}
/* ============================================================
   TERMINAL CLEANUP
   ============================================================ */
/**
 * @section terminal-cleanup
 */
export async function runResourceTerminalCleanupHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );
  clearResourceState(
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
 * Resource service is cross-cutting and therefore uses global transaction
 * hooks.
 *
 * registerResourceTransactionHooks() is intended to be called once during
 * runtime composition/init.
 */
let registeredResourceHooks =
  null;
export function registerResourceTransactionHooks() {
  if (registeredResourceHooks) {
    return registeredResourceHooks;
  }
  const registrations = [
    onBeforePreValidate(
      runResourcePreValidationHook,
      {
        id:
          RESOURCE_HOOK_ID.PRE_VALIDATE,
        priority:
          RESOURCE_HOOK_PRIORITY.PRE_VALIDATE,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onBeforeCommit(
      runResourceBeforeCommitHook,
      {
        id:
          RESOURCE_HOOK_ID.BEFORE_COMMIT,
        priority:
          RESOURCE_HOOK_PRIORITY.BEFORE_COMMIT,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onAfterCommit(
      runResourceAfterCommitHook,
      {
        id:
          RESOURCE_HOOK_ID.AFTER_COMMIT,
        priority:
          RESOURCE_HOOK_PRIORITY.AFTER_COMMIT,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onTransactionSuccess(
      runResourceTerminalCleanupHook,
      {
        id:
          RESOURCE_HOOK_ID.SUCCESS_CLEANUP,
        priority:
          RESOURCE_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onTransactionBlock(
      runResourceTerminalCleanupHook,
      {
        id:
          RESOURCE_HOOK_ID.BLOCK_CLEANUP,
        priority:
          RESOURCE_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onTransactionCancel(
      runResourceTerminalCleanupHook,
      {
        id:
          RESOURCE_HOOK_ID.CANCEL_CLEANUP,
        priority:
          RESOURCE_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onTransactionFailure(
      runResourceTerminalCleanupHook,
      {
        id:
          RESOURCE_HOOK_ID.FAILURE_CLEANUP,
        priority:
          RESOURCE_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    ),
    onTransactionPartial(
      runResourceTerminalCleanupHook,
      {
        id:
          RESOURCE_HOOK_ID.PARTIAL_CLEANUP,
        priority:
          RESOURCE_HOOK_PRIORITY.CLEANUP,
        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.RESOURCE,
        sourceId:
          RESOURCE_HOOKS_MODULE_ID
      }
    )
  ];
  registeredResourceHooks =
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
        registeredResourceHooks =
          null;
        RESOURCE_TRANSACTION_STATE.clear();
        return disposed;
      }
    });
  return registeredResourceHooks;
}
/* ============================================================
   GLOBAL HOOK UNREGISTRATION
   ============================================================ */
/**
 * @section global-hook-unregistration
 */
export function unregisterResourceTransactionHooks() {
  if (!registeredResourceHooks) {
    return 0;
  }
  return registeredResourceHooks
    .dispose();
}
export function areResourceTransactionHooksRegistered() {
  return Boolean(
    registeredResourceHooks
  );
}
/* ============================================================
   RESOURCE TRANSACTION STATE ACCESS
   ============================================================ */
/**
 * @section resource-transaction-state-access
 *
 * Primarily diagnostics/event integration.
 *
 * Do not mutate returned state.
 */
export function getExecutionResourceHookState(
  executionId
) {
  return getStoredResourceState(
    executionId
  );
}
export function getExecutionResourceSnapshot(
  executionId
) {
  return (
    getStoredResourceState(
      executionId
    )
      ?.resourceSnapshot ??
    null
  );
}
export function getExecutionResourceValidation(
  executionId
) {
  return (
    getStoredResourceState(
      executionId
    )
      ?.validation ??
    null
  );
}
export function getExecutionResourceCommit(
  executionId
) {
  return (
    getStoredResourceState(
      executionId
    )
      ?.commit ??
    null
  );
}
/* ============================================================
   MANUAL CLEANUP
   ============================================================ */
/**
 * @section manual-cleanup
 *
 * Defensive recovery only.
 */
export function clearExecutionResourceHookState(
  executionId
) {
  return clearResourceState(
    executionId
  );
}
export function clearAllExecutionResourceHookState() {
  const count =
    RESOURCE_TRANSACTION_STATE.size;
  RESOURCE_TRANSACTION_STATE.clear();
  return count;
}
/* ============================================================
   RESOURCE HOOK DIAGNOSTICS
   ============================================================ */
/**
 * @section resource-hook-diagnostics
 */
export function getResourceHookDiagnostics() {
  return Object.freeze({
    id:
      RESOURCE_HOOKS_MODULE_ID,
    version:
      RESOURCE_HOOKS_MODULE_VERSION,
    registered:
      areResourceTransactionHooksRegistered(),
    declarationResolverConfigured:
      typeof resourceDeclarationResolver ===
      "function",
    frameConnWriterConfigured:
      typeof frameConnResourceWriter ===
      "function",
    activeExecutionCount:
      RESOURCE_TRANSACTION_STATE.size,
    activeExecutionIds:
      Object.freeze([
        ...RESOURCE_TRANSACTION_STATE.keys()
      ])
  });
}
/* ============================================================
   FEATURE RUNTIME BRIDGE INTEGRATION NOTES
   ============================================================ */
/**
 * @section feature-runtime-bridge-integration-notes
 *
 * This is the attachment point for the bridge discussed in the runtime
 * architecture.
 *
 * Future composition:
 *
 * feature registry entry
 *        +
 * runtime augmentation
 *        ↓
 * feature_runtime_bridge
 *        ↓
 * resource declaration resolver
 *        ↓
 * resource-hooks
 *        ↓
 * resource-resolver
 *
 * Expected configuration:
 *
 * setResourceDeclarationResolver(
 *   ({ context }) =>
 *     featureRuntimeBridge
 *       .getResourceDeclarations(context)
 * )
 *
 * The existing registry therefore does NOT need every entry rewritten.
 */
/* ============================================================
   SUPPLEMENTAL PERSISTENCE INTEGRATION NOTES
   ============================================================ */
/**
 * @section supplemental-persistence-integration-notes
 *
 * Frame Conn-owned frequency/counter state needs persistent backing.
 *
 * Future runtime composition:
 *
 * setFrameConnResourceWriter(
 *   request =>
 *     supplementalStateRepository
 *       .writeResource(request)
 * )
 *
 * resource-hooks and resource-transaction remain independent from the
 * concrete Foundry flag/document storage path.
 */
/* ============================================================
   EXECUTION TRANSACTION INTEGRATION NOTES
   ============================================================ */
/**
 * @section execution-transaction-integration-notes
 *
 * NORMAL SUCCESS
 * --------------
 *
 * BEFORE_PRE_VALIDATE
 * → prepare + validate resources
 * → retain pre-execution snapshot
 *
 * native/semantic execution
 *
 * BEFORE_COMMIT
 * → verify native resources
 * → commit deferred resources
 *
 * AFTER_COMMIT
 * → expose final resource result
 *
 * ON_SUCCESS
 * → cleanup
 *
 *
 * BLOCK BEFORE EXECUTION
 * ----------------------
 *
 * resource invalid
 * → BLOCK
 * → no resource commit
 * → ON_BLOCK cleanup
 *
 *
 * USER CANCEL
 * -----------
 *
 * target/HUD cancelled
 * → no resource commit
 * → ON_CANCEL cleanup
 *
 *
 * EXECUTION FAILURE
 * -----------------
 *
 * native/semantic execution fails
 * → no resource commit
 * → ON_FAILURE cleanup
 *
 *
 * COMMIT FAILURE
 * --------------
 *
 * primary execution already happened
 * → BEFORE_COMMIT returns FAIL
 * → transaction runner preserves PARTIAL
 * → ON_PARTIAL cleanup
 */
/* ============================================================
   NATIVE RESOURCE SAFETY NOTES
   ============================================================ */
/**
 * @section native-resource-safety-notes
 *
 * LIMITED / LOADED / CORE ENERGY
 * ------------------------------
 *
 * pre-validation:
 * read native state
 *
 * execute:
 * native Lancer Flow mutates
 *
 * commit:
 * verify native transition only
 *
 * NEVER:
 * decrement/unload/spend a second time
 *
 *
 * NATIVE COUNTER + FRAME CONN SEMANTICS
 * -------------------------------------
 *
 * ResourceDescriptor may specify:
 *
 * authority = NATIVE
 * consumption = DEFERRED
 *
 * In that case resource-transaction.js deliberately writes through
 * native_adapter during commit.
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Should not call resource validation/commit manually.
 *
 * Runtime initialization registers these hooks once.
 *
 * Ordinary transaction execution automatically receives resource behavior
 * through globalExecutionTransactionHooks.
 *
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 *
 * Remain unchanged.
 *
 * Missing resource semantics arrive through:
 *
 * feature_runtime_bridge
 * → setResourceDeclarationResolver(...)
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies source/feature/native identity used by resource resolution.
 *
 * Resource hooks do not mutate ExecutionContext.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns exact stage timing.
 *
 * Resource hooks only attach behavior to those stable stages.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Resource state read/write remains below resource-transaction.js.
 *
 * resource-hooks never touch native documents directly.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Future lifecycle service restores:
 *
 * 1/turn
 * 1/round
 * 1/scene
 * Full Repair
 * other supplemental resources
 *
 * according to ResourceDescriptor.resetScope.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Later event hooks can inspect resource transaction results before
 * terminal cleanup if ordered earlier than CLEANUP/LATEST.
 */
/* ============================================================
   INITIALIZATION NOTES
   ============================================================ */
/**
 * @section initialization-notes
 *
 * Future top-level runtime composition should approximately do:
 *
 * configure native_adapter
 *
 * configure feature_runtime_bridge
 *
 * setResourceDeclarationResolver(...)
 *
 * configure supplemental resource writer
 *
 * setFrameConnResourceWriter(...)
 *
 * registerResourceTransactionHooks()
 *
 * then initialize runtime-orchestrator/UI.
 *
 * Do not register resource hooks repeatedly per action.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Resource hooks attach resource_service to execution_transaction without
 * changing transaction sequencing.
 *
 * INVARIANT 2
 * Required resources are validated before target acquisition/execution.
 *
 * INVARIANT 3
 * Exact pre-execution resource state survives until commit.
 *
 * INVARIANT 4
 * Deferred resources are not consumed on block/cancel/failure before
 * execution.
 *
 * INVARIANT 5
 * Native Flow-owned resources are verified, never double-consumed.
 *
 * INVARIANT 6
 * Commit failure after mechanical execution results in transaction
 * PARTIAL truth.
 *
 * INVARIANT 7
 * Per-execution resource hook state is cleaned on every terminal outcome.
 *
 * INVARIANT 8
 * Runtime augmentation is injected through declaration resolver rather
 * than hardcoded registry refactors.
 *
 * INVARIANT 9
 * Supplemental persistence is injected through Frame Conn writer rather
 * than hardcoded Foundry storage paths.
 *
 * INVARIANT 10
 * Resource rules remain owned by resource-contract/resource-transaction,
 * not this hook layer.
 *
 * INVARIANT 11
 * lifecycle reset behavior remains outside this module.
 *
 * INVARIANT 12
 * action economy remains a separate foundational service.
 *
 * INVARIANT 13
 * Global resource hooks should be registered once during runtime
 * composition.
 *
 * INVARIANT 14
 * Feature-specific resources use generic declarations rather than
 * feature-specific hook code whenever possible.
 */