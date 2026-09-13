/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/execution_transaction/execution-transaction-contract.js
 */

/**
 * @file
 * @path main/execution_transaction/execution-transaction-contract.js
 * @module execution-transaction-contract
 * @layer execution-transaction-contract
 * @responsibility define-stable-frame-conn-execution-transaction-shapes
 * @public-boundary true
 * @side-effects none
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes ExecutionContext from semantic_execution_context/
 * - consumed by execution-transaction-runner.js
 * - consumed by execution-transaction-hooks.js
 * - consumed by execution-transaction.js
 * - consumed by runtime-orchestrator.js
 * - consumed by resource_service/*
 * - consumed by action_economy/*
 * - consumed by targeting_spatial_service/*
 * - consumed by semantic_event_bus/*
 * - consumed by lifecycle_service/*
 * - consumed by execution-strategy runtimes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - runtime-orchestrator.js remains high-level coordinator
 * - semantic_execution_context/ remains canonical execution-input authority
 * - native_adapter/ remains native Lancer execution authority
 * - feature_actions/* remain semantic action-definition/composition code
 * - feature_turn/ remains turn-feature composition
 * - feature_movement/ remains movement-feature composition/tracking
 *
 * THIS FILE OWNS:
 * - transaction status
 * - transaction phase
 * - normalized validation results
 * - normalized targeting results
 * - normalized execution results
 * - normalized resolution results
 * - normalized commit results
 * - transaction hook result contracts
 * - transaction final-result contracts
 * - cancellation/failure/block semantics
 *
 * THIS FILE DOES NOT OWN:
 * - transaction sequencing
 * - native execution
 * - action economy
 * - resource mutation
 * - target legality
 * - lifecycle
 * - semantic event dispatch
 * - feature-specific mechanics
 *
 * EDIT CONTRACT:
 * - contain no Foundry/Lancer imports
 * - contain no document mutation
 * - preserve explicit distinction between blocked/cancelled/failed
 * - preserve immutable result snapshots
 */

/* ============================================================
   TRANSACTION STATUS
   ============================================================ */

/**
 * @section transaction-status
 *
 * Final transaction outcome.
 */

export const EXECUTION_TRANSACTION_STATUS = Object.freeze({
  PENDING:
    "pending",

  SUCCEEDED:
    "succeeded",

  BLOCKED:
    "blocked",

  CANCELLED:
    "cancelled",

  FAILED:
    "failed",

  PARTIAL:
    "partial"
});

/* ============================================================
   TRANSACTION PHASE
   ============================================================ */

/**
 * @section transaction-phase
 *
 * execution-transaction-runner.js owns legal transitions.
 */

export const EXECUTION_TRANSACTION_PHASE = Object.freeze({
  CREATED:
    "created",

  REBUILDING_CONTEXT:
    "rebuilding-context",

  PRE_VALIDATING:
    "pre-validating",

  TARGETING:
    "targeting",

  FINAL_VALIDATING:
    "final-validating",

  EXECUTING:
    "executing",

  RESOLVING:
    "resolving",

  COMMITTING:
    "committing",

  SUCCEEDED:
    "succeeded",

  BLOCKED:
    "blocked",

  CANCELLED:
    "cancelled",

  FAILED:
    "failed",

  PARTIAL:
    "partial"
});

/* ============================================================
   RESULT KIND
   ============================================================ */

export const EXECUTION_TRANSACTION_RESULT_KIND = Object.freeze({
  VALIDATION:
    "validation",

  TARGETING:
    "targeting",

  EXECUTION:
    "execution",

  RESOLUTION:
    "resolution",

  COMMIT:
    "commit",

  HOOK:
    "hook",

  FINAL:
    "final"
});

/* ============================================================
   VALIDATION STATUS
   ============================================================ */

export const EXECUTION_VALIDATION_STATUS = Object.freeze({
  VALID:
    "valid",

  INVALID:
    "invalid",

  CANCELLED:
    "cancelled",

  SKIPPED:
    "skipped"
});

/* ============================================================
   TARGETING STATUS
   ============================================================ */

export const EXECUTION_TARGETING_STATUS = Object.freeze({
  READY:
    "ready",

  CANCELLED:
    "cancelled",

  BLOCKED:
    "blocked",

  SKIPPED:
    "skipped"
});

/* ============================================================
   EXECUTION STEP STATUS
   ============================================================ */

export const EXECUTION_STEP_STATUS = Object.freeze({
  SUCCEEDED:
    "succeeded",

  BLOCKED:
    "blocked",

  CANCELLED:
    "cancelled",

  FAILED:
    "failed",

  SKIPPED:
    "skipped",

  PARTIAL:
    "partial"
});

/* ============================================================
   COMMIT STATUS
   ============================================================ */

export const EXECUTION_COMMIT_STATUS = Object.freeze({
  COMMITTED:
    "committed",

  NOTHING_TO_COMMIT:
    "nothing-to-commit",

  FAILED:
    "failed",

  PARTIAL:
    "partial",

  SKIPPED:
    "skipped"
});

/* ============================================================
   HOOK STAGE
   ============================================================ */

/**
 * @section hook-stage
 *
 * Stable semantic extension points.
 *
 * The hooks module owns registration/execution.
 */

export const EXECUTION_TRANSACTION_HOOK_STAGE = Object.freeze({
  BEFORE_REBUILD:
    "before-rebuild",

  AFTER_REBUILD:
    "after-rebuild",

  BEFORE_PRE_VALIDATE:
    "before-pre-validate",

  AFTER_PRE_VALIDATE:
    "after-pre-validate",

  BEFORE_TARGETING:
    "before-targeting",

  AFTER_TARGETING:
    "after-targeting",

  BEFORE_FINAL_VALIDATE:
    "before-final-validate",

  AFTER_FINAL_VALIDATE:
    "after-final-validate",

  BEFORE_EXECUTE:
    "before-execute",

  AFTER_EXECUTE:
    "after-execute",

  BEFORE_RESOLVE:
    "before-resolve",

  AFTER_RESOLVE:
    "after-resolve",

  BEFORE_COMMIT:
    "before-commit",

  AFTER_COMMIT:
    "after-commit",

  ON_SUCCESS:
    "on-success",

  ON_BLOCK:
    "on-block",

  ON_CANCEL:
    "on-cancel",

  ON_FAILURE:
    "on-failure",

  ON_PARTIAL:
    "on-partial"
});

/* ============================================================
   HOOK RESULT ACTION
   ============================================================ */

/**
 * @section hook-result-action
 *
 * Hook return values may influence transaction flow.
 */

export const EXECUTION_HOOK_ACTION = Object.freeze({
  CONTINUE:
    "continue",

  BLOCK:
    "block",

  CANCEL:
    "cancel",

  FAIL:
    "fail",

  REPLACE_CONTEXT:
    "replace-context"
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

function isEnumValue(
  enumObject,
  value
) {
  return Object.values(
    enumObject
  ).includes(value);
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

function generateTransactionId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID ===
    "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return (
    `fc-transaction-${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

/* ============================================================
   TRANSACTION IDENTITY
   ============================================================ */

/**
 * @section transaction-identity
 *
 * Transaction ID and Execution ID are intentionally separate.
 *
 * One semantic ExecutionContext may theoretically be retried through a
 * new transaction.
 */

export function createExecutionTransactionIdentity({
  transactionId =
    generateTransactionId(),

  executionId,
  rootExecutionId = null,
  parentExecutionId = null
} = {}) {
  if (!requiredString(transactionId)) {
    throw new TypeError(
      "Execution transaction identity requires transactionId."
    );
  }

  if (!requiredString(executionId)) {
    throw new TypeError(
      "Execution transaction identity requires executionId."
    );
  }

  return Object.freeze({
    transactionId,
    executionId,
    rootExecutionId:
      rootExecutionId ??
      executionId,

    parentExecutionId
  });
}

/* ============================================================
   VALIDATION ISSUE
   ============================================================ */

/**
 * @section validation-issue
 */

export function createExecutionValidationIssue({
  code,
  message,
  source = null,
  severity = "error",
  metadata = {}
} = {}) {
  if (!requiredString(code)) {
    throw new TypeError(
      "Validation issue requires code."
    );
  }

  return Object.freeze({
    code,
    message:
      message ?? code,

    source,
    severity,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   VALIDATION RESULT
   ============================================================ */

/**
 * @section validation-result
 *
 * Used by:
 *
 * - action_economy
 * - resource_service
 * - targeting_spatial_service
 * - controller legality
 * - source-specific preconditions
 */

export function createExecutionValidationResult({
  status =
    EXECUTION_VALIDATION_STATUS.VALID,

  context = null,

  issues = [],

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_VALIDATION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid validation status: ${String(status)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.VALIDATION,

    status,

    valid:
      status ===
      EXECUTION_VALIDATION_STATUS.VALID,

    context,

    issues:
      freezeArray(issues),

    metadata:
      freezeObject(metadata)
  });
}

export function executionValidationSucceeded(
  options = {}
) {
  return createExecutionValidationResult({
    ...options,
    status:
      EXECUTION_VALIDATION_STATUS.VALID
  });
}

export function executionValidationFailed({
  issues = [],
  ...options
} = {}) {
  return createExecutionValidationResult({
    ...options,

    status:
      EXECUTION_VALIDATION_STATUS.INVALID,

    issues
  });
}

export function executionValidationCancelled(
  options = {}
) {
  return createExecutionValidationResult({
    ...options,

    status:
      EXECUTION_VALIDATION_STATUS.CANCELLED
  });
}

export function executionValidationSkipped(
  options = {}
) {
  return createExecutionValidationResult({
    ...options,

    status:
      EXECUTION_VALIDATION_STATUS.SKIPPED
  });
}

/* ============================================================
   TARGETING RESULT
   ============================================================ */

/**
 * @section targeting-result
 */

export function createExecutionTargetingResult({
  status =
    EXECUTION_TARGETING_STATUS.READY,

  context = null,

  targets = null,

  template = null,

  reason = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_TARGETING_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid targeting status: ${String(status)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.TARGETING,

    status,

    context,

    targets:
      targets == null
        ? null
        : freezeArray(
            targets
          ),

    template,

    reason,

    metadata:
      freezeObject(metadata)
  });
}

export function executionTargetingReady(
  options = {}
) {
  return createExecutionTargetingResult({
    ...options,

    status:
      EXECUTION_TARGETING_STATUS.READY
  });
}

export function executionTargetingCancelled(
  options = {}
) {
  return createExecutionTargetingResult({
    ...options,

    status:
      EXECUTION_TARGETING_STATUS.CANCELLED
  });
}

export function executionTargetingBlocked(
  options = {}
) {
  return createExecutionTargetingResult({
    ...options,

    status:
      EXECUTION_TARGETING_STATUS.BLOCKED
  });
}

export function executionTargetingSkipped(
  options = {}
) {
  return createExecutionTargetingResult({
    ...options,

    status:
      EXECUTION_TARGETING_STATUS.SKIPPED
  });
}

/* ============================================================
   EXECUTION STEP RESULT
   ============================================================ */

/**
 * @section execution-step-result
 *
 * Wraps native or Frame Conn-owned mechanic execution.
 *
 * `nativeResult` may hold NativeExecutionResult.
 *
 * `result` may hold Frame Conn semantic result.
 */

export function createExecutionStepResult({
  status =
    EXECUTION_STEP_STATUS.SUCCEEDED,

  context = null,

  result = null,
  nativeResult = null,

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_STEP_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid execution step status: ${String(status)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.EXECUTION,

    status,

    context,

    result,
    nativeResult,

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

export function executionStepSucceeded(
  options = {}
) {
  return createExecutionStepResult({
    ...options,

    status:
      EXECUTION_STEP_STATUS.SUCCEEDED
  });
}

export function executionStepBlocked(
  options = {}
) {
  return createExecutionStepResult({
    ...options,

    status:
      EXECUTION_STEP_STATUS.BLOCKED
  });
}

export function executionStepCancelled(
  options = {}
) {
  return createExecutionStepResult({
    ...options,

    status:
      EXECUTION_STEP_STATUS.CANCELLED
  });
}

export function executionStepFailed(
  options = {}
) {
  return createExecutionStepResult({
    ...options,

    status:
      EXECUTION_STEP_STATUS.FAILED
  });
}

export function executionStepPartial(
  options = {}
) {
  return createExecutionStepResult({
    ...options,

    status:
      EXECUTION_STEP_STATUS.PARTIAL
  });
}

export function executionStepSkipped(
  options = {}
) {
  return createExecutionStepResult({
    ...options,

    status:
      EXECUTION_STEP_STATUS.SKIPPED
  });
}

/* ============================================================
   RESOLUTION RESULT
   ============================================================ */

/**
 * @section resolution-result
 *
 * Resolution occurs after the primary mechanic executes.
 *
 * Examples:
 *
 * - interpret native hit results
 * - apply source-specific On Hit consequence
 * - execute granted child action
 * - apply post-execution status
 * - aggregate AoE target results
 */

export function createExecutionResolutionResult({
  status =
    EXECUTION_STEP_STATUS.SUCCEEDED,

  context = null,

  result = null,

  childTransactions = [],

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_STEP_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid resolution status: ${String(status)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.RESOLUTION,

    status,

    context,

    result,

    childTransactions:
      freezeArray(
        childTransactions
      ),

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   COMMIT RESULT
   ============================================================ */

/**
 * @section commit-result
 *
 * Commit is for deferred Frame Conn-owned state:
 *
 * - action frequency
 * - CounterData when native execution did not consume it
 * - supplemental resources
 * - action economy
 * - lifecycle records
 *
 * Native-consumed resources should normally be verified, not re-spent.
 */

export function createExecutionCommitResult({
  status =
    EXECUTION_COMMIT_STATUS.COMMITTED,

  context = null,

  committed = [],
  verifiedNative = [],
  skipped = [],

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_COMMIT_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid commit status: ${String(status)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.COMMIT,

    status,

    context,

    committed:
      freezeArray(
        committed
      ),

    verifiedNative:
      freezeArray(
        verifiedNative
      ),

    skipped:
      freezeArray(
        skipped
      ),

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

export function executionCommitSucceeded(
  options = {}
) {
  return createExecutionCommitResult({
    ...options,

    status:
      EXECUTION_COMMIT_STATUS.COMMITTED
  });
}

export function executionCommitNothing(
  options = {}
) {
  return createExecutionCommitResult({
    ...options,

    status:
      EXECUTION_COMMIT_STATUS.NOTHING_TO_COMMIT
  });
}

export function executionCommitFailed(
  options = {}
) {
  return createExecutionCommitResult({
    ...options,

    status:
      EXECUTION_COMMIT_STATUS.FAILED
  });
}

export function executionCommitPartial(
  options = {}
) {
  return createExecutionCommitResult({
    ...options,

    status:
      EXECUTION_COMMIT_STATUS.PARTIAL
  });
}

/* ============================================================
   HOOK RESULT
   ============================================================ */

/**
 * @section hook-result
 */

export function createExecutionHookResult({
  stage,
  action =
    EXECUTION_HOOK_ACTION.CONTINUE,

  context = null,

  reason = null,
  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_TRANSACTION_HOOK_STAGE,
      stage
    )
  ) {
    throw new TypeError(
      `Invalid transaction hook stage: ${String(stage)}`
    );
  }

  if (
    !isEnumValue(
      EXECUTION_HOOK_ACTION,
      action
    )
  ) {
    throw new TypeError(
      `Invalid hook action: ${String(action)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.HOOK,

    stage,

    action,

    context,

    reason,
    error,

    metadata:
      freezeObject(metadata)
  });
}

export function continueExecutionHook(
  stage,
  options = {}
) {
  return createExecutionHookResult({
    ...options,
    stage,
    action:
      EXECUTION_HOOK_ACTION.CONTINUE
  });
}

export function blockExecutionHook(
  stage,
  options = {}
) {
  return createExecutionHookResult({
    ...options,
    stage,
    action:
      EXECUTION_HOOK_ACTION.BLOCK
  });
}

export function cancelExecutionHook(
  stage,
  options = {}
) {
  return createExecutionHookResult({
    ...options,
    stage,
    action:
      EXECUTION_HOOK_ACTION.CANCEL
  });
}

export function failExecutionHook(
  stage,
  options = {}
) {
  return createExecutionHookResult({
    ...options,
    stage,
    action:
      EXECUTION_HOOK_ACTION.FAIL
  });
}

export function replaceExecutionContextHook(
  stage,
  context,
  options = {}
) {
  return createExecutionHookResult({
    ...options,
    stage,
    action:
      EXECUTION_HOOK_ACTION.REPLACE_CONTEXT,
    context
  });
}

/* ============================================================
   TRANSACTION SNAPSHOT
   ============================================================ */

/**
 * @section transaction-snapshot
 *
 * Mutable transaction runner state should not leak directly.
 *
 * Use immutable snapshots for diagnostics/hooks/events.
 */

export function createExecutionTransactionSnapshot({
  identity,

  phase =
    EXECUTION_TRANSACTION_PHASE.CREATED,

  status =
    EXECUTION_TRANSACTION_STATUS.PENDING,

  context,

  validation = null,
  targeting = null,
  execution = null,
  resolution = null,
  commit = null,

  hookResults = [],

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Transaction snapshot requires identity."
    );
  }

  if (!context) {
    throw new TypeError(
      "Transaction snapshot requires ExecutionContext."
    );
  }

  if (
    !isEnumValue(
      EXECUTION_TRANSACTION_PHASE,
      phase
    )
  ) {
    throw new TypeError(
      `Invalid transaction phase: ${String(phase)}`
    );
  }

  if (
    !isEnumValue(
      EXECUTION_TRANSACTION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid transaction status: ${String(status)}`
    );
  }

  return Object.freeze({
    identity,

    phase,
    status,

    context,

    validation,
    targeting,
    execution,
    resolution,
    commit,

    hookResults:
      freezeArray(
        hookResults
      ),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   FINAL TRANSACTION RESULT
   ============================================================ */

/**
 * @section final-transaction-result
 *
 * Stable result returned to runtime-orchestrator and parent executions.
 */

export function createExecutionTransactionResult({
  identity,

  status,

  phase,

  context,

  validation = null,
  targeting = null,
  execution = null,
  resolution = null,
  commit = null,

  hookResults = [],

  reason = null,
  error = null,

  startedAt = null,
  finishedAt = null,

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Transaction result requires identity."
    );
  }

  if (!context) {
    throw new TypeError(
      "Transaction result requires ExecutionContext."
    );
  }

  if (
    !isEnumValue(
      EXECUTION_TRANSACTION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid transaction status: ${String(status)}`
    );
  }

  if (
    !isEnumValue(
      EXECUTION_TRANSACTION_PHASE,
      phase
    )
  ) {
    throw new TypeError(
      `Invalid transaction phase: ${String(phase)}`
    );
  }

  return Object.freeze({
    kind:
      EXECUTION_TRANSACTION_RESULT_KIND.FINAL,

    identity,

    status,
    phase,

    context,

    validation,
    targeting,
    execution,
    resolution,
    commit,

    hookResults:
      freezeArray(
        hookResults
      ),

    reason,
    error,

    startedAt,
    finishedAt,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   FINAL RESULT HELPERS
   ============================================================ */

export function executionTransactionSucceeded({
  phase =
    EXECUTION_TRANSACTION_PHASE.SUCCEEDED,
  ...options
} = {}) {
  return createExecutionTransactionResult({
    ...options,

    status:
      EXECUTION_TRANSACTION_STATUS.SUCCEEDED,

    phase
  });
}

export function executionTransactionBlocked({
  phase =
    EXECUTION_TRANSACTION_PHASE.BLOCKED,
  ...options
} = {}) {
  return createExecutionTransactionResult({
    ...options,

    status:
      EXECUTION_TRANSACTION_STATUS.BLOCKED,

    phase
  });
}

export function executionTransactionCancelled({
  phase =
    EXECUTION_TRANSACTION_PHASE.CANCELLED,
  ...options
} = {}) {
  return createExecutionTransactionResult({
    ...options,

    status:
      EXECUTION_TRANSACTION_STATUS.CANCELLED,

    phase
  });
}

export function executionTransactionFailed({
  phase =
    EXECUTION_TRANSACTION_PHASE.FAILED,
  ...options
} = {}) {
  return createExecutionTransactionResult({
    ...options,

    status:
      EXECUTION_TRANSACTION_STATUS.FAILED,

    phase
  });
}

export function executionTransactionPartial({
  phase =
    EXECUTION_TRANSACTION_PHASE.PARTIAL,
  ...options
} = {}) {
  return createExecutionTransactionResult({
    ...options,

    status:
      EXECUTION_TRANSACTION_STATUS.PARTIAL,

    phase
  });
}

/* ============================================================
   RESULT PREDICATES
   ============================================================ */

/**
 * @section result-predicates
 */

export function didExecutionTransactionSucceed(
  result
) {
  return (
    result?.status ===
    EXECUTION_TRANSACTION_STATUS.SUCCEEDED
  );
}

export function wasExecutionTransactionBlocked(
  result
) {
  return (
    result?.status ===
    EXECUTION_TRANSACTION_STATUS.BLOCKED
  );
}

export function wasExecutionTransactionCancelled(
  result
) {
  return (
    result?.status ===
    EXECUTION_TRANSACTION_STATUS.CANCELLED
  );
}

export function didExecutionTransactionFail(
  result
) {
  return (
    result?.status ===
    EXECUTION_TRANSACTION_STATUS.FAILED
  );
}

export function wasExecutionTransactionPartial(
  result
) {
  return (
    result?.status ===
    EXECUTION_TRANSACTION_STATUS.PARTIAL
  );
}

/* ============================================================
   COMMIT ELIGIBILITY
   ============================================================ */

/**
 * @section commit-eligibility
 *
 * Deferred resources/action economy should normally commit only after
 * primary execution and resolution reach an acceptable state.
 *
 * Runner owns final policy.
 */

export function isExecutionStepCommitEligible(
  executionResult
) {
  return Boolean(
    executionResult &&
    (
      executionResult.status ===
        EXECUTION_STEP_STATUS.SUCCEEDED ||
      executionResult.status ===
        EXECUTION_STEP_STATUS.PARTIAL
    )
  );
}

export function isResolutionCommitEligible(
  resolutionResult
) {
  if (!resolutionResult) {
    return true;
  }

  return Boolean(
    resolutionResult.status ===
      EXECUTION_STEP_STATUS.SUCCEEDED ||
    resolutionResult.status ===
      EXECUTION_STEP_STATUS.PARTIAL ||
    resolutionResult.status ===
      EXECUTION_STEP_STATUS.SKIPPED
  );
}

/* ============================================================
   NATIVE RESULT STATUS MAPPING
   ============================================================ */

/**
 * @section native-result-status-mapping
 *
 * Maps native-contract NativeExecutionResult into transaction execution
 * status without importing native-contract.
 */

export function normalizeNativeExecutionStepStatus(
  nativeResult
) {
  switch (
    nativeResult?.status
  ) {
    case "succeeded":
      return EXECUTION_STEP_STATUS.SUCCEEDED;

    case "blocked":
      return EXECUTION_STEP_STATUS.BLOCKED;

    case "cancelled":
      return EXECUTION_STEP_STATUS.CANCELLED;

    case "failed":
      return EXECUTION_STEP_STATUS.FAILED;

    case "partial":
      return EXECUTION_STEP_STATUS.PARTIAL;

    default:
      return EXECUTION_STEP_STATUS.FAILED;
  }
}

/* ============================================================
   TRANSACTION CALLBACK CONTRACT NOTES
   ============================================================ */

/**
 * @section transaction-callback-contract-notes
 *
 * Runner callbacks should normalize to:
 *
 * PRE-VALIDATE:
 *   ExecutionValidationResult
 *
 * TARGET:
 *   ExecutionTargetingResult
 *
 * FINAL-VALIDATE:
 *   ExecutionValidationResult
 *
 * EXECUTE:
 *   ExecutionStepResult
 *
 * RESOLVE:
 *   ExecutionResolutionResult
 *
 * COMMIT:
 *   ExecutionCommitResult
 *
 * Callbacks may receive:
 *
 * {
 *   context,
 *   transaction,
 *   previousResult,
 *   signal
 * }
 *
 * Exact runner callback API belongs in execution-transaction-runner.js.
 */

/* ============================================================
   BLOCK / CANCEL / FAIL SEMANTICS
   ============================================================ */

/**
 * @section block-cancel-fail-semantics
 *
 * BLOCKED
 * -------
 *
 * Mechanical precondition not met.
 *
 * Examples:
 *
 * - insufficient resource
 * - invalid action economy
 * - invalid target
 * - weapon destroyed
 * - source unavailable
 *
 * Normally:
 *
 * no deferred resource commit
 *
 *
 * CANCELLED
 * ---------
 *
 * User/runtime intentionally abandoned execution.
 *
 * Examples:
 *
 * - target picker cancelled
 * - native HUD cancelled
 * - template placement cancelled
 *
 * Normally:
 *
 * no deferred resource commit
 *
 *
 * FAILED
 * ------
 *
 * Unexpected runtime/adapter error.
 *
 * Examples:
 *
 * - native Flow throws
 * - document mutation fails
 * - invalid internal state
 *
 * Normally:
 *
 * no deferred resource commit
 * error should remain observable
 *
 *
 * PARTIAL
 * -------
 *
 * Some irreversible mechanical execution occurred before later failure.
 *
 * Example:
 *
 * - first targets of multi-target effect resolved
 * - later target fails
 *
 * Caller must inspect:
 *
 * execution
 * resolution
 * commit
 *
 * before deciding rollback/recovery.
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
 * Intended:
 *
 * runtime-orchestrator
 * → build ExecutionContext
 * → run execution transaction
 * → receive ExecutionTransactionResult
 *
 * Runtime orchestrator should not manually sequence:
 *
 * validate
 * target
 * execute
 * resolve
 * commit
 *
 * after migration.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies:
 *
 * ExecutionContext
 * executionId
 * rootExecutionId
 * parentExecutionId
 *
 * Transaction identity wraps that execution identity.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Native execution results should be wrapped into:
 *
 * ExecutionStepResult.nativeResult
 *
 * before reaching transaction-level consumers.
 *
 *
 * feature_actions/
 * ----------------
 *
 * Semantic action implementations should provide transaction callbacks or
 * execution strategies.
 *
 * They should not own transaction phase sequencing.
 *
 *
 * action_economy/
 * ---------------
 *
 * Expected integration:
 *
 * pre-validation
 * → can action cost be paid?
 *
 * commit
 * → spend action economy
 *
 * Exact ordering may vary for specific granted/Reaction mechanics.
 *
 *
 * resource_service/
 * -----------------
 *
 * Expected integration:
 *
 * pre-validation
 * → validate all required resources
 *
 * execution
 * → native-consumed resources mutate through native Flow
 *
 * commit
 * → consume deferred Frame Conn-owned resources
 * → verify native-consumed resources
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Expected integration:
 *
 * targeting phase
 * → acquire/normalize targets/template
 *
 * final validation
 * → Range/LOS/adjacency/placement legality
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Commit/resolution may register:
 *
 * temporary statuses
 * until-turn effects
 * scene/round lifecycle records
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Hooks/runner may emit semantic events at stable transaction boundaries.
 *
 * Event dispatch does not belong in this contract file.
 *
 *
 * feature_turn/
 * -------------
 *
 * Existing turn state remains higher-level authority.
 *
 * Transaction contract only defines the results needed for future
 * action_economy integration.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Movement execution can use the same transaction contract.
 *
 * Actual movement expenditure remains authoritative in movement tracking.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Every semantic execution should produce one final
 * ExecutionTransactionResult.
 *
 * INVARIANT 2
 * Blocked, Cancelled, Failed, Partial, and Succeeded remain distinct.
 *
 * INVARIANT 3
 * Transaction status is not the same thing as native Flow status.
 *
 * INVARIANT 4
 * Validation, Targeting, Execution, Resolution, and Commit remain
 * separately inspectable.
 *
 * INVARIANT 5
 * Deferred resources/action economy should not commit on ordinary block,
 * cancellation, or failure.
 *
 * INVARIANT 6
 * Native-consumed resources are verified rather than spent again.
 *
 * INVARIANT 7
 * Partial execution must preserve enough detail for higher layers to
 * recover or report accurately.
 *
 * INVARIANT 8
 * Transaction identity and semantic execution identity remain separate but
 * linked.
 *
 * INVARIANT 9
 * Hook contracts may influence flow but do not themselves own transaction
 * sequencing.
 *
 * INVARIANT 10
 * This file contains no Foundry/Lancer runtime imports.
 *
 * INVARIANT 11
 * Transaction snapshots/results are immutable.
 *
 * INVARIANT 12
 * Existing Frame Conn action/runtime code should converge on this result
 * model instead of inventing feature-specific success/cancel/failure
 * shapes.
 */