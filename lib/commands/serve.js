import findIndexHTML from '../utils/find-index-html';
import Bundler from 'parcel-bundler';
import parseCLIArguments from '../utils/parse-cli-arguments';

const app = require('express')();

export default function() {
  const PORT = 4200; // TODO: make this dynamic
  const entrypoint = findIndexHTML();
  const bundler = new Bundler(entrypoint, {});

  app.use(bundler.middleware());
  app.listen(PORT);

  console.log(`[mber] mber server is running on http://localhost:${PORT}`);
}
