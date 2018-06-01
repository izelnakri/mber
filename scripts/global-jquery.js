require('babel-polyfill');

const rollup = require('rollup');

import virtual from 'rollup-plugin-virtual';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const build = async () => {
  const bundle = await rollup.rollup({
    input: 'jquery.js',
    plugins: [
      virtual({
        'jquery.js': `
        import $ from 'jquery';

        window.$ = window.jQuery = $

        export default $;
        `
      }),
      resolve(),
      commonjs()
    ]
  });
  const OUTPUT_OPTIONS = {
    format: 'iife',
    name: 'jQuery',
    file: './vendor/jquery.js',
    sourcemap: true
  };

  await bundle.write(OUTPUT_OPTIONS);
}

build();
