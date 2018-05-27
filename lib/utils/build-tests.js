import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import Console from './console';
import convertESModuletoAMD from './convert-es-module-to-amd';
import countTime from './count-time';
import findProjectRoot from './find-project-root';
import lookup from './recursive-file-lookup';
import { formatTimePassed, formatSize } from './asset-reporter';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile)
const statAsync = promisify(fs.stat)

export default function(environment='development') {
  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'tests.js...');

    const timer = countTime();
    const PROJECT_ROOT = findProjectRoot();
    const ENV = require(`${PROJECT_ROOT}/config/environment.js`)(environment); // TODO: take this out for optimization
    const APPLICATION_NAME = ENV.modulePrefix || 'frontend';

    lookup(`${PROJECT_ROOT}/tests`, ['js']).then((files) => {
      return Promise.all(files.map((file) => transpileFile(file, APPLICATION_NAME))); // TODO: this could be build via ipc for performance
    }).then((contents) => {
      return writeFileAsync(`${PROJECT_ROOT}/tmp/tests.js`, 'define = window.define;' + contents.join('\n')); // TODO: probably change this
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(`${PROJECT_ROOT}/tmp/tests.js`).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} tests.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: tests.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    }).catch((error) => console.log('error:', error));
  });
}

function transpileFile(fileName, appName) {
  return new Promise((resolve) => {
    return readFileAsync(fileName).then((fileContents) => {
      if (fileName.endsWith('.js')) {
        resolve(convertESModuletoAMD(fileContents, { moduleName: getModuleName(fileName, appName) }));
      }

      resolve('');
    })
  }).catch((error) => console.log(chalk.red('ERROR:'), error));
}

function getModuleName(fileName, appName) {
  const moduleName = fileName.split('src/')[1];

  return `${appName}/src/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}
