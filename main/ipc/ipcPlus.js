/* eslint-disable import/no-extraneous-dependencies */
const { ipcRenderer } = require('electron');
const moment = require('moment');
const bluebird = require('bluebird');
const pick = require('lodash/pick');
const { currentLicense, licenseLimitReached } = require('./license');
const PlusRegistry = require('./PlusRegistry');
const { captureException } = require('../reporting');
const { request } = require('./request');
const { createAccountFeedId, createCollectionFeedId, createCommunityStreamFeedId } = require('./dbHelper');
const {
  dbSaveGoogleAccount,
  dbSaveAccount,
  dbSavePosts,
  dbFeedPostsCount,
  dbSaveCollection,
  dbSaveCommunity,
  dbSaveCommunityStream,
  dbMakeSureCommunityStreamFeedExists,
  dbCommunityFeedIds,
  dbFindCommunityStreams
} = require('./db');
const logger = require('../logger');

const plusRegistry = new PlusRegistry();

const toRenderer = (channel, message) => ipcRenderer.send('renderer', { channel, message });

// { notFound, googleAccountId, account }
const registerPlusAccount = async id => {
  const { account, notFound } = await plusRegistry.accountInfo(id);
  if (notFound) {
    return { notFound };
  }
  const googleAccountId = plusRegistry.defaultActorId;

  dbSaveAccount({ googleAccountId, type: 'PROFILE', ...pick(account, ['id', 'name', 'image']) });

  return { googleAccountId, account };
};

// { notFound, accountId, community, categories }
const registerPlusCommunity = async id => {
  const { community, categories, notFound } = await plusRegistry.communityInfo(id);
  if (notFound || !categories || !categories.length) {
    return { notFound: true };
  }
  const accountId = plusRegistry.defaultActorId;

  dbSaveCommunity({
    id,
    accountId,
    membership: 'UNKNOWN',
    ...pick(community, ['name', 'image', 'membersCount', 'tagline'])
  });

  categories.forEach(c => dbSaveCommunityStream({ ...c, accountId, communityId: community.id }));

  return { accountId, community, categories };
};

const refreshVideoDownloadUrl = async albumUrl => {
  const session = plusRegistry.defaultSession;
  return (session && session.listAlbumItem(albumUrl)) || null;
};

// profile: {id, image, email, name }
// pages: [{id, image, name }]
const registerGoogleAccount = async ({ profile, pages }) => {
  const { id: googleAccountId } = profile;
  // subscribe newsletter
  try {
    await request({
      url: 'https://sendy.loysoft.com/subscribe',
      method: 'POST',
      form: {
        list: 'WbkOYkQfkKIxQedAg5PNDA',
        email: profile.email,
        name: profile.name,
        boolean: true
      },
      timeout: 5000,
      maxAttempts: 2
    });
  } catch (e) {
    captureException(e);
  }

  // logger.log(
  //   'listAlbumItems one video no images',
  //   JSON.stringify(
  //     await plusRegistry.listAlbumItems(
  //       null,
  //       'https://plus.google.com/photos/110549546973986075336/albums/6560496414155557649/6560496414579242594'
  //     ),
  //     null,
  //     2
  //   )
  // );
  // logger.log(
  //   'listAlbumItems more videos and images',
  //   JSON.stringify(
  //     await plusRegistry.listAlbumItems(
  //       null,
  //       'https://plus.google.com/photos/107049823915731374389/album/5900454983530185921'
  //     ),
  //     null,
  //     2
  //   )
  // );
  // logger.log(
  //   'listAlbumItems one videos and images',
  //   JSON.stringify(
  //     await plusRegistry.listAlbumItems(
  //       null,
  //       'https://plus.google.com/photos/112119143166876454114/album/6574454080668731905?authkey=CIvkmZqe0_2ZJA'
  //     ),
  //     null,
  //     2
  //   )
  // );

  // logger.log(
  //   'listAlbumItems',
  //   JSON.stringify(
  //     await plusRegistry.listAlbumItems(
  //       null,
  //       'https://plus.google.com/photos/112119143166876454114/album/6574454080668731905?authkey=CIvkmZqe0_2ZJA'
  //     ),
  //     null,
  //     2
  //   )
  // );
  // logger.log('communityInfo', await plusRegistry.communityInfo('108569270224680870230'));
  // logger.log('communityInfo', await plusRegistry.communityInfo('106294677380036336853'));

  dbSaveGoogleAccount(pick(profile, ['id', 'name', 'email', 'image']));
  dbSaveAccount({ googleAccountId, type: 'PROFILE', ...pick(profile, ['id', 'name', 'image']) });
  pages.forEach(({ id, name, image }) => dbSaveAccount({ id, name, image, googleAccountId, type: 'PAGE' }));

  toRenderer('plus-detection', { event: 'detected', account: { profile, pages } });

  const actorIds = [profile.id].concat(pages.map(({ id }) => id));
  const tm = new Date();

  try {
    return await bluebird.map(
      actorIds,
      async accountId =>
        Promise.all([
          // list and save communities
          bluebird.map(
            (await plusRegistry.listCommunities(accountId)) || [],
            async c =>
              Promise.all([
                dbSaveCommunity({ ...c, accountId }),
                // list and save community streams
                bluebird.map(
                  (await plusRegistry.listCommunityCategories(accountId, c.id)) || [],
                  async s => dbSaveCommunityStream({ ...s, accountId, communityId: c.id }),
                  { concurrency: 2 }
                )
              ]),
            { concurrency: 2 }
          ),
          // list and save collections
          bluebird.map(
            (await plusRegistry.listCollections(accountId)) || [],
            c => dbSaveCollection({ ...c, accountId }),
            { concurrency: 2 }
          )
        ]),
      { concurrency: 2 }
    );
  } finally {
    logger.log(`Google account ${googleAccountId} registered in ${new Date() - tm}ms`);

    toRenderer('plus-detection', { event: 'detected', account: { profile, pages } });
  }
};

// filter: { accountId, collectionId, communityId }
const downloadAccount = async filter => {
  let downloadPhase = 0;
  let downloadPhases = 0;
  let downloadedPosts = 0;
  let downloadedComments = 0;

  // logger.log('downloadAccount filter', filter);

  const { limits } = currentLicense();
  const { postsPerFeed: postsPerFeedLimit } = limits;

  const repostStreamDownloadBegin = (type, stream) => toRenderer('download', { event: 'stream-begin', type, stream });

  const repostStreamDownloadEnd = (type, stream) => toRenderer('download', { event: 'stream-end', type, stream });

  const canFetchMore = ({ feedId, feedIds }) => async () => {
    // check unlimited
    if (postsPerFeedLimit === -1) {
      return true;
    }
    const postsCount = dbFeedPostsCount({ feedId, feedIds });
    const isAnotherFetchAllowed = postsCount < postsPerFeedLimit;
    if (!isAnotherFetchAllowed) {
      licenseLimitReached();
      toRenderer('license', { event: 'license-limit-reached' });
    }
    return isAnotherFetchAllowed;
  };

  const saveAccountPosts = async accountId => {
    const feedId = createAccountFeedId(accountId);
    repostStreamDownloadBegin('ACCOUNT', { accountId });
    try {
      await plusRegistry.fetchAndProcessAccountPosts(
        accountId,
        async posts => {
          if (posts && posts.length) {
            downloadedPosts += posts.length;
            downloadedComments += posts.reduce((r, v) => r + ((v && v.comments && v.comments.length) || 0), 0);
          }
          await toRenderer('download', {
            event: 'update',
            downloadPhase,
            downloadPhases,
            downloadedPosts,
            downloadedComments
          });
          return dbSavePosts({ feedId, posts });
        },
        canFetchMore({ feedId })
      );
    } finally {
      repostStreamDownloadEnd('ACCOUNT', { accountId });
    }
  };

  const saveCollectionPosts = async (accountId, collectionId) => {
    const feedId = createCollectionFeedId(accountId, collectionId);
    repostStreamDownloadBegin('COLLECTION', { accountId, collectionId });
    try {
      await plusRegistry.fetchAndProcessCollectionPosts(
        accountId,
        collectionId,
        async posts => {
          if (posts && posts.length) {
            downloadedPosts += posts.length;
            downloadedComments += posts.reduce((r, v) => r + ((v && v.comments && v.comments.length) || 0), 0);
          }
          await toRenderer('download', {
            event: 'update',
            downloadPhase,
            downloadPhases,
            downloadedPosts,
            downloadedComments
          });
          return dbSavePosts({ feedId, posts });
        },
        canFetchMore({ feedId })
      );
    } finally {
      repostStreamDownloadEnd('COLLECTION', { accountId, collectionId });
    }
  };

  const searchPosts = async ({
    accountId,
    collectionId,
    communityId,
    query,
    feedId,
    feedsId,
    processPosts,
    notifyBeginEnd
  }) => {
    const type = (collectionId && 'COLLECTION') || (communityId && 'COMMUNITY') || 'ACCOUNT';
    if (notifyBeginEnd) {
      repostStreamDownloadBegin(type, { accountId, communityId, collectionId });
    }
    try {
      const postCache = {};
      let totalBatches = 0;
      let scannedBatches = 0;

      const processPostsCaller = async posts => {
        if (posts && posts.length) {
          posts.forEach(p => {
            postCache[p.id] = (postCache[p.id] || 0) + 1;
          });
          downloadedPosts += posts.length;
          downloadedComments += posts.reduce((r, v) => r + ((v && v.comments && v.comments.length) || 0), 0);
        }

        await toRenderer('download', {
          event: 'update',
          percent: Math.ceil((scannedBatches * 100) / totalBatches),
          downloadPhase,
          downloadPhases,
          downloadedPosts,
          downloadedComments
        });

        return processPosts(posts);
      };

      const searchDaysPeriod = 7;
      const searchYears = 14;

      let posts;
      let foundPosts;
      let foundPostsTotal = 0;
      let checkDays = searchYears * 365;
      let daysRange = checkDays;
      let oldestPost = new Date();

      const checkPosts = async rBefore => {
        const { posts: fposts = [] } =
          (await plusRegistry.searchPosts(accountId, `${query} before:${rBefore.format('YYYY-MM-DD')}`)) || {};
        fposts.forEach(p => {
          if (oldestPost.valueOf() > new Date(p.createdAt).valueOf()) {
            oldestPost = new Date(p.createdAt);
          }
        });
        return fposts;
      };

      do {
        posts = await checkPosts(moment.utc().subtract(checkDays, 'days')); // eslint-disable-line
        if (daysRange > 1) {
          daysRange = Math.floor(daysRange / 2);
          if (posts.length) {
            checkDays += daysRange;
          } else {
            checkDays -= daysRange;
          }
        }
      } while (daysRange > 1);

      // logger.log('done oldestPost', oldestPost.toISOString());

      let oBefore = moment.utc();
      let oAfter = oBefore.clone().subtract(searchDaysPeriod, 'days');
      const untilDay = moment.utc(oldestPost).add(1, 'days');
      const canFetchMoreChecker = canFetchMore({ feedId, feedsId });
      const batches = [];

      // create array of day intervals and scan it in parallel
      do {
        batches.push({ before: oBefore.clone(), after: oAfter.clone() });
        oBefore = oBefore.subtract(searchDaysPeriod, 'days');
        oAfter = oAfter.subtract(searchDaysPeriod, 'days');
      } while (untilDay.isBefore(oBefore, 'day') || untilDay.isSame(oBefore, 'day'));

      scannedBatches = 0;
      totalBatches = batches.length;

      await bluebird.map(
        batches,
        async ({ before, after }) => {
          foundPosts = await plusRegistry.searchAndProcessPosts(
            accountId,
            `${query} before:${before.format('YYYY-MM-DD')} after:${after.format('YYYY-MM-DD')}`,
            processPostsCaller,
            canFetchMoreChecker
          );
          scannedBatches++;
          foundPostsTotal += foundPosts;

          // logger.log(
          //   `before:${before.format('YYYY-MM-DD')} after:${after.format(
          //     'YYYY-MM-DD'
          //   )} foundPosts:${foundPosts} foundPostsTotal:${foundPostsTotal} postCache.size:${
          //     Object.keys(postCache).length
          //   } downloadedPosts:${downloadedPosts} downloadedComments:${downloadedComments} untilDay:${untilDay.format(
          //     'YYYY-MM-DD'
          //   )} oldestPost:${oldestPost.toISOString()} scannedBatches:${scannedBatches} totalBatches:${totalBatches} progress:${Math.ceil(
          //     (scannedBatches * 100) / totalBatches
          //   )}`
          // );
        },
        { concurrency: 2 }
      );

      // logger.log(
      //   `DONE foundPosts:${foundPosts} foundPostsTotal:${foundPostsTotal} postCache.size:${
      //     Object.keys(postCache).length
      //   } downloadedPosts:${downloadedPosts} downloadedComments:${downloadedComments} untilDay:${untilDay.format(
      //     'YYYY-MM-DD'
      //   )} oldestPost:${oldestPost.toISOString()} scannedBatches:${scannedBatches} totalBatches:${totalBatches} progress:${Math.ceil(
      //     (scannedBatches * 100) / totalBatches
      //   )}`
      // );
    } finally {
      if (notifyBeginEnd) {
        repostStreamDownloadEnd(type, { accountId, communityId, collectionId });
      }
    }
  };

  const saveCommunityPosts = async (accountId, communityId) => {
    repostStreamDownloadBegin('COMMUNITY', { accountId, communityId });
    try {
      const feedIds = dbCommunityFeedIds({ accountId, communityId });

      downloadPhases = 2;
      downloadPhase = 1;

      await searchPosts({
        accountId,
        communityId,
        feedIds,
        query: `community:${communityId}`,
        processPosts: async posts => {
          const postsGroupedByFeed = {};
          const streams = {};
          posts.forEach(p => {
            const feedId =
              p.community && p.community.stream && createCommunityStreamFeedId(accountId, p.community.stream.id);
            if (feedId) {
              postsGroupedByFeed[feedId] = postsGroupedByFeed[feedId] || [];
              postsGroupedByFeed[feedId].push(p);
              streams[p.community.stream.id] = 1;
            }
          });
          Object.keys(streams).map(streamId =>
            dbMakeSureCommunityStreamFeedExists({ accountId, communityId, streamId })
          );
          // Object.keys(postsGroupedByFeed).map(feedId =>
          //   logger.log('save community feedId', feedId, 'posts', postsGroupedByFeed[feedId].length)
          // );
          return bluebird.map(
            Object.keys(postsGroupedByFeed),
            async feedId => dbSavePosts({ feedId, posts: postsGroupedByFeed[feedId] }),
            { concurrency: 8 }
          );
        }
      });

      // logger.log('timeline feed download');

      downloadPhase = 2;
      downloadedPosts = 0;
      downloadedComments = 0;

      await bluebird.map(
        dbFindCommunityStreams(filter),
        ({ id: streamId }) =>
          plusRegistry.fetchAndProcessCommunityCategoryPosts(
            accountId,
            communityId,
            streamId,
            async posts => {
              if (posts && posts.length) {
                downloadedPosts += posts.length;
                downloadedComments += posts.reduce((r, v) => r + ((v && v.comments && v.comments.length) || 0), 0);
              }
              await toRenderer('download', {
                event: 'update',
                downloadPhase,
                downloadPhases,
                downloadedPosts,
                downloadedComments
              });
              return dbSavePosts({ feedId: createCommunityStreamFeedId(accountId, streamId), posts });
            },
            canFetchMore({ feedIds })
          ),
        { concurrency: 2 }
      );

      // logger.log('timeline feed downloaded downloadedPosts', downloadedPosts, 'downloadedComments', downloadedComments);
    } finally {
      repostStreamDownloadEnd('COMMUNITY', { accountId, communityId });
    }
  };

  const tm = new Date();

  if (filter.accountId && filter.collectionId) {
    await saveCollectionPosts(filter.accountId, filter.collectionId);
  } else if (filter.accountId && filter.communityId) {
    await saveCommunityPosts(filter.accountId, filter.communityId);
  } else {
    await saveAccountPosts(filter.accountId);
  }

  logger.log(`Downloaded in ${new Date() - tm}ms`, filter, 'posts', downloadedPosts, 'comments', downloadedComments);

  return true;
};

exports.plusRegistry = plusRegistry;
exports.registerGoogleAccount = registerGoogleAccount;
exports.downloadAccount = downloadAccount;
exports.registerPlusCommunity = registerPlusCommunity;
exports.registerPlusAccount = registerPlusAccount;
exports.refreshVideoDownloadUrl = refreshVideoDownloadUrl;
