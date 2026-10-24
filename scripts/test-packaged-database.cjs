const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const archive = path.resolve(process.argv[2] || path.join(root, 'release/win-unpacked/resources/app.asar'));
if (!fs.existsSync(archive)) throw new Error('Build the Windows package first: npm run dist:msi');
const runtime = path.join(path.dirname(path.dirname(archive)), 'vcruntime140.dll');
if (!fs.existsSync(runtime)) throw new Error('Packaged VCRUNTIME140.dll is missing next to the app executable.');
const bytes = fs.readFileSync(runtime);
if (bytes.readUInt16LE(bytes.readUInt32LE(0x3c) + 4) !== 0x8664) {
  throw new Error('The packaged VC runtime must be an x64 DLL.');
}
const { ELECTRON_RUN_AS_NODE, ...env } = process.env;
console.log('Packaged-file smoke tests using development Electron (not a clean-machine MSI test).');
for (const suite of ['database', 'startup']) {
  const runDirectory = fs.mkdtempSync(path.join(root, 'release', `packaged-${suite}-`));
  const resultPath = path.join(runDirectory, 'result.json');
  try {
  const result = spawnSync(require('electron'), [
    '--disable-gpu', path.join(root, `tests/electron/packaged-${suite}.electron.cjs`), archive, resultPath,
  ], { cwd: root, env, windowsHide: true, timeout: 55_000, encoding: 'utf8' });
  const report = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : null;
  if (result.error || result.status !== 0 || !report?.ok) {
    console.error(report?.error || result.error || result.stderr || `Packaged ${suite} test failed.`);
    if (report?.cleanupError) console.error('Cleanup also failed:', report.cleanupError);
    process.exitCode = 1;
    break;
  }
  console.log(`Packaged ${suite}: passed.`);
  for (const check of report.checks || []) console.log(`  ${check}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    break;
  } finally {
    // The child has exited, releasing Chromium/SQLite files. Delete only our own run directory.
    if (path.dirname(path.resolve(runDirectory)) !== path.join(root, 'release')) {
      throw new Error('Refusing cleanup outside the test output directory.');
    }
    try {
      fs.rmSync(resultPath, { force: true });
      fs.rmSync(runDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
    catch (error) { console.error('Smoke-test cleanup failed:', error); process.exitCode = 1; }
  }
}
