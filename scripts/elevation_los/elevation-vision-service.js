/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/elevation-los.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  MODULE_ID,
  finiteNumberOr
} from "./elevation-los-contract.js";
import {
  wallBlocksElevation,
  wallDocumentFromEdge,
  wallHasFiniteElevation
} from "./wall-elevation-state.js";

export function sourceDocumentFromPolygon(polygon) {
  const source = polygon?.config?.source;

  const candidates = [
    source?.object?.document,
    source?.object,
    source?.document,
    source?.token?.document,
    source?.token,
    source?.light?.document,
    source?.light,
    source?.ambientLight?.document,
    source?.ambientLight
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const documentName =
      candidate.documentName ??
      candidate.constructor?.documentName;

    if (
      documentName === "Token" ||
      documentName === "AmbientLight"
    ) {
      return candidate;
    }
  }

  return null;
}

export function sourceElevationFromPolygon(polygon) {
  const source = polygon?.config?.source;
  const sourceDocument = sourceDocumentFromPolygon(polygon);

  if (!sourceDocument) return null;

  return finiteNumberOr(
    sourceDocument.elevation ??
    source?.elevation ??
    source?.data?.elevation,
    0
  );
}

export function installVisionPolygonWrapper() {
  const PolygonClass =
    foundry?.canvas?.geometry?.ClockwiseSweepPolygon ??
    globalThis.ClockwiseSweepPolygon;

  const prototype = PolygonClass?.prototype;

  if (!prototype) {
    console.error(
      `${MODULE_ID} | Could not locate ClockwiseSweepPolygon.`
    );

    return false;
  }

  if (prototype.__lancerElevationLOSWrapped) {
    return true;
  }

  const methodName =
    typeof prototype._testEdgeInclusion === "function"
      ? "_testEdgeInclusion"
      : typeof prototype._testWallInclusion === "function"
        ? "_testWallInclusion"
        : null;

  if (!methodName) {
    console.error(
      `${MODULE_ID} | Foundry's wall-inclusion method could not be located.`
    );

    return false;
  }

  const original = prototype[methodName];

  prototype[methodName] = function (...args) {
    try {
      const restrictionType = String(
        this?.config?.type ??
        this?.config?.wallRestrictionType ??
        "sight"
      ).toLowerCase();

      /*
       * Elevation affects both vision polygons and movement
       * collision polygons. Sound and unrelated collision types
       * continue using ordinary Foundry wall behavior.
       */
      const isElevationAwarePolygon = [
        "sight",
        "vision",
        "move",
        "movement",
        "light",
        "illumination"
      ].includes(restrictionType);

      if (isElevationAwarePolygon) {
        const sourceElevation =
          sourceElevationFromPolygon(this);

        if (sourceElevation !== null) {
          const wallDocument =
            wallDocumentFromEdge(args[0]);

          if (
            wallDocument &&
            wallHasFiniteElevation(wallDocument) &&
            !wallBlocksElevation(
              wallDocument,
              sourceElevation
            )
          ) {
            /*
             * Returning false excludes this wall from the polygon.
             *
             * Token vision can see over it.
             * Token movement can pass over or beneath it.
             * Ambient light can shine over or beneath it.
             */
            return false;
          }
        }
      }
    } catch (error) {
      console.warn(
        `${MODULE_ID} | Elevation LOS wall test failed; using normal Foundry behavior.`,
        error
      );
    }

    return original.apply(this, args);
  };

  Object.defineProperty(
    prototype,
    "__lancerElevationLOSWrapped",
    {
      value: true,
      configurable: true
    }
  );

  console.log(
    `${MODULE_ID} | Elevation-aware LOS installed using ${methodName}.`
  );

  return true;
}

export function refreshElevationVision() {
  if (!canvas?.ready) return;

  clearTimeout(
    globalThis.__lancerElevationLOSRefresh
  );

  globalThis.__lancerElevationLOSRefresh =
    setTimeout(() => {
      try {
        canvas.perception?.update?.(
          {
            initializeVision: true,
            refreshVision: true,
            refreshLighting: true,
            refreshOcclusion: true
          },
          true
        );
      } catch (error) {
        console.warn(
          `${MODULE_ID} | Perception update failed; attempting fallback refresh.`,
          error
        );

        try {
          canvas.effects?.visibility?.refresh?.();
          canvas.visibility?.refresh?.();
        } catch (fallbackError) {
          console.error(
            `${MODULE_ID} | Vision refresh failed.`,
            fallbackError
          );
        }
      }
    }, 75);
}
