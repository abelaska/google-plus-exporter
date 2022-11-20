/* eslint-disable import/no-extraneous-dependencies */
const open = require('open');
const bluebird = require('bluebird');
const { remote, ipcRenderer } = require('electron');
const { captureException } = require('../reporting');
const {
  dbOpen,
  dbListAccountsEnhanced,
  dbListImages,
  dbListVideos,
  dbSaveGoogleAccount,
  dbSaveAccount,
  dbSavePosts,
  dbFeedPostsCount,
  dbSaveCollection,
  dbSaveCommunity,
  dbSaveCommunityStream,
  dbMakeSureCommunityStreamFeedExists,
  dbCommunityFeedIds,
  dbGoogleAccountsCount
} = require('./db');
const {
  exportPath,
  imagesPath,
  videosPath,
  createPaths,
  changeImagesPath,
  changeVideosPath,
  changeExportPath,
  imagesKeepFilename,
  videosKeepFilename,
  exportKeepFilename
} = require('./paths');
const { downloadImages, exportImageList } = require('./image');
const { downloadVideos, exportVideoList } = require('./video');
const exportAccountToJson = require('./export-json');
const { exportAccountToWordPress } = require('./export-wp');
const { exportAccountToBlogger } = require('./export-blogger');
const {
  registerGoogleAccount,
  downloadAccount,
  plusRegistry,
  registerPlusAccount,
  registerPlusCommunity,
  refreshVideoDownloadUrl
} = require('./ipcPlus');
const { disableTor, enableTor } = require('./Tor');
const { verifyLicense, activateLicense, currentLicense } = require('./license');
const { checkForUpdate } = require('./autoUpdate');
const { toRenderer } = require('./messaging');
const logger = require('../logger');

// solves Error: self signed certificate in certificate chain
// solves Error: unable to get local issuer certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

createPaths();
dbOpen();

const handleMessage = async message => {
  const { event, data } = message;
  // logger.log(`ipc handleMessage event:${event} message:`, message);
  try {
    if (event === 'plus-registry-register') {
      const s = plusRegistry.register(data);
      // logger.log(`ipc plus-registry-register s:`, s);
      if (s) {
        await registerGoogleAccount(data);
      }
      return s;
    }
    if (event === 'plus-registry-clear') {
      plusRegistry.clear();
      return;
    }

    if (event === 'db-save-collection') {
      return dbSaveCollection(data);
    }
    if (event === 'db-save-account') {
      return dbSaveAccount(data);
    }
    if (event === 'db-google-accounts-count') {
      return dbGoogleAccountsCount();
    }
    if (event === 'db-save-google-account') {
      return dbSaveGoogleAccount(data);
    }
    if (event === 'db-save-community') {
      return dbSaveCommunity(data);
    }
    if (event === 'db-save-community-stream') {
      return dbSaveCommunityStream(data);
    }
    if (event === 'db-save-posts') {
      return dbSavePosts(data);
    }
    if (event === 'db-feed-posts-count') {
      return dbFeedPostsCount(data);
    }
    if (event === 'db-community-feed-ids') {
      return dbCommunityFeedIds(data);
    }
    if (event === 'db-make-sure-community-stream-feed-exists') {
      return dbMakeSureCommunityStreamFeedExists(data);
    }

    if (event === 'enable-tor') {
      return enableTor();
    }

    if (event === 'disable-tor') {
      return disableTor();
    }

    if (event === 'license') {
      return toRenderer('license', { event, ...currentLicense() });
    }

    if (event === 'license-buy') {
      // return remote.shell.openExternal('https://gum.co/jEVTZ');
      return open('https://gum.co/jEVTZ');
    }

    if (event === 'license-to-clipboard') {
      const { license } = message;
      remote.clipboard.writeText(license);
      return toRenderer('license', { event, success: true });
    }

    if (event === 'license-activate') {
      const { license } = message;
      return await activateLicense(license);
    }

    if (event === 'license-verify') {
      return await verifyLicense();
    }

    if (event === 'check-for-update') {
      return toRenderer('app', { event, ...(await checkForUpdate()) });
    }

    if (event === 'open-exports-folder') {
      return remote.shell.showItemInFolder(exportKeepFilename());
    }

    if (event === 'open-images-folder') {
      return remote.shell.showItemInFolder(imagesKeepFilename());
    }

    if (event === 'open-videos-folder') {
      return remote.shell.showItemInFolder(videosKeepFilename());
    }

    if (event === 'change-images-folder') {
      return remote.dialog.showOpenDialog(
        {
          defaultPath: imagesPath(),
          properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
          buttonLabel: 'Confirm Images Download Folder'
        },
        filePaths => {
          const path = filePaths && filePaths[0];
          if (path) {
            changeImagesPath(path);
            toRenderer('app', { event: 'images-folder-changed', path });
          }
        }
      );
    }

    if (event === 'change-videos-folder') {
      return remote.dialog.showOpenDialog(
        {
          defaultPath: videosPath(),
          properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
          buttonLabel: 'Confirm Videos Download Folder'
        },
        filePaths => {
          const path = filePaths && filePaths[0];
          if (path) {
            changeVideosPath(path);
            toRenderer('app', { event: 'videos-folder-changed', path });
          }
        }
      );
    }

    if (event === 'change-export-folder') {
      return remote.dialog.showOpenDialog(
        {
          defaultPath: exportPath(),
          properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
          buttonLabel: 'Confirm Export Folder'
        },
        filePaths => {
          const path = filePaths && filePaths[0];
          if (path) {
            changeExportPath(path);
            toRenderer('app', { event: 'export-folder-changed', path });
          }
        }
      );
    }

    if (event === 'list-downloaded-accounts') {
      const downloadedAccounts = await dbListAccountsEnhanced();
      return toRenderer('download', { event, downloadedAccounts });
    }

    if (event === 'list-images') {
      const images = await dbListImages();
      return toRenderer('download', { event, images });
    }

    if (event === 'list-videos') {
      const videos = await dbListVideos();
      return toRenderer('download', { event, videos });
    }

    if (event === 'download-images') {
      let success = false;
      toRenderer('download', { event: 'begin-images' });
      try {
        success = await downloadImages();
      } finally {
        toRenderer('download', { event: 'end-images', success, images: await dbListImages() });
      }
    }

    if (event === 'download-videos') {
      let success = false;
      toRenderer('download', { event: 'begin-videos' });
      try {
        success = await downloadVideos(refreshVideoDownloadUrl);
      } finally {
        toRenderer('download', { event: 'end-videos', success, videos: await dbListVideos() });
      }
    }

    if (event === 'refresh-all') {
      const filters = [];
      const { postsGT = 0 } = message;
      const downloadedAccounts = await dbListAccountsEnhanced();

      // filter out all feed with at least one downloaded post, list of { profileId, accountId, collectionId, communityId }
      downloadedAccounts.forEach(
        ({ googleAccountId: profileId, id: accountId, postsCount, collections, communities }) => {
          if (postsCount.total > postsGT) {
            filters.push({ profileId, accountId });
          }
          collections.forEach(c => {
            if (c.postsCount.total > postsGT) {
              filters.push({ profileId, accountId, collectionId: c.id });
            }
          });
          communities.forEach(c => {
            if (c.postsCount.total > postsGT) {
              filters.push({ profileId, accountId, communityId: c.id });
            }
          });
        }
      );

      await bluebird.mapSeries(filters, async filter => {
        toRenderer('download', { event: 'begin', ...filter });
        let success;
        let error;
        try {
          success = await downloadAccount(filter);
        } catch (e) {
          success = false;
          error = { message: e.message };
        } finally {
          toRenderer('download', { event: 'end', error, success, ...filter });
        }
      });
    }

    if (event === 'download-account') {
      const { profileId, accountId, collectionId, communityId } = message;
      // const account = plusRegistry.accounts.find(a => a.profile.id === profileId);
      // if (account) {
      let error;
      let success = false;
      toRenderer('download', { event: 'begin', profileId, accountId, collectionId, communityId });
      try {
        success = await downloadAccount({ accountId, collectionId, communityId });
      } catch (e) {
        success = false;
        error = { message: e.message };
      } finally {
        toRenderer('download', { event: 'end', profileId, accountId, collectionId, communityId, error, success });
      }
      // } else {
      //   logger.error(`Account ${profileId} not found`);
      // }
    }

    if (event === 'export-image-list') {
      let result;
      toRenderer('export', { event: 'begin-image-list' });
      try {
        result = await exportImageList();
      } finally {
        const { filename, imagesCount } = result || {};
        let success = !!filename;
        try {
          remote.shell.showItemInFolder(filename);
        } catch (e) {
          success = false;
        }
        toRenderer('export', {
          event: 'end-image-list',
          imagesCount,
          success
        });
      }
    }

    if (event === 'export-video-list') {
      let result;
      toRenderer('export', { event: 'begin-video-list' });
      try {
        result = await exportVideoList();
      } finally {
        const { filename, videosCount } = result || {};
        let success = !!filename;
        try {
          remote.shell.showItemInFolder(filename);
        } catch (e) {
          success = false;
        }
        toRenderer('export', {
          event: 'end-video-list',
          videosCount,
          success
        });
      }
    }

    if (event === 'export-all') {
      let result;
      const { options } = message;
      toRenderer('export', { event: 'begin', exportAll: true });
      try {
        result = await exportAccountToJson({}, options);
      } finally {
        const { filename, postsCount } = result || {};
        let success = !!filename;
        try {
          remote.shell.showItemInFolder(filename);
        } catch (e) {
          success = false;
        }
        toRenderer('export', {
          event: 'end',
          exportAll: true,
          postsCount,
          success
        });
      }
    }

    if (event === 'export-account') {
      let result;
      const { accountId, collectionId, communityId, type, options } = message;
      toRenderer('export', { event: 'begin', type, accountId, collectionId, communityId });
      try {
        switch (type) {
          case 'json':
            result = await exportAccountToJson({ accountId, collectionId, communityId }, options);
            break;
          case 'wordpress-4-import-file':
            result = await exportAccountToWordPress(
              { accountId, collectionId, communityId },
              { ...options, wpVersion: 4 }
            );
            break;
          case 'wordpress-5-import-file':
            result = await exportAccountToWordPress(
              { accountId, collectionId, communityId },
              { ...options, wpVersion: 5 }
            );
            break;
          case 'blogger-import-file':
            result = await exportAccountToBlogger({ accountId, collectionId, communityId }, options);
            break;
          default:
            break;
        }
      } finally {
        const { filename, postsCount } = result || {};
        let success = !!filename;
        try {
          remote.shell.showItemInFolder(filename);
        } catch (e) {
          success = false;
        }
        toRenderer('export', {
          event: 'end',
          type,
          accountId,
          collectionId,
          communityId,
          postsCount,
          success
        });
      }
    }

    if (event === 'add-custom-feed') {
      const { communityId, profileId } = message;
      if (profileId) {
        const { account, notFound } = await registerPlusAccount(profileId);
        // logger.log('notFound', notFound, 'account', account);
        toRenderer('app', { event, notFound, account });
      } else if (communityId) {
        const { community, categories, notFound } = await registerPlusCommunity(communityId);
        // logger.log('notFound', notFound, 'community', community, 'categories', categories);
        toRenderer('app', { event, notFound, community, categories });
      } else {
        toRenderer('app', { event, notFound: true });
      }
    }
  } catch (e) {
    logger.error('IPC message processing failure', e.stack);
    captureException(e);
    toRenderer('app', { event: 'error', error: { message: e.toString() } });
  }
  return message;
};

const run = async (event, data) => handleMessage({ event, data });

exports.handleMessage = handleMessage;
exports.run = run;

// console.log('ipc loaded');

ipcRenderer.on('request', async (event, message) => {
  const { id, func, args } = message;
  // console.log(`ipc request id:${id} func:${func} args:`, args);
  try {
    const response = await exports[func](...args);
    // console.log(`ipc response id:${id}`, response);
    ipcRenderer.send('ipc-response', { id, response });
  } catch (error) {
    ipcRenderer.send('ipc-response', { id, error });
  }
});
