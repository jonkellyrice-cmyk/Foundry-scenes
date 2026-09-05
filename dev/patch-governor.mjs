#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import childProcess from 'node:child_process';

const ROOT = process.cwd();

function die(message, code = 1) {
  console.error(`GOVERNOR_ERROR: ${message}`);
  process.exit(code);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    die(`Cannot read JSON ${file}: ${error.message}`);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sha256File(file) {
  return sha256Text(fs.readFileSync(file));
}

function normalizeRepoPath(input) {
  if (typeof input !== 'string' || !input.trim()) die('Patch operation path must be a non-empty string.');
  const normalized = input.replaceAll('\\', '/').replace(/^\.\//, '');
  if (path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    die(`Unsafe path outside repository: ${input}`);
  }
  if (normalized === '.git' || normalized.startsWith('.git/')) die(`Patch operations may not modify .git: ${input}`);
  return normalized;
}

function resolveInsideRoot(root, repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, normalized);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) die(`Unsafe resolved path: ${repoPath}`);
  return { normalized, resolved };
}

function listProjectDirs(base = path.join(ROOT, '.governor', 'projects')) {
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(base, entry.name))
    .filter(dir => fs.existsSync(path.join(dir, 'plan.json')))
    .sort();
}

function validateCommand(command, context) {
  if (typeof command !== 'object' || command === null) die(`${context}: check must be an object.`);
  if (typeof command.name !== 'string' || !command.name.trim()) die(`${context}: check.name is required.`);
  if (typeof command.run !== 'string' || !command.run.trim()) die(`${context}: check.run is required.`);
}

function validateOperation(operation, context) {
  if (typeof operation !== 'object' || operation === null) die(`${context}: operation must be an object.`);
  const op = operation.op;
  if (!['write', 'replace', 'delete', 'json-set'].includes(op)) die(`${context}: unsupported operation '${op}'.`);
  normalizeRepoPath(operation.path);

  if (op === 'write') {
    if (typeof operation.content !== 'string') die(`${context}: write.content must be a string.`);
    if (operation.ifExists && !['error', 'replace'].includes(operation.ifExists)) die(`${context}: write.ifExists must be error or replace.`);
    if (operation.expectedSha256 !== undefined && (typeof operation.expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(operation.expectedSha256))) die(`${context}: write.expectedSha256 must be a lowercase SHA-256 hex string.`);
    if (operation.ifExists === 'replace' && !operation.expectedSha256) die(`${context}: write.ifExists=replace requires expectedSha256 so replacement is deterministic.`);
  }

  if (op === 'replace') {
    if (typeof operation.before !== 'string' || typeof operation.after !== 'string') die(`${context}: replace.before and replace.after must be strings.`);
    if (!Number.isInteger(operation.expectedOccurrences ?? 1) || (operation.expectedOccurrences ?? 1) < 1) {
      die(`${context}: replace.expectedOccurrences must be a positive integer.`);
    }
  }

  if (op === 'delete' && operation.expectedSha256 !== undefined && (typeof operation.expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(operation.expectedSha256))) {
    die(`${context}: delete.expectedSha256 must be a lowercase SHA-256 hex string.`);
  }

  if (op === 'json-set') {
    if (!Array.isArray(operation.keyPath) || operation.keyPath.length === 0 || operation.keyPath.some(k => typeof k !== 'string' || !k)) {
      die(`${context}: json-set.keyPath must be a non-empty array of strings.`);
    }
    if (!Object.prototype.hasOwnProperty.call(operation, 'expected')) die(`${context}: json-set.expected is required.`);
    if (!Object.prototype.hasOwnProperty.call(operation, 'value')) die(`${context}: json-set.value is required.`);
  }
}

function validatePatch(patchFile, phase) {
  if (!fs.existsSync(patchFile)) die(`Missing patch for phase '${phase.id}': ${patchFile}`);
  const patch = readJson(patchFile);
  if (patch.schemaVersion !== 1) die(`${patchFile}: schemaVersion must be 1.`);
  if (patch.id !== phase.id) die(`${patchFile}: patch id '${patch.id}' must match phase id '${phase.id}'.`);
  if (patch.phase !== phase.id) die(`${patchFile}: patch phase '${patch.phase}' must match '${phase.id}'.`);
  if (typeof patch.summary !== 'string' || !patch.summary.trim()) die(`${patchFile}: summary is required.`);
  if (!Array.isArray(patch.operations) || patch.operations.length === 0) die(`${patchFile}: operations must contain at least one operation.`);
  if (!Array.isArray(patch.checks) || patch.checks.length === 0) die(`${patchFile}: checks must contain at least one phase validation.`);
  patch.operations.forEach((operation, index) => validateOperation(operation, `${patchFile} operation ${index + 1}`));
  patch.checks.forEach((check, index) => validateCommand(check, `${patchFile} check ${index + 1}`));
  return patch;
}

function validatePlan(projectDir, { requireReady = false } = {}) {
  const planFile = path.join(projectDir, 'plan.json');
  if (!fs.existsSync(planFile)) die(`Missing plan.json in ${projectDir}`);
  const plan = readJson(planFile);
  if (plan.schemaVersion !== 1) die(`${planFile}: schemaVersion must be 1.`);
  if (typeof plan.project !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(plan.project)) die(`${planFile}: project must be kebab-case.`);
  if (typeof plan.title !== 'string' || !plan.title.trim()) die(`${planFile}: title is required.`);
  if (!['draft', 'ready'].includes(plan.status)) die(`${planFile}: status must be draft or ready.`);
  if (requireReady && plan.status !== 'ready') die(`${planFile}: production requires status=ready.`);
  if (!Array.isArray(plan.phases) || plan.phases.length === 0) die(`${planFile}: phases must contain at least one phase.`);
  if (!Array.isArray(plan.finalChecks) || plan.finalChecks.length === 0) die(`${planFile}: finalChecks must contain at least one check.`);
  plan.finalChecks.forEach((check, index) => validateCommand(check, `${planFile} finalChecks ${index + 1}`));

  const ids = new Set();
  let firstMissing = null;
  let seenMissing = false;
  const phaseRecords = [];
  const referencedPatchFiles = new Set();

  for (let index = 0; index < plan.phases.length; index += 1) {
    const phase = plan.phases[index];
    const expectedOrder = index + 1;
    if (typeof phase !== 'object' || phase === null) die(`${planFile}: phase ${expectedOrder} must be an object.`);
    if (phase.order !== expectedOrder) die(`${planFile}: phase '${phase.id ?? expectedOrder}' must have order ${expectedOrder}.`);
    if (typeof phase.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(phase.id)) die(`${planFile}: phase ${expectedOrder} id must be kebab-case.`);
    if (ids.has(phase.id)) die(`${planFile}: duplicate phase id '${phase.id}'.`);
    ids.add(phase.id);
    if (typeof phase.title !== 'string' || !phase.title.trim()) die(`${planFile}: phase '${phase.id}' title is required.`);
    if (typeof phase.patch !== 'string' || !phase.patch.endsWith('.patch.json')) die(`${planFile}: phase '${phase.id}' patch must end with .patch.json.`);
    const patchRel = normalizeRepoPath(phase.patch);
    if (!patchRel.startsWith('patches/')) die(`${planFile}: phase '${phase.id}' patch must live under patches/.`);
    if (referencedPatchFiles.has(patchRel)) die(`${planFile}: two phases reference '${patchRel}'. One patch per phase is required.`);
    referencedPatchFiles.add(patchRel);

    const patchFile = path.join(projectDir, patchRel);
    const exists = fs.existsSync(patchFile);
    if (!exists) {
      if (!firstMissing) firstMissing = phase.id;
      seenMissing = true;
      phaseRecords.push({ ...phase, exists: false, patchFile });
      continue;
    }
    if (seenMissing) die(`${planFile}: phase '${phase.id}' has a patch while an earlier phase is still missing. Draft patches strictly in phase order.`);
    const patch = validatePatch(patchFile, phase);
    phaseRecords.push({ ...phase, exists: true, patchFile, patch, digest: sha256File(patchFile) });
  }

  const patchesDir = path.join(projectDir, 'patches');
  if (fs.existsSync(patchesDir)) {
    for (const entry of fs.readdirSync(patchesDir)) {
      if (!entry.endsWith('.patch.json')) continue;
      const rel = `patches/${entry}`;
      if (!referencedPatchFiles.has(rel)) die(`${planFile}: unreferenced patch file '${rel}'. Every patch must belong to exactly one phase.`);
    }
  }

  const complete = phaseRecords.every(record => record.exists);
  if (plan.status === 'ready' && !complete) die(`${planFile}: status=ready but phase '${firstMissing}' is missing its patch.`);
  if (plan.status === 'draft' && complete) {
    console.warn(`GOVERNOR_WARNING: ${plan.project} has every patch drafted. Change plan.status to 'ready' in a separate commit to start production.`);
  }

  return {
    plan,
    planFile,
    projectDir,
    complete,
    firstMissing,
    phaseRecords,
    planDigest: sha256File(planFile),
  };
}

function validateChangedPatchDiscipline(changedFiles, projectDir) {
  if (!changedFiles.length) return;
  const relProject = path.relative(ROOT, projectDir).replaceAll('\\', '/');
  const patchPrefix = `${relProject}/patches/`;
  const changedPatches = changedFiles.filter(file => file.startsWith(patchPrefix) && file.endsWith('.patch.json'));
  if (changedPatches.length > 1) {
    die(`Pre-production allows only one patch file to change per commit. Changed: ${changedPatches.join(', ')}`);
  }
}

function getChangedFiles() {
  const envList = process.env.GOVERNOR_CHANGED_FILES?.trim();
  if (envList) return envList.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  try {
    return childProcess.execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding: 'utf8' })
      .split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getByPath(value, keyPath) {
  let cursor = value;
  for (const key of keyPath) {
    if (cursor === null || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, key)) return { exists: false };
    cursor = cursor[key];
  }
  return { exists: true, value: cursor };
}

function setByPath(value, keyPath, next) {
  let cursor = value;
  for (let i = 0; i < keyPath.length - 1; i += 1) {
    const key = keyPath[i];
    if (cursor[key] === undefined) cursor[key] = {};
    if (cursor[key] === null || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      die(`json-set cannot descend through non-object key '${key}'.`);
    }
    cursor = cursor[key];
  }
  cursor[keyPath.at(-1)] = next;
}

function applyOperation(operation, repoRoot) {
  const { normalized, resolved } = resolveInsideRoot(repoRoot, operation.path);

  if (operation.op === 'write') {
    const exists = fs.existsSync(resolved);
    const ifExists = operation.ifExists ?? 'error';
    if (exists) {
      if (operation.expectedSha256) {
        const actual = sha256File(resolved);
        if (actual !== operation.expectedSha256) die(`${normalized}: write precondition SHA mismatch. Expected ${operation.expectedSha256}, got ${actual}.`);
      } else if (ifExists !== 'replace') {
        die(`${normalized}: write target already exists. Use ifExists=replace with expectedSha256 to replace deterministically.`);
      }
    } else if (operation.expectedSha256) {
      die(`${normalized}: write expected an existing file with SHA ${operation.expectedSha256}, but the file is missing.`);
    }
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, operation.content, 'utf8');
    return `write ${normalized}`;
  }

  if (operation.op === 'replace') {
    if (!fs.existsSync(resolved)) die(`${normalized}: replace target is missing.`);
    const beforeText = fs.readFileSync(resolved, 'utf8');
    const expectedOccurrences = operation.expectedOccurrences ?? 1;
    const occurrences = operation.before === '' ? 0 : beforeText.split(operation.before).length - 1;
    if (occurrences !== expectedOccurrences) {
      die(`${normalized}: replace precondition failed. Expected ${expectedOccurrences} occurrence(s), found ${occurrences}.`);
    }
    const afterText = beforeText.split(operation.before).join(operation.after);
    fs.writeFileSync(resolved, afterText, 'utf8');
    return `replace ${normalized}`;
  }

  if (operation.op === 'delete') {
    if (!fs.existsSync(resolved)) die(`${normalized}: delete target is missing.`);
    if (operation.expectedSha256) {
      const actual = sha256File(resolved);
      if (actual !== operation.expectedSha256) die(`${normalized}: delete precondition SHA mismatch. Expected ${operation.expectedSha256}, got ${actual}.`);
    }
    fs.rmSync(resolved, { force: false, recursive: false });
    return `delete ${normalized}`;
  }

  if (operation.op === 'json-set') {
    if (!fs.existsSync(resolved)) die(`${normalized}: json-set target is missing.`);
    const json = readJson(resolved);
    const current = getByPath(json, operation.keyPath);
    if (!current.exists) die(`${normalized}: json-set keyPath ${operation.keyPath.join('.')} does not exist.`);
    if (!deepEqual(current.value, operation.expected)) {
      die(`${normalized}: json-set precondition failed at ${operation.keyPath.join('.')}. Expected ${JSON.stringify(operation.expected)}, got ${JSON.stringify(current.value)}.`);
    }
    setByPath(json, operation.keyPath, operation.value);
    writeJson(resolved, json);
    return `json-set ${normalized}:${operation.keyPath.join('.')}`;
  }

  die(`Unsupported operation ${operation.op}`);
}

function runCheck(check, cwd) {
  console.log(`GOVERNOR_CHECK_START: ${check.name}`);
  const result = childProcess.spawnSync(check.run, {
    cwd,
    shell: true,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    const error = new Error(`Check '${check.name}' failed with exit code ${result.status}. Command: ${check.run}`);
    error.exitCode = result.status;
    throw error;
  }
  console.log(`GOVERNOR_CHECK_OK: ${check.name}`);
}

function projectFromArgs(args) {
  const index = args.indexOf('--project-dir');
  if (index === -1 || !args[index + 1]) die('Missing --project-dir <path>.');
  return path.resolve(args[index + 1]);
}

function phaseFromArgs(args) {
  const index = args.indexOf('--phase');
  if (index === -1 || !args[index + 1]) die('Missing --phase <id>.');
  return args[index + 1];
}

function emitGithubOutput(values) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value ?? '')}`).join('\n') + '\n';
  fs.appendFileSync(outputFile, lines, 'utf8');
}

function cmdValidateProject(args) {
  const projectDir = projectFromArgs(args);
  const result = validatePlan(projectDir, { requireReady: args.includes('--require-ready') });
  if (args.includes('--enforce-one-patch-change')) validateChangedPatchDiscipline(getChangedFiles(), projectDir);
  const summary = {
    project: result.plan.project,
    status: result.plan.status,
    complete: result.complete,
    nextPhase: result.firstMissing ?? '',
    phases: result.phaseRecords.length,
    planDigest: result.planDigest,
  };
  console.log(JSON.stringify(summary, null, 2));
  emitGithubOutput({
    project: summary.project,
    status: summary.status,
    complete: summary.complete,
    next_phase: summary.nextPhase,
    project_dir: path.relative(ROOT, projectDir).replaceAll('\\', '/'),
    plan_digest: summary.planDigest,
  });
}

function cmdValidateWorkspace(args) {
  const dirs = listProjectDirs();
  if (!dirs.length) {
    console.log('No governor projects found.');
    emitGithubOutput({ project: '', status: '', complete: false, project_dir: '' });
    return;
  }
  const changed = getChangedFiles();
  const changedProjectDirs = dirs.filter(dir => {
    const rel = `${path.relative(ROOT, dir).replaceAll('\\', '/')}/`;
    return changed.some(file => file.startsWith(rel));
  });
  const targets = changedProjectDirs.length ? changedProjectDirs : dirs;
  if (changedProjectDirs.length > 1) die(`A single commit may advance only one governor project. Changed projects: ${changedProjectDirs.join(', ')}`);

  let ready = null;
  for (const dir of targets) {
    const result = validatePlan(dir);
    validateChangedPatchDiscipline(changed, dir);
    if (result.plan.status === 'ready') ready = result;
    const next = result.firstMissing ? `next=${result.firstMissing}` : 'all patches drafted';
    console.log(`GOVERNOR_PROJECT_OK: ${result.plan.project} (${result.plan.status}; ${next})`);
  }

  const selected = changedProjectDirs.length === 1 ? validatePlan(changedProjectDirs[0]) : ready;
  emitGithubOutput({
    project: selected?.plan.project ?? '',
    status: selected?.plan.status ?? '',
    complete: selected?.complete ?? false,
    next_phase: selected?.firstMissing ?? '',
    project_dir: selected ? path.relative(ROOT, selected.projectDir).replaceAll('\\', '/') : '',
    plan_digest: selected?.planDigest ?? '',
  });
}

function cmdListPhases(args) {
  const result = validatePlan(projectFromArgs(args), { requireReady: true });
  for (const record of result.phaseRecords) console.log(record.id);
}

function cmdApply(args) {
  const projectDir = projectFromArgs(args);
  const phaseId = phaseFromArgs(args);
  const result = validatePlan(projectDir, { requireReady: true });
  const record = result.phaseRecords.find(entry => entry.id === phaseId);
  if (!record) die(`Unknown phase '${phaseId}'.`);
  const messages = record.patch.operations.map(operation => applyOperation(operation, ROOT));
  console.log(`GOVERNOR_PHASE_APPLIED: ${phaseId}`);
  messages.forEach(message => console.log(`  ${message}`));
}

function cmdChecks(args) {
  const projectDir = projectFromArgs(args);
  const phaseId = phaseFromArgs(args);
  const result = validatePlan(projectDir, { requireReady: true });
  const record = result.phaseRecords.find(entry => entry.id === phaseId);
  if (!record) die(`Unknown phase '${phaseId}'.`);
  try {
    for (const check of record.patch.checks ?? []) runCheck(check, ROOT);
  } catch (error) {
    die(`Phase '${phaseId}' ${error.message}`);
  }
}

function cmdFinalChecks(args) {
  const result = validatePlan(projectFromArgs(args), { requireReady: true });
  try {
    for (const check of result.plan.finalChecks) runCheck(check, ROOT);
  } catch (error) {
    die(`Final validation ${error.message}`);
  }
}

function cmdFingerprint(args) {
  const result = validatePlan(projectFromArgs(args), { requireReady: true });
  const payload = {
    project: result.plan.project,
    planSha256: result.planDigest,
    patches: Object.fromEntries(result.phaseRecords.map(record => [record.id, record.digest])),
  };
  const chainSha256 = sha256Text(JSON.stringify(payload));
  console.log(JSON.stringify({ ...payload, chainSha256 }, null, 2));
  emitGithubOutput({ chain_sha256: chainSha256 });
}

function cmdHelp() {
  console.log(`Patch Governor\n\nCommands:\n  validate-workspace [--enforce-one-patch-change]\n  validate-project --project-dir <dir> [--require-ready] [--enforce-one-patch-change]\n  list-phases --project-dir <dir>\n  apply --project-dir <dir> --phase <id>\n  checks --project-dir <dir> --phase <id>\n  final-checks --project-dir <dir>\n  fingerprint --project-dir <dir>\n`);
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case 'validate-workspace': cmdValidateWorkspace(args); break;
  case 'validate-project': cmdValidateProject(args); break;
  case 'list-phases': cmdListPhases(args); break;
  case 'apply': cmdApply(args); break;
  case 'checks': cmdChecks(args); break;
  case 'final-checks': cmdFinalChecks(args); break;
  case 'fingerprint': cmdFingerprint(args); break;
  case 'help':
  case '--help':
  case '-h':
  case undefined: cmdHelp(); break;
  default: die(`Unknown command '${command}'. Run with --help.`);
}
