/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/actor_owned_feature_registry/actor-owned-feature-discovery.js
 */
/**
 * @file
 * @path main/actor_owned_feature_registry/actor-owned-feature-discovery.js
 * @module actor-owned-feature-discovery
 * @layer actor-owned-feature-registry-discovery
 * @responsibility discover-native-actor-owned-feature-candidates-without-interpreting-runtime-semantics
 * @public-boundary false
 * @side-effects delegated-native-read-only-discovery
 *
 * @depends-on
 * - actor-owned-feature-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - runtime composition supplies discovery adapter backed by native_adapter/
 * - consumed by actor-owned-feature-normalizer.js
 * - consumed by actor-owned-feature-registry.js
 * - discovers mech/pilot actor ownership independently
 * - preserves native actor/item/action/profile/rank provenance
 * - existing Frame Conn registry remains separate
 * - future system_bridge/ consumes normalized results, not raw discovery
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - native_adapter/ remains native Lancer actor/item authority
 * - discovery answers "what does this actor own?"
 * - normalizer answers "what normalized descriptor is this?"
 * - registry answers "what normalized features are currently indexed?"
 * - system_bridge later adds missing runtime semantics
 *
 * THIS FILE OWNS:
 * - actor-owned discovery adapter
 * - actor identity discovery
 * - owned item enumeration
 * - feature candidate classification
 * - nested Talent rank discovery
 * - weapon profile discovery
 * - structured native action discovery
 * - item/native provenance capture
 * - raw discovery result aggregation
 *
 * THIS FILE DOES NOT OWN:
 * - normalized ActorOwnedFeatureDescriptor construction
 * - semantic prose interpretation
 * - runtime support classification beyond directly confirmed native signals
 * - feature execution
 * - resource/lifecycle/targeting inference
 * - registry persistence/indexing
 * - system bridge augmentation
 *
 * EDIT CONTRACT:
 * - no direct Foundry globals
 * - no direct Lancer system imports
 * - all native reads pass through injected adapter
 * - preserve unknown candidates rather than inventing meaning
 * - do not infer tabletop automation from descriptive text
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  ACTOR_OWNED_FEATURE_DISCOVERY_STATUS,
  ACTOR_OWNED_FEATURE_KIND,
  ACTOR_OWNED_FEATURE_OWNER_KIND,
  createActorOwnedFeatureDiscoveryResult
} from "./actor-owned-feature-contract.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const ACTOR_OWNED_FEATURE_DISCOVERY_MODULE_ID =
  "lancer-frame-conn.actor-owned-feature-discovery";
export const ACTOR_OWNED_FEATURE_DISCOVERY_MODULE_VERSION =
  1;
/* ============================================================
   DISCOVERY CANDIDATE KIND
   ============================================================ */
/**
 * @section discovery-candidate-kind
 *
 * Raw discovery shapes.
 *
 * These are not normalized runtime descriptors.
 */
export const ACTOR_OWNED_DISCOVERY_CANDIDATE_KIND =
  Object.freeze({
    FEATURE:
      "feature",
    ACTION:
      "action",
    PROFILE:
      "profile",
    TALENT_RANK:
      "talent-rank",
    TAG:
      "tag",
    RESOURCE:
      "resource",
    UNKNOWN:
      "unknown"
  });
/* ============================================================
   DISCOVERY ADAPTER
   ============================================================ */
/**
 * @section discovery-adapter
 *
 * Runtime composition should implement this adapter using native_adapter/.
 *
 * Recommended interface:
 *
 * {
 *   resolveActor(actorReference)
 *
 *   getActorKind(actor)
 *
 *   getLinkedPilot(actor)
 *
 *   getLinkedMech(actor)
 *
 *   getOwnedItems(actor)
 *
 *   getItemType(item)
 *
 *   getItemIdentity(item)
 *
 *   getItemLid(item)
 *
 *   getItemName(item)
 *
 *   getItemSystemData(item)
 *
 *   getItemActions(item)
 *
 *   getItemProfiles(item)
 *
 *   getTalentRanks(item)
 *
 *   getItemTags(item)
 *
 *   getItemEquippedState(item)
 *
 *   getItemMountedState(item)
 *
 *   inspectNativeExecution(item, action?, context?)
 * }
 *
 * Optional functions may be omitted.
 *
 * Missing data should become null/empty, not invented.
 */
let actorOwnedFeatureDiscoveryAdapter =
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
function normalizeArray(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value)
    ? value
    : [value];
}
function safeCall(
  fn,
  ...args
) {
  if (
    typeof fn !==
    "function"
  ) {
    return null;
  }
  try {
    return fn(
      ...args
    );
  } catch {
    return null;
  }
}
async function safeCallAsync(
  fn,
  ...args
) {
  if (
    typeof fn !==
    "function"
  ) {
    return null;
  }
  try {
    return await fn(
      ...args
    );
  } catch {
    return null;
  }
}
/* ============================================================
   ADAPTER CONFIGURATION
   ============================================================ */
export function setActorOwnedFeatureDiscoveryAdapter(
  adapter
) {
  if (adapter == null) {
    actorOwnedFeatureDiscoveryAdapter =
      null;
    return true;
  }
  if (!isObject(adapter)) {
    throw new TypeError(
      "Actor-owned feature discovery adapter must be object or null."
    );
  }
  if (
    typeof adapter.resolveActor !==
      "function"
  ) {
    throw new TypeError(
      "Actor-owned feature discovery adapter requires resolveActor()."
    );
  }
  if (
    typeof adapter.getOwnedItems !==
      "function"
  ) {
    throw new TypeError(
      "Actor-owned feature discovery adapter requires getOwnedItems()."
    );
  }
  actorOwnedFeatureDiscoveryAdapter =
    adapter;
  return true;
}
export function getActorOwnedFeatureDiscoveryAdapter() {
  return actorOwnedFeatureDiscoveryAdapter;
}
export function hasActorOwnedFeatureDiscoveryAdapter() {
  return Boolean(
    actorOwnedFeatureDiscoveryAdapter &&
    typeof actorOwnedFeatureDiscoveryAdapter.resolveActor ===
      "function" &&
    typeof actorOwnedFeatureDiscoveryAdapter.getOwnedItems ===
      "function"
  );
}
export function assertActorOwnedFeatureDiscoveryAdapter() {
  if (!hasActorOwnedFeatureDiscoveryAdapter()) {
    throw new Error(
      "Actor-owned feature discovery requires a configured discovery adapter."
    );
  }
  return actorOwnedFeatureDiscoveryAdapter;
}
/* ============================================================
   OWNER KIND NORMALIZATION
   ============================================================ */
export function normalizeActorOwnedFeatureOwnerKind(
  value
) {
  switch (
    String(
      value ??
      ""
    )
      .trim()
      .toLowerCase()
  ) {
    case "pilot":
      return ACTOR_OWNED_FEATURE_OWNER_KIND.PILOT;
    case "mech":
      return ACTOR_OWNED_FEATURE_OWNER_KIND.MECH;
    case "actor":
      return ACTOR_OWNED_FEATURE_OWNER_KIND.ACTOR;
    case "item":
      return ACTOR_OWNED_FEATURE_OWNER_KIND.ITEM;
    default:
      return ACTOR_OWNED_FEATURE_OWNER_KIND.UNKNOWN;
  }
}
/* ============================================================
   FEATURE KIND CLASSIFICATION
   ============================================================ */
/**
 * @section feature-kind-classification
 *
 * Classify from structured native item type.
 *
 * Do not inspect rule prose.
 */
export function classifyActorOwnedFeatureKind(
  itemType,
  {
    ownerKind =
      ACTOR_OWNED_FEATURE_OWNER_KIND.UNKNOWN,
    metadata = {}
  } = {}
) {
  const normalized =
    String(
      itemType ??
      ""
    )
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");
  switch (normalized) {
    case "frame-trait":
    case "trait":
      return ACTOR_OWNED_FEATURE_KIND.FRAME_TRAIT;
    case "core-system":
    case "coresystem":
      return ACTOR_OWNED_FEATURE_KIND.CORE_SYSTEM;
    case "talent":
      return ACTOR_OWNED_FEATURE_KIND.TALENT;
    case "core-bonus":
    case "corebonus":
      return ACTOR_OWNED_FEATURE_KIND.CORE_BONUS;
    case "mech-system":
    case "system":
      return ACTOR_OWNED_FEATURE_KIND.MECH_SYSTEM;
    case "mech-weapon":
      return ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON;
    case "pilot-weapon":
      return ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON;
    case "weapon-mod":
    case "weaponmod":
    case "mod":
      return ACTOR_OWNED_FEATURE_KIND.WEAPON_MOD;
    case "weapon-mount":
    case "mount":
      return ACTOR_OWNED_FEATURE_KIND.WEAPON_MOUNT;
    case "pilot-gear":
    case "pilot-armor":
    case "pilot-equipment":
    case "gear":
      return ACTOR_OWNED_FEATURE_KIND.PILOT_GEAR;
    case "nhp":
      return ACTOR_OWNED_FEATURE_KIND.NHP;
    case "license":
      return ACTOR_OWNED_FEATURE_KIND.LICENSE;
    case "weapon":
      return (
        ownerKind ===
        ACTOR_OWNED_FEATURE_OWNER_KIND.PILOT
      )
        ? ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON
        : ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON;
    default:
      return (
        metadata.featureKind ??
        ACTOR_OWNED_FEATURE_KIND.OTHER
      );
  }
}
/* ============================================================
   RAW FEATURE CANDIDATE
   ============================================================ */
/**
 * @section raw-feature-candidate
 *
 * Raw native ownership record.
 *
 * actor-owned-feature-normalizer.js converts this into the canonical
 * ActorOwnedFeatureDescriptor.
 */
export function createActorOwnedFeatureDiscoveryCandidate({
  kind =
    ACTOR_OWNED_DISCOVERY_CANDIDATE_KIND.FEATURE,
  featureKind =
    ACTOR_OWNED_FEATURE_KIND.OTHER,
  ownerKind =
    ACTOR_OWNED_FEATURE_OWNER_KIND.UNKNOWN,
  actor = null,
  pilot = null,
  mech = null,
  item = null,
  actorUuid = null,
  pilotUuid = null,
  mechUuid = null,
  itemUuid = null,
  itemId = null,
  itemLid = null,
  itemType = null,
  name = null,
  systemData = null,
  actions = [],
  profiles = [],
  talentRanks = [],
  tags = [],
  equipped = null,
  mounted = null,
  nativeExecution = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    kind,
    featureKind,
    ownerKind,
    actor,
    pilot,
    mech,
    item,
    actorUuid,
    pilotUuid,
    mechUuid,
    itemUuid,
    itemId,
    itemLid,
    itemType,
    name,
    systemData,
    actions:
      freezeArray(actions),
    profiles:
      freezeArray(profiles),
    talentRanks:
      freezeArray(talentRanks),
    tags:
      freezeArray(tags),
    equipped:
      equipped == null
        ? null
        : Boolean(equipped),
    mounted:
      mounted == null
        ? null
        : Boolean(mounted),
    nativeExecution,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   RAW ACTION CANDIDATE
   ============================================================ */
export function createActorOwnedActionDiscoveryCandidate({
  id = null,
  index = null,
  path = null,
  name = null,
  activation = null,
  action = null,
  nativeExecution = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    kind:
      ACTOR_OWNED_DISCOVERY_CANDIDATE_KIND.ACTION,
    id,
    index:
      finiteNumber(index)
        ? index
        : null,
    path,
    name,
    activation,
    action,
    nativeExecution,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   RAW PROFILE CANDIDATE
   ============================================================ */
export function createActorOwnedProfileDiscoveryCandidate({
  index = null,
  name = null,
  profile = null,
  actions = [],
  tags = [],
  nativeExecution = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    kind:
      ACTOR_OWNED_DISCOVERY_CANDIDATE_KIND.PROFILE,
    index:
      finiteNumber(index)
        ? index
        : null,
    name,
    profile,
    actions:
      freezeArray(actions),
    tags:
      freezeArray(tags),
    nativeExecution,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   RAW TALENT RANK CANDIDATE
   ============================================================ */
export function createActorOwnedTalentRankDiscoveryCandidate({
  rank,
  name = null,
  data = null,
  actions = [],
  nativeExecution = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    kind:
      ACTOR_OWNED_DISCOVERY_CANDIDATE_KIND.TALENT_RANK,
    rank:
      finiteNumber(rank)
        ? rank
        : null,
    name,
    data,
    actions:
      freezeArray(actions),
    nativeExecution,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   ACTOR RESOLUTION
   ============================================================ */
export async function resolveActorOwnedFeatureActor(
  actorReference
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  return adapter.resolveActor(
    actorReference
  );
}
/* ============================================================
   LINKED PILOT / MECH RESOLUTION
   ============================================================ */
/**
 * @section linked-pilot-mech-resolution
 *
 * Pilot and mech sheets are linked but separate.
 *
 * Discovery preserves that separation.
 */
export async function resolveActorOwnedFeatureActorFamily(
  actorReference
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const actor =
    await resolveActorOwnedFeatureActor(
      actorReference
    );
  if (!actor) {
    return Object.freeze({
      actor:
        null,
      actorKind:
        ACTOR_OWNED_FEATURE_OWNER_KIND.UNKNOWN,
      pilot:
        null,
      mech:
        null
    });
  }
  const actorKind =
    normalizeActorOwnedFeatureOwnerKind(
      await safeCallAsync(
        adapter.getActorKind,
        actor
      )
    );
  let pilot =
    null;
  let mech =
    null;
  if (
    actorKind ===
    ACTOR_OWNED_FEATURE_OWNER_KIND.PILOT
  ) {
    pilot =
      actor;
    mech =
      await safeCallAsync(
        adapter.getLinkedMech,
        actor
      );
  } else if (
    actorKind ===
    ACTOR_OWNED_FEATURE_OWNER_KIND.MECH
  ) {
    mech =
      actor;
    pilot =
      await safeCallAsync(
        adapter.getLinkedPilot,
        actor
      );
  } else {
    pilot =
      await safeCallAsync(
        adapter.getLinkedPilot,
        actor
      );
    mech =
      await safeCallAsync(
        adapter.getLinkedMech,
        actor
      );
  }
  return Object.freeze({
    actor,
    actorKind,
    pilot:
      pilot ??
      null,
    mech:
      mech ??
      null
  });
}
/* ============================================================
   ACTOR UUID RESOLUTION
   ============================================================ */
function getActorUuid(
  actor
) {
  return (
    actor?.uuid ??
    actor?.id ??
    null
  );
}
/* ============================================================
   ITEM IDENTITY DISCOVERY
   ============================================================ */
async function discoverItemIdentity(
  item
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const explicit =
    await safeCallAsync(
      adapter.getItemIdentity,
      item
    );
  return Object.freeze({
    uuid:
      explicit?.uuid ??
      item?.uuid ??
      null,
    id:
      explicit?.id ??
      item?.id ??
      null,
    lid:
      explicit?.lid ??
      await safeCallAsync(
        adapter.getItemLid,
        item
      ) ??
      null,
    type:
      explicit?.type ??
      await safeCallAsync(
        adapter.getItemType,
        item
      ) ??
      item?.type ??
      null,
    name:
      explicit?.name ??
      await safeCallAsync(
        adapter.getItemName,
        item
      ) ??
      item?.name ??
      null
  });
}
/* ============================================================
   STRUCTURED ACTION DISCOVERY
   ============================================================ */
/**
 * @section structured-action-discovery
 *
 * Structured native actions only.
 *
 * Descriptive paragraphs are not converted into actions here.
 */
async function discoverStructuredItemActions(
  item,
  {
    actor = null,
    actionPathPrefix = "actions"
  } = {}
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const rawActions =
    normalizeArray(
      await safeCallAsync(
        adapter.getItemActions,
        item
      )
    );
  const actions = [];
  for (
    let index = 0;
    index < rawActions.length;
    index += 1
  ) {
    const action =
      rawActions[index];
    const path =
      action?.path ??
      `${actionPathPrefix}.${index}`;
    const nativeExecution =
      await safeCallAsync(
        adapter.inspectNativeExecution,
        item,
        action,
        {
          actor,
          actionPath:
            path
        }
      );
    actions.push(
      createActorOwnedActionDiscoveryCandidate({
        id:
          action?.id ??
          action?.lid ??
          null,
        index,
        path,
        name:
          action?.name ??
          action?.title ??
          null,
        activation:
          action?.activation ??
          action?.activationType ??
          null,
        action,
        nativeExecution,
        metadata: {
          structured:
            true
        }
      })
    );
  }
  return Object.freeze(
    actions
  );
}
/* ============================================================
   WEAPON PROFILE DISCOVERY
   ============================================================ */
/**
 * @section weapon-profile-discovery
 *
 * Weapon profiles remain separate because Range/Threat/damage/tags/native
 * attack execution may differ by profile.
 */
async function discoverWeaponProfiles(
  item,
  {
    actor = null
  } = {}
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const rawProfiles =
    normalizeArray(
      await safeCallAsync(
        adapter.getItemProfiles,
        item
      )
    );
  const profiles = [];
  for (
    let index = 0;
    index < rawProfiles.length;
    index += 1
  ) {
    const profile =
      rawProfiles[index];
    const actions =
      normalizeArray(
        profile?.actions
      )
        .map(
          (
            action,
            actionIndex
          ) =>
            createActorOwnedActionDiscoveryCandidate({
              id:
                action?.id ??
                null,
              index:
                actionIndex,
              path:
                action?.path ??
                `profiles.${index}.actions.${actionIndex}`,
              name:
                action?.name ??
                null,
              activation:
                action?.activation ??
                action?.activationType ??
                null,
              action,
              nativeExecution:
                null,
              metadata: {
                profileIndex:
                  index
              }
            })
        );
    const nativeExecution =
      await safeCallAsync(
        adapter.inspectNativeExecution,
        item,
        null,
        {
          actor,
          profile,
          profileIndex:
            index
        }
      );
    profiles.push(
      createActorOwnedProfileDiscoveryCandidate({
        index,
        name:
          profile?.name ??
          profile?.title ??
          null,
        profile,
        actions,
        tags:
          profile?.tags ??
          [],
        nativeExecution,
        metadata: {
          itemProfile:
            true
        }
      })
    );
  }
  return Object.freeze(
    profiles
  );
}
/* ============================================================
   TALENT RANK DISCOVERY
   ============================================================ */
/**
 * @section talent-rank-discovery
 *
 * Talent ranks are preserved individually.
 *
 * Rank text remains semantic until structured/native runtime behavior is
 * independently confirmed.
 */
async function discoverTalentRanks(
  item,
  {
    actor = null
  } = {}
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const rawRanks =
    normalizeArray(
      await safeCallAsync(
        adapter.getTalentRanks,
        item
      )
    );
  const ranks = [];
  for (
    let index = 0;
    index < rawRanks.length;
    index += 1
  ) {
    const rank =
      rawRanks[index];
    const rankNumber =
      finiteNumber(
        rank?.rank
      )
        ? rank.rank
        : index + 1;
    const rankActions =
      normalizeArray(
        rank?.actions
      )
        .map(
          (
            action,
            actionIndex
          ) =>
            createActorOwnedActionDiscoveryCandidate({
              id:
                action?.id ??
                null,
              index:
                actionIndex,
              path:
                action?.path ??
                `ranks.${index}.actions.${actionIndex}`,
              name:
                action?.name ??
                null,
              activation:
                action?.activation ??
                action?.activationType ??
                null,
              action,
              nativeExecution:
                null,
              metadata: {
                talentRank:
                  rankNumber
              }
            })
        );
    const nativeExecution =
      await safeCallAsync(
        adapter.inspectNativeExecution,
        item,
        null,
        {
          actor,
          rank,
          rankNumber
        }
      );
    ranks.push(
      createActorOwnedTalentRankDiscoveryCandidate({
        rank:
          rankNumber,
        name:
          rank?.name ??
          rank?.title ??
          null,
        data:
          rank,
        actions:
          rankActions,
        nativeExecution,
        metadata: {
          rankIndex:
            index
        }
      })
    );
  }
  return Object.freeze(
    ranks
  );
}
/* ============================================================
   ITEM TAG DISCOVERY
   ============================================================ */
async function discoverItemTags(
  item
) {
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  return freezeArray(
    normalizeArray(
      await safeCallAsync(
        adapter.getItemTags,
        item
      )
    )
  );
}
/* ============================================================
   FEATURE CANDIDATE DISCOVERY
   ============================================================ */
/**
 * @section feature-candidate-discovery
 */
export async function discoverActorOwnedFeatureCandidate(
  actor,
  item,
  {
    ownerKind =
      ACTOR_OWNED_FEATURE_OWNER_KIND.UNKNOWN,
    pilot = null,
    mech = null
  } = {}
) {
  if (!actor) {
    throw new TypeError(
      "discoverActorOwnedFeatureCandidate requires actor."
    );
  }
  if (!item) {
    throw new TypeError(
      "discoverActorOwnedFeatureCandidate requires item."
    );
  }
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const identity =
    await discoverItemIdentity(
      item
    );
  const featureKind =
    classifyActorOwnedFeatureKind(
      identity.type,
      {
        ownerKind
      }
    );
  const systemData =
    await safeCallAsync(
      adapter.getItemSystemData,
      item
    );
  const actions =
    await discoverStructuredItemActions(
      item,
      {
        actor
      }
    );
  const profiles =
    (
      featureKind ===
        ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON ||
      featureKind ===
        ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON
    )
      ? await discoverWeaponProfiles(
          item,
          {
            actor
          }
        )
      : Object.freeze([]);
  const talentRanks =
    featureKind ===
    ACTOR_OWNED_FEATURE_KIND.TALENT
      ? await discoverTalentRanks(
          item,
          {
            actor
          }
        )
      : Object.freeze([]);
  const tags =
    await discoverItemTags(
      item
    );
  const nativeExecution =
    await safeCallAsync(
      adapter.inspectNativeExecution,
      item,
      null,
      {
        actor
      }
    );
  const equipped =
    await safeCallAsync(
      adapter.getItemEquippedState,
      item
    );
  const mounted =
    await safeCallAsync(
      adapter.getItemMountedState,
      item
    );
  return createActorOwnedFeatureDiscoveryCandidate({
    featureKind,
    ownerKind,
    actor,
    pilot,
    mech,
    item,
    actorUuid:
      getActorUuid(
        actor
      ),
    pilotUuid:
      getActorUuid(
        pilot
      ),
    mechUuid:
      getActorUuid(
        mech
      ),
    itemUuid:
      identity.uuid,
    itemId:
      identity.id,
    itemLid:
      identity.lid,
    itemType:
      identity.type,
    name:
      identity.name,
    systemData,
    actions,
    profiles,
    talentRanks,
    tags,
    equipped,
    mounted,
    nativeExecution,
    metadata: {
      discoveredBy:
        ACTOR_OWNED_FEATURE_DISCOVERY_MODULE_ID
    }
  });
}
/* ============================================================
   ACTOR ITEM ENUMERATION
   ============================================================ */
export async function discoverActorOwnedItems(
  actor
) {
  if (!actor) {
    return Object.freeze([]);
  }
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const items =
    await adapter.getOwnedItems(
      actor
    );
  return freezeArray(
    normalizeArray(
      items
    )
  );
}
/* ============================================================
   SINGLE ACTOR FEATURE DISCOVERY
   ============================================================ */
/**
 * @section single-actor-feature-discovery
 */
export async function discoverFeaturesOwnedByActor(
  actor,
  {
    ownerKind = null,
    pilot = null,
    mech = null,
    predicate = null
  } = {}
) {
  if (!actor) {
    return Object.freeze([]);
  }
  const adapter =
    assertActorOwnedFeatureDiscoveryAdapter();
  const resolvedOwnerKind =
    ownerKind ??
    normalizeActorOwnedFeatureOwnerKind(
      await safeCallAsync(
        adapter.getActorKind,
        actor
      )
    );
  const items =
    await discoverActorOwnedItems(
      actor
    );
  const features = [];
  for (
    const item of
      items
  ) {
    if (
      typeof predicate ===
        "function" &&
      !await predicate(
        item,
        actor
      )
    ) {
      continue;
    }
    try {
      const candidate =
        await discoverActorOwnedFeatureCandidate(
          actor,
          item,
          {
            ownerKind:
              resolvedOwnerKind,
            pilot,
            mech
          }
        );
      if (candidate) {
        features.push(
          candidate
        );
      }
    } catch {
      /*
       * Individual malformed/unsupported items should not abort actor-wide
       * discovery. Aggregate failure information is handled at higher level.
       */
    }
  }
  return Object.freeze(
    features
  );
}
/* ============================================================
   PILOT + MECH FEATURE DISCOVERY
   ============================================================ */
/**
 * @section pilot-mech-feature-discovery
 *
 * Actor-owned registry may need both halves of the linked character:
 *
 * pilot:
 * Talents
 * pilot weapons/gear
 *
 * mech:
 * frame traits
 * core system
 * core bonuses as represented
 * mounted systems
 * mech weapons
 * NHPs
 *
 * Discovery keeps source actor identity on every candidate.
 */
export async function discoverActorOwnedFeatureFamily(
  actorReference,
  options = {}
) {
  const family =
    await resolveActorOwnedFeatureActorFamily(
      actorReference
    );
  if (!family.actor) {
    return createActorOwnedFeatureDiscoveryResult({
      status:
        ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED,
      actorUuid:
        null,
      features:
        [],
      issues: [
        Object.freeze({
          code:
            "actor-unavailable",
          message:
            "Actor could not be resolved."
        })
      ]
    });
  }
  const features = [];
  const issues = [];
  /* ----------------------------------------------------------
     PILOT
     ---------------------------------------------------------- */
  if (family.pilot) {
    try {
      features.push(
        ...await discoverFeaturesOwnedByActor(
          family.pilot,
          {
            ...options,
            ownerKind:
              ACTOR_OWNED_FEATURE_OWNER_KIND.PILOT,
            pilot:
              family.pilot,
            mech:
              family.mech
          }
        )
      );
    } catch (error) {
      issues.push(
        Object.freeze({
          code:
            "pilot-feature-discovery-failed",
          error
        })
      );
    }
  }
  /* ----------------------------------------------------------
     MECH
     ---------------------------------------------------------- */
  if (
    family.mech &&
    family.mech !==
      family.pilot
  ) {
    try {
      features.push(
        ...await discoverFeaturesOwnedByActor(
          family.mech,
          {
            ...options,
            ownerKind:
              ACTOR_OWNED_FEATURE_OWNER_KIND.MECH,
            pilot:
              family.pilot,
            mech:
              family.mech
          }
        )
      );
    } catch (error) {
      issues.push(
        Object.freeze({
          code:
            "mech-feature-discovery-failed",
          error
        })
      );
    }
  }
  /* ----------------------------------------------------------
     UNLINKED / UNKNOWN ACTOR
     ---------------------------------------------------------- */
  if (
    !family.pilot &&
    !family.mech
  ) {
    try {
      features.push(
        ...await discoverFeaturesOwnedByActor(
          family.actor,
          {
            ...options,
            ownerKind:
              family.actorKind
          }
        )
      );
    } catch (error) {
      issues.push(
        Object.freeze({
          code:
            "actor-feature-discovery-failed",
          error
        })
      );
    }
  }
  let status =
    ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.DISCOVERED;
  if (
    issues.length > 0 &&
    features.length > 0
  ) {
    status =
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.PARTIAL;
  } else if (
    issues.length > 0 &&
    features.length === 0
  ) {
    status =
      ACTOR_OWNED_FEATURE_DISCOVERY_STATUS.FAILED;
  }
  return createActorOwnedFeatureDiscoveryResult({
    status,
    actorUuid:
      getActorUuid(
        family.actor
      ),
    features,
    issues,
    metadata: {
      actorKind:
        family.actorKind,
      pilotUuid:
        getActorUuid(
          family.pilot
        ),
      mechUuid:
        getActorUuid(
          family.mech
        )
    }
  });
}
/* ============================================================
   FEATURE KIND FILTERING
   ============================================================ */
export function filterDiscoveredFeaturesByKind(
  discovery,
  kinds
) {
  const allowed =
    new Set(
      normalizeArray(
        kinds
      )
    );
  return Object.freeze(
    (
      discovery?.features ??
      []
    ).filter(
      feature =>
        allowed.has(
          feature.featureKind
        )
    )
  );
}
/* ============================================================
   WEAPON DISCOVERY
   ============================================================ */
export function getDiscoveredWeapons(
  discovery
) {
  return filterDiscoveredFeaturesByKind(
    discovery,
    [
      ACTOR_OWNED_FEATURE_KIND.MECH_WEAPON,
      ACTOR_OWNED_FEATURE_KIND.PILOT_WEAPON
    ]
  );
}
/* ============================================================
   SYSTEM DISCOVERY
   ============================================================ */
export function getDiscoveredSystems(
  discovery
) {
  return filterDiscoveredFeaturesByKind(
    discovery,
    [
      ACTOR_OWNED_FEATURE_KIND.MECH_SYSTEM,
      ACTOR_OWNED_FEATURE_KIND.CORE_SYSTEM
    ]
  );
}
/* ============================================================
   TALENT DISCOVERY
   ============================================================ */
export function getDiscoveredTalents(
  discovery
) {
  return filterDiscoveredFeaturesByKind(
    discovery,
    ACTOR_OWNED_FEATURE_KIND.TALENT
  );
}
/* ============================================================
   TRAIT / CORE BONUS DISCOVERY
   ============================================================ */
export function getDiscoveredPassiveFeatureCandidates(
  discovery
) {
  return filterDiscoveredFeaturesByKind(
    discovery,
    [
      ACTOR_OWNED_FEATURE_KIND.FRAME_TRAIT,
      ACTOR_OWNED_FEATURE_KIND.CORE_BONUS
    ]
  );
}
/* ============================================================
   NHP DISCOVERY
   ============================================================ */
export function getDiscoveredNhps(
  discovery
) {
  return filterDiscoveredFeaturesByKind(
    discovery,
    ACTOR_OWNED_FEATURE_KIND.NHP
  );
}
/* ============================================================
   STRUCTURED ACTION FLATTENING
   ============================================================ */
/**
 * @section structured-action-flattening
 *
 * Flatten discovered structured actions while preserving their parent.
 */
export function flattenDiscoveredActorOwnedActions(
  discovery
) {
  const results = [];
  for (
    const feature of
      discovery?.features ??
      []
  ) {
    for (
      const action of
        feature.actions ??
        []
    ) {
      results.push(
        Object.freeze({
          feature,
          action,
          profile:
            null,
          talentRank:
            null
        })
      );
    }
    for (
      const profile of
        feature.profiles ??
        []
    ) {
      for (
        const action of
          profile.actions ??
          []
      ) {
        results.push(
          Object.freeze({
            feature,
            action,
            profile,
            talentRank:
              null
          })
        );
      }
    }
    for (
      const talentRank of
        feature.talentRanks ??
        []
    ) {
      for (
        const action of
          talentRank.actions ??
          []
      ) {
        results.push(
          Object.freeze({
            feature,
            action,
            profile:
              null,
            talentRank
          })
        );
      }
    }
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   NATIVE EXECUTION SIGNAL
   ============================================================ */
/**
 * @section native-execution-signal
 *
 * Discovery preserves direct native execution inspection results but does
 * not convert them into final runtime status.
 *
 * Normalizer decides:
 *
 * EXECUTABLE_NATIVE
 * PARTIAL_NATIVE
 * SEMANTIC_ONLY
 * UNKNOWN
 *
 * based only on confirmed discovery data.
 */
export function hasDiscoveredNativeExecution(
  candidate
) {
  if (
    candidate
      ?.nativeExecution
      ?.executable ===
    true
  ) {
    return true;
  }
  if (
    candidate
      ?.actions
      ?.some(
        action =>
          action
            ?.nativeExecution
            ?.executable ===
          true
      )
  ) {
    return true;
  }
  if (
    candidate
      ?.profiles
      ?.some(
        profile =>
          profile
            ?.nativeExecution
            ?.executable ===
            true ||
          profile
            ?.actions
            ?.some(
              action =>
                action
                  ?.nativeExecution
                  ?.executable ===
                true
            )
      )
  ) {
    return true;
  }
  if (
    candidate
      ?.talentRanks
      ?.some(
        rank =>
          rank
            ?.nativeExecution
            ?.executable ===
            true ||
          rank
            ?.actions
            ?.some(
              action =>
                action
                  ?.nativeExecution
                  ?.executable ===
                true
            )
      )
  ) {
    return true;
  }
  return false;
}
/* ============================================================
   DISCOVERY IDENTITY KEY
   ============================================================ */
/**
 * @section discovery-identity-key
 *
 * Used by normalizer/registry to produce deterministic feature keys.
 */
export function getActorOwnedDiscoveryIdentityKey(
  candidate
) {
  if (!candidate) {
    return null;
  }
  return (
    candidate.itemUuid ??
    (
      candidate.actorUuid &&
      candidate.itemId
        ? `${candidate.actorUuid}:${candidate.itemId}`
        : null
    ) ??
    (
      candidate.itemLid
        ? `${candidate.actorUuid ?? "unknown"}:${candidate.itemLid}`
        : null
    )
  );
}
/* ============================================================
   ITEM TYPE / PROSE RULE
   ============================================================ */
/**
 * @section item-type-prose-rule
 *
 * Discovery uses structured native item type/data.
 *
 * It must not parse phrases such as:
 *
 * "once per round"
 * "when you hit"
 * "until the end of their next turn"
 * "target a character within Sensors"
 *
 * from descriptive text and turn them into runtime semantics.
 *
 * Those semantics enter later through:
 *
 * structured native data
 * or
 * explicit system_bridge augmentation.
 */
/* ============================================================
   WEAPON DISCOVERY RULE
   ============================================================ */
/**
 * @section weapon-discovery-rule
 *
 * Preserve independently:
 *
 * weapon item identity
 * profile identity
 * native attack entry point
 * native structured actions
 * native tags
 * native Range/Threat/profile data inside raw profile/system data
 *
 * Discovery does not assume weapon special prose is implemented.
 *
 * actor-owned-feature-normalizer.js may therefore classify:
 *
 * attack action = EXECUTABLE_NATIVE
 * overall weapon = PARTIAL_NATIVE
 */
/* ============================================================
   WEAPON MOUNT RULE
   ============================================================ */
/**
 * @section weapon-mount-rule
 *
 * Weapon mounts may exist as owned/native structure but remain distinct from
 * weapons.
 *
 * If adapter exposes mount records as actor-owned items/candidates:
 *
 * classify as WEAPON_MOUNT.
 *
 * Do not merge mount identity into weapon identity during discovery.
 */
/* ============================================================
   MOUNTED SYSTEM DISCOVERY RULE
   ============================================================ */
/**
 * @section mounted-system-discovery-rule
 *
 * Preserve:
 *
 * item identity
 * structured native actions
 * tags
 * Limited/native resource fields inside systemData
 * equipped/mounted state
 * native execution inspection
 *
 * Do not assume descriptive special/passive effect text has runtime
 * implementation.
 */
/* ============================================================
   TALENT DISCOVERY RULE
   ============================================================ */
/**
 * @section talent-discovery-rule
 *
 * Preserve:
 *
 * Talent item identity
 * current rank/native rank data
 * each rank separately
 * structured rank actions if present
 * descriptive rank data
 *
 * Do not infer semantic-event triggers from rank prose.
 */
/* ============================================================
   FRAME TRAIT / CORE BONUS RULE
   ============================================================ */
/**
 * @section frame-trait-core-bonus-rule
 *
 * Discovery records the owned/native representation.
 *
 * If the system exposes only semantic text:
 *
 * candidate still exists.
 *
 * Lack of native execution is meaningful evidence for later
 * SEMANTIC_ONLY/UNKNOWN classification.
 */
/* ============================================================
   PILOT / MECH SEPARATION RULE
   ============================================================ */
/**
 * @section pilot-mech-separation-rule
 *
 * Pilot and mech are linked but separate actors.
 *
 * Discovery preserves:
 *
 * ownerKind
 * actorUuid
 * pilotUuid
 * mechUuid
 *
 * Example:
 *
 * Pilot Talent:
 * ownerKind = PILOT
 *
 * Mech Weapon:
 * ownerKind = MECH
 *
 * system_bridge may later compose both into one active Frame Conn runtime
 * view for the linked character.
 */
/* ============================================================
   NHP DISCOVERY RULE
   ============================================================ */
/**
 * @section nhp-discovery-rule
 *
 * Discovery may establish:
 *
 * actor owns an NHP
 * NHP item identity
 * any structured activation/native fields
 *
 * It does not infer:
 *
 * autopilot
 * cascade timing
 * cascade behavior
 *
 * from rulebook prose.
 */
/* ============================================================
   RESOURCE DISCOVERY RULE
   ============================================================ */
/**
 * @section resource-discovery-rule
 *
 * Raw systemData/tags may contain native:
 *
 * Limited
 * Loaded
 * charges
 * counters
 *
 * Discovery preserves those raw structured fields.
 *
 * actor-owned-feature-normalizer.js decides what confirmed normalized
 * resource declarations can safely be constructed.
 *
 * resource_service remains resource authority.
 */
/* ============================================================
   TARGETING DISCOVERY RULE
   ============================================================ */
/**
 * @section targeting-discovery-rule
 *
 * Raw structured data may include:
 *
 * Range
 * Threat
 * Sensors
 * area shape
 *
 * Discovery preserves it.
 *
 * targeting_spatial_service remains spatial authority.
 *
 * Normalizer/bridge later construct TargetingRequirement.
 */
/* ============================================================
   LIFECYCLE DISCOVERY RULE
   ============================================================ */
/**
 * @section lifecycle-discovery-rule
 *
 * Discovery does not parse duration prose.
 *
 * Structured native reset/duration fields may be preserved raw.
 *
 * lifecycle descriptors are constructed later only from confirmed
 * structured data or explicit augmentation.
 */
/* ============================================================
   EXISTING FRAME CONN REGISTRY BOUNDARY
   ============================================================ */
/**
 * @section existing-frame-conn-registry-boundary
 *
 * Existing Frame Conn registry is NOT queried here.
 *
 * Discovery source:
 *
 * actor/native ownership only.
 *
 * Later:
 *
 * existing Frame Conn registry
 *            +
 * actor_owned_feature_registry
 *            +
 * augmentation
 *            ↓
 * system_bridge
 */
/* ============================================================
   NATIVE ADAPTER BOUNDARY
   ============================================================ */
/**
 * @section native-adapter-boundary
 *
 * Runtime composition should build discovery adapter from the confirmed
 * native_adapter public boundary.
 *
 * Do not independently access:
 *
 * actor.items
 * item.system
 * linked pilot/mech implementation details
 * native execution methods
 *
 * in this module.
 *
 * Those paths belong in native_adapter/discovery adapter composition.
 */
/* ============================================================
   NORMALIZER BOUNDARY
   ============================================================ */
/**
 * @section normalizer-boundary
 *
 * Discovery:
 *
 * raw native truth
 *
 * Normalizer:
 *
 * normalized actor-owned contract
 *
 * Examples:
 *
 * raw weapon profile
 * → WeaponProfile descriptor/action
 *
 * raw Talent rank
 * → TalentRank feature/action
 *
 * raw native execution inspection
 * → NativeExecution descriptor/runtime status
 *
 * Keep these responsibilities separate.
 */
/* ============================================================
   SYSTEM BRIDGE BOUNDARY
   ============================================================ */
/**
 * @section system-bridge-boundary
 *
 * system_bridge must not consume native actors/items directly.
 *
 * Intended:
 *
 * native_adapter
 *      ↓
 * discovery
 *      ↓
 * normalizer
 *      ↓
 * actor_owned_feature_registry
 *      ↓
 * system_bridge
 *
 * This preserves one normalized ownership boundary.
 */
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
export function getActorOwnedFeatureDiscoveryDiagnostics() {
  return Object.freeze({
    id:
      ACTOR_OWNED_FEATURE_DISCOVERY_MODULE_ID,
    version:
      ACTOR_OWNED_FEATURE_DISCOVERY_MODULE_VERSION,
    adapterConfigured:
      hasActorOwnedFeatureDiscoveryAdapter(),
    adapterCapabilities:
      Object.freeze({
        resolveActor:
          typeof actorOwnedFeatureDiscoveryAdapter?.resolveActor ===
          "function",
        getActorKind:
          typeof actorOwnedFeatureDiscoveryAdapter?.getActorKind ===
          "function",
        getLinkedPilot:
          typeof actorOwnedFeatureDiscoveryAdapter?.getLinkedPilot ===
          "function",
        getLinkedMech:
          typeof actorOwnedFeatureDiscoveryAdapter?.getLinkedMech ===
          "function",
        getOwnedItems:
          typeof actorOwnedFeatureDiscoveryAdapter?.getOwnedItems ===
          "function",
        getItemType:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemType ===
          "function",
        getItemIdentity:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemIdentity ===
          "function",
        getItemLid:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemLid ===
          "function",
        getItemSystemData:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemSystemData ===
          "function",
        getItemActions:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemActions ===
          "function",
        getItemProfiles:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemProfiles ===
          "function",
        getTalentRanks:
          typeof actorOwnedFeatureDiscoveryAdapter?.getTalentRanks ===
          "function",
        getItemTags:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemTags ===
          "function",
        getItemEquippedState:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemEquippedState ===
          "function",
        getItemMountedState:
          typeof actorOwnedFeatureDiscoveryAdapter?.getItemMountedState ===
          "function",
        inspectNativeExecution:
          typeof actorOwnedFeatureDiscoveryAdapter?.inspectNativeExecution ===
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
 * native_adapter/
 * ---------------
 *
 * Supplies authoritative native actor/item discovery through injected
 * adapter.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Not consumed here.
 *
 * Discovery occurs before execution context construction.
 *
 *
 * resource_service/
 * -----------------
 *
 * Does not participate in discovery.
 *
 * Raw structured resource fields are preserved for normalization.
 *
 *
 * action_economy/
 * ---------------
 *
 * Does not participate in discovery.
 *
 * Raw structured activation values are preserved.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Does not participate in discovery.
 *
 * Event trigger declarations are produced later by normalization/bridge.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Does not participate in discovery.
 *
 * Lifecycle semantics are produced later from structured/augmented data.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Does not participate in discovery.
 *
 * Range/Threat/Sensors data is preserved for normalization.
 *
 *
 * existing Frame Conn registry
 * ----------------------------
 *
 * Remains separate.
 *
 *
 * system_bridge/
 * --------------
 *
 * Consumes normalized registry output later, never raw native discovery.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * actor-owned-feature-discovery.js answers what the actor owns.
 *
 * INVARIANT 2
 * All native actor/item access passes through the injected discovery
 * adapter.
 *
 * INVARIANT 3
 * Pilot and mech ownership remain distinct.
 *
 * INVARIANT 4
 * Native item UUID/ID/LID/type provenance is preserved.
 *
 * INVARIANT 5
 * Structured actions are preserved separately from semantic prose.
 *
 * INVARIANT 6
 * Weapon profiles are preserved independently.
 *
 * INVARIANT 7
 * Talent ranks are preserved independently.
 *
 * INVARIANT 8
 * Weapon mounts remain distinct from weapons.
 *
 * INVARIANT 9
 * Discovery does not infer triggers from descriptive text.
 *
 * INVARIANT 10
 * Discovery does not infer lifecycle from descriptive text.
 *
 * INVARIANT 11
 * Discovery does not infer resources from descriptive text.
 *
 * INVARIANT 12
 * Discovery does not infer target legality from descriptive text.
 *
 * INVARIANT 13
 * Native execution inspection is preserved as evidence, not treated as
 * final runtime classification.
 *
 * INVARIANT 14
 * Individual unsupported/malformed items do not prevent actor-wide
 * discovery.
 *
 * INVARIANT 15
 * Existing Frame Conn registry is not merged during discovery.
 *
 * INVARIANT 16
 * system_bridge consumes normalized registry data later, not raw native
 * actor/items.
 */