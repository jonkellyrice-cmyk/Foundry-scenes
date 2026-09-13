/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/action_economy/action-economy-state.js
 */
/**
 * @file
 * @path main/action_economy/action-economy-state.js
 * @module action-economy-state
 * @layer action-economy-state-adapter
 * @responsibility normalize-read-and-mutate-existing-frame-conn-turn-economy-state
 * @public-boundary false
 * @side-effects delegated-turn-state-mutation
 *
 * @depends-on
 * - action-economy-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - adapts existing feature_turn/ state
 * - does not replace existing turn-state storage
 * - consumed by action-economy-transaction.js
 * - consumed indirectly by action-economy-hooks.js
 * - future frame-conn-runtime composition injects existing turn-state
 *   reader/writer functions
 *
 * EXISTING FRAME CONN TURN STATE:
 * - quick actions remaining
 * - full action available
 * - overcharge usage
 * - movement state
 * - turn-local action state
 *
 * THIS FILE OWNS:
 * - normalization of existing Frame Conn turn state
 * - ActionEconomySnapshot construction
 * - economy-state read adapter
 * - economy-state mutation adapter
 * - protocol timing state
 * - action history needed for protocol timing
 * - reaction availability normalization
 *
 * THIS FILE DOES NOT OWN:
 * - authoritative turn storage
 * - action-economy validation rules
 * - execution transaction timing
 * - resources
 * - native Lancer action execution
 * - reaction trigger legality
 * - lifecycle scheduling
 *
 * EDIT CONTRACT:
 * - feature_turn/ remains authoritative
 * - no parallel turn-state repository
 * - all reads/writes pass through injected adapter
 * - Protocol state must survive for the duration of the current turn
 * - ordinary Free actions close the Protocol window
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  ACTION_ECONOMY_STANDARD_LIMITS,
  ACTION_ECONOMY_TURN_PHASE,
  createActionEconomySnapshot
} from "./action-economy-contract.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const ACTION_ECONOMY_STATE_MODULE_ID =
  "lancer-frame-conn.action-economy-state";
export const ACTION_ECONOMY_STATE_MODULE_VERSION =
  1;
/* ============================================================
   TURN STATE ADAPTER
   ============================================================ */
/**
 * @section turn-state-adapter
 *
 * Existing Frame Conn feature_turn/ storage is injected here.
 *
 * Required interface:
 *
 * {
 *   read(actorReference) => object | null
 *
 *   write(actorReference, patch, options?) =>
 *     object | null | Promise<object | null>
 * }
 *
 * Optional:
 *
 * {
 *   reset(actorReference, options?)
 *   getTurnId(actorReference)
 *   getRound(actorReference)
 * }
 *
 * This keeps action_economy independent from the concrete existing
 * feature_turn implementation.
 */
let turnStateAdapter =
  null;
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
function requiredFunction(
  value,
  label
) {
  if (
    typeof value !==
    "function"
  ) {
    throw new TypeError(
      `${label} must be a function.`
    );
  }
  return value;
}
function finiteNumber(value) {
  return Number.isFinite(value);
}
function nonNegativeNumber(
  value,
  fallback = 0
) {
  return finiteNumber(value)
    ? Math.max(
        0,
        value
      )
    : fallback;
}
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
/* ============================================================
   TURN STATE ADAPTER CONFIGURATION
   ============================================================ */
/**
 * @section turn-state-adapter-configuration
 */
export function setActionEconomyTurnStateAdapter(
  adapter
) {
  if (adapter == null) {
    turnStateAdapter =
      null;
    return true;
  }
  if (!isObject(adapter)) {
    throw new TypeError(
      "Action economy turn-state adapter must be object or null."
    );
  }
  requiredFunction(
    adapter.read,
    "Turn-state adapter read"
  );
  requiredFunction(
    adapter.write,
    "Turn-state adapter write"
  );
  turnStateAdapter =
    adapter;
  return true;
}
export function getActionEconomyTurnStateAdapter() {
  return turnStateAdapter;
}
export function hasActionEconomyTurnStateAdapter() {
  return Boolean(
    turnStateAdapter &&
    typeof turnStateAdapter.read ===
      "function" &&
    typeof turnStateAdapter.write ===
      "function"
  );
}
export function assertActionEconomyTurnStateAdapter() {
  if (!hasActionEconomyTurnStateAdapter()) {
    throw new Error(
      "Action economy requires the existing Frame Conn turn-state adapter."
    );
  }
  return turnStateAdapter;
}
/* ============================================================
   ACTOR IDENTITY
   ============================================================ */
/**
 * @section actor-identity
 */
function getActorUuid(
  actorReference,
  rawState = null
) {
  return (
    actorReference?.uuid ??
    actorReference?.actorUuid ??
    rawState?.actorUuid ??
    rawState?.actor?.uuid ??
    null
  );
}
/* ============================================================
   EXISTING TURN STATE FIELD NORMALIZATION
   ============================================================ */
/**
 * @section existing-turn-state-field-normalization
 *
 * This intentionally accepts several migration-era aliases.
 *
 * The existing feature_turn state should gradually converge, but action
 * economy should not force a disruptive rewrite.
 */
function readQuickRemaining(
  state
) {
  const value =
    state?.quickRemaining ??
    state?.quick_actions_remaining ??
    state?.quickActionsRemaining ??
    state?.quickActions ??
    state?.quick_actions ??
    state?.actions?.quick?.remaining ??
    state?.economy?.quickRemaining ??
    null;
  return nonNegativeNumber(
    value,
    ACTION_ECONOMY_STANDARD_LIMITS
      .QUICK_ACTIONS
  );
}
function readFullAvailable(
  state
) {
  const value =
    state?.fullAvailable ??
    state?.full_action_available ??
    state?.fullActionAvailable ??
    state?.actions?.full?.available ??
    state?.economy?.fullAvailable ??
    null;
  return value == null
    ? true
    : Boolean(value);
}
function readMovementAvailable(
  state
) {
  const explicit =
    state?.movementAvailable ??
    state?.movement_available ??
    state?.actions?.movement?.available ??
    state?.economy?.movementAvailable ??
    null;
  if (explicit != null) {
    return Boolean(explicit);
  }
  /*
   * Existing Frame Conn movement state may track maximum/spent/remaining.
   *
   * Standard movement is considered available until the authoritative
   * turn-state layer says otherwise.
   *
   * Movement distance expenditure itself remains owned by feature_movement/.
   */
  return true;
}
function readProtocolUsed(
  state
) {
  return Boolean(
    state?.protocolUsed ??
    state?.protocol_used ??
    state?.actions?.protocol?.used ??
    state?.economy?.protocolUsed ??
    false
  );
}
function readReactionAvailable(
  state
) {
  const value =
    state?.reactionAvailable ??
    state?.reaction_available ??
    state?.actions?.reaction?.available ??
    state?.economy?.reactionAvailable ??
    null;
  return value == null
    ? true
    : Boolean(value);
}
function readActionCount(
  state
) {
  const value =
    state?.actionCount ??
    state?.action_count ??
    state?.actionsTakenCount ??
    state?.economy?.actionCount ??
    null;
  if (finiteNumber(value)) {
    return Math.max(
      0,
      value
    );
  }
  const actions =
    readActionsTaken(
      state
    );
  return actions.length;
}
function readActionsTaken(
  state
) {
  const value =
    state?.actionsTaken ??
    state?.actions_taken ??
    state?.actionHistory ??
    state?.action_history ??
    state?.economy?.actionsTaken ??
    [];
  return freezeArray(
    value
  );
}
function readAnyActionTaken(
  state
) {
  const explicit =
    state?.anyActionTaken ??
    state?.any_action_taken ??
    state?.economy?.anyActionTaken ??
    null;
  if (explicit != null) {
    return Boolean(explicit);
  }
  return (
    readActionCount(
      state
    ) > 0
  );
}
/* ============================================================
   TURN PHASE NORMALIZATION
   ============================================================ */
/**
 * @section turn-phase-normalization
 *
 * Protocol timing depends on this.
 *
 * START:
 * no action has been taken yet and Protocol window remains open.
 *
 * ACTIVE:
 * at least one action has been committed, including a Protocol.
 *
 * ENDED:
 * authoritative turn state says the actor's turn has ended.
 */
function readTurnEnded(
  state
) {
  return Boolean(
    state?.turnEnded ??
    state?.turn_ended ??
    state?.ended ??
    state?.isEnded ??
    state?.economy?.turnEnded ??
    false
  );
}
function inferTurnPhase(
  state
) {
  const explicit =
    state?.turnPhase ??
    state?.turn_phase ??
    state?.economy?.turnPhase ??
    null;
  if (
    explicit ===
      ACTION_ECONOMY_TURN_PHASE.START ||
    explicit ===
      ACTION_ECONOMY_TURN_PHASE.ACTIVE ||
    explicit ===
      ACTION_ECONOMY_TURN_PHASE.ENDED
  ) {
    return explicit;
  }
  if (
    readTurnEnded(
      state
    )
  ) {
    return ACTION_ECONOMY_TURN_PHASE.ENDED;
  }
  if (
    readProtocolUsed(
      state
    ) ||
    readAnyActionTaken(
      state
    )
  ) {
    return ACTION_ECONOMY_TURN_PHASE.ACTIVE;
  }
  return ACTION_ECONOMY_TURN_PHASE.START;
}
/* ============================================================
   TURN ID / ROUND NORMALIZATION
   ============================================================ */
async function resolveTurnId(
  actorReference,
  state
) {
  if (
    typeof turnStateAdapter
      ?.getTurnId ===
    "function"
  ) {
    return turnStateAdapter
      .getTurnId(
        actorReference
      );
  }
  return (
    state?.turnId ??
    state?.turn_id ??
    state?.combatTurnId ??
    null
  );
}
async function resolveRound(
  actorReference,
  state
) {
  if (
    typeof turnStateAdapter
      ?.getRound ===
    "function"
  ) {
    return turnStateAdapter
      .getRound(
        actorReference
      );
  }
  return (
    state?.round ??
    state?.combatRound ??
    null
  );
}
/* ============================================================
   RAW TURN STATE READ
   ============================================================ */
/**
 * @section raw-turn-state-read
 */
export async function readRawActionEconomyTurnState(
  actorReference
) {
  const adapter =
    assertActionEconomyTurnStateAdapter();
  return adapter.read(
    actorReference
  );
}
/* ============================================================
   NORMALIZED ECONOMY SNAPSHOT
   ============================================================ */
/**
 * @section normalized-economy-snapshot
 *
 * Main read entry.
 */
export async function readActionEconomySnapshot(
  actorReference
) {
  const state =
    await readRawActionEconomyTurnState(
      actorReference
    );
  if (!state) {
    /*
     * Existing turn state may not yet exist for a newly-entered actor.
     *
     * Normalize baseline state without persisting it automatically.
     */
    return createActionEconomySnapshot({
      actorUuid:
        getActorUuid(
          actorReference
        ),
      turnPhase:
        ACTION_ECONOMY_TURN_PHASE.START,
      quickRemaining:
        ACTION_ECONOMY_STANDARD_LIMITS
          .QUICK_ACTIONS,
      fullAvailable:
        true,
      movementAvailable:
        true,
      protocolUsed:
        false,
      reactionAvailable:
        true,
      anyActionTaken:
        false,
      actionCount:
        0,
      actionsTaken:
        []
    });
  }
  return createActionEconomySnapshot({
    actorUuid:
      getActorUuid(
        actorReference,
        state
      ),
    turnId:
      await resolveTurnId(
        actorReference,
        state
      ),
    round:
      await resolveRound(
        actorReference,
        state
      ),
    turnPhase:
      inferTurnPhase(
        state
      ),
    quickRemaining:
      readQuickRemaining(
        state
      ),
    fullAvailable:
      readFullAvailable(
        state
      ),
    movementAvailable:
      readMovementAvailable(
        state
      ),
    protocolUsed:
      readProtocolUsed(
        state
      ),
    reactionAvailable:
      readReactionAvailable(
        state
      ),
    anyActionTaken:
      readAnyActionTaken(
        state
      ),
    actionCount:
      readActionCount(
        state
      ),
    actionsTaken:
      readActionsTaken(
        state
      ),
    metadata: {
      rawState:
        state
    }
  });
}
/* ============================================================
   TURN STATE PATCH
   ============================================================ */
/**
 * @section turn-state-patch
 *
 * All mutation goes back into existing feature_turn storage.
 */
export async function patchActionEconomyTurnState(
  actorReference,
  patch,
  options = {}
) {
  if (!isObject(patch)) {
    throw new TypeError(
      "Action economy turn-state patch must be object."
    );
  }
  const adapter =
    assertActionEconomyTurnStateAdapter();
  return adapter.write(
    actorReference,
    patch,
    options
  );
}
/* ============================================================
   CANONICAL WRITE PATCH
   ============================================================ */
/**
 * @section canonical-write-patch
 *
 * action-economy-state writes one canonical field shape.
 *
 * Adapter implementation is responsible for translating these fields into
 * the actual existing feature_turn storage shape if needed.
 *
 * This prevents feature_turn aliases from leaking upward.
 */
export function createCanonicalActionEconomyStatePatch({
  quickRemaining = undefined,
  fullAvailable = undefined,
  movementAvailable = undefined,
  protocolUsed = undefined,
  reactionAvailable = undefined,
  turnPhase = undefined,
  anyActionTaken = undefined,
  actionCount = undefined,
  actionsTaken = undefined,
  metadata = {}
} = {}) {
  const patch = {};
  if (
    quickRemaining !==
    undefined
  ) {
    patch.quickRemaining =
      nonNegativeNumber(
        quickRemaining
      );
  }
  if (
    fullAvailable !==
    undefined
  ) {
    patch.fullAvailable =
      Boolean(fullAvailable);
  }
  if (
    movementAvailable !==
    undefined
  ) {
    patch.movementAvailable =
      Boolean(
        movementAvailable
      );
  }
  if (
    protocolUsed !==
    undefined
  ) {
    patch.protocolUsed =
      Boolean(protocolUsed);
  }
  if (
    reactionAvailable !==
    undefined
  ) {
    patch.reactionAvailable =
      Boolean(
        reactionAvailable
      );
  }
  if (
    turnPhase !==
    undefined
  ) {
    patch.turnPhase =
      turnPhase;
  }
  if (
    anyActionTaken !==
    undefined
  ) {
    patch.anyActionTaken =
      Boolean(
        anyActionTaken
      );
  }
  if (
    actionCount !==
    undefined
  ) {
    patch.actionCount =
      Math.max(
        0,
        Number(
          actionCount
        ) || 0
      );
  }
  if (
    actionsTaken !==
    undefined
  ) {
    patch.actionsTaken =
      [
        ...actionsTaken
      ];
  }
  patch.actionEconomyMetadata =
    {
      ...metadata
    };
  return Object.freeze(
    patch
  );
}
/* ============================================================
   ACTION HISTORY ENTRY
   ============================================================ */
/**
 * @section action-history-entry
 *
 * Needed primarily for:
 *
 * - Protocol timing
 * - diagnostics
 * - future once-per-turn semantic checks
 *
 * This is not a replacement for semantic_event_bus.
 */
export function createActionEconomyHistoryEntry({
  executionId = null,
  actionId = null,
  activationType = null,
  granted = false,
  reaction = false,
  protocol = false,
  timestamp =
    Date.now(),
  metadata = {}
} = {}) {
  return Object.freeze({
    executionId,
    actionId,
    activationType,
    granted:
      Boolean(granted),
    reaction:
      Boolean(reaction),
    protocol:
      Boolean(protocol),
    timestamp,
    metadata:
      Object.freeze({
        ...metadata
      })
  });
}
/* ============================================================
   ECONOMY MUTATION APPLICATION
   ============================================================ */
/**
 * @section economy-mutation-application
 *
 * Applies ActionEconomyMutation to existing turn state.
 *
 * The mutation itself is inferred/validated by action-economy-transaction.
 */
export async function applyActionEconomyMutation(
  actorReference,
  mutation,
  {
    executionId = null,
    activationType = null,
    granted = false,
    reaction = false
  } = {}
) {
  if (!mutation) {
    throw new TypeError(
      "applyActionEconomyMutation requires mutation."
    );
  }
  const before =
    await readActionEconomySnapshot(
      actorReference
    );
  let quickRemaining =
    before.quickRemaining;
  let fullAvailable =
    before.fullAvailable;
  let movementAvailable =
    before.movementAvailable;
  let protocolUsed =
    before.protocolUsed;
  let reactionAvailable =
    before.reactionAvailable;
  let turnPhase =
    before.turnPhase;
  let anyActionTaken =
    before.anyActionTaken;
  let actionCount =
    before.actionCount;
  const actionsTaken = [
    ...before.actionsTaken
  ];
  /* ----------------------------------------------------------
     QUICK
     ---------------------------------------------------------- */
  if (
    finiteNumber(
      mutation.quickDelta
    ) &&
    mutation.quickDelta !== 0
  ) {
    quickRemaining =
      Math.max(
        0,
        quickRemaining +
          mutation.quickDelta
      );
  }
  /* ----------------------------------------------------------
     FULL
     ---------------------------------------------------------- */
  if (
    mutation.consumeFull
  ) {
    fullAvailable =
      false;
  }
  /* ----------------------------------------------------------
     MOVEMENT
     ---------------------------------------------------------- */
  if (
    mutation.consumeMovement
  ) {
    movementAvailable =
      false;
  }
  /* ----------------------------------------------------------
     PROTOCOL
     ---------------------------------------------------------- */
  if (
    mutation.consumeProtocol
  ) {
    protocolUsed =
      true;
  }
  /* ----------------------------------------------------------
     REACTION
     ---------------------------------------------------------- */
  if (
    mutation.consumeReaction
  ) {
    reactionAvailable =
      false;
  }
  /* ----------------------------------------------------------
     ACTION HISTORY / PROTOCOL WINDOW
     ---------------------------------------------------------- */
  if (
    mutation.markActionTaken
  ) {
    anyActionTaken =
      true;
    actionCount +=
      1;
    /*
     * Any committed action closes the untouched Protocol window,
     * including a Protocol itself.
     */
    if (
      turnPhase ===
      ACTION_ECONOMY_TURN_PHASE.START
    ) {
      turnPhase =
        ACTION_ECONOMY_TURN_PHASE.ACTIVE;
    }
    actionsTaken.push(
      createActionEconomyHistoryEntry({
        executionId,
        actionId:
          mutation.actionId,
        activationType,
        granted,
        reaction,
        protocol:
          Boolean(
            mutation.consumeProtocol
          )
      })
    );
  }
  const patch =
    createCanonicalActionEconomyStatePatch({
      quickRemaining,
      fullAvailable,
      movementAvailable,
      protocolUsed,
      reactionAvailable,
      turnPhase,
      anyActionTaken,
      actionCount,
      actionsTaken,
      metadata: {
        executionId,
        actionId:
          mutation.actionId
      }
    });
  await patchActionEconomyTurnState(
    actorReference,
    patch,
    {
      reason:
        "action-economy-commit"
    }
  );
  const after =
    await readActionEconomySnapshot(
      actorReference
    );
  return Object.freeze({
    before,
    after,
    mutation,
    patch
  });
}
/* ============================================================
   TURN START
   ============================================================ */
/**
 * @section turn-start
 *
 * Called by turn/lifecycle integration.
 *
 * Does not reset resources.
 *
 * Does reset per-turn action economy state.
 */
export async function initializeActionEconomyTurn(
  actorReference,
  {
    turnId = null,
    round = null
  } = {}
) {
  const patch =
    createCanonicalActionEconomyStatePatch({
      quickRemaining:
        ACTION_ECONOMY_STANDARD_LIMITS
          .QUICK_ACTIONS,
      fullAvailable:
        true,
      movementAvailable:
        true,
      protocolUsed:
        false,
      reactionAvailable:
        true,
      turnPhase:
        ACTION_ECONOMY_TURN_PHASE.START,
      anyActionTaken:
        false,
      actionCount:
        0,
      actionsTaken:
        [],
      metadata: {
        lifecycle:
          "turn-start",
        turnId,
        round
      }
    });
  const adapter =
    assertActionEconomyTurnStateAdapter();
  if (
    typeof adapter.reset ===
    "function"
  ) {
    await adapter.reset(
      actorReference,
      {
        patch,
        turnId,
        round,
        reason:
          "action-economy-turn-start"
      }
    );
  } else {
    await adapter.write(
      actorReference,
      patch,
      {
        reason:
          "action-economy-turn-start"
      }
    );
  }
  return readActionEconomySnapshot(
    actorReference
  );
}
/* ============================================================
   TURN END
   ============================================================ */
/**
 * @section turn-end
 */
export async function endActionEconomyTurn(
  actorReference
) {
  const before =
    await readActionEconomySnapshot(
      actorReference
    );
  await patchActionEconomyTurnState(
    actorReference,
    createCanonicalActionEconomyStatePatch({
      turnPhase:
        ACTION_ECONOMY_TURN_PHASE.ENDED,
      metadata: {
        lifecycle:
          "turn-end"
      }
    }),
    {
      reason:
        "action-economy-turn-end"
    }
  );
  return Object.freeze({
    before,
    after:
      await readActionEconomySnapshot(
        actorReference
      )
  });
}
/* ============================================================
   REACTION RESTORE
   ============================================================ */
/**
 * @section reaction-restore
 *
 * Reaction timing can differ from ordinary turn action state.
 *
 * lifecycle/turn integration decides WHEN this is called.
 */
export async function restoreActionEconomyReaction(
  actorReference
) {
  await patchActionEconomyTurnState(
    actorReference,
    createCanonicalActionEconomyStatePatch({
      reactionAvailable:
        true,
      metadata: {
        lifecycle:
          "reaction-restore"
      }
    }),
    {
      reason:
        "action-economy-reaction-restore"
    }
  );
  return readActionEconomySnapshot(
    actorReference
  );
}
/* ============================================================
   FULL / QUICK STATE HELPERS
   ============================================================ */
/**
 * @section full-quick-state-helpers
 *
 * These are state primitives only.
 *
 * Conversion legality belongs in action-economy-transaction.js.
 */
export async function setQuickActionsRemaining(
  actorReference,
  value
) {
  await patchActionEconomyTurnState(
    actorReference,
    createCanonicalActionEconomyStatePatch({
      quickRemaining:
        value
    }),
    {
      reason:
        "set-quick-actions"
    }
  );
  return readActionEconomySnapshot(
    actorReference
  );
}
export async function setFullActionAvailable(
  actorReference,
  available
) {
  await patchActionEconomyTurnState(
    actorReference,
    createCanonicalActionEconomyStatePatch({
      fullAvailable:
        available
    }),
    {
      reason:
        "set-full-action-availability"
    }
  );
  return readActionEconomySnapshot(
    actorReference
  );
}
/* ============================================================
   PROTOCOL STATE HELPERS
   ============================================================ */
/**
 * @section protocol-state-helpers
 */
export async function markProtocolUsed(
  actorReference,
  {
    executionId = null,
    actionId = null
  } = {}
) {
  const snapshot =
    await readActionEconomySnapshot(
      actorReference
    );
  const actionsTaken = [
    ...snapshot.actionsTaken,
    createActionEconomyHistoryEntry({
      executionId,
      actionId,
      activationType:
        "protocol",
      protocol:
        true
    })
  ];
  await patchActionEconomyTurnState(
    actorReference,
    createCanonicalActionEconomyStatePatch({
      protocolUsed:
        true,
      turnPhase:
        ACTION_ECONOMY_TURN_PHASE.ACTIVE,
      anyActionTaken:
        true,
      actionCount:
        snapshot.actionCount + 1,
      actionsTaken,
      metadata: {
        executionId,
        actionId,
        protocol:
          true
      }
    }),
    {
      reason:
        "protocol-used"
    }
  );
  return readActionEconomySnapshot(
    actorReference
  );
}
export function isProtocolWindowOpen(
  snapshot
) {
  return Boolean(
    snapshot &&
    snapshot.turnPhase ===
      ACTION_ECONOMY_TURN_PHASE.START &&
    snapshot.protocolUsed ===
      false &&
    snapshot.anyActionTaken ===
      false &&
    snapshot.actionCount ===
      0
  );
}
/* ============================================================
   ACTION HISTORY HELPERS
   ============================================================ */
/**
 * @section action-history-helpers
 */
export function hasActionEconomyActionBeenTaken(
  snapshot,
  actionId
) {
  if (
    typeof actionId !==
      "string" ||
    actionId.length === 0
  ) {
    return false;
  }
  return Boolean(
    snapshot
      ?.actionsTaken
      ?.some(
        entry =>
          entry?.actionId ===
          actionId
      )
  );
}
export function countActionEconomyActionsByType(
  snapshot,
  activationType
) {
  return (
    snapshot
      ?.actionsTaken
      ?.filter(
        entry =>
          entry?.activationType ===
          activationType
      )
      .length ??
    0
  );
}
/* ============================================================
   EXECUTION ACTOR RESOLUTION
   ============================================================ */
/**
 * @section execution-actor-resolution
 *
 * Convenience for transaction integration.
 */
export function getActionEconomyActorReference(
  context
) {
  return (
    context
      ?.actors
      ?.actor ??
    context
      ?.actors
      ?.mech ??
    context
      ?.actors
      ?.pilot ??
    null
  );
}
export async function readExecutionActionEconomySnapshot(
  context
) {
  const actorReference =
    getActionEconomyActorReference(
      context
    );
  if (!actorReference) {
    throw new Error(
      "ExecutionContext has no actor reference for action economy."
    );
  }
  return readActionEconomySnapshot(
    actorReference
  );
}
/* ============================================================
   EXISTING FRAME CONN STATE ADAPTER NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-state-adapter-notes
 *
 * feature_turn/ currently owns authoritative turn data.
 *
 * Runtime composition should configure approximately:
 *
 * setActionEconomyTurnStateAdapter({
 *
 *   read(actor) {
 *     return existingTurnStateService
 *       .getState(actor);
 *   },
 *
 *   write(actor, patch) {
 *     return existingTurnStateService
 *       .updateState(actor, patch);
 *   }
 * });
 *
 * If existing state uses:
 *
 * quickActions
 * fullActionAvailable
 *
 * instead of canonical:
 *
 * quickRemaining
 * fullAvailable
 *
 * the injected adapter should translate writes.
 *
 * Read aliases are tolerated here during migration.
 */
/* ============================================================
   FULL / QUICK RELATIONSHIP NOTES
   ============================================================ */
/**
 * @section full-quick-relationship-notes
 *
 * Existing Frame Conn turn state historically tracks:
 *
 * quick actions = 2
 * full action available = true
 *
 * action-economy-transaction.js must establish the rule coupling between
 * these states.
 *
 * This file intentionally does NOT guess that coupling.
 *
 * It only exposes and mutates authoritative fields.
 *
 * Example transaction logic may decide:
 *
 * Full Action:
 * → fullAvailable = false
 * → ordinary Quick usage no longer available as appropriate
 *
 * Two Quick Actions:
 * → quickRemaining reaches 0
 * → Full Action no longer available
 *
 * Exact conversion belongs in transaction semantics, not state adapter.
 */
/* ============================================================
   PROTOCOL NOTES
   ============================================================ */
/**
 * @section protocol-notes
 *
 * Protocol requires:
 *
 * turnPhase = START
 * protocolUsed = false
 * anyActionTaken = false
 * actionCount = 0
 *
 * Protocol costs no Quick/Full action.
 *
 * After Protocol commit:
 *
 * protocolUsed = true
 * anyActionTaken = true
 * actionCount += 1
 * turnPhase = ACTIVE
 *
 * Therefore a second Protocol is impossible under standard rules.
 *
 * Any other action, including an ordinary Free Action, also changes:
 *
 * anyActionTaken = true
 * turnPhase = ACTIVE
 *
 * closing the Protocol window.
 */
/* ============================================================
   MOVEMENT NOTES
   ============================================================ */
/**
 * @section movement-notes
 *
 * This state adapter tracks whether the standard movement opportunity has
 * been consumed where action_economy requires it.
 *
 * It does NOT own:
 *
 * speed
 * distance
 * spent movement
 * elevation cost
 * movement segments
 * pathfinding
 *
 * Those remain under feature_movement/ and future movement services.
 */
/* ============================================================
   REACTION NOTES
   ============================================================ */
/**
 * @section reaction-notes
 *
 * reactionAvailable is normalized here because transaction validation needs
 * a stable state value.
 *
 * Actual Lancer reaction timing/reset rules may require more nuanced state
 * than one boolean for some effects.
 *
 * Such extensions should augment existing feature_turn state and this
 * adapter rather than creating a separate authoritative store.
 */
/* ============================================================
   OVERCHARGE NOTES
   ============================================================ */
/**
 * @section overcharge-notes
 *
 * Existing Frame Conn turn state already tracks overcharge usage.
 *
 * Overcharge is NOT ordinary Quick/Full economy and should not be folded
 * into this contract merely because it grants an additional action.
 *
 * Native/semantic Overcharge execution and its resource/effect semantics
 * remain separate.
 *
 * The granted action produced by Overcharge should enter execution context
 * with:
 *
 * grantedAction = true
 *
 * and appropriate economy override semantics.
 */
/* ============================================================
   TURN START / END INTEGRATION
   ============================================================ */
/**
 * @section turn-start-end-integration
 *
 * Future lifecycle/semantic-event integration should call:
 *
 * TURN START
 * → initializeActionEconomyTurn(actor)
 *
 * TURN END
 * → endActionEconomyTurn(actor)
 *
 * Reaction refresh timing may call:
 *
 * restoreActionEconomyReaction(actor)
 *
 * Do not rely on UI opening/closing to reset mechanical turn state.
 */
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
/**
 * @section diagnostics
 */
export function getActionEconomyStateDiagnostics() {
  return Object.freeze({
    id:
      ACTION_ECONOMY_STATE_MODULE_ID,
    version:
      ACTION_ECONOMY_STATE_MODULE_VERSION,
    adapterConfigured:
      hasActionEconomyTurnStateAdapter(),
    adapterCapabilities:
      Object.freeze({
        read:
          typeof turnStateAdapter?.read ===
          "function",
        write:
          typeof turnStateAdapter?.write ===
          "function",
        reset:
          typeof turnStateAdapter?.reset ===
          "function",
        getTurnId:
          typeof turnStateAdapter?.getTurnId ===
          "function",
        getRound:
          typeof turnStateAdapter?.getRound ===
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
 * feature_turn/
 * -------------
 *
 * Remains authoritative.
 *
 * This module is an adapter over that state.
 *
 * Existing turn state should not be deleted/replaced.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Should eventually rely on action-economy transaction hooks rather than
 * manually decrementing Quick/Full state.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies actor/controller/execution identity.
 *
 * This module converts that actor reference into a current economy
 * snapshot.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * action-economy-hooks.js will use:
 *
 * prevalidate
 * → readActionEconomySnapshot()
 *
 * commit
 * → applyActionEconomyMutation()
 *
 *
 * resource_service/
 * -----------------
 *
 * Separate concern.
 *
 * Quick/Full/Protocol/Reaction action slots remain action economy.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Movement distance/tracking remains authoritative there.
 *
 * action economy only records whether the standard movement opportunity is
 * available/consumed where needed.
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * May supplement existing registry entries with activation/cost metadata.
 *
 * It does not read or mutate turn state itself.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * feature_turn/ remains the sole authoritative turn-state backing.
 *
 * INVARIANT 2
 * action-economy-state.js does not create a parallel turn-state store.
 *
 * INVARIANT 3
 * Existing field aliases may be read during migration.
 *
 * INVARIANT 4
 * New writes use one canonical adapter patch shape.
 *
 * INVARIANT 5
 * Adapter implementation translates canonical writes into the existing
 * feature_turn storage format where necessary.
 *
 * INVARIANT 6
 * Protocol availability depends on untouched start-of-turn state.
 *
 * INVARIANT 7
 * Any committed action closes the Protocol window.
 *
 * INVARIANT 8
 * A committed Protocol itself closes the Protocol window.
 *
 * INVARIANT 9
 * Protocol state resets at turn start.
 *
 * INVARIANT 10
 * Ordinary Free and Granted Actions still count as actions for Protocol
 * timing.
 *
 * INVARIANT 11
 * Movement distance expenditure remains outside this module.
 *
 * INVARIANT 12
 * Resource state remains outside this module.
 *
 * INVARIANT 13
 * Overcharge state remains outside ordinary action-slot accounting except
 * for the granted action it produces.
 *
 * INVARIANT 14
 * Validation rules remain in action-economy-contract/transaction rather
 * than state storage.
 *
 * INVARIANT 15
 * Turn reset/ending occurs through lifecycle integration, not UI state.
 */