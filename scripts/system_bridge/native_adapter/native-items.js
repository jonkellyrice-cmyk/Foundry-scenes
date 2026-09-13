/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-items.js
 */

/**
 * @file
 * @path main/native_adapter/native-items.js
 * @module native-items
 * @layer native-adapter-items
 * @responsibility resolve-classify-and-read-native-lancer-item-state
 * @public-boundary false
 * @side-effects native-document-resolution-only
 *
 * @depends-on native-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - extends/generalizes item access currently performed through
 *   foundry-integration-feature.js and feature-specific code
 * - consumed by native-adapter.js
 * - consumed by native-loadout.js
 * - consumed by native-resources.js
 * - consumed by native-execution.js
 * - consumed by actor_owned_feature_registry/*
 * - consumed by future execution-strategy registries
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature-contract.js remains semantic feature/action authority
 * - feature-registry.js / feature-registry-core.js remain declared
 *   Frame Conn feature registries
 * - runtime-orchestrator.js remains high-level coordinator
 * - native-contract.js remains the stable outward contract
 *
 * THIS FILE OWNS:
 * - native Item resolution
 * - native Lancer Item classification
 * - normalized Item references
 * - active Mech Weapon profile resolution
 * - structured ActionData lookup
 * - CounterData lookup
 * - tag inspection
 * - read-only Limited/Loaded/Destroyed/Cascading state
 * - read-only structured feature collections
 *
 * THIS FILE DOES NOT OWN:
 * - Item mutation
 * - Limited consumption
 * - Counter mutation
 * - Loading mutation
 * - Cascade mutation
 * - native Flow execution
 * - action economy
 * - action frequency
 * - feature-specific rule execution
 * - runtime prose interpretation
 *
 * EDIT CONTRACT:
 * - native Lancer item fields/typeguards must match traced repository
 * - do not mutate Item documents
 * - do not parse semantic effect prose into mechanics
 * - preserve exact structured action paths
 */

import {
  NATIVE_ITEM_KIND,
  createNativeActionReference,
  createNativeItemReference
} from "./native-contract.js";

/* ============================================================
   NATIVE ITEM SHAPE NOTES
   ============================================================ */

/**
 * @section native-item-shape-notes
 *
 * Traced native Item typeguards include:
 *
 * item.is_mech_weapon()
 * item.is_pilot_weapon()
 * item.is_mech_system()
 * item.is_weapon_mod()
 * item.is_frame()
 * item.is_talent()
 * item.is_core_bonus()
 * item.is_npc_feature()
 *
 * Traced shared predicates/helpers include:
 *
 * item.isLimited()
 * item.isAI()
 * item.isUnique()
 * item.getTags()
 *
 * Relevant native state:
 *
 * Mech Weapon:
 *   system.destroyed
 *   system.loaded
 *   system.uses
 *   system.selected_profile_index
 *   system.active_profile
 *   system.actions[]
 *   system.profiles[]
 *
 * Pilot Weapon:
 *   system.loaded
 *   system.uses
 *   system.actions[]
 *   system.range[]
 *   system.damage[]
 *   system.tags[]
 *
 * Mech System:
 *   system.destroyed
 *   system.uses
 *   system.actions[]
 *   system.bonuses[]
 *   system.synergies[]
 *   system.counters[]
 *   system.deployables[]
 *   system.integrated[]
 *   system.tags[]
 *
 * Talent:
 *   system.curr_rank
 *   system.ranks[]
 *   system.actions
 *   system.bonuses
 *   system.counters
 *   system.synergies
 *
 * Core Bonus:
 *   system.actions[]
 *   system.bonuses[]
 *   system.counters[]
 *   system.synergies[]
 *   system.deployables[]
 *   system.integrated[]
 *   system.mounted_effect
 *
 * Mech equipment supporting NHP cascade may expose:
 *
 *   system.cascading
 */

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

/**
 * @section private-helpers
 * @purpose isolate-native-item-resolution-and-data-shape-details
 */

function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object"
  );
}

function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function getReferenceUuid(reference) {
  if (typeof reference === "string") {
    return reference;
  }

  if (!reference) {
    return null;
  }

  if (typeof reference.uuid === "string") {
    return reference.uuid;
  }

  return null;
}

function isNativeItemDocument(value) {
  return Boolean(
    isObject(value) &&
    typeof value.uuid === "string" &&
    (
      typeof value.is_mech_weapon === "function" ||
      typeof value.is_pilot_weapon === "function" ||
      typeof value.is_mech_system === "function" ||
      typeof value.is_weapon_mod === "function" ||
      typeof value.is_frame === "function" ||
      typeof value.is_talent === "function" ||
      typeof value.is_core_bonus === "function" ||
      typeof value.is_npc_feature === "function"
    )
  );
}

function assertNativeItem(
  item,
  label = "item"
) {
  if (!isNativeItemDocument(item)) {
    throw new TypeError(
      `${label} is not a native Lancer Item.`
    );
  }

  return item;
}

function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}

function freezeObject(value) {
  if (!isObject(value)) {
    return null;
  }

  return Object.freeze({
    ...value
  });
}

function readNumber(
  value,
  fallback = 0
) {
  return Number.isFinite(value)
    ? value
    : fallback;
}

/**
 * Resolve a nested property path such as:
 *
 * system.actions.0
 * system.ranks.1.actions.0
 * system.profiles.0.actions.1
 *
 * This is intentionally read-only.
 */
function getValueAtPath(
  source,
  path
) {
  if (
    !source ||
    !requiredString(path)
  ) {
    return undefined;
  }

  const parts =
    path.split(".").filter(Boolean);

  let current = source;

  for (const part of parts) {
    if (
      current == null ||
      (
        typeof current !== "object" &&
        typeof current !== "function"
      )
    ) {
      return undefined;
    }

    if (
      Array.isArray(current) &&
      /^\d+$/.test(part)
    ) {
      current =
        current[Number(part)];

      continue;
    }

    current =
      current[part];
  }

  return current;
}

/* ============================================================
   ITEM RESOLUTION
   ============================================================ */

/**
 * @section item-resolution
 * @purpose resolve-native-item-documents-from-authoritative-foundry-identity
 */

/**
 * Accepts:
 *
 * - native Item document
 * - Item UUID
 * - normalized NativeItemReference
 */
export async function resolveNativeItem(
  reference,
  {
    required = true
  } = {}
) {
  if (isNativeItemDocument(reference)) {
    return reference;
  }

  const uuid =
    getReferenceUuid(reference);

  if (!uuid) {
    if (required) {
      throw new TypeError(
        "resolveNativeItem requires an Item or Item UUID."
      );
    }

    return null;
  }

  if (
    typeof globalThis.fromUuid !==
    "function"
  ) {
    throw new Error(
      "Foundry fromUuid() is unavailable."
    );
  }

  const document =
    await globalThis.fromUuid(uuid);

  if (!document) {
    if (required) {
      throw new Error(
        `Native Item not found: ${uuid}`
      );
    }

    return null;
  }

  if (!isNativeItemDocument(document)) {
    if (required) {
      throw new TypeError(
        `Document is not a native Lancer Item: ${uuid}`
      );
    }

    return null;
  }

  return document;
}

export function resolveNativeItemSync(
  reference,
  {
    required = true
  } = {}
) {
  if (isNativeItemDocument(reference)) {
    return reference;
  }

  const uuid =
    getReferenceUuid(reference);

  if (!uuid) {
    if (required) {
      throw new TypeError(
        "resolveNativeItemSync requires an Item or Item UUID."
      );
    }

    return null;
  }

  if (
    typeof globalThis.fromUuidSync !==
    "function"
  ) {
    throw new Error(
      "Foundry fromUuidSync() is unavailable."
    );
  }

  const document =
    globalThis.fromUuidSync(uuid);

  if (!document) {
    if (required) {
      throw new Error(
        `Native Item not found: ${uuid}`
      );
    }

    return null;
  }

  if (!isNativeItemDocument(document)) {
    if (required) {
      throw new TypeError(
        `Document is not a native Lancer Item: ${uuid}`
      );
    }

    return null;
  }

  return document;
}

/* ============================================================
   ITEM CLASSIFICATION
   ============================================================ */

/**
 * @section item-classification
 * @purpose expose-native-item-typeguards-through-stable-adapter-functions
 */

export function isNativeMechWeapon(item) {
  return Boolean(
    item?.is_mech_weapon?.()
  );
}

export function isNativePilotWeapon(item) {
  return Boolean(
    item?.is_pilot_weapon?.()
  );
}

export function isNativeMechSystem(item) {
  return Boolean(
    item?.is_mech_system?.()
  );
}

export function isNativeWeaponMod(item) {
  return Boolean(
    item?.is_weapon_mod?.()
  );
}

export function isNativeFrame(item) {
  return Boolean(
    item?.is_frame?.()
  );
}

export function isNativeTalent(item) {
  return Boolean(
    item?.is_talent?.()
  );
}

export function isNativeCoreBonus(item) {
  return Boolean(
    item?.is_core_bonus?.()
  );
}

export function isNativeNpcFeature(item) {
  return Boolean(
    item?.is_npc_feature?.()
  );
}

export function getNativeItemKind(item) {
  assertNativeItem(item);

  if (item.is_mech_weapon?.()) {
    return NATIVE_ITEM_KIND.MECH_WEAPON;
  }

  if (item.is_pilot_weapon?.()) {
    return NATIVE_ITEM_KIND.PILOT_WEAPON;
  }

  if (item.is_mech_system?.()) {
    return NATIVE_ITEM_KIND.MECH_SYSTEM;
  }

  if (item.is_weapon_mod?.()) {
    return NATIVE_ITEM_KIND.WEAPON_MOD;
  }

  if (item.is_frame?.()) {
    return NATIVE_ITEM_KIND.FRAME;
  }

  if (item.is_talent?.()) {
    return NATIVE_ITEM_KIND.TALENT;
  }

  if (item.is_core_bonus?.()) {
    return NATIVE_ITEM_KIND.CORE_BONUS;
  }

  return NATIVE_ITEM_KIND.OTHER;
}

/* ============================================================
   NORMALIZED ITEM REFERENCES
   ============================================================ */

/**
 * @section normalized-item-references
 */

export function createItemReferenceFromNativeItem(
  item
) {
  assertNativeItem(item);

  return createNativeItemReference({
    uuid:
      item.uuid,

    id:
      item.id ?? null,

    actorUuid:
      item.actor?.uuid ?? null,

    name:
      item.name ?? null,

    kind:
      getNativeItemKind(item),

    lid:
      item.system?.lid ?? null,

    native:
      item
  });
}

export async function resolveNativeItemReference(
  reference
) {
  const item =
    await resolveNativeItem(reference);

  return createItemReferenceFromNativeItem(
    item
  );
}

/* ============================================================
   BASIC ITEM IDENTITY
   ============================================================ */

/**
 * @section basic-item-identity
 */

export function getNativeItemLid(item) {
  assertNativeItem(item);

  return (
    item.system?.lid ??
    null
  );
}

export function getNativeItemName(item) {
  assertNativeItem(item);

  return (
    item.name ??
    null
  );
}

export function getNativeItemActorUuid(item) {
  assertNativeItem(item);

  return (
    item.actor?.uuid ??
    null
  );
}

/* ============================================================
   TAGS
   ============================================================ */

/**
 * @section tags
 *
 * Prefer native getTags() because Mech Weapons may merge active
 * profile/mod tags during native preparation.
 */

export function getNativeTags(item) {
  assertNativeItem(item);

  const tags =
    typeof item.getTags === "function"
      ? item.getTags()
      : item.system?.tags;

  return freezeArray(tags);
}

export function findNativeTagByLid(
  item,
  lid
) {
  if (!requiredString(lid)) {
    return null;
  }

  return (
    getNativeTags(item)
      .find(
        tag =>
          tag?.lid === lid
      ) ??
    null
  );
}

export function hasNativeTag(
  item,
  lid
) {
  return Boolean(
    findNativeTagByLid(
      item,
      lid
    )
  );
}

/* ============================================================
   NATIVE TAG PREDICATES
   ============================================================ */

/**
 * @section native-tag-predicates
 *
 * These wrap traced native Item helpers where available.
 */

export function isNativeLimited(item) {
  assertNativeItem(item);

  if (
    typeof item.isLimited === "function"
  ) {
    return Boolean(
      item.isLimited()
    );
  }

  return false;
}

export function isNativeAi(item) {
  assertNativeItem(item);

  if (
    typeof item.isAI === "function"
  ) {
    return Boolean(
      item.isAI()
    );
  }

  return false;
}

export function isNativeUnique(item) {
  assertNativeItem(item);

  if (
    typeof item.isUnique === "function"
  ) {
    return Boolean(
      item.isUnique()
    );
  }

  return false;
}

/* ============================================================
   DESTROYED / LOADED / CASCADING READS
   ============================================================ */

/**
 * @section native-item-state-reads
 *
 * Mutation belongs to native-resources.js.
 */

export function isNativeItemDestroyed(item) {
  assertNativeItem(item);

  return Boolean(
    item.system?.destroyed
  );
}

export function getNativeLoadedState(item) {
  assertNativeItem(item);

  if (
    typeof item.system?.loaded !==
    "boolean"
  ) {
    return null;
  }

  return item.system.loaded;
}

export function getNativeCascadingState(item) {
  assertNativeItem(item);

  if (
    typeof item.system?.cascading !==
    "boolean"
  ) {
    return null;
  }

  return item.system.cascading;
}

/* ============================================================
   LIMITED STATE
   ============================================================ */

/**
 * @section native-limited-state
 *
 * Read-only here.
 *
 * Native resource mutation belongs to:
 * native-resources.js
 *
 * Resource orchestration belongs to:
 * resource_service/
 */

export function getNativeUsesState(item) {
  assertNativeItem(item);

  const uses =
    item.system?.uses;

  if (!isObject(uses)) {
    return null;
  }

  return Object.freeze({
    value:
      readNumber(
        uses.value,
        0
      ),

    min:
      readNumber(
        uses.min,
        0
      ),

    max:
      readNumber(
        uses.max,
        0
      )
  });
}

/* ============================================================
   MECH WEAPON PROFILE RESOLUTION
   ============================================================ */

/**
 * @section mech-weapon-profile-resolution
 * @purpose preserve-native-multi-profile-weapon-authority
 */

export function getSelectedWeaponProfileIndex(
  weapon
) {
  assertNativeItem(weapon);

  if (!weapon.is_mech_weapon?.()) {
    throw new TypeError(
      "getSelectedWeaponProfileIndex requires a Mech Weapon."
    );
  }

  return readNumber(
    weapon.system
      ?.selected_profile_index,
    0
  );
}

/**
 * Prefer native prepared `active_profile`.
 *
 * Fall back to profiles[selected_profile_index] only if needed.
 */
export function getActiveWeaponProfile(
  weapon
) {
  assertNativeItem(weapon);

  if (!weapon.is_mech_weapon?.()) {
    throw new TypeError(
      "getActiveWeaponProfile requires a Mech Weapon."
    );
  }

  const prepared =
    weapon.system?.active_profile;

  if (prepared) {
    return prepared;
  }

  const index =
    getSelectedWeaponProfileIndex(
      weapon
    );

  return (
    weapon.system
      ?.profiles?.[index] ??
    null
  );
}

export function getNativeWeaponProfiles(
  weapon
) {
  assertNativeItem(weapon);

  if (!weapon.is_mech_weapon?.()) {
    throw new TypeError(
      "getNativeWeaponProfiles requires a Mech Weapon."
    );
  }

  return freezeArray(
    weapon.system?.profiles
  );
}

/* ============================================================
   WEAPON PROFILE COMBAT DATA
   ============================================================ */

/**
 * @section weapon-profile-combat-data
 *
 * Prefer prepared native derived fields where available:
 *
 * all_damage
 * all_range
 * all_tags
 *
 * Do not manually reapply Weapon Mods or actor weapon bonuses here.
 */

export function getActiveWeaponDamage(
  weapon
) {
  const profile =
    getActiveWeaponProfile(weapon);

  if (!profile) {
    return Object.freeze([]);
  }

  return freezeArray(
    profile.all_damage ??
    profile.damage
  );
}

export function getActiveWeaponRange(
  weapon
) {
  const profile =
    getActiveWeaponProfile(weapon);

  if (!profile) {
    return Object.freeze([]);
  }

  return freezeArray(
    profile.all_range ??
    profile.range
  );
}

export function getActiveWeaponTags(
  weapon
) {
  const profile =
    getActiveWeaponProfile(weapon);

  if (!profile) {
    return Object.freeze([]);
  }

  return freezeArray(
    profile.all_tags ??
    profile.tags
  );
}

export function isActiveProfileSkirmishable(
  weapon
) {
  const profile =
    getActiveWeaponProfile(weapon);

  return Boolean(
    profile?.skirmishable
  );
}

export function isActiveProfileBarrageable(
  weapon
) {
  const profile =
    getActiveWeaponProfile(weapon);

  return Boolean(
    profile?.barrageable
  );
}

/* ============================================================
   WEAPON SPECIAL TEXT
   ============================================================ */

/**
 * @section weapon-special-text
 *
 * Native Lancer stores these fields but does not generically execute
 * their bespoke mechanics.
 *
 * Expose them for presentation/strategy lookup only.
 */

export function getActiveWeaponSpecialText(
  weapon
) {
  const profile =
    getActiveWeaponProfile(weapon);

  if (!profile) {
    return null;
  }

  return Object.freeze({
    effect:
      profile.effect ?? null,

    onAttack:
      profile.on_attack ?? null,

    onHit:
      profile.on_hit ?? null,

    onCrit:
      profile.on_crit ?? null
  });
}

/* ============================================================
   STRUCTURED ACTIONS
   ============================================================ */

/**
 * @section structured-actions
 *
 * Exact source path is important.
 *
 * Examples:
 *
 * system.actions.0
 * system.profiles.0.actions.0
 * system.ranks.1.actions.0
 */

export function getNativeItemActions(item) {
  assertNativeItem(item);

  return freezeArray(
    item.system?.actions
  );
}

export function getNativeActionAtPath(
  item,
  path
) {
  assertNativeItem(item);

  if (!requiredString(path)) {
    throw new TypeError(
      "getNativeActionAtPath requires a structured action path."
    );
  }

  const action =
    getValueAtPath(
      item,
      path
    );

  if (!action) {
    return null;
  }

  return action;
}

export function createNativeActionReferenceFromPath(
  item,
  path
) {
  assertNativeItem(item);

  const action =
    getNativeActionAtPath(
      item,
      path
    );

  if (!action) {
    throw new Error(
      `Native action not found at path ${path} on ${item.name ?? item.uuid}.`
    );
  }

  return createNativeActionReference({
    sourceItemUuid:
      item.uuid,

    path,

    name:
      action.name ?? null,

    activation:
      action.activation ?? null,

    frequency:
      action.frequency ?? null,

    native:
      action
  });
}

/* ============================================================
   ACTION ENUMERATION
   ============================================================ */

/**
 * @section action-enumeration
 * @purpose enumerate-structured-actions-while-preserving-native-source-path
 */

/**
 * Enumerate top-level system.actions[].
 */
export function enumerateTopLevelNativeActions(
  item
) {
  assertNativeItem(item);

  const actions =
    item.system?.actions;

  if (!Array.isArray(actions)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    actions.map(
      (_, index) =>
        createNativeActionReferenceFromPath(
          item,
          `system.actions.${index}`
        )
    )
  );
}

/**
 * Enumerate actions on the currently active Mech Weapon profile.
 */
export function enumerateActiveWeaponProfileActions(
  weapon
) {
  assertNativeItem(weapon);

  if (!weapon.is_mech_weapon?.()) {
    return Object.freeze([]);
  }

  const index =
    getSelectedWeaponProfileIndex(
      weapon
    );

  const actions =
    weapon.system
      ?.profiles?.[index]
      ?.actions;

  if (!Array.isArray(actions)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    actions.map(
      (_, actionIndex) =>
        createNativeActionReferenceFromPath(
          weapon,
          `system.profiles.${index}.actions.${actionIndex}`
        )
    )
  );
}

/**
 * Enumerate actions from every currently unlocked Talent rank.
 *
 * Preserve the original rank-specific path even though native runtime
 * also aggregates unlocked actions into system.actions.
 */
export function enumerateUnlockedTalentActions(
  talent
) {
  assertNativeItem(talent);

  if (!talent.is_talent?.()) {
    throw new TypeError(
      "enumerateUnlockedTalentActions requires a Talent."
    );
  }

  const ranks =
    talent.system?.ranks;

  const currentRank =
    readNumber(
      talent.system?.curr_rank,
      0
    );

  if (!Array.isArray(ranks)) {
    return Object.freeze([]);
  }

  const results = [];

  for (
    let rankIndex = 0;
    rankIndex < currentRank;
    rankIndex += 1
  ) {
    const actions =
      ranks[rankIndex]?.actions;

    if (!Array.isArray(actions)) {
      continue;
    }

    for (
      let actionIndex = 0;
      actionIndex < actions.length;
      actionIndex += 1
    ) {
      results.push(
        createNativeActionReferenceFromPath(
          talent,
          `system.ranks.${rankIndex}.actions.${actionIndex}`
        )
      );
    }
  }

  return Object.freeze(results);
}

/**
 * Enumerate all action sources relevant to a native item.
 *
 * Does not perform actor-owned registry normalization.
 */
export function enumerateNativeStructuredActions(
  item
) {
  assertNativeItem(item);

  const results = [
    ...enumerateTopLevelNativeActions(item)
  ];

  if (item.is_mech_weapon?.()) {
    results.push(
      ...enumerateActiveWeaponProfileActions(
        item
      )
    );
  }

  if (item.is_talent?.()) {
    /*
     * Talent system.actions is native flattened runtime data.
     *
     * Prefer exact rank paths to preserve source lineage.
     * Remove top-level duplicates.
     */
    return enumerateUnlockedTalentActions(
      item
    );
  }

  return Object.freeze(results);
}

/* ============================================================
   TALENT RANKS
   ============================================================ */

/**
 * @section talent-ranks
 */

export function getNativeTalentCurrentRank(
  talent
) {
  assertNativeItem(talent);

  if (!talent.is_talent?.()) {
    throw new TypeError(
      "getNativeTalentCurrentRank requires a Talent."
    );
  }

  return readNumber(
    talent.system?.curr_rank,
    0
  );
}

export function getNativeTalentRanks(
  talent
) {
  assertNativeItem(talent);

  if (!talent.is_talent?.()) {
    throw new TypeError(
      "getNativeTalentRanks requires a Talent."
    );
  }

  return freezeArray(
    talent.system?.ranks
  );
}

export function getNativeUnlockedTalentRanks(
  talent
) {
  const ranks =
    getNativeTalentRanks(talent);

  const current =
    getNativeTalentCurrentRank(
      talent
    );

  return Object.freeze(
    ranks.slice(
      0,
      current
    )
  );
}

/* ============================================================
   BONUSES
   ============================================================ */

/**
 * @section bonuses
 *
 * Structured native bonuses are exposed only.
 *
 * Native bonus/effect machinery remains authoritative for application.
 */

export function getNativeItemBonuses(item) {
  assertNativeItem(item);

  if (item.is_mech_weapon?.()) {
    const profile =
      getActiveWeaponProfile(item);

    return freezeArray(
      profile?.bonuses
    );
  }

  return freezeArray(
    item.system?.bonuses
  );
}

/* ============================================================
   COUNTERS
   ============================================================ */

/**
 * @section counters
 *
 * Counter mutation belongs to native-resources.js.
 *
 * For Talents, native runtime aggregates unlocked counters into
 * system.counters.
 *
 * For Mech Weapon profile counters, inspect the active profile.
 */

export function getNativeItemCounters(item) {
  assertNativeItem(item);

  if (item.is_mech_weapon?.()) {
    const profile =
      getActiveWeaponProfile(item);

    return freezeArray(
      profile?.counters
    );
  }

  return freezeArray(
    item.system?.counters
  );
}

export function findNativeCounter(
  item,
  counterKey
) {
  assertNativeItem(item);

  if (!requiredString(counterKey)) {
    return null;
  }

  return (
    getNativeItemCounters(item)
      .find(
        counter =>
          counter?.lid === counterKey ||
          counter?.name === counterKey
      ) ??
    null
  );
}

/* ============================================================
   SYNERGIES
   ============================================================ */

/**
 * @section synergies
 *
 * Structured storage is native.
 * Generic rule execution is not assumed.
 */

export function getNativeItemSynergies(item) {
  assertNativeItem(item);

  if (item.is_mech_weapon?.()) {
    const profile =
      getActiveWeaponProfile(item);

    return freezeArray(
      profile?.synergies
    );
  }

  return freezeArray(
    item.system?.synergies
  );
}

/* ============================================================
   INTEGRATED CONTENT
   ============================================================ */

/**
 * @section integrated-content
 */

export function getNativeIntegratedReferences(
  item
) {
  assertNativeItem(item);

  return freezeArray(
    item.system?.integrated
  );
}

/**
 * Talent integrated entries are rank-owned and are not guaranteed
 * to be flattened into top-level system.integrated.
 */
export function getNativeUnlockedTalentIntegratedReferences(
  talent
) {
  const ranks =
    getNativeUnlockedTalentRanks(
      talent
    );

  const integrated =
    ranks.flatMap(
      rank =>
        Array.isArray(rank?.integrated)
          ? rank.integrated
          : []
    );

  return Object.freeze(integrated);
}

/* ============================================================
   DEPLOYABLE CONTENT
   ============================================================ */

/**
 * @section deployable-content
 */

export function getNativeDeployables(item) {
  assertNativeItem(item);

  return freezeArray(
    item.system?.deployables
  );
}

/**
 * Talent deployables are rank-owned and are not guaranteed to be
 * flattened into top-level runtime data.
 */
export function getNativeUnlockedTalentDeployables(
  talent
) {
  const ranks =
    getNativeUnlockedTalentRanks(
      talent
    );

  const deployables =
    ranks.flatMap(
      rank =>
        Array.isArray(rank?.deployables)
          ? rank.deployables
          : []
    );

  return Object.freeze(deployables);
}

/* ============================================================
   CORE BONUS DATA
   ============================================================ */

/**
 * @section core-bonus-data
 */

export function getNativeCoreBonusMountedEffect(
  coreBonus
) {
  assertNativeItem(coreBonus);

  if (!coreBonus.is_core_bonus?.()) {
    throw new TypeError(
      "getNativeCoreBonusMountedEffect requires a Core Bonus."
    );
  }

  return (
    coreBonus.system
      ?.mounted_effect ??
    null
  );
}

/* ============================================================
   SYSTEM DATA
   ============================================================ */

/**
 * @section mech-system-data
 */

export function getNativeSystemEffect(
  system
) {
  assertNativeItem(system);

  if (!system.is_mech_system?.()) {
    throw new TypeError(
      "getNativeSystemEffect requires a Mech System."
    );
  }

  return (
    system.system?.effect ??
    null
  );
}

export function getNativeSystemSp(
  system
) {
  assertNativeItem(system);

  if (!system.is_mech_system?.()) {
    throw new TypeError(
      "getNativeSystemSp requires a Mech System."
    );
  }

  return readNumber(
    system.system?.sp,
    0
  );
}

/* ============================================================
   FRAME DATA
   ============================================================ */

/**
 * @section frame-data
 */

export function getNativeFrameMountTypes(
  frame
) {
  assertNativeItem(frame);

  if (!frame.is_frame?.()) {
    throw new TypeError(
      "getNativeFrameMountTypes requires a Frame."
    );
  }

  return freezeArray(
    frame.system?.mounts
  );
}

export function getNativeFrameCoreSystem(
  frame
) {
  assertNativeItem(frame);

  if (!frame.is_frame?.()) {
    throw new TypeError(
      "getNativeFrameCoreSystem requires a Frame."
    );
  }

  return (
    frame.system?.core_system ??
    null
  );
}

/* ============================================================
   GENERIC STRUCTURED FEATURE SNAPSHOT
   ============================================================ */

/**
 * @section structured-feature-snapshot
 *
 * Snapshot only.
 *
 * Actor-owned feature registry should normalize this further.
 */

export function getNativeItemFeatureSnapshot(
  item
) {
  assertNativeItem(item);

  const snapshot = {
    reference:
      createItemReferenceFromNativeItem(
        item
      ),

    destroyed:
      isNativeItemDestroyed(item),

    limited:
      isNativeLimited(item),

    uses:
      getNativeUsesState(item),

    loaded:
      getNativeLoadedState(item),

    cascading:
      getNativeCascadingState(item),

    ai:
      isNativeAi(item),

    unique:
      isNativeUnique(item),

    tags:
      getNativeTags(item),

    actions:
      enumerateNativeStructuredActions(
        item
      ),

    bonuses:
      getNativeItemBonuses(item),

    counters:
      getNativeItemCounters(item),

    synergies:
      getNativeItemSynergies(item),

    integrated:
      getNativeIntegratedReferences(
        item
      ),

    deployables:
      getNativeDeployables(item)
  };

  if (item.is_mech_weapon?.()) {
    const profile =
      getActiveWeaponProfile(item);

    snapshot.weapon =
      Object.freeze({
        selectedProfileIndex:
          getSelectedWeaponProfileIndex(
            item
          ),

        profileName:
          profile?.name ?? null,

        damage:
          getActiveWeaponDamage(
            item
          ),

        range:
          getActiveWeaponRange(
            item
          ),

        tags:
          getActiveWeaponTags(
            item
          ),

        skirmishable:
          isActiveProfileSkirmishable(
            item
          ),

        barrageable:
          isActiveProfileBarrageable(
            item
          ),

        specialText:
          getActiveWeaponSpecialText(
            item
          )
      });
  }

  if (item.is_talent?.()) {
    snapshot.talent =
      Object.freeze({
        currentRank:
          getNativeTalentCurrentRank(
            item
          ),

        unlockedRanks:
          getNativeUnlockedTalentRanks(
            item
          ),

        integrated:
          getNativeUnlockedTalentIntegratedReferences(
            item
          ),

        deployables:
          getNativeUnlockedTalentDeployables(
            item
          )
      });
  }

  if (item.is_core_bonus?.()) {
    snapshot.coreBonus =
      Object.freeze({
        mountedEffect:
          getNativeCoreBonusMountedEffect(
            item
          )
      });
  }

  if (item.is_mech_system?.()) {
    snapshot.system =
      Object.freeze({
        sp:
          getNativeSystemSp(item),

        effect:
          getNativeSystemEffect(item)
      });
  }

  return Object.freeze(snapshot);
}

/* ============================================================
   ACTION PATH VALIDATION
   ============================================================ */

/**
 * @section action-path-validation
 */

export function hasNativeActionAtPath(
  item,
  path
) {
  assertNativeItem(item);

  return Boolean(
    getNativeActionAtPath(
      item,
      path
    )
  );
}

/**
 * Re-resolve a previously normalized action reference against current
 * authoritative Item state.
 *
 * Use immediately before execution.
 */
export async function resolveNativeActionReference(
  actionReference
) {
  if (
    !actionReference ||
    !requiredString(
      actionReference.sourceItemUuid
    ) ||
    !requiredString(
      actionReference.path
    )
  ) {
    throw new TypeError(
      "resolveNativeActionReference requires sourceItemUuid and path."
    );
  }

  const item =
    await resolveNativeItem(
      actionReference.sourceItemUuid
    );

  const action =
    getNativeActionAtPath(
      item,
      actionReference.path
    );

  if (!action) {
    return null;
  }

  return Object.freeze({
    item,
    action,
    reference:
      createNativeActionReferenceFromPath(
        item,
        actionReference.path
      )
  });
}

/* ============================================================
   ITEM EXECUTION AVAILABILITY READS
   ============================================================ */

/**
 * @section item-execution-availability-reads
 *
 * These are convenience reads only.
 *
 * Final validation remains native Flow responsibility.
 */

export function getNativeItemAvailabilitySnapshot(
  item
) {
  assertNativeItem(item);

  const limited =
    isNativeLimited(item);

  const uses =
    getNativeUsesState(item);

  const loaded =
    getNativeLoadedState(item);

  return Object.freeze({
    destroyed:
      isNativeItemDestroyed(item),

    limited,

    uses,

    loaded,

    cascading:
      getNativeCascadingState(item)
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing direct Item inspection should migrate behind:
 *
 * native-items.js
 * → native-adapter.js
 *
 * Do not require an all-at-once migration.
 *
 *
 * feature-contract.js
 * -------------------
 * Remains the semantic action/feature definition layer.
 *
 * Native ActionData references from this file should attach to semantic
 * execution definitions; they do not replace feature-contract objects.
 *
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 * Remain the declared Frame Conn registry.
 *
 * actor_owned_feature_registry/
 * should use native-items.js to discover runtime Item features such as:
 *
 * - Traits
 * - Talents
 * - Core Bonuses
 * - Mounted Systems
 * - Weapon actions
 *
 * It then normalizes those into the same runtime action catalog used by
 * declared Frame Conn features.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Should not read:
 *
 * item.system.profiles
 * item.system.actions
 * item.system.counters
 * item.system.uses
 *
 * directly after migration.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → semantic execution context
 * → execution transaction
 * → native adapter
 * → native-items/native-execution
 *
 *
 * feature_actions/
 * ----------------
 * Should consume exact NativeActionReference paths when executing
 * structured actor-owned actions.
 *
 * Do not locate an action again by display name.
 *
 *
 * resource_service/
 * -----------------
 * Uses native-items.js for resource discovery/read state.
 *
 * Mutation belongs to native-resources.js.
 *
 * Resource orchestration belongs to resource_service/.
 *
 *
 * weapon-mount runtime
 * --------------------
 * native-loadout.js should use native Item references from this file for:
 *
 * - mounted weapon identity
 * - Weapon Mod identity
 * - active weapon profile
 *
 *
 * execution strategy registry
 * ---------------------------
 * Weapon/System/Talent/Core Bonus strategies should key against stable:
 *
 * item UUID
 * item LID
 * exact action path
 * active profile identity where required
 *
 * Do not parse effect prose live.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Native Lancer typeguards are authoritative for Item classification.
 *
 * INVARIANT 2
 * Item UUID is the preferred persistent Item identity.
 *
 * INVARIANT 3
 * Item LID identifies rules content but does not replace document UUID.
 *
 * INVARIANT 4
 * Mech Weapon execution always resolves the current active profile.
 *
 * INVARIANT 5
 * Prepared all_damage/all_range/all_tags should be preferred where the
 * native system provides them.
 *
 * INVARIANT 6
 * Structured actions preserve exact native source paths.
 *
 * INVARIANT 7
 * Talent actions preserve rank paths instead of relying on flattened
 * system.actions duplicates.
 *
 * INVARIANT 8
 * Native CounterData is read here and mutated only through
 * native-resources.js.
 *
 * INVARIANT 9
 * Limited/Loaded/Cascading state is read here but not mutated here.
 *
 * INVARIANT 10
 * Weapon effect/on_attack/on_hit/on_crit fields are semantic source data;
 * this file does not interpret them mechanically.
 *
 * INVARIANT 11
 * Actor-owned feature discovery belongs above this file.
 *
 * INVARIANT 12
 * Native Flow execution belongs in native-execution.js.
 *
 * INVARIANT 13
 * Unknown/custom LCP Items remain readable even without a Frame Conn
 * bespoke execution strategy.
 *
 * INVARIANT 14
 * Item snapshots are non-authoritative. Re-resolve Item/action state
 * immediately before execution.
 */