/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/native_adapter/native-actors.js
 */

/**
 * @file
 * @path main/native_adapter/native-actors.js
 * @module native-actors
 * @layer native-adapter-actors
 * @responsibility resolve-and-read-native-lancer-actor-state
 * @public-boundary false
 * @side-effects native-document-resolution-only
 *
 * @depends-on native-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - extends/generalizes actor access currently performed through
 *   foundry-integration-feature.js and feature-specific code
 * - consumed by native-adapter.js
 * - consumed by native-execution.js
 * - consumed by native-loadout.js
 * - consumed by native-resources.js
 * - consumed by native-combat.js
 * - consumed by semantic_execution_context/*
 * - indirectly consumed by runtime-orchestrator.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - runtime-orchestrator.js remains high-level orchestration
 * - feature_turn/ remains turn-feature composition
 * - feature_movement/ remains movement tracking/composition
 * - feature-registry remains semantic feature registration
 *
 * THIS FILE OWNS:
 * - native Actor resolution
 * - Lancer Actor classification
 * - Pilot <-> Mech relationship resolution
 * - Deployable owner/deployer relationship resolution
 * - normalized actor references
 * - normalized read-only actor state snapshots
 *
 * THIS FILE DOES NOT OWN:
 * - Actor mutation
 * - Heat/HP/resource spending
 * - statuses mutation
 * - action-economy rules
 * - targeting legality
 * - movement legality
 * - damage
 * - rolls
 * - feature discovery
 * - controllerMode / NHP control
 *
 * EDIT CONTRACT:
 * - native Lancer field paths must match traced repository
 * - keep mutation out of this file
 * - prefer native typeguards over inferred actor types
 * - normalize data before exposing it upward
 */

import {
  NATIVE_ACTOR_KIND,
  createNativeActorContext,
  createNativeActorReference
} from "./native-contract.js";

/* ============================================================
   NATIVE FIELD PATH NOTES
   ============================================================ */

/**
 * @section native-field-path-notes
 *
 * Traced native Lancer actor relationships:
 *
 * Pilot:
 *   system.active_mech
 *     SyncUUIDRefField("Actor", MECH)
 *
 * Mech:
 *   system.pilot
 *     SyncUUIDRefField("Actor", PILOT)
 *
 * Deployable:
 *   system.owner
 *   system.deployer
 *
 * SyncUUIDRefField runtime shape:
 *
 * {
 *   id: <uuid>,
 *   status: "resolved" | "missing",
 *   value: <Document> | null
 * }
 *
 * `value` may be non-enumerable.
 *
 * Traced prepared universal actor fields:
 *
 * system.hull
 * system.agi
 * system.sys
 * system.eng
 * system.armor
 * system.evasion
 * system.edef
 * system.speed
 * system.size
 * system.save
 * system.sensor_range
 * system.tech_attack
 * system.statuses
 * system.resistances
 *
 * Pilot:
 * system.grit
 * system.mounted
 *
 * Mech:
 * system.heat
 * system.structure
 * system.stress
 * system.repairs
 * system.core_energy
 * system.core_active
 * system.action_tracker
 */

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

/**
 * @section private-helpers
 * @purpose isolate-native-document-shape-and-resolution-details
 */

function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object"
  );
}

function isNativeActorDocument(value) {
  return Boolean(
    isObject(value) &&
    typeof value.uuid === "string" &&
    (
      typeof value.is_pilot === "function" ||
      typeof value.is_mech === "function" ||
      typeof value.is_npc === "function" ||
      typeof value.is_deployable === "function"
    )
  );
}

function isTokenDocument(value) {
  return Boolean(
    isObject(value) &&
    value.actor &&
    (
      value.documentName === "Token" ||
      value.constructor?.name === "TokenDocument"
    )
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

  if (typeof reference.id === "string") {
    return reference.id;
  }

  return null;
}

function assertNativeActor(actor, label = "actor") {
  if (!isNativeActorDocument(actor)) {
    throw new TypeError(
      `${label} is not a native Lancer Actor.`
    );
  }

  return actor;
}

function readNumber(value, fallback = 0) {
  return Number.isFinite(value)
    ? value
    : fallback;
}

function readNullableNumber(value) {
  return Number.isFinite(value)
    ? value
    : null;
}

function freezeBoundedNumber(value) {
  if (!isObject(value)) {
    return null;
  }

  return Object.freeze({
    value: readNumber(value.value, 0),
    min: readNumber(value.min, 0),
    max: readNumber(value.max, 0)
  });
}

function freezeRecord(record) {
  if (!isObject(record)) {
    return Object.freeze({});
  }

  return Object.freeze({
    ...record
  });
}

/**
 * Resolve a prepared SyncUUIDRefField.
 *
 * No document lookup is required when `status === "resolved"`.
 */
function getResolvedSyncReferenceValue(reference) {
  if (
    reference?.status === "resolved" &&
    reference.value
  ) {
    return reference.value;
  }

  return null;
}

/**
 * Retrieve the UUID stored by a SyncUUIDRefField shell.
 *
 * Native field uses `id` for the stored UUID.
 */
function getSyncReferenceUuid(reference) {
  if (!reference) {
    return null;
  }

  if (typeof reference.id === "string") {
    return reference.id;
  }

  if (typeof reference.value?.uuid === "string") {
    return reference.value.uuid;
  }

  return null;
}

/* ============================================================
   ACTOR RESOLUTION
   ============================================================ */

/**
 * @section actor-resolution
 * @purpose turn-native-actor-or-uuid-inputs-into-authoritative-lancer-actors
 */

/**
 * Resolve a native Lancer Actor.
 *
 * Accepts:
 * - native Actor document
 * - TokenDocument
 * - UUID string
 * - normalized NativeActorReference
 *
 * Uses Foundry's native `fromUuid`.
 *
 * Does not display notifications.
 */
export async function resolveNativeActor(
  reference,
  {
    required = true
  } = {}
) {
  if (isNativeActorDocument(reference)) {
    return reference;
  }

  if (isTokenDocument(reference)) {
    const actor = reference.actor;

    if (isNativeActorDocument(actor)) {
      return actor;
    }
  }

  const uuid = getReferenceUuid(reference);

  if (!uuid) {
    if (required) {
      throw new TypeError(
        "resolveNativeActor requires an Actor, TokenDocument, or Actor UUID."
      );
    }

    return null;
  }

  if (typeof globalThis.fromUuid !== "function") {
    throw new Error(
      "Foundry fromUuid() is unavailable."
    );
  }

  let document = await globalThis.fromUuid(uuid);

  if (isTokenDocument(document)) {
    document = document.actor;
  }

  if (!document) {
    if (required) {
      throw new Error(
        `Native Actor not found: ${uuid}`
      );
    }

    return null;
  }

  if (!isNativeActorDocument(document)) {
    if (required) {
      throw new TypeError(
        `Document is not a native Lancer Actor: ${uuid}`
      );
    }

    return null;
  }

  return document;
}

/**
 * Synchronous Actor resolution.
 *
 * Use only where synchronous native resolution is required.
 */
export function resolveNativeActorSync(
  reference,
  {
    required = true
  } = {}
) {
  if (isNativeActorDocument(reference)) {
    return reference;
  }

  if (isTokenDocument(reference)) {
    const actor = reference.actor;

    if (isNativeActorDocument(actor)) {
      return actor;
    }
  }

  const uuid = getReferenceUuid(reference);

  if (!uuid) {
    if (required) {
      throw new TypeError(
        "resolveNativeActorSync requires an Actor, TokenDocument, or Actor UUID."
      );
    }

    return null;
  }

  if (typeof globalThis.fromUuidSync !== "function") {
    throw new Error(
      "Foundry fromUuidSync() is unavailable."
    );
  }

  let document = globalThis.fromUuidSync(uuid);

  if (isTokenDocument(document)) {
    document = document.actor;
  }

  if (!document) {
    if (required) {
      throw new Error(
        `Native Actor not found: ${uuid}`
      );
    }

    return null;
  }

  if (!isNativeActorDocument(document)) {
    if (required) {
      throw new TypeError(
        `Document is not a native Lancer Actor: ${uuid}`
      );
    }

    return null;
  }

  return document;
}

/* ============================================================
   ACTOR CLASSIFICATION
   ============================================================ */

/**
 * @section actor-classification
 * @purpose expose-native-lancer-typeguards-through-stable-frame-conn-api
 */

export function isNativePilot(actor) {
  return Boolean(
    actor?.is_pilot?.()
  );
}

export function isNativeMech(actor) {
  return Boolean(
    actor?.is_mech?.()
  );
}

export function isNativeNpc(actor) {
  return Boolean(
    actor?.is_npc?.()
  );
}

export function isNativeDeployable(actor) {
  return Boolean(
    actor?.is_deployable?.()
  );
}

export function getNativeActorKind(actor) {
  assertNativeActor(actor);

  if (actor.is_pilot()) {
    return NATIVE_ACTOR_KIND.PILOT;
  }

  if (actor.is_mech()) {
    return NATIVE_ACTOR_KIND.MECH;
  }

  if (actor.is_npc()) {
    return NATIVE_ACTOR_KIND.NPC;
  }

  if (actor.is_deployable()) {
    return NATIVE_ACTOR_KIND.DEPLOYABLE;
  }

  return NATIVE_ACTOR_KIND.OTHER;
}

/* ============================================================
   NORMALIZED ACTOR REFERENCES
   ============================================================ */

/**
 * @section normalized-actor-references
 * @purpose translate-native-documents-into-native-contract-references
 */

export function createActorReferenceFromNativeActor(actor) {
  assertNativeActor(actor);

  return createNativeActorReference({
    uuid: actor.uuid,
    id: actor.id ?? null,
    name: actor.name ?? null,
    kind: getNativeActorKind(actor),
    native: actor
  });
}

export async function resolveNativeActorReference(reference) {
  const actor = await resolveNativeActor(reference);

  return createActorReferenceFromNativeActor(actor);
}

/* ============================================================
   PILOT <-> MECH RELATIONSHIPS
   ============================================================ */

/**
 * @section pilot-mech-relationships
 *
 * Native authority:
 *
 * Pilot:
 *   system.active_mech
 *
 * Mech:
 *   system.pilot
 *
 * Do not derive this relationship from names, ownership, token
 * proximity, or actor collections when the native refs exist.
 */

/**
 * Resolve a Pilot's currently active Mech.
 */
export async function resolveActiveMechForPilot(
  pilotReference,
  {
    required = false
  } = {}
) {
  const pilot = await resolveNativeActor(
    pilotReference
  );

  if (!pilot.is_pilot()) {
    throw new TypeError(
      "resolveActiveMechForPilot requires a Pilot actor."
    );
  }

  const nativeRef =
    pilot.system?.active_mech ?? null;

  const alreadyResolved =
    getResolvedSyncReferenceValue(nativeRef);

  if (alreadyResolved?.is_mech?.()) {
    return alreadyResolved;
  }

  const uuid =
    getSyncReferenceUuid(nativeRef);

  if (!uuid) {
    if (required) {
      throw new Error(
        `Pilot ${pilot.name ?? pilot.uuid} has no active Mech.`
      );
    }

    return null;
  }

  const mech = await resolveNativeActor(
    uuid,
    { required }
  );

  if (!mech) {
    return null;
  }

  if (!mech.is_mech()) {
    throw new TypeError(
      `Pilot active_mech does not resolve to a Mech: ${uuid}`
    );
  }

  return mech;
}

/**
 * Resolve the Pilot assigned to a Mech.
 */
export async function resolvePilotForMech(
  mechReference,
  {
    required = false
  } = {}
) {
  const mech = await resolveNativeActor(
    mechReference
  );

  if (!mech.is_mech()) {
    throw new TypeError(
      "resolvePilotForMech requires a Mech actor."
    );
  }

  const nativeRef =
    mech.system?.pilot ?? null;

  const alreadyResolved =
    getResolvedSyncReferenceValue(nativeRef);

  if (alreadyResolved?.is_pilot?.()) {
    return alreadyResolved;
  }

  const uuid =
    getSyncReferenceUuid(nativeRef);

  if (!uuid) {
    if (required) {
      throw new Error(
        `Mech ${mech.name ?? mech.uuid} has no assigned Pilot.`
      );
    }

    return null;
  }

  const pilot = await resolveNativeActor(
    uuid,
    { required }
  );

  if (!pilot) {
    return null;
  }

  if (!pilot.is_pilot()) {
    throw new TypeError(
      `Mech pilot reference does not resolve to a Pilot: ${uuid}`
    );
  }

  return pilot;
}

/**
 * Check whether the supplied Mech is the Pilot's native active Mech.
 *
 * Uses UUID identity.
 */
export async function isActiveMechForPilot(
  pilotReference,
  mechReference
) {
  const [
    pilot,
    mech
  ] = await Promise.all([
    resolveNativeActor(pilotReference),
    resolveNativeActor(mechReference)
  ]);

  if (!pilot.is_pilot()) {
    return false;
  }

  if (!mech.is_mech()) {
    return false;
  }

  const activeMech =
    await resolveActiveMechForPilot(
      pilot,
      { required: false }
    );

  return Boolean(
    activeMech &&
    activeMech.uuid === mech.uuid
  );
}

/**
 * Check both native linkage directions.
 *
 * Useful for execution contexts that require the Pilot and Mech
 * to agree about their relationship.
 */
export async function hasMutualPilotMechLink(
  pilotReference,
  mechReference
) {
  const [
    pilot,
    mech
  ] = await Promise.all([
    resolveNativeActor(pilotReference),
    resolveNativeActor(mechReference)
  ]);

  if (
    !pilot.is_pilot() ||
    !mech.is_mech()
  ) {
    return false;
  }

  const [
    activeMech,
    assignedPilot
  ] = await Promise.all([
    resolveActiveMechForPilot(
      pilot,
      { required: false }
    ),
    resolvePilotForMech(
      mech,
      { required: false }
    )
  ]);

  return Boolean(
    activeMech?.uuid === mech.uuid &&
    assignedPilot?.uuid === pilot.uuid
  );
}

/* ============================================================
   ACTOR CONTEXT RESOLUTION
   ============================================================ */

/**
 * @section actor-context-resolution
 * @purpose construct-pilot-mech-aware-native-context-without-controller-policy
 */

/**
 * Resolve normalized native actor context.
 *
 * Pilot input:
 *   actor = Pilot
 *   pilot = Pilot
 *   mech = active Mech if available
 *
 * Mech input:
 *   actor = Mech
 *   pilot = assigned Pilot if available
 *   mech = Mech
 *
 * NPC / Deployable:
 *   actor = supplied actor
 *   pilot = null
 *   mech = null
 *
 * ControllerMode does not belong here.
 */
export async function resolveNativeActorContext(
  actorReference
) {
  const actor =
    await resolveNativeActor(actorReference);

  if (actor.is_pilot()) {
    const mech =
      await resolveActiveMechForPilot(
        actor,
        { required: false }
      );

    return createNativeActorContext({
      actor:
        createActorReferenceFromNativeActor(actor),

      pilot:
        createActorReferenceFromNativeActor(actor),

      mech:
        mech
          ? createActorReferenceFromNativeActor(mech)
          : null
    });
  }

  if (actor.is_mech()) {
    const pilot =
      await resolvePilotForMech(
        actor,
        { required: false }
      );

    return createNativeActorContext({
      actor:
        createActorReferenceFromNativeActor(actor),

      pilot:
        pilot
          ? createActorReferenceFromNativeActor(pilot)
          : null,

      mech:
        createActorReferenceFromNativeActor(actor)
    });
  }

  return createNativeActorContext({
    actor:
      createActorReferenceFromNativeActor(actor),

    pilot: null,
    mech: null
  });
}

/* ============================================================
   DEPLOYABLE RELATIONSHIPS
   ============================================================ */

/**
 * @section deployable-relationships
 *
 * Native Deployable fields:
 *
 * system.owner
 * system.deployer
 */

export async function resolveDeployableOwner(
  deployableReference,
  {
    required = false
  } = {}
) {
  const deployable =
    await resolveNativeActor(deployableReference);

  if (!deployable.is_deployable()) {
    throw new TypeError(
      "resolveDeployableOwner requires a Deployable actor."
    );
  }

  return resolveNativeSyncActorReference(
    deployable.system?.owner,
    { required }
  );
}

export async function resolveDeployableDeployer(
  deployableReference,
  {
    required = false
  } = {}
) {
  const deployable =
    await resolveNativeActor(deployableReference);

  if (!deployable.is_deployable()) {
    throw new TypeError(
      "resolveDeployableDeployer requires a Deployable actor."
    );
  }

  return resolveNativeSyncActorReference(
    deployable.system?.deployer,
    { required }
  );
}

/**
 * Resolve any actor-valued SyncUUIDRefField.
 */
export async function resolveNativeSyncActorReference(
  nativeReference,
  {
    required = false
  } = {}
) {
  const resolved =
    getResolvedSyncReferenceValue(nativeReference);

  if (resolved) {
    return assertNativeActor(
      resolved,
      "Resolved SyncUUIDRefField value"
    );
  }

  const uuid =
    getSyncReferenceUuid(nativeReference);

  if (!uuid) {
    if (required) {
      throw new Error(
        "Native Actor reference is empty."
      );
    }

    return null;
  }

  return resolveNativeActor(
    uuid,
    { required }
  );
}

/* ============================================================
   UNIVERSAL DERIVED STATS
   ============================================================ */

/**
 * @section universal-derived-stats
 *
 * These fields are populated by native Lancer actor preparation.
 *
 * Do not recalculate them here.
 */

export function getNativeHase(actor) {
  assertNativeActor(actor);

  return Object.freeze({
    hull:
      readNumber(actor.system?.hull),

    agility:
      readNumber(actor.system?.agi),

    systems:
      readNumber(actor.system?.sys),

    engineering:
      readNumber(actor.system?.eng)
  });
}

export function getNativeHull(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.hull
  );
}

export function getNativeAgility(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.agi
  );
}

export function getNativeSystems(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.sys
  );
}

export function getNativeEngineering(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.eng
  );
}

export function getNativeGrit(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.grit
  );
}

export function getNativeArmor(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.armor
  );
}

export function getNativeEvasion(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.evasion
  );
}

export function getNativeEDefense(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.edef
  );
}

export function getNativeSpeed(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.speed
  );
}

export function getNativeSize(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.size
  );
}

export function getNativeSaveTarget(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.save
  );
}

export function getNativeSensorRange(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.sensor_range
  );
}

export function getNativeTechAttack(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.tech_attack
  );
}

/* ============================================================
   UNIVERSAL DURABILITY STATE
   ============================================================ */

/**
 * @section universal-durability-state
 * @purpose expose-authoritative-native-current-values-without-mutation
 */

export function getNativeHpState(actor) {
  assertNativeActor(actor);

  return freezeBoundedNumber(
    actor.system?.hp
  );
}

export function getNativeOvershieldState(actor) {
  assertNativeActor(actor);

  return freezeBoundedNumber(
    actor.system?.overshield
  );
}

export function getNativeBurn(actor) {
  assertNativeActor(actor);

  return readNumber(
    actor.system?.burn
  );
}

export function getNativeHeatState(actor) {
  assertNativeActor(actor);

  return freezeBoundedNumber(
    actor.system?.heat
  );
}

export function getNativeStructureState(actor) {
  assertNativeActor(actor);

  return freezeBoundedNumber(
    actor.system?.structure
  );
}

export function getNativeStressState(actor) {
  assertNativeActor(actor);

  return freezeBoundedNumber(
    actor.system?.stress
  );
}

export function getNativeRepairsState(actor) {
  assertNativeActor(actor);

  return freezeBoundedNumber(
    actor.system?.repairs
  );
}

/* ============================================================
   MECH CORE STATE
   ============================================================ */

/**
 * @section mech-core-state
 */

export function getNativeCoreEnergy(mech) {
  assertNativeActor(mech);

  if (!mech.is_mech()) {
    throw new TypeError(
      "getNativeCoreEnergy requires a Mech actor."
    );
  }

  return readNumber(
    mech.system?.core_energy
  );
}

export function isNativeCoreActive(mech) {
  assertNativeActor(mech);

  if (!mech.is_mech()) {
    throw new TypeError(
      "isNativeCoreActive requires a Mech actor."
    );
  }

  return Boolean(
    mech.system?.core_active
  );
}

/* ============================================================
   PILOT STATE
   ============================================================ */

/**
 * @section pilot-state
 */

export function isPilotMounted(pilot) {
  assertNativeActor(pilot);

  if (!pilot.is_pilot()) {
    throw new TypeError(
      "isPilotMounted requires a Pilot actor."
    );
  }

  return Boolean(
    pilot.system?.mounted
  );
}

export function getPilotLevel(pilot) {
  assertNativeActor(pilot);

  if (!pilot.is_pilot()) {
    throw new TypeError(
      "getPilotLevel requires a Pilot actor."
    );
  }

  return readNumber(
    pilot.system?.level
  );
}

/* ============================================================
   STATUS / RESISTANCE READS
   ============================================================ */

/**
 * @section status-resistance-reads
 *
 * Native Lancer generates these as derived actor properties.
 *
 * Mutation belongs to native-status.js.
 */

export function getNativeStatuses(actor) {
  assertNativeActor(actor);

  return freezeRecord(
    actor.system?.statuses
  );
}

export function hasNativeStatus(
  actor,
  statusId
) {
  assertNativeActor(actor);

  if (
    typeof statusId !== "string" ||
    statusId.length === 0
  ) {
    return false;
  }

  return Boolean(
    actor.system?.statuses?.[statusId]
  );
}

export function getNativeResistances(actor) {
  assertNativeActor(actor);

  return freezeRecord(
    actor.system?.resistances
  );
}

export function hasNativeResistance(
  actor,
  resistanceType
) {
  assertNativeActor(actor);

  if (
    typeof resistanceType !== "string" ||
    resistanceType.length === 0
  ) {
    return false;
  }

  return Boolean(
    actor.system?.resistances?.[resistanceType]
  );
}

/* ============================================================
   ACTION TRACKER READS
   ============================================================ */

/**
 * @section action-tracker-reads
 *
 * Native schema:
 *
 * system.action_tracker
 * ├── protocol: boolean
 * ├── move: number
 * ├── full: boolean
 * ├── quick: boolean
 * ├── reaction: boolean
 * ├── free: boolean
 * └── used_reactions: string[]
 *
 * Interpretation/spending belongs to action_economy/.
 */

export function getNativeActionTracker(actor) {
  assertNativeActor(actor);

  const tracker =
    actor.system?.action_tracker;

  if (!tracker) {
    return null;
  }

  return Object.freeze({
    protocol:
      Boolean(tracker.protocol),

    move:
      readNumber(tracker.move),

    full:
      Boolean(tracker.full),

    quick:
      Boolean(tracker.quick),

    reaction:
      Boolean(tracker.reaction),

    free:
      Boolean(tracker.free),

    usedReactions:
      Object.freeze(
        Array.isArray(tracker.used_reactions)
          ? [...tracker.used_reactions]
          : []
      )
  });
}

/* ============================================================
   LOADOUT SUMMARY READS
   ============================================================ */

/**
 * @section loadout-summary-reads
 *
 * Detailed mount/system inspection belongs to native-loadout.js.
 *
 * These are only actor-level derived summaries.
 */

export function getNativeMechSpState(mech) {
  assertNativeActor(mech);

  if (!mech.is_mech()) {
    throw new TypeError(
      "getNativeMechSpState requires a Mech actor."
    );
  }

  return freezeBoundedNumber(
    mech.system?.loadout?.sp
  );
}

export function getNativeMechAiCapacity(mech) {
  assertNativeActor(mech);

  if (!mech.is_mech()) {
    throw new TypeError(
      "getNativeMechAiCapacity requires a Mech actor."
    );
  }

  return freezeBoundedNumber(
    mech.system?.loadout?.ai_cap
  );
}

export function getNativeLimitedBonus(mech) {
  assertNativeActor(mech);

  if (!mech.is_mech()) {
    throw new TypeError(
      "getNativeLimitedBonus requires a Mech actor."
    );
  }

  return readNumber(
    mech.system?.loadout?.limited_bonus
  );
}

/* ============================================================
   GENERAL ACTOR SNAPSHOT
   ============================================================ */

/**
 * @section general-actor-snapshot
 * @purpose provide-one-normalized-read-model-for-semantic-context-construction
 */

/**
 * Snapshot only.
 *
 * Do not persist this object as authoritative state.
 * Re-read native Actor state before execution.
 */
export function getNativeActorSnapshot(actor) {
  assertNativeActor(actor);

  const kind =
    getNativeActorKind(actor);

  const snapshot = {
    reference:
      createActorReferenceFromNativeActor(actor),

    kind,

    hase:
      getNativeHase(actor),

    grit:
      getNativeGrit(actor),

    armor:
      getNativeArmor(actor),

    evasion:
      getNativeEvasion(actor),

    eDefense:
      getNativeEDefense(actor),

    speed:
      getNativeSpeed(actor),

    size:
      getNativeSize(actor),

    saveTarget:
      getNativeSaveTarget(actor),

    sensors:
      getNativeSensorRange(actor),

    techAttack:
      getNativeTechAttack(actor),

    hp:
      getNativeHpState(actor),

    overshield:
      getNativeOvershieldState(actor),

    burn:
      getNativeBurn(actor),

    heat:
      getNativeHeatState(actor),

    structure:
      getNativeStructureState(actor),

    stress:
      getNativeStressState(actor),

    repairs:
      getNativeRepairsState(actor),

    statuses:
      getNativeStatuses(actor),

    resistances:
      getNativeResistances(actor),

    actionTracker:
      getNativeActionTracker(actor)
  };

  if (actor.is_pilot()) {
    snapshot.pilot = Object.freeze({
      mounted:
        isPilotMounted(actor),

      level:
        getPilotLevel(actor)
    });
  }

  if (actor.is_mech()) {
    snapshot.mech = Object.freeze({
      coreEnergy:
        getNativeCoreEnergy(actor),

      coreActive:
        isNativeCoreActive(actor),

      sp:
        getNativeMechSpState(actor),

      aiCapacity:
        getNativeMechAiCapacity(actor),

      limitedBonus:
        getNativeLimitedBonus(actor)
    });
  }

  return Object.freeze(snapshot);
}

/* ============================================================
   ACTOR SELECTION HELPERS
   ============================================================ */

/**
 * @section actor-selection-helpers
 * @purpose select-correct-native-mechanical-actor-without-owning-action-legality
 */

/**
 * Return the Mech associated with either:
 *
 * - a Mech Actor
 * - a Pilot's active Mech
 *
 * Returns null when no Mech exists and `required` is false.
 */
export async function resolveMechanicalMech(
  actorReference,
  {
    required = false
  } = {}
) {
  const actor =
    await resolveNativeActor(actorReference);

  if (actor.is_mech()) {
    return actor;
  }

  if (actor.is_pilot()) {
    return resolveActiveMechForPilot(
      actor,
      { required }
    );
  }

  if (required) {
    throw new TypeError(
      "Actor does not resolve to a player Mech context."
    );
  }

  return null;
}

/**
 * Return the Pilot associated with either:
 *
 * - a Pilot Actor
 * - a Mech's assigned Pilot
 */
export async function resolveMechanicalPilot(
  actorReference,
  {
    required = false
  } = {}
) {
  const actor =
    await resolveNativeActor(actorReference);

  if (actor.is_pilot()) {
    return actor;
  }

  if (actor.is_mech()) {
    return resolvePilotForMech(
      actor,
      { required }
    );
  }

  if (required) {
    throw new TypeError(
      "Actor does not resolve to a Pilot context."
    );
  }

  return null;
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * foundry-integration-feature.js
 * ------------------------------
 * Existing Actor resolution/inspection may currently live here.
 *
 * Migration direction:
 *
 * existing callers
 * → native-actors.js
 * → native-adapter.js façade
 *
 * Do not break working integration all at once.
 * Migrate call sites incrementally.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Must not resolve native Pilot/Mech relationships itself.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → semantic_execution_context
 * → native adapter
 * → native-actors
 *
 *
 * feature-contract.js
 * -------------------
 * Remains semantic feature/action authority.
 *
 * NativeActorReference and NativeActorContext are execution-layer
 * references only.
 *
 *
 * feature_turn/
 * -------------
 * May consume:
 *
 * getNativeActionTracker()
 * resolveNativeActorContext()
 *
 * But interpretation/spending belongs to action_economy/.
 *
 *
 * feature_movement/
 * -----------------
 * May consume:
 *
 * getNativeSpeed()
 * getNativeSize()
 * getNativeStatuses()
 *
 * Existing movement tracker remains authoritative for actual spent
 * movement.
 *
 *
 * sensors-feature.js
 * ------------------
 * May consume:
 *
 * getNativeSensorRange()
 * native Actor identity
 *
 * Sensors UI/query code should not directly hardcode
 * system.sensor_range after migration.
 *
 *
 * future NHP controller runtime
 * -----------------------------
 * Native Pilot/Mech relationship resolution belongs here.
 *
 * controllerMode does NOT.
 *
 * controllerMode is supplemental Frame Conn runtime state.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Native typeguards are authoritative for Actor classification.
 *
 * INVARIANT 2
 * Pilot.system.active_mech is authoritative for the Pilot's active
 * Mech relationship.
 *
 * INVARIANT 3
 * Mech.system.pilot is authoritative for the Mech's assigned Pilot.
 *
 * INVARIANT 4
 * Prepared native actor stats are read, never recalculated here.
 *
 * INVARIANT 5
 * This file performs no Actor mutation.
 *
 * INVARIANT 6
 * Action-tracker values are exposed but not interpreted/spent here.
 *
 * INVARIANT 7
 * Status/resistance state is exposed but not mutated here.
 *
 * INVARIANT 8
 * Native resource values may be read here for context snapshots;
 * resource mutation belongs to native-resources.js.
 *
 * INVARIANT 9
 * Actor snapshots are non-authoritative and must be re-resolved before
 * execution.
 *
 * INVARIANT 10
 * NHP controller state, Jockey state, pathfinding state, frequency
 * state, and other supplemental runtime state do not belong here.
 */