/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-execution.js
 */

/**
 * @file
 * @path main/native_adapter/native-execution.js
 * @module native-execution
 * @layer native-adapter-execution
 * @responsibility invoke-traced-native-lancer-flows-and-normalize-execution-results
 * @public-boundary false
 * @side-effects native-flow-execution, native-document-mutation, native-chat-output
 *
 * @depends-on
 * - native-contract
 * - native-actors
 * - native-items
 * - native-rolls
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by native-adapter.js
 * - consumed by execution_transaction/*
 * - consumed by semantic_execution_context/*
 * - consumed by feature_actions/*
 * - consumed by actor_owned_feature_registry/*
 * - consumed by weapon/system/core-power strategies
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - runtime-orchestrator.js remains high-level runtime coordinator
 * - feature_actions/* remain semantic action definitions
 * - resource_service/* owns resource transaction orchestration
 * - action_economy/* owns Quick/Full/etc. expenditure
 * - targeting_spatial_service/* owns pre-Flow target legality
 * - native-rolls.js owns normalized Stat/Trigger/save primitives
 * - native-combat.js owns already-resolved direct damage
 *
 * THIS FILE OWNS:
 * - registered native Flow lookup
 * - native WeaponAttackFlow invocation
 * - native BasicAttackFlow invocation
 * - native TechAttackFlow invocation
 * - native ActivationFlow invocation
 * - native SystemFlow invocation
 * - native CoreActiveFlow invocation
 * - native DamageRollFlow invocation
 * - normalized native Flow completion/result boundaries
 *
 * THIS FILE DOES NOT OWN:
 * - action economy
 * - action frequency
 * - Range/LOS legality
 * - Skirmish/Barrage mount orchestration
 * - save orchestration
 * - special weapon/system effect interpretation
 * - effect lifecycle
 * - semantic event dispatch
 * - direct resolved damage calculation
 *
 * EDIT CONTRACT:
 * - obtain Flow constructors from game.lancer.flows
 * - use exact traced Flow names
 * - preserve native ordered Flow steps
 * - preserve native HUD/chat behavior
 * - inspect completed Flow state instead of scraping chat
 * - do not duplicate native resource mutations
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  NATIVE_EXECUTION_KIND,
  NATIVE_EXECUTION_STATUS,
  NATIVE_ROLL_KIND,
  NATIVE_ROLL_OUTCOME,
  createNativeAttackResult,
  createNativeAttackTargetResult,
  nativeExecutionBlocked,
  nativeExecutionCancelled,
  nativeExecutionFailed,
  nativeExecutionSucceeded
} from "./native-contract.js";

import {
  resolveNativeActor
} from "./native-actors.js";

import {
  resolveNativeItem,
  getNativeActionAtPath,
  getActiveWeaponProfile
} from "./native-items.js";

import {
  normalizeNativeRoll
} from "./native-rolls.js";

/* ============================================================
   NATIVE FLOW NAMES
   ============================================================ */

/**
 * @section native-flow-names
 *
 * Exact names registered by:
 *
 * src/module/flows/register-flows.ts
 */

export const NATIVE_EXECUTION_FLOW = Object.freeze({
  WEAPON_ATTACK:
    "WeaponAttackFlow",

  BASIC_ATTACK:
    "BasicAttackFlow",

  TECH_ATTACK:
    "TechAttackFlow",

  ACTIVATION:
    "ActivationFlow",

  SYSTEM:
    "SystemFlow",

  CORE_ACTIVE:
    "CoreActiveFlow",

  DAMAGE:
    "DamageRollFlow"
});

/* ============================================================
   NATIVE FLOW STEP NOTES
   ============================================================ */

/**
 * @section native-flow-step-notes
 *
 * WeaponAttackFlow
 * ----------------
 *
 * initAttackData
 * checkItemDestroyed
 * checkWeaponLoaded
 * checkItemLimited
 * checkItemCharged
 * setAttackTags
 * setAttackEffects
 * setAttackTargets
 * showAttackHUD
 * rollAttacks
 * applySelfHeat
 * updateItemAfterAction
 * printAttackCard
 *
 *
 * BasicAttackFlow
 * ---------------
 *
 * initAttackData
 * setAttackTags
 * setAttackEffects
 * setAttackTargets
 * showAttackHUD
 * rollAttacks
 * applySelfHeat
 * printAttackCard
 *
 *
 * TechAttackFlow
 * --------------
 *
 * initTechAttackData
 * checkItemDestroyed
 * checkItemLimited
 * checkItemCharged
 * setAttackTags
 * setAttackEffects
 * setAttackTargets
 * showAttackHUD
 * rollAttacks
 * applySelfHeat
 * updateItemAfterAction
 * printTechAttackCard
 *
 *
 * ActivationFlow
 * --------------
 *
 * initActivationData
 * checkItemDestroyed
 * checkItemLimited
 * checkItemCharged
 * applySelfHeat
 * updateItemAfterAction
 * printActionUseCard
 *
 *
 * SystemFlow
 * ----------
 *
 * initSystemUseData
 * checkItemDestroyed
 * checkItemLimited
 * checkItemCharged
 * applySelfHeat
 * updateItemAfterAction
 * printSystemCard
 *
 *
 * CoreActiveFlow
 * --------------
 *
 * initActivationData
 * checkItemDestroyed
 * checkItemLimited
 * checkItemCharged
 * checkCorePower
 * applySelfHeat
 * updateItemAfterAction
 * consumeCorePower
 * printActionUseCard
 *
 *
 * DamageRollFlow
 * --------------
 *
 * initDamageData
 * setDamageTags
 * setDamageTargets
 * showDamageHUD
 * rollReliable
 * rollNormalDamage
 * rollCritDamage
 * applyOverkillHeat
 * printDamageCard
 */

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

function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}

/**
 * Use the system's registered Flow boundary.
 *
 * Do not import internal Foundry Lancer source modules.
 */
function getNativeFlowConstructor(
  flowName
) {
  if (!requiredString(flowName)) {
    throw new TypeError(
      "Native Flow name must be a non-empty string."
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
      `Native Lancer Flow not registered: ${flowName}`
    );
  }

  return FlowConstructor;
}

export function installNativeFlowStepBefore({
  stepName,
  beforeStep,
  flowNames = [],
  step
} = {}) {
  if (!requiredString(stepName)) {
    throw new TypeError(
      "Native Flow extension stepName must be a non-empty string."
    );
  }

  if (!requiredString(beforeStep)) {
    throw new TypeError(
      "Native Flow extension beforeStep must be a non-empty string."
    );
  }

  if (
    !Array.isArray(flowNames) ||
    flowNames.length === 0 ||
    flowNames.some(flowName => !requiredString(flowName))
  ) {
    throw new TypeError(
      "Native Flow extension flowNames must be a non-empty array of Flow names."
    );
  }

  if (typeof step !== "function") {
    throw new TypeError(
      "Native Flow extension step must be a function."
    );
  }

  const flowSteps =
    globalThis.game
      ?.lancer
      ?.flowSteps;

  if (
    !flowSteps ||
    typeof flowSteps.get !== "function" ||
    typeof flowSteps.set !== "function"
  ) {
    throw new Error(
      "game.lancer.flowSteps registry is unavailable."
    );
  }

  const existingStep =
    flowSteps.get(stepName);

  if (
    existingStep &&
    existingStep !== step
  ) {
    throw new Error(
      `Native Lancer Flow step already exists with a different implementation: ${stepName}`
    );
  }

  if (!existingStep) {
    flowSteps.set(
      stepName,
      step
    );
  }

  const installedFlows =
    [];

  for (const flowName of flowNames) {
    const FlowConstructor =
      getNativeFlowConstructor(
        flowName
      );

    if (
      !Array.isArray(FlowConstructor.steps) ||
      !FlowConstructor.steps.includes(beforeStep)
    ) {
      throw new Error(
        `Native Lancer Flow ${flowName} does not contain required step ${beforeStep}.`
      );
    }

    if (
      !FlowConstructor.steps.includes(stepName)
    ) {
      FlowConstructor.insertStepBefore(
        beforeStep,
        stepName
      );
    }

    installedFlows.push(
      flowName
    );
  }

  return Object.freeze({
    stepName,
    beforeStep,
    flowNames:
      Object.freeze([
        ...installedFlows
      ])
  });
}

function getFlowStateData(flow) {
  return (
    flow
      ?.state
      ?.data ??
    null
  );
}

function getNativeTargetToken(
  hitResult
) {
  return (
    hitResult?.target ??
    null
  );
}

function getNativeTargetActor(
  hitResult
) {
  const target =
    getNativeTargetToken(
      hitResult
    );

  return (
    target?.actor ??
    target?.document?.actor ??
    null
  );
}

function getNativeTargetActorUuid(
  hitResult
) {
  const actor =
    getNativeTargetActor(
      hitResult
    );

  return (
    actor?.uuid ??
    null
  );
}

function getNativeTargetTokenUuid(
  hitResult
) {
  const target =
    getNativeTargetToken(
      hitResult
    );

  return (
    target?.document?.uuid ??
    target?.uuid ??
    null
  );
}

function getRollNaturalD20(roll) {
  if (!roll) {
    return null;
  }

  for (
    const term of
      Array.isArray(roll.terms)
        ? roll.terms
        : []
  ) {
    if (
      term?.faces !== 20 ||
      !Array.isArray(
        term.results
      )
    ) {
      continue;
    }

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

  return null;
}

/* ============================================================
   GENERIC FLOW EXECUTION
   ============================================================ */

/**
 * @section generic-flow-execution
 *
 * Internal primitive for wrappers in this file.
 *
 * Native Flow.begin() returns:
 *
 * true
 * → all ordered steps completed
 *
 * false
 * → a Flow step intentionally aborted
 *
 * Interactive attack/damage/stat Flows commonly return false when a
 * HUD is cancelled.
 *
 * Some native flows also return false to deliberately delegate to a
 * different Flow. Those cases must be detected BEFORE calling this
 * helper.
 */

async function beginNativeFlow({
  flow,
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  flowName,
  falseStatus =
    NATIVE_EXECUTION_STATUS.CANCELLED
} = {}) {
  let completed;

  try {
    completed =
      await flow.begin();
  } catch (error) {
    return nativeExecutionFailed({
      kind,
      actorUuid,
      itemUuid,
      actionPath,
      nativeFlow:
        flowName,
      error,
      raw:
        flow
    });
  }

  if (completed) {
    return nativeExecutionSucceeded({
      kind,
      actorUuid,
      itemUuid,
      actionPath,
      nativeFlow:
        flowName,
      result:
        getFlowStateData(
          flow
        ),
      raw:
        flow
    });
  }

  if (
    falseStatus ===
    NATIVE_EXECUTION_STATUS.BLOCKED
  ) {
    return nativeExecutionBlocked({
      kind,
      actorUuid,
      itemUuid,
      actionPath,
      nativeFlow:
        flowName,
      raw:
        flow
    });
  }

  return nativeExecutionCancelled({
    kind,
    actorUuid,
    itemUuid,
    actionPath,
    nativeFlow:
      flowName,
    result:
      getFlowStateData(
        flow
      ),
    raw:
      flow
  });
}

/* ============================================================
   ATTACK RESULT NORMALIZATION
   ============================================================ */

/**
 * @section attack-result-normalization
 *
 * Native attack Flow state contains:
 *
 * attack_results[]
 * hit_results[]
 *
 * hit_results entries contain:
 *
 * target
 * total
 * usedLockOn
 * hit
 * crit
 */

function normalizeNativeAttackFlowResult({
  flow,
  sourceActorUuid,
  sourceItemUuid = null,
  attackType = null
} = {}) {
  const data =
    getFlowStateData(flow);

  const attackResults =
    Array.isArray(
      data?.attack_results
    )
      ? data.attack_results
      : [];

  const hitResults =
    Array.isArray(
      data?.hit_results
    )
      ? data.hit_results
      : [];

  const targets = [];

  /*
   * Native targeted automation creates parallel attack_results and
   * hit_results arrays.
   *
   * Untargeted rolls have attack_results but no hit_results.
   */
  for (
    let index = 0;
    index < hitResults.length;
    index += 1
  ) {
    const hitResult =
      hitResults[index];

    const attackResult =
      attackResults[index] ??
      null;

    const roll =
      attackResult?.roll ??
      null;

    const actorUuid =
      getNativeTargetActorUuid(
        hitResult
      );

    const tokenUuid =
      getNativeTargetTokenUuid(
        hitResult
      );

    const normalizedRoll =
      roll
        ? normalizeNativeRoll({
            roll,

            kind:
              attackType === "Tech"
                ? NATIVE_ROLL_KIND.TECH_ATTACK
                : NATIVE_ROLL_KIND.ATTACK,

            outcome:
              hitResult?.crit
                ? NATIVE_ROLL_OUTCOME.CRIT
                : hitResult?.hit
                  ? NATIVE_ROLL_OUTCOME.HIT
                  : NATIVE_ROLL_OUTCOME.MISS,

            critical:
              Boolean(
                hitResult?.crit
              ),

            targetUuid:
              actorUuid,

            sourceActorUuid,
            sourceItemUuid,

            raw:
              attackResult
          })
        : null;

    targets.push(
      createNativeAttackTargetResult({
        target:
          Object.freeze({
            actorUuid,
            tokenUuid,

            name:
              getNativeTargetActor(
                hitResult
              )?.name ??
              null,

            nativeActor:
              getNativeTargetActor(
                hitResult
              ),

            nativeToken:
              getNativeTargetToken(
                hitResult
              )
          }),

        roll:
          normalizedRoll,

        hit:
          Boolean(
            hitResult?.hit
          ),

        crit:
          Boolean(
            hitResult?.crit
          ),

        raw:
          hitResult
      })
    );
  }

  return createNativeAttackResult({
    attackType:
      attackType ??
      data?.attack_type ??
      null,

    sourceActorUuid,

    sourceItemUuid,

    targets,

    raw:
      data
  });
}

/* ============================================================
   WEAPON ATTACK
   ============================================================ */

/**
 * @section weapon-attack
 *
 * Native entry:
 *
 * WeaponAttackFlow(Item)
 *
 * Supported native source types:
 *
 * - Mech Weapon
 * - Pilot Weapon
 * - attack-capable NPC Feature
 *
 * Native Flow owns:
 *
 * - destroyed check
 * - loaded check
 * - Limited check/consumption
 * - Charged check where applicable
 * - native tags
 * - attack HUD
 * - attack roll
 * - Lock On consumption
 * - Self Heat
 * - unload after Loading weapon use
 * - chat card
 *
 * Native Flow DOES NOT automatically start DamageRollFlow.
 */

export async function executeNativeWeaponAttack({
  weapon: weaponReference
} = {}) {
  const weapon =
    await resolveNativeItem(
      weaponReference
    );

  if (
    !weapon.is_mech_weapon?.() &&
    !weapon.is_pilot_weapon?.() &&
    !weapon.is_npc_feature?.()
  ) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.WEAPON_ATTACK,

      actorUuid:
        weapon.actor?.uuid ??
        null,

      itemUuid:
        weapon.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.WEAPON_ATTACK,

      error:
        new Error(
          `${weapon.name ?? weapon.uuid} cannot use WeaponAttackFlow.`
        )
    });
  }

  const WeaponAttackFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.WEAPON_ATTACK
    );

  let flow;

  try {
    flow =
      new WeaponAttackFlow(
        weapon
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.WEAPON_ATTACK,

      actorUuid:
        weapon.actor?.uuid ??
        null,

      itemUuid:
        weapon.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.WEAPON_ATTACK,

      error
    });
  }

  const execution =
    await beginNativeFlow({
      flow,

      kind:
        NATIVE_EXECUTION_KIND.WEAPON_ATTACK,

      actorUuid:
        weapon.actor?.uuid ??
        null,

      itemUuid:
        weapon.uuid,

      flowName:
        NATIVE_EXECUTION_FLOW.WEAPON_ATTACK
    });

  if (
    execution.status !==
    NATIVE_EXECUTION_STATUS.SUCCEEDED
  ) {
    return execution;
  }

  const actorUuid =
    weapon.actor?.uuid ??
    flow.state?.actor?.uuid ??
    null;

  const data =
    getFlowStateData(flow);

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.WEAPON_ATTACK,

    actorUuid,

    itemUuid:
      weapon.uuid,

    nativeFlow:
      NATIVE_EXECUTION_FLOW.WEAPON_ATTACK,

    result:
      normalizeNativeAttackFlowResult({
        flow,

        sourceActorUuid:
          actorUuid,

        sourceItemUuid:
          weapon.uuid,

        attackType:
          data?.attack_type ??
          null
      }),

    raw:
      flow
  });
}

/* ============================================================
   BASIC ATTACK
   ============================================================ */

/**
 * @section basic-attack
 *
 * Native entry:
 *
 * BasicAttackFlow(Actor)
 *
 * Used by native generic attack utilities.
 *
 * Pilot actors use native GRIT preparation.
 */

export async function executeNativeBasicAttack({
  actor: actorReference,
  title = null
} = {}) {
  const actor =
    await resolveNativeActor(
      actorReference
    );

  const BasicAttackFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.BASIC_ATTACK
    );

  let flow;

  try {
    flow =
      new BasicAttackFlow(
        actor,
        title
          ? { title }
          : undefined
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.BASIC_ATTACK,

      actorUuid:
        actor.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.BASIC_ATTACK,

      error
    });
  }

  const execution =
    await beginNativeFlow({
      flow,

      kind:
        NATIVE_EXECUTION_KIND.BASIC_ATTACK,

      actorUuid:
        actor.uuid,

      flowName:
        NATIVE_EXECUTION_FLOW.BASIC_ATTACK
    });

  if (
    execution.status !==
    NATIVE_EXECUTION_STATUS.SUCCEEDED
  ) {
    return execution;
  }

  const data =
    getFlowStateData(flow);

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.BASIC_ATTACK,

    actorUuid:
      actor.uuid,

    nativeFlow:
      NATIVE_EXECUTION_FLOW.BASIC_ATTACK,

    result:
      normalizeNativeAttackFlowResult({
        flow,

        sourceActorUuid:
          actor.uuid,

        attackType:
          data?.attack_type ??
          null
      }),

    raw:
      flow
  });
}

/* ============================================================
   BASIC TECH ATTACK
   ============================================================ */

/**
 * @section basic-tech-attack
 *
 * Native actor convenience method:
 *
 * actor.beginBasicTechAttackFlow(title)
 *
 * constructs:
 *
 * TechAttackFlow(
 *   actor,
 *   {
 *     title,
 *     invade: true
 *   }
 * )
 *
 * Only Mechs/NPCs are valid native sources.
 */

export async function executeNativeBasicTechAttack({
  actor: actorReference,
  title = null
} = {}) {
  const actor =
    await resolveNativeActor(
      actorReference
    );

  if (
    !actor.is_mech?.() &&
    !actor.is_npc?.()
  ) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.TECH_ATTACK,

      actorUuid:
        actor.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.TECH_ATTACK,

      error:
        new Error(
          "Basic Tech Attack requires a Mech or NPC actor."
        )
    });
  }

  return executeNativeTechAttack({
    source:
      actor,

    title,

    invade:
      true
  });
}

/* ============================================================
   TECH ATTACK
   ============================================================ */

/**
 * @section tech-attack
 *
 * Native TechAttackFlow accepts:
 *
 * Actor
 * Mech System
 * NPC Feature
 *
 * For structured system actions, pass:
 *
 * action
 * effect
 * invade
 * tags
 *
 * exactly as native ActivationFlow delegation does.
 */

export async function executeNativeTechAttack({
  source,
  title = null,
  action = null,
  effect = null,
  invade = false,
  tags = null
} = {}) {
  let resolvedSource;

  /*
   * Actor or Item input.
   */
  try {
    resolvedSource =
      source?.documentName === "Actor" ||
      typeof source?.is_mech === "function"
        ? await resolveNativeActor(
            source
          )
        : await resolveNativeItem(
            source
          );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.TECH_ATTACK,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.TECH_ATTACK,

      error
    });
  }

  const actor =
    resolvedSource.actor ??
    (
      resolvedSource.documentName === "Actor"
        ? resolvedSource
        : null
    );

  const item =
    resolvedSource.documentName === "Item" ||
    typeof resolvedSource.is_mech_system === "function"
      ? resolvedSource
      : null;

  const TechAttackFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.TECH_ATTACK
    );

  let flow;

  try {
    flow =
      new TechAttackFlow(
        resolvedSource,
        {
          title:
            title ?? "",

          invade:
            Boolean(invade),

          action,

          effect:
            effect ?? "",

          tags:
            tags ??
            (
              typeof item?.getTags ===
                "function"
                ? item.getTags()
                : []
            )
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.TECH_ATTACK,

      actorUuid:
        actor?.uuid ??
        null,

      itemUuid:
        item?.uuid ??
        null,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.TECH_ATTACK,

      error
    });
  }

  const execution =
    await beginNativeFlow({
      flow,

      kind:
        NATIVE_EXECUTION_KIND.TECH_ATTACK,

      actorUuid:
        actor?.uuid ??
        flow.state?.actor?.uuid ??
        null,

      itemUuid:
        item?.uuid ??
        null,

      flowName:
        NATIVE_EXECUTION_FLOW.TECH_ATTACK
    });

  if (
    execution.status !==
    NATIVE_EXECUTION_STATUS.SUCCEEDED
  ) {
    return execution;
  }

  const sourceActorUuid =
    actor?.uuid ??
    flow.state?.actor?.uuid ??
    null;

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.TECH_ATTACK,

    actorUuid:
      sourceActorUuid,

    itemUuid:
      item?.uuid ??
      null,

    nativeFlow:
      NATIVE_EXECUTION_FLOW.TECH_ATTACK,

    result:
      normalizeNativeAttackFlowResult({
        flow,

        sourceActorUuid,

        sourceItemUuid:
          item?.uuid ??
          null,

        attackType:
          "Tech"
      }),

    raw:
      flow
  });
}

/* ============================================================
   STRUCTURED ACTION ACTIVATION
   ============================================================ */

/**
 * @section structured-action-activation
 *
 * Native Item.beginActivationFlow(path) normally creates:
 *
 * ActivationFlow(
 *   item,
 *   {
 *     action_path: path
 *   }
 * )
 *
 * IMPORTANT NATIVE DELEGATION:
 *
 * initActivationData detects:
 *
 * action.tech_attack == true
 *
 * OR
 *
 * action.activation == "Invade"
 *
 * and then:
 *
 * new TechAttackFlow(...)
 * tech_flow.begin() // NOT awaited
 * return false
 *
 * Directly using ActivationFlow here would therefore make Frame Conn see
 * the parent flow's false result without access to the delegated
 * TechAttackFlow result.
 *
 * This adapter resolves the ActionData first and directly invokes the same
 * native TechAttackFlow for those actions.
 */

export async function executeNativeActivation({
  item: itemReference,
  actionPath = null,
  title = null
} = {}) {
  const item =
    await resolveNativeItem(
      itemReference
    );

  let resolvedPath =
    actionPath;

  if (!resolvedPath) {
    if (
      !Array.isArray(
        item.system?.actions
      ) ||
      item.system.actions.length < 1
    ) {
      return nativeExecutionBlocked({
        kind:
          NATIVE_EXECUTION_KIND.ACTIVATION,

        actorUuid:
          item.actor?.uuid ??
          null,

        itemUuid:
          item.uuid,

        nativeFlow:
          NATIVE_EXECUTION_FLOW.ACTIVATION,

        error:
          new Error(
            `${item.name ?? item.uuid} has no structured actions.`
          )
      });
    }

    resolvedPath =
      "system.actions.0";
  }

  /*
   * Core System special case from native Item.beginActivationFlow().
   */
  if (
    item.is_frame?.() &&
    resolvedPath ===
      "system.core_system"
  ) {
    return executeNativeCorePower({
      frame:
        item,

      path:
        resolvedPath
    });
  }

  const action =
    getNativeActionAtPath(
      item,
      resolvedPath
    );

  if (!action) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.ACTIVATION,

      actorUuid:
        item.actor?.uuid ??
        null,

      itemUuid:
        item.uuid,

      actionPath:
        resolvedPath,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.ACTIVATION,

      error:
        new Error(
          `Native ActionData not found at ${resolvedPath}.`
        )
    });
  }

  /*
   * Match native ActivationFlow's TechAttackFlow delegation.
   *
   * ActivationType.Invade serializes as "Invade" in native ActionData.
   */
  if (
    action.tech_attack ||
    action.activation === "Invade"
  ) {
    return executeNativeTechAttack({
      source:
        item,

      title:
        title ??
        action.name ??
        null,

      action,

      invade:
        action.activation ===
        "Invade",

      effect:
        action.detail ??
        "",

      tags:
        typeof item.getTags === "function"
          ? item.getTags()
          : []
    });
  }

  const ActivationFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.ACTIVATION
    );

  let flow;

  try {
    flow =
      new ActivationFlow(
        item,
        {
          action_path:
            resolvedPath,

          title:
            title ?? ""
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.ACTIVATION,

      actorUuid:
        item.actor?.uuid ??
        null,

      itemUuid:
        item.uuid,

      actionPath:
        resolvedPath,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.ACTIVATION,

      error
    });
  }

  return beginNativeFlow({
    flow,

    kind:
      NATIVE_EXECUTION_KIND.ACTIVATION,

    actorUuid:
      item.actor?.uuid ??
      null,

    itemUuid:
      item.uuid,

    actionPath:
      resolvedPath,

    flowName:
      NATIVE_EXECUTION_FLOW.ACTIVATION
  });
}

/* ============================================================
   SYSTEM USE
   ============================================================ */

/**
 * @section system-use
 *
 * Native source types:
 *
 * - Mech System
 * - Weapon Mod
 * - NPC Feature
 *
 * SystemFlow owns native resource handling and chat presentation.
 *
 * Generic system.effect mechanics remain semantic.
 */

export async function executeNativeSystemUse({
  system: systemReference
} = {}) {
  const item =
    await resolveNativeItem(
      systemReference
    );

  if (
    !item.is_mech_system?.() &&
    !item.is_weapon_mod?.() &&
    !item.is_npc_feature?.()
  ) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.SYSTEM_USE,

      actorUuid:
        item.actor?.uuid ??
        null,

      itemUuid:
        item.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.SYSTEM,

      error:
        new Error(
          `${item.name ?? item.uuid} cannot use SystemFlow.`
        )
    });
  }

  const SystemFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.SYSTEM
    );

  let flow;

  try {
    flow =
      new SystemFlow(
        item
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.SYSTEM_USE,

      actorUuid:
        item.actor?.uuid ??
        null,

      itemUuid:
        item.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.SYSTEM,

      error
    });
  }

  return beginNativeFlow({
    flow,

    kind:
      NATIVE_EXECUTION_KIND.SYSTEM_USE,

    actorUuid:
      item.actor?.uuid ??
      null,

    itemUuid:
      item.uuid,

    flowName:
      NATIVE_EXECUTION_FLOW.SYSTEM
  });
}

/* ============================================================
   CORE POWER
   ============================================================ */

/**
 * @section core-power
 *
 * Native Item.beginCoreActiveFlow(path) constructs a synthetic ActionData
 * from Frame.system.core_system and passes it to CoreActiveFlow.
 *
 * Reproduce that exact native construction here so the completed Flow
 * remains available to Frame Conn.
 *
 * Native CoreActiveFlow owns:
 *
 * checkCorePower
 * consumeCorePower
 *
 * DO NOT decrement actor.system.core_energy again.
 *
 * Known separate integration note:
 *
 * current native CoreActiveFlow does not fully establish persistent
 * core_active state for active_bonuses. That correction belongs to the
 * Core Power semantic extension layer, not this base wrapper.
 */

export async function executeNativeCorePower({
  frame: frameReference,
  path =
    "system.core_system"
} = {}) {
  const frame =
    await resolveNativeItem(
      frameReference
    );

  if (!frame.is_frame?.()) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.CORE_POWER,

      actorUuid:
        frame.actor?.uuid ??
        null,

      itemUuid:
        frame.uuid,

      actionPath:
        path,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.CORE_ACTIVE,

      error:
        new Error(
          `${frame.name ?? frame.uuid} is not a native Frame Item.`
        )
    });
  }

  const coreSystem =
    frame.system?.core_system;

  if (!coreSystem) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.CORE_POWER,

      actorUuid:
        frame.actor?.uuid ??
        null,

      itemUuid:
        frame.uuid,

      actionPath:
        path,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.CORE_ACTIVE,

      error:
        new Error(
          "Frame has no native core_system data."
        )
    });
  }

  const actionName =
    coreSystem.active_actions
      ?.[0]
      ?.name ??
    coreSystem.active_name ??
    "";

  /*
   * Exact shape used by native LancerItem.beginCoreActiveFlow().
   */
  const action = {
    lid:
      `${frame.system?.lid ?? ""}_core_system`,

    name:
      `CORE ACTIVATION :: ${actionName}`,

    activation:
      coreSystem.activation,

    detail:
      coreSystem.active_effect,

    cost:
      0,

    frequency:
      "",

    init:
      "",

    trigger:
      "",

    terse:
      "",

    pilot:
      false,

    mech:
      true,

    tech_attack:
      false,

    heat_cost:
      0,

    synergy_locations:
      [],

    damage:
      [],

    range:
      []
  };

  const CoreActiveFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.CORE_ACTIVE
    );

  let flow;

  try {
    flow =
      new CoreActiveFlow(
        frame,
        {
          action,
          action_path:
            path
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.CORE_POWER,

      actorUuid:
        frame.actor?.uuid ??
        null,

      itemUuid:
        frame.uuid,

      actionPath:
        path,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.CORE_ACTIVE,

      error
    });
  }

  return beginNativeFlow({
    flow,

    kind:
      NATIVE_EXECUTION_KIND.CORE_POWER,

    actorUuid:
      frame.actor?.uuid ??
      null,

    itemUuid:
      frame.uuid,

    actionPath:
      path,

    flowName:
      NATIVE_EXECUTION_FLOW.CORE_ACTIVE,

    /*
     * Native false may be either user/resource rejection.
     * CorePower precheck in resource_service should normally distinguish
     * insufficient CP before we enter the Flow.
     */
    falseStatus:
      NATIVE_EXECUTION_STATUS.BLOCKED
  });
}

/* ============================================================
   DAMAGE ROLL
   ============================================================ */

/**
 * @section damage-roll
 *
 * Use when native damage still needs to be rolled.
 *
 * Do not use for already-resolved fixed damage; use native-combat.js.
 */

export async function executeNativeDamageRoll({
  source,
  title = null,
  configurable = true,
  addBurn = true,
  invade = false,
  tags = [],
  ap = false,
  paracausal = false,
  halfDamage = false,
  overkill = false,
  reliable = false,
  hitResults = [],
  damage = [],
  bonusDamage = []
} = {}) {
  let resolvedSource;

  try {
    resolvedSource =
      source?.documentName === "Actor" ||
      typeof source?.is_mech === "function"
        ? await resolveNativeActor(
            source
          )
        : await resolveNativeItem(
            source
          );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.DAMAGE,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.DAMAGE,

      error
    });
  }

  const actor =
    resolvedSource.actor ??
    (
      resolvedSource.documentName === "Actor"
        ? resolvedSource
        : null
    );

  const item =
    resolvedSource.documentName === "Item" ||
    typeof resolvedSource.is_mech_weapon === "function"
      ? resolvedSource
      : null;

  const DamageRollFlow =
    getNativeFlowConstructor(
      NATIVE_EXECUTION_FLOW.DAMAGE
    );

  let flow;

  try {
    flow =
      new DamageRollFlow(
        resolvedSource,
        {
          title:
            title ??
            (
              item?.name
                ? `${item.name} damage`
                : "Damage Roll"
            ),

          configurable:
            Boolean(
              configurable
            ),

          add_burn:
            Boolean(addBurn),

          invade:
            Boolean(invade),

          tags:
            Array.isArray(tags)
              ? tags
              : [],

          ap:
            Boolean(ap),

          paracausal:
            Boolean(
              paracausal
            ),

          half_damage:
            Boolean(
              halfDamage
            ),

          overkill:
            Boolean(overkill),

          reliable:
            Boolean(reliable),

          hit_results:
            Array.isArray(
              hitResults
            )
              ? hitResults
              : [],

          damage:
            Array.isArray(damage)
              ? damage
              : [],

          bonus_damage:
            Array.isArray(
              bonusDamage
            )
              ? bonusDamage
              : []
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.DAMAGE,

      actorUuid:
        actor?.uuid ??
        null,

      itemUuid:
        item?.uuid ??
        null,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.DAMAGE,

      error
    });
  }

  return beginNativeFlow({
    flow,

    kind:
      NATIVE_EXECUTION_KIND.DAMAGE,

    actorUuid:
      actor?.uuid ??
      flow.state?.actor?.uuid ??
      null,

    itemUuid:
      item?.uuid ??
      null,

    flowName:
      NATIVE_EXECUTION_FLOW.DAMAGE
  });
}

/* ============================================================
   WEAPON DAMAGE ROLL
   ============================================================ */

/**
 * @section weapon-damage-roll
 *
 * Normal native Item.beginDamageFlow() does:
 *
 * new DamageRollFlow(
 *   weapon,
 *   {
 *     title: "<weapon> damage"
 *   }
 * )
 *
 * This wrapper preserves that default.
 */

export async function executeNativeWeaponDamage({
  weapon: weaponReference,
  hitResults = null,
  overrides = {}
} = {}) {
  const weapon =
    await resolveNativeItem(
      weaponReference
    );

  if (
    !weapon.is_mech_weapon?.() &&
    !weapon.is_pilot_weapon?.() &&
    !weapon.is_npc_feature?.()
  ) {
    return nativeExecutionBlocked({
      kind:
        NATIVE_EXECUTION_KIND.DAMAGE,

      actorUuid:
        weapon.actor?.uuid ??
        null,

      itemUuid:
        weapon.uuid,

      nativeFlow:
        NATIVE_EXECUTION_FLOW.DAMAGE,

      error:
        new Error(
          `${weapon.name ?? weapon.uuid} cannot use weapon DamageRollFlow.`
        )
    });
  }

  /*
   * Let native initDamageData derive normal weapon damage/tags when
   * explicit overrides are not provided.
   */
  return executeNativeDamageRoll({
    source:
      weapon,

    title:
      overrides.title ??
      `${weapon.name} damage`,

    hitResults:
      hitResults ??
      overrides.hitResults ??
      [],

    ...overrides
  });
}

/* ============================================================
   ATTACK -> DAMAGE BRIDGE DATA
   ============================================================ */

/**
 * @section attack-damage-bridge-data
 *
 * Native WeaponAttackFlow does not automatically invoke DamageRollFlow.
 *
 * The attack Flow's raw state contains the exact native hit_results[]
 * needed by DamageRollFlow.
 *
 * Higher semantic execution may use this helper without reconstructing
 * native hit-result objects.
 */

export function getNativeAttackHitResults(
  weaponAttackExecution
) {
  if (
    weaponAttackExecution?.status !==
    NATIVE_EXECUTION_STATUS.SUCCEEDED
  ) {
    return Object.freeze([]);
  }

  const rawFlow =
    weaponAttackExecution.raw;

  return freezeArray(
    rawFlow
      ?.state
      ?.data
      ?.hit_results
  );
}

/**
 * Convenience composition.
 *
 * This DOES NOT mean every weapon attack should automatically roll
 * damage; native Lancer currently separates attack and damage UI.
 *
 * Use only where Frame Conn's semantic action explicitly intends to
 * continue immediately into native DamageRollFlow.
 */
export async function executeNativeWeaponAttackAndDamage({
  weapon,
  rollDamage = false
} = {}) {
  const attack =
    await executeNativeWeaponAttack({
      weapon
    });

  if (
    attack.status !==
      NATIVE_EXECUTION_STATUS.SUCCEEDED ||
    !rollDamage
  ) {
    return Object.freeze({
      attack,
      damage: null
    });
  }

  const damage =
    await executeNativeWeaponDamage({
      weapon,

      hitResults:
        getNativeAttackHitResults(
          attack
        )
    });

  return Object.freeze({
    attack,
    damage
  });
}

/* ============================================================
   ACTIVE PROFILE SUPPORT
   ============================================================ */

/**
 * @section active-profile-support
 *
 * Native WeaponAttackFlow resolves current weapon state itself.
 *
 * This helper exists only for execution-context construction and
 * diagnostics.
 */

export async function getNativeWeaponExecutionSnapshot(
  weaponReference
) {
  const weapon =
    await resolveNativeItem(
      weaponReference
    );

  const profile =
    weapon.is_mech_weapon?.()
      ? getActiveWeaponProfile(
          weapon
        )
      : null;

  return Object.freeze({
    weaponUuid:
      weapon.uuid,

    actorUuid:
      weapon.actor?.uuid ??
      null,

    profile:
      profile
        ? Object.freeze({
            name:
              profile.name ??
              null,

            skirmishable:
              Boolean(
                profile.skirmishable
              ),

            barrageable:
              Boolean(
                profile.barrageable
              )
          })
        : null
  });
}

/* ============================================================
   EXECUTION RESULT HELPERS
   ============================================================ */

/**
 * @section execution-result-helpers
 */

export function didNativeExecutionComplete(
  result
) {
  return (
    result?.status ===
    NATIVE_EXECUTION_STATUS.SUCCEEDED
  );
}

export function didNativeExecutionAbort(
  result
) {
  return (
    result?.status ===
      NATIVE_EXECUTION_STATUS.CANCELLED ||
    result?.status ===
      NATIVE_EXECUTION_STATUS.BLOCKED ||
    result?.status ===
      NATIVE_EXECUTION_STATUS.FAILED
  );
}

/* ============================================================
   TARGETING BOUNDARY
   ============================================================ */

/**
 * @section targeting-boundary
 *
 * Traced native attack setAttackTargets() currently does not perform
 * generic target acquisition/Range/LOS legality.
 *
 * Native attack HUD builds targeting data from current Foundry targets.
 *
 * Therefore:
 *
 * targeting_spatial_service
 * → validate target(s)
 * → ensure intended Foundry target selection/context
 * → native-execution
 *
 * native-execution.js does not decide:
 *
 * Range
 * Threat
 * Sensors
 * LOS
 * Arcing
 * Seeking
 * adjacency
 * AoE legality
 */

/* ============================================================
   ACTION ECONOMY BOUNDARY
   ============================================================ */

/**
 * @section action-economy-boundary
 *
 * Native ActivationFlow source contains:
 *
 * TODO: deduct action from actor's action tracker
 *
 * Therefore successful native Flow execution does NOT imply the correct
 * Quick/Full/Protocol/Reaction cost was spent.
 *
 * Intended:
 *
 * execution_transaction
 * → action_economy precheck
 * → native-execution
 * → action_economy commit
 *
 * depending on semantic action rules.
 */

/* ============================================================
   RESOURCE BOUNDARY
   ============================================================ */

/**
 * @section resource-boundary
 *
 * Native Flows already own:
 *
 * WeaponAttackFlow:
 * - Loading
 * - Limited
 * - Self Heat
 *
 * ActivationFlow:
 * - Limited
 * - Self Heat
 *
 * SystemFlow:
 * - Limited
 * - Self Heat
 *
 * TechAttackFlow:
 * - Limited
 * - Self Heat
 *
 * CoreActiveFlow:
 * - Limited
 * - Self Heat
 * - Core Energy
 *
 * resource_service must mark these resources as native-consumed and
 * avoid duplicate mutation.
 */

/* ============================================================
   SPECIAL EFFECT BOUNDARY
   ============================================================ */

/**
 * @section special-effect-boundary
 *
 * Native WeaponAttackFlow stores/displays:
 *
 * effect
 * on_attack
 * on_hit
 * on_crit
 *
 * but does not generically execute bespoke consequences.
 *
 * Native SystemFlow/ActivationFlow similarly display semantic effect
 * text without a generic rules interpreter.
 *
 * Intended:
 *
 * native-execution
 * → normalized result
 * → semantic event/strategy
 * → native-status/native-combat/native-movement/etc.
 */

/* ============================================================
   STRUCTURE / OVERHEAT NOTE
   ============================================================ */

/**
 * @section structure-overheat-note
 *
 * Native Actor methods and registered Flows exist for:
 *
 * StructureFlow
 * OverheatFlow
 *
 * They are intentionally not wrapped in this version because
 * native-contract.js currently has no dedicated execution kinds for:
 *
 * structure
 * overheat
 *
 * Add those NATIVE_EXECUTION_KIND values before adding typed wrappers
 * rather than misclassifying them as generic damage/document mutation.
 *
 * The same rule applies to:
 *
 * StabilizeFlow
 * OverchargeFlow
 * FullRepairFlow
 * CascadeFlow
 *
 * Do not use an incorrect execution kind merely to expose the Flow early.
 */

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing direct calls such as:
 *
 * item.beginWeaponAttackFlow()
 * item.beginActivationFlow()
 * item.beginSystemFlow()
 * item.beginCoreActiveFlow()
 * actor.beginBasicAttackFlow()
 *
 * should migrate behind:
 *
 * native-execution.js
 * → native-adapter.js
 *
 * Migration can remain incremental.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Should not construct native Flow classes directly.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → semantic action
 * → execution_transaction
 * → native-adapter
 * → native-execution
 *
 *
 * feature_actions/
 * ----------------
 * Class 1 actions:
 *
 * → delegate here
 *
 * Class 2 parent actions:
 *
 * → orchestrate native child calls here
 *
 * Examples:
 *
 * Skirmish
 * → native-loadout
 * → executeNativeWeaponAttack()
 *
 * Barrage
 * → native-loadout
 * → executeNativeWeaponAttack()
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 * Structured ActionData should retain exact action path.
 *
 * Execution:
 *
 * NativeActionReference
 * → executeNativeActivation()
 *
 * Tech Attack/Invade delegation is handled by this adapter.
 *
 *
 * resource_service/
 * -----------------
 * Prechecks native resources before execution where useful.
 *
 * Native-consumed resources are verified afterward, not decremented
 * again.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 * Should attach:
 *
 * actor
 * source Item
 * source action path
 * mount/slot context
 * parent semantic action
 * controller state
 *
 * native-execution receives only the native portion needed by the Flow.
 *
 *
 * semantic_event_bus/
 * -------------------
 * Higher layers may emit events from normalized results:
 *
 * attackDeclared
 * attackHit
 * attackCrit
 * attackMiss
 * techAttackHit
 * coreActivated
 * systemActivated
 * damageResolved
 *
 * native-execution.js itself does not emit semantic events.
 *
 *
 * weapon strategy registry
 * ------------------------
 * Example:
 *
 * executeNativeWeaponAttack(Annihilator)
 * → normalized hit result
 * → Annihilator onHit strategy
 * → secondary attack orchestration
 *
 * The special rule does not belong inside this file.
 *
 *
 * mounted-system strategy registry
 * --------------------------------
 * Generic system action:
 *
 * executeNativeActivation()
 *
 * Special consequence:
 *
 * strategy layer after normalized native result.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Native Flow constructors come from game.lancer.flows.
 *
 * INVARIANT 2
 * Do not import internal Foundry Lancer Flow modules directly.
 *
 * INVARIANT 3
 * Weapon attacks use WeaponAttackFlow.
 *
 * INVARIANT 4
 * Basic attacks use BasicAttackFlow.
 *
 * INVARIANT 5
 * Tech attacks use TechAttackFlow.
 *
 * INVARIANT 6
 * Structured ordinary Item actions use ActivationFlow.
 *
 * INVARIANT 7
 * Structured tech_attack/Invade actions delegate directly to the same
 * TechAttackFlow that native ActivationFlow would launch.
 *
 * INVARIANT 8
 * Generic Mech System/Weapon Mod/NPC system use uses SystemFlow.
 *
 * INVARIANT 9
 * Core activation uses CoreActiveFlow and native Core Energy mutation.
 *
 * INVARIANT 10
 * DamageRollFlow is separate from WeaponAttackFlow.
 *
 * INVARIANT 11
 * Native attack Flow results should be normalized from Flow state, not
 * chat scraping.
 *
 * INVARIANT 12
 * Native Flow resource mutations must not be repeated by Frame Conn.
 *
 * INVARIANT 13
 * Action economy is not implied by native Flow completion.
 *
 * INVARIANT 14
 * Target legality must be established above this adapter where native
 * Flow coverage is incomplete.
 *
 * INVARIANT 15
 * Bespoke weapon/system effects remain above this adapter.
 *
 * INVARIANT 16
 * Do not expose additional native Flow wrappers until native-contract
 * contains an accurate execution kind for them.
 */