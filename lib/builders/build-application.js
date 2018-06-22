import fs from 'fs';
import { promisify, inspect } from 'util';
import chalk from 'chalk';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

global.mainContext = global;

const convertHBSToAMD = require('../transpilers/convert-hbs-to-amd').default;
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat)

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', ENV={}, options={
  applicationPrepends: '', applicationAppends: ''
}) {
  const APPLICATION_NAME = ENV.modulePrefix || 'frontend';

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.js...');

    const timer = countTime();

    lookup(`${PROJECT_ROOT}/src`, ['js', 'hbs']).then((files) => {
      return Promise.all(files.map((file) => transpileFile(file, APPLICATION_NAME))); // TODO: this could be build via ipc for performance
    }).then((contents) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/assets/application.js`, `
        ${options.applicationPrepends || ''}
        define = window.define;
        ${contents.join('\n')}
        define('${APPLICATION_NAME}/config/environment', ['exports'], function (exports) {
          'use strict';

          exports.__esModule = true;
          exports.default = ${inspect(ENV, { depth: null })};

          if (typeof FastBoot !== 'undefined') {
            return FastBoot.config("${APPLICATION_NAME}");
          }
        });

        if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['${APPLICATION_NAME}/src/main', '${APPLICATION_NAME}/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('${APPLICATION_NAME}/src/main')['default'].create(require('${APPLICATION_NAME}/config/environment').default.APP);
        }

        ${options.applicationAppends || ''}
      `);
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(`${PROJECT_ROOT}/tmp/assets/application.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} application.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: application.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    });
  });
}

function transpileFile(fileName, appName) {
  return new Promise((resolve) => {
    return readFileAsync(fileName).then((fileContents) => {
      if (fileName.endsWith('.js')) {
        return resolve(convertESModuletoAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
      } else if (fileName.endsWith('.hbs')) {
        return resolve(convertHBSToAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
      }

      resolve('');
    }).catch((error) => console.log(chalk.red('Application build | read error:'), error));
  })
}

function getModuleName(fileName, appName) {
  const moduleName = fileName.split('src/')[1];

  return `${appName}/src/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}
