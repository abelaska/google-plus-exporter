module.exports = process.env.NODE_ENV === 'test' ? true : require('electron-is-dev');
