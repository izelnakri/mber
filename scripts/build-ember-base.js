import fs from 'fs-extra';
import chalk from 'chalk';
import UglifyJS from 'uglify-es';
import Console from '../lib/utils/console';
import countTime from '../lib/utils/count-time';
import importAddonFolderToAMD from '../lib/transpilers/import-addon-folder-to-amd';
import findProjectRoot from '../lib/utils/find-project-root';
import { formatTimePassed, formatSize } from '../lib/utils/asset-reporter';

function build(environment, options={ excludeEmberData: false }) {
  const FILENAME = getFileName(environment, options);

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), `${FILENAME}...`);

    const timer = countTime();
    const PROJECT_PATH = findProjectRoot();
    const OUTPUT_PATH = `${PROJECT_PATH}/vendor/${FILENAME}.js`;

    return Promise.all(readBuildFiles(PROJECT_PATH, environment, options))
      .then((fileContents) => writeVendorJS(OUTPUT_PATH, fileContents.join('\n'), environment))
      .then(() => {
        const timePassed = timer.stop();

        fs.readFile(OUTPUT_PATH).then((fileBuffer) => {
          Console.log(`${chalk.green('BUILT:')} ${FILENAME}.js in ${formatTimePassed(timePassed)} [${formatSize(fileBuffer.length)}] Environment: ${environment}`);

          resolve({
            message: `BUILT: ${FILENAME}.js in ${timePassed}ms [${formatSize(fileBuffer.length)}] Environment: ${environment}`,
            fileBuffer: fileBuffer
          });
        })
      })
      .catch((error) => Console.error(`buildEmberBase error: ${error}`))
  });
}

function getFileName(environment, options) {
  if (options.excludeEmberData) {
    return environment === 'production' ? 'no-ember-data-ember-prod' : 'no-ember-data-ember-debug';
  }

  return environment === 'production' ? 'full-ember-prod' : 'full-ember-debug';
}

function readBuildFiles(projectPath, environment, options={ excludeEmberData: false }){
  const MODULE_PATH = `${projectPath}/node_modules`;

  let baseBuilds = [
    fs.readFile(`${MODULE_PATH}/loader.js/dist/loader/loader.js`),
    importAddonFolderToAMD('@glimmer/resolver', '@glimmer/resolver/dist/commonjs/es2017'),
    fs.readFile(`${MODULE_PATH}/@glimmer/di/dist/amd/es5/glimmer-di.js`),
    injectEmberJS(MODULE_PATH, environment),
    new Promise((resolve) => resolve(`
      define('@ember/ordered-set/index', ['exports'], function (exports) {
        exports.default = Ember.__OrderedSet__ || Ember.OrderedSet;
      });
    `)), // NOTE: investigate this after 3.5 gte
    importAddonFolderToAMD('ember-inflector', 'ember-inflector/addon'),
  ];

  if (!options.excludeEmberData) {
    baseBuilds = baseBuilds.concat(buildEmberData(projectPath, environment));
  }

  return baseBuilds.concat([
    importAddonFolderToAMD('ember-load-initializers', 'ember-load-initializers/addon'),
    importAddonFolderToAMD('ember-resolver', 'ember-resolver/addon'),
    importAddonFolderToAMD('ember-resolver', 'ember-resolver/mu-trees/addon')
  ]);
}

function injectEmberJS(modulePath, environment) {
  const emberDist = `${modulePath}/ember-source/dist`;
  const targetEmberBuild = environment === 'production' ? `${emberDist}/ember.prod.js` :
    `${emberDist}/ember.debug.js`; // TODO: should this move to ember-min?

  return fs.readFile(targetEmberBuild);
}

function buildEmberData(projectPath, environment) {
  const emberDataVersion = require(`${projectPath}/package.json`).devDependencies['ember-data']; // NOTE: normally stripping -private but ember-data build sourcecode is a disaster

  process.env.EMBER_ENV = environment === 'production' ? 'production' : undefined; // NOTE: hack for hacky ember-data builds

  return [
    importAddonFolderToAMD('ember-data', 'ember-data/addon'),
    new Promise((resolve) => resolve(`
      define('ember-data/version', ['exports'], function (exports) {
        exports.default = '${emberDataVersion}';
      });
    `))
  ];
}

function writeVendorJS(path, content, environment) {
  if (environment === 'production') {
    const minified = UglifyJS.minify(content, {
      compress: {
        'negate_iife': false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code;

    return fs.writeFile(path, minified);
  }

  return fs.writeFile(path, content.replace(
    'this._najaxRequest(options);',
    'window.MemServer ? this._ajaxRequest(options) : this._najaxRequest(options);'
  ));
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

['development', 'production'].forEach((environment) => build(environment, ARGUMENTS));
