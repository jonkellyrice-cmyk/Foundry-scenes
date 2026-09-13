/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/targeting_spatial_service/targeting-spatial-query.js
 */

/**
 * @file
 * @path main/targeting_spatial_service/targeting-spatial-query.js
 * @module targeting-spatial-query
 * @layer targeting-spatial-service-query
 * @responsibility resolve-normalized-spatial-facts-without-target-legality-decisions
 * @public-boundary false
 * @side-effects delegated-native-scene-query-only
 *
 * @depends-on
 * - targeting-spatial-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumed by targeting-resolver.js
 * - consumed by targeting-validator.js
 * - consumed by targeting-spatial-service.js
 * - future pathfinder may reuse spatial query primitives
 * - future actor_owned_feature_registry/ supplies targeting requirements
 * - future system_bridge/ supplies missing targeting metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - native_adapter/ remains native Foundry/Lancer token/document boundary
 * - targeting-spatial-contract.js owns normalized result shapes
 * - targeting-resolver.js owns target acquisition
 * - targeting-validator.js owns legality
 * - this file answers spatial facts only
 *
 * THIS FILE OWNS:
 * - normalized spatial query adapter configuration
 * - source/target footprint distance queries
 * - elevation-aware distance result normalization
 * - adjacency queries
 * - threat range queries
 * - sensor range queries
 * - ordinary range queries
 * - LOS queries
 * - cover queries
 * - occupancy queries
 * - area inclusion queries
 * - scene-entity spatial normalization
 *
 * THIS FILE DOES NOT OWN:
 * - target selection UI
 * - target legality
 * - weapon/action-specific targeting requirements
 * - Foundry raycast implementation
 * - Foundry token lookup implementation
 * - pathfinding
 * - movement budget
 * - native action execution
 *
 * EDIT CONTRACT:
 * - no direct Foundry globals
 * - all native scene geometry passes through injected adapter
 * - preserve elevation and footprint
 * - do not convert spatial facts into legality decisions here
 * - Range, Threat, Sensors remain separate query concepts
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  AREA_SHAPE,
  COVER_LEVEL,
  LINE_OF_SIGHT_STATUS,
  OCCUPANCY_STATUS,
  SPATIAL_DISTANCE_MODE,
  SPATIAL_RANGE_KIND,
  TARGET_KIND,
  createAdjacencyResult,
  createAreaQueryResult,
  createCoverResult,
  createLineOfSightResult,
  createOccupancyResult,
  createSensorRangeResult,
  createSpatialDistanceResult,
  createSpatialEntityReference,
  createSpatialFootprint,
  createSpatialPoint,
  createSpatialRangeResult,
  createThreatRangeResult
} from "./targeting-spatial-contract.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const TARGETING_SPATIAL_QUERY_MODULE_ID =
  "lancer-frame-conn.targeting-spatial-query";

export const TARGETING_SPATIAL_QUERY_MODULE_VERSION =
  1;

/* ============================================================
   SPATIAL QUERY ADAPTER
   ============================================================ */

/**
 * @section spatial-query-adapter
 *
 * Runtime composition injects native scene geometry.
 *
 * Recommended interface:
 *
 * {
 *   resolveEntity(reference)
 *
 *   measureDistance(source, target, options?)
 *
 *   testLineOfSight(source, target, options?)
 *
 *   resolveCover(source, target, options?)
 *
 *   resolveOccupancy(point, options?)
 *
 *   resolveArea(area, options?)
 *
 *   getSceneEntities(sceneId, options?)
 * }
 *
 * Only resolveEntity() + measureDistance() are fundamental.
 *
 * Remaining capabilities may be absent and queries will normalize to
 * UNKNOWN rather than guess.
 */

let targetingSpatialQueryAdapter =
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

function finiteNumber(value) {
  return Number.isFinite(value);
}

function requiredFunction(
  value,
  label
) {
  if (
    typeof value !==
    "function"
  ) {
    throw new TypeError(
      `${label} must be a function.`
    );
  }

  return value;
}

function normalizeNumber(
  value,
  fallback = null
) {
  return finiteNumber(value)
    ? value
    : fallback;
}

function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}

/* ============================================================
   ADAPTER CONFIGURATION
   ============================================================ */

export function setTargetingSpatialQueryAdapter(
  adapter
) {
  if (adapter == null) {
    targetingSpatialQueryAdapter =
      null;

    return true;
  }

  if (!isObject(adapter)) {
    throw new TypeError(
      "Targeting spatial query adapter must be object or null."
    );
  }

  requiredFunction(
    adapter.resolveEntity,
    "Targeting spatial adapter resolveEntity"
  );

  requiredFunction(
    adapter.measureDistance,
    "Targeting spatial adapter measureDistance"
  );

  targetingSpatialQueryAdapter =
    adapter;

  return true;
}

export function getTargetingSpatialQueryAdapter() {
  return targetingSpatialQueryAdapter;
}

export function hasTargetingSpatialQueryAdapter() {
  return Boolean(
    targetingSpatialQueryAdapter &&
    typeof targetingSpatialQueryAdapter.resolveEntity ===
      "function" &&
    typeof targetingSpatialQueryAdapter.measureDistance ===
      "function"
  );
}

export function assertTargetingSpatialQueryAdapter() {
  if (!hasTargetingSpatialQueryAdapter()) {
    throw new Error(
      "Targeting spatial service requires a configured spatial query adapter."
    );
  }

  return targetingSpatialQueryAdapter;
}

/* ============================================================
   POSITION NORMALIZATION
   ============================================================ */

export function normalizeSpatialPoint(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value.x == null ||
    value.y == null
  ) {
    return null;
  }

  return createSpatialPoint({
    x:
      Number(value.x),

    y:
      Number(value.y),

    elevation:
      normalizeNumber(
        value.elevation,
        0
      ),

    sceneId:
      value.sceneId ??
      null,

    metadata:
      value.metadata ??
      {}
  });
}

/* ============================================================
   FOOTPRINT NORMALIZATION
   ============================================================ */

export function normalizeSpatialFootprint(
  value,
  {
    fallbackSize = 1
  } = {}
) {
  if (!value) {
    return createSpatialFootprint({
      size:
        fallbackSize
    });
  }

  return createSpatialFootprint({
    size:
      normalizeNumber(
        value.size,
        fallbackSize
      ),

    width:
      normalizeNumber(
        value.width,
        null
      ),

    height:
      normalizeNumber(
        value.height,
        null
      ),

    points:
      value.points ??
      [],

    metadata:
      value.metadata ??
      {}
  });
}

/* ============================================================
   ENTITY NORMALIZATION
   ============================================================ */

/**
 * @section entity-normalization
 */

export function normalizeSpatialEntity(
  value
) {
  if (!value) {
    return null;
  }

  return createSpatialEntityReference({
    kind:
      value.kind ??
      TARGET_KIND.TOKEN,

    actorUuid:
      value.actorUuid ??
      value.actor?.uuid ??
      null,

    tokenUuid:
      value.tokenUuid ??
      value.token?.uuid ??
      value.uuid ??
      null,

    sceneId:
      value.sceneId ??
      value.scene?.id ??
      null,

    name:
      value.name ??
      null,

    position:
      normalizeSpatialPoint(
        value.position ??
        value
      ),

    footprint:
      normalizeSpatialFootprint(
        value.footprint,
        {
          fallbackSize:
            normalizeNumber(
              value.size,
              1
            )
        }
      ),

    size:
      normalizeNumber(
        value.size,
        null
      ),

    disposition:
      value.disposition ??
      null,

    metadata:
      value.metadata ??
      {}
  });
}

/* ============================================================
   ENTITY RESOLUTION
   ============================================================ */

/**
 * @section entity-resolution
 */

export async function resolveSpatialEntity(
  reference
) {
  if (!reference) {
    return null;
  }

  /*
   * Already normalized enough to use directly.
   */
  if (
    reference.position &&
    (
      reference.actorUuid ||
      reference.tokenUuid ||
      reference.kind
    )
  ) {
    return normalizeSpatialEntity(
      reference
    );
  }

  const adapter =
    assertTargetingSpatialQueryAdapter();

  const resolved =
    await adapter.resolveEntity(
      reference
    );

  return normalizeSpatialEntity(
    resolved
  );
}

/* ============================================================
   MULTI-ENTITY RESOLUTION
   ============================================================ */

export async function resolveSpatialEntities(
  references
) {
  const results = [];

  for (
    const reference of
      references ?? []
  ) {
    const resolved =
      await resolveSpatialEntity(
        reference
      );

    if (resolved) {
      results.push(
        resolved
      );
    }
  }

  return Object.freeze(
    results
  );
}

/* ============================================================
   DISTANCE QUERY
   ============================================================ */

/**
 * @section distance-query
 *
 * Adapter should measure closest legal footprint-to-footprint distance when
 * source/target occupy multiple spaces.
 */

export async function querySpatialDistance(
  sourceReference,
  targetReference,
  {
    mode =
      SPATIAL_DISTANCE_MODE.SYSTEM,

    includeElevation = true,

    metadata = {}
  } = {}
) {
  const source =
    await resolveSpatialEntity(
      sourceReference
    );

  const target =
    await resolveSpatialEntity(
      targetReference
    );

  if (
    !source ||
    !target
  ) {
    return createSpatialDistanceResult({
      source,
      target,

      distance:
        null,

      mode,

      valid:
        false,

      metadata: {
        ...metadata,

        reason:
          "spatial-entity-unavailable"
      }
    });
  }

  const adapter =
    assertTargetingSpatialQueryAdapter();

  const raw =
    await adapter.measureDistance(
      source,
      target,
      {
        mode,
        includeElevation
      }
    );

  if (
    finiteNumber(raw)
  ) {
    return createSpatialDistanceResult({
      source,
      target,

      distance:
        raw,

      mode,

      valid:
        true,

      metadata
    });
  }

  return createSpatialDistanceResult({
    source,
    target,

    distance:
      normalizeNumber(
        raw?.distance,
        null
      ),

    horizontalDistance:
      normalizeNumber(
        raw?.horizontalDistance,
        null
      ),

    verticalDistance:
      normalizeNumber(
        raw?.verticalDistance,
        null
      ),

    mode:
      raw?.mode ??
      mode,

    valid:
      raw?.valid ??
      finiteNumber(
        raw?.distance
      ),

    metadata: {
      ...metadata,
      ...(
        raw?.metadata ??
        {}
      )
    }
  });
}

/* ============================================================
   GENERIC RANGE QUERY
   ============================================================ */

export async function querySpatialRange(
  sourceReference,
  targetReference,
  limit,
  {
    kind =
      SPATIAL_RANGE_KIND.RANGE,

    mode =
      SPATIAL_DISTANCE_MODE.SYSTEM,

    includeElevation = true,

    metadata = {}
  } = {}
) {
  const distance =
    await querySpatialDistance(
      sourceReference,
      targetReference,
      {
        mode,
        includeElevation
      }
    );

  const normalizedLimit =
    normalizeNumber(
      limit,
      null
    );

  return createSpatialRangeResult({
    kind,

    source:
      distance.source,

    target:
      distance.target,

    limit:
      normalizedLimit,

    distance,

    within:
      (
        distance.valid &&
        finiteNumber(
          distance.distance
        ) &&
        finiteNumber(
          normalizedLimit
        )
      )
        ? distance.distance <=
          normalizedLimit
        : null,

    metadata
  });
}

/* ============================================================
   ORDINARY RANGE QUERY
   ============================================================ */

export async function queryRange(
  sourceReference,
  targetReference,
  range,
  options = {}
) {
  return querySpatialRange(
    sourceReference,
    targetReference,
    range,
    {
      ...options,

      kind:
        SPATIAL_RANGE_KIND.RANGE
    }
  );
}

/* ============================================================
   THREAT QUERY
   ============================================================ */

export async function queryThreat(
  sourceReference,
  targetReference,
  threat,
  options = {}
) {
  const rangeResult =
    await querySpatialRange(
      sourceReference,
      targetReference,
      threat,
      {
        ...options,

        kind:
          SPATIAL_RANGE_KIND.THREAT
      }
    );

  return createThreatRangeResult({
    source:
      rangeResult.source,

    target:
      rangeResult.target,

    threat:
      rangeResult.limit,

    distance:
      rangeResult.distance,

    withinThreat:
      rangeResult.within,

    metadata:
      rangeResult.metadata
  });
}

/* ============================================================
   SENSOR QUERY
   ============================================================ */

/**
 * @section sensor-query
 *
 * Sensors are spatial range, not visual visibility.
 *
 * Scene darkness does not make this false.
 */

export async function querySensors(
  sourceReference,
  targetReference,
  sensors,
  options = {}
) {
  const rangeResult =
    await querySpatialRange(
      sourceReference,
      targetReference,
      sensors,
      {
        ...options,

        kind:
          SPATIAL_RANGE_KIND.SENSORS
      }
    );

  return createSensorRangeResult({
    source:
      rangeResult.source,

    target:
      rangeResult.target,

    sensorRange:
      rangeResult.limit,

    distance:
      rangeResult.distance,

    withinSensors:
      rangeResult.within,

    metadata:
      rangeResult.metadata
  });
}

/* ============================================================
   ADJACENCY QUERY
   ============================================================ */

/**
 * @section adjacency-query
 *
 * Default adjacency threshold is one grid space.
 *
 * Adapter distance remains footprint-aware.
 */

export async function queryAdjacency(
  sourceReference,
  targetReference,
  {
    adjacencyDistance = 1,

    mode =
      SPATIAL_DISTANCE_MODE.SYSTEM,

    includeElevation = true,

    metadata = {}
  } = {}
) {
  const distance =
    await querySpatialDistance(
      sourceReference,
      targetReference,
      {
        mode,
        includeElevation
      }
    );

  return createAdjacencyResult({
    source:
      distance.source,

    target:
      distance.target,

    adjacent:
      Boolean(
        distance.valid &&
        finiteNumber(
          distance.distance
        ) &&
        distance.distance <=
          adjacencyDistance
      ),

    distance,

    metadata
  });
}

/* ============================================================
   LINE OF SIGHT QUERY
   ============================================================ */

export async function queryLineOfSight(
  sourceReference,
  targetReference,
  options = {}
) {
  const source =
    await resolveSpatialEntity(
      sourceReference
    );

  const target =
    await resolveSpatialEntity(
      targetReference
    );

  if (
    !source ||
    !target
  ) {
    return createLineOfSightResult({
      source,
      target,

      status:
        LINE_OF_SIGHT_STATUS.UNKNOWN,

      metadata: {
        reason:
          "spatial-entity-unavailable"
      }
    });
  }

  const adapter =
    assertTargetingSpatialQueryAdapter();

  if (
    typeof adapter.testLineOfSight !==
    "function"
  ) {
    return createLineOfSightResult({
      source,
      target,

      status:
        LINE_OF_SIGHT_STATUS.UNKNOWN,

      metadata: {
        reason:
          "line-of-sight-adapter-unavailable"
      }
    });
  }

  const raw =
    await adapter.testLineOfSight(
      source,
      target,
      options
    );

  if (
    typeof raw ===
    "boolean"
  ) {
    return createLineOfSightResult({
      source,
      target,

      status:
        raw
          ? LINE_OF_SIGHT_STATUS.CLEAR
          : LINE_OF_SIGHT_STATUS.BLOCKED
    });
  }

  return createLineOfSightResult({
    source,
    target,

    status:
      raw?.status ??
      LINE_OF_SIGHT_STATUS.UNKNOWN,

    blockedBy:
      raw?.blockedBy ??
      [],

    metadata:
      raw?.metadata ??
      {}
  });
}

/* ============================================================
   COVER QUERY
   ============================================================ */

export async function queryCover(
  sourceReference,
  targetReference,
  options = {}
) {
  const source =
    await resolveSpatialEntity(
      sourceReference
    );

  const target =
    await resolveSpatialEntity(
      targetReference
    );

  if (
    !source ||
    !target
  ) {
    return createCoverResult({
      source,
      target,

      level:
        COVER_LEVEL.UNKNOWN,

      metadata: {
        reason:
          "spatial-entity-unavailable"
      }
    });
  }

  const adapter =
    assertTargetingSpatialQueryAdapter();

  if (
    typeof adapter.resolveCover !==
    "function"
  ) {
    return createCoverResult({
      source,
      target,

      level:
        COVER_LEVEL.UNKNOWN,

      metadata: {
        reason:
          "cover-adapter-unavailable"
      }
    });
  }

  const raw =
    await adapter.resolveCover(
      source,
      target,
      options
    );

  if (
    typeof raw ===
    "string"
  ) {
    return createCoverResult({
      source,
      target,

      level:
        raw
    });
  }

  return createCoverResult({
    source,
    target,

    level:
      raw?.level ??
      COVER_LEVEL.UNKNOWN,

    providers:
      raw?.providers ??
      [],

    metadata:
      raw?.metadata ??
      {}
  });
}

/* ============================================================
   OCCUPANCY QUERY
   ============================================================ */

export async function queryOccupancy(
  pointReference,
  options = {}
) {
  const point =
    normalizeSpatialPoint(
      pointReference
    );

  if (!point) {
    return createOccupancyResult({
      point:
        null,

      status:
        OCCUPANCY_STATUS.UNKNOWN,

      metadata: {
        reason:
          "invalid-spatial-point"
      }
    });
  }

  const adapter =
    assertTargetingSpatialQueryAdapter();

  if (
    typeof adapter.resolveOccupancy !==
    "function"
  ) {
    return createOccupancyResult({
      point,

      status:
        OCCUPANCY_STATUS.UNKNOWN,

      metadata: {
        reason:
          "occupancy-adapter-unavailable"
      }
    });
  }

  const raw =
    await adapter.resolveOccupancy(
      point,
      options
    );

  if (
    typeof raw ===
    "boolean"
  ) {
    return createOccupancyResult({
      point,

      status:
        raw
          ? OCCUPANCY_STATUS.OCCUPIED
          : OCCUPANCY_STATUS.UNOCCUPIED
    });
  }

  return createOccupancyResult({
    point,

    status:
      raw?.status ??
      OCCUPANCY_STATUS.UNKNOWN,

    occupants:
      raw?.occupants ??
      [],

    metadata:
      raw?.metadata ??
      {}
  });
}

/* ============================================================
   UNOCCUPIED SPACE QUERY
   ============================================================ */

export async function isSpatialPointUnoccupied(
  pointReference,
  options = {}
) {
  const occupancy =
    await queryOccupancy(
      pointReference,
      options
    );

  return (
    occupancy.status ===
    OCCUPANCY_STATUS.UNOCCUPIED
  );
}

/* ============================================================
   AREA QUERY
   ============================================================ */

/**
 * @section area-query
 *
 * Adapter resolves which entities/spaces fall inside semantic AreaDescriptor.
 */

export async function queryArea(
  area,
  options = {}
) {
  if (!area) {
    throw new TypeError(
      "queryArea requires AreaDescriptor."
    );
  }

  const adapter =
    assertTargetingSpatialQueryAdapter();

  if (
    typeof adapter.resolveArea !==
    "function"
  ) {
    return createAreaQueryResult({
      area,

      targets:
        [],

      spaces:
        [],

      metadata: {
        reason:
          "area-adapter-unavailable"
      }
    });
  }

  const raw =
    await adapter.resolveArea(
      area,
      options
    );

  const targets =
    await resolveSpatialEntities(
      raw?.targets ??
      []
    );

  const spaces =
    (
      raw?.spaces ??
      []
    )
      .map(
        normalizeSpatialPoint
      )
      .filter(Boolean);

  return createAreaQueryResult({
    area,

    targets,

    spaces,

    metadata:
      raw?.metadata ??
      {}
  });
}

/* ============================================================
   AREA TARGET MEMBERSHIP
   ============================================================ */

export async function isEntityInsideArea(
  entityReference,
  area,
  options = {}
) {
  const entity =
    await resolveSpatialEntity(
      entityReference
    );

  if (!entity) {
    return false;
  }

  const areaResult =
    await queryArea(
      area,
      options
    );

  return areaResult
    .targets
    .some(
      candidate =>
        (
          entity.tokenUuid &&
          candidate.tokenUuid ===
            entity.tokenUuid
        ) ||
        (
          entity.actorUuid &&
          candidate.actorUuid ===
            entity.actorUuid
        )
    );
}

/* ============================================================
   SCENE ENTITY QUERY
   ============================================================ */

export async function querySceneSpatialEntities(
  sceneId,
  options = {}
) {
  const adapter =
    assertTargetingSpatialQueryAdapter();

  if (
    typeof adapter.getSceneEntities !==
    "function"
  ) {
    return Object.freeze([]);
  }

  const raw =
    await adapter.getSceneEntities(
      sceneId,
      options
    );

  return resolveSpatialEntities(
    raw ??
    []
  );
}

/* ============================================================
   SENSOR ENTITY QUERY
   ============================================================ */

/**
 * @section sensor-entity-query
 *
 * Used by Frame Conn sensor presentation:
 *
 * return spatially detectable entities within Sensors regardless of ordinary
 * visual darkness.
 */

export async function queryEntitiesWithinSensors(
  sourceReference,
  sensorRange,
  {
    sceneId = null,

    predicate = null,

    ...options
  } = {}
) {
  const source =
    await resolveSpatialEntity(
      sourceReference
    );

  if (!source) {
    return Object.freeze([]);
  }

  const entities =
    await querySceneSpatialEntities(
      sceneId ??
      source.sceneId,
      options
    );

  const matches = [];

  for (
    const entity of
      entities
  ) {
    if (
      source.tokenUuid &&
      entity.tokenUuid ===
        source.tokenUuid
    ) {
      continue;
    }

    if (
      source.actorUuid &&
      entity.actorUuid ===
        source.actorUuid
    ) {
      continue;
    }

    if (
      typeof predicate ===
        "function" &&
      !await predicate(
        entity
      )
    ) {
      continue;
    }

    const sensors =
      await querySensors(
        source,
        entity,
        sensorRange,
        options
      );

    if (
      sensors.withinSensors
    ) {
      matches.push(
        Object.freeze({
          entity,
          sensors
        })
      );
    }
  }

  return Object.freeze(
    matches
  );
}

/* ============================================================
   CLOSEST TARGET QUERY
   ============================================================ */

export async function queryClosestSpatialEntity(
  sourceReference,
  targetReferences,
  options = {}
) {
  let closest =
    null;

  for (
    const targetReference of
      targetReferences ?? []
  ) {
    const distance =
      await querySpatialDistance(
        sourceReference,
        targetReference,
        options
      );

    if (
      !distance.valid ||
      !finiteNumber(
        distance.distance
      )
    ) {
      continue;
    }

    if (
      !closest ||
      distance.distance <
        closest.distance.distance
    ) {
      closest =
        Object.freeze({
          entity:
            distance.target,

          distance
        });
    }
  }

  return closest;
}

/* ============================================================
   RANGE BATCH QUERY
   ============================================================ */

export async function queryTargetsWithinRange(
  sourceReference,
  targetReferences,
  limit,
  options = {}
) {
  const results = [];

  for (
    const targetReference of
      targetReferences ?? []
  ) {
    const range =
      await queryRange(
        sourceReference,
        targetReference,
        limit,
        options
      );

    if (range.within) {
      results.push(
        range
      );
    }
  }

  return Object.freeze(
    results
  );
}

/* ============================================================
   THREAT BATCH QUERY
   ============================================================ */

export async function queryTargetsWithinThreat(
  sourceReference,
  targetReferences,
  threat,
  options = {}
) {
  const results = [];

  for (
    const targetReference of
      targetReferences ?? []
  ) {
    const result =
      await queryThreat(
        sourceReference,
        targetReference,
        threat,
        options
      );

    if (
      result.withinThreat
    ) {
      results.push(
        result
      );
    }
  }

  return Object.freeze(
    results
  );
}

/* ============================================================
   SENSOR BATCH QUERY
   ============================================================ */

export async function queryTargetsWithinSensors(
  sourceReference,
  targetReferences,
  sensors,
  options = {}
) {
  const results = [];

  for (
    const targetReference of
      targetReferences ?? []
  ) {
    const result =
      await querySensors(
        sourceReference,
        targetReference,
        sensors,
        options
      );

    if (
      result.withinSensors
    ) {
      results.push(
        result
      );
    }
  }

  return Object.freeze(
    results
  );
}

/* ============================================================
   SPATIAL FACT BUNDLE
   ============================================================ */

/**
 * @section spatial-fact-bundle
 *
 * Convenience for targeting-validator.js.
 *
 * Only requested facts are calculated.
 */

export async function querySpatialFacts(
  sourceReference,
  targetReference,
  {
    range = null,
    threat = null,
    sensors = null,

    lineOfSight = false,
    cover = false,
    adjacency = false,

    distanceMode =
      SPATIAL_DISTANCE_MODE.SYSTEM,

    metadata = {}
  } = {}
) {
  const facts = {
    source:
      await resolveSpatialEntity(
        sourceReference
      ),

    target:
      await resolveSpatialEntity(
        targetReference
      ),

    distance:
      null,

    range:
      null,

    threat:
      null,

    sensors:
      null,

    lineOfSight:
      null,

    cover:
      null,

    adjacency:
      null,

    metadata:
      Object.freeze({
        ...metadata
      })
  };

  if (
    facts.source &&
    facts.target
  ) {
    facts.distance =
      await querySpatialDistance(
        facts.source,
        facts.target,
        {
          mode:
            distanceMode
        }
      );
  }

  if (
    finiteNumber(range)
  ) {
    facts.range =
      await queryRange(
        facts.source,
        facts.target,
        range,
        {
          mode:
            distanceMode
        }
      );
  }

  if (
    finiteNumber(threat)
  ) {
    facts.threat =
      await queryThreat(
        facts.source,
        facts.target,
        threat,
        {
          mode:
            distanceMode
        }
      );
  }

  if (
    finiteNumber(sensors)
  ) {
    facts.sensors =
      await querySensors(
        facts.source,
        facts.target,
        sensors,
        {
          mode:
            distanceMode
        }
      );
  }

  if (lineOfSight) {
    facts.lineOfSight =
      await queryLineOfSight(
        facts.source,
        facts.target
      );
  }

  if (cover) {
    facts.cover =
      await queryCover(
        facts.source,
        facts.target
      );
  }

  if (adjacency) {
    facts.adjacency =
      await queryAdjacency(
        facts.source,
        facts.target,
        {
          mode:
            distanceMode
        }
      );
  }

  return Object.freeze(
    facts
  );
}

/* ============================================================
   FOOTPRINT DISTANCE NOTES
   ============================================================ */

/**
 * @section footprint-distance-notes
 *
 * Lancer characters may occupy multiple spaces.
 *
 * Adapter measureDistance() should therefore use:
 *
 * closest occupied source space
 * ↔ closest occupied target space
 *
 * rather than token-center distance where the native/grid system supports
 * footprint-aware measurement.
 *
 * This file preserves footprint information but does not implement native
 * grid geometry itself.
 */

/* ============================================================
   ELEVATION NOTES
   ============================================================ */

/**
 * @section elevation-notes
 *
 * Spatial entities preserve elevation.
 *
 * querySpatialDistance() passes:
 *
 * includeElevation
 *
 * to the injected adapter.
 *
 * Exact Lancer/Foundry vertical-distance interpretation is adapter-owned.
 *
 * Do not invent a universal 3D distance formula here.
 */

/* ============================================================
   SENSORS / VISIBILITY NOTES
   ============================================================ */

/**
 * @section sensors-visibility-notes
 *
 * Sensors answer:
 *
 * "Is this character spatially within sensor range?"
 *
 * It does NOT answer:
 *
 * "Can ordinary Foundry vision currently render this token?"
 *
 * This separation is required for Frame Conn sensor UI:
 *
 * enemy outline/name can remain available within Sensors even in darkness.
 *
 * Relationship/enemy filtering belongs to the caller/resolver, not the
 * distance query.
 */

/* ============================================================
   LOS NOTES
   ============================================================ */

/**
 * @section los-notes
 *
 * If native LOS capability is unavailable:
 *
 * status = UNKNOWN
 *
 * Never assume:
 *
 * UNKNOWN = CLEAR
 *
 * targeting-validator decides how a targeting requirement treats unknown
 * geometry.
 */

/* ============================================================
   COVER NOTES
   ============================================================ */

/**
 * @section cover-notes
 *
 * Cover is queried separately from LOS.
 *
 * LOS clear does not imply:
 *
 * cover = NONE
 *
 * LOS blocked does not automatically define exact cover level.
 *
 * Native scene/system geometry adapter remains authoritative.
 */

/* ============================================================
   OCCUPANCY NOTES
   ============================================================ */

/**
 * @section occupancy-notes
 *
 * Occupancy queries support:
 *
 * teleport destinations
 * boost-through-character mechanics
 * mount/dismount placement
 * pathfinder destinations
 *
 * Whether sharing space is legal is a rule question for targeting/movement
 * validation, not this query module.
 */

/* ============================================================
   AREA NOTES
   ============================================================ */

/**
 * @section area-notes
 *
 * Semantic area descriptors include:
 *
 * Blast
 * Burst
 * Cone
 * Line
 * Circle
 * Rectangle
 * Polygon
 *
 * Adapter converts semantic geometry to native Foundry/grid queries.
 *
 * This file normalizes the returned targets/spaces.
 */

/* ============================================================
   PATHFINDER NOTES
   ============================================================ */

/**
 * @section pathfinder-notes
 *
 * Future pathfinder may reuse:
 *
 * resolveSpatialEntity()
 * querySpatialDistance()
 * queryOccupancy()
 * querySceneSpatialEntities()
 *
 * Pathfinder still owns:
 *
 * route search
 * terrain cost
 * climb/jump/drop decisions
 * fly/hover/teleport route selection
 * movement budget optimization
 */

/* ============================================================
   TARGETING VALIDATOR NOTES
   ============================================================ */

/**
 * @section targeting-validator-notes
 *
 * targeting-validator should consume factual query results:
 *
 * querySpatialFacts(...)
 *
 * then apply requirement rules:
 *
 * range required?
 * sensors required?
 * LOS required?
 * adjacency required?
 *
 * This file must not produce:
 *
 * valid target / invalid target
 *
 * except factual booleans such as:
 *
 * withinThreat
 * withinSensors
 * adjacent
 */

/* ============================================================
   ACTOR OWNED FEATURE NOTES
   ============================================================ */

/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry may normalize:
 *
 * weapon Threat
 * weapon Range
 * system Sensors requirement
 * Talent adjacency requirement
 *
 * Those become TargetingRequirement values.
 *
 * Spatial queries remain generic regardless of feature provenance.
 */

/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */

/**
 * @section system-bridge-notes
 *
 * system_bridge may supplement:
 *
 * range
 * sensors
 * threat
 * LOS
 * adjacency
 * occupancy
 * area
 *
 * requirements.
 *
 * It should never supply custom geometry implementations here.
 *
 * Geometry remains adapter/service-owned.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getTargetingSpatialQueryDiagnostics() {
  return Object.freeze({
    id:
      TARGETING_SPATIAL_QUERY_MODULE_ID,

    version:
      TARGETING_SPATIAL_QUERY_MODULE_VERSION,

    adapterConfigured:
      hasTargetingSpatialQueryAdapter(),

    adapterCapabilities:
      Object.freeze({
        resolveEntity:
          typeof targetingSpatialQueryAdapter?.resolveEntity ===
          "function",

        measureDistance:
          typeof targetingSpatialQueryAdapter?.measureDistance ===
          "function",

        testLineOfSight:
          typeof targetingSpatialQueryAdapter?.testLineOfSight ===
          "function",

        resolveCover:
          typeof targetingSpatialQueryAdapter?.resolveCover ===
          "function",

        resolveOccupancy:
          typeof targetingSpatialQueryAdapter?.resolveOccupancy ===
          "function",

        resolveArea:
          typeof targetingSpatialQueryAdapter?.resolveArea ===
          "function",

        getSceneEntities:
          typeof targetingSpatialQueryAdapter?.getSceneEntities ===
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
 * Runtime composition should implement the spatial query adapter using
 * confirmed native Foundry/Lancer primitives.
 *
 * This module must not independently reach into Token/Canvas APIs.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies source/target native identities.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Targeting resolver/validator call these query primitives during
 * targeting/final-validation stages.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Targeting service may emit targeting domain events after resolver work.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * No direct dependency.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later supplies normalized target requirements.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplements missing spatial semantics.
 *
 *
 * pathfinder
 * ----------
 *
 * May reuse factual spatial queries without changing targeting ownership.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * targeting-spatial-query.js answers spatial facts only.
 *
 * INVARIANT 2
 * It does not decide target legality.
 *
 * INVARIANT 3
 * Native/Foundry geometry access occurs only through injected adapter.
 *
 * INVARIANT 4
 * Range, Threat, and Sensors remain separate query types.
 *
 * INVARIANT 5
 * Sensors remain independent from ordinary visual visibility.
 *
 * INVARIANT 6
 * Footprint and size are preserved for multi-space characters.
 *
 * INVARIANT 7
 * Elevation is preserved and delegated to native/system distance semantics.
 *
 * INVARIANT 8
 * Unknown LOS/cover/occupancy state is represented explicitly, never guessed.
 *
 * INVARIANT 9
 * LOS and cover remain separate facts.
 *
 * INVARIANT 10
 * Occupancy is reusable by targeting, movement, teleport, and pathfinding.
 *
 * INVARIANT 11
 * Area geometry remains semantic at this boundary and native below it.
 *
 * INVARIANT 12
 * targeting-validator owns legal/illegal interpretation of query facts.
 *
 * INVARIANT 13
 * actor_owned_feature_registry may supply requirements but does not alter
 * query semantics.
 *
 * INVARIANT 14
 * system_bridge may supplement requirements but does not own geometry.
 *
 * INVARIANT 15
 * Future pathfinding may consume this module but remains a separate service.
 */