/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_execution_context/execution-context-contract.js
 */

/**
 * @file
 * @path main/semantic_execution_context/execution-context-contract.js
 * @module execution-context-contract
 * @layer semantic-execution-context-contract
 * @responsibility define-stable-frame-conn-semantic-execution-context-shapes
 * @public-boundary true
 * @side-effects none
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes semantic identity from feature-contract.js
 * - consumes registered feature/action identity from
 *   feature-registry.js / feature-registry-core.js
 * - consumes normalized native references from native_adapter/
 * - consumed by execution-context-builder.js
 * - consumed by execution-context.js
 * - consumed by execution_transaction/*
 * - consumed by resource_service/*
 * - consumed by action_economy/*
 * - consumed by targeting_spatial_service/*
 * - consumed by semantic_event_bus/*
 * - consumed by execution-strategy runtimes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature-contract.js remains semantic feature-definition authority
 * - feature-registry remains registration/discovery authority
 * - native_adapter remains native Lancer integration authority
 * - runtime-orchestrator.js remains high-level runtime coordinator
 * - feature_turn/ remains turn-feature composition
 * - feature_movement/ remains movement-feature composition/tracking
 *
 * THIS FILE OWNS:
 * - semantic execution context enums
 * - semantic execution context normalized shapes
 * - execution source identity
 * - execution lineage
 * - controller identity
 * - target references
 * - weapon/mount context shape
 * - movement context shape
 * - template context shape
 * - execution flags
 * - immutable context construction helpers
 *
 * THIS FILE DOES NOT OWN:
 * - native Actor/Item resolution
 * - target legality
 * - action economy
 * - resource validation/consumption
 * - lifecycle
 * - event dispatch
 * - native Flow execution
 * - feature-specific semantics
 * - Foundry document mutation
 *
 * EDIT CONTRACT:
 * - contain no Foundry/Lancer imports
 * - contain no runtime document resolution
 * - keep shapes stable and implementation-agnostic
 * - preserve exact native UUID/path references when supplied
 */

/* ============================================================
   EXECUTION PHASE
   ============================================================ */

/**
 * @section execution-phase
 *
 * These phases describe semantic Frame Conn execution.
 *
 * execution_transaction/ will own phase transitions.
 */

export const EXECUTION_PHASE = Object.freeze({
  CREATED:
    "created",

  VALIDATING:
    "validating",

  TARGETING:
    "targeting",

  READY:
    "ready",

  EXECUTING:
    "executing",

  RESOLVING:
    "resolving",

  COMMITTING:
    "committing",

  SUCCEEDED:
    "succeeded",

  FAILED:
    "failed",

  CANCELLED:
    "cancelled",

  BLOCKED:
    "blocked",

  PARTIAL:
    "partial"
});

/* ============================================================
   EXECUTION SOURCE KIND
   ============================================================ */

/**
 * @section execution-source-kind
 *
 * Identifies the semantic owner of the mechanic.
 *
 * This is separate from native Item type.
 */

export const EXECUTION_SOURCE_KIND = Object.freeze({
  UNIVERSAL_ACTION:
    "universal-action",

  FRAME_TRAIT:
    "frame-trait",

  FRAME_CORE_SYSTEM:
    "frame-core-system",

  TALENT:
    "talent",

  CORE_BONUS:
    "core-bonus",

  MECH_SYSTEM:
    "mech-system",

  MECH_WEAPON:
    "mech-weapon",

  PILOT_WEAPON:
    "pilot-weapon",

  WEAPON_MOD:
    "weapon-mod",

  PILOT_ACTION:
    "pilot-action",

  PILOT_GEAR:
    "pilot-gear",

  NHP:
    "nhp",

  STATUS:
    "status",

  MOVEMENT:
    "movement",

  REACTION:
    "reaction",

  PREPARED_ACTION:
    "prepared-action",

  GRANTED_ACTION:
    "granted-action",

  SUPPLEMENTAL:
    "supplemental",

  UNKNOWN:
    "unknown"
});

/* ============================================================
   CONTROLLER MODE
   ============================================================ */

/**
 * @section controller-mode
 *
 * Current controller is semantic Frame Conn runtime state.
 *
 * Native Actor ownership is not equivalent to controller mode.
 */

export const EXECUTION_CONTROLLER_MODE = Object.freeze({
  PILOT:
    "pilot",

  AI:
    "ai",

  CASCADE:
    "cascade",

  NPC:
    "npc",

  GM:
    "gm",

  NONE:
    "none"
});

/* ============================================================
   ACTIVATION TYPE
   ============================================================ */

/**
 * @section activation-type
 *
 * Normalized semantic action category.
 *
 * Native ActionData activation values are translated into these by the
 * builder/registry layer.
 */

export const EXECUTION_ACTIVATION_TYPE = Object.freeze({
  MOVEMENT:
    "movement",

  QUICK:
    "quick",

  FULL:
    "full",

  FREE:
    "free",

  REACTION:
    "reaction",

  PROTOCOL:
    "protocol",

  TECH:
    "tech",

  INVADE:
    "invade",

  SPECIAL:
    "special",

  NONE:
    "none"
});

/* ============================================================
   TARGET KIND
   ============================================================ */

export const EXECUTION_TARGET_KIND = Object.freeze({
  CHARACTER:
    "character",

  TOKEN:
    "token",

  ACTOR:
    "actor",

  SPACE:
    "space",

  POINT:
    "point",

  TEMPLATE:
    "template",

  DEPLOYABLE:
    "deployable",

  OBJECT:
    "object",

  SELF:
    "self",

  NONE:
    "none"
});

/* ============================================================
   TEMPLATE KIND
   ============================================================ */

export const EXECUTION_TEMPLATE_KIND = Object.freeze({
  LINE:
    "line",

  CONE:
    "cone",

  BLAST:
    "blast",

  BURST:
    "burst",

  OTHER:
    "other"
});

/* ============================================================
   MOVEMENT MODE
   ============================================================ */

/**
 * @section movement-mode
 *
 * Shared with future movement/pathfinding layers.
 *
 * Feature-specific movement capabilities may extend semantic metadata,
 * but should normalize to one of these base modes where possible.
 */

export const EXECUTION_MOVEMENT_MODE = Object.freeze({
  STANDARD:
    "standard",

  CLIMB:
    "climb",

  JUMP:
    "jump",

  DROP:
    "drop",

  FLY:
    "fly",

  HOVER:
    "hover",

  TELEPORT:
    "teleport",

  FORCED:
    "forced",

  SPECIAL:
    "special",

  NONE:
    "none"
});

/* ============================================================
   EXECUTION FLAG KEYS
   ============================================================ */

/**
 * @section execution-flag-keys
 *
 * Cross-cutting execution modifiers.
 *
 * These are descriptive state, not permission by themselves.
 */

export const EXECUTION_FLAG = Object.freeze({
  SECONDARY_ATTACK:
    "secondaryAttack",

  SUPPRESS_BONUS_DAMAGE:
    "suppressBonusDamage",

  SUPPRESS_SELF_HEAT:
    "suppressSelfHeat",

  SUPPRESS_SPECIAL_RECURSION:
    "suppressSpecialRecursion",

  SUPPRESS_PILOT_FEATURES:
    "suppressPilotFeatures",

  GRANTED_ACTION:
    "grantedAction",

  PREPARED_ACTION:
    "preparedAction",

  AI_CONTROLLED:
    "aiControlled",

  CASCADE_CONTROLLED:
    "cascadeControlled",

  REACTION_EXECUTION:
    "reactionExecution",

  FREE_ACTION_OVERRIDE:
    "freeActionOverride",

  IGNORE_ACTION_COST:
    "ignoreActionCost",

  IGNORE_MOVEMENT_COST:
    "ignoreMovementCost",

  CHILD_EXECUTION:
    "childExecution",

  RESOURCE_SUPPRESSION:
    "resourceSuppression",

  TARGETING_COMPLETE:
    "targetingComplete"
});

/* ============================================================
   PRIVATE VALIDATION HELPERS
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

function optionalString(value) {
  return (
    value == null ||
    typeof value === "string"
  );
}

function optionalNumber(value) {
  return (
    value == null ||
    Number.isFinite(value)
  );
}

function isEnumValue(
  enumObject,
  value
) {
  return Object.values(
    enumObject
  ).includes(value);
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

function generateExecutionId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID ===
    "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return (
    `fc-execution-${Date.now()}-` +
    Math.random()
      .toString(36)
      .slice(2)
  );
}

/* ============================================================
   EXECUTION IDENTITY
   ============================================================ */

/**
 * @section execution-identity
 */

export function createExecutionIdentity({
  executionId =
    generateExecutionId(),

  parentExecutionId = null,

  rootExecutionId = null
} = {}) {
  if (!requiredString(executionId)) {
    throw new TypeError(
      "Execution identity requires executionId."
    );
  }

  if (!optionalString(parentExecutionId)) {
    throw new TypeError(
      "parentExecutionId must be string or null."
    );
  }

  if (!optionalString(rootExecutionId)) {
    throw new TypeError(
      "rootExecutionId must be string or null."
    );
  }

  return Object.freeze({
    executionId,

    parentExecutionId,

    rootExecutionId:
      rootExecutionId ??
      parentExecutionId ??
      executionId
  });
}

/* ============================================================
   EXECUTION ACTOR CONTEXT
   ============================================================ */

/**
 * @section execution-actor-context
 *
 * These are normalized references, not authoritative documents.
 *
 * native_adapter/ resolves them before native execution.
 */

export function createExecutionActorContext({
  actor,
  pilot = null,
  mech = null,
  controllerMode =
    EXECUTION_CONTROLLER_MODE.NONE,

  controllerSourceItemUuid = null
} = {}) {
  if (!actor) {
    throw new TypeError(
      "Execution actor context requires actor."
    );
  }

  if (
    !isEnumValue(
      EXECUTION_CONTROLLER_MODE,
      controllerMode
    )
  ) {
    throw new TypeError(
      `Invalid controller mode: ${String(controllerMode)}`
    );
  }

  return Object.freeze({
    actor,
    pilot,
    mech,

    controllerMode,

    controllerSourceItemUuid
  });
}

/* ============================================================
   SEMANTIC ACTION REFERENCE
   ============================================================ */

/**
 * @section semantic-action-reference
 *
 * Bridges existing Frame Conn feature-contract / registry identity into
 * runtime execution.
 *
 * This contract does not define the feature itself.
 */

export function createSemanticActionReference({
  id,
  registryId = null,
  categoryId = null,
  label = null,
  activationType =
    EXECUTION_ACTIVATION_TYPE.NONE,

  nativeActionPath = null,
  nativeActionReference = null,
  definition = null
} = {}) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Semantic action reference requires id."
    );
  }

  if (
    !isEnumValue(
      EXECUTION_ACTIVATION_TYPE,
      activationType
    )
  ) {
    throw new TypeError(
      `Invalid execution activation type: ${String(activationType)}`
    );
  }

  return Object.freeze({
    id,
    registryId,
    categoryId,
    label,
    activationType,
    nativeActionPath,
    nativeActionReference,

    /*
     * Existing feature-contract / registry definition.
     *
     * Kept as an optional escape hatch during migration.
     */
    definition
  });
}

/* ============================================================
   EXECUTION SOURCE
   ============================================================ */

/**
 * @section execution-source
 *
 * Preserves semantic and native source identity separately.
 */

export function createExecutionSource({
  kind =
    EXECUTION_SOURCE_KIND.UNKNOWN,

  semanticId = null,

  nativeActorUuid = null,
  nativeItemUuid = null,
  nativeItemLid = null,
  nativeActionPath = null,

  nativeProfileIndex = null,
  nativeProfileName = null,

  sourceFeatureId = null,
  sourceRank = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_SOURCE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid execution source kind: ${String(kind)}`
    );
  }

  if (!optionalNumber(nativeProfileIndex)) {
    throw new TypeError(
      "nativeProfileIndex must be number or null."
    );
  }

  if (!optionalNumber(sourceRank)) {
    throw new TypeError(
      "sourceRank must be number or null."
    );
  }

  return Object.freeze({
    kind,
    semanticId,

    nativeActorUuid,
    nativeItemUuid,
    nativeItemLid,
    nativeActionPath,

    nativeProfileIndex,
    nativeProfileName,

    sourceFeatureId,
    sourceRank,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   TARGET REFERENCE
   ============================================================ */

/**
 * @section target-reference
 */

export function createExecutionTarget({
  kind =
    EXECUTION_TARGET_KIND.CHARACTER,

  actorUuid = null,
  tokenUuid = null,
  sceneId = null,

  x = null,
  y = null,
  elevation = null,

  name = null,

  nativeTargetReference = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_TARGET_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid execution target kind: ${String(kind)}`
    );
  }

  if (!optionalNumber(x)) {
    throw new TypeError(
      "Target x must be numeric or null."
    );
  }

  if (!optionalNumber(y)) {
    throw new TypeError(
      "Target y must be numeric or null."
    );
  }

  if (!optionalNumber(elevation)) {
    throw new TypeError(
      "Target elevation must be numeric or null."
    );
  }

  return Object.freeze({
    kind,

    actorUuid,
    tokenUuid,
    sceneId,

    x,
    y,
    elevation,

    name,

    nativeTargetReference,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   TEMPLATE CONTEXT
   ============================================================ */

/**
 * @section template-context
 */

export function createExecutionTemplateContext({
  kind,
  templateUuid = null,

  origin = null,
  anchor = null,

  size = null,
  direction = null,

  targetUuids = [],

  native = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_TEMPLATE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid execution template kind: ${String(kind)}`
    );
  }

  if (!optionalNumber(size)) {
    throw new TypeError(
      "Template size must be numeric or null."
    );
  }

  if (!optionalNumber(direction)) {
    throw new TypeError(
      "Template direction must be numeric or null."
    );
  }

  return Object.freeze({
    kind,
    templateUuid,

    origin,
    anchor,

    size,
    direction,

    targetUuids:
      freezeArray(
        targetUuids
      ),

    native,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   WEAPON CONTEXT
   ============================================================ */

/**
 * @section weapon-context
 *
 * Preserves installation identity required by:
 *
 * - Skirmish
 * - Barrage
 * - weapon special effects
 * - persistent mount configuration
 */

export function createExecutionWeaponContext({
  weapon = null,
  profileIndex = null,
  profileName = null,

  mount = null,
  slot = null,
  mod = null,

  parentMountActionId = null,

  metadata = {}
} = {}) {
  if (!optionalNumber(profileIndex)) {
    throw new TypeError(
      "Weapon profileIndex must be numeric or null."
    );
  }

  return Object.freeze({
    weapon,
    profileIndex,
    profileName,

    mount,
    slot,
    mod,

    parentMountActionId,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   MOVEMENT CONTEXT
   ============================================================ */

/**
 * @section movement-context
 *
 * Existing feature_movement/ remains authoritative for actual spent
 * movement.
 *
 * This context only carries execution-specific movement information.
 */

export function createExecutionMovementContext({
  mode =
    EXECUTION_MOVEMENT_MODE.NONE,

  sourceCapabilityId = null,
  sourceItemUuid = null,
  sourceActionPath = null,

  from = null,
  to = null,

  elevationBefore = null,
  elevationAfter = null,

  plannedCost = null,
  actualCost = null,

  route = null,

  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      EXECUTION_MOVEMENT_MODE,
      mode
    )
  ) {
    throw new TypeError(
      `Invalid movement mode: ${String(mode)}`
    );
  }

  if (!optionalNumber(elevationBefore)) {
    throw new TypeError(
      "elevationBefore must be numeric or null."
    );
  }

  if (!optionalNumber(elevationAfter)) {
    throw new TypeError(
      "elevationAfter must be numeric or null."
    );
  }

  if (!optionalNumber(plannedCost)) {
    throw new TypeError(
      "plannedCost must be numeric or null."
    );
  }

  if (!optionalNumber(actualCost)) {
    throw new TypeError(
      "actualCost must be numeric or null."
    );
  }

  return Object.freeze({
    mode,

    sourceCapabilityId,
    sourceItemUuid,
    sourceActionPath,

    from,
    to,

    elevationBefore,
    elevationAfter,

    plannedCost,
    actualCost,

    route,

    metadata:
      freezeObject(metadata)
  });
}

/* ============================================================
   EXECUTION FLAGS
   ============================================================ */

/**
 * @section execution-flags
 */

export function createExecutionFlags({
  secondaryAttack = false,
  suppressBonusDamage = false,
  suppressSelfHeat = false,
  suppressSpecialRecursion = false,
  suppressPilotFeatures = false,

  grantedAction = false,
  preparedAction = false,

  aiControlled = false,
  cascadeControlled = false,

  reactionExecution = false,

  freeActionOverride = false,
  ignoreActionCost = false,
  ignoreMovementCost = false,

  childExecution = false,

  resourceSuppression = false,

  targetingComplete = false,

  extensions = {}
} = {}) {
  return Object.freeze({
    secondaryAttack:
      Boolean(
        secondaryAttack
      ),

    suppressBonusDamage:
      Boolean(
        suppressBonusDamage
      ),

    suppressSelfHeat:
      Boolean(
        suppressSelfHeat
      ),

    suppressSpecialRecursion:
      Boolean(
        suppressSpecialRecursion
      ),

    suppressPilotFeatures:
      Boolean(
        suppressPilotFeatures
      ),

    grantedAction:
      Boolean(
        grantedAction
      ),

    preparedAction:
      Boolean(
        preparedAction
      ),

    aiControlled:
      Boolean(
        aiControlled
      ),

    cascadeControlled:
      Boolean(
        cascadeControlled
      ),

    reactionExecution:
      Boolean(
        reactionExecution
      ),

    freeActionOverride:
      Boolean(
        freeActionOverride
      ),

    ignoreActionCost:
      Boolean(
        ignoreActionCost
      ),

    ignoreMovementCost:
      Boolean(
        ignoreMovementCost
      ),

    childExecution:
      Boolean(
        childExecution
      ),

    resourceSuppression:
      Boolean(
        resourceSuppression
      ),

    targetingComplete:
      Boolean(
        targetingComplete
      ),

    extensions:
      freezeObject(
        extensions
      )
  });
}

/* ============================================================
   EXECUTION LINEAGE
   ============================================================ */

/**
 * @section execution-lineage
 *
 * Used for:
 *
 * parent/child actions
 * granted actions
 * secondary attacks
 * recursion suppression
 * Prepare
 * reaction chains
 */

export function createExecutionLineage({
  parentExecutionId = null,
  rootExecutionId = null,

  depth = 0,

  parentActionId = null,

  originatingFeatureId = null,

  chain = []
} = {}) {
  if (
    !Number.isInteger(depth) ||
    depth < 0
  ) {
    throw new TypeError(
      "Execution lineage depth must be a non-negative integer."
    );
  }

  return Object.freeze({
    parentExecutionId,
    rootExecutionId,

    depth,

    parentActionId,

    originatingFeatureId,

    chain:
      freezeArray(
        chain
      )
  });
}

/* ============================================================
   EXECUTION RESOURCE CONTEXT
   ============================================================ */

/**
 * @section execution-resource-context
 *
 * Resource descriptors themselves are owned by resource_service/.
 *
 * Context only carries the set attached to this execution.
 */

export function createExecutionResourceContext({
  required = [],
  deferred = [],
  nativeConsumed = [],
  supplemental = []
} = {}) {
  return Object.freeze({
    required:
      freezeArray(
        required
      ),

    deferred:
      freezeArray(
        deferred
      ),

    nativeConsumed:
      freezeArray(
        nativeConsumed
      ),

    supplemental:
      freezeArray(
        supplemental
      )
  });
}

/* ============================================================
   EXECUTION ECONOMY CONTEXT
   ============================================================ */

/**
 * @section execution-economy-context
 *
 * action_economy/ remains authoritative.
 */

export function createExecutionEconomyContext({
  activationType =
    EXECUTION_ACTIVATION_TYPE.NONE,

  requestedCost = null,

  costOverride = null,

  grantedByExecutionId = null,

  reactionTrigger = null,

  metadata = {}
} = {}) {
  return Object.freeze({
    activationType,
    requestedCost,
    costOverride,
    grantedByExecutionId,
    reactionTrigger,

    metadata:
      freezeObject(
        metadata
      )
  });
}

/* ============================================================
   EXECUTION CONTEXT
   ============================================================ */

/**
 * @section execution-context
 *
 * Canonical semantic context consumed by execution_transaction/.
 */

export function createExecutionContext({
  identity,

  phase =
    EXECUTION_PHASE.CREATED,

  actors,

  semanticAction = null,

  source,

  targets = [],

  template = null,

  weapon = null,

  movement = null,

  economy = null,

  resources = null,

  lineage = null,

  flags = null,

  metadata = {}
} = {}) {
  if (!identity) {
    throw new TypeError(
      "ExecutionContext requires identity."
    );
  }

  if (!actors) {
    throw new TypeError(
      "ExecutionContext requires actors."
    );
  }

  if (!source) {
    throw new TypeError(
      "ExecutionContext requires source."
    );
  }

  if (
    !isEnumValue(
      EXECUTION_PHASE,
      phase
    )
  ) {
    throw new TypeError(
      `Invalid execution phase: ${String(phase)}`
    );
  }

  if (!Array.isArray(targets)) {
    throw new TypeError(
      "ExecutionContext targets must be an array."
    );
  }

  return Object.freeze({
    identity,

    phase,

    actors,

    semanticAction,

    source,

    targets:
      Object.freeze(
        [...targets]
      ),

    template,

    weapon,

    movement,

    economy,

    resources,

    lineage,

    flags:
      flags ??
      createExecutionFlags(),

    metadata:
      freezeObject(
        metadata
      )
  });
}

/* ============================================================
   EXECUTION CONTEXT CLONE / PATCH
   ============================================================ */

/**
 * @section execution-context-patch
 *
 * Context objects are immutable snapshots.
 *
 * Runtime phase/state changes create a new context.
 */

export function patchExecutionContext(
  context,
  patch = {}
) {
  if (!context) {
    throw new TypeError(
      "patchExecutionContext requires context."
    );
  }

  if (!isObject(patch)) {
    throw new TypeError(
      "Execution context patch must be an object."
    );
  }

  return createExecutionContext({
    ...context,
    ...patch,

    metadata:
      patch.metadata
        ? {
            ...context.metadata,
            ...patch.metadata
          }
        : context.metadata
  });
}

export function setExecutionContextPhase(
  context,
  phase
) {
  return patchExecutionContext(
    context,
    {
      phase
    }
  );
}

/* ============================================================
   TARGET PATCH HELPERS
   ============================================================ */

/**
 * @section target-patch-helpers
 */

export function setExecutionTargets(
  context,
  targets
) {
  if (!Array.isArray(targets)) {
    throw new TypeError(
      "setExecutionTargets requires an array."
    );
  }

  return patchExecutionContext(
    context,
    {
      targets:
        Object.freeze(
          [...targets]
        )
    }
  );
}

export function addExecutionTarget(
  context,
  target
) {
  if (!target) {
    throw new TypeError(
      "addExecutionTarget requires target."
    );
  }

  return setExecutionTargets(
    context,
    [
      ...context.targets,
      target
    ]
  );
}

/* ============================================================
   FLAG PATCH HELPERS
   ============================================================ */

/**
 * @section flag-patch-helpers
 */

export function patchExecutionFlags(
  context,
  flagPatch
) {
  if (!isObject(flagPatch)) {
    throw new TypeError(
      "patchExecutionFlags requires object."
    );
  }

  const existing =
    context.flags ??
    createExecutionFlags();

  return patchExecutionContext(
    context,
    {
      flags:
        createExecutionFlags({
          ...existing,
          ...flagPatch,

          extensions: {
            ...(
              existing.extensions ??
              {}
            ),

            ...(
              flagPatch.extensions ??
              {}
            )
          }
        })
    }
  );
}

/* ============================================================
   CHILD EXECUTION IDENTITY
   ============================================================ */

/**
 * @section child-execution-identity
 */

export function createChildExecutionIdentity(
  parentContext
) {
  if (!parentContext?.identity) {
    throw new TypeError(
      "createChildExecutionIdentity requires parent ExecutionContext."
    );
  }

  return createExecutionIdentity({
    parentExecutionId:
      parentContext
        .identity
        .executionId,

    rootExecutionId:
      parentContext
        .identity
        .rootExecutionId
  });
}

/* ============================================================
   CHILD EXECUTION LINEAGE
   ============================================================ */

export function createChildExecutionLineage(
  parentContext,
  {
    parentActionId =
      parentContext
        ?.semanticAction
        ?.id ??
      null,

    originatingFeatureId =
      parentContext
        ?.source
        ?.sourceFeatureId ??
      null
  } = {}
) {
  if (!parentContext) {
    throw new TypeError(
      "createChildExecutionLineage requires parent context."
    );
  }

  const parentLineage =
    parentContext.lineage;

  return createExecutionLineage({
    parentExecutionId:
      parentContext
        .identity
        .executionId,

    rootExecutionId:
      parentContext
        .identity
        .rootExecutionId,

    depth:
      (
        parentLineage?.depth ??
        0
      ) + 1,

    parentActionId,

    originatingFeatureId,

    chain: [
      ...(
        parentLineage?.chain ??
        []
      ),

      parentContext
        .identity
        .executionId
    ]
  });
}

/* ============================================================
   CONTEXT PREDICATES
   ============================================================ */

/**
 * @section context-predicates
 */

export function isChildExecution(
  context
) {
  return Boolean(
    context
      ?.identity
      ?.parentExecutionId
  );
}

export function isSecondaryAttackExecution(
  context
) {
  return Boolean(
    context
      ?.flags
      ?.secondaryAttack
  );
}

export function isGrantedActionExecution(
  context
) {
  return Boolean(
    context
      ?.flags
      ?.grantedAction
  );
}

export function isPreparedActionExecution(
  context
) {
  return Boolean(
    context
      ?.flags
      ?.preparedAction
  );
}

export function isAiControlledExecution(
  context
) {
  return Boolean(
    context
      ?.actors
      ?.controllerMode ===
        EXECUTION_CONTROLLER_MODE.AI ||
    context
      ?.flags
      ?.aiControlled
  );
}

export function isCascadeControlledExecution(
  context
) {
  return Boolean(
    context
      ?.actors
      ?.controllerMode ===
        EXECUTION_CONTROLLER_MODE.CASCADE ||
    context
      ?.flags
      ?.cascadeControlled
  );
}

/* ============================================================
   SOURCE IDENTITY HELPERS
   ============================================================ */

/**
 * @section source-identity-helpers
 *
 * Intended for execution-strategy registry keys.
 */

export function getExecutionSourceIdentity(
  context
) {
  const source =
    context?.source;

  if (!source) {
    return null;
  }

  return Object.freeze({
    kind:
      source.kind,

    semanticId:
      source.semanticId,

    nativeItemUuid:
      source.nativeItemUuid,

    nativeItemLid:
      source.nativeItemLid,

    nativeActionPath:
      source.nativeActionPath,

    nativeProfileIndex:
      source.nativeProfileIndex,

    nativeProfileName:
      source.nativeProfileName
  });
}

/* ============================================================
   EXECUTION CONTEXT ASSERTION
   ============================================================ */

/**
 * @section execution-context-assertion
 */

export function assertExecutionContext(
  context
) {
  if (!isObject(context)) {
    throw new TypeError(
      "Expected ExecutionContext."
    );
  }

  if (
    !requiredString(
      context
        ?.identity
        ?.executionId
    )
  ) {
    throw new TypeError(
      "ExecutionContext requires identity.executionId."
    );
  }

  if (!context.actors) {
    throw new TypeError(
      "ExecutionContext requires actors."
    );
  }

  if (!context.source) {
    throw new TypeError(
      "ExecutionContext requires source."
    );
  }

  if (
    !isEnumValue(
      EXECUTION_PHASE,
      context.phase
    )
  ) {
    throw new TypeError(
      "ExecutionContext has invalid phase."
    );
  }

  return context;
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature-contract.js
 * -------------------
 * Remains semantic action-definition authority.
 *
 * Intended relationship:
 *
 * feature-contract definition
 * → SemanticActionReference
 * → ExecutionContext
 *
 * This file does not replace feature-contract.js.
 *
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 * Continue to register declared Frame Conn actions/features.
 *
 * Registry identity should be preserved in:
 *
 * semanticAction.registryId
 * semanticAction.id
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 * Runtime-discovered actions from:
 *
 * Traits
 * Talents
 * Core Bonuses
 * Mounted Systems
 * Weapons
 *
 * should normalize into the same SemanticActionReference shape.
 *
 *
 * native_adapter/
 * ---------------
 * Supplies:
 *
 * Actor references
 * Item references
 * NativeActionReference
 * mount references
 * slot references
 *
 * execution-context-builder.js resolves these and places them here.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 * Intended:
 *
 * runtime-orchestrator
 * → execution-context-builder
 * → ExecutionContext
 * → execution_transaction
 *
 * Runtime orchestrator should not manually assemble native Actor/Item
 * argument bags after migration.
 *
 *
 * feature_turn/
 * -------------
 * Contributes current:
 *
 * controller mode
 * turn identity
 * reaction context
 * action-economy state
 *
 * Those values are represented here but remain authoritative in their
 * owning service.
 *
 *
 * feature_movement/
 * -----------------
 * Existing movement tracker remains authoritative for actual spent
 * movement.
 *
 * Movement context here preserves:
 *
 * mode
 * source capability
 * route
 * planned/actual cost
 *
 * for one semantic execution only.
 *
 *
 * resource_service/
 * -----------------
 * Owns ResourceDescriptor semantics.
 *
 * ExecutionContext only carries resource requirements attached to the
 * current execution transaction.
 *
 *
 * action_economy/
 * ---------------
 * Owns Quick/Full/Reaction/Protocol/etc. availability and mutation.
 *
 * ExecutionContext only carries requested semantic economy context.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 * Owns Range/LOS/Sensors/adjacency/template legality.
 *
 * It receives/returns ExecutionTarget and ExecutionTemplateContext data.
 *
 *
 * semantic_event_bus/
 * -------------------
 * Event payloads should include executionId/rootExecutionId and may carry
 * this context or a safe snapshot derived from it.
 *
 *
 * execution strategy registry
 * ---------------------------
 * Strategy lookup may use:
 *
 * source.kind
 * source.nativeItemLid
 * source.nativeActionPath
 * source.nativeProfileName/index
 * semanticAction.id
 *
 * Do not parse source prose live.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * ExecutionContext is the canonical cross-service semantic execution
 * carrier.
 *
 * INVARIANT 2
 * ExecutionContext is immutable snapshot state.
 *
 * INVARIANT 3
 * Actor/Item native documents are not resolved in this contract file.
 *
 * INVARIANT 4
 * Semantic feature identity and native source identity remain separate.
 *
 * INVARIANT 5
 * Every execution has stable executionId and rootExecutionId.
 *
 * INVARIANT 6
 * Parent/child execution lineage must be preserved.
 *
 * INVARIANT 7
 * Weapon execution preserves mount/slot/mod/profile context where known.
 *
 * INVARIANT 8
 * Controller mode is semantic runtime state, not Foundry ownership.
 *
 * INVARIANT 9
 * Execution flags describe modifiers; they do not independently establish
 * legality.
 *
 * INVARIANT 10
 * Action economy remains owned by action_economy/.
 *
 * INVARIANT 11
 * Resources remain owned by resource_service/.
 *
 * INVARIANT 12
 * Target legality remains owned by targeting_spatial_service/.
 *
 * INVARIANT 13
 * Movement expenditure remains owned by feature_movement/ and future
 * movement execution services.
 *
 * INVARIANT 14
 * Supplemental metadata must not become a dumping ground for fields that
 * deserve stable contract representation.
 *
 * INVARIANT 15
 * Native raw objects may be carried only through explicit native reference
 * fields supplied by native_adapter; higher layers should prefer stable
 * UUID/path identity.
 */