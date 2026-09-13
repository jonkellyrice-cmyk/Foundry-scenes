/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/action_economy/action-economy-contract.js
 */
/**
 * @file
 * @path main/action_economy/action-economy-contract.js
 * @module action-economy-contract
 * @layer action-economy-contract
 * @responsibility define-stable-frame-conn-action-economy-shapes-and-rules-contracts
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - action-economy-state.js
 * - action-economy-transaction.js
 * - action-economy-hooks.js
 * - action-economy.js
 * - semantic_execution_context/*
 * - execution_transaction/*
 * - future feature_runtime_bridge/*
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - feature_turn/ remains current turn-state authority
 * - semantic_execution_context/ carries activation/economy request
 * - execution_transaction/ owns validation/commit timing
 * - future feature_runtime_bridge/ supplements existing registry entries
 *   with economy metadata missing from the current registry format
 *
 * THIS FILE OWNS:
 * - action economy activation kinds
 * - standard per-turn economy limits
 * - action cost shape
 * - economy state snapshot shape
 * - economy request shape
 * - validation result shape
 * - commit result shape
 * - protocol contract
 * - free/granted/ignored-cost semantics
 *
 * THIS FILE DOES NOT OWN:
 * - current turn-state reads
 * - action expenditure mutation
 * - transaction sequencing
 * - feature-specific action rules
 * - resource usage
 * - native Lancer Flow execution
 *
 * EDIT CONTRACT:
 * - no Foundry/Lancer imports
 * - no turn-state mutation
 * - Protocol remains distinct from ordinary Free actions
 * - Protocol is free-cost but start-of-turn-only and once-per-turn
 * - do not represent Quick/Full economy as generic resource_service state
 */
/* ============================================================
   ACTIVATION TYPE
   ============================================================ */
/**
 * @section activation-type
 *
 * Semantic action economy category.
 */
export const ACTION_ECONOMY_ACTIVATION = Object.freeze({
  MOVEMENT:
    "movement",
  QUICK:
    "quick",
  FULL:
    "full",
  FREE:
    "free",
  PROTOCOL:
    "protocol",
  REACTION:
    "reaction",
  SPECIAL:
    "special",
  NONE:
    "none"
});
/* ============================================================
   STANDARD TURN LIMITS
   ============================================================ */
/**
 * @section standard-turn-limits
 *
 * Baseline Lancer turn economy represented by Frame Conn.
 *
 * Feature-specific grants/overrides are handled separately.
 */
export const ACTION_ECONOMY_STANDARD_LIMITS = Object.freeze({
  QUICK_ACTIONS:
    2,
  FULL_ACTIONS:
    1,
  PROTOCOLS:
    1,
  STANDARD_MOVEMENTS:
    1
});
/* ============================================================
   ACTION SLOT KIND
   ============================================================ */
export const ACTION_ECONOMY_SLOT = Object.freeze({
  QUICK:
    "quick",
  FULL:
    "full",
  PROTOCOL:
    "protocol",
  MOVEMENT:
    "movement",
  REACTION:
    "reaction"
});
/* ============================================================
   ACTION COST MODE
   ============================================================ */
/**
 * @section action-cost-mode
 */
export const ACTION_ECONOMY_COST_MODE = Object.freeze({
  STANDARD:
    "standard",
  FREE:
    "free",
  GRANTED:
    "granted",
  OVERRIDE:
    "override",
  NONE:
    "none"
});
/* ============================================================
   TURN ACTIVITY PHASE
   ============================================================ */
/**
 * @section turn-activity-phase
 *
 * Used primarily to enforce Protocol timing.
 */
export const ACTION_ECONOMY_TURN_PHASE = Object.freeze({
  START:
    "start",
  ACTIVE:
    "active",
  ENDED:
    "ended"
});
/* ============================================================
   PROTOCOL CONTRACT
   ============================================================ */
/**
 * @section protocol-contract
 *
 * Protocol is a specialized Free Action with additional timing rules:
 *
 * - costs no Quick/Full action
 * - may only be taken at the start of the character's turn
 * - must occur before any other action
 * - may only be taken once per turn
 *
 * Multiple Protocol actions are therefore not legal in one turn unless a
 * future explicit rule overrides this contract.
 */
export const ACTION_ECONOMY_PROTOCOL_RULE = Object.freeze({
  ACTIVATION:
    ACTION_ECONOMY_ACTIVATION.PROTOCOL,
  COST_MODE:
    ACTION_ECONOMY_COST_MODE.FREE,
  REQUIRED_TURN_PHASE:
    ACTION_ECONOMY_TURN_PHASE.START,
  MUST_PRECEDE_OTHER_ACTIONS:
    true,
  MAX_USES_PER_TURN:
    1
});
/* ============================================================
   VALIDATION STATUS
   ============================================================ */
export const ACTION_ECONOMY_VALIDATION_STATUS = Object.freeze({
  VALID:
    "valid",
  INVALID:
    "invalid",
  SKIPPED:
    "skipped",
  FAILED:
    "failed"
});
/* ============================================================
   COMMIT STATUS
   ============================================================ */
export const ACTION_ECONOMY_COMMIT_STATUS = Object.freeze({
  COMMITTED:
    "committed",
  NOTHING_TO_COMMIT:
    "nothing-to-commit",
  SKIPPED:
    "skipped",
  PARTIAL:
    "partial",
  FAILED:
    "failed"
});
/* ============================================================
   ECONOMY FAILURE CODE
   ============================================================ */
export const ACTION_ECONOMY_FAILURE = Object.freeze({
  QUICK_UNAVAILABLE:
    "quick-unavailable",
  FULL_UNAVAILABLE:
    "full-unavailable",
  MOVEMENT_UNAVAILABLE:
    "movement-unavailable",
  REACTION_UNAVAILABLE:
    "reaction-unavailable",
  PROTOCOL_ALREADY_USED:
    "protocol-already-used",
  PROTOCOL_NOT_AT_TURN_START:
    "protocol-not-at-turn-start",
  PROTOCOL_AFTER_OTHER_ACTION:
    "protocol-after-other-action",
  TURN_ENDED:
    "turn-ended",
  INVALID_COST:
    "invalid-cost",
  INVALID_STATE:
    "invalid-state"
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
function finiteNumber(value) {
  return Number.isFinite(value);
}
function optionalNumber(value) {
  return (
    value == null ||
    finiteNumber(value)
  );
}
function isEnumValue(
  enumeration,
  value
) {
  return Object
    .values(enumeration)
    .includes(value);
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
/* ============================================================
   ACTION COST
   ============================================================ */
/**
 * @section action-cost
 *
 * Canonical economy cost.
 *
 * Full action normally consumes the Full slot rather than manually
 * subtracting two Quick slots.
 *
 * Conversion semantics belong in action-economy-transaction.js.
 */
export function createActionEconomyCost({
  mode =
    ACTION_ECONOMY_COST_MODE.STANDARD,
  quick = 0,
  full = 0,
  protocol = 0,
  movement = 0,
  reaction = 0,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTION_ECONOMY_COST_MODE,
      mode
    )
  ) {
    throw new TypeError(
      `Invalid action economy cost mode: ${String(mode)}`
    );
  }
  for (
    const [
      label,
      value
    ] of
      Object.entries({
        quick,
        full,
        protocol,
        movement,
        reaction
      })
  ) {
    if (
      !finiteNumber(value) ||
      value < 0
    ) {
      throw new TypeError(
        `Action economy ${label} cost must be a non-negative number.`
      );
    }
  }
  return Object.freeze({
    mode,
    quick,
    full,
    protocol,
    movement,
    reaction,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   STANDARD COST HELPERS
   ============================================================ */
export function createQuickActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    quick:
      1
  });
}
export function createFullActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    full:
      1
  });
}
export function createFreeActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    mode:
      ACTION_ECONOMY_COST_MODE.FREE
  });
}
export function createProtocolActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    mode:
      ACTION_ECONOMY_COST_MODE.FREE,
    protocol:
      1
  });
}
export function createMovementActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    movement:
      1
  });
}
export function createReactionActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    reaction:
      1
  });
}
export function createGrantedActionCost(
  options = {}
) {
  return createActionEconomyCost({
    ...options,
    mode:
      ACTION_ECONOMY_COST_MODE.GRANTED
  });
}
/* ============================================================
   ECONOMY STATE SNAPSHOT
   ============================================================ */
/**
 * @section economy-state-snapshot
 *
 * Normalized view over existing feature_turn/ state.
 *
 * action-economy-state.js will construct this.
 */
export function createActionEconomySnapshot({
  actorUuid = null,
  turnId = null,
  round = null,
  turnPhase =
    ACTION_ECONOMY_TURN_PHASE.START,
  quickRemaining =
    ACTION_ECONOMY_STANDARD_LIMITS.QUICK_ACTIONS,
  fullAvailable =
    true,
  movementAvailable =
    true,
  protocolUsed =
    false,
  reactionAvailable =
    true,
  anyActionTaken =
    false,
  actionCount =
    0,
  actionsTaken = [],
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTION_ECONOMY_TURN_PHASE,
      turnPhase
    )
  ) {
    throw new TypeError(
      `Invalid action economy turn phase: ${String(turnPhase)}`
    );
  }
  if (
    !finiteNumber(quickRemaining) ||
    quickRemaining < 0
  ) {
    throw new TypeError(
      "quickRemaining must be a non-negative number."
    );
  }
  if (
    !finiteNumber(actionCount) ||
    actionCount < 0
  ) {
    throw new TypeError(
      "actionCount must be a non-negative number."
    );
  }
  return Object.freeze({
    actorUuid,
    turnId,
    round,
    turnPhase,
    quickRemaining,
    fullAvailable:
      Boolean(fullAvailable),
    movementAvailable:
      Boolean(
        movementAvailable
      ),
    protocolUsed:
      Boolean(protocolUsed),
    reactionAvailable:
      Boolean(
        reactionAvailable
      ),
    anyActionTaken:
      Boolean(
        anyActionTaken
      ),
    actionCount,
    actionsTaken:
      freezeArray(
        actionsTaken
      ),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   ECONOMY REQUEST
   ============================================================ */
/**
 * @section economy-request
 *
 * One attempted execution's economy semantics.
 */
export function createActionEconomyRequest({
  activationType =
    ACTION_ECONOMY_ACTIVATION.NONE,
  cost = null,
  grantedByExecutionId = null,
  freeActionOverride = false,
  ignoreActionCost = false,
  reactionTrigger = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTION_ECONOMY_ACTIVATION,
      activationType
    )
  ) {
    throw new TypeError(
      `Invalid action economy activation: ${String(activationType)}`
    );
  }
  return Object.freeze({
    activationType,
    cost:
      cost ??
      inferStandardActionEconomyCost(
        activationType
      ),
    grantedByExecutionId,
    freeActionOverride:
      Boolean(
        freeActionOverride
      ),
    ignoreActionCost:
      Boolean(
        ignoreActionCost
      ),
    reactionTrigger,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   STANDARD COST INFERENCE
   ============================================================ */
/**
 * @section standard-cost-inference
 */
export function inferStandardActionEconomyCost(
  activationType
) {
  switch (
    activationType
  ) {
    case ACTION_ECONOMY_ACTIVATION.QUICK:
      return createQuickActionCost();
    case ACTION_ECONOMY_ACTIVATION.FULL:
      return createFullActionCost();
    case ACTION_ECONOMY_ACTIVATION.PROTOCOL:
      return createProtocolActionCost();
    case ACTION_ECONOMY_ACTIVATION.REACTION:
      return createReactionActionCost();
    case ACTION_ECONOMY_ACTIVATION.MOVEMENT:
      return createMovementActionCost();
    case ACTION_ECONOMY_ACTIVATION.FREE:
    case ACTION_ECONOMY_ACTIVATION.SPECIAL:
    case ACTION_ECONOMY_ACTIVATION.NONE:
    default:
      return createFreeActionCost();
  }
}
/* ============================================================
   ECONOMY VALIDATION ISSUE
   ============================================================ */
export function createActionEconomyValidationIssue({
  code,
  message = null,
  expected = null,
  actual = null,
  metadata = {}
} = {}) {
  if (!requiredString(code)) {
    throw new TypeError(
      "Action economy validation issue requires code."
    );
  }
  return Object.freeze({
    code,
    message:
      message ??
      code,
    expected,
    actual,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   ECONOMY VALIDATION RESULT
   ============================================================ */
export function createActionEconomyValidationResult({
  status =
    ACTION_ECONOMY_VALIDATION_STATUS.VALID,
  request,
  snapshot,
  issues = [],
  metadata = {}
} = {}) {
  if (!request) {
    throw new TypeError(
      "Action economy validation result requires request."
    );
  }
  if (!snapshot) {
    throw new TypeError(
      "Action economy validation result requires snapshot."
    );
  }
  if (
    !isEnumValue(
      ACTION_ECONOMY_VALIDATION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid action economy validation status: ${String(status)}`
    );
  }
  return Object.freeze({
    status,
    valid:
      status ===
      ACTION_ECONOMY_VALIDATION_STATUS.VALID,
    request,
    snapshot,
    issues:
      freezeArray(issues),
    metadata:
      freezeObject(metadata)
  });
}
export function actionEconomyValidationSucceeded(
  options
) {
  return createActionEconomyValidationResult({
    ...options,
    status:
      ACTION_ECONOMY_VALIDATION_STATUS.VALID
  });
}
export function actionEconomyValidationFailed(
  options
) {
  return createActionEconomyValidationResult({
    ...options,
    status:
      ACTION_ECONOMY_VALIDATION_STATUS.INVALID
  });
}
export function actionEconomyValidationSkipped(
  options
) {
  return createActionEconomyValidationResult({
    ...options,
    status:
      ACTION_ECONOMY_VALIDATION_STATUS.SKIPPED
  });
}
/* ============================================================
   ECONOMY MUTATION
   ============================================================ */
/**
 * @section economy-mutation
 *
 * Describes the turn-state changes to commit.
 *
 * action-economy-state.js / transaction.js will apply them to existing
 * Frame Conn turn state.
 */
export function createActionEconomyMutation({
  quickDelta = 0,
  consumeFull = false,
  consumeMovement = false,
  consumeProtocol = false,
  consumeReaction = false,
  markActionTaken = true,
  actionId = null,
  metadata = {}
} = {}) {
  if (!finiteNumber(quickDelta)) {
    throw new TypeError(
      "Action economy quickDelta must be finite."
    );
  }
  return Object.freeze({
    quickDelta,
    consumeFull:
      Boolean(consumeFull),
    consumeMovement:
      Boolean(
        consumeMovement
      ),
    consumeProtocol:
      Boolean(
        consumeProtocol
      ),
    consumeReaction:
      Boolean(
        consumeReaction
      ),
    markActionTaken:
      Boolean(
        markActionTaken
      ),
    actionId,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   ECONOMY COMMIT RESULT
   ============================================================ */
export function createActionEconomyCommitResult({
  status =
    ACTION_ECONOMY_COMMIT_STATUS.COMMITTED,
  request = null,
  before = null,
  after = null,
  mutation = null,
  reason = null,
  error = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTION_ECONOMY_COMMIT_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid action economy commit status: ${String(status)}`
    );
  }
  return Object.freeze({
    status,
    request,
    before,
    after,
    mutation,
    reason,
    error,
    metadata:
      freezeObject(metadata)
  });
}
export function actionEconomyCommitSucceeded(
  options = {}
) {
  return createActionEconomyCommitResult({
    ...options,
    status:
      ACTION_ECONOMY_COMMIT_STATUS.COMMITTED
  });
}
export function actionEconomyCommitNothing(
  options = {}
) {
  return createActionEconomyCommitResult({
    ...options,
    status:
      ACTION_ECONOMY_COMMIT_STATUS.NOTHING_TO_COMMIT
  });
}
export function actionEconomyCommitSkipped(
  options = {}
) {
  return createActionEconomyCommitResult({
    ...options,
    status:
      ACTION_ECONOMY_COMMIT_STATUS.SKIPPED
  });
}
export function actionEconomyCommitPartial(
  options = {}
) {
  return createActionEconomyCommitResult({
    ...options,
    status:
      ACTION_ECONOMY_COMMIT_STATUS.PARTIAL
  });
}
export function actionEconomyCommitFailed(
  options = {}
) {
  return createActionEconomyCommitResult({
    ...options,
    status:
      ACTION_ECONOMY_COMMIT_STATUS.FAILED
  });
}
/* ============================================================
   PROTOCOL VALIDATION
   ============================================================ */
/**
 * @section protocol-validation
 *
 * Generic Protocol timing check.
 */
export function validateProtocolEconomy(
  snapshot
) {
  const issues = [];
  if (
    snapshot.turnPhase !==
    ACTION_ECONOMY_TURN_PHASE.START
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.PROTOCOL_NOT_AT_TURN_START,
        message:
          "Protocol actions may only be taken at the start of the turn.",
        expected:
          ACTION_ECONOMY_TURN_PHASE.START,
        actual:
          snapshot.turnPhase
      })
    );
  }
  if (
    snapshot.protocolUsed
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.PROTOCOL_ALREADY_USED,
        message:
          "Only one Protocol may be taken per turn."
      })
    );
  }
  if (
    snapshot.anyActionTaken ||
    snapshot.actionCount > 0
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.PROTOCOL_AFTER_OTHER_ACTION,
        message:
          "Protocol actions must be taken before any other action on the turn."
      })
    );
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
   STANDARD ECONOMY VALIDATION
   ============================================================ */
/**
 * @section standard-economy-validation
 *
 * Generic baseline validation only.
 *
 * Special conversion/granted-action behavior belongs in
 * action-economy-transaction.js.
 */
export function validateStandardActionEconomy(
  request,
  snapshot
) {
  if (!request) {
    throw new TypeError(
      "validateStandardActionEconomy requires request."
    );
  }
  if (!snapshot) {
    throw new TypeError(
      "validateStandardActionEconomy requires snapshot."
    );
  }
  if (
    request.ignoreActionCost ||
    request.freeActionOverride ||
    request.cost?.mode ===
      ACTION_ECONOMY_COST_MODE.GRANTED ||
    request.cost?.mode ===
      ACTION_ECONOMY_COST_MODE.NONE
  ) {
    return actionEconomyValidationSucceeded({
      request,
      snapshot,
      metadata: {
        bypassed:
          true
      }
    });
  }
  if (
    snapshot.turnPhase ===
    ACTION_ECONOMY_TURN_PHASE.ENDED
  ) {
    return actionEconomyValidationFailed({
      request,
      snapshot,
      issues: [
        createActionEconomyValidationIssue({
          code:
            ACTION_ECONOMY_FAILURE.TURN_ENDED,
          message:
            "The actor's turn has ended."
        })
      ]
    });
  }
  if (
    request.activationType ===
    ACTION_ECONOMY_ACTIVATION.PROTOCOL
  ) {
    const protocol =
      validateProtocolEconomy(
        snapshot
      );
    return protocol.valid
      ? actionEconomyValidationSucceeded({
          request,
          snapshot
        })
      : actionEconomyValidationFailed({
          request,
          snapshot,
          issues:
            protocol.issues
        });
  }
  const issues = [];
  if (
    request.cost?.quick > 0 &&
    snapshot.quickRemaining <
      request.cost.quick
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.QUICK_UNAVAILABLE,
        message:
          "Insufficient Quick Actions remaining.",
        expected:
          request.cost.quick,
        actual:
          snapshot.quickRemaining
      })
    );
  }
  if (
    request.cost?.full > 0 &&
    !snapshot.fullAvailable
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.FULL_UNAVAILABLE,
        message:
          "Full Action is unavailable."
      })
    );
  }
  if (
    request.cost?.movement > 0 &&
    !snapshot.movementAvailable
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.MOVEMENT_UNAVAILABLE,
        message:
          "Standard movement is unavailable."
      })
    );
  }
  if (
    request.cost?.reaction > 0 &&
    !snapshot.reactionAvailable
  ) {
    issues.push(
      createActionEconomyValidationIssue({
        code:
          ACTION_ECONOMY_FAILURE.REACTION_UNAVAILABLE,
        message:
          "Reaction is unavailable."
      })
    );
  }
  return issues.length === 0
    ? actionEconomyValidationSucceeded({
        request,
        snapshot
      })
    : actionEconomyValidationFailed({
        request,
        snapshot,
        issues
      });
}
/* ============================================================
   STANDARD MUTATION INFERENCE
   ============================================================ */
/**
 * @section standard-mutation-inference
 */
export function inferActionEconomyMutation(
  request,
  {
    actionId = null
  } = {}
) {
  if (!request) {
    throw new TypeError(
      "inferActionEconomyMutation requires request."
    );
  }
  if (
    request.ignoreActionCost ||
    request.freeActionOverride ||
    request.cost?.mode ===
      ACTION_ECONOMY_COST_MODE.GRANTED ||
    request.cost?.mode ===
      ACTION_ECONOMY_COST_MODE.NONE
  ) {
    return createActionEconomyMutation({
      markActionTaken:
        request.activationType !==
          ACTION_ECONOMY_ACTIVATION.PROTOCOL,
      actionId
    });
  }
  return createActionEconomyMutation({
    quickDelta:
      -(
        request
          .cost
          ?.quick ??
        0
      ),
    consumeFull:
      (
        request
          .cost
          ?.full ??
        0
      ) > 0,
    consumeMovement:
      (
        request
          .cost
          ?.movement ??
        0
      ) > 0,
    consumeProtocol:
      request.activationType ===
        ACTION_ECONOMY_ACTIVATION.PROTOCOL ||
      (
        request
          .cost
          ?.protocol ??
        0
      ) > 0,
    consumeReaction:
      (
        request
          .cost
          ?.reaction ??
        0
      ) > 0,
    /*
     * Protocol itself must not make itself illegal before it is committed.
     * Once committed, the turn is no longer at untouched start state.
     */
    markActionTaken:
      true,
    actionId
  });
}
/* ============================================================
   PROTOCOL STATE TRANSITION NOTES
   ============================================================ */
/**
 * @section protocol-state-transition-notes
 *
 * Before Protocol:
 *
 * turnPhase = START
 * protocolUsed = false
 * anyActionTaken = false
 * actionCount = 0
 *
 * After Protocol commit:
 *
 * protocolUsed = true
 * anyActionTaken = true
 * actionCount += 1
 *
 * turnPhase should transition to ACTIVE because the untouched start-of-turn
 * window has now closed.
 *
 * action-economy-state.js owns the actual state transition.
 */
/* ============================================================
   FREE ACTION NOTES
   ============================================================ */
/**
 * @section free-action-notes
 *
 * Ordinary Free Actions:
 *
 * - consume no Quick/Full slot
 * - still count as having taken an action
 * - therefore close the Protocol timing window
 *
 * This is why Protocol cannot simply be represented as an ordinary Free
 * Action.
 */
/* ============================================================
   FULL / QUICK NOTES
   ============================================================ */
/**
 * @section full-quick-notes
 *
 * Existing Frame Conn turn state currently models:
 *
 * quick actions remaining
 * full action available
 *
 * action-economy-state.js should adapt to that existing structure rather
 * than introducing parallel authoritative counters.
 *
 * Exact Full ↔ Quick conversion behavior should be implemented in
 * action-economy-transaction.js against the existing turn-state semantics.
 */
/* ============================================================
   REACTION NOTES
   ============================================================ */
/**
 * @section reaction-notes
 *
 * This contract only represents Reaction availability/cost.
 *
 * Reaction trigger legality and reset timing belong to:
 *
 * action-economy-state.js
 * lifecycle/turn integration
 * action-specific strategy rules
 */
/* ============================================================
   GRANTED ACTION NOTES
   ============================================================ */
/**
 * @section granted-action-notes
 *
 * Granted Action:
 *
 * cost mode = GRANTED
 *
 * It does not consume ordinary Quick/Full economy unless its source rule
 * explicitly says otherwise.
 *
 * It still counts as an action for Protocol timing once executed.
 */
/* ============================================================
   EXECUTION CONTEXT BRIDGE NOTES
   ============================================================ */
/**
 * @section execution-context-bridge-notes
 *
 * semantic_execution_context currently carries:
 *
 * context.economy.activationType
 * context.economy.requestedCost
 * context.economy.costOverride
 * context.economy.grantedByExecutionId
 * context.economy.reactionTrigger
 *
 * and flags:
 *
 * freeActionOverride
 * ignoreActionCost
 * grantedAction
 * reactionExecution
 *
 * action-economy-state/transaction should normalize those fields into:
 *
 * ActionEconomyRequest
 *
 * Do not refactor ExecutionContext merely to mirror this contract.
 */
/* ============================================================
   FEATURE RUNTIME BRIDGE NOTES
   ============================================================ */
/**
 * @section feature-runtime-bridge-notes
 *
 * Future feature_runtime_bridge/ may supplement existing registry entries:
 *
 * {
 *   economy: {
 *     activationType: "quick"
 *   }
 * }
 *
 * or:
 *
 * {
 *   economy: {
 *     activationType: "protocol"
 *   }
 * }
 *
 * Existing registry entries therefore do not need wholesale refactoring.
 */
/* ============================================================
   EXECUTION TRANSACTION NOTES
   ============================================================ */
/**
 * @section execution-transaction-notes
 *
 * Expected:
 *
 * BEFORE_PRE_VALIDATE
 * → read existing turn state
 * → build ActionEconomySnapshot
 * → build ActionEconomyRequest
 * → validate
 *
 * execute
 * → native/semantic mechanic
 *
 * BEFORE_COMMIT
 * → commit inferred economy mutation
 *
 * block/cancel/failure before execution
 * → no economy expenditure
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
 * Remains authoritative turn-state backing.
 *
 * action_economy/ is an adapter/service over that state, not a replacement.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Should eventually receive action economy behavior automatically through
 * execution transaction hooks.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Carries economy request semantics into the transaction.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns validation/commit timing.
 *
 *
 * resource_service/
 * -----------------
 *
 * Separate concern.
 *
 * Quick/Full/Protocol slots must not be represented as generic resources.
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * Supplies missing economy metadata for existing registry entries.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * action-economy-contract.js contains no turn-state mutation.
 *
 * INVARIANT 2
 * Existing feature_turn/ state remains authoritative.
 *
 * INVARIANT 3
 * Protocol is distinct from ordinary Free Action.
 *
 * INVARIANT 4
 * Protocol consumes no Quick/Full action.
 *
 * INVARIANT 5
 * Protocol may only occur at untouched turn start.
 *
 * INVARIANT 6
 * Protocol may only occur once per turn.
 *
 * INVARIANT 7
 * Any ordinary action closes the Protocol timing window.
 *
 * INVARIANT 8
 * A successfully committed Protocol also closes the Protocol timing window.
 *
 * INVARIANT 9
 * Ordinary Free Actions still count as actions for Protocol timing.
 *
 * INVARIANT 10
 * Granted/free-cost actions do not consume ordinary action slots unless an
 * explicit source rule says otherwise.
 *
 * INVARIANT 11
 * Action economy validation is separate from expenditure.
 *
 * INVARIANT 12
 * Economy expenditure should occur only through transaction commit timing.
 *
 * INVARIANT 13
 * Action economy remains separate from resource_service.
 *
 * INVARIANT 14
 * Existing registry definitions may be supplemented through
 * feature_runtime_bridge without broad refactoring.
 */