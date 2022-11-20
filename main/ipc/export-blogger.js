const { join } = require('path');
const { writeFile } = require('fs').promises;
const { BloggerImporter, createPostUrl } = require('./BloggerImporter');
const { dbBatchPosts } = require('./db');
const { exportPath } = require('./paths');
const { shortenText, extractFirstLineForTitle } = require('./text');
const { fixUrl } = require('./link');

// WP import requires ID to be a number

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

const compileMessage = ({ message, image, images, link }) => {
  let lines = [];
  let line = [];
  let i = 0;
  let l;
  while (i < message.length) {
    l = message[i];
    if (l[0] === 1) {
      if (line.length) {
        line.push('<br />');
        lines.push(line);
      } else {
        lines.push(['<br />']);
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

  lines = lines.map(ll => ll.join(''));

  if (image && image.proxy) {
    lines.unshift(`<img src="${image.proxy}" alt="" /><br />`);
  }

  if (images && images.length) {
    images
      .filter(img => img && img.proxy)
      .forEach(({ proxy }) => {
        lines.push(`<br /><img src="${proxy}" alt="" />`);
      });
  }

  if (link && link.url) {
    const linkUrl = fixUrl(link.url);
    lines.push(
      `<br /><a href="${linkUrl}" class="embedly-card" data-card-recommend="0" data-card-width="100%">${linkUrl}</a><script async src="//cdn.embedly.com/widgets/platform.js" charset="UTF-8"></script>`
    );
  }

  return lines.join('').trim();
};

const splitCommentMessage = ({ message, image, images, link }, maxLen = 4000) => {
  let msg;
  const msgs = [];
  let parts = message.slice(0);
  let remaining = [];
  let comment = { image, images, link };

  while (parts.length) {
    comment.message = parts;
    msg = compileMessage(comment);
    if (shortenText(msg, maxLen) === msg) {
      // not shortened
      msgs.push(comment);
      comment = {};
      parts = remaining;
      remaining = [];
    } else {
      remaining.unshift(parts.pop());
    }
  }

  if (remaining.length) {
    msgs.push({ message: remaining });
  }

  return msgs;
};

const extractMessage = post => compileMessage(post);

const extractTags = post =>
  [post.author.name].concat(
    post.message
      .filter(l => l[0] === 4)
      .map(l => l[1].replace('#', ''))
      .filter(t => ['nq', 'ns', 'plusonly', 'f', 't', 'l'].indexOf(t) === -1) // ignore these hashtags
  );

const enhancePostAuthor = a => ({ ...a, url: `https://plus.google.com/${a.id}` });

const truncateTitle = (title, maxLen = 50) => shortenText(title, maxLen);

const exportAccountToBlogger = async (
  { accountId, collectionId, communityId },
  {
    batchSize = 5000,
    exportPrivatePosts = false,
    exportOnlyPostsCreatedByMe = false,
    exportComments = false,
    saveToFile = true
  } = {}
) => {
  const dumps = [];
  const filenames = [];
  let postsCount = 0;
  let postIdCounter = 0;

  await dbBatchPosts(
    { accountId, collectionId, communityId },
    async ({ posts, feeds, fileId, description }) => {
      postsCount += posts.length;

      const allComments = [];
      const filename = join(exportPath(), `g+-to-blogger-${fileId}.xml`);
      const importer = new BloggerImporter({ description });

      const addPost = ({ categories, post }) => {
        const p = post.json;
        const title = extractPostTitle(p);
        const content = extractMessage(p);
        const tags = extractTags(p);

        const comments = exportComments ? p.comments || [] : [];
        const postId = postIdCounter++;
        const postDate = new Date(p.createdAt);
        const postTitle = title === content || (title && !content) ? '' : title;
        const postUrl = createPostUrl({ date: postDate, title: postTitle });

        importer.addPost({
          id: postId,
          url: postUrl,
          content: content || title,
          title: postTitle,
          date: postDate,
          author: enhancePostAuthor(p.author),
          commentsCount: comments.length,
          categories: (categories || []).concat(tags)
          // url: `https://plus.google.com/${p.publicId.join('/posts/')}`,
        });

        comments.forEach(c => {
          const msgs = splitCommentMessage(c);
          msgs.forEach(cc =>
            allComments.push({
              postId,
              postUrl,
              id: postIdCounter++,
              date: new Date(c.createdAt),
              message: compileMessage(cc),
              title: truncateTitle(extractPostTitle(cc)),
              author: enhancePostAuthor(c.author)
            })
          );
        });
      };

      let feed;

      posts.forEach(post => {
        feed = feeds.find(f => f.id === post.feedId);
        const { collection, community, communityStream, account } = feed;
        switch (feed.type) {
          case 'ACCOUNT':
            addPost({ post, categories: [account.name] });
            break;
          case 'COLLECTION':
            addPost({ post, categories: [collection.name] });
            break;
          case 'COMMUNITYSTREAM':
            addPost({ post, categories: [`${community.name}: ${communityStream.name}`] });
            break;
          default:
            // TODO log error
            break;
        }
      });

      allComments.forEach(c => importer.addComment(c));

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
exports.splitCommentMessage = splitCommentMessage;
exports.exportAccountToBlogger = exportAccountToBlogger;
