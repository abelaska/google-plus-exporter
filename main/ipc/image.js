const makeDir = require('make-dir');
const { join } = require('path');
const { createWriteStream, existsSync } = require('fs');
const { rename } = require('fs').promises;
const bluebird = require('bluebird');
const urlParser = require('url');
const mimeTypes = require('mime-types');
const stream = require('stream');
const { promisify } = require('util');
const requestDefault = require('request');
const { request } = require('./request');
const { toRenderer } = require('./messaging');
const { dbSaveImage, dbImagesForDownload, dbShouldCheckImageSize, dbImageDownloaded, dbImages } = require('./db');
const { exportPath, imagesPath, hashToDir } = require('./paths');
const logger = require('../logger');

const GoogleusercontentHostRegExp = /lh[0-9]*.googleusercontent.com/;
const BlogspotHostRegExp = /[0-9]+.bp.blogspot.com/;
const KnownExtensions = /\.(jpg|jpeg|png|gif)$/i;

const urlCache = {};

const pipeline = promisify(stream.pipeline);

const fixImage = image => {
  if (image && image.indexOf('//') === 0) {
    return `https:${image}`;
  }
  return image;
};

const imageMeta = async url => {
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
    logger.warn(`Failed to get image url "${url}" size`, e);
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

// type: link || user || post || community || collection || album
const fixImageUrl = async (imageUrl, type, sizeOption) => {
  if (!imageUrl) {
    return imageUrl;
  }
  imageUrl = fixImage(imageUrl);
  let parts;
  const size = sizeOption || 's0';

  const cacheKey = `${size}:${imageUrl}`;
  if (urlCache[cacheKey]) {
    return urlCache[cacheKey];
  }

  let canAppendExtension = true;
  const u = urlParser.parse(imageUrl, true);

  if (u.host && (GoogleusercontentHostRegExp.test(u.host) || (u.host && BlogspotHostRegExp.test(u.host)))) {
    parts = (u.pathname || '').split('/');
    switch (parts.length) {
      case 2:
        canAppendExtension = false;
        const p = parts[1].split('='); // eslint-disable-line
        if (p.length === 1) {
          parts[1] = `${parts[1]}=${size}`;
        } else if (p.length === 2) {
          p[1] = size;
          parts[1] = p.join('=');
        }
        break;
      case 3: // 2 & parts[0].toLowerCase() === 'proxy'
        if (['proxy', 'a-'].indexOf(parts[1].toLowerCase()) > -1) {
          canAppendExtension = false;
          const params = parts[2].split('=');
          if (params.length === 2) {
            params[1] = size;
            parts[2] = params.join('=');
          }
        }
        break;
      case 6:
        parts.splice(5, 0, size);
        break;
      case 7:
        parts[5] = size;
        break;
      default:
        break;
    }
    u.pathname = parts.join('/');
    imageUrl = urlParser.format(u);
  }

  if (!KnownExtensions.test(imageUrl.toLowerCase())) {
    if (canAppendExtension) {
      let rsp;
      try {
        rsp = await request({
          method: 'HEAD',
          url: imageUrl,
          fullResponse: true,
          timeout: 30 * 1000,
          maxAttempts: 3
        });
      } catch (e) {
        logger.warn(`Failed to validate image url "${imageUrl}" with a new extension`, e);
      }
      // console.log('0fixImageUrl rsp.statusCode', rsp && rsp.statusCode, 'rsp.headers', rsp && rsp.headers);
      if (rsp && rsp.statusCode >= 200 && rsp.statusCode < 300) {
        const contentType = rsp.headers['content-type'];
        const ext = contentType && mimeTypes.extension(contentType);
        if (ext) {
          let rsp2;
          const newImageUrl = `${imageUrl}.${ext}`;
          try {
            rsp2 = await request({
              method: 'HEAD',
              url: newImageUrl,
              fullResponse: true,
              timeout: 30 * 1000,
              maxAttempts: 3
            });
          } catch (e) {
            console.warn(`Failed to validate image url "${newImageUrl}" with a new extension`, e);
          }
          // console.log('1fixImageUrl rsp.statusCode', rsp2 && rsp2.statusCode, 'rsp.headers', rsp2 && rsp2.headers);
          if (rsp2 && rsp2.statusCode >= 200 && rsp2.statusCode < 300) {
            imageUrl = newImageUrl;
          }
        }
      }
    } else {
      // TODO provide proxy url
    }
  }

  imageUrl = encodeURI(imageUrl);

  // do not register link preview images
  if (['user', 'post', 'community', 'collection', 'album'].indexOf(type) > -1) {
    const image = { url: imageUrl };

    if (dbShouldCheckImageSize(imageUrl)) {
      const meta = await imageMeta(imageUrl);
      image.size = meta.size;
      image.ext = meta.ext;
    }

    dbSaveImage(image);
  }

  urlCache[cacheKey] = imageUrl;

  return imageUrl;
};

const downloadImage = async ({ id, url, ext }) => {
  let ok = false;
  const tm = new Date();
  const fn = `${id}${ext ? `.${ext}` : ''}`;
  const dir = join(imagesPath(), hashToDir(id));
  const ffn = join(dir, fn);
  const ffnOld = join(imagesPath(), fn);

  makeDir.sync(dir);

  // check whether the file exists in old image directory
  if (existsSync(ffnOld)) {
    try {
      await rename(ffnOld, ffn);
      logger.log(`Image "${url}" moved to new location "${ffn}"`);
      ok = true;
    } catch (e) {
      logger.warn(`Failed to move image "${url}" file to new directory "${dir}"`, e);
    }
  } else {
    try {
      await pipeline(
        requestDefault({
          method: 'GET',
          url: encodeURI(url),
          timeout: 3 * 60 * 1000
        }),
        createWriteStream(ffn)
      );
      logger.log(`Downloaded image "${url}" in ${new Date() - tm}ms`);
      ok = true;
    } catch (e) {
      logger.warn(`Failed to download image "${url}" in ${new Date() - tm}ms`, e);
    }
  }

  if (ok) {
    dbImageDownloaded({ url });
  }

  return ok;
};

const downloadImages = async () => {
  const images = dbImagesForDownload();
  const downloadImagesCount = images.length;
  const downloadImagesSize = images.reduce((r, { size }) => r + size, 0);
  let downloadedImagesCount = 0;
  let downloadedImagesSize = 0;

  if (downloadImagesCount) {
    toRenderer('download', {
      event: 'update',
      downloadImagesCount,
      downloadImagesSize,
      downloadedImagesCount,
      downloadedImagesSize
    });

    await bluebird.map(
      images,
      async image => {
        const ok = await downloadImage(image);

        downloadedImagesCount++;
        downloadedImagesSize += ok ? image.size : 0;

        if (downloadedImagesCount % 16 === 0) {
          toRenderer('download', {
            event: 'update',
            downloadImagesCount,
            downloadImagesSize,
            downloadedImagesCount,
            downloadedImagesSize
          });
        }
      },
      { concurrency: 8 }
    );
  }

  return true;
};

const exportImageList = async () => {
  let ok = false;
  const images = dbImages();
  const filename = join(exportPath(), 'google-plus-image-list.csv');
  const ws = createWriteStream(filename, { encoding: 'utf8' });
  try {
    ws.write('"URL";"IsDownloaded";"FileName";"FilePath";"FileSize"\n');
    let fn;
    let ffn;
    let downloaded;
    images.forEach(({ id, url, ext, state, size }) => {
      fn = `${id}${ext ? `.${ext}` : ''}`;
      ffn = join(imagesPath(), hashToDir(id), fn);
      downloaded = state === 1;
      ws.write(
        `"${url}";"${downloaded ? 'yes' : 'no'}";"${downloaded ? fn : ''}";"${downloaded ? ffn : ''}";"${size}"\n`
      );
    });
    ok = true;
  } catch (e) {
    logger.error(`Failed to write to image list file "${filename}"`, e);
  } finally {
    if (ws) {
      try {
        ws.end();
      } catch (e) {
        logger.error(`Failed to close image list file "${filename}"`, e);
      }
    }
  }

  // await new Promise(resolve => setTimeout(resolve, 5000));

  return { filename: ok ? filename : null, imagesCount: images.length };
};

exports.fixImageUrl = fixImageUrl;
exports.downloadImages = downloadImages;
exports.exportImageList = exportImageList;
