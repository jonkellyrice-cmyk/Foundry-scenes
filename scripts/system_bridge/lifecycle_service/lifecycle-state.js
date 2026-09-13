/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/lifecycle_service/lifecycle-state.js
 */
/**
 * @file
 * @path main/lifecycle_service/lifecycle-state.js
 * @module lifecycle-state
 * @layer lifecycle-service-state
 * @responsibility store-normalize-and-query-frame-conn-lifecycle-managed-state
 * @public-boundary false
 * @side-effects lifecycle-state-storage-through-injected-adapter
 *
 * @depends-on
 * - lifecycle-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by lifecycle-dispatcher.js
 * - consumed indirectly by lifecycle-hooks.js
 * - consumed by lifecycle-service.js
 * - stores Frame Conn lifecycle metadata for:
 *   - temporary effects
 *   - expirations
 *   - reset descriptors
 *   - relative turn/round origins
 * - does not replace feature_turn/
 * - does not replace resource_service/
 * - does not replace action_economy/
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature_turn/ remains turn-state authority
 * - action_economy/ remains action-economy state authority
 * - resource_service/ remains resource-state authority
 * - native_adapter/ remains native Lancer state authority
 * - lifecycle_service stores only lifecycle ownership/timing metadata
 *
 * THIS FILE OWNS:
 * - lifecycle descriptor persistence adapter
 * - lifecycle managed-entry shape normalization
 * - origin lifecycle snapshot
 * - expiration/reset registration state
 * - active/inactive lifecycle entry state
 * - lifecycle descriptor lookup
 * - actor/source/subject indexing helpers
 * - lifecycle state diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - actual status removal
 * - resource reset mutation
 * - action economy reset mutation
 * - native document mutation
 * - lifecycle boundary detection
 * - semantic event dispatch
 * - feature-specific rules
 *
 * EDIT CONTRACT:
 * - no direct Foundry flag/document paths
 * - persistence is injected
 * - lifecycle state stores timing metadata only
 * - do not duplicate resource/action/status authority
 * - preserve origin turn/round identity for relative expirations
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  LIFECYCLE_AUTHORITY,
  LIFECYCLE_BOUNDARY,
  LIFECYCLE_SCOPE,
  LIFECYCLE_SUBJECT_KIND,
  createLifecycleEffectDescriptor,
  createLifecycleExpirationDescriptor,
  createLifecycleResetDescriptor
} from "./lifecycle-contract.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const LIFECYCLE_STATE_MODULE_ID =
  "lancer-frame-conn.lifecycle-state";
export const LIFECYCLE_STATE_MODULE_VERSION =
  1;
/* ============================================================
   MANAGED ENTRY STATUS
   ============================================================ */
/**
 * @section managed-entry-status
 */
export const LIFECYCLE_ENTRY_STATUS =
  Object.freeze({
    ACTIVE:
      "active",
    EXPIRED:
      "expired",
    RESET:
      "reset",
    DISABLED:
      "disabled",
    REMOVED:
      "removed"
  });
/* ============================================================
   STATE ADAPTER
   ============================================================ */
/**
 * @section state-adapter
 *
 * Lifecycle storage is intentionally injected.
 *
 * Required interface:
 *
 * {
 *   read(actorReference) =>
 *     LifecycleState | null | Promise<LifecycleState | null>
 *
 *   write(actorReference, state, options?) =>
 *     any | Promise<any>
 * }
 *
 * Optional:
 *
 * {
 *   clear(actorReference, options?)
 * }
 *
 * Future implementation may use:
 *
 * Foundry flags
 * actor document data
 * dedicated Frame Conn runtime persistence
 *
 * Storage path does not belong in this module.
 */
let lifecycleStateAdapter =
  null;
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
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
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function freezeObject(value) {
  return Object.freeze({
    ...(isObject(value)
      ? value
      : {})
  });
}
function createLifecycleEntryId(
  descriptor
) {
  return (
    descriptor?.id ??
    `lifecycle-entry-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
  );
}
/* ============================================================
   STATE ADAPTER CONFIGURATION
   ============================================================ */
export function setLifecycleStateAdapter(
  adapter
) {
  if (adapter == null) {
    lifecycleStateAdapter =
      null;
    return true;
  }
  if (!isObject(adapter)) {
    throw new TypeError(
      "Lifecycle state adapter must be object or null."
    );
  }
  if (
    typeof adapter.read !==
      "function"
  ) {
    throw new TypeError(
      "Lifecycle state adapter requires read()."
    );
  }
  if (
    typeof adapter.write !==
      "function"
  ) {
    throw new TypeError(
      "Lifecycle state adapter requires write()."
    );
  }
  lifecycleStateAdapter =
    adapter;
  return true;
}
export function getLifecycleStateAdapter() {
  return lifecycleStateAdapter;
}
export function hasLifecycleStateAdapter() {
  return Boolean(
    lifecycleStateAdapter &&
    typeof lifecycleStateAdapter.read ===
      "function" &&
    typeof lifecycleStateAdapter.write ===
      "function"
  );
}
export function assertLifecycleStateAdapter() {
  if (!hasLifecycleStateAdapter()) {
    throw new Error(
      "Lifecycle service requires a configured lifecycle state adapter."
    );
  }
  return lifecycleStateAdapter;
}
/* ============================================================
   ORIGIN SNAPSHOT
   ============================================================ */
/**
 * @section origin-snapshot
 *
 * Captures lifecycle position when descriptor was registered.
 *
 * Required to resolve:
 *
 * end of this turn
 * end of next turn
 * end of next round
 */
export function createLifecycleOriginSnapshot({
  actorUuid = null,
  sceneId = null,
  combatId = null,
  turnId = null,
  turnIndex = null,
  round = null,
  executionId = null,
  timestamp =
    Date.now(),
  metadata = {}
} = {}) {
  return Object.freeze({
    actorUuid,
    sceneId,
    combatId,
    turnId,
    turnIndex:
      finiteNumber(turnIndex)
        ? turnIndex
        : null,
    round:
      finiteNumber(round)
        ? round
        : null,
    executionId,
    timestamp,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   MANAGED LIFECYCLE ENTRY
   ============================================================ */
/**
 * @section managed-lifecycle-entry
 *
 * Canonical persisted timing record.
 *
 * Descriptor contains semantic timing.
 * Origin records when timing began.
 */
export function createLifecycleManagedEntry({
  id = null,
  descriptor,
  actorUuid = null,
  origin = null,
  status =
    LIFECYCLE_ENTRY_STATUS.ACTIVE,
  createdAt =
    Date.now(),
  updatedAt =
    Date.now(),
  metadata = {}
} = {}) {
  if (!descriptor) {
    throw new TypeError(
      "Lifecycle managed entry requires descriptor."
    );
  }
  if (
    !Object
      .values(
        LIFECYCLE_ENTRY_STATUS
      )
      .includes(status)
  ) {
    throw new TypeError(
      `Invalid lifecycle entry status: ${String(status)}`
    );
  }
  return Object.freeze({
    id:
      id ??
      createLifecycleEntryId(
        descriptor
      ),
    actorUuid:
      actorUuid ??
      descriptor.actorUuid ??
      descriptor.targetActorUuid ??
      null,
    descriptor,
    origin:
      origin ??
      createLifecycleOriginSnapshot({
        actorUuid:
          actorUuid ??
          descriptor.actorUuid ??
          descriptor.targetActorUuid ??
          null
      }),
    status,
    createdAt,
    updatedAt,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   LIFECYCLE STATE
   ============================================================ */
/**
 * @section lifecycle-state
 *
 * Stored per actor/reference by injected adapter.
 */
export function createLifecycleState({
  version =
    LIFECYCLE_STATE_MODULE_VERSION,
  entries = [],
  metadata = {}
} = {}) {
  return Object.freeze({
    version,
    entries:
      freezeArray(
        entries
      ),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   RAW STATE READ
   ============================================================ */
export async function readRawLifecycleState(
  actorReference
) {
  const adapter =
    assertLifecycleStateAdapter();
  return adapter.read(
    actorReference
  );
}
/* ============================================================
   NORMALIZED STATE READ
   ============================================================ */
export async function readLifecycleState(
  actorReference
) {
  const raw =
    await readRawLifecycleState(
      actorReference
    );
  if (!raw) {
    return createLifecycleState();
  }
  return createLifecycleState({
    version:
      raw.version ??
      LIFECYCLE_STATE_MODULE_VERSION,
    entries:
      raw.entries ??
      [],
    metadata:
      raw.metadata ??
      {}
  });
}
/* ============================================================
   STATE WRITE
   ============================================================ */
export async function writeLifecycleState(
  actorReference,
  state,
  options = {}
) {
  if (!state) {
    throw new TypeError(
      "writeLifecycleState requires state."
    );
  }
  const adapter =
    assertLifecycleStateAdapter();
  await adapter.write(
    actorReference,
    state,
    options
  );
  return readLifecycleState(
    actorReference
  );
}
/* ============================================================
   STATE CLEAR
   ============================================================ */
export async function clearLifecycleState(
  actorReference,
  options = {}
) {
  const adapter =
    assertLifecycleStateAdapter();
  if (
    typeof adapter.clear ===
    "function"
  ) {
    await adapter.clear(
      actorReference,
      options
    );
  } else {
    await adapter.write(
      actorReference,
      createLifecycleState(),
      {
        ...options,
        reason:
          options.reason ??
          "clear-lifecycle-state"
      }
    );
  }
  return createLifecycleState();
}
/* ============================================================
   ENTRY NORMALIZATION
   ============================================================ */
/**
 * @section entry-normalization
 */
export function normalizeLifecycleManagedEntry(
  entry
) {
  if (!entry) {
    return null;
  }
  return createLifecycleManagedEntry({
    id:
      entry.id,
    descriptor:
      entry.descriptor,
    actorUuid:
      entry.actorUuid,
    origin:
      entry.origin,
    status:
      entry.status ??
      LIFECYCLE_ENTRY_STATUS.ACTIVE,
    createdAt:
      entry.createdAt ??
      Date.now(),
    updatedAt:
      entry.updatedAt ??
      Date.now(),
    metadata:
      entry.metadata ??
      {}
  });
}
/* ============================================================
   REGISTER ENTRY
   ============================================================ */
/**
 * @section register-entry
 */
export async function registerLifecycleEntry(
  actorReference,
  descriptor,
  {
    origin = null,
    metadata = {}
  } = {}
) {
  if (!descriptor) {
    throw new TypeError(
      "registerLifecycleEntry requires descriptor."
    );
  }
  const state =
    await readLifecycleState(
      actorReference
    );
  const entry =
    createLifecycleManagedEntry({
      descriptor,
      actorUuid:
        descriptor.actorUuid ??
        descriptor.targetActorUuid ??
        actorReference?.uuid ??
        null,
      origin,
      metadata
    });
  const existingIndex =
    state.entries.findIndex(
      candidate =>
        candidate.id ===
        entry.id
    );
  let entries;
  if (existingIndex >= 0) {
    entries = [
      ...state.entries
    ];
    entries[
      existingIndex
    ] =
      entry;
  } else {
    entries = [
      ...state.entries,
      entry
    ];
  }
  await writeLifecycleState(
    actorReference,
    createLifecycleState({
      version:
        state.version,
      entries,
      metadata:
        state.metadata
    }),
    {
      reason:
        "register-lifecycle-entry"
    }
  );
  return entry;
}
/* ============================================================
   REGISTER MULTIPLE ENTRIES
   ============================================================ */
export async function registerLifecycleEntries(
  actorReference,
  descriptors,
  options = {}
) {
  const results = [];
  for (
    const descriptor of
      descriptors ?? []
  ) {
    results.push(
      await registerLifecycleEntry(
        actorReference,
        descriptor,
        options
      )
    );
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   ENTRY LOOKUP
   ============================================================ */
export async function getLifecycleEntry(
  actorReference,
  entryId
) {
  if (!requiredString(entryId)) {
    return null;
  }
  const state =
    await readLifecycleState(
      actorReference
    );
  return (
    state.entries.find(
      entry =>
        entry.id ===
        entryId
    ) ??
    null
  );
}
/* ============================================================
   ACTIVE ENTRY LOOKUP
   ============================================================ */
export async function getActiveLifecycleEntries(
  actorReference
) {
  const state =
    await readLifecycleState(
      actorReference
    );
  return Object.freeze(
    state.entries.filter(
      entry =>
        entry.status ===
        LIFECYCLE_ENTRY_STATUS.ACTIVE
    )
  );
}
/* ============================================================
   SUBJECT LOOKUP
   ============================================================ */
export async function getLifecycleEntriesBySubject(
  actorReference,
  {
    subjectKind = null,
    subjectId = null
  } = {}
) {
  const state =
    await readLifecycleState(
      actorReference
    );
  return Object.freeze(
    state.entries.filter(
      entry => {
        const descriptor =
          entry.descriptor;
        if (
          subjectKind != null &&
          descriptor.subjectKind !==
            subjectKind
        ) {
          return false;
        }
        if (
          subjectId != null &&
          descriptor.subjectId !==
            subjectId
        ) {
          return false;
        }
        return true;
      }
    )
  );
}
/* ============================================================
   SOURCE / TARGET LOOKUP
   ============================================================ */
export async function getLifecycleEntriesByActor(
  actorReference,
  actorUuid
) {
  if (!requiredString(actorUuid)) {
    return Object.freeze([]);
  }
  const state =
    await readLifecycleState(
      actorReference
    );
  return Object.freeze(
    state.entries.filter(
      entry => {
        const descriptor =
          entry.descriptor;
        return (
          entry.actorUuid ===
            actorUuid ||
          descriptor.actorUuid ===
            actorUuid ||
          descriptor.sourceActorUuid ===
            actorUuid ||
          descriptor.targetActorUuid ===
            actorUuid
        );
      }
    )
  );
}
/* ============================================================
   SCOPE LOOKUP
   ============================================================ */
export async function getLifecycleEntriesByScope(
  actorReference,
  scope
) {
  const state =
    await readLifecycleState(
      actorReference
    );
  return Object.freeze(
    state.entries.filter(
      entry =>
        entry
          ?.descriptor
          ?.scope ===
        scope
    )
  );
}
/* ============================================================
   BOUNDARY LOOKUP
   ============================================================ */
export async function getLifecycleEntriesByBoundary(
  actorReference,
  boundary
) {
  const state =
    await readLifecycleState(
      actorReference
    );
  return Object.freeze(
    state.entries.filter(
      entry =>
        entry
          ?.descriptor
          ?.boundary ===
        boundary
    )
  );
}
/* ============================================================
   ENTRY STATUS UPDATE
   ============================================================ */
/**
 * @section entry-status-update
 */
export async function setLifecycleEntryStatus(
  actorReference,
  entryId,
  status,
  {
    metadata = {}
  } = {}
) {
  if (
    !Object
      .values(
        LIFECYCLE_ENTRY_STATUS
      )
      .includes(status)
  ) {
    throw new TypeError(
      `Invalid lifecycle entry status: ${String(status)}`
    );
  }
  const state =
    await readLifecycleState(
      actorReference
    );
  const index =
    state.entries.findIndex(
      entry =>
        entry.id ===
        entryId
    );
  if (index < 0) {
    return null;
  }
  const existing =
    state.entries[
      index
    ];
  const replacement =
    Object.freeze({
      ...existing,
      status,
      updatedAt:
        Date.now(),
      metadata:
        Object.freeze({
          ...existing.metadata,
          ...metadata
        })
    });
  const entries = [
    ...state.entries
  ];
  entries[index] =
    replacement;
  await writeLifecycleState(
    actorReference,
    createLifecycleState({
      version:
        state.version,
      entries,
      metadata:
        state.metadata
    }),
    {
      reason:
        "set-lifecycle-entry-status"
    }
  );
  return replacement;
}
/* ============================================================
   ENTRY REMOVAL
   ============================================================ */
export async function removeLifecycleEntry(
  actorReference,
  entryId
) {
  if (!requiredString(entryId)) {
    return false;
  }
  const state =
    await readLifecycleState(
      actorReference
    );
  const entries =
    state.entries.filter(
      entry =>
        entry.id !==
        entryId
    );
  if (
    entries.length ===
    state.entries.length
  ) {
    return false;
  }
  await writeLifecycleState(
    actorReference,
    createLifecycleState({
      version:
        state.version,
      entries,
      metadata:
        state.metadata
    }),
    {
      reason:
        "remove-lifecycle-entry"
    }
  );
  return true;
}
/* ============================================================
   REMOVE INACTIVE ENTRIES
   ============================================================ */
/**
 * @section remove-inactive-entries
 */
export async function pruneInactiveLifecycleEntries(
  actorReference
) {
  const state =
    await readLifecycleState(
      actorReference
    );
  const active =
    state.entries.filter(
      entry =>
        entry.status ===
        LIFECYCLE_ENTRY_STATUS.ACTIVE
    );
  const removed =
    state.entries.length -
    active.length;
  if (removed === 0) {
    return 0;
  }
  await writeLifecycleState(
    actorReference,
    createLifecycleState({
      version:
        state.version,
      entries:
        active,
      metadata:
        state.metadata
    }),
    {
      reason:
        "prune-lifecycle-state"
    }
  );
  return removed;
}
/* ============================================================
   ORIGIN TURN / ROUND RESOLUTION
   ============================================================ */
/**
 * @section origin-turn-round-resolution
 */
export function getLifecycleOriginTurnIndex(
  entry
) {
  return (
    finiteNumber(
      entry
        ?.origin
        ?.turnIndex
    )
      ? entry.origin.turnIndex
      : null
  );
}
export function getLifecycleOriginRound(
  entry
) {
  return (
    finiteNumber(
      entry
        ?.origin
        ?.round
    )
      ? entry.origin.round
      : null
  );
}
/* ============================================================
   TURN OFFSET SATISFACTION
   ============================================================ */
/**
 * @section turn-offset-satisfaction
 *
 * Lifecycle dispatcher provides current turn position.
 *
 * This helper only evaluates relative offset.
 */
export function isLifecycleTurnOffsetSatisfied(
  entry,
  {
    currentTurnIndex = null
  } = {}
) {
  const offset =
    entry
      ?.descriptor
      ?.turnOffset ??
    0;
  if (offset === 0) {
    return true;
  }
  const origin =
    getLifecycleOriginTurnIndex(
      entry
    );
  if (
    !finiteNumber(origin) ||
    !finiteNumber(
      currentTurnIndex
    )
  ) {
    return false;
  }
  return (
    currentTurnIndex >=
    origin + offset
  );
}
/* ============================================================
   ROUND OFFSET SATISFACTION
   ============================================================ */
export function isLifecycleRoundOffsetSatisfied(
  entry,
  {
    currentRound = null
  } = {}
) {
  const offset =
    entry
      ?.descriptor
      ?.roundOffset ??
    0;
  if (offset === 0) {
    return true;
  }
  const origin =
    getLifecycleOriginRound(
      entry
    );
  if (
    !finiteNumber(origin) ||
    !finiteNumber(
      currentRound
    )
  ) {
    return false;
  }
  return (
    currentRound >=
    origin + offset
  );
}
/* ============================================================
   ACTOR-BOUNDARY SATISFACTION
   ============================================================ */
/**
 * @section actor-boundary-satisfaction
 *
 * Important for:
 *
 * until end of TARGET'S next turn
 *
 * Target/source ownership is evaluated independently from offset count.
 */
export function doesLifecycleActorBoundaryMatch(
  entry,
  lifecycleContext
) {
  const descriptor =
    entry?.descriptor;
  const boundaryActorUuid =
    lifecycleContext
      ?.identity
      ?.actorUuid ??
    null;
  if (!boundaryActorUuid) {
    return true;
  }
  if (
    descriptor?.targetActorUuid
  ) {
    return (
      descriptor.targetActorUuid ===
      boundaryActorUuid
    );
  }
  if (
    descriptor?.actorUuid
  ) {
    return (
      descriptor.actorUuid ===
      boundaryActorUuid
    );
  }
  return true;
}
/* ============================================================
   ENTRY DUE CHECK
   ============================================================ */
/**
 * @section entry-due-check
 *
 * Structural due test.
 *
 * Custom predicates remain lifecycle-dispatcher-owned.
 */
export function isLifecycleEntryDue(
  entry,
  lifecycleContext
) {
  if (
    !entry ||
    entry.status !==
      LIFECYCLE_ENTRY_STATUS.ACTIVE
  ) {
    return false;
  }
  const descriptor =
    entry.descriptor;
  if (
    descriptor.scope &&
    descriptor.scope !==
      lifecycleContext.scope
  ) {
    return false;
  }
  if (
    descriptor.boundary &&
    descriptor.boundary !==
      lifecycleContext.boundary
  ) {
    return false;
  }
  if (
    descriptor.phase &&
    descriptor.phase !==
      lifecycleContext.phase
  ) {
    return false;
  }
  if (
    descriptor.eventKind &&
    descriptor.eventKind !==
      lifecycleContext
        ?.sourceEvent
        ?.kind
  ) {
    return false;
  }
  if (
    !doesLifecycleActorBoundaryMatch(
      entry,
      lifecycleContext
    )
  ) {
    return false;
  }
  if (
    !isLifecycleTurnOffsetSatisfied(
      entry,
      {
        currentTurnIndex:
          lifecycleContext
            ?.metadata
            ?.turnIndex ??
          null
      }
    )
  ) {
    return false;
  }
  if (
    !isLifecycleRoundOffsetSatisfied(
      entry,
      {
        currentRound:
          lifecycleContext
            ?.identity
            ?.round ??
          null
      }
    )
  ) {
    return false;
  }
  return true;
}
/* ============================================================
   DUE ENTRY RESOLUTION
   ============================================================ */
export async function getDueLifecycleEntries(
  actorReference,
  lifecycleContext
) {
  const entries =
    await getActiveLifecycleEntries(
      actorReference
    );
  return Object.freeze(
    entries.filter(
      entry =>
        isLifecycleEntryDue(
          entry,
          lifecycleContext
        )
    )
  );
}
/* ============================================================
   DESCRIPTOR TYPE HELPERS
   ============================================================ */
/**
 * @section descriptor-type-helpers
 */
export function isLifecycleExpirationEntry(
  entry
) {
  const descriptor =
    entry?.descriptor;
  return Boolean(
    descriptor &&
    (
      descriptor.removeOnExpire !==
        undefined ||
      descriptor.turnOffset !==
        undefined ||
      descriptor.roundOffset !==
        undefined
    )
  );
}
export function isLifecycleResetEntry(
  entry
) {
  const descriptor =
    entry?.descriptor;
  return Boolean(
    descriptor &&
    descriptor.operation &&
    descriptor.subjectId &&
    descriptor.removeOnExpire ===
      undefined
  );
}
/* ============================================================
   EXPIRATION REGISTRATION
   ============================================================ */
export async function registerLifecycleExpiration(
  actorReference,
  options,
  {
    origin = null,
    metadata = {}
  } = {}
) {
  const descriptor =
    options?.scope
      ? createLifecycleExpirationDescriptor(
          options
        )
      : options;
  return registerLifecycleEntry(
    actorReference,
    descriptor,
    {
      origin,
      metadata
    }
  );
}
/* ============================================================
   RESET REGISTRATION
   ============================================================ */
export async function registerLifecycleReset(
  actorReference,
  options,
  {
    origin = null,
    metadata = {}
  } = {}
) {
  const descriptor =
    options?.scope
      ? createLifecycleResetDescriptor(
          options
        )
      : options;
  return registerLifecycleEntry(
    actorReference,
    descriptor,
    {
      origin,
      metadata
    }
  );
}
/* ============================================================
   EFFECT REGISTRATION
   ============================================================ */
export async function registerLifecycleEffect(
  actorReference,
  options,
  {
    origin = null,
    metadata = {}
  } = {}
) {
  const effect =
    options?.expiration !==
      undefined
      ? createLifecycleEffectDescriptor(
          options
        )
      : options;
  const entries = [];
  if (effect.expiration) {
    entries.push(
      await registerLifecycleEntry(
        actorReference,
        effect.expiration,
        {
          origin,
          metadata: {
            ...metadata,
            lifecycleEffectId:
              effect.id
          }
        }
      )
    );
  }
  for (
    const reset of
      effect.resets ??
      []
  ) {
    entries.push(
      await registerLifecycleEntry(
        actorReference,
        reset,
        {
          origin,
          metadata: {
            ...metadata,
            lifecycleEffectId:
              effect.id
          }
        }
      )
    );
  }
  return Object.freeze({
    effect,
    entries:
      Object.freeze(
        entries
      )
  });
}
/* ============================================================
   ENTRY MARK EXPIRED
   ============================================================ */
export async function markLifecycleEntryExpired(
  actorReference,
  entryId,
  metadata = {}
) {
  return setLifecycleEntryStatus(
    actorReference,
    entryId,
    LIFECYCLE_ENTRY_STATUS.EXPIRED,
    {
      metadata
    }
  );
}
/* ============================================================
   ENTRY MARK RESET
   ============================================================ */
export async function markLifecycleEntryReset(
  actorReference,
  entryId,
  metadata = {}
) {
  return setLifecycleEntryStatus(
    actorReference,
    entryId,
    LIFECYCLE_ENTRY_STATUS.RESET,
    {
      metadata
    }
  );
}
/* ============================================================
   ENTRY DISABLE
   ============================================================ */
export async function disableLifecycleEntry(
  actorReference,
  entryId,
  metadata = {}
) {
  return setLifecycleEntryStatus(
    actorReference,
    entryId,
    LIFECYCLE_ENTRY_STATUS.DISABLED,
    {
      metadata
    }
  );
}
/* ============================================================
   ENTRY ENABLE
   ============================================================ */
export async function enableLifecycleEntry(
  actorReference,
  entryId,
  metadata = {}
) {
  return setLifecycleEntryStatus(
    actorReference,
    entryId,
    LIFECYCLE_ENTRY_STATUS.ACTIVE,
    {
      metadata
    }
  );
}
/* ============================================================
   LIFECYCLE SNAPSHOT
   ============================================================ */
/**
 * @section lifecycle-snapshot
 *
 * Compact immutable diagnostic/runtime view.
 */
export async function getLifecycleStateSnapshot(
  actorReference
) {
  const state =
    await readLifecycleState(
      actorReference
    );
  return Object.freeze({
    version:
      state.version,
    entryCount:
      state.entries.length,
    activeCount:
      state.entries.filter(
        entry =>
          entry.status ===
          LIFECYCLE_ENTRY_STATUS.ACTIVE
      ).length,
    entries:
      Object.freeze(
        state.entries
      )
  });
}
/* ============================================================
   RESOURCE LIFECYCLE NOTES
   ============================================================ */
/**
 * @section resource-lifecycle-notes
 *
 * resource_service owns:
 *
 * current resource state
 * reset mutation
 * restore mutation
 *
 * lifecycle-state stores only:
 *
 * subjectId
 * reset boundary
 * origin
 * active/reset state
 *
 * lifecycle-dispatcher later calls resource_service when due.
 */
/* ============================================================
   ACTION ECONOMY LIFECYCLE NOTES
   ============================================================ */
/**
 * @section action-economy-lifecycle-notes
 *
 * action_economy owns:
 *
 * initializeActionEconomyTurn
 * endActionEconomyTurn
 * restoreActionEconomyReaction
 *
 * lifecycle-state does not mirror Quick/Full/Protocol values.
 *
 * It only stores lifecycle descriptors when explicit timing state is needed.
 */
/* ============================================================
   STATUS / CONDITION NOTES
   ============================================================ */
/**
 * @section status-condition-notes
 *
 * lifecycle-state stores:
 *
 * "remove SHREDDED at target's next turn end"
 *
 * It does NOT store authoritative SHREDDED presence.
 *
 * Actual status authority remains native/status service.
 */
/* ============================================================
   NATIVE LIFECYCLE NOTES
   ============================================================ */
/**
 * @section native-lifecycle-notes
 *
 * authority = NATIVE
 *
 * entry may exist for:
 *
 * observation
 * diagnostics
 * verification
 *
 * lifecycle-dispatcher must not duplicate native mutation.
 *
 * State may still mark the descriptor expired/reset after verifying native
 * transition.
 */
/* ============================================================
   SCENE / COMBAT STORAGE NOTES
   ============================================================ */
/**
 * @section scene-combat-storage-notes
 *
 * Lifecycle state is actor-scoped through the injected adapter by default.
 *
 * Global/scene/combat lifecycle descriptors may eventually need a separate
 * storage scope.
 *
 * Do not hardcode that storage model here.
 *
 * Adapter may interpret special actorReference/runtime scope identifiers as
 * needed.
 */
/* ============================================================
   OFFSET NOTES
   ============================================================ */
/**
 * @section offset-notes
 *
 * Relative expiration requires origin state.
 *
 * Example:
 *
 * target becomes SHREDDED during round 3, target turn index 4.
 *
 * "until end of target's next turn"
 *
 * descriptor:
 *
 * turnOffset = 1
 * targetActorUuid = target
 * boundary = TURN_ENDED
 *
 * origin:
 *
 * turnIndex = current lifecycle turn counter
 *
 * Dispatcher later evaluates:
 *
 * actor matches target
 * boundary = TURN_ENDED
 * currentTurnIndex >= origin + 1
 */
/* ============================================================
   TURN INDEX NOTES
   ============================================================ */
/**
 * @section turn-index-notes
 *
 * turnIndex here means a monotonically advancing lifecycle turn counter,
 * NOT merely Foundry combat.turn position.
 *
 * Example:
 *
 * combat.turn may cycle:
 *
 * 0 → 1 → 2 → 0
 *
 * lifecycle turn index should advance:
 *
 * 0 → 1 → 2 → 3
 *
 * lifecycle-hooks/state adapter must supply the monotonic value if relative
 * "next turn" timing is required.
 *
 * This avoids ambiguity across round boundaries.
 */
/* ============================================================
   ACTOR-OWNED FEATURE NOTES
   ============================================================ */
/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry may later discover:
 *
 * trait/talent/core bonus effects
 * with lifecycle metadata.
 *
 * Registration path:
 *
 * owned feature descriptor
 * → system_bridge augmentation
 * → lifecycle descriptor
 * → registerLifecycleEntry(...)
 *
 * Registry itself does not own lifecycle timing.
 */
/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */
/**
 * @section system-bridge-notes
 *
 * system_bridge may construct missing:
 *
 * expiration descriptors
 * reset descriptors
 *
 * This state module stores those normalized descriptors generically.
 *
 * It does not care whether descriptor originated from:
 *
 * native data
 * current Frame Conn registry
 * actor-owned feature descriptor
 * augmentation registry
 */
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
export function getLifecycleStateDiagnostics() {
  return Object.freeze({
    id:
      LIFECYCLE_STATE_MODULE_ID,
    version:
      LIFECYCLE_STATE_MODULE_VERSION,
    adapterConfigured:
      hasLifecycleStateAdapter(),
    adapterCapabilities:
      Object.freeze({
        read:
          typeof lifecycleStateAdapter?.read ===
          "function",
        write:
          typeof lifecycleStateAdapter?.write ===
          "function",
        clear:
          typeof lifecycleStateAdapter?.clear ===
          "function"
      })
  });
}
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature_turn/
 * -------------
 *
 * Remains turn-state authority.
 *
 * lifecycle-state does not copy:
 *
 * Quick actions
 * Full action
 * movement spent
 * Overcharge
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns action economy state.
 *
 * lifecycle dispatcher invokes its lifecycle primitives.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns resources.
 *
 * lifecycle-state only stores reset timing metadata.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Provides lifecycle boundary transport.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Can create lifecycle-managed effects through normal execution resolution.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Remains native state authority.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later supplies owned feature lifecycle descriptors.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplements missing lifecycle metadata.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * lifecycle-state stores timing metadata, not authoritative mechanic state.
 *
 * INVARIANT 2
 * resource_service remains resource authority.
 *
 * INVARIANT 3
 * action_economy remains action-economy authority.
 *
 * INVARIANT 4
 * native_adapter remains native Lancer authority.
 *
 * INVARIANT 5
 * No direct Foundry persistence path is hardcoded here.
 *
 * INVARIANT 6
 * Lifecycle persistence is injected through adapter.
 *
 * INVARIANT 7
 * Relative turn/round expiration records origin lifecycle state.
 *
 * INVARIANT 8
 * turnIndex used for relative turn timing should be monotonic.
 *
 * INVARIANT 9
 * Actor-targeted expiration checks actor identity separately from offset.
 *
 * INVARIANT 10
 * Only ACTIVE lifecycle entries are dispatchable.
 *
 * INVARIANT 11
 * Lifecycle state changes do not themselves perform mechanic mutation.
 *
 * INVARIANT 12
 * Expired/reset entries remain inspectable until pruned.
 *
 * INVARIANT 13
 * actor_owned_feature_registry may supply descriptors but does not own
 * lifecycle persistence.
 *
 * INVARIANT 14
 * system_bridge may supplement descriptors but does not own lifecycle
 * state.
 */