// based on https://github.com/firekylin/wxr-generator
const xmlbuilder = require('xmlbuilder');
const { us } = require('./unicode');

let seq = 1;

const nextId = () => seq++;

const addPostComment = (
  parent,
  { id = nextId(), createdAt, userId, message, authorName = '', authorEmail = '', authorUrl = '' }
) => {
  const comment = parent.ele('wp:comment');
  comment.ele('wp:comment_id', {}, us(id));
  comment.ele(
    'wp:comment_date',
    {},
    createdAt
      .toISOString()
      .replace('T', ' ')
      .replace(/\..*$/, '')
  );
  comment.ele(
    'wp:comment_date_gmt',
    {},
    createdAt
      .toISOString()
      .replace('T', ' ')
      .replace(/\..*$/, '')
  );
  comment.ele('wp:comment_author').cdata(us(authorName));
  comment.ele('wp:comment_author_email', {}, us(authorEmail));
  comment.ele('wp:comment_author_url', {}, us(authorUrl));
  comment.ele('wp:comment_content').cdata(us(message));
  comment.ele('wp:comment_approved', {}, 1);
  comment.ele('wp:comment_type', {}, '');
  comment.ele('wp:comment_parent', {}, 0);
  comment.ele('wp:comment_user_id', {}, userId || 0);
};

class WPImporter {
  constructor({ name, url, description, language = 'en-US', baseSiteUrl = 'http://wordpress.com/', baseBlogUrl }) {
    baseBlogUrl = baseBlogUrl || url;
    this.xml = xmlbuilder
      .create('rss')
      .att('xmlns:excerpt', 'http://wordpress.org/export/1.2/excerpt/')
      .att('xmlns:content', 'http://purl.org/rss/1.0/modules/content/')
      .att('xmlns:wfw', 'http://wellformedweb.org/CommentAPI/')
      .att('xmlns:dc', 'http://purl.org/dc/elements/1.1/')
      .att('xmlns:wp', 'http://wordpress.org/export/1.2/')
      .att('version', '2.0');
    this.channel = this.xml.ele('channel');
    this.channel.ele('title', {}, us(name));
    this.channel.ele('link', {}, us(url));
    this.channel.ele('description', {}, us(description));
    this.channel.ele('language', {}, us(language));
    this.channel.ele('pubDate', {}, new Date().toGMTString());
    this.channel.ele('generator', {}, 'https://googleplusexporter.home.blog/');
    this.channel.ele('wp:base_site_url', {}, us(baseSiteUrl));
    this.channel.ele('wp:base_blog_url', {}, us(baseBlogUrl));
    this.channel.ele('wp:wxr_version', {}, '1.2');
  }

  /**
   * id: post Id, if not provied, random ID will be generated.
   * url: post permalink url.
   * slug: post slug name if it exists.
   * date: post create time.
   * title: post title.
   * author: post author, it equals author's login name.
   * content: post content
   * summary: post summary
   * comment_status: post comment status, default is `open`, it can be `open` or `close`.
   * ping_status: post ping status, default is `open`, it can be `open` or `close`.
   * password: post visit password if it should, default is empty.
   * categories: post categories, it's an array item. Every item should has `slug` and `name` prototype.
   * tags: post tags, it's an array item. Every item should has `slug` and `name` prototype.
   */
  addPost({
    id = nextId(),
    url,
    slug,
    date,
    title,
    author,
    content,
    summary,
    postName,
    commentStatus = 'open',
    pingStatus = 'open',
    status = 'publish',
    type = 'post',
    password = '',
    categories,
    tags,
    comments,
    attachment,
    metas
  }) {
    const post = this.channel.ele('item');
    post.ele('title', {}, us(title));
    post.ele('link', {}, us(url));
    post.ele('pubDate', {}, date.toGMTString());
    post.ele('dc:creator', {}, us(author));
    post.ele('guid', { isPermaLink: !!slug }, us(slug));
    post.ele('description', {}, '');
    post.ele('content:encoded').cdata(us(content));
    post.ele('excerpt:encoded').cdata(us(summary));
    post.ele('wp:post_name', {}, us(postName));
    post.ele('wp:post_id', {}, us(id));
    post.ele(
      'wp:post_date',
      {},
      date
        .toISOString()
        .replace('T', ' ')
        .replace(/\..*$/, '')
    );
    post.ele(
      'wp:post_date_gmt',
      {},
      date
        .toISOString()
        .replace('T', ' ')
        .replace(/\..*$/, '')
    );
    post.ele('wp:comment_status', {}, us(commentStatus));
    post.ele('wp:ping_status', {}, us(pingStatus));
    post.ele('wp:status', {}, us(status));
    post.ele('wp:post_type', {}, us(type));
    post.ele('wp:post_parent', {}, 0);
    post.ele('wp:menu_order', {}, 0);
    post.ele('wp:post_password', {}, us(password));
    post.ele('wp:is_sticky', {}, 0);
    if (Array.isArray(categories)) {
      categories.forEach(cate =>
        post
          .ele('category', {
            domain: 'category',
            nicename: us(cate.slug)
          })
          .cdata(us(cate.name))
      );
    }
    if (Array.isArray(tags)) {
      tags.forEach(tag =>
        post
          .ele('category', {
            domain: 'post_tag',
            nicename: us(tag.slug)
          })
          .cdata(us(tag.name))
      );
    }
    if (Array.isArray(comments)) {
      comments.forEach(comment => addPostComment(post, comment));
    }

    if (Array.isArray(metas)) {
      metas.forEach(meta => {
        const m = post.ele('wp:postmeta');
        m.ele('wp:meta_key', {}, us(meta.key));
        m.ele('wp:meta_value').cdata(us(meta.value));
      });
    }

    if (attachment && attachment.url) {
      post.ele('wp:attachment_url', {}, us(attachment.url));
    }
  }

  addPage(page) {
    page.type = 'page';
    this.addPost(page);
  }

  /**
   * id: user Id
   * username: user login name
   * email: user email
   * display_name: user nickname
   * first_name: user first name
   * last_name: user last name
   */
  addUser({ id = nextId(), username, email, displayName, firstName = '', lastName = '' }) {
    const user = this.channel.ele('wp:author');
    user.ele('wp:author_id', {}, us(id));
    user.ele('wp:author_login', {}, us(username));
    user.ele('wp:author_email', {}, us(email));
    user.ele('wp:author_display_name').cdata(us(displayName || username));
    user.ele('wp:author_first_name').cdata(us(firstName));
    user.ele('wp:author_last_name').cdata(us(lastName));
  }

  /**
   * id: tag Id, if not provied, random ID will be generated.
   * slug: tag slug. Used in URLS, e.g. "js-rocks"
   * name: tag title, e.g. "JS"
   * description: tag description string, default is empty.
   */
  addTag({ id = nextId(), slug, name, description = '' }) {
    const tag = this.channel.ele('wp:tag');
    tag.ele('wp:term_id', {}, us(id));
    tag.ele('wp:tag_slug', {}, us(slug));
    tag.ele('wp:tag_name').cdata(us(name));
    if (description) {
      tag.ele('wp:tag_description').cdata(us(description));
    }
  }

  /**
   * id: category Id. If not provided, random ID will be generated.
   * slug: category slug. Used in URLS, e.g. "js-rocks"
   * name: category title, e.g. "Everything about JS"
   * parent_id: category parent id if it existed.
   * description: category description string, default is empty.
   */
  addCategory({ id = nextId(), slug, name, parentId = 0, description = '' }) {
    const category = this.channel.ele('wp:category');
    category.ele('wp:term_id', {}, us(id));
    category.ele('wp:category_nicename', {}, us(slug));
    category.ele('wp:cat_name').cdata(us(name));
    if (description) {
      category.ele('wp:category_description').cdata(us(description));
    }
    if (parentId) {
      category.ele('wp:category_parent', {}, us(parentId));
    }
  }

  /**
   * id: attachment Id. If not provided, random ID will be generated.
   * url: attachment absolute url.
   * date: attachment create time.
   * file: attachment relative path if it exist.
   * title: attachment title.
   * author: attachment uploader.
   * description: attachment description.
   * post_id: post id relate to the attachment.
   * meta_data: other serialized attach meta data.
   */
  addAttachment({
    id = nextId(),
    url,
    alt,
    date,
    file,
    title,
    author,
    postName,
    summary = '',
    description = '',
    postId,
    commentStatus = 'close',
    pingStatus = 'close',
    metaData
  }) {
    author = author || 'admin';
    commentStatus = commentStatus || 'open';
    pingStatus = pingStatus || 'closed';

    const attach = this.channel.ele('item');
    attach.ele('title', {}, us(title));
    attach.ele('link', {}, us(url));
    attach.ele('guid', { isPermaLink: false }, us(url));
    attach.ele('pubDate', {}, date);
    if (author) {
      attach.ele('dc:creator', {}, us(author));
    }
    attach.ele('description', {}, '');
    attach.ele('content:encoded').cdata(us(description));
    attach.ele('excerpt:encoded').cdata(us(summary));
    attach.ele('wp:post_id', {}, us(id));
    attach.ele(
      'wp:post_date',
      {},
      date
        .toISOString()
        .replace('T', ' ')
        .replace(/\..*$/, '')
    );
    attach.ele(
      'wp:post_date_gmt',
      {},
      date
        .toISOString()
        .replace('T', ' ')
        .replace(/\..*$/, '')
    );
    attach.ele('wp:comment_status', {}, us(commentStatus));
    attach.ele('wp:ping_status', {}, us(pingStatus));
    attach.ele('wp:post_name', {}, us(postName));
    attach.ele('wp:status', {}, 'inherit');
    attach.ele('wp:post_parent', {}, postId || 0);
    attach.ele('wp:menu_order', {}, 0);
    attach.ele('wp:post_type', {}, 'attachment');
    attach.ele('wp:post_password', {}, '');
    attach.ele('wp:is_sticky', {}, 0);
    attach.ele('wp:attachment_url', {}, us(url));
    if (file || metaData || alt) {
      attach.create({
        'wp:postmeta': [
          ...(file
            ? {
                'wp:meta_key': '_wp_attached_file',
                'wp:meta_value': us(file)
              }
            : null),
          ...(metaData
            ? {
                'wp:meta_key': '_wp_attachment_metadata',
                'wp:meta_value': us(metaData)
              }
            : null),
          ...(alt
            ? {
                'wp:meta_key': '_wp_attachment_image_alt',
                'wp:meta_value': us(alt)
              }
            : null)
        ]
      });
    }
  }

  stringify() {
    return this.xml.end({
      pretty: true,
      indent: '  ',
      newline: '\n'
    });
  }
}

exports.nextId = nextId;
exports.WPImporter = WPImporter;
