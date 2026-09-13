/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/action_economy/action-economy-transaction.js
 */
/**
 * @file
 * @path main/action_economy/action-economy-transaction.js
 * @module action-economy-transaction
 * @layer action-economy-transaction
 * @responsibility build-validate-and-commit-action-economy-for-one-execution
 * @public-boundary false
 * @side-effects delegated-turn-state-mutation
 *
 * @depends-on
 * - action-economy-contract
 * - action-economy-state
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes ExecutionContext economy/flags
 * - reads/writes existing feature_turn/ through action-economy-state.js
 * - consumed by action-economy-hooks.js
 * - consumed by action-economy.js
 * - integrates with execution_transaction/ prevalidation and commit stages
 * - future feature_runtime_bridge/ may supplement activation/cost metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature_turn/ remains authoritative turn-state backing
 * - semantic_execution_context/ remains canonical execution-input authority
 * - execution_transaction/ remains validation/commit timing authority
 * - resource_service/ remains separate from action economy
 *
 * THIS FILE OWNS:
 * - ActionEconomyRequest construction
 * - economy cost normalization
 * - Quick/Full coupling semantics
 * - economy validation
 * - economy mutation inference
 * - economy commit
 * - normalized economy transaction results
 *
 * THIS FILE DOES NOT OWN:
 * - authoritative turn-state persistence
 * - transaction stage sequencing
 * - resource validation/consumption
 * - target legality
 * - native Lancer execution
 * - feature-specific action effects
 *
 * EDIT CONTRACT:
 * - all state reads/writes go through action-economy-state.js
 * - validate before execute
 * - commit only when execution_transaction requests commit
 * - Protocol remains free-cost/start-of-turn-only/once-per-turn
 * - no action-economy mutation on pre-execution block/cancel/failure
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  ACTION_ECONOMY_ACTIVATION,
  ACTION_ECONOMY_COMMIT_STATUS,
  ACTION_ECONOMY_COST_MODE,
  ACTION_ECONOMY_FAILURE,
  ACTION_ECONOMY_TURN_PHASE,
  ACTION_ECONOMY_VALIDATION_STATUS,
  actionEconomyCommitFailed,
  actionEconomyCommitNothing,
  actionEconomyCommitPartial,
  actionEconomyCommitSkipped,
  actionEconomyCommitSucceeded,
  actionEconomyValidationFailed,
  actionEconomyValidationSucceeded,
  createActionEconomyCost,
  createActionEconomyMutation,
  createActionEconomyRequest,
  createActionEconomyValidationIssue,
  inferActionEconomyMutation,
  inferStandardActionEconomyCost,
  validateStandardActionEconomy
} from "./action-economy-contract.js";
import {
  applyActionEconomyMutation,
  getActionEconomyActorReference,
  readExecutionActionEconomySnapshot
} from "./action-economy-state.js";
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
function finiteNumber(value) {
  return Number.isFinite(value);
}
function getSemanticActionId(
  context
) {
  return (
    context
      ?.semanticAction
      ?.id ??
    null
  );
}
function getExecutionActivationType(
  context
) {
  return (
    context
      ?.economy
      ?.activationType ??
    context
      ?.semanticAction
      ?.activationType ??
    ACTION_ECONOMY_ACTIVATION.NONE
  );
}
/* ============================================================
   ACTIVATION NORMALIZATION
   ============================================================ */
/**
 * @section activation-normalization
 */
function normalizeActivationType(
  activationType
) {
  switch (activationType) {
    case "movement":
      return ACTION_ECONOMY_ACTIVATION.MOVEMENT;
    case "quick":
      return ACTION_ECONOMY_ACTIVATION.QUICK;
    case "full":
      return ACTION_ECONOMY_ACTIVATION.FULL;
    case "free":
      return ACTION_ECONOMY_ACTIVATION.FREE;
    case "protocol":
      return ACTION_ECONOMY_ACTIVATION.PROTOCOL;
    case "reaction":
      return ACTION_ECONOMY_ACTIVATION.REACTION;
    case "special":
    case "tech":
    case "invade":
      return ACTION_ECONOMY_ACTIVATION.SPECIAL;
    case "none":
    case null:
    case undefined:
    default:
      return ACTION_ECONOMY_ACTIVATION.NONE;
  }
}
/* ============================================================
   COST NORMALIZATION
   ============================================================ */
/**
 * @section cost-normalization
 *
 * Accepts:
 *
 * ActionEconomyCost
 * numeric quick cost
 * simple object
 * null → standard inferred cost
 */
function normalizeActionEconomyCost(
  rawCost,
  activationType
) {
  if (!rawCost) {
    return inferStandardActionEconomyCost(
      activationType
    );
  }
  if (
    typeof rawCost ===
    "number"
  ) {
    return createActionEconomyCost({
      quick:
        rawCost
    });
  }
  if (
    isObject(rawCost)
  ) {
    return createActionEconomyCost({
      mode:
        rawCost.mode ??
        ACTION_ECONOMY_COST_MODE.STANDARD,
      quick:
        rawCost.quick ??
        0,
      full:
        rawCost.full ??
        0,
      protocol:
        rawCost.protocol ??
        0,
      movement:
        rawCost.movement ??
        0,
      reaction:
        rawCost.reaction ??
        0,
      metadata:
        rawCost.metadata ??
        {}
    });
  }
  throw new TypeError(
    "Unsupported action economy cost."
  );
}
/* ============================================================
   ECONOMY REQUEST FROM EXECUTION CONTEXT
   ============================================================ */
/**
 * @section economy-request-from-execution-context
 */
export function buildActionEconomyRequest(
  context,
  {
    activationType = null,
    cost = null
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "buildActionEconomyRequest requires ExecutionContext."
    );
  }
  const normalizedActivation =
    normalizeActivationType(
      activationType ??
      getExecutionActivationType(
        context
      )
    );
  const requestedCost =
    cost ??
    context
      ?.economy
      ?.costOverride ??
    context
      ?.economy
      ?.requestedCost ??
    null;
  let normalizedCost =
    normalizeActionEconomyCost(
      requestedCost,
      normalizedActivation
    );
  const grantedAction =
    Boolean(
      context
        ?.flags
        ?.grantedAction
    );
  const freeActionOverride =
    Boolean(
      context
        ?.flags
        ?.freeActionOverride
    );
  const ignoreActionCost =
    Boolean(
      context
        ?.flags
        ?.ignoreActionCost
    );
  if (
    grantedAction &&
    !requestedCost
  ) {
    normalizedCost =
      createActionEconomyCost({
        mode:
          ACTION_ECONOMY_COST_MODE.GRANTED
      });
  }
  if (
    freeActionOverride &&
    !ignoreActionCost
  ) {
    normalizedCost =
      createActionEconomyCost({
        ...normalizedCost,
        mode:
          ACTION_ECONOMY_COST_MODE.FREE,
        quick:
          0,
        full:
          0,
        movement:
          0,
        reaction:
          0,
        /*
         * Protocol timing must survive a free override.
         */
        protocol:
          normalizedActivation ===
            ACTION_ECONOMY_ACTIVATION.PROTOCOL
            ? 1
            : 0
      });
  }
  return createActionEconomyRequest({
    activationType:
      normalizedActivation,
    cost:
      normalizedCost,
    grantedByExecutionId:
      context
        ?.economy
        ?.grantedByExecutionId ??
      context
        ?.identity
        ?.parentExecutionId ??
      null,
    freeActionOverride,
    ignoreActionCost,
    reactionTrigger:
      context
        ?.economy
        ?.reactionTrigger ??
      null,
    metadata: {
      semanticActionId:
        getSemanticActionId(
          context
        )
    }
  });
}
/* ============================================================
   QUICK / FULL COUPLING
   ============================================================ */
/**
 * @section quick-full-coupling
 *
 * Frame Conn existing state exposes both:
 *
 * quickRemaining
 * fullAvailable
 *
 * These represent two views of one action budget.
 *
 * Standard semantics:
 *
 * untouched turn:
 * quickRemaining = 2
 * fullAvailable = true
 *
 * spend one Quick:
 * quickRemaining = 1
 * fullAvailable = false
 *
 * spend second Quick:
 * quickRemaining = 0
 * fullAvailable = false
 *
 * spend Full:
 * quickRemaining = 0
 * fullAvailable = false
 *
 * This prevents:
 *
 * Full + Quick
 * Quick + Full
 *
 * during one ordinary turn.
 */
function validateQuickFullCoupling(
  request,
  snapshot
) {
  const issues = [];
  const quickCost =
    request
      ?.cost
      ?.quick ??
    0;
  const fullCost =
    request
      ?.cost
      ?.full ??
    0;
  if (
    fullCost > 0 &&
    snapshot.quickRemaining <
      2
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.FULL_UNAVAILABLE,
        message:
          "A Full Action is unavailable after spending a Quick Action.",
        expected:
          2,
        actual:
          snapshot.quickRemaining
      })
    );
  }
  if (
    quickCost > 0 &&
    snapshot.fullAvailable ===
      false &&
    snapshot.quickRemaining ===
      2
  ) {
    /*
     * Defensive invalid-state check.
     *
     * Ordinarily fullAvailable becomes false after the first Quick.
     * quickRemaining == 2 + fullAvailable false suggests an external
     * special rule or inconsistent backing state.
     *
     * Quick actions themselves remain valid if quickRemaining permits.
     * Do not block here.
     */
  }
  return Object.freeze({
    valid:
      issues.length === 0,
    issues:
      Object.freeze(
        issues
      )
  });
}
/* ============================================================
   PROTOCOL BYPASS GUARD
   ============================================================ */
/**
 * @section protocol-bypass-guard
 *
 * ignoreActionCost/free/granted modifies slot expenditure.
 *
 * It does NOT automatically bypass Protocol timing unless a future
 * explicit special rule introduces a dedicated timing override.
 */
function validateProtocolTimingDespiteCostOverrides(
  request,
  snapshot
) {
  if (
    request.activationType !==
    ACTION_ECONOMY_ACTIVATION.PROTOCOL
  ) {
    return null;
  }
  const ordinaryRequest =
    createActionEconomyRequest({
      ...request,
      ignoreActionCost:
        false,
      freeActionOverride:
        false,
      cost:
        createActionEconomyCost({
          mode:
            ACTION_ECONOMY_COST_MODE.FREE,
          protocol:
            1
        })
    });
  return validateStandardActionEconomy(
    ordinaryRequest,
    snapshot
  );
}
/* ============================================================
   PRIMARY ECONOMY VALIDATION
   ============================================================ */
/**
 * @section primary-economy-validation
 */
export async function validateExecutionActionEconomy(
  context,
  {
    request = null,
    snapshot = null
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "validateExecutionActionEconomy requires ExecutionContext."
    );
  }
  const economyRequest =
    request ??
    buildActionEconomyRequest(
      context
    );
  const economySnapshot =
    snapshot ??
    await readExecutionActionEconomySnapshot(
      context
    );
  /*
   * Protocol timing is never bypassed merely because its slot cost is
   * free/granted.
   */
  const protocolValidation =
    validateProtocolTimingDespiteCostOverrides(
      economyRequest,
      economySnapshot
    );
  if (
    protocolValidation &&
    !protocolValidation.valid
  ) {
    return protocolValidation;
  }
  const standardValidation =
    validateStandardActionEconomy(
      economyRequest,
      economySnapshot
    );
  if (!standardValidation.valid) {
    return standardValidation;
  }
  if (
    economyRequest.ignoreActionCost ||
    economyRequest.freeActionOverride ||
    economyRequest.cost?.mode ===
      ACTION_ECONOMY_COST_MODE.GRANTED ||
    economyRequest.cost?.mode ===
      ACTION_ECONOMY_COST_MODE.NONE
  ) {
    return standardValidation;
  }
  const coupling =
    validateQuickFullCoupling(
      economyRequest,
      economySnapshot
    );
  if (!coupling.valid) {
    return actionEconomyValidationFailed({
      request:
        economyRequest,
      snapshot:
        economySnapshot,
      issues:
        coupling.issues
    });
  }
  return actionEconomyValidationSucceeded({
    request:
      economyRequest,
    snapshot:
      economySnapshot
  });
}
/* ============================================================
   MUTATION NORMALIZATION
   ============================================================ */
/**
 * @section mutation-normalization
 *
 * Adds Quick/Full coupling to the generic contract mutation.
 */
export function buildActionEconomyMutation(
  context,
  request,
  snapshot
) {
  if (!context) {
    throw new TypeError(
      "buildActionEconomyMutation requires ExecutionContext."
    );
  }
  if (!request) {
    throw new TypeError(
      "buildActionEconomyMutation requires ActionEconomyRequest."
    );
  }
  const base =
    inferActionEconomyMutation(
      request,
      {
        actionId:
          getSemanticActionId(
            context
          )
      }
    );
  let quickDelta =
    base.quickDelta;
  let consumeFull =
    base.consumeFull;
  /*
   * Spending a Full Action exhausts the standard two-Quick budget.
   */
  if (
    !request.ignoreActionCost &&
    !request.freeActionOverride &&
    request.cost?.mode !==
      ACTION_ECONOMY_COST_MODE.GRANTED &&
    (
      request
        .cost
        ?.full ??
      0
    ) > 0
  ) {
    quickDelta =
      -(
        snapshot
          ?.quickRemaining ??
        0
      );
    consumeFull =
      true;
  }
  /*
   * Spending any ordinary Quick closes Full availability.
   */
  if (
    !request.ignoreActionCost &&
    !request.freeActionOverride &&
    request.cost?.mode !==
      ACTION_ECONOMY_COST_MODE.GRANTED &&
    (
      request
        .cost
        ?.quick ??
      0
    ) > 0
  ) {
    consumeFull =
      true;
  }
  return createActionEconomyMutation({
    ...base,
    quickDelta,
    consumeFull,
    actionId:
      getSemanticActionId(
        context
      )
  });
}
/* ============================================================
   ECONOMY PREPARATION
   ============================================================ */
/**
 * @section economy-preparation
 *
 * Snapshot + request + validation.
 *
 * Intended BEFORE_PRE_VALIDATE use.
 */
export async function prepareActionEconomyTransaction(
  context
) {
  if (!context) {
    throw new TypeError(
      "prepareActionEconomyTransaction requires ExecutionContext."
    );
  }
  const request =
    buildActionEconomyRequest(
      context
    );
  const snapshot =
    await readExecutionActionEconomySnapshot(
      context
    );
  const validation =
    await validateExecutionActionEconomy(
      context,
      {
        request,
        snapshot
      }
    );
  return Object.freeze({
    request,
    snapshot,
    validation
  });
}
/* ============================================================
   ECONOMY COMMIT
   ============================================================ */
/**
 * @section economy-commit
 *
 * Called only after execution_transaction has established commit
 * eligibility.
 */
export async function commitExecutionActionEconomy(
  context,
  {
    request = null,
    before = null
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "commitExecutionActionEconomy requires ExecutionContext."
    );
  }
  const economyRequest =
    request ??
    buildActionEconomyRequest(
      context
    );
  const snapshot =
    before ??
    await readExecutionActionEconomySnapshot(
      context
    );
  /*
   * Revalidate immediately before mutation.
   *
   * Useful against stale state or concurrent changes.
   */
  const validation =
    await validateExecutionActionEconomy(
      context,
      {
        request:
          economyRequest,
        snapshot
      }
    );
  if (!validation.valid) {
    return actionEconomyCommitFailed({
      request:
        economyRequest,
      before:
        snapshot,
      reason:
        validation
          .issues
          ?.[0]
          ?.message ??
        "Action economy became unavailable before commit.",
      metadata: {
        validation
      }
    });
  }
  const mutation =
    buildActionEconomyMutation(
      context,
      economyRequest,
      snapshot
    );
  const noMechanicalSlotSpend =
    mutation.quickDelta === 0 &&
    !mutation.consumeFull &&
    !mutation.consumeMovement &&
    !mutation.consumeProtocol &&
    !mutation.consumeReaction &&
    !mutation.markActionTaken;
  if (noMechanicalSlotSpend) {
    return actionEconomyCommitNothing({
      request:
        economyRequest,
      before:
        snapshot,
      after:
        snapshot,
      mutation
    });
  }
  const actorReference =
    getActionEconomyActorReference(
      context
    );
  if (!actorReference) {
    return actionEconomyCommitFailed({
      request:
        economyRequest,
      before:
        snapshot,
      mutation,
      reason:
        "execution-actor-unavailable"
    });
  }
  try {
    const applied =
      await applyActionEconomyMutation(
        actorReference,
        mutation,
        {
          executionId:
            context
              ?.identity
              ?.executionId ??
            null,
          activationType:
            economyRequest.activationType,
          granted:
            economyRequest.cost?.mode ===
              ACTION_ECONOMY_COST_MODE.GRANTED ||
            Boolean(
              context
                ?.flags
                ?.grantedAction
            ),
          reaction:
            economyRequest.activationType ===
              ACTION_ECONOMY_ACTIVATION.REACTION ||
            Boolean(
              context
                ?.flags
                ?.reactionExecution
            )
        }
      );
    return actionEconomyCommitSucceeded({
      request:
        economyRequest,
      before:
        applied.before,
      after:
        applied.after,
      mutation:
        applied.mutation,
      metadata: {
        patch:
          applied.patch
      }
    });
  } catch (error) {
    return actionEconomyCommitFailed({
      request:
        economyRequest,
      before:
        snapshot,
      mutation,
      reason:
        "action-economy-state-write-failed",
      error
    });
  }
}
/* ============================================================
   VALIDATION RESULT ADAPTER
   ============================================================ */
/**
 * @section validation-result-adapter
 *
 * Converts to execution_transaction validation shape.
 */
export function toExecutionTransactionValidationResult(
  actionEconomyValidation,
  {
    context = null
  } = {}
) {
  if (!actionEconomyValidation) {
    return Object.freeze({
      kind:
        "validation",
      status:
        "valid",
      valid:
        true,
      context,
      issues:
        Object.freeze([]),
      metadata:
        Object.freeze({
          actionEconomyValidation:
            null
        })
    });
  }
  return Object.freeze({
    kind:
      "validation",
    status:
      actionEconomyValidation.valid
        ? "valid"
        : "invalid",
    valid:
      Boolean(
        actionEconomyValidation.valid
      ),
    context,
    issues:
      Object.freeze(
        (
          actionEconomyValidation
            .issues ??
          []
        ).map(
          issue =>
            Object.freeze({
              code:
                `action-economy:${issue.code}`,
              message:
                issue.message,
              source:
                "action-economy",
              severity:
                "error",
              metadata:
                Object.freeze({
                  actionEconomyIssue:
                    issue
                })
            })
        )
      ),
    metadata:
      Object.freeze({
        actionEconomyValidation
      })
  });
}
/* ============================================================
   COMMIT RESULT ADAPTER
   ============================================================ */
/**
 * @section commit-result-adapter
 */
export function toExecutionTransactionCommitResult(
  economyCommit,
  {
    context = null
  } = {}
) {
  if (!economyCommit) {
    return Object.freeze({
      kind:
        "commit",
      status:
        "nothing-to-commit",
      context,
      committed:
        Object.freeze([]),
      verifiedNative:
        Object.freeze([]),
      skipped:
        Object.freeze([]),
      metadata:
        Object.freeze({
          actionEconomyCommit:
            null
        })
    });
  }
  let status;
  switch (
    economyCommit.status
  ) {
    case ACTION_ECONOMY_COMMIT_STATUS.COMMITTED:
      status =
        "committed";
      break;
    case ACTION_ECONOMY_COMMIT_STATUS.NOTHING_TO_COMMIT:
      status =
        "nothing-to-commit";
      break;
    case ACTION_ECONOMY_COMMIT_STATUS.SKIPPED:
      status =
        "skipped";
      break;
    case ACTION_ECONOMY_COMMIT_STATUS.PARTIAL:
      status =
        "partial";
      break;
    case ACTION_ECONOMY_COMMIT_STATUS.FAILED:
    default:
      status =
        "failed";
      break;
  }
  return Object.freeze({
    kind:
      "commit",
    status,
    context,
    committed:
      economyCommit.status ===
        ACTION_ECONOMY_COMMIT_STATUS.COMMITTED
        ? Object.freeze([
            economyCommit
          ])
        : Object.freeze([]),
    verifiedNative:
      Object.freeze([]),
    skipped:
      economyCommit.status ===
        ACTION_ECONOMY_COMMIT_STATUS.SKIPPED
        ? Object.freeze([
            economyCommit
          ])
        : Object.freeze([]),
    reason:
      economyCommit.reason ??
      null,
    error:
      economyCommit.error ??
      null,
    metadata:
      Object.freeze({
        actionEconomyCommit:
          economyCommit
      })
  });
}
/* ============================================================
   ECONOMY RESULT PREDICATES
   ============================================================ */
/**
 * @section economy-result-predicates
 */
export function didActionEconomyValidationSucceed(
  result
) {
  return Boolean(
    result?.valid
  );
}
export function didActionEconomyCommitSucceed(
  result
) {
  return Boolean(
    result &&
    (
      result.status ===
        ACTION_ECONOMY_COMMIT_STATUS.COMMITTED ||
      result.status ===
        ACTION_ECONOMY_COMMIT_STATUS.NOTHING_TO_COMMIT ||
      result.status ===
        ACTION_ECONOMY_COMMIT_STATUS.SKIPPED
    )
  );
}
export function didActionEconomyCommitFail(
  result
) {
  return (
    result?.status ===
    ACTION_ECONOMY_COMMIT_STATUS.FAILED
  );
}
export function wasActionEconomyCommitPartial(
  result
) {
  return (
    result?.status ===
    ACTION_ECONOMY_COMMIT_STATUS.PARTIAL
  );
}
/* ============================================================
   FREE / GRANTED ACTION SEMANTICS
   ============================================================ */
/**
 * @section free-granted-action-semantics
 *
 * Ordinary Free Action:
 *
 * no Quick/Full expenditure
 * BUT markActionTaken = true
 *
 * Therefore:
 *
 * closes Protocol window.
 *
 *
 * Granted Action:
 *
 * no ordinary slot expenditure by default
 * BUT markActionTaken = true
 *
 * Therefore:
 *
 * also closes Protocol window if somehow executed during untouched
 * turn-start.
 *
 *
 * ignoreActionCost:
 *
 * skips ordinary slot expenditure
 * BUT still marks the execution as an action.
 *
 * Protocol timing remains enforced separately.
 */
/* ============================================================
   FULL / QUICK SEMANTICS
   ============================================================ */
/**
 * @section full-quick-semantics
 *
 * Baseline state:
 *
 * quickRemaining = 2
 * fullAvailable = true
 *
 *
 * QUICK #1
 * --------
 *
 * quickRemaining:
 * 2 → 1
 *
 * fullAvailable:
 * true → false
 *
 *
 * QUICK #2
 * --------
 *
 * quickRemaining:
 * 1 → 0
 *
 * fullAvailable:
 * remains false
 *
 *
 * FULL
 * ----
 *
 * quickRemaining:
 * 2 → 0
 *
 * fullAvailable:
 * true → false
 *
 *
 * Invalid:
 *
 * Quick → Full
 * Full → Quick
 *
 * unless an explicit granted/free action mechanic creates a separate
 * action that does not consume ordinary economy.
 */
/* ============================================================
   PROTOCOL SEMANTICS
   ============================================================ */
/**
 * @section protocol-semantics
 *
 * Protocol:
 *
 * - costs no Quick/Full slot
 * - requires untouched turn start
 * - only one Protocol per turn
 * - must precede every other action
 *
 * Even:
 *
 * freeActionOverride
 * grantedAction
 * ignoreActionCost
 *
 * do NOT automatically bypass Protocol timing.
 *
 * A future explicit mechanic that allows an out-of-window Protocol should
 * introduce a dedicated timing override rather than abusing cost flags.
 */
/* ============================================================
   MOVEMENT SEMANTICS
   ============================================================ */
/**
 * @section movement-semantics
 *
 * Standard movement opportunity may be represented through:
 *
 * cost.movement = 1
 *
 * Special/forced/free movement should use appropriate override/context.
 *
 * Distance budget remains outside this module.
 */
/* ============================================================
   REACTION SEMANTICS
   ============================================================ */
/**
 * @section reaction-semantics
 *
 * Reaction request validates reactionAvailable.
 *
 * Commit consumes reaction availability.
 *
 * Trigger legality remains action-specific.
 *
 * Reaction refresh timing remains lifecycle/turn-owned.
 */
/* ============================================================
   OVERCHARGE SEMANTICS
   ============================================================ */
/**
 * @section overcharge-semantics
 *
 * Overcharge itself is not modeled as spending ordinary Quick/Full economy.
 *
 * The action it grants should execute with:
 *
 * grantedAction = true
 *
 * or an explicit economy cost override.
 *
 * Existing overcharge usage tracking remains separate.
 */
/* ============================================================
   STALE STATE SAFETY
   ============================================================ */
/**
 * @section stale-state-safety
 *
 * Action economy is validated twice conceptually:
 *
 * BEFORE execution:
 * prepareActionEconomyTransaction()
 *
 * BEFORE commit:
 * commitExecutionActionEconomy() revalidates current state
 *
 * This protects against:
 *
 * concurrent action execution
 * external turn-state mutation
 * stale UI state
 *
 * If state becomes unavailable after native execution, commit failure must
 * cause the enclosing execution transaction to preserve PARTIAL truth.
 */
/* ============================================================
   FEATURE RUNTIME BRIDGE NOTES
   ============================================================ */
/**
 * @section feature-runtime-bridge-notes
 *
 * Existing registry may only know:
 *
 * category = quick
 *
 * Future runtime augmentation may supply:
 *
 * economy: {
 *   activationType: "quick"
 * }
 *
 * or custom:
 *
 * economy: {
 *   activationType: "free",
 *   costOverride: {...}
 * }
 *
 * This file consumes ExecutionContext normalization and does not care
 * whether metadata came from:
 *
 * existing registry
 * runtime bridge
 * actor-owned feature
 * special strategy
 */
/* ============================================================
   EXECUTION TRANSACTION INTEGRATION NOTES
   ============================================================ */
/**
 * @section execution-transaction-integration-notes
 *
 * BEFORE_PRE_VALIDATE
 * -------------------
 *
 * prepareActionEconomyTransaction(context)
 *
 * retain:
 *
 * request
 * snapshot
 * validation
 *
 *
 * EXECUTE
 * -------
 *
 * native/semantic mechanic executes.
 *
 *
 * BEFORE_COMMIT
 * -------------
 *
 * commitExecutionActionEconomy(
 *   context,
 *   {
 *     request,
 *     before: snapshot
 *   }
 * )
 *
 *
 * BLOCK/CANCEL/FAIL BEFORE EXECUTION
 * ----------------------------------
 *
 * no economy commit.
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
 * Remains authoritative backing.
 *
 * This module interprets and commits economy through
 * action-economy-state.js.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Should not manually decrement Quick/Full state after action-economy hooks
 * are registered.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies:
 *
 * activation type
 * requested cost
 * cost override
 * granted action
 * free action override
 * reaction trigger
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns WHEN economy validation/commit occurs.
 *
 *
 * resource_service/
 * -----------------
 *
 * Remains separate.
 *
 * Quick/Full/Protocol/Reaction state is not a resource descriptor.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Will eventually trigger:
 *
 * initializeActionEconomyTurn()
 * endActionEconomyTurn()
 * reaction refresh
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * Supplements missing economy semantics without registry rewrite.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Action economy validation and mutation remain separate.
 *
 * INVARIANT 2
 * Existing feature_turn state remains authoritative.
 *
 * INVARIANT 3
 * Full and Quick actions share one ordinary turn action budget.
 *
 * INVARIANT 4
 * Spending one ordinary Quick makes Full unavailable.
 *
 * INVARIANT 5
 * Spending Full exhausts ordinary Quick availability.
 *
 * INVARIANT 6
 * Protocol consumes no Quick/Full slot.
 *
 * INVARIANT 7
 * Protocol timing remains enforced despite free/granted/ignore-cost flags.
 *
 * INVARIANT 8
 * Any committed action closes the Protocol window.
 *
 * INVARIANT 9
 * Granted/free actions normally consume no ordinary action slot but still
 * count as actions.
 *
 * INVARIANT 10
 * Reaction economy remains separate from reaction trigger legality.
 *
 * INVARIANT 11
 * Movement opportunity state remains separate from movement distance.
 *
 * INVARIANT 12
 * Economy state is revalidated before commit.
 *
 * INVARIANT 13
 * No economy mutation occurs on pre-execution block/cancel/failure.
 *
 * INVARIANT 14
 * Action economy remains separate from resource_service.
 *
 * INVARIANT 15
 * Existing registry entries may receive missing economy semantics through
 * feature_runtime_bridge without broad refactoring.
 */