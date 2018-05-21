// TODO: config/environment from document.querySelector json parse etc
import fs from 'fs';
import { promisify } from 'util';
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
    const ENV = require(`${PROJECT_ROOT}/config/environment.js`)(environment);
    const APPLICATION_NAME = ENV.modulePrefix || 'frontend';

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
            exports.default = { modulePrefix: 'izelnakrii' };
          });
        `)), // TODO: take this from environment.js
      ]);
    }).then((contents) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/application.js`, contents.join('\n') + `
        var runningTests = false; // TODO: move this up
        if (!runningTests) {
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
    })
  });
}

function transpileHandlebars(code) {

}
