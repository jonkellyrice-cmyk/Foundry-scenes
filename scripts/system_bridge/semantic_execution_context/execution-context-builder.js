/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/semantic_execution_context/execution-context-builder.js
 */

/**
 * @file
 * @path main/semantic_execution_context/execution-context-builder.js
 * @module execution-context-builder
 * @layer semantic-execution-context-builder
 * @responsibility resolve-runtime-inputs-and-build-canonical-execution-context
 * @public-boundary false
 * @side-effects native-document-resolution-only
 *
 * @depends-on
 * - execution-context-contract
 * - native-adapter
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes semantic action definitions from feature-contract.js
 * - consumes registered action identity from
 *   feature-registry.js / feature-registry-core.js
 * - consumes runtime-discovered actor-owned actions
 * - consumes native references from native_adapter/
 * - called by runtime-orchestrator.js before execution_transaction/*
 * - consumed by granted-action / reaction / prepared-action runtimes
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - feature-contract.js remains semantic definition authority
 * - feature-registry remains feature-registration authority
 * - native_adapter remains native Lancer authority
 * - runtime-orchestrator.js remains high-level coordinator
 * - feature_turn/ remains turn/controller-state authority
 * - feature_movement/ remains actual movement-tracking authority
 *
 * THIS FILE OWNS:
 * - canonical ExecutionContext assembly
 * - actor/pilot/mech native-context resolution
 * - semantic/native source normalization
 * - native ActionData resolution
 * - weapon mount/slot/mod context resolution
 * - target normalization
 * - parent/child execution lineage
 * - execution flag derivation from caller-provided runtime context
 *
 * THIS FILE DOES NOT OWN:
 * - action legality
 * - action economy availability/spending
 * - resource availability/spending
 * - Range/LOS validation
 * - target acquisition UI
 * - lifecycle expiration
 * - native Flow execution
 * - semantic event dispatch
 * - feature-specific rule interpretation
 *
 * EDIT CONTRACT:
 * - build immutable ExecutionContext snapshots
 * - re-use native_adapter resolution
 * - do not read native Lancer document paths directly when adapter exists
 * - preserve exact source UUID/LID/action-path/profile/mount identity
 * - do not invent missing semantic/native identity
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  EXECUTION_ACTIVATION_TYPE,
  EXECUTION_CONTROLLER_MODE,
  EXECUTION_MOVEMENT_MODE,
  EXECUTION_SOURCE_KIND,
  EXECUTION_TARGET_KIND,
  createChildExecutionIdentity,
  createChildExecutionLineage,
  createExecutionActorContext,
  createExecutionContext,
  createExecutionEconomyContext,
  createExecutionFlags,
  createExecutionIdentity,
  createExecutionLineage,
  createExecutionMovementContext,
  createExecutionResourceContext,
  createExecutionSource,
  createExecutionTarget,
  createExecutionTemplateContext,
  createExecutionWeaponContext,
  createSemanticActionReference
} from "./execution-context-contract.js";

import {
  nativeAdapter
} from "../native_adapter/native-adapter.js";

/* ============================================================
   PRIVATE VALIDATION HELPERS
   ============================================================ */

/**
 * @section private-validation-helpers
 */

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

function optionalNumber(value) {
  return (
    value == null ||
    Number.isFinite(value)
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

/* ============================================================
   SEMANTIC ACTION NORMALIZATION
   ============================================================ */

/**
 * @section semantic-action-normalization
 *
 * Existing Frame Conn registry/feature definitions may not yet expose one
 * perfectly uniform shape.
 *
 * Normalize common existing fields here.
 *
 * Do not mutate the registry definition.
 */

function inferActivationType(
  definition
) {
  const raw =
    definition
      ?.activationType ??
    definition
      ?.activation ??
    definition
      ?.category ??
    definition
      ?.categoryId ??
    null;

  if (!raw) {
    return EXECUTION_ACTIVATION_TYPE.NONE;
  }

  const normalized =
    String(raw)
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");

  switch (normalized) {
    case "movement":
    case "move":
      return EXECUTION_ACTIVATION_TYPE.MOVEMENT;

    case "quick":
    case "quick-action":
      return EXECUTION_ACTIVATION_TYPE.QUICK;

    case "full":
    case "full-action":
      return EXECUTION_ACTIVATION_TYPE.FULL;

    case "free":
    case "free-action":
      return EXECUTION_ACTIVATION_TYPE.FREE;

    case "reaction":
      return EXECUTION_ACTIVATION_TYPE.REACTION;

    case "protocol":
      return EXECUTION_ACTIVATION_TYPE.PROTOCOL;

    case "tech":
    case "tech-action":
      return EXECUTION_ACTIVATION_TYPE.TECH;

    case "invade":
      return EXECUTION_ACTIVATION_TYPE.INVADE;

    case "special":
      return EXECUTION_ACTIVATION_TYPE.SPECIAL;

    default:
      return EXECUTION_ACTIVATION_TYPE.NONE;
  }
}

function createSemanticActionReferenceFromDefinition(
  definition,
  {
    fallbackId = null,
    nativeActionReference = null
  } = {}
) {
  if (!definition) {
    if (!fallbackId) {
      return null;
    }

    return createSemanticActionReference({
      id:
        fallbackId,

      nativeActionReference,

      nativeActionPath:
        nativeActionReference?.path ??
        null
    });
  }

  const id =
    definition.id ??
    definition.actionId ??
    definition.lid ??
    fallbackId;

  if (!requiredString(id)) {
    throw new TypeError(
      "Semantic action definition does not provide a usable id."
    );
  }

  return createSemanticActionReference({
    id,

    registryId:
      definition.registryId ??
      definition.registry_id ??
      null,

    categoryId:
      definition.categoryId ??
      definition.category ??
      null,

    label:
      definition.label ??
      definition.name ??
      id,

    activationType:
      inferActivationType(
        definition
      ),

    nativeActionPath:
      nativeActionReference?.path ??
      definition.nativeActionPath ??
      definition.actionPath ??
      null,

    nativeActionReference,

    definition
  });
}

/* ============================================================
   SOURCE KIND NORMALIZATION
   ============================================================ */

/**
 * @section source-kind-normalization
 */

function inferSourceKindFromNativeItem(
  item
) {
  if (!item) {
    return EXECUTION_SOURCE_KIND.UNKNOWN;
  }

  if (item.is_mech_weapon?.()) {
    return EXECUTION_SOURCE_KIND.MECH_WEAPON;
  }

  if (item.is_pilot_weapon?.()) {
    return EXECUTION_SOURCE_KIND.PILOT_WEAPON;
  }

  if (item.is_mech_system?.()) {
    return EXECUTION_SOURCE_KIND.MECH_SYSTEM;
  }

  if (item.is_weapon_mod?.()) {
    return EXECUTION_SOURCE_KIND.WEAPON_MOD;
  }

  if (item.is_talent?.()) {
    return EXECUTION_SOURCE_KIND.TALENT;
  }

  if (item.is_core_bonus?.()) {
    return EXECUTION_SOURCE_KIND.CORE_BONUS;
  }

  if (item.is_frame?.()) {
    return EXECUTION_SOURCE_KIND.FRAME_CORE_SYSTEM;
  }

  return EXECUTION_SOURCE_KIND.UNKNOWN;
}

function inferSourceKind({
  sourceKind = null,
  nativeItem = null,
  semanticAction = null
} = {}) {
  if (sourceKind) {
    return sourceKind;
  }

  const nativeKind =
    inferSourceKindFromNativeItem(
      nativeItem
    );

  if (
    nativeKind !==
    EXECUTION_SOURCE_KIND.UNKNOWN
  ) {
    return nativeKind;
  }

  const category =
    semanticAction
      ?.categoryId ??
    semanticAction
      ?.definition
      ?.category ??
    null;

  if (category === "movement") {
    return EXECUTION_SOURCE_KIND.MOVEMENT;
  }

  if (category === "reaction") {
    return EXECUTION_SOURCE_KIND.REACTION;
  }

  return EXECUTION_SOURCE_KIND.UNIVERSAL_ACTION;
}

/* ============================================================
   CONTROLLER NORMALIZATION
   ============================================================ */

/**
 * @section controller-normalization
 *
 * Controller state belongs to higher Frame Conn runtime.
 *
 * Builder accepts it; builder does not infer cascade/autopilot from native
 * AI presence.
 */

function normalizeControllerMode(
  mode,
  actorReference
) {
  if (mode) {
    return mode;
  }

  switch (
    actorReference?.kind
  ) {
    case "pilot":
    case "mech":
      return EXECUTION_CONTROLLER_MODE.PILOT;

    case "npc":
      return EXECUTION_CONTROLLER_MODE.NPC;

    default:
      return EXECUTION_CONTROLLER_MODE.NONE;
  }
}

/* ============================================================
   NATIVE ACTOR CONTEXT RESOLUTION
   ============================================================ */

/**
 * @section native-actor-context-resolution
 */

async function buildExecutionActorContext({
  actor,
  controllerMode = null,
  controllerSourceItemUuid = null
} = {}) {
  if (!actor) {
    throw new TypeError(
      "Execution context builder requires actor."
    );
  }

  const nativeContext =
    await nativeAdapter
      .actors
      .resolveNativeActorContext(
        actor
      );

  return createExecutionActorContext({
    actor:
      nativeContext.actor,

    pilot:
      nativeContext.pilot,

    mech:
      nativeContext.mech,

    controllerMode:
      normalizeControllerMode(
        controllerMode,
        nativeContext.actor
      ),

    controllerSourceItemUuid
  });
}

/* ============================================================
   NATIVE SOURCE RESOLUTION
   ============================================================ */

/**
 * @section native-source-resolution
 */

async function resolveBuilderNativeItem(
  itemReference
) {
  if (!itemReference) {
    return null;
  }

  return nativeAdapter
    .items
    .resolveNativeItem(
      itemReference,
      {
        required: false
      }
    );
}

async function resolveBuilderNativeAction(
  nativeItem,
  actionPath
) {
  if (
    !nativeItem ||
    !requiredString(
      actionPath
    )
  ) {
    return null;
  }

  const action =
    nativeAdapter
      .items
      .getNativeActionAtPath(
        nativeItem,
        actionPath
      );

  if (!action) {
    return null;
  }

  return nativeAdapter
    .items
    .createNativeActionReferenceFromPath(
      nativeItem,
      actionPath
    );
}

/* ============================================================
   EXECUTION SOURCE CONSTRUCTION
   ============================================================ */

/**
 * @section execution-source-construction
 */

function buildExecutionSource({
  sourceKind,
  semanticAction,
  nativeItem,
  nativeActionReference,
  sourceFeatureId = null,
  sourceRank = null,
  metadata = {}
} = {}) {
  const itemReference =
    nativeItem
      ? nativeAdapter
          .items
          .createItemReferenceFromNativeItem(
            nativeItem
          )
      : null;

  let nativeProfileIndex =
    null;

  let nativeProfileName =
    null;

  if (
    nativeItem
      ?.is_mech_weapon
      ?.()
  ) {
    nativeProfileIndex =
      nativeAdapter
        .items
        .getSelectedWeaponProfileIndex(
          nativeItem
        );

    nativeProfileName =
      nativeAdapter
        .items
        .getActiveWeaponProfile(
          nativeItem
        )
        ?.name ??
      null;
  }

  return createExecutionSource({
    kind:
      inferSourceKind({
        sourceKind,
        nativeItem,
        semanticAction
      }),

    semanticId:
      semanticAction?.id ??
      null,

    nativeActorUuid:
      nativeItem?.actor?.uuid ??
      null,

    nativeItemUuid:
      itemReference?.uuid ??
      null,

    nativeItemLid:
      itemReference?.lid ??
      null,

    nativeActionPath:
      nativeActionReference?.path ??
      semanticAction?.nativeActionPath ??
      null,

    nativeProfileIndex,
    nativeProfileName,

    sourceFeatureId,
    sourceRank,

    metadata
  });
}

/* ============================================================
   WEAPON CONTEXT RESOLUTION
   ============================================================ */

/**
 * @section weapon-context-resolution
 *
 * If a Mech Weapon is installed in the current Mech loadout, preserve its
 * mount/slot/mod context.
 *
 * Pilot Weapons intentionally have no Mech mount context.
 */

async function buildWeaponContext({
  nativeItem,
  actors,
  parentMountActionId = null
} = {}) {
  if (
    !nativeItem ||
    (
      !nativeItem.is_mech_weapon?.() &&
      !nativeItem.is_pilot_weapon?.()
    )
  ) {
    return null;
  }

  const weaponReference =
    nativeAdapter
      .items
      .createItemReferenceFromNativeItem(
        nativeItem
      );

  let profileIndex =
    null;

  let profileName =
    null;

  if (
    nativeItem.is_mech_weapon?.()
  ) {
    profileIndex =
      nativeAdapter
        .items
        .getSelectedWeaponProfileIndex(
          nativeItem
        );

    profileName =
      nativeAdapter
        .items
        .getActiveWeaponProfile(
          nativeItem
        )
        ?.name ??
      null;
  }

  let mount =
    null;

  let slot =
    null;

  let mod =
    null;

  if (
    nativeItem.is_mech_weapon?.() &&
    actors?.mech
  ) {
    const mech =
      await nativeAdapter
        .actors
        .resolveNativeActor(
          actors.mech
        );

    const installation =
      await nativeAdapter
        .loadout
        .findNativeMountContainingWeapon(
          mech,
          nativeItem
        );

    if (installation) {
      mount =
        installation
          .mountReference;

      slot =
        installation
          .slotReference;

      if (
        slot?.modUuid
      ) {
        const nativeMod =
          await nativeAdapter
            .items
            .resolveNativeItem(
              slot.modUuid,
              {
                required: false
              }
            );

        if (nativeMod) {
          mod =
            nativeAdapter
              .items
              .createItemReferenceFromNativeItem(
                nativeMod
              );
        }
      }
    }
  }

  return createExecutionWeaponContext({
    weapon:
      weaponReference,

    profileIndex,
    profileName,

    mount,
    slot,
    mod,

    parentMountActionId
  });
}

/* ============================================================
   TARGET NORMALIZATION
   ============================================================ */

/**
 * @section target-normalization
 *
 * Target legality belongs to targeting_spatial_service/.
 *
 * Builder only normalizes identity/position.
 */

async function buildTargetReference(
  target
) {
  if (!target) {
    return null;
  }

  /*
   * Already normalized ExecutionTarget.
   */
  if (
    target.kind &&
    (
      target.actorUuid ||
      target.tokenUuid ||
      target.kind ===
        EXECUTION_TARGET_KIND.SPACE ||
      target.kind ===
        EXECUTION_TARGET_KIND.POINT
    )
  ) {
    return target;
  }

  /*
   * Foundry Token / TokenDocument.
   */
  const tokenDocument =
    target.document ??
    (
      target.documentName === "Token"
        ? target
        : null
    );

  const tokenActor =
    target.actor ??
    tokenDocument?.actor ??
    null;

  if (
    tokenDocument ||
    target.actor
  ) {
    return createExecutionTarget({
      kind:
        EXECUTION_TARGET_KIND.CHARACTER,

      actorUuid:
        tokenActor?.uuid ??
        null,

      tokenUuid:
        tokenDocument?.uuid ??
        target.uuid ??
        null,

      sceneId:
        tokenDocument?.parent?.id ??
        globalThis.canvas
          ?.scene
          ?.id ??
        null,

      x:
        tokenDocument?.x ??
        target.x ??
        null,

      y:
        tokenDocument?.y ??
        target.y ??
        null,

      elevation:
        tokenDocument?.elevation ??
        target.document?.elevation ??
        null,

      name:
        tokenActor?.name ??
        target.name ??
        null,

      nativeTargetReference:
        Object.freeze({
          actorUuid:
            tokenActor?.uuid ??
            null,

          tokenUuid:
            tokenDocument?.uuid ??
            target.uuid ??
            null
        })
    });
  }

  /*
   * Actor/native actor reference.
   */
  try {
    const actor =
      await nativeAdapter
        .actors
        .resolveNativeActor(
          target,
          {
            required: false
          }
        );

    if (actor) {
      return createExecutionTarget({
        kind:
          EXECUTION_TARGET_KIND.ACTOR,

        actorUuid:
          actor.uuid,

        name:
          actor.name ??
          null,

        nativeTargetReference:
          nativeAdapter
            .actors
            .createActorReferenceFromNativeActor(
              actor
            )
      });
    }
  } catch {
    /*
     * Fall through to coordinate/object interpretation.
     */
  }

  if (
    optionalNumber(target.x) &&
    optionalNumber(target.y)
  ) {
    return createExecutionTarget({
      kind:
        target.kind ??
        EXECUTION_TARGET_KIND.POINT,

      x:
        target.x,

      y:
        target.y,

      elevation:
        target.elevation ??
        null,

      sceneId:
        target.sceneId ??
        globalThis.canvas
          ?.scene
          ?.id ??
        null,

      metadata:
        target.metadata ??
        {}
    });
  }

  throw new TypeError(
    "Unable to normalize execution target."
  );
}

async function buildTargetReferences(
  targets
) {
  const results = [];

  for (
    const target of
      normalizeArray(targets)
  ) {
    const normalized =
      await buildTargetReference(
        target
      );

    if (normalized) {
      results.push(
        normalized
      );
    }
  }

  return Object.freeze(
    results
  );
}

/* ============================================================
   TEMPLATE NORMALIZATION
   ============================================================ */

/**
 * @section template-normalization
 */

function buildTemplateContext(
  template
) {
  if (!template) {
    return null;
  }

  if (
    template.kind &&
    Object.isFrozen(template)
  ) {
    return template;
  }

  return createExecutionTemplateContext({
    kind:
      template.kind,

    templateUuid:
      template.templateUuid ??
      template.uuid ??
      template.document?.uuid ??
      null,

    origin:
      template.origin ??
      null,

    anchor:
      template.anchor ??
      null,

    size:
      template.size ??
      template.distance ??
      null,

    direction:
      template.direction ??
      null,

    targetUuids:
      template.targetUuids ??
      [],

    native:
      template.native ??
      template.document ??
      null,

    metadata:
      template.metadata ??
      {}
  });
}

/* ============================================================
   MOVEMENT CONTEXT NORMALIZATION
   ============================================================ */

/**
 * @section movement-context-normalization
 */

function buildMovementContext(
  movement
) {
  if (!movement) {
    return null;
  }

  if (
    movement.mode &&
    Object.isFrozen(movement)
  ) {
    return movement;
  }

  return createExecutionMovementContext({
    mode:
      movement.mode ??
      EXECUTION_MOVEMENT_MODE.NONE,

    sourceCapabilityId:
      movement.sourceCapabilityId ??
      null,

    sourceItemUuid:
      movement.sourceItemUuid ??
      null,

    sourceActionPath:
      movement.sourceActionPath ??
      null,

    from:
      movement.from ??
      null,

    to:
      movement.to ??
      null,

    elevationBefore:
      movement.elevationBefore ??
      null,

    elevationAfter:
      movement.elevationAfter ??
      null,

    plannedCost:
      movement.plannedCost ??
      null,

    actualCost:
      movement.actualCost ??
      null,

    route:
      movement.route ??
      null,

    metadata:
      movement.metadata ??
      {}
  });
}

/* ============================================================
   EXECUTION FLAGS NORMALIZATION
   ============================================================ */

/**
 * @section execution-flags-normalization
 */

function buildExecutionFlags(
  flags,
  controllerMode
) {
  return createExecutionFlags({
    ...(
      isObject(flags)
        ? flags
        : {}
    ),

    aiControlled:
      Boolean(
        flags?.aiControlled ||
        controllerMode ===
          EXECUTION_CONTROLLER_MODE.AI
      ),

    cascadeControlled:
      Boolean(
        flags?.cascadeControlled ||
        controllerMode ===
          EXECUTION_CONTROLLER_MODE.CASCADE
      ),

    suppressPilotFeatures:
      Boolean(
        flags?.suppressPilotFeatures ||
        controllerMode ===
          EXECUTION_CONTROLLER_MODE.AI ||
        controllerMode ===
          EXECUTION_CONTROLLER_MODE.CASCADE
      )
  });
}

/* ============================================================
   ROOT EXECUTION CONTEXT BUILDER
   ============================================================ */

/**
 * @section root-execution-context-builder
 *
 * Primary context-construction API.
 *
 * Input may originate from:
 *
 * - declared universal Frame Conn action
 * - actor-owned native ActionData
 * - weapon execution
 * - system execution
 * - feature strategy
 * - movement execution
 */

export async function buildExecutionContext({
  actor,

  semanticActionDefinition = null,
  semanticActionId = null,

  sourceKind = null,
  sourceFeatureId = null,
  sourceRank = null,

  nativeItem = null,
  nativeItemUuid = null,
  nativeActionPath = null,

  targets = [],
  template = null,
  movement = null,

  controllerMode = null,
  controllerSourceItemUuid = null,

  activationType = null,

  parentMountActionId = null,

  requestedActionCost = null,
  actionCostOverride = null,
  reactionTrigger = null,

  resources = null,

  flags = null,

  metadata = {}
} = {}) {
  if (!actor) {
    throw new TypeError(
      "buildExecutionContext requires actor."
    );
  }

  const actors =
    await buildExecutionActorContext({
      actor,
      controllerMode,
      controllerSourceItemUuid
    });

  const resolvedNativeItem =
    await resolveBuilderNativeItem(
      nativeItem ??
      nativeItemUuid
    );

  const nativeActionReference =
    await resolveBuilderNativeAction(
      resolvedNativeItem,
      nativeActionPath
    );

  const semanticAction =
    createSemanticActionReferenceFromDefinition(
      semanticActionDefinition,
      {
        fallbackId:
          semanticActionId ??
          nativeActionReference?.name ??
          nativeActionReference?.path ??
          "execution",

        nativeActionReference
      }
    );

  const resolvedActivationType =
    activationType ??
    semanticAction
      ?.activationType ??
    EXECUTION_ACTIVATION_TYPE.NONE;

  const source =
    buildExecutionSource({
      sourceKind,

      semanticAction,

      nativeItem:
        resolvedNativeItem,

      nativeActionReference,

      sourceFeatureId,
      sourceRank,

      metadata:
        metadata.source ??
        {}
    });

  const normalizedTargets =
    await buildTargetReferences(
      targets
    );

  const weapon =
    await buildWeaponContext({
      nativeItem:
        resolvedNativeItem,

      actors,

      parentMountActionId
    });

  const identity =
    createExecutionIdentity();

  const lineage =
    createExecutionLineage({
      rootExecutionId:
        identity.rootExecutionId,

      depth:
        0,

      parentActionId:
        null,

      originatingFeatureId:
        sourceFeatureId
    });

  const economy =
    createExecutionEconomyContext({
      activationType:
        resolvedActivationType,

      requestedCost:
        requestedActionCost,

      costOverride:
        actionCostOverride,

      reactionTrigger,

      metadata:
        metadata.economy ??
        {}
    });

  const resourceContext =
    resources
      ? createExecutionResourceContext(
          resources
        )
      : createExecutionResourceContext();

  const normalizedFlags =
    buildExecutionFlags(
      flags,
      actors.controllerMode
    );

  return createExecutionContext({
    identity,

    actors,

    semanticAction,

    source,

    targets:
      normalizedTargets,

    template:
      buildTemplateContext(
        template
      ),

    weapon,

    movement:
      buildMovementContext(
        movement
      ),

    economy,

    resources:
      resourceContext,

    lineage,

    flags:
      normalizedFlags,

    metadata
  });
}

/* ============================================================
   CHILD EXECUTION CONTEXT BUILDER
   ============================================================ */

/**
 * @section child-execution-context-builder
 *
 * Used for:
 *
 * - Skirmish/Barrage child attacks
 * - secondary attacks
 * - granted actions
 * - prepared actions
 * - feature-generated reactions
 *
 * Parent context remains immutable.
 */

export async function buildChildExecutionContext(
  parentContext,
  {
    actor = null,

    semanticActionDefinition = null,
    semanticActionId = null,

    sourceKind = null,
    sourceFeatureId = null,
    sourceRank = null,

    nativeItem = null,
    nativeItemUuid = null,
    nativeActionPath = null,

    targets = null,
    template = null,
    movement = null,

    activationType = null,

    parentMountActionId = null,

    requestedActionCost = null,
    actionCostOverride = null,
    reactionTrigger = null,

    resources = null,

    flags = null,

    metadata = {}
  } = {}
) {
  if (!parentContext) {
    throw new TypeError(
      "buildChildExecutionContext requires parent context."
    );
  }

  const effectiveActor =
    actor ??
    parentContext
      .actors
      .actor;

  const actors =
    actor
      ? await buildExecutionActorContext({
          actor:
            effectiveActor,

          controllerMode:
            parentContext
              .actors
              .controllerMode,

          controllerSourceItemUuid:
            parentContext
              .actors
              .controllerSourceItemUuid
        })
      : parentContext.actors;

  const resolvedNativeItem =
    await resolveBuilderNativeItem(
      nativeItem ??
      nativeItemUuid
    );

  const nativeActionReference =
    await resolveBuilderNativeAction(
      resolvedNativeItem,
      nativeActionPath
    );

  const semanticAction =
    createSemanticActionReferenceFromDefinition(
      semanticActionDefinition,
      {
        fallbackId:
          semanticActionId ??
          nativeActionReference?.name ??
          nativeActionReference?.path ??
          parentContext
            .semanticAction
            ?.id ??
          "child-execution",

        nativeActionReference
      }
    );

  const source =
    buildExecutionSource({
      sourceKind,

      semanticAction,

      nativeItem:
        resolvedNativeItem,

      nativeActionReference,

      sourceFeatureId:
        sourceFeatureId ??
        parentContext
          .source
          ?.sourceFeatureId ??
        null,

      sourceRank,

      metadata:
        metadata.source ??
        {}
    });

  const identity =
    createChildExecutionIdentity(
      parentContext
    );

  const lineage =
    createChildExecutionLineage(
      parentContext,
      {
        parentActionId:
          parentContext
            .semanticAction
            ?.id ??
          null,

        originatingFeatureId:
          sourceFeatureId ??
          parentContext
            .source
            ?.sourceFeatureId ??
          null
      }
    );

  const resolvedActivationType =
    activationType ??
    semanticAction
      ?.activationType ??
    EXECUTION_ACTIVATION_TYPE.NONE;

  const weapon =
    await buildWeaponContext({
      nativeItem:
        resolvedNativeItem,

      actors,

      parentMountActionId:
        parentMountActionId ??
        parentContext
          .weapon
          ?.parentMountActionId ??
        null
    });

  const childFlags =
    buildExecutionFlags(
      {
        ...(
          parentContext.flags ??
          {}
        ),

        childExecution:
          true,

        ...(
          flags ??
          {}
        ),

        extensions: {
          ...(
            parentContext
              .flags
              ?.extensions ??
            {}
          ),

          ...(
            flags
              ?.extensions ??
            {}
          )
        }
      },
      actors.controllerMode
    );

  return createExecutionContext({
    identity,

    actors,

    semanticAction,

    source,

    targets:
      targets == null
        ? parentContext.targets
        : await buildTargetReferences(
            targets
          ),

    template:
      template == null
        ? parentContext.template
        : buildTemplateContext(
            template
          ),

    weapon,

    movement:
      movement == null
        ? parentContext.movement
        : buildMovementContext(
            movement
          ),

    economy:
      createExecutionEconomyContext({
        activationType:
          resolvedActivationType,

        requestedCost:
          requestedActionCost,

        costOverride:
          actionCostOverride,

        grantedByExecutionId:
          parentContext
            .identity
            .executionId,

        reactionTrigger,

        metadata:
          metadata.economy ??
          {}
      }),

    resources:
      resources
        ? createExecutionResourceContext(
            resources
          )
        : createExecutionResourceContext(),

    lineage,

    flags:
      childFlags,

    metadata: {
      ...metadata,

      parentExecutionId:
        parentContext
          .identity
          .executionId
    }
  });
}

/* ============================================================
   WEAPON EXECUTION BUILDER
   ============================================================ */

/**
 * @section weapon-execution-builder
 *
 * Convenience builder for native WeaponAttackFlow child executions.
 */

export async function buildWeaponExecutionContext({
  actor,
  weapon,

  semanticActionDefinition = null,
  semanticActionId =
    "weapon-attack",

  parentContext = null,

  targets = [],

  parentMountActionId = null,

  flags = null,

  metadata = {}
} = {}) {
  if (!weapon) {
    throw new TypeError(
      "buildWeaponExecutionContext requires weapon."
    );
  }

  if (parentContext) {
    return buildChildExecutionContext(
      parentContext,
      {
        actor,

        semanticActionDefinition,
        semanticActionId,

        nativeItem:
          weapon,

        sourceKind:
          null,

        targets,

        parentMountActionId,

        flags,

        metadata
      }
    );
  }

  return buildExecutionContext({
    actor,

    semanticActionDefinition,
    semanticActionId,

    nativeItem:
      weapon,

    targets,

    parentMountActionId,

    flags,

    metadata
  });
}

/* ============================================================
   STRUCTURED NATIVE ACTION BUILDER
   ============================================================ */

/**
 * @section structured-native-action-builder
 *
 * Used for actor-owned:
 *
 * - Mech System actions
 * - Talent actions
 * - Core Bonus actions
 * - Weapon actions
 *
 * Preserve exact native ActionData path.
 */

export async function buildNativeActionExecutionContext({
  actor,

  item,
  actionPath,

  semanticActionDefinition = null,
  semanticActionId = null,

  parentContext = null,

  targets = [],

  flags = null,

  metadata = {}
} = {}) {
  if (!item) {
    throw new TypeError(
      "buildNativeActionExecutionContext requires item."
    );
  }

  if (!requiredString(actionPath)) {
    throw new TypeError(
      "buildNativeActionExecutionContext requires actionPath."
    );
  }

  if (parentContext) {
    return buildChildExecutionContext(
      parentContext,
      {
        actor,

        semanticActionDefinition,
        semanticActionId,

        nativeItem:
          item,

        nativeActionPath:
          actionPath,

        targets,

        flags,

        metadata
      }
    );
  }

  return buildExecutionContext({
    actor,

    semanticActionDefinition,
    semanticActionId,

    nativeItem:
      item,

    nativeActionPath:
      actionPath,

    targets,

    flags,

    metadata
  });
}

/* ============================================================
   GRANTED ACTION BUILDER
   ============================================================ */

/**
 * @section granted-action-builder
 */

export async function buildGrantedActionExecutionContext(
  parentContext,
  options = {}
) {
  return buildChildExecutionContext(
    parentContext,
    {
      ...options,

      flags: {
        ...(
          options.flags ??
          {}
        ),

        grantedAction:
          true
      }
    }
  );
}

/* ============================================================
   PREPARED ACTION BUILDER
   ============================================================ */

/**
 * @section prepared-action-builder
 */

export async function buildPreparedActionExecutionContext(
  parentContext,
  options = {}
) {
  return buildChildExecutionContext(
    parentContext,
    {
      ...options,

      flags: {
        ...(
          options.flags ??
          {}
        ),

        preparedAction:
          true,

        reactionExecution:
          true
      }
    }
  );
}

/* ============================================================
   SECONDARY ATTACK BUILDER
   ============================================================ */

/**
 * @section secondary-attack-builder
 *
 * Typical use:
 *
 * Annihilator primary hit
 * → buildSecondaryAttackExecutionContext(...)
 *
 * Suppression defaults prevent:
 *
 * - duplicate bonus damage
 * - duplicate Self Heat
 * - recursive source-special generation
 *
 * Caller may override only when rule explicitly requires it.
 */

export async function buildSecondaryAttackExecutionContext(
  parentContext,
  {
    actor = null,
    weapon,

    targets = [],

    suppressBonusDamage = true,
    suppressSelfHeat = true,
    suppressSpecialRecursion = true,

    metadata = {}
  } = {}
) {
  if (!weapon) {
    throw new TypeError(
      "Secondary attack requires weapon."
    );
  }

  return buildChildExecutionContext(
    parentContext,
    {
      actor,

      semanticActionId:
        "secondary-weapon-attack",

      nativeItem:
        weapon,

      targets,

      flags: {
        secondaryAttack:
          true,

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
          )
      },

      metadata
    }
  );
}

/* ============================================================
   REACTION EXECUTION BUILDER
   ============================================================ */

/**
 * @section reaction-execution-builder
 */

export async function buildReactionExecutionContext(
  parentContext,
  {
    reactionTrigger = null,
    ...options
  } = {}
) {
  return buildChildExecutionContext(
    parentContext,
    {
      ...options,

      activationType:
        EXECUTION_ACTIVATION_TYPE.REACTION,

      reactionTrigger,

      flags: {
        ...(
          options.flags ??
          {}
        ),

        reactionExecution:
          true
      }
    }
  );
}

/* ============================================================
   MOVEMENT EXECUTION BUILDER
   ============================================================ */

/**
 * @section movement-execution-builder
 */

export async function buildMovementExecutionContext({
  actor,

  semanticActionDefinition = null,
  semanticActionId =
    "movement",

  movement,

  parentContext = null,

  flags = null,

  metadata = {}
} = {}) {
  if (!movement) {
    throw new TypeError(
      "buildMovementExecutionContext requires movement context."
    );
  }

  if (parentContext) {
    return buildChildExecutionContext(
      parentContext,
      {
        actor,

        semanticActionDefinition,
        semanticActionId,

        sourceKind:
          EXECUTION_SOURCE_KIND.MOVEMENT,

        activationType:
          EXECUTION_ACTIVATION_TYPE.MOVEMENT,

        movement,

        flags,

        metadata
      }
    );
  }

  return buildExecutionContext({
    actor,

    semanticActionDefinition,
    semanticActionId,

    sourceKind:
      EXECUTION_SOURCE_KIND.MOVEMENT,

    activationType:
      EXECUTION_ACTIVATION_TYPE.MOVEMENT,

    movement,

    flags,

    metadata
  });
}

/* ============================================================
   CONTEXT REBUILD / REVALIDATION SUPPORT
   ============================================================ */

/**
 * @section context-rebuild-revalidation-support
 *
 * ExecutionContext is a snapshot.
 *
 * Before execution, execution_transaction may call this helper to rebuild
 * the native identity portions against current Actor/Item state.
 *
 * This is NOT mechanical legality validation.
 */

export async function rebuildExecutionContext(
  context
) {
  if (!context) {
    throw new TypeError(
      "rebuildExecutionContext requires ExecutionContext."
    );
  }

  const actorReference =
    context
      .actors
      .actor;

  const nativeItemUuid =
    context
      .source
      ?.nativeItemUuid ??
    context
      .weapon
      ?.weapon
      ?.uuid ??
    null;

  const nativeActionPath =
    context
      .source
      ?.nativeActionPath ??
    context
      .semanticAction
      ?.nativeActionPath ??
    null;

  const actor =
    await nativeAdapter
      .actors
      .resolveNativeActor(
        actorReference
      );

  const actors =
    await buildExecutionActorContext({
      actor,

      controllerMode:
        context
          .actors
          .controllerMode,

      controllerSourceItemUuid:
        context
          .actors
          .controllerSourceItemUuid
    });

  const nativeItem =
    await resolveBuilderNativeItem(
      nativeItemUuid
    );

  const nativeActionReference =
    await resolveBuilderNativeAction(
      nativeItem,
      nativeActionPath
    );

  const source =
    buildExecutionSource({
      sourceKind:
        context
          .source
          .kind,

      semanticAction:
        context
          .semanticAction,

      nativeItem,

      nativeActionReference,

      sourceFeatureId:
        context
          .source
          .sourceFeatureId,

      sourceRank:
        context
          .source
          .sourceRank,

      metadata:
        context
          .source
          .metadata
    });

  const weapon =
    await buildWeaponContext({
      nativeItem,

      actors,

      parentMountActionId:
        context
          .weapon
          ?.parentMountActionId ??
        null
    });

  return createExecutionContext({
    ...context,

    actors,

    source,

    weapon:
      weapon ??
      context.weapon
  });
}

/* ============================================================
   EXECUTION CONTEXT DIAGNOSTICS
   ============================================================ */

/**
 * @section execution-context-diagnostics
 */

export function getExecutionContextDiagnostics(
  context
) {
  if (!context) {
    return null;
  }

  return Object.freeze({
    executionId:
      context
        .identity
        ?.executionId ??
      null,

    parentExecutionId:
      context
        .identity
        ?.parentExecutionId ??
      null,

    rootExecutionId:
      context
        .identity
        ?.rootExecutionId ??
      null,

    semanticActionId:
      context
        .semanticAction
        ?.id ??
      null,

    sourceKind:
      context
        .source
        ?.kind ??
      null,

    sourceItemUuid:
      context
        .source
        ?.nativeItemUuid ??
      null,

    sourceItemLid:
      context
        .source
        ?.nativeItemLid ??
      null,

    sourceActionPath:
      context
        .source
        ?.nativeActionPath ??
      null,

    actorUuid:
      context
        .actors
        ?.actor
        ?.uuid ??
      null,

    pilotUuid:
      context
        .actors
        ?.pilot
        ?.uuid ??
      null,

    mechUuid:
      context
        .actors
        ?.mech
        ?.uuid ??
      null,

    controllerMode:
      context
        .actors
        ?.controllerMode ??
      null,

    targetCount:
      context
        .targets
        ?.length ??
      0,

    weaponUuid:
      context
        .weapon
        ?.weapon
        ?.uuid ??
      null,

    mountIndex:
      context
        .weapon
        ?.mount
        ?.mountIndex ??
      null,

    child:
      Boolean(
        context
          .identity
          ?.parentExecutionId
      ),

    flags:
      context.flags
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature-contract.js
 * -------------------
 *
 * Existing semantic definitions should enter through:
 *
 * semanticActionDefinition
 *
 * Builder preserves:
 *
 * id
 * label
 * category
 * activation
 * definition reference
 *
 * This file does not replace feature-contract.js.
 *
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 *
 * Registry action definitions should be passed directly into this builder.
 *
 * Intended:
 *
 * registry action
 * → buildExecutionContext()
 * → execution_transaction
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Runtime-discovered native ActionData should pass:
 *
 * native Item UUID
 * exact native action path
 * normalized semantic registry definition
 *
 * Builder preserves native and semantic identity together.
 *
 *
 * runtime-orchestrator.js
 * -----------------------
 *
 * This builder should replace ad-hoc runtime argument assembly.
 *
 * Intended:
 *
 * runtime-orchestrator
 * → find semantic action
 * → execution-context-builder
 * → execution_transaction
 *
 *
 * foundry-integration-feature.js
 * ------------------------------
 *
 * Existing Actor/Item resolution should continue migrating behind
 * native_adapter.
 *
 * This builder should not call legacy Foundry integration helpers when
 * native_adapter already provides the required operation.
 *
 *
 * feature_turn/
 * -------------
 *
 * Should provide controller/action context to the builder.
 *
 * Builder records that state.
 *
 * It does not decide whether the action budget is available.
 *
 *
 * feature_movement/
 * -----------------
 *
 * Movement requests may build a Movement ExecutionContext.
 *
 * Existing movement tracker remains authoritative for actual cost.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Consumes the output of this file as its canonical input.
 *
 * It may call:
 *
 * rebuildExecutionContext()
 *
 * immediately before final validation/execution.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Receives context.targets/template.
 *
 * It owns target legality and may return an updated immutable context.
 *
 *
 * resource_service/
 * -----------------
 *
 * Resource discovery may use:
 *
 * context.source
 * context.weapon
 * context.semanticAction
 *
 * The builder may carry predeclared ResourceDescriptors but does not
 * discover/validate them itself.
 *
 *
 * action_economy/
 * ---------------
 *
 * Reads:
 *
 * context.economy.activationType
 * context.economy.costOverride
 * context.flags.*
 *
 * Builder does not spend action economy.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * executionId/rootExecutionId/lineage from this context should identify
 * all events generated by one semantic execution chain.
 *
 *
 * execution-strategy registry
 * ---------------------------
 *
 * Strategy resolution can key from:
 *
 * context.semanticAction.id
 * context.source.kind
 * context.source.nativeItemLid
 * context.source.nativeActionPath
 * context.source.nativeProfileName/index
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * All runtime executions should converge on one ExecutionContext shape.
 *
 * INVARIANT 2
 * Native Actor/Item resolution occurs through native_adapter.
 *
 * INVARIANT 3
 * The builder does not directly read native Lancer system paths when an
 * adapter API exists.
 *
 * INVARIANT 4
 * Semantic action identity and native source identity are both preserved.
 *
 * INVARIANT 5
 * Exact native ActionData paths are preserved.
 *
 * INVARIANT 6
 * Mech Weapon context attempts to preserve mount, slot, mod, and active
 * profile identity.
 *
 * INVARIANT 7
 * Pilot Weapon executions do not invent Mech mount context.
 *
 * INVARIANT 8
 * Controller mode is supplied by Frame Conn runtime and is not inferred
 * from AI installation.
 *
 * INVARIANT 9
 * Targets are normalized but not validated here.
 *
 * INVARIANT 10
 * Parent/child execution IDs and root lineage are never discarded.
 *
 * INVARIANT 11
 * Child executions receive their own immutable ExecutionContext.
 *
 * INVARIANT 12
 * Secondary attack suppression flags are explicit and source-rule
 * controlled.
 *
 * INVARIANT 13
 * Context rebuilding refreshes native identity only; it does not perform
 * tabletop legality validation.
 *
 * INVARIANT 14
 * Action economy, resources, lifecycle, targeting, and semantic events
 * remain separate services.
 *
 * INVARIANT 15
 * Unknown/custom content retains native UUID/LID/action-path identity even
 * when no bespoke Frame Conn strategy exists.
 */