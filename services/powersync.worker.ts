import { fileURLToPath } from 'node:url';
import { getPowerSyncExtensionFilename, startPowerSyncWorker } from '@powersync/node/worker.js';

startPowerSyncWorker({
  extensionPath: () => {
    const extension = new URL(
      `./lib/${getPowerSyncExtensionFilename()}`,
      import.meta.resolve('@powersync/node/package.json'),
    );
    // SQLite loads the DLL through the OS, which cannot resolve Electron's virtual ASAR paths.
    // electron-builder's asarUnpack places the library at this physical sibling path.
    return fileURLToPath(extension).replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2');
  },
});
