/* eslint-disable import/no-extraneous-dependencies */
const { join } = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const logger = require('./logger');
const isDev = require('./isDev');

let ipcWindow;
let ipcLoadPromise;
let requestIdSeq = 1;
const requests = {};

const createIpcWindow = async () => {
  ipcWindow = new BrowserWindow({
    center: true,
    show: isDev,
    webPreferences: { webSecurity: false, nodeIntegration: true }
  });

  ipcWindow.webContents.setBackgroundThrottling(false);

  if (isDev) {
    ipcWindow.webContents.openDevTools();
  }
  ipcWindow.webContents.executeJavaScript(
    isDev
      ? `require('./ipc');`
      : `
      try {
        require('bytenode');
        require(require('path').join(__dirname, '..', '..', 'app', 'main', 'ipc.jsc'));
        require('electron').ipcRenderer.send('ipc-finish-load');
      } catch(e) {
        require('electron').ipcRenderer.send('ipc-fail-load', e);
      }
  `
  );
  return new Promise((resolve, reject) => {
    if (isDev) {
      ipcWindow.webContents.once('did-finish-load', resolve);
      ipcWindow.webContents.once('did-fail-load', (event, code, msg) => reject(new Error(`(${code}) ${msg}`)));
    } else {
      ipcLoadPromise = { resolve, reject };
    }
    ipcWindow.loadURL(`file:///${join(__dirname, 'preload.html')}`);
  });
};

const startIpc = async () => {
  await createIpcWindow();
};

const stopIpc = () => {
  if (ipcWindow) {
    ipcWindow.destroy();
    ipcWindow = null;
  }
};

ipcMain.on('ipc-finish-load', () => {
  if (ipcLoadPromise) {
    ipcLoadPromise.resolve();
    ipcLoadPromise = null;
  }
});

ipcMain.on('ipc-fail-load', (event, error) => {
  if (ipcLoadPromise) {
    ipcLoadPromise.reject(error);
    ipcLoadPromise = null;
  }
});

ipcMain.on('ipc-response', async (event, message) => {
  const { id, error, response } = message;
  // logger.log(`IPC response ${id} received error:`, error, 'response:', response);
  const promise = requests[id];
  if (!promise) {
    return logger.warn(`IPC request ${id} not found`);
  }
  delete requests[id];
  if (error) {
    return promise.reject(error);
  }
  promise.resolve(response);
});

const rpc = async (func, args) => {
  const id = requestIdSeq++;
  ipcWindow.webContents.send('request', { id, func, args });
  return new Promise((resolve, reject) => {
    requests[id] = { resolve, reject };
  });
  // TODO handle response timeout
};

const run = async (event, data) => rpc('run', [event, data]);
const handleMessage = async message => rpc('handleMessage', [message]);

exports.startIpc = startIpc;
exports.stopIpc = stopIpc;
exports.ipc = { run, handleMessage };
