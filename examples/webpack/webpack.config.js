const path = require('path');

module.exports = {
  mode: 'none',
  entry: './src/index.js',
  output: {
    filename: 'example.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
