import babel from 'rollup-plugin-babel';
import replace from '@rollup/plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import versionInjector from 'rollup-plugin-version-injector';
import copy from 'rollup-plugin-copy';
import analyze from 'rollup-plugin-analyzer';
import license from 'rollup-plugin-license';
import pkg from '../package.json';

export default {
  input: './src/MetOClient.js',
  output: [
    {
      file: pkg.module,
      format: 'es',
    },
    {
      file: pkg.main,
      format: 'umd',
      name: 'fmi.metoclient',
      exports: 'named',
    },
    {
      file: `${pkg.main.replace('.js','')}.namespaced.${pkg.version}.js`,
      format: 'umd',
      name: `metoclient_${pkg.version.replace(/\./g,'_')}`,
      exports: 'named',
    },
  ],
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
        '@babel/preset-flow',
      ],
      plugins: ['@babel/plugin-proposal-class-properties'],
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    terser({
      keep_fnames: true,
    }),
    versionInjector({
      injectInComments: {
        fileRegexp: /\.js$/,
        tag: 'MetOClient {version} - FMI - {date}',
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
        {
          src: 'types/index.d.ts',
          dest: 'dist',
          rename: 'metoclient.d.ts',
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
