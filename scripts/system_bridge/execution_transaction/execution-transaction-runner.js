/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/execution_transaction/execution-transaction-runner.js
 */

/**
 * @file
 * @path main/execution_transaction/execution-transaction-runner.js
 * @module execution-transaction-runner
 * @layer execution-transaction-runtime
 * @responsibility sequence-canonical-frame-conn-execution-lifecycle
 * @public-boundary false
 * @side-effects delegated-through-injected-callbacks-and-hooks
 *
 * @depends-on
 * - execution-transaction-contract
 * - semantic_execution_context/execution-context
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - called by future execution-transaction.js public façade
 * - called indirectly by runtime-orchestrator.js
 * - receives ExecutionContext from semantic_execution_context/
 * - receives semantic execution callbacks from feature_actions/* and
 *   execution-strategy runtimes
 * - provides stable attachment points for:
 *   - action_economy/*
 *   - resource_service/*
 *   - targeting_spatial_service/*
 *   - lifecycle_service/*
 *   - semantic_event_bus/*
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - runtime-orchestrator.js remains high-level coordinator
 * - semantic_execution_context/ remains execution-input authority
 * - native_adapter/ remains native execution authority
 * - feature_actions/* remain semantic action definitions/strategies
 * - feature_turn/ remains higher-level turn composition
 * - feature_movement/ remains actual movement tracking authority
 *
 * THIS FILE OWNS:
 * - canonical execution transaction sequencing
 * - phase progression
 * - callback invocation
 * - hook-stage invocation
 * - context replacement propagation
 * - blocked/cancelled/failed/partial termination
 * - deferred commit gating
 * - final transaction result construction
 * - transaction-local concurrency guard
 *
 * THIS FILE DOES NOT OWN:
 * - action-economy rules
 * - resource rules
 * - targeting rules
 * - lifecycle rules
 * - semantic event definitions
 * - native Lancer execution
 * - feature-specific mechanics
 *
 * EDIT CONTRACT:
 * - accept one canonical ExecutionContext
 * - keep all subsystem behavior injected
 * - do not import action_economy/resource/targeting implementations
 * - preserve blocked/cancelled/failed distinctions
 * - commit only after eligible execution/resolution
 * - maintain immutable context snapshots
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  EXECUTION_COMMIT_STATUS,
  EXECUTION_HOOK_ACTION,
  EXECUTION_STEP_STATUS,
  EXECUTION_TARGETING_STATUS,
  EXECUTION_TRANSACTION_HOOK_STAGE,
  EXECUTION_TRANSACTION_PHASE,
  EXECUTION_TRANSACTION_STATUS,
  EXECUTION_VALIDATION_STATUS,
  createExecutionCommitResult,
  createExecutionResolutionResult,
  createExecutionStepResult,
  createExecutionTargetingResult,
  createExecutionTransactionIdentity,
  createExecutionTransactionSnapshot,
  createExecutionValidationIssue,
  createExecutionValidationResult,
  executionCommitFailed,
  executionCommitNothing,
  executionCommitSucceeded,
  executionStepFailed,
  executionTransactionBlocked,
  executionTransactionCancelled,
  executionTransactionFailed,
  executionTransactionPartial,
  executionTransactionSucceeded,
  isExecutionStepCommitEligible,
  isResolutionCommitEligible,
  normalizeNativeExecutionStepStatus
} from "./execution-transaction-contract.js";

import {
  assertExecutionContext,
  getExecutionId,
  getParentExecutionId,
  getRootExecutionId,
  rebuildExecutionContext,
  setExecutionContextPhase
} from "../semantic_execution_context/execution-context.js";

/* ============================================================
   RUNNER CALLBACK CONTRACT
   ============================================================ */

/**
 * @section runner-callback-contract
 *
 * callbacks may provide:
 *
 * {
 *   preValidate?,
 *   target?,
 *   finalValidate?,
 *   execute,
 *   resolve?,
 *   commit?
 * }
 *
 * callback argument:
 *
 * {
 *   context,
 *   transaction,
 *   previousResult,
 *   signal
 * }
 *
 * `execute` is the only required callback.
 *
 * Missing optional phases normalize to skipped/successful results.
 */

/* ============================================================
   HOOK EXECUTOR CONTRACT
   ============================================================ */

/**
 * @section hook-executor-contract
 *
 * hooks are deliberately injected because
 * execution-transaction-hooks.js is a sibling runtime service.
 *
 * Supported shapes:
 *
 * hooks.run(stage, payload)
 *
 * OR:
 *
 * hooks(stage, payload)
 *
 * Expected return:
 *
 * null
 * single ExecutionHookResult
 * array of ExecutionHookResult
 *
 * Hook behavior:
 *
 * continue
 * replace-context
 * block
 * cancel
 * fail
 */

/* ============================================================
   PRIVATE STATE
   ============================================================ */

/**
 * @section private-state
 *
 * Guards duplicate execution of the same semantic execution ID.
 *
 * One ExecutionContext may be retried only after its current transaction
 * terminates.
 */

const ACTIVE_EXECUTION_IDS =
  new Set();

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

function nowTimestamp() {
  return Date.now();
}

function createAbortError() {
  const error =
    new Error(
      "Execution transaction aborted."
    );

  error.name =
    "AbortError";

  return error;
}

function isAbortRequested(signal) {
  return Boolean(
    signal?.aborted
  );
}

function getAbortReason(signal) {
  return (
    signal?.reason ??
    createAbortError()
  );
}

/* ============================================================
   TRANSACTION RUNTIME STATE
   ============================================================ */

/**
 * @section transaction-runtime-state
 *
 * Runner-local mutable state.
 *
 * Never expose directly.
 * Hooks/callbacks receive immutable snapshots.
 */

function createTransactionRuntimeState({
  identity,
  context,
  startedAt,
  metadata = {}
}) {
  return {
    identity,

    phase:
      EXECUTION_TRANSACTION_PHASE.CREATED,

    status:
      EXECUTION_TRANSACTION_STATUS.PENDING,

    context,

    validation:
      null,

    targeting:
      null,

    execution:
      null,

    resolution:
      null,

    commit:
      null,

    hookResults:
      [],

    reason:
      null,

    error:
      null,

    startedAt,

    finishedAt:
      null,

    metadata: {
      ...metadata
    }
  };
}

function createRuntimeSnapshot(
  state
) {
  return createExecutionTransactionSnapshot({
    identity:
      state.identity,

    phase:
      state.phase,

    status:
      state.status,

    context:
      state.context,

    validation:
      state.validation,

    targeting:
      state.targeting,

    execution:
      state.execution,

    resolution:
      state.resolution,

    commit:
      state.commit,

    hookResults:
      state.hookResults,

    metadata:
      state.metadata
  });
}

/* ============================================================
   CONTEXT / PHASE SYNCHRONIZATION
   ============================================================ */

/**
 * @section context-phase-synchronization
 *
 * Transaction phase and ExecutionContext phase are related but not
 * identical enum sets.
 *
 * Only map semantic equivalents.
 */

function mapTransactionPhaseToContextPhase(
  phase
) {
  switch (phase) {
    case EXECUTION_TRANSACTION_PHASE.PRE_VALIDATING:
    case EXECUTION_TRANSACTION_PHASE.FINAL_VALIDATING:
      return "validating";

    case EXECUTION_TRANSACTION_PHASE.TARGETING:
      return "targeting";

    case EXECUTION_TRANSACTION_PHASE.EXECUTING:
      return "executing";

    case EXECUTION_TRANSACTION_PHASE.RESOLVING:
      return "resolving";

    case EXECUTION_TRANSACTION_PHASE.COMMITTING:
      return "committing";

    case EXECUTION_TRANSACTION_PHASE.SUCCEEDED:
      return "succeeded";

    case EXECUTION_TRANSACTION_PHASE.BLOCKED:
      return "blocked";

    case EXECUTION_TRANSACTION_PHASE.CANCELLED:
      return "cancelled";

    case EXECUTION_TRANSACTION_PHASE.FAILED:
      return "failed";

    case EXECUTION_TRANSACTION_PHASE.PARTIAL:
      return "partial";

    default:
      return null;
  }
}

function setRuntimePhase(
  state,
  phase
) {
  state.phase =
    phase;

  const contextPhase =
    mapTransactionPhaseToContextPhase(
      phase
    );

  if (contextPhase) {
    state.context =
      setExecutionContextPhase(
        state.context,
        contextPhase
      );
  }
}

/* ============================================================
   CALLBACK PAYLOAD
   ============================================================ */

function createCallbackPayload(
  state,
  {
    previousResult = null,
    signal = null
  } = {}
) {
  return Object.freeze({
    context:
      state.context,

    transaction:
      createRuntimeSnapshot(
        state
      ),

    previousResult,

    signal
  });
}

/* ============================================================
   CALLBACK INVOCATION
   ============================================================ */

async function invokeCallback(
  callback,
  state,
  {
    previousResult = null,
    signal = null
  } = {}
) {
  if (
    typeof callback !==
    "function"
  ) {
    return undefined;
  }

  if (isAbortRequested(signal)) {
    throw getAbortReason(
      signal
    );
  }

  return callback(
    createCallbackPayload(
      state,
      {
        previousResult,
        signal
      }
    )
  );
}

/* ============================================================
   HOOK RESULT NORMALIZATION
   ============================================================ */

function normalizeHookResultArray(
  value
) {
  if (value == null) {
    return [];
  }

  return Array.isArray(value)
    ? value.filter(Boolean)
    : [value];
}

/* ============================================================
   HOOK INVOCATION
   ============================================================ */

async function invokeHooks(
  hooks,
  stage,
  state,
  {
    previousResult = null,
    signal = null
  } = {}
) {
  if (!hooks) {
    return {
      action:
        EXECUTION_HOOK_ACTION.CONTINUE,

      context:
        state.context,

      results:
        Object.freeze([])
    };
  }

  if (isAbortRequested(signal)) {
    throw getAbortReason(
      signal
    );
  }

  const payload =
    createCallbackPayload(
      state,
      {
        previousResult,
        signal
      }
    );

  let rawResults;

  if (
    typeof hooks ===
    "function"
  ) {
    rawResults =
      await hooks(
        stage,
        payload
      );
  } else if (
    typeof hooks.run ===
    "function"
  ) {
    rawResults =
      await hooks.run(
        stage,
        payload
      );
  } else {
    throw new TypeError(
      "Execution transaction hooks must be a function or expose run(stage, payload)."
    );
  }

  const results =
    normalizeHookResultArray(
      rawResults
    );

  let context =
    state.context;

  for (const result of results) {
    state.hookResults.push(
      result
    );

    switch (
      result?.action
    ) {
      case EXECUTION_HOOK_ACTION.REPLACE_CONTEXT:
        if (!result.context) {
          throw new Error(
            `Hook ${stage} requested context replacement without context.`
          );
        }

        assertExecutionContext(
          result.context
        );

        context =
          result.context;

        state.context =
          context;
        break;

      case EXECUTION_HOOK_ACTION.BLOCK:
        return {
          action:
            EXECUTION_HOOK_ACTION.BLOCK,

          context,

          result,

          results:
            Object.freeze(results)
        };

      case EXECUTION_HOOK_ACTION.CANCEL:
        return {
          action:
            EXECUTION_HOOK_ACTION.CANCEL,

          context,

          result,

          results:
            Object.freeze(results)
        };

      case EXECUTION_HOOK_ACTION.FAIL:
        return {
          action:
            EXECUTION_HOOK_ACTION.FAIL,

          context,

          result,

          results:
            Object.freeze(results)
        };

      case EXECUTION_HOOK_ACTION.CONTINUE:
      case undefined:
      case null:
        break;

      default:
        throw new Error(
          `Unsupported execution hook action: ${String(result?.action)}`
        );
    }
  }

  return {
    action:
      EXECUTION_HOOK_ACTION.CONTINUE,

    context,

    results:
      Object.freeze(results)
  };
}

/* ============================================================
   CONTEXT PROPAGATION
   ============================================================ */

/**
 * @section context-propagation
 *
 * Phase callbacks may legally return a replacement context.
 */

function adoptResultContext(
  state,
  result
) {
  if (!result?.context) {
    return;
  }

  assertExecutionContext(
    result.context
  );

  state.context =
    result.context;
}

/* ============================================================
   VALIDATION NORMALIZATION
   ============================================================ */

function normalizeValidationResult(
  value,
  context
) {
  if (value == null) {
    return createExecutionValidationResult({
      status:
        EXECUTION_VALIDATION_STATUS.VALID,

      context
    });
  }

  if (
    value.kind ===
    "validation"
  ) {
    return value;
  }

  if (value === true) {
    return createExecutionValidationResult({
      status:
        EXECUTION_VALIDATION_STATUS.VALID,

      context
    });
  }

  if (value === false) {
    return createExecutionValidationResult({
      status:
        EXECUTION_VALIDATION_STATUS.INVALID,

      context,

      issues: [
        createExecutionValidationIssue({
          code:
            "validation-failed",

          message:
            "Execution validation failed."
        })
      ]
    });
  }

  if (
    isObject(value) &&
    typeof value.valid ===
      "boolean"
  ) {
    return createExecutionValidationResult({
      status:
        value.valid
          ? EXECUTION_VALIDATION_STATUS.VALID
          : EXECUTION_VALIDATION_STATUS.INVALID,

      context:
        value.context ??
        context,

      issues:
        value.issues ??
        [],

      metadata:
        value.metadata ??
        {}
    });
  }

  throw new TypeError(
    "Validation callback returned unsupported result."
  );
}

/* ============================================================
   TARGETING NORMALIZATION
   ============================================================ */

function normalizeTargetingResult(
  value,
  context
) {
  if (value == null) {
    return createExecutionTargetingResult({
      status:
        EXECUTION_TARGETING_STATUS.SKIPPED,

      context
    });
  }

  if (
    value.kind ===
    "targeting"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return createExecutionTargetingResult({
      status:
        EXECUTION_TARGETING_STATUS.READY,

      context,

      targets:
        value
    });
  }

  if (
    isObject(value) &&
    Array.isArray(
      value.targets
    )
  ) {
    return createExecutionTargetingResult({
      status:
        value.status ??
        EXECUTION_TARGETING_STATUS.READY,

      context:
        value.context ??
        context,

      targets:
        value.targets,

      template:
        value.template ??
        null,

      reason:
        value.reason ??
        null,

      metadata:
        value.metadata ??
        {}
    });
  }

  throw new TypeError(
    "Targeting callback returned unsupported result."
  );
}

/* ============================================================
   EXECUTION RESULT NORMALIZATION
   ============================================================ */

/**
 * @section execution-result-normalization
 *
 * Supports:
 *
 * - ExecutionStepResult
 * - NativeExecutionResult
 * - arbitrary successful semantic result
 */

function normalizeExecutionResult(
  value,
  context
) {
  if (
    value?.kind ===
    "execution"
  ) {
    return value;
  }

  if (
    value &&
    typeof value.status ===
      "string" &&
    [
      "succeeded",
      "blocked",
      "cancelled",
      "failed",
      "partial"
    ].includes(
      value.status
    )
  ) {
    return createExecutionStepResult({
      status:
        normalizeNativeExecutionStepStatus(
          value
        ),

      context,

      nativeResult:
        value
    });
  }

  return createExecutionStepResult({
    status:
      EXECUTION_STEP_STATUS.SUCCEEDED,

    context,

    result:
      value
  });
}

/* ============================================================
   RESOLUTION NORMALIZATION
   ============================================================ */

function normalizeResolutionResult(
  value,
  context
) {
  if (value == null) {
    return createExecutionResolutionResult({
      status:
        EXECUTION_STEP_STATUS.SKIPPED,

      context
    });
  }

  if (
    value.kind ===
    "resolution"
  ) {
    return value;
  }

  if (
    value?.kind ===
    "execution"
  ) {
    return createExecutionResolutionResult({
      status:
        value.status,

      context:
        value.context ??
        context,

      result:
        value.result,

      reason:
        value.reason,

      error:
        value.error,

      metadata:
        value.metadata
    });
  }

  return createExecutionResolutionResult({
    status:
      EXECUTION_STEP_STATUS.SUCCEEDED,

    context,

    result:
      value
  });
}

/* ============================================================
   COMMIT NORMALIZATION
   ============================================================ */

function normalizeCommitResult(
  value,
  context
) {
  if (value == null) {
    return executionCommitNothing({
      context
    });
  }

  if (
    value.kind ===
    "commit"
  ) {
    return value;
  }

  if (value === true) {
    return executionCommitSucceeded({
      context
    });
  }

  if (value === false) {
    return executionCommitFailed({
      context,

      reason:
        "commit-callback-returned-false"
    });
  }

  return executionCommitSucceeded({
    context,

    committed:
      [value]
  });
}

/* ============================================================
   TERMINATION HELPERS
   ============================================================ */

function finishState(
  state,
  {
    status,
    phase,
    reason = null,
    error = null
  }
) {
  state.status =
    status;

  setRuntimePhase(
    state,
    phase
  );

  state.reason =
    reason;

  state.error =
    error;

  state.finishedAt =
    nowTimestamp();
}

function buildFinalResult(
  state
) {
  const common = {
    identity:
      state.identity,

    phase:
      state.phase,

    context:
      state.context,

    validation:
      state.validation,

    targeting:
      state.targeting,

    execution:
      state.execution,

    resolution:
      state.resolution,

    commit:
      state.commit,

    hookResults:
      state.hookResults,

    reason:
      state.reason,

    error:
      state.error,

    startedAt:
      state.startedAt,

    finishedAt:
      state.finishedAt,

    metadata:
      state.metadata
  };

  switch (
    state.status
  ) {
    case EXECUTION_TRANSACTION_STATUS.SUCCEEDED:
      return executionTransactionSucceeded(
        common
      );

    case EXECUTION_TRANSACTION_STATUS.BLOCKED:
      return executionTransactionBlocked(
        common
      );

    case EXECUTION_TRANSACTION_STATUS.CANCELLED:
      return executionTransactionCancelled(
        common
      );

    case EXECUTION_TRANSACTION_STATUS.PARTIAL:
      return executionTransactionPartial(
        common
      );

    case EXECUTION_TRANSACTION_STATUS.FAILED:
    default:
      return executionTransactionFailed(
        common
      );
  }
}

/* ============================================================
   HOOK TERMINATION
   ============================================================ */

function terminateFromHook(
  state,
  hookResult
) {
  switch (
    hookResult.action
  ) {
    case EXECUTION_HOOK_ACTION.BLOCK:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.BLOCKED,

          phase:
            EXECUTION_TRANSACTION_PHASE.BLOCKED,

          reason:
            hookResult.result?.reason ??
            "blocked-by-hook",

          error:
            hookResult.result?.error ??
            null
        }
      );

      return true;

    case EXECUTION_HOOK_ACTION.CANCEL:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.CANCELLED,

          phase:
            EXECUTION_TRANSACTION_PHASE.CANCELLED,

          reason:
            hookResult.result?.reason ??
            "cancelled-by-hook",

          error:
            hookResult.result?.error ??
            null
        }
      );

      return true;

    case EXECUTION_HOOK_ACTION.FAIL:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.FAILED,

          phase:
            EXECUTION_TRANSACTION_PHASE.FAILED,

          reason:
            hookResult.result?.reason ??
            "failed-by-hook",

          error:
            hookResult.result?.error ??
            null
        }
      );

      return true;

    default:
      return false;
  }
}

/* ============================================================
   VALIDATION TERMINATION
   ============================================================ */

function terminateFromValidation(
  state,
  validation
) {
  switch (
    validation.status
  ) {
    case EXECUTION_VALIDATION_STATUS.VALID:
    case EXECUTION_VALIDATION_STATUS.SKIPPED:
      return false;

    case EXECUTION_VALIDATION_STATUS.CANCELLED:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.CANCELLED,

          phase:
            EXECUTION_TRANSACTION_PHASE.CANCELLED,

          reason:
            validation
              .issues
              ?.[0]
              ?.message ??
            "validation-cancelled"
        }
      );

      return true;

    case EXECUTION_VALIDATION_STATUS.INVALID:
    default:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.BLOCKED,

          phase:
            EXECUTION_TRANSACTION_PHASE.BLOCKED,

          reason:
            validation
              .issues
              ?.[0]
              ?.message ??
            "validation-failed"
        }
      );

      return true;
  }
}

/* ============================================================
   TARGETING TERMINATION
   ============================================================ */

function terminateFromTargeting(
  state,
  targeting
) {
  switch (
    targeting.status
  ) {
    case EXECUTION_TARGETING_STATUS.READY:
    case EXECUTION_TARGETING_STATUS.SKIPPED:
      return false;

    case EXECUTION_TARGETING_STATUS.CANCELLED:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.CANCELLED,

          phase:
            EXECUTION_TRANSACTION_PHASE.CANCELLED,

          reason:
            targeting.reason ??
            "targeting-cancelled"
        }
      );

      return true;

    case EXECUTION_TARGETING_STATUS.BLOCKED:
    default:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.BLOCKED,

          phase:
            EXECUTION_TRANSACTION_PHASE.BLOCKED,

          reason:
            targeting.reason ??
            "targeting-blocked"
        }
      );

      return true;
  }
}

/* ============================================================
   EXECUTION TERMINATION
   ============================================================ */

function terminateFromExecution(
  state,
  execution
) {
  switch (
    execution.status
  ) {
    case EXECUTION_STEP_STATUS.SUCCEEDED:
      return false;

    case EXECUTION_STEP_STATUS.PARTIAL:
      /*
       * Continue into resolution so partial execution can be understood
       * and possibly committed/recovered intentionally.
       */
      return false;

    case EXECUTION_STEP_STATUS.BLOCKED:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.BLOCKED,

          phase:
            EXECUTION_TRANSACTION_PHASE.BLOCKED,

          reason:
            execution.reason ??
            "execution-blocked",

          error:
            execution.error ??
            null
        }
      );

      return true;

    case EXECUTION_STEP_STATUS.CANCELLED:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.CANCELLED,

          phase:
            EXECUTION_TRANSACTION_PHASE.CANCELLED,

          reason:
            execution.reason ??
            "execution-cancelled",

          error:
            execution.error ??
            null
        }
      );

      return true;

    case EXECUTION_STEP_STATUS.FAILED:
    default:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.FAILED,

          phase:
            EXECUTION_TRANSACTION_PHASE.FAILED,

          reason:
            execution.reason ??
            "execution-failed",

          error:
            execution.error ??
            null
        }
      );

      return true;
  }
}

/* ============================================================
   RESOLUTION TERMINATION
   ============================================================ */

function terminateFromResolution(
  state,
  resolution
) {
  switch (
    resolution.status
  ) {
    case EXECUTION_STEP_STATUS.SUCCEEDED:
    case EXECUTION_STEP_STATUS.SKIPPED:
      return false;

    case EXECUTION_STEP_STATUS.PARTIAL:
      /*
       * Continue to commit eligibility handling.
       */
      return false;

    case EXECUTION_STEP_STATUS.BLOCKED:
      /*
       * Primary execution already happened.
       * A block after execution is therefore partial, not a pristine
       * blocked transaction.
       */
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            resolution.reason ??
            "resolution-blocked-after-execution",

          error:
            resolution.error ??
            null
        }
      );

      return true;

    case EXECUTION_STEP_STATUS.CANCELLED:
      /*
       * Same rule: execution already occurred.
       */
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            resolution.reason ??
            "resolution-cancelled-after-execution",

          error:
            resolution.error ??
            null
        }
      );

      return true;

    case EXECUTION_STEP_STATUS.FAILED:
    default:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            resolution.reason ??
            "resolution-failed-after-execution",

          error:
            resolution.error ??
            null
        }
      );

      return true;
  }
}

/* ============================================================
   COMMIT TERMINATION
   ============================================================ */

function terminateFromCommit(
  state,
  commit
) {
  switch (
    commit.status
  ) {
    case EXECUTION_COMMIT_STATUS.COMMITTED:
    case EXECUTION_COMMIT_STATUS.NOTHING_TO_COMMIT:
    case EXECUTION_COMMIT_STATUS.SKIPPED:
      return false;

    case EXECUTION_COMMIT_STATUS.PARTIAL:
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            commit.reason ??
            "commit-partial",

          error:
            commit.error ??
            null
        }
      );

      return true;

    case EXECUTION_COMMIT_STATUS.FAILED:
    default:
      /*
       * Mechanical execution has already occurred.
       * Commit failure cannot honestly be represented as an untouched
       * failed action.
       */
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            commit.reason ??
            "commit-failed-after-execution",

          error:
            commit.error ??
            null
        }
      );

      return true;
  }
}

/* ============================================================
   FINAL OUTCOME DERIVATION
   ============================================================ */

function deriveSuccessfulTerminalStatus(
  state
) {
  if (
    state.execution?.status ===
      EXECUTION_STEP_STATUS.PARTIAL ||
    state.resolution?.status ===
      EXECUTION_STEP_STATUS.PARTIAL ||
    state.commit?.status ===
      EXECUTION_COMMIT_STATUS.PARTIAL
  ) {
    return {
      status:
        EXECUTION_TRANSACTION_STATUS.PARTIAL,

      phase:
        EXECUTION_TRANSACTION_PHASE.PARTIAL
    };
  }

  return {
    status:
      EXECUTION_TRANSACTION_STATUS.SUCCEEDED,

    phase:
      EXECUTION_TRANSACTION_PHASE.SUCCEEDED
  };
}

/* ============================================================
   OUTCOME HOOK STAGE
   ============================================================ */

function getOutcomeHookStage(
  status
) {
  switch (status) {
    case EXECUTION_TRANSACTION_STATUS.SUCCEEDED:
      return EXECUTION_TRANSACTION_HOOK_STAGE.ON_SUCCESS;

    case EXECUTION_TRANSACTION_STATUS.BLOCKED:
      return EXECUTION_TRANSACTION_HOOK_STAGE.ON_BLOCK;

    case EXECUTION_TRANSACTION_STATUS.CANCELLED:
      return EXECUTION_TRANSACTION_HOOK_STAGE.ON_CANCEL;

    case EXECUTION_TRANSACTION_STATUS.PARTIAL:
      return EXECUTION_TRANSACTION_HOOK_STAGE.ON_PARTIAL;

    case EXECUTION_TRANSACTION_STATUS.FAILED:
    default:
      return EXECUTION_TRANSACTION_HOOK_STAGE.ON_FAILURE;
  }
}

/* ============================================================
   OUTCOME HOOK EXECUTION
   ============================================================ */

/**
 * @section outcome-hook-execution
 *
 * Terminal hooks are observational.
 *
 * Their block/cancel actions do not rewrite an already-established final
 * mechanical outcome.
 *
 * A thrown terminal hook error is appended to metadata rather than
 * corrupting transaction truth.
 */

async function runOutcomeHooks(
  hooks,
  state,
  {
    signal = null
  } = {}
) {
  const stage =
    getOutcomeHookStage(
      state.status
    );

  if (!hooks) {
    return;
  }

  try {
    await invokeHooks(
      hooks,
      stage,
      state,
      {
        signal
      }
    );
  } catch (error) {
    state.metadata =
      {
        ...state.metadata,

        outcomeHookError:
          error
      };
  }
}

/* ============================================================
   DUPLICATE EXECUTION GUARD
   ============================================================ */

function acquireExecutionGuard(
  executionId
) {
  if (
    ACTIVE_EXECUTION_IDS.has(
      executionId
    )
  ) {
    return false;
  }

  ACTIVE_EXECUTION_IDS.add(
    executionId
  );

  return true;
}

function releaseExecutionGuard(
  executionId
) {
  ACTIVE_EXECUTION_IDS.delete(
    executionId
  );
}

export function isExecutionTransactionActive(
  executionId
) {
  return ACTIVE_EXECUTION_IDS.has(
    executionId
  );
}

/* ============================================================
   MAIN TRANSACTION RUNNER
   ============================================================ */

/**
 * @section main-transaction-runner
 *
 * Canonical pipeline:
 *
 * CREATED
 * → BEFORE_REBUILD
 * → REBUILD_CONTEXT
 * → AFTER_REBUILD
 * → PRE_VALIDATE
 * → TARGET
 * → FINAL_VALIDATE
 * → EXECUTE
 * → RESOLVE
 * → COMMIT
 * → terminal outcome
 *
 * Every optional callback can be omitted except execute().
 */

export async function runExecutionTransaction({
  context,

  callbacks = {},

  hooks = null,

  signal = null,

  rebuildContext = true,

  metadata = {}
} = {}) {
  assertExecutionContext(
    context
  );

  if (
    typeof callbacks?.execute !==
    "function"
  ) {
    throw new TypeError(
      "runExecutionTransaction requires callbacks.execute."
    );
  }

  const executionId =
    getExecutionId(
      context
    );

  const identity =
    createExecutionTransactionIdentity({
      executionId,

      rootExecutionId:
        getRootExecutionId(
          context
        ),

      parentExecutionId:
        getParentExecutionId(
          context
        )
    });

  const state =
    createTransactionRuntimeState({
      identity,

      context,

      startedAt:
        nowTimestamp(),

      metadata
    });

  if (
    !acquireExecutionGuard(
      executionId
    )
  ) {
    state.status =
      EXECUTION_TRANSACTION_STATUS.BLOCKED;

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.BLOCKED
    );

    state.reason =
      "execution-already-active";

    state.finishedAt =
      nowTimestamp();

    return buildFinalResult(
      state
    );
  }

  try {
    /* --------------------------------------------------------
       ABORT CHECK
       -------------------------------------------------------- */

    if (isAbortRequested(signal)) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.CANCELLED,

          phase:
            EXECUTION_TRANSACTION_PHASE.CANCELLED,

          reason:
            "transaction-aborted",

          error:
            getAbortReason(
              signal
            )
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       BEFORE REBUILD
       -------------------------------------------------------- */

    const beforeRebuild =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_REBUILD,
        state,
        { signal }
      );

    if (
      terminateFromHook(
        state,
        beforeRebuild
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       REBUILD CONTEXT
       -------------------------------------------------------- */

    if (rebuildContext) {
      setRuntimePhase(
        state,
        EXECUTION_TRANSACTION_PHASE.REBUILDING_CONTEXT
      );

      try {
        state.context =
          await rebuildExecutionContext(
            state.context
          );
      } catch (error) {
        finishState(
          state,
          {
            status:
              EXECUTION_TRANSACTION_STATUS.FAILED,

            phase:
              EXECUTION_TRANSACTION_PHASE.FAILED,

            reason:
              "context-rebuild-failed",

            error
          }
        );

        await runOutcomeHooks(
          hooks,
          state,
          { signal }
        );

        return buildFinalResult(
          state
        );
      }
    }

    /* --------------------------------------------------------
       AFTER REBUILD
       -------------------------------------------------------- */

    const afterRebuild =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_REBUILD,
        state,
        { signal }
      );

    if (
      terminateFromHook(
        state,
        afterRebuild
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       PRE-VALIDATION
       -------------------------------------------------------- */

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.PRE_VALIDATING
    );

    const beforePreValidate =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_PRE_VALIDATE,
        state,
        { signal }
      );

    if (
      terminateFromHook(
        state,
        beforePreValidate
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    try {
      const rawValidation =
        await invokeCallback(
          callbacks.preValidate,
          state,
          { signal }
        );

      state.validation =
        normalizeValidationResult(
          rawValidation,
          state.context
        );

      adoptResultContext(
        state,
        state.validation
      );
    } catch (error) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.FAILED,

          phase:
            EXECUTION_TRANSACTION_PHASE.FAILED,

          reason:
            "pre-validation-threw",

          error
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    const afterPreValidate =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_PRE_VALIDATE,
        state,
        {
          previousResult:
            state.validation,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        afterPreValidate
      ) ||
      terminateFromValidation(
        state,
        state.validation
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       TARGETING
       -------------------------------------------------------- */

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.TARGETING
    );

    const beforeTargeting =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_TARGETING,
        state,
        { signal }
      );

    if (
      terminateFromHook(
        state,
        beforeTargeting
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    try {
      const rawTargeting =
        await invokeCallback(
          callbacks.target,
          state,
          {
            previousResult:
              state.validation,
            signal
          }
        );

      state.targeting =
        normalizeTargetingResult(
          rawTargeting,
          state.context
        );

      adoptResultContext(
        state,
        state.targeting
      );
    } catch (error) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.FAILED,

          phase:
            EXECUTION_TRANSACTION_PHASE.FAILED,

          reason:
            "targeting-threw",

          error
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    const afterTargeting =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_TARGETING,
        state,
        {
          previousResult:
            state.targeting,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        afterTargeting
      ) ||
      terminateFromTargeting(
        state,
        state.targeting
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       FINAL VALIDATION
       -------------------------------------------------------- */

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.FINAL_VALIDATING
    );

    const beforeFinalValidate =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_FINAL_VALIDATE,
        state,
        {
          previousResult:
            state.targeting,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        beforeFinalValidate
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    try {
      const rawValidation =
        await invokeCallback(
          callbacks.finalValidate,
          state,
          {
            previousResult:
              state.targeting,
            signal
          }
        );

      /*
       * If no finalValidate callback exists, preserve a valid skipped
       * semantic rather than replacing earlier validation with null.
       */
      const finalValidation =
        callbacks.finalValidate
          ? normalizeValidationResult(
              rawValidation,
              state.context
            )
          : createExecutionValidationResult({
              status:
                EXECUTION_VALIDATION_STATUS.SKIPPED,

              context:
                state.context
            });

      state.validation =
        finalValidation;

      adoptResultContext(
        state,
        finalValidation
      );
    } catch (error) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.FAILED,

          phase:
            EXECUTION_TRANSACTION_PHASE.FAILED,

          reason:
            "final-validation-threw",

          error
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    const afterFinalValidate =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_FINAL_VALIDATE,
        state,
        {
          previousResult:
            state.validation,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        afterFinalValidate
      ) ||
      terminateFromValidation(
        state,
        state.validation
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       EXECUTION
       -------------------------------------------------------- */

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.EXECUTING
    );

    const beforeExecute =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_EXECUTE,
        state,
        {
          previousResult:
            state.validation,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        beforeExecute
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    try {
      const rawExecution =
        await invokeCallback(
          callbacks.execute,
          state,
          {
            previousResult:
              state.validation,
            signal
          }
        );

      state.execution =
        normalizeExecutionResult(
          rawExecution,
          state.context
        );

      adoptResultContext(
        state,
        state.execution
      );
    } catch (error) {
      state.execution =
        executionStepFailed({
          context:
            state.context,

          reason:
            "execution-threw",

          error
        });

      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.FAILED,

          phase:
            EXECUTION_TRANSACTION_PHASE.FAILED,

          reason:
            "execution-threw",

          error
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    const afterExecute =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_EXECUTE,
        state,
        {
          previousResult:
            state.execution,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        afterExecute
      )
    ) {
      /*
       * If AFTER_EXECUTE stops the transaction after successful native
       * mutation, preserve partial truth instead of pretending nothing
       * happened.
       */
      if (
        state.execution?.status ===
          EXECUTION_STEP_STATUS.SUCCEEDED ||
        state.execution?.status ===
          EXECUTION_STEP_STATUS.PARTIAL
      ) {
        finishState(
          state,
          {
            status:
              EXECUTION_TRANSACTION_STATUS.PARTIAL,

            phase:
              EXECUTION_TRANSACTION_PHASE.PARTIAL,

            reason:
              afterExecute
                .result
                ?.reason ??
              "post-execution-hook-stopped-transaction",

            error:
              afterExecute
                .result
                ?.error ??
              null
          }
        );
      }

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    if (
      terminateFromExecution(
        state,
        state.execution
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       RESOLUTION
       -------------------------------------------------------- */

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.RESOLVING
    );

    const beforeResolve =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_RESOLVE,
        state,
        {
          previousResult:
            state.execution,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        beforeResolve
      )
    ) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            beforeResolve
              .result
              ?.reason ??
            "resolution-prevented-after-execution",

          error:
            beforeResolve
              .result
              ?.error ??
            null
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    try {
      const rawResolution =
        await invokeCallback(
          callbacks.resolve,
          state,
          {
            previousResult:
              state.execution,
            signal
          }
        );

      state.resolution =
        normalizeResolutionResult(
          rawResolution,
          state.context
        );

      adoptResultContext(
        state,
        state.resolution
      );
    } catch (error) {
      state.resolution =
        createExecutionResolutionResult({
          status:
            EXECUTION_STEP_STATUS.FAILED,

          context:
            state.context,

          reason:
            "resolution-threw",

          error
        });

      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            "resolution-threw-after-execution",

          error
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    const afterResolve =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_RESOLVE,
        state,
        {
          previousResult:
            state.resolution,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        afterResolve
      )
    ) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            afterResolve
              .result
              ?.reason ??
            "post-resolution-hook-stopped-transaction",

          error:
            afterResolve
              .result
              ?.error ??
            null
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    if (
      terminateFromResolution(
        state,
        state.resolution
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       COMMIT ELIGIBILITY
       -------------------------------------------------------- */

    if (
      !isExecutionStepCommitEligible(
        state.execution
      ) ||
      !isResolutionCommitEligible(
        state.resolution
      )
    ) {
      state.commit =
        executionCommitNothing({
          context:
            state.context,

          reason:
            "execution-not-commit-eligible"
        });

      const terminal =
        deriveSuccessfulTerminalStatus(
          state
        );

      finishState(
        state,
        terminal
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       COMMIT
       -------------------------------------------------------- */

    setRuntimePhase(
      state,
      EXECUTION_TRANSACTION_PHASE.COMMITTING
    );

    const beforeCommit =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_COMMIT,
        state,
        {
          previousResult:
            state.resolution,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        beforeCommit
      )
    ) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            beforeCommit
              .result
              ?.reason ??
            "commit-prevented-after-execution",

          error:
            beforeCommit
              .result
              ?.error ??
            null
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    try {
      const rawCommit =
        await invokeCallback(
          callbacks.commit,
          state,
          {
            previousResult:
              state.resolution,
            signal
          }
        );

      state.commit =
        normalizeCommitResult(
          rawCommit,
          state.context
        );

      adoptResultContext(
        state,
        state.commit
      );
    } catch (error) {
      state.commit =
        executionCommitFailed({
          context:
            state.context,

          reason:
            "commit-threw",

          error
        });

      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            "commit-threw-after-execution",

          error
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    const afterCommit =
      await invokeHooks(
        hooks,
        EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_COMMIT,
        state,
        {
          previousResult:
            state.commit,
          signal
        }
      );

    if (
      terminateFromHook(
        state,
        afterCommit
      )
    ) {
      finishState(
        state,
        {
          status:
            EXECUTION_TRANSACTION_STATUS.PARTIAL,

          phase:
            EXECUTION_TRANSACTION_PHASE.PARTIAL,

          reason:
            afterCommit
              .result
              ?.reason ??
            "post-commit-hook-failed",

          error:
            afterCommit
              .result
              ?.error ??
            null
        }
      );

      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    if (
      terminateFromCommit(
        state,
        state.commit
      )
    ) {
      await runOutcomeHooks(
        hooks,
        state,
        { signal }
      );

      return buildFinalResult(
        state
      );
    }

    /* --------------------------------------------------------
       SUCCESS / PARTIAL TERMINAL
       -------------------------------------------------------- */

    const terminal =
      deriveSuccessfulTerminalStatus(
        state
      );

    finishState(
      state,
      terminal
    );

    await runOutcomeHooks(
      hooks,
      state,
      { signal }
    );

    return buildFinalResult(
      state
    );
  } catch (error) {
    /*
     * Last-resort runner failure.
     *
     * If primary execution has already succeeded, preserve PARTIAL.
     */
    const mechanicalExecutionOccurred =
      state.execution?.status ===
        EXECUTION_STEP_STATUS.SUCCEEDED ||
      state.execution?.status ===
        EXECUTION_STEP_STATUS.PARTIAL;

    finishState(
      state,
      {
        status:
          mechanicalExecutionOccurred
            ? EXECUTION_TRANSACTION_STATUS.PARTIAL
            : isAbortRequested(signal)
              ? EXECUTION_TRANSACTION_STATUS.CANCELLED
              : EXECUTION_TRANSACTION_STATUS.FAILED,

        phase:
          mechanicalExecutionOccurred
            ? EXECUTION_TRANSACTION_PHASE.PARTIAL
            : isAbortRequested(signal)
              ? EXECUTION_TRANSACTION_PHASE.CANCELLED
              : EXECUTION_TRANSACTION_PHASE.FAILED,

        reason:
          isAbortRequested(signal)
            ? "transaction-aborted"
            : "transaction-runner-error",

        error
      }
    );

    await runOutcomeHooks(
      hooks,
      state,
      { signal }
    );

    return buildFinalResult(
      state
    );
  } finally {
    releaseExecutionGuard(
      executionId
    );
  }
}

/* ============================================================
   SIMPLE NATIVE EXECUTION TRANSACTION
   ============================================================ */

/**
 * @section simple-native-execution-transaction
 *
 * Convenience composition for Class 1 mechanics.
 *
 * Native execution callback may directly return NativeExecutionResult.
 *
 * Later action_economy/resource hooks can still attach around it.
 */

export async function runNativeExecutionTransaction({
  context,
  execute,
  preValidate = null,
  target = null,
  finalValidate = null,
  resolve = null,
  commit = null,
  hooks = null,
  signal = null,
  rebuildContext = true,
  metadata = {}
} = {}) {
  return runExecutionTransaction({
    context,

    callbacks: {
      preValidate,
      target,
      finalValidate,
      execute,
      resolve,
      commit
    },

    hooks,
    signal,
    rebuildContext,
    metadata
  });
}

/* ============================================================
   CLASS 2 PARENT EXECUTION TRANSACTION
   ============================================================ */

/**
 * @section class-2-parent-execution-transaction
 *
 * Same runner.
 *
 * Semantic parent execution callback may:
 *
 * - create child ExecutionContexts
 * - recursively run child transactions
 * - aggregate child results
 *
 * No second transaction model is required for Skirmish/Barrage/etc.
 */

export async function runSemanticParentTransaction(
  options
) {
  return runExecutionTransaction(
    options
  );
}

/* ============================================================
   TRANSACTION DIAGNOSTICS
   ============================================================ */

/**
 * @section transaction-diagnostics
 */

export function getExecutionTransactionDiagnostics() {
  return Object.freeze({
    activeExecutionIds:
      Object.freeze(
        [
          ...ACTIVE_EXECUTION_IDS
        ]
      ),

    activeCount:
      ACTIVE_EXECUTION_IDS.size
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Existing orchestration should migrate toward:
 *
 * semantic action selected
 * → buildExecutionContext(...)
 * → runExecutionTransaction(...)
 * → consume final result
 *
 * runtime-orchestrator should no longer manually sequence every action's:
 *
 * validation
 * targeting
 * native execution
 * resource mutation
 * completion
 *
 *
 * feature_actions/
 * ----------------
 *
 * Existing universal actions remain semantic definitions.
 *
 * Their runtime implementation supplies callbacks:
 *
 * preValidate
 * target
 * finalValidate
 * execute
 * resolve
 * commit
 *
 * Simple Class 1 actions may supply only:
 *
 * execute
 *
 *
 * native_adapter/
 * ---------------
 *
 * Native adapter results may be returned directly from execute().
 *
 * Runner normalizes them into ExecutionStepResult.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Canonical transaction input.
 *
 * Runner rebuilds native identity immediately before validation by default.
 *
 *
 * feature_turn/
 * -------------
 *
 * Existing turn state should later participate through:
 *
 * action_economy preValidate/commit hooks
 *
 * Do not move existing turn UI/composition into this runner.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Movement may use this same transaction sequence:
 *
 * validate route
 * → execute token movement
 * → movement tracker records actual movement
 * → commit special resource/action cost
 *
 * Existing movement tracker remains authoritative.
 *
 *
 * action_economy/
 * ---------------
 *
 * Expected integration:
 *
 * BEFORE/AFTER PRE_VALIDATE
 * → economy availability
 *
 * BEFORE/AFTER COMMIT
 * → economy spend
 *
 * Or through explicit runner callbacks composed by
 * execution-transaction-hooks.js.
 *
 *
 * resource_service/
 * -----------------
 *
 * Expected:
 *
 * preValidate
 * → validate all resources
 *
 * execute
 * → native resources may consume natively
 *
 * commit
 * → deferred frequency/counter/supplemental resources
 * → verify native-consumed resources
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Expected:
 *
 * target callback
 * → acquire targets/template
 *
 * finalValidate callback
 * → validate Range/LOS/adjacency/template legality
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Resolution/commit may register temporary effect lifecycle records.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * execution-transaction-hooks.js should attach event emission to stable
 * hook stages rather than hardcoding event dispatch into this runner.
 *
 *
 * execution-strategy registry
 * ---------------------------
 *
 * Strategy supplies semantic callbacks.
 *
 * Runner supplies universal sequencing.
 *
 * Example:
 *
 * Annihilator
 * → execute native primary attack
 * → resolve OnHit strategy
 * → child transaction(s)
 * → commit parent resources
 *
 *
 * Skirmish/Barrage
 * ----------------
 *
 * Parent transaction:
 *
 * execute
 * → orchestrates native child weapon transactions
 *
 * parent and children retain distinct execution IDs under one root ID.
 */

/* ============================================================
   TRANSACTION ORDERING NOTES
   ============================================================ */

/**
 * @section transaction-ordering-notes
 *
 * DEFAULT ORDER
 * -------------
 *
 * rebuild
 * → prevalidate
 * → target
 * → final validate
 * → execute
 * → resolve
 * → commit
 *
 *
 * WHY TWO VALIDATION PHASES
 * -------------------------
 *
 * Pre-validation:
 *
 * - source exists
 * - controller allowed
 * - action economy available
 * - resources available
 * - broad action preconditions
 *
 * Final validation:
 *
 * - target exists
 * - Range
 * - LOS
 * - Sensors
 * - adjacency
 * - AoE/template legality
 * - current state recheck
 *
 *
 * WHY COMMIT AFTER RESOLUTION
 * ---------------------------
 *
 * Deferred Frame Conn-owned resources should not be consumed merely
 * because:
 *
 * - a target picker opened
 * - a native HUD opened
 * - execution was cancelled
 * - source execution failed
 *
 * Native resources consumed by native Flows remain native-owned and are
 * verified during commit instead of spent again.
 */

/* ============================================================
   PARTIAL EXECUTION NOTES
   ============================================================ */

/**
 * @section partial-execution-notes
 *
 * Once irreversible mechanical execution succeeds:
 *
 * later resolution/commit errors
 * → PARTIAL
 *
 * not:
 *
 * FAILED as though nothing occurred.
 *
 * Examples:
 *
 * AoE:
 * target 1 resolves
 * target 2 resolves
 * target 3 throws
 * → PARTIAL
 *
 * Native attack succeeds
 * special OnHit strategy throws
 * → PARTIAL
 *
 * Native action succeeds
 * deferred counter commit fails
 * → PARTIAL
 *
 * Final result preserves all component results for recovery/debugging.
 */

/* ============================================================
   CONCURRENCY NOTES
   ============================================================ */

/**
 * @section concurrency-notes
 *
 * ACTIVE_EXECUTION_IDS prevents duplicate simultaneous execution of one
 * ExecutionContext.
 *
 * This guards common:
 *
 * double-click
 * repeated UI event
 * duplicate async invocation
 *
 * It does NOT globally serialize:
 *
 * different actors
 * different child executions
 * different execution IDs
 *
 * Child transactions have distinct execution IDs and remain legal.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * One ExecutionContext enters one canonical transaction pipeline.
 *
 * INVARIANT 2
 * execute() is the only mandatory mechanic callback.
 *
 * INVARIANT 3
 * Missing optional callbacks normalize safely rather than requiring
 * feature-specific transaction runners.
 *
 * INVARIANT 4
 * Context is rebuilt before execution by default.
 *
 * INVARIANT 5
 * Pre-validation occurs before target acquisition.
 *
 * INVARIANT 6
 * Target-dependent final validation occurs after target acquisition.
 *
 * INVARIANT 7
 * Deferred commit occurs only after commit-eligible execution/resolution.
 *
 * INVARIANT 8
 * Native-consumed resources are not re-spent by this runner.
 *
 * INVARIANT 9
 * Blocked, Cancelled, Failed, Partial, and Succeeded remain distinct.
 *
 * INVARIANT 10
 * Failure after irreversible mechanical execution becomes Partial.
 *
 * INVARIANT 11
 * Hooks may replace context before execution.
 *
 * INVARIANT 12
 * Terminal outcome hooks are observational and cannot falsify already
 * established mechanical outcome.
 *
 * INVARIANT 13
 * Transaction sequencing does not import subsystem rule implementations.
 *
 * INVARIANT 14
 * action_economy/resource/targeting/lifecycle/event behavior is injected.
 *
 * INVARIANT 15
 * Duplicate concurrent execution of one executionId is blocked.
 *
 * INVARIANT 16
 * Parent/child actions use the same transaction model.
 *
 * INVARIANT 17
 * runtime-orchestrator remains above the transaction runner rather than
 * being replaced by it.
 */