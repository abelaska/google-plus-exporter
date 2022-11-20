/* eslint-disable import/no-extraneous-dependencies */
const crypto = require('crypto');
const { join } = require('path');
const slug = require('slug');
const DB = require('better-sqlite3-helper');
const isDev = require('../isDev');
const { unix } = require('./time');
const { userDataDir } = require('./paths');
const { createAccountFeedId, createCollectionFeedId, createCommunityStreamFeedId } = require('./dbHelper');

const dbOpen = () => {
  DB({
    path: join(userDataDir, 'google-plus-exporter.db'),
    memory: false,
    readonly: false,
    fileMustExist: false,
    WAL: true,
    migrate: {
      migrate: process.env.NODE_ENV !== 'test',
      // disable completely by setting `migrate: false`
      force: false, // set to 'last' to automatically reapply the last migration-file
      table: 'migration', // name of the database table that is used to keep track
      migrationsPath: isDev ? join(__dirname, '..', 'migrations') : join(__dirname, 'migrations')
    }
  });

  // console.log('sqlite version', DB().query('select sqlite_version()'));

  process.on('exit', () => DB().close());
  process.on('SIGINT', () => DB().close());
  process.on('SIGHUP', () => DB().close());
  process.on('SIGTERM', () => DB().close());

  // migrations 003-post.sql
  const postTableColumns = DB().query('PRAGMA table_info(post)');
  if (!postTableColumns.find(c => c.name === 'authorId')) {
    DB()
      .prepare('ALTER TABLE post ADD COLUMN authorId TEXT NOT NULL DEFAULT ""')
      .run();
    DB()
      .prepare('CREATE INDEX IF NOT EXISTS idx_post_feedIdisPublicAuthorId ON post(feedId, isPublic, authorId)')
      .run();
  }
  const commentTableColumns = DB().query('PRAGMA table_info(comment)');
  if (!commentTableColumns.find(c => c.name === 'authorId')) {
    DB()
      .prepare('ALTER TABLE comment ADD COLUMN authorId TEXT NOT NULL DEFAULT ""')
      .run();
  }

  // migration: add column feed.downloadedAt
  const feedTableColumns = DB().query('PRAGMA table_info(feed)');
  if (!feedTableColumns.find(c => c.name === 'downloadedAt')) {
    DB()
      .prepare('ALTER TABLE feed ADD COLUMN downloadedAt INTEGER')
      .run();
  }
};

const md5sum = data =>
  crypto
    .createHash('md5')
    .update(data)
    .digest('hex');

const upsert = (tableName, data, keys = ['id']) => {
  const columns = Object.keys(data);
  const sql = `INSERT INTO ${tableName}(${columns.join(',')}) VALUES(${columns
    .map(c => `:${c}`)
    .join(',')}) ON CONFLICT(${keys.join(',')}) DO UPDATE SET ${columns
    .filter(c => keys.indexOf(c) === -1)
    .map(c => `${c}=:${c}`)
    .join(',')} WHERE ${keys.map(c => `${c}=excluded.${c}`).join(' AND ')}`;
  return DB()
    .connection()
    .prepare(sql)
    .run(data);
};

// logger.log(
//   'upsert#1',
//   upsert('googleaccount', {
//     id: '103778702993142591484',
//     name: 'Alois Bělaška',
//     email: 'alois.belaska@gmail.com',
//     image: 'https://lh3.googleusercontent.com/a-/AN66SAz4AzJhEsMt5PvlKU3CQbwk1Oaefev5gpBQjKWaL74=s72-p-k-rw-no-il'
//   })
// );

// logger.log('query', DB().query('SELECT * FROM googleaccount'));
// logger.log('sqlite version', DB().query('select sqlite_version()'));

const dbFindGoogleAccount = id => DB().queryFirstRow('SELECT * FROM googleaccount WHERE id=?', id);

const dbSaveGoogleAccount = ({ id, name, email, image }) => upsert('googleaccount', { id, name, email, image });

const dbSaveAccount = ({ id, name, image, type, googleAccountId }) => {
  upsert('account', { id, name, image, type, googleAccountId });
  upsert('feed', { id: createAccountFeedId(id), accountId: id, type: 'ACCOUNT' });
};

const dbSaveCollection = ({ id, accountId, name, image, type }) => {
  upsert('collection', { id, accountId, name, image, type });
  upsert('feed', { id: createCollectionFeedId(accountId, id), accountId, collectionId: id, type: 'COLLECTION' });
};

const dbSaveCommunity = ({ id, accountId, name, tagline, image, membersCount, membership }) =>
  upsert('community', { id, accountId, name, tagline, image, membersCount, membership });

const dbSaveCommunityStream = ({ id, accountId, communityId, name }) => {
  upsert('communitystream', { id, accountId, communityId, name });
  upsert('feed', {
    id: createCommunityStreamFeedId(accountId, id),
    accountId,
    communityId,
    communityStreamId: id,
    type: 'COMMUNITYSTREAM'
  });
};

const dbSavePosts = ({ feedId, posts }) => {
  const downloadedAt = new Date().toISOString();

  DB().update('feed', { downloadedAt: unix() }, { id: feedId });

  posts.forEach(p => {
    const { comments } = p;
    delete p.comments;
    upsert(
      'post',
      {
        feedId,
        id: p.id,
        downloadedAt,
        createdAt: p.createdAt,
        authorId: p.author.id,
        isPublic: p.isPublic ? 1 : 0,
        commentsCount: 0, // TODO REMOVE
        json: JSON.stringify(p)
      },
      ['id', 'feedId']
    );
    if (comments && comments.length) {
      comments.forEach(c =>
        upsert(
          'comment',
          {
            id: c.id,
            postId: p.id,
            feedId,
            downloadedAt,
            authorId: c.author.id,
            createdAt: c.createdAt,
            json: JSON.stringify(c)
          },
          ['id', 'feedId']
        )
      );
    }
  });
};

const dbFindCommunityStreams = ({ communityId }) =>
  DB().query('SELECT * FROM communitystream WHERE communityId=?', communityId);

const dbCommunityFeedIds = ({ communityId }) =>
  DB().queryColumn('id', 'SELECT id FROM feed WHERE communityId=?', communityId);

const dbFindAccountCollections = ({ accountId }) => DB().query('SELECT * FROM collection WHERE accountId=?', accountId);

const dbFeedPostsCount = ({ feedId, feedIds, isPublic }) =>
  parseInt(
    DB().queryFirstCell(
      `SELECT count(id) FROM post WHERE ${
        feedIds ? `feedId IN (${feedIds.map(i => `'${i}'`).join(',')})` : 'feedId=:feedId'
      }${isPublic === undefined ? '' : ' AND isPublic=:isPublic'}`,
      { feedId, isPublic: isPublic ? 1 : 0 }
    ),
    10
  );

const dbPostsCount = ({ feedId, feedIds }) => {
  const pub = dbFeedPostsCount({ feedId, feedIds, isPublic: 1 });
  const priv = dbFeedPostsCount({ feedId, feedIds, isPublic: 0 });
  const total = pub + priv;
  return {
    total,
    public: pub,
    private: priv
  };
};

const selectUnix = (...params) => {
  const dt = DB().queryColumn(...params);
  return (dt && parseInt(dt, 10)) || 0;
};

const dbListAccountsEnhanced = () =>
  DB()
    .query('SELECT * FROM account ORDER BY name ASC')
    .map(a => ({
      ...a,
      downloadedAt: selectUnix(
        'downloadedAt',
        'SELECT downloadedAt FROM feed WHERE type="ACCOUNT" AND accountId=?',
        a.id
      ),
      totalPostsCount: dbPostsCount({ feedIds: DB().queryColumn('id', 'SELECT id FROM feed WHERE accountId=?', a.id) }),
      postsCount: dbPostsCount({ feedId: createAccountFeedId(a.id) }),
      collections: DB()
        .query('SELECT * FROM collection WHERE accountId=? ORDER BY name ASC', a.id)
        .map(c =>
          Object.assign(c, {
            downloadedAt: selectUnix(
              'downloadedAt',
              'SELECT downloadedAt FROM feed WHERE id=?',
              createCollectionFeedId(a.id, c.id)
            ),
            postsCount: dbPostsCount({ feedId: createCollectionFeedId(a.id, c.id) })
          })
        ),
      communities: DB()
        .query('SELECT * FROM community WHERE accountId=? ORDER BY name ASC', a.id)
        .map(c =>
          Object.assign(c, {
            downloadedAt: selectUnix(
              'downloadedAt',
              'SELECT max(downloadedAt) as downloadedAt FROM feed WHERE accountId=? AND communityId=?',
              a.id,
              c.id
            ),
            postsCount: dbPostsCount({
              feedIds: DB().queryColumn('id', 'SELECT id FROM feed WHERE accountId=? AND communityId=?', a.id, c.id)
            })
          })
        )
    }));

const dbBatchPosts = async (
  { accountId, collectionId, communityId },
  processPostsBatch,
  { batchSize = 5000, exportPrivatePosts = false, exportOnlyPostsCreatedByMe = false } = {}
) => {
  // TODO exportOnlyPostsCreatedByMe
  const exportFeedIds =
    (collectionId &&
      DB().queryColumn('id', 'SELECT id FROM feed WHERE accountId=? AND collectionId=?', accountId, collectionId)) ||
    (communityId &&
      DB().queryColumn('id', 'SELECT id FROM feed WHERE accountId=? AND communityId=?', accountId, communityId)) ||
    (accountId && DB().queryColumn('id', 'SELECT id FROM feed WHERE accountId=? AND type="ACCOUNT"', accountId)) ||
    DB().queryColumn('id', 'SELECT id FROM feed');

  const myIds = exportOnlyPostsCreatedByMe
    ? DB().queryColumn('id', 'SELECT id FROM account WHERE googleAccountId=(SELECT id FROM googleaccount LIMIT 1)')
    : [];

  const postsWhere = `WHERE feedId IN (${exportFeedIds.map(i => `'${i}'`).join(',')})${
    exportPrivatePosts ? '' : ' AND isPublic=1'
  }${exportOnlyPostsCreatedByMe ? ` AND authorId IN (${myIds.map(i => `'${i}'`).join(',')})` : ''}`;

  const totalPostsCount = parseInt(DB().queryFirstCell(`SELECT count(id) FROM post ${postsWhere}`), 10);

  const feeds = exportFeedIds.map(feedId => {
    const feed = DB().queryFirstRow('SELECT * FROM feed WHERE id=?', feedId);
    if (feed.accountId) {
      feed.account = DB().queryFirstRow('SELECT * FROM account WHERE id=?', feed.accountId);
      feed.account.url = `https://plus.google.com/${feed.account.id}`;
    }
    if (feed.collectionId) {
      feed.collection = DB().queryFirstRow('SELECT * FROM collection WHERE id=?', feed.collectionId);
      feed.collection.url = `https://plus.google.com/collection/${feed.collection.id}`;
    }
    if (feed.communityId) {
      feed.community = DB().queryFirstRow('SELECT * FROM community WHERE id=?', feed.communityId);
      feed.community.url = `https://plus.google.com/communities/${feed.community.id}`;
    }
    if (feed.communityStreamId) {
      feed.communityStream = DB().queryFirstRow('SELECT * FROM communitystream WHERE id=?', feed.communityStreamId);
      feed.communityStream.url = `https://plus.google.com/communities/${feed.communityStream.communityId}/stream/${
        feed.communityStream.id
      }`;
    }
    return feed;
  });

  const account = accountId && DB().queryFirstRow('SELECT * FROM account WHERE id=?', accountId);
  const collection = collectionId && DB().queryFirstRow('SELECT * FROM collection WHERE id=?', collectionId);
  const community = communityId && DB().queryFirstRow('SELECT * FROM community WHERE id=?', communityId);

  const type = (collectionId && 'COLLECTION') || (communityId && 'COMMUNITY') || (account && account.type) || 'ALL';

  const { name } = (type === 'COLLECTION' && collection) || (type === 'COMMUNITY' && community) || account || {};
  const description = type === 'ALL' ? 'All Google+ Feeds' : `${name} Google+ ${type.toLowerCase()} feed`;
  const url =
    type === 'ALL'
      ? ''
      : `https://plus.google.com/${(type === 'COLLECTION' && `collection/${collection.id}`) ||
          (type === 'COMMUNITY' && `communities/${community.id}`) ||
          accountId}`;

  const fnId =
    (collectionId && `${accountId}-${collectionId}-${slug(collection.name, { lower: true })}`) ||
    (communityId && `${accountId}-${communityId}-${slug(community.name, { lower: true })}`) ||
    (accountId && `${accountId}-${slug(account.name, { lower: true })}`) ||
    '';
  const fileId = `${fnId ? `${fnId}-` : ''}${type.toLowerCase()}-${new Date()
    .toISOString()

    .split('T')[0]
    .replace(/-/g, '')}`;

  let page;
  let pages;
  let skip = 0;
  let posts = [];
  do {
    posts = DB().query(`SELECT * FROM post ${postsWhere} LIMIT ${batchSize} OFFSET ${skip}`);
    if (posts.length) {
      page = Math.floor(skip / batchSize);
      pages = Math.ceil(totalPostsCount / batchSize);

      posts.forEach(p => {
        p.json = JSON.parse(p.json);
        if (!p.json.comments || !p.json.comments.length) {
          p.json.comments = DB()
            .query(`SELECT json FROM comment WHERE feedId=:feedId AND postId=:postId ORDER BY createdAt ASC`, {
              feedId: p.feedId,
              postId: p.id
            })
            .map(c => JSON.parse(c.json));
        }
      });

      // eslint-disable-next-line
      await processPostsBatch({
        feeds,
        posts,
        page,
        pages,
        name,
        url,
        description,
        totalPostsCount,
        fnId,
        fileId: `${fileId}-${page + 1}of${pages}`
      });
    }
    skip += posts.length;
  } while (posts.length);
};

const dbImagesForDownload = () => DB().query('SELECT * FROM image WHERE state=0');

const dbImages = () => DB().query('SELECT * FROM image');

const dbSaveImage = ({ url, ...other }) => upsert('image', { url, id: md5sum(url), ...other });

const dbImageDownloaded = ({ url }) => DB().update('image', { state: 1 }, { id: md5sum(url) });

const dbVideosForDownload = () => DB().query('SELECT * FROM video WHERE state=0');

const dbVideos = () => DB().query('SELECT * FROM video');

const dbSaveVideo = ({ albumUrl, ...other }) =>
  upsert('video', { albumUrl, id: other.id || md5sum(albumUrl), ...other });

const dbVideoDownloaded = ({ id, url }) => DB().update('video', { state: 1 }, { id: id || md5sum(url) });

const dbShouldCheckImageSize = url =>
  parseInt(DB().queryFirstCell('SELECT size FROM image WHERE id=:id', { id: md5sum(url) }) || '-1', 10) <= 0;

const dbListImages = () => {
  const registered = parseInt(DB().queryFirstCell(`SELECT count(id) FROM image`) || '0', 10);
  const registeredSize = parseInt(DB().queryFirstCell(`SELECT sum(size) FROM image`) || '0', 10);
  const downloaded = parseInt(DB().queryFirstCell(`SELECT count(id) FROM image WHERE state=1`) || '0', 10);
  const downloadedSize = parseInt(DB().queryFirstCell(`SELECT sum(size) FROM image WHERE state=1`) || '0', 10);
  const downloadable = Math.max(0, registered - downloaded);
  const downloadableSize = Math.max(0, registeredSize - downloadedSize);
  return { registered, registeredSize, downloaded, downloadedSize, downloadable, downloadableSize };
};

const dbListVideos = () => {
  const registered = parseInt(DB().queryFirstCell(`SELECT count(id) FROM video`) || '0', 10);
  const registeredSize = parseInt(DB().queryFirstCell(`SELECT sum(size) FROM video`) || '0', 10);
  const downloaded = parseInt(DB().queryFirstCell(`SELECT count(id) FROM video WHERE state=1`) || '0', 10);
  const downloadedSize = parseInt(DB().queryFirstCell(`SELECT sum(size) FROM video WHERE state=1`) || '0', 10);
  const downloadable = Math.max(0, registered - downloaded);
  const downloadableSize = Math.max(0, registeredSize - downloadedSize);
  return { registered, registeredSize, downloaded, downloadedSize, downloadable, downloadableSize };
};

const dbMakeSureCommunityStreamFeedExists = ({ accountId, communityId, streamId, name = 'Unknown' }) => {
  const exists = !!DB().queryFirstCell(
    'SELECT id FROM communitystream WHERE communityId=:communityId AND id=:streamId',
    { communityId, streamId }
  );
  if (exists) {
    return true;
  }
  DB()
    .connection()
    .prepare(
      'INSERT INTO communitystream(id,accountId,communityId,name) VALUES(:streamId,:accountId,:communityId,:name)'
    )
    .run({ accountId, communityId, streamId, name });
  DB()
    .connection()
    .prepare(
      'INSERT INTO feed(id,accountId,communityId,communityStreamId,type) VALUES(:id,:accountId,:communityId,:streamId,"COMMUNITYSTREAM")'
    )
    .run({ accountId, communityId, streamId, id: createCommunityStreamFeedId(accountId, streamId) });
  return false;
};

const dbGoogleAccountsCount = () => parseInt(DB().queryFirstCell('SELECT count(*) FROM googleaccount'), 10);

exports.dbBatchPosts = dbBatchPosts;
exports.dbFindGoogleAccount = dbFindGoogleAccount;
exports.dbSaveGoogleAccount = dbSaveGoogleAccount;
exports.dbSaveAccount = dbSaveAccount;
exports.dbSaveCollection = dbSaveCollection;
exports.dbFindAccountCollections = dbFindAccountCollections;
exports.dbSaveCommunity = dbSaveCommunity;
exports.dbSaveCommunityStream = dbSaveCommunityStream;
exports.dbFindCommunityStreams = dbFindCommunityStreams;
exports.dbSavePosts = dbSavePosts;
exports.dbFeedPostsCount = dbFeedPostsCount;
exports.dbListAccountsEnhanced = dbListAccountsEnhanced;
exports.dbCommunityFeedIds = dbCommunityFeedIds;
exports.dbSaveImage = dbSaveImage;
exports.dbImagesForDownload = dbImagesForDownload;
exports.dbListImages = dbListImages;
exports.dbShouldCheckImageSize = dbShouldCheckImageSize;
exports.dbImageDownloaded = dbImageDownloaded;
exports.dbImages = dbImages;
exports.dbMakeSureCommunityStreamFeedExists = dbMakeSureCommunityStreamFeedExists;
exports.dbOpen = dbOpen;
exports.dbGoogleAccountsCount = dbGoogleAccountsCount;
exports.dbVideosForDownload = dbVideosForDownload;
exports.dbVideos = dbVideos;
exports.dbSaveVideo = dbSaveVideo;
exports.dbVideoDownloaded = dbVideoDownloaded;
exports.dbListVideos = dbListVideos;
exports.md5sum = md5sum;
