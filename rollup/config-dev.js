import babel from 'rollup-plugin-babel';
import replace from '@rollup/plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import versionInjector from 'rollup-plugin-version-injector';
import copy from 'rollup-plugin-copy';
import analyze from 'rollup-plugin-analyzer';
import license from 'rollup-plugin-license';
import pkg from '../package.json';

export default {
  input: './src/MetOClient.js',
  output: {
    file: pkg.main,
    format: 'umd',
    name: 'fmi.metoclient',
    exports: 'named',
  },
  plugins: [
    babel({
      include: ['src/**', 'node_modules/luxon/**'],
      presets: [
        [
          '@babel/env',
          {
            targets: {
              browsers: 'ie >= 11',
            },
            corejs: 3,
            useBuiltIns: 'usage',
          },
        ],
      ],
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    versionInjector({
      injectInComments: {
        fileRegexp: /\.js/g,
        tag: `MetOClient {version}-dev.${Date.now()} - FMI - {date}`,
        dateFormat: 'longDate',
      },
    }),
    copy({
      targets: [
        {
          src: 'css',
          dest: 'dist',
        },
        {
          src: 'img',
          dest: 'dist',
        },
      ],
    }),
    analyze({
      summaryOnly: true,
    }),
    license({
      thirdParty: {
        output: 'metoclient.licenses.txt',
        includePrivate: true,
      },
    }),
  ],
};
