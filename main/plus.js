/* eslint-disable import/no-extraneous-dependencies */
const url = require('url');
const { join } = require('path');
const { readFileSync } = require('fs');
const { BrowserWindow, ipcMain } = require('electron');
const { captureException } = require('./reporting');
const { sendToMainWindow } = require('./mainWindow');
const { ipc } = require('./ipcProxy');
const logger = require('./logger');
const isDev = require('./isDev');

const fullScanOnStart = true;
const debugPlusWindow = false;
const debugPlusWindowKeepOpen = false;
const maxPlusAccountIdx = 10;
const plusUrl = 'https://plus.google.com/';
const logoutUrl = 'https://accounts.google.com/Logout';
const plusInjectJs = isDev
  ? readFileSync(join(__dirname, 'inject.js'), { encoding: 'utf-8' })
  : require('./out/inject.js'); // eslint-disable-line

let plusWindow;
let plusSignoutWindow;
let plusScanned = [];
let plusLoggedOut = false;
let plusLoginInProgress = false;
let plusDetectionInProgress = false;
let plusMaxAccountIdx = maxPlusAccountIdx;
let plusNextAccountIdx = 0;

const onEndPlusDetection = () => {
  if (plusDetectionInProgress) {
    plusDetectionInProgress = false;

    if (plusWindow && !debugPlusWindow) {
      setTimeout(() => {
        if (plusWindow) {
          plusWindow.destroy();
          plusWindow = null;
        }
      }, 1000);
    }

    sendToMainWindow('plus-detection', { event: 'end' });
  }
};

const onEndPlusLogin = () => {
  if (plusLoginInProgress) {
    plusLoginInProgress = false;
  }
};

let startTries = 0;

const onStartPlusDetection = async isInitial => {
  if (!plusDetectionInProgress) {
    const googleAccountsCount = await ipc.run('db-google-accounts-count');
    if (googleAccountsCount === 0 && startTries++ === 0) {
      sendToMainWindow('plus-detection', { event: 'end' });
      return false;
    }
    onEndPlusLogin();
    plusDetectionInProgress = true;
    sendToMainWindow('plus-detection', { event: 'begin' });
  }
  return true;
};

const onPlusWindowClosed = () => {
  plusWindow = null;
  onEndPlusLogin();
  onEndPlusDetection();
  sendToMainWindow('plus-detection', { event: 'close' });
};

const resetPlusDetection = async () => {
  await ipc.run('plus-registry-clear');

  plusScanned = [];
  plusLoggedOut = false;
  plusMaxAccountIdx = maxPlusAccountIdx;
  plusNextAccountIdx = 0;
  onEndPlusDetection();
};

const onLogout = async () => {
  await resetPlusDetection();
  sendToMainWindow('plus-detection', { event: 'loggedout' });
  plusLoggedOut = true;
};

const openPlusWindow = async (visitUrl, { showIfHidden }) => {
  if (plusWindow) {
    plusWindow.loadURL(visitUrl);
    if (showIfHidden) {
      try {
        plusWindow.show();
      } catch (e) {
        //
      }
      try {
        plusWindow.focus();
      } catch (e) {
        //
      }
    }
    return;
  }

  plusWindow = new BrowserWindow({
    center: true,
    width: 1200,
    height: 800,
    resizable: true,
    acceptFirstMouse: true,
    show: showIfHidden || debugPlusWindow,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowDisplayingInsecureContent: true,
      allowRunningInsecureContent: true
    }
  });
  plusWindow.webContents.setBackgroundThrottling(false);

  if (debugPlusWindow) {
    plusWindow.webContents.openDevTools();
  }

  plusWindow.on('closed', () => onPlusWindowClosed());

  plusWindow.webContents.on('dom-ready', async event => {
    const u = url.parse(plusWindow.webContents.getURL());
    const isPlusGoogleCom = u.host && u.host.toLowerCase() === 'plus.google.com';
    const isPlusCaptcha =
      u.host && u.host.toLowerCase() === 'www.google.com' && u.pathname && u.pathname.toLowerCase() === '/sorry/index';
    if (isPlusGoogleCom && !debugPlusWindow) {
      plusWindow.hide();
    }

    if (isPlusCaptcha) {
      plusWindow.show();
      plusWindow.focus();
    }

    if (isPlusGoogleCom && plusLoggedOut) {
      if (plusWindow) {
        plusWindow.destroy();
        plusWindow = null;
      }
    } else if (isPlusGoogleCom && !plusLoggedOut) {
      const m = u.pathname.match(/\/u\/([0-9]+).*/);
      const accountIdx = (m && m.length >= 2 && parseInt(m[1], 10)) || 0;

      if (plusLoginInProgress) {
        plusScanned = [];
        plusMaxAccountIdx = maxPlusAccountIdx;
      }

      await onStartPlusDetection(false);

      plusWindow.webContents.executeJavaScript(`${plusInjectJs};\n\nstart(${JSON.stringify({ accountIdx })});`);
    }
  });

  plusWindow.webContents.on('will-navigate', async (event, nextUrl) => {
    const u = nextUrl && url.parse(nextUrl);
    const pathname = u.pathname && u.pathname.toLowerCase();
    const isAccountsGoogleCom = u.host && u.host.toLowerCase() === 'accounts.google.com';
    const isMyAccountGoogleCom = u.host && u.host.toLowerCase() === 'myaccount.google.com';
    const isLogout = isAccountsGoogleCom && pathname === '/logout';

    if (isLogout) {
      await onLogout();
    }
    if (((!isAccountsGoogleCom && !isMyAccountGoogleCom) || isLogout) && !debugPlusWindow) {
      plusWindow.hide();
    }
  });
  plusWindow.loadURL(visitUrl);
};

const plusLogout = () => {
  if (plusWindow) {
    plusWindow.close();
    plusWindow = null;
  }

  plusSignoutWindow = new BrowserWindow({
    center: true,
    width: 800,
    height: 700,
    resizable: true,
    acceptFirstMouse: true,
    show: debugPlusWindowKeepOpen,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowDisplayingInsecureContent: true,
      allowRunningInsecureContent: true
    }
  });

  if (debugPlusWindow) {
    plusSignoutWindow.webContents.openDevTools();
  }

  plusSignoutWindow.on('closed', () => {
    plusSignoutWindow = null;
  });

  plusSignoutWindow.webContents.on('will-navigate', async (event, nextUrl) => {
    const u = nextUrl && url.parse(nextUrl);
    const pathname = u.pathname && u.pathname.toLowerCase();
    const isAccountsGoogleCom = u.host && u.host.toLowerCase() === 'accounts.google.com';
    const isLoggedOut = isAccountsGoogleCom && pathname === '/servicelogin';

    if (isLoggedOut) {
      await onLogout();
      plusSignoutWindow.close();
    }
  });

  plusSignoutWindow.loadURL(logoutUrl);

  setTimeout(() => {
    if (plusSignoutWindow) {
      plusSignoutWindow.close();
    }
  }, 30 * 1000);
};

const openPlusDetectWindow = async accountIdx => {
  plusNextAccountIdx = accountIdx;
  return openPlusWindow(`${plusUrl}u/${accountIdx}`, { showIfHidden: debugPlusWindowKeepOpen });
};

const stopPlusDetection = async () => resetPlusDetection();

const restartPlusDetection = async isInitial => {
  await resetPlusDetection(isInitial);
  return (await onStartPlusDetection(isInitial)) ? openPlusDetectWindow(0) : null;
};

const listenPlusDetection = () => {
  ipcMain.on('plus-detection', async (event, data) => {
    try {
      if (data.event === 'initialized' && !data.success) {
        logger.error('Plus initialization failed', {
          error: data.error,
          accountIdx: data.accountIdx
        });
        onEndPlusDetection();
      } else if (data.event === 'initialized' && data.success) {
        const account = {
          pages: data.pages || [],
          profile: data.profile,
          cookie: data.cookie,
          accountIdx: data.accountIdx,
          fsid: data.fsid,
          session: data.session
        };

        // if (plusRegistry.register(account)) {
        //   await registerGoogleAccount({
        //     profile: data.profile,
        //     pages: data.pages || []
        //   });

        //   sendToMainWindow('plus-detection', { event: 'detected', account });
        // }
        await ipc.run('plus-registry-register', account);

        if (plusScanned.indexOf(data.accountIdx) === -1) {
          plusScanned.push(data.accountIdx);
        }

        if (plusDetectionInProgress) {
          const isEndReached = data.accountIdx !== plusNextAccountIdx;
          let nextAccountIdx = isEndReached ? 0 : data.accountIdx + 1;

          if (isEndReached) {
            plusMaxAccountIdx = Math.max(0, plusNextAccountIdx - 1);
          }

          while (plusScanned.indexOf(nextAccountIdx) > -1) {
            nextAccountIdx++;
          }

          if (!fullScanOnStart || nextAccountIdx > plusMaxAccountIdx) {
            onEndPlusDetection();
          } else {
            await openPlusDetectWindow(nextAccountIdx);
          }
        }
      }
    } catch (e) {
      captureException(e);
    }
  });
};

const startPlusDetection = async isInitial => restartPlusDetection(isInitial);

const closePlusWindows = () => {
  if (plusSignoutWindow) {
    plusSignoutWindow.destroy();
    plusSignoutWindow = null;
  }
  if (plusWindow) {
    plusWindow.destroy();
    plusWindow = null;
  }
};

exports.plusUrl = plusUrl;
exports.plusLogout = plusLogout;
// exports.plusRegistry = plusRegistry;
exports.restartPlusDetection = restartPlusDetection;
exports.startPlusDetection = startPlusDetection;
exports.stopPlusDetection = stopPlusDetection;
// exports.downloadAccount = downloadAccount;
exports.listenPlusDetection = listenPlusDetection;
exports.closePlusWindows = closePlusWindows;
