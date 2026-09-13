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
import {
  esc
} from "./sitrep-presentation-shared.js";

export async function setResult(status, reason) {
  const combat = activeCombat();
  const sitrep = getSitrep(combat);

  if (
    !game.user.isGM ||
    !combat ||
    !sitrep
  ) {
    return;
  }

  await combat.setFlag(
    MODULE_ID,
    FLAG_KEY,
    {
      ...sitrep,
      status,
      resultReason: reason
    }
  );

  if (isPrimaryGM()) {
    await ChatMessage.create({
      speaker: {
        alias: "MISSION CONTROL"
      },

      content: chatResult(
        status === "victory"
          ? "MISSION SUCCESS"
          : "MISSION FAILED",
        [esc(reason)],
        status
      )
    });
  }
}

export async function evaluateSitrep(
  combat,
  changes = {}

export async function togglePause() {
  const combat = activeCombat();
  const sitrep = getSitrep(combat);

  if (
    !game.user.isGM ||
    !combat ||
    !sitrep
  ) {
    return;
  }

  const status =
    sitrep.status === "paused"
      ? "active"
      : "paused";

  await combat.setFlag(
    MODULE_ID,
    FLAG_KEY,
    {
      ...sitrep,
      status
    }
  );
}

export async function endSitrep() {
  const combat = activeCombat();

  if (!game.user.isGM || !combat) {
    return;
  }

  await combat.unsetFlag(
    MODULE_ID,
    FLAG_KEY
  );

  removeHUD();
}
