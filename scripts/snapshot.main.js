const { platform } = require('os');
const childProcess = require('child_process');
const { join } = require('path');
const { renameSync, writeFileSync } = require('fs');

const indexJs = join(__dirname, '..', 'main', 'out', 'index.js');
const mainJs = join(__dirname, '..', 'main', 'out', 'main.js');

renameSync(indexJs, mainJs);

writeFileSync(indexJs, `require('bytenode');require('./main.jsc');`, { encoding: 'utf8' });

console.log(`Creating snapshot for platform... ${platform()}`);

const createSnapshotScriptPath = join(__dirname, 'snapshot-create.main');
const nodeBundledInElectronPath =
  (platform() === 'darwin' &&
    join(__dirname, '..', 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')) ||
  (platform() === 'linux' && join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron')) ||
  (platform() === 'win32' && join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe'));

console.log(`Electron... ${nodeBundledInElectronPath}`);

childProcess.execFileSync(nodeBundledInElectronPath, [createSnapshotScriptPath], {
  stdio: [process.stdin, process.stdout, process.stderr],
  env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: 1 })
});

process.exit(0);
