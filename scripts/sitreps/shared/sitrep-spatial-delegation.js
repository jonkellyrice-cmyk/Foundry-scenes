/**
 * SITREP-specific spatial delegation boundary.
 * Owns no geometry, token-footprint math, Region implementation, or canvas lookup.
 */

const REQUIRED_SITREP_SPATIAL_OPERATIONS = Object.freeze(["resolveRegion", "tokenInsideRegion", "tokensAreAdjacent"]);

export function assertSitrepSpatialOperations(operations) {
  if (!operations || typeof operations !== "object" || Array.isArray(operations)) {
    throw new TypeError("SITREP spatial operations must be supplied as an object.");
  }
  for (const operationName of REQUIRED_SITREP_SPATIAL_OPERATIONS) {
    if (typeof operations[operationName] !== "function") {
      throw new Error(`SITREP spatial operations require ${operationName}().`);
    }
  }
  return operations;
}

export function resolveConfiguredSitrepRegion(operations, combat, regionId) {
  assertSitrepSpatialOperations(operations);
  if (!regionId) return null;
  return operations.resolveRegion({ combat, regionId }) ?? null;
}

export function resolveConfiguredSitrepRegions(operations, combat, regionIds) {
  assertSitrepSpatialOperations(operations);
  const ids = Array.isArray(regionIds) ? regionIds : [];
  return ids.map(regionId => resolveConfiguredSitrepRegion(operations, combat, regionId)).filter(Boolean);
}

export function tokenInsideConfiguredSitrepRegion(operations, tokenDocument, region) {
  assertSitrepSpatialOperations(operations);
  if (!tokenDocument || !region) return false;
  return Boolean(operations.tokenInsideRegion(tokenDocument, region));
}

export async function sitrepTokensAreAdjacent(operations, firstToken, secondToken) {
  assertSitrepSpatialOperations(operations);
  if (!firstToken || !secondToken) return false;
  return Boolean(await operations.tokensAreAdjacent(firstToken, secondToken));
}
