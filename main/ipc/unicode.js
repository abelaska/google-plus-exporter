const reUnsafeChars = /[\0\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;

const unicodeSafe = text => (text && typeof text === 'string' ? text.replace(reUnsafeChars, '') : text);

exports.us = unicodeSafe;
exports.unicodeSafe = unicodeSafe;
