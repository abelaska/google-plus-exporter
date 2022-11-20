const { join } = require('path');
const { writeFile } = require('fs').promises;
const { dbBatchPosts } = require('./db');
const { exportPath } = require('./paths');

module.exports = async (
  { accountId, collectionId, communityId },
  {
    batchSize = 5000,
    exportPrivatePosts = false,
    exportComments = true,
    exportOnlyPostsCreatedByMe = false,
    saveToFile = true
  } = {}
) => {
  const dumps = [];
  const filenames = [];
  let postsCount = 0;

  await dbBatchPosts(
    { accountId, collectionId, communityId },
    async ({ posts, feeds, fileId }) => {
      postsCount += posts.length;

      let feed;
      const accounts = {};
      const filename = join(exportPath(), `g+-feed${fileId ? `-${fileId}` : ''}.json`);

      posts.forEach(post => {
        feed = feeds.find(f => f.id === post.feedId);
        const { collection, community, communityStream, account } = feed;
        const p = post.json;

        if (!exportComments) {
          p.comments = [];
        }

        accounts[account.id] = accounts[account.id] || {
          id: account.id,
          name: account.name,
          image: account.image,
          type: account.type,
          posts: [],
          collections: {},
          communities: {}
        };

        switch (feed.type) {
          case 'ACCOUNT':
            accounts[account.id].posts.push(p);
            break;
          case 'COLLECTION':
            accounts[account.id].collections[collection.id] = accounts[account.id].collections[collection.id] || {
              id: collection.id,
              name: collection.name,
              image: collection.image,
              type: collection.type,
              posts: []
            };
            accounts[account.id].collections[collection.id].posts.push(p);
            break;
          case 'COMMUNITYSTREAM':
            accounts[account.id].communities[community.id] = accounts[account.id].communities[community.id] || {
              id: community.id,
              name: community.name,
              image: community.image,
              tagline: community.tagline,
              membersCount: community.membersCount,
              membership: community.membership,
              categories: {}
            };
            accounts[account.id].communities[community.id].categories[communityStream.id] = accounts[account.id]
              .communities[community.id].categories[communityStream.id] || {
              id: communityStream.id,
              name: communityStream.name,
              posts: []
            };
            accounts[account.id].communities[community.id].categories[communityStream.id].posts.push(p);
            break;
          default:
            // TODO log error
            break;
        }
      });

      const dump = {
        exportedAt: new Date().toISOString(),
        accounts: Object.values(accounts).map(a => {
          a.collections = Object.values(a.collections);
          a.communities = Object.values(a.communities).map(c => {
            c.categories = Object.values(c.categories);
            return c;
          });
          return a;
        })
      };

      filenames.push(filename);

      if (saveToFile) {
        await writeFile(filename, JSON.stringify(dump, null, 2), { encoding: 'utf8' });
      } else {
        dumps.push({ filename, dump });
      }
    },
    { batchSize, exportPrivatePosts, exportOnlyPostsCreatedByMe }
  );

  return { postsCount, dumps, filenames, filename: filenames[0] };
};
