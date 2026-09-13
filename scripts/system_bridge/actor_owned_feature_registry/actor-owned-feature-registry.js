/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/actor_owned_feature_registry/actor-owned-feature-registry.js
 */

/**
 * @file
 * @path main/actor_owned_feature_registry/actor-owned-feature-registry.js
 * @module actor-owned-feature-registry
 * @layer actor-owned-feature-registry-state
 * @responsibility discover-normalize-index-and-query-current-actor-owned-runtime-feature-descriptors
 * @public-boundary false
 * @side-effects in-memory-registry-mutation-and-delegated-native-read-discovery
 *
 * @depends-on
 * - actor-owned-feature-contract
 * - actor-owned-feature-discovery
 * - actor-owned-feature-normalizer
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - native_adapter/ supplies discovery through injected discovery adapter
 * - existing Frame Conn action registry remains separate
 * - future system_bridge/ consumes this registry as one runtime source
 * - semantic_event_bus/ may later consume normalized trigger declarations
 * - lifecycle_service/ may later consume lifecycle declarations
 * - resource_service/ may later consume resource declarations
 * - targeting_spatial_service/ may later consume targeting declarations
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - discovery owns native actor/item enumeration
 * - normalizer owns descriptor construction
 * - registry owns current indexed normalized state
 * - system_bridge owns supplementation/composition
 * - registry does not execute feature mechanics
 *
 * THIS FILE OWNS:
 * - per-actor normalized feature indexing
 * - refresh/discover/normalize pipeline
 * - feature lookup
 * - action lookup
 * - feature-kind lookup
 * - runtime-status lookup
 * - native-executable lookup
 * - augmentation-needed lookup
 * - actor/pilot/mech ownership lookup
 * - stale actor registry replacement
 * - registry diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - native discovery implementation
 * - normalization semantics
 * - feature execution
 * - bridge augmentation
 * - event listener registration
 * - lifecycle/resource/targeting mutation
 *
 * EDIT CONTRACT:
 * - registry stores normalized descriptors only
 * - refresh replaces actor-scoped state atomically
 * - do not merge existing Frame Conn registry here
 * - preserve actor/pilot/mech provenance
 * - no feature-specific rule branches
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  ACTOR_OWNED_FEATURE_KIND,
  ACTOR_OWNED_FEATURE_RUNTIME_STATUS,
  doesActorOwnedFeatureRequireAugmentation,
  flattenActorOwnedFeatureActions,
  isActorOwnedFeatureNativeExecutable
} from "./actor-owned-feature-contract.js";

import {
  discoverActorOwnedFeatureFamily
} from "./actor-owned-feature-discovery.js";

import {
  getActorOwnedFeatureAugmentationNeeds,
  normalizeActorOwnedFeatureDiscovery
} from "./actor-owned-feature-normalizer.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const ACTOR_OWNED_FEATURE_REGISTRY_MODULE_ID =
  "lancer-frame-conn.actor-owned-feature-registry";

export const ACTOR_OWNED_FEATURE_REGISTRY_MODULE_VERSION =
  1;

/* ============================================================
   REGISTRY STATE
   ============================================================ */

/**
 * @section registry-state
 *
 * Actor registry:
 *
 * actorScopeId →
 * {
 *   actorUuid,
 *   pilotUuid,
 *   mechUuid,
 *   features: Map<featureId, descriptor>,
 *   actions: Map<actionId, { feature, action }>,
 *   refreshedAt,
 *   discovery,
 *   normalization
 * }
 */

const ACTOR_FEATURE_REGISTRY =
  new Map();

/* ============================================================
   GLOBAL FEATURE INDEX
   ============================================================ */

/**
 * @section global-feature-index
 *
 * featureId →
 * {
 *   actorScopeId,
 *   feature
 * }
 */

const FEATURE_INDEX =
  new Map();

/* ============================================================
   GLOBAL ACTION INDEX
   ============================================================ */

/**
 * @section global-action-index
 *
 * actionId →
 * {
 *   actorScopeId,
 *   feature,
 *   action
 * }
 */

const ACTION_INDEX =
  new Map();

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

function normalizeArray(value) {
  if (value == null) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function getActorScopeIdFromMetadata(
  metadata = {}
) {
  return (
    metadata.actorUuid ??
    metadata.mechUuid ??
    metadata.pilotUuid ??
    null
  );
}

/* ============================================================
   ACTOR SCOPE ID
   ============================================================ */

/**
 * @section actor-scope-id
 *
 * Registry scope represents one linked pilot/mech character family.
 *
 * Prefer requested/resolved actor UUID.
 */

export function getActorOwnedFeatureRegistryScopeId(
  value
) {
  if (requiredString(value)) {
    return value;
  }

  return (
    value?.actorUuid ??
    value?.metadata?.actorUuid ??
    value?.metadata?.mechUuid ??
    value?.metadata?.pilotUuid ??
    value?.uuid ??
    null
  );
}

/* ============================================================
   REGISTRY ENTRY CONSTRUCTION
   ============================================================ */

function createActorFeatureRegistryEntry({
  actorScopeId,

  actorUuid = null,
  pilotUuid = null,
  mechUuid = null,

  descriptors = [],

  discovery = null,
  normalization = null
} = {}) {
  if (!requiredString(actorScopeId)) {
    throw new TypeError(
      "Actor-owned feature registry entry requires actorScopeId."
    );
  }

  const features =
    new Map();

  const actions =
    new Map();

  for (
    const feature of
      descriptors
  ) {
    const featureId =
      feature
        ?.identity
        ?.id;

    if (!requiredString(featureId)) {
      continue;
    }

    features.set(
      featureId,
      feature
    );

    for (
      const entry of
        flattenActorOwnedFeatureActions([
          feature
        ])
    ) {
      const actionId =
        entry
          ?.action
          ?.id;

      if (!requiredString(actionId)) {
        continue;
      }

      actions.set(
        actionId,
        Object.freeze({
          feature,
          action:
            entry.action
        })
      );
    }
  }

  return {
    actorScopeId,

    actorUuid,
    pilotUuid,
    mechUuid,

    features,
    actions,

    discovery,
    normalization,

    refreshedAt:
      Date.now()
  };
}

/* ============================================================
   GLOBAL INDEX REMOVAL
   ============================================================ */

function removeRegistryEntryFromGlobalIndexes(
  entry
) {
  if (!entry) {
    return;
  }

  for (
    const featureId of
      entry.features.keys()
  ) {
    const indexed =
      FEATURE_INDEX.get(
        featureId
      );

    if (
      indexed?.actorScopeId ===
      entry.actorScopeId
    ) {
      FEATURE_INDEX.delete(
        featureId
      );
    }
  }

  for (
    const actionId of
      entry.actions.keys()
  ) {
    const indexed =
      ACTION_INDEX.get(
        actionId
      );

    if (
      indexed?.actorScopeId ===
      entry.actorScopeId
    ) {
      ACTION_INDEX.delete(
        actionId
      );
    }
  }
}

/* ============================================================
   GLOBAL INDEX ADDITION
   ============================================================ */

function addRegistryEntryToGlobalIndexes(
  entry
) {
  for (
    const [
      featureId,
      feature
    ] of entry.features
  ) {
    FEATURE_INDEX.set(
      featureId,
      Object.freeze({
        actorScopeId:
          entry.actorScopeId,

        feature
      })
    );
  }

  for (
    const [
      actionId,
      value
    ] of entry.actions
  ) {
    ACTION_INDEX.set(
      actionId,
      Object.freeze({
        actorScopeId:
          entry.actorScopeId,

        feature:
          value.feature,

        action:
          value.action
      })
    );
  }
}

/* ============================================================
   ACTOR ENTRY INSTALL
   ============================================================ */

/**
 * @section actor-entry-install
 *
 * Replace atomically at actor scope.
 */

function installActorRegistryEntry(
  entry
) {
  const existing =
    ACTOR_FEATURE_REGISTRY.get(
      entry.actorScopeId
    );

  if (existing) {
    removeRegistryEntryFromGlobalIndexes(
      existing
    );
  }

  ACTOR_FEATURE_REGISTRY.set(
    entry.actorScopeId,
    entry
  );

  addRegistryEntryToGlobalIndexes(
    entry
  );

  return entry;
}

/* ============================================================
   REFRESH ACTOR OWNED FEATURES
   ============================================================ */

/**
 * @section refresh-actor-owned-features
 *
 * Canonical pipeline:
 *
 * actor reference
 * → discovery
 * → normalization
 * → registry replacement
 */

export async function refreshActorOwnedFeatures(
  actorReference,
  options = {}
) {
  const discovery =
    await discoverActorOwnedFeatureFamily(
      actorReference,
      options
    );

  const normalization =
    normalizeActorOwnedFeatureDiscovery(
      discovery
    );

  const actorScopeId =
    getActorOwnedFeatureRegistryScopeId(
      actorReference
    ) ??
    discovery.actorUuid ??
    getActorScopeIdFromMetadata(
      discovery.metadata
    );

  if (!requiredString(actorScopeId)) {
    throw new Error(
      "Actor-owned feature refresh could not resolve registry actor scope."
    );
  }

  const entry =
    createActorFeatureRegistryEntry({
      actorScopeId,

      actorUuid:
        discovery.actorUuid ??
        null,

      pilotUuid:
        discovery
          ?.metadata
          ?.pilotUuid ??
        null,

      mechUuid:
        discovery
          ?.metadata
          ?.mechUuid ??
        null,

      descriptors:
        normalization.descriptors,

      discovery,
      normalization
    });

  installActorRegistryEntry(
    entry
  );

  return getActorOwnedFeatureRegistrySnapshot(
    actorScopeId
  );
}

/* ============================================================
   REGISTER NORMALIZED DESCRIPTORS
   ============================================================ */

/**
 * @section register-normalized-descriptors
 *
 * Used when descriptors were normalized elsewhere.
 *
 * Registry still stores normalized descriptors only.
 */

export function registerActorOwnedFeatureDescriptors(
  actorScopeId,
  descriptors,
  {
    actorUuid = null,
    pilotUuid = null,
    mechUuid = null,

    discovery = null,
    normalization = null
  } = {}
) {
  if (!requiredString(actorScopeId)) {
    throw new TypeError(
      "registerActorOwnedFeatureDescriptors requires actorScopeId."
    );
  }

  const entry =
    createActorFeatureRegistryEntry({
      actorScopeId,

      actorUuid,
      pilotUuid,
      mechUuid,

      descriptors:
        normalizeArray(
          descriptors
        ),

      discovery,
      normalization
    });

  installActorRegistryEntry(
    entry
  );

  return getActorOwnedFeatureRegistrySnapshot(
    actorScopeId
  );
}

/* ============================================================
   ACTOR REGISTRY LOOKUP
   ============================================================ */

export function hasActorOwnedFeatureRegistry(
  actorScopeId
) {
  return ACTOR_FEATURE_REGISTRY.has(
    actorScopeId
  );
}

export function getActorOwnedFeatureRegistryEntry(
  actorScopeId
) {
  return (
    ACTOR_FEATURE_REGISTRY.get(
      actorScopeId
    ) ??
    null
  );
}

/* ============================================================
   ACTOR FEATURE LIST
   ============================================================ */

export function getActorOwnedFeatures(
  actorScopeId
) {
  const entry =
    getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );

  if (!entry) {
    return Object.freeze([]);
  }

  return Object.freeze([
    ...entry.features.values()
  ]);
}

/* ============================================================
   FEATURE LOOKUP
   ============================================================ */

export function getActorOwnedFeature(
  actorScopeId,
  featureId
) {
  if (
    !requiredString(actorScopeId) ||
    !requiredString(featureId)
  ) {
    return null;
  }

  return (
    ACTOR_FEATURE_REGISTRY
      .get(actorScopeId)
      ?.features
      ?.get(featureId) ??
    null
  );
}

export function findActorOwnedFeature(
  featureId
) {
  if (!requiredString(featureId)) {
    return null;
  }

  return (
    FEATURE_INDEX.get(
      featureId
    ) ??
    null
  );
}

export function hasActorOwnedFeature(
  actorScopeId,
  featureId
) {
  return Boolean(
    getActorOwnedFeature(
      actorScopeId,
      featureId
    )
  );
}

/* ============================================================
   ACTION LOOKUP
   ============================================================ */

export function getActorOwnedFeatureActionEntry(
  actorScopeId,
  actionId
) {
  if (
    !requiredString(actorScopeId) ||
    !requiredString(actionId)
  ) {
    return null;
  }

  return (
    ACTOR_FEATURE_REGISTRY
      .get(actorScopeId)
      ?.actions
      ?.get(actionId) ??
    null
  );
}

export function findActorOwnedFeatureAction(
  actionId
) {
  if (!requiredString(actionId)) {
    return null;
  }

  return (
    ACTION_INDEX.get(
      actionId
    ) ??
    null
  );
}

export function getActorOwnedFeatureActions(
  actorScopeId
) {
  const entry =
    getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );

  if (!entry) {
    return Object.freeze([]);
  }

  return Object.freeze([
    ...entry.actions.values()
  ]);
}

/* ============================================================
   FEATURE KIND LOOKUP
   ============================================================ */

export function getActorOwnedFeaturesByKind(
  actorScopeId,
  kinds
) {
  const allowed =
    new Set(
      normalizeArray(
        kinds
      )
    );

  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          allowed.has(
            feature
              ?.identity
              ?.kind
          )
      )
  );
}

/* ============================================================
   RUNTIME STATUS LOOKUP
   ============================================================ */

export function getActorOwnedFeaturesByRuntimeStatus(
  actorScopeId,
  statuses
) {
  const allowed =
    new Set(
      normalizeArray(
        statuses
      )
    );

  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          allowed.has(
            feature.runtimeStatus
          )
      )
  );
}

/* ============================================================
   NATIVE EXECUTABLE FEATURES
   ============================================================ */

export function getNativeExecutableActorOwnedFeatures(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        isActorOwnedFeatureNativeExecutable
      )
  );
}

/* ============================================================
   AUGMENTATION-NEEDED FEATURES
   ============================================================ */

export function getActorOwnedFeaturesRequiringAugmentation(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        doesActorOwnedFeatureRequireAugmentation
      )
  );
}

/* ============================================================
   AUGMENTATION NEEDS
   ============================================================ */

export function getActorOwnedFeatureRegistryAugmentationNeeds(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeaturesRequiringAugmentation(
      actorScopeId
    )
      .map(
        feature =>
          Object.freeze({
            featureId:
              feature.identity.id,

            feature,

            needs:
              getActorOwnedFeatureAugmentationNeeds(
                feature
              )
          })
      )
  );
}

/* ============================================================
   WEAPON LOOKUP
   ============================================================ */

export function getActorOwnedWeapons(
  actorScopeId
) {
  return getActorOwnedFeaturesByKind(
    actorScopeId,
    [
      ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON,
      ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON
    ]
  );
}

/* ============================================================
   SYSTEM LOOKUP
   ============================================================ */

export function getActorOwnedSystems(
  actorScopeId
) {
  return getActorOwnedFeaturesByKind(
    actorScopeId,
    [
      ACTOR_OWNED_FEATURE_KIND.MECH_SYSTEM,
      ACTOR_OWNED_FEATURE_KIND.CORE_SYSTEM
    ]
  );
}

/* ============================================================
   TALENT LOOKUP
   ============================================================ */

export function getActorOwnedTalents(
  actorScopeId
) {
  return getActorOwnedFeaturesByKind(
    actorScopeId,
    ACTOR_OWNED_FEATURE_KIND.TALENT
  );
}

/* ============================================================
   FRAME TRAIT LOOKUP
   ============================================================ */

export function getActorOwnedFrameTraits(
  actorScopeId
) {
  return getActorOwnedFeaturesByKind(
    actorScopeId,
    ACTOR_OWNED_FEATURE_KIND.FRAME_TRAIT
  );
}

/* ============================================================
   CORE BONUS LOOKUP
   ============================================================ */

export function getActorOwnedCoreBonuses(
  actorScopeId
) {
  return getActorOwnedFeaturesByKind(
    actorScopeId,
    ACTOR_OWNED_FEATURE_KIND.CORE_BONUS
  );
}

/* ============================================================
   NHP LOOKUP
   ============================================================ */

export function getActorOwnedNhps(
  actorScopeId
) {
  return getActorOwnedFeaturesByKind(
    actorScopeId,
    ACTOR_OWNED_FEATURE_KIND.NHP
  );
}

/* ============================================================
   PILOT FEATURE LOOKUP
   ============================================================ */

export function getPilotOwnedFeatures(
  actorScopeId
) {
  const entry =
    getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );

  if (!entry?.pilotUuid) {
    return Object.freeze([]);
  }

  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          feature
            ?.identity
            ?.actorUuid ===
          entry.pilotUuid
      )
  );
}

/* ============================================================
   MECH FEATURE LOOKUP
   ============================================================ */

export function getMechOwnedFeatures(
  actorScopeId
) {
  const entry =
    getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );

  if (!entry?.mechUuid) {
    return Object.freeze([]);
  }

  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          feature
            ?.identity
            ?.actorUuid ===
          entry.mechUuid
      )
  );
}

/* ============================================================
   ACTIVE FEATURE LOOKUP
   ============================================================ */

export function getActiveActorOwnedFeatures(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          feature.active !==
          false
      )
  );
}

/* ============================================================
   EQUIPPED FEATURE LOOKUP
   ============================================================ */

export function getEquippedActorOwnedFeatures(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          feature.equipped ===
          true
      )
  );
}

/* ============================================================
   MOUNTED FEATURE LOOKUP
   ============================================================ */

export function getMountedActorOwnedFeatures(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature =>
          feature.mounted ===
          true
      )
  );
}

/* ============================================================
   ACTION KIND LOOKUP
   ============================================================ */

export function getActorOwnedActionsByKind(
  actorScopeId,
  kinds
) {
  const allowed =
    new Set(
      normalizeArray(
        kinds
      )
    );

  return Object.freeze(
    getActorOwnedFeatureActions(
      actorScopeId
    )
      .filter(
        entry =>
          allowed.has(
            entry
              ?.action
              ?.kind
          )
      )
  );
}

/* ============================================================
   EXECUTABLE ACTION LOOKUP
   ============================================================ */

export function getNativeExecutableActorOwnedActions(
  actorScopeId
) {
  return Object.freeze(
    getActorOwnedFeatureActions(
      actorScopeId
    )
      .filter(
        entry =>
          entry
            ?.action
            ?.nativeExecution
            ?.executable ===
          true
      )
  );
}

/* ============================================================
   RUNTIME ACTION STATUS LOOKUP
   ============================================================ */

export function getActorOwnedActionsByRuntimeStatus(
  actorScopeId,
  statuses
) {
  const allowed =
    new Set(
      normalizeArray(
        statuses
      )
    );

  return Object.freeze(
    getActorOwnedFeatureActions(
      actorScopeId
    )
      .filter(
        entry =>
          allowed.has(
            entry
              ?.action
              ?.runtimeStatus
          )
      )
  );
}

/* ============================================================
   FEATURE MATCH QUERY
   ============================================================ */

/**
 * @section feature-match-query
 *
 * Generic bridge-facing lookup.
 */

export function queryActorOwnedFeatures(
  actorScopeId,
  {
    kinds = null,

    runtimeStatuses = null,

    active = null,
    equipped = null,
    mounted = null,

    itemLid = null,

    predicate = null
  } = {}
) {
  const kindSet =
    kinds == null
      ? null
      : new Set(
          normalizeArray(
            kinds
          )
        );

  const statusSet =
    runtimeStatuses == null
      ? null
      : new Set(
          normalizeArray(
            runtimeStatuses
          )
        );

  return Object.freeze(
    getActorOwnedFeatures(
      actorScopeId
    )
      .filter(
        feature => {
          if (
            kindSet &&
            !kindSet.has(
              feature
                ?.identity
                ?.kind
            )
          ) {
            return false;
          }

          if (
            statusSet &&
            !statusSet.has(
              feature.runtimeStatus
            )
          ) {
            return false;
          }

          if (
            active != null &&
            feature.active !==
              Boolean(active)
          ) {
            return false;
          }

          if (
            equipped != null &&
            feature.equipped !==
              Boolean(equipped)
          ) {
            return false;
          }

          if (
            mounted != null &&
            feature.mounted !==
              Boolean(mounted)
          ) {
            return false;
          }

          if (
            itemLid != null &&
            feature
              ?.identity
              ?.itemLid !==
            itemLid
          ) {
            return false;
          }

          if (
            typeof predicate ===
              "function" &&
            !predicate(
              feature
            )
          ) {
            return false;
          }

          return true;
        }
      )
  );
}

/* ============================================================
   ACTION MATCH QUERY
   ============================================================ */

export function queryActorOwnedFeatureActions(
  actorScopeId,
  {
    kinds = null,

    runtimeStatuses = null,

    nativeExecutable = null,

    predicate = null
  } = {}
) {
  const kindSet =
    kinds == null
      ? null
      : new Set(
          normalizeArray(
            kinds
          )
        );

  const statusSet =
    runtimeStatuses == null
      ? null
      : new Set(
          normalizeArray(
            runtimeStatuses
          )
        );

  return Object.freeze(
    getActorOwnedFeatureActions(
      actorScopeId
    )
      .filter(
        entry => {
          const action =
            entry.action;

          if (
            kindSet &&
            !kindSet.has(
              action.kind
            )
          ) {
            return false;
          }

          if (
            statusSet &&
            !statusSet.has(
              action.runtimeStatus
            )
          ) {
            return false;
          }

          if (
            nativeExecutable != null &&
            Boolean(
              action
                ?.nativeExecution
                ?.executable
            ) !==
            Boolean(
              nativeExecutable
            )
          ) {
            return false;
          }

          if (
            typeof predicate ===
              "function" &&
            !predicate(
              entry
            )
          ) {
            return false;
          }

          return true;
        }
      )
  );
}

/* ============================================================
   REMOVE ACTOR REGISTRY
   ============================================================ */

export function removeActorOwnedFeatureRegistry(
  actorScopeId
) {
  const entry =
    ACTOR_FEATURE_REGISTRY.get(
      actorScopeId
    );

  if (!entry) {
    return false;
  }

  removeRegistryEntryFromGlobalIndexes(
    entry
  );

  ACTOR_FEATURE_REGISTRY.delete(
    actorScopeId
  );

  return true;
}

/* ============================================================
   CLEAR REGISTRY
   ============================================================ */

export function clearActorOwnedFeatureRegistry() {
  const count =
    ACTOR_FEATURE_REGISTRY.size;

  ACTOR_FEATURE_REGISTRY.clear();
  FEATURE_INDEX.clear();
  ACTION_INDEX.clear();

  return count;
}

/* ============================================================
   ACTOR REGISTRY SNAPSHOT
   ============================================================ */

export function getActorOwnedFeatureRegistrySnapshot(
  actorScopeId
) {
  const entry =
    getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );

  if (!entry) {
    return null;
  }

  const features =
    Object.freeze([
      ...entry.features.values()
    ]);

  const actions =
    Object.freeze([
      ...entry.actions.values()
    ]);

  return Object.freeze({
    actorScopeId:
      entry.actorScopeId,

    actorUuid:
      entry.actorUuid,

    pilotUuid:
      entry.pilotUuid,

    mechUuid:
      entry.mechUuid,

    features,

    actions,

    featureCount:
      features.length,

    actionCount:
      actions.length,

    refreshedAt:
      entry.refreshedAt,

    discovery:
      entry.discovery,

    normalization:
      entry.normalization
  });
}

/* ============================================================
   GLOBAL REGISTRY SNAPSHOT
   ============================================================ */

export function getAllActorOwnedFeatureRegistrySnapshots() {
  return Object.freeze(
    [
      ...ACTOR_FEATURE_REGISTRY.keys()
    ]
      .map(
        getActorOwnedFeatureRegistrySnapshot
      )
      .filter(Boolean)
  );
}

/* ============================================================
   REGISTRY STALENESS
   ============================================================ */

/**
 * @section registry-staleness
 *
 * Registry does not independently watch Foundry documents.
 *
 * Caller/runtime hooks decide when refresh is necessary.
 */

export function isActorOwnedFeatureRegistryStale(
  actorScopeId,
  {
    maxAgeMs
  } = {}
) {
  const entry =
    getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );

  if (!entry) {
    return true;
  }

  if (
    !Number.isFinite(maxAgeMs)
  ) {
    return false;
  }

  return (
    Date.now() -
    entry.refreshedAt
  ) >
  maxAgeMs;
}

/* ============================================================
   ENSURE ACTOR REGISTRY
   ============================================================ */

export async function ensureActorOwnedFeatureRegistry(
  actorReference,
  {
    maxAgeMs = null,
    ...options
  } = {}
) {
  const actorScopeId =
    getActorOwnedFeatureRegistryScopeId(
      actorReference
    );

  if (
    actorScopeId &&
    !isActorOwnedFeatureRegistryStale(
      actorScopeId,
      {
        maxAgeMs
      }
    )
  ) {
    return getActorOwnedFeatureRegistrySnapshot(
      actorScopeId
    );
  }

  return refreshActorOwnedFeatures(
    actorReference,
    options
  );
}

/* ============================================================
   BRIDGE SOURCE SNAPSHOT
   ============================================================ */

/**
 * @section bridge-source-snapshot
 *
 * Compact normalized source for future system_bridge.
 *
 * No augmentation is applied here.
 */

export function getActorOwnedFeatureBridgeSource(
  actorScopeId
) {
  const snapshot =
    getActorOwnedFeatureRegistrySnapshot(
      actorScopeId
    );

  if (!snapshot) {
    return null;
  }

  return Object.freeze({
    sourceKind:
      "actor-owned-feature-registry",

    actorScopeId:
      snapshot.actorScopeId,

    actorUuid:
      snapshot.actorUuid,

    pilotUuid:
      snapshot.pilotUuid,

    mechUuid:
      snapshot.mechUuid,

    features:
      snapshot.features,

    actions:
      snapshot.actions,

    augmentationNeeds:
      getActorOwnedFeatureRegistryAugmentationNeeds(
        actorScopeId
      ),

    refreshedAt:
      snapshot.refreshedAt
  });
}

/* ============================================================
   RUNTIME SUPPORT SUMMARY
   ============================================================ */

export function getActorOwnedFeatureRuntimeSummary(
  actorScopeId
) {
  const features =
    getActorOwnedFeatures(
      actorScopeId
    );

  const summary = {};

  for (
    const status of
      Object.values(
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS
      )
  ) {
    summary[status] =
      0;
  }

  for (
    const feature of
      features
  ) {
    const status =
      feature.runtimeStatus ??
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN;

    summary[status] =
      (
        summary[status] ??
        0
      ) + 1;
  }

  return Object.freeze(
    summary
  );
}

/* ============================================================
   DISCOVERY REFRESH RULE
   ============================================================ */

/**
 * @section discovery-refresh-rule
 *
 * Refresh should occur when actor ownership/native item state changes.
 *
 * Examples:
 *
 * weapon mounted/unmounted
 * system equipped/removed
 * Talent rank changed
 * linked mech changed
 * pilot loadout changed
 * NHP installed/removed
 *
 * Registry itself does not subscribe to Foundry hooks.
 *
 * Future actor-owned-feature-hooks/runtime composition may call:
 *
 * refreshActorOwnedFeatures(...)
 */

/* ============================================================
   PILOT / MECH FAMILY RULE
   ============================================================ */

/**
 * @section pilot-mech-family-rule
 *
 * One registry scope may contain:
 *
 * pilot-owned features
 * +
 * linked mech-owned features
 *
 * Each descriptor still preserves its actual source actor UUID.
 *
 * This allows Frame Conn to present:
 *
 * pilot actions when dismounted
 * mech actions when mounted
 *
 * without flattening ownership truth.
 */

/* ============================================================
   EXISTING FRAME CONN REGISTRY RULE
   ============================================================ */

/**
 * @section existing-frame-conn-registry-rule
 *
 * This registry must NOT absorb the existing Frame Conn action registry.
 *
 * Existing registry:
 *
 * declared/global Frame Conn actions
 *
 * Actor-owned registry:
 *
 * actual actor-owned/native features
 *
 * system_bridge later combines them.
 */

/* ============================================================
   NATIVE EXECUTION RULE
   ============================================================ */

/**
 * @section native-execution-rule
 *
 * Registry may expose:
 *
 * native-executable feature/action
 *
 * but does not invoke it.
 *
 * Runtime execution later flows:
 *
 * registry/bridge descriptor
 * → ExecutionContext
 * → execution_transaction
 * → native_adapter
 */

/* ============================================================
   AUGMENTATION RULE
   ============================================================ */

/**
 * @section augmentation-rule
 *
 * PARTIAL_NATIVE
 * SEMANTIC_ONLY
 * UNKNOWN
 *
 * remain registered exactly as normalized.
 *
 * Registry does not fill missing:
 *
 * trigger
 * lifecycle
 * resource
 * targeting
 * special effect
 *
 * semantics.
 *
 * system_bridge supplies only missing runtime information.
 */

/* ============================================================
   SEMANTIC EVENT RULE
   ============================================================ */

/**
 * @section semantic-event-rule
 *
 * Registry may contain normalized trigger declarations later.
 *
 * It does not directly install semantic_event_bus listeners in this file.
 *
 * Listener installation belongs to actor-owned feature runtime/hooks or
 * bridge composition.
 */

/* ============================================================
   RESOURCE RULE
   ============================================================ */

/**
 * @section resource-rule
 *
 * Registry may expose resource declarations/evidence.
 *
 * resource_service remains authoritative for:
 *
 * availability
 * consumption
 * reset
 * verification
 */

/* ============================================================
   LIFECYCLE RULE
   ============================================================ */

/**
 * @section lifecycle-rule
 *
 * Registry may expose lifecycle descriptors.
 *
 * lifecycle_service remains authoritative for:
 *
 * expiration timing
 * reset timing
 * lifecycle state
 */

/* ============================================================
   TARGETING RULE
   ============================================================ */

/**
 * @section targeting-rule
 *
 * Registry may expose targeting requirements/evidence.
 *
 * targeting_spatial_service remains authoritative for:
 *
 * acquisition
 * geometry
 * legality
 */

/* ============================================================
   ACTION ECONOMY RULE
   ============================================================ */

/**
 * @section action-economy-rule
 *
 * Registry may expose activation/action economy metadata.
 *
 * action_economy remains authoritative for:
 *
 * validation
 * spending
 * turn reset
 * Protocol timing
 */

/* ============================================================
   SYSTEM BRIDGE BOUNDARY
   ============================================================ */

/**
 * @section system-bridge-boundary
 *
 * Intended:
 *
 * existing Frame Conn registry
 *          +
 * actor-owned registry
 *          +
 * augmentation registry
 *          ↓
 * system_bridge
 *          ↓
 * composed RuntimeFeatureDescriptor
 *
 * system_bridge should consume:
 *
 * getActorOwnedFeatureBridgeSource(...)
 *
 * rather than reaching into actor/item native data.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getActorOwnedFeatureRegistryDiagnostics() {
  let featureCount =
    0;

  let actionCount =
    0;

  for (
    const entry of
      ACTOR_FEATURE_REGISTRY.values()
  ) {
    featureCount +=
      entry.features.size;

    actionCount +=
      entry.actions.size;
  }

  return Object.freeze({
    id:
      ACTOR_OWNED_FEATURE_REGISTRY_MODULE_ID,

    version:
      ACTOR_OWNED_FEATURE_REGISTRY_MODULE_VERSION,

    actorScopeCount:
      ACTOR_FEATURE_REGISTRY.size,

    featureCount,

    actionCount,

    globalFeatureIndexCount:
      FEATURE_INDEX.size,

    globalActionIndexCount:
      ACTION_INDEX.size,

    actorScopeIds:
      Object.freeze([
        ...ACTOR_FEATURE_REGISTRY.keys()
      ])
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * native_adapter/
 * ---------------
 *
 * Feeds discovery adapter.
 *
 *
 * actor-owned-feature-discovery.js
 * --------------------------------
 *
 * Finds raw native ownership.
 *
 *
 * actor-owned-feature-normalizer.js
 * ---------------------------------
 *
 * Produces safe normalized descriptors.
 *
 *
 * existing Frame Conn registry
 * ----------------------------
 *
 * Remains separate until system_bridge.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Later consumes bridge/runtime descriptors for execution.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Later executes selected runtime mechanics.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns feature resource state.
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns action costs.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Owns trigger event transport.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Owns expiration/reset timing.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Owns target acquisition/validation.
 *
 *
 * system_bridge/
 * --------------
 *
 * Next composition layer after foundational actor-owned registry is
 * established.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * actor-owned-feature-registry.js stores normalized descriptors only.
 *
 * INVARIANT 2
 * Native actors/items are accessed through discovery, never directly here.
 *
 * INVARIANT 3
 * Refresh pipeline is discovery → normalization → atomic actor-scope
 * replacement.
 *
 * INVARIANT 4
 * Pilot and mech ownership remain distinct inside one linked actor scope.
 *
 * INVARIANT 5
 * Feature identity remains native/provenance-stable.
 *
 * INVARIANT 6
 * Action identity remains linked to parent feature.
 *
 * INVARIANT 7
 * Existing Frame Conn registry remains separate.
 *
 * INVARIANT 8
 * Registry does not execute feature mechanics.
 *
 * INVARIANT 9
 * Registry does not infer missing runtime semantics.
 *
 * INVARIANT 10
 * PARTIAL_NATIVE/SEMANTIC_ONLY/UNKNOWN features remain valid registry
 * entries.
 *
 * INVARIANT 11
 * resource_service remains resource authority.
 *
 * INVARIANT 12
 * action_economy remains economy authority.
 *
 * INVARIANT 13
 * lifecycle_service remains lifecycle authority.
 *
 * INVARIANT 14
 * targeting_spatial_service remains targeting authority.
 *
 * INVARIANT 15
 * semantic_event_bus remains event transport authority.
 *
 * INVARIANT 16
 * system_bridge consumes this normalized registry and performs later
 * supplementation/composition.
 */