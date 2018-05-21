require('babel-polyfill');

const rollup = require('rollup');

import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const build = async () => {
  const bundle = await rollup.rollup({
    input: './lib/modules/jquery.js',
    plugins: [
      resolve(),
      commonjs()
    ]
  });
  const OUTPUT_OPTIONS = {
    format: 'iife',
    name: 'jQuery',
    file: './vendor/jquery.js'
  };

  await bundle.generate(OUTPUT_OPTIONS); // generate code and a sourcemap
  await bundle.write(OUTPUT_OPTIONS);
}

build();
