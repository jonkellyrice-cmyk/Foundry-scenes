/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/targeting_spatial_service/targeting-spatial-hooks.js
 */

/**
 * @file
 * @path main/targeting_spatial_service/targeting-spatial-hooks.js
 * @module targeting-spatial-hooks
 * @layer targeting-spatial-service-transaction-integration
 * @responsibility attach-target-acquisition-and-final-spatial-validation-to-execution-transactions
 * @public-boundary false
 * @side-effects target-acquisition-validation-and-execution-hook-registration
 *
 * @depends-on
 * - targeting-spatial-contract
 * - targeting-spatial-resolver
 * - targeting-spatial-validator
 * - semantic_event_bus/semantic-event-bus
 * - execution_transaction/execution-transaction
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - attaches targeting_spatial_service to execution_transaction/
 * - resolves targets during the transaction targeting boundary
 * - validates resolved targets during final validation
 * - emits normalized targeting semantic events
 * - preserves targeting state by executionId between transaction stages
 * - future actor_owned_feature_registry/ supplies targeting requirements
 * - future system_bridge/ may supplement missing targeting metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - targeting-spatial-resolver.js owns target acquisition
 * - targeting-spatial-validator.js owns target legality
 * - targeting-spatial-query.js owns spatial facts
 * - execution_transaction/ owns stage sequencing
 * - semantic_event_bus/ owns semantic event transport
 *
 * THIS FILE OWNS:
 * - transaction targeting hook registration
 * - per-execution targeting state
 * - targeting requirement augmentation resolver
 * - target acquisition transaction integration
 * - final targeting validation transaction integration
 * - targeting semantic event emission
 * - terminal targeting state cleanup
 *
 * THIS FILE DOES NOT OWN:
 * - target acquisition implementation
 * - spatial geometry
 * - target legality rules
 * - transaction sequencing
 * - actor-owned feature discovery
 * - system bridge composition
 *
 * EDIT CONTRACT:
 * - resolve targets before final target-dependent validation
 * - never execute mechanics from targeting hooks
 * - target cancellation must stop execution before native execution
 * - invalid targeting must block execution
 * - cleanup per-execution targeting state on all terminal outcomes
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  TARGET_RESOLUTION_STATUS,
  TARGET_VALIDATION_STATUS
} from "./targeting-spatial-contract.js";

import {
  buildTargetingRequest,
  resolveTargetingRequest
} from "./targeting-spatial-resolver.js";

import {
  toExecutionTargetValidationResult,
  validateTargetResolution
} from "./targeting-spatial-validator.js";

import {
  SEMANTIC_EVENT_KIND,
  emitExecutionSemanticEvent
} from "../semantic_event_bus/semantic-event-bus.js";

import {
  EXECUTION_HOOK_PRIORITY,
  EXECUTION_HOOK_SOURCE_KIND,
  blockTransaction,
  continueTransaction,
  failTransaction,
  onAfterFinalValidate,
  onTransactionBlock,
  onTransactionCancel,
  onTransactionFailure,
  onTransactionPartial,
  onTransactionSuccess,
  registerExecutionTransactionHook,
  executionTransaction
} from "../execution_transaction/execution-transaction.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const TARGETING_SPATIAL_HOOKS_MODULE_ID =
  "lancer-frame-conn.targeting-spatial-hooks";

export const TARGETING_SPATIAL_HOOKS_MODULE_VERSION =
  1;

/* ============================================================
   EXECUTION TRANSACTION STAGES
   ============================================================ */

/**
 * @section execution-transaction-stages
 *
 * Target acquisition must occur before final target-dependent validation.
 *
 * Use execution_transaction public contract stages.
 */

const EXECUTION_TRANSACTION_HOOK_STAGE =
  executionTransaction
    .contract
    .EXECUTION_TRANSACTION_HOOK_STAGE;

/* ============================================================
   HOOK IDS
   ============================================================ */

export const TARGETING_SPATIAL_HOOK_ID =
  Object.freeze({
    TARGETING:
      "targeting-spatial.targeting",

    FINAL_VALIDATE:
      "targeting-spatial.final-validate",

    SUCCESS_CLEANUP:
      "targeting-spatial.success-cleanup",

    BLOCK_CLEANUP:
      "targeting-spatial.block-cleanup",

    CANCEL_CLEANUP:
      "targeting-spatial.cancel-cleanup",

    FAILURE_CLEANUP:
      "targeting-spatial.failure-cleanup",

    PARTIAL_CLEANUP:
      "targeting-spatial.partial-cleanup"
  });

/* ============================================================
   HOOK PRIORITY
   ============================================================ */

/**
 * @section hook-priority
 *
 * Target acquisition should occur after early non-target prerequisites.
 *
 * Final spatial validation should occur before execution.
 */

export const TARGETING_SPATIAL_HOOK_PRIORITY =
  Object.freeze({
    TARGETING:
      EXECUTION_HOOK_PRIORITY.NORMAL,

    FINAL_VALIDATE:
      EXECUTION_HOOK_PRIORITY.NORMAL,

    CLEANUP:
      EXECUTION_HOOK_PRIORITY.LATEST
  });

/* ============================================================
   PRIVATE EXECUTION STATE
   ============================================================ */

/**
 * @section private-execution-state
 *
 * executionId →
 *
 * {
 *   requirement,
 *   request,
 *   resolution,
 *   validation,
 *   augmentation
 * }
 */

const TARGETING_STATE_BY_EXECUTION =
  new Map();

/* ============================================================
   TARGETING AUGMENTATION RESOLVER
   ============================================================ */

/**
 * @section targeting-augmentation-resolver
 *
 * Future system_bridge integration.
 *
 * Expected optional return:
 *
 * {
 *   requirement?: TargetingRequirement,
 *   promptIfMissing?: boolean
 * }
 */

let targetingAugmentationResolver =
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

function getStoredTargetingState(
  executionId
) {
  if (!requiredString(executionId)) {
    return null;
  }

  return (
    TARGETING_STATE_BY_EXECUTION.get(
      executionId
    ) ??
    null
  );
}

function storeTargetingState(
  executionId,
  state
) {
  if (!requiredString(executionId)) {
    throw new TypeError(
      "Targeting hook state requires executionId."
    );
  }

  TARGETING_STATE_BY_EXECUTION.set(
    executionId,
    Object.freeze({
      ...state
    })
  );

  return getStoredTargetingState(
    executionId
  );
}

function patchTargetingState(
  executionId,
  patch
) {
  return storeTargetingState(
    executionId,
    {
      ...(
        getStoredTargetingState(
          executionId
        ) ??
        {}
      ),

      ...patch
    }
  );
}

function clearTargetingState(
  executionId
) {
  if (!requiredString(executionId)) {
    return false;
  }

  return TARGETING_STATE_BY_EXECUTION.delete(
    executionId
  );
}

/* ============================================================
   AUGMENTATION CONFIGURATION
   ============================================================ */

export function setTargetingAugmentationResolver(
  resolver
) {
  if (
    resolver != null &&
    typeof resolver !==
      "function"
  ) {
    throw new TypeError(
      "Targeting augmentation resolver must be function or null."
    );
  }

  targetingAugmentationResolver =
    resolver;

  return true;
}

export function getTargetingAugmentationResolver() {
  return targetingAugmentationResolver;
}

/* ============================================================
   TARGETING REQUIREMENT RESOLUTION
   ============================================================ */

async function resolveTargetingAugmentation(
  payload
) {
  if (
    typeof targetingAugmentationResolver !==
    "function"
  ) {
    return null;
  }

  return targetingAugmentationResolver({
    context:
      payload.context,

    transaction:
      payload.transaction
  });
}

function resolveTargetingRequirement(
  payload,
  augmentation
) {
  return (
    augmentation
      ?.requirement ??
    payload
      ?.context
      ?.targeting
      ?.requirement ??
    null
  );
}

/* ============================================================
   TARGETING SEMANTIC EVENT EMISSION
   ============================================================ */

/**
 * @section targeting-semantic-event-emission
 *
 * Targeting events are observational.
 */

async function safelyEmitTargetingEvent(
  context,
  {
    kind,
    payload = null,
    targets = null,
    metadata = {}
  } = {}
) {
  try {
    return await emitExecutionSemanticEvent(
      context,
      {
        kind,
        targets,
        payload,
        metadata
      }
    );
  } catch (error) {
    return Object.freeze({
      event:
        null,

      dispatchResult:
        null,

      error
    });
  }
}

/* ============================================================
   TARGET ACQUISITION HOOK
   ============================================================ */

/**
 * @section target-acquisition-hook
 *
 * Runs at the transaction's targeting boundary.
 *
 * Sequence:
 *
 * resolve augmentation
 * → build TargetingRequest
 * → resolve existing targets / prompt if missing
 * → store resolution
 * → expose normalized resolution to later validation
 */

export async function runTargetingSpatialTargetingHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );

  if (!requiredString(executionId)) {
    return failTransaction(
      "targeting",
      new Error(
        "Targeting spatial hook requires executionId."
      ),
      {
        reason:
          "targeting-execution-id-missing",

        context:
          payload.context
      }
    );
  }

  let augmentation =
    null;

  try {
    augmentation =
      await resolveTargetingAugmentation(
        payload
      );
  } catch (error) {
    return failTransaction(
      "targeting",
      error,
      {
        reason:
          "targeting-augmentation-resolution-failed",

        context:
          payload.context
      }
    );
  }

  const requirement =
    resolveTargetingRequirement(
      payload,
      augmentation
    );

  let request;

  try {
    request =
      await buildTargetingRequest(
        payload.context,
        {
          requirement
        }
      );
  } catch (error) {
    return failTransaction(
      "targeting",
      error,
      {
        reason:
          "targeting-request-construction-failed",

        context:
          payload.context
      }
    );
  }

  let resolution;

  try {
    resolution =
      await resolveTargetingRequest(
        request,
        payload.context,
        {
          promptIfMissing:
            augmentation
              ?.promptIfMissing ??
            true
        }
      );
  } catch (error) {
    return failTransaction(
      "targeting",
      error,
      {
        reason:
          "target-resolution-threw",

        context:
          payload.context
      }
    );
  }

  storeTargetingState(
    executionId,
    {
      requirement,
      request,
      resolution,

      validation:
        null,

      augmentation
    }
  );

  /* ----------------------------------------------------------
     CANCELLED
     ---------------------------------------------------------- */

  if (
    resolution.status ===
    TARGET_RESOLUTION_STATUS.CANCELLED
  ) {
    /*
     * Target selection cancellation must prevent execution.
     *
     * execution_transaction terminal classification may distinguish this
     * through metadata/reason even though the hook uses the stable blocking
     * control primitive.
     */
    return blockTransaction(
      "targeting",

      resolution.reason ??
      "Target selection cancelled.",

      {
        context:
          payload.context,

        metadata: {
          targetingCancelled:
            true,

          targetingResolution:
            resolution
        }
      }
    );
  }

  /* ----------------------------------------------------------
     FAILED
     ---------------------------------------------------------- */

  if (
    resolution.status ===
    TARGET_RESOLUTION_STATUS.FAILED
  ) {
    return failTransaction(
      "targeting",
      resolution.error ??
      new Error(
        resolution.reason ??
        "Target resolution failed."
      ),
      {
        reason:
          resolution.reason ??
          "target-resolution-failed",

        context:
          payload.context,

        metadata: {
          targetingResolution:
            resolution
        }
      }
    );
  }

  /* ----------------------------------------------------------
     SEMANTIC TARGET ACQUIRED EVENTS
     ---------------------------------------------------------- */

  for (
    const target of
      resolution.targets ??
      []
  ) {
    await safelyEmitTargetingEvent(
      payload.context,
      {
        kind:
          SEMANTIC_EVENT_KIND.TARGET_ACQUIRED,

        targets: [
          target
        ],

        payload: {
          target,

          request
        },

        metadata: {
          executionId
        }
      }
    );
  }

  /* ----------------------------------------------------------
     TEMPLATE EVENT
     ---------------------------------------------------------- */

  if (resolution.area) {
    await safelyEmitTargetingEvent(
      payload.context,
      {
        kind:
          SEMANTIC_EVENT_KIND.TEMPLATE_PLACED,

        targets:
          resolution.targets,

        payload: {
          area:
            resolution.area,

          request
        },

        metadata: {
          executionId
        }
      }
    );
  }

  return continueTransaction(
    "targeting",
    {
      context:
        payload.context,

      metadata: {
        targetingRequest:
          request,

        targetingResolution:
          resolution
      }
    }
  );
}

/* ============================================================
   FINAL VALIDATION HOOK
   ============================================================ */

/**
 * @section final-validation-hook
 *
 * Target-dependent validation happens only after target acquisition.
 */

export async function runTargetingSpatialFinalValidationHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );

  if (!requiredString(executionId)) {
    return failTransaction(
      "after-final-validate",
      new Error(
        "Target validation requires executionId."
      ),
      {
        reason:
          "targeting-execution-id-missing",

        context:
          payload.context
      }
    );
  }

  const state =
    getStoredTargetingState(
      executionId
    );

  if (!state) {
    /*
     * No targeting hook state means the transaction did not establish a
     * targeting request through this service.
     *
     * Do not invent a target requirement.
     */
    return continueTransaction(
      "after-final-validate",
      {
        context:
          payload.context,

        metadata: {
          targetingValidation:
            "not-applicable"
        }
      }
    );
  }

  let validation;

  try {
    validation =
      await validateTargetResolution(
        state.resolution,
        {
          requirement:
            state.requirement
        }
      );
  } catch (error) {
    return failTransaction(
      "after-final-validate",
      error,
      {
        reason:
          "targeting-validation-threw",

        context:
          payload.context
      }
    );
  }

  patchTargetingState(
    executionId,
    {
      validation
    }
  );

  if (
    validation.status ===
      TARGET_VALIDATION_STATUS.SKIPPED
  ) {
    return continueTransaction(
      "after-final-validate",
      {
        context:
          payload.context,

        metadata: {
          targetingValidation:
            validation
        }
      }
    );
  }

  if (
    validation.status ===
      TARGET_VALIDATION_STATUS.VALID
  ) {
    await safelyEmitTargetingEvent(
      payload.context,
      {
        kind:
          SEMANTIC_EVENT_KIND.TARGETING_COMPLETED,

        targets:
          state
            .resolution
            .targets,

        payload: {
          request:
            state.request,

          resolution:
            state.resolution,

          validation
        },

        metadata: {
          executionId
        }
      }
    );

    return continueTransaction(
      "after-final-validate",
      {
        context:
          payload.context,

        metadata: {
          targetingValidation:
            validation
        }
      }
    );
  }

  const adapted =
    toExecutionTargetValidationResult(
      validation,
      {
        context:
          payload.context
      }
    );

  const firstIssue =
    adapted
      ?.issues
      ?.[0] ??
    null;

  return blockTransaction(
    "after-final-validate",

    firstIssue?.message ??
    "Selected target is not legal for this action.",

    {
      context:
        payload.context,

      metadata: {
        targetingValidation:
          validation,

        executionTargetValidation:
          adapted
      }
    }
  );
}

/* ============================================================
   TERMINAL CLEANUP
   ============================================================ */

export async function runTargetingSpatialTerminalCleanupHook(
  payload
) {
  const executionId =
    getExecutionIdFromPayload(
      payload
    );

  clearTargetingState(
    executionId
  );

  return continueTransaction(
    payload
      ?.transaction
      ?.phase ??
    "targeting-terminal-cleanup",
    {
      context:
        payload.context
    }
  );
}

/* ============================================================
   TARGETING STAGE RESOLUTION
   ============================================================ */

/**
 * @section targeting-stage-resolution
 *
 * Use the transaction contract's targeting hook boundary.
 *
 * This keeps the service dependent on execution_transaction's public stage
 * contract rather than runner internals.
 */

function getTargetingHookStage() {
  return (
    EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_TARGETING ??
    EXECUTION_TRANSACTION_HOOK_STAGE.TARGETING
  );
}

/* ============================================================
   GLOBAL HOOK REGISTRATION
   ============================================================ */

let registeredTargetingSpatialTransactionHooks =
  null;

export function registerTargetingSpatialTransactionHooks() {
  if (
    registeredTargetingSpatialTransactionHooks
  ) {
    return registeredTargetingSpatialTransactionHooks;
  }

  const targetingStage =
    getTargetingHookStage();

  if (!targetingStage) {
    throw new Error(
      "execution_transaction does not expose a targeting hook stage."
    );
  }

  const registrations = [
    /* --------------------------------------------------------
       TARGET ACQUISITION
       -------------------------------------------------------- */

    registerExecutionTransactionHook({
      id:
        TARGETING_SPATIAL_HOOK_ID.TARGETING,

      stage:
        targetingStage,

      handler:
        runTargetingSpatialTargetingHook,

      priority:
        TARGETING_SPATIAL_HOOK_PRIORITY.TARGETING,

      sourceKind:
        EXECUTION_HOOK_SOURCE_KIND.TARGETING,

      sourceId:
        TARGETING_SPATIAL_HOOKS_MODULE_ID
    }),

    /* --------------------------------------------------------
       FINAL TARGET VALIDATION
       -------------------------------------------------------- */

    onAfterFinalValidate(
      runTargetingSpatialFinalValidationHook,
      {
        id:
          TARGETING_SPATIAL_HOOK_ID.FINAL_VALIDATE,

        priority:
          TARGETING_SPATIAL_HOOK_PRIORITY.FINAL_VALIDATE,

        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.TARGETING,

        sourceId:
          TARGETING_SPATIAL_HOOKS_MODULE_ID
      }
    ),

    /* --------------------------------------------------------
       TERMINAL CLEANUP
       -------------------------------------------------------- */

    onTransactionSuccess(
      runTargetingSpatialTerminalCleanupHook,
      {
        id:
          TARGETING_SPATIAL_HOOK_ID.SUCCESS_CLEANUP,

        priority:
          TARGETING_SPATIAL_HOOK_PRIORITY.CLEANUP,

        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.TARGETING,

        sourceId:
          TARGETING_SPATIAL_HOOKS_MODULE_ID
      }
    ),

    onTransactionBlock(
      runTargetingSpatialTerminalCleanupHook,
      {
        id:
          TARGETING_SPATIAL_HOOK_ID.BLOCK_CLEANUP,

        priority:
          TARGETING_SPATIAL_HOOK_PRIORITY.CLEANUP,

        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.TARGETING,

        sourceId:
          TARGETING_SPATIAL_HOOKS_MODULE_ID
      }
    ),

    onTransactionCancel(
      runTargetingSpatialTerminalCleanupHook,
      {
        id:
          TARGETING_SPATIAL_HOOK_ID.CANCEL_CLEANUP,

        priority:
          TARGETING_SPATIAL_HOOK_PRIORITY.CLEANUP,

        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.TARGETING,

        sourceId:
          TARGETING_SPATIAL_HOOKS_MODULE_ID
      }
    ),

    onTransactionFailure(
      runTargetingSpatialTerminalCleanupHook,
      {
        id:
          TARGETING_SPATIAL_HOOK_ID.FAILURE_CLEANUP,

        priority:
          TARGETING_SPATIAL_HOOK_PRIORITY.CLEANUP,

        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.TARGETING,

        sourceId:
          TARGETING_SPATIAL_HOOKS_MODULE_ID
      }
    ),

    onTransactionPartial(
      runTargetingSpatialTerminalCleanupHook,
      {
        id:
          TARGETING_SPATIAL_HOOK_ID.PARTIAL_CLEANUP,

        priority:
          TARGETING_SPATIAL_HOOK_PRIORITY.CLEANUP,

        sourceKind:
          EXECUTION_HOOK_SOURCE_KIND.TARGETING,

        sourceId:
          TARGETING_SPATIAL_HOOKS_MODULE_ID
      }
    )
  ];

  registeredTargetingSpatialTransactionHooks =
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

        registeredTargetingSpatialTransactionHooks =
          null;

        TARGETING_STATE_BY_EXECUTION.clear();

        return removed;
      }
    });

  return registeredTargetingSpatialTransactionHooks;
}

/* ============================================================
   GLOBAL HOOK UNREGISTRATION
   ============================================================ */

export function unregisterTargetingSpatialTransactionHooks() {
  if (
    !registeredTargetingSpatialTransactionHooks
  ) {
    return 0;
  }

  return registeredTargetingSpatialTransactionHooks
    .dispose();
}

export function areTargetingSpatialTransactionHooksRegistered() {
  return Boolean(
    registeredTargetingSpatialTransactionHooks
  );
}

/* ============================================================
   EXECUTION TARGETING STATE ACCESS
   ============================================================ */

export function getExecutionTargetingSpatialState(
  executionId
) {
  return getStoredTargetingState(
    executionId
  );
}

export function getExecutionTargetingRequest(
  executionId
) {
  return (
    getStoredTargetingState(
      executionId
    )
      ?.request ??
    null
  );
}

export function getExecutionTargetResolution(
  executionId
) {
  return (
    getStoredTargetingState(
      executionId
    )
      ?.resolution ??
    null
  );
}

export function getExecutionTargetValidation(
  executionId
) {
  return (
    getStoredTargetingState(
      executionId
    )
      ?.validation ??
    null
  );
}

export function clearExecutionTargetingSpatialState(
  executionId
) {
  return clearTargetingState(
    executionId
  );
}

export function clearAllExecutionTargetingSpatialState() {
  const count =
    TARGETING_STATE_BY_EXECUTION.size;

  TARGETING_STATE_BY_EXECUTION.clear();

  return count;
}

/* ============================================================
   TARGET ACQUISITION EVENT NOTES
   ============================================================ */

/**
 * @section target-acquisition-event-notes
 *
 * target.acquired:
 *
 * emitted once per normalized acquired target.
 *
 * This does NOT mean the target has passed final legality validation.
 *
 * Consumers that require legal settled targets should prefer:
 *
 * targeting.completed
 */

/* ============================================================
   TARGETING COMPLETED EVENT NOTES
   ============================================================ */

/**
 * @section targeting-completed-event-notes
 *
 * targeting.completed is emitted only after:
 *
 * acquisition
 * +
 * final targeting validation succeeds.
 *
 * It is therefore the stable semantic boundary for:
 *
 * "this execution now has legal targets"
 */

/* ============================================================
   TEMPLATE EVENT NOTES
   ============================================================ */

/**
 * @section template-event-notes
 *
 * targeting.template-placed represents semantic template acquisition.
 *
 * It does not imply:
 *
 * template is legal
 * all included targets are legal
 * action has executed
 *
 * Final validation still follows.
 */

/* ============================================================
   CANCEL NOTES
   ============================================================ */

/**
 * @section cancel-notes
 *
 * User closes/cancels target prompt:
 *
 * TargetResolutionResult.status = CANCELLED
 *
 * Execution must stop before native execution.
 *
 * The stable transaction control primitive used here is blockTransaction()
 * with:
 *
 * metadata.targetingCancelled = true
 *
 * If execution_transaction later exposes a dedicated hook-level
 * cancelTransaction() helper, this hook may switch to it without changing
 * resolver/validator contracts.
 */

/* ============================================================
   TARGETING REQUIREMENT AUGMENTATION NOTES
   ============================================================ */

/**
 * @section targeting-requirement-augmentation-notes
 *
 * Existing Frame Conn registry/native feature data may not contain:
 *
 * target kinds
 * relationship
 * Sensors requirement
 * adjacency
 * LOS
 * special area targeting
 *
 * Future system_bridge:
 *
 * setTargetingAugmentationResolver(...)
 *
 * may provide the missing normalized TargetingRequirement.
 *
 * Hooks do not inspect augmentation provenance.
 */

/* ============================================================
   EXECUTION TRANSACTION ORDER NOTES
   ============================================================ */

/**
 * @section execution-transaction-order-notes
 *
 * Intended execution order:
 *
 * PRE_VALIDATE
 * ----------------
 * controller
 * action economy
 * resource availability
 * other non-target prerequisites
 *
 * TARGETING
 * ----------------
 * targeting-spatial resolver
 *
 * FINAL_VALIDATE
 * ----------------
 * target-dependent range/sensors/LOS/etc.
 *
 * EXECUTE
 * ----------------
 * native/semantic execution
 *
 * RESOLVE
 *
 * COMMIT
 *
 * Targeting hooks never execute the mechanic.
 */

/* ============================================================
   ACTION ECONOMY / RESOURCE NOTES
   ============================================================ */

/**
 * @section action-economy-resource-notes
 *
 * Action economy/resource prevalidation should generally occur before
 * prompting for targets.
 *
 * Example:
 *
 * actor has no Quick action remaining
 *
 * → block during prevalidation
 * → do NOT prompt player for a target
 *
 * Targeting therefore belongs after early non-target prerequisite checks.
 */

/* ============================================================
   ACTOR-OWNED FEATURE NOTES
   ============================================================ */

/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry may later supply runtime targeting
 * requirements for:
 *
 * weapon actions
 * mounted systems
 * talents
 * traits
 * core bonuses
 * core systems
 *
 * Hooks consume one normalized requirement regardless of source type.
 */

/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */

/**
 * @section system-bridge-notes
 *
 * system_bridge later composes:
 *
 * native targeting data
 * existing registry data
 * actor-owned descriptor
 * augmentation
 *
 * into:
 *
 * TargetingRequirement
 *
 * Hooks consume that final requirement through the augmentation resolver or
 * ExecutionContext.
 */

/* ============================================================
   PATHFINDER NOTES
   ============================================================ */

/**
 * @section pathfinder-notes
 *
 * Pathfinder may reuse targeting_spatial_service queries.
 *
 * It does not participate in ordinary target acquisition hooks unless a
 * movement action specifically requires a destination point.
 *
 * Route planning remains outside this module.
 */

/* ============================================================
   SEMANTIC EVENT FAILURE NOTES
   ============================================================ */

/**
 * @section semantic-event-failure-notes
 *
 * Targeting semantic event dispatch is observational.
 *
 * A listener failure cannot:
 *
 * invalidate otherwise legal targeting
 * block native execution
 * rewrite targeting truth
 *
 * The event result remains diagnostic/trigger infrastructure.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getTargetingSpatialHookDiagnostics() {
  return Object.freeze({
    id:
      TARGETING_SPATIAL_HOOKS_MODULE_ID,

    version:
      TARGETING_SPATIAL_HOOKS_MODULE_VERSION,

    registered:
      areTargetingSpatialTransactionHooksRegistered(),

    augmentationResolverConfigured:
      typeof targetingAugmentationResolver ===
      "function",

    activeExecutionCount:
      TARGETING_STATE_BY_EXECUTION.size,

    activeExecutionIds:
      Object.freeze([
        ...TARGETING_STATE_BY_EXECUTION.keys()
      ])
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies existing source/targets/targeting requirement when available.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Remains authoritative for targeting/final-validation sequencing.
 *
 *
 * targeting-spatial-resolver.js
 * -----------------------------
 *
 * Acquires/normalizes targets.
 *
 *
 * targeting-spatial-validator.js
 * ------------------------------
 *
 * Applies target legality.
 *
 *
 * targeting-spatial-query.js
 * --------------------------
 *
 * Supplies factual geometry.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Receives targeting domain events.
 *
 *
 * action_economy/
 * ---------------
 *
 * Should reject impossible actions before targeting prompt.
 *
 *
 * resource_service/
 * -----------------
 *
 * Should reject unavailable required resources before targeting prompt.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later supplies owned-feature targeting descriptors.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplements missing targeting semantics.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * targeting-spatial-hooks attaches targeting service to
 * execution_transaction without changing runner sequencing.
 *
 * INVARIANT 2
 * Target acquisition occurs before final target-dependent validation.
 *
 * INVARIANT 3
 * Resolver owns acquisition.
 *
 * INVARIANT 4
 * Validator owns legality.
 *
 * INVARIANT 5
 * Hooks do not perform geometry calculations.
 *
 * INVARIANT 6
 * Missing targets may prompt through the resolver adapter.
 *
 * INVARIANT 7
 * Prompt cancellation stops execution before native execution.
 *
 * INVARIANT 8
 * Invalid target selection blocks execution before native execution.
 *
 * INVARIANT 9
 * Targeting semantic events are observational.
 *
 * INVARIANT 10
 * target.acquired does not imply target legality.
 *
 * INVARIANT 11
 * targeting.completed means final targeting validation succeeded.
 *
 * INVARIANT 12
 * Per-execution targeting state survives from acquisition through final
 * validation.
 *
 * INVARIANT 13
 * Per-execution targeting state is cleaned on every terminal outcome.
 *
 * INVARIANT 14
 * actor_owned_feature_registry may supply targeting requirements but does
 * not own transaction integration.
 *
 * INVARIANT 15
 * system_bridge may augment targeting metadata but does not perform
 * targeting.
 */