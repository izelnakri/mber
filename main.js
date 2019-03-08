import eslint from 'eslint';
import buildAssets from './lib/builders/build-assets';
import Console from './lib/utils/console';
import findProjectRoot from './lib/utils/find-project-root';
import appImportTransformation from './lib/transpilers/app-import-transformation';
import importAddonFolderToAMD from './lib/transpilers/import-addon-folder-to-amd';
import transpileNPMImports from './lib/transpilers/transpile-npm-imports';
import parseCLIArguments from './lib/utils/parse-cli-arguments';
import resolvePortNumberFor from './lib/utils/resolve-port-number-for';

export default {
  indexHTMLInjections: {},
  vendorPrepends: [],
  vendorAppends: [],
  applicationPrepends: [],
  applicationAppends: [],
  testPrepends: [],
  testAppends: [],
  import(path, options={}) {
    const appendMetadata = options.prepend ? 'Prepends' : 'Appends';
    const type = options.type || 'application';

    this[`${type}${appendMetadata}`].push({ path: path, type: 'library', options: options });
  },
  importAddon(name, path, options={}) {
    const OPTIONS = typeof path === 'object' ? path : options;
    const PATH = typeof path === 'string' ? path : name;
    const appendMetadata = OPTIONS.prepend ? 'Prepends' : 'Appends';
    const type = options.type || 'application';

    this[`${type}${appendMetadata}`].push({
      name: name, path: PATH, type: 'addon', options: OPTIONS
    });
  },
  importAsAMDModule(npmModuleName, path, options={}) {
    const OPTIONS = typeof path === 'object' ? path : options;
    const PATH = typeof path === 'string' ? path : npmModuleName;
    const appendMetadata = OPTIONS.prepend ? 'Prepends' : 'Appends';
    const type = options.type || 'application';

    this[`${type}${appendMetadata}`].push({
      name: npmModuleName, path: PATH, type: 'amdModule', options: OPTIONS
    });
  },
  injectInlineContent(keyName, value) {
    this.indexHTMLInjections[keyName] = value;
  },
  build(environment) {
    return new Promise(async (resolve) => {
      const PROJECT_ROOT = await findProjectRoot();
      const ENV = serializeRegExp(require(`${PROJECT_ROOT}/config/environment`)(environment));
      const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
      const buildMeta = [
        'vendorPrepends', 'vendorAppends', 'applicationPrepends', 'applicationAppends',
        'testPrepends', 'testAppends'
      ].reduce((result, key) => {
        if (this[key].length > 0) {
          return Object.assign(result, {
            [key]: readTranspile(PROJECT_ROOT, this[key], APPLICATION_NAME)
          });
        }

        return result;
      }, {});

      Promise.all(Object.keys(buildMeta).map((metaKey) => buildMeta[metaKey]))
        .then(async (finishedBuild) => {
          const CLI_ARGUMENTS = Object.assign({}, {
            fastboot: true,
            port: 1234,
            socketPort: (global.MBER_DISABLE_SOCKETS|| ENV.environment === 'production') ? null : 65511,
            talk: true,
            testing: ENV.environment !== 'production'
          }, parseCLIArguments());
          const { socketPort, port } = CLI_ARGUMENTS;
          const targetPort = await resolvePortNumberFor('Web server', port);
          const targetSocketPort = socketPort ?
            (await resolvePortNumberFor('Websocket server', socketPort)) : null;
          const result = await buildAssets({
            applicationName: ENV.modulePrefix || 'frontend',
            ENV: ENV,
            cliArguments: Object.assign({}, CLI_ARGUMENTS, {
              port: targetPort,
              socketPort: targetSocketPort,
            }),
            projectRoot: PROJECT_ROOT,
            buildCache: finishedBuild.reduce((result, code, index) => {
              return Object.assign(result, { [`${Object.keys(buildMeta)[index]}`]: code });
            }, {}),
            indexHTMLInjections: this.indexHTMLInjections,
            jsLinter: new eslint.CLIEngine(require(`${PROJECT_ROOT}/.eslintrc.js`)),
          });

          resolve(result);
        }).catch((error) => reportErrorAndExit(error));
    });
  }
}


function readTranspile(projectRoot, arrayOfImportableObjects, applicationName) {
  return new Promise((resolve) => {
    Promise.all(arrayOfImportableObjects.map((importObject) => {
      if (importObject.type === 'amdModule') {
        return transpileNPMImports(importObject.name, importObject.path, importObject.options);
      } else if (importObject.type === 'addon') {
        return importAddonToAMD(importObject.name, importObject.path, { applicationName, projectRoot });
      }

      return appImportTransformation(importObject, projectRoot);
    })).then((contents) => resolve(contents.join('\n')))
      .catch((error) => console.log('readTranspile error', error));
  });
}

function reportErrorAndExit(error)  {
  Console.error('Error occured:', error);
  console.log(error);

  process.exit();
}

function importAddonToAMD(name, path, { applicationName, projectRoot }) {
  return new Promise((resolve) => {
    Promise.all([
      importAddonFolderToAMD(name, `${path}/addon`, projectRoot),
      importAddonFolderToAMD(applicationName, `${path}/app`, projectRoot)
    ]).then((content) => resolve(content.join('\n')));
  });
}

function serializeRegExp(object) {
  RegExp.prototype.toJSON = function() {
    return this.source;
  };

  return JSON.parse(JSON.stringify(object));
}
