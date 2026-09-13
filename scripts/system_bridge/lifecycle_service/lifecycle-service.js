/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/lifecycle_service/lifecycle-service.js
 */

/**
 * @file
 * @path main/lifecycle_service/lifecycle-service.js
 * @module lifecycle-service
 * @layer lifecycle-service-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-lifecycle-service-api
 * @public-boundary true
 * @side-effects delegated-through-state-dispatcher-and-hooks
 *
 * @depends-on
 * - lifecycle-contract
 * - lifecycle-state
 * - lifecycle-dispatcher
 * - lifecycle-hooks
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by runtime-orchestrator.js
 * - consumed by future actor_owned_feature_registry/
 * - consumed by future system_bridge/
 * - integrates with semantic_event_bus/ through lifecycle-hooks.js
 * - delegates resource reset semantics to resource_service/
 * - delegates action economy reset/end semantics to action_economy/
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - semantic_event_bus remains lifecycle event transport authority
 * - lifecycle-state remains lifecycle timing-state authority
 * - lifecycle-dispatcher remains lifecycle operation-routing authority
 * - resource_service remains resource mutation authority
 * - action_economy remains economy mutation authority
 * - native_adapter remains native Lancer mutation authority
 *
 * THIS FILE OWNS:
 * - public lifecycle_service façade
 * - stable namespace composition
 * - lifecycle descriptor creation helpers
 * - lifecycle state adapter configuration
 * - lifecycle registration/query helpers
 * - lifecycle dispatch entry points
 * - semantic lifecycle hook registration
 * - lifecycle operation adapter configuration
 * - diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - lifecycle contracts
 * - lifecycle storage implementation
 * - lifecycle operation routing implementation
 * - semantic listener implementation
 * - resource/action economy/status mechanics
 * - feature-specific rules
 *
 * EDIT CONTRACT:
 * - keep façade thin
 * - contract owns lifecycle shapes/vocabulary
 * - state owns lifecycle timing persistence
 * - dispatcher owns due-entry resolution/delegation
 * - hooks own semantic event integration
 * - do not add feature-specific lifecycle rules here
 */

/* ============================================================
   MODULE IMPORTS
   ============================================================ */

import * as contract from "./lifecycle-contract.js";
import * as state from "./lifecycle-state.js";
import * as dispatcher from "./lifecycle-dispatcher.js";
import * as hooks from "./lifecycle-hooks.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const LIFECYCLE_SERVICE_MODULE_ID =
  "lancer-frame-conn.lifecycle-service";

export const LIFECYCLE_SERVICE_MODULE_VERSION =
  1;

/* ============================================================
   PUBLIC NAMESPACE
   ============================================================ */

export const lifecycleService =
  Object.freeze({
    id:
      LIFECYCLE_SERVICE_MODULE_ID,

    version:
      LIFECYCLE_SERVICE_MODULE_VERSION,

    contract,

    state,

    dispatcher,

    hooks
  });

/* ============================================================
   CONTEXT / IDENTITY CONSTRUCTION
   ============================================================ */

export function createLifecycleIdentity(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleIdentity(
      options
    );
}

export function createLifecycleContext(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleContext(
      options
    );
}

export function createLifecycleMatch(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleMatch(
      options
    );
}

export function doesLifecycleContextMatch(
  context,
  match
) {
  return lifecycleService
    .contract
    .doesLifecycleContextMatch(
      context,
      match
    );
}

/* ============================================================
   EXPIRATION DESCRIPTORS
   ============================================================ */

export function createLifecycleExpirationDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleExpirationDescriptor(
      options
    );
}

export function createEndOfTurnExpiration(
  options
) {
  return lifecycleService
    .contract
    .createEndOfTurnExpiration(
      options
    );
}

export function createStartOfTurnExpiration(
  options
) {
  return lifecycleService
    .contract
    .createStartOfTurnExpiration(
      options
    );
}

export function createEndOfRoundExpiration(
  options
) {
  return lifecycleService
    .contract
    .createEndOfRoundExpiration(
      options
    );
}

export function createEndOfSceneExpiration(
  options
) {
  return lifecycleService
    .contract
    .createEndOfSceneExpiration(
      options
    );
}

/* ============================================================
   RESET DESCRIPTORS
   ============================================================ */

export function createLifecycleResetDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleResetDescriptor(
      options
    );
}

export function createTurnResetDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createTurnResetDescriptor(
      options
    );
}

export function createRoundResetDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createRoundResetDescriptor(
      options
    );
}

export function createSceneResetDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createSceneResetDescriptor(
      options
    );
}

export function createFullRepairResetDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createFullRepairResetDescriptor(
      options
    );
}

/* ============================================================
   EFFECT DESCRIPTORS
   ============================================================ */

export function createLifecycleEffectDescriptor(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleEffectDescriptor(
      options
    );
}

/* ============================================================
   OPERATION / RESULT CONSTRUCTION
   ============================================================ */

export function createLifecycleOperationRequest(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleOperationRequest(
      options
    );
}

export function createLifecycleOperationResult(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleOperationResult(
      options
    );
}

export function createLifecycleDispatchResult(
  options
) {
  return lifecycleService
    .contract
    .createLifecycleDispatchResult(
      options
    );
}

/* ============================================================
   STATE ADAPTER CONFIGURATION
   ============================================================ */

export function setLifecycleStateAdapter(
  adapter
) {
  return lifecycleService
    .state
    .setLifecycleStateAdapter(
      adapter
    );
}

export function getLifecycleStateAdapter() {
  return lifecycleService
    .state
    .getLifecycleStateAdapter();
}

export function hasLifecycleStateAdapter() {
  return lifecycleService
    .state
    .hasLifecycleStateAdapter();
}

export function assertLifecycleStateAdapter() {
  return lifecycleService
    .state
    .assertLifecycleStateAdapter();
}

/* ============================================================
   STATE CONSTRUCTION
   ============================================================ */

export function createLifecycleOriginSnapshot(
  options
) {
  return lifecycleService
    .state
    .createLifecycleOriginSnapshot(
      options
    );
}

export function createLifecycleManagedEntry(
  options
) {
  return lifecycleService
    .state
    .createLifecycleManagedEntry(
      options
    );
}

export function createLifecycleState(
  options
) {
  return lifecycleService
    .state
    .createLifecycleState(
      options
    );
}

/* ============================================================
   STATE READ / WRITE
   ============================================================ */

export async function readLifecycleState(
  actorReference
) {
  return lifecycleService
    .state
    .readLifecycleState(
      actorReference
    );
}

export async function readRawLifecycleState(
  actorReference
) {
  return lifecycleService
    .state
    .readRawLifecycleState(
      actorReference
    );
}

export async function writeLifecycleState(
  actorReference,
  lifecycleState,
  options
) {
  return lifecycleService
    .state
    .writeLifecycleState(
      actorReference,
      lifecycleState,
      options
    );
}

export async function clearLifecycleState(
  actorReference,
  options
) {
  return lifecycleService
    .state
    .clearLifecycleState(
      actorReference,
      options
    );
}

/* ============================================================
   ENTRY REGISTRATION
   ============================================================ */

export async function registerLifecycleEntry(
  actorReference,
  descriptor,
  options
) {
  return lifecycleService
    .state
    .registerLifecycleEntry(
      actorReference,
      descriptor,
      options
    );
}

export async function registerLifecycleEntries(
  actorReference,
  descriptors,
  options
) {
  return lifecycleService
    .state
    .registerLifecycleEntries(
      actorReference,
      descriptors,
      options
    );
}

export async function registerLifecycleExpiration(
  actorReference,
  options,
  registrationOptions
) {
  return lifecycleService
    .state
    .registerLifecycleExpiration(
      actorReference,
      options,
      registrationOptions
    );
}

export async function registerLifecycleReset(
  actorReference,
  options,
  registrationOptions
) {
  return lifecycleService
    .state
    .registerLifecycleReset(
      actorReference,
      options,
      registrationOptions
    );
}

export async function registerLifecycleEffect(
  actorReference,
  options,
  registrationOptions
) {
  return lifecycleService
    .state
    .registerLifecycleEffect(
      actorReference,
      options,
      registrationOptions
    );
}

/* ============================================================
   ENTRY LOOKUP
   ============================================================ */

export async function getLifecycleEntry(
  actorReference,
  entryId
) {
  return lifecycleService
    .state
    .getLifecycleEntry(
      actorReference,
      entryId
    );
}

export async function getActiveLifecycleEntries(
  actorReference
) {
  return lifecycleService
    .state
    .getActiveLifecycleEntries(
      actorReference
    );
}

export async function getLifecycleEntriesBySubject(
  actorReference,
  options
) {
  return lifecycleService
    .state
    .getLifecycleEntriesBySubject(
      actorReference,
      options
    );
}

export async function getLifecycleEntriesByActor(
  actorReference,
  actorUuid
) {
  return lifecycleService
    .state
    .getLifecycleEntriesByActor(
      actorReference,
      actorUuid
    );
}

export async function getLifecycleEntriesByScope(
  actorReference,
  scope
) {
  return lifecycleService
    .state
    .getLifecycleEntriesByScope(
      actorReference,
      scope
    );
}

export async function getLifecycleEntriesByBoundary(
  actorReference,
  boundary
) {
  return lifecycleService
    .state
    .getLifecycleEntriesByBoundary(
      actorReference,
      boundary
    );
}

export async function getDueLifecycleEntries(
  actorReference,
  lifecycleContext
) {
  return lifecycleService
    .state
    .getDueLifecycleEntries(
      actorReference,
      lifecycleContext
    );
}

/* ============================================================
   ENTRY STATE CONTROL
   ============================================================ */

export async function setLifecycleEntryStatus(
  actorReference,
  entryId,
  status,
  options
) {
  return lifecycleService
    .state
    .setLifecycleEntryStatus(
      actorReference,
      entryId,
      status,
      options
    );
}

export async function markLifecycleEntryExpired(
  actorReference,
  entryId,
  metadata
) {
  return lifecycleService
    .state
    .markLifecycleEntryExpired(
      actorReference,
      entryId,
      metadata
    );
}

export async function markLifecycleEntryReset(
  actorReference,
  entryId,
  metadata
) {
  return lifecycleService
    .state
    .markLifecycleEntryReset(
      actorReference,
      entryId,
      metadata
    );
}

export async function disableLifecycleEntry(
  actorReference,
  entryId,
  metadata
) {
  return lifecycleService
    .state
    .disableLifecycleEntry(
      actorReference,
      entryId,
      metadata
    );
}

export async function enableLifecycleEntry(
  actorReference,
  entryId,
  metadata
) {
  return lifecycleService
    .state
    .enableLifecycleEntry(
      actorReference,
      entryId,
      metadata
    );
}

export async function removeLifecycleEntry(
  actorReference,
  entryId
) {
  return lifecycleService
    .state
    .removeLifecycleEntry(
      actorReference,
      entryId
    );
}

export async function pruneInactiveLifecycleEntries(
  actorReference
) {
  return lifecycleService
    .state
    .pruneInactiveLifecycleEntries(
      actorReference
    );
}

/* ============================================================
   OFFSET / DUE HELPERS
   ============================================================ */

export function getLifecycleOriginTurnIndex(
  entry
) {
  return lifecycleService
    .state
    .getLifecycleOriginTurnIndex(
      entry
    );
}

export function getLifecycleOriginRound(
  entry
) {
  return lifecycleService
    .state
    .getLifecycleOriginRound(
      entry
    );
}

export function isLifecycleTurnOffsetSatisfied(
  entry,
  options
) {
  return lifecycleService
    .state
    .isLifecycleTurnOffsetSatisfied(
      entry,
      options
    );
}

export function isLifecycleRoundOffsetSatisfied(
  entry,
  options
) {
  return lifecycleService
    .state
    .isLifecycleRoundOffsetSatisfied(
      entry,
      options
    );
}

export function doesLifecycleActorBoundaryMatch(
  entry,
  lifecycleContext
) {
  return lifecycleService
    .state
    .doesLifecycleActorBoundaryMatch(
      entry,
      lifecycleContext
    );
}

export function isLifecycleEntryDue(
  entry,
  lifecycleContext
) {
  return lifecycleService
    .state
    .isLifecycleEntryDue(
      entry,
      lifecycleContext
    );
}

/* ============================================================
   OPERATION ADAPTER CONFIGURATION
   ============================================================ */

export function setLifecycleOperationAdapters(
  adapters
) {
  return lifecycleService
    .dispatcher
    .setLifecycleOperationAdapters(
      adapters
    );
}

export function getLifecycleOperationAdapters() {
  return lifecycleService
    .dispatcher
    .getLifecycleOperationAdapters();
}

/* ============================================================
   DISPATCH
   ============================================================ */

export async function resolveDueLifecycleEntries(
  actorReference,
  lifecycleContext
) {
  return lifecycleService
    .dispatcher
    .resolveDueLifecycleEntries(
      actorReference,
      lifecycleContext
    );
}

export async function executeLifecycleEntryOperation(
  entry,
  lifecycleContext
) {
  return lifecycleService
    .dispatcher
    .executeLifecycleEntryOperation(
      entry,
      lifecycleContext
    );
}

export async function dispatchLifecycleContext(
  actorReference,
  lifecycleContext
) {
  return lifecycleService
    .dispatcher
    .dispatchLifecycleContext(
      actorReference,
      lifecycleContext
    );
}

export async function dispatchTurnStartedLifecycle(
  actorReference,
  lifecycleContext
) {
  return lifecycleService
    .dispatcher
    .dispatchTurnStartedLifecycle(
      actorReference,
      lifecycleContext
    );
}

export async function dispatchTurnEndedLifecycle(
  actorReference,
  lifecycleContext
) {
  return lifecycleService
    .dispatcher
    .dispatchTurnEndedLifecycle(
      actorReference,
      lifecycleContext
    );
}

export async function dispatchLifecycleBoundary(
  actorReference,
  lifecycleContext
) {
  return lifecycleService
    .dispatcher
    .dispatchLifecycleBoundary(
      actorReference,
      lifecycleContext
    );
}

/* ============================================================
   SEMANTIC EVENT TRANSLATION
   ============================================================ */

export function createLifecycleContextFromSemanticEvent(
  event
) {
  return lifecycleService
    .hooks
    .createLifecycleContextFromSemanticEvent(
      event
    );
}

export async function dispatchSemanticEventAsLifecycle(
  event
) {
  return lifecycleService
    .hooks
    .dispatchSemanticEventAsLifecycle(
      event
    );
}

/* ============================================================
   SEMANTIC HOOK REGISTRATION
   ============================================================ */

export function registerLifecycleSemanticHooks() {
  return lifecycleService
    .hooks
    .registerLifecycleSemanticHooks();
}

export function unregisterLifecycleSemanticHooks() {
  return lifecycleService
    .hooks
    .unregisterLifecycleSemanticHooks();
}

export function areLifecycleSemanticHooksRegistered() {
  return lifecycleService
    .hooks
    .areLifecycleSemanticHooksRegistered();
}

/* ============================================================
   TURN INDEX CONTROL
   ============================================================ */

export function getLifecycleTurnIndex(
  options
) {
  return lifecycleService
    .hooks
    .getLifecycleTurnIndex(
      options
    );
}

export function setLifecycleTurnIndex(
  value,
  options
) {
  return lifecycleService
    .hooks
    .setLifecycleTurnIndex(
      value,
      options
    );
}

export function clearLifecycleTurnIndex(
  options
) {
  return lifecycleService
    .hooks
    .clearLifecycleTurnIndex(
      options
    );
}

/* ============================================================
   DISPATCH DIAGNOSTICS
   ============================================================ */

export function getLifecycleDispatchForSemanticEvent(
  eventId
) {
  return lifecycleService
    .hooks
    .getLifecycleDispatchForSemanticEvent(
      eventId
    );
}

export function clearLifecycleDispatchForSemanticEvent(
  eventId
) {
  return lifecycleService
    .hooks
    .clearLifecycleDispatchForSemanticEvent(
      eventId
    );
}

export function clearAllLifecycleDispatchDiagnostics() {
  return lifecycleService
    .hooks
    .clearAllLifecycleDispatchDiagnostics();
}

/* ============================================================
   SERVICE CAPABILITIES
   ============================================================ */

export const LIFECYCLE_SERVICE_CAPABILITY =
  Object.freeze({
    LIFECYCLE_CONTEXT:
      "lifecycle-context",

    EXPIRATION:
      "expiration",

    RESET:
      "reset",

    RELATIVE_TURN_EXPIRATION:
      "relative-turn-expiration",

    RELATIVE_ROUND_EXPIRATION:
      "relative-round-expiration",

    ACTOR_BOUND_EXPIRATION:
      "actor-bound-expiration",

    STATE_PERSISTENCE:
      "state-persistence",

    RESOURCE_RESET_DELEGATION:
      "resource-reset-delegation",

    ACTION_ECONOMY_DELEGATION:
      "action-economy-delegation",

    NATIVE_VERIFICATION:
      "native-verification",

    SEMANTIC_EVENT_INTEGRATION:
      "semantic-event-integration",

    TURN_INDEXING:
      "turn-indexing",

    CUSTOM_OPERATION_ADAPTERS:
      "custom-operation-adapters"
  });

export function getLifecycleServiceCapabilities() {
  return Object.freeze(
    Object.values(
      LIFECYCLE_SERVICE_CAPABILITY
    )
  );
}

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getLifecycleServiceDiagnostics() {
  return Object.freeze({
    module:
      Object.freeze({
        id:
          LIFECYCLE_SERVICE_MODULE_ID,

        version:
          LIFECYCLE_SERVICE_MODULE_VERSION
      }),

    capabilities:
      getLifecycleServiceCapabilities(),

    state:
      lifecycleService
        .state
        .getLifecycleStateDiagnostics(),

    dispatcher:
      lifecycleService
        .dispatcher
        .getLifecycleDispatcherDiagnostics(),

    hooks:
      lifecycleService
        .hooks
        .getLifecycleHookDiagnostics()
  });
}

export async function getLifecycleStateSnapshot(
  actorReference
) {
  return lifecycleService
    .state
    .getLifecycleStateSnapshot(
      actorReference
    );
}

/* ============================================================
   RESOURCE SERVICE BOUNDARY
   ============================================================ */

/**
 * @section resource-service-boundary
 *
 * lifecycle_service determines:
 *
 * WHEN a resource resets/restores/expires.
 *
 * resource_service determines:
 *
 * HOW resource state changes.
 *
 * Example:
 *
 * Talent charge resets each round
 *
 * actor-owned/system bridge
 * → LifecycleResetDescriptor
 * → ROUND_STARTED
 * → lifecycle_service
 * → resource_service
 *
 * lifecycle_service must not reimplement resource arithmetic/storage.
 */

/* ============================================================
   ACTION ECONOMY BOUNDARY
   ============================================================ */

/**
 * @section action-economy-boundary
 *
 * lifecycle_service determines:
 *
 * turn started
 * turn ended
 * reaction refresh boundary
 *
 * action_economy determines:
 *
 * Quick/Full/Protocol/Reaction state mutation.
 *
 * Universal:
 *
 * TURN_STARTED
 * → initializeActionEconomyTurn()
 *
 * TURN_ENDED
 * → endActionEconomyTurn()
 */

/* ============================================================
   SEMANTIC EVENT BUS BOUNDARY
   ============================================================ */

/**
 * @section semantic-event-bus-boundary
 *
 * semantic_event_bus transports:
 *
 * turn.started
 * turn.ended
 * round.started
 * round.ended
 * scene.started
 * scene.ended
 * mission.started
 * mission.ended
 * short-rest.completed
 * full-repair.completed
 * execution lifecycle
 * action lifecycle
 *
 * lifecycle-hooks translates those events into LifecycleContext.
 *
 * lifecycle_service does not become a second event bus.
 */

/* ============================================================
   NATIVE AUTHORITY BOUNDARY
   ============================================================ */

/**
 * @section native-authority-boundary
 *
 * LifecycleDescriptor.authority = NATIVE:
 *
 * Frame Conn observes/verifies.
 *
 * It does NOT duplicate native:
 *
 * status removal
 * Limited resets
 * Core Energy reset
 * native effect expiration
 *
 * unless repo trace demonstrates the native pathway is absent and the
 * descriptor is deliberately reclassified as FRAME_CONN-owned.
 */

/* ============================================================
   ACTOR-OWNED FEATURE REGISTRY BOUNDARY
   ============================================================ */

/**
 * @section actor-owned-feature-registry-boundary
 *
 * actor_owned_feature_registry may normalize owned mechanics with:
 *
 * expiration
 * reset
 * duration
 * trigger lifetime
 *
 * Example:
 *
 * once/round Talent
 * → resource declaration
 * + ROUND_STARTED reset descriptor
 *
 * temporary Frame Trait effect
 * → expiration descriptor
 *
 * Registry does not schedule timers itself.
 */

/* ============================================================
   SYSTEM BRIDGE BOUNDARY
   ============================================================ */

/**
 * @section system-bridge-boundary
 *
 * system_bridge may supply missing lifecycle semantics:
 *
 * runtime descriptor
 * {
 *   lifecycle: {
 *     expiration,
 *     resets
 *   }
 * }
 *
 * Those descriptors are registered through lifecycle_service.
 *
 * Bridge may supplement.
 * Lifecycle service owns execution timing.
 */

/* ============================================================
   TARGETING / SPATIAL BOUNDARY
   ============================================================ */

/**
 * @section targeting-spatial-boundary
 *
 * lifecycle_service should not own:
 *
 * range
 * threat
 * sensors
 * LOS
 * adjacency
 * position
 * movement geometry
 *
 * targeting_spatial_service owns those.
 *
 * Lifecycle metadata may reference actor/token identity only as needed for
 * expiration ownership.
 */

/* ============================================================
   FRAME CONN RUNTIME COMPOSITION
   ============================================================ */

/**
 * @section frame-conn-runtime-composition
 *
 * Recommended setup:
 *
 * semantic_event_bus
 *       │
 *       ▼
 * lifecycle_service
 *
 *
 * Runtime initialization:
 *
 * 1. configure lifecycle state adapter
 *
 *    setLifecycleStateAdapter(...)
 *
 * 2. configure lifecycle operation adapters
 *
 *    setLifecycleOperationAdapters({
 *      status,
 *      condition,
 *      effect,
 *      feature,
 *      preparedAction,
 *      grantedAction,
 *      movement,
 *      nhp,
 *      nativeVerifier
 *    })
 *
 * 3. register semantic lifecycle hooks
 *
 *    registerLifecycleSemanticHooks()
 *
 * Do this once during top-level runtime composition.
 */

/* ============================================================
   LIFECYCLE DATA FLOW
   ============================================================ */

/**
 * @section lifecycle-data-flow
 *
 * Semantic boundary:
 *
 * turn.started
 *        │
 *        ▼
 * semantic_event_bus
 *        │
 *        ▼
 * lifecycle-hooks
 *        │
 *        ▼
 * LifecycleContext
 *        │
 *        ▼
 * lifecycle-dispatcher
 *        │
 *        ├── action_economy
 *        ├── resource_service
 *        ├── native verifier
 *        └── injected status/effect adapters
 *        │
 *        ▼
 * lifecycle-state terminal update
 */

/* ============================================================
   TEMPORARY EFFECT FLOW
   ============================================================ */

/**
 * @section temporary-effect-flow
 *
 * mechanic applies temporary state
 *        +
 * creates LifecycleExpirationDescriptor
 *        │
 *        ▼
 * registerLifecycleEntry()
 *        │
 *        ▼
 * lifecycle-state
 *
 * later:
 *
 * lifecycle event
 *        │
 *        ▼
 * lifecycle-dispatcher
 *        │
 *        ▼
 * owning state service removes/expires mechanic
 *        │
 *        ▼
 * lifecycle entry marked EXPIRED
 */

/* ============================================================
   FREQUENCY RESET FLOW
   ============================================================ */

/**
 * @section frequency-reset-flow
 *
 * actor-owned/system bridge:
 *
 * 1/round feature
 *        │
 *        ├── resource declaration
 *        └── LifecycleResetDescriptor
 *
 * ROUND_STARTED
 *        │
 *        ▼
 * lifecycle_service
 *        │
 *        ▼
 * resource_service
 *        │
 *        ▼
 * charge/use restored
 */

/* ============================================================
   PUBLIC BOUNDARY RULES
   ============================================================ */

/**
 * @section public-boundary-rules
 *
 * RULE 1
 *
 * Higher runtime code should import lifecycle-service.js rather than
 * lifecycle implementation siblings.
 *
 *
 * RULE 2
 *
 * Feature code should describe expiration/reset with lifecycle descriptors
 * rather than install independent timers/hooks.
 *
 *
 * RULE 3
 *
 * Lifecycle timing must delegate state mutation to the owning service.
 *
 *
 * RULE 4
 *
 * Native-owned lifecycle changes must not be duplicated.
 *
 *
 * RULE 5
 *
 * Relative "next turn" timing should use monotonic lifecycle turn index,
 * not rotating Foundry combat.turn position.
 */

/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */

/**
 * @section dependency-direction
 *
 * Intended:
 *
 * semantic_event_bus
 *        │
 *        ▼
 * lifecycle_service
 *        │
 *        ├── resource_service
 *        ├── action_economy
 *        └── injected state-operation adapters
 *
 *
 * actor_owned_feature_registry
 *        │
 *        ▼
 * lifecycle_service
 *
 * for descriptor registration.
 *
 *
 * future system_bridge
 *        │
 *        ▼
 * lifecycle_service
 *
 * for augmented lifecycle descriptors.
 *
 *
 * Forbidden:
 *
 * lifecycle_service
 * → runtime-orchestrator
 *
 * lifecycle_service
 * → UI
 *
 * lifecycle_service
 * → actor_owned_feature_registry
 *
 * lifecycle_service
 * → system_bridge
 */

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * semantic_event_bus/
 * -------------------
 *
 * Supplies stable lifecycle boundaries.
 *
 *
 * feature_turn/
 * -------------
 *
 * Remains underlying turn-state authority through action_economy.
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns turn economy mutations.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns resource mutation.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Remains native Lancer state authority beneath operation adapters.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Supplies execution lifecycle events indirectly through semantic_event_bus.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Should not manually manage per-feature timers/resets once lifecycle
 * descriptors are registered.
 *
 *
 * future actor_owned_feature_registry/
 * ------------------------------------
 *
 * Will surface lifecycle-bearing owned mechanics.
 *
 *
 * future system_bridge/
 * ---------------------
 *
 * Will supplement missing lifecycle metadata.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * lifecycle-service.js is the public Frame Conn lifecycle boundary.
 *
 * INVARIANT 2
 * Contract owns lifecycle shapes/vocabulary.
 *
 * INVARIANT 3
 * State owns lifecycle timing persistence.
 *
 * INVARIANT 4
 * Dispatcher owns due-entry resolution and operation delegation.
 *
 * INVARIANT 5
 * Hooks own semantic_event_bus integration.
 *
 * INVARIANT 6
 * lifecycle_service owns WHEN, not HOW, authoritative mechanic state
 * changes.
 *
 * INVARIANT 7
 * resource_service remains resource mutation authority.
 *
 * INVARIANT 8
 * action_economy remains action-economy mutation authority.
 *
 * INVARIANT 9
 * native_adapter remains native Lancer state authority.
 *
 * INVARIANT 10
 * Relative turn expiration uses monotonic lifecycle turn index.
 *
 * INVARIANT 11
 * Native-owned lifecycle changes are verified/skipped rather than
 * duplicated.
 *
 * INVARIANT 12
 * Temporary feature effects should use descriptors rather than private
 * timing systems.
 *
 * INVARIANT 13
 * actor_owned_feature_registry may register descriptors but does not own
 * lifecycle timing.
 *
 * INVARIANT 14
 * system_bridge may supplement lifecycle descriptors but does not become
 * the lifecycle engine.
 *
 * INVARIANT 15
 * Higher runtime modules should converge on this public boundary rather
 * than invent parallel lifecycle systems.
 */