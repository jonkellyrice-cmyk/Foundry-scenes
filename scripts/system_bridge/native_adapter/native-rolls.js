/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-rolls.js
 */

/**
 * @file
 * @path main/native_adapter/native-rolls.js
 * @module native-rolls
 * @layer native-adapter-rolls
 * @responsibility invoke-native-lancer-roll-flows-and-normalize-roll-results
 * @public-boundary false
 * @side-effects native-roll-flow-execution, chat-output
 *
 * @depends-on native-contract, native-actors, native-items
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by native-adapter.js
 * - consumed by native-execution.js
 * - consumed by native-combat.js
 * - consumed by execution_transaction/*
 * - consumed by future save/check orchestration
 * - consumed by Jockey contested-check runtime
 * - consumed by actor-owned feature strategies
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - runtime-orchestrator.js remains high-level coordinator
 * - native-execution.js owns action-level execution
 * - native-combat.js owns damage/combat mutation
 * - feature_actions/* owns semantic action composition
 *
 * THIS FILE OWNS:
 * - access to registered native Lancer roll Flow constructors
 * - native StatRollFlow invocation
 * - Pilot Trigger roll invocation
 * - generic native d20 Roll primitive
 * - extraction/normalization of completed native Roll results
 * - comparison helpers for Frame Conn parent orchestration
 *
 * THIS FILE DOES NOT OWN:
 * - WeaponAttackFlow
 * - TechAttackFlow
 * - DamageRollFlow
 * - action economy
 * - contested-check rules
 * - Save Target rules
 * - hit/miss rules for attacks
 * - feature-specific trigger semantics
 *
 * EDIT CONTRACT:
 * - use registered game.lancer.flows constructors
 * - do not invent Flow names
 * - preserve native HUD and chat output
 * - inspect Flow state after completion rather than scraping chat
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  NATIVE_EXECUTION_KIND,
  NATIVE_ROLL_KIND,
  NATIVE_ROLL_OUTCOME,
  createNativeCheckResult,
  createNativeRollResult,
  createNativeSaveResult,
  nativeExecutionBlocked,
  nativeExecutionCancelled,
  nativeExecutionFailed,
  nativeExecutionSucceeded
} from "./native-contract.js";

import {
  resolveNativeActor
} from "./native-actors.js";

import {
  resolveNativeItem
} from "./native-items.js";

/* ============================================================
   NATIVE FLOW NOTES
   ============================================================ */

/**
 * @section native-flow-notes
 *
 * Traced native flow:
 *
 * StatRollFlow
 * ├── initStatRollData
 * ├── showStatRollHUD
 * ├── rollCheck
 * └── printStatRollCard
 *
 * Native Flow registration:
 *
 * game.lancer.flows
 *   Map<string, FlowConstructor>
 *
 * StatRollFlow is registered under:
 *
 * "StatRollFlow"
 *
 * Flow.begin():
 *
 * - runs the native steps
 * - returns boolean success
 * - preserves completed state on flow.state
 *
 * StatRollFlow result:
 *
 * flow.state.data.result
 * {
 *   roll,
 *   tt
 * }
 *
 * For Actor source:
 *
 * StatRollFlow
 * → reads configured path from Actor
 *
 * For Pilot Skill/Trigger Item source:
 *
 * StatRollFlow
 * → requires item.is_skill()
 * → requires actor.is_pilot()
 * → bonus = item.system.curr_rank * 2
 */

/* ============================================================
   CONSTANTS
   ============================================================ */

/**
 * @section constants
 */

export const NATIVE_FLOW_NAME = Object.freeze({
  STAT_ROLL:
    "StatRollFlow",

  BASIC_ATTACK:
    "BasicAttackFlow",

  WEAPON_ATTACK:
    "WeaponAttackFlow",

  TECH_ATTACK:
    "TechAttackFlow",

  DAMAGE:
    "DamageRollFlow"
});

/**
 * Preferred Frame Conn semantic stat keys.
 *
 * These map to the prepared native Actor fields traced in
 * LancerActor preparation.
 */
export const NATIVE_STAT_PATH = Object.freeze({
  HULL:
    "system.hull",

  AGILITY:
    "system.agi",

  SYSTEMS:
    "system.sys",

  ENGINEERING:
    "system.eng",

  GRIT:
    "system.grit"
});

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

/**
 * @section private-helpers
 */

function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function finiteNumber(value) {
  return Number.isFinite(value);
}

function assertFiniteNumber(
  value,
  label
) {
  if (!finiteNumber(value)) {
    throw new TypeError(
      `${label} must be a finite number.`
    );
  }

  return value;
}

/**
 * Return a registered Lancer Flow constructor.
 *
 * Do not import internal system source modules directly.
 */
function getNativeFlowConstructor(
  flowName
) {
  if (!requiredString(flowName)) {
    throw new TypeError(
      "getNativeFlowConstructor requires flowName."
    );
  }

  const flows =
    globalThis.game
      ?.lancer
      ?.flows;

  if (
    !flows ||
    typeof flows.get !== "function"
  ) {
    throw new Error(
      "game.lancer.flows registry is unavailable."
    );
  }

  const FlowConstructor =
    flows.get(flowName);

  if (!FlowConstructor) {
    throw new Error(
      `Native Lancer Flow is unavailable: ${flowName}`
    );
  }

  return FlowConstructor;
}

function getRollTotal(roll) {
  if (!roll) {
    return null;
  }

  if (finiteNumber(roll.total)) {
    return roll.total;
  }

  if (
    finiteNumber(
      roll._total
    )
  ) {
    return roll._total;
  }

  return null;
}

/**
 * Extract the natural d20 result from a Roll when possible.
 *
 * Native Accuracy/Difficulty expressions may contain additional dice.
 * Search the Roll terms for the first d20 Die term.
 */
function getNaturalD20(roll) {
  if (!roll) {
    return null;
  }

  const terms =
    Array.isArray(roll.terms)
      ? roll.terms
      : [];

  for (const term of terms) {
    if (
      term?.faces === 20 &&
      Array.isArray(term.results)
    ) {
      const active =
        term.results.find(
          result =>
            result?.active !== false &&
            finiteNumber(
              result?.result
            )
        );

      if (active) {
        return active.result;
      }

      const first =
        term.results.find(
          result =>
            finiteNumber(
              result?.result
            )
        );

      if (first) {
        return first.result;
      }
    }
  }

  return null;
}

function getFlowRollResult(flow) {
  return (
    flow
      ?.state
      ?.data
      ?.result ??
    null
  );
}

function getFlowRoll(flow) {
  return (
    getFlowRollResult(flow)
      ?.roll ??
    null
  );
}

function normalizeBooleanExecutionStatus(
  completed
) {
  /*
   * Flow.begin() returns false when a step aborts.
   *
   * For interactive roll flows, the common false path is HUD
   * cancellation. Higher-level native-execution can distinguish more
   * specific blocked states when it has richer source context.
   */
  return Boolean(completed);
}

/* ============================================================
   NATIVE FLOW ACCESS
   ============================================================ */

/**
 * @section native-flow-access
 */

export function hasNativeFlow(
  flowName
) {
  const flows =
    globalThis.game
      ?.lancer
      ?.flows;

  return Boolean(
    flows &&
    typeof flows.has === "function" &&
    flows.has(flowName)
  );
}

export function getRegisteredNativeFlowNames() {
  const flows =
    globalThis.game
      ?.lancer
      ?.flows;

  if (
    !flows ||
    typeof flows.keys !== "function"
  ) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...flows.keys()
    ]
  );
}

/* ============================================================
   ROLL NORMALIZATION
   ============================================================ */

/**
 * @section roll-normalization
 */

export function normalizeNativeRoll({
  roll,
  kind,
  outcome =
    NATIVE_ROLL_OUTCOME.NONE,
  critical = false,
  targetUuid = null,
  sourceActorUuid = null,
  sourceItemUuid = null,
  raw = null
} = {}) {
  if (!roll) {
    throw new TypeError(
      "normalizeNativeRoll requires a native Roll."
    );
  }

  return createNativeRollResult({
    kind,

    total:
      getRollTotal(roll),

    natural:
      getNaturalD20(roll),

    outcome,

    critical,

    targetUuid,
    sourceActorUuid,
    sourceItemUuid,

    raw:
      raw ?? roll
  });
}

/* ============================================================
   STAT ROLL FLOW
   ============================================================ */

/**
 * @section stat-roll-flow
 *
 * This is the native primitive for HASE/GRIT checks and saves.
 *
 * It preserves:
 *
 * - native Accuracy/Difficulty HUD
 * - native roll formula
 * - native chat output
 */

export async function rollNativeStat({
  actor: actorReference,
  path,
  title = null,
  kind = NATIVE_ROLL_KIND.CHECK
} = {}) {
  if (!requiredString(path)) {
    throw new TypeError(
      "rollNativeStat requires a native Actor stat path."
    );
  }

  const actor =
    await resolveNativeActor(
      actorReference
    );

  const StatRollFlow =
    getNativeFlowConstructor(
      NATIVE_FLOW_NAME.STAT_ROLL
    );

  let flow;

  try {
    flow =
      new StatRollFlow(
        actor,
        {
          path,
          title:
            title ?? ""
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.STAT_ROLL,

      actorUuid:
        actor.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error
    });
  }

  let completed;

  try {
    completed =
      await flow.begin();
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.STAT_ROLL,

      actorUuid:
        actor.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error,

      raw:
        flow
    });
  }

  if (
    !normalizeBooleanExecutionStatus(
      completed
    )
  ) {
    return nativeExecutionCancelled({
      kind:
        NATIVE_EXECUTION_KIND.STAT_ROLL,

      actorUuid:
        actor.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      raw:
        flow
    });
  }

  const roll =
    getFlowRoll(flow);

  if (!roll) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.STAT_ROLL,

      actorUuid:
        actor.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error:
        new Error(
          "Native StatRollFlow completed without a Roll result."
        ),

      raw:
        flow
    });
  }

  const normalized =
    normalizeNativeRoll({
      roll,
      kind,
      sourceActorUuid:
        actor.uuid,
      raw:
        getFlowRollResult(flow)
    });

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.STAT_ROLL,

    actorUuid:
      actor.uuid,

    nativeFlow:
      NATIVE_FLOW_NAME.STAT_ROLL,

    result:
      createNativeCheckResult({
        actorUuid:
          actor.uuid,

        stat:
          path,

        roll:
          normalized,

        succeeded:
          null,

        raw:
          flow.state.data
      }),

    raw:
      flow
  });
}

/* ============================================================
   HASE / GRIT CONVENIENCE WRAPPERS
   ============================================================ */

/**
 * @section hase-grit-wrappers
 *
 * These are convenience wrappers only.
 *
 * They still invoke native StatRollFlow.
 */

export async function rollNativeHull(
  actorReference,
  options = {}
) {
  return rollNativeStat({
    actor:
      actorReference,

    path:
      NATIVE_STAT_PATH.HULL,

    title:
      options.title ??
      "HULL",

    kind:
      options.kind ??
      NATIVE_ROLL_KIND.CHECK
  });
}

export async function rollNativeAgility(
  actorReference,
  options = {}
) {
  return rollNativeStat({
    actor:
      actorReference,

    path:
      NATIVE_STAT_PATH.AGILITY,

    title:
      options.title ??
      "AGILITY",

    kind:
      options.kind ??
      NATIVE_ROLL_KIND.CHECK
  });
}

export async function rollNativeSystems(
  actorReference,
  options = {}
) {
  return rollNativeStat({
    actor:
      actorReference,

    path:
      NATIVE_STAT_PATH.SYSTEMS,

    title:
      options.title ??
      "SYSTEMS",

    kind:
      options.kind ??
      NATIVE_ROLL_KIND.CHECK
  });
}

export async function rollNativeEngineering(
  actorReference,
  options = {}
) {
  return rollNativeStat({
    actor:
      actorReference,

    path:
      NATIVE_STAT_PATH.ENGINEERING,

    title:
      options.title ??
      "ENGINEERING",

    kind:
      options.kind ??
      NATIVE_ROLL_KIND.CHECK
  });
}

export async function rollNativeGrit(
  actorReference,
  options = {}
) {
  return rollNativeStat({
    actor:
      actorReference,

    path:
      NATIVE_STAT_PATH.GRIT,

    title:
      options.title ??
      "GRIT",

    kind:
      options.kind ??
      NATIVE_ROLL_KIND.CHECK
  });
}

/* ============================================================
   PILOT TRIGGER / SKILL ROLLS
   ============================================================ */

/**
 * @section pilot-trigger-rolls
 *
 * Native Pilot Trigger path:
 *
 * Skill Item
 * → StatRollFlow(Item)
 *
 * Native flow:
 *
 * - validates item.is_skill()
 * - validates owning actor.is_pilot()
 * - reads system.curr_rank
 * - bonus = curr_rank * 2
 * - opens native Accuracy/Difficulty HUD
 * - rolls
 * - prints native chat card
 */

export async function rollNativePilotTrigger({
  trigger: triggerReference,
  title = null
} = {}) {
  const trigger =
    await resolveNativeItem(
      triggerReference
    );

  if (!trigger.is_skill?.()) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

      actorUuid:
        trigger.actor?.uuid ??
        null,

      itemUuid:
        trigger.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error:
        new Error(
          "Native Pilot Trigger roll requires a Skill Item."
        )
    });
  }

  const pilot =
    trigger.actor;

  if (!pilot?.is_pilot?.()) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

      actorUuid:
        pilot?.uuid ??
        null,

      itemUuid:
        trigger.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error:
        new Error(
          "Native Pilot Trigger must belong to a Pilot actor."
        )
    });
  }

  const StatRollFlow =
    getNativeFlowConstructor(
      NATIVE_FLOW_NAME.STAT_ROLL
    );

  let flow;

  try {
    flow =
      new StatRollFlow(
        trigger,
        {
          path:
            "system.curr_rank",

          title:
            title ??
            trigger.name ??
            ""
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

      actorUuid:
        pilot.uuid,

      itemUuid:
        trigger.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error
    });
  }

  let completed;

  try {
    completed =
      await flow.begin();
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

      actorUuid:
        pilot.uuid,

      itemUuid:
        trigger.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error,

      raw:
        flow
    });
  }

  if (!completed) {
    return nativeExecutionCancelled({
      kind:
        NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

      actorUuid:
        pilot.uuid,

      itemUuid:
        trigger.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      raw:
        flow
    });
  }

  const roll =
    getFlowRoll(flow);

  if (!roll) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

      actorUuid:
        pilot.uuid,

      itemUuid:
        trigger.uuid,

      nativeFlow:
        NATIVE_FLOW_NAME.STAT_ROLL,

      error:
        new Error(
          "Native Pilot Trigger roll completed without a Roll result."
        ),

      raw:
        flow
    });
  }

  const normalized =
    normalizeNativeRoll({
      roll,

      kind:
        NATIVE_ROLL_KIND.CHECK,

      sourceActorUuid:
        pilot.uuid,

      sourceItemUuid:
        trigger.uuid,

      raw:
        getFlowRollResult(flow)
    });

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.TRIGGER_ROLL,

    actorUuid:
      pilot.uuid,

    itemUuid:
      trigger.uuid,

    nativeFlow:
      NATIVE_FLOW_NAME.STAT_ROLL,

    result:
      createNativeCheckResult({
        actorUuid:
          pilot.uuid,

        triggerItemUuid:
          trigger.uuid,

        roll:
          normalized,

        succeeded:
          null,

        raw:
          flow.state.data
      }),

    raw:
      flow
  });
}

/* ============================================================
   SAVE ROLLS
   ============================================================ */

/**
 * @section save-rolls
 *
 * Repository finding:
 *
 * LancerFlowState defines SaveRollData, but it is currently only a
 * placeholder over StatRollData.
 *
 * There is no separate registered SaveRollFlow.
 *
 * HASE saves therefore use StatRollFlow as the roll primitive.
 *
 * Frame Conn must supply:
 *
 * - requested save type
 * - Save Target
 * - success/failure comparison
 * - source/target relationship
 *
 * Do NOT invent a native SaveFlow.
 */

export async function rollNativeSave({
  actor: actorReference,
  saveType,
  path,
  saveTarget,
  sourceActorUuid = null,
  sourceItemUuid = null,
  title = null
} = {}) {
  if (!requiredString(saveType)) {
    throw new TypeError(
      "rollNativeSave requires saveType."
    );
  }

  if (!requiredString(path)) {
    throw new TypeError(
      "rollNativeSave requires native stat path."
    );
  }

  assertFiniteNumber(
    saveTarget,
    "Save Target"
  );

  const execution =
    await rollNativeStat({
      actor:
        actorReference,

      path,

      title:
        title ??
        `${saveType.toUpperCase()} SAVE`,

      kind:
        NATIVE_ROLL_KIND.SAVE
    });

  if (
    execution.status !==
    "succeeded"
  ) {
    return execution;
  }

  const actor =
    await resolveNativeActor(
      actorReference
    );

  const roll =
    execution.result?.roll;

  const total =
    roll?.total;

  const succeeded =
    finiteNumber(total)
      ? total >= saveTarget
      : false;

  const normalizedRoll =
    createNativeRollResult({
      kind:
        NATIVE_ROLL_KIND.SAVE,

      total:
        roll?.total ??
        null,

      natural:
        roll?.natural ??
        null,

      outcome:
        succeeded
          ? NATIVE_ROLL_OUTCOME.SUCCESS
          : NATIVE_ROLL_OUTCOME.FAILURE,

      critical:
        false,

      sourceActorUuid:
        actor.uuid,

      sourceItemUuid,

      raw:
        roll?.raw ??
        execution.raw
    });

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.SAVE,

    actorUuid:
      actor.uuid,

    itemUuid:
      sourceItemUuid,

    nativeFlow:
      NATIVE_FLOW_NAME.STAT_ROLL,

    result:
      createNativeSaveResult({
        actorUuid:
          actor.uuid,

        saveType,

        saveTarget,

        roll:
          normalizedRoll,

        succeeded,

        sourceActorUuid,

        sourceItemUuid,

        raw:
          execution.raw
      }),

    raw:
      execution.raw
  });
}

/* ============================================================
   SAVE TYPE HELPERS
   ============================================================ */

/**
 * @section save-type-helpers
 */

export async function rollNativeHullSave(
  actorReference,
  saveTarget,
  options = {}
) {
  return rollNativeSave({
    actor:
      actorReference,

    saveType:
      "hull",

    path:
      NATIVE_STAT_PATH.HULL,

    saveTarget,

    ...options
  });
}

export async function rollNativeAgilitySave(
  actorReference,
  saveTarget,
  options = {}
) {
  return rollNativeSave({
    actor:
      actorReference,

    saveType:
      "agility",

    path:
      NATIVE_STAT_PATH.AGILITY,

    saveTarget,

    ...options
  });
}

export async function rollNativeSystemsSave(
  actorReference,
  saveTarget,
  options = {}
) {
  return rollNativeSave({
    actor:
      actorReference,

    saveType:
      "systems",

    path:
      NATIVE_STAT_PATH.SYSTEMS,

    saveTarget,

    ...options
  });
}

export async function rollNativeEngineeringSave(
  actorReference,
  saveTarget,
  options = {}
) {
  return rollNativeSave({
    actor:
      actorReference,

    saveType:
      "engineering",

    path:
      NATIVE_STAT_PATH.ENGINEERING,

    saveTarget,

    ...options
  });
}

/* ============================================================
   GENERIC D20
   ============================================================ */

/**
 * @section generic-d20
 *
 * Some mechanics require an ordinary d20 rather than a Lancer StatRollFlow.
 *
 * Examples:
 *
 * - corrected Cascade check
 * - Universal Compatibility recovery roll
 *
 * Use native Foundry Roll.
 *
 * No HUD is shown unless the source rule specifically requires one.
 */

export async function rollNativeD20({
  modifier = 0,
  title = null,
  sourceActorUuid = null,
  sourceItemUuid = null,
  createChatMessage = false
} = {}) {
  assertFiniteNumber(
    modifier,
    "d20 modifier"
  );

  if (
    typeof globalThis.Roll !==
    "function"
  ) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.STAT_ROLL,

      actorUuid:
        sourceActorUuid,

      itemUuid:
        sourceItemUuid,

      nativeFlow:
        null,

      error:
        new Error(
          "Foundry Roll constructor is unavailable."
        )
    });
  }

  const formula =
    modifier === 0
      ? "1d20"
      : `1d20${modifier >= 0 ? "+" : ""}${modifier}`;

  let roll;

  try {
    roll =
      await new globalThis.Roll(
        formula
      ).evaluate();
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.STAT_ROLL,

      actorUuid:
        sourceActorUuid,

      itemUuid:
        sourceItemUuid,

      error
    });
  }

  if (
    createChatMessage &&
    typeof roll.toMessage ===
      "function"
  ) {
    await roll.toMessage({
      flavor:
        title ?? undefined
    });
  }

  const normalized =
    normalizeNativeRoll({
      roll,

      kind:
        NATIVE_ROLL_KIND.D20,

      sourceActorUuid,
      sourceItemUuid
    });

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.STAT_ROLL,

    actorUuid:
      sourceActorUuid,

    itemUuid:
      sourceItemUuid,

    result:
      normalized,

    raw:
      roll
  });
}

/* ============================================================
   RESULT EXTRACTION
   ============================================================ */

/**
 * @section result-extraction
 *
 * Parent orchestrators should consume normalized contract results.
 *
 * Raw Flow state remains available as an escape hatch only.
 */

export function getNormalizedRollFromExecution(
  executionResult
) {
  if (!executionResult) {
    return null;
  }

  if (
    executionResult.result?.roll
  ) {
    return executionResult.result.roll;
  }

  if (
    executionResult.result?.kind &&
    finiteNumber(
      executionResult.result.total
    )
  ) {
    return executionResult.result;
  }

  return null;
}

export function getNormalizedRollTotal(
  executionResult
) {
  return (
    getNormalizedRollFromExecution(
      executionResult
    )
      ?.total ??
    null
  );
}

export function getNormalizedNaturalD20(
  executionResult
) {
  return (
    getNormalizedRollFromExecution(
      executionResult
    )
      ?.natural ??
    null
  );
}

/* ============================================================
   CONTESTED ROLL COMPARISON
   ============================================================ */

/**
 * @section contested-roll-comparison
 *
 * The native system supplies the individual rolls.
 *
 * Frame Conn supplies contested-check coordination where the action
 * requires it.
 *
 * This helper compares results only.
 *
 * Tie semantics remain caller-owned unless explicitly provided.
 */

export function compareNativeRollTotals(
  firstExecution,
  secondExecution,
  {
    tie = "tie"
  } = {}
) {
  const first =
    getNormalizedRollTotal(
      firstExecution
    );

  const second =
    getNormalizedRollTotal(
      secondExecution
    );

  if (
    !finiteNumber(first) ||
    !finiteNumber(second)
  ) {
    return Object.freeze({
      resolved: false,
      first,
      second,
      winner: null
    });
  }

  if (first > second) {
    return Object.freeze({
      resolved: true,
      first,
      second,
      winner: "first"
    });
  }

  if (second > first) {
    return Object.freeze({
      resolved: true,
      first,
      second,
      winner: "second"
    });
  }

  return Object.freeze({
    resolved: true,
    first,
    second,
    winner: tie
  });
}

/* ============================================================
   JOCKEY SUPPORT BOUNDARY
   ============================================================ */

/**
 * @section jockey-support-boundary
 *
 * Jockey should compose:
 *
 * attacker:
 *   rollNativeGrit(...)
 *   OR
 *   rollNativePilotTrigger(...)
 *
 * defender:
 *   rollNativeHull(...)
 *
 * then:
 *
 * compareNativeRollTotals(...)
 *
 * Jockey state/effects do not belong here.
 */

/* ============================================================
   SAVE ORCHESTRATION BOUNDARY
   ============================================================ */

/**
 * @section save-orchestration-boundary
 *
 * Mounted systems / AoE / feature strategies may require:
 *
 * multiple targets
 * → one native StatRollFlow per target
 * → compare against source Save Target
 *
 * Looping over targets belongs to the semantic action/effect runtime.
 *
 * native-rolls.js only owns each individual native roll.
 */

/* ============================================================
   ATTACK ROLL BOUNDARY
   ============================================================ */

/**
 * @section attack-roll-boundary
 *
 * DO NOT use StatRollFlow for:
 *
 * normal weapon attacks
 * Tech Attacks
 * basic attacks
 *
 * Those have dedicated native Flows:
 *
 * WeaponAttackFlow
 * TechAttackFlow
 * BasicAttackFlow
 *
 * Their action-level wrappers belong to native-execution.js.
 *
 * This file may normalize their resulting Roll objects later if needed,
 * but it does not invoke those attack Flows directly.
 */

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing direct stat/roll calls should migrate behind:
 *
 * native-rolls.js
 * → native-adapter.js
 *
 *
 * feature_actions/
 * ----------------
 * Skill Check / Pilot check actions should request:
 *
 * native roll primitive
 *
 * rather than constructing Roll formulas directly.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Should not:
 *
 * new Roll("1d20...")
 * actor.beginStatFlow(...)
 *
 * directly after migration.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → semantic action
 * → execution_transaction
 * → native-adapter
 * → native-rolls
 *
 *
 * execution_transaction/
 * ----------------------
 * Uses normalized execution status:
 *
 * succeeded
 * cancelled
 * failed
 * blocked
 *
 * Cancellation must remain distinct so deferred resources/action economy
 * are not committed incorrectly.
 *
 *
 * Jockey runtime
 * --------------
 * Uses:
 *
 * rollNativeGrit()
 * rollNativePilotTrigger()
 * rollNativeHull()
 * compareNativeRollTotals()
 *
 * This file does not own the Jockey state machine.
 *
 *
 * mounted-systems runtime
 * -----------------------
 * Save-based system effects should:
 *
 * resolve source Save Target
 * → target selection
 * → rollNative*Save(target)
 * → apply source-specific consequence
 *
 *
 * resource_service/
 * -----------------
 * Resource mutations are unrelated to roll execution.
 *
 * Do not consume counters/frequency merely because a roll HUD opened.
 *
 *
 * semantic_event_bus/
 * -------------------
 * Higher execution layers may emit:
 *
 * checkSucceeded
 * checkFailed
 * saveSucceeded
 * saveFailed
 *
 * after normalized result interpretation.
 *
 * native-rolls.js itself does not emit semantic events.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * StatRollFlow is the native HASE/GRIT/Trigger roll primitive.
 *
 * INVARIANT 2
 * Pilot Trigger rolls use the Skill Item as the StatRollFlow source.
 *
 * INVARIANT 3
 * Use game.lancer.flows to obtain native Flow constructors.
 *
 * INVARIANT 4
 * Preserve native Accuracy/Difficulty HUD behavior.
 *
 * INVARIANT 5
 * Preserve native chat-card output.
 *
 * INVARIANT 6
 * Inspect completed Flow state instead of scraping chat output.
 *
 * INVARIANT 7
 * There is no separate native SaveRollFlow in the traced repository.
 *
 * INVARIANT 8
 * Save success/failure comparison is Frame Conn orchestration over
 * native StatRollFlow.
 *
 * INVARIANT 9
 * Weapon/Tech/Basic attacks use their dedicated native Flows, not
 * StatRollFlow.
 *
 * INVARIANT 10
 * Contested-check rules do not belong in this adapter.
 *
 * INVARIANT 11
 * Raw Flow/Roll objects are escape-hatch data; higher layers should use
 * normalized contracts.
 *
 * INVARIANT 12
 * Roll cancellation must remain distinct from mechanical failure.
 */