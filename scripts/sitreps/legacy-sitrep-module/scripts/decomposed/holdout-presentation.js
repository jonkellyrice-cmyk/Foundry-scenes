/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/lancer-sitrep-tracker.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

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
import {
  esc
} from "./sitrep-presentation-shared.js";

export function renderHoldoutState(sitrep, state) {
  const scoreStatus =
    state.holdoutScore >= 1
      ? "POSITION HOLDING"
      : "POSITION OVERRUN";

  const scoreClass =
    state.holdoutScore >= 1
      ? "holding"
      : "overrun";

  return fragment(
    div(
      "lst-zone-name",
      icon("fas fa-shield-alt"),
      esc(state.regionName)
    ),

    statusBlock(
      `lst-holdout-status lst-holdout-${scoreClass}`,
      scoreStatus
    ),

    div(
      "lst-holdout-scoreboard",
      span("PROJECTED SCORE"),
      strong(state.holdoutScore),
      small(
        `${state.holdoutBaseScore} starting points − ` +
        `${state.hostileInZone} enemies in zone`
      )
    ),

    div(
      "lst-holdout-grid",
      stat(
        "lst-holdout-stat hostile",
        "ENEMIES IN ZONE",
        state.hostileInZone
      ),
      stat(
        "lst-holdout-stat allied",
        "ALLIES IN ZONE",
        state.friendlyInZone
      ),
      stat(
        "lst-holdout-stat allied",
        "ALLIES STANDING",
        state.friendlyStanding
      ),
      stat(
        "lst-holdout-stat hostile",
        "HOSTILES STANDING",
        state.hostileStanding
      )
    )
  );
}
