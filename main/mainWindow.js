/* eslint-disable import/no-extraneous-dependencies */
const { app, BrowserWindow } = require('electron');
const logger = require('./logger');

let mainWindow;

const createMainWindow = async options => {
  mainWindow = new BrowserWindow(options);
  mainWindow.on('close', () => {
    logger.log('Main window close, quiting application...');
    try {
      app.quit();
    } catch (ignore) {
      //
    }
  });
  return mainWindow;
};

const sendToMainWindow = (channel, data) => {
  if (!mainWindow) {
    return;
  }
  try {
    mainWindow.webContents.send(channel, data);
  } catch (e) {
    const isWindowDestroyed = e.toString().indexOf('Object has been destroyed') > -1;
    if (!isWindowDestroyed) {
      console.error('Failed to send event to  the main window', e);
    }
  }
};

const closeMainWindow = () => {
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }
};

exports.createMainWindow = createMainWindow;
exports.sendToMainWindow = sendToMainWindow;
exports.closeMainWindow = closeMainWindow;
exports.getMainWindow = () => mainWindow;
