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

export function renderEscortState(sitrep, state) {
  let objectiveStatus = "IN TRANSIT";
  let statusClass = "active";

  if (state.objectiveExtracted) {
    objectiveStatus = "SAFELY EXTRACTED";
    statusClass = "extracted";
  } else if (state.objectiveDestroyed) {
    objectiveStatus = "DESTROYED";
    statusClass = "destroyed";
  } else if (state.canExtractObjective) {
    objectiveStatus = "READY TO EXTRACT";
    statusClass = "ready";
  } else if (state.objectiveInExtraction) {
    objectiveStatus = "EXTRACTION CONTESTED";
    statusClass = "contested";
  }

  return fragment(
    labeledValue(
      "lst-escort-objective",
      "OBJECTIVE",
      esc(state.objectiveName)
    ),

    statusBlock(
      `lst-escort-status lst-escort-${statusClass}`,
      objectiveStatus
    ),

    div(
      "lst-escort-grid",
      stat(
        "lst-escort-stat",
        "IN EXTRACTION ZONE",
        state.objectiveInExtraction
          ? "YES"
          : "NO"
      ),
      stat(
        "lst-escort-stat allied",
        "ADJACENT ALLIES",
        state.friendlyAdjacent
      ),
      stat(
        "lst-escort-stat hostile",
        "ADJACENT HOSTILES",
        state.hostileAdjacent
      ),
      stat(
        "lst-escort-stat",
        "EXTRACTION",
        state.canExtractObjective
          ? "CLEAR"
          : "BLOCKED"
      )
    )
  );
}
