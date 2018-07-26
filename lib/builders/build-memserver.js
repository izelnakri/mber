import fs from 'fs-extra';
import chalk from 'chalk';
import UglifyJS from 'uglify-es';
import convertESModuletoAMD from '../transpilers/convert-es-module-to-amd';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import lookup from '../utils/recursive-file-lookup';
import { formatTimePassed, formatSize } from '../utils/asset-reporter';

const VENDOR_PATH = `${__dirname}/../../vendor`;

export default function(ENV={ environment: 'development' }) {
  const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
  const environment = ENV.environment || 'development';
  const PROJECT_ROOT = findProjectRoot();
  const OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/memserver.js`;

  return new Promise((resolve, reject) => {
    Console.log(chalk.yellow('BUILDING:'), 'memserver.js...');

    const timer = countTime();

    Promise.all([
      fs.readFile(`${VENDOR_PATH}/memserver.js`),
      fs.readFile(`${__dirname}/../addons/memserver/instance-initializers/memserver.js`),
      lookup(`${PROJECT_ROOT}/memserver`, ['js'])
    ]).then(([baseMemServerCode, memServerInitializerCode, userMemServerFiles]) => {
      const operations = [
        baseMemServerCode,
        convertESModuletoAMD(memServerInitializerCode, {
          moduleName: `${APPLICATION_NAME}/instance-initializers/memserver`
        })
      ].concat(userMemServerFiles.map((file) => transpileFile(file, APPLICATION_NAME, reject)));

      return Promise.all(operations);
    }).then((contents) => {
      return writeMemServerFile(OUTPUT_PATH, contents.join('\n'), {
        minify: ENV.memserver && ENV.memserver.minify
       });
    }).then(() => {
      const timePassed = timer.stop();

      fs.stat(OUTPUT_PATH).then((stats) => {
        Console.log(`${chalk.green('BUILT:')} memserver.js in ${formatTimePassed(timePassed)} [${formatSize(stats.size)}] Environment: ${environment}`);

        resolve({
          message: `BUILT: memserver.js in ${timePassed}ms [${formatSize(stats.size)}] Environment: ${environment}`,
          stats: stats
        });
      });
    }).catch((error) => {
      console.log('BUILD MEMSERVER ERROR:', error)
      reject(error);
    });
  });
}

function transpileFile(fileName, appName, rejectPromise) {
  return new Promise((resolve) => {
    return fs.readFile(fileName).then((fileContents) => {
      if (fileName.endsWith('.js')) {
        return resolve(convertESModuletoAMD(fileContents, {
          moduleName: getModuleName(fileName, appName)
        }));
      }
    }).catch((error) => {
      console.log(chalk.red('Memserver build | read error:'), error)
      rejectPromise(error);
    });
  })
}

function getModuleName(fileName, appName) {
  const moduleName = fileName.split('memserver/')[1];

  return `${appName}/memserver/${moduleName.slice(0, moduleName.lastIndexOf('.'))}`;
}

function writeMemServerFile(OUTPUT_PATH, content, options={ minify: false }) {
  if (options.minify) {
    return fs.writeFile(OUTPUT_PATH, UglifyJS.minify(content, {
      compress: {
        negate_iife: false,
        sequences: 20
      },
      output: {
        semicolons: false
      }
    }).code);
  }

  return fs.writeFile(OUTPUT_PATH, content);
}
