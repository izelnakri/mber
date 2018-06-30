import fs from 'fs';
import { promisify } from 'util';
import chalk from 'chalk';
import UglifyJS from 'uglify-es';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat)

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(ENV={ environment: 'development' }) {
  const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
  const environment = ENV.environment || 'development';
  const PROJECT_ROOT = findProjectRoot();
  const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/memserver.js`;

  return new Promise((resolve) => {
    Console.log(chalk.yellow('BUILDING:'), 'memserver.js...');

    const timer = countTime();

    Promise.all([
      readFileAsync(`${VENDOR_PATH}/memserver.js`),
      readFileAsync(`${__dirname}/../addons/memserver/initializers/memserver.js`),
      lookup(`${PROJECT_ROOT}/memserver`, ['js'])
    ]).then(([baseMemServerCode, memServerInitializerCode, userMemServerFiles]) => {
      const operations = [
        baseMemServerCode,
        convertESModuletoAMD(memServerInitializerCode, {
          moduleName: `${APPLICATION_NAME}/initializers/memserver`
        })
      ].concat(userMemServerFiles.map((file) => transpileFile(file, APPLICATION_NAME)));

      return Promise.all(operations);
    }).then((contents) => {
      return writeMemServerFile(OUTPUT_PATH, contents.join('\n'), {
        minify: ENV.memserver && ENV.memserver.minify
       });
    }).then(() => {
      const timePassed = timer.stop();

      statAsync(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} memserver.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: memserver.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
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
        return resolve(convertESModuletoAMD(fileContents, {
          moduleName: getModuleName(fileName, appName)
        }));
      }
    }).catch((error) => console.log(chalk.red('Memserver build | read error:'), error));
  })
}

function getModuleName(fileName, appName) {
  const moduleName = fileName.split('memserver/')[1];

  return `${appName}/memserver/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

function writeMemServerFile(OUTPUT_PATH, content, options={ minify: false }) {
  if (options.minify) {
    return writeFileAsync(OUTPUT_PATH, UglifyJS.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
  }

  return writeFileAsync(OUTPUT_PATH, content);
}
