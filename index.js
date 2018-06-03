require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');

process.title = 'mber';

const buildCSS = require('./lib/builders/build-css').default;
const buildVendor = require('./lib/builders/build-vendor').default;
const buildApplication = require('./lib/builders/build-application').default;
const Console = require('./lib/utils/console').default;
const findProjectRoot = require('./lib/utils/find-project-root').default;
const appImportTransformation = require('./lib/transpilers/app-import-transformation').default;
const importAddonToAMD = require('./lib/transpilers/import-addon-to-amd').default;

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
    const PATH = typeof path === 'string' ? path : `${PROJECT_ROOT}/node_modules/${name}/addon`; // TODO: do it different for normal addons also normalize project_root
    const appendMetadata = OPTIONS.prepend ? 'Appends' : 'Prepends';
    const type = OPTIONS.type === 'application' ? 'application' : 'vendor';

    if (options.prepend) {
      this[`${type}${appendMetadata}`].push({
        name: name, path: PATH, type: 'addon', options: options
      });
    }
  },
  build(environment) {
    return new Promise((resolve) => {
      const metaKeys = [
        'vendorPrepends', 'vendorAppends', 'applicationPrepends', 'applicationAppends'
      ];
      const buildMeta = metaKeys.reduce((result, key) => {
        if (this[key].length > 0) {
          return { [key]: readTranspile(this[key], key) };
        }

        return result;
      }, {});

      console.log('buildMeta is', buildMeta);
      // TODO: also parse app.inlineContents

      return Promise.all([
        buildCSS(environment),
        buildVendor(environment, {
          hasSocketWatching: !['production', 'demo'].includes(environment),
          vendorPrepends: buildMeta.vendorPrepends,
          vendorAppends: buildMeta.vendorAppends
        }),
        buildApplication(environment, {
          applicationPrepends: buildMeta.applicationPrepends,
          applicationAppends: buildMeta.applicationAppends
        })
      ]).then(() => resolve(buildMeta))
        .catch((error) => {
          Console.error('Error occured:', error);

          process.exit();
        });
    });
  },
  vendorPrepends: [],
  vendorAppends: [],
  applicationPrepends: [],
  applicationAppends: []
}

async function readTranspile(arrayOfImportableObjects) {
  const contents = await Promise.all(arrayOfImportableObjects.map((importObject) => {
    if (importObject.type === 'addon') {
      return importObject.options.using ?
        appImportTransformation(importAddonToAMD(importObject.name, importObject.path)) :
        importAddonToAMD(importObject.name, importObject.path);
    }

    return appImportTransformation(importObject);
  }));

  return contents.join('\n');
    // .then((contents) => writeAsync(`${PROJECT_ROOT}/tmp/${writeKey}.js`, contents.join('\n')))
}
