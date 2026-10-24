const fs = require('node:fs');

function deadline(action, milliseconds, label) {
  let timer;
  return Promise.race([
    Promise.resolve().then(action),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

// Preserve the original failure even if cleanup or reporting fails. The parent owns temp-file removal.
async function finishSmoke({ app, resultPath, run, cleanup, details = () => ({}), timeoutMs = 40_000, cleanupTimeoutMs = 5_000 }) {
  let originalError;
  const describe = error => error?.stack || String(error);
  const report = extra => fs.writeFileSync(resultPath, JSON.stringify({
    ...details(), ok: !originalError, error: originalError && describe(originalError), ...extra,
  }, null, 2));
  const watchdog = setTimeout(() => {
    try { report({ ok: false, error: describe(originalError || new Error('Smoke-test watchdog expired')) }); }
    finally { app.exit(2); }
  }, timeoutMs);
  try {
    try { await deadline(run, timeoutMs - 10_000, 'Smoke-test execution'); }
    catch (error) { originalError = error; }
    // Persist the primary exception before attempting cleanup.
    try { report({}); } catch (error) { originalError ||= error; console.error(error); }
    let cleanupError;
    try { await deadline(cleanup, cleanupTimeoutMs, 'Smoke-test cleanup'); }
    catch (error) { cleanupError = describe(error); originalError ||= error; }
    try { report({ cleanupError }); } catch (error) { originalError ||= error; console.error(error); }
  } finally {
    clearTimeout(watchdog);
    app.exit(originalError ? 1 : 0);
  }
}

module.exports = { finishSmoke };
