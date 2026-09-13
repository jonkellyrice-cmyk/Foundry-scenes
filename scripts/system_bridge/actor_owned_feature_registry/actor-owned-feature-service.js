/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/actor_owned_feature_registry/actor-owned-feature-service.js
 */

/**
 * @file
 * @path main/actor_owned_feature_registry/actor-owned-feature-service.js
 * @module actor-owned-feature-service
 * @layer actor-owned-feature-registry-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-actor-owned-feature-api
 * @public-boundary true
 * @side-effects delegated-through-discovery-and-registry-refresh
 *
 * @depends-on
 * - actor-owned-feature-contract
 * - actor-owned-feature-discovery
 * - actor-owned-feature-normalizer
 * - actor-owned-feature-registry
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - native_adapter/ supplies discovery adapter implementation
 * - future system_bridge/ consumes normalized registry snapshots
 * - existing Frame Conn registry remains separate until bridge composition
 * - future runtime composition refreshes actor-owned state on relevant actor
 *   changes
 * - pilot/mech linked ownership remains preserved
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - contract owns normalized shapes/vocabulary
 * - discovery owns native actor/item enumeration
 * - normalizer owns safe runtime normalization
 * - registry owns indexed current actor-owned state
 * - system_bridge owns supplementation/composition
 *
 * THIS FILE OWNS:
 * - public actor_owned_feature_registry façade
 * - stable namespace composition
 * - discovery adapter configuration façade
 * - discovery façade
 * - normalization façade
 * - registry refresh/query façade
 * - bridge-source façade
 * - diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - native actor/item access implementation
 * - feature execution
 * - semantic-event trigger installation
 * - resource mutation
 * - lifecycle execution
 * - targeting validation
 * - system bridge composition
 *
 * EDIT CONTRACT:
 * - keep façade thin
 * - do not merge existing Frame Conn registry here
 * - do not add feature-specific execution behavior here
 * - preserve discovery → normalization → registry separation
 */

/* ============================================================
   MODULE IMPORTS
   ============================================================ */

import * as contract from "./actor-owned-feature-contract.js";
import * as discovery from "./actor-owned-feature-discovery.js";
import * as normalizer from "./actor-owned-feature-normalizer.js";
import * as registry from "./actor-owned-feature-registry.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const ACTOR_OWNED_FEATURE_SERVICE_MODULE_ID =
  "lancer-frame-conn.actor-owned-feature-service";

export const ACTOR_OWNED_FEATURE_SERVICE_MODULE_VERSION =
  1;

/* ============================================================
   PUBLIC NAMESPACE
   ============================================================ */

export const actorOwnedFeatureService =
  Object.freeze({
    id:
      ACTOR_OWNED_FEATURE_SERVICE_MODULE_ID,

    version:
      ACTOR_OWNED_FEATURE_SERVICE_MODULE_VERSION,

    contract,

    discovery,

    normalizer,

    registry
  });

/* ============================================================
   CONTRACT CONSTRUCTION
   ============================================================ */

export function createActorOwnedFeatureIdentity(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureIdentity(
      options
    );
}

export function createActorOwnedFeatureNativeReference(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureNativeReference(
      options
    );
}

export function createActorOwnedFeatureSemanticText(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureSemanticText(
      options
    );
}

export function createActorOwnedFeatureCapability(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureCapability(
      options
    );
}

export function createActorOwnedFeatureTrigger(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureTrigger(
      options
    );
}

export function createActorOwnedFeatureNativeExecution(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureNativeExecution(
      options
    );
}

export function createActorOwnedFeatureAction(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureAction(
      options
    );
}

export function createActorOwnedFeatureDescriptor(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureDescriptor(
      options
    );
}

export function createActorOwnedFeatureDiscoveryResult(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureDiscoveryResult(
      options
    );
}

export function createActorOwnedFeatureNormalizationResult(
  options
) {
  return actorOwnedFeatureService
    .contract
    .createActorOwnedFeatureNormalizationResult(
      options
    );
}

/* ============================================================
   CONTRACT PREDICATES
   ============================================================ */

export function isActorOwnedFeatureNativeExecutable(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .isActorOwnedFeatureNativeExecutable(
      descriptor
    );
}

export function doesActorOwnedFeatureRequireAugmentation(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .doesActorOwnedFeatureRequireAugmentation(
      descriptor
    );
}

export function isActorOwnedFeatureSemanticOnly(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .isActorOwnedFeatureSemanticOnly(
      descriptor
    );
}

export function isActorOwnedWeaponFeature(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .isActorOwnedWeaponFeature(
      descriptor
    );
}

export function isActorOwnedSystemFeature(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .isActorOwnedSystemFeature(
      descriptor
    );
}

export function isActorOwnedPassiveFeature(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .isActorOwnedPassiveFeature(
      descriptor
    );
}

export function isActorOwnedTriggeredFeature(
  descriptor
) {
  return actorOwnedFeatureService
    .contract
    .isActorOwnedTriggeredFeature(
      descriptor
    );
}

/* ============================================================
   ACTION ACCESS
   ============================================================ */

export function getActorOwnedFeatureAction(
  descriptor,
  actionId
) {
  return actorOwnedFeatureService
    .contract
    .getActorOwnedFeatureAction(
      descriptor,
      actionId
    );
}

export function flattenActorOwnedFeatureActions(
  descriptors
) {
  return actorOwnedFeatureService
    .contract
    .flattenActorOwnedFeatureActions(
      descriptors
    );
}

/* ============================================================
   DISCOVERY ADAPTER CONFIGURATION
   ============================================================ */

export function setActorOwnedFeatureDiscoveryAdapter(
  adapter
) {
  return actorOwnedFeatureService
    .discovery
    .setActorOwnedFeatureDiscoveryAdapter(
      adapter
    );
}

export function getActorOwnedFeatureDiscoveryAdapter() {
  return actorOwnedFeatureService
    .discovery
    .getActorOwnedFeatureDiscoveryAdapter();
}

export function hasActorOwnedFeatureDiscoveryAdapter() {
  return actorOwnedFeatureService
    .discovery
    .hasActorOwnedFeatureDiscoveryAdapter();
}

export function assertActorOwnedFeatureDiscoveryAdapter() {
  return actorOwnedFeatureService
    .discovery
    .assertActorOwnedFeatureDiscoveryAdapter();
}

/* ============================================================
   DISCOVERY HELPERS
   ============================================================ */

export function normalizeActorOwnedFeatureOwnerKind(
  value
) {
  return actorOwnedFeatureService
    .discovery
    .normalizeActorOwnedFeatureOwnerKind(
      value
    );
}

export function classifyActorOwnedFeatureKind(
  itemType,
  options
) {
  return actorOwnedFeatureService
    .discovery
    .classifyActorOwnedFeatureKind(
      itemType,
      options
    );
}

export function createActorOwnedFeatureDiscoveryCandidate(
  options
) {
  return actorOwnedFeatureService
    .discovery
    .createActorOwnedFeatureDiscoveryCandidate(
      options
    );
}

export function createActorOwnedActionDiscoveryCandidate(
  options
) {
  return actorOwnedFeatureService
    .discovery
    .createActorOwnedActionDiscoveryCandidate(
      options
    );
}

export function createActorOwnedProfileDiscoveryCandidate(
  options
) {
  return actorOwnedFeatureService
    .discovery
    .createActorOwnedProfileDiscoveryCandidate(
      options
    );
}

export function createActorOwnedTalentRankDiscoveryCandidate(
  options
) {
  return actorOwnedFeatureService
    .discovery
    .createActorOwnedTalentRankDiscoveryCandidate(
      options
    );
}

/* ============================================================
   ACTOR / FAMILY DISCOVERY
   ============================================================ */

export async function resolveActorOwnedFeatureActor(
  actorReference
) {
  return actorOwnedFeatureService
    .discovery
    .resolveActorOwnedFeatureActor(
      actorReference
    );
}

export async function resolveActorOwnedFeatureActorFamily(
  actorReference
) {
  return actorOwnedFeatureService
    .discovery
    .resolveActorOwnedFeatureActorFamily(
      actorReference
    );
}

export async function discoverActorOwnedItems(
  actor
) {
  return actorOwnedFeatureService
    .discovery
    .discoverActorOwnedItems(
      actor
    );
}

export async function discoverActorOwnedFeatureCandidate(
  actor,
  item,
  options
) {
  return actorOwnedFeatureService
    .discovery
    .discoverActorOwnedFeatureCandidate(
      actor,
      item,
      options
    );
}

export async function discoverFeaturesOwnedByActor(
  actor,
  options
) {
  return actorOwnedFeatureService
    .discovery
    .discoverFeaturesOwnedByActor(
      actor,
      options
    );
}

export async function discoverActorOwnedFeatureFamily(
  actorReference,
  options
) {
  return actorOwnedFeatureService
    .discovery
    .discoverActorOwnedFeatureFamily(
      actorReference,
      options
    );
}

/* ============================================================
   DISCOVERY FILTERS
   ============================================================ */

export function filterDiscoveredFeaturesByKind(
  discoveryResult,
  kinds
) {
  return actorOwnedFeatureService
    .discovery
    .filterDiscoveredFeaturesByKind(
      discoveryResult,
      kinds
    );
}

export function getDiscoveredWeapons(
  discoveryResult
) {
  return actorOwnedFeatureService
    .discovery
    .getDiscoveredWeapons(
      discoveryResult
    );
}

export function getDiscoveredSystems(
  discoveryResult
) {
  return actorOwnedFeatureService
    .discovery
    .getDiscoveredSystems(
      discoveryResult
    );
}

export function getDiscoveredTalents(
  discoveryResult
) {
  return actorOwnedFeatureService
    .discovery
    .getDiscoveredTalents(
      discoveryResult
    );
}

export function getDiscoveredPassiveFeatureCandidates(
  discoveryResult
) {
  return actorOwnedFeatureService
    .discovery
    .getDiscoveredPassiveFeatureCandidates(
      discoveryResult
    );
}

export function getDiscoveredNhps(
  discoveryResult
) {
  return actorOwnedFeatureService
    .discovery
    .getDiscoveredNhps(
      discoveryResult
    );
}

export function flattenDiscoveredActorOwnedActions(
  discoveryResult
) {
  return actorOwnedFeatureService
    .discovery
    .flattenDiscoveredActorOwnedActions(
      discoveryResult
    );
}

export function hasDiscoveredNativeExecution(
  candidate
) {
  return actorOwnedFeatureService
    .discovery
    .hasDiscoveredNativeExecution(
      candidate
    );
}

export function getActorOwnedDiscoveryIdentityKey(
  candidate
) {
  return actorOwnedFeatureService
    .discovery
    .getActorOwnedDiscoveryIdentityKey(
      candidate
    );
}

/* ============================================================
   NORMALIZATION
   ============================================================ */

export function buildActorOwnedFeatureId(
  candidate
) {
  return actorOwnedFeatureService
    .normalizer
    .buildActorOwnedFeatureId(
      candidate
    );
}

export function normalizeActorOwnedFeatureActionKind(
  value
) {
  return actorOwnedFeatureService
    .normalizer
    .normalizeActorOwnedFeatureActionKind(
      value
    );
}

export function normalizeActorOwnedNativeReference(
  candidate,
  options
) {
  return actorOwnedFeatureService
    .normalizer
    .normalizeActorOwnedNativeReference(
      candidate,
      options
    );
}

export function normalizeActorOwnedNativeExecution(
  raw,
  options
) {
  return actorOwnedFeatureService
    .normalizer
    .normalizeActorOwnedNativeExecution(
      raw,
      options
    );
}

export function normalizeActorOwnedFeatureAction(
  featureId,
  candidate,
  actionCandidate,
  options
) {
  return actorOwnedFeatureService
    .normalizer
    .normalizeActorOwnedFeatureAction(
      featureId,
      candidate,
      actionCandidate,
      options
    );
}

export function classifyActorOwnedFeatureRuntimeStatus(
  candidate,
  actions,
  options
) {
  return actorOwnedFeatureService
    .normalizer
    .classifyActorOwnedFeatureRuntimeStatus(
      candidate,
      actions,
      options
    );
}

export function normalizeActorOwnedFeatureCandidate(
  candidate
) {
  return actorOwnedFeatureService
    .normalizer
    .normalizeActorOwnedFeatureCandidate(
      candidate
    );
}

export function normalizeActorOwnedFeatureDiscovery(
  discoveryResult
) {
  return actorOwnedFeatureService
    .normalizer
    .normalizeActorOwnedFeatureDiscovery(
      discoveryResult
    );
}

export function expandActorOwnedTalentRankViews(
  descriptor
) {
  return actorOwnedFeatureService
    .normalizer
    .expandActorOwnedTalentRankViews(
      descriptor
    );
}

export function expandActorOwnedWeaponProfileViews(
  descriptor
) {
  return actorOwnedFeatureService
    .normalizer
    .expandActorOwnedWeaponProfileViews(
      descriptor
    );
}

export function groupActorOwnedFeatureActionsByRuntimeStatus(
  descriptor
) {
  return actorOwnedFeatureService
    .normalizer
    .groupActorOwnedFeatureActionsByRuntimeStatus(
      descriptor
    );
}

export function getActorOwnedFeatureAugmentationNeeds(
  descriptor
) {
  return actorOwnedFeatureService
    .normalizer
    .getActorOwnedFeatureAugmentationNeeds(
      descriptor
    );
}

/* ============================================================
   REGISTRY REFRESH
   ============================================================ */

export async function refreshActorOwnedFeatures(
  actorReference,
  options
) {
  return actorOwnedFeatureService
    .registry
    .refreshActorOwnedFeatures(
      actorReference,
      options
    );
}

export async function ensureActorOwnedFeatureRegistry(
  actorReference,
  options
) {
  return actorOwnedFeatureService
    .registry
    .ensureActorOwnedFeatureRegistry(
      actorReference,
      options
    );
}

/* ============================================================
   REGISTER NORMALIZED DESCRIPTORS
   ============================================================ */

export function registerActorOwnedFeatureDescriptors(
  actorScopeId,
  descriptors,
  options
) {
  return actorOwnedFeatureService
    .registry
    .registerActorOwnedFeatureDescriptors(
      actorScopeId,
      descriptors,
      options
    );
}

/* ============================================================
   REGISTRY SCOPE
   ============================================================ */

export function getActorOwnedFeatureRegistryScopeId(
  value
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureRegistryScopeId(
      value
    );
}

export function hasActorOwnedFeatureRegistry(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .hasActorOwnedFeatureRegistry(
      actorScopeId
    );
}

export function getActorOwnedFeatureRegistryEntry(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureRegistryEntry(
      actorScopeId
    );
}

/* ============================================================
   FEATURE LOOKUP
   ============================================================ */

export function getActorOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatures(
      actorScopeId
    );
}

export function getActorOwnedFeature(
  actorScopeId,
  featureId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeature(
      actorScopeId,
      featureId
    );
}

export function findActorOwnedFeature(
  featureId
) {
  return actorOwnedFeatureService
    .registry
    .findActorOwnedFeature(
      featureId
    );
}

export function hasActorOwnedFeature(
  actorScopeId,
  featureId
) {
  return actorOwnedFeatureService
    .registry
    .hasActorOwnedFeature(
      actorScopeId,
      featureId
    );
}

/* ============================================================
   ACTION LOOKUP
   ============================================================ */

export function getActorOwnedFeatureActionEntry(
  actorScopeId,
  actionId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureActionEntry(
      actorScopeId,
      actionId
    );
}

export function findActorOwnedFeatureAction(
  actionId
) {
  return actorOwnedFeatureService
    .registry
    .findActorOwnedFeatureAction(
      actionId
    );
}

export function getActorOwnedFeatureActions(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureActions(
      actorScopeId
    );
}

/* ============================================================
   FEATURE CATEGORY LOOKUP
   ============================================================ */

export function getActorOwnedFeaturesByKind(
  actorScopeId,
  kinds
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeaturesByKind(
      actorScopeId,
      kinds
    );
}

export function getActorOwnedWeapons(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedWeapons(
      actorScopeId
    );
}

export function getActorOwnedSystems(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedSystems(
      actorScopeId
    );
}

export function getActorOwnedTalents(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedTalents(
      actorScopeId
    );
}

export function getActorOwnedFrameTraits(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFrameTraits(
      actorScopeId
    );
}

export function getActorOwnedCoreBonuses(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedCoreBonuses(
      actorScopeId
    );
}

export function getActorOwnedNhps(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedNhps(
      actorScopeId
    );
}

/* ============================================================
   OWNERSHIP LOOKUP
   ============================================================ */

export function getPilotOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getPilotOwnedFeatures(
      actorScopeId
    );
}

export function getMechOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getMechOwnedFeatures(
      actorScopeId
    );
}

/* ============================================================
   STATE LOOKUP
   ============================================================ */

export function getActiveActorOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActiveActorOwnedFeatures(
      actorScopeId
    );
}

export function getEquippedActorOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getEquippedActorOwnedFeatures(
      actorScopeId
    );
}

export function getMountedActorOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getMountedActorOwnedFeatures(
      actorScopeId
    );
}

/* ============================================================
   RUNTIME STATUS LOOKUP
   ============================================================ */

export function getActorOwnedFeaturesByRuntimeStatus(
  actorScopeId,
  statuses
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeaturesByRuntimeStatus(
      actorScopeId,
      statuses
    );
}

export function getNativeExecutableActorOwnedFeatures(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getNativeExecutableActorOwnedFeatures(
      actorScopeId
    );
}

export function getActorOwnedFeaturesRequiringAugmentation(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeaturesRequiringAugmentation(
      actorScopeId
    );
}

export function getActorOwnedFeatureRegistryAugmentationNeeds(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureRegistryAugmentationNeeds(
      actorScopeId
    );
}

/* ============================================================
   ACTION FILTERING
   ============================================================ */

export function getActorOwnedActionsByKind(
  actorScopeId,
  kinds
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedActionsByKind(
      actorScopeId,
      kinds
    );
}

export function getNativeExecutableActorOwnedActions(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getNativeExecutableActorOwnedActions(
      actorScopeId
    );
}

export function getActorOwnedActionsByRuntimeStatus(
  actorScopeId,
  statuses
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedActionsByRuntimeStatus(
      actorScopeId,
      statuses
    );
}

/* ============================================================
   GENERIC FEATURE / ACTION QUERY
   ============================================================ */

export function queryActorOwnedFeatures(
  actorScopeId,
  options
) {
  return actorOwnedFeatureService
    .registry
    .queryActorOwnedFeatures(
      actorScopeId,
      options
    );
}

export function queryActorOwnedFeatureActions(
  actorScopeId,
  options
) {
  return actorOwnedFeatureService
    .registry
    .queryActorOwnedFeatureActions(
      actorScopeId,
      options
    );
}

/* ============================================================
   REGISTRY REMOVAL
   ============================================================ */

export function removeActorOwnedFeatureRegistry(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .removeActorOwnedFeatureRegistry(
      actorScopeId
    );
}

export function clearActorOwnedFeatureRegistry() {
  return actorOwnedFeatureService
    .registry
    .clearActorOwnedFeatureRegistry();
}

/* ============================================================
   REGISTRY SNAPSHOTS
   ============================================================ */

export function getActorOwnedFeatureRegistrySnapshot(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureRegistrySnapshot(
      actorScopeId
    );
}

export function getAllActorOwnedFeatureRegistrySnapshots() {
  return actorOwnedFeatureService
    .registry
    .getAllActorOwnedFeatureRegistrySnapshots();
}

export function getActorOwnedFeatureBridgeSource(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureBridgeSource(
      actorScopeId
    );
}

export function getActorOwnedFeatureRuntimeSummary(
  actorScopeId
) {
  return actorOwnedFeatureService
    .registry
    .getActorOwnedFeatureRuntimeSummary(
      actorScopeId
    );
}

/* ============================================================
   STALENESS
   ============================================================ */

export function isActorOwnedFeatureRegistryStale(
  actorScopeId,
  options
) {
  return actorOwnedFeatureService
    .registry
    .isActorOwnedFeatureRegistryStale(
      actorScopeId,
      options
    );
}

/* ============================================================
   SERVICE CAPABILITIES
   ============================================================ */

export const ACTOR_OWNED_FEATURE_SERVICE_CAPABILITY =
  Object.freeze({
    NATIVE_DISCOVERY:
      "native-discovery",

    PILOT_MECH_FAMILY_DISCOVERY:
      "pilot-mech-family-discovery",

    FEATURE_CLASSIFICATION:
      "feature-classification",

    STRUCTURED_ACTION_DISCOVERY:
      "structured-action-discovery",

    WEAPON_PROFILE_DISCOVERY:
      "weapon-profile-discovery",

    TALENT_RANK_DISCOVERY:
      "talent-rank-discovery",

    SAFE_NORMALIZATION:
      "safe-normalization",

    NATIVE_PROVENANCE:
      "native-provenance",

    PARTIAL_NATIVE_CLASSIFICATION:
      "partial-native-classification",

    ACTOR_SCOPED_INDEXING:
      "actor-scoped-indexing",

    FEATURE_LOOKUP:
      "feature-lookup",

    ACTION_LOOKUP:
      "action-lookup",

    AUGMENTATION_NEEDS:
      "augmentation-needs",

    BRIDGE_SOURCE:
      "bridge-source"
  });

export function getActorOwnedFeatureServiceCapabilities() {
  return Object.freeze(
    Object.values(
      ACTOR_OWNED_FEATURE_SERVICE_CAPABILITY
    )
  );
}

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getActorOwnedFeatureServiceDiagnostics() {
  return Object.freeze({
    module:
      Object.freeze({
        id:
          ACTOR_OWNED_FEATURE_SERVICE_MODULE_ID,

        version:
          ACTOR_OWNED_FEATURE_SERVICE_MODULE_VERSION
      }),

    capabilities:
      getActorOwnedFeatureServiceCapabilities(),

    discovery:
      actorOwnedFeatureService
        .discovery
        .getActorOwnedFeatureDiscoveryDiagnostics(),

    normalizer:
      actorOwnedFeatureService
        .normalizer
        .getActorOwnedFeatureNormalizerDiagnostics(),

    registry:
      actorOwnedFeatureService
        .registry
        .getActorOwnedFeatureRegistryDiagnostics()
  });
}

/* ============================================================
   DISCOVERY FLOW
   ============================================================ */

/**
 * @section discovery-flow
 *
 * actorReference
 *       │
 *       ▼
 * discovery
 *       │
 *       ├── pilot-owned items
 *       └── mech-owned items
 *       │
 *       ▼
 * raw discovery candidates
 *       │
 *       ▼
 * normalizer
 *       │
 *       ▼
 * ActorOwnedFeatureDescriptor[]
 *       │
 *       ▼
 * registry
 */

/* ============================================================
   RUNTIME SUPPORT FLOW
   ============================================================ */

/**
 * @section runtime-support-flow
 *
 * Native execution confirmed:
 *
 * EXECUTABLE_NATIVE
 *
 * Native execution + unimplemented semantic remainder:
 *
 * PARTIAL_NATIVE
 *
 * Semantic/descriptive data only:
 *
 * SEMANTIC_ONLY
 *
 * Insufficient evidence:
 *
 * UNKNOWN
 *
 * system_bridge later adds supplemental semantics.
 */

/* ============================================================
   EXISTING FRAME CONN REGISTRY BOUNDARY
   ============================================================ */

/**
 * @section existing-frame-conn-registry-boundary
 *
 * Existing Frame Conn registry:
 *
 * declared/global action catalog
 *
 * Actor-owned feature service:
 *
 * actual pilot/mech-owned native features
 *
 * These remain separate.
 *
 * future system_bridge:
 *
 * existing Frame Conn registry
 *          +
 * actor-owned feature service
 *          +
 * augmentation registry
 *          ↓
 * runtime descriptor
 */

/* ============================================================
   NATIVE ADAPTER BOUNDARY
   ============================================================ */

/**
 * @section native-adapter-boundary
 *
 * Runtime composition should configure:
 *
 * setActorOwnedFeatureDiscoveryAdapter(...)
 *
 * using native_adapter/ only.
 *
 * This service should not independently read:
 *
 * actor.items
 * linked pilot/mech native fields
 * item.system
 * native Flow entry points
 *
 * outside the discovery adapter.
 */

/* ============================================================
   EXECUTION BOUNDARY
   ============================================================ */

/**
 * @section execution-boundary
 *
 * This service discovers and describes executable actor-owned mechanics.
 *
 * It does not execute them.
 *
 * Later:
 *
 * actor-owned action
 *       ↓
 * system_bridge runtime descriptor
 *       ↓
 * ExecutionContext
 *       ↓
 * execution_transaction
 *       ↓
 * native_adapter / supplemental resolution
 */

/* ============================================================
   RESOURCE BOUNDARY
   ============================================================ */

/**
 * @section resource-boundary
 *
 * Actor-owned descriptors may contain:
 *
 * Limited
 * Loaded
 * charges
 * frequency resources
 *
 * resource_service remains authoritative for:
 *
 * availability
 * consumption
 * restore/reset
 */

/* ============================================================
   ACTION ECONOMY BOUNDARY
   ============================================================ */

/**
 * @section action-economy-boundary
 *
 * Actor-owned actions may preserve activation kind:
 *
 * Quick
 * Full
 * Protocol
 * Reaction
 * Free
 *
 * action_economy remains authoritative for:
 *
 * legality
 * spending
 * protocol start-of-turn restriction
 * per-turn reset
 */

/* ============================================================
   TARGETING BOUNDARY
   ============================================================ */

/**
 * @section targeting-boundary
 *
 * Actor-owned descriptors may expose structured:
 *
 * Range
 * Threat
 * Sensors
 *
 * targeting_spatial_service remains authoritative for:
 *
 * target acquisition
 * geometry
 * LOS
 * adjacency
 * target legality
 */

/* ============================================================
   LIFECYCLE BOUNDARY
   ============================================================ */

/**
 * @section lifecycle-boundary
 *
 * Actor-owned descriptors may later contain:
 *
 * expiration
 * reset
 * duration
 *
 * lifecycle_service remains authoritative for timing.
 *
 * This service does not infer lifecycle from prose.
 */

/* ============================================================
   SEMANTIC EVENT BOUNDARY
   ============================================================ */

/**
 * @section semantic-event-boundary
 *
 * Actor-owned feature Trigger descriptors may later reference:
 *
 * attack.hit
 * movement.completed
 * turn.started
 * resource.spent
 * etc.
 *
 * semantic_event_bus remains transport authority.
 *
 * Trigger listener installation is not owned by this file.
 */

/* ============================================================
   PILOT / MECH BOUNDARY
   ============================================================ */

/**
 * @section pilot-mech-boundary
 *
 * Pilot and mech remain linked but distinct.
 *
 * Registry scope may expose both families while descriptors preserve actual
 * source actor UUID.
 *
 * Frame Conn can therefore later decide presentation/runtime availability
 * based on:
 *
 * pilot mounted
 * pilot dismounted
 * current controlled actor
 *
 * without rewriting ownership.
 */

/* ============================================================
   NHP BOUNDARY
   ============================================================ */

/**
 * @section nhp-boundary
 *
 * NHP ownership is discoverable.
 *
 * Autopilot/cascade rules are not inferred from ownership alone.
 *
 * Those mechanics remain supplemental unless a confirmed native runtime path
 * exists.
 */

/* ============================================================
   SYSTEM BRIDGE BOUNDARY
   ============================================================ */

/**
 * @section system-bridge-boundary
 *
 * Preferred bridge input:
 *
 * getActorOwnedFeatureBridgeSource(actorScopeId)
 *
 * This provides:
 *
 * features
 * actions
 * ownership
 * runtime support status
 * augmentation needs
 *
 * system_bridge should not repeat native actor/item discovery.
 */

/* ============================================================
   FRAME CONN RUNTIME COMPOSITION
   ============================================================ */

/**
 * @section frame-conn-runtime-composition
 *
 * Recommended:
 *
 * 1. configure discovery adapter:
 *
 *    setActorOwnedFeatureDiscoveryAdapter(...)
 *
 * 2. refresh controlled/linked actor:
 *
 *    refreshActorOwnedFeatures(actorReference)
 *
 * 3. refresh again on relevant ownership/loadout changes
 *
 * 4. system_bridge consumes:
 *
 *    getActorOwnedFeatureBridgeSource(...)
 *
 * No feature execution occurs during refresh.
 */

/* ============================================================
   REFRESH TRIGGERS
   ============================================================ */

/**
 * @section refresh-triggers
 *
 * Runtime composition should refresh when:
 *
 * linked pilot/mech changes
 * actor item created/deleted
 * weapon mount/loadout changes
 * system equipped state changes
 * Talent rank changes
 * NHP installed/removed
 * pilot gear/loadout changes
 *
 * Foundry hook installation belongs outside this service façade.
 */

/* ============================================================
   PUBLIC BOUNDARY RULES
   ============================================================ */

/**
 * @section public-boundary-rules
 *
 * RULE 1
 *
 * Higher runtime code should import actor-owned-feature-service.js rather
 * than discovery/normalizer/registry siblings.
 *
 *
 * RULE 2
 *
 * Actor-owned service describes current owned mechanics; it does not execute
 * them.
 *
 *
 * RULE 3
 *
 * Descriptive prose must not become runtime automation during discovery or
 * normalization.
 *
 *
 * RULE 4
 *
 * Existing Frame Conn registry remains separate until system_bridge.
 *
 *
 * RULE 5
 *
 * Native provenance must survive every discovery/normalization/indexing
 * step.
 */

/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */

/**
 * @section dependency-direction
 *
 * Intended:
 *
 * native_adapter
 *      │
 *      ▼
 * actor_owned_feature_service
 *      │
 *      ▼
 * future system_bridge
 *      │
 *      ▼
 * semantic execution runtime
 *
 *
 * Forbidden:
 *
 * actor_owned_feature_service
 * → runtime-orchestrator
 *
 * actor_owned_feature_service
 * → system_bridge
 *
 * actor_owned_feature_service
 * → feature-specific mechanic implementation
 *
 * actor_owned_feature_service
 * → direct Foundry item mutation
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
 * Supplies actor/item/native execution discovery.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Later consumes composed runtime descriptors.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Later executes actor-owned mechanics.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns resource state.
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns activation economy.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Owns semantic trigger transport.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Owns reset/expiration timing.
 *
 *
 * targeting_spatial_service/
 * --------------------------
 *
 * Owns targeting and spatial legality.
 *
 *
 * existing Frame Conn registry
 * ----------------------------
 *
 * Remains separate.
 *
 *
 * future system_bridge/
 * ---------------------
 *
 * Next major composition layer.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * actor-owned-feature-service.js is the public actor-owned feature boundary.
 *
 * INVARIANT 2
 * Contract owns actor-owned feature shapes/vocabulary.
 *
 * INVARIANT 3
 * Discovery owns native actor/item enumeration.
 *
 * INVARIANT 4
 * Normalizer owns safe descriptor construction.
 *
 * INVARIANT 5
 * Registry owns current indexed actor-owned state.
 *
 * INVARIANT 6
 * Pilot and mech ownership remain distinct.
 *
 * INVARIANT 7
 * Native provenance is preserved.
 *
 * INVARIANT 8
 * Semantic prose is never treated as executable solely by this service.
 *
 * INVARIANT 9
 * PARTIAL_NATIVE and SEMANTIC_ONLY remain valid first-class states.
 *
 * INVARIANT 10
 * Existing Frame Conn registry remains separate until system_bridge.
 *
 * INVARIANT 11
 * This service does not execute mechanics.
 *
 * INVARIANT 12
 * resource_service remains resource authority.
 *
 * INVARIANT 13
 * action_economy remains economy authority.
 *
 * INVARIANT 14
 * lifecycle_service remains lifecycle authority.
 *
 * INVARIANT 15
 * targeting_spatial_service remains targeting authority.
 *
 * INVARIANT 16
 * semantic_event_bus remains event transport authority.
 *
 * INVARIANT 17
 * future system_bridge consumes this service as a normalized source and
 * supplies only missing runtime semantics.
 */