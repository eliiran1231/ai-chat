const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { finishSmoke } = require('./smoke-lifecycle.cjs');

async function scenario(run, cleanup, inspect) {
  const parent = path.resolve(__dirname, '../../release');
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, 'lifecycle-test-'));
  const resultPath = path.join(directory, 'result.json');
  let exitCode;
  try {
    await finishSmoke({ app: { exit: code => { exitCode = code; } }, resultPath, run, cleanup, cleanupTimeoutMs: 20 });
    inspect(JSON.parse(fs.readFileSync(resultPath, 'utf8')), exitCode);
  } finally {
    assert.equal(path.dirname(directory), parent);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
test('cleanup errors do not overwrite the original test exception', async () => {
  await scenario(() => { throw Error('original failure'); }, () => { throw Error('cleanup failure'); }, (report, code) => {
    assert.equal(code, 1);
    assert.match(report.error, /original failure/);
    assert.match(report.cleanupError, /cleanup failure/);
  });
});
test('cleanup failures turn an otherwise successful run into failure', async () => {
  await scenario(() => {}, () => { throw Error('cleanup failure'); }, (report, code) => {
    assert.equal(code, 1);
    assert.equal(report.ok, false);
  });
});
test('hung cleanup is bounded and preserves the original exception', async () => {
  await scenario(() => { throw Error('original failure'); }, () => new Promise(() => {}), (report, code) => {
    assert.equal(code, 1);
    assert.match(report.error, /original failure/);
    assert.match(report.cleanupError, /timed out/);
  });
});
