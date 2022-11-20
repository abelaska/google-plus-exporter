const unicodeSubstring = require('unicode-substring');

const shortenText = (text, maxLength = 100, { firstSentence } = {}) => {
  const t = unicodeSubstring(text, 0, maxLength - 3);
  if (t !== text) {
    if (firstSentence) {
      const parts = t.split(/[.?!]+([ \t]+|$)/);
      if (parts.length > 1) {
        const l = parts[0].trim();
        const separator = unicodeSubstring(t, l.length, l.length + 1);
        return `${l}${separator}`;
      }
    }
    const parts = t.split(/[ \t]/);
    if (parts.length > 1) {
      parts.pop();
    }
    return `${parts.join(' ')}...`;
  }
  return text;
};

const extractFirstLineForTitle = message => {
  let msg;
  const line = [];
  let i = 0;
  while (i < message.length) {
    if (message[i][0] === 1) {
      break;
    } else {
      msg = message[i][1];
      if (msg.indexOf('Originally shared by') === -1) {
        line.push(msg);
      } else {
        i += 2;
      }
    }
    i++;
  }
  return line.join('');
};

exports.shortenText = shortenText;
exports.extractFirstLineForTitle = extractFirstLineForTitle;
