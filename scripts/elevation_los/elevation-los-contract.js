/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/elevation-los.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */



export const MODULE_ID = "lancer-frame-conn";
export const LEGACY_MODULE_ID = "lancer-sitrep-tracker";

export const FEATURE_KEY = "elevationLOS";

export const STYLE_ID = "lancer-elevation-los-styles";

export function finiteNumberOr(value, fallback) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
