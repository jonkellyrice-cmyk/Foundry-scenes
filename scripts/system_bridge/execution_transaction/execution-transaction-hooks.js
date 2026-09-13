/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/execution_transaction/execution-transaction-hooks.js
 */
/**
 * @file
 * @path main/execution_transaction/execution-transaction-hooks.js
 * @module execution-transaction-hooks
 * @layer execution-transaction-hooks
 * @responsibility register-compose-and-run-stable-execution-transaction-hooks
 * @public-boundary false
 * @side-effects registered-hook-callback-execution-only
 *
 * @depends-on
 * - execution-transaction-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by execution-transaction.js
 * - consumed by runtime-orchestrator.js through execution_transaction/
 * - attachment point for action_economy/*
 * - attachment point for resource_service/*
 * - attachment point for targeting_spatial_service/*
 * - attachment point for lifecycle_service/*
 * - attachment point for semantic_event_bus/*
 * - attachment point for execution-strategy runtimes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - execution-transaction-runner.js remains transaction sequencer
 * - runtime-orchestrator.js remains high-level coordinator
 * - feature_turn/ remains turn-feature composition
 * - feature_movement/ remains movement-feature composition
 * - native_adapter/ remains native Lancer authority
 *
 * THIS FILE OWNS:
 * - hook registration
 * - hook ordering
 * - hook priority
 * - hook predicates
 * - hook execution
 * - hook composition
 * - one-shot hooks
 * - unregister/dispose support
 * - normalized hook return values
 *
 * THIS FILE DOES NOT OWN:
 * - transaction sequencing
 * - action economy rules
 * - resource rules
 * - targeting rules
 * - lifecycle rules
 * - semantic event definitions
 * - native execution
 * - feature-specific mechanics
 *
 * EDIT CONTRACT:
 * - keep hooks deterministic
 * - preserve explicit stage ordering
 * - do not allow hooks to mutate runner state directly
 * - context replacement must use hook result contract
 * - terminal hooks remain observational by runner policy
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  EXECUTION_HOOK_ACTION,
  EXECUTION_TRANSACTION_HOOK_STAGE,
  blockExecutionHook,
  cancelExecutionHook,
  continueExecutionHook,
  createExecutionHookResult,
  failExecutionHook,
  replaceExecutionContextHook
} from "./execution-transaction-contract.js";
/* ============================================================
   HOOK PRIORITY
   ============================================================ */
/**
 * @section hook-priority
 *
 * Lower number runs earlier.
 */
export const EXECUTION_HOOK_PRIORITY = Object.freeze({
  EARLIEST:
    -1000,
  VERY_EARLY:
    -500,
  EARLY:
    -100,
  NORMAL:
    0,
  LATE:
    100,
  VERY_LATE:
    500,
  LATEST:
    1000
});
/* ============================================================
   HOOK SOURCE KIND
   ============================================================ */
/**
 * @section hook-source-kind
 *
 * Descriptive only.
 *
 * Useful for diagnostics and controlled clearing.
 */
export const EXECUTION_HOOK_SOURCE_KIND = Object.freeze({
  CORE:
    "core",
  ACTION_ECONOMY:
    "action-economy",
  RESOURCE:
    "resource",
  TARGETING:
    "targeting",
  LIFECYCLE:
    "lifecycle",
  EVENT_BUS:
    "event-bus",
  STRATEGY:
    "strategy",
  FEATURE:
    "feature",
  DEBUG:
    "debug",
  OTHER:
    "other"
});
/* ============================================================
   PRIVATE STATE
   ============================================================ */
/**
 * @section private-state
 */
const HOOKS_BY_STAGE =
  new Map();
let registrationCounter =
  0;
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}
function finiteNumber(value) {
  return Number.isFinite(value);
}
function isHookStage(value) {
  return Object.values(
    EXECUTION_TRANSACTION_HOOK_STAGE
  ).includes(value);
}
function isHookAction(value) {
  return Object.values(
    EXECUTION_HOOK_ACTION
  ).includes(value);
}
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function generateHookId() {
  registrationCounter += 1;
  return (
    `fc-hook-${Date.now()}-` +
    `${registrationCounter}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}
function getStageBucket(
  stage,
  {
    create = false
  } = {}
) {
  if (!isHookStage(stage)) {
    throw new TypeError(
      `Invalid execution transaction hook stage: ${String(stage)}`
    );
  }
  let bucket =
    HOOKS_BY_STAGE.get(stage);
  if (
    !bucket &&
    create
  ) {
    bucket = [];
    HOOKS_BY_STAGE.set(
      stage,
      bucket
    );
  }
  return bucket ?? null;
}
function sortHookEntries(
  entries
) {
  entries.sort(
    (
      first,
      second
    ) => {
      if (
        first.priority !==
        second.priority
      ) {
        return (
          first.priority -
          second.priority
        );
      }
      return (
        first.registrationOrder -
        second.registrationOrder
      );
    }
  );
  return entries;
}
function normalizeSingleHookResult(
  value,
  stage,
  payload
) {
  if (value == null) {
    return continueExecutionHook(
      stage,
      {
        context:
          payload.context
      }
    );
  }
  if (
    value.kind === "hook" &&
    isHookAction(
      value.action
    )
  ) {
    return value;
  }
  if (value === true) {
    return continueExecutionHook(
      stage,
      {
        context:
          payload.context
      }
    );
  }
  if (value === false) {
    return blockExecutionHook(
      stage,
      {
        context:
          payload.context,
        reason:
          "hook-returned-false"
      }
    );
  }
  if (
    typeof value === "string"
  ) {
    switch (
      value
        .trim()
        .toLowerCase()
    ) {
      case "continue":
        return continueExecutionHook(
          stage,
          {
            context:
              payload.context
          }
        );
      case "block":
        return blockExecutionHook(
          stage,
          {
            context:
              payload.context
          }
        );
      case "cancel":
        return cancelExecutionHook(
          stage,
          {
            context:
              payload.context
          }
        );
      case "fail":
        return failExecutionHook(
          stage,
          {
            context:
              payload.context
          }
        );
      default:
        throw new TypeError(
          `Unsupported hook string result: ${value}`
        );
    }
  }
  /*
   * Allow a hook to return a replacement ExecutionContext directly.
   *
   * ExecutionContext contract requires identity/actors/source.
   */
  if (
    value &&
    typeof value === "object" &&
    value.identity &&
    value.actors &&
    value.source
  ) {
    return replaceExecutionContextHook(
      stage,
      value
    );
  }
  if (
    value &&
    typeof value === "object" &&
    isHookAction(
      value.action
    )
  ) {
    return createExecutionHookResult({
      stage,
      action:
        value.action,
      context:
        value.context ??
        payload.context,
      reason:
        value.reason ??
        null,
      error:
        value.error ??
        null,
      metadata:
        value.metadata ??
        {}
    });
  }
  throw new TypeError(
    "Execution transaction hook returned unsupported result."
  );
}
function normalizeHookResults(
  value,
  stage,
  payload
) {
  if (Array.isArray(value)) {
    return Object.freeze(
      value.map(
        result =>
          normalizeSingleHookResult(
            result,
            stage,
            payload
          )
      )
    );
  }
  return Object.freeze([
    normalizeSingleHookResult(
      value,
      stage,
      payload
    )
  ]);
}
function shouldStopHookChain(
  result
) {
  return Boolean(
    result?.action ===
      EXECUTION_HOOK_ACTION.BLOCK ||
    result?.action ===
      EXECUTION_HOOK_ACTION.CANCEL ||
    result?.action ===
      EXECUTION_HOOK_ACTION.FAIL
  );
}
/* ============================================================
   HOOK ENTRY CREATION
   ============================================================ */
/**
 * @section hook-entry-creation
 */
export function createExecutionTransactionHook({
  id =
    generateHookId(),
  stage,
  handler,
  priority =
    EXECUTION_HOOK_PRIORITY.NORMAL,
  once = false,
  enabled = true,
  predicate = null,
  sourceKind =
    EXECUTION_HOOK_SOURCE_KIND.OTHER,
  sourceId = null,
  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Execution transaction hook requires id."
    );
  }
  if (!isHookStage(stage)) {
    throw new TypeError(
      `Invalid hook stage: ${String(stage)}`
    );
  }
  if (
    typeof handler !==
    "function"
  ) {
    throw new TypeError(
      "Execution transaction hook requires handler function."
    );
  }
  if (!finiteNumber(priority)) {
    throw new TypeError(
      "Hook priority must be finite number."
    );
  }
  if (
    predicate != null &&
    typeof predicate !==
      "function"
  ) {
    throw new TypeError(
      "Hook predicate must be function or null."
    );
  }
  return Object.freeze({
    id,
    stage,
    handler,
    priority,
    once:
      Boolean(once),
    enabled:
      Boolean(enabled),
    predicate,
    sourceKind,
    sourceId,
    registrationOrder:
      registrationCounter,
    metadata:
      Object.freeze({
        ...metadata
      })
  });
}
/* ============================================================
   HOOK REGISTRATION
   ============================================================ */
/**
 * @section hook-registration
 */
export function registerExecutionTransactionHook(
  options
) {
  const entry =
    createExecutionTransactionHook(
      options
    );
  const bucket =
    getStageBucket(
      entry.stage,
      {
        create: true
      }
    );
  if (
    bucket.some(
      existing =>
        existing.id ===
        entry.id
    )
  ) {
    throw new Error(
      `Execution transaction hook already registered: ${entry.id}`
    );
  }
  bucket.push(
    entry
  );
  sortHookEntries(
    bucket
  );
  return Object.freeze({
    id:
      entry.id,
    stage:
      entry.stage,
    dispose() {
      return unregisterExecutionTransactionHook(
        entry.id
      );
    }
  });
}
/* ============================================================
   MULTI-STAGE REGISTRATION
   ============================================================ */
/**
 * @section multi-stage-registration
 *
 * Registers the same handler independently at multiple stages.
 */
export function registerExecutionTransactionHooks({
  stages,
  idPrefix = null,
  ...options
} = {}) {
  if (!Array.isArray(stages)) {
    throw new TypeError(
      "registerExecutionTransactionHooks requires stages array."
    );
  }
  const registrations =
    stages.map(
      (
        stage,
        index
      ) =>
        registerExecutionTransactionHook({
          ...options,
          stage,
          id:
            options.id
              ? `${options.id}:${stage}`
              : idPrefix
                ? `${idPrefix}:${stage}`
                : undefined,
          metadata: {
            ...(
              options.metadata ??
              {}
            ),
            multiStageIndex:
              index
          }
        })
    );
  return Object.freeze({
    registrations:
      Object.freeze(
        registrations
      ),
    dispose() {
      let removed = 0;
      for (
        const registration of
          registrations
      ) {
        if (
          registration.dispose()
        ) {
          removed += 1;
        }
      }
      return removed;
    }
  });
}
/* ============================================================
   HOOK UNREGISTRATION
   ============================================================ */
/**
 * @section hook-unregistration
 */
export function unregisterExecutionTransactionHook(
  hookId
) {
  if (!requiredString(hookId)) {
    return false;
  }
  for (
    const [
      stage,
      bucket
    ] of
      HOOKS_BY_STAGE
  ) {
    const index =
      bucket.findIndex(
        entry =>
          entry.id ===
          hookId
      );
    if (index < 0) {
      continue;
    }
    bucket.splice(
      index,
      1
    );
    if (
      bucket.length === 0
    ) {
      HOOKS_BY_STAGE.delete(
        stage
      );
    }
    return true;
  }
  return false;
}
/* ============================================================
   SOURCE CLEARING
   ============================================================ */
/**
 * @section source-clearing
 */
export function clearExecutionTransactionHooks({
  sourceKind = null,
  sourceId = null,
  stage = null
} = {}) {
  let removed =
    0;
  const stages =
    stage
      ? [stage]
      : [
          ...HOOKS_BY_STAGE.keys()
        ];
  for (
    const currentStage of
      stages
  ) {
    const bucket =
      getStageBucket(
        currentStage
      );
    if (!bucket) {
      continue;
    }
    for (
      let index =
        bucket.length - 1;
      index >= 0;
      index -= 1
    ) {
      const entry =
        bucket[index];
      const sourceKindMatches =
        sourceKind == null ||
        entry.sourceKind ===
          sourceKind;
      const sourceIdMatches =
        sourceId == null ||
        entry.sourceId ===
          sourceId;
      if (
        sourceKindMatches &&
        sourceIdMatches
      ) {
        bucket.splice(
          index,
          1
        );
        removed += 1;
      }
    }
    if (
      bucket.length === 0
    ) {
      HOOKS_BY_STAGE.delete(
        currentStage
      );
    }
  }
  return removed;
}
export function clearAllExecutionTransactionHooks() {
  const count =
    [
      ...HOOKS_BY_STAGE.values()
    ]
      .reduce(
        (
          total,
          bucket
        ) =>
          total +
          bucket.length,
        0
      );
  HOOKS_BY_STAGE.clear();
  return count;
}
/* ============================================================
   HOOK LOOKUP
   ============================================================ */
/**
 * @section hook-lookup
 */
export function getExecutionTransactionHooks(
  stage
) {
  const bucket =
    getStageBucket(
      stage
    );
  return freezeArray(
    bucket ?? []
  );
}
export function findExecutionTransactionHook(
  hookId
) {
  if (!requiredString(hookId)) {
    return null;
  }
  for (
    const bucket of
      HOOKS_BY_STAGE.values()
  ) {
    const entry =
      bucket.find(
        hook =>
          hook.id ===
          hookId
      );
    if (entry) {
      return entry;
    }
  }
  return null;
}
/* ============================================================
   HOOK ENABLE / DISABLE
   ============================================================ */
/**
 * @section hook-enable-disable
 *
 * Registered entries are immutable.
 *
 * Enable/disable replaces the stored entry.
 */
export function setExecutionTransactionHookEnabled(
  hookId,
  enabled
) {
  if (
    typeof enabled !==
    "boolean"
  ) {
    throw new TypeError(
      "Hook enabled state must be boolean."
    );
  }
  for (
    const [
      stage,
      bucket
    ] of
      HOOKS_BY_STAGE
  ) {
    const index =
      bucket.findIndex(
        hook =>
          hook.id ===
          hookId
      );
    if (index < 0) {
      continue;
    }
    const existing =
      bucket[index];
    bucket[index] =
      Object.freeze({
        ...existing,
        enabled
      });
    sortHookEntries(
      bucket
    );
    return true;
  }
  return false;
}
/* ============================================================
   HOOK EXECUTION
   ============================================================ */
/**
 * @section hook-execution
 *
 * Canonical hooks object consumed by execution-transaction-runner.js.
 */
export async function runExecutionTransactionHooks(
  stage,
  payload
) {
  if (!isHookStage(stage)) {
    throw new TypeError(
      `Invalid execution transaction hook stage: ${String(stage)}`
    );
  }
  const bucket =
    getStageBucket(
      stage
    );
  if (
    !bucket ||
    bucket.length === 0
  ) {
    return Object.freeze([]);
  }
  /*
   * Snapshot so hooks can register/unregister safely while this stage runs.
   */
  const entries =
    [...bucket];
  const results = [];
  let currentContext =
    payload.context;
  for (
    const entry of
      entries
  ) {
    if (!entry.enabled) {
      continue;
    }
    const currentPayload =
      Object.freeze({
        ...payload,
        context:
          currentContext
      });
    if (entry.predicate) {
      let matches;
      try {
        matches =
          await entry.predicate(
            currentPayload
          );
      } catch (error) {
        const result =
          failExecutionHook(
            stage,
            {
              context:
                currentContext,
              reason:
                `hook-predicate-threw:${entry.id}`,
              error,
              metadata: {
                hookId:
                  entry.id,
                sourceKind:
                  entry.sourceKind,
                sourceId:
                  entry.sourceId
              }
            }
          );
        results.push(
          result
        );
        break;
      }
      if (!matches) {
        continue;
      }
    }
    let rawResult;
    try {
      rawResult =
        await entry.handler(
          currentPayload
        );
    } catch (error) {
      const result =
        failExecutionHook(
          stage,
          {
            context:
              currentContext,
            reason:
              `hook-handler-threw:${entry.id}`,
            error,
            metadata: {
              hookId:
                entry.id,
              sourceKind:
                entry.sourceKind,
              sourceId:
                entry.sourceId
            }
          }
        );
      results.push(
        result
      );
      if (entry.once) {
        unregisterExecutionTransactionHook(
          entry.id
        );
      }
      break;
    }
    const normalized =
      normalizeHookResults(
        rawResult,
        stage,
        currentPayload
      );
    for (
      const result of
        normalized
    ) {
      const enriched =
        createExecutionHookResult({
          stage,
          action:
            result.action,
          context:
            result.context ??
            currentContext,
          reason:
            result.reason ??
            null,
          error:
            result.error ??
            null,
          metadata: {
            hookId:
              entry.id,
            sourceKind:
              entry.sourceKind,
            sourceId:
              entry.sourceId,
            priority:
              entry.priority,
            ...(
              result.metadata ??
              {}
            )
          }
        });
      results.push(
        enriched
      );
      if (
        enriched.action ===
          EXECUTION_HOOK_ACTION.REPLACE_CONTEXT &&
        enriched.context
      ) {
        currentContext =
          enriched.context;
      }
      if (
        shouldStopHookChain(
          enriched
        )
      ) {
        break;
      }
    }
    if (entry.once) {
      unregisterExecutionTransactionHook(
        entry.id
      );
    }
    if (
      results.some(
        shouldStopHookChain
      )
    ) {
      break;
    }
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   DEFAULT HOOK RUNNER OBJECT
   ============================================================ */
/**
 * @section default-hook-runner-object
 *
 * Shape expected by execution-transaction-runner.js:
 *
 * hooks.run(stage, payload)
 */
export const executionTransactionHooks =
  Object.freeze({
    run:
      runExecutionTransactionHooks,
    register:
      registerExecutionTransactionHook,
    registerMany:
      registerExecutionTransactionHooks,
    unregister:
      unregisterExecutionTransactionHook,
    clear:
      clearExecutionTransactionHooks,
    clearAll:
      clearAllExecutionTransactionHooks,
    get:
      getExecutionTransactionHooks,
    find:
      findExecutionTransactionHook,
    setEnabled:
      setExecutionTransactionHookEnabled
  });
/* ============================================================
   INLINE HOOK COLLECTION
   ============================================================ */
/**
 * @section inline-hook-collection
 *
 * Creates a local, non-global hook runner.
 *
 * Useful for:
 *
 * - one action strategy
 * - one parent transaction
 * - tests
 * - temporary composition
 */
export function createExecutionTransactionHookCollection(
  definitions = []
) {
  if (!Array.isArray(definitions)) {
    throw new TypeError(
      "Hook collection requires definitions array."
    );
  }
  const hooksByStage =
    new Map();
  let localOrder =
    0;
  for (
    const definition of
      definitions
  ) {
    localOrder += 1;
    const entry =
      createExecutionTransactionHook({
        ...definition,
        id:
          definition.id ??
          `local-hook-${localOrder}`
      });
    const bucket =
      hooksByStage.get(
        entry.stage
      ) ?? [];
    bucket.push(
      entry
    );
    sortHookEntries(
      bucket
    );
    hooksByStage.set(
      entry.stage,
      bucket
    );
  }
  async function run(
    stage,
    payload
  ) {
    const bucket =
      hooksByStage.get(
        stage
      );
    if (
      !bucket ||
      bucket.length === 0
    ) {
      return Object.freeze([]);
    }
    const results = [];
    let currentContext =
      payload.context;
    for (
      const entry of
        [...bucket]
    ) {
      if (!entry.enabled) {
        continue;
      }
      const currentPayload =
        Object.freeze({
          ...payload,
          context:
            currentContext
        });
      if (
        entry.predicate &&
        !await entry.predicate(
          currentPayload
        )
      ) {
        continue;
      }
      let raw;
      try {
        raw =
          await entry.handler(
            currentPayload
          );
      } catch (error) {
        results.push(
          failExecutionHook(
            stage,
            {
              context:
                currentContext,
              reason:
                `local-hook-handler-threw:${entry.id}`,
              error,
              metadata: {
                hookId:
                  entry.id
              }
            }
          )
        );
        break;
      }
      const normalized =
        normalizeHookResults(
          raw,
          stage,
          currentPayload
        );
      for (
        const result of
          normalized
      ) {
        results.push(
          result
        );
        if (
          result.action ===
            EXECUTION_HOOK_ACTION.REPLACE_CONTEXT &&
          result.context
        ) {
          currentContext =
            result.context;
        }
        if (
          shouldStopHookChain(
            result
          )
        ) {
          break;
        }
      }
      if (
        results.some(
          shouldStopHookChain
        )
      ) {
        break;
      }
    }
    return Object.freeze(
      results
    );
  }
  return Object.freeze({
    run,
    get(stage) {
      return freezeArray(
        hooksByStage.get(
          stage
        ) ?? []
      );
    }
  });
}
/* ============================================================
   COMPOSED HOOK RUNNER
   ============================================================ */
/**
 * @section composed-hook-runner
 *
 * Runs multiple hook sources in order.
 *
 * Typical:
 *
 * global hooks
 * → strategy-local hooks
 * → transaction-local hooks
 */
export function composeExecutionTransactionHookRunners(
  ...runners
) {
  const validRunners =
    runners
      .flat()
      .filter(Boolean);
  return Object.freeze({
    async run(
      stage,
      payload
    ) {
      const results = [];
      let currentContext =
        payload.context;
      for (
        const runner of
          validRunners
      ) {
        let raw;
        const currentPayload =
          Object.freeze({
            ...payload,
            context:
              currentContext
          });
        if (
          typeof runner ===
          "function"
        ) {
          raw =
            await runner(
              stage,
              currentPayload
            );
        } else if (
          typeof runner.run ===
          "function"
        ) {
          raw =
            await runner.run(
              stage,
              currentPayload
            );
        } else {
          throw new TypeError(
            "Composed hook runner must be function or expose run()."
          );
        }
        const normalized =
          Array.isArray(raw)
            ? raw
            : raw == null
              ? []
              : [raw];
        for (
          const result of
            normalized
        ) {
          results.push(
            result
          );
          if (
            result?.action ===
              EXECUTION_HOOK_ACTION.REPLACE_CONTEXT &&
            result.context
          ) {
            currentContext =
              result.context;
          }
          if (
            shouldStopHookChain(
              result
            )
          ) {
            break;
          }
        }
        if (
          results.some(
            shouldStopHookChain
          )
        ) {
          break;
        }
      }
      return Object.freeze(
        results
      );
    }
  });
}
/* ============================================================
   STAGE-SPECIFIC REGISTRATION HELPERS
   ============================================================ */
/**
 * @section stage-specific-registration-helpers
 *
 * Convenience only.
 */
export function onBeforePreValidate(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_PRE_VALIDATE,
    handler
  });
}
export function onAfterPreValidate(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_PRE_VALIDATE,
    handler
  });
}
export function onBeforeTargeting(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_TARGETING,
    handler
  });
}
export function onAfterTargeting(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_TARGETING,
    handler
  });
}
export function onBeforeFinalValidate(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_FINAL_VALIDATE,
    handler
  });
}
export function onAfterFinalValidate(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_FINAL_VALIDATE,
    handler
  });
}
export function onBeforeExecute(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_EXECUTE,
    handler
  });
}
export function onAfterExecute(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_EXECUTE,
    handler
  });
}
export function onBeforeResolve(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_RESOLVE,
    handler
  });
}
export function onAfterResolve(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_RESOLVE,
    handler
  });
}
export function onBeforeCommit(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.BEFORE_COMMIT,
    handler
  });
}
export function onAfterCommit(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.AFTER_COMMIT,
    handler
  });
}
export function onTransactionSuccess(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.ON_SUCCESS,
    handler
  });
}
export function onTransactionBlock(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.ON_BLOCK,
    handler
  });
}
export function onTransactionCancel(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.ON_CANCEL,
    handler
  });
}
export function onTransactionFailure(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.ON_FAILURE,
    handler
  });
}
export function onTransactionPartial(
  handler,
  options = {}
) {
  return registerExecutionTransactionHook({
    ...options,
    stage:
      EXECUTION_TRANSACTION_HOOK_STAGE.ON_PARTIAL,
    handler
  });
}
/* ============================================================
   COMMON HOOK RESULT HELPERS
   ============================================================ */
/**
 * @section common-hook-result-helpers
 */
export function continueTransaction(
  stage,
  options = {}
) {
  return continueExecutionHook(
    stage,
    options
  );
}
export function blockTransaction(
  stage,
  reason,
  options = {}
) {
  return blockExecutionHook(
    stage,
    {
      ...options,
      reason
    }
  );
}
export function cancelTransaction(
  stage,
  reason,
  options = {}
) {
  return cancelExecutionHook(
    stage,
    {
      ...options,
      reason
    }
  );
}
export function failTransaction(
  stage,
  error,
  options = {}
) {
  return failExecutionHook(
    stage,
    {
      ...options,
      error,
      reason:
        options.reason ??
        error?.message ??
        "hook-failed"
    }
  );
}
export function replaceTransactionContext(
  stage,
  context,
  options = {}
) {
  return replaceExecutionContextHook(
    stage,
    context,
    options
  );
}
/* ============================================================
   ACTION ECONOMY ATTACHMENT NOTES
   ============================================================ */
/**
 * @section action-economy-attachment-notes
 *
 * Recommended registration:
 *
 * BEFORE_PRE_VALIDATE
 * → validate requested action cost
 *
 * BEFORE_COMMIT
 * → prepare/verify economy commit
 *
 * AFTER_COMMIT
 * → observe committed economy state
 *
 * action_economy/ owns actual rules/state.
 *
 * Hook handler should return:
 *
 * blockExecutionHook(...)
 *
 * for unavailable action economy.
 */
/* ============================================================
   RESOURCE SERVICE ATTACHMENT NOTES
   ============================================================ */
/**
 * @section resource-service-attachment-notes
 *
 * Recommended:
 *
 * BEFORE_PRE_VALIDATE
 * → validate required resources
 *
 * BEFORE_COMMIT
 * → consume deferred Frame Conn-owned resources
 * → verify native-consumed resources
 *
 * AFTER_COMMIT
 * → optional diagnostics/events
 *
 * resource_service/ owns resource semantics.
 */
/* ============================================================
   TARGETING SERVICE ATTACHMENT NOTES
   ============================================================ */
/**
 * @section targeting-service-attachment-notes
 *
 * Prefer explicit runner callbacks for:
 *
 * target acquisition
 * final spatial validation
 *
 * Hooks remain useful for cross-cutting target modifiers such as:
 *
 * invisible handling
 * source feature target exemptions
 * special LOS modifiers
 *
 * targeting_spatial_service/ remains authoritative.
 */
/* ============================================================
   LIFECYCLE SERVICE ATTACHMENT NOTES
   ============================================================ */
/**
 * @section lifecycle-service-attachment-notes
 *
 * Recommended:
 *
 * AFTER_RESOLVE
 * or
 * BEFORE/AFTER_COMMIT
 *
 * for registering:
 *
 * temporary status ownership
 * until-turn effects
 * until-round effects
 * scene-duration effects
 *
 * lifecycle_service/ owns expiration.
 */
/* ============================================================
   SEMANTIC EVENT BUS ATTACHMENT NOTES
   ============================================================ */
/**
 * @section semantic-event-bus-attachment-notes
 *
 * semantic_event_bus/ should register observational hooks such as:
 *
 * AFTER_EXECUTE
 * AFTER_RESOLVE
 * AFTER_COMMIT
 * ON_SUCCESS
 * ON_BLOCK
 * ON_CANCEL
 * ON_FAILURE
 * ON_PARTIAL
 *
 * Event hooks should normally:
 *
 * return continue
 *
 * They should not block/cancel execution unless a specific runtime contract
 * intentionally requires synchronous veto behavior.
 */
/* ============================================================
   FEATURE STRATEGY ATTACHMENT NOTES
   ============================================================ */
/**
 * @section feature-strategy-attachment-notes
 *
 * Feature-specific hooks should be narrow.
 *
 * Examples:
 *
 * Annihilator:
 * AFTER_EXECUTE / AFTER_RESOLVE
 * → inspect attack result
 *
 * Universal Compatibility:
 * AFTER_EXECUTE
 * → inspect Core activation success
 *
 * Titanomachy Mesh:
 * AFTER_RESOLVE
 * → inspect successful Ram/Grapple
 *
 * Do not register global feature hooks if a transaction-local strategy hook
 * is sufficient.
 */
/* ============================================================
   HOOK ORDERING NOTES
   ============================================================ */
/**
 * @section hook-ordering-notes
 *
 * Within one stage:
 *
 * lower priority number
 * → runs first
 *
 * equal priority:
 *
 * earlier registration
 * → runs first
 *
 * Suggested cross-service ordering:
 *
 * -300
 * core transaction guards
 *
 * -200
 * controller/NHP restrictions
 *
 * -100
 * action economy
 *
 * 0
 * resources
 *
 * 100
 * targeting modifiers
 *
 * 200
 * feature strategies
 *
 * 500
 * semantic event observation
 *
 * This is guidance only.
 */
/* ============================================================
   CONTEXT REPLACEMENT NOTES
   ============================================================ */
/**
 * @section context-replacement-notes
 *
 * Hooks must not mutate ExecutionContext in place.
 *
 * Use:
 *
 * replaceExecutionContextHook(
 *   stage,
 *   patchedContext
 * )
 *
 * Runner adopts the replacement for all later hooks/callbacks.
 *
 * Typical uses:
 *
 * - attach target/template result
 * - apply granted-action flags
 * - annotate semantic execution metadata
 *
 * Do not use context replacement to hide authoritative state mutation that
 * belongs in its owning service.
 */
/* ============================================================
   GLOBAL VS LOCAL HOOKS
   ============================================================ */
/**
 * @section global-vs-local-hooks
 *
 * GLOBAL
 * ------
 *
 * registerExecutionTransactionHook(...)
 *
 * Appropriate for:
 *
 * action_economy
 * resource_service
 * lifecycle_service
 * semantic_event_bus
 * universal controller restrictions
 *
 *
 * LOCAL
 * -----
 *
 * createExecutionTransactionHookCollection(...)
 *
 * Appropriate for:
 *
 * one source strategy
 * one special weapon
 * one Core Bonus
 * one parent action
 *
 *
 * COMPOSE
 * -------
 *
 * composeExecutionTransactionHookRunners(
 *   global,
 *   strategyLocal,
 *   transactionLocal
 * )
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
 * Should not become the hook registry.
 *
 * It should:
 *
 * build context
 * → choose strategy/callbacks
 * → compose relevant hook runners
 * → run transaction
 *
 *
 * feature_turn/
 * -------------
 *
 * Current turn/action state should eventually register through
 * action_economy/, not direct custom hooks from UI code.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Existing movement tracker can later observe movement transactions.
 *
 * Movement legality/pathfinding remains separate from hook registration.
 *
 *
 * feature_actions/
 * ----------------
 *
 * Universal actions may supply transaction-local hooks when needed.
 *
 * Most ordinary actions should not register global hooks.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Must not import or know about transaction hooks.
 *
 * Dependency direction remains:
 *
 * hooks/transaction
 * → native_adapter
 *
 * never the reverse.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Hooks consume immutable ExecutionContext.
 *
 * Context replacement must produce another valid ExecutionContext.
 *
 *
 * execution-transaction-runner.js
 * --------------------------------
 *
 * Owns hook stage timing.
 *
 * This file only manages:
 *
 * registration
 * ordering
 * invocation
 * result normalization
 *
 *
 * action_economy/
 * ---------------
 *
 * Expected to become one of the first global hook providers.
 *
 *
 * resource_service/
 * -----------------
 *
 * Expected to become another global hook provider.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Should attach observational hooks rather than forcing event dispatch into
 * the runner itself.
 */
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
/**
 * @section diagnostics
 */
export function getExecutionTransactionHookDiagnostics() {
  const stages = {};
  let total =
    0;
  for (
    const stage of
      Object.values(
        EXECUTION_TRANSACTION_HOOK_STAGE
      )
  ) {
    const hooks =
      getExecutionTransactionHooks(
        stage
      );
    if (
      hooks.length === 0
    ) {
      continue;
    }
    stages[stage] =
      Object.freeze(
        hooks.map(
          hook =>
            Object.freeze({
              id:
                hook.id,
              priority:
                hook.priority,
              once:
                hook.once,
              enabled:
                hook.enabled,
              sourceKind:
                hook.sourceKind,
              sourceId:
                hook.sourceId
            })
        )
      );
    total +=
      hooks.length;
  }
  return Object.freeze({
    total,
    stages:
      Object.freeze(
        stages
      )
  });
}
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Hook registration and transaction sequencing remain separate.
 *
 * INVARIANT 2
 * Hooks are ordered deterministically by priority then registration order.
 *
 * INVARIANT 3
 * Hooks cannot mutate transaction runner state directly.
 *
 * INVARIANT 4
 * Context replacement is explicit.
 *
 * INVARIANT 5
 * Block, Cancel, Fail, Continue, and Replace Context remain distinct.
 *
 * INVARIANT 6
 * Hook handler exceptions normalize to FAIL hook results.
 *
 * INVARIANT 7
 * Predicate exceptions normalize to FAIL hook results.
 *
 * INVARIANT 8
 * One-shot hooks unregister after execution.
 *
 * INVARIANT 9
 * Global hooks are appropriate for cross-cutting runtime services.
 *
 * INVARIANT 10
 * Feature-specific mechanics should prefer local hooks where possible.
 *
 * INVARIANT 11
 * semantic_event_bus hooks should normally remain observational.
 *
 * INVARIANT 12
 * action_economy/resource/lifecycle services own their rules; hooks only
 * attach those services to transaction timing.
 *
 * INVARIANT 13
 * execution-transaction-runner.js remains authoritative for stage order.
 *
 * INVARIANT 14
 * native_adapter does not depend on this module.
 *
 * INVARIANT 15
 * Existing Frame Conn architecture should migrate into stable hook stages
 * rather than accumulating direct cross-feature calls.
 */