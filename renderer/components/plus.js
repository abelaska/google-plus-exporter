// https://plus.google.com/communities/108569270224680870230
// https://plus.google.com/b/105750980959577516811/communities/108569270224680870230
// https://plus.google.com/105750980959577516811
// https://plus.google.com/b/105750980959577516811/105750980959577516811

const reCommunity = /https:\/\/plus\.google\.com.*\/communities\/([0-9]+)/m;
const reProfile = /https:\/\/plus\.google\.com(\/b\/[0-9]+)?\/([0-9]+)/m;

const parser = (re, text, index) => {
  const m = text && re.exec(text);
  return (m && m.length > index && m[index]) || null;
};

export const urlToCommunityId = url => parser(reCommunity, url, 1);
export const urlToProfileId = url => parser(reProfile, url, 2);

// const urls = [
//   'https://plus.google.com/communities/108569270224680870230',
//   'https://plus.google.com/b/105750980959577516811/communities/108569270224680870230',
//   'https://plus.google.com/105750980959577516811',
//   'https://plus.google.com/b/105750980959577516811/105750980959577516811'
// ];

// urls.forEach(u => console.log(`urlToCommunityId(${u})`, urlToCommunityId(u)));
// urls.forEach(u => console.log(`urlToProfileId(${u})`, urlToProfileId(u)));
