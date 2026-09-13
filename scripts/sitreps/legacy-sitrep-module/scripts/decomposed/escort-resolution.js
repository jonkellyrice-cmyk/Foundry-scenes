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
  setResult
} from "./sitrep-encounter-resolution.js";

export async function resolveEscortObjective(outcome) {
  const combat = activeCombat();
  const sitrep = getSitrep(combat);

  if (
    !game.user.isGM ||
    !combat ||
    !sitrep ||
    sitrep.type !== "escort"
  ) {
    return;
  }

  if (outcome === "extracted") {
    await combat.setFlag(MODULE_ID, FLAG_KEY, {
      ...sitrep,
      escortStatus: "extracted"
    });

    await setResult(
      "victory",
      "The Objective was safely extracted."
    );

    return;
  }

  if (outcome === "destroyed") {
    const updatedSitrep = {
      ...sitrep,
      escortStatus: "destroyed",
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
