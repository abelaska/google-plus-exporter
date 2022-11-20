const compareVersions = require('compare-versions');
const os = require('os').platform();
const arch = require('os').arch();
const { request } = require('./request');

const hostUrl = 'https://gplus-exporter.storage.googleapis.com';
const latestUrl = `${hostUrl}/latest.txt`;
const currentVersion = process.env.VERSION || 'dev';

const updateDownloadUrl = version => {
  switch (os) {
    case 'win32':
      return `${hostUrl}/Google%2B%20Exporter-Setup-${version}.exe`;
    case 'darwin':
      return `${hostUrl}/Google%2B%20Exporter-${version}.dmg`;
    case 'linux':
      return arch === 'ia32' || arch === 'x32'
        ? `${hostUrl}/Google%2B%20Exporter-${version}-i386.AppImage`
        : `${hostUrl}/Google%2B%20Exporter-${version}-x86_64.AppImage`;
    default:
      return '';
  }
};

const checkForUpdate = async () => {
  if (currentVersion === 'dev') {
    return { currentVersion, latestVersion: 'dev', isUpdateAvailable: false };
  }
  let latestVersion;
  try {
    latestVersion = (await request({ method: 'GET', url: latestUrl })).replace(/[\s\n]+/, '');
  } catch (e) {
    latestVersion = currentVersion;
  }
  const isUpdateAvailable = compareVersions(currentVersion, latestVersion) === -1;
  const latestDownloadUrl = updateDownloadUrl(latestVersion);
  return { currentVersion, latestVersion, latestDownloadUrl, isUpdateAvailable };
};

exports.checkForUpdate = checkForUpdate;
