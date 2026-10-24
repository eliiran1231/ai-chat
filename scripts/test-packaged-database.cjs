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
for (const suite of ['database', 'startup']) {
  const resultPath = path.join(root, 'release', `packaged-${suite}-result-${process.pid}.json`);
  const result = spawnSync(require('electron'), [
    '--disable-gpu', path.join(root, `tests/electron/packaged-${suite}.electron.cjs`), archive, resultPath,
  ], { cwd: root, env, windowsHide: true, timeout: 55_000, encoding: 'utf8' });
  const report = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : null;
  if (result.error || result.status !== 0 || !report?.ok) {
    console.error(report?.error || result.error || result.stderr || `Packaged ${suite} test failed.`);
    process.exitCode = 1;
    break;
  }
  console.log(`Packaged ${suite}: passed.`);
  for (const check of report.checks || []) console.log(`  ${check}`);
  fs.unlinkSync(resultPath);
}
