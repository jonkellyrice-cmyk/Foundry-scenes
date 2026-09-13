/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_execution_context/execution-context.js
 */

/**
 * @file
 * @path main/semantic_execution_context/execution-context.js
 * @module execution-context
 * @layer semantic-execution-context-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-semantic-execution-context-api
 * @public-boundary true
 * @side-effects delegated-native-resolution-only
 *
 * @depends-on
 * - execution-context-contract
 * - execution-context-builder
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by runtime-orchestrator.js
 * - consumed by execution_transaction/*
 * - consumed by resource_service/*
 * - consumed by action_economy/*
 * - consumed by targeting_spatial_service/*
 * - consumed by semantic_event_bus/*
 * - consumed by lifecycle_service/*
 * - consumed by execution-strategy runtimes
 * - consumed by granted-action / reaction / Prepare runtimes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature-contract.js remains semantic feature-definition authority
 * - feature-registry.js / feature-registry-core.js remain registration authority
 * - native_adapter/ remains native Lancer integration authority
 * - runtime-orchestrator.js remains high-level runtime coordinator
 * - feature_turn/ remains turn-feature composition
 * - feature_movement/ remains movement-feature composition/tracking
 *
 * THIS FILE OWNS:
 * - public semantic_execution_context façade
 * - stable namespace composition
 * - common context-building entry points
 * - common context predicates/accessors
 * - context diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - native Actor/Item resolution implementation
 * - action economy
 * - resource orchestration
 * - target legality
 * - lifecycle
 * - semantic event dispatch
 * - native Flow execution
 * - feature-specific mechanics
 *
 * EDIT CONTRACT:
 * - keep façade thin
 * - do not add tabletop rules here
 * - builders belong in execution-context-builder.js
 * - shapes/constants belong in execution-context-contract.js
 * - preserve stable exports once higher layers consume them
 */

/* ============================================================
   MODULE IMPORTS
   ============================================================ */

/**
 * @section module-imports
 */

import * as contract from "./execution-context-contract.js";
import * as builder from "./execution-context-builder.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

/**
 * @section module-identity
 */

export const EXECUTION_CONTEXT_MODULE_ID =
  "lancer-frame-conn.semantic-execution-context";

export const EXECUTION_CONTEXT_MODULE_VERSION =
  1;

/* ============================================================
   PUBLIC NAMESPACE
   ============================================================ */

/**
 * @section public-namespace
 *
 * Preferred higher-layer access:
 *
 * executionContext.contract.*
 * executionContext.builder.*
 *
 * Higher layers should generally import this public boundary rather than
 * importing contract/builder implementation files independently.
 */

export const executionContext =
  Object.freeze({
    id:
      EXECUTION_CONTEXT_MODULE_ID,

    version:
      EXECUTION_CONTEXT_MODULE_VERSION,

    contract,
    builder
  });

/* ============================================================
   COMMON ROOT BUILDER
   ============================================================ */

/**
 * @section common-root-builder
 */

export async function buildExecutionContext(
  options
) {
  return executionContext
    .builder
    .buildExecutionContext(
      options
    );
}

/* ============================================================
   COMMON CHILD BUILDER
   ============================================================ */

/**
 * @section common-child-builder
 */

export async function buildChildExecutionContext(
  parentContext,
  options
) {
  return executionContext
    .builder
    .buildChildExecutionContext(
      parentContext,
      options
    );
}

/* ============================================================
   SPECIALIZED BUILDERS
   ============================================================ */

/**
 * @section specialized-builders
 */

export async function buildWeaponExecutionContext(
  options
) {
  return executionContext
    .builder
    .buildWeaponExecutionContext(
      options
    );
}

export async function buildNativeActionExecutionContext(
  options
) {
  return executionContext
    .builder
    .buildNativeActionExecutionContext(
      options
    );
}

export async function buildGrantedActionExecutionContext(
  parentContext,
  options
) {
  return executionContext
    .builder
    .buildGrantedActionExecutionContext(
      parentContext,
      options
    );
}

export async function buildPreparedActionExecutionContext(
  parentContext,
  options
) {
  return executionContext
    .builder
    .buildPreparedActionExecutionContext(
      parentContext,
      options
    );
}

export async function buildSecondaryAttackExecutionContext(
  parentContext,
  options
) {
  return executionContext
    .builder
    .buildSecondaryAttackExecutionContext(
      parentContext,
      options
    );
}

export async function buildReactionExecutionContext(
  parentContext,
  options
) {
  return executionContext
    .builder
    .buildReactionExecutionContext(
      parentContext,
      options
    );
}

export async function buildMovementExecutionContext(
  options
) {
  return executionContext
    .builder
    .buildMovementExecutionContext(
      options
    );
}

/* ============================================================
   REBUILD / REVALIDATION SUPPORT
   ============================================================ */

/**
 * @section rebuild-revalidation-support
 *
 * Refreshes native identity portions of an immutable context.
 *
 * Does NOT perform:
 *
 * action legality
 * Range/LOS
 * resource validation
 * action-economy validation
 */

export async function rebuildExecutionContext(
  context
) {
  return executionContext
    .builder
    .rebuildExecutionContext(
      context
    );
}

/* ============================================================
   CONTEXT ASSERTION
   ============================================================ */

/**
 * @section context-assertion
 */

export function assertExecutionContext(
  context
) {
  return executionContext
    .contract
    .assertExecutionContext(
      context
    );
}

/* ============================================================
   CONTEXT PHASE
   ============================================================ */

/**
 * @section context-phase
 *
 * execution_transaction/ owns valid phase transitions.
 *
 * These helpers only produce immutable patched context snapshots.
 */

export function setExecutionContextPhase(
  context,
  phase
) {
  return executionContext
    .contract
    .setExecutionContextPhase(
      context,
      phase
    );
}

export function patchExecutionContext(
  context,
  patch
) {
  return executionContext
    .contract
    .patchExecutionContext(
      context,
      patch
    );
}

/* ============================================================
   TARGET HELPERS
   ============================================================ */

/**
 * @section target-helpers
 */

export function setExecutionTargets(
  context,
  targets
) {
  return executionContext
    .contract
    .setExecutionTargets(
      context,
      targets
    );
}

export function addExecutionTarget(
  context,
  target
) {
  return executionContext
    .contract
    .addExecutionTarget(
      context,
      target
    );
}

/* ============================================================
   FLAG HELPERS
   ============================================================ */

/**
 * @section flag-helpers
 */

export function patchExecutionFlags(
  context,
  flags
) {
  return executionContext
    .contract
    .patchExecutionFlags(
      context,
      flags
    );
}

/* ============================================================
   EXECUTION IDENTITY ACCESSORS
   ============================================================ */

/**
 * @section execution-identity-accessors
 */

export function getExecutionId(
  context
) {
  return (
    context
      ?.identity
      ?.executionId ??
    null
  );
}

export function getParentExecutionId(
  context
) {
  return (
    context
      ?.identity
      ?.parentExecutionId ??
    null
  );
}

export function getRootExecutionId(
  context
) {
  return (
    context
      ?.identity
      ?.rootExecutionId ??
    null
  );
}

export function getExecutionDepth(
  context
) {
  return (
    context
      ?.lineage
      ?.depth ??
    0
  );
}

/* ============================================================
   ACTOR ACCESSORS
   ============================================================ */

/**
 * @section actor-accessors
 *
 * Returns normalized native references carried by the ExecutionContext.
 *
 * Resolve through native_adapter only when authoritative native documents
 * are actually required.
 */

export function getExecutionActor(
  context
) {
  return (
    context
      ?.actors
      ?.actor ??
    null
  );
}

export function getExecutionPilot(
  context
) {
  return (
    context
      ?.actors
      ?.pilot ??
    null
  );
}

export function getExecutionMech(
  context
) {
  return (
    context
      ?.actors
      ?.mech ??
    null
  );
}

export function getExecutionControllerMode(
  context
) {
  return (
    context
      ?.actors
      ?.controllerMode ??
    contract
      .EXECUTION_CONTROLLER_MODE
      .NONE
  );
}

/* ============================================================
   SEMANTIC ACTION ACCESSORS
   ============================================================ */

/**
 * @section semantic-action-accessors
 */

export function getSemanticActionId(
  context
) {
  return (
    context
      ?.semanticAction
      ?.id ??
    null
  );
}

export function getSemanticActionDefinition(
  context
) {
  return (
    context
      ?.semanticAction
      ?.definition ??
    null
  );
}

export function getExecutionActivationType(
  context
) {
  return (
    context
      ?.economy
      ?.activationType ??
    context
      ?.semanticAction
      ?.activationType ??
    contract
      .EXECUTION_ACTIVATION_TYPE
      .NONE
  );
}

/* ============================================================
   SOURCE ACCESSORS
   ============================================================ */

/**
 * @section source-accessors
 */

export function getExecutionSourceKind(
  context
) {
  return (
    context
      ?.source
      ?.kind ??
    contract
      .EXECUTION_SOURCE_KIND
      .UNKNOWN
  );
}

export function getExecutionSourceItemUuid(
  context
) {
  return (
    context
      ?.source
      ?.nativeItemUuid ??
    null
  );
}

export function getExecutionSourceItemLid(
  context
) {
  return (
    context
      ?.source
      ?.nativeItemLid ??
    null
  );
}

export function getExecutionSourceActionPath(
  context
) {
  return (
    context
      ?.source
      ?.nativeActionPath ??
    null
  );
}

export function getExecutionSourceFeatureId(
  context
) {
  return (
    context
      ?.source
      ?.sourceFeatureId ??
    null
  );
}

export function getExecutionSourceIdentity(
  context
) {
  return executionContext
    .contract
    .getExecutionSourceIdentity(
      context
    );
}

/* ============================================================
   WEAPON ACCESSORS
   ============================================================ */

/**
 * @section weapon-accessors
 */

export function getExecutionWeapon(
  context
) {
  return (
    context
      ?.weapon
      ?.weapon ??
    null
  );
}

export function getExecutionWeaponUuid(
  context
) {
  return (
    getExecutionWeapon(
      context
    )
      ?.uuid ??
    null
  );
}

export function getExecutionWeaponProfileIndex(
  context
) {
  return (
    context
      ?.weapon
      ?.profileIndex ??
    null
  );
}

export function getExecutionWeaponProfileName(
  context
) {
  return (
    context
      ?.weapon
      ?.profileName ??
    null
  );
}

export function getExecutionMount(
  context
) {
  return (
    context
      ?.weapon
      ?.mount ??
    null
  );
}

export function getExecutionMountIndex(
  context
) {
  return (
    getExecutionMount(
      context
    )
      ?.mountIndex ??
    null
  );
}

export function getExecutionMountSlot(
  context
) {
  return (
    context
      ?.weapon
      ?.slot ??
    null
  );
}

export function getExecutionWeaponMod(
  context
) {
  return (
    context
      ?.weapon
      ?.mod ??
    null
  );
}

/* ============================================================
   TARGET ACCESSORS
   ============================================================ */

/**
 * @section target-accessors
 */

export function getExecutionTargets(
  context
) {
  return (
    context
      ?.targets ??
    Object.freeze([])
  );
}

export function getExecutionTargetCount(
  context
) {
  return (
    context
      ?.targets
      ?.length ??
    0
  );
}

export function getExecutionTargetActorUuids(
  context
) {
  return Object.freeze(
    getExecutionTargets(
      context
    )
      .map(
        target =>
          target?.actorUuid ??
          null
      )
      .filter(Boolean)
  );
}

export function getExecutionTargetTokenUuids(
  context
) {
  return Object.freeze(
    getExecutionTargets(
      context
    )
      .map(
        target =>
          target?.tokenUuid ??
          null
      )
      .filter(Boolean)
  );
}

export function hasExecutionTargets(
  context
) {
  return (
    getExecutionTargetCount(
      context
    ) > 0
  );
}

/* ============================================================
   TEMPLATE ACCESSORS
   ============================================================ */

/**
 * @section template-accessors
 */

export function getExecutionTemplate(
  context
) {
  return (
    context?.template ??
    null
  );
}

export function hasExecutionTemplate(
  context
) {
  return Boolean(
    getExecutionTemplate(
      context
    )
  );
}

/* ============================================================
   MOVEMENT ACCESSORS
   ============================================================ */

/**
 * @section movement-accessors
 */

export function getExecutionMovement(
  context
) {
  return (
    context?.movement ??
    null
  );
}

export function getExecutionMovementMode(
  context
) {
  return (
    context
      ?.movement
      ?.mode ??
    contract
      .EXECUTION_MOVEMENT_MODE
      .NONE
  );
}

export function getExecutionPlannedMovementCost(
  context
) {
  return (
    context
      ?.movement
      ?.plannedCost ??
    null
  );
}

export function getExecutionActualMovementCost(
  context
) {
  return (
    context
      ?.movement
      ?.actualCost ??
    null
  );
}

/* ============================================================
   RESOURCE ACCESSORS
   ============================================================ */

/**
 * @section resource-accessors
 *
 * ResourceDescriptor semantics remain owned by resource_service/.
 */

export function getExecutionResourceContext(
  context
) {
  return (
    context?.resources ??
    null
  );
}

export function getRequiredExecutionResources(
  context
) {
  return (
    context
      ?.resources
      ?.required ??
    Object.freeze([])
  );
}

export function getDeferredExecutionResources(
  context
) {
  return (
    context
      ?.resources
      ?.deferred ??
    Object.freeze([])
  );
}

export function getNativeConsumedExecutionResources(
  context
) {
  return (
    context
      ?.resources
      ?.nativeConsumed ??
    Object.freeze([])
  );
}

/* ============================================================
   ECONOMY ACCESSORS
   ============================================================ */

/**
 * @section economy-accessors
 */

export function getExecutionEconomyContext(
  context
) {
  return (
    context?.economy ??
    null
  );
}

export function getExecutionRequestedCost(
  context
) {
  return (
    context
      ?.economy
      ?.requestedCost ??
    null
  );
}

export function getExecutionCostOverride(
  context
) {
  return (
    context
      ?.economy
      ?.costOverride ??
    null
  );
}

export function getExecutionReactionTrigger(
  context
) {
  return (
    context
      ?.economy
      ?.reactionTrigger ??
    null
  );
}

/* ============================================================
   EXECUTION PREDICATES
   ============================================================ */

/**
 * @section execution-predicates
 */

export function isChildExecution(
  context
) {
  return executionContext
    .contract
    .isChildExecution(
      context
    );
}

export function isSecondaryAttackExecution(
  context
) {
  return executionContext
    .contract
    .isSecondaryAttackExecution(
      context
    );
}

export function isGrantedActionExecution(
  context
) {
  return executionContext
    .contract
    .isGrantedActionExecution(
      context
    );
}

export function isPreparedActionExecution(
  context
) {
  return executionContext
    .contract
    .isPreparedActionExecution(
      context
    );
}

export function isAiControlledExecution(
  context
) {
  return executionContext
    .contract
    .isAiControlledExecution(
      context
    );
}

export function isCascadeControlledExecution(
  context
) {
  return executionContext
    .contract
    .isCascadeControlledExecution(
      context
    );
}

export function isReactionExecution(
  context
) {
  return Boolean(
    context
      ?.flags
      ?.reactionExecution ||
    getExecutionActivationType(
      context
    ) ===
      contract
        .EXECUTION_ACTIVATION_TYPE
        .REACTION
  );
}

export function isMovementExecution(
  context
) {
  return Boolean(
    getExecutionMovement(
      context
    ) ||
    getExecutionActivationType(
      context
    ) ===
      contract
        .EXECUTION_ACTIVATION_TYPE
        .MOVEMENT
  );
}

export function isWeaponExecution(
  context
) {
  return Boolean(
    getExecutionWeapon(
      context
    )
  );
}

/* ============================================================
   EXECUTION FLAG ACCESS
   ============================================================ */

/**
 * @section execution-flag-access
 */

export function hasExecutionFlag(
  context,
  flagKey
) {
  if (
    typeof flagKey !== "string" ||
    flagKey.length === 0
  ) {
    return false;
  }

  return Boolean(
    context
      ?.flags
      ?.[flagKey]
  );
}

export function shouldSuppressBonusDamage(
  context
) {
  return hasExecutionFlag(
    context,
    contract
      .EXECUTION_FLAG
      .SUPPRESS_BONUS_DAMAGE
  );
}

export function shouldSuppressSelfHeat(
  context
) {
  return hasExecutionFlag(
    context,
    contract
      .EXECUTION_FLAG
      .SUPPRESS_SELF_HEAT
  );
}

export function shouldSuppressSpecialRecursion(
  context
) {
  return hasExecutionFlag(
    context,
    contract
      .EXECUTION_FLAG
      .SUPPRESS_SPECIAL_RECURSION
  );
}

export function shouldSuppressPilotFeatures(
  context
) {
  return hasExecutionFlag(
    context,
    contract
      .EXECUTION_FLAG
      .SUPPRESS_PILOT_FEATURES
  );
}

export function shouldIgnoreActionCost(
  context
) {
  return hasExecutionFlag(
    context,
    contract
      .EXECUTION_FLAG
      .IGNORE_ACTION_COST
  );
}

export function shouldIgnoreMovementCost(
  context
) {
  return hasExecutionFlag(
    context,
    contract
      .EXECUTION_FLAG
      .IGNORE_MOVEMENT_COST
  );
}

/* ============================================================
   ROOT / LINEAGE HELPERS
   ============================================================ */

/**
 * @section root-lineage-helpers
 */

export function sharesExecutionRoot(
  firstContext,
  secondContext
) {
  const firstRoot =
    getRootExecutionId(
      firstContext
    );

  const secondRoot =
    getRootExecutionId(
      secondContext
    );

  return Boolean(
    firstRoot &&
    secondRoot &&
    firstRoot === secondRoot
  );
}

export function isDirectChildOf(
  childContext,
  parentContext
) {
  return Boolean(
    getParentExecutionId(
      childContext
    ) &&
    getParentExecutionId(
      childContext
    ) ===
      getExecutionId(
        parentContext
      )
  );
}

export function getExecutionLineageChain(
  context
) {
  return (
    context
      ?.lineage
      ?.chain ??
    Object.freeze([])
  );
}

/* ============================================================
   STRATEGY KEY SUPPORT
   ============================================================ */

/**
 * @section strategy-key-support
 *
 * Strategy registry may use these fields in priority order.
 */

export function createExecutionStrategyIdentity(
  context
) {
  return Object.freeze({
    semanticActionId:
      getSemanticActionId(
        context
      ),

    sourceKind:
      getExecutionSourceKind(
        context
      ),

    sourceItemUuid:
      getExecutionSourceItemUuid(
        context
      ),

    sourceItemLid:
      getExecutionSourceItemLid(
        context
      ),

    sourceActionPath:
      getExecutionSourceActionPath(
        context
      ),

    weaponProfileIndex:
      getExecutionWeaponProfileIndex(
        context
      ),

    weaponProfileName:
      getExecutionWeaponProfileName(
        context
      )
  });
}

/* ============================================================
   CONTEXT DIAGNOSTICS
   ============================================================ */

/**
 * @section context-diagnostics
 */

export function getExecutionContextDiagnostics(
  context
) {
  return executionContext
    .builder
    .getExecutionContextDiagnostics(
      context
    );
}

/* ============================================================
   MODULE DIAGNOSTICS
   ============================================================ */

/**
 * @section module-diagnostics
 */

export function getExecutionContextModuleDiagnostics() {
  return Object.freeze({
    id:
      EXECUTION_CONTEXT_MODULE_ID,

    version:
      EXECUTION_CONTEXT_MODULE_VERSION,

    contractAvailable:
      Boolean(
        executionContext.contract
      ),

    builderAvailable:
      Boolean(
        executionContext.builder
      )
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
 * This is the semantic execution boundary runtime-orchestrator should use.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → executionContext.buildExecutionContext(...)
 * → execution_transaction
 *
 * Runtime orchestrator should not manually build actor/item/target bags
 * once migrated.
 *
 *
 * feature-contract.js
 * -------------------
 *
 * Continues to own action definitions.
 *
 * Typical flow:
 *
 * feature-contract definition
 * → feature-registry lookup
 * → buildExecutionContext({
 *      semanticActionDefinition
 *    })
 *
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 *
 * Continue to own declared action registration.
 *
 * Registry IDs and definitions are preserved in:
 *
 * context.semanticAction
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Runtime-discovered:
 *
 * Trait actions
 * Talent actions
 * Core Bonus actions
 * System actions
 * Weapon actions
 *
 * should also build this same ExecutionContext shape.
 *
 * Declared and actor-owned actions therefore converge before transaction
 * execution.
 *
 *
 * native_adapter/
 * ---------------
 *
 * execution-context-builder resolves native identity through nativeAdapter.
 *
 * Higher semantic layers should use this module's context accessors rather
 * than reading native Item/Actor paths directly.
 *
 *
 * feature_turn/
 * -------------
 *
 * Provides current turn/controller/action state.
 *
 * This module carries:
 *
 * controllerMode
 * activationType
 * reactionTrigger
 *
 * but does not own their authoritative runtime state.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Existing movement tracker remains authoritative for actual movement
 * expenditure.
 *
 * This module carries one execution's movement semantic context only.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * This module is the intended input boundary.
 *
 * Transaction flow should accept:
 *
 * ExecutionContext
 *
 * not an unrelated argument bag.
 *
 *
 * resource_service/
 * -----------------
 *
 * Should discover/validate resources using:
 *
 * context.source
 * context.weapon
 * context.semanticAction
 * context.resources
 *
 *
 * action_economy/
 * ---------------
 *
 * Should consume:
 *
 * context.economy
 * context.flags
 * context.semanticAction
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Should consume:
 *
 * context.actors
 * context.targets
 * context.template
 * context.weapon
 *
 * and return an updated immutable ExecutionContext where needed.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Event envelopes should carry:
 *
 * executionId
 * rootExecutionId
 * parentExecutionId
 * semantic action identity
 * source identity
 *
 * from this context.
 *
 *
 * execution-strategy registry
 * ---------------------------
 *
 * Use:
 *
 * createExecutionStrategyIdentity(context)
 *
 * as the normalized lookup input.
 *
 * Do not parse effect prose for runtime strategy selection.
 */

/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */

/**
 * @section dependency-direction
 *
 * Intended:
 *
 * feature definitions / actor-owned features
 *                │
 *                ▼
 * execution-context
 *                │
 *                ▼
 * execution_transaction
 *        ┌───────┼────────┐
 *        ▼       ▼        ▼
 * action_economy resource targeting
 *        │       │        │
 *        └───────┴────────┘
 *                │
 *                ▼
 *          native_adapter
 *
 *
 * Forbidden:
 *
 * execution-context
 * → execution_transaction
 *
 * execution-context
 * → action_economy implementation
 *
 * execution-context
 * → resource_service implementation
 *
 * execution-context
 * → UI
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * execution-context.js is the public semantic execution-context boundary.
 *
 * INVARIANT 2
 * Higher runtime layers should prefer this façade over direct imports from
 * execution-context-contract.js or execution-context-builder.js.
 *
 * INVARIANT 3
 * This file contains no tabletop action rules.
 *
 * INVARIANT 4
 * This file performs no direct native Lancer document access.
 *
 * INVARIANT 5
 * Builder owns construction; contract owns shapes; façade owns exposure.
 *
 * INVARIANT 6
 * ExecutionContext remains immutable snapshot state.
 *
 * INVARIANT 7
 * Native source identity and semantic action identity remain separate.
 *
 * INVARIANT 8
 * Parent/child/root execution identity must remain accessible throughout
 * the entire execution chain.
 *
 * INVARIANT 9
 * Context accessors do not establish action legality.
 *
 * INVARIANT 10
 * Controller, economy, resource, targeting, movement, and lifecycle
 * authority remains in their owning services.
 *
 * INVARIANT 11
 * Strategy identity must use structured semantic/native identity, not
 * runtime prose parsing.
 *
 * INVARIANT 12
 * Existing Frame Conn architecture should migrate into this boundary
 * incrementally rather than through parallel context models.
 */