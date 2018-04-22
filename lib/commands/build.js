import chalk from 'chalk';
import Bundler from 'parcel-bundler';
import findIndexHTML from '../utils/find-index-html';

export default function() {
  const entrypoint = findIndexHTML();
  const bundler = new Bundler(entrypoint, {});
}

// NOTE: print asset sizes
