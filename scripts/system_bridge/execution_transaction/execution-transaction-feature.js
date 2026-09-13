/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * execution_transaction/execution-transaction-feature.js
 */

/**
 * @file
 * @path execution_transaction/execution-transaction-feature.js
 * @module execution-transaction-feature
 * @layer frame-conn-runtime-feature
 * @responsibility expose-execution-transaction-through-the-canonical-frame-conn-feature-contract
 * @public-boundary true
 * @side-effects delegated-through-transaction-execution-and-hook-registration
 *
 * ARCHITECTURAL ROLE:
 *
 * execution_transaction/*
 *      ↓
 * execution-transaction.js
 *      ↓
 * execution-transaction-feature.js
 *      ↓
 * feature-registry.js
 *      ↓
 * runtime-orchestrator.js
 *
 * THIS FILE OWNS:
 * - canonical Frame Conn Execution Transaction feature definition
 * - execution-transaction capability declaration
 * - registry-facing transaction execution API
 * - registry-facing transaction-hook API
 * - feature-level diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - transaction sequencing implementation
 * - semantic execution context construction
 * - native Lancer execution
 * - action economy
 * - resource semantics
 * - targeting rules
 * - lifecycle rules
 * - semantic event definitions
 * - feature-specific mechanics
 * - application startup orchestration
 *
 * EDIT CONTRACT:
 * - keep this file a thin feature wrapper
 * - do not duplicate execution_transaction behavior here
 * - do not import sibling runtime features directly
 * - feature-registry.js remains the registration boundary
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  defineFrameConnFeature
} from "../../scripts/feature-contract.js";

import * as executionTransactionRuntime from
  "./execution-transaction.js";

/* ============================================================
   FEATURE DIAGNOSTICS
   ============================================================ */

function getFrameConnExecutionTransactionDiagnostics() {
  return Object.freeze({
    serviceId:
      executionTransactionRuntime
        .EXECUTION_TRANSACTION_MODULE_ID ??
      null,

    serviceVersion:
      executionTransactionRuntime
        .EXECUTION_TRANSACTION_MODULE_VERSION ??
      null,

    module:
      typeof executionTransactionRuntime
        .getExecutionTransactionDiagnostics ===
        "function"
        ? executionTransactionRuntime
            .getExecutionTransactionDiagnostics()
        : null
  });
}

/* ============================================================
   FEATURE DEFINITION
   ============================================================ */

/**
 * Canonical Execution Transaction runtime feature declaration.
 *
 * This file defines the feature but does not register itself.
 * scripts/feature-registry.js remains the application-wide registration
 * boundary.
 */
export const frameConnExecutionTransactionFeature =
  defineFrameConnFeature({
    id:
      "execution-transaction",

    domain:
      "execution-transaction",

    provides: [
      "execution-transaction",
      "execution-transaction.run",
      "execution-transaction.native",
      "execution-transaction.semantic-parent",
      "execution-transaction.hooks"
    ],

    dependsOn: [
      "semantic-execution-context"
    ],

    optionalDependsOn: [
      "targeting-spatial",
      "lifecycle"
    ],

    state: {
      service:
        executionTransactionRuntime.executionTransaction
    },

    commands: {
      run:
        executionTransactionRuntime.runExecutionTransaction,

      runWithGlobalHooks:
        executionTransactionRuntime.runExecutionTransactionWithGlobalHooks,

      runNative:
        executionTransactionRuntime.runNativeExecutionTransaction,

      runNativeWithGlobalHooks:
        executionTransactionRuntime.runNativeExecutionTransactionWithGlobalHooks,

      runSemanticParent:
        executionTransactionRuntime.runSemanticParentTransaction,

      runSemanticParentWithGlobalHooks:
        executionTransactionRuntime.runSemanticParentTransactionWithGlobalHooks,

      registerHook:
        executionTransactionRuntime.registerExecutionTransactionHook,

      registerHooks:
        executionTransactionRuntime.registerExecutionTransactionHooks,

      unregisterHook:
        executionTransactionRuntime.unregisterExecutionTransactionHook,

      clearHooks:
        executionTransactionRuntime.clearExecutionTransactionHooks,

      clearAllHooks:
        executionTransactionRuntime.clearAllExecutionTransactionHooks,

      setHookEnabled:
        executionTransactionRuntime.setExecutionTransactionHookEnabled
    },

    queries: {
      getHooks:
        executionTransactionRuntime.getExecutionTransactionHooks,

      findHook:
        executionTransactionRuntime.findExecutionTransactionHook,

      diagnostics:
        getFrameConnExecutionTransactionDiagnostics
    },

    hooks: {},

    lifecycle: {},

    api: {
      service:
        executionTransactionRuntime.executionTransaction,

      diagnostics:
        getFrameConnExecutionTransactionDiagnostics,

      runExecutionTransaction:
        executionTransactionRuntime.runExecutionTransaction,

      runExecutionTransactionWithGlobalHooks:
        executionTransactionRuntime.runExecutionTransactionWithGlobalHooks,

      runNativeExecutionTransaction:
        executionTransactionRuntime.runNativeExecutionTransaction,

      runNativeExecutionTransactionWithGlobalHooks:
        executionTransactionRuntime.runNativeExecutionTransactionWithGlobalHooks,

      runSemanticParentTransaction:
        executionTransactionRuntime.runSemanticParentTransaction,

      runSemanticParentTransactionWithGlobalHooks:
        executionTransactionRuntime.runSemanticParentTransactionWithGlobalHooks,

      globalHooks:
        executionTransactionRuntime.globalExecutionTransactionHooks,

      registerHook:
        executionTransactionRuntime.registerExecutionTransactionHook,

      registerHooks:
        executionTransactionRuntime.registerExecutionTransactionHooks,

      unregisterHook:
        executionTransactionRuntime.unregisterExecutionTransactionHook,

      clearHooks:
        executionTransactionRuntime.clearExecutionTransactionHooks,

      clearAllHooks:
        executionTransactionRuntime.clearAllExecutionTransactionHooks,

      getHooks:
        executionTransactionRuntime.getExecutionTransactionHooks,

      findHook:
        executionTransactionRuntime.findExecutionTransactionHook,

      setHookEnabled:
        executionTransactionRuntime.setExecutionTransactionHookEnabled,

      createHookCollection:
        executionTransactionRuntime.createExecutionTransactionHookCollection,

      composeHookRunners:
        executionTransactionRuntime.composeExecutionTransactionHookRunners,

      continueTransaction:
        executionTransactionRuntime.continueTransaction,

      blockTransaction:
        executionTransactionRuntime.blockTransaction,

      cancelTransaction:
        executionTransactionRuntime.cancelTransaction,

      failTransaction:
        executionTransactionRuntime.failTransaction,

      replaceTransactionContext:
        executionTransactionRuntime.replaceTransactionContext,

      onBeforePreValidate:
        executionTransactionRuntime.onBeforePreValidate,

      onAfterPreValidate:
        executionTransactionRuntime.onAfterPreValidate,

      onBeforeTarget:
        executionTransactionRuntime.onBeforeTarget,

      onAfterTarget:
        executionTransactionRuntime.onAfterTarget,

      onBeforeFinalValidate:
        executionTransactionRuntime.onBeforeFinalValidate,

      onAfterFinalValidate:
        executionTransactionRuntime.onAfterFinalValidate,

      onBeforeExecute:
        executionTransactionRuntime.onBeforeExecute,

      onAfterExecute:
        executionTransactionRuntime.onAfterExecute,

      onBeforeResolve:
        executionTransactionRuntime.onBeforeResolve,

      onAfterResolve:
        executionTransactionRuntime.onAfterResolve,

      onBeforeCommit:
        executionTransactionRuntime.onBeforeCommit,

      onAfterCommit:
        executionTransactionRuntime.onAfterCommit
    },

    metadata: {
      label:
        "Execution Transaction",

      description:
        "Exposes canonical Frame Conn execution transaction sequencing and hook composition through the feature registry.",

      serviceBoundary:
        "execution_transaction/execution-transaction.js",

      authoritativeRegistry:
        "scripts/feature-registry.js",

      authoritativeRuntime:
        "scripts/runtime-orchestrator.js",

      contextDependency:
        "semantic-execution-context",

      downstreamNativeAuthority:
        "native-adapter"
    }
  });

/* ============================================================
   TRANSITIONAL NAMED EXPORTS
   ============================================================ */

export {
  getFrameConnExecutionTransactionDiagnostics
};
