require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');

process.title = 'mber';

const buildCSS = require('./lib/builders/build-css').default;
const buildVendor = require('./lib/builders/build-vendor').default;
const buildApplication = require('./lib/builders/build-application').default;
const buildFastbootPackageJSON = require('./lib/builders/build-fastboot-package-json').default;
const Console = require('./lib/utils/console').default;
const findProjectRoot = require('./lib/utils/find-project-root').default;
const appImportTransformation = require('./lib/transpilers/app-import-transformation').default;
const importAddonToAMD = require('./lib/transpilers/import-addon-to-amd').default;
const parseCLIArguments = require('./lib/utils/parse-cli-arguments').default;
const PROJECT_ROOT = findProjectRoot();

module.exports = {
  vendorPrepends: [],
  vendorAppends: [],
  applicationPrepends: [],
  applicationAppends: [],
  import(path, options={}) {
    const appendMetadata = options.prepend ? 'Prepends' : 'Appends';
    const type = options.type === 'application' ? 'application' : 'vendor';

    this[`${type}${appendMetadata}`].push({ path: path, type: 'library', options: options });
  },
  importAddon(name, path, options={}) {
    const OPTIONS = typeof path === 'object' ? path : options;
    const PATH = typeof path === 'string' ? path : `${PROJECT_ROOT}/node_modules/${name}/addon`; // TODO: do it different for normal addons also normalize project_root
    const appendMetadata = OPTIONS.prepend ? 'Prepends' : 'Appends';
    const type = OPTIONS.type === 'application' ? 'application' : 'vendor';

    this[`${type}${appendMetadata}`].push({
      name: name, path: PATH, type: 'addon', options: options
    });
  },
  build(environment) {
    return new Promise((resolve) => {
      const metaKeys = [
        'vendorPrepends', 'vendorAppends', 'applicationPrepends', 'applicationAppends'
      ];
      const buildMeta = metaKeys.reduce((result, key) => {
        if (this[key].length > 0) {
          return { [key]: readTranspile(this[key]) };
        }

        return result;
      }, {});

      return Promise.all(Object.keys(buildMeta).map((metaKey) => buildMeta[metaKey]))
        .then((finishedBuild) => {
          const targetBuildMeta = finishedBuild.reduce((result, code, index) => {
            return Object.assign(result, { [`${Object.keys(buildMeta)[index]}`]: code });
          }, {});
          const CLI_ARGUMENTS = parseCLIArguments();

          // TODO: also parse app.inlineContents

          return Promise.all([
            buildCSS(environment),
            buildVendor(environment, Object.assign({}, CLI_ARGUMENTS, {
              fastboot: CLI_ARGUMENTS.fastboot !== false,
              hasSocketWatching: CLI_ARGUMENTS.watch || !['production', 'demo'].includes(environment),
              vendorPrepends: targetBuildMeta.vendorPrepends,
              vendorAppends: targetBuildMeta.vendorAppends
            })),
            buildApplication(environment, {
              applicationPrepends: targetBuildMeta.applicationPrepends,
              applicationAppends: targetBuildMeta.applicationAppends
            })
          ])
          .then(() => resolve(targetBuildMeta))
          .catch(reportErrorAndExit);
      }).catch(reportErrorAndExit);
    });
  }
}

function readTranspile(arrayOfImportableObjects) {
  return new Promise((resolve) => {
    Promise.all(arrayOfImportableObjects.map((importObject) => {
      if (importObject.type === 'addon') {
        return importObject.options.using ?
          appImportTransformation(importAddonToAMD(importObject.name, importObject.path)) :
          importAddonToAMD(importObject.name, importObject.path);
      }

      return appImportTransformation(importObject, PROJECT_ROOT);
    })).then((contents) => {
      resolve(contents.join('\n'));
    })
      // .then((contents) => writeAsync(`${PROJECT_ROOT}/tmp/${writeKey}.js`, contents.join('\n')))
  });
}

function reportErrorAndExit(error)  {
  Console.error('Error occured:', error);

  process.exit();
}
