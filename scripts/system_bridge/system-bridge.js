/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/system_bridge/system-bridge.js
 */
/**
 * @file
 * @path main/system_bridge/system-bridge.js
 * @module system-bridge
 * @layer system-bridge-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-system-bridge-api
 * @public-boundary true
 * @side-effects delegated-through-augmentation-registration-and-source-resolution
 *
 * @depends-on
 * - system-bridge-contract
 * - system-bridge-augmentation-registry
 * - system-bridge-resolver
 * - system-bridge-composer
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - existing Frame Conn registry is supplied through the resolver adapter
 * - actor_owned_feature_registry/ is consumed by resolver internally
 * - augmentation registry supplies missing runtime semantics
 * - composed runtime descriptors feed semantic_execution_context/
 * - execution_transaction/ remains downstream execution authority
 * - native_adapter/ remains native Foundry Lancer authority
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - contract owns bridge vocabulary/shapes
 * - augmentation registry owns supplemental metadata
 * - resolver owns source lookup
 * - composer owns field-by-field composition
 * - this file owns only the stable public façade/orchestration boundary
 *
 * THIS FILE OWNS:
 * - public system_bridge namespace
 * - augmentation registration façade
 * - existing registry resolver configuration façade
 * - source resolution façade
 * - runtime composition façade
 * - canonical resolve-and-compose operation
 * - runtime descriptor access helpers
 * - diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - existing Frame Conn registry implementation
 * - actor-owned feature discovery
 * - native execution
 * - resource mutation
 * - action economy mutation
 * - semantic event dispatch
 * - lifecycle progression
 * - targeting validation
 * - execution transaction sequencing
 *
 * EDIT CONTRACT:
 * - keep façade thin
 * - do not duplicate resolver/composer logic
 * - preserve native execution references
 * - do not execute mechanics here
 * - do not import Foundry/Lancer runtime globals
 */
/* ============================================================
   MODULE IMPORTS
   ============================================================ */
import * as contract from "./system-bridge-contract.js";
import * as augmentationRegistry from
  "./system-bridge-augmentation-registry.js";
import * as resolver from
  "./system-bridge-resolver.js";
import * as composer from
  "./system-bridge-composer.js";
/* ============================================================
   MODULE IDENTITY
   ============================================================ */
export const SYSTEM_BRIDGE_MODULE_ID =
  "lancer-frame-conn.system-bridge";
export const SYSTEM_BRIDGE_MODULE_VERSION =
  1;
/* ============================================================
   PUBLIC NAMESPACE
   ============================================================ */
/**
 * @section public-namespace
 *
 * Preferred higher-runtime access:
 *
 * systemBridge.contract.*
 * systemBridge.augmentationRegistry.*
 * systemBridge.resolver.*
 * systemBridge.composer.*
 *
 * Higher consumers should normally import this file rather than bridge
 * implementation siblings directly.
 */
export const systemBridge =
  Object.freeze({
    id:
      SYSTEM_BRIDGE_MODULE_ID,
    version:
      SYSTEM_BRIDGE_MODULE_VERSION,
    contract,
    augmentationRegistry,
    resolver,
    composer
  });
/* ============================================================
   PUBLIC CONTRACT VOCABULARY RE-EXPORTS
   ============================================================ */
/**
 * Stable bridge vocabulary is re-exported through the façade so consumers
 * do not need to bypass the package boundary merely to reference enums.
 */
export {
  SYSTEM_BRIDGE_AUGMENTATION_MODE,
  SYSTEM_BRIDGE_AUTHORITY,
  SYSTEM_BRIDGE_COMPOSITION_STATUS,
  SYSTEM_BRIDGE_CONFLICT_KIND,
  SYSTEM_BRIDGE_MATCH_STRENGTH,
  SYSTEM_BRIDGE_RESOLUTION_STATUS,
  SYSTEM_BRIDGE_RUNTIME_STATUS,
  SYSTEM_BRIDGE_SOURCE_KIND,
  SYSTEM_BRIDGE_SUBJECT_KIND,
  SYSTEM_BRIDGE_UNRESOLVED_KIND
} from "./system-bridge-contract.js";
/* ============================================================
   CONTRACT CONSTRUCTION
   ============================================================ */
export function createSystemBridgeIdentity(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeIdentity(
      options
    );
}
export function createSystemBridgeSourceReference(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeSourceReference(
      options
    );
}
export function createSystemBridgeFieldProvenance(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeFieldProvenance(
      options
    );
}
export function createSystemBridgeFieldContribution(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeFieldContribution(
      options
    );
}
export function createSystemBridgeConflict(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeConflict(
      options
    );
}
export function createSystemBridgeWarning(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeWarning(
      options
    );
}
export function createSystemBridgeUnresolvedRequirement(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeUnresolvedRequirement(
      options
    );
}
/* ============================================================
   AUGMENTATION CONTRACT CONSTRUCTION
   ============================================================ */
export function createSystemBridgeAugmentationIdentity(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeAugmentationIdentity(
      options
    );
}
export function createSystemBridgeAugmentationMatch(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeAugmentationMatch(
      options
    );
}
export function createSystemBridgeAugmentationPatch(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeAugmentationPatch(
      options
    );
}
export function createSystemBridgeAugmentationDescriptor(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeAugmentationDescriptor(
      options
    );
}
export function createSystemBridgeAugmentationMatchResult(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeAugmentationMatchResult(
      options
    );
}
/* ============================================================
   RESOLUTION CONTRACT CONSTRUCTION
   ============================================================ */
export function createSystemBridgeResolutionRequest(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeResolutionRequest(
      options
    );
}
export function createSystemBridgeResolutionResult(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeResolutionResult(
      options
    );
}
/* ============================================================
   RUNTIME CONTRACT CONSTRUCTION
   ============================================================ */
export function createSystemBridgeRuntimePresentation(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeRuntimePresentation(
      options
    );
}
export function createSystemBridgeRuntimeExecution(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeRuntimeExecution(
      options
    );
}
export function createSystemBridgeRuntimeAction(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeRuntimeAction(
      options
    );
}
export function createSystemBridgeRuntimeFeature(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeRuntimeFeature(
      options
    );
}
export function createSystemBridgeCompositionResult(
  options
) {
  return systemBridge
    .contract
    .createSystemBridgeCompositionResult(
      options
    );
}
/* ============================================================
   CONTRACT PREDICATES
   ============================================================ */
export function systemBridgeResolutionSucceeded(
  result
) {
  return systemBridge
    .contract
    .systemBridgeResolutionSucceeded(
      result
    );
}
export function systemBridgeCompositionSucceeded(
  result
) {
  return systemBridge
    .contract
    .systemBridgeCompositionSucceeded(
      result
    );
}
export function systemBridgeCompositionHasBlockingConflict(
  result
) {
  return systemBridge
    .contract
    .systemBridgeCompositionHasBlockingConflict(
      result
    );
}
export function getSystemBridgeIdentityMatchFields(
  identity
) {
  return systemBridge
    .contract
    .getSystemBridgeIdentityMatchFields(
      identity
    );
}
/* ============================================================
   AUGMENTATION REGISTRATION
   ============================================================ */
export function normalizeSystemBridgeAugmentationDescriptor(
  value
) {
  return systemBridge
    .augmentationRegistry
    .normalizeSystemBridgeAugmentationDescriptor(
      value
    );
}
export function registerSystemBridgeAugmentation(
  value,
  options
) {
  return systemBridge
    .augmentationRegistry
    .registerSystemBridgeAugmentation(
      value,
      options
    );
}
export function registerValidatedSystemBridgeAugmentation(
  value,
  options
) {
  return systemBridge
    .augmentationRegistry
    .registerValidatedSystemBridgeAugmentation(
      value,
      options
    );
}
export function registerSystemBridgeAugmentations(
  values,
  options
) {
  return systemBridge
    .augmentationRegistry
    .registerSystemBridgeAugmentations(
      values,
      options
    );
}
export function replaceSystemBridgeAugmentation(
  value
) {
  return systemBridge
    .augmentationRegistry
    .replaceSystemBridgeAugmentation(
      value
    );
}
export function unregisterSystemBridgeAugmentation(
  augmentationId
) {
  return systemBridge
    .augmentationRegistry
    .unregisterSystemBridgeAugmentation(
      augmentationId
    );
}
export function clearSystemBridgeAugmentations() {
  return systemBridge
    .augmentationRegistry
    .clearSystemBridgeAugmentations();
}
/* ============================================================
   AUGMENTATION STATE
   ============================================================ */
export function getSystemBridgeAugmentation(
  augmentationId
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentation(
      augmentationId
    );
}
export function hasSystemBridgeAugmentation(
  augmentationId
) {
  return systemBridge
    .augmentationRegistry
    .hasSystemBridgeAugmentation(
      augmentationId
    );
}
export function getSystemBridgeAugmentations(
  options
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentations(
      options
    );
}
export function setSystemBridgeAugmentationEnabled(
  augmentationId,
  enabled
) {
  return systemBridge
    .augmentationRegistry
    .setSystemBridgeAugmentationEnabled(
      augmentationId,
      enabled
    );
}
/* ============================================================
   AUGMENTATION MATCHING
   ============================================================ */
export function normalizeSystemBridgeAugmentationMatchSubject(
  value
) {
  return systemBridge
    .augmentationRegistry
    .normalizeSystemBridgeAugmentationMatchSubject(
      value
    );
}
export function validateSystemBridgeAugmentationMatch(
  match
) {
  return systemBridge
    .augmentationRegistry
    .validateSystemBridgeAugmentationMatch(
      match
    );
}
export function matchSystemBridgeAugmentation(
  descriptor,
  subject
) {
  return systemBridge
    .augmentationRegistry
    .matchSystemBridgeAugmentation(
      descriptor,
      subject
    );
}
export function findMatchingSystemBridgeAugmentations(
  subject,
  options
) {
  return systemBridge
    .augmentationRegistry
    .findMatchingSystemBridgeAugmentations(
      subject,
      options
    );
}
export function findBestSystemBridgeAugmentation(
  subject,
  options
) {
  return systemBridge
    .augmentationRegistry
    .findBestSystemBridgeAugmentation(
      subject,
      options
    );
}
export function findExactSystemBridgeAugmentations(
  subject,
  options
) {
  return systemBridge
    .augmentationRegistry
    .findExactSystemBridgeAugmentations(
      subject,
      options
    );
}
/* ============================================================
   AUGMENTATION DIRECT LOOKUPS
   ============================================================ */
export function getSystemBridgeAugmentationsForActionId(
  actionId,
  options
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentationsForActionId(
      actionId,
      options
    );
}
export function getSystemBridgeAugmentationsForFeatureId(
  featureId,
  options
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentationsForFeatureId(
      featureId,
      options
    );
}
export function getSystemBridgeAugmentationsForItemUuid(
  itemUuid,
  options
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentationsForItemUuid(
      itemUuid,
      options
    );
}
export function getSystemBridgeAugmentationsForItemLid(
  itemLid,
  options
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentationsForItemLid(
      itemLid,
      options
    );
}
export function getSystemBridgeAugmentationsForRegistryId(
  registryId,
  options
) {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentationsForRegistryId(
      registryId,
      options
    );
}
export function querySystemBridgeAugmentations(
  options
) {
  return systemBridge
    .augmentationRegistry
    .querySystemBridgeAugmentations(
      options
    );
}
/* ============================================================
   AUGMENTATION SNAPSHOTS
   ============================================================ */
export function getSystemBridgeAugmentationRegistrySnapshot() {
  return systemBridge
    .augmentationRegistry
    .getSystemBridgeAugmentationRegistrySnapshot();
}
export function getSerializableSystemBridgeAugmentationRegistry() {
  return systemBridge
    .augmentationRegistry
    .getSerializableSystemBridgeAugmentationRegistry();
}
/* ============================================================
   EXISTING FRAME CONN REGISTRY ADAPTER
   ============================================================ */
/**
 * Runtime composition supplies the adapter that knows the real shape of the
 * existing Frame Conn registry.
 *
 * The bridge itself therefore does not require the existing registry to be
 * refactored into the new foundational architecture.
 */
export function setSystemBridgeExistingRegistryResolverAdapter(
  adapter
) {
  return systemBridge
    .resolver
    .setSystemBridgeExistingRegistryResolverAdapter(
      adapter
    );
}
export function getSystemBridgeExistingRegistryResolverAdapter() {
  return systemBridge
    .resolver
    .getSystemBridgeExistingRegistryResolverAdapter();
}
export function hasSystemBridgeExistingRegistryResolverAdapter() {
  return systemBridge
    .resolver
    .hasSystemBridgeExistingRegistryResolverAdapter();
}
/* ============================================================
   RESOLUTION
   ============================================================ */
export function normalizeSystemBridgeResolutionRequest(
  value
) {
  return systemBridge
    .resolver
    .normalizeSystemBridgeResolutionRequest(
      value
    );
}
export async function resolveSystemBridgeSources(
  request,
  options
) {
  return systemBridge
    .resolver
    .resolveSystemBridgeSources(
      request,
      options
    );
}
export async function resolveSystemBridgeExistingRegistrySource(
  request,
  options
) {
  return systemBridge
    .resolver
    .resolveSystemBridgeExistingRegistrySource(
      request,
      options
    );
}
export function resolveSystemBridgeActorOwnedSource(
  request
) {
  return systemBridge
    .resolver
    .resolveSystemBridgeActorOwnedSource(
      request
    );
}
export function resolveSystemBridgeAugmentations(
  value
) {
  return systemBridge
    .resolver
    .resolveSystemBridgeAugmentations(
      value
    );
}
/* ============================================================
   RESOLUTION PREDICATES
   ============================================================ */
export function didSystemBridgeResolutionResolve(
  result
) {
  return systemBridge
    .resolver
    .didSystemBridgeResolutionResolve(
      result
    );
}
export function wasSystemBridgeResolutionAmbiguous(
  result
) {
  return systemBridge
    .resolver
    .wasSystemBridgeResolutionAmbiguous(
      result
    );
}
export function didSystemBridgeResolutionFail(
  result
) {
  return systemBridge
    .resolver
    .didSystemBridgeResolutionFail(
      result
    );
}
export function wasSystemBridgeResolutionNotFound(
  result
) {
  return systemBridge
    .resolver
    .wasSystemBridgeResolutionNotFound(
      result
    );
}
/* ============================================================
   RESOLUTION ACCESS
   ============================================================ */
export function getSystemBridgeResolvedExistingRegistry(
  result
) {
  return systemBridge
    .resolver
    .getSystemBridgeResolvedExistingRegistry(
      result
    );
}
export function getSystemBridgeResolvedActorOwned(
  result
) {
  return systemBridge
    .resolver
    .getSystemBridgeResolvedActorOwned(
      result
    );
}
export function getSystemBridgeResolvedAugmentations(
  result
) {
  return systemBridge
    .resolver
    .getSystemBridgeResolvedAugmentations(
      result
    );
}
export function getSystemBridgeSourcesByKind(
  result,
  sourceKind
) {
  return systemBridge
    .resolver
    .getSystemBridgeSourcesByKind(
      result,
      sourceKind
    );
}
export function getSystemBridgePrimarySource(
  result
) {
  return systemBridge
    .resolver
    .getSystemBridgePrimarySource(
      result
    );
}
/* ============================================================
   DIRECT COMPOSITION
   ============================================================ */
export function composeSystemBridgeRuntimeAction(
  resolution,
  options
) {
  return systemBridge
    .composer
    .composeSystemBridgeRuntimeAction(
      resolution,
      options
    );
}
export function composeSystemBridgeRuntimeFeature(
  resolution,
  options
) {
  return systemBridge
    .composer
    .composeSystemBridgeRuntimeFeature(
      resolution,
      options
    );
}
export function composeResolvedSystemBridgeSubject(
  resolution,
  options
) {
  return systemBridge
    .composer
    .composeResolvedSystemBridgeSubject(
      resolution,
      options
    );
}
export function composeSystemBridgeResolution(
  resolution,
  options
) {
  return systemBridge
    .composer
    .composeSystemBridgeResolution(
      resolution,
      options
    );
}
/* ============================================================
   CANONICAL RESOLVE + COMPOSE
   ============================================================ */
/**
 * @section canonical-resolve-compose
 *
 * Primary higher-runtime bridge operation.
 *
 * request
 *     ↓
 * resolver
 *     ↓
 * SystemBridgeResolutionResult
 *     ↓
 * composer
 *     ↓
 * SystemBridgeCompositionResult
 *
 * This operation performs NO mechanic execution.
 */
export async function resolveAndComposeSystemBridge(
  request,
  {
    resolutionOptions = {},
    compositionOptions = {}
  } = {}
) {
  const resolution =
    await resolveSystemBridgeSources(
      request,
      resolutionOptions
    );
  return composeSystemBridgeResolution(
    resolution,
    compositionOptions
  );
}
/* ============================================================
   RUNTIME DESCRIPTOR RESOLUTION
   ============================================================ */
/**
 * @section runtime-descriptor-resolution
 *
 * Convenience helper for callers that primarily need the descriptor while
 * still retaining the full composition result for diagnostics.
 */
export async function resolveSystemBridgeRuntimeDescriptor(
  request,
  options = {}
) {
  const composition =
    await resolveAndComposeSystemBridge(
      request,
      options
    );
  return Object.freeze({
    descriptor:
      getComposedSystemBridgeRuntimeDescriptor(
        composition
      ),
    composition
  });
}
/* ============================================================
   COMPOSITION ACCESS
   ============================================================ */
export function getComposedSystemBridgeFeature(
  result
) {
  return systemBridge
    .composer
    .getComposedSystemBridgeFeature(
      result
    );
}
export function getComposedSystemBridgeAction(
  result
) {
  return systemBridge
    .composer
    .getComposedSystemBridgeAction(
      result
    );
}
export function getComposedSystemBridgeRuntimeDescriptor(
  result
) {
  return systemBridge
    .composer
    .getComposedSystemBridgeRuntimeDescriptor(
      result
    );
}
/* ============================================================
   COMPOSITION PREDICATES
   ============================================================ */
export function didSystemBridgeCompositionComplete(
  result
) {
  return systemBridge
    .composer
    .didSystemBridgeCompositionComplete(
      result
    );
}
export function isSystemBridgeCompositionPartial(
  result
) {
  return systemBridge
    .composer
    .isSystemBridgeCompositionPartial(
      result
    );
}
export function isSystemBridgeCompositionConflicted(
  result
) {
  return systemBridge
    .composer
    .isSystemBridgeCompositionConflicted(
      result
    );
}
export function isSystemBridgeCompositionUnresolved(
  result
) {
  return systemBridge
    .composer
    .isSystemBridgeCompositionUnresolved(
      result
    );
}
export function didSystemBridgeCompositionFail(
  result
) {
  return systemBridge
    .composer
    .didSystemBridgeCompositionFail(
      result
    );
}
/* ============================================================
   SERVICE CAPABILITIES
   ============================================================ */
export const SYSTEM_BRIDGE_CAPABILITY =
  Object.freeze({
    EXISTING_REGISTRY_RESOLUTION:
      "existing-registry-resolution",
    ACTOR_OWNED_RESOLUTION:
      "actor-owned-resolution",
    AUGMENTATION_REGISTRATION:
      "augmentation-registration",
    AUGMENTATION_MATCHING:
      "augmentation-matching",
    FIELD_BY_FIELD_COMPOSITION:
      "field-by-field-composition",
    NATIVE_EXECUTION_PRESERVATION:
      "native-execution-preservation",
    TARGETING_AUGMENTATION:
      "targeting-augmentation",
    RESOURCE_AUGMENTATION:
      "resource-augmentation",
    ACTION_ECONOMY_AUGMENTATION:
      "action-economy-augmentation",
    LIFECYCLE_AUGMENTATION:
      "lifecycle-augmentation",
    TRIGGER_AUGMENTATION:
      "trigger-augmentation",
    SUPPLEMENTAL_EXECUTION:
      "supplemental-execution",
    PROVENANCE:
      "provenance",
    CONFLICT_DIAGNOSTICS:
      "conflict-diagnostics",
    UNRESOLVED_DIAGNOSTICS:
      "unresolved-diagnostics"
  });
export function getSystemBridgeCapabilities() {
  return Object.freeze(
    Object.values(
      SYSTEM_BRIDGE_CAPABILITY
    )
  );
}
/* ============================================================
   READINESS
   ============================================================ */
/**
 * @section readiness
 *
 * system_bridge can operate without every source:
 *
 * - actor-owned-only resolution is valid
 * - existing-registry-only resolution is valid
 * - augmentation-only resolution may be partial
 *
 * Existing registry adapter configuration is therefore reported rather than
 * treated as an unconditional boot requirement.
 */
export function getSystemBridgeReadiness() {
  return Object.freeze({
    ready:
      true,
    existingRegistryAdapterConfigured:
      hasSystemBridgeExistingRegistryResolverAdapter(),
    augmentationCount:
      getSystemBridgeAugmentationRegistrySnapshot()
        .count
  });
}
/* ============================================================
   DIAGNOSTICS
   ============================================================ */
export function getSystemBridgeDiagnostics() {
  return Object.freeze({
    module:
      Object.freeze({
        id:
          SYSTEM_BRIDGE_MODULE_ID,
        version:
          SYSTEM_BRIDGE_MODULE_VERSION
      }),
    capabilities:
      getSystemBridgeCapabilities(),
    readiness:
      getSystemBridgeReadiness(),
    augmentationRegistry:
      systemBridge
        .augmentationRegistry
        .getSystemBridgeAugmentationRegistryDiagnostics(),
    resolver:
      systemBridge
        .resolver
        .getSystemBridgeResolverDiagnostics(),
    composer:
      systemBridge
        .composer
        .getSystemBridgeComposerDiagnostics()
  });
}
/* ============================================================
   FRAME CONN RUNTIME COMPOSITION
   ============================================================ */
/**
 * @section frame-conn-runtime-composition
 *
 * Recommended runtime setup:
 *
 * 1. Configure native_adapter separately.
 *
 * 2. Configure actor_owned_feature_registry discovery adapter separately.
 *
 * 3. Configure existing Frame Conn registry lookup:
 *
 *    setSystemBridgeExistingRegistryResolverAdapter(...)
 *
 * 4. Register curated supplemental metadata:
 *
 *    registerValidatedSystemBridgeAugmentation(...)
 *
 * 5. Refresh actor-owned feature registry for active pilot/mech.
 *
 * 6. Resolve runtime mechanic:
 *
 *    resolveAndComposeSystemBridge(...)
 *
 * 7. Feed composed RuntimeAction/RuntimeFeature into:
 *
 *    semantic_execution_context
 *
 * 8. Execute through:
 *
 *    execution_transaction
 *
 * system_bridge does not perform step 8 itself.
 */
/* ============================================================
   EXISTING REGISTRY ADAPTER BOUNDARY
   ============================================================ */
/**
 * @section existing-registry-adapter-boundary
 *
 * The existing Frame Conn registry predates the foundational architecture.
 *
 * The resolver adapter is intentionally narrow:
 *
 * existing registry
 *        ↓
 * lookup adapter
 *        ↓
 * system_bridge
 *
 * This lets the existing registry remain in its current shape.
 *
 * The adapter should return original registry entries without attempting to
 * pre-compose them into new runtime contracts.
 */
/* ============================================================
   ACTOR-OWNED FEATURE BOUNDARY
   ============================================================ */
/**
 * @section actor-owned-feature-boundary
 *
 * actor_owned_feature_registry supplies:
 *
 * actual owned feature identity
 * actor/item provenance
 * profile/rank identity
 * structured native data
 * native execution references
 *
 * system_bridge does not repeat native actor/item discovery.
 */
/* ============================================================
   AUGMENTATION BOUNDARY
   ============================================================ */
/**
 * @section augmentation-boundary
 *
 * Augmentation exists specifically to avoid rewriting every existing Frame
 * Helm registry entry.
 *
 * Typical augmentation:
 *
 * existing/native data:
 *
 * action = Quick
 * Range = 10
 * native execution confirmed
 *
 * missing:
 *
 * enemy-only targeting
 * once-per-round supplemental trigger
 *
 * augmentation supplies only:
 *
 * target relationship
 * trigger/lifecycle semantics
 *
 * native action remains native.
 */
/* ============================================================
   NATIVE ADAPTER BOUNDARY
   ============================================================ */
/**
 * @section native-adapter-boundary
 *
 * system_bridge never calls native Foundry Lancer methods directly.
 *
 * A composed runtime execution descriptor may carry:
 *
 * nativeExecution
 *
 * but actual invocation belongs downstream through established execution
 * infrastructure/native_adapter.
 */
/* ============================================================
   SEMANTIC EXECUTION CONTEXT BOUNDARY
   ============================================================ */
/**
 * @section semantic-execution-context-boundary
 *
 * system_bridge answers:
 *
 * "What mechanic is this and what runtime semantics does it require?"
 *
 * semantic_execution_context answers:
 *
 * "Who is executing it right now, against what targets, in what runtime
 * context?"
 *
 * Do not merge these responsibilities.
 */
/* ============================================================
   EXECUTION TRANSACTION BOUNDARY
   ============================================================ */
/**
 * @section execution-transaction-boundary
 *
 * system_bridge produces descriptive runtime information.
 *
 * execution_transaction owns:
 *
 * prevalidation
 * targeting stage
 * final validation
 * ordered hook execution
 * native/supplemental execution
 * commit/cancellation
 *
 * system_bridge must not become another transaction runner.
 */
/* ============================================================
   ACTION ECONOMY BOUNDARY
   ============================================================ */
/**
 * @section action-economy-boundary
 *
 * Runtime descriptors may state:
 *
 * Quick
 * Full
 * Free
 * Protocol
 * Reaction
 *
 * action_economy owns current-turn legality and spending.
 *
 * Protocol remains:
 *
 * a Free Action
 * usable only at the start of the character's turn before any other action
 * usable only once per turn
 *
 * The bridge describes Protocol; action_economy enforces it.
 */
/* ============================================================
   RESOURCE BOUNDARY
   ============================================================ */
/**
 * @section resource-boundary
 *
 * Runtime descriptors may describe:
 *
 * Limited
 * Loaded
 * charges
 * supplemental frequency counters
 *
 * resource_service owns:
 *
 * current availability
 * consumption
 * restore
 * reset
 */
/* ============================================================
   SEMANTIC EVENT BOUNDARY
   ============================================================ */
/**
 * @section semantic-event-boundary
 *
 * Runtime trigger descriptors reference semantic_event_bus vocabulary.
 *
 * system_bridge does not:
 *
 * invent another event namespace
 * dispatch semantic mechanic events
 * derive triggers from arbitrary rule prose
 */
/* ============================================================
   LIFECYCLE BOUNDARY
   ============================================================ */
/**
 * @section lifecycle-boundary
 *
 * Runtime descriptors may carry explicit:
 *
 * duration
 * expiration
 * reset
 *
 * lifecycle_service remains timing authority.
 */
/* ============================================================
   TARGETING / SPATIAL BOUNDARY
   ============================================================ */
/**
 * @section targeting-spatial-boundary
 *
 * Runtime descriptors may combine:
 *
 * structured Range/Threat/Sensors
 * +
 * explicit target restrictions
 *
 * targeting_spatial_service owns:
 *
 * acquisition
 * distance
 * LOS
 * adjacency
 * occupancy
 * legality
 */
/* ============================================================
   SYSTEM BRIDGE DATA FLOW
   ============================================================ */
/**
 * @section system-bridge-data-flow
 *
 *                     existing Frame Conn registry
 *                                │
 *                                │ resolver adapter
 *                                ▼
 *                          system_bridge
 *                                ▲
 *                                │
 *                       actor-owned registry
 *                                ▲
 *                                │
 *                        native_adapter truth
 *
 *
 *                    augmentation registry
 *                                │
 *                                ▼
 *                          system_bridge
 *                                │
 *                                ▼
 *                    RuntimeAction / RuntimeFeature
 *                                │
 *                                ▼
 *                 semantic_execution_context
 *                                │
 *                                ▼
 *                  execution_transaction
 *                    │       │       │
 *                    │       │       │
 *                    ▼       ▼       ▼
 *              action    targeting  resource/
 *              economy     spatial   lifecycle
 *                    \       |       /
 *                     \      |      /
 *                      native_adapter
 *                           │
 *                           ▼
 *                   Foundry Lancer system
 */
/* ============================================================
   PUBLIC BOUNDARY RULES
   ============================================================ */
/**
 * @section public-boundary-rules
 *
 * RULE 1
 *
 * Higher Frame Conn runtime code should prefer importing system-bridge.js
 * rather than bridge implementation siblings.
 *
 *
 * RULE 2
 *
 * Existing Frame Conn registry remains unchanged unless a separate verified
 * reason requires modification.
 *
 *
 * RULE 3
 *
 * Actor-owned feature data remains independently discoverable/indexable.
 *
 *
 * RULE 4
 *
 * Augmentation supplies missing information rather than replacing complete
 * source descriptors wholesale.
 *
 *
 * RULE 5
 *
 * Native execution references survive composition.
 *
 *
 * RULE 6
 *
 * Bridge output is descriptive runtime input, not execution.
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
 *       │
 *       ▼
 * actor_owned_feature_registry
 *       │
 *       ├─────────────────────┐
 *       │                     │
 *       ▼                     │
 * system_bridge ◄──── existing registry
 *       ▲
 *       │
 * augmentation registry
 *       │
 *       ▼
 * composed runtime descriptor
 *       │
 *       ▼
 * semantic_execution_context
 *       │
 *       ▼
 * execution_transaction
 *
 *
 * Forbidden:
 *
 * native_adapter
 * → system_bridge
 *
 * resource_service
 * → system_bridge
 *
 * action_economy
 * → system_bridge
 *
 * semantic_event_bus
 * → system_bridge
 *
 * lifecycle_service
 * → system_bridge
 *
 * targeting_spatial_service
 * → system_bridge
 *
 * actor_owned_feature_registry
 * → system_bridge
 *
 * Existing registry construction
 * → system_bridge
 * → existing registry construction
 */
/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */
/**
 * @section existing-frame-conn-architecture-notes
 *
 * existing Frame Conn registry
 * ----------------------------
 *
 * Stays in its existing format.
 *
 * Adapter exposes lookup to bridge.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Native Foundry Lancer authority.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Receives composed runtime mechanics downstream.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Executes composed runtime mechanics downstream.
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
 * Owns current turn economy.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Owns semantic event vocabulary/transport.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Owns durations/resets.
 *
 *
 * targeting-spatial_service/
 * --------------------------
 *
 * Owns target/spatial legality.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Owns normalized actor-specific feature discovery/indexing.
 *
 *
 * system_bridge/
 * --------------
 *
 * This package now becomes the composition/supplementation boundary linking
 * those existing architectural sources without forcing them into one
 * monolithic registry.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * system-bridge.js is the public system_bridge package boundary.
 *
 * INVARIANT 2
 * Contract owns bridge vocabulary and descriptor shapes.
 *
 * INVARIANT 3
 * Augmentation registry owns supplemental metadata storage/matching.
 *
 * INVARIANT 4
 * Resolver owns source resolution.
 *
 * INVARIANT 5
 * Composer owns field-by-field runtime composition.
 *
 * INVARIANT 6
 * Existing Frame Conn registry remains a separate source.
 *
 * INVARIANT 7
 * Actor-owned feature registry remains a separate source.
 *
 * INVARIANT 8
 * Augmentation remains a separate source.
 *
 * INVARIANT 9
 * Confirmed native execution is preserved.
 *
 * INVARIANT 10
 * Augmentation defaults to filling missing runtime information.
 *
 * INVARIANT 11
 * Source conflicts remain diagnosable.
 *
 * INVARIANT 12
 * Missing required runtime fields remain explicitly unresolved.
 *
 * INVARIANT 13
 * system_bridge performs no mechanic execution.
 *
 * INVARIANT 14
 * native_adapter remains native Foundry Lancer authority.
 *
 * INVARIANT 15
 * resource_service remains resource authority.
 *
 * INVARIANT 16
 * action_economy remains action-economy authority.
 *
 * INVARIANT 17
 * semantic_event_bus remains semantic event authority.
 *
 * INVARIANT 18
 * lifecycle_service remains lifecycle authority.
 *
 * INVARIANT 19
 * targeting_spatial_service remains targeting/spatial authority.
 *
 * INVARIANT 20
 * semantic_execution_context remains execution-context authority.
 *
 * INVARIANT 21
 * execution_transaction remains execution orchestration authority.
 *
 * INVARIANT 22
 * Foundational packages must not import upward into system_bridge.
 */