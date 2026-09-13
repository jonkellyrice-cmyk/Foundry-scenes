/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/system_bridge/system-bridge-contract.js
 */

/**
 * @file
 * @path main/system_bridge/system-bridge-contract.js
 * @module system-bridge-contract
 * @layer system-bridge-contract
 * @responsibility define-stable-source-augmentation-composition-and-runtime-descriptor-shapes
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - system-bridge-augmentation-registry.js
 * - system-bridge-resolver.js
 * - system-bridge-composer.js
 * - system-bridge.js
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - existing Frame Conn registry remains one source
 * - actor_owned_feature_registry/ remains one source
 * - native_adapter/ remains native Lancer authority
 * - resource_service/ remains resource authority
 * - action_economy/ remains economy authority
 * - semantic_event_bus/ remains event vocabulary/transport authority
 * - lifecycle_service/ remains lifecycle authority
 * - targeting-spatial_service/ remains targeting/spatial authority
 * - semantic_execution_context/ consumes composed runtime descriptors later
 *
 * THIS FILE OWNS:
 * - bridge source kinds
 * - bridge source references
 * - bridge provenance
 * - augmentation identity/match/patch shapes
 * - bridge resolution results
 * - field contribution/conflict shapes
 * - composed runtime feature/action descriptors
 * - unresolved requirement representation
 * - bridge composition result shapes
 *
 * THIS FILE DOES NOT OWN:
 * - existing registry lookup
 * - actor-owned registry lookup
 * - augmentation storage
 * - field merge execution
 * - native execution
 * - resource mutation
 * - action economy mutation
 * - event dispatch
 * - lifecycle execution
 * - targeting execution
 *
 * EDIT CONTRACT:
 * - no Foundry imports
 * - no Lancer imports
 * - no foundational service imports required
 * - preserve provenance
 * - compose field-by-field
 * - augmentation fills missing semantics by default
 * - confirmed native truth must not be silently overwritten
 * - unresolved/conflicting data must remain visible
 */

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const SYSTEM_BRIDGE_CONTRACT_MODULE_ID =
  "lancer-frame-conn.system-bridge-contract";

export const SYSTEM_BRIDGE_CONTRACT_MODULE_VERSION =
  1;

/* ============================================================
   BRIDGE SOURCE KIND
   ============================================================ */

/**
 * @section bridge-source-kind
 *
 * Priority is not encoded here.
 *
 * system-bridge-composer.js owns field-specific precedence.
 */

export const SYSTEM_BRIDGE_SOURCE_KIND =
  Object.freeze({
    NATIVE:
      "native",

    ACTOR_OWNED:
      "actor-owned",

    EXISTING_REGISTRY:
      "existing-registry",

    AUGMENTATION:
      "augmentation",

    DERIVED:
      "derived",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   BRIDGE SUBJECT KIND
   ============================================================ */

export const SYSTEM_BRIDGE_SUBJECT_KIND =
  Object.freeze({
    FEATURE:
      "feature",

    ACTION:
      "action",

    WEAPON_PROFILE:
      "weapon-profile",

    TALENT_RANK:
      "talent-rank",

    UNIVERSAL_ACTION:
      "universal-action",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   BRIDGE RESOLUTION STATUS
   ============================================================ */

export const SYSTEM_BRIDGE_RESOLUTION_STATUS =
  Object.freeze({
    RESOLVED:
      "resolved",

    PARTIAL:
      "partial",

    NOT_FOUND:
      "not-found",

    AMBIGUOUS:
      "ambiguous",

    FAILED:
      "failed"
  });

/* ============================================================
   BRIDGE COMPOSITION STATUS
   ============================================================ */

export const SYSTEM_BRIDGE_COMPOSITION_STATUS =
  Object.freeze({
    COMPOSED:
      "composed",

    PARTIAL:
      "partial",

    CONFLICTED:
      "conflicted",

    UNRESOLVED:
      "unresolved",

    FAILED:
      "failed"
  });

/* ============================================================
   RUNTIME SUPPORT STATUS
   ============================================================ */

/**
 * @section runtime-support-status
 *
 * Mirrors actor-owned runtime support concepts while allowing bridge-supplied
 * completion without importing actor_owned_feature_registry.
 */

export const SYSTEM_BRIDGE_RUNTIME_STATUS =
  Object.freeze({
    EXECUTABLE_NATIVE:
      "executable-native",

    PARTIAL_NATIVE:
      "partial-native",

    SEMANTIC_ONLY:
      "semantic-only",

    SUPPLEMENTAL:
      "supplemental",

    COMPOSED:
      "composed",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   CONTRIBUTION AUTHORITY
   ============================================================ */

export const SYSTEM_BRIDGE_AUTHORITY =
  Object.freeze({
    NATIVE:
      "native",

    STRUCTURED_NATIVE:
      "structured-native",

    EXISTING_REGISTRY:
      "existing-registry",

    AUGMENTATION:
      "augmentation",

    DERIVED:
      "derived",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   CONFLICT KIND
   ============================================================ */

export const SYSTEM_BRIDGE_CONFLICT_KIND =
  Object.freeze({
    VALUE_MISMATCH:
      "value-mismatch",

    AUTHORITY_MISMATCH:
      "authority-mismatch",

    IDENTITY_AMBIGUITY:
      "identity-ambiguity",

    EXECUTION_MISMATCH:
      "execution-mismatch",

    TARGETING_MISMATCH:
      "targeting-mismatch",

    RESOURCE_MISMATCH:
      "resource-mismatch",

    ECONOMY_MISMATCH:
      "economy-mismatch",

    LIFECYCLE_MISMATCH:
      "lifecycle-mismatch",

    TRIGGER_MISMATCH:
      "trigger-mismatch",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   UNRESOLVED FIELD KIND
   ============================================================ */

export const SYSTEM_BRIDGE_UNRESOLVED_KIND =
  Object.freeze({
    IDENTITY:
      "identity",

    EXECUTION:
      "execution",

    ACTION_ECONOMY:
      "action-economy",

    TARGETING:
      "targeting",

    RESOURCES:
      "resources",

    LIFECYCLE:
      "lifecycle",

    TRIGGERS:
      "triggers",

    EFFECT:
      "effect",

    PRESENTATION:
      "presentation",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   AUGMENTATION MERGE MODE
   ============================================================ */

/**
 * @section augmentation-merge-mode
 *
 * FILL_MISSING is the default and preferred mode.
 *
 * OVERRIDE requires explicit author intent and composer policy approval.
 */

export const SYSTEM_BRIDGE_AUGMENTATION_MODE =
  Object.freeze({
    FILL_MISSING:
      "fill-missing",

    MERGE:
      "merge",

    APPEND:
      "append",

    OVERRIDE:
      "override"
  });

/* ============================================================
   MATCH STRENGTH
   ============================================================ */

export const SYSTEM_BRIDGE_MATCH_STRENGTH =
  Object.freeze({
    EXACT:
      "exact",

    STRONG:
      "strong",

    FALLBACK:
      "fallback",

    NONE:
      "none"
  });

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

function isEnumValue(
  enumeration,
  value
) {
  return Object
    .values(enumeration)
    .includes(value);
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

/* ============================================================
   BRIDGE IDENTITY
   ============================================================ */

/**
 * @section bridge-identity
 *
 * Stable matching prefers native/registry identifiers.
 *
 * Display names are fallback metadata only.
 */

export function createSystemBridgeIdentity({
  id,

  subjectKind =
    SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN,

  actorScopeId = null,

  actorUuid = null,
  pilotUuid = null,
  mechUuid = null,

  featureId = null,
  actionId = null,

  registryId = null,

  itemUuid = null,
  itemId = null,
  itemLid = null,

  profileIndex = null,
  profileName = null,

  talentRank = null,

  name = null,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "System bridge identity requires id."
    );
  }

  if (
    !isEnumValue(
      SYSTEM_BRIDGE_SUBJECT_KIND,
      subjectKind
    )
  ) {
    throw new TypeError(
      `Invalid system bridge subject kind: ${String(subjectKind)}`
    );
  }

  return Object.freeze({
    id,

    subjectKind,

    actorScopeId,

    actorUuid,
    pilotUuid,
    mechUuid,

    featureId,
    actionId,

    registryId,

    itemUuid,
    itemId,
    itemLid,

    profileIndex:
      finiteNumber(profileIndex)
        ? profileIndex
        : null,

    profileName,

    talentRank:
      finiteNumber(talentRank)
        ? talentRank
        : null,

    name,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   SOURCE REFERENCE
   ============================================================ */

export function createSystemBridgeSourceReference({
  sourceKind,

  sourceId = null,

  identity = null,

  authority =
    SYSTEM_BRIDGE_AUTHORITY.UNKNOWN,

  value = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_SOURCE_KIND,
      sourceKind
    )
  ) {
    throw new TypeError(
      `Invalid system bridge source kind: ${String(sourceKind)}`
    );
  }

  if (
    !isEnumValue(
      SYSTEM_BRIDGE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid system bridge source authority: ${String(authority)}`
    );
  }

  return Object.freeze({
    sourceKind,

    sourceId,

    identity,

    authority,

    value,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   FIELD PROVENANCE
   ============================================================ */

export function createSystemBridgeFieldProvenance({
  field,

  sourceKind,

  sourceId = null,

  authority =
    SYSTEM_BRIDGE_AUTHORITY.UNKNOWN,

  path = null,

  originalValue = null,

  metadata = {}
} = {}) {
  if (!requiredString(field)) {
    throw new TypeError(
      "System bridge field provenance requires field."
    );
  }

  if (
    !isEnumValue(
      SYSTEM_BRIDGE_SOURCE_KIND,
      sourceKind
    )
  ) {
    throw new TypeError(
      `Invalid provenance source kind: ${String(sourceKind)}`
    );
  }

  return Object.freeze({
    field,

    sourceKind,

    sourceId,

    authority,

    path,

    originalValue,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   FIELD CONTRIBUTION
   ============================================================ */

export function createSystemBridgeFieldContribution({
  field,

  value,

  provenance,

  accepted = false,

  reason = null,

  metadata = {}
} = {}) {
  if (!requiredString(field)) {
    throw new TypeError(
      "System bridge field contribution requires field."
    );
  }

  if (!provenance) {
    throw new TypeError(
      "System bridge field contribution requires provenance."
    );
  }

  return Object.freeze({
    field,

    value,

    provenance,

    accepted:
      Boolean(accepted),

    reason,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   CONFLICT
   ============================================================ */

export function createSystemBridgeConflict({
  field = null,

  kind =
    SYSTEM_BRIDGE_CONFLICT_KIND.UNKNOWN,

  message = null,

  contributions = [],

  selectedContribution = null,

  blocking = false,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_CONFLICT_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid bridge conflict kind: ${String(kind)}`
    );
  }

  return Object.freeze({
    field,

    kind,

    message:
      message ??
      kind,

    contributions:
      freezeArray(contributions),

    selectedContribution,

    blocking:
      Boolean(blocking),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   WARNING
   ============================================================ */

export function createSystemBridgeWarning({
  code,

  message = null,

  field = null,

  source = null,

  metadata = {}
} = {}) {
  if (!requiredString(code)) {
    throw new TypeError(
      "System bridge warning requires code."
    );
  }

  return Object.freeze({
    code,

    message:
      message ??
      code,

    field,

    source,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   UNRESOLVED REQUIREMENT
   ============================================================ */

export function createSystemBridgeUnresolvedRequirement({
  kind =
    SYSTEM_BRIDGE_UNRESOLVED_KIND.UNKNOWN,

  field = null,

  required = true,

  message = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_UNRESOLVED_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid unresolved bridge kind: ${String(kind)}`
    );
  }

  return Object.freeze({
    kind,

    field,

    required:
      Boolean(required),

    message:
      message ??
      kind,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   AUGMENTATION IDENTITY
   ============================================================ */

export function createSystemBridgeAugmentationIdentity({
  id,

  version = 1,

  description = null,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "System bridge augmentation requires id."
    );
  }

  if (
    !finiteNumber(version) ||
    version < 1
  ) {
    throw new TypeError(
      "System bridge augmentation version must be positive."
    );
  }

  return Object.freeze({
    id,

    version,

    description,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   AUGMENTATION MATCH DESCRIPTOR
   ============================================================ */

/**
 * @section augmentation-match-descriptor
 *
 * Matching should prefer exact stable identifiers.
 *
 * Name matching is optional fallback only.
 */

export function createSystemBridgeAugmentationMatch({
  subjectKind = null,

  actorScopeId = null,

  actorUuid = null,

  featureId = null,
  actionId = null,

  registryId = null,

  itemUuid = null,
  itemId = null,
  itemLid = null,

  profileIndex = null,

  talentRank = null,

  name = null,

  allowNameFallback = false,

  metadata = {}
} = {}) {
  if (
    subjectKind != null &&
    !isEnumValue(
      SYSTEM_BRIDGE_SUBJECT_KIND,
      subjectKind
    )
  ) {
    throw new TypeError(
      `Invalid augmentation subject kind: ${String(subjectKind)}`
    );
  }

  return Object.freeze({
    subjectKind,

    actorScopeId,

    actorUuid,

    featureId,
    actionId,

    registryId,

    itemUuid,
    itemId,
    itemLid,

    profileIndex:
      finiteNumber(profileIndex)
        ? profileIndex
        : null,

    talentRank:
      finiteNumber(talentRank)
        ? talentRank
        : null,

    name,

    allowNameFallback:
      Boolean(allowNameFallback),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   AUGMENTATION PATCH
   ============================================================ */

/**
 * @section augmentation-patch
 *
 * Patch values are semantic/runtime supplements.
 *
 * They are data, not executable closures.
 */

export function createSystemBridgeAugmentationPatch({
  mode =
    SYSTEM_BRIDGE_AUGMENTATION_MODE.FILL_MISSING,

  presentation = null,

  actionEconomy = null,

  targeting = null,

  resources = null,

  lifecycle = null,

  triggers = null,

  execution = null,

  effect = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_AUGMENTATION_MODE,
      mode
    )
  ) {
    throw new TypeError(
      `Invalid augmentation merge mode: ${String(mode)}`
    );
  }

  return Object.freeze({
    mode,

    presentation,

    actionEconomy,

    targeting,

    resources:
      resources == null
        ? null
        : freezeArray(resources),

    lifecycle,

    triggers:
      triggers == null
        ? null
        : freezeArray(triggers),

    execution,

    effect,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   AUGMENTATION DESCRIPTOR
   ============================================================ */

export function createSystemBridgeAugmentationDescriptor({
  identity,

  match,

  patch,

  priority = 0,

  enabled = true,

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "System bridge augmentation descriptor requires identity."
    );
  }

  if (!match) {
    throw new TypeError(
      "System bridge augmentation descriptor requires match."
    );
  }

  if (!patch) {
    throw new TypeError(
      "System bridge augmentation descriptor requires patch."
    );
  }

  return Object.freeze({
    identity,

    match,

    patch,

    priority:
      finiteNumber(priority)
        ? priority
        : 0,

    enabled:
      Boolean(enabled),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   AUGMENTATION MATCH RESULT
   ============================================================ */

export function createSystemBridgeAugmentationMatchResult({
  augmentation,

  strength =
    SYSTEM_BRIDGE_MATCH_STRENGTH.NONE,

  score = 0,

  matchedFields = [],

  metadata = {}
} = {}) {
  if (!augmentation) {
    throw new TypeError(
      "Augmentation match result requires augmentation."
    );
  }

  if (
    !isEnumValue(
      SYSTEM_BRIDGE_MATCH_STRENGTH,
      strength
    )
  ) {
    throw new TypeError(
      `Invalid bridge match strength: ${String(strength)}`
    );
  }

  return Object.freeze({
    augmentation,

    strength,

    score:
      finiteNumber(score)
        ? score
        : 0,

    matchedFields:
      freezeArray(matchedFields),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   BRIDGE RESOLUTION REQUEST
   ============================================================ */

export function createSystemBridgeResolutionRequest({
  actorScopeId = null,

  subjectKind =
    SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN,

  featureId = null,
  actionId = null,

  registryId = null,

  itemUuid = null,
  itemId = null,
  itemLid = null,

  profileIndex = null,

  talentRank = null,

  name = null,

  existingRegistryEntry = null,

  actorOwnedFeature = null,
  actorOwnedAction = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_SUBJECT_KIND,
      subjectKind
    )
  ) {
    throw new TypeError(
      `Invalid bridge request subject kind: ${String(subjectKind)}`
    );
  }

  return Object.freeze({
    actorScopeId,

    subjectKind,

    featureId,
    actionId,

    registryId,

    itemUuid,
    itemId,
    itemLid,

    profileIndex:
      finiteNumber(profileIndex)
        ? profileIndex
        : null,

    talentRank:
      finiteNumber(talentRank)
        ? talentRank
        : null,

    name,

    existingRegistryEntry,

    actorOwnedFeature,
    actorOwnedAction,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   BRIDGE RESOLUTION RESULT
   ============================================================ */

export function createSystemBridgeResolutionResult({
  status =
    SYSTEM_BRIDGE_RESOLUTION_STATUS.RESOLVED,

  request = null,

  identity = null,

  sources = [],

  existingRegistry = null,

  actorOwned = null,

  augmentations = [],

  warnings = [],

  conflicts = [],

  reason = null,

  error = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_RESOLUTION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid bridge resolution status: ${String(status)}`
    );
  }

  return Object.freeze({
    status,

    request,

    identity,

    sources:
      freezeArray(sources),

    existingRegistry,

    actorOwned,

    augmentations:
      freezeArray(augmentations),

    warnings:
      freezeArray(warnings),

    conflicts:
      freezeArray(conflicts),

    reason,

    error,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RUNTIME PRESENTATION DESCRIPTOR
   ============================================================ */

export function createSystemBridgeRuntimePresentation({
  name = null,

  label = null,

  description = null,

  icon = null,

  category = null,

  actionType = null,

  sort = null,

  metadata = {}
} = {}) {
  return Object.freeze({
    name,

    label,

    description,

    icon,

    category,

    actionType,

    sort:
      finiteNumber(sort)
        ? sort
        : null,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RUNTIME EXECUTION DESCRIPTOR
   ============================================================ */

/**
 * @section runtime-execution-descriptor
 *
 * Describes how execution should route.
 *
 * It does not execute anything.
 */

export function createSystemBridgeRuntimeExecution({
  runtimeStatus =
    SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN,

  nativeExecution = null,

  supplementalExecutionId = null,

  requiresNative = false,

  producesChat = null,

  performsRoll = null,

  mutatesDocuments = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_RUNTIME_STATUS,
      runtimeStatus
    )
  ) {
    throw new TypeError(
      `Invalid bridge runtime status: ${String(runtimeStatus)}`
    );
  }

  return Object.freeze({
    runtimeStatus,

    nativeExecution,

    supplementalExecutionId,

    requiresNative:
      Boolean(requiresNative),

    producesChat:
      producesChat == null
        ? null
        : Boolean(producesChat),

    performsRoll:
      performsRoll == null
        ? null
        : Boolean(performsRoll),

    mutatesDocuments:
      mutatesDocuments == null
        ? null
        : Boolean(mutatesDocuments),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   COMPOSED RUNTIME ACTION DESCRIPTOR
   ============================================================ */

export function createSystemBridgeRuntimeAction({
  identity,

  presentation = null,

  actionEconomy = null,

  targeting = null,

  resources = [],

  lifecycle = null,

  triggers = [],

  execution = null,

  effect = null,

  runtimeStatus =
    SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN,

  provenance = [],

  unresolved = [],

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Runtime action descriptor requires identity."
    );
  }

  if (
    !isEnumValue(
      SYSTEM_BRIDGE_RUNTIME_STATUS,
      runtimeStatus
    )
  ) {
    throw new TypeError(
      `Invalid runtime action status: ${String(runtimeStatus)}`
    );
  }

  return Object.freeze({
    identity,

    presentation,

    actionEconomy,

    targeting,

    resources:
      freezeArray(resources),

    lifecycle,

    triggers:
      freezeArray(triggers),

    execution,

    effect,

    runtimeStatus,

    provenance:
      freezeArray(provenance),

    unresolved:
      freezeArray(unresolved),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   COMPOSED RUNTIME FEATURE DESCRIPTOR
   ============================================================ */

export function createSystemBridgeRuntimeFeature({
  identity,

  presentation = null,

  actions = [],

  targeting = null,

  resources = [],

  lifecycle = null,

  triggers = [],

  execution = null,

  effect = null,

  runtimeStatus =
    SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN,

  provenance = [],

  unresolved = [],

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Runtime feature descriptor requires identity."
    );
  }

  if (
    !isEnumValue(
      SYSTEM_BRIDGE_RUNTIME_STATUS,
      runtimeStatus
    )
  ) {
    throw new TypeError(
      `Invalid runtime feature status: ${String(runtimeStatus)}`
    );
  }

  return Object.freeze({
    identity,

    presentation,

    actions:
      freezeArray(actions),

    targeting,

    resources:
      freezeArray(resources),

    lifecycle,

    triggers:
      freezeArray(triggers),

    execution,

    effect,

    runtimeStatus,

    provenance:
      freezeArray(provenance),

    unresolved:
      freezeArray(unresolved),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   COMPOSITION RESULT
   ============================================================ */

export function createSystemBridgeCompositionResult({
  status =
    SYSTEM_BRIDGE_COMPOSITION_STATUS.COMPOSED,

  resolution = null,

  feature = null,

  action = null,

  contributions = [],

  augmentationsApplied = [],

  warnings = [],

  conflicts = [],

  unresolved = [],

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SYSTEM_BRIDGE_COMPOSITION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid bridge composition status: ${String(status)}`
    );
  }

  return Object.freeze({
    status,

    resolution,

    feature,

    action,

    contributions:
      freezeArray(contributions),

    augmentationsApplied:
      freezeArray(augmentationsApplied),

    warnings:
      freezeArray(warnings),

    conflicts:
      freezeArray(conflicts),

    unresolved:
      freezeArray(unresolved),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   STATUS HELPERS
   ============================================================ */

export function systemBridgeResolutionSucceeded(
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

export function systemBridgeCompositionSucceeded(
  result
) {
  return Boolean(
    result &&
    (
      result.status ===
        SYSTEM_BRIDGE_COMPOSITION_STATUS.COMPOSED ||
      result.status ===
        SYSTEM_BRIDGE_COMPOSITION_STATUS.PARTIAL
    )
  );
}

export function systemBridgeCompositionHasBlockingConflict(
  result
) {
  return Boolean(
    result
      ?.conflicts
      ?.some(
        conflict =>
          conflict.blocking
      )
  );
}

/* ============================================================
   IDENTITY MATCH HELPERS
   ============================================================ */

/**
 * @section identity-match-helpers
 *
 * Exact stable identifiers first.
 *
 * Name fallback is deliberately weak.
 */

export function getSystemBridgeIdentityMatchFields(
  identity
) {
  if (!identity) {
    return Object.freeze([]);
  }

  const fields = [];

  const candidates = [
    ["actorScopeId", identity.actorScopeId],
    ["actorUuid", identity.actorUuid],
    ["featureId", identity.featureId],
    ["actionId", identity.actionId],
    ["registryId", identity.registryId],
    ["itemUuid", identity.itemUuid],
    ["itemId", identity.itemId],
    ["itemLid", identity.itemLid],
    ["profileIndex", identity.profileIndex],
    ["talentRank", identity.talentRank]
  ];

  for (
    const [
      field,
      value
    ] of candidates
  ) {
    if (
      value !==
      null &&
      value !==
      undefined
    ) {
      fields.push(
        Object.freeze({
          field,
          value
        })
      );
    }
  }

  return Object.freeze(
    fields
  );
}

/* ============================================================
   AUGMENTATION MATCH RULE
   ============================================================ */

/**
 * @section augmentation-match-rule
 *
 * Preferred stable matching order:
 *
 * actionId
 * featureId
 * itemUuid
 * itemLid
 * registryId
 * profileIndex
 * talentRank
 * actor scope/UUID
 *
 * name:
 * fallback only when allowNameFallback = true
 *
 * system-bridge-resolver.js owns actual scoring/matching.
 */

/* ============================================================
   SOURCE AUTHORITY RULE
   ============================================================ */

/**
 * @section source-authority-rule
 *
 * General field authority:
 *
 * confirmed native execution truth
 *     >
 * structured actor-owned/native data
 *     >
 * explicit existing Frame Conn registry data
 *     >
 * curated augmentation
 *     >
 * derived/default
 *
 * This is NOT a whole-object replacement order.
 *
 * Composition is field-by-field.
 *
 * system-bridge-composer.js owns exact field-specific precedence.
 */

/* ============================================================
   AUGMENTATION RULE
   ============================================================ */

/**
 * @section augmentation-rule
 *
 * Default:
 *
 * FILL_MISSING
 *
 * Augmentation should add:
 *
 * missing action economy
 * missing targeting semantics
 * missing resource semantics
 * missing lifecycle semantics
 * missing trigger semantics
 * missing supplemental effect execution identity
 *
 * It should not erase:
 *
 * confirmed native execution
 * native item identity
 * structured Range/Threat/Sensors
 * existing explicit registry presentation/action identity
 *
 * OVERRIDE must remain explicit and diagnosable.
 */

/* ============================================================
   NATIVE EXECUTION PRESERVATION
   ============================================================ */

/**
 * @section native-execution-preservation
 *
 * Native execution reference survives bridge composition.
 *
 * Example:
 *
 * weapon attack:
 *
 * native attack execution
 * +
 * augmentation special effect
 *
 * produces:
 *
 * RuntimeExecution.nativeExecution = native attack path
 * RuntimeExecution.supplementalExecutionId = supplemental effect path
 *
 * Do not replace native execution merely because augmentation exists.
 */

/* ============================================================
   PARTIAL NATIVE RULE
   ============================================================ */

/**
 * @section partial-native-rule
 *
 * PARTIAL_NATIVE is a first-class state.
 *
 * Example:
 *
 * native system handles:
 *
 * attack
 * damage
 * chat
 * Limited consumption
 *
 * but not:
 *
 * special effect text
 *
 * Bridge should preserve native execution and add only the missing effect
 * semantics.
 */

/* ============================================================
   EXISTING REGISTRY RULE
   ============================================================ */

/**
 * @section existing-registry-rule
 *
 * Existing Frame Conn registry remains a separate source.
 *
 * It may contribute:
 *
 * registry ID
 * presentation
 * category
 * action type
 * universal action identity
 * existing Helm-specific metadata
 *
 * Bridge does not require old registry entries to be rewritten into every
 * new foundational contract.
 */

/* ============================================================
   ACTOR-OWNED FEATURE RULE
   ============================================================ */

/**
 * @section actor-owned-feature-rule
 *
 * actor_owned_feature_registry may contribute:
 *
 * actor/item identity
 * weapon/system/Talent provenance
 * profile/rank identity
 * structured action data
 * structured Range/Threat/Sensors
 * resource evidence
 * native execution reference
 * runtime support status
 *
 * Bridge consumes normalized registry output.
 *
 * It must not rediscover native actor/item state itself.
 */

/* ============================================================
   ACTION ECONOMY RULE
   ============================================================ */

/**
 * @section action-economy-rule
 *
 * RuntimeAction.actionEconomy describes required economy semantics.
 *
 * action_economy remains authoritative for:
 *
 * Quick/Full/Free spending
 * Reaction legality
 * Protocol start-of-turn restriction
 * Protocol once-per-turn restriction
 *
 * Bridge does not validate current turn legality.
 */

/* ============================================================
   TARGETING RULE
   ============================================================ */

/**
 * @section targeting-rule
 *
 * RuntimeAction.targeting should ultimately contain the normalized
 * targeting requirement consumed by targeting_spatial_service.
 *
 * Bridge may compose:
 *
 * native Range/Threat/Sensors
 * +
 * registry action semantics
 * +
 * augmentation target count/type/relationship/LOS/etc.
 *
 * targeting_spatial_service owns runtime legality.
 */

/* ============================================================
   RESOURCE RULE
   ============================================================ */

/**
 * @section resource-rule
 *
 * RuntimeAction.resources may describe:
 *
 * Limited
 * Loaded
 * charges
 * once-per-round
 * once-per-scene
 * supplemental counters
 *
 * resource_service owns:
 *
 * resolution
 * availability
 * consumption
 * restore/reset
 */

/* ============================================================
   LIFECYCLE RULE
   ============================================================ */

/**
 * @section lifecycle-rule
 *
 * RuntimeAction.lifecycle may describe:
 *
 * expiration
 * reset
 * duration
 *
 * lifecycle_service owns timing.
 *
 * Bridge must not infer these from prose.
 */

/* ============================================================
   TRIGGER RULE
   ============================================================ */

/**
 * @section trigger-rule
 *
 * RuntimeAction.triggers reference semantic_event_bus vocabulary.
 *
 * Bridge does not define a second event namespace.
 *
 * Trigger semantics must come from:
 *
 * structured native data
 * existing explicit registry data
 * curated augmentation
 *
 * never automatic prose parsing.
 */

/* ============================================================
   EXECUTION CONTEXT RULE
   ============================================================ */

/**
 * @section execution-context-rule
 *
 * Bridge output is descriptive runtime input.
 *
 * Intended:
 *
 * bridge RuntimeAction
 *       ↓
 * semantic_execution_context
 *       ↓
 * execution_transaction
 *
 * This contract does not duplicate ExecutionContext.
 */

/* ============================================================
   CONFLICT RULE
   ============================================================ */

/**
 * @section conflict-rule
 *
 * Contradictory values remain diagnosable.
 *
 * Example:
 *
 * existing registry:
 * QUICK
 *
 * structured actor-owned action:
 * FULL
 *
 * Composer may select the higher-authority value.
 *
 * It should also record:
 *
 * SystemBridgeConflict {
 *   field: "actionEconomy",
 *   contributions: [...]
 * }
 *
 * Do not silently erase disagreement.
 */

/* ============================================================
   UNRESOLVED RULE
   ============================================================ */

/**
 * @section unresolved-rule
 *
 * Missing information is explicit.
 *
 * Example:
 *
 * action is semantic-only
 * no supplemental execution implementation exists
 *
 * unresolved:
 *
 * EXECUTION
 *
 * Composition may still return PARTIAL rather than inventing behavior.
 */

/* ============================================================
   IMMUTABILITY RULE
   ============================================================ */

/**
 * @section immutability-rule
 *
 * Contract constructors return frozen descriptors/results.
 *
 * Resolver/composer should create new descriptors rather than mutate:
 *
 * existing registry entries
 * actor-owned descriptors
 * augmentation descriptors
 */

/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */

/**
 * @section dependency-direction
 *
 * Intended:
 *
 * existing Frame Conn registry ─────┐
 *                                   │
 * actor_owned_feature_registry ─────┤
 *                                   │
 * augmentation registry ────────────┤
 *                                   ▼
 *                            system_bridge
 *                                   │
 *                                   ▼
 *                      semantic_execution_context
 *                                   │
 *                                   ▼
 *                       execution_transaction
 *
 *
 * foundational services remain below bridge:
 *
 * native_adapter
 * resource_service
 * action_economy
 * semantic_event_bus
 * lifecycle_service
 * targeting_spatial_service
 *
 * They must not import system_bridge.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * system-bridge-contract.js is Foundry/Lancer-import free.
 *
 * INVARIANT 2
 * Existing Frame Conn registry and actor-owned registry remain separate
 * source kinds.
 *
 * INVARIANT 3
 * Composition is field-by-field, not whole-object replacement.
 *
 * INVARIANT 4
 * Confirmed native execution truth must survive composition.
 *
 * INVARIANT 5
 * Augmentation defaults to filling missing semantics.
 *
 * INVARIANT 6
 * Override behavior must be explicit.
 *
 * INVARIANT 7
 * Stable IDs are preferred over display-name matching.
 *
 * INVARIANT 8
 * Weapon profile identity remains representable.
 *
 * INVARIANT 9
 * Talent rank identity remains representable.
 *
 * INVARIANT 10
 * Provenance is preserved per contributed field.
 *
 * INVARIANT 11
 * Conflicting source values remain diagnosable.
 *
 * INVARIANT 12
 * Missing required runtime semantics remain explicitly unresolved.
 *
 * INVARIANT 13
 * Bridge runtime descriptors describe execution but do not execute it.
 *
 * INVARIANT 14
 * resource_service remains resource authority.
 *
 * INVARIANT 15
 * action_economy remains economy authority.
 *
 * INVARIANT 16
 * semantic_event_bus remains event vocabulary/transport authority.
 *
 * INVARIANT 17
 * lifecycle_service remains lifecycle authority.
 *
 * INVARIANT 18
 * targeting_spatial_service remains targeting/spatial authority.
 *
 * INVARIANT 19
 * native_adapter remains native Lancer authority.
 *
 * INVARIANT 20
 * semantic_execution_context and execution_transaction remain downstream
 * execution orchestration boundaries.
 */