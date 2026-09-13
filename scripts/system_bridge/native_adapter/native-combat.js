/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-combat.js
 */

/**
 * @file
 * @path main/native_adapter/native-combat.js
 * @module native-combat
 * @layer native-adapter-combat
 * @responsibility expose-native-lancer-combat-state-and-damage-primitives
 * @public-boundary false
 * @side-effects native-actor-mutation, native-chat-output
 *
 * @depends-on native-contract, native-actors
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by native-adapter.js
 * - consumed by native-execution.js
 * - consumed by execution_transaction/*
 * - consumed by weapon/system/talent/core-bonus strategies
 * - consumed by Jockey runtime
 * - consumed by future forced-effect and save-result runtimes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - native DamageRollFlow remains the roll-before-application pathway
 * - native Actor.damageCalc(...) remains authoritative for resolved damage
 * - native-status.js remains status mutation authority
 * - native-resources.js remains generic resource mutation authority
 * - runtime-orchestrator.js remains high-level coordinator
 *
 * THIS FILE OWNS:
 * - construction of native AppliedDamage-compatible payloads
 * - direct resolved damage through actor.damageCalc(...)
 * - direct Heat application through native damage calculation
 * - direct Burn application through native damage calculation
 * - read-only defensive combat state
 * - normalized results for direct combat mutations
 *
 * THIS FILE DOES NOT OWN:
 * - attack rolls
 * - damage dice rolling
 * - WeaponAttackFlow
 * - DamageRollFlow execution
 * - Structure/Stress roll orchestration
 * - Overheat flow orchestration
 * - status lifecycle
 * - action economy
 * - source-specific damage rules
 *
 * EDIT CONTRACT:
 * - preserve actor.damageCalc(...) as authoritative resolved-damage engine
 * - do not manually reproduce Armor/Resistance/Exposed/Shredded logic
 * - do not subtract HP directly when damageCalc can perform the rule
 * - preserve Heat/Burn as native DamageType channels
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  NATIVE_EXECUTION_KIND,
  nativeExecutionFailed,
  nativeExecutionSucceeded
} from "./native-contract.js";

import {
  resolveNativeActor
} from "./native-actors.js";

/* ============================================================
   NATIVE COMBAT ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section native-combat-architecture-notes
 *
 * Traced native direct-damage authority:
 *
 * actor.damageCalc(
 *   AppliedDamage,
 *   {
 *     multiple = 1,
 *     ap = false,
 *     paracausal = false,
 *     addBurn = true
 *   }
 * )
 *
 * Native damageCalc handles:
 *
 * - Kinetic
 * - Energy
 * - Explosive
 * - Variable
 * - Burn
 * - Heat
 * - Exposed
 * - Armor
 * - Resistance
 * - Shredded
 * - AP
 * - Paracausal
 * - Overshield
 * - HP mutation
 * - Heat mutation
 * - Burn accumulation
 * - entities without Heat Cap converting Heat to Energy
 * - native damage chat message
 * - native damage undo data
 *
 * Native DamageRollFlow is separate:
 *
 * DamageRollFlow
 * ├── initDamageData
 * ├── setDamageTags
 * ├── setDamageTargets
 * ├── showDamageHUD
 * ├── rollReliable
 * ├── rollNormalDamage
 * ├── rollCritDamage
 * ├── applyOverkillHeat
 * └── printDamageCard
 *
 * native-combat.js does not replace DamageRollFlow.
 */

/* ============================================================
   DAMAGE TYPE CONTRACT
   ============================================================ */

/**
 * @section damage-type-contract
 *
 * Matches traced native DamageType enum values exactly.
 */

export const NATIVE_DAMAGE_TYPE = Object.freeze({
  KINETIC:
    "Kinetic",

  ENERGY:
    "Energy",

  EXPLOSIVE:
    "Explosive",

  HEAT:
    "Heat",

  BURN:
    "Burn",

  VARIABLE:
    "Variable"
});

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

/**
 * @section private-helpers
 */

function finiteNumber(value) {
  return Number.isFinite(value);
}

function nonNegativeNumber(
  value,
  fallback = 0
) {
  if (!finiteNumber(value)) {
    return fallback;
  }

  return Math.max(
    value,
    0
  );
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

function normalizeDamageMultiple(
  multiple
) {
  if (
    multiple === 0.5 ||
    multiple === 1 ||
    multiple === 2
  ) {
    return multiple;
  }

  return 1;
}

function freezeBoundedState(
  value
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return Object.freeze({
    value:
      finiteNumber(value.value)
        ? value.value
        : 0,

    min:
      finiteNumber(value.min)
        ? value.min
        : 0,

    max:
      finiteNumber(value.max)
        ? value.max
        : 0
  });
}

/* ============================================================
   DAMAGE PAYLOAD
   ============================================================ */

/**
 * @section damage-payload
 *
 * actor.damageCalc(...) only requires an object matching the native
 * AppliedDamage field shape.
 *
 * We intentionally do not import the internal AppliedDamage class.
 *
 * This keeps native_adapter dependent on the public runtime Actor method,
 * not internal source-module imports.
 */

export function createNativeAppliedDamage({
  kinetic = 0,
  energy = 0,
  explosive = 0,
  heat = 0,
  burn = 0,
  variable = 0
} = {}) {
  return {
    Kinetic:
      nonNegativeNumber(
        kinetic
      ),

    Energy:
      nonNegativeNumber(
        energy
      ),

    Explosive:
      nonNegativeNumber(
        explosive
      ),

    Heat:
      nonNegativeNumber(
        heat
      ),

    Burn:
      nonNegativeNumber(
        burn
      ),

    Variable:
      nonNegativeNumber(
        variable
      )
  };
}

/**
 * Accept native DamageType-keyed or Frame Conn lowercase-keyed values.
 */
export function normalizeNativeAppliedDamage(
  damage
) {
  if (
    !damage ||
    typeof damage !== "object"
  ) {
    throw new TypeError(
      "normalizeNativeAppliedDamage requires a damage object."
    );
  }

  return createNativeAppliedDamage({
    kinetic:
      damage.Kinetic ??
      damage.kinetic ??
      0,

    energy:
      damage.Energy ??
      damage.energy ??
      0,

    explosive:
      damage.Explosive ??
      damage.explosive ??
      0,

    heat:
      damage.Heat ??
      damage.heat ??
      0,

    burn:
      damage.Burn ??
      damage.burn ??
      0,

    variable:
      damage.Variable ??
      damage.variable ??
      0
  });
}

export function getNativeAppliedDamageTotal(
  damage
) {
  const normalized =
    normalizeNativeAppliedDamage(
      damage
    );

  return (
    normalized.Kinetic +
    normalized.Energy +
    normalized.Explosive +
    normalized.Heat +
    normalized.Burn +
    normalized.Variable
  );
}

/* ============================================================
   DEFENSIVE COMBAT READS
   ============================================================ */

/**
 * @section defensive-combat-reads
 *
 * These are native prepared values.
 *
 * Do not recalculate them.
 */

export async function getNativeCombatDefenseSnapshot(
  actorReference
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );

  return Object.freeze({
    actorUuid:
      actor.uuid,

    armor:
      finiteNumber(
        actor.system?.armor
      )
        ? actor.system.armor
        : 0,

    evasion:
      finiteNumber(
        actor.system?.evasion
      )
        ? actor.system.evasion
        : 0,

    eDefense:
      finiteNumber(
        actor.system?.edef
      )
        ? actor.system.edef
        : 0,

    saveTarget:
      finiteNumber(
        actor.system?.save
      )
        ? actor.system.save
        : 0,

    hp:
      freezeBoundedState(
        actor.system?.hp
      ),

    overshield:
      freezeBoundedState(
        actor.system?.overshield
      ),

    heat:
      freezeBoundedState(
        actor.system?.heat
      ),

    burn:
      finiteNumber(
        actor.system?.burn
      )
        ? actor.system.burn
        : 0,

    structure:
      freezeBoundedState(
        actor.system?.structure
      ),

    stress:
      freezeBoundedState(
        actor.system?.stress
      ),

    exposed:
      Boolean(
        actor.system
          ?.statuses
          ?.exposed
      ),

    shredded:
      Boolean(
        actor.system
          ?.statuses
          ?.shredded
      ),

    resistances:
      Object.freeze({
        kinetic:
          Boolean(
            actor.system
              ?.resistances
              ?.kinetic
          ),

        energy:
          Boolean(
            actor.system
              ?.resistances
              ?.energy
          ),

        explosive:
          Boolean(
            actor.system
              ?.resistances
              ?.explosive
          ),

        heat:
          Boolean(
            actor.system
              ?.resistances
              ?.heat
          ),

        burn:
          Boolean(
            actor.system
              ?.resistances
              ?.burn
          ),

        variable:
          Boolean(
            actor.system
              ?.resistances
              ?.variable
          )
      })
  });
}

/* ============================================================
   HEAT CAPABILITY
   ============================================================ */

/**
 * @section heat-capability
 *
 * Native actor.damageCalc() converts Heat to Energy automatically when
 * the target does not have a Heat Cap.
 */

export async function nativeActorHasHeatCap(
  actorReference
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );

  if (
    typeof actor.hasHeatcap ===
    "function"
  ) {
    return Boolean(
      actor.hasHeatcap()
    );
  }

  return Boolean(
    actor.system?.heat &&
    finiteNumber(
      actor.system.heat.max
    ) &&
    actor.system.heat.max > 0
  );
}

/* ============================================================
   DIRECT DAMAGE
   ============================================================ */

/**
 * @section direct-damage
 *
 * Use when the damage amount has already been determined.
 *
 * Examples:
 *
 * Jockey Damage:
 *   4 Kinetic
 *
 * special weapon/system consequence:
 *   target takes 2 Energy
 *
 * Do NOT use this to replace DamageRollFlow when dice still need to be
 * rolled or native weapon damage behavior must be calculated.
 */

export async function applyNativeDamage({
  target: targetReference,
  damage,
  multiple = 1,
  ap = false,
  paracausal = false,
  addBurn = true,
  sourceActorUuid = null,
  sourceItemUuid = null
} = {}) {
  const target =
    await resolveNativeActor(
      targetReference
    );

  if (
    typeof target.damageCalc !==
    "function"
  ) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.DAMAGE,

      actorUuid:
        target.uuid,

      itemUuid:
        sourceItemUuid,

      error:
        new Error(
          "Native Actor.damageCalc() is unavailable."
        )
    });
  }

  const applied =
    normalizeNativeAppliedDamage(
      damage
    );

  const before =
    await getNativeCombatDefenseSnapshot(
      target
    );

  let hpDamage;

  try {
    hpDamage =
      await target.damageCalc(
        /*
         * damageCalc mutates this object during resolution.
         *
         * Pass a fresh payload so caller-owned state is never mutated.
         */
        {
          ...applied
        },
        {
          multiple:
            normalizeDamageMultiple(
              multiple
            ),

          ap:
            Boolean(ap),

          paracausal:
            Boolean(
              paracausal
            ),

          addBurn:
            Boolean(addBurn)
        }
      );
  } catch (error) {
    return nativeExecutionFailed({
      kind:
        NATIVE_EXECUTION_KIND.DAMAGE,

      actorUuid:
        target.uuid,

      itemUuid:
        sourceItemUuid,

      error
    });
  }

  const after =
    await getNativeCombatDefenseSnapshot(
      target
    );

  return nativeExecutionSucceeded({
    kind:
      NATIVE_EXECUTION_KIND.DAMAGE,

    actorUuid:
      target.uuid,

    itemUuid:
      sourceItemUuid,

    result:
      Object.freeze({
        targetUuid:
          target.uuid,

        sourceActorUuid,
        sourceItemUuid,

        requestedDamage:
          Object.freeze({
            ...applied
          }),

        options:
          Object.freeze({
            multiple:
              normalizeDamageMultiple(
                multiple
              ),

            ap:
              Boolean(ap),

            paracausal:
              Boolean(
                paracausal
              ),

            addBurn:
              Boolean(addBurn)
          }),

        hpDamage:
          finiteNumber(
            hpDamage
          )
            ? hpDamage
            : 0,

        before,
        after
      })
  });
}

/* ============================================================
   KINETIC DAMAGE
   ============================================================ */

/**
 * @section kinetic-damage
 */

export async function applyNativeKineticDamage(
  targetReference,
  amount,
  options = {}
) {
  assertFiniteNumber(
    amount,
    "Kinetic damage"
  );

  return applyNativeDamage({
    target:
      targetReference,

    damage:
      createNativeAppliedDamage({
        kinetic:
          amount
      }),

    ...options
  });
}

/* ============================================================
   ENERGY DAMAGE
   ============================================================ */

/**
 * @section energy-damage
 */

export async function applyNativeEnergyDamage(
  targetReference,
  amount,
  options = {}
) {
  assertFiniteNumber(
    amount,
    "Energy damage"
  );

  return applyNativeDamage({
    target:
      targetReference,

    damage:
      createNativeAppliedDamage({
        energy:
          amount
      }),

    ...options
  });
}

/* ============================================================
   EXPLOSIVE DAMAGE
   ============================================================ */

/**
 * @section explosive-damage
 */

export async function applyNativeExplosiveDamage(
  targetReference,
  amount,
  options = {}
) {
  assertFiniteNumber(
    amount,
    "Explosive damage"
  );

  return applyNativeDamage({
    target:
      targetReference,

    damage:
      createNativeAppliedDamage({
        explosive:
          amount
      }),

    ...options
  });
}

/* ============================================================
   VARIABLE DAMAGE
   ============================================================ */

/**
 * @section variable-damage
 */

export async function applyNativeVariableDamage(
  targetReference,
  amount,
  options = {}
) {
  assertFiniteNumber(
    amount,
    "Variable damage"
  );

  return applyNativeDamage({
    target:
      targetReference,

    damage:
      createNativeAppliedDamage({
        variable:
          amount
      }),

    ...options
  });
}

/* ============================================================
   HEAT
   ============================================================ */

/**
 * @section heat
 *
 * Use actor.damageCalc() rather than directly incrementing heat for
 * ordinary target Heat.
 *
 * Native damageCalc automatically:
 *
 * - applies Heat Resistance
 * - respects Shredded/Paracausal behavior
 * - converts Heat to Energy for entities without Heat Cap
 * - creates native damage chat/undo output
 *
 * Self Heat generated inside native attack/system Flows remains owned by
 * native applySelfHeat().
 */

export async function applyNativeHeat(
  targetReference,
  amount,
  options = {}
) {
  assertFiniteNumber(
    amount,
    "Heat"
  );

  return applyNativeDamage({
    target:
      targetReference,

    damage:
      createNativeAppliedDamage({
        heat:
          amount
      }),

    ...options
  });
}

/* ============================================================
   BURN
   ============================================================ */

/**
 * @section burn
 *
 * actor.damageCalc() treats Burn as:
 *
 * - immediate damage
 * - native Burn accumulation when addBurn=true
 *
 * Set addBurn=false only where the source rule explicitly requires
 * immediate Burn-type damage without increasing the Burn stat.
 */

export async function applyNativeBurn(
  targetReference,
  amount,
  {
    addBurn = true,
    ...options
  } = {}
) {
  assertFiniteNumber(
    amount,
    "Burn"
  );

  return applyNativeDamage({
    target:
      targetReference,

    damage:
      createNativeAppliedDamage({
        burn:
          amount
      }),

    addBurn,

    ...options
  });
}

/* ============================================================
   MIXED DAMAGE
   ============================================================ */

/**
 * @section mixed-damage
 *
 * Preserve one actor.damageCalc() call for mixed damage so native Armor
 * ordering and Resistance behavior remain correct.
 *
 * Do NOT split:
 *
 * 3 Kinetic + 2 Energy
 *
 * into two independent damageCalc calls.
 */

export async function applyNativeMixedDamage(
  targetReference,
  damage,
  options = {}
) {
  return applyNativeDamage({
    target:
      targetReference,

    damage,

    ...options
  });
}

/* ============================================================
   DAMAGE MULTIPLIER HELPERS
   ============================================================ */

/**
 * @section damage-multiplier-helpers
 *
 * Native damageCalc recognizes:
 *
 * 0.5
 * → resist-all style halving
 *
 * 1
 * → normal
 *
 * 2
 * → double
 *
 * Exposed itself is read internally by damageCalc and should NOT be
 * represented by passing multiple=2.
 */

export const NATIVE_DAMAGE_MULTIPLE = Object.freeze({
  HALF:
    0.5,

  NORMAL:
    1,

  DOUBLE:
    2
});

/* ============================================================
   AP / PARACAUSAL BOUNDARY
   ============================================================ */

/**
 * @section ap-paracausal-boundary
 *
 * Native damageCalc behavior:
 *
 * ap=true
 * → Armor becomes 0
 *
 * paracausal=true
 * → bypasses the ordinary Armor/Resistance/Shredded reduction block
 *
 * Do not reproduce these transformations in Frame Conn.
 */

/* ============================================================
   OVERKILL / SELF HEAT BOUNDARY
   ============================================================ */

/**
 * @section overkill-self-heat-boundary
 *
 * Native attack/damage Flows already own:
 *
 * - Self Heat
 * - Overkill Heat
 *
 * Their native step:
 *
 * applySelfHeat(...)
 *
 * mutates:
 *
 * system.heat.value
 *
 * Do not route ordinary native Self Heat through applyNativeHeat(), because
 * that would:
 *
 * - duplicate native consumption
 * - incorrectly treat source Self Heat as target damage semantics
 *
 * Frame Conn uses applyNativeHeat() only for resolved target-Heat effects
 * that native source execution did not already apply.
 */

/* ============================================================
   STRUCTURE / STRESS BOUNDARY
   ============================================================ */

/**
 * @section structure-stress-boundary
 *
 * actor.damageCalc() changes:
 *
 * HP
 * Overshield
 * Heat
 * Burn
 *
 * It does NOT itself run:
 *
 * StructureFlow
 * OverheatFlow
 *
 * Those are separate native flows.
 *
 * native-execution.js should wrap:
 *
 * actor.beginStructureFlow()
 * actor.beginOverheatFlow()
 *
 * where action/runtime semantics require them.
 *
 * Do not manually decrement Structure or Stress here as part of ordinary
 * damage application.
 */

/* ============================================================
   DIRECT HEALING / REPAIR BOUNDARY
   ============================================================ */

/**
 * @section direct-healing-repair-boundary
 *
 * This file intentionally does not introduce generic:
 *
 * healHp()
 * repairStructure()
 * repairStress()
 *
 * until the relevant native recovery pathways are traced/needed.
 *
 * Existing actions such as Stabilize and Full Repair have their own native
 * flows and should remain authoritative.
 *
 * Source-specific recovery mechanics should prefer those native helpers
 * or traced Actor updates rather than treating negative damage as healing.
 */

/* ============================================================
   DAMAGE ROLL FLOW BOUNDARY
   ============================================================ */

/**
 * @section damage-roll-flow-boundary
 *
 * DamageRollFlow is used when damage still needs to be rolled.
 *
 * Native constructor:
 *
 * new DamageRollFlow(
 *   itemOrActor,
 *   {
 *     title,
 *     configurable,
 *     add_burn,
 *     invade,
 *     tags,
 *     ap,
 *     paracausal,
 *     half_damage,
 *     overkill,
 *     reliable,
 *     hit_results,
 *     damage,
 *     bonus_damage
 *   }
 * )
 *
 * native-execution.js should own this Flow invocation.
 *
 * native-combat.js owns direct resolved-damage application after the
 * amount/type is already known.
 */

/* ============================================================
   JOCKEY SUPPORT
   ============================================================ */

/**
 * @section jockey-support
 *
 * Jockey Damage:
 *
 * 4 Kinetic
 *
 * should resolve:
 *
 * applyNativeKineticDamage(
 *   targetMech,
 *   4
 * )
 *
 * This preserves:
 *
 * Armor
 * Resistance
 * Exposed
 * Shredded
 * Overshield
 * native chat/undo
 *
 * Jockey Shred:
 *
 * +2 Heat
 *
 * should resolve:
 *
 * applyNativeHeat(
 *   targetMech,
 *   2
 * )
 *
 * Jockey parent state/contest does not belong here.
 */

/* ============================================================
   WEAPON / SYSTEM SPECIAL EFFECT SUPPORT
   ============================================================ */

/**
 * @section special-effect-support
 *
 * Example source-specific strategy:
 *
 * weapon On Hit
 * → "target takes 2 Heat"
 *
 * If native WeaponAttackFlow did NOT encode that Heat as structured
 * DamageData:
 *
 * strategy
 * → applyNativeHeat(target, 2)
 *
 * If the effect is already represented in native DamageRollFlow data:
 *
 * do not apply it again.
 */

/* ============================================================
   COMBAT MUTATION RESULT HELPERS
   ============================================================ */

/**
 * @section combat-mutation-result-helpers
 */

export function didNativeHpDecrease(
  combatResult
) {
  const before =
    combatResult
      ?.result
      ?.before
      ?.hp
      ?.value;

  const after =
    combatResult
      ?.result
      ?.after
      ?.hp
      ?.value;

  return (
    finiteNumber(before) &&
    finiteNumber(after) &&
    after < before
  );
}

export function didNativeHeatIncrease(
  combatResult
) {
  const before =
    combatResult
      ?.result
      ?.before
      ?.heat
      ?.value;

  const after =
    combatResult
      ?.result
      ?.after
      ?.heat
      ?.value;

  return (
    finiteNumber(before) &&
    finiteNumber(after) &&
    after > before
  );
}

export function didNativeBurnIncrease(
  combatResult
) {
  const before =
    combatResult
      ?.result
      ?.before
      ?.burn;

  const after =
    combatResult
      ?.result
      ?.after
      ?.burn;

  return (
    finiteNumber(before) &&
    finiteNumber(after) &&
    after > before
  );
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing direct combat mutations should migrate behind:
 *
 * native-combat.js
 * → native-adapter.js
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Should not directly mutate:
 *
 * system.hp.value
 * system.heat.value
 * system.burn
 * system.overshield.value
 *
 * for normal resolved damage.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → semantic execution
 * → execution_transaction
 * → native-adapter
 * → native-combat
 *
 *
 * feature_actions/
 * ----------------
 * Universal actions that cause fixed damage/Heat should request native
 * combat primitives rather than directly editing Actor data.
 *
 *
 * weapons runtime
 * ---------------
 * Normal weapon damage remains:
 *
 * WeaponAttackFlow
 * → DamageRollFlow
 *
 * native-combat is primarily for bespoke consequences whose amount has
 * already been resolved.
 *
 *
 * mounted-systems runtime
 * -----------------------
 * Structured system damage should prefer native DamageRollFlow.
 *
 * Fixed semantic effects may use native-combat after save/attack outcome.
 *
 *
 * status runtime
 * --------------
 * Exposed/Shredded/Resistance state is consumed automatically by
 * actor.damageCalc().
 *
 * Do not manually calculate those modifiers before calling damageCalc().
 *
 *
 * Jockey runtime
 * --------------
 * Uses:
 *
 * applyNativeKineticDamage()
 * applyNativeHeat()
 *
 * after Frame Conn resolves the Jockey option.
 *
 *
 * semantic_event_bus/
 * -------------------
 * Higher layers may emit:
 *
 * damageResolved
 * heatChanged
 * burnApplied
 *
 * from normalized native-combat results.
 *
 * native-combat.js itself does not emit semantic events.
 *
 *
 * execution_transaction/
 * ----------------------
 * This adapter's native mutation is part of mechanical execution.
 *
 * Deferred Frame Conn-owned frequency/counter resources should commit
 * only after this operation succeeds where the source rule requires it.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Actor.damageCalc() is authoritative for resolved ordinary Lancer damage.
 *
 * INVARIANT 2
 * Do not manually duplicate Armor, Resistance, Exposed, Shredded,
 * Overshield, Heat-cap, Burn, AP, or Paracausal calculations.
 *
 * INVARIANT 3
 * Mixed damage types should be passed together in one damageCalc call.
 *
 * INVARIANT 4
 * Heat is a native damage channel and should use damageCalc for target
 * Heat effects.
 *
 * INVARIANT 5
 * Burn is a native damage channel and can also increase native Burn state.
 *
 * INVARIANT 6
 * Self Heat already handled by native action/attack flows must not be
 * reapplied here.
 *
 * INVARIANT 7
 * DamageRollFlow remains authoritative when damage dice still need to be
 * rolled.
 *
 * INVARIANT 8
 * StructureFlow and OverheatFlow are separate native execution concerns.
 *
 * INVARIANT 9
 * Do not directly subtract HP for ordinary resolved damage.
 *
 * INVARIANT 10
 * Source-specific strategies determine WHAT consequence occurs;
 * native-combat determines HOW native Lancer applies resolved combat
 * damage/Heat/Burn.
 *
 * INVARIANT 11
 * Raw Actor state may be inspected here, but semantic events/lifecycle
 * remain above this adapter.
 *
 * INVARIANT 12
 * UI code should not call actor.damageCalc() directly after migration.
 */