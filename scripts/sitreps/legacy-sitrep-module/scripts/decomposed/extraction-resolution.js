/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/lancer-sitrep-tracker.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  MODULE_ID,
  FLAG_KEY,
  activeCombat,
  getSitrep,
  isPrimaryGM,
  factionOf,
  combatantIsDefeated,
  regionFor,
  controlRegionsFor,
  controllerFromCounts,
  combatantById,
  tokensAreAdjacent,
  tokenInsideRegion
} from "../sitrep-kernel.js";
import {
  calculateState
} from "./sitrep-state-composition.js";
import {
  setResult
} from "./sitrep-encounter-resolution.js";

export async function resolveExtractionObjective(outcome) {
  const combat = activeCombat();
  const sitrep = getSitrep(combat);

  if (
    !game.user.isGM ||
    !combat ||
    !sitrep ||
    sitrep.type !== "extraction"
  ) {
    return;
  }

  if (outcome === "extracted") {
    const state = calculateState(combat, sitrep);

    if (!state.canExtractObjective) {
      ui.notifications.warn(
        "The Objective cannot currently be extracted. It must be inside the Extraction Zone, adjacent to an allied unit, and uncontested."
      );

      return;
    }

    await combat.setFlag(MODULE_ID, FLAG_KEY, {
      ...sitrep,
      extractionStatus: "extracted"
    });

    await setResult(
      "victory",
      "The Objective was safely recovered and extracted."
    );

    return;
  }

  if (outcome === "destroyed") {
    const updatedSitrep = {
      ...sitrep,
      extractionStatus: "destroyed",
      status: "draw",
      resultReason:
        "The Objective was destroyed. Neither side achieved victory."
    };

    await combat.setFlag(
      MODULE_ID,
      FLAG_KEY,
      updatedSitrep
    );

    if (isPrimaryGM()) {
      await ChatMessage.create({
        speaker: {
          alias: "MISSION CONTROL"
        },
        content: `
          <div class="lst-chat-result">
            <strong>NO VICTOR</strong>
            <br>
            The Objective was destroyed.
          </div>
        `
      });
    }
  }
}
