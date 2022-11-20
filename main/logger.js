module.exports = process.env.NODE_ENV === 'test' ? console : require('electron-timber');
