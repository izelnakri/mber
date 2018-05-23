// TODO: config/environment from document.querySelector json parse etc
import fs from 'fs';
import { promisify, inspect } from 'util';
import chalk from 'chalk';
import Console from './console';
import findProjectRoot from './find-project-root';
import convertESModuletoAMD from './convert-es-module-to-amd';
import countTime from './count-time';
import { formatTimePassed, formatSize } from './asset-reporter';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat)

export default function(environment='development') {
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'application.js...');

    const timer = countTime();
    const PROJECT_ROOT = findProjectRoot();
    const ENV = require(`${PROJECT_ROOT}/config/environment.js`)(environment); // TODO: take this out for optimization
    const APPLICATION_NAME = ENV.modulePrefix || 'frontend';

    // get all the js in the src and convert to es module
    return Promise.all([
      readFileAsync(`${PROJECT_ROOT}/src/main.js`), // NOTE: maybe make main.js bundled
      readFileAsync(`${PROJECT_ROOT}/src/resolver.js`),
      readFileAsync(`${PROJECT_ROOT}/src/router.js`)
    ]).then(([mainJS, resolverJS, routerJS]) => {
      return Promise.all([
        convertESModuletoAMD(mainJS, { moduleName: `${APPLICATION_NAME}/src/main` }),
        convertESModuletoAMD(resolverJS, { moduleName: `${APPLICATION_NAME}/src/resolver` }),
        convertESModuletoAMD(routerJS, { moduleName: `${APPLICATION_NAME}/src/router` }),
        // TODO: add applicationFiles
        new Promise((resolve) => resolve(` //
          define('${APPLICATION_NAME}/config/environment', ['exports'], function (exports) {
            exports.default = ${inspect(ENV, { depth: null })};
          });
        `)), // TODO: lazy load this from meta
      ]);
    }).then((contents) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/application.js`, 'define = window.define;' + contents.join('\n') + `
        if (!window.runningTests) {
          (function() {
            ['${APPLICATION_NAME}/src/main'].forEach((mod) => {
              window.APP = window.require(mod)["default"].create({"name":"${APPLICATION_NAME}", "version":"0.0.0+c1167b89"})
            });
          })();
        }
      `);
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(`${PROJECT_ROOT}/tmp/application.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} application.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: application.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    }).catch((error) => console.log('error:', error));
  });
}

function transpileHandlebars(code) {

}
