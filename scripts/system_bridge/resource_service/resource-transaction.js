/* ============================================================
   FILE PATH / NAME
   ============================================================ */
/**
 * main/resource_service/resource-transaction.js
 */
/**
 * @file
 * @path main/resource_service/resource-transaction.js
 * @module resource-transaction
 * @layer resource-service-transaction
 * @responsibility validate-snapshot-verify-and-commit-execution-resources
 * @public-boundary false
 * @side-effects delegated-resource-mutation-only
 *
 * @depends-on
 * - resource-contract
 * - resource-resolver
 * - native_adapter/native-adapter
 *
 * EXISTING FRAME CONN INTEGRATION:
 * - consumes ExecutionContext resource identity through resource-resolver.js
 * - consumed by resource-hooks.js
 * - consumed by resource-service.js
 * - integrates with execution_transaction/ prevalidation and commit stages
 * - verifies native resource mutation performed by native Lancer Flows
 * - commits Frame Conn-owned deferred resources
 *
 * EXISTING ARCHITECTURE PRESERVED:
 * - native_adapter/native-resources.js remains native Lancer authority
 * - execution_transaction/ remains lifecycle/ordering authority
 * - resource-resolver.js remains discovery/read authority
 * - future lifecycle_service/ remains reset/expiration authority
 * - future feature_runtime_bridge/ remains augmentation source
 *
 * THIS FILE OWNS:
 * - resource pre-execution snapshots
 * - resource validation
 * - native resource post-execution verification
 * - deferred resource mutation
 * - immediate resource mutation primitive
 * - resource transaction aggregation
 * - normalized resource commit results
 *
 * THIS FILE DOES NOT OWN:
 * - resource discovery
 * - semantic feature interpretation
 * - native Flow execution
 * - action economy
 * - transaction phase sequencing
 * - lifecycle reset scheduling
 * - target legality
 *
 * EDIT CONTRACT:
 * - never double-consume native Flow-owned resources
 * - snapshot before execution
 * - verify native-consumed resources after execution
 * - commit deferred resources only when transaction asks
 * - preserve partial failure truth
 * - all native mutations go through native_adapter
 */
/* ============================================================
   IMPORTS
   ============================================================ */
import {
  RESOURCE_AUTHORITY,
  RESOURCE_COMMIT_STATUS,
  RESOURCE_CONSUMPTION,
  RESOURCE_KIND,
  RESOURCE_OPERATION,
  RESOURCE_RESULT_STATUS,
  RESOURCE_VALIDATION_STATUS,
  createNativeResourceVerificationResult,
  createResourceCommitResult,
  createResourceOperationResult,
  createResourceSnapshot,
  createResourceTransactionSnapshot,
  createResourceValidationIssue,
  createResourceValidationSummary,
  resourceCommitFailed,
  resourceCommitNothing,
  resourceCommitPartial,
  resourceCommitSucceeded,
  resourceCommitVerified,
  resourceValidationFailed,
  resourceValidationSucceeded,
  validateResourceSnapshot
} from "./resource-contract.js";
import {
  findResolvedResourceSnapshot,
  resolveExecutionResourceSnapshot,
  resolveExecutionResources
} from "./resource-resolver.js";
import {
  nativeAdapter
} from "../native_adapter/native-adapter.js";
/* ============================================================
   PRIVATE HELPERS
   ============================================================ */
/**
 * @section private-helpers
 */
function requiredString(value) {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}
function finiteNumber(value) {
  return Number.isFinite(value);
}
function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}
function freezeArray(value) {
  return Object.freeze(
    Array.isArray(value)
      ? [...value]
      : []
  );
}
function getExecutionId(
  context
) {
  return (
    context
      ?.identity
      ?.executionId ??
    null
  );
}
/* ============================================================
   RESOURCE MUTATION CALCULATION
   ============================================================ */
/**
 * @section resource-mutation-calculation
 *
 * Generic arithmetic/boolean mutation only.
 *
 * Feature-specific mutation semantics remain strategy-owned.
 */
function calculateMutationValue(
  snapshot,
  mutation
) {
  if (!mutation) {
    return snapshot?.value;
  }
  const current =
    snapshot?.value;
  switch (
    mutation.operation
  ) {
    case RESOURCE_OPERATION.SPEND:
    case RESOURCE_OPERATION.DECREMENT:
      if (
        !finiteNumber(current) ||
        !finiteNumber(
          mutation.amount
        )
      ) {
        throw new TypeError(
          "Numeric decrement requires numeric current value and amount."
        );
      }
      return (
        current -
        mutation.amount
      );
    case RESOURCE_OPERATION.RESTORE:
    case RESOURCE_OPERATION.INCREMENT:
      if (
        !finiteNumber(current) ||
        !finiteNumber(
          mutation.amount
        )
      ) {
        throw new TypeError(
          "Numeric increment requires numeric current value and amount."
        );
      }
      return (
        current +
        mutation.amount
      );
    case RESOURCE_OPERATION.SET:
      return mutation.value;
    case RESOURCE_OPERATION.RESET:
      if (
        mutation.value !==
        undefined
      ) {
        return mutation.value;
      }
      if (
        snapshot?.max != null
      ) {
        return snapshot.max;
      }
      return current;
    default:
      return current;
  }
}
/* ============================================================
   EXPECTED NATIVE MUTATION
   ============================================================ */
/**
 * @section expected-native-mutation
 *
 * Determines what post-native state should look like.
 *
 * This is verification only.
 */
function calculateExpectedNativeValue(
  descriptor,
  before
) {
  const operation =
    descriptor.nativeOperation;
  switch (operation) {
    case RESOURCE_OPERATION.SPEND:
    case RESOURCE_OPERATION.DECREMENT:
      if (
        finiteNumber(
          before?.value
        )
      ) {
        const amount =
          descriptor
            ?.mutation
            ?.amount ??
          1;
        return (
          before.value -
          amount
        );
      }
      return null;
    case RESOURCE_OPERATION.SET:
      /*
       * Loading weapons generally transition:
       *
       * loaded true → false
       */
      if (
        descriptor
          .identity
          .kind ===
        RESOURCE_KIND.LOADED
      ) {
        return false;
      }
      return (
        descriptor
          ?.mutation
          ?.value ??
        null
      );
    default:
      return null;
  }
}
/* ============================================================
   NATIVE VERIFICATION
   ============================================================ */
/**
 * @section native-verification
 */
function verifyNativeTransition(
  descriptor,
  before,
  after
) {
  const expected =
    calculateExpectedNativeValue(
      descriptor,
      before
    );
  if (
    expected !== null
  ) {
    return (
      after?.value ===
      expected
    );
  }
  switch (
    descriptor
      .identity
      .kind
  ) {
    case RESOURCE_KIND.LIMITED:
    case RESOURCE_KIND.CORE_ENERGY:
      if (
        finiteNumber(
          before?.value
        ) &&
        finiteNumber(
          after?.value
        )
      ) {
        return (
          after.value <
          before.value
        );
      }
      break;
    case RESOURCE_KIND.LOADED:
      return (
        before?.available ===
          true &&
        (
          after?.available ===
            false ||
          after?.value ===
            false
        )
      );
    default:
      break;
  }
  /*
   * VERIFY_ONLY resources without a defined expected transition cannot be
   * mechanically asserted here.
   *
   * Presence of readable post-state is sufficient.
   */
  return Boolean(
    after &&
    after.exists !== false
  );
}
/* ============================================================
   RESOURCE PREPARATION
   ============================================================ */
/**
 * @section resource-preparation
 *
 * Resolve descriptors + initial snapshots before native/semantic
 * execution.
 */
export async function prepareResourceTransaction(
  context,
  options = {}
) {
  if (!context) {
    throw new TypeError(
      "prepareResourceTransaction requires ExecutionContext."
    );
  }
  const executionId =
    getExecutionId(
      context
    );
  if (!requiredString(executionId)) {
    throw new TypeError(
      "ExecutionContext requires identity.executionId."
    );
  }
  const resolved =
    await resolveExecutionResources(
      context,
      options
    );
  return createResourceTransactionSnapshot({
    executionId,
    descriptors:
      resolved.descriptors,
    before:
      resolved.snapshots,
    metadata: {
      collection:
        resolved.collection
    }
  });
}
/* ============================================================
   SINGLE RESOURCE VALIDATION
   ============================================================ */
/**
 * @section single-resource-validation
 */
export async function validateExecutionResource(
  context,
  descriptor,
  {
    snapshot = null
  } = {}
) {
  const resolvedSnapshot =
    snapshot ??
    await resolveExecutionResourceSnapshot(
      context,
      descriptor
    );
  if (
    descriptor.optional &&
    resolvedSnapshot.exists === false
  ) {
    return resourceValidationSucceeded({
      descriptor,
      snapshot:
        resolvedSnapshot,
      metadata: {
        optionalAbsent:
          true
      }
    });
  }
  return validateResourceSnapshot(
    descriptor,
    resolvedSnapshot
  );
}
/* ============================================================
   ALL RESOURCE VALIDATION
   ============================================================ */
/**
 * @section all-resource-validation
 */
export async function validateExecutionResources(
  context,
  {
    snapshot = null,
    descriptors = null,
    declarations = [],
    discoverNative = true
  } = {}
) {
  let workingSnapshot =
    snapshot;
  if (!workingSnapshot) {
    workingSnapshot =
      await prepareResourceTransaction(
        context,
        {
          declarations,
          discoverNative
        }
      );
  }
  const resourceDescriptors =
    descriptors ??
    workingSnapshot.descriptors;
  const results = [];
  for (
    const descriptor of
      resourceDescriptors
  ) {
    if (!descriptor?.required) {
      continue;
    }
    const before =
      findResolvedResourceSnapshot(
        workingSnapshot.before,
        descriptor.identity.id
      );
    try {
      results.push(
        await validateExecutionResource(
          context,
          descriptor,
          {
            snapshot:
              before
          }
        )
      );
    } catch (error) {
      results.push(
        resourceValidationFailed({
          descriptor,
          snapshot:
            before,
          issues: [
            createResourceValidationIssue({
              resourceId:
                descriptor.identity.id,
              code:
                "resource-validation-error",
              message:
                error?.message ??
                "Resource validation failed.",
              metadata: {
                error
              }
            })
          ]
        })
      );
    }
  }
  const summary =
    createResourceValidationSummary({
      results
    });
  return Object.freeze({
    summary,
    snapshot:
      createResourceTransactionSnapshot({
        ...workingSnapshot,
        validations:
          results
      })
  });
}
/* ============================================================
   FRAME CONN STATE WRITER BOUNDARY
   ============================================================ */
/**
 * @section frame-conn-state-writer-boundary
 *
 * Supplemental persistence has not yet been built.
 *
 * This file accepts a writer function for Frame Conn-owned state:
 *
 * writer({
 *   context,
 *   descriptor,
 *   before,
 *   value,
 *   operation
 * })
 *
 * This keeps persistence out of the resource contract.
 */
async function writeFrameConnResource({
  context,
  descriptor,
  before,
  value,
  operation,
  writer
}) {
  if (
    typeof writer !==
    "function"
  ) {
    throw new Error(
      `No Frame Conn resource writer available for ${descriptor.identity.id}.`
    );
  }
  return writer({
    context,
    descriptor,
    before,
    value,
    operation
  });
}
/* ============================================================
   NATIVE RESOURCE WRITER
   ============================================================ */
/**
 * @section native-resource-writer
 *
 * Only used for resources explicitly classified as Frame Conn-consumed
 * despite native backing.
 *
 * Native Flow-owned resources NEVER pass through this path.
 */
async function writeNativeResource({
  descriptor,
  value,
  mutation
}) {
  const resources =
    nativeAdapter.resources;
  if (
    typeof resources
      .setNativeResourceState ===
    "function"
  ) {
    return resources
      .setNativeResourceState(
        descriptor,
        {
          value,
          mutation
        }
      );
  }
  const itemUuid =
    descriptor
      .identity
      .itemUuid;
  const key =
    descriptor
      .identity
      .key;
  if (
    (
      descriptor.identity.kind ===
        RESOURCE_KIND.COUNTER ||
      descriptor.identity.kind ===
        RESOURCE_KIND.CHARGE
    ) &&
    itemUuid &&
    key &&
    typeof resources
      .setNativeCounterState ===
      "function"
  ) {
    return resources
      .setNativeCounterState(
        itemUuid,
        key,
        value
      );
  }
  throw new Error(
    `No native resource mutation path for ${descriptor.identity.id}.`
  );
}
/* ============================================================
   SINGLE DEFERRED MUTATION
   ============================================================ */
/**
 * @section single-deferred-mutation
 */
export async function commitDeferredResource(
  context,
  descriptor,
  {
    before = null,
    frameConnWriter = null
  } = {}
) {
  if (
    descriptor.consumption !==
    RESOURCE_CONSUMPTION.DEFERRED
  ) {
    return createResourceOperationResult({
      descriptor,
      operation:
        descriptor
          ?.mutation
          ?.operation ??
        RESOURCE_OPERATION.VERIFY,
      status:
        RESOURCE_RESULT_STATUS.SKIPPED,
      before,
      after:
        before,
      reason:
        "resource-not-deferred"
    });
  }
  const mutation =
    descriptor.mutation;
  if (!mutation) {
    return createResourceOperationResult({
      descriptor,
      operation:
        RESOURCE_OPERATION.VERIFY,
      status:
        RESOURCE_RESULT_STATUS.SKIPPED,
      before,
      after:
        before,
      reason:
        "resource-has-no-mutation"
    });
  }
  let resolvedBefore =
    before;
  if (!resolvedBefore) {
    resolvedBefore =
      await resolveExecutionResourceSnapshot(
        context,
        descriptor
      );
  }
  let value;
  try {
    value =
      calculateMutationValue(
        resolvedBefore,
        mutation
      );
  } catch (error) {
    return createResourceOperationResult({
      descriptor,
      operation:
        mutation.operation,
      status:
        RESOURCE_RESULT_STATUS.FAILED,
      before:
        resolvedBefore,
      error,
      reason:
        "resource-mutation-calculation-failed"
    });
  }
  try {
    let rawWrite;
    switch (
      descriptor
        .identity
        .authority
    ) {
      case RESOURCE_AUTHORITY.FRAME_CONN:
        rawWrite =
          await writeFrameConnResource({
            context,
            descriptor,
            before:
              resolvedBefore,
            value,
            operation:
              mutation.operation,
            writer:
              frameConnWriter
          });
        break;
      case RESOURCE_AUTHORITY.NATIVE:
        rawWrite =
          await writeNativeResource({
            descriptor,
            value,
            mutation
          });
        break;
      case RESOURCE_AUTHORITY.DERIVED:
        return createResourceOperationResult({
          descriptor,
          operation:
            mutation.operation,
          status:
            RESOURCE_RESULT_STATUS.INVALID,
          before:
            resolvedBefore,
          reason:
            "derived-resource-cannot-be-mutated"
        });
      case RESOURCE_AUTHORITY.EXTERNAL:
      default:
        return createResourceOperationResult({
          descriptor,
          operation:
            mutation.operation,
          status:
            RESOURCE_RESULT_STATUS.UNAVAILABLE,
          before:
            resolvedBefore,
          reason:
            "resource-authority-not-writable"
        });
    }
    let after;
    try {
      after =
        await resolveExecutionResourceSnapshot(
          context,
          descriptor
        );
    } catch {
      after =
        createResourceSnapshot({
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
            true,
          raw:
            rawWrite,
          metadata: {
            synthesizedAfterWrite:
              true
          }
        });
    }
    return createResourceOperationResult({
      descriptor,
      operation:
        mutation.operation,
      status:
        RESOURCE_RESULT_STATUS.SUCCEEDED,
      before:
        resolvedBefore,
      after,
      amount:
        mutation.amount,
      metadata: {
        rawWrite
      }
    });
  } catch (error) {
    return createResourceOperationResult({
      descriptor,
      operation:
        mutation.operation,
      status:
        RESOURCE_RESULT_STATUS.FAILED,
      before:
        resolvedBefore,
      amount:
        mutation.amount,
      error,
      reason:
        "resource-write-failed"
    });
  }
}
/* ============================================================
   IMMEDIATE RESOURCE MUTATION
   ============================================================ */
/**
 * @section immediate-resource-mutation
 *
 * Same mutation machinery as deferred commit.
 *
 * Caller explicitly chooses this timing.
 */
export async function commitImmediateResource(
  context,
  descriptor,
  options = {}
) {
  if (
    descriptor.consumption !==
    RESOURCE_CONSUMPTION.IMMEDIATE
  ) {
    return createResourceOperationResult({
      descriptor,
      operation:
        descriptor
          ?.mutation
          ?.operation ??
        RESOURCE_OPERATION.VERIFY,
      status:
        RESOURCE_RESULT_STATUS.SKIPPED,
      reason:
        "resource-not-immediate"
    });
  }
  /*
   * Reuse deferred machinery with an immutable temporary descriptor.
   */
  const deferredDescriptor =
    Object.freeze({
      ...descriptor,
      consumption:
        RESOURCE_CONSUMPTION.DEFERRED
    });
  return commitDeferredResource(
    context,
    deferredDescriptor,
    options
  );
}
/* ============================================================
   NATIVE RESOURCE VERIFICATION
   ============================================================ */
/**
 * @section native-resource-verification
 */
export async function verifyNativeResource(
  context,
  descriptor,
  before
) {
  if (
    descriptor.consumption !==
      RESOURCE_CONSUMPTION.NATIVE &&
    descriptor.consumption !==
      RESOURCE_CONSUMPTION.VERIFY_ONLY
  ) {
    return createNativeResourceVerificationResult({
      descriptor,
      before,
      after:
        before,
      verified:
        true,
      expectedOperation:
        descriptor.nativeOperation,
      reason:
        "resource-not-native-consumed"
    });
  }
  let after;
  try {
    after =
      await resolveExecutionResourceSnapshot(
        context,
        descriptor
      );
  } catch (error) {
    return createNativeResourceVerificationResult({
      descriptor,
      before,
      after:
        null,
      verified:
        false,
      expectedOperation:
        descriptor.nativeOperation,
      reason:
        "native-resource-read-failed",
      metadata: {
        error
      }
    });
  }
  const verified =
    verifyNativeTransition(
      descriptor,
      before,
      after
    );
  return createNativeResourceVerificationResult({
    descriptor,
    before,
    after,
    verified,
    expectedOperation:
      descriptor.nativeOperation,
    reason:
      verified
        ? null
        : "native-resource-transition-not-observed"
  });
}
/* ============================================================
   ALL NATIVE RESOURCE VERIFICATION
   ============================================================ */
export async function verifyNativeResources(
  context,
  snapshot
) {
  if (!snapshot) {
    throw new TypeError(
      "verifyNativeResources requires ResourceTransactionSnapshot."
    );
  }
  const results = [];
  for (
    const descriptor of
      snapshot.descriptors
  ) {
    if (
      descriptor.consumption !==
        RESOURCE_CONSUMPTION.NATIVE &&
      descriptor.consumption !==
        RESOURCE_CONSUMPTION.VERIFY_ONLY
    ) {
      continue;
    }
    const before =
      findResolvedResourceSnapshot(
        snapshot.before,
        descriptor.identity.id
      );
    results.push(
      await verifyNativeResource(
        context,
        descriptor,
        before
      )
    );
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   ALL DEFERRED RESOURCE COMMIT
   ============================================================ */
export async function commitDeferredResources(
  context,
  snapshot,
  {
    frameConnWriter = null
  } = {}
) {
  if (!snapshot) {
    throw new TypeError(
      "commitDeferredResources requires ResourceTransactionSnapshot."
    );
  }
  const results = [];
  for (
    const descriptor of
      snapshot.descriptors
  ) {
    if (
      descriptor.consumption !==
      RESOURCE_CONSUMPTION.DEFERRED
    ) {
      continue;
    }
    const before =
      findResolvedResourceSnapshot(
        snapshot.before,
        descriptor.identity.id
      );
    results.push(
      await commitDeferredResource(
        context,
        descriptor,
        {
          before,
          frameConnWriter
        }
      )
    );
  }
  return Object.freeze(
    results
  );
}
/* ============================================================
   RESOURCE COMMIT AGGREGATION
   ============================================================ */
/**
 * @section resource-commit-aggregation
 */
function aggregateResourceCommit({
  executionId,
  baseSnapshot,
  nativeVerifications,
  mutations,
  after
}) {
  const failedNative =
    nativeVerifications.filter(
      result =>
        !result.verified
    );
  const failedMutations =
    mutations.filter(
      result =>
        result.status ===
          RESOURCE_RESULT_STATUS.FAILED ||
        result.status ===
          RESOURCE_RESULT_STATUS.INVALID ||
        result.status ===
          RESOURCE_RESULT_STATUS.UNAVAILABLE
    );
  const successfulMutations =
    mutations.filter(
      result =>
        result.status ===
        RESOURCE_RESULT_STATUS.SUCCEEDED
    );
  const skippedMutations =
    mutations.filter(
      result =>
        result.status ===
        RESOURCE_RESULT_STATUS.SKIPPED
    );
  const snapshot =
    createResourceTransactionSnapshot({
      executionId,
      descriptors:
        baseSnapshot.descriptors,
      before:
        baseSnapshot.before,
      validations:
        baseSnapshot.validations,
      nativeVerifications,
      mutations,
      after,
      metadata:
        baseSnapshot.metadata
    });
  const failed = [
    ...failedNative,
    ...failedMutations
  ];
  if (
    baseSnapshot.descriptors.length ===
      0
  ) {
    return resourceCommitNothing({
      snapshot
    });
  }
  if (
    failed.length === 0 &&
    successfulMutations.length ===
      0 &&
    nativeVerifications.length > 0
  ) {
    return resourceCommitVerified({
      verifiedNative:
        nativeVerifications,
      skipped:
        skippedMutations,
      snapshot
    });
  }
  if (
    failed.length === 0
  ) {
    return resourceCommitSucceeded({
      committed:
        successfulMutations,
      verifiedNative:
        nativeVerifications,
      skipped:
        skippedMutations,
      snapshot
    });
  }
  if (
    successfulMutations.length > 0 ||
    nativeVerifications.some(
      result =>
        result.verified
    )
  ) {
    return resourceCommitPartial({
      committed:
        successfulMutations,
      verifiedNative:
        nativeVerifications,
      skipped:
        skippedMutations,
      failed,
      snapshot,
      reason:
        "resource-commit-partial"
    });
  }
  return resourceCommitFailed({
    failed,
    snapshot,
    reason:
      "resource-commit-failed"
  });
}
/* ============================================================
   FINAL RESOURCE SNAPSHOT
   ============================================================ */
async function resolveAfterSnapshots(
  context,
  descriptors
) {
  const after = [];
  for (
    const descriptor of
      descriptors
  ) {
    try {
      after.push(
        await resolveExecutionResourceSnapshot(
          context,
          descriptor
        )
      );
    } catch (error) {
      after.push(
        createResourceSnapshot({
          identity:
            descriptor.identity,
          exists:
            false,
          available:
            null,
          metadata: {
            error,
            reason:
              "post-commit-resource-read-failed"
          }
        })
      );
    }
  }
  return Object.freeze(
    after
  );
}
/* ============================================================
   PRIMARY RESOURCE COMMIT
   ============================================================ */
/**
 * @section primary-resource-commit
 *
 * Called only after execution_transaction has determined the semantic
 * execution is commit-eligible.
 *
 * Order:
 *
 * 1. verify native-consumed resources
 * 2. commit deferred Frame Conn resources
 * 3. snapshot all final state
 * 4. aggregate normalized result
 */
export async function commitExecutionResources(
  context,
  snapshot,
  {
    frameConnWriter = null
  } = {}
) {
  if (!context) {
    throw new TypeError(
      "commitExecutionResources requires ExecutionContext."
    );
  }
  if (!snapshot) {
    throw new TypeError(
      "commitExecutionResources requires ResourceTransactionSnapshot."
    );
  }
  const executionId =
    snapshot.executionId ??
    getExecutionId(
      context
    );
  const nativeVerifications =
    await verifyNativeResources(
      context,
      snapshot
    );
  const mutations =
    await commitDeferredResources(
      context,
      snapshot,
      {
        frameConnWriter
      }
    );
  const after =
    await resolveAfterSnapshots(
      context,
      snapshot.descriptors
    );
  return aggregateResourceCommit({
    executionId,
    baseSnapshot:
      snapshot,
    nativeVerifications,
    mutations,
    after
  });
}
/* ============================================================
   COMPLETE RESOURCE TRANSACTION
   ============================================================ */
/**
 * @section complete-resource-transaction
 *
 * Convenience primitive.
 *
 * Normally execution_transaction hooks call prepare/validate and commit
 * separately because native execution occurs between them.
 */
export async function beginResourceTransaction(
  context,
  options = {}
) {
  const prepared =
    await prepareResourceTransaction(
      context,
      options
    );
  const validation =
    await validateExecutionResources(
      context,
      {
        snapshot:
          prepared
      }
    );
  return Object.freeze({
    snapshot:
      validation.snapshot,
    validation:
      validation.summary
  });
}
/* ============================================================
   RESOURCE TRANSACTION STATE PREDICATES
   ============================================================ */
/**
 * @section resource-transaction-state-predicates
 */
export function didResourceValidationSucceed(
  validation
) {
  return Boolean(
    validation?.valid
  );
}
export function didResourceCommitSucceed(
  result
) {
  return Boolean(
    result &&
    (
      result.status ===
        RESOURCE_COMMIT_STATUS.COMMITTED ||
      result.status ===
        RESOURCE_COMMIT_STATUS.VERIFIED ||
      result.status ===
        RESOURCE_COMMIT_STATUS.NOTHING_TO_COMMIT
    )
  );
}
export function wasResourceCommitPartial(
  result
) {
  return (
    result?.status ===
    RESOURCE_COMMIT_STATUS.PARTIAL
  );
}
export function didResourceCommitFail(
  result
) {
  return (
    result?.status ===
    RESOURCE_COMMIT_STATUS.FAILED
  );
}
/* ============================================================
   EXECUTION TRANSACTION ADAPTER
   ============================================================ */
/**
 * @section execution-transaction-adapter
 *
 * Converts resource-service result into the shape expected by
 * execution_transaction's commit callback.
 *
 * Kept here so resource-hooks.js does not duplicate mapping semantics.
 */
export function toExecutionTransactionCommitResult(
  resourceCommitResult,
  {
    context = null
  } = {}
) {
  if (!resourceCommitResult) {
    return Object.freeze({
      kind:
        "commit",
      status:
        "nothing-to-commit",
      context,
      committed:
        Object.freeze([]),
      verifiedNative:
        Object.freeze([]),
      skipped:
        Object.freeze([]),
      metadata:
        Object.freeze({
          resourceCommit:
            null
        })
    });
  }
  let status;
  switch (
    resourceCommitResult.status
  ) {
    case RESOURCE_COMMIT_STATUS.COMMITTED:
    case RESOURCE_COMMIT_STATUS.VERIFIED:
      status =
        "committed";
      break;
    case RESOURCE_COMMIT_STATUS.NOTHING_TO_COMMIT:
      status =
        "nothing-to-commit";
      break;
    case RESOURCE_COMMIT_STATUS.PARTIAL:
      status =
        "partial";
      break;
    case RESOURCE_COMMIT_STATUS.SKIPPED:
      status =
        "skipped";
      break;
    case RESOURCE_COMMIT_STATUS.FAILED:
    default:
      status =
        "failed";
      break;
  }
  return Object.freeze({
    kind:
      "commit",
    status,
    context,
    committed:
      freezeArray(
        resourceCommitResult.committed
      ),
    verifiedNative:
      freezeArray(
        resourceCommitResult.verifiedNative
      ),
    skipped:
      freezeArray(
        resourceCommitResult.skipped
      ),
    reason:
      resourceCommitResult.reason ??
      null,
    error:
      resourceCommitResult.error ??
      null,
    metadata:
      Object.freeze({
        resourceCommit:
          resourceCommitResult
      })
  });
}
/* ============================================================
   VALIDATION ADAPTER
   ============================================================ */
/**
 * @section validation-adapter
 *
 * Converts resource validation summary into the validation result expected
 * by execution_transaction.
 */
export function toExecutionTransactionValidationResult(
  validationSummary,
  {
    context = null
  } = {}
) {
  if (!validationSummary) {
    return Object.freeze({
      kind:
        "validation",
      status:
        "valid",
      valid:
        true,
      context,
      issues:
        Object.freeze([]),
      metadata:
        Object.freeze({
          resourceValidation:
            null
        })
    });
  }
  const issues = [];
  for (
    const result of
      validationSummary.results ??
      []
  ) {
    for (
      const issue of
        result.issues ??
        []
    ) {
      issues.push(
        Object.freeze({
          code:
            `resource:${issue.code}`,
          message:
            issue.message,
          source:
            issue.resourceId,
          severity:
            "error",
          metadata:
            Object.freeze({
              resourceIssue:
                issue
            })
        })
      );
    }
  }
  return Object.freeze({
    kind:
      "validation",
    status:
      validationSummary.valid
        ? "valid"
        : "invalid",
    valid:
      Boolean(
        validationSummary.valid
      ),
    context,
    issues:
      Object.freeze(issues),
    metadata:
      Object.freeze({
        resourceValidation:
          validationSummary
      })
  });
}
/* ============================================================
   NATIVE RESOURCE SAFETY NOTES
   ============================================================ */
/**
 * @section native-resource-safety-notes
 *
 * LIMITED
 * -------
 *
 * BEFORE:
 * resolver reads uses remaining
 *
 * EXECUTION:
 * native WeaponAttackFlow/ActivationFlow/SystemFlow/TechAttackFlow/
 * CoreActiveFlow owns consumption
 *
 * COMMIT:
 * resource transaction verifies decreased native value
 *
 * Frame Conn NEVER decrements again.
 *
 *
 * LOADED
 * ------
 *
 * BEFORE:
 * loaded must be available
 *
 * EXECUTION:
 * WeaponAttackFlow unloads
 *
 * COMMIT:
 * verify loaded transitioned to unavailable
 *
 *
 * CORE ENERGY
 * -----------
 *
 * BEFORE:
 * Core Energy >= 1
 *
 * EXECUTION:
 * CoreActiveFlow consumes
 *
 * COMMIT:
 * verify native decrease
 *
 *
 * COUNTER DATA
 * ------------
 *
 * Native backing does not imply native consumption.
 *
 * If augmentation says:
 *
 * authority = NATIVE
 * consumption = DEFERRED
 *
 * this file may mutate through native_adapter resource setters.
 */
/* ============================================================
   FRAME CONN RESOURCE PERSISTENCE NOTES
   ============================================================ */
/**
 * @section frame-conn-resource-persistence-notes
 *
 * Frame Conn supplemental resource persistence is intentionally injected
 * through:
 *
 * frameConnWriter
 *
 * until the supplemental state/lifecycle storage module exists.
 *
 * Intended future implementation:
 *
 * resource_service
 * → supplemental state repository
 * → Foundry flags/document storage
 *
 * Do NOT embed raw flag/document paths into resource-transaction.js.
 */
/* ============================================================
   EXECUTION TRANSACTION INTEGRATION NOTES
   ============================================================ */
/**
 * @section execution-transaction-integration-notes
 *
 * BEFORE_PRE_VALIDATE:
 *
 * beginResourceTransaction(context)
 *
 * returns:
 *
 * snapshot
 * validation
 *
 *
 * EXECUTE:
 *
 * native or semantic action occurs
 *
 *
 * BEFORE_COMMIT / COMMIT:
 *
 * commitExecutionResources(
 *   context,
 *   snapshot
 * )
 *
 *
 * resource-hooks.js should retain the prepared snapshot per executionId so
 * the exact pre-execution resource state survives until commit.
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
 * Native resource reads and supported writes stay behind native_adapter.
 *
 * This file must not reach directly into item.system.*.
 *
 *
 * semantic_execution_context/
 * ---------------------------
 *
 * Supplies execution identity and source context.
 *
 * Resource transaction does not modify ExecutionContext.
 *
 *
 * execution_transaction/
 * ----------------------
 *
 * Owns WHEN:
 *
 * validate
 * execute
 * commit
 *
 * This file owns HOW resource validation/commit happens once invoked.
 *
 *
 * feature_turn/
 * -------------
 *
 * Action economy is not a resource here.
 *
 * Quick/Full/etc. remains for action_economy/.
 *
 *
 * feature_runtime_bridge/
 * -----------------------
 *
 * May inject:
 *
 * once/turn
 * once/scene
 * charges
 * special counters
 *
 * as resource declarations.
 *
 * This transaction code consumes them generically.
 *
 *
 * lifecycle_service/
 * ------------------
 *
 * Will restore/remove Frame Conn-owned resources according to:
 *
 * descriptor.resetScope
 *
 * This file does not enact reset timing.
 */
/* ============================================================
   PARTIAL FAILURE NOTES
   ============================================================ */
/**
 * @section partial-failure-notes
 *
 * If some deferred resources commit and another fails:
 *
 * RESOURCE_COMMIT_STATUS.PARTIAL
 *
 * The execution transaction should therefore become:
 *
 * PARTIAL
 *
 * because mechanical execution already occurred.
 *
 * No generic rollback is attempted here.
 *
 * Rollback of arbitrary native/Foundry state is unsafe unless an owning
 * service explicitly supports it.
 */
/* ============================================================
   BOUNDARY INVARIANTS
   ============================================================ */
/**
 * @section boundary-invariants
 *
 * INVARIANT 1
 * Resource state is snapshotted before semantic/native execution.
 *
 * INVARIANT 2
 * Required resources are validated before execution.
 *
 * INVARIANT 3
 * Native-consumed resources are verified, never re-spent.
 *
 * INVARIANT 4
 * Deferred resources mutate only when commitExecutionResources() is called.
 *
 * INVARIANT 5
 * Frame Conn resource persistence remains injected until a dedicated
 * persistence boundary exists.
 *
 * INVARIANT 6
 * Native-backed deferred counters mutate only through native_adapter.
 *
 * INVARIANT 7
 * Derived resources cannot be mutated.
 *
 * INVARIANT 8
 * Resource discovery remains owned by resource-resolver.js.
 *
 * INVARIANT 9
 * Reset timing remains owned by lifecycle_service/.
 *
 * INVARIANT 10
 * Action economy is not implemented as a generic resource here.
 *
 * INVARIANT 11
 * Commit failures after successful execution preserve Partial truth.
 *
 * INVARIANT 12
 * No generic rollback is attempted.
 *
 * INVARIANT 13
 * Resource transaction results remain normalized and inspectable.
 *
 * INVARIANT 14
 * Existing registry entries may gain resource behavior through runtime
 * augmentation without modification to this transaction layer.
 */