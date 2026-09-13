/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-status.js
 */
/**
 * @file
 * @path main/native_adapter/native-status.js
 * @module native-status
 * @layer native-adapter-status
 * @responsibility read-apply-and-remove-native-lancer-status-effects
 * @public-boundary false
 * @side-effects native-active-effect-mutation
 *
 * @depends-on native-contract, native-actors
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by native-adapter.js
 * - consumed by lifecycle_service/*
 * - consumed by semantic_execution_context/*
 * - consumed by weapon/system/talent/core-bonus strategies
 * - consumed by Jockey runtime
 * - consumed by Hide/Search/Quick-Tech/etc. action implementations
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - lifecycle_service/ owns duration and expiration timing
 * - semantic_event_bus/ owns trigger timing
 * - targeting_spatial_service/ owns geometric Cover/LOS determination
 * - feature_turn/ remains higher-level turn composition
 * - runtime-orchestrator.js remains high-level execution coordinator
 *
 * THIS FILE OWNS:
 * - native status ID discovery
 * - native status reads
 * - native status application
 * - native status removal
 * - native resistance-status application/removal
 * - native ActiveEffect inspection
 * - native status cleanup primitives
 *
 * THIS FILE DOES NOT OWN:
 * - status duration
 * - effect lifecycle
 * - status immunity rules
 * - action legality caused by statuses
 * - Cover geometry
 * - Hidden legality
 * - Engagement geometry
 * - source-specific feature semantics
 *
 * EDIT CONTRACT:
 * - use native Actor.toggleStatusEffect() for standard status mutation
 * - use native ActiveEffect/status collections as authority
 * - do not directly mutate derived system.statuses.*
 * - do not invent alternate status state
 */
import {
  resolveNativeActor
} from "./native-actors.js";
/* ============================================================
   NATIVE STATUS ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section native-status-architecture-notes
 *
 * Native status definitions populate:
 *
 * CONFIG.statusEffects
 *
 * Status definitions originate from:
 *
 * - static Lancer status icon definitions
 * - Status Items from world/compendia
 *
 * Status Item creation on an Actor delegates to:
 *
 * actor.toggleStatusEffect(statusLid, {
 *   active: true
 * })
 *
 * Lancer Actor preparation derives:
 *
 * actor.statuses
 *        ↓
 * system.statuses[statusId] = true
 *
 * Resistances are also derived from status IDs:
 *
 * resistance_burn
 * resistance_energy
 * resistance_explosive
 * resistance_heat
 * resistance_kinetic
 *
 * Therefore:
 *
 * DO NOT mutate system.statuses directly.
 */
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function normalizeStatusId(statusId) {
  if (!requiredString(statusId)) {
    throw new TypeError(
      "Status ID must be a non-empty string."
    );
  }
  return statusId.trim();
}
function getConfiguredStatusEffects() {
  const configured =
    globalThis.CONFIG?.statusEffects;
  return Array.isArray(configured)
    ? configured
    : [];
}
/* ============================================================
   STATUS DEFINITIONS
   ============================================================ */
/**
 * @section status-definitions
 */
export function getNativeStatusDefinitions() {
  return Object.freeze(
    getConfiguredStatusEffects()
      .map(
        status =>
          Object.freeze({
            id:
              status?.id ?? null,
            name:
              status?.name ?? null,
            img:
              status?.img ??
              status?.icon ??
              null,
            description:
              status?.description ??
              null,
            changes:
              freezeArray(
                status?.changes
              ),
            native:
              status
          })
      )
  );
}
export function findNativeStatusDefinition(
  statusId
) {
  const normalized =
    normalizeStatusId(
      statusId
    );
  const status =
    getConfiguredStatusEffects()
      .find(
        candidate =>
          candidate?.id ===
          normalized
      );
  if (!status) {
    return null;
  }
  return Object.freeze({
    id:
      status.id,
    name:
      status.name ?? null,
    img:
      status.img ??
      status.icon ??
      null,
    description:
      status.description ??
      null,
    changes:
      freezeArray(
        status.changes
      ),
    native:
      status
  });
}
export function isKnownNativeStatus(
  statusId
) {
  return Boolean(
    findNativeStatusDefinition(
      statusId
    )
  );
}
/* ============================================================
   STATUS READS
   ============================================================ */
/**
 * @section status-reads
 *
 * Prefer actor.statuses for native ActiveEffect status identity.
 *
 * system.statuses is derived convenience state.
 */
export async function getNativeActorStatusIds(
  actorReference
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  if (
    actor.statuses &&
    typeof actor.statuses.values ===
      "function"
  ) {
    return Object.freeze(
      [
        ...actor.statuses.values()
      ]
    );
  }
  const derived =
    actor.system?.statuses;
  if (
    !derived ||
    typeof derived !== "object"
  ) {
    return Object.freeze([]);
  }
  return Object.freeze(
    Object.entries(derived)
      .filter(
        ([, active]) =>
          Boolean(active)
      )
      .map(
        ([id]) =>
          id
      )
  );
}
export async function hasNativeStatus(
  actorReference,
  statusId
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  const normalized =
    normalizeStatusId(
      statusId
    );
  if (
    actor.statuses &&
    typeof actor.statuses.has ===
      "function"
  ) {
    return actor.statuses.has(
      normalized
    );
  }
  return Boolean(
    actor.system
      ?.statuses
      ?.[normalized]
  );
}
/* ============================================================
   ACTIVE EFFECT INSPECTION
   ============================================================ */
/**
 * @section active-effect-inspection
 */
export async function getNativeStatusEffects(
  actorReference,
  statusId = null
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  const normalized =
    statusId == null
      ? null
      : normalizeStatusId(
          statusId
        );
  const effects =
    Array.from(
      actor.effects ?? []
    )
      .filter(
        effect => {
          if (!normalized) {
            return Boolean(
              effect.statuses?.size
            );
          }
          return Boolean(
            effect.statuses?.has?.(
              normalized
            )
          );
        }
      );
  return Object.freeze(
    effects
  );
}
export async function findNativeStatusEffect(
  actorReference,
  statusId
) {
  const effects =
    await getNativeStatusEffects(
      actorReference,
      statusId
    );
  return (
    effects[0] ??
    null
  );
}
/* ============================================================
   STATUS APPLICATION
   ============================================================ */
/**
 * @section status-application
 *
 * Standard native pathway:
 *
 * Actor.toggleStatusEffect(
 *   statusId,
 *   { active: true }
 * )
 */
export async function applyNativeStatus(
  actorReference,
  statusId,
  {
    requireKnownStatus = true
  } = {}
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  const normalized =
    normalizeStatusId(
      statusId
    );
  if (
    requireKnownStatus &&
    !isKnownNativeStatus(
      normalized
    )
  ) {
    throw new Error(
      `Unknown native Lancer status: ${normalized}`
    );
  }
  const before =
    await hasNativeStatus(
      actor,
      normalized
    );
  if (before) {
    return Object.freeze({
      changed: false,
      active: true,
      statusId:
        normalized,
      actorUuid:
        actor.uuid
    });
  }
  if (
    typeof actor.toggleStatusEffect !==
    "function"
  ) {
    throw new Error(
      "Actor.toggleStatusEffect() is unavailable."
    );
  }
  await actor.toggleStatusEffect(
    normalized,
    {
      active: true
    }
  );
  const after =
    await hasNativeStatus(
      actor,
      normalized
    );
  return Object.freeze({
    changed:
      !before && after,
    active:
      after,
    statusId:
      normalized,
    actorUuid:
      actor.uuid
  });
}
/* ============================================================
   STATUS REMOVAL
   ============================================================ */
/**
 * @section status-removal
 */
export async function removeNativeStatus(
  actorReference,
  statusId
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  const normalized =
    normalizeStatusId(
      statusId
    );
  const before =
    await hasNativeStatus(
      actor,
      normalized
    );
  if (!before) {
    return Object.freeze({
      changed: false,
      active: false,
      statusId:
        normalized,
      actorUuid:
        actor.uuid
    });
  }
  if (
    typeof actor.toggleStatusEffect !==
    "function"
  ) {
    throw new Error(
      "Actor.toggleStatusEffect() is unavailable."
    );
  }
  await actor.toggleStatusEffect(
    normalized,
    {
      active: false
    }
  );
  const after =
    await hasNativeStatus(
      actor,
      normalized
    );
  return Object.freeze({
    changed:
      before && !after,
    active:
      after,
    statusId:
      normalized,
    actorUuid:
      actor.uuid
  });
}
/* ============================================================
   STATUS TOGGLE
   ============================================================ */
/**
 * @section status-toggle
 */
export async function setNativeStatus(
  actorReference,
  statusId,
  active,
  options = {}
) {
  if (
    typeof active !== "boolean"
  ) {
    throw new TypeError(
      "setNativeStatus requires boolean active."
    );
  }
  if (active) {
    return applyNativeStatus(
      actorReference,
      statusId,
      options
    );
  }
  return removeNativeStatus(
    actorReference,
    statusId
  );
}
/* ============================================================
   MULTI-STATUS MUTATION
   ============================================================ */
/**
 * @section multi-status-mutation
 */
export async function applyNativeStatuses(
  actorReference,
  statusIds,
  options = {}
) {
  if (!Array.isArray(statusIds)) {
    throw new TypeError(
      "applyNativeStatuses requires an array."
    );
  }
  const results = [];
  for (const statusId of statusIds) {
    results.push(
      await applyNativeStatus(
        actorReference,
        statusId,
        options
      )
    );
  }
  return Object.freeze(
    results
  );
}
export async function removeNativeStatuses(
  actorReference,
  statusIds
) {
  if (!Array.isArray(statusIds)) {
    throw new TypeError(
      "removeNativeStatuses requires an array."
    );
  }
  const results = [];
  for (const statusId of statusIds) {
    results.push(
      await removeNativeStatus(
        actorReference,
        statusId
      )
    );
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   EFFECT HELPER REMOVAL
   ============================================================ */
/**
 * @section effect-helper-removal
 *
 * Native Lancer EffectHelper provides:
 *
 * actor.effectHelper.removeActiveEffect(name)
 * actor.effectHelper.removeActiveEffects(names)
 *
 * Native attack flow uses this for Lock On consumption.
 *
 * Prefer status-ID toggle operations for normal status mutation.
 *
 * These helpers exist for compatibility with native flows/effects that
 * identify effects by status/name matching.
 */
export async function removeNativeActiveEffectByName(
  actorReference,
  effectName
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  if (!requiredString(effectName)) {
    throw new TypeError(
      "removeNativeActiveEffectByName requires an effect name."
    );
  }
  if (
    typeof actor.effectHelper
      ?.removeActiveEffect !==
    "function"
  ) {
    throw new Error(
      "Native EffectHelper.removeActiveEffect() is unavailable."
    );
  }
  await actor.effectHelper
    .removeActiveEffect(
      effectName
    );
}
export async function removeNativeActiveEffectsByName(
  actorReference,
  effectNames
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  if (!Array.isArray(effectNames)) {
    throw new TypeError(
      "removeNativeActiveEffectsByName requires an array."
    );
  }
  if (
    typeof actor.effectHelper
      ?.removeActiveEffects !==
    "function"
  ) {
    throw new Error(
      "Native EffectHelper.removeActiveEffects() is unavailable."
    );
  }
  await actor.effectHelper
    .removeActiveEffects(
      effectNames
    );
}
/* ============================================================
   CLEAR ALL NATIVE STATUSES
   ============================================================ */
/**
 * @section clear-all-native-statuses
 *
 * Native EffectHelper.removeAllStatuses() removes:
 *
 * - non-ephemeral Actor ActiveEffects
 * - embedded Status Items
 *
 * This is destructive.
 *
 * Use only for explicit rules such as Full Repair/cleanup where such
 * broad removal is actually legal.
 */
export async function removeAllNativeStatuses(
  actorReference
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  if (
    typeof actor.effectHelper
      ?.removeAllStatuses !==
    "function"
  ) {
    throw new Error(
      "Native EffectHelper.removeAllStatuses() is unavailable."
    );
  }
  await actor.effectHelper
    .removeAllStatuses();
}
/* ============================================================
   RESISTANCE STATUS HELPERS
   ============================================================ */
/**
 * @section resistance-status-helpers
 *
 * Lancer derives native resistance flags from these status IDs:
 *
 * resistance_burn
 * resistance_energy
 * resistance_explosive
 * resistance_heat
 * resistance_kinetic
 */
export const NATIVE_RESISTANCE_STATUS = Object.freeze({
  BURN:
    "resistance_burn",
  ENERGY:
    "resistance_energy",
  EXPLOSIVE:
    "resistance_explosive",
  HEAT:
    "resistance_heat",
  KINETIC:
    "resistance_kinetic"
});
export async function applyNativeResistance(
  actorReference,
  resistanceType
) {
  const statusId =
    NATIVE_RESISTANCE_STATUS[
      String(
        resistanceType
      ).toUpperCase()
    ];
  if (!statusId) {
    throw new Error(
      `Unsupported native resistance type: ${String(resistanceType)}`
    );
  }
  return applyNativeStatus(
    actorReference,
    statusId
  );
}
export async function removeNativeResistance(
  actorReference,
  resistanceType
) {
  const statusId =
    NATIVE_RESISTANCE_STATUS[
      String(
        resistanceType
      ).toUpperCase()
    ];
  if (!statusId) {
    throw new Error(
      `Unsupported native resistance type: ${String(resistanceType)}`
    );
  }
  return removeNativeStatus(
    actorReference,
    statusId
  );
}
/* ============================================================
   STATUS SNAPSHOT
   ============================================================ */
/**
 * @section status-snapshot
 */
export async function getNativeStatusSnapshot(
  actorReference
) {
  const actor =
    await resolveNativeActor(
      actorReference
    );
  const statusIds =
    await getNativeActorStatusIds(
      actor
    );
  const effects = [];
  for (const statusId of statusIds) {
    const effect =
      await findNativeStatusEffect(
        actor,
        statusId
      );
    effects.push(
      Object.freeze({
        statusId,
        effectUuid:
          effect?.uuid ??
          null,
        effectId:
          effect?.id ??
          null,
        name:
          effect?.name ??
          null
      })
    );
  }
  return Object.freeze({
    actorUuid:
      actor.uuid,
    statusIds,
    effects:
      Object.freeze(
        effects
      )
  });
}
/* ============================================================
   NATIVE STATUS IDs
   ============================================================ */
/**
 * @section native-status-ids
 *
 * These constants cover stock IDs heavily used by Frame Conn.
 *
 * Runtime definition lookup remains CONFIG.statusEffects authority.
 */
export const NATIVE_STATUS_ID = Object.freeze({
  IMMOBILIZED:
    "immobilized",
  IMPAIRED:
    "impaired",
  JAMMED:
    "jammed",
  LOCK_ON:
    "lockon",
  SHREDDED:
    "shredded",
  STUNNED:
    "stunned",
  DANGER_ZONE:
    "dangerzone",
  DOWN_AND_OUT:
    "downandout",
  ENGAGED:
    "engaged",
  EXPOSED:
    "exposed",
  HIDDEN:
    "hidden",
  INVISIBLE:
    "invisible",
  INTANGIBLE:
    "intangible",
  PRONE:
    "prone",
  SHUT_DOWN:
    "shutdown",
  HARD_COVER:
    "cover_hard",
  SOFT_COVER:
    "cover_soft",
  FLYING:
    "flying",
  BOLSTER:
    "bolster"
});
/**
 * IMPORTANT:
 *
 * The traced static CONFIG definition uses:
 *
 *   "slow"
 *
 * while the prepared Actor schema exposes:
 *
 *   system.statuses.slowed
 *
 * Do not silently normalize one to the other here.
 *
 * Resolve the actual configured/native status ID at runtime when working
 * with Slowed until the system-side naming mismatch is intentionally
 * reconciled elsewhere.
 */
/* ============================================================
   EFFECT SOURCE / LIFECYCLE BOUNDARY
   ============================================================ */
/**
 * @section effect-source-lifecycle-boundary
 *
 * Standard Foundry status toggles are actor/status based.
 *
 * They do NOT by themselves model Frame Conn semantic ownership such as:
 *
 * "Impaired from Jockey Distract until end of target's next turn"
 *
 * Therefore:
 *
 * lifecycle_service/
 * must track:
 *
 * {
 *   source,
 *   target,
 *   statusId,
 *   expiration,
 *   application identity
 * }
 *
 * native-status.js performs the actual native status mutation.
 *
 * IMPORTANT:
 *
 * Do not remove a shared status merely because one Frame Conn source
 * expires if another valid source still requires the same status.
 *
 * Source aggregation/reference counting belongs above this adapter.
 */
/* ============================================================
   GEOMETRIC STATUS BOUNDARY
   ============================================================ */
/**
 * @section geometric-status-boundary
 *
 * Some native status IDs are used as mechanical state but may also depend
 * on scene geometry.
 *
 * Examples:
 *
 * engaged
 * cover_soft
 * cover_hard
 * hidden
 *
 * native-status.js only reads/applies/removes status state.
 *
 * targeting_spatial_service/ determines whether geometric conditions are
 * currently true.
 *
 * feature/action strategies decide when to materialize a native status.
 */
/* ============================================================
   STATUS IMMUNITY BOUNDARY
   ============================================================ */
/**
 * @section status-immunity-boundary
 *
 * Native toggleStatusEffect() does not constitute a generalized
 * Frame Conn condition-immunity engine.
 *
 * Before applying rule-generated statuses:
 *
 * status_rules / semantic legality
 * → check source-specific immunity
 * → native-status.applyNativeStatus()
 *
 * Example:
 *
 * Superior by Design
 * → Immune to Impaired
 *
 * Immunity logic does not belong inside this native mutation adapter.
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing direct status mutation should migrate behind:
 *
 * native-status.js
 * → native-adapter.js
 *
 *
 * feature_turn/
 * -------------
 * Turn transitions should not directly remove temporary statuses.
 *
 * Intended:
 *
 * feature_turn
 * → lifecycle_service
 * → native-status
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Should not call:
 *
 * actor.toggleStatusEffect(...)
 *
 * directly after migration.
 *
 *
 * feature_actions/
 * ----------------
 * Action implementations such as:
 *
 * Lock On
 * Hide
 * Shut Down
 * Jockey Distract
 * weapon/system special effects
 *
 * should request semantic status changes through shared strategy/runtime
 * code, which ultimately delegates here.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 * Owns:
 *
 * Engaged geometry
 * Cover geometry
 * LOS
 * Hidden legality
 *
 * native-status.js does not calculate those relationships.
 *
 *
 * lifecycle_service/
 * ------------------
 * Owns:
 *
 * until start of next turn
 * until end of next turn
 * until end of round
 * until scene end
 * until next qualifying event
 *
 * It delegates final native mutation here.
 *
 *
 * semantic_event_bus/
 * -------------------
 * May emit:
 *
 * statusApplied
 * statusRemoved
 *
 * after this adapter returns.
 *
 * This adapter itself should not dispatch semantic events.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * ActiveEffect/status state is authoritative.
 *
 * INVARIANT 2
 * system.statuses is derived state and must not be directly mutated.
 *
 * INVARIANT 3
 * Standard status application/removal uses native
 * Actor.toggleStatusEffect().
 *
 * INVARIANT 4
 * CONFIG.statusEffects is authoritative for available native status IDs.
 *
 * INVARIANT 5
 * Status duration/lifecycle does not belong here.
 *
 * INVARIANT 6
 * Status immunity does not belong here.
 *
 * INVARIANT 7
 * Geometric Cover/Engagement/Hidden determination does not belong here.
 *
 * INVARIANT 8
 * Native resistance statuses should be used so native damage machinery
 * can consume them.
 *
 * INVARIANT 9
 * Broad removeAllStatuses() is destructive and must only be used by an
 * explicitly legal higher-level rule.
 *
 * INVARIANT 10
 * Frame Conn source ownership must be tracked above this adapter so one
 * source expiry does not incorrectly remove a status still required by
 * another source.
 *
 * INVARIANT 11
 * The native "slow" status ID versus derived "slowed" field mismatch must
 * not be hidden by speculative normalization.
 *
 * INVARIANT 12
 * UI and feature code should not manipulate ActiveEffects directly after
 * migration.
 */