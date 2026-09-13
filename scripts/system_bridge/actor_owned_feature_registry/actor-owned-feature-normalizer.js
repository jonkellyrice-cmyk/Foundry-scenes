/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/actor_owned_feature_registry/actor-owned-feature-normalizer.js
 */

/**
 * @file
 * @path main/actor_owned_feature_registry/actor-owned-feature-normalizer.js
 * @module actor-owned-feature-normalizer
 * @layer actor-owned-feature-registry-normalization
 * @responsibility convert-raw-owned-feature-discovery-into-safe-normalized-runtime-descriptors
 * @public-boundary false
 * @side-effects none
 *
 * @depends-on
 * - actor-owned-feature-contract
 * - actor-owned-feature-discovery
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes raw discovery candidates
 * - produces normalized ActorOwnedFeatureDescriptor values
 * - preserves native execution/provenance
 * - derives only semantics supported by structured native data
 * - leaves missing runtime semantics for future system_bridge augmentation
 * - consumed by actor-owned-feature-registry.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - discovery owns native actor/item enumeration
 * - normalizer owns safe structural normalization
 * - registry owns current actor-specific indexing
 * - system_bridge owns supplementation/composition
 * - native_adapter remains native execution authority
 *
 * THIS FILE OWNS:
 * - discovery candidate → feature descriptor normalization
 * - discovery action → normalized feature action
 * - weapon profile normalization
 * - Talent rank normalization
 * - native execution normalization
 * - safe structured activation normalization
 * - safe structured targeting/resource extraction
 * - runtime support classification
 * - feature capability derivation
 * - normalization issue reporting
 *
 * THIS FILE DOES NOT OWN:
 * - actor/item discovery
 * - prose interpretation
 * - native execution
 * - target validation
 * - resource mutation
 * - lifecycle execution
 * - semantic event listener registration
 * - system bridge augmentation
 *
 * EDIT CONTRACT:
 * - normalize structured native truth only
 * - do not infer rules from descriptive prose
 * - preserve PARTIAL_NATIVE when native execution and inert semantics coexist
 * - preserve semantic text for later augmentation
 * - prefer UNKNOWN over invented runtime behavior
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  ACTOR_OWNED_FEATURE_ACTION_KIND,
  ACTOR_OWNED_FEATURE_AUTHORITY,
  ACTOR_OWNED_FEATURE_CAPABILITY,
  ACTOR_OWNED_FEATURE_DISCOVERY_STATUS,
  ACTOR_OWNED_FEATURE_KIND,
  ACTOR_OWNED_FEATURE_RUNTIME_STATUS,
  createActorOwnedFeatureAction,
  createActorOwnedFeatureCapability,
  createActorOwnedFeatureDescriptor,
  createActorOwnedFeatureIdentity,
  createActorOwnedFeatureNativeExecution,
  createActorOwnedFeatureNativeReference,
  createActorOwnedFeatureNormalizationResult,
  createActorOwnedFeatureSemanticText
} from "./actor-owned-feature-contract.js";

import {
  getActorOwnedDiscoveryIdentityKey,
  hasDiscoveredNativeExecution
} from "./actor-owned-feature-discovery.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const ACTOR_OWNED_FEATURE_NORMALIZER_MODULE_ID =
  "lancer-frame-conn.actor-owned-feature-normalizer";

export const ACTOR_OWNED_FEATURE_NORMALIZER_MODULE_VERSION =
  1;

/* ============================================================
   NORMALIZATION ISSUE CODE
   ============================================================ */

export const ACTOR_OWNED_FEATURE_NORMALIZATION_ISSUE =
  Object.freeze({
    MISSING_IDENTITY:
      "missing-identity",

    UNKNOWN_FEATURE_KIND:
      "unknown-feature-kind",

    UNKNOWN_ACTIVATION:
      "unknown-activation",

    NATIVE_EXECUTION_UNCONFIRMED:
      "native-execution-unconfirmed",

    STRUCTURED_TARGETING_PARTIAL:
      "structured-targeting-partial",

    STRUCTURED_RESOURCE_PARTIAL:
      "structured-resource-partial",

    UNSUPPORTED_STRUCTURED_DATA:
      "unsupported-structured-data"
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

function normalizeString(value) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
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

function createNormalizationIssue(
  code,
  {
    message = null,
    source = null,
    metadata = {}
  } = {}
) {
  return Object.freeze({
    code,

    message:
      message ??
      code,

    source,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   FEATURE ID CONSTRUCTION
   ============================================================ */

/**
 * @section feature-id-construction
 */

export function buildActorOwnedFeatureId(
  candidate
) {
  const discoveryKey =
    getActorOwnedDiscoveryIdentityKey(
      candidate
    );

  if (discoveryKey) {
    return discoveryKey;
  }

  if (
    candidate?.actorUuid &&
    candidate?.itemLid
  ) {
    return `${candidate.actorUuid}:${candidate.itemLid}`;
  }

  if (
    candidate?.actorUuid &&
    candidate?.name
  ) {
    return (
      `${candidate.actorUuid}:` +
      `${normalizeString(candidate.name)}`
    );
  }

  return null;
}

/* ============================================================
   ACTION ID CONSTRUCTION
   ============================================================ */

function buildActorOwnedActionId(
  featureId,
  actionCandidate,
  {
    profileIndex = null,
    talentRank = null
  } = {}
) {
  const explicit =
    actionCandidate?.id;

  if (requiredString(explicit)) {
    return `${featureId}:action:${explicit}`;
  }

  if (
    finiteNumber(profileIndex)
  ) {
    return (
      `${featureId}:profile:${profileIndex}:action:` +
      `${actionCandidate?.index ?? 0}`
    );
  }

  if (
    finiteNumber(talentRank)
  ) {
    return (
      `${featureId}:rank:${talentRank}:action:` +
      `${actionCandidate?.index ?? 0}`
    );
  }

  return (
    `${featureId}:action:` +
    `${actionCandidate?.index ?? 0}`
  );
}

/* ============================================================
   ACTIVATION NORMALIZATION
   ============================================================ */

/**
 * @section activation-normalization
 *
 * Structured activation only.
 *
 * No prose parsing.
 */

export function normalizeActorOwnedFeatureActionKind(
  value
) {
  const normalized =
    normalizeString(
      value
    );

  switch (normalized) {
    case "quick":
    case "quick-action":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.QUICK;

    case "full":
    case "full-action":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.FULL;

    case "free":
    case "free-action":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.FREE;

    case "protocol":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.PROTOCOL;

    case "reaction":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.REACTION;

    case "move":
    case "movement":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.MOVE;

    case "attack":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.ATTACK;

    case "tech":
    case "quick-tech":
    case "full-tech":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.TECH;

    case "passive":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.PASSIVE;

    case "triggered":
    case "trigger":
      return ACTOR_OWNED_FEATURE_ACTION_KIND.TRIGGERED;

    default:
      return ACTOR_OWNED_FEATURE_ACTION_KIND.OTHER;
  }
}

/* ============================================================
   NATIVE REFERENCE NORMALIZATION
   ============================================================ */

export function normalizeActorOwnedNativeReference(
  candidate,
  {
    action = null,
    profile = null,
    talentRank = null
  } = {}
) {
  return createActorOwnedFeatureNativeReference({
    actorUuid:
      candidate?.actorUuid ??
      null,

    itemUuid:
      candidate?.itemUuid ??
      null,

    itemId:
      candidate?.itemId ??
      null,

    itemLid:
      candidate?.itemLid ??
      null,

    itemType:
      candidate?.itemType ??
      null,

    actionPath:
      action?.path ??
      null,

    actionIndex:
      action?.index ??
      null,

    profileIndex:
      profile?.index ??
      null,

    profileName:
      profile?.name ??
      null,

    nativeMethod:
      action
        ?.nativeExecution
        ?.nativeMethod ??
      profile
        ?.nativeExecution
        ?.nativeMethod ??
      candidate
        ?.nativeExecution
        ?.nativeMethod ??
      null,

    nativeFlow:
      action
        ?.nativeExecution
        ?.nativeFlow ??
      profile
        ?.nativeExecution
        ?.nativeFlow ??
      candidate
        ?.nativeExecution
        ?.nativeFlow ??
      null,

    metadata: {
      talentRank:
        talentRank?.rank ??
        null
    }
  });
}

/* ============================================================
   NATIVE EXECUTION NORMALIZATION
   ============================================================ */

export function normalizeActorOwnedNativeExecution(
  raw,
  {
    nativeReference = null,
    actionPath = null
  } = {}
) {
  if (!raw) {
    return createActorOwnedFeatureNativeExecution({
      executable:
        false,

      actionPath,

      nativeReference
    });
  }

  return createActorOwnedFeatureNativeExecution({
    executable:
      raw.executable ===
      true,

    actorEntryPoint:
      raw.actorEntryPoint ??
      raw.actorMethod ??
      null,

    itemEntryPoint:
      raw.itemEntryPoint ??
      raw.itemMethod ??
      null,

    flowName:
      raw.flowName ??
      raw.flow ??
      null,

    workflowName:
      raw.workflowName ??
      raw.workflow ??
      null,

    actionPath:
      raw.actionPath ??
      actionPath,

    nativeReference,

    producesChat:
      raw.producesChat ??
      raw.chat ??
      false,

    performsRoll:
      raw.performsRoll ??
      raw.roll ??
      false,

    mutatesDocuments:
      raw.mutatesDocuments ??
      raw.mutates ??
      false,

    metadata:
      raw.metadata ??
      {}
  });
}

/* ============================================================
   SEMANTIC TEXT NORMALIZATION
   ============================================================ */

/**
 * @section semantic-text-normalization
 *
 * Keep text inert.
 */

function normalizeSemanticText(
  value,
  {
    name = null,
    source = null
  } = {}
) {
  if (!value) {
    return createActorOwnedFeatureSemanticText({
      name,
      source
    });
  }

  return createActorOwnedFeatureSemanticText({
    name:
      value.name ??
      name,

    description:
      value.description ??
      value.desc ??
      null,

    effect:
      value.effect ??
      value.effects ??
      null,

    activation:
      value.activation ??
      value.activationText ??
      null,

    source,

    metadata:
      value.metadata ??
      {}
  });
}

/* ============================================================
   STRUCTURED RANGE EXTRACTION
   ============================================================ */

/**
 * @section structured-range-extraction
 *
 * Returns normalized numbers only when explicitly present.
 *
 * This does not construct final TargetingRequirement.
 */

function extractStructuredSpatialData(
  value
) {
  if (!value) {
    return null;
  }

  const range =
    finiteNumber(value.range)
      ? value.range
      : finiteNumber(
          value.Range
        )
        ? value.Range
        : null;

  const threat =
    finiteNumber(value.threat)
      ? value.threat
      : finiteNumber(
          value.Threat
        )
        ? value.Threat
        : null;

  const sensors =
    finiteNumber(value.sensors)
      ? value.sensors
      : finiteNumber(
          value.sensorRange
        )
        ? value.sensorRange
        : null;

  if (
    range == null &&
    threat == null &&
    sensors == null
  ) {
    return null;
  }

  return Object.freeze({
    range,
    threat,
    sensors
  });
}

/* ============================================================
   STRUCTURED RESOURCE EXTRACTION
   ============================================================ */

/**
 * @section structured-resource-extraction
 *
 * Preserve structured evidence.
 *
 * Final ResourceDescriptor construction may happen in system_bridge or
 * registry composition once native resource authority is known.
 */

function extractStructuredResourceData(
  value,
  tags = []
) {
  if (!value) {
    return null;
  }

  const limited =
    value.limited ??
    value.uses ??
    value.maxUses ??
    null;

  const loaded =
    value.loaded ??
    value.isLoaded ??
    null;

  const charges =
    value.charges ??
    value.charge ??
    null;

  const normalizedTags =
    (
      tags ??
      []
    ).map(
      tag =>
        normalizeString(
          tag?.name ??
          tag?.id ??
          tag
        )
    );

  const hasLimitedTag =
    normalizedTags.some(
      tag =>
        tag === "limited" ||
        tag.startsWith("limited-")
    );

  const hasLoadedTag =
    normalizedTags.includes(
      "loaded"
    );

  if (
    limited == null &&
    loaded == null &&
    charges == null &&
    !hasLimitedTag &&
    !hasLoadedTag
  ) {
    return null;
  }

  return Object.freeze({
    limited,

    loaded,

    charges,

    hasLimitedTag,
    hasLoadedTag
  });
}

/* ============================================================
   CAPABILITY CONSTRUCTION
   ============================================================ */

function createCapability(
  kind,
  {
    authority =
      ACTOR_OWNED_FEATURE_AUTHORITY.DERIVED,

    implemented = false,

    reference = null,

    metadata = {}
  } = {}
) {
  return createActorOwnedFeatureCapability({
    kind,
    authority,
    implemented,
    reference,
    metadata
  });
}

/* ============================================================
   ACTION CAPABILITIES
   ============================================================ */

function deriveActionCapabilities(
  {
    kind,
    nativeExecution,
    spatialData,
    resourceData
  }
) {
  const capabilities = [];

  if (
    kind !==
    ACTOR_OWNED_FEATURE_ACTION_KIND.OTHER
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.ACTION,
        {
          implemented:
            nativeExecution?.executable ===
            true
        }
      )
    );
  }

  if (
    kind ===
    ACTOR_OWNED_FEATURE_ACTION_KIND.PROTOCOL
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.PROTOCOL,
        {
          implemented:
            nativeExecution?.executable ===
            true
        }
      )
    );
  }

  if (
    kind ===
    ACTOR_OWNED_FEATURE_ACTION_KIND.REACTION
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.REACTION,
        {
          implemented:
            nativeExecution?.executable ===
            true
        }
      )
    );
  }

  if (
    kind ===
    ACTOR_OWNED_FEATURE_ACTION_KIND.ATTACK
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.ATTACK,
        {
          implemented:
            nativeExecution?.executable ===
            true
        }
      )
    );
  }

  if (
    kind ===
    ACTOR_OWNED_FEATURE_ACTION_KIND.TECH
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.TECH,
        {
          implemented:
            nativeExecution?.executable ===
            true
        }
      )
    );
  }

  if (spatialData) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.TARGETING,
        {
          implemented:
            true,

          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE,

          reference:
            spatialData
        }
      )
    );
  }

  if (resourceData) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.RESOURCE,
        {
          implemented:
            true,

          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE,

          reference:
            resourceData
        }
      )
    );
  }

  if (
    nativeExecution?.producesChat
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.CHAT_POST,
        {
          implemented:
            true,

          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE
        }
      )
    );
  }

  if (
    nativeExecution?.performsRoll
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.ROLL,
        {
          implemented:
            true,

          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE
        }
      )
    );
  }

  if (
    nativeExecution?.executable
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.NATIVE_EXECUTION,
        {
          implemented:
            true,

          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE,

          reference:
            nativeExecution
        }
      )
    );
  }

  return Object.freeze(
    capabilities
  );
}

/* ============================================================
   ACTION RUNTIME STATUS
   ============================================================ */

function classifyActionRuntimeStatus(
  {
    nativeExecution,
    semanticText,
    structuredDataPresent = false
  }
) {
  const native =
    nativeExecution?.executable ===
    true;

  const hasSemanticText =
    Boolean(
      semanticText?.description ||
      semanticText?.effect ||
      semanticText?.activation
    );

  if (
    native &&
    hasSemanticText
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE;
  }

  if (native) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.EXECUTABLE_NATIVE;
  }

  if (
    structuredDataPresent &&
    hasSemanticText
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE;
  }

  if (hasSemanticText) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY;
  }

  return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN;
}

/* ============================================================
   ACTION NORMALIZATION
   ============================================================ */

export function normalizeActorOwnedFeatureAction(
  featureId,
  candidate,
  actionCandidate,
  {
    profile = null,
    talentRank = null,
    systemData = null,
    tags = []
  } = {}
) {
  const nativeReference =
    normalizeActorOwnedNativeReference(
      candidate,
      {
        action:
          actionCandidate,

        profile,

        talentRank
      }
    );

  const nativeExecution =
    normalizeActorOwnedNativeExecution(
      actionCandidate
        ?.nativeExecution ??
      profile
        ?.nativeExecution ??
      talentRank
        ?.nativeExecution ??
      candidate
        ?.nativeExecution ??
      null,
      {
        nativeReference,

        actionPath:
          actionCandidate?.path ??
          null
      }
    );

  const kind =
    normalizeActorOwnedFeatureActionKind(
      actionCandidate?.activation ??
      actionCandidate
        ?.action
        ?.activation ??
      actionCandidate
        ?.action
        ?.activationType ??
      null
    );

  const semanticText =
    normalizeSemanticText(
      actionCandidate?.action,
      {
        name:
          actionCandidate?.name ??
          null,

        source:
          candidate?.itemLid ??
          candidate?.itemUuid ??
          null
      }
    );

  const spatialData =
    extractStructuredSpatialData(
      actionCandidate?.action ??
      profile?.profile ??
      systemData
    );

  const resourceData =
    extractStructuredResourceData(
      actionCandidate?.action ??
      systemData,
      tags
    );

  const runtimeStatus =
    classifyActionRuntimeStatus({
      nativeExecution,
      semanticText,

      structuredDataPresent:
        Boolean(
          spatialData ||
          resourceData
        )
    });

  const id =
    buildActorOwnedActionId(
      featureId,
      actionCandidate,
      {
        profileIndex:
          profile?.index ??
          null,

        talentRank:
          talentRank?.rank ??
          null
      }
    );

  return createActorOwnedFeatureAction({
    id,

    name:
      actionCandidate?.name ??
      semanticText?.name ??
      null,

    kind,

    activationType:
      actionCandidate?.activation ??
      actionCandidate
        ?.action
        ?.activation ??
      actionCandidate
        ?.action
        ?.activationType ??
      null,

    actionEconomy:
      null,

    targeting:
      spatialData,

    resources:
      resourceData
        ? [resourceData]
        : [],

    lifecycle:
      null,

    triggers:
      [],

    nativeExecution,

    runtimeStatus,

    semanticText,

    capabilities:
      deriveActionCapabilities({
        kind,
        nativeExecution,
        spatialData,
        resourceData
      }),

    metadata: {
      actionPath:
        actionCandidate?.path ??
        null,

      actionIndex:
        actionCandidate?.index ??
        null,

      profileIndex:
        profile?.index ??
        null,

      profileName:
        profile?.name ??
        null,

      talentRank:
        talentRank?.rank ??
        null
    }
  });
}

/* ============================================================
   PROFILE ACTION NORMALIZATION
   ============================================================ */

function normalizeProfileActions(
  featureId,
  candidate
) {
  const actions = [];

  for (
    const profile of
      candidate.profiles ??
      []
  ) {
    for (
      const action of
        profile.actions ??
        []
    ) {
      actions.push(
        normalizeActorOwnedFeatureAction(
          featureId,
          candidate,
          action,
          {
            profile,

            systemData:
              profile.profile ??
              candidate.systemData,

            tags:
              [
                ...(
                  candidate.tags ??
                  []
                ),
                ...(
                  profile.tags ??
                  []
                )
              ]
          }
        )
      );
    }
  }

  return actions;
}

/* ============================================================
   TALENT RANK ACTION NORMALIZATION
   ============================================================ */

function normalizeTalentRankActions(
  featureId,
  candidate
) {
  const actions = [];

  for (
    const rank of
      candidate.talentRanks ??
      []
  ) {
    for (
      const action of
        rank.actions ??
        []
    ) {
      actions.push(
        normalizeActorOwnedFeatureAction(
          featureId,
          candidate,
          action,
          {
            talentRank:
              rank,

            systemData:
              rank.data ??
              candidate.systemData,

            tags:
              candidate.tags ??
              []
          }
        )
      );
    }
  }

  return actions;
}

/* ============================================================
   TOP-LEVEL ACTION NORMALIZATION
   ============================================================ */

function normalizeTopLevelActions(
  featureId,
  candidate
) {
  return (
    candidate.actions ??
    []
  ).map(
    action =>
      normalizeActorOwnedFeatureAction(
        featureId,
        candidate,
        action,
        {
          systemData:
            candidate.systemData,

          tags:
            candidate.tags
        }
      )
  );
}

/* ============================================================
   SYNTHETIC WEAPON PROFILE ACTION
   ============================================================ */

/**
 * @section synthetic-weapon-profile-action
 *
 * Only created when the profile itself has confirmed native execution but no
 * explicit action record.
 *
 * This is structural normalization of confirmed native capability, not prose
 * inference.
 */

function normalizeExecutableWeaponProfiles(
  featureId,
  candidate
) {
  const actions = [];

  for (
    const profile of
      candidate.profiles ??
      []
  ) {
    if (
      profile
        ?.actions
        ?.length
    ) {
      continue;
    }

    if (
      profile
        ?.nativeExecution
        ?.executable !==
      true
    ) {
      continue;
    }

    const syntheticAction =
      Object.freeze({
        id:
          null,

        index:
          0,

        path:
          `profiles.${profile.index}`,

        name:
          profile.name ??
          candidate.name,

        activation:
          "attack",

        action:
          profile.profile ??
          {},

        nativeExecution:
          profile.nativeExecution
      });

    actions.push(
      normalizeActorOwnedFeatureAction(
        featureId,
        candidate,
        syntheticAction,
        {
          profile,

          systemData:
            profile.profile ??
            candidate.systemData,

          tags: [
            ...(
              candidate.tags ??
              []
            ),
            ...(
              profile.tags ??
              []
            )
          ]
        }
      )
    );
  }

  return actions;
}

/* ============================================================
   SYNTHETIC TOP-LEVEL NATIVE ACTION
   ============================================================ */

/**
 * @section synthetic-top-level-native-action
 *
 * Used only when native inspection confirms the item itself is executable
 * but discovery exposes no structured child action/profile.
 */

function normalizeTopLevelNativeExecutionAction(
  featureId,
  candidate
) {
  if (
    candidate
      ?.nativeExecution
      ?.executable !==
    true
  ) {
    return [];
  }

  if (
    candidate.actions?.length ||
    candidate.profiles?.length ||
    candidate.talentRanks?.some(
      rank =>
        rank?.actions?.length
    )
  ) {
    return [];
  }

  const activation =
    candidate
      ?.systemData
      ?.activation ??
    candidate
      ?.systemData
      ?.activationType ??
    null;

  const syntheticAction =
    Object.freeze({
      id:
        null,

      index:
        0,

      path:
        candidate
          ?.nativeExecution
          ?.actionPath ??
        null,

      name:
        candidate.name,

      activation,

      action:
        candidate.systemData ??
        {},

      nativeExecution:
        candidate.nativeExecution
    });

  return [
    normalizeActorOwnedFeatureAction(
      featureId,
      candidate,
      syntheticAction,
      {
        systemData:
          candidate.systemData,

        tags:
          candidate.tags
      }
    )
  ];
}

/* ============================================================
   FEATURE SEMANTIC TEXT
   ============================================================ */

function normalizeFeatureSemanticText(
  candidate
) {
  return normalizeSemanticText(
    candidate.systemData,
    {
      name:
        candidate.name,

      source:
        candidate.itemLid ??
        candidate.itemUuid ??
        null
    }
  );
}

/* ============================================================
   FEATURE CAPABILITY DERIVATION
   ============================================================ */

function deriveFeatureCapabilities(
  candidate,
  actions,
  {
    resourceData = null,
    spatialData = null,
    semanticText = null
  } = {}
) {
  const capabilities = [];

  const actionCapabilities =
    new Set(
      actions.flatMap(
        action =>
          action
            ?.capabilities
            ?.map(
              capability =>
                capability.kind
            ) ??
          []
      )
    );

  for (
    const kind of
      actionCapabilities
  ) {
    capabilities.push(
      createCapability(
        kind,
        {
          implemented:
            actions.some(
              action =>
                action
                  ?.capabilities
                  ?.some(
                    capability =>
                      capability.kind ===
                        kind &&
                      capability.implemented
                  )
            )
        }
      )
    );
  }

  if (
    actions.length === 0 &&
    semanticText &&
    (
      semanticText.description ||
      semanticText.effect
    )
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.PASSIVE,
        {
          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.SEMANTIC_TEXT,

          implemented:
            false
        }
      )
    );
  }

  if (
    resourceData &&
    !actionCapabilities.has(
      ACTOR_OWNED_FEATURE_CAPABILITY.RESOURCE
    )
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.RESOURCE,
        {
          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE,

          implemented:
            true,

          reference:
            resourceData
        }
      )
    );
  }

  if (
    spatialData &&
    !actionCapabilities.has(
      ACTOR_OWNED_FEATURE_CAPABILITY.TARGETING
    )
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.TARGETING,
        {
          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE,

          implemented:
            true,

          reference:
            spatialData
        }
      )
    );
  }

  if (
    hasDiscoveredNativeExecution(
      candidate
    ) &&
    !actionCapabilities.has(
      ACTOR_OWNED_FEATURE_CAPABILITY.NATIVE_EXECUTION
    )
  ) {
    capabilities.push(
      createCapability(
        ACTOR_OWNED_FEATURE_CAPABILITY.NATIVE_EXECUTION,
        {
          authority:
            ACTOR_OWNED_FEATURE_AUTHORITY.NATIVE,

          implemented:
            true
        }
      )
    );
  }

  return Object.freeze(
    capabilities
  );
}

/* ============================================================
   FEATURE RUNTIME STATUS
   ============================================================ */

/**
 * @section feature-runtime-status
 */

export function classifyActorOwnedFeatureRuntimeStatus(
  candidate,
  actions,
  {
    semanticText = null
  } = {}
) {
  const executableActionCount =
    actions.filter(
      action =>
        action
          ?.nativeExecution
          ?.executable ===
        true
    ).length;

  const semanticOnlyActionCount =
    actions.filter(
      action =>
        action.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY
    ).length;

  const partialActionCount =
    actions.filter(
      action =>
        action.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE
    ).length;

  const hasNative =
    hasDiscoveredNativeExecution(
      candidate
    );

  const hasSemantic =
    Boolean(
      semanticText?.description ||
      semanticText?.effect ||
      semanticText?.activation
    );

  if (
    hasNative &&
    (
      partialActionCount > 0 ||
      semanticOnlyActionCount > 0 ||
      hasSemantic
    )
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE;
  }

  if (
    hasNative &&
    executableActionCount > 0 &&
    executableActionCount ===
      actions.length
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.EXECUTABLE_NATIVE;
  }

  if (
    hasNative &&
    actions.length === 0
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.EXECUTABLE_NATIVE;
  }

  if (
    partialActionCount > 0
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE;
  }

  if (
    hasSemantic ||
    semanticOnlyActionCount > 0
  ) {
    return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY;
  }

  return ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN;
}

/* ============================================================
   FEATURE NORMALIZATION
   ============================================================ */

/**
 * @section feature-normalization
 */

export function normalizeActorOwnedFeatureCandidate(
  candidate
) {
  if (!candidate) {
    return createActorOwnedFeatureNormalizationResult({
      status:
        ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED,

      source:
        candidate,

      issues: [
        createNormalizationIssue(
          ACTOR_OWNED_FEATURE_NORMALIZATION_ISSUE.MISSING_IDENTITY,
          {
            message:
              "Actor-owned feature candidate is missing."
          }
        )
      ]
    });
  }

  const featureId =
    buildActorOwnedFeatureId(
      candidate
    );

  if (!requiredString(featureId)) {
    return createActorOwnedFeatureNormalizationResult({
      status:
        ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED,

      source:
        candidate,

      issues: [
        createNormalizationIssue(
          ACTOR_OWNED_FEATURE_NORMALIZATION_ISSUE.MISSING_IDENTITY,
          {
            message:
              "Actor-owned feature has no stable native identity.",

            source:
              candidate
          }
        )
      ]
    });
  }

  const issues = [];

  if (
    candidate.featureKind ===
    ACTOR_OWNED_FEATURE_KIND.OTHER
  ) {
    issues.push(
      createNormalizationIssue(
        ACTOR_OWNED_FEATURE_NORMALIZATION_ISSUE.UNKNOWN_FEATURE_KIND,
        {
          source:
            candidate
        }
      )
    );
  }

  const identity =
    createActorOwnedFeatureIdentity({
      id:
        featureId,

      kind:
        candidate.featureKind ??
        ACTOR_OWNED_FEATURE_KIND.OTHER,

      ownerKind:
        candidate.ownerKind,

      actorUuid:
        candidate.actorUuid,

      pilotUuid:
        candidate.pilotUuid,

      mechUuid:
        candidate.mechUuid,

      itemUuid:
        candidate.itemUuid,

      itemId:
        candidate.itemId,

      itemLid:
        candidate.itemLid,

      metadata: {
        itemType:
          candidate.itemType
      }
    });

  const nativeReference =
    normalizeActorOwnedNativeReference(
      candidate
    );

  const semanticText =
    normalizeFeatureSemanticText(
      candidate
    );

  const topLevelActions =
    normalizeTopLevelActions(
      featureId,
      candidate
    );

  const profileActions =
    normalizeProfileActions(
      featureId,
      candidate
    );

  const talentActions =
    normalizeTalentRankActions(
      featureId,
      candidate
    );

  const executableProfiles =
    normalizeExecutableWeaponProfiles(
      featureId,
      candidate
    );

  const topLevelNativeActions =
    normalizeTopLevelNativeExecutionAction(
      featureId,
      candidate
    );

  const actions =
    Object.freeze([
      ...topLevelActions,
      ...profileActions,
      ...talentActions,
      ...executableProfiles,
      ...topLevelNativeActions
    ]);

  const spatialData =
    extractStructuredSpatialData(
      candidate.systemData
    );

  const resourceData =
    extractStructuredResourceData(
      candidate.systemData,
      candidate.tags
    );

  const runtimeStatus =
    classifyActorOwnedFeatureRuntimeStatus(
      candidate,
      actions,
      {
        semanticText
      }
    );

  if (
    !hasDiscoveredNativeExecution(
      candidate
    ) &&
    runtimeStatus !==
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY
  ) {
    issues.push(
      createNormalizationIssue(
        ACTOR_OWNED_FEATURE_NORMALIZATION_ISSUE.NATIVE_EXECUTION_UNCONFIRMED,
        {
          source:
            candidate
        }
      )
    );
  }

  const descriptor =
    createActorOwnedFeatureDescriptor({
      identity,

      name:
        candidate.name,

      runtimeStatus,

      nativeReference,

      semanticText,

      actions,

      triggers:
        [],

      resources:
        resourceData
          ? [resourceData]
          : [],

      lifecycle:
        null,

      targeting:
        spatialData,

      capabilities:
        deriveFeatureCapabilities(
          candidate,
          actions,
          {
            resourceData,
            spatialData,
            semanticText
          }
        ),

      tags:
        candidate.tags ??
        [],

      active:
        true,

      equipped:
        candidate.equipped,

      mounted:
        candidate.mounted,

      metadata: {
        itemType:
          candidate.itemType,

        systemData:
          candidate.systemData,

        discoveryModule:
          candidate
            ?.metadata
            ?.discoveredBy ??
          null,

        normalizedBy:
          ACTOR_OWNED_FEATURE_NORMALIZER_MODULE_ID
      }
    });

  return createActorOwnedFeatureNormalizationResult({
    status:
      issues.length > 0
        ? ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.PARTIAL
        : ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.DISCOVERED,

    source:
      candidate,

    descriptor,

    issues
  });
}

/* ============================================================
   DISCOVERY RESULT NORMALIZATION
   ============================================================ */

/**
 * @section discovery-result-normalization
 */

export function normalizeActorOwnedFeatureDiscovery(
  discovery
) {
  if (!discovery) {
    return Object.freeze({
      status:
        ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED,

      actorUuid:
        null,

      descriptors:
        Object.freeze([]),

      results:
        Object.freeze([]),

      issues:
        Object.freeze([
          createNormalizationIssue(
            ACTOR_OWNED_FEATURE_NORMALIZATION_ISSUE.MISSING_IDENTITY,
            {
              message:
                "Actor-owned feature discovery result is unavailable."
            }
          )
        ])
    });
  }

  const results =
    (
      discovery.features ??
      []
    ).map(
      normalizeActorOwnedFeatureCandidate
    );

  const descriptors =
    results
      .map(
        result =>
          result.descriptor
      )
      .filter(Boolean);

  const issues =
    results.flatMap(
      result =>
        result.issues ??
        []
    );

  let status =
    ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.DISCOVERED;

  if (
    descriptors.length === 0 &&
    (
      discovery.status ===
        ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED ||
      issues.length > 0
    )
  ) {
    status =
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED;
  } else if (
    discovery.status ===
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.PARTIAL ||
    issues.length > 0
  ) {
    status =
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.PARTIAL;
  }

  return Object.freeze({
    status,

    actorUuid:
      discovery.actorUuid ??
      null,

    descriptors:
      Object.freeze(
        descriptors
      ),

    results:
      Object.freeze(
        results
      ),

    issues:
      Object.freeze([
        ...(
          discovery.issues ??
          []
        ),
        ...issues
      ]),

    metadata:
      Object.freeze({
        discoveryMetadata:
          discovery.metadata ??
          {}
      })
  });
}

/* ============================================================
   TALENT RANK DESCRIPTOR EXPANSION
   ============================================================ */

/**
 * @section talent-rank-descriptor-expansion
 *
 * Talent ranks remain represented inside one Talent descriptor through
 * action metadata by default.
 *
 * If actor_owned_feature_registry later needs rank-level indexing, use this
 * helper to construct rank-specific views without mutating the source
 * descriptor.
 */

export function expandActorOwnedTalentRankViews(
  descriptor
) {
  if (
    descriptor
      ?.identity
      ?.kind !==
    ACTOR_OWNED_FEATURE_KIND.TALENT
  ) {
    return Object.freeze([]);
  }

  const rankNumbers =
    new Set(
      descriptor.actions
        .map(
          action =>
            action
              ?.metadata
              ?.talentRank
        )
        .filter(
          finiteNumber
        )
    );

  return Object.freeze(
    [
      ...rankNumbers
    ]
      .sort(
        (
          first,
          second
        ) =>
          first - second
      )
      .map(
        rank =>
          Object.freeze({
            feature:
              descriptor,

            rank,

            actions:
              Object.freeze(
                descriptor.actions.filter(
                  action =>
                    action
                      ?.metadata
                      ?.talentRank ===
                    rank
                )
              )
          })
      )
  );
}

/* ============================================================
   WEAPON PROFILE VIEW EXPANSION
   ============================================================ */

export function expandActorOwnedWeaponProfileViews(
  descriptor
) {
  if (
    descriptor
      ?.identity
      ?.kind !==
      ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON &&
    descriptor
      ?.identity
      ?.kind !==
      ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON
  ) {
    return Object.freeze([]);
  }

  const profileIndexes =
    new Set(
      descriptor.actions
        .map(
          action =>
            action
              ?.metadata
              ?.profileIndex
        )
        .filter(
          finiteNumber
        )
    );

  return Object.freeze(
    [
      ...profileIndexes
    ]
      .sort(
        (
          first,
          second
        ) =>
          first - second
      )
      .map(
        profileIndex =>
          Object.freeze({
            feature:
              descriptor,

            profileIndex,

            actions:
              Object.freeze(
                descriptor.actions.filter(
                  action =>
                    action
                      ?.metadata
                      ?.profileIndex ===
                    profileIndex
                )
              )
          })
      )
  );
}

/* ============================================================
   FEATURE ACTION RUNTIME GROUPING
   ============================================================ */

export function groupActorOwnedFeatureActionsByRuntimeStatus(
  descriptor
) {
  const groups = {};

  for (
    const status of
      Object.values(
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS
      )
  ) {
    groups[status] =
      [];
  }

  for (
    const action of
      descriptor?.actions ??
      []
  ) {
    const status =
      action.runtimeStatus ??
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN;

    groups[status]
      ?.push(
        action
      );
  }

  for (
    const key of
      Object.keys(groups)
  ) {
    groups[key] =
      Object.freeze(
        groups[key]
      );
  }

  return Object.freeze(
    groups
  );
}

/* ============================================================
   AUGMENTATION NEEDS
   ============================================================ */

/**
 * @section augmentation-needs
 *
 * Compact bridge-facing diagnostic.
 */

export function getActorOwnedFeatureAugmentationNeeds(
  descriptor
) {
  if (!descriptor) {
    return Object.freeze([]);
  }

  const needs =
    new Set();

  if (
    descriptor.runtimeStatus ===
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE ||
    descriptor.runtimeStatus ===
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY ||
    descriptor.runtimeStatus ===
      ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN
  ) {
    needs.add(
      "runtime"
    );
  }

  for (
    const action of
      descriptor.actions ??
      []
  ) {
    if (
      action.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.PARTIAL_NATIVE ||
      action.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.SEMANTIC_ONLY ||
      action.runtimeStatus ===
        ACTOR_OWNED_FEATURE_RUNTIME_STATUS.UNKNOWN
    ) {
      needs.add(
        "action-runtime"
      );
    }

    if (
      action.kind !==
        ACTOR_OWNED_FEATURE_ACTION_KIND.OTHER &&
      !action.actionEconomy
    ) {
      needs.add(
        "action-economy"
      );
    }
  }

  if (
    descriptor.semanticText?.effect &&
    descriptor.triggers.length ===
      0
  ) {
    needs.add(
      "trigger-or-effect-semantics"
    );
  }

  return Object.freeze([
    ...needs
  ]);
}

/* ============================================================
   WEAPON NORMALIZATION NOTES
   ============================================================ */

/**
 * @section weapon-normalization-notes
 *
 * Weapon normalization preserves:
 *
 * native item/profile identity
 * structured profile data
 * native attack execution
 * structured Range/Threat evidence
 * tags/resource evidence
 *
 * It does NOT automate weapon special effect prose.
 *
 * Common result:
 *
 * feature.runtimeStatus = PARTIAL_NATIVE
 *
 * attack action:
 * EXECUTABLE_NATIVE
 *
 * special text:
 * preserved inert for system_bridge augmentation.
 */

/* ============================================================
   MOUNTED SYSTEM NORMALIZATION NOTES
   ============================================================ */

/**
 * @section mounted-system-normalization-notes
 *
 * Mounted systems may contain:
 *
 * structured native action
 * Limited resource data
 * semantic passive/special text
 *
 * Normalize each action independently.
 *
 * Do not classify the whole system executable merely because one action has
 * a native handler.
 */

/* ============================================================
   TALENT NORMALIZATION NOTES
   ============================================================ */

/**
 * @section talent-normalization-notes
 *
 * Talent rank prose remains inert.
 *
 * Structured rank actions may become normalized actions.
 *
 * No semantic event trigger is inferred from phrases like:
 *
 * "when"
 * "after"
 * "once per round"
 *
 * Those enter later through curated augmentation.
 */

/* ============================================================
   CORE BONUS / FRAME TRAIT NOTES
   ============================================================ */

/**
 * @section core-bonus-frame-trait-notes
 *
 * If native discovery exposes only descriptive effect text:
 *
 * runtimeStatus = SEMANTIC_ONLY
 *
 * capabilities may include PASSIVE implemented=false.
 *
 * This is expected and useful:
 *
 * system_bridge can later supply only the missing runtime semantics.
 */

/* ============================================================
   NHP NORMALIZATION NOTES
   ============================================================ */

/**
 * @section nhp-normalization-notes
 *
 * NHP item ownership may normalize normally.
 *
 * Autopilot/cascade rules are not inferred.
 *
 * Unless native structured execution proves otherwise:
 *
 * those mechanics remain SEMANTIC_ONLY / augmentation-needed.
 */

/* ============================================================
   RESOURCE NORMALIZATION NOTES
   ============================================================ */

/**
 * @section resource-normalization-notes
 *
 * Structured Limited/Loaded/charge evidence is preserved.
 *
 * This file intentionally does not always construct final ResourceDescriptor
 * because resource authority/storage semantics may depend on:
 *
 * native resource implementation
 * Frame Conn supplemental resource
 * bridge metadata
 *
 * system_bridge/resource resolver can perform final composition.
 */

/* ============================================================
   TARGETING NORMALIZATION NOTES
   ============================================================ */

/**
 * @section targeting-normalization-notes
 *
 * Structured:
 *
 * range
 * threat
 * sensors
 *
 * may be preserved as spatial evidence.
 *
 * This file does not infer:
 *
 * target kind
 * ally/enemy restriction
 * LOS
 * adjacency
 * maximum targets
 *
 * unless such data exists structurally.
 *
 * Final TargetingRequirement belongs to bridge/runtime composition.
 */

/* ============================================================
   ACTION ECONOMY NORMALIZATION NOTES
   ============================================================ */

/**
 * @section action-economy-normalization-notes
 *
 * Structured activation is normalized into action.kind.
 *
 * action.actionEconomy remains null until the action_economy contract is
 * deliberately mapped by bridge/runtime composition.
 *
 * This prevents activation naming differences from silently becoming
 * resource/economy mutation policy.
 */

/* ============================================================
   RUNTIME STATUS RULE
   ============================================================ */

/**
 * @section runtime-status-rule
 *
 * EXECUTABLE_NATIVE:
 * confirmed native execution and no known unimplemented semantic remainder.
 *
 * PARTIAL_NATIVE:
 * confirmed native execution plus semantic/supplemental behavior still
 * missing.
 *
 * SEMANTIC_ONLY:
 * meaningful effect text exists but no confirmed executable path.
 *
 * UNKNOWN:
 * insufficient structured/native evidence.
 *
 * SUPPLEMENTAL:
 * not assigned by this normalizer.
 * That status belongs to later Frame Conn/system bridge augmentation.
 */

/* ============================================================
   SYSTEM BRIDGE BOUNDARY
   ============================================================ */

/**
 * @section system-bridge-boundary
 *
 * Normalizer output is intentionally incomplete where native data is
 * incomplete.
 *
 * Intended later flow:
 *
 * normalized actor-owned descriptor
 * +
 * existing Frame Conn registry entry
 * +
 * augmentation
 * +
 * foundational service contracts
 *        ↓
 * system_bridge
 *        ↓
 * RuntimeFeatureDescriptor
 *
 * The normalizer should not preempt that composition.
 */

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * native_adapter/
 * ---------------
 *
 * Supplies authoritative discovery evidence indirectly.
 *
 *
 * actor-owned-feature-discovery.js
 * --------------------------------
 *
 * Supplies raw candidates.
 *
 *
 * resource_service/
 * -----------------
 *
 * Final resource semantics remain downstream.
 *
 *
 * action_economy/
 * ---------------
 *
 * Final economy semantics remain downstream.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Final TargetingRequirement remains downstream.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * No lifecycle timing is inferred from prose here.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * No trigger event kind is inferred from prose here.
 *
 *
 * system_bridge/
 * --------------
 *
 * Adds missing semantics later without refactoring discovery/native data.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getActorOwnedFeatureNormalizerDiagnostics() {
  return Object.freeze({
    id:
      ACTOR_OWNED_FEATURE_NORMALIZER_MODULE_ID,

    version:
      ACTOR_OWNED_FEATURE_NORMALIZER_MODULE_VERSION,

    rules:
      Object.freeze({
        parsesSemanticProse:
          false,

        preservesNativeExecution:
          true,

        supportsPartialNative:
          true,

        constructsFinalBridgeDescriptor:
          false
      })
  });
}

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Normalizer consumes discovery candidates, never native actor/item APIs
 * directly.
 *
 * INVARIANT 2
 * Stable native identity is required for normalized registration.
 *
 * INVARIANT 3
 * Descriptive prose remains inert.
 *
 * INVARIANT 4
 * Structured native execution is preserved exactly as evidence.
 *
 * INVARIANT 5
 * Actions are classified independently from parent feature runtime status.
 *
 * INVARIANT 6
 * PARTIAL_NATIVE is preferred when native mechanics and inert semantic
 * behavior coexist.
 *
 * INVARIANT 7
 * Structured Range/Threat/Sensors evidence may be preserved without
 * inventing full targeting legality.
 *
 * INVARIANT 8
 * Structured resource evidence may be preserved without inventing final
 * resource authority/storage.
 *
 * INVARIANT 9
 * Activation may normalize action kind but not full action economy policy.
 *
 * INVARIANT 10
 * Talent rank prose does not become event triggers automatically.
 *
 * INVARIANT 11
 * Lifecycle timing is never inferred from prose.
 *
 * INVARIANT 12
 * NHP autopilot/cascade semantics are not inferred from NHP ownership.
 *
 * INVARIANT 13
 * Existing Frame Conn registry is not merged here.
 *
 * INVARIANT 14
 * system_bridge remains responsible for supplementation/composition.
 *
 * INVARIANT 15
 * This module remains free of Foundry/Lancer runtime imports.
 */