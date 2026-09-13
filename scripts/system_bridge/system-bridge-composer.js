/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/system_bridge/system-bridge-composer.js
 */

/**
 * @file
 * @path main/system_bridge/system-bridge-composer.js
 * @module system-bridge-composer
 * @layer system-bridge-composition
 * @responsibility compose-resolved-bridge-sources-into-runtime-feature-and-action-descriptors
 * @public-boundary false
 * @side-effects none
 *
 * @depends-on
 * - system-bridge-contract
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes SystemBridgeResolutionResult from system-bridge-resolver.js
 * - preserves existing Frame Conn registry data as one source
 * - preserves actor-owned/native data as one source
 * - applies matching curated augmentation data
 * - produces runtime descriptors for semantic_execution_context/
 * - preserves native execution references for execution_transaction/
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - resolver owns source lookup
 * - augmentation registry owns augmentation storage/matching
 * - composer owns field precedence and merge behavior
 * - semantic_execution_context owns execution-context construction
 * - execution_transaction owns execution orchestration
 * - foundational services remain authoritative for their runtime domains
 *
 * THIS FILE OWNS:
 * - field contribution extraction
 * - field-specific authority precedence
 * - field conflict detection
 * - augmentation mode application
 * - existing registry presentation normalization
 * - actor-owned action/feature normalization into bridge runtime shape
 * - native execution preservation
 * - runtime status derivation
 * - unresolved runtime requirement derivation
 * - RuntimeFeatureDescriptor construction
 * - RuntimeActionDescriptor construction
 * - composition result construction
 *
 * THIS FILE DOES NOT OWN:
 * - source resolution
 * - augmentation registration/matching
 * - native execution
 * - execution context creation
 * - resource mutation
 * - action economy validation/spending
 * - event dispatch
 * - lifecycle advancement
 * - targeting resolution/validation
 *
 * EDIT CONTRACT:
 * - compose field-by-field
 * - never mutate source records
 * - preserve confirmed native execution
 * - augmentation defaults to filling missing values
 * - override must remain explicit and diagnosable
 * - conflicts must remain visible
 * - missing required runtime semantics must remain unresolved
 */

/* ============================================================
   IMPORTS
   ============================================================ */

import {
  SYSTEM_BRIDGE_AUGMENTATION_MODE,
  SYSTEM_BRIDGE_AUTHORITY,
  SYSTEM_BRIDGE_COMPOSITION_STATUS,
  SYSTEM_BRIDGE_CONFLICT_KIND,
  SYSTEM_BRIDGE_RESOLUTION_STATUS,
  SYSTEM_BRIDGE_RUNTIME_STATUS,
  SYSTEM_BRIDGE_SOURCE_KIND,
  SYSTEM_BRIDGE_SUBJECT_KIND,
  SYSTEM_BRIDGE_UNRESOLVED_KIND,
  createSystemBridgeCompositionResult,
  createSystemBridgeConflict,
  createSystemBridgeFieldContribution,
  createSystemBridgeFieldProvenance,
  createSystemBridgeIdentity,
  createSystemBridgeRuntimeAction,
  createSystemBridgeRuntimeExecution,
  createSystemBridgeRuntimeFeature,
  createSystemBridgeRuntimePresentation,
  createSystemBridgeUnresolvedRequirement,
  createSystemBridgeWarning
} from "./system-bridge-contract.js";

/* ============================================================
   MODULE IDENTITY
   ============================================================ */

export const SYSTEM_BRIDGE_COMPOSER_MODULE_ID =
  "lancer-frame-conn.system-bridge-composer";

export const SYSTEM_BRIDGE_COMPOSER_MODULE_VERSION =
  1;

/* ============================================================
   FIELD AUTHORITY WEIGHTS
   ============================================================ */

/**
 * @section field-authority-weights
 *
 * These are general source authority weights.
 *
 * Field-specific rules below may adjust behavior.
 */

const SYSTEM_BRIDGE_AUTHORITY_WEIGHT =
  Object.freeze({
    [SYSTEM_BRIDGE_AUTHORITY.NATIVE]:
      500,

    [SYSTEM_BRIDGE_AUTHORITY.STRUCTURED_NATIVE]:
      400,

    [SYSTEM_BRIDGE_AUTHORITY.EXISTING_REGISTRY]:
      300,

    [SYSTEM_BRIDGE_AUTHORITY.AUGMENTATION]:
      200,

    [SYSTEM_BRIDGE_AUTHORITY.DERIVED]:
      100,

    [SYSTEM_BRIDGE_AUTHORITY.UNKNOWN]:
      0
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

function hasValue(value) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return false;
  }

  if (
    Array.isArray(value)
  ) {
    return value.length >
      0;
  }

  return true;
}

function valuesEqual(
  first,
  second
) {
  if (
    first ===
    second
  ) {
    return true;
  }

  if (
    first == null ||
    second == null
  ) {
    return false;
  }

  if (
    typeof first !==
      "object" ||
    typeof second !==
      "object"
  ) {
    return false;
  }

  try {
    return (
      JSON.stringify(first) ===
      JSON.stringify(second)
    );
  } catch {
    return false;
  }
}

function authorityWeight(
  authority
) {
  return (
    SYSTEM_BRIDGE_AUTHORITY_WEIGHT[
      authority
    ] ??
    0
  );
}

/* ============================================================
   SOURCE EXTRACTION
   ============================================================ */

function getActorOwnedFeature(
  resolution
) {
  return (
    resolution
      ?.actorOwned
      ?.feature ??
    null
  );
}

function getActorOwnedAction(
  resolution
) {
  return (
    resolution
      ?.actorOwned
      ?.action ??
    null
  );
}

function getExistingRegistryEntry(
  resolution
) {
  return (
    resolution
      ?.existingRegistry ??
    null
  );
}

function getAugmentationMatches(
  resolution
) {
  return freezeArray(
    resolution
      ?.augmentations ??
    []
  );
}

/* ============================================================
   EXISTING REGISTRY FIELD HELPERS
   ============================================================ */

/**
 * @section existing-registry-field-helpers
 *
 * Existing registry predates this bridge.
 *
 * These helpers recognize common explicit registry fields without requiring
 * the registry itself to be rewritten.
 */

function getExistingRegistryName(
  entry
) {
  return (
    entry?.label ??
    entry?.name ??
    entry?.title ??
    null
  );
}

function getExistingRegistryDescription(
  entry
) {
  return (
    entry?.description ??
    entry?.desc ??
    entry?.help ??
    null
  );
}

function getExistingRegistryIcon(
  entry
) {
  return (
    entry?.icon ??
    entry?.img ??
    null
  );
}

function getExistingRegistryCategory(
  entry
) {
  return (
    entry?.category ??
    entry?.group ??
    entry?.section ??
    null
  );
}

function getExistingRegistryActionType(
  entry
) {
  return (
    entry?.actionType ??
    entry?.action_type ??
    entry?.type ??
    entry?.activation ??
    null
  );
}

function getExistingRegistryActionEconomy(
  entry
) {
  return (
    entry?.actionEconomy ??
    entry?.action_economy ??
    entry?.economy ??
    (
      entry?.activation
        ? Object.freeze({
            kind:
              entry.activation
          })
        : null
    )
  );
}

function getExistingRegistryTargeting(
  entry
) {
  return (
    entry?.targeting ??
    entry?.targetRequirement ??
    entry?.target_requirement ??
    null
  );
}

function getExistingRegistryResources(
  entry
) {
  return normalizeArray(
    entry?.resources ??
    entry?.resource ??
    []
  );
}

function getExistingRegistryLifecycle(
  entry
) {
  return (
    entry?.lifecycle ??
    null
  );
}

function getExistingRegistryTriggers(
  entry
) {
  return normalizeArray(
    entry?.triggers ??
    []
  );
}

function getExistingRegistryExecution(
  entry
) {
  return (
    entry?.execution ??
    entry?.nativeExecution ??
    null
  );
}

function getExistingRegistryEffect(
  entry
) {
  return (
    entry?.effect ??
    entry?.runtimeEffect ??
    null
  );
}

/* ============================================================
   ACTOR-OWNED FIELD HELPERS
   ============================================================ */

function getActorOwnedPresentation(
  feature,
  action
) {
  const semanticText =
    action?.semanticText ??
    feature?.semanticText ??
    null;

  const name =
    action?.name ??
    feature?.name ??
    semanticText?.name ??
    null;

  if (
    !name &&
    !semanticText
  ) {
    return null;
  }

  return createSystemBridgeRuntimePresentation({
    name,

    label:
      name,

    description:
      semanticText?.description ??
      semanticText?.effect ??
      null,

    metadata: {
      source:
        "actor-owned"
    }
  });
}

function getActorOwnedActionEconomy(
  action
) {
  return (
    action?.actionEconomy ??
    (
      action?.kind
        ? Object.freeze({
            kind:
              action.kind,

            activationType:
              action.activationType ??
              null
          })
        : null
    )
  );
}

function getActorOwnedTargeting(
  feature,
  action
) {
  return (
    action?.targeting ??
    feature?.targeting ??
    null
  );
}

function getActorOwnedResources(
  feature,
  action
) {
  const actionResources =
    normalizeArray(
      action?.resources
    );

  if (
    actionResources.length >
    0
  ) {
    return actionResources;
  }

  return normalizeArray(
    feature?.resources
  );
}

function getActorOwnedLifecycle(
  feature,
  action
) {
  return (
    action?.lifecycle ??
    feature?.lifecycle ??
    null
  );
}

function getActorOwnedTriggers(
  feature,
  action
) {
  const actionTriggers =
    normalizeArray(
      action?.triggers
    );

  if (
    actionTriggers.length >
    0
  ) {
    return actionTriggers;
  }

  return normalizeArray(
    feature?.triggers
  );
}

function getActorOwnedNativeExecution(
  feature,
  action
) {
  return (
    action?.nativeExecution ??
    feature?.nativeExecution ??
    null
  );
}

function getActorOwnedEffect(
  feature,
  action
) {
  const semanticText =
    action?.semanticText ??
    feature?.semanticText ??
    null;

  if (!semanticText) {
    return null;
  }

  if (
    semanticText.effect ==
      null &&
    semanticText.description ==
      null
  ) {
    return null;
  }

  return Object.freeze({
    semanticText,

    executable:
      false
  });
}

/* ============================================================
   PROVENANCE CONSTRUCTION
   ============================================================ */

function createContribution(
  {
    field,
    value,
    sourceKind,
    sourceId = null,
    authority,
    path = null,
    accepted = false,
    reason = null,
    metadata = {}
  }
) {
  const provenance =
    createSystemBridgeFieldProvenance({
      field,

      sourceKind,

      sourceId,

      authority,

      path,

      originalValue:
        value,

      metadata
    });

  return createSystemBridgeFieldContribution({
    field,

    value,

    provenance,

    accepted,

    reason,

    metadata
  });
}

/* ============================================================
   BASE FIELD CONTRIBUTIONS
   ============================================================ */

function collectBaseFieldContributions(
  resolution,
  field
) {
  const contributions = [];

  const existing =
    getExistingRegistryEntry(
      resolution
    );

  const feature =
    getActorOwnedFeature(
      resolution
    );

  const action =
    getActorOwnedAction(
      resolution
    );

  /* ----------------------------------------------------------
     ACTOR OWNED
     ---------------------------------------------------------- */

  let actorOwnedValue =
    null;

  switch (field) {
    case "presentation":
      actorOwnedValue =
        getActorOwnedPresentation(
          feature,
          action
        );
      break;

    case "actionEconomy":
      actorOwnedValue =
        getActorOwnedActionEconomy(
          action
        );
      break;

    case "targeting":
      actorOwnedValue =
        getActorOwnedTargeting(
          feature,
          action
        );
      break;

    case "resources":
      actorOwnedValue =
        getActorOwnedResources(
          feature,
          action
        );
      break;

    case "lifecycle":
      actorOwnedValue =
        getActorOwnedLifecycle(
          feature,
          action
        );
      break;

    case "triggers":
      actorOwnedValue =
        getActorOwnedTriggers(
          feature,
          action
        );
      break;

    case "execution":
      actorOwnedValue =
        getActorOwnedNativeExecution(
          feature,
          action
        );
      break;

    case "effect":
      actorOwnedValue =
        getActorOwnedEffect(
          feature,
          action
        );
      break;

    default:
      actorOwnedValue =
        null;
  }

  if (
    hasValue(
      actorOwnedValue
    )
  ) {
    contributions.push(
      createContribution({
        field,

        value:
          actorOwnedValue,

        sourceKind:
          SYSTEM_BRIDGE_SOURCE_KIND.ACTOR_OWNED,

        sourceId:
          action?.id ??
          feature?.identity?.id ??
          null,

        authority:
          field ===
            "execution"
            ? SYSTEM_BRIDGE_AUTHORITY.NATIVE
            : SYSTEM_BRIDGE_AUTHORITY.STRUCTURED_NATIVE,

        path:
          action
            ? `actorOwned.action.${field}`
            : `actorOwned.feature.${field}`
      })
    );
  }

  /* ----------------------------------------------------------
     EXISTING REGISTRY
     ---------------------------------------------------------- */

  if (existing) {
    let existingValue =
      null;

    switch (field) {
      case "presentation":
        existingValue =
          createSystemBridgeRuntimePresentation({
            name:
              getExistingRegistryName(
                existing
              ),

            label:
              getExistingRegistryName(
                existing
              ),

            description:
              getExistingRegistryDescription(
                existing
              ),

            icon:
              getExistingRegistryIcon(
                existing
              ),

            category:
              getExistingRegistryCategory(
                existing
              ),

            actionType:
              getExistingRegistryActionType(
                existing
              ),

            sort:
              finiteNumber(
                existing.sort
              )
                ? existing.sort
                : null,

            metadata: {
              source:
                "existing-registry"
            }
          });
        break;

      case "actionEconomy":
        existingValue =
          getExistingRegistryActionEconomy(
            existing
          );
        break;

      case "targeting":
        existingValue =
          getExistingRegistryTargeting(
            existing
          );
        break;

      case "resources":
        existingValue =
          getExistingRegistryResources(
            existing
          );
        break;

      case "lifecycle":
        existingValue =
          getExistingRegistryLifecycle(
            existing
          );
        break;

      case "triggers":
        existingValue =
          getExistingRegistryTriggers(
            existing
          );
        break;

      case "execution":
        existingValue =
          getExistingRegistryExecution(
            existing
          );
        break;

      case "effect":
        existingValue =
          getExistingRegistryEffect(
            existing
          );
        break;

      default:
        existingValue =
          null;
    }

    if (
      hasValue(
        existingValue
      )
    ) {
      contributions.push(
        createContribution({
          field,

          value:
            existingValue,

          sourceKind:
            SYSTEM_BRIDGE_SOURCE_KIND.EXISTING_REGISTRY,

          sourceId:
            existing.id ??
            existing.registryId ??
            existing.actionId ??
            null,

          authority:
            SYSTEM_BRIDGE_AUTHORITY.EXISTING_REGISTRY,

          path:
            `existingRegistry.${field}`
        })
      );
    }
  }

  return Object.freeze(
    contributions
  );
}

/* ============================================================
   AUGMENTATION FIELD EXTRACTION
   ============================================================ */

function getAugmentationPatchField(
  augmentation,
  field
) {
  return (
    augmentation
      ?.patch
      ?.[field] ??
    null
  );
}

/* ============================================================
   AUGMENTATION CONTRIBUTIONS
   ============================================================ */

function collectAugmentationFieldContributions(
  resolution,
  field
) {
  const contributions = [];

  for (
    const match of
      getAugmentationMatches(
        resolution
      )
  ) {
    const augmentation =
      match.augmentation;

    const value =
      getAugmentationPatchField(
        augmentation,
        field
      );

    if (
      !hasValue(value)
    ) {
      continue;
    }

    contributions.push(
      createContribution({
        field,

        value,

        sourceKind:
          SYSTEM_BRIDGE_SOURCE_KIND.AUGMENTATION,

        sourceId:
          augmentation
            .identity
            .id,

        authority:
          SYSTEM_BRIDGE_AUTHORITY.AUGMENTATION,

        path:
          `augmentation.${augmentation.identity.id}.patch.${field}`,

        metadata: {
          mergeMode:
            augmentation.patch.mode,

          priority:
            augmentation.priority,

          matchStrength:
            match.strength,

          matchScore:
            match.score
        }
      })
    );
  }

  return Object.freeze(
    contributions
  );
}

/* ============================================================
   CONTRIBUTION ORDERING
   ============================================================ */

function sortContributionsByAuthority(
  contributions
) {
  return Object.freeze(
    [...contributions]
      .sort(
        (
          first,
          second
        ) =>
          (
            authorityWeight(
              second.provenance.authority
            ) -
            authorityWeight(
              first.provenance.authority
            )
          ) ||
          (
            (
              second.metadata?.priority ??
              0
            ) -
            (
              first.metadata?.priority ??
              0
            )
          ) ||
          (
            (
              second.metadata?.matchScore ??
              0
            ) -
            (
              first.metadata?.matchScore ??
              0
            )
          )
      )
  );
}

/* ============================================================
   FIELD CONFLICT KIND
   ============================================================ */

function getConflictKindForField(
  field
) {
  switch (field) {
    case "execution":
      return SYSTEM_BRIDGE_CONFLICT_KIND.EXECUTION_MISMATCH;

    case "targeting":
      return SYSTEM_BRIDGE_CONFLICT_KIND.TARGETING_MISMATCH;

    case "resources":
      return SYSTEM_BRIDGE_CONFLICT_KIND.RESOURCE_MISMATCH;

    case "actionEconomy":
      return SYSTEM_BRIDGE_CONFLICT_KIND.ECONOMY_MISMATCH;

    case "lifecycle":
      return SYSTEM_BRIDGE_CONFLICT_KIND.LIFECYCLE_MISMATCH;

    case "triggers":
      return SYSTEM_BRIDGE_CONFLICT_KIND.TRIGGER_MISMATCH;

    default:
      return SYSTEM_BRIDGE_CONFLICT_KIND.VALUE_MISMATCH;
  }
}

/* ============================================================
   BASE FIELD SELECTION
   ============================================================ */

function selectAuthoritativeBaseContribution(
  field,
  contributions
) {
  const ordered =
    sortContributionsByAuthority(
      contributions
    );

  if (
    ordered.length ===
    0
  ) {
    return Object.freeze({
      selected:
        null,

      conflicts:
        Object.freeze([])
    });
  }

  const selected =
    ordered[0];

  const conflicts = [];

  for (
    const contribution of
      ordered.slice(1)
  ) {
    if (
      valuesEqual(
        contribution.value,
        selected.value
      )
    ) {
      continue;
    }

    conflicts.push(
      createSystemBridgeConflict({
        field,

        kind:
          getConflictKindForField(
            field
          ),

        message:
          `Conflicting values were provided for bridge field "${field}".`,

        contributions: [
          selected,
          contribution
        ],

        selectedContribution:
          selected,

        blocking:
          false,

        metadata: {
          selectedAuthority:
            selected.provenance.authority,

          rejectedAuthority:
            contribution.provenance.authority
        }
      })
    );
  }

  return Object.freeze({
    selected,

    conflicts:
      Object.freeze(
        conflicts
      )
  });
}

/* ============================================================
   SHALLOW OBJECT MERGE
   ============================================================ */

function mergeObjects(
  base,
  patch
) {
  if (
    !isObject(base) ||
    !isObject(patch)
  ) {
    return patch;
  }

  return Object.freeze({
    ...base,
    ...patch
  });
}

/* ============================================================
   FILL-MISSING OBJECT MERGE
   ============================================================ */

function fillMissingObjectFields(
  base,
  patch
) {
  if (
    !isObject(base) ||
    !isObject(patch)
  ) {
    return hasValue(base)
      ? base
      : patch;
  }

  const result = {
    ...base
  };

  for (
    const [
      key,
      value
    ] of Object.entries(
      patch
    )
  ) {
    if (
      !hasValue(
        result[key]
      ) &&
      hasValue(
        value
      )
    ) {
      result[key] =
        value;
    }
  }

  return Object.freeze(
    result
  );
}

/* ============================================================
   ARRAY UNION
   ============================================================ */

function appendUniqueArray(
  base,
  patch
) {
  const result = [];
  const seen = new Set();

  for (
    const value of [
      ...normalizeArray(base),
      ...normalizeArray(patch)
    ]
  ) {
    let key;

    if (
      value &&
      typeof value ===
        "object"
    ) {
      key =
        value.id ??
        value.identity?.id ??
        value.code ??
        value.kind ??
        null;
    } else {
      key =
        value;
    }

    if (
      key != null &&
      seen.has(key)
    ) {
      continue;
    }

    if (key != null) {
      seen.add(key);
    }

    result.push(
      value
    );
  }

  return Object.freeze(
    result
  );
}

/* ============================================================
   AUGMENTATION APPLICATION
   ============================================================ */

function applyAugmentationContribution(
  field,
  current,
  contribution,
  {
    preserveNativeExecution = true
  } = {}
) {
  const mode =
    contribution
      ?.metadata
      ?.mergeMode ??
    SYSTEM_BRIDGE_AUGMENTATION_MODE.FILL_MISSING;

  const patchValue =
    contribution.value;

  /* ----------------------------------------------------------
     EXECUTION NATIVE PRESERVATION
     ---------------------------------------------------------- */

  if (
    field ===
      "execution" &&
    preserveNativeExecution &&
    current
      ?.provenance
      ?.authority ===
      SYSTEM_BRIDGE_AUTHORITY.NATIVE
  ) {
    const currentValue =
      current.value;

    /*
     * A supplemental execution descriptor may be added without replacing
     * the native path.
     */
    if (
      isObject(patchValue)
    ) {
      const mergedValue =
        fillMissingObjectFields(
          currentValue,
          patchValue
        );

      return Object.freeze({
        contribution:
          createContribution({
            field,

            value:
              mergedValue,

            sourceKind:
              SYSTEM_BRIDGE_SOURCE_KIND.DERIVED,

            sourceId:
              SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

            authority:
              SYSTEM_BRIDGE_AUTHORITY.NATIVE,

            accepted:
              true,

            reason:
              "native-execution-preserved-with-supplemental-fields",

            metadata: {
              base:
                current,

              augmentation:
                contribution
            }
          }),

        conflict:
          mode ===
            SYSTEM_BRIDGE_AUGMENTATION_MODE.OVERRIDE &&
          !valuesEqual(
            currentValue,
            patchValue
          )
            ? createSystemBridgeConflict({
                field,

                kind:
                  SYSTEM_BRIDGE_CONFLICT_KIND.EXECUTION_MISMATCH,

                message:
                  "Augmentation requested execution override but confirmed native execution was preserved.",

                contributions: [
                  current,
                  contribution
                ],

                selectedContribution:
                  current,

                blocking:
                  false,

                metadata: {
                  overrideRejected:
                    true
                }
              })
            : null
      });
    }

    return Object.freeze({
      contribution:
        current,

      conflict:
        null
    });
  }

  /* ----------------------------------------------------------
     NO CURRENT VALUE
     ---------------------------------------------------------- */

  if (!current) {
    return Object.freeze({
      contribution:
        createContribution({
          field,

          value:
            patchValue,

          sourceKind:
            contribution
              .provenance
              .sourceKind,

          sourceId:
            contribution
              .provenance
              .sourceId,

          authority:
            contribution
              .provenance
              .authority,

          path:
            contribution
              .provenance
              .path,

          accepted:
            true,

          reason:
            "filled-missing-field",

          metadata:
            contribution.metadata
        }),

      conflict:
        null
    });
  }

  /* ----------------------------------------------------------
     FILL MISSING
     ---------------------------------------------------------- */

  if (
    mode ===
    SYSTEM_BRIDGE_AUGMENTATION_MODE.FILL_MISSING
  ) {
    let value =
      current.value;

    if (
      isObject(current.value) &&
      isObject(patchValue)
    ) {
      value =
        fillMissingObjectFields(
          current.value,
          patchValue
        );
    } else if (
      !hasValue(
        current.value
      )
    ) {
      value =
        patchValue;
    }

    return Object.freeze({
      contribution:
        createContribution({
          field,

          value,

          sourceKind:
            SYSTEM_BRIDGE_SOURCE_KIND.DERIVED,

          sourceId:
            SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

          authority:
            current.provenance.authority,

          accepted:
            true,

          reason:
            "augmentation-fill-missing",

          metadata: {
            base:
              current,

            augmentation:
              contribution
          }
        }),

      conflict:
        null
    });
  }

  /* ----------------------------------------------------------
     MERGE
     ---------------------------------------------------------- */

  if (
    mode ===
    SYSTEM_BRIDGE_AUGMENTATION_MODE.MERGE
  ) {
    const value =
      (
        Array.isArray(
          current.value
        ) ||
        Array.isArray(
          patchValue
        )
      )
        ? appendUniqueArray(
            current.value,
            patchValue
          )
        : mergeObjects(
            current.value,
            patchValue
          );

    return Object.freeze({
      contribution:
        createContribution({
          field,

          value,

          sourceKind:
            SYSTEM_BRIDGE_SOURCE_KIND.DERIVED,

          sourceId:
            SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

          authority:
            current.provenance.authority,

          accepted:
            true,

          reason:
            "augmentation-merge",

          metadata: {
            base:
              current,

            augmentation:
              contribution
          }
        }),

      conflict:
        null
    });
  }

  /* ----------------------------------------------------------
     APPEND
     ---------------------------------------------------------- */

  if (
    mode ===
    SYSTEM_BRIDGE_AUGMENTATION_MODE.APPEND
  ) {
    const value =
      appendUniqueArray(
        current.value,
        patchValue
      );

    return Object.freeze({
      contribution:
        createContribution({
          field,

          value,

          sourceKind:
            SYSTEM_BRIDGE_SOURCE_KIND.DERIVED,

          sourceId:
            SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

          authority:
            current.provenance.authority,

          accepted:
            true,

          reason:
            "augmentation-append",

          metadata: {
            base:
              current,

            augmentation:
              contribution
          }
        }),

      conflict:
        null
    });
  }

  /* ----------------------------------------------------------
     OVERRIDE
     ---------------------------------------------------------- */

  if (
    mode ===
    SYSTEM_BRIDGE_AUGMENTATION_MODE.OVERRIDE
  ) {
    const conflict =
      !valuesEqual(
        current.value,
        patchValue
      )
        ? createSystemBridgeConflict({
            field,

            kind:
              getConflictKindForField(
                field
              ),

            message:
              `Augmentation explicitly overrides bridge field "${field}".`,

            contributions: [
              current,
              contribution
            ],

            selectedContribution:
              contribution,

            blocking:
              false,

            metadata: {
              explicitOverride:
                true
            }
          })
        : null;

    return Object.freeze({
      contribution:
        createContribution({
          field,

          value:
            patchValue,

          sourceKind:
            contribution
              .provenance
              .sourceKind,

          sourceId:
            contribution
              .provenance
              .sourceId,

          authority:
            contribution
              .provenance
              .authority,

          path:
            contribution
              .provenance
              .path,

          accepted:
            true,

          reason:
            "explicit-augmentation-override",

          metadata:
            contribution.metadata
        }),

      conflict
    });
  }

  return Object.freeze({
    contribution:
      current,

    conflict:
      null
  });
}

/* ============================================================
   FIELD COMPOSITION
   ============================================================ */

function composeField(
  resolution,
  field,
  options = {}
) {
  const baseContributions =
    collectBaseFieldContributions(
      resolution,
      field
    );

  const augmentationContributions =
    collectAugmentationFieldContributions(
      resolution,
      field
    );

  const selection =
    selectAuthoritativeBaseContribution(
      field,
      baseContributions
    );

  let current =
    selection.selected;

  const conflicts = [
    ...selection.conflicts
  ];

  const acceptedContributions = [];

  if (current) {
    current =
      createContribution({
        field,

        value:
          current.value,

        sourceKind:
          current
            .provenance
            .sourceKind,

        sourceId:
          current
            .provenance
            .sourceId,

        authority:
          current
            .provenance
            .authority,

        path:
          current
            .provenance
            .path,

        accepted:
          true,

        reason:
          "authoritative-base-selection",

        metadata:
          current.metadata
      });

    acceptedContributions.push(
      current
    );
  }

  for (
    const contribution of
      augmentationContributions
  ) {
    const result =
      applyAugmentationContribution(
        field,
        current,
        options
      );

    current =
      result.contribution;

    acceptedContributions.push(
      contribution
    );

    if (result.conflict) {
      conflicts.push(
        result.conflict
      );
    }
  }

  return Object.freeze({
    field,

    value:
      current?.value ??
      null,

    selected:
      current,

    baseContributions,

    augmentationContributions,

    acceptedContributions:
      Object.freeze(
        acceptedContributions
      ),

    conflicts:
      Object.freeze(
        conflicts
      )
  });
}

/* ============================================================
   PRESENTATION COMPOSITION
   ============================================================ */

function composePresentation(
  resolution
) {
  const existing =
    getExistingRegistryEntry(
      resolution
    );

  const feature =
    getActorOwnedFeature(
      resolution
    );

  const action =
    getActorOwnedAction(
      resolution
    );

  /*
   * Presentation is intentionally treated differently:
   *
   * existing Frame Conn registry is presentation-oriented and therefore
   * should normally retain its label/category/icon while actor-owned/native
   * data fills missing descriptive identity.
   */

  const existingPresentation =
    existing
      ? createSystemBridgeRuntimePresentation({
          name:
            getExistingRegistryName(
              existing
            ),

          label:
            getExistingRegistryName(
              existing
            ),

          description:
            getExistingRegistryDescription(
              existing
            ),

          icon:
            getExistingRegistryIcon(
              existing
            ),

          category:
            getExistingRegistryCategory(
              existing
            ),

          actionType:
            getExistingRegistryActionType(
              existing
            ),

          sort:
            finiteNumber(
              existing.sort
            )
              ? existing.sort
              : null,

          metadata: {
            source:
              "existing-registry"
          }
        })
      : null;

  const actorOwnedPresentation =
    getActorOwnedPresentation(
      feature,
      action
    );

  let value =
    null;

  if (
    existingPresentation &&
    actorOwnedPresentation
  ) {
    value =
      createSystemBridgeRuntimePresentation({
        name:
          existingPresentation.name ??
          actorOwnedPresentation.name,

        label:
          existingPresentation.label ??
          actorOwnedPresentation.label,

        description:
          existingPresentation.description ??
          actorOwnedPresentation.description,

        icon:
          existingPresentation.icon ??
          actorOwnedPresentation.icon,

        category:
          existingPresentation.category ??
          actorOwnedPresentation.category,

        actionType:
          existingPresentation.actionType ??
          actorOwnedPresentation.actionType,

        sort:
          existingPresentation.sort ??
          actorOwnedPresentation.sort,

        metadata: {
          existingRegistry:
            existingPresentation,

          actorOwned:
            actorOwnedPresentation
        }
      });
  } else {
    value =
      existingPresentation ??
      actorOwnedPresentation;
  }

  const contributions = [];

  if (existingPresentation) {
    contributions.push(
      createContribution({
        field:
          "presentation",

        value:
          existingPresentation,

        sourceKind:
          SYSTEM_BRIDGE_SOURCE_KIND.EXISTING_REGISTRY,

        sourceId:
          existing?.id ??
          existing?.registryId ??
          null,

        authority:
          SYSTEM_BRIDGE_AUTHORITY.EXISTING_REGISTRY,

        accepted:
          true,

        reason:
          "existing-registry-presentation"
      })
    );
  }

  if (actorOwnedPresentation) {
    contributions.push(
      createContribution({
        field:
          "presentation",

        value:
          actorOwnedPresentation,

        sourceKind:
          SYSTEM_BRIDGE_SOURCE_KIND.ACTOR_OWNED,

        sourceId:
          action?.id ??
          feature?.identity?.id ??
          null,

        authority:
          SYSTEM_BRIDGE_AUTHORITY.STRUCTURED_NATIVE,

        accepted:
          true,

        reason:
          "actor-owned-presentation-fill"
      })
    );
  }

  for (
    const augmentationContribution of
      collectAugmentationFieldContributions(
        resolution,
        "presentation"
      )
  ) {
    const result =
      applyAugmentationContribution(
        "presentation",
        value
          ? createContribution({
              field:
                "presentation",

              value,

              sourceKind:
                SYSTEM_BRIDGE_SOURCE_KIND.DERIVED,

              sourceId:
                SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

              authority:
                SYSTEM_BRIDGE_AUTHORITY.EXISTING_REGISTRY,

              accepted:
                true
            })
          : null,
        augmentationContribution
      );

    value =
      result.contribution?.value ??
      value;

    contributions.push(
      augmentationContribution
    );
  }

  return Object.freeze({
    value,

    contributions:
      Object.freeze(
        contributions
      ),

    conflicts:
      Object.freeze([])
  });
}

/* ============================================================
   EXECUTION DESCRIPTOR COMPOSITION
   ============================================================ */

function composeExecutionDescriptor(
  resolution,
  fieldResult
) {
  const feature =
    getActorOwnedFeature(
      resolution
    );

  const action =
    getActorOwnedAction(
      resolution
    );

  const actorRuntimeStatus =
    action?.runtimeStatus ??
    feature?.runtimeStatus ??
    null;

  const value =
    fieldResult.value;

  if (!value) {
    return null;
  }

  if (
    value.nativeExecution !==
      undefined ||
    value.supplementalExecutionId !==
      undefined ||
    value.runtimeStatus !==
      undefined
  ) {
    return createSystemBridgeRuntimeExecution({
      runtimeStatus:
        value.runtimeStatus ??
        actorRuntimeStatus ??
        SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN,

      nativeExecution:
        value.nativeExecution ??
        (
          value.executable !==
            undefined
            ? value
            : null
        ),

      supplementalExecutionId:
        value.supplementalExecutionId ??
        value.executionId ??
        value.id ??
        null,

      requiresNative:
        value.requiresNative ??
        Boolean(
          value.nativeExecution ||
          value.executable
        ),

      producesChat:
        value.producesChat ??
        null,

      performsRoll:
        value.performsRoll ??
        null,

      mutatesDocuments:
        value.mutatesDocuments ??
        null,

      metadata:
        value.metadata ??
        {}
    });
  }

  /*
   * Raw actor-owned native execution descriptor.
   */
  if (
    value.executable !==
    undefined
  ) {
    return createSystemBridgeRuntimeExecution({
      runtimeStatus:
        actorRuntimeStatus ??
        (
          value.executable
            ? SYSTEM_BRIDGE_RUNTIME_STATUS.EXECUTABLE_NATIVE
            : SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN
        ),

      nativeExecution:
        value,

      supplementalExecutionId:
        null,

      requiresNative:
        Boolean(
          value.executable
        ),

      producesChat:
        value.producesChat ??
        null,

      performsRoll:
        value.performsRoll ??
        null,

      mutatesDocuments:
        value.mutatesDocuments ??
        null
    });
  }

  /*
   * Supplemental-only execution identity.
   */
  if (
    typeof value ===
    "string"
  ) {
    return createSystemBridgeRuntimeExecution({
      runtimeStatus:
        SYSTEM_BRIDGE_RUNTIME_STATUS.SUPPLEMENTAL,

      supplementalExecutionId:
        value,

      requiresNative:
        false
    });
  }

  return createSystemBridgeRuntimeExecution({
    runtimeStatus:
      actorRuntimeStatus ??
      SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN,

    nativeExecution:
      null,

    supplementalExecutionId:
      value.id ??
      value.executionId ??
      null,

    requiresNative:
      Boolean(
        value.requiresNative
      ),

    producesChat:
      value.producesChat ??
      null,

    performsRoll:
      value.performsRoll ??
      null,

    mutatesDocuments:
      value.mutatesDocuments ??
      null,

    metadata:
      value.metadata ??
      {}
  });
}

/* ============================================================
   RUNTIME STATUS DERIVATION
   ============================================================ */

function deriveRuntimeStatus({
  actorOwnedFeature,
  actorOwnedAction,

  execution,
  effect,

  unresolved
}) {
  const actorStatus =
    actorOwnedAction?.runtimeStatus ??
    actorOwnedFeature?.runtimeStatus ??
    null;

  const hasNativeExecution =
    Boolean(
      execution
        ?.nativeExecution
        ?.executable
    );

  const hasSupplementalExecution =
    Boolean(
      execution
        ?.supplementalExecutionId
    );

  if (
    hasNativeExecution &&
    hasSupplementalExecution
  ) {
    return SYSTEM_BRIDGE_RUNTIME_STATUS.COMPOSED;
  }

  if (
    hasNativeExecution
  ) {
    if (
      actorStatus ===
        SYSTEM_BRIDGE_RUNTIME_STATUS.PARTIAL_NATIVE &&
      hasValue(effect)
    ) {
      return SYSTEM_BRIDGE_RUNTIME_STATUS.COMPOSED;
    }

    return (
      actorStatus ??
      SYSTEM_BRIDGE_RUNTIME_STATUS.EXECUTABLE_NATIVE
    );
  }

  if (
    hasSupplementalExecution
  ) {
    return SYSTEM_BRIDGE_RUNTIME_STATUS.SUPPLEMENTAL;
  }

  if (
    actorStatus ===
      SYSTEM_BRIDGE_RUNTIME_STATUS.SEMANTIC_ONLY
  ) {
    return SYSTEM_BRIDGE_RUNTIME_STATUS.SEMANTIC_ONLY;
  }

  if (
    unresolved.some(
      item =>
        item.kind ===
        SYSTEM_BRIDGE_UNRESOLVED_KIND.EXECUTION
    )
  ) {
    return SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN;
  }

  if (
    actorStatus
  ) {
    return actorStatus;
  }

  return SYSTEM_BRIDGE_RUNTIME_STATUS.UNKNOWN;
}

/* ============================================================
   REQUIRED EXECUTION SEMANTIC CHECK
   ============================================================ */

function actionAppearsExecutable(
  resolution,
  actionEconomy,
  execution,
  effect
) {
  const identity =
    resolution?.identity;

  if (
    identity?.subjectKind ===
      SYSTEM_BRIDGE_SUBJECT_KIND.ACTION ||
    identity?.subjectKind ===
      SYSTEM_BRIDGE_SUBJECT_KIND.UNIVERSAL_ACTION ||
    identity?.subjectKind ===
      SYSTEM_BRIDGE_SUBJECT_KIND.WEAPON_PROFILE ||
    identity?.subjectKind ===
      SYSTEM_BRIDGE_SUBJECT_KIND.TALENT_RANK
  ) {
    return true;
  }

  if (
    actionEconomy ||
    execution
  ) {
    return true;
  }

  if (
    effect?.executable ===
    true
  ) {
    return true;
  }

  return false;
}

/* ============================================================
   UNRESOLVED DERIVATION
   ============================================================ */

function deriveUnresolvedRequirements({
  resolution,

  actionEconomy,

  targeting,

  resources,

  lifecycle,

  triggers,

  execution,

  effect
}) {
  const unresolved = [];

  if (
    !resolution?.identity ||
    resolution
      ?.identity
      ?.id ===
      "unresolved"
  ) {
    unresolved.push(
      createSystemBridgeUnresolvedRequirement({
        kind:
          SYSTEM_BRIDGE_UNRESOLVED_KIND.IDENTITY,

        field:
          "identity",

        required:
          true,

        message:
          "Runtime mechanic identity could not be resolved."
      })
    );
  }

  if (
    actionAppearsExecutable(
      resolution,
      actionEconomy,
      execution,
      effect
    ) &&
    !(
      execution?.nativeExecution?.executable ||
      execution?.supplementalExecutionId ||
      effect?.executable ===
        true
    )
  ) {
    unresolved.push(
      createSystemBridgeUnresolvedRequirement({
        kind:
          SYSTEM_BRIDGE_UNRESOLVED_KIND.EXECUTION,

        field:
          "execution",

        required:
          true,

        message:
          "No executable native or supplemental runtime path is available."
      })
    );
  }

  /*
   * Missing optional domains are not automatically errors.
   *
   * Not every action needs:
   *
   * targeting
   * resources
   * lifecycle
   * triggers
   *
   * They become unresolved only when source metadata explicitly marks them
   * as required. That requirement may be added later by augmentation.
   */

  const explicitRequirements =
    [
      ...(
        resolution
          ?.request
          ?.metadata
          ?.requiredRuntimeFields ??
        []
      ),
      ...(
        resolution
          ?.metadata
          ?.requiredRuntimeFields ??
        []
      )
    ];

  const fieldState =
    Object.freeze({
      actionEconomy,
      targeting,
      resources,
      lifecycle,
      triggers,
      execution,
      effect
    });

  const kindByField =
    Object.freeze({
      actionEconomy:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.ACTION_ECONOMY,

      targeting:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.TARGETING,

      resources:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.RESOURCES,

      lifecycle:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.LIFECYCLE,

      triggers:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.TRIGGERS,

      execution:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.EXECUTION,

      effect:
        SYSTEM_BRIDGE_UNRESOLVED_KIND.EFFECT
    });

  for (
    const field of
      explicitRequirements
  ) {
    if (
      hasValue(
        fieldState[field]
      )
    ) {
      continue;
    }

    if (
      unresolved.some(
        item =>
          item.field ===
          field
      )
    ) {
      continue;
    }

    unresolved.push(
      createSystemBridgeUnresolvedRequirement({
        kind:
          kindByField[field] ??
          SYSTEM_BRIDGE_UNRESOLVED_KIND.UNKNOWN,

        field,

        required:
          true,

        message:
          `Required runtime field "${field}" remains unresolved.`
      })
    );
  }

  return Object.freeze(
    unresolved
  );
}

/* ============================================================
   COMPOSED IDENTITY
   ============================================================ */

function composeRuntimeIdentity(
  resolution
) {
  const identity =
    resolution?.identity;

  if (identity) {
    return identity;
  }

  return createSystemBridgeIdentity({
    id:
      "unresolved",

    subjectKind:
      SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN,

    metadata: {
      generatedBy:
        SYSTEM_BRIDGE_COMPOSER_MODULE_ID
    }
  });
}

/* ============================================================
   ACTION COMPOSITION
   ============================================================ */

/**
 * @section action-composition
 */

export function composeSystemBridgeRuntimeAction(
  resolution,
  options = {}
) {
  if (!resolution) {
    throw new TypeError(
      "composeSystemBridgeRuntimeAction requires SystemBridgeResolutionResult."
    );
  }

  const identity =
    composeRuntimeIdentity(
      resolution
    );

  const presentationResult =
    composePresentation(
      resolution
    );

  const actionEconomyResult =
    composeField(
      resolution,
      "actionEconomy",
      options
    );

  const targetingResult =
    composeField(
      resolution,
      "targeting",
      options
    );

  const resourcesResult =
    composeField(
      resolution,
      "resources",
      options
    );

  const lifecycleResult =
    composeField(
      resolution,
      "lifecycle",
      options
    );

  const triggersResult =
    composeField(
      resolution,
      "triggers",
      options
    );

  const executionResult =
    composeField(
      resolution,
      "execution",
      {
        ...options,

        preserveNativeExecution:
          true
      }
    );

  const effectResult =
    composeField(
      resolution,
      "effect",
      options
    );

  const execution =
    composeExecutionDescriptor(
      resolution,
      executionResult
    );

  const unresolved =
    deriveUnresolvedRequirements({
      resolution,

      actionEconomy:
        actionEconomyResult.value,

      targeting:
        targetingResult.value,

      resources:
        resourcesResult.value,

      lifecycle:
        lifecycleResult.value,

      triggers:
        triggersResult.value,

      execution,

      effect:
        effectResult.value
    });

  const runtimeStatus =
    deriveRuntimeStatus({
      actorOwnedFeature:
        getActorOwnedFeature(
          resolution
        ),

      actorOwnedAction:
        getActorOwnedAction(
          resolution
        ),

      execution,

      effect:
        effectResult.value,

      unresolved
    });

  const provenance = [
    ...presentationResult.contributions,

    ...actionEconomyResult.acceptedContributions,

    ...targetingResult.acceptedContributions,

    ...resourcesResult.acceptedContributions,

    ...lifecycleResult.acceptedContributions,

    ...triggersResult.acceptedContributions,

    ...executionResult.acceptedContributions,

    ...effectResult.acceptedContributions
  ]
    .map(
      contribution =>
        contribution.provenance
    )
    .filter(Boolean);

  const action =
    createSystemBridgeRuntimeAction({
      identity,

      presentation:
        presentationResult.value,

      actionEconomy:
        actionEconomyResult.value,

      targeting:
        targetingResult.value,

      resources:
        normalizeArray(
          resourcesResult.value
        ),

      lifecycle:
        lifecycleResult.value,

      triggers:
        normalizeArray(
          triggersResult.value
        ),

      execution,

      effect:
        effectResult.value,

      runtimeStatus,

      provenance,

      unresolved,

      metadata: {
        composedBy:
          SYSTEM_BRIDGE_COMPOSER_MODULE_ID
      }
    });

  const fieldResults =
    Object.freeze({
      presentation:
        presentationResult,

      actionEconomy:
        actionEconomyResult,

      targeting:
        targetingResult,

      resources:
        resourcesResult,

      lifecycle:
        lifecycleResult,

      triggers:
        triggersResult,

      execution:
        executionResult,

      effect:
        effectResult
    });

  return Object.freeze({
    action,

    fieldResults,

    conflicts:
      Object.freeze([
        ...presentationResult.conflicts,
        ...actionEconomyResult.conflicts,
        ...targetingResult.conflicts,
        ...resourcesResult.conflicts,
        ...lifecycleResult.conflicts,
        ...triggersResult.conflicts,
        ...executionResult.conflicts,
        ...effectResult.conflicts
      ]),

    unresolved
  });
}

/* ============================================================
   FEATURE ACTION COLLECTION
   ============================================================ */

function getActorOwnedFeatureActionsForComposition(
  resolution
) {
  const feature =
    getActorOwnedFeature(
      resolution
    );

  if (!feature) {
    return Object.freeze([]);
  }

  return freezeArray(
    feature.actions ??
    []
  );
}

/* ============================================================
   CHILD ACTION RESOLUTION VIEW
   ============================================================ */

/**
 * @section child-action-resolution-view
 *
 * Feature composition reuses action composition by constructing a shallow
 * resolution view with one actor-owned action at a time.
 */

function createChildActionResolution(
  resolution,
  action
) {
  const feature =
    getActorOwnedFeature(
      resolution
    );

  const parentIdentity =
    resolution.identity;

  const identity =
    createSystemBridgeIdentity({
      id:
        action.id,

      subjectKind:
        SYSTEM_BRIDGE_SUBJECT_KIND.ACTION,

      actorScopeId:
        parentIdentity?.actorScopeId ??
        null,

      actorUuid:
        feature?.identity?.actorUuid ??
        null,

      pilotUuid:
        feature?.identity?.pilotUuid ??
        null,

      mechUuid:
        feature?.identity?.mechUuid ??
        null,

      featureId:
        feature?.identity?.id ??
        parentIdentity?.featureId ??
        null,

      actionId:
        action.id,

      registryId:
        parentIdentity?.registryId ??
        null,

      itemUuid:
        feature?.identity?.itemUuid ??
        null,

      itemId:
        feature?.identity?.itemId ??
        null,

      itemLid:
        feature?.identity?.itemLid ??
        null,

      profileIndex:
        action?.metadata?.profileIndex ??
        null,

      profileName:
        action?.metadata?.profileName ??
        null,

      talentRank:
        action?.metadata?.talentRank ??
        null,

      name:
        action.name ??
        null
    });

  return Object.freeze({
    ...resolution,

    identity,

    actorOwned:
      Object.freeze({
        ...(
          resolution.actorOwned ??
          {}
        ),

        feature,

        action
      })
  });
}

/* ============================================================
   FEATURE COMPOSITION
   ============================================================ */

export function composeSystemBridgeRuntimeFeature(
  resolution,
  options = {}
) {
  if (!resolution) {
    throw new TypeError(
      "composeSystemBridgeRuntimeFeature requires SystemBridgeResolutionResult."
    );
  }

  const identity =
    composeRuntimeIdentity(
      resolution
    );

  const presentationResult =
    composePresentation(
      resolution
    );

  const targetingResult =
    composeField(
      resolution,
      "targeting",
      options
    );

  const resourcesResult =
    composeField(
      resolution,
      "resources",
      options
    );

  const lifecycleResult =
    composeField(
      resolution,
      "lifecycle",
      options
    );

  const triggersResult =
    composeField(
      resolution,
      "triggers",
      options
    );

  const executionResult =
    composeField(
      resolution,
      "execution",
      {
        ...options,

        preserveNativeExecution:
          true
      }
    );

  const effectResult =
    composeField(
      resolution,
      "effect",
      options
    );

  const execution =
    composeExecutionDescriptor(
      resolution,
      executionResult
    );

  const actions = [];
  const childConflicts = [];
  const childUnresolved = [];

  for (
    const actorOwnedAction of
      getActorOwnedFeatureActionsForComposition(
        resolution
      )
  ) {
    const childResolution =
      createChildActionResolution(
        resolution,
        actorOwnedAction
      );

    const child =
      composeSystemBridgeRuntimeAction(
        childResolution,
        options
      );

    actions.push(
      child.action
    );

    childConflicts.push(
      ...child.conflicts
    );

    childUnresolved.push(
      ...child.unresolved
    );
  }

  const unresolved =
    deriveUnresolvedRequirements({
      resolution,

      actionEconomy:
        null,

      targeting:
        targetingResult.value,

      resources:
        resourcesResult.value,

      lifecycle:
        lifecycleResult.value,

      triggers:
        triggersResult.value,

      execution,

      effect:
        effectResult.value
    });

  const runtimeStatus =
    deriveRuntimeStatus({
      actorOwnedFeature:
        getActorOwnedFeature(
          resolution
        ),

      actorOwnedAction:
        null,

      execution,

      effect:
        effectResult.value,

      unresolved
    });

  const provenance = [
    ...presentationResult.contributions,

    ...targetingResult.acceptedContributions,

    ...resourcesResult.acceptedContributions,

    ...lifecycleResult.acceptedContributions,

    ...triggersResult.acceptedContributions,

    ...executionResult.acceptedContributions,

    ...effectResult.acceptedContributions
  ]
    .map(
      contribution =>
        contribution.provenance
    )
    .filter(Boolean);

  const feature =
    createSystemBridgeRuntimeFeature({
      identity,

      presentation:
        presentationResult.value,

      actions,

      targeting:
        targetingResult.value,

      resources:
        normalizeArray(
          resourcesResult.value
        ),

      lifecycle:
        lifecycleResult.value,

      triggers:
        normalizeArray(
          triggersResult.value
        ),

      execution,

      effect:
        effectResult.value,

      runtimeStatus,

      provenance,

      unresolved,

      metadata: {
        composedBy:
          SYSTEM_BRIDGE_COMPOSER_MODULE_ID
      }
    });

  return Object.freeze({
    feature,

    conflicts:
      Object.freeze([
        ...presentationResult.conflicts,
        ...targetingResult.conflicts,
        ...resourcesResult.conflicts,
        ...lifecycleResult.conflicts,
        ...triggersResult.conflicts,
        ...executionResult.conflicts,
        ...effectResult.conflicts,
        ...childConflicts
      ]),

    unresolved:
      Object.freeze([
        ...unresolved,
        ...childUnresolved
      ])
  });
}

/* ============================================================
   SUBJECT COMPOSITION
   ============================================================ */

export function composeResolvedSystemBridgeSubject(
  resolution,
  options = {}
) {
  const subjectKind =
    resolution
      ?.identity
      ?.subjectKind ??
    SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN;

  switch (subjectKind) {
    case SYSTEM_BRIDGE_SUBJECT_KIND.FEATURE:
      return Object.freeze({
        kind:
          "feature",

        ...composeSystemBridgeRuntimeFeature(
          resolution,
          options
        )
      });

    case SYSTEM_BRIDGE_SUBJECT_KIND.ACTION:
    case SYSTEM_BRIDGE_SUBJECT_KIND.WEAPON_PROFILE:
    case SYSTEM_BRIDGE_SUBJECT_KIND.TALENT_RANK:
    case SYSTEM_BRIDGE_SUBJECT_KIND.UNIVERSAL_ACTION:
      return Object.freeze({
        kind:
          "action",

        ...composeSystemBridgeRuntimeAction(
          resolution,
          options
        )
      });

    case SYSTEM_BRIDGE_SUBJECT_KIND.UNKNOWN:
    default:
      /*
       * If an actor-owned action exists, prefer action composition.
       */
      if (
        getActorOwnedAction(
          resolution
        )
      ) {
        return Object.freeze({
          kind:
            "action",

          ...composeSystemBridgeRuntimeAction(
            resolution,
            options
          )
        });
      }

      return Object.freeze({
        kind:
          "feature",

        ...composeSystemBridgeRuntimeFeature(
          resolution,
          options
        )
      });
  }
}

/* ============================================================
   COMPOSITION STATUS DERIVATION
   ============================================================ */

function deriveCompositionStatus({
  resolution,

  conflicts,

  unresolved
}) {
  if (
    resolution?.status ===
    SYSTEM_BRIDGE_RESOLUTION_STATUS.FAILED
  ) {
    return SYSTEM_BRIDGE_COMPOSITION_STATUS.FAILED;
  }

  if (
    resolution?.status ===
      SYSTEM_BRIDGE_RESOLUTION_STATUS.NOT_FOUND ||
    resolution?.status ===
      SYSTEM_BRIDGE_RESOLUTION_STATUS.AMBIGUOUS
  ) {
    return SYSTEM_BRIDGE_COMPOSITION_STATUS.UNRESOLVED;
  }

  if (
    conflicts.some(
      conflict =>
        conflict.blocking
    )
  ) {
    return SYSTEM_BRIDGE_COMPOSITION_STATUS.CONFLICTED;
  }

  if (
    unresolved.some(
      requirement =>
        requirement.required
    )
  ) {
    return SYSTEM_BRIDGE_COMPOSITION_STATUS.PARTIAL;
  }

  if (
    conflicts.length >
    0
  ) {
    return SYSTEM_BRIDGE_COMPOSITION_STATUS.COMPOSED;
  }

  return SYSTEM_BRIDGE_COMPOSITION_STATUS.COMPOSED;
}

/* ============================================================
   AUGMENTATIONS APPLIED
   ============================================================ */

function getAppliedAugmentationIds(
  resolution
) {
  return Object.freeze(
    getAugmentationMatches(
      resolution
    )
      .map(
        match =>
          match
            ?.augmentation
            ?.identity
            ?.id
      )
      .filter(Boolean)
  );
}

/* ============================================================
   PRIMARY COMPOSITION
   ============================================================ */

/**
 * @section primary-composition
 *
 * Canonical composer entry.
 */

export function composeSystemBridgeResolution(
  resolution,
  options = {}
) {
  if (!resolution) {
    throw new TypeError(
      "composeSystemBridgeResolution requires SystemBridgeResolutionResult."
    );
  }

  if (
    resolution.status ===
    SYSTEM_BRIDGE_RESOLUTION_STATUS.FAILED
  ) {
    return createSystemBridgeCompositionResult({
      status:
        SYSTEM_BRIDGE_COMPOSITION_STATUS.FAILED,

      resolution,

      warnings:
        resolution.warnings,

      conflicts:
        resolution.conflicts,

      unresolved: [
        createSystemBridgeUnresolvedRequirement({
          kind:
            SYSTEM_BRIDGE_UNRESOLVED_KIND.UNKNOWN,

          required:
            true,

          message:
            resolution.reason ??
            "System bridge source resolution failed."
        })
      ]
    });
  }

  if (
    resolution.status ===
      SYSTEM_BRIDGE_RESOLUTION_STATUS.AMBIGUOUS
  ) {
    return createSystemBridgeCompositionResult({
      status:
        SYSTEM_BRIDGE_COMPOSITION_STATUS.UNRESOLVED,

      resolution,

      warnings:
        resolution.warnings,

      conflicts:
        resolution.conflicts,

      unresolved: [
        createSystemBridgeUnresolvedRequirement({
          kind:
            SYSTEM_BRIDGE_UNRESOLVED_KIND.IDENTITY,

          field:
            "identity",

          required:
            true,

          message:
            "System bridge source identity is ambiguous."
        })
      ]
    });
  }

  if (
    resolution.status ===
    SYSTEM_BRIDGE_RESOLUTION_STATUS.NOT_FOUND
  ) {
    return createSystemBridgeCompositionResult({
      status:
        SYSTEM_BRIDGE_COMPOSITION_STATUS.UNRESOLVED,

      resolution,

      warnings:
        resolution.warnings,

      conflicts:
        resolution.conflicts,

      unresolved: [
        createSystemBridgeUnresolvedRequirement({
          kind:
            SYSTEM_BRIDGE_UNRESOLVED_KIND.IDENTITY,

          field:
            "identity",

          required:
            true,

          message:
            "No bridge source could be resolved."
        })
      ]
    });
  }

  const subject =
    composeResolvedSystemBridgeSubject(
      resolution,
      options
    );

  const feature =
    subject.kind ===
      "feature"
      ? subject.feature
      : null;

  const action =
    subject.kind ===
      "action"
      ? subject.action
      : null;

  const conflicts =
    Object.freeze([
      ...(
        resolution.conflicts ??
        []
      ),
      ...(
        subject.conflicts ??
        []
      )
    ]);

  const unresolved =
    Object.freeze([
      ...(
        subject.unresolved ??
        []
      )
    ]);

  const warnings = [
    ...(
      resolution.warnings ??
      []
    )
  ];

  if (
    conflicts.length >
    0
  ) {
    warnings.push(
      createSystemBridgeWarning({
        code:
          "bridge-composition-conflicts",

        message:
          "Bridge composition encountered conflicting source values.",

        metadata: {
          conflictCount:
            conflicts.length
        }
      })
    );
  }

  const status =
    deriveCompositionStatus({
      resolution,
      conflicts,
      unresolved
    });

  return createSystemBridgeCompositionResult({
    status,

    resolution,

    feature,

    action,

    contributions:
      feature?.provenance ??
      action?.provenance ??
      [],

    augmentationsApplied:
      getAppliedAugmentationIds(
        resolution
      ),

    warnings,

    conflicts,

    unresolved,

    metadata: {
      composedBy:
        SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

      subjectKind:
        subject.kind
    }
  });
}

/* ============================================================
   COMPOSITION RESULT ACCESS
   ============================================================ */

export function getComposedSystemBridgeFeature(
  result
) {
  return (
    result?.feature ??
    null
  );
}

export function getComposedSystemBridgeAction(
  result
) {
  return (
    result?.action ??
    null
  );
}

export function getComposedSystemBridgeRuntimeDescriptor(
  result
) {
  return (
    result?.action ??
    result?.feature ??
    null
  );
}

/* ============================================================
   COMPOSITION PREDICATES
   ============================================================ */

export function didSystemBridgeCompositionComplete(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_COMPOSITION_STATUS.COMPOSED
  );
}

export function isSystemBridgeCompositionPartial(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_COMPOSITION_STATUS.PARTIAL
  );
}

export function isSystemBridgeCompositionConflicted(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_COMPOSITION_STATUS.CONFLICTED
  );
}

export function isSystemBridgeCompositionUnresolved(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_COMPOSITION_STATUS.UNRESOLVED
  );
}

export function didSystemBridgeCompositionFail(
  result
) {
  return (
    result?.status ===
    SYSTEM_BRIDGE_COMPOSITION_STATUS.FAILED
  );
}

/* ============================================================
   NATIVE EXECUTION PRESERVATION RULE
   ============================================================ */

/**
 * @section native-execution-preservation-rule
 *
 * Highest-priority bridge invariant:
 *
 * if actor-owned/native data exposes confirmed native execution:
 *
 * preserve it.
 *
 * Augmentation may add:
 *
 * supplementalExecutionId
 * effect metadata
 * trigger metadata
 * targeting metadata
 * lifecycle metadata
 *
 * but native execution remains the primary native path.
 *
 * This keeps Frame Conn as an alternate command/presentation layer over the
 * native Foundry Lancer system rather than a replacement rules engine.
 */

/* ============================================================
   FIELD-BY-FIELD RULE
   ============================================================ */

/**
 * @section field-by-field-rule
 *
 * Sources are never selected as whole descriptor winners.
 *
 * Example:
 *
 * presentation
 *     existing registry
 *
 * native execution
 *     actor-owned/native
 *
 * Range
 *     actor-owned structured data
 *
 * enemy-only target restriction
 *     augmentation
 *
 * lifecycle
 *     augmentation
 *
 * The resulting RuntimeAction may therefore have several provenance sources.
 */

/* ============================================================
   PRESENTATION RULE
   ============================================================ */

/**
 * @section presentation-rule
 *
 * Existing Frame Conn registry is presentation-oriented.
 *
 * Its explicit:
 *
 * label
 * category
 * icon
 * sort
 *
 * should normally remain preferred presentation data.
 *
 * Actor-owned/native name/description fills missing presentation fields.
 *
 * This differs intentionally from native-runtime authority precedence.
 */

/* ============================================================
   ACTION ECONOMY RULE
   ============================================================ */

/**
 * @section action-economy-rule
 *
 * Structured actor-owned action activation generally outranks existing
 * registry economy metadata when they directly conflict.
 *
 * The conflict remains recorded.
 *
 * Bridge only describes economy.
 *
 * action_economy validates/spends it later.
 */

/* ============================================================
   TARGETING RULE
   ============================================================ */

/**
 * @section targeting-rule
 *
 * Structured actor-owned Range/Threat/Sensors evidence is preserved.
 *
 * Augmentation commonly fills missing:
 *
 * target count
 * relationship
 * self permission
 * adjacency
 * LOS
 * special target type
 *
 * FILL_MISSING is therefore the preferred targeting augmentation mode.
 *
 * targeting_spatial_service owns runtime validation.
 */

/* ============================================================
   RESOURCE RULE
   ============================================================ */

/**
 * @section resource-rule
 *
 * Structured native resource evidence remains authoritative.
 *
 * Augmentation may add supplemental resources/frequency counters.
 *
 * resource_service owns actual current value, spending, restore, and reset.
 */

/* ============================================================
   LIFECYCLE RULE
   ============================================================ */

/**
 * @section lifecycle-rule
 *
 * Lifecycle is often absent from native structured feature data.
 *
 * Curated augmentation may therefore become the only lifecycle contribution.
 *
 * This is expected.
 *
 * lifecycle_service remains timing authority.
 */

/* ============================================================
   TRIGGER RULE
   ============================================================ */

/**
 * @section trigger-rule
 *
 * Triggers may be supplied by explicit native/registry structure or curated
 * augmentation.
 *
 * Composer never derives triggers from semantic prose.
 *
 * semantic_event_bus remains event vocabulary/transport authority.
 */

/* ============================================================
   EFFECT RULE
   ============================================================ */

/**
 * @section effect-rule
 *
 * Semantic rule text may survive as inert effect information.
 *
 * A supplemental execution ID may make that effect executable.
 *
 * Semantic text alone does not become executable behavior.
 */

/* ============================================================
   PARTIAL NATIVE RULE
   ============================================================ */

/**
 * @section partial-native-rule
 *
 * Example:
 *
 * actor-owned weapon:
 *
 * native attack = executable
 * native damage = executable
 * native chat = executable
 * special rule = semantic-only
 *
 * augmentation:
 *
 * supplemental special-effect execution
 *
 * composed result:
 *
 * runtimeStatus = COMPOSED
 * nativeExecution preserved
 * supplementalExecutionId present
 */

/* ============================================================
   CONFLICT RULE
   ============================================================ */

/**
 * @section conflict-rule
 *
 * Non-blocking conflicts preserve auditability.
 *
 * Example:
 *
 * native activation:
 * Full
 *
 * existing registry:
 * Quick
 *
 * structured native wins.
 *
 * conflict remains in SystemBridgeCompositionResult.
 *
 * Identity ambiguity is resolved earlier and remains blocking.
 */

/* ============================================================
   OVERRIDE RULE
   ============================================================ */

/**
 * @section override-rule
 *
 * OVERRIDE is explicit and diagnosable.
 *
 * Even then:
 *
 * confirmed native execution is protected by default.
 *
 * This protection may only be changed deliberately in future composer policy,
 * not by ordinary augmentation registration.
 */

/* ============================================================
   UNRESOLVED RULE
   ============================================================ */

/**
 * @section unresolved-rule
 *
 * Composer does not require every runtime domain for every mechanic.
 *
 * Examples:
 *
 * Boost does not require a resource.
 * Brace may not require ordinary targeting.
 * Passive frame traits may not require action economy.
 *
 * Required fields may be declared through bridge request metadata.
 *
 * Missing explicitly-required fields become unresolved.
 *
 * Executable action subjects also require either:
 *
 * native execution
 * supplemental execution
 * or explicitly executable effect behavior.
 */

/* ============================================================
   SEMANTIC EXECUTION CONTEXT BOUNDARY
   ============================================================ */

/**
 * @section semantic-execution-context-boundary
 *
 * Output:
 *
 * RuntimeAction / RuntimeFeature
 *
 * Downstream:
 *
 * semantic_execution_context
 *
 * The bridge does not build a duplicate ExecutionContext.
 */

/* ============================================================
   EXECUTION TRANSACTION BOUNDARY
   ============================================================ */

/**
 * @section execution-transaction-boundary
 *
 * Composer describes:
 *
 * action economy
 * targets
 * resources
 * lifecycle
 * execution path
 *
 * execution_transaction coordinates:
 *
 * prevalidation
 * targeting
 * final validation
 * native/supplemental execution
 * commit
 */

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

export function getSystemBridgeComposerDiagnostics() {
  return Object.freeze({
    id:
      SYSTEM_BRIDGE_COMPOSER_MODULE_ID,

    version:
      SYSTEM_BRIDGE_COMPOSER_MODULE_VERSION,

    policies:
      Object.freeze({
        fieldByFieldComposition:
          true,

        preserveNativeExecution:
          true,

        augmentationDefault:
          SYSTEM_BRIDGE_AUGMENTATION_MODE.FILL_MISSING,

        explicitOverrideSupported:
          true,

        recordsConflicts:
          true,

        recordsUnresolved:
          true,

        parsesSemanticProse:
          false
      }),

    authorityWeights:
      SYSTEM_BRIDGE_AUTHORITY_WEIGHT
  });
}

/* ============================================================
   EXISTING FRAME CONN ARCHITECTURE NOTES
   ============================================================ */

/**
 * @section existing-frame-conn-architecture-notes
 *
 * existing Frame Conn registry
 * ----------------------------
 *
 * Primarily contributes:
 *
 * presentation
 * category
 * declared action identity
 * existing explicit action metadata
 *
 *
 * actor_owned_feature_registry/
 * -----------------------------
 *
 * Primarily contributes:
 *
 * native provenance
 * actor/item identity
 * structured action data
 * Range/Threat/Sensors
 * resources
 * native execution
 *
 *
 * system-bridge augmentation registry
 * -----------------------------------
 *
 * Primarily contributes:
 *
 * missing target semantics
 * missing economy semantics
 * missing lifecycle
 * missing triggers
 * supplemental resources
 * supplemental execution/effects
 *
 *
 * native_adapter/
 * ---------------
 *
 * Remains native execution authority downstream.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Consumes bridge output downstream.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Executes composed action downstream.
 *
 *
 * resource_service/
 * -----------------
 *
 * Owns resource runtime.
 *
 *
 * action_economy/
 * ---------------
 *
 * Owns action economy runtime.
 *
 *
 * semantic_event_bus/
 * -------------------
 *
 * Owns event runtime.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Owns lifecycle runtime.
 *
 *
 * targeting-spatial_service/
 * --------------------------
 *
 * Owns targeting runtime.
 */

/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */

/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * system-bridge-composer.js composes resolved sources but does not resolve
 * source identity.
 *
 * INVARIANT 2
 * Composition is field-by-field.
 *
 * INVARIANT 3
 * Existing Frame Conn registry remains presentation/action metadata source.
 *
 * INVARIANT 4
 * Actor-owned structured/native data remains runtime/native provenance
 * source.
 *
 * INVARIANT 5
 * Augmentation supplies missing/supplemental semantics.
 *
 * INVARIANT 6
 * Confirmed native execution is preserved.
 *
 * INVARIANT 7
 * PARTIAL_NATIVE can become COMPOSED without replacing native execution.
 *
 * INVARIANT 8
 * FILL_MISSING is the default augmentation behavior.
 *
 * INVARIANT 9
 * OVERRIDE is explicit and produces diagnostics when values differ.
 *
 * INVARIANT 10
 * Source conflicts remain visible.
 *
 * INVARIANT 11
 * Missing required runtime fields remain explicitly unresolved.
 *
 * INVARIANT 12
 * Semantic prose is never converted into triggers/lifecycle/effects
 * automatically.
 *
 * INVARIANT 13
 * Runtime descriptors remain immutable.
 *
 * INVARIANT 14
 * resource_service remains resource authority.
 *
 * INVARIANT 15
 * action_economy remains economy authority.
 *
 * INVARIANT 16
 * semantic_event_bus remains event authority.
 *
 * INVARIANT 17
 * lifecycle_service remains lifecycle authority.
 *
 * INVARIANT 18
 * targeting_spatial_service remains targeting/spatial authority.
 *
 * INVARIANT 19
 * native_adapter remains native Foundry Lancer execution authority.
 *
 * INVARIANT 20
 * semantic_execution_context and execution_transaction remain downstream
 * execution boundaries.
 */