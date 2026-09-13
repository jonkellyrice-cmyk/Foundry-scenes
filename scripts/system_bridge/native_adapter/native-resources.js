/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-resources.js
 */
/**
 * @file
 * @path main/native_adapter/native-resources.js
 * @module native-resources
 * @layer native-adapter-resources
 * @responsibility read-and-mutate-authoritative-native-lancer-resource-state
 * @public-boundary false
 * @side-effects native-document-mutation
 *
 * @depends-on native-contract, native-actors, native-items
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by native-adapter.js
 * - consumed by resource_service/*
 * - consumed by execution_transaction/*
 * - consumed by future actor-owned feature runtime
 * - consumed by NHP cascade/control runtime
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - resource_service/ owns WHEN resources are checked/committed/reset
 * - execution_transaction/ owns precheck -> execute -> commit lifecycle
 * - feature_turn/ remains higher-level turn/action composition
 * - native execution Flows remain authoritative for resources they
 *   already consume themselves
 *
 * THIS FILE OWNS:
 * - native Limited resource reads/writes
 * - native CounterData reads/writes
 * - Core Energy reads/writes
 * - Loading state reads/writes
 * - cascading state reads/writes
 * - generic native numeric resource-path mutation helpers
 *
 * THIS FILE DOES NOT OWN:
 * - action frequency
 * - action economy
 * - reset timing/policy
 * - whether a resource SHOULD be spent
 * - duplicate consumption around native Flows
 * - feature-specific counter semantics
 *
 * EDIT CONTRACT:
 * - preserve authoritative native document paths
 * - native resource mutations go through Foundry document update APIs
 * - do not duplicate resources in Frame Conn state
 * - do not consume native resources already consumed by native Flows
 */
import {
  NATIVE_RESOURCE_KIND,
  createNativeResourceReference
} from "./native-contract.js";
import {
  resolveNativeActor,
  isNativeMech
} from "./native-actors.js";
import {
  resolveNativeItem,
  isNativeLimited,
  getNativeUsesState,
  getNativeLoadedState,
  getNativeCascadingState,
  getNativeItemCounters,
  findNativeCounter
} from "./native-items.js";
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
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
function finiteNumber(value) {
  return Number.isFinite(value);
}
function clamp(
  value,
  min,
  max
) {
  if (finiteNumber(min)) {
    value = Math.max(
      value,
      min
    );
  }
  if (finiteNumber(max)) {
    value = Math.min(
      value,
      max
    );
  }
  return value;
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
function resolveCounterIndex(
  item,
  counterKey
) {
  const counters =
    getNativeItemCounters(item);
  if (!requiredString(counterKey)) {
    return -1;
  }
  return counters.findIndex(
    counter =>
      counter?.lid === counterKey ||
      counter?.name === counterKey
  );
}
function getCounterPath(
  item,
  counterIndex
) {
  if (item.is_mech_weapon?.()) {
    const profileIndex =
      Number.isInteger(
        item.system?.selected_profile_index
      )
        ? item.system.selected_profile_index
        : 0;
    return (
      `system.profiles.${profileIndex}.counters.${counterIndex}`
    );
  }
  return (
    `system.counters.${counterIndex}`
  );
}
/* ============================================================
   GENERIC RESOURCE REFERENCES
   ============================================================ */
/**
 * @section generic-resource-references
 */
export function createNativeLimitedResourceReference(
  item
) {
  const state =
    getNativeUsesState(item);
  if (!state) {
    return null;
  }
  return createNativeResourceReference({
    kind:
      NATIVE_RESOURCE_KIND.LIMITED,
    actorUuid:
      item.actor?.uuid ??
      "",
    itemUuid:
      item.uuid,
    path:
      "system.uses",
    resourceKey:
      "limited",
    current:
      state.value,
    max:
      state.max,
    nativeConsumption:
      true,
    native:
      state
  });
}
export function createNativeLoadedResourceReference(
  item
) {
  const loaded =
    getNativeLoadedState(item);
  if (loaded == null) {
    return null;
  }
  return createNativeResourceReference({
    kind:
      NATIVE_RESOURCE_KIND.LOADED,
    actorUuid:
      item.actor?.uuid ??
      "",
    itemUuid:
      item.uuid,
    path:
      "system.loaded",
    resourceKey:
      "loaded",
    current:
      loaded
        ? 1
        : 0,
    max:
      1,
    nativeConsumption:
      true,
    native:
      loaded
  });
}
export function createNativeCascadingResourceReference(
  item
) {
  const cascading =
    getNativeCascadingState(item);
  if (cascading == null) {
    return null;
  }
  return createNativeResourceReference({
    kind:
      NATIVE_RESOURCE_KIND.CASCADING,
    actorUuid:
      item.actor?.uuid ??
      "",
    itemUuid:
      item.uuid,
    path:
      "system.cascading",
    resourceKey:
      "cascading",
    current:
      cascading
        ? 1
        : 0,
    max:
      1,
    nativeConsumption:
      false,
    native:
      cascading
  });
}
/* ============================================================
   LIMITED
   ============================================================ */
/**
 * @section limited
 *
 * Native attack/system/activation Flows already check and consume
 * Limited resources.
 *
 * resource_service/ should normally:
 *
 * - read/check here
 * - delegate native Flow execution
 * - verify resulting state
 *
 * It should NOT call spendNativeLimited() after a native Flow already
 * consumed the resource.
 */
export async function getNativeLimitedState(
  itemReference
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  const uses =
    getNativeUsesState(item);
  if (!uses) {
    return null;
  }
  return Object.freeze({
    limited:
      isNativeLimited(item),
    value:
      uses.value,
    min:
      uses.min,
    max:
      uses.max,
    itemUuid:
      item.uuid
  });
}
export async function canSpendNativeLimited(
  itemReference,
  cost = 1
) {
  assertFiniteNumber(
    cost,
    "Limited cost"
  );
  const item =
    await resolveNativeItem(
      itemReference
    );
  if (!isNativeLimited(item)) {
    return true;
  }
  const uses =
    getNativeUsesState(item);
  if (!uses) {
    return false;
  }
  return (
    uses.value >= cost
  );
}
/**
 * Direct native Limited mutation.
 *
 * Use only for mechanics whose native Flow does NOT already consume
 * Limited.
 */
export async function spendNativeLimited(
  itemReference,
  cost = 1
) {
  assertFiniteNumber(
    cost,
    "Limited cost"
  );
  if (cost < 0) {
    throw new RangeError(
      "Limited cost cannot be negative."
    );
  }
  const item =
    await resolveNativeItem(
      itemReference
    );
  const uses =
    getNativeUsesState(item);
  if (!uses) {
    throw new Error(
      `${item.name ?? item.uuid} has no native uses state.`
    );
  }
  if (
    uses.value < cost
  ) {
    return Object.freeze({
      succeeded: false,
      reason: "insufficient-resource",
      before: uses.value,
      after: uses.value,
      cost
    });
  }
  const next =
    clamp(
      uses.value - cost,
      uses.min,
      uses.max
    );
  await item.update({
    "system.uses.value":
      next
  });
  return Object.freeze({
    succeeded: true,
    before:
      uses.value,
    after:
      next,
    cost
  });
}
export async function restoreNativeLimited(
  itemReference,
  amount
) {
  assertFiniteNumber(
    amount,
    "Limited restore amount"
  );
  const item =
    await resolveNativeItem(
      itemReference
    );
  const uses =
    getNativeUsesState(item);
  if (!uses) {
    throw new Error(
      `${item.name ?? item.uuid} has no native uses state.`
    );
  }
  const next =
    clamp(
      uses.value + amount,
      uses.min,
      uses.max
    );
  await item.update({
    "system.uses.value":
      next
  });
  return Object.freeze({
    before:
      uses.value,
    after:
      next,
    restored:
      next - uses.value
  });
}
/**
 * Configuration/recovery helper only.
 *
 * resource_service/ decides when this is legal.
 */
export async function setNativeLimitedToMax(
  itemReference
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  const uses =
    getNativeUsesState(item);
  if (!uses) {
    throw new Error(
      `${item.name ?? item.uuid} has no native uses state.`
    );
  }
  await item.update({
    "system.uses.value":
      uses.max
  });
  return Object.freeze({
    before:
      uses.value,
    after:
      uses.max
  });
}
/* ============================================================
   LOADED
   ============================================================ */
/**
 * @section loaded
 */
export async function isNativeLoaded(
  itemReference
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  return getNativeLoadedState(
    item
  );
}
export async function setNativeLoaded(
  itemReference,
  loaded
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  if (
    typeof loaded !== "boolean"
  ) {
    throw new TypeError(
      "setNativeLoaded requires boolean loaded."
    );
  }
  const before =
    getNativeLoadedState(item);
  if (before == null) {
    throw new Error(
      `${item.name ?? item.uuid} has no native loaded state.`
    );
  }
  if (before === loaded) {
    return Object.freeze({
      changed: false,
      before,
      after: loaded
    });
  }
  await item.update({
    "system.loaded":
      loaded
  });
  return Object.freeze({
    changed: true,
    before,
    after: loaded
  });
}
export async function reloadNativeItem(
  itemReference
) {
  return setNativeLoaded(
    itemReference,
    true
  );
}
export async function unloadNativeItem(
  itemReference
) {
  return setNativeLoaded(
    itemReference,
    false
  );
}
/* ============================================================
   CORE ENERGY
   ============================================================ */
/**
 * @section core-energy
 *
 * Native CoreActiveFlow already consumes Core Energy.
 *
 * Direct mutation here is for:
 *
 * - restoration mechanics
 * - explicit native-state correction
 * - recovery/full-repair adapters
 *
 * Do not double-consume after CoreActiveFlow.
 */
export async function getNativeCoreEnergyState(
  mechReference
) {
  const mech =
    await resolveNativeActor(
      mechReference
    );
  if (!isNativeMech(mech)) {
    throw new TypeError(
      "getNativeCoreEnergyState requires a Mech."
    );
  }
  return Object.freeze({
    value:
      Number.isFinite(
        mech.system?.core_energy
      )
        ? mech.system.core_energy
        : 0,
    max: 1
  });
}
export async function setNativeCoreEnergy(
  mechReference,
  value
) {
  const mech =
    await resolveNativeActor(
      mechReference
    );
  if (!isNativeMech(mech)) {
    throw new TypeError(
      "setNativeCoreEnergy requires a Mech."
    );
  }
  assertFiniteNumber(
    value,
    "Core Energy"
  );
  const before =
    Number.isFinite(
      mech.system?.core_energy
    )
      ? mech.system.core_energy
      : 0;
  const next =
    clamp(
      value,
      0,
      1
    );
  await mech.update({
    "system.core_energy":
      next
  });
  return Object.freeze({
    before,
    after:
      next
  });
}
export async function restoreNativeCoreEnergy(
  mechReference
) {
  return setNativeCoreEnergy(
    mechReference,
    1
  );
}
export async function consumeNativeCoreEnergy(
  mechReference
) {
  return setNativeCoreEnergy(
    mechReference,
    0
  );
}
/* ============================================================
   COUNTER DATA
   ============================================================ */
/**
 * @section counter-data
 *
 * Native CounterData storage is authoritative.
 *
 * Counter semantics remain feature-specific and belong above this file.
 */
export async function getNativeCounterState(
  itemReference,
  counterKey
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  const index =
    resolveCounterIndex(
      item,
      counterKey
    );
  if (index < 0) {
    return null;
  }
  const counter =
    getNativeItemCounters(item)[index];
  return Object.freeze({
    itemUuid:
      item.uuid,
    counterKey,
    index,
    name:
      counter?.name ??
      null,
    lid:
      counter?.lid ??
      null,
    value:
      Number.isFinite(
        counter?.value
      )
        ? counter.value
        : 0,
    min:
      Number.isFinite(
        counter?.min
      )
        ? counter.min
        : null,
    max:
      Number.isFinite(
        counter?.max
      )
        ? counter.max
        : null,
    defaultValue:
      Number.isFinite(
        counter?.default_value
      )
        ? counter.default_value
        : null,
    path:
      getCounterPath(
        item,
        index
      )
  });
}
export async function setNativeCounterValue(
  itemReference,
  counterKey,
  value
) {
  assertFiniteNumber(
    value,
    "Counter value"
  );
  const item =
    await resolveNativeItem(
      itemReference
    );
  const index =
    resolveCounterIndex(
      item,
      counterKey
    );
  if (index < 0) {
    throw new Error(
      `Counter not found: ${counterKey}`
    );
  }
  const counter =
    getNativeItemCounters(item)[index];
  const before =
    Number.isFinite(
      counter?.value
    )
      ? counter.value
      : 0;
  const min =
    Number.isFinite(
      counter?.min
    )
      ? counter.min
      : null;
  const max =
    Number.isFinite(
      counter?.max
    )
      ? counter.max
      : null;
  const next =
    clamp(
      value,
      min,
      max
    );
  const path =
    `${getCounterPath(
      item,
      index
    )}.value`;
  await item.update({
    [path]:
      next
  });
  return Object.freeze({
    itemUuid:
      item.uuid,
    counterKey,
    before,
    after:
      next
  });
}
export async function incrementNativeCounter(
  itemReference,
  counterKey,
  amount = 1
) {
  assertFiniteNumber(
    amount,
    "Counter increment"
  );
  const state =
    await getNativeCounterState(
      itemReference,
      counterKey
    );
  if (!state) {
    throw new Error(
      `Counter not found: ${counterKey}`
    );
  }
  return setNativeCounterValue(
    itemReference,
    counterKey,
    state.value + amount
  );
}
export async function decrementNativeCounter(
  itemReference,
  counterKey,
  amount = 1
) {
  assertFiniteNumber(
    amount,
    "Counter decrement"
  );
  const state =
    await getNativeCounterState(
      itemReference,
      counterKey
    );
  if (!state) {
    throw new Error(
      `Counter not found: ${counterKey}`
    );
  }
  return setNativeCounterValue(
    itemReference,
    counterKey,
    state.value - amount
  );
}
export async function canSpendNativeCounter(
  itemReference,
  counterKey,
  amount = 1
) {
  assertFiniteNumber(
    amount,
    "Counter cost"
  );
  const state =
    await getNativeCounterState(
      itemReference,
      counterKey
    );
  if (!state) {
    return false;
  }
  const minimum =
    state.min ??
    0;
  return (
    state.value - amount >=
    minimum
  );
}
export async function resetNativeCounter(
  itemReference,
  counterKey
) {
  const state =
    await getNativeCounterState(
      itemReference,
      counterKey
    );
  if (!state) {
    throw new Error(
      `Counter not found: ${counterKey}`
    );
  }
  if (
    state.defaultValue == null
  ) {
    throw new Error(
      `Counter ${counterKey} has no native default_value.`
    );
  }
  return setNativeCounterValue(
    itemReference,
    counterKey,
    state.defaultValue
  );
}
/* ============================================================
   COUNTER RESOURCE REFERENCE
   ============================================================ */
export async function createNativeCounterResourceReference(
  itemReference,
  counterKey
) {
  const state =
    await getNativeCounterState(
      itemReference,
      counterKey
    );
  if (!state) {
    return null;
  }
  const item =
    await resolveNativeItem(
      itemReference
    );
  return createNativeResourceReference({
    kind:
      NATIVE_RESOURCE_KIND.COUNTER,
    actorUuid:
      item.actor?.uuid ??
      "",
    itemUuid:
      item.uuid,
    path:
      state.path,
    resourceKey:
      state.lid ??
      state.name ??
      counterKey,
    current:
      state.value,
    max:
      state.max,
    nativeConsumption:
      false,
    native:
      state
  });
}
/* ============================================================
   CASCADING
   ============================================================ */
/**
 * @section cascading
 *
 * Native item.cascading storage exists.
 *
 * Frame Conn NHP runtime owns:
 *
 * - cascade eligibility
 * - natural-1 gating
 * - controllerMode
 * - Shutdown recovery policy
 *
 * This file only mutates the native field.
 */
export async function isNativeCascading(
  itemReference
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  return getNativeCascadingState(
    item
  );
}
export async function setNativeCascading(
  itemReference,
  cascading
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  if (
    typeof cascading !== "boolean"
  ) {
    throw new TypeError(
      "setNativeCascading requires boolean cascading."
    );
  }
  const before =
    getNativeCascadingState(item);
  if (before == null) {
    throw new Error(
      `${item.name ?? item.uuid} has no native cascading field.`
    );
  }
  if (
    before === cascading
  ) {
    return Object.freeze({
      changed: false,
      before,
      after: cascading
    });
  }
  await item.update({
    "system.cascading":
      cascading
  });
  return Object.freeze({
    changed: true,
    before,
    after:
      cascading
  });
}
/* ============================================================
   GENERIC NUMERIC ACTOR RESOURCE MUTATION
   ============================================================ */
/**
 * @section generic-numeric-actor-resource-mutation
 *
 * Low-level helper for traced native numeric actor resource paths.
 *
 * Higher semantic helpers should be preferred.
 */
export async function setNativeActorNumericResource(
  actorReference,
  path,
  value,
  {
    min = null,
    max = null
  } = {}
) {
  if (!requiredString(path)) {
    throw new TypeError(
      "setNativeActorNumericResource requires a document path."
    );
  }
  assertFiniteNumber(
    value,
    "Actor resource value"
  );
  const actor =
    await resolveNativeActor(
      actorReference
    );
  const next =
    clamp(
      value,
      min,
      max
    );
  await actor.update({
    [path]:
      next
  });
  return next;
}
/* ============================================================
   NATIVE RESOURCE DISCOVERY
   ============================================================ */
/**
 * @section native-resource-discovery
 *
 * Returns only resources represented by native state.
 *
 * ActionData frequency is NOT native resource state and belongs to
 * resource_service/action-frequency adapter.
 */
export async function discoverNativeItemResources(
  itemReference
) {
  const item =
    await resolveNativeItem(
      itemReference
    );
  const resources = [];
  if (isNativeLimited(item)) {
    const limited =
      createNativeLimitedResourceReference(
        item
      );
    if (limited) {
      resources.push(limited);
    }
  }
  const loaded =
    createNativeLoadedResourceReference(
      item
    );
  if (loaded) {
    resources.push(loaded);
  }
  const cascading =
    createNativeCascadingResourceReference(
      item
    );
  if (cascading) {
    resources.push(cascading);
  }
  const counters =
    getNativeItemCounters(item);
  for (const counter of counters) {
    const key =
      counter?.lid ??
      counter?.name;
    if (!requiredString(key)) {
      continue;
    }
    const reference =
      await createNativeCounterResourceReference(
        item,
        key
      );
    if (reference) {
      resources.push(
        reference
      );
    }
  }
  return Object.freeze(
    resources
  );
}
/* ============================================================
   NATIVE CONSUMPTION POLICY NOTES
   ============================================================ */
/**
 * @section native-consumption-policy-notes
 *
 * NATIVE LIMITED
 * --------------
 *
 * WeaponAttackFlow / ActivationFlow / SystemFlow already perform:
 *
 * checkItemLimited(...)
 * → updateItemAfterAction(...)
 * → system.uses.value -= cost
 *
 * Therefore:
 *
 * resource_service
 * → precheck native Limited
 * → invoke native Flow
 * → verify state
 *
 * NOT:
 *
 * native Flow
 * → spendNativeLimited()
 *
 *
 * LOADING
 * -------
 *
 * WeaponAttackFlow already:
 *
 * checks system.loaded
 * → successful attack sets loaded=false
 *
 * Pilot Reload is different:
 *
 * Frame Conn Quick Action
 * → setNativeLoaded(true)
 *
 *
 * CORE ENERGY
 * -----------
 *
 * CoreActiveFlow already consumes native core_energy.
 *
 * Direct mutation here is for recovery or explicit source-specific
 * mechanics such as Universal Compatibility.
 *
 *
 * COUNTERS
 * --------
 *
 * Native CounterData stores state but generic native Flows usually do
 * not understand feature-specific counter semantics.
 *
 * Therefore resource_service may defer counter mutation until successful
 * execution.
 *
 *
 * CASCADING
 * ---------
 *
 * Native CascadeFlow currently has incorrect unconditional mutation.
 *
 * Frame Conn corrected cascade runtime should call:
 *
 * setNativeCascading(true)
 *
 * only on natural 1.
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature_turn/
 * -------------
 * Existing turn/resource presentation should eventually consume
 * resource_service/, not mutate native resources directly.
 *
 *
 * resource_service/
 * -----------------
 * This file is the native-state adapter beneath the generalized resource
 * transaction layer.
 *
 * Intended:
 *
 * resource_service
 * ├── native-limited adapter
 * │   └── native-resources.js
 * ├── native-counter adapter
 * │   └── native-resources.js
 * ├── core-power adapter
 * │   └── native-resources.js
 * ├── action-frequency adapter
 * │   └── Frame Conn state
 * └── supplemental adapter
 *
 *
 * execution_transaction/
 * ----------------------
 * Should:
 *
 * precheck
 * → execute
 * → commit deferred resources
 *
 * It should distinguish:
 *
 * nativeConsumption=true
 * → verify native result only
 *
 * nativeConsumption=false
 * → commit through resource_service
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Must not directly mutate:
 *
 * system.uses.value
 * system.loaded
 * system.core_energy
 * counter.value
 * system.cascading
 *
 * after migration.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 * May discover native resources associated with:
 *
 * Talents
 * Core Bonuses
 * Mech Traits
 * Weapons
 * Mounted Systems
 *
 * using discoverNativeItemResources().
 *
 *
 * nhp-control-cascade runtime
 * ---------------------------
 * Should use:
 *
 * setNativeCascading(...)
 *
 * for native source state.
 *
 * controllerMode remains supplemental Frame Conn state.
 *
 *
 * pilot-actions runtime
 * ---------------------
 * Pilot Reload should use:
 *
 * setNativeLoaded(weapon, true)
 *
 * rather than maintaining separate loaded state.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Native Lancer resource fields remain authoritative.
 *
 * INVARIANT 2
 * This file knows HOW native resource state is read/mutated.
 *
 * INVARIANT 3
 * resource_service/ decides WHEN resource mutation is legal.
 *
 * INVARIANT 4
 * Native Flows remain authoritative for resources they already consume.
 *
 * INVARIANT 5
 * Never double-consume Limited after native execution.
 *
 * INVARIANT 6
 * Never double-unload Loading weapons after native attack execution.
 *
 * INVARIANT 7
 * Never double-consume Core Energy after CoreActiveFlow.
 *
 * INVARIANT 8
 * CounterData is native storage even when Frame Conn supplies semantics.
 *
 * INVARIANT 9
 * Action frequency is not represented here.
 *
 * INVARIANT 10
 * Reset/recovery timing is not represented here.
 *
 * INVARIANT 11
 * cascading mutation is native state; NHP controller state is not.
 *
 * INVARIANT 12
 * Direct mutation helpers are lower-level primitives and should normally
 * be reached through resource_service/.
 */