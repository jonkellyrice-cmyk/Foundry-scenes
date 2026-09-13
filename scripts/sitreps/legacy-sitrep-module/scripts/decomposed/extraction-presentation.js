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

export function renderExtractionState(sitrep, state) {
  let objectiveStatus = "AWAITING RECOVERY";
  let statusClass = "active";

  if (state.objectiveExtracted) {
    objectiveStatus = "OBJECTIVE EXTRACTED";
    statusClass = "extracted";
  } else if (state.objectiveDestroyed) {
    objectiveStatus = "OBJECTIVE DESTROYED";
    statusClass = "destroyed";
  } else if (state.canExtractObjective) {
    objectiveStatus = "READY TO EXTRACT";
    statusClass = "ready";
  } else if (state.objectiveInExtraction) {
    objectiveStatus = "EXTRACTION CONTESTED";
    statusClass = "contested";
  } else if (state.friendlyAdjacent > 0) {
    objectiveStatus = "OBJECTIVE SECURED";
    statusClass = "secured";
  }

  return fragment(
    labeledValue(
      "lst-extraction-objective",
      "OBJECTIVE",
      esc(state.objectiveName)
    ),

    statusBlock(
      `lst-extraction-status lst-extraction-${statusClass}`,
      objectiveStatus
    ),

    div(
      "lst-extraction-grid",
      stat(
        "lst-extraction-stat",
        "OBJECTIVE IN EZ",
        state.objectiveInExtraction
          ? "YES"
          : "NO"
      ),
      stat(
        "lst-extraction-stat allied",
        "ALLIES IN EZ",
        state.friendlyInExtractionZone
      ),
      stat(
        "lst-extraction-stat allied",
        "ADJACENT ALLIES",
        state.friendlyAdjacent
      ),
      stat(
        "lst-extraction-stat hostile",
        "ADJACENT HOSTILES",
        state.hostileAdjacent
      )
    )
  );
}
