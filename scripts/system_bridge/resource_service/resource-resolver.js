/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/resource_service/resource-resolver.js
 */
/**
 * @file
 * @path main/resource_service/resource-resolver.js
 * @module resource-resolver
 * @layer resource-service-resolution
 * @responsibility resolve-resource-declarations-and-native-resource-state-for-one-execution
 * @public-boundary false
 * @side-effects native-resource-reads-only
 *
 * @depends-on
 * - resource-contract
 * - semantic_execution_context/execution-context
 * - native_adapter/native-adapter
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes ExecutionContext from semantic_execution_context/
 * - consumes native resource discovery from native_adapter/
 * - consumes resource declarations supplied by:
 *   - existing semantic action definitions
 *   - future feature_runtime_bridge/
 *   - execution strategies
 *   - actor-owned feature augmentation
 * - consumed by resource-transaction.js
 * - consumed indirectly by resource-hooks.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - native_adapter/native-resources.js remains native-state authority
 * - feature registry remains existing semantic declaration authority
 * - semantic_execution_context/ remains canonical execution carrier
 * - resource-contract.js remains normalized resource contract
 * - execution_transaction/ remains validation/commit timing authority
 *
 * THIS FILE OWNS:
 * - resource declaration discovery from ExecutionContext
 * - native resource discovery for source Items
 * - declaration → ResourceDescriptor normalization
 * - native resource → ResourceDescriptor normalization
 * - descriptor deduplication
 * - descriptor classification
 * - resource-state resolution
 * - resource collection construction
 *
 * THIS FILE DOES NOT OWN:
 * - resource mutation
 * - transaction commit
 * - reset scheduling
 * - action economy
 * - semantic feature rules
 * - native Flow execution
 *
 * EDIT CONTRACT:
 * - native reads go through native_adapter
 * - never consume resources here
 * - never mutate ExecutionContext here
 * - preserve native and supplemental resources separately
 * - deduplicate identical resource identities
 * - do not interpret arbitrary effect prose
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  RESOURCE_AUTHORITY,
  RESOURCE_CONSUMPTION,
  RESOURCE_KIND,
  RESOURCE_OPERATION,
  RESOURCE_REQUIREMENT_MODE,
  RESOURCE_RESET_SCOPE,
  RESOURCE_SOURCE_KIND,
  classifyResourceDescriptors,
  createResourceDescriptor,
  createResourceIdentity,
  createResourceRequirement,
  createResourceSnapshot
} from "./resource-contract.js";
import {
  getExecutionSourceActionPath,
  getExecutionSourceFeatureId,
  getExecutionSourceItemLid,
  getExecutionSourceItemUuid,
  getExecutionSourceKind,
  getExecutionWeaponUuid,
  getSemanticActionDefinition,
  getSemanticActionId
} from "../semantic_execution_context/execution-context.js";
import {
  nativeAdapter
} from "../native_adapter/native-adapter.js";
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
/**
 * @section private-helpers
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
function lower(value) {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}
/* ============================================================
   SOURCE KIND MAPPING
   ============================================================ */
/**
 * @section source-kind-mapping
 *
 * ExecutionContext and resource contracts intentionally have separate
 * enums.
 */
function mapExecutionSourceKindToResourceSourceKind(
  sourceKind
) {
  switch (sourceKind) {
    case "universal-action":
      return RESOURCE_SOURCE_KIND.UNIVERSAL_ACTION;
    case "frame-trait":
      return RESOURCE_SOURCE_KIND.FRAME_TRAIT;
    case "frame-core-system":
      return RESOURCE_SOURCE_KIND.CORE_SYSTEM;
    case "talent":
      return RESOURCE_SOURCE_KIND.TALENT;
    case "core-bonus":
      return RESOURCE_SOURCE_KIND.CORE_BONUS;
    case "mech-system":
      return RESOURCE_SOURCE_KIND.MECH_SYSTEM;
    case "mech-weapon":
      return RESOURCE_SOURCE_KIND.MECH_WEAPON;
    case "pilot-weapon":
      return RESOURCE_SOURCE_KIND.PILOT_WEAPON;
    case "weapon-mod":
      return RESOURCE_SOURCE_KIND.WEAPON_MOD;
    case "pilot-action":
      return RESOURCE_SOURCE_KIND.PILOT_ACTION;
    case "pilot-gear":
      return RESOURCE_SOURCE_KIND.PILOT_GEAR;
    case "nhp":
      return RESOURCE_SOURCE_KIND.NHP;
    case "status":
      return RESOURCE_SOURCE_KIND.STATUS;
    case "movement":
      return RESOURCE_SOURCE_KIND.MOVEMENT;
    case "supplemental":
      return RESOURCE_SOURCE_KIND.SUPPLEMENTAL;
    default:
      return RESOURCE_SOURCE_KIND.UNKNOWN;
  }
}
/* ============================================================
   RESOURCE ID
   ============================================================ */
/**
 * @section resource-id
 *
 * Stable enough for one owned feature/resource pair.
 *
 * Prefer declaration-provided IDs where available.
 */
function buildResourceId({
  explicitId = null,
  kind,
  actorUuid = null,
  itemUuid = null,
  actionPath = null,
  key = null,
  sourceFeatureId = null
} = {}) {
  if (requiredString(explicitId)) {
    return explicitId;
  }
  return [
    sourceFeatureId,
    actorUuid,
    itemUuid,
    actionPath,
    kind,
    key
  ]
    .filter(
      value =>
        value != null &&
        value !== ""
    )
    .join("::");
}
/* ============================================================
   DECLARATION EXTRACTION
   ============================================================ */
/**
 * @section declaration-extraction
 *
 * Transitional compatibility:
 *
 * Existing registry definitions may expose supplemental resource data
 * under more than one migration-era field.
 *
 * Future feature_runtime_bridge/ should converge on:
 *
 * runtime.resources
 *
 * No arbitrary prose parsing occurs.
 */
function extractResourceDeclarationsFromDefinition(
  definition
) {
  if (!definition) {
    return [];
  }
  const declarations = [];
  const candidates = [
    definition.resources,
    definition.runtime
      ?.resources,
    definition.execution
      ?.resources,
    definition.runtimeAugmentation
      ?.resources,
    definition.resourceDeclarations
  ];
  for (
    const candidate of
      candidates
  ) {
    for (
      const declaration of
        normalizeArray(candidate)
    ) {
      if (
        declaration &&
        isObject(declaration)
      ) {
        declarations.push(
          declaration
        );
      }
    }
  }
  return declarations;
}
/* ============================================================
   CONTEXT RESOURCE EXTRACTION
   ============================================================ */
/**
 * @section context-resource-extraction
 *
 * ExecutionContext may already contain resolved/predeclared resources.
 *
 * Preserve them.
 */
function extractContextResourceDescriptors(
  context
) {
  const descriptors = [];
  const groups = [
    context
      ?.resources
      ?.required,
    context
      ?.resources
      ?.deferred,
    context
      ?.resources
      ?.nativeConsumed,
    context
      ?.resources
      ?.supplemental
  ];
  for (
    const group of
      groups
  ) {
    for (
      const descriptor of
        normalizeArray(group)
    ) {
      if (descriptor) {
        descriptors.push(
          descriptor
        );
      }
    }
  }
  return descriptors;
}
/* ============================================================
   DECLARATION NORMALIZATION
   ============================================================ */
/**
 * @section declaration-normalization
 */
function normalizeDeclarationRequirement(
  requirement
) {
  if (!requirement) {
    return null;
  }
  if (
    requirement.mode &&
    Object.isFrozen(
      requirement
    )
  ) {
    return requirement;
  }
  return createResourceRequirement({
    mode:
      requirement.mode ??
      RESOURCE_REQUIREMENT_MODE.AVAILABLE,
    amount:
      requirement.amount ??
      null,
    expected:
      requirement.expected ??
      null,
    reason:
      requirement.reason ??
      null,
    metadata:
      requirement.metadata ??
      {}
  });
}
function normalizeDeclarationMutation(
  mutation
) {
  if (!mutation) {
    return null;
  }
  /*
   * Mutation shape is already plain contract data.
   *
   * resource-transaction.js owns interpretation.
   *
   * Preserve as-is rather than silently inventing an operation.
   */
  return Object.freeze({
    ...mutation
  });
}
function descriptorFromDeclaration(
  declaration,
  {
    context,
    nativeItem = null
  } = {}
) {
  const sourceKind =
    declaration.sourceKind ??
    mapExecutionSourceKindToResourceSourceKind(
      getExecutionSourceKind(
        context
      )
    );
  const actorUuid =
    declaration.actorUuid ??
    nativeItem?.actor?.uuid ??
    context
      ?.actors
      ?.actor
      ?.uuid ??
    null;
  const itemUuid =
    declaration.itemUuid ??
    nativeItem?.uuid ??
    getExecutionSourceItemUuid(
      context
    ) ??
    null;
  const itemLid =
    declaration.itemLid ??
    nativeItem?.system?.lid ??
    getExecutionSourceItemLid(
      context
    ) ??
    null;
  const actionPath =
    declaration.actionPath ??
    getExecutionSourceActionPath(
      context
    ) ??
    null;
  const sourceFeatureId =
    declaration.sourceFeatureId ??
    getExecutionSourceFeatureId(
      context
    ) ??
    getSemanticActionId(
      context
    ) ??
    null;
  const identity =
    createResourceIdentity({
      id:
        buildResourceId({
          explicitId:
            declaration.id,
          kind:
            declaration.kind,
          actorUuid,
          itemUuid,
          actionPath,
          key:
            declaration.key,
          sourceFeatureId
        }),
      kind:
        declaration.kind,
      authority:
        declaration.authority ??
        RESOURCE_AUTHORITY.FRAME_CONN,
      actorUuid,
      itemUuid,
      itemLid,
      actionPath,
      sourceKind,
      sourceFeatureId,
      key:
        declaration.key ??
        null,
      metadata:
        declaration.identityMetadata ??
        {}
    });
  return createResourceDescriptor({
    identity,
    consumption:
      declaration.consumption ??
      RESOURCE_CONSUMPTION.DEFERRED,
    resetScope:
      declaration.resetScope ??
      RESOURCE_RESET_SCOPE.NEVER,
    requirement:
      normalizeDeclarationRequirement(
        declaration.requirement
      ),
    mutation:
      normalizeDeclarationMutation(
        declaration.mutation
      ),
    nativeOperation:
      declaration.nativeOperation ??
      null,
    required:
      declaration.required ??
      true,
    optional:
      declaration.optional ??
      false,
    metadata:
      declaration.metadata ??
      {}
  });
}
/* ============================================================
   NATIVE RESOURCE KIND NORMALIZATION
   ============================================================ */
/**
 * @section native-resource-kind-normalization
 */
function inferNativeResourceKind(
  nativeResource
) {
  const raw =
    lower(
      nativeResource?.kind ??
      nativeResource?.type ??
      nativeResource?.resourceKind ??
      nativeResource?.key ??
      nativeResource?.name
    );
  if (
    raw.includes(
      "limited"
    )
  ) {
    return RESOURCE_KIND.LIMITED;
  }
  if (
    raw.includes(
      "loaded"
    ) ||
    raw.includes(
      "loading"
    )
  ) {
    return RESOURCE_KIND.LOADED;
  }
  if (
    raw.includes(
      "core"
    ) &&
    (
      raw.includes(
        "energy"
      ) ||
      raw.includes(
        "power"
      )
    )
  ) {
    return RESOURCE_KIND.CORE_ENERGY;
  }
  if (
    raw.includes(
      "counter"
    )
  ) {
    return RESOURCE_KIND.COUNTER;
  }
  if (
    raw.includes(
      "charge"
    )
  ) {
    return RESOURCE_KIND.CHARGE;
  }
  if (
    raw.includes(
      "cascade"
    )
  ) {
    return RESOURCE_KIND.CASCADING;
  }
  return RESOURCE_KIND.CUSTOM;
}
/* ============================================================
   NATIVE RESOURCE RESET NORMALIZATION
   ============================================================ */
function inferNativeResetScope(
  kind
) {
  switch (kind) {
    case RESOURCE_KIND.LIMITED:
    case RESOURCE_KIND.CORE_ENERGY:
      return RESOURCE_RESET_SCOPE.FULL_REPAIR;
    case RESOURCE_KIND.LOADED:
      return RESOURCE_RESET_SCOPE.RELOAD;
    default:
      return RESOURCE_RESET_SCOPE.NATIVE;
  }
}
/* ============================================================
   NATIVE RESOURCE CONSUMPTION NORMALIZATION
   ============================================================ */
function inferNativeConsumption(
  kind
) {
  switch (kind) {
    case RESOURCE_KIND.LIMITED:
    case RESOURCE_KIND.LOADED:
    case RESOURCE_KIND.CORE_ENERGY:
      return RESOURCE_CONSUMPTION.NATIVE;
    default:
      /*
       * Native-backed CounterData does NOT imply native semantic
       * consumption.
       *
       * Resolver leaves it verify-only unless augmentation declares
       * explicit Frame Conn consumption.
       */
      return RESOURCE_CONSUMPTION.VERIFY_ONLY;
  }
}
/* ============================================================
   NATIVE RESOURCE REQUIREMENT NORMALIZATION
   ============================================================ */
function inferNativeRequirement(
  kind
) {
  switch (kind) {
    case RESOURCE_KIND.LIMITED:
    case RESOURCE_KIND.CORE_ENERGY:
      return createResourceRequirement({
        mode:
          RESOURCE_REQUIREMENT_MODE.AT_LEAST,
        amount:
          1
      });
    case RESOURCE_KIND.LOADED:
      return createResourceRequirement({
        mode:
          RESOURCE_REQUIREMENT_MODE.AVAILABLE
      });
    default:
      return null;
  }
}
/* ============================================================
   NATIVE RESOURCE OPERATION NORMALIZATION
   ============================================================ */
function inferNativeOperation(
  kind
) {
  switch (kind) {
    case RESOURCE_KIND.LIMITED:
    case RESOURCE_KIND.CORE_ENERGY:
      return RESOURCE_OPERATION.SPEND;
    case RESOURCE_KIND.LOADED:
      return RESOURCE_OPERATION.SET;
    default:
      return RESOURCE_OPERATION.VERIFY;
  }
}
/* ============================================================
   NATIVE RESOURCE DESCRIPTOR
   ============================================================ */
/**
 * @section native-resource-descriptor
 *
 * discoverNativeItemResources() is the authoritative discovery entry.
 *
 * Normalize its records without depending on one exact internal shape.
 */
function descriptorFromNativeResource(
  nativeResource,
  {
    context,
    nativeItem
  } = {}
) {
  const kind =
    inferNativeResourceKind(
      nativeResource
    );
  const actorUuid =
    nativeResource.actorUuid ??
    nativeItem?.actor?.uuid ??
    context
      ?.actors
      ?.actor
      ?.uuid ??
    null;
  const itemUuid =
    nativeResource.itemUuid ??
    nativeItem?.uuid ??
    getExecutionSourceItemUuid(
      context
    ) ??
    null;
  const itemLid =
    nativeResource.itemLid ??
    nativeItem?.system?.lid ??
    getExecutionSourceItemLid(
      context
    ) ??
    null;
  const key =
    nativeResource.key ??
    nativeResource.counterKey ??
    nativeResource.id ??
    lower(
      nativeResource.name
    ) ??
    kind;
  const sourceFeatureId =
    getExecutionSourceFeatureId(
      context
    ) ??
    getSemanticActionId(
      context
    ) ??
    null;
  const identity =
    createResourceIdentity({
      id:
        buildResourceId({
          explicitId:
            nativeResource.resourceId,
          kind,
          actorUuid,
          itemUuid,
          actionPath:
            getExecutionSourceActionPath(
              context
            ),
          key,
          sourceFeatureId
        }),
      kind,
      authority:
        RESOURCE_AUTHORITY.NATIVE,
      actorUuid,
      itemUuid,
      itemLid,
      actionPath:
        getExecutionSourceActionPath(
          context
        ),
      sourceKind:
        mapExecutionSourceKindToResourceSourceKind(
          getExecutionSourceKind(
            context
          )
        ),
      sourceFeatureId,
      key,
      metadata: {
        nativeDiscovered:
          true,
        nativeKind:
          nativeResource.kind ??
          nativeResource.type ??
          null
      }
    });
  return createResourceDescriptor({
    identity,
    consumption:
      nativeResource.consumption ??
      inferNativeConsumption(
        kind
      ),
    resetScope:
      nativeResource.resetScope ??
      inferNativeResetScope(
        kind
      ),
    requirement:
      nativeResource.requirement ??
      inferNativeRequirement(
        kind
      ),
    mutation:
      nativeResource.mutation ??
      null,
    nativeOperation:
      nativeResource.nativeOperation ??
      inferNativeOperation(
        kind
      ),
    required:
      nativeResource.required ??
      true,
    optional:
      nativeResource.optional ??
      false,
    metadata: {
      nativeResource,
      ...(
        nativeResource.metadata ??
        {}
      )
    }
  });
}
/* ============================================================
   SOURCE ITEM RESOLUTION
   ============================================================ */
/**
 * @section source-item-resolution
 */
async function resolveResourceSourceItem(
  context
) {
  const itemUuid =
    getExecutionSourceItemUuid(
      context
    ) ??
    getExecutionWeaponUuid(
      context
    );
  if (!itemUuid) {
    return null;
  }
  return nativeAdapter
    .items
    .resolveNativeItem(
      itemUuid,
      {
        required: false
      }
    );
}
/* ============================================================
   NATIVE RESOURCE DISCOVERY
   ============================================================ */
/**
 * @section native-resource-discovery
 */
async function discoverNativeResourceDescriptors(
  context,
  nativeItem
) {
  if (!nativeItem) {
    return [];
  }
  if (
    typeof nativeAdapter
      .resources
      .discoverNativeItemResources !==
    "function"
  ) {
    return [];
  }
  const discovered =
    await nativeAdapter
      .resources
      .discoverNativeItemResources(
        nativeItem
      );
  const descriptors = [];
  for (
    const nativeResource of
      normalizeArray(discovered)
  ) {
    if (!nativeResource) {
      continue;
    }
    descriptors.push(
      descriptorFromNativeResource(
        nativeResource,
        {
          context,
          nativeItem
        }
      )
    );
  }
  return descriptors;
}
/* ============================================================
   DECLARATION DISCOVERY
   ============================================================ */
/**
 * @section declaration-discovery
 */
function discoverDeclaredResourceDescriptors(
  context,
  nativeItem,
  explicitDeclarations = []
) {
  const definitions =
    getSemanticActionDefinition(
      context
    );
  const declarations = [
    ...extractResourceDeclarationsFromDefinition(
      definitions
    ),
    ...normalizeArray(
      explicitDeclarations
    )
  ];
  return declarations.map(
    declaration =>
      descriptorFromDeclaration(
        declaration,
        {
          context,
          nativeItem
        }
      )
  );
}
/* ============================================================
   DESCRIPTOR DEDUPLICATION
   ============================================================ */
/**
 * @section descriptor-deduplication
 *
 * Priority:
 *
 * later descriptor wins.
 *
 * This allows explicit runtime augmentation declarations to override
 * generic native discovery without mutating the native record.
 */
export function deduplicateResourceDescriptors(
  descriptors
) {
  const byId =
    new Map();
  for (
    const descriptor of
      descriptors
  ) {
    const id =
      descriptor
        ?.identity
        ?.id;
    if (!requiredString(id)) {
      continue;
    }
    byId.set(
      id,
      descriptor
    );
  }
  return Object.freeze([
    ...byId.values()
  ]);
}
/* ============================================================
   PRIMARY RESOURCE DESCRIPTOR RESOLUTION
   ============================================================ */
/**
 * @section primary-resource-descriptor-resolution
 *
 * Order:
 *
 * 1. native-discovered descriptors
 * 2. existing context descriptors
 * 3. semantic/augmentation declarations
 * 4. explicit resolver declarations
 *
 * Later entries override same-ID earlier entries.
 */
export async function resolveExecutionResourceDescriptors(
  context,
  {
    declarations = [],
    discoverNative = true
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "resolveExecutionResourceDescriptors requires ExecutionContext."
    );
  }
  const nativeItem =
    await resolveResourceSourceItem(
      context
    );
  const nativeDescriptors =
    discoverNative
      ? await discoverNativeResourceDescriptors(
          context,
          nativeItem
        )
      : [];
  const existingDescriptors =
    extractContextResourceDescriptors(
      context
    );
  const declaredDescriptors =
    discoverDeclaredResourceDescriptors(
      context,
      nativeItem,
      declarations
    );
  return deduplicateResourceDescriptors([
    ...nativeDescriptors,
    ...existingDescriptors,
    ...declaredDescriptors
  ]);
}
/* ============================================================
   PRIMARY RESOURCE COLLECTION RESOLUTION
   ============================================================ */
/**
 * @section primary-resource-collection-resolution
 */
export async function resolveExecutionResourceCollection(
  context,
  options = {}
) {
  const descriptors =
    await resolveExecutionResourceDescriptors(
      context,
      options
    );
  return classifyResourceDescriptors(
    descriptors
  );
}
/* ============================================================
   NATIVE SNAPSHOT NORMALIZATION
   ============================================================ */
/**
 * @section native-snapshot-normalization
 */
function snapshotFromNativeState(
  descriptor,
  nativeState
) {
  if (nativeState == null) {
    return createResourceSnapshot({
      identity:
        descriptor.identity,
      exists:
        false,
      available:
        false
    });
  }
  if (
    nativeState.identity &&
    Object.isFrozen(
      nativeState
    )
  ) {
    return nativeState;
  }
  const value =
    nativeState.value ??
    nativeState.current ??
    nativeState.uses ??
    nativeState.remaining ??
    null;
  const max =
    nativeState.max ??
    nativeState.maximum ??
    nativeState.limit ??
    null;
  let available =
    nativeState.available;
  if (available == null) {
    if (
      typeof value ===
      "boolean"
    ) {
      available =
        value;
    } else if (
      finiteNumber(value)
    ) {
      available =
        value > 0;
    }
  }
  return createResourceSnapshot({
    identity:
      descriptor.identity,
    value,
    min:
      nativeState.min ??
      0,
    max,
    available,
    exists:
      nativeState.exists ??
      true,
    raw:
      nativeState,
    metadata:
      nativeState.metadata ??
      {}
  });
}
/* ============================================================
   NATIVE LIMITED SNAPSHOT
   ============================================================ */
async function resolveNativeLimitedSnapshot(
  descriptor
) {
  if (
    typeof nativeAdapter
      .resources
      .getNativeLimitedState !==
    "function"
  ) {
    return null;
  }
  if (
    !descriptor
      .identity
      .itemUuid
  ) {
    return null;
  }
  const state =
    await nativeAdapter
      .resources
      .getNativeLimitedState(
        descriptor
          .identity
          .itemUuid
      );
  return snapshotFromNativeState(
    descriptor,
    state
  );
}
/* ============================================================
   NATIVE COUNTER SNAPSHOT
   ============================================================ */
async function resolveNativeCounterSnapshot(
  descriptor
) {
  if (
    typeof nativeAdapter
      .resources
      .getNativeCounterState !==
    "function"
  ) {
    return null;
  }
  if (
    !descriptor
      .identity
      .itemUuid ||
    !descriptor
      .identity
      .key
  ) {
    return null;
  }
  const state =
    await nativeAdapter
      .resources
      .getNativeCounterState(
        descriptor
          .identity
          .itemUuid,
        descriptor
          .identity
          .key
      );
  return snapshotFromNativeState(
    descriptor,
    state
  );
}
/* ============================================================
   GENERIC NATIVE SNAPSHOT
   ============================================================ */
/**
 * @section generic-native-snapshot
 *
 * Prefer native adapter's generic resolver where available.
 */
async function resolveGenericNativeSnapshot(
  descriptor
) {
  if (
    typeof nativeAdapter
      .resources
      .getNativeResourceState ===
    "function"
  ) {
    const state =
      await nativeAdapter
        .resources
        .getNativeResourceState(
          descriptor
        );
    return snapshotFromNativeState(
      descriptor,
      state
    );
  }
  return null;
}
/* ============================================================
   NATIVE RESOURCE SNAPSHOT RESOLUTION
   ============================================================ */
async function resolveNativeResourceSnapshot(
  descriptor
) {
  let snapshot =
    await resolveGenericNativeSnapshot(
      descriptor
    );
  if (snapshot) {
    return snapshot;
  }
  switch (
    descriptor.identity.kind
  ) {
    case RESOURCE_KIND.LIMITED:
      snapshot =
        await resolveNativeLimitedSnapshot(
          descriptor
        );
      break;
    case RESOURCE_KIND.COUNTER:
    case RESOURCE_KIND.CHARGE:
      snapshot =
        await resolveNativeCounterSnapshot(
          descriptor
        );
      break;
    default:
      break;
  }
  if (snapshot) {
    return snapshot;
  }
  /*
   * native-resources may already have embedded the discovered state in
   * descriptor metadata.
   */
  const discoveredState =
    descriptor
      ?.metadata
      ?.nativeResource
      ?.state ??
    descriptor
      ?.metadata
      ?.nativeResource;
  if (discoveredState) {
    return snapshotFromNativeState(
      descriptor,
      discoveredState
    );
  }
  return createResourceSnapshot({
    identity:
      descriptor.identity,
    exists:
      false,
    available:
      false,
    metadata: {
      reason:
        "native-resource-state-unresolved"
    }
  });
}
/* ============================================================
   FRAME CONN RESOURCE SNAPSHOT RESOLUTION
   ============================================================ */
/**
 * @section frame-conn-resource-snapshot-resolution
 *
 * Supplemental persistence service does not exist yet.
 *
 * Resolver accepts structured current state carried by:
 *
 * descriptor.metadata.state
 *
 * or:
 *
 * context.metadata.resources[resourceId]
 *
 * Once the persistence/lifecycle service exists, replace this fallback
 * through the public service boundary rather than changing descriptors.
 */
function resolveFrameConnResourceSnapshot(
  context,
  descriptor
) {
  const resourceId =
    descriptor
      .identity
      .id;
  const state =
    descriptor
      ?.metadata
      ?.state ??
    context
      ?.metadata
      ?.resources
      ?.[resourceId] ??
    null;
  if (state == null) {
    return createResourceSnapshot({
      identity:
        descriptor.identity,
      exists:
        false,
      available:
        false,
      metadata: {
        reason:
          "frame-conn-resource-state-unresolved"
      }
    });
  }
  if (
    isObject(state)
  ) {
    const value =
      state.value ??
      state.current ??
      null;
    return createResourceSnapshot({
      identity:
        descriptor.identity,
      value,
      min:
        state.min ??
        0,
      max:
        state.max ??
        null,
      available:
        state.available ??
        (
          typeof value ===
          "boolean"
            ? value
            : finiteNumber(value)
              ? value > 0
              : null
        ),
      exists:
        state.exists ??
        true,
      raw:
        state
    });
  }
  return createResourceSnapshot({
    identity:
      descriptor.identity,
    value:
      state,
    available:
      typeof state ===
      "boolean"
        ? state
        : finiteNumber(state)
          ? state > 0
          : null,
    exists:
      true
  });
}
/* ============================================================
   DERIVED RESOURCE SNAPSHOT RESOLUTION
   ============================================================ */
function resolveDerivedResourceSnapshot(
  context,
  descriptor
) {
  const derivedValue =
    descriptor
      ?.metadata
      ?.derive;
  if (
    typeof derivedValue ===
    "function"
  ) {
    throw new Error(
      "Derived resource functions must be resolved by strategy/service code before entering resource-resolver."
    );
  }
  const value =
    descriptor
      ?.metadata
      ?.value ??
    null;
  return createResourceSnapshot({
    identity:
      descriptor.identity,
    value,
    available:
      typeof value ===
      "boolean"
        ? value
        : finiteNumber(value)
          ? value > 0
          : null,
    exists:
      value != null
  });
}
/* ============================================================
   SINGLE RESOURCE SNAPSHOT RESOLUTION
   ============================================================ */
/**
 * @section single-resource-snapshot-resolution
 */
export async function resolveExecutionResourceSnapshot(
  context,
  descriptor
) {
  if (!context) {
    throw new TypeError(
      "resolveExecutionResourceSnapshot requires ExecutionContext."
    );
  }
  if (!descriptor?.identity) {
    throw new TypeError(
      "resolveExecutionResourceSnapshot requires ResourceDescriptor."
    );
  }
  switch (
    descriptor
      .identity
      .authority
  ) {
    case RESOURCE_AUTHORITY.NATIVE:
      return resolveNativeResourceSnapshot(
        descriptor
      );
    case RESOURCE_AUTHORITY.FRAME_CONN:
      return resolveFrameConnResourceSnapshot(
        context,
        descriptor
      );
    case RESOURCE_AUTHORITY.DERIVED:
      return resolveDerivedResourceSnapshot(
        context,
        descriptor
      );
    case RESOURCE_AUTHORITY.EXTERNAL:
      return createResourceSnapshot({
        identity:
          descriptor.identity,
        exists:
          false,
        available:
          null,
        metadata: {
          reason:
            "external-resource-requires-external-resolver"
        }
      });
    default:
      return createResourceSnapshot({
        identity:
          descriptor.identity,
        exists:
          false,
        available:
          false,
        metadata: {
          reason:
            "unknown-resource-authority"
        }
      });
  }
}
/* ============================================================
   ALL RESOURCE SNAPSHOT RESOLUTION
   ============================================================ */
export async function resolveExecutionResourceSnapshots(
  context,
  descriptors
) {
  const snapshots = [];
  for (
    const descriptor of
      descriptors
  ) {
    snapshots.push(
      await resolveExecutionResourceSnapshot(
        context,
        descriptor
      )
    );
  }
  return Object.freeze(
    snapshots
  );
}
/* ============================================================
   COMPLETE RESOLUTION
   ============================================================ */
/**
 * @section complete-resolution
 *
 * Convenience result used by resource-transaction.js.
 */
export async function resolveExecutionResources(
  context,
  options = {}
) {
  const descriptors =
    await resolveExecutionResourceDescriptors(
      context,
      options
    );
  const snapshots =
    await resolveExecutionResourceSnapshots(
      context,
      descriptors
    );
  const collection =
    classifyResourceDescriptors(
      descriptors
    );
  return Object.freeze({
    descriptors,
    snapshots,
    collection
  });
}
/* ============================================================
   DESCRIPTOR LOOKUP
   ============================================================ */
export function findResolvedResourceDescriptor(
  descriptors,
  resourceId
) {
  if (!requiredString(resourceId)) {
    return null;
  }
  return (
    descriptors.find(
      descriptor =>
        descriptor
          ?.identity
          ?.id ===
        resourceId
    ) ??
    null
  );
}
export function findResolvedResourceSnapshot(
  snapshots,
  resourceId
) {
  if (!requiredString(resourceId)) {
    return null;
  }
  return (
    snapshots.find(
      snapshot =>
        snapshot
          ?.identity
          ?.id ===
        resourceId
    ) ??
    null
  );
}
/* ============================================================
   RESOLVER DIAGNOSTICS
   ============================================================ */
/**
 * @section resolver-diagnostics
 */
export async function getResourceResolverDiagnostics(
  context,
  options = {}
) {
  const resolved =
    await resolveExecutionResources(
      context,
      options
    );
  return Object.freeze({
    semanticActionId:
      getSemanticActionId(
        context
      ),
    sourceKind:
      getExecutionSourceKind(
        context
      ),
    sourceItemUuid:
      getExecutionSourceItemUuid(
        context
      ),
    descriptorCount:
      resolved
        .descriptors
        .length,
    snapshotCount:
      resolved
        .snapshots
        .length,
    resources:
      Object.freeze(
        resolved
          .descriptors
          .map(
            descriptor =>
              Object.freeze({
                id:
                  descriptor
                    .identity
                    .id,
                kind:
                  descriptor
                    .identity
                    .kind,
                authority:
                  descriptor
                    .identity
                    .authority,
                consumption:
                  descriptor
                    .consumption,
                resetScope:
                  descriptor
                    .resetScope
              })
          )
      )
  });
}
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * feature-registry.js / feature-registry-core.js
 * ------------------------------------------------
 *
 * Existing entries do not need to be expanded immediately.
 *
 * Resolver may consume supplemental declarations injected later by:
 *
 * feature_runtime_bridge/
 *
 * Base registry remains stable.
 *
 *
 * feature-contract.js
 * -------------------
 *
 * If an existing semantic definition already declares resources, this
 * resolver preserves them.
 *
 * No requirement that all old definitions be rewritten.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies:
 *
 * semantic action identity
 * native Item identity
 * action path
 * weapon/mount context
 * preattached resource descriptors
 *
 * Resolver does not mutate ExecutionContext.
 *
 *
 * native_adapter/native-resources.js
 * ----------------------------------
 *
 * Remains native authority for:
 *
 * Limited
 * Loaded
 * Core Energy
 * CounterData
 * Cascading/native-backed resource state
 *
 * This resolver normalizes those states only.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * resource-hooks.js will invoke this resolver during prevalidation.
 *
 * Typical:
 *
 * BEFORE_PRE_VALIDATE
 * → resolve descriptors
 * → snapshot current resource state
 * → resource-transaction validates
 *
 *
 * resource-transaction.js
 * -----------------------
 *
 * Consumes:
 *
 * descriptors
 * snapshots
 * collection
 *
 * Resolver itself performs no mutations.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Future lifecycle service should own restoration/reset of:
 *
 * turn
 * round
 * scene
 * mission
 * full-repair
 * custom frequency resources
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * Intended source of resource declarations missing from current registry.
 *
 * Example:
 *
 * Everest Initiative
 * → existing registry action
 * + augmentation frequency declaration
 * → resolver
 * → Frame Conn scene resource descriptor
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Can attach declarations discovered from:
 *
 * traits
 * talents
 * core bonuses
 * systems
 * weapons
 *
 * without requiring those native Item types to contain runtime rule
 * implementations.
 */
/* ============================================================
   NATIVE / SEMANTIC RESOURCE EXAMPLES
   ============================================================ */
/**
 * @section native-semantic-resource-examples
 *
 * LIMITED WEAPON
 * --------------
 *
 * native discovery:
 *
 * Limited
 *
 * resolver:
 *
 * authority = NATIVE
 * consumption = NATIVE
 *
 * native Flow consumes.
 *
 *
 * LOADING WEAPON
 * --------------
 *
 * native discovery:
 *
 * Loaded
 *
 * resolver:
 *
 * authority = NATIVE
 * consumption = NATIVE
 *
 * WeaponAttackFlow unloads.
 *
 *
 * CORE ACTIVE
 * -----------
 *
 * native discovery:
 *
 * Core Energy
 *
 * resolver:
 *
 * authority = NATIVE
 * consumption = NATIVE
 *
 * CoreActiveFlow consumes.
 *
 *
 * EVEREST INITIATIVE
 * ------------------
 *
 * native Item data:
 *
 * semantic trait text only
 *
 * augmentation:
 *
 * frequency 1/scene
 *
 * resolver:
 *
 * authority = FRAME_CONN
 * consumption = DEFERRED
 * resetScope = SCENE
 *
 *
 * LEADERSHIP DICE
 * ---------------
 *
 * augmentation/actor-owned metadata:
 *
 * Counter
 *
 * resolver:
 *
 * native or Frame Conn backing depending on actual persistence
 *
 * semantic spend remains explicitly declared rather than assumed from
 * CounterData presence.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Resource resolution never mutates resource state.
 *
 * INVARIANT 2
 * Native state reads occur through native_adapter.
 *
 * INVARIANT 3
 * Existing registry definitions do not need to be refactored to support
 * richer runtime resource semantics.
 *
 * INVARIANT 4
 * Runtime augmentation declarations override generic native discovery only
 * when they share stable resource identity.
 *
 * INVARIANT 5
 * Native resource presence does not imply native semantic consumption.
 *
 * INVARIANT 6
 * Limited, Loaded, and Core Energy default to native Flow consumption.
 *
 * INVARIANT 7
 * Native CounterData defaults to verification rather than guessed semantic
 * spending.
 *
 * INVARIANT 8
 * Frame Conn frequency resources remain distinct from native Limited.
 *
 * INVARIANT 9
 * No arbitrary effect-text parsing occurs here.
 *
 * INVARIANT 10
 * Resource reset scope is metadata only; lifecycle_service owns reset
 * execution.
 *
 * INVARIANT 11
 * Explicit declarations may supplement native discovery.
 *
 * INVARIANT 12
 * Existing ExecutionContext resource descriptors are preserved.
 *
 * INVARIANT 13
 * Resolver output is normalized ResourceDescriptor + ResourceSnapshot
 * data suitable for resource-transaction.js.
 *
 * INVARIANT 14
 * Supplemental persistence may be introduced later without changing the
 * ResourceDescriptor contract.
 */