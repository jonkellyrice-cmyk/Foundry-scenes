/** Canonical Frame Conn SITREP feature package. Registered only through the DM feature registry. */

import { defineFrameConnFeature } from "../../feature-contract.js";
import { configureSitrepOrchestrationRuntime, configureSitrep, endSitrep, evaluateSitrepCombatChange, getSitrepOperationalState, getSitrepOrchestrationDiagnostics, getDefaultSitrepObjective, getSitrepPresentationState, handleSitrepCombatUpdate, resolveEscortOutcome, resolveExtractionOutcome, scanReconRegion, setSitrepResult, startSitrep, toggleSitrepPause, validateSitrepSetup } from "./orchestration/sitrep-orchestrator.js";

export const frameConnSitrepsFeature = defineFrameConnFeature({
  id: "sitreps",
  domain: "dm-sitreps",
  provides: ["dm.sitreps", "dm.sitreps.state", "dm.sitreps.commands", "dm.sitreps.orchestration", "dm.sitreps.presentation-state"],
  dependsOn: ["targeting-spatial", "foundry.integration"],
  optionalDependsOn: [],
  state: {},
  commands: { configureRuntime: configureSitrepOrchestrationRuntime, configure: configureSitrep, start: startSitrep, togglePause: toggleSitrepPause, end: endSitrep, setResult: setSitrepResult, evaluateCombatChange: evaluateSitrepCombatChange, scanReconRegion, resolveEscortOutcome, resolveExtractionOutcome },
  queries: { operationalState: getSitrepOperationalState, presentationState: getSitrepPresentationState, defaultObjective: getDefaultSitrepObjective, validateSetup: validateSitrepSetup, diagnostics: getSitrepOrchestrationDiagnostics },
  hooks: { updateCombat: handleSitrepCombatUpdate },
  lifecycle: {},
  api: { configureRuntime: configureSitrepOrchestrationRuntime, configure: configureSitrep, start: startSitrep, togglePause: toggleSitrepPause, end: endSitrep, setResult: setSitrepResult, evaluateCombatChange: evaluateSitrepCombatChange, scanReconRegion, resolveEscortOutcome, resolveExtractionOutcome, operationalState: getSitrepOperationalState, presentationState: getSitrepPresentationState, defaultObjective: getDefaultSitrepObjective, validateSetup: validateSitrepSetup, diagnostics: getSitrepOrchestrationDiagnostics },
  metadata: { audience: "gm", phase: "sitrep-assimilation-phase-5", runtimeRegistration: "dm-feature-registry" }
});

export const FRAME_CONN_SITREP_FEATURES = Object.freeze([frameConnSitrepsFeature]);
