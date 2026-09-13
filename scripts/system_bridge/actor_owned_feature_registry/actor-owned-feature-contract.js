/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/actor_owned_feature_registry/actor-owned-feature-contract.js
 */

/**
 * @file
 * @path main/actor_owned_feature_registry/actor-owned-feature-contract.js
 * @module actor-owned-feature-contract
 * @layer actor-owned-feature-registry-contract
 * @responsibility define-normalized-runtime-descriptors-for-actor-owned-lancer-features
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - actor-owned-feature-discovery.js
 * - actor-owned-feature-normalizer.js
 * - actor-owned-feature-registry.js
 * - actor-owned-features.js
 * - future system_bridge/*
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - native_adapter/ supplies authoritative actor/item/native action identity
 * - semantic_event_bus/ supplies trigger vocabulary
 * - lifecycle_service/ supplies expiration/reset vocabulary
 * - targeting_spatial_service/ supplies targeting requirement vocabulary
 * - resource_service/ supplies resource declarations
 * - action_economy/ supplies activation/economy semantics
 * - semantic_execution_context/ consumes normalized runtime semantics later
 * - existing Frame Conn registry remains separate and is merged later by
 *   system_bridge/
 *
 * THIS FILE OWNS:
 * - actor-owned feature kinds
 * - normalized feature identity
 * - native provenance
 * - owned action descriptors
 * - runtime capability declarations
 * - trigger declarations
 * - resource/lifecycle/targeting references
 * - native execution references
 * - normalization/result shapes
 *
 * THIS FILE DOES NOT OWN:
 * - actor/item discovery
 * - native execution
 * - semantic prose interpretation
 * - feature automation
 * - lifecycle execution
 * - targeting execution
 * - resource mutation
 * - bridge composition
 *
 * EDIT CONTRACT:
 * - no Foundry imports
 * - no Lancer imports
 * - preserve native provenance
 * - do not invent automation for semantic text
 * - distinguish known executable semantics from inert descriptive text
 */

/* ============================================================
   FEATURE KIND
   ============================================================ */

export const ACTOR_OWNED_FEATURE_KIND =
  Object.freeze({
    FRAME_TRAIT:
      "frame-trait",

    CORE_SYSTEM:
      "core-system",

    TALENT:
      "talent",

    TALENT_RANK:
      "talent-rank",

    CORE_BONUS:
      "core-bonus",

    MECH_SYSTEM:
      "mech-system",

    MECH_WEAPON:
      "mech-weapon",

    WEAPON_PROFILE:
      "weapon-profile",

    WEAPON_MOD:
      "weapon-mod",

    WEAPON_MOUNT:
      "weapon-mount",

    PILOT_GEAR:
      "pilot-gear",

    PILOT_WEAPON:
      "pilot-weapon",

    NHP:
      "nhp",

    LICENSE:
      "license",

    OTHER:
      "other"
  });

/* ============================================================
   FEATURE OWNER KIND
   ============================================================ */

export const ACTOR_OWNED_FEATURE_OWNER_KIND =
  Object.freeze({
    PILOT:
      "pilot",

    MECH:
      "mech",

    ACTOR:
      "actor",

    ITEM:
      "item",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   FEATURE RUNTIME STATUS
   ============================================================ */

/**
 * @section feature-runtime-status
 *
 * EXECUTABLE_NATIVE
 * -----------------
 * Native Lancer system exposes a confirmed runtime entry point.
 *
 * PARTIAL_NATIVE
 * --------------
 * Native system implements some semantics but special rule text remains
 * inert and requires augmentation.
 *
 * SEMANTIC_ONLY
 * -------------
 * Feature exists as data/text but has no confirmed runtime behavior.
 *
 * SUPPLEMENTAL
 * ------------
 * Frame Conn/system bridge supplies runtime semantics.
 *
 * UNKNOWN
 * -------
 * Discovery cannot establish runtime support.
 */

export const ACTOR_OWNED_FEATURE_RUNTIME_STATUS =
  Object.freeze({
    EXECUTABLE_NATIVE:
      "executable-native",

    PARTIAL_NATIVE:
      "partial-native",

    SEMANTIC_ONLY:
      "semantic-only",

    SUPPLEMENTAL:
      "supplemental",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   FEATURE CAPABILITY
   ============================================================ */

export const ACTOR_OWNED_FEATURE_CAPABILITY =
  Object.freeze({
    ACTION:
      "action",

    PROTOCOL:
      "protocol",

    REACTION:
      "reaction",

    PASSIVE:
      "passive",

    TRIGGER:
      "trigger",

    ATTACK:
      "attack",

    DAMAGE:
      "damage",

    TECH:
      "tech",

    MOVEMENT:
      "movement",

    RESOURCE:
      "resource",

    TARGETING:
      "targeting",

    STATUS:
      "status",

    CONDITION:
      "condition",

    LIFECYCLE:
      "lifecycle",

    NATIVE_EXECUTION:
      "native-execution",

    CHAT_POST:
      "chat-post",

    ROLL:
      "roll",

    CUSTOM:
      "custom"
  });

/* ============================================================
   FEATURE ACTION KIND
   ============================================================ */

export const ACTOR_OWNED_FEATURE_ACTION_KIND =
  Object.freeze({
    QUICK:
      "quick",

    FULL:
      "full",

    FREE:
      "free",

    PROTOCOL:
      "protocol",

    REACTION:
      "reaction",

    MOVE:
      "move",

    ATTACK:
      "attack",

    TECH:
      "tech",

    PASSIVE:
      "passive",

    TRIGGERED:
      "triggered",

    OTHER:
      "other"
  });

/* ============================================================
   FEATURE SEMANTIC AUTHORITY
   ============================================================ */

/**
 * @section semantic-authority
 *
 * Indicates where a runtime field came from.
 */

export const ACTOR_OWNED_FEATURE_AUTHORITY =
  Object.freeze({
    NATIVE:
      "native",

    FRAME_CONN:
      "frame-conn",

    SYSTEM_BRIDGE:
      "system-bridge",

    DERIVED:
      "derived",

    SEMANTIC_TEXT:
      "semantic-text",

    UNKNOWN:
      "unknown"
  });

/* ============================================================
   FEATURE DISCOVERY STATUS
   ============================================================ */

export const ACTOR_OWNED_FEATURE_DISCOVERY_STATUS =
  Object.freeze({
    DISCOVERED:
      "discovered",

    PARTIAL:
      "partial",

    SKIPPED:
      "skipped",

    FAILED:
      "failed"
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
   FEATURE IDENTITY
   ============================================================ */

export function createActorOwnedFeatureIdentity({
  id,

  kind,

  ownerKind =
    ACTOR_OWNED_FEATURE_OWNER_KIND.UNKNOWN,

  actorUuid = null,
  pilotUuid = null,
  mechUuid = null,

  itemUuid = null,
  itemId = null,
  itemLid = null,

  rank = null,

  profileIndex = null,
  profileName = null,

  actionPath = null,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Actor-owned feature identity requires id."
    );
  }

  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature kind: ${String(kind)}`
    );
  }

  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_OWNER_KIND,
      ownerKind
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature owner kind: ${String(ownerKind)}`
    );
  }

  return Object.freeze({
    id,

    kind,
    ownerKind,

    actorUuid,
    pilotUuid,
    mechUuid,

    itemUuid,
    itemId,
    itemLid,

    rank:
      finiteNumber(rank)
        ? rank
        : null,

    profileIndex:
      finiteNumber(profileIndex)
        ? profileIndex
        : null,

    profileName,

    actionPath,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   NATIVE PROVENANCE
   ============================================================ */

/**
 * @section native-provenance
 *
 * Preserves exact native identity required to re-enter confirmed Lancer
 * system execution paths.
 */

export function createActorOwnedFeatureNativeReference({
  actorUuid = null,

  itemUuid = null,
  itemId = null,
  itemLid = null,

  itemType = null,

  actionPath = null,
  actionIndex = null,

  profileIndex = null,
  profileName = null,

  nativeMethod = null,
  nativeFlow = null,

  metadata = {}
} = {}) {
  return Object.freeze({
    actorUuid,

    itemUuid,
    itemId,
    itemLid,

    itemType,

    actionPath,

    actionIndex:
      finiteNumber(actionIndex)
        ? actionIndex
        : null,

    profileIndex:
      finiteNumber(profileIndex)
        ? profileIndex
        : null,

    profileName,

    nativeMethod,
    nativeFlow,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   SEMANTIC TEXT REFERENCE
   ============================================================ */

/**
 * @section semantic-text-reference
 *
 * Retains descriptive rule text without pretending it is executable.
 */

export function createActorOwnedFeatureSemanticText({
  name = null,

  description = null,
  effect = null,
  activation = null,

  source = null,

  metadata = {}
} = {}) {
  return Object.freeze({
    name,
    description,
    effect,
    activation,

    source,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   CAPABILITY DECLARATION
   ============================================================ */

export function createActorOwnedFeatureCapability({
  kind,

  authority =
    ACTOR_OWNED_FEATURE_AUTHORITY.UNKNOWN,

  implemented = false,

  reference = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_CAPABILITY,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature capability: ${String(kind)}`
    );
  }

  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_AUTHORITY,
      authority
    )
  ) {
    throw new TypeError(
      `Invalid feature capability authority: ${String(authority)}`
    );
  }

  return Object.freeze({
    kind,

    authority,

    implemented:
      Boolean(implemented),

    reference,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   EVENT TRIGGER DESCRIPTOR
   ============================================================ */

/**
 * @section event-trigger-descriptor
 *
 * Semantic-event vocabulary remains owned by semantic_event_bus.
 *
 * This descriptor only references event kinds.
 */

export function createActorOwnedFeatureTrigger({
  id,

  eventKinds,

  sourceActorOnly = false,
  targetActorOnly = false,

  once = false,

  predicateId = null,

  priority = 0,

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Actor-owned feature trigger requires id."
    );
  }

  const normalizedKinds =
    freezeArray(
      Array.isArray(eventKinds)
        ? eventKinds
        : eventKinds
          ? [eventKinds]
          : []
    );

  if (
    normalizedKinds.length === 0
  ) {
    throw new TypeError(
      "Actor-owned feature trigger requires at least one event kind."
    );
  }

  return Object.freeze({
    id,

    eventKinds:
      normalizedKinds,

    sourceActorOnly:
      Boolean(sourceActorOnly),

    targetActorOnly:
      Boolean(targetActorOnly),

    once:
      Boolean(once),

    predicateId,

    priority:
      finiteNumber(priority)
        ? priority
        : 0,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   NATIVE EXECUTION DESCRIPTOR
   ============================================================ */

/**
 * @section native-execution-descriptor
 *
 * Describes known native execution capability.
 *
 * It does not invoke anything.
 */

export function createActorOwnedFeatureNativeExecution({
  executable = false,

  actorEntryPoint = null,
  itemEntryPoint = null,

  flowName = null,
  workflowName = null,

  actionPath = null,

  nativeReference = null,

  producesChat = false,
  performsRoll = false,
  mutatesDocuments = false,

  metadata = {}
} = {}) {
  return Object.freeze({
    executable:
      Boolean(executable),

    actorEntryPoint,
    itemEntryPoint,

    flowName,
    workflowName,

    actionPath,

    nativeReference,

    producesChat:
      Boolean(producesChat),

    performsRoll:
      Boolean(performsRoll),

    mutatesDocuments:
      Boolean(mutatesDocuments),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   FEATURE ACTION DESCRIPTOR
   ============================================================ */

/**
 * @section feature-action-descriptor
 *
 * One actionable/triggerable unit exposed by an owned feature.
 */

export function createActorOwnedFeatureAction({
  id,

  name = null,

  kind =
    ACTOR_OWNED_FEATURE_ACTION_KIND.OTHER,

  activationType = null,

  actionEconomy = null,

  targeting = null,

  resources = [],

  lifecycle = null,

  triggers = [],

  nativeExecution = null,

  runtimeStatus =
    ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN,

  semanticText = null,

  capabilities = [],

  metadata = {}
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Actor-owned feature action requires id."
    );
  }

  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_ACTION_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature action kind: ${String(kind)}`
    );
  }

  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS,
      runtimeStatus
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature runtime status: ${String(runtimeStatus)}`
    );
  }

  return Object.freeze({
    id,

    name,

    kind,
    activationType,

    actionEconomy,

    targeting,

    resources:
      freezeArray(resources),

    lifecycle,

    triggers:
      freezeArray(triggers),

    nativeExecution,

    runtimeStatus,

    semanticText,

    capabilities:
      freezeArray(capabilities),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   ACTOR-OWNED FEATURE DESCRIPTOR
   ============================================================ */

/**
 * @section actor-owned-feature-descriptor
 *
 * Canonical normalized actor-owned feature.
 */

export function createActorOwnedFeatureDescriptor({
  identity,

  name = null,

  runtimeStatus =
    ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN,

  nativeReference = null,

  semanticText = null,

  actions = [],

  triggers = [],

  resources = [],

  lifecycle = null,

  targeting = null,

  capabilities = [],

  tags = [],

  active = true,

  equipped = null,
  mounted = null,

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "Actor-owned feature descriptor requires identity."
    );
  }

  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS,
      runtimeStatus
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature runtime status: ${String(runtimeStatus)}`
    );
  }

  return Object.freeze({
    identity,

    name,

    runtimeStatus,

    nativeReference,

    semanticText,

    actions:
      freezeArray(actions),

    triggers:
      freezeArray(triggers),

    resources:
      freezeArray(resources),

    lifecycle,

    targeting,

    capabilities:
      freezeArray(capabilities),

    tags:
      freezeArray(tags),

    active:
      Boolean(active),

    equipped:
      equipped == null
        ? null
        : Boolean(equipped),

    mounted:
      mounted == null
        ? null
        : Boolean(mounted),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   DISCOVERY RESULT
   ============================================================ */

export function createActorOwnedFeatureDiscoveryResult({
  status =
    ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.DISCOVERED,

  actorUuid = null,

  features = [],

  skipped = [],

  issues = [],

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature discovery status: ${String(status)}`
    );
  }

  return Object.freeze({
    status,

    actorUuid,

    features:
      freezeArray(features),

    skipped:
      freezeArray(skipped),

    issues:
      freezeArray(issues),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   NORMALIZATION RESULT
   ============================================================ */

export function createActorOwnedFeatureNormalizationResult({
  status =
    ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.DISCOVERED,

  source = null,

  descriptor = null,

  issues = [],

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid actor-owned feature normalization status: ${String(status)}`
    );
  }

  return Object.freeze({
    status,

    source,

    descriptor,

    issues:
      freezeArray(issues),

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   RUNTIME SUPPORT PREDICATES
   ============================================================ */

export function isActorOwnedFeatureNativeExecutable(
  descriptor
) {
  return (
    descriptor?.runtimeStatus ===
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.EXECUTABLE_NATIVE ||
    descriptor
      ?.actions
      ?.some(
        action =>
          action
            ?.nativeExecution
            ?.executable === true
      )
  );
}

export function doesActorOwnedFeatureRequireAugmentation(
  descriptor
) {
  return Boolean(
    descriptor &&
    (
      descriptor.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE ||
      descriptor.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY ||
      descriptor.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN
    )
  );
}

export function isActorOwnedFeatureSemanticOnly(
  descriptor
) {
  return (
    descriptor?.runtimeStatus ===
    ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY
  );
}

/* ============================================================
   FEATURE KIND HELPERS
   ============================================================ */

export function isActorOwnedWeaponFeature(
  descriptor
) {
  return Boolean(
    descriptor &&
    (
      descriptor.identity?.kind ===
        ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON ||
      descriptor.identity?.kind ===
        ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON ||
      descriptor.identity?.kind ===
        ACTOR_OWNED_FEATURE_KIND.WEAPON_PROFILE
    )
  );
}

export function isActorOwnedSystemFeature(
  descriptor
) {
  return Boolean(
    descriptor &&
    (
      descriptor.identity?.kind ===
        ACTOR_OWNED_FEATURE_KIND.MECH_SYSTEM ||
      descriptor.identity?.kind ===
        ACTOR_OWNED_FEATURE_KIND.CORE_SYSTEM
    )
  );
}

export function isActorOwnedPassiveFeature(
  descriptor
) {
  return Boolean(
    descriptor
      ?.capabilities
      ?.some(
        capability =>
          capability.kind ===
          ACTOR_OWNED_FEATURE_CAPABILITY.PASSIVE
      )
  );
}

export function isActorOwnedTriggeredFeature(
  descriptor
) {
  return Boolean(
    descriptor
      ?.triggers
      ?.length ||
    descriptor
      ?.actions
      ?.some(
        action =>
          action
            ?.triggers
            ?.length
      )
  );
}

/* ============================================================
   FEATURE ACTION LOOKUP
   ============================================================ */

export function getActorOwnedFeatureAction(
  descriptor,
  actionId
) {
  if (
    !descriptor ||
    !requiredString(actionId)
  ) {
    return null;
  }

  return (
    descriptor.actions.find(
      action =>
        action.id ===
        actionId
    ) ??
    null
  );
}

/* ============================================================
   FEATURE ACTION FLATTENING
   ============================================================ */

/**
 * @section feature-action-flattening
 *
 * Registry can expose all actor-owned actions without losing feature
 * provenance.
 */

export function flattenActorOwnedFeatureActions(
  descriptors
) {
  const results = [];

  for (
    const descriptor of
      descriptors ?? []
  ) {
    for (
      const action of
        descriptor.actions ??
        []
    ) {
      results.push(
        Object.freeze({
          feature:
            descriptor,

          action
        })
      );
    }
  }

  return Object.freeze(
    results
  );
}

/* ============================================================
   KNOWN NATIVE / PARTIAL / SEMANTIC RULE
   ============================================================ */

/**
 * @section runtime-support-rule
 *
 * The actor-owned registry must preserve the distinction discovered in the
 * Lancer system traces:
 *
 * CATEGORY 1
 * ----------
 * Confirmed native runtime chain exists.
 *
 * Example shape:
 *
 * native item/action
 * → native entry point
 * → Flow/workflow
 * → roll/chat/document mutation
 *
 * runtimeStatus = EXECUTABLE_NATIVE
 *
 *
 * CATEGORY 2
 * ----------
 * Native system implements substantial mechanics but special rule behavior
 * remains inert.
 *
 * Examples include weapons/systems where:
 *
 * attack/damage/range/tags/resource consumption are native
 * but special effect text is semantic only.
 *
 * runtimeStatus = PARTIAL_NATIVE
 *
 *
 * CATEGORY 3
 * ----------
 * Native system provides primarily semantic/descriptive data.
 *
 * Traits, talents, core bonuses, some system/weapon special effects, NHP
 * control/cascade rules may fall here depending on confirmed trace.
 *
 * runtimeStatus = SEMANTIC_ONLY
 *
 * Never upgrade PARTIAL_NATIVE/SEMANTIC_ONLY to executable solely because
 * descriptive text exists.
 */

/* ============================================================
   WEAPON RULE
   ============================================================ */

/**
 * @section weapon-rule
 *
 * A mech weapon descriptor may preserve:
 *
 * native attack execution
 * native damage execution
 * Range
 * Threat
 * tags
 * Limited/Loaded state
 * weapon profile
 * mount identity
 *
 * while a weapon special effect remains unimplemented.
 *
 * Therefore one feature may contain:
 *
 * runtimeStatus = PARTIAL_NATIVE
 *
 * actions:
 *
 * - attack → EXECUTABLE_NATIVE
 * - special effect → SEMANTIC_ONLY/SUPPLEMENTAL
 *
 * Do not classify the whole weapon solely by its attack roll capability.
 */

/* ============================================================
   MOUNTED SYSTEM RULE
   ============================================================ */

/**
 * @section mounted-system-rule
 *
 * Mounted systems are mixed.
 *
 * Preserve separately:
 *
 * native structured actions
 * native resource fields
 * passive semantic text
 * special activation text
 *
 * Individual actions may have different runtimeStatus values.
 */

/* ============================================================
   TALENT / TRAIT / CORE BONUS RULE
   ============================================================ */

/**
 * @section talent-trait-core-bonus-rule
 *
 * These frequently expose:
 *
 * name
 * rank
 * description/effect text
 *
 * without complete native runtime automation.
 *
 * Discovery/normalization must preserve that data but must not infer:
 *
 * triggers
 * resource frequency
 * lifecycle
 * targeting
 * effects
 *
 * unless confirmed from structured native data or supplied later by
 * system_bridge augmentation.
 */

/* ============================================================
   NHP RULE
   ============================================================ */

/**
 * @section nhp-rule
 *
 * NHP ownership may be discovered as actor/item state.
 *
 * Autopilot/cascade tabletop semantics are not considered executable merely
 * because an NHP item exists.
 *
 * Preserve:
 *
 * item identity
 * activation/state data
 * any confirmed native fields
 *
 * Missing control/cascade semantics belong to supplemental runtime metadata
 * later.
 */

/* ============================================================
   RESOURCE RELATIONSHIP
   ============================================================ */

/**
 * @section resource-relationship
 *
 * Actor-owned feature descriptors may reference ResourceDescriptor values.
 *
 * Examples:
 *
 * Limited weapon/system uses
 * once-per-round Talent
 * once-per-scene Trait
 * Loaded weapon state
 * supplemental charges
 *
 * resource_service remains resource authority.
 */

/* ============================================================
   ACTION ECONOMY RELATIONSHIP
   ============================================================ */

/**
 * @section action-economy-relationship
 *
 * Feature actions may carry:
 *
 * activationType
 * actionEconomy
 *
 * Examples:
 *
 * QUICK
 * FULL
 * PROTOCOL
 * REACTION
 * FREE
 *
 * action_economy remains validation/commit authority.
 */

/* ============================================================
   TARGETING RELATIONSHIP
   ============================================================ */

/**
 * @section targeting-relationship
 *
 * Feature/action descriptors may reference TargetingRequirement.
 *
 * Examples:
 *
 * weapon Range/Threat
 * system Sensors
 * Talent adjacency
 * self-only action
 *
 * targeting_spatial_service remains acquisition/validation authority.
 */

/* ============================================================
   LIFECYCLE RELATIONSHIP
   ============================================================ */

/**
 * @section lifecycle-relationship
 *
 * Feature/action descriptors may carry normalized lifecycle metadata:
 *
 * expiration
 * resets
 *
 * Examples:
 *
 * once/round
 * once/scene
 * until end of turn
 * until end of target's next turn
 *
 * lifecycle_service remains timing authority.
 */

/* ============================================================
   SEMANTIC EVENT RELATIONSHIP
   ============================================================ */

/**
 * @section semantic-event-relationship
 *
 * Trigger descriptors reference semantic_event_bus event kinds.
 *
 * Example:
 *
 * attack.hit
 * movement.completed
 * turn.started
 *
 * The actor-owned registry can later install listeners from these
 * declarations.
 *
 * It does not define a second event vocabulary.
 */

/* ============================================================
   EXISTING FRAME CONN REGISTRY RELATIONSHIP
   ============================================================ */

/**
 * @section existing-frame-conn-registry-relationship
 *
 * Existing Frame Conn registry:
 *
 * global/declared actions
 *
 * Actor-owned feature registry:
 *
 * actor-specific owned mechanics
 *
 * Neither replaces the other.
 *
 * future system_bridge composes:
 *
 * existing registry entry
 * +
 * actor-owned feature descriptor
 * +
 * augmentation
 * → runtime feature descriptor
 */

/* ============================================================
   SYSTEM BRIDGE RELATIONSHIP
   ============================================================ */

/**
 * @section system-bridge-relationship
 *
 * system_bridge may supplement missing:
 *
 * action economy
 * target rules
 * trigger event kinds
 * lifecycle
 * resources
 * special effect execution metadata
 *
 * Bridge must preserve:
 *
 * identity
 * provenance
 * native executable paths
 *
 * It must not overwrite confirmed native truth with inferred semantics.
 */

/* ============================================================
   DISCOVERY / NORMALIZATION BOUNDARY
   ============================================================ */

/**
 * @section discovery-normalization-boundary
 *
 * actor-owned-feature-discovery.js:
 *
 * "What does this actor own?"
 *
 * actor-owned-feature-normalizer.js:
 *
 * "What normalized feature/action descriptors can we safely construct?"
 *
 * actor-owned-feature-registry.js:
 *
 * "What normalized owned features are currently registered for this actor?"
 *
 * system_bridge:
 *
 * "What missing runtime semantics should be added/combined?"
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Actor-owned descriptors preserve native actor/item identity.
 *
 * INVARIANT 2
 * Feature kind and runtime support status are separate concepts.
 *
 * INVARIANT 3
 * A feature may contain actions with different runtime support levels.
 *
 * INVARIANT 4
 * Native executable paths are preserved exactly when confirmed.
 *
 * INVARIANT 5
 * Semantic text is preserved without being treated as executable code.
 *
 * INVARIANT 6
 * PARTIAL_NATIVE explicitly represents mixed native/inert mechanics.
 *
 * INVARIANT 7
 * Resource declarations do not make this registry resource authority.
 *
 * INVARIANT 8
 * Targeting declarations do not make this registry targeting authority.
 *
 * INVARIANT 9
 * Lifecycle declarations do not make this registry lifecycle authority.
 *
 * INVARIANT 10
 * Trigger declarations use semantic_event_bus vocabulary.
 *
 * INVARIANT 11
 * Existing Frame Conn registry and actor-owned registry remain separate
 * sources before system_bridge composition.
 *
 * INVARIANT 12
 * system_bridge may supplement missing semantics but must preserve native
 * provenance.
 *
 * INVARIANT 13
 * Discovery/normalization must not infer executable rules from prose alone.
 *
 * INVARIANT 14
 * This contract remains Foundry/Lancer-import free.
 */