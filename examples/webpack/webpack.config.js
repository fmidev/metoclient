const path = require('path')

let config = {
  entry: './src/index.js',
  output: {
    filename: 'example.min.js',
    path: path.join(__dirname, '/build')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'node_modules/@fmidev/metoclient')
        ],
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime']
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true
  }
}

module.exports = config
