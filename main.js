import buildCSS from './lib/builders/build-css';
import buildVendor from './lib/builders/build-vendor';
import buildApplication from './lib/builders/build-application';
import Console from './lib/utils/console';
import findProjectRoot from './lib/utils/find-project-root';
import appImportTransformation from './lib/transpilers/app-import-transformation';
import importAddonFolderToAMD from './lib/transpilers/import-addon-folder-to-amd';
import transpileNPMImports from './lib/transpilers/transpile-npm-imports';
import parseCLIArguments from './lib/utils/parse-cli-arguments';

const PROJECT_ROOT = findProjectRoot();

export default {
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
  importAsAMDModule(npmModuleName, path, options={}) {
    const OPTIONS = typeof path === 'object' ? path : options;
    const PATH = typeof path === 'string' ? path : `${PROJECT_ROOT}/node_modules/${npmModuleName}`;
    const appendMetadata = OPTIONS.prepend ? 'Prepends' : 'Appends';
    const type = OPTIONS.type === 'application' ? 'application' : 'vendor';

    this[`${type}${appendMetadata}`].push({
      name: npmModuleName, path: PATH, type: 'amdModule', options: options
    });
  },
  injectInlineContent(keyName, value) {
    this.indexHTMLInjections[keyName] = value;
  },
  buildWithCache({ ENV, cliArguments, buildCache, indexHTMLInjections }) {
    return new Promise((resolve) => {
      return fullBuild({ ENV, cliArguments, resolve, buildCache, indexHTMLInjections });
    });
  },
  build(environment) {
    return new Promise((resolve) => {
      const ENV = serializeRegExp(require(`${PROJECT_ROOT}/config/environment`)(environment));
      const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
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
          const buildCache = finishedBuild.reduce((result, code, index) => {
            return Object.assign(result, { [`${Object.keys(buildMeta)[index]}`]: code });
          }, {});
          const cliArguments = parseCLIArguments();

          return fullBuild({
            ENV: ENV,
            cliArguments: cliArguments,
            resolve: resolve,
            buildCache: buildCache,
            indexHTMLInjections: this.indexHTMLInjections
          });
      }).catch((error) => reportErrorAndExit(error));
    });
  }
}

function fullBuild({ ENV, cliArguments, resolve, buildCache, indexHTMLInjections }) {
  const { environment } = ENV;

  return Promise.all([
    buildCSS(environment),
    buildVendor(environment, ENV, Object.assign({}, cliArguments, {
      fastboot: cliArguments.fastboot !== false,
      hasSocketWatching: cliArguments.watch || !['production', 'demo'].includes(environment),
      vendorPrepends: buildCache.vendorPrepends,
      vendorAppends: buildCache.vendorAppends
    })),
    buildApplication(environment, ENV, {
      applicationPrepends: buildCache.applicationPrepends,
      applicationAppends: buildCache.applicationAppends
    })
  ]).then(() => {
    return resolve({
      buildCache: buildCache,
      applicationName: ENV.modulePrefix || 'frontend',
      cliArguments: cliArguments,
      indexHTMLInjections: indexHTMLInjections,
      ENV: ENV
    });
  }).catch((error) => reportErrorAndExit(error));
}

function readTranspile(arrayOfImportableObjects, applicationName) {
  return new Promise((resolve) => {
    Promise.all(arrayOfImportableObjects.map((importObject) => {
      // TODO: add appImportTransformation to amdModule and addon types. Check on importObject.options.using

      if (importObject.type === 'amdModule') {
        return transpileNPMImports(importObject.name, importObject.path);
      } else if (importObject.type === 'addon') {
        return importAddonToAMD(importObject.name, importObject.path, applicationName);
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

function serializeRegExp(object) {
  RegExp.prototype.toJSON = function() { return this.source; };

  return JSON.parse(JSON.stringify(object));
}
