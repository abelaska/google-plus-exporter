const urlParser = require('url');

const fixYoutubeUrl = url => {
  // https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare
  const u = urlParser.parse(url, true);
  if (u && u.host && u.host.indexOf('www.youtube.com') === 0 && u.pathname === '/attribution_link' && u.query.u) {
    const uu = urlParser.parse(u.query.u, true);
    u.pathname = uu.pathname;
    u.query = uu.query;
    u.search = '';
    return urlParser.format(u);
  }
  return url;
};

// const urlPatterns = [
// {
//   regex: /youtu\.be\/([\w\-.]+)/,
//   url: '//www.youtube.com/embed/$1'
// },
// {
//   regex: /youtube\.com(.+)v=([^&]+)/,
//   url: '//www.youtube.com/embed/$2'
// },
// {
//   regex: /youtube.com\/embed\/([a-z0-9\-_]+(?:\?.+)?)/i,
//   url: '//www.youtube.com/embed/$1'
// },
// {
//   regex: /vimeo\.com\/([0-9]+)/,
//   url: '//player.vimeo.com/video/$1?title=0&byline=0&portrait=0&color=8dc7dc'
// },
// {
//   regex: /vimeo\.com\/(.*)\/([0-9]+)/,
//   url: '//player.vimeo.com/video/$2?title=0&amp;byline=0'
// },
// {
//   regex: /maps\.google\.([a-z]{2,3})\/maps\/(.+)msid=(.+)/,
//   url: '//maps.google.com/maps/ms?msid=$2&output=embed"'
// },
// {
//   regex: /dailymotion\.com\/video\/([^_]+)/,
//   url: '//www.dailymotion.com/embed/video/$1'
// }
// ];

const fixUrl = url => url && fixYoutubeUrl(url);

const fixLink = link => {
  if (link && link.url) {
    link.url = fixUrl(link.url);
    // urlPatterns.forEach(pattern => {
    //   const match = pattern.regex.exec(link.url);
    //   if (match) {
    //     let url = pattern.url;
    //     for (let i = 0; match[i]; i++) {
    //       url = url.replace(`$${i}`, () => match[i]);
    //     }
    //     link.url = url;
    //   }
    // });
  }
  return link;
};

exports.fixLink = fixLink;
exports.fixUrl = fixUrl;
