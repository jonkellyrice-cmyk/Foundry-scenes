/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/targeting_spatial_service/targeting-spatial-validator.js
 */

/**
 * @file
 * @path main/targeting_spatial_service/targeting-spatial-validator.js
 * @module targeting-spatial-validator
 * @layer targeting-spatial-service-validation
 * @responsibility validate-resolved-targets-against-normalized-targeting-and-spatial-requirements
 * @public-boundary false
 * @side-effects delegated-spatial-query-only
 *
 * @depends-on
 * - targeting-spatial-contract
 * - targeting-spatial-query
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes TargetResolutionResult from targeting-spatial-resolver.js
 * - consumed by targeting-spatial-hooks.js
 * - consumed by targeting-spatial-service.js
 * - validates final target-dependent execution prerequisites
 * - future actor_owned_feature_registry/ supplies normalized targeting rules
 * - future system_bridge/ supplies missing targeting metadata
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - targeting-spatial-resolver.js owns target acquisition
 * - targeting-spatial-query.js owns spatial facts
 * - targeting-spatial-validator.js owns target legality
 * - execution_transaction/ owns validation-stage sequencing
 * - native_adapter remains native geometry/document authority
 *
 * THIS FILE OWNS:
 * - target count validation
 * - target kind validation
 * - self-target validation
 * - relationship validation
 * - Range validation
 * - Threat validation
 * - Sensors validation
 * - adjacency validation
 * - LOS validation
 * - occupancy validation
 * - area/point target validation
 * - custom targeting validator registry
 * - aggregate targeting validation result
 *
 * THIS FILE DOES NOT OWN:
 * - target acquisition/prompting
 * - spatial geometry implementation
 * - native token lookup
 * - target UI
 * - attack/tech execution
 * - cover bonuses/attack resolution
 * - feature-specific effect execution
 *
 * EDIT CONTRACT:
 * - validate facts; do not acquire targets
 * - all geometry passes through targeting-spatial-query.js
 * - preserve UNKNOWN spatial facts as explicit validation failures where
 *   the rule requires proof
 * - do not infer native mechanics not established by metadata/query adapter
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  LINE_OF_SIGHT_STATUS,
  OCCUPANCY_STATUS,
  TARGET_KIND,
  TARGET_RELATIONSHIP,
  TARGETING_MODE,
  TARGET_VALIDATION_FAILURE,
  TARGET_VALIDATION_STATUS,
  createSingleTargetValidationResult,
  createTargetValidationIssue,
  createTargetValidationResult,
  targetValidationFailed,
  targetValidationPartial,
  targetValidationSkipped,
  targetValidationSucceeded
} from "./targeting-spatial-contract.js";

import {
  isSpatialPointUnoccupied,
  queryAdjacency,
  queryLineOfSight,
  queryRange,
  querySensors,
  querySpatialFacts,
  queryThreat,
  resolveSpatialEntity
} from "./targeting-spatial-query.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const TARGETING_SPATIAL_VALIDATOR_MODULE_ID =
  "lancer-frame-conn.targeting-spatial-validator";

export const TARGETING_SPATIAL_VALIDATOR_MODULE_VERSION =
  1;

/* ============================================================
   CUSTOM VALIDATOR REGISTRY
   ============================================================ */

/**
 * @section custom-validator-registry
 *
 * Used only for targeting requirements that cannot be represented by the
 * common contract.
 *
 * System bridge may reference validator IDs.
 *
 * Validators should return:
 *
 * true
 * false
 * TargetValidationIssue
 * TargetValidationIssue[]
 */

const CUSTOM_TARGETING_VALIDATORS =
  new Map();

/* ============================================================
   PRIVATE HELPERS
   ============================================================ */

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

function createIssue(
  code,
  options = {}
) {
  return createTargetValidationIssue({
    code,
    ...options
  });
}

/* ============================================================
   CUSTOM VALIDATOR REGISTRATION
   ============================================================ */

export function registerCustomTargetingValidator(
  id,
  validator
) {
  if (!requiredString(id)) {
    throw new TypeError(
      "Custom targeting validator requires id."
    );
  }

  if (
    typeof validator !==
    "function"
  ) {
    throw new TypeError(
      "Custom targeting validator requires function."
    );
  }

  CUSTOM_TARGETING_VALIDATORS.set(
    id,
    validator
  );

  return Object.freeze({
    id,

    dispose() {
      return unregisterCustomTargetingValidator(
        id
      );
    }
  });
}

export function unregisterCustomTargetingValidator(
  id
) {
  return CUSTOM_TARGETING_VALIDATORS.delete(
    id
  );
}

export function getCustomTargetingValidator(
  id
) {
  return (
    CUSTOM_TARGETING_VALIDATORS.get(
      id
    ) ??
    null
  );
}

export function clearCustomTargetingValidators() {
  const count =
    CUSTOM_TARGETING_VALIDATORS.size;

  CUSTOM_TARGETING_VALIDATORS.clear();

  return count;
}

/* ============================================================
   TARGET COUNT VALIDATION
   ============================================================ */

/**
 * @section target-count-validation
 */

function validateTargetCount(
  requirement,
  targets
) {
  const issues = [];

  const count =
    targets.length;

  const minimum =
    requirement.minimumTargets ??
    0;

  const maximum =
    requirement.maximumTargets;

  if (
    count < minimum
  ) {
    issues.push(
      createIssue(
        count === 0
          ? TARGET_VALIDATION_FAILURE.TARGET_REQUIRED
          : TARGET_VALIDATION_FAILURE.TOO_FEW_TARGETS,
        {
          message:
            count === 0
              ? "A target is required."
              : "Too few targets selected.",

          expected:
            minimum,

          actual:
            count
        }
      )
    );
  }

  if (
    finiteNumber(maximum) &&
    count > maximum
  ) {
    issues.push(
      createIssue(
        TARGET_VALIDATION_FAILURE.TOO_MANY_TARGETS,
        {
          message:
            "Too many targets selected.",

          expected:
            maximum,

          actual:
            count
        }
      )
    );
  }

  return issues;
}

/* ============================================================
   TARGET KIND VALIDATION
   ============================================================ */

function validateTargetKind(
  requirement,
  target
) {
  const allowed =
    requirement.targetKinds;

  if (
    !allowed ||
    allowed.length === 0
  ) {
    return [];
  }

  if (
    allowed.includes(
      target.kind
    )
  ) {
    return [];
  }

  return [
    createIssue(
      TARGET_VALIDATION_FAILURE.INVALID_TARGET_KIND,
      {
        target,

        message:
          "Selected target is not an allowed target kind.",

        expected:
          allowed,

        actual:
          target.kind
      }
    )
  ];
}

/* ============================================================
   SELF TARGET VALIDATION
   ============================================================ */

function validateSelfTarget(
  requirement,
  source,
  target
) {
  if (
    requirement.allowSelf
  ) {
    return [];
  }

  const sameActor =
    Boolean(
      source?.actorUuid &&
      target?.actorUuid &&
      source.actorUuid ===
        target.actorUuid
    );

  const sameToken =
    Boolean(
      source?.tokenUuid &&
      target?.tokenUuid &&
      source.tokenUuid ===
        target.tokenUuid
    );

  if (
    sameActor ||
    sameToken
  ) {
    return [
      createIssue(
        TARGET_VALIDATION_FAILURE.INVALID_RELATIONSHIP,
        {
          target,

          message:
            "This action cannot target the acting character.",

          expected:
            "non-self",

          actual:
            TARGET_RELATIONSHIP.SELF
        }
      )
    ];
  }

  return [];
}

/* ============================================================
   RELATIONSHIP VALIDATION
   ============================================================ */

function validateTargetRelationship(
  requirement,
  target
) {
  const allowed =
    requirement.relationships;

  if (
    !allowed ||
    allowed.length === 0
  ) {
    return [];
  }

  if (
    allowed.includes(
      target.relationship
    )
  ) {
    return [];
  }

  return [
    createIssue(
      TARGET_VALIDATION_FAILURE.INVALID_RELATIONSHIP,
      {
        target,

        message:
          "Selected target has an invalid relationship.",

        expected:
          allowed,

        actual:
          target.relationship
      }
    )
  ];
}

/* ============================================================
   ORDINARY RANGE VALIDATION
   ============================================================ */

async function validateTargetRange(
  requirement,
  source,
  target
) {
  if (
    !finiteNumber(
      requirement.range
    )
  ) {
    return Object.freeze({
      result:
        null,

      issues:
        Object.freeze([])
    });
  }

  const result =
    await queryRange(
      source,
      target,
      requirement.range
    );

  if (
    result.within ===
    true
  ) {
    return Object.freeze({
      result,
      issues:
        Object.freeze([])
    });
  }

  return Object.freeze({
    result,

    issues:
      Object.freeze([
        createIssue(
          result.within ===
            false
            ? TARGET_VALIDATION_FAILURE.OUT_OF_RANGE
            : TARGET_VALIDATION_FAILURE.UNKNOWN_GEOMETRY,
          {
            target,

            message:
              result.within ===
                false
                ? "Target is outside Range."
                : "Target Range could not be determined.",

            expected:
              requirement.range,

            actual:
              result
                ?.distance
                ?.distance ??
              null
          }
        )
      ])
  });
}

/* ============================================================
   THREAT VALIDATION
   ============================================================ */

async function validateTargetThreat(
  requirement,
  source,
  target
) {
  if (
    !finiteNumber(
      requirement.threat
    )
  ) {
    return Object.freeze({
      result:
        null,

      issues:
        Object.freeze([])
    });
  }

  const result =
    await queryThreat(
      source,
      target,
      requirement.threat
    );

  if (
    result.withinThreat ===
    true
  ) {
    return Object.freeze({
      result,
      issues:
        Object.freeze([])
    });
  }

  return Object.freeze({
    result,

    issues:
      Object.freeze([
        createIssue(
          result.withinThreat ===
            false
            ? TARGET_VALIDATION_FAILURE.OUT_OF_THREAT
            : TARGET_VALIDATION_FAILURE.UNKNOWN_GEOMETRY,
          {
            target,

            message:
              result.withinThreat ===
                false
                ? "Target is outside Threat."
                : "Target Threat distance could not be determined.",

            expected:
              requirement.threat,

            actual:
              result
                ?.distance
                ?.distance ??
              null
          }
        )
      ])
  });
}

/* ============================================================
   SENSOR VALIDATION
   ============================================================ */

async function validateTargetSensors(
  requirement,
  source,
  target
) {
  if (
    !finiteNumber(
      requirement.sensors
    )
  ) {
    return Object.freeze({
      result:
        null,

      issues:
        Object.freeze([])
    });
  }

  const result =
    await querySensors(
      source,
      target,
      requirement.sensors
    );

  if (
    result.withinSensors ===
    true
  ) {
    return Object.freeze({
      result,
      issues:
        Object.freeze([])
    });
  }

  return Object.freeze({
    result,

    issues:
      Object.freeze([
        createIssue(
          result.withinSensors ===
            false
            ? TARGET_VALIDATION_FAILURE.OUT_OF_SENSORS
            : TARGET_VALIDATION_FAILURE.UNKNOWN_GEOMETRY,
          {
            target,

            message:
              result.withinSensors ===
                false
                ? "Target is outside Sensors."
                : "Target sensor distance could not be determined.",

            expected:
              requirement.sensors,

            actual:
              result
                ?.distance
                ?.distance ??
              null
          }
        )
      ])
  });
}

/* ============================================================
   ADJACENCY VALIDATION
   ============================================================ */

async function validateTargetAdjacency(
  requirement,
  source,
  target
) {
  if (
    !requirement.requiresAdjacency
  ) {
    return Object.freeze({
      result:
        null,

      issues:
        Object.freeze([])
    });
  }

  const result =
    await queryAdjacency(
      source,
      target
    );

  if (result.adjacent) {
    return Object.freeze({
      result,
      issues:
        Object.freeze([])
    });
  }

  return Object.freeze({
    result,

    issues:
      Object.freeze([
        createIssue(
          TARGET_VALIDATION_FAILURE.NOT_ADJACENT,
          {
            target,

            message:
              "Target is not adjacent."
          }
        )
      ])
  });
}

/* ============================================================
   LINE OF SIGHT VALIDATION
   ============================================================ */

async function validateTargetLineOfSight(
  requirement,
  source,
  target
) {
  if (
    !requirement.requiresLineOfSight
  ) {
    return Object.freeze({
      result:
        null,

      issues:
        Object.freeze([])
    });
  }

  const result =
    await queryLineOfSight(
      source,
      target
    );

  if (
    result.status ===
    LINE_OF_SIGHT_STATUS.CLEAR
  ) {
    return Object.freeze({
      result,
      issues:
        Object.freeze([])
    });
  }

  if (
    result.status ===
    LINE_OF_SIGHT_STATUS.BLOCKED
  ) {
    return Object.freeze({
      result,

      issues:
        Object.freeze([
          createIssue(
            TARGET_VALIDATION_FAILURE.LINE_OF_SIGHT_BLOCKED,
            {
              target,

              message:
                "Line of sight to target is blocked."
            }
          )
        ])
    });
  }

  /*
   * When LOS is explicitly required, UNKNOWN is not accepted as clear.
   */
  return Object.freeze({
    result,

    issues:
      Object.freeze([
        createIssue(
          TARGET_VALIDATION_FAILURE.UNKNOWN_GEOMETRY,
          {
            target,

            message:
              "Required line of sight could not be determined.",

            expected:
              LINE_OF_SIGHT_STATUS.CLEAR,

            actual:
              result.status
          }
        )
      ])
  });
}

/* ============================================================
   SINGLE TARGET VALIDATION
   ============================================================ */

/**
 * @section single-target-validation
 */

export async function validateSingleTarget(
  source,
  target,
  requirement
) {
  if (!target) {
    return createSingleTargetValidationResult({
      target: {
        id:
          null
      },

      valid:
        false,

      issues: [
        createIssue(
          TARGET_VALIDATION_FAILURE.TARGET_UNAVAILABLE,
          {
            message:
              "Target is unavailable."
          }
        )
      ]
    });
  }

  const issues = [];

  issues.push(
    ...validateTargetKind(
      requirement,
      target
    )
  );

  issues.push(
    ...validateSelfTarget(
      requirement,
      source,
      target
    )
  );

  issues.push(
    ...validateTargetRelationship(
      requirement,
      target
    )
  );

  const range =
    await validateTargetRange(
      requirement,
      source,
      target
    );

  issues.push(
    ...range.issues
  );

  const threat =
    await validateTargetThreat(
      requirement,
      source,
      target
    );

  issues.push(
    ...threat.issues
  );

  const sensors =
    await validateTargetSensors(
      requirement,
      source,
      target
    );

  issues.push(
    ...sensors.issues
  );

  const adjacency =
    await validateTargetAdjacency(
      requirement,
      source,
      target
    );

  issues.push(
    ...adjacency.issues
  );

  const lineOfSight =
    await validateTargetLineOfSight(
      requirement,
      source,
      target
    );

  issues.push(
    ...lineOfSight.issues
  );

  return createSingleTargetValidationResult({
    target,

    valid:
      issues.length === 0,

    distance:
      range
        ?.result
        ?.distance ??
      threat
        ?.result
        ?.distance ??
      sensors
        ?.result
        ?.distance ??
      null,

    range:
      range.result,

    threat:
      threat.result,

    sensors:
      sensors.result,

    lineOfSight:
      lineOfSight.result,

    adjacency:
      adjacency.result,

    issues
  });
}

/* ============================================================
   POINT VALIDATION
   ============================================================ */

async function validateTargetPoint(
  resolution,
  requirement
) {
  const issues = [];

  const point =
    resolution.point;

  if (!point) {
    issues.push(
      createIssue(
        TARGET_VALIDATION_FAILURE.TARGET_REQUIRED,
        {
          message:
            "A target point is required."
        }
      )
    );

    return Object.freeze({
      valid:
        false,

      issues:
        Object.freeze(
          issues
        )
    });
  }

  if (
    requirement.requiresUnoccupiedSpace
  ) {
    const unoccupied =
      await isSpatialPointUnoccupied(
        point
      );

    if (!unoccupied) {
      issues.push(
        createIssue(
          TARGET_VALIDATION_FAILURE.OCCUPANCY_INVALID,
          {
            message:
              "Target space must be unoccupied.",

            target:
              point,

            expected:
              OCCUPANCY_STATUS.UNOCCUPIED
          }
        )
      );
    }
  }

  return Object.freeze({
    valid:
      issues.length === 0,

    issues:
      Object.freeze(
        issues
      )
  });
}

/* ============================================================
   AREA VALIDATION
   ============================================================ */

async function validateTargetArea(
  resolution,
  requirement
) {
  const issues = [];

  if (!resolution.area) {
    issues.push(
      createIssue(
        TARGET_VALIDATION_FAILURE.INVALID_AREA,
        {
          message:
            "A valid target area is required."
        }
      )
    );
  }

  /*
   * Target count and individual target legality are still validated through
   * the common path below.
   */

  return Object.freeze({
    valid:
      issues.length === 0,

    issues:
      Object.freeze(
        issues
      )
  });
}

/* ============================================================
   CUSTOM VALIDATOR EXECUTION
   ============================================================ */

async function runCustomTargetingValidator(
  requirement,
  {
    source,
    resolution,
    targetResults
  }
) {
  const validatorId =
    requirement.customValidatorId;

  if (!validatorId) {
    return Object.freeze([]);
  }

  const validator =
    getCustomTargetingValidator(
      validatorId
    );

  if (!validator) {
    return Object.freeze([
      createIssue(
        TARGET_VALIDATION_FAILURE.UNKNOWN_GEOMETRY,
        {
          message:
            `Custom targeting validator is unavailable: ${validatorId}`,

          expected:
            validatorId,

          actual:
            null
        }
      )
    ]);
  }

  try {
    const raw =
      await validator({
        requirement,
        source,
        resolution,
        targetResults
      });

    if (
      raw === true ||
      raw == null
    ) {
      return Object.freeze([]);
    }

    if (raw === false) {
      return Object.freeze([
        createIssue(
          TARGET_VALIDATION_FAILURE.INVALID_TARGET_KIND,
          {
            message:
              "Custom targeting validation failed.",

            metadata: {
              validatorId
            }
          }
        )
      ]);
    }

    const issues =
      normalizeArray(
        raw
      )
        .filter(Boolean)
        .map(
          issue =>
            issue.code
              ? issue
              : createIssue(
                  TARGET_VALIDATION_FAILURE.INVALID_TARGET_KIND,
                  {
                    message:
                      String(issue),

                    metadata: {
                      validatorId
                    }
                  }
                )
        );

    return Object.freeze(
      issues
    );
  } catch (error) {
    return Object.freeze([
      createIssue(
        TARGET_VALIDATION_FAILURE.UNKNOWN_GEOMETRY,
        {
          message:
            "Custom targeting validator failed.",

          metadata: {
            validatorId,
            error
          }
        }
      )
    ]);
  }
}

/* ============================================================
   PRIMARY TARGET VALIDATION
   ============================================================ */

/**
 * @section primary-target-validation
 */

export async function validateTargetResolution(
  resolution,
  {
    requirement = null
  } = {}
) {
  if (!resolution) {
    throw new TypeError(
      "validateTargetResolution requires TargetResolutionResult."
    );
  }

  const request =
    resolution.request;

  const resolvedRequirement =
    requirement ??
    request
      ?.requirement;

  if (!resolvedRequirement) {
    return targetValidationSkipped({
      request,

      source:
        resolution.source,

      targets:
        resolution.targets,

      metadata: {
        reason:
          "targeting-requirement-unavailable"
      }
    });
  }

  const source =
    resolution.source;

  if (
    resolvedRequirement.mode !==
      TARGETING_MODE.NONE &&
    resolvedRequirement.mode !==
      TARGETING_MODE.POINT &&
    !source
  ) {
    return targetValidationFailed({
      request,

      source,

      targets:
        resolution.targets,

      issues: [
        createIssue(
          TARGET_VALIDATION_FAILURE.SOURCE_UNAVAILABLE,
          {
            message:
              "Targeting source is unavailable."
          }
        )
      ]
    });
  }

  if (
    resolvedRequirement.mode ===
    TARGETING_MODE.NONE
  ) {
    return targetValidationSucceeded({
      request,

      source,

      targets:
        []
    });
  }

  const issues = [];

  /* ----------------------------------------------------------
     POINT
     ---------------------------------------------------------- */

  if (
    resolvedRequirement.mode ===
    TARGETING_MODE.POINT
  ) {
    const pointValidation =
      await validateTargetPoint(
        resolution,
        resolvedRequirement
      );

    issues.push(
      ...pointValidation.issues
    );

    return issues.length === 0
      ? targetValidationSucceeded({
          request,
          source,
          targets:
            [],
          metadata: {
            point:
              resolution.point
          }
        })
      : targetValidationFailed({
          request,
          source,
          targets:
            [],
          issues,
          metadata: {
            point:
              resolution.point
          }
        });
  }

  /* ----------------------------------------------------------
     AREA / TEMPLATE
     ---------------------------------------------------------- */

  if (
    resolvedRequirement.mode ===
      TARGETING_MODE.AREA ||
    resolvedRequirement.mode ===
      TARGETING_MODE.TEMPLATE ||
    resolvedRequirement.mode ===
      TARGETING_MODE.ALL_IN_AREA
  ) {
    const areaValidation =
      await validateTargetArea(
        resolution,
        resolvedRequirement
      );

    issues.push(
      ...areaValidation.issues
    );
  }

  /* ----------------------------------------------------------
     TARGET COUNT
     ---------------------------------------------------------- */

  issues.push(
    ...validateTargetCount(
      resolvedRequirement,
      resolution.targets ??
      []
    )
  );

  /* ----------------------------------------------------------
     PER-TARGET
     ---------------------------------------------------------- */

  const targetResults = [];

  for (
    const target of
      resolution.targets ??
      []
  ) {
    const targetResult =
      await validateSingleTarget(
        source,
        target,
        resolvedRequirement
      );

    targetResults.push(
      targetResult
    );

    issues.push(
      ...targetResult.issues
    );
  }

  /* ----------------------------------------------------------
     CUSTOM VALIDATOR
     ---------------------------------------------------------- */

  const customIssues =
    await runCustomTargetingValidator(
      resolvedRequirement,
      {
        source,
        resolution,
        targetResults
      }
    );

  issues.push(
    ...customIssues
  );

  /* ----------------------------------------------------------
     FINAL RESULT
     ---------------------------------------------------------- */

  if (
    issues.length ===
    0
  ) {
    return targetValidationSucceeded({
      request,

      source,

      targets:
        resolution.targets,

      targetResults,

      metadata: {
        area:
          resolution.area ??
          null,

        point:
          resolution.point ??
          null
      }
    });
  }

  const validTargetCount =
    targetResults.filter(
      result =>
        result.valid
    ).length;

  const invalidTargetCount =
    targetResults.length -
    validTargetCount;

  if (
    validTargetCount > 0 &&
    invalidTargetCount > 0
  ) {
    return targetValidationPartial({
      request,

      source,

      targets:
        resolution.targets,

      targetResults,

      issues,

      metadata: {
        area:
          resolution.area ??
          null,

        point:
          resolution.point ??
          null
      }
    });
  }

  return targetValidationFailed({
    request,

    source,

    targets:
      resolution.targets,

    targetResults,

    issues,

    metadata: {
      area:
        resolution.area ??
        null,

      point:
        resolution.point ??
        null
    }
  });
}

/* ============================================================
   EXECUTION VALIDATION
   ============================================================ */

/**
 * @section execution-validation
 *
 * Convenience entry for targeting-spatial-hooks.js.
 */

export async function validateExecutionTargets(
  context,
  resolution,
  {
    requirement = null
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "validateExecutionTargets requires ExecutionContext."
    );
  }

  return validateTargetResolution(
    resolution,
    {
      requirement:
        requirement ??
        context
          ?.targeting
          ?.requirement ??
        null
    }
  );
}

/* ============================================================
   TARGET VALIDATION RESULT PREDICATES
   ============================================================ */

export function didTargetValidationSucceed(
  result
) {
  return (
    result?.status ===
    TARGET_VALIDATION_STATUS.VALID
  );
}

export function didTargetValidationFail(
  result
) {
  return (
    result?.status ===
    TARGET_VALIDATION_STATUS.INVALID ||
    result?.status ===
      TARGET_VALIDATION_STATUS.FAILED
  );
}

export function wasTargetValidationPartial(
  result
) {
  return (
    result?.status ===
    TARGET_VALIDATION_STATUS.PARTIAL
  );
}

/* ============================================================
   EXECUTION TRANSACTION RESULT ADAPTER
   ============================================================ */

/**
 * @section execution-transaction-result-adapter
 */

export function toExecutionTargetValidationResult(
  validation,
  {
    context = null
  } = {}
) {
  return Object.freeze({
    kind:
      "target-validation",

    status:
      validation?.valid
        ? "valid"
        : "invalid",

    valid:
      Boolean(
        validation?.valid
      ),

    context,

    issues:
      Object.freeze(
        (
          validation
            ?.issues ??
          []
        ).map(
          issue =>
            Object.freeze({
              code:
                `targeting:${issue.code}`,

              message:
                issue.message,

              source:
                "targeting-spatial",

              severity:
                "error",

              metadata:
                Object.freeze({
                  targetValidationIssue:
                    issue
                })
            })
        )
      ),

    metadata:
      Object.freeze({
        targetingValidation:
          validation
      })
  });
}

/* ============================================================
   RANGE / THREAT / SENSORS NOTES
   ============================================================ */

/**
 * @section range-threat-sensors-notes
 *
 * Requirements may contain more than one spatial restriction.
 *
 * Example:
 *
 * system action:
 * Sensors 10
 * + LOS required
 *
 * validator checks both.
 *
 * Do not collapse:
 *
 * Range
 * Threat
 * Sensors
 *
 * into one distance rule.
 */

/* ============================================================
   SENSOR / DARKNESS NOTES
   ============================================================ */

/**
 * @section sensor-darkness-notes
 *
 * Sensors validation uses spatial distance only.
 *
 * It does NOT require ordinary visual visibility unless:
 *
 * requiresLineOfSight = true
 *
 * Therefore an enemy can remain a valid sensor-space target in darkness
 * when the mechanic permits it.
 */

/* ============================================================
   UNKNOWN GEOMETRY NOTES
   ============================================================ */

/**
 * @section unknown-geometry-notes
 *
 * When a rule explicitly requires:
 *
 * Range
 * Sensors
 * Threat
 * LOS
 *
 * and the query cannot establish the fact:
 *
 * UNKNOWN is not treated as legal.
 *
 * Return UNKNOWN_GEOMETRY.
 *
 * This prevents accidental permissive execution when the spatial adapter
 * lacks required capability.
 */

/* ============================================================
   COVER NOTES
   ============================================================ */

/**
 * @section cover-notes
 *
 * Cover is factual geometry and may affect native attack resolution.
 *
 * Generic targeting legality does NOT reject a target merely because it has
 * cover.
 *
 * If a specific action has a cover-based legality rule, use a custom
 * targeting validator or future explicit requirement field.
 */

/* ============================================================
   AREA / FRIENDLY FIRE NOTES
   ============================================================ */

/**
 * @section area-friendly-fire-notes
 *
 * AREA/TEMPLATE acquisition may return every character in the area.
 *
 * Relationship restrictions are then applied per target.
 *
 * If an AoE intentionally affects allies/enemies indiscriminately:
 *
 * requirement.relationships = null
 *
 * Do not silently discard selected/contained targets in resolver.
 */

/* ============================================================
   SELF TARGET NOTES
   ============================================================ */

/**
 * @section self-target-notes
 *
 * allowSelf controls whether source may appear among ordinary target
 * selections.
 *
 * TARGETING_MODE.SELF should normally set allowSelf = true through the
 * contract helper.
 */

/* ============================================================
   OCCUPANCY NOTES
   ============================================================ */

/**
 * @section occupancy-notes
 *
 * requiresUnoccupiedSpace currently applies to POINT destinations.
 *
 * Common uses:
 *
 * teleport
 * dismount
 * movement endpoint
 * pass-through mechanics
 *
 * Footprint-sized occupancy checks may require adapter metadata/options in
 * future; do not implement pathfinding here.
 */

/* ============================================================
   CUSTOM VALIDATOR NOTES
   ============================================================ */

/**
 * @section custom-validator-notes
 *
 * customValidatorId is an escape hatch for unusual targeting legality.
 *
 * Examples:
 *
 * target must have Lock On
 * target must be larger than source
 * target must be an allied drone
 *
 * Prefer common contract fields when possible.
 *
 * Avoid creating one custom validator per ordinary weapon/system.
 */

/* ============================================================
   ACTOR-OWNED FEATURE NOTES
   ============================================================ */

/**
 * @section actor-owned-feature-notes
 *
 * actor_owned_feature_registry may normalize:
 *
 * weapon Range / Threat
 * system Sensors
 * Talent adjacency
 * frame trait target type
 *
 * into TargetingRequirement.
 *
 * Validator remains feature-agnostic.
 */

/* ============================================================
   SYSTEM BRIDGE NOTES
   ============================================================ */

/**
 * @section system-bridge-notes
 *
 * system_bridge may supplement missing:
 *
 * targetKinds
 * relationships
 * range
 * threat
 * sensors
 * requiresLineOfSight
 * requiresAdjacency
 * customValidatorId
 *
 * Once composed into a normalized requirement, validator does not care
 * where the metadata came from.
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
 * → economy/resource/non-target prerequisites
 *
 * TARGETING
 * → resolver
 *
 * FINAL_VALIDATE
 * → validateExecutionTargets()
 *
 * EXECUTE
 * → native/semantic mechanic
 *
 * Invalid targeting blocks before execution.
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getTargetingSpatialValidatorDiagnostics() {
  return Object.freeze({
    id:
      TARGETING_SPATIAL_VALIDATOR_MODULE_ID,

    version:
      TARGETING_SPATIAL_VALIDATOR_MODULE_VERSION,

    customValidatorCount:
      CUSTOM_TARGETING_VALIDATORS.size,

    customValidatorIds:
      Object.freeze([
        ...CUSTOM_TARGETING_VALIDATORS.keys()
      ])
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * targeting-spatial-resolver.js
 * -----------------------------
 *
 * Supplies what the user/system selected.
 *
 *
 * targeting-spatial-query.js
 * --------------------------
 *
 * Supplies factual geometry.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Final target validation occurs before execution.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies runtime targeting requirement and identity.
 *
 *
 * native_adapter/
 * ---------------
 *
 * Provides native geometry/document resolution beneath query adapter.
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Later supplies normalized owned-feature targeting requirements.
 *
 *
 * system_bridge/
 * --------------
 *
 * Later supplements missing target legality metadata.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * targeting-spatial-validator.js validates selection; it never acquires it.
 *
 * INVARIANT 2
 * Spatial facts come only from targeting-spatial-query.js.
 *
 * INVARIANT 3
 * Range, Threat, and Sensors remain distinct checks.
 *
 * INVARIANT 4
 * Sensor legality does not imply visual visibility.
 *
 * INVARIANT 5
 * LOS is enforced only when requirement explicitly requires it.
 *
 * INVARIANT 6
 * UNKNOWN required geometry is not treated as valid.
 *
 * INVARIANT 7
 * Target count is validated independently from per-target legality.
 *
 * INVARIANT 8
 * Target kind, self, and relationship legality are separate checks.
 *
 * INVARIANT 9
 * Cover does not inherently invalidate targeting.
 *
 * INVARIANT 10
 * Area targets are validated after acquisition rather than silently
 * filtered.
 *
 * INVARIANT 11
 * Custom validators are escape hatches, not replacements for common fields.
 *
 * INVARIANT 12
 * Invalid targets block execution during final validation.
 *
 * INVARIANT 13
 * actor_owned_feature_registry may supply requirements but does not own
 * validation execution.
 *
 * INVARIANT 14
 * system_bridge may supplement metadata but does not become a targeting
 * validator.
 */