/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/action_economy/action-economy.js
 */
/**
 * @file
 * @path main/action_economy/action-economy.js
 * @module action-economy
 * @layer action-economy-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-action-economy-api
 * @public-boundary true
 * @side-effects delegated-through-state-transaction-and-hooks
 *
 * @depends-on
 * - action-economy-contract
 * - action-economy-state
 * - action-economy-transaction
 * - action-economy-hooks
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by runtime-orchestrator.js
 * - consumed by future frame-conn-runtime composition
 * - consumed by future feature_runtime_bridge/
 * - consumed by lifecycle_service/*
 * - integrates with execution_transaction/ through action-economy-hooks.js
 * - adapts existing feature_turn/ state through action-economy-state.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature_turn/ remains authoritative turn-state backing
 * - semantic_execution_context/ remains execution-input authority
 * - execution_transaction/ remains execution timing authority
 * - resource_service/ remains separate
 * - future feature_runtime_bridge/ supplies missing economy metadata
 *
 * THIS FILE OWNS:
 * - public action_economy façade
 * - stable namespace composition
 * - common economy resolution/validation/commit entry points
 * - turn-state adapter configuration
 * - transaction-hook configuration/registration
 * - lifecycle-facing turn helpers
 * - diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - economy contracts
 * - turn-state persistence
 * - economy validation implementation
 * - economy mutation implementation
 * - transaction sequencing
 * - resource handling
 * - feature-specific mechanics
 *
 * EDIT CONTRACT:
 * - keep façade thin
 * - contract owns shapes/rules
 * - state owns existing feature_turn adaptation
 * - transaction owns validation/commit semantics
 * - hooks own execution_transaction integration
 * - do not add tabletop feature rules here
 */
/* ============================================================
   MODULE IMPORTS
   ============================================================ */
/**
 * @section module-imports
 */
import * as contract from "./action-economy-contract.js";
import * as state from "./action-economy-state.js";
import * as transaction from "./action-economy-transaction.js";
import * as hooks from "./action-economy-hooks.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
/**
 * @section module-identity
 */
export const ACTION_ECONOMY_MODULE_ID =
  "lancer-frame-conn.action-economy";
export const ACTION_ECONOMY_MODULE_VERSION =
  1;
/* ============================================================
   PUBLIC NAMESPACE
   ============================================================ */
/**
 * @section public-namespace
 *
 * Preferred access:
 *
 * actionEconomy.contract.*
 * actionEconomy.state.*
 * actionEconomy.transaction.*
 * actionEconomy.hooks.*
 *
 * Higher runtime layers should normally import this file rather than
 * sibling implementation files directly.
 */
export const actionEconomy =
  Object.freeze({
    id:
      ACTION_ECONOMY_MODULE_ID,
    version:
      ACTION_ECONOMY_MODULE_VERSION,
    contract,
    state,
    transaction,
    hooks
  });
/* ============================================================
   REQUEST CONSTRUCTION
   ============================================================ */
/**
 * @section request-construction
 */
export function buildActionEconomyRequest(
  context,
  options
) {
  return actionEconomy
    .transaction
    .buildActionEconomyRequest(
      context,
      options
    );
}
/* ============================================================
   ECONOMY VALIDATION
   ============================================================ */
/**
 * @section economy-validation
 */
export async function validateExecutionActionEconomy(
  context,
  options
) {
  return actionEconomy
    .transaction
    .validateExecutionActionEconomy(
      context,
      options
    );
}
export async function prepareActionEconomyTransaction(
  context
) {
  return actionEconomy
    .transaction
    .prepareActionEconomyTransaction(
      context
    );
}
/* ============================================================
   ECONOMY MUTATION CONSTRUCTION
   ============================================================ */
/**
 * @section economy-mutation-construction
 */
export function buildActionEconomyMutation(
  context,
  request,
  snapshot
) {
  return actionEconomy
    .transaction
    .buildActionEconomyMutation(
      context,
      request,
      snapshot
    );
}
/* ============================================================
   ECONOMY COMMIT
   ============================================================ */
/**
 * @section economy-commit
 */
export async function commitExecutionActionEconomy(
  context,
  options
) {
  return actionEconomy
    .transaction
    .commitExecutionActionEconomy(
      context,
      options
    );
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
  return actionEconomy
    .transaction
    .didActionEconomyValidationSucceed(
      result
    );
}
export function didActionEconomyCommitSucceed(
  result
) {
  return actionEconomy
    .transaction
    .didActionEconomyCommitSucceed(
      result
    );
}
export function didActionEconomyCommitFail(
  result
) {
  return actionEconomy
    .transaction
    .didActionEconomyCommitFail(
      result
    );
}
export function wasActionEconomyCommitPartial(
  result
) {
  return actionEconomy
    .transaction
    .wasActionEconomyCommitPartial(
      result
    );
}
/* ============================================================
   EXECUTION TRANSACTION RESULT ADAPTERS
   ============================================================ */
/**
 * @section execution-transaction-result-adapters
 */
export function toExecutionTransactionValidationResult(
  result,
  options
) {
  return actionEconomy
    .transaction
    .toExecutionTransactionValidationResult(
      result,
      options
    );
}
export function toExecutionTransactionCommitResult(
  result,
  options
) {
  return actionEconomy
    .transaction
    .toExecutionTransactionCommitResult(
      result,
      options
    );
}
/* ============================================================
   TURN STATE ADAPTER CONFIGURATION
   ============================================================ */
/**
 * @section turn-state-adapter-configuration
 *
 * Runtime composition should inject the existing feature_turn storage
 * adapter here.
 */
export function setActionEconomyTurnStateAdapter(
  adapter
) {
  return actionEconomy
    .state
    .setActionEconomyTurnStateAdapter(
      adapter
    );
}
export function getActionEconomyTurnStateAdapter() {
  return actionEconomy
    .state
    .getActionEconomyTurnStateAdapter();
}
export function hasActionEconomyTurnStateAdapter() {
  return actionEconomy
    .state
    .hasActionEconomyTurnStateAdapter();
}
export function assertActionEconomyTurnStateAdapter() {
  return actionEconomy
    .state
    .assertActionEconomyTurnStateAdapter();
}
/* ============================================================
   TURN STATE READ
   ============================================================ */
/**
 * @section turn-state-read
 */
export async function readActionEconomySnapshot(
  actorReference
) {
  return actionEconomy
    .state
    .readActionEconomySnapshot(
      actorReference
    );
}
export async function readExecutionActionEconomySnapshot(
  context
) {
  return actionEconomy
    .state
    .readExecutionActionEconomySnapshot(
      context
    );
}
export async function readRawActionEconomyTurnState(
  actorReference
) {
  return actionEconomy
    .state
    .readRawActionEconomyTurnState(
      actorReference
    );
}
/* ============================================================
   TURN STATE PATCH
   ============================================================ */
/**
 * @section turn-state-patch
 */
export async function patchActionEconomyTurnState(
  actorReference,
  patch,
  options
) {
  return actionEconomy
    .state
    .patchActionEconomyTurnState(
      actorReference,
      patch,
      options
    );
}
export function createCanonicalActionEconomyStatePatch(
  options
) {
  return actionEconomy
    .state
    .createCanonicalActionEconomyStatePatch(
      options
    );
}
/* ============================================================
   DIRECT ECONOMY MUTATION
   ============================================================ */
/**
 * @section direct-economy-mutation
 *
 * Prefer transaction hooks for ordinary action execution.
 *
 * Direct access exists for:
 *
 * lifecycle
 * recovery
 * explicit runtime maintenance
 */
export async function applyActionEconomyMutation(
  actorReference,
  mutation,
  options
) {
  return actionEconomy
    .state
    .applyActionEconomyMutation(
      actorReference,
      mutation,
      options
    );
}
/* ============================================================
   TURN LIFECYCLE
   ============================================================ */
/**
 * @section turn-lifecycle
 *
 * Future lifecycle_service/ should call these.
 */
export async function initializeActionEconomyTurn(
  actorReference,
  options
) {
  return actionEconomy
    .state
    .initializeActionEconomyTurn(
      actorReference,
      options
    );
}
export async function endActionEconomyTurn(
  actorReference
) {
  return actionEconomy
    .state
    .endActionEconomyTurn(
      actorReference
    );
}
export async function restoreActionEconomyReaction(
  actorReference
) {
  return actionEconomy
    .state
    .restoreActionEconomyReaction(
      actorReference
    );
}
/* ============================================================
   QUICK / FULL STATE HELPERS
   ============================================================ */
/**
 * @section quick-full-state-helpers
 */
export async function setQuickActionsRemaining(
  actorReference,
  value
) {
  return actionEconomy
    .state
    .setQuickActionsRemaining(
      actorReference,
      value
    );
}
export async function setFullActionAvailable(
  actorReference,
  available
) {
  return actionEconomy
    .state
    .setFullActionAvailable(
      actorReference,
      available
    );
}
/* ============================================================
   PROTOCOL HELPERS
   ============================================================ */
/**
 * @section protocol-helpers
 */
export async function markProtocolUsed(
  actorReference,
  options
) {
  return actionEconomy
    .state
    .markProtocolUsed(
      actorReference,
      options
    );
}
export function isProtocolWindowOpen(
  snapshot
) {
  return actionEconomy
    .state
    .isProtocolWindowOpen(
      snapshot
    );
}
/* ============================================================
   ACTION HISTORY
   ============================================================ */
/**
 * @section action-history
 */
export function createActionEconomyHistoryEntry(
  options
) {
  return actionEconomy
    .state
    .createActionEconomyHistoryEntry(
      options
    );
}
export function hasActionEconomyActionBeenTaken(
  snapshot,
  actionId
) {
  return actionEconomy
    .state
    .hasActionEconomyActionBeenTaken(
      snapshot,
      actionId
    );
}
export function countActionEconomyActionsByType(
  snapshot,
  activationType
) {
  return actionEconomy
    .state
    .countActionEconomyActionsByType(
      snapshot,
      activationType
    );
}
/* ============================================================
   CONTRACT CONSTRUCTION HELPERS
   ============================================================ */
/**
 * @section contract-construction-helpers
 */
export function createActionEconomyCost(
  options
) {
  return actionEconomy
    .contract
    .createActionEconomyCost(
      options
    );
}
export function createQuickActionCost(
  options
) {
  return actionEconomy
    .contract
    .createQuickActionCost(
      options
    );
}
export function createFullActionCost(
  options
) {
  return actionEconomy
    .contract
    .createFullActionCost(
      options
    );
}
export function createFreeActionCost(
  options
) {
  return actionEconomy
    .contract
    .createFreeActionCost(
      options
    );
}
export function createProtocolActionCost(
  options
) {
  return actionEconomy
    .contract
    .createProtocolActionCost(
      options
    );
}
export function createMovementActionCost(
  options
) {
  return actionEconomy
    .contract
    .createMovementActionCost(
      options
    );
}
export function createReactionActionCost(
  options
) {
  return actionEconomy
    .contract
    .createReactionActionCost(
      options
    );
}
export function createGrantedActionCost(
  options
) {
  return actionEconomy
    .contract
    .createGrantedActionCost(
      options
    );
}
export function createActionEconomyRequest(
  options
) {
  return actionEconomy
    .contract
    .createActionEconomyRequest(
      options
    );
}
export function createActionEconomyMutation(
  options
) {
  return actionEconomy
    .contract
    .createActionEconomyMutation(
      options
    );
}
export function createActionEconomySnapshot(
  options
) {
  return actionEconomy
    .contract
    .createActionEconomySnapshot(
      options
    );
}
/* ============================================================
   STANDARD ECONOMY HELPERS
   ============================================================ */
/**
 * @section standard-economy-helpers
 */
export function inferStandardActionEconomyCost(
  activationType
) {
  return actionEconomy
    .contract
    .inferStandardActionEconomyCost(
      activationType
    );
}
export function inferActionEconomyMutation(
  request,
  options
) {
  return actionEconomy
    .contract
    .inferActionEconomyMutation(
      request,
      options
    );
}
export function validateStandardActionEconomy(
  request,
  snapshot
) {
  return actionEconomy
    .contract
    .validateStandardActionEconomy(
      request,
      snapshot
    );
}
export function validateProtocolEconomy(
  snapshot
) {
  return actionEconomy
    .contract
    .validateProtocolEconomy(
      snapshot
    );
}
/* ============================================================
   AUGMENTATION RESOLVER CONFIGURATION
   ============================================================ */
/**
 * @section augmentation-resolver-configuration
 *
 * Future feature_runtime_bridge/ may inject economy semantics missing from
 * existing registry entries.
 */
export function setActionEconomyAugmentationResolver(
  resolver
) {
  return actionEconomy
    .hooks
    .setActionEconomyAugmentationResolver(
      resolver
    );
}
export function getActionEconomyAugmentationResolver() {
  return actionEconomy
    .hooks
    .getActionEconomyAugmentationResolver();
}
/* ============================================================
   TRANSACTION HOOK REGISTRATION
   ============================================================ */
/**
 * @section transaction-hook-registration
 *
 * Register once during top-level runtime composition.
 */
export function registerActionEconomyTransactionHooks() {
  return actionEconomy
    .hooks
    .registerActionEconomyTransactionHooks();
}
export function unregisterActionEconomyTransactionHooks() {
  return actionEconomy
    .hooks
    .unregisterActionEconomyTransactionHooks();
}
export function areActionEconomyTransactionHooksRegistered() {
  return actionEconomy
    .hooks
    .areActionEconomyTransactionHooksRegistered();
}
/* ============================================================
   TRANSACTION HOOK STATE
   ============================================================ */
/**
 * @section transaction-hook-state
 */
export function getExecutionActionEconomyHookState(
  executionId
) {
  return actionEconomy
    .hooks
    .getExecutionActionEconomyHookState(
      executionId
    );
}
export function getExecutionActionEconomyRequest(
  executionId
) {
  return actionEconomy
    .hooks
    .getExecutionActionEconomyRequest(
      executionId
    );
}
export function getExecutionActionEconomySnapshot(
  executionId
) {
  return actionEconomy
    .hooks
    .getExecutionActionEconomySnapshot(
      executionId
    );
}
export function getExecutionActionEconomyValidation(
  executionId
) {
  return actionEconomy
    .hooks
    .getExecutionActionEconomyValidation(
      executionId
    );
}
export function getExecutionActionEconomyCommit(
  executionId
) {
  return actionEconomy
    .hooks
    .getExecutionActionEconomyCommit(
      executionId
    );
}
export function clearExecutionActionEconomyHookState(
  executionId
) {
  return actionEconomy
    .hooks
    .clearExecutionActionEconomyHookState(
      executionId
    );
}
export function clearAllExecutionActionEconomyHookState() {
  return actionEconomy
    .hooks
    .clearAllExecutionActionEconomyHookState();
}
/* ============================================================
   SERVICE CAPABILITIES
   ============================================================ */
/**
 * @section service-capabilities
 */
export const ACTION_ECONOMY_CAPABILITY =
  Object.freeze({
    TURN_STATE_ADAPTER:
      "turn-state-adapter",
    SNAPSHOT:
      "snapshot",
    REQUEST_NORMALIZATION:
      "request-normalization",
    VALIDATION:
      "validation",
    COMMIT:
      "commit",
    QUICK_FULL_COUPLING:
      "quick-full-coupling",
    PROTOCOL_TIMING:
      "protocol-timing",
    REACTION_STATE:
      "reaction-state",
    TURN_LIFECYCLE:
      "turn-lifecycle",
    TRANSACTION_HOOKS:
      "transaction-hooks",
    RUNTIME_AUGMENTATION:
      "runtime-augmentation"
  });
export function getActionEconomyCapabilities() {
  return Object.freeze(
    Object.values(
      ACTION_ECONOMY_CAPABILITY
    )
  );
}
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
/**
 * @section diagnostics
 */
export function getActionEconomyDiagnostics() {
  return Object.freeze({
    module:
      Object.freeze({
        id:
          ACTION_ECONOMY_MODULE_ID,
        version:
          ACTION_ECONOMY_MODULE_VERSION
      }),
    capabilities:
      getActionEconomyCapabilities(),
    state:
      actionEconomy
        .state
        .getActionEconomyStateDiagnostics(),
    hooks:
      actionEconomy
        .hooks
        .getActionEconomyHookDiagnostics()
  });
}
/* ============================================================
   FEATURE TURN BOUNDARY
   ============================================================ */
/**
 * @section feature-turn-boundary
 *
 * Existing feature_turn/ remains authoritative.
 *
 * Runtime composition injects an adapter:
 *
 * setActionEconomyTurnStateAdapter({
 *   read,
 *   write,
 *   reset?,
 *   getTurnId?,
 *   getRound?
 * })
 *
 * action_economy does NOT establish a second turn-state store.
 *
 * Higher runtime code should not write Quick/Full/Protocol state directly
 * once this boundary is active.
 */
/* ============================================================
   EXECUTION TRANSACTION BOUNDARY
   ============================================================ */
/**
 * @section execution-transaction-boundary
 *
 * Runtime initialization:
 *
 * registerActionEconomyTransactionHooks()
 *
 * Ordinary execution then receives:
 *
 * BEFORE_PRE_VALIDATE
 * → economy snapshot + validation
 *
 * BEFORE_COMMIT
 * → revalidation + economy mutation
 *
 * terminal
 * → transaction-local economy state cleanup
 *
 * runtime-orchestrator should not manually repeat this sequence.
 */
/* ============================================================
   PROTOCOL BOUNDARY
   ============================================================ */
/**
 * @section protocol-boundary
 *
 * Protocol remains:
 *
 * type:
 * specialized Free Action
 *
 * cost:
 * no Quick/Full expenditure
 *
 * timing:
 * only at untouched start of character turn
 *
 * frequency:
 * once per turn
 *
 * ordering:
 * before any other action
 *
 * Ordinary Free and Granted Actions close the Protocol window when
 * committed.
 *
 * Free/granted/ignore-cost flags do not bypass Protocol timing.
 */
/* ============================================================
   RESOURCE SERVICE BOUNDARY
   ============================================================ */
/**
 * @section resource-service-boundary
 *
 * Action economy is not generic resource state.
 *
 * action_economy owns:
 *
 * Quick
 * Full
 * Protocol
 * Reaction availability
 * standard movement opportunity where relevant
 *
 * resource_service owns:
 *
 * Limited
 * Loaded
 * Core Energy
 * counters
 * charges
 * action frequency resources
 * supplemental resource state
 *
 * These services both attach to execution_transaction but remain distinct.
 */
/* ============================================================
   FEATURE RUNTIME BRIDGE BOUNDARY
   ============================================================ */
/**
 * @section feature-runtime-bridge-boundary
 *
 * Future:
 *
 * existing feature registry entry
 *         +
 * runtime augmentation
 *         ↓
 * feature_runtime_bridge
 *         ↓
 * setActionEconomyAugmentationResolver(...)
 *
 * Augmentation may supply:
 *
 * activationType
 * cost
 *
 * It should NOT:
 *
 * read feature_turn state
 * mutate action economy
 * commit turn state
 */
/* ============================================================
   LIFECYCLE SERVICE BOUNDARY
   ============================================================ */
/**
 * @section lifecycle-service-boundary
 *
 * Future lifecycle_service/ should call:
 *
 * initializeActionEconomyTurn(...)
 * endActionEconomyTurn(...)
 * restoreActionEconomyReaction(...)
 *
 * Action economy owns reset mutation primitives.
 *
 * Lifecycle service owns WHEN those mutations happen.
 */
/* ============================================================
   OVERCHARGE BOUNDARY
   ============================================================ */
/**
 * @section overcharge-boundary
 *
 * Existing Overcharge tracking remains outside ordinary action economy.
 *
 * Overcharge:
 *
 * - has its own native/semantic execution
 * - has its own escalation/resource semantics
 * - grants an additional action
 *
 * The granted action should enter ExecutionContext with:
 *
 * grantedAction = true
 *
 * or explicit economy override.
 *
 * Do not model Overcharge itself as an ordinary Quick slot.
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
 * Should consume this public boundary.
 *
 * Once hooks are registered it should not manually consume ordinary action
 * slots.
 *
 *
 * feature_turn/
 * -------------
 *
 * Remains authoritative state backing.
 *
 * This module is the semantic/action-runtime service above it.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies:
 *
 * activationType
 * requestedCost
 * costOverride
 * grantedByExecutionId
 * reactionTrigger
 * freeActionOverride
 * ignoreActionCost
 * grantedAction
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns validation/commit timing.
 *
 * action_economy attaches through global hooks.
 *
 *
 * resource_service/
 * -----------------
 *
 * Parallel foundational service.
 *
 * Both validate before execution and commit after execution.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Movement distance remains authoritative there.
 *
 * action_economy only represents standard movement opportunity where
 * required by execution semantics.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Will drive turn start/end/reaction restoration.
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * Supplies missing economy semantics without existing registry rewrite.
 */
/* ============================================================
   RECOMMENDED TOP-LEVEL COMPOSITION
   ============================================================ */
/**
 * @section recommended-top-level-composition
 *
 * Future frame-conn-runtime composition:
 *
 * 1. initialize native_adapter
 *
 * 2. configure existing feature_turn adapter:
 *
 *    setActionEconomyTurnStateAdapter(...)
 *
 * 3. initialize feature_runtime_bridge
 *
 * 4. configure:
 *
 *    setActionEconomyAugmentationResolver(...)
 *
 * 5. register:
 *
 *    registerActionEconomyTransactionHooks()
 *
 * 6. initialize lifecycle integration
 *
 * 7. initialize runtime-orchestrator/UI
 */
/* ============================================================
   PUBLIC BOUNDARY RULES
   ============================================================ */
/**
 * @section public-boundary-rules
 *
 * RULE 1
 *
 * Higher runtime code should import action-economy.js rather than sibling
 * implementation files.
 *
 *
 * RULE 2
 *
 * feature_turn remains authoritative; action_economy adapts it.
 *
 *
 * RULE 3
 *
 * Ordinary action execution should use transaction hooks rather than direct
 * Quick/Full mutations.
 *
 *
 * RULE 4
 *
 * Protocol is not equivalent to a generic Free Action.
 *
 *
 * RULE 5
 *
 * New economy metadata should be supplied through ExecutionContext/runtime
 * augmentation rather than hardcoded UI conditionals.
 */
/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */
/**
 * @section dependency-direction
 *
 * Intended:
 *
 * existing feature registry
 *          +
 * feature_runtime_bridge
 *          │
 *          ▼
 * semantic_execution_context
 *          │
 *          ▼
 * execution_transaction
 *          │
 *          ▼
 * action_economy
 *          │
 *          ▼
 * existing feature_turn
 *
 *
 * lifecycle_service
 *          │
 *          ▼
 * action_economy
 *
 * for turn/reset timing.
 *
 *
 * Forbidden:
 *
 * feature_turn
 * → action_economy
 *
 * action_economy
 * → runtime-orchestrator
 *
 * action_economy
 * → UI implementation
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * action-economy.js is the public Frame Conn action-economy boundary.
 *
 * INVARIANT 2
 * Contract owns shapes/rules.
 *
 * INVARIANT 3
 * State owns adaptation to existing feature_turn backing.
 *
 * INVARIANT 4
 * Transaction owns economy validation and commit.
 *
 * INVARIANT 5
 * Hooks own execution_transaction integration.
 *
 * INVARIANT 6
 * feature_turn remains authoritative turn-state storage.
 *
 * INVARIANT 7
 * Action economy and resource_service remain separate services.
 *
 * INVARIANT 8
 * Protocol consumes no ordinary Quick/Full slot.
 *
 * INVARIANT 9
 * Protocol is only legal at untouched turn start and once per turn.
 *
 * INVARIANT 10
 * Ordinary Free and Granted Actions still close the Protocol window.
 *
 * INVARIANT 11
 * Economy mutation occurs only after commit-eligible execution.
 *
 * INVARIANT 12
 * Existing registry entries may gain missing economy semantics through
 * runtime augmentation without broad refactoring.
 *
 * INVARIANT 13
 * Lifecycle service owns when turn/reaction reset primitives are called.
 *
 * INVARIANT 14
 * Higher runtime modules should converge on this public boundary rather
 * than inventing parallel action-economy models.
 */