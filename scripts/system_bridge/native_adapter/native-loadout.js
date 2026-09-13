
/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-loadout.js
 */
/**
 * @file
 * @path main/native_adapter/native-loadout.js
 * @module native-loadout
 * @layer native-adapter-loadout
 * @responsibility resolve-and-read-native-lancer-mech-loadout-state
 * @public-boundary false
 * @side-effects native-loadout-helper-calls-only
 *
 * @depends-on native-contract, native-actors, native-items
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - extends/generalizes loadout inspection currently performed by
 *   feature_actions/* and foundry-integration-feature.js
 * - consumed by native-adapter.js
 * - consumed by native-execution.js
 * - consumed by semantic_execution_context/*
 * - consumed by future Skirmish/Barrage parent actions
 * - consumed by actor_owned_feature_registry/*
 * - consumed by persistent mount/weapon configuration services
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature_actions remains semantic action composition
 * - runtime-orchestrator.js remains high-level execution coordinator
 * - feature-registry remains semantic action/feature registry
 * - native-items.js remains native Item identity/profile authority
 *
 * THIS FILE OWNS:
 * - mech loadout resolution
 * - weapon mount enumeration
 * - mount slot inspection
 * - mounted weapon/mod resolution
 * - mounted system resolution
 * - native mount validation
 * - bracing state inspection
 * - finding the mount/slot containing a weapon
 * - mount signatures for revalidation
 * - read-only Frame/native mount topology access
 *
 * THIS FILE DOES NOT OWN:
 * - Skirmish/Barrage execution
 * - target selection
 * - same-target-per-mount enforcement
 * - attack rolls
 * - weapon effects
 * - action economy
 * - persistent Core Bonus configuration policy
 * - arbitrary loadout mutation
 *
 * EDIT CONTRACT:
 * - consume final native mech loadout as combat authority
 * - preserve native mount/fitting/weapon distinctions
 * - do not invent stable mount UUIDs
 * - use native validation where available
 */
import {
  createNativeMountReference,
  createNativeMountSlotReference
} from "./native-contract.js";
import {
  resolveNativeActor,
  isNativeMech
} from "./native-actors.js";
import {
  createItemReferenceFromNativeItem,
  resolveNativeItem
} from "./native-items.js";
/* ============================================================
   NATIVE LOADOUT SHAPE NOTES
   ============================================================ */
/**
 * @section native-loadout-shape-notes
 *
 * Traced native Mech loadout:
 *
 * system.loadout
 * ├── frame
 * ├── weapon_mounts[]
 * │   ├── type
 * │   ├── bracing
 * │   └── slots[]
 * │       ├── weapon -> EmbeddedRef<Item>
 * │       ├── mod    -> EmbeddedRef<Item>
 * │       └── size   -> FittingSize
 * └── systems[]
 *
 * Native mounts are nested Actor data.
 *
 * They do NOT have stable UUIDs.
 *
 * Native weapon/mod/system refs ultimately resolve to embedded Items.
 *
 * Native loadout helper includes:
 *
 * actor.loadoutHelper.validateMount(mount)
 * actor.loadoutHelper.listLoadout()
 * actor.loadoutHelper.resetMounts()
 */
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object"
  );
}
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}
function assertNativeMech(mech) {
  if (!isNativeMech(mech)) {
    throw new TypeError(
      "Expected native Lancer Mech actor."
    );
  }
  return mech;
}
/**
 * Embedded refs may already be resolved.
 *
 * Traced native Sync/Embedded ref shape commonly exposes:
 *
 * {
 *   id,
 *   status,
 *   value
 * }
 */
function getResolvedReferenceValue(reference) {
  if (
    reference?.status === "resolved" &&
    reference.value
  ) {
    return reference.value;
  }
  if (
    reference?.value &&
    typeof reference.value === "object"
  ) {
    return reference.value;
  }
  return null;
}
function getReferenceUuid(reference) {
  if (!reference) {
    return null;
  }
  if (typeof reference === "string") {
    return reference;
  }
  if (
    typeof reference.uuid === "string"
  ) {
    return reference.uuid;
  }
  if (
    typeof reference.value?.uuid ===
    "string"
  ) {
    return reference.value.uuid;
  }
  if (
    typeof reference.id === "string"
  ) {
    return reference.id;
  }
  return null;
}
async function resolveEmbeddedItemReference(
  reference,
  {
    required = false
  } = {}
) {
  if (!reference) {
    return null;
  }
  const resolved =
    getResolvedReferenceValue(reference);
  if (resolved) {
    return resolved;
  }
  const uuid =
    getReferenceUuid(reference);
  if (!uuid) {
    if (required) {
      throw new Error(
        "Embedded Item reference is empty."
      );
    }
    return null;
  }
  return resolveNativeItem(
    uuid,
    { required }
  );
}
function normalizeValidationResult(result) {
  if (result == null) {
    return Object.freeze({
      valid: true,
      errors: Object.freeze([]),
      raw: result
    });
  }
  if (typeof result === "boolean") {
    return Object.freeze({
      valid: result,
      errors: Object.freeze([]),
      raw: result
    });
  }
  if (Array.isArray(result)) {
    const errors =
      result
        .filter(Boolean)
        .map(String);
    return Object.freeze({
      valid:
        errors.length === 0,
      errors:
        Object.freeze(errors),
      raw:
        result
    });
  }
  if (isObject(result)) {
    const errors = [];
    if (Array.isArray(result.errors)) {
      errors.push(
        ...result.errors
          .filter(Boolean)
          .map(String)
      );
    }
    if (Array.isArray(result.warnings)) {
      /*
       * Warnings are preserved in raw result but do not
       * automatically make the mount invalid.
       */
    }
    if (
      typeof result.error === "string" &&
      result.error.length > 0
    ) {
      errors.push(result.error);
    }
    const explicitValid =
      typeof result.valid === "boolean"
        ? result.valid
        : null;
    return Object.freeze({
      valid:
        explicitValid ??
        errors.length === 0,
      errors:
        Object.freeze(errors),
      raw:
        result
    });
  }
  return Object.freeze({
    valid: true,
    errors: Object.freeze([]),
    raw: result
  });
}
/* ============================================================
   MECH LOADOUT RESOLUTION
   ============================================================ */
/**
 * @section mech-loadout-resolution
 */
export async function resolveNativeMechLoadout(
  mechReference
) {
  const mech =
    await resolveNativeActor(mechReference);
  assertNativeMech(mech);
  return mech.system?.loadout ?? null;
}
export function getNativeWeaponMounts(mech) {
  assertNativeMech(mech);
  return freezeArray(
    mech.system
      ?.loadout
      ?.weapon_mounts
  );
}
export function getNativeMountedSystemReferences(mech) {
  assertNativeMech(mech);
  return freezeArray(
    mech.system
      ?.loadout
      ?.systems
  );
}
/* ============================================================
   MOUNT ENUMERATION
   ============================================================ */
/**
 * @section mount-enumeration
 */
export function getNativeMount(
  mech,
  mountIndex
) {
  assertNativeMech(mech);
  if (
    !Number.isInteger(mountIndex) ||
    mountIndex < 0
  ) {
    throw new TypeError(
      "getNativeMount requires a non-negative integer mountIndex."
    );
  }
  return (
    mech.system
      ?.loadout
      ?.weapon_mounts
      ?.[mountIndex] ??
    null
  );
}
export function getNativeMountType(mount) {
  return mount?.type ?? null;
}
export function isNativeBracingMount(mount) {
  return Boolean(
    mount?.bracing
  );
}
export function getNativeMountSlots(mount) {
  return freezeArray(
    mount?.slots
  );
}
export function isNativeMountEmpty(mount) {
  return getNativeMountSlots(mount)
    .every(
      slot =>
        !slot?.weapon
    );
}
/* ============================================================
   SLOT INSPECTION
   ============================================================ */
/**
 * @section slot-inspection
 */
export function getNativeMountSlot(
  mount,
  slotIndex
) {
  if (
    !Number.isInteger(slotIndex) ||
    slotIndex < 0
  ) {
    throw new TypeError(
      "getNativeMountSlot requires non-negative integer slotIndex."
    );
  }
  return (
    mount?.slots?.[slotIndex] ??
    null
  );
}
export function getNativeSlotFittingSize(
  slot
) {
  return (
    slot?.size ??
    null
  );
}
export async function resolveNativeSlotWeapon(
  slot,
  {
    required = false
  } = {}
) {
  return resolveEmbeddedItemReference(
    slot?.weapon,
    { required }
  );
}
export async function resolveNativeSlotMod(
  slot,
  {
    required = false
  } = {}
) {
  return resolveEmbeddedItemReference(
    slot?.mod,
    { required }
  );
}
/* ============================================================
   MOUNT REFERENCE CONSTRUCTION
   ============================================================ */
/**
 * @section mount-reference-construction
 *
 * Native mounts have no stable UUID.
 *
 * Preserve:
 *
 * mech UUID
 * array index
 * mount type
 * bracing state
 * weapon UUID signature
 * fitting-size signature
 */
export async function createMountReferenceFromNativeMount(
  mech,
  mountIndex
) {
  assertNativeMech(mech);
  const mount =
    getNativeMount(
      mech,
      mountIndex
    );
  if (!mount) {
    throw new Error(
      `Native mount not found at index ${mountIndex}.`
    );
  }
  const slots =
    getNativeMountSlots(mount);
  const weaponUuids = [];
  const fittingSizes =
    slots.map(
      slot =>
        getNativeSlotFittingSize(slot)
    );
  for (const slot of slots) {
    const weapon =
      await resolveNativeSlotWeapon(
        slot,
        { required: false }
      );
    if (weapon?.uuid) {
      weaponUuids.push(
        weapon.uuid
      );
    }
  }
  return createNativeMountReference({
    mechUuid:
      mech.uuid,
    mountIndex,
    mountType:
      getNativeMountType(mount),
    bracing:
      isNativeBracingMount(mount),
    weaponUuids,
    fittingSizes
  });
}
export async function createMountSlotReferenceFromNativeSlot(
  mech,
  mountIndex,
  slotIndex
) {
  assertNativeMech(mech);
  const mount =
    getNativeMount(
      mech,
      mountIndex
    );
  if (!mount) {
    throw new Error(
      `Native mount not found at index ${mountIndex}.`
    );
  }
  const slot =
    getNativeMountSlot(
      mount,
      slotIndex
    );
  if (!slot) {
    throw new Error(
      `Native mount slot not found at mount ${mountIndex}, slot ${slotIndex}.`
    );
  }
  const [
    weapon,
    mod,
    mountReference
  ] = await Promise.all([
    resolveNativeSlotWeapon(
      slot,
      { required: false }
    ),
    resolveNativeSlotMod(
      slot,
      { required: false }
    ),
    createMountReferenceFromNativeMount(
      mech,
      mountIndex
    )
  ]);
  return createNativeMountSlotReference({
    mount:
      mountReference,
    slotIndex,
    weaponUuid:
      weapon?.uuid ?? null,
    modUuid:
      mod?.uuid ?? null,
    fittingSize:
      getNativeSlotFittingSize(
        slot
      )
  });
}
/* ============================================================
   MOUNT WEAPON RESOLUTION
   ============================================================ */
/**
 * @section mount-weapon-resolution
 */
export async function getNativeMountWeapons(
  mech,
  mountIndex
) {
  assertNativeMech(mech);
  const mount =
    getNativeMount(
      mech,
      mountIndex
    );
  if (!mount) {
    return Object.freeze([]);
  }
  const results = [];
  const slots =
    getNativeMountSlots(mount);
  for (
    let slotIndex = 0;
    slotIndex < slots.length;
    slotIndex += 1
  ) {
    const slot =
      slots[slotIndex];
    const weapon =
      await resolveNativeSlotWeapon(
        slot,
        { required: false }
      );
    if (!weapon) {
      continue;
    }
    results.push(
      Object.freeze({
        slotIndex,
        weapon,
        reference:
          createItemReferenceFromNativeItem(
            weapon
          )
      })
    );
  }
  return Object.freeze(
    results
  );
}
export async function getNativeMountMods(
  mech,
  mountIndex
) {
  assertNativeMech(mech);
  const mount =
    getNativeMount(
      mech,
      mountIndex
    );
  if (!mount) {
    return Object.freeze([]);
  }
  const results = [];
  const slots =
    getNativeMountSlots(mount);
  for (
    let slotIndex = 0;
    slotIndex < slots.length;
    slotIndex += 1
  ) {
    const slot =
      slots[slotIndex];
    const mod =
      await resolveNativeSlotMod(
        slot,
        { required: false }
      );
    if (!mod) {
      continue;
    }
    results.push(
      Object.freeze({
        slotIndex,
        mod,
        reference:
          createItemReferenceFromNativeItem(
            mod
          )
      })
    );
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   MOUNT CONTENT SNAPSHOT
   ============================================================ */
/**
 * @section mount-content-snapshot
 */
export async function getNativeMountSnapshot(
  mech,
  mountIndex
) {
  assertNativeMech(mech);
  const mount =
    getNativeMount(
      mech,
      mountIndex
    );
  if (!mount) {
    return null;
  }
  const reference =
    await createMountReferenceFromNativeMount(
      mech,
      mountIndex
    );
  const slots = [];
  for (
    let slotIndex = 0;
    slotIndex < mount.slots.length;
    slotIndex += 1
  ) {
    const slot =
      mount.slots[slotIndex];
    const [
      weapon,
      mod
    ] = await Promise.all([
      resolveNativeSlotWeapon(
        slot,
        { required: false }
      ),
      resolveNativeSlotMod(
        slot,
        { required: false }
      )
    ]);
    slots.push(
      Object.freeze({
        slotIndex,
        fittingSize:
          getNativeSlotFittingSize(
            slot
          ),
        weapon:
          weapon
            ? createItemReferenceFromNativeItem(
                weapon
              )
            : null,
        mod:
          mod
            ? createItemReferenceFromNativeItem(
                mod
              )
            : null
      })
    );
  }
  return Object.freeze({
    reference,
    type:
      getNativeMountType(mount),
    bracing:
      isNativeBracingMount(mount),
    slots:
      Object.freeze(slots)
  });
}
/* ============================================================
   MOUNT VALIDATION
   ============================================================ */
/**
 * @section mount-validation
 *
 * Native Lancer already validates:
 *
 * - fitting size
 * - Flex one-Main / two-Aux rule
 * - Superheavy bracing
 * - Integrated exceptions
 *
 * Frame Conn should reuse this instead of duplicating those rules.
 */
export function validateNativeMount(
  mech,
  mountOrIndex
) {
  assertNativeMech(mech);
  const mount =
    Number.isInteger(mountOrIndex)
      ? getNativeMount(
          mech,
          mountOrIndex
        )
      : mountOrIndex;
  if (!mount) {
    return Object.freeze({
      valid: false,
      errors: Object.freeze([
        "Mount not found."
      ]),
      raw: null
    });
  }
  const helper =
    mech.loadoutHelper;
  if (
    !helper ||
    typeof helper.validateMount !==
      "function"
  ) {
    /*
     * Missing native helper should not silently trigger a second,
     * handwritten fitting engine here.
     */
    return Object.freeze({
      valid: true,
      errors: Object.freeze([]),
      raw: null,
      validationUnavailable: true
    });
  }
  try {
    const result =
      helper.validateMount(mount);
    return normalizeValidationResult(
      result
    );
  } catch (error) {
    return Object.freeze({
      valid: false,
      errors: Object.freeze([
        error?.message ??
        String(error)
      ]),
      raw: error
    });
  }
}
export function validateAllNativeMounts(
  mech
) {
  assertNativeMech(mech);
  const mounts =
    getNativeWeaponMounts(mech);
  return Object.freeze(
    mounts.map(
      (mount, mountIndex) =>
        Object.freeze({
          mountIndex,
          ...validateNativeMount(
            mech,
            mount
          )
        })
    )
  );
}
/* ============================================================
   FIND MOUNT CONTAINING WEAPON
   ============================================================ */
/**
 * @section find-mount-containing-weapon
 */
export async function findNativeMountContainingWeapon(
  mech,
  weaponReference
) {
  assertNativeMech(mech);
  const weapon =
    await resolveNativeItem(
      weaponReference
    );
  const mounts =
    getNativeWeaponMounts(mech);
  for (
    let mountIndex = 0;
    mountIndex < mounts.length;
    mountIndex += 1
  ) {
    const mount =
      mounts[mountIndex];
    const slots =
      getNativeMountSlots(mount);
    for (
      let slotIndex = 0;
      slotIndex < slots.length;
      slotIndex += 1
    ) {
      const slotWeapon =
        await resolveNativeSlotWeapon(
          slots[slotIndex],
          { required: false }
        );
      if (
        slotWeapon?.uuid ===
        weapon.uuid
      ) {
        return Object.freeze({
          mountIndex,
          slotIndex,
          mount,
          mountReference:
            await createMountReferenceFromNativeMount(
              mech,
              mountIndex
            ),
          slotReference:
            await createMountSlotReferenceFromNativeSlot(
              mech,
              mountIndex,
              slotIndex
            )
        });
      }
    }
  }
  return null;
}
/* ============================================================
   MOUNT SIGNATURE
   ============================================================ */
/**
 * @section mount-signature
 *
 * Used by persistent configuration to detect when positional native
 * mount identity has changed.
 *
 * This file creates signatures.
 *
 * Configuration services decide what to do when they no longer match.
 */
export async function getNativeMountSignature(
  mech,
  mountIndex
) {
  const reference =
    await createMountReferenceFromNativeMount(
      mech,
      mountIndex
    );
  return Object.freeze({
    mechUuid:
      reference.mechUuid,
    mountIndex:
      reference.mountIndex,
    mountType:
      reference.mountType,
    bracing:
      reference.bracing,
    weaponUuids:
      reference.weaponUuids,
    fittingSizes:
      reference.fittingSizes
  });
}
export async function doesNativeMountReferenceStillMatch(
  mech,
  mountReference
) {
  assertNativeMech(mech);
  if (
    !mountReference ||
    mountReference.mechUuid !==
      mech.uuid ||
    !Number.isInteger(
      mountReference.mountIndex
    )
  ) {
    return false;
  }
  const current =
    await getNativeMountSignature(
      mech,
      mountReference.mountIndex
    );
  const expectedWeapons =
    Array.isArray(
      mountReference.weaponUuids
    )
      ? mountReference.weaponUuids
      : [];
  const expectedFittings =
    Array.isArray(
      mountReference.fittingSizes
    )
      ? mountReference.fittingSizes
      : [];
  return (
    current.mountType ===
      mountReference.mountType &&
    current.bracing ===
      Boolean(
        mountReference.bracing
      ) &&
    current.weaponUuids.length ===
      expectedWeapons.length &&
    current.weaponUuids.every(
      (uuid, index) =>
        uuid ===
        expectedWeapons[index]
    ) &&
    current.fittingSizes.length ===
      expectedFittings.length &&
    current.fittingSizes.every(
      (size, index) =>
        size ===
        expectedFittings[index]
    )
  );
}
/* ============================================================
   EXECUTABLE MOUNT READS
   ============================================================ */
/**
 * @section executable-mount-reads
 *
 * This does NOT implement Skirmish/Barrage legality.
 *
 * It only exposes native mount-state facts useful to those actions.
 */
export async function getNativeMountExecutionSnapshot(
  mech,
  mountIndex
) {
  assertNativeMech(mech);
  const mount =
    getNativeMount(
      mech,
      mountIndex
    );
  if (!mount) {
    return null;
  }
  const validation =
    validateNativeMount(
      mech,
      mount
    );
  const weapons =
    await getNativeMountWeapons(
      mech,
      mountIndex
    );
  return Object.freeze({
    mountIndex,
    reference:
      await createMountReferenceFromNativeMount(
        mech,
        mountIndex
      ),
    type:
      getNativeMountType(
        mount
      ),
    bracing:
      isNativeBracingMount(
        mount
      ),
    empty:
      weapons.length === 0,
    validation,
    weapons
  });
}
export async function enumerateNativeMountExecutionSnapshots(
  mech
) {
  assertNativeMech(mech);
  const mounts =
    getNativeWeaponMounts(mech);
  const results = [];
  for (
    let mountIndex = 0;
    mountIndex < mounts.length;
    mountIndex += 1
  ) {
    results.push(
      await getNativeMountExecutionSnapshot(
        mech,
        mountIndex
      )
    );
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   MOUNTED SYSTEM RESOLUTION
   ============================================================ */
/**
 * @section mounted-system-resolution
 */
export async function resolveNativeMountedSystems(
  mech
) {
  assertNativeMech(mech);
  const references =
    getNativeMountedSystemReferences(
      mech
    );
  const systems = [];
  for (const reference of references) {
    const system =
      await resolveEmbeddedItemReference(
        reference,
        { required: false }
      );
    if (!system) {
      continue;
    }
    systems.push(system);
  }
  return Object.freeze(
    systems
  );
}
export async function getNativeMountedSystemReferencesResolved(
  mech
) {
  const systems =
    await resolveNativeMountedSystems(
      mech
    );
  return Object.freeze(
    systems.map(
      system =>
        createItemReferenceFromNativeItem(
          system
        )
    )
  );
}
/* ============================================================
   FINAL LOADOUT CONTENT
   ============================================================ */
/**
 * @section final-loadout-content
 *
 * Combat authority is the final native actor loadout.
 *
 * Do not reconstruct this from:
 *
 * - Frame mount prose
 * - Core Bonus prose
 * - COMP/CON packed data
 */
export async function getNativeLoadoutSnapshot(
  mech
) {
  assertNativeMech(mech);
  const mounts =
    await enumerateNativeMountExecutionSnapshots(
      mech
    );
  const systems =
    await getNativeMountedSystemReferencesResolved(
      mech
    );
  return Object.freeze({
    mechUuid:
      mech.uuid,
    mounts,
    systems
  });
}
/* ============================================================
   INTEGRATED MOUNT DISCOVERY
   ============================================================ */
/**
 * @section integrated-mount-discovery
 */
export function findNativeIntegratedMountIndexes(
  mech
) {
  assertNativeMech(mech);
  const mounts =
    getNativeWeaponMounts(mech);
  const results = [];
  for (
    let index = 0;
    index < mounts.length;
    index += 1
  ) {
    if (
      mounts[index]?.type ===
      "Integrated"
    ) {
      results.push(index);
    }
  }
  return Object.freeze(
    results
  );
}
export function findNativeBracingMountIndexes(
  mech
) {
  assertNativeMech(mech);
  const mounts =
    getNativeWeaponMounts(mech);
  const results = [];
  for (
    let index = 0;
    index < mounts.length;
    index += 1
  ) {
    if (
      isNativeBracingMount(
        mounts[index]
      )
    ) {
      results.push(index);
    }
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   LOADOUT HELPER BOUNDARY
   ============================================================ */
/**
 * @section loadout-helper-boundary
 *
 * Native loadout construction belongs to Lancer.
 *
 * Use this only for explicit configuration/rebuild workflows.
 *
 * Do NOT call during ordinary combat execution.
 */
export async function resetNativeMounts(
  mechReference
) {
  const mech =
    await resolveNativeActor(
      mechReference
    );
  assertNativeMech(mech);
  const helper =
    mech.loadoutHelper;
  if (
    !helper ||
    typeof helper.resetMounts !==
      "function"
  ) {
    throw new Error(
      "Native LoadoutHelper.resetMounts() is unavailable."
    );
  }
  return helper.resetMounts();
}
/**
 * Native listLoadout() is useful for compatibility/debug/discovery.
 *
 * Prefer specialized adapter reads for normal Frame Conn runtime.
 */
export function listNativeLoadout(
  mech
) {
  assertNativeMech(mech);
  const helper =
    mech.loadoutHelper;
  if (
    !helper ||
    typeof helper.listLoadout !==
      "function"
  ) {
    return null;
  }
  return helper.listLoadout();
}
/* ============================================================
   LOADOUT CHANGE DETECTION SUPPORT
   ============================================================ */
/**
 * @section loadout-change-detection-support
 *
 * Persistent configuration service can snapshot this value and compare
 * after Actor updates.
 *
 * No lifecycle/event listener is registered here.
 */
export async function createNativeLoadoutSignature(
  mech
) {
  assertNativeMech(mech);
  const mounts =
    getNativeWeaponMounts(mech);
  const mountSignatures = [];
  for (
    let mountIndex = 0;
    mountIndex < mounts.length;
    mountIndex += 1
  ) {
    mountSignatures.push(
      await getNativeMountSignature(
        mech,
        mountIndex
      )
    );
  }
  const systems =
    await resolveNativeMountedSystems(
      mech
    );
  return Object.freeze({
    mechUuid:
      mech.uuid,
    mounts:
      Object.freeze(
        mountSignatures
      ),
    systemUuids:
      Object.freeze(
        systems.map(
          system =>
            system.uuid
        )
      )
  });
}
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature_actions/
 * ----------------
 * Existing Skirmish/Barrage definitions should not inspect:
 *
 * system.loadout.weapon_mounts
 *
 * directly after migration.
 *
 * Intended:
 *
 * feature action
 * → semantic parent executor
 * → native-loadout
 * → native mount selection/validation
 * → native-execution
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Remains higher-level runtime coordinator.
 *
 * It should not understand mount slots or EmbeddedRef internals.
 *
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing mount/loadout access can migrate incrementally behind this
 * file and native-adapter.js.
 *
 *
 * native-items.js
 * ---------------
 * Remains Item/profile/tag authority.
 *
 * native-loadout.js only establishes:
 *
 * where the weapon/system is installed
 * which mount/slot contains it
 * which mod is paired with it
 *
 *
 * weapon-mounts runtime
 * ---------------------
 * Higher semantic mount combat layer should consume:
 *
 * enumerateNativeMountExecutionSnapshots()
 * validateNativeMount()
 * findNativeMountContainingWeapon()
 *
 * Then implement:
 *
 * Skirmish mount grouping
 * Barrage mount grouping
 * same-target-per-mount
 * Superheavy parent semantics
 *
 * Those rules do not belong here.
 *
 *
 * mounted-systems runtime
 * -----------------------
 * actor_owned_feature_registry/ may consume:
 *
 * resolveNativeMountedSystems()
 *
 * to discover executable system actions.
 *
 *
 * persistent Core Bonus configuration
 * -----------------------------------
 * Auto-Stabilizing Hardpoints and other selected-mount features should
 * store a mount reference/signature and use:
 *
 * doesNativeMountReferenceStillMatch()
 *
 * after loadout changes.
 *
 * This file does not decide how reconfiguration occurs.
 *
 *
 * resource_service/
 * -----------------
 * Does not belong here.
 *
 * Mounted-system Limited/counters are Item resources and should flow:
 *
 * native-loadout
 * → native Item
 * → native-resources
 * → resource_service
 *
 *
 * semantic_execution_context/
 * ---------------------------
 * Weapon execution context should receive:
 *
 * mount reference
 * slot reference
 * weapon UUID
 * mod UUID
 * parent action
 *
 * native-loadout provides the native installation relationship.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * The final native Mech loadout is combat authority.
 *
 * INVARIANT 2
 * Mount type, fitting size, and weapon size remain separate concepts.
 *
 * INVARIANT 3
 * Native mounts are nested Actor data and have no stable UUID.
 *
 * INVARIANT 4
 * Native weapons/mods/systems are embedded Items with stable Item
 * identity.
 *
 * INVARIANT 5
 * Persistent mount references must be revalidated after loadout change.
 *
 * INVARIANT 6
 * Native mount validation should be reused rather than duplicated.
 *
 * INVARIANT 7
 * Bracing state comes from mount.bracing.
 *
 * INVARIANT 8
 * This file does not infer a direct Superheavy↔bracing mount pair because
 * native Lancer does not preserve one.
 *
 * INVARIANT 9
 * This file does not implement Skirmish/Barrage.
 *
 * INVARIANT 10
 * This file does not mutate mount topology during normal combat.
 *
 * INVARIANT 11
 * resetNativeMounts() is configuration/rebuild behavior only.
 *
 * INVARIANT 12
 * Mounted weapon/mod context must remain available to downstream
 * execution/context layers.
 */