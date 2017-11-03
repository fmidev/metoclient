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
    filename: './dist/metoclient' + process.env.METOCLIENT_OUTPUT_POSTFIX + '.min.js',
  },
  externals: {
    'jquery': 'jQuery',
    'raphael': 'Raphael',
    'svg.js': 'SVG',
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
      exclude: process.env.METOCLIENT_GLOBAL_EXPORT ? [] : path.join(__dirname, '../../src/config/globalExport.js')
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
// Optimize the bundle size
if (process.env.METOCLIENT_SKIP_OL_COLLECTION) {
  module.exports.externals['ol/collection'] = '_ol_Collection_';
}
if (process.env.METOCLIENT_SKIP_OL_CONTROL_ZOOM) {
  module.exports.externals['ol/control/zoom'] = '_ol_control_Zoom_';
}
if (process.env.METOCLIENT_SKIP_OL_FEATURE) {
  module.exports.externals['ol/feature'] = '_ol_Feature_';
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_GEOJSON) {
  module.exports.externals['ol/format/geojson'] = '_ol_format_GeoJSON_';
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_GML) {
  module.exports.externals['ol/format/gml'] = '_ol_format_GML_';
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_WFS) {
  module.exports.externals['ol/format/wfs'] = '_ol_format_WFS_';
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_WMSCAPABILITIES) {
  module.exports.externals['ol/format/wmscapabilities'] = '_ol_format_WMSCapabilities_';
}
if (process.env.METOCLIENT_SKIP_OL_FORMAT_WMTSCAPABILITIES) {
  module.exports.externals['ol/format/wmtscapabilities'] = '_ol_format_WMTSCapabilities_';
}
if (process.env.METOCLIENT_SKIP_OL_GEOM_POINT) {
  module.exports.externals['ol/geom/point'] = '_ol_geom_Point_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION) {
  module.exports.externals['ol/interaction'] = '_ol_Interaction_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DOUBLECLICKZOOM) {
  module.exports.externals['ol/interaction/doubleclickzoom'] = '_ol_interaction_DoubleClickZoom_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGPAN) {
  module.exports.externals['ol/interaction/dragpan'] = '_ol_interaction_DragPan_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGROTATE) {
  module.exports.externals['ol/interaction/dragrotate'] = '_ol_interaction_DragRotate_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGROTATEANDZOOM) {
  module.exports.externals['ol/interaction/dragrotateandzoom'] = '_ol_interaction_DragRotateAndZoom_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_DRAGZOOM) {
  module.exports.externals['ol/interaction/dragzoom'] = '_ol_interaction_DragZoom_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_KEYBOARDPAN) {
  module.exports.externals['ol/interaction/keyboardpan'] = '_ol_interaction_KeyboardPan_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_KEYBOARDZOOM) {
  module.exports.externals['ol/interaction/keyboardzoom'] = '_ol_interaction_KeyboardZoom_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_MOUSEWHEELZOOM) {
  module.exports.externals['ol/interaction/mousewheelzoom'] = '_ol_interaction_MouseWheelZoom_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_PINCHROTATE) {
  module.exports.externals['ol/interaction/pinchrotate'] = '_ol_interaction_PinchRotate_';
}
if (process.env.METOCLIENT_SKIP_OL_INTERACTION_PINCHZOOM) {
  module.exports.externals['ol/interaction/pinchzoom'] = '_ol_interaction_PinchZoom_';
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_GROUP) {
  module.exports.externals['ol/layer/group'] = '_ol_layer_Group_';
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_IMAGE) {
  module.exports.externals['ol/layer/image'] = '_ol_layer_Image_';
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_TILE) {
  module.exports.externals['ol/layer/tile'] = '_ol_layer_Tile_';
}
if (process.env.METOCLIENT_SKIP_OL_LAYER_VECTOR) {
  module.exports.externals['ol/layer/vector'] = '_ol_layer_Vector_';
}
if (process.env.METOCLIENT_SKIP_OL_MAP) {
  module.exports.externals['ol/map'] = '_ol_Map_';
}
if (process.env.METOCLIENT_SKIP_OL_OBJECT) {
  module.exports.externals['ol/object'] = '_ol_Object_';
}
if (process.env.METOCLIENT_SKIP_OL_OVERLAY) {
  module.exports.externals['ol/overlay'] = '_ol_Overlay_';
}
if (process.env.METOCLIENT_SKIP_OL_PROJ) {
  module.exports.externals['ol/proj'] = '_ol_Proj_';
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_IMAGEWMS) {
  module.exports.externals['ol/source/imagewms'] = '_ol_source_ImageWMS_';
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_OSM) {
  module.exports.externals['ol/source/osm'] = '_ol_source_OSM_';
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_STAMEN) {
  module.exports.externals['ol/source/stamen'] = '_ol_source_Stamen_';
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_TILEWMS) {
  module.exports.externals['ol/source/tilewms'] = '_ol_source_TileWMS_';
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_VECTOR) {
  module.exports.externals['ol/source/vector'] = '_ol_source_Vector_';
}
if (process.env.METOCLIENT_SKIP_OL_SOURCE_WMTS) {
  module.exports.externals['ol/source/wmts'] = '_ol_source_WMTS_';
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_FILL) {
  module.exports.externals['ol/style/fill'] = '_ol_style_Fill_';
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_ICON) {
  module.exports.externals['ol/style/icon'] = '_ol_style_Icon_';
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_STROKE) {
  module.exports.externals['ol/style/stroke'] = '_ol_style_Stroke_';
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_STYLE) {
  module.exports.externals['ol/style/style'] = '_ol_style_Style_';
}
if (process.env.METOCLIENT_SKIP_OL_STYLE_TEXT) {
  module.exports.externals['ol/style/text'] = '_ol_style_Text_';
}
if (process.env.METOCLIENT_SKIP_OL_TILEGRID_TILEGRID) {
  module.exports.externals['ol/tilegrid/tilegrid'] = '_ol_tilegrid_TileGrid_';
}
if (process.env.METOCLIENT_SKIP_OL_TILEGRID_WMTS) {
  module.exports.externals['ol/tilegrid/wmts'] = '_ol_tilegrid_WMTS_';
}
if (process.env.METOCLIENT_SKIP_OL_VIEW) {
  module.exports.externals['ol/view'] = '_ol_View_';
}
