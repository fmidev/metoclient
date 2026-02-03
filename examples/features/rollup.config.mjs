import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'main.js',
  output: [
    {
      file: 'example.min.js',
      format: 'iife',
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    production &&
      terser({
        keep_fnames: true,
      }),
  ],
};
