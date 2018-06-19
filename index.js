require('babel-register')({
  presets: ['env']
});

process.title = 'mber';

const buildCSS = require('./lib/builders/build-css').default;
const buildVendor = require('./lib/builders/build-vendor').default;
const buildApplication = require('./lib/builders/build-application').default;
const Console = require('./lib/utils/console').default;
const findProjectRoot = require('./lib/utils/find-project-root').default;
const appImportTransformation = require('./lib/transpilers/app-import-transformation').default;
const importAddonFolderToAMD = require('./lib/transpilers/import-addon-folder-to-amd').default;
const parseCLIArguments = require('./lib/utils/parse-cli-arguments').default;

const PROJECT_ROOT = findProjectRoot();

module.exports = {
  indexHTMLInjections: {},
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
    const PATH = typeof path === 'string' ? path : `${PROJECT_ROOT}/node_modules/${name}`;
    const appendMetadata = OPTIONS.prepend ? 'Prepends' : 'Appends';
    const type = OPTIONS.type === 'application' ? 'application' : 'vendor';

    this[`${type}${appendMetadata}`].push({
      name: name, path: PATH, type: 'addon', options: options
    });
  },
  injectInlineContent(keyName, value) {
    this.indexHTMLInjections[keyName] = value;
  },
  build(environment) {
    const ENV = require(`${PROJECT_ROOT}/config/environment`)(environment);
    const APPLICATION_NAME = ENV.modulePrefix || 'frontend';

    return new Promise((resolve) => {
      const metaKeys = [
        'vendorPrepends', 'vendorAppends', 'applicationPrepends', 'applicationAppends'
      ];
      const buildMeta = metaKeys.reduce((result, key) => {
        if (this[key].length > 0) {
          return { [key]: readTranspile(this[key], APPLICATION_NAME) };
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
            buildVendor(environment, ENV, Object.assign({}, CLI_ARGUMENTS, {
              fastboot: CLI_ARGUMENTS.fastboot !== false,
              hasSocketWatching: CLI_ARGUMENTS.watch || !['production', 'demo'].includes(environment),
              vendorPrepends: targetBuildMeta.vendorPrepends,
              vendorAppends: targetBuildMeta.vendorAppends
            })),
            buildApplication(environment, ENV, {
              applicationPrepends: targetBuildMeta.applicationPrepends,
              applicationAppends: targetBuildMeta.applicationAppends
            })
          ]).then(() => {
            return resolve(Object.assign(targetBuildMeta, {
              applicationName: APPLICATION_NAME,
              indexHTMLInjections: this.indexHTMLInjections,
              ENV: ENV
            }))
          }).catch((error) => reportErrorAndExit(error));
      }).catch((error) => reportErrorAndExit(error));
    });
  }
}

function readTranspile(arrayOfImportableObjects, applicationName) {
  return new Promise((resolve) => {
    Promise.all(arrayOfImportableObjects.map((importObject) => {
      if (importObject.type === 'addon') {
        return importObject.options.using ?
          appImportTransformation(importAddonToAMD(importObject.name, importObject.path, applicationName)) :
          importAddonToAMD(importObject.name, importObject.path, applicationName);
      }

      return appImportTransformation(importObject, PROJECT_ROOT);
    })).then((contents) => resolve(contents.join('\n')))
      .catch((error) => console.log('readTranspile error', error));
  });
}

function reportErrorAndExit(error)  {
  Console.error('Error occured:', error);
  console.log(error);

  process.exit();
}

function importAddonToAMD(name, path, applicationName) {
  return new Promise((resolve) => {
    Promise.all([
      importAddonFolderToAMD(name, `${path}/addon`),
      importAddonFolderToAMD(applicationName, `${path}/app`)
    ]).then((content) => resolve(content.join('\n')));
  });
}
