import chalk from 'chalk';
import buildVendor from '../utils/build-vendor';
import Bundler from 'parcel-bundler';
import findIndexHTML from '../utils/find-index-html';

export default async function() {
  const entrypoint = findIndexHTML();
  const bundler = new Bundler(entrypoint, {
    file: '../../ember-app-boilerplate/index.html'
  });

  buildVendor();

  const bundle = await bundler.bundle();
  console.log('vendor.js build complete');
}

// NOTE: print asset sizes
