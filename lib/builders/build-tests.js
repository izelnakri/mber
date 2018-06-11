import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile)
const statAsync = promisify(fs.stat)

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development') { // TODO: needs applicationName
  const ENV = require(`${PROJECT_ROOT}/config/environment.js`)(environment); // TODO: take this out for optimization
  const APPLICATION_NAME = ENV.modulePrefix || 'frontend';

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'tests.js...');

    const timer = countTime();

    lookup(`${PROJECT_ROOT}/tests`, ['js']).then((files) => {
      return Promise.all(files.map((file) => transpileFile(file, APPLICATION_NAME, PROJECT_ROOT))); // TODO: this could be build via ipc for performance
    }).then((contents) => {
      return writeFileAsync(
        `${PROJECT_ROOT}/tmp/assets/tests.js`, 'define = window.define;' + contents.join('\n') + `
          ['${APPLICATION_NAME}/tests/test-helper'].forEach((mod) => window.require(mod));
          EmberENV.TESTS_FILE_LOADED = true;
        `
      );
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(`${PROJECT_ROOT}/tmp/assets/tests.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} tests.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: tests.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    }).catch((error) => Console.error('Test build error:', error));
  });
}

function transpileFile(fileName, appName, projectRoot) {
  return new Promise((resolve) => {
    return readFileAsync(fileName).then((fileContents) => {
      if (fileName.endsWith('.js')) {
        resolve(convertESModuletoAMD(fileContents, {
          moduleName: getModuleName(fileName, appName, projectRoot)
        }));
      }

      resolve('');
    })
  }).catch((error) => console.log(chalk.red('ERROR:'), error));
}

function getModuleName(fileName, appName, projectRoot) {
  const moduleName = fileName.split(projectRoot + '/')[1];

  return `${appName}/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}
