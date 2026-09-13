/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/elevation-los.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */

import {
  FEATURE_KEY,
  MODULE_ID,
  STYLE_ID
} from "./elevation-los-contract.js";
import { readWallElevationData } from "./wall-elevation-state.js";

export function wallConfigRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

export function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
    .lancer-elevation-los-fieldset {
      margin: 10px 0;
      padding: 10px 12px;
      border: 1px solid rgba(86, 228, 255, 0.45);
      background: rgba(86, 228, 255, 0.045);
    }

    .lancer-elevation-los-fieldset legend {
      padding: 0 6px;
      color: #56e4ff;
      font-weight: 700;
    }

    .lancer-elevation-los-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .lancer-elevation-los-fieldset .notes {
      margin: 6px 0 0;
      font-size: 11px;
      line-height: 1.35;
    }

    .lancer-elevation-los-presets {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

    .lancer-elevation-los-presets button {
      flex: 1;
      min-width: 0;
      padding: 4px 3px;
      font-size: 10px;
    }
  `;

  document.head.appendChild(style);
}

export function injectWallElevationFields(app, html) {
  if (!game.user?.isGM) return;

  const root = wallConfigRoot(html);
  if (!root) return;

  if (
    root.querySelector(
      ".lancer-elevation-los-fieldset"
    )
  ) {
    return;
  }

  const wallDocument =
    app?.document ??
    app?.object ??
    null;

  if (!wallDocument) return;

  const stored = readWallElevationData(wallDocument);

  const bottomValue =
    stored.bottom === null ||
    stored.bottom === undefined
      ? ""
      : String(stored.bottom);

  const topValue =
    stored.top === null ||
    stored.top === undefined
      ? ""
      : String(stored.top);

  const fieldset = document.createElement("fieldset");
  fieldset.className =
    "lancer-elevation-los-fieldset";

  fieldset.innerHTML = `
    <legend>
      <i class="fas fa-layer-group"></i>
      Lancer Elevation LOS
    </legend>

    <div class="lancer-elevation-los-grid">
      <div class="form-group">
        <label>Bottom Elevation</label>
        <div class="form-fields">
          <input
            type="number"
            step="any"
            name="flags.${MODULE_ID}.${FEATURE_KEY}.bottom"
            value="${foundry.utils.escapeHTML(bottomValue)}"
            placeholder="No lower limit"
          >
        </div>
      </div>

      <div class="form-group">
        <label>Top Elevation</label>
        <div class="form-fields">
          <input
            type="number"
            step="any"
            name="flags.${MODULE_ID}.${FEATURE_KEY}.top"
            value="${foundry.utils.escapeHTML(topValue)}"
            placeholder="Infinite"
          >
        </div>
      </div>
    </div>

    <p class="notes">
      The wall blocks sight and movement only while a token's
      elevation is inside this range. A token at or above the Top
      Elevation can see and move over it. Leave both fields blank
      for an ordinary infinitely tall Foundry wall.
    </p>

    <div class="lancer-elevation-los-presets">
      <button type="button" data-elevation-preset="1">
        Height 1
      </button>

      <button type="button" data-elevation-preset="2">
        Height 2
      </button>

      <button type="button" data-elevation-preset="3">
        Height 3
      </button>

      <button type="button" data-elevation-preset="5">
        Height 5
      </button>

      <button type="button" data-elevation-preset="infinite">
        Infinite
      </button>
    </div>
  `;

  const form =
    root.matches?.("form")
      ? root
      : root.querySelector("form");

  const footer = form?.querySelector(
    ".form-footer, footer"
  );

  if (footer) {
    footer.before(fieldset);
  } else {
    form?.appendChild(fieldset);
  }

  const bottomInput = fieldset.querySelector(
    `[name="flags.${MODULE_ID}.${FEATURE_KEY}.bottom"]`
  );

  const topInput = fieldset.querySelector(
    `[name="flags.${MODULE_ID}.${FEATURE_KEY}.top"]`
  );

  fieldset
    .querySelectorAll("[data-elevation-preset]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const preset = button.dataset.elevationPreset;

        if (preset === "infinite") {
          bottomInput.value = "";
          topInput.value = "";
          return;
        }

        bottomInput.value = "0";
        topInput.value = preset;
      });
    });
}

export function injectAmbientLightElevationField(app, html) {
  if (!game.user?.isGM) return;

  const root = wallConfigRoot(html);
  if (!root) return;

  if (
    root.querySelector(
      ".lancer-light-elevation-fieldset"
    )
  ) {
    return;
  }

  const lightDocument =
    app?.document ??
    app?.object ??
    null;

  if (!lightDocument) return;

  const documentName =
    lightDocument.documentName ??
    lightDocument.constructor?.documentName;

  if (documentName !== "AmbientLight") return;

  const form =
    root.matches?.("form")
      ? root
      : root.querySelector("form");

  if (!form) return;

  const existingElevationInput =
    form.querySelector('[name="elevation"]');

  if (existingElevationInput) {
    const existingGroup =
      existingElevationInput.closest(".form-group");

    existingGroup?.classList.add(
      "lancer-light-elevation-native-field"
    );

    const existingNotes = document.createElement("p");
    existingNotes.className =
      "notes lancer-light-elevation-notes";

    existingNotes.innerHTML = `
      Elevation defaults to 0. Bright and dim ranges are treated
      as spherical 3D radii projected onto ground elevation 0.
      Raising the light therefore reduces its horizontal footprint.
    `;

    existingGroup?.appendChild(existingNotes);
    return;
  }

  const fieldset = document.createElement("fieldset");

  fieldset.className =
    "lancer-elevation-los-fieldset lancer-light-elevation-fieldset";

  fieldset.innerHTML = `
    <legend>
      <i class="fas fa-lightbulb"></i>
      Lancer Light Elevation
    </legend>

    <div class="form-group">
      <label>Light Elevation</label>

      <div class="form-fields">
        <input
          type="number"
          step="any"
          name="elevation"
          value="${foundry.utils.escapeHTML(
            String(lightDocument.elevation ?? 0)
          )}"
        >
      </div>
    </div>

    <p class="notes">
      The default elevation is 0. Bright and dim ranges are
      spherical 3D radii measured from the light source. Raising
      the light reduces the horizontal area illuminated on ground
      elevation 0. If elevation equals or exceeds a radius, that
      radius no longer reaches the ground.
    </p>

    <p class="notes">
      Wall occlusion also uses this elevation. A light at or above
      a wall's Top Elevation can shine over that wall.
    </p>

    <div class="lancer-elevation-los-presets">
      <button type="button" data-light-elevation="0">
        Ground
      </button>

      <button type="button" data-light-elevation="1">
        Elevation 1
      </button>

      <button type="button" data-light-elevation="2">
        Elevation 2
      </button>

      <button type="button" data-light-elevation="3">
        Elevation 3
      </button>

      <button type="button" data-light-elevation="5">
        Elevation 5
      </button>
    </div>
  `;

  const footer = form.querySelector(
    ".form-footer, footer"
  );

  if (footer) {
    footer.before(fieldset);
  } else {
    form.appendChild(fieldset);
  }

  const elevationInput = fieldset.querySelector(
    '[name="elevation"]'
  );

  fieldset
    .querySelectorAll("[data-light-elevation]")
    .forEach(button => {
      button.addEventListener("click", () => {
        elevationInput.value =
          button.dataset.lightElevation ?? "0";

        elevationInput.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );
      });
    });
}
