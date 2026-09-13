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
  setupDialogHTML
} from "./sitrep-setup-presentation.js";
import {
  saveSetup
} from "./sitrep-setup-state.js";

export function openSetupDialog() {
  if (!game.user.isGM) {
    return ui.notifications.warn(
      "Only a GM can configure a sitrep."
    );
  }

  const combat = activeCombat();

  if (!combat) {
    return ui.notifications.warn(
      "Create and activate a Combat encounter first."
    );
  }

  const scene =
    combat.scene ?? canvas.scene;

  if (!scene?.regions?.size) {
    return ui.notifications.warn(
      "Draw at least one Scene Region on the combat Scene first."
    );
  }

  const existing =
    getSitrep(combat);

  new Dialog(
    {
      title:
        "Lancer Sitrep Tracker — Setup",

      content:
        setupDialogHTML(
          combat,
          existing
        ),

      buttons: {
        start: {
          icon:
            '<i class="fas fa-play"></i>',

          label: existing
            ? "Update Sitrep"
            : "Begin Sitrep",

          callback: async html =>
            saveSetup(
              html[0] ?? html,
              combat
            )
        },

        cancel: {
          icon:
            '<i class="fas fa-times"></i>',

          label: "Cancel"
        }
      },

      default: "start",

      render: html => {
        const root = html[0] ?? html;
        const app = html.closest?.(".app");
        app?.addClass?.("lst-dialog");

        const typeSelect = root.querySelector('[name="sitrepType"]');
        const roundLimitInput = root.querySelector('[name="roundLimit"]');
        const singleRegionGroup = root.querySelector(".lst-single-region-group");
        const controlRegionsGroup = root.querySelector(".lst-control-regions-group");
        const escortFields = root.querySelector(".lst-escort-fields");
        const extractionFields = root.querySelector(".lst-extraction-fields");
        const reconFields = root.querySelector(".lst-recon-fields");

        const updateSitrepFields = () => {
          const isControl = typeSelect?.value === "control";
          const isEscort = typeSelect?.value === "escort";
          const isExtraction = typeSelect?.value === "extraction";
          const isRecon = typeSelect?.value === "recon";
          const usesSingleRegion =
            !isControl &&
            !isEscort &&
            !isExtraction &&
            !isRecon;

          if (singleRegionGroup) {
            singleRegionGroup.style.display = usesSingleRegion ? "" : "none";
          }

          if (controlRegionsGroup) {
            controlRegionsGroup.style.display = isControl ? "" : "none";
          }

          if (escortFields) {
            escortFields.style.display = isEscort ? "" : "none";
          }

          if (extractionFields) {
            extractionFields.style.display = isExtraction ? "" : "none";
          }

          if (reconFields) {
            reconFields.style.display = isRecon ? "" : "none";
          }

          if (roundLimitInput && !existing) {
            const isHoldout =
              typeSelect?.value === "holdout";

            roundLimitInput.value =
              isControl || isHoldout || isRecon
                ? "6"
                : isExtraction
                  ? "10"
                  : "8";
          }
        };

        typeSelect?.addEventListener("change", updateSitrepFields);
        updateSitrepFields();
      }
    },
    {
      width: 520
    }
  ).render(true);
}
