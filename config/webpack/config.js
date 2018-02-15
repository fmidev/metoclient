const webpack = require('webpack')
const path = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const PACKAGE = require('../../package.json')
const banner = PACKAGE.name + ' - ' + PACKAGE.version + ' | ' + PACKAGE.author + ' ' + new Date().getFullYear() + ' | ' + PACKAGE.license + ' | ' + PACKAGE.homepage

module.exports = {
  entry: ['babel-polyfill', path.resolve(__dirname, '../../src/MetOClient.js')],
  output: {
    library: ['fi', 'fmi', 'metoclient'],
    libraryTarget: 'umd',
    filename: './dist/metoclient' + process.env.METOCLIENT_OUTPUT_POSTFIX + '.min.js'
  },
  externals: {
    'jquery': 'jQuery'
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
      exclude: [
        ((process.env.METOCLIENT_GLOBAL_EXPORT !== undefined) && (process.env.METOCLIENT_GLOBAL_EXPORT)) ? 'null' : path.join(__dirname, '../../src/config')
      ]
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
    new ExtractTextPlugin('style.css'),
    new CopyWebpackPlugin([
      {from: 'img', to: 'dist/img', force: true},
      {from: 'css', to: 'dist/css', force: true}
    ]),
    new LicenseWebpackPlugin({
      pattern: /.*/,
      licenseFilenames: [ // list of filenames to search for in each package
        'LICENSE',
        'LICENSE.md',
        'LICENSE.txt',
        'license',
        'license.md',
        'license.txt'
      ],
      perChunkOutput: true, // whether or not to generate output for each chunk, for just create one file with all the licenses combined
      // outputTemplate: 'output.template.ejs', // ejs template for rendering the licenses. The default one is contained in the license-webpack-plugin directory under node_modules
      outputFilename: 'metoclient.licenses.txt', // output name. [name] refers to the chunk name here. Any properties of the chunk can be used here, such as [hash]. If perChunkOutput is false, the default value is 'licenses.txt'
      suppressErrors: false, // suppress error messages
      includePackagesWithoutLicense: false, // whether or not to include packages that are missing a license
      unacceptablePattern: undefined, // regex of unacceptable licenses
      abortOnUnacceptableLicense: true, // whether or not to abort the build if an unacceptable license is detected
      addBanner: false, // whether or not to add a banner to the beginning of all js files in the chunk indicating where the licenses are
      bannerTemplate: // ejs template string of how the banner should appear at the beginning of each js file in the chunk
        '/*! 3rd party license information is available at <%- filename %> */',
      includedChunks: [], // array of chunk names for which license files should be produced
      excludedChunks: [], // array of chunk names for which license files should not be produced. If a chunk is both included and excluded, then it is ultimately excluded.
      additionalPackages: [] // array of additional packages to scan
    }),
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
    })
  ]
}

// Optimize the bundle size
if (process.env.METOCLIENT_SKIP_OL_COLLECTION) {
  module.exports.externals['ol/collection'] = 'olCollection'
}
if (process.env.METOCLIENT_SKIP_OL_CONTROL_ZOOM) {
  module.exports.externals['ol/control/zoom'] = 'OlControlZoom'
}
if (process.env.METOCLIENT_SKIP_OL_FEATURE) {
  module.exports.externals['ol/feature'] = 'OlFeature'
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_GEOJSON) {
  module.exports.externals['ol/format/geojson'] = 'OlFormatGeoJSON'
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_GML) {
  module.exports.externals['ol/format/gml'] = 'OlFormatGML'
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_WFS) {
  module.exports.externals['ol/format/wfs'] = 'OlFormatWFS'
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_WMSCAPABILITIES) {
  module.exports.externals['ol/format/wmscapabilities'] = 'OlFormatWMSCapabilities'
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_WMTSCAPABILITIES) {
  module.exports.externals['ol/format/wmtscapabilities'] = 'OlFormatWMTSCapabilities'
}
if (process.env.METOCLIENT_SKIP_OL_GEOM_POINT) {
  module.exports.externals['ol/geom/point'] = 'OlGeomPoint'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION) {
  module.exports.externals['ol/interaction'] = 'OlInteraction'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DOUBLECLICKZOOM) {
  module.exports.externals['ol/interaction/doubleclickzoom'] = 'OlInteractionDoubleClickZoom'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGPAN) {
  module.exports.externals['ol/interaction/dragpan'] = 'OlInteractionDragPan'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGROTATE) {
  module.exports.externals['ol/interaction/dragrotate'] = 'OlInteractionDragRotate'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGROTATEANDZOOM) {
  module.exports.externals['ol/interaction/dragrotateandzoom'] = 'OlInteractionDragRotateAndZoom'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGZOOM) {
  module.exports.externals['ol/interaction/dragzoom'] = 'OlInteractionDragZoom'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_KEYBOARDPAN) {
  module.exports.externals['ol/interaction/keyboardpan'] = 'OlInteractionKeyboardPan'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_KEYBOARDZOOM) {
  module.exports.externals['ol/interaction/keyboardzoom'] = 'OlInteractionKeyboardZoom'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_MOUSEWHEELZOOM) {
  module.exports.externals['ol/interaction/mousewheelzoom'] = 'OlInteractionMouseWheelZoom'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_PINCHROTATE) {
  module.exports.externals['ol/interaction/pinchrotate'] = 'OlInteractionPinchRotate'
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_PINCHZOOM) {
  module.exports.externals['ol/interaction/pinchzoom'] = 'OlInteractionPinchZoom'
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_GROUP) {
  module.exports.externals['ol/layer/group'] = 'OlLayerGroup'
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_IMAGE) {
  module.exports.externals['ol/layer/image'] = 'OlLayerImage'
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_TILE) {
  module.exports.externals['ol/layer/tile'] = 'OlLayerTile'
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_VECTOR) {
  module.exports.externals['ol/layer/vector'] = 'OlLayerVector'
}
if (process.env.METOCLIENT_SKIP_OL_MAP) {
  module.exports.externals['ol/map'] = 'OlMap'
}
if (process.env.METOCLIENT_SKIP_OL_OBJECT) {
  module.exports.externals['ol/object'] = 'OlObject'
}
if (process.env.METOCLIENT_SKIP_OL_OVERLAY) {
  module.exports.externals['ol/overlay'] = 'OlOverlay'
}
if (process.env.METOCLIENT_SKIP_OL_PROJ) {
  module.exports.externals['ol/proj'] = 'OlProj'
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_IMAGEWMS) {
  module.exports.externals['ol/source/imagewms'] = 'OlSourceImageWMS'
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_OSM) {
  module.exports.externals['ol/source/osm'] = 'OlSourceOSM'
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_STAMEN) {
  module.exports.externals['ol/source/stamen'] = 'OlSourceStamen'
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_TILEWMS) {
  module.exports.externals['ol/source/tilewms'] = 'OlSourceTileWMS'
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_VECTOR) {
  module.exports.externals['ol/source/vector'] = 'OlSourceVector'
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_WMTS) {
  module.exports.externals['ol/source/wmts'] = 'OlSourceWMTS'
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_FILL) {
  module.exports.externals['ol/style/fill'] = 'OlStyleFill'
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_ICON) {
  module.exports.externals['ol/style/icon'] = 'OlStyleIcon'
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_STROKE) {
  module.exports.externals['ol/style/stroke'] = 'OlStyleStroke'
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_STYLE) {
  module.exports.externals['ol/style/style'] = 'OlStyleStyle'
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_TEXT) {
  module.exports.externals['ol/style/text'] = 'OlStyleText'
}
if (process.env.METOCLIENT_SKIP_OL_TILEGRID_TILEGRID) {
  module.exports.externals['ol/tilegrid/tilegrid'] = 'OlTilegridTileGrid'
}
if (process.env.METOCLIENT_SKIP_OL_TILEGRID_WMTS) {
  module.exports.externals['ol/tilegrid/wmts'] = 'OlTilegridWMTS'
}
if (process.env.METOCLIENT_SKIP_OL_VIEW) {
  module.exports.externals['ol/view'] = 'OlView'
}
// Compress for production
if (process.env.NODE_ENV === 'production') {
  module.exports.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      drop_debugger: false
    }
  }))
}
