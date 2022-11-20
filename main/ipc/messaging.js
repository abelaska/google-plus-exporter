/* eslint-disable import/no-extraneous-dependencies */
const { ipcRenderer } = require('electron');

const toRenderer = (channel, message) => ipcRenderer.send('renderer', { channel, message });

exports.toRenderer = toRenderer;
