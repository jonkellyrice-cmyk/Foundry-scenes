/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/lancer-sitrep-tracker.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  HUD_ID,
  createHUD,
  escapeHTML,
  keepHUDOnScreen,
  mountHUD,
  removeHUD
} from "../sitrep-ui-boilerplate.js";
import {
  chatResult,
  div,
  each,
  fragment,
  icon,
  labeledValue,
  options,
  small,
  span,
  stat,
  statusBlock,
  strong
} from "../sitrep-dsl.js";

export const esc = escapeHTML;

export function progressPips(sitrep, state) {
  const total = Math.max(
    Number(sitrep.roundLimit ?? 8),
    1
  );

  const remaining = Math.min(
    Math.max(state.roundsRemaining, 0),
    total
  );

  return each(
    Array.from({ length: total }),
    (_, index) =>
      span(
        "",
        [
          "lst-pip",
          index < remaining
            ? "filled"
            : ""
        ]
          .filter(Boolean)
          .join(" ")
      )
  );
}

export function controlLabel(controller) {
  if (controller === "friendly") {
    return "ALLIED CONTROL";
  }

  if (controller === "hostile") {
    return "HOSTILE CONTROL";
  }

  return "CONTESTED";
}

export function controlZoneLabel(controller) {
  if (controller === "friendly") return "ALLIED";
  if (controller === "hostile") return "HOSTILE";
  return "CONTESTED";
}
