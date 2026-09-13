/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/targeting_spatial_service/targeting-spatial-service.js
 */

/**
 * @file
 * @path main/targeting_spatial_service/targeting-spatial-service.js
 * @module targeting-spatial-service
 * @layer targeting-spatial-service-public-boundary
 * @responsibility expose-one-stable-frame-conn-facing-targeting-spatial-api
 * @public-boundary true
 * @side-effects delegated-through-query-resolver-validator-and-hooks
 *
 * @depends-on
 * - targeting-spatial-contract
 * - targeting-spatial-query
 * - targeting-spatial-resolver
 * - targeting-spatial-validator
 * - targeting-spatial-hooks
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by runtime-orchestrator.js
 * - consumed by future actor_owned_feature_registry/
 * - consumed by future system_bridge/
 * - consumed by future pathfinder/
 * - integrates with execution_transaction/ through targeting-spatial-hooks.js
 * - integrates with semantic_event_bus/ through targeting-spatial-hooks.js
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - contract owns normalized targeting/spatial shapes
 * - query owns factual spatial resolution
 * - resolver owns target acquisition
 * - validator owns target legality
 * - hooks own execution_transaction integration
 * - native_adapter remains native Foundry/Lancer geometry authority
 *
 * THIS FILE OWNS:
 * - public targeting_spatial_service façade
 * - stable namespace composition
 * - adapter configuration façade
 * - spatial query façade
 * - targeting resolution façade
 * - validation façade
 * - transaction hook configuration/registration
 * - diagnostics
 *
 * THIS FILE DOES NOT OWN:
 * - spatial contracts
 * - native geometry implementation
 * - target selection UI implementation
 * - targeting legality implementation
 * - transaction sequencing
 * - pathfinding
 * - feature-specific rules
 *
 * EDIT CONTRACT:
 * - keep façade thin
 * - contract owns shapes/vocabulary
 * - query owns spatial facts
 * - resolver owns acquisition
 * - validator owns legality
 * - hooks own execution integration
 * - do not add feature-specific targeting behavior here
 */

/* ============================================================
   MODULE IMPORTS
   ============================================================ */

import * as contract from "./targeting-spatial-contract.js";
import * as query from "./targeting-spatial-query.js";
import * as resolver from "./targeting-spatial-resolver.js";
import * as validator from "./targeting-spatial-validator.js";
import * as hooks from "./targeting-spatial-hooks.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const TARGETING_SPATIAL_SERVICE_MODULE_ID =
  "lancer-frame-conn.targeting-spatial-service";

export const TARGETING_SPATIAL_SERVICE_MODULE_VERSION =
  1;

/* ============================================================
   PUBLIC NAMESPACE
   ============================================================ */

/**
 * @section public-namespace
 *
 * Preferred access:
 *
 * targetingSpatialService.contract.*
 * targetingSpatialService.query.*
 * targetingSpatialService.resolver.*
 * targetingSpatialService.validator.*
 * targetingSpatialService.hooks.*
 */

export const targetingSpatialService =
  Object.freeze({
    id:
      TARGETING_SPATIAL_SERVICE_MODULE_ID,

    version:
      TARGETING_SPATIAL_SERVICE_MODULE_VERSION,

    contract,

    query,

    resolver,

    validator,

    hooks
  });

/* ============================================================
   CONTRACT CONSTRUCTION
   ============================================================ */

export function createSpatialPoint(
  options
) {
  return targetingSpatialService
    .contract
    .createSpatialPoint(
      options
    );
}

export function createSpatialFootprint(
  options
) {
  return targetingSpatialService
    .contract
    .createSpatialFootprint(
      options
    );
}

export function createSpatialEntityReference(
  options
) {
  return targetingSpatialService
    .contract
    .createSpatialEntityReference(
      options
    );
}

export function createTargetReference(
  options
) {
  return targetingSpatialService
    .contract
    .createTargetReference(
      options
    );
}

export function createAreaDescriptor(
  options
) {
  return targetingSpatialService
    .contract
    .createAreaDescriptor(
      options
    );
}

export function createTargetingRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createTargetingRequirement(
      options
    );
}

export function createTargetingRequest(
  options
) {
  return targetingSpatialService
    .contract
    .createTargetingRequest(
      options
    );
}

export function createTargetResolutionResult(
  options
) {
  return targetingSpatialService
    .contract
    .createTargetResolutionResult(
      options
    );
}

export function createTargetValidationIssue(
  options
) {
  return targetingSpatialService
    .contract
    .createTargetValidationIssue(
      options
    );
}

export function createSingleTargetValidationResult(
  options
) {
  return targetingSpatialService
    .contract
    .createSingleTargetValidationResult(
      options
    );
}

export function createTargetValidationResult(
  options
) {
  return targetingSpatialService
    .contract
    .createTargetValidationResult(
      options
    );
}

/* ============================================================
   COMMON TARGET REQUIREMENTS
   ============================================================ */

export function createSingleTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createSingleTargetRequirement(
      options
    );
}

export function createMultipleTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createMultipleTargetRequirement(
      options
    );
}

export function createSelfTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createSelfTargetRequirement(
      options
    );
}

export function createAdjacentTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createAdjacentTargetRequirement(
      options
    );
}

export function createThreatTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createThreatTargetRequirement(
      options
    );
}

export function createSensorTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createSensorTargetRequirement(
      options
    );
}

export function createAreaTargetRequirement(
  options
) {
  return targetingSpatialService
    .contract
    .createAreaTargetRequirement(
      options
    );
}

/* ============================================================
   SPATIAL QUERY ADAPTER CONFIGURATION
   ============================================================ */

/**
 * @section spatial-query-adapter-configuration
 *
 * Runtime composition should implement this adapter using confirmed native
 * Foundry/Lancer geometry/token APIs.
 */

export function setTargetingSpatialQueryAdapter(
  adapter
) {
  return targetingSpatialService
    .query
    .setTargetingSpatialQueryAdapter(
      adapter
    );
}

export function getTargetingSpatialQueryAdapter() {
  return targetingSpatialService
    .query
    .getTargetingSpatialQueryAdapter();
}

export function hasTargetingSpatialQueryAdapter() {
  return targetingSpatialService
    .query
    .hasTargetingSpatialQueryAdapter();
}

export function assertTargetingSpatialQueryAdapter() {
  return targetingSpatialService
    .query
    .assertTargetingSpatialQueryAdapter();
}

/* ============================================================
   TARGET ACQUISITION ADAPTER CONFIGURATION
   ============================================================ */

export function setTargetingAcquisitionAdapter(
  adapter
) {
  return targetingSpatialService
    .resolver
    .setTargetingAcquisitionAdapter(
      adapter
    );
}

export function getTargetingAcquisitionAdapter() {
  return targetingSpatialService
    .resolver
    .getTargetingAcquisitionAdapter();
}

export function hasTargetingAcquisitionAdapter() {
  return targetingSpatialService
    .resolver
    .hasTargetingAcquisitionAdapter();
}

/* ============================================================
   SPATIAL NORMALIZATION
   ============================================================ */

export function normalizeSpatialPoint(
  value
) {
  return targetingSpatialService
    .query
    .normalizeSpatialPoint(
      value
    );
}

export function normalizeSpatialFootprint(
  value,
  options
) {
  return targetingSpatialService
    .query
    .normalizeSpatialFootprint(
      value,
      options
    );
}

export function normalizeSpatialEntity(
  value
) {
  return targetingSpatialService
    .query
    .normalizeSpatialEntity(
      value
    );
}

/* ============================================================
   SPATIAL ENTITY RESOLUTION
   ============================================================ */

export async function resolveSpatialEntity(
  reference
) {
  return targetingSpatialService
    .query
    .resolveSpatialEntity(
      reference
    );
}

export async function resolveSpatialEntities(
  references
) {
  return targetingSpatialService
    .query
    .resolveSpatialEntities(
      references
    );
}

/* ============================================================
   DISTANCE / RANGE QUERIES
   ============================================================ */

export async function querySpatialDistance(
  sourceReference,
  targetReference,
  options
) {
  return targetingSpatialService
    .query
    .querySpatialDistance(
      sourceReference,
      targetReference,
      options
    );
}

export async function querySpatialRange(
  sourceReference,
  targetReference,
  limit,
  options
) {
  return targetingSpatialService
    .query
    .querySpatialRange(
      sourceReference,
      targetReference,
      limit,
      options
    );
}

export async function queryRange(
  sourceReference,
  targetReference,
  range,
  options
) {
  return targetingSpatialService
    .query
    .queryRange(
      sourceReference,
      targetReference,
      range,
      options
    );
}

export async function queryThreat(
  sourceReference,
  targetReference,
  threat,
  options
) {
  return targetingSpatialService
    .query
    .queryThreat(
      sourceReference,
      targetReference,
      threat,
      options
    );
}

export async function querySensors(
  sourceReference,
  targetReference,
  sensors,
  options
) {
  return targetingSpatialService
    .query
    .querySensors(
      sourceReference,
      targetReference,
      sensors,
      options
    );
}

/* ============================================================
   ADJACENCY / LOS / COVER
   ============================================================ */

export async function queryAdjacency(
  sourceReference,
  targetReference,
  options
) {
  return targetingSpatialService
    .query
    .queryAdjacency(
      sourceReference,
      targetReference,
      options
    );
}

export async function queryLineOfSight(
  sourceReference,
  targetReference,
  options
) {
  return targetingSpatialService
    .query
    .queryLineOfSight(
      sourceReference,
      targetReference,
      options
    );
}

export async function queryCover(
  sourceReference,
  targetReference,
  options
) {
  return targetingSpatialService
    .query
    .queryCover(
      sourceReference,
      targetReference,
      options
    );
}

/* ============================================================
   OCCUPANCY
   ============================================================ */

export async function queryOccupancy(
  pointReference,
  options
) {
  return targetingSpatialService
    .query
    .queryOccupancy(
      pointReference,
      options
    );
}

export async function isSpatialPointUnoccupied(
  pointReference,
  options
) {
  return targetingSpatialService
    .query
    .isSpatialPointUnoccupied(
      pointReference,
      options
    );
}

/* ============================================================
   AREA QUERIES
   ============================================================ */

export async function queryArea(
  area,
  options
) {
  return targetingSpatialService
    .query
    .queryArea(
      area,
      options
    );
}

export async function isEntityInsideArea(
  entityReference,
  area,
  options
) {
  return targetingSpatialService
    .query
    .isEntityInsideArea(
      entityReference,
      area,
      options
    );
}

/* ============================================================
   SCENE SPATIAL QUERIES
   ============================================================ */

export async function querySceneSpatialEntities(
  sceneId,
  options
) {
  return targetingSpatialService
    .query
    .querySceneSpatialEntities(
      sceneId,
      options
    );
}

export async function queryEntitiesWithinSensors(
  sourceReference,
  sensorRange,
  options
) {
  return targetingSpatialService
    .query
    .queryEntitiesWithinSensors(
      sourceReference,
      sensorRange,
      options
    );
}

/* ============================================================
   BATCH / CLOSEST QUERIES
   ============================================================ */

export async function queryClosestSpatialEntity(
  sourceReference,
  targetReferences,
  options
) {
  return targetingSpatialService
    .query
    .queryClosestSpatialEntity(
      sourceReference,
      targetReferences,
      options
    );
}

export async function queryTargetsWithinRange(
  sourceReference,
  targetReferences,
  limit,
  options
) {
  return targetingSpatialService
    .query
    .queryTargetsWithinRange(
      sourceReference,
      targetReferences,
      limit,
      options
    );
}

export async function queryTargetsWithinThreat(
  sourceReference,
  targetReferences,
  threat,
  options
) {
  return targetingSpatialService
    .query
    .queryTargetsWithinThreat(
      sourceReference,
      targetReferences,
      threat,
      options
    );
}

export async function queryTargetsWithinSensors(
  sourceReference,
  targetReferences,
  sensors,
  options
) {
  return targetingSpatialService
    .query
    .queryTargetsWithinSensors(
      sourceReference,
      targetReferences,
      sensors,
      options
    );
}

export async function querySpatialFacts(
  sourceReference,
  targetReference,
  options
) {
  return targetingSpatialService
    .query
    .querySpatialFacts(
      sourceReference,
      targetReference,
      options
    );
}

/* ============================================================
   TARGETING REQUEST CONSTRUCTION
   ============================================================ */

export async function buildTargetingRequest(
  context,
  options
) {
  return targetingSpatialService
    .resolver
    .buildTargetingRequest(
      context,
      options
    );
}

export async function resolveTargetingSource(
  context
) {
  return targetingSpatialService
    .resolver
    .resolveTargetingSource(
      context
    );
}

/* ============================================================
   TARGET NORMALIZATION
   ============================================================ */

export async function normalizeTargetReference(
  value
) {
  return targetingSpatialService
    .resolver
    .normalizeTargetReference(
      value
    );
}

export async function normalizeTargetReferences(
  values,
  options
) {
  return targetingSpatialService
    .resolver
    .normalizeTargetReferences(
      values,
      options
    );
}

/* ============================================================
   TARGET RESOLUTION
   ============================================================ */

export async function resolveTargetingRequest(
  request,
  context,
  options
) {
  return targetingSpatialService
    .resolver
    .resolveTargetingRequest(
      request,
      context,
      options
    );
}

export async function resolveExecutionTargets(
  context,
  options
) {
  return targetingSpatialService
    .resolver
    .resolveExecutionTargets(
      context,
      options
    );
}

export async function resolveExistingExecutionTargets(
  context,
  options
) {
  return targetingSpatialService
    .resolver
    .resolveExistingExecutionTargets(
      context,
      options
    );
}

/* ============================================================
   RESOLUTION ACCESS HELPERS
   ============================================================ */

export function getResolvedSingleTarget(
  resolution
) {
  return targetingSpatialService
    .resolver
    .getResolvedSingleTarget(
      resolution
    );
}

export function getResolvedTargetByActorUuid(
  resolution,
  actorUuid
) {
  return targetingSpatialService
    .resolver
    .getResolvedTargetByActorUuid(
      resolution,
      actorUuid
    );
}

export function getResolvedTargetByTokenUuid(
  resolution,
  tokenUuid
) {
  return targetingSpatialService
    .resolver
    .getResolvedTargetByTokenUuid(
      resolution,
      tokenUuid
    );
}

export function didTargetResolutionSucceed(
  result
) {
  return targetingSpatialService
    .resolver
    .didTargetResolutionSucceed(
      result
    );
}

export function wasTargetResolutionCancelled(
  result
) {
  return targetingSpatialService
    .resolver
    .wasTargetResolutionCancelled(
      result
    );
}

export function didTargetResolutionFail(
  result
) {
  return targetingSpatialService
    .resolver
    .didTargetResolutionFail(
      result
    );
}

/* ============================================================
   TARGET VALIDATION
   ============================================================ */

export async function validateSingleTarget(
  source,
  target,
  requirement
) {
  return targetingSpatialService
    .validator
    .validateSingleTarget(
      source,
      target,
      requirement
    );
}

export async function validateTargetResolution(
  resolution,
  options
) {
  return targetingSpatialService
    .validator
    .validateTargetResolution(
      resolution,
      options
    );
}

export async function validateExecutionTargets(
  context,
  resolution,
  options
) {
  return targetingSpatialService
    .validator
    .validateExecutionTargets(
      context,
      resolution,
      options
    );
}

/* ============================================================
   TARGET VALIDATION RESULT ADAPTER
   ============================================================ */

export function toExecutionTargetValidationResult(
  validation,
  options
) {
  return targetingSpatialService
    .validator
    .toExecutionTargetValidationResult(
      validation,
      options
    );
}

/* ============================================================
   TARGET VALIDATION PREDICATES
   ============================================================ */

export function didTargetValidationSucceed(
  result
) {
  return targetingSpatialService
    .validator
    .didTargetValidationSucceed(
      result
    );
}

export function didTargetValidationFail(
  result
) {
  return targetingSpatialService
    .validator
    .didTargetValidationFail(
      result
    );
}

export function wasTargetValidationPartial(
  result
) {
  return targetingSpatialService
    .validator
    .wasTargetValidationPartial(
      result
    );
}

/* ============================================================
   CUSTOM TARGETING VALIDATORS
   ============================================================ */

export function registerCustomTargetingValidator(
  id,
  validatorFunction
) {
  return targetingSpatialService
    .validator
    .registerCustomTargetingValidator(
      id,
      validatorFunction
    );
}

export function unregisterCustomTargetingValidator(
  id
) {
  return targetingSpatialService
    .validator
    .unregisterCustomTargetingValidator(
      id
    );
}

export function getCustomTargetingValidator(
  id
) {
  return targetingSpatialService
    .validator
    .getCustomTargetingValidator(
      id
    );
}

export function clearCustomTargetingValidators() {
  return targetingSpatialService
    .validator
    .clearCustomTargetingValidators();
}

/* ============================================================
   TARGETING AUGMENTATION
   ============================================================ */

/**
 * @section targeting-augmentation
 *
 * Future system_bridge may supply normalized targeting semantics missing
 * from existing registry/native data.
 */

export function setTargetingAugmentationResolver(
  augmentationResolver
) {
  return targetingSpatialService
    .hooks
    .setTargetingAugmentationResolver(
      augmentationResolver
    );
}

export function getTargetingAugmentationResolver() {
  return targetingSpatialService
    .hooks
    .getTargetingAugmentationResolver();
}

/* ============================================================
   TRANSACTION HOOK REGISTRATION
   ============================================================ */

export function registerTargetingSpatialTransactionHooks() {
  return targetingSpatialService
    .hooks
    .registerTargetingSpatialTransactionHooks();
}

export function unregisterTargetingSpatialTransactionHooks() {
  return targetingSpatialService
    .hooks
    .unregisterTargetingSpatialTransactionHooks();
}

export function areTargetingSpatialTransactionHooksRegistered() {
  return targetingSpatialService
    .hooks
    .areTargetingSpatialTransactionHooksRegistered();
}

/* ============================================================
   EXECUTION TARGETING STATE
   ============================================================ */

export function getExecutionTargetingSpatialState(
  executionId
) {
  return targetingSpatialService
    .hooks
    .getExecutionTargetingSpatialState(
      executionId
    );
}

export function getExecutionTargetingRequest(
  executionId
) {
  return targetingSpatialService
    .hooks
    .getExecutionTargetingRequest(
      executionId
    );
}

export function getExecutionTargetResolution(
  executionId
) {
  return targetingSpatialService
    .hooks
    .getExecutionTargetResolution(
      executionId
    );
}

export function getExecutionTargetValidation(
  executionId
) {
  return targetingSpatialService
    .hooks
    .getExecutionTargetValidation(
      executionId
    );
}

export function clearExecutionTargetingSpatialState(
  executionId
) {
  return targetingSpatialService
    .hooks
    .clearExecutionTargetingSpatialState(
      executionId
    );
}

export function clearAllExecutionTargetingSpatialState() {
  return targetingSpatialService
    .hooks
    .clearAllExecutionTargetingSpatialState();
}

/* ============================================================
   SERVICE CAPABILITIES
   ============================================================ */

export const TARGETING_SPATIAL_SERVICE_CAPABILITY =
  Object.freeze({
    ENTITY_RESOLUTION:
      "entity-resolution",

    FOOTPRINT_DISTANCE:
      "footprint-distance",

    ELEVATION:
      "elevation",

    RANGE:
      "range",

    THREAT:
      "threat",

    SENSORS:
      "sensors",

    ADJACENCY:
      "adjacency",

    LINE_OF_SIGHT:
      "line-of-sight",

    COVER:
      "cover",

    OCCUPANCY:
      "occupancy",

    AREA:
      "area",

    TARGET_ACQUISITION:
      "target-acquisition",

    TARGET_PROMPTING:
      "target-prompting",

    TARGET_VALIDATION:
      "target-validation",

    TRANSACTION_HOOKS:
      "transaction-hooks",

    RUNTIME_AUGMENTATION:
      "runtime-augmentation",

    PATHFINDER_QUERY_REUSE:
      "pathfinder-query-reuse"
  });

export function getTargetingSpatialServiceCapabilities() {
  return Object.freeze(
    Object.values(
      TARGETING_SPATIAL_SERVICE_CAPABILITY
    )
  );
}

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getTargetingSpatialServiceDiagnostics() {
  return Object.freeze({
    module:
      Object.freeze({
        id:
          TARGETING_SPATIAL_SERVICE_MODULE_ID,

        version:
          TARGETING_SPATIAL_SERVICE_MODULE_VERSION
      }),

    capabilities:
      getTargetingSpatialServiceCapabilities(),

    query:
      targetingSpatialService
        .query
        .getTargetingSpatialQueryDiagnostics(),

    resolver:
      targetingSpatialService
        .resolver
        .getTargetingSpatialResolverDiagnostics(),

    validator:
      targetingSpatialService
        .validator
        .getTargetingSpatialValidatorDiagnostics(),

    hooks:
      targetingSpatialService
        .hooks
        .getTargetingSpatialHookDiagnostics()
  });
}

/* ============================================================
   EXECUTION FLOW BOUNDARY
   ============================================================ */

/**
 * @section execution-flow-boundary
 *
 * Standard execution:
 *
 * PRE_VALIDATE
 *        │
 *        │ non-target prerequisites
 *        ▼
 * TARGETING
 *        │
 *        ▼
 * targeting-spatial-resolver
 *        │
 *        ▼
 * TargetResolutionResult
 *        │
 *        ▼
 * FINAL_VALIDATE
 *        │
 *        ▼
 * targeting-spatial-validator
 *        │
 *        ▼
 * EXECUTE
 *
 * Query service supports both resolver and validator.
 */

/* ============================================================
   ACQUISITION / LEGALITY BOUNDARY
   ============================================================ */

/**
 * @section acquisition-legality-boundary
 *
 * Resolver:
 *
 * "What did the user/system select?"
 *
 * Validator:
 *
 * "Is that selection legal?"
 *
 * Query:
 *
 * "What spatial facts are true?"
 *
 * These remain distinct.
 */

/* ============================================================
   RANGE / THREAT / SENSORS BOUNDARY
   ============================================================ */

/**
 * @section range-threat-sensors-boundary
 *
 * RANGE:
 * weapon/action reach.
 *
 * THREAT:
 * melee/reaction threat.
 *
 * SENSORS:
 * sensor/tech reach.
 *
 * Never collapse these into one generic runtime distance property.
 */

/* ============================================================
   SENSORS / VISIBILITY BOUNDARY
   ============================================================ */

/**
 * @section sensors-visibility-boundary
 *
 * Sensor-space detection is independent from ordinary Foundry visual
 * visibility.
 *
 * This supports Frame Conn:
 *
 * enemy within Sensors
 * + darkness/vision prevents normal rendering
 * → Frame Conn may still show sensor outline/name.
 *
 * Visual presentation remains UI-owned.
 */

/* ============================================================
   NATIVE ADAPTER BOUNDARY
   ============================================================ */

/**
 * @section native-adapter-boundary
 *
 * Native/Foundry access should be injected into:
 *
 * setTargetingSpatialQueryAdapter(...)
 * setTargetingAcquisitionAdapter(...)
 *
 * Confirmed native APIs should provide:
 *
 * token/entity resolution
 * scene geometry
 * system distance
 * LOS
 * cover
 * occupancy
 * current targets
 * template placement
 *
 * This public service should not directly use Foundry globals.
 */

/* ============================================================
   ACTOR-OWNED FEATURE REGISTRY BOUNDARY
   ============================================================ */

/**
 * @section actor-owned-feature-registry-boundary
 *
 * actor_owned_feature_registry may normalize:
 *
 * weapon Range/Threat
 * system Sensors
 * Talent target mode
 * Trait adjacency trigger
 * Core Bonus target restrictions
 *
 * into:
 *
 * TargetingRequirement
 *
 * It does not perform target acquisition or validation.
 */

/* ============================================================
   SYSTEM BRIDGE BOUNDARY
   ============================================================ */

/**
 * @section system-bridge-boundary
 *
 * future system_bridge may compose:
 *
 * existing registry targeting data
 * +
 * native weapon/system data
 * +
 * actor-owned feature metadata
 * +
 * augmentation
 *        ↓
 * TargetingRequirement
 *
 * targeting_spatial_service then executes acquisition/validation.
 *
 * Bridge does not own geometry.
 */

/* ============================================================
   PATHFINDER BOUNDARY
   ============================================================ */

/**
 * @section pathfinder-boundary
 *
 * Future pathfinder may consume:
 *
 * resolveSpatialEntity()
 * querySpatialDistance()
 * queryOccupancy()
 * querySceneSpatialEntities()
 *
 * targeting_spatial_service supplies spatial facts.
 *
 * Pathfinder owns:
 *
 * route search
 * terrain cost
 * movement mode selection
 * climb/jump/drop
 * hover/fly
 * teleport
 * budget optimization
 */

/* ============================================================
   SEMANTIC EVENT BOUNDARY
   ============================================================ */

/**
 * @section semantic-event-boundary
 *
 * targeting-spatial-hooks may emit:
 *
 * target.acquired
 * targeting.template-placed
 * targeting.completed
 *
 * semantic_event_bus remains transport authority.
 *
 * target.acquired:
 * acquisition happened
 *
 * targeting.completed:
 * acquisition + legality succeeded
 */

/* ============================================================
   ACTION ECONOMY / RESOURCE BOUNDARY
   ============================================================ */

/**
 * @section economy-resource-boundary
 *
 * action_economy and resource_service should normally reject impossible
 * actions before targeting prompts occur.
 *
 * Example:
 *
 * no Quick actions remaining
 * → block before TARGETING
 *
 * required Limited resource unavailable
 * → block before TARGETING
 *
 * This avoids unnecessary target-selection UI.
 */

/* ============================================================
   EXECUTION CONTEXT BOUNDARY
   ============================================================ */

/**
 * @section execution-context-boundary
 *
 * semantic_execution_context may carry:
 *
 * source identity
 * existing targets
 * targeting requirement
 * selected point
 * area/template
 *
 * targeting_spatial_service normalizes those values.
 *
 * Do not duplicate ExecutionContext as another targeting state model.
 */

/* ============================================================
   FRAME CONN RUNTIME COMPOSITION
   ============================================================ */

/**
 * @section frame-conn-runtime-composition
 *
 * Recommended setup:
 *
 * 1. configure native spatial adapter:
 *
 *    setTargetingSpatialQueryAdapter(...)
 *
 * 2. configure target acquisition adapter:
 *
 *    setTargetingAcquisitionAdapter(...)
 *
 * 3. later configure system bridge augmentation:
 *
 *    setTargetingAugmentationResolver(...)
 *
 * 4. register:
 *
 *    registerTargetingSpatialTransactionHooks()
 *
 * Register transaction hooks once.
 */

/* ============================================================
   TARGETING DATA FLOW
   ============================================================ */

/**
 * @section targeting-data-flow
 *
 * existing registry
 * native item/action data
 * actor-owned feature
 * system bridge augmentation
 *          │
 *          ▼
 * TargetingRequirement
 *          │
 *          ▼
 * execution targeting stage
 *          │
 *          ▼
 * resolver
 *          │
 *          ▼
 * TargetResolutionResult
 *          │
 *          ▼
 * final validation
 *          │
 *          ▼
 * validator
 *          │
 *          ├── spatial-query
 *          │      ├── Range
 *          │      ├── Threat
 *          │      ├── Sensors
 *          │      ├── LOS
 *          │      ├── adjacency
 *          │      └── occupancy
 *          │
 *          ▼
 * legal execution
 */

/* ============================================================
   PUBLIC BOUNDARY RULES
   ============================================================ */

/**
 * @section public-boundary-rules
 *
 * RULE 1
 *
 * Higher runtime modules should import targeting-spatial-service.js rather
 * than implementation siblings.
 *
 *
 * RULE 2
 *
 * Resolver owns selection.
 *
 *
 * RULE 3
 *
 * Validator owns legality.
 *
 *
 * RULE 4
 *
 * Query owns spatial facts.
 *
 *
 * RULE 5
 *
 * Native geometry/UI access must pass through injected adapters.
 *
 *
 * RULE 6
 *
 * Missing targeting semantics should be supplied through normalized
 * requirements/augmentation, not feature-specific UI conditionals.
 */

/* ============================================================
   DEPENDENCY DIRECTION
   ============================================================ */

/**
 * @section dependency-direction
 *
 * Intended:
 *
 * native_adapter/runtime geometry
 *          │
 *          ▼
 * targeting_spatial_service
 *          │
 *          ├── execution_transaction
 *          ├── semantic_event_bus
 *          └── future pathfinder consumers
 *
 *
 * actor_owned_feature_registry
 *          │
 *          ▼
 * targeting_spatial_service
 *
 * by supplying TargetingRequirement.
 *
 *
 * future system_bridge
 *          │
 *          ▼
 * targeting_spatial_service
 *
 * by supplying augmentation.
 *
 *
 * Forbidden:
 *
 * targeting_spatial_service
 * → runtime-orchestrator
 *
 * targeting_spatial_service
 * → actor_owned_feature_registry
 *
 * targeting_spatial_service
 * → system_bridge
 *
 * targeting_spatial_service
 * → feature-specific mechanic implementation
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
 * Remains native token/document/system authority.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Carries targeting inputs.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns targeting/final-validation timing.
 *
 *
 * action_economy/
 * ---------------
 *
 * Rejects unavailable economy before targeting where possible.
 *
 *
 * resource_service/
 * -----------------
 *
 * Rejects unavailable required resources before targeting where possible.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Receives targeting semantic events.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * No direct targeting dependency.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Next foundational module; will normalize actor-owned targeting semantics.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplements missing targeting metadata.
 *
 *
 * pathfinder/
 * -----------
 *
 * May reuse spatial query capabilities without becoming part of targeting
 * transaction flow.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * targeting-spatial-service.js is the public Frame Conn targeting/spatial
 * boundary.
 *
 * INVARIANT 2
 * Contract owns targeting/spatial shapes.
 *
 * INVARIANT 3
 * Query owns factual geometry.
 *
 * INVARIANT 4
 * Resolver owns acquisition.
 *
 * INVARIANT 5
 * Validator owns legality.
 *
 * INVARIANT 6
 * Hooks own execution_transaction integration.
 *
 * INVARIANT 7
 * Range, Threat, and Sensors remain distinct concepts.
 *
 * INVARIANT 8
 * Sensor-space visibility remains independent from ordinary visual
 * visibility.
 *
 * INVARIANT 9
 * Native Foundry/Lancer geometry access remains behind injected adapters.
 *
 * INVARIANT 10
 * Target cancellation occurs before native execution.
 *
 * INVARIANT 11
 * Invalid targeting blocks before native execution.
 *
 * INVARIANT 12
 * Actor-owned features may supply targeting requirements but do not own
 * targeting execution.
 *
 * INVARIANT 13
 * system_bridge may supplement targeting metadata but does not become a
 * geometry or targeting engine.
 *
 * INVARIANT 14
 * Pathfinder may reuse spatial facts but remains a separate movement
 * service.
 *
 * INVARIANT 15
 * Higher runtime modules should converge on this public boundary rather
 * than inventing parallel targeting/spatial systems.
 */