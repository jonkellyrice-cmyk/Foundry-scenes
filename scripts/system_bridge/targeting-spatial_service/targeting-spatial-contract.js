/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/targeting_spatial_service/targeting-spatial-contract.js
 */
/**
 * @file
 * @path main/targeting_spatial_service/targeting-spatial-contract.js
 * @module targeting-spatial-contract
 * @layer targeting-spatial-service-contract
 * @responsibility define-stable-targeting-spatial-query-and-validation-shapes
 * @public-boundary true
 * @side-effects none
 *
 * @consumed-by
 * - spatial-query.js
 * - targeting-resolver.js
 * - targeting-validator.js
 * - targeting-spatial-hooks.js
 * - targeting-spatial-service.js
 * - semantic_execution_context/*
 * - future actor_owned_feature_registry/*
 * - future system_bridge/*
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - execution_transaction/ supplies targeting/final-validation boundaries
 * - semantic_execution_context/ carries source/target identity
 * - semantic_event_bus/ provides targeting event vocabulary
 * - native_adapter/ remains native actor/item/token access authority
 * - future actor_owned_feature_registry/ may declare target requirements
 * - future system_bridge/ may supplement missing targeting metadata
 * - future pathfinder/movement systems may consume shared spatial queries
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - this contract defines geometry/query/result vocabulary only
 * - spatial-query.js owns spatial calculation
 * - targeting-resolver.js owns target acquisition/normalization
 * - targeting-validator.js owns legality checks
 * - targeting-spatial-hooks.js owns execution_transaction integration
 * - native_adapter remains native token/document boundary
 *
 * THIS FILE OWNS:
 * - target kinds
 * - targeting modes
 * - spatial point/token references
 * - range/threat/sensor/LOS/cover result shapes
 * - adjacency/occupancy result shapes
 * - area/template descriptors
 * - targeting requirement descriptors
 * - targeting request/result shapes
 * - validation issue/result shapes
 *
 * THIS FILE DOES NOT OWN:
 * - Foundry token lookup
 * - scene geometry execution
 * - raycasting
 * - target UI
 * - template placement UI
 * - legality evaluation implementation
 * - native Lancer action execution
 *
 * EDIT CONTRACT:
 * - no Foundry imports
 * - no Lancer imports
 * - no spatial computation
 * - no target mutation
 * - descriptors are immutable
 * - distinguish target acquisition from target legality
 */
/* ============================================================
   TARGET KIND
   ============================================================ */
export const TARGET_KIND =
  Object.freeze({
    CHARACTER:
      "character",
    MECH:
      "mech",
    PILOT:
      "pilot",
    NPC:
      "npc",
    TOKEN:
      "token",
    OBJECT:
      "object",
    SPACE:
      "space",
    POINT:
      "point",
    AREA:
      "area",
    TEMPLATE:
      "template",
    SELF:
      "self",
    NONE:
      "none"
  });
/* ============================================================
   TARGETING MODE
   ============================================================ */
export const TARGETING_MODE =
  Object.freeze({
    NONE:
      "none",
    SELF:
      "self",
    SINGLE:
      "single",
    MULTIPLE:
      "multiple",
    ALL_IN_AREA:
      "all-in-area",
    POINT:
      "point",
    AREA:
      "area",
    TEMPLATE:
      "template",
    ADJACENT:
      "adjacent",
    THREAT:
      "threat",
    SENSORS:
      "sensors",
    CUSTOM:
      "custom"
  });
/* ============================================================
   RANGE METRIC
   ============================================================ */
/**
 * @section range-metric
 */
export const SPATIAL_DISTANCE_MODE =
  Object.freeze({
    GRID:
      "grid",
    EUCLIDEAN:
      "euclidean",
    MANHATTAN:
      "manhattan",
    CHEBYSHEV:
      "chebyshev",
    SYSTEM:
      "system",
    CUSTOM:
      "custom"
  });
/* ============================================================
   RANGE KIND
   ============================================================ */
export const SPATIAL_RANGE_KIND =
  Object.freeze({
    RANGE:
      "range",
    THREAT:
      "threat",
    SENSORS:
      "sensors",
    ADJACENCY:
      "adjacency",
    BLAST:
      "blast",
    BURST:
      "burst",
    CONE:
      "cone",
    LINE:
      "line",
    TELEPORT:
      "teleport",
    MOVEMENT:
      "movement",
    CUSTOM:
      "custom"
  });
/* ============================================================
   LINE OF SIGHT
   ============================================================ */
export const LINE_OF_SIGHT_STATUS =
  Object.freeze({
    CLEAR:
      "clear",
    BLOCKED:
      "blocked",
    PARTIAL:
      "partial",
    UNKNOWN:
      "unknown",
    NOT_REQUIRED:
      "not-required"
  });
/* ============================================================
   COVER
   ============================================================ */
export const COVER_LEVEL =
  Object.freeze({
    NONE:
      "none",
    SOFT:
      "soft",
    HARD:
      "hard",
    TOTAL:
      "total",
    UNKNOWN:
      "unknown"
  });
/* ============================================================
   OCCUPANCY
   ============================================================ */
export const OCCUPANCY_STATUS =
  Object.freeze({
    UNOCCUPIED:
      "unoccupied",
    OCCUPIED:
      "occupied",
    SHARED:
      "shared",
    BLOCKED:
      "blocked",
    UNKNOWN:
      "unknown"
  });
/* ============================================================
   TARGET RELATIONSHIP
   ============================================================ */
export const TARGET_RELATIONSHIP =
  Object.freeze({
    SELF:
      "self",
    ALLY:
      "ally",
    ENEMY:
      "enemy",
    NEUTRAL:
      "neutral",
    OBJECT:
      "object",
    UNKNOWN:
      "unknown"
  });
/* ============================================================
   AREA SHAPE
   ============================================================ */
export const AREA_SHAPE =
  Object.freeze({
    BLAST:
      "blast",
    BURST:
      "burst",
    CONE:
      "cone",
    LINE:
      "line",
    CIRCLE:
      "circle",
    RECTANGLE:
      "rectangle",
    POLYGON:
      "polygon",
    CUSTOM:
      "custom"
  });
/* ============================================================
   TARGET VALIDATION STATUS
   ============================================================ */
export const TARGET_VALIDATION_STATUS =
  Object.freeze({
    VALID:
      "valid",
    INVALID:
      "invalid",
    PARTIAL:
      "partial",
    SKIPPED:
      "skipped",
    FAILED:
      "failed"
  });
/* ============================================================
   TARGET RESOLUTION STATUS
   ============================================================ */
export const TARGET_RESOLUTION_STATUS =
  Object.freeze({
    RESOLVED:
      "resolved",
    PARTIAL:
      "partial",
    NONE:
      "none",
    CANCELLED:
      "cancelled",
    FAILED:
      "failed"
  });
/* ============================================================
   TARGET FAILURE CODE
   ============================================================ */
export const TARGET_VALIDATION_FAILURE =
  Object.freeze({
    TARGET_REQUIRED:
      "target-required",
    TOO_FEW_TARGETS:
      "too-few-targets",
    TOO_MANY_TARGETS:
      "too-many-targets",
    INVALID_TARGET_KIND:
      "invalid-target-kind",
    INVALID_RELATIONSHIP:
      "invalid-relationship",
    OUT_OF_RANGE:
      "out-of-range",
    OUT_OF_THREAT:
      "out-of-threat",
    OUT_OF_SENSORS:
      "out-of-sensors",
    NOT_ADJACENT:
      "not-adjacent",
    LINE_OF_SIGHT_BLOCKED:
      "line-of-sight-blocked",
    COVER_INVALID:
      "cover-invalid",
    OCCUPANCY_INVALID:
      "occupancy-invalid",
    INVALID_AREA:
      "invalid-area",
    INVALID_TEMPLATE:
      "invalid-template",
    SOURCE_UNAVAILABLE:
      "source-unavailable",
    TARGET_UNAVAILABLE:
      "target-unavailable",
    UNKNOWN_GEOMETRY:
      "unknown-geometry"
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
   SPATIAL POINT
   ============================================================ */
export function createSpatialPoint({
  x,
  y,
  elevation = 0,
  sceneId = null,
  metadata = {}
} = {}) {
  if (
    !finiteNumber(x) ||
    !finiteNumber(y)
  ) {
    throw new TypeError(
      "Spatial point requires finite x/y."
    );
  }
  if (!finiteNumber(elevation)) {
    throw new TypeError(
      "Spatial point elevation must be finite."
    );
  }
  return Object.freeze({
    x,
    y,
    elevation,
    sceneId,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   SPATIAL FOOTPRINT
   ============================================================ */
/**
 * @section spatial-footprint
 *
 * Represents occupied token/mech footprint.
 */
export function createSpatialFootprint({
  size = 1,
  width = null,
  height = null,
  points = [],
  metadata = {}
} = {}) {
  if (
    !finiteNumber(size) ||
    size <= 0
  ) {
    throw new TypeError(
      "Spatial footprint size must be positive."
    );
  }
  return Object.freeze({
    size,
    width:
      finiteNumber(width)
        ? width
        : null,
    height:
      finiteNumber(height)
        ? height
        : null,
    points:
      freezeArray(points),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   SPATIAL ENTITY REFERENCE
   ============================================================ */
export function createSpatialEntityReference({
  kind =
    TARGET_KIND.TOKEN,
  actorUuid = null,
  tokenUuid = null,
  sceneId = null,
  name = null,
  position = null,
  footprint = null,
  size = null,
  disposition = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      TARGET_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid spatial entity kind: ${String(kind)}`
    );
  }
  return Object.freeze({
    kind,
    actorUuid,
    tokenUuid,
    sceneId,
    name,
    position,
    footprint,
    size:
      finiteNumber(size)
        ? size
        : null,
    disposition,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGET REFERENCE
   ============================================================ */
export function createTargetReference({
  id = null,
  kind =
    TARGET_KIND.TOKEN,
  relationship =
    TARGET_RELATIONSHIP.UNKNOWN,
  actorUuid = null,
  tokenUuid = null,
  sceneId = null,
  name = null,
  position = null,
  footprint = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      TARGET_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid target kind: ${String(kind)}`
    );
  }
  if (
    !isEnumValue(
      TARGET_RELATIONSHIP,
      relationship
    )
  ) {
    throw new TypeError(
      `Invalid target relationship: ${String(relationship)}`
    );
  }
  return Object.freeze({
    id:
      id ??
      tokenUuid ??
      actorUuid ??
      null,
    kind,
    relationship,
    actorUuid,
    tokenUuid,
    sceneId,
    name,
    position,
    footprint,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   DISTANCE RESULT
   ============================================================ */
export function createSpatialDistanceResult({
  source = null,
  target = null,
  distance = null,
  horizontalDistance = null,
  verticalDistance = null,
  mode =
    SPATIAL_DISTANCE_MODE.SYSTEM,
  valid = true,
  metadata = {}
} = {}) {
  if (
    distance != null &&
    !finiteNumber(distance)
  ) {
    throw new TypeError(
      "Spatial distance must be finite or null."
    );
  }
  return Object.freeze({
    source,
    target,
    distance,
    horizontalDistance:
      finiteNumber(horizontalDistance)
        ? horizontalDistance
        : null,
    verticalDistance:
      finiteNumber(verticalDistance)
        ? verticalDistance
        : null,
    mode,
    valid:
      Boolean(valid),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   RANGE QUERY RESULT
   ============================================================ */
export function createSpatialRangeResult({
  kind =
    SPATIAL_RANGE_KIND.RANGE,
  source = null,
  target = null,
  limit = null,
  distance = null,
  within = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      SPATIAL_RANGE_KIND,
      kind
    )
  ) {
    throw new TypeError(
      `Invalid spatial range kind: ${String(kind)}`
    );
  }
  return Object.freeze({
    kind,
    source,
    target,
    limit:
      finiteNumber(limit)
        ? limit
        : null,
    distance,
    within:
      within == null
        ? null
        : Boolean(within),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   LINE OF SIGHT RESULT
   ============================================================ */
export function createLineOfSightResult({
  source = null,
  target = null,
  status =
    LINE_OF_SIGHT_STATUS.UNKNOWN,
  blockedBy = [],
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      LINE_OF_SIGHT_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid line-of-sight status: ${String(status)}`
    );
  }
  return Object.freeze({
    source,
    target,
    status,
    clear:
      status ===
      LINE_OF_SIGHT_STATUS.CLEAR,
    blockedBy:
      freezeArray(blockedBy),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   COVER RESULT
   ============================================================ */
export function createCoverResult({
  source = null,
  target = null,
  level =
    COVER_LEVEL.UNKNOWN,
  providers = [],
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      COVER_LEVEL,
      level
    )
  ) {
    throw new TypeError(
      `Invalid cover level: ${String(level)}`
    );
  }
  return Object.freeze({
    source,
    target,
    level,
    providers:
      freezeArray(providers),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   ADJACENCY RESULT
   ============================================================ */
export function createAdjacencyResult({
  source = null,
  target = null,
  adjacent = false,
  distance = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    source,
    target,
    adjacent:
      Boolean(adjacent),
    distance,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   OCCUPANCY RESULT
   ============================================================ */
export function createOccupancyResult({
  point = null,
  status =
    OCCUPANCY_STATUS.UNKNOWN,
  occupants = [],
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      OCCUPANCY_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid occupancy status: ${String(status)}`
    );
  }
  return Object.freeze({
    point,
    status,
    occupants:
      freezeArray(occupants),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   SENSOR RESULT
   ============================================================ */
export function createSensorRangeResult({
  source = null,
  target = null,
  sensorRange = null,
  distance = null,
  withinSensors = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    source,
    target,
    sensorRange:
      finiteNumber(sensorRange)
        ? sensorRange
        : null,
    distance,
    withinSensors:
      withinSensors == null
        ? null
        : Boolean(
            withinSensors
          ),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   THREAT RESULT
   ============================================================ */
export function createThreatRangeResult({
  source = null,
  target = null,
  threat = null,
  distance = null,
  withinThreat = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    source,
    target,
    threat:
      finiteNumber(threat)
        ? threat
        : null,
    distance,
    withinThreat:
      withinThreat == null
        ? null
        : Boolean(
            withinThreat
          ),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   AREA DESCRIPTOR
   ============================================================ */
export function createAreaDescriptor({
  shape,
  origin = null,
  radius = null,
  length = null,
  width = null,
  direction = null,
  angle = null,
  includeOrigin = true,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      AREA_SHAPE,
      shape
    )
  ) {
    throw new TypeError(
      `Invalid area shape: ${String(shape)}`
    );
  }
  return Object.freeze({
    shape,
    origin,
    radius:
      finiteNumber(radius)
        ? radius
        : null,
    length:
      finiteNumber(length)
        ? length
        : null,
    width:
      finiteNumber(width)
        ? width
        : null,
    direction:
      finiteNumber(direction)
        ? direction
        : null,
    angle:
      finiteNumber(angle)
        ? angle
        : null,
    includeOrigin:
      Boolean(includeOrigin),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   AREA QUERY RESULT
   ============================================================ */
export function createAreaQueryResult({
  area,
  targets = [],
  spaces = [],
  metadata = {}
} = {}) {
  if (!area) {
    throw new TypeError(
      "Area query result requires area."
    );
  }
  return Object.freeze({
    area,
    targets:
      freezeArray(targets),
    spaces:
      freezeArray(spaces),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGETING REQUIREMENT
   ============================================================ */
/**
 * @section targeting-requirement
 *
 * Generic target legality declaration.
 */
export function createTargetingRequirement({
  mode =
    TARGETING_MODE.NONE,
  targetKinds = null,
  relationships = null,
  minimumTargets = 0,
  maximumTargets = null,
  range = null,
  threat = null,
  sensors = null,
  requiresLineOfSight = false,
  requiresAdjacency = false,
  requiresUnoccupiedSpace = false,
  area = null,
  allowSelf = false,
  allowDuplicateTargets = false,
  customValidatorId = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      TARGETING_MODE,
      mode
    )
  ) {
    throw new TypeError(
      `Invalid targeting mode: ${String(mode)}`
    );
  }
  if (
    !finiteNumber(minimumTargets) ||
    minimumTargets < 0
  ) {
    throw new TypeError(
      "minimumTargets must be non-negative."
    );
  }
  if (
    maximumTargets != null &&
    (
      !finiteNumber(maximumTargets) ||
      maximumTargets < minimumTargets
    )
  ) {
    throw new TypeError(
      "maximumTargets must be >= minimumTargets or null."
    );
  }
  return Object.freeze({
    mode,
    targetKinds:
      targetKinds == null
        ? null
        : freezeArray(
            Array.isArray(targetKinds)
              ? targetKinds
              : [targetKinds]
          ),
    relationships:
      relationships == null
        ? null
        : freezeArray(
            Array.isArray(relationships)
              ? relationships
              : [relationships]
          ),
    minimumTargets,
    maximumTargets,
    range:
      finiteNumber(range)
        ? range
        : null,
    threat:
      finiteNumber(threat)
        ? threat
        : null,
    sensors:
      finiteNumber(sensors)
        ? sensors
        : null,
    requiresLineOfSight:
      Boolean(
        requiresLineOfSight
      ),
    requiresAdjacency:
      Boolean(
        requiresAdjacency
      ),
    requiresUnoccupiedSpace:
      Boolean(
        requiresUnoccupiedSpace
      ),
    area,
    allowSelf:
      Boolean(allowSelf),
    allowDuplicateTargets:
      Boolean(
        allowDuplicateTargets
      ),
    customValidatorId,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGETING REQUEST
   ============================================================ */
export function createTargetingRequest({
  source = null,
  requirement = null,
  selectedTargets = [],
  selectedPoint = null,
  area = null,
  metadata = {}
} = {}) {
  return Object.freeze({
    source,
    requirement:
      requirement ??
      createTargetingRequirement(),
    selectedTargets:
      freezeArray(
        selectedTargets
      ),
    selectedPoint,
    area,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGET RESOLUTION RESULT
   ============================================================ */
export function createTargetResolutionResult({
  status =
    TARGET_RESOLUTION_STATUS.RESOLVED,
  request = null,
  source = null,
  targets = [],
  point = null,
  area = null,
  reason = null,
  error = null,
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      TARGET_RESOLUTION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid target resolution status: ${String(status)}`
    );
  }
  return Object.freeze({
    status,
    request,
    source,
    targets:
      freezeArray(targets),
    point,
    area,
    reason,
    error,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGET VALIDATION ISSUE
   ============================================================ */
export function createTargetValidationIssue({
  code,
  message = null,
  target = null,
  expected = null,
  actual = null,
  metadata = {}
} = {}) {
  if (!requiredString(code)) {
    throw new TypeError(
      "Target validation issue requires code."
    );
  }
  return Object.freeze({
    code,
    message:
      message ??
      code,
    target,
    expected,
    actual,
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   PER-TARGET VALIDATION RESULT
   ============================================================ */
export function createSingleTargetValidationResult({
  target,
  valid = true,
  distance = null,
  range = null,
  threat = null,
  sensors = null,
  lineOfSight = null,
  cover = null,
  adjacency = null,
  issues = [],
  metadata = {}
} = {}) {
  if (!target) {
    throw new TypeError(
      "Single target validation requires target."
    );
  }
  return Object.freeze({
    target,
    valid:
      Boolean(valid),
    distance,
    range,
    threat,
    sensors,
    lineOfSight,
    cover,
    adjacency,
    issues:
      freezeArray(issues),
    metadata:
      freezeObject(metadata)
  });
}
/* ============================================================
   TARGET VALIDATION RESULT
   ============================================================ */
export function createTargetValidationResult({
  status =
    TARGET_VALIDATION_STATUS.VALID,
  request = null,
  source = null,
  targets = [],
  targetResults = [],
  issues = [],
  metadata = {}
} = {}) {
  if (
    !isEnumValue(
      TARGET_VALIDATION_STATUS,
      status
    )
  ) {
    throw new TypeError(
      `Invalid target validation status: ${String(status)}`
    );
  }
  return Object.freeze({
    status,
    valid:
      status ===
      TARGET_VALIDATION_STATUS.VALID,
    request,
    source,
    targets:
      freezeArray(targets),
    targetResults:
      freezeArray(
        targetResults
      ),
    issues:
      freezeArray(issues),
    metadata:
      freezeObject(metadata)
  });
}
export function targetValidationSucceeded(
  options
) {
  return createTargetValidationResult({
    ...options,
    status:
      TARGET_VALIDATION_STATUS.VALID
  });
}
export function targetValidationFailed(
  options
) {
  return createTargetValidationResult({
    ...options,
    status:
      TARGET_VALIDATION_STATUS.INVALID
  });
}
export function targetValidationPartial(
  options
) {
  return createTargetValidationResult({
    ...options,
    status:
      TARGET_VALIDATION_STATUS.PARTIAL
  });
}
export function targetValidationSkipped(
  options
) {
  return createTargetValidationResult({
    ...options,
    status:
      TARGET_VALIDATION_STATUS.SKIPPED
  });
}
/* ============================================================
   TARGET REQUIREMENT HELPERS
   ============================================================ */
export function createSingleTargetRequirement(
  options = {}
) {
  return createTargetingRequirement({
    ...options,
    mode:
      options.mode ??
      TARGETING_MODE.SINGLE,
    minimumTargets:
      1,
    maximumTargets:
      1
  });
}
export function createMultipleTargetRequirement({
  minimumTargets = 1,
  maximumTargets = null,
  ...options
} = {}) {
  return createTargetingRequirement({
    ...options,
    mode:
      options.mode ??
      TARGETING_MODE.MULTIPLE,
    minimumTargets,
    maximumTargets
  });
}
export function createSelfTargetRequirement(
  options = {}
) {
  return createTargetingRequirement({
    ...options,
    mode:
      TARGETING_MODE.SELF,
    minimumTargets:
      1,
    maximumTargets:
      1,
    allowSelf:
      true
  });
}
export function createAdjacentTargetRequirement(
  options = {}
) {
  return createTargetingRequirement({
    ...options,
    mode:
      TARGETING_MODE.ADJACENT,
    requiresAdjacency:
      true,
    minimumTargets:
      options.minimumTargets ??
      1
  });
}
export function createThreatTargetRequirement({
  threat,
  ...options
} = {}) {
  return createTargetingRequirement({
    ...options,
    mode:
      TARGETING_MODE.THREAT,
    threat,
    minimumTargets:
      options.minimumTargets ??
      1
  });
}
export function createSensorTargetRequirement({
  sensors,
  ...options
} = {}) {
  return createTargetingRequirement({
    ...options,
    mode:
      TARGETING_MODE.SENSORS,
    sensors,
    minimumTargets:
      options.minimumTargets ??
      1
  });
}
export function createAreaTargetRequirement({
  area,
  ...options
} = {}) {
  return createTargetingRequirement({
    ...options,
    mode:
      options.mode ??
      TARGETING_MODE.AREA,
    area
  });
}
/* ============================================================
   RANGE / THREAT / SENSOR RULE
   ============================================================ */
/**
 * @section range-threat-sensor-rule
 *
 * These are distinct semantic checks:
 *
 * RANGE:
 * attack/ability reach
 *
 * THREAT:
 * melee/reaction threat reach
 *
 * SENSORS:
 * tech/sensor interaction reach
 *
 * A feature may require more than one.
 *
 * Do not collapse them into one generic "distance limit" field at runtime.
 */
/* ============================================================
   ELEVATION RULE
   ============================================================ */
/**
 * @section elevation-rule
 *
 * SpatialPoint includes elevation.
 *
 * spatial-query.js determines how system distance uses it.
 *
 * Contract does not assume:
 *
 * 2D-only distance
 * 3D Euclidean distance
 * horizontal + vertical sum
 *
 * The selected SPATIAL_DISTANCE_MODE/native system adapter determines that.
 */
/* ============================================================
   FOOTPRINT / SIZE RULE
   ============================================================ */
/**
 * @section footprint-size-rule
 *
 * Lancer characters may occupy more than one space.
 *
 * Distance/adjacency should therefore be calculated between occupied
 * footprints, not always token centers.
 *
 * spatial-query.js owns the exact calculation.
 */
/* ============================================================
   SELF TARGET RULE
   ============================================================ */
/**
 * @section self-target-rule
 *
 * SELF is explicit.
 *
 * allowSelf = false on ordinary hostile/friendly target requirements unless
 * the source rule allows self-targeting.
 *
 * Do not infer self-legality solely from relationship.
 */
/* ============================================================
   SENSOR / DARKNESS RULE
   ============================================================ */
/**
 * @section sensor-darkness-rule
 *
 * Sensors and visual visibility are separate concerns.
 *
 * Frame Conn requirements include detecting enemy identity/outline within
 * Sensors even when ordinary scene darkness prevents visual perception.
 *
 * targeting-spatial service therefore needs:
 *
 * spatial/sensor legality
 *
 * separate from:
 *
 * Foundry visual visibility.
 *
 * This contract represents sensor range independent of scene lighting.
 */
/* ============================================================
   TARGET ACQUISITION / VALIDATION RULE
   ============================================================ */
/**
 * @section acquisition-validation-rule
 *
 * targeting-resolver.js answers:
 *
 * "What did the user/system select?"
 *
 * targeting-validator.js answers:
 *
 * "Is that selection legal?"
 *
 * Do not collapse these phases.
 *
 * This preserves transaction flow:
 *
 * prevalidate
 * → target acquisition
 * → final target-dependent validation
 * → execute
 */
/* ============================================================
   TEMPLATE / AREA RULE
   ============================================================ */
/**
 * @section template-area-rule
 *
 * Area descriptor is semantic geometry.
 *
 * Foundry MeasuredTemplate/document/UI conversion belongs below
 * targeting-resolver/spatial-query adapters.
 *
 * Contract remains Foundry-independent.
 */
/* ============================================================
   OCCUPANCY RULE
   ============================================================ */
/**
 * @section occupancy-rule
 *
 * Some mechanics require:
 *
 * ending movement in unoccupied space
 * teleport destination unoccupied
 * dismount location valid
 *
 * Occupancy is therefore a first-class spatial query.
 *
 * Movement/pathfinder systems may reuse the same contract.
 */
/* ============================================================
   EXECUTION CONTEXT RELATIONSHIP
   ============================================================ */
/**
 * @section execution-context-relationship
 *
 * semantic_execution_context may carry:
 *
 * context.targets
 * context.targeting
 * context.weapon
 * context.source
 *
 * targeting-resolver should normalize those into:
 *
 * TargetingRequest
 * TargetReference[]
 *
 * Do not refactor ExecutionContext merely to mirror this contract.
 */
/* ============================================================
   EXECUTION TRANSACTION RELATIONSHIP
   ============================================================ */
/**
 * @section execution-transaction-relationship
 *
 * Intended sequence:
 *
 * BEFORE_PRE_VALIDATE
 * → validate non-target prerequisites
 *
 * TARGETING
 * → targeting-resolver
 *
 * FINAL_VALIDATE
 * → targeting-validator
 *
 * EXECUTE
 * → native/semantic mechanic
 *
 * targeting-spatial-hooks.js attaches to those stable boundaries.
 */
/* ============================================================
   ACTOR-OWNED FEATURE RELATIONSHIP
   ============================================================ */
/**
 * @section actor-owned-feature-relationship
 *
 * actor_owned_feature_registry may normalize:
 *
 * Talent action:
 * target one ally in Sensors
 *
 * Trait:
 * when adjacent enemy moves
 *
 * Weapon special:
 * Blast 1 within Range 10
 *
 * System:
 * target one hostile character in Sensors
 *
 * These should reference TargetingRequirement/AreaDescriptor rather than
 * custom feature-specific target shapes.
 */
/* ============================================================
   SYSTEM BRIDGE RELATIONSHIP
   ============================================================ */
/**
 * @section system-bridge-relationship
 *
 * system_bridge may supplement missing targeting semantics:
 *
 * {
 *   targeting: TargetingRequirement
 * }
 *
 * Example:
 *
 * existing registry knows action exists
 * native Item knows weapon Range
 * augmentation supplies special target mode/LOS rule
 *
 * composer produces one runtime targeting descriptor.
 *
 * Bridge does not perform spatial validation.
 */
/* ============================================================
   PATHFINDER RELATIONSHIP
   ============================================================ */
/**
 * @section pathfinder-relationship
 *
 * future pathfinding may reuse:
 *
 * SpatialPoint
 * SpatialEntityReference
 * OccupancyResult
 * distance queries
 * elevation
 *
 * Pathfinding remains a separate movement concern.
 *
 * Do not add movement route search semantics to this contract.
 */
/* ============================================================
   SEMANTIC EVENT RELATIONSHIP
   ============================================================ */
/**
 * @section semantic-event-relationship
 *
 * targeting_spatial_service may emit:
 *
 * target.acquired
 * target.removed
 * targeting.completed
 * targeting.template-placed
 *
 * SemanticEventTarget may carry a compact subset of TargetReference.
 *
 * semantic_event_bus remains transport authority.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * targeting-spatial-contract.js contains no geometry execution.
 *
 * INVARIANT 2
 * Target acquisition and target legality remain separate.
 *
 * INVARIANT 3
 * Range, Threat, and Sensors remain distinct concepts.
 *
 * INVARIANT 4
 * Sensors are independent from visual scene visibility.
 *
 * INVARIANT 5
 * Elevation is preserved in spatial references.
 *
 * INVARIANT 6
 * Size/footprint must be representable for multi-space characters.
 *
 * INVARIANT 7
 * LOS and cover are separate query results.
 *
 * INVARIANT 8
 * Occupancy is a first-class spatial query.
 *
 * INVARIANT 9
 * Area/template geometry is represented independently from Foundry
 * MeasuredTemplate implementation.
 *
 * INVARIANT 10
 * targeting-validator owns legality; spatial-query owns geometry facts.
 *
 * INVARIANT 11
 * actor_owned_feature_registry may reference targeting descriptors but does
 * not execute spatial checks.
 *
 * INVARIANT 12
 * system_bridge may supplement targeting metadata but does not become a
 * targeting engine.
 *
 * INVARIANT 13
 * pathfinder may reuse spatial primitives but remains a separate service.
 *
 * INVARIANT 14
 * This file remains free of Foundry/Lancer runtime imports.
 */