/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-adapter.js
 */

/**
 * @file
 * @path main/native_adapter/native-adapter.js
 * @module native-adapter
 * @layer native-adapter-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-boundary-over-native-lancer-runtime
 * @public-boundary true
 * @side-effects delegated-only
 *
 * @depends-on
 * - native-contract
 * - native-actors
 * - native-items
 * - native-loadout
 * - native-resources
 * - native-status
 * - native-rolls
 * - native-combat
 * - native-execution
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - intended replacement boundary for direct native calls currently
 *   scattered through foundry-integration-feature.js and feature code
 * - consumed by execution_transaction/*
 * - consumed by semantic_execution_context/*
 * - consumed by resource_service/*
 * - consumed by actor_owned_feature_registry/*
 * - consumed by action_economy/* where native state reads are required
 * - consumed indirectly by runtime-orchestrator.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - runtime-orchestrator.js remains high-level runtime coordinator
 * - feature-contract.js remains semantic action/feature contract
 * - feature-registry.js / feature-registry-core.js remain semantic registries
 * - feature_turn/ remains turn-feature composition
 * - feature_movement/ remains movement tracking/composition
 * - foundry-integration-feature.js may migrate incrementally into this boundary
 *
 * THIS FILE OWNS:
 * - composition of native adapter submodules
 * - stable namespace exported to the rest of Frame Conn
 * - adapter capability inspection
 * - migration-safe public access to native primitives
 *
 * THIS FILE DOES NOT OWN:
 * - any tabletop rules
 * - action economy
 * - resource orchestration
 * - feature frequency
 * - lifecycle timing
 * - targeting legality
 * - movement/pathfinding
 * - feature discovery
 * - special weapon/system/talent/core-bonus behavior
 * - NHP controller state
 * - Jockey state
 *
 * EDIT CONTRACT:
 * - keep this façade thin
 * - do not add mechanical logic here
 * - new native functionality belongs in the appropriate native-* module
 * - preserve stable namespace names once consumed by higher layers
 */

/* ============================================================
   MODULE IMPORTS
   ============================================================ */

/**
 * @section module-imports
 */

import * as contract from "./native-contract.js";
import * as actors from "./native-actors.js";
import * as items from "./native-items.js";
import * as loadout from "./native-loadout.js";
import * as resources from "./native-resources.js";
import * as status from "./native-status.js";
import * as rolls from "./native-rolls.js";
import * as combat from "./native-combat.js";
import * as execution from "./native-execution.js";

/* ============================================================
   ADAPTER IDENTITY
   ============================================================ */

/**
 * @section adapter-identity
 */

export const NATIVE_ADAPTER_ID =
  "lancer-frame-conn.native-adapter";

export const NATIVE_ADAPTER_VERSION =
  1;

/* ============================================================
   CAPABILITY CONTRACT
   ============================================================ */

/**
 * @section capability-contract
 *
 * Capability flags answer only:
 *
 * "Is this adapter function/module available?"
 *
 * They do NOT answer:
 *
 * "Is this particular action legal right now?"
 */

export const NATIVE_ADAPTER_CAPABILITY =
  Object.freeze({
    CONTRACT:
      "contract",

    ACTORS:
      "actors",

    ITEMS:
      "items",

    LOADOUT:
      "loadout",

    RESOURCES:
      "resources",

    STATUS:
      "status",

    ROLLS:
      "rolls",

    COMBAT:
      "combat",

    EXECUTION:
      "execution"
  });

/* ============================================================
   PUBLIC ADAPTER NAMESPACE
   ============================================================ */

/**
 * @section public-adapter-namespace
 *
 * Higher Frame Conn layers should prefer:
 *
 * nativeAdapter.actors.*
 * nativeAdapter.items.*
 * nativeAdapter.execution.*
 *
 * rather than importing native submodules directly.
 *
 * Internal native_adapter files may import one another where required.
 */

export const nativeAdapter =
  Object.freeze({
    id:
      NATIVE_ADAPTER_ID,

    version:
      NATIVE_ADAPTER_VERSION,

    contract,
    actors,
    items,
    loadout,
    resources,
    status,
    rolls,
    combat,
    execution
  });

/* ============================================================
   CAPABILITY INSPECTION
   ============================================================ */

/**
 * @section capability-inspection
 */

export function hasNativeAdapterCapability(
  capability
) {
  switch (capability) {
    case NATIVE_ADAPTER_CAPABILITY.CONTRACT:
      return Boolean(
        nativeAdapter.contract
      );

    case NATIVE_ADAPTER_CAPABILITY.ACTORS:
      return Boolean(
        nativeAdapter.actors
      );

    case NATIVE_ADAPTER_CAPABILITY.ITEMS:
      return Boolean(
        nativeAdapter.items
      );

    case NATIVE_ADAPTER_CAPABILITY.LOADOUT:
      return Boolean(
        nativeAdapter.loadout
      );

    case NATIVE_ADAPTER_CAPABILITY.RESOURCES:
      return Boolean(
        nativeAdapter.resources
      );

    case NATIVE_ADAPTER_CAPABILITY.STATUS:
      return Boolean(
        nativeAdapter.status
      );

    case NATIVE_ADAPTER_CAPABILITY.ROLLS:
      return Boolean(
        nativeAdapter.rolls
      );

    case NATIVE_ADAPTER_CAPABILITY.COMBAT:
      return Boolean(
        nativeAdapter.combat
      );

    case NATIVE_ADAPTER_CAPABILITY.EXECUTION:
      return Boolean(
        nativeAdapter.execution
      );

    default:
      return false;
  }
}

export function getNativeAdapterCapabilities() {
  return Object.freeze(
    Object.values(
      NATIVE_ADAPTER_CAPABILITY
    )
      .filter(
        capability =>
          hasNativeAdapterCapability(
            capability
          )
      )
  );
}

/* ============================================================
   RUNTIME AVAILABILITY
   ============================================================ */

/**
 * @section runtime-availability
 *
 * The adapter module may load before Foundry/Lancer runtime is fully ready.
 *
 * This check is intentionally shallow.
 */

export function isFoundryRuntimeAvailable() {
  return Boolean(
    globalThis.game
  );
}

export function isLancerRuntimeAvailable() {
  return Boolean(
    globalThis.game
      ?.lancer
  );
}

export function isNativeFlowRegistryAvailable() {
  return Boolean(
    globalThis.game
      ?.lancer
      ?.flows &&
    typeof globalThis.game
      .lancer
      .flows
      .get === "function"
  );
}

export function isNativeAdapterRuntimeReady() {
  return Boolean(
    isFoundryRuntimeAvailable() &&
    isLancerRuntimeAvailable() &&
    isNativeFlowRegistryAvailable()
  );
}

/* ============================================================
   RUNTIME ASSERTION
   ============================================================ */

/**
 * @section runtime-assertion
 */

export function assertNativeAdapterRuntimeReady() {
  if (!isFoundryRuntimeAvailable()) {
    throw new Error(
      "Frame Conn native adapter requires Foundry runtime."
    );
  }

  if (!isLancerRuntimeAvailable()) {
    throw new Error(
      "Frame Conn native adapter requires the Lancer system runtime."
    );
  }

  if (!isNativeFlowRegistryAvailable()) {
    throw new Error(
      "Frame Conn native adapter requires game.lancer.flows."
    );
  }

  return true;
}

/* ============================================================
   NATIVE ACTOR ENTRY HELPERS
   ============================================================ */

/**
 * @section native-actor-entry-helpers
 *
 * These provide common façade operations without requiring callers to
 * know which native-adapter submodule owns resolution.
 */

export async function resolveNativeActor(
  reference,
  options
) {
  return nativeAdapter.actors
    .resolveNativeActor(
      reference,
      options
    );
}

export async function resolveNativeActorContext(
  reference
) {
  return nativeAdapter.actors
    .resolveNativeActorContext(
      reference
    );
}

/* ============================================================
   NATIVE ITEM ENTRY HELPERS
   ============================================================ */

/**
 * @section native-item-entry-helpers
 */

export async function resolveNativeItem(
  reference,
  options
) {
  return nativeAdapter.items
    .resolveNativeItem(
      reference,
      options
    );
}

export async function resolveNativeActionReference(
  reference
) {
  return nativeAdapter.items
    .resolveNativeActionReference(
      reference
    );
}

/* ============================================================
   COMMON EXECUTION ENTRY HELPERS
   ============================================================ */

/**
 * @section common-execution-entry-helpers
 *
 * These are convenience façade calls only.
 *
 * They must not add orchestration beyond delegating to native-execution.
 */

export async function executeNativeWeaponAttack(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeWeaponAttack(
      options
    );
}

export async function executeNativeBasicAttack(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeBasicAttack(
      options
    );
}

export async function executeNativeBasicTechAttack(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeBasicTechAttack(
      options
    );
}

export async function executeNativeTechAttack(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeTechAttack(
      options
    );
}

export async function executeNativeActivation(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeActivation(
      options
    );
}

export async function executeNativeSystemUse(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeSystemUse(
      options
    );
}

export async function executeNativeCorePower(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeCorePower(
      options
    );
}

export async function executeNativeDamageRoll(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.execution
    .executeNativeDamageRoll(
      options
    );
}

/* ============================================================
   COMMON RESOURCE ENTRY HELPERS
   ============================================================ */

/**
 * @section common-resource-entry-helpers
 *
 * Resource orchestration should normally use resource_service/.
 *
 * These façade calls expose native state primitives only.
 */

export async function discoverNativeItemResources(
  itemReference
) {
  return nativeAdapter.resources
    .discoverNativeItemResources(
      itemReference
    );
}

export async function getNativeLimitedState(
  itemReference
) {
  return nativeAdapter.resources
    .getNativeLimitedState(
      itemReference
    );
}

export async function getNativeCounterState(
  itemReference,
  counterKey
) {
  return nativeAdapter.resources
    .getNativeCounterState(
      itemReference,
      counterKey
    );
}

/* ============================================================
   COMMON STATUS ENTRY HELPERS
   ============================================================ */

/**
 * @section common-status-entry-helpers
 *
 * Lifecycle and immunity checks belong above this layer.
 */

export async function applyNativeStatus(
  actorReference,
  statusId,
  options
) {
  return nativeAdapter.status
    .applyNativeStatus(
      actorReference,
      statusId,
      options
    );
}

export async function removeNativeStatus(
  actorReference,
  statusId
) {
  return nativeAdapter.status
    .removeNativeStatus(
      actorReference,
      statusId
    );
}

/* ============================================================
   COMMON ROLL ENTRY HELPERS
   ============================================================ */

/**
 * @section common-roll-entry-helpers
 */

export async function rollNativeStat(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.rolls
    .rollNativeStat(
      options
    );
}

export async function rollNativePilotTrigger(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.rolls
    .rollNativePilotTrigger(
      options
    );
}

export async function rollNativeSave(
  options
) {
  assertNativeAdapterRuntimeReady();

  return nativeAdapter.rolls
    .rollNativeSave(
      options
    );
}

export async function rollNativeD20(
  options
) {
  return nativeAdapter.rolls
    .rollNativeD20(
      options
    );
}

/* ============================================================
   COMMON COMBAT ENTRY HELPERS
   ============================================================ */

/**
 * @section common-combat-entry-helpers
 */

export async function applyNativeDamage(
  options
) {
  return nativeAdapter.combat
    .applyNativeDamage(
      options
    );
}

export async function applyNativeHeat(
  targetReference,
  amount,
  options
) {
  return nativeAdapter.combat
    .applyNativeHeat(
      targetReference,
      amount,
      options
    );
}

export async function applyNativeBurn(
  targetReference,
  amount,
  options
) {
  return nativeAdapter.combat
    .applyNativeBurn(
      targetReference,
      amount,
      options
    );
}

/* ============================================================
   ADAPTER DIAGNOSTICS
   ============================================================ */

/**
 * @section adapter-diagnostics
 *
 * Debug aid only.
 *
 * No mechanical feature should branch on this structure beyond basic
 * runtime availability.
 */

export function getNativeAdapterDiagnostics() {
  return Object.freeze({
    id:
      NATIVE_ADAPTER_ID,

    version:
      NATIVE_ADAPTER_VERSION,

    foundryRuntime:
      isFoundryRuntimeAvailable(),

    lancerRuntime:
      isLancerRuntimeAvailable(),

    flowRegistry:
      isNativeFlowRegistryAvailable(),

    ready:
      isNativeAdapterRuntimeReady(),

    capabilities:
      getNativeAdapterCapabilities(),

    registeredFlows:
      isNativeFlowRegistryAvailable() &&
      typeof nativeAdapter.rolls
        .getRegisteredNativeFlowNames ===
        "function"
        ? nativeAdapter.rolls
            .getRegisteredNativeFlowNames()
        : Object.freeze([])
  });
}

/* ============================================================
   EXISTING FRAME CONN MIGRATION NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-migration-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 *
 * Do not delete or rewrite working integration merely because this façade
 * now exists.
 *
 * Migration pattern:
 *
 * existing direct native call
 * → replace with nativeAdapter call
 * → verify behavior
 * → remove redundant old native-specific helper
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * Intended dependency:
 *
 * runtime-orchestrator
 * → semantic execution context
 * → execution transaction
 * → native-adapter
 *
 * runtime-orchestrator should not depend on:
 *
 * game.lancer.flows
 * actor.system.*
 * item.system.*
 * actor.toggleStatusEffect()
 * actor.damageCalc()
 *
 * directly after migration.
 *
 *
 * feature_actions/
 * ----------------
 *
 * Existing universal action definitions remain.
 *
 * Their native child execution should increasingly call this façade.
 *
 * Examples:
 *
 * Skirmish
 * → semantic mount orchestration
 * → nativeAdapter.execution.executeNativeWeaponAttack()
 *
 * Skill Check
 * → nativeAdapter.rolls.rollNativeStat()
 *
 * Stabilize
 * → future native Flow wrapper
 *
 *
 * feature_turn/
 * -------------
 *
 * Remains higher-level turn UI/composition.
 *
 * It should eventually rely on:
 *
 * action_economy/
 * resource_service/
 * lifecycle_service/
 *
 * Those services may use nativeAdapter for authoritative native state.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Existing movement tracker remains authoritative for spent movement.
 *
 * Future movement capability/pathfinding layers may use:
 *
 * nativeAdapter.actors
 * nativeAdapter.status
 *
 * but movement rules do not belong inside nativeAdapter.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Discovery flow:
 *
 * nativeAdapter.loadout
 * + nativeAdapter.items
 * → discover actor-owned native Items/ActionData
 * → normalize into shared Frame Conn runtime action catalog
 *
 *
 * resource_service/
 * -----------------
 *
 * Native adapter provides:
 *
 * Limited
 * CounterData
 * Core Energy
 * Loaded
 * Cascading
 *
 * resource_service provides:
 *
 * check/commit orchestration
 * frequency
 * lifecycle reset
 * supplemental state
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * nativeAdapter does NOT emit semantic events.
 *
 * execution_transaction / feature runtimes should translate normalized
 * adapter results into events such as:
 *
 * attackHit
 * attackCrit
 * damageResolved
 * statusApplied
 * coreActivated
 *
 *
 * execution-strategy registry
 * ---------------------------
 *
 * Special behavior belongs above this façade:
 *
 * Annihilator
 * Everest Initiative
 * Titanomachy Mesh
 * Leader
 * Jockey
 * NHP control
 *
 * Those strategies compose nativeAdapter primitives.
 */

/* ============================================================
   PUBLIC BOUNDARY RULES
   ============================================================ */

/**
 * @section public-boundary-rules
 *
 * RULE 1
 *
 * Higher Frame Conn runtime code should import native-adapter.js instead
 * of individual native-* modules unless there is a strong internal reason.
 *
 *
 * RULE 2
 *
 * native-adapter.js is a façade, not an orchestrator.
 *
 *
 * RULE 3
 *
 * No tabletop-specific decision should be added here.
 *
 *
 * RULE 4
 *
 * If a new native operation is needed:
 *
 * 1. trace native Lancer source
 * 2. implement in correct native-* submodule
 * 3. expose through this façade only if higher layers need it
 *
 *
 * RULE 5
 *
 * Do not expose speculative native APIs.
 *
 *
 * RULE 6
 *
 * Preserve normalized native-contract result shapes at the boundary.
 */

/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */

/**
 * @section dependency-direction
 *
 * Intended:
 *
 * UI
 * │
 * ▼
 * runtime-orchestrator
 * │
 * ▼
 * semantic action / execution strategy
 * │
 * ▼
 * execution_transaction
 * │
 * ├── action_economy
 * ├── resource_service
 * ├── targeting_spatial_service
 * ├── lifecycle_service
 * └── semantic_event_bus
 * │
 * ▼
 * native-adapter
 * │
 * ├── native-actors
 * ├── native-items
 * ├── native-loadout
 * ├── native-resources
 * ├── native-status
 * ├── native-rolls
 * ├── native-combat
 * └── native-execution
 * │
 * ▼
 * Foundry + Lancer system
 *
 *
 * Forbidden direction:
 *
 * native_adapter/*
 * → feature_actions/*
 *
 * native_adapter/*
 * → runtime-orchestrator.js
 *
 * native_adapter/*
 * → UI
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * native-adapter.js is the primary public Frame Conn boundary to native
 * Lancer runtime.
 *
 * INVARIANT 2
 * Submodules own implementation details; this façade owns composition.
 *
 * INVARIANT 3
 * This file contains no tabletop rule implementation.
 *
 * INVARIANT 4
 * This file contains no resource/action-economy transaction logic.
 *
 * INVARIANT 5
 * This file does not emit semantic runtime events.
 *
 * INVARIANT 6
 * This file does not interpret semantic Item prose.
 *
 * INVARIANT 7
 * Higher layers should prefer normalized contract results over raw native
 * Flow/Actor/Item internals.
 *
 * INVARIANT 8
 * Direct native runtime access should migrate behind this boundary
 * incrementally rather than through disruptive replacement.
 *
 * INVARIANT 9
 * Native runtime readiness is checked before Flow execution.
 *
 * INVARIANT 10
 * Adding a façade method does not make an incomplete native mechanic
 * complete; runtime class boundaries from runtime-execution-notes.md still
 * apply.
 */