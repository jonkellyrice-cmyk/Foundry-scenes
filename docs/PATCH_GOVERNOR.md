# Phase Patch Governor

The Phase Patch Governor is repository-native development tooling for large, multi-phase changes. It separates work into **pre-production** and **production** so an AI coding agent or human maintainer can plan a project as a deterministic patch chain and then let GitHub Actions execute, validate, report, and merge that chain.

It is intentionally not part of the Foundry module runtime. Nothing under `dev/`, `.governor/`, or `.github/` is shipped in the Foundry release ZIP.

## Core invariants

1. One project has an ordered list of phases.
2. One phase has exactly one `*.patch.json` file.
3. Patch files are drafted in phase order; later patches are rejected while an earlier phase is missing.
4. A commit on a planning branch may change at most one patch file.
5. Production cannot start until `plan.json` is `status: "ready"` and every phase has exactly one valid patch.
6. Every phase patch must have at least one validation check, and the project must have final checks.
7. Production always starts from a fresh copy of `main`; it never continues from an unknown partially edited working tree.
8. Every mutating operation has a deterministic precondition. If the repository no longer matches the patch's expectation, the governor stops instead of guessing.
9. Each successful phase becomes its own commit on a temporary production branch.
10. The governor merges the production branch into `main` only after every phase and every final check passes.
11. Immediately before merging, it verifies that `main` has not moved since production began; base-branch drift blocks the merge and requires a clean rerun.
12. A failed run never merges. GitHub Actions reports the exact phase, operation/check, and command that failed.
13. A successful run archives the immutable plan, patches, source commit, and run metadata under `.governor/history/`.
14. Governed patches may not rewrite the governor engine, governor workflow, or `.governor/` state; governor changes are bootstrap/tooling changes, not project phases.

## Repository layout

```text
.governor/
├── projects/
│   └── <project>/
│       ├── plan.json
│       └── patches/
│           ├── 001-<phase>.patch.json
│           ├── 002-<phase>.patch.json
│           └── ...
├── history/
│   └── <project>/<planning-commit>/...
└── templates/
    ├── plan.example.json
    └── patch.example.json

dev/
├── patch-governor.mjs
└── patch-governor.test.mjs

.github/workflows/
└── patch-governor.yml
```

`projects/` is normally populated on a planning branch, not directly on `main`. `history/` is written by the production governor and is merged with the completed implementation so the executed chain remains auditable.

## Pre-production lifecycle

Create a planning branch named:

```text
governor-plan/<project>
```

Create `.governor/projects/<project>/plan.json` using the template. The plan contains the complete ordered phase list but begins with:

```json
"status": "draft"
```

Then draft **one patch at a time**.

Example sequence:

```text
commit 1  plan.json only
commit 2  001-foundation.patch.json
commit 3  002-data-model.patch.json
commit 4  003-ui.patch.json
commit 5  change plan.status from "draft" to "ready"
```

Every push to `governor-plan/**` runs the pre-production gate. The GitHub Actions summary tells the maintainer:

- which project was detected;
- whether the chain is valid;
- whether every patch has been drafted;
- the exact next phase that needs a patch;
- the SHA-256 of the current plan.

The validator rejects skipped phases, duplicate patches, extra unreferenced patches, malformed operations, unsafe paths, and commits that modify multiple patch files at once.

When every patch exists, make a separate commit changing the plan to `status: "ready"`. That commit is the production handoff. Its Git commit SHA is the immutable seal for that run.

## Production lifecycle

A valid `ready` push automatically starts production. It can also be started manually from the **Phase Patch Governor** workflow with a project directory.

Production does the following:

1. snapshots the sealed plan and calculates a chain fingerprint;
2. checks out a fresh production branch from `main`;
3. applies phase 1 using its deterministic patch operations;
4. runs phase 1 checks;
5. commits and pushes phase 1 only if those checks pass;
6. repeats for every remaining phase;
7. runs the project's final checks;
8. archives the exact plan and patch chain plus run metadata;
9. re-fetches `main` and verifies it is still the exact base commit production started from;
10. fast-forward pushes the validated phase commits into `main`;
11. deletes the temporary production branch;
12. explicitly dispatches the module release workflow when `module.json` changed.

Production branches are unique per workflow attempt:

```text
governor-run/<project>/<run-id>-<attempt>
```

A failed run therefore cannot contaminate a later retry. Successful phase commits remain visible on the temporary branch during a failed run, which makes diagnosis easy, but the repair is still made in the planning patch rather than by editing that generated branch.

The merge is deliberately a guarded fast-forward instead of a bot-created pull request. This avoids depending on the repository setting that permits GitHub Actions to create pull requests, preserves one commit per executed phase, and fails safely if another change lands on `main` during production.

## Targeted repair loop

If a phase fails, do **not** hand-edit the partially generated production branch.

Instead:

1. read the GitHub Actions error; it identifies the failing phase and either the failed deterministic operation or failed check;
2. edit only that phase's `*.patch.json` on the planning branch;
3. push the targeted fix;
4. the pre-production gate revalidates the full chain;
5. because the plan remains `ready`, production reruns from a clean `main` baseline using the corrected immutable planning commit.

This makes repair deterministic. Earlier successful patches are replayed rather than manually reconstructed, while the actual edit remains confined to the failing phase.

## Patch format

Every patch has this shape:

```json
{
  "schemaVersion": 1,
  "id": "phase-id",
  "phase": "phase-id",
  "summary": "What this phase changes",
  "operations": [],
  "checks": [
    { "name": "Phase validation", "run": "some command" }
  ]
}
```

`id` and `phase` must exactly match the corresponding phase ID in `plan.json`.

### `write`

Creates a new UTF-8 text file.

```json
{
  "op": "write",
  "path": "scripts/new-file.mjs",
  "content": "..."
}
```

By default the target must not already exist. Replacing an existing file requires both:

```json
"ifExists": "replace",
"expectedSha256": "<64-character sha256>"
```

This prevents an old patch from silently overwriting newer work.

### `replace`

Replaces exact text only when the expected number of occurrences is present.

```json
{
  "op": "replace",
  "path": "module.json",
  "before": "exact old text",
  "after": "exact new text",
  "expectedOccurrences": 1
}
```

If the old text changed or appears a different number of times, production stops and reports the path.

### `json-set`

Changes a JSON property only if its current value exactly matches the expected value.

```json
{
  "op": "json-set",
  "path": "module.json",
  "keyPath": ["version"],
  "expected": "0.2.0",
  "value": "0.3.0"
}
```

### `delete`

Deletes an existing file. `expectedSha256` is mandatory so deletion is always guarded against repository drift.

```json
{
  "op": "delete",
  "path": "obsolete.mjs",
  "expectedSha256": "<64-character sha256>"
}
```

## Checks

Checks are trusted repository commands executed with the project root as the working directory. A nonzero exit status fails the phase immediately. Checks must be read-only: the production workflow snapshots `git status` before and after every phase check and final check and fails if validation changes the workspace.

Good phase checks are narrow and attributable to that phase, for example:

```json
{
  "name": "Encounter data-model syntax",
  "run": "node --check scripts/encounter/data-model.mjs"
}
```

Final checks should validate the integrated project rather than repeat every narrow phase check. Prefer deterministic local checks that do not depend on external network state.

## CLI

The same validator/executor used by GitHub Actions can be run locally:

```bash
node dev/patch-governor.mjs validate-project \
  --project-dir .governor/projects/example-project

node dev/patch-governor.mjs list-phases \
  --project-dir .governor/projects/example-project

node dev/patch-governor.mjs fingerprint \
  --project-dir .governor/projects/example-project
```

The mutation commands are primarily intended for the isolated production branch created by GitHub Actions:

```bash
node dev/patch-governor.mjs apply \
  --project-dir /path/to/sealed/project \
  --phase foundation

node dev/patch-governor.mjs checks \
  --project-dir /path/to/sealed/project \
  --phase foundation
```

Run the governor's own regression test with:

```bash
npm run governor:test
```

## Using it with an AI coding agent

For a large request, the intended operating procedure is:

1. establish the phase list first;
2. create the planning branch and draft plan;
3. author only the first missing phase patch;
4. let the pre-production governor validate it and report the next phase;
5. repeat until all phases exist;
6. mark the plan `ready`;
7. stop hand-applying implementation edits and let production execute the chain;
8. if production reports an error, edit only the named failing patch/check and rerun;
9. treat the governor's successful merge as the completion signal.

That is the behavioral constraint the tool is designed to impose: **plan one phase, patch one phase, validate one phase; then execute the whole sealed chain mechanically.**
