import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpack from 'webpack'

const PACKAGE = require('./package.json')
const banner = PACKAGE.name + ' - ' + PACKAGE.version + ' | ' + PACKAGE.author + ' ' + new Date().getFullYear() + ' | ' + PACKAGE.license + ' | ' + PACKAGE.homepage

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const ExtractTextPlugin = require("extract-text-webpack-plugin")
const dirName = (__dirname.includes(process.cwd()) ? process.cwd() : __dirname) + '/node_modules/';
const IS_PROD = (process.env.NODE_ENV === 'production')

export default () => ({
  entry: [
    'webpack-dev-server/client?http://localhost:8080', // webpack dev server host and port
    path.join(__dirname, 'src/index.jsx'), // entry point of app
  ],
  output: {
    library: ['fi', 'fmi', 'metoclient', 'layout'],
    libraryTarget: 'umd',
    path: path.join(__dirname + '/dist'),
    filename: 'layout.js',
  },
  externals: {
    'raphael': 'Raphael',
  },
  plugins: [
    // Ignore all locale files of moment.js
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.DefinePlugin({
      IS_PROD: IS_PROD
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/index.html'
    }),
    new BundleAnalyzerPlugin({
      // Can be `server`, `static` or `disabled`.
      // In `server` mode analyzer will start HTTP server to show bundle report.
      // In `static` mode single HTML file with bundle report will be generated.
      // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
      analyzerMode: (IS_PROD) ? 'static' : 'disabled',
      // Host that will be used in `server` mode to start HTTP server.
      analyzerHost: '127.0.0.1',
      // Port that will be used in `server` mode to start HTTP server.
      analyzerPort: 8888,
      // Path to bundle report file that will be generated in `static` mode.
      // Relative to bundles output directory.
      reportFilename: 'report.html',
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
    // Necessary b/c golden-layout depends on all 3 of these libs via UMD globals
    new webpack.ProvidePlugin({
      React: 'react',
      ReactDOM: 'react-dom',
      $: 'jquery',
      jQuery: 'jquery',
      moment: 'moment-timezone',
      proj4: 'proj4',
      d3: 'd3-timer',
      EventEmitter: 'wolfy-eventemitter',
      ol: 'openlayers'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.BannerPlugin({
      banner: banner,
      raw: false,
      entryOnly: true
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        drop_debugger: false
      }
    }),
    new ExtractTextPlugin("out.txt")
  ],
  module: {
    rules: [
      {
        test: /\.js[tx]?$/,
        loader: 'babel-loader',
        options: {
          babelrc: false, // Tells webpack not to use the .babelrc file
          presets: [
            dirName+'babel-preset-env',
            dirName+'babel-preset-react'
            //dirName+'babel-preset-typescript'
          ]
        }
      },
      {
        test: /\.css$/,
        use: [{
          loader: 'style-loader' // creates style nodes from JS strings
        }, {
          loader: 'css-loader' // translates CSS into CommonJS
        }]
      },
      {
        test: /\.scss$/,
        include: path.join(__dirname, 'style'),
        use: [{
          loader: 'style-loader' // creates style nodes from JS strings
        }, {
          loader: 'css-loader' // translates CSS into CommonJS
        }, {
          loader: 'sass-loader' // compiles Sass to CSS
        }]
      },
      {
        test: /\.(?:png|jpg|svg)$/,
        loader: 'url-loader',
        exclude: /node_modules/,
        include: path.join(__dirname, 'img'),
        query: {
          // Inline images smaller than 10kb as data URIs
          limit: 10000
        }
      },
      {
        // Match woff2 in addition to patterns like .woff?v=1.1.1.
        test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file-loader',
        options: {

          // url-loader sets mimetype if it's passed.
          // Without this it derives it from the file extension
          mimetype: 'application/font-woff',

          // Output below fonts directory
          name: './fonts/[name].[ext]',
        },
      },]
  },
  resolve: {
    extensions: ['.js', '.jst', '.jsx']
  },
  devtool: 'source-map'
});
