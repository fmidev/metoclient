var path = require('path')
var utils = require('./utils')
var webpack = require('webpack')
var config = require('../config')
var merge = require('webpack-merge')
var baseWebpackConfig = require('./webpack.base.conf')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin')
var PACKAGE = require('../package.json');
var banner = PACKAGE.name + ' - ' + PACKAGE.version + ' | ' + PACKAGE.author + ' ' + new Date().getFullYear() + ' | ' + PACKAGE.license + ' | ' + PACKAGE.homepage;

var env = config.build.env

var webpackConfig = merge(baseWebpackConfig, {
  module: {
    rules: utils.styleLoaders({
      sourceMap: config.build.productionSourceMap,
      extract: true
    })
  },
  devtool: config.build.productionSourceMap ? '#source-map' : false,
  output: {
    path: config.build.assetsRoot,
    publicPath: '.',
    filename: utils.assetsPath('js/metoclient-visualizer.min.js'),
    chunkFilename: utils.assetsPath('js/[id].[chunkhash].js')
  },
  plugins: [
    // Ignore all locale files of moment.js
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    // http://vuejs.github.io/vue-loader/en/workflow/production.html
    new webpack.DefinePlugin({
      'process.env': env
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      sourceMap: true
    }),
    // extract css into its own file
    new ExtractTextPlugin({
      filename: utils.assetsPath('css/[name].css')
    }),
    // Compress extracted CSS. We are using this plugin so that possible
    // duplicated CSS from different components can be deduped.
    new OptimizeCSSPlugin({
      cssProcessorOptions: {
        safe: true
      }
    }),
    // generate dist index.html with correct asset hash for caching.
    // you can customize output by editing /index.html
    // see https://github.com/ampedandwired/html-webpack-plugin
    new HtmlWebpackPlugin({
      filename: config.build.index,
      template: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: false,
        removeAttributeQuotes: true
        // more options:
        // https://github.com/kangax/html-minifier#options-quick-reference
      },
      // necessary to consistently work with multiple chunks via CommonsChunkPlugin
      chunksSortMode: 'dependency'
    }),
    // keep module.id stable when vender modules does not change
    new webpack.HashedModuleIdsPlugin(),
    /*
     // split vendor js into its own file
     new webpack.optimize.CommonsChunkPlugin({
     name: 'vendor',
     minChunks: function (module, count) {
     // any required modules inside node_modules are extracted to vendor
     return (
     module.resource &&
     /\.js$/.test(module.resource) &&
     module.resource.indexOf(
     path.join(__dirname, '../node_modules')
     ) === 0
     )
     }
     }),
     // extract webpack runtime and module manifest to its own file in order to
     // prevent vendor hash from being updated whenever app bundle is updated
     new webpack.optimize.CommonsChunkPlugin({
     name: 'manifest',
     chunks: ['vendor']
     }),
     */
    // copy custom static assets
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, '../static'),
        to: config.build.assetsSubDirectory,
        ignore: ['.*']
      }
    ])
  ]
})

if (config.build.productionGzip) {
  var CompressionWebpackPlugin = require('compression-webpack-plugin')

  webpackConfig.plugins.push(
    new CompressionWebpackPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: new RegExp(
        '\\.(' +
        config.build.productionGzipExtensions.join('|') +
        ')$'
      ),
      threshold: 10240,
      minRatio: 0.8
    })
  )
}

//if (config.build.bundleAnalyzerReport) {
  var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
  webpackConfig.plugins.push(new BundleAnalyzerPlugin({
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
  }))
//}

webpackConfig.plugins.push(new webpack.BannerPlugin({
  banner: banner,
  raw: false,
  entryOnly: true
}));

// Optimize the bundle size
if (env.METOCLIENT_SKIP_OL_COLLECTION) {
  webpackConfig.externals['ol/collection'] = '_ol_Collection_';
}
if (env.METOCLIENT_SKIP_OL_CONTROL_ZOOM) {
  webpackConfig.externals['ol/control/zoom'] = '_ol_control_Zoom_';
}
if (env.METOCLIENT_SKIP_OL_FEATURE) {
  webpackConfig.externals['ol/feature'] = '_ol_Feature_';
}
if (env.METOCLIENT_SKIP_OL_FORMAT_GEOJSON) {
  webpackConfig.externals['ol/format/geojson'] = '_ol_format_GeoJSON_';
}
if (env.METOCLIENT_SKIP_OL_FORMAT_GML) {
  webpackConfig.externals['ol/format/gml'] = '_ol_format_GML_';
}
if (env.METOCLIENT_SKIP_OL_FORMAT_WFS) {
  webpackConfig.externals['ol/format/wfs'] = '_ol_format_WFS_';
}
if (env.METOCLIENT_SKIP_OL_FORMAT_WMSCAPABILITIES) {
  webpackConfig.externals['ol/format/wmscapabilities'] = '_ol_format_WMSCapabilities_';
}
if (env.METOCLIENT_SKIP_OL_FORMAT_WMTSCAPABILITIES) {
  webpackConfig.externals['ol/format/wmtscapabilities'] = '_ol_format_WMTSCapabilities_';
}
if (env.METOCLIENT_SKIP_OL_GEOM_POINT) {
  webpackConfig.externals['ol/geom/point'] = '_ol_geom_Point_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION) {
  webpackConfig.externals['ol/interaction'] = '_ol_Interaction_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_DOUBLECLICKZOOM) {
  webpackConfig.externals['ol/interaction/doubleclickzoom'] = '_ol_interaction_DoubleClickZoom_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_DRAGPAN) {
  webpackConfig.externals['ol/interaction/dragpan'] = '_ol_interaction_DragPan_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_DRAGROTATE) {
  webpackConfig.externals['ol/interaction/dragrotate'] = '_ol_interaction_DragRotate_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_DRAGROTATEANDZOOM) {
  webpackConfig.externals['ol/interaction/dragrotateandzoom'] = '_ol_interaction_DragRotateAndZoom_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_DRAGZOOM) {
  webpackConfig.externals['ol/interaction/dragzoom'] = '_ol_interaction_DragZoom_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_KEYBOARDPAN) {
  webpackConfig.externals['ol/interaction/keyboardpan'] = '_ol_interaction_KeyboardPan_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_KEYBOARDZOOM) {
  webpackConfig.externals['ol/interaction/keyboardzoom'] = '_ol_interaction_KeyboardZoom_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_MOUSEWHEELZOOM) {
  webpackConfig.externals['ol/interaction/mousewheelzoom'] = '_ol_interaction_MouseWheelZoom_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_PINCHROTATE) {
  webpackConfig.externals['ol/interaction/pinchrotate'] = '_ol_interaction_PinchRotate_';
}
if (env.METOCLIENT_SKIP_OL_INTERACTION_PINCHZOOM) {
  webpackConfig.externals['ol/interaction/pinchzoom'] = '_ol_interaction_PinchZoom_';
}
if (env.METOCLIENT_SKIP_OL_LAYER_GROUP) {
  webpackConfig.externals['ol/layer/group'] = '_ol_layer_Group_';
}
if (env.METOCLIENT_SKIP_OL_LAYER_IMAGE) {
  webpackConfig.externals['ol/layer/image'] = '_ol_layer_Image_';
}
if (env.METOCLIENT_SKIP_OL_LAYER_TILE) {
  webpackConfig.externals['ol/layer/tile'] = '_ol_layer_Tile_';
}
if (env.METOCLIENT_SKIP_OL_LAYER_VECTOR) {
  webpackConfig.externals['ol/layer/vector'] = '_ol_layer_Vector_';
}
if (env.METOCLIENT_SKIP_OL_MAP) {
  webpackConfig.externals['ol/map'] = '_ol_Map_';
}
if (env.METOCLIENT_SKIP_OL_OBJECT) {
  webpackConfig.externals['ol/object'] = '_ol_Object_';
}
if (env.METOCLIENT_SKIP_OL_OVERLAY) {
  webpackConfig.externals['ol/overlay'] = '_ol_Overlay_';
}
if (env.METOCLIENT_SKIP_OL_PROJ) {
  webpackConfig.externals['ol/proj'] = '_ol_Proj_';
}
if (env.METOCLIENT_SKIP_OL_SOURCE_IMAGEWMS) {
  webpackConfig.externals['ol/source/imagewms'] = '_ol_source_ImageWMS_';
}
if (env.METOCLIENT_SKIP_OL_SOURCE_OSM) {
  webpackConfig.externals['ol/source/osm'] = '_ol_source_OSM_';
}
if (env.METOCLIENT_SKIP_OL_SOURCE_STAMEN) {
  webpackConfig.externals['ol/source/stamen'] = '_ol_source_Stamen_';
}
if (env.METOCLIENT_SKIP_OL_SOURCE_TILEWMS) {
  webpackConfig.externals['ol/source/tilewms'] = '_ol_source_TileWMS_';
}
if (env.METOCLIENT_SKIP_OL_SOURCE_VECTOR) {
  webpackConfig.externals['ol/source/vector'] = '_ol_source_Vector_';
}
if (env.METOCLIENT_SKIP_OL_SOURCE_WMTS) {
  webpackConfig.externals['ol/source/wmts'] = '_ol_source_WMTS_';
}
if (env.METOCLIENT_SKIP_OL_STYLE_FILL) {
  webpackConfig.externals['ol/style/fill'] = '_ol_style_Fill_';
}
if (env.METOCLIENT_SKIP_OL_STYLE_ICON) {
  webpackConfig.externals['ol/style/icon'] = '_ol_style_Icon_';
}
if (env.METOCLIENT_SKIP_OL_STYLE_STROKE) {
  webpackConfig.externals['ol/style/stroke'] = '_ol_style_Stroke_';
}
if (env.METOCLIENT_SKIP_OL_STYLE_STYLE) {
  webpackConfig.externals['ol/style/style'] = '_ol_style_Style_';
}
if (env.METOCLIENT_SKIP_OL_STYLE_TEXT) {
  webpackConfig.externals['ol/style/text'] = '_ol_style_Text_';
}
if (env.METOCLIENT_SKIP_OL_TILEGRID_TILEGRID) {
  webpackConfig.externals['ol/tilegrid/tilegrid'] = '_ol_tilegrid_TileGrid_';
}
if (env.METOCLIENT_SKIP_OL_TILEGRID_WMTS) {
  webpackConfig.externals['ol/tilegrid/wmts'] = '_ol_tilegrid_WMTS_';
}
if (env.METOCLIENT_SKIP_OL_VIEW) {
  webpackConfig.externals['ol/view'] = '_ol_View_';
}

module.exports = webpackConfig
