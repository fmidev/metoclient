import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import versionInjector from 'rollup-plugin-version-injector';
import copy from 'rollup-plugin-copy';
import analyze from 'rollup-plugin-analyzer';

export default {
  input: './src/MetOClient.js',
  output: {
    file: './dist/metoclient.js',
    format: 'iife',
    name: 'fmi.metoclient',
    exports: 'named'
  },
  plugins: [
    babel({
      exclude: 'node_modules/**',
      presets: [
        [
          '@babel/env',
          {
            modules: 'false',
            targets: {
              browsers: 'ie >= 11',
              node: 8
            },
            corejs: '3.1.3',
            useBuiltIns: 'usage'
          }
        ]
      ]
    }),
    resolve(),
    commonjs(),
    terser({
      keep_fnames: true
    }),
    versionInjector({
      injectInComments: {
        fileRegexp: /\.js/g,
        tag: 'MetOClient {version} - FMI - {date}',
        dateFormat: 'longDate'
      },
    }),
    copy({
      targets: [
        {
          src: 'css',
          dest: 'dist'
        },
        {
          src: 'img',
          dest: 'dist'
        }
      ]
    }),
    analyze({
      summaryOnly: true
    })
  ]
};
