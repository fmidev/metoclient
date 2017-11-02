const webpack = require('webpack')
const path = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
var CopyWebpackPlugin = require('copy-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const PACKAGE = require('../../package.json')
const banner = PACKAGE.name + ' - ' + PACKAGE.version + ' | ' + PACKAGE.author + ' ' + new Date().getFullYear() + ' | ' + PACKAGE.license + ' | ' + PACKAGE.homepage

module.exports = {
  entry: path.resolve(__dirname, '../../src/MetOClient.js'),
  output: {
    library: ['fi', 'fmi', 'metoclient'],
    libraryTarget: 'umd',
    filename: './dist/metoclient' + process.env.OUTPUT_POSTFIX + '.min.js',
  },
  externals: {
    'jquery': 'jQuery',
    'raphael': 'Raphael',
    'proj4': 'proj4'
  },
  module: {
    rules: [{
      test: /.js$/,
      use: [{
        loader: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            'env'
          ],
          plugins: [
            'webpack-named-dynamic-imports',
            'array-includes'
          ]
        }
      }, {
        loader: 'webpack-conditional-loader'
      }],
      include: path.join(__dirname, '../../src'),
    }, {
      test: /\.css$/,
      use: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: 'css-loader'
      })
    }]
  },
  plugins: [
    // Ignore all locale files of moment.js
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        drop_debugger: false
      }
    }),
    new ExtractTextPlugin('style.css'),
    new CopyWebpackPlugin([
      { from: 'img', to: 'dist/img', force: true },
      { from: 'css', to: 'dist/css', force: true }
    ]),
    new BundleAnalyzerPlugin({
      // Can be `server`, `static` or `disabled`.
      // In `server` mode analyzer will start HTTP server to show bundle report.
      // In `static` mode single HTML file with bundle report will be generated.
      // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
      analyzerMode: 'static',
      // Host that will be used in `server` mode to start HTTP server.
      analyzerHost: '127.0.0.1',
      // Port that will be used in `server` mode to start HTTP server.
      analyzerPort: 8888,
      // Path to bundle report file that will be generated in `static` mode.
      // Relative to bundles output directory.
      reportFilename: './build/webpack/report.html',
      // Module sizes to show in report by default.
      // Should be one of `stat`, `parsed` or `gzip`.
      // See "Definitions" section for more information.
      defaultSizes: 'parsed',
      // Automatically open report in default browser
      openAnalyzer: true,
      // If `true`, Webpack Stats JSON file will be generated in bundles output directory
      generateStatsFile: false,
      // Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
      // Relative to bundles output directory.
      statsFilename: 'stats.json',
      // Options for `stats.toJson()` method.
      // For example you can exclude sources of your modules from stats file with `source: false` option.
      // See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
      statsOptions: null,
      // Log level. Can be 'info', 'warn', 'error' or 'silent'.
      logLevel: 'info'
    }),
    new webpack.BannerPlugin({
      banner: banner,
      raw: false,
      entryOnly: true
    }),
    new webpack.DefinePlugin({})
  ]
}
