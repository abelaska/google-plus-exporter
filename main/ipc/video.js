const makeDir = require('make-dir');
const { join } = require('path');
const { createWriteStream, statSync } = require('fs');
const bluebird = require('bluebird');
const mimeTypes = require('mime-types');
const stream = require('stream');
const { promisify } = require('util');
const requestDefault = require('request');
const { request } = require('./request');
const { toRenderer } = require('./messaging');
const { md5sum, dbSaveVideo, dbVideosForDownload, dbVideoDownloaded, dbVideos } = require('./db');
const { exportPath, videosPath, hashToDir } = require('./paths');
const logger = require('../logger');

const urlCache = {};

const pipeline = promisify(stream.pipeline);

const videoMeta = async url => {
  let rsp;
  try {
    rsp = await request({
      method: 'HEAD',
      url: encodeURI(url),
      fullResponse: true,
      timeout: 60 * 1000,
      maxAttempts: 3
    });
  } catch (e) {
    logger.warn(`Failed to get video url "${url}" size`, e);
  }
  let size = 0;
  let ext;
  if (rsp && rsp.statusCode >= 200 && rsp.statusCode < 300) {
    const contentType = rsp.headers['content-type'];
    ext = contentType && mimeTypes.extension(contentType);
    size = parseInt(rsp.headers['content-length'] || '0', 10);
  }
  return { size, ext };
};

const registerVideo = async (albumUrl, downloadUrl) => {
  albumUrl = albumUrl.split('?')[0];

  const id = md5sum(downloadUrl);
  const cacheKey = id;
  if (urlCache[cacheKey]) {
    return urlCache[cacheKey];
  }

  const { size, ext } = await videoMeta(downloadUrl);
  if (size && ext) {
    const video = { id, ext, size, albumUrl, url: downloadUrl };

    urlCache[cacheKey] = video;

    dbSaveVideo(video);
  }
};

const downloadVideoBase = async (url, filename, size) => {
  const tm = new Date();
  try {
    await pipeline(
      requestDefault({
        method: 'GET',
        url: encodeURI(url),
        timeout: 3 * 60 * 1000
      }),
      createWriteStream(filename)
    );
    const fileSize = statSync(filename).size;
    logger.log(`Downloaded video "${url}" in ${new Date() - tm}ms, file size ${fileSize} expected ${size}`);
    return fileSize === size;
  } catch (e) {
    logger.warn(`Failed to download video "${url}" in ${new Date() - tm}ms`, e);
  }
  return false;
};

const downloadVideo = async ({ id, size, url, albumUrl, ext }, refreshVideoDownloadUrl) => {
  let ok = false;
  const tm = new Date();
  const fn = `${id}${ext ? `.${ext}` : ''}`;
  const dir = join(videosPath(), hashToDir(id));
  const ffn = join(dir, fn);

  makeDir.sync(dir);

  try {
    ok = await downloadVideoBase(url, ffn, size);
    if (!ok && refreshVideoDownloadUrl) {
      const videoUrl = await refreshVideoDownloadUrl(albumUrl);
      logger.log(`Refreshing video "${url}" URL, new URL "${videoUrl}"`);
      if (videoUrl) {
        ok = await downloadVideoBase(url, ffn, size);
      }
    }
  } catch (e) {
    logger.warn(`Failed to download video "${url}" in ${new Date() - tm}ms`, e);
  }

  if (ok) {
    dbVideoDownloaded({ id, url });
  }

  return ok;
};

const downloadVideos = async refreshVideoDownloadUrl => {
  const videos = dbVideosForDownload();
  const downloadVideosCount = videos.length;
  const downloadVideosSize = videos.reduce((r, { size }) => r + size, 0);
  let downloadedVideosCount = 0;
  let downloadedVideosSize = 0;

  if (downloadVideosCount) {
    toRenderer('download', {
      event: 'update',
      downloadVideosCount,
      downloadVideosSize,
      downloadedVideosCount,
      downloadedVideosSize
    });

    await bluebird.map(
      videos,
      async video => {
        const ok = await downloadVideo(video, refreshVideoDownloadUrl);

        downloadedVideosCount++;
        downloadedVideosSize += ok ? video.size : 0;

        toRenderer('download', {
          event: 'update',
          downloadVideosCount,
          downloadVideosSize,
          downloadedVideosCount,
          downloadedVideosSize
        });
      },
      { concurrency: 8 }
    );
  }

  return true;
};

const exportVideoList = async () => {
  let ok = false;
  const videos = dbVideos();
  const filename = join(exportPath(), 'google-plus-video-list.csv');
  const ws = createWriteStream(filename, { encoding: 'utf8' });
  try {
    ws.write('"URL";"IsDownloaded";"FileName";"FilePath";"FileSize"\n');
    let fn;
    let ffn;
    let downloaded;
    videos.forEach(({ id, url, ext, state, size }) => {
      fn = `${id}${ext ? `.${ext}` : ''}`;
      ffn = join(videosPath(), hashToDir(id), fn);
      downloaded = state === 1;
      ws.write(
        `"${url}";"${downloaded ? 'yes' : 'no'}";"${downloaded ? fn : ''}";"${downloaded ? ffn : ''}";"${size}"\n`
      );
    });
    ok = true;
  } catch (e) {
    logger.error(`Failed to write to video list file "${filename}"`, e);
  } finally {
    if (ws) {
      try {
        ws.end();
      } catch (e) {
        logger.error(`Failed to close video list file "${filename}"`, e);
      }
    }
  }

  // await new Promise(resolve => setTimeout(resolve, 5000));

  return { filename: ok ? filename : null, videosCount: videos.length };
};

exports.registerVideo = registerVideo;
exports.downloadVideo = downloadVideo;
exports.downloadVideos = downloadVideos;
exports.exportVideoList = exportVideoList;
