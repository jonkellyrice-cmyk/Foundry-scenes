/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * native_adapter/native-adapter-feature.js
 */

/**
 * @file
 * @path native_adapter/native-adapter-feature.js
 * @module native-adapter-feature
 * @layer frame-conn-runtime-feature
 * @responsibility expose-native-adapter-through-the-canonical-frame-conn-feature-contract
 * @public-boundary true
 * @side-effects delegated-native-foundry-lancer-execution
 *
 * ARCHITECTURAL ROLE:
 *
 * native_adapter/*
 *      ↓
 * native-adapter.js
 *      ↓
 * native-adapter-feature.js
 *      ↓
 * feature-registry.js
 *      ↓
 * runtime-orchestrator.js
 *
 * THIS FILE OWNS:
 * - canonical Frame Conn Native Adapter feature definition
 * - native capability declaration
 * - registry-facing native resolution/execution API
 * - native runtime readiness diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - native Flow implementation
 * - semantic action definitions
 * - execution-context construction
 * - execution transaction sequencing
 * - targeting legality
 * - lifecycle progression
 * - action economy
 * - resource orchestration
 * - application startup orchestration
 *
 * EDIT CONTRACT:
 * - keep this file a thin feature wrapper
 * - do not duplicate native_adapter behavior here
 * - do not import sibling runtime features directly
 * - feature-registry.js remains the registration boundary
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  defineFrameConnFeature
} from "../../scripts/feature-contract.js";

import * as nativeAdapterRuntime from
  "./native-adapter.js";

/* ============================================================
   FEATURE DIAGNOSTICS
   ============================================================ */

function getFrameConnNativeAdapterDiagnostics() {
  return Object.freeze({
    serviceId:
      nativeAdapterRuntime.NATIVE_ADAPTER_ID ??
      null,

    serviceVersion:
      nativeAdapterRuntime.NATIVE_ADAPTER_VERSION ??
      null,

    runtime:
      nativeAdapterRuntime.getNativeAdapterDiagnostics()
  });
}

/* ============================================================
   FEATURE DEFINITION
   ============================================================ */

/**
 * Canonical Native Adapter runtime feature declaration.
 *
 * This file defines the feature but does not register itself.
 * scripts/feature-registry.js remains the application-wide registration
 * boundary.
 */
export const frameConnNativeAdapterFeature =
  defineFrameConnFeature({
    id:
      "native-adapter",

    domain:
      "native-adapter",

    provides: [
      "native-adapter",
      "native-adapter.resolution",
      "native-adapter.execution",
      "native-adapter.rolls",
      "native-adapter.resources",
      "native-adapter.status",
      "native-adapter.combat",
      "native-adapter.flow-extension"
    ],

    dependsOn: [],

    optionalDependsOn: [],

    state: {
      service:
        nativeAdapterRuntime.nativeAdapter
    },

    commands: {
      installFlowStepBefore:
        nativeAdapterRuntime.nativeAdapter.execution.installNativeFlowStepBefore,

      executeWeaponAttack:
        nativeAdapterRuntime.executeNativeWeaponAttack,

      executeBasicAttack:
        nativeAdapterRuntime.executeNativeBasicAttack,

      executeBasicTechAttack:
        nativeAdapterRuntime.executeNativeBasicTechAttack,

      executeTechAttack:
        nativeAdapterRuntime.executeNativeTechAttack,

      executeActivation:
        nativeAdapterRuntime.executeNativeActivation,

      executeSystemUse:
        nativeAdapterRuntime.executeNativeSystemUse,

      executeCorePower:
        nativeAdapterRuntime.executeNativeCorePower,

      executeDamageRoll:
        nativeAdapterRuntime.executeNativeDamageRoll,

      applyStatus:
        nativeAdapterRuntime.applyNativeStatus,

      removeStatus:
        nativeAdapterRuntime.removeNativeStatus,

      applyDamage:
        nativeAdapterRuntime.applyNativeDamage,

      applyHeat:
        nativeAdapterRuntime.applyNativeHeat,

      applyBurn:
        nativeAdapterRuntime.applyNativeBurn,

      rollStat:
        nativeAdapterRuntime.rollNativeStat,

      rollPilotTrigger:
        nativeAdapterRuntime.rollNativePilotTrigger,

      rollSave:
        nativeAdapterRuntime.rollNativeSave,

      rollD20:
        nativeAdapterRuntime.rollNativeD20
    },

    queries: {
      resolveActor:
        nativeAdapterRuntime.resolveNativeActor,

      resolveActorContext:
        nativeAdapterRuntime.resolveNativeActorContext,

      resolveItem:
        nativeAdapterRuntime.resolveNativeItem,

      resolveActionReference:
        nativeAdapterRuntime.resolveNativeActionReference,

      capabilities:
        nativeAdapterRuntime.getNativeAdapterCapabilities,

      runtimeReady:
        nativeAdapterRuntime.isNativeAdapterRuntimeReady,

      diagnostics:
        getFrameConnNativeAdapterDiagnostics
    },

    hooks: {},

    lifecycle: {},

    api: {
      service:
        nativeAdapterRuntime.nativeAdapter,

      diagnostics:
        getFrameConnNativeAdapterDiagnostics,

      hasCapability:
        nativeAdapterRuntime.hasNativeAdapterCapability,

      getCapabilities:
        nativeAdapterRuntime.getNativeAdapterCapabilities,

      isFoundryRuntimeAvailable:
        nativeAdapterRuntime.isFoundryRuntimeAvailable,

      isLancerRuntimeAvailable:
        nativeAdapterRuntime.isLancerRuntimeAvailable,

      isNativeFlowRegistryAvailable:
        nativeAdapterRuntime.isNativeFlowRegistryAvailable,

      isRuntimeReady:
        nativeAdapterRuntime.isNativeAdapterRuntimeReady,

      assertRuntimeReady:
        nativeAdapterRuntime.assertNativeAdapterRuntimeReady,

      installFlowStepBefore:
        nativeAdapterRuntime.nativeAdapter.execution.installNativeFlowStepBefore,

      resolveActor:
        nativeAdapterRuntime.resolveNativeActor,

      resolveActorContext:
        nativeAdapterRuntime.resolveNativeActorContext,

      resolveItem:
        nativeAdapterRuntime.resolveNativeItem,

      resolveActionReference:
        nativeAdapterRuntime.resolveNativeActionReference,

      executeWeaponAttack:
        nativeAdapterRuntime.executeNativeWeaponAttack,

      executeBasicAttack:
        nativeAdapterRuntime.executeNativeBasicAttack,

      executeBasicTechAttack:
        nativeAdapterRuntime.executeNativeBasicTechAttack,

      executeTechAttack:
        nativeAdapterRuntime.executeNativeTechAttack,

      executeActivation:
        nativeAdapterRuntime.executeNativeActivation,

      executeSystemUse:
        nativeAdapterRuntime.executeNativeSystemUse,

      executeCorePower:
        nativeAdapterRuntime.executeNativeCorePower,

      executeDamageRoll:
        nativeAdapterRuntime.executeNativeDamageRoll,

      discoverItemResources:
        nativeAdapterRuntime.discoverNativeItemResources,

      getLimitedState:
        nativeAdapterRuntime.getNativeLimitedState,

      getCounterState:
        nativeAdapterRuntime.getNativeCounterState,

      applyStatus:
        nativeAdapterRuntime.applyNativeStatus,

      removeStatus:
        nativeAdapterRuntime.removeNativeStatus,

      rollStat:
        nativeAdapterRuntime.rollNativeStat,

      rollPilotTrigger:
        nativeAdapterRuntime.rollNativePilotTrigger,

      rollSave:
        nativeAdapterRuntime.rollNativeSave,

      rollD20:
        nativeAdapterRuntime.rollNativeD20,

      applyDamage:
        nativeAdapterRuntime.applyNativeDamage,

      applyHeat:
        nativeAdapterRuntime.applyNativeHeat,

      applyBurn:
        nativeAdapterRuntime.applyNativeBurn
    },

    metadata: {
      label:
        "Native Adapter",

      description:
        "Exposes the stable Frame Conn-facing boundary over native Foundry Lancer resolution, rolls, resources, status, combat, and execution.",

      serviceBoundary:
        "native_adapter/native-adapter.js",

      authoritativeRegistry:
        "scripts/feature-registry.js",

      authoritativeRuntime:
        "scripts/runtime-orchestrator.js",

      nativeExecutionAuthority:
        "native_adapter/native-execution.js"
    }
  });

/* ============================================================
   TRANSITIONAL NAMED EXPORTS
   ============================================================ */

export {
  getFrameConnNativeAdapterDiagnostics
};
