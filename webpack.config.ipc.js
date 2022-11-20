const webpack = require('webpack');
const { join } = require('path');

const PKG = require(join(__dirname, 'package.json')); // eslint-disable-line
const APP_PATH = __dirname;
const APP_SRC_PATH = join(APP_PATH, 'main');

module.exports = {
  mode: 'production',
  cache: false,
  context: APP_PATH,
  entry: [join(APP_SRC_PATH, 'ipc', 'index.js')],
  target: 'electron-main',
  output: {
    path: `${APP_PATH}/main/out`,
    pathinfo: false,
    filename: 'ipc.js'
  },
  node: {
    global: true,
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [
      {
        test: /inject\.js$/,
        use: 'raw-loader'
      },
      {
        test: /\.js$/,
        exclude: /(__tests__|node_modules|out|inject\.js)/,
        include: [APP_SRC_PATH],
        loader: `${__dirname}/webpack.loader`
      }
    ]
  },
  optimization: {
    splitChunks: false,
    minimize: true
  },
  externals: [
    (context, request, callback) => {
      const moduleName = request.split('/')[0];
      // embed these modules
      if (['node-machine-id'].indexOf(moduleName) > -1) {
        return callback();
      }
      // externalize these modules
      const moduleParam = ['@sentry'].indexOf(moduleName) > -1 || !!PKG.dependencies[moduleName] || false;
      if (moduleParam) {
        return callback(null, `commonjs2 ${request}`);
      }
      callback();
    }
  ],
  plugins: [
    new webpack.IgnorePlugin(/\.(css|html|json|md|txt)$/),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(PKG.version)
    })
  ]
};
