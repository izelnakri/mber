require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');

process.title = 'mber';

// const fs = require('fs');
// const { promisify } = require('util');
const findProjectRoot = require(`${__dirname}/lib/utils/find-project-root`).default;

const PROJECT_ROOT = findProjectRoot();

module.exports = {
  import(path, options={}) {
    const appendMetadata = options.prepend ? 'Appends' : 'Prepends';
    const type = options.type === 'application' ? 'application' : 'vendor';

    if (options.prepend) {
      this[`${type}${appendMetadata}`].push({ path: path, type: 'library', options: options });
    }
  },
  importAddon(name, path, options={}) {
    const OPTIONS = typeof path === 'object' ? path : options;
    const PATH = typeof path === 'string' ? path : `${PROJECT_ROOT}/node_modules/${name}/addon`;
    const appendMetadata = OPTIONS.prepend ? 'Appends' : 'Prepends';
    const type = OPTIONS.type === 'application' ? 'application' : 'vendor';

    if (options.prepend) {
      this[`${type}${appendMetadata}`].push({
        name: name, path: PATH, type: 'addon', options: options
      });
    }
  },
  build() {


    // check if path exists or give an error


    // TODO: also parse app.inlineContents
  },
  vendorPrepends: [],
  vendorAppends: [],
  applicationPrepends: [],
  applicationAppends: []
}
