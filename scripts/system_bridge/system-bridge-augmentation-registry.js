/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/system_bridge/system-bridge-augmentation-registry.js
 */

/**
 * @file
 * @path main/system_bridge/system-bridge-augmentation-registry.js
 * @module system-bridge-augmentation-registry
 * @layer system-bridge-augmentation-storage
 * @responsibility register-index-match-and-query-curated-runtime-augmentations
 * @public-boundary false
 * @side-effects in-memory-augmentation-registry-mutation
 *
 * @depends-on
 * - system-bridge-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - stores only supplemental runtime metadata
 * - existing Frame Conn registry remains unchanged
 * - actor_owned_feature_registry/ remains unchanged
 * - system-bridge-resolver.js queries this registry during source resolution
 * - system-bridge-composer.js decides whether matched augmentation fields are
 *   accepted during composition
 *
 * THIS FILE OWNS:
 * - augmentation registration
 * - augmentation replacement/removal
 * - stable augmentation indexing
 * - augmentation matching
 * - match scoring
 * - profile/rank/action-specific matching
 * - registry snapshots
 * - diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - bridge source resolution
 * - field composition
 * - precedence decisions
 * - native execution
 * - foundational service mutation
 * - actor/item discovery
 *
 * EDIT CONTRACT:
 * - augmentation is explicit curated data
 * - no semantic prose parsing
 * - no Foundry imports
 * - no Lancer imports
 * - matching prefers stable identifiers
 * - name matching is fallback only and must be explicitly enabled
 * - registration does not mutate augmentation descriptors
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  SYSTEM_BRIDGE_MATCH_STRENGTH,
  SYSTEM_BRIDGE_SUBJECT_KIND,
  createSystemBridgeAugmentationDescriptor,
  createSystemBridgeAugmentationIdentity,
  createSystemBridgeAugmentationMatch,
  createSystemBridgeAugmentationMatchResult,
  createSystemBridgeAugmentationPatch
} from "./system-bridge-contract.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const SYSTEM_BRIDGE_AUGMENTATION_REGISTRY_MODULE_ID =
  "lancer-frame-conn.system-bridge-augmentation-registry";

export const SYSTEM_BRIDGE_AUGMENTATION_REGISTRY_MODULE_VERSION =
  1;

/* ============================================================
   REGISTRY STATE
   ============================================================ */

/**
 * augmentationId → SystemBridgeAugmentationDescriptor
 */

const SYSTEM_BRIDGE_AUGMENTATION_REGISTRY =
  new Map();

/* ============================================================
   SECONDARY INDEXES
   ============================================================ */

/**
 * Secondary indexes improve deterministic exact matching.
 *
 * They are advisory indexes only.
 *
 * Final matching always verifies the descriptor itself.
 */

const AUGMENTATION_IDS_BY_ACTION_ID =
  new Map();

const AUGMENTATION_IDS_BY_FEATURE_ID =
  new Map();

const AUGMENTATION_IDS_BY_ITEM_UUID =
  new Map();

const AUGMENTATION_IDS_BY_ITEM_LID =
  new Map();

const AUGMENTATION_IDS_BY_REGISTRY_ID =
  new Map();

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

function normalizeString(value) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  return normalized || null;
}

function getOrCreateIndexSet(
  index,
  key
) {
  if (
    key == null ||
    key === ""
  ) {
    return null;
  }

  if (!index.has(key)) {
    index.set(
      key,
      new Set()
    );
  }

  return index.get(
    key
  );
}

function addIndexValue(
  index,
  key,
  augmentationId
) {
  const bucket =
    getOrCreateIndexSet(
      index,
      key
    );

  if (!bucket) {
    return;
  }

  bucket.add(
    augmentationId
  );
}

function removeIndexValue(
  index,
  key,
  augmentationId
) {
  if (
    key == null ||
    !index.has(key)
  ) {
    return;
  }

  const bucket =
    index.get(
      key
    );

  bucket.delete(
    augmentationId
  );

  if (
    bucket.size ===
    0
  ) {
    index.delete(
      key
    );
  }
}

function addDescriptorToIndexes(
  descriptor
) {
  const id =
    descriptor.identity.id;

  const match =
    descriptor.match;

  addIndexValue(
    AUGMENTATION_IDS_BY_ACTION_ID,
    match.actionId,
    id
  );

  addIndexValue(
    AUGMENTATION_IDS_BY_FEATURE_ID,
    match.featureId,
    id
  );

  addIndexValue(
    AUGMENTATION_IDS_BY_ITEM_UUID,
    match.itemUuid,
    id
  );

  addIndexValue(
    AUGMENTATION_IDS_BY_ITEM_LID,
    match.itemLid,
    id
  );

  addIndexValue(
    AUGMENTATION_IDS_BY_REGISTRY_ID,
    match.registryId,
    id
  );
}

function removeDescriptorFromIndexes(
  descriptor
) {
  const id =
    descriptor.identity.id;

  const match =
    descriptor.match;

  removeIndexValue(
    AUGMENTATION_IDS_BY_ACTION_ID,
    match.actionId,
    id
  );

  removeIndexValue(
    AUGMENTATION_IDS_BY_FEATURE_ID,
    match.featureId,
    id
  );

  removeIndexValue(
    AUGMENTATION_IDS_BY_ITEM_UUID,
    match.itemUuid,
    id
  );

  removeIndexValue(
    AUGMENTATION_IDS_BY_ITEM_LID,
    match.itemLid,
    id
  );

  removeIndexValue(
    AUGMENTATION_IDS_BY_REGISTRY_ID,
    match.registryId,
    id
  );
}

/* ============================================================
   DESCRIPTOR NORMALIZATION
   ============================================================ */

/**
 * @section descriptor-normalization
 *
 * Registration accepts either:
 *
 * - a complete SystemBridgeAugmentationDescriptor
 * - a plain descriptor-shaped object
 *
 * Plain objects are normalized through contract constructors.
 */

export function normalizeSystemBridgeAugmentationDescriptor(
  value
) {
  if (!value) {
    throw new TypeError(
      "System bridge augmentation descriptor is required."
    );
  }

  if (
    Object.isFrozen(value) &&
    value.identity &&
    value.match &&
    value.patch
  ) {
    return value;
  }

  const identity =
    value.identity?.id
      ? createSystemBridgeAugmentationIdentity(
          value.identity
        )
      : createSystemBridgeAugmentationIdentity({
          id:
            value.id,

          version:
            value.version ??
            1,

          description:
            value.description ??
            null,

          metadata:
            value.identityMetadata ??
            {}
        });

  const match =
    value.match
      ? createSystemBridgeAugmentationMatch(
          value.match
        )
      : createSystemBridgeAugmentationMatch({
          subjectKind:
            value.subjectKind ??
            null,

          actorScopeId:
            value.actorScopeId ??
            null,

          actorUuid:
            value.actorUuid ??
            null,

          featureId:
            value.featureId ??
            null,

          actionId:
            value.actionId ??
            null,

          registryId:
            value.registryId ??
            null,

          itemUuid:
            value.itemUuid ??
            null,

          itemId:
            value.itemId ??
            null,

          itemLid:
            value.itemLid ??
            null,

          profileIndex:
            value.profileIndex ??
            null,

          talentRank:
            value.talentRank ??
            null,

          name:
            value.name ??
            null,

          allowNameFallback:
            value.allowNameFallback ??
            false
        });

  const patch =
    value.patch
      ? createSystemBridgeAugmentationPatch(
          value.patch
        )
      : createSystemBridgeAugmentationPatch({
          mode:
            value.mode,

          presentation:
            value.presentation ??
            null,

          actionEconomy:
            value.actionEconomy ??
            null,

          targeting:
            value.targeting ??
            null,

          resources:
            value.resources ??
            null,

          lifecycle:
            value.lifecycle ??
            null,

          triggers:
            value.triggers ??
            null,

          execution:
            value.execution ??
            null,

          effect:
            value.effect ??
            null,

          metadata:
            value.patchMetadata ??
            {}
        });

  return createSystemBridgeAugmentationDescriptor({
    identity,

    match,

    patch,

    priority:
      value.priority ??
      0,

    enabled:
      value.enabled ??
      true,

    metadata:
      value.metadata ??
      {}
  });
}

/* ============================================================
   REGISTRATION
   ============================================================ */

export function registerSystemBridgeAugmentation(
  value,
  {
    replace = false
  } = {}
) {
  const descriptor =
    normalizeSystemBridgeAugmentationDescriptor(
      value
    );

  const augmentationId =
    descriptor.identity.id;

  const existing =
    SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.get(
      augmentationId
    );

  if (
    existing &&
    !replace
  ) {
    throw new Error(
      `System bridge augmentation already registered: ${augmentationId}`
    );
  }

  if (existing) {
    removeDescriptorFromIndexes(
      existing
    );
  }

  SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.set(
    augmentationId,
    descriptor
  );

  addDescriptorToIndexes(
    descriptor
  );

  return Object.freeze({
    id:
      augmentationId,

    descriptor,

    replaced:
      Boolean(existing),

    dispose() {
      return unregisterSystemBridgeAugmentation(
        augmentationId
      );
    }
  });
}

/* ============================================================
   BATCH REGISTRATION
   ============================================================ */

export function registerSystemBridgeAugmentations(
  values,
  options = {}
) {
  const registrations = [];

  try {
    for (
      const value of
        values ?? []
    ) {
      registrations.push(
        registerSystemBridgeAugmentation(
          value,
          options
        )
      );
    }
  } catch (error) {
    for (
      const registration of
        registrations
    ) {
      registration.dispose();
    }

    throw error;
  }

  return Object.freeze({
    registrations:
      Object.freeze(
        registrations
      ),

    dispose() {
      let removed =
        0;

      for (
        const registration of
          registrations
      ) {
        if (
          registration.dispose()
        ) {
          removed +=
            1;
        }
      }

      return removed;
    }
  });
}

/* ============================================================
   REPLACEMENT
   ============================================================ */

export function replaceSystemBridgeAugmentation(
  value
) {
  return registerSystemBridgeAugmentation(
    value,
    {
      replace:
        true
    }
  );
}

/* ============================================================
   UNREGISTRATION
   ============================================================ */

export function unregisterSystemBridgeAugmentation(
  augmentationId
) {
  if (!requiredString(augmentationId)) {
    return false;
  }

  const existing =
    SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.get(
      augmentationId
    );

  if (!existing) {
    return false;
  }

  removeDescriptorFromIndexes(
    existing
  );

  SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.delete(
    augmentationId
  );

  return true;
}

/* ============================================================
   CLEAR REGISTRY
   ============================================================ */

export function clearSystemBridgeAugmentations() {
  const count =
    SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.size;

  SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.clear();

  AUGMENTATION_IDS_BY_ACTION_ID.clear();
  AUGMENTATION_IDS_BY_FEATURE_ID.clear();
  AUGMENTATION_IDS_BY_ITEM_UUID.clear();
  AUGMENTATION_IDS_BY_ITEM_LID.clear();
  AUGMENTATION_IDS_BY_REGISTRY_ID.clear();

  return count;
}

/* ============================================================
   DIRECT LOOKUP
   ============================================================ */

export function getSystemBridgeAugmentation(
  augmentationId
) {
  if (!requiredString(augmentationId)) {
    return null;
  }

  return (
    SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.get(
      augmentationId
    ) ??
    null
  );
}

export function hasSystemBridgeAugmentation(
  augmentationId
) {
  return SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.has(
    augmentationId
  );
}

/* ============================================================
   LIST AUGMENTATIONS
   ============================================================ */

export function getSystemBridgeAugmentations({
  enabledOnly = false
} = {}) {
  return Object.freeze(
    [
      ...SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.values()
    ]
      .filter(
        descriptor =>
          !enabledOnly ||
          descriptor.enabled
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            second.priority -
            first.priority
          ) ||
          first.identity.id.localeCompare(
            second.identity.id
          )
      )
  );
}

/* ============================================================
   ENABLE / DISABLE
   ============================================================ */

/**
 * @section enable-disable
 *
 * Descriptors are immutable.
 *
 * Changing enabled state replaces the stored descriptor.
 */

export function setSystemBridgeAugmentationEnabled(
  augmentationId,
  enabled
) {
  const existing =
    getSystemBridgeAugmentation(
      augmentationId
    );

  if (!existing) {
    return null;
  }

  if (
    existing.enabled ===
    Boolean(enabled)
  ) {
    return existing;
  }

  const replacement =
    createSystemBridgeAugmentationDescriptor({
      identity:
        existing.identity,

      match:
        existing.match,

      patch:
        existing.patch,

      priority:
        existing.priority,

      enabled:
        Boolean(enabled),

      metadata:
        existing.metadata
    });

  replaceSystemBridgeAugmentation(
    replacement
  );

  return replacement;
}

/* ============================================================
   MATCH SUBJECT NORMALIZATION
   ============================================================ */

/**
 * @section match-subject-normalization
 *
 * Resolver may supply either:
 *
 * SystemBridgeIdentity
 *
 * or
 *
 * request/resolved source-shaped object.
 */

export function normalizeSystemBridgeAugmentationMatchSubject(
  value
) {
  if (!value) {
    return Object.freeze({});
  }

  return Object.freeze({
    subjectKind:
      value.subjectKind ??
      value.identity?.subjectKind ??
      null,

    actorScopeId:
      value.actorScopeId ??
      value.identity?.actorScopeId ??
      null,

    actorUuid:
      value.actorUuid ??
      value.identity?.actorUuid ??
      null,

    featureId:
      value.featureId ??
      value.identity?.featureId ??
      null,

    actionId:
      value.actionId ??
      value.identity?.actionId ??
      null,

    registryId:
      value.registryId ??
      value.identity?.registryId ??
      null,

    itemUuid:
      value.itemUuid ??
      value.identity?.itemUuid ??
      null,

    itemId:
      value.itemId ??
      value.identity?.itemId ??
      null,

    itemLid:
      value.itemLid ??
      value.identity?.itemLid ??
      null,

    profileIndex:
      finiteNumber(
        value.profileIndex
      )
        ? value.profileIndex
        : finiteNumber(
            value.identity?.profileIndex
          )
          ? value.identity.profileIndex
          : null,

    talentRank:
      finiteNumber(
        value.talentRank
      )
        ? value.talentRank
        : finiteNumber(
            value.identity?.talentRank
          )
          ? value.identity.talentRank
          : null,

    name:
      value.name ??
      value.identity?.name ??
      null
  });
}

/* ============================================================
   FIELD MATCH
   ============================================================ */

function compareOptionalMatchField(
  expected,
  actual
) {
  if (
    expected == null
  ) {
    return Object.freeze({
      constrained:
        false,

      matched:
        true
    });
  }

  return Object.freeze({
    constrained:
      true,

    matched:
      expected ===
      actual
  });
}

/* ============================================================
   AUGMENTATION MATCH SCORE
   ============================================================ */

/**
 * @section augmentation-match-score
 *
 * Stable identifier weights:
 *
 * actionId      100
 * itemUuid       90
 * featureId      80
 * itemLid        70
 * registryId     60
 * profileIndex   50
 * talentRank     50
 * itemId         40
 * actorUuid      20
 * actorScopeId   20
 * subjectKind    10
 * name            1
 *
 * Any constrained stable field mismatch rejects the descriptor.
 */

const MATCH_FIELD_WEIGHT =
  Object.freeze({
    actionId:
      100,

    itemUuid:
      90,

    featureId:
      80,

    itemLid:
      70,

    registryId:
      60,

    profileIndex:
      50,

    talentRank:
      50,

    itemId:
      40,

    actorUuid:
      20,

    actorScopeId:
      20,

    subjectKind:
      10,

    name:
      1
  });

/* ============================================================
   SINGLE AUGMENTATION MATCH
   ============================================================ */

export function matchSystemBridgeAugmentation(
  descriptor,
  subject
) {
  if (!descriptor) {
    throw new TypeError(
      "matchSystemBridgeAugmentation requires augmentation descriptor."
    );
  }

  const normalizedSubject =
    normalizeSystemBridgeAugmentationMatchSubject(
      subject
    );

  const match =
    descriptor.match;

  const matchedFields = [];

  let score =
    0;

  let constrainedStableFields =
    0;

  let matchedStableFields =
    0;

  const stableFields = [
    "actionId",
    "itemUuid",
    "featureId",
    "itemLid",
    "registryId",
    "profileIndex",
    "talentRank",
    "itemId",
    "actorUuid",
    "actorScopeId",
    "subjectKind"
  ];

  for (
    const field of
      stableFields
  ) {
    const result =
      compareOptionalMatchField(
        match[field],
        normalizedSubject[field]
      );

    if (!result.constrained) {
      continue;
    }

    constrainedStableFields +=
      1;

    if (!result.matched) {
      return createSystemBridgeAugmentationMatchResult({
        augmentation:
          descriptor,

        strength:
          SYSTEM_BRIDGE_MATCH_STRENGTH.NONE,

        score:
          0,

        matchedFields:
          [],

        metadata: {
          mismatchField:
            field
        }
      });
    }

    matchedStableFields +=
      1;

    score +=
      MATCH_FIELD_WEIGHT[field];

    matchedFields.push(
      field
    );
  }

  /* ----------------------------------------------------------
     NAME FALLBACK
     ---------------------------------------------------------- */

  if (
    match.name != null
  ) {
    if (
      !match.allowNameFallback
    ) {
      /*
       * Name can be descriptive metadata without becoming a matching
       * constraint unless explicitly enabled.
       */
    } else {
      const expectedName =
        normalizeString(
          match.name
        );

      const actualName =
        normalizeString(
          normalizedSubject.name
        );

      if (
        !expectedName ||
        !actualName ||
        expectedName !==
          actualName
      ) {
        return createSystemBridgeAugmentationMatchResult({
          augmentation:
            descriptor,

          strength:
            SYSTEM_BRIDGE_MATCH_STRENGTH.NONE,

          score:
            0,

          matchedFields:
            [],

          metadata: {
            mismatchField:
              "name"
          }
        });
      }

      score +=
        MATCH_FIELD_WEIGHT.name;

      matchedFields.push(
        "name"
      );
    }
  }

  /* ----------------------------------------------------------
     NO CONSTRAINTS
     ---------------------------------------------------------- */

  if (
    constrainedStableFields ===
      0 &&
    !(
      match.allowNameFallback &&
      match.name
    )
  ) {
    return createSystemBridgeAugmentationMatchResult({
      augmentation:
        descriptor,

      strength:
        SYSTEM_BRIDGE_MATCH_STRENGTH.NONE,

      score:
        0,

      matchedFields:
        [],

      metadata: {
        reason:
          "augmentation-match-has-no-constraints"
      }
    });
  }

  /* ----------------------------------------------------------
     STRENGTH
     ---------------------------------------------------------- */

  let strength =
    SYSTEM_BRIDGE_MATCH_STRENGTH.FALLBACK;

  if (
    matchedStableFields >=
      2 ||
    match.actionId ||
    match.itemUuid
  ) {
    strength =
      SYSTEM_BRIDGE_MATCH_STRENGTH.EXACT;
  } else if (
    matchedStableFields ===
    1
  ) {
    strength =
      SYSTEM_BRIDGE_MATCH_STRENGTH.STRONG;
  }

  if (
    matchedStableFields ===
      0 &&
    matchedFields.includes(
      "name"
    )
  ) {
    strength =
      SYSTEM_BRIDGE_MATCH_STRENGTH.FALLBACK;
  }

  return createSystemBridgeAugmentationMatchResult({
    augmentation:
      descriptor,

    strength,

    score,

    matchedFields,

    metadata: {
      constrainedStableFields,
      matchedStableFields
    }
  });
}

/* ============================================================
   INDEX CANDIDATE COLLECTION
   ============================================================ */

function collectIndexedCandidateIds(
  subject
) {
  const normalized =
    normalizeSystemBridgeAugmentationMatchSubject(
      subject
    );

  const ids =
    new Set();

  const indexLookups = [
    [
      AUGMENTATION_IDS_BY_ACTION_ID,
      normalized.actionId
    ],
    [
      AUGMENTATION_IDS_BY_ITEM_UUID,
      normalized.itemUuid
    ],
    [
      AUGMENTATION_IDS_BY_FEATURE_ID,
      normalized.featureId
    ],
    [
      AUGMENTATION_IDS_BY_ITEM_LID,
      normalized.itemLid
    ],
    [
      AUGMENTATION_IDS_BY_REGISTRY_ID,
      normalized.registryId
    ]
  ];

  for (
    const [
      index,
      key
    ] of indexLookups
  ) {
    if (
      key == null
    ) {
      continue;
    }

    for (
      const augmentationId of
        index.get(key) ??
        []
    ) {
      ids.add(
        augmentationId
      );
    }
  }

  return ids;
}

/* ============================================================
   FIND MATCHING AUGMENTATIONS
   ============================================================ */

export function findMatchingSystemBridgeAugmentations(
  subject,
  {
    enabledOnly = true,

    includeFallbackScan = true,

    minimumStrength =
      SYSTEM_BRIDGE_MATCH_STRENGTH.FALLBACK
  } = {}
) {
  const candidateIds =
    collectIndexedCandidateIds(
      subject
    );

  const candidates =
    new Map();

  for (
    const augmentationId of
      candidateIds
  ) {
    const descriptor =
      getSystemBridgeAugmentation(
        augmentationId
      );

    if (descriptor) {
      candidates.set(
        augmentationId,
        descriptor
      );
    }
  }

  /*
   * Needed for:
   *
   * profile-only augmentations
   * Talent-rank-only augmentations
   * actor-scoped augmentations
   * subject-kind augmentations
   * explicitly enabled name fallback
   */
  if (includeFallbackScan) {
    for (
      const descriptor of
        SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.values()
    ) {
      if (
        !candidates.has(
          descriptor.identity.id
        )
      ) {
        candidates.set(
          descriptor.identity.id,
          descriptor
        );
      }
    }
  }

  const strengthRank =
    Object.freeze({
      [SYSTEM_BRIDGE_MATCH_STRENGTH.NONE]:
        0,

      [SYSTEM_BRIDGE_MATCH_STRENGTH.FALLBACK]:
        1,

      [SYSTEM_BRIDGE_MATCH_STRENGTH.STRONG]:
        2,

      [SYSTEM_BRIDGE_MATCH_STRENGTH.EXACT]:
        3
    });

  const minimumRank =
    strengthRank[
      minimumStrength
    ] ??
    1;

  const results = [];

  for (
    const descriptor of
      candidates.values()
  ) {
    if (
      enabledOnly &&
      !descriptor.enabled
    ) {
      continue;
    }

    const result =
      matchSystemBridgeAugmentation(
        descriptor,
        subject
      );

    if (
      strengthRank[result.strength] <
      minimumRank
    ) {
      continue;
    }

    results.push(
      result
    );
  }

  results.sort(
    (
      first,
      second
    ) =>
      (
        second.score -
        first.score
      ) ||
      (
        second
          .augmentation
          .priority -
        first
          .augmentation
          .priority
      ) ||
      first
        .augmentation
        .identity
        .id
        .localeCompare(
          second
            .augmentation
            .identity
            .id
        )
  );

  return Object.freeze(
    results
  );
}

/* ============================================================
   BEST MATCH
   ============================================================ */

export function findBestSystemBridgeAugmentation(
  subject,
  options = {}
) {
  return (
    findMatchingSystemBridgeAugmentations(
      subject,
      options
    )[0] ??
    null
  );
}

/* ============================================================
   EXACT MATCHES
   ============================================================ */

export function findExactSystemBridgeAugmentations(
  subject,
  options = {}
) {
  return findMatchingSystemBridgeAugmentations(
    subject,
    {
      ...options,

      minimumStrength:
        SYSTEM_BRIDGE_MATCH_STRENGTH.EXACT
    }
  );
}

/* ============================================================
   LOOKUP BY ACTION
   ============================================================ */

export function getSystemBridgeAugmentationsForActionId(
  actionId,
  {
    enabledOnly = true
  } = {}
) {
  if (!requiredString(actionId)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...(
        AUGMENTATION_IDS_BY_ACTION_ID.get(
          actionId
        ) ??
        []
      )
    ]
      .map(
        getSystemBridgeAugmentation
      )
      .filter(Boolean)
      .filter(
        descriptor =>
          !enabledOnly ||
          descriptor.enabled
      )
  );
}

/* ============================================================
   LOOKUP BY FEATURE
   ============================================================ */

export function getSystemBridgeAugmentationsForFeatureId(
  featureId,
  {
    enabledOnly = true
  } = {}
) {
  if (!requiredString(featureId)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...(
        AUGMENTATION_IDS_BY_FEATURE_ID.get(
          featureId
        ) ??
        []
      )
    ]
      .map(
        getSystemBridgeAugmentation
      )
      .filter(Boolean)
      .filter(
        descriptor =>
          !enabledOnly ||
          descriptor.enabled
      )
  );
}

/* ============================================================
   LOOKUP BY ITEM
   ============================================================ */

export function getSystemBridgeAugmentationsForItemUuid(
  itemUuid,
  {
    enabledOnly = true
  } = {}
) {
  if (!requiredString(itemUuid)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...(
        AUGMENTATION_IDS_BY_ITEM_UUID.get(
          itemUuid
        ) ??
        []
      )
    ]
      .map(
        getSystemBridgeAugmentation
      )
      .filter(Boolean)
      .filter(
        descriptor =>
          !enabledOnly ||
          descriptor.enabled
      )
  );
}

export function getSystemBridgeAugmentationsForItemLid(
  itemLid,
  {
    enabledOnly = true
  } = {}
) {
  if (!requiredString(itemLid)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...(
        AUGMENTATION_IDS_BY_ITEM_LID.get(
          itemLid
        ) ??
        []
      )
    ]
      .map(
        getSystemBridgeAugmentation
      )
      .filter(Boolean)
      .filter(
        descriptor =>
          !enabledOnly ||
          descriptor.enabled
      )
  );
}

/* ============================================================
   LOOKUP BY EXISTING REGISTRY ID
   ============================================================ */

export function getSystemBridgeAugmentationsForRegistryId(
  registryId,
  {
    enabledOnly = true
  } = {}
) {
  if (!requiredString(registryId)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    [
      ...(
        AUGMENTATION_IDS_BY_REGISTRY_ID.get(
          registryId
        ) ??
        []
      )
    ]
      .map(
        getSystemBridgeAugmentation
      )
      .filter(Boolean)
      .filter(
        descriptor =>
          !enabledOnly ||
          descriptor.enabled
      )
  );
}

/* ============================================================
   GENERIC REGISTRY QUERY
   ============================================================ */

export function querySystemBridgeAugmentations({
  enabled = null,

  subjectKinds = null,

  priorities = null,

  predicate = null
} = {}) {
  const subjectKindSet =
    subjectKinds == null
      ? null
      : new Set(
          Array.isArray(subjectKinds)
            ? subjectKinds
            : [subjectKinds]
        );

  const prioritySet =
    priorities == null
      ? null
      : new Set(
          Array.isArray(priorities)
            ? priorities
            : [priorities]
        );

  return Object.freeze(
    getSystemBridgeAugmentations()
      .filter(
        descriptor => {
          if (
            enabled != null &&
            descriptor.enabled !==
              Boolean(enabled)
          ) {
            return false;
          }

          if (
            subjectKindSet &&
            !subjectKindSet.has(
              descriptor
                .match
                .subjectKind
            )
          ) {
            return false;
          }

          if (
            prioritySet &&
            !prioritySet.has(
              descriptor.priority
            )
          ) {
            return false;
          }

          if (
            typeof predicate ===
              "function" &&
            !predicate(
              descriptor
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
   MATCH VALIDATION
   ============================================================ */

/**
 * @section match-validation
 *
 * Registration should be explicit enough to avoid accidental global
 * augmentation.
 */

export function validateSystemBridgeAugmentationMatch(
  match
) {
  if (!match) {
    return Object.freeze({
      valid:
        false,

      reason:
        "match-required"
    });
  }

  const stableValues = [
    match.actorScopeId,
    match.actorUuid,
    match.featureId,
    match.actionId,
    match.registryId,
    match.itemUuid,
    match.itemId,
    match.itemLid,
    match.profileIndex,
    match.talentRank,
    match.subjectKind
  ];

  const hasStableConstraint =
    stableValues.some(
      value =>
        value !==
          null &&
        value !==
          undefined
    );

  const hasNameConstraint =
    Boolean(
      match.allowNameFallback &&
      normalizeString(
        match.name
      )
    );

  if (
    !hasStableConstraint &&
    !hasNameConstraint
  ) {
    return Object.freeze({
      valid:
        false,

      reason:
        "augmentation-match-requires-constraint"
    });
  }

  if (
    match.name &&
    !match.allowNameFallback &&
    !hasStableConstraint
  ) {
    return Object.freeze({
      valid:
        false,

      reason:
        "name-only-match-requires-explicit-fallback"
    });
  }

  return Object.freeze({
    valid:
      true,

    reason:
      null
  });
}

/* ============================================================
   SAFE REGISTRATION
   ============================================================ */

/**
 * @section safe-registration
 *
 * Same as normal registration, but enforces non-global matching.
 */

export function registerValidatedSystemBridgeAugmentation(
  value,
  options = {}
) {
  const descriptor =
    normalizeSystemBridgeAugmentationDescriptor(
      value
    );

  const validation =
    validateSystemBridgeAugmentationMatch(
      descriptor.match
    );

  if (!validation.valid) {
    throw new Error(
      `Invalid system bridge augmentation match: ${validation.reason}`
    );
  }

  return registerSystemBridgeAugmentation(
    descriptor,
    options
  );
}

/* ============================================================
   REGISTRY SNAPSHOT
   ============================================================ */

export function getSystemBridgeAugmentationRegistrySnapshot() {
  const augmentations =
    getSystemBridgeAugmentations();

  return Object.freeze({
    augmentations,

    count:
      augmentations.length,

    enabledCount:
      augmentations.filter(
        descriptor =>
          descriptor.enabled
      ).length,

    disabledCount:
      augmentations.filter(
        descriptor =>
          !descriptor.enabled
      ).length,

    indexes:
      Object.freeze({
        actionId:
          AUGMENTATION_IDS_BY_ACTION_ID.size,

        featureId:
          AUGMENTATION_IDS_BY_FEATURE_ID.size,

        itemUuid:
          AUGMENTATION_IDS_BY_ITEM_UUID.size,

        itemLid:
          AUGMENTATION_IDS_BY_ITEM_LID.size,

        registryId:
          AUGMENTATION_IDS_BY_REGISTRY_ID.size
      })
  });
}

/* ============================================================
   SERIALIZABLE SNAPSHOT
   ============================================================ */

/**
 * @section serializable-snapshot
 *
 * Useful for diagnostics/export.
 *
 * Descriptors intentionally contain data only.
 */

export function getSerializableSystemBridgeAugmentationRegistry() {
  return Object.freeze(
    getSystemBridgeAugmentations()
      .map(
        descriptor =>
          Object.freeze({
            identity:
              descriptor.identity,

            match:
              descriptor.match,

            patch:
              descriptor.patch,

            priority:
              descriptor.priority,

            enabled:
              descriptor.enabled,

            metadata:
              descriptor.metadata
          })
      )
  );
}

/* ============================================================
   MATCHING PRECEDENCE NOTES
   ============================================================ */

/**
 * @section matching-precedence-notes
 *
 * Match quality and patch authority are separate concepts.
 *
 * Example:
 *
 * augmentation A:
 * exact item/action match
 *
 * augmentation B:
 * feature-level match
 *
 * A should normally sort first.
 *
 * But system-bridge-composer.js still decides whether A's proposed field
 * contribution may override/preserve another source.
 *
 * Matching does not grant authority.
 */

/* ============================================================
   ACTION-SPECIFIC AUGMENTATION RULE
   ============================================================ */

/**
 * @section action-specific-augmentation-rule
 *
 * Prefer:
 *
 * actionId
 *
 * when an augmentation affects one action only.
 *
 * Feature-level augmentation may match several actions and should be used
 * only for semantics genuinely shared by the feature.
 */

/* ============================================================
   WEAPON PROFILE RULE
   ============================================================ */

/**
 * @section weapon-profile-rule
 *
 * Multi-profile weapon augmentation may constrain:
 *
 * itemUuid/itemLid
 * +
 * profileIndex
 *
 * This prevents one profile's supplement from leaking into another.
 */

/* ============================================================
   TALENT RANK RULE
   ============================================================ */

/**
 * @section talent-rank-rule
 *
 * Talent augmentation may constrain:
 *
 * featureId/itemLid
 * +
 * talentRank
 *
 * Rank-specific runtime semantics remain separable.
 */

/* ============================================================
   EXISTING REGISTRY RULE
   ============================================================ */

/**
 * @section existing-registry-rule
 *
 * Universal/existing Frame Conn actions may be matched by:
 *
 * registryId
 *
 * without requiring an actor-owned item.
 *
 * Example:
 *
 * universal Boost enhancement
 * universal Skill Check extension
 *
 * The actor-owned registry remains optional for those actions.
 */

/* ============================================================
   NAME MATCH RULE
   ============================================================ */

/**
 * @section name-match-rule
 *
 * Names are not stable identity.
 *
 * Name matching requires:
 *
 * allowNameFallback = true
 *
 * It should generally be used only during migration or where the existing
 * registry provides no stable identifier.
 */

/* ============================================================
   CURATED DATA RULE
   ============================================================ */

/**
 * @section curated-data-rule
 *
 * Augmentations are explicit trusted runtime metadata.
 *
 * They may encode semantics that native Lancer data leaves inert:
 *
 * target restrictions
 * event triggers
 * lifecycle timing
 * supplemental resources
 * supplemental effect execution IDs
 *
 * They must not be automatically generated from arbitrary HTML/rule prose
 * inside this registry.
 */

/* ============================================================
   EXECUTION DATA RULE
   ============================================================ */

/**
 * @section execution-data-rule
 *
 * augmentation.patch.execution may identify supplemental Frame Conn
 * execution behavior.
 *
 * It must not store arbitrary runtime closures/functions.
 *
 * Prefer stable IDs resolved later by the execution layer.
 *
 * Example:
 *
 * supplementalExecutionId:
 * "frame-conn.weapon-special.nanite-rupture"
 */

/* ============================================================
   MERGE MODE RULE
   ============================================================ */

/**
 * @section merge-mode-rule
 *
 * Registry stores requested patch mode.
 *
 * It does not enforce it.
 *
 * system-bridge-composer.js interprets:
 *
 * FILL_MISSING
 * MERGE
 * APPEND
 * OVERRIDE
 *
 * with field-specific authority rules.
 */

/* ============================================================
   DISABLED AUGMENTATION RULE
   ============================================================ */

/**
 * @section disabled-augmentation-rule
 *
 * Disabled descriptors remain registered for:
 *
 * diagnostics
 * development toggles
 * migration
 *
 * Resolver matching excludes them by default.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getSystemBridgeAugmentationRegistryDiagnostics() {
  const snapshot =
    getSystemBridgeAugmentationRegistrySnapshot();

  const invalidMatches = [];

  for (
    const descriptor of
      SYSTEM_BRIDGE_AUGMENTATION_REGISTRY.values()
  ) {
    const validation =
      validateSystemBridgeAugmentationMatch(
        descriptor.match
      );

    if (!validation.valid) {
      invalidMatches.push(
        Object.freeze({
          augmentationId:
            descriptor.identity.id,

          reason:
            validation.reason
        })
      );
    }
  }

  return Object.freeze({
    id:
      SYSTEM_BRIDGE_AUGMENTATION_REGISTRY_MODULE_ID,

    version:
      SYSTEM_BRIDGE_AUGMENTATION_REGISTRY_MODULE_VERSION,

    count:
      snapshot.count,

    enabledCount:
      snapshot.enabledCount,

    disabledCount:
      snapshot.disabledCount,

    indexes:
      snapshot.indexes,

    invalidMatches:
      Object.freeze(
        invalidMatches
      )
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
 * Remains untouched.
 *
 * registryId may be used to target augmentation to existing action entries.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Remains untouched.
 *
 * featureId/actionId/item UUID/LID/profile/rank values may be used for
 * precise augmentation matching.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Not consumed here.
 *
 * Native behavior is never rediscovered by the augmentation registry.
 *
 *
 * resource_service/
 * -----------------
 *
 * Augmentation may describe missing resource semantics.
 *
 * resource_service owns runtime resource behavior.
 *
 *
 * action_economy/
 * ---------------
 *
 * Augmentation may describe missing economy semantics.
 *
 * action_economy owns runtime legality/spending.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Augmentation may declare trigger descriptors using existing event
 * vocabulary.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Augmentation may describe lifecycle semantics.
 *
 *
 * targeting-spatial_service/
 * --------------------------
 *
 * Augmentation may describe target semantics.
 *
 * targeting-spatial_service owns runtime legality.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * system-bridge-augmentation-registry.js stores supplemental data only.
 *
 * INVARIANT 2
 * Augmentation registration never mutates existing Frame Conn registry
 * entries.
 *
 * INVARIANT 3
 * Augmentation registration never mutates actor-owned descriptors.
 *
 * INVARIANT 4
 * Matching prefers stable identifiers.
 *
 * INVARIANT 5
 * Name matching requires explicit fallback permission.
 *
 * INVARIANT 6
 * Profile-specific augmentation remains profile-specific.
 *
 * INVARIANT 7
 * Talent-rank-specific augmentation remains rank-specific.
 *
 * INVARIANT 8
 * Match strength does not imply composition authority.
 *
 * INVARIANT 9
 * Patch merge mode is stored here but interpreted by composer.
 *
 * INVARIANT 10
 * Augmentation defaults to curated explicit data rather than prose-derived
 * automation.
 *
 * INVARIANT 11
 * Execution augmentation stores stable execution identity/data, not direct
 * execution closures.
 *
 * INVARIANT 12
 * Disabled augmentation is excluded from matching by default.
 *
 * INVARIANT 13
 * Registry remains Foundry/Lancer-import free.
 *
 * INVARIANT 14
 * system-bridge-resolver.js owns source resolution.
 *
 * INVARIANT 15
 * system-bridge-composer.js owns field precedence and actual composition.
 */