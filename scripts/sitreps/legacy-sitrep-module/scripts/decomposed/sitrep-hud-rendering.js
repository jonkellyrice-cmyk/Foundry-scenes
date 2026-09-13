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
  calculateState
} from "./sitrep-state-composition.js";
import {
  controlLabel,
  esc
} from "./sitrep-presentation-shared.js";
import {
  endSitrep,
  setResult,
  togglePause
} from "./sitrep-encounter-resolution.js";
import {
  recordReconScan
} from "./recon-resolution.js";
import {
  resolveExtractionObjective
} from "./extraction-resolution.js";
import {
  resolveEscortObjective
} from "./escort-resolution.js";
import {
  openSetupDialog
} from "./sitrep-setup-dialog.js";

export function renderHUD() {
  const combat = activeCombat();
  const sitrep = getSitrep(combat);

  if (!combat || !sitrep?.active) {
    removeHUD();
    return;
  }

  const state = calculateState(combat, sitrep);

  const hud = createHUD([
    "lst-hud",
    `lst-${esc(sitrep.status)}`,
    `lst-control-${esc(state.controller)}`
  ]);

  let statusText =
    state.roundsRemaining === 1
      ? "FINAL ROUND"
      : `${state.roundsRemaining} ROUNDS REMAINING`;

  if (sitrep.status === "victory") {
    statusText = "MISSION SUCCESS";
  }

  if (sitrep.status === "defeat") {
    statusText = "MISSION FAILED";
  }

  if (sitrep.status === "paused") {
    statusText = "SITREP PAUSED";
  }

  hud.innerHTML = `
    <header class="lst-header">
      <div class="lst-header-title">
        <div class="lst-kicker">LANCER SITREP</div>
        <h2>${esc(sitrep.title)}</h2>
      </div>

      <div class="lst-header-actions">
        <button
          type="button"
          data-action="minimize"
          title="Minimize Sitrep"
          aria-label="Minimize Sitrep"
        >
          <i class="fas fa-window-minimize"></i>
        </button>

        ${
          game.user.isGM
            ? `
              <button
                type="button"
                data-action="configure"
                title="Configure Sitrep"
                aria-label="Configure Sitrep"
              >
                <i class="fas fa-cog"></i>
              </button>
            `
            : ""
        }
      </div>
    </header>

    <div class="lst-hud-body">
      <div class="lst-objective">
        ${esc(sitrep.objective)}
      </div>

      <div class="lst-clock">
        <div class="lst-clock-row">
          <strong>${esc(statusText)}</strong>

          <span>
            ROUND ${state.currentRound} /
            ${sitrep.finalRound}
          </span>
        </div>

        <div class="lst-pips">
          ${progressPips(sitrep, state)}
        </div>
      </div>

      ${
        state.valid
          ? sitrep.type === "control"
            ? renderControlState(sitrep, state)
            : sitrep.type === "escort"
              ? renderEscortState(sitrep, state)
              : sitrep.type === "extraction"
                ? renderExtractionState(sitrep, state)
                : sitrep.type === "holdout"
                  ? renderHoldoutState(sitrep, state)
                  : sitrep.type === "recon"
                    ? renderReconState(sitrep, state)
                    : `
              <div class="lst-zone-name">
                <i class="fas fa-bullseye"></i>
                ${esc(state.regionName)}
              </div>

              <div class="lst-control-banner">
                ${controlLabel(state.controller)}
              </div>

              <div class="lst-grid">
                <div class="lst-stat allied">
                  <span>ALLIES IN ZONE</span>
                  <strong>${state.friendlyInZone}</strong>
                </div>

                <div class="lst-stat hostile">
                  <span>HOSTILES IN ZONE</span>
                  <strong>${state.hostileInZone}</strong>
                </div>

                <div class="lst-stat allied">
                  <span>ALLIES STANDING</span>
                  <strong>${state.friendlyStanding}</strong>
                </div>

                <div class="lst-stat hostile">
                  <span>HOSTILES STANDING</span>
                  <strong>${state.hostileStanding}</strong>
                </div>
              </div>
            `
          : `
            <div class="lst-error">
              ${
                sitrep.type === "control"
                  ? "Control requires exactly four valid Scene Regions."
                  : sitrep.type === "escort"
                    ? "Escort requires a valid Objective combatant and Extraction Zone Region."
                    : sitrep.type === "extraction"
                      ? "Extraction requires a valid Objective combatant and Extraction Zone Region."
                      : sitrep.type === "holdout"
                        ? "Holdout requires a valid Control Zone Region."
                        : sitrep.type === "recon"
                          ? "Recon requires exactly four valid Control Zone Regions and one designated True Control Zone."
                          : "The configured Region cannot be found on this combat's Scene."
              }
            </div>
          `
      }

      ${
        game.user.isGM && sitrep.type === "extraction"
          ? `
            <div class="lst-extraction-controls">
              <button
                type="button"
                data-action="extraction-extract"
                ${
                  !state.canExtractObjective ||
                  state.objectiveDestroyed ||
                  state.objectiveExtracted
                    ? "disabled"
                    : ""
                }
              >
                Extract Objective
              </button>

              <button
                type="button"
                data-action="extraction-destroy"
                ${
                  state.objectiveDestroyed ||
                  state.objectiveExtracted
                    ? "disabled"
                    : ""
                }
              >
                Destroy Objective
              </button>
            </div>
          `
          : ""
      }

      ${
        game.user.isGM && sitrep.type === "escort"
          ? `
            <div class="lst-escort-controls">
              <button
                type="button"
                data-action="escort-extract"
                ${state.objectiveDestroyed || state.objectiveExtracted ? "disabled" : ""}
              >
                Extract Objective
              </button>

              <button
                type="button"
                data-action="escort-destroy"
                ${state.objectiveDestroyed || state.objectiveExtracted ? "disabled" : ""}
              >
                Destroy Objective
              </button>
            </div>
          `
          : ""
      }

      ${
        sitrep.resultReason
          ? `
            <div class="lst-result-reason">
              ${esc(sitrep.resultReason)}
            </div>
          `
          : ""
      }

      ${
        game.user.isGM
          ? `
            <footer class="lst-controls">
              <button
                type="button"
                data-action="toggle"
              >
                ${
                  sitrep.status === "paused"
                    ? "Resume"
                    : "Pause"
                }
              </button>

              <button
                type="button"
                data-action="victory"
              >
                Victory
              </button>

              <button
                type="button"
                data-action="defeat"
              >
                Defeat
              </button>

              <button
                type="button"
                data-action="end"
              >
                Close
              </button>
            </footer>
          `
          : ""
      }
    </div>
  `;

  mountHUD(hud, {
    configure: openSetupDialog,

    "recon-scan": (
      event,
      control
    ) => {
      recordReconScan(
        String(
          control.dataset.regionId ?? ""
        )
      );
    },

    "extraction-extract": () =>
      resolveExtractionObjective(
        "extracted"
      ),

    "extraction-destroy": () =>
      resolveExtractionObjective(
        "destroyed"
      ),

    "escort-extract": () =>
      resolveEscortObjective(
        "extracted"
      ),

    "escort-destroy": () =>
      resolveEscortObjective(
        "destroyed"
      ),

    toggle: togglePause,

    victory: () =>
      setResult(
        "victory",
        "Victory declared by the GM."
      ),

    defeat: () =>
      setResult(
        "defeat",
        "Defeat declared by the GM."
      ),

    end: endSitrep
  });
}
