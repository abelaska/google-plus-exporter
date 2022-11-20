const { join } = require('path');
const slug = require('slug');
const { writeFile } = require('fs').promises;
const { WPImporter, nextId } = require('./WPImporter');
const { dbBatchPosts } = require('./db');
const { exportPath } = require('./paths');
const { shortenText, extractFirstLineForTitle } = require('./text');
const { fixUrl } = require('./link');

// WP import requires ID to be a number

// https://core.trac.wordpress.org/ticket/45447

const extractPostTitle = post => {
  const title = (
    extractFirstLineForTitle(post.message) ||
    (post.link && (post.link.title || post.link.description || post.link.url)) ||
    'Title'
  )
    .trim()
    .replace(/[,]+$/, '');
  return shortenText(title, 120, { firstSentence: true });
};

const extractTags = post =>
  [{ name: post.author.name, slug: slug(post.author.name, { lower: true }) }].concat(
    post.message
      .filter(l => l[0] === 4)
      .map(l => l[1].replace('#', ''))
      .filter(t => ['nq', 'ns', 'plusonly', 'f', 't', 'l'].indexOf(t) === -1) // ignore these hashtags
      .map(name => ({ name, slug: slug(name, { lower: true }) }))
  );

const compileMessage = ({ message, image, images, link }, { wpVersion = 5 } = {}) => {
  let lines = [];
  let line = [];
  let i = 0;
  let l;
  while (i < message.length) {
    l = message[i];
    if (l[0] === 1) {
      if (line.length) {
        if (wpVersion === 4) {
          line.push('\n');
        }
        lines.push(line);
      } else if (wpVersion === 4) {
        lines.push(['\n']);
      } else {
        lines.push(['']);
      }
      line = [];
    } else {
      switch (l[0]) {
        case 0:
          if (l.length > 2 && l[2]) {
            if (l[2].bold) {
              line.push(`<strong>${l[1]}</strong>`);
            } else if (l[2].italic) {
              line.push(`<em>${l[1]}</em>`);
            } else if (l[2].strikethrough) {
              line.push(`<strike>${l[1]}</strike>`);
            } else {
              line.push(l[1]);
            }
          } else if (l[1] !== '﻿') {
            line.push(l[1]);
          }
          break;
        case 2:
          line.push(`<a href="${l[2]}">${l[1]}</a>`);
          break;
        case 3:
        case 4:
          if (
            l[1] !== '#nq' &&
            l[1] !== '#ns' &&
            l[1] !== '#plusonly' &&
            l[1] !== '#f' &&
            l[1] !== '#t' &&
            l[1] !== '#l'
          ) {
            line.push(l[1]);
          }
          break;
        default:
          break;
      }
    }
    i++;
  }

  if (line.length) {
    lines.push(line);
  }

  lines = lines.map(ll =>
    wpVersion === 4 ? ll.join('') : `<!-- wp:paragraph -->\n<p>${ll.join('')}</p>\n<!-- /wp:paragraph -->\n\n`
  );

  lines = [lines.join('')];

  if (image && image.proxy) {
    if (wpVersion === 4) {
      lines.unshift(`<img src="${image.proxy}" alt="" />\n\n`);
    } else {
      lines.unshift(
        `<!-- wp:image -->\n<figure class="wp-block-image"><img src="${
          image.proxy
        }" alt="" /></figure>\n<!-- /wp:image -->\n\n`
      );
    }
  }

  if (images && images.length) {
    images
      .filter(img => img && img.proxy)
      .forEach(({ proxy }) => {
        if (wpVersion === 4) {
          lines.push(`\n\n<img src="${proxy}" alt="" />`);
        } else {
          lines.push(
            `<!-- wp:image -->\n<figure class="wp-block-image"><img src="${proxy}" alt="" /></figure>\n<!-- /wp:image -->\n\n`
          );
        }
      });
  }

  if (link && link.url) {
    const linkUrl = fixUrl(link.url);
    if (wpVersion === 4) {
      // https://codex.wordpress.org/Embeds
      // https://codex.wordpress.org/Embed_Shortcode
      lines.push(`\n\n[embed]${linkUrl}[/embed]`);
    } else {
      lines.push(
        `<!-- wp:paragraph --><p><a href="${linkUrl}" class="embedly-card" data-card-recommend="0" data-card-width="100%">${linkUrl}</a><script async src="//cdn.embedly.com/widgets/platform.js" charset="UTF-8"></script></p><!-- /wp:paragraph -->`
      );

      // lines.push(`<!-- wp:paragraph --><p><a href="${linkUrl}">${linkUrl}</a></p><!-- /wp:paragraph -->`);

      // https://github.com/WordPress/gutenberg/blob/master/test/integration/full-content/fixtures/core__embed.html
      // https://github.com/WordPress/gutenberg/blob/master/test/integration/full-content/fixtures/core__embed.serialized.html
      // lines.push(
      //   `<!-- wp:core/embed {"url":"${linkUrl}"} -->\n<figure class="wp-block-embed">\n<div class="wp-block-embed__wrapper">\n${linkUrl}\n</div>\n</figure>\n<!-- /wp:core/embed -->\n\n`
      // );
    }
  }

  return lines.join('').trim();
};

const extractMessage = (post, options) => compileMessage(post, options);

const extractUserName = (name = '') => {
  const username = slug(name, { replacement: '' });
  const parts = name
    .split(' ')
    .map(s => s.trim())
    .filter(s => s);
  const firstName = parts.shift();
  const lastName = parts.join(' ');
  return { username, firstName, lastName };
};

const exportAccountToWordPress = async (
  { accountId, collectionId, communityId },
  {
    batchSize = 5000,
    exportPrivatePosts = false,
    exportComments = false,
    exportOnlyPostsCreatedByMe = false,
    saveToFile = true,
    wpVersion = 5
  } = {}
) => {
  const dumps = [];
  const filenames = [];
  let postsCount = 0;

  await dbBatchPosts(
    { accountId, collectionId, communityId },
    async ({ posts, feeds, fileId, name, url, description }) => {
      postsCount += posts.length;

      const filename = join(exportPath(), `g+-to-wp-${fileId}.xml`);

      const allUsers = {};
      const allTags = {};
      const allCategories = {};
      const allAttachments = [];
      const allPosts = [];

      const user = ({ id, name: displayName, email }, field = 'id') => {
        if (!allUsers[id]) {
          const { username, firstName, lastName } = extractUserName(displayName);
          allUsers[id] = { id, email, username, firstName, lastName, displayName };
        }
        return allUsers[id][field];
      };

      // c: { slug, name, parentId}
      const registerCategory = c => {
        const ec = allCategories[c.slug];
        if (ec) {
          return ec;
        }
        allCategories[c.slug] = { ...c, id: nextId() };
        return allCategories[c.slug];
      };

      const addPost = ({ categories, post }) => {
        const p = post.json;
        const title = extractPostTitle(p);
        const content = extractMessage(p, { wpVersion });
        const tags = extractTags(p);
        const postId = nextId();

        const comments = exportComments
          ? (p.comments || []).map(c => ({
              id: nextId(),
              createdAt: new Date(c.createdAt),
              message: compileMessage(c, { wpVersion }),
              authorName: c.author.name,
              authorUrl: `https://plus.google.com/${c.author.id}`
            }))
          : [];

        const attachImage = image => {
          if (!image || !image.proxy) {
            return;
          }
          const thumbnailId = nextId();
          allAttachments.push({
            id: thumbnailId,
            title,
            postId,
            postName: thumbnailId,
            date: new Date(p.createdAt),
            url: image.proxy
          });
        };

        attachImage(p.image);

        if (p.images) {
          p.images.forEach(attachImage);
        }

        allPosts.push({
          tags,
          comments,
          categories,
          id: postId,
          content: content || title,
          title: title === content || (title && !content) ? undefined : title,
          url: `https://plus.google.com/${p.publicId.join('/posts/')}`,
          slug: slug(title),
          summary: title,
          postName: slug(title),
          date: new Date(p.createdAt),
          author: user(p.author, 'username'),
          comment_status: 'open',
          ping_status: 'close'
        });

        tags.forEach(t => {
          allTags[t.slug] = t;
        });
      };

      let cat;
      let feed;

      posts.forEach(post => {
        feed = feeds.find(f => f.id === post.feedId);
        const { collection, community, communityStream, account } = feed;
        switch (feed.type) {
          case 'ACCOUNT':
            addPost({ post, categories: [registerCategory({ slug: slug(account.name), name: account.name })] });
            break;
          case 'COLLECTION':
            addPost({ post, categories: [registerCategory({ slug: slug(collection.name), name: collection.name })] });
            break;
          case 'COMMUNITYSTREAM':
            registerCategory({ slug: slug(community.name), name: community.name });
            addPost({
              post,
              categories: [
                registerCategory({
                  parentId: slug(community.name),
                  slug: slug(`${community.name}: ${communityStream.name}`),
                  name: `${community.name}: ${communityStream.name}`
                })
              ]
            });
            break;
          default:
            // TODO log error
            break;
        }
      });

      const importer = new WPImporter({ name, url, description });

      Object.values(allUsers).forEach(u => importer.addUser(u));
      Object.values(allCategories).forEach(c => importer.addCategory(c));
      Object.values(allTags).forEach(t => {
        t.id = nextId();
        // t.id = hash(t.name);
        importer.addTag(t);
      });

      allPosts.forEach(p => importer.addPost(p));
      allAttachments.forEach(a => importer.addAttachment(a));

      const dump = importer.stringify();

      filenames.push(filename);

      if (saveToFile) {
        await writeFile(filename, dump, { encoding: 'utf8' });
      } else {
        dumps.push({ filename, dump });
      }
    },
    { batchSize, exportPrivatePosts, exportOnlyPostsCreatedByMe }
  );

  return { postsCount, dumps, filenames, filename: filenames[0] };
};

exports.compileMessage = compileMessage;
exports.exportAccountToWordPress = exportAccountToWordPress;
