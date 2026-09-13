/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/elevation-los.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  MODULE_ID,
  finiteNumberOr
} from "./elevation-los-contract.js";

export const LIGHT_GROUND_ELEVATION = 0;

export function horizontalRadiusAtGround(
  sphericalRadius,
  lightElevation,
  groundElevation = LIGHT_GROUND_ELEVATION
) {
  const radius = Math.abs(
    finiteNumberOr(sphericalRadius, 0)
  );

  const verticalDistance = Math.abs(
    finiteNumberOr(lightElevation, 0) -
    finiteNumberOr(groundElevation, 0)
  );

  if (radius <= 0 || verticalDistance >= radius) {
    return 0;
  }

  return Math.sqrt(
    Math.max(
      0,
      radius * radius -
      verticalDistance * verticalDistance
    )
  );
}

export function sceneDistanceToPixels(distance) {
  const gridSize = finiteNumberOr(
    canvas?.dimensions?.size ??
    canvas?.scene?.grid?.size,
    100
  );

  const gridDistance = finiteNumberOr(
    canvas?.dimensions?.distance ??
    canvas?.scene?.grid?.distance,
    1
  );

  if (gridDistance === 0) return distance;

  return distance * gridSize / gridDistance;
}

export function preserveRadiusSign(originalRadius, adjustedRadius) {
  const original = finiteNumberOr(originalRadius, 0);
  const sign = original < 0 ? -1 : 1;

  return adjustedRadius * sign;
}

export function radiusValueForReturnedUnits(
  returnedValue,
  configuredRadius,
  horizontalSceneRadius
) {
  const returned = Math.abs(
    finiteNumberOr(returnedValue, 0)
  );

  const configured = Math.abs(
    finiteNumberOr(configuredRadius, 0)
  );

  const horizontalPixels = sceneDistanceToPixels(
    horizontalSceneRadius
  );

  /*
   * Foundry versions may expose source radius data in either
   * Scene-distance units or canvas pixels. Compare the returned
   * value to both possibilities and preserve the unit convention
   * used by the current Foundry build.
   */
  const configuredPixels = sceneDistanceToPixels(configured);

  const sceneUnitDifference = Math.abs(
    returned - configured
  );

  const pixelDifference = Math.abs(
    returned - configuredPixels
  );

  return sceneUnitDifference <= pixelDifference
    ? horizontalSceneRadius
    : horizontalPixels;
}

export function installAmbientLightRadiusWrapper() {
  const AmbientLightClass =
    foundry?.canvas?.placeables?.AmbientLight ??
    globalThis.AmbientLight;

  const prototype = AmbientLightClass?.prototype;

  if (!prototype) {
    console.error(
      `${MODULE_ID} | Could not locate the AmbientLight class.`
    );

    return false;
  }

  if (prototype.__lancer3DLightRadiusWrapped) {
    return true;
  }

  const original = prototype._getLightSourceData;

  if (typeof original !== "function") {
    console.error(
      `${MODULE_ID} | AmbientLight._getLightSourceData could not be located.`
    );

    return false;
  }

  prototype._getLightSourceData = function (...args) {
    const originalData = original.apply(this, args);

    if (!originalData || typeof originalData !== "object") {
      return originalData;
    }

    const data = {
      ...originalData
    };

    const elevation = finiteNumberOr(
      this.document?.elevation ??
      originalData.elevation,
      0
    );

    const configuredBright = finiteNumberOr(
      this.config?.bright ??
      this.document?.config?.bright,
      0
    );

    const configuredDim = finiteNumberOr(
      this.config?.dim ??
      this.document?.config?.dim,
      0
    );

    const horizontalBright = horizontalRadiusAtGround(
      configuredBright,
      elevation
    );

    const horizontalDim = horizontalRadiusAtGround(
      configuredDim,
      elevation
    );

    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "bright"
      )
    ) {
      const adjustedBright = radiusValueForReturnedUnits(
        data.bright,
        configuredBright,
        horizontalBright
      );

      data.bright = preserveRadiusSign(
        data.bright,
        adjustedBright
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "dim"
      )
    ) {
      const adjustedDim = radiusValueForReturnedUnits(
        data.dim,
        configuredDim,
        horizontalDim
      );

      data.dim = preserveRadiusSign(
        data.dim,
        adjustedDim
      );
    }

    const maximumHorizontalRadius = Math.max(
      horizontalBright,
      horizontalDim
    );

    const maximumHorizontalPixels =
      sceneDistanceToPixels(maximumHorizontalRadius);

    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "radius"
      )
    ) {
      data.radius = maximumHorizontalPixels;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        data,
        "externalRadius"
      )
    ) {
      data.externalRadius = maximumHorizontalPixels;
    }

    return data;
  };

  Object.defineProperty(
    prototype,
    "__lancer3DLightRadiusWrapped",
    {
      value: true,
      configurable: true
    }
  );

  console.log(
    `${MODULE_ID} | Three-dimensional ambient-light radius installed.`
  );

  return true;
}
