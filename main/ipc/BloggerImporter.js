// based on https://github.com/firekylin/wxr-generator
const xmlbuilder = require('xmlbuilder');
const slug = require('slug');
const { us } = require('./unicode');
// const { fixImageUrl } = require('./image');

const ns = 'ns0';
const blogId = '4441510360404961996';
const blogIdPrefix = `tag:blogger.com,1999:blog-${blogId}`;
const blogUrl = 'https://google-plus-exporter.blogspot.com/';

const formatTime = t => t.toISOString().replace('Z', '+00:00');

const createPostUrl = ({ date, title }) =>
  `${blogUrl}${date.getUTCFullYear()}/${date.getUTCMonth() + 1 < 10 ? '0' : ''}${date.getUTCMonth() + 1}/${slug(
    us(title),
    {
      lower: true
    }
  )}.html`;

class BloggerImporter {
  constructor({ description }) {
    this.xml = xmlbuilder.create(`${ns}:feed`, { encoding: 'UTF-8' }).att(`xmlns:${ns}`, 'http://www.w3.org/2005/Atom');
    this.xml.ele(`${ns}:id`, { type: 'html' }, `${blogIdPrefix}.archive`);
    this.xml.ele(`${ns}:updated`, {}, formatTime(new Date()));
    this.xml.ele(`${ns}:title`, { type: 'html' }, us(description));
    this.xml.ele(
      `${ns}:link`,
      {
        rel: 'http://schemas.google.com/g/2005#feed',
        type: 'application/atom+xml',
        href: `https://www.blogger.com/feeds/${blogId}/archive`
      },
      ''
    );
    this.xml.ele(
      `${ns}:link`,
      {
        rel: 'http://schemas.google.com/g/2005#post',
        type: 'application/atom+xml',
        href: `https://www.blogger.com/feeds/${blogId}/archive`
      },
      ''
    );
    this.xml.ele(
      `${ns}:link`,
      { rel: 'self', type: 'application/atom+xml', href: `https://www.blogger.com/feeds/${blogId}/archive` },
      ''
    );
    this.xml.ele(`${ns}:link`, { rel: 'alternate', type: 'text/html', href: us(blogUrl) }, '');
    this.xml.ele(`${ns}:generator`, {}, 'Blogger');
  }

  addAuthor(node, author = this.author) {
    const authorEl = node.ele(`${ns}:author`);
    authorEl.ele(`${ns}:name`, {}, us(author.name));
    authorEl.ele(`${ns}:email`, {}, us(author.email || 'noreply@blogger.com'));
    if (author.id) {
      authorEl.ele(`${ns}:uri`, {}, `https://plus.google.com/${author.id}`);
    }
    // if (author.image) {
    //   authorEl.ele(
    //     `gd:image`,
    //     {
    //       'xmlns:gd': 'http://schemas.google.com/g/2005',
    //       rel: 'http://schemas.google.com/g/2005#thumbnail',
    //       width: '35',
    //       height: '35',
    //       src: fixImageUrl(author.image, 'user', s35')
    //     },
    //     ''
    //   );
    // }
  }

  // id: string
  // data: Date
  // title: string
  // categories: string[]
  // image: string
  // content: string (HTML)
  // author: { name, email }
  addPost({ url, id, date, categories = [], title, content, commentsCount, author, image }) {
    const entry = this.xml.ele(`${ns}:entry`);
    entry.ele(
      `${ns}:category`,
      { scheme: 'http://schemas.google.com/g/2005#kind', term: 'http://schemas.google.com/blogger/2008/kind#post' },
      ''
    );
    categories.forEach(term =>
      entry.ele(`${ns}:category`, { scheme: 'http://www.blogger.com/atom/ns#', term: us(term) }, '')
    );
    entry.ele(`${ns}:id`, {}, `${blogIdPrefix}.post-${id}`);
    this.addAuthor(entry, author);
    entry.ele(`${ns}:content`, { type: 'html' }, us(content));
    entry.ele(`${ns}:published`, {}, formatTime(date));
    entry.ele(`${ns}:title`, { type: 'html' }, us(title));
    entry.ele(
      `${ns}:link`,
      {
        rel: 'replies',
        type: 'application/atom+xml',
        href: `${blogUrl}feeds/${blogId}/comments/default`,
        title: 'Post Comments'
      },
      ''
    );
    entry.ele(
      `${ns}:link`,
      { rel: 'replies', type: 'text/html', href: `${url}#comment-form`, title: `${commentsCount} Comments` },
      ''
    );
    entry.ele(
      `${ns}:link`,
      {
        rel: 'edit',
        type: 'application/atom+xml',
        href: `https://www.blogger.com/feeds/${blogId}/posts/default/${id}`
      },
      ''
    );
    entry.ele(
      `${ns}:link`,
      {
        rel: 'self',
        type: 'application/atom+xml',
        href: `https://www.blogger.com/feeds/${blogId}/posts/default/${id}`
      },
      ''
    );
    entry.ele(`${ns}:link`, { rel: 'alternate', type: 'text/html', href: us(url), title: us(title) }, '');
    entry.ele(`ns1:link`, { 'xmlns:ns1': 'http://purl.org/syndication/thread/1.0' }, `${commentsCount}`);
  }

  // author: { name, email }
  addComment({ id, postId, postUrl, date, title, message, author }) {
    const entry = this.xml.ele(`${ns}:entry`);
    entry.ele(
      `${ns}:category`,
      { scheme: 'http://schemas.google.com/g/2005#kind', term: 'http://schemas.google.com/blogger/2008/kind#comment' },
      ''
    );
    entry.ele(`${ns}:id`, {}, `${blogIdPrefix}.post-${id}`);
    this.addAuthor(entry, author);
    entry.ele(`${ns}:content`, { type: 'html' }, us(message));
    entry.ele(`${ns}:published`, {}, formatTime(date));
    entry.ele(`${ns}:title`, { type: 'text' }, us(title));
    entry.ele(
      `${ns}:link`,
      {
        rel: 'edit',
        type: 'application/atom+xml',
        href: `https://www.blogger.com/feeds/${blogId}/${postId}/comments/default/${id}`
      },
      ''
    );
    entry.ele(
      `${ns}:link`,
      {
        rel: 'self',
        type: 'application/atom+xml',
        href: `https://www.blogger.com/feeds/${blogId}/${postId}/comments/default/${id}`
      },
      ''
    );
    entry.ele(
      `${ns}:link`,
      {
        rel: 'alternate',
        type: 'text/html',
        href: `${postUrl}?showComment=${new Date().valueOf()}${id}#c${id}`,
        title: ''
      },
      ''
    );

    entry.ele(
      'ns1:in-reply-to',
      {
        'xmlns:ns1': 'http://purl.org/syndication/thread/1.0',
        href: postUrl,
        ref: `${blogIdPrefix}.post-${postId}`,
        source: `https://www.blogger.com/feeds/${blogId}/posts/default/${postId}`,
        type: 'text/html'
      },
      ''
    );
  }

  stringify() {
    return this.xml.end({
      pretty: true,
      indent: '  ',
      newline: '\n'
    });
  }
}

exports.createPostUrl = createPostUrl;
exports.BloggerImporter = BloggerImporter;
