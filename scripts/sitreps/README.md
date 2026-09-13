# Frame Conn DM Features — SITREPs

This directory is reserved for GM-facing support for **Lancer SITREPs**: structured tactical encounter types, their objectives, scoring/progress, special deployment rules, reinforcement timing, extraction/holdout/control conditions, and other scenario-specific mission logic.

## Future responsibility

SITREP features should help the GM both author and run tactical encounters. Likely responsibilities include:

- selecting or defining the encounter's SITREP type;
- presenting the SITREP's objective and victory/failure conditions;
- tracking rounds, zones, control points, extraction targets, escorts, reinforcements, or other scenario state;
- surfacing only the information players should know while preserving GM-only notes/state;
- integrating with the Mission Toolkit's **Boots on the Ground** stage;
- handing encounter results into mission/debrief state;
- using shared rules/spatial/Foundry services instead of duplicating combat logic.

## Boundary

SITREPs belong under `dm_features/` because they are primarily encounter-authoring and encounter-control tools for the GM. Their mechanical effects may call into shared `rules_features` or system-bridge services when needed, but the SITREP feature itself should not become a parallel combat rules engine.

## Current state

Scaffold only. Nothing in this directory is registered or executed yet.
