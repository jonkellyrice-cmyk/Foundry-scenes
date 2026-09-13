/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/system_bridge/system-bridge-resolver.js
 */

/**
 * @file
 * @path main/system_bridge/system-bridge-resolver.js
 * @module system-bridge-resolver
 * @layer system-bridge-resolution
 * @responsibility resolve-existing-registry-actor-owned-and-augmentation-sources-into-one-bridge-resolution-result
 * @public-boundary false
 * @side-effects delegated-registry-read-only
 *
 * @depends-on
 * - system-bridge-contract
 * - system-bridge-augmentation-registry
 * - actor_owned_feature_registry/actor-owned-feature-service
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - existing Frame Conn registry remains a separate source
 * - existing registry access is injected through a resolver adapter
 * - actor_owned_feature_registry/ is consumed through its public service
 * - augmentation matching is delegated to augmentation registry
 * - system-bridge-composer.js consumes this resolver output
 *
 * THIS FILE OWNS:
 * - bridge identity resolution
 * - existing registry source lookup
 * - actor-owned feature/action lookup
 * - augmentation lookup
 * - source reference construction
 * - ambiguity detection
 * - resolution status
 * - resolver diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - field precedence
 * - field merge/composition
 * - execution
 * - native actor/item discovery
 * - augmentation storage
 * - existing registry implementation
 *
 * EDIT CONTRACT:
 * - read sources only
 * - preserve separate source identities
 * - prefer stable IDs
 * - do not compose fields here
 * - do not execute mechanics
 * - do not read Foundry globals directly
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  SYSTEM_BRIDGE_AUTHORITY,
  SYSTEM_BRIDGE_RESOLUTION_STATUS,
  SYSTEM_BRIDGE_SOURCE_KIND,
  SYSTEM_BRIDGE_SUBJECT_KIND,
  createSystemBridgeConflict,
  createSystemBridgeIdentity,
  createSystemBridgeResolutionRequest,
  createSystemBridgeResolutionResult,
  createSystemBridgeSourceReference,
  createSystemBridgeWarning
} from "./system-bridge-contract.js";

import {
  findMatchingSystemBridgeAugmentations
} from "./system-bridge-augmentation-registry.js";

import {
  findActorOwnedFeature,
  findActorOwnedFeatureAction,
  getActorOwnedFeature,
  getActorOwnedFeatureActionEntry,
  getActorOwnedFeatureBridgeSource,
  getActorOwnedFeatureRegistryScopeId,
  getActorOwnedFeatures,
  hasActorOwnedFeatureRegistry
} from "./actor_owned_feature_registry/actor-owned-feature-service.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const SYSTEM_BRIDGE_RESOLVER_MODULE_ID =
  "lancer-frame-conn.system-bridge-resolver";

export const SYSTEM_BRIDGE_RESOLVER_MODULE_VERSION =
  1;

/* ============================================================
   EXISTING REGISTRY RESOLVER ADAPTER
   ============================================================ */

/**
 * @section existing-registry-resolver-adapter
 *
 * Existing Frame Conn registry shape predates system_bridge.
 *
 * Rather than coupling this resolver to one registry implementation,
 * runtime composition injects the lookup boundary.
 *
 * Recommended interface:
 *
 * {
 *   getById(registryId, context?)
 *
 *   findByFeatureId(featureId, context?)
 *
 *   findByActionId(actionId, context?)
 *
 *   findByName(name, context?)
 *
 *   resolve(request, context?)
 * }
 *
 * All methods are optional.
 *
 * resolve(request) may provide the canonical lookup for the actual current
 * registry and supersede the convenience methods.
 */

let existingRegistryResolverAdapter =
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

function normalizeArray(value) {
  if (value == null) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}

function uniqueByIdentity(
  values,
  identityResolver
) {
  const results = [];
  const seen = new Set();

  for (
    const value of
      values ?? []
  ) {
    if (!value) {
      continue;
    }

    const identity =
      identityResolver(
        value
      );

    if (
      identity != null &&
      seen.has(identity)
    ) {
      continue;
    }

    if (identity != null) {
      seen.add(identity);
    }

    results.push(value);
  }

  return Object.freeze(results);
}

/* ============================================================
   EXISTING REGISTRY ADAPTER CONFIGURATION
   ============================================================ */

export function setSystemBridgeExistingRegistryResolverAdapter(
  adapter
) {
  if (adapter == null) {
    existingRegistryResolverAdapter =
      null;

    return true;
  }

  if (!isObject(adapter)) {
    throw new TypeError(
      "System bridge existing registry resolver adapter must be object or null."
    );
  }

  existingRegistryResolverAdapter =
    adapter;

  return true;
}

export function getSystemBridgeExistingRegistryResolverAdapter() {
  return existingRegistryResolverAdapter;
}

export function hasSystemBridgeExistingRegistryResolverAdapter() {
  return Boolean(
    existingRegistryResolverAdapter
  );
}

/* ============================================================
   REQUEST NORMALIZATION
   ============================================================ */

export function normalizeSystemBridgeResolutionRequest(
  value
) {
  if (!value) {
    return createSystemBridgeResolutionRequest();
  }

  if (
    Object.isFrozen(value) &&
    Object.prototype.hasOwnProperty.call(
      value,
      "subjectKind"
    )
  ) {
    return value;
  }

  return createSystemBridgeResolutionRequest(
    value
  );
}

/* ============================================================
   ACTOR SCOPE RESOLUTION
   ============================================================ */

function resolveActorScopeId(
  request
) {
  return (
    request.actorScopeId ??
    request.actorOwnedFeature
      ?.identity
      ?.actorUuid ??
    request.actorOwnedFeature
      ?.identity
      ?.mechUuid ??
    request.actorOwnedFeature
      ?.identity
      ?.pilotUuid ??
    null
  );
}

/* ============================================================
   SUBJECT KIND DERIVATION
   ============================================================ */

function deriveSubjectKind(
  request,
  {
    actorOwnedFeature = null,
    actorOwnedAction = null,
    existingRegistry = null
  } = {}
) {
  if (
    request.subjectKind &&
    request.subjectKind !==
      SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN
  ) {
    return request.subjectKind;
  }

  if (
    request.actionId ||
    actorOwnedAction
  ) {
    return SYSTEM_BRIDGE_SUBJECT_KIND.ACTION;
  }

  if (
    finiteNumber(
      request.profileIndex
    )
  ) {
    return SYSTEM_BRIDGE_SUBJECT_KIND.WEAPON_PROFILE;
  }

  if (
    finiteNumber(
      request.talentRank
    )
  ) {
    return SYSTEM_BRIDGE_SUBJECT_KIND.TALENT_RANK;
  }

  if (
    request.featureId ||
    actorOwnedFeature
  ) {
    return SYSTEM_BRIDGE_SUBJECT_KIND.FEATURE;
  }

  if (
    request.registryId ||
    existingRegistry
  ) {
    return SYSTEM_BRIDGE_SUBJECT_KIND.UNIVERSAL_ACTION;
  }

  return SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN;
}

/* ============================================================
   EXISTING REGISTRY IDENTITY HELPERS
   ============================================================ */

function getExistingRegistryIdentity(
  value
) {
  if (!value) {
    return null;
  }

  return (
    value.id ??
    value.registryId ??
    value.actionId ??
    value.key ??
    value.slug ??
    value.lid ??
    null
  );
}

/* ============================================================
   EXISTING REGISTRY SOURCE RESOLUTION
   ============================================================ */

async function resolveExistingRegistrySource(
  request,
  context = null
) {
  if (
    request.existingRegistryEntry
  ) {
    return request.existingRegistryEntry;
  }

  const adapter =
    existingRegistryResolverAdapter;

  if (!adapter) {
    return null;
  }

  if (
    typeof adapter.resolve ===
    "function"
  ) {
    const resolved =
      await adapter.resolve(
        request,
        context
      );

    if (resolved != null) {
      return resolved;
    }
  }

  if (
    request.registryId &&
    typeof adapter.getById ===
      "function"
  ) {
    const resolved =
      await adapter.getById(
        request.registryId,
        context
      );

    if (resolved != null) {
      return resolved;
    }
  }

  if (
    request.actionId &&
    typeof adapter.findByActionId ===
      "function"
  ) {
    const resolved =
      await adapter.findByActionId(
        request.actionId,
        context
      );

    if (resolved != null) {
      return resolved;
    }
  }

  if (
    request.featureId &&
    typeof adapter.findByFeatureId ===
      "function"
  ) {
    const resolved =
      await adapter.findByFeatureId(
        request.featureId,
        context
      );

    if (resolved != null) {
      return resolved;
    }
  }

  if (
    request.name &&
    typeof adapter.findByName ===
      "function"
  ) {
    return adapter.findByName(
      request.name,
      context
    );
  }

  return null;
}

/* ============================================================
   ACTOR-OWNED DIRECT REQUEST SOURCE
   ============================================================ */

function resolveDirectActorOwnedSource(
  request
) {
  if (
    request.actorOwnedAction
  ) {
    return Object.freeze({
      feature:
        request.actorOwnedFeature ??
        null,

      action:
        request.actorOwnedAction
    });
  }

  if (
    request.actorOwnedFeature
  ) {
    return Object.freeze({
      feature:
        request.actorOwnedFeature,

      action:
        null
    });
  }

  return null;
}

/* ============================================================
   ACTOR-OWNED ACTION RESOLUTION
   ============================================================ */

function resolveActorOwnedActionById(
  request,
  actorScopeId
) {
  if (!request.actionId) {
    return null;
  }

  if (
    actorScopeId &&
    hasActorOwnedFeatureRegistry(
      actorScopeId
    )
  ) {
    const scoped =
      getActorOwnedFeatureActionEntry(
        actorScopeId,
        request.actionId
      );

    if (scoped) {
      return scoped;
    }
  }

  const global =
    findActorOwnedFeatureAction(
      request.actionId
    );

  if (!global) {
    return null;
  }

  return Object.freeze({
    feature:
      global.feature,

    action:
      global.action,

    actorScopeId:
      global.actorScopeId
  });
}

/* ============================================================
   ACTOR-OWNED FEATURE RESOLUTION
   ============================================================ */

function resolveActorOwnedFeatureById(
  request,
  actorScopeId
) {
  if (!request.featureId) {
    return null;
  }

  if (
    actorScopeId &&
    hasActorOwnedFeatureRegistry(
      actorScopeId
    )
  ) {
    const scoped =
      getActorOwnedFeature(
        actorScopeId,
        request.featureId
      );

    if (scoped) {
      return Object.freeze({
        feature:
          scoped,

        action:
          null,

        actorScopeId
      });
    }
  }

  const global =
    findActorOwnedFeature(
      request.featureId
    );

  if (!global) {
    return null;
  }

  return Object.freeze({
    feature:
      global.feature,

    action:
      null,

    actorScopeId:
      global.actorScopeId
  });
}

/* ============================================================
   ACTOR-OWNED ITEM MATCHING
   ============================================================ */

function matchesActorOwnedItemIdentity(
  feature,
  request
) {
  const identity =
    feature?.identity;

  if (!identity) {
    return false;
  }

  if (
    request.itemUuid != null &&
    identity.itemUuid !==
      request.itemUuid
  ) {
    return false;
  }

  if (
    request.itemId != null &&
    identity.itemId !==
      request.itemId
  ) {
    return false;
  }

  if (
    request.itemLid != null &&
    identity.itemLid !==
      request.itemLid
  ) {
    return false;
  }

  return true;
}

/* ============================================================
   ACTOR-OWNED PROFILE / RANK ACTION FILTER
   ============================================================ */

function matchesActorOwnedActionSubIdentity(
  action,
  request
) {
  if (!action) {
    return false;
  }

  if (
    finiteNumber(
      request.profileIndex
    ) &&
    action
      ?.metadata
      ?.profileIndex !==
      request.profileIndex
  ) {
    return false;
  }

  if (
    finiteNumber(
      request.talentRank
    ) &&
    action
      ?.metadata
      ?.talentRank !==
      request.talentRank
  ) {
    return false;
  }

  return true;
}

/* ============================================================
   ACTOR-OWNED ITEM / PROFILE / RANK SEARCH
   ============================================================ */

function resolveActorOwnedByStructuredIdentity(
  request,
  actorScopeId
) {
  if (!actorScopeId) {
    return Object.freeze([]);
  }

  if (
    !hasActorOwnedFeatureRegistry(
      actorScopeId
    )
  ) {
    return Object.freeze([]);
  }

  const features =
    getActorOwnedFeatures(
      actorScopeId
    );

  const candidates = [];

  for (
    const feature of
      features
  ) {
    if (
      (
        request.itemUuid ||
        request.itemId ||
        request.itemLid
      ) &&
      !matchesActorOwnedItemIdentity(
        feature,
        request
      )
    ) {
      continue;
    }

    if (
      request.name &&
      !(
        request.itemUuid ||
        request.itemId ||
        request.itemLid ||
        request.featureId ||
        request.actionId
      ) &&
      String(
        feature.name ??
        ""
      ).trim().toLowerCase() !==
        String(
          request.name
        ).trim().toLowerCase()
    ) {
      continue;
    }

    const matchingActions =
      (
        feature.actions ??
        []
      ).filter(
        action =>
          matchesActorOwnedActionSubIdentity(
            action,
            request
          )
      );

    if (
      request.actionId
    ) {
      const exactAction =
        matchingActions.find(
          action =>
            action.id ===
            request.actionId
        );

      if (!exactAction) {
        continue;
      }

      candidates.push(
        Object.freeze({
          feature,
          action:
            exactAction,
          actorScopeId
        })
      );

      continue;
    }

    if (
      finiteNumber(
        request.profileIndex
      ) ||
      finiteNumber(
        request.talentRank
      )
    ) {
      for (
        const action of
          matchingActions
      ) {
        candidates.push(
          Object.freeze({
            feature,
            action,
            actorScopeId
          })
        );
      }

      continue;
    }

    candidates.push(
      Object.freeze({
        feature,
        action:
          null,
        actorScopeId
      })
    );
  }

  return uniqueByIdentity(
    candidates,
    candidate =>
      candidate.action?.id ??
      candidate.feature
        ?.identity
        ?.id ??
      null
  );
}

/* ============================================================
   ACTOR-OWNED SOURCE RESOLUTION
   ============================================================ */

function resolveActorOwnedSource(
  request,
  actorScopeId
) {
  const direct =
    resolveDirectActorOwnedSource(
      request
    );

  if (direct) {
    return Object.freeze({
      status:
        "resolved",

      candidates:
        Object.freeze([
          direct
        ])
    });
  }

  const byAction =
    resolveActorOwnedActionById(
      request,
      actorScopeId
    );

  if (byAction) {
    return Object.freeze({
      status:
        "resolved",

      candidates:
        Object.freeze([
          byAction
        ])
    });
  }

  const byFeature =
    resolveActorOwnedFeatureById(
      request,
      actorScopeId
    );

  if (
    byFeature &&
    !finiteNumber(
      request.profileIndex
    ) &&
    !finiteNumber(
      request.talentRank
    )
  ) {
    return Object.freeze({
      status:
        "resolved",

      candidates:
        Object.freeze([
          byFeature
        ])
    });
  }

  const structured =
    resolveActorOwnedByStructuredIdentity(
      request,
      actorScopeId
    );

  if (
    structured.length ===
    1
  ) {
    return Object.freeze({
      status:
        "resolved",

      candidates:
        structured
    });
  }

  if (
    structured.length >
    1
  ) {
    return Object.freeze({
      status:
        "ambiguous",

      candidates:
        structured
    });
  }

  return Object.freeze({
    status:
      "not-found",

    candidates:
      Object.freeze([])
  });
}

/* ============================================================
   RESOLVED ACTOR-OWNED PRIMARY CANDIDATE
   ============================================================ */

function getPrimaryActorOwnedCandidate(
  actorOwnedResolution
) {
  return (
    actorOwnedResolution
      ?.candidates
      ?.[0] ??
    null
  );
}

/* ============================================================
   BRIDGE IDENTITY CONSTRUCTION
   ============================================================ */

function buildResolvedBridgeIdentity(
  request,
  {
    actorScopeId = null,
    actorOwned = null,
    existingRegistry = null
  } = {}
) {
  const feature =
    actorOwned?.feature ??
    null;

  const action =
    actorOwned?.action ??
    null;

  const featureIdentity =
    feature?.identity ??
    null;

  const subjectKind =
    deriveSubjectKind(
      request,
      {
        actorOwnedFeature:
          feature,

        actorOwnedAction:
          action,

        existingRegistry
      }
    );

  const existingRegistryId =
    request.registryId ??
    getExistingRegistryIdentity(
      existingRegistry
    );

  const featureId =
    request.featureId ??
    featureIdentity?.id ??
    null;

  const actionId =
    request.actionId ??
    action?.id ??
    null;

  const itemUuid =
    request.itemUuid ??
    featureIdentity?.itemUuid ??
    null;

  const itemId =
    request.itemId ??
    featureIdentity?.itemId ??
    null;

  const itemLid =
    request.itemLid ??
    featureIdentity?.itemLid ??
    null;

  const profileIndex =
    finiteNumber(
      request.profileIndex
    )
      ? request.profileIndex
      : finiteNumber(
          action
            ?.metadata
            ?.profileIndex
        )
        ? action.metadata.profileIndex
        : finiteNumber(
            featureIdentity?.profileIndex
          )
          ? featureIdentity.profileIndex
          : null;

  const talentRank =
    finiteNumber(
      request.talentRank
    )
      ? request.talentRank
      : finiteNumber(
          action
            ?.metadata
            ?.talentRank
        )
        ? action.metadata.talentRank
        : finiteNumber(
            featureIdentity?.rank
          )
          ? featureIdentity.rank
          : null;

  const name =
    request.name ??
    action?.name ??
    feature?.name ??
    existingRegistry?.name ??
    existingRegistry?.label ??
    null;

  const identityId =
    actionId ??
    featureId ??
    existingRegistryId ??
    itemUuid ??
    (
      actorScopeId &&
      itemLid
        ? `${actorScopeId}:${itemLid}`
        : null
    ) ??
    (
      name
        ? `name:${String(name).trim().toLowerCase()}`
        : "unresolved"
    );

  return createSystemBridgeIdentity({
    id:
      identityId,

    subjectKind,

    actorScopeId,

    actorUuid:
      featureIdentity?.actorUuid ??
      null,

    pilotUuid:
      featureIdentity?.pilotUuid ??
      null,

    mechUuid:
      featureIdentity?.mechUuid ??
      null,

    featureId,
    actionId,

    registryId:
      existingRegistryId,

    itemUuid,
    itemId,
    itemLid,

    profileIndex,

    profileName:
      action
        ?.metadata
        ?.profileName ??
      featureIdentity?.profileName ??
      null,

    talentRank,

    name,

    metadata: {
      resolver:
        SYSTEM_BRIDGE_RESOLVER_MODULE_ID
    }
  });
}

/* ============================================================
   SOURCE REFERENCE CONSTRUCTION
   ============================================================ */

function createExistingRegistrySourceReference(
  existingRegistry,
  identity
) {
  if (!existingRegistry) {
    return null;
  }

  return createSystemBridgeSourceReference({
    sourceKind:
      SYSTEM_BRIDGE_SOURCE_KIND.EXISTING_REGISTRY,

    sourceId:
      getExistingRegistryIdentity(
        existingRegistry
      ),

    identity,

    authority:
      SYSTEM_BRIDGE_AUTHORITY.EXISTING_REGISTRY,

    value:
      existingRegistry
  });
}

function createActorOwnedSourceReference(
  actorOwned,
  identity
) {
  if (!actorOwned) {
    return null;
  }

  const feature =
    actorOwned.feature ??
    null;

  const action =
    actorOwned.action ??
    null;

  const sourceId =
    action?.id ??
    feature?.identity?.id ??
    null;

  return createSystemBridgeSourceReference({
    sourceKind:
      SYSTEM_BRIDGE_SOURCE_KIND.ACTOR_OWNED,

    sourceId,

    identity,

    authority:
      SYSTEM_BRIDGE_AUTHORITY.STRUCTURED_NATIVE,

    value:
      Object.freeze({
        feature,
        action,

        actorScopeId:
          actorOwned.actorScopeId ??
          null
      })
  });
}

/* ============================================================
   AUGMENTATION SOURCE REFERENCES
   ============================================================ */

function createAugmentationSourceReferences(
  augmentationMatches,
  identity
) {
  return Object.freeze(
    (
      augmentationMatches ??
      []
    ).map(
      match =>
        createSystemBridgeSourceReference({
          sourceKind:
            SYSTEM_BRIDGE_SOURCE_KIND.AUGMENTATION,

          sourceId:
            match
              .augmentation
              .identity
              .id,

          identity,

          authority:
            SYSTEM_BRIDGE_AUTHORITY.AUGMENTATION,

          value:
            match.augmentation,

          metadata: {
            matchStrength:
              match.strength,

            matchScore:
              match.score,

            matchedFields:
              match.matchedFields
          }
        })
    )
  );
}

/* ============================================================
   AUGMENTATION RESOLUTION
   ============================================================ */

function resolveAugmentationsForIdentity(
  identity
) {
  return findMatchingSystemBridgeAugmentations(
    identity,
    {
      enabledOnly:
        true,

      includeFallbackScan:
        true
    }
  );
}

/* ============================================================
   ACTOR-OWNED AMBIGUITY CONFLICT
   ============================================================ */

function createActorOwnedAmbiguityConflict(
  candidates
) {
  return createSystemBridgeConflict({
    field:
      "identity",

    kind:
      "identity-ambiguity",

    message:
      "Multiple actor-owned features/actions match the bridge resolution request.",

    blocking:
      true,

    metadata: {
      candidateIds:
        Object.freeze(
          candidates.map(
            candidate =>
              candidate.action?.id ??
              candidate.feature
                ?.identity
                ?.id ??
              null
          )
        )
    }
  });
}

/* ============================================================
   MISSING SOURCE WARNINGS
   ============================================================ */

function createMissingSourceWarnings({
  existingRegistry,
  actorOwned,
  actorScopeId
}) {
  const warnings = [];

  if (
    !existingRegistry &&
    hasSystemBridgeExistingRegistryResolverAdapter()
  ) {
    warnings.push(
      createSystemBridgeWarning({
        code:
          "existing-registry-source-not-found",

        message:
          "No existing Frame Conn registry entry matched the bridge request.",

        field:
          "existingRegistry"
      })
    );
  }

  if (
    !actorOwned &&
    actorScopeId
  ) {
    warnings.push(
      createSystemBridgeWarning({
        code:
          "actor-owned-source-not-found",

        message:
          "No actor-owned feature/action matched the bridge request.",

        field:
          "actorOwned",

        metadata: {
          actorScopeId
        }
      })
    );
  }

  return Object.freeze(
    warnings
  );
}

/* ============================================================
   PRIMARY RESOLUTION
   ============================================================ */

/**
 * @section primary-resolution
 *
 * Resolution:
 *
 * request
 *   ↓
 * existing registry source
 *   +
 * actor-owned source
 *   ↓
 * normalized bridge identity
 *   ↓
 * augmentation matches
 *   ↓
 * SystemBridgeResolutionResult
 *
 * No field composition occurs here.
 */

export async function resolveSystemBridgeSources(
  requestValue,
  {
    context = null
  } = {}
) {
  const request =
    normalizeSystemBridgeResolutionRequest(
      requestValue
    );

  const actorScopeId =
    resolveActorScopeId(
      request
    ) ??
    getActorOwnedFeatureRegistryScopeId(
      request.actorScopeId ??
      request.actorOwnedFeature ??
      null
    );

  let existingRegistry;

  try {
    existingRegistry =
      await resolveExistingRegistrySource(
        request,
        context
      );
  } catch (error) {
    return createSystemBridgeResolutionResult({
      status:
        SYSTEM_BRIDGE_RESOLUTION_STATUS.FAILED,

      request,

      reason:
        "existing-registry-resolution-failed",

      error,

      metadata: {
        actorScopeId
      }
    });
  }

  let actorOwnedResolution;

  try {
    actorOwnedResolution =
      resolveActorOwnedSource(
        request,
        actorScopeId
      );
  } catch (error) {
    return createSystemBridgeResolutionResult({
      status:
        SYSTEM_BRIDGE_RESOLUTION_STATUS.FAILED,

      request,

      existingRegistry,

      reason:
        "actor-owned-resolution-failed",

      error,

      metadata: {
        actorScopeId
      }
    });
  }

  if (
    actorOwnedResolution.status ===
    "ambiguous"
  ) {
    const conflict =
      createActorOwnedAmbiguityConflict(
        actorOwnedResolution.candidates
      );

    return createSystemBridgeResolutionResult({
      status:
        SYSTEM_BRIDGE_RESOLUTION_STATUS.AMBIGUOUS,

      request,

      existingRegistry,

      actorOwned:
        null,

      conflicts: [
        conflict
      ],

      reason:
        "actor-owned-source-ambiguous",

      metadata: {
        actorScopeId,

        candidates:
          actorOwnedResolution.candidates
      }
    });
  }

  const actorOwned =
    getPrimaryActorOwnedCandidate(
      actorOwnedResolution
    );

  const identity =
    buildResolvedBridgeIdentity(
      request,
      {
        actorScopeId:
          actorOwned?.actorScopeId ??
          actorScopeId,

        actorOwned,

        existingRegistry
      }
    );

  const augmentationMatches =
    resolveAugmentationsForIdentity(
      identity
    );

  const sources = [];

  const existingSource =
    createExistingRegistrySourceReference(
      existingRegistry,
      identity
    );

  if (existingSource) {
    sources.push(
      existingSource
    );
  }

  const actorOwnedSource =
    createActorOwnedSourceReference(
      actorOwned,
      identity
    );

  if (actorOwnedSource) {
    sources.push(
      actorOwnedSource
    );
  }

  const augmentationSources =
    createAugmentationSourceReferences(
      augmentationMatches,
      identity
    );

  sources.push(
    ...augmentationSources
  );

  const warnings =
    createMissingSourceWarnings({
      existingRegistry,
      actorOwned,
      actorScopeId
    });

  if (
    sources.length ===
    0
  ) {
    return createSystemBridgeResolutionResult({
      status:
        SYSTEM_BRIDGE_RESOLUTION_STATUS.NOT_FOUND,

      request,

      identity,

      sources:
        [],

      existingRegistry:
        null,

      actorOwned:
        null,

      augmentations:
        [],

      warnings,

      reason:
        "no-bridge-sources-resolved",

      metadata: {
        actorScopeId
      }
    });
  }

  const hasPrimarySource =
    Boolean(
      existingRegistry ||
      actorOwned
    );

  const status =
    hasPrimarySource
      ? SYSTEM_BRIDGE_RESOLUTION_STATUS.RESOLVED
      : SYSTEM_BRIDGE_RESOLUTION_STATUS.PARTIAL;

  return createSystemBridgeResolutionResult({
    status,

    request,

    identity,

    sources,

    existingRegistry,

    actorOwned,

    augmentations:
      augmentationMatches,

    warnings,

    conflicts:
      [],

    metadata: {
      actorScopeId,

      actorOwnedBridgeSource:
        actorScopeId &&
        hasActorOwnedFeatureRegistry(
          actorScopeId
        )
          ? getActorOwnedFeatureBridgeSource(
              actorScopeId
            )
          : null
    }
  });
}

/* ============================================================
   RESOLVE EXISTING REGISTRY ONLY
   ============================================================ */

export async function resolveSystemBridgeExistingRegistrySource(
  requestValue,
  {
    context = null
  } = {}
) {
  const request =
    normalizeSystemBridgeResolutionRequest(
      requestValue
    );

  return resolveExistingRegistrySource(
    request,
    context
  );
}

/* ============================================================
   RESOLVE ACTOR-OWNED ONLY
   ============================================================ */

export function resolveSystemBridgeActorOwnedSource(
  requestValue
) {
  const request =
    normalizeSystemBridgeResolutionRequest(
      requestValue
    );

  const actorScopeId =
    resolveActorScopeId(
      request
    ) ??
    getActorOwnedFeatureRegistryScopeId(
      request.actorScopeId ??
      request.actorOwnedFeature ??
      null
    );

  return resolveActorOwnedSource(
    request,
    actorScopeId
  );
}

/* ============================================================
   RESOLVE AUGMENTATIONS ONLY
   ============================================================ */

export function resolveSystemBridgeAugmentations(
  value
) {
  const identity =
    value?.identity ??
    value;

  return resolveAugmentationsForIdentity(
    identity
  );
}

/* ============================================================
   RESOLUTION PREDICATES
   ============================================================ */

export function didSystemBridgeResolutionResolve(
  result
) {
  return Boolean(
    result &&
    (
      result.status ===
        SYSTEM_BRIDGE_RESOLUTION_STATUS.RESOLVED ||
      result.status ===
        SYSTEM_BRIDGE_RESOLUTION_STATUS.PARTIAL
    )
  );
}

export function wasSystemBridgeResolutionAmbiguous(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_RESOLUTION_STATUS.AMBIGUOUS
  );
}

export function didSystemBridgeResolutionFail(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_RESOLUTION_STATUS.FAILED
  );
}

export function wasSystemBridgeResolutionNotFound(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_RESOLUTION_STATUS.NOT_FOUND
  );
}

/* ============================================================
   SOURCE ACCESS HELPERS
   ============================================================ */

export function getSystemBridgeResolvedExistingRegistry(
  result
) {
  return (
    result?.existingRegistry ??
    null
  );
}

export function getSystemBridgeResolvedActorOwned(
  result
) {
  return (
    result?.actorOwned ??
    null
  );
}

export function getSystemBridgeResolvedAugmentations(
  result
) {
  return freezeArray(
    result?.augmentations ??
    []
  );
}

/* ============================================================
   SOURCE KIND LOOKUP
   ============================================================ */

export function getSystemBridgeSourcesByKind(
  result,
  sourceKind
) {
  return Object.freeze(
    (
      result?.sources ??
      []
    ).filter(
      source =>
        source.sourceKind ===
        sourceKind
    )
  );
}

/* ============================================================
   PRIMARY SOURCE LOOKUP
   ============================================================ */

export function getSystemBridgePrimarySource(
  result
) {
  if (!result) {
    return null;
  }

  const actorOwned =
    getSystemBridgeSourcesByKind(
      result,
      SYSTEM_BRIDGE_SOURCE_KIND.ACTOR_OWNED
    )[0];

  if (actorOwned) {
    return actorOwned;
  }

  const existing =
    getSystemBridgeSourcesByKind(
      result,
      SYSTEM_BRIDGE_SOURCE_KIND.EXISTING_REGISTRY
    )[0];

  if (existing) {
    return existing;
  }

  return (
    result.sources?.[0] ??
    null
  );
}

/* ============================================================
   ACTOR OWNED SOURCE RULE
   ============================================================ */

/**
 * @section actor-owned-source-rule
 *
 * Resolver consumes actor_owned_feature_registry public API only.
 *
 * It does not:
 *
 * inspect actor.items
 * inspect item.system
 * resolve linked pilot/mech natively
 * inspect native execution directly
 *
 * Those responsibilities remain below the registry/native adapter.
 */

/* ============================================================
   EXISTING REGISTRY SOURCE RULE
   ============================================================ */

/**
 * @section existing-registry-source-rule
 *
 * Existing registry access is injected because the old Frame Conn registry
 * predates system_bridge and may have its own storage/query shape.
 *
 * The adapter should translate only lookup mechanics.
 *
 * It should return the original registry entry unchanged.
 *
 * Composer later interprets its fields.
 */

/* ============================================================
   AUGMENTATION SOURCE RULE
   ============================================================ */

/**
 * @section augmentation-source-rule
 *
 * Resolver returns all matching enabled augmentations ordered by the
 * augmentation registry's match score/priority.
 *
 * It does not decide which fields are accepted.
 *
 * Matching quality != field authority.
 */

/* ============================================================
   IDENTITY PRECEDENCE RULE
   ============================================================ */

/**
 * @section identity-precedence-rule
 *
 * Bridge identity is assembled from:
 *
 * explicit request
 * then
 * resolved actor-owned identity
 * then
 * existing registry identity
 *
 * Stable IDs remain preferred over name.
 */

/* ============================================================
   ACTION ID RULE
   ============================================================ */

/**
 * @section action-id-rule
 *
 * actionId is the strongest actor-owned action identity where available.
 *
 * This supports:
 *
 * one feature
 * → several structured actions
 *
 * without treating the feature itself as the executable unit.
 */

/* ============================================================
   PROFILE RULE
   ============================================================ */

/**
 * @section profile-rule
 *
 * profileIndex may distinguish actions from one multi-profile weapon.
 *
 * Request:
 *
 * itemLid + profileIndex
 *
 * can therefore resolve the matching profile/action without merging every
 * profile together.
 */

/* ============================================================
   TALENT RANK RULE
   ============================================================ */

/**
 * @section talent-rank-rule
 *
 * talentRank may distinguish rank-specific Talent actions.
 *
 * Resolver preserves rank identity for augmentation matching and later
 * composition.
 */

/* ============================================================
   NAME FALLBACK RULE
   ============================================================ */

/**
 * @section name-fallback-rule
 *
 * Resolver may use existing-registry adapter name lookup only when the
 * request supplies name.
 *
 * Actor-owned structured identity matching uses name only when stronger IDs
 * are absent.
 *
 * Augmentation name matching remains separately controlled by:
 *
 * allowNameFallback
 */

/* ============================================================
   AMBIGUITY RULE
   ============================================================ */

/**
 * @section ambiguity-rule
 *
 * Multiple actor-owned matches are not guessed.
 *
 * Resolver returns:
 *
 * status = AMBIGUOUS
 *
 * with a blocking identity conflict.
 *
 * Higher callers may request more specific identity.
 */

/* ============================================================
   PARTIAL RESOLUTION RULE
   ============================================================ */

/**
 * @section partial-resolution-rule
 *
 * Augmentation-only matching can produce PARTIAL resolution.
 *
 * Example:
 *
 * curated augmentation matches registryId
 *
 * but existing registry adapter is not yet configured.
 *
 * Composer may inspect that result but should preserve unresolved primary
 * identity/runtime information rather than invent it.
 */

/* ============================================================
   COMPOSER BOUNDARY
   ============================================================ */

/**
 * @section composer-boundary
 *
 * Resolver answers:
 *
 * "What source records correspond to this requested mechanic?"
 *
 * Composer answers:
 *
 * "Which field from those sources becomes the runtime descriptor?"
 *
 * Keep these separate.
 */

/* ============================================================
   EXECUTION BOUNDARY
   ============================================================ */

/**
 * @section execution-boundary
 *
 * Resolver never:
 *
 * executes native action
 * consumes resources
 * spends action economy
 * prompts for targets
 * emits semantic mechanic events
 *
 * It produces source resolution only.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getSystemBridgeResolverDiagnostics() {
  return Object.freeze({
    id:
      SYSTEM_BRIDGE_RESOLVER_MODULE_ID,

    version:
      SYSTEM_BRIDGE_RESOLVER_MODULE_VERSION,

    existingRegistryAdapterConfigured:
      hasSystemBridgeExistingRegistryResolverAdapter(),

    existingRegistryAdapterCapabilities:
      Object.freeze({
        resolve:
          typeof existingRegistryResolverAdapter?.resolve ===
          "function",

        getById:
          typeof existingRegistryResolverAdapter?.getById ===
          "function",

        findByFeatureId:
          typeof existingRegistryResolverAdapter?.findByFeatureId ===
          "function",

        findByActionId:
          typeof existingRegistryResolverAdapter?.findByActionId ===
          "function",

        findByName:
          typeof existingRegistryResolverAdapter?.findByName ===
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
 * existing Frame Conn registry
 * ----------------------------
 *
 * Read through injected resolver adapter.
 *
 * Remains unchanged.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Read through actor-owned-feature-service.js.
 *
 * Remains normalized actor-specific source.
 *
 *
 * augmentation registry
 * ---------------------
 *
 * Supplies matching curated runtime supplements.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Not directly consumed here.
 *
 * Actor-owned/native provenance already carries confirmed native references.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Downstream.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Downstream.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * system-bridge-resolver.js resolves sources but does not compose fields.
 *
 * INVARIANT 2
 * Existing Frame Conn registry remains a separate source.
 *
 * INVARIANT 3
 * Actor-owned registry remains a separate source.
 *
 * INVARIANT 4
 * Augmentation registry remains a separate source.
 *
 * INVARIANT 5
 * Actor-owned access goes through actor-owned-feature-service.js.
 *
 * INVARIANT 6
 * Existing registry access goes through injected adapter.
 *
 * INVARIANT 7
 * Stable IDs are preferred over display name.
 *
 * INVARIANT 8
 * Weapon profile identity remains resolvable.
 *
 * INVARIANT 9
 * Talent rank identity remains resolvable.
 *
 * INVARIANT 10
 * Multiple actor-owned matches return AMBIGUOUS rather than guessing.
 *
 * INVARIANT 11
 * Match quality does not determine field authority.
 *
 * INVARIANT 12
 * Native execution is never invoked here.
 *
 * INVARIANT 13
 * Foundry globals are never accessed here.
 *
 * INVARIANT 14
 * system-bridge-composer.js remains the only bridge layer responsible for
 * field precedence and composition.
 */