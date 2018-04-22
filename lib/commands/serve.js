import findIndexHTML from '../utils/find-index-html';
import Bundler from 'parcel-bundler';

const app = require('express')();

export default function() {
  const entrypoint = findIndexHTML();
  const bundler = new Bundler(entrypoint, {});
  console.log('entrypoint is', entrypoint);

  // Let express use the bundler middleware, this will let parcel handle every request over your express server
  app.use(bundler.middleware());

  // Listen on port 8080
  app.listen(8080);
}
