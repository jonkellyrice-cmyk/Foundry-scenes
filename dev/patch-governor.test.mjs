import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const governor = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'patch-governor.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'patch-governor-test-'));

function write(rel, content) {
  const target = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function run(...args) {
  return spawnSync(process.execPath, [governor, ...args], {
    cwd: tmp,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_OUTPUT: '' },
  });
}

write('source.txt', 'alpha\nbeta\n');
write('config.json', '{"enabled":false}\n');
write('.governor/projects/demo/plan.json', JSON.stringify({
  schemaVersion: 1,
  project: 'demo',
  title: 'Governor test',
  status: 'ready',
  phases: [
    { order: 1, id: 'foundation', title: 'Foundation', patch: 'patches/001-foundation.patch.json' },
    { order: 2, id: 'configuration', title: 'Configuration', patch: 'patches/002-configuration.patch.json' },
  ],
  finalChecks: [{ name: 'final', run: "test -f created.txt && grep -q gamma source.txt && grep -q true config.json" }],
}, null, 2) + '\n');
write('.governor/projects/demo/patches/001-foundation.patch.json', JSON.stringify({
  schemaVersion: 1,
  id: 'foundation',
  phase: 'foundation',
  summary: 'Exercise write and replace.',
  operations: [
    { op: 'write', path: 'created.txt', content: 'created\n' },
    { op: 'replace', path: 'source.txt', before: 'beta', after: 'gamma', expectedOccurrences: 1 },
  ],
  checks: [{ name: 'phase one', run: 'test -f created.txt && grep -q gamma source.txt' }],
}, null, 2) + '\n');
write('.governor/projects/demo/patches/002-configuration.patch.json', JSON.stringify({
  schemaVersion: 1,
  id: 'configuration',
  phase: 'configuration',
  summary: 'Exercise guarded JSON mutation.',
  operations: [
    { op: 'json-set', path: 'config.json', keyPath: ['enabled'], expected: false, value: true },
  ],
  checks: [{ name: 'phase two', run: 'grep -q true config.json' }],
}, null, 2) + '\n');

let result = run('validate-project', '--project-dir', '.governor/projects/demo', '--require-ready');
assert.equal(result.status, 0, result.stderr);

for (const phase of ['foundation', 'configuration']) {
  result = run('apply', '--project-dir', '.governor/projects/demo', '--phase', phase);
  assert.equal(result.status, 0, result.stderr);
  result = run('checks', '--project-dir', '.governor/projects/demo', '--phase', phase);
  assert.equal(result.status, 0, result.stderr);
}

result = run('final-checks', '--project-dir', '.governor/projects/demo');
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(path.join(tmp, 'source.txt'), 'utf8'), 'alpha\ngamma\n');
assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'config.json'), 'utf8')).enabled, true);

// A second application must fail instead of silently drifting.
result = run('apply', '--project-dir', '.governor/projects/demo', '--phase', 'foundation');
assert.notEqual(result.status, 0);
assert.match(result.stderr, /already exists|precondition failed/);

console.log('Patch Governor self-test passed.');
