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
  controlZoneLabel,
  esc
} from "./sitrep-presentation-shared.js";

export function renderControlState(sitrep, state) {
  const zones = each(
    state.controlZones,
    (zone, index) =>
      div(
        `lst-control-zone lst-zone-${esc(zone.controller)}`,
        div(
          "lst-control-zone-name",
          `OBJECTIVE ${String.fromCharCode(65 + index)}`
        ),
        strong(esc(zone.name)),
        statusBlock(
          "lst-control-zone-status",
          controlZoneLabel(zone.controller)
        ),
        div(
          "lst-control-zone-counts",
          span(
            `${zone.friendly} ALLIED`,
            "allied"
          ),
          span(
            `${zone.hostile} HOSTILE`,
            "hostile"
          )
        )
      )
  );

  return fragment(
    div(
      "lst-control-scoreboard",
      stat(
        "lst-control-score allied",
        "ALLIED SCORE",
        state.friendlyScore
      ),
      stat(
        "lst-control-score hostile",
        "HOSTILE SCORE",
        state.hostileScore
      )
    ),

    div(
      "lst-control-round-zones",
      span(
        `ALLIED ZONES: ${state.friendlyZones}`
      ),
      span(
        `HOSTILE ZONES: ${state.hostileZones}`
      )
    ),

    div(
      "lst-control-zone-grid",
      zones
    )
  );
}
