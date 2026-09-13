/**
 * Extracted by Frame Conn Domain Decomposer from scripts/dm_features/sitreps/legacy-sitrep-module/scripts/lancer-sitrep-tracker.js.
 * Structural decomposition only; behavior and public contracts must remain unchanged.
 */



export function renderReconState(sitrep, state) {
  const zones = state.reconZones
    .map(
      (zone, index) => {
        let scanResult = "UNSCANNED";
        let scanClass = "unscanned";

        if (zone.scanned && zone.isTrueZone) {
          scanResult = "TRUE CZ";
          scanClass = "true";
        } else if (zone.scanned) {
          scanResult = "FALSE CZ";
          scanClass = "false";
        }

        return `
          <div class="lst-recon-zone lst-zone-${esc(zone.controller)}">
            <div class="lst-recon-zone-heading">
              <span>
                OBJECTIVE ${String.fromCharCode(65 + index)}
              </span>

              <strong>${esc(zone.name)}</strong>
            </div>

            <div class="lst-recon-scan lst-recon-scan-${scanClass}">
              ${scanResult}
            </div>

            <div class="lst-recon-control">
              ${controlZoneLabel(zone.controller)} CONTROL
            </div>

            <div class="lst-recon-counts">
              <span class="allied">
                ${zone.friendly} ALLIED
              </span>

              <span class="hostile">
                ${zone.hostile} HOSTILE
              </span>
            </div>

            ${
              game.user.isGM && !zone.scanned
                ? `
                  <button
                    type="button"
                    class="lst-recon-scan-button"
                    data-action="recon-scan"
                    data-region-id="${esc(zone.id)}"
                  >
                    Record Scan
                  </button>
                `
                : ""
            }
          </div>
        `;
      }
    )
    .join("");

  const trueZoneStatus = state.reconTrueZoneScanned
    ? state.reconTrueZoneController === "friendly"
      ? "TRUE CZ SECURED"
      : state.reconTrueZoneController === "hostile"
        ? "TRUE CZ HOSTILE"
        : "TRUE CZ CONTESTED"
    : "TRUE CZ UNKNOWN";

  const trueZoneClass = state.reconTrueZoneScanned
    ? state.reconTrueZoneController
    : "unknown";

  return `
    <div class="lst-recon-summary lst-recon-summary-${trueZoneClass}">
      ${trueZoneStatus}
    </div>

    <div class="lst-recon-zone-grid">
      ${zones}
    </div>

    <div class="lst-recon-note">
      A character inside a Control Zone may use a full action
      to scan it. The GM then records the scan result here.
    </div>
  `;
}
