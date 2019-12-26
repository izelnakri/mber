import fs from 'fs-extra';
import chalk from 'ansi-colors';
import Terser from 'terser';
import Console from '../lib/utils/console.js';
import countTime from '../lib/utils/count-time.js';
import convertESModuletoAMD from '../lib/transpilers/convert-es-module-to-amd.js';
import importAddonFolderToAMD from '../lib/transpilers/import-addon-folder-to-amd.js';
import findProjectRoot from '../lib/utils/find-project-root.js';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter.js';

function build(environment, options = { excludeEmberData: false }) {
  const FILENAME = getFileName(environment, options);

  return new Promise(async (resolve) => {
    Console.log(chalk.yellow('BUILDING:'), `${FILENAME}...`);

    const timer = countTime();
    const PROJECT_PATH = await findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_PATH}/vendor/${FILENAME}.js`;

    return Promise.all(await readBuildFiles(PROJECT_PATH, environment, options))
      .then((fileContents) => {
        const targetContents = fileContents
          .join('\n')
          .replace(
            'var owner = (0, _owner.getOwner)(this) || this.container;',
            'var owner = (0, _owner.getOwner)(this) || this.container || this.__owner__;' // NOTE: needed for glimmer-compat for module unification
          ).replace(`(0, _emberCompatibilityHelpers.gte)('3.10.0')`, 'true');

        return writeVendorJS(OUTPUT_PATH, targetContents, environment);
      })
      .then(() => {
        const timePassed = timer.stop();

        fs.readFile(OUTPUT_PATH).then((fileBuffer) => {
          Console.log(
            `${chalk.green('BUILT:')} ${FILENAME}.js in ${formatTimePassed(
              timePassed
            )} [${formatSize(fileBuffer.length)}] Environment: ${environment}`
          );

          resolve({
            message: `BUILT: ${FILENAME}.js in ${timePassed}ms [${formatSize(
              fileBuffer.length
            )}] Environment: ${environment}`,
            fileBuffer: fileBuffer
          });
        });
      })
      .catch((error) => Console.error(`buildEmberBase error: ${error}`));
  });
}

function getFileName(environment, options) {
  if (options.excludeEmberData) {
    return environment === 'production' ? 'no-ember-data-ember-prod' : 'no-ember-data-ember-debug';
  }

  return environment === 'production' ? 'full-ember-prod' : 'full-ember-debug';
}

async function readBuildFiles(projectPath, environment, options = { excludeEmberData: false }) {
  const MODULE_PATH = `${projectPath}/node_modules`;

  let baseBuilds = [
    fs.readFile(`${MODULE_PATH}/loader.js/dist/loader/loader.js`),
    `
      define("ember-compatibility-helpers", ["exports"], function (_exports) {
        "use strict";

        Object.defineProperty(_exports, "__esModule", {
          value: true
        });
        _exports.default =  {
          gte: function(version) {
            return true;
          }
        };
        _exports.gte = function(version) {
          return true;
        };
      });
    `,
    importAddonFolderToAMD('@glimmer/resolver', '@glimmer/resolver/dist/modules/es2017'),
    fs.readFile(`${MODULE_PATH}/@glimmer/di/dist/amd/es5/glimmer-di.js`),
    importAddonFolderToAMD('@glimmer/component', '@glimmer/component/addon'),
    fs.readFile(`${MODULE_PATH}/ember-source/dist/ember.debug.js`),
    transpileEmberOrderedSet(MODULE_PATH),
    importAddonFolderToAMD('ember-inflector', 'ember-inflector/addon')
  ];

  if (!options.excludeEmberData) {
    baseBuilds = baseBuilds.concat(await buildEmberData(projectPath, environment));
  }

  return baseBuilds.concat([
    importAddonFolderToAMD('ember-load-initializers', 'ember-load-initializers/addon'),
    importAddonFolderToAMD('ember-resolver', 'ember-resolver/addon'),
    importAddonFolderToAMD('ember-resolver', 'ember-resolver/mu-trees/addon')
  ]);
}

function transpileEmberOrderedSet(modulePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(`${modulePath}/@ember/ordered-set/addon/index.js`)
      .then((fileBuffer) => {
        const nonBroccoliEmberOrderedSet = fileBuffer
          .toString()
          .replace(`import { gte } from 'ember-compatibility-helpers'`, '')
          .replace(
            `const NEEDS_CUSTOM_ORDERED_SET = gte('3.5.0-alpha.1');`,
            'const NEEDS_CUSTOM_ORDERED_SET = true;'
          );

        return convertESModuletoAMD(nonBroccoliEmberOrderedSet, {
          moduleName: '@ember/ordered-set'
        });
      })
      .then((result) => resolve(result))
      .catch((error) => reject(error));
  });
}

async function buildEmberData(projectPath, environment) {
  const emberDataVersion = JSON.parse(await fs.readFile(`${projectPath}/package.json`))
    .devDependencies['ember-data']; // NOTE: normally stripping -private but ember-data build sourcecode is a disaster
  const options =
    environment === 'production'
      ? {
          filter: (item) => !item.path.includes('/-debug')
        }
      : {};

  process.env.EMBER_ENV = environment === 'production' ? 'production' : undefined; // NOTE: hack for hacky ember-data builds

  return [
    importAddonFolderToAMD('ember-data', 'ember-data/addon', null, options),
    importAddonFolderToAMD('@ember-data/adapter', '@ember-data/adapter/addon', null),
    importAddonFolderToAMD(
      '@ember-data/canary-features',
      '@ember-data/canary-features/addon',
      null
    ),
    importAddonFolderToAMD('@ember-data/debug', '@ember-data/debug/addon', null),
    importAddonFolderToAMD('@ember-data/model', '@ember-data/model/addon', null),
    importAddonFolderToAMD('@ember-data/record-data', '@ember-data/record-data/addon', null),
    importAddonFolderToAMD('@ember-data/serializer', '@ember-data/serializer/addon', null),
    importAddonFolderToAMD('@ember-data/store', '@ember-data/store/addon', null),
    new Promise((resolve) =>
      resolve(`
      define('ember-data/version', ['exports'], function (exports) {
        exports.default = '${emberDataVersion}';
      });
    `)
    )
  ];
}

function writeVendorJS(path, content, environment) {
  if (environment === 'production') {
    const minified = Terser.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code;

    return fs.writeFile(path, minified);
  }

  return fs.writeFile(
    path,
    content.replace(
      'this._najaxRequest(options);',
      '(window.$ && window.$.ajax) ? this._ajaxRequest(options) : this._najaxRequest(options);'
    )
  );
}

function readArguments() {
  return process.argv.slice(2).reduce((result, arg) => {
    if (arg.startsWith('--exclude-ember-data')) {
      return Object.assign(result, { excludeEmberData: true });
    }

    return result;
  }, {});
}

const ARGUMENTS = readArguments();

build('development', ARGUMENTS)
  .then(() => {
    process.env.EMBER_ENV = 'production';

    return build('production', ARGUMENTS);
  })
  .then(() => {
    process.env.EMBER_ENV = 'development';
  })
  .catch((error) => console.log('Ember Build DIST ERROR:', error));
