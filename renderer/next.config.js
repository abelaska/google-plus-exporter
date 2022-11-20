/* eslint-disable import/no-extraneous-dependencies */
const withImages = require('next-images');
const webpack = require('webpack'); // eslint-disable-line
const { join } = require('path');

const PKG = require(join(__dirname, '..', 'package.json')); // eslint-disable-line

module.exports = withImages({
  inlineImageLimit: 256 * 1024,
  exportPathMap: () => ({ '/': { page: '/' } }),
  webpack(config /*, options*/) {
    config.target = 'electron-renderer';
    config.plugins = (config.plugins || []).concat([
      new webpack.DefinePlugin({
        'process.env.VERSION': JSON.stringify(PKG.version)
      })
    ]);
    return config;
  }
});
