/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/targeting_spatial_service/targeting-spatial-resolver.js
 */

/**
 * @file
 * @path main/targeting_spatial_service/targeting-spatial-resolver.js
 * @module targeting-spatial-resolver
 * @layer targeting-spatial-service-resolution
 * @responsibility acquire-normalize-and-resolve-runtime-target-selections
 * @public-boundary false
 * @side-effects delegated-target-selection-and-template-resolution
 *
 * @depends-on
 * - targeting-spatial-contract
 * - targeting-spatial-query
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes semantic_execution_context target/source data
 * - consumed by targeting-validator.js
 * - consumed by targeting-spatial-hooks.js
 * - consumed by targeting-spatial-service.js
 * - future actor_owned_feature_registry/ supplies targeting requirements
 * - future system_bridge/ supplies missing targeting metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - targeting-spatial-query.js owns spatial facts
 * - targeting-spatial-resolver.js owns acquisition/normalization
 * - targeting-validator.js owns legality
 * - execution_transaction/ owns targeting stage timing
 * - native_adapter remains native Foundry/Lancer token/document authority
 *
 * THIS FILE OWNS:
 * - TargetingRequest construction
 * - source normalization
 * - selected target normalization
 * - self-target resolution
 * - selected point resolution
 * - area/template target resolution
 * - target-selection adapter configuration
 * - acquisition fallback/prompt routing
 * - target-resolution result normalization
 *
 * THIS FILE DOES NOT OWN:
 * - range legality
 * - LOS legality
 * - sensors legality
 * - target relationship legality
 * - attack execution
 * - native document mutation
 * - target UI implementation
 *
 * EDIT CONTRACT:
 * - resolve what was selected, not whether selection is legal
 * - all UI/native acquisition passes through injected adapter
 * - existing context targets are preferred before prompting
 * - do not prompt when target mode requires none
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  TARGET_KIND,
  TARGETING_MODE,
  TARGET_RESOLUTION_STATUS,
  createAreaDescriptor,
  createTargetReference,
  createTargetResolutionResult,
  createTargetingRequest
} from "./targeting-spatial-contract.js";

import {
  normalizeSpatialEntity,
  normalizeSpatialPoint,
  queryArea,
  resolveSpatialEntity
} from "./targeting-spatial-query.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const TARGETING_SPATIAL_RESOLVER_MODULE_ID =
  "lancer-frame-conn.targeting-spatial-resolver";

export const TARGETING_SPATIAL_RESOLVER_MODULE_VERSION =
  1;

/* ============================================================
   TARGET ACQUISITION ADAPTER
   ============================================================ */

/**
 * @section target-acquisition-adapter
 *
 * Runtime composition injects player/native selection behavior.
 *
 * Recommended interface:
 *
 * {
 *   getSelectedTargets(context, options?)
 *
 *   promptForTargets(request, context, options?)
 *
 *   getSelectedPoint(context, options?)
 *
 *   promptForPoint(request, context, options?)
 *
 *   getPlacedTemplate(context, options?)
 *
 *   promptForTemplate(request, context, options?)
 * }
 *
 * Adapter may use:
 *
 * Foundry user targets
 * token selection
 * MeasuredTemplate placement
 * Frame Conn targeting UI
 *
 * This module remains UI-independent.
 */

let targetingAcquisitionAdapter =
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

function isTargetingMode(
  value
) {
  return Object
    .values(
      TARGETING_MODE
    )
    .includes(value);
}

/* ============================================================
   ACQUISITION ADAPTER CONFIGURATION
   ============================================================ */

export function setTargetingAcquisitionAdapter(
  adapter
) {
  if (adapter == null) {
    targetingAcquisitionAdapter =
      null;

    return true;
  }

  if (!isObject(adapter)) {
    throw new TypeError(
      "Targeting acquisition adapter must be object or null."
    );
  }

  targetingAcquisitionAdapter =
    adapter;

  return true;
}

export function getTargetingAcquisitionAdapter() {
  return targetingAcquisitionAdapter;
}

export function hasTargetingAcquisitionAdapter() {
  return Boolean(
    targetingAcquisitionAdapter
  );
}

/* ============================================================
   EXECUTION SOURCE RESOLUTION
   ============================================================ */

/**
 * @section execution-source-resolution
 */

export async function resolveTargetingSource(
  context
) {
  const candidate =
    context
      ?.spatial
      ?.source ??
    context
      ?.sourceToken ??
    context
      ?.actors
      ?.mech ??
    context
      ?.actors
      ?.pilot ??
    context
      ?.actors
      ?.actor ??
    null;

  if (!candidate) {
    return null;
  }

  return resolveSpatialEntity(
    candidate
  );
}

/* ============================================================
   TARGET REFERENCE NORMALIZATION
   ============================================================ */

export async function normalizeTargetReference(
  value
) {
  if (!value) {
    return null;
  }

  const entity =
    await resolveSpatialEntity(
      value
    );

  if (!entity) {
    return null;
  }

  return createTargetReference({
    id:
      value.id ??
      entity.tokenUuid ??
      entity.actorUuid ??
      null,

    kind:
      value.kind ??
      entity.kind ??
      TARGET_KIND.TOKEN,

    relationship:
      value.relationship ??
      "unknown",

    actorUuid:
      entity.actorUuid,

    tokenUuid:
      entity.tokenUuid,

    sceneId:
      entity.sceneId,

    name:
      entity.name,

    position:
      entity.position,

    footprint:
      entity.footprint,

    metadata: {
      ...(
        value.metadata ??
        {}
      ),

      spatialEntity:
        entity
    }
  });
}

/* ============================================================
   TARGET COLLECTION NORMALIZATION
   ============================================================ */

export async function normalizeTargetReferences(
  values,
  {
    allowDuplicates = false
  } = {}
) {
  const targets = [];

  const seen =
    new Set();

  for (
    const value of
      normalizeArray(values)
  ) {
    const target =
      await normalizeTargetReference(
        value
      );

    if (!target) {
      continue;
    }

    const identity =
      target.tokenUuid ??
      target.actorUuid ??
      target.id;

    if (
      !allowDuplicates &&
      identity &&
      seen.has(identity)
    ) {
      continue;
    }

    if (identity) {
      seen.add(identity);
    }

    targets.push(
      target
    );
  }

  return Object.freeze(
    targets
  );
}

/* ============================================================
   CONTEXT TARGET EXTRACTION
   ============================================================ */

/**
 * @section context-target-extraction
 */

function getContextTargetCandidates(
  context
) {
  return (
    context
      ?.targets ??
    context
      ?.targeting
      ?.targets ??
    context
      ?.targeting
      ?.selectedTargets ??
    []
  );
}

/* ============================================================
   CURRENT USER TARGET SELECTION
   ============================================================ */

async function resolveCurrentSelectedTargets(
  context,
  options = {}
) {
  const contextTargets =
    getContextTargetCandidates(
      context
    );

  if (
    Array.isArray(contextTargets) &&
    contextTargets.length > 0
  ) {
    return normalizeTargetReferences(
      contextTargets,
      options
    );
  }

  if (
    typeof targetingAcquisitionAdapter
      ?.getSelectedTargets ===
    "function"
  ) {
    const selected =
      await targetingAcquisitionAdapter
        .getSelectedTargets(
          context,
          options
        );

    return normalizeTargetReferences(
      selected,
      options
    );
  }

  return Object.freeze([]);
}

/* ============================================================
   TARGET PROMPT
   ============================================================ */

async function promptForTargets(
  request,
  context,
  options = {}
) {
  if (
    typeof targetingAcquisitionAdapter
      ?.promptForTargets !==
    "function"
  ) {
    return null;
  }

  const selected =
    await targetingAcquisitionAdapter
      .promptForTargets(
        request,
        context,
        options
      );

  if (
    selected == null
  ) {
    return null;
  }

  return normalizeTargetReferences(
    selected,
    {
      allowDuplicates:
        request
          ?.requirement
          ?.allowDuplicateTargets ??
        false
    }
  );
}

/* ============================================================
   SELF TARGET RESOLUTION
   ============================================================ */

async function resolveSelfTarget(
  source
) {
  if (!source) {
    return null;
  }

  return createTargetReference({
    id:
      source.tokenUuid ??
      source.actorUuid ??
      null,

    kind:
      source.kind,

    relationship:
      "self",

    actorUuid:
      source.actorUuid,

    tokenUuid:
      source.tokenUuid,

    sceneId:
      source.sceneId,

    name:
      source.name,

    position:
      source.position,

    footprint:
      source.footprint,

    metadata: {
      self:
        true,

      spatialEntity:
        source
    }
  });
}

/* ============================================================
   SELECTED POINT RESOLUTION
   ============================================================ */

async function resolveCurrentSelectedPoint(
  context
) {
  const contextPoint =
    context
      ?.targeting
      ?.point ??
    context
      ?.targeting
      ?.selectedPoint ??
    context
      ?.destination ??
    null;

  if (contextPoint) {
    return normalizeSpatialPoint(
      contextPoint
    );
  }

  if (
    typeof targetingAcquisitionAdapter
      ?.getSelectedPoint ===
    "function"
  ) {
    const selected =
      await targetingAcquisitionAdapter
        .getSelectedPoint(
          context
        );

    return normalizeSpatialPoint(
      selected
    );
  }

  return null;
}

async function promptForPoint(
  request,
  context,
  options = {}
) {
  if (
    typeof targetingAcquisitionAdapter
      ?.promptForPoint !==
    "function"
  ) {
    return null;
  }

  const selected =
    await targetingAcquisitionAdapter
      .promptForPoint(
        request,
        context,
        options
      );

  return normalizeSpatialPoint(
    selected
  );
}

/* ============================================================
   AREA NORMALIZATION
   ============================================================ */

function normalizeAreaDescriptor(
  area
) {
  if (!area) {
    return null;
  }

  if (
    area.shape &&
    Object.isFrozen(area)
  ) {
    return area;
  }

  return createAreaDescriptor({
    shape:
      area.shape,

    origin:
      normalizeSpatialPoint(
        area.origin
      ),

    radius:
      area.radius,

    length:
      area.length,

    width:
      area.width,

    direction:
      area.direction,

    angle:
      area.angle,

    includeOrigin:
      area.includeOrigin,

    metadata:
      area.metadata ??
      {}
  });
}

/* ============================================================
   CURRENT TEMPLATE / AREA RESOLUTION
   ============================================================ */

async function resolveCurrentArea(
  request,
  context
) {
  const contextArea =
    context
      ?.targeting
      ?.area ??
    context
      ?.targeting
      ?.template ??
    request
      ?.area ??
    request
      ?.requirement
      ?.area ??
    null;

  if (contextArea) {
    return normalizeAreaDescriptor(
      contextArea
    );
  }

  if (
    typeof targetingAcquisitionAdapter
      ?.getPlacedTemplate ===
    "function"
  ) {
    const template =
      await targetingAcquisitionAdapter
        .getPlacedTemplate(
          context,
          {
            request
          }
        );

    return normalizeAreaDescriptor(
      template
    );
  }

  return null;
}

async function promptForArea(
  request,
  context,
  options = {}
) {
  if (
    typeof targetingAcquisitionAdapter
      ?.promptForTemplate !==
    "function"
  ) {
    return null;
  }

  const template =
    await targetingAcquisitionAdapter
      .promptForTemplate(
        request,
        context,
        options
      );

  return normalizeAreaDescriptor(
    template
  );
}

/* ============================================================
   TARGETING REQUEST FROM EXECUTION CONTEXT
   ============================================================ */

/**
 * @section targeting-request-from-execution-context
 */

export async function buildTargetingRequest(
  context,
  {
    requirement = null,

    selectedTargets = null,

    selectedPoint = null,

    area = null
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "buildTargetingRequest requires ExecutionContext."
    );
  }

  const source =
    await resolveTargetingSource(
      context
    );

  const runtimeRequirement =
    requirement ??
    context
      ?.targeting
      ?.requirement ??
    null;

  return createTargetingRequest({
    source,

    requirement:
      runtimeRequirement,

    selectedTargets:
      selectedTargets ??
      getContextTargetCandidates(
        context
      ),

    selectedPoint:
      selectedPoint ??
      context
        ?.targeting
        ?.selectedPoint ??
      context
        ?.targeting
        ?.point ??
      null,

    area:
      area ??
      context
        ?.targeting
        ?.area ??
      null,

    metadata: {
      executionId:
        context
          ?.identity
          ?.executionId ??
        null,

      semanticActionId:
        context
          ?.semanticAction
          ?.id ??
        null
    }
  });
}

/* ============================================================
   NO TARGET RESOLUTION
   ============================================================ */

function resolveNoTargetRequest(
  request
) {
  return createTargetResolutionResult({
    status:
      TARGET_RESOLUTION_STATUS.RESOLVED,

    request,

    source:
      request.source,

    targets:
      [],

    metadata: {
      targetMode:
        TARGETING_MODE.NONE
    }
  });
}

/* ============================================================
   SELF TARGET RESOLUTION
   ============================================================ */

async function resolveSelfTargetRequest(
  request
) {
  const target =
    await resolveSelfTarget(
      request.source
    );

  if (!target) {
    return createTargetResolutionResult({
      status:
        TARGET_RESOLUTION_STATUS.FAILED,

      request,

      source:
        request.source,

      reason:
        "self-target-source-unavailable"
    });
  }

  return createTargetResolutionResult({
    status:
      TARGET_RESOLUTION_STATUS.RESOLVED,

    request,

    source:
      request.source,

    targets: [
      target
    ]
  });
}

/* ============================================================
   CHARACTER TARGET RESOLUTION
   ============================================================ */

async function resolveCharacterTargets(
  request,
  context,
  {
    promptIfMissing = true
  } = {}
) {
  let targets =
    await resolveCurrentSelectedTargets(
      context,
      {
        allowDuplicates:
          request
            .requirement
            .allowDuplicateTargets
      }
    );

  if (
    targets.length === 0 &&
    promptIfMissing
  ) {
    const prompted =
      await promptForTargets(
        request,
        context
      );

    if (prompted == null) {
      return createTargetResolutionResult({
        status:
          TARGET_RESOLUTION_STATUS.CANCELLED,

        request,

        source:
          request.source,

        targets:
          [],

        reason:
          "target-selection-cancelled"
      });
    }

    targets =
      prompted;
  }

  if (
    targets.length === 0
  ) {
    return createTargetResolutionResult({
      status:
        TARGET_RESOLUTION_STATUS.NONE,

      request,

      source:
        request.source,

      targets:
        [],

      reason:
        "no-targets-selected"
    });
  }

  return createTargetResolutionResult({
    status:
      TARGET_RESOLUTION_STATUS.RESOLVED,

    request,

    source:
      request.source,

    targets
  });
}

/* ============================================================
   POINT TARGET RESOLUTION
   ============================================================ */

async function resolvePointTarget(
  request,
  context,
  {
    promptIfMissing = true
  } = {}
) {
  let point =
    await resolveCurrentSelectedPoint(
      context
    );

  if (
    !point &&
    promptIfMissing
  ) {
    point =
      await promptForPoint(
        request,
        context
      );
  }

  if (!point) {
    return createTargetResolutionResult({
      status:
        promptIfMissing
          ? TARGET_RESOLUTION_STATUS.CANCELLED
          : TARGET_RESOLUTION_STATUS.NONE,

      request,

      source:
        request.source,

      point:
        null,

      reason:
        "target-point-unavailable"
    });
  }

  return createTargetResolutionResult({
    status:
      TARGET_RESOLUTION_STATUS.RESOLVED,

    request,

    source:
      request.source,

    point
  });
}

/* ============================================================
   AREA / TEMPLATE RESOLUTION
   ============================================================ */

async function resolveAreaTargeting(
  request,
  context,
  {
    promptIfMissing = true
  } = {}
) {
  let area =
    await resolveCurrentArea(
      request,
      context
    );

  if (
    !area &&
    promptIfMissing
  ) {
    area =
      await promptForArea(
        request,
        context
      );
  }

  if (!area) {
    return createTargetResolutionResult({
      status:
        promptIfMissing
          ? TARGET_RESOLUTION_STATUS.CANCELLED
          : TARGET_RESOLUTION_STATUS.NONE,

      request,

      source:
        request.source,

      reason:
        "target-area-unavailable"
    });
  }

  const areaResult =
    await queryArea(
      area
    );

  const targets =
    await normalizeTargetReferences(
      areaResult.targets,
      {
        allowDuplicates:
          false
      }
    );

  return createTargetResolutionResult({
    status:
      TARGET_RESOLUTION_STATUS.RESOLVED,

    request,

    source:
      request.source,

    targets,

    area,

    metadata: {
      areaQuery:
        areaResult
    }
  });
}

/* ============================================================
   PRIMARY TARGET RESOLUTION
   ============================================================ */

/**
 * @section primary-target-resolution
 *
 * Main acquisition entry.
 *
 * No legality checks happen here.
 */

export async function resolveTargetingRequest(
  request,
  context,
  {
    promptIfMissing = true
  } = {}
) {
  if (!request) {
    throw new TypeError(
      "resolveTargetingRequest requires TargetingRequest."
    );
  }

  const mode =
    request
      ?.requirement
      ?.mode ??
    TARGETING_MODE.NONE;

  if (!isTargetingMode(mode)) {
    return createTargetResolutionResult({
      status:
        TARGET_RESOLUTION_STATUS.FAILED,

      request,

      source:
        request.source,

      reason:
        "invalid-targeting-mode"
    });
  }

  switch (mode) {
    case TARGETING_MODE.NONE:
      return resolveNoTargetRequest(
        request
      );

    case TARGETING_MODE.SELF:
      return resolveSelfTargetRequest(
        request
      );

    case TARGETING_MODE.POINT:
      return resolvePointTarget(
        request,
        context,
        {
          promptIfMissing
        }
      );

    case TARGETING_MODE.AREA:
    case TARGETING_MODE.TEMPLATE:
    case TARGETING_MODE.ALL_IN_AREA:
      return resolveAreaTargeting(
        request,
        context,
        {
          promptIfMissing
        }
      );

    case TARGETING_MODE.SINGLE:
    case TARGETING_MODE.MULTIPLE:
    case TARGETING_MODE.ADJACENT:
    case TARGETING_MODE.THREAT:
    case TARGETING_MODE.SENSORS:
    case TARGETING_MODE.CUSTOM:
    default:
      return resolveCharacterTargets(
        request,
        context,
        {
          promptIfMissing
        }
      );
  }
}

/* ============================================================
   EXECUTION TARGET RESOLUTION
   ============================================================ */

/**
 * @section execution-target-resolution
 */

export async function resolveExecutionTargets(
  context,
  {
    requirement = null,
    promptIfMissing = true
  } = {}
) {
  const request =
    await buildTargetingRequest(
      context,
      {
        requirement
      }
    );

  return resolveTargetingRequest(
    request,
    context,
    {
      promptIfMissing
    }
  );
}

/* ============================================================
   EXISTING TARGETS ONLY
   ============================================================ */

/**
 * @section existing-targets-only
 *
 * Useful for previews/prevalidation where UI prompting is not allowed.
 */

export async function resolveExistingExecutionTargets(
  context,
  {
    requirement = null
  } = {}
) {
  return resolveExecutionTargets(
    context,
    {
      requirement,
      promptIfMissing:
        false
    }
  );
}

/* ============================================================
   SINGLE TARGET HELPER
   ============================================================ */

export function getResolvedSingleTarget(
  resolution
) {
  return (
    resolution
      ?.targets
      ?.[0] ??
    null
  );
}

/* ============================================================
   TARGET IDENTITY LOOKUP
   ============================================================ */

export function getResolvedTargetByActorUuid(
  resolution,
  actorUuid
) {
  return (
    resolution
      ?.targets
      ?.find(
        target =>
          target.actorUuid ===
          actorUuid
      ) ??
    null
  );
}

export function getResolvedTargetByTokenUuid(
  resolution,
  tokenUuid
) {
  return (
    resolution
      ?.targets
      ?.find(
        target =>
          target.tokenUuid ===
          tokenUuid
      ) ??
    null
  );
}

/* ============================================================
   TARGET RESOLUTION PREDICATES
   ============================================================ */

export function didTargetResolutionSucceed(
  result
) {
  return Boolean(
    result &&
    (
      result.status ===
        TARGET_RESOLUTION_STATUS.RESOLVED ||
      result.status ===
        TARGET_RESOLUTION_STATUS.NONE
    )
  );
}

export function wasTargetResolutionCancelled(
  result
) {
  return (
    result?.status ===
    TARGET_RESOLUTION_STATUS.CANCELLED
  );
}

export function didTargetResolutionFail(
  result
) {
  return (
    result?.status ===
    TARGET_RESOLUTION_STATUS.FAILED
  );
}

/* ============================================================
   SELECTION PRECEDENCE
   ============================================================ */

/**
 * @section selection-precedence
 *
 * Character targets:
 *
 * 1. ExecutionContext targets
 * 2. current Foundry/Frame Conn selected targets
 * 3. prompt if required and permitted
 *
 *
 * Point:
 *
 * 1. ExecutionContext selected point
 * 2. current selected point from adapter
 * 3. prompt
 *
 *
 * Area/template:
 *
 * 1. ExecutionContext area/template
 * 2. currently placed template
 * 3. prompt/template placement
 */

/* ============================================================
   TARGET COUNT NOTES
   ============================================================ */

/**
 * @section target-count-notes
 *
 * Resolver does NOT enforce:
 *
 * minimumTargets
 * maximumTargets
 *
 * It returns what was selected.
 *
 * targeting-validator.js decides whether that number is legal.
 *
 * This matters because:
 *
 * selection can resolve successfully
 * while final validation fails.
 */

/* ============================================================
   RELATIONSHIP NOTES
   ============================================================ */

/**
 * @section relationship-notes
 *
 * Resolver may preserve a relationship value supplied by native/UI data.
 *
 * It does NOT decide:
 *
 * ally
 * enemy
 * self
 * neutral
 *
 * legality.
 *
 * targeting-validator applies TargetingRequirement.relationships.
 */

/* ============================================================
   RANGE / LOS / SENSORS NOTES
   ============================================================ */

/**
 * @section range-los-sensors-notes
 *
 * Resolver does not call:
 *
 * queryRange()
 * queryThreat()
 * querySensors()
 * queryLineOfSight()
 *
 * merely to decide whether selection exists.
 *
 * Those belong to final validation.
 *
 * Area resolution is the exception because resolving an area inherently
 * requires asking which entities occupy that area.
 */

/* ============================================================
   AREA NOTES
   ============================================================ */

/**
 * @section area-notes
 *
 * Area/template targeting resolves:
 *
 * semantic area descriptor
 *        ↓
 * queryArea()
 *        ↓
 * contained target references
 *
 * targeting-validator later decides:
 *
 * permitted target kinds
 * relationships
 * friendly-fire rules
 * range to area origin
 * LOS to origin/targets
 */

/* ============================================================
   MISSING TARGET PROMPT NOTES
   ============================================================ */

/**
 * @section missing-target-prompt-notes
 *
 * This directly supports Frame Conn committed actions:
 *
 * action requires target
 * + no target selected
 * → target resolver prompts
 *
 * The execution action itself should not contain ad hoc targeting UI logic.
 */

/* ============================================================
   EXECUTION TRANSACTION NOTES
   ============================================================ */

/**
 * @section execution-transaction-notes
 *
 * Intended:
 *
 * PRE_VALIDATE
 * → non-target prerequisites
 *
 * TARGETING
 * → resolveExecutionTargets()
 *
 * FINAL_VALIDATE
 * → targeting-validator
 *
 * EXECUTE
 * → native/semantic action
 *
 * If target prompt is cancelled:
 *
 * targeting result = CANCELLED
 * → transaction cancels before execution
 */

/* ============================================================
   ACTOR-OWNED FEATURE NOTES
   ============================================================ */

/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry may supply requirement:
 *
 * Talent:
 * target one ally
 *
 * Weapon:
 * one hostile target
 *
 * System:
 * target one character in Sensors
 *
 * Resolver only uses requirement.mode to determine acquisition style.
 *
 * All semantic legality remains validator-owned.
 */

/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */

/**
 * @section system-bridge-notes
 *
 * system_bridge may supplement:
 *
 * targeting mode
 * area/template requirement
 * minimum/maximum target count
 *
 * Resolver consumes normalized TargetingRequirement.
 *
 * It does not inspect augmentation provenance.
 */

/* ============================================================
   NATIVE ADAPTER NOTES
   ============================================================ */

/**
 * @section native-adapter-notes
 *
 * Runtime acquisition adapter should be implemented using confirmed native
 * Foundry/Lancer pathways.
 *
 * Examples:
 *
 * current user targets
 * token UUID resolution
 * MeasuredTemplate placement
 *
 * This file should not directly reach:
 *
 * game.user.targets
 * canvas.tokens
 * canvas.templates
 *
 * unless those accesses are deliberately encapsulated by the injected
 * runtime adapter.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getTargetingSpatialResolverDiagnostics() {
  return Object.freeze({
    id:
      TARGETING_SPATIAL_RESOLVER_MODULE_ID,

    version:
      TARGETING_SPATIAL_RESOLVER_MODULE_VERSION,

    adapterConfigured:
      hasTargetingAcquisitionAdapter(),

    adapterCapabilities:
      Object.freeze({
        getSelectedTargets:
          typeof targetingAcquisitionAdapter?.getSelectedTargets ===
          "function",

        promptForTargets:
          typeof targetingAcquisitionAdapter?.promptForTargets ===
          "function",

        getSelectedPoint:
          typeof targetingAcquisitionAdapter?.getSelectedPoint ===
          "function",

        promptForPoint:
          typeof targetingAcquisitionAdapter?.promptForPoint ===
          "function",

        getPlacedTemplate:
          typeof targetingAcquisitionAdapter?.getPlacedTemplate ===
          "function",

        promptForTemplate:
          typeof targetingAcquisitionAdapter?.promptForTemplate ===
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
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies existing target/source identity when already known.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns targeting stage timing.
 *
 *
 * targeting-spatial-query.js
 * --------------------------
 *
 * Resolves spatial entities and area contents.
 *
 *
 * targeting-validator.js
 * ----------------------
 *
 * Owns all final target legality.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Runtime composition should implement acquisition adapter with confirmed
 * Foundry/Lancer APIs.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later supplies normalized TargetingRequirement.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplies missing target acquisition semantics.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * targeting-spatial-resolver.js owns acquisition, not legality.
 *
 * INVARIANT 2
 * Existing ExecutionContext targets are preferred before UI prompting.
 *
 * INVARIANT 3
 * Targeting mode NONE never prompts.
 *
 * INVARIANT 4
 * SELF resolves from source without prompt.
 *
 * INVARIANT 5
 * SINGLE/MULTIPLE/ADJACENT/THREAT/SENSORS acquire character targets but do
 * not validate their spatial legality.
 *
 * INVARIANT 6
 * POINT resolves a spatial point, not a character target.
 *
 * INVARIANT 7
 * AREA/TEMPLATE resolution may query contained entities as part of
 * acquisition.
 *
 * INVARIANT 8
 * Target count legality remains validator-owned.
 *
 * INVARIANT 9
 * Relationship legality remains validator-owned.
 *
 * INVARIANT 10
 * Range/Threat/Sensors/LOS legality remains validator-owned.
 *
 * INVARIANT 11
 * Missing required targets may prompt through injected adapter.
 *
 * INVARIANT 12
 * Prompt cancellation remains distinct from validation failure.
 *
 * INVARIANT 13
 * Direct Foundry UI/global access remains outside this file.
 *
 * INVARIANT 14
 * actor_owned_feature_registry may supply targeting requirements but does
 * not change resolver ownership.
 *
 * INVARIANT 15
 * system_bridge may supplement targeting metadata but does not perform
 * target acquisition.
 */