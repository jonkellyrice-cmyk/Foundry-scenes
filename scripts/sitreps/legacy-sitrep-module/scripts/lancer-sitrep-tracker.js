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
} from "./sitrep-kernel.js";

import {
  HUD_ID,
  createHUD,
  escapeHTML,
  keepHUDOnScreen,
  mountHUD,
  removeHUD
} from "./sitrep-ui-boilerplate.js";

import {
  installProgram
} from "./sitrep-program.js";

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
} from "./sitrep-dsl.js";


import {
  DEFAULTS,
  SITREP_TYPES
} from "./decomposed/sitrep-configuration.js";

import {
  GAUNTLET_NPC_TEMPLATE_WEIGHTS,
  gauntletControlWeight
} from "./decomposed/gauntlet-control-weight.js";

import {
  calculateState
} from "./decomposed/sitrep-state-composition.js";

import {
  controlLabel,
  controlZoneLabel,
  esc,
  progressPips
} from "./decomposed/sitrep-presentation-shared.js";

import {
  renderReconState
} from "./decomposed/recon-presentation.js";

import {
  renderHoldoutState
} from "./decomposed/holdout-presentation.js";

import {
  renderExtractionState
} from "./decomposed/extraction-presentation.js";

import {
  renderEscortState
} from "./decomposed/escort-presentation.js";

import {
  renderControlState
} from "./decomposed/control-presentation.js";

import {
  renderHUD
} from "./decomposed/sitrep-hud-rendering.js";

import {
  endSitrep,
  evaluateSitrep,
  setResult,
  togglePause
} from "./decomposed/sitrep-encounter-resolution.js";

import {
  recordReconScan
} from "./decomposed/recon-resolution.js";

import {
  resolveExtractionObjective
} from "./decomposed/extraction-resolution.js";

import {
  resolveEscortObjective
} from "./decomposed/escort-resolution.js";

import {
  setupDialogHTML
} from "./decomposed/sitrep-setup-presentation.js";

import {
  saveSetup
} from "./decomposed/sitrep-setup-state.js";

import {
  openSetupDialog
} from "./decomposed/sitrep-setup-dialog.js";

/**
 * Returns the value of one combatant for Gauntlet control.
 *
 * Lancer stores applied NPC templates as embedded Actor items with
 * type "npc_template" and canonical LIDs such as "npct_elite".
 * PCs, ordinary NPCs, and NPCs with unrelated templates count as 1.
 */


/* ==========================================================
   Sitrep state composition
   ========================================================== */


/* ==========================================================
   HUD rendering
   ========================================================== */


/* ==========================================================
   Victory and encounter state
   ========================================================== */


) {
  let sitrep = getSitrep(combat);

  if (
    !sitrep?.active ||
    sitrep.status !== "active" ||
    !isPrimaryGM()
  ) {
    return;
  }

  let state = calculateState(combat, sitrep);
  if (!state.valid) return;

  const roundChanged = Object.prototype.hasOwnProperty.call(
    changes,
    "round"
  );

  if (sitrep.type === "recon") {
    if (
      roundChanged &&
      Number(changes.round) > Number(sitrep.finalRound)
    ) {
      const trueZone = state.reconZones.find(
        zone => zone.isTrueZone
      );

      const alliesControlTrueZone =
        trueZone?.controller === "friendly" &&
        Number(trueZone?.friendly ?? 0) > 0 &&
        Number(trueZone?.hostile ?? 0) === 0;

      if (alliesControlTrueZone) {
        await setResult(
          "victory",
          `The allies controlled the True Control Zone at the end of round ${sitrep.finalRound}.`
        );
      } else {
        const trueZoneStatus = trueZone
          ? controlZoneLabel(trueZone.controller).toLowerCase()
          : "unresolved";

        await setResult(
          "defeat",
          `The allies did not control the True Control Zone at the end of round ${sitrep.finalRound}. Its final status was ${trueZoneStatus}.`
        );
      }
    }

    return;
  }

  if (sitrep.type === "holdout") {
    if (
      roundChanged &&
      Number(changes.round) > Number(sitrep.finalRound)
    ) {
      const finalScore = Number(state.holdoutScore);

      if (finalScore >= 1) {
        await setResult(
          "victory",
          `The allies held the zone through round ${sitrep.finalRound} with a final score of ${finalScore}.`
        );
      } else {
        const captureWarning =
          state.friendlyStanding > 0
            ? " Any allied units still on the battlefield are captured or overrun."
            : "";

        await setResult(
          "defeat",
          `The position was overrun at the end of round ${sitrep.finalRound}. Final score: ${finalScore}.${captureWarning}`
        );
      }
    }

    return;
  }

  if (sitrep.type === "extraction") {
    if (state.objectiveDestroyed) {
      if (sitrep.extractionStatus !== "destroyed") {
        await resolveExtractionObjective("destroyed");
      }

      return;
    }

    if (
      roundChanged &&
      Number(changes.round) > Number(sitrep.finalRound)
    ) {
      await setResult(
        "defeat",
        `The Objective was not extracted by the end of round ${sitrep.finalRound}. Any allied units remaining on the battlefield are captured or overrun.`
      );
    }

    return;
  }

  if (sitrep.type === "escort") {
    if (state.objectiveDestroyed) {
      if (sitrep.escortStatus !== "destroyed") {
        await resolveEscortObjective("destroyed");
      }

      return;
    }

    if (state.canExtractObjective) {
      await resolveEscortObjective("extracted");
      return;
    }

    if (
      roundChanged &&
      Number(changes.round) > Number(sitrep.finalRound)
    ) {
      await setResult(
        "defeat",
        `The Objective was not extracted by the end of round ${sitrep.finalRound}.`
      );
    }

    return;
  }

  if (sitrep.type === "control") {
    if (!roundChanged) return;

    const completedRound = Number(changes.round) - 1;
    const scoredRounds = Array.isArray(sitrep.scoredRounds)
      ? [...sitrep.scoredRounds]
      : [];

    if (
      completedRound >= Number(sitrep.startRound) &&
      completedRound <= Number(sitrep.finalRound) &&
      !scoredRounds.includes(completedRound)
    ) {
      let friendlyRoundPoints = state.friendlyZones;
      let hostileRoundPoints = state.hostileZones;

      if (state.friendlyZones === 4) friendlyRoundPoints += 1;
      if (state.hostileZones === 4) hostileRoundPoints += 1;

      scoredRounds.push(completedRound);

      sitrep = {
        ...sitrep,
        scores: {
          friendly:
            Number(sitrep.scores?.friendly ?? 0) +
            friendlyRoundPoints,
          hostile:
            Number(sitrep.scores?.hostile ?? 0) +
            hostileRoundPoints
        },
        scoredRounds
      };

      await combat.setFlag(MODULE_ID, FLAG_KEY, sitrep);
      state = calculateState(combat, sitrep);

      await ChatMessage.create({
        speaker: { alias: "MISSION CONTROL" },
        content: chatResult(
          `CONTROL — ROUND ${completedRound} SCORED`,
          [
            `Allies +${friendlyRoundPoints} | Hostiles +${hostileRoundPoints}`,
            `Total: Allies ${sitrep.scores.friendly} — Hostiles ${sitrep.scores.hostile}`
          ]
        )
      });
    }

    if (Number(changes.round) > Number(sitrep.finalRound)) {
      const friendlyScore = Number(sitrep.scores?.friendly ?? 0);
      const hostileScore = Number(sitrep.scores?.hostile ?? 0);

      if (friendlyScore > hostileScore) {
        await setResult(
          "victory",
          `The allies won Control ${friendlyScore} to ${hostileScore}.`
        );
      } else if (hostileScore > friendlyScore) {
        await setResult(
          "defeat",
          `The hostiles won Control ${hostileScore} to ${friendlyScore}.`
        );
      } else {
        await combat.setFlag(MODULE_ID, FLAG_KEY, {
          ...sitrep,
          status: "draw",
          resultReason:
            `Control ended in a ${friendlyScore} to ${hostileScore} draw. Neither side achieved victory.`
        });

        await ChatMessage.create({
          speaker: { alias: "MISSION CONTROL" },
          content: `
            <div class="lst-chat-result">
              <strong>NO VICTOR</strong>
              <br>
              Control ended in a ${friendlyScore} to ${hostileScore} draw.
            </div>
          `
        });
      }
    }

    return;
  }

  if (state.immediateVictory) {
    await setResult("victory", state.immediateReason);
    return;
  }

  const previousRound = Number(combat.previous?.round ?? 0);

  const advancedPastFinalRound =
    roundChanged &&
    Number(combat.round) > Number(sitrep.finalRound);

  const fallbackPastFinalRound =
    roundChanged &&
    previousRound === Number(sitrep.finalRound) &&
    Number(combat.round) !== previousRound;

  if (advancedPastFinalRound || fallbackPastFinalRound) {
    const won =
      sitrep.rules?.finalZoneControl &&
      state.friendlyInZone > state.hostileInZone &&
      state.friendlyInZone > 0;

    const reason = won
      ? `At the end of round ${sitrep.finalRound}, allied units controlled the zone ${state.friendlyInZone} to ${state.hostileInZone}.`
      : `At the end of round ${sitrep.finalRound}, allied units did not control the zone (${state.friendlyInZone} allied, ${state.hostileInZone} hostile).`;

    await setResult(won ? "victory" : "defeat", reason);
  }
}


/* ==========================================================
   Setup dialog
   ========================================================== */


/* ==========================================================
   Foundry program wiring
   ========================================================== */

installProgram({
  moduleId: MODULE_ID,

  publicApi: {
    openSetup: openSetupDialog,
    renderHUD,
    calculateState,
    end: endSitrep
  },

  ready: renderHUD,

  resize: {
    key: "__lancerSitrepResize",
    delay: 100,
    handler: keepHUDOnScreen
  },

  combatTrackerButton: {
    className: "lst-open-button",

    content:
      '<i class="fas fa-bullseye"></i> Sitrep',

    when: () => game.user.isGM,

    onClick: openSetupDialog,

    findTarget: root =>
      root.querySelector?.(
        ".combat-tracker-header"
      ) ??
      root.querySelector?.("header") ??
      root
  },

  hooks: [
    {
      event: "renderCombatTracker",
      kind: "combat-tracker-button"
    },

    {
      event: "canvasReady",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "updateCombat",

      handler: async (
        combat,
        changes
      ) => {
        renderHUD();

        await evaluateSitrep(
          combat,
          changes
        );
      }
    },

    {
      event: "updateCombatant",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "createCombatant",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "deleteCombatant",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "updateToken",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "createToken",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "deleteToken",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "updateRegion",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "deleteRegion",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    },

    {
      event: "controlToken",
      key: "__lancerSitrepRefresh",
      delay: 50,
      handler: renderHUD
    }
  ]
});
