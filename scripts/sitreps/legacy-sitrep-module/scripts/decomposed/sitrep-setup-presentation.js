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
  DEFAULTS,
  SITREP_TYPES
} from "./sitrep-configuration.js";

export function setupDialogHTML(
  combat,
  existing
) {
  const scene =
    combat.scene ?? canvas.scene;

  const regions = [
    ...(scene?.regions ?? [])
  ];

  const regionOptions = options(
    regions,
    {
      selected: existing?.regionId ?? "",
      valueOf: region => region.id,
      labelOf: region =>
        region.name || region.id
    }
  );

  const selectedControlRegionIds = Array.isArray(existing?.controlRegionIds)
    ? existing.controlRegionIds
    : [];

  const controlRegionOptions = options(
    regions,
    {
      selected: selectedControlRegionIds,
      valueOf: region => region.id,
      labelOf: region =>
        region.name || region.id
    }
  );

  const escortExtractionOptions = regions
    .map(
      region => `
        <option
          value="${esc(region.id)}"
          ${
            existing?.escortExtractionRegionId === region.id
              ? "selected"
              : ""
          }
        >
          ${esc(region.name || region.id)}
        </option>
      `
    )
    .join("");

  const escortObjectiveOptions = [...(combat.combatants ?? [])]
    .map(
      combatant => `
        <option
          value="${esc(combatant.id)}"
          ${
            existing?.escortObjectiveCombatantId === combatant.id
              ? "selected"
              : ""
          }
        >
          ${esc(combatant.name || combatant.token?.name || combatant.id)}
        </option>
      `
    )
    .join("");

  const extractionZoneOptions = regions
    .map(
      region => `
        <option
          value="${esc(region.id)}"
          ${
            existing?.extractionZoneRegionId === region.id
              ? "selected"
              : ""
          }
        >
          ${esc(region.name || region.id)}
        </option>
      `
    )
    .join("");

  const selectedReconRegionIds = Array.isArray(
    existing?.reconRegionIds
  )
    ? existing.reconRegionIds
    : [];

  const reconRegionOptions = regions
    .map(
      region => `
        <option
          value="${esc(region.id)}"
          ${
            selectedReconRegionIds.includes(region.id)
              ? "selected"
              : ""
          }
        >
          ${esc(region.name || region.id)}
        </option>
      `
    )
    .join("");

  const reconTrueRegionOptions = regions
    .map(
      region => `
        <option
          value="${esc(region.id)}"
          ${
            existing?.reconTrueRegionId === region.id
              ? "selected"
              : ""
          }
        >
          ${esc(region.name || region.id)}
        </option>
      `
    )
    .join("");

  const extractionObjectiveOptions = [...(combat.combatants ?? [])]
    .map(
      combatant => `
        <option
          value="${esc(combatant.id)}"
          ${
            existing?.extractionObjectiveCombatantId === combatant.id
              ? "selected"
              : ""
          }
        >
          ${esc(combatant.name || combatant.token?.name || combatant.id)}
        </option>
      `
    )
    .join("");

  const startRound = Math.max(
    Number(combat.round ?? 1),
    1
  );

  const total = Number(
    existing?.roundLimit ?? 8
  );

  const selectedSitrepType =
    existing?.type ?? DEFAULTS.type;

  const sitrepTypeOptions = options(
    SITREP_TYPES,
    {
      selected: selectedSitrepType,
      valueOf: sitrepType =>
        sitrepType.value,
      labelOf: sitrepType =>
        sitrepType.label
    }
  );

  return `
    <form class="lst-setup-form">
      <p>
        Draw a <strong>Scene Region</strong>
        over the control zone before beginning the sitrep.
      </p>

      <div class="form-group">
        <label>Sitrep type</label>

        <select name="sitrepType">
          ${sitrepTypeOptions}
        </select>

        <p class="notes">
          Sitrep-specific rules will be added in a future update.
          For now, all selections use the current Gauntlet tracking logic.
        </p>
      </div>

      <div class="form-group">
        <label>Mission title</label>

        <input
          type="text"
          name="title"
          value="${esc(
            existing?.title ?? "GAUNTLET"
          )}"
        >
      </div>

      <div class="form-group">
        <label>Objective shown to players</label>

        <textarea
          name="objective"
          rows="3"
        >${esc(
          existing?.objective ??
          DEFAULTS.objective
        )}</textarea>
      </div>

      <div class="form-group lst-single-region-group">
        <label>Control Region</label>

        <select name="regionId">
          <option value="">
            — Select a Region —
          </option>

          ${regionOptions}
        </select>
      </div>

      <div class="form-group lst-control-regions-group" style="display: none;">
        <label>Control Zones</label>

        <select name="controlRegionIds" multiple size="6">
          ${controlRegionOptions}
        </select>

        <p class="notes">
          Select exactly four Scene Regions. Hold Ctrl while clicking
          to select multiple Regions.
        </p>
      </div>

      <div class="lst-recon-fields" style="display: none;">
        <div class="form-group">
          <label>Recon Control Zones</label>

          <select name="reconRegionIds" multiple size="6">
            ${reconRegionOptions}
          </select>

          <p class="notes">
            Select exactly four Scene Regions. Hold Ctrl while
            clicking to select multiple Regions.
          </p>
        </div>

        <div class="form-group">
          <label>True Control Zone</label>

          <select name="reconTrueRegionId">
            <option value="">
              — Secretly select the True CZ —
            </option>

            ${reconTrueRegionOptions}
          </select>

          <p class="notes">
            Only the GM sees this setup field. The selected zone
            remains hidden from players until it is scanned.
          </p>
        </div>
      </div>

      <div class="lst-extraction-fields" style="display: none;">
        <div class="form-group">
          <label>Objective combatant</label>

          <select name="extractionObjectiveCombatantId">
            <option value="">
              — Select the Objective —
            </option>

            ${extractionObjectiveOptions}
          </select>

          <p class="notes">
            Add the Objective token to the Combat Tracker, then select it here.
          </p>
        </div>

        <div class="form-group">
          <label>Extraction Zone</label>

          <select name="extractionZoneRegionId">
            <option value="">
              — Select the Extraction Zone —
            </option>

            ${extractionZoneOptions}
          </select>

          <p class="notes">
            The Objective must reach this Region while adjacent to an allied unit and uncontested.
          </p>
        </div>
      </div>

      <div class="lst-escort-fields" style="display: none;">
        <div class="form-group">
          <label>Objective combatant</label>

          <select name="escortObjectiveCombatantId">
            <option value="">
              — Select the Objective —
            </option>

            ${escortObjectiveOptions}
          </select>

          <p class="notes">
            Add the Objective token to the Combat Tracker, then select it here.
          </p>
        </div>

        <div class="form-group">
          <label>Extraction Zone</label>

          <select name="escortExtractionRegionId">
            <option value="">
              — Select the Extraction Zone —
            </option>

            ${escortExtractionOptions}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Round limit</label>

        <input
          type="number"
          name="roundLimit"
          value="${total}"
          min="1"
          max="99"
        >

        <p class="notes">
          The sitrep begins on the current combat
          round (${startRound}) and lasts this
          many rounds.
        </p>
      </div>

      <fieldset>
        <legend>Victory conditions</legend>

        <label class="checkbox">
          <input
            type="checkbox"
            name="finalZoneControl"
            ${
              existing?.rules
                ?.finalZoneControl !== false
                ? "checked"
                : ""
            }
          >

          Control the zone at the end of the final round
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            name="enemyElimination"
            ${
              existing?.rules
                ?.enemyElimination !== false
                ? "checked"
                : ""
            }
          >

          Win immediately when no hostile units remain standing
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            name="unassailableControl"
            ${
              existing?.rules
                ?.unassailableControl !== false
                ? "checked"
                : ""
            }
          >

          Win immediately when allies in the zone
          outnumber all surviving hostiles
        </label>
      </fieldset>

      <p class="notes">
        <strong>Classification:</strong>
        Friendly token disposition = ally;
        Hostile disposition = enemy;
        Neutral tokens are ignored.
        Mark destroyed units defeated in the Combat Tracker.
      </p>
    </form>
  `;
}
